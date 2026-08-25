"""Afroid API Gateway - lightweight reverse proxy for local development.

Routes incoming `/v1/*` requests to the correct backend service based on
path prefix, and forwards `/ws` websockets to the orchestrator. Production
uses Kong / Cloud Endpoints; this gateway exists for local, end-to-end runs.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

import httpx
from fastapi import FastAPI, Request, Response
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
}

# Longest-prefix routing table: (path prefix, service key).
ROUTES: list[tuple[str, str]] = [
    ("/v1/auth", "auth"),
    ("/v1/kyc", "auth"),
    ("/v1/projects", "platform"),
    ("/v1/organizations", "platform"),
    ("/v1/certify", "certify"),
    ("/v1/opportunities", "incubate"),
    ("/v1/match", "incubate"),
    ("/v1/orchestrate", "orchestrator"),
    ("/v1/builder", "orchestrator"),
    ("/v1/codegen", "codegen"),
    ("/v1/vector", "vector-store"),
    ("/v1/notifications", "notification"),
    ("/v1/workspace", "workspace"),
]

_HOP_BY_HOP = {"host", "content-length", "transfer-encoding", "connection", "keep-alive", "upgrade"}


def route_for(path: str) -> str | None:
    for prefix, service in ROUTES:
        if path.startswith(prefix):
            return service
    return None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    app.state.client = httpx.AsyncClient(timeout=60.0)
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
        allow_origins=["http://localhost:3000", "https://app.afroid.io"],
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
            return JSONResponse({"detail": f"Upstream service '{service}' is unreachable"}, status_code=502)
        except httpx.TimeoutException:
            return JSONResponse({"detail": f"Upstream service '{service}' timed out"}, status_code=504)

        content = await resp.aread()
        media_type = resp.headers.get("content-type")
        resp_headers = {
            k: v for k, v in resp.headers.items() if k.lower() not in _HOP_BY_HOP and k.lower() != "content-type"
        }
        return Response(
            content=content,
            status_code=resp.status_code,
            headers=resp_headers,
            media_type=media_type,
        )

    return app


app = create_app()
