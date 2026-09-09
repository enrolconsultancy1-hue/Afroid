"""Pydantic schemas for the Vector Store service."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


# --- Embed ---

class EmbedRequest(BaseModel):
    """Request to generate and store embeddings."""

    texts: list[str] = Field(..., min_length=1, description="Text chunks to embed.")
    metadata: dict[str, Any] | None = Field(default=None, description="Shared metadata for all chunks.")
    namespace: str = Field(default="default", description="Logical namespace for grouping vectors.")


class EmbedResponse(BaseModel):
    """Response after embedding storage."""

    stored_count: int
    ids: list[UUID]


# --- Search ---

class SearchRequest(BaseModel):
    """Similarity search request."""

    query: str = Field(..., min_length=1, description="Natural-language query to search against.")
    namespace: str = Field(default="default", description="Namespace to search within.")
    top_k: int | None = Field(default=None, ge=1, le=100, description="Max results to return.")
    threshold: float | None = Field(default=None, ge=0.0, le=1.0, description="Minimum similarity score.")


class SearchResult(BaseModel):
    """A single search result."""

    id: UUID
    text: str
    score: float
    metadata: dict[str, Any] | None = None


class SearchResponse(BaseModel):
    """Similarity search response."""

    results: list[SearchResult]
    total: int


# --- Delete ---

class DeleteRequest(BaseModel):
    """Request to delete vectors."""

    ids: list[UUID] | None = Field(default=None, description="Specific vector IDs to delete.")
    namespace: str | None = Field(default=None, description="Delete all vectors in this namespace.")


class DeleteResponse(BaseModel):
    """Delete confirmation."""

    deleted_count: int
