"""Orchestrator Service — LangGraph multi-agent state machine and blueprint schemas."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class AgentPhase(StrEnum):
    ANALYZING = "analyzing"
    ARCHITECTING = "architecting"
    GENERATING = "generating"
    REVIEWING = "reviewing"
    COMPLETE = "complete"
    ERROR = "error"


class BusinessIdea(BaseModel):
    """Structured intake parameters capturing the complete business concept."""

    projectName: str = Field(..., description="Name of the startup / project")
    oneLiner: str = Field(default="", description="Elevator pitch / one-line summary")
    problem: str = Field(default="", description="Specific problem being solved")
    targetUsers: str = Field(default="", description="Target customer segments and user personas")
    coreFeatures: list[str] = Field(
        default_factory=list, description="Primary features and capabilities"
    )
    businessModel: str = Field(default="", description="B2B, B2C, Marketplace, SaaS, etc.")
    monetization: str = Field(
        default="", description="Subscription, transaction fee, commission, etc."
    )
    integrations: list[str] = Field(
        default_factory=list, description="Third-party APIs (M-Pesa, Paystack, Africa's Talking)"
    )
    constraints: list[str] = Field(
        default_factory=list, description="Low-bandwidth, offline-first, mobile-first"
    )
    compliance: list[str] = Field(
        default_factory=list, description="Nigeria Startup Act, Kenya Startup Bill, AU Framework"
    )
    platform: str = Field(
        default="Web App", description="Web App, Mobile (Flutter/RN), WhatsApp Bot, USSD"
    )
    techPreferences: str = Field(
        default="FastAPI + Next.js 15 + PostgreSQL", description="Preferred languages/frameworks"
    )
    teamSkill: str = Field(default="Beginner", description="Team engineering proficiency")
    timeline: str = Field(default="1-3 months", description="Target shipping timeline")
    userJourneys: str = Field(default="", description="Key user journeys / use cases")
    functionalRequirements: str = Field(default="", description="Functional requirements")
    dataEntities: str = Field(default="", description="Core data entities")
    additionalContext: dict = Field(default_factory=dict, description="Phase-2 spec fields")
    successCriteria: str = Field(default="", description="Key metrics and goals")


class ConceptInput(BaseModel):
    """User-provided concept for code generation."""

    description: str = Field(..., min_length=10)
    idea_details: BusinessIdea | None = None
    domain: str | None = None
    target_market: list[str] = []
    application_type: str | None = None
    tech_preferences: dict[str, Any] = {}
    scale: dict[str, Any] = {}
    compliance: list[str] = []
    model_preferences: dict[str, Any] = Field(
        default_factory=dict,
        description="Custom model configuration (e.g. {'model': 'gemini-flash-latest'})",
    )


class CoreModule(BaseModel):
    """Architectural module with defined scope and responsibilities."""

    id: str = Field(..., description="e.g. M1, M2")
    name: str
    purpose: str
    responsibilities: list[str] = Field(default_factory=list)
    files: list[str] = Field(default_factory=list)
    acceptance: list[str] = Field(default_factory=list)
    dependsOn: list[str] = Field(default_factory=list)


class Milestone(BaseModel):
    """Sequential build milestone for parallel sub-agents."""

    id: str = Field(..., description="e.g. MS1, MS2")
    name: str
    objective: str
    tasks: list[str] = Field(default_factory=list)
    filesToCreate: list[str] = Field(default_factory=list)
    definitionsOfDone: list[str] = Field(default_factory=list)


class ArchitectureBlueprint(BaseModel):
    """Generated full-stack architecture blueprint from the Architect agent."""

    project_name: str
    summary: str = ""
    completeness: int = 100
    tech_stack: dict[str, Any] = Field(default_factory=dict)
    system_architecture: str = ""
    data_flow: str = ""
    directory_structure: str = ""
    database_schema: Any = Field(default_factory=dict)
    api_design: Any = Field(default_factory=list)
    auth_design: str = ""
    security_considerations: str = ""
    deployment_architecture: str = ""
    core_modules: list[CoreModule] = Field(default_factory=list)
    milestones: list[Milestone] = Field(default_factory=list)
    build_order: list[str] = Field(default_factory=list)
    risks_and_assumptions: list[str] = Field(default_factory=list)
    generated_by: str = "geezcodE:architect"

    # Backward compatibility helpers
    overview: str | None = None
    services: list[dict[str, Any]] | None = None
    api_endpoints: list[dict[str, Any]] | None = None
    file_structure: list[str] | None = None
    deployment: dict[str, Any] | None = None


class GeneratedFile(BaseModel):
    """A single generated source file."""

    path: str
    content: str
    language: str
    size_bytes: int = 0
    description: str = ""


class ReviewResult(BaseModel):
    """Code review result from the Review agent."""

    file_path: str
    passed: bool
    issues: list[dict[str, Any]] = []
    suggestions: list[str] = []
    quality_score: float = 0.0


class OrchestrationState(BaseModel):
    """Complete state flowing through the LangGraph pipeline."""

    job_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str

    concept: ConceptInput

    phase: AgentPhase = AgentPhase.ANALYZING
    current_agent: str = ""
    progress: int = 0
    total_steps: int = 4
    models_config: dict[str, Any] = Field(default_factory=dict)

    analysis: dict[str, Any] = {}
    architecture: ArchitectureBlueprint | None = None
    architecture_approved: bool = False
    architecture_feedback: str = ""
    generated_files: list[GeneratedFile] = []
    review_results: list[ReviewResult] = []

    agent_history: list[dict[str, Any]] = []
    total_tokens_used: int = 0
    started_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    completed_at: str | None = None
    error_message: str | None = None
