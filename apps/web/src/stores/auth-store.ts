/**
 * Afroid Auth Store — Zustand store for authentication state.
 */

import { create } from "zustand";
import { authApi, type UserProfile, type TokenPair } from "@/lib/api-client";

interface AuthState {
  // State
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  register: (email: string, password: string, fullName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  loadUser: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function storeTokens(tokens: TokenPair): void {
  if (!isBrowser()) return;
  localStorage.setItem("afroid_access_token", tokens.access_token);
  localStorage.setItem("afroid_refresh_token", tokens.refresh_token);
}

function clearTokens(): void {
  if (!isBrowser()) return;
  localStorage.removeItem("afroid_access_token");
  localStorage.removeItem("afroid_refresh_token");
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  register: async (email, password, fullName) => {
    const response = await authApi.register({
      email,
      password,
      full_name: fullName,
    });
    storeTokens(response.data.tokens);
    set({
      user: response.data.user,
      isAuthenticated: true,
    });
  },

  login: async (email, password) => {
    const response = await authApi.login({ email, password });
    storeTokens(response.data.tokens);
    set({
      user: response.data.user,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    if (!isBrowser()) return;
    const refreshToken = localStorage.getItem("afroid_refresh_token");
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Logout should succeed even if revocation fails
      }
    }
    clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  refreshTokens: async () => {
    if (!isBrowser()) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    const refreshToken = localStorage.getItem("afroid_refresh_token");
    if (!refreshToken) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    try {
      const response = await authApi.refresh(refreshToken);
      storeTokens(response.data);
    } catch {
      clearTokens();
      set({ user: null, isAuthenticated: false });
    }
  },

  loadUser: async () => {
    if (!isBrowser()) {
      set({ isLoading: false });
      return;
    }
    const token = localStorage.getItem("afroid_access_token");
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const response = await authApi.getMe();
      set({
        user: response.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      // Token invalid — try refresh
      try {
        await get().refreshTokens();
        const response = await authApi.getMe();
        set({
          user: response.data,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        clearTokens();
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
