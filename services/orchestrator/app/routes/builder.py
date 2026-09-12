"""Orchestrator Service — Architect Intake & Parallel Builder API Routes."""

from __future__ import annotations

import asyncio
import json
import os
import shutil
import time
import uuid
from typing import Any

import structlog
from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from services.orchestrator.app.agents.parallel_builder import (
    ZeroQuestionIntakeEngine,
    parallel_builder_core,
)
from services.orchestrator.app.schemas.state import ArchitectureBlueprint, BusinessIdea
from services.orchestrator.app.services.byo_provider import openai_compatible_chat
from services.orchestrator.app.services.durable_store import durable_store
from services.orchestrator.app.services.model_registry import model_registry
from services.orchestrator.app.services.task_queue import enqueue_build_task
from services.shared.auth_middleware import get_current_user
from services.shared.user_models import User

logger = structlog.get_logger()

router = APIRouter(prefix="/builder", tags=["builder"])

intake_engine = ZeroQuestionIntakeEngine()

ASSISTANT_SYSTEM_PROMPT = """You are geezcodE Copilot, an expert AI pair-programmer \
embedded in the geezcodE IDE. You help the founder understand and modify their project code
across MULTIPLE files at once.

You receive the user's message and, as context, the ACTIVE FILE plus other OPEN FILES
(each with its path and full content).

Respond with ONLY a single JSON object, no markdown fences:
{
  "reply": "<concise, helpful answer in GitHub-flavoured markdown>",
  "edits": [
    {
      "path": "<file path to write — an existing open file OR a new file>",
      "new_content": "<the COMPLETE file content after your change>",
      "summary": "<one short line describing this file's change>"
    }
  ]
}

Rules:
- For a question or explanation: answer in "reply" and set "edits" to [].
- To write or change code: include one entry in "edits" PER FILE you change. When a change
  spans several files (e.g. a new endpoint plus its test plus a router registration), return
  ALL of them together so they stay consistent.
- Every edit's new_content MUST be the COMPLETE file, never a fragment or a diff.
- Only include files you actually change. Prefer editing the files provided as context;
  create new files only when genuinely needed.
- Keep "reply" focused; briefly note what you changed and why."""


def _coerce_text(raw: Any) -> str:
    """Flatten a LangChain content value (str or list of parts) to text."""
    if isinstance(raw, list):
        return "".join(p if isinstance(p, str) else p.get("text", "") for p in raw)
    return raw or ""


def _valid_edit(e: Any) -> bool:
    return isinstance(e, dict) and bool(e.get("path")) and isinstance(e.get("new_content"), str)


