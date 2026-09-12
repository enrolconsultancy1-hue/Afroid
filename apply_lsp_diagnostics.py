#!/usr/bin/env python3
"""
P6.3 — LSP-style diagnostics (Ruff static analysis) for geezcodE.

Run from the repo root:  python apply_lsp_diagnostics.py

Idempotent-ish: it checks whether each change is already present and skips it,
so re-running is safe. It edits three files:
  - services/orchestrator/pyproject.toml          (+ ruff dependency)
  - services/orchestrator/app/routes/builder.py   (+ /diagnose endpoint)
  - apps/web/src/app/dashboard/ide/page.tsx        (+ live diagnostics wiring)
Prints a summary of what changed. Makes a .bak of each edited file.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def edit(rel: str, replacements: list[tuple[str, str]]) -> None:
    p = ROOT / rel
    if not p.exists():
        print(f"  !! MISSING: {rel} — are you in the repo root?")
        sys.exit(1)
    src = p.read_text(encoding="utf-8")
    original = src
    for i, (old, new) in enumerate(replacements, 1):
        if new in src and old not in src:
            print(f"  = [{rel}] change {i} already applied — skipping")
            continue
        count = src.count(old)
        if count == 0:
            print(f"  !! [{rel}] change {i}: anchor NOT FOUND — aborting (no files written)")
            print(f"     anchor head: {old.splitlines()[0][:80]!r}")
            sys.exit(2)
        if count > 1:
            print(f"  !! [{rel}] change {i}: anchor found {count}x (not unique) — aborting")
            sys.exit(2)
        src = src.replace(old, new)
        print(f"  + [{rel}] change {i} applied")
    if src != original:
        p.with_suffix(p.suffix + ".bak").write_text(original, encoding="utf-8")
        p.write_text(src, encoding="utf-8")
        print(f"  -> wrote {rel} (backup: {rel}.bak)")
    else:
        print(f"  = {rel}: no changes needed")


# ─────────────────────────────────────────────────────────────────────────────
# 1) Backend: add ruff dependency
# ─────────────────────────────────────────────────────────────────────────────
edit(
    "services/orchestrator/pyproject.toml",
    [
        (
            'dependencies = [\n'
            '    "afroid-shared",\n'
            '    "langgraph>=0.2.0",\n'
            '    "langchain-core>=0.3.0",\n'
            '    "langchain-google-genai>=2.0.0",\n'
            ']',
            'dependencies = [\n'
            '    "afroid-shared",\n'
            '    "langgraph>=0.2.0",\n'
            '    "langchain-core>=0.3.0",\n'
            '    "langchain-google-genai>=2.0.0",\n'
            '    "ruff>=0.6.0",\n'
            ']',
        ),
    ],
)

# ─────────────────────────────────────────────────────────────────────────────
# 2) Backend: /diagnose endpoint (Ruff) in builder.py
# ─────────────────────────────────────────────────────────────────────────────
DIAGNOSE_BLOCK = '''    except Exception as exc:  # noqa: BLE001 — completions must never surface an error
        logger.info("code_complete_failed", error=str(exc))
        return {"data": {"completion": ""}}


# Ruff runs pure static analysis (parse + lint) — it NEVER executes the file — so it is
# safe to run against unsaved editor buffers. It ships as a single fast binary that uv
# installs into the venv (resolved on PATH as "ruff").
# Only genuine parse/syntax failures are surfaced as hard errors; lint findings are
# surfaced as warnings (Ruff itself tags every finding "error", which we deliberately
# ignore for editor UX).
_RUFF_ERROR_CODES = {"E999", "invalid-syntax", "syntax-error"}


def _ruff_severity(code: str | None) -> str:
    if not code or code in _RUFF_ERROR_CODES:
        return "error"
    return "warning"


async def _run_ruff(content: str, filename: str) -> list[dict[str, Any]]:
    """Lint Python source with Ruff over stdin, returning structured diagnostics.

    Fails soft: a missing binary, timeout, or unparsable output yields an empty list
    so the editor never surfaces a diagnostics error.
    """
    ruff_bin = shutil.which("ruff")
    if not ruff_bin:
        return []
    safe_name = os.path.basename(filename or "buffer.py") or "buffer.py"
    try:
        proc = await asyncio.create_subprocess_exec(
            ruff_bin,
            "check",
            "--output-format=json",
            "--stdin-filename",
            safe_name,
            "-",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, _stderr = await asyncio.wait_for(
                proc.communicate(input=content.encode("utf-8")), timeout=12.0
            )
        except asyncio.TimeoutError:
            try:
                proc.kill()
            except ProcessLookupError:
                pass
            return []
        raw = stdout.decode("utf-8", "replace").strip()
        if not raw:
            return []
        items = json.loads(raw)
    except (OSError, ValueError) as exc:  # noqa: BLE001
        logger.info("ruff_diagnose_failed", error=str(exc))
        return []

    diagnostics: list[dict[str, Any]] = []
    for it in items if isinstance(items, list) else []:
        loc = it.get("location") or {}
        end = it.get("end_location") or {}
        code = it.get("code")
        start_row = int(loc.get("row") or 1)
        start_col = int(loc.get("column") or 1)
        end_row = int(end.get("row") or start_row)
        end_col = int(end.get("column") or (start_col + 1))
        diagnostics.append(
            {
                "line": start_row,
                "column": start_col,
                "endLine": end_row,
                "endColumn": end_col,
                "code": code or "syntax",
                "message": str(it.get("message") or "").strip() or "Lint issue",
                "severity": _ruff_severity(code),
            }
        )
    return diagnostics


@router.post("/diagnose", response_model=dict[str, Any])
async def diagnose(
    body: dict[str, Any],
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Static-analysis diagnostics for an editor buffer (a real linter, not just AST).

    Runs Ruff for Python; other languages return no diagnostics. Ruff only parses and
    lints — it never runs the code — so it is safe on unsaved content.
    """
    content = str(body.get("content", ""))
    path = str(body.get("path", "")) or "buffer.py"
    language = (str(body.get("language", "")) or "").lower()
    is_python = language == "python" or path.endswith(".py")
    if not is_python or not content.strip():
        return {"data": {"diagnostics": []}}
    if len(content) > 400_000:  # guard against pathological buffers
        return {"data": {"diagnostics": []}}
    diagnostics = await _run_ruff(content, path)
    return {"data": {"diagnostics": diagnostics}}


