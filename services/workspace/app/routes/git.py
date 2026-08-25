"""Workspace git routes: status + commit (delegates to the git CLI)."""

from __future__ import annotations

import subprocess
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.workspace.app.config import WORKSPACE_ROOT

router = APIRouter(tags=["git"])


def _run_git(args: list[str]) -> tuple[int, str, str]:
    proc = subprocess.run(
        ["git", *args],
        cwd=str(WORKSPACE_ROOT),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=30,
    )
    return proc.returncode, proc.stdout, proc.stderr


@router.get("/git/status")
async def git_status() -> dict[str, Any]:
    code, out, _ = _run_git(["rev-parse", "--abbrev-ref", "HEAD"])
    branch = out.strip() if code == 0 else "unknown"
    code2, out2, _ = _run_git(["status", "--porcelain"])
    changed: list[str] = []
    if code2 == 0:
        for line in out2.splitlines():
            if len(line) >= 4:
                changed.append(line[3:].strip())
    return {"data": {"branch": branch, "changed_files": changed, "count": len(changed)}}


class CommitBody(BaseModel):
    message: str


@router.post("/git/commit")
async def git_commit(body: CommitBody) -> dict[str, Any]:
    code, out, err = _run_git(["add", "-A"])
    if code != 0:
        raise HTTPException(status_code=500, detail=f"git add failed: {err or out}")
    code, out, err = _run_git(["commit", "-m", body.message])
    if code != 0:
        raise HTTPException(status_code=500, detail=f"git commit failed: {err or out}")
    code, sha, _ = _run_git(["rev-parse", "HEAD"])
    return {"data": {"commit_sha": sha.strip(), "output": out.strip()}}
