import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 font-sans selection:bg-brand-500 selection:text-white">
      {/* Top Navbar */}
      <nav className="glass sticky top-0 z-50 w-full border-b border-surface-800/80 bg-surface-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-baseline gap-0.5 text-lg font-bold tracking-tight">
            <span className="text-surface-100">Afro</span>
            <span className="text-brand-500">ID</span>
          </Link>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/privacy" className="text-surface-400 hover:text-surface-100 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/" className="btn-ghost text-xs">
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-6 py-14 space-y-10">
        <div className="space-y-3 border-b border-surface-800 pb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-400">
            Sovereign Operating Agreement
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Terms of Service
          </h1>
          <p className="text-sm text-surface-400">
            Last Updated: September 1, 2026 · Effective Date: September 1, 2026
          </p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-sm text-surface-300 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight">1. Agreement to Terms</h2>
            <p>
              Welcome to AfroID (&quot;the Platform&quot;), operated by AfroID Sovereign Technologies. By creating an account, accessing the geezcodE IDE, using our Zero-Question Architect Intake, generating compliance certificates with Afroid Certify, or seeking funding with Afroid Incubate, you agree to be bound by these Terms of Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight">2. 100% Founder Intellectual Property Ownership</h2>
            <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-4 text-surface-200">
              <strong className="text-brand-300">You Own Everything You Create:</strong> You retain exclusive, complete, and unencumbered ownership of all intellectual property, natural language descriptions, architectural blueprints, AST trees, generated source code, and deployment scripts created through AfroID. AfroID claims zero equity, zero IP royalty, and zero ownership interest in your software.
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight">3. Platform Services &amp; Modules</h2>
            <ul className="list-disc pl-5 space-y-2 text-surface-400">
              <li>
                <strong className="text-surface-200">geezcodE IDE &amp; Swarm Orchestrator:</strong> Multi-agent system engineering tools that synthesize natural language specifications into working code skeletons, databases, and Docker runtimes. Output is provided for developer evaluation and production deployment.
              </li>
              <li>
                <strong className="text-surface-200">Afroid Certify:</strong> Automated regulatory compliance scoring against African startup legislation (e.g. Nigeria Startup Act, Kenya Startup Bill, AU Digital Trade Protocol). Outputs include verifiable cryptographic audit certificates. Certifications reflect programmatic rule evaluations and do not replace formal government gazetting.
              </li>
              <li>
                <strong className="text-surface-200">Afroid Incubate:</strong> Semantic vector matching connecting startups with institutional grants and venture programs, complete with AI narrative grant composers and OCR autofill assistance.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight">4. User Responsibilities &amp; Code Review</h2>
            <p>
              While our multi-agent architecture performs automated syntax validation and AST checking, you are responsible for testing, securing, reviewing, and ensuring the legal compliance and operational safety of your generated code before deploying to live production environments.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight">5. Acceptable Use Policy</h2>
            <p>You agree not to use the Platform to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-surface-400">
              <li>Synthesize malicious software, exploit tooling, or phishing infrastructure.</li>
              <li>Circumvent or reverse-engineer the proprietary agent orchestration algorithms of the Platform.</li>
              <li>Violate third-party intellectual property or open-source license agreements.</li>
              <li>Perform denial-of-service or unauthorized penetration testing against AfroID infrastructure.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight">6. Subscriptions, Billing &amp; Usage Tiers</h2>
            <p>
              AfroID offers Free (Start), Professional (Grow), and Enterprise (Scale) tiers. Subscriptions are billed through secure payment gateways (Stripe). You may cancel or modify your subscription tier at any time through your dashboard billing portal.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight">7. Sovereign Arbitration &amp; Dispute Resolution</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the commercial legal standards of the African Continental Free Trade Area (AfCFTA) frameworks. Any dispute arising out of or related to these Terms shall be resolved through binding arbitration under the rules of the Lagos Court of Arbitration (LCA) or the Nairobi Centre for International Arbitration (NCIA).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight">8. Contact Information</h2>
            <p>For legal notices or questions regarding these terms, contact:</p>
            <div className="rounded-xl border border-surface-800 bg-surface-900/60 p-4 text-xs space-y-1 text-surface-400">
              <p className="font-semibold text-white">AfroID Sovereign Legal &amp; Compliance Office</p>
              <p>Email: <a href="mailto:legal@afroid.io" className="text-brand-400 hover:underline">legal@afroid.io</a></p>
              <p>Web: <a href="https://afroid.io" className="text-brand-400 hover:underline">https://afroid.io</a></p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-surface-800/80 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-surface-500">
          <p>© 2026 AfroID Sovereign Technologies. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-surface-300 font-semibold text-brand-400">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-surface-300">Privacy Policy</Link>
            <Link href="/" className="hover:text-surface-300">Platform Home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
