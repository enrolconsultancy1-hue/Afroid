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
  glow = true,
}: GeezCodeLogoProps) {
  const pixelSize =
    typeof size === "number"
      ? size
      : size === "micro"
      ? 24
      : size === "small"
      ? 32
      : size === "medium"
      ? 48
      : 96;

  // Hexagonal viewBox dimensions
  const viewBoxSize = 100;
  const strokeWidth = 3.5;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Primary Mark: ፩<sub></></sub> */}
      <div
        className="relative flex items-center justify-center flex-shrink-0 text-[#33FF66] font-mono font-bold"
        style={{ fontSize: typeof size === "number" ? size : size === "micro" ? 16 : size === "small" ? 24 : size === "medium" ? 36 : 48 }}
      >
        <span>፩</span>
        <sub style={{ fontSize: '0.55em', marginLeft: '0.15em', verticalAlign: 'sub' }}>&lt;/&gt;</sub>
      </div>

      {/* Wordmark & Tagline */}
      {(showWordmark || showTagline) && (
        <div className="flex flex-col leading-tight">
          {showWordmark && (
            <div className="flex items-center text-sm font-bold tracking-tight font-sans">
              <span className="text-[#F5F7FA]">geez</span>
              <span className="text-[#33FF66]">codE</span>
            </div>
          )}
          {showTagline && (
            <span className="text-[9px] font-mono tracking-widest text-[#B8C2C8] uppercase mt-0.5">
              CODE • BUILD • SHIP
            </span>
          )}
        </div>
      )}
    </div>
  );
}
