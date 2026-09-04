"use client";

/**
 * SettingsModal — Comprehensive IDE Preferences & Sovereign Stack Settings.
 *
 * Provides dedicated tabs for:
 * 1. Editor (Font, Ligatures, Minimap, Word Wrap, Tab Size, Auto-Save, Format on Save)
 * 2. Swarm & AI (Auto-Approve Diffs, Autopilot Execution, Agent Verbosity)
 * 3. Terminal & Runtime (Font size, PTY Buffer, Shell type)
 * 4. Sovereignty & API (Orchestrator URL, Workspace endpoints, Security sandboxing)
 */

import React, { useState } from "react";
import {
  X,
  Settings,
  SlidersHorizontal,
  Bot,
  Terminal as TerminalIcon,
  ShieldCheck,
  Check,
  RotateCcw,
  Sparkles,
  Cpu,
  Layers,
} from "lucide-react";
import { GeezCodeLogo } from "@/components/geezcode-logo";

export interface IDESettings {
  editorFontSize: number;
  tabSize: number;
  fontLigatures: boolean;
  editorMinimap: boolean;
  wordWrap: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
  formatOnSave: boolean;
  lineNumbers: "on" | "off" | "relative";
  cursorBlinking: "blink" | "smooth" | "phase" | "expand" | "solid";
  // Swarm
  autoApprovePatches: boolean;
  autopilotMode: "guided" | "autonomous" | "strict";
  swarmVerbosity: "minimal" | "standard" | "debug";
  // Terminal
  terminalFontSize: number;
  terminalCursorBlink: boolean;
  // Network / Sovereignty
  apiBase: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: IDESettings;
  onUpdateSettings: (newSettings: Partial<IDESettings>) => void;
  onResetDefaults?: () => void;
}

