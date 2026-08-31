"""Vector Store Service — API Routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from services.shared.auth_middleware import get_current_user
from services.shared.user_models import User

from ..schemas.vector import (
    EmbedTextRequest,
    EmbedTextResponse,
    VectorSearchRequest,
    VectorSearchResponse,
    VectorSearchResultItem,
)
from ..services.embedding_service import EmbeddingService
from ..services.search_service import VectorSearchService

router = APIRouter(prefix="/vector", tags=["vector"])

embedding_service = EmbeddingService()
search_service = VectorSearchService()


def _get_session(request: Request) -> AsyncSession:
    return request.state.db_session


@router.post("/embed", response_model=EmbedTextResponse)
async def embed_texts(
    body: EmbedTextRequest,
    current_user: User = Depends(get_current_user),
) -> EmbedTextResponse:
    """Generate dense 768-dim embeddings for text strings."""
    embeddings = await embedding_service.embed_texts(body.texts)
    dim = len(embeddings[0]) if embeddings else 768
    return EmbedTextResponse(
        embeddings=embeddings,
        dimension=dim,
        count=len(embeddings),
    )


@router.post("/search", response_model=VectorSearchResponse)
async def search_vectors(
    request: Request,
    body: VectorSearchRequest,
    current_user: User = Depends(get_current_user),
) -> VectorSearchResponse:
    """Execute cosine similarity vector search over pgvector tables."""
    session = _get_session(request)

    query_vec = body.query_vector
    if query_vec is None and body.query_text:
        embs = await embedding_service.embed_texts([body.query_text])
        query_vec = embs[0]

    if query_vec is None:
        return VectorSearchResponse(collection=body.collection, total_results=0, results=[])

    raw_results = await search_service.search_similar(
        session=session,
        table_name=body.collection,
        query_vector=query_vec,
        top_k=body.top_k,
        filters=body.filter_criteria,
    )

    items = [
        VectorSearchResultItem(
            id=r["id"],
            similarity_score=r["similarity_score"],
        )
        for r in raw_results
    ]

    return VectorSearchResponse(
        collection=body.collection,
        total_results=len(items),
        results=items,
    )
