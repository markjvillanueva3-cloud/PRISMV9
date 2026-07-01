---
type: "chat-session"
source: "claude-code-cli"
session_id: "b7624712-9339-4b1e-a90e-a42138fe6399"
title: "Review ONLY the newly-added (uncommitted) function `estimateExtractionPlan` and "
date: "2026-06-03"
first_ts: "2026-06-03T18:57:16.560Z"
last_ts: "2026-06-03T18:58:30.883Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/b7624712-9339-4b1e-a90e-a42138fe6399/subagents/agent-a777817029ee882bd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review ONLY the newly-added (uncommitted) function `estimateExtractionPlan` and 

> **claude-code-cli** | 2026-06-03 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b7624712-9339-4b1e-a90e-a42138fe6399/subagents/agent-a777817029ee882bd.jsonl`

## Transcript

### User | 2026-06-03T18:57:16.560Z

Review ONLY the newly-added (uncommitted) function `estimateExtractionPlan` and its helpers `round1`/`round2` in H:/prism/scripts/lib/catalog-gpu-profile.mjs (the rest of the file already passed a 3-of-3 review — focus on the new addition), plus its tests in H:/prism/scripts/lib/catalog-gpu-profile.test.mjs (the 5 tests under the "estimateExtractionPlan" section).

INTENT: quantify the catalog-extraction efficiency of the new RTX PRO 6000 Blackwell vs the old 16GB RTX 4080. It must surface TWO real levers — worker concurrency (profile.concurrency divides compute time) and removal of overnight-wait latency (a 16GB host idle-waits for a free fleet window; a Blackwell starts immediately) — WITHOUT fabricating a throughput constant (pagesPerMinPerWorker must be supplied/measured, R12 fail-loud).

Verify: (1) the math is correct (serialComputeMin, computeMin, concurrencySpeedup==workers, overnightWaitMin, wallClockMin); (2) it's fail-soft (returns {ok:false,reason} on bad input, never throws); (3) the refuse-to-fabricate guard is genuine (zero/negative/missing rate → ok:false); (4) tests assert real values that would fail if the math broke. Run: `cd H:/prism && node --test scripts/lib/catalog-gpu-profile.test.mjs`. Grade PASS/FAIL with explicit P0/P1. Be concise.

### Assistant | 2026-06-03T18:57:28.101Z

I'll review the new addition. Let me read the relevant files and run the tests.

### Assistant | 2026-06-03T18:57:29.306Z

[tool_use: Read]

### Assistant | 2026-06-03T18:57:29.954Z

[tool_use: Bash]

### User | 2026-06-03T18:57:35.201Z

[tool_result] 1	// scripts/lib/catalog-gpu-profile.mjs
2	//
3	// BLACKWELL-DB-GEN-MS0 / U-CGP-PROFILE (slot:romeo, 2026-06-03).
4	//
5	// Host-aware GPU profile for CATALOG / DATABASE extraction throughput.
6	//
7	// WHY: romeo's tool-catalog + machine + material DB generation routes scanned /
8	// image-only / complex-layout catalog PDFs to the Ollama vision extractor
9	// (catalog-extraction-router `ollama-vi
... [+11725 chars truncated]

### User | 2026-06-03T18:57:42.292Z

[tool_result]   ...
# Subtest: null / non-object → safe 'unknown' string, never throws
ok 21 - null / non-object → safe 'unknown' string, never throws
  ---
  duration_ms: 0.0831
  ...
# Subtest: Blackwell (×3, not gated): 300 pages @ 2 ppm/worker → 50min, speedup 3, no overnight wait
ok 22 - Blackwell (×3, not gated): 300 pages @ 2 ppm/worker → 50min, speedup 3, no overnight wait
  ---
  duration_ms: 0.237
  .
... [+878 chars truncated]

### Assistant | 2026-06-03T18:57:47.514Z

All 26 tests pass (5 new under "estimateExtractionPlan" = tests 22-26). Now let me read the test file to verify the 5 tests assert real values that would fail if the math broke.

### Assistant | 2026-06-03T18:57:48.158Z

[tool_use: Read]

### User | 2026-06-03T18:58:01.803Z

[tool_result] 1	// node --test scripts/lib/catalog-gpu-profile.test.mjs
2	// BLACKWELL-DB-GEN-MS0 / U-CGP-PROFILE (slot:romeo, 2026-06-03).
3	// Real-value coverage: tier boundaries, nvidia-smi parsing (incl. multi-GPU + garbage),
4	// the 4-step fail-soft precedence chain, field overrides, and adversarial inputs.
5	
6	import { test } from "node:test";
7	import assert from "node:assert/strict";
8	import {
9	  G
... [+9302 chars truncated]

### Assistant | 2026-06-03T18:58:30.883Z

I now have everything needed. Let me verify each claim against the four review axes.

**Math verification (lines 230-236):**
- `serialComputeMin = 300/2 = 150` ✓ (test asserts 150)
- `computeMin = 300/(2×3) = 50` ✓ (test asserts 50)
- `concurrencySpeedup = 150/50 = 3 == workers` ✓ (test asserts 3)
- 16GB: `computeMin = 300/(2×1) = 150`, `overnightWaitMin = 8×60 = 480`, `wallClockMin = 150+480 = 630` ✓
- Custom: `60/1 = 60` compute, `2×60 = 120` wait, `180` total ✓

The `concurrencySpeedup == workers` identity holds algebraically: `serialComputeMin/computeMin = (P/r)/(P/(r·w)) = w`. It's robust because both numerator and denominator are computed from raw (non-rounded) values, then `round2`'d — no rounding-then-dividing drift.

**Edge case I checked — rounding-before-division:** `concurrencySpeedup` divides the *raw* `serialComputeMin`/`computeMin` (lines 233-234), not the `round1`'d return fields. Correct. If it had divided the rounded fields it could drift slightly; it doesn't.

**Fail-soft (lines 226-229):** guards `totalPages` (positive finite), `pagesPerMinPerWorker` (positive finite), `profile` (object). All return `{ok:false, reason}`. No throw paths — `Number.isFinite`, `Math.max`, `Math.floor`, division by validated-positive denominators. `estimateExtractionPlan()` with no args → `a={}` default → destructures `undefined` → `totalPages` guard catches it (test 26 asserts this).

**Refuse-to-fabricate guard (line 227-228):** genuine. `pagesPerMinPerWorker` missing (`undefined` → not finite), `0` (not `>0`), `-5` (not `>0`) all → `ok:false`. There is no fallback default for the rate anywhere — the only way to get a number out is to supply a measured positive rate. This is the R12 core of the intent and it holds.

**Tests assert real values that fail if math broke:** Yes. Test 22 pins `serialComputeMin:150, computeMin:50, speedup:3, wallClock:50` — changing the divisor or dropping the `×workers` term breaks it. Test 23 independently pins the gated path (`150+480=6
... [+2748 chars truncated]
