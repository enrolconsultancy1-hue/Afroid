# Blueprint 00: Execution Playbook

> **Purpose**: Step-by-step build phases with exact commands, file targets, and acceptance criteria.  
> **Rule**: Execute phases sequentially. Do NOT skip ahead. Each phase's acceptance criteria must pass before proceeding.

---

## Phase 1: Foundation (Days 1-7)

### Step 1.1: Initialize Monorepo

**Goal**: Create the project scaffold with all workspace configurations.

```bash
# Initialize root
cd Afroid/
git init
npm init -y

# Install workspace tooling
npm install -D turbo@^2.3 typescript@^5.5

# Initialize Python workspace
pip install uv
uv init --name afroid-backend
```

**Files to Create** (reference `01-PROJECT-STRUCTURE.md` for exact paths):
1. `turbo.json` — Turborepo pipeline config
2. `package.json` — Root workspace definition with `workspaces` field
3. `pyproject.toml` — Python root with uv workspace members
4. `.gitignore` — Comprehensive ignore rules
5. `.env.example` — All environment variables with descriptions
6. `docker-compose.yml` — Local development stack (Postgres, Redis, MongoDB)
7. `.editorconfig` — Consistent formatting across editors

**Acceptance Criteria**:
- [ ] `npm run build` executes Turborepo pipeline with zero errors
- [ ] `uv sync` installs all Python dependencies
- [ ] `docker compose up -d` starts Postgres (16), Redis (7), MongoDB (7)
- [ ] Git initial commit with conventional commit message

---

### Step 1.2: Database Schemas & Migrations

**Goal**: Create all database schemas from `07-DATA-MODELS.md`.

```bash
# PostgreSQL setup with pgvector
docker exec -it afroid-postgres psql -U afroid -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Create Alembic migration environment
cd services/platform/
uv run alembic init alembic
```

**Files to Create**:
1. `services/platform/alembic/versions/001_initial_schema.py` — All PostgreSQL tables
2. `services/platform/app/models/` — SQLAlchemy models matching `07-DATA-MODELS.md`
3. `services/shared/mongo_schemas/` — MongoDB collection schemas (JSON Schema validation)

**Acceptance Criteria**:
- [ ] `uv run alembic upgrade head` creates all tables without errors
- [ ] pgvector extension is active: `SELECT * FROM pg_extension WHERE extname = 'vector';`
- [ ] MongoDB collections created with validation schemas
- [ ] All foreign keys and indexes match `07-DATA-MODELS.md`

---

### Step 1.3: Auth Service

**Goal**: Implement JWT + OAuth2 authentication service.

**Files to Create** (reference `10-SECURITY-AUTH.md`):
1. `services/auth/app/main.py` — FastAPI app entry point
2. `services/auth/app/routes/auth.py` — Login, register, refresh, logout endpoints
3. `services/auth/app/routes/oauth.py` — Google OAuth2 flow
4. `services/auth/app/models/user.py` — User SQLAlchemy model
5. `services/auth/app/schemas/auth.py` — Pydantic request/response schemas
6. `services/auth/app/services/jwt_service.py` — JWT token creation/validation
7. `services/auth/app/services/password_service.py` — Argon2 hashing
8. `services/auth/app/middleware/auth_middleware.py` — Request authentication middleware
9. `services/auth/Dockerfile` — Production container
10. `services/auth/tests/` — Unit + integration tests

**Acceptance Criteria**:
- [ ] `POST /auth/register` creates user, returns JWT
- [ ] `POST /auth/login` validates credentials, returns access + refresh tokens
- [ ] `POST /auth/refresh` rotates tokens correctly
- [ ] `GET /auth/me` returns authenticated user profile
- [ ] OAuth2 Google flow completes successfully
- [ ] All passwords hashed with Argon2id
- [ ] Rate limiting active (10 req/min on auth endpoints)
- [ ] Tests pass with >90% coverage

---

## Phase 2: Platform Core (Days 8-14)

### Step 2.1: User & Billing Services

