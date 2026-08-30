"""Afroid Workspace Service - FastAPI entry point (filesystem + git + terminal).

Authentication: all workspace routes require a valid JWT (get_current_user).
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from services.shared.database import create_engine, create_session_factory
from services.shared.exceptions import register_exception_handlers
from services.shared.logging import setup_logging
from services.shared.schemas import HealthCheck
from services.workspace.app.config import settings
from services.workspace.app.routes.fs import router as fs_router
from services.workspace.app.routes.git import router as git_router
from services.workspace.app.routes.projects import router as projects_router
from services.workspace.app.routes.terminal import router as terminal_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    setup_logging(app_env=settings.app_env)
    engine = create_engine(
        settings.database_url,
        pool_size=settings.database_pool_size,
        max_overflow=settings.database_max_overflow,
    )
    app.state.engine = engine
    app.state.session_factory = create_session_factory(engine)
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Afroid Workspace Service",
        description="Authenticated filesystem, git, and terminal access for the geezcodE IDE.",
        version="1.0.0",
        docs_url="/docs" if settings.is_development else None,
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def db_session_middleware(request: Request, call_next) -> Response:
        async with app.state.session_factory() as session:
            request.state.db_session = session
            try:
                response = await call_next(request)
                await session.commit()
                return response
            except Exception:
                await session.rollback()
                raise

    register_exception_handlers(app)
    app.include_router(fs_router, prefix="/v1/workspace")
    app.include_router(git_router, prefix="/v1/workspace")
    app.include_router(terminal_router, prefix="/v1/workspace")
    app.include_router(projects_router, prefix="/v1/workspace")

    @app.get("/health", response_model=HealthCheck, tags=["health"])
    async def health() -> HealthCheck:
        return HealthCheck(status="healthy", service="workspace-service", version="1.0.0")

    return app


app = create_app()
