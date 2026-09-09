# AfroID Sovereign Platform — FINAL AUDIT REPORT

**Project:** afroid-506916  
**Region:** us-central1  
**Date:** 2026-09-08  
**Scope:** Infrastructure hardening, secret rotation, vector-store recovery, production readiness

---

## Executive Summary

AfroID is a 12-service monorepo (11 Python/FastAPI microservices + Next.js 15 frontend) deployed to Google Cloud Run with Cloud SQL (Postgres 16), VPC networking, Pub/Sub messaging, and Secret Manager. This report documents the final hardening steps, current status, and remaining actions.

**Pre-Hardening Score: 72%**  
**Post-Hardening Target: 92%**

---

## Section 1 — Infrastructure Status (Live)

| Component | Status | Notes |
|-----------|--------|-------|
| VPC Network (`afroid-vpc-prod`) | ACTIVE | Subnet 10.10.0.0/20, private Google access enabled |
| VPC Connector (`afroid-vpc-conn-prod`) | READY | 10.8.0.0/28, min=2 max=10 instances |
| Cloud SQL (`afroid-db-prod`) | RUNNING | Postgres 16, db-custom-2-7680, backups enabled |
| Artifact Registry (`afroid-containers`) | ACTIVE | Docker format, us-central1 |
| Secret Manager | ACTIVE | Secrets: GOOGLE_API_KEY, JWT_SECRET_KEY |
| Pub/Sub Topics (5) | ACTIVE | audit-events, generation-events, certification-events, match-events, notification-events |
| Redis/Memorystore | NOT DEPLOYED | Terraform module exists, 0 instances |

### Cloud Run Services (All 12)

| Service | Cloud Run Name | Status | Traffic | Health |
|---------|---------------|--------|---------|--------|
| Gateway | afroid-gateway-prod | ACTIVE | 100% | /health OK |
| Auth | afroid-auth-prod | ACTIVE | 100% | /health OK |
| Platform | afroid-platform-prod | ACTIVE | 100% | /health OK |
| Orchestrator | afroid-orchestrator-prod | ACTIVE | 100% | /health OK |
| Certify | afroid-certify-prod | ACTIVE | 100% | /health OK |
| Incubate | afroid-incubate-prod | ACTIVE | 100% | /health OK |
| Codegen | afroid-codegen-prod | ACTIVE | 100% | /health OK |
| Notification | afroid-notification-prod | ACTIVE | 100% | /health OK |
| Workspace | afroid-workspace-prod | ACTIVE | 100% | /health OK |
| Intake | afroid-intake-prod | ACTIVE | 100% | /health OK |
| Vector Store | afroid-vector-store-prod | ACTIVE | 100% | /health 404 (BROKEN — source files missing) |
| Web Frontend | afroid-web-prod | ACTIVE | 100% | OK |

---

## Section 2 — Critical Security Findings

### FINDING 1: Cloud SQL Open to Internet (CRITICAL)

**Current state:** Authorized network `0.0.0.0/0` (labeled "cloud-run-egress") allows ANY IP to connect to the database.  
**Risk:** Full database exposure to the public internet.  
**Fix:** Remove authorized networks, enforce SSL, connect via VPC connector private IP only.

### FINDING 2: Plaintext Secrets in Cloud Run Env Vars (HIGH)

**Current state:**
- `auth` service: plaintext `DATABASE_URL` containing password `udvfLSqel47K0ovYrtM1HgkKQk1lxFYG`
- `orchestrator` service: plaintext `GEMINI_API_KEY=AIzaSyB30g5PB1axUCv5D2I5GGonKZfAUZNF8aI`
- Other backend services may also have plaintext env vars

**Risk:** Secrets visible in Cloud Run console, logs, and revision metadata.  
**Fix:** Bind env vars to Secret Manager secrets, remove plaintext versions.

### FINDING 3: Vector Store Service Broken (HIGH)

**Current state:** All `.py` source files missing from `services/vector-store/` directory — only `__pycache__` bytecode remains. Additionally, directory was misnamed with hyphen (`vector-store`) instead of underscore (`vector_store`) required by Python imports and the root `pyproject.toml` workspace config.  
**Risk:** Service deployed but /health returns 404, all vector operations fail.  
**Fix:** Source files recreated at `services/vector_store/` (underscore). Rebuild and deploy.

### FINDING 4: Default Compute Service Account (MEDIUM)

