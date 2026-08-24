"use client";

import { useState } from "react";
import Link from "next/link";

interface CertificationResult {
  jurisdiction: string;
  status: "passed" | "failed" | "conditional";
  score: number;
  rules: { name: string; status: string; detail: string }[];
}

export default function CertifyPage() {
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<CertificationResult[]>([]);

  const jurisdictions = [
    { id: "nigeria", name: "Nigeria Startup Act", flag: "🇳🇬" },
    { id: "kenya", name: "Kenya Startup Bill", flag: "🇰🇪" },
    { id: "ethiopia", name: "Ethiopia Digital Strategy", flag: "🇪🇹" },
    { id: "au", name: "African Union Digital Framework", flag: "🌍" },
  ];

  const toggleJurisdiction = (id: string) => {
    setSelectedJurisdictions((prev) =>
      prev.includes(id) ? prev.filter((j) => j !== id) : [...prev, id]
    );
  };

  const runCertification = async () => {
    if (selectedJurisdictions.length === 0) return;
    setIsRunning(true);
    setResults([]);

    await new Promise((r) => setTimeout(r, 3000));

    const mockResults: CertificationResult[] = selectedJurisdictions.map((j) => ({
      jurisdiction: j,
      status: "passed" as const,
      score: 87 + Math.random() * 10,
      rules: [
        { name: "Business Registration", status: "passed", detail: "Valid registration detected" },
        { name: "Data Residency", status: "passed", detail: "Data stored in-region" },
        { name: "Tax Compliance", status: "conditional", detail: "Requires tax ID verification" },
        { name: "IP Originality", status: "passed", detail: "92% originality score" },
      ],
    }));

    setResults(mockResults);
    setIsRunning(false);
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
            <span className="font-semibold">Certify</span>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-3xl font-bold">Compliance Certification</h1>
        <p className="mt-2 text-surface-500">
          Verify your startup's compliance with African Startup Acts and regulations.
        </p>

        {/* Jurisdiction Selection */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold">Select Jurisdictions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {jurisdictions.map((j) => (
              <button
                key={j.id}
                onClick={() => toggleJurisdiction(j.id)}
                className={`card flex items-center gap-4 p-4 transition-all duration-200 ${
                  selectedJurisdictions.includes(j.id)
                    ? "border-brand-500 bg-brand-500/5 ring-1 ring-brand-500/20"
                    : "hover:border-surface-300 dark:hover:border-surface-700"
                }`}
              >
                <span className="text-2xl">{j.flag}</span>
                <div className="text-left">
                  <p className="font-medium">{j.name}</p>
                  <p className="text-xs text-surface-500">{j.id.toUpperCase()}</p>
                </div>
                {selectedJurisdictions.includes(j.id) && (
                  <span className="ml-auto text-brand-500">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={runCertification}
          disabled={isRunning || selectedJurisdictions.length === 0}
          className="btn-primary mt-8 px-8 py-3"
        >
          {isRunning ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Running Verification...
            </span>
          ) : (
            "🛡️ Run Certification"
          )}
        </button>

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-12 space-y-6">
            <h2 className="text-xl font-bold">Certification Results</h2>
            {results.map((result) => (
              <div key={result.jurisdiction} className="card overflow-hidden">
                <div className={`flex items-center justify-between p-4 ${
                  result.status === "passed" ? "bg-green-500/10" : result.status === "conditional" ? "bg-yellow-500/10" : "bg-red-500/10"
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {jurisdictions.find((j) => j.id === result.jurisdiction)?.flag}
                    </span>
                    <div>
                      <p className="font-semibold">{result.jurisdiction.toUpperCase()}</p>
                      <p className="text-xs text-surface-500">
                        Score: {result.score.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    result.status === "passed" ? "bg-green-500/20 text-green-400" : result.status === "conditional" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {result.status.toUpperCase()}
                  </span>
                </div>
                <div className="divide-y divide-surface-200 dark:divide-surface-800">
                  {result.rules.map((rule, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{rule.name}</p>
                        <p className="text-xs text-surface-500">{rule.detail}</p>
                      </div>
                      <span className={`text-xs font-medium ${
                        rule.status === "passed" ? "text-green-400" : rule.status === "conditional" ? "text-yellow-400" : "text-red-400"
                      }`}>
                        {rule.status === "passed" ? "✓" : rule.status === "conditional" ? "⚠" : "✗"} {rule.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
