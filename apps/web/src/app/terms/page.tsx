import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 p-8 font-sans">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/" className="text-xs text-brand-400 hover:underline">
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
        <p className="text-sm text-surface-400">Last updated: August 2026</p>
        <div className="space-y-4 text-sm text-surface-300 leading-relaxed border-t border-surface-800 pt-6">
          <p>Welcome to Afroid: The Sovereign Autonomous Startup Factory. By using our platform, you agree to these terms.</p>
          <h2 className="text-lg font-bold text-white">1. Intellectual Property & Sovereignty</h2>
          <p>Founders retain 100% ownership of code, blueprints, and intellectual property generated on the platform.</p>
          <h2 className="text-lg font-bold text-white">2. Multi-Agent Code Generation</h2>
          <p>AI-generated code is provided under developer review. Founders are responsible for conducting testing before production deployment.</p>
        </div>
      </div>
    </div>
  );
}
