/**
 * Afroid API Client — Type-safe HTTP client for backend services.
 *
 * Contract note: the backend returns raw JSON objects/arrays (NOT wrapped in a
 * `{ data }` envelope). The sole exception is the Certify service, which wraps
 * its payloads in `{ data: ... }`. Each method below declares the actual shape.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8090";

/** Standard API error shape (RFC 7807) */
export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: { field: string; message: string; code: string }[];
}

class ApiClientError extends Error {
  constructor(
    public status: number,
    public error: ApiError
  ) {
    super(error.detail);
    this.name = "ApiClientError";
  }
}

/**
 * Core fetch wrapper with auth token injection and error handling.
 */
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("afroid_access_token")
      : null;

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      type: "unknown_error",
      title: "Request Failed",
      status: response.status,
      detail: response.statusText,
    }));
    throw new ApiClientError(response.status, error);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// --- Auth ---

export const authApi = {
  register: (data: {
    email: string;
    password: string;
    full_name: string;
  }) =>
    request<{ user: UserProfile; tokens: TokenPair }>("/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ user: UserProfile; tokens: TokenPair }>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  google: (idToken: string) =>
    request<{ user: UserProfile; tokens: TokenPair }>("/v1/auth/google", {
      method: "POST",
      body: JSON.stringify({ id_token: idToken }),
    }),

  refresh: (refreshToken: string) =>
    request<TokenPair>("/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),

  logout: (refreshToken: string) =>
    request<void>("/v1/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),

  getMe: () => request<UserProfile>("/v1/auth/me"),
};

// --- Projects ---

export const projectsApi = {
  list: (limit = 20, offset = 0) =>
    request<Project[]>(`/v1/projects?limit=${limit}&offset=${offset}`),

  get: (id: string) => request<Project>(`/v1/projects/${id}`),

  create: (data: {
    name: string;
    description?: string;
    organization_id?: string;
  }) =>
    request<Project>("/v1/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Project>) =>
    request<Project>(`/v1/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/v1/projects/${id}`, { method: "DELETE" }),
};

// --- Certify ---

export const certifyApi = {
  check: (jurisdictions: string[], profile: Record<string, unknown>) =>
    request<CertifyCheckResponse>("/v1/certify/check", {
      method: "POST",
      body: JSON.stringify({ jurisdictions, profile }),
    }),

  ipCheck: (texts: Record<string, string>, corpus: string[] = []) =>
    request<{ data: IpReport }>("/v1/certify/ip-check", {
      method: "POST",
      body: JSON.stringify({ texts, corpus }),
    }),
};

// --- Incubate ---

export const incubateApi = {
  listOpportunities: (params?: {
    funding_type?: string;
    country?: string;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.funding_type) q.set("funding_type", params.funding_type);
    if (params?.country) q.set("country", params.country);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    const qs = q.toString();
    return request<Opportunity[]>(`/v1/opportunities${qs ? `?${qs}` : ""}`);
  },

  getOpportunity: (id: string) =>
    request<Opportunity>(`/v1/opportunities/${id}`),

  match: (projectId: string, topK = 10, minScore = 0.65) =>
    request<MatchResponse>("/v1/match", {
      method: "POST",
      body: JSON.stringify({
        project_id: projectId,
        top_k: topK,
        min_score: minScore,
      }),
    }),
};

// --- Type Definitions ---

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role: string;
  is_verified: boolean;
  created_at: string;
  last_login_at?: string | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  status: "draft" | "active" | "archived";
  owner_id: string;
  organization_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificationRule {
  rule_id: string;
  rule_name: string;
  status: string;
  detail: string;
  severity: string;
  evidence?: Record<string, unknown>;
}

export interface CertificationResult {
  jurisdiction: string;
  status: "passed" | "failed" | "conditional" | "unsupported";
  score: number;
  rules: CertificationRule[];
  timestamp?: string;
}

export interface CertifyCheckResponse {
  data: {
    results: CertificationResult[];
    total_jurisdictions: number;
    audit_entry_id: string;
  };
}

export interface IpReport {
  [key: string]: unknown;
}

export interface Opportunity {
  id: string;
  title: string;
  funder: string;
  funder_type?: string | null;
  funding_type: string;
  amount_min: number | string | null;
  amount_max: number | string | null;
  currency: string;
  eligible_regions: string[];
  eligible_sectors: string[];
  eligible_stages: string[];
  deadline: string | null;
  is_rolling: boolean;
  description: string;
  application_url?: string | null;
  source_url: string;
  status: string;
}

export interface OpportunityMatch {
  opportunity: Opportunity;
  similarity_score: number;
  eligibility_passed: boolean;
  reasons: string[];
  strengths: string[];
  gaps: string[];
}

export interface MatchResponse {
  project_id: string;
  total_matches: number;
  matches: OpportunityMatch[];
}

// --- Intake (two-phase Architect Intake) ---

export const intakeApi = {
  submitIdea: (data: IdeaSubmitPayload) =>
    request<IntakeIdea>("/v1/intake/ideas", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listIdeas: (status?: string, limit = 50) =>
    request<IntakeIdea[]>(
      `/v1/intake/ideas?limit=${limit}${status ? `&status=${status}` : ""}`
    ),

  getScore: (submissionId: string) =>
    request<IntakeScoreResponse>(`/v1/intake/evaluations/score/${submissionId}`),
};

export interface IntakeIdea {
  id: string;
  project_name: string;
  one_liner: string;
  problem: string;
  target_users: string;
  core_features: string[];
  user_journeys: string;
  functional_requirements: string;
  data_entities: string;
  free_text: string;
  founder_name: string;
  founder_email: string;
  submitted_by?: string | null;
  status: string;
  assigned_to?: string | null;
  claimed_at?: string | null;
  evaluated_at?: string | null;
  draft_blueprint?: Record<string, unknown> | null;
  extended?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface IdeaSubmitPayload {
  project_name: string;
  product_summary: string;
  business_problem: string;
  target_users: string;
  success_criteria: string;
  mvp_definition: string;
  core_features?: string[];
  user_journeys?: string;
  functional_requirements?: string;
  feature_acceptance_criteria?: string;
  data_entities?: string;
  business_rules?: string;
  quality_performance_requirements?: string;
  existing_system?: string;
  protected_requirements?: string;
  known_assumptions?: string;
  out_of_scope?: string;
  free_text?: string;
  founder_name?: string | null;
  founder_email?: string | null;
  extended?: Record<string, string>;
}

export interface IntakeScoreResponse {
  submission_id: string;
  score_count: number;
  average_score: number | null;
  rubric_breakdown: Record<string, number>;
  evaluations: Array<{
    id: string;
    submission_id: string;
    evaluator_id: string;
    score: number | null;
    criteria: Record<string, number> | null;
    comments: string | null;
    created_at: string;
  }>;
}
