---
type: "chat-session"
source: "claude-code-cli"
session_id: "f7b0f940-61e9-4d5b-812e-205ca34b8a84"
title: "Static correctness + safety review of a 2-file change-unit in PRISM (slot:oscar,"
date: "2026-06-01"
first_ts: "2026-06-01T20:07:00.636Z"
last_ts: "2026-06-01T20:15:57.669Z"
cwd: "H:\\prism-slot-oscar"
messages: 13
user_msgs: 5
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism-slot-oscar/f7b0f940-61e9-4d5b-812e-205ca34b8a84/subagents/agent-a244a5147bc03138e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:04"
---

# Static correctness + safety review of a 2-file change-unit in PRISM (slot:oscar,

> **claude-code-cli** | 2026-06-01 | 13 msgs (5 user / 8 assistant) | cwd: H:\prism-slot-oscar
> Raw: `H:/.claude/projects/H--prism-slot-oscar/f7b0f940-61e9-4d5b-812e-205ca34b8a84/subagents/agent-a244a5147bc03138e.jsonl`

## Transcript

### User | 2026-06-01T20:07:00.636Z

Static correctness + safety review of a 2-file change-unit in PRISM (slot:oscar, U-OSC9-SEGMENTED-CALIBRATION). Read each file END-TO-END; grade PASS/FAIL with numbered P0/P1 (file:line + fix). Do NOT run tests.

WHAT IT DOES: replaces the single GLOBAL L1 calibration (calibrationFactors) on SpeedFeedDeepLearningEngine with per-(material-group x tool-type x regime) segment-keyed factors + a global fallback. Backward-compatible: recordFeedback gains an OPTIONAL trailing `context?` arg; with no context it behaves identically to before (trains the global bucket).

FILES (absolute):
1. H:/prism-slot-oscar/mcp-server/src/engines/SpeedFeedDeepLearningEngine.ts — review the segmented-calibration edits:
   - new module consts near CutType (CUT_TYPES, SEG_TOOL_TYPES, SEGMENT_GLOBAL_KEY="_|_|_", SEG_FACTOR_MIN=0.5, SEG_FACTOR_MAX=2.0)
   - FeedbackEntry.segment_key?
   - free fns canonToolType / canonRegime / composeSegmentKey (after resolveISOGroup ~line 391)
   - SelfLearningSystem (~line 500): globalFactors (was calibrationFactors) + segmentFactors Map + segmentSampleCount Map; recordFeedback routing; applyWindow(factors, history) helper; getCalibrationFactors(segmentKey?); getStats (+segments summary)
   - the 4 APPLY sites: predictSpeed (~577) seg={material,carbide,cutType}; predictFeed (~663) seg={material,carbide,cutType}; predictToolLife (~737) seg={material,toolMaterial} (no regime); predictSurfaceFinish (~803) seg={regime:cutType} only — each wraps the multiply in `Number.isFinite(x) && x>0 ? x : 1.0`
   - public recordFeedback (~1172): optional context arg, segment_key: composeSegmentKey(context), captureSFC real context
   - `export class SpeedFeedDeepLearningEngine`; new engine getCalibrationFactors(segmentKey?) accessor
   - comprehensiveAnalysis (~line 1106) DELIBERATELY still calls getCalibrationFactors() no-arg (global) — confirm that is correct/backward-compat, NOT a bug.
2. H:/prism-slot-oscar/mcp-server/src/__tests__/SpeedFeedDeepLearningEngine.segmented-c
... [+2373 chars truncated]

### Assistant | 2026-06-01T20:07:15.124Z

I'll review both files end-to-end. Let me read them completely.

### Assistant | 2026-06-01T20:07:16.106Z

[tool_use: Read]

### Assistant | 2026-06-01T20:07:16.387Z

[tool_use: Read]

### User | 2026-06-01T20:09:41.269Z

