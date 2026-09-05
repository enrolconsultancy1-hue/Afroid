import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock localStorage
const storage: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => {
    storage[key] = value;
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
});

// Import after mocks are set up
const { authApi, projectsApi } = await import("@/lib/api-client");

describe("API Client", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    Object.keys(storage).forEach((k) => delete storage[k]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("authApi.login", () => {
    it("sends POST with email and password", async () => {
      const mockResponse = {
        user: { id: "1", email: "test@test.com", full_name: "Test", role: "user", is_verified: true, created_at: "2026-01-01" },
        tokens: { access_token: "tok", refresh_token: "ref", token_type: "bearer", expires_in: 3600 },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authApi.login({ email: "test@test.com", password: "pass" });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain("/v1/auth/login");
      expect(opts.method).toBe("POST");
      expect(JSON.parse(opts.body)).toEqual({ email: "test@test.com", password: "pass" });
      expect(result.tokens.access_token).toBe("tok");
    });

    it("throws ApiClientError on 401", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () =>
          Promise.resolve({
            type: "auth_error",
            title: "Invalid credentials",
            status: 401,
            detail: "Wrong email or password",
          }),
      });

      await expect(authApi.login({ email: "bad@test.com", password: "wrong" })).rejects.toThrow(
        "Wrong email or password"
      );
    });
  });

  describe("Authorization header injection", () => {
    it("includes Bearer token when stored", async () => {
      storage["afroid_access_token"] = "my-jwt-token";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await projectsApi.list();

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.headers["Authorization"]).toBe("Bearer my-jwt-token");
    });

    it("omits Authorization header when no token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await projectsApi.list();

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.headers["Authorization"]).toBeUndefined();
    });
  });

  describe("204 No Content", () => {
    it("returns undefined for 204 responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.reject(new Error("No JSON")),
      });

      const result = await projectsApi.delete("proj-123");
      expect(result).toBeUndefined();
    });
  });
});
