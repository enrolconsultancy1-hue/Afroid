"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  incubateApi,
  projectsApi,
  type Opportunity,
  type OpportunityMatch,
} from "@/lib/api-client";

function formatAmount(opp: Opportunity): string {
  const parse = (v: number | string | null): number | null => {
    if (v == null) return null;
    const n = typeof v === "string" ? parseFloat(v) : v;
    return Number.isFinite(n) ? n : null;
  };
  const min = parse(opp.amount_min);
  const max = parse(opp.amount_max);
  const sym = opp.currency === "USD" ? "$" : `${opp.currency} `;
  if (min != null && max != null && min !== max) {
    return `${sym}${min.toLocaleString()} - ${sym}${max.toLocaleString()}`;
  }
  if (min != null) return `${sym}${min.toLocaleString()}`;
  if (max != null) return `${sym}${max.toLocaleString()}`;
  return opp.funding_type;
}

function formatDeadline(opp: Opportunity): string {
  if (opp.is_rolling || !opp.deadline) return "Rolling";
  const d = new Date(opp.deadline);
  if (Number.isNaN(d.getTime())) return opp.deadline;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type DisplayItem = { opportunity: Opportunity; matchScore: number | null };

export default function IncubatePage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [matches, setMatches] = useState<OpportunityMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMatching, setIsMatching] = useState(false);
  const [matched, setMatched] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await incubateApi.listOpportunities({ limit: 50 });
        if (!cancelled) setOpportunities(list);
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.error?.detail ||
              "Could not load opportunities. Make sure the backend is running."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runMatching = async () => {
    setIsMatching(true);
    setMatchError(null);
    try {
      const projects = await projectsApi.list(1, 0);
      if (projects.length === 0) {
        setMatchError(
          "No project found. Create a project in the IDE, then add a startup profile."
        );
        return;
      }
      const res = await incubateApi.match(projects[0].id);
      setMatches(res.matches);
      setMatched(true);
    } catch (err: any) {
      setMatchError(
        err?.error?.detail ||
          "Matching failed. Make sure your startup profile is complete."
      );
    } finally {
      setIsMatching(false);
    }
  };

  const displayItems: DisplayItem[] = matched
    ? matches.map((m) => ({ opportunity: m.opportunity, matchScore: m.similarity_score }))
    : opportunities.map((o) => ({ opportunity: o, matchScore: null }));

  return (
    <div className="min-h-screen bg-surface-0 dark:bg-surface-950 py-4">

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Non-Dilutive Funding</h1>
            <p className="mt-2 text-surface-500">
              AI-matched opportunities from grants, prizes, and tax incentives.
            </p>
          </div>
          <button
            onClick={runMatching}
            disabled={isMatching}
            className="btn-primary px-6"
          >
            {isMatching ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Matching...
              </span>
            ) : (
              "Run AI Matching"
            )}
          </button>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { label: "Opportunities", value: isLoading ? "…" : String(opportunities.length) },
            { label: "Your Matches", value: matched ? String(matches.length) : "—" },
            { label: "Applications", value: "0" },
          ].map((stat) => (
            <div key={stat.label} className="card p-4 text-center">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="mt-1 text-xs text-surface-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {matchError && (
          <div className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
            {matchError}
          </div>
        )}

        {/* Opportunities */}
        <div className="mt-10">
          <h2 className="text-xl font-bold">
            {matched ? "Your Top Matches" : "Featured Opportunities"}
          </h2>

          {isLoading ? (
            <div className="mt-8 flex flex-col items-center gap-3 py-16 text-surface-500">
              <svg className="h-6 w-6 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Loading opportunities…</span>
            </div>
          ) : displayItems.length === 0 ? (
            <div className="card mt-8 p-12 text-center text-surface-500">
              {matched ? "No matches above the threshold." : "No opportunities available yet."}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {displayItems.map(({ opportunity: opp, matchScore }) => (
                <div
                  key={opp.id}
                  onClick={() => setSelectedOpp(opp.id === selectedOpp ? null : opp.id)}
                  className={`card cursor-pointer p-5 transition-all duration-200 hover:shadow-md ${
                    selectedOpp === opp.id ? "ring-1 ring-brand-500/30 border-brand-500/50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{opp.title}</h3>
                        {matchScore != null && (
                          <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-semibold text-brand-400">
                            {(matchScore * 100).toFixed(0)}% match
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-surface-500">{opp.funder}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-md bg-surface-100 px-2 py-1 text-xs dark:bg-surface-800">
                          {formatAmount(opp)}
                        </span>
                        <span className="rounded-md bg-surface-100 px-2 py-1 text-xs dark:bg-surface-800">
                          {formatDeadline(opp)}
                        </span>
                        <span className="rounded-md bg-surface-100 px-2 py-1 text-xs dark:bg-surface-800">
                          {opp.funding_type}
                        </span>
                        {opp.eligible_regions.map((r) => (
                          <span key={r} className="rounded-md bg-brand-500/10 px-2 py-1 text-xs text-brand-400">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                    {matchScore != null && (
                      <div className="ml-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-brand-500/20">
                          <span className="text-lg font-bold text-brand-400">
                            {(matchScore * 100).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedOpp === opp.id && (
                    <div className="mt-4 flex items-center gap-3 border-t border-surface-200 pt-4 dark:border-surface-800">
                      <button className="btn-primary px-4 py-2 text-sm">Start Application</button>
                      <button className="btn-secondary px-4 py-2 text-sm">Auto-Fill with AI</button>
                      {opp.application_url && (
                        <a
                          href={opp.application_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ghost px-4 py-2 text-sm"
                        >
                          View Details
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
