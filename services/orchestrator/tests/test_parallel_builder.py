"""Unit tests for the Architect Intake and Parallel Builder Core."""

from __future__ import annotations

import pytest

from services.orchestrator.app.agents.parallel_builder import (
    ArchitectureBlueprint,
    ParallelBuilderCore,
    ZeroQuestionIntakeEngine,
)


@pytest.mark.asyncio
class TestParallelBuilder:
    """Tests for zero-question intake and parallel build sessions."""

    @pytest.fixture
    def intake(self) -> ZeroQuestionIntakeEngine:
        return ZeroQuestionIntakeEngine()

    @pytest.fixture
    def builder(self, tmp_path) -> ParallelBuilderCore:
        return ParallelBuilderCore(base_workspace_dir=str(tmp_path))

    async def test_zero_question_intake_blueprint(self, intake: ZeroQuestionIntakeEngine) -> None:
        concept = "Build a micro-finance loan origination engine for East African farmers"
        blueprint = await intake.generate_blueprint(concept_description=concept)

        assert blueprint is not None
        assert len(blueprint.project_name) > 0
        assert "FastAPI" in str(blueprint.tech_stack) or "Next.js" in str(blueprint.tech_stack)
        assert len(blueprint.file_structure) >= 3

    async def test_parallel_build_session_creation(self, builder: ParallelBuilderCore) -> None:
        blueprint = ArchitectureBlueprint(
            project_name="agri-loan",
            overview="Agri loan origination",
            tech_stack={"backend": "FastAPI"},
            services=[{"name": "api"}],
            database_schema={"loans": ["id", "amount"]},
            api_endpoints=[{"method": "POST", "path": "/loans"}],
            file_structure=["services/api/main.py", "apps/web/page.tsx"],
            deployment={"docker": True},
        )

        session = builder.create_session("agri-loan", blueprint, autopilot=True)
        assert session.session_id.startswith("build-")
        assert len(session.sub_agents) == 5

        # Execute parallel build
        updated_session = await builder.execute_parallel_build(session.session_id)
        assert updated_session.status == "complete"
        assert len(updated_session.generated_files) == 2
        assert len(updated_session.test_results) == 3
