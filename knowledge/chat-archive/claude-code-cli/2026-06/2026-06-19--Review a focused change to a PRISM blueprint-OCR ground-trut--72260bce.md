---
type: "chat-session"
source: "claude-code-cli"
session_id: "72260bce-0a62-459c-b567-b0ae228e3b92"
title: "Review a focused change to a PRISM blueprint-OCR ground-truth library. Read thes"
date: "2026-06-19"
first_ts: "2026-06-19T20:27:41.380Z"
last_ts: "2026-06-19T20:29:07.924Z"
cwd: "H:\\prism"
messages: 21
user_msgs: 8
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/72260bce-0a62-459c-b567-b0ae228e3b92/subagents/agent-a8d8c9191718bb252.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Review a focused change to a PRISM blueprint-OCR ground-truth library. Read thes

> **claude-code-cli** | 2026-06-19 | 21 msgs (8 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/72260bce-0a62-459c-b567-b0ae228e3b92/subagents/agent-a8d8c9191718bb252.jsonl`

## Transcript

### User | 2026-06-19T20:27:41.380Z

Review a focused change to a PRISM blueprint-OCR ground-truth library. Read these two files END TO END:
- H:/prism/scripts/lib/cnc-program-gt-lib.mjs
- H:/prism/scripts/lib/cnc-program-gt-lib.test.mjs

CONTEXT / INTENT: This lib extracts ground-truth dimensions from a posted CNC lathe G-code program to score what a VLM OCR pipeline reads off the matching blueprint (the "perfect parts" closed-loop true-test). The NEW change (function `programGtReliability` + new fields on `extractProgramGT`: contourFraction, gtClass, gtReliable, moveProfile) classifies each part's program as STEPPED (program diameters ≈ print callouts → GT reliable) vs CONTOUR (G2/G3 arcs or diagonal G1 ramps dominate → the program sweeps many diameters the print dimensions with a single R/angle → GT is an UNRELIABLE callout answer-key). The downstream consumer (validate-perfect-parts.mjs) will aggregate callout-recall ONLY over reliable (stepped) parts and skip contour parts (reason gt-contour-unreliable), exactly like the existing program-not-nc / program-non-lathe skips. This is an R12 measurement-integrity fix: T-11BT (a radiused punch) was scoring recall=0.21 against 14 program "diameters" that are actually one G3 radius sweep, conflating a metric artifact with real OCR weakness.

VERIFY (grade PASS/FAIL with file:line for each issue P0/P1/P2):
1. CORRECTNESS of the move bucketing: each feed move is bucketed EXACTLY once (arc|diagonal → contour; Z-only → land; X-only → face; neither → ignored). Modal X/Z tracking across rapids vs feeds. The "changed" epsilon logic (COORD_EPS_IN, and the cx===null first-move case). Any move double-counted or mis-bucketed?
2. Is `contourFraction = contourMoves/feedMoves` a sound discriminator? Edge cases: a program with 0 feed moves, all-rapid, comments with coordinates, a feed-rate-only line (F.01 no X/Z), a line restating the modal coordinate (no real move).
3. The gtClass thresholding (CONTOUR_FRACTION_THRESHOLD=0.5, MIN_FEED_MOVES_FOR_CLASS=4) and the "insuffi
... [+1035 chars truncated]

### Assistant | 2026-06-19T20:27:45.842Z

I'll review these two files end to end, then trace the consumer to verify additivity.

### Assistant | 2026-06-19T20:27:46.322Z

[tool_use: Read]

### Assistant | 2026-06-19T20:27:46.445Z

[tool_use: Read]

### User | 2026-06-19T20:27:48.398Z

[tool_result] 1	// scripts/lib/cnc-program-gt-lib.mjs
2	//
3	// U-XRAY-PERFECT-PARTS-TRUETEST — extract objective ground-truth dimensions from a CNC program, to
4	// validate what the OCR pipeline reads off the matching blueprint. The program is the STRONGEST GT
5	// available: it encodes the ACTUAL machined coordinates (what the part is literally cut to), in plain
6	// text, no STEP kernel / GPU / MCP needed. 
... [+22043 chars truncated]

### User | 2026-06-19T20:27:48.603Z

[tool_result] 1	// scripts/lib/cnc-program-gt-lib.test.mjs
2	// Tests the CNC-program ground-truth extractor that validates the OCR pipeline against real machined
3	// geometry. The program is the answer key for the 91-perfect-parts true-test, so a wrong GT here =
4	// either passing a broken OCR (false confidence before the full-corpus run) or failing a correct one.
5	// Fixtures are REAL G-code excerpts (T-11
... [+15032 chars truncated]

### Assistant | 2026-06-19T20:27:51.623Z

Now let me trace the consumer to verify additivity and integration coupling.

### Assistant | 2026-06-19T20:27:52.120Z

[tool_use: Glob]

### Assistant | 2026-06-19T20:27:52.955Z

[tool_use: Grep]

### User | 2026-06-19T20:27:59.668Z

[tool_result] Found 17 files
scripts\lib\cnc-program-gt-lib.test.mjs
scripts\lib\cnc-program-gt-lib.mjs
scripts\validate-perfect-parts.mjs
state\shared\search-plots\_scripts.json
state\shared\TEST_GAP_REPORT.json
state\shared\galaxy-transcript-mining\cad\5c91e392.md
state\shared\galaxy-transcript-mining\cam\5c91e392.md
state\shared\galaxy-transcript-mining\bug-hunting\5c91e392.md
prism-test-6d0595\state\shared\
... [+624 chars truncated]

### User | 2026-06-19T20:28:04.112Z

[tool_result] scripts\validate-perfect-parts.mjs

### Assistant | 2026-06-19T20:28:06.445Z

Let me read the consumer to verify the integration contract.

### Assistant | 2026-06-19T20:28:08.439Z

[tool_use: Grep]

### User | 2026-06-19T20:28:09.960Z

[tool_result] 26-
27-import { runEnsembleOverImage } from "./lib/vision-ensemble-fuse.mjs";
28-import { dimToMm } from "./lib/dimension-set-score.mjs";
29:import { extractProgramGT, scorePartAgainstProgram, isParsableNcText } from "./lib/cnc-program-gt-lib.mjs";
30-import { printCursorKey, parseCursorDoneSet, partitionByResumeCursor } from "./lib/ocr-training-loop-lib.mjs";
31-
32-const REPO_ROOT = resolve(dirn
... [+4878 chars truncated]

### Assistant | 2026-06-19T20:28:14.142Z

The consumer (`validate-perfect-parts.mjs`) does NOT yet consume `gtReliable` / the `gt-contour-unreliable` skip — confirming the intent statement ("the downstream consumer WILL aggregate... WILL skip") is future work, not part of this commit. The lib change is purely additive. Let me verify the existing skip structure around line 153 and confirm where a `gt-contour-unreliable` gate would naturally go.

### Assistant | 2026-06-19T20:28:14.814Z

[tool_use: Read]

### User | 2026-06-19T20:28:16.361Z

[tool_result] 150	        if (!parseable.ok) { rec.skip = "program-not-nc"; rec.skip_detail = parseable.reason; agg.prog_not_nc++; }
151	        else {
152	          const gt = extractProgramGT(progText, { ext });
153	          if (gt.axis !== "lathe") { rec.skip = "program-non-lathe"; rec.program_axis = gt.axis; agg.prog_non_lathe++; }
154	          else {
155	            // 3. OCR the print -- ALL pages, UNIO
... [+3132 chars truncated]

### Assistant | 2026-06-19T20:28:23.812Z

I now have full visibility. Let me trace the move-bucketing logic carefully against the test fixtures, especially the CONTOUR_RADIUS claim that `contourFraction === 1`.

Walking `CONTOUR_RADIUS` (lines 178-194) through `programGtReliability`:
- Feed moves are every G1/G2/G3 line with X or Z. There are 11 feed-coordinate lines (G1 X.4436... through G1 X.185 Z-.0284). Every one has BOTH X and Z present, and each X and Z differs from the prior by >1e-4 → every move is either an arc (G3) or a diagonal G1 (both changed) → `contourMoves === feedMoves` → fraction 1.0. The test assertion at line 239 holds.

Now checking the bucketing edge cases and a subtle modal-tracking concern.

### Assistant | 2026-06-19T20:28:24.580Z

[tool_use: Read]

### User | 2026-06-19T20:28:26.133Z

[tool_result] 141	  for (const line of code.split(/\r?\n/)) {
142	    if (FEED_RE.test(line)) modal = "feed";
143	    else if (RAPID_RE.test(line)) modal = "rapid";
144	    const isArc = ARC_RE.test(line);
145	    const xm = line.match(/X\s*([+-]?(?:\d+\.?\d*|\.\d+))/i);
146	    const zm = line.match(/Z\s*([+-]?(?:\d+\.?\d*|\.\d+))/i);
147	    if (!xm && !zm) continue; // a coordinate-less line (F-only, G-only)
... [+1173 chars truncated]

### Assistant | 2026-06-19T20:29:07.924Z

I have everything needed. Let me do final verification of the two subtle points: the `nToolpathPoints`/contract additivity (the new `programGtReliability(raw, opts)` re-runs the parse on `raw`, which still contains comments — but it strips comments internally on line 135) and the `xChanged` semantics for the very first feed move when a prior G0 already set `cx`.

Key trace findings:

1. **Move bucketing — bucketed exactly once.** Lines 153-159: the if/else-if chain is mutually exclusive across contour/land/face; `arcMoves` is a separate non-exclusive tally (deliberate, documented "arcs are a subset of contour"). No double-count into the geometry buckets. `feedMoves++` happens once per feed line with a coordinate. Correct.

2. **Modal tracking across rapids vs feeds.** `cx`/`cz` update on EVERY coordinate-bearing line (line 161), including rapids — correct, because a G0 approach establishes the position the next feed move departs from. The first feed-move `xChanged` correctly reflects motion from the rapid approach point (in CONTOUR_RADIUS, G0 X.9 sets cx=.9, then G1 X.4436 Z-.005 → xChanged true, zChanged true → contour). Sound.

3. **`cx===null` first-move case.** A coordinate present on the very first move with no prior modal → treated as "changed." Reasonable, and only reachable if no G0 precedes (rare in real posts). Not a bug.

4. **Additivity.** `extractProgramGT` returns the original 8 fields with identical computation (lines 252-260), then appends 4 new fields (lines 261-267). `calloutDimsIn` denominator unchanged. Confirmed byte-for-byte additive.

Now let me note the one real concern I want to flag and one subtle edge case.

VERDICT: PASS

summary: This is a clean, well-scoped additive measurement-integrity change. The move bucketing is correct and mutually exclusive, modal X/Z tracking across rapids/feeds is sound, the existing `extractProgramGT` 8-field contract is preserved byte-for-byte with 4 new fields appended, and the consumer (`validate-perfect-pa
... [+4553 chars truncated]
