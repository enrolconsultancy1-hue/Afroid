"""Orchestrator Service — LangGraph workflow definition."""

from __future__ import annotations

import json
import time

import structlog
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage

from services.orchestrator.app.agents.prompts import (
    ARCHITECT_SYSTEM_PROMPT,
    CODEGEN_SYSTEM_PROMPT,
    REVIEWER_SYSTEM_PROMPT,
)
from services.orchestrator.app.schemas.state import (
    AgentPhase,
    ArchitectureBlueprint,
    GeneratedFile,
    OrchestrationState,
    ReviewResult,
)
from services.orchestrator.app.services.model_registry import model_registry

logger = structlog.get_logger()


def _create_llm(
    agent_name: str,
    state: OrchestrationState,
    temperature: float = 0.1,
) -> BaseChatModel:
    """Dynamically resolve and instantiate the LLM for the given agent."""
    # Combine state-level model_config with concept model_preferences
    merged_config = {
        **state.concept.model_preferences,
        **state.models_config,
    }
    return model_registry.create_llm(
        agent_name=agent_name,
        temperature=temperature,
        state_config=merged_config,
    )


def _log_agent_event(state: OrchestrationState, agent: str, action: str, detail: str = "") -> None:
    """Append an event to the agent history."""
    state.agent_history.append(
        {
            "agent": agent,
            "action": action,
            "detail": detail,
            "timestamp": time.time(),
        }
    )


# ============================================
# Node: Analyze Concept
# ============================================


async def analyze_concept(state: OrchestrationState) -> OrchestrationState:
    """Node 1: Analyze the user's business concept."""
    state.phase = AgentPhase.ANALYZING
    state.current_agent = "analyst"
    state.progress = 1
    _log_agent_event(state, "analyst", "started", "Analyzing business concept")

    llm = _create_llm("analyst", state, temperature=0.2)
    messages = [
        SystemMessage(
            content=(
                "Analyze this business concept and extract: domain, target users, "
                "core features, technical requirements, scale considerations, and "
                "competitive advantages. Output valid JSON."
            )
        ),
        HumanMessage(content=json.dumps(state.concept.model_dump())),
    ]

    response = await llm.ainvoke(messages)
    try:
        state.analysis = json.loads(response.content)
    except json.JSONDecodeError:
        state.analysis = {"raw_analysis": response.content}

    _log_agent_event(state, "analyst", "completed", "Concept analysis complete")
    logger.info("concept_analyzed", job_id=state.job_id)
    return state


# ============================================
# Node: Generate Architecture
# ============================================


async def generate_architecture(state: OrchestrationState) -> OrchestrationState:
    """Node 2: Generate a full architecture blueprint from the analysis."""
    state.phase = AgentPhase.ARCHITECTING
    state.current_agent = "architect"
    state.progress = 2
    _log_agent_event(state, "architect", "started", "Generating architecture blueprint")

    llm = _create_llm("architect", state, temperature=0.1)
    messages = [
        SystemMessage(content=ARCHITECT_SYSTEM_PROMPT),
        HumanMessage(
            content=json.dumps(
                {
                    "concept": state.concept.model_dump(),
                    "analysis": state.analysis,
                }
            )
        ),
    ]

    response = await llm.ainvoke(messages)
    try:
        arch_data = json.loads(response.content)
        state.architecture = ArchitectureBlueprint(**arch_data)
    except (json.JSONDecodeError, Exception) as e:
        logger.error("architecture_parse_error", error=str(e), job_id=state.job_id)
        state.architecture = ArchitectureBlueprint(
            project_name=state.concept.description[:50].lower().replace(" ", "-"),
            overview=response.content[:500],
            tech_stack={},
            services=[],
            database_schema={},
            api_endpoints=[],
            file_structure=[],
            deployment={},
        )

    _log_agent_event(
        state, "architect", "completed", f"Blueprint: {state.architecture.project_name}"
    )
    logger.info(
        "architecture_generated", job_id=state.job_id, project=state.architecture.project_name
    )
    return state


# ============================================
# Node: Generate Code
# ============================================


