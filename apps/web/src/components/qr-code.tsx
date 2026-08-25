"use client";

import React, { useMemo } from "react";

interface QrCodeProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
}

export function QrCodeView({
  value,
  size = 200,
  fgColor = "#131316",
  bgColor = "#ffffff",
}: QrCodeProps) {
  const matrix = useMemo(() => {
    const n = 25;
    const grid: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));

    const drawFinder = (startX: number, startY: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            grid[startY + r][startX + c] = true;
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(n - 7, 0);
    drawFinder(0, n - 7);

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (r === 0 || r === 4 || c === 0 || c === 4 || (r === 2 && c === 2)) {
          grid[n - 9 + r][n - 9 + c] = true;
        }
      }
    }

    for (let i = 8; i < n - 8; i++) {
      if (i % 2 === 0) {
        grid[6][i] = true;
        grid[i][6] = true;
      }
    }

    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (
          (r < 8 && c < 8) ||
          (r < 8 && c >= n - 8) ||
          (r >= n - 8 && c < 8) ||
          (r >= 10 && r <= 14 && c >= 10 && c <= 14)
        ) {
          continue;
        }
        const bit = ((hash ^ (r * 31 + c * 17)) & 1) === 1;
        grid[r][c] = bit;
      }
    }

    return grid;
  }, [value]);

  const n = matrix.length;
  const cellSize = size / n;

  return (
    <div
      className="relative flex items-center justify-center p-3 rounded-lg border border-surface-200 dark:border-surface-700"
      style={{ width: size + 24, height: size + 24, backgroundColor: bgColor }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} fill={bgColor} />
        {matrix.map((row, r) =>
          row.map((cell, c) => {
            if (!cell) return null;
            return (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize - 0.3}
                height={cellSize - 0.3}
                rx={cellSize * 0.22}
                fill={fgColor}
              />
            );
          })
        )}
      </svg>
    </div>
  );
}