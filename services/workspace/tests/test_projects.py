"""Workspace project route tests (create/list/tree-scoping)."""

from __future__ import annotations

from fastapi.testclient import TestClient

from services.auth.app.middleware.auth_middleware import get_current_user
from services.workspace.app.main import create_app
from services.workspace.app.routes import fs as fs_routes
from services.workspace.app.routes import projects as projects_routes
from services.workspace.app.routes.projects import _slugify


class FakeUser:
    id = "test-user-1"


def test_slugify() -> None:
    assert _slugify("Ethio Yield") == "ethio-yield"
    assert _slugify("  AgroPulse AI!  ") == "agropulse-ai"
    assert _slugify("!!") == "untitled-project"


def _client(tmp_path, monkeypatch) -> TestClient:
    base = tmp_path / "workspaces"
    base.mkdir()
    monkeypatch.setattr(projects_routes, "user_workspace", lambda uid: base / uid)
    monkeypatch.setattr(fs_routes, "user_workspace", lambda uid: base / uid)
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: FakeUser()
    return TestClient(app)


def test_create_and_list_projects(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    base = tmp_path / "workspaces" / "test-user-1"

    r = client.post("/v1/workspace/projects", json={"name": "Ethio Yield", "idea_id": "idea-1"})
    assert r.status_code == 201
    body = r.json()
    assert body["slug"] == "ethio-yield"
    assert (base / "ethio-yield" / "README.md").exists()

    # duplicate -> 409
    dup = client.post("/v1/workspace/projects", json={"name": "Ethio Yield"})
    assert dup.status_code == 409

    listing = client.get("/v1/workspace/projects")
    assert listing.status_code == 200
    assert listing.json()["projects"] == [{"name": "ethio-yield", "path": "/ethio-yield"}]


def test_tree_scoped_to_project(tmp_path, monkeypatch) -> None:
    client = _client(tmp_path, monkeypatch)
    client.post("/v1/workspace/projects", json={"name": "Ethio Yield"})

    tree = client.get("/v1/workspace/tree", params={"path": "/ethio-yield"})
    assert tree.status_code == 200
    names = [n["name"] for n in tree.json()["data"]]
    assert "README.md" in names
    assert tree.json()["root"] == "ethio-yield"

    # traversal blocked
    escape = client.get("/v1/workspace/tree", params={"path": "/../secret"})
    assert escape.status_code == 400
