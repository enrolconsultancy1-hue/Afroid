"use client";

/**
 * CommandPalette — Universal Ctrl+Shift+P / F1 Command Center for geezcodE IDE.
 *
 * Provides instant fuzzy search and keyboard execution across all canonical IDE commands:
 * File, Edit, Selection, View, Go, Run, Terminal, Swarm, and Help actions.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  X,
  FileCode,
  FilePlus,
  FolderPlus,
  Save,
  Trash2,
  Undo2,
  Redo2,
  Scissors,
  Copy,
  Clipboard,
  SearchCode,
  MessageSquareCode,
  CheckSquare,
  MoveUp,
  MoveDown,
  Play,
  RotateCcw,
  Globe,
  HelpCircle,
  Keyboard,
  Settings,
  Hash,
  AlertCircle,
  WrapText,
  PanelLeft,
  PanelRight,
  Terminal as TerminalIcon,
  Files,
  GitBranch,
  FileText,
  Bot,
  Sparkles,
  Layers,
  Code2,
  Eye,
  Zap,
} from "lucide-react";

export interface CommandItem {
  id: string;
  category: "File" | "Edit" | "Selection" | "View" | "Go" | "Run" | "Terminal" | "Swarm" | "Help" | "Preferences";
  label: string;
  detail?: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return commands.slice(0, 30);
    return commands
      .filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(q) ||
          cmd.category.toLowerCase().includes(q) ||
          (cmd.detail && cmd.detail.toLowerCase().includes(q)) ||
          (cmd.shortcut && cmd.shortcut.toLowerCase().includes(q))
      )
      .slice(0, 30);
  }, [commands, query]);

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
      setSelectedIndex((prev) => (prev + 1) % Math.max(filteredCommands.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(filteredCommands.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        const cmd = filteredCommands[selectedIndex];
        onClose();
        // Execute command in next tick so modal dismiss doesn't swallow focus
        setTimeout(() => cmd.action(), 50);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/60 backdrop-blur-sm animate-in fade-in-50 duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-surface-750 bg-surface-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center gap-2.5 border-b border-surface-800 px-3.5 py-2.5 bg-surface-950">
          <Zap className="h-4 w-4 text-brand-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search... (e.g. Save, Format, Swarm, Terminal, Git)"
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

        {/* Results list */}
        <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5 font-sans text-xs">
          {filteredCommands.length === 0 ? (
            <div className="p-6 text-center text-surface-500">
              No matching commands found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    setTimeout(() => cmd.action(), 50);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-brand-500/15 text-surface-100 border border-brand-500/30 shadow-sm"
                      : "text-surface-300 hover:bg-surface-800 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate min-w-0">
                    <span className="p-1 rounded bg-surface-800/80 text-brand-400 shrink-0">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-500 shrink-0">
                      {cmd.category}
                    </span>
                    <span className="font-medium text-surface-200 truncate">
                      {cmd.label}
                    </span>
                    {cmd.detail && (
                      <span className="text-[11px] text-surface-500 truncate hidden sm:inline">
                        — {cmd.detail}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {cmd.shortcut && (
                      <kbd className="rounded border border-surface-700 bg-surface-800 px-1.5 py-0.5 font-mono text-[10px] text-surface-300 shadow-xs">
                        {cmd.shortcut}
                      </kbd>
                    )}
                    {isSelected && (
                      <span className="text-[10px] text-brand-400 uppercase tracking-wide font-medium">
                        ↵
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-surface-800 bg-surface-950 px-3.5 py-1.5 text-[10px] text-surface-500">
          <div className="flex items-center gap-3">
            <span>↑ ↓ to navigate</span>
            <span>↵ to execute</span>
          </div>
          <span>Esc to dismiss</span>
        </div>
      </div>
    </div>
  );
}
