---
type: "chat-session"
source: "claude-code-cli"
session_id: "4c896ca9-8e03-4cbf-9b68-0250f060c32f"
title: "You are reviewer C of three independent Claude PRISM reviewers — the analyst, we"
date: "2026-06-22"
first_ts: "2026-06-22T05:38:26.615Z"
last_ts: "2026-06-22T05:43:08.988Z"
cwd: "H:\\prism"
messages: 63
user_msgs: 24
assistant_msgs: 39
raw_file: "H:/.claude/projects/H--prism/4c896ca9-8e03-4cbf-9b68-0250f060c32f/subagents/agent-aa643b99a7831fe5a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# You are reviewer C of three independent Claude PRISM reviewers — the analyst, we

> **claude-code-cli** | 2026-06-22 | 63 msgs (24 user / 39 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/4c896ca9-8e03-4cbf-9b68-0250f060c32f/subagents/agent-aa643b99a7831fe5a.jsonl`

## Transcript

### User | 2026-06-22T05:38:26.615Z

You are reviewer C of three independent Claude PRISM reviewers — the analyst, weighted toward SILENT BREAKAGE, REGRESSION RISK, and shared-TYPE blast radius. Do NOT assume A or B caught everything. Review commit efb570b720 (`git -C H:/prism show efb570b720`): adds two OPTIONAL fields to the shared MachineSpindle (base_rpm?) + MachineAxes (max_cutting_feed_mmmin?) types in src/types.ts, makes MachineAwareSpeedFeedEngine.extractConstraints read them (was hardcoded 15000/1500), and corrects test fixtures.

Focus areas:
1. BLAST RADIUS of the shared-type change: MachineSpindle/MachineAxes are used across many engines. Adding OPTIONAL fields should be backward-compatible — VERIFY with a full `cd H:/prism/mcp-server && npx tsc --noEmit` that NOTHING else broke (report the exact error count). Grep for other consumers of these types that might be affected.
2. REGRESSION: did changing extractConstraints from hardcoded 15000/1500 to `field ?? 15000/1500` change behavior for any CURRENT caller whose machine package lacks the new fields? (Should be byte-identical via `??`.) Are there OTHER call sites of extractConstraints (orchestrators, dispatchers) that now see different maxFeedRate/baseRpm for real machine packages — and is that change correct/intended?
3. Does any real machine-package DATA file already populate `max_feed_mmmin` or `base_rpm` under a DIFFERENT name that should map to the new fields (a data-wiring gap)? Note if real packages won't populate the new fields (engine stays on defaults — a follow-up wiring need, not a bug here).
4. The test fixtures are cast `as any` — confirm removing the fake field names doesn't hide a real type mismatch.

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then P0/P1 findings with file:line, then <=5 notes. If unsure, FAIL.

### Assistant | 2026-06-22T05:38:29.772Z

I'll review commit efb570b720 with focus on silent breakage and regression risk. Let me start by examining the commit and the shared types.

### Assistant | 2026-06-22T05:38:30.614Z

[tool_use: Bash]

### User | 2026-06-22T05:38:35.982Z

[tool_result] commit efb570b7204904795fb94b23bdb01c271db9a555
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 22 00:37:41 2026 -0500

    [MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-MACHINEAWARE-CONSTRAINTS (slot:oscar): make machine-aware S/F clamping respect per-machine feed/base-rpm (was hardcoded) + fix fixture field names (7 reds)
    
    MachineAwareSpeedFeedEngine.extractConstraints
... [+9139 chars truncated]

### Assistant | 2026-06-22T05:38:42.988Z

I have the full diff. Now let me run the authoritative tsc check (focus area 1) and examine consumers in parallel.

### Assistant | 2026-06-22T05:38:44.876Z

[tool_use: Bash]

### Assistant | 2026-06-22T05:38:45.939Z

[tool_use: Grep]

### User | 2026-06-22T05:39:42.602Z

[tool_result] <--- Last few GCs --->

[31212:000002471DFA1000]    22844 ms: Mark-Compact 4033.1 (4133.6) -> 4018.0 (4134.6) MB, pooled: 3 MB, 715.83 / 0.00 ms  (average mu = 0.087, current mu = 0.066) allocation failure; scavenge might not succeed
[31212:000002471DFA1000]    23685 ms: Mark-Compact 4034.7 (4135.4) -> 4019.2 (4135.9) MB, pooled: 2 MB, 794.87 / 0.00 ms  (average mu = 0.071, current mu = 0.055) 
... [+836 chars truncated]

### User | 2026-06-22T05:39:44.149Z

[tool_result] <persisted-output>
Output too large (29.6KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\4c896ca9-8e03-4cbf-9b68-0250f060c32f\tool-results\toolu_01MrzwR7ekreLXtH2qgxPEfo.txt

Preview (first 2KB):
mcp-server\src\algorithms\ChipVolumeRate.ts:63:  cutting_power_kw: number;
mcp-server\src\algorithms\ChipVolumeRate.ts:267:      cutting_power_kw: powerKW,
mcp-server\src\algorithms\Ch
... [+1781 chars truncated]

### Assistant | 2026-06-22T05:39:47.220Z

The raw `tsc` OOM'd (default heap). The exit 0 and count 0 are misleading — tsc crashed before completing, so those numbers are NOT a clean pass. I need to re-run with the project's heap settings. Let me check how the project runs tsc.

### Assistant | 2026-06-22T05:39:48.456Z

[tool_use: Bash]

### User | 2026-06-22T05:39:52.822Z

[tool_result] {
  "patch": "node scripts/close_gaps.js && node scripts/add_atcs_renames.js",
  "extract": "node scripts/extract_ahw.js",
  "build": "node --max-old-space-size=16384 node_modules/typescript/bin/tsc --noEmit && node esbuild.config.mjs",
  "build:tsc": "node --max-old-space-size=16384 node_modules/typescript/bin/tsc",
  "start": "node dist/index.js",
  "start:http": "node scripts/start-http.mjs",
 
... [+1578 chars truncated]

### Assistant | 2026-06-22T05:39:56.312Z

Now I'll run tsc with the 16GB heap (the project's canonical invocation). This is the load-bearing check for focus area 1.

### Assistant | 2026-06-22T05:40:03.399Z

[tool_use: Bash]

### User | 2026-06-22T05:40:28.271Z

[tool_result] EXIT=0
===ERROR COUNT===
0
===ERRORS MENTIONING our types===
===FIRST 20 ERRORS (if any)===

### Assistant | 2026-06-22T05:40:31.007Z

Clean tsc with the proper heap: **0 errors, exit 0**. The shared-type change is backward-compatible. Now let me trace the blast radius of the two new fields and the `extractConstraints` call sites.

### Assistant | 2026-06-22T05:40:32.420Z

[tool_use: Grep]

### Assistant | 2026-06-22T05:40:32.781Z

[tool_use: Read]

### User | 2026-06-22T05:40:36.027Z

[tool_result] 415	  max_workpiece_weight?: number;
416	  max_workpiece_diameter?: number;
417	  max_workpiece_length?: number;
418	}
419	
420	export interface MachineSpindle {
421	  max_rpm: number;
422	  min_rpm?: number;
423	  /** Base (constant-torque) RPM: rated torque is flat below this and falls off
424	   *  inversely above it (constant-power region). Drives machine-aware torque
425	   *  curves; optiona
... [+1349 chars truncated]

### User | 2026-06-22T05:40:36.054Z

[tool_result] mcp-server\src\engines\IntentDecompositionEngine.ts:304:function extractConstraints(query: string): ExtractedEntities['constraints'] | undefined {
mcp-server\src\engines\IntentDecompositionEngine.ts:653:  entities.constraints = extractConstraints(query);
mcp-server\src\engines\MachineAwareSpeedFeedEngine.ts:142:  extractConstraints(pkg: CanonicalMachinePackage): MachineConstraints {
mcp-server\src
... [+1307 chars truncated]

### Assistant | 2026-06-22T05:40:40.060Z

The new `MachineAxes` fields `linear_axes`/`rotary_axes` are REQUIRED (non-optional) in the type. The old fixtures omitted them, which means the old fixtures should have been type-errors already (but were cast `as any`). Let me verify the engine call sites and check whether real machine-package DATA files would populate the new fields. Let me read the engine's usage of constraints and look for real machine data.

### Assistant | 2026-06-22T05:40:41.081Z

[tool_use: Read]

### User | 2026-06-22T05:40:42.076Z

[tool_result] 125	    passed: boolean;
126	    hooksExecuted: string[];
127	    warnings: string[];
128	    blocked?: string;
129	  };
130	  /** Recommendations */
131	  recommendations: string[];
132	}
133	
134	// ============================================================================
135	// ENGINE
136	// ============================================================================
137	
138	class MachineAw
... [+3090 chars truncated]

### Assistant | 2026-06-22T05:40:45.865Z

Now let me check whether real machine-package DATA files populate these fields under a different name (focus area 3), and verify the test fixtures' `as any` cast doesn't hide a real mismatch. Let me find the canonical machine package data and check the `CanonicalMachinePackage` source.

### Assistant | 2026-06-22T05:40:46.809Z

[tool_use: Grep]

### Assistant | 2026-06-22T05:40:48.344Z

[tool_use: Grep]

### User | 2026-06-22T05:40:48.650Z

[tool_result] Found 22 files
mcp-server\src\__tests__\MachineAwareSpeedFeedEngine.test.ts
mcp-server\src\engines\MachineAwareSpeedFeedEngine.ts
mcp-server\src\tools\dispatchers\devDispatcher.ts
mcp-server\src\schemas\calcActionSchemas.ts
mcp-server\src\engines\ShopMachineOverlayEngine.ts
mcp-server\src\routes\machineAudit.ts
mcp-server\src\tools\dispatchers\calcDispatcher.ts
mcp-server\src\schemas\devActionSche
... [+764 chars truncated]

### User | 2026-06-22T05:40:49.918Z

[tool_result] Found 40 files limit: 40
mcp-server\data\state\TEST_COVERAGE_INDEX.json
mcp-server\data\machine-handbooks\okuma-m460v-5ax.json
mcp-server\data\machine-handbooks\hurco-vm30i.json
mcp-server\data\machine-handbooks\haas-vf-2.json
mcp-server\data\prism-reference-db\MANIFEST.json
mcp-server\data\prism-reference-db\tools.json
mcp-server\data\prism-reference-db\post.json
mcp-server\data\prism-reference-d
... [+1960 chars truncated]

### Assistant | 2026-06-22T05:40:53.425Z

Let me examine the real machine package data files to determine the data-wiring gap (focus area 3), and the `MachinePackage.ts` type to confirm `CanonicalMachinePackage`'s axes shape.

### Assistant | 2026-06-22T05:40:55.931Z

[tool_use: Bash]

### Assistant | 2026-06-22T05:40:58.386Z

[tool_use: Bash]

### User | 2026-06-22T05:40:59.557Z

[tool_result] ===haas-vf-2.json axes/spindle keys===
top keys: [
  'id',                  'machine_id',
  'manufacturer',        'model',
  'version',             'created_at',
  'updated_at',          'cover_info',
  'spindle_specs',       'axis_kinematics',
  'controller_features', 'alarm_codes',
  'parts_book',          'maintenance_schedule',
  'programming_tips',    'safety_limits',
  'coolant_specs',     
... [+75 chars truncated]

### User | 2026-06-22T05:41:03.013Z

[tool_result] ===prism-reference-db machines.json sample===
count: ?
sample machine keys: [
  '0', '1', '2',
  '3', '4', '5',
  '6', '7'
]

### Assistant | 2026-06-22T05:41:06.225Z

The handbook uses a totally different shape (`spindle_specs`/`axis_kinematics`), not the `CanonicalMachinePackage` shape. Let me find where `CanonicalMachinePackage` instances actually get built/populated to determine whether the new fields will ever be filled by real data, and read the `MachinePackage.ts` type.

### Assistant | 2026-06-22T05:41:08.595Z

[tool_use: Bash]

### Assistant | 2026-06-22T05:41:10.023Z

[tool_use: Grep]

### User | 2026-06-22T05:41:12.400Z

[tool_result] ===haas-vf-2 spindle_specs + axis_kinematics + safety_limits===
spindle_specs: {"max_rpm":8100,"min_rpm":0,"power_continuous_kw":22.4,"power_peak_kw":22.4,"torque_max_nm":122,"taper_type":"CT40","drive_type":"direct","warmup_procedure":"Run the spindle warm-up program (O02020 on Classic control) or ramp S1000/5min, S3000/5min, S6000/5min, S8100/5min after idle >4 hours.","source":{"handbook_title"
... [+1052 chars truncated]

### User | 2026-06-22T05:41:13.826Z

[tool_result] No matches found

### Assistant | 2026-06-22T05:41:19.395Z

This is the key finding for focus area 3. The real handbook data (`haas-vf-2.json`) DOES carry the relevant numbers but under entirely different names and structures:
- `axis_kinematics.axes[].max_feed_mm_min: 16500` (per-axis array, not `axes.max_cutting_feed_mmmin`)
- `spindle_specs.power_continuous_kw` etc. (not the `CanonicalMachinePackage.spindle` shape at all)

And critically, there's NO `base_rpm` anywhere in the real Haas data. So real machine packages won't populate the new `CanonicalMachinePackage` fields unless a merger/mapping layer does the translation. Let me confirm how `CanonicalMachinePackage` is actually constructed from these handbooks — find the merger/builder that produces the canonical shape.

### Assistant | 2026-06-22T05:41:20.345Z

[tool_use: Read]

### User | 2026-06-22T05:41:21.184Z

[tool_result] 1	/**
2	 * MCAT-MS0 U-MCAT02: Canonical Machine Package Types
3	 *
4	 * Unifies the 3 colliding machine models into one canonical type:
5	 * 1. Machine (types.ts) — rich structured interface
6	 * 2. MachineCapabilitySnapshot (userMachineProfile.ts) — user-facing profile
7	 * 3. Enriched corpus JSON (ad-hoc per-manufacturer schemas)
8	 *
9	 * CanonicalMachinePackage wraps Machine with provenance, c
... [+1916 chars truncated]

### Assistant | 2026-06-22T05:41:21.688Z

[tool_use: Grep]

### User | 2026-06-22T05:41:23.028Z

[tool_result] 86-    capabilities: string[];
87-  };
88:  spindle: {
89-    id: string;
90-    max_rpm: number;
--
103-  kinematics: {
104-    axis_count: number;
105:    axes: string[];
106-  };
107-  overlay?: {
--
218-        model: ctx.model,
219-        controller: ctx.controller,
220:        spindle: ctx.spindle,
221-        coolant: {
222-          enabled_strategies: ctx.coolant.enabled_strategies,
--
2
... [+184 chars truncated]

### Assistant | 2026-06-22T05:41:26.446Z

Let me confirm whether the MachineLayerMerger (which produces the canonical package from the handbook layers) maps the per-axis `max_feed_mm_min` into `axes.max_cutting_feed_mmmin` and whether any source produces `base_rpm`. This determines whether the data-wiring gap is real (engine stays on defaults for real packages).

### Assistant | 2026-06-22T05:41:28.805Z

[tool_use: Grep]

### User | 2026-06-22T05:41:30.142Z

[tool_result] 228:    const axesResult = this.mergeObject('axes', normalizedInputs.map(i => ({ ...i, value: i.value.axes })));
359:      axes: avg(groups.axes),

### Assistant | 2026-06-22T05:41:30.796Z

[tool_use: Bash]

### User | 2026-06-22T05:41:41.358Z

[tool_result] <persisted-output>
Output too large (58.2KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\4c896ca9-8e03-4cbf-9b68-0250f060c32f\tool-results\b15y2fszf.txt

Preview (first 2KB):
===grep entire src for who SETS axes.max_cutting_feed or constructs CanonicalMachinePackage axes===
src/engines/MachineAwareSpeedFeedEngine.ts:154:      maxFeedRate: axes?.max_cutting_feed_mmmin ?? 15000,

... [+1800 chars truncated]

### Assistant | 2026-06-22T05:41:50.958Z

This confirms the data-wiring gap precisely. The key findings:

1. **`base_rpm` exists in data catalogs but under a DIFFERENT type shape.** `machine-profiles-catalog.ts:95` has `spindle: { ...power_kw, torque_nm, ...base_rpm: 2000 }` — but that's a catalog-local inline type using `power_kw`/`torque_nm` (NOT the `MachineSpindle` shape which uses `power`/`torque`). So that `base_rpm` is NOT on a `MachineSpindle` and won't flow into `extractConstraints`.

2. **No production code path writes `axes.max_cutting_feed_mmmin` on a `CanonicalMachinePackage`** — only the test fixtures and the engine's read site reference it. The `MachineLayerMerger` does a generic `mergeObject('axes', ...)` average, so IF an upstream source already carried `max_cutting_feed_mmmin` it would pass through, but no source produces it (handbooks use `axis_kinematics.axes[].max_feed_mm_min`).

This means for real machine packages, the engine stays on defaults (15000/1500) — exactly the pre-fix behavior. That's a follow-up wiring need, not a regression. Let me verify the regression-safety of the `??` change at the other 3 call sites and confirm the test fixture `as any` cast doesn't hide a real mismatch.

### Assistant | 2026-06-22T05:41:52.122Z

[tool_use: Read]

### User | 2026-06-22T05:41:53.137Z

[tool_result] 1	/**
2	 * MCAT-MS0 U-MCAT12: Machine-Aware Speed/Feed Engine Tests
3	 */
4	
5	import { describe, it, expect } from "vitest";
6	import {
7	  machineAwareSpeedFeedEngine,
8	  type SpeedFeedInput,
9	} from "../engines/MachineAwareSpeedFeedEngine.js";
10	import type { CanonicalMachinePackage } from "../types/MachinePackage.js";
11	
12	// Mock Haas VF-2 machine package
13	const mockHaasVF2: CanonicalM
... [+3260 chars truncated]

### Assistant | 2026-06-22T05:42:01.010Z

Now I understand the `as any` cast: the entire fixture is cast `as any` at line 65/112, so even the `linear_axes`/`rotary_axes` (required) and the new fields aren't actually type-checked against `MachineAxes`/`MachineSpindle`. Let me verify the test passes (to confirm the fixtures are read correctly) and check the other 3 `constrain` call sites for behavioral regression, plus check whether any OTHER existing test fixtures elsewhere use the old `max_feed_mmmin`/`base_rpm` field names that the merger averaging could now read differently.

### Assistant | 2026-06-22T05:42:02.874Z

[tool_use: Bash]

### Assistant | 2026-06-22T05:42:03.086Z

[tool_use: Read]

### User | 2026-06-22T05:42:08.852Z

[tool_result]  RUN  v4.1.5 H:/prism/mcp-server

 ✓ src/__tests__/MachineAwareSpeedFeedEngine.test.ts (19 tests) 9ms

 Test Files  1 passed (1)
      Tests  19 passed (19)
   Start at  00:42:08
   Duration  237ms (transform 57ms, setup 0ms, import 104ms, tests 9ms, environment 0ms)

### User | 2026-06-22T05:42:09.756Z

[tool_result] 214	    let powerLimited = false;
215	    let torqueLimited = false;
216	    let limitingFactor = "none";
217	
218	    // Original values
219	    const origRpm = input.spindleRpm;
220	    let origFeedRate = input.feedRate ?? 0;
221	    const origPower = input.requiredPower ?? 0;
222	    const origTorque = input.requiredTorque ?? 0;
223	
224	    // Calculate feed rate if not provided
225	    if (!o
... [+2163 chars truncated]

### Assistant | 2026-06-22T05:42:16.630Z

19/19 pass. The behavioral path confirms my analysis: `constraints.maxFeedRate` and `baseRpm` clamp at line 253/feed and torque-curve. The regression-safety argument holds: for any real `CanonicalMachinePackage` that lacks these new optional fields (which, per my grep, is ALL of them today — no production writer populates them), `??` falls back to the exact pre-fix hardcoded 15000/1500. **Byte-identical for current callers.**

Let me do the final blast-radius check: confirm the dispatcher wire-test still passes (the `constrain` path is wired into `prism_calc:machine_aware_constrain`) and verify there's no OTHER call site that builds a `CanonicalMachinePackage` with the old `max_feed_mmmin` name that the generic merger would now silently drop.

### Assistant | 2026-06-22T05:42:20.921Z

[tool_use: Bash]

### User | 2026-06-22T05:42:29.953Z

[tool_result] ===other fixtures/builders using OLD names that could now silently drop===
src/data/machine-profiles-catalog.ts:963:      max_feed_mmmin: maxFeed,
src/engines/AdaptiveToolpathRouterEngine.ts:222:    max_feed_mmmin: number;
src/engines/AdaptiveToolpathRouterEngine.ts:542:      max_feed_mmmin: Math.round(maxFeed),
src/engines/AlgorithmSelectorEngine.ts:49:  max_feed_mmmin: number;
src/engines/Constr
... [+1032 chars truncated]

### Assistant | 2026-06-22T05:42:37.154Z

Important nuance confirmed: there's a separate `max_feed_mmmin` field used across many OTHER engines (`AdaptiveToolpathRouterEngine`, `EndToEndPipelineEngine`, `CrossCamNovelAlgorithms`, etc.) — but these are on DIFFERENT local types (their own `machine.max_feed_mmmin` interfaces), NOT the shared `MachineAxes`. The commit chose a NEW name `max_cutting_feed_mmmin` on `MachineAxes` rather than reusing the fleet-wide `max_feed_mmmin` convention. This is a naming-convergence smell (a future wirer must know the canonical package uses `max_cutting_feed_mmmin` while ~6 other engines use `max_feed_mmmin`), but it's not a break — these are unrelated types.

The dispatcher wire test (15/15) and engine test (19/19) both pass. tsc is clean (0 errors with proper heap). Let me do one final check: confirm no other test fixture/builder constructs a `CanonicalMachinePackage.axes` with the old names that would now be silently ignored by the engine read (i.e., a test that was green before and is now reading a default).

### Assistant | 2026-06-22T05:42:39.799Z

[tool_use: Bash]

### User | 2026-06-22T05:42:43.264Z

[tool_result] ===CanonicalMachinePackage fixtures in OTHER tests that set axes/spindle (could read defaults now)===
USES-ENGINE: src/__tests__/machine-aware-constrain-wire.test.ts
USES-ENGINE: src/__tests__/MachineAwareSpeedFeedEngine.test.ts
---done---

### Assistant | 2026-06-22T05:43:08.988Z

Only the two test files exercise this engine, and both pass (19/19 + 15/15). The blast radius is fully contained. I have everything I need for the verdict.

VERDICT: PASS

summary: The two new fields on the shared MachineSpindle/MachineAxes types are strictly additive optional fields — full `npx tsc --noEmit` with the project's 16GB heap returns **0 errors** (a raw `tsc` OOM'd at default heap and returned a misleading exit-0/count-0; the real check is the heap-bumped run, which is clean). The `extractConstraints` change from hardcoded `15000/1500` to `field ?? 15000/1500` is provably byte-identical for every CURRENT caller, because NO production code path populates `axes.max_cutting_feed_mmmin` or `spindle.base_rpm` on a `CanonicalMachinePackage` today — so every real package falls through to the same conservative defaults. Behavior only changes for enriched packages that don't yet exist; that is a follow-up wiring need, not a regression in this diff.

findings: none

notes:
1. **Authoritative tsc is clean.** `cd mcp-server && node --max-old-space-size=16384 node_modules/typescript/bin/tsc --noEmit` → exit 0, **0 errors**, none mentioning MachineSpindle/MachineAxes/types.ts. The raw `npx tsc` first attempt OOM'd (default heap) and reported a false exit-0/count-0 — do not trust an OOM'd tsc run.
2. **Regression-safe for all current call sites.** The 4 `extractConstraints` call sites (`MachineAwareSpeedFeedEngine.ts:208,450,473,501`) all route through the same `??` fallback. Grep of all of `src/` shows ZERO production writers of `max_cutting_feed_mmmin` (only the engine read at `:154`, the type at `types.ts:445`, and the two test fixtures) and ZERO writers of `base_rpm` onto a `MachineSpindle` (the `base_rpm` in `machine-profiles-catalog.ts:95` lives on a catalog-local `power_kw/torque_nm` shape, not `MachineSpindle`). So real packages keep 15000/1500 — pre-fix behavior. Affected tests pass: 19/19 engine + 15/15 dispatcher-wire.
3. **Data-wiring gap (follow-up, NOT a 
... [+2704 chars truncated]
