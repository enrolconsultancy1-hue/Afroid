/**
 * geezcodE — Startup Intake & Builder Portal popup controller.
 * API base points at the local gateway; override via chrome.storage "api_base".
 */

const DEFAULT_API_BASE = "http://localhost:8090";
const TOKEN_KEY = "afroid_access_token";

const $ = (id) => document.getElementById(id);

function val(id) {
  const el = $(id);
  return el ? el.value.trim() : "";
}

async function getApiBase() {
  const { api_base } = await chrome.storage.local.get("api_base");
  return api_base || DEFAULT_API_BASE;
}

async function getToken() {
  const data = await chrome.storage.local.get(TOKEN_KEY);
  return data[TOKEN_KEY] || "";
}

function showStatus(el, message, kind) {
  el.textContent = message;
  el.className = `status ${kind}`;
  el.classList.remove("hidden");
}

function splitList(raw) {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// --- Tab switching ---
function initTabs() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      $(`panel-${btn.dataset.tab}`).classList.add("active");
    });
  });
}

// --- Tab 1: Submit idea ---
async function handleSubmitIdea() {
  const btn = $("btn-submit-idea");
  const status = $("submit-status");

  const projectName = val("idea-project");
  if (!projectName) {
    showStatus(status, "Please give your startup a name.", "error");
    return;
  }

  const payload = {
    project_name: projectName,
    one_liner: val("idea-oneliner"),
    problem: val("idea-problem"),
    target_users: val("idea-users"),
    core_features: splitList(val("idea-features")),
    free_text: val("idea-freetext"),
    founder_name: val("idea-founder-name") || null,
    founder_email: val("idea-founder-email") || null,
  };

  btn.disabled = true;
  showStatus(status, "Submitting to the central database…", "info");

  try {
    const base = await getApiBase();
    const res = await fetch(`${base}/v1/intake/ideas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const idea = await res.json();
      showStatus(
        status,
        `✓ Idea "${idea.project_name}" submitted.\nIt's now queued for technical evaluation.`,
        "success"
      );
      ["idea-project", "idea-oneliner", "idea-problem", "idea-users", "idea-features", "idea-freetext"].forEach(
        (id) => ($(id).value = "")
      );
    } else {
      const err = await res.json().catch(() => ({}));
      showStatus(status, `Submit failed: ${err.detail || res.status}`, "error");
    }
  } catch (e) {
    showStatus(status, `Network error: ${e.message}`, "error");
  } finally {
    btn.disabled = false;
  }
}

// --- Tab 2: Builder portal ---
async function handleSaveToken() {
  const status = $("portal-status");
  const token = val("portal-token");
  if (!token) {
    showStatus(status, "Paste your access token first.", "error");
    return;
  }
  await chrome.storage.local.set({ [TOKEN_KEY]: token });
  $("portal-token").value = "";
  applyRoleGating();
  showStatus(status, "✓ Token saved.", "success");
}

