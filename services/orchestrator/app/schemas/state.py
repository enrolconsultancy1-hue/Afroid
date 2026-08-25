"""Orchestrator Service — LangGraph multi-agent state machine and blueprint schemas."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class AgentPhase(str, Enum):
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
    coreFeatures: List[str] = Field(default_factory=list, description="Primary features and capabilities")
    businessModel: str = Field(default="", description="B2B, B2C, Marketplace, SaaS, etc.")
    monetization: str = Field(default="", description="Subscription, transaction fee, commission, etc.")
    integrations: List[str] = Field(default_factory=list, description="Third-party APIs (M-Pesa, Paystack, Africa's Talking)")
    constraints: List[str] = Field(default_factory=list, description="Low-bandwidth, offline-first, mobile-first")
    compliance: List[str] = Field(default_factory=list, description="Nigeria Startup Act, Kenya Startup Bill, AU Framework")
    platform: str = Field(default="Web App", description="Web App, Mobile (Flutter/RN), WhatsApp Bot, USSD")
    techPreferences: str = Field(default="FastAPI + Next.js 15 + PostgreSQL", description="Preferred languages/frameworks")
    teamSkill: str = Field(default="Beginner", description="Team engineering proficiency")
    timeline: str = Field(default="1-3 months", description="Target shipping timeline")
    successCriteria: str = Field(default="", description="Key metrics and goals")


class ConceptInput(BaseModel):
    """User-provided concept for code generation."""
    description: str = Field(..., min_length=10)
    idea_details: Optional[BusinessIdea] = None
    domain: Optional[str] = None
    target_market: List[str] = []
    application_type: Optional[str] = None
    tech_preferences: dict[str, Any] = {}
    scale: dict[str, Any] = {}
    compliance: List[str] = []
    model_preferences: dict[str, Any] = Field(
        default_factory=dict,
        description="Custom model configuration (e.g. {'model': 'gemini-flash-latest'})",
    )


class CoreModule(BaseModel):
    """Architectural module with defined scope and responsibilities."""
    id: str = Field(..., description="e.g. M1, M2")
    name: str
    purpose: str
    responsibilities: List[str] = Field(default_factory=list)
    files: List[str] = Field(default_factory=list)
    acceptance: List[str] = Field(default_factory=list)
    dependsOn: List[str] = Field(default_factory=list)


class Milestone(BaseModel):
    """Sequential build milestone for parallel sub-agents."""
    id: str = Field(..., description="e.g. MS1, MS2")
    name: str
    objective: str
    tasks: List[str] = Field(default_factory=list)
    filesToCreate: List[str] = Field(default_factory=list)
    definitionsOfDone: List[str] = Field(default_factory=list)


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
    core_modules: List[CoreModule] = Field(default_factory=list)
    milestones: List[Milestone] = Field(default_factory=list)
    build_order: List[str] = Field(default_factory=list)
    risks_and_assumptions: List[str] = Field(default_factory=list)
    generated_by: str = "geezcodE:architect"

    # Backward compatibility helpers
    overview: Optional[str] = None
    services: Optional[List[dict[str, Any]]] = None
    api_endpoints: Optional[List[dict[str, Any]]] = None
    file_structure: Optional[List[str]] = None
    deployment: Optional[dict[str, Any]] = None


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
    issues: List[dict[str, Any]] = []
    suggestions: List[str] = []
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
    architecture: Optional[ArchitectureBlueprint] = None
    architecture_approved: bool = False
    architecture_feedback: str = ""
    generated_files: List[GeneratedFile] = []
    review_results: List[ReviewResult] = []

    agent_history: List[dict[str, Any]] = []
    total_tokens_used: int = 0
    started_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    completed_at: Optional[str] = None
    error_message: Optional[str] = None
