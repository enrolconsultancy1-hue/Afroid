# Blueprint 11: CI/CD Pipeline

> **Purpose**: Complete continuous integration and deployment pipeline specification.  
> **Rule**: All changes go through CI. No direct pushes to `main`.

---

## 1. Pipeline Architecture

```mermaid
graph LR
    subgraph "CI (GitHub Actions)"
        LINT["Lint<br/>(Ruff + ESLint)"]
        TYPE["Typecheck<br/>(mypy + tsc)"]
        TEST["Unit Tests<br/>(pytest + vitest)"]
        BUILD["Build<br/>(Docker images)"]
        SEC["Security Scan<br/>(Trivy + Snyk)"]
    end

    subgraph "CD (Cloud Build)"
        PUSH["Push to<br/>Artifact Registry"]
        DEP_STG["Deploy to<br/>Staging"]
        INT["Integration<br/>Tests"]
        DEP_PROD["Deploy to<br/>Production"]
    end

    LINT --> TYPE --> TEST --> BUILD --> SEC
    SEC -->|merge to main| PUSH
    PUSH --> DEP_STG --> INT
    INT -->|pass| DEP_PROD
```

---

## 2. Git Workflow

### Branch Strategy: Trunk-Based Development

```
main (production)
  ├── feature/IDE-123-add-file-tree     # Feature branches
  ├── fix/IDE-456-fix-auth-redirect     # Bug fix branches
  └── release/v1.2.0                    # Release branches (optional)
```

### Branch Rules

| Rule | Setting |
|------|---------|
| Required reviewers | 1 minimum |
| Required CI checks | lint, typecheck, test, security-scan |
| Allow force push | No |
| Delete branch on merge | Yes |
| Merge strategy | Squash merge |
| Commit format | Conventional Commits |

### Conventional Commits

```
feat(ide): add file tree component
fix(auth): resolve OAuth redirect loop
docs(api): update endpoint documentation
chore(deps): update fastapi to 0.115.2
refactor(codegen): extract template engine
test(certify): add rule engine unit tests
ci: add staging deployment step
perf(vector): optimize HNSW index parameters
```

---

## 3. GitHub Actions Workflows

### 3.1 CI Pipeline (Pull Requests)

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

env:
  PYTHON_VERSION: "3.12"
  NODE_VERSION: "20"
  UV_VERSION: "0.4"

