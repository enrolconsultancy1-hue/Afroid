"use client";

/**
 * IDEMenuBar — Canonical 8-Menu Top Bar for geezcodE IDE.
 *
 * Implements the standard Professional IDE menu hierarchy:
 *   File | Edit | Selection | View | Go | Run | Terminal | Help
 *
 * Features:
 * - Desktop-grade menu state machine (click-to-open, hover-to-switch, click-outside/Escape to dismiss)
 * - Monaco Editor action bridge (executes editor.getAction(...).run() and editor.trigger(...))
 * - Visual dividers between logical groupings
 * - Monospace keyboard shortcut badges
 * - Full accessibility and clean dark-mode aesthetics
 */

import React, { useEffect, useRef, useState } from "react";
import {
  FilePlus,
  FolderPlus,
  Save,
  Trash2,
  X,
  SlidersHorizontal,
  Files,
  Search,
  GitBranch,
  FileText,
  Bot,
  PanelLeft,
  PanelRight,
  Terminal as TerminalIcon,
  Code2,
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
  BookOpen,
  Info,
  Settings,
  Hash,
  AlertCircle,
  WrapText,
} from "lucide-react";

export type MenuId =
  | "file"
  | "edit"
  | "selection"
  | "view"
  | "go"
  | "run"
  | "terminal"
  | "help";

export interface IDEMenuBarProps {
  editorRef: React.MutableRefObject<any>;
  activeFilePath: string;
  hasOpenFiles: boolean;
  onNewFile: () => void;
  onNewFolder: () => void;
  onSaveFile: () => void;
  onSaveAs: () => void;
  onSaveAll?: () => void;
  autoSave?: boolean;
  onToggleAutoSave?: () => void;
  onDeleteFile: () => void;
  onCloseFile: () => void;
  onNewProject: () => void;
  onOpenQuickOpen: () => void;
  onOpenShortcuts: () => void;
  onOpenAbout: () => void;
  // View controls
  setActiveActivity: (act: any) => void;
  showLeftSidebar: boolean;
  setShowLeftSidebar: React.Dispatch<React.SetStateAction<boolean>>;
  showRightDock: boolean;
  setShowRightDock: React.Dispatch<React.SetStateAction<boolean>>;
  showBottomTerminal: boolean;
  setShowBottomTerminal: React.Dispatch<React.SetStateAction<boolean>>;
  editorMinimap: boolean;
  setEditorMinimap: React.Dispatch<React.SetStateAction<boolean>>;
  // Run controls
  onRunActiveFile: () => void;
  onRunTests: () => void;
  onRunSwarm: () => void;
  // Terminal controls
  setTerminalTab: (tab: any) => void;
  onClearTerminal: () => void;
}

