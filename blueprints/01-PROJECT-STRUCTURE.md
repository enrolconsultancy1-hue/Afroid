# Blueprint 01: Project Structure

> **Purpose**: Complete directory tree with every file path and its role.  
> **Rule**: This is the canonical file manifest. All other blueprints reference paths defined here.

---

## Root Structure

```
Afroid/
├── ARCHITECTURE.md                          # Master blueprint (you are here)
├── blueprints/                              # All architectural blueprint documents
├── docker-compose.yml                       # Local development stack
├── docker-compose.prod.yml                  # Production-like local stack
├── turbo.json                               # Turborepo pipeline configuration
├── package.json                             # Root workspace (npm workspaces)
├── pyproject.toml                           # Root Python workspace (uv)
├── .env.example                             # Environment variable template
├── .env.local                               # Local overrides (gitignored)
├── .gitignore                               # Git ignore rules
├── .editorconfig                            # Editor formatting rules
├── .pre-commit-config.yaml                  # Pre-commit hooks
├── LICENSE                                  # Project license
├── README.md                                # Project documentation
│
├── apps/                                    # Deployable applications
│   └── web/                                 # Next.js 15 frontend
│
├── packages/                                # Shared TypeScript packages
│   ├── sdk/                                 # API client SDK
│   ├── ui/                                  # React component library
│   ├── dsl/                                 # geezcodE DSL (TypeScript port)
│   └── tsconfig/                            # Shared TS configs
│
├── services/                                # Python backend microservices
│   ├── auth/                                # Authentication service
│   ├── platform/                            # User + Billing + Org service
│   ├── orchestrator/                        # Multi-agent orchestration
│   ├── codegen/                             # Code generation engine
│   ├── certify/                             # Compliance + IP verification
│   ├── incubate/                            # Funding matching + autofill
│   ├── vector_store/                        # Vector embedding + search
│   ├── notification/                        # Email + push notifications
│   └── shared/                              # Shared Python utilities
│
├── infra/                                   # Infrastructure as Code
│   ├── terraform/                           # GCP Terraform modules
│   ├── k8s/                                 # Kubernetes manifests (if needed)
│   └── docker/                              # Shared Dockerfiles
│
├── ml/                                      # ML model training + evaluation
│   ├── fine-tuning/                         # Gemini fine-tuning scripts
│   ├── evaluation/                          # Model evaluation benchmarks
│   └── datasets/                            # Training data (gitignored, DVC tracked)
│
└── docs/                                    # Additional documentation
    ├── api/                                 # Generated API docs
    ├── guides/                              # User/developer guides
    └── adr/                                 # Architecture Decision Records
```

---

## Detailed Structure: `apps/web/` (Next.js Frontend)

