# Blueprint 08: API Contracts

> **Purpose**: Complete REST API endpoint specifications with request/response schemas, authentication, and error handling.  
> **Rule**: All APIs follow OpenAPI 3.1 conventions. Every endpoint is documented here.

---

## 1. API Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Base URL** | `https://api.afroid.io/v1` |
| **Protocol** | HTTPS only (TLS 1.3) |
| **Format** | JSON request/response bodies |
| **Auth** | Bearer JWT tokens in `Authorization` header |
| **Pagination** | Cursor-based: `?cursor=xxx&limit=20` |
| **Errors** | RFC 7807 Problem Details |
| **Versioning** | URL path: `/v1/`, `/v2/` |
| **Rate Limiting** | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers |
| **CORS** | Allowed origins: `app.afroid.io`, `localhost:3000` |

---

## 2. Standard Response Envelope

```typescript
// Success response
interface ApiResponse<T> {
  data: T;
  meta?: {
    cursor?: string;        // Next page cursor
    has_more?: boolean;     // More results available
    total?: number;         // Total count (when available)
  };
}

// Error response (RFC 7807)
interface ApiError {
  type: string;             // Error type URI
  title: string;            // Human-readable title
  status: number;           // HTTP status code
  detail: string;           // Detailed error message
  instance?: string;        // Request path
  errors?: {                // Field-level validation errors
    field: string;
    message: string;
    code: string;
  }[];
}
```

---

## 3. Auth Service API (`/v1/auth`)

### `POST /v1/auth/register`
Create a new user account.

```yaml
Request:
  body:
    email: string           # required, valid email
    password: string        # required, min 8 chars, 1 uppercase, 1 number
    full_name: string       # required, min 2 chars

Response 201:
  data:
    user:
      id: uuid
      email: string
      full_name: string
      role: "user"
      is_verified: false
      created_at: datetime
    tokens:
      access_token: string   # JWT, expires in 30min
      refresh_token: string  # Opaque token, expires in 30 days
      token_type: "Bearer"
      expires_in: 1800

Response 409:
  title: "Email already registered"
  detail: "An account with this email already exists"
```

### `POST /v1/auth/login`
Authenticate with email and password.

```yaml
Request:
  body:
    email: string
    password: string

Response 200:
  data:
    user: { id, email, full_name, role, is_verified, last_login_at }
    tokens: { access_token, refresh_token, token_type, expires_in }

Response 401:
  title: "Invalid credentials"
```

### `POST /v1/auth/refresh`
Refresh access token.

```yaml
Request:
  body:
    refresh_token: string

Response 200:
  data:
    tokens: { access_token, refresh_token, token_type, expires_in }

Response 401:
  title: "Invalid or expired refresh token"
```

### `POST /v1/auth/logout`
Revoke refresh token.

```yaml
Request:
  headers:
    Authorization: "Bearer {access_token}"
  body:
    refresh_token: string

Response 204: (no content)
```

### `GET /v1/auth/me`
Get current user profile.

```yaml
Request:
  headers:
    Authorization: "Bearer {access_token}"

Response 200:
  data:
    id: uuid
    email: string
    full_name: string
    avatar_url: string?
    role: "user" | "admin"
    is_verified: boolean
    organizations: [{ id, name, slug, role }]
    created_at: datetime
```

### `GET /v1/auth/oauth/google`
Initiate Google OAuth2 flow.

```yaml
Response 302: Redirect to Google consent screen
```

### `GET /v1/auth/oauth/google/callback`
Handle Google OAuth2 callback.

```yaml
Query Params:
  code: string
  state: string

Response 302: Redirect to frontend with tokens in URL fragment
```

---

## 4. Projects API (`/v1/projects`)

### `POST /v1/projects`
Create a new project.

```yaml
Auth: Required
Request:
  body:
    name: string                # required
    description: string?
    organization_id: uuid?       # optional, personal project if omitted

Response 201:
  data:
    id: uuid
    name: string
    slug: string
    description: string?
    status: "draft"
    owner_id: uuid
    organization_id: uuid?
    created_at: datetime
```

### `GET /v1/projects`
List user's projects.

```yaml
Auth: Required
Query Params:
  cursor: string?
  limit: int (1-100, default 20)
  status: "draft" | "active" | "archived"?
  organization_id: uuid?

Response 200:
  data: Project[]
  meta: { cursor, has_more, total }
```

### `GET /v1/projects/{project_id}`
Get project details.

```yaml
Auth: Required (owner or org member)

Response 200:
  data:
    id: uuid
    name: string
    slug: string
    description: string?
    status: string
    owner_id: uuid
    organization_id: uuid?
    settings: object
    ide_metadata: object
    profile: StartupProfile?      # Nested startup profile
    latest_certification: CertificationSummary?
    created_at: datetime
    updated_at: datetime
```

### `PUT /v1/projects/{project_id}`
Update project.

