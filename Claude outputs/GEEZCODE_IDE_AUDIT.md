# geezcodE IDE — Deep End-to-End Codebase Audit

**Project:** AfroID Sovereign Platform — geezcodE IDE domain
**Repo:** `C:\Users\HP\Projects\Afroid`
**Date:** 2026-09-09
**Method:** Line-by-line read of the live source on disk (not the stale staged copy). Read-only — no code was changed.
**Benchmark question:** Is geezcodE SOLID & FIT as an IDE in the class of Antigravity, Cursor, and Kiro?

---

## 0. Scope of What Was Read

Every file below was read in full from your machine:

| Layer | Files audited |
|-------|---------------|
| IDE frontend | `apps/web/src/app/dashboard/ide/page.tsx` (201 KB / ~4,300 lines), `ide-menu-bar.tsx` (32 KB), `settings-modal.tsx` (21 KB), `welcome-screen.tsx`, `command-palette.tsx`, `quick-open-modal.tsx`, `ide-dialogs.tsx`, `xterm-panel.tsx`, `sandbox-preview.tsx`, `geezcode-logo.tsx`, `lib/geezcode-monaco.ts`, `hooks/use-agent-stream.ts`, `lib/api-client.ts`, `app/intake/page.tsx` |
| Workspace backend | `services/workspace/app/{main,config}.py`, `routes/{fs,git,terminal,projects}.py`, `tests/{test_tools,test_projects}.py` |
| Orchestrator backend | `services/orchestrator/app/{main}.py`, `agents/{parallel_builder,graph,prompts}.py`, `routes/{builder,orchestrate,ws}.py`, `schemas/state.py`, `services/{model_registry,job_store}.py`, `tests/test_parallel_builder.py` |
| CodeGen backend | `services/codegen/app/{main}.py`, `engine/{generator,templates}.py`, `routes/codegen.py`, `schemas/codegen.py` |
| Extension | `apps/extension/{manifest.json,content.js,popup.js}` |

---

## 1. Executive Verdict

geezcodE is a **genuinely substantial, well-architected advanced prototype (alpha)** — not a mock-up, and not a finished product. It has two very different halves, and the honest grade depends on which half you measure.

| Dimension | Grade | One-line reason |
|-----------|-------|-----------------|
| **IDE shell / editor surface** | **A−** | Real Monaco + Diff + xterm + resizable VS Code-clone with ~40 working commands. Credibly "Antigravity-level" on the surface. |
| **Workspace backend (fs/git/terminal)** | **A−** | Per-user isolation, path-traversal defense, command allowlist, secret-stripped env, surgical edit tool with verification. Better than most hobby IDEs. |
| **AI generation pipeline (idea → app)** | **B−** | A real LLM blueprint→codegen→AST pipeline exists and works, but is bounded by a model-config defect and split across two backends. |
| **In-editor AI assistant (the Cursor/Kiro core)** | **D** | The in-IDE chat is a *scripted guide*, not an AI pair-programmer. This is the biggest gap vs the benchmark tools. |
| **"Autonomous parallel swarm" claim** | **C** | Real generation, but sequential — the "parallel sub-agents" are cosmetic status labels; the streaming pipeline is under-wired to the UI. |

