"use client";

import React from "react";

export interface GeezCodeLogoProps {
  size?: "micro" | "small" | "medium" | "large" | number;
  showWordmark?: boolean;
  showTagline?: boolean;
  className?: string;
  glow?: boolean;
}

/** Windows ships Ebrima/Nyala; these guarantee the Ge'ez "፩" glyph renders. */
const ETHIOPIC_FONT =
  "'Ebrima', 'Nyala', 'Noto Sans Ethiopic', 'Abyssinica SIL', serif";

export function GeezCodeLogo({
  size = "small",
  showWordmark = true,
  showTagline = false,
  className = "",
  glow = false,
}: GeezCodeLogoProps) {
  const markSize =
    typeof size === "number"
      ? size
      : size === "micro"
        ? 18
        : size === "small"
          ? 22
          : size === "medium"
            ? 34
            : 46;

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {/* Mark: Ge'ez "፩" (one) with a "</>" subscript accent */}
      <div
        className={`relative inline-flex flex-shrink-0 items-baseline leading-none text-brand-500 ${
          glow ? "drop-shadow-[0_0_6px_rgba(0,240,255,0.5)]" : ""
        }`}
        style={{ fontSize: markSize }}
      >
        <span
          aria-hidden="true"
          className="font-bold"
          style={{ fontFamily: ETHIOPIC_FONT }}
        >
          ፩
        </span>
        <span
          aria-hidden="true"
          className="font-mono font-semibold text-brand-500/80"
          style={{ fontSize: "0.42em", marginLeft: "0.08em" }}
        >
          &lt;/&gt;
        </span>
      </div>

      {(showWordmark || showTagline) && (
        <div className="flex flex-col leading-tight">
          {showWordmark && (
            <div className="flex items-center font-sans text-sm font-semibold tracking-tight">
              <span className="text-surface-900 dark:text-surface-100">geez</span>
              <span className="text-brand-500">codE</span>
            </div>
          )}
          {showTagline && (
            <span className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-surface-400">
              CODE — BUILD — SHIP
            </span>
          )}
        </div>
      )}
    </div>
  );
}
