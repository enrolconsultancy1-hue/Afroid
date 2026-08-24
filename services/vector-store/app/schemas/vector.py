"""Vector Store Service — Pydantic Schemas."""

from __future__ import annotations

import uuid
from typing import Any

from pydantic import BaseModel, Field


class EmbedTextRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=64)


class EmbedTextResponse(BaseModel):
    embeddings: list[list[float]]
    dimension: int
    count: int


class VectorSearchRequest(BaseModel):
    collection: str = Field(..., description="'startup_profiles' or 'opportunities'")
    query_text: str | None = None
    query_vector: list[float] | None = None
    top_k: int = Field(default=10, ge=1, le=100)
    filter_criteria: dict[str, Any] = {}


class VectorSearchResultItem(BaseModel):
    id: uuid.UUID
    similarity_score: float
    metadata: dict[str, Any] = {}


class VectorSearchResponse(BaseModel):
    collection: str
    total_results: int
    results: list[VectorSearchResultItem]
