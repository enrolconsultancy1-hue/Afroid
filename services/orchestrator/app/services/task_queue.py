"""Orchestrator Service — Cloud Tasks enqueue (build execution decoupling).

Builds used to run as a fire-and-forget ``asyncio.create_task`` on whichever
instance received ``POST /v1/builder/start``. If that instance was scaled down
mid-build, the build died. This module instead enqueues a Cloud Task that Cloud
Tasks delivers back to the service's worker endpoint (``POST /v1/builder/_run``)
as an HTTP request. Cloud Run keeps an instance alive for the duration of that
request, so the build runs to completion and — because the request returns a
status code — Cloud Tasks retries on failure with backoff.

Design choices for this environment:
- No new Python dependency. We call the Cloud Tasks REST API with httpx (already
  a dependency) and authenticate with an access token from the GCE metadata
  server, which on Cloud Run mints a token for the service's runtime service
  account (needs roles/cloudtasks.enqueuer).
- Fully optional. If the queue/base-URL env is not configured (local dev, or the
  queue hasn't been provisioned yet), ``enqueue_build_task`` returns False and the
  caller falls back to the previous inline background task — so deploying this
  code before the infrastructure exists changes nothing.
"""

from __future__ import annotations

import base64
import json
import os
import time
from typing import Any

import httpx
import structlog

from services.orchestrator.app.config import settings

logger = structlog.get_logger()

_METADATA_TOKEN_URL = (
    "http://metadata.google.internal/computeMetadata/v1/"
    "instance/service-accounts/default/token"
)
_CLOUD_TASKS_API = "https://cloudtasks.googleapis.com/v2"
_DISPATCH_DEADLINE = "1800s"  # 30 min — the Cloud Tasks HTTP-target maximum.

# Cached metadata access token (value, expiry_epoch).
_token_cache: tuple[str, float] | None = None


def _cfg() -> dict[str, str | None]:
    """Resolve Cloud Tasks configuration from the environment."""
    project = os.getenv("GCP_PROJECT_ID") or getattr(settings, "gcp_project_id", None)
    location = (
        os.getenv("CLOUD_TASKS_LOCATION")
        or getattr(settings, "gcp_region", None)
        or "us-central1"
    )
    return {
        "project": project,
        "location": location,
        "queue": os.getenv("CLOUD_TASKS_QUEUE"),
        "base_url": (os.getenv("ORCHESTRATOR_BASE_URL") or "").rstrip("/") or None,
        "worker_token": os.getenv("BUILD_WORKER_TOKEN"),
    }


def is_configured() -> bool:
    """True when enough env is present to enqueue to Cloud Tasks."""
    c = _cfg()
    return bool(c["project"] and c["queue"] and c["base_url"])


async def _access_token() -> str | None:
    """Fetch (and cache) a runtime-SA access token from the metadata server."""
    global _token_cache
    now = time.time()
    if _token_cache and _token_cache[1] - 60 > now:
        return _token_cache[0]
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(_METADATA_TOKEN_URL, headers={"Metadata-Flavor": "Google"})
            resp.raise_for_status()
            data = resp.json()
        token = data.get("access_token")
        expires_in = float(data.get("expires_in", 3500))
        if token:
            _token_cache = (token, now + expires_in)
        return token
    except Exception as exc:  # noqa: BLE001 — no token → caller falls back to inline
        logger.warning("metadata_token_fetch_failed", error=str(exc))
        return None


async def enqueue_build_task(payload: dict[str, Any]) -> bool:
    """Enqueue a build job to Cloud Tasks. Returns True if accepted, else False.

    ``payload`` is delivered verbatim (JSON) to POST {base_url}/v1/builder/_run.
    A False return means the caller should run the build inline instead.
    """
    if not is_configured():
        return False

    c = _cfg()
    token = await _access_token()
    if not token:
        return False

    # Carry the shared secret in the task BODY, not a header. Cloud Tasks delivers
    # the body verbatim (it is the task payload), whereas custom request headers are
    # not reliably forwarded — so a header-based token can be silently dropped in
    # transit and fail the worker's check. The worker still accepts a header token
    # as a fallback for compatibility.
    worker_token = str(c["worker_token"]).strip() if c["worker_token"] else ""
    task_payload = dict(payload)
    if worker_token:
        task_payload["_worker_token"] = worker_token

    headers = {"Content-Type": "application/json"}
    if worker_token:
        headers["X-Build-Worker-Token"] = worker_token

    body_b64 = base64.b64encode(json.dumps(task_payload).encode()).decode()
    task = {
        "task": {
            "httpRequest": {
                "url": f"{c['base_url']}/v1/builder/_run",
                "httpMethod": "POST",
                "headers": headers,
                "body": body_b64,
            },
            "dispatchDeadline": _DISPATCH_DEADLINE,
        }
    }
    parent = f"projects/{c['project']}/locations/{c['location']}/queues/{c['queue']}"
    url = f"{_CLOUD_TASKS_API}/{parent}/tasks"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json=task,
            )
        if resp.status_code // 100 == 2:
            logger.info("build_task_enqueued", queue=c["queue"], session=payload.get("session_id"))
            return True
        logger.warning(
            "build_task_enqueue_rejected",
            status=resp.status_code,
            body=resp.text[:500],
            session=payload.get("session_id"),
        )
        return False
    except Exception as exc:  # noqa: BLE001 — enqueue failure → inline fallback
        logger.warning("build_task_enqueue_failed", error=str(exc), session=payload.get("session_id"))
        return False
