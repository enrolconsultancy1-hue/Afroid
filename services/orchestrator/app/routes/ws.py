"""Orchestrator Service — Real-Time WebSocket Connection Manager & Stream Handler."""

from __future__ import annotations

import asyncio
import json
from typing import Any

import structlog
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
import jwt
from jwt.exceptions import PyJWTError as JWTError

from services.orchestrator.app.config import settings
from services.orchestrator.app.routes.builder import status_payload
from services.orchestrator.app.services.durable_store import durable_store
from services.orchestrator.app.services.job_store import job_store

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
        logger.info(
            "websocket_connected",
            session_id=session_id,
            total_clients=len(self.active_connections[session_id]),
        )

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


def _extract_ws_token(websocket: WebSocket, query_token: str | None) -> str | None:
    """Extract a bearer token from the query string or Authorization header."""
    if query_token:
        return query_token
    auth = websocket.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return None


def _is_authorized(websocket: WebSocket, query_token: str | None) -> bool:
    """Validate the JWT access token for a WebSocket connection."""
    token = _extract_ws_token(websocket, query_token)
    if not token:
        return False
    try:
        jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return False
    return True


@ws_router.websocket("/ws/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    token: str | None = Query(default=None),
) -> None:
    """Real-time bidirectional event streaming channel for geezcodE IDE."""
    if not _is_authorized(websocket, token):
        logger.warning("websocket_auth_failed", session_id=session_id)
        await websocket.close(code=4401, reason="Unauthorized")
        return
    await manager.connect(session_id, websocket)

    # Send initial connection confirmation
    await websocket.send_json(
        {
            "type": "connection_established",
            "payload": {
                "session_id": session_id,
                "status": "connected",
                "message": "Connected to Afroid multi-agent streaming pipeline",
            },
        }
    )

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type")
                payload = msg.get("payload", {})

                # Handle user feedback / approval messages from client
                if msg_type == "blueprint_approval":
                    logger.info(
                        "blueprint_approval_received",
                        session_id=session_id,
                        approved=payload.get("approved"),
                    )
                    await manager.broadcast_to_session(
                        session_id,
                        {
                            "type": "agent_action",
                            "payload": {
                                "agentName": "Architect",
                                "title": "Approval Recorded",
                                "detail": "Blueprint approved by user. Proceeding to CodeGen stage.",
                            },
                        },
                    )
                elif msg_type in ("patch_approval", "patch_approved"):
                    logger.info(
                        "patch_approval_received",
                        session_id=session_id,
                        file_path=payload.get("filePath"),
                    )
                    await manager.broadcast_to_session(
                        session_id,
                        {
                            "type": "agent_action",
                            "payload": {
                                "agentName": "Parallel Builder",
                                "title": "Patch Approved",
                                "detail": f"Diff for {payload.get('filePath', 'file')} approved by Founder. Applying to project.",
                            },
                        },
                    )
                elif msg_type == "patch_rejected":
                    logger.info(
                        "patch_rejection_received",
                        session_id=session_id,
                        file_path=payload.get("filePath"),
                    )
                    await manager.broadcast_to_session(
                        session_id,
                        {
                            "type": "agent_action",
                            "payload": {
                                "agentName": "Parallel Builder",
                                "title": "Patch Rejected",
                                "detail": f"Diff for {payload.get('filePath', 'file')} rejected. Re-steering worker.",
                            },
                        },
                    )
                elif msg_type == "ping":
                    await websocket.send_json({"type": "pong"})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)


def _ws_subject(websocket: WebSocket, query_token: str | None) -> str | None:
    """Return the authenticated user id (JWT 'sub') for a WS connection, or None."""
    token = _extract_ws_token(websocket, query_token)
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
    return str(payload.get("sub") or payload.get("user_id") or "") or None


