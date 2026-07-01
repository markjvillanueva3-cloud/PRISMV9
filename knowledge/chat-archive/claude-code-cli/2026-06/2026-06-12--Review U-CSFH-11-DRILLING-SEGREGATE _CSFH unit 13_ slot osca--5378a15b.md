---
type: "chat-session"
source: "claude-code-cli"
session_id: "5378a15b-ade4-4ecb-9cb2-45f2dfeea317"
title: "Review U-CSFH-11-DRILLING-SEGREGATE (CSFH unit 13, slot oscar SFC). The baseline"
date: "2026-06-12"
first_ts: "2026-06-12T15:36:12.428Z"
last_ts: "2026-06-12T15:38:03.185Z"
cwd: "H:\\prism-slot-oscar\\mcp-server"
messages: 29
user_msgs: 12
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism-slot-oscar/5378a15b-ade4-4ecb-9cb2-45f2dfeea317/subagents/agent-a5e61cc9b9de8f39e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:03"
---

# Review U-CSFH-11-DRILLING-SEGREGATE (CSFH unit 13, slot oscar SFC). The baseline

> **claude-code-cli** | 2026-06-12 | 29 msgs (12 user / 17 assistant) | cwd: H:\prism-slot-oscar\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-oscar/5378a15b-ade4-4ecb-9cb2-45f2dfeea317/subagents/agent-a5e61cc9b9de8f39e.jsonl`

## Transcript

### User | 2026-06-12T15:36:12.428Z

Review U-CSFH-11-DRILLING-SEGREGATE (CSFH unit 13, slot oscar SFC). The baseline-generic-params "moat" (`SpeedFeedBaselineGenericParamsEngine.deriveBaseline`) derives per-regime vc/fz envelopes that feed the SFC CALIBRATION loop. This unit hardens which operations are SEGREGATED (kept out of the calibration baseline).

Read END-TO-END (slot/oscar worktree):
- `H:/prism-slot-oscar/mcp-server/src/data/sfc-combinatorial-baseline-params.ts` — the new `NON_CALIBRATABLE_OPERATIONS` registry + `DEFAULT_SEGREGATE_OPERATIONS`, the changed `segregateOps` default + reason logic, and the updated header/option doc comments.
- `H:/prism-slot-oscar/mcp-server/src/__tests__/sfc/combinatorial-baseline-params.test.ts` — the updated segregation tests.

THE CHANGE: previously `segregateOperations` defaulted to `["drilling"]` with a hardcoded reason "drilling real_drilling_physics=0". Now it's a data-driven registry defaulting to `["tapping"]`. Rationale: `U-OSC9-DRILL-CHIPGEOM` (commit 81a3eb72c8, S(x)=0.92) FIXED drilling's chip geometry (it was ap=[0,0,0] degenerate), so drilling's vc/fz are now a real derivation → drilling is REMOVED from segregation (eligible). Tapping is now segregated because it is thread-FORMING: feed is pitch-locked (fn = thread pitch, an INPUT, not a derived feed → degenerate fz envelope) and its force is a first-order Kienzle proxy (torque-dominated).

ALREADY VERIFIED by me (tsx harness, 11 oracles, all PASS): tapping→segregated_operation with reason naming "tapping" + "pitch-locked"; drilling→baseline (n=6 envelope, NOT segregated); override `segregateOperations: []` un-segregates tapping; rollup emitted=1/segregated=1/insufficient=1. tsc clean on the engine.

CHECK:
1. Is the registry-based design correct (no logic regression vs the old hardcoded list)? Does `DEFAULT_SEGREGATE_OPERATIONS = Object.keys(NON_CALIBRATABLE_OPERATIONS)` correctly yield `["tapping"]` and stay in sync if more ops are added?
2. SAFETY/HONESTY: is un-segregating drilling SOUND? Cons
... [+869 chars truncated]

### Assistant | 2026-06-12T15:36:19.028Z

I'll review U-CSFH-11-DRILLING-SEGREGATE end-to-end. Let me read both files in the slot/oscar worktree, plus the dependency engine to verify the honesty invariant claims.

### Assistant | 2026-06-12T15:36:19.981Z

[tool_use: Read]

### Assistant | 2026-06-12T15:36:20.285Z

[tool_use: Read]

### User | 2026-06-12T15:36:22.808Z

[tool_result] 1	/**
2	 * SFC combinatorial BASELINE GENERIC PARAMS -- the moat. Folds the COMPARE report
3	 * (U-CSFH-07) into per-regime baseline parameters: a vc/fz envelope (from PRISM's
4	 * gate-pass driven cells) + a vendor BIAS and CONTAINMENT (from the feed-eligible
5	 * cited subset) + provenance, with thin / non-calibratable (e.g. tapping) / divergent regimes SEGREGATED or
6	 * flagged so a degenerate
... [+13661 chars truncated]

### User | 2026-06-12T15:36:23.189Z

[tool_result] 1	/**
2	 * Tests for the SFC combinatorial BASELINE GENERIC PARAMS step (U-CSFH-08, the moat).
3	 *
4	 * OSCAR-SFC-9AXIS-MS0 / slot:oscar, 2026-06-11.
5	 *
6	 * Fixtures flow through the REAL comparator (compareRecords) so this exercises the
7	 * 07 -> 08 pipeline, then derive the baseline. Pins each path: vendor_corroborated /
8	 * prism_only / low_confidence (divergent + poor containment), tappi
... [+11140 chars truncated]

### Assistant | 2026-06-12T15:36:29.208Z

I have both files. The READ-ONCE hook confirms the test file hasn't changed since I read it. Let me verify two load-bearing claims that the diff alone can't prove: (1) the `Operation` type actually includes `tapping` and `drilling` (so the registry key and `Object.keys` cast are sound), and (2) the upstream COMPARE/calibration consumers honor the honesty invariant (segregated regimes never feed calibration).

### Assistant | 2026-06-12T15:36:30.698Z

[tool_use: Grep]

### User | 2026-06-12T15:36:31.909Z

[tool_result] 59:  "milling", "turning", "drilling", "tapping", "reaming", "boring", "thread_milling",

### Assistant | 2026-06-12T15:36:32.281Z

[tool_use: Grep]

### User | 2026-06-12T15:36:33.592Z

[tool_result] src\data\sfc-combinatorial-gates.ts:136: * direction here -- a false fail only segregates a cell; a false honest_limited
src\data\sfc-combinatorial-gates.ts:157:    // (the safe direction: over-segregate, never poison the baseline).
src\data\sfc-combinatorial-compare.ts:17: * delta. This segregation is what keeps a fabricated/absent benchmark out of the
src\data\sfc-combinatorial-compare.ts:18: * 
... [+9101 chars truncated]

### Assistant | 2026-06-12T15:36:38.204Z

Two key facts confirmed:
1. `Operation` union (axes.ts:59) includes both `"drilling"` and `"tapping"` — the registry key `tapping` and the `Object.keys(...) as Operation[]` cast are sound.
2. The only consumer of `deriveBaseline` is `calcDispatcher.ts:9262` (the U-CSFH-10 wire). No calibration-apply engine consumes the baseline yet. Let me verify the dispatcher call site and confirm calibration-apply is not wired / is flag-gated, plus check the COMPARE engine's own drilling handling for stale references.

### Assistant | 2026-06-12T15:36:39.623Z

[tool_use: Read]

### User | 2026-06-12T15:36:40.840Z

[tool_result] 9230	                  drivenCount: drive.drivenCount, errorCount: drive.errorCount,
9231	                  gateTally: drive.gateTally, citedCount: drive.citedCount, total: drive.total,
9232	                },
9233	                compare,
9234	              },
9235	            };
9236	            break;
9237	          }
9238	          // OSCAR-SFC-9AXIS-MS0/U-CSFH-10-DISPATCHER-WIRE (slot:oscar, 
... [+3760 chars truncated]

### Assistant | 2026-06-12T15:36:41.521Z

[tool_use: Grep]

### Assistant | 2026-06-12T15:36:42.648Z

[tool_use: Grep]

### User | 2026-06-12T15:36:42.922Z

[tool_result] No matches found

### User | 2026-06-12T15:36:44.969Z

[tool_result] Found 13 files
src\data\sfc-combinatorial-baseline-params.ts
src\__tests__\UltimateSpeedFeedEngine.calib-apply.test.ts
src\engines\UltimateSpeedFeedEngine.ts
src\engines\speed-feed\MEMORY.md
src\__tests__\SpeedFeedVendorDeltaCalibrationBridge.test.ts
src\tools\dispatchers\camDispatcher.ts
src\engines\PostProcessorTrainerEngine.ts
src\engines\PostProcessorMasterPostArchitectureEngine.ts
src\engines
... [+181 chars truncated]

### Assistant | 2026-06-12T15:36:51.168Z

The grep flagged calibration-apply consumers exist (`UltimateSpeedFeedEngine.ts`, `UltimateSpeedFeedEngine.calib-apply.test.ts`, `SpeedFeedVendorDeltaCalibrationBridge.test.ts`) — and the task list shows U-OSC9-CALIB-APPLY-WIRE is already **completed**. This is the critical safety question (CHECK #2): does the live calibration-apply path consume this baseline, and is it flag-gated OFF? I must verify the calibration path does NOT read drilling's baseline into live recommendations. Let me trace it.

### Assistant | 2026-06-12T15:36:55.227Z

[tool_use: Grep]

### Assistant | 2026-06-12T15:36:55.598Z

[tool_use: Grep]

### User | 2026-06-12T15:36:55.605Z

[tool_result] <tool_use_error>Path does not exist: H:/prism-slot-oscar/mcp-server/src/engines/SpeedFeedVendorDeltaCalibrationBridge.ts. Note: your current working directory is H:\prism-slot-oscar\mcp-server.</tool_use_error>

### User | 2026-06-12T15:36:58.658Z

[tool_result] 18: *   - Multi-operation support: milling, turning, drilling, tapping, reaming, boring
63:// sandbox nobody read). The flag-gated apply below reads those factors; composeSegmentKey makes the
89:export type Operation = "milling" | "turning" | "drilling" | "tapping" | "reaming" | "boring" | "thread_milling";
143:   *  that drives the drilling chip geometry (b = D/sin p, h = (fn/2)·sin p). */
210: *
... [+2559 chars truncated]

### Assistant | 2026-06-12T15:37:04.561Z

Critical finding for CHECK #2: the calibration-apply path in `UltimateSpeedFeedEngine.ts` is gated by `sfcCalibApplyEnabled()` reading `PRISM_SFC_CALIB_APPLY` (line 213-214), DEFAULT OFF (line 210: "byte-identical to pristine unless explicitly 1/true"). Now the load-bearing question: does that apply path read **this baseline registry** (the segregated/drilling output), or does it read separately-persisted `calibrationFactors`? If the calibration factors are persisted from a different path that could include drilling, un-segregating drilling could matter even though the baseline engine isn't directly imported. Let me confirm what the calib-apply block actually reads, and check the bridge test file name.

### Assistant | 2026-06-12T15:37:05.512Z

[tool_use: Read]

### Assistant | 2026-06-12T15:37:07.245Z

[tool_use: Grep]

### User | 2026-06-12T15:37:07.443Z

[tool_result] 2780	    // ──────────────────────────────────────────────────
2781	    // Closes the SFC self-learning loop: applies the empirical speed/feed correction the
2782	    // SpeedFeedDeepLearningEngine learned from shop-floor predicted-vs-actual to the EMITTED operating
2783	    // point of THIS engine (the live prism_calc:speed_feed surface that previously ignored the loop).
2784	    //
2785	    // S
... [+6015 chars truncated]

### User | 2026-06-12T15:37:08.968Z

[tool_result] src\tools\dispatchers\calcDispatcher.ts:9145:            // calibration loop (recordFeedback adjusts calibrationFactors; computeSpeed/computeFeed
src\tools\dispatchers\calcDispatcher.ts:9250:            const { SpeedFeedBaselineGenericParamsEngine } = await import(
src\tools\dispatchers\calcDispatcher.ts:9262:            const baseline = SpeedFeedBaselineGenericParamsEngine.deriveBaseline(compare,
... [+4787 chars truncated]

### Assistant | 2026-06-12T15:38:03.185Z

This fully resolves the safety question. The data flow is decisively decoupled:

- **The calibration-apply path** (`UltimateSpeedFeedEngine.ts:2805-2843`) reads `activeCalibProvider(segKey)` → the `SpeedFeedDeepLearningEngine.calibrationFactors` (shop-floor predicted-vs-actual self-learning loop, segmented by `composeSegmentKey({material, regime})`). It does **NOT** import or read `SpeedFeedBaselineGenericParamsEngine` / the `deriveBaseline` registry output at all.
- **The baseline `deriveBaseline`** output is consumed by exactly **one** caller: `calcDispatcher.ts:9262` (`sfc_baseline_generic_params`), which returns it as an inert read-only report. It feeds nothing live.

So un-segregating drilling cannot reach live recommendations through any path — and even the calibration path that DOES touch recommendations is gated OFF by `PRISM_SFC_CALIB_APPLY` default-off (`sfcCalibApplyEnabled()`, line 213-214) AND skips user-pinned points. The segregation here is purely about which regimes the *future* operator-driven calibration validation will consider eligible.

I have everything needed for all 5 checks. No need to re-read files.

## Code Quality Analysis Report — U-CSFH-11-DRILLING-SEGREGATE

### Summary
- Overall Quality Score: 9.5/10
- Files Analyzed: 2 changed (+ 3 cross-referenced for the safety trace: `sfc-combinatorial-axes.ts`, `UltimateSpeedFeedEngine.ts`, `calcDispatcher.ts`)
- Issues Found: 0 P0, 0 P1, 2 P2 (non-blocking)
- The change is sound, honest, and well-tested.

### CHECK 1 — Registry design correctness ✓ PASS
- `NON_CALIBRATABLE_OPERATIONS` (baseline-params.ts:124-127) is `Partial<Record<Operation, string>>` with one key `tapping`. `DEFAULT_SEGREGATE_OPERATIONS = Object.keys(NON_CALIBRATABLE_OPERATIONS) as Operation[]` (line 130) correctly yields `["tapping"]`.
- **Stays in sync automatically**: adding a key to the registry adds it to the default set AND supplies its reason via the same `NON_CALIBRATABLE_OPERATIONS[g.op] ?? <fallback>` lookup at line 
... [+7982 chars truncated]
