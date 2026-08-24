# Afroid: Sovereign Autonomous Startup Factory — Master Architecture Blueprint

> **Document Type**: Executable Architectural Blueprint  
> **Version**: 1.0.0  
> **Status**: Ready for Execution  
> **Target Executor**: Any frontier AI model or senior engineering team  

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Service Boundary Map](#3-service-boundary-map)
4. [Data Flow Architecture](#4-data-flow-architecture)
5. [Blueprint Index](#5-blueprint-index)
6. [Execution Order](#6-execution-order)
7. [Non-Negotiable Constraints](#7-non-negotiable-constraints)

---

## 1. System Overview

Afroid is composed of **three primary systems** and **one shared infrastructure layer**:

| System | Codename | Role |
|--------|----------|------|
| **geezcodE IDE** | `geezcode` | Deep-tech web IDE — transforms business concepts into production-ready codebases via multi-agent AI orchestration |
| **Afroid Certify** | `certify` | RegTech compliance engine — audits code/IP, generates Startup Act documentation, maintains immutable audit trails |
| **Afroid Incubate** | `incubate` | Non-dilutive funding pipeline — matches startups to $3B+ opportunities via vector search, auto-populates 95% of applications |
| **Shared Platform** | `platform` | Auth, billing, user management, shared APIs, vector store, infrastructure |

---

## 2. High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB["Next.js 15 Web App<br/>(TypeScript/React 19)"]
        IDE["Monaco-based IDE<br/>(geezcodE Editor)"]
    end

    subgraph "API Gateway"
        GW["Kong / Cloud Endpoints<br/>Rate Limiting, Auth, Routing"]
    end

    subgraph "Core Services (Python/FastAPI)"
        AUTH["Auth Service<br/>(JWT + OAuth2)"]
        ORCH["Multi-Agent Orchestrator<br/>(LangGraph + Gemini)"]
        CODEGEN["Code Generation Engine<br/>(AST/DSL Pipeline)"]
        CERTIFY["Certify Engine<br/>(Compliance + IP Audit)"]
        INCUBATE["Incubate Engine<br/>(Funding Matcher)"]
        WRITER["AI Writing Engine<br/>(Grant Composer)"]
        OCR["OCR Pipeline<br/>(Cloud Vision API)"]
    end

    subgraph "Data Layer"
        PG["PostgreSQL 16<br/>(pgvector extension)"]
        REDIS["Redis 7<br/>(Cache + Queues)"]
        MONGO["MongoDB 7<br/>(Code Artifacts + Audit Logs)"]
        GCS["Google Cloud Storage<br/>(File Assets)"]
    end

    subgraph "ML/AI Layer"
        GEMINI["Gemini 2.5 Pro<br/>(Core LLM)"]
        VERTEX["Vertex AI<br/>(Custom Models)"]
        TPU["Cloud TPU v5e<br/>(Fine-tuning)"]
        EMBED["Embedding Service<br/>(text-embedding-005)"]
    end

    subgraph "Infrastructure"
        RUN["Cloud Run<br/>(Stateless Services)"]
        GKE["GKE Autopilot<br/>(Stateful Workloads)"]
        PUB["Pub/Sub<br/>(Event Bus)"]
        MON["Cloud Monitoring<br/>+ Grafana"]
    end

    WEB --> GW
    IDE --> GW
    GW --> AUTH
    GW --> ORCH
    GW --> CERTIFY
    GW --> INCUBATE
    ORCH --> CODEGEN
    ORCH --> GEMINI
    CODEGEN --> GEMINI
    CERTIFY --> PG
    CERTIFY --> MONGO
    INCUBATE --> EMBED
    INCUBATE --> PG
    INCUBATE --> WRITER
    WRITER --> GEMINI
    OCR --> GCS
    EMBED --> VERTEX
    AUTH --> PG
    AUTH --> REDIS
    CODEGEN --> MONGO
    CODEGEN --> GCS
    INCUBATE --> OCR
    RUN --> PUB
```

---

## 3. Service Boundary Map

Each service is an **independently deployable container** communicating via REST APIs and Pub/Sub events.

```mermaid
graph LR
    subgraph "Domain: Identity"
        S1["auth-service"]
        S2["user-service"]
        S3["billing-service"]
    end

    subgraph "Domain: geezcodE"
        S4["orchestrator-service"]
        S5["codegen-service"]
        S6["dsl-parser-service"]
        S7["blueprint-service"]
    end

    subgraph "Domain: Certify"
        S8["compliance-service"]
        S9["ip-verification-service"]
        S10["audit-trail-service"]
        S11["doc-generator-service"]
    end

    subgraph "Domain: Incubate"
        S12["opportunity-service"]
        S13["matcher-service"]
        S14["autofill-service"]
        S15["writing-engine-service"]
        S16["ocr-service"]
    end

    subgraph "Domain: Shared"
        S17["vector-store-service"]
        S18["notification-service"]
        S19["analytics-service"]
    end
```

### Inter-Service Communication

| Pattern | Use Case | Technology |
|---------|----------|------------|
| **Synchronous REST** | User-facing CRUD, real-time queries | FastAPI → HTTP/JSON |
| **Async Events** | Code generation completion, audit triggers, funding matches | Google Pub/Sub |
| **WebSocket** | IDE real-time updates, live code generation streaming | Socket.IO over Cloud Run |
| **gRPC (internal)** | High-throughput vector lookups, embedding requests | gRPC + Protobuf |

---

## 4. Data Flow Architecture

### Flow 1: Idea → Production Code (geezcodE)

```mermaid
sequenceDiagram
    participant F as Founder (Browser)
    participant IDE as geezcodE IDE
    participant O as Orchestrator
    participant A1 as Architect Agent
    participant A2 as CodeGen Agent
    participant A3 as Reviewer Agent
    participant DB as MongoDB
    participant GCS as Cloud Storage

    F->>IDE: Describe business concept (natural language)
    IDE->>O: Submit concept payload
    O->>A1: Generate architecture blueprint
    A1->>O: Return system design + AST skeleton
    O->>A2: Generate code from AST + DSL spec
    A2->>O: Return generated codebase modules
    O->>A3: Review code quality + security
    A3->>O: Return review results + fixes
    O->>DB: Store versioned code artifacts
    O->>GCS: Store downloadable project archive
    O->>IDE: Stream results via WebSocket
    IDE->>F: Display generated project in editor
```

### Flow 2: Code → Certification (Certify)

```mermaid
sequenceDiagram
    participant IDE as geezcodE IDE
    participant C as Compliance Service
    participant IP as IP Verification
    participant AT as Audit Trail
    participant DG as Doc Generator
    participant DB as PostgreSQL

    IDE->>C: Trigger certification (project_id)
    C->>IP: Verify IP originality (code fingerprint)
    IP->>C: Return originality score + report
    C->>AT: Create immutable audit entry
    AT->>DB: Write audit log (append-only)
    C->>DG: Generate compliance docs
    DG->>C: Return formatted documents (PDF/JSON)
    C->>IDE: Return certification status + documents
```

### Flow 3: Profile → Funding Match (Incubate)

```mermaid
sequenceDiagram
    participant F as Founder
    participant M as Matcher Service
    participant VS as Vector Store
    participant AF as Autofill Service
    participant WE as Writing Engine
    participant OCR as OCR Service

    F->>M: Request funding matches
    M->>VS: Query vector similarity (startup embedding vs opportunities)
    VS->>M: Return top-K matches with scores
    M->>F: Display ranked opportunities
    F->>AF: Select opportunity → auto-fill application
    AF->>OCR: Extract data from uploaded documents
    OCR->>AF: Return structured data
    AF->>WE: Draft application narrative
    WE->>AF: Return polished grant text
    AF->>F: Present 95% completed application for review
```

---

## 5. Blueprint Index

Each blueprint below is a **self-contained, executable specification**. They must be read and executed in the order specified in Section 6.

| # | Blueprint File | Description |
|---|----------------|-------------|
| 00 | [`00-EXECUTION-PLAYBOOK.md`](./blueprints/00-EXECUTION-PLAYBOOK.md) | Step-by-step build phases with exact commands and acceptance criteria |
| 01 | [`01-PROJECT-STRUCTURE.md`](./blueprints/01-PROJECT-STRUCTURE.md) | Complete directory tree with every file path and purpose |
| 02 | [`02-TECH-STACK.md`](./blueprints/02-TECH-STACK.md) | Every technology, version, and justification |
| 03 | [`03-GEEZCODE-IDE.md`](./blueprints/03-GEEZCODE-IDE.md) | IDE architecture: Monaco, real-time collaboration, file system |
| 04 | [`04-MULTI-AGENT-SYSTEM.md`](./blueprints/04-MULTI-AGENT-SYSTEM.md) | Agent definitions, orchestration graph, prompt chains |
| 05 | [`05-AFROID-CERTIFY.md`](./blueprints/05-AFROID-CERTIFY.md) | Compliance engine, IP verification, audit trail, doc generation |
| 06 | [`06-AFROID-INCUBATE.md`](./blueprints/06-AFROID-INCUBATE.md) | Vector matching, OCR pipeline, AI writer, auto-population |
| 07 | [`07-DATA-MODELS.md`](./blueprints/07-DATA-MODELS.md) | All database schemas: PostgreSQL, MongoDB, Redis, Vector Store |
| 08 | [`08-API-CONTRACTS.md`](./blueprints/08-API-CONTRACTS.md) | Every REST endpoint, WebSocket event, and gRPC service definition |
| 09 | [`09-INFRASTRUCTURE.md`](./blueprints/09-INFRASTRUCTURE.md) | GCP Terraform modules, Cloud Run configs, TPU allocation |
| 10 | [`10-SECURITY-AUTH.md`](./blueprints/10-SECURITY-AUTH.md) | Authentication, authorization, data encryption, RBAC |
| 11 | [`11-CI-CD-PIPELINE.md`](./blueprints/11-CI-CD-PIPELINE.md) | GitHub Actions, Cloud Build, testing, deployment pipelines |

---

## 6. Execution Order

> **CRITICAL**: Build phases must be executed sequentially. Each phase depends on artifacts from the previous phase.

```mermaid
gantt
    title Afroid Build Execution Timeline
    dateFormat  YYYY-MM-DD
    axisFormat  %b %d

    section Phase 1: Foundation
    Monorepo scaffolding           :p1a, 2026-08-25, 2d
    Database schemas + migrations  :p1b, after p1a, 2d
    Auth service                   :p1c, after p1b, 3d

    section Phase 2: Platform Core
    User + Billing services        :p2a, after p1c, 3d
    Shared SDK + UI components     :p2b, after p1c, 4d
    Vector store service           :p2c, after p1c, 3d

    section Phase 3: geezcodE IDE
    Monaco editor integration      :p3a, after p2b, 5d
    DSL parser + AST engine        :p3b, after p2a, 5d
    Multi-agent orchestrator       :p3c, after p3b, 7d
    Code generation engine         :p3d, after p3c, 7d

    section Phase 4: Certify
    Compliance rule engine         :p4a, after p3d, 5d
    IP verification service        :p4b, after p4a, 4d
    Audit trail + Doc generator    :p4c, after p4b, 4d

    section Phase 5: Incubate
    Opportunity ingestion pipeline :p5a, after p2c, 5d
    Matcher + Vector search        :p5b, after p5a, 5d
    OCR + Autofill service         :p5c, after p5b, 5d
    AI writing engine              :p5d, after p5c, 5d

    section Phase 6: Integration
    End-to-end integration         :p6a, after p4c, 5d
    Infrastructure deployment      :p6b, after p6a, 4d

    section Phase 7: Launch
    Load testing + Security audit  :p7a, after p6b, 5d
    Staging deployment             :p7b, after p7a, 3d
    Production launch              :p7c, after p7b, 2d
```

---

## 7. Non-Negotiable Constraints

These constraints are **absolute** and must be enforced across every blueprint:

### Architecture Constraints
- **Monorepo**: All code lives in a single repository managed by Turborepo (TS) and uv workspaces (Python)
- **Container-First**: Every service must be deployable as a Docker container
- **Stateless Services**: All services on Cloud Run must be stateless; state lives in databases
- **Event-Driven**: Cross-service communication uses Pub/Sub for async operations

### Technology Constraints
- **Frontend**: TypeScript 5.5+, React 19, Next.js 15 (App Router), NO Pages Router
- **Backend**: Python 3.12+, FastAPI 0.115+, Pydantic v2 for all data validation
- **LLM**: Google Gemini 2.5 Pro via Vertex AI SDK (NOT direct API keys in production)
- **Database**: PostgreSQL 16 with pgvector 0.7+, MongoDB 7, Redis 7
- **IaC**: Terraform 1.9+ with Google provider, NO ClickOps

### Security Constraints
- **Zero Trust**: All inter-service calls authenticated via service accounts
- **Encryption**: TLS 1.3 in transit, AES-256 at rest, CMEK for sensitive data
- **Data Residency**: All production data hosted in `africa-south1` (Johannesburg)
- **RBAC**: Role-based access control on every endpoint
- **Audit Logging**: Every state mutation logged to immutable audit trail

### Code Quality Constraints
- **Type Safety**: 100% type coverage in TypeScript; strict mypy in Python
- **Testing**: Minimum 80% code coverage; unit + integration + e2e tests
- **Linting**: ESLint + Prettier (TS), Ruff + Black (Python)
- **Documentation**: Every public API must have OpenAPI spec; every module must have docstrings
- **Git**: Conventional Commits, trunk-based development, PR reviews required

---

> **Next Step**: Begin execution by reading [`blueprints/00-EXECUTION-PLAYBOOK.md`](./blueprints/00-EXECUTION-PLAYBOOK.md)