**Bottom line:** The foundation is solid and real. What stands between geezcodE and Cursor/Antigravity/Kiro is not the shell (that's there) — it is the *in-editor agentic AI loop* and a handful of "demo seams" (scripted assistant, a mocked guided-build path, fictional default model IDs, streaming wired to the wrong route).

---

## 2. What Is Genuinely Real (Strengths)

### 2.1 The IDE shell is a real, deep VS Code clone
`ide/page.tsx` is not a facade. Verified real:

- **Monaco editor** (`@monaco-editor/react`, dynamic, `ssr:false`) plus a **Monaco DiffEditor** for patch review (side-by-side / inline toggle).
- **xterm.js terminal** (`xterm-panel.tsx`): real `@xterm/xterm` + `FitAddon` + `WebLinksAddon`, full ANSI theme, command history (up/down), Ctrl+C / Ctrl+L, `ResizeObserver` auto-fit, POSTs commands to the workspace service.
- **Resizable panels** — genuine mouse-drag handlers for left sidebar / right dock / bottom terminal with min/max clamps (`page.tsx` lines 440-473).
- **Full shell**: 8-menu menu bar (32 KB component), 10-item activity bar (Explorer, Search, Git, Planning, Architect, Intake, Swarm, Certify, Incubate, KYC), multi-tab bottom panel (terminal/preview/problems/output), command palette (Ctrl+Shift+P), quick-open fuzzy finder (Ctrl+P), settings modal, welcome screen, shortcuts/about dialogs.
- **~40 real command actions** wired to Monaco APIs (`ideCommands`, lines 1784-1849): undo/redo, find, find+replace, format document, comment line, select-all, expand/shrink selection, copy/move line, go-to-line, **go-to-definition, go-to-references, next-problem**, etc. These call actual `editor.getAction(...)` — not stubs.
- **Real keyboard layer** (lines 1210-1280): Ctrl+S, the Ctrl+K→S chord, Ctrl+B/J/`` ` ``, Ctrl+Shift+E/F/G/D/A/V, Alt+Z — mapped correctly.

### 2.2 Disk-backed file operations are real
Every file action hits the workspace service and persists to disk (with a local fallback if the service is down): open/read (`/v1/workspace/file`), save, save-all, save-as, delete, new file/folder, tree fetch (`/tree`), backend grep search (`/search`, with an in-tree fallback), git status + commit (`/git/*`), terminal exec, "run active file", "run pytest".

### 2.3 The workspace backend is security-conscious and correct
This is the strongest backend in the audit:

- **Per-user isolation** (`config.py`): each user operates in `WORKSPACE_ROOT/workspaces/<user_id>`, explicitly to keep fs/git/terminal away from the repo root `.env`.
- **Path-traversal defense** (`fs.py::_safe_resolve`) — every path is resolved and rejected if it escapes the root (HTTP 400).
- **Terminal hardening** (`terminal.py`): `shell=False` (no `&&`, `;`, `|`, `$()`), a strict executable **allowlist**, an **environment allowlist that strips secrets** (`GOOGLE_API_KEY`, `DATABASE_URL`, JWT, etc. never reach the subprocess), 60 s timeout.
- **Antigravity-style agent tools**: `tools/replace-lines` does a *surgical* range edit and returns **HTTP 409 if the target content doesn't match** (optimistic-concurrency safety), and `tools/view-file` returns numbered line ranges. These mirror how Cursor/Antigravity agents edit files — and they have real passing tests (`test_tools.py`).

### 2.4 A real AI generation pipeline exists end-to-end
`parallel_builder.py` (40 KB) is real, not theater:

- `ZeroQuestionIntakeEngine.generate_blueprint()` calls a real Gemini model via the model registry with `ARCHITECT_SYSTEM_PROMPT`, parses JSON, and **falls back to a rule-based offline blueprint** if the API fails.
- `ParallelBuilderCore.execute_parallel_build()` iterates milestones, calls the LLM per milestone (`CODEGEN_SYSTEM_PROMPT`) to generate source files, **writes them to disk**, and runs **genuine `ast.parse()` syntax validation** on the Python output. Scaffold fallback fills in if the LLM returns nothing.

### 2.5 A sophisticated streaming pipeline also exists (`/v1/orchestrate`)
`graph.py` + `orchestrate.py` is a second, more advanced pipeline: a compiled **LangGraph** state machine (analyze → architect → codegen → review), dispatched as a **background asyncio task**, with **real per-file WebSocket streaming** (`code_chunk`, `phase_change`, `review_result`, `generation_complete`), **LLM retry with exponential backoff + 90 s timeout**, an approval gate, a job store, and an artifacts endpoint. The Reviewer agent (`REVIEWER_SYSTEM_PROMPT`) is wired in here.

### 2.6 Real supporting pieces
- **geezcodE DSL** (`geezcode-monaco.ts`): a real Monaco language registration — Monarch tokenizer (keywords, types, HTTP verbs, annotations, comments), bracket/comment config, and snippet completion for `domain`/`entity`/`flow`/`api`/`rule`.
- **CodeGen service**: Jinja2 archetype templates (FastAPI/Dockerfile/compose) + Gemini fallback + AST/JSON validation.
- **Model registry**: dynamic catalog, **live Gemini model discovery** via the `google.genai` SDK, per-agent routing, custom OpenAI-compatible endpoint registration, offline mock for CI.
- **WebSocket** (`ws.py`): connection manager grouped by session, **JWT-authenticated** handshake (closes 4401 if unauthorized), broadcast, dead-connection cleanup.
- **Chrome extension**: real MV3 (manifest, content script, service worker) with heuristic grant-form field detection + autofill + a floating copilot button.
- **Tests are real and meaningful** (round-trip fs, 409 target-mismatch, builder session assertions).

---

## 3. What Is Cosmetic, Mocked, or Broken (Weaknesses)

These are the "demo seams" — the specific places where the product looks more finished than it is.

### 3.1 The in-IDE assistant is scripted, not AI — **highest-impact gap**
`handleSendDockMessage` (`page.tsx` lines 1614-1654): the right-dock "geez-agent" chat returns **canned strings**. It deliberately **refuses** any question about architecture/internals/"how does it work" with:
> *"i am sorry … am not trained to answer that. is there anything i can help you with related to operation guidance?"*

There is **no LLM behind the in-editor chat**, no inline edit, no multi-file agentic edit, no codebase-aware Q&A, no tab completion. This is the single defining capability of Cursor/Antigravity/Kiro, and it is absent in the editor itself.

### 3.2 The "Approve & Build" telemetry the user watches is frontend theater
`handleApproveAndBuild` (lines 1473-1557) calls the real backend (`/v1/builder/start`) — but on the guided path and on any failure it calls `continueBuildExecution()` (lines 1403-1432), which is **fully hardcoded**: `setTimeout` delays plus fabricated logs:
> *"AST syntax validation passed with 0 syntax errors", "Nigeria Startup Act compliance verified (100% score)", "python scripts/smoke_test.py -> 11/11 PASSED"*

None of that is measured — it is printed. `tokensUsed` starts at `1240` and is incremented by hardcoded amounts. Some initial state is pre-seeded (two tasks pre-checked, two changed files hardcoded).

### 3.3 Two build backends — the better one isn't the one the UI calls
- The IDE's build button → `/v1/builder/start` → `execute_parallel_build`, which runs **synchronously in the request** and does **not** wire its `on_event` to the WebSocket manager. So the real backend build does not stream to the IDE.
- The advanced streaming pipeline lives at `/v1/orchestrate` and **does** stream properly — but the IDE UI never calls it.

Result: the live "swarm streaming" you see during Approve & Build comes from the frontend mock, while the genuinely-streaming backend sits unused by the UI.

### 3.4 Default model IDs are fictional → silent degradation
`model_registry.py` seeds and defaults to **`gemini-3.6-flash`** (also `gemini-3.7-flash`, `gemini-3.1-pro-preview`). These model IDs do not exist on the real Gemini API. Unless a valid `model_id` is supplied or `/models/sync` repopulates the catalog, live LLM calls will fail and the pipeline **silently falls back to offline templates/scaffolds**. In practice, the "autonomous full-app generation" quality is gated on this config being fixed and a real API key being present.

### 3.5 "Parallel sub-agent swarm" is sequential
`execute_parallel_build` is a `for milestone in milestones:` loop — no `asyncio.gather`, no concurrency. The five "sub-agents" (`SubAgentStatus`) are **status objects for the UI**, not independent workers. The Deployer prompt is defined but never used.

### 3.6 No real language intelligence beyond Monaco defaults
Go-to-definition/references work only via Monaco's built-in TS worker for TS/JS. There is **no LSP, no type-checking, no diagnostics/hover, no cross-file symbol graph**, and the geezcodE DSL has **no semantic layer** (highlighting + snippets only). No real debugger, no extensions marketplace, no multi-root workspaces, no live collaborative editing (despite the blueprint mentioning it).

### 3.7 Smaller items
- **Extension autofill uses hardcoded demo data** (`DEFAULT_STARTUP_DATA` = "AfroHealth Technologies / Amina Diallo"), not the user's real profile.
- **Job store is in-memory** (single-instance only) — correctly flagged in its own docstring as needing Redis/Firestore for production.
- Frontend imports `isDirty` on a `FileNode` in one revert handler, but the interface models dirtiness via `savedContent` comparison — a minor type inconsistency.

---

## 4. Feature Parity vs Antigravity / Cursor / Kiro

| Capability | Cursor / Antigravity / Kiro | geezcodE | Notes |
|-----------|------------------------------|----------|-------|
| Monaco/code editor, tabs, tree | ✅ | ✅ | Real, full-featured |
| Diff review of AI changes | ✅ | ✅ | Real Monaco DiffEditor + approve/reject |
| Integrated terminal | ✅ | ✅ | Real xterm.js → allowlisted backend shell |
| Command palette / quick open | ✅ | ✅ | Real, ~40 commands |
| Git source control | ✅ | 🟡 | Status + commit only (no push/pull/branch/stage-hunk UI) |
| **Inline AI edit / tab completion** | ✅ | ❌ | Absent — the core of these tools |
| **Codebase-aware AI chat** | ✅ | ❌ | In-IDE chat is scripted; refuses real questions |
| **Agentic multi-file edit loop** | ✅ | 🟡 | Backend tools exist (replace-lines/view-file) but no in-editor agent drives them |
| Idea → full project scaffold | 🟡 (Kiro specs) | ✅ | Real strength — blueprint→codegen→disk→AST |
| Live generation streaming | ✅ | 🟡 | Built (`/orchestrate`) but not wired to the build button |
| Language intelligence (LSP) | ✅ | 🟡 | Monaco TS defaults only; DSL has none |
| Debugger | ✅ | ❌ | Not present |
| Extensions/plugins | ✅ | ❌ | Not present |

**Interpretation:** geezcodE matches the benchmark tools on the *editor shell* and actually *exceeds a plain IDE* on "idea → scaffolded app." It does **not yet** match them on the thing that made them famous: the in-editor AI pair-programmer (inline edits, agentic multi-file changes, codebase chat, completions).

---

## 5. Is It "SOLID & FIT"?

**Solid — yes, structurally.** The architecture is clean and real: a proper monorepo, a security-hardened workspace service, an authenticated WebSocket, a LangGraph pipeline with retries/timeouts, real tests, graceful offline fallbacks so nothing hard-crashes. This is a credible engineering foundation, not a hollow demo.

**Fit as a peer of Antigravity/Cursor/Kiro — not yet, but reachable.** The shell is there; the differentiating AI loop is not. Three changes would move it from "advanced prototype" to "credible peer," in priority order:

1. **Make the in-IDE assistant a real LLM agent** — replace the scripted `geez-agent` with a codebase-aware chat that can read/edit files through the existing `replace-lines`/`view-file` tools. (The backend tools already exist; only the in-editor driver is missing.)
2. **Point the build button at the streaming pipeline** — wire "Approve & Build" to `/v1/orchestrate` (which already streams `code_chunk`/`phase_change` over the authenticated socket) and delete the hardcoded `continueBuildExecution()` theater.
3. **Fix the model registry defaults** — seed real, current Gemini model IDs (and confirm the API key), so live generation stops silently degrading to templates.

Secondary: make the swarm actually concurrent (`asyncio.gather` across independent milestones), add real diagnostics/problems wiring, and connect the extension autofill to real profile data.

---

## 6. Structural Map (for reference)

```
geezcodE IDE
├── Frontend  apps/web/src/app/dashboard/ide/page.tsx  (orchestrates everything)
│   ├── editor: Monaco + DiffEditor           (real)
│   ├── terminal: xterm-panel.tsx             (real → workspace /terminal)
│   ├── preview: sandbox-preview.tsx          (real iframe)
│   ├── DSL: lib/geezcode-monaco.ts           (real: highlight + snippets)
│   ├── stream: hooks/use-agent-stream.ts     (real WS client)
│   ├── shell: menu-bar / command-palette / quick-open / settings / welcome (real)
│   ├── right-dock chat "geez-agent"          (SCRIPTED — not AI)
│   └── build button → /v1/builder/start      (real call; mock fallback theater)
│
├── Workspace service  (fs / git / terminal / projects)   (real + hardened)
│   └── agent tools: replace-lines (409 verify), view-file (real, tested)
│
├── Orchestrator service
│   ├── /v1/builder/*   ParallelBuilderCore    (real LLM codegen; sequential; no WS wiring)
│   ├── /v1/orchestrate LangGraph pipeline      (real streaming; approval gate; UNUSED by IDE)
│   ├── ws.py            JWT-authed WebSocket    (real)
│   └── model_registry  (real; FICTIONAL default model IDs)
│
├── CodeGen service   templates + Gemini + AST validation  (real)
└── Extension  MV3 autofill + copilot  (real; HARDCODED demo data)
```

---

*Audit is descriptive and read-only. No files were modified. All findings cite the live source on `C:\Users\HP\Projects\Afroid`.*
