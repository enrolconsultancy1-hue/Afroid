"""Vector Store API routes — embed, search, and manage document vectors."""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from services.vector_store.app.schemas.vector import (
    EmbedRequest,
    EmbedResponse,
    SearchRequest,
    SearchResponse,
    SearchResult,
    DeleteRequest,
    DeleteResponse,
)
from services.vector_store.app.services.embedding_service import EmbeddingService
from services.vector_store.app.services.search_service import SearchService
from services.vector_store.app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vector", tags=["vector"])


def _get_db(request: Request) -> AsyncSession:
    return request.state.db_session


@router.post("/embed", response_model=EmbedResponse, status_code=status.HTTP_201_CREATED)
async def embed_documents(
    payload: EmbedRequest,
    db: AsyncSession = Depends(_get_db),
) -> EmbedResponse:
    """Generate embeddings for one or more text chunks and store them."""
    svc = EmbeddingService(db=db, api_key=settings.google_api_key)
    stored_ids = await svc.embed_and_store(
        texts=payload.texts,
        metadata=payload.metadata,
        namespace=payload.namespace,
    )
    return EmbedResponse(
        stored_count=len(stored_ids),
        ids=stored_ids,
    )


@router.post("/search", response_model=SearchResponse)
async def search_similar(
    payload: SearchRequest,
    db: AsyncSession = Depends(_get_db),
) -> SearchResponse:
    """Find documents most similar to the query text."""
    search_svc = SearchService(db=db, api_key=settings.google_api_key)
    results = await search_svc.similarity_search(
        query=payload.query,
        namespace=payload.namespace,
        top_k=payload.top_k or settings.max_results,
        threshold=payload.threshold or settings.similarity_threshold,
    )
    return SearchResponse(
        results=[
            SearchResult(
                id=r["id"],
                text=r["text"],
                score=r["score"],
                metadata=r.get("metadata"),
            )
            for r in results
        ],
        total=len(results),
    )


@router.delete("/delete", response_model=DeleteResponse)
async def delete_vectors(
    payload: DeleteRequest,
    db: AsyncSession = Depends(_get_db),
) -> DeleteResponse:
    """Delete stored vectors by ID or namespace."""
    svc = EmbeddingService(db=db, api_key=settings.google_api_key)
    deleted = await svc.delete_vectors(
        ids=payload.ids,
        namespace=payload.namespace,
    )
    return DeleteResponse(deleted_count=deleted)
