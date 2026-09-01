"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useAuthStore } from "@/stores/auth-store";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const GSI_SCRIPT_ID = "afroid-gsi-client";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const googleSignIn = useAuthStore((s) => s.googleSignIn);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  // Load Google Identity Services script once, when a client id is configured.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    if (document.getElementById(GSI_SCRIPT_ID)) return;
    const script = document.createElement("script");
    script.id = GSI_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  const onGoogleCredential = useCallback(
    async (credential: string) => {
      setError(null);
      try {
        await googleSignIn(credential);
        router.push("/dashboard");
      } catch (err: any) {
        setError(err?.error?.detail || "Google sign-in failed.");
      }
    },
    [googleSignIn, router]
  );

  const handleGoogleSignIn = useCallback(() => {
    if (!GOOGLE_CLIENT_ID) {
      setError(
        "Google Sign-In is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID."
      );
      return;
    }
    const google = (window as any).google;
    if (!google?.accounts?.id) {
      setError("Google Sign-In is still loading. Please try again.");
      return;
    }

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response: any) => {
        if (response?.credential) {
          onGoogleCredential(response.credential);
        }
      },
    });

    google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        const el = document.getElementById("google-render");
        if (el) {
          google.accounts.id.renderButton(el, {
            theme: "outline",
            size: "large",
            width: 400,
          });
        }
      }
    });
  }, [onGoogleCredential]);

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.error?.detail || "Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="card relative w-full max-w-md p-8 animate-scale-in">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight"><span className="text-surface-100">Afro</span><span className="text-brand-500">ID</span></span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold">Welcome back</h1>
          <p className="mt-2 text-sm text-surface-500">
            Sign in to your Afroid account
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-brand-500 hover:text-brand-400">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="••••••••"
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full py-3"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-surface-200 dark:bg-surface-800" />
          <span className="text-xs text-surface-500">or continue with</span>
          <div className="h-px flex-1 bg-surface-200 dark:bg-surface-800" />
        </div>

        {/* OAuth */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="btn-secondary w-full"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
        <div id="google-render" className="mt-3 flex justify-center" />

        {/* Register link */}
        <p className="mt-8 text-center text-sm text-surface-500">
          Don't have an account?{" "}
          <Link href="/register" className="font-medium text-brand-500 hover:text-brand-400">
            Sign up free
          </Link>
        </p>
      </div>
    </main>
  );
}
