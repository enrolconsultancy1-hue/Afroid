"""Afroid Workspace Service - FastAPI entry point (filesystem + git + terminal)."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from services.shared.schemas import HealthCheck
from services.workspace.app.routes.fs import router as fs_router
from services.workspace.app.routes.git import router as git_router
from services.workspace.app.routes.terminal import router as terminal_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Afroid Workspace Service",
        description="Local filesystem, git, and terminal access for the geezcodE IDE.",
        version="1.0.0",
        docs_url="/docs",
        default_response_class=ORJSONResponse,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "https://app.afroid.io"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(fs_router, prefix="/v1/workspace")
    app.include_router(git_router, prefix="/v1/workspace")
    app.include_router(terminal_router, prefix="/v1/workspace")

    @app.get("/health", response_model=HealthCheck, tags=["health"])
    async def health() -> HealthCheck:
        return HealthCheck(status="healthy", service="workspace-service", version="1.0.0")

    return app


app = create_app()
