"""Workspace Service configuration."""

from __future__ import annotations

import os
from pathlib import Path

from services.shared.config import BaseAppSettings

# Afroid repo root = services/workspace/app/config.py -> parents[3]
REPO_ROOT = Path(__file__).resolve().parents[3]

WORKSPACE_ROOT = Path(os.environ.get("WORKSPACE_ROOT", str(REPO_ROOT))).resolve()

EXCLUDED_DIRS = {
    ".git",
    "node_modules",
    ".venv",
    "__pycache__",
    ".next",
    "dist",
    "build",
    ".turbo",
    "coverage",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
}


def user_workspace(user_id: str) -> Path:
    """Return (and create) the isolated per-user workspace directory.

    Each authenticated user operates on their own directory, so filesystem,
    git, and terminal routes can never touch the repo root (which contains
    the live ".env" secrets) or another user's files.
    """
    base = WORKSPACE_ROOT / "workspaces" / user_id
    base.mkdir(parents=True, exist_ok=True)
    return base


class WorkspaceSettings(BaseAppSettings):
    """Workspace service settings (inherits database_url, app_env, pool, logging)."""


settings = WorkspaceSettings()
