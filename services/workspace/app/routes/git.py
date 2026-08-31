"""Workspace git routes: status + commit (delegates to the git CLI, per-user scoped)."""

from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from services.shared.auth_middleware import get_current_user
from services.shared.user_models import User
from services.workspace.app.config import user_workspace

router = APIRouter(tags=["git"])


def _run_git(args: list[str], cwd: Path) -> tuple[int, str, str]:
    proc = subprocess.run(  # noqa: S603
        ["git", *args],  # noqa: S607
        cwd=str(cwd),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=30,
    )
    return proc.returncode, proc.stdout, proc.stderr


@router.get("/git/status")
async def git_status(current_user: User = Depends(get_current_user)) -> dict[str, Any]:
    cwd = user_workspace(str(current_user.id))
    code, out, _ = _run_git(["rev-parse", "--abbrev-ref", "HEAD"], cwd)
    branch = out.strip() if code == 0 else "unknown"
    code2, out2, _ = _run_git(["status", "--porcelain"], cwd)
    changed: list[str] = []
    if code2 == 0:
        for line in out2.splitlines():
            if len(line) >= 4:
                changed.append(line[3:].strip())
    return {"data": {"branch": branch, "changed_files": changed, "count": len(changed)}}


class CommitBody(BaseModel):
    message: str


@router.post("/git/commit")
async def git_commit(
    body: CommitBody, current_user: User = Depends(get_current_user)
) -> dict[str, Any]:
    cwd = user_workspace(str(current_user.id))
    code, out, err = _run_git(["add", "-A"], cwd)
    if code != 0:
        raise HTTPException(status_code=500, detail=f"git add failed: {err or out}")
    code, out, err = _run_git(["commit", "-m", body.message], cwd)
    if code != 0:
        raise HTTPException(status_code=500, detail=f"git commit failed: {err or out}")
    code, sha, _ = _run_git(["rev-parse", "HEAD"], cwd)
    return {"data": {"commit_sha": sha.strip(), "output": out.strip()}}
