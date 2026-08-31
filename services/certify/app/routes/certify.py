"""Certify Service — API routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from services.certify.app.engine.certificate_pdf import render_certificate_pdf
from services.certify.app.engine.compliance import AuditTrail, ComplianceEngine
from services.certify.app.engine.ip_verifier import IPVerifier
from services.certify.app.engine.pitch_deck import PitchDeckCertificationEngine
from services.certify.app.models.designation import Designation
from services.certify.app.store import (
    designation_to_dict,
    get_designation_by_certificate_id,
    list_designations,
    upsert_designation,
)
from services.shared.auth_middleware import get_current_user
from services.shared.exceptions import BadRequestError, NotFoundError
from services.shared.pitch_rubric import RUBRIC_DIMENSIONS
from services.shared.user_models import User

router = APIRouter(prefix="/certify", tags=["certification"])

compliance_engine = ComplianceEngine()
ip_verifier = IPVerifier()
pitch_engine = PitchDeckCertificationEngine()


def _session(request: Request) -> AsyncSession:
    return request.state.db_session


def _build_designation(body: dict[str, Any]) -> dict[str, Any]:
    """Run pitch grading + compliance + IP originality into a designation."""
    submission_id = str(body.get("submission_id", ""))
    project_name = str(body.get("project_name", ""))
    criteria = body.get("criteria") or {}
    jurisdictions = body.get("jurisdictions", [])
    profile = body.get("profile", {})
    texts = body.get("texts", {})
    corpus = body.get("corpus", [])

    unknown = set(criteria) - set(RUBRIC_DIMENSIONS)
    if unknown:
        raise BadRequestError(detail=f"Unknown rubric dimensions: {sorted(unknown)}")

    compliance_results = [compliance_engine.run_certification(j, profile) for j in jurisdictions]
    originality = ip_verifier.batch_check(texts, corpus)

    return pitch_engine.designate(
        submission_id=submission_id,
        criteria=criteria,
        project_name=project_name,
        compliance=compliance_results,
        originality=originality,
    )


async def _persist_designation(request: Request, designation: dict[str, Any]) -> Designation:
    """Persist a designation (one record per submission, latest wins)."""
    session = _session(request)
    return await upsert_designation(
        session,
        {
            "certificate_id": designation["certificate_id"],
            "submission_id": designation["submission_id"],
            "project_name": designation["project_name"],
            "grade": designation["grade"],
            "score": designation["score"],
            "designation": designation["designation"],
            "rubric": designation["rubric"],
            "compliance": designation["compliance"],
            "originality": designation["originality"],
            "issuer": designation["issuer"],
            "validity_days": designation["validity_days"],
            "issued_at": designation["issued_at"],
        },
    )


@router.post("/check", status_code=200)
async def run_certification(
    request: Request,
    body: dict[str, Any],
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Run compliance certification against selected jurisdictions."""
    jurisdictions = body.get("jurisdictions", [])
    profile = body.get("profile", {})

    results = []
    for jurisdiction in jurisdictions:
        result = compliance_engine.run_certification(jurisdiction, profile)
        results.append(result)

    audit = AuditTrail()
    audit.add_entry(
        event_type="certification_run",
        actor_id=str(current_user.id),
        data={"jurisdictions": jurisdictions, "results_count": len(results)},
    )

    return {
        "data": {
            "results": results,
            "total_jurisdictions": len(results),
            "audit_entry_id": audit.get_entries()[-1]["id"],
        }
    }


@router.post("/ip-check", status_code=200)
async def check_ip_originality(
    request: Request,
    body: dict[str, Any],
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Check intellectual property originality for text content."""
    texts = body.get("texts", {})
    corpus = body.get("corpus", [])

    report = ip_verifier.batch_check(texts, corpus)

    return {"data": report}


@router.post("/designate", status_code=200)
async def designate_startup(
    request: Request,
    body: dict[str, Any],
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Issue and persist a Startup Designation Certificate (one per submission)."""
    designation = _build_designation(body)
    record = await _persist_designation(request, designation)

    audit = AuditTrail()
    audit.add_entry(
        event_type="designation_issued",
        actor_id=str(current_user.id),
        data={
            "certificate_id": designation["certificate_id"],
            "grade": designation["grade"],
            "score": designation["score"],
            "designation": designation["designation"],
        },
    )

    return {
        "data": {
            **designation_to_dict(record),
            "audit_entry_id": audit.get_entries()[-1]["id"],
        }
    }


@router.post("/designate/pdf", status_code=200)
async def designate_startup_pdf(
    request: Request,
    body: dict[str, Any],
    current_user: User = Depends(get_current_user),
) -> Response:
    """Return the designation as a unique PDF certificate."""
    designation = _build_designation(body)
    await _persist_designation(request, designation)
    pdf_bytes = render_certificate_pdf(designation)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (f'inline; filename="{designation["certificate_id"]}.pdf"')
        },
    )


@router.get("/designations", status_code=200)
async def get_designations(
    request: Request,
    submission_id: str | None = None,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """List persisted designations (optionally filtered by submission)."""
    session = _session(request)
    records = await list_designations(session, submission_id=submission_id)
    return {"data": [designation_to_dict(r) for r in records]}


@router.get("/designations/{certificate_id}", status_code=200)
async def get_designation(
    request: Request,
    certificate_id: str,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Fetch a persisted designation by its certificate id."""
    session = _session(request)
    record = await get_designation_by_certificate_id(session, certificate_id)
    if record is None:
        raise NotFoundError(resource="Designation", resource_id=certificate_id)
    return {"data": designation_to_dict(record)}


@router.get("/designations/{certificate_id}/pdf", status_code=200)
async def get_designation_pdf(
    request: Request,
    certificate_id: str,
    current_user: User = Depends(get_current_user),
) -> Response:
    """Re-render a persisted designation as a PDF certificate."""
    session = _session(request)
    record = await get_designation_by_certificate_id(session, certificate_id)
    if record is None:
        raise NotFoundError(resource="Designation", resource_id=certificate_id)
    pdf_bytes = render_certificate_pdf(designation_to_dict(record))

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{certificate_id}.pdf"'},
    )
