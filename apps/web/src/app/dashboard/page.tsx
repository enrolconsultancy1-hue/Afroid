"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { GeezCodeLogo } from "@/components/geezcode-logo";
import { projectsApi, type Project } from "@/lib/api-client";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, loadUser, logout } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setProjectsLoading(true);
    projectsApi
      .list(5, 0)
      .then((list) => {
        if (!cancelled) setProjects(list);
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      })
      .finally(() => {
        if (!cancelled) setProjectsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="h-8 w-8 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-surface-500">Loading...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen">
      {/* Top Nav */}
      <nav className="border-b border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-950">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <GeezCodeLogo size={32} showWordmark={true} />
            </Link>
            <div className="hidden items-center gap-1 md:flex">
              <Link href="/dashboard" className="rounded-lg px-3 py-2 text-sm font-medium bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-50">
                Dashboard
              </Link>
              <Link href="/dashboard/ide" className="rounded-lg px-3 py-2 text-sm font-medium text-surface-500 hover:text-surface-900 dark:hover:text-surface-50 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                geezcodE
              </Link>
              <Link href="/dashboard/certify" className="rounded-lg px-3 py-2 text-sm font-medium text-surface-500 hover:text-surface-900 dark:hover:text-surface-50 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                Certify
              </Link>
              <Link href="/dashboard/incubate" className="rounded-lg px-3 py-2 text-sm font-medium text-surface-500 hover:text-surface-900 dark:hover:text-surface-50 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                Incubate
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-surface-500">{user?.email || "founder@afroid.io"}</span>
            {user ? (
              <button onClick={logout} className="btn-ghost text-sm text-red-400 hover:text-red-300">
                Sign Out
              </button>
            ) : (
              <Link href="/login" className="btn-primary text-xs px-3 py-1.5">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.full_name ? user.full_name.split(" ")[0] : "Founder"}
          </h1>
          <p className="mt-2 text-surface-500">
            Here's an overview of your startup factory.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-3">
          <Link href="/dashboard/ide" className="card group p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 group-hover:bg-brand-500 group-hover:text-white transition-colors">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold">New Project</h3>
            <p className="mt-2 text-sm text-surface-500">
              Describe your idea and let AI build it.
            </p>
          </Link>

          <Link href="/dashboard/certify" className="card group p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 group-hover:bg-brand-500 group-hover:text-white transition-colors">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold">Get Certified</h3>
            <p className="mt-2 text-sm text-surface-500">
              Verify compliance with Startup Acts.
            </p>
          </Link>

          <Link href="/dashboard/incubate" className="card group p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 group-hover:bg-brand-500 group-hover:text-white transition-colors">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold">Find Funding</h3>
            <p className="mt-2 text-sm text-surface-500">
              Match with non-dilutive funding.
            </p>
          </Link>
        </div>

        {/* Recent Projects */}
        <div className="mt-12">
          <h2 className="text-xl font-bold">Recent Projects</h2>
          {projectsLoading ? (
            <div className="mt-6 card p-12 text-center text-surface-500">Loading projects…</div>
          ) : projects.length === 0 ? (
            <div className="mt-6 card p-12 text-center">
              <p className="text-surface-500">No projects yet.</p>
              <Link href="/dashboard/ide" className="btn-primary mt-4 inline-flex">
                Create Your First Project
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href="/dashboard/ide"
                  className="card p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{p.name}</h3>
                    <span className="rounded-full bg-surface-100 px-2 py-0.5 text-xs capitalize text-surface-500 dark:bg-surface-800">
                      {p.status}
                    </span>
                  </div>
                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-surface-500">{p.description}</p>
                  )}
                  <p className="mt-3 text-xs text-surface-400">
                    Updated {new Date(p.updated_at).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