export function IDEMenuBar({
  editorRef,
  activeFilePath,
  hasOpenFiles,
  onNewFile,
  onNewFolder,
  onSaveFile,
  onSaveAs,
  onSaveAll,
  autoSave,
  onToggleAutoSave,
  onDeleteFile,
  onCloseFile,
  onNewProject,
  onOpenQuickOpen,
  onOpenShortcuts,
  onOpenAbout,
  setActiveActivity,
  showLeftSidebar,
  setShowLeftSidebar,
  showRightDock,
  setShowRightDock,
  showBottomTerminal,
  setShowBottomTerminal,
  editorMinimap,
  setEditorMinimap,
  onRunActiveFile,
  onRunTests,
  onRunSwarm,
  setTerminalTab,
  onClearTerminal,
}: IDEMenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<MenuId | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const [wordWrap, setWordWrap] = useState(false);

  // Close menus on outside click or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Safe Monaco executor helper
  const execEditor = (callback: (editor: any) => void) => {
    if (editorRef.current) {
      editorRef.current.focus();
      try {
        callback(editorRef.current);
      } catch (err) {
        console.warn("[Monaco Bridge] Action error:", err);
      }
    }
    setActiveMenu(null);
  };

  const execEditorAction = (actionId: string) => {
    execEditor((editor) => {
      const action = editor.getAction(actionId);
      if (action) {
        action.run();
      } else {
        editor.trigger("menu", actionId, null);
      }
    });
  };

  const toggleWordWrap = () => {
    execEditor((editor) => {
      const next = !wordWrap;
      setWordWrap(next);
      editor.updateOptions({ wordWrap: next ? "on" : "off" });
    });
  };

  const handleMenuClick = (id: MenuId) => {
    setActiveMenu((prev) => (prev === id ? null : id));
  };

  const handleMenuHover = (id: MenuId) => {
    // Desktop behavior: Only switch on hover if a menu is ALREADY open
    if (activeMenu !== null && activeMenu !== id) {
      setActiveMenu(id);
    }
  };

  const renderItem = (
    label: string,
    shortcut: string | undefined,
    Icon: React.ComponentType<{ className?: string }>,
    onClick: () => void,
    disabled = false
  ) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          onClick();
          setActiveMenu(null);
        }
      }}
      className={`flex w-full items-center justify-between gap-4 rounded px-2.5 py-1.5 text-left text-xs transition-colors ${
        disabled
          ? "cursor-not-allowed text-surface-600 opacity-50"
          : "text-surface-300 hover:bg-surface-800 hover:text-surface-100"
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-surface-400" />
        <span>{label}</span>
      </div>
      {shortcut && (
        <span className="font-mono text-[10px] tracking-wider text-surface-500">
          {shortcut}
        </span>
      )}
    </button>
  );

  const renderDivider = () => (
    <div className="my-1 border-t border-surface-800/80" />
  );

  return (
    <div ref={menuBarRef} className="flex items-center gap-0.5 text-xs select-none">
      {/* ── FILE MENU ────────────────────────────────────────── */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick("file")}
          onMouseEnter={() => handleMenuHover("file")}
          className={`rounded px-2 py-1 transition-colors ${
            activeMenu === "file"
              ? "bg-surface-800 text-surface-100 font-medium"
              : "text-surface-400 hover:text-surface-200"
          }`}
        >
          File
        </button>
        {activeMenu === "file" && (
          <div className="absolute left-0 top-full mt-1 w-56 rounded-lg border border-surface-750 bg-surface-900 p-1 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-100">
            {renderItem("New File...", "Ctrl+N", FilePlus, onNewFile)}
            {renderItem("New Folder...", undefined, FolderPlus, onNewFolder)}
            {renderDivider()}
            {renderItem("Quick Open File...", "Ctrl+P", Files, onOpenQuickOpen)}
            {renderItem("New Project (Intake)...", "Ctrl+Shift+N", SlidersHorizontal, onNewProject)}
            {renderDivider()}
            {renderItem("Save File", "Ctrl+S", Save, onSaveFile, !hasOpenFiles)}
            {renderItem("Save As...", "Ctrl+Shift+S", Save, onSaveAs, !hasOpenFiles)}
            {onSaveAll && renderItem("Save All", "Ctrl+K S", Save, onSaveAll, !hasOpenFiles)}
            {onToggleAutoSave && (
              <>
                {renderDivider()}
                {renderItem(autoSave ? "✓ Auto Save (1.5s)" : "Auto Save", undefined, SlidersHorizontal, onToggleAutoSave)}
              </>
            )}
            {renderDivider()}
            {renderItem("Close File", "Ctrl+W", X, onCloseFile, !hasOpenFiles)}
            {renderItem("Delete File...", undefined, Trash2, onDeleteFile, !hasOpenFiles)}
            {renderDivider()}
            {renderItem("Preferences / Settings", "Ctrl+,", Settings, () => {
              setActiveActivity("settings");
              setShowLeftSidebar(true);
            })}
          </div>
        )}
      </div>

      {/* ── EDIT MENU ────────────────────────────────────────── */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick("edit")}
          onMouseEnter={() => handleMenuHover("edit")}
          className={`rounded px-2 py-1 transition-colors ${
            activeMenu === "edit"
              ? "bg-surface-800 text-surface-100 font-medium"
              : "text-surface-400 hover:text-surface-200"
          }`}
        >
          Edit
        </button>
        {activeMenu === "edit" && (
          <div className="absolute left-0 top-full mt-1 w-56 rounded-lg border border-surface-750 bg-surface-900 p-1 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-100">
            {renderItem("Undo", "Ctrl+Z", Undo2, () => execEditorAction("undo"), !hasOpenFiles)}
            {renderItem("Redo", "Ctrl+Y", Redo2, () => execEditorAction("redo"), !hasOpenFiles)}
            {renderDivider()}
            {renderItem("Cut", "Ctrl+X", Scissors, () => execEditorAction("editor.action.clipboardCutAction"), !hasOpenFiles)}
            {renderItem("Copy", "Ctrl+C", Copy, () => execEditorAction("editor.action.clipboardCopyAction"), !hasOpenFiles)}
            {renderItem("Paste", "Ctrl+V", Clipboard, () => execEditorAction("editor.action.clipboardPasteAction"), !hasOpenFiles)}
            {renderDivider()}
            {renderItem("Find", "Ctrl+F", SearchCode, () => execEditorAction("actions.find"), !hasOpenFiles)}
            {renderItem("Replace", "Ctrl+H", SearchCode, () => execEditorAction("editor.action.startFindReplaceAction"), !hasOpenFiles)}
            {renderItem("Find in Files", "Ctrl+Shift+F", Search, () => {
              setActiveActivity("search");
              setShowLeftSidebar(true);
            })}
            {renderDivider()}
            {renderItem("Toggle Line Comment", "Ctrl+/", MessageSquareCode, () => execEditorAction("editor.action.commentLine"), !hasOpenFiles)}
            {renderItem("Format Document", "Shift+Alt+F", Code2, () => execEditorAction("editor.action.formatDocument"), !hasOpenFiles)}
          </div>
        )}
      </div>

      {/* ── SELECTION MENU ───────────────────────────────────── */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick("selection")}
          onMouseEnter={() => handleMenuHover("selection")}
          className={`rounded px-2 py-1 transition-colors ${
            activeMenu === "selection"
              ? "bg-surface-800 text-surface-100 font-medium"
              : "text-surface-400 hover:text-surface-200"
          }`}
        >
          Selection
        </button>
        {activeMenu === "selection" && (
          <div className="absolute left-0 top-full mt-1 w-60 rounded-lg border border-surface-750 bg-surface-900 p-1 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-100">
            {renderItem("Select All", "Ctrl+A", CheckSquare, () => {
              execEditor((ed) => {
                const model = ed.getModel();
                if (model) ed.setSelection(model.getFullModelRange());
              });
            }, !hasOpenFiles)}
            {renderItem("Expand Selection", "Shift+Alt+→", CheckSquare, () => execEditorAction("editor.action.smartSelect.expand"), !hasOpenFiles)}
            {renderItem("Shrink Selection", "Shift+Alt+←", CheckSquare, () => execEditorAction("editor.action.smartSelect.shrink"), !hasOpenFiles)}
            {renderDivider()}
            {renderItem("Copy Line Up", "Shift+Alt+↑", MoveUp, () => execEditorAction("editor.action.copyLinesUpAction"), !hasOpenFiles)}
            {renderItem("Copy Line Down", "Shift+Alt+↓", MoveDown, () => execEditorAction("editor.action.copyLinesDownAction"), !hasOpenFiles)}
            {renderItem("Move Line Up", "Alt+↑", MoveUp, () => execEditorAction("editor.action.moveLinesUpAction"), !hasOpenFiles)}
            {renderItem("Move Line Down", "Alt+↓", MoveDown, () => execEditorAction("editor.action.moveLinesDownAction"), !hasOpenFiles)}
            {renderDivider()}
            {renderItem("Add Cursor Above", "Ctrl+Alt+↑", MoveUp, () => execEditorAction("editor.action.insertCursorAbove"), !hasOpenFiles)}
            {renderItem("Add Cursor Below", "Ctrl+Alt+↓", MoveDown, () => execEditorAction("editor.action.insertCursorBelow"), !hasOpenFiles)}
            {renderItem("Select All Occurrences", "Ctrl+Shift+L", CheckSquare, () => execEditorAction("editor.action.selectHighlights"), !hasOpenFiles)}
          </div>
        )}
      </div>

      {/* ── VIEW MENU ────────────────────────────────────────── */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick("view")}
          onMouseEnter={() => handleMenuHover("view")}
          className={`rounded px-2 py-1 transition-colors ${
            activeMenu === "view"
              ? "bg-surface-800 text-surface-100 font-medium"
              : "text-surface-400 hover:text-surface-200"
          }`}
        >
          View
        </button>
        {activeMenu === "view" && (
          <div className="absolute left-0 top-full mt-1 w-64 rounded-lg border border-surface-750 bg-surface-900 p-1 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-100">
            {renderItem("Command Palette...", "Ctrl+Shift+P", Code2, () => {
              execEditorAction("editor.action.quickCommand");
            })}
            {renderDivider()}
            {renderItem("Explorer", "Ctrl+Shift+E", Files, () => {
              setActiveActivity("explorer");
              setShowLeftSidebar(true);
            })}
            {renderItem("Search in Files", "Ctrl+Shift+F", Search, () => {
              setActiveActivity("search");
              setShowLeftSidebar(true);
            })}
            {renderItem("Source Control (Git)", "Ctrl+Shift+G", GitBranch, () => {
              setActiveActivity("git");
              setShowLeftSidebar(true);
            })}
            {renderItem("Planning Mode", "Ctrl+Shift+D", FileText, () => {
              setActiveActivity("plan");
              setShowLeftSidebar(true);
            })}
            {renderItem("AI Swarm Agent", "Ctrl+Shift+A", Bot, () => {
              setActiveActivity("swarm");
              setShowLeftSidebar(true);
            })}
            {renderDivider()}
            {renderItem("Toggle Primary Sidebar", "Ctrl+B", PanelLeft, () => setShowLeftSidebar((prev) => !prev))}
            {renderItem("Toggle AI Assistant Dock", "Ctrl+Alt+B", PanelRight, () => setShowRightDock((prev) => !prev))}
            {renderItem("Toggle Terminal Panel", "Ctrl+J", TerminalIcon, () => setShowBottomTerminal((prev) => !prev))}
            {renderDivider()}
            {renderItem(wordWrap ? "Disable Word Wrap" : "Enable Word Wrap", "Alt+Z", WrapText, toggleWordWrap, !hasOpenFiles)}
            {renderItem(editorMinimap ? "Hide Minimap" : "Show Minimap", undefined, PanelRight, () => setEditorMinimap((prev) => !prev))}
          </div>
        )}
      </div>

      {/* ── GO MENU ──────────────────────────────────────────── */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick("go")}
          onMouseEnter={() => handleMenuHover("go")}
          className={`rounded px-2 py-1 transition-colors ${
            activeMenu === "go"
              ? "bg-surface-800 text-surface-100 font-medium"
              : "text-surface-400 hover:text-surface-200"
          }`}
        >
          Go
        </button>
        {activeMenu === "go" && (
          <div className="absolute left-0 top-full mt-1 w-56 rounded-lg border border-surface-750 bg-surface-900 p-1 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-100">
            {renderItem("Go to File...", "Ctrl+P", Files, onOpenQuickOpen)}
            {renderItem("Go to Line/Column...", "Ctrl+G", Hash, () => execEditorAction("editor.action.gotoLine"), !hasOpenFiles)}
            {renderItem("Go to Symbol...", "Ctrl+Shift+O", Code2, () => execEditorAction("editor.action.quickOutline"), !hasOpenFiles)}
            {renderDivider()}
            {renderItem("Go to Definition", "F12", SearchCode, () => execEditorAction("editor.action.revealDefinition"), !hasOpenFiles)}
            {renderItem("Go to References", "Shift+F12", SearchCode, () => execEditorAction("editor.action.referenceSearch.trigger"), !hasOpenFiles)}
            {renderDivider()}
            {renderItem("Next Problem", "F8", AlertCircle, () => execEditorAction("editor.action.marker.next"), !hasOpenFiles)}
            {renderItem("Previous Problem", "Shift+F8", AlertCircle, () => execEditorAction("editor.action.marker.prev"), !hasOpenFiles)}
          </div>
        )}
      </div>

      {/* ── RUN MENU ─────────────────────────────────────────── */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick("run")}
          onMouseEnter={() => handleMenuHover("run")}
          className={`rounded px-2 py-1 transition-colors ${
            activeMenu === "run"
              ? "bg-surface-800 text-surface-100 font-medium"
              : "text-surface-400 hover:text-surface-200"
          }`}
        >
          Run
        </button>
        {activeMenu === "run" && (
          <div className="absolute left-0 top-full mt-1 w-64 rounded-lg border border-surface-750 bg-surface-900 p-1 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-100">
            {renderItem("Run Active File", "F5", Play, onRunActiveFile, !hasOpenFiles)}
            {renderItem("Run Test Suite (pytest)", "Ctrl+F5", Play, onRunTests)}
            {renderDivider()}
            {renderItem("Run Autonomous Swarm", "Ctrl+Shift+B", Bot, onRunSwarm)}
            {renderItem("Open Sandboxed Live Preview", "Ctrl+Shift+V", Globe, () => {
              setTerminalTab("preview");
              setShowBottomTerminal(true);
            })}
            {renderDivider()}
            {renderItem("Restart Workspace Sync", undefined, RotateCcw, () => {
              setActiveActivity("explorer");
            })}
          </div>
        )}
      </div>

      {/* ── TERMINAL MENU ────────────────────────────────────── */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick("terminal")}
          onMouseEnter={() => handleMenuHover("terminal")}
          className={`rounded px-2 py-1 transition-colors ${
            activeMenu === "terminal"
              ? "bg-surface-800 text-surface-100 font-medium"
              : "text-surface-400 hover:text-surface-200"
          }`}
        >
          Terminal
        </button>
        {activeMenu === "terminal" && (
          <div className="absolute left-0 top-full mt-1 w-60 rounded-lg border border-surface-750 bg-surface-900 p-1 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-100">
            {renderItem("New / Focus Terminal", "Ctrl+`", TerminalIcon, () => {
              setTerminalTab("terminal");
              setShowBottomTerminal(true);
            })}
            {renderItem("Clear Terminal", "Ctrl+K", Trash2, onClearTerminal)}
            {renderItem("Toggle Terminal Panel", "Ctrl+J", PanelLeft, () => setShowBottomTerminal((prev) => !prev))}
            {renderDivider()}
            {renderItem("Switch to Live Preview", undefined, Globe, () => {
              setTerminalTab("preview");
              setShowBottomTerminal(true);
            })}
            {renderItem("Switch to Problems", undefined, AlertCircle, () => {
              setTerminalTab("problems");
              setShowBottomTerminal(true);
            })}
            {renderItem("Switch to Swarm Activity", undefined, Bot, () => {
              setTerminalTab("swarm");
              setShowBottomTerminal(true);
            })}
          </div>
        )}
      </div>

      {/* ── HELP MENU ────────────────────────────────────────── */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick("help")}
          onMouseEnter={() => handleMenuHover("help")}
          className={`rounded px-2 py-1 transition-colors ${
            activeMenu === "help"
              ? "bg-surface-800 text-surface-100 font-medium"
              : "text-surface-400 hover:text-surface-200"
          }`}
        >
          Help
        </button>
        {activeMenu === "help" && (
          <div className="absolute left-0 top-full mt-1 w-60 rounded-lg border border-surface-750 bg-surface-900 p-1 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-100">
            {renderItem("Keyboard Shortcuts", "Ctrl+K Ctrl+S", Keyboard, onOpenShortcuts)}
            {renderItem("geezcodE DSL Reference", undefined, BookOpen, () => {
              // Open domain.geez in workspace if present
              onOpenQuickOpen();
            })}
            {renderDivider()}
            {renderItem("System Architecture & Docs", undefined, HelpCircle, () => {
              window.open("https://github.com/enrolconsultancy1-hue/Afroid", "_blank");
            })}
            {renderDivider()}
            {renderItem("About geezcodE", undefined, Info, onOpenAbout)}
          </div>
        )}
      </div>
    </div>
  );
}