**Goal**: User profiles, organization management, and Stripe billing.

**Files to Create**:
1. `services/platform/app/routes/users.py` — CRUD user profiles
2. `services/platform/app/routes/organizations.py` — Org management, member roles
3. `services/platform/app/routes/billing.py` — Stripe subscription management
4. `services/platform/app/services/stripe_service.py` — Stripe API wrapper
5. `services/platform/app/webhooks/stripe_webhook.py` — Stripe event handling

**Acceptance Criteria**:
- [ ] Users can create/update profiles
- [ ] Organizations support OWNER, ADMIN, MEMBER, VIEWER roles
- [ ] Stripe checkout session creation works
- [ ] Webhook handles `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`
- [ ] Billing portal redirect functional

---

### Step 2.2: Shared SDK & UI Components

**Goal**: Create shared TypeScript SDK and React component library.

**Files to Create**:
1. `packages/sdk/src/client.ts` — API client with interceptors
2. `packages/sdk/src/types/` — Shared TypeScript types (generated from OpenAPI)
3. `packages/ui/src/components/` — Button, Input, Modal, Toast, Card, Layout, Sidebar, Editor
4. `packages/ui/src/styles/` — Design tokens, CSS variables, theme system
5. `packages/ui/package.json` — Component library package config

**Acceptance Criteria**:
- [ ] SDK auto-generates types from OpenAPI spec
- [ ] All UI components render correctly in Storybook
- [ ] Dark/light theme switching works
- [ ] Components are fully accessible (ARIA attributes)

---

### Step 2.3: Vector Store Service

**Goal**: Shared vector embedding and similarity search service.

**Files to Create**:
1. `services/vector_store/app/main.py` — FastAPI entry
2. `services/vector_store/app/routes/embeddings.py` — Embed text/documents
3. `services/vector_store/app/routes/search.py` — Similarity search endpoints
4. `services/vector_store/app/services/embedding_service.py` — Gemini text-embedding-005
5. `services/vector_store/app/services/pgvector_store.py` — pgvector CRUD operations
6. `services/vector_store/app/models/embedding.py` — Embedding SQLAlchemy model

**Acceptance Criteria**:
- [ ] `POST /embeddings` accepts text, returns 768-dim vector
- [ ] `POST /search` accepts query vector, returns top-K results with cosine similarity
- [ ] Batch embedding endpoint handles 100+ documents
- [ ] HNSW index created for fast approximate nearest neighbor search
- [ ] Latency < 100ms for top-10 search on 100K vectors

---

## Phase 3: geezcodE IDE (Days 15-33)

### Step 3.1: Monaco Editor Integration

**Goal**: Web-based code editor with file tree, terminal, and real-time preview.

**Reference**: `03-GEEZCODE-IDE.md`

**Files to Create**:
1. `apps/web/src/app/(ide)/editor/page.tsx` — Main IDE page layout
2. `apps/web/src/components/ide/MonacoEditor.tsx` — Monaco editor wrapper
3. `apps/web/src/components/ide/FileTree.tsx` — Virtual file system tree
4. `apps/web/src/components/ide/Terminal.tsx` — Xterm.js terminal emulator
5. `apps/web/src/components/ide/PreviewPanel.tsx` — Live preview iframe
6. `apps/web/src/components/ide/ConceptInput.tsx` — Natural language input panel
7. `apps/web/src/stores/ideStore.ts` — Zustand store for IDE state
8. `apps/web/src/hooks/useWebSocket.ts` — WebSocket connection hook
9. `apps/web/src/lib/virtualFs.ts` — In-memory virtual file system

**Acceptance Criteria**:
- [ ] Monaco editor loads with syntax highlighting for TS, Python, JSON, YAML, Markdown
- [ ] File tree displays virtual project structure with create/rename/delete
- [ ] Split pane layout: file tree | editor | preview
- [ ] Terminal emulator connects to backend shell
- [ ] Real-time cursor and code streaming via WebSocket
- [ ] Responsive layout down to 1024px width

