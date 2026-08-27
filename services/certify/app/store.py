"""Certify Service — designation persistence helpers."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.certify.app.models.designation import Designation


def designation_to_dict(record: Designation) -> dict[str, Any]:
    """Serialize a designation record for API responses / PDF rendering."""
    return {
        "certificate_id": record.certificate_id,
        "submission_id": record.submission_id,
        "project_name": record.project_name,
        "grade": record.grade,
        "score": record.score,
        "designation": record.designation,
        "rubric": record.rubric,
        "compliance": record.compliance,
        "originality": record.originality,
        "issuer": record.issuer,
        "validity_days": record.validity_days,
        "audit_hash": record.audit_hash,
        "issued_at": record.issued_at.isoformat() if record.issued_at else None,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }


async def upsert_designation(session: AsyncSession, data: dict[str, Any]) -> Designation:
    """Insert or update the designation for a submission (one certificate per idea)."""
    submission_id = str(data.get("submission_id", ""))
    existing = (
        await session.execute(select(Designation).where(Designation.submission_id == submission_id))
    ).scalar_one_or_none()

    record = existing if existing is not None else Designation(submission_id=submission_id)
    if existing is None:
        session.add(record)

    for field, value in data.items():
        if field == "issued_at" and isinstance(value, str):
            value = datetime.fromisoformat(value)
        setattr(record, field, value)

    await session.flush()
    await session.refresh(record)
    return record


async def get_designation_by_certificate_id(
    session: AsyncSession, certificate_id: str
) -> Designation | None:
    """Fetch a designation by its unique certificate id."""
    result = await session.execute(
        select(Designation).where(Designation.certificate_id == certificate_id)
    )
    return result.scalar_one_or_none()


async def list_designations(
    session: AsyncSession,
    submission_id: str | None = None,
    limit: int = 50,
) -> list[Designation]:
    """List designations, newest first, optionally filtered by submission."""
    query = select(Designation).order_by(Designation.created_at.desc())
    if submission_id:
        query = query.where(Designation.submission_id == submission_id)
    query = query.limit(limit)
    result = await session.execute(query)
    return list(result.scalars().all())
