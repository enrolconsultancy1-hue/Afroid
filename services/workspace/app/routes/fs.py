"""Workspace filesystem routes: tree, file read/write, search (per-user scoped)."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from services.shared.auth_middleware import get_current_user
from services.shared.user_models import User
from services.workspace.app.config import EXCLUDED_DIRS, user_workspace

router = APIRouter(tags=["filesystem"])

MAX_FILE_BYTES = 512 * 1024  # 512 KB
EXCLUDED_FILE_SUFFIXES = {
    ".pyc",
    ".pyo",
    ".tsbuildinfo",
    ".lock",
    ".log",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".svg",
    ".zip",
    ".exe",
    ".dll",
}


def _safe_resolve(rel: str, base: Path) -> Path:
    """Resolve a relative path within the given base, blocking traversal."""
    root = base.resolve()
    candidate = (root / rel).resolve()
    if str(candidate) != str(root) and not str(candidate).startswith(str(root) + os.sep):
        raise HTTPException(status_code=400, detail="Path escapes workspace root")
    return candidate


def _walk(
    directory: Path,
    base: Path,
    depth: int = 0,
    max_depth: int = 6,
) -> list[dict[str, Any]]:
    nodes: list[dict[str, Any]] = []
    try:
        entries = sorted(directory.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
    except (PermissionError, FileNotFoundError, OSError):
        return nodes
    for entry in entries:
        name = entry.name
        if name in EXCLUDED_DIRS or name.startswith(".") or name.endswith(".egg-info"):
            continue
        try:
            if entry.is_dir():
                children = _walk(entry, base, depth + 1, max_depth) if depth < max_depth else []
                nodes.append(
                    {
                        "name": name,
                        "path": str(entry.relative_to(base)),
                        "type": "directory",
                        "children": children,
                    }
                )
            else:
                if entry.suffix in EXCLUDED_FILE_SUFFIXES:
                    continue
                if entry.stat().st_size > MAX_FILE_BYTES:
                    continue
                nodes.append(
                    {
                        "name": name,
                        "path": str(entry.relative_to(base)),
                        "type": "file",
                    }
                )
        except (PermissionError, OSError):
            continue
    return nodes


@router.get("/tree")
async def get_tree(
    current_user: User = Depends(get_current_user),
    path: str | None = Query(default=None, description="Optional project subfolder"),
) -> dict[str, Any]:
    base = user_workspace(str(current_user.id))
    rel = path.lstrip("/") if path else None
    target = _safe_resolve(rel, base) if rel else base
    if not target.is_dir():
        raise HTTPException(status_code=404, detail="Folder not found")
    return {"data": _walk(target, base), "root": target.name if path else None}


@router.get("/file")
async def get_file(
    current_user: User = Depends(get_current_user),
    path: str = Query(..., description="Relative path inside the user's workspace"),
) -> dict[str, Any]:
    base = user_workspace(str(current_user.id))
    p = _safe_resolve(path, base)
    if not p.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    content = p.read_text(encoding="utf-8", errors="replace")
    return {
        "data": {"path": path, "name": p.name, "content": content, "language": p.suffix.lstrip(".")}
    }


class WriteFileBody(BaseModel):
    path: str
    content: str


@router.post("/file")
async def write_file(
    body: WriteFileBody, current_user: User = Depends(get_current_user)
) -> dict[str, Any]:
    base = user_workspace(str(current_user.id))
    p = _safe_resolve(body.path, base)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(body.content, encoding="utf-8")
    return {"data": {"path": body.path, "written": True}}


@router.get("/search")
async def search(
    current_user: User = Depends(get_current_user),
    q: str = Query(..., min_length=1),
    max_results: int = Query(default=100, le=500),
) -> dict[str, Any]:
    base = user_workspace(str(current_user.id))
    results: list[dict[str, Any]] = []
    needle = q.lower()
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames[:] = [
            d
            for d in dirnames
            if d not in EXCLUDED_DIRS and not d.startswith(".") and not d.endswith(".egg-info")
        ]
        for fn in filenames:
            if any(fn.endswith(s) for s in EXCLUDED_FILE_SUFFIXES):
                continue
            fp = Path(dirpath) / fn
            try:
                if fp.stat().st_size > MAX_FILE_BYTES:
                    continue
                text = fp.read_text(encoding="utf-8", errors="replace")
            except (PermissionError, OSError):
                continue
            for i, line in enumerate(text.splitlines(), 1):
                if needle in line.lower():
                    results.append(
                        {
                            "file": str(fp.relative_to(base)),
                            "line": i,
                            "text": line.strip()[:200],
                        }
                    )
                    if len(results) >= max_results:
                        return {"data": results}
    return {"data": results}
