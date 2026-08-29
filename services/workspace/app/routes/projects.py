"""Workspace project routes: create/list project folders (per-user scoped).

Each project is an empty folder named after an Architect Intake idea, created
inside the user's isolated workspace root.
"""

from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from services.auth.app.middleware.auth_middleware import get_current_user
from services.auth.app.models.user import User
from services.workspace.app.config import user_workspace

router = APIRouter(tags=["projects"])


class CreateProjectRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Project name from the intake idea")
    idea_id: str | None = Field(default=None, max_length=64, description="Source intake idea id")


def _slugify(name: str) -> str:
    """Turn a project name into a safe folder slug (e.g. 'Ethio Yield' -> 'ethio-yield')."""
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", name.strip()).strip("-").lower()
    return slug or "untitled-project"


@router.post("/projects", status_code=201)
async def create_project(
    body: CreateProjectRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Create an empty project folder named after an intake idea (per-user)."""
    root = user_workspace(str(current_user.id))
    slug = _slugify(body.name)
    project_dir = root / slug
    if project_dir.exists():
        raise HTTPException(status_code=409, detail=f"Project '{slug}' already exists.")
    project_dir.mkdir(parents=True)
    (project_dir / "README.md").write_text(
        f"# {body.name}\n\nStarted from the Architect Intake (idea {body.idea_id or 'n/a'}).\n",
        encoding="utf-8",
    )
    return {"name": body.name, "slug": slug, "path": f"/{slug}", "idea_id": body.idea_id}


@router.get("/projects")
async def list_projects(
    current_user: User = Depends(get_current_user),
) -> dict:
    """List the user's project folders."""
    root = user_workspace(str(current_user.id))
    projects = [
        {"name": entry.name, "path": f"/{entry.name}"}
        for entry in sorted(root.iterdir())
        if entry.is_dir() and not entry.name.startswith(".")
    ]
    return {"projects": projects}
