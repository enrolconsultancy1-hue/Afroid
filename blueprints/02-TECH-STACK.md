# Blueprint 02: Technology Stack

> **Purpose**: Every technology decision with exact versions and justification.  
> **Rule**: Use these exact versions. Do not substitute without updating this document.

---

## Frontend Stack

| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| **TypeScript** | 5.5+ | Language | Type safety, dominant in African dev ecosystem |
| **React** | 19.x | UI Library | Server Components, concurrent rendering |
| **Next.js** | 15.x (App Router) | Framework | SSR, API routes, edge runtime, built-in auth patterns |
| **Monaco Editor** | 0.50+ | Code Editor | VS Code engine, supports custom languages, LSP |
| **Xterm.js** | 5.x | Terminal | Full terminal emulator in browser |
| **Zustand** | 5.x | State Management | Lightweight, TypeScript-first, no boilerplate |
| **Socket.IO Client** | 4.x | Real-time | WebSocket with auto-reconnect |
| **Zod** | 3.x | Validation | Runtime + compile-time schema validation |
| **Axios** | 1.x | HTTP Client | Interceptors, retry, cancel tokens |
| **React Query** | 5.x (TanStack) | Data Fetching | Cache, mutations, optimistic updates |
| **Framer Motion** | 11.x | Animation | Production-grade micro-animations |
| **Radix UI** | Latest | Primitives | Accessible, unstyled component primitives |
| **Lucide React** | Latest | Icons | Consistent icon set |
| **Playwright** | 1.x | E2E Testing | Cross-browser testing |
| **Vitest** | 2.x | Unit Testing | Vite-native, fast |
| **Storybook** | 8.x | Component Dev | Component documentation + visual testing |

### Frontend CSS Strategy

```
Design System Architecture:
├── CSS Variables (custom properties) for theming
├── CSS Modules for component-scoped styles
├── Global styles for resets + typography
└── Framer Motion for animations
```

**Color Palette** (HSL-based):
```css
:root {
  /* Primary - Deep Gold (African sunrise) */
  --color-primary-50: hsl(38, 92%, 95%);
  --color-primary-500: hsl(38, 92%, 50%);
  --color-primary-900: hsl(38, 92%, 15%);

  /* Accent - Vibrant Teal */
  --color-accent-500: hsl(172, 66%, 50%);

  /* Neutral - Warm Grays */
  --color-neutral-50: hsl(40, 20%, 98%);
  --color-neutral-900: hsl(40, 20%, 10%);

  /* Semantic */
  --color-success: hsl(142, 71%, 45%);
  --color-warning: hsl(38, 92%, 50%);
  --color-error: hsl(0, 84%, 60%);

  /* Dark Mode */
  --color-bg-dark: hsl(230, 25%, 8%);
  --color-surface-dark: hsl(230, 20%, 12%);
}
```

**Typography**:
- Headings: `Outfit` (Google Fonts, variable weight)
- Body: `Inter` (Google Fonts, variable weight)
- Code: `JetBrains Mono` (monospace)

---

## Backend Stack

| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| **Python** | 3.12+ | Language | AI/ML ecosystem, pattern matching, performance |
| **FastAPI** | 0.115+ | Framework | Async, auto-OpenAPI, Pydantic v2 integration |
| **Pydantic** | 2.x | Validation | Data validation + serialization |
| **SQLAlchemy** | 2.x | ORM | Async support, mature, type-safe |
| **Alembic** | 1.x | Migrations | SQLAlchemy-native migrations |
| **Motor** | 3.x | MongoDB Driver | Async MongoDB operations |
| **Redis (aioredis)** | via `redis[hiredis]` 5.x | Cache | Async Redis with hiredis speedup |
| **Celery** | 5.x | Task Queue | Background job processing |
| **httpx** | 0.27+ | HTTP Client | Async HTTP client for service-to-service |
| **structlog** | 24.x | Logging | Structured JSON logging |
| **tenacity** | 9.x | Retry | Configurable retry with backoff |
| **WeasyPrint** | 62+ | PDF Generation | HTML → PDF for compliance docs |
| **Jinja2** | 3.x | Templating | Code + document templates |
| **pytest** | 8.x | Testing | Async test support, fixtures |
| **pytest-cov** | 5.x | Coverage | Code coverage reporting |
| **ruff** | 0.6+ | Linting | Fast Python linter + formatter |
| **mypy** | 1.11+ | Type Checking | Strict type validation |
| **uv** | 0.4+ | Package Manager | Fast dependency resolution |