def _get_session(request: Request) -> AsyncSession:'''

edit(
    "services/orchestrator/app/routes/builder.py",
    [
        # 2a — add `import shutil`
        (
            "import asyncio\nimport json\nimport os\nimport time\nimport uuid\n",
            "import asyncio\nimport json\nimport os\nimport shutil\nimport time\nimport uuid\n",
        ),
        # 2b — insert the diagnose endpoint before _get_session
        (
            '    except Exception as exc:  # noqa: BLE001 — completions must never surface an error\n'
            '        logger.info("code_complete_failed", error=str(exc))\n'
            '        return {"data": {"completion": ""}}\n'
            '\n\n'
            'def _get_session(request: Request) -> AsyncSession:',
            DIAGNOSE_BLOCK,
        ),
    ],
)

# ─────────────────────────────────────────────────────────────────────────────
# 3) Frontend: live diagnostics wiring in page.tsx
# ─────────────────────────────────────────────────────────────────────────────
DIAG_FNS = '''      return "";
    }
  };
  // ── LSP-style diagnostics ──────────────────────────────────────────────────
  // Runs a real static-analysis linter (Ruff for Python) server-side and paints the
  // results as Monaco squiggles + Problems-panel entries. Ruff only parses and lints
  // — it never executes the buffer — so it is safe to run on unsaved content.
  const fetchDiagnostics = async (
    path: string,
    content: string,
    language: string,
  ): Promise<
    Array<{ line: number; column: number; endLine: number; endColumn: number; code: string; message: string; severity: "error" | "warning" }>
  > => {
    try {
      const res = await fetch(`${API_BASE}/v1/builder/diagnose`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ path, content, language }),
      });
      if (!res.ok) return [];
      return (await res.json())?.data?.diagnostics || [];
    } catch {
      return [];
    }
  };

  // Lint a buffer and reconcile both the Monaco markers and the Problems list.
  const runDiagnostics = useCallback(async (path: string, content: string) => {
    if (!path) return;
    const language = getLanguage(path);
    const diags = await fetchDiagnostics(path, content, language);
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    // Only paint markers when this buffer is the one shown in the editor.
    if (monaco && editor && path === activeFilePathRef.current) {
      const model = editor.getModel();
      if (model) {
        const markers = diags.map((d) => ({
          startLineNumber: d.line,
          startColumn: d.column,
          endLineNumber: d.endLine,
          endColumn: Math.max(d.endColumn, d.column + 1),
          message: `${d.message}${d.code && d.code !== "syntax" ? ` (${d.code})` : ""}`,
          severity: d.severity === "error" ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
          source: "ruff",
        }));
        monaco.editor.setModelMarkers(model, "ruff", markers);
      }
    }
    // Reconcile the Problems panel: drop this file's prior ruff entries, add fresh ones.
    setProblems((prev) => {
      const kept = prev.filter((p) => !(p.source === "ruff" && p.file === path));
      const added: ProblemItem[] = diags.map((d) => ({
        file: path,
        line: d.line,
        message: `${d.message}${d.code && d.code !== "syntax" ? ` (${d.code})` : ""}`,
        severity: d.severity,
        source: "ruff",
      }));
      return [...kept, ...added];
    });
  }, []);

  // Debounced trigger for live diagnostics as the user types or switches files.
  const scheduleDiagnostics = useCallback((path: string, content: string) => {
    if (diagTimerRef.current) clearTimeout(diagTimerRef.current);
    diagTimerRef.current = setTimeout(() => {
      void runDiagnostics(path, content);
    }, 900);
  }, [runDiagnostics]);

  // Live-lint the active buffer on open and (debounced) as it changes.
  useEffect(() => {
    if (activeFilePath) scheduleDiagnostics(activeFilePath, editorContent);
  }, [activeFilePath, editorContent, scheduleDiagnostics]);
  const persistProviders = (list: CustomProvider[]) => {'''

edit(
    "apps/web/src/app/dashboard/ide/page.tsx",
    [
        # 3a — diag timer ref
        (
            '  const activeFilePathRef = useRef<string>("");\n\n  const [projectRoot',
            '  const activeFilePathRef = useRef<string>("");\n  const diagTimerRef = useRef<any>(null);\n\n  const [projectRoot',
        ),
        # 3b — diagnostics functions + effect, spliced in after fetchCompletion
        (
            '      return "";\n'
            '    }\n'
            '  };\n'
            '  const persistProviders = (list: CustomProvider[]) => {',
            DIAG_FNS,
        ),
        # 3c — lint immediately after a successful save
        (
            '        // Auto-maintain the codebase index (no-op unless indexing is active).\n'
            '        scheduleReindex(path, contentToWrite);\n'
            '        return;',
            '        // Auto-maintain the codebase index (no-op unless indexing is active).\n'
            '        scheduleReindex(path, contentToWrite);\n'
            '        // Refresh diagnostics (real linter) for the just-saved buffer.\n'
            '        void runDiagnostics(path, contentToWrite);\n'
            '        return;',
        ),
    ],
)

print("\nDONE. Review the diffs, then rebuild/redeploy the orchestrator + web.")
