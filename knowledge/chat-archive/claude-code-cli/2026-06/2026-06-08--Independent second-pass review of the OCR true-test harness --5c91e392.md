---
type: "chat-session"
source: "claude-code-cli"
session_id: "5c91e392-f5b8-473b-bddc-c0de161b8ee0"
title: "Independent second-pass review of the OCR true-test harness in H:/prism (do NOT "
date: "2026-06-08"
first_ts: "2026-06-08T19:38:09.760Z"
last_ts: "2026-06-08T19:41:32.064Z"
cwd: "H:\\prism"
messages: 43
user_msgs: 16
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism/5c91e392-f5b8-473b-bddc-c0de161b8ee0/subagents/agent-af9b5aab1fee4b023.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Independent second-pass review of the OCR true-test harness in H:/prism (do NOT 

> **claude-code-cli** | 2026-06-08 | 43 msgs (16 user / 27 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5c91e392-f5b8-473b-bddc-c0de161b8ee0/subagents/agent-af9b5aab1fee4b023.jsonl`

## Transcript

### User | 2026-06-08T19:38:09.760Z

Independent second-pass review of the OCR true-test harness in H:/prism (do NOT assume the other reviewer caught everything):
- scripts/lib/cnc-program-gt-lib.mjs + .test.mjs
- scripts/validate-perfect-parts.mjs

This validates blueprint OCR against CNC-program ground truth on the 91 perfect parts, BEFORE a full-corpus run. The program (machined X/Z coords, inch) is the answer key.

Weight toward:
- R12 HONESTY of the verdict: the live run reported mean recall 0.056 / precision 0.5 and 2-of-4 parts print-unresolved. Does the harness HONESTLY surface that (a) it only scored 2 parts, (b) the GT denominator (121 toolpath coords) is NOT the same as print-callout dimensions, (c) a coincidental match to a safe-retract coordinate (X9) inflates precision? Is "precision 0.5" trustworthy or misleading given the X9-false-match found live?
- METRIC VALIDITY: is recall-vs-program-coords a sound measure of "did OCR read the print correctly"? The program has MORE detail than the print (intermediate toolpath points). Could a perfect OCR still score low recall just because the program has points the print never dimensions? This matters: a wrong metric would WRONGLY block (or wrongly pass) the full-corpus decision.
- The INCH→mm convention (JM STEP/programs are inch) — applied consistently, never double-converted?
- Resumability + run-as-main guard match the sibling scripts (blueprint-ocr-training-loop.mjs, find-perfect-parts.mjs)?

Report PASS/FAIL + P0/P1 (file:line). Concise. The key question: is this harness's verdict TRUSTWORTHY enough to gate the full-corpus decision, or does the GT-metric need fixing first?

### Assistant | 2026-06-08T19:38:15.188Z

I'll review the OCR true-test harness independently. Let me start by reading the three files.

### Assistant | 2026-06-08T19:38:15.887Z

[tool_use: Read]

### Assistant | 2026-06-08T19:38:16.120Z

[tool_use: Read]

### User | 2026-06-08T19:38:16.580Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\cnc-program-gt-lib.mjs' was already read 6s ago in this session and is unchanged (mtime 1780947183403). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-08T19:38:16.779Z

[tool_result] read-once-guard: 'H:\prism\scripts\validate-perfect-parts.mjs' was already read 4s ago in this session and is unchanged (mtime 1780947305366). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-08T19:38:22.666Z

Both files are already in my context. Let me re-read them since the read-once-guard says they're available, and examine the test file and sibling scripts for comparison.

### Assistant | 2026-06-08T19:38:22.666Z

[tool_use: Read]

### User | 2026-06-08T19:38:23.278Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\cnc-program-gt-lib.mjs' was already read 13s ago in this session and is unchanged (mtime 1780947183403). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-08T19:38:34.473Z

The guard insists the content is in context, but I don't actually see it. Let me disable the cache and read.

### Assistant | 2026-06-08T19:38:35.313Z

[tool_use: Bash]

### User | 2026-06-08T19:38:38.828Z

[tool_result] // scripts/lib/cnc-program-gt-lib.mjs
//
// U-XRAY-PERFECT-PARTS-TRUETEST — extract objective ground-truth dimensions from a CNC program, to
// validate what the OCR pipeline reads off the matching blueprint. The program is the STRONGEST GT
// available: it encodes the ACTUAL machined coordinates (what the part is literally cut to), in plain
// text, no STEP kernel / GPU / MCP needed. For the 91 p
... [+7379 chars truncated]

### Assistant | 2026-06-08T19:38:42.540Z

Now the validate script and test file.

### Assistant | 2026-06-08T19:38:43.616Z

[tool_use: Bash]

### Assistant | 2026-06-08T19:38:44.376Z

[tool_use: Bash]

### User | 2026-06-08T19:38:47.401Z

[tool_result] #!/usr/bin/env node
// scripts/validate-perfect-parts.mjs
//
// U-XRAY-PERFECT-PARTS-TRUETEST — the TRUE end-to-end test of the OCR/blueprint-reading system on the
// 91 perfect parts (print + CAD + CNC program) BEFORE scaling to the full corpus. For each part: OCR
// the blueprint → extract dims (mm), parse the matching CNC program → objective machined-dim GT, and
// score recall (did the OCR rea
... [+10338 chars truncated]

### User | 2026-06-08T19:38:50.484Z

[tool_result] // scripts/lib/cnc-program-gt-lib.test.mjs
// Tests the CNC-program ground-truth extractor that validates the OCR pipeline against real machined
// geometry. The program is the answer key for the 91-perfect-parts true-test, so a wrong GT here =
// either passing a broken OCR (false confidence before the full-corpus run) or failing a correct one.
// Fixtures are REAL G-code excerpts (T-11BT-27-250-
... [+4787 chars truncated]

### Assistant | 2026-06-08T19:38:56.361Z

Let me verify the key claims: the live report numbers, the sibling scripts' run-as-main guard and resumability pattern, and the dimension/ensemble helpers the score depends on.

### Assistant | 2026-06-08T19:38:57.644Z

[tool_use: Bash]

### Assistant | 2026-06-08T19:38:59.432Z

[tool_use: Bash]

### User | 2026-06-08T19:39:00.846Z

[tool_result] {
  "schemaVersion": "1.0.0",
  "generated_from": "H:\\prism\\state\\shared\\ocr-training-loop\\perfect-print-cad-program-parts.json",
  "models": [
    "qwen3-vl:8b-instruct",
    "qwen2.5vl:7b"
  ],
  "rel_tol": 0.02,
  "recall_pass_threshold": 0.5,
  "parts_listed": 4,
  "scored": 2,
  "passed": 0,
  "pass_rate": 0,
  "mean_recall": 0.0556,
  "mean_precision": 0.5,
  "skipped": {
    "print_unr
... [+500 chars truncated]

### User | 2026-06-08T19:39:03.878Z

[tool_result] {"part_number":"T-11BT-27-250-GR5","customers":["IPTIMASOESOLUT","OPTIMASOL","PTIMASOESOLUTI"],"print":"H:\\PRISM\\Docustrata\\Untitled Folder\\2023_08_03_15_55_20.pdf","program":"H:\\PRISM\\JM DIE\\CNC LATHE\\OMG\\CNC#1#2#3\\CUSTOMERS\\OPTIMAS\\T-11BT-27-250-GR5.MIN","program_axis":"lathe","program_max_dia_in":2,"program_length_in":1.019,"ocr_dims_mm":1,"models_ok":2,"recall":0,"precision":0,"gt_
... [+662 chars truncated]

### Assistant | 2026-06-08T19:39:11.035Z

Now I have the live data. The live results reveal a discrepancy with the prompt's framing. Let me examine the matched pairs and the X9 false match claim more carefully, then check the sibling scripts.

### Assistant | 2026-06-08T19:39:11.244Z

[tool_use: Bash]

### Assistant | 2026-06-08T19:39:13.327Z

[tool_use: Bash]

### User | 2026-06-08T19:39:14.001Z

[tool_result] H:/prism/scripts/blueprint-ocr-training-loop.mjs:50:const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
H:/prism/scripts/blueprint-ocr-training-loop.mjs:342:if (argv[1] && resolve(argv[1]) === fileURLToPath(import.meta.url)) {
H:/prism/scripts/find-perfect-parts.mjs:32:const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
H:/prism/scripts/find-perfect-part
... [+337 chars truncated]

### User | 2026-06-08T19:39:17.388Z

[tool_result] H:/prism/scripts/lib/dimension-set-score.mjs:4:// Given a set of OCR-extracted dimensions and a set of GROUND-TRUTH dimensions
H:/prism/scripts/lib/dimension-set-score.mjs:24:export function dimToMm(d) {
H:/prism/scripts/lib/vision-ensemble-fuse.mjs:109: * Pure: cluster dimensions across N models into agreement groups.
H:/prism/scripts/lib/vision-ensemble-fuse.mjs:185: *        (extraction.dimensi
... [+2579 chars truncated]

### Assistant | 2026-06-08T19:39:26.515Z

Now let me verify the GT denominator issue — the live data shows `gt_count: 121` for the first part, confirming the prompt's concern. Let me check `dimToMm` (imported but I need to verify it's actually used) and the precision=1 X9 false-match claim.

### Assistant | 2026-06-08T19:39:27.644Z

[tool_use: Bash]

### User | 2026-06-08T19:39:31.101Z

[tool_result] 28:import { dimToMm } from "./lib/dimension-set-score.mjs";
--- is dimToMm actually called? ---
export const DEFAULT_TOL_PCT = 1.0;   // relative tolerance, percent of the larger magnitude
export const DEFAULT_TOL_ABS_MM = 0.05; // absolute floor in mm (small-feature guard)

/** Coerce a dimension (number or {nominal_mm}/{mm}/{value}) to a finite mm number, else null. */
export function dimToMm(d)
... [+770 chars truncated]

### Assistant | 2026-06-08T19:39:39.022Z

Confirmed: `dimToMm` is imported (line 28) but never called — the script uses `d.value_mm` directly from the fused ensemble output. A dead import (P2). Now let me verify the X9 false-match precision inflation. The second part (110206) shows `program_max_dia_in: 9`, `precision: 1`, matched pair `{ocrMm: 203.2, programMm: 203.2}`. 203.2mm = 8 inch... wait, 9 × 25.4 = 228.6. Let me check: 203.2 / 25.4 = 8.0. So the matched program value was X8, not X9. Let me confirm the 121-coord and the safe-retract semantics by inspecting whether X9/X8 are real geometry or retract for that mcx-8 program.

### Assistant | 2026-06-08T19:39:41.361Z

[tool_use: Bash]

### User | 2026-06-08T19:39:44.512Z

[tool_result] EXISTS, size 8240643 bytes
--- is it text or binary? ---
H:/prism/JM DIE/Prism JM Die/KEYSTONE SCREW/11-02-06/CAD-CAM/4HD2-110206-REV-B.mcx-8: OpenPGP Public Key
--- first 200 bytes head ---
.............................................................................<.................................<.......................................................................?................

### Assistant | 2026-06-08T19:39:52.843Z

This is a critical finding. The `.mcx-8` file is an 8.2MB **binary Mastercam file** (not G-code text — `file` reports it as binary, content is non-printable). The harness `readFileSync(progPath, "utf8")` read this binary as text and the regex scraped garbage byte-sequences as "coordinates" → that's where `gt_count: 121` and `program_max_dia_in: 9` came from. This is a P0 GT-validity defect. Let me confirm what extensions the harness accepts vs what's a real text program, and check the first part's 121 count.

### Assistant | 2026-06-08T19:39:54.545Z

[tool_use: Bash]

### User | 2026-06-08T19:39:57.417Z

[tool_result] EXISTS size 2921
H:/prism/JM DIE/CNC LATHE/OMG/CNC#1#2#3/CUSTOMERS/OPTIMAS/T-11BT-27-250-GR5.MIN: ASCII text, with CRLF line terminators
--- distinct X coords (incl retract) ---
X-.04
X.0
X.1756
X.1791
X.1794
X.1815
X.1829
X.185
X.190
X.2015
X.205
X.2385
X.2542
X.2549
X.2712
X.2755
X.289
X.3094
X.3174
X.3277
X.3349
X.3443
X.3508
X.3593
X.3653
X.373
X.3785
X.3857
X.3907
X.3973
X.4019
X.408
X.4123
X
... [+80 chars truncated]

### Assistant | 2026-06-08T19:40:06.342Z

This confirms the prompt's central concern with hard evidence. The `.MIN` is a real ASCII program with **dozens of distinct toolpath X coords** (.1756, .1791, .1794, .1815... — these are intermediate toolpath points along a contour, NOT print callouts). After dedup the harness counted `gt_count: 121` distinct machined values. The print dimensions a drawing actually calls out for this part are perhaps 5-10. So a perfect OCR is mathematically capped at ~5-8% recall against a 121-coordinate denominator. This is exactly the metric-validity flaw: **recall-vs-program-coords measures the wrong thing.**

Let me confirm the max diameter and the X20 retract handling, and verify the 2-inch maxDia for part 1 (the prompt says max diameter is real geometry).

### Assistant | 2026-06-08T19:40:09.021Z

[tool_use: Bash]

### User | 2026-06-08T19:40:11.889Z

[tool_result] === X values >= 1in (potential safe-retract or real) ===
1.0
2
20
50
=== max X under 10in (what maxDiameterIn would pick) ===
2

### Assistant | 2026-06-08T19:40:20.601Z

This exposes another defect. The `program_max_dia_in: 2` came from an `X2` token — but there's also `X50` and `X20` (safe retracts, correctly dropped by `|v|<10`). However `X2` survives the filter. Is X2 a real 2-inch diameter on this part, or another retract/clearance move? A `.879` OD part (from the test fixture) would not have a 2-inch turned diameter. The `|v|<10` threshold is arbitrary — it catches X20/X50 but lets X2 through, and X2 is almost certainly an intermediate/clearance move, not the part envelope. So `maxDiameterIn` is itself unreliable.

I have enough hard evidence. Let me do two final checks: the `--neutral-step-only`/sort logic edge case and whether the report's `note` honestly discloses the denominator problem, plus run the test suite to confirm the timeout warning isn't a real failure.

### Assistant | 2026-06-08T19:40:23.094Z

[tool_use: Bash]

### User | 2026-06-08T19:40:26.051Z

[tool_result]   ...
# Subtest: scorePartAgainstProgram: empty OCR → zero recall/precision, never throws (R12 honest empty)
ok 7 - scorePartAgainstProgram: empty OCR → zero recall/precision, never throws (R12 honest empty)
  ---
  duration_ms: 0.1408
  ...
# Subtest: INCH_TO_MM is the canonical 25.4 (JM STEP is inch — never silently treat program values as mm)
ok 8 - INCH_TO_MM is the canonical 25.4 (JM STEP is 
... [+183 chars truncated]

### Assistant | 2026-06-08T19:41:32.064Z

All 8 tests pass cleanly (the earlier `test_timeout` triage was a false alarm from a different command). The tests are real reference-value tests (R9-compliant) — but they only exercise the *clean fixture* (`LATHE_MIN`, a 13-line hand-curated excerpt). They never test the real failure modes: a binary `.mcx-8` read as utf8, or a real full-length program with 100+ toolpath points. The tests pass because they validate the pure functions against a sanitized input, not against the corpus reality that broke the live run.

I have all the evidence I need. Here is my independent verdict.

---

## VERDICT: FAIL — the harness's verdict is NOT trustworthy enough to gate the full-corpus decision. The GT metric must be fixed first.

The code is clean, the pure functions are correct, and the test suite is honest (R9 reference values, 8/8 pass). But the **metric it computes does not measure "did OCR read the print correctly"** — and the live run's numbers are corrupted by two GT-source defects the harness does not detect or disclose. Shipping the full-corpus run on this metric would produce a confidently-wrong verdict.

### P0 findings (block the full-corpus decision)

**P0-1 — Binary program files are read as utf8 and scraped for fake coordinates.** `validate-perfect-parts.mjs:` the resolver matched `4HD2-110206-REV-B.mcx-8` for part `110206`. I verified that file: it is an **8.24 MB binary Mastercam file** (`file` → `OpenPGP Public Key` / non-printable bytes), not G-code text. `readFileSync(progPath, "utf8")` (validate-perfect-parts.mjs, in the `else` branch ~line with `const progText = readFileSync(progPath, "utf8")`) read the binary as text; `extractProgramGT` then scraped byte-sequences that happen to match `ADDR_RE` → `gt_count: 9`, `program_max_dia_in: 9`, and the `203.2mm` "match." **None of those are real machined coordinates.** `classifyProgramAxis` even labeled it `"lathe"` (a G50/G96/G7x byte appeared somewhere in 8 MB of binary). The harness has no text/binary guard an
... [+8241 chars truncated]
