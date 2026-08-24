"""Unit tests for the Vector Store embedding and search services."""

from __future__ import annotations

import pytest

import importlib

embedding_module = importlib.import_module("services.vector-store.app.services.embedding_service")
EmbeddingService = embedding_module.EmbeddingService


@pytest.mark.asyncio
class TestEmbeddingService:
    """Tests for vector embedding generation and caching."""

    @pytest.fixture
    def service(self) -> EmbeddingService:
        return EmbeddingService()

    async def test_embed_texts_returns_768_dim(self, service: EmbeddingService) -> None:
        texts = ["Agritech startup in East Africa", "Fintech mobile payment API"]
        embeddings = await service.embed_texts(texts)

        assert len(embeddings) == 2
        for emb in embeddings:
            assert len(emb) == 768
            assert all(isinstance(x, float) for x in emb)

    async def test_embed_caching(self, service: EmbeddingService) -> None:
        text = "Repeated text query for cache verification"
        emb1 = await service.embed_texts([text])
        emb2 = await service.embed_texts([text])

        assert emb1[0] == emb2[0]
