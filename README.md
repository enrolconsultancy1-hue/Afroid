# 🌍 Afroid: The Sovereign Autonomous Startup Factory

> **Empowering African founders to build, certify, and fund startups autonomously — without permission.**

[![Python 3.12](https://img.shields.io/badge/python-3.12+-3776AB.svg?logo=python&logoColor=white)]()
[![TypeScript 5.5](https://img.shields.io/badge/typescript-5.5+-3178C6.svg?logo=typescript&logoColor=white)]()
[![Next.js 15](https://img.shields.io/badge/next.js-15.0+-000000.svg?logo=next.js&logoColor=white)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688.svg?logo=fastapi&logoColor=white)]()
[![Google Cloud africa-south1](https://img.shields.io/badge/gcp-africa--south1-4285F4.svg?logo=google-cloud&logoColor=white)]()
[![Verification](https://img.shields.io/badge/tests-11%2F11%20PASSED-brightgreen.svg)]()

---

## 🏛️ System Overview

Afroid is a deep-tech autonomous startup acceleration ecosystem designed specifically for the African continent. It is built on **three sovereign pillars** supported by a resilient multi-engine microservices backend:

```
                                  +---------------------------------------+
                                  |     geezcodE Professional Web IDE     |
                                  |   (Next.js 15, Monaco, Swarm Studio)  |
                                  +---------------------------------------+
                                                     |
                                  +---------------------------------------+
                                  |        Dynamic AI Model Hub           |
                                  | (Gemini 2.5 Pro / Flash / 3.x / Custom)|
                                  +---------------------------------------+
                                                     |
             +---------------------------------------+---------------------------------------+
             |                                       |                                       |
+--------------------------+           +--------------------------+            +--------------------------+
|      geezcodE IDE        |           |      Afroid Certify      |            |     Afroid Incubate      |
|  Zero-Question Intake    |           |   RegTech Rule Engine    |            |   Semantic Grant Engine  |
|  Parallel Sub-Agent Core |           |  Startup Act Compliance  |            |   $3B+ African Funding   |
|  Live Monaco Code Sync   |           |  SHA-256 Audit Trails    |            |   94%+ Form Autofill AI  |
+--------------------------+           +--------------------------+            +--------------------------+
             |                                       |                                       |
             +---------------------------------------+---------------------------------------+
                                                     |
                                  +---------------------------------------+
                                  |    Shared Sovereign Infrastructure    |
                                  | Cloud SQL (pgvector) | Redis 7 | GCP  |
                                  +---------------------------------------+
```

---

## ⚡ The Three Core Pillars

### 1. 🚀 geezcodE IDE (Antigravity-Level Web IDE)
- **Zero-Question Architect Intake**: Translates high-level business ideas into complete **Architectural Blueprint Previews** (tech stack, services, schemas, endpoints, directory trees) with **NO QUESTIONS TO ASK**.
- **Parallel Sub-Agent Swarm**: Dispatches concurrent sub-agents (*Architect Swarm*, *CodeGen Worker 1*, *CodeGen Worker 2*, *QA Test Runner*, *Compliance Auditor*) to generate, test, and audit code files session-by-session.
- **Modern Professional Layout**: Leftmost Activity Bar, file breadcrumbs (`workspace / services / api / main.py`), JetBrains Mono / Fira Code editor, bottom integrated terminal drawer, live status bar, and **Autopilot vs Interactive Review** mode toggles.

### 2. 🛡️ Afroid Certify (RegTech Compliance Engine)
- **Multi-Jurisdiction Rules**: Validates projects against the **Nigeria Startup Act**, **Kenya Startup Bill**, **Ethiopia**, and **African Union (AU) Startup Framework**.
- **MinHash IP Originality**: N-gram shingling & Jaccard similarity to verify code and concept originality.
- **Cryptographic Audit Trail**: Tamper-proof SHA-256 hash-chained ledger storing immutable verification proofs.

### 3. 💰 Afroid Incubate (Grant Matching & AI Writer)
- **$3B+ Funding Catalog**: Built-in seeder tracking Tony Elumelu Foundation, ASIP, Google for Startups Africa, Mastercard Foundation, KeNIA, and develoPPP.
- **Semantic Matching**: High-dimensional cosine similarity matching via `pgvector` dense embeddings.
- **94%+ Form Autofill & AI Grant Writer**: Auto-maps startup profiles into grant applications and drafts compliant narrative proposals with Gemini.

---

## 🔌 Microservices Matrix

| Microservice | Port | Primary Responsibility | Key Tech |
|--------------|------|------------------------|----------|
| **`services/auth`** | `8000` | Argon2id Authentication & JWT Token Lifecycle | FastAPI, PyJWT, Argon2 |
| **`services/platform`** | `8001` | Organizations, Projects & Startup Profiles | FastAPI, SQLAlchemy 2 |
| **`services/orchestrator`** | `8002` | Multi-Agent Swarm, Model Hub, WebSockets (`/ws`) | LangGraph, Gemini, WebSockets |
| **`services/certify`** | `8003` | RegTech Compliance Engine & MinHash IP Verifier | Python, Cryptography |
| **`services/incubate`** | `8004` | Semantic Grant Matching & Form Autofill Engine | pgvector, Gemini AI |
| **`services/vector_store`**| `8005` | 768-dim Embedding Service (`text-embedding-004`) | pgvector, Vertex AI |
| **`services/codegen`** | `8006` | Jinja2 Template Rendering & AST Syntax Validator | Jinja2, Python AST |
| **`services/notification`**| `8007` | Transactional Email, SMS & HMAC-Signed Webhooks | Python, HMAC-SHA256 |
| **`apps/web`** | `3000` | Next.js 15 Web Application & geezcodE IDE | Next.js 15, Monaco, Tailwind |

---

---

## 🛠️ Unified Developer & Operator CLI (`afroid` & `geezcodE`)

### 1. `geezcodE` Multi-Agent Builder CLI ([`cli/geezcode.py`](./cli/geezcode.py))

```bash
# Formulate zero-question blueprint and trigger parallel sub-agent swarm builder
python cli/geezcode.py build "Decentralized Agri-Commodity Marketplace"

# Start interactive geezcodE developer shell with sovereign ASCII prompt
python cli/geezcode.py
```

```text
       ╭─────────────╮
      ╱               ╲
     │     < ፩ />      │
      ╲               ╱
       ╰─────────────╯

          geezcodE
       CODE • BUILD • SHIP
```

### 2. `afroid` Platform Operations CLI ([`cli/afroid.py`](./cli/afroid.py))

```bash
# 1. Run full platform verification smoke tests (11/11 PASSED)
python cli/afroid.py test

# 2. Scan and list available Gemini models from Google AI API
python cli/afroid.py model-sync

# 3. Run instant RegTech compliance check for Nigeria, Kenya, Ethiopia, or AU
python cli/afroid.py certify -c nigeria --name "AfroHealth Technologies"

# 4. Formulate Zero-Question Architectural Blueprint from CLI
python cli/afroid.py blueprint "Micro-lending platform for rural farmers"

# 5. Populate database with 50+ African funding programs
python cli/afroid.py seed
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.12+
- Node.js 22+
- Docker & Docker Compose

### 1. Clone & Install Dependencies
```bash
# Frontend & Monorepo Packages
npm ci

# Python Backend Dependencies
pip install structlog pydantic pydantic-settings jinja2 httpx python-slugify argon2-cffi pyjwt pytest pytest-asyncio
```

### 2. Launch Local Data Infrastructure
```bash
docker-compose up -d postgres redis
```

### 3. Run Database Migrations
```bash
# Applies all 12 PostgreSQL tables + pgvector HNSW indexes
cd services/platform && alembic upgrade head && cd ../..
```

### 4. Run Smoke Test Suite
```bash
python scripts/smoke_test.py
```

### 5. Start Next.js 15 Web Platform
```bash
npm run dev --workspace=web
# Open http://localhost:3000 in your browser
```

---

## ☁️ Production Deployment (GCP `africa-south1`)

Infrastructure is managed using **Terraform** targeting the Google Cloud region in **Johannesburg, South Africa** (`africa-south1`) for data sovereignty:

```bash
cd infra/terraform

# Initialize Terraform modules
terraform init

# Review execution plan
terraform plan

# Provision Cloud SQL (pgvector), Redis Memorystore, and Cloud Run microservices
terraform apply
```

Automated CI/CD workflows in [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) and [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) handle automated linting, matrix testing, Docker image packaging, and zero-downtime deployment on push to `main`.

---

## 📜 Blueprints & Architecture Documentation

For complete engineering specifications, review:
- **[`ARCHITECTURE.md`](./ARCHITECTURE.md)**: Master architectural blueprint.
- **[`NEXT_TASK.md`](./NEXT_TASK.md)**: Persistent session tracker & completed milestones.
- **[`blueprints/`](./blueprints/)**: 12 detailed component architecture blueprints.

---

## ⚖️ License
Proprietary — All rights reserved. Afroid Technologies Inc.
