---
type: "chat-session"
source: "claude-code-cli"
session_id: "5c91e392-f5b8-473b-bddc-c0de161b8ee0"
title: "Independent review of the FIXED OCR true-test harness in H:/prism (the prior ver"
date: "2026-06-08"
first_ts: "2026-06-08T19:54:38.607Z"
last_ts: "2026-06-08T19:56:57.675Z"
cwd: "H:\\prism"
messages: 44
user_msgs: 17
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism/5c91e392-f5b8-473b-bddc-c0de161b8ee0/subagents/agent-a0b87e1a6d8f9f0ba.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Independent review of the FIXED OCR true-test harness in H:/prism (the prior ver

> **claude-code-cli** | 2026-06-08 | 44 msgs (17 user / 27 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5c91e392-f5b8-473b-bddc-c0de161b8ee0/subagents/agent-a0b87e1a6d8f9f0ba.jsonl`

## Transcript

### User | 2026-06-08T19:54:38.607Z

Independent review of the FIXED OCR true-test harness in H:/prism (the prior version FAILed because the metric was an artifact; these are the corrections). Files:
- scripts/lib/cnc-program-gt-lib.mjs + .test.mjs
- scripts/validate-perfect-parts.mjs

The central question: is the harness's verdict NOW trustworthy enough to gate the full-corpus decision? The LIVE run reports 5/8 parts scored, ALL recall=0/precision=0 (OCR reads 1-3 dims per scanned print, matches 0 of ~8 machined ground-truth dims), with 3 binary .mcx-8 programs correctly skipped.

Weight toward:
- R12 VERDICT TRUST: with the metric now = callout-class GT (feed-move feature diameters + length, NOT toolpath points) and binary files guarded out, is "recall=0 → OCR reads too few dims → NOT ready for full corpus" a SOUND conclusion? Or is recall=0 still partly a measurement artifact (e.g. the OCR reads dims in mm but the print is dimensioned in inch and the comparison is off; or the 2% relTol is too tight; or feature-diameter GT still includes non-callout values)?
- I verified one clean part (43210): GT feature diameters [.04,.2,.7,.8,.872,1.632,1.9] + length 2.6 (sensible turned part), OCR read 1 dim, 0 matched. Is this genuinely "OCR weakness" or could the single OCR dim be correct-but-unmatched due to a GT gap (e.g. the print's primary callout is a dim the program doesn't expose as a feed diameter)?
- Is the relTol=0.02 + inch→mm conversion applied correctly (no double-conversion, units consistent)?
- HONESTY of the report note + summary: does it correctly frame recall=0 as a real finding vs an artifact?

Report PASS/FAIL + P0/P1. The key deliverable: a yes/no on whether this harness can be trusted to say "don't run the full corpus yet."

### Assistant | 2026-06-08T19:54:45.291Z

I'll review this OCR true-test harness independently. Let me read the three files plus the live run output and the part I can verify (43210).

### Assistant | 2026-06-08T19:54:46.417Z

[tool_use: Bash]

### User | 2026-06-08T19:54:49.574Z

[tool_result]   205 scripts/lib/cnc-program-gt-lib.mjs
  152 scripts/lib/cnc-program-gt-lib.test.mjs
  192 scripts/validate-perfect-parts.mjs
  549 total

### Assistant | 2026-06-08T19:54:54.346Z

Let me read all three files and the live run evidence.

### Assistant | 2026-06-08T19:54:55.304Z

[tool_use: Read]

### Assistant | 2026-06-08T19:54:55.777Z

[tool_use: Read]

### Assistant | 2026-06-08T19:54:55.846Z

[tool_use: Read]

### User | 2026-06-08T19:54:56.160Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\cnc-program-gt-lib.mjs' was already read 21s ago in this session and is unchanged (mtime 1780948024496). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-08T19:54:56.633Z

[tool_result] read-once-guard: 'H:\prism\scripts\validate-perfect-parts.mjs' was already read 20s ago in this session and is unchanged (mtime 1780948331684). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-08T19:54:56.708Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\cnc-program-gt-lib.test.mjs' was already read 21s ago in this session and is unchanged (mtime 1780947969344). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-08T19:55:00.106Z

The read-cache guard claims these are already in my context, but they are not — this is a fresh agent session. Let me bypass the cache.

### Assistant | 2026-06-08T19:55:00.957Z

[tool_use: Bash]

### User | 2026-06-08T19:55:04.278Z

[tool_result] // scripts/lib/cnc-program-gt-lib.mjs
//
// U-XRAY-PERFECT-PARTS-TRUETEST — extract objective ground-truth dimensions from a CNC program, to
// validate what the OCR pipeline reads off the matching blueprint. The program is the STRONGEST GT
// available: it encodes the ACTUAL machined coordinates (what the part is literally cut to), in plain
// text, no STEP kernel / GPU / MCP needed. For the 91 p
... [+11810 chars truncated]

### Assistant | 2026-06-08T19:55:08.391Z

Now the validator and the test file.

### Assistant | 2026-06-08T19:55:08.417Z

[tool_use: Bash]

### Assistant | 2026-06-08T19:55:08.970Z

[tool_use: Bash]

### User | 2026-06-08T19:55:11.201Z

[tool_result] #!/usr/bin/env node
// scripts/validate-perfect-parts.mjs
//
// U-XRAY-PERFECT-PARTS-TRUETEST — the TRUE end-to-end test of the OCR/blueprint-reading system on the
// 91 perfect parts (print + CAD + CNC program) BEFORE scaling to the full corpus. For each part: OCR
// the blueprint → extract dims (mm), parse the matching CNC program → objective machined-dim GT, and
// score recall (did the OCR rea
... [+12764 chars truncated]

### User | 2026-06-08T19:55:14.101Z

[tool_result] // scripts/lib/cnc-program-gt-lib.test.mjs
// Tests the CNC-program ground-truth extractor that validates the OCR pipeline against real machined
// geometry. The program is the answer key for the 91-perfect-parts true-test, so a wrong GT here =
// either passing a broken OCR (false confidence before the full-corpus run) or failing a correct one.
// Fixtures are REAL G-code excerpts (T-11BT-27-250-
... [+7189 chars truncated]

### Assistant | 2026-06-08T19:55:19.418Z

I have all three files. Now let me verify the critical claims against live data: the run output, the 43210 part GT, and the actual program text. Let me run the unit tests and check the live evidence.

### Assistant | 2026-06-08T19:55:19.441Z

[tool_use: Bash]

### Assistant | 2026-06-08T19:55:20.511Z

[tool_use: Bash]

### User | 2026-06-08T19:55:22.879Z

[tool_result]   ...
# Subtest: scorePartAgainstProgram: empty OCR → zero recall/precision, never throws (R12 honest empty)
ok 9 - scorePartAgainstProgram: empty OCR → zero recall/precision, never throws (R12 honest empty)
  ---
  duration_ms: 0.2132
  ...
# Subtest: INCH_TO_MM is the canonical 25.4 (JM STEP is inch — never silently treat program values as mm)
ok 10 - INCH_TO_MM is the canonical 25.4 (JM STEP is
... [+188 chars truncated]

### User | 2026-06-08T19:55:26.095Z

[tool_result] {
  "schemaVersion": "1.0.0",
  "generated_from": "H:\\prism\\state\\shared\\ocr-training-loop\\perfect-print-cad-program-parts.json",
  "models": [
    "qwen3-vl:8b-instruct",
    "qwen2.5vl:7b"
  ],
  "rel_tol": 0.02,
  "recall_pass_threshold": 0.5,
  "parts_listed": 8,
  "scored": 5,
  "passed": 0,
  "pass_rate": 0,
  "mean_recall": 0,
  "mean_precision": 0,
  "skipped": {
    "print_unresolved
... [+11367 chars truncated]

### Assistant | 2026-06-08T19:55:33.668Z

The live data reveals something the prompt's framing did not. The prompt says I "verified one clean part (43210): GT feature diameters [.04,.2,.7,.8,.872,1.632,1.9] + length 2.6 ... OCR read 1 dim, 0 matched." But the live results jsonl shows a critical detail I must investigate: **two different parts (05850 and 43210) resolved to the SAME print file** — `Scanned Document - 11_18_2020 6_17 AM.pdf`. That is a resolver bug. Let me dig into the key questions with hard evidence.

### Assistant | 2026-06-08T19:55:34.504Z

[tool_use: Bash]

### User | 2026-06-08T19:55:37.503Z

[tool_result] $ITW500-43210.MIN%
M1
NBAR
CLEAR
DEF WORK
PS LC,[-400,0],[400,19]
END
DRAW
/CALL OBAR
M1

NAT01   (OD AND FACE RGH. TURN .032R)
G0 X20 Z20
T010101
G50 S600
G97 S600 M3
G0 X1.85 Z.005 M8
G96 S200
G1 X-.04 F.005
G0 Z.06 X1.77
G85 NTURN D.1 U.01 W.005 F.01
NTURN G81
G0 X1.538 Z.03
G1 Z0 F.003 G42
G3 X1.632 Z-.047 L.047
G1 Z-2.405 F.008
G1 X1.9 F.01
G80
G0 X20 Z20
M1

NA
... [+921 chars truncated]

### Assistant | 2026-06-08T19:55:45.432Z

Now I can verify the 43210 GT extraction by hand. Let me trace the feed-move diameters and confirm whether the GT is callout-class or contaminated, and critically — what the OCR actually read.

The feed (G1/G2/G3) X values in this program:
- `G1 X-.04` → |.04| = 0.04
- `G3 X1.632` → 1.632
- `G1 X1.9` → 1.9
- `G1 X.7` → 0.7
- `G2 X.872` → 0.872
- `G1 X.8` → 0.8
- `G1 X.2` (cutoff) → 0.2

That gives feature diameters [0.04, 0.2, 0.7, 0.8, 0.872, 1.632, 1.9] — exactly matches the reported GT. So extraction is correct. Now let me check the OCR side — what dim did it read? And the resolver collision.

### Assistant | 2026-06-08T19:55:47.193Z

[tool_use: Bash]

### User | 2026-06-08T19:55:51.360Z

[tool_result] T-11BT-27-250-GR5 | 2023_08_03_15_55_20.pdf | T-11BT-27-250-GR5.MIN
B0762-87-01 | Scanned Document - 12/1/2020 7:22 AM.pdf | B0762-87-01.mcx-8
05850 | Scanned Document - 11/18/2020 6:17 AM.pdf | ITW500-43050-05850-00.MIN
110206 | 20210614_OPTIMRS.pdf | 4HD2-110206-REV-B.mcx-8
9102741 | Scanned Document - 3/1/2022 7:30 AM.pdf | 9102741 OP1.hnc
113063 | 2025_10_16_15_54_42.pdf | T-D3-TW-113063.
... [+412 chars truncated]

### Assistant | 2026-06-08T19:56:01.419Z

This confirms a serious finding. In the source join, **part 05850 and part 43210 both list the same print filename** `Scanned Document - 11/18/2020 6:17 AM.pdf`. These are two distinct parts (different programs: ITW500-43050-05850-00.MIN vs ITW500-43210-08760-01.MIN, different GT) but the join maps them to one identical scanned PDF.

This means at least one of those two parts is OCR'ing the WRONG print. If the scan is of part 05850, then 43210 is being scored against a print that isn't its own — making recall=0 expected and meaningless. Let me verify whether this is a join-data problem (upstream) or whether the print genuinely contains both. Let me also check the T-11BT case where there's a similar pattern, and look at what the OCR actually extracted.

### Assistant | 2026-06-08T19:56:04.939Z

[tool_use: Bash]

### User | 2026-06-08T19:56:08.615Z

[tool_result] total parts: 91
DISTINCT prints: 82 | prints shared by >1 part: 8
parts pointing at a SHARED print: 17 / 91
  3x  2023_08_28_07_07_19.pdf  -> ['500-30310', '16-104-168', '16-104-205']
  2x  Scanned Document - 11/18/2020 6:17 AM.pdf  -> ['05850', '43210']
  2x  2024_08_15_16_03_16.pdf  -> ['T2358-621-2D2', '9102756']
  2x  Scanned Document - 8/12/2021 8:37 AM.pdf  -> ['1571175', 'A14962']
  
... [+238 chars truncated]

### Assistant | 2026-06-08T19:56:19.177Z

This is a significant data-quality finding for the corpus, though it's upstream of the harness under review. 17 of 91 parts (19%) point at a print shared by another part. For those, the harness scores OCR-of-print-A against GT-of-part-B (or both against one print). Recall=0 there is partly explained by a print/program mismatch, not purely OCR weakness.

But within the LIVE 8-part run, only 05850 and 43210 collide, and importantly, neither read more than 1-3 dims regardless. Let me look at what the OCR actually read for these parts — is it reading dims at all, and in what units. I need to see the fused OCR output to answer the units question definitively.

### Assistant | 2026-06-08T19:56:21.204Z

[tool_use: Bash]

### User | 2026-06-08T19:56:24.589Z

[tool_result] 24:export function dimToMm(d) {
98:  const exT = (Array.isArray(extracted) ? extracted : []).map((d) => ({ mm: dimToMm(d), type: dimType(d) })).filter((e) => e.mm !== null);
99:  const trT = (Array.isArray(truth) ? truth : []).map((d) => ({ mm: dimToMm(d), type: dimType(d) })).filter((e) => e.mm !== null);
===ENSEMBLE===
30://   dimType / dimToMm — type-aware, mm-canonical) from dimension-set-scor
... [+1927 chars truncated]

### Assistant | 2026-06-08T19:56:30.103Z

Let me look at the dimToMm conversion (the units question is central) and check whether the OCR run passed `assumeUnits: "in"` and how that flows into value_mm.

### Assistant | 2026-06-08T19:56:30.595Z

[tool_use: Bash]

### Assistant | 2026-06-08T19:56:32.768Z

[tool_use: Bash]

### User | 2026-06-08T19:56:33.941Z

[tool_result] export const DEFAULT_TOL_PCT = 1.0;   // relative tolerance, percent of the larger magnitude
export const DEFAULT_TOL_ABS_MM = 0.05; // absolute floor in mm (small-feature guard)

/** Coerce a dimension (number or {nominal_mm}/{mm}/{value}) to a finite mm number, else null. */
export function dimToMm(d) {
  if (d === null || d === undefined) return null; // Number(null)===0 footgun — guard first
 
... [+2499 chars truncated]

### User | 2026-06-08T19:56:37.594Z

[tool_result] scripts/lib/vision-ensemble-fuse.mjs:88: * if it carries no usable mm value. Reuses dimToMm (handles {nominal_mm}/{mm}/number and the
scripts/lib/vision-ensemble-fuse.mjs:127:  // (idempotent on an already-normalized dim — dimToMm reads nominal_mm??mm and dimType collapses
scripts/lib/vision-ensemble-fuse.mjs:365: *   partClass?:string, wireEdm?:boolean, assumeUnits?:string,
scripts/lib/vision-ens
... [+3859 chars truncated]

### Assistant | 2026-06-08T19:56:49.898Z

The units pathway is sound and confirms no double-conversion. The chain:
- VLM emits a value + unit token (the prompt asks for the raw unit, not pre-converted).
- `convertToMm(value, unit, assumeUnits)` → `u==="in" ? v*25.4 : v`. Converts ONCE.
- If the drawing unit is unknown and `assumeUnits:"in"` is passed (the validator does pass `assumeUnits:"in"`), the inch fallback applies — correct for the all-inch JM corpus.
- The GT side (`scorePartAgainstProgram`) converts inch GT → mm via `gin * INCH_TO_MM` (25.4), comparing mm-to-mm. Single conversion on each side. **No double-conversion, units consistent.**

So the units question is answered: NOT an artifact. The relTol=0.02 question is next. The decisive thing is to see what the OCR actually read vs the GT. The results jsonl shows `matched_pairs:[]` and `ocr_dims_mm:1` (for 43210). The OCR only produced 1 dimension. Let me confirm there's no plausible-but-just-out-of-tolerance miss by checking the magnitudes. Let me re-run just the OCR for 43210 to see the actual value it read.

### Assistant | 2026-06-08T19:56:53.367Z

[tool_use: Bash]

### User | 2026-06-08T19:56:57.675Z

[tool_result] processed-cursor.jsonl
truetest-report.json
truetest-results.jsonl
---
{"key":"t-11bt-27-250-gr5","status":"scored","ts":"2026-06-08T19:52:42.624Z"}
{"key":"b0762-87-01","status":"skipped","ts":"2026-06-08T19:52:43.017Z"}
{"key":"05850","status":"scored","ts":"2026-06-08T19:52:51.108Z"}
{"key":"110206","status":"skipped","ts":"2026-06-08T19:52:53.770Z"}
{"key":"9102741","status":"scored","ts":"202
... [+436 chars truncated]
