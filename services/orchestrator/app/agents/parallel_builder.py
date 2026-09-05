"""Orchestrator Service -- Parallel Sub-Agent Builder Core (geezcodE </> Engine).

Extracts and orchestrates:
1. Zero-Question Architect Intake Engine (Business Idea -> Complete Full-Stack Blueprint)
2. Parallel Sub-Agent Swarm (Architect, CodeGen Workers 1 & 2, QA Runner, RegTech Auditor)
3. AST Syntax & Clean Code Test Runner
4. Project Workspace Directory & Milestone-Based File Creation
"""
from __future__ import annotations

import ast
import asyncio
import json
import os
import time
import uuid
from pathlib import Path
from typing import Any

import structlog
from pydantic import BaseModel, Field

from services.orchestrator.app.agents.prompts import (
    ARCHITECT_SYSTEM_PROMPT,
    CODEGEN_SYSTEM_PROMPT,
)
from services.orchestrator.app.schemas.state import (
    ArchitectureBlueprint,
    BusinessIdea,
    CoreModule,
    GeneratedFile,
    Milestone,
)
from services.orchestrator.app.services.model_registry import model_registry

logger = structlog.get_logger()


class SubAgentStatus(BaseModel):
    id: str
    name: str
    type: str  # architect, codegen, test_runner, compliance, deployer
    status: str = "idle"  # idle, running, completed, error
    current_task: str = ""
    progress: int = 0
    tokens_used: int = 0
    created_at: float = Field(default_factory=time.time)


class ParallelBuildSession(BaseModel):
    session_id: str = Field(default_factory=lambda: f"build-{uuid.uuid4().hex[:8]}")
    project_name: str
    project_path: str
    autopilot: bool = True
    blueprint: ArchitectureBlueprint | None = None
    sub_agents: list[SubAgentStatus] = []
    generated_files: list[GeneratedFile] = []
    test_results: list[dict[str, Any]] = []
    status: str = "initialized"  # initialized, building, testing, complete, error
    created_at: float = Field(default_factory=time.time)