@ws_router.websocket("/ws/build/{session_id}")
async def build_stream_endpoint(
    websocket: WebSocket, session_id: str, token: str | None = Query(default=None)
) -> None:
    """Stream real build progress to the IDE over an authenticated WebSocket.

    Tails the durable build store (the shared source of truth) server-side and pushes
    a snapshot whenever the build advances — working no matter which instance runs the
    build (via the Cloud Tasks worker) or serves the socket. Requires a valid JWT and
    enforces per-user ownership of the build session.
    """
    subject = _ws_subject(websocket, token)
    if subject is None:
        await websocket.close(code=4401, reason="Unauthorized")
        return
    await websocket.accept()
    last_sig: tuple[Any, Any, int] | None = None
    missing_ticks = 0
    try:
        await websocket.send_json(
            {"type": "connection_established", "payload": {"session_id": session_id}}
        )
        while True:
            store = await durable_store.get("build", session_id)
            # Per-user isolation: a record owned by someone else is invisible.
            if store is not None and store.get("owner_id") not in (None, subject):
                await websocket.send_json({"type": "snapshot", "data": {"session_id": session_id, "status": "not_found"}})
                break
            payload = status_payload(session_id, store)
            status = payload.get("status")

            if status == "not_found":
                # The /start record may not have landed yet; wait briefly, then give up.
                missing_ticks += 1
                if missing_ticks > 20:
                    await websocket.send_json({"type": "snapshot", "data": payload})
                    break
                await asyncio.sleep(1.0)
                continue
            missing_ticks = 0

            sig = (status, payload.get("progress"), len(payload.get("log", [])))
            if sig != last_sig:
                await websocket.send_json({"type": "snapshot", "data": payload})
                last_sig = sig

            if status in ("complete", "error"):
                break
            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        return
    except Exception as exc:  # noqa: BLE001 — a socket send failure just ends the stream
        logger.info("build_stream_ended", session_id=session_id, reason=str(exc))
    finally:
        try:
            await websocket.close()
        except Exception:  # noqa: BLE001 — already closed
            pass


_TERMINAL_PHASES = {"complete", "completed", "done", "error", "failed"}


@ws_router.websocket("/ws/job/{job_id}")
async def job_stream_endpoint(
    websocket: WebSocket, job_id: str, token: str | None = Query(default=None)
) -> None:
    """Stream orchestration-pipeline (/v1/orchestrate) job progress over WebSocket.

    Like the build stream, this tails the DURABLE job store (Postgres) server-side
    rather than relying on the in-process event bus / ConnectionManager, so a client
    on any instance sees progress for a pipeline running on any other instance. This
    removes the legacy pipeline's dependency on single-instance in-memory fan-out.
    Requires a valid JWT and enforces per-user ownership.
    """
    subject = _ws_subject(websocket, token)
    if subject is None:
        await websocket.close(code=4401, reason="Unauthorized")
        return
    await websocket.accept()
    last_sig: tuple[Any, Any, int] | None = None
    missing_ticks = 0
    try:
        await websocket.send_json(
            {"type": "connection_established", "payload": {"job_id": job_id}}
        )
        while True:
            state = await job_store.get(job_id)
            if state is None:
                missing_ticks += 1
                if missing_ticks > 20:
                    await websocket.send_json(
                        {"type": "snapshot", "data": {"job_id": job_id, "status": "not_found"}}
                    )
                    break
                await asyncio.sleep(1.0)
                continue
            # Per-user isolation: only the owner may stream the job.
            if getattr(state, "user_id", None) not in (None, "", subject):
                await websocket.send_json({"type": "snapshot", "data": {"job_id": job_id, "status": "not_found"}})
                break
            missing_ticks = 0

            phase = state.phase.value if hasattr(state.phase, "value") else str(state.phase)
            payload = {
                "job_id": state.job_id,
                "session_id": state.session_id,
                "status": phase,
                "current_agent": state.current_agent,
                "progress": state.progress,
                "file_count": len(state.generated_files),
                "review_count": len(state.review_results),
                "error": state.error_message,
            }
            sig = (phase, state.progress, len(state.generated_files))
            if sig != last_sig:
                await websocket.send_json({"type": "snapshot", "data": payload})
                last_sig = sig

            if phase.lower() in _TERMINAL_PHASES:
                break
            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        return
    except Exception as exc:  # noqa: BLE001
        logger.info("job_stream_ended", job_id=job_id, reason=str(exc))
    finally:
        try:
            await websocket.close()
        except Exception:  # noqa: BLE001
            pass
