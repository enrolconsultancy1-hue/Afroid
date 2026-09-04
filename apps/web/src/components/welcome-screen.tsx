"use client";

/**
 * WelcomeScreen — Desktop-Grade Splash & Quickstart Hub for geezcodE IDE.
 *
 * Rendered when no editor tabs are open or when opened via Help > Welcome & Overview.
 * Features:
 * - Direct quickstart actions (New File, Quick Open, Architect Intake, Terminal)
 * - Sovereign Blueprint & Sample File Launcher (domain.geez, main.py, services)
 * - Swarm & Planning Mode workflows
 * - Keyboard shortcut discovery cards
 */

import React from "react";
import {
  FilePlus,
  FolderPlus,
  Search,
  Terminal as TerminalIcon,
  Bot,
  FileText,
  Keyboard,
  BookOpen,
  Sparkles,
  Zap,
  Code2,
  Globe,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
} from "lucide-react";
import { GeezCodeLogo } from "@/components/geezcode-logo";

interface WelcomeScreenProps {
  projectName?: string;
  onNewFile: () => void;
  onOpenQuickOpen: () => void;
  onOpenIntake: () => void;
  onOpenTerminal: () => void;
  onOpenShortcuts: () => void;
  onOpenFileByPath: (path: string) => void;
  onOpenPlanning: () => void;
  onOpenSwarm: () => void;
  onOpenPreview: () => void;
}