---

### Step 3.2: DSL Parser & AST Engine

**Goal**: Custom DSL that maps high-level business concepts to code structures.

**Reference**: `03-GEEZCODE-IDE.md` → DSL Specification

**Files to Create**:
1. `services/codegen/app/dsl/lexer.py` — Tokenizer for geezcodE DSL
2. `services/codegen/app/dsl/parser.py` — Recursive descent parser → AST
3. `services/codegen/app/dsl/ast_nodes.py` — AST node type definitions
4. `services/codegen/app/dsl/semantics.py` — Semantic analysis + type checking
5. `services/codegen/app/dsl/codegen_visitor.py` — AST → code generation visitor pattern
6. `services/codegen/app/dsl/grammar.py` — Formal grammar specification
7. `services/codegen/tests/test_dsl_parser.py` — Parser tests with fixture DSL files
8. `services/codegen/tests/fixtures/` — Sample DSL input files

**Acceptance Criteria**:
- [ ] DSL parses business domain definitions into valid AST
- [ ] AST visitor generates TypeScript and Python code skeletons
- [ ] Error messages include line/column numbers
- [ ] 50+ test cases covering all DSL constructs
- [ ] Round-trip: DSL → AST → Code → AST matches original

---

### Step 3.3: Multi-Agent Orchestrator

**Goal**: LangGraph-based agent orchestration for code generation pipeline.

**Reference**: `04-MULTI-AGENT-SYSTEM.md`

**Files to Create**:
1. `services/orchestrator/app/main.py` — FastAPI entry
2. `services/orchestrator/app/graph/workflow.py` — LangGraph state machine
3. `services/orchestrator/app/agents/architect_agent.py` — System design agent
4. `services/orchestrator/app/agents/codegen_agent.py` — Code generation agent
5. `services/orchestrator/app/agents/reviewer_agent.py` — Code review agent
6. `services/orchestrator/app/agents/debugger_agent.py` — Error fixing agent
7. `services/orchestrator/app/prompts/` — All agent system prompts (one file per agent)
8. `services/orchestrator/app/tools/` — Agent tool definitions
9. `services/orchestrator/app/schemas/state.py` — LangGraph state schema
10. `services/orchestrator/app/services/streaming.py` — SSE/WebSocket streaming

**Acceptance Criteria**:
- [ ] Orchestrator accepts natural language, produces complete project
- [ ] Agent handoffs are logged and traceable
- [ ] Streaming works: user sees code being generated in real-time
- [ ] Retry logic handles LLM failures gracefully
- [ ] State machine diagram matches `04-MULTI-AGENT-SYSTEM.md`

---

### Step 3.4: Code Generation Engine

**Goal**: Full code generation from architecture blueprints to runnable projects.

**Files to Create**:
1. `services/codegen/app/main.py` — FastAPI entry
2. `services/codegen/app/generators/typescript_generator.py` — TS/React code generator
3. `services/codegen/app/generators/python_generator.py` — Python/FastAPI code generator
4. `services/codegen/app/generators/database_generator.py` — Schema + migration generator
5. `services/codegen/app/generators/docker_generator.py` — Dockerfile + compose generator
6. `services/codegen/app/templates/` — Jinja2 code templates organized by framework
7. `services/codegen/app/services/project_assembler.py` — Assembles files into project structure
8. `services/codegen/app/services/artifact_store.py` — Saves to MongoDB + GCS

**Acceptance Criteria**:
- [ ] Given an architecture blueprint, generates a complete runnable project
- [ ] TypeScript output passes `tsc --noEmit`
- [ ] Python output passes `mypy --strict`
- [ ] Generated projects include Dockerfile, CI config, README
- [ ] Code artifacts stored in MongoDB with version history
- [ ] Downloadable as .zip from GCS signed URL

---

## Phase 4: Afroid Certify (Days 34-46)

### Step 4.1: Compliance Rule Engine

**Reference**: `05-AFROID-CERTIFY.md`

