"""Certify Service — API routes."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from services.auth.app.middleware.auth_middleware import get_current_user
from services.auth.app.models.user import User
from services.certify.app.engine.compliance import ComplianceEngine, AuditTrail
from services.certify.app.engine.ip_verifier import IPVerifier

router = APIRouter(prefix="/certify", tags=["certification"])

compliance_engine = ComplianceEngine()
ip_verifier = IPVerifier()


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

    return {
        "data": report
    }
