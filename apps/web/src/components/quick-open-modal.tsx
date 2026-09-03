"use client";

/**
 * QuickOpenModal — Fast Ctrl+P file switcher for geezcodE IDE.
 *
 * Allows fuzzy searching through all workspace files in the active file tree
 * and jumping to them with keyboard navigation (Up/Down/Enter/Escape).
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, FileCode, X } from "lucide-react";

interface QuickOpenFile {
  name: string;
  path: string;
  type: "file" | "dir";
}

interface QuickOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: QuickOpenFile[];
  onSelectFile: (path: string) => void;
}

export function QuickOpenModal({
  isOpen,
  onClose,
  files,
  onSelectFile,
}: QuickOpenModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten all files
  const flatFiles = useMemo(() => {
    return files.filter((f) => f.type === "file");
  }, [files]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return flatFiles.slice(0, 15);
    return flatFiles
      .filter(
        (f) =>
          f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [flatFiles, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(filtered.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + filtered.length) % Math.max(filtered.length, 1)
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        onSelectFile(filtered[selectedIndex].path);
        onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm animate-in fade-in-50 duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-surface-750 bg-surface-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-surface-800 px-3.5 py-2.5 bg-surface-950">
          <Search className="h-4 w-4 text-brand-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a file name to open... (e.g. domain.geez, main.py)"
            className="flex-1 bg-transparent text-sm text-surface-100 placeholder:text-surface-600 outline-none font-sans"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-surface-500 hover:text-surface-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto p-1 font-mono text-xs">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-surface-500">
              No matching files found.
            </div>
          ) : (
            filtered.map((file, idx) => (
              <button
                key={file.path}
                type="button"
                onClick={() => {
                  onSelectFile(file.path);
                  onClose();
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                  idx === selectedIndex
                    ? "bg-brand-500/15 text-surface-100 border border-brand-500/30"
                    : "text-surface-300 hover:bg-surface-800"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className="h-4 w-4 text-brand-400 shrink-0" />
                  <span className="font-medium text-surface-200">{file.name}</span>
                  <span className="text-[11px] text-surface-500 truncate">
                    {file.path}
                  </span>
                </div>
                {idx === selectedIndex && (
                  <span className="text-[10px] text-brand-400 shrink-0 uppercase tracking-wide">
                    Press Enter
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-surface-800 bg-surface-950 px-3.5 py-1.5 text-[10px] text-surface-500">
          <span>Navigate with ↑ ↓ • Press Enter to open</span>
          <span>Esc to dismiss</span>
        </div>
      </div>
    </div>
  );
}
