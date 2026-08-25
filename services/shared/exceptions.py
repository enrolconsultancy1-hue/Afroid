"""Global exception handlers and custom exception classes."""

from __future__ import annotations

import structlog
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import ORJSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = structlog.get_logger()


class AfroidException(Exception):
    """Base exception for all Afroid application errors."""

    def __init__(
        self,
        status_code: int = 500,
        title: str = "Internal Server Error",
        detail: str = "An unexpected error occurred.",
        error_type: str = "internal_error",
    ) -> None:
        self.status_code = status_code
        self.title = title
        self.detail = detail
        self.error_type = error_type
        super().__init__(detail)


class NotFoundError(AfroidException):
    """Resource not found."""

    def __init__(self, resource: str = "Resource", resource_id: str = "") -> None:
        super().__init__(
            status_code=404,
            title=f"{resource} not found",
            detail=f"{resource} with ID '{resource_id}' does not exist.",
            error_type="not_found",
        )


class ConflictError(AfroidException):
    """Resource already exists."""

    def __init__(self, detail: str = "Resource already exists.") -> None:
        super().__init__(
            status_code=409,
            title="Conflict",
            detail=detail,
            error_type="conflict",
        )


class ForbiddenError(AfroidException):
    """Insufficient permissions."""

    def __init__(self, detail: str = "You do not have permission to perform this action.") -> None:
        super().__init__(
            status_code=403,
            title="Forbidden",
            detail=detail,
            error_type="forbidden",
        )


class UnauthorizedError(AfroidException):
    """Authentication required or failed."""

    def __init__(self, detail: str = "Authentication required.") -> None:
        super().__init__(
            status_code=401,
            title="Unauthorized",
            detail=detail,
            error_type="authentication_required",
        )


class RateLimitError(AfroidException):
    """Too many requests."""

    def __init__(self, retry_after: int = 60) -> None:
        super().__init__(
            status_code=429,
            title="Rate Limit Exceeded",
            detail=f"Too many requests. Please retry after {retry_after} seconds.",
            error_type="rate_limit_exceeded",
        )
        self.retry_after = retry_after


class ServiceUnavailableError(AfroidException):
    """Dependent service not configured or unavailable."""

    def __init__(self, detail: str = "Service unavailable.") -> None:
        super().__init__(
            status_code=503,
            title="Service Unavailable",
            detail=detail,
            error_type="service_unavailable",
        )


class BadRequestError(AfroidException):
    """Invalid request."""

    def __init__(self, detail: str = "Invalid request.") -> None:
        super().__init__(
            status_code=400,
            title="Bad Request",
            detail=detail,
            error_type="bad_request",
        )


def register_exception_handlers(app: FastAPI) -> None:
    """Register global exception handlers on the FastAPI app."""

    @app.exception_handler(AfroidException)
    async def afroid_exception_handler(request: Request, exc: AfroidException) -> ORJSONResponse:
        logger.warning(
            "application_error",
            error_type=exc.error_type,
            status_code=exc.status_code,
            detail=exc.detail,
            path=str(request.url),
        )
        return ORJSONResponse(
            status_code=exc.status_code,
            content={
                "type": exc.error_type,
                "title": exc.title,
                "status": exc.status_code,
                "detail": exc.detail,
                "instance": str(request.url.path),
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> ORJSONResponse:
        return ORJSONResponse(
            status_code=exc.status_code,
            content={
                "type": "http_error",
                "title": exc.detail,
                "status": exc.status_code,
                "detail": exc.detail,
                "instance": str(request.url.path),
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> ORJSONResponse:
        errors = []
        for error in exc.errors():
            loc = ".".join(str(part) for part in error["loc"])
            errors.append(
                {
                    "field": loc,
                    "message": error["msg"],
                    "code": error["type"],
                }
            )
        return ORJSONResponse(
            status_code=422,
            content={
                "type": "validation_error",
                "title": "Validation Error",
                "status": 422,
                "detail": "Request validation failed.",
                "instance": str(request.url.path),
                "errors": errors,
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> ORJSONResponse:
        logger.exception(
            "unhandled_error",
            error=str(exc),
            path=str(request.url),
        )
        return ORJSONResponse(
            status_code=500,
            content={
                "type": "internal_error",
                "title": "Internal Server Error",
                "status": 500,
                "detail": "An unexpected error occurred.",
                "instance": str(request.url.path),
            },
        )
