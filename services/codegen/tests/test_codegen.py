"""Unit tests for the CodeGen engine and AST validation."""

from __future__ import annotations

import pytest

from services.codegen.app.engine.generator import CodeGenEngine


class TestCodeGenEngine:
    """Tests for template rendering, code generation, and syntax validation."""

    @pytest.fixture
    def engine(self) -> CodeGenEngine:
        return CodeGenEngine()

    def test_python_syntax_validation(self, engine: CodeGenEngine) -> None:
        valid_code = "def hello():\n    return 'world'\n"
        is_valid, errors = engine.validate_syntax(valid_code, "python")
        assert is_valid is True
        assert len(errors) == 0

        invalid_code = "def broken(\n    return 42"
        is_valid, errors = engine.validate_syntax(invalid_code, "python")
        assert is_valid is False
        assert len(errors) >= 1

    def test_json_syntax_validation(self, engine: CodeGenEngine) -> None:
        valid_json = '{"name": "afroid", "version": "1.0.0"}'
        is_valid, errors = engine.validate_syntax(valid_json, "json")
        assert is_valid is True

        invalid_json = '{"name": "afroid", '
        is_valid, errors = engine.validate_syntax(invalid_json, "json")
        assert is_valid is False

    @pytest.mark.asyncio
    async def test_fastapi_template_generation(self, engine: CodeGenEngine) -> None:
        ctx = {
            "service_name": "payment-service",
            "project_name": "PayAfroid",
            "description": "Mobile money payment gateway",
            "routes": [
                {
                    "method": "POST",
                    "path": "/charge",
                    "handler_name": "create_charge",
                    "description": "Create a new payment charge",
                }
            ],
        }

        result = await engine.generate_file(
            path="app/main.py",
            description="Main FastAPI application",
            language="python",
            template_name="fastapi_main",
            context=ctx,
        )

        assert result["path"] == "app/main.py"
        assert result["syntax_valid"] is True
        assert "PayAfroid API" in result["content"]
        assert "create_charge" in result["content"]
