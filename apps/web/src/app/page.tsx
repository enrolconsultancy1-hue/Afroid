"use client";

import { useState } from "react";
import Link from "next/link";
import { GeezCodeLogo } from "@/components/geezcode-logo";
import { Menu, X, ArrowRight, CheckCircle, Sparkles, Shield, Rocket, Users, Code, Award } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { n: "01", t: "Describe", d: "One sentence about your business concept. That is all it takes." },
  { n: "02", t: "Blueprint", d: "Architecture, tech stack, database schemas and API endpoints — generated instantly." },
  { n: "03", t: "Build", d: "A multi-agent AI swarm architects, codes, reviews, and unit tests production software." },
  { n: "04", t: "Certify", d: "Automated compliance checks against African Startup Acts, with immutable audit trails." },
  { n: "05", t: "Fund", d: "Vector similarity matching to $3B+ in non-dilutive grants, with AI application auto-fill." },
];

const ENGINES = [
  { icon: Code, t: "AI Code Generation", d: "Multi-agent AI architects, codes and reviews production software in seconds." },
  { icon: Shield, t: "Global Compliance", d: "Automated certification against Startup Acts, with immutable audit trails." },
  { icon: Rocket, t: "Funding Matching", d: "Vector similarity matching to $3B+ in non-dilutive grants, auto-filled with AI." },
];

const TESTIMONIALS = [
  {
    quote: "AfroID generated our entire backend API and verified our Startup Act compliance in under 2 hours. We landed a $50K non-dilutive grant 3 weeks later.",
    author: "Amara Okonkwo",
    role: "Founder & CEO",
    company: "PayPulse Africa",
    avatar: "🇳🇬",
  },
  {
    quote: "The geezcodE IDE generated clean, modular Python and Next.js code. The vector matching engine found funding programs we had no idea existed.",
    author: "David Kiprop",
    role: "Co-Founder & CTO",
    company: "AgriFlow Kenya",
    avatar: "🇰🇪",
  },
  {
    quote: "Certify gave us an immutable audit log that satisfied our bank partners and legal advisors without spending $10k on legal fees.",
    author: "Fatima El-Mansouri",
    role: "Managing Director",
    company: "Atlas FinTech",
    avatar: "🇲🇦",
  },
];

