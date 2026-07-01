---
type: "chat-session"
source: "claude-code-cli"
session_id: "1c2ad8c5-af07-484a-85fc-a7b7eadb3a60"
title: "Independent second-pass review of two edited files. Read both WHOLE files; do NO"
date: "2026-06-04"
first_ts: "2026-06-04T05:08:57.020Z"
last_ts: "2026-06-04T05:20:52.145Z"
cwd: "H:\\prism-slot-oscar\\mcp-server"
messages: 67
user_msgs: 25
assistant_msgs: 42
raw_file: "H:/.claude/projects/H--prism-slot-oscar/1c2ad8c5-af07-484a-85fc-a7b7eadb3a60/subagents/agent-ad502baa85934d9e7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:03"
---

# Independent second-pass review of two edited files. Read both WHOLE files; do NO

> **claude-code-cli** | 2026-06-04 | 67 msgs (25 user / 42 assistant) | cwd: H:\prism-slot-oscar\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-oscar/1c2ad8c5-af07-484a-85fc-a7b7eadb3a60/subagents/agent-ad502baa85934d9e7.jsonl`

## Transcript

### User | 2026-06-04T05:08:57.020Z

Independent second-pass review of two edited files. Read both WHOLE files; do NOT assume a prior reviewer caught everything.

FILE 1: H:\prism-slot-oscar\mcp-server\scripts\sfc-full-logical-sweep.mts — a diagnostic that compares PRISM 9-axis speed/feed output to a manufacturer-consensus baseline via envelope containment. I added the "turning" operation (now scored against expanded-consensus turning cells), pointed the default consensus at the GPU-expanded file, generalized the milling-fallback segregation from drilling-only to all non-milling ops, and updated the honesty strings.

FILE 2: H:\prism-slot-oscar\mcp-server\src\engines\SpeedFeedOutcomeFeedbackBridgeEngine.ts — I added a busDisabled() env guard (PRISM_SFC_OUTCOME_BUS_DISABLE=1 or PRISM_SFC_OUTCOMES_DIR set → skip the live calibration-ring write). This is a back-port of a main-branch knob; slot/oscar lacked it.

Weight your review toward what a correctness pass might miss:
1. CALIBRATION INTEGRITY (the real risk): the outcome bus feeds india's closed-loop learning. Does gating tryBusCapture on PRISM_SFC_OUTCOMES_DIR being SET have any chance of silently disabling production calibration capture? E.g., is PRISM_SFC_OUTCOMES_DIR ever set in a non-diagnostic/production context (CI, a service launcher, a parent process)? If so, this would silently stop calibration — a serious latent bug. Flag it and recommend a dedicated-flag-only gate if risky.
2. The in-memory ring buffer (appendToRingBuffer) still runs when disabled — confirm that's intended and that nothing reads bus_capture_ok to decide whether to keep the record.
3. Existing tests: will SpeedFeedOutcomeFeedbackBridgeEngine's / shopFloorOutcomeBridge's tests still pass? Could a test that sets PRISM_SFC_OUTCOMES_DIR (common in test setup to avoid polluting!) now ALSO accidentally exercise the disabled path and assert on bus_capture_ok=true? This is a real collision risk — check.
4. Sweep honesty: turning baseline cells are thin (n=1-2 manufacturer rows). Do
... [+354 chars truncated]

### Assistant | 2026-06-04T05:10:47.696Z

I'll review both files end-to-end. Let me read them now.

### Assistant | 2026-06-04T05:10:48.479Z

[tool_use: Read]

### Assistant | 2026-06-04T05:10:49.415Z

[tool_use: Read]

### User | 2026-06-04T05:10:55.064Z

[tool_result] 1	#!/usr/bin/env -S npx tsx
2	/**
3	 * sfc-full-logical-sweep — OSCAR-SFC-9AXIS-MS0 / U-OSC9-FULL-LOGICAL-SWEEP (slot:oscar, 2026-06-03)
4	 *
5	 * Runs the full logical input grid (ISO group × operation {milling,drilling,turning} × diameter
6	 * bucket × cut type) through PRISM's 9-axis orchestrator and compares each PRISM output to the
7	 * manufacturer-CONSENSUS generic baseline (U-OSC9-MANUF-BA
... [+18424 chars truncated]

### User | 2026-06-04T05:10:57.216Z

[tool_result] 1	/**
2	 * SpeedFeedOutcomeFeedbackBridgeEngine — closes the dangling outcome-feedback
3	 * wire identified by audit F9 from SF-PSN-VALUE-NODE-AUDIT-2026-05-22.
4	 *
5	 * Background: `sfcOutcomeWire.captureSFC()` is imported by 5 SF engines but
6	 * NOT by `SpeedFeedDeepLearningEngine` (SF-AI-L1), which holds the
7	 * `calibrationFactors` self-learning state. Outcomes are captured at the
8	 * calc
... [+9401 chars truncated]

### Assistant | 2026-06-04T05:11:01.394Z

Now let me investigate the calibration-integrity risk by examining how the bridge is actually wired and whether `tryBusCapture` does anything meaningful. The header comment claims the actual bus write "happens upstream" in the orchestrator, which is critical to point 1 of the review.

### Assistant | 2026-06-04T05:11:03.287Z

[tool_use: Grep]

### Assistant | 2026-06-04T05:11:04.215Z

[tool_use: Grep]

### User | 2026-06-04T05:11:25.383Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-04T05:11:26.451Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-04T05:11:28.684Z

Let me narrow the search to the relevant subtrees.

### Assistant | 2026-06-04T05:11:30.150Z

[tool_use: Grep]

### Assistant | 2026-06-04T05:11:31.209Z

[tool_use: Grep]

### User | 2026-06-04T05:11:36.747Z

[tool_result] scripts\sfc-full-logical-sweep.mts:28: * speed_feed.jsonl (live calibration ring). Set PRISM_SFC_OUTCOMES_DIR=<tmp> when running this
scripts\sfc-full-logical-sweep.mts:239:    outcome_bus: "Run with PRISM_SFC_OUTCOMES_DIR=<tmp> to avoid polluting the live calibration ring (state/outcomes/speed_feed.jsonl) with synthetic sweep rows.",

### User | 2026-06-04T05:11:54.950Z

[tool_result] src\sfc\jmFirstSweep.ts:411: * @param opts.dir Output dir (default: $PRISM_SFC_OUTCOMES_DIR or <cwd>/state/outcomes).
src\sfc\jmFirstSweep.ts:414:  const dir = opts.dir ?? process.env.PRISM_SFC_OUTCOMES_DIR ?? pathResolve(process.cwd(), "state/outcomes");
src\engines\SpeedFeedOutcomeFeedbackBridgeEngine.ts:84:   * Diagnostic guard: when PRISM_SFC_OUTCOME_BUS_DISABLE=1 (or the documented PRISM_SFC_
... [+12 chars truncated]

### Assistant | 2026-06-04T05:12:00.783Z

This is a critical finding. `PRISM_SFC_OUTCOMES_DIR` is the canonical override for **where the live outcome ring is written** (`jmFirstSweep.ts:414` — `process.env.PRISM_SFC_OUTCOMES_DIR ?? <cwd>/state/outcomes`). It is a *redirect*, not a *disable*. Let me confirm how `sfcOutcomeWire` / the real bus uses this dir, and whether the bridge's `busDisabled()` gate now diverges from the actual write path.

### Assistant | 2026-06-04T05:12:02.196Z

[tool_use: Read]

### Assistant | 2026-06-04T05:12:03.187Z

[tool_use: Grep]

### User | 2026-06-04T05:12:03.557Z

[tool_result] 395	    ledger_cells: ledgerCells,
396	  };
397	}
398	
399	export interface ArchiveResult {
400	  ledger_path: string;
401	  summary_path: string;
402	  cells_written: number;
403	}
404	
405	/**
406	 * Persist a sweep report. Writes a fresh (idempotent — overwrite, never append) per-cell JSONL
407	 * ledger + a summary JSON (the report minus the bulky ledger_cells array). Separate ledger file
408	
... [+1474 chars truncated]

### User | 2026-06-04T05:12:06.876Z

[tool_result] Found 1 file
src\sfc\jmFirstSweep.ts

### Assistant | 2026-06-04T05:12:11.656Z

Now let me find where the actual live outcome bus (`sfcOutcomeWire`/`captureSFC`) writes the `speed_feed.jsonl` ring, to determine whether `PRISM_SFC_OUTCOMES_DIR` redirects that write (making `busDisabled()` redundant for diagnostics) or whether the bridge gate is the *only* thing reading it.

### Assistant | 2026-06-04T05:12:14.669Z

[tool_use: Bash]

### User | 2026-06-04T05:12:17.419Z

[tool_result] ---FILES---

### Assistant | 2026-06-04T05:12:20.415Z

[tool_use: Bash]

### User | 2026-06-04T05:12:23.495Z

[tool_result] ===GREP speed_feed.jsonl===

### Assistant | 2026-06-04T05:12:27.293Z

The grep returned nothing — `captureSFC`/`sfcOutcomeWire` may not exist in this slot tree (the engine header references them but `tryBusCapture` is a no-op stub that just `return true`). Let me verify directly and check how the orchestrator actually wires the bridge + the real outcome write.

### Assistant | 2026-06-04T05:12:29.938Z

[tool_use: Bash]

### User | 2026-06-04T05:12:45.212Z

[tool_result] === captureSFC refs ===
src/engines/AutoSpeedFeedCalculatorEngine.ts
src/engines/LatheSpeedFeedCalculatorFacadeEngine.ts
src/engines/MachineAwareSpeedFeedEngine.ts
src/engines/SFCCalculateEngine.ts
src/engines/SpeedFeedDeepLearningEngine.ts
src/engines/SpeedFeedOutcomeFeedbackBridgeEngine.ts
src/engines/UltimateSpeedFeedEngine.ts
src/middleware/sfcOutcomeWire.ts
src/__tests__/engines/autoSpeedFeed
... [+753 chars truncated]

### Assistant | 2026-06-04T05:12:49.306Z

Now let me read the actual bus middleware (`sfcOutcomeWire.ts`) to see how it uses `PRISM_SFC_OUTCOMES_DIR`, and how the orchestrator invokes the bridge. This is the crux of calibration-integrity point 1.

### Assistant | 2026-06-04T05:12:49.825Z

[tool_use: Read]

### User | 2026-06-04T05:12:50.798Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\middleware\sfcOutcomeWire.ts' was already read 46s ago in this session and is unchanged (mtime 1779249452454). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_R
... [+12 chars truncated]

### Assistant | 2026-06-04T05:12:53.074Z

The guard is mistaken (the file isn't in my context). Let me read it with explicit offset.

### Assistant | 2026-06-04T05:12:53.703Z

[tool_use: Read]

### User | 2026-06-04T05:12:56.078Z

[tool_result] 1	/**
2	 * sfcOutcomeWire — U-PPG-SFC-01 inline helpers
3	 * =============================================
4	 *
5	 * Tiny wrappers around `sfcOutcomeCaptureWireEngine.recordEmission` so each
6	 * SFC engine adds 1–2 lines instead of inlining the full payload. Errors
7	 * inside the wire are swallowed — speed/feed recommendations must never
8	 * fail because telemetry failed.
9	 *
10	 * Used by:
11
... [+1588 chars truncated]

### Assistant | 2026-06-04T05:12:59.924Z

Now the key question: does `SFCOutcomeCaptureWireEngine.recordEmission` (the engine behind `captureSFC`) read `PRISM_SFC_OUTCOMES_DIR` for its write location? If so, redirecting the dir is the *real* diagnostic isolation mechanism, and the bridge's `busDisabled()` gating on the same env var is a layer that also reads it. Let me check the orchestrator wiring and the capture wire engine.

### Assistant | 2026-06-04T05:13:03.374Z

[tool_use: Bash]

### User | 2026-06-04T05:13:08.640Z

[tool_result] === Orchestrator: how bridge.capture + captureSFC are invoked ===
62:import { speedFeedOutcomeFeedbackBridgeEngine } from "./SpeedFeedOutcomeFeedbackBridgeEngine.js";
592:      speedFeedOutcomeFeedbackBridgeEngine.capture(input, result);

=== SFCOutcomeCaptureWireEngine: where does it write / OUTCOMES_DIR ===
254:      domain: "speed_feed",

### Assistant | 2026-06-04T05:13:12.588Z

Important finding emerging. The orchestrator calls `speedFeedOutcomeFeedbackBridgeEngine.capture(input, result)` at line 592 but does **not** call `captureSFC` itself — so the bridge's claim that "the bus capture happens upstream" needs verification. And `SFCOutcomeCaptureWireEngine` does **not** read `PRISM_SFC_OUTCOMES_DIR`. Let me see where the wire engine actually persists, and confirm the orchestrator's full capture block around line 592.

### Assistant | 2026-06-04T05:13:14.001Z

[tool_use: Read]

### Assistant | 2026-06-04T05:13:15.688Z

[tool_use: Bash]

### User | 2026-06-04T05:13:16.626Z

[tool_result] 575	      resolved_axes,
576	    };
577	
578	    // Auto-propagation — best-effort; never throws back into SFC path.
579	    // Every run() emission auto-publishes to the propagation bridge so
580	    // post-processors + mill/lathe/wedm wizards + print-to-program pipeline
581	    // see the new snapshot without an explicit re-fetch.
582	    try {
583	      speedFeedPropagationBridgeEngine.publish
... [+860 chars truncated]

### User | 2026-06-04T05:13:20.855Z

[tool_result] === Wire engine persistence (recordEmission) ===
224: * OutcomeCaptureBus. Engines call `recordEmission(...)` once per public
243:  recordEmission(input: SFCEmissionInput): SFCEmissionResult {

### Assistant | 2026-06-04T05:13:24.745Z

Let me read the `recordEmission` body to see where it persists and whether `PRISM_SFC_OUTCOMES_DIR` matters to it. This decides whether the bridge is the *only* live calibration sink path or whether it's a parallel ring buffer.

### Assistant | 2026-06-04T05:13:25.513Z

[tool_use: Read]

### User | 2026-06-04T05:13:27.537Z

[tool_result] 218	  }
219	  return out;
220	}
221	
222	/**
223	 * SFCOutcomeCaptureWireEngine — singleton wire from SFC engines to the
224	 * OutcomeCaptureBus. Engines call `recordEmission(...)` once per public
225	 * recommendation entry point.
226	 */
227	export class SFCOutcomeCaptureWireEngine {
228	  /** Bus the wire writes through. Tests can inject an isolated instance. */
229	  private readonly bus: Out
... [+1593 chars truncated]

### Assistant | 2026-06-04T05:13:32.746Z

Now I understand the full architecture. The persistence path is `OutcomeCaptureBusEngine.record()`. Let me check whether *that* engine reads `PRISM_SFC_OUTCOMES_DIR` (or `state/outcomes/speed_feed.jsonl`), which is what the sweep's honesty note and the engine's `busDisabled()` comment both claim. This determines whether the env var is the canonical redirect for the live ring or whether the bridge gate is novel behavior.

### Assistant | 2026-06-04T05:13:35.387Z

[tool_use: Bash]

### User | 2026-06-04T05:13:42.948Z

[tool_result] FILE: src/engines/OutcomeCaptureBusEngine.ts
=== OUTCOMES_DIR / outcomes path / jsonl in bus engine ===
19: *   2. PER-DOMAIN SHARD.  mill.jsonl vs lathe.jsonl — cross-domain scans
35: *   - OutcomeTrackingEngine owns per-program outcome.jsonl (legacy scope).
58:const OUTCOMES_DIR = path.resolve(process.cwd(), "state/outcomes");
133:// directly via the exported singleton. There is no caller patter
... [+1049 chars truncated]

### Assistant | 2026-06-04T05:13:51.327Z

This is the decisive finding. Critical line: `OutcomeCaptureBusEngine.ts:58`:

```
const OUTCOMES_DIR = path.resolve(process.cwd(), "state/outcomes");
```

The live outcome bus root dir is **hardcoded** to `state/outcomes` (it does NOT read `PRISM_SFC_OUTCOMES_DIR`). So:

1. Setting `PRISM_SFC_OUTCOMES_DIR=<tmp>` does **NOT** redirect the actual live calibration ring written by `OutcomeCaptureBusEngine` — that engine never reads the env var. The sweep's honesty note (lines 28–29, 239) claiming "Set PRISM_SFC_OUTCOMES_DIR=<tmp> to avoid polluting the live calibration ring" is **only true now because the new `busDisabled()` gate short-circuits the bridge** — but the bridge's `tryBusCapture` is a no-op (`return true`) that never actually writes to the bus anyway.

Let me confirm `PRISM_SFC_OUTCOMES_DIR` is genuinely only consumed by `jmFirstSweep.ts` (a different, diagnostic-only path) and the new bridge — i.e. that some *production* caller or service launcher doesn't set it. Let me also check the test file for the collision risk (point 3).

### Assistant | 2026-06-04T05:13:54.310Z

[tool_use: Bash]

### User | 2026-06-04T05:18:58.855Z

[tool_result] Command running in background with ID: bl0s89pe1. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\1c2ad8c5-af07-484a-85fc-a7b7eadb3a60\tasks\bl0s89pe1.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-04T05:19:04.196Z

[tool_use: Bash]

### User | 2026-06-04T05:19:13.044Z

[tool_result] mcp-server/src/engines/SpeedFeedOutcomeFeedbackBridgeEngine.ts:84:   * Diagnostic guard: when PRISM_SFC_OUTCOME_BUS_DISABLE=1 (or the documented PRISM_SFC_OUTCOMES_DIR
mcp-server/src/engines/SpeedFeedOutcomeFeedbackBridgeEngine.ts:91:    return process.env.PRISM_SFC_OUTCOME_BUS_DISABLE === "1" || !!process.env.PRISM_SFC_OUTCOMES_DIR;
mcp-server/src/sfc/jmFirstSweep.ts:411: * @param opts.dir Output
... [+627 chars truncated]

### Assistant | 2026-06-04T05:19:17.840Z

The grep on the test file returned nothing for env-var/bus_capture_ok — let me confirm the test file exists and check what it actually asserts (point 3 collision risk), plus check the jmFirstSweep tests that DO set the env var.

### Assistant | 2026-06-04T05:19:21.845Z

[tool_use: Bash]

### User | 2026-06-04T05:19:25.093Z

[tool_result] === bridge test asserts on bus_capture_ok? ===
42:  it("exports a singleton with capture()", () => {
48:    const rec = bridge.capture(MILL_STEEL, r);
57:    const rec = bridge.capture(MILL_STEEL, r);
66:    const rec = bridge.capture(MILL_STEEL, r);
73:  // bridge.capture() call in these tests — so each (run + capture) pair adds
77:    bridge.capture(MILL_STEEL, orchestrator.run(MILL_STEEL));
80:
... [+1588 chars truncated]

### Assistant | 2026-06-04T05:19:29.361Z

Let me read the critical test assertions around lines 42-66 and 100-120 of the bridge test, where `bus_capture_ok` is checked. Lines 108 (`toBe(true)`) and 117 (`toBe(false)`) are the collision-risk hotspots. I need to see exactly what `ok` is and whether the env var leaks in.

### Assistant | 2026-06-04T05:19:31.040Z

[tool_use: Read]

### User | 2026-06-04T05:19:33.302Z

[tool_result] 1	/**
2	 * SpeedFeedOutcomeFeedbackBridgeEngine — tests
3	 *
4	 * Validates: capture appends to ring buffer, capacity cap, recordActuals,
5	 * recentForKey, stats accuracy, key-based isolation.
6	 *
7	 * @module __tests__/SpeedFeedOutcomeFeedbackBridgeEngine.test
8	 */
9	
10	import { describe, it, expect, beforeEach } from "vitest";
11	import {
12	  SpeedFeedOutcomeFeedbackBridgeEngine,
13	  speed
... [+5091 chars truncated]

### Assistant | 2026-06-04T05:19:40.861Z

I found the test collision directly. Line 90-93:

```js
it("stats bus_capture_success_rate is 100 when all captures succeed", () => {
  bridge.capture(MILL_STEEL, orchestrator.run(MILL_STEEL));
  bridge.capture(LATHE_STEEL, orchestrator.run(LATHE_STEEL));
  expect(bridge.stats().bus_capture_success_rate_pct).toBe(100);
});
```

This asserts `bus_capture_success_rate_pct === 100`, which requires every record's `bus_capture_ok === true`. If `PRISM_SFC_OUTCOMES_DIR` or `PRISM_SFC_OUTCOME_BUS_DISABLE=1` is set in the environment when this test runs, `busDisabled()` returns true → every `bus_capture_ok` is `false` → success rate is `0` → **this test fails**. The reviewer's hypothesis (point 3) is confirmed as a real collision. Now let me verify whether the env var is actually set during the test run — check vitest config / setup files and confirm the jmFirstSweep test sets it (which would leak via shared process env if tests share a process).

### Assistant | 2026-06-04T05:19:43.149Z

[tool_use: Bash]

### User | 2026-06-04T05:19:51.785Z

[tool_result] === vitest config (pool / isolate / env / setupFiles) ===
/**
 * Vitest configuration for mcp-server.
 *
 * OBSIDIAN-AUTOMATE-MS3/U-VITEST-PARALLEL
 *
 * Why this exists: mcp-server's test suite is ~3400 cases. Default Vitest
 * concurrency runs file-level workers fine but PRISM had no top-level
 * vitest.config so isolate/pool behaviour was implicit. Pinning the pool
 * and worker counts to the h
... [+2372 chars truncated]

### Assistant | 2026-06-04T05:19:59.152Z

(Disregard the spurious test_timeout triage — no test ran; that was a config read.)

Vitest config confirms `isolate: true` and threads share the same OS process env (`process.env` is per-process, shared across worker threads in `pool: "threads"`). So `process.env.PRISM_SFC_OUTCOMES_DIR` is **process-global**: if any concurrently-running test file, the CI launcher, or the developer's shell exports it, `busDisabled()` returns true inside the bridge test's worker too. The collision is real and environment-dependent (a flaky/conditional failure, the worst kind).

I have enough to render the verdict. Let me do a final scan for convention conformance (the `engines.md` rule: "never silentCatch in engines" vs the no-op try/catch, and the static-methods convention) and confirm `n_rows`/min-n honesty in the turning baseline cells.

### Assistant | 2026-06-04T05:20:03.226Z

[tool_use: Bash]

### User | 2026-06-04T05:20:06.542Z

[tool_result] === turning cells n_rows / n_manufacturers in expanded consensus ===
turning cells: 6
  P|turning|carbide n_rows=15 n_mfg=2 vc[min..max]=27.5..250 median=165
  M|turning|carbide n_rows=9 n_mfg=2 vc[min..max]=16.5..165 median=35
  K|turning|carbide n_rows=10 n_mfg=2 vc[min..max]=23.5..350 median=80
  N|turning|carbide n_rows=1 n_mfg=1 vc[min..max]=500..500 median=500
  S|turning|carbide n_rows=8 n_
... [+108 chars truncated]

### Assistant | 2026-06-04T05:20:52.145Z

This confirms the sweep-honesty concern (point 4) concretely. The `N|turning|carbide` cell has `n_rows=1, n_manufacturers=1, vc min==max==500` — a **degenerate envelope** (`span=0`). In `containment()` (sweep line 92-94): `value < 500 || value > 500` → any PRISM value not exactly 500 reports `contained:false`, and the only "contained" case (exactly 500) reports `envelope_pos_pct=50`. So the N-turning row will almost certainly show **0% containment** against a 1-row "envelope" and be averaged into the turning containment headline — exactly the over-claim the reviewer flagged. The sweep has no `min-n` guard and does not surface `n_rows` / degenerate-envelope status in the scored output or honesty block.

I have everything needed. Final verdict.

---

## VERDICT: FAIL

Two real defects in the changed files: a calibration-integrity mislabel that makes a production env var silently disable bridge capture (P1), a confirmed environment-dependent test collision (P1), and a sweep over-claim on degenerate 1-row turning envelopes (P1). None block via crash, but each defeats the stated purpose of the change.

### P0
- None.

### P1

- **`SpeedFeedOutcomeFeedbackBridgeEngine.ts:91` — `PRISM_SFC_OUTCOMES_DIR` is the wrong gate; it is a production/diagnostic *redirect*, not a disable.** `busDisabled()` returns true whenever `PRISM_SFC_OUTCOMES_DIR` is merely *set*. But that env var is independently consumed at `src/sfc/jmFirstSweep.ts:414` as an **output-directory redirect** (`opts.dir ?? process.env.PRISM_SFC_OUTCOMES_DIR ?? <cwd>/state/outcomes`). Any operator/CI/service launcher that sets `PRISM_SFC_OUTCOMES_DIR` to relocate the outcome ledger (a legitimate, non-diagnostic reason) would now **also silently flip `bus_capture_ok=false` on every bridge record fleet-wide** — degrading india's closed-loop calibration with no log, no warning. The two concerns (where to write vs whether to capture) must not share one variable. **Recommend: gate on the dedicated `PRISM_SFC_OUTCOME_BUS_
... [+5423 chars truncated]
