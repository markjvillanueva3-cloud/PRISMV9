---
type: "chat-session"
source: "claude-code-cli"
session_id: "e9b75754-b179-40b0-b0fb-7007d65b2056"
title: "Independent judgment on a PRISM OCR-scorer upgrade. Read: 1. H:\\prism\\scripts\\li"
date: "2026-06-02"
first_ts: "2026-06-02T01:19:15.037Z"
last_ts: "2026-06-02T01:20:43.961Z"
cwd: "H:\\prism-slot-xray"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/agent-a93df045daf5a3887.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:15"
---

# Independent judgment on a PRISM OCR-scorer upgrade. Read: 1. H:\prism\scripts\li

> **claude-code-cli** | 2026-06-02 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism-slot-xray
> Raw: `H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/agent-a93df045daf5a3887.jsonl`

## Transcript

### User | 2026-06-02T01:19:15.037Z

Independent judgment on a PRISM OCR-scorer upgrade. Read:
1. H:\prism\scripts\lib\dimension-set-score.mjs (upgraded: greedy→Kuhn's optimal max-cardinality matching + type-aware default-ON with sentinel "unknown"→null value-only fallback)
2. H:\prism\scripts\lib\dimension-set-score.test.mjs (25 tests, pass)
3. H:\prism\scripts\ocr-closed-loop.mjs (consumer — only its CAVEAT string changed; confirm it still calls scoreDimensionSet/aggregateScores correctly and the caveat text is now accurate)

The scorer is the training signal of a generate→OCR→SCORE→feedback loop.

THE QUESTION I most want your judgment on (CONSUMER IMPACT, R8):
The runner calls scoreDimensionSet(ex.dimensions, g.truth.dimensions) with NO opts → now type-aware by default. With the sentinel fix, an extraction whose VLM omitted the type ("unknown") falls back to value-only (matches by value). But when the VLM DOES emit a type and gets it WRONG (says "diameter" for a linear), type-aware now counts it missed where value-only counted it matched. Is type-aware the right DEFAULT here?
- Pro: a wrong type IS a real extraction error; the signal is more honest.
- Con: it silently changes the documented "100% value-recovery on clean synthetic" metric; on clean synthetic the VLM gets types right so the headline likely holds, but on the real corpus the score drops (correctly).
Give a clear recommendation: keep type-aware default-ON, or flip the runner to typeAware:false to preserve the value-only headline? Is the caveat string honest about this?

ALSO CHECK (terse): test integrity (R9) — the old greedy-undercount test was flipped from matched===1 to matched===2; legitimate intent-change or weakened? Determinism. Any P0/P1.

Return PASS or FAIL + your default-recommendation + any P0/P1 (empty if none), concrete line references. Be terse.

### Assistant | 2026-06-02T01:19:28.199Z

I'll review the three files independently. Let me read them in parallel.

### Assistant | 2026-06-02T01:19:29.154Z

[tool_use: Read]

### Assistant | 2026-06-02T01:19:29.616Z

[tool_use: Read]

### Assistant | 2026-06-02T01:19:29.801Z

[tool_use: Read]

### User | 2026-06-02T01:19:52.764Z

[tool_result] 1	// scripts/lib/dimension-set-score.mjs
2	//
3	// U-PSGB-XRAY-CLOSED-LOOP — the measurement core of the OCR closed loop.
4	// Given a set of OCR-extracted dimensions and a set of GROUND-TRUTH dimensions
5	// (from CAD geometry, a CNC program, or a synthetic label), score how well the
6	// OCR read the print: precision / recall / F1 / mean-abs-error, plus the explicit
7	// missed (truth dims the O
... [+9632 chars truncated]

### User | 2026-06-02T01:19:53.134Z

[tool_result] 1	// scripts/lib/dimension-set-score.test.mjs
2	// Tests for the OCR closed-loop dimension-set scorer (U-PSGB-XRAY-CLOSED-LOOP).
3	// Run: node --test <file>
4	import { test } from "node:test";
5	import assert from "node:assert/strict";
6	import {
7	  dimToMm, dimMatches, dimType, typesCompatible, scoreDimensionSet, aggregateScores,
8	  DEFAULT_TOL_PCT, DEFAULT_TOL_ABS_MM, DEFAULT_TYPE_AWARE,
9	} 
... [+11477 chars truncated]

### User | 2026-06-02T01:19:53.145Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/ocr-closed-loop.mjs
3	//
4	// U-PSGB-XRAY-CLOSED-LOOP — the OCR print-reading closed loop, end to end:
5	//   GENERATE a clean synthetic dimensioned print with KNOWN ground-truth dims
6	//   → OCR it with qwen3-vl:8b-instruct (the concurrent GPU-resident model)
7	//   → SCORE the extracted dims vs ground truth (value-recovery precision/recall/F1/MAE)
8	//   → AGG
... [+8360 chars truncated]

### Assistant | 2026-06-02T01:19:59.006Z

All three files read. Let me verify the consumer-impact claims by checking how the sentinel default actually originates and whether the matching algorithm is genuinely deterministic.

Let me verify two load-bearing claims: (1) that `parseVisionResponse` really defaults type to `"unknown"`, and (2) the determinism of the augmenting-path iteration order.

### Assistant | 2026-06-02T01:20:00.310Z

[tool_use: Grep]

### User | 2026-06-02T01:20:12.059Z

[tool_result] 56:// Canonical dimension types the rich contract recognizes.
57:export const DIMENSION_TYPES = Object.freeze([
71:  const pc = typeof partClass === "string" && partClass ? partClass : "unknown";
87:    '    { "type": "linear|diameter|radius|angular|chamfer|depth|thread|counterbore|countersink",',
89:    '      "tolerance_type": "bilateral|unilateral_plus|unilateral_minus|limit|basic|reference|nul
... [+2330 chars truncated]

### Assistant | 2026-06-02T01:20:43.961Z

Line 183 confirms the load-bearing claim: `parseVisionResponse` sets `type: type || "unknown"` — the literal sentinel string, exactly as the scorer's comment (lines 56-60) and the REGRESSION test (lines 141-150) document. The sentinel fix is real and necessary, not theoretical.

I have everything I need. Here is my judgment.

---

## VERDICT: PASS

**Default recommendation: KEEP type-aware default-ON.** It is the correct default and the caveat is honest. Do NOT flip the runner to `typeAware:false`.

### Answer to the core question (CONSUMER IMPACT, R8)

The runner at `ocr-closed-loop.mjs:87` calls `scoreDimensionSet(ex.dimensions || [], g.truth.dimensions || [])` with no opts → type-aware. The three-way interaction is:

1. **VLM omits type** → `parseVisionResponse` emits `type:"unknown"` (`ollama-vision-extract-lib.mjs:183`) → `dimType` collapses it to `null` (sentinel set, `dimension-set-score.mjs:60,69`) → `typesCompatible(null, X)===true` → value-only fallback. No regression. This is the dominant real-corpus path and it is correctly handled. Verified end-to-end against the actual producer, not assumed.

2. **VLM emits a CORRECT type** → type-aware adds a true-positive guard (Ø45 no longer false-matches a 45° angular or 45mm linear). Strictly more honest.

3. **VLM emits a WRONG type** ("diameter" for a linear) → counted missed where value-only counted matched. **This is the right call.** A confidently-wrong type classification IS a real extraction defect — the model misread the print's dimensional intent, and a Ø-vs-linear confusion is a units/feature error that downstream CAM/quoting consumes as real geometry. Rewarding it (value-only) trains the model to ignore type entirely. The whole point of this scorer is to be the training gradient; a gradient that is blind to confident type errors trains a worse reader. Pro outweighs Con decisively.

On the documented headline: on **clean synthetic** the VLM gets types right (or omits → fallback), so the "100% value-recov
... [+3142 chars truncated]
