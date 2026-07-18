---
type: "chat-session"
source: "claude-code-cli"
session_id: "9dc5dad7-e869-411c-85c2-6ec48aff4a2c"
title: "Per-file scrutiny gate for FLEET-REAPER-MS3/U-FR-MS3-D — INTEGRATION review (Arm"
date: "2026-05-20"
first_ts: "2026-05-20T02:18:12.073Z"
last_ts: "2026-05-20T02:19:31.237Z"
cwd: "H:\\PRISM"
messages: 18
user_msgs: 8
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/9dc5dad7-e869-411c-85c2-6ec48aff4a2c/subagents/agent-a2ddff771a2418041.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Per-file scrutiny gate for FLEET-REAPER-MS3/U-FR-MS3-D — INTEGRATION review (Arm

> **claude-code-cli** | 2026-05-20 | 18 msgs (8 user / 10 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/9dc5dad7-e869-411c-85c2-6ec48aff4a2c/subagents/agent-a2ddff771a2418041.jsonl`

## Transcript

### User | 2026-05-20T02:18:12.073Z

Per-file scrutiny gate for FLEET-REAPER-MS3/U-FR-MS3-D — INTEGRATION review (Arm B, independent second-pass).

Review the wiring edit to `H:/PRISM/scripts/fleet-reaper-sweep.mjs`:

1. New import block near line 97 (after the host-presets import):
   ```js
   import {
     beginBackgroundMode as _beginSelfIoGuard,
     endBackgroundMode as _endSelfIoGuard,
     registerExitRestore as _registerSelfIoExitRestore,
   } from "./lib/reaper-self-io-priority.mjs";
   ```

2. Inside `export function runSweep(opts = {})` (starts at line 1320 post-edit):
   - 4 new lines after the existing var declarations (dryRun etc.) that engage the guard
   - A `try {` wrapping the existing 560-line body
   - A `} finally { _endSelfIoGuard(_ioGuard); }` after the existing `return { ... };` and before the closing `}` of runSweep

Test result: 77/77 across 4 fleet-reaper test files (`fleet-reaper-self-bg-io.test.mjs` + `fleet-reaper-tier.test.mjs` + `fleet-reaper-ballast.test.mjs` + `fleet-reaper-hunt.test.mjs`).

Weight this review toward integration concerns Arm A is unlikely to catch:
- Does the try/finally placement cover ALL return paths in runSweep? The function returns once at the original line 1903 (now wrapped); confirm no early returns / throws would bypass the finally.
- Does the wrap break the existing test injection contract (`runSweep({ enumerator, slotsFile, dryRun, ... })`) — i.e., do the existing 200+ tests still treat the function shape as before? (Confirmed via 77/77 pass.)
- Does the beforeExit hook leak across vitest workers / contaminate other tests? (Look at `_resetForTest` in the helper.)
- Is `dryRun` correctly forwarded — note that runSweep itself derives `dryRun` from `!!opts.dryRun || process.env.PRISM_FLEET_REAPER_DRY_RUN === "1"` before the guard begin call, so a test-injected dryRun:true correctly skips engagement.
- Hidden coupling: any code in runSweep that itself does `process.exit()` (none expected — it returns a value) would bypass the finally; the registe
... [+541 chars truncated]

### Assistant | 2026-05-20T02:18:28.158Z

I'll review this integration carefully, focusing on what Arm A is unlikely to catch.

### Assistant | 2026-05-20T02:18:29.214Z

[tool_use: Read]

### Assistant | 2026-05-20T02:18:29.682Z

[tool_use: Read]

### User | 2026-05-20T02:18:34.450Z

[tool_result] 1	/**
2	 * Reaper self I/O priority guard — FLEET-REAPER-MS3/U-FR-MS3-D.
3	 *
4	 * Drops the reaper process's CPU priority for the duration of a sweep so its
5	 * file-I/O does not compete with claude.exe for the disk-queue on a memory-
6	 * pressured host. Reversible (try/finally + beforeExit hook) and idempotent.
7	 *
8	 * HONEST SCOPE (R12 — fail loud, don't ship features that don't do what the
... [+8035 chars truncated]

### User | 2026-05-20T02:18:34.544Z

[tool_result] 85	// FLEET-REAPER-MS3/U-FR-HOST-PRESETS: per-PC env overlay so the same code does
86	// the right thing on dissimilar PCs (home: 16GB GPU + 7B model + 90% mem floor;
87	// work: 8GB GPU + 3B model + 85% mem floor). Loaded ONCE at module top so the
88	// scheduled task (which has no shell env-init step) picks up the preset on
89	// every run. Env always wins over preset (operator override preserve
... [+1481 chars truncated]

### Assistant | 2026-05-20T02:18:43.035Z

[tool_use: Read]

### Assistant | 2026-05-20T02:18:43.724Z

[tool_use: Read]

### User | 2026-05-20T02:18:45.919Z

[tool_result] 1315	 *   readMemory      injectable host-memory reader
1316	 *   killer          injectable process killer
1317	 *   ledgerPath, ledgerLockPath  injectable ledger paths
1318	 * @returns {object} the sweep result (see summarize() for the shape consumers use)
1319	 */
1320	export function runSweep(opts = {}) {
1321	  const now = Number.isFinite(opts.now) ? opts.now : Date.now();
1322	  const mode =
... [+1846 chars truncated]

### User | 2026-05-20T02:18:45.926Z

[tool_result] 1880	    underPressure,
1881	    pressureTier,
1882	    criticalPressure,
1883	    blockedBy,
1884	    slots: snap.counts,
1885	    slotsResolved: snap.slotsResolved !== false,
1886	    caveats,
1887	    candidates: candidateReport,
1888	    // --hunt: full Task-Manager view of every target process. Built only for
1889	    // the hunt mode so the normal/JSON sweep output is not bloated.
1890	    h
... [+1693 chars truncated]

### Assistant | 2026-05-20T02:18:52.112Z

[tool_use: Grep]

### Assistant | 2026-05-20T02:18:53.087Z

[tool_use: Grep]

### User | 2026-05-20T02:18:54.283Z

[tool_result] 126:  return result.procs;
272:  return "powershell.exe";
305:        return finalizeMemory(JSON.parse(String(raw || "{}").trim() || "{}"));
314:      return m ? Number(m[1]) : null;
319:    return finalizeMemory({
324:    return finalizeMemory({});
330:  return Math.round(((total - free) / total) * 1000) / 10; // one decimal place
341:  return {
360:      return { schemaVersion: LEDGER_SCHEMA_VER
... [+8056 chars truncated]

### User | 2026-05-20T02:18:54.391Z

[tool_result] 569:      // never throw out of runSweep (which is called from the Stop hook and
957:    return null; // no NVIDIA GPU / driver absent / timeout — degrade, never throw
1001:    return null; // daemon down / curl absent / timeout — degrade, never throw
1332:  // process.exit() (Tier-1 ballast release exit path).
1437:      // the killer is injectable — but never let a kill-path throw escape
1907:  
... [+239 chars truncated]

### Assistant | 2026-05-20T02:18:59.630Z

Good. The `process.exit()` calls at 2964/3032/3060 are all in the CLI `main()` shell, not inside `runSweep`. The only return in runSweep is the wrapped one at 1869. Let me verify the early-exit branches inside runSweep are absent.

### Assistant | 2026-05-20T02:19:01.054Z

[tool_use: Read]

### User | 2026-05-20T02:19:02.913Z

[tool_result] 1430	          ownerStatus: c.ownerStatus, rssBytes: c.rssBytes,
1431	          killed: !!k.killed, dryRun: !!k.dryRun, error: k.error || null,
1432	          errorClass: k.errorClass || (k.killed ? "ok" : classifyKillError(k.error)),
1433	        };
1434	      });
1435	    } catch (err) {
1436	      // Defense in depth: windowsKill/posixKill already guard themselves, and
1437	      // the killer 
... [+1186 chars truncated]

### Assistant | 2026-05-20T02:19:31.237Z

# Arm B — Independent Integration Review

**File:** `H:/PRISM/scripts/fleet-reaper-sweep.mjs` + `H:/PRISM/scripts/lib/reaper-self-io-priority.mjs`

## Findings

### P2 — vitest cross-worker hook leak (helper:157-185)

`_exitHookInstalled` is module-private state. Across multiple vitest test files in the same worker, the first registerExitRestore wires `beforeExit`/`exit` listeners; subsequent suites that don't call `_resetForTest()` inherit installed=true and PUSH guards onto a flush list that fires at worker exit. This is benign in practice (each guard is one-shot via `engaged=false`) but if a test injects a mock guard with `engaged:true` and never restores, the worker-exit hook calls `endBackgroundMode` with `platform=process.platform`, which on a Win32 dev box could perform a real `os.setPriority(0,0)` call on the vitest worker. The helper's `_resetForTest` exists but isn't enforced by an `afterEach`. **Recommend**: documented contract that suites importing this helper MUST call `_resetForTest()` in `beforeEach`/`afterEach`. The 77/77 pass confirms current suites do this; no blocker for ship.

### P2 — finally bypass at process.exit (sweep:2964/3032/3060)

The finally covers all returns inside runSweep (only one return at 1869, plus the in-body try/catch at 1435-1441 which doesn't rethrow). However, `main()` CLI path (line 3032) calls `process.exit(result.ok ? 0 : 1)` AFTER runSweep returns — finally already ran. Safe. The `registerExitRestore` beforeExit/exit hook is the documented safety net for abnormal exit paths and is correctly engaged via `if (_ioGuard.engaged)` at sweep:1334. 

### P3 — re-entrancy noted but unverified by test integration

The wiring comment at 1330 says "re-entrancy returns engaged:false" but `beginBackgroundMode` does NOT check whether the process is already at BELOW_NORMAL — calling `setSelfPriority("BELOW_NORMAL")` twice still returns `applied:true` both times. Restore-on-inner endBackgroundMode would then restore to NORMAL while the 
... [+1144 chars truncated]
