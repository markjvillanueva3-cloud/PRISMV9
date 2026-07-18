---
type: "chat-session"
source: "claude-code-cli"
session_id: "0f3a0c22-434c-4b12-9967-54ebbcb52788"
title: "Reviewer B of three independent PRISM reviewers — do NOT assume reviewer A caugh"
date: "2026-06-02"
first_ts: "2026-06-02T13:21:56.647Z"
last_ts: "2026-06-02T13:37:28.334Z"
cwd: "H:\\prism-slot-foxtrot"
messages: 51
user_msgs: 18
assistant_msgs: 33
raw_file: "H:/.claude/projects/H--prism-slot-foxtrot/0f3a0c22-434c-4b12-9967-54ebbcb52788/subagents/agent-a87e1e4b387d4f899.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:44"
---

# Reviewer B of three independent PRISM reviewers — do NOT assume reviewer A caugh

> **claude-code-cli** | 2026-06-02 | 51 msgs (18 user / 33 assistant) | cwd: H:\prism-slot-foxtrot
> Raw: `H:/.claude/projects/H--prism-slot-foxtrot/0f3a0c22-434c-4b12-9967-54ebbcb52788/subagents/agent-a87e1e4b387d4f899.jsonl`

## Transcript

### User | 2026-06-02T13:21:56.647Z

Reviewer B of three independent PRISM reviewers — do NOT assume reviewer A caught anything. Weight your review on TEST INTEGRITY, DISPATCHER WIRING completeness, and INLINED-CONSTANT detection. Unit U-MILL-MACHINE-GROUND (slot foxtrot, worktree H:/prism-slot-foxtrot): per-JM-machine SFC grounding for closed-loop mill testing.

Review ONLY these staged files end to end:
1. mcp-server/src/__tests__/mill-machine-grounded-template.test.ts (NEW, 19 tests)
2. mcp-server/src/schemas/millActionSchemas.ts (machine param added to mill_template_library, mill_template_train_sweep, mill_sfc_grounded_template_library)
3. mcp-server/src/tools/dispatchers/millDispatcher.ts (NOT staged/edited — these actions pass params through callOrThrow; CONFIRM the machine field actually reaches the engine with no normalization stripping it)
4. mcp-server/src/data/jm-mill-fleet-envelopes.ts (NEW)
5. mcp-server/src/engines/MillToolpathTemplateLibraryEngine.ts + MillTemplateTrainingHarnessEngine.ts (T2.6 edits)

Verify (BLOCKER for any failure):
- R9 test integrity: would each assertion FAIL if the logic regressed? Scrutinize: the power test (util u4>u2 + gate-fires via direct calculate with ap=5/ae=40 → limiting_factor='power' on 5.6kW OM-2 but not 22kW Okuma); the rpm test (cap-fires via direct calculate, 4mm drill aluminium >8100 clamped to 8100 + warning); the data test's positive control gatedPower(base)===18.6 (does it stop a trivial 'always return 0' helper passing?).
- slimResponse() strips EMPTY arrays fleet-wide: confirm the fleet round-trip's unmapped_machines assertion only works because VMC-05 makes it non-empty, and no assertion relies on a stripped-empty field.
- Wiring: schema machine field + engine method signatures + dispatcher line up; a test invokes THROUGH the dispatcher (mill_sfc_grounded_template_library / mill_template_library / mill_fleet_closed_loop_test round-trips).
- Backward-compat: groundCell cache-key changed from `op|iso` to `op|iso|machineKey` — confirm machine-ag
... [+240 chars truncated]

### Assistant | 2026-06-02T13:22:13.078Z

I'll review these staged files end to end, focusing on test integrity, dispatcher wiring, and inlined-constant detection. Let me start by reading all the files.

### Assistant | 2026-06-02T13:22:13.081Z

[tool_use: Read]

### Assistant | 2026-06-02T13:22:13.259Z

[tool_use: Read]

### User | 2026-06-02T13:23:08.020Z