```
apps/web/
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.js
├── .env.local
├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   ├── og-image.png
│   └── fonts/
│       ├── inter-var.woff2
│       └── outfit-var.woff2
│
├── src/
│   ├── app/                                  # Next.js App Router
│   │   ├── layout.tsx                        # Root layout (fonts, theme, providers)
│   │   ├── page.tsx                          # Landing page
│   │   ├── globals.css                       # Global styles + CSS variables
│   │   │
│   │   ├── (auth)/                           # Auth route group
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── layout.tsx                    # Auth layout (centered card)
│   │   │
│   │   ├── (dashboard)/                      # Authenticated dashboard
│   │   │   ├── layout.tsx                    # Dashboard layout (sidebar + topbar)
│   │   │   ├── page.tsx                      # Dashboard home (project list)
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx                  # All projects grid
│   │   │   │   ├── new/page.tsx              # Create new project wizard
│   │   │   │   └── [projectId]/
│   │   │   │       ├── page.tsx              # Project overview
│   │   │   │       ├── settings/page.tsx     # Project settings
│   │   │   │       └── certify/page.tsx      # Certification status
│   │   │   │
│   │   │   ├── incubate/
│   │   │   │   ├── page.tsx                  # Funding opportunities dashboard
│   │   │   │   ├── matches/page.tsx          # AI-matched opportunities
│   │   │   │   ├── applications/page.tsx     # Active applications
│   │   │   │   └── [opportunityId]/
│   │   │   │       └── apply/page.tsx        # Auto-filled application form
│   │   │   │
│   │   │   ├── certify/
│   │   │   │   ├── page.tsx                  # Certification overview
│   │   │   │   ├── audits/page.tsx           # Audit history
│   │   │   │   └── documents/page.tsx        # Generated documents
│   │   │   │
│   │   │   └── settings/
│   │   │       ├── page.tsx                  # Account settings
│   │   │       ├── billing/page.tsx          # Subscription management
│   │   │       ├── organization/page.tsx     # Org settings
│   │   │       └── api-keys/page.tsx         # API key management
│   │   │
│   │   ├── (ide)/                            # IDE route group
│   │   │   └── editor/
│   │   │       ├── page.tsx                  # Main IDE view
│   │   │       └── [projectId]/page.tsx      # Project-specific IDE
│   │   │
│   │   └── api/                              # Next.js API routes (BFF)
│   │       ├── auth/[...nextauth]/route.ts   # NextAuth handler
│   │       └── webhook/stripe/route.ts       # Stripe webhook
│   │
│   ├── components/
│   │   ├── ide/                              # IDE-specific components
│   │   │   ├── MonacoEditor.tsx              # Monaco editor wrapper
│   │   │   ├── FileTree.tsx                  # File tree sidebar
│   │   │   ├── Terminal.tsx                  # Xterm.js terminal
│   │   │   ├── PreviewPanel.tsx              # Live preview
│   │   │   ├── ConceptInput.tsx              # NL concept input
│   │   │   ├── AgentActivityPanel.tsx        # Agent status display
│   │   │   ├── BlueprintViewer.tsx           # Architecture viewer
│   │   │   └── CodeStreamOverlay.tsx         # Real-time code stream UI
│   │   │
│   │   ├── dashboard/                        # Dashboard components
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── StatsWidget.tsx
│   │   │   ├── ActivityFeed.tsx
│   │   │   └── QuickActions.tsx
│   │   │
│   │   ├── incubate/                         # Incubate components
│   │   │   ├── OpportunityCard.tsx
│   │   │   ├── MatchScore.tsx
│   │   │   ├── ApplicationForm.tsx
│   │   │   ├── AutofillProgress.tsx
│   │   │   └── WritingAssistant.tsx
│   │   │
│   │   ├── certify/                          # Certify components
│   │   │   ├── ComplianceBadge.tsx
│   │   │   ├── AuditTimeline.tsx
│   │   │   ├── CertificationCard.tsx
│   │   │   └── DocumentPreview.tsx
│   │   │
│   │   └── shared/                           # Shared UI components
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       ├── Footer.tsx
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorBoundary.tsx
│   │       └── ProtectedRoute.tsx
│   │
│   ├── stores/                               # Zustand state stores
│   │   ├── authStore.ts                      # Auth state
│   │   ├── ideStore.ts                       # IDE state (files, tabs, editor)
│   │   ├── projectStore.ts                   # Project state
│   │   ├── incubateStore.ts                  # Incubate state
│   │   └── uiStore.ts                        # UI state (modals, toasts, theme)
│   │
│   ├── hooks/                                # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useWebSocket.ts
│   │   ├── useProject.ts
│   │   ├── useCodeGenStream.ts
│   │   └── useDebounce.ts
│   │
│   ├── lib/                                  # Utility libraries
│   │   ├── api.ts                            # API client instance
│   │   ├── virtualFs.ts                      # Virtual file system
│   │   ├── constants.ts                      # App constants
│   │   ├── utils.ts                          # General utilities
│   │   └── validators.ts                     # Form validation schemas (Zod)
│   │
│   └── types/                                # TypeScript type definitions
│       ├── api.d.ts                          # API response types
│       ├── ide.d.ts                          # IDE-specific types
│       ├── project.d.ts                      # Project types
│       └── incubate.d.ts                     # Incubate types
│
└── tests/
    ├── e2e/                                  # Playwright e2e tests
    │   ├── auth.spec.ts
    │   ├── ide.spec.ts
    │   └── incubate.spec.ts
    └── unit/                                 # Vitest unit tests
        ├── components/
        └── hooks/
```

---

## Detailed Structure: `services/` (Python Backend)

### Common Service Structure

Every Python service follows this identical internal structure:

```
services/<service-name>/
├── pyproject.toml                    # Service dependencies (uv workspace member)
├── Dockerfile                        # Production container
├── Dockerfile.dev                    # Development container (hot reload)
├── alembic.ini                       # DB migration config (if uses PostgreSQL)
├── alembic/                          # Migration versions
│   └── versions/
├── app/
│   ├── __init__.py
│   ├── main.py                       # FastAPI app factory
│   ├── config.py                     # Pydantic Settings (env vars)
│   ├── dependencies.py               # FastAPI dependency injection
│   ├── routes/                       # API route handlers
│   │   └── __init__.py
│   ├── models/                       # SQLAlchemy / ODM models
│   │   └── __init__.py
│   ├── schemas/                      # Pydantic request/response schemas
│   │   └── __init__.py
│   ├── services/                     # Business logic layer
│   │   └── __init__.py
│   └── middleware/                    # Custom middleware
│       └── __init__.py
└── tests/
    ├── conftest.py                   # Pytest fixtures
    ├── test_routes/
    ├── test_services/
    └── test_models/
```

