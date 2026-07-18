---
title: META-HEALTH HERMES-DOWN false alarm — live-probe gate
type: lesson
slot: sierra
created: 2026-06-29
commit: a5b71672f9
tags: [meta-health, hermes, false-positive, live-probe, reconcile-zulu-ledger, system-viz]
related:
  - hermes-util-u-hermes-health-root-path-fix
  - reference_mcp_kickoff_falsepos_liveprobe_fix
  - reference_zulu_hermes_recency_gate_2026_06_23
---

# META-HEALTH HERMES-DOWN false alarm — live-probe gate

## Symptom
Every fleet SessionStart surfaced `## Meta-systems health -- HERMES [DOWN] -- 10 ask-hermes calls, 9 fail (90.0% fail), last activity 2.4h ago`, while the proxy was actually **live and healthy** (`/health` → `{status:"ok", authenticated:true}`, 200).

## Root cause
`gradeHermesUtilization` in `scripts/reconcile-zulu-ledger.mjs` graded the lane `DOWN` purely from a **lifetime-cumulative** fail-rate: `failRate = bySource.fail / fired` (9/10 = 90% > the 10% `META_HERMES_MAX_FAIL_RATE` threshold). The counters in `ollama-offload-stats.json byHook["ask-hermes"]` are monotonic-forever — they never window or decay — so a transient outage (the proxy was down ~2.4h ago; those 9 failures accrued) pins `DOWN` until ~80 successful calls dilute the lifetime ratio. The function's own comment even codified it: *"a high FAIL rate -> DOWN regardless of recency."* That conflates a historical failure ratio with current health.

This is the same false-positive class as the brain-refresh false-FAILED alarms and bravo's MCP-kickoff fix: **a stale-prone signal actuating a fleet-wide alarm with no live evidence at decision time.**

## Fix
Doctrine: **require positive DOWN evidence from a live probe at decision time** ([[reference_mcp_kickoff_falsepos_liveprobe_fix]]).

- `checkHermesProxy(url, timeoutMs)` — timeout-bounded (2500ms, `AbortController`, never throws) GET of the proxy `/health`. Returns `{ok, httpStatus, authenticated, error}`. `ok` = HTTP 2xx **and** body `status === "ok"`.
- `hermesHealthUrl(base)` — origin-strips a `/v1`-suffixed base so the probe hits the **root** `/health`. **Critical**: the fleet default `PRISM_HERMES_PROXY_URL` is `/v1`-suffixed (`ask-hermes.mjs`, `hermes-proxy-health-inject.mjs`), and the proxy serves `/health` at the origin root only — `/v1/health` 404s. Without the strip the fix would re-introduce the exact false DOWN (caught by per-file scrutiny arm A). Mirrors the proven `healthUrlFor()` ([[hermes-util-u-hermes-health-root-path-fix]]).
- `gradeHermesUtilization(stats, nowMs, liveProbe=null)` — a high lifetime fail-rate is now SUSPICION:
  - `liveProbe.ok === true` → recovered → grade by recency (fresh = UTILIZED, stale = UNDER), never DOWN.
  - `liveProbe.ok === false` → ledger + probe agree → confirmed DOWN.
  - `liveProbe == null` → ledger-only DOWN preserved (back-compat for non-live callers + fixture tests).
- `reconcileMetaSystemsLive()` (async) — probes **lazily**, only when a pure pre-grade says the ledger would alarm DOWN (zero network on the healthy path). The `meta-systems-health-inject.mjs` SessionStart hook + the `reconcile()` runner adopt it; all non-hermes verdicts are identical to the sync path.

## Validation
Under the fleet's real `/v1` env: probe derives `http://127.0.0.1:8645/health`, `ok:true` → hermes `UTILIZED`, inject silent. The **sync** path over the same ledger still reports `DOWN` — proving the live gate is load-bearing, not cosmetic. 36/36 tests (6 new). Per-file 2-arm scrutiny PASS.

## Apply-to-all audit (R15 — siblings checked, Hermes was unique)
The other three meta-system graders in the same file were audited for the same lifetime-cumulative false-alarm class — **none share it**:
- `gradeOllamaUtilization` — `DOWN` only when `ollama-offload-stats.json` is unreadable (a real-time read failure, self-correcting); already recency-gates "utilized" on `lastUpdated`. No fail-rate DOWN.
- `gradeOctopusUtilization` — has **no `DOWN`** verdict; gates on drain RECENCY (`newestJsonlTs`), not lifetime count. A stalled drain is a real present-time condition.
- `gradeObsidianUtilization` — `DOWN` only when the synthesis dir is unreadable (real-time read). Count-gated otherwise.

Hermes was the **only** grader deriving a verdict from a cumulative-forever counter (`bySource.fail / fired`), which is exactly the property that lets a recovered outage keep alarming. So the live-probe gate is correctly Hermes-scoped; no sibling fix needed.

### Fleet-wide health-inject hook audit (2026-06-29, slot:sierra)
The lesson generalizes to a rule — *a fleet alarm hook must not fire off a stale/cumulative signal without a live re-check at decision time*. All 7 SessionStart/UserPromptSubmit health-inject hooks were audited for the anti-pattern; **none other shares it**:

| Hook | How it avoids the stale-alarm bug |
|---|---|
| `meta-systems-health-inject` | live `/health` probe gate (this fix) |
| `hermes-proxy-health-inject` | already live-probes `/health` (`healthUrlFor`) |
| `substrate-health-inject` | TTL-bounded cache → re-runs the live `declared-vs-actual` spawnSync when stale (never alarms off a stale cache) |
| `nn-graph-health-inject` | `if (ageMs > staleMs) return null` — goes **silent** when the eval is stale |
| `sierra-graph-health-inject` | `SURFACE_WINDOW_MS` recency gate — silent if the warning is stale |
| `sessionstart-graph-staleness-inject` | last-event-wins (`failureTs > sentinelTs`) — self-corrects on the next successful regen |
| `brain-health-inject` | already hardened against false-FAILED alarms (prior sierra fixes) |

Conclusion: the cumulative-forever-counter-without-live-probe bug was unique to Hermes. The other hooks either freshness-gate-to-silent, use a recency window, last-event-wins, or live-probe. No further fix needed — the rule is satisfied fleet-wide.

## Takeaways
1. A stale-prone cumulative counter must never actuate a fleet-wide alarm on its own — gate the verdict on a live probe at decision time.
2. Any Hermes-proxy probe MUST origin-strip the `/v1` API base before `/health`.
3. Keep the probe lazy (only when the cheap signal would alarm) so the healthy path stays IO-free.
4. This fixes the MONITOR, not the substrate — orthogonal to fixing the actual proxy/cron.
