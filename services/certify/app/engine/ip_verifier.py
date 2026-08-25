"""Certify Service — IP Originality Verification using MinHash/SimHash."""

from __future__ import annotations

import hashlib
import re
from typing import Any

import structlog

logger = structlog.get_logger()


class IPVerifier:
    """Intellectual property originality verification engine.

    Uses character-level n-gram shingling + MinHash for similarity detection.
    Falls back to a simple Jaccard approximation when datasketch is unavailable.
    """

    def __init__(self, num_perm: int = 128, shingle_size: int = 5) -> None:
        self.num_perm = num_perm
        self.shingle_size = shingle_size
        self._corpus_hashes: list[dict[str, Any]] = []

    def _normalize(self, text: str) -> str:
        """Normalize text for comparison."""
        text = text.lower().strip()
        text = re.sub(r"\s+", " ", text)
        text = re.sub(r"[^\w\s]", "", text)
        return text

    def _shingle(self, text: str) -> set[str]:
        """Create character n-gram shingles from text."""
        text = self._normalize(text)
        if len(text) < self.shingle_size:
            return {text}
        return {text[i : i + self.shingle_size] for i in range(len(text) - self.shingle_size + 1)}

    def _jaccard_similarity(self, set_a: set[str], set_b: set[str]) -> float:
        """Compute Jaccard similarity between two shingle sets."""
        if not set_a or not set_b:
            return 0.0
        intersection = len(set_a & set_b)
        union = len(set_a | set_b)
        return intersection / union if union > 0 else 0.0

    def _minhash_similarity(self, text_a: str, text_b: str) -> float:
        """Use MinHash for approximate similarity if datasketch is available."""
        try:
            from datasketch import MinHash

            shingles_a = self._shingle(text_a)
            shingles_b = self._shingle(text_b)

            m1 = MinHash(num_perm=self.num_perm)
            for s in shingles_a:
                m1.update(s.encode("utf-8"))

            m2 = MinHash(num_perm=self.num_perm)
            for s in shingles_b:
                m2.update(s.encode("utf-8"))

            return m1.jaccard(m2)
        except ImportError:
            shingles_a = self._shingle(text_a)
            shingles_b = self._shingle(text_b)
            return self._jaccard_similarity(shingles_a, shingles_b)

    def check_originality(
        self,
        text: str,
        corpus: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        """Check a text's originality against a corpus.

        Args:
            text: The text to check (problem statement, solution description, etc.)
            corpus: List of {"id": ..., "text": ...} documents to compare against.

        Returns:
            Originality report with score, matches, and verdict.
        """
        if corpus is None:
            corpus = []

        if not text.strip():
            return {
                "originality_score": 0.0,
                "verdict": "empty",
                "detail": "No text provided for analysis.",
                "matches": [],
            }

        matches: list[dict[str, Any]] = []
        max_similarity = 0.0

        for doc in corpus:
            similarity = self._minhash_similarity(text, doc.get("text", ""))
            if similarity > 0.3:
                matches.append(
                    {
                        "doc_id": doc.get("id", "unknown"),
                        "similarity": round(similarity, 4),
                        "source": doc.get("source", "corpus"),
                    }
                )
            max_similarity = max(max_similarity, similarity)

        originality_score = round(1.0 - max_similarity, 4)

        if originality_score >= 0.8:
            verdict = "original"
        elif originality_score >= 0.5:
            verdict = "mostly_original"
        elif originality_score >= 0.3:
            verdict = "moderate_overlap"
        else:
            verdict = "high_similarity"

        matches.sort(key=lambda m: m["similarity"], reverse=True)

        return {
            "originality_score": originality_score,
            "verdict": verdict,
            "detail": f"Originality: {originality_score * 100:.1f}%. {len(matches)} similar documents found.",
            "matches": matches[:10],
            "text_hash": hashlib.sha256(text.encode()).hexdigest(),
        }

    def batch_check(
        self,
        texts: dict[str, str],
        corpus: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        """Check multiple text fields for originality.

        Args:
            texts: Dict of {"field_name": "text_value"} to check.
            corpus: Comparison corpus.

        Returns:
            Aggregated report with per-field results.
        """
        results: dict[str, Any] = {}
        total_score = 0.0
        count = 0

        for field_name, text in texts.items():
            if text and text.strip():
                result = self.check_originality(text, corpus)
                results[field_name] = result
                total_score += result["originality_score"]
                count += 1

        avg_score = total_score / count if count > 0 else 0.0

        return {
            "overall_score": round(avg_score, 4),
            "fields_checked": count,
            "field_results": results,
            "verdict": "original"
            if avg_score >= 0.8
            else "needs_review"
            if avg_score >= 0.5
            else "flagged",
        }
