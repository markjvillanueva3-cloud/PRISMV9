---
type: "chat-session"
source: "claude-code-cli"
session_id: "be5e37e8-9aa8-4749-b02f-a97fde0830dd"
title: "Per-file scrutiny — arm A (content-specialist: test integrity). FILE TO REVIEW ("
date: "2026-05-19"
first_ts: "2026-05-19T04:36:08.288Z"
last_ts: "2026-05-19T04:37:30.125Z"
cwd: "H:\\PRISM"
messages: 28
user_msgs: 10
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism/be5e37e8-9aa8-4749-b02f-a97fde0830dd/subagents/agent-a898215ae2a382b85.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# Per-file scrutiny — arm A (content-specialist: test integrity). FILE TO REVIEW (

> **claude-code-cli** | 2026-05-19 | 28 msgs (10 user / 18 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/be5e37e8-9aa8-4749-b02f-a97fde0830dd/subagents/agent-a898215ae2a382b85.jsonl`

## Transcript

### User | 2026-05-19T04:36:08.288Z

Per-file scrutiny — arm A (content-specialist: test integrity).

FILE TO REVIEW (end-to-end): `H:/prism-slot-mike/scripts/lib/pdf-text-extract-lib.test.mjs`

CONTEXT: I added 20 new tests at the END of this file under unit `U-TDP08`. They exercise two new patterns in the sibling lib `pdf-text-extract-lib.mjs`:
1. **Paired-tolerance-band**: two consecutive pure-decimal lines emit one linear dim with format `paired-band`. Guards: ≥3 decimal places matched, delta ≤5% nominal, nominal ∈ [0.001, 100] mm.
2. **Rc hardness range**: regex post-loop scan filling `hardness_grade` field as `"min-max HRC"`. Clamps [20, 70].

The new tests start at the line where `// ── U-TDP08 — paired-tolerance-band detection ──` appears.

REVIEW WEIGHTING (test correctness, R9 "tests verify intent"):
- Does every test assert CONCRETE values (not just `toBeDefined()` stubs)? Specifically check each REJECT test — does it just check `length === 0`, or does it confirm the failing path doesn't OTHERWISE emit (e.g., as a non-paired-band dim)?
- Are the false-positive guard tests REAL adversarial cases — not contrived inputs that trivially never trigger? Look at: `'12'/'10'` (integer pair), `'1.5'/'1.0'` (1-decimal), `'B .040'/'.035'` (decorated), `'1.000'/'0.940'` (wide), `'0.999'/'1.000'` (reversed), `'150.000'/'149.998'` (out of range). Are these the same kinds of false-positives the JM Die corpus would actually contain?
- The "in-loop Grade [HRC]: NOT clobbered" test — does it correctly prove first-match-wins, or could a different code path (the in-loop `GRADE_RE`) be silently catching it? Specifically the assertion `assert.equal(r.extraction.hardness_grade, "60-62", "in-loop Grade [HRC]: wins")` — the in-loop path stores the raw `60-62` (no `" HRC"` suffix) while the post-loop path adds `" HRC"`. Is the assertion expecting the right form?
- The "split-token bilateral path STILL works" anti-regression test — does it lock the right invariant? It tests `"5.00\n- .10\n.10\n+\nmm\n"` survives. Is th
... [+1177 chars truncated]

### Assistant | 2026-05-19T04:36:16.138Z

I'll conduct a comprehensive review of the new U-TDP08 test cases, examining test integrity and R9 compliance (tests verify intent, not just structure).

### Assistant | 2026-05-19T04:36:16.499Z

[tool_use: Read]

### Assistant | 2026-05-19T04:36:16.736Z

[tool_use: Read]

### User | 2026-05-19T04:36:19.757Z

[tool_result] 1	// scripts/lib/pdf-text-extract-lib.test.mjs
2	// Tests for U-TDP07 PDF embedded-text extractor pure core.
3	
4	import { test } from "node:test";
5	import assert from "node:assert/strict";
6	
7	import {
8	  extractDimensionsFromText,
9	  _internals,
10	} from "./pdf-text-extract-lib.mjs";
11	
12	const { parseSignedTolLine, tryParseToleranceTriple, classifyKind, toLines } = _internals;
13	
14	// 
... [+4148 chars truncated]

### User | 2026-05-19T04:36:20.076Z

[tool_result] 1	// scripts/lib/pdf-text-extract-lib.mjs
2	//
3	// U-TDP07 — Deterministic engineering-print text extractor (pure core).
4	//
5	// CAD-exported PDFs (SolidWorks, Fusion, Inventor) emit dimension callouts as
6	// embedded text strings in a canonical multi-token form. Example from a real
7	// JM Die carbide-tip print:
8	//
9	//   '5.00'      ← nominal
10	//   'n'         ← Ø glyph (PyMuPDF maps Ø c
... [+8048 chars truncated]

### Assistant | 2026-05-19T04:36:21.741Z

I need to find the U-TDP08 test section to review the new 20 tests. Let me locate it.

### Assistant | 2026-05-19T04:36:22.264Z

[tool_use: Grep]

### User | 2026-05-19T04:36:24.182Z

[tool_result] 598:// ── U-TDP08 — paired-tolerance-band detection ─────────────────────────────

### Assistant | 2026-05-19T04:36:25.409Z

Now let me read from line 598 to the end of the file to see all 20 new tests.

### Assistant | 2026-05-19T04:36:25.663Z

[tool_use: Read]

### User | 2026-05-19T04:36:35.868Z

[tool_result] 598	// ── U-TDP08 — paired-tolerance-band detection ─────────────────────────────
599	// Adds the vertical 2-line tolerance-band pattern that was deferred at
600	// L491-494 of the original. Guards: matched decimal-place count ≥3, band
601	// width ≤5% of nominal, nominal in [0.001, 100] mm.
602	
603	test("U-TDP08 paired-band: '1.002'/'1.000' → linear 1.001 ± 0.001", () => {
604	  const r = extrac
... [+8060 chars truncated]

### Assistant | 2026-05-19T04:36:37.467Z

Now let me review the implementation to understand the paired-band and hardness detection logic:

### Assistant | 2026-05-19T04:36:38.418Z

[tool_use: Grep]

### User | 2026-05-19T04:36:42.817Z

[tool_result] 85-// fabricate midpoint dimensions from drawing scale / part numbers / page
86-\ numbers. The guards below produce a TIGHT acceptance window:
87-//   - both lines pure decimals (rejects "B .040", "M-3115", "1000")
88://   - same decimal-place count ≥ PAIRED_MIN_DECIMALS (rejects "1.5"/"1.0")
89-//   - upper > lower, band width ≤ PAIRED_BAND_DELTA_MAX_PCT of nominal
90-//   - nominal in plausible 
... [+2218 chars truncated]

### Assistant | 2026-05-19T04:36:44.077Z

Now let me check the hardness detection implementation:

### Assistant | 2026-05-19T04:36:44.920Z

[tool_use: Grep]

### User | 2026-05-19T04:36:47.174Z

[tool_result] 52-\ Rockwell-C hardness range (U-TDP08). JM Die corpus shows three idioms:
53-//   "Rc 58-60"   "M-2 Rc 58-60"   "MAT'L M-2 Rc 58-60"
54-//   "55-57 Rc"   "55-57 Rc."
55-//   "58 TO 60 Rc"   "Rc 58 TO 60"
56:// Magnitude clamp HARDNESS_RC_MIN..HARDNESS_RC_MAX (below) covers all
57-// engineering steels (an unclamped form would accept page numbers / dates).
58:// `g`-flag for matchAll, `i` for cas
... [+3101 chars truncated]

### Assistant | 2026-05-19T04:36:48.381Z

Excellent. Now let me verify the confidence calculation to understand the test on line 695:

### Assistant | 2026-05-19T04:36:49.377Z

[tool_use: Grep]

### User | 2026-05-19T04:36:51.352Z

[tool_result] 164-const CONF_UNTOLERANCED = 0.50;
165-const CONF_GEOMETRIC_ONLY = 0.70;
166:const CONF_TOL_LOW = 0.70;
167:const CONF_TOL_MED = 0.85;
168:const CONF_TOL_HIGH = 0.95;
169:const CONF_TOL_THRESHOLD_HIGH = 3;
170:const CONF_TOL_THRESHOLD_MED = 2;
171:const CONF_TOL_THRESHOLD_LOW = 1;
172-
173-function toLines(rawText) {
--
629-  const geoCount = dimensions.filter((d) => GEOMETRIC_KINDS.has(d.kind)).
... [+474 chars truncated]

### Assistant | 2026-05-19T04:36:52.975Z

Perfect. Now let me check what the test on line 695 is actually testing — specifically the confidence ladder:

### Assistant | 2026-05-19T04:36:53.206Z

[tool_use: Read]

### User | 2026-05-19T04:36:59.188Z

[tool_result] 160	// per-file scrutiny P1-4). A geometric-only GD&T sheet (circularity / TIR)
161	// carries hard machine-actionable data even with zero ± dims, so it must not
162	// collapse to the "untoleranced junk" floor (per-file scrutiny P1-2).
163	const CONF_NONE = 0.10;
164	const CONF_UNTOLERANCED = 0.50;
165	const CONF_GEOMETRIC_ONLY = 0.70;
166	const CONF_TOL_LOW = 0.70;
167	const CONF_TOL_MED = 0.85;
... [+437 chars truncated]

### Assistant | 2026-05-19T04:37:01.234Z

Now let me check if there's a `tolCount` calculation to understand what counts toward tolerance:

### Assistant | 2026-05-19T04:37:01.749Z

[tool_use: Grep]

### User | 2026-05-19T04:37:02.790Z

[tool_result] 623-  //          this is real machine-actionable data, NOT untoleranced junk — it
624-  //          must not collapse to the vision-fallback floor (P1-2)
625-  //   UNTOL  if only plain untoleranced dims
626-  //   NONE   if no dims at all (caller should fall back to vision)
627-  const GEOMETRIC_KINDS = new Set(["circularity", "runout_tir"]);
628:  const tolCount = dimensions.filter((d) => d.tol
... [+362 chars truncated]

### Assistant | 2026-05-19T04:37:30.125Z

Perfect. Now I have all the context I need. Let me review each test systematically:

## Test Review Summary

**SCOPE:** 20 new tests for U-TDP08 (lines 603-751):
- 11 paired-tolerance-band tests (lines 603-696)
- 9 hardness Rc tests (lines 700-738)
- 1 anti-regression test (lines 740-751)

---

## FINDINGS

### **P1: Line 695 — Confidence threshold assertion is INCORRECT**

**Severity:** P1 (test will FAIL on CI because assertion is wrong)

**Location:** Lines 690-696

```javascript
test("U-TDP08 paired-band: tolerance counts in confidence ladder", () => {
  const r = extractDimensionsFromText("1.002\n1.000\n.070\n.069\n");
  const paired = r.extraction.dimensions.filter((d) => d.meta?.format === "paired-band");
  assert.equal(paired.length, 2);
  assert.ok(r.extraction.confidence >= 0.85, "≥2 ± dims should hit CONF_TOL_MED");
});
```

**Rationale:**
- The comment says "≥2 ± dims" but line 633 reads: `else if (tolCount >= CONF_TOL_THRESHOLD_MED) confidence = CONF_TOL_MED`
- `CONF_TOL_THRESHOLD_MED = 2` (line 170), so `tolCount >= 2` is the condition
- The test assertion is `confidence >= 0.85`, but the code emits EXACTLY `0.85` not `>=0.85`
- **More critically:** The assertion should also verify `tolCount === 2`, not just that two pairs exist. A pair might be emitted WITHOUT the `tolerance` field (though unlikely given the code), and the test doesn't verify the confidence IS `0.85` not a higher tier. If a third dimension somehow added, the confidence could jump to `0.95` (CONF_TOL_HIGH at `tolCount >= 3`), and the test would still pass silently with wrong grading.

**Required fix:** Change to:
```javascript
assert.equal(r.extraction.confidence, 0.85, "exactly 2 ± dims = CONF_TOL_MED");
// AND verify tolCount = 2:
const tolDims = r.extraction.dimensions.filter((d) => d.tolerance);
assert.equal(tolDims.length, 2, "exactly 2 dimensions have tolerance");
```

---

### **P1: Line 731 — In-loop Grade form assertion is testing the WRONG expectation**

**Severity:** P1 (tes
... [+6638 chars truncated]