@router.post("/assistant", response_model=dict[str, Any])
async def assistant_chat(
    body: dict[str, Any],
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """geezcodE Copilot — real LLM chat that can propose coordinated multi-file edits.

    The IDE dock posts the user's message, the active file, and the other open
    files as context. The reply is shown in the chat; each proposed edit is
    surfaced in the Diff review panel (queued) for approve/reject, which writes
    approved files to the workspace.
    """
    message = (body.get("message") or "").strip()
    model_id = body.get("model_id")
    active_file = body.get("active_file") or None
    open_files = body.get("open_files") or []
    if not message:
        return {"data": {"reply": "Ask me anything about your project, or tell me what to change.", "edits": []}}
    # Input validation / abuse caps: bound the message and the number of context files.
    if len(message) > 50000:
        message = message[:50000]
    if not isinstance(open_files, list):
        open_files = []
    elif len(open_files) > 50:
        open_files = open_files[:50]

    # Build multi-file context (active file first), de-duplicated and size-capped.
    seen: set[str] = set()
    parts: list[str] = []
    budget = 28000
    ordered: list[dict[str, Any]] = []
    if isinstance(active_file, dict) and active_file.get("path"):
        ordered.append(active_file)
    if isinstance(open_files, list):
        ordered.extend([f for f in open_files if isinstance(f, dict) and f.get("path")])
    for f in ordered:
        path = f.get("path")
        if not path or path in seen:
            continue
        seen.add(path)
        content = str(f.get("content", ""))
        snippet = content[: max(0, budget)]
        budget -= len(snippet)
        tag = "ACTIVE FILE" if (isinstance(active_file, dict) and path == active_file.get("path")) else "OPEN FILE"
        parts.append(f"\n\n{tag}: {path}\n-----\n{snippet}\n-----")
        if budget <= 0:
            break
    context = "".join(parts)

    messages = [
        {"role": "system", "content": ASSISTANT_SYSTEM_PROMPT},
        {"role": "user", "content": message + context},
    ]

    # Bring-Your-Own-Provider: if the client supplied an OpenAI-compatible provider
    # (base_url + api_key + model), route the request there instead of Gemini. The
    # key is used only for this call and never stored or logged.
    provider = body.get("provider") if isinstance(body.get("provider"), dict) else None
    use_byo = bool(provider and provider.get("base_url") and provider.get("api_key") and provider.get("model"))

    raw = ""
    try:
        if use_byo:
            raw = (await openai_compatible_chat(
                base_url=str(provider["base_url"]),
                api_key=str(provider["api_key"]),
                model=str(provider["model"]),
                messages=messages,
                temperature=0.2,
            )).strip()
        else:
            llm = model_registry.create_llm(agent_name="assistant", model_id=model_id, temperature=0.2)
            response = await llm.ainvoke(messages)
            raw = _coerce_text(response.content).strip()
        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(lines[1:-1]) if len(lines) > 2 else raw
        data = json.loads(raw)
        reply = data.get("reply") or "Done."
        edits = data.get("edits")
        if not isinstance(edits, list):
            # Back-compat: accept a legacy single proposed_edit.
            single = data.get("proposed_edit")
            edits = [single] if single else []
        edits = [e for e in edits if _valid_edit(e)]
        return {"data": {"reply": reply, "edits": edits, "proposed_edit": edits[0] if edits else None}}
    except json.JSONDecodeError:
        return {"data": {"reply": raw or "I couldn't process that — try rephrasing.", "edits": []}}
    except Exception as exc:  # noqa: BLE001 — never 500 the dock
        logger.warning("assistant_chat_failed", error=str(exc))
        return {"data": {"reply": f"geezcodE Copilot is temporarily unavailable ({exc}).", "edits": []}}


_COMPLETE_SYSTEM_PROMPT = (
    "You are an expert code autocomplete engine embedded in an IDE. You are given the "
    "code immediately BEFORE the cursor and the code immediately AFTER the cursor. "
    "Output ONLY the raw code that should be inserted at the cursor to continue naturally "
    "— no explanations, no commentary, no markdown fences, and do not repeat code that "
    "already appears in the prefix or suffix. Prefer completing the current statement or a "
    "small, coherent block. If nothing sensible should be inserted, output nothing."
)


def _strip_code_fences(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        lines = t.split("\n")
        # drop the opening fence (and optional language) and a trailing fence
        body = lines[1:]
        if body and body[-1].strip().startswith("```"):
            body = body[:-1]
        t = "\n".join(body)
    return t


@router.post("/complete", response_model=dict[str, Any])
async def code_complete(
    body: dict[str, Any],
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Low-latency inline code completion (ghost text) for the editor.

    Returns a short insertion for the cursor position. Uses a fast model by default
    (Gemini Flash) or the caller's BYO OpenAI-compatible provider when supplied.
    """
    prefix = str(body.get("prefix", ""))[-4000:]
    suffix = str(body.get("suffix", ""))[:1500]
    language = str(body.get("language", "")) or "plaintext"
    path = str(body.get("path", "")) or "untitled"
    if not prefix.strip() and not suffix.strip():
        return {"data": {"completion": ""}}

    provider = body.get("provider") if isinstance(body.get("provider"), dict) else None
    use_byo = bool(provider and provider.get("base_url") and provider.get("api_key") and provider.get("model"))

    messages = [
        {"role": "system", "content": _COMPLETE_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"LANGUAGE: {language}\nFILE: {path}\n"
                f"<CODE_BEFORE_CURSOR>\n{prefix}\n</CODE_BEFORE_CURSOR>\n"
                f"<CODE_AFTER_CURSOR>\n{suffix}\n</CODE_AFTER_CURSOR>\n"
                "Insertion at the cursor:"
            ),
        },
    ]

    try:
        if use_byo:
            raw = await openai_compatible_chat(
                base_url=str(provider["base_url"]),
                api_key=str(provider["api_key"]),
                model=str(provider["model"]),
                messages=messages,
                temperature=0.1,
                max_tokens=96,
                timeout=20.0,
            )
        else:
            llm = model_registry.create_llm(agent_name="codegen", model_id="gemini-flash-latest", temperature=0.1, max_output_tokens=96)
            response = await llm.ainvoke(messages)
            raw = _coerce_text(response.content)
        return {"data": {"completion": _strip_code_fences(raw)}}
    except Exception as exc:  # noqa: BLE001 — completions must never surface an error
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


def _get_session(request: Request) -> AsyncSession:
    return request.state.db_session


@router.post("/intake", response_model=dict[str, Any])
async def zero_question_intake(
    body: dict[str, Any],
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Zero-Question Architect Intake Framework.

    Generates a high-level Architectural Blueprint Preview with NO QUESTIONS TO ASK.
    Supports either plain concept string or complete structured BusinessIdea object.
    """
    concept = body.get("concept") or body.get("prompt")
    idea_dict = body.get("idea")
    model_id = body.get("model_id", "gemini-flash-latest")

    if idea_dict:
        idea = BusinessIdea(**idea_dict)
        blueprint = await intake_engine.generate_blueprint(
            concept_input=idea,
            model_id=model_id,
        )
    elif concept:
        blueprint = await intake_engine.generate_blueprint(
            concept_input=concept,
            model_id=model_id,
        )
    else:
        blueprint = intake_engine.offline_blueprint("Sovereign Enterprise App")

    return {
        "data": {
            "blueprint": blueprint.model_dump(),
            "status": "preview_ready",
            "message": "Architectural Blueprint generated with zero questions. Review, edit, or click Approve & Build.",
        }
    }


@router.post("/blueprint/validate", response_model=dict[str, Any])
async def validate_blueprint_json(
    body: dict[str, Any],
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Validate, heal, and compute completeness for edited Blueprint JSON."""
    blueprint_data = body.get("blueprint", {})
    try:
        blueprint = ArchitectureBlueprint(**blueprint_data)
        return {
            "data": {
                "valid": True,
                "blueprint": blueprint.model_dump(),
                "completeness": blueprint.completeness,
            }
        }
    except (ValueError, TypeError, KeyError) as e:
        return {
            "data": {
                "valid": False,
                "error": str(e),
            }
        }


# ---------------------------------------------------------------------------
# Async parallel build: /start launches a background build, /status/{id} polls
# real progress. Streaming over WebSocket is not reachable in the current Cloud
# Run topology, so the IDE polls this status endpoint for genuine live progress
# (real per-milestone LLM codegen + real AST validation) instead of the old
# synchronous call + fabricated client-side telemetry.
#
# Build state is persisted to Postgres via the durable store (namespace "build"),
# so a status poll served by ANY orchestrator instance returns the live state —
# not the per-process dict that previously forced minScale=maxScale=1. The
# instance that owns the running build keeps a local working copy for cheap
# mutation and writes a snapshot to the durable store after every event.
# ---------------------------------------------------------------------------

_BUILD_NS = "build"
_BUILD_LOG_CAP = 400
# A build claimed by a worker more than this long ago is treated as stale (the
# instance likely died), so a Cloud Tasks retry is allowed to re-run it.
_WORKER_STALE_SECONDS = 1800


def _new_build_store(project_name: str, *, status: str = "running", owner_id: str | None = None) -> dict[str, Any]:
    return {
        "status": status,
        "progress": 0,
        "current": "Initializing build" if status == "running" else "Queued for build",
        "project_name": project_name,
        "project_path": None,
        "files": [],
        "log": [],
        "generated_files": [],
        "test_results": [],
        "sub_agents": [],
        "error": None,
        # Ownership (per-user isolation) + execution bookkeeping.
        "owner_id": owner_id,
        "executor": None,
        "worker_started_at": None,
    }


async def _persist_build(session_id: str, store: dict[str, Any]) -> None:
    """Write-through a build-session snapshot to the durable (cross-instance) store."""
    try:
        await durable_store.put(
            _BUILD_NS,
            session_id,
            store,
            status=store.get("status", ""),
            owner_id=store.get("owner_id"),
            session_id=session_id,
        )
    except Exception as exc:  # noqa: BLE001 — never let persistence kill the build
        logger.warning("build_persist_failed", session_id=session_id, error=str(exc))


async def _run_parallel_build(
    session_id: str,
    blueprint: ArchitectureBlueprint,
    autopilot: bool,
    model_id: str | None,
    executor: str = "inline",
    owner_id: str | None = None,
    provider: dict[str, Any] | None = None,
) -> None:
    """Execute the real parallel build, recording live progress to the durable store.

    ``executor`` records how this run was dispatched — "cloud_tasks" when driven by
    the decoupled worker endpoint, "inline" when run as the in-process fallback.
    ``provider`` (optional OpenAI-compatible base_url+api_key+model) routes the whole
    codegen swarm to a user's own provider; it is NEVER written to the durable store.
    """
    store = _new_build_store(blueprint.project_name, owner_id=owner_id)
    store["executor"] = executor
    store["worker_started_at"] = time.time()
    # Stamp the claim immediately so a concurrent Cloud Tasks redelivery sees this
    # build as already in-flight (see the worker's idempotency guard) rather than
    # starting a duplicate run.
    await _persist_build(session_id, store)

    async def on_event(evt: dict[str, Any]) -> None:
        etype = evt.get("type", "")
        payload = evt.get("payload", {})
        log = store["log"]
        if etype == "build_started":
            log.append(f"[Parallel Builder] Build started for {payload.get('project_name')} "
                       f"({payload.get('total_milestones', 0)} milestones)")
        elif etype == "milestone_started":
            store["current"] = payload.get("milestone_name", store["current"])
            store["progress"] = int(payload.get("progress", store["progress"]))
            log.append(f"[Milestone {payload.get('milestone_id')}] {payload.get('milestone_name')} — "
                       f"{payload.get('objective', '')}")
        elif etype == "file_generated":
            store["files"].append(payload.get("path"))
            log.append(f"[CodeGen:{payload.get('source', 'llm')}] {payload.get('path')} "
                       f"({payload.get('size_bytes', 0)} bytes)")
        elif etype == "milestone_completed":
            store["progress"] = int(payload.get("progress", store["progress"]))
            log.append(f"[Milestone {payload.get('milestone_id')}] complete — "
                       f"{payload.get('files_generated', 0)} file(s)")
        elif etype == "codegen_diag":
            log.append(f"[CodeGen:diag] milestone {payload.get('milestone_id')} — {payload.get('reason')}")
        elif etype == "ast_results":
            ok = payload.get("passed")
            log.append(f"[QA] AST syntax validation {'PASSED' if ok else 'FAILED'} "
                       f"({payload.get('python_files_scanned', 0)} python files)")
        elif etype == "build_complete":
            store["progress"] = 100
            log.append(f"[Parallel Builder] Build complete — {payload.get('total_files', 0)} files, "
                       f"AST {'passed' if payload.get('ast_passed') else 'failed'} "
                       f"(source: {payload.get('source')})")
        del log[:-_BUILD_LOG_CAP]  # keep only the tail
        # Write-through each event so any instance polling /status sees live progress.
        await _persist_build(session_id, store)

    try:
        session = await parallel_builder_core.execute_parallel_build(
            session_id=session_id,
            blueprint=blueprint,
            autopilot=autopilot,
            on_event=on_event,
            model_id=model_id,
            provider=provider,
        )
        store["status"] = "complete"
        store["progress"] = 100
        store["project_name"] = session.project_name
        store["project_path"] = session.project_path
        store["generated_files"] = [gf.model_dump() for gf in session.generated_files]
        store["test_results"] = session.test_results
        store["sub_agents"] = [sa.model_dump() for sa in session.sub_agents]
    except Exception as exc:  # noqa: BLE001 — surface the real error to the poller
        logger.warning("parallel_build_failed", session_id=session_id, error=str(exc))
        store["status"] = "error"
        store["error"] = str(exc)
        store["log"].append(f"[Parallel Builder] Build failed: {exc}")
    finally:
        await _persist_build(session_id, store)


@router.post("/start", response_model=dict[str, Any])
async def start_parallel_build(
    body: dict[str, Any],
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Approve the blueprint and launch the real parallel build.

    The build is enqueued to Cloud Tasks, which delivers it to the worker endpoint
    (POST /builder/_run) so it runs inside an HTTP request Cloud Run keeps alive —
    surviving instance scale-down and gaining automatic retries. If Cloud Tasks is
    not configured (or the enqueue fails), it falls back to an in-process task so
    behaviour is unchanged in local/dev. Returns immediately with a session_id; the
    IDE polls /builder/status/{id} for genuine progress and the generated files.
    """
    session_id = body.get("session_id") or f"build-{uuid.uuid4().hex[:8]}"
    blueprint_data = body.get("blueprint", {})
    blueprint = ArchitectureBlueprint(**blueprint_data)
    autopilot = body.get("autopilot", True)
    model_id = body.get("model_id")
    owner_id = str(current_user.id)
    # Optional BYO provider for the whole swarm. Transits the task body only; never
    # written to the durable store.
    provider = body.get("provider") if isinstance(body.get("provider"), dict) else None

    # Persist an initial "queued" record (owned by the caller) before returning so a
    # fast status poll (on any instance) resolves instead of racing the worker.
    store = _new_build_store(blueprint.project_name, status="queued", owner_id=owner_id)
    await _persist_build(session_id, store)

    task_payload: dict[str, Any] = {
        "session_id": session_id,
        "blueprint": blueprint_data,
        "autopilot": autopilot,
        "model_id": model_id,
        "owner_id": owner_id,
    }
    if provider:
        task_payload["provider"] = provider
    enqueued = await enqueue_build_task(task_payload)
    if not enqueued:
        # Inline fallback: run in-process on this instance.
        asyncio.create_task(
            _run_parallel_build(session_id, blueprint, autopilot, model_id, executor="inline", owner_id=owner_id, provider=provider)
        )

    return {
        "data": {
            "session_id": session_id,
            "status": "queued" if enqueued else "running",
            "project_name": blueprint.project_name,
            "dispatch": "cloud_tasks" if enqueued else "inline",
        }
    }


@router.post("/_run", response_model=dict[str, Any], include_in_schema=False)
async def run_build_worker(
    body: dict[str, Any],
    x_build_worker_token: str | None = Header(default=None),
) -> Any:
    """Cloud Tasks worker target — runs a queued build to completion (synchronously).

    Cloud Tasks delivers the job here as an HTTP POST; running the build inside the
    request keeps the Cloud Run instance alive for its duration. Returns 2xx on
    success (Cloud Tasks acks) and 5xx on failure (Cloud Tasks retries with backoff).
    Protected by a shared-secret header so only our enqueuer can invoke it.
    """
    # Auth via the shared secret. The token is carried in the task BODY (reliably
    # delivered by Cloud Tasks); a request header is accepted as a fallback. Both
    # sides .strip() so a trailing newline in the secret can't cause a spurious 403.
    expected = (os.getenv("BUILD_WORKER_TOKEN") or "").strip()
    provided = (body.get("_worker_token") or x_build_worker_token or "").strip()
    if expected and provided != expected:
        logger.warning(
            "worker_token_denied",
            via_body=bool(body.get("_worker_token")),
            via_header=x_build_worker_token is not None,
        )
        return JSONResponse(status_code=403, content={"data": {"error": "forbidden"}})

    session_id = body.get("session_id")
    if not session_id:
        return JSONResponse(status_code=400, content={"data": {"error": "session_id required"}})

    # Idempotency: Cloud Tasks is at-least-once. Skip re-running a build that is
    # already complete or actively in-flight (a fresh, non-stale worker claim).
    existing = await durable_store.get(_BUILD_NS, session_id)
    if existing:
        status = existing.get("status")
        if status == "complete":
            return {"data": {"session_id": session_id, "status": "complete", "skipped": "already_complete"}}
        started = existing.get("worker_started_at") or 0
        if status == "running" and started and (time.time() - float(started)) < _WORKER_STALE_SECONDS:
            return {"data": {"session_id": session_id, "status": "running", "skipped": "in_progress"}}

    blueprint = ArchitectureBlueprint(**body.get("blueprint", {}))
    autopilot = body.get("autopilot", True)
    model_id = body.get("model_id")
    owner_id = body.get("owner_id") or (existing.get("owner_id") if existing else None)
    provider = body.get("provider") if isinstance(body.get("provider"), dict) else None

    await _run_parallel_build(session_id, blueprint, autopilot, model_id, executor="cloud_tasks", owner_id=owner_id, provider=provider)

    final = await durable_store.get(_BUILD_NS, session_id) or {}
    if final.get("status") == "error":
        # Non-2xx so Cloud Tasks retries with backoff.
        return JSONResponse(
            status_code=500,
            content={"data": {"session_id": session_id, "status": "error", "error": final.get("error")}},
        )
    return {"data": {"session_id": session_id, "status": final.get("status", "complete")}}


def status_payload(session_id: str, store: dict[str, Any] | None) -> dict[str, Any]:
    """Build the status snapshot for a build session.

    Shared by the HTTP status endpoint and the WebSocket streaming endpoint so
    both surface identical data (full generated files only once complete).
    """
    if store is None:
        return {"session_id": session_id, "status": "not_found"}
    complete = store.get("status") == "complete"
    return {
        "session_id": session_id,
        "status": store.get("status"),
        "progress": store.get("progress", 0),
        "current": store.get("current"),
        "project_name": store.get("project_name"),
        "project_path": store.get("project_path"),
        "file_count": len(store.get("files", [])),
        "executor": store.get("executor"),
        "log": store.get("log", []),
        "error": store.get("error"),
        # Full files (with content) only once complete, so the IDE can write
        # them into the workspace.
        "generated_files": store.get("generated_files", []) if complete else [],
        "test_results": store.get("test_results", []) if complete else [],
        "sub_agents": store.get("sub_agents", []),
    }


def _owner_ok(store: dict[str, Any] | None, user: User) -> bool:
    """A record with no owner is legacy/open; otherwise it must match the caller."""
    if store is None:
        return True
    owner = store.get("owner_id")
    return owner is None or owner == str(user.id)


@router.get("/status/{session_id}", response_model=dict[str, Any])
async def build_status(
    session_id: str,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Return live progress for a running build, and the generated files when complete."""
    store = await durable_store.get(_BUILD_NS, session_id)
    # Per-user isolation: never reveal another user's build (report as not_found).
    if not _owner_ok(store, current_user):
        return {"data": {"session_id": session_id, "status": "not_found"}}
    return {"data": status_payload(session_id, store)}


@router.post("/approve-file", response_model=dict[str, Any])
async def approve_file_diff(
    body: dict[str, Any],
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Approve, reject, or request edit on an individual generated file."""
    file_path = body.get("file_path", "")
    approved = body.get("approved", True)
    custom_edits = body.get("custom_edits")

    return {
        "data": {
            "file_path": file_path,
            "approved": approved,
            "custom_edits_applied": custom_edits is not None,
            "status": "accepted" if approved else "rejected",
        }
    }
