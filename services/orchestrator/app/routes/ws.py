"""Orchestrator Service — Real-Time WebSocket Connection Manager & Stream Handler."""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import structlog

logger = structlog.get_logger()

ws_router = APIRouter(tags=["websocket"])


class ConnectionManager:
    """Manages active WebSocket connections grouped by session_id."""

    def __init__(self) -> None:
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket) -> None:
        """Accept connection and register under session_id."""
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)
        logger.info("websocket_connected", session_id=session_id, total_clients=len(self.active_connections[session_id]))

    def disconnect(self, session_id: str, websocket: WebSocket) -> None:
        """Unregister connection upon disconnect."""
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
        logger.info("websocket_disconnected", session_id=session_id)

    async def broadcast_to_session(self, session_id: str, message: dict[str, Any]) -> None:
        """Send a JSON payload to all clients connected to a specific session."""
        if session_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.warning("websocket_send_failed", error=str(e))
                    dead_connections.append(connection)

            for dead in dead_connections:
                self.disconnect(session_id, dead)


manager = ConnectionManager()


@ws_router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str) -> None:
    """Real-time bidirectional event streaming channel for geezcodE IDE."""
    await manager.connect(session_id, websocket)

    # Send initial connection confirmation
    await websocket.send_json({
        "type": "connection_established",
        "payload": {
            "session_id": session_id,
            "status": "connected",
            "message": "Connected to Afroid multi-agent streaming pipeline",
        },
    })

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type")
                payload = msg.get("payload", {})

                # Handle user feedback / approval messages from client
                if msg_type == "blueprint_approval":
                    logger.info("blueprint_approval_received", session_id=session_id, approved=payload.get("approved"))
                    await manager.broadcast_to_session(session_id, {
                        "type": "agent_action",
                        "payload": {
                            "agentName": "Architect",
                            "title": "Approval Recorded",
                            "detail": "Blueprint approved by user. Proceeding to CodeGen stage.",
                        },
                    })
                elif msg_type == "ping":
                    await websocket.send_json({"type": "pong"})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
