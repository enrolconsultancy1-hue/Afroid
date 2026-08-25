"""Unit tests for password and JWT services."""

from __future__ import annotations

import uuid

import pytest

from services.auth.app.services.jwt_service import JWTService
from services.auth.app.services.password_service import PasswordService


class TestPasswordService:
    """Tests for Argon2id password hashing."""

    def test_hash_password(self) -> None:
        """Hashing produces a non-empty hash different from the input."""
        password = "SecurePass123"  # noqa: S105
        hashed = PasswordService.hash_password(password)
        assert hashed
        assert hashed != password
        assert hashed.startswith("$argon2")

    def test_verify_correct_password(self) -> None:
        """Correct password verifies successfully."""
        password = "SecurePass123"  # noqa: S105
        hashed = PasswordService.hash_password(password)
        assert PasswordService.verify_password(password, hashed) is True

    def test_verify_wrong_password(self) -> None:
        """Wrong password fails verification."""
        hashed = PasswordService.hash_password("SecurePass123")
        assert PasswordService.verify_password("WrongPass456", hashed) is False

    def test_different_hashes_for_same_password(self) -> None:
        """Same password produces different hashes (random salt)."""
        password = "SecurePass123"  # noqa: S105
        hash1 = PasswordService.hash_password(password)
        hash2 = PasswordService.hash_password(password)
        assert hash1 != hash2
        # But both should verify
        assert PasswordService.verify_password(password, hash1) is True
        assert PasswordService.verify_password(password, hash2) is True


class TestJWTService:
    """Tests for JWT token creation and validation."""

    def test_create_access_token(self) -> None:
        """Access token creation returns a non-empty string."""
        user_id = uuid.uuid4()
        token = JWTService.create_access_token(
            user_id=user_id,
            email="test@example.com",
            role="user",
        )
        assert token
        assert isinstance(token, str)
        assert len(token.split(".")) == 3  # JWT has 3 parts

    def test_decode_access_token(self) -> None:
        """Decoding a valid token returns correct payload."""
        user_id = uuid.uuid4()
        email = "test@example.com"
        token = JWTService.create_access_token(
            user_id=user_id,
            email=email,
            role="user",
        )
        payload = JWTService.decode_access_token(token)
        assert payload["sub"] == str(user_id)
        assert payload["email"] == email
        assert payload["role"] == "user"
        assert "exp" in payload
        assert "iat" in payload
        assert "jti" in payload

    def test_decode_invalid_token(self) -> None:
        """Decoding an invalid token raises JWTError."""
        from jose import JWTError

        with pytest.raises(JWTError):
            JWTService.decode_access_token("invalid.jwt.token")

    def test_create_refresh_token(self) -> None:
        """Refresh token is a non-empty string."""
        token = JWTService.create_refresh_token()
        assert token
        assert isinstance(token, str)
        assert len(token) > 32  # Should be long enough

    def test_refresh_tokens_are_unique(self) -> None:
        """Each refresh token should be unique."""
        tokens = {JWTService.create_refresh_token() for _ in range(100)}
        assert len(tokens) == 100

    def test_extra_claims(self) -> None:
        """Extra claims are included in the token payload."""
        user_id = uuid.uuid4()
        token = JWTService.create_access_token(
            user_id=user_id,
            email="test@example.com",
            role="admin",
            extra_claims={"org_id": "org-123"},
        )
        payload = JWTService.decode_access_token(token)
        assert payload["org_id"] == "org-123"
        assert payload["role"] == "admin"

    def test_token_expiry_seconds(self) -> None:
        """Token expiry returns correct seconds value."""
        seconds = JWTService.get_token_expiry_seconds()
        assert seconds == 30 * 60  # 30 minutes default
