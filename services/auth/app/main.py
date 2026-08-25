"""Afroid Auth Service — FastAPI Application Entry Point."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from slowapi.errors import RateLimitExceeded

from services.auth.app.config import settings
from services.auth.app.limiter import limiter, rate_limit_exceeded_handler
from services.auth.app.routes.auth import router as auth_router
from services.auth.app.routes.kyc import router as kyc_router
from services.shared.database import create_engine, create_session_factory
from services.shared.exceptions import register_exception_handlers
from services.shared.logging import setup_logging
from services.shared.schemas import HealthCheck

# --- Lifespan ---


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan — setup and teardown."""
    # Setup
    setup_logging(app_env=settings.app_env)

    engine = create_engine(
        settings.database_url,
        pool_size=settings.database_pool_size,
        max_overflow=settings.database_max_overflow,
    )
    session_factory = create_session_factory(engine)

    # Store in app state for access in dependencies
    app.state.engine = engine
    app.state.session_factory = session_factory

    yield

    # Teardown
    await engine.dispose()


# --- App Factory ---


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Afroid Auth Service",
        description="Authentication and authorization for the Afroid platform.",
        version="1.0.0",
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
    )

    # --- CORS ---
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- DB Session Middleware ---
    @app.middleware("http")
    async def db_session_middleware(request: Request, call_next) -> Response:
        """Inject a DB session into each request."""
        async with app.state.session_factory() as session:
            request.state.db_session = session
            try:
                response = await call_next(request)
                await session.commit()
                return response
            except Exception:
                await session.rollback()
                raise

    # --- Exception Handlers ---
    register_exception_handlers(app)

    # --- Rate Limiting (slowapi) ---
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

    # --- Routes ---
    app.include_router(auth_router, prefix="/v1")
    app.include_router(kyc_router, prefix="/v1")

    # --- Health Check ---
    @app.get("/health", response_model=HealthCheck, tags=["health"])
    async def health_check() -> HealthCheck:
        return HealthCheck(
            status="healthy",
            service="auth-service",
            version="1.0.0",
        )

    return app


# Application instance (used by uvicorn)
app = create_app()