[tool_result] 1	/**
2	 * SpeedFeedDeepLearningEngine — SF-AI-L1
3	 *
4	 * First-layer AI hardening for Calculator Studio (Speed/Feed).
5	 * Neural networks, Monte Carlo, Bayesian optimization, chain-of-thought,
6	 * and self-learning feedback for cutting parameter optimization.
7	 *
8	 * AI Capabilities:
9	 * ----------------
10	 * 1. NEURAL NETWORK MODELS
11	 *    - Speed prediction from material/tool/operatio
... [+52770 chars truncated]

### User | 2026-06-01T20:10:14.183Z

[tool_result] 1	/**
2	 * OSCAR-SFC-9AXIS-MS0 / U-OSC9-SEGMENTED-CALIBRATION (slot:oscar, 2026-06-01)
3	 *
4	 * Per-(material-group x tool-type x regime) L1 calibration on SpeedFeedDeepLearningEngine.
5	 * Replaces the single GLOBAL calibrationFactors with segment-keyed factors + a global fallback,
6	 * backward-compatible (optional 4th `context` arg on recordFeedback), NaN-safe + clamped.
7	 *
8	 * TEST STRATEG
... [+8033 chars truncated]

### Assistant | 2026-06-01T20:10:28.707Z

I've read both files end-to-end. Now let me verify the load-bearing correctness claims by tracing the math precisely.

Let me trace the critical paths:

**Backward-compat trace (T2):** 5x speedActual(10) → each entry has `error_pct.speed = ((100 - 90)/100)*100 = 10`. Context-less → `segment_key = composeSegmentKey(undefined) = SEGMENT_GLOBAL_KEY`. In `recordFeedback`, `segKey === SEGMENT_GLOBAL_KEY` so only `applyWindow(globalFactors, fullHistory)` runs. At history.length 1-4: returns early. At 5: `recent = last 20 = all 5`, errors for "speed" = [10,10,10,10,10], avgError=10, `next = 1.0*(1-10/200) = 1.0*0.95 = 0.95`. Other keys ("feed","tool_life","surface_finish") have no error_pct entries → errors.length===0 → skipped → stay 1.0. ✓ Matches old behavior exactly.

**T4 isolation trace:** Train A (N|carbide|finishing) 5x speedActual(20): error=20. At 5th A feedback, global applyWindow over fullHistory (all 5 are A) → global.speed=0.9; seg A seeded `{...globalFactors}` — but wait, seeding timing matters. Let me trace carefully.

### Assistant | 2026-06-01T20:10:43.109Z

[tool_use: Bash]

### User | 2026-06-01T20:13:29.663Z

[tool_result] fA1= 0.9 (oracle 0.9)
fA2= 0.9 (must === fA1) equal: true
fB= 0.9240000000000002 (oracle: under-pred corrected UP; > fA2: true )
global after B: 0.7751900000000002

T2 global.speed= 0.95 (oracle 0.95) feed= 1 segCount= 0

T5 global.speed= 0.5 (oracle 0.5) finite: true

T3 seg.speed= 1 global.speed= 1 equal: true

T6 total= 5 segCount= 2 keys= [ 'N|hss|finishing', 'P|carbide|roughing' ]

### Assistant | 2026-06-01T20:13:37.736Z

All oracles verified numerically. Now let me check one subtle point — the T4 isolation claim depends on segment A's history being filtered correctly even after B's feedbacks are pushed into the shared `feedbackHistory`. The trace confirms it: `fA2 === fA1` holds because `getCalibrationFactors(A)` reads the stored seg A factors (which were last touched at A's 5th feedback), and B's feedbacks never invoke `applyWindow` on seg A.

Let me verify one more edge: the T4 `fB` oracle. The test asserts `fB > fA2` (presence-of-direction), not an exact value. fB=0.924 > 0.9 ✓. But note a subtlety I must verify — does seg B get seeded from a *contaminated* global?

### Assistant | 2026-06-01T20:13:47.443Z

[tool_use: Bash]

### User | 2026-06-01T20:15:18.113Z

[tool_result] After A: global.speed= 0.9 segA seeded value (1st-touch global was 1.0, then trained)= 0.9
B[0]: global.speed= 0.8400000000000001 -> segB seeded from THIS global = 0.8400000000000001 segB count= 1
Final segB.speed= 0.9240000000000002 global= 0.7751900000000002

### Assistant | 2026-06-01T20:15:57.669Z

Verified. The isolation invariant holds: during B's training, `applyWindow` is only ever called on `this.globalFactors` and `seg B` — never on `seg A`'s object. So `seg A`'s stored factors are frozen after A's last feedback. `getCalibrationFactors(A)` returns those frozen values (count≥5), independent of subsequent global drift. T4's `fA2 === fA1` is sound and would indeed FAIL on the pre-change single-global engine.

One observation worth noting: `seg B` is seeded from the **already-contaminated** global (0.84 after B[0]'s global update over the mixed 6-entry history), but since seg B then immediately `applyWindow`s over its own 5-entry history and reaches a mature state, the seed only affects the warm-up trajectory, not the isolation property the test asserts. fB=0.924 is the actual converged value; the test only checks `fB > fA2` (direction), which is robust.

Now let me verify the apply-site segment composition and the NaN-guard completeness across all 4 prediction sites, plus confirm the `comprehensiveAnalysis` no-arg call.

I have everything I need. Here is my review.

---

## VERDICT: PASS

Both files are correct, safe, and backward-compatible. All six derivation oracles match the implementation's damping math exactly (verified numerically: T2→0.95, T3→1.0/byte-equal, T4→fA1=0.9 & fA2===fA1 & fB=0.924>fA2, T5→0.5 clamped, T6→count=2 keys sorted). The isolation invariant (T4) is genuinely load-bearing and would fail on the pre-change single-global engine. No P0 or P1 issues found.

### Load-bearing correctness — all confirmed
- **Backward-compat (byte-preserved):** `composeSegmentKey(undefined)===SEGMENT_GLOBAL_KEY`; context-less `recordFeedback` routes ONLY to `applyWindow(globalFactors, fullHistory)` (line 519) and the `segKey !== SEGMENT_GLOBAL_KEY` guard (line 522) is false, so **no segment is created and no double-application occurs**. The math (`warmup>=5`, `slice(-20)`, `*(1-avgError/200)`) at lines 537–551 is identical to the pre-change global path. ✓

... [+3491 chars truncated]
