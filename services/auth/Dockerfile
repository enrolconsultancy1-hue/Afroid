# ============================================
# Afroid Auth Service — Production Dockerfile
# ============================================
# Multi-stage build for minimal image size.
# ============================================

# ---- Build Stage ----
FROM python:3.12-slim AS builder

WORKDIR /app

# Install system deps for argon2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy workspace files for dependency resolution
COPY pyproject.toml uv.lock ./
COPY services/shared/pyproject.toml services/shared/
COPY services/auth/pyproject.toml services/auth/

# Install dependencies only (cached layer)
RUN uv sync --frozen --no-dev --package afroid-auth

# ---- Runtime Stage ----
FROM python:3.12-slim AS runtime

WORKDIR /app

# Copy virtualenv from builder
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Copy source code
COPY services/shared/ services/shared/
COPY services/auth/ services/auth/

# Non-root user for security
RUN groupadd --system app && useradd --system --gid app app
USER app

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8080/health').raise_for_status()"

EXPOSE 8080

CMD ["uvicorn", "services.auth.app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]