---

## AI/ML Stack

| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| **Google Gemini** | 2.5 Pro | Core LLM | Code generation, grant writing, analysis |
| **Vertex AI SDK** | Latest | LLM Access | Production API access with service accounts |
| **text-embedding-005** | Latest | Embeddings | 768-dim vectors for similarity search |
| **LangGraph** | 0.2+ | Agent Orchestration | Stateful multi-agent workflows |
| **LangChain Core** | 0.3+ | LLM Abstractions | Prompt templates, output parsers |
| **Google Cloud Vision** | Latest | OCR | Document text extraction |
| **spaCy** | 3.8+ | NLP | Named entity recognition, text processing |
| **datasketch** | 1.6+ | MinHash/SimHash | Code fingerprinting for IP verification |

### LLM Configuration

```python
# Model configurations used across services
LLM_CONFIGS = {
    "architect": {
        "model": "gemini-2.5-pro",
        "temperature": 0.3,        # Lower for structured output
        "max_output_tokens": 8192,
        "top_p": 0.95,
    },
    "codegen": {
        "model": "gemini-2.5-pro",
        "temperature": 0.2,        # Lowest for deterministic code
        "max_output_tokens": 32768,
        "top_p": 0.9,
    },
    "reviewer": {
        "model": "gemini-2.5-pro",
        "temperature": 0.1,        # Very low for consistent reviews
        "max_output_tokens": 4096,
        "top_p": 0.9,
    },
    "grant_writer": {
        "model": "gemini-2.5-pro",
        "temperature": 0.7,        # Higher for creative writing
        "max_output_tokens": 16384,
        "top_p": 0.95,
    },
    "embedding": {
        "model": "text-embedding-005",
        "dimensions": 768,
        "task_type": "RETRIEVAL_DOCUMENT",
    },
}
```

---

## Database Stack

| Technology | Version | Purpose | Data Stored |
|------------|---------|---------|-------------|
| **PostgreSQL** | 16 | Primary RDBMS | Users, orgs, projects, billing, opportunities, compliance results |
| **pgvector** | 0.7+ | Vector Extension | Embeddings for startup profiles + funding opportunities |
| **MongoDB** | 7.x | Document Store | Generated code artifacts, audit logs, agent conversation history |
| **Redis** | 7.x | Cache + Queue | Session cache, rate limiting, Celery broker, real-time state |

### Why This Combination?

```
PostgreSQL + pgvector:
├── Relational data with ACID guarantees
├── Vector similarity search IN the same DB as relational data
├── No separate vector DB to manage (Pinecone, Weaviate, etc.)
├── HNSW index for sub-100ms approximate nearest neighbor
└── Reduces operational complexity

MongoDB:
├── Schema-flexible storage for generated code (deeply nested, variable structure)
├── Append-only collections for immutable audit trails
├── GridFS for large file storage
└── TTL indexes for temporary artifacts

Redis:
├── Sub-millisecond cache reads
├── Pub/Sub for real-time notifications
├── Sorted sets for rate limiting
└── Celery broker for background task queue
```

---

## Infrastructure Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Google Cloud Platform** | N/A | Cloud Provider |
| **Cloud Run** | Gen2 | Stateless service hosting |
| **Cloud SQL** | PostgreSQL 16 | Managed PostgreSQL |
| **Memorystore** | Redis 7.x | Managed Redis |
| **MongoDB Atlas** | 7.x | Managed MongoDB (GCP marketplace) |
| **Google Cloud Storage** | N/A | Object storage (code archives, documents) |
| **Google Pub/Sub** | N/A | Async event messaging |
| **Secret Manager** | N/A | Secrets + API keys |
| **Cloud CDN** | N/A | Static asset delivery |
| **Cloud Build** | N/A | CI/CD pipeline |
| **Artifact Registry** | N/A | Docker image registry |
| **Cloud Monitoring** | N/A | Metrics + alerting |
| **Cloud Logging** | N/A | Centralized logging |
| **Cloud Trace** | N/A | Distributed tracing |
| **Vertex AI** | N/A | ML model serving + Gemini access |
| **Cloud TPU** | v5e | Model fine-tuning |
| **Cloud Armor** | N/A | WAF + DDoS protection |
| **Terraform** | 1.9+ | Infrastructure as Code |
| **Docker** | 27+ | Containerization |

