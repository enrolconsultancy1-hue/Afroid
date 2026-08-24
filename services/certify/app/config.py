"""Certify Service Configuration."""

from services.shared.config import BaseAppSettings


class CertifySettings(BaseAppSettings):
    """Certify microservice configuration."""

    minhash_num_perm: int = 128
    minhash_shingle_size: int = 5
    certificate_issuer_name: str = "Afroid Sovereign Certification Authority"
    certificate_validity_days: int = 365


settings = CertifySettings()
