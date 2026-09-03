"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import Link from "next/link";
import { GeezCodeLogo } from "@/components/geezcode-logo";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-surface-0 px-6 py-12 dark:bg-surface-950">
          <div className="card max-w-md p-8 text-center shadow-xl">
            <div className="flex justify-center">
              <GeezCodeLogo size={48} showWordmark={false} />
            </div>
            <h2 className="mt-6 text-2xl font-bold">Something went wrong</h2>
            <p className="mt-2 text-sm text-surface-500">
              {this.state.error?.message || "An unexpected error occurred while rendering this page."}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="btn-primary px-5 py-2.5 text-sm"
              >
                Try Again
              </button>
              <Link href="/dashboard" className="btn-secondary px-5 py-2.5 text-sm">
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
