"use client";

/**
 * IDEMenuBar — Canonical 8-Menu Desktop Top Bar for geezcodE IDE.
 *
 * Modeled after modern professional IDE specifications (Antigravity / VS Code):
 *   File | Edit | Selection | View | Go | Run | Terminal | Help
 *
 * Features:
 * - High-density desktop design without leading icon clutter
 * - Proportional right-aligned shortcut typography (non-blocky)
 * - Nested cascading submenus (Preferences >, Open Recent >, etc.)
 * - Checked state indicators (Auto Save, Minimap, Word Wrap)
 * - Monaco Editor action bridge (executes editor.getAction and editor.trigger)
 * - Flush anchor alignment with backdrop-blur dark theme
 */

import React, { useEffect, useRef, useState } from "react";
import { ChevronRight, Check } from "lucide-react";

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
  onOpenCommandPalette?: () => void;
  onOpenShortcuts: () => void;
  onOpenAbout: () => void;
  onOpenSettings?: () => void;
  onOpenWelcome?: () => void;
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
  onOpenCommandPalette,
  onOpenShortcuts,
  onOpenAbout,
  onOpenSettings,
  onOpenWelcome,
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
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const [wordWrap, setWordWrap] = useState(false);

  // Close menus on outside click or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
        setActiveSubmenu(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveMenu(null);
        setActiveSubmenu(null);
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
    setActiveSubmenu(null);
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
    if (activeMenu === id) {
      setActiveMenu(null);
      setActiveSubmenu(null);
    } else {
      setActiveMenu(id);
      setActiveSubmenu(null);
    }
  };

  const handleMenuHover = (id: MenuId) => {
    if (activeMenu !== null && activeMenu !== id) {
      setActiveMenu(id);
      setActiveSubmenu(null);
    }
  };

  const renderItem = ({
    label,
    shortcut,
    onClick,
    disabled = false,
    checked = undefined,
    hasSubmenu = false,
    submenuId = undefined,
  }: {
    label: string;
    shortcut?: string;
    onClick?: () => void;
    disabled?: boolean;
    checked?: boolean;
    hasSubmenu?: boolean;
    submenuId?: string;
  }) => {
    const isSubmenuOpen = submenuId && activeSubmenu === submenuId;

    return (
      <div
        className="relative"
        onMouseEnter={() => {
          if (submenuId) {
            setActiveSubmenu(submenuId);
          } else {
            setActiveSubmenu(null);
          }
        }}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled && onClick) {
              onClick();
              setActiveMenu(null);
              setActiveSubmenu(null);
            }
          }}
          className={`flex w-full items-center justify-between px-3 py-1 text-left text-[12.5px] transition-colors ${
            disabled
              ? "cursor-not-allowed text-surface-600 opacity-50"
              : isSubmenuOpen
              ? "bg-surface-800 text-surface-100"
              : "text-surface-300 hover:bg-surface-800 hover:text-surface-100"
          }`}
        >
          <div className="flex items-center gap-2">
            {checked !== undefined && (
              <span className="w-3.5 flex items-center justify-center">
                {checked ? <Check className="h-3.5 w-3.5 text-primary-400" /> : null}
              </span>
            )}
            <span>{label}</span>
          </div>
          <div className="flex items-center gap-2">
            {shortcut && (
              <span className="ml-auto pl-6 font-sans text-[11px] font-normal tracking-tight text-surface-500">
                {shortcut}
              </span>
            )}
            {hasSubmenu && (
              <ChevronRight className="h-3.5 w-3.5 text-surface-400 shrink-0 ml-1" />
            )}
          </div>
        </button>
      </div>
    );
  };

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
          className={`rounded-[3px] px-2.5 py-0.5 text-[13px] transition-colors ${
            activeMenu === "file"
              ? "bg-surface-800 text-surface-100 font-medium"
              : "text-surface-400 hover:text-surface-200 hover:bg-surface-800/50"
          }`}
        >
          File
        </button>
        {activeMenu === "file" && (
          <div className="absolute left-0 top-full mt-0.5 min-w-[245px] rounded-md border border-surface-750 bg-surface-900/95 backdrop-blur-md py-1 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-75">
            {renderItem({ label: "New Text File", shortcut: "Ctrl+N", onClick: onNewFile })}
            {renderItem({ label: "New File...", shortcut: "Ctrl+Alt+Windows+N", onClick: onNewFile })}
            {renderItem({ label: "New Window", shortcut: "Ctrl+Shift+N", onClick: onNewProject })}
            {renderDivider()}
            {renderItem({ label: "Open File...", shortcut: "Ctrl+O", onClick: onOpenQuickOpen })}
            {renderItem({ label: "Open Folder...", shortcut: "Ctrl+K Ctrl+O", onClick: onOpenQuickOpen })}
            {renderItem({ label: "Open Workspace from File...", onClick: onOpenQuickOpen })}
            
            {/* Open Recent Submenu */}
            <div
              className="relative"
              onMouseEnter={() => setActiveSubmenu("recent")}
            >
              {renderItem({
                label: "Open Recent",
                hasSubmenu: true,
                submenuId: "recent",
              })}
              {activeSubmenu === "recent" && (
                <div className="absolute left-full top-0 -ml-1 min-w-[200px] rounded-md border border-surface-750 bg-surface-900/98 backdrop-blur-md py-1 shadow-2xl z-50">
                  {renderItem({ label: "Quick Open...", shortcut: "Ctrl+P", onClick: onOpenQuickOpen })}
                  {renderItem({ label: "Re-open Closed Tab", shortcut: "Ctrl+Shift+T", onClick: onOpenQuickOpen })}
                  {renderDivider()}
                  {renderItem({ label: "Clear Recently Opened", onClick: () => {} })}
                </div>
              )}
            </div>

            {renderDivider()}
            {renderItem({ label: "Add Folder to Workspace...", onClick: onNewFolder })}
            {renderItem({ label: "Save Workspace As...", onClick: onSaveAs })}
            {renderItem({ label: "Duplicate Workspace", onClick: onNewProject })}
            {renderDivider()}
            {renderItem({ label: "Save", shortcut: "Ctrl+S", onClick: onSaveFile, disabled: !hasOpenFiles })}
            {renderItem({ label: "Save As...", shortcut: "Ctrl+Shift+S", onClick: onSaveAs, disabled: !hasOpenFiles })}
            {onSaveAll && renderItem({ label: "Save All", shortcut: "Ctrl+K S", onClick: onSaveAll, disabled: !hasOpenFiles })}
            {renderDivider()}
            {onToggleAutoSave && (
              renderItem({
                label: "Auto Save",
                checked: !!autoSave,
                onClick: onToggleAutoSave,
              })
            )}

            {/* Preferences Submenu */}
            <div
              className="relative"
              onMouseEnter={() => setActiveSubmenu("preferences")}
            >
              {renderItem({
                label: "Preferences",
                hasSubmenu: true,
                submenuId: "preferences",
              })}
              {activeSubmenu === "preferences" && (
                <div className="absolute left-full top-0 -ml-1 min-w-[220px] rounded-md border border-surface-750 bg-surface-900/98 backdrop-blur-md py-1 shadow-2xl z-50">
                  {renderItem({
                    label: "Settings",
                    shortcut: "Ctrl+,",
                    onClick: () => {
                      if (onOpenSettings) {
                        onOpenSettings();
                      } else {
                        setActiveActivity("settings");
                        setShowLeftSidebar(true);
                      }
                    },
                  })}
                  {renderItem({
                    label: "Keyboard Shortcuts",
                    shortcut: "Ctrl+K Ctrl+S",
                    onClick: onOpenShortcuts,
                  })}
                  {renderDivider()}
                  {onOpenWelcome && (
                    renderItem({ label: "Welcome Screen", onClick: onOpenWelcome })
                  )}
                  {renderItem({ label: "About geezcodE", onClick: onOpenAbout })}
                </div>
              )}
            </div>

            {renderDivider()}
            {renderItem({ label: "Revert File", disabled: !hasOpenFiles, onClick: onSaveFile })}
            {renderItem({ label: "Close Editor", shortcut: "Ctrl+W", onClick: onCloseFile, disabled: !hasOpenFiles })}
            {renderItem({ label: "Close Window", shortcut: "Alt+F4", onClick: onCloseFile })}
          </div>
        )}
      </div>

      {/* ── EDIT MENU ────────────────────────────────────────── */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick("edit")}
          onMouseEnter={() => handleMenuHover("edit")}
          className={`rounded-[3px] px-2.5 py-0.5 text-[13px] transition-colors ${
            activeMenu === "edit"
              ? "bg-surface-800 text-surface-100 font-medium"
              : "text-surface-400 hover:text-surface-200 hover:bg-surface-800/50"
          }`}
        >
          Edit
        </button>
        {activeMenu === "edit" && (
          <div className="absolute left-0 top-full mt-0.5 min-w-[230px] rounded-md border border-surface-750 bg-surface-900/95 backdrop-blur-md py-1 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-75">
            {renderItem({ label: "Undo", shortcut: "Ctrl+Z", onClick: () => execEditorAction("undo"), disabled: !hasOpenFiles })}
            {renderItem({ label: "Redo", shortcut: "Ctrl+Y", onClick: () => execEditorAction("redo"), disabled: !hasOpenFiles })}
            {renderDivider()}
            {renderItem({ label: "Cut", shortcut: "Ctrl+X", onClick: () => execEditorAction("editor.action.clipboardCutAction"), disabled: !hasOpenFiles })}
            {renderItem({ label: "Copy", shortcut: "Ctrl+C", onClick: () => execEditorAction("editor.action.clipboardCopyAction"), disabled: !hasOpenFiles })}
            {renderItem({ label: "Paste", shortcut: "Ctrl+V", onClick: () => execEditorAction("editor.action.clipboardPasteAction"), disabled: !hasOpenFiles })}
            {renderDivider()}
            {renderItem({ label: "Find", shortcut: "Ctrl+F", onClick: () => execEditorAction("actions.find"), disabled: !hasOpenFiles })}
            {renderItem({ label: "Replace", shortcut: "Ctrl+H", onClick: () => execEditorAction("editor.action.startFindReplaceAction"), disabled: !hasOpenFiles })}
            {renderItem({
              label: "Find in Files",
              shortcut: "Ctrl+Shift+F",
              onClick: () => {
                setActiveActivity("search");
                setShowLeftSidebar(true);
              },
            })}
            {renderDivider()}
            {renderItem({ label: "Toggle Line Comment", shortcut: "Ctrl+/", onClick: () => execEditorAction("editor.action.commentLine"), disabled: !hasOpenFiles })}
            {renderItem({ label: "Format Document", shortcut: "Shift+Alt+F", onClick: () => execEditorAction("editor.action.formatDocument"), disabled: !hasOpenFiles })}
          </div>
        )}
      </div>

      {/* ── SELECTION MENU ───────────────────────────────────── */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick("selection")}
          onMouseEnter={() => handleMenuHover("selection")}
          className={`rounded-[3px] px-2.5 py-0.5 text-[13px] transition-colors ${
            activeMenu === "selection"
              ? "bg-surface-800 text-surface-100 font-medium"
              : "text-surface-400 hover:text-surface-200 hover:bg-surface-800/50"
          }`}
        >
          Selection
        </button>
        {activeMenu === "selection" && (
          <div className="absolute left-0 top-full mt-0.5 min-w-[245px] rounded-md border border-surface-750 bg-surface-900/95 backdrop-blur-md py-1 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-75">
            {renderItem({
              label: "Select All",
              shortcut: "Ctrl+A",
              onClick: () => {
                execEditor((ed) => {
                  const model = ed.getModel();
                  if (model) ed.setSelection(model.getFullModelRange());
                });
              },
              disabled: !hasOpenFiles,
            })}
            {renderItem({ label: "Expand Selection", shortcut: "Shift+Alt+→", onClick: () => execEditorAction("editor.action.smartSelect.expand"), disabled: !hasOpenFiles })}
            {renderItem({ label: "Shrink Selection", shortcut: "Shift+Alt+←", onClick: () => execEditorAction("editor.action.smartSelect.shrink"), disabled: !hasOpenFiles })}
            {renderDivider()}
            {renderItem({ label: "Copy Line Up", shortcut: "Shift+Alt+↑", onClick: () => execEditorAction("editor.action.copyLinesUpAction"), disabled: !hasOpenFiles })}
            {renderItem({ label: "Copy Line Down", shortcut: "Shift+Alt+↓", onClick: () => execEditorAction("editor.action.copyLinesDownAction"), disabled: !hasOpenFiles })}
            {renderItem({ label: "Move Line Up", shortcut: "Alt+↑", onClick: () => execEditorAction("editor.action.moveLinesUpAction"), disabled: !hasOpenFiles })}
            {renderItem({ label: "Move Line Down", shortcut: "Alt+↓", onClick: () => execEditorAction("editor.action.moveLinesDownAction"), disabled: !hasOpenFiles })}
            {renderDivider()}
            {renderItem({ label: "Add Cursor Above", shortcut: "Ctrl+Alt+↑", onClick: () => execEditorAction("editor.action.insertCursorAbove"), disabled: !hasOpenFiles })}
            {renderItem({ label: "Add Cursor Below", shortcut: "Ctrl+Alt+↓", onClick: () => execEditorAction("editor.action.insertCursorBelow"), disabled: !hasOpenFiles })}
            {renderItem({ label: "Select All Occurrences", shortcut: "Ctrl+Shift+L", onClick: () => execEditorAction("editor.action.selectHighlights"), disabled: !hasOpenFiles })}
          </div>
        )}
      </div>

      {/* ── VIEW MENU ────────────────────────────────────────── */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick("view")}
          onMouseEnter={() => handleMenuHover("view")}
          className={`rounded-[3px] px-2.5 py-0.5 text-[13px] transition-colors ${
            activeMenu === "view"
              ? "bg-surface-800 text-surface-100 font-medium"
              : "text-surface-400 hover:text-surface-200 hover:bg-surface-800/50"
          }`}
        >
          View
        </button>
        {activeMenu === "view" && (
          <div className="absolute left-0 top-full mt-0.5 min-w-[245px] rounded-md border border-surface-750 bg-surface-900/95 backdrop-blur-md py-1 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-75">
            {renderItem({
              label: "Command Palette...",
              shortcut: "Ctrl+Shift+P",
              onClick: () => {
                if (onOpenCommandPalette) {
                  onOpenCommandPalette();
                } else {
                  execEditorAction("editor.action.quickCommand");
                }
              },
            })}
            {renderDivider()}
            {renderItem({
              label: "Explorer",
              shortcut: "Ctrl+Shift+E",
              onClick: () => {
                setActiveActivity("explorer");
                setShowLeftSidebar(true);
              },
            })}
            {renderItem({
              label: "Search in Files",
              shortcut: "Ctrl+Shift+F",
              onClick: () => {
                setActiveActivity("search");
                setShowLeftSidebar(true);
              },
            })}
            {renderItem({
              label: "Source Control",
              shortcut: "Ctrl+Shift+G",
              onClick: () => {
                setActiveActivity("git");
                setShowLeftSidebar(true);
              },
            })}
            {renderItem({
              label: "Planning Mode",
              shortcut: "Ctrl+Shift+D",
              onClick: () => {
                setActiveActivity("plan");
                setShowLeftSidebar(true);
              },
            })}
            {renderItem({
              label: "AI Swarm Agent",
              shortcut: "Ctrl+Shift+A",
              onClick: () => {
                setActiveActivity("swarm");
                setShowLeftSidebar(true);
              },
            })}
            {renderDivider()}
            {renderItem({
              label: "Toggle Primary Sidebar",
              shortcut: "Ctrl+B",
              onClick: () => setShowLeftSidebar((prev) => !prev),
            })}
            {renderItem({
              label: "Toggle AI Assistant Dock",
              shortcut: "Ctrl+Alt+B",
              onClick: () => setShowRightDock((prev) => !prev),
            })}
            {renderItem({
              label: "Toggle Terminal Panel",
              shortcut: "Ctrl+J",
              onClick: () => setShowBottomTerminal((prev) => !prev),
            })}
            {renderDivider()}
            {renderItem({
              label: "Word Wrap",
              shortcut: "Alt+Z",
              checked: wordWrap,
              onClick: toggleWordWrap,
              disabled: !hasOpenFiles,
            })}
            {renderItem({
              label: "Minimap",
              checked: editorMinimap,
              onClick: () => setEditorMinimap((prev) => !prev),
            })}
          </div>
        )}
      </div>

      {/* ── GO MENU ──────────────────────────────────────────── */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick("go")}
          onMouseEnter={() => handleMenuHover("go")}
          className={`rounded-[3px] px-2.5 py-0.5 text-[13px] transition-colors ${
            activeMenu === "go"
              ? "bg-surface-800 text-surface-100 font-medium"
              : "text-surface-400 hover:text-surface-200 hover:bg-surface-800/50"
          }`}
        >
          Go
        </button>
        {activeMenu === "go" && (
          <div className="absolute left-0 top-full mt-0.5 min-w-[230px] rounded-md border border-surface-750 bg-surface-900/95 backdrop-blur-md py-1 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-75">
            {renderItem({ label: "Go to File...", shortcut: "Ctrl+P", onClick: onOpenQuickOpen })}
            {renderItem({ label: "Go to Line/Column...", shortcut: "Ctrl+G", onClick: () => execEditorAction("editor.action.gotoLine"), disabled: !hasOpenFiles })}
            {renderItem({ label: "Go to Symbol...", shortcut: "Ctrl+Shift+O", onClick: () => execEditorAction("editor.action.quickOutline"), disabled: !hasOpenFiles })}
            {renderDivider()}
            {renderItem({ label: "Go to Definition", shortcut: "F12", onClick: () => execEditorAction("editor.action.revealDefinition"), disabled: !hasOpenFiles })}
            {renderItem({ label: "Go to References", shortcut: "Shift+F12", onClick: () => execEditorAction("editor.action.referenceSearch.trigger"), disabled: !hasOpenFiles })}
            {renderDivider()}
            {renderItem({ label: "Next Problem", shortcut: "F8", onClick: () => execEditorAction("editor.action.marker.next"), disabled: !hasOpenFiles })}
            {renderItem({ label: "Previous Problem", shortcut: "Shift+F8", onClick: () => execEditorAction("editor.action.marker.prev"), disabled: !hasOpenFiles })}
          </div>
        )}
      </div>

      {/* ── RUN MENU ─────────────────────────────────────────── */}
      <div className="relative">
        <button
          type="button"
          onClick={() => handleMenuClick("run")}
          onMouseEnter={() => handleMenuHover("run")}
          className={`rounded-[3px] px-2.5 py-0.5 text-[13px] transition-colors ${
            activeMenu === "run"
              ? "bg-surface-800 text-surface-100 font-medium"
              : "text-surface-400 hover:text-surface-200 hover:bg-surface-800/50"
          }`}
        >
          Run
        </button>
        {activeMenu === "run" && (
          <div className="absolute left-0 top-full mt-0.5 min-w-[245px] rounded-md border border-surface-750 bg-surface-900/95 backdrop-blur-md py-1 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-75">
            {renderItem({ label: "Run Active File", shortcut: "F5", onClick: onRunActiveFile, disabled: !hasOpenFiles })}
            {renderItem({ label: "Run Test Suite (pytest)", shortcut: "Ctrl+F5", onClick: onRunTests })}
            {renderDivider()}
            {renderItem({ label: "Run Autonomous Swarm", shortcut: "Ctrl+Shift+B", onClick: onRunSwarm })}
            {renderItem({
              label: "Open Sandboxed Live Preview",
              shortcut: "Ctrl+Shift+V",
              onClick: () => {
                setTerminalTab("preview");
                setShowBottomTerminal(true);
              },
            })}
            {renderDivider()}
            {renderItem({
              label: "Restart Workspace Sync",
              onClick: () => {
                setActiveActivity("explorer");
              },
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
          className={`rounded-[3px] px-2.5 py-0.5 text-[13px] transition-colors ${
            activeMenu === "terminal"
              ? "bg-surface-800 text-surface-100 font-medium"
              : "text-surface-400 hover:text-surface-200 hover:bg-surface-800/50"
          }`}
        >
          Terminal
        </button>
        {activeMenu === "terminal" && (
          <div className="absolute left-0 top-full mt-0.5 min-w-[230px] rounded-md border border-surface-750 bg-surface-900/95 backdrop-blur-md py-1 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-75">
            {renderItem({
              label: "New Terminal",
              shortcut: "Ctrl+`",
              onClick: () => {
                setTerminalTab("terminal");
                setShowBottomTerminal(true);
              },
            })}
            {renderItem({ label: "Clear Terminal", shortcut: "Ctrl+K", onClick: onClearTerminal })}
            {renderItem({
              label: "Toggle Terminal Panel",
              shortcut: "Ctrl+J",
              onClick: () => setShowBottomTerminal((prev) => !prev),
            })}
            {renderDivider()}
            {renderItem({
              label: "Switch to Live Preview",
              onClick: () => {
                setTerminalTab("preview");
                setShowBottomTerminal(true);
              },
            })}
            {renderItem({
              label: "Switch to Problems",
              onClick: () => {
                setTerminalTab("problems");
                setShowBottomTerminal(true);
              },
            })}
            {renderItem({
              label: "Switch to Swarm Activity",
              onClick: () => {
                setTerminalTab("swarm");
                setShowBottomTerminal(true);
              },
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
          className={`rounded-[3px] px-2.5 py-0.5 text-[13px] transition-colors ${
            activeMenu === "help"
              ? "bg-surface-800 text-surface-100 font-medium"
              : "text-surface-400 hover:text-surface-200 hover:bg-surface-800/50"
          }`}
        >
          Help
        </button>
        {activeMenu === "help" && (
          <div className="absolute left-0 top-full mt-0.5 min-w-[230px] rounded-md border border-surface-750 bg-surface-900/95 backdrop-blur-md py-1 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-75">
            {onOpenWelcome && renderItem({ label: "Welcome & Overview", onClick: onOpenWelcome })}
            {renderItem({ label: "Keyboard Shortcuts", shortcut: "Ctrl+K Ctrl+S", onClick: onOpenShortcuts })}
            {renderItem({ label: "geezcodE DSL Reference", onClick: onOpenQuickOpen })}
            {renderDivider()}
            {renderItem({
              label: "Documentation & Architecture",
              onClick: () => {
                window.open("https://github.com/enrolconsultancy1-hue/Afroid", "_blank");
              },
            })}
            {renderDivider()}
            {renderItem({ label: "About geezcodE", onClick: onOpenAbout })}
          </div>
        )}
      </div>
    </div>
  );
}

