---
type: "chat-session"
source: "claude-code-cli"
session_id: "e9b75754-b179-40b0-b0fb-7007d65b2056"
title: "A prior review of H:\\prism\\scripts\\lib\\dimension-set-score.mjs found a P0: type-"
date: "2026-06-01"
first_ts: "2026-06-01T20:22:51.839Z"
last_ts: "2026-06-01T20:27:22.002Z"
cwd: "H:\\prism-slot-xray"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/agent-a57919524468a759a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:15"
---

# A prior review of H:\prism\scripts\lib\dimension-set-score.mjs found a P0: type-

> **claude-code-cli** | 2026-06-01 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism-slot-xray
> Raw: `H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/agent-a57919524468a759a.jsonl`

## Transcript

### User | 2026-06-01T20:22:51.839Z

A prior review of H:\prism\scripts\lib\dimension-set-score.mjs found a P0: type-aware matching (default ON) scored matched=0 for real OCR extractions because the producer (parseVisionResponse in scripts/lib/ollama-vision-extract-lib.mjs) defaults every dimension's type to the LITERAL STRING "unknown" (not null), and the scorer's value-only fallback only triggered on null. That silently zeroed the live training signal.

The fix: dimType() now maps a set of sentinel strings (TYPE_SENTINELS = {"unknown","unspecified","none","n/a","na","null","undefined","?"}) to null → value-only fallback.

Read the FIXED files end to end:
1. H:\prism\scripts\lib\dimension-set-score.mjs (dimType + TYPE_SENTINELS + typesCompatible + scoreDimensionSet)
2. H:\prism\scripts\lib\dimension-set-score.test.mjs (25 tests, pass)
3. H:\prism\scripts\lib\ollama-vision-extract-lib.mjs — CONFIRM the ACTUAL sentinel the producer emits. Look at extractDimension (~line 183, `type: type || "unknown"` and `kind: type || "unknown"`) and extractGdt. Is "unknown" the only non-informative default it emits for a dimension's type? Are there OTHER defaults the scorer would mis-treat as a real type (e.g. does any path emit "" or a different placeholder)?

VERIFY:
- The fix actually covers the producer's real default ("unknown"). Is the sentinel set correct + sufficient — not missing a producer default, not over-broad (could a LEGITIMATE dimension type ever be one of these sentinels)? "none" is in the set — could "none" ever be a real dimension type? (dimension types are linear/diameter/radius/angular/chamfer/depth/thread/counterbore/countersink — confirm none collide with the sentinels.)
- The regression test ("real-producer shape (extracted type 'unknown') still matches typed truth by value") faithfully reproduces the production seam and asserts matched=2 (value-only fallback restored). Would it FAIL against the pre-fix code (i.e. is it a real regression oracle)?
- No new back-compat break: a real type like "li
... [+215 chars truncated]

### Assistant | 2026-06-01T20:23:23.604Z

I'll review the sentinel fix. Let me read the three files end to end.

### Assistant | 2026-06-01T20:23:23.985Z

[tool_use: Read]

### Assistant | 2026-06-01T20:23:24.398Z

[tool_use: Read]

### Assistant | 2026-06-01T20:23:24.589Z

[tool_use: Read]

### User | 2026-06-01T20:24:32.815Z

[tool_result] 1	// scripts/lib/ollama-vision-extract-lib.mjs
2	//
3	// U-TDP06 / U-PSGB-XRAY-RICH-SCHEMA — Ollama Vision Extractor (pure core).
4	//
5	// Builds the engineering-print extraction prompt and parses the model's JSON
6	// response into the RICH multi-zone BlueprintExtraction shape (title_block +
7	// dimensions + gdt + notes + profiles + part_bounds + thickness + surface
8	// finishes), mirroring th
... [+23135 chars truncated]

### User | 2026-06-01T20:24:32.840Z

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

### User | 2026-06-01T20:25:08.493Z

[tool_result] 1	// scripts/lib/dimension-set-score.mjs
2	//
3	// U-PSGB-XRAY-CLOSED-LOOP — the measurement core of the OCR closed loop.
4	// Given a set of OCR-extracted dimensions and a set of GROUND-TRUTH dimensions
5	// (from CAD geometry, a CNC program, or a synthetic label), score how well the
6	// OCR read the print: precision / recall / F1 / mean-abs-error, plus the explicit
7	// missed (truth dims the O
... [+9632 chars truncated]

### Assistant | 2026-06-01T20:25:16.219Z

Both files are read end to end. Now let me confirm there are no OTHER non-informative type defaults the producer can emit — I want to verify the full producer contract beyond `extractDimension`, including whether `extractGdt` or any other path feeds dimensions, and whether ground-truth producers could emit a sentinel-colliding type.

### Assistant | 2026-06-01T20:25:18.834Z

[tool_use: Grep]

### Assistant | 2026-06-01T20:25:18.255Z

[tool_use: Grep]

### User | 2026-06-01T20:26:06.865Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-01T20:26:32.478Z

[tool_result] 181:  const conv = rawNominal != null ? convertToMm(rawNominal, dimUnit, assumeUnits) : { mm: null, resolved: false, assumed: false, unit: dimUnit || "unknown" };
183:    type: type || "unknown",
184:    kind: type || "unknown",            // backward-compat alias for legacy consumers
220:    symbol: symbol || "unknown",

### Assistant | 2026-06-01T20:26:43.435Z

Let me find the consumer(s) of the scorer to confirm what shape gets passed in (extracted dims and ground-truth dims), and check how ground truth is produced — this is the load-bearing question for whether a real type could collide with a sentinel.

### Assistant | 2026-06-01T20:26:44.769Z

[tool_use: Grep]

### Assistant | 2026-06-01T20:26:46.630Z

[tool_use: Glob]

### User | 2026-06-01T20:27:22.002Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.
