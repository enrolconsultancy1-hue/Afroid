"""Shared Pydantic schemas for pagination, errors, and health checks."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

# --- Pagination ---


class PaginationParams(BaseModel):
    """Query parameters for cursor-based pagination."""

    cursor: str | None = None
    limit: int = Field(default=20, ge=1, le=100)


class PaginatedResponse[T](BaseModel):
    """Standard paginated response envelope."""

    data: list[T]
    meta: PaginationMeta


class PaginationMeta(BaseModel):
    """Pagination metadata."""

    cursor: str | None = None
    has_more: bool = False
    total: int | None = None


# --- Errors (RFC 7807) ---


class ErrorDetail(BaseModel):
    """Individual field-level error."""

    field: str
    message: str
    code: str


class ErrorResponse(BaseModel):
    """RFC 7807 Problem Details error response."""

    type: str = "about:blank"
    title: str
    status: int
    detail: str
    instance: str | None = None
    errors: list[ErrorDetail] | None = None


# --- Health Check ---


class HealthCheck(BaseModel):
    """Service health check response."""

    status: str = "healthy"
    service: str
    version: str = "1.0.0"
    checks: dict[str, Any] = Field(default_factory=dict)


# --- Generic API Response ---


class ApiResponse[T](BaseModel):
    """Standard API response envelope."""

    data: T
    meta: dict[str, Any] | None = None
