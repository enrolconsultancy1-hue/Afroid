"""Similarity search service using pgvector cosine distance."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class SearchService:
    """Performs similarity search against stored vectors using pgvector."""

    def __init__(self, db: AsyncSession, api_key: str) -> None:
        self._db = db
        self._api_key = api_key

    async def _embed_query(self, query: str) -> list[float]:
        """Generate an embedding vector for a single query string."""
        from langchain_google_genai import GoogleGenerativeAIEmbeddings

        embeddings_model = GoogleGenerativeAIEmbeddings(
            model="models/text-embedding-004",
            google_api_key=self._api_key,
        )
        vector = await embeddings_model.aembed_query(query)
        return vector

    async def similarity_search(
        self,
        query: str,
        namespace: str = "default",
        top_k: int = 20,
        threshold: float = 0.70,
    ) -> list[dict[str, Any]]:
        """Find the top-k most similar vectors to the query within a namespace."""
        query_vector = await self._embed_query(query)

        rows = await self._db.execute(
            text(
                """
                SELECT id, text_content, metadata,
                       1 - (embedding <=> :query_vec::vector) AS score
                FROM vectors
                WHERE namespace = :namespace
                  AND 1 - (embedding <=> :query_vec::vector) >= :threshold
                ORDER BY embedding <=> :query_vec::vector
                LIMIT :top_k
                """
            ),
            {
                "query_vec": str(query_vector),
                "namespace": namespace,
                "threshold": threshold,
                "top_k": top_k,
            },
        )

        results: list[dict[str, Any]] = []
        for row in rows:
            results.append(
                {
                    "id": row.id,
                    "text": row.text_content,
                    "score": float(row.score),
                    "metadata": row.metadata,
                }
            )

        logger.info(
            "Search in namespace '%s' returned %d results (threshold=%.2f)",
            namespace,
            len(results),
            threshold,
        )
        return results
