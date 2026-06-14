---
name: reference_stop_regression_bundle_timeout_starvation_2026_06_09
description: "stop_on_hook_unregistration (anti-hook-removal Stop gate) times out in-bundle EVERY loaded Stop → gate silently OFF. Root cause: the hook is FAST standalone (110ms, stable ×3) but starves past its 5000ms bundle budget under the Stop fork-storm (~6 detached procs spawn every Stop + 10 concurrent regression hooks ×N chats). Fix needs the real in-bundle time measured first (timeout bump is a guess without it). Stop-hot-path = careful change."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.957Z
aliases: reference_stop_regression_bundle_timeout_starvation_2026_06_09
---


**2026-06-09 (slot golf, synergy /goal — HOOKS surface, recurring degradation).** Every Stop this session emitted: `⚠ stop-regression-bundle: 1 gate(s) NOT evaluated this turn (timeout/crash): stop_on_hook_unregistration`. Investigated (was treating it as noise — it is a real gap).

**THE GATE THAT'S OFF:** `.claude/hooks/stop_on_hook_unregistration.mjs` — diffs `H:/.claude/settings.json` against a SessionStart baseline (`mcp-server/data/state/settings-baseline-{sid}.json`) and BLOCKS if a session silently removed hooks (exit 2). It is the anti-regression protection for the hook stack itself. When it's "NOT evaluated," a chat could unregister hooks and nothing catches it.

**ROOT CAUSE — timeout-starvation under the Stop fork-storm, NOT a broken hook:**
- Standalone the hook is FAST + STABLE: **108 / 113 / 111 ms** across 3 runs (reads a 61KB settings.json + baseline + scans `.claude/hooks/bundles/*.mjs` for `bundleAbsorbedHookNames` — all cheap I/O).
- `.claude/hooks/bundles/stop-regression-bundle.mjs:55` budgets it **5000ms**, runs all 10 regression hooks **concurrently** (`Promise.all`, line 68).
- But every Stop ALSO spawns ~6 detached procs ([[reference_fleet_reaper|fleet-reaper]], fleet-task-health, wiki-watchdog, consolidate-graph, obsidian-memory-feed, …) — ×N concurrent chats on a 26-slot-fleet box. Under that fork-storm a 110ms hook can't get CPU/IO within 5000ms → the bundle marks it timed-out and fails-OPEN for that gate (line 97).
- It happened on EVERY Stop this session (~8 consecutive) → the gate is effectively ALWAYS off on a loaded box, not an occasional flap.

**FIX (fresh-budget, careful — Stop HOT PATH):** the in-bundle completion time is UNKNOWN (only that it's >5000ms) — so a blind timeout bump (5000→Nms) is a guess; N could be 6s or 50s. Step 1 = MEASURE the real in-bundle time (instrument `runHook` to log elapsed even on timeout, or reproduce the Stop fork-storm load). Then choose: (a) bump THIS gate's timeout to cover the measured p95 (cheap, but slows Stop under load — acceptable for a security gate); (b) run the regression bundle BEFORE the Stop chain spawns its detached procs (removes the contention source — better, needs Stop-chain ordering change); (c) reduce the Stop fork-storm itself (the detached procs are the load — but each is load-bearing: reaper/task-health/wiki/consolidate/obsidian-feed). Likely (a)+(b). Do NOT change the Stop hot path without measuring + testing under real concurrent-chat load — a wrong timeout slows every chat's Stop or still starves.

**Broader pattern:** the Stop-time fork-storm (~6 detached spawns × N chats) is the shared root that starves the CONCURRENT regression-bundle hooks. Sister to the box-load hypothesis in [[reference_systemviz_find_heap_oom_2026_06_09]] (find OOMing at a suspiciously-low ~390MB hinted at load pressure too). The [[reference_fleet_reaper|fleet-reaper]] exists to manage fork-storms, but the Stop chain is itself a fork-storm SOURCE. Related: [[reference_infra_health_verified_2026_06_09]].

---

## CORRECTION (2026-06-09 later, slot golf, U-HOOK-UNREG-PROTOCOL-FIX `29fb555f13`) — the timeout-starvation diagnosis above was WRONG.

The "times out in-bundle under fork-storm load" hypothesis is **incorrect**. The real root cause is a **PROTOCOL MISMATCH**, no timeout involved — proven by reading the hook + bundle end-to-end (the 110ms-standalone clue should have pointed here immediately; I initially over-fit it to contention):

- `stop_on_hook_unregistration.mjs` used the **exit-code protocol**: allow → `exit(0)` with **EMPTY stdout**; block → human box to **stderr** + `exit(1)`. JSON was emitted ONLY in its `catch` (exception) path.
- `stop-regression-bundle.mjs:99` keys "evaluated" on **parsed STDOUT JSON** (`if (!r || !r.parsed) unevaluated.push(name)`), and "block" on `p.continue===false` (line 102) — it **ignores the exit code**. The bundle's warning string literally says "timeout/**crash/non-JSON**" — the "non-JSON" case (empty stdout) is what fired, not a timeout.
- So EVERY allow (the normal state — `removed` empty) → empty stdout → `r.parsed` null → "NOT evaluated" every Stop. And a REAL block (exit 1 + stderr) → empty stdout → the bundle never saw `{continue:false}` → **the gate could not actually block** an unregistration. The security gate was a **no-op through the bundle** (its only wiring; 0 standalone settings.json refs).

**FIX (shipped):** pure `buildVerdict(removed)` → `{continue:true}` | `{continue:false, stopReason, systemMessage}`, emitted on stdout at EVERY exit path (allow / no-baseline / can't-read / block) + an `isMain` guard (so importing it for tests doesn't run main()+exit). 4 tests (3 pure branches + 1 subprocess integration: stdout is now parseable JSON, was empty). LIVE: hook now emits `{"continue":true}`; bundle will count it EVALUATED + can now act on a real block. **Lesson: when a fast-standalone process is reported "timeout" by a wrapper, suspect the wrapper's success-detection contract (stdout/exit protocol) BEFORE assuming load — read the consumer's parse logic.** The fork-storm framing above was a red herring (the hook never needed >5s; it just never emitted what the bundle parses).
