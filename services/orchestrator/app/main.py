"""Afroid Orchestrator Service — FastAPI Application Entry Point."""

from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from services.orchestrator.app.config import settings
from services.orchestrator.app.routes.builder import router as builder_router
from services.orchestrator.app.routes.orchestrate import router as orchestrate_router
from services.orchestrator.app.routes.ws import ws_router
from services.shared.database import create_engine, create_session_factory
from services.shared.event_bus import event_bus
from services.shared.exceptions import register_exception_handlers
from services.shared.logging import setup_logging
from services.shared.schemas import HealthCheck


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    setup_logging(app_env=settings.app_env)
    await event_bus.initialize()
    engine = create_engine(settings.database_url, pool_size=settings.database_pool_size, max_overflow=settings.database_max_overflow)
    app.state.engine = engine
    app.state.session_factory = create_session_factory(engine)
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Afroid Orchestrator Service",
        description="Multi-agent code generation pipeline.",
        version="1.0.0",
        docs_url="/docs" if settings.is_development else None,
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
    )

    app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "https://app.afroid.io"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

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
    app.include_router(orchestrate_router, prefix="/v1")
    app.include_router(builder_router, prefix="/v1")
    app.include_router(ws_router)

    @app.get("/health", response_model=HealthCheck, tags=["health"])
    async def health_check() -> HealthCheck:
        return HealthCheck(status="healthy", service="orchestrator-service", version="1.0.0")

    return app


app = create_app()
