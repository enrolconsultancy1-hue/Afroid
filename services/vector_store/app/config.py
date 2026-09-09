"""Vector Store Service Configuration."""

from services.shared.config import BaseAppSettings


class VectorStoreSettings(BaseAppSettings):
    """Vector-store microservice configuration."""

    google_api_key: str = ""
    embedding_model: str = "models/text-embedding-004"
    embedding_dimension: int = 768
    similarity_threshold: float = 0.70
    max_results: int = 20
    chunk_size: int = 1000
    chunk_overlap: int = 200


settings = VectorStoreSettings()
