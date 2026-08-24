#!/usr/bin/env python3
"""Afroid Sovereign Startup Factory — Developer & Operations CLI.

Unified command-line interface to manage, test, seed, and operate the platform:
- afroid dev          : Start all microservices concurrently
- afroid test         : Run end-to-end test suite
- afroid seed         : Populate African funding opportunities
- afroid certify      : Run instant compliance check
- afroid model-sync   : Discover and sync latest Gemini models
- afroid blueprint    : Formulate zero-question architecture blueprint
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

# Ensure workspace root is in sys.path
workspace_root = Path(__file__).resolve().parent.parent
if str(workspace_root) not in sys.path:
    sys.path.insert(0, str(workspace_root))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def cmd_test(args: argparse.Namespace) -> None:
    """Run the smoke test and test suites."""
    print("\n🚀 Running Afroid Sovereign Verification Suite...\n")
    from scripts.smoke_test import SmokeTestRunner

    runner = SmokeTestRunner()
    success = asyncio.run(runner.run_all())
    sys.exit(0 if success else 1)


def cmd_seed(args: argparse.Namespace) -> None:
    """Seed African funding opportunities."""
    print("\n🌱 Seeding African Funding Catalog into database...\n")
    from services.incubate.app.seeds.opportunity_seeder import seed_opportunities

    asyncio.run(seed_opportunities())
    print("✅ Seeding completed successfully.")


def cmd_certify(args: argparse.Namespace) -> None:
    """Run compliance certification check."""
    country = args.country.lower()
    print(f"\n🛡️ Running Afroid Certify RegTech Check for [{country.upper()}]...\n")

    from services.certify.app.engine.compliance import ComplianceEngine

    engine = ComplianceEngine()
    profile = {
        "legal_name": args.name or "Sovereign Tech Ltd",
        "country": country,
        "technologies": ["Python", "FastAPI", "React", "PostgreSQL"],
        "jobs_created": 8,
        "documents": {"tax_id": "TAX-AFR-001"},
    }

    result = engine.run_certification(country, profile)
    print(f"Status: {result['status'].upper()}")
    print(f"Score: {result['score']}%")
    rules = result.get("rules", [])
    passed = sum(1 for r in rules if r["status"] == "passed")
    failed = sum(1 for r in rules if r["status"] == "failed")
    print(f"Passed Checks: {passed}")
    print(f"Failed Checks: {failed}")
    print("\n" + json.dumps(result, indent=2))


def cmd_model_sync(args: argparse.Namespace) -> None:
    """Scan and sync available Gemini models."""
    print("\n🤖 Scanning Google Gemini AI Model Hub...\n")
    from services.orchestrator.app.services.model_registry import model_registry

    models = model_registry.list_models()
    print(f"Discovered {len(models)} available models:")
    for m in models:
        prefix = "★" if m.id == model_registry._default_model_id else " "
        print(f"  {prefix} [{m.id:22}] {m.name:30} ({m.provider})")


def cmd_blueprint(args: argparse.Namespace) -> None:
    """Formulate zero-question architectural blueprint from prompt."""
    prompt = " ".join(args.prompt)
    print(f"\n📐 Formulating Zero-Question Architectural Blueprint for:\n'{prompt}'\n")

    from services.orchestrator.app.agents.parallel_builder import ZeroQuestionIntakeEngine

    intake = ZeroQuestionIntakeEngine()
    blueprint = asyncio.run(intake.generate_blueprint(prompt))

    print("✅ Blueprint Generated:")
    print(json.dumps(blueprint.model_dump(), indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="afroid",
        description="Afroid Sovereign Startup Factory CLI",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available sub-commands")

    # test
    sub_test = subparsers.add_parser("test", help="Run platform verification test suite")
    sub_test.set_defaults(func=cmd_test)

    # seed
    sub_seed = subparsers.add_parser("seed", help="Seed funding opportunities into database")
    sub_seed.set_defaults(func=cmd_seed)

    # certify
    sub_cert = subparsers.add_parser("certify", help="Run RegTech compliance check")
    sub_cert.add_argument("--country", "-c", required=True, choices=["nigeria", "kenya", "ethiopia", "au"], help="Target jurisdiction")
    sub_cert.add_argument("--name", "-n", default="Sovereign Tech Ltd", help="Company legal name")
    sub_cert.set_defaults(func=cmd_certify)

    # model-sync
    sub_model = subparsers.add_parser("model-sync", help="Scan and sync available Gemini models")
    sub_model.set_defaults(func=cmd_model_sync)

    # blueprint
    sub_bp = subparsers.add_parser("blueprint", help="Formulate zero-question architecture blueprint")
    sub_bp.add_argument("prompt", nargs="+", help="Startup concept description")
    sub_bp.set_defaults(func=cmd_blueprint)

    args = parser.parse_args()

    if hasattr(args, "func"):
        args.func(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
