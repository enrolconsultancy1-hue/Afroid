import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 p-8 font-sans">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/" className="text-xs text-brand-400 hover:underline">
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
        <p className="text-sm text-surface-400">Last updated: August 2026</p>
        <div className="space-y-4 text-sm text-surface-300 leading-relaxed border-t border-surface-800 pt-6">
          <p>Afroid is committed to protecting the data privacy of African entrepreneurs and enterprises.</p>
          <h2 className="text-lg font-bold text-white">1. Data Sovereignty & Storage</h2>
          <p>All startup data is stored in compliance with African data protection regulations in Google Cloud region africa-south1 (Johannesburg).</p>
          <h2 className="text-lg font-bold text-white">2. Encryption & Security</h2>
          <p>All sensitive credentials and database records are encrypted in transit with TLS 1.3 and at rest with AES-256.</p>
        </div>
      </div>
    </div>
  );
}