**Files to Create**:
1. `services/certify/app/main.py` — FastAPI entry
2. `services/certify/app/engine/rule_engine.py` — Pluggable compliance rule evaluator
3. `services/certify/app/engine/rules/nigeria_startup_act.py` — Nigeria rules
4. `services/certify/app/engine/rules/kenya_startup_act.py` — Kenya rules
5. `services/certify/app/engine/rules/ethiopia_startup_act.py` — Ethiopia rules
6. `services/certify/app/engine/rules/au_digital_trade.py` — African Union rules
7. `services/certify/app/schemas/compliance.py` — Compliance result schemas

**Acceptance Criteria**:
- [ ] Rule engine evaluates codebase against selected jurisdiction(s)
- [ ] Returns structured compliance report with pass/fail per rule
- [ ] Rules are pluggable: new jurisdictions added without code changes
- [ ] Supports rule versioning for regulatory updates

---

### Step 4.2: IP Verification Service

**Files to Create**:
1. `services/certify/app/services/ip_verifier.py` — Code fingerprinting + similarity check
2. `services/certify/app/services/license_scanner.py` — Open source license detection
3. `services/certify/app/services/originality_scorer.py` — AI-powered originality scoring

**Acceptance Criteria**:
- [ ] Generates code fingerprint (MinHash + SimHash)
- [ ] Compares against known open-source repositories
- [ ] Returns originality score (0-100) with detailed report
- [ ] Detects license conflicts in dependencies

---

### Step 4.3: Audit Trail & Document Generator

**Files to Create**:
1. `services/certify/app/services/audit_trail.py` — Append-only audit log
2. `services/certify/app/services/doc_generator.py` — PDF/DOCX compliance docs
3. `services/certify/app/templates/docs/` — Jinja2 templates for each Startup Act

**Acceptance Criteria**:
- [ ] Audit entries are immutable (append-only MongoDB collection with hash chain)
- [ ] Each entry includes timestamp, actor, action, before/after state hash
- [ ] PDF generation produces professional compliance certificates
- [ ] Documents include QR code linking to verification endpoint

---

## Phase 5: Afroid Incubate (Days 34-53)

> **Note**: Phase 5 can run in parallel with Phase 4.

### Step 5.1: Opportunity Ingestion Pipeline

**Reference**: `06-AFROID-INCUBATE.md`

**Files to Create**:
1. `services/incubate/app/ingestion/scraper.py` — Web scraper for funding sources
2. `services/incubate/app/ingestion/normalizer.py` — Normalize opportunity data
3. `services/incubate/app/ingestion/embedder.py` — Generate vector embeddings
4. `services/incubate/app/models/opportunity.py` — Opportunity data model
5. `services/incubate/app/jobs/sync_opportunities.py` — Scheduled sync job

**Acceptance Criteria**:
- [ ] Ingests opportunities from configured sources
- [ ] Normalizes into standard schema (title, funder, amount, deadline, eligibility, region)
- [ ] Generates and stores 768-dim embeddings per opportunity
- [ ] Handles 3,000+ opportunities without timeout
- [ ] Deduplication by fuzzy matching on title + funder

---

### Step 5.2: Matcher & Vector Search

**Files to Create**:
1. `services/incubate/app/matcher/profile_embedder.py` — Embed startup profiles
2. `services/incubate/app/matcher/similarity_engine.py` — Cosine similarity ranking
3. `services/incubate/app/matcher/filter_engine.py` — Hard filter (region, amount, deadline)
4. `services/incubate/app/routes/matches.py` — Match API endpoints

**Acceptance Criteria**:
- [ ] Matches startup profile against 3,000+ opportunities in < 500ms
- [ ] Returns top-20 ranked matches with similarity scores
- [ ] Hard filters narrow results before vector search
- [ ] Re-ranking with cross-encoder improves precision

---

### Step 5.3: OCR & Autofill Service

