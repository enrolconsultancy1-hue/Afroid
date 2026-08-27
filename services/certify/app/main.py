"""Afroid Certify Service — FastAPI Application Entry Point."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from services.certify.app.config import settings
from services.certify.app.models.designation import (  # noqa: F401 — registers on Base.metadata
    Designation,
)
from services.certify.app.routes.certify import router as certify_router
from services.shared.database import Base, create_engine, create_session_factory
from services.shared.exceptions import register_exception_handlers
from services.shared.logging import setup_logging
from services.shared.schemas import HealthCheck


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
    # Create certify-owned tables idempotently (designations).
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Afroid Certify Service",
        description="RegTech compliance engine, pitch-deck designation certificates, IP verification.",
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
    app.include_router(certify_router, prefix="/v1")

    @app.get("/health", response_model=HealthCheck, tags=["health"])
    async def health_check() -> HealthCheck:
        return HealthCheck(status="healthy", service="certify-service", version="1.0.0")

    return app


app = create_app()
