"""Intake Service — idea queue + writer portal tests."""

from __future__ import annotations

import uuid

from httpx import AsyncClient
from jose import jwt

from services.intake.app.config import settings

TEST_USER = "11111111-1111-1111-1111-111111111111"


def _token(user_id: str) -> str:
    return jwt.encode({"sub": user_id}, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _auth(user_id: str = TEST_USER) -> dict[str, str]:
    return {"Authorization": f"Bearer {_token(user_id)}"}


def _idea(**overrides: object) -> dict:
    base = {
        "project_name": "AgroPulse AI",
        "product_summary": "Satellite-driven pest outbreak prediction for smallholder farmers.",
        "business_problem": "Farmers lose crops to pests they can't predict.",
        "target_users": "Smallholder farmers across East Africa.",
        "success_criteria": "10k active farmers and 30% less crop loss.",
        "mvp_definition": "Field registration plus SMS pest alerts.",
        "founder_name": "Test Founder",
        "founder_email": "founder@example.com",
        "core_features": ["satellite imagery", "SMS alerts", "weather fusion"],
        "user_journeys": "1. Farmer registers with a phone number. 2. Farmer opens the app and sees pest risk for their field. 3. Farmer receives an SMS alert before an outbreak.",
        "functional_requirements": "1. Send pest-risk alerts by SMS. 2. Show field maps from satellite data. 3. Let farmers log crop issues.",
        "data_entities": "users, farms, fields, pest alerts, subscriptions",
        "free_text": "Team has agronomy + ML background.",
    }
    base.update(overrides)
    return base


async def _register_writer(client: AsyncClient, user_id: str = TEST_USER) -> None:
    r = await client.post(
        "/v1/intake/writers",
        headers=_auth(user_id),
        json={"display_name": "Test Builder", "email": "builder@example.com"},
    )
    assert r.status_code == 201


class TestIdeaSubmissionQueue:
    async def test_submit_idea_anonymously(self, client: AsyncClient) -> None:
        r = await client.post("/v1/intake/ideas", json=_idea())
        assert r.status_code == 201
        body = r.json()
        assert body["project_name"] == "AgroPulse AI"
        assert body["status"] == "pending"
        assert body["submitted_by"] is None

    async def test_submit_idea_authenticated(self, client: AsyncClient) -> None:
        r = await client.post("/v1/intake/ideas", json=_idea(), headers=_auth())
        assert r.status_code == 201
        assert r.json()["submitted_by"] == TEST_USER

    async def test_fifo_claim_flow(self, client: AsyncClient) -> None:
        await _register_writer(client)
        # Submit A, claim it, submit B, then next pending should be B.
        a = (await client.post("/v1/intake/ideas", json=_idea(project_name="First"))).json()
        nxt = await client.get("/v1/intake/ideas/next", headers=_auth())
        assert nxt.status_code == 200
        assert nxt.json()["id"] == a["id"]

        claim = await client.post(f"/v1/intake/ideas/{a['id']}/claim", headers=_auth())
        assert claim.status_code == 200
        assert claim.json()["status"] == "claimed"
        assert claim.json()["assigned_to"] == TEST_USER

        await client.post("/v1/intake/ideas", json=_idea(project_name="Second"))
        nxt2 = await client.get("/v1/intake/ideas/next", headers=_auth())
        assert nxt2.status_code == 200
        assert nxt2.json()["project_name"] == "Second"

    async def test_status_transition_with_draft_blueprint(self, client: AsyncClient) -> None:
        await _register_writer(client)
        idea = (await client.post("/v1/intake/ideas", json=_idea())).json()
        await client.post(f"/v1/intake/ideas/{idea['id']}/claim", headers=_auth())

        r = await client.patch(
            f"/v1/intake/ideas/{idea['id']}/status",
            headers=_auth(),
            json={"status": "blueprint_ready", "draft_blueprint": {"arch": "modular-monolith"}},
        )
        assert r.status_code == 200
        assert r.json()["status"] == "blueprint_ready"
        assert r.json()["draft_blueprint"] == {"arch": "modular-monolith"}

    async def test_next_requires_auth(self, client: AsyncClient) -> None:
        await client.post("/v1/intake/ideas", json=_idea())
        r = await client.get("/v1/intake/ideas/next")
        assert r.status_code == 401

    async def test_double_claim_rejected(self, client: AsyncClient) -> None:
        await _register_writer(client)
        idea = (await client.post("/v1/intake/ideas", json=_idea())).json()
        await client.post(f"/v1/intake/ideas/{idea['id']}/claim", headers=_auth())
        r = await client.post(f"/v1/intake/ideas/{idea['id']}/claim", headers=_auth(TEST_USER))
        assert r.status_code == 400

    async def test_invalid_status_rejected(self, client: AsyncClient) -> None:
        await _register_writer(client)
        idea = (await client.post("/v1/intake/ideas", json=_idea())).json()
        await client.post(f"/v1/intake/ideas/{idea['id']}/claim", headers=_auth())
        r = await client.patch(
            f"/v1/intake/ideas/{idea['id']}/status",
            headers=_auth(),
            json={"status": "not-a-status"},
        )
        assert r.status_code == 400

    async def test_claim_auto_generates_draft_blueprint(
        self, client: AsyncClient, monkeypatch
    ) -> None:
        await _register_writer(client)

        async def fake_generate(idea) -> dict:
            return {"project_name": idea.project_name, "modules": ["M1", "M2"]}

        monkeypatch.setattr(
            "services.intake.app.routes.ideas._generate_draft_blueprint", fake_generate
        )
        idea = (await client.post("/v1/intake/ideas", json=_idea())).json()
        r = await client.post(f"/v1/intake/ideas/{idea['id']}/claim", headers=_auth())
        assert r.status_code == 200
        assert r.json()["status"] == "claimed"
        assert r.json()["draft_blueprint"] == {
            "project_name": "AgroPulse AI",
            "modules": ["M1", "M2"],
        }

    async def test_claim_requires_registered_builder(self, client: AsyncClient) -> None:
        idea = (await client.post("/v1/intake/ideas", json=_idea())).json()
        r = await client.post(f"/v1/intake/ideas/{idea['id']}/claim", headers=_auth())
        assert r.status_code == 403


class TestWriterProfile:
    async def test_register_and_get_me(self, client: AsyncClient) -> None:
        uid = str(uuid.uuid4())
        h = _auth(uid)
        r = await client.post(
            "/v1/intake/writers",
            headers=h,
            json={
                "display_name": "Ada Lovelace",
                "email": "ada@example.com",
                "title": "Principal Architect",
                "skills": ["python", "system-design"],
            },
        )
        assert r.status_code == 201
        assert r.json()["status"] == "pending"

        me = await client.get("/v1/intake/writers/me", headers=h)
        assert me.status_code == 200
        assert me.json()["display_name"] == "Ada Lovelace"

    async def test_register_duplicate_conflicts(self, client: AsyncClient) -> None:
        uid = str(uuid.uuid4())
        h = _auth(uid)
        payload = {"display_name": "Grace Hopper", "email": "grace@example.com"}
        assert (await client.post("/v1/intake/writers", headers=h, json=payload)).status_code == 201
        r = await client.post("/v1/intake/writers", headers=h, json=payload)
        assert r.status_code == 409

    async def test_register_requires_auth(self, client: AsyncClient) -> None:
        r = await client.post("/v1/intake/writers", json={"display_name": "X", "email": "x@y.z"})
        assert r.status_code == 401
