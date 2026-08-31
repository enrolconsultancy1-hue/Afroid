import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AfroID — The Startup Factory",
    template: "%s | AfroID",
  },
  description:
    "Build, certify, and fund your startup with AI-powered tools: code generation, " +
    "compliance certification, and global funding matching.",
  keywords: [
    "startup factory",
    "AI code generation",
    "startup certification",
    "grant funding",
    "non-dilutive funding",
    "AfroID",
  ],
  authors: [{ name: "AfroID" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://afroid.io",
    siteName: "AfroID",
    title: "AfroID — The Startup Factory",
    description: "Build, certify, and fund your startup with AI.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AfroID — The Startup Factory",
    description: "Build, certify, and fund your startup with AI.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