```yaml
Auth: Required (owner or admin)
Request:
  body:
    name: string?
    description: string?
    status: "draft" | "active" | "archived"?
    settings: object?

Response 200:
  data: Project
```

### `DELETE /v1/projects/{project_id}`
Soft-delete project.

```yaml
Auth: Required (owner only)
Response 204: (no content)
```

---

## 5. IDE / Orchestration API (`/v1/orchestrate`)

### `POST /v1/orchestrate`
Start a code generation session.

```yaml
Auth: Required
Request:
  body:
    project_id: uuid
    concept:
      description: string        # Natural language concept
      domain: string?            # Business domain
      target_market: string[]?
      application_type: string?
      tech_preferences:
        frontend: string?
        backend: string?
        database: string[]?
      scale:
        expected_users: string?
        compute_needs: string?
      compliance: string[]?      # Startup Act jurisdictions
    settings:
      generate_tests: boolean (default true)
      generate_docs: boolean (default true)
      generate_docker: boolean (default true)
      code_style: "clean" | "verbose" | "production" (default "production")

Response 202:
  data:
    job_id: uuid
    session_id: uuid
    status: "queued"
    websocket_url: "wss://api.afroid.io/ws/{session_id}"
```

### `GET /v1/orchestrate/{job_id}/status`
Get generation job status.

```yaml
Auth: Required

Response 200:
  data:
    job_id: uuid
    status: "queued" | "running" | "waiting_approval" | "complete" | "error"
    current_agent: string?
    progress:
      current: int
      total: int
      phase: string
    agent_history: AgentEvent[]
    error_message: string?
    started_at: datetime?
    completed_at: datetime?
```

### `POST /v1/orchestrate/{job_id}/approve`
Approve architecture to proceed to code generation.

```yaml
Auth: Required
Request:
  body:
    approved: boolean
    feedback: string?           # Revision notes if not approved

Response 200:
  data:
    status: "running" | "waiting_approval"
```

### `GET /v1/orchestrate/{job_id}/artifacts`
Download generated code.

```yaml
Auth: Required
Query Params:
  format: "zip" | "json" (default "json")

Response 200 (json):
  data:
    files: [{ path, content, language, size }]

Response 200 (zip):
  Content-Type: application/zip
  Content-Disposition: attachment; filename="project.zip"
```

---

## 6. Certify API (`/v1/certify`)

### `POST /v1/certify/{project_id}`
Initiate certification.

```yaml
Auth: Required (project owner/admin)
Request:
  body:
    jurisdictions: string[]      # ["nigeria", "kenya", "au"]

Response 202:
  data:
    job_id: uuid
    status: "pending"
```

### `GET /v1/certify/{project_id}/status/{job_id}`
Get certification status.

```yaml
Auth: Required

Response 200:
  data:
    job_id: uuid
    status: "pending" | "running" | "passed" | "failed" | "conditional"
    compliance_score: float?
    compliance_report:
      overall_status: string
      score: float
      results: RuleResult[]
    ip_report:
      originality_score: float
      similarities: Similarity[]
      license_issues: LicenseIssue[]
    completed_at: datetime?
```

### `GET /v1/certify/{project_id}/report`
Get latest compliance report.

```yaml
Auth: Required
Response 200:
  data: ComplianceReport
```

### `GET /v1/certify/{project_id}/certificate`
Download compliance certificate.

```yaml
Auth: Required
Response 200:
  Content-Type: application/pdf
  Content-Disposition: attachment; filename="compliance-certificate.pdf"
```

### `GET /v1/certify/{project_id}/audit-trail`
Get project audit trail.

```yaml
Auth: Required
Query Params:
  cursor: string?
  limit: int (default 50)
  action: string?
  start_date: datetime?
  end_date: datetime?

Response 200:
  data: AuditEntry[]
  meta: { cursor, has_more }
```

---

## 7. Incubate API (`/v1/incubate`)

### `GET /v1/incubate/opportunities`
List funding opportunities.

```yaml
Auth: Required
Query Params:
  cursor: string?
  limit: int (default 20)
  funding_type: string?
  region: string?
  sector: string?
  min_amount: float?
  max_amount: float?
  deadline_after: date?
  status: "active" (default)
  q: string?                    # Full-text search

Response 200:
  data: Opportunity[]
  meta: { cursor, has_more, total }
```

### `POST /v1/incubate/matches`
Find matching opportunities for startup.

```yaml
Auth: Required
Request:
  body:
    project_id: uuid
    filters:
      regions: string[]?
      sectors: string[]?
      funding_types: string[]?
      min_amount: float?
      max_amount: float?
      deadline_after: date?
    top_k: int (default 20, max 50)

Response 200:
  data:
    matches: [
      {
        opportunity: Opportunity
        similarity_score: float
        match_reasons: string[]
      }
    ]
    profile_embedding_id: uuid
    total_opportunities_searched: int
```

