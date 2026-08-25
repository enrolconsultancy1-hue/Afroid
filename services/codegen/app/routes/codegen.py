"""CodeGen Service — API Routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from services.auth.app.middleware.auth_middleware import get_current_user
from services.auth.app.models.user import User
from services.codegen.app.engine.generator import CodeGenEngine
from services.codegen.app.schemas.codegen import (
    GenerateCodeRequest,
    GenerateCodeResponse,
    GeneratedFileResult,
    ValidateCodeRequest,
    ValidateCodeResponse,
)

router = APIRouter(prefix="/codegen", tags=["codegen"])
codegen_engine = CodeGenEngine()


@router.post("/generate", response_model=GenerateCodeResponse)
async def generate_code(
    body: GenerateCodeRequest,
    current_user: User = Depends(get_current_user),
) -> GenerateCodeResponse:
    """Generate multiple codebase files based on specs and templates."""
    results: list[GeneratedFileResult] = []

    for spec in body.file_specs:
        merged_context = {**body.global_context, **spec.context}
        file_res = await codegen_engine.generate_file(
            path=spec.path,
            description=spec.description,
            language=spec.language,
            template_name=spec.template_name,
            context=merged_context,
        )
        results.append(GeneratedFileResult(**file_res))

    all_valid = all(r.syntax_valid for r in results)

    return GenerateCodeResponse(
        project_name=body.project_name,
        total_files=len(results),
        files=results,
        all_valid=all_valid,
    )


@router.post("/validate", response_model=ValidateCodeResponse)
async def validate_code(
    body: ValidateCodeRequest,
    current_user: User = Depends(get_current_user),
) -> ValidateCodeResponse:
    """Validate syntax of code content."""
    valid, errors = codegen_engine.validate_syntax(body.content, body.language)
    return ValidateCodeResponse(
        path=body.path,
        valid=valid,
        errors=errors,
    )