### Service-Specific Files

#### `services/auth/`
```
app/
├── routes/auth.py                    # POST /login, /register, /refresh, /logout
├── routes/oauth.py                   # GET /oauth/google, /oauth/callback
├── models/user.py                    # User, RefreshToken models
├── schemas/auth.py                   # LoginRequest, TokenResponse, etc.
├── services/jwt_service.py           # Token creation/validation
├── services/password_service.py      # Argon2id hashing
└── middleware/rate_limiter.py         # Rate limiting middleware
```

#### `services/orchestrator/`
```
app/
├── routes/orchestrate.py             # POST /orchestrate, GET /status/{job_id}
├── graph/
│   ├── workflow.py                   # LangGraph StateGraph definition
│   ├── state.py                      # TypedDict state schema
│   ├── nodes.py                      # Graph node functions
│   └── edges.py                      # Conditional edge logic
├── agents/
│   ├── base_agent.py                 # Abstract agent base class
│   ├── architect_agent.py            # System architecture generation
│   ├── codegen_agent.py              # Code writing
│   ├── reviewer_agent.py             # Code review + improvement
│   └── debugger_agent.py             # Error diagnosis + fix
├── prompts/
│   ├── architect_system.md           # Architect agent system prompt
│   ├── codegen_system.md             # CodeGen agent system prompt
│   ├── reviewer_system.md            # Reviewer agent system prompt
│   └── debugger_system.md            # Debugger agent system prompt
├── tools/
│   ├── file_tools.py                 # Read/write virtual file tools
│   ├── search_tools.py               # Code search tools
│   ├── test_tools.py                 # Run test tools
│   └── shell_tools.py                # Execute shell commands
├── services/
│   ├── streaming.py                  # SSE + WebSocket streaming
│   └── job_manager.py                # Background job tracking
└── schemas/
    ├── orchestration.py              # OrchestrationRequest, JobStatus
    └── agent_events.py               # AgentThought, CodeChunk, etc.
```

#### `services/codegen/`
```
app/
├── routes/generate.py                # POST /generate, GET /artifacts/{id}
├── dsl/
│   ├── grammar.py                    # Formal grammar definition
│   ├── lexer.py                      # Tokenizer
│   ├── parser.py                     # Recursive descent parser
│   ├── ast_nodes.py                  # AST node classes
│   ├── semantics.py                  # Semantic analysis
│   └── codegen_visitor.py            # AST visitor → code output
├── generators/
│   ├── base_generator.py             # Abstract generator
│   ├── typescript_generator.py       # TypeScript/React code
│   ├── python_generator.py           # Python/FastAPI code
│   ├── database_generator.py         # SQL schemas + migrations
│   ├── docker_generator.py           # Docker configs
│   ├── api_generator.py              # API route stubs
│   └── test_generator.py             # Test file stubs
├── templates/                        # Jinja2 code templates
│   ├── typescript/
│   │   ├── component.tsx.j2
│   │   ├── page.tsx.j2
│   │   ├── store.ts.j2
│   │   ├── hook.ts.j2
│   │   └── api-client.ts.j2
│   ├── python/
│   │   ├── fastapi_route.py.j2
│   │   ├── sqlalchemy_model.py.j2
│   │   ├── pydantic_schema.py.j2
│   │   └── service.py.j2
│   └── infra/
│       ├── dockerfile.j2
│       ├── docker-compose.yml.j2
│       └── github-actions.yml.j2
├── services/
│   ├── project_assembler.py          # Assembles generated files into project
│   └── artifact_store.py             # MongoDB + GCS storage
└── schemas/
    └── generation.py                 # GenerateRequest, Artifact, ProjectManifest
```

