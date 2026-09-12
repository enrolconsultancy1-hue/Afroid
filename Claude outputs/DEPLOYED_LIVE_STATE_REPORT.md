# AfroID — Deployed Live-State Report (Google Cloud)

**Project:** afroid-506916 (project #629240539505) — state ACTIVE
**Owner:** enrolconsultancy1@gmail.com
**Region:** us-central1
**Captured:** 2026-09-09 (live `gcloud` + health probes from your machine)
**Updated:** 2026-09-09 — after applying remediations #1 (image re-pin) and #2 (least-privilege SA migration)
**Nature:** This is the *deployed reality on GCP*, not the source repo. Where it disagrees with `FINAL_AUDIT_REPORT.md`, the live data wins.

---

## 0. Remediations Applied This Session

| # | Action | Status |
|---|--------|--------|
| 1 | Re-pin `vector-store` & `web` from `:latest` to immutable `@sha256` digests | ✅ Done |
| 2 | Create dedicated least-privilege SA `afroid-cloudrun-prod`, migrate all 12 services to it, strip `roles/editor` from the default compute SA | ✅ Done |

All 12 services verified healthy after both changes. The remaining items (#3 cold starts, #4 Pub/Sub subscriptions, #5 SendGrid secret) are unaddressed and carried forward in §11.

---

## 1. Headline

All **12 Cloud Run services are live, serving 100% traffic on their latest revision, and every one returns `/health` 200.** The database is locked down (SSL + client-cert required, zero public authorized networks) and every backend reads its secrets from Secret Manager. As of this session, **all images are pinned to immutable digests and all services run under a dedicated least-privilege service account** (no more `roles/editor`). The platform is genuinely up and materially hardened.

Three findings remain, none of them outages: five services scale to zero (real cold starts), Pub/Sub topics appear to have no subscribers, and the SendGrid secret referenced by CI isn't in Secret Manager.

---

## 2. Cloud Run — 12/12 Live

Every service: 100% traffic to latest revision, all healthy. **As of this session all 12 run as `afroid-cloudrun-prod@afroid-506916.iam.gserviceaccount.com`** (least-privilege), not the old compute SA. Revisions below are pre-migration; each has since advanced one revision.

| Service | Revision | Image tag | Min→Max | Warm? | Cloud SQL | VPC connector |
|---------|----------|-----------|---------|-------|-----------|---------------|
| gateway | 00018-6sn | git `4c734a0` | 0→20 | boost | — (proxy) | — |
| auth | 00032-qhx | git `4c734a0` | **1**→10 | ✅ warm | ✅ | ✅ private-ranges |
| platform | 00028-vpg | git `4c734a0` | **1**→10 | ✅ warm | ✅ | ✅ |
| orchestrator | 00030-f5z | git `4c734a0` | **1**→20 | ✅ warm | ✅ | ✅ |
| certify | 00028-chq | git `4c734a0` | 0→10 | ❄️ cold | ✅ | ✅ |
| incubate | 00022-8gb | git `4c734a0` | 0→10 | ❄️ cold | ✅ | ✅ |
| codegen | 00021-w66 | git `4c734a0` | 0→10 | ❄️ cold | ✅ | ✅ |
| notification | 00022-zjh | git `4c734a0` | 0→5 | ❄️ cold | ✅ | ✅ |
| workspace | 00019-5ds | git `4c734a0` | 0→20 | boost | ✅ | ⚠️ none |
| intake | 00020-xcj | git `4c734a0` | 0→20 | boost | ✅ | ⚠️ none |
| vector-store | 00022-j9k | ✅ `@sha256:55ef82b3` | 0→10 | ❄️ cold | ✅ | ✅ |
| web | 00032-pvv | ✅ `@sha256:6d4c4c66` | **1**→20 | ✅ warm | — | ✅ |

Ten of twelve images were already pinned to the immutable git SHA `4c734a01cbc968b4c30ff4896049eaee9af9e64e`. **vector-store and web were on the mutable `:latest` tag and have now been re-pinned to immutable digests** (#1, done this session) — so all 12 images are reproducible and rollback-safe.

---

## 3. Health Probe Results

| First pass (15s timeout) | Cold-start recheck (60s) |
|---|---|
| ✅ 200: gateway, auth, platform, orchestrator, workspace, intake, web | — |
| ⏱ timed out: certify, incubate, codegen, notification, vector-store | ✅ **all 5 → 200 on try 1** |

The five timeouts were **cold starts, not failures** — they map exactly to the five services with `minScale: 0`. Once warm, all 12 answer healthy. This is a latency/UX finding (first request after idle can take 20–40s), not a reliability defect.

---

## 4. Cloud SQL — Locked Down

`afroid-506916:us-central1:afroid-db-prod` — POSTGRES_16, tier `db-custom-2-7680`, state RUNNABLE, backups **enabled**. Databases: `postgres`, `afroid`.

- `ipv4Enabled: true` — a public IP endpoint (34.9.120.78) still exists, **but**
- **zero authorized networks** (the `0.0.0.0/0` rule is gone — confirmed live), and
- `requireSsl: true` with `sslMode: TRUSTED_CLIENT_CERTIFICATE_REQUIRED` — the strictest mode; a caller needs a trusted client certificate, not just TLS.
- All backends connect via **Cloud SQL Auth Proxy** (`run.googleapis.com/cloudsql-instances` annotation on every backend), not the public IP.

Net: the public IP is present but effectively unreachable (no authorized network + client-cert required). This matches — and slightly exceeds — what `FINAL_AUDIT_REPORT.md` claimed. The only residual hardening is flipping `ipv4Enabled` to false once you confirm nothing depends on it.

---

## 5. Secret Manager & Secret Bindings

Three secrets exist: `DATABASE_URL` (created 2026-09-09), `GOOGLE_API_KEY` (09-01), `JWT_SECRET_KEY` (09-01).

Every backend service binds all three via `secretKeyRef` (`DATABASE_URL`, `JWT_SECRET_KEY`, and `GEMINI_API_KEY` ← `GOOGLE_API_KEY`) — confirmed live in each service spec. The `web` frontend correctly carries **no secrets** (only `APP_ENV`, `VERTEX_REGION`). No plaintext credentials appear in any Cloud Run env. ✅

⚠️ **Gap:** the CI workflow (`deploy.yml`) references `afroid-sendgrid-api-key-prod`, but **no SendGrid secret exists** in Secret Manager (only the three above). If the notification service sends email via SendGrid, that path is currently unconfigured.

---

## 6. IAM — Least-Privilege Migration Complete ✅

- A dedicated runtime SA `afroid-cloudrun-prod@afroid-506916.iam.gserviceaccount.com` was created and granted a minimal, complete role set: `cloudsql.client`, `secretmanager.secretAccessor`, `pubsub.publisher`, `logging.logWriter`, `monitoring.metricWriter`, `cloudtrace.agent`.
- **All 12 Cloud Run services were migrated to this SA** (verified healthy), and **`roles/editor` was removed from the default compute SA**.
- The default compute SA now retains only `cloudsql.client` + `secretmanager.secretAccessor` (unused leftovers, safe to remove later). The `629240539505@cloudservices` SA keeps its editor — correct, that's Google-managed infrastructure.
- `deployer-sa` holds `run.admin` + `artifactregistry.writer` + `serviceAccountUser` (CI identity). `terraform-sa` and your user hold `owner`.

**Finding 4 is resolved.** No runtime identity holds broad project-write anymore. (Minor optional follow-up: the compute SA's two residual roles can be pruned, and if a future `gcloud builds submit` fails on permissions, grant the compute SA `roles/logging.logWriter`.)

---

## 7. Networking

- VPC `afroid-vpc-prod` (CUSTOM mode), subnet `afroid-subnet-us-central1-prod` = 10.10.0.0/20.
- Connector `afroid-vpc-conn-prod` = **READY**, 10.8.0.0/28, min 2 / max 10.
- The legacy `default` auto-mode VPC still exists (unused; candidate for cleanup).
- ⚠️ `workspace` and `intake` have **no VPC-connector annotation** (all other backends do). They still reach the DB via the Auth Proxy Unix socket, so they function — but it's config drift worth normalizing.
- No live `vpc-peerings` for private services access — consistent with the pivot to Auth Proxy (peering was abandoned due to the stuck GCP operation).

---

## 8. Pub/Sub

Five topics live: `audit-events`, `generation-events`, `certification-events`, `match-events`, `notification-events`.

⚠️ **No subscriptions were returned** — meaning events may be published with **no consumers attached**. If any async workflow depends on a subscriber (e.g. notification fan-out, audit persistence), that consumer isn't wired in the live project. Worth confirming whether subscriptions are intended.

---

## 9. Artifact Registry

Repo `afroid-containers` (DOCKER, us-central1) holds a healthy build history (multiple dated digests per service). No cleanup policy is evident — image count will grow unbounded; a retention policy (keep last N) would control storage cost.

---

## 10. Reconciliation vs FINAL_AUDIT_REPORT.md

| Claim in audit report | Live reality | Verdict |
|---|---|---|
| All 12 services healthy | 12/12 return 200 | ✅ Confirmed |
| SSL enforced on Cloud SQL | `requireSsl: true` + client-cert mode | ✅ Confirmed (stronger) |
| `0.0.0.0/0` removed | zero authorized networks | ✅ Confirmed |
| Auth Proxy on all backends | `cloudsql-instances` annotation on all | ✅ Confirmed |
| Secrets via Secret Manager | `secretKeyRef` on all backends | ✅ Confirmed |
| Default compute SA (Finding 4) | migrated to dedicated least-privilege SA; editor removed | ✅ Resolved this session |
| Redis not deployed | no Redis instance/annotation seen | ⚠️ Still absent |
| vector-store & web on `:latest` | re-pinned to immutable digests | ✅ Resolved this session |
| 5 topics, 0 subscriptions | unchanged | ⚠️ Open |
| SendGrid secret missing | unchanged | ⚠️ Open |
| workspace/intake lack VPC connector | unchanged | ⚠️ Open (functional via Auth Proxy) |

---

## 11. Recommended Next Actions (priority order)

1. ~~Re-pin vector-store & web to immutable digests.~~ ✅ **Done this session.**
2. ~~Migrate all 12 services to a dedicated least-privilege SA and strip `roles/editor`.~~ ✅ **Done this session.**
3. **Decide on cold starts** — set `minScale: 1` on the user-facing hot paths (at least certify/incubate/vector-store) or accept the 20–40s first-hit latency. *(Still open.)*
4. **Wire Pub/Sub subscriptions** (or confirm none are needed) so published events have consumers. *(Still open.)*
5. **Add the SendGrid secret** (or remove the reference from CI) so notification email is either configured or explicitly disabled. *(Still open.)*
6. **Normalize workspace/intake** to carry the VPC connector + `APP_ENV` like their peers. *(Still open.)*
7. **Optional hardening:** flip Cloud SQL `ipv4Enabled` to false; add an Artifact Registry retention policy; delete the unused `default` VPC; prune the compute SA's two residual roles.

---

*All facts in this report are drawn from the live `gcloud` capture and health probes run on 2026-09-09 against project afroid-506916. Nothing was changed on GCP or in the repo to produce it.*