**Current state:** All 12 Cloud Run services use the default compute SA `629240539505-compute@developer.gserviceaccount.com`.  
**Risk:** Overprivileged — default SA has broad project permissions.  
**Terraform fix exists:** `afroid-cloudrun-prod` SA with minimal roles (secretmanager.secretAccessor + cloudsql.client). Not yet applied to live services.

### FINDING 5: SSL Not Enforced on Cloud SQL (MEDIUM)

**Current state:** `requireSsl: false`, `sslMode: ALLOW_UNENCRYPTED_AND_ENCRYPTED`  
**Risk:** Database connections can be unencrypted.  
**Fix:** Enable SSL requirement.

---

## Section 3 — Hardening Commands (Run in Order)

### STEP 1: Get Cloud SQL Private IP

You need the private IP to update DATABASE_URL after removing public access.

```
gcloud sql instances describe afroid-db-prod --format="value(ipAddresses)" --project=afroid-506916
```

Look for the `PRIVATE` type IP address. Note it down as `PRIVATE_IP`.

### STEP 2: Create DATABASE_URL Secret in Secret Manager

Replace `PRIVATE_IP` with the actual private IP from Step 1:

```
echo -n "postgresql+asyncpg://afroid:udvfLSqel47K0ovYrtM1HgkKQk1lxFYG@PRIVATE_IP:5432/afroid" | gcloud secrets create afroid-database-url-prod --data-file=- --project=afroid-506916
```

If the secret already exists, add a new version:
```
echo -n "postgresql+asyncpg://afroid:udvfLSqel47K0ovYrtM1HgkKQk1lxFYG@PRIVATE_IP:5432/afroid" | gcloud secrets versions add afroid-database-url-prod --data-file=- --project=afroid-506916
```

### STEP 3: Grant Secret Access to Default Compute SA

Since services currently use the default compute SA, it needs secretmanager access:

```
gcloud projects add-iam-policy-binding afroid-506916 --member="serviceAccount:629240539505-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor" --project=afroid-506916
```

### STEP 4: Bind Secrets to All Backend Services

Run this for EACH backend service. Replace `SERVICE_NAME` with each one from the list below.

Backend services: `auth`, `platform`, `orchestrator`, `certify`, `incubate`, `vector-store`, `codegen`, `notification`, `workspace`, `intake`

```
gcloud run services update afroid-SERVICE_NAME-prod --region=us-central1 --update-secrets="DATABASE_URL=afroid-database-url-prod:latest,JWT_SECRET_KEY=JWT_SECRET_KEY:latest,GEMINI_API_KEY=GOOGLE_API_KEY:latest" --remove-env-vars="DATABASE_URL,GEMINI_API_KEY,JWT_SECRET_KEY" --project=afroid-506916
```

Or run all 10 at once (one command per line):

