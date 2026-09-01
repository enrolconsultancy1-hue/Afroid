# NEXT_TASK.md — Session Memory & Progress Tracker

> **Last Updated**: 2026-08-31T23:28:00-07:00
> **Current Phase**: Phase 7 — Production Readiness & Cloud Deployment
> **Status**: 🟢 Production Docker, Cloud Run Infra, Database Migrations, & E2E Validation 100% Verified

---

## 1. Accomplished In This Milestone

### ✅ Production Docker & Cloud Run Hardening
1. **Web Frontend Container (`apps/web/Dockerfile`)**:
   - Included `package-lock.json` and all workspace packages in the `deps` stage for deterministic `npm ci`.
   - Created `apps/web/public/.gitkeep` for clean Next.js asset copying.
   - Implemented Next.js `GET /health` Route Handler (`apps/web/src/app/health/route.ts`) on port 3000 to satisfy Cloud Run `startup_probe` and `liveness_probe`.

2. **Workspace Runtime Container (`services/workspace/Dockerfile`)**:
   - Installed `git` binary in the `runtime` stage (`python:3.12-slim`) to enable git route operations (`git_status`, `git_commit`) inside container environments.
   - Configured `ENV PYTHONPATH="/app"`.

3. **FastAPI Health Check Optimization**:
   - Added instant `/health` bypass to `db_session_middleware` across all 10 microservices (`auth`, `platform`, `orchestrator`, `certify`, `incubate`, `vector_store`, `codegen`, `notification`, `workspace`, `intake`), eliminating connection pool blocking on health probes.

4. **CI/CD Deployment Pipeline (`.github/workflows/deploy.yml`)**:
   - Added automated container build and deployment step for `afroid-web-prod` on port 3000 to Google Cloud Run.

5. **Database Migration Runner (`scripts/run_migrations.py`)**:
   - Built automated CLI runner for Alembic migrations supporting `--action [upgrade|current|heads|check]` with dynamic `DATABASE_URL` routing.

6. **Monorepo & Test Suite Validation**:
   - **TypeScript Typecheck**: 4/4 packages passed (`@afroid/dsl`, `@afroid/sdk`, `@afroid/ui`, `web`).
   - **Next.js Web Build**: 14/14 static & dynamic routes (including `ƒ /health`) compiled successfully.
   - **E2E 3 Master Flows (`scripts/integration_test.py`)**: 7/7 checks passed (Zero-question intake & codegen, RegTech compliance & SHA-256 audit chain, Vector matching & AI grant writing).
   - **Database Migrations**: Verified heads up to `002_kyc_users`.

---

## 2. Next Steps & Production Operations

1. **Trigger GitHub Actions Deployment Pipeline**:
   - Push to `main` branch to trigger `.github/workflows/deploy.yml` for automated Google Cloud Run builds (`afroid-*-prod`).

2. **Run Cloud SQL Migrations**:
   ```bash
   DATABASE_URL="postgresql+asyncpg://<USER>:<PASS>@<CLOUD_SQL_IP>:5432/afroid_prod" uv run python scripts/run_migrations.py --action upgrade
   ```

3. **Configure Secret Manager / Environment Variables**:
   - Verify that Google Cloud Secret Manager keys (`DATABASE_URL`, `JWT_SECRET_KEY`, `GOOGLE_API_KEY`) match production runtime configurations.

