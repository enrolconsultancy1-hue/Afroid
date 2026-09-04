"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GeezCodeLogo } from "@/components/geezcode-logo";
import { useAuthStore } from "@/stores/auth-store";
import { ErrorBoundary } from "@/components/error-boundary";
import { Menu, X, LogOut, User, Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "next-themes";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/ide", label: "geezcodE IDE" },
  { href: "/dashboard/certify", label: "Certify" },
  { href: "/intake", label: "Intake" },
  { href: "/dashboard/incubate", label: "Incubate" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isAuthenticated, loadUser, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // geezcodE IDE provides its own full-screen professional top bar, activity bar, and status bar
  if (pathname?.startsWith("/dashboard/ide")) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }

  return (
    <div className="min-h-screen bg-surface-0 text-surface-900 dark:bg-surface-950 dark:text-surface-100">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-surface-200 bg-surface-0/90 backdrop-blur-md dark:border-surface-800 dark:bg-surface-950/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-baseline gap-0.5 text-xl font-bold tracking-tight">
              <span className="text-surface-900 dark:text-surface-100">Afro</span>
              <span className="text-brand-500">ID</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden items-center gap-1 md:flex" aria-label="Main Navigation">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href as any}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-brand-500/10 font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                        : "text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-50"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* User Profile / Auth State */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 rounded-full border border-surface-200 bg-surface-50 p-1.5 pr-3 transition-colors hover:border-surface-300 dark:border-surface-750 dark:bg-surface-900 dark:hover:border-surface-700"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 font-semibold text-xs text-white">
                    {user.full_name ? user.full_name[0].toUpperCase() : "U"}
                  </div>
                  <span className="hidden text-xs font-medium sm:inline-block max-w-[120px] truncate">
                    {user.full_name || user.email}
                  </span>
                </button>

                {/* User Dropdown */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-surface-200 bg-surface-0 p-2 shadow-xl dark:border-surface-800 dark:bg-surface-900 animate-scale-in">
                    <div className="px-3 py-2 border-b border-surface-100 dark:border-surface-800">
                      <p className="text-xs font-semibold text-surface-900 dark:text-surface-150 truncate">
                        {user.full_name}
                      </p>
                      <p className="text-[11px] text-surface-500 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="btn-primary text-xs px-3 py-1.5">
                Sign In
              </Link>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 md:hidden text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="border-b border-surface-200 bg-surface-0 px-4 py-3 md:hidden dark:border-surface-800 dark:bg-surface-950">
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href as any}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                      isActive
                        ? "bg-brand-500/10 font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                        : "text-surface-600 dark:text-surface-400"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main Page Content */}
      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  );
}
