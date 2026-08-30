"""Vector Store — pgvector Similarity Search Service."""

from __future__ import annotations

from typing import Any

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger()


class VectorSearchService:
    """Executes HNSW similarity search on PostgreSQL pgvector columns."""

    ALLOWED_TABLES = frozenset({"startup_profiles", "opportunities"})

    async def search_similar(
        self,
        session: AsyncSession,
        table_name: str,
        query_vector: list[float],
        top_k: int = 10,
        filters: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Search similar records using cosine distance <=> operator."""
        if table_name not in self.ALLOWED_TABLES:
            raise ValueError(f"Table '{table_name}' is not supported for vector search.")

        vector_str = "[" + ",".join(str(x) for x in query_vector) + "]"

        # SQL query using cosine distance (<=>)
        # Cosine similarity = 1 - cosine_distance
        sql = f"""
            SELECT id,
                   1 - (embedding <=> :vector::vector) AS similarity
            FROM {table_name}
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> :vector::vector
            LIMIT :limit
        """

        result = await session.execute(
            text(sql),
            {"vector": vector_str, "limit": top_k},
        )
        rows = result.fetchall()

        return [
            {
                "id": row.id,
                "similarity_score": round(float(row.similarity), 4),
            }
            for row in rows
        ]
