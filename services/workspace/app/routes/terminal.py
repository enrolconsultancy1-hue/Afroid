"""Workspace terminal routes: run an allowlisted command in the user's workspace.

Security model:
- shell=False (no shell metacharacters: `&&`, `;`, `|`, `$()`, redirects).
- Command allowlist (no arbitrary executables).
- Per-user isolated workspace cwd.
- Minimal environment (secrets stripped, never leaked into the subprocess).
"""

from __future__ import annotations

import os
import shlex
import subprocess
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from services.shared.auth_middleware import get_current_user
from services.shared.user_models import User
from services.workspace.app.config import user_workspace

router = APIRouter(tags=["terminal"])

MAX_TIMEOUT_SECONDS = 60

# Allowlisted executables. Only these may be run; everything else is rejected.
ALLOWED_COMMANDS = {
    "git",
    "ls",
    "pwd",
    "cat",
    "mkdir",
    "touch",
    "rm",
    "mv",
    "cp",
    "echo",
    "grep",
    "find",
    "head",
    "tail",
    "wc",
    "tree",
    "python",
    "python3",
    "pip",
    "pip3",
    "uv",
    "ruff",
    "pytest",
    "node",
    "npm",
    "npx",
    "pnpm",
    "yarn",
    "whoami",
    "uname",
    "clear",
}

# Environment variables to pass through to the subprocess. Everything else
# (including secrets like GOOGLE_API_KEY, DATABASE_URL, JWT, Stripe) is stripped.
_ENV_ALLOWLIST = {"PATH", "HOME", "LANG", "LC_ALL", "TZ"}


def _sanitized_env() -> dict[str, str]:
    """Return a minimal environment with secrets stripped."""
    return {k: v for k, v in os.environ.items() if k in _ENV_ALLOWLIST}


class TerminalBody(BaseModel):
    command: str = Field(..., min_length=1, max_length=2000)


@router.post("/terminal")
async def run_terminal(
    body: TerminalBody, current_user: User = Depends(get_current_user)
) -> dict[str, Any]:
    """Run an allowlisted command in the caller's isolated workspace."""
    try:
        tokens = shlex.split(body.command)
    except ValueError as exc:
        return {"data": {"stdout": "", "stderr": f"Invalid command: {exc}", "exit_code": 2}}

    if not tokens:
        return {"data": {"stdout": "", "stderr": "Empty command.", "exit_code": 2}}

    executable = tokens[0]
    if executable not in ALLOWED_COMMANDS:
        return {
            "data": {
                "stdout": "",
                "stderr": f"Command not allowed: {executable}",
                "exit_code": 126,
            }
        }

    cwd = user_workspace(str(current_user.id))
    try:
        proc = subprocess.run(  # noqa: S603, ASYNC221
            tokens,
            cwd=str(cwd),
            shell=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=MAX_TIMEOUT_SECONDS,
            env=_sanitized_env(),
        )
    except subprocess.TimeoutExpired:
        return {
            "data": {
                "stdout": "",
                "stderr": f"Command timed out after {MAX_TIMEOUT_SECONDS}s",
                "exit_code": 124,
            }
        }
    except Exception as exc:
        return {"data": {"stdout": "", "stderr": str(exc), "exit_code": 1}}

    return {"data": {"stdout": proc.stdout, "stderr": proc.stderr, "exit_code": proc.returncode}}
