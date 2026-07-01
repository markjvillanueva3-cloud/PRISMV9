---
type: "chat-session"
source: "claude-code-cli"
session_id: "be5e37e8-9aa8-4749-b02f-a97fde0830dd"
title: "Review the ENTIRE file `H:/prism-slot-mike/scripts/lib/pdf-text-extract-lib.mjs`"
date: "2026-05-19"
first_ts: "2026-05-19T00:44:07.773Z"
last_ts: "2026-05-19T00:48:54.987Z"
cwd: "H:\\PRISM"
messages: 17
user_msgs: 6
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/be5e37e8-9aa8-4749-b02f-a97fde0830dd/subagents/agent-a80c9fb63cd105c6f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# Review the ENTIRE file `H:/prism-slot-mike/scripts/lib/pdf-text-extract-lib.mjs`

> **claude-code-cli** | 2026-05-19 | 17 msgs (6 user / 11 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/be5e37e8-9aa8-4749-b02f-a97fde0830dd/subagents/agent-a80c9fb63cd105c6f.jsonl`

## Transcript

### User | 2026-05-19T00:44:07.773Z

Review the ENTIRE file `H:/prism-slot-mike/scripts/lib/pdf-text-extract-lib.mjs` end-to-end (read the whole file).

CONTEXT: This is U-TDP07, the deterministic embedded-text dimension extractor for the PRISM print-to-CAM AI training pipeline. It parses CAD-exported PDF text into BlueprintExtraction shape `{success, error, extraction:{confidence, dimensions:[{kind,nominal,tolerance:{upper,lower},meta}], material, surface_treatment, hardness_grade, surface_roughness_ra_um, source}}`. Its output FEEDS AI TRAINING DATA — a fabricated/wrong dimension poisons the model. This session added: INLINE_PM_RE (AutoCAD/legacy-Inventor `C:0.3575±.0002` / `R1.476±.005` / `-R0.060±.005` / `15.00 ±.25` inline-± format) with a `(?<![\dA-Za-z.,])` left-boundary guard against OCR-garbled fragments, OUT_OF_ROUND_RE → circularity, TIR_RE → runout_tir, a post-loop matchAll scan over rawText, INLINE_DEDUP_NOMINAL_EPS_MM dedup vs the split-token line loop, and wired RELIEF_PATTERN_COUNT_MIN/MAX.

GRADE the file PASS or FAIL. Flag every P0 (correctness/safety/data-poisoning) and P1 (significant) issue. Focus on:
1. Can INLINE_PM_RE still emit a physically-implausible or fragment value the guard misses? Walk the regex against adversarial inputs (`,3345`, `..476`, `R±.005`, `5±`, unicode minus, multiple ± on one line, `±` with no number).
2. tolValue heuristic: is `0.`+digits ever wrong? e.g. `±15` (no dot, integer tol) → 0.15? Is that correct or a silent bug? `±1.5` kept as 1.5 — consistent?
3. dedup haveNominal: does it wrongly drop a LEGIT distinct dimension that happens to share a nominal with a different-kind callout? Is 1e-4 mm too wide/narrow?
4. matchAll on a global regex with lookbehind — any lastIndex/zero-width-match infinite-loop risk? ReDoS on pathological input?
5. R12 honesty: is any path silently partial or fabricating? Is the paired-max/min deferral honest?
6. Confidence heuristic interaction: do circularity/runout_tir (no tolerance) dims wrongly inflate or deflate the tolCount
... [+239 chars truncated]

### Assistant | 2026-05-19T00:44:28.254Z

I'll read the entire file end-to-end.

### Assistant | 2026-05-19T00:44:28.696Z

[tool_use: Read]

### User | 2026-05-19T00:44:40.711Z

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
... [+19178 chars truncated]

### Assistant | 2026-05-19T00:44:45.184Z

I've read the entire file. Now let me analyze it adversarially against each focus area.

### Assistant | 2026-05-19T00:44:52.508Z

[tool_use: Bash]

### User | 2026-05-19T00:45:30.532Z

[tool_result] ",3345±.0002" => []
"..476±.005" => []
"R±.005" => []
"5±" => []
"5±.10" => [{"prefix":"","nom":"5","tol":"10","idx":0}]
"−1.5±.005" => [{"prefix":"","nom":"1.5","tol":"005","idx":1}]
"15.00 ±.25 ±.30" => [{"prefix":"","nom":"15.00","tol":"25","idx":0}]
"± .005" => []
"0,3345±.0002" => []
"Rl .476±.005" => []
"abc5.00±.10" => []
".5±.005" => []
"5.±.005" => []
"-R0.060±.005" => [{"prefix":"-R","no
... [+232 chars truncated]

### Assistant | 2026-05-19T00:45:33.995Z

Found the unicode-minus bug. Let me dig deeper into the critical findings.

### Assistant | 2026-05-19T00:45:47.909Z

[tool_use: Bash]

### User | 2026-05-19T00:46:17.827Z

[tool_result] A unicode-minus R: [{"kind":"leading_edge_fillet","nominal":1.476,"tolerance":{"upper":0.005,"lower":-0.005},"meta":{"type":"radius","format":"inline-pm","source":"embedded-text"}}]
B 1pm2pm3: [{"kind":"stepped_revolved_axis","nominal":1,"tolerance":{"upper":0.2,"lower":-0.2},"meta":{"type":"linear","format":"inline-pm","source":"embedded-text"}}]
C pm15 integer-tol: [{"kind":"stepped_revolved_axi
... [+1175 chars truncated]

### Assistant | 2026-05-19T00:46:21.916Z

Multiple confirmed bugs. Let me verify the `tolValue` semantics against canonical engineering convention and the dedup edge cases more precisely.

### Assistant | 2026-05-19T00:46:33.034Z

[tool_use: Bash]

### User | 2026-05-19T00:47:18.613Z

[tool_result] "X 10.00±.25 mm" tol.upper = 0.25
"X 10.00±25 mm" tol.upper = 0.25
"X 10.00±2.5 mm" tol.upper = 2.5
"X 10.00±.0002 mm" tol.upper = 0.0002
"X 10.00±0.25 mm" tol.upper = 0.25
---
dedup narrowness:
[{"n":12,"t":{"upper":0.001,"lower":-0.001}}]

### Assistant | 2026-05-19T00:47:23.258Z

All confirmed. Let me check one more critical path — whether `INLINE_PM_RE` matches inside already-parsed split-token nominals causing double counting where nominals differ, and the `R` letter-boundary interaction with the guard.

### Assistant | 2026-05-19T00:47:38.305Z

[tool_use: Bash]

### User | 2026-05-19T00:47:57.428Z

[tool_result] paren-R: [{"kind":"shoulder_fillet","nominal":5,"tolerance":{"upper":0.005,"lower":-0.005},"meta":{"type":"radius","format":"inline-pm","source":"embedded-text"}}]
close-not-equal: [5,5.05]
conf: 0.85
geom+matsurf conf: 0.5 dims: 2

### Assistant | 2026-05-19T00:48:54.987Z

I have a complete picture. Here is my review.

---

# Code Quality Analysis Report — `pdf-text-extract-lib.mjs` (U-TDP07)

## Verdict: **FAIL**

Three P0 data-poisoning defects confirmed by execution against the live module. This output feeds AI training; each defect emits a *wrong dimension*, which is worse than the missed dimension the design explicitly trades for (the file's own R12 doctrine, lines 84–86).

---

## P0 — Data Poisoning (must fix before this feeds training)

### P0-1 — `tolValue` silently divides integer tolerances by ~10–100 (lines 359–365, 87)
`INLINE_PM_RE` group 3 is `\.?(\d+(?:\.\d+)?)`. The optional `\.?` **consumes** the decimal point, so `±.25` and `±25` *both* yield `m[3] === "25"`. `tolValue` (line 363) then sees no `.` in `"25"` and computes `Number("0." + "25") = 0.25`.

Confirmed:
```
"X 10.00±25 mm"   tol.upper = 0.25   ← should be 25 (or rejected)
"X 10.00±.25 mm"  tol.upper = 0.25   ← correct
```
Both produce identical output. A drawing reading `12.00±15` (a coarse ±15 mm weld/sheet-metal tolerance) is recorded as `±0.15 mm` — a **100× tightening** fed verbatim into training as ground truth. The comment on line 359 ("Tolerance tokens here are always sub-unit fractions") is an *assumption*, not an invariant the regex enforces — and the regex actively erases the evidence (`.`) needed to distinguish the two cases. This is a silent fabrication, not a missed dim. The asymmetry vs. `±1.5` (kept as `1.5`, because the inner `(?:\.\d+)?` preserves that dot) makes the data inconsistent: `±1.5`→1.5 but `±15`→0.15.

**Fix:** make the leading dot significant — capture whether it was present and only prepend `0.` when the source token actually began with `.`. E.g. change group 3 to `(\.\d+|\d+(?:\.\d+)?)` and in `tolValue` treat a leading-`.` string as fractional, a bare integer as integer (or reject a bare-integer ± as implausible and skip — honest miss per R12). The current heuristic cannot be made correct without the regex preserving the dot.

... [+6573 chars truncated]
