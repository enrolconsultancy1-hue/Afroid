"use client";

import { useState } from "react";
import Link from "next/link";
import { GeezCodeLogo } from "@/components/geezcode-logo";
import { intakeApi, type IntakeIdea } from "@/lib/api-client";

interface FieldDef {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  textarea?: boolean;
  rows?: number;
}

/* Phase 1 — required (*): non-technical business & vision (Phase A) */
const PHASE1_FIELDS: FieldDef[] = [
  { id: "projectName", label: "Project name", required: true, placeholder: "e.g. AgroPulse AI" },
  {
    id: "productSummary",
    label: "Product summary",
    required: true,
    hint: "what, who, accomplishes",
    placeholder: "e.g. Satellite-driven pest prediction for smallholder farmers",
  },
  {
    id: "businessProblem",
    label: "Business problem",
    required: true,
    hint: "pain, inefficiency, cost, risk",
    placeholder: "e.g. Farmers lose 30% of crops to pests they cannot predict",
    textarea: true,
    rows: 2,
  },
  {
    id: "targetUsers",
    label: "Target users / roles",
    required: true,
    hint: "who interacts with the product",
    placeholder: "e.g. Smallholder farmers, cooperative admins",
  },
  {
    id: "successCriteria",
    label: "Success criteria",
    required: true,
    hint: "measurable outcomes",
    placeholder: "e.g. 10k active farmers, 30% less crop loss",
  },
  {
    id: "mvpDefinition",
    label: "MVP definition",
    required: true,
    hint: "smallest useful version",
    placeholder: "e.g. Field registration + SMS pest alerts",
  },
];

/* Phase 1 — optional: more non-technical business details */
const PHASE1_OPTIONAL: FieldDef[] = [
  { id: "toolsIntegrations", label: "Tools & integrations", hint: "APIs, services, platforms", placeholder: "e.g. M-Pesa, Africa's Talking, Google Maps" },
  { id: "technicalConstraints", label: "Technical constraints", hint: "frameworks, hosting, limits", placeholder: "e.g. Must work on low-bandwidth mobile" },
  { id: "complianceStandards", label: "Compliance standards", hint: "laws, security, certifications", placeholder: "e.g. Nigeria Startup Act, GDPR, PCI-DSS" },
  { id: "timelineMilestones", label: "Timeline & milestones", hint: "deadlines, phases", placeholder: "e.g. MVP in 3 months, launch in 6" },
  { id: "competitors", label: "Competitors", hint: "comma-separated", placeholder: "e.g. FarmLogs, Plantix" },
  { id: "revenueModel", label: "Revenue model", hint: "how it earns", placeholder: "e.g. Subscription per farmer + cooperative fees" },
];

/* Phase 2 — optional, technical Software Definition (Phase B); engine fills templates when skipped */
const PHASE2_FIELDS: FieldDef[] = [
  { id: "coreFeatures", label: "Core features / modules", hint: "comma-separated — the building blocks", placeholder: "e.g. satellite imagery, SMS alerts, weather fusion" },
  { id: "userJourneys", label: "Key user journeys / use cases", hint: "step by step, in plain words", placeholder: "1. Farmer registers with a phone number. 2. Farmer opens the app and sees pest risk...", textarea: true, rows: 3 },
  { id: "functionalRequirements", label: "Functional requirements", hint: "what the software must DO", placeholder: "1. Send pest-risk alerts by SMS. 2. Show field maps from satellite data...", textarea: true, rows: 3 },
  { id: "featureAcceptanceCriteria", label: "Feature acceptance criteria", hint: "Given → When → Then", placeholder: "Given a registered farmer, when pest risk exceeds a threshold, then an SMS alert is sent.", textarea: true, rows: 2 },
  { id: "dataEntities", label: "Core data / entities", hint: "the main things the system stores", placeholder: "e.g. users, farms, fields, pest alerts, subscriptions", textarea: true, rows: 2 },
  { id: "businessRules", label: "Business rules", hint: "limits, permissions, calculations", placeholder: "e.g. Alerts only sent between 6am-9pm local time.", textarea: true, rows: 2 },
  { id: "qualityPerformanceRequirements", label: "Quality & performance", hint: "security, response times, reliability", placeholder: "e.g. SMS delivered within 30s; 99.9% availability.", textarea: true, rows: 2 },
  { id: "existingSystem", label: "Existing system", hint: "new / rebuild / migration / extension", placeholder: "e.g. New project" },
  { id: "protectedRequirements", label: "Protected requirements", hint: "do not change", placeholder: "e.g. Keep the existing branding and SMS provider.", textarea: true, rows: 2 },
  { id: "knownAssumptions", label: "Known assumptions", placeholder: "e.g. Farmers have basic feature phones.", textarea: true, rows: 2 },
  { id: "outOfScope", label: "Out of scope", placeholder: "e.g. No mobile apps in v1.", textarea: true, rows: 2 },
];

