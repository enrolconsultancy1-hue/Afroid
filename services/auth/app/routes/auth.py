"""Auth Service — API route handlers for authentication endpoints."""

from __future__ import annotations

import asyncio
import hashlib
import json
import uuid
from datetime import UTC, datetime, timedelta
from urllib.error import HTTPError, URLError
from urllib.request import Request as URLRequest, urlopen

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.auth.app.config import settings
from services.auth.app.middleware.auth_middleware import get_current_user
from services.auth.app.models.user import RefreshToken, User
from services.auth.app.schemas.auth import (
    AuthResponse,
    GoogleLoginRequest,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from services.auth.app.services.jwt_service import JWTService
from services.auth.app.services.password_service import PasswordService
from services.shared.exceptions import ConflictError, UnauthorizedError

router = APIRouter(prefix="/auth", tags=["authentication"])


def _get_session(request: Request) -> AsyncSession:
    """Extract DB session from request state."""
    return request.state.db_session


def _hash_refresh_token(token: str) -> str:
    """SHA-256 hash a refresh token for safe storage."""
    return hashlib.sha256(token.encode()).hexdigest()


async def _create_tokens_and_store(
    session: AsyncSession,
    user: User,
    device_info: str | None = None,
) -> TokenResponse:
    """Create JWT access + refresh tokens, store refresh token in DB."""
    access_token = JWTService.create_access_token(
        user_id=user.id,
        email=user.email,
        role=user.role,
    )
    raw_refresh_token = JWTService.create_refresh_token()

    # Store hashed refresh token
    refresh_record = RefreshToken(
        id=uuid.uuid4(),
        user_id=user.id,
        token_hash=_hash_refresh_token(raw_refresh_token),
        device_info=device_info,
        expires_at=datetime.now(UTC) + timedelta(days=settings.jwt_refresh_token_expire_days),
    )
    session.add(refresh_record)
    await session.flush()

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        token_type="Bearer",
        expires_in=JWTService.get_token_expiry_seconds(),
    )


# ============================================
# POST /auth/register
# ============================================
@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(
    request: Request,
    body: RegisterRequest,
) -> AuthResponse:
    """Create a new user account and return JWT tokens."""
    session = _get_session(request)

    # Check for existing email
    existing = await session.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none() is not None:
        raise ConflictError(detail="An account with this email already exists.")

    # Create user
    user = User(
        id=uuid.uuid4(),
        email=body.email,
        password_hash=PasswordService.hash_password(body.password),
        full_name=body.full_name,
        role="user",
        is_verified=False,
        is_active=True,
    )
    session.add(user)
    await session.flush()

    # Generate tokens
    device_info = request.headers.get("User-Agent")
    tokens = await _create_tokens_and_store(session, user, device_info)

    return AuthResponse(
        user=UserResponse.model_validate(user),
        tokens=tokens,
    )


# ============================================
# POST /auth/login
# ============================================
@router.post("/login", response_model=AuthResponse)
async def login(
    request: Request,
    body: LoginRequest,
) -> AuthResponse:
    """Authenticate with email and password, return JWT tokens."""
    session = _get_session(request)

    # Find user
    result = await session.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user is None or user.password_hash is None:
        raise UnauthorizedError(detail="Invalid email or password.")

    if not PasswordService.verify_password(body.password, user.password_hash):
        raise UnauthorizedError(detail="Invalid email or password.")

    if not user.is_active:
        raise UnauthorizedError(detail="Account has been deactivated.")

    # Rehash if needed (config changed since last hash)
    if PasswordService.needs_rehash(user.password_hash):
        user.password_hash = PasswordService.hash_password(body.password)

    # Update last login
    user.last_login_at = datetime.now(UTC)

    # Generate tokens
    device_info = request.headers.get("User-Agent")
    tokens = await _create_tokens_and_store(session, user, device_info)

    return AuthResponse(
        user=UserResponse.model_validate(user),
        tokens=tokens,
    )


# ============================================
# POST /auth/refresh
# ============================================
@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    request: Request,
    body: RefreshRequest,
) -> TokenResponse:
    """Refresh access token using a valid refresh token. Implements token rotation."""
    session = _get_session(request)

    # Find refresh token by hash
    token_hash = _hash_refresh_token(body.refresh_token)
    result = await session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    refresh_record = result.scalar_one_or_none()

    if refresh_record is None:
        raise UnauthorizedError(detail="Invalid refresh token.")

    if refresh_record.expires_at < datetime.now(UTC):
        await session.delete(refresh_record)
        raise UnauthorizedError(detail="Refresh token has expired.")

    # Get user
    user_result = await session.execute(
        select(User).where(User.id == refresh_record.user_id)
    )
    user = user_result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise UnauthorizedError(detail="User not found or deactivated.")

    # Token rotation: delete old, create new
    await session.delete(refresh_record)

    device_info = request.headers.get("User-Agent")
    return await _create_tokens_and_store(session, user, device_info)


# ============================================
# POST /auth/logout
# ============================================
@router.post("/logout", status_code=204)
async def logout(
    request: Request,
    body: LogoutRequest,
    _current_user: User = Depends(get_current_user),
) -> None:
    """Revoke a refresh token (logout)."""
    session = _get_session(request)

    token_hash = _hash_refresh_token(body.refresh_token)
    result = await session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    refresh_record = result.scalar_one_or_none()

    if refresh_record is not None:
        await session.delete(refresh_record)


# ============================================
# GET /auth/me
# ============================================
@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Get the currently authenticated user's profile."""
    return UserResponse.model_validate(current_user)

# ============================================
# POST /auth/google
# ============================================
GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo?id_token={}"


def _verify_google_id_token(id_token: str) -> dict:
    """Verify a Google ID token via Google's tokeninfo endpoint."""
    req = URLRequest(GOOGLE_TOKENINFO_URL.format(id_token), method="GET")
    try:
        with urlopen(req, timeout=5) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except (HTTPError, URLError, ValueError) as exc:
        raise UnauthorizedError(detail="Invalid Google token.") from exc

    if payload.get("error"):
        raise UnauthorizedError(detail="Invalid Google token.")

    if settings.google_client_id and payload.get("aud") != settings.google_client_id:
        raise UnauthorizedError(detail="Google token audience mismatch.")

    if not payload.get("email_verified"):
        raise UnauthorizedError(detail="Google account email is not verified.")

    return payload


@router.post("/google", response_model=AuthResponse)
async def google_login(
    request: Request,
    body: GoogleLoginRequest,
) -> AuthResponse:
    """Sign in (or register) using a Google ID token."""
    session = _get_session(request)

    payload = await asyncio.to_thread(_verify_google_id_token, body.id_token)

    email = payload.get("email")
    if not email:
        raise UnauthorizedError(detail="Google token missing email.")

    name = payload.get("name") or email.split("@")[0]
    picture = payload.get("picture")

    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            id=uuid.uuid4(),
            email=email,
            password_hash=None,
            full_name=name,
            avatar_url=picture,
            role="user",
            is_verified=True,
            is_active=True,
        )
        session.add(user)
        await session.flush()
    else:
        user.avatar_url = user.avatar_url or picture
        user.is_verified = True
        user.last_login_at = datetime.now(UTC)

    device_info = request.headers.get("User-Agent")
    tokens = await _create_tokens_and_store(session, user, device_info)

    return AuthResponse(user=UserResponse.model_validate(user), tokens=tokens)
