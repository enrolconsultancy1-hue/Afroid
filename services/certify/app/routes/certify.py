"""Certify Service — API routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response

from services.auth.app.middleware.auth_middleware import get_current_user
from services.auth.app.models.user import User
from services.certify.app.engine.certificate_pdf import render_certificate_pdf
from services.certify.app.engine.compliance import AuditTrail, ComplianceEngine
from services.certify.app.engine.ip_verifier import IPVerifier
from services.certify.app.engine.pitch_deck import PitchDeckCertificationEngine
from services.shared.exceptions import BadRequestError
from services.shared.pitch_rubric import RUBRIC_DIMENSIONS

router = APIRouter(prefix="/certify", tags=["certification"])

compliance_engine = ComplianceEngine()
ip_verifier = IPVerifier()
pitch_engine = PitchDeckCertificationEngine()


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
    """Issue a Startup Designation Certificate (grade + summary + audit entry)."""
    designation = _build_designation(body)

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

    return {"data": {**designation, "audit_entry_id": audit.get_entries()[-1]["id"]}}


@router.post("/designate/pdf", status_code=200)
async def designate_startup_pdf(
    request: Request,
    body: dict[str, Any],
    current_user: User = Depends(get_current_user),
) -> Response:
    """Return the designation as a unique PDF certificate."""
    designation = _build_designation(body)
    pdf_bytes = render_certificate_pdf(designation)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (f'inline; filename="{designation["certificate_id"]}.pdf"')
        },
    )
