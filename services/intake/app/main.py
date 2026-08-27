"""Afroid Intake Service — FastAPI application entry point."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from services.intake.app.config import settings
from services.intake.app.models.intake import (  # noqa: F401 — registers models on Base.metadata
    EvaluatorProfile,
    IdeaSubmission,
    PitchEvaluation,
    WriterProfile,
)
from services.intake.app.routes.evaluations import router as evaluations_router
from services.intake.app.routes.evaluators import router as evaluators_router
from services.intake.app.routes.ideas import router as ideas_router
from services.intake.app.routes.writers import router as writers_router
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
    # Create intake-owned tables idempotently (phase-2 evaluator tables included).
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Afroid Intake Service",
        description="Founder idea-submission queue, writer/builder portal, and pitch-deck evaluation.",
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
    app.include_router(ideas_router, prefix="/v1/intake")
    app.include_router(writers_router, prefix="/v1/intake")
    app.include_router(evaluators_router, prefix="/v1/intake")
    app.include_router(evaluations_router, prefix="/v1/intake")

    @app.get("/health", response_model=HealthCheck, tags=["health"])
    async def health_check() -> HealthCheck:
        return HealthCheck(status="healthy", service="intake-service", version="1.0.0")

    return app


app = create_app()
