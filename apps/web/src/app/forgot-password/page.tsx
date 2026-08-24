"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-950 p-6">
      <div className="w-full max-w-md rounded-2xl border border-surface-800 bg-surface-900 p-8 shadow-2xl">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 font-bold text-white shadow-md">
              A
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Afroid</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="mt-2 text-sm text-surface-400">
            Enter your account email and we'll send you recovery instructions.
          </p>
        </div>

        {submitted ? (
          <div className="mt-8 rounded-xl border border-brand-500/30 bg-brand-500/10 p-4 text-center">
            <span className="text-2xl">📬</span>
            <h2 className="mt-2 text-sm font-semibold text-brand-300">Recovery email sent</h2>
            <p className="mt-1 text-xs text-surface-400">If an account exists for {email}, you will receive a reset link shortly.</p>
            <Link href="/login" className="btn-primary mt-4 inline-block text-xs">
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="founder@startup.africa"
                className="w-full rounded-lg border border-surface-700 bg-surface-950 px-3.5 py-2.5 text-sm text-surface-100 placeholder:text-surface-600 focus:border-brand-500 focus:outline-none"
              />
            </div>
            <button type="submit" className="btn-primary w-full py-2.5 text-sm font-bold">
              Send Reset Link
            </button>
            <div className="text-center pt-2">
              <Link href="/login" className="text-xs text-brand-400 hover:underline">
                ← Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
