---
type: "chat-session"
source: "claude-code-cli"
session_id: "5378a15b-ade4-4ecb-9cb2-45f2dfeea317"
title: "INDEPENDENT second-pass review for U-OSC9-CALIB-APPLY-WIRE — CSFH unit 12 KEYSTO"
date: "2026-06-12"
first_ts: "2026-06-12T15:06:10.888Z"
last_ts: "2026-06-12T15:07:58.002Z"
cwd: "H:\\prism-slot-oscar\\mcp-server"
messages: 33
user_msgs: 13
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism-slot-oscar/5378a15b-ade4-4ecb-9cb2-45f2dfeea317/subagents/agent-a7fbda07ced7642e8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:03"
---

# INDEPENDENT second-pass review for U-OSC9-CALIB-APPLY-WIRE — CSFH unit 12 KEYSTO

> **claude-code-cli** | 2026-06-12 | 33 msgs (13 user / 20 assistant) | cwd: H:\prism-slot-oscar\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-oscar/5378a15b-ade4-4ecb-9cb2-45f2dfeea317/subagents/agent-a7fbda07ced7642e8.jsonl`

## Transcript

### User | 2026-06-12T15:06:10.888Z

INDEPENDENT second-pass review for U-OSC9-CALIB-APPLY-WIRE — CSFH unit 12 KEYSTONE (slot oscar, Speed-Feed Calculator). Do NOT assume the physics reviewer caught everything; weight toward integration, test integrity, hidden coupling, and anti-regression rigor.

Unit: `UltimateSpeedFeedEngine.calculate()` (the live prism_calc:speed_feed surface) now optionally applies a learned shop-floor speed/feed correction (from SpeedFeedDeepLearningEngine) to its emitted operating point. Flag-gated PRISM_SFC_CALIB_APPLY, DEFAULT OFF.

Read END-TO-END (slot/oscar worktree):
- `H:/prism-slot-oscar/mcp-server/src/engines/UltimateSpeedFeedEngine.ts` — STEP 18F block, `setSfcCalibrationProvider`, `sfcCalibApplyEnabled`, the DL-singleton import, the `calibration?` result field + conditional spread.
- `H:/prism-slot-oscar/mcp-server/src/__tests__/UltimateSpeedFeedEngine.calib-apply.test.ts` — 9 tests.

ALREADY VERIFIED by me (a deterministic tsx harness, 24 assertions ALL PASS): flag-OFF deterministic + deep-equal; flag-ON+identity byte-identical to OFF; scaling correctness (Vc×0.9, fz×1.1, Vf/mrr recomputed); forces/power/thermal/tool_life deep-equal OFF (analytics untouched); clamp 3.0→2.5 / 0.2→0.4; rpm re-cap at maxRPM; user-pin skip; NaN/neg→identity. tsc clean on the engine.

Focus areas:
1. **ANTI-REGRESSION INTEGRITY:** is the byte-identical-when-OFF guarantee airtight? The block is `if (sfcCalibApplyEnabled() && !operatingPointUserPinned) { ... if (kSpeed!==1||kFeed!==1) { ...mutate... } }`. Confirm NO scalar is mutated and NO field/warning is added on the OFF path or the identity-factor path. The `calibration` field uses a conditional spread — confirm it's truly absent (not `{calibration: undefined}`) when not applied.
2. **NEW IMPORT COUPLING:** UltimateSpeedFeedEngine now statically imports `speedFeedDeepLearningEngine` (the persisting singleton) + `composeSegmentKey`. (a) Confirm NO circular import (does SpeedFeedDeepLearningEngine import UltimateSpeedFeedEngine? grep). (b
... [+1376 chars truncated]

### Assistant | 2026-06-12T15:06:15.963Z

I'll perform an independent second-pass review focused on integration, test integrity, hidden coupling, and anti-regression rigor. Let me read the target files end-to-end and verify the structural claims with grep/git.

### Assistant | 2026-06-12T15:06:16.913Z

[tool_use: Read]

### User | 2026-06-12T15:06:17.759Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\__tests__\UltimateSpeedFeedEngine.calib-apply.test.ts' was already read 22m ago in this session and is unchanged (mtime 1781274524623). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state f
... [+37 chars truncated]

### Assistant | 2026-06-12T15:06:18.659Z

[tool_use: Grep]

### User | 2026-06-12T15:06:20.731Z

[tool_result] 63:// sandbox nobody read). The flag-gated apply below reads those factors; composeSegmentKey makes the
65:import { speedFeedDeepLearningEngine, composeSegmentKey } from "./SpeedFeedDeepLearningEngine.js";
186:/** Hard clamp on a learned calibration multiplier -- a runaway factor can never drive an unsafe Vc/feed. */
194:  const f = speedFeedDeepLearningEngine.getCalibrationFactors(segmentKey);
19
... [+1954 chars truncated]

### Assistant | 2026-06-12T15:06:23.614Z

The test file was already read this session. Let me retrieve it from context — but I need to re-examine it carefully. Let me read the key engine sections in full and verify the structural claims (circular import, write-key, conditional spread).

### Assistant | 2026-06-12T15:06:24.552Z

[tool_use: Read]

### Assistant | 2026-06-12T15:06:25.084Z

[tool_use: Read]

### User | 2026-06-12T15:06:26.049Z

[tool_result] 180	
181	/** Confidence-scored atomic value with formula provenance */
182	// ============================================================================
183	// SHOP-FLOOR CALIBRATION APPLY (U-OSC9-CALIB-APPLY-WIRE -- CSFH unit 12, KEYSTONE)
184	// ============================================================================
185	
186	/** Hard clamp on a learned calibration multiplier -- a runaway 
... [+2329 chars truncated]

### User | 2026-06-12T15:06:26.965Z

[tool_result] 2779	    // STEP 18F: Shop-floor calibration apply (U-OSC9-CALIB-APPLY-WIRE -- CSFH unit 12, KEYSTONE)
2780	    // ──────────────────────────────────────────────────
2781	    // Closes the SFC self-learning loop: applies the empirical speed/feed correction the
2782	    // SpeedFeedDeepLearningEngine learned from shop-floor predicted-vs-actual to the EMITTED operating
2783	    // point of THIS engi
... [+6045 chars truncated]

### Assistant | 2026-06-12T15:06:29.717Z

Now let me verify the two structural claims that require git/grep: the circular import (does SpeedFeedDeepLearningEngine import UltimateSpeedFeedEngine?) and the write-key coherence (what segment key does recordFeedback WRITE?).

### Assistant | 2026-06-12T15:06:31.619Z

[tool_use: Grep]

### Assistant | 2026-06-12T15:06:32.866Z

[tool_use: Grep]

### User | 2026-06-12T15:06:34.193Z

[tool_result] 51:import { log } from "../utils/Logger.js";
63:import { captureSFC } from "../middleware/sfcOutcomeWire.js";
70:import * as fs from "node:fs";
71:import * as path from "node:path";
72:import { fileURLToPath } from "node:url";
73:import { safeWriteSync } from "../utils/atomicWrite.js";

### User | 2026-06-12T15:06:34.691Z

[tool_result] 62:// method + the captureSFC emit in recordFeedback close that loop.
69:// (a corrupt/unwritable state file can never break recordFeedback's contract).
85:// U-OSC9-SEGMENTED-CALIBRATION: per-(material x tool x regime) L1 calibration segment keys
213:  /** U-OSC9: canonical segment key (iso|tool|regime); absent => global bucket. */
428:/** Canonicalize a regime; only explicit CutType members are 
... [+2811 chars truncated]

### Assistant | 2026-06-12T15:06:40.363Z

Critical findings emerging. The import grep confirms **no circular import** — SpeedFeedDeepLearningEngine.ts does NOT import UltimateSpeedFeedEngine (only Logger, sfcOutcomeWire, fs/path, atomicWrite). 

Now the **write-key vs read-key** check is the most important finding. Let me confirm exactly:
- **WRITE** (line 1432, `recordFeedback`): `segment_key: composeSegmentKey({ material: context.material, regime: context.regime })` — tool-agnostic, `{material, regime}` only.
- **READ** (line 2806, STEP 18F): `composeSegmentKey({ material: input.material, regime: cutType })` — also `{material, regime}` only.

These match — both omit `toolMaterial`, so both produce `${iso}|_|${regime}`. The loop is coherent. Let me verify the `getCalibrationFactors` return shape, since STEP 18F reads `.speed`/`.feed` off it, and confirm the test's afterEach restoration.

### Assistant | 2026-06-12T15:06:41.751Z

[tool_use: Read]

### Assistant | 2026-06-12T15:06:42.524Z

[tool_use: Read]

### User | 2026-06-12T15:06:47.073Z

[tool_result] 695	  getCalibrationFactors(segmentKey?: string): Record<string, number> {
696	    // No segment / the global key / an unknown or starved (<5 samples) segment => current global.
697	    if (!segmentKey || segmentKey === SEGMENT_GLOBAL_KEY) return { ...this.globalFactors };
698	    const seg = this.segmentFactors.get(segmentKey);
699	    const count = this.segmentSampleCount.get(segmentKey) ?? 0;
7
... [+1082 chars truncated]

### User | 2026-06-12T15:06:47.710Z

[tool_result] 1480	  /** Read L1 calibration factors for a canonical segment key (iso|tool|regime), or the global bucket when omitted. */
1481	  getCalibrationFactors(segmentKey?: string): Record<string, number> {
1482	    return this.selfLearning.getCalibrationFactors(segmentKey);
1483	  }
1484	
1485	  // ============================================================================
1486	  // STATISTICS
1487	  /
... [+102 chars truncated]

### Assistant | 2026-06-12T15:06:55.780Z

Now I have a critical discovery on the **READ/WRITE shape mismatch**. STEP 18F (line 2807-2809) reads `rawFactors.speed` and `rawFactors.feed` off the provider, and the `defaultCalibProvider` (line 193-196) maps `getCalibrationFactors(segmentKey)` to `{ speed: f.speed, feed: f.feed }`. But `getCalibrationFactors` returns `Record<string, number>` whose keys are `Object.keys(this.globalFactors)`. I need to verify that `globalFactors` actually has keys named exactly `speed` and `feed` — otherwise `f.speed`/`f.feed` are `undefined` and the default provider silently yields `undefined` (which STEP 18F then coerces to `1.0` via the `Number.isFinite` guard — fail-soft, but it would mean the production path can NEVER apply a non-identity factor). Let me verify the globalFactors initial keys and what recordFeedback writes into them.

### Assistant | 2026-06-12T15:06:56.515Z

[tool_use: Read]

### User | 2026-06-12T15:06:58.519Z

[tool_result] 540	  /** Map<segmentKey, count> serialized to a plain object. */
541	  segmentSampleCount: Record<string, number>;
542	  feedbackHistory: FeedbackEntry[];
543	}
544	
545	// ============================================================================
546	// SELF-LEARNING SYSTEM
547	// ============================================================================
548	
549	class SelfLearningSystem {
5
... [+4344 chars truncated]

### Assistant | 2026-06-12T15:07:03.248Z

Confirmed: `globalFactors` has keys `speed`, `feed`, `tool_life`, `surface_finish` (lines 553-558). So `getCalibrationFactors` returns an object with `.speed` and `.feed` as real numeric keys. The `defaultCalibProvider`'s `{ speed: f.speed, feed: f.feed }` mapping reads valid keys — **the production read-key shape is coherent.** Both the WRITE path (recordFeedback updates these same `speed`/`feed` keys) and READ path agree.

Now let me verify the test file's afterEach restoration and assertion integrity. The test file was read 22m ago — let me retrieve its full content to inspect the provider restoration and whether assertions are load-bearing.

### Assistant | 2026-06-12T15:07:04.546Z

[tool_use: Read]

### User | 2026-06-12T15:07:06.434Z

[tool_result] 1	/**
2	 * OSCAR-SFC-9AXIS-MS0 / U-OSC9-CALIB-APPLY-WIRE (slot:oscar, 2026-06-12) -- CSFH unit 12, KEYSTONE.
3	 *
4	 * Closes the SFC self-learning loop: the shop-floor speed/feed correction the SpeedFeedDeepLearningEngine
5	 * learns from predicted-vs-actual is now APPLIED to the emitted operating point of UltimateSpeedFeedEngine
6	 * (the live prism_calc:speed_feed surface that previously ignore
... [+8528 chars truncated]

### Assistant | 2026-06-12T15:07:11.538Z

I now have everything needed for a complete independent review. Let me verify two final integration concerns: (1) the `calibration?` field type declaration matches the provenance object shape exactly, and (2) the test's `eng` is a shared instance across all tests — confirm no DL-singleton state leaks between tests via the shared engine instance (since the default provider reads the singleton, but tests always inject a provider or run flag-OFF).

### Assistant | 2026-06-12T15:07:12.900Z

[tool_use: Read]

### Assistant | 2026-06-12T15:07:13.268Z

[tool_use: Read]

### User | 2026-06-12T15:07:15.113Z

[tool_result] 55	import { RCSA } from "../algorithms/RCSA.js";
56	import { ToolWearPrediction } from "../algorithms/ToolWearPrediction.js";
57	import { SandvikTurningForceModel } from "../algorithms/SandvikTurningForceModel.js";
58	import { MerchantShearForceModel } from "../algorithms/MerchantShearForceModel.js";
59	import { ChipTypePredictionModel } from "../algorithms/ChipTypePredictionModel.js";
60	// U-OSC
... [+859 chars truncated]

### User | 2026-06-12T15:07:15.128Z

[tool_result] 438	  // Meta
439	  inferred_parameters: string[];   // which params were inferred (not user-supplied)
440	  warnings: string[];
441	  /**
442	   * U-OSC9-CALIB-APPLY-WIRE: present ONLY when shop-floor calibration was actually applied (flag
443	   * `PRISM_SFC_CALIB_APPLY` on + a fully PRISM-derived operating point + non-identity learned factors).
444	   * Absent => the cutting-parameter outputs a
... [+464 chars truncated]

### Assistant | 2026-06-12T15:07:58.002Z

I have all the evidence needed for a complete independent review. All structural claims verified against source. Here is my second-pass verdict.

---

## INDEPENDENT SECOND-PASS REVIEW — U-OSC9-CALIB-APPLY-WIRE (CSFH unit 12, KEYSTONE)

**Verdict: PASS**

I verified all five focus areas against source (not the prior reviewer's claims). No P0 or P1 findings. Two P2 observations logged below for the handoff.

### 1. ANTI-REGRESSION INTEGRITY — AIRTIGHT (verified)
The byte-identical-when-OFF guarantee holds on every path:
- **OFF path:** `if (sfcCalibApplyEnabled() && !operatingPointUserPinned)` (`UltimateSpeedFeedEngine.ts:2805`) gates the entire block. When the flag is off, `calibrationProvenance` stays `undefined` (declared `:2800`), and no scalar (`Vc/rpm/fz/fz_programmed/fn/Vf/mrr_cm3`) is touched. No warning pushed.
- **Identity-factor path:** even with the flag ON, the inner `if (kSpeed !== 1.0 || kFeed !== 1.0)` (`:2812`) is the second gate — with `{1.0, 1.0}` it is false, so no mutation, no warning, no provenance. The clamp at `:2810-2811` keeps `1.0` as `1.0`, so identity survives the clamp.
- **Conditional spread is truly absent, not `undefined`:** `...(calibrationProvenance ? { calibration: calibrationProvenance } : {})` (`:3066`) spreads an **empty object** when provenance is undefined — the `calibration` KEY never appears on the result. This is the correct idiom (NOT `{ calibration: undefined }`, which would leak a key and break the MCP serializer's absent-vs-null contract noted in the prior commit's JSDoc). Confirmed correct.

The test asserts this concretely: T1 (`calibTag(a) === "ABSENT"`, `calibWarnCount === 0`) and T2 (`onIdentity` deep-equal to `off` + `"ABSENT"`). These are load-bearing — they read the actual sentinel and an exact count, not presence-matchers.

### 2. NEW IMPORT COUPLING — NO CIRCULAR IMPORT, NO STARTUP RISK (verified)
- **(a) No cycle:** grepped `SpeedFeedDeepLearningEngine.ts` imports (`:51-73`) — it imports only `Logger`, `sfcOu
... [+5412 chars truncated]
