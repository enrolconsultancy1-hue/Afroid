"use client";

import { useState } from "react";
import Link from "next/link";

interface FundingOpportunity {
  id: string;
  title: string;
  funder: string;
  amount: string;
  deadline: string;
  type: string;
  regions: string[];
  matchScore: number;
}

const MOCK_OPPORTUNITIES: FundingOpportunity[] = [
  {
    id: "1", title: "Africa Startup Initiative Programme (ASIP)", funder: "African Development Bank",
    amount: "$50,000 - $250,000", deadline: "2026-12-31", type: "Grant",
    regions: ["Pan-African"], matchScore: 0.94,
  },
  {
    id: "2", title: "Tony Elumelu Foundation Entrepreneurship Programme", funder: "TEF",
    amount: "$5,000", deadline: "2026-03-31", type: "Grant",
    regions: ["Pan-African"], matchScore: 0.91,
  },
  {
    id: "3", title: "Google for Startups Africa", funder: "Google",
    amount: "$100,000 - $200,000", deadline: "Rolling", type: "Equity-free",
    regions: ["Nigeria", "Kenya", "South Africa"], matchScore: 0.88,
  },
  {
    id: "4", title: "Mastercard Foundation Young Africa Works", funder: "Mastercard Foundation",
    amount: "$25,000 - $100,000", deadline: "2026-09-30", type: "Grant",
    regions: ["East Africa", "West Africa"], matchScore: 0.85,
  },
  {
    id: "5", title: "Nigeria Startup Act Tax Incentive", funder: "Federal Government of Nigeria",
    amount: "Tax Credit", deadline: "Ongoing", type: "Tax Credit",
    regions: ["Nigeria"], matchScore: 0.82,
  },
];

export default function IncubatePage() {
  const [opportunities] = useState<FundingOpportunity[]>(MOCK_OPPORTUNITIES);
  const [selectedOpp, setSelectedOpp] = useState<string | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [matched, setMatched] = useState(false);

  const runMatching = async () => {
    setIsMatching(true);
    await new Promise((r) => setTimeout(r, 2000));
    setMatched(true);
    setIsMatching(false);
  };

  return (
    <div className="min-h-screen bg-surface-0 dark:bg-surface-950">
      <nav className="border-b border-surface-200 dark:border-surface-800">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">A</div>
              <span className="text-lg font-bold">Afroid</span>
            </Link>
            <span className="text-surface-300">/</span>
            <span className="font-semibold">Incubate</span>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Non-Dilutive Funding</h1>
            <p className="mt-2 text-surface-500">
              AI-matched opportunities from $3B+ in grants, prizes, and tax incentives.
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
              "🔍 Run AI Matching"
            )}
          </button>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-4 gap-4">
          {[
            { label: "Opportunities", value: "2,847", icon: "📋" },
            { label: "Total Value", value: "$3.2B", icon: "💰" },
            { label: "Your Matches", value: matched ? "5" : "—", icon: "🎯" },
            { label: "Applications", value: "0", icon: "📝" },
          ].map((stat) => (
            <div key={stat.label} className="card p-4 text-center">
              <span className="text-2xl">{stat.icon}</span>
              <p className="mt-2 text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-surface-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Opportunities */}
        <div className="mt-10">
          <h2 className="text-xl font-bold">
            {matched ? "Your Top Matches" : "Featured Opportunities"}
          </h2>
          <div className="mt-4 space-y-4">
            {opportunities.map((opp) => (
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
                      {matched && (
                        <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-semibold text-brand-400">
                          {(opp.matchScore * 100).toFixed(0)}% match
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-surface-500">{opp.funder}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-md bg-surface-100 dark:bg-surface-800 px-2 py-1 text-xs">
                        💰 {opp.amount}
                      </span>
                      <span className="rounded-md bg-surface-100 dark:bg-surface-800 px-2 py-1 text-xs">
                        📅 {opp.deadline}
                      </span>
                      <span className="rounded-md bg-surface-100 dark:bg-surface-800 px-2 py-1 text-xs">
                        {opp.type}
                      </span>
                      {opp.regions.map((r) => (
                        <span key={r} className="rounded-md bg-brand-500/10 px-2 py-1 text-xs text-brand-400">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                  {matched && (
                    <div className="ml-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-brand-500/20">
                        <span className="text-lg font-bold text-brand-400">
                          {(opp.matchScore * 100).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {selectedOpp === opp.id && (
                  <div className="mt-4 flex items-center gap-3 border-t border-surface-200 dark:border-surface-800 pt-4">
                    <button className="btn-primary text-sm px-4 py-2">
                      📝 Start Application
                    </button>
                    <button className="btn-secondary text-sm px-4 py-2">
                      🤖 Auto-Fill with AI
                    </button>
                    <button className="btn-ghost text-sm px-4 py-2">
                      ℹ️ View Details
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
