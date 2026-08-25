"""CodeGen Service Configuration."""

from services.shared.config import BaseAppSettings


class CodeGenSettings(BaseAppSettings):
    """CodeGen microservice configuration."""

    gemini_model: str = "gemini-flash-latest"
    max_output_tokens: int = 65536
    temperature: float = 0.0
    enable_ast_validation: bool = True


settings = CodeGenSettings()
