---
type: "chat-session"
source: "claude-code-cli"
session_id: "23c10eea-c03b-414f-9e26-380e20195aee"
title: "Independent second-pass review of FLEET-REAPER-MS1 / U-FR-TIER1-MEM-BALLAST in t"
date: "2026-05-17"
first_ts: "2026-05-17T17:21:02.905Z"
last_ts: "2026-05-17T17:23:54.328Z"
cwd: "H:\\prism"
messages: 52
user_msgs: 18
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism/23c10eea-c03b-414f-9e26-380e20195aee/subagents/agent-ad8fce416f72aa5a9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Independent second-pass review of FLEET-REAPER-MS1 / U-FR-TIER1-MEM-BALLAST in t

> **claude-code-cli** | 2026-05-17 | 52 msgs (18 user / 34 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/23c10eea-c03b-414f-9e26-380e20195aee/subagents/agent-ad8fce416f72aa5a9.jsonl`

## Transcript

### User | 2026-05-17T17:21:02.905Z

Independent second-pass review of FLEET-REAPER-MS1 / U-FR-TIER1-MEM-BALLAST in the PRISM fleet-reaper. Do NOT assume a prior reviewer caught everything; weight toward integration, hidden coupling, lifecycle/state-machine soundness, convention conformance, and test integrity.

Files (read fully):
1. H:/prism/scripts/fleet-reaper-sweep.mjs — this unit adds: `DEFAULT_BALLAST_MB=256`/`MAX_BALLAST_MB=4096`; module state `_ballast`/`_ballastReleased`/`_ballastBytes`; pure `ballastAction(...)`; `ensureBallast`/`releaseBallast`/`__resetBallastForTest`; `resolveConfig.ballastMb` (env `PRISM_FLEET_REAPER_BALLAST_MB`); boot reserve in `main()` (gated `!args.status`); per-sweep `releaseBallast(...)` + `result.ballast` in BOTH the single-sweep path and `monitorLoop`; surfacing in `isNoteworthy`/`monitorEvent`/`summarize`; usage()/JSDoc.
2. H:/prism/scripts/__tests__/fleet-reaper-ballast.test.mjs — 18 node:test cases.

Specifically check:
- LIFECYCLE SOUNDNESS: trace the full state machine across a monitorLoop: boot(allocate) → N×non-critical(hold) → critical(release+latch) → subsequent sweeps(noop forever). Is there ANY input ordering where it re-allocates after release, double-frees, or leaks? Is `_ballastBytes` correctly zeroed on release so a stale freedMb can't be reported twice?
- INTEGRATION: `releaseBallast` is called with `result.pressureTier`. Confirm `runSweep`'s result actually carries `pressureTier` (from the prior U-FR-TIER1-AGGRESSIVE-THRESHOLDS unit, already shipped at f4ab9e01d9) — if pressureTier were ever undefined, what does ballastAction do? (undefined !== "critical" → hold; verify that's safe). Confirm `result.ballast` is attached BEFORE `isNoteworthy(result)` is evaluated in both call sites (ordering bug would make a release silently non-noteworthy).
- The single-sweep path attaches result.ballast only when `mode !== "status"`; monitorLoop always calls releaseBallast. Are these two paths consistent? Does `--status` truly never allocate (ensureBallast skippe
... [+1599 chars truncated]

### Assistant | 2026-05-17T17:21:11.453Z

I'll review FLEET-REAPER-MS1 / U-FR-TIER1-MEM-BALLAST thoroughly. Let me read both files completely.

### Assistant | 2026-05-17T17:21:11.847Z

[tool_use: Read]

### Assistant | 2026-05-17T17:21:12.304Z

[tool_use: Read]

### User | 2026-05-17T17:21:12.541Z

[tool_result] File content (41672 tokens) exceeds maximum allowed tokens (25000). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### User | 2026-05-17T17:21:13.220Z

[tool_result] 1	/**
2	 * fleet-reaper-ballast.test.mjs — FLEET-REAPER-MS1 / U-FR-TIER1-MEM-BALLAST.
3	 *
4	 * Verifies the critical-pressure memory ballast: the pure `ballastAction`
5	 * state machine + the imperative `ensureBallast` / `releaseBallast` shells +
6	 * the one-shot latch invariant.
7	 *
8	 * Coverage floor:
9	 *   - every ballastAction branch (disabled / noop / allocate / hold / release)
10	 *   -
... [+6767 chars truncated]

### Assistant | 2026-05-17T17:21:17.139Z

The test file is fully read. I have prior knowledge of fleet-reaper-sweep.mjs from 2s ago but need the specific ballast implementation. Let me read the targeted sections.

### Assistant | 2026-05-17T17:21:18.414Z

[tool_use: Grep]

### User | 2026-05-17T17:21:19.005Z

[tool_result] 60: *   PRISM_FLEET_REAPER_BALLAST_MB=N default 256 (0 disables the cushion)
127:// FLEET-REAPER-MS1 Tier 1: critical-pressure memory ballast. A Buffer reserved
134:// PowerShell enumeration can fail). Knob: PRISM_FLEET_REAPER_BALLAST_MB (0=off).
135:export const DEFAULT_BALLAST_MB = 256;
136:const MAX_BALLAST_MB = 4096;
1118:  const { tier: pressureTier, effectiveKillAfter } = tierFromPressure(
1
... [+3355 chars truncated]

### Assistant | 2026-05-17T17:21:22.421Z

Now let me read the specific implementation sections with full context.

### Assistant | 2026-05-17T17:21:23.231Z

[tool_use: Read]

### User | 2026-05-17T17:21:23.699Z

[tool_result] read-once-guard: 'H:\prism\scripts\fleet-reaper-sweep.mjs' (same offset/limit) was already read 14s ago in this session and is unchanged (mtime 1779038331389). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_
... [+8 chars truncated]

### Assistant | 2026-05-17T17:21:27.644Z

The guard thinks I read it but I only ran Grep. Let me read the specific implementation with a slightly different range.

### Assistant | 2026-05-17T17:21:28.024Z

[tool_use: Read]

### User | 2026-05-17T17:21:29.212Z

[tool_result] 1470	// ── FLEET-REAPER-MS1 Tier 1: ballast state machine ──
1471	// Module-scoped (one reservation per process — the monitor loop sweeps many
1472	// times against the same process). Pure decision + thin imperative shell so the
1473	// state machine is unit-testable without ever allocating a byte.
1474	let _ballast = null;          // Buffer | null — the live reservation
1475	let _ballastReleased
... [+3222 chars truncated]

### Assistant | 2026-05-17T17:21:34.556Z

Now the call sites and integration points. Let me read the runSweep result, monitorLoop, single-sweep path, and main().

### Assistant | 2026-05-17T17:21:34.937Z

[tool_use: Read]

### User | 2026-05-17T17:21:36.091Z

[tool_result] 1549	function clampInt(value, fallback, min, max) {
1550	  // `null` and `undefined` must short-circuit to fallback BEFORE Number() —
1551	  // `Number(null) === 0` which is finite, so without this guard a null upstream
1552	  // (e.g. envInt() returning null for an unset env var, then `?? null`) silently
1553	  // clamps to `min` instead of using the meaningful default. That bug
1554	  // manifes
... [+653 chars truncated]

### Assistant | 2026-05-17T17:21:39.429Z

Now the integration call sites - the single-sweep path (~1790-1810) and monitorLoop (~1960-1990).

### Assistant | 2026-05-17T17:21:40.189Z

[tool_use: Read]

### User | 2026-05-17T17:21:41.081Z

[tool_result] 1780	
1781	const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
1782	
1783	async function monitorLoop(cfg) {
1784	  const intervalMs = clampInt(cfg.intervalSec, DEFAULT_INTERVAL_SEC, MIN_INTERVAL_SEC, MAX_INTERVAL_SEC) * 1000;
1785	  // One armed-event so the Monitor tool shows the watch is live.
1786	  process.stdout.write(
1787	    `[${new Date().toISOString()}] fleet-reaper monitor arme
... [+1326 chars truncated]

### Assistant | 2026-05-17T17:21:44.612Z

Now the main() boot reserve + single-sweep path. Let me read from ~1940 onward.

### Assistant | 2026-05-17T17:21:45.199Z

[tool_use: Read]

### User | 2026-05-17T17:21:46.472Z

[tool_result] 1940	      { detached: true, stdio: "ignore", windowsHide: true },
1941	    );
1942	    child.unref();
1943	    process.stdout.write(`fleet-reaper-sweep: detached sweep spawned (pid ${child.pid ?? "?"})\n`);
1944	    return;
1945	  }
1946	
1947	  const cfg = resolveConfig(args);
1948	
1949	  // FLEET-REAPER-MS1 Tier 1: reserve the critical-pressure ballast at CLI boot.
1950	  // Skipped for --stat
... [+2001 chars truncated]