### `POST /v1/incubate/applications`
Create a new funding application.

```yaml
Auth: Required
Request:
  body:
    project_id: uuid
    opportunity_id: uuid

Response 201:
  data:
    id: uuid
    status: "draft"
    opportunity: OpportunitySummary
    completion_percentage: 0
```

### `POST /v1/incubate/applications/{id}/autofill`
Trigger autofill for an application.

```yaml
Auth: Required

Response 200:
  data:
    filled_fields: object           # field_name → value
    missing_fields: string[]
    field_confidence: object        # field_name → confidence (0-1)
    completion_percentage: float
    requires_review: string[]
```

### `POST /v1/incubate/writer/compose`
Generate grant narrative.

```yaml
Auth: Required
Request:
  body:
    application_id: uuid
    sections: string[]?             # Specific sections, or all if omitted
    word_limits: object?            # section_name → max_words

Response 200:
  data:
    sections:
      executive_summary:
        content: string
        word_count: int
        quality_score: { overall: float, criteria: object }
      problem_statement:
        content: string
        word_count: int
        quality_score: object
      # ... all sections
    overall_quality: float
    total_word_count: int
```

### `POST /v1/incubate/writer/improve`
Improve an existing narrative section.

```yaml
Auth: Required
Request:
  body:
    application_id: uuid
    section: string
    current_content: string
    feedback: string?               # Specific improvement instructions

Response 200:
  data:
    improved_content: string
    changes_summary: string
    quality_score: object
```

### `POST /v1/incubate/ocr/extract`
Extract text from uploaded document.

```yaml
Auth: Required
Request:
  Content-Type: multipart/form-data
  file: binary (PDF, PNG, JPG, DOCX)

Response 200:
  data:
    raw_text: string
    pages: int
    confidence: float
    structured_data: object         # Extracted key-value pairs
```

---

## 8. WebSocket API (`/ws/{session_id}`)

### Connection

```
ws://api.afroid.io/ws/{session_id}
Headers:
  Authorization: Bearer {access_token}
```

### Client → Server Messages

```typescript
// Submit concept for generation
{ type: "concept:submit", payload: OrchestrationRequest }

// Save file in IDE
{ type: "file:save", payload: { path: string, content: string } }

// Create new file
{ type: "file:create", payload: { path: string, content?: string } }

// Delete file
{ type: "file:delete", payload: { path: string } }

// Terminal input
{ type: "terminal:input", payload: { data: string } }

// Approve architecture
{ type: "architecture:approve", payload: { approved: boolean, feedback?: string } }
```

### Server → Client Messages

```typescript
// Agent status updates
{ type: "agent:thinking", payload: { agentName, title } }
{ type: "agent:action", payload: { agentName, title, detail } }
{ type: "agent:tool_call", payload: { agentName, toolName, args } }
{ type: "agent:complete", payload: { agentName, title, duration } }
{ type: "agent:error", payload: { agentName, error, detail } }

// Code streaming
{ type: "code:chunk", payload: { filePath, chunk } }
{ type: "code:complete", payload: { totalFiles, totalLines } }

// File system updates
{ type: "file:created", payload: { path, language, size } }
{ type: "file:updated", payload: { path, language, size } }
{ type: "file:deleted", payload: { path } }

// Architecture
{ type: "blueprint:update", payload: { architecture } }
{ type: "blueprint:approval_required", payload: { architecture } }

// Terminal
{ type: "terminal:output", payload: { data } }

// Notifications
{ type: "notification:info", payload: { title, message } }
{ type: "notification:error", payload: { title, message, recoverable } }
```

---

## 9. Error Codes Reference

| HTTP Status | Error Type | When Used |
|-------------|-----------|-----------|
| 400 | `validation_error` | Invalid request body or params |
| 401 | `authentication_required` | Missing or invalid JWT |
| 403 | `forbidden` | User lacks permission |
| 404 | `not_found` | Resource doesn't exist |
| 409 | `conflict` | Duplicate resource |
| 422 | `unprocessable_entity` | Valid JSON but invalid business logic |
| 429 | `rate_limit_exceeded` | Too many requests |
| 500 | `internal_error` | Unexpected server error |
| 502 | `upstream_error` | LLM/external service failure |
| 503 | `service_unavailable` | Service temporarily unavailable |

---

## 10. Rate Limits

| Endpoint Group | Limit | Window |
|---------------|-------|--------|
| Auth (login/register) | 10 requests | per minute per IP |
| API (authenticated) | 100 requests | per minute per user |
| Orchestration (generation) | 5 requests | per hour per user |
| Writer (AI compose) | 20 requests | per hour per user |
| OCR (extract) | 30 requests | per hour per user |
| WebSocket | 1 connection | per session |

---

> **Next Blueprint**: [`09-INFRASTRUCTURE.md`](./09-INFRASTRUCTURE.md)