async function handleRegisterWriter() {
  const status = $("portal-status");
  const btn = $("btn-register-writer");
  const token = await getToken();
  if (!token) {
    showStatus(status, "Save your access token first.", "error");
    return;
  }
  const displayName = val("writer-name");
  const email = val("writer-email");
  if (!displayName || !email) {
    showStatus(status, "Display name and email are required.", "error");
    return;
  }

  const payload = {
    display_name: displayName,
    email,
    title: val("writer-title") || null,
    skills: splitList(val("writer-skills")),
  };

  btn.disabled = true;
  showStatus(status, "Registering…", "info");

  try {
    const base = await getApiBase();
    const res = await fetch(`${base}/v1/intake/writers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const writer = await res.json();
      showStatus(status, `✓ Registered as "${writer.display_name}" (${writer.status}).`, "success");
    } else {
      const err = await res.json().catch(() => ({}));
      showStatus(status, `Registration failed: ${err.detail || res.status}`, "error");
    }
  } catch (e) {
    showStatus(status, `Network error: ${e.message}`, "error");
  } finally {
    btn.disabled = false;
  }
}

async function handleClaimNext() {
  const status = $("portal-status");
  const btn = $("btn-claim-next");
  const card = $("claim-result");
  const token = await getToken();
  if (!token) {
    showStatus(status, "Save your access token first.", "error");
    return;
  }

  btn.disabled = true;
  card.classList.add("hidden");
  showStatus(status, "Fetching next idea in the queue…", "info");

  try {
    const base = await getApiBase();
    const nxt = await fetch(`${base}/v1/intake/ideas/next`, { headers: authHeaders(token) });

    if (nxt.status === 404) {
      showStatus(status, "Queue is empty — no pending ideas right now.", "info");
      return;
    }
    if (!nxt.ok) {
      const err = await nxt.json().catch(() => ({}));
      showStatus(status, `Error: ${err.detail || nxt.status}`, "error");
      return;
    }

    const idea = await nxt.json();
    const claim = await fetch(`${base}/v1/intake/ideas/${idea.id}/claim`, {
      method: "POST",
      headers: authHeaders(token),
    });

    if (claim.ok) {
      const claimed = await claim.json();
      card.innerHTML = `
        <h4>${claimed.project_name}</h4>
        <div class="meta">Status: ${claimed.status} · claimed now</div>
        <p>${claimed.one_liner || claimed.problem || "No summary provided."}</p>
      `;
      card.classList.remove("hidden");
      showStatus(status, `✓ Claimed "${claimed.project_name}" for evaluation.`, "success");
    } else {
      const err = await claim.json().catch(() => ({}));
      showStatus(status, `Claim failed: ${err.detail || claim.status}`, "error");
    }
  } catch (e) {
    showStatus(status, `Network error: ${e.message}`, "error");
  } finally {
    btn.disabled = false;
  }
}

// --- Tab 3: Pitch Deck Evaluator ---
async function handleRegisterEvaluator() {
  const status = $("evaluator-status");
  const btn = $("btn-register-evaluator");
  const token = await getToken();
  if (!token) {
    showStatus(status, "Save your access token first (Builder Portal tab).", "error");
    return;
  }
  const displayName = val("ev-name");
  const orgName = val("ev-org");
  if (!displayName || !orgName) {
    showStatus(status, "Display name and organization are required.", "error");
    return;
  }

  const payload = {
    display_name: displayName,
    org_name: orgName,
    org_type: val("ev-type") || "entity",
    credential_ref: val("ev-credential") || null,
  };

  btn.disabled = true;
  showStatus(status, "Registering evaluator…", "info");

  try {
    const base = await getApiBase();
    const res = await fetch(`${base}/v1/intake/evaluators`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const ev = await res.json();
      showStatus(status, `✓ Registered (${ev.status}). Await approval before scoring.`, "success");
    } else {
      const err = await res.json().catch(() => ({}));
      showStatus(status, `Registration failed: ${err.detail || res.status}`, "error");
    }
  } catch (e) {
    showStatus(status, `Network error: ${e.message}`, "error");
  } finally {
    btn.disabled = false;
  }
}

async function handleLoadSubmissions() {
  const status = $("evaluator-status");
  const sel = $("ev-submission");
  const btn = $("btn-load-submissions");
  btn.disabled = true;
  showStatus(status, "Loading submissions…", "info");
  try {
    const base = await getApiBase();
    const res = await fetch(`${base}/v1/intake/ideas?limit=50`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ideas = await res.json();
    sel.innerHTML = "";
    if (!ideas.length) {
      sel.innerHTML = '<option value="">— no submissions —</option>';
    } else {
      ideas.forEach((idea) => {
        const opt = document.createElement("option");
        opt.value = idea.id;
        opt.textContent = `${idea.project_name} (${idea.status})`;
        sel.appendChild(opt);
      });
    }
    sel.disabled = false;
    showStatus(status, `Loaded ${ideas.length} submission(s).`, "success");
  } catch (e) {
    showStatus(status, `Failed to load: ${e.message}`, "error");
  } finally {
    btn.disabled = false;
  }
}

async function handleSubmitEvaluation() {
  const status = $("evaluator-status");
  const btn = $("btn-submit-evaluation");
  const token = await getToken();
  if (!token) {
    showStatus(status, "Save your access token first (Builder Portal tab).", "error");
    return;
  }
  const submissionId = val("ev-submission");
  const score = val("ev-score");
  if (!submissionId) {
    showStatus(status, "Load and select a submission first.", "error");
    return;
  }
  const num = parseFloat(score);
  if (Number.isNaN(num) || num < 0 || num > 100) {
    showStatus(status, "Score must be a number 0-100.", "error");
    return;
  }

  const payload = { submission_id: submissionId, score: num, comments: val("ev-comments") || null };

  btn.disabled = true;
  showStatus(status, "Submitting score…", "info");

  try {
    const base = await getApiBase();
    const res = await fetch(`${base}/v1/intake/evaluations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const ev = await res.json();
      showStatus(status, `✓ Score ${ev.score} submitted.`, "success");
    } else {
      const err = await res.json().catch(() => ({}));
      showStatus(status, `Submit failed: ${err.detail || res.status}`, "error");
    }
  } catch (e) {
    showStatus(status, `Network error: ${e.message}`, "error");
  } finally {
    btn.disabled = false;
  }
}

// --- Open the popup UI in a full browser tab ---
function handleOpenFullWindow() {
  chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
}

// --- Role-aware tabs: show only what the current user can do ---
function setTabVisible(tab, visible) {
  const btn = document.querySelector('.tab[data-tab="' + tab + '"]');
  const panel = document.getElementById("panel-" + tab);
  if (btn) btn.classList.toggle("hidden", !visible);
  if (panel) panel.classList.toggle("hidden", !visible);
}

async function applyRoleGating() {
  const token = await getToken();
  setTabVisible("submit", true);
  setTabVisible("portal", false);
  setTabVisible("evaluator", false);
  if (!token) {
    return;
  }
  try {
    const base = await getApiBase();
    const res = await fetch(base + "/v1/intake/me", { headers: authHeaders(token) });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const me = await res.json();
    const roles = me.roles || [];
    setTabVisible("portal", roles.indexOf("writer") !== -1);
    setTabVisible("evaluator", roles.indexOf("evaluator") !== -1);
  } catch (e) {
    // Fallback: keep the builder portal reachable (token entry + registration).
    setTabVisible("portal", true);
  }
  const active = document.querySelector(".tab.active");
  if (active && active.classList.contains("hidden")) {
    const first = document.querySelector(".tab:not(.hidden)");
    if (first) first.click();
  }
}

// --- Boot ---
function init() {
  initTabs();
  $("btn-submit-idea").addEventListener("click", handleSubmitIdea);
  $("btn-save-token").addEventListener("click", handleSaveToken);
  $("btn-register-writer").addEventListener("click", handleRegisterWriter);
  $("btn-claim-next").addEventListener("click", handleClaimNext);
  $("btn-register-evaluator").addEventListener("click", handleRegisterEvaluator);
  $("btn-load-submissions").addEventListener("click", handleLoadSubmissions);
  $("btn-submit-evaluation").addEventListener("click", handleSubmitEvaluation);
  $("btn-fullscreen").addEventListener("click", handleOpenFullWindow);

  // Pre-fill the token field from storage so the builder sees it's saved.
  applyRoleGating();
  chrome.storage.local.get(TOKEN_KEY).then((data) => {
    if (data[TOKEN_KEY]) {
      $("portal-token").value = data[TOKEN_KEY];
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