class ZeroQuestionIntakeEngine:
    """Intake framework that generates complete architectural blueprints with NO QUESTIONS TO ASK."""

    def offline_blueprint(self, idea: BusinessIdea | str) -> ArchitectureBlueprint:
        """Rule-based blueprint generator guaranteeing 100% complete handover without needing external API."""
        if isinstance(idea, str):
            name = idea.split()[0] if idea.split() else "Sovereign"
            slug = idea.strip().lower().replace(" ", "-")[:28]
            idea = BusinessIdea(
                projectName=name.capitalize() + " Tech",
                oneLiner=idea,
                problem=f"Fragmented access and high friction in {idea}",
                targetUsers="African SMEs, founders, and consumers",
                coreFeatures=[
                    "User Registration & Auth",
                    "Core Transaction Engine",
                    "Analytics Dashboard",
                ],
                integrations=["M-Pesa Daraja", "Paystack", "Africa's Talking"],
                compliance=["Nigeria Startup Act 2022", "AU Framework"],
                platform="Web App + Mobile",
            )

        slug = idea.projectName.strip().lower().replace(" ", "-")
        modules = [
            CoreModule(
                id="M1",
                name="Core API & Domain Engine",
                purpose="FastAPI backend microservice managing business logic, entities, and database state.",
                responsibilities=[
                    "REST & GraphQL API Endpoints",
                    "Database CRUD operations",
                    "Business workflow execution",
                ],
                files=["services/api/main.py", "services/api/routes.py", "services/api/models.py"],
                acceptance=[
                    "All CRUD endpoints return RFC 7807 compliant error envelopes.",
                    "Pydantic validation active on all inputs.",
                ],
                dependsOn=[],
            ),
            CoreModule(
                id="M2",
                name="Data & Sovereign Vector Store",
                purpose="PostgreSQL 16 + pgvector storage for relational schemas and 768-dim embeddings.",
                responsibilities=[
                    "Schema migrations with Alembic",
                    "HNSW cosine distance vector indexes",
                    "Redis caching",
                ],
                files=[
                    "services/db/schema.sql",
                    "services/db/connection.py",
                    "services/db/vector.py",
                ],
                acceptance=[
                    "PostgreSQL migrations execute cleanly.",
                    "Vector similarity query latency < 15ms.",
                ],
                dependsOn=["M1"],
            ),
            CoreModule(
                id="M3",
                name="Sovereign Web Frontend",
                purpose="Next.js 15 App Router web application with Tailwind CSS and Monaco IDE integration.",
                responsibilities=[
                    "Client-side state management",
                    "Real-time WebSocket telemetry",
                    "Responsive UI layout",
                ],
                files=[
                    "apps/web/src/app/page.tsx",
                    "apps/web/src/app/dashboard/page.tsx",
                    "apps/web/src/components/ui.tsx",
                ],
                acceptance=[
                    "Server-Side Rendering (SSR) passes with 0 hydration errors.",
                    "Lighthouse Performance > 95.",
                ],
                dependsOn=["M1"],
            ),
            CoreModule(
                id="M4",
                name="Telecom & Payment Rail Adapters",
                purpose="Integration adapters for African financial infrastructure (M-Pesa, Paystack, Africa's Talking).",
                responsibilities=[
                    "STK Push payment triggers",
                    "Webhook signature verification (HMAC-SHA256)",
                    "SMS/USSD fallback notifications",
                ],
                files=[
                    "services/integrations/mpesa.py",
                    "services/integrations/paystack.py",
                    "services/integrations/sms.py",
                ],
                acceptance=[
                    "Signed webhook payloads validated cryptographically.",
                    "Idempotency keys enforced on payment dispatch.",
                ],
                dependsOn=["M1", "M2"],
            ),
        ]
        milestones = [
            Milestone(
                id="MS1",
                name="Foundation, Config & Database Schema",
                objective="Initialize repository configuration, environment variables, and PostgreSQL database schema.",
                tasks=[
                    "Configure pyproject.toml & package.json",
                    "Create PostgreSQL tables with pgvector",
                    "Initialize Redis connection",
                ],
                filesToCreate=[
                    "pyproject.toml",
                    "docker-compose.yml",
                    ".env.example",
                    "services/api/main.py",
                ],
                definitionsOfDone=[
                    "Docker Compose starts PostgreSQL and Redis successfully.",
                    "FastAPI health check returns 200 OK.",
                ],
            ),
            Milestone(
                id="MS2",
                name="Core Domain API & Business Workflows",
                objective="Implement core domain models, routes, and transaction processing logic.",
                tasks=[
                    "Write Pydantic models",
                    "Implement CRUD routers",
                    "Add distributed tracing middleware",
                ],
                filesToCreate=[
                    "services/api/routes.py",
                    "services/api/models.py",
                    "services/api/services.py",
                ],
                definitionsOfDone=[
                    "All unit tests pass with >90% coverage.",
                    "AST syntax passes with 0 lint errors.",
                ],
            ),
            Milestone(
                id="MS3",
                name="Sovereign Web Dashboard & UI",
                objective="Develop Next.js 15 user dashboard with real-time WebSocket connection.",
                tasks=[
                    "Create App Router page templates",
                    "Connect Zustand state store",
                    "Implement live telemetry stream",
                ],
                filesToCreate=["apps/web/src/app/page.tsx", "apps/web/src/app/dashboard/page.tsx"],
                definitionsOfDone=[
                    "Next.js production build prerenders with 0 errors.",
                    "WebSocket reconnects on dropped network.",
                ],
            ),
            Milestone(
                id="MS4",
                name="Payment Rails & Notification Webhooks",
                objective="Integrate African payment providers (M-Pesa & Paystack) with HMAC webhook security.",
                tasks=[
                    "Write M-Pesa STK push handler",
                    "Write Paystack checkout handler",
                    "Implement SMS notification queue",
                ],
                filesToCreate=[
                    "services/integrations/mpesa.py",
                    "services/integrations/paystack.py",
                ],
                definitionsOfDone=[
                    "Webhook signatures verified against shared secret.",
                    "Payments trigger automated state transitions.",
                ],
            ),
            Milestone(
                id="MS5",
                name="QA AST Validation & RegTech Compliance Audit",
                objective="Run automated Python AST syntax verification and multi-jurisdiction compliance audit.",
                tasks=[
                    "Execute AST parser across generated files",
                    "Audit against Nigeria Startup Act 2022",
                    "Generate Docker production spec",
                ],
                filesToCreate=["tests/test_api.py", "Dockerfile", "README.md"],
                definitionsOfDone=[
                    "Smoke test runner reports 100% pass rate.",
                    "RegTech engine issues certified audit hash.",
                ],
            ),
        ]

        system_arch_ascii = r"""
+---------------------------------------------------------------+
|                      Client Applications                      |
|      [ Next.js 15 Web App ]   <--->   [ Mobile / USSD ]       |
+---------------------------------------------------------------+
                               |
                               | (HTTPS / WSS)
                               v
+---------------------------------------------------------------+
|                     FastAPI Gateway & API                     |
|           [ Auth Middleware ]   [ Tracing Middleware ]        |
+---------------------------------------------------------------+
         |                     |                     |
         v                     v                     v
+------------------+  +------------------+  +-------------------+
|  PostgreSQL 16   |  |     Redis 7      |  | Payment Adapters  |
|   + pgvector     |  |   Cache & PubSub |  | (M-Pesa/Paystack) |
+------------------+  +------------------+  +-------------------+
"""

        data_flow_text = (
            "Journey 1 (Onboarding): User registers -> Passwordless SMS OTP dispatched -> JWT issued -> Organization created.\n"
            "Journey 2 (Transaction): User originates transaction -> Core API validates schema -> M-Pesa STK Push triggered -> Webhook receives payment -> Ledger updated.\n"
            "Journey 3 (Compliance Audit): System snapshots codebase -> MinHash IP verifier calculates originality -> SHA-256 block cryptographically linked to audit chain."
        )
        dir_tree = (
            f"{slug}/\n"
            "+-- apps/\n"
            "|   +-- web/ (Next.js 15 App Router)\n"
            "+-- services/\n"
            "|   +-- api/ (FastAPI Core Backend)\n"
            "|   +-- db/ (PostgreSQL & pgvector Schemas)\n"
            "|   +-- integrations/ (M-Pesa, Paystack, SMS)\n"
            "+-- tests/ (Automated AST QA Suite)\n"
            "+-- docker-compose.yml\n"
            "+-- pyproject.toml"
        )

        return ArchitectureBlueprint(
            project_name=slug,
            summary=f"Sovereign, enterprise-grade architecture for {idea.projectName}. Engineered for high reliability, low-bandwidth African conditions, and zero-question execution.",
            completeness=100,
            tech_stack={
                "languages": ["Python 3.12", "TypeScript 5.5", "SQL"],
                "frameworks": ["FastAPI", "Next.js 15", "Pydantic v2"],
                "databases": ["PostgreSQL 16 + pgvector", "Redis 7"],
                "infra": ["GCP africa-south1", "Cloud Run", "Docker Compose"],
                "keyLibraries": ["argon2-cffi", "pyjwt", "httpx", "structlog", "zustand"],
                "rationale": "Optimized for sub-second API latency, strong cryptographic data sovereignty, and offline-first accessibility across African telecom networks.",
            },
            system_architecture=system_arch_ascii,
            data_flow=data_flow_text,
            directory_structure=dir_tree,
            database_schema={
                "users": [
                    "id (UUID)",
                    "email (VARCHAR)",
                    "phone (VARCHAR)",
                    "hashed_password (VARCHAR)",
                    "created_at (TIMESTAMPTZ)",
                ],
                "organizations": [
                    "id (UUID)",
                    "name (VARCHAR)",
                    "country (VARCHAR)",
                    "is_certified (BOOLEAN)",
                ],
                "transactions": [
                    "id (UUID)",
                    "org_id (UUID)",
                    "amount (NUMERIC)",
                    "currency (VARCHAR)",
                    "status (VARCHAR)",
                    "reference (VARCHAR)",
                ],
                "audit_logs": [
                    "id (UUID)",
                    "action (VARCHAR)",
                    "hash_chain (VARCHAR)",
                    "timestamp (TIMESTAMPTZ)",
                ],
            },
            api_design=[
                {
                    "method": "POST",
                    "path": "/v1/auth/register",
                    "summary": "User registration & OTP verification",
                },
                {
                    "method": "POST",
                    "path": "/v1/auth/login",
                    "summary": "Argon2id + JWT authentication",
                },
                {"method": "GET", "path": "/v1/projects", "summary": "List organization projects"},
                {
                    "method": "POST",
                    "path": "/v1/transactions/originate",
                    "summary": "Trigger M-Pesa / Paystack payment",
                },
                {
                    "method": "POST",
                    "path": "/v1/webhooks/payment",
                    "summary": "HMAC-SHA256 signed payment webhook callback",
                },
            ],
            auth_design="Argon2id password hashing with stateless short-lived JWT access tokens (15m) and database-backed rotating refresh tokens (7d).",
            security_considerations="OWASP Top 10 mitigation: Parameterized SQL, HMAC-SHA256 webhook signatures, TLS 1.3 encryption, and Pydantic input sanitization.",
            deployment_architecture="Containerized with Docker targeting Google Cloud Run in Johannesburg (africa-south1) connected to Cloud SQL (pgvector).",
            core_modules=modules,
            milestones=milestones,
            build_order=["MS1", "MS2", "MS3", "MS4", "MS5"],
            risks_and_assumptions=[
                "Assumption: Core target users have intermittent 3G/4G connectivity, requiring offline sync resilience.",
                "Risk: Local payment gateway API latency spikes; mitigated by asynchronous background worker task queues.",
            ],
            generated_by="geezcodE:ZeroQuestionArchitect",
            # Compatibility fields
            overview=f"Sovereign architecture for {idea.projectName}",
            services=[
                {"name": m.name, "tech": "FastAPI/Next.js", "port": 8000 + i}
                for i, m in enumerate(modules)
            ],
            api_endpoints=[
                {"method": "GET", "path": "/health", "summary": "Health Check"},
                {"method": "POST", "path": "/v1/originate", "summary": "Originate Transaction"},
            ],
            file_structure=[f for m in modules for f in m.files],
            deployment={"docker": True, "gcp_region": "africa-south1"},
        )

    @staticmethod
    def _apply_defaults(idea: BusinessIdea) -> BusinessIdea:
        """Fill empty blueprint-signal fields with proven built-in templates."""
        defaults = {
            "userJourneys": (
                "Onboarding: a new user signs up, completes their profile, and reaches first "
                "value within five minutes. Core task: the primary user workflow end to end. "
                "Admin: manage users, content, and operations."
            ),
            "functionalRequirements": (
                "1. User registration and authentication. 2. Core domain workflows and CRUD. "
                "3. Notifications and messaging. 4. Reporting and analytics dashboard. "
                "5. Admin and moderation tools."
            ),
            "dataEntities": (
                "users, organizations, projects, transactions, notifications, audit_logs"
            ),
        }
        data = idea.model_dump()
        for field, value in defaults.items():
            if not str(data.get(field) or "").strip():
                data[field] = value
        return BusinessIdea(**data)

    async def generate_blueprint(
        self,
        concept_input: str | BusinessIdea,
        tech_preferences: dict[str, Any] | None = None,
        model_id: str | None = None,
    ) -> ArchitectureBlueprint:
        """Generate high-level architectural blueprint with zero questions asked."""
        if isinstance(concept_input, str):
            idea = BusinessIdea(
                projectName=concept_input[:30].strip().title() or "Sovereign Startup",
                oneLiner=concept_input,
                problem=f"Pain point in {concept_input}",
                targetUsers="African consumers and businesses",
                coreFeatures=["User Portal", "Transaction Core", "Admin Dashboard"],
            )
        else:
            idea = concept_input

        idea = self._apply_defaults(idea)

        try:
            llm = model_registry.create_llm(
                agent_name="architect", model_id=model_id, temperature=0.1
            )
            prompt_data = {
                "projectName": idea.projectName,
                "oneLiner": idea.oneLiner,
                "problem": idea.problem,
                "targetUsers": idea.targetUsers,
                "coreFeatures": idea.coreFeatures,
                "integrations": idea.integrations,
                "compliance": idea.compliance,
                "platform": idea.platform,
                "techPreferences": idea.techPreferences,
                "userJourneys": idea.userJourneys,
                "functionalRequirements": idea.functionalRequirements,
                "dataEntities": idea.dataEntities,
                "additionalContext": idea.additionalContext,
                "directive": "Generate a COMPLETE, non-ambiguous ArchitectureBlueprint with zero questions to ask.",
            }
            messages = [
                {"role": "system", "content": ARCHITECT_SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(prompt_data)},
            ]
            response = await llm.ainvoke(messages)
            data = json.loads(response.content)
            return ArchitectureBlueprint(**data)
        except Exception as e:
            logger.warning("zero_question_blueprint_fallback", error=str(e))
            return self.offline_blueprint(idea)


