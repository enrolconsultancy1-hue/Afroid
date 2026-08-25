"""Certify Service — Compliance rule engine for African Startup Acts."""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import UTC, datetime
from typing import Any

import structlog

logger = structlog.get_logger()


class RuleResult:
    """Result of a single compliance rule check."""

    __slots__ = ("rule_id", "rule_name", "status", "detail", "severity", "evidence")

    def __init__(
        self,
        rule_id: str,
        rule_name: str,
        status: str,
        detail: str,
        severity: str = "required",
        evidence: dict | None = None,
    ) -> None:
        self.rule_id = rule_id
        self.rule_name = rule_name
        self.status = status
        self.detail = detail
        self.severity = severity
        self.evidence = evidence or {}

    def to_dict(self) -> dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "rule_name": self.rule_name,
            "status": self.status,
            "detail": self.detail,
            "severity": self.severity,
            "evidence": self.evidence,
        }


class ComplianceEngine:
    """Rule-based compliance verification engine."""

    def __init__(self) -> None:
        self._rules: dict[str, list[callable]] = {}
        self._register_default_rules()

    def _register_default_rules(self) -> None:
        """Register rules for supported jurisdictions."""
        self._rules["nigeria"] = [
            self._check_business_registration,
            self._check_data_residency,
            self._check_tax_compliance,
            self._check_local_ownership,
            self._check_innovation_criteria,
            self._check_job_creation,
        ]
        self._rules["kenya"] = [
            self._check_business_registration,
            self._check_data_residency,
            self._check_tax_compliance,
            self._check_local_ownership,
            self._check_innovation_criteria,
        ]
        self._rules["ethiopia"] = [
            self._check_business_registration,
            self._check_data_residency,
            self._check_local_ownership,
        ]
        self._rules["au"] = [
            self._check_data_residency,
            self._check_innovation_criteria,
            self._check_job_creation,
        ]

    def run_certification(
        self,
        jurisdiction: str,
        profile: dict[str, Any],
    ) -> dict[str, Any]:
        """Run all rules for a jurisdiction against a startup profile."""
        rules = self._rules.get(jurisdiction, [])
        if not rules:
            return {
                "jurisdiction": jurisdiction,
                "status": "unsupported",
                "score": 0,
                "rules": [],
            }

        results: list[RuleResult] = []
        for rule_fn in rules:
            result = rule_fn(profile, jurisdiction)
            results.append(result)

        passed = sum(1 for r in results if r.status == "passed")
        total = len(results)
        score = (passed / total * 100) if total > 0 else 0

        status = "passed"
        if any(r.status == "failed" and r.severity == "required" for r in results):
            status = "failed"
        elif any(r.status == "conditional" for r in results):
            status = "conditional"

        return {
            "jurisdiction": jurisdiction,
            "status": status,
            "score": round(score, 2),
            "rules": [r.to_dict() for r in results],
            "timestamp": datetime.now(UTC).isoformat(),
        }

    # --- Rule implementations ---

    def _check_business_registration(self, profile: dict, jurisdiction: str) -> RuleResult:
        legal_name = profile.get("legal_name")
        if legal_name and len(legal_name) >= 3:
            return RuleResult("REG-001", "Business Registration", "passed", "Legal entity name verified.", evidence={"legal_name": legal_name})
        return RuleResult("REG-001", "Business Registration", "failed", "Legal entity name not provided.", severity="required")

    def _check_data_residency(self, profile: dict, jurisdiction: str) -> RuleResult:
        country = profile.get("country", "").lower()
        region_map = {"nigeria": ["nigeria"], "kenya": ["kenya"], "ethiopia": ["ethiopia"], "au": ["nigeria", "kenya", "ethiopia", "south africa", "ghana", "egypt", "morocco", "tanzania", "rwanda", "senegal"]}
        valid_regions = region_map.get(jurisdiction, [])
        if country in valid_regions:
            return RuleResult("DATA-001", "Data Residency", "passed", f"Operations based in {country.title()}.", evidence={"country": country})
        return RuleResult("DATA-001", "Data Residency", "conditional", f"Country '{country}' may require data residency review.", severity="recommended")

    def _check_tax_compliance(self, profile: dict, jurisdiction: str) -> RuleResult:
        documents = profile.get("documents", {})
        if documents.get("tax_id") or documents.get("tin"):
            return RuleResult("TAX-001", "Tax Compliance", "passed", "Tax identification document found.")
        return RuleResult("TAX-001", "Tax Compliance", "conditional", "Tax ID not provided. Required for certification.", severity="required")

    def _check_local_ownership(self, profile: dict, jurisdiction: str) -> RuleResult:
        country = profile.get("country", "").lower()
        region_map = {"nigeria": ["nigeria"], "kenya": ["kenya"], "ethiopia": ["ethiopia"]}
        valid = region_map.get(jurisdiction, [])
        if country in valid:
            return RuleResult("OWN-001", "Local Ownership", "passed", "Founders based in jurisdiction.")
        return RuleResult("OWN-001", "Local Ownership", "conditional", "Founder location may need verification.", severity="recommended")

    def _check_innovation_criteria(self, profile: dict, jurisdiction: str) -> RuleResult:
        tech = profile.get("technologies", [])
        if len(tech) >= 1:
            return RuleResult("INNOV-001", "Innovation Criteria", "passed", f"Technology stack: {', '.join(tech[:5])}.", evidence={"technologies": tech})
        return RuleResult("INNOV-001", "Innovation Criteria", "conditional", "Technology stack not detailed.", severity="recommended")

    def _check_job_creation(self, profile: dict, jurisdiction: str) -> RuleResult:
        jobs = profile.get("jobs_created", 0)
        if jobs >= 5:
            return RuleResult("JOBS-001", "Job Creation", "passed", f"{jobs} jobs created.", evidence={"jobs_created": jobs})
        if jobs >= 1:
            return RuleResult("JOBS-001", "Job Creation", "conditional", f"Only {jobs} jobs created. Minimum 5 recommended.")
        return RuleResult("JOBS-001", "Job Creation", "conditional", "No jobs reported yet.", severity="recommended")


class AuditTrail:
    """Hash-chained audit trail for certification events."""

    def __init__(self) -> None:
        self._chain: list[dict[str, Any]] = []

    def add_entry(
        self,
        event_type: str,
        actor_id: str,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        """Add an entry to the audit chain. Each entry's hash includes the previous hash."""
        prev_hash = self._chain[-1]["hash"] if self._chain else "0" * 64

        entry = {
            "id": str(uuid.uuid4()),
            "event_type": event_type,
            "actor_id": actor_id,
            "data": data,
            "timestamp": datetime.now(UTC).isoformat(),
            "prev_hash": prev_hash,
        }

        payload = json.dumps(entry, sort_keys=True, default=str)
        entry["hash"] = hashlib.sha256(payload.encode()).hexdigest()
        self._chain.append(entry)
        return entry

    def verify_chain(self) -> bool:
        """Verify the integrity of the audit chain."""
        for i, entry in enumerate(self._chain):
            if i == 0:
                if entry["prev_hash"] != "0" * 64:
                    return False
            else:
                if entry["prev_hash"] != self._chain[i - 1]["hash"]:
                    return False

            stored_hash = entry["hash"]
            entry_copy = {k: v for k, v in entry.items() if k != "hash"}
            payload = json.dumps(entry_copy, sort_keys=True, default=str)
            computed_hash = hashlib.sha256(payload.encode()).hexdigest()
            if computed_hash != stored_hash:
                return False

        return True

    def get_entries(self) -> list[dict[str, Any]]:
        return list(self._chain)
