---
type: "chat-session"
source: "claude-code-cli"
session_id: "bd224714-b58a-4906-a80a-8774dd691b1c"
title: "You are reviewer B of three independent reviewers for PRISM's 3-of-3 scrutiny ga"
date: "2026-06-18"
first_ts: "2026-06-18T20:33:53.356Z"
last_ts: "2026-06-18T20:38:40.815Z"
cwd: "H:\\prism"
messages: 65
user_msgs: 23
assistant_msgs: 42
raw_file: "H:/.claude/projects/H--prism/bd224714-b58a-4906-a80a-8774dd691b1c/subagents/agent-aeb1d2b8e5c64ed47.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# You are reviewer B of three independent reviewers for PRISM's 3-of-3 scrutiny ga

> **claude-code-cli** | 2026-06-18 | 65 msgs (23 user / 42 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/bd224714-b58a-4906-a80a-8774dd691b1c/subagents/agent-aeb1d2b8e5c64ed47.jsonl`

## Transcript

### User | 2026-06-18T20:33:53.356Z

You are reviewer B of three independent reviewers for PRISM's 3-of-3 scrutiny gate, weighted toward TEST INTEGRITY, DISPATCHER WIRING COMPLETENESS, and INLINED-CONSTANT/RATE detection. Do NOT assume reviewer A caught everything. Review commit 52622e80cb on H:/prism.

Run `git -C H:/prism show 52622e80cb` and read the full files: H:/prism/mcp-server/src/engines/ProcessRoutingEngine.ts, H:/prism/mcp-server/src/__tests__/ProcessRoutingEngine.test.ts, and the businessDispatcher.ts hunk.

Focus your review on:
 - TEST INTENT (R9): would each test actually FAIL if the routing logic were wrong? Or are they shape-only? Specifically check the "routes to the SAME machine selectCapableMachines picks" tests — are they tautological (re-deriving from the same call) or do they prove real behavior?
 - WIRING: is `quote_route_operations` truly wired (enum entry + handler case + real `processRoutingEngine.route(params)` call)? Any false-wire?
 - INLINED RATES/CONSTANTS: does ProcessRoutingEngine inline ANY shop rate, $/hr, margin, or physics constant? (charlie soul forbids inline-shop-rate-constants — all rates must come from ShopConfigurationEngine.getRates / selectCapableMachines). The constants HARDENED_HRC=50 and PRECISION_TOLERANCE_MM=0.013 are routing thresholds, not shop rates — judge whether those are acceptable domain thresholds or should be sourced elsewhere.
 - Does the engine ever fabricate a machining minute it cannot ground? (It must flag pending-physics instead.)

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines (file:line), then <=5 notes. If unsure, FAIL.

### Assistant | 2026-06-18T20:33:56.358Z

I'll start by examining the commit and reading the full files.

### Assistant | 2026-06-18T20:33:57.012Z

[tool_use: Bash]

### User | 2026-06-18T20:34:05.670Z

[tool_result] commit 52622e80cb5be801dfe058397c219af65d394235
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 18 15:32:12 2026 -0500

    [MAIN-FORCE] [QUOTE-GROUNDING-MS0]/U1-PROCESS-ROUTING (slot:charlie): operation-decomposition + JM machine routing keystone
    
    Closes the keystone gap exposed by the C-033626 die-set quote (machining times
    were LLM-guessed because nothing
... [+1046 chars truncated]

### Assistant | 2026-06-18T20:34:10.882Z

Now let me read the three files in full.

### Assistant | 2026-06-18T20:34:11.811Z

[tool_use: Read]

### Assistant | 2026-06-18T20:34:11.950Z

[tool_use: Read]

### User | 2026-06-18T20:34:12.592Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\ProcessRoutingEngine.ts' was already read 5s ago in this session and is unchanged (mtime 1781814209896). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### User | 2026-06-18T20:34:12.809Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\ProcessRoutingEngine.test.ts' was already read 5s ago in this session and is unchanged (mtime 1781814425502). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_REA
... [+10 chars truncated]

### Assistant | 2026-06-18T20:34:15.306Z

The read-once guard says these files were already read, but I don't actually have their content in my context. Let me disable the cache and read them.

### Assistant | 2026-06-18T20:34:16.026Z

[tool_use: Bash]

### User | 2026-06-18T20:34:21.742Z

[tool_result]      1	/**
     2	 * ProcessRoutingEngine -- auto-route a manufacturing process plan to JM Die's
     3	 * REAL machines, across the FULL build process.
     4	 *
     5	 * Closes the keystone gap exposed by the C-033626 flattening-die-set quote
     6	 * (machining times were LLM-guessed because nothing routed a part's operations
     7	 * to specific JM machines). This engine decomposes a part i
... [+22593 chars truncated]

### Assistant | 2026-06-18T20:34:24.328Z

Now the test file and the dispatcher hunk.

### Assistant | 2026-06-18T20:34:25.286Z

[tool_use: Bash]

### User | 2026-06-18T20:34:34.705Z

[tool_result]      1	/**
     2	 * ProcessRoutingEngine tests -- QUOTE-GROUNDING-MS0/U1.
     3	 *
     4	 * Verifies INTENT (R9), not shape: the engine must route each operation to the
     5	 * SAME JM machine + rate that ShopConfigurationEngine.selectCapableMachines
     6	 * would pick, auto-inject heat-treat for hardened parts as an OUTSOURCE step,
     7	 * sequence ops in canonical build order, and flag 
... [+10369 chars truncated]

### Assistant | 2026-06-18T20:34:37.597Z

Now the dispatcher hunk. Let me look at the businessDispatcher change and the surrounding context.

### Assistant | 2026-06-18T20:34:38.461Z

[tool_use: Bash]

### User | 2026-06-18T20:34:46.662Z

[tool_result] commit 52622e80cb5be801dfe058397c219af65d394235
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 18 15:32:12 2026 -0500

    [MAIN-FORCE] [QUOTE-GROUNDING-MS0]/U1-PROCESS-ROUTING (slot:charlie): operation-decomposition + JM machine routing keystone
    
    Closes the keystone gap exposed by the C-033626 die-set quote (machining times
    were LLM-guessed because nothing
... [+1955 chars truncated]

### Assistant | 2026-06-18T20:34:50.223Z

The wiring looks correct: enum entry added, case handler added, real `processRoutingEngine.route(params)` call with lazy import. Now let me verify the dependencies are real — that `selectCapableMachines`, `getRates`, `getMachines` exist with the expected signatures/return shapes, and that `ProcessPlanEngine.generate` exists. Let me also verify the false-wire guard test referenced in the commit message and check the action enum / schema for completeness.

### Assistant | 2026-06-18T20:34:52.115Z

[tool_use: Grep]

### Assistant | 2026-06-18T20:34:53.599Z

[tool_use: Grep]

### User | 2026-06-18T20:34:53.882Z

[tool_result] 32:  labor_per_hr: number;
35:  setup_per_hr: number;
37:  inspection_per_hr: number;
173:  labor_per_hr: 55.00,         // JM Die — skilled tool & die labor
176:  setup_per_hr: 65.00,         // JM Die — die setup is precision work
178:  inspection_per_hr: 55.00,    // JM Die — inspection/QC
550:  getRates(profileId: string = ShopConfigurationEngine.DEFAULT_PROFILE_ID): ShopRates {
575:      cons
... [+1793 chars truncated]

### User | 2026-06-18T20:34:55.438Z

[tool_result] 8: * Actions: plan_generate, plan_optimize, plan_estimate_time, plan_validate
15:export type FeatureCategory = "hole" | "pocket" | "slot" | "face" | "profile" | "thread" | "chamfer" | "bore" | "groove" | "freeform";
19:export interface PartFeature {
36:export interface ProcessPlanInput {
47:export interface ProcessOperation {
51:  feature_ids: string[];
64:  estimated_time_min: number;
70:export i
... [+2534 chars truncated]

### Assistant | 2026-06-18T20:35:00.526Z

The dependencies are real. Now let me verify two critical points:

1. The `selectCapableMachines` signature — the engine calls it with a `min_work_envelope_mm` field. Let me check the actual parameter shape.
2. The `PartFeature` interface — the test fixture passes features with `dimensions`, `tolerance_mm`, `count`. Let me confirm those match.
3. Whether the milling features in the test fixture actually produce a "drill" op (the canonical-order test depends on a drill op existing).

### Assistant | 2026-06-18T20:35:02.009Z

[tool_use: Read]

### Assistant | 2026-06-18T20:35:02.589Z

[tool_use: Read]

### User | 2026-06-18T20:35:05.881Z

[tool_result] 766	  selectCapableMachines(
767	    requirements: {
768	      min_spindle_rpm?: number;
769	      min_power_kw?: number;
770	      min_work_envelope_mm?: { x?: number; y?: number; z?: number };
771	      simultaneous_axes?: number;
772	      capabilities?: string[];
773	    },
774	    profileId: string = ShopConfigurationEngine.DEFAULT_PROFILE_ID,
775	  ): Array<{
776	    machine_id: string;
777	
... [+5219 chars truncated]

### User | 2026-06-18T20:35:06.423Z

[tool_result] 15	export type FeatureCategory = "hole" | "pocket" | "slot" | "face" | "profile" | "thread" | "chamfer" | "bore" | "groove" | "freeform";
16	
17	/** Part Feature configuration/data structure.
18	 */
19	export interface PartFeature {
20	  id: string;
21	  type: FeatureCategory;
22	  dimensions: {
23	    diameter_mm?: number;
24	    width_mm?: number;
25	    length_mm?: number;
26	    depth_mm?: num
... [+1328 chars truncated]

### Assistant | 2026-06-18T20:35:11.841Z

Now I have a clear picture of the dependencies. Let me verify two critical test-integrity concerns:

1. The "routes to the SAME machine" tests — `expectedMachine(tag)` in the test re-derives via `selectCapableMachines({capabilities:[tag]})` (capability-only, no envelope), while the engine first tries WITH envelope then falls back to capability-only. I need to confirm these don't diverge for the test fixture (whether the test could pass even if the engine routed to a different machine).

2. Whether the test fixture's milling features actually decompose into a `drill` op (the canonical-order test asserts `idx(ops,"drill") >= 0`).

Let me check the JM Die machine roster and the milling-op classification path. First, the machine capabilities in the jm-die profile.

### Assistant | 2026-06-18T20:35:13.782Z

[tool_use: Bash]

### User | 2026-06-18T20:35:19.075Z

[tool_result] 37:  inspection_per_hr: number;
44:  hourly_rate: number;
46:  capabilities: string[];
178:  inspection_per_hr: 55.00,    // JM Die — inspection/QC
196:    "Cold heading dies, punches, sinker EDM electrodes, wire EDM tooling, and precision turning/milling.",
224:  const capabilities = machine.capabilities.map((capability) => capability.toLowerCase());
225:  return capabilities.some((capability) =>
... [+4877 chars truncated]

### Assistant | 2026-06-18T20:35:27.341Z

This is important for the test-integrity analysis. Key observations for the unique-capability tags used in the "SAME machine" tests:

- `wire_edm`: only WEDM-01 has it → unique machine.
- `surface_grinding`: only GRND-01 has it → unique machine.
- `cutoff`: only SAW-01 has it → unique machine.
- `inspection`: INS-01 (CMM, $95) and INS-02 (Optical, $45) both have it. Two capable machines — cheapest-first sort matters here.
- `turning`: many lathes have it (LTH-01..07, MAN-01) → cheapest is what matters.

Now the critical R9 question: are the "SAME machine" assertions tautological? The test's `expectedMachine(tag)` calls `selectCapableMachines({capabilities:[tag]})` (capability-only, NO envelope filter). The engine's first attempt uses an envelope filter `{capabilities, min_work_envelope_mm}`, then falls back to capability-only. Let me confirm whether the envelope-filtered path would diverge — i.e., whether the test would catch the engine picking a wrong machine. Let me check how envelope rejection works (whether machines have populated envelopes that could change cheapest-first ordering).

### Assistant | 2026-06-18T20:35:28.702Z

[tool_use: Bash]

### User | 2026-06-18T20:35:34.257Z

[tool_result] 56:  work_envelope?: { x_mm: number; y_mm?: number; z_mm: number };
252:    work_envelope: { x_mm: 260, z_mm: 550 },
263:    work_envelope: { x_mm: 200, z_mm: 350 },
274:    work_envelope: { x_mm: 200, z_mm: 500 },
285:    work_envelope: { x_mm: 200, z_mm: 500 },
296:    work_envelope: { x_mm: 340, z_mm: 600 },
307:    work_envelope: { x_mm: 320, z_mm: 600 },
318:    work_envelope: { x_mm: 320, z_
... [+1148 chars truncated]

### Assistant | 2026-06-18T20:35:43.673Z

Important detail: the envelope check in `selectCapableMachines` reads from `capProfile.work_envelope` (the handbook capability engine's profile, gated on `capabilityEngine && handbookRegistry` being available), NOT the `machine.work_envelope` static field. The static `work_envelope` on machines (lines 252+) is never used in `selectCapableMachines` envelope rejection — that path only fires if the handbook capability engine loads AND returns a profile with `field_count > 0` and `work_envelope`.

This means for the test fixture, whether the engine's envelope-filtered call diverges from the test's capability-only call depends on whether the handbook engine is loaded in the test environment. The key R9 question remains: do the "SAME machine" assertions prove real routing behavior or are they tautological?

Let me analyze the tautology concern precisely. The test computes `expectedMachine(tag)` independently and asserts the engine's chosen `machine_id` equals it. This is NOT tautological in the harmful sense — the test re-derives the expected machine from a *different* call shape (capability-only) than the engine's primary call (envelope+capability with fallback), and crucially asserts against an *independent, capability-anchored* expectation. Let me verify the test would actually fail if routing were broken by checking the cross-validation assertions (the `getMachines().find(...).capabilities` checks), which prove the chosen machine genuinely has the capability.

Let me now run the tests to confirm they pass and check for `.skip`/`.only` and the false-wire guard test mentioned in the commit.

### Assistant | 2026-06-18T20:35:45.818Z

[tool_use: Bash]

### User | 2026-06-18T20:35:56.514Z

[tool_result] mcp-server/src/tools/dispatchers/businessDispatcher.ts:674:  "quote_route_operations",
mcp-server/src/tools/dispatchers/businessDispatcher.ts:2535:          case "quote_route_operations": {
mcp-server/src/tools/dispatchers/businessDispatcher.ts:4322:            result = _milestoneTracking.milestoneTrackingEngine.skipMilestone(p);
---FALSE-WIRE-GUARD---
mcp-server/src/engines/ProcessRoutingEngine.t
... [+69 chars truncated]

### Assistant | 2026-06-18T20:36:00.890Z

The `4322` hit is `skipMilestone` (a method name, not a test `.skip`) — not relevant. No `.skip`/`.only`/`toBeDefined` stubs in the test file. The false-wire guard test mentioned in the commit message ("20/20 false-wire guard") is NOT in a file matching `quote_route_operations` — let me find it. The commit message claims a separate false-wire guard test. Let me check whether it exists and whether the dispatcher action validates input (z.enum schema for params).

### Assistant | 2026-06-18T20:36:03.244Z

[tool_use: Bash]

### User | 2026-06-18T20:36:08.565Z

[tool_result] ---ACTIONS enum type (z.enum?)---
583:const ACTIONS = [
1626:Actions: ${ACTIONS.join(", ")}.
1629:      action: z.enum(ACTIONS),
1636:      action: typeof ACTIONS[number];
---false-wire test files mentioning processRouting / business false-wire---
mcp-server/src/__tests__/businessDispatcher.false-wire-regression-guard.test.ts
mcp-server/src/__tests__/ProcessRoutingEngine.test.ts

### Assistant | 2026-06-18T20:36:13.890Z

The `ACTIONS` array is consumed by `z.enum(ACTIONS)` at line 1629, so adding `"quote_route_operations"` to the array correctly registers it as a valid action AND types the switch (`typeof ACTIONS[number]`). The false-wire guard test exists. Let me verify it actually covers this new action and check whether it's a real regression guard. Let me also confirm the dispatcher passes `params as any` without validating — checking whether untrusted input is validated (the engine itself fail-loud validates, which is the relevant guard).

### Assistant | 2026-06-18T20:36:14.655Z

[tool_use: Bash]

### User | 2026-06-18T20:36:20.669Z

[tool_result] 11: *   The existing route test MOCKS callTool -- it proves the deny-by-default security GATE works, but
15: *   not a placeholder. The two files are complementary: route test = gate; this = the wires behind it.

### Assistant | 2026-06-18T20:36:23.234Z

The false-wire guard test does NOT specifically reference `quote_route_operations`. Let me read its actual assertions to understand whether it dynamically covers all actions (which would include the new one) or is a fixed list that omits the new action.

### Assistant | 2026-06-18T20:36:23.772Z

[tool_use: Read]

### User | 2026-06-18T20:36:24.709Z

[tool_result] 1	/**
2	 * businessDispatcher.false-wire-regression-guard.test.ts
3	 *
4	 * U-HOTEL-FALSE-WIRE-REGRESSION-GUARD (slot:hotel) -- standing guard against the BUSINESS-CLEANUP
5	 * false-wire bug class. The BUSINESS-CLEANUP arc (commits 701210abf2, 919e40e395, c9874f0623) fixed
6	 * 341 "false wires" -- prism_business actions that were in the enum but routed to a placeholder/echo
7	 * instead of a rea
... [+11653 chars truncated]

### Assistant | 2026-06-18T20:36:30.607Z

Now I understand the false-wire guard fully. It scopes to `BUSINESS_DISPATCH_ALLOWLIST` (the browser-reachable read surface), NOT all enum actions. `quote_route_operations` is a new write/compute action and is correctly NOT in that read-only allowlist — so the false-wire guard's "20/20" passing is unrelated to this new action (the commit message conflating them is a minor inaccuracy, but the guard is not claimed to cover it). The actual coverage for the new action is `ProcessRoutingEngine.test.ts`.

Now let me run the actual tests to confirm they pass (R9 — would they fail if logic broke). Let me run the ProcessRoutingEngine test suite.

### Assistant | 2026-06-18T20:36:31.490Z

[tool_use: Bash]

### User | 2026-06-18T20:36:38.542Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/__tests__/ProcessRoutingEngine.test.ts (15 tests) 28ms

 Test Files  1 passed (1)
      Tests  15 passed (15)
   Start at  15:36:37
   Duration  409ms (transform 141ms, setup 0ms, import 220ms, tests 28ms, environment 0ms)

### Assistant | 2026-06-18T20:36:44.717Z

15/15 pass. Now let me verify the R9 question empirically: would the "SAME machine" tests actually FAIL if routing were broken? Let me confirm the tests are not tautological by checking whether the engine's chosen machine for a multi-capable tag (like `inspection` with INS-01 $95 vs INS-02 $45, or `turning` with 8 machines) is independently asserted. The key test is `inspect` and `turn` where cheapest-first ordering is non-trivial. Let me do a quick mutation check — temporarily verify that if I made the engine pick `capable[capable.length-1]` (most expensive) instead of `capable[0]`, the test would fail. I'll do this via a throwaway in-memory check without editing the source.

### Assistant | 2026-06-18T20:36:50.357Z

[tool_use: Bash]

### User | 2026-06-18T20:36:55.867Z

[tool_result] node:internal/modules/run_main:122
    triggerUncaughtException(
    ^
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\wompu\AppData\Local\Temp\src\engines\ShopConfigurationEngine.js' imported from C:\Users\wompu\AppData\Local\Temp\mutation-check.mjs
    at finalizeResolution (node:internal/modules/esm/resolve:275:11)
    at moduleResolve (node:internal/modules/esm/resolve:932:10)
... [+832 chars truncated]

### Assistant | 2026-06-18T20:36:59.113Z

Path resolution issue — the script ran from temp. Let me place it in the mcp-server dir with an absolute import.

### Assistant | 2026-06-18T20:37:04.595Z

[tool_use: Bash]

### User | 2026-06-18T20:37:13.190Z

[tool_result] inspection count: 2 cheapest: INS-02 @ 45 | most-exp: INS-01 @ 95 | distinguishable: true
turning count: 8 cheapest: MAN-01 @ 45 | most-exp: LTH-07 @ 125 | distinguishable: true
wire_edm count: 1 cheapest: WEDM-01 @ 85 | most-exp: WEDM-01 @ 85 | distinguishable: false
surface_grinding count: 1 cheapest: GRND-01 @ 55 | most-exp: GRND-01 @ 55 | distinguishable: false
cutoff count: 1 cheapest: SAW-01
... [+186 chars truncated]

### Assistant | 2026-06-18T20:37:24.801Z

This confirms the R9 analysis precisely:

- **`inspect` (2 machines)** and **`turn` (8 machines)** are DISTINGUISHABLE — the test's assertion that the engine picks INS-02 ($45, cheapest) over INS-01 ($95), and MAN-01 ($45) over LTH-07 ($125), genuinely proves the engine's cheapest-first selection. A broken engine (e.g. picking the most-expensive or first-listed) WOULD fail these. The `turn` adversarial test additionally proves it routes to a real lathe with `turning` capability rather than silently picking the global cheapest machine. These are **not tautological** — even though `expectedMachine` re-uses `selectCapableMachines`, it re-derives the expected pick independently and asserts the engine matched it, AND cross-validates the chosen machine genuinely has the capability via `getMachines().capabilities`. If the engine picked wrong (wrong sort, wrong capability tag, wrong fallback), the assertion fails.

- **`wire_edm`, `surface_grinding`, `cutoff` (1 machine each)** — for these the "SAME machine" check is weaker (only one capable machine exists, so any non-broken capability filter lands there), but the test still cross-validates the chosen machine has the right capability tag and that `rate_basis`/`outsource`/`hourly_rate` are correct. Not tautological in the harmful sense; just less discriminating because the roster offers no alternative.

Now let me verify the inline-constant concern definitively. The two named constants are `HARDENED_HRC=50` (Rockwell threshold) and `PRECISION_TOLERANCE_MM=0.013` (tolerance threshold). Let me grep the engine for any `$`, rate, margin, or numeric that could be a shop rate or physics constant, and confirm all rates come from ShopConfigurationEngine.

### Assistant | 2026-06-18T20:37:26.434Z

[tool_use: Bash]

### User | 2026-06-18T20:37:35.658Z

[tool_result] 1:/**
2: * ProcessRoutingEngine -- auto-route a manufacturing process plan to JM Die's
3: * REAL machines, across the FULL build process.
4: *
5: * Closes the keystone gap exposed by the C-033626 flattening-die-set quote
6: * (machining times were LLM-guessed because nothing routed a part's operations
7: * to specific JM machines). This engine decomposes a part into an ordered
8: * operation seque
... [+21054 chars truncated]

### Assistant | 2026-06-18T20:37:53.824Z

Confirmed on the inline-constant axis:

- The **only** literal numerics in the engine body are `HARDENED_HRC=50` and `PRECISION_TOLERANCE_MM=0.013` (both routing thresholds, NOT shop rates/$-per-hr/margins/physics constants), plus `round2`'s 100 (a math helper) and `seq` arithmetic. No `$/hr`, no margin, no markup, no Kienzle/Taylor constant.
- All rates flow from `shopConfigurationEngine.getRates(profileId)` (line 220) and `chosen.effective_rate` from `selectCapableMachines` (line 433). Bench labor uses `rates.labor_per_hr` (line 379). Outsource/HT correctly set `hourly_rate: 0` (pass-through, priced downstream). This fully satisfies the charlie soul "no inline-shop-rate-constants" refuse.

On the **fabrication-of-time** axis (the safety-critical concern): confirmed correct. Ungrounded ops get `time_min: 0` and `time_source: "pending-physics"` (line 360 — `time_min=0` when no `provisional_time_min`; line 289 sets `pending-physics`). A warning is emitted (line 334-335). The test at lines 119-130 proves wire_edm/jig_bore are `pending-physics` with `time_min===0`, while milling ops carry real ProcessPlanEngine parametric time. No minute is fabricated.

Now, one judgment call regarding the two thresholds. `HARDENED_HRC=50` and `PRECISION_TOLERANCE_MM=0.013` are domain routing thresholds (well-documented with literature-style inline rationale `~0.0005"`), not shop rates or physics constants — these are acceptable as local engine constants. They are not values that belong in `constants.ts` (which is for Kienzle/Taylor/material) nor in ShopConfigurationEngine (which is rates/machines). This is fine.

Let me do a final check: the `round2` on `provisional_time_min` and whether the dispatcher's `params as any` bypasses any validation that should exist. The engine validates structurally (fail-loud), which is the right place. Let me confirm there's no other consumer left unupdated and check ASCII-only conformance (no smart quotes/em-dashes in code — I see `--` not em-dashes, a
... [+86 chars truncated]

### Assistant | 2026-06-18T20:37:56.671Z

[tool_use: Bash]

### User | 2026-06-18T20:38:01.840Z

[tool_result] === non-ASCII in engine body (excluding comments box-draw) ===
grep: -P supports only unibyte and UTF-8 locales
=== em-dash / smart-quote in engine ===
grep: -P supports only unibyte and UTF-8 locales
=== dispatcher box-draw context (matches surrounding?) ===
145:// ── HOTEL self-merge: QB-parity + networking marketplace (30 engines, 2026-05-31) ──
190:    // ── HOTEL self-merge engines (QB-parity
... [+234 chars truncated]

### Assistant | 2026-06-18T20:38:06.279Z

The `-P` flag isn't supported in this grep locale, but the last command confirms the key point: the `──` box-drawing characters the new dispatcher hunk uses (`// ── Process Routing ──`) **match the existing surrounding convention** in businessDispatcher.ts (lines 145, 190, 550 all use the same `──` section markers). So convention conformance is satisfied. The engine body uses ASCII `--` throughout (visible in the full read), not em-dashes.

Let me do a final quick non-ASCII scan with a Python check on the engine to be thorough.

### Assistant | 2026-06-18T20:38:08.597Z

[tool_use: Bash]

### User | 2026-06-18T20:38:13.328Z

[tool_result] scan done

### Assistant | 2026-06-18T20:38:40.815Z

Both the engine and test files are pure ASCII — no smart-quotes, no em-dashes. (The `──` box-drawing characters are only in the dispatcher hunk, where they match the existing surrounding convention.)

I have everything I need. Let me compile my findings.

## Summary of verification

**Wiring (verified real, no false-wire):**
- Enum entry: `businessDispatcher.ts:674` `"quote_route_operations"` added to `ACTIONS`, consumed by `z.enum(ACTIONS)` at `:1629` and types the switch via `typeof ACTIONS[number]` at `:1636`.
- Handler: `businessDispatcher.ts:2535` real `case` with lazy `import("../../engines/ProcessRoutingEngine.js")` then `processRoutingEngine.route(params as any)` — a genuine engine call, not a stub/echo.
- The `selectCapableMachines`/`getRates`/`getMachines` dependencies all exist with matching signatures (`ShopConfigurationEngine.ts:766,550,593`); `processPlanEngine.generate` + `PartFeature` exist and the fixture matches the interface.

**Test integrity (R9 — verified non-tautological):** Empirically proved the multi-capable tags are distinguishable: `inspect` (INS-02 $45 vs INS-01 $95) and `turn` (MAN-01 $45 vs LTH-07 $125). The "SAME machine" assertions re-derive the expected pick from an independent call AND cross-validate the chosen machine genuinely carries the capability — a broken sort/tag/fallback would fail. Single-capability tags (wire_edm/surface_grinding/cutoff) are less discriminating but still cross-validated. 15/15 pass; no `.skip`/`.only`/`toBeDefined`; happy + 5 failure-mode + 3 adversarial.

**Inline constants (verified clean):** No shop rate, $/hr, margin, or physics constant inlined. All rates from `getRates`/`effective_rate`. `HARDENED_HRC=50` and `PRECISION_TOLERANCE_MM=0.013` are acceptable domain routing thresholds (not rates/physics).

**Fabrication (verified clean, R12):** Ungrounded ops → `time_min:0` + `time_source:"pending-physics"` + warning. Never invents a minute.

**Minor note:** the commit message's "20/20 false-wire guard"
... [+2890 chars truncated]
