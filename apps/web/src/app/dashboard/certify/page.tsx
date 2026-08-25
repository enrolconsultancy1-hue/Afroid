"use client";

import { useState } from "react";
import Link from "next/link";
import { certifyApi, type CertificationResult } from "@/lib/api-client";

const JURISDICTIONS = [
  { id: "nigeria", name: "Nigeria Startup Act", flag: "🇳🇬" },
  { id: "kenya", name: "Kenya Startup Bill", flag: "🇰🇪" },
  { id: "ethiopia", name: "Ethiopia Digital Strategy", flag: "🇪🇹" },
  { id: "au", name: "African Union Digital Framework", flag: "🌍" },
];

const COUNTRIES = [
  "Nigeria",
  "Kenya",
  "Ethiopia",
  "South Africa",
  "Ghana",
  "Egypt",
  "Morocco",
  "Tanzania",
  "Rwanda",
  "Senegal",
];

function statusBadge(status: string): string {
  switch (status) {
    case "passed":
      return "bg-emerald-500/20 text-emerald-400";
    case "conditional":
      return "bg-amber-500/20 text-amber-400";
    case "failed":
      return "bg-red-500/20 text-red-400";
    default:
      return "bg-surface-500/20 text-surface-400";
  }
}

function statusHeader(status: string): string {
  switch (status) {
    case "passed":
      return "bg-emerald-500/10";
    case "conditional":
      return "bg-amber-500/10";
    case "failed":
      return "bg-red-500/10";
    default:
      return "bg-surface-500/10";
  }
}

function statusText(status: string): string {
  switch (status) {
    case "passed":
      return "✓";
    case "conditional":
      return "⚠";
    case "failed":
      return "✕";
    default:
      return "—";
  }
}

export default function CertifyPage() {
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<CertificationResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Startup profile inputs used to feed the compliance engine.
  const [legalName, setLegalName] = useState("");
  const [country, setCountry] = useState("");
  const [taxId, setTaxId] = useState("");
  const [jobsCreated, setJobsCreated] = useState(0);
  const [technologies, setTechnologies] = useState("");

  const toggleJurisdiction = (id: string) => {
    setSelectedJurisdictions((prev) =>
      prev.includes(id) ? prev.filter((j) => j !== id) : [...prev, id]
    );
  };

  const runCertification = async () => {
    if (selectedJurisdictions.length === 0) return;
    setIsRunning(true);
    setError(null);
    setResults([]);

    try {
      const profile = {
        legal_name: legalName.trim(),
        country: country.toLowerCase(),
        documents: taxId.trim() ? { tax_id: taxId.trim() } : {},
        jobs_created: jobsCreated,
        technologies: technologies
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      const response = await certifyApi.check(selectedJurisdictions, profile);
      setResults(response.data.results);
    } catch (err: any) {
      setError(
        err?.error?.detail ||
          "Could not reach the certification service. Make sure the backend is running."
      );
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 dark:bg-surface-950">
      <nav className="border-b border-surface-200 dark:border-surface-800">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
                A
              </div>
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

        {/* Startup Profile */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold">Startup Profile</h2>
          <p className="mt-1 text-sm text-surface-500">
            Used to evaluate compliance rules. Fields marked * drive the most checks.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="legalName" className="mb-1.5 block text-sm font-medium">
                Legal entity name *
              </label>
              <input
                id="legalName"
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="e.g. Acme Labs Ltd"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="country" className="mb-1.5 block text-sm font-medium">
                Country of operation *
              </label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="input"
              >
                <option value="">Select country…</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="taxId" className="mb-1.5 block text-sm font-medium">
                Tax ID / TIN
              </label>
              <input
                id="taxId"
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="e.g. RC-1234567"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="jobs" className="mb-1.5 block text-sm font-medium">
                Jobs created
              </label>
              <input
                id="jobs"
                type="number"
                min={0}
                value={jobsCreated}
                onChange={(e) => setJobsCreated(Number(e.target.value) || 0)}
                className="input"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="tech" className="mb-1.5 block text-sm font-medium">
                Technology stack (comma-separated)
              </label>
              <input
                id="tech"
                type="text"
                value={technologies}
                onChange={(e) => setTechnologies(e.target.value)}
                placeholder="e.g. Python, React, PostgreSQL"
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Jurisdiction Selection */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold">Select Jurisdictions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {JURISDICTIONS.map((j) => (
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

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

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
            "Run Certification"
          )}
        </button>

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-12 space-y-6">
            <h2 className="text-xl font-bold">Certification Results</h2>
            {results.map((result) => (
              <div key={result.jurisdiction} className="card overflow-hidden">
                <div className={`flex items-center justify-between p-4 ${statusHeader(result.status)}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {JURISDICTIONS.find((j) => j.id === result.jurisdiction)?.flag}
                    </span>
                    <div>
                      <p className="font-semibold">{result.jurisdiction.toUpperCase()}</p>
                      <p className="text-xs text-surface-500">
                        Score: {result.score.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(result.status)}`}>
                    {result.status.toUpperCase()}
                  </span>
                </div>
                <div className="divide-y divide-surface-200 dark:divide-surface-800">
                  {result.rules.map((rule) => (
                    <div key={rule.rule_id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{rule.rule_name}</p>
                        <p className="text-xs text-surface-500">{rule.detail}</p>
                      </div>
                      <span className={`text-xs font-medium ${
                        rule.status === "passed"
                          ? "text-emerald-400"
                          : rule.status === "conditional"
                          ? "text-amber-400"
                          : rule.status === "failed"
                          ? "text-red-400"
                          : "text-surface-400"
                      }`}>
                        {statusText(rule.status)} {rule.status}
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