### Assistant | 2026-05-17T17:21:53.549Z

Now let me verify the integration claim: `runSweep` returns `pressureTier`. I saw line 1413 `pressureTier,` in the result object and line 1118-1125 deriving it. Let me confirm the full result construction and check `isNoteworthy`/`monitorEvent`/`summarize` ballast surfacing.

### Assistant | 2026-05-17T17:21:54.258Z

[tool_use: Read]

### User | 2026-05-17T17:21:55.624Z

[tool_result] 1400	
1401	  return {
1402	    ok,
1403	    now,
1404	    mode,
1405	    disabled,
1406	    dryRun,
1407	    config: {
1408	      intervalSec, ageFloorSec, killAfter, effectiveKillAfter, memPressurePct,
1409	      memCriticalPct, softReliefAgeSec, softReliefPressurePct, noRelief, noCoord,
1410	    },
1411	    mem,
1412	    underPressure,
1413	    pressureTier,
1414	    criticalPressure,
1415	    b
... [+148 chars truncated]

### Assistant | 2026-05-17T17:21:59.105Z

`runSweep` returns `pressureTier` in its result object. Let me check `isNoteworthy`, `monitorEvent`, `summarize` context around the ballast lines (1635, 1728, 1751).

### Assistant | 2026-05-17T17:21:59.739Z

[tool_use: Read]

### User | 2026-05-17T17:22:01.582Z

[tool_result] 1620	function isNoteworthy(result) {
1621	  const sr = result.softRelief;
1622	  const co = result.coordinator;
1623	  return (
1624	    result.reaped.length > 0 ||
1625	    result.underPressure ||
1626	    result.caveats.length > 0 ||
1627	    !result.ok ||
1628	    // FLEET-REAPER-MS1: a degraded chat-slots read suppresses leftover-bash-task
1629	    // classification — safety-relevant, always s
... [+1048 chars truncated]

### Assistant | 2026-05-17T17:22:10.507Z

Now `isNoteworthy` only flags ballast when `state === "released"`. Note: `underPressure` is true when `pressureTier !== "normal"`, so at critical the result is *already* noteworthy via `result.underPressure`. The ballast clause is belt-and-suspenders. Good.

Let me check the ordering concern: in monitorLoop, `result.ballast` is set at line 1801 BEFORE `isNoteworthy(result)` at line 1802. Confirmed correct. In single-sweep, `result.ballast` set at 1977 before `isNoteworthy` at 1985. Confirmed correct.

Now let me check `monitorEvent` and `summarize` context (1728, 1751) and the JSDoc/usage (60, 1914).

### Assistant | 2026-05-17T17:22:11.319Z

[tool_use: Read]

### User | 2026-05-17T17:22:12.313Z

[tool_result] 1715	    }
1716	    if (co.hintWritten) {
1717	      lines.push(
1718	        `  hint: ${co.hintMode} Δ=${co.thresholdDelta} — ${co.reason}` +
1719	        `${co.shouldHintOffload ? " → ollama-task-offloader will absorb more" : " (neutralized)"}`,
1720	      );
1721	    } else if (co.hintError) {
1722	      lines.push(`  hint: write FAILED — ${co.hintError}`);
1723	    } else if (co.skipped) {
172
... [+1928 chars truncated]

### Assistant | 2026-05-17T17:22:17.448Z

All three surfacing sites (`isNoteworthy`, `monitorEvent`, `summarize`) consistently gate on `result.ballast && result.ballast.state === "released"` — defensive and correct. Now let me verify `tierFromPressure` (the sibling pure helper) for convention comparison, and check for other test-only export patterns.

### Assistant | 2026-05-17T17:22:17.953Z

[tool_use: Read]

### User | 2026-05-17T17:22:18.816Z

[tool_result] 1095	  const dryRun = !!opts.dryRun || process.env.PRISM_FLEET_REAPER_DRY_RUN === "1";
1096	
1097	  const intervalSec = clampInt(opts.intervalSec, DEFAULT_INTERVAL_SEC, MIN_INTERVAL_SEC, MAX_INTERVAL_SEC);
1098	  const ageFloorSec = clampInt(opts.ageFloorSec, DEFAULT_AGE_FLOOR_SEC, 0, MAX_AGE_FLOOR_SEC);
1099	  const killAfter = clampInt(opts.killAfter, DEFAULT_KILL_AFTER, 1, MAX_KILL_AFTER);
1100
... [+1488 chars truncated]

### Assistant | 2026-05-17T17:22:22.138Z

Now let me find `tierFromPressure` definition to compare the pure-helper convention, and check for other `forTest`/test-only exports.

### Assistant | 2026-05-17T17:22:23.398Z

[tool_use: Grep]

### User | 2026-05-17T17:22:24.142Z

[tool_result] 196:export function readHostMemory() {
294:export function updateLedger(prevLedger, candidates, now) {
386:export function shouldReap(entry, candidate, cfg, now) {
477:export function reapProcesses(pids, { dryRun = false, killer = defaultKiller } = {}) {
514:export function readSlotProcesses(snap) {
535:export function countSlotsByStatus(snap) {
561:export function selectSoftReliefTargets(snap, { 
... [+1400 chars truncated]

### Assistant | 2026-05-17T17:22:29.126Z

`__resetBallastForTest` is the only test-only export — there's no prior `forTest` precedent in this file, but the JSDoc `/** Test-only: ... */` tag makes the intent explicit and the `__` prefix is a standard convention. Let me read `tierFromPressure` for the pure-helper convention comparison.

### Assistant | 2026-05-17T17:22:29.972Z

[tool_use: Read]

### User | 2026-05-17T17:22:30.775Z

[tool_result] 1440	 *   usedPct  >= criticalPct           → 0                    (critical — reap now)
1441	 *
1442	 * Pure: no clock, env, or I/O. Fail-safe by construction —
1443	 *  • non-finite / negative usedPct (a missing or bogus memory read) is treated
1444	 *    as "no pressure signal" → killAfter unchanged (a blind sweep must never
1445	 *    escalate reaping).
1446	 *  • criticalPct misconfigured bel
... [+1375 chars truncated]

### Assistant | 2026-05-17T17:22:36.038Z

I now have a complete picture. The `ballastAction` pure-helper convention matches `tierFromPressure` exactly: JSDoc with branch table, `Number.isFinite(...) ? Math.max(0, Math.trunc(...)) : 0` finite-guard idiom, no I/O. Excellent convention conformance.

Let me check the JSDoc header (line 60) and usage() (line 1914) for the env knob documentation, plus the `envInt` helper for the `?? DEFAULT_BALLAST_MB` path.

### Assistant | 2026-05-17T17:22:36.713Z

[tool_use: Read]

### User | 2026-05-17T17:22:37.951Z

[tool_result] 1878	export function resolveConfig(args, env = process.env) {
1879	  const envInt = (name) => {
1880	    const n = Number(env[name]);
1881	    return Number.isFinite(n) ? n : null;
1882	  };
1883	  return {
1884	    intervalSec: args.intervalSec ?? envInt("PRISM_FLEET_REAPER_INTERVAL_SEC") ?? DEFAULT_INTERVAL_SEC,
1885	    ageFloorSec: args.ageFloorSec ?? envInt("PRISM_FLEET_REAPER_AGE_FLOOR_SEC")
... [+936 chars truncated]

### Assistant | 2026-05-17T17:22:48.625Z

Now I have a thorough understanding. Let me trace the critical edge cases.

**Edge case: `envInt("PRISM_FLEET_REAPER_BALLAST_MB")` when env var is `"0"`.** `Number("0")` = `0`, `Number.isFinite(0)` = `true`, so `envInt` returns `0`, not `null`. So `0 ?? DEFAULT_BALLAST_MB` = `0` (?? only triggers on null/undefined). Setting `PRISM_FLEET_REAPER_BALLAST_MB=0` correctly disables (returns `0`, not the 256 default). The JSDoc at line 60 says "0 disables the cushion" — correct and reachable. Good.

**Edge case: env var unset.** `env[name]` = `undefined`, `Number(undefined)` = `NaN`, not finite → `envInt` returns `null` → `null ?? DEFAULT_BALLAST_MB` = `256`. Correct.

**Edge case: env var = `"abc"`.** `Number("abc")` = `NaN` → `null` → falls to `256` default. Reasonable (a garbage value falls back to the safe default rather than disabling).

Let me verify the `clampInt` interaction in `ensureBallast`. `clampInt(ballastMb, 0, 0, MAX_BALLAST_MB)` — fallback=0, min=0, max=4096. For `ensureBallast(NaN)`: `NaN` is not null/undefined, `Number(NaN)`=NaN, not finite → `base = fallback = 0` → clamps to 0 → `ballastAction({ballastMb:0,...})` → "disabled". Test line 118 asserts this. Correct.

Now let me check the test file's `__tests__` path resolution — the test imports `from "../fleet-reaper-sweep.mjs"`. The test is at `H:/prism/scripts/__tests__/fleet-reaper-ballast.test.mjs`, so `../` resolves to `H:/prism/scripts/fleet-reaper-sweep.mjs`. Correct path.

Let me check the JSDoc header line 60 and usage line 1914 context.

### Assistant | 2026-05-17T17:22:49.443Z

[tool_use: Read]

### User | 2026-05-17T17:22:50.282Z

[tool_result] 120	export const DEFAULT_MEM_PRESSURE_PCT = 90;
121	// FLEET-REAPER-MS1 Tier 1: a second, higher band above the warn pressure %.
122	// warn band (>= MEM_PRESSURE_PCT) drops the confirm window to one tick;
123	// critical band (>= MEM_CRITICAL_PCT) collapses it to zero — a candidate that
124	// is still a candidate at a critical-pressure sweep is reaped THIS tick rather
125	// than after another i
... [+840 chars truncated]

### Assistant | 2026-05-17T17:22:55.898Z

The doctrine comment is excellent — it explains *why* a held Buffer measurably inflates commit pressure on Windows (commit charge at allocation). Constants are SCREAMING_SNAKE: `DEFAULT_BALLAST_MB` exported (test needs it), `MAX_BALLAST_MB` module-private. Matches the sibling `DEFAULT_MEM_PRESSURE_PCT`/`DEFAULT_MEM_CRITICAL_PCT` pattern exactly.

Now let me verify the existing heavy-runSweep test won't regress — confirm `runSweep` never calls `ensureBallast`/`releaseBallast`.

### Assistant | 2026-05-17T17:22:57.064Z

[tool_use: Grep]

### User | 2026-05-17T17:22:57.422Z

[tool_result] 1488:export function ballastAction({ ballastMb, allocated, released, pressureTier }) {
1489-  const mb = Number.isFinite(ballastMb) ? Math.max(0, Math.trunc(ballastMb)) : 0;
--
1502:export function ensureBallast(ballastMb) {
1503-  const mb = clampInt(ballastMb, 0, 0, MAX_BALLAST_MB);
1504:  const act = ballastAction({
1505-    ballastMb: mb, allocated: _ballast !== null, released: _ballastRelease
... [+643 chars truncated]

### Assistant | 2026-05-17T17:23:54.328Z

Definitive: `ensureBallast`/`releaseBallast`/`ballastAction` are referenced ONLY at:
- 1488/1502/1526 — definitions
- 1800/1801 — `monitorLoop` (calls `runSweep` then `releaseBallast` outside it)
- 1954 — `main()` boot reserve
- 1976/1977 — `main()` single-sweep path (calls `runSweep` then `releaseBallast` outside it)

**`runSweep` (line 1090) body never calls ballast functions.** This is the load-bearing anti-regression fact: the existing `.claude/helpers/fleet-reaper.test.mjs` calls `runSweep` heavily but `runSweep` is byte-for-byte unchanged in ballast terms — it never touches `_ballast`/`_ballastReleased`/`_ballastBytes`. Module-scoped ballast state stays at init (`null/false/0`) during any pure `runSweep` test. **Strictly additive — anti-regression PASS.**

Now let me complete the lifecycle state-machine trace and finalize.

## Lifecycle State Machine Trace

**Full monitorLoop trajectory** (the critical concern):

Boot: `main()` → `ensureBallast(256)`. State `(_ballast=null, _ballastReleased=false)`. `ballastAction({mb:256, allocated:false, released:false, tier:"normal"})` → `"allocate"` → `Buffer.allocUnsafe`, `_ballast=Buffer`, `_ballastBytes=256MB`. ✓

Sweep 1 (normal): `releaseBallast(256, "normal")`. `ballastAction({allocated:true, released:false, tier:"normal"})` → `"hold"` → returns `{state:"hold", freedMb:0}`, state unchanged. ✓

Sweep N (warn): `ballastAction({allocated:true, released:false, tier:"warn"})` → `"hold"`. State unchanged. ✓

Sweep K (critical): `releaseBallast(256, "critical")`. `ballastAction({allocated:true, released:false, tier:"critical"})` → `"release"`. `freedMb = round(256MB/1MB) = 256`. Then `_ballast=null`, `_ballastReleased=true`, `_ballastBytes=0`. Returns `{state:"released", freedMb:256}`. ✓

Sweep K+1 (critical again): `ballastAction({allocated:false, released:true, tier:"critical"})`. **Line 1491: `if (released) return "noop"` — the latch short-circuits BEFORE the critical branch.** Returns `{state:"noop", freedMb:0}`. ✓ **No
... [+8556 chars truncated]