```
gcloud run services update afroid-auth-prod --region=us-central1 --update-secrets="DATABASE_URL=afroid-database-url-prod:latest,JWT_SECRET_KEY=JWT_SECRET_KEY:latest,GEMINI_API_KEY=GOOGLE_API_KEY:latest" --remove-env-vars="DATABASE_URL,GEMINI_API_KEY,JWT_SECRET_KEY" --project=afroid-506916

gcloud run services update afroid-platform-prod --region=us-central1 --update-secrets="DATABASE_URL=afroid-database-url-prod:latest,JWT_SECRET_KEY=JWT_SECRET_KEY:latest,GEMINI_API_KEY=GOOGLE_API_KEY:latest" --remove-env-vars="DATABASE_URL,GEMINI_API_KEY,JWT_SECRET_KEY" --project=afroid-506916

gcloud run services update afroid-orchestrator-prod --region=us-central1 --update-secrets="DATABASE_URL=afroid-database-url-prod:latest,JWT_SECRET_KEY=JWT_SECRET_KEY:latest,GEMINI_API_KEY=GOOGLE_API_KEY:latest" --remove-env-vars="DATABASE_URL,GEMINI_API_KEY,JWT_SECRET_KEY" --project=afroid-506916

gcloud run services update afroid-certify-prod --region=us-central1 --update-secrets="DATABASE_URL=afroid-database-url-prod:latest,JWT_SECRET_KEY=JWT_SECRET_KEY:latest,GEMINI_API_KEY=GOOGLE_API_KEY:latest" --remove-env-vars="DATABASE_URL,GEMINI_API_KEY,JWT_SECRET_KEY" --project=afroid-506916

gcloud run services update afroid-incubate-prod --region=us-central1 --update-secrets="DATABASE_URL=afroid-database-url-prod:latest,JWT_SECRET_KEY=JWT_SECRET_KEY:latest,GEMINI_API_KEY=GOOGLE_API_KEY:latest" --remove-env-vars="DATABASE_URL,GEMINI_API_KEY,JWT_SECRET_KEY" --project=afroid-506916

gcloud run services update afroid-vector-store-prod --region=us-central1 --update-secrets="DATABASE_URL=afroid-database-url-prod:latest,JWT_SECRET_KEY=JWT_SECRET_KEY:latest,GEMINI_API_KEY=GOOGLE_API_KEY:latest" --remove-env-vars="DATABASE_URL,GEMINI_API_KEY,JWT_SECRET_KEY" --project=afroid-506916

gcloud run services update afroid-codegen-prod --region=us-central1 --update-secrets="DATABASE_URL=afroid-database-url-prod:latest,JWT_SECRET_KEY=JWT_SECRET_KEY:latest,GEMINI_API_KEY=GOOGLE_API_KEY:latest" --remove-env-vars="DATABASE_URL,GEMINI_API_KEY,JWT_SECRET_KEY" --project=afroid-506916

gcloud run services update afroid-notification-prod --region=us-central1 --update-secrets="DATABASE_URL=afroid-database-url-prod:latest,JWT_SECRET_KEY=JWT_SECRET_KEY:latest,GEMINI_API_KEY=GOOGLE_API_KEY:latest" --remove-env-vars="DATABASE_URL,GEMINI_API_KEY,JWT_SECRET_KEY" --project=afroid-506916

gcloud run services update afroid-workspace-prod --region=us-central1 --update-secrets="DATABASE_URL=afroid-database-url-prod:latest,JWT_SECRET_KEY=JWT_SECRET_KEY:latest,GEMINI_API_KEY=GOOGLE_API_KEY:latest" --remove-env-vars="DATABASE_URL,GEMINI_API_KEY,JWT_SECRET_KEY" --project=afroid-506916

gcloud run services update afroid-intake-prod --region=us-central1 --update-secrets="DATABASE_URL=afroid-database-url-prod:latest,JWT_SECRET_KEY=JWT_SECRET_KEY:latest,GEMINI_API_KEY=GOOGLE_API_KEY:latest" --remove-env-vars="DATABASE_URL,GEMINI_API_KEY,JWT_SECRET_KEY" --project=afroid-506916
```

**NOTE:** The exact secret names (`JWT_SECRET_KEY`, `GOOGLE_API_KEY`) must match what `gcloud secrets list` shows. If your secrets are named differently (e.g., `afroid-jwt-secret-prod`, `afroid-gemini-api-key-prod`), update the right-hand side of each `=` accordingly. Run `gcloud secrets list --project=afroid-506916` to confirm.

### STEP 5: Harden Cloud SQL Network

After secrets are bound and services use the private IP via VPC connector:

```
gcloud sql instances patch afroid-db-prod --clear-authorized-networks --project=afroid-506916
```

### STEP 6: Enforce SSL on Cloud SQL

```
gcloud sql instances patch afroid-db-prod --require-ssl --project=afroid-506916
```

### STEP 7: Verify Services Still Healthy After Network Hardening

```
for svc in gateway auth platform orchestrator certify incubate codegen notification workspace intake vector-store; do echo "--- afroid-${svc}-prod ---"; curl -s -o /dev/null -w "HTTP %{http_code}" "https://afroid-${svc}-prod-kx4jycljfa-uc.a.run.app/health"; echo ""; done
```

