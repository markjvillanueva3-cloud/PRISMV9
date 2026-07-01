---
type: "chat-session"
source: "claude-code-cli"
session_id: "571d4bdd-5118-4307-b29c-fa75fed32e14"
title: "Review the FULL file `H:\\prism\\scripts\\lib\\cnc-ground-truth-lib.mjs` end-to-end "
date: "2026-05-19"
first_ts: "2026-05-19T00:31:47.752Z"
last_ts: "2026-05-19T00:34:07.049Z"
cwd: "H:\\prism"
messages: 15
user_msgs: 6
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/571d4bdd-5118-4307-b29c-fa75fed32e14/subagents/agent-a200b917a15bfd458.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Review the FULL file `H:\prism\scripts\lib\cnc-ground-truth-lib.mjs` end-to-end 

> **claude-code-cli** | 2026-05-19 | 15 msgs (6 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/571d4bdd-5118-4307-b29c-fa75fed32e14/subagents/agent-a200b917a15bfd458.jsonl`

## Transcript

### User | 2026-05-19T00:31:47.752Z

Review the FULL file `H:\prism\scripts\lib\cnc-ground-truth-lib.mjs` end-to-end (read the whole file). This is unit U-TDP06 of BLUEPRINT-OCR-TRAINING-MS2: a PURE library that converts a CNC program's G/M-code text into BlueprintExtraction-shape ground-truth records for an OCR-extraction benchmark.

Context it must satisfy:
- It MIRRORS the sibling `H:\prism\scripts\lib\cad-ground-truth-lib.mjs` (read that too for the contract): same record shape — `{pdf_path, <src>, part_class, dimensions:[{kind, presence_only, ...}], derivation:{...}}` — and `groupRecordsByPartClass` must emit `{schemaVersion:1, part_class, prints:[{pdf_path,cnc_source,dimensions,derivation}], source:"cnc-derived"}`.
- The U-TDP04 benchmark (`H:\prism\scripts\lib\ocr-benchmark-lib.mjs` — read it) consumes these GT records and grades dim_error_mm at p95 ≤ 0.05mm, so any emitted `nominal_mm` MUST be a real cut dimension, never a rapid/park position. Presence-only entries (no nominal) are a valid graded contract (the CAD half is 100% presence_only).
- Canonical PRISM feature-kind vocabulary must match the cad lib's set exactly.
- PURE: no fs, no engine calls. Must be robust to empty/null/binary/malformed NC, CRLF, inch vs metric (G20/G21 + header-comment fallback), modal G-codes, leading-zero G-codes (verify: does the tokenizer handle `G01` vs `G1`? `G083`?).

Flag every P0/P1 (correctness, false nominals, vocabulary drift, contract mismatch with cad lib / benchmark, ReDoS, unit-conversion bugs, dedup logic in buildGtRecordFromNc). Manufacturing-domain sanity-check the G-code→feature-kind mapping (G81/82/83 drill, G84/74 tap, G85/86/76/89 bore, G71/72/73/70 lathe rough/finish, G75 groove, G2/G3 fillet, simultaneous X+Z feed → taper). Grade PASS/FAIL with a concise P0/P1 list.

### Assistant | 2026-05-19T00:31:58.821Z

I'll review the target file and its sibling/consumer contracts end-to-end.

### Assistant | 2026-05-19T00:31:59.236Z

[tool_use: Read]

### Assistant | 2026-05-19T00:31:59.631Z

[tool_use: Read]

### Assistant | 2026-05-19T00:32:00.144Z

[tool_use: Read]

### User | 2026-05-19T00:32:01.362Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\cad-ground-truth-lib.mjs' was already read 8m ago in this session and is unchanged (mtime 1779124930840). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-19T00:32:02.196Z

[tool_result] 1	// scripts/lib/cnc-ground-truth-lib.mjs
2	//
3	// U-TDP06 - CNC-derived Ground Truth (pure core).
4	//
5	// Converts a CNC program's G/M-code content into BlueprintExtraction-shape GT
6	// records for the U-TDP04 benchmark. Unlike the CAD half (STEP geometry =
7	// presence only), a CNC program encodes the dimensions the programmer
8	// actually cut: drill Z-depth, lathe X-diameter, peck-cycle d
... [+12045 chars truncated]

### User | 2026-05-19T00:32:02.468Z

[tool_result] 1	// scripts/lib/ocr-benchmark-lib.mjs
2	//
3	// U-TDP04 — OCR Extraction Benchmark (pure core).
4	//
5	// Grades the OCR/print-reading pipeline against hand-labeled ground truth.
6	// This is the "prove we can extract correct data from prints before anything
7	// else" unit — the gate that decides whether to progress from print-reading
8	// training to CAD/CAM training.
9	//
10	// ML metrics (per
... [+14384 chars truncated]

### Assistant | 2026-05-19T00:32:06.270Z

I have the cnc lib and benchmark lib. I need the cad lib contract — it's in my context from earlier but the read-once guard blocked re-read. Let me grep the specific contract surfaces I need to verify against.

### Assistant | 2026-05-19T00:32:07.978Z

[tool_use: Grep]

### User | 2026-05-19T00:32:13.342Z

[tool_result] 7:// so emitted GT entries use presence_only: true.
15:export const CAD_FILENAME_HEURISTICS = Object.freeze([
16:  { token: "punch",    part_class: "extrude_punch" },
17:  { token: "die",      part_class: "die" },
18:  { token: "shaft",    part_class: "shaft" },
19:  { token: "bushing",  part_class: "bushing" },
20:  { token: "bracket",  part_class: "bracket" },
21:  { token: "casing",   part_clas
... [+1226 chars truncated]

### Assistant | 2026-05-19T00:32:16.647Z

Now I need the cad lib's canonical feature-kind vocabulary (the `evidenceForFeatureKinds` body) and the `groupRecordsByPartClass` full structure to verify the contract mirror exactly.

### Assistant | 2026-05-19T00:32:17.209Z

[tool_use: Read]

### User | 2026-05-19T00:32:22.621Z

[tool_result] 28	export function evidenceForFeatureKinds(geom) {
29	  if (!geom || typeof geom !== "object") return [];
30	  const kinds = new Set();
31	  if (geom.has_cylindrical_holes === true || Number(geom.cylindrical_feature_count) > 0) {
32	    kinds.add("stepped_revolved_axis");
33	    if (Number(geom.cylindrical_feature_count) >= 2) {
34	      kinds.add("central_oil_hole");
35	    }
36	    if (Number(ge
... [+3137 chars truncated]

### Assistant | 2026-05-19T00:34:07.049Z

I now have all three files end-to-end. Full analysis follows.

---

## Code Quality Analysis Report — `cnc-ground-truth-lib.mjs` (U-TDP06)

### Summary
- Files Analyzed: 3 (`cnc-ground-truth-lib.mjs` target; `cad-ground-truth-lib.mjs` + `ocr-benchmark-lib.mjs` for contract)
- Overall Quality: solid pure-core, well-commented, correct intent — but **two P0 false-nominal bugs that directly poison the U-TDP04 dim benchmark** and one P0 tokenizer correctness bug.
- **Grade: FAIL** (3 P0 + 4 P1)

---

### P0 — Critical

**P0-1 — Tokenizer mis-parses sign-only and dot-only words; corrupts G/M/T and coordinate words.**
`scripts/lib/cnc-ground-truth-lib.mjs:69`
The regex `/[A-Z][-+]?\d*\.?\d*/g` makes the entire numeric part optional, so it matches a bare letter with **zero digits**. Two concrete failures:

1. `op.t` capture: `else if (letter === "T" && numStr !== "")` — fine, but consider a word like `X-` or `Z.` (malformed but present in dirty real NC, or produced when a number is split by a stripped inline comment like `X(rad).5`). `X-` → `numStr="-"` → `Number("-")` = `NaN` → silently dropped. Acceptable. But the real bug: the regex matches **decimal points with no digits and signs with no digits as the start of the next token**. `X1.5Y-2.` tokenizes `Y-2.` → `Number("-2.")` = `-2` (OK), but `G1.` (a literal that appears in some Fanuc dialects' `G01.1` smoothing) → first match `G1` then `.` is dropped — `G01.1` becomes `G1` which is correct-by-accident. However `G1.1` polynomial / `G84.2` rigid-tap / `G83.1` high-speed-peck (common Fanuc/Haas) — `G84.2` tokenizes as word `G84` then `.2` is unmatched (the `[A-Z]` anchor requires a letter), so the decimal sub-cycle digit is **silently lost**. `G84.2` rigid tapping is still caught as `G84` (lucky), but `G73.1`/`G83.1` deep-peck variants collapse to `G73`/`G83` — acceptable for kind mapping, but it means the tokenizer is matching by accident, not by design. The genuine P0: **`+`/`-` sign with empty digits**. Input `G0 X+ Z1`
... [+12823 chars truncated]
