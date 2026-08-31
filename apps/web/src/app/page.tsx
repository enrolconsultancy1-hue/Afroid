import Link from "next/link";

const STEPS = [
  { n: "01", t: "Describe", d: "One sentence about your idea. That is all it takes." },
  { n: "02", t: "Blueprint", d: "Architecture, stack, schemas and endpoints — generated instantly." },
  { n: "03", t: "Build", d: "A multi-agent AI swarm writes and tests production-grade code." },
  { n: "04", t: "Certify", d: "Compliance checks against global frameworks, with audit trails." },
  { n: "05", t: "Fund", d: "Matched with global grants and funding programs, auto-filled." },
];

const ENGINES = [
  { t: "AI Code Generation", d: "Multi-agent AI architects, codes and reviews production software." },
  { t: "Global Compliance", d: "Certification against startup frameworks, with audit trails." },
  { t: "Funding Matching", d: "Matched to global grants and funding programs, auto-filled." },
];

const TIERS = [
  {
    name: "Start",
    price: "$0",
    period: "forever",
    desc: "Validate your idea before you invest a dollar.",
    features: ["1 active project", "Full architectural blueprint", "Community support"],
    cta: "Start Free",
    featured: false,
  },
  {
    name: "Grow",
    price: "$29",
    period: "/month",
    desc: "Take a startup from idea to launch-ready.",
    features: ["Unlimited projects", "AI code generation + certification", "Funding match & autofill", "Priority support"],
    cta: "Start 14-Day Trial",
    featured: true,
  },
  {
    name: "Scale",
    price: "Custom",
    period: "",
    desc: "For studios, accelerators and enterprises.",
    features: ["Team seats & workspaces", "Custom compliance packs", "Dedicated success manager"],
    cta: "Contact Sales",
    featured: false,
  },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Ambient background: glow + grid */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-[-20%] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[130px]" />
        <div className="absolute right-[8%] top-[28%] h-[420px] w-[420px] rounded-full bg-[#8B5CF6]/10 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_70%)]" />
      </div>

      {/* Navigation */}
      <nav className="glass fixed top-0 z-50 w-full border-b border-surface-200/60 dark:border-surface-800/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-baseline gap-0.5 text-lg font-bold tracking-tight">
            <span className="text-surface-900 dark:text-surface-100">Afro</span>
            <span className="text-brand-500">ID</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link href="#how-it-works" className="text-sm font-medium text-surface-600 transition-colors hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-50">
              How It Works
            </Link>
            <Link href="#features" className="text-sm font-medium text-surface-600 transition-colors hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-50">
              Features
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-surface-600 transition-colors hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-50">
              Pricing
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm">
              Sign In
            </Link>
            <Link href="/register" className="btn-primary text-sm">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — editorial, left-aligned */}
      <section className="relative flex min-h-screen flex-col justify-center px-6 pt-16">
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-400">
              The Startup Factory
            </p>

            <h1 className="mt-6 font-serif text-5xl leading-[1.05] tracking-tight text-surface-900 dark:text-surface-50 sm:text-6xl">
              Build. Certify. Fund.{" "}
              <span className="italic text-brand-400">Without Permission.</span>
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-surface-600 dark:text-surface-400">
              The platform for the world&apos;s next founders. Turn your idea into
              production code, get compliance-certified, and match with global
              funding — all in one place.
            </p>

            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row">
              <Link href="/register" className="btn-primary px-8 py-3 text-base">
                Start Building — Free
              </Link>
              <Link href="#how-it-works" className="btn-secondary px-8 py-3 text-base">
                Watch It Work
              </Link>
            </div>
          </div>

          {/* Engines — product facts, no numbers */}
          <div className="mt-24 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] sm:grid-cols-3">
            {ENGINES.map((e) => (
              <div key={e.t} className="bg-transparent px-6 py-5">
                <div className="text-sm font-semibold text-brand-500">{e.t}</div>
                <div className="mt-1 text-sm text-surface-500 dark:text-surface-400">{e.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-400">
              How It Works
            </p>
            <h2 className="mt-4 font-serif text-4xl tracking-tight text-surface-900 dark:text-surface-50">
              From one sentence to a funded company.
            </h2>
            <p className="mt-4 text-surface-600 dark:text-surface-400">
              Five autonomous steps. Zero questions. One platform.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-5">
            {STEPS.map((s, i) => (
              <div key={s.n} className="card group relative p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-500/5">
                <div className="flex items-baseline justify-between">
                  <span className="font-serif text-2xl italic text-brand-500/50">
                    {s.n}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className="hidden text-surface-600 md:block" aria-hidden="true">→</span>
                  )}
                </div>
                <h3 className="mt-4 text-lg font-bold">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-surface-500 dark:text-surface-400">
                  {s.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-400">
              Features
            </p>
            <h2 className="mt-4 font-serif text-4xl tracking-tight text-surface-900 dark:text-surface-50">
              Three engines. One platform.
            </h2>
            <p className="mt-4 text-surface-600 dark:text-surface-400">
              Everything a startup needs to go from concept to funded company.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            <div className="card group p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-500/5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 transition-colors group-hover:bg-brand-500 group-hover:text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold">Code</h3>
              <p className="mt-3 leading-relaxed text-surface-600 dark:text-surface-400">
                Describe your product in plain language. A multi-agent AI system
                architects, codes, reviews, and deploys production-ready software.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-surface-500">
                <li className="flex items-center gap-2">
                  <span className="font-bold text-brand-500">✓</span> Concept → Production Code
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-bold text-brand-500">✓</span> Multi-Agent AI Pipeline
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-bold text-brand-500">✓</span> Built-in IDE
                </li>
              </ul>
            </div>

            <div className="card group p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-500/5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 transition-colors group-hover:bg-brand-500 group-hover:text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold">Certify</h3>
              <p className="mt-3 leading-relaxed text-surface-600 dark:text-surface-400">
                Automated compliance verification against global startup
                frameworks. IP originality analysis and tamper-proof audit trails.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-surface-500">
                <li className="flex items-center gap-2">
                  <span className="font-bold text-brand-500">✓</span> Global Compliance Frameworks
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-bold text-brand-500">✓</span> IP Originality Scoring
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-bold text-brand-500">✓</span> Hash-Chained Audit Trail
                </li>
              </ul>
            </div>

            <div className="card group p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-500/5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 transition-colors group-hover:bg-brand-500 group-hover:text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold">Fund</h3>
              <p className="mt-3 leading-relaxed text-surface-600 dark:text-surface-400">
                AI-powered matching to global grants and funding programs.
                Auto-fill applications and generate winning narratives.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-surface-500">
                <li className="flex items-center gap-2">
                  <span className="font-bold text-brand-500">✓</span> Vector Similarity Matching
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-bold text-brand-500">✓</span> Auto-Fill Applications
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-bold text-brand-500">✓</span> AI Grant Writing Engine
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-400">
              Pricing
            </p>
            <h2 className="mt-4 font-serif text-4xl tracking-tight text-surface-900 dark:text-surface-50">
              Start free. Scale when you&apos;re ready.
            </h2>
            <p className="mt-4 text-surface-600 dark:text-surface-400">
              No hidden fees. No equity. Cancel anytime.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className={`card relative p-8 transition-all duration-300 hover:-translate-y-1 ${
                  t.featured
                    ? "border-brand-500/40 shadow-lg shadow-brand-500/10"
                    : "hover:shadow-lg hover:shadow-brand-500/5"
                }`}
              >
                {t.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-bold">{t.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">{t.price}</span>
                  {t.period && <span className="text-sm text-surface-500">{t.period}</span>}
                </div>
                <p className="mt-3 text-sm text-surface-500 dark:text-surface-400">{t.desc}</p>
                <ul className="mt-6 space-y-2 text-sm text-surface-500">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="font-bold text-brand-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`mt-8 block w-full text-center ${t.featured ? "btn-primary" : "btn-secondary"} py-2.5`}
                >
                  {t.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-28">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="relative rounded-2xl border border-brand-500/20 bg-brand-500/5 px-8 py-16">
            <h2 className="relative font-serif text-3xl tracking-tight sm:text-5xl">
              Your startup is one sentence away.
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-surface-600 dark:text-surface-400">
              Describe your idea. Watch the blueprint, the code, the certification,
              and the funding match build themselves.
            </p>
            <Link
              href="/register"
              className="relative mt-8 inline-block rounded-md bg-brand-500 px-10 py-4 text-base font-bold text-white transition-colors hover:bg-brand-400"
            >
              Start Building — Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-200 py-12 dark:border-surface-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-surface-500 sm:flex-row">
          <p>© 2026 AfroID. Empowering founders worldwide to build without permission.</p>
          <div className="flex items-center gap-6">
            <Link href="/login" className="transition-colors hover:text-surface-900 dark:hover:text-surface-50">
              Sign In
            </Link>
            <Link href="/register" className="transition-colors hover:text-surface-900 dark:hover:text-surface-50">
              Get Started
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
