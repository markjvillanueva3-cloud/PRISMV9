---
type: "chat-session"
source: "claude-code-cli"
session_id: "be5e37e8-9aa8-4749-b02f-a97fde0830dd"
title: "RE-REVIEW (round 2, independent) of `H:/prism-slot-mike/scripts/lib/pdf-text-ext"
date: "2026-05-19"
first_ts: "2026-05-19T00:59:44.330Z"
last_ts: "2026-05-19T01:05:05.267Z"
cwd: "H:\\PRISM"
messages: 37
user_msgs: 14
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/be5e37e8-9aa8-4749-b02f-a97fde0830dd/subagents/agent-a0b634a90e4586d10.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# RE-REVIEW (round 2, independent) of `H:/prism-slot-mike/scripts/lib/pdf-text-ext

> **claude-code-cli** | 2026-05-19 | 37 msgs (14 user / 23 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/be5e37e8-9aa8-4749-b02f-a97fde0830dd/subagents/agent-a0b634a90e4586d10.jsonl`

## Transcript

### User | 2026-05-19T00:59:44.330Z

RE-REVIEW (round 2, independent) of `H:/prism-slot-mike/scripts/lib/pdf-text-extract-lib.mjs` AND its test file `H:/prism-slot-mike/scripts/lib/pdf-text-extract-lib.test.mjs` (54 tests, all passing). You previously returned FAIL — your headline findings were: (B-P0-1) split-token path has no OCR guard and `parseSignedTolLine("- 10")` → 10 (dropped-dot 100×), untested; (B-P1-2) the Infinity/NaN guard had no failing test; (B-P1-3) dedup test asserted a weak invariant; (B-P1-4) confidence-ladder magic numbers; (B-P2) labels discarded + "labeled diameter" comment drift. Do NOT assume the other reviewer caught anything.

Read both files end-to-end. You are weighted toward TEST INTEGRITY and CONVENTION:

1. Are the NEW regression tests genuine (would they FAIL if the fix reverted)? Specifically:
   - "P0-1: integer tolerance '±25' is NOT silently rewritten to 0.25" — does this fail if the regex group reverts to `\.?(\d+…)`?
   - "P0-3 chained" tests — do they fail if the window check is removed?
   - "P1-1 radius R5 and linear 5.00 both survive" — does it fail if dedup reverts to kind-blind? Trace classifyKind("R5.00mm" via RADIUS_RE) vs the inline 5.00±.10 to confirm the two land on DIFFERENT canonical kinds (else the test proves nothing).
   - "Infinity guard 320-digit" — does it actually exercise the line-371-equivalent guard, or pass vacuously?
   - "P1-3 ±0" — confirm it pins BOTH no-tolerance AND the confidence tier.
   - "P2 label" — pinned to exact strings "C" / "E.POINT"?
2. B-P0-1 (split-token OCR gap / `parseSignedTolLine("- 10")`→10): was this addressed or honestly scoped out? Check the commit-intent comments / NOTE. It is PRE-EXISTING U-TDP01–06 code, not added by U-TDP07. Is scoping it out (with an honest log) defensible per R7/surgical-change, or does shipping U-TDP07 alongside an unguarded split path violate R12? Give a clear verdict.
3. INLINED CONSTANTS / convention: every numeric literal in NON-test code now a named constant matching the file's conventi
... [+968 chars truncated]

### Assistant | 2026-05-19T00:59:55.355Z

I'll read both files end-to-end and verify each finding independently.

### Assistant | 2026-05-19T00:59:55.811Z

[tool_use: Read]

### Assistant | 2026-05-19T00:59:55.997Z

[tool_use: Read]

### User | 2026-05-19T00:59:57.298Z

[tool_result] read-once-guard: 'H:\prism-slot-mike\scripts\lib\pdf-text-extract-lib.mjs' was already read 12s ago in this session and is unchanged (mtime 1779152273823). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### User | 2026-05-19T00:59:58.363Z

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
... [+22566 chars truncated]

### Assistant | 2026-05-19T01:00:05.193Z

The lib file is in my context from 12s ago. Let me re-read it to verify line-by-line against the new comments and constants.

### Assistant | 2026-05-19T01:00:05.735Z

[tool_use: Read]

### User | 2026-05-19T01:00:06.428Z

[tool_result] read-once-guard: 'H:\prism-slot-mike\scripts\lib\pdf-text-extract-lib.mjs' was already read 22s ago in this session and is unchanged (mtime 1779152273823). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### Assistant | 2026-05-19T01:00:10.253Z

The guard says the file content is in my context, but the only content I actually received in this conversation is the test file. I need the lib source to verify. Let me read it in parts via offset.

### Assistant | 2026-05-19T01:00:10.985Z

[tool_use: Read]

### User | 2026-05-19T01:00:17.684Z

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
... [+6262 chars truncated]

### Assistant | 2026-05-19T01:00:22.444Z

[tool_use: Read]

### User | 2026-05-19T01:00:29.262Z

[tool_result] 120	// nominal magnitude and must BOTH survive (per-file scrutiny P1-1).
121	const INLINE_DEDUP_NOMINAL_EPS_MM = 1e-4;
122	// A ±0 callout is a basic/reference dimension or OCR loss, not a real
123	// tolerance — recorded WITHOUT a tolerance so it can't inflate confidence
124	// (per-file scrutiny P1-3).
125	const INLINE_MIN_MEANINGFUL_TOL_MM = 0;
126	
127	// Confidence ladder — named per the file
... [+6346 chars truncated]

### Assistant | 2026-05-19T01:00:33.288Z

[tool_use: Read]

### User | 2026-05-19T01:00:38.311Z

[tool_result] 280	      dimensions.push({ kind: canonical, nominal: r, meta: { type: "radius", source: "embedded-text" } });
281	      continue;
282	    }
283	
284	    // Stuck-mm form: "4.00mm" or "70.00mm"
285	    if ((m = ln.match(STUCK_MM_RE))) {
286	      const v = Number(m[1]);
287	      const canonical = classifyKind({ kind: "linear", nominal: v });
288	      dimensions.push({ kind: canonical, nominal: v
... [+7485 chars truncated]

### Assistant | 2026-05-19T01:00:42.495Z

[tool_use: Read]

### User | 2026-05-19T01:00:44.512Z

[tool_result] 449	    if (haveNominalKind(nominal, canonical)) continue;
450	    // Preserve the feature label ("C:", "E.POINT:") so downstream training
451	    // keeps callout→feature attribution (per-file scrutiny P2). Backward
452	    // lexical scan only — no regex surgery on the guarded INLINE_PM_RE.
453	    const pre = rawText.slice(Math.max(0, m.index - INLINE_LABEL_LOOKBACK_CHARS), m.index);
454	    co
... [+3116 chars truncated]

### Assistant | 2026-05-19T01:00:56.543Z

I now have the complete lib (lines 1-530) and the complete test file (lines 1-570). Let me trace each prior finding rigorously.

## Trace: prior B-P0-1 (split-token OCR gap + `parseSignedTolLine("- 10")` → 10)

`parseSignedTolLine` (line 146-165): regex `/^([-+]?)\s*\.?(\d+(?:\.\d+)?)$/`. Input `"- 10"`: `m[1]="-"`, `\s*` eats space, `\.?` optional (absent), `m[2]="10"`. Then line 156-161: `t` is `"- 10"`. `t.startsWith(".")`→false. `t.replace(/^[-+]/,"").startsWith(".")` → `" 10".startsWith(".")`→false. `t.replace(/^[-+]\s*/,"").startsWith(".")` → `"10".startsWith(".")`→false. So `valStr="10"`, `v=10`. **Confirmed: `parseSignedTolLine("- 10")` → `{sign:-1, value:10}`.** A drawing token `"- 10"` meaning `-0.010` (dropped-dot OCR) yields 10 — a 1000× error. This path has no OCR left-boundary guard equivalent to INLINE_PM_RE.

Is this scoped out honestly? It is **pre-existing U-TDP01–06 code** (the split-token line loop), untouched by U-TDP07 (which is the inline-± post-loop pass + the P0/P1 scrutiny fixes). Let me check whether the test file or lib surfaces this gap.

### Assistant | 2026-05-19T01:00:58.363Z

[tool_use: Grep]

### User | 2026-05-19T01:01:01.011Z

[tool_result] 81:// JM Die corpus are OCR-tier garbage, NOT clean vector CAD exports — e.g.
118:// the same physical dimension (de-dup when a PDF mixes split-token + inline-±
122:// A ±0 callout is a basic/reference dimension or OCR loss, not a real
394:  // The line loop above only recognizes the SolidWorks split-token form.
398:  // Dedup against split-token dims by near-equal nominal so a PDF that mixes
440:
... [+235 chars truncated]

### Assistant | 2026-05-19T01:02:03.630Z

The OCR-tier-garbage comment (lines 80-86) explicitly scopes the left-boundary guard to the **inline-± format only**:

> "some 'embedded text' layers in the JM Die corpus are OCR-tier garbage... Without the guard the regex starts mid-token..."

But there is **no honest NOTE anywhere in the lib or tests** disclosing that the split-token path (`parseSignedTolLine` / `tryParseToleranceTriple`) has *no* OCR guard and silently turns a dropped-dot `"- 10"` into 10. The R12 deferral block at lines 483-486 honestly defers *paired max/min*, and the `±0` / OCR comments at 122/440 honestly scope inline. The split-token-dropped-dot gap is the one unguarded path with **no surfacing at all**.

Now let me verify each NEW regression test is genuine (would fail on revert).

### P0-1 integer tolerance (test lines 470-482)

`INLINE_PM_RE` group 3 is `(\.?\d+(?:\.\d+)?)` (line 101). Input `"WELD GAP 12.00±25 mm"`. The left guard `(?<![\dA-Za-z.,])` — char before `12.00` is space → ok. `m[2]="12.00"`, `m[3]="25"` (the `\.?` is absent, `\d+`=`25`). `tolValue("25")`: doesn't start with `.`, `Number("25")=25`. → `tolerance.upper=25`. Test asserts `=== 25`. **If reverted to `\.?(\d+…)` (dot eaten): `m[3]="25"` still** — wait. Let me trace the *pre-fix* form carefully. Pre-fix group was `\.?(\d+(?:\.\d+)?)`: the `\.?` is *outside* the capture, `\d+` captured. For `±.25`: `\.?` eats the dot, group=`25`. For `±25`: `\.?` absent, group=`25`. Both yield `"25"` → `tolValue` would then need a heuristic to guess 0.25. The current `tolValue` (416-421) has **no such heuristic** — it just does `Number(t)`. So under a pure regex-revert WITHOUT also reverting tolValue, `±25`→25 and `±.25`→`Number("25")`=25 too (the dot is gone). The test "±.25 still parses as 0.25" (478-482) would then FAIL (`tolValue("25")`=25≠0.25). **So P0-1's pair of tests genuinely pins the dot-keeping regex** — revert the group to `\.?(\d+…)` and test at 478 fails. Genuine. ✓

### P0-3 chained (test lines 491-501)

Lib lines 427-4
... [+7227 chars truncated]

### Assistant | 2026-05-19T01:02:04.526Z

[tool_use: Bash]

### User | 2026-05-19T01:02:12.688Z

[tool_result]   ...
# Subtest: extract: result shape matches BlueprintExtraction contract
ok 53 - extract: result shape matches BlueprintExtraction contract
  ---
  duration_ms: 0.2044
  ...
# Subtest: toLines: strips per-line whitespace and CRLF
ok 54 - toLines: strips per-line whitespace and CRLF
  ---
  duration_ms: 0.4124
  ...
1..54
# tests 54
# suites 0
# pass 54
# fail 0
# cancelled 0
# skipped 0
# todo 
... [+24 chars truncated]

### Assistant | 2026-05-19T01:02:16.750Z

54/54 pass. Now let me empirically verify the split-token OCR gap (B-P0-1) and a few edge traces.

### Assistant | 2026-05-19T01:02:21.021Z

[tool_use: Bash]

### User | 2026-05-19T01:02:42.606Z

[tool_result] parseSignedTolLine("- 10") = {"sign":-1,"value":10}
parseSignedTolLine("- .10") = {"sign":-1,"value":0.1}
split-token dropped-dot dim = [{"kind":"stepped_revolved_axis","nominal":5,"tolerance":{"upper":10,"lower":-10},"meta":{"type":"diameter","source":"embedded-text"}}]
split-token correct dim    = [{"kind":"stepped_revolved_axis","nominal":5,"tolerance":{"upper":0.1,"lower":-0.1},"meta":{"type":
... [+38 chars truncated]

### Assistant | 2026-05-19T01:02:59.814Z

**Confirmed empirically.** A drawing whose embedded-text layer drops the dot (`"- 10"` instead of `"- .10"` — exactly the OCR class the inline path explicitly guards against per lines 80-86) produces a Ø5.00 hole with **±10 mm tolerance** instead of ±0.10 mm — a 100× band error fed into training data. The inline-± path *refuses* its OCR-garble equivalent (test at 432-454 proves it); the split-token path silently fabricates.

Now the critical question for this re-review: **is B-P0-1 a U-TDP07 ship-blocker, or pre-existing scoped-out work?**

The split-token loop (`parseSignedTolLine`, `tryParseToleranceTriple`, lines 146-390) is **pre-existing U-TDP01–06 code**. U-TDP07 is the inline-± post-loop pass + the 7 P0/P1 scrutiny fixes. The diff under review adds the OCR guard *to the inline path* and explicitly documents (lines 80-86) why OCR-garble must be refused — establishing that the author **knows this exact failure class matters for training-data integrity**. Yet:

1. The split-token path has no equivalent guard.
2. There is **no honest NOTE** disclosing this. Contrast lines 483-486, where paired-max/min is deferred *with* an explicit `NOTE:` + `(R12: a missed pair beats a fabricated midpoint dimension)`. The dropped-dot split-token gap gets the *same severity* (a fabricated 100× tolerance into training data) but **zero surfacing**.
3. No test pins or documents it (no `todo`, no skipped test, no comment).

Per R7 (surgical change) shipping U-TDP07 without *fixing* the pre-existing path is defensible — it's out of scope. Per R12 (fail loud), shipping it **without surfacing** a known-class fabrication on a path the same diff proves the author understands is **not** defensible. The author wrote 7 lines of comment justifying the inline OCR guard "(R12: a missed dim beats a fabricated one)" while leaving the structurally identical split-token fabrication completely undocumented. That is the precise R12 violation: the lib now fabricates a 100×-wrong toleranced dimension o
... [+133 chars truncated]

### Assistant | 2026-05-19T01:03:01.410Z

[tool_use: Bash]

### User | 2026-05-19T01:03:39.247Z

[tool_result] d85573b7d4 [APS-FUSION-CLOUD-MS0] [TRAIN-OCR]/U-TDP07: deterministic embedded-text PDF dimension extractor + training...
---DIFF-STAT---
scripts/lib/pdf-text-extract-lib.mjs      | 529 +++++++++++++++++++++++++++
 scripts/lib/pdf-text-extract-lib.test.mjs | 569 ++++++++++++++++++++++++++++++
 2 files changed, 1098 insertions(+)

### Assistant | 2026-05-19T01:03:48.477Z

Critical finding: **the entire file is NEW in this single commit** (`d85573b7d4`, U-TDP07 — 529 insertions, 0 deletions). My prior assumption (and the re-review prompt's framing) that the split-token path is "pre-existing U-TDP01–06 code, not added by U-TDP07" is **factually wrong** — `git diff HEAD~1 --stat` shows the file is created whole-cloth in U-TDP07. `parseSignedTolLine`, `tryParseToleranceTriple`, and the split-token loop were **authored in the same commit** as the inline guard.

This eliminates the "pre-existing, scope it out" defense entirely. The author wrote *both* paths in one commit: one path (inline-±) gets a 7-line OCR-garble guard with explicit R12 justification + a regression test that proves garbled fragments are refused (test 432-454); the sibling path (split-token), written the same day by the same author for the same training-data purpose, takes a dropped-dot OCR input and **fabricates a 100×-wrong tolerance with no guard, no NOTE, no test**. There is no honest deferral — lines 483-486 defer paired-max/min loudly; this gap is silent.

Let me confirm there's no OCR-garble disclosure for the split path anywhere.

### Assistant | 2026-05-19T01:03:50.078Z

[tool_use: Grep]

### User | 2026-05-19T01:03:53.184Z

[tool_result] 12:const { parseSignedTolLine, tryParseToleranceTriple, classifyKind, toLines } = _internals;
14:// ── parseSignedTolLine ─────────────────────────────────────────────
16:test("parseSignedTolLine: '- .10' → sign=-1, value=0.10", () => {
17:  const r = parseSignedTolLine("- .10");
21:test("parseSignedTolLine: '.10' → sign=+1, value=0.10", () => {
22:  const r = parseSignedTolLine(".10");
26:test("p
... [+1389 chars truncated]

### Assistant | 2026-05-19T01:03:58.992Z

Confirmed: the test file has `parseSignedTolLine` tests for `"- .10"`, `".10"`, `"+.05"`, and empty/garbage — but **no test for the dropped-dot OCR case `"- 10"`**, and no comment anywhere acknowledging the split-token path lacks the OCR guard the inline path has. The gap is entirely unsurfaced in a single-commit file whose own purpose is training-data integrity.

Let me run the remaining error-budget traces.

### Assistant | 2026-05-19T01:04:06.656Z

[tool_use: Bash]

### User | 2026-05-19T01:04:17.808Z

[tool_result] dot-only tol: []
empty body: {"success":false,"error":"empty text","extraction":null}
50K ± body ms= 77 success= true dims= 0
no-label: {"type":"linear","format":"inline-pm","source":"embedded-text"}
classifyKind NaN radius: blade_root_fillet
toLines(null): [] toLines(42): []

### Assistant | 2026-05-19T01:05:05.267Z

Error-budget results:
- Dot-only `±.` → no match (regex requires `\d+` after optional dot), no throw. ✓
- Empty → clean `success:false`. ✓
- 50K pathological `±…±…` body → 77ms, 0 dims (chain-window rejects all), no hang. ✓
- No-label pre → `meta.label` correctly absent. ✓
- `classifyKind({kind:"radius",nominal:NaN})` → `"blade_root_fillet"` (NaN fails both `<=` comparisons → falls to the `return "blade_root_fillet"` default at line 217). This is a **latent mis-classification**, but in practice line 435 (`!Number.isFinite(nominal)`) gates NaN before `classifyKind` is reached on the inline path, and `Number(ln)` with `NUM_RE` gating prevents NaN on the split path. So unreachable in production — a P3 robustness note, not a defect.
- `toLines(null)`/`toLines(42)` → `[]`, no throw. ✓

Now let me verify the two doc/code-drift claims flagged in question 4.

**Claim A (lines 112-114):** "Both magnitudes are read through tolValue()" for OUT_OF_ROUND_RE/TIR_RE. Code lines 463-482: `OUT_OF_ROUND_RE` → `tolValue(m[1])`; `TIR_RE` → `tolValue(m[1])`. Each regex has exactly **one** magnitude group. The comment says "Both magnitudes" — meaning the OUT_OF_ROUND magnitude *and* the TIR magnitude (two separate callouts, one each), both routed through `tolValue`. Reading lines 111-114 in context ("Geometric / GD&T text callouts. The magnitude group KEEPS the leading dot... Both magnitudes are read through tolValue()") — "both" = the two callout types. Code confirms both call `tolValue`. **Accurate, slightly terse but not overstated.** ✓

**Claim B (lines 88-92, P0-2 prefix):** "The prefix consumes any of them so '−R1.476±.005' recovers the 1.476 magnitude." Verified empirically earlier (test 484 passes; `−R1.476` → nominal 1.476, type radius). The comment is **accurate** for the stated input. The only caveat (my P2 above): the prefix is *not strictly necessary* for recovery because the left-guard's negative-char-class `[\dA-Za-z.,]` excludes U+2212, so the regex re-anchors at `R` even
... [+5136 chars truncated]
