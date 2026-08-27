"""Intake Service — pitch-deck evaluator tests (phase 2)."""

from __future__ import annotations

import uuid

from httpx import AsyncClient
from jose import jwt

from services.intake.app.config import settings

EVALUATOR = "22222222-2222-2222-2222-222222222222"
FOUNDER = "33333333-3333-3333-3333-333333333333"


def _token(user_id: str) -> str:
    return jwt.encode({"sub": user_id}, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _auth(user_id: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {_token(user_id)}"}


def _evaluator(**overrides: object) -> dict:
    base = {
        "display_name": "Chamber Reviewer",
        "org_name": "Addis Ababa Chamber of Commerce",
        "org_type": "chamber",
        "credential_ref": "appointment-letter-123",
    }
    base.update(overrides)
    return base


async def _register_and_approve(client: AsyncClient, uid: str) -> None:
    h = _auth(uid)
    r = await client.post("/v1/intake/evaluators", headers=h, json=_evaluator())
    assert r.status_code == 201
    evaluator_id = r.json()["id"]
    ap = await client.post(f"/v1/intake/evaluators/{evaluator_id}/approve", headers=h)
    assert ap.status_code == 200


class TestEvaluatorProfile:
    async def test_register_and_approve(self, client: AsyncClient) -> None:
        h = _auth(EVALUATOR)
        r = await client.post("/v1/intake/evaluators", headers=h, json=_evaluator())
        assert r.status_code == 201
        assert r.json()["status"] == "pending"

        me = await client.get("/v1/intake/evaluators/me", headers=h)
        assert me.status_code == 200
        assert me.json()["org_type"] == "chamber"

        ap = await client.post(f"/v1/intake/evaluators/{r.json()['id']}/approve", headers=h)
        assert ap.status_code == 200
        assert ap.json()["status"] == "approved"

    async def test_register_invalid_org_type(self, client: AsyncClient) -> None:
        r = await client.post(
            "/v1/intake/evaluators", headers=_auth(EVALUATOR), json=_evaluator(org_type="hacker")
        )
        assert r.status_code == 400

    async def test_register_duplicate_conflicts(self, client: AsyncClient) -> None:
        h = _auth(EVALUATOR)
        assert (
            await client.post("/v1/intake/evaluators", headers=h, json=_evaluator())
        ).status_code == 201
        r = await client.post("/v1/intake/evaluators", headers=h, json=_evaluator())
        assert r.status_code == 409

    async def test_register_requires_auth(self, client: AsyncClient) -> None:
        r = await client.post("/v1/intake/evaluators", json=_evaluator())
        assert r.status_code == 401


class TestPitchEvaluation:
    async def test_submit_and_aggregate_score(self, client: AsyncClient) -> None:
        idea = (
            await client.post(
                "/v1/intake/ideas", json={"project_name": "Pitchable"}, headers=_auth(FOUNDER)
            )
        ).json()
        sid = idea["id"]

        await _register_and_approve(client, EVALUATOR)
        await _register_and_approve(client, str(uuid.uuid4()))

        h1 = _auth(EVALUATOR)
        r1 = await client.post(
            "/v1/intake/evaluations",
            headers=h1,
            json={"submission_id": sid, "score": 85.5, "criteria": {"team": 9, "market": 8}},
        )
        assert r1.status_code == 201

        # Register a second evaluator and score (via a fresh uid handled in helper flow)
        uid2 = str(uuid.uuid4())
        await _register_and_approve(client, uid2)
        r2 = await client.post(
            "/v1/intake/evaluations",
            headers=_auth(uid2),
            json={"submission_id": sid, "score": 84.5},
        )
        assert r2.status_code == 201

        score = await client.get(f"/v1/intake/evaluations/score/{sid}")
        assert score.status_code == 200
        body = score.json()
        assert body["score_count"] == 2
        assert body["average_score"] == 85.0

    async def test_self_evaluation_forbidden(self, client: AsyncClient) -> None:
        idea = (
            await client.post(
                "/v1/intake/ideas", json={"project_name": "Mine"}, headers=_auth(FOUNDER)
            )
        ).json()
        await _register_and_approve(client, FOUNDER)
        r = await client.post(
            "/v1/intake/evaluations",
            headers=_auth(FOUNDER),
            json={"submission_id": idea["id"], "score": 100},
        )
        assert r.status_code == 403

    async def test_unapproved_evaluator_forbidden(self, client: AsyncClient) -> None:
        idea = (
            await client.post(
                "/v1/intake/ideas", json={"project_name": "Pitch"}, headers=_auth(FOUNDER)
            )
        ).json()
        h = _auth(EVALUATOR)
        await client.post("/v1/intake/evaluators", headers=h, json=_evaluator())
        r = await client.post(
            "/v1/intake/evaluations",
            headers=h,
            json={"submission_id": idea["id"], "score": 70},
        )
        assert r.status_code == 403

    async def test_duplicate_evaluation_conflicts(self, client: AsyncClient) -> None:
        idea = (
            await client.post(
                "/v1/intake/ideas", json={"project_name": "Dup"}, headers=_auth(FOUNDER)
            )
        ).json()
        await _register_and_approve(client, EVALUATOR)
        h = _auth(EVALUATOR)
        payload = {"submission_id": idea["id"], "score": 80}
        assert (
            await client.post("/v1/intake/evaluations", headers=h, json=payload)
        ).status_code == 201
        r = await client.post("/v1/intake/evaluations", headers=h, json=payload)
        assert r.status_code == 409
