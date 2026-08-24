"""Vector Store — Embedding Generation Service."""

from __future__ import annotations

import hashlib
from typing import Any

import structlog
from ..config import settings

logger = structlog.get_logger()


class EmbeddingService:
    """Generates vector embeddings using Google Generative AI embeddings model."""

    def __init__(self) -> None:
        self._embedder: Any = None
        self._cache: dict[str, list[float]] = {}

    def _get_embedder(self) -> Any:
        if self._embedder is None:
            try:
                from langchain_google_genai import GoogleGenerativeAIEmbeddings
                self._embedder = GoogleGenerativeAIEmbeddings(
                    model=settings.embedding_model,
                )
            except ImportError:
                return None
        return self._embedder

    def _hash_text(self, text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Generate 768-dim embeddings for a list of text strings with caching."""
        uncached_indices: list[int] = []
        uncached_texts: list[str] = []
        results: list[list[float] | None] = [None] * len(texts)

        for i, text in enumerate(texts):
            h = self._hash_text(text)
            if h in self._cache:
                results[i] = self._cache[h]
            else:
                uncached_indices.append(i)
                uncached_texts.append(text)

        if uncached_texts:
            try:
                embedder = self._get_embedder()
                new_embeddings = await embedder.aembed_documents(uncached_texts)
                for idx, emb, txt in zip(uncached_indices, new_embeddings, uncached_texts):
                    results[idx] = emb
                    self._cache[self._hash_text(txt)] = emb
            except Exception as e:
                logger.warning("embedding_api_fallback", error=str(e))
                # Fallback deterministic pseudo-embedding for testing or fallback
                for idx, txt in zip(uncached_indices, uncached_texts):
                    pseudo_emb = self._generate_pseudo_embedding(txt)
                    results[idx] = pseudo_emb
                    self._cache[self._hash_text(txt)] = pseudo_emb

        return [r for r in results if r is not None]

    def _generate_pseudo_embedding(self, text: str) -> list[float]:
        """Generate deterministic normalized 768-dim vector from text hash (fallback)."""
        import math
        h = hashlib.sha512(text.encode()).digest()
        vec = []
        for i in range(768):
            byte_val = h[i % len(h)]
            vec.append((float(byte_val) / 255.0) - 0.5)
        norm = math.sqrt(sum(x * x for x in vec))
        return [x / norm for x in vec] if norm > 0 else vec