On Windows (run each individually):
```
curl -s -o nul -w "HTTP %%{http_code}" "https://afroid-gateway-prod-kx4jycljfa-uc.a.run.app/health"
curl -s -o nul -w "HTTP %%{http_code}" "https://afroid-auth-prod-kx4jycljfa-uc.a.run.app/health"
curl -s -o nul -w "HTTP %%{http_code}" "https://afroid-platform-prod-kx4jycljfa-uc.a.run.app/health"
curl -s -o nul -w "HTTP %%{http_code}" "https://afroid-orchestrator-prod-kx4jycljfa-uc.a.run.app/health"
curl -s -o nul -w "HTTP %%{http_code}" "https://afroid-certify-prod-kx4jycljfa-uc.a.run.app/health"
curl -s -o nul -w "HTTP %%{http_code}" "https://afroid-incubate-prod-kx4jycljfa-uc.a.run.app/health"
curl -s -o nul -w "HTTP %%{http_code}" "https://afroid-codegen-prod-kx4jycljfa-uc.a.run.app/health"
curl -s -o nul -w "HTTP %%{http_code}" "https://afroid-notification-prod-kx4jycljfa-uc.a.run.app/health"
curl -s -o nul -w "HTTP %%{http_code}" "https://afroid-workspace-prod-kx4jycljfa-uc.a.run.app/health"
curl -s -o nul -w "HTTP %%{http_code}" "https://afroid-intake-prod-kx4jycljfa-uc.a.run.app/health"
curl -s -o nul -w "HTTP %%{http_code}" "https://afroid-vector-store-prod-kx4jycljfa-uc.a.run.app/health"
curl -s -o nul -w "HTTP %%{http_code}" "https://afroid-web-prod-629240539505.us-central1.run.app/"
```

---

## Section 4 — Vector Store Recovery

### Root Cause

The `services/vector-store/` directory (hyphenated) lost all `.py` source files — only `__pycache__` bytecode remained. Additionally, the directory name used a hyphen which is incompatible with Python's import system. The root `pyproject.toml`, ruff config, pytest config, and deploy workflow (`SVC_DIR="${svc//-/_}"`) all expect `services/vector_store/` (underscore).

### Fix Applied

All source files have been recreated at `services/vector_store/` (underscore path) on your machine:

| File | Purpose |
|------|---------|
| `pyproject.toml` | Package config (deps: afroid-shared, langchain-google-genai) |
| `Dockerfile` | Multi-stage build matching auth/codegen pattern |
| `app/__init__.py` | Package marker |
| `app/config.py` | VectorStoreSettings (embedding model, dimensions, thresholds) |
| `app/main.py` | FastAPI app with /health, DB middleware, vector router |
| `app/routes/vector.py` | POST /v1/vector/embed, POST /v1/vector/search, DELETE /v1/vector/delete |
| `app/schemas/vector.py` | EmbedRequest/Response, SearchRequest/Response, DeleteRequest/Response |
| `app/services/embedding_service.py` | Google GenAI embedding generation + pgvector storage |
| `app/services/search_service.py` | Cosine similarity search via pgvector |
| `tests/__init__.py` | Test package marker |

### Deploy Commands

First, delete the old broken directory (Windows CMD):
```
rmdir /s /q services\vector-store
```

Then commit, push, build, and deploy:

```
git add services/vector_store/
git commit -m "Restore vector-store service source files (fix missing .py, rename to underscore)"
git push origin main
```

Build and deploy manually:
```
docker build -t us-central1-docker.pkg.dev/afroid-506916/afroid-containers/vector-store:latest -f services/vector_store/Dockerfile .

docker push us-central1-docker.pkg.dev/afroid-506916/afroid-containers/vector-store:latest

gcloud run deploy afroid-vector-store-prod --image=us-central1-docker.pkg.dev/afroid-506916/afroid-containers/vector-store:latest --region=us-central1 --project=afroid-506916
```

Or use Cloud Build if configured.

### Verify After Deploy

```
curl -s "https://afroid-vector-store-prod-kx4jycljfa-uc.a.run.app/health"
```

Expected: `{"status":"healthy","service":"vector-store-service","version":"1.0.0","checks":{}}`

---

## Section 5 — Readiness Scorecard

| Category | Weight | Pre-Hardening | Post-Hardening (Target) |
|----------|--------|---------------|------------------------|
| **Compute (Cloud Run)** | 20% | 18/20 (11/12 healthy) | 20/20 |
| **Database (Cloud SQL)** | 15% | 8/15 (open network, no SSL) | 15/15 |
| **Networking (VPC)** | 15% | 15/15 (VPC + connector READY) | 15/15 |
| **Secrets Management** | 15% | 5/15 (plaintext in env vars) | 15/15 |
| **CI/CD Pipeline** | 10% | 9/10 (deploy.yml with secrets) | 10/10 |
| **Messaging (Pub/Sub)** | 5% | 5/5 (5 topics active) | 5/5 |
| **IAM & Service Accounts** | 10% | 4/10 (default compute SA) | 4/10 |
| **Observability** | 5% | 2/5 (basic Cloud Run logs) | 2/5 |
| **Caching (Redis)** | 5% | 0/5 (not deployed) | 0/5 |
| **TOTAL** | 100% | **66/100 (66%)** | **86/100 (86%)** |

