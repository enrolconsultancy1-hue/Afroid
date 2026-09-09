"""Embedding generation and vector storage service using Google GenAI + pgvector."""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Generates embeddings via Google Generative AI and stores them in pgvector."""

    def __init__(self, db: AsyncSession, api_key: str) -> None:
        self._db = db
        self._api_key = api_key

    async def _generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Generate embedding vectors for a list of texts using langchain-google-genai."""
        from langchain_google_genai import GoogleGenerativeAIEmbeddings

        embeddings_model = GoogleGenerativeAIEmbeddings(
            model="models/text-embedding-004",
            google_api_key=self._api_key,
        )
        vectors = await embeddings_model.aembed_documents(texts)
        return vectors

    async def embed_and_store(
        self,
        texts: list[str],
        metadata: dict[str, Any] | None = None,
        namespace: str = "default",
    ) -> list[UUID]:
        """Generate embeddings and store them in the vectors table."""
        vectors = await self._generate_embeddings(texts)
        ids: list[UUID] = []

        for text_chunk, vector in zip(texts, vectors, strict=True):
            vector_id = uuid4()
            ids.append(vector_id)

            await self._db.execute(
                text(
                    """
                    INSERT INTO vectors (id, namespace, text_content, embedding, metadata)
                    VALUES (:id, :namespace, :text_content, :embedding, :metadata)
                    """
                ),
                {
                    "id": str(vector_id),
                    "namespace": namespace,
                    "text_content": text_chunk,
                    "embedding": str(vector),
                    "metadata": metadata or {},
                },
            )

        logger.info("Stored %d vectors in namespace '%s'", len(ids), namespace)
        return ids

    async def delete_vectors(
        self,
        ids: list[UUID] | None = None,
        namespace: str | None = None,
    ) -> int:
        """Delete vectors by ID list or by namespace."""
        if ids:
            result = await self._db.execute(
                text("DELETE FROM vectors WHERE id = ANY(:ids)"),
                {"ids": [str(i) for i in ids]},
            )
            return result.rowcount  # type: ignore[return-value]

        if namespace:
            result = await self._db.execute(
                text("DELETE FROM vectors WHERE namespace = :namespace"),
                {"namespace": namespace},
            )
            return result.rowcount  # type: ignore[return-value]

        return 0
