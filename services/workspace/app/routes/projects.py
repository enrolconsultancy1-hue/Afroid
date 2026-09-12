"""Workspace project routes: sync intake ideas into project folders (per-user scoped).

Every project synced from the Architect Intake lands under a dedicated
``NEW_PROJECT_SYNCED/`` directory inside the authenticated user's isolated
workspace. Each synced project carries a compiled record — founder user id,
founder email, project name, and the Architect Blueprint preview — written
as both a machine-readable ``project_manifest.json`` and a human-readable
``BLUEPRINT.md``. The create response returns the running count of synced
projects so the IDE can surface an incrementing badge.
"""

from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from services.shared.auth_middleware import get_current_user
from services.shared.user_models import User
from services.workspace.app.config import user_workspace

router = APIRouter(tags=["projects"])

# Dedicated parent directory that holds every synced intake project.
SYNCED_ROOT = "NEW_PROJECT_SYNCED"


class CreateProjectRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Project name from the intake idea")
    idea_id: str | None = Field(default=None, max_length=64, description="Source intake idea id")
    founder_id: str | None = Field(default=None, max_length=64, description="Applicant user id (if authenticated)")
    founder_email: str | None = Field(default=None, max_length=255, description="Applicant email")
    one_liner: str | None = Field(default=None, max_length=2000, description="Idea one-liner")
    problem: str | None = Field(default=None, max_length=20000, description="Business problem")
    blueprint: dict | None = Field(default=None, description="Architect Blueprint preview")


def _slugify(name: str) -> str:
    """Turn a project name into a safe folder slug (e.g. 'Ethio Yield' -> 'ethio-yield')."""
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", name.strip()).strip("-").lower()
    return slug or "untitled-project"


def _synced_root(user_id: str) -> Path:
    """Return (and create) the per-user NEW_PROJECT_SYNCED directory."""
    root = user_workspace(user_id) / SYNCED_ROOT
    root.mkdir(parents=True, exist_ok=True)
    return root


def _synced_count(root: Path) -> int:
    """Count the synced project folders currently under NEW_PROJECT_SYNCED."""
    return sum(1 for entry in root.iterdir() if entry.is_dir() and not entry.name.startswith("."))


def _render_blueprint_markdown(manifest: dict[str, Any]) -> str:
    """Render a readable BLUEPRINT.md from the compiled manifest + blueprint preview."""
    bp = manifest.get("blueprint") or {}
    lines: list[str] = [
        f"# {manifest.get('project_name', 'Untitled Project')} — Architect Blueprint Preview",
        "",
        f"- **Project name:** {manifest.get('project_name', '')}",
        f"- **Applicant email:** {manifest.get('founder_email') or 'n/a'}",
        f"- **Applicant user id:** {manifest.get('founder_id') or 'anonymous'}",
        f"- **Intake idea id:** {manifest.get('idea_id') or 'n/a'}",
        f"- **Synced by (builder):** {manifest.get('synced_by', '')}",
        f"- **Synced at:** {manifest.get('synced_at', '')}",
        "",
    ]
    if manifest.get("one_liner"):
        lines += ["## One-liner", "", str(manifest["one_liner"]), ""]
    if manifest.get("problem"):
        lines += ["## Problem", "", str(manifest["problem"]), ""]
    if bp:
        if bp.get("summary"):
            lines += ["## Summary", "", str(bp["summary"]), ""]
        if bp.get("tech_stack"):
            lines += ["## Tech Stack", "", "```json", json.dumps(bp["tech_stack"], indent=2), "```", ""]
        if bp.get("system_architecture"):
            lines += ["## System Architecture", "", "```", str(bp["system_architecture"]), "```", ""]
        if bp.get("milestones"):
            lines += ["## Milestones", ""]
            for ms in bp["milestones"]:
                if isinstance(ms, dict):
                    lines.append(f"- **{ms.get('id', '')} {ms.get('name', '')}** — {ms.get('objective', '')}")
            lines.append("")
    else:
        lines += ["_No Architect Blueprint preview was attached at sync time._", ""]
    return "\n".join(lines)


@router.post("/projects", status_code=201)
async def create_project(
    body: CreateProjectRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Sync an intake idea into a project folder under NEW_PROJECT_SYNCED/ (per-user).

    Writes a compiled ``project_manifest.json`` (founder id + email + project
    name + Architect Blueprint preview) and a readable ``BLUEPRINT.md`` into the
    folder, and returns the running synced-project count.
    """
    root = _synced_root(str(current_user.id))
    slug = _slugify(body.name)
    project_dir = root / slug
    if project_dir.exists():
        raise HTTPException(status_code=409, detail=f"Project '{slug}' already synced.")
    project_dir.mkdir(parents=True)

    manifest: dict[str, Any] = {
        "project_name": body.name,
        "slug": slug,
        "idea_id": body.idea_id,
        "founder_id": body.founder_id,
        "founder_email": body.founder_email,
        "synced_by": str(current_user.id),
        "synced_at": datetime.now(UTC).isoformat(),
        "one_liner": body.one_liner,
        "problem": body.problem,
        "blueprint": body.blueprint or {},
    }

    (project_dir / "project_manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (project_dir / "BLUEPRINT.md").write_text(
        _render_blueprint_markdown(manifest), encoding="utf-8"
    )
    (project_dir / "README.md").write_text(
        f"# {body.name}\n\nSynced from the Architect Intake (idea {body.idea_id or 'n/a'}).\n"
        f"See BLUEPRINT.md for the Architect Blueprint preview and "
        f"project_manifest.json for the compiled applicant record.\n",
        encoding="utf-8",
    )

    count = _synced_count(root)
    return {
        "name": body.name,
        "slug": slug,
        "path": f"/{SYNCED_ROOT}/{slug}",
        "idea_id": body.idea_id,
        "synced_count": count,
        "manifest": manifest,
    }


@router.get("/projects")
async def list_projects(
    current_user: User = Depends(get_current_user),
) -> dict:
    """List the user's synced projects (under NEW_PROJECT_SYNCED) with a total count."""
    root = _synced_root(str(current_user.id))
    projects = []
    for entry in sorted(root.iterdir()):
        if not entry.is_dir() or entry.name.startswith("."):
            continue
        summary: dict[str, Any] = {"name": entry.name, "path": f"/{SYNCED_ROOT}/{entry.name}"}
        manifest_file = entry / "project_manifest.json"
        if manifest_file.is_file():
            try:
                m = json.loads(manifest_file.read_text(encoding="utf-8"))
                summary["project_name"] = m.get("project_name")
                summary["founder_email"] = m.get("founder_email")
                summary["founder_id"] = m.get("founder_id")
                summary["idea_id"] = m.get("idea_id")
                summary["synced_at"] = m.get("synced_at")
                summary["has_blueprint"] = bool(m.get("blueprint"))
            except (ValueError, OSError):
                pass
        projects.append(summary)
    return {"projects": projects, "count": len(projects)}