const TIERS = [
  {
    name: "Start",
    price: "$0",
    period: "forever",
    desc: "Validate your startup concept before investing a single dollar.",
    features: [
      "1 active project",
      "Full architectural blueprint",
      "Community support & docs",
      "Basic compliance check",
    ],
    cta: "Start Free",
    featured: false,
  },
  {
    name: "Grow",
    price: "$29",
    period: "/month",
    desc: "Take a startup from concept to launch-ready and funded.",
    features: [
      "Unlimited active projects",
      "Full multi-agent AI code generation",
      "Certify compliance reports & audit trails",
      "Incubate grant matching & 95% autofill",
      "Priority Discord & email support",
    ],
    cta: "Start 14-Day Trial",
    featured: true,
  },
  {
    name: "Scale",
    price: "Custom",
    period: "",
    desc: "For venture builders, accelerators, and enterprise factories.",
    features: [
      "Team seats & shared workspaces",
      "Custom compliance packs for 54 African nations",
      "Dedicated AI model fine-tuning",
      "Dedicated success manager & SLA",
    ],
    cta: "Contact Sales",
    featured: false,
  },
];

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setEmail("");
      toast.success("Welcome aboard! You've been added to the AfroID VIP waitlist.");
    }, 600);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface-0 text-surface-900 dark:bg-surface-950 dark:text-surface-100">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-[-10%] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[140px] animate-pulse-glow" />
        <div className="absolute right-[5%] top-[25%] h-[450px] w-[450px] rounded-full bg-purple-600/10 blur-[130px] animate-float" />
        <div className="absolute left-[5%] top-[60%] h-[400px] w-[400px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]" />
      </div>

      {/* Navigation */}
      <nav className="glass fixed top-0 z-50 w-full border-b border-surface-200/60 backdrop-blur-xl dark:border-surface-800/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-baseline gap-0.5 text-2xl font-bold tracking-tight">
            <span className="text-surface-900 dark:text-surface-100">Afro</span>
            <span className="text-brand-500">ID</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden items-center gap-8 md:flex">
            <Link href="#how-it-works" className="text-sm font-medium text-surface-600 transition-colors hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-50">
              How It Works
            </Link>
            <Link href="#features" className="text-sm font-medium text-surface-600 transition-colors hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-50">
              Engines
            </Link>
            <Link href="#testimonials" className="text-sm font-medium text-surface-600 transition-colors hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-50">
              Success Stories
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-surface-600 transition-colors hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-50">
              Pricing
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm hidden sm:inline-flex">
              Sign In
            </Link>
            <Link href="/register" className="btn-primary text-sm">
              Get Started
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 md:hidden text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="border-b border-surface-200 bg-surface-0/95 px-6 py-4 md:hidden dark:border-surface-800 dark:bg-surface-950/95">
            <div className="flex flex-col gap-3">
              <Link href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium py-2 text-surface-700 dark:text-surface-300">
                How It Works
              </Link>
              <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium py-2 text-surface-700 dark:text-surface-300">
                Engines
              </Link>
              <Link href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium py-2 text-surface-700 dark:text-surface-300">
                Success Stories
              </Link>
              <Link href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium py-2 text-surface-700 dark:text-surface-300">
                Pricing
              </Link>
              <div className="pt-2 border-t border-surface-200 dark:border-surface-800 flex flex-col gap-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="btn-secondary text-sm w-full">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative flex min-h-screen flex-col justify-center px-6 pt-24 pb-16">
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-xs font-semibold text-brand-400">
              <Sparkles className="h-3.5 w-3.5" />
              Sovereign AI Startup Factory — Public Beta 2.0
            </div>

            <h1 className="mt-6 text-5xl font-extrabold leading-[1.08] tracking-tight text-surface-900 dark:text-surface-50 sm:text-6xl lg:text-7xl">
              Build. Certify. Fund.{" "}
              <span className="bg-gradient-to-r from-brand-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Without Permission.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-surface-600 dark:text-surface-400">
              The sovereign AI factory built for African founders. Turn your concept into
              production code, get compliance-certified with Startup Acts, and match with $3B+ in
              non-dilutive funding — all in one unified platform.
            </p>

            <div className="mt-10 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
              <Link href="/register" className="btn-primary px-8 py-3.5 text-base font-semibold">
                Start Building — Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#how-it-works" className="btn-secondary px-8 py-3.5 text-base font-semibold">
                Explore How It Works
              </Link>
            </div>

            {/* Quick Trust Metrics */}
            <div className="mt-12 flex flex-wrap items-center gap-6 text-xs font-medium text-surface-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                No Credit Card Required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                Zero Equity Taken
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                Startup Act Compliant
              </div>
            </div>
          </div>

          {/* Core Engine Cards */}
          <div className="mt-20 grid gap-6 sm:grid-cols-3">
            {ENGINES.map((e) => {
              const IconComp = e.icon;
              return (
                <div key={e.t} className="card p-6 transition-all duration-300 hover:shadow-xl hover:shadow-brand-500/5 hover:-translate-y-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                    <IconComp className="h-5 w-5" />
                  </div>
                  <div className="mt-4 text-base font-bold text-surface-900 dark:text-surface-100">{e.t}</div>
                  <div className="mt-2 text-sm text-surface-500 dark:text-surface-400 leading-relaxed">{e.d}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative py-28 border-t border-surface-200/50 dark:border-surface-800/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-400">
              Autonomous Pipeline
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-surface-900 dark:text-surface-50 sm:text-4xl">
              From one sentence to a funded company.
            </h2>
            <p className="mt-4 text-surface-600 dark:text-surface-400">
              Five autonomous execution steps. Zero friction. One sovereign platform.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-5">
            {STEPS.map((s, i) => (
              <div key={s.n} className="card group relative p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-500/10">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-extrabold text-brand-500/60 font-mono">
                    {s.n}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className="hidden text-surface-400 md:block" aria-hidden="true">→</span>
                  )}
                </div>
                <h3 className="mt-4 text-lg font-bold">{s.t}</h3>
                <p className="mt-2 text-xs leading-relaxed text-surface-500 dark:text-surface-400">
                  {s.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Engines Deep Dive */}
      <section id="features" className="relative py-28 bg-surface-50/50 dark:bg-surface-900/30 border-t border-surface-200/50 dark:border-surface-800/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-400">
              The Platform
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-surface-900 dark:text-surface-50 sm:text-4xl">
              Three engines. Zero roadblocks.
            </h2>
            <p className="mt-4 text-surface-600 dark:text-surface-400">
              Everything an African founder needs to build, certify, and fund a startup.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {/* geezcodE */}
            <div className="card group p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-500/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
                <Code className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold">geezcodE IDE</h3>
              <p className="mt-3 text-sm leading-relaxed text-surface-600 dark:text-surface-400">
                Describe your product in plain language. Multi-agent AI swarms architect, code,
                review, and deploy production software directly into Monaco IDE.
              </p>
              <ul className="mt-6 space-y-2.5 text-xs text-surface-500 dark:text-surface-400">
                <li className="flex items-center gap-2">
                  <span className="font-bold text-brand-400">✓</span> Natural Language → Production Code
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-bold text-brand-400">✓</span> Multi-Agent LangGraph Swarm
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-bold text-brand-400">✓</span> Built-in Monaco Web IDE
                </li>
              </ul>
            </div>

            {/* Certify */}
            <div className="card group p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-500/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold">AfroID Certify</h3>
              <p className="mt-3 text-sm leading-relaxed text-surface-600 dark:text-surface-400">
                Automated compliance verification against African Startup Acts (Nigeria, Kenya, AU).
                IP originality analysis and tamper-proof audit trails.
              </p>
              <ul className="mt-6 space-y-2.5 text-xs text-surface-500 dark:text-surface-400">
                <li className="flex items-center gap-2">
                  <span className="font-bold text-brand-400">✓</span> African Startup Act Checks
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-bold text-brand-400">✓</span> Fingerprint IP Originality Scoring
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-bold text-brand-400">✓</span> Hash-Chained Audit Logs
                </li>
              </ul>
            </div>

            {/* Incubate */}
            <div className="card group p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-500/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
                <Rocket className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold">AfroID Incubate</h3>
              <p className="mt-3 text-sm leading-relaxed text-surface-600 dark:text-surface-400">
                AI vector-similarity matching to $3B+ in non-dilutive grants, prizes, and funding.
                Auto-fill grant applications with 95% accuracy.
              </p>
              <ul className="mt-6 space-y-2.5 text-xs text-surface-500 dark:text-surface-400">
                <li className="flex items-center gap-2">
                  <span className="font-bold text-brand-400">✓</span> Vector Search Funding Matcher
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-bold text-brand-400">✓</span> 95% AI Application Auto-Fill
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-bold text-brand-400">✓</span> AI Grant Narrative Generator
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonials */}
      <section id="testimonials" className="relative py-28 border-t border-surface-200/50 dark:border-surface-800/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-400">
              Founder Stories
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-surface-900 dark:text-surface-50 sm:text-4xl">
              Trusted by founders across Africa.
            </h2>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {TESTIMONIALS.map((item, idx) => (
              <div key={idx} className="card p-8 flex flex-col justify-between hover:border-brand-500/40 transition-colors">
                <p className="text-sm italic leading-relaxed text-surface-600 dark:text-surface-300">
                  "{item.quote}"
                </p>
                <div className="mt-8 flex items-center gap-3 pt-4 border-t border-surface-100 dark:border-surface-800">
                  <span className="text-2xl">{item.avatar}</span>
                  <div>
                    <p className="text-sm font-bold">{item.author}</p>
                    <p className="text-xs text-surface-500">{item.role}, {item.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-28 bg-surface-50/50 dark:bg-surface-900/30 border-t border-surface-200/50 dark:border-surface-800/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-400">
              Simple Pricing
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-surface-900 dark:text-surface-50 sm:text-4xl">
              Start free. Scale as you grow.
            </h2>
            <p className="mt-4 text-surface-600 dark:text-surface-400">
              No hidden fees. Zero equity required. Cancel anytime.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className={`card relative p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
                  t.featured
                    ? "border-brand-500/50 shadow-xl shadow-brand-500/10 ring-1 ring-brand-500/20"
                    : "hover:shadow-lg hover:shadow-brand-500/5"
                }`}
              >
                {t.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white shadow-md">
                    Most Popular
                  </span>
                )}
                <div>
                  <h3 className="text-xl font-bold">{t.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold">{t.price}</span>
                    {t.period && <span className="text-sm text-surface-500">{t.period}</span>}
                  </div>
                  <p className="mt-3 text-xs text-surface-500 dark:text-surface-400 leading-relaxed">{t.desc}</p>
                  <ul className="mt-6 space-y-2.5 text-xs text-surface-600 dark:text-surface-400">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <span className="font-bold text-brand-400">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href="/register"
                  className={`mt-8 block w-full text-center ${t.featured ? "btn-primary" : "btn-secondary"} py-3 font-semibold`}
                >
                  {t.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Waitlist CTA Section */}
      <section className="relative py-28 border-t border-surface-200/50 dark:border-surface-800/50">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="relative rounded-3xl border border-brand-500/30 bg-gradient-to-b from-brand-500/10 via-surface-900/60 to-surface-950 px-8 py-16 shadow-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl text-surface-900 dark:text-surface-50">
              Your startup is one sentence away.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-surface-600 dark:text-surface-400 leading-relaxed">
              Join thousands of African founders building the future. Get instant access to
              geezcodE IDE, Certify compliance engine, and Incubate grant matcher.
            </p>

            <form onSubmit={handleWaitlistSubmit} className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="enter your email address..."
                className="input py-3 text-sm"
              />
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary py-3 px-6 whitespace-nowrap font-semibold"
              >
                {submitting ? "Joining..." : "Join Waitlist"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Expanded Multi-Column Footer */}
      <footer className="border-t border-surface-200 bg-surface-50/50 py-16 dark:border-surface-800 dark:bg-surface-950">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <Link href="/" className="flex items-baseline gap-0.5 text-2xl font-bold tracking-tight">
                <span className="text-surface-900 dark:text-surface-100">Afro</span>
                <span className="text-brand-500">ID</span>
              </Link>
              <p className="mt-4 text-xs leading-relaxed text-surface-500">
                The Sovereign AI Startup Factory for African founders. Build, certify, and fund without permission.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-surface-900 dark:text-surface-100">Product</p>
              <ul className="mt-4 space-y-2 text-xs text-surface-500">
                <li><Link href="/dashboard/ide" className="hover:text-brand-400 transition-colors">geezcodE IDE</Link></li>
                <li><Link href="/dashboard/certify" className="hover:text-brand-400 transition-colors">AfroID Certify</Link></li>
                <li><Link href="/dashboard/incubate" className="hover:text-brand-400 transition-colors">AfroID Incubate</Link></li>
                <li><Link href="/intake" className="hover:text-brand-400 transition-colors">Architect Intake</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-surface-900 dark:text-surface-100">Resources</p>
              <ul className="mt-4 space-y-2 text-xs text-surface-500">
                <li><a href="#how-it-works" className="hover:text-brand-400 transition-colors">How It Works</a></li>
                <li><a href="#pricing" className="hover:text-brand-400 transition-colors">Pricing Tiers</a></li>
                <li><a href="https://github.com/enrolconsultancy1-hue/Afroid" target="_blank" rel="noopener noreferrer" className="hover:text-brand-400 transition-colors">GitHub Repository</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-surface-900 dark:text-surface-100">Legal & Security</p>
              <ul className="mt-4 space-y-2 text-xs text-surface-500">
                <li><Link href="/privacy" className="hover:text-brand-400 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-brand-400 transition-colors">Terms of Service</Link></li>
                <li><Link href={"/health" as any} className="hover:text-brand-400 transition-colors">System Health</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-surface-200 pt-8 dark:border-surface-800 text-center text-xs text-surface-500">
            © 2026 AfroID. Empowering founders worldwide to build without permission.
          </div>
        </div>
      </footer>
    </main>
  );
}
