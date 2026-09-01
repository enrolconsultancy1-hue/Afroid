FROM python:3.12-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc libffi-dev git && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock* ./
COPY services/shared/ services/shared/
COPY services/workspace/pyproject.toml services/workspace/
COPY services/workspace/app/ services/workspace/app/
COPY services/workspace/tests/ services/workspace/tests/
RUN uv sync --no-dev --package afroid-workspace

FROM python:3.12-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"
COPY services/shared/ services/shared/
COPY services/workspace/ services/workspace/
RUN groupadd --system app && useradd --system --gid app app \
    && mkdir -p /app/workspaces && chown -R app:app /app/workspaces
USER app
ENV WORKSPACE_ROOT=/app/workspaces
EXPOSE 8080
VOLUME ["/app/workspaces"]
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD python -c "import httpx; httpx.get('http://localhost:8080/health').raise_for_status()"
CMD ["uvicorn", "services.workspace.app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]