async def generate_code(state: OrchestrationState) -> OrchestrationState:
    """Node 3: Generate source code files from the architecture."""
    if state.architecture is None:
        state.phase = AgentPhase.ERROR
        state.error_message = "No architecture blueprint available for code generation."
        return state

    state.phase = AgentPhase.GENERATING
    state.current_agent = "codegen"
    state.progress = 3
    _log_agent_event(state, "codegen", "started", "Generating source code")

    llm = _create_llm("codegen", state, temperature=0.0)

    # Generate files in batches by service/module
    file_groups = _group_files_by_directory(state.architecture.file_structure)

    for group_name, file_paths in file_groups.items():
        _log_agent_event(state, "codegen", "generating", f"Module: {group_name}")

        messages = [
            SystemMessage(content=CODEGEN_SYSTEM_PROMPT),
            HumanMessage(
                content=json.dumps(
                    {
                        "architecture": state.architecture.model_dump(),
                        "files_to_generate": file_paths,
                        "module": group_name,
                    }
                )
            ),
        ]

        response = await llm.ainvoke(messages)
        try:
            files_data = json.loads(response.content)
            if isinstance(files_data, list):
                for fd in files_data:
                    state.generated_files.append(
                        GeneratedFile(
                            path=fd.get("path", "unknown"),
                            content=fd.get("content", ""),
                            language=fd.get("language", "text"),
                            size_bytes=len(fd.get("content", "").encode()),
                        )
                    )
        except json.JSONDecodeError:
            logger.warning("codegen_parse_warning", group=group_name, job_id=state.job_id)

    _log_agent_event(state, "codegen", "completed", f"Generated {len(state.generated_files)} files")
    logger.info("code_generated", job_id=state.job_id, file_count=len(state.generated_files))
    return state


# ============================================
# Node: Review Code
# ============================================


async def review_code(state: OrchestrationState) -> OrchestrationState:
    """Node 4: Review generated code for quality and security."""
    state.phase = AgentPhase.REVIEWING
    state.current_agent = "reviewer"
    state.progress = 4
    _log_agent_event(state, "reviewer", "started", "Reviewing generated code")

    llm = _create_llm("reviewer", state, temperature=0.0)

    # Review in batches of 5 files
    batch_size = 5
    for i in range(0, len(state.generated_files), batch_size):
        batch = state.generated_files[i : i + batch_size]
        messages = [
            SystemMessage(content=REVIEWER_SYSTEM_PROMPT),
            HumanMessage(
                content=json.dumps(
                    [{"path": f.path, "content": f.content, "language": f.language} for f in batch]
                )
            ),
        ]

        response = await llm.ainvoke(messages)
        try:
            reviews = json.loads(response.content)
            if isinstance(reviews, list):
                for r in reviews:
                    state.review_results.append(
                        ReviewResult(
                            file_path=r.get("file_path", "unknown"),
                            passed=r.get("passed", True),
                            issues=r.get("issues", []),
                            suggestions=r.get("suggestions", []),
                            quality_score=r.get("quality_score", 0.8),
                        )
                    )
        except json.JSONDecodeError:
            logger.warning("review_parse_warning", batch=i, job_id=state.job_id)

    state.phase = AgentPhase.COMPLETE
    state.completed_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    _log_agent_event(state, "reviewer", "completed", f"Reviewed {len(state.review_results)} files")
    logger.info("review_completed", job_id=state.job_id, reviews=len(state.review_results))
    return state


# ============================================
# Helpers
# ============================================


def _group_files_by_directory(file_paths: list[str]) -> dict[str, list[str]]:
    """Group file paths by their top-level directory."""
    groups: dict[str, list[str]] = {}
    for path in file_paths:
        parts = path.split("/")
        group = parts[0] if len(parts) > 1 else "root"
        groups.setdefault(group, []).append(path)
    return groups


# ============================================
# Graph Builder
# ============================================


def build_orchestration_graph():
    """Build the LangGraph state machine for code generation.

    Pipeline: analyze → architect → [approval gate] → codegen → review → complete
    """
    try:
        from langgraph.graph import END, StateGraph

        workflow = StateGraph(OrchestrationState)

        workflow.add_node("analyze", analyze_concept)
        workflow.add_node("architect", generate_architecture)
        workflow.add_node("codegen", generate_code)
        workflow.add_node("review", review_code)

        workflow.set_entry_point("analyze")
        workflow.add_edge("analyze", "architect")

        def should_generate(state: OrchestrationState) -> str:
            if state.architecture_approved:
                return "codegen"
            if state.phase == AgentPhase.ERROR:
                return END
            return "codegen"

        workflow.add_conditional_edges(
            "architect", should_generate, {"codegen": "codegen", END: END}
        )
        workflow.add_edge("codegen", "review")
        workflow.add_edge("review", END)

        return workflow.compile()
    except ImportError:
        logger.warning("langgraph_not_installed", msg="LangGraph not available, returning None")
        return None
