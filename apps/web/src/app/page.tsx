import Link from "next/link";
import { GeezCodeLogo } from "@/components/geezcode-logo";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      

      {/* Navigation */}
      <nav className="glass fixed top-0 z-50 w-full">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <GeezCodeLogo size={32} showWordmark={true} />
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <Link href="#features" className="text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-50 transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-50 transition-colors">
              How It Works
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-50 transition-colors">
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

      {/* Hero Section */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-16 text-center">
        <div className="animate-fade-in">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-4 py-1.5 text-sm font-medium text-brand-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
            </span>
            Now in Public Beta
          </div>
        </div>

        <h1 className="animate-slide-up max-w-4xl text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
          Build. Certify. Fund.{" "}
          <span className="text-brand-400">Without Permission.</span>
        </h1>

        <p className="mt-6 max-w-2xl animate-slide-up text-lg leading-relaxed text-surface-600 dark:text-surface-400 [animation-delay:100ms]">
          The sovereign AI factory for African founders. Transform your idea into
          production code, get compliance-certified, and match with $3B+ in
          non-dilutive funding — all in one platform.
        </p>

        <div className="mt-10 flex animate-slide-up flex-col items-center gap-4 sm:flex-row [animation-delay:200ms]">
          <Link href="/register" className="btn-primary px-8 py-3 text-base">
            Start Building — Free
          </Link>
          <Link href="#demo" className="btn-secondary px-8 py-3 text-base">
            Watch Demo
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-20 grid animate-slide-up grid-cols-3 gap-8 [animation-delay:300ms]">
          <div>
            <div className="text-3xl font-bold text-brand-400">84K+</div>
            <div className="mt-1 text-sm text-surface-500">Founders Served</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-brand-400">$90M</div>
            <div className="mt-1 text-sm text-surface-500">Funding Landed</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-brand-400">2,000</div>
            <div className="mt-1 text-sm text-surface-500">Jobs Created</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Three Engines. One Platform.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-surface-600 dark:text-surface-400">
              Everything an African startup needs to go from concept to funded company.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {/* geezcodE */}
            <div className="card group p-8 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/5 hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 transition-colors group-hover:bg-brand-500 group-hover:text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold">geezcodE IDE</h3>
              <p className="mt-3 text-surface-600 dark:text-surface-400 leading-relaxed">
                Describe your product in plain language. Our multi-agent AI system
                architects, codes, reviews, and deploys production-ready software.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-surface-500">
                <li className="flex items-center gap-2">
                  <span className="text-brand-500">✓</span> Concept → Production Code
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-brand-500">✓</span> Multi-Agent AI Pipeline
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-brand-500">✓</span> Built-in Monaco Editor
                </li>
              </ul>
            </div>

            {/* Certify */}
            <div className="card group p-8 transition-all duration-300 hover:shadow-lg hover:shadow-brand/5 hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold">Afroid Certify</h3>
              <p className="mt-3 text-surface-600 dark:text-surface-400 leading-relaxed">
                Automated compliance verification against African Startup Acts.
                IP originality analysis and tamper-proof audit trails.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-surface-500">
                <li className="flex items-center gap-2">
                  <span className="text-brand">✓</span> Nigeria, Kenya, AU Compliance
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-brand">✓</span> IP Originality Scoring
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-brand">✓</span> Hash-Chained Audit Trail
                </li>
              </ul>
            </div>

            {/* Incubate */}
            <div className="card group p-8 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/5 hover:-translate-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold">Afroid Incubate</h3>
              <p className="mt-3 text-surface-600 dark:text-surface-400 leading-relaxed">
                AI-powered matching to $3B+ in non-dilutive funding. Auto-fill
                applications with 95% accuracy and generate winning narratives.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-surface-500">
                <li className="flex items-center gap-2">
                  <span className="text-brand">✓</span> Vector Similarity Matching
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-brand">✓</span> 95% Auto-Fill Accuracy
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-brand">✓</span> AI Grant Writing Engine
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-200 dark:border-surface-800 py-12">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-surface-500">
          <p>© 2026 Afroid. Empowering African founders to build without permission.</p>
        </div>
      </footer>
    </main>
  );
}
