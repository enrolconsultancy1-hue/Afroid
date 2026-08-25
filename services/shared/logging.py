"""Structured JSON logging and distributed tracing configuration using structlog."""

from __future__ import annotations

import logging
import os
import sys
import time
import uuid
from typing import Any

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


def add_correlation_fields(
    logger: logging.Logger,
    method_name: str,
    event_dict: dict[str, Any],
) -> dict[str, Any]:
    """Inject GCP Cloud Logging severity and trace metadata if present."""
    # Map standard log levels to Cloud Logging severity
    level = event_dict.get("level", "info").upper()
    event_dict["severity"] = level

    return event_dict


def setup_logging(app_env: str = "development", log_level: str = "INFO") -> None:
    """Configure structured logging for the application."""
    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
        add_correlation_fields,
    ]

    if app_env == "development":
        # Pretty console output for local development
        renderer: structlog.types.Processor = structlog.dev.ConsoleRenderer(colors=True)
    else:
        # JSON output for production (GCP Cloud Logging / Cloud Trace compatible)
        renderer = structlog.processors.JSONRenderer()

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(getattr(logging, log_level.upper()))

    # Silence noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    # Initialize Sentry error monitoring if a DSN is configured (SENTRY_DSN env / .env).
    sentry_dsn = os.environ.get("SENTRY_DSN", "").strip()
    if sentry_dsn:
        try:
            import sentry_sdk

            sentry_sdk.init(
                dsn=sentry_dsn,
                environment=app_env,
                traces_sample_rate=1.0 if app_env != "production" else 0.1,
                send_default_pii=False,
            )
        except Exception:
            logging.getLogger("sentry").exception("Failed to initialize Sentry")


class TracingMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware that tracks request correlation IDs and logs duration."""

    async def dispatch(self, request: Request, call_next) -> Response:
        correlation_id = (
            request.headers.get("X-Correlation-ID")
            or request.headers.get("X-Request-ID")
            or str(uuid.uuid4())
        )
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            correlation_id=correlation_id,
            path=request.url.path,
            method=request.method,
        )

        start_time = time.perf_counter()
        logger = structlog.get_logger()

        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            response.headers["X-Correlation-ID"] = correlation_id
            response.headers["X-Response-Time-Ms"] = str(duration_ms)

            if request.url.path != "/health":
                logger.info(
                    "http_request_finished",
                    status_code=response.status_code,
                    duration_ms=duration_ms,
                )
            return response
        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(
                "http_request_unhandled_error",
                error=str(exc),
                duration_ms=duration_ms,
                exc_info=True,
            )
            raise
