"use client";

import { useState } from "react";
import Link from "next/link";
import { authApi } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      // In case of network error, still display graceful feedback or error message
      setError(err?.message || "Failed to submit recovery request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-12 bg-surface-950 text-surface-100">
      {/* Ambient background blur */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-[-10%] h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[130px]" />
      </div>

      <div className="card relative w-full max-w-md p-8 animate-scale-in border border-surface-800 bg-surface-900/90 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-baseline gap-0.5 text-2xl font-bold tracking-tight mb-4">
            <span className="text-surface-100">Afro</span>
            <span className="text-brand-500">ID</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="mt-2 text-sm text-surface-400">
            Enter your account email to receive sovereign recovery instructions.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {submitted ? (
          <div className="mt-8 rounded-xl border border-brand-500/30 bg-brand-500/10 p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/20 text-2xl">
              ✉️
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Recovery Instructions Sent</h2>
              <p className="mt-1 text-xs text-surface-400 leading-relaxed">
                If an account exists for <span className="text-brand-400 font-medium">{email}</span>, a secure password reset link has been dispatched to your inbox.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <Link href="/login" className="btn-primary w-full py-2.5 text-sm font-bold text-center">
                Return to Sign In
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setEmail("");
                }}
                className="text-xs text-surface-400 hover:text-surface-200 transition-colors"
              >
                Try another email
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1.5">
                Email Address <span className="text-brand-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="founder@startup.africa"
                className="input w-full"
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>

            <div className="text-center pt-2">
              <Link href="/login" className="text-xs text-brand-400 hover:underline inline-flex items-center gap-1">
                <span>←</span> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
