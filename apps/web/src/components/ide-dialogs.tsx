"use client";

/**
 * IDEDialogs — Modals for Keyboard Shortcuts Cheat Sheet and About geezcodE.
 */

import React from "react";
import { X, Keyboard, Info, CheckCircle2 } from "lucide-react";
import { GeezCodeLogo } from "@/components/geezcode-logo";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    category: "General & Navigation",
    shortcuts: [
      { key: "Ctrl + P", desc: "Quick Open File" },
      { key: "Ctrl + Shift + P", desc: "Command Palette" },
      { key: "Ctrl + B", desc: "Toggle Primary Sidebar" },
      { key: "Ctrl + Alt + B", desc: "Toggle AI Assistant Dock" },
      { key: "Ctrl + J", desc: "Toggle Terminal Panel" },
      { key: "Ctrl + `", desc: "Focus Terminal" },
    ],
  },
  {
    category: "File Management",
    shortcuts: [
      { key: "Ctrl + N", desc: "New File" },
      { key: "Ctrl + S", desc: "Save Active File" },
      { key: "Ctrl + Shift + S", desc: "Save As..." },
      { key: "Ctrl + W", desc: "Close Active File" },
      { key: "Ctrl + ,", desc: "Preferences / Settings" },
    ],
  },
  {
    category: "Editing & Buffer",
    shortcuts: [
      { key: "Ctrl + Z", desc: "Undo" },
      { key: "Ctrl + Y", desc: "Redo" },
      { key: "Ctrl + F", desc: "Find in File" },
      { key: "Ctrl + H", desc: "Find & Replace" },
      { key: "Ctrl + /", desc: "Toggle Line Comment" },
      { key: "Shift + Alt + F", desc: "Format Document" },
      { key: "Alt + Z", desc: "Toggle Word Wrap" },
    ],
  },
  {
    category: "Selection & Navigation",
    shortcuts: [
      { key: "Ctrl + A", desc: "Select All" },
      { key: "Ctrl + G", desc: "Go to Line/Column" },
      { key: "Ctrl + Shift + O", desc: "Go to Symbol" },
      { key: "F12", desc: "Go to Definition" },
      { key: "Shift + F12", desc: "Go to References" },
      { key: "F8", desc: "Next Problem / Diagnostic" },
    ],
  },
  {
    category: "Execution & Swarm",
    shortcuts: [
      { key: "F5", desc: "Run Active File" },
      { key: "Ctrl + F5", desc: "Run Test Suite (pytest)" },
      { key: "Ctrl + Shift + B", desc: "Run Autonomous Swarm Build" },
      { key: "Ctrl + Shift + V", desc: "Open Sandboxed Live Preview" },
    ],
  },
];

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-50 duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-surface-750 bg-surface-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-surface-800 px-4 py-3 bg-surface-950">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-brand-400" />
            <h2 className="text-sm font-semibold text-surface-100">
              geezcodE Keyboard Shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-surface-500 hover:text-surface-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4 text-xs">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.category} className="space-y-1.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-brand-400">
                {group.category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {group.shortcuts.map((sc) => (
                  <div
                    key={sc.key}
                    className="flex items-center justify-between rounded-lg border border-surface-800 bg-surface-950/60 px-2.5 py-1.5"
                  >
                    <span className="text-surface-300">{sc.desc}</span>
                    <kbd className="rounded border border-surface-700 bg-surface-800 px-1.5 py-0.5 font-mono text-[10px] text-surface-200">
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-surface-800 bg-surface-950 px-4 py-2 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-surface-800 hover:bg-surface-700 px-3 py-1.5 text-xs text-surface-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-50 duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-surface-750 bg-surface-900 shadow-2xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <GeezCodeLogo size={24} showWordmark={true} />
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-surface-500 hover:text-surface-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 text-xs text-surface-300 leading-relaxed">
          <p>
            <strong className="text-surface-100">geezcodE IDE v2.0</strong> is the
            sovereign autonomous startup factory and professional development environment
            powering Afroid.
          </p>
          <div className="rounded-lg border border-surface-800 bg-surface-950 p-3 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-surface-500">Core Engine:</span>
              <span className="font-mono text-brand-400">Monaco Editor + geezcodE DSL</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-surface-500">Terminal Runtime:</span>
              <span className="font-mono text-emerald-400">@xterm/xterm Canvas PTY</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-surface-500">Autonomous Orchestration:</span>
              <span className="font-mono text-surface-200">Multi-Agent Swarm v2</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-surface-500">Security:</span>
              <span className="font-mono text-surface-200">Allowlisted Subprocess CWD</span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-surface-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-brand-600 hover:bg-brand-500 px-4 py-1.5 text-xs font-medium text-white shadow"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
