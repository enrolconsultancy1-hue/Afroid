"""Workspace project route tests (create/list/tree-scoping)."""

from __future__ import annotations

import pytest
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



@pytest.fixture
def client(tmp_path, monkeypatch):
    base = tmp_path / "workspaces"
    base.mkdir()
    monkeypatch.setattr(projects_routes, "user_workspace", lambda uid: base / uid)
    monkeypatch.setattr(fs_routes, "user_workspace", lambda uid: base / uid)
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: FakeUser()
    with TestClient(app) as c:
        yield c


def test_create_and_list_projects(client: TestClient) -> None:
    r = client.post(
        "/v1/workspace/projects",
        json={
            "name": "Ethio Yield",
            "idea_id": "idea-1",
            "founder_id": "founder-9",
            "founder_email": "founder@example.com",
            "one_liner": "Satellite yield prediction",
            "blueprint": {"summary": "FastAPI + Next.js", "tech_stack": {"languages": ["Python"]}},
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body["slug"] == "ethio-yield"
    assert body["path"] == "/NEW_PROJECT_SYNCED/ethio-yield"
    assert body["synced_count"] == 1
    # Compiled record written into the synced folder
    assert body["manifest"]["founder_email"] == "founder@example.com"
    assert body["manifest"]["founder_id"] == "founder-9"
    assert body["manifest"]["blueprint"]["summary"] == "FastAPI + Next.js"

    tree = client.get("/v1/workspace/tree", params={"path": "/NEW_PROJECT_SYNCED/ethio-yield"})
    names = [n["name"] for n in tree.json()["data"]]
    assert "README.md" in names
    assert "BLUEPRINT.md" in names
    assert "project_manifest.json" in names

    # duplicate -> 409
    dup = client.post("/v1/workspace/projects", json={"name": "Ethio Yield"})
    assert dup.status_code == 409

    listing = client.get("/v1/workspace/projects")
    assert listing.status_code == 200
    data = listing.json()
    assert data["count"] == 1
    assert data["projects"][0]["name"] == "ethio-yield"
    assert data["projects"][0]["founder_email"] == "founder@example.com"
    assert data["projects"][0]["has_blueprint"] is True


def test_tree_scoped_to_project(client: TestClient) -> None:
    client.post("/v1/workspace/projects", json={"name": "Ethio Yield"})

    tree = client.get("/v1/workspace/tree", params={"path": "/NEW_PROJECT_SYNCED/ethio-yield"})
    assert tree.status_code == 200
    names = [n["name"] for n in tree.json()["data"]]
    assert "README.md" in names
    assert tree.json()["root"] == "ethio-yield"

    # traversal blocked
    escape = client.get("/v1/workspace/tree", params={"path": "/../secret"})
    assert escape.status_code == 400
