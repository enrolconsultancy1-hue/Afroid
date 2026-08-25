"""Workspace Service configuration."""

from __future__ import annotations

import os
from pathlib import Path

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
