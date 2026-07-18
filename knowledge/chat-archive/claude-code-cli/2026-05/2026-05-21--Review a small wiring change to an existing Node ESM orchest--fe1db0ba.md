---
type: "chat-session"
source: "claude-code-cli"
session_id: "fe1db0ba-56e2-4bf4-8faa-3ecc49b65d27"
title: "Review a small wiring change to an existing Node ESM orchestrator script. Focus "
date: "2026-05-21"
first_ts: "2026-05-21T00:16:44.240Z"
last_ts: "2026-05-21T00:19:31.758Z"
cwd: "H:\\prism"
messages: 25
user_msgs: 10
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/fe1db0ba-56e2-4bf4-8faa-3ecc49b65d27/subagents/agent-a06ac7c69631c477e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# Review a small wiring change to an existing Node ESM orchestrator script. Focus 

> **claude-code-cli** | 2026-05-21 | 25 msgs (10 user / 15 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fe1db0ba-56e2-4bf4-8faa-3ecc49b65d27/subagents/agent-a06ac7c69631c477e.jsonl`

## Transcript

### User | 2026-05-21T00:16:44.240Z

Review a small wiring change to an existing Node ESM orchestrator script. Focus on the change; read enough surrounding code to judge correctness.

FILE: H:\prism\scripts\rgs-tool-planner.mjs

THE CHANGE (U-LIMA-A7) — 5 edits wire a confidence-calibration adapter into the planner, mirroring how A6 wired a complexity adapter:
1. Added `import { makeCalibrationFn } from "./lib/rgs-calibration-adapter.mjs";` (~line 29).
2. `runPlanner`'s JSDoc gained a `calibrateConfidence?: (rawConfidence:number)=>number` param.
3. `runPlanner`'s destructured options gained `calibrateConfidence` (optional, no default).
4. Inside `runPlanner`'s per-unit loop, AFTER `fuseSignals` returns a non-null `plan` and BEFORE `plans[unit.key] = plan`:
   `if (typeof calibrateConfidence === "function" && unit.milestone) { plan.confidence = calibrateConfidence(plan.confidence); }`
5. The CLI `main()` builds `calibrateConfidence` via `process.env.PRISM_RGS_CALIBRATION === "0" ? undefined : await makeCalibrationFn()` and passes it to `runPlanner`.

CONTRACT IT MUST MEET:
- `runPlanner` callers that DON'T pass `calibrateConfidence` (the 27-test regression suite) must be 100% unaffected — `calibrateConfidence` undefined → the `typeof === "function"` guard is false → no-op. (Regression suite: 27/27 still pass — confirmed.)
- Calibration must be skipped for missing-milestone units: `fuseSignals` deliberately hard-zeros `confidence` to 0 when `!unit.milestone`, and calibration must NOT resurrect that zero. The guard `&& unit.milestone` handles this.
- `plan.confidence` is NOT part of `sourceHash` (which is computed from unit fields + complexity tier/verdict only) — so mutating confidence must NOT change the skip-check hash / trigger a re-plan stampede. Verify `sourceHash` (defined ~line 99) genuinely excludes confidence.
- The CLI must default-ON (calibrate unless `PRISM_RGS_CALIBRATION=0`), and the adapter itself degrades to identity when the outcome ledger is below its >=50 gate — so default-on is safe.

... [+627 chars truncated]

### Assistant | 2026-05-21T00:17:00.000Z

I'll review the wiring change to the orchestrator script.

### Assistant | 2026-05-21T00:17:00.311Z

[tool_use: Read]

### Assistant | 2026-05-21T00:17:00.418Z

[tool_use: Read]

### User | 2026-05-21T00:17:07.064Z

[tool_result] read-once-guard: 'H:\prism\scripts\rgs-tool-planner.mjs' was already read 7s ago in this session and is unchanged (mtime 1779322522520). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-21T00:17:07.068Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\rgs-calibration-adapter.mjs' was already read 5m ago in this session and is unchanged (mtime 1779322111183). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-21T00:17:10.228Z

The read-once guard says both files are already in my context, but I don't actually have them in this conversation. Let me bypass the cache to inspect the actual code.

### Assistant | 2026-05-21T00:17:10.560Z

[tool_use: Bash]

### Assistant | 2026-05-21T00:17:11.158Z

[tool_use: Bash]

### User | 2026-05-21T00:17:24.917Z

[tool_result]   1 │ /**
  2 │  * rgs-tool-planner.mjs
  3 │  * Batch orchestrator: builds a per-roadmap-unit tool-plan sidecar.
  4 │  *
  5 │  * Memory note: the system-viz graph is ~324 MB. Under portable-node's default
  6 │  * heap this is fine, but if you hit GC pressure on very large runs add:
  7 │  *   node --max-old-space-size=4096 scripts/rgs-tool-planner.mjs ...
  8 │  *
  9 │  * CLI usage:
 10 │  * 
... [+11297 chars truncated]

### User | 2026-05-21T00:17:40.714Z

[tool_result]   1 │ /**
  2 │  * rgs-calibration-adapter.mjs — CAMConfidenceCalibrationEngine-backed
  3 │  * confidence calibration for the rgs-tool-planner.
  4 │  *
  5 │  * Why this exists (U-LIMA-A7 / RGS-TOOL-AUTOINVOKE-MS1 P1 item #5):
  6 │  *   The planner emits a `ToolPlan.confidence` per roadmap unit — the
  7 │  *   deterministic path is a mean-of-pipeline-confidences capped at 0.6, the
  8 │  *   O
... [+17549 chars truncated]

### Assistant | 2026-05-21T00:17:44.287Z

Now let me see the `runPlanner` per-unit loop and the CLI `main()`.

### Assistant | 2026-05-21T00:17:45.165Z

[tool_use: Bash]

### Assistant | 2026-05-21T00:17:46.484Z

[tool_use: Bash]

### User | 2026-05-21T00:18:38.265Z

[tool_result]      1	 */
     2	export async function makeTribalReader() {
     3	  try {
     4	    const lib = await import("./lib/master-index-search-lib.mjs");
     5	    if (typeof lib.runTribalSearch !== "function") throw new Error("runTribalSearch not exported");
     6	    return async function tribal(text, { prefDomain } = {}) {
     7	      try {
     8	        // runTribalSearch returns { tokens, hit
... [+8885 chars truncated]

### User | 2026-05-21T00:18:48.639Z

[tool_result] Exit code 1
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'calibrateConfidence\|complexityFor\|makeRIEComplexityFn\|runPlanner\|RGS_DETERMINISTIC_PLAN_INVALID\|fuseSignals\|plan.confidence\|plans\[unit.key\]\|appendCheckpoint\|budgetExhausted\|PRISM_RGS_CALIBRATION'

### Assistant | 2026-05-21T00:18:51.661Z

Let me see the rest of the loop and the CLI `main()`.

### Assistant | 2026-05-21T00:18:52.656Z

[tool_use: Bash]

### Assistant | 2026-05-21T00:18:53.308Z

[tool_use: Grep]

### User | 2026-05-21T00:19:00.546Z

[tool_result]      1	    if (!force && completedSet.has(unit.key) && completedSet.get(unit.key) === hash) {
     2	      skipped++;
     3	      continue;
     4	    }
     5	
     6	    // Attempt fusion
     7	    let plan = null;
     8	    try {
     9	      plan = await fuseSignals({ unit, complexity, readers });
    10	    } catch (e) {
    11	      const msg = e instanceof Error ? e.message : String(e);

... [+3629 chars truncated]

### User | 2026-05-21T00:19:04.850Z

[tool_result] 16: *   async function runPlanner({ units, complexityFor, readers, sidecarPath,
28:import { makeRIEComplexityFn } from "./lib/rgs-rie-adapter.mjs";
69: * API so the test suite + runPlanner() callers don't change.
455: *   calibrateConfidence?: (rawConfidence: number) => number,
466: * calibrateConfidence (U-LIMA-A7) optionally remaps each plan's confidence
478:export async function runPlanner({
48
... [+733 chars truncated]

### Assistant | 2026-05-21T00:19:07.939Z

Let me see the CLI wiring for both `complexityFn` (A6 pattern) and `calibrateConfidence` (A7).

### Assistant | 2026-05-21T00:19:08.597Z

[tool_use: Bash]

### User | 2026-05-21T00:19:17.552Z

[tool_result]      1	  // Lock refresh: runPlanner calls onFlush after every sidecar flush; we
     2	  // re-stamp the lock there so a long --time-budget run never lets its own
     3	  // lock age past LOCK_MAX_AGE_MS and get stolen by a concurrent invocation.
     4	  // U-LIMA-A6: complexity tiering is RoadmapIntelligenceEngine-backed by
     5	  // default; PRISM_RGS_RIE_ADAPTER=0 reverts to the pure rgs-c
... [+1351 chars truncated]

### Assistant | 2026-05-21T00:19:31.758Z

I have everything needed. All 5 edits verified against the actual code.

## Findings

**Edit 1 — import (line 29):** Correct. Mirrors line 28 `makeRIEComplexityFn` import.

**Edit 2 — JSDoc (lines 455, 466–470):** Correct. Param documented as optional with the no-op-when-omitted semantics spelled out.

**Edit 3 — destructure (line 481):** Correct. `calibrateConfidence` listed with no default → `undefined` when omitted. The `typeof === "function"` guard at line 553 handles `undefined` cleanly.

**Edit 4 — loop placement (lines 547–556):** Correct on every axis.
- Placement is **after** the `plan === null` skip (line 523) and **before** `plans[unit.key] = plan` (line 558) and `appendCheckpoint` (line 562). 
- The time-budget `break` (line 514), `RGS_DETERMINISTIC_PLAN_INVALID` `continue` (line 535), generic-error `continue` (line 539), and null-plan `continue` (line 525) all `break`/`continue` *before* line 553 — so calibration **cannot** be double-applied or run on a skipped/deferred unit. Each unit reaching line 553 ran `fuseSignals` exactly once.
- `unit.milestone` guard: correct. `fuseSignals` hard-zeros confidence when `!unit.milestone`; the `&& unit.milestone` short-circuit means a falsy milestone skips calibration entirely, preserving the deliberate 0.
- `plan.confidence` mutation is safe: `sourceHash` (lines 100–111) hashes only `title + description + tier + verdict` — `confidence` is genuinely excluded, so no re-plan stampede. `hash` was already computed at line 518 *before* mutation anyway.
- Nothing reads `plan.confidence` between `fuseSignals` return and line 553. `buildSidecarDoc` only stores `plans`.

**Edit 5 — CLI (lines 711–714):** Correct. Default-ON; `PRISM_RGS_CALIBRATION === "0"` → `undefined`; structurally identical to the A6 `complexityFn` ternary (lines 703–705). Adapter degrades to `identityCalibration` below the 50-outcome gate, so default-on is safe on fresh checkout.

**P3 (cosmetic, non-blocking):** `runPlanner`'s return type omits `deferr
... [+113 chars truncated]