[tool_result] 1	/**
2	 * jm-mill-fleet-envelopes.ts — verified JM mill-fleet spindle envelopes (U-MILL-MACHINE-GROUND)
3	 *
4	 * Per-machine spindle power / max-rpm / torque envelopes for the JM Die mill fleet
5	 * (VMC-01..05). These ground SFC-computed cutting conditions to each machine's REAL
6	 * constraints inside UltimateSpeedFeedEngine.calculate():
7	 *   - physics gate #3 — required cutting power ≤ avai
... [+9057 chars truncated]

### User | 2026-06-02T13:23:08.055Z

[tool_result] 1	/**
2	 * mill-machine-grounded-template.test.ts — U-MILL-MACHINE-GROUND (T2.6)
3	 *
4	 * Per-JM-machine SFC grounding: the closed-loop mill templates are grounded to EACH VMC's
5	 * real spindle envelope (installed power → physics gate #3, max rpm → hard ceiling) instead of
6	 * a one-size machine-agnostic default. The spindle figures live in jm-mill-fleet-envelopes.ts,
7	 * every one adversaria
... [+16902 chars truncated]

### Assistant | 2026-06-02T13:23:17.730Z

Now let me read the engine files and the schema file to verify wiring and the engine method signatures.

### Assistant | 2026-06-02T13:23:17.732Z

[tool_use: Read]

### Assistant | 2026-06-02T13:23:18.138Z

[tool_use: Read]

### User | 2026-06-02T13:23:36.561Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1245 of 1704 total (29074 tokens, cap 25000). Call Read with offset=1246 limit=1245 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * Mill Dispatcher Action Schemas
3	 * ===============================
4	 * Per-action Zod schem
... [+56821 chars truncated]

### User | 2026-06-02T13:23:36.588Z

[tool_result] 1	/**
2	 * MillToolpathTemplateLibraryEngine — T2 (U-MILL-TEMPLATE-LIBRARY)
3	 *
4	 * Generates a parametric G-code TEMPLATE for every {operation × ISO material}
5	 * combination on a given controller, by delegating to GCodeTemplateEngine
6	 * (the canonical 6-controller × 13-op parametric generator wired in T1). This is
7	 * the "templates for every toolpath type with variable parameters and cutt
... [+29697 chars truncated]

### Assistant | 2026-06-02T13:23:42.222Z

Now let me verify the dispatcher wiring. I need to confirm the `machine` field reaches the engine through `callOrThrow`. Let me look at the relevant dispatcher sections and the training harness engine.

### Assistant | 2026-06-02T13:23:44.123Z

[tool_use: Grep]

### User | 2026-06-02T13:24:10.933Z

[tool_result] 190-  "mill_template_generate",
191-  "mill_template_program",
192-  "mill_template_list",
193-  // Template library (U-MILL-TEMPLATE-LIBRARY / T2)
194:  "mill_template_library",
195-  "mill_template_matrix",
196-  // Closed-loop training sweep (U-MILL-TEMPLATE-TRAINING / T4)
197:  "mill_template_train_sweep",
198-  // Strategy-toolpath templates (U-MILL-STRATEGY-TEMPLATE / T5)
199-  "mill_strateg
... [+2237 chars truncated]

### Assistant | 2026-06-02T13:24:14.018Z

Now let me check the `callOrThrow` implementation to confirm params pass through with no normalization that would strip the `machine` field.

### Assistant | 2026-06-02T13:24:15.539Z

[tool_use: Grep]

### User | 2026-06-02T13:24:49.233Z

[tool_result] 25:async function callOrThrow(
26-  engine: any,
27-  methodCandidates: readonly string[],
28-  params: any,
29-  engineName: string,
30-): Promise<any> {
31-  for (const method of methodCandidates) {
32-    if (typeof engine?.[method] === "function") {
33-      return await engine[method](params);
34-    }
35-  }
36-  throw new Error(
37-    `[NOT_WIRED] ${engineName} does not expose any of: ${me
... [+1547 chars truncated]

### Assistant | 2026-06-02T13:24:54.701Z

`callOrThrow` passes `params` straight through to the engine method with zero normalization. The `machine` field survives. `.passthrough()` on every schema preserves it too. Now let me read the training harness engine to verify `runFleetClosedLoopTest` and `runTrainingSweep` thread the machine envelope correctly, and confirm the `unmapped_machines` / `fleet_machine_grounded_cells` fields.

### Assistant | 2026-06-02T13:24:55.152Z

[tool_use: Read]

### User | 2026-06-02T13:25:45.940Z

[tool_result] 1	/**
2	 * MillTemplateTrainingHarnessEngine — T4 (U-MILL-TEMPLATE-TRAINING)
3	 *
4	 * Closes the loop for EVERY template in the toolpath-template library: for each
5	 * generatable {operation × ISO material} cell it builds a recommended course
6	 * (from the template's variable cutting conditions) + a simulated actual outcome,
7	 * then drives MillCourseClosedLoopEngine.closeLoop — which reconcil
... [+19318 chars truncated]

### Assistant | 2026-06-02T13:25:52.114Z

Now I have the full training harness picture. There's a critical detail to verify: the fleet test calls `runTrainingSweep` with `sfc_ground: input.sfc_ground`, but the test at line 218 calls `runFleetClosedLoopTest({ sfc_ground: true, ... })`. Let me verify the key claims in the prompt.

First, let me confirm the `UltimateSpeedFeedEngine.calculate` actually honors `machine_power_kw`, `machine_max_rpm`, and produces the `limiting_factor='power'` and "exceeds machine max" warning the tests rely on. This is critical to test integrity — if the engine ignores these params, the gate tests would be vacuous.

### Assistant | 2026-06-02T13:25:54.290Z

[tool_use: Grep]

### User | 2026-06-02T13:26:29.763Z

[tool_result] 84:  machine_power_kw?: number;
85:  machine_max_rpm?: number;
86:  machine_max_torque_nm?: number;
87:  machine_rigidity?: "low" | "medium" | "high";
200:  power_utilization_pct?: OptimizedValue;
201:  is_within_budget: boolean;
202:  limiting_factor?: "power" | "torque" | "none";
1890:    const maxRPM = input.machine_max_rpm || 15000;
1895:      warnings.push(`RPM ${Math.round(oldRPM)} exceeds m
... [+1019 chars truncated]

### Assistant | 2026-06-02T13:26:35.013Z

The engine consumes `machine_power_kw` and `machine_max_rpm`. Let me verify the power-gate logic (the `limiting_factor='power'` mechanism) and the rpm-cap logic in detail, since the gate tests depend on these exact behaviors.

### Assistant | 2026-06-02T13:26:36.156Z

[tool_use: Read]

### User | 2026-06-02T13:26:44.299Z

[tool_result] 2040	    const power_kw = (Fc * Vc) / (60 * 1000); // P = Fc × Vc / 60000
2041	    formulas.push(`P = Fc × Vc / 60000 = ${Fc.toFixed(0)} × ${Vc.toFixed(0)} / 60000 = ${power_kw.toFixed(2)} kW`);
2042	
2043	    const machinePower = input.machine_power_kw;
2044	    let powerUtil: number | undefined;
2045	    let isWithinBudget = true;
2046	    let limitingFactor: "power" | "torque" | "none" = "none"
... [+3995 chars truncated]

### Assistant | 2026-06-02T13:26:57.886Z

The power-gate logic is verified: `machine_power_kw` → available = power × 0.85, `isWithinBudget = powerUtil <= 90`, and when over, `limitingFactor = "power"`. The test at line 175 asserts `om2.power.limiting_factor === "power"` with `machine_power_kw: 5.6` and line 176 asserts the Okuma (22 kW) is NOT power-limited. The mechanism is real and machine-power-sensitive.

Now let me verify the RPM cap logic, since the rpm test (lines 140-149) depends on it precisely.

### Assistant | 2026-06-02T13:26:58.860Z

[tool_use: Read]

### User | 2026-06-02T13:27:23.982Z

[tool_result] 1880	      rpm = (Vc * 1000) / (Math.PI * input.workpiece_diameter_mm);
1881	      formulas.push(`n = Vc × 1000 / (π × Dw) = ${Vc.toFixed(0)} × 1000 / (π × ${input.workpiece_diameter_mm}) = ${rpm.toFixed(0)} RPM`);
1882	    } else if (Dc > 0) {
1883	      rpm = (Vc * 1000) / (Math.PI * Dc);
1884	      formulas.push(`n = Vc × 1000 / (π × Dc) = ${Vc.toFixed(0)} × 1000 / (π × ${Dc}) = ${rpm.toFixed(0
... [+760 chars truncated]

### Assistant | 2026-06-02T13:27:31.502Z

The RPM cap is verified: when `rpm > machine_max_rpm`, it's clamped to `maxRPM`, the warning "RPM ... exceeds machine max ... — capped" is pushed, then `rpm = Math.round(rpm)`. The test's regex `/exceeds machine max/i` matches.

Note a subtle point: the default `machine_max_rpm || 15000` means when no machine constraint is passed (uncapped path), the engine STILL applies a 15000 default ceiling. The rpm test asserts `uncapped.spindle_rpm.value > 8100` — a 4mm drill in aluminium at ~14700 rpm. That's below the 15000 default ceiling, so the uncapped value isn't clamped to 8100. Let me verify the 4mm aluminium drill actually produces >8100 rpm and confirm the test isn't relying on a fragile boundary. Let me check the drilling rpm computation for aluminium and run the actual test suite.

### Assistant | 2026-06-02T13:27:32.762Z

[tool_use: Bash]

### User | 2026-06-02T13:28:46.856Z

[tool_result]  RUN  v4.1.5 H:/prism-slot-foxtrot/mcp-server
 ✓ src/__tests__/mill-machine-grounded-template.test.ts (19 tests) 2575ms
     ✓ gate: an SFC speed above the ceiling is clamped (small drill in aluminium on an 8100-rpm spindle)  453ms
     ✓ gate #3 fires when an aggressive cut exceeds the OM-2's 5.6 kW budget but not the Okuma's 22 kW  451ms
 Test Files  1 passed (1)
      Tests  19 passed (19)
   S
... [+1095 chars truncated]

### Assistant | 2026-06-02T13:28:52.258Z

All 19 tests pass in 3.69s. Now let me verify the specific test-integrity concerns from the prompt. Let me check the positive control `gatedPower(base)===18.6` and confirm the data test's helper can't trivially pass. I also need to verify the `slimResponse()` empty-array stripping claim — that `unmapped_machines` only round-trips because VMC-05 makes it non-empty.

### Assistant | 2026-06-02T13:28:54.195Z

[tool_use: Grep]

### User | 2026-06-02T13:29:15.904Z

[tool_result] 12- */
13-import { z } from "zod";
14-import { log } from "../../utils/Logger.js";
15:import { slimResponse } from "../../utils/responseSlimmer.js";
16-import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
17-import { MILL_ACTION_SCHEMAS } from "../../schemas/millActionSchemas.js";
18-import { hookExecutor } from "../../engines/HookExecutor.js";
--
566-      
... [+5596 chars truncated]

