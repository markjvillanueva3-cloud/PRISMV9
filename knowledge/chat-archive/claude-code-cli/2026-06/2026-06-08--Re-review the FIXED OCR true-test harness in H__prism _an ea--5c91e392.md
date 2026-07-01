---
type: "chat-session"
source: "claude-code-cli"
session_id: "5c91e392-f5b8-473b-bddc-c0de161b8ee0"
title: "Re-review the FIXED OCR true-test harness in H:/prism (an earlier review FAILed "
date: "2026-06-08"
first_ts: "2026-06-08T19:54:27.637Z"
last_ts: "2026-06-08T19:56:27.665Z"
cwd: "H:\\prism"
messages: 35
user_msgs: 14
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/5c91e392-f5b8-473b-bddc-c0de161b8ee0/subagents/agent-a747ee13d2daf16ef.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Re-review the FIXED OCR true-test harness in H:/prism (an earlier review FAILed 

> **claude-code-cli** | 2026-06-08 | 35 msgs (14 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5c91e392-f5b8-473b-bddc-c0de161b8ee0/subagents/agent-a747ee13d2daf16ef.jsonl`

## Transcript

### User | 2026-06-08T19:54:27.637Z

Re-review the FIXED OCR true-test harness in H:/prism (an earlier review FAILed it; these are the fixes). Read END-TO-END:
- scripts/lib/cnc-program-gt-lib.mjs (NEW: isParsableNcText binary/CAM guard; extractProgramGT now FEED-move-aware — only G1/G2/G3 endpoint diameters are GT, G0 rapids excluded; calloutDimsIn = feature diameters + length; nToolpathPoints is context-only)
- scripts/lib/cnc-program-gt-lib.test.mjs (10 tests)
- scripts/validate-perfect-parts.mjs (runner: isParsableNcText guard + lathe-axis gate + findOne sanitizes display-name "/"→"_" for the on-disk form + no-basename fix)

Verify the prior FAIL findings are FIXED:
1. P0-1 (binary .mcx-8 read as G-code → garbage): does isParsableNcText reject .mcx-* + binary content? Does the runner skip them (program-not-nc)? LIVE: 3 .mcx-8 correctly skipped.
2. P0-3 (recall denominator was 121 toolpath points): is the denominator now calloutDimsIn (feed diameters + length), with toolpath points surfaced separately? Does extractProgramGT exclude G0 rapids via line-modal tracking?
3. The findOne resolver: does it correctly find files whose display name has "/" or ":" (sanitized to "_" on disk)? The basename() bug (split on "/") — fixed?
4. R9: do the 10 tests fail if logic breaks? Real Okuma fixture values correct? Is the feed-vs-rapid distinction tested (G0 X.879 NOT a feature diameter)?

NOTE one residual: part 9102741's program is a 59K-point probing program → calloutGT=1214 (still noisy — feed diameters over-counted on a huge multi-op program). Is that a P1 or acceptable edge?

LIVE: 5/8 scored, all recall=0 (real-scan OCR reads 1-3 dims, matches 0 machined GT) — a genuine OCR weakness, not a metric artifact. Report PASS/FAIL + P0/P1 (file:line). Concise — diagnostic tool.

### Assistant | 2026-06-08T19:54:34.296Z

I'll re-review the fixed OCR true-test harness end-to-end. Let me read the three files.

### Assistant | 2026-06-08T19:54:34.353Z

[tool_use: Read]

### Assistant | 2026-06-08T19:54:35.332Z

[tool_use: Read]

### Assistant | 2026-06-08T19:54:35.411Z

[tool_use: Read]

### User | 2026-06-08T19:54:35.572Z

[tool_result] 1	// scripts/lib/cnc-program-gt-lib.mjs
2	//
3	// U-XRAY-PERFECT-PARTS-TRUETEST — extract objective ground-truth dimensions from a CNC program, to
4	// validate what the OCR pipeline reads off the matching blueprint. The program is the STRONGEST GT
5	// available: it encodes the ACTUAL machined coordinates (what the part is literally cut to), in plain
6	// text, no STEP kernel / GPU / MCP needed. 
... [+12527 chars truncated]

### User | 2026-06-08T19:54:36.885Z

[tool_result] 1	// scripts/lib/cnc-program-gt-lib.test.mjs
2	// Tests the CNC-program ground-truth extractor that validates the OCR pipeline against real machined
3	// geometry. The program is the answer key for the 91-perfect-parts true-test, so a wrong GT here =
4	// either passing a broken OCR (false confidence before the full-corpus run) or failing a correct one.
5	// Fixtures are REAL G-code excerpts (T-11
... [+7694 chars truncated]

### User | 2026-06-08T19:54:37.068Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/validate-perfect-parts.mjs
3	//
4	// U-XRAY-PERFECT-PARTS-TRUETEST — the TRUE end-to-end test of the OCR/blueprint-reading system on the
5	// 91 perfect parts (print + CAD + CNC program) BEFORE scaling to the full corpus. For each part: OCR
6	// the blueprint → extract dims (mm), parse the matching CNC program → objective machined-dim GT, and
7	// score recall (d
... [+13429 chars truncated]

### Assistant | 2026-06-08T19:54:41.923Z

Let me verify the prior FAIL findings against live data. I'll check the toolpath-points / probing-program edge case (part 9102741), and run the test suite.

### Assistant | 2026-06-08T19:54:44.267Z

[tool_use: Bash]

### Assistant | 2026-06-08T19:54:44.532Z

[tool_use: Grep]

### User | 2026-06-08T19:54:47.444Z

[tool_result]   ...
# Subtest: scorePartAgainstProgram: recall over CALLOUT-class GT (feature dias+length), NOT toolpath points
ok 8 - scorePartAgainstProgram: recall over CALLOUT-class GT (feature dias+length), NOT toolpath points
  ---
  duration_ms: 0.2511
  ...
# Subtest: scorePartAgainstProgram: empty OCR → zero recall/precision, never throws (R12 honest empty)
ok 9 - scorePartAgainstProgram: empty OCR → z
... [+433 chars truncated]

### User | 2026-06-08T19:54:48.938Z

[tool_result] 222:export function printCursorKey(pngOrPath) {
239:export function parseCursorDoneSet(text) {
248:    const k = printCursorKey(obj.key != null ? obj.key : obj.image != null ? obj.image : obj.part);
264:  const key = printCursorKey(a && a.key);
281: * @param {Set<string>} done   from parseCursorDoneSet
284:export function partitionByResumeCursor(worklist, done) {
292:    const k = printCursorKey(i
... [+5 chars truncated]

### Assistant | 2026-06-08T19:54:55.510Z

All 10 tests pass. Let me verify the R9 quality (do tests fail when logic breaks), and validate the residual probing-program edge against the actual part. Let me check the resume-cursor lib correctness and probe a real probing program.

### Assistant | 2026-06-08T19:54:56.446Z

[tool_use: Read]

### User | 2026-06-08T19:54:57.529Z

[tool_result] 215	 * corpus stores one drawing at many paths) must collapse to one key so a restart never re-OCRs a
216	 * print just because it was reached via a different path. Uses basename (lowercased) — the same
217	 * de-dup key build-blueprint-ocr-worklist.mjs already uses for the worklist (single source of the
218	 * identity convention). Empty/blank → null (caller treats as "always process", never curs
... [+3883 chars truncated]

### Assistant | 2026-06-08T19:55:05.027Z

[tool_use: Bash]

### User | 2026-06-08T19:55:08.074Z

[tool_result] [rtk: batch file arguments are invalid]

### Assistant | 2026-06-08T19:55:12.851Z

The rtk wrapper choked on the inline `-e` script (batch-arg quoting), not a real failure. Let me run the probe directly with `command node` to bypass, and verify the residual probing-program edge with a real probing program from the corpus.

### Assistant | 2026-06-08T19:55:18.512Z

[tool_use: Bash]

### User | 2026-06-08T19:55:21.652Z

[tool_result] feature dias: [0.5] (expect [0.5])
callout: [0.5]
arc dias: [0.4,0.6] (expect [0.4,0.6])
packed: [] (expect [0.5])

### Assistant | 2026-06-08T19:55:22.300Z

[tool_use: Bash]

### User | 2026-06-08T19:55:25.601Z

[tool_result] results rows: 8
T-11BT-27-250-GR5 | skip=- axis=lathe calloutGT=28 toolpath=224 recall=0 dims=2
B0762-87-01 | skip=program-not-nc axis=- calloutGT=- toolpath=- recall=- dims=-
05850 | skip=- axis=lathe calloutGT=8 toolpath=68 recall=0 dims=1
110206 | skip=program-not-nc axis=- calloutGT=- toolpath=- recall=- dims=-
9102741 | skip=- axis=lathe calloutGT=1214 toolpath=59417 recall=0 dims=3
113063 | 
... [+201 chars truncated]

### Assistant | 2026-06-08T19:55:30.363Z

Found a real issue. The `packed` token test returned `[]` — `G1X.5Z-.3F.005` extracted NO feature diameter. Let me investigate this, since the file header comment explicitly claims tolerance of "no-space packing (X.95Z.005)".

### Assistant | 2026-06-08T19:55:34.695Z

[tool_use: Bash]

### User | 2026-06-08T19:55:37.854Z

[tool_result] FEED match: false ( after G1 needs word boundary; G1X has no boundary)
packed line tested: G1X.5Z-.3F.005
spaced FEED match: true

### Assistant | 2026-06-08T19:55:44.662Z

Confirmed the root cause. `FEED_RE = /\bG0?[123]\b/` requires a trailing word boundary after the motion digit. In packed G-code `G1X.5Z-.3`, the `1` is immediately followed by `X` — both word characters — so there's no `\b`, the line fails `FEED_RE`, modal stays `rapid`, and the feed diameter is dropped. Same for `RAPID_RE`.

This is a real bug, but I need to assess its severity. Let me check whether the JM/Okuma corpus actually uses packed motion words, since the prior fixture (`LATHE_MIN`, real Okuma) uses spaced form. Let me also confirm the residual 9102741 probing-program edge and the `program-not-nc` skips are legitimate.

### Assistant | 2026-06-08T19:55:51.463Z

[tool_use: Bash]

### User | 2026-06-08T19:55:55.475Z

[tool_result] H:\PRISM\JM DIE\CNC LATHE\ACME\PRISM_UPGRADED\Okuma_GENOS_L200E-M\11-10715-0-A.nc packedFeed=0 spacedFeed=12
H:\PRISM\JM DIE\CNC LATHE\ACME\PRISM_UPGRADED\Okuma_GENOS_L200E-M\11-10715-0-B.nc packedFeed=0 spacedFeed=10
H:\PRISM\JM DIE\CNC LATHE\ACME\PRISM_UPGRADED\Okuma_GENOS_L200E-M\750-FEEDROLL-1065.nc packedFeed=0 spacedFeed=20
H:\PRISM\JM DIE\CNC LATHE\ACME\PRISM_UPGRADED\Okuma_GENOS_L200E-M\A-
... [+540 chars truncated]

### Assistant | 2026-06-08T19:56:04.675Z

Good empirical finding: the real JM Okuma corpus uses **spaced** motion words (98 spaced, 0 packed in an 8-file sample). So the packed-token gap in `FEED_RE`/`RAPID_RE` does **not** affect the live JM lathe corpus — the modal classifier works for every real program tested. But the `extractProgramGT` header comment explicitly advertises "no-space packing (X.95Z.005)" tolerance, and the original `LATHE_MIN` fixture even contains `G0 G96 X.95 Z.005` (spaced). The packed claim is now only true for the *address parser* (`ADDR_RE`), not the *modal line classifier*.

Let me sample whether the `LATHE_MIN` fixture's canned-cycle pattern (`NTURN G81 ... G0 X.879`) is correctly handled, and confirm the 3 `program-not-nc` skips are genuinely binary/CAM.

### Assistant | 2026-06-08T19:56:07.069Z

[tool_use: Bash]

### User | 2026-06-08T19:56:12.982Z

[tool_result] .mcx-8     H:\PRISM\JM DIE\CNC MILL HAAS\AIR INDUSTRIES COMPANY\B0762-87-01.mcx-8
2          H:\PRISM\JM DIE\CNC MILL HAAS\SPS TECHNOLOGIES\B0762-86-02
1          H:\PRISM\JM DIE\FUSION CAD AND CAM FILES\JM\OKUMA(1756902819851)\AIR INDUSTRIES\B0762-87-01
E          H:\PRISM\JM DIE\FUSION CAD AND CAM FILES\JM\OKUMA(1756902819851)\AIR INDUSTRIES\B0762-87-01\B0762-87-01 GROOVE
.f3d       H:\PRISM\JM 
... [+966 chars truncated]

### Assistant | 2026-06-08T19:56:23.157Z

Confirmed: B0762-87-01 resolves to a `.mcx-8` (Mastercam binary) — correctly skipped as `program-not-nc`. The P0-1 binary guard is working on live data: all 3 `program-not-nc` skips are genuine CAM/binary sources, not false rejects. Now let me verify the findOne `/`-sanitization resolver path and confirm the 9102741 probing edge is the only noisy one.

### Assistant | 2026-06-08T19:56:24.343Z

[tool_use: Bash]

### User | 2026-06-08T19:56:27.665Z

[tool_result] OK "Scanned Document - 12/1/2020 7:22 AM.pdf" -> "Scanned Document - 12_1_2020 7_22 AM.pdf"
OK "plain.pdf" -> "plain.pdf"
OK "a:b/c*d?.nc" -> "a_b_c_d_.nc"
basename of "12/1/2020 7:22 AM.pdf" = "2020 7:22 AM.pdf" (would lose the date prefix — confirms the bug)
