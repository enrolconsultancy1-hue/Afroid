FROM python:3.12-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc libffi-dev && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock* ./
COPY services/shared/ services/shared/
COPY services/certify/pyproject.toml services/certify/
COPY services/certify/app/ services/certify/app/
RUN uv sync --no-dev --no-install-workspace --package afroid-certify

FROM python:3.12-slim AS runtime
WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"
COPY services/shared/ services/shared/
COPY services/auth/ services/auth/
COPY services/certify/ services/certify/
RUN groupadd --system app && useradd --system --gid app app
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD python -c "import httpx; httpx.get('http://localhost:8080/health').raise_for_status()"
CMD ["uvicorn", "services.certify.app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]