### Assistant | 2026-06-02T13:29:20.398Z

Confirmed: the dispatcher wraps the result in `slimResponse(result)` at line 1146. Let me read `slimResponse` to verify it strips empty arrays — this validates the prompt's concern that the fleet round-trip's `unmapped_machines` assertion only works because VMC-05 makes it non-empty.

### Assistant | 2026-06-02T13:29:21.123Z

[tool_use: Read]

### User | 2026-06-02T13:29:32.305Z

[tool_result] 1	/**
2	 * Response Slimmer Utility
3	 * Reduces verbose response objects for MCP transport efficiency.
4	 * @module utils/responseSlimmer
5	 */
6	
7	/**
8	 * Slim a response object by removing null/undefined values and empty arrays.
9	 */
10	export function slimResponse<T>(response: T): T {
11	  if (response === null || response === undefined) {
12	    return response;
13	  }
14	  if (typeof resp
... [+1179 chars truncated]

### Assistant | 2026-06-02T13:29:49.526Z

Confirmed at line 24: `slimResponse` strips empty arrays (`Array.isArray(value) && value.length === 0` → `continue`). This is the critical wiring detail. Let me now verify the test's dispatcher round-trips are robust against this:

1. The fleet round-trip (test line 256-263) asserts `out.unmapped_machines` contains "VMC-05". Since the test calls with `sfc_ground: true` and no `machines` filter (whole fleet incl. VMC-05), `unmapped_machines = ["VMC-05"]` is non-empty → survives slimming. **If VMC-05 weren't unmapped, the array would be empty and `slimResponse` would strip it, making `out.unmapped_machines` undefined → `.toContain` throws TypeError.** The assertion is load-bearing precisely because VMC-05 is unmapped.

2. Critical check: the test also asserts `out.fleet_machine_grounded_cells >= 1` (line 262). `fleet_machine_grounded_cells` is a number (not array), so slimming only drops it if it's `0`. Let me verify the fleet test path produces ≥1 grounded cell through the dispatcher. The dispatcher fleet action does NOT pass `sfc_ground` from a default — let me check the schema default and the test invocation.

Looking at the test (line 258): `params: { sfc_ground: true, materials: ["N"], operations: ["drilling"] }` — `sfc_ground: true` IS passed. Good. VMC-03 is Haas (registered post), so it grounds drilling/N → machine_grounded_cells ≥ 1 → fleet sum ≥ 1. This survives slimming as a non-zero number.

Now let me verify the backward-compat claim: the cache-key change from `op|iso` to `op|iso|machineKey`. Machine-agnostic callers get `machineKey = "generic"`. Let me confirm the 43 prior mill tests still pass and check the prior SFC test relied on cache behavior.

### Assistant | 2026-06-02T13:29:51.453Z

[tool_use: Bash]

### User | 2026-06-02T13:31:13.550Z

[tool_result]  ✓ src/__tests__/mill-template-library.test.ts (12 tests) 882ms
     ✓ emits SFC-grounded cutting conditions into the program when sfc_ground:true (off the hardcoded baseline)  422ms
     ✓ grounds tapping feed via the pitch-lock relation in the emitted program (feed_basis pitch_locked)  430ms
 ✓ src/__tests__/mill-sfc-grounded-template.test.ts (9 tests) 4972ms
     ✓ grounds every cutting OPERATI
... [+2540 chars truncated]

### Assistant | 2026-06-02T13:31:26.391Z

All 33 prior tests pass (12+9+training+fleet). The EPERM stderr is a pre-existing sandbox/state-write quirk (atomic rename on H:), not a test failure — all 4 files passed. 

The backward-compat reasoning is now clear: machine-agnostic callers compute `machineKey = "generic"` (since `machineGroundingConstraints(undefined)` returns undefined → `mc` falsy → `"generic"`). The old key was `${op}|${iso}`; the new is `${op}|${iso}|generic`. Since no machine-agnostic caller ever passed a machine, every prior call now consistently uses the `|generic` suffix — the key is internally consistent, just namespaced. No machine-agnostic call ever collides with a machine-specific one, and the SFC values for `(op, iso, generic)` are computed identically to before (no `mc` spread → same `calculate()` inputs as the pre-T2.6 code). That's why the 33 prior tests pass.

Now let me verify there are no inlined physics constants in the new/edited files. The envelope file has machine nameplate values (power_kw, max_rpm, torque) — those are machine specs, not physics constants (kc1.1/Taylor/material). The test has `VF2_MAX_RPM=8100`, `OM2_KW=5.6`, `OKUMA_KW=22` — these are test-local mirrors of the envelope nameplate data, used as assertion anchors. Let me confirm the engine files don't inline any kc1.1/Taylor/material constants and check the efficiency factor 0.85.

### Assistant | 2026-06-02T13:31:26.967Z

[tool_use: Grep]

### User | 2026-06-02T13:32:01.196Z

[tool_result] 7: *   - physics gate #3 — required cutting power ≤ available (installed × 0.85), util ≤ 90%
20: * These are machine NAMEPLATE specs, not physics constants — no kc1.1 / Taylor lives here

### Assistant | 2026-06-02T13:32:16.382Z

Clean — the only matches in the envelope file are documentation comments. The `× 0.85` efficiency is documented in a comment (the actual 0.85 lives in UltimateSpeedFeedEngine at line 2049, which is the canonical owner — not duplicated). The two new/edited engine files import `machineGroundingConstraints` and don't inline any physics. The `TAP_PITCH_MM = 1.5` in the library engine is a geometric default matching `buildParams`, not a physics constant (and it's pre-existing, not a T2.6 edit).

Let me do a final verification on two subtle test-integrity points the prompt flagged:

1. The power test's positive control: `gatedPower(base)===18.6` (line 124). `gatedPower` returns `machineGroundingConstraints(env)?.machine_power_kw ?? 0`. For a valid VMC-01 envelope, this returns 18.6. A trivial "always return 0" helper would fail this assertion (expects 18.6) AND the corrupt-rejection assertions (expect 0). So the helper must genuinely gate. Good — this is a real positive+negative control pair.

2. The power-scaling test (lines 153-163): `u4 > u2` where u4 is OM-2 (5.6kW) util and u2 is Okuma (22kW) util for the same facing/P cut. Let me confirm these go through `power_util_pct` which is only populated when `mc` is truthy (machine-grounded). Let me double check the facing default tool doesn't naturally exceed budget on the OM-2 making both clamp to the same value.

The test asserts `u4 > u2` (strict) and `u2 > 0`. Since utilisation = required/available and required is identical (same cut), util scales inversely with available power: u4/u2 ≈ 22/5.6 ≈ 3.9×. As long as neither saturates at a clamp, strict inequality holds. The test comment notes "template defaults are conservative, so neither is over-budget here" — `power_util_pct` is a raw ratio (not clamped to 100), so even if over budget, the ratio would still differ. This assertion would fail if the engine ignored per-machine power (both would be equal). Robust.

Let me run a quick check that no other test files reference 
... [+94 chars truncated]

### Assistant | 2026-06-02T13:32:18.104Z

[tool_use: Bash]

### User | 2026-06-02T13:34:59.217Z

[tool_result]  ✓ src/__tests__/mill-strategy-template.test.ts (6 tests) 36ms
 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  08:34:05
   Duration  18.99s (transform 3.32s, setup 0ms, import 7.04s, tests 36ms, environment 0ms)
 DEPRECATED  `test.poolOptions` was removed in Vitest 4. All previous `poolOptions` are now top-level options. Please, refer to the migration guide: https://vitest.dev/gui
... [+1072 chars truncated]

### Assistant | 2026-06-02T13:35:04.683Z

All 6 strategy tests pass — confirms the cache-key change didn't break the strategy path (which doesn't use `groundCell` but shares the engine). Staged files match the review scope: the test, the envelope data, the two engine edits, and the schema. The dispatcher (`millDispatcher.ts`) is correctly NOT staged — it was already wired and `callOrThrow` passes params through unchanged with `.passthrough()` schemas preserving the `machine` field.

