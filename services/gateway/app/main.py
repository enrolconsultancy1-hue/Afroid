"""Afroid API Gateway - lightweight reverse proxy for local development.

Routes incoming `/v1/*` requests to the correct backend service based on
path prefix, and forwards `/ws` websockets to the orchestrator. Production
uses Kong / Cloud Endpoints; this gateway exists for local, end-to-end runs.
"""

from __future__ import annotations

import asyncio
import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, ORJSONResponse

from services.shared.schemas import HealthCheck


def _env(key: str, default: str) -> str:
    return os.environ.get(key, default)


# Upstream service base URLs (override via GATEWAY_*_URL env vars).
UPSTREAMS: dict[str, str] = {
    "auth": _env("GATEWAY_AUTH_URL", "http://127.0.0.1:8010"),
    "platform": _env("GATEWAY_PLATFORM_URL", "http://127.0.0.1:8011"),
    "certify": _env("GATEWAY_CERTIFY_URL", "http://127.0.0.1:8012"),
    "incubate": _env("GATEWAY_INCUBATE_URL", "http://127.0.0.1:8013"),
    "orchestrator": _env("GATEWAY_ORCHESTRATOR_URL", "http://127.0.0.1:8014"),
    "codegen": _env("GATEWAY_CODEGEN_URL", "http://127.0.0.1:8015"),
    "vector-store": _env("GATEWAY_VECTOR_STORE_URL", "http://127.0.0.1:8016"),
    "notification": _env("GATEWAY_NOTIFICATION_URL", "http://127.0.0.1:8017"),
    "workspace": _env("GATEWAY_WORKSPACE_URL", "http://127.0.0.1:8018"),
    "intake": _env("GATEWAY_INTAKE_URL", "http://127.0.0.1:8019"),
}

# Longest-prefix routing table: (path prefix, service key).
ROUTES: list[tuple[str, str]] = [
    ("/v1/auth", "auth"),
    ("/v1/kyc", "auth"),
    ("/v1/projects", "platform"),
    ("/v1/organizations", "platform"),
    ("/v1/billing", "platform"),
    ("/v1/certify", "certify"),
    ("/v1/opportunities", "incubate"),
    ("/v1/match", "incubate"),
    ("/v1/orchestrate", "orchestrator"),
    ("/v1/builder", "orchestrator"),
    ("/v1/codegen", "codegen"),
    ("/v1/vector", "vector-store"),
    ("/v1/notifications", "notification"),
    ("/v1/workspace", "workspace"),
    ("/v1/intake", "intake"),
]

_HOP_BY_HOP = {"host", "content-length", "transfer-encoding", "connection", "keep-alive", "upgrade"}


def route_for(path: str) -> str | None:
    for prefix, service in ROUTES:
        if path.startswith(prefix):
            return service
    return None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    app.state.client = httpx.AsyncClient(timeout=300.0)
    yield
    await app.state.client.aclose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Afroid API Gateway",
        description="Reverse proxy routing /v1/* to Afroid microservices.",
        version="1.0.0",
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_env("CORS_ORIGINS", "http://localhost:3000,https://app.afroid.io").split(
            ","
        ),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", response_model=HealthCheck, tags=["health"])
    async def health() -> HealthCheck:
        return HealthCheck(status="healthy", service="gateway-service", version="1.0.0")

    @app.get("/routes", tags=["gateway"])
    async def list_routes() -> dict[str, str]:
        return {prefix: service for prefix, service in ROUTES}

    @app.websocket("/ws/{path:path}")
    async def ws_proxy(client_ws: WebSocket, path: str) -> None:
        """Bridge browser WebSockets to the orchestrator (e.g. /ws/build/{id}).

        The HTTP proxy cannot carry a WebSocket upgrade, so this route accepts the
        client socket and pipes frames both ways to the orchestrator's own WS
        endpoint. This lets the IDE reach live build/job streams same-origin through
        the gateway; a direct connection to the orchestrator also remains valid.
        """
        # Import lazily so a missing optional dep can never crash gateway startup.
        try:
            import websockets
        except Exception:  # noqa: BLE001
            await client_ws.close(code=1011)
            return

        base = UPSTREAMS["orchestrator"]
        ws_base = base.replace("https://", "wss://", 1).replace("http://", "ws://", 1)
        target = f"{ws_base}/ws/{path}"
        if client_ws.scope.get("query_string"):
            target += "?" + client_ws.scope["query_string"].decode()

        await client_ws.accept()
        try:
            async with websockets.connect(target, open_timeout=10) as upstream:
                async def client_to_upstream() -> None:
                    try:
                        while True:
                            msg = await client_ws.receive_text()
                            await upstream.send(msg)
                    except Exception:  # noqa: BLE001 — client closed / socket error
                        await upstream.close()

                async def upstream_to_client() -> None:
                    try:
                        async for msg in upstream:
                            await client_ws.send_text(
                                msg if isinstance(msg, str) else msg.decode("utf-8", "ignore")
                            )
                    except Exception:  # noqa: BLE001 — upstream closed / socket error
                        pass

                await asyncio.gather(client_to_upstream(), upstream_to_client())
        except WebSocketDisconnect:
            return
        except Exception:  # noqa: BLE001 — upstream unreachable / handshake failure
            pass
        finally:
            try:
                await client_ws.close()
            except Exception:  # noqa: BLE001
                pass

    @app.api_route(
        "/{full_path:path}",
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    )
    async def proxy(request: Request, full_path: str) -> Response:
        path = "/" + full_path
        service = route_for(path)
        if service is None:
            return JSONResponse({"detail": f"No upstream route for {path}"}, status_code=404)

        base = UPSTREAMS[service]
        url = base + request.url.path
        if request.url.query:
            url += "?" + request.url.query

        headers = {k: v for k, v in request.headers.items() if k.lower() not in _HOP_BY_HOP}
        # Forward the real client IP so downstream services can rate-limit per client.
        client_ip = request.client.host if request.client else "127.0.0.1"
        existing_xff = headers.get("x-forwarded-for")
        headers["x-forwarded-for"] = f"{existing_xff}, {client_ip}" if existing_xff else client_ip
        body = await request.body()

        req = app.state.client.build_request(request.method, url, headers=headers, content=body)
        try:
            resp = await app.state.client.send(req, stream=True)
        except httpx.ConnectError:
            return JSONResponse(
                {"detail": f"Upstream service '{service}' is unreachable"}, status_code=502
            )
        except httpx.TimeoutException:
            return JSONResponse(
                {"detail": f"Upstream service '{service}' timed out"}, status_code=504
            )

        content = await resp.aread()
        media_type = resp.headers.get("content-type")
        resp_headers = {
            k: v
            for k, v in resp.headers.items()
            if k.lower() not in _HOP_BY_HOP and k.lower() != "content-type"
        }
        return Response(
            content=content,
            status_code=resp.status_code,
            headers=resp_headers,
            media_type=media_type,
        )

    return app


app = create_app()
