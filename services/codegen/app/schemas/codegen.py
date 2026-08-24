"""CodeGen Service — Pydantic Schemas."""

from __future__ import annotations

import uuid
from typing import Any

from pydantic import BaseModel, Field


class FileSpec(BaseModel):
    path: str
    description: str
    language: str = "python"
    template_name: str | None = None
    context: dict[str, Any] = {}


class GenerateCodeRequest(BaseModel):
    project_name: str
    file_specs: list[FileSpec]
    global_context: dict[str, Any] = {}


class GeneratedFileResult(BaseModel):
    path: str
    content: str
    language: str
    size_bytes: int
    syntax_valid: bool = True
    errors: list[str] = []


class GenerateCodeResponse(BaseModel):
    project_name: str
    total_files: int
    files: list[GeneratedFileResult]
    all_valid: bool


class ValidateCodeRequest(BaseModel):
    path: str
    content: str
    language: str


class ValidateCodeResponse(BaseModel):
    path: str
    valid: bool
    errors: list[str] = []