export function WelcomeScreen({
  projectName = "Sovereign Agritech",
  onNewFile,
  onOpenQuickOpen,
  onOpenIntake,
  onOpenTerminal,
  onOpenShortcuts,
  onOpenFileByPath,
  onOpenPlanning,
  onOpenSwarm,
  onOpenPreview,
}: WelcomeScreenProps) {
  return (
    <div className="relative z-10 flex h-full w-full flex-col overflow-y-auto bg-surface-950 p-8 text-surface-200 select-none">
      {/* Background Watermark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden opacity-[0.03]"
      >
        <GeezCodeLogo size={420} showWordmark={true} showTagline={false} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-4xl space-y-8 my-auto">
        {/* Header Hero */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-800/80 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <GeezCodeLogo size={32} showWordmark={true} />
              <span className="rounded-full border border-brand-500/30 bg-brand-500/10 px-2.5 py-0.5 text-[11px] font-mono text-brand-400 font-medium">
                v2.0 Professional
              </span>
            </div>
            <p className="text-xs text-surface-400">
              Sovereign Autonomous Startup Factory & Professional Web IDE
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-surface-500 font-mono">
              Active Project:
            </span>
            <span className="rounded-md border border-surface-750 bg-surface-900 px-2.5 py-1 text-xs font-mono text-brand-300">
              {projectName}
            </span>
          </div>
        </div>

        {/* 2-Column Grid of Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Start Section */}
          <div className="rounded-xl border border-surface-800 bg-surface-900/60 p-5 space-y-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-surface-100 font-semibold text-xs uppercase tracking-wider">
              <Zap className="h-4 w-4 text-brand-400" />
              <span>Start</span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={onNewFile}
                className="group flex w-full items-center justify-between rounded-lg border border-surface-800/80 bg-surface-950/80 hover:bg-surface-800 hover:border-brand-500/40 p-3 text-left transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-brand-500/10 p-2 text-brand-400 group-hover:scale-105 transition-transform">
                    <FilePlus className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-xs text-surface-100 group-hover:text-brand-300 transition-colors">
                      New File...
                    </div>
                    <div className="text-[11px] text-surface-500">
                      Create a blank source or DSL file in workspace
                    </div>
                  </div>
                </div>
                <kbd className="font-mono text-[10px] text-surface-500 border border-surface-750 rounded px-1.5 py-0.5 bg-surface-900">
                  Ctrl+N
                </kbd>
              </button>

              <button
                type="button"
                onClick={onOpenQuickOpen}
                className="group flex w-full items-center justify-between rounded-lg border border-surface-800/80 bg-surface-950/80 hover:bg-surface-800 hover:border-brand-500/40 p-3 text-left transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-blue-500/10 p-2 text-blue-400 group-hover:scale-105 transition-transform">
                    <Search className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-xs text-surface-100 group-hover:text-blue-300 transition-colors">
                      Quick Open File...
                    </div>
                    <div className="text-[11px] text-surface-500">
                      Fuzzy search and switch between project files
                    </div>
                  </div>
                </div>
                <kbd className="font-mono text-[10px] text-surface-500 border border-surface-750 rounded px-1.5 py-0.5 bg-surface-900">
                  Ctrl+P
                </kbd>
              </button>

              <button
                type="button"
                onClick={onOpenIntake}
                className="group flex w-full items-center justify-between rounded-lg border border-surface-800/80 bg-surface-950/80 hover:bg-surface-800 hover:border-brand-500/40 p-3 text-left transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-purple-500/10 p-2 text-purple-400 group-hover:scale-105 transition-transform">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-xs text-surface-100 group-hover:text-purple-300 transition-colors">
                      Architect Intake Wizard
                    </div>
                    <div className="text-[11px] text-surface-500">
                      Synthesize new sovereign blueprint from business idea
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-surface-500 group-hover:text-purple-300 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>

          {/* Quick Start & Sovereign Files */}
          <div className="rounded-xl border border-surface-800 bg-surface-900/60 p-5 space-y-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-surface-100 font-semibold text-xs uppercase tracking-wider">
              <Code2 className="h-4 w-4 text-brand-400" />
              <span>Sovereign Blueprints & DSL</span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onOpenFileByPath("/domain.geez")}
                className="group flex w-full items-center justify-between rounded-lg border border-surface-800/80 bg-surface-950/80 hover:bg-surface-800 hover:border-brand-500/40 p-3 text-left transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-amber-500/10 p-2 text-amber-400 group-hover:scale-105 transition-transform">
                    <Code2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-xs text-surface-100 group-hover:text-amber-300 transition-colors font-mono">
                      domain.geez
                    </div>
                    <div className="text-[11px] text-surface-500">
                      geezcodE domain-specific language architecture schema
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-amber-400/80 border border-amber-500/20 px-1.5 py-0.5 rounded bg-amber-500/5">
                  DSL
                </span>
              </button>

              <button
                type="button"
                onClick={onOpenPlanning}
                className="group flex w-full items-center justify-between rounded-lg border border-surface-800/80 bg-surface-950/80 hover:bg-surface-800 hover:border-brand-500/40 p-3 text-left transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-emerald-500/10 p-2 text-emerald-400 group-hover:scale-105 transition-transform">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-xs text-surface-100 group-hover:text-emerald-300 transition-colors">
                      Planning Mode Dock
                    </div>
                    <div className="text-[11px] text-surface-500">
                      Inspect milestones, acceptance criteria & build tasks
                    </div>
                  </div>
                </div>
                <kbd className="font-mono text-[10px] text-surface-500 border border-surface-750 rounded px-1.5 py-0.5 bg-surface-900">
                  Ctrl+Shift+D
                </kbd>
              </button>

              <button
                type="button"
                onClick={onOpenSwarm}
                className="group flex w-full items-center justify-between rounded-lg border border-surface-800/80 bg-surface-950/80 hover:bg-surface-800 hover:border-brand-500/40 p-3 text-left transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-brand-500/10 p-2 text-brand-400 group-hover:scale-105 transition-transform">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-xs text-surface-100 group-hover:text-brand-300 transition-colors">
                      Autonomous Swarm Agent
                    </div>
                    <div className="text-[11px] text-surface-500">
                      Trigger multi-agent build with WebSocket patch streaming
                    </div>
                  </div>
                </div>
                <kbd className="font-mono text-[10px] text-surface-500 border border-surface-750 rounded px-1.5 py-0.5 bg-surface-900">
                  Ctrl+Shift+A
                </kbd>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-surface-800/80 pt-4 text-xs text-surface-400">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onOpenShortcuts}
              className="flex items-center gap-1.5 hover:text-brand-300 transition-colors cursor-pointer"
            >
              <Keyboard className="h-3.5 w-3.5 text-brand-400" />
              <span>Keyboard Shortcuts (Ctrl+K Ctrl+S)</span>
            </button>

            <button
              type="button"
              onClick={onOpenTerminal}
              className="flex items-center gap-1.5 hover:text-emerald-300 transition-colors cursor-pointer"
            >
              <TerminalIcon className="h-3.5 w-3.5 text-emerald-400" />
              <span>Canvas Terminal (Ctrl+`)</span>
            </button>

            <button
              type="button"
              onClick={onOpenPreview}
              className="flex items-center gap-1.5 hover:text-blue-300 transition-colors cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5 text-blue-400" />
              <span>Live Preview (Ctrl+Shift+V)</span>
            </button>
          </div>

          <div className="text-[11px] text-surface-500 font-mono">
            geezcodE • Afroid Autonomous Sovereign Stack
          </div>
        </div>
      </div>
    </div>
  );
}