const PHASE1_OPTIONAL_KEYS: Record<string, string> = {
  toolsIntegrations: "tools_integrations",
  technicalConstraints: "technical_constraints",
  complianceStandards: "compliance_standards",
  timelineMilestones: "timeline_milestones",
  competitors: "competitors",
  revenueModel: "revenue_model",
};

export default function IntakePage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [showPhase2, setShowPhase2] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<IntakeIdea | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setValue = (id: string, v: string) => {
    setValues((prev) => ({ ...prev, [id]: v }));
    setErrors((prev) => ({ ...prev, [id]: false }));
  };

  const submit = async () => {
    setError(null);
    const required = PHASE1_FIELDS.filter((f) => f.required);
    const missing = required.filter((f) => !(values[f.id] || "").trim());

    const newErrors: Record<string, boolean> = {};
    missing.forEach((f) => (newErrors[f.id] = true));
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      setError("Please complete the required fields (marked *).");
      return;
    }

    const extended: Record<string, string> = {};
    PHASE1_OPTIONAL.forEach((f) => {
      const v = (values[f.id] || "").trim();
      if (v) extended[PHASE1_OPTIONAL_KEYS[f.id]] = v;
    });

    const features = (values.coreFeatures || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      const idea = await intakeApi.submitIdea({
        project_name: (values.projectName || "").trim(),
        product_summary: (values.productSummary || "").trim(),
        business_problem: (values.businessProblem || "").trim(),
        target_users: (values.targetUsers || "").trim(),
        success_criteria: (values.successCriteria || "").trim(),
        mvp_definition: (values.mvpDefinition || "").trim(),
        core_features: features,
        user_journeys: (values.userJourneys || "").trim(),
        functional_requirements: (values.functionalRequirements || "").trim(),
        feature_acceptance_criteria: (values.featureAcceptanceCriteria || "").trim(),
        data_entities: (values.dataEntities || "").trim(),
        business_rules: (values.businessRules || "").trim(),
        quality_performance_requirements: (values.qualityPerformanceRequirements || "").trim(),
        existing_system: (values.existingSystem || "").trim(),
        protected_requirements: (values.protectedRequirements || "").trim(),
        known_assumptions: (values.knownAssumptions || "").trim(),
        out_of_scope: (values.outOfScope || "").trim(),
        free_text: (values.anythingElse || "").trim(),
        founder_name: (values.founderName || "").trim() || null,
        founder_email: (values.founderEmail || "").trim() || null,
        extended: Object.keys(extended).length ? extended : undefined,
      });
      setSubmitted(idea);
      setValues({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = (id: string) =>
    `input ${errors[id] ? "border-red-500 focus:border-red-500 focus:ring-red-500/30" : ""}`;

  const renderField = (f: FieldDef) => (
    <div key={f.id} className={f.textarea ? "md:col-span-2" : ""}>
      <label
        htmlFor={f.id}
        className="mb-1.5 flex flex-wrap items-baseline gap-x-2 text-sm font-medium"
      >
        {f.label}
        {f.required && <span className="text-brand-500">*</span>}
        {f.hint && (
          <span className="text-xs font-normal text-surface-500">{f.hint}</span>
        )}
      </label>
      {f.textarea ? (
        <textarea
          id={f.id}
          rows={f.rows || 3}
          className={fieldClass(f.id)}
          placeholder={f.placeholder}
          value={values[f.id] || ""}
          onChange={(e) => setValue(f.id, e.target.value)}
        />
      ) : (
        <input
          id={f.id}
          type="text"
          className={fieldClass(f.id)}
          placeholder={f.placeholder}
          value={values[f.id] || ""}
          onChange={(e) => setValue(f.id, e.target.value)}
        />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100">
      {/* Header */}
      <nav className="border-b border-surface-800 bg-surface-950">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <GeezCodeLogo size={32} showWordmark={true} />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="btn-ghost text-sm">
              Dashboard
            </Link>
            <Link href="/login" className="btn-ghost text-sm">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">
            Architect <span className="text-brand-500">Intake</span>
          </h1>
          <p className="mt-3 max-w-2xl text-surface-400">
            Answer the business questions in plain words — anyone can. Add the optional
            software definition for full technical control, and the frontier model
            produces the complete zero-question Architecture Blueprint (folder &amp;
            file tree included).
          </p>
        </div>

        <div className="card p-6 sm:p-8">
          {/* Phase 1 */}
          <div className="mb-6 flex items-center gap-2">
            <span className="rounded-md bg-brand-500/15 px-2.5 py-1 text-[11px] font-bold tracking-widest text-brand-500">
              PHASE 1 · REQUIRED
            </span>
            <span className="text-xs text-surface-500">business &amp; vision — no tech knowledge needed</span>
          </div>
          <div className="grid gap-5 md:grid-cols-2">{PHASE1_FIELDS.map(renderField)}</div>

          <div className="mt-8 mb-4 flex items-center gap-2">
            <span className="rounded-md border border-surface-700 px-2.5 py-1 text-[11px] font-bold tracking-widest text-surface-400">
              MORE BUSINESS DETAILS
            </span>
            <span className="text-xs text-surface-500">optional — still non-technical</span>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {PHASE1_OPTIONAL.map(renderField)}
            <div className="md:col-span-2">
              <label htmlFor="anythingElse" className="mb-1.5 block text-sm font-medium">
                Anything else{" "}
                <span className="text-xs font-normal text-surface-500">
                  optional — team, story, risks
                </span>
              </label>
              <textarea
                id="anythingElse"
                rows={2}
                className="input"
                placeholder="Anything that helps the architect understand the vision..."
                value={values.anythingElse || ""}
                onChange={(e) => setValue("anythingElse", e.target.value)}
              />
            </div>
          </div>

          {/* Phase 2 toggle */}
          <button
            type="button"
            onClick={() => setShowPhase2((s) => !s)}
            className="mt-8 flex w-full items-center gap-3 rounded-lg border border-dashed border-surface-700 px-4 py-3 text-left transition-colors hover:border-surface-500"
          >
            <span className="rounded-md border border-surface-700 px-2.5 py-1 text-[11px] font-bold tracking-widest text-surface-400">
              SOFTWARE DEFINITION (OPTIONAL)
            </span>
            <span className="flex-1" />
            <span className="text-surface-500">{showPhase2 ? "▲" : "▼"}</span>
          </button>

          {showPhase2 && (
            <div className="mt-5 grid animate-fade-in gap-5 md:grid-cols-2">
              {PHASE2_FIELDS.map(renderField)}
            </div>
          )}

          {/* Founder */}
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="founderName" className="mb-1.5 block text-sm font-medium">
                Your name{" "}
                <span className="text-xs font-normal text-surface-500">optional</span>
              </label>
              <input
                id="founderName"
                type="text"
                className="input"
                placeholder="Full name"
                value={values.founderName || ""}
                onChange={(e) => setValue("founderName", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="founderEmail" className="mb-1.5 block text-sm font-medium">
                Email{" "}
                <span className="text-xs font-normal text-surface-500">optional</span>
              </label>
              <input
                id="founderEmail"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={values.founderEmail || ""}
                onChange={(e) => setValue("founderEmail", e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {submitted && (
            <div className="mt-6 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-300">
              <div className="font-semibold">
                ✓ Idea "{submitted.project_name}" submitted
              </div>
              <div className="mt-1 text-emerald-400/80">
                It's queued for blueprint generation. Status: {submitted.status}.
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="btn-primary mt-6 w-full py-3 text-base"
          >
            {submitting ? "Submitting…" : "Submit idea →"}
          </button>
          <p className="mt-3 text-center text-xs text-surface-500">
            Optional — the engine completes the technical definition.
          </p>
        </div>
      </main>
    </div>
  );
}
