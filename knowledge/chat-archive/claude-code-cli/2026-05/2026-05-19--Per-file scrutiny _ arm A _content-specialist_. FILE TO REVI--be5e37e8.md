---
type: "chat-session"
source: "claude-code-cli"
session_id: "be5e37e8-9aa8-4749-b02f-a97fde0830dd"
title: "Per-file scrutiny — arm A (content-specialist). FILE TO REVIEW (end-to-end): `H:"
date: "2026-05-19"
first_ts: "2026-05-19T04:31:26.128Z"
last_ts: "2026-05-19T04:32:30.615Z"
cwd: "H:\\PRISM"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/be5e37e8-9aa8-4749-b02f-a97fde0830dd/subagents/agent-ae077f136edb737e4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# Per-file scrutiny — arm A (content-specialist). FILE TO REVIEW (end-to-end): `H:

> **claude-code-cli** | 2026-05-19 | 5 msgs (2 user / 3 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/be5e37e8-9aa8-4749-b02f-a97fde0830dd/subagents/agent-ae077f136edb737e4.jsonl`

## Transcript

### User | 2026-05-19T04:31:26.128Z

Per-file scrutiny — arm A (content-specialist).

FILE TO REVIEW (end-to-end): `H:/prism-slot-mike/scripts/lib/pdf-text-extract-lib.mjs`

CONTEXT: This is a deterministic PDF-embedded-text dimension extractor for engineering drawings. I just added TWO new patterns under unit `U-TDP08`:

1. **Paired-tolerance-band detection** (line ~360 area, inside the line loop): two consecutive pure-decimal lines like `"1.002"` / `"1.000"` emit ONE linear dim with nominal = (upper+lower)/2 and tolerance ±(upper-lower)/2. Guards: matching decimal-place count ≥3, delta ≤5% of nominal, nominal in [0.001, 100] mm. Uses helpers `isBareDecimalLine`, `decimalPlacesOf`, `bareDecimalValue` (added after `parseSignedTolLine`). Constants in `PAIRED_*` near the kind-classification thresholds.

2. **Rc hardness range** (post-loop scan): regex `HARDNESS_RC_RE` (added near `CHAMFER_SIZE_TOL_RE`) matches three idioms (`Rc 58-60`, `55-57 Rc`, `58 TO 60 Rc`) and fills `grade` if a `Grade [HRC]:` line didn't already (first-match-wins). Clamps to [20, 70] HRC. Comment at `// Paired max/min blocks...` was updated from "NOT parsed" to acknowledge the new path.

REVIEW WEIGHTING (physics correctness, dimensional safety, R12 honesty):
- Does the paired-band guard reliably reject false positives? Look at: drawing scale (`1:1`, `1.0` / `2.0`), revision numbers, dates, page counts, lot numbers — anything that's a pair of bare numbers but NOT a tolerance band.
- Is the mathematical interpretation of paired bands correct? `upper > lower`; `nominal = (upper+lower)/2`; tolerance is symmetric ±(upper-lower)/2. Any case where this would yield physically-wrong values?
- Are the constants right? `PAIRED_MIN_DECIMALS = 3`, `PAIRED_BAND_DELTA_MAX_PCT = 0.05`, `PAIRED_NOMINAL_MIN_MM = 0.001`, `PAIRED_NOMINAL_MAX_MM = 100.0`. Are these defensible against the JM Die corpus pattern (US engineering drawings, mm units)?
- Does the Rc hardness clamp [20, 70] correctly bound real materials? Annealed steel sits ~15-20, theoreti
... [+979 chars truncated]

### Assistant | 2026-05-19T04:31:36.537Z

I'll read the file end-to-end and review the two new U-TDP08 patterns carefully.

### Assistant | 2026-05-19T04:31:36.919Z

[tool_use: Read]

### User | 2026-05-19T04:31:43.034Z

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
... [+31086 chars truncated]

### Assistant | 2026-05-19T04:32:30.615Z

I have read the file end-to-end. Now the per-file scrutiny review focusing on the two U-TDP08 patterns.

---

## Arm A — Content-Specialist Review (code-analyzer perspective)

### Findings

---

**P1 — Lines 430-457 — Paired-band detector emits BEFORE `NUM_RE` triple-form check, can steal canonical bilateral-Ø/linear triples.**

A bare numeric line like `"1.002"` passes both `isBareDecimalLine(ln)` (it's pure decimal) AND `NUM_RE.test(ln)` (line 461). The paired-band branch (line 430) runs FIRST and only requires the NEXT line to also be a bare decimal. Consider the canonical bilateral form documented at line 9-14:

```
'5.00'      ← nominal (bare decimal, 2 places — would FAIL ≥3 guard, safe)
'n'         ← Ø glyph
```

The `≥3 decimal places` guard saves the documented canonical case, BUT the JM Die corpus also emits 3-decimal-place nominals (e.g., the `"C:0.3575±.0002"` family — if ever split into tokens like `"0.357"`/`"0.355"` followed by glyph/tol triple). If a 3-decimal nominal is followed by what is actually ANOTHER 3-decimal callout on the same drawing (two consecutive separate dims printed close in stream order), the paired-band branch will steal them and emit a single fabricated "band" dim instead of two distinct dims. The `delta ≤ 5%` guard mitigates but does not eliminate: two real nominals at e.g. `1.005` and `0.995` (different features) would pass — delta=0.010, 0.010/1.005 = ~1% < 5%. **Rationale:** No structural separator (blank line, glyph, "+", "mm") is required between the two decimals — proximity alone triggers emission. The PDF token stream order does not guarantee that two adjacent bare decimals belong to the same band.

**Recommended mitigation (NOT to be applied right now — flag only):** Require a structural separator absent between the two decimals, OR demand that the SECOND line not be followed by a Ø-glyph / `+` / `mm` (i.e., look ahead one more line to confirm this is NOT the head of a triple-form).

---

**P2 — Lines 430-457 — `PAIRED_NO
... [+4267 chars truncated]
