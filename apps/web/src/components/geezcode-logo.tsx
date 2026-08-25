"use client";

import React from "react";

export interface GeezCodeLogoProps {
  size?: "micro" | "small" | "medium" | "large" | number;
  showWordmark?: boolean;
  showTagline?: boolean;
  className?: string;
  glow?: boolean;
}

export function GeezCodeLogo({
  size = "small",
  showWordmark = true,
  showTagline = false,
  className = "",
  glow = false,
}: GeezCodeLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <div
        className="relative flex items-center justify-center flex-shrink-0 text-brand-500 font-mono font-semibold"
        style={{
          fontSize:
            typeof size === "number"
              ? size
              : size === "micro"
                ? 15
                : size === "small"
                  ? 20
                  : size === "medium"
                    ? 32
                    : 42,
        }}
      >
        <span>&lt;/&gt;</span>
      </div>

      {(showWordmark || showTagline) && (
        <div className="flex flex-col leading-tight">
          {showWordmark && (
            <div className="flex items-center text-sm font-semibold tracking-tight font-sans">
              <span className="text-surface-900 dark:text-surface-100">geez</span>
              <span className="text-brand-500">codE</span>
            </div>
          )}
          {showTagline && (
            <span className="text-[9px] font-mono tracking-widest text-surface-400 uppercase mt-0.5">
              CODE — BUILD — SHIP
            </span>
          )}
        </div>
      )}
    </div>
  );
}