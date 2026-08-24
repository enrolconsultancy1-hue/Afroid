"""Afroid Platform — End-to-End Integration Test Suite.

Validates the 3 core platform flows specified in ARCHITECTURE.md:
1. Idea -> Production Code (geezcodE IDE & Orchestration)
2. Code -> Certification (Afroid Certify & Compliance)
3. Profile -> Funding Match (Afroid Incubate & Vector Store)
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

workspace_root = Path(__file__).resolve().parent.parent
if str(workspace_root) not in sys.path:
    sys.path.insert(0, str(workspace_root))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


class EndToEndIntegrationTest:
    """Executes the 3 master architectural data flows."""

    def __init__(self) -> None:
        self.passed = 0
        self.failed = 0

    def _log(self, name: str, passed: bool, detail: str = "") -> None:
        if passed:
            self.passed += 1
            print(f"  [PASS] {name} {f'({detail})' if detail else ''}")
        else:
            self.failed += 1
            print(f"  [FAIL] {name} -- {detail}")

    async def run_all(self) -> bool:
        print("\n" + "=" * 70)
        print("AFROID E2E INTEGRATION TEST -- 3 MASTER ARCHITECTURAL FLOWS")
        print("=" * 70 + "\n")

        await self.test_flow_1_idea_to_code()
        await self.test_flow_2_code_to_certification()
        await self.test_flow_3_profile_to_funding()

        print("\n" + "=" * 70)
        print(f"E2E RESULTS: {self.passed} PASSED | {self.failed} FAILED")
        print("=" * 70 + "\n")
        return self.failed == 0

    async def test_flow_1_idea_to_code(self) -> None:
        print("\n[FLOW 1] Testing Idea -> Production Code (geezcodE Multi-Agent Swarm)...")
        from services.orchestrator.app.agents.parallel_builder import ZeroQuestionIntakeEngine

        engine = ZeroQuestionIntakeEngine()
        blueprint = engine.offline_blueprint("Autonomous Micro-lending platform for smallholder farmers in East Africa")
        
        has_blueprint = blueprint is not None and len(blueprint.core_modules) > 0
        self._log("Zero-Question Architecture Blueprint Generation", has_blueprint, f"Modules: {len(blueprint.core_modules)}")

        from services.codegen.app.engine.generator import CodeGenEngine
        codegen = CodeGenEngine()
        file_res = await codegen.generate_file(
            path="services/lending/main.py",
            description="Micro-lending FastAPI service",
            language="python",
            template_name="fastapi_main",
            context={"project_name": "AgroLend", "service_name": "lending", "description": "Lending API", "routes": []},
        )
        self._log("Multi-Agent Code Generation & AST Validation", file_res["syntax_valid"], f"Syntax Valid: {file_res['syntax_valid']}")

    async def test_flow_2_code_to_certification(self) -> None:
        print("\n[FLOW 2] Testing Code -> Certification (Afroid Certify & RegTech)...")
        from services.certify.app.engine.compliance import ComplianceEngine, AuditTrail
        from services.certify.app.engine.ip_verifier import IPVerifier

        # IP Verification
        verifier = IPVerifier()
        ip_res = verifier.check_originality("Decentralized micro-lending smart contract engine.", [])
        self._log("IP Originality Verification", ip_res["verdict"] == "original", f"Score: {ip_res['originality_score'] * 100}%")

        # Compliance Engine
        engine = ComplianceEngine()
        profile = {
            "legal_name": "AgroLend Technologies Ltd",
            "country": "kenya",
            "technologies": ["Python", "FastAPI", "React", "pgvector"],
            "jobs_created": 12,
            "documents": {"tax_id": "TIN-KENYA-9988"},
        }
        res = engine.run_certification("kenya", profile)
        self._log("Kenya Startup Bill Compliance Audit", res["status"] == "passed", f"Score: {res['score']}%")

        # Immutable Audit Trail
        audit = AuditTrail()
        audit.add_entry("certification_issued", "founder-1", {"cert": "CERT-KENYA-001"})
        self._log("Cryptographic SHA-256 Audit Trail Chain", audit.verify_chain())

    async def test_flow_3_profile_to_funding(self) -> None:
        print("\n[FLOW 3] Testing Profile -> Funding Match (Afroid Incubate & Vector Matcher)...")
        from services.incubate.app.engine.matching import MatchingEngine
        from services.incubate.app.engine.autofill import AutofillEngine

        matching = MatchingEngine()
        profile = {
            "company_name": "AgroLend",
            "industry": "agritech",
            "stage": "mvp",
            "country": "kenya",
            "region": "east africa",
        }
        opp = {
            "title": "East Africa Agricultural Resilience Grant",
            "funder": "Alliance for Green Revolution",
            "funding_type": "Grant",
            "eligible_regions": ["Kenya", "Uganda", "Tanzania"],
            "eligible_sectors": ["Agritech", "Fintech"],
            "eligible_stages": ["MVP", "Seed"],
        }
        match_res = matching.score_match(profile, opp)
        self._log("Semantic Vector Matching & Eligibility", match_res["eligibility_passed"], f"Similarity: {match_res['similarity_score']}")

        autofill = AutofillEngine()
        fields = [{"field_name": "Applicant Organization Name"}, {"field_name": "Sector"}]
        auto_res = autofill.autofill(profile, fields)
        self._log("AI Form Autofill & Grant Composer", len(auto_res["filled_fields"]) == 2, f"Confidence: {auto_res['overall_confidence'] * 100}%")


if __name__ == "__main__":
    test_runner = EndToEndIntegrationTest()
    success = asyncio.run(test_runner.run_all())
    sys.exit(0 if success else 1)
