"use client";

/**
 * XTerminalPanel — Antigravity-grade embedded terminal using @xterm/xterm.
 *
 * Features:
 * - Full ANSI colour support via xterm.js canvas renderer
 * - FitAddon for responsive auto-resize
 * - Communicates with /v1/workspace/terminal (allowlisted commands only)
 * - Command history (up/down arrow navigation)
 * - Ctrl+C / Ctrl+L keybindings
 * - Lazy-loaded (no SSR, no window errors)
 */

import React, { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8090";

function authHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("afroid_access_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface XTerminalPanelProps {
  /** Extra class applied to the outer wrapper div */
  className?: string;
}

export default function XTerminalPanel({ className = "" }: XTerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<import("@xterm/xterm").Terminal | null>(null);
  const fitRef = useRef<import("@xterm/addon-fit").FitAddon | null>(null);
  const inputBufferRef = useRef<string>("");
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef<number>(-1);
  const [ready, setReady] = useState(false);

  /* ── Boot xterm (client-only) ─────────────────────────────── */
  useEffect(() => {
    let disposed = false;

    async function boot() {
      const [{ Terminal }, { FitAddon }, { WebLinksAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
        import("@xterm/addon-web-links"),
      ]);

      if (disposed || !containerRef.current) return;

      const term = new Terminal({
        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
        fontSize: 12,
        lineHeight: 1.4,
        theme: {
          background: "#121214",
          foreground: "#e4e4e7",
          cursor: "#a1a1aa",
          cursorAccent: "#121214",
          selectionBackground: "#3f3f4680",
          black: "#18181b",
          red: "#f87171",
          green: "#4ade80",
          yellow: "#facc15",
          blue: "#60a5fa",
          magenta: "#c084fc",
          cyan: "#38bdf8",
          white: "#f4f4f5",
          brightBlack: "#71717a",
          brightRed: "#fca5a5",
          brightGreen: "#86efac",
          brightYellow: "#fde047",
          brightBlue: "#93c5fd",
          brightMagenta: "#e879f9",
          brightCyan: "#7dd3fc",
          brightWhite: "#ffffff",
        },
        cursorBlink: true,
        cursorStyle: "block",
        scrollback: 5000,
        allowTransparency: true,
      });

      const fit = new FitAddon();
      const links = new WebLinksAddon();
      term.loadAddon(fit);
      term.loadAddon(links);
      term.open(containerRef.current);
      fit.fit();

      termRef.current = term;
      fitRef.current = fit;

      // Clean Antigravity-style native shell initialization
      printPrompt(term);

      // Input handler
      term.onData((data) => {
        const code = data.charCodeAt(0);

        if (data === "\r") {
          // Enter
          const cmd = inputBufferRef.current.trim();
          term.write("\r\n");
          inputBufferRef.current = "";
          historyIdxRef.current = -1;
          if (cmd) {
            historyRef.current.unshift(cmd);
            if (historyRef.current.length > 100) historyRef.current.pop();
            executeCommand(term, cmd);
          } else {
            printPrompt(term);
          }
        } else if (data === "\x7f") {
          // Backspace
          if (inputBufferRef.current.length > 0) {
            inputBufferRef.current = inputBufferRef.current.slice(0, -1);
            term.write("\x1b[D \x1b[D");
          }
        } else if (data === "\x03") {
          // Ctrl+C
          term.write("^C\r\n");
          inputBufferRef.current = "";
          historyIdxRef.current = -1;
          printPrompt(term);
        } else if (data === "\x0c") {
          // Ctrl+L clear
          term.clear();
          printPrompt(term);
        } else if (data === "\x1b[A") {
          // Arrow Up — history
          const hist = historyRef.current;
          if (hist.length === 0) return;
          historyIdxRef.current = Math.min(historyIdxRef.current + 1, hist.length - 1);
          const entry = hist[historyIdxRef.current];
          clearInputLine(term, inputBufferRef.current.length);
          inputBufferRef.current = entry;
          term.write(entry);
        } else if (data === "\x1b[B") {
          // Arrow Down — history
          const hist = historyRef.current;
          if (historyIdxRef.current <= 0) {
            clearInputLine(term, inputBufferRef.current.length);
            inputBufferRef.current = "";
            historyIdxRef.current = -1;
            return;
          }
          historyIdxRef.current -= 1;
          const entry = hist[historyIdxRef.current];
          clearInputLine(term, inputBufferRef.current.length);
          inputBufferRef.current = entry;
          term.write(entry);
        } else if (code >= 32) {
          // Printable character
          inputBufferRef.current += data;
          term.write(data);
        }
      });

      setReady(true);
    }

    boot();

    return () => {
      disposed = true;
      termRef.current?.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Resize observer ─────────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      try {
        fitRef.current?.fit();
      } catch {
        // ignore
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [ready]);

  /* ── Helpers ─────────────────────────────────────────────── */
  function printPrompt(term: import("@xterm/xterm").Terminal) {
    term.write("\x1b[38;5;244mo\x1b[0m \x1b[1;37mPS C:\\Users\\HP\\Projects\\Afroid\x1b[0m\x1b[1;37m>\x1b[0m ");
  }

  function clearInputLine(term: import("@xterm/xterm").Terminal, len: number) {
    if (len > 0) term.write(`\x1b[${len}D\x1b[K`);
  }

  const executeCommand = useCallback(
    async (term: import("@xterm/xterm").Terminal, cmd: string) => {
      if (cmd === "clear") {
        term.clear();
        printPrompt(term);
        return;
      }
      if (cmd === "help") {
        term.writeln("\x1b[1;36mAvailable commands:\x1b[0m");
        term.writeln("  \x1b[33mgit\x1b[0m status | log | diff | add | commit | push | pull");
        term.writeln("  \x1b[33mls\x1b[0m  pwd  cat  mkdir  touch  rm  mv  cp  grep  find");
        term.writeln("  \x1b[33mpython\x1b[0m  pytest  npm  npx  uv  ruff  node  yarn");
        term.writeln("  \x1b[33mclear\x1b[0m  help");
        term.writeln("");
        printPrompt(term);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/v1/workspace/terminal`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ command: cmd }),
        });

        if (!res.ok) {
          term.writeln(`\x1b[31m[error] HTTP ${res.status}: ${res.statusText}\x1b[0m`);
          printPrompt(term);
          return;
        }

        const json = await res.json();
        const { stdout, stderr, exit_code } = json.data ?? {};

        if (stdout?.trim()) {
          // Write with ANSI passthrough
          term.write(stdout.replace(/\n/g, "\r\n"));
          if (!stdout.endsWith("\n")) term.write("\r\n");
        }
        if (stderr?.trim()) {
          term.write(`\x1b[31m${stderr.replace(/\n/g, "\r\n")}\x1b[0m`);
          if (!stderr.endsWith("\n")) term.write("\r\n");
        }
        if (exit_code !== 0 && exit_code != null) {
          term.writeln(`\x1b[2m[exit ${exit_code}]\x1b[0m`);
        }
      } catch (err) {
        term.writeln(
          `\x1b[31m[terminal] workspace service unreachable — ${(err as Error).message}\x1b[0m`
        );
      }

      printPrompt(term);
    },
    []
  );

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className={`relative h-full w-full bg-[#121214] p-2 font-mono overflow-hidden ${className}`}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#121214] z-10">
          <span className="text-xs text-surface-500 animate-pulse">Initializing terminal…</span>
        </div>
      )}
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ opacity: ready ? 1 : 0, transition: "opacity 0.2s" }}
      />
    </div>
  );
}
