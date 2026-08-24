/**
 * Afroid API Client — Type-safe HTTP client for backend services.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Standard API error shape (RFC 7807) */
export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: { field: string; message: string; code: string }[];
}

/** Generic API response envelope */
export interface ApiResponse<T> {
  data: T;
  meta?: {
    cursor?: string;
    has_more?: boolean;
    total?: number;
  };
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
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

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

/** Auth API endpoints */
export const authApi = {
  register: (data: {
    email: string;
    password: string;
    full_name: string;
  }) =>
    request<ApiResponse<{
      user: UserProfile;
      tokens: TokenPair;
    }>>("/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<ApiResponse<{
      user: UserProfile;
      tokens: TokenPair;
    }>>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  refresh: (refreshToken: string) =>
    request<ApiResponse<TokenPair>>("/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),

  logout: (refreshToken: string) =>
    request<void>("/v1/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),

  getMe: () => request<ApiResponse<UserProfile>>("/v1/auth/me"),
};

/** Projects API endpoints */
export const projectsApi = {
  list: (cursor?: string, limit = 20) =>
    request<ApiResponse<Project[]>>(
      `/v1/projects?limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`
    ),

  get: (id: string) =>
    request<ApiResponse<Project>>(`/v1/projects/${id}`),

  create: (data: { name: string; description?: string; organization_id?: string }) =>
    request<ApiResponse<Project>>("/v1/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Project>) =>
    request<ApiResponse<Project>>(`/v1/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/v1/projects/${id}`, { method: "DELETE" }),
};

// --- Type Definitions ---

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  is_verified: boolean;
  created_at: string;
  last_login_at?: string;
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
  description?: string;
  status: "draft" | "active" | "archived";
  owner_id: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}