Let me do one final tsc check on the new/edited files to confirm no type regressions, then finalize.

### Assistant | 2026-06-02T13:35:06.954Z

[tool_use: Bash]

### User | 2026-06-02T13:37:03.494Z

[tool_result] exit-grep-done

### Assistant | 2026-06-02T13:37:28.334Z

No tsc errors in any of the staged files. My review is complete. All checks pass.

VERDICT: PASS

BLOCKER: (none)

Notes:
1. **Test integrity — all gate tests are non-vacuous and machine-sensitive.** Verified against the real engine: the rpm test (lines 140-149) relies on `UltimateSpeedFeedEngine` line 1890-1896 — a 4mm aluminium drill naturally spins >8100 but <15000 (the default ceiling), so uncapped stays >8100 while `machine_max_rpm:8100` clamps + emits the `/exceeds machine max/i` warning. The power test (lines 165-177) relies on lines 2048-2057: `available = power×0.85`, `limiting_factor="power"` when `util>90` — proven to fire on the 5.6kW OM-2 and NOT on the 22kW Okuma for an identical ~8kW cut. The data test's positive control `gatedPower(base)===18.6` (line 124) is a genuine positive+negative control pair: a trivial "always-0" helper fails this AND a "never-gate" helper fails the corrupt-rejection assertions (NaN/Inf/≤0/unverified→0). All 19 tests pass live (3.69s).

2. **slimResponse empty-array stripping confirmed (responseSlimmer.ts:24).** The fleet round-trip's `out.unmapped_machines.toContain("VMC-05")` (test line 261) is load-bearing precisely because VMC-05 is unmapped → array `["VMC-05"]` is non-empty and survives slimming. The companion `fleet_machine_grounded_cells >= 1` (line 262) is a number that survives because VMC-03 (Haas, registered post) grounds ≥1 cell making the fleet sum non-zero. No assertion in the suite depends on a field that slimming would strip to undefined.

3. **Wiring lines up end-to-end.** Schema `.passthrough()` (all three actions) + `callOrThrow` (millDispatcher.ts:31-33, zero normalization) pass `machine` straight to `generateLibrary`/`generateSFCGroundedLibrary`/`runFleetClosedLoopTest`. Three tests round-trip THROUGH the dispatcher (`captureHandler` → real `registerMillDispatcher`), all pass. Dispatcher correctly unstaged — no edit was needed.

4. **Backward-compat verified (43 prior tests pass live: 12+9+training+fleet+
... [+844 chars truncated]