#### `services/certify/`
```
app/
├── routes/certify.py                 # POST /certify, GET /reports/{id}
├── routes/audit.py                   # GET /audit-trail/{project_id}
├── routes/documents.py               # GET /documents/{id}, POST /documents/generate
├── engine/
│   ├── rule_engine.py                # Pluggable rule evaluation framework
│   ├── rules/
│   │   ├── base_rule.py              # Abstract rule class
│   │   ├── nigeria_startup_act.py    # Nigeria Startup Act rules
│   │   ├── kenya_startup_act.py      # Kenya Startup Act rules
│   │   ├── ethiopia_startup_act.py   # Ethiopia rules
│   │   └── au_digital_trade.py       # African Union rules
│   └── rule_registry.py             # Rule discovery + registration
├── services/
│   ├── ip_verifier.py                # Code fingerprinting (MinHash/SimHash)
│   ├── license_scanner.py            # OSS license detection
│   ├── originality_scorer.py         # AI originality scoring
│   ├── audit_trail.py                # Append-only audit logging
│   └── doc_generator.py              # PDF/DOCX generation (WeasyPrint)
├── templates/docs/
│   ├── compliance_certificate.html.j2
│   ├── ip_report.html.j2
│   ├── nigeria_filing.html.j2
│   └── kenya_filing.html.j2
└── schemas/
    ├── compliance.py                 # ComplianceReport, RuleResult
    ├── audit.py                      # AuditEntry, AuditTrail
    └── document.py                   # DocumentRequest, DocumentMetadata
```

#### `services/incubate/`
```
app/
├── routes/opportunities.py           # CRUD funding opportunities
├── routes/matches.py                 # GET /matches, POST /match
├── routes/applications.py            # Application management
├── routes/writer.py                  # POST /write, /improve, /score
├── ingestion/
│   ├── scraper.py                    # Web scraper (httpx + BeautifulSoup)
│   ├── normalizer.py                 # Data normalization
│   ├── embedder.py                   # Vector embedding generation
│   └── deduplicator.py              # Fuzzy deduplication
├── matcher/
│   ├── profile_embedder.py           # Startup profile → vector
│   ├── similarity_engine.py          # Cosine similarity search
│   ├── filter_engine.py              # Hard filters (region, amount, deadline)
│   └── reranker.py                   # Cross-encoder reranking
├── ocr/
│   ├── vision_client.py              # Google Cloud Vision wrapper
│   ├── document_parser.py            # Structured data extraction
│   └── table_extractor.py            # Table recognition
├── autofill/
│   ├── form_mapper.py                # Data → form field mapping
│   ├── field_resolver.py             # Ambiguous field resolution
│   └── confidence_scorer.py          # Per-field confidence scores
├── writer/
│   ├── grant_composer.py             # Full narrative generation
│   ├── section_templates.py          # Per-section prompts
│   ├── quality_scorer.py             # AI quality assessment
│   └── tone_adjuster.py             # Institutional tone calibration
├── models/
│   ├── opportunity.py                # Opportunity SQLAlchemy model
│   ├── application.py                # Application model
│   └── match.py                      # Match result model
└── schemas/
    ├── opportunity.py
    ├── application.py
    ├── match.py
    └── writer.py
```

#### `services/vector_store/`
```
app/
├── routes/embeddings.py              # POST /embed, /embed-batch
├── routes/search.py                  # POST /search, /search-batch
├── services/
│   ├── embedding_service.py          # Gemini text-embedding-005 client
│   └── pgvector_store.py            # pgvector CRUD + HNSW index
├── models/
│   └── embedding.py                  # Embedding SQLAlchemy model
└── schemas/
    ├── embedding.py                  # EmbedRequest, EmbedResponse
    └── search.py                     # SearchRequest, SearchResult
```

#### `services/shared/`
```
shared/
├── pyproject.toml                    # Shared lib package
├── __init__.py
├── config.py                         # Base Pydantic Settings
├── database.py                       # SQLAlchemy engine + session factory
├── mongodb.py                        # Motor async MongoDB client
├── redis_client.py                   # Redis connection factory
├── pubsub.py                         # Google Pub/Sub publisher/subscriber
├── gcs.py                            # Google Cloud Storage client
├── auth.py                           # JWT validation dependency
├── logging.py                        # Structured JSON logging (structlog)
├── middleware/
│   ├── correlation_id.py             # Request correlation ID
│   ├── error_handler.py              # Global exception handler
│   └── request_logger.py             # Request/response logging
├── schemas/
│   ├── pagination.py                 # PaginatedResponse, PaginationParams
│   ├── errors.py                     # ErrorResponse schema
│   └── health.py                     # HealthCheck schema
└── utils/
    ├── retry.py                      # Exponential backoff retry decorator
    ├── timing.py                     # Execution timing context manager
    └── validators.py                 # Custom Pydantic validators
```