### GCP Region Strategy

| Environment | Region | Justification |
|-------------|--------|---------------|
| Production | `africa-south1` (Johannesburg) | Data sovereignty, latency for African users |
| Staging | `africa-south1` | Match production |
| Dev | `us-central1` | Lower cost for development |
| ML Training | `us-central1` | TPU availability |

---

## DevOps & Tooling Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Git** | Latest | Version control |
| **GitHub** | N/A | Repository hosting |
| **GitHub Actions** | N/A | CI (lint, test, typecheck) |
| **Cloud Build** | N/A | CD (build + deploy) |
| **Turborepo** | 2.3+ | Monorepo task orchestration |
| **uv** | 0.4+ | Python workspace + dependency management |
| **Docker Compose** | 2.x | Local development environment |
| **pre-commit** | 3.x | Git pre-commit hooks |
| **Conventional Commits** | 1.0.0 | Commit message standard |
| **Semantic Release** | Latest | Automated versioning |

---

## Package Dependency Map

```mermaid
graph TD
    subgraph "Frontend"
        WEB["apps/web<br/>(Next.js 15)"]
        SDK["packages/sdk<br/>(API Client)"]
        UI["packages/ui<br/>(Components)"]
        DSL_TS["packages/dsl<br/>(DSL Parser)"]
        TSCONFIG["packages/tsconfig"]
    end

    subgraph "Backend"
        AUTH["services/auth"]
        PLAT["services/platform"]
        ORCH["services/orchestrator"]
        CGEN["services/codegen"]
        CERT["services/certify"]
        INC["services/incubate"]
        VS["services/vector-store"]
        NOTIF["services/notification"]
        SHARED["services/shared"]
    end

    WEB --> SDK
    WEB --> UI
    WEB --> DSL_TS
    WEB --> TSCONFIG
    SDK --> TSCONFIG
    UI --> TSCONFIG

    AUTH --> SHARED
    PLAT --> SHARED
    ORCH --> SHARED
    CGEN --> SHARED
    CERT --> SHARED
    INC --> SHARED
    VS --> SHARED
    NOTIF --> SHARED
```

---

## Environment Variables

```bash
# ============================================
# .env.example - Complete Environment Template
# ============================================

# --- Application ---
APP_ENV=development                    # development | staging | production
APP_DEBUG=true
APP_SECRET_KEY=                        # 64-char random hex

# --- Database (PostgreSQL) ---
DATABASE_URL=postgresql+asyncpg://afroid:password@localhost:5432/afroid
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10

# --- MongoDB ---
MONGODB_URL=mongodb://afroid:password@localhost:27017/afroid?authSource=admin

# --- Redis ---
REDIS_URL=redis://localhost:6379/0

# --- Auth ---
JWT_SECRET_KEY=                        # 64-char random hex
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30

# --- OAuth (Google) ---
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google

# --- Google Cloud ---
GCP_PROJECT_ID=afroid-production
GCP_REGION=africa-south1
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# --- Vertex AI / Gemini ---
VERTEX_AI_PROJECT=afroid-production
VERTEX_AI_LOCATION=us-central1
GEMINI_MODEL=gemini-2.5-pro

# --- Google Cloud Storage ---
GCS_BUCKET_ARTIFACTS=afroid-artifacts
GCS_BUCKET_DOCUMENTS=afroid-documents

# --- Google Pub/Sub ---
PUBSUB_PROJECT_ID=afroid-production

# --- Stripe ---
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_STARTER=
STRIPE_PRICE_ID_PRO=
STRIPE_PRICE_ID_ENTERPRISE=

# --- Sentry ---
SENTRY_DSN=

# --- Frontend (Next.js) ---
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

---

> **Next Blueprint**: [`03-GEEZCODE-IDE.md`](./03-GEEZCODE-IDE.md)