jobs:
  # ==========================================
  # Detect changed services
  # ==========================================
  changes:
    runs-on: ubuntu-latest
    outputs:
      frontend: ${{ steps.filter.outputs.frontend }}
      backend: ${{ steps.filter.outputs.backend }}
      infra: ${{ steps.filter.outputs.infra }}
      services: ${{ steps.filter.outputs.services }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            frontend:
              - 'apps/web/**'
              - 'packages/**'
            backend:
              - 'services/**'
            infra:
              - 'infra/**'

  # ==========================================
  # Frontend CI
  # ==========================================
  frontend-lint:
    needs: changes
    if: needs.changes.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npx turbo lint --filter='./apps/*' --filter='./packages/*'

  frontend-typecheck:
    needs: changes
    if: needs.changes.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npx turbo typecheck --filter='./apps/*' --filter='./packages/*'

  frontend-test:
    needs: changes
    if: needs.changes.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npx turbo test --filter='./apps/*' --filter='./packages/*'
      - uses: actions/upload-artifact@v4
        with:
          name: frontend-coverage
          path: apps/web/coverage/

  frontend-build:
    needs: [frontend-lint, frontend-typecheck, frontend-test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npx turbo build --filter='./apps/*'

  # ==========================================
  # Backend CI
  # ==========================================
  backend-lint:
    needs: changes
    if: needs.changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
        with:
          version: ${{ env.UV_VERSION }}
      - run: uv sync --all-packages
      - run: uv run ruff check services/
      - run: uv run ruff format --check services/

  backend-typecheck:
    needs: changes
    if: needs.changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
        with:
          version: ${{ env.UV_VERSION }}
      - run: uv sync --all-packages
      - run: uv run mypy services/ --strict

  backend-test:
    needs: changes
    if: needs.changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
      mongo:
        image: mongo:7
        ports: ['27017:27017']
        env:
          MONGO_INITDB_ROOT_USERNAME: test
          MONGO_INITDB_ROOT_PASSWORD: test
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
        with:
          version: ${{ env.UV_VERSION }}
      - run: uv sync --all-packages
      - run: |
          uv run pytest services/ \
            --cov=services \
            --cov-report=xml \
            --cov-report=html \
            --cov-fail-under=80 \
            -x -v
        env:
          DATABASE_URL: postgresql+asyncpg://test:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379/0
          MONGODB_URL: mongodb://test:test@localhost:27017/test?authSource=admin
      - uses: actions/upload-artifact@v4
        with:
          name: backend-coverage
          path: htmlcov/

  # ==========================================
  # Security Scan
  # ==========================================
  security-scan:
    needs: changes
    if: needs.changes.outputs.frontend == 'true' || needs.changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Python dependency scan
      - name: Scan Python dependencies
        run: |
          pip install safety
          safety check --file services/shared/pyproject.toml --json || true
      
      # Node dependency scan
      - name: Scan Node dependencies
        run: npx audit-ci --high
      
      # Secret detection
      - name: Detect secrets
        uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified

  # ==========================================
  # Docker Build (on merge to main)
  # ==========================================
  docker-build:
    needs: [frontend-build, backend-test, security-scan]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service:
          - auth
          - platform
          - orchestrator
          - codegen
          - certify
          - incubate
          - vector-store
          - notification
          - web
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      - uses: google-github-actions/setup-gcloud@v2
      - run: gcloud auth configure-docker ${{ vars.GCP_REGION }}-docker.pkg.dev
      
      - name: Build and push
        run: |
          IMAGE="${{ vars.GCP_REGION }}-docker.pkg.dev/${{ vars.GCP_PROJECT }}/afroid/${{ matrix.service }}"
          docker build \
            -f services/${{ matrix.service }}/Dockerfile \
            -t ${IMAGE}:${{ github.sha }} \
            -t ${IMAGE}:latest \
            .
          docker push ${IMAGE} --all-tags
```

### 3.2 CD Pipeline (Cloud Build)

```yaml
# cloudbuild.yaml — Triggered on push to Artifact Registry
steps:
  # Deploy to Staging
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        for service in auth platform orchestrator codegen certify incubate vector-store notification web; do
          gcloud run deploy $service \
            --image=${_REGION}-docker.pkg.dev/${PROJECT_ID}/afroid/$service:${COMMIT_SHA} \
            --region=${_REGION} \
            --project=${_STAGING_PROJECT} \
            --quiet
        done
    id: 'deploy-staging'

  # Run Integration Tests
  - name: 'python:3.12-slim'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        pip install httpx pytest
        pytest tests/integration/ \
          --base-url=https://staging.afroid.io \
          -v --tb=short
    id: 'integration-tests'
    waitFor: ['deploy-staging']

  # Deploy to Production (manual approval gate in Cloud Build)
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        for service in auth platform orchestrator codegen certify incubate vector-store notification web; do
          gcloud run deploy $service \
            --image=${_REGION}-docker.pkg.dev/${PROJECT_ID}/afroid/$service:${COMMIT_SHA} \
            --region=${_REGION} \
            --project=${_PROD_PROJECT} \
            --quiet
        done
    id: 'deploy-production'
    waitFor: ['integration-tests']

substitutions:
  _REGION: 'africa-south1'
  _STAGING_PROJECT: 'afroid-staging'
  _PROD_PROJECT: 'afroid-production'

options:
  logging: CLOUD_LOGGING_ONLY
```

---

## 4. Docker Strategy

### 4.1 Python Service Dockerfile

```dockerfile
# services/<service>/Dockerfile

# ---- Build Stage ----
FROM python:3.12-slim AS builder

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files
COPY pyproject.toml uv.lock ./
COPY services/shared/ services/shared/
COPY services/${SERVICE_NAME}/pyproject.toml services/${SERVICE_NAME}/

# Install dependencies (cached layer)
RUN uv sync --frozen --no-dev --no-editable

# ---- Runtime Stage ----
FROM python:3.12-slim AS runtime

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Copy application code
COPY services/shared/ services/shared/
COPY services/${SERVICE_NAME}/ services/${SERVICE_NAME}/

# Security: non-root user
RUN addgroup --system app && adduser --system --group app
USER app

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import httpx; httpx.get('http://localhost:8080/health').raise_for_status()"

EXPOSE 8080

CMD ["uvicorn", "services.${SERVICE_NAME}.app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

### 4.2 Next.js Dockerfile

```dockerfile
# apps/web/Dockerfile

# ---- Dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/ packages/
RUN npm ci --production=false

# ---- Build ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx turbo build --filter=web

# ---- Runtime ----
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 app
RUN adduser --system --uid 1001 app

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

USER app

EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
```

---

## 5. Pre-Commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-json
      - id: check-added-large-files
        args: ['--maxkb=1000']
      - id: no-commit-to-branch
        args: ['--branch', 'main']

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.6.0
    hooks:
      - id: ruff
        args: ['--fix']
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.11.0
    hooks:
      - id: mypy
        args: ['--strict']
        additional_dependencies: ['types-all']

  - repo: https://github.com/commitizen-tools/commitizen
    rev: v3.29.0
    hooks:
      - id: commitizen
        stages: [commit-msg]
```

---

## 6. Database Migration Pipeline

```yaml
# Migrations run automatically before deployment

# Strategy: Forward-only migrations
# - Alembic generates migration files
# - CI validates migrations can be applied cleanly
# - CD applies migrations before deploying new code
# - Rollback = new forward migration that reverses changes

# Migration CI check
migration-check:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: pgvector/pgvector:pg16
      env:
        POSTGRES_USER: test
        POSTGRES_PASSWORD: test
        POSTGRES_DB: test
      ports: ['5432:5432']
  steps:
    - uses: actions/checkout@v4
    - run: |
        uv run alembic upgrade head    # Apply all migrations
        uv run alembic downgrade -1    # Test last downgrade
        uv run alembic upgrade head    # Re-apply
        uv run alembic check           # Verify no pending changes
```

---

## 7. Environment Promotion Flow

```mermaid
graph LR
    DEV["Development<br/>(local + dev project)"]
    STG["Staging<br/>(afroid-staging)"]
    PROD["Production<br/>(afroid-production)"]

    DEV -->|"merge to main<br/>auto-deploy"| STG
    STG -->|"integration tests pass<br/>manual approval"| PROD

    style DEV fill:#4CAF50,color:#fff
    style STG fill:#FF9800,color:#fff
    style PROD fill:#f44336,color:#fff
```

| Environment | Deploy Trigger | Approval | Tests Required |
|-------------|----------------|----------|----------------|
| Development | Commit to feature branch | None | Lint + Unit |
| Staging | Merge to `main` | Automatic | Lint + Unit + Build + Security |
| Production | After staging tests pass | Manual (1 approver) | Integration + E2E |

---

## 8. Rollback Strategy

```bash
# Immediate rollback: revert to previous Cloud Run revision
gcloud run services update-traffic <service> \
  --to-revisions=<previous-revision>=100 \
  --region=africa-south1

# Database rollback: forward migration
uv run alembic revision --autogenerate -m "rollback_<feature>"
uv run alembic upgrade head
```

---

> **End of Blueprints. Return to**: [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