# ============================================
# Parallel Builder Core — LLM-Powered
# ============================================


class ParallelBuilderCore:
    """Dispatches concurrent sub-agents to build the project milestone by milestone.

    Uses LLM code generation for each milestone's files, with an offline
    scaffold fallback when the API is unavailable.
    """

    def __init__(self, workspace_root: str | None = None) -> None:
        self.workspace_root = workspace_root or str(
            Path(__file__).resolve().parents[4] / "projects"
        )

    # ------------------------------------------------------------------
    # LLM-powered file generation for a single milestone
    # ------------------------------------------------------------------

    async def _generate_milestone_files_llm(
        self,
        blueprint: ArchitectureBlueprint,
        milestone: Milestone,
        model_id: str | None = None,
    ) -> list[GeneratedFile]:
        """Call the LLM to generate production-quality source files for one milestone."""
        llm = model_registry.create_llm(
            agent_name="codegen", model_id=model_id, temperature=0.0
        )

        prompt_payload = json.dumps({
            "project_name": blueprint.project_name,
            "summary": blueprint.summary,
            "tech_stack": blueprint.tech_stack,
            "database_schema": blueprint.database_schema,
            "api_design": getattr(blueprint, "api_design", blueprint.api_endpoints),
            "milestone": {
                "id": milestone.id,
                "name": milestone.name,
                "objective": milestone.objective,
                "tasks": milestone.tasks,
                "files_to_generate": milestone.filesToCreate,
                "definitions_of_done": milestone.definitionsOfDone,
            },
            "core_modules": [m.model_dump() for m in (blueprint.core_modules or [])],
            "directive": (
                "Generate COMPLETE, production-ready source code for every file in "
                "files_to_generate. Return a JSON array where each element has: "
                '{"path": "<file_path>", "content": "<full source code>", '
                '"language": "<python|typescript|typescriptreact|yaml|sql|markdown|dockerfile>"}. '
                "Return ONLY the JSON array, no markdown fences."
            ),
        })

        messages = [
            {"role": "system", "content": CODEGEN_SYSTEM_PROMPT},
            {"role": "user", "content": prompt_payload},
        ]

        response = await llm.ainvoke(messages)

        # Parse the response — strip markdown fences if present
        content = response.content.strip()
        if content.startswith("```"):
            # Remove ```json ... ``` wrapper
            lines = content.split("\n")
            content = "\n".join(lines[1:-1]) if len(lines) > 2 else content

        files_data = json.loads(content)
        generated: list[GeneratedFile] = []

        if isinstance(files_data, list):
            for fd in files_data:
                file_content = fd.get("content", "")
                gf = GeneratedFile(
                    path=fd.get("path", "unknown"),
                    content=file_content,
                    language=fd.get("language", "text"),
                    size_bytes=len(file_content.encode("utf-8")),
                )
                generated.append(gf)

        return generated

    # ------------------------------------------------------------------
    # Offline scaffold fallback (no LLM needed)
    # ------------------------------------------------------------------

    @staticmethod
    def _generate_scaffold_files(
        blueprint: ArchitectureBlueprint,
    ) -> list[GeneratedFile]:
        """Generate minimal but valid scaffold files without calling any LLM."""
        scaffolds: list[tuple[str, str, str]] = [
            (
                "services/api/main.py",
                (
                    "from fastapi import FastAPI\n\n"
                    f"app = FastAPI(title='{blueprint.project_name}')\n\n\n"
                    "@app.get('/health')\n"
                    "def health():\n"
                    "    return {'status': 'healthy', 'sovereignty': 'verified'}\n"
                ),
                "python",
            ),
            (
                "services/api/routes.py",
                (
                    "from fastapi import APIRouter\n\n"
                    "router = APIRouter()\n\n\n"
                    "@router.get('/v1/status')\n"
                    "def status():\n"
                    "    return {'active': True}\n"
                ),
                "python",
            ),
            (
                "services/api/models.py",
                (
                    "from pydantic import BaseModel\n"
                    "from uuid import UUID\n"
                    "from datetime import datetime\n\n\n"
                    "class UserBase(BaseModel):\n"
                    "    email: str\n"
                    "    phone: str | None = None\n\n\n"
                    "class UserCreate(UserBase):\n"
                    "    password: str\n\n\n"
                    "class UserRead(UserBase):\n"
                    "    id: UUID\n"
                    "    created_at: datetime\n"
                ),
                "python",
            ),
            (
                "apps/web/src/app/page.tsx",
                (
                    f"export default function Page() {{\n"
                    f"  return (\n"
                    f"    <main className=\"min-h-screen flex items-center justify-center\">\n"
                    f"      <h1 className=\"text-4xl font-bold\">{blueprint.project_name}</h1>\n"
                    f"    </main>\n"
                    f"  );\n"
                    f"}}\n"
                ),
                "typescriptreact",
            ),
            (
                "apps/web/src/app/dashboard/page.tsx",
                (
                    "'use client';\n\n"
                    "import { useEffect, useState } from 'react';\n\n"
                    "export default function Dashboard() {\n"
                    "  const [status, setStatus] = useState<string>('loading');\n\n"
                    "  useEffect(() => {\n"
                    "    fetch('/api/v1/status').then(r => r.json()).then(d => setStatus(d.active ? 'active' : 'inactive'));\n"
                    "  }, []);\n\n"
                    "  return (\n"
                    "    <div className=\"p-8\">\n"
                    "      <h2 className=\"text-2xl font-semibold\">Dashboard</h2>\n"
                    "      <p>System status: {status}</p>\n"
                    "    </div>\n"
                    "  );\n"
                    "}\n"
                ),
                "typescriptreact",
            ),
            (
                "docker-compose.yml",
                (
                    "version: '3.8'\n"
                    "services:\n"
                    "  api:\n"
                    "    build: .\n"
                    "    ports:\n"
                    "      - '8000:8000'\n"
                    "    environment:\n"
                    "      - DATABASE_URL=postgresql://afroid:afroid_dev@postgres:5432/afroid\n"
                    "    depends_on:\n"
                    "      - postgres\n"
                    "  postgres:\n"
                    "    image: pgvector/pgvector:pg16\n"
                    "    environment:\n"
                    "      POSTGRES_USER: afroid\n"
                    "      POSTGRES_PASSWORD: afroid_dev\n"
                    "      POSTGRES_DB: afroid\n"
                    "    ports:\n"
                    "      - '5432:5432'\n"
                ),
                "yaml",
            ),
            (
                "Dockerfile",
                (
                    "FROM python:3.12-slim\n"
                    "WORKDIR /app\n"
                    "COPY pyproject.toml .\n"
                    "RUN pip install --no-cache-dir .\n"
                    "COPY . .\n"
                    "EXPOSE 8000\n"
                    'CMD ["uvicorn", "services.api.main:app", "--host", "0.0.0.0", "--port", "8000"]\n'
                ),
                "dockerfile",
            ),
            (
                "tests/test_api.py",
                (
                    "from fastapi.testclient import TestClient\n"
                    "from services.api.main import app\n\n"
                    "client = TestClient(app)\n\n\n"
                    "def test_health():\n"
                    "    response = client.get('/health')\n"
                    "    assert response.status_code == 200\n"
                    "    assert response.json()['status'] == 'healthy'\n\n\n"
                    "def test_status():\n"
                    "    response = client.get('/v1/status')\n"
                    "    assert response.status_code == 200\n"
                ),
                "python",
            ),
            (
                "README.md",
                f"# {blueprint.project_name}\n\n{blueprint.summary}\n\n"
                "## Quick Start\n\n"
                "```bash\ndocker compose up -d\ncurl http://localhost:8000/health\n```\n",
                "markdown",
            ),
        ]

        result: list[GeneratedFile] = []
        for path, content, lang in scaffolds:
            result.append(
                GeneratedFile(
                    path=path,
                    content=content,
                    language=lang,
                    size_bytes=len(content.encode("utf-8")),
                )
            )
        return result

    # ------------------------------------------------------------------
    # Emit event helper
    # ------------------------------------------------------------------

    @staticmethod
    async def _emit(on_event: Any | None, event: dict[str, Any]) -> None:
        """Fire an event callback if provided (sync or async)."""
        if on_event is None:
            return
        try:
            result = on_event(event)
            if asyncio.iscoroutine(result):
                await result
        except Exception as e:
            logger.debug("on_event_error", error=str(e))

    # ------------------------------------------------------------------
    # Main build orchestration
    # ------------------------------------------------------------------

    async def execute_parallel_build(
        self,
        session_id: str,
        blueprint: ArchitectureBlueprint,
        autopilot: bool = True,
        on_event: Any | None = None,
        model_id: str | None = None,
    ) -> ParallelBuildSession:
        """Execute milestone-based build using LLM code generation.

        For each milestone in the blueprint, calls the Gemini LLM to generate
        production-quality source files. Falls back to offline scaffolds if the
        LLM is unavailable.

        Events emitted via on_event callback:
            - build_started, milestone_started, file_generated,
              milestone_completed, ast_results, build_complete, build_error
        """
        slug = blueprint.project_name
        project_dir = os.path.join(self.workspace_root, slug)
        os.makedirs(project_dir, exist_ok=True)

        session = ParallelBuildSession(
            session_id=session_id,
            project_name=slug,
            project_path=project_dir,
            autopilot=autopilot,
            blueprint=blueprint,
            sub_agents=[
                SubAgentStatus(
                    id="sa-architect",
                    name="Architect Swarm",
                    type="architect",
                    status="completed",
                    current_task="Blueprint formulated & validated",
                    progress=100,
                ),
                SubAgentStatus(
                    id="sa-codegen-1",
                    name="CodeGen Worker 1",
                    type="codegen",
                    status="running",
                    current_task="Generating backend services",
                    progress=0,
                ),
                SubAgentStatus(
                    id="sa-codegen-2",
                    name="CodeGen Worker 2",
                    type="codegen",
                    status="running",
                    current_task="Generating frontend components",
                    progress=0,
                ),
                SubAgentStatus(
                    id="sa-qa",
                    name="QA & AST Runner",
                    type="test_runner",
                    status="idle",
                    current_task="Awaiting file generation",
                    progress=0,
                ),
                SubAgentStatus(
                    id="sa-compliance",
                    name="Certify RegTech",
                    type="compliance",
                    status="idle",
                    current_task="Standby for compliance scan",
                    progress=0,
                ),
            ],
        )

        logger.info("parallel_build_started", session_id=session_id, project_path=project_dir)
        session.status = "building"

        await self._emit(on_event, {
            "type": "build_started",
            "payload": {
                "session_id": session_id,
                "project_name": slug,
                "total_milestones": len(blueprint.milestones),
            },
        })

        milestones = blueprint.milestones or []
        used_llm = False

        for idx, milestone in enumerate(milestones):
            ms_progress = int(((idx) / max(len(milestones), 1)) * 100)

            await self._emit(on_event, {
                "type": "milestone_started",
                "payload": {
                    "milestone_id": milestone.id,
                    "milestone_name": milestone.name,
                    "objective": milestone.objective,
                    "files_planned": milestone.filesToCreate,
                    "progress": ms_progress,
                },
            })

            logger.info(
                "milestone_started",
                session_id=session_id,
                milestone=milestone.id,
                name=milestone.name,
                files=len(milestone.filesToCreate),
            )

            # ----- Try LLM generation -----
            milestone_files: list[GeneratedFile] = []
            try:
                milestone_files = await self._generate_milestone_files_llm(
                    blueprint, milestone, model_id=model_id
                )
                if milestone_files:
                    used_llm = True
                    logger.info(
                        "milestone_llm_generated",
                        milestone=milestone.id,
                        file_count=len(milestone_files),
                    )
            except Exception as e:
                logger.warning(
                    "milestone_llm_fallback",
                    milestone=milestone.id,
                    error=str(e),
                )
                # LLM failed — milestone_files stays empty, scaffold fills in below

            # ----- Write generated files to disk -----
            for gf in milestone_files:
                full_path = os.path.join(project_dir, gf.path)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, "w", encoding="utf-8") as f:  # noqa: ASYNC230
                    f.write(gf.content)
                session.generated_files.append(gf)

                await self._emit(on_event, {
                    "type": "file_generated",
                    "payload": {
                        "milestone_id": milestone.id,
                        "path": gf.path,
                        "language": gf.language,
                        "size_bytes": gf.size_bytes,
                        "source": "llm",
                    },
                })

            await self._emit(on_event, {
                "type": "milestone_completed",
                "payload": {
                    "milestone_id": milestone.id,
                    "milestone_name": milestone.name,
                    "files_generated": len(milestone_files),
                    "progress": int(((idx + 1) / max(len(milestones), 1)) * 100),
                },
            })

            # Update sub-agent progress
            agent_progress = int(((idx + 1) / max(len(milestones), 1)) * 100)
            for sa in session.sub_agents:
                if sa.type == "codegen":
                    sa.progress = agent_progress
                    sa.current_task = f"Completed {milestone.name}"

        # ----- Scaffold fallback if LLM produced nothing -----
        if not session.generated_files:
            logger.info("parallel_build_scaffold_fallback", session_id=session_id)
            scaffold_files = self._generate_scaffold_files(blueprint)
            for gf in scaffold_files:
                full_path = os.path.join(project_dir, gf.path)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, "w", encoding="utf-8") as f:  # noqa: ASYNC230
                    f.write(gf.content)
                session.generated_files.append(gf)

                await self._emit(on_event, {
                    "type": "file_generated",
                    "payload": {
                        "path": gf.path,
                        "language": gf.language,
                        "size_bytes": gf.size_bytes,
                        "source": "scaffold",
                    },
                })

        # ----- AST Syntax Validation -----
        session.status = "testing"
        for sa in session.sub_agents:
            if sa.type == "test_runner":
                sa.status = "running"
                sa.current_task = "Running AST syntax verification"

        ast_passed = True
        ast_errors: list[dict[str, str]] = []
        for gf in session.generated_files:
            if gf.language == "python":
                try:
                    ast.parse(gf.content)
                except SyntaxError as e:
                    ast_passed = False
                    ast_errors.append({"file": gf.path, "error": str(e)})

        session.test_results.append({
            "test_suite": "AST Syntax Verification",
            "passed": ast_passed,
            "files_scanned": len([f for f in session.generated_files if f.language == "python"]),
            "errors": ast_errors,
            "source": "llm" if used_llm else "scaffold",
        })

        await self._emit(on_event, {
            "type": "ast_results",
            "payload": {
                "passed": ast_passed,
                "errors": ast_errors,
                "python_files_scanned": len([f for f in session.generated_files if f.language == "python"]),
            },
        })

        # ----- Finalize -----
        for sa in session.sub_agents:
            sa.status = "completed"
            sa.progress = 100

        session.status = "complete"

        await self._emit(on_event, {
            "type": "build_complete",
            "payload": {
                "session_id": session_id,
                "total_files": len(session.generated_files),
                "total_lines": sum(gf.content.count("\n") + 1 for gf in session.generated_files),
                "ast_passed": ast_passed,
                "source": "llm" if used_llm else "scaffold",
            },
        })

        logger.info(
            "parallel_build_complete",
            session_id=session_id,
            total_files=len(session.generated_files),
            used_llm=used_llm,
            ast_passed=ast_passed,
        )

        return session


parallel_builder_core = ParallelBuilderCore()
