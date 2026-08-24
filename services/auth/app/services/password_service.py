"""Password hashing service using Argon2id."""

from __future__ import annotations

from passlib.context import CryptContext

# Argon2id configuration — memory-hard hashing for security
_pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__time_cost=3,
    argon2__memory_cost=65536,  # 64 MB
    argon2__parallelism=4,
    argon2__hash_len=32,
    argon2__salt_len=16,
)


class PasswordService:
    """Handles password hashing and verification."""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a plaintext password with Argon2id."""
        return _pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a plaintext password against its hash."""
        return _pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def needs_rehash(hashed_password: str) -> bool:
        """Check if a hash needs to be re-hashed due to config changes."""
        return _pwd_context.needs_update(hashed_password)
