"""Unit tests for the WebSocket ConnectionManager and routing."""

from __future__ import annotations

import pytest

from services.orchestrator.app.routes.ws import ConnectionManager


class MockWebSocket:
    """Mock WebSocket for unit tests."""

    def __init__(self) -> None:
        self.accepted = False
        self.sent_messages: list[dict] = []
        self.closed = False

    async def accept(self) -> None:
        self.accepted = True

    async def send_json(self, data: dict) -> None:
        self.sent_messages.append(data)

    async def close(self) -> None:
        self.closed = True


@pytest.mark.asyncio
class TestConnectionManager:
    """Tests for session-based WebSocket multiplexing."""

    @pytest.fixture
    def manager(self) -> ConnectionManager:
        return ConnectionManager()

    async def test_connect_and_disconnect(self, manager: ConnectionManager) -> None:
        ws = MockWebSocket()
        session_id = "test-session-1"

        await manager.connect(session_id, ws)
        assert ws.accepted is True
        assert session_id in manager.active_connections
        assert len(manager.active_connections[session_id]) == 1

        manager.disconnect(session_id, ws)
        assert session_id not in manager.active_connections

    async def test_broadcast_to_session(self, manager: ConnectionManager) -> None:
        ws1 = MockWebSocket()
        ws2 = MockWebSocket()
        session_id = "test-session-2"

        await manager.connect(session_id, ws1)
        await manager.connect(session_id, ws2)

        msg = {"type": "agent_action", "payload": {"agentName": "CodeGen", "title": "File Created"}}
        await manager.broadcast_to_session(session_id, msg)

        assert len(ws1.sent_messages) == 1
        assert len(ws2.sent_messages) == 1
        assert ws1.sent_messages[0] == msg
        assert ws2.sent_messages[0] == msg