**Files to Create**:
1. `services/incubate/app/ocr/vision_client.py` — Google Cloud Vision API wrapper
2. `services/incubate/app/ocr/document_parser.py` — Extract structured data from PDFs
3. `services/incubate/app/autofill/form_mapper.py` — Map extracted data to form fields
4. `services/incubate/app/autofill/field_resolver.py` — Resolve ambiguous field mappings

**Acceptance Criteria**:
- [ ] Extracts text from scanned PDFs with >95% accuracy
- [ ] Parses tables, headers, and structured sections
- [ ] Maps extracted data to standardized form fields
- [ ] Handles multiple document formats (PDF, DOCX, images)
- [ ] Auto-fills 95% of fields for matched opportunities

---

### Step 5.4: AI Writing Engine

**Files to Create**:
1. `services/incubate/app/writer/grant_composer.py` — Grant narrative generator
2. `services/incubate/app/writer/section_templates.py` — Section-specific prompts
3. `services/incubate/app/writer/quality_scorer.py` — AI quality assessment
4. `services/incubate/app/writer/tone_adjuster.py` — Institutional tone calibration

**Acceptance Criteria**:
- [ ] Generates grant narratives from startup profile + opportunity requirements
- [ ] Supports sections: Executive Summary, Problem, Solution, Impact, Budget, Timeline
- [ ] Quality score correlates with actual grant success patterns
- [ ] Output reads as professional institutional writing, not AI-generated
- [ ] Handles word count constraints per section

---

## Phase 6: Integration & Deployment (Days 54-62)

### Step 6.1: End-to-End Integration

**Goal**: Wire all services together and test complete user journeys.

**Tasks**:
1. Connect IDE → Orchestrator → CodeGen → Certify → Incubate pipeline
2. Implement Pub/Sub event routing between all services
3. Create integration test suite covering all 3 core flows
4. Load test with 100 concurrent users

**Acceptance Criteria**:
- [ ] Flow 1 (Idea → Code): Complete in < 5 minutes for a medium project
- [ ] Flow 2 (Code → Certification): Complete in < 2 minutes
- [ ] Flow 3 (Profile → Matches): Returns results in < 3 seconds
- [ ] No data loss under concurrent load
- [ ] All Pub/Sub events delivered and processed

---

### Step 6.2: Infrastructure Deployment

**Reference**: `09-INFRASTRUCTURE.md`

**Tasks**:
1. Apply Terraform configs to create GCP resources
2. Deploy all services to Cloud Run
3. Configure Cloud SQL, Memorystore, MongoDB Atlas
4. Set up Cloud CDN for static assets
5. Configure monitoring and alerting

**Acceptance Criteria**:
- [ ] `terraform plan` shows clean diff
- [ ] `terraform apply` completes without errors
- [ ] All services healthy on Cloud Run
- [ ] Database connections verified from services
- [ ] SSL/TLS certificates active on all endpoints
- [ ] Monitoring dashboards showing metrics

---

## Phase 7: Launch (Days 63-72)

### Step 7.1: Security Audit & Load Testing

**Tasks**:
1. Run OWASP ZAP against all endpoints
2. Perform dependency vulnerability scan
3. Load test: 1,000 concurrent users
4. Penetration testing on auth flows

**Acceptance Criteria**:
- [ ] Zero critical/high OWASP findings
- [ ] All dependencies at latest secure versions
- [ ] P95 latency < 2s under 1,000 concurrent users
- [ ] No auth bypass vulnerabilities

---

### Step 7.2: Staging Deployment

**Tasks**:
1. Deploy to staging environment (`africa-south1`)
2. Run full regression suite
3. User acceptance testing with 10 beta founders
4. Performance benchmarks match production targets

---

### Step 7.3: Production Launch

**Tasks**:
1. Blue-green deployment to production
2. Gradual traffic migration (10% → 50% → 100%)
3. Monitor error rates and latency
4. Enable alerting policies

---

> **Next Blueprint**: [`01-PROJECT-STRUCTURE.md`](./01-PROJECT-STRUCTURE.md)