---

## Detailed Structure: `infra/`

```
infra/
├── terraform/
│   ├── environments/
│   │   ├── dev/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   ├── terraform.tfvars
│   │   │   └── backend.tf
│   │   ├── staging/
│   │   │   └── ... (same structure)
│   │   └── prod/
│   │       └── ... (same structure)
│   ├── modules/
│   │   ├── networking/               # VPC, subnets, firewall rules
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── cloud-run/                # Cloud Run service definitions
│   │   ├── cloud-sql/                # PostgreSQL instance
│   │   ├── memorystore/              # Redis instance
│   │   ├── gcs/                      # Storage buckets
│   │   ├── pubsub/                   # Topics + subscriptions
│   │   ├── secret-manager/           # Secret storage
│   │   ├── iam/                      # Service accounts + roles
│   │   ├── monitoring/               # Dashboards + alerts
│   │   ├── cdn/                      # Cloud CDN config
│   │   └── vertex-ai/               # Vertex AI endpoints
│   └── modules.tf                    # Root module composition
│
├── docker/
│   ├── Dockerfile.python-base        # Shared Python base image
│   ├── Dockerfile.node-base          # Shared Node.js base image
│   └── .dockerignore
│
└── k8s/                              # Kubernetes manifests (GKE Autopilot)
    ├── namespaces/
    ├── deployments/
    ├── services/
    ├── ingress/
    └── configmaps/
```

---

## Detailed Structure: `packages/`

```
packages/
├── sdk/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                  # Public API exports
│   │   ├── client.ts                 # Axios-based API client
│   │   ├── types/
│   │   │   ├── auth.ts               # Auth-related types
│   │   │   ├── project.ts            # Project types
│   │   │   ├── certify.ts            # Certify types
│   │   │   ├── incubate.ts           # Incubate types
│   │   │   └── common.ts             # Shared types
│   │   └── endpoints/
│   │       ├── auth.ts               # Auth API methods
│   │       ├── projects.ts           # Project API methods
│   │       ├── certify.ts            # Certify API methods
│   │       └── incubate.ts           # Incubate API methods
│   └── tests/
│
├── ui/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── components/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Dropdown.tsx
│   │   │   ├── Progress.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── Tooltip.tsx
│   │   ├── layouts/
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── AuthLayout.tsx
│   │   │   └── IDELayout.tsx
│   │   └── styles/
│   │       ├── tokens.css            # Design tokens (colors, spacing, typography)
│   │       ├── reset.css             # CSS reset
│   │       └── animations.css        # Shared animations
│   └── .storybook/                   # Storybook config
│
├── dsl/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── lexer.ts                  # TS port of DSL lexer
│       ├── parser.ts                 # TS port of DSL parser
│       ├── ast.ts                    # AST types
│       └── highlighter.ts           # Monaco language definition for DSL
│
└── tsconfig/
    ├── base.json                     # Base TS config
    ├── nextjs.json                   # Next.js specific
    ├── react-library.json            # React library specific
    └── node.json                     # Node.js specific
```

---

## Configuration Files (Root Level)

### `turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env.local"],
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "test": { "dependsOn": ["build"] },
    "typecheck": { "dependsOn": ["^build"] }
  }
}
```

### `pyproject.toml` (Root)
```toml
[project]
name = "afroid"
version = "1.0.0"
requires-python = ">=3.12"

[tool.uv.workspace]
members = [
    "services/auth",
    "services/platform",
    "services/orchestrator",
    "services/codegen",
    "services/certify",
    "services/incubate",
    "services/vector_store",
    "services/notification",
    "services/shared",
]

[tool.ruff]
target-version = "py312"
line-length = 100
select = ["E", "F", "I", "N", "UP", "B", "SIM", "ANN"]

[tool.mypy]
python_version = "3.12"
strict = true
warn_return_any = true
warn_unused_configs = true

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
```

### `docker-compose.yml`
```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: afroid
      POSTGRES_PASSWORD: afroid_dev
      POSTGRES_DB: afroid
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  mongodb:
    image: mongo:7
    ports: ["27017:27017"]
    environment:
      MONGO_INITDB_ROOT_USERNAME: afroid
      MONGO_INITDB_ROOT_PASSWORD: afroid_dev
    volumes:
      - mongodata:/data/db

volumes:
  pgdata:
  mongodata:
```

---

> **Next Blueprint**: [`02-TECH-STACK.md`](./02-TECH-STACK.md)