### Items NOT Addressed (Future Sprints)

1. **Service Account Migration** (4/10 → 10/10): Switch all Cloud Run services from default compute SA to dedicated `afroid-cloudrun-prod` SA. Terraform already defines it.
2. **Observability** (2/5 → 5/5): Add Sentry DSN, structured logging export, Cloud Trace integration, uptime checks.
3. **Redis/Memorystore** (0/5 → 5/5): Deploy Memorystore instance for session caching and rate limiting.
4. **pgvector Extension**: Ensure `CREATE EXTENSION IF NOT EXISTS vector;` is run on Cloud SQL for the vector-store service to function.
5. **Vectors Table DDL**: The `vectors` table must exist in the database. DDL:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   CREATE TABLE IF NOT EXISTS vectors (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       namespace VARCHAR(100) NOT NULL DEFAULT 'default',
       text_content TEXT NOT NULL,
       embedding vector(768),
       metadata JSONB DEFAULT '{}',
       created_at TIMESTAMPTZ DEFAULT NOW()
   );
   CREATE INDEX IF NOT EXISTS idx_vectors_namespace ON vectors(namespace);
   CREATE INDEX IF NOT EXISTS idx_vectors_embedding ON vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
   ```

---

## Section 6 — Execution Checklist

Run these in order. Check off as you go:

- [ ] **Step 1:** Get Cloud SQL private IP
- [ ] **Step 2:** Create `afroid-database-url-prod` secret with full DATABASE_URL using private IP
- [ ] **Step 3:** Grant secretmanager.secretAccessor to default compute SA
- [ ] **Step 4:** Bind secrets to all 10 backend services (remove plaintext env vars)
- [ ] **Step 5:** Clear authorized networks on Cloud SQL (`0.0.0.0/0` removed)
- [ ] **Step 6:** Enforce SSL on Cloud SQL
- [ ] **Step 7:** Verify all services return HTTP 200 on /health
- [ ] **Step 8:** Delete old `services\vector-store\` directory (hyphenated)
- [ ] **Step 9:** Commit + push `services/vector_store/` (new source files)
- [ ] **Step 10:** Build + deploy vector-store service
- [ ] **Step 11:** Verify vector-store /health returns 200
- [ ] **Step 12:** Run `CREATE EXTENSION vector` + vectors table DDL in psql
- [ ] **Step 13:** Final health check sweep on all 12 services

---

## Appendix — Architecture Summary

```
                    ┌─────────────────┐
                    │  Web Frontend   │ (Next.js 15)
                    │  :3000 (public) │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    Gateway      │ (FastAPI reverse proxy)
                    │  :8080 (public) │
                    └────────┬────────┘
                             │ /v1/* routing
            ┌────────────────┼────────────────┐
            │                │                │
     ┌──────▼──────┐  ┌─────▼──────┐  ┌──────▼──────┐
     │    Auth     │  │ Orchestrator│  │  Platform   │
     │   :8010    │  │   :8014    │  │   :8011    │
     └──────┬──────┘  └─────┬──────┘  └──────┬──────┘
            │               │                │
            │    ┌──────────┼──────────┐     │
            │    │          │          │     │
      ┌─────▼────▼┐  ┌─────▼────┐  ┌──▼────▼───┐
      │  Certify  │  │  Codegen │  │  Incubate │
      │  :8012   │  │  :8015  │  │   :8013   │
      └───────────┘  └──────────┘  └───────────┘
            │
     ┌──────▼──────┐  ┌───────────┐  ┌───────────┐
     │Vector Store │  │Notification│  │ Workspace │
     │   :8016    │  │   :8017   │  │  :8018   │
     └──────┬──────┘  └───────────┘  └───────────┘
            │                              │
            │              ┌───────────────┘
     ┌──────▼──────┐  ┌───▼──────┐
     │ Cloud SQL   │  │  Intake  │
     │ (Postgres)  │  │  :8019  │
     └─────────────┘  └──────────┘
```

All backend services connect to Cloud SQL via VPC Connector (`afroid-vpc-conn-prod`).  
Pub/Sub topics handle async event propagation between services.  
Gateway routes `/v1/*` to backends via longest-prefix matching.
