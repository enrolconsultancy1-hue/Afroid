"""Unit tests for workspace agent tool endpoints: replace-lines and view-file."""

from __future__ import annotations

from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from services.auth.app.middleware.auth_middleware import get_current_user
from services.workspace.app.main import create_app
from services.workspace.app.routes import fs as fs_routes


class FakeUser:
    id = "tool-user-1234"


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    ws = tmp_path / "workspaces" / "tool-user-1234"
    ws.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(fs_routes, "user_workspace", lambda uid: ws)
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: FakeUser()
    with TestClient(app) as c:
        yield c, ws


def test_tool_view_file_and_replace_lines(client: tuple[TestClient, Path]) -> None:
    c, ws = client
    target = ws / "sample.py"
    target.write_text("line1\nline2\nline3\nline4\nline5\n", encoding="utf-8")

    # 1. Test view-file slice
    res = c.get("/v1/workspace/tools/view-file?path=sample.py&start_line=2&end_line=4")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["total_lines"] == 5
    assert data["start_line"] == 2
    assert data["end_line"] == 4
    assert len(data["lines"]) == 3
    assert data["lines"][0]["content"] == "line2"
    assert data["lines"][1]["content"] == "line3"
    assert data["lines"][2]["content"] == "line4"

    # 2. Test replace-lines with mismatching target_content (should fail 409)
    bad_replace = c.post(
        "/v1/workspace/tools/replace-lines",
        json={
            "path": "sample.py",
            "start_line": 2,
            "end_line": 3,
            "target_content": "WRONG_CONTENT",
            "replacement_content": "replaced\n",
        },
    )
    assert bad_replace.status_code == 409

    # 3. Test surgical replace-lines with matching target_content (should succeed 200)
    good_replace = c.post(
        "/v1/workspace/tools/replace-lines",
        json={
            "path": "sample.py",
            "start_line": 2,
            "end_line": 3,
            "target_content": "line2\nline3\n",
            "replacement_content": "NEW_LINE_2\nNEW_LINE_3\n",
        },
    )
    assert good_replace.status_code == 200
    assert good_replace.json()["data"]["replaced"] is True

    # 4. Verify modified content on disk
    updated_text = target.read_text(encoding="utf-8")
    assert updated_text == "line1\nNEW_LINE_2\nNEW_LINE_3\nline4\nline5\n"
