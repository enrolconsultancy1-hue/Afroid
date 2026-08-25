"""Unit tests for the Certify compliance engine, IP verifier, and audit trail."""

from __future__ import annotations

import pytest

from services.certify.app.engine.compliance import AuditTrail, ComplianceEngine
from services.certify.app.engine.ip_verifier import IPVerifier


class TestComplianceEngine:
    """Tests for compliance verification rules across African jurisdictions."""

    @pytest.fixture
    def engine(self) -> ComplianceEngine:
        return ComplianceEngine()

    @pytest.fixture
    def valid_nigerian_profile(self) -> dict:
        return {
            "legal_name": "AfroTech Logistics Ltd",
            "country": "nigeria",
            "technologies": ["Python", "FastAPI", "React", "pgvector"],
            "jobs_created": 8,
            "documents": {"tax_id": "TIN-987654321"},
        }

    def test_nigeria_compliance_pass(
        self, engine: ComplianceEngine, valid_nigerian_profile: dict
    ) -> None:
        result = engine.run_certification("nigeria", valid_nigerian_profile)
        assert result["jurisdiction"] == "nigeria"
        assert result["status"] == "passed"
        assert result["score"] == 100.0
        assert len(result["rules"]) == 6

    def test_missing_legal_name_fails(
        self, engine: ComplianceEngine, valid_nigerian_profile: dict
    ) -> None:
        valid_nigerian_profile["legal_name"] = ""
        result = engine.run_certification("nigeria", valid_nigerian_profile)
        assert result["status"] == "failed"
        failed_rules = [r for r in result["rules"] if r["status"] == "failed"]
        assert any(r["rule_id"] == "REG-001" for r in failed_rules)

    def test_missing_tax_id_conditional(
        self, engine: ComplianceEngine, valid_nigerian_profile: dict
    ) -> None:
        valid_nigerian_profile["documents"] = {}
        result = engine.run_certification("nigeria", valid_nigerian_profile)
        assert result["status"] == "conditional"

    def test_unsupported_jurisdiction(self, engine: ComplianceEngine) -> None:
        result = engine.run_certification("unknown_country", {})
        assert result["status"] == "unsupported"
        assert result["score"] == 0


class TestIPVerifier:
    """Tests for IP originality and similarity detection."""

    @pytest.fixture
    def verifier(self) -> IPVerifier:
        return IPVerifier(num_perm=128, shingle_size=5)

    def test_exact_duplicate_detection(self, verifier: IPVerifier) -> None:
        source_text = "Afroid provides an automated sovereign startup factory platform."
        corpus = [{"id": "doc-1", "text": source_text, "source": "existing_startup"}]

        result = verifier.check_originality(source_text, corpus)
        assert result["originality_score"] <= 0.1
        assert result["verdict"] == "high_similarity"
        assert len(result["matches"]) == 1

    def test_unique_text_high_originality(self, verifier: IPVerifier) -> None:
        text = "Unique novel decentralized solar powered agricultural irrigation network in the Sahel region."
        corpus = [
            {"id": "doc-1", "text": "Cryptocurrency exchange platform for trading digital coins."}
        ]

        result = verifier.check_originality(text, corpus)
        assert result["originality_score"] >= 0.8
        assert result["verdict"] == "original"

    def test_batch_check(self, verifier: IPVerifier) -> None:
        texts = {
            "problem": "Lack of efficient cross-border payments for rural agricultural cooperatives.",
            "solution": "Decentralized liquidity routing mechanism using smart contract escrow.",
        }
        report = verifier.batch_check(texts, [])
        assert report["overall_score"] == 1.0
        assert report["fields_checked"] == 2
        assert report["verdict"] == "original"


class TestAuditTrail:
    """Tests for tamper-proof hash-chained audit trail."""

    def test_audit_chain_integrity(self) -> None:
        audit = AuditTrail()
        audit.add_entry("job_created", "user-1", {"project": "Alpha"})
        audit.add_entry("compliance_checked", "system", {"score": 95})
        audit.add_entry("certificate_issued", "user-1", {"cert_id": "CERT-123"})

        assert len(audit.get_entries()) == 3
        assert audit.verify_chain() is True

    def test_tamper_detection(self) -> None:
        audit = AuditTrail()
        audit.add_entry("step_1", "user-1", {"data": "A"})
        audit.add_entry("step_2", "user-1", {"data": "B"})

        # Tamper with internal data
        audit._chain[0]["data"] = {"data": "TAMPERED"}
        assert audit.verify_chain() is False
