"""Workspace terminal routes: run a shell command in the workspace root."""

from __future__ import annotations

import subprocess
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from services.auth.app.middleware.auth_middleware import get_current_user
from services.auth.app.models.user import User
from services.workspace.app.config import WORKSPACE_ROOT

router = APIRouter(tags=["terminal"])

MAX_TIMEOUT_SECONDS = 60


class TerminalBody(BaseModel):
    command: str = Field(..., min_length=1, max_length=2000)


@router.post("/terminal")
async def run_terminal(body: TerminalBody, current_user: User = Depends(get_current_user)) -> dict[str, Any]:
    try:
        proc = subprocess.run(
            body.command,
            cwd=str(WORKSPACE_ROOT),
            shell=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=MAX_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        return {"data": {"stdout": "", "stderr": f"Command timed out after {MAX_TIMEOUT_SECONDS}s", "exit_code": 124}}
    except Exception as e:  # noqa: BLE001
        return {"data": {"stdout": "", "stderr": str(e), "exit_code": 1}}

    return {"data": {"stdout": proc.stdout, "stderr": proc.stderr, "exit_code": proc.returncode}}