type TabType = "editor" | "swarm" | "terminal" | "sovereignty";

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetDefaults,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("editor");

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-50 duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-surface-750 bg-surface-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-800 px-5 py-3.5 bg-surface-950">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded bg-brand-500/10 text-brand-400">
              <Settings className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-surface-100">
                geezcodE Preferences & Settings
              </h2>
              <p className="text-[11px] text-surface-500">
                Configure editor ergonomics, autonomous swarm parameters, and runtime sovereignty.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-surface-500 hover:text-surface-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content body with sidebar tabs */}
        <div className="flex flex-1 min-h-[380px] overflow-hidden">
          {/* Tab navigation */}
          <div className="w-44 border-r border-surface-800 bg-surface-950/60 p-2 space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab("editor")}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === "editor"
                  ? "bg-brand-500/15 text-brand-300 border border-brand-500/30"
                  : "text-surface-400 hover:bg-surface-850 hover:text-surface-200"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Editor</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("swarm")}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === "swarm"
                  ? "bg-brand-500/15 text-brand-300 border border-brand-500/30"
                  : "text-surface-400 hover:bg-surface-850 hover:text-surface-200"
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              <span>Swarm & AI</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("terminal")}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === "terminal"
                  ? "bg-brand-500/15 text-brand-300 border border-brand-500/30"
                  : "text-surface-400 hover:bg-surface-850 hover:text-surface-200"
              }`}
            >
              <TerminalIcon className="h-3.5 w-3.5" />
              <span>Terminal</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("sovereignty")}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === "sovereignty"
                  ? "bg-brand-500/15 text-brand-300 border border-brand-500/30"
                  : "text-surface-400 hover:bg-surface-850 hover:text-surface-200"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Sovereignty</span>
            </button>
          </div>

          {/* Tab content panel */}
          <div className="flex-1 overflow-y-auto p-5 text-xs text-surface-200 space-y-4">
            {activeTab === "editor" && (
              <div className="space-y-4 animate-in fade-in-50 duration-150">
                <div className="border-b border-surface-800 pb-2">
                  <h3 className="font-semibold text-surface-100 text-xs">Typography & Layout</h3>
                  <p className="text-[11px] text-surface-500">Font sizing, ligatures, and Monaco layout settings.</p>
                </div>

                {/* Font size */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-surface-200">Font Size</div>
                    <div className="text-[11px] text-surface-500">Editor font size in pixels (10px — 28px)</div>
                  </div>
                  <input
                    type="number"
                    min={10}
                    max={28}
                    value={settings.editorFontSize}
                    onChange={(e) => onUpdateSettings({ editorFontSize: Number(e.target.value) })}
                    className="w-18 rounded border border-surface-750 bg-surface-950 px-2 py-1 text-xs text-right font-mono outline-none focus:border-brand-500"
                  />
                </div>

                {/* Tab Size */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-surface-200">Tab Size</div>
                    <div className="text-[11px] text-surface-500">Number of spaces per indentation level</div>
                  </div>
                  <select
                    value={settings.tabSize}
                    onChange={(e) => onUpdateSettings({ tabSize: Number(e.target.value) })}
                    className="rounded border border-surface-750 bg-surface-950 px-2 py-1 text-xs font-mono outline-none focus:border-brand-500"
                  >
                    <option value={2}>2 Spaces</option>
                    <option value={4}>4 Spaces</option>
                    <option value={8}>8 Spaces</option>
                  </select>
                </div>

                {/* Font Ligatures */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-surface-200">Font Ligatures</div>
                    <div className="text-[11px] text-surface-500">Enable programming ligatures (`=&gt;`, `===`, `!=`)</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ fontLigatures: !settings.fontLigatures })}
                    className={`relative h-4.5 w-8 rounded-full transition-colors cursor-pointer ${
                      settings.fontLigatures ? "bg-brand-600" : "bg-surface-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all ${
                        settings.fontLigatures ? "left-4" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* Minimap */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-surface-200">Minimap</div>
                    <div className="text-[11px] text-surface-500">Render code minimap on right side of editor</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ editorMinimap: !settings.editorMinimap })}
                    className={`relative h-4.5 w-8 rounded-full transition-colors cursor-pointer ${
                      settings.editorMinimap ? "bg-brand-600" : "bg-surface-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all ${
                        settings.editorMinimap ? "left-4" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* Word Wrap */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-surface-200">Word Wrap</div>
                    <div className="text-[11px] text-surface-500">Wrap long lines at viewport boundary</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ wordWrap: !settings.wordWrap })}
                    className={`relative h-4.5 w-8 rounded-full transition-colors cursor-pointer ${
                      settings.wordWrap ? "bg-brand-600" : "bg-surface-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all ${
                        settings.wordWrap ? "left-4" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                <div className="border-b border-surface-800 pt-2 pb-2">
                  <h3 className="font-semibold text-surface-100 text-xs">File Persistence & Saving</h3>
                  <p className="text-[11px] text-surface-500">Auto-save triggers and formatting preferences.</p>
                </div>

                {/* Auto Save */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-surface-200">Auto Save (1.5s Debounce)</div>
                    <div className="text-[11px] text-surface-500">Persist dirty buffers automatically after typing stops</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ autoSave: !settings.autoSave })}
                    className={`relative h-4.5 w-8 rounded-full transition-colors cursor-pointer ${
                      settings.autoSave ? "bg-brand-600" : "bg-surface-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all ${
                        settings.autoSave ? "left-4" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* Format on save */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-surface-200">Format On Save</div>
                    <div className="text-[11px] text-surface-500">Run document formatter before writing to disk</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ formatOnSave: !settings.formatOnSave })}
                    className={`relative h-4.5 w-8 rounded-full transition-colors cursor-pointer ${
                      settings.formatOnSave ? "bg-brand-600" : "bg-surface-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all ${
                        settings.formatOnSave ? "left-4" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {activeTab === "swarm" && (
              <div className="space-y-4 animate-in fade-in-50 duration-150">
                <div className="border-b border-surface-800 pb-2">
                  <h3 className="font-semibold text-surface-100 text-xs">Autonomous Agent Swarm</h3>
                  <p className="text-[11px] text-surface-500">Multi-agent build pipeline and live diff stream parameters.</p>
                </div>

                {/* Autopilot mode */}
                <div className="space-y-1.5">
                  <div className="font-medium text-surface-200">Swarm Autopilot Mode</div>
                  <div className="text-[11px] text-surface-500 mb-2">Controls level of human oversight for code patch generation.</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "guided", label: "Guided", desc: "Interactive approval modal for every diff" },
                      { id: "autonomous", label: "Autonomous", desc: "Auto-apply with undo history" },
                      { id: "strict", label: "Strict", desc: "Verify tests pass before each patch" },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => onUpdateSettings({ autopilotMode: mode.id as any })}
                        className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                          settings.autopilotMode === mode.id
                            ? "border-brand-500/50 bg-brand-500/10 text-surface-100"
                            : "border-surface-800 bg-surface-950 text-surface-400 hover:border-surface-700"
                        }`}
                      >
                        <div className="font-medium text-xs text-surface-200 mb-0.5">{mode.label}</div>
                        <div className="text-[10px] text-surface-500 leading-tight">{mode.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto-approve patches */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-surface-200">Auto-Apply Trusted Patches</div>
                    <div className="text-[11px] text-surface-500">Automatically persist agent edits without diff review prompt</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ autoApprovePatches: !settings.autoApprovePatches })}
                    className={`relative h-4.5 w-8 rounded-full transition-colors cursor-pointer ${
                      settings.autoApprovePatches ? "bg-brand-600" : "bg-surface-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all ${
                        settings.autoApprovePatches ? "left-4" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {activeTab === "terminal" && (
              <div className="space-y-4 animate-in fade-in-50 duration-150">
                <div className="border-b border-surface-800 pb-2">
                  <h3 className="font-semibold text-surface-100 text-xs">Terminal & PTY Runtime</h3>
                  <p className="text-[11px] text-surface-500">Configure @xterm/xterm Canvas terminal buffer.</p>
                </div>

                {/* Terminal font size */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-surface-200">Terminal Font Size</div>
                    <div className="text-[11px] text-surface-500">Font size in pixels for xterm.js PTY buffer</div>
                  </div>
                  <input
                    type="number"
                    min={10}
                    max={24}
                    value={settings.terminalFontSize}
                    onChange={(e) => onUpdateSettings({ terminalFontSize: Number(e.target.value) })}
                    className="w-18 rounded border border-surface-750 bg-surface-950 px-2 py-1 text-xs text-right font-mono outline-none focus:border-brand-500"
                  />
                </div>

                {/* Terminal Cursor Blink */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-surface-200">Terminal Cursor Blinking</div>
                    <div className="text-[11px] text-surface-500">Smooth cursor blink animation in PTY console</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ terminalCursorBlink: !settings.terminalCursorBlink })}
                    className={`relative h-4.5 w-8 rounded-full transition-colors cursor-pointer ${
                      settings.terminalCursorBlink ? "bg-brand-600" : "bg-surface-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all ${
                        settings.terminalCursorBlink ? "left-4" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {activeTab === "sovereignty" && (
              <div className="space-y-4 animate-in fade-in-50 duration-150">
                <div className="border-b border-surface-800 pb-2">
                  <h3 className="font-semibold text-surface-100 text-xs">Afroid Sovereignty & Topology</h3>
                  <p className="text-[11px] text-surface-500">Direct service communication and sandboxing configuration.</p>
                </div>

                <div className="rounded-lg border border-surface-800 bg-surface-950 p-3 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-surface-400">Orchestrator Host:</span>
                    <span className="font-mono text-brand-400">{settings.apiBase || "http://localhost:8090"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-surface-400">Workspace CWD:</span>
                    <span className="font-mono text-emerald-400">/workspace (Subprocess Isolated)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-surface-400">DSL Runtime:</span>
                    <span className="font-mono text-surface-200">geezcodE Monarch Lexer v2.0</span>
                  </div>
                </div>

                <div className="text-[11px] text-surface-500 leading-relaxed">
                  All workspace file operations and autonomous code executions run strictly inside allowlisted workspace boundaries with non-destructive patch rollback capabilities.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-surface-800 bg-surface-950 px-5 py-2.5">
          {onResetDefaults ? (
            <button
              type="button"
              onClick={onResetDefaults}
              className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-300 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset to Defaults</span>
            </button>
          ) : <div />}
          
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-brand-600 hover:bg-brand-500 px-4 py-1.5 text-xs font-medium text-white shadow transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
