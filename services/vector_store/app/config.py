"""Vector Store Service Configuration."""

from services.shared.config import BaseAppSettings


class VectorStoreSettings(BaseAppSettings):
    """Vector store configuration."""

    embedding_model: str = "models/gemini-embedding-001"
    embedding_dimension: int = 768
    similarity_threshold: float = 0.70
    max_batch_size: int = 64


settings = VectorStoreSettings()
