import Link from "next/link";

export default function PrivacyPage() {
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
            <Link href="/terms" className="text-surface-400 hover:text-surface-100 transition-colors">
              Terms of Service
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
            Sovereign Data Governance
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="text-sm text-surface-400">
            Last Updated: September 1, 2026 · Effective Date: September 1, 2026
          </p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-sm text-surface-300 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight">1. Commitment to Sovereign African Privacy</h2>
            <p>
              Afroid (&quot;we&quot;, &quot;our&quot;, or &quot;the Platform&quot;) operates as the Sovereign Autonomous Startup Factory. We believe that technological sovereignty begins with uncompromised data privacy. We are strictly committed to safeguarding the intellectual property, founder identity, and business architectures of African innovators and enterprises globally.
            </p>
            <p>
              This Privacy Policy explains how we collect, store, process, protect, and handle your information in strict compliance with African and global data protection frameworks, including the <strong>Nigeria Data Protection Act (NDPA)</strong>, <strong>South Africa Protection of Personal Information Act (POPIA)</strong>, <strong>Kenya Data Protection Act</strong>, and the <strong>African Union Convention on Cyber Security and Personal Data Protection (Malabo Convention)</strong>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight">2. Information We Collect</h2>
            <p>We collect only the minimum data strictly necessary to operate our multi-agent software factory, compliance engine, and grant matching pipelines:</p>
            <ul className="list-disc pl-5 space-y-2 text-surface-400">
              <li>
                <strong className="text-surface-200">Account & Identity Information:</strong> Full name, professional email address, organization name, role, encrypted authentication credentials, and OAuth tokens (e.g. Google Sign-In).
              </li>
              <li>
                <strong className="text-surface-200">Architect Intake & Business Concept Data:</strong> Natural language project summaries, target user personas, functional specifications, data entity models, and domain constraints submitted via the Zero-Question Architect Intake.
              </li>
              <li>
                <strong className="text-surface-200">Codebase & Technical Artifacts:</strong> Generated AST definitions, code files, migration scripts, container specifications, and workspace repositories created within geezcodE IDE.
              </li>
              <li>
                <strong className="text-surface-200">Regulatory & Verification Records:</strong> Startup incorporation details, cap tables, IP originality hashes, and cryptographic audit proofs processed by Afroid Certify.
              </li>
              <li>
                <strong className="text-surface-200">Incubation & Grant Matching Data:</strong> Funding criteria, opportunity bookmarks, proposal drafts, and institutional grant submission autofill histories.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight">3. Zero Model-Training Guarantee</h2>
            <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-4 text-surface-200">
              <strong className="text-brand-300">Your Code &amp; Ideas Are Never Used to Train AI Models:</strong> We explicitly contract and configure our frontier LLM providers and embedding engines to ensure that your proprietary concepts, source code, and architectural blueprints are never stored for foundation model training or cross-customer model fine-tuning.
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight">4. Data Sovereignty, Regional Storage &amp; Encryption</h2>
            <p>
              All primary relational databases (PostgreSQL with pgvector) and object stores are hosted within certified regional Google Cloud facilities in the African continent (<strong>africa-south1 — Johannesburg</strong>).
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-surface-400">
              <li><strong>In Transit:</strong> All HTTP and WebSocket communications are encrypted using TLS 1.3 with forward secrecy.</li>
              <li><strong>At Rest:</strong> All database volumes, vector embeddings, and storage buckets are encrypted using AES-256 standard encryption keys.</li>
              <li><strong>Passphrases & Secrets:</strong> Authentication passwords are encrypted using state-of-the-art Argon2id hashing algorithms.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight">5. Cryptographic SHA-256 Audit Trail</h2>
            <p>
              To satisfy statutory requirements under African Startup Acts, Afroid Certify generates immutable, append-only cryptographic audit chains. Audit entries contain timestamped SHA-256 state hashes that verify compliance status without exposing private source code or founder secrets.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight">6. Data Subject Rights &amp; Portability</h2>
            <p>Under applicable data sovereignty statutes, you retain full rights over your data:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-surface-400">
              <li><strong>Right of Access &amp; Portability:</strong> Export your complete codebase, AST blueprints, and audit logs at any time as downloadable archives.</li>
              <li><strong>Right of Rectification &amp; Erasure:</strong> Delete your projects and account permanently with automated cascaded deletion across database records and vector stores.</li>
              <li><strong>Right to Object:</strong> Restrict automated processing or revoke OAuth integrations at will.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white tracking-tight">7. Data Protection Officer &amp; Contact</h2>
            <p>
              If you have any questions, data deletion requests, or regulatory inquiries regarding our sovereign privacy practices, please contact our Data Governance Council:
            </p>
            <div className="rounded-xl border border-surface-800 bg-surface-900/60 p-4 text-xs space-y-1 text-surface-400">
              <p className="font-semibold text-white">Afroid Data Protection &amp; Governance Office</p>
              <p>Email: <a href="mailto:privacy@afroid.io" className="text-brand-400 hover:underline">privacy@afroid.io</a></p>
              <p>Physical Entity: AfroID Sovereign Technologies Ltd.</p>
              <p>Region: Africa-South1 Data Center Zone</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-surface-800/80 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-surface-500">
          <p>© 2026 AfroID Sovereign Technologies. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-surface-300">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-surface-300 font-semibold text-brand-400">Privacy Policy</Link>
            <Link href="/" className="hover:text-surface-300">Platform Home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
