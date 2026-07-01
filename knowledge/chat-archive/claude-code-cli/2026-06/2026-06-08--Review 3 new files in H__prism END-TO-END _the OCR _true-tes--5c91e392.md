---
type: "chat-session"
source: "claude-code-cli"
session_id: "5c91e392-f5b8-473b-bddc-c0de161b8ee0"
title: "Review 3 new files in H:/prism END-TO-END (the OCR \"true-test\" harness validatin"
date: "2026-06-08"
first_ts: "2026-06-08T19:38:00.387Z"
last_ts: "2026-06-08T19:40:33.544Z"
cwd: "H:\\prism"
messages: 34
user_msgs: 14
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/5c91e392-f5b8-473b-bddc-c0de161b8ee0/subagents/agent-a39fff63bb9ffca83.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Review 3 new files in H:/prism END-TO-END (the OCR "true-test" harness validatin

> **claude-code-cli** | 2026-06-08 | 34 msgs (14 user / 20 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5c91e392-f5b8-473b-bddc-c0de161b8ee0/subagents/agent-a39fff63bb9ffca83.jsonl`

## Transcript

### User | 2026-06-08T19:38:00.387Z

Review 3 new files in H:/prism END-TO-END (the OCR "true-test" harness validating blueprint OCR against CNC-program ground truth):
- scripts/lib/cnc-program-gt-lib.mjs (extractProgramGT/classifyProgramAxis/dimMatchesProgram/scorePartAgainstProgram — parses lathe G-code X=diameter/Z=length, scores OCR dims vs machined coords)
- scripts/lib/cnc-program-gt-lib.test.mjs (8 tests, real Okuma .MIN fixture)
- scripts/validate-perfect-parts.mjs (runner: resolve print+program on disk → OCR print → score vs program GT; resumable)

Focus:
1. CORRECTNESS of extractProgramGT: it filters safe-retracts via |value|<10in. LIVE FINDING: a Fanuc program used X9/Z9 as safe positions which slipped past the <10 filter and polluted maxDiameterIn=9/lengthIn=9 (a real part isn't 9in). Is the <10 threshold the right guard? Should it instead drop values that appear ONLY in G0 rapid lines, or use a percentile? Flag the precision of the GT.
2. The GT count problem: a lathe program has ~121 coordinate points (every G1 move) but a print calls out ~9 dimensions. scorePartAgainstProgram dedups to distinct rounded values — is the recall denominator meaningful, or inflated by intermediate toolpath points?
3. R9 — do the 8 tests fail if logic breaks? Real Okuma fixture values correct?
4. Runner: resumable cursor reuse correct? findOne PowerShell glob safe? Run-as-main guard present? maxTimeSec respected?

The harness LIVE-ran: 2/4 parts scored (2 print-unresolved), mean recall 0.056, precision 0.5 — exposing that real-scan OCR reads few dims. Report PASS/FAIL + P0/P1 (file:line). Concise — this is a DIAGNOSTIC tool, judge it as such (not production CNC code).

### Assistant | 2026-06-08T19:38:09.357Z

I'll review these 3 files end-to-end. Let me start by reading all of them.

### Assistant | 2026-06-08T19:38:09.838Z

[tool_use: Read]

### Assistant | 2026-06-08T19:38:10.667Z

[tool_use: Read]

### User | 2026-06-08T19:38:10.881Z

[tool_result] 1	// scripts/lib/cnc-program-gt-lib.mjs
2	//
3	// U-XRAY-PERFECT-PARTS-TRUETEST — extract objective ground-truth dimensions from a CNC program, to
4	// validate what the OCR pipeline reads off the matching blueprint. The program is the STRONGEST GT
5	// available: it encodes the ACTUAL machined coordinates (what the part is literally cut to), in plain
6	// text, no STEP kernel / GPU / MCP needed. 
... [+7844 chars truncated]

### Assistant | 2026-06-08T19:38:11.613Z

[tool_use: Read]

### User | 2026-06-08T19:38:11.829Z

[tool_result] 1	// scripts/lib/cnc-program-gt-lib.test.mjs
2	// Tests the CNC-program ground-truth extractor that validates the OCR pipeline against real machined
3	// geometry. The program is the answer key for the 91-perfect-parts true-test, so a wrong GT here =
4	// either passing a broken OCR (false confidence before the full-corpus run) or failing a correct one.
5	// Fixtures are REAL G-code excerpts (T-11
... [+5116 chars truncated]

### User | 2026-06-08T19:38:12.645Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/validate-perfect-parts.mjs
3	//
4	// U-XRAY-PERFECT-PARTS-TRUETEST — the TRUE end-to-end test of the OCR/blueprint-reading system on the
5	// 91 perfect parts (print + CAD + CNC program) BEFORE scaling to the full corpus. For each part: OCR
6	// the blueprint → extract dims (mm), parse the matching CNC program → objective machined-dim GT, and
7	// score recall (d
... [+10907 chars truncated]

### Assistant | 2026-06-08T19:38:19.177Z

Now let me verify the key claims. Let me check the live findings, the Fanuc X9/Z9 leak, the dependency libraries used, and run the tests.

### Assistant | 2026-06-08T19:38:22.082Z

[tool_use: Bash]

### Assistant | 2026-06-08T19:38:22.087Z

[tool_use: Bash]

### User | 2026-06-08T19:38:25.053Z

[tool_result]   ...
# Subtest: dimMatchesProgram: an OCR'd mm dim matches a program inch coord within tolerance
ok 5 - dimMatchesProgram: an OCR'd mm dim matches a program inch coord within tolerance
  ---
  duration_ms: 0.1725
  ...
# Subtest: scorePartAgainstProgram: recall = GT coords corroborated by OCR; precision = OCR dims that match
ok 6 - scorePartAgainstProgram: recall = GT coords corroborated by OCR; 
... [+644 chars truncated]

### User | 2026-06-08T19:38:27.729Z

[tool_result] Exit code 1
---RESULTS---

### Assistant | 2026-06-08T19:38:35.069Z

8/8 tests pass. The report path doesn't exist where I looked. Let me find the actual output location and verify the live findings, plus check the dependency contracts.

### Assistant | 2026-06-08T19:38:35.077Z

[tool_use: Bash]

### Assistant | 2026-06-08T19:38:36.295Z

[tool_use: Grep]

### User | 2026-06-08T19:38:37.695Z

[tool_result] 222:export function printCursorKey(pngOrPath) {
223-  const s = String(pngOrPath == null ? "" : pngOrPath).trim();
224-  if (!s) return null;
225-  const fwd = s.split("\\").join("/");
226-  const base = fwd.slice(fwd.lastIndexOf("/") + 1);
227-  const key = base.trim().toLowerCase();
228-  return key || null;
229-}
230-
--
239:export function parseCursorDoneSet(text) {
240-  const done = new Set(
... [+730 chars truncated]

### User | 2026-06-08T19:38:38.523Z

[tool_result] state/shared/ocr-training-loop/truetest
state/shared/ocr-training-loop/truetest/truetest-report.json
state/shared/ocr-training-loop/truetest/truetest-results.jsonl
---DIR---
processed-cursor.jsonl
truetest-report.json
truetest-results.jsonl

### Assistant | 2026-06-08T19:38:44.344Z

Now let me verify the live report and the critical dependency contracts (the `dimToMm`/`value_mm` field and the cursor-key mismatch I suspect in the runner).

### Assistant | 2026-06-08T19:38:44.574Z

[tool_use: Read]

### Assistant | 2026-06-08T19:38:45.065Z

[tool_use: Read]

### Assistant | 2026-06-08T19:38:45.169Z

[tool_use: Read]

### User | 2026-06-08T19:38:45.908Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "generated_from": "H:\\prism\\state\\shared\\ocr-training-loop\\perfect-print-cad-program-parts.json",
4	  "models": [
5	    "qwen3-vl:8b-instruct",
6	    "qwen2.5vl:7b"
7	  ],
8	  "rel_tol": 0.02,
9	  "recall_pass_threshold": 0.5,
10	  "parts_listed": 4,
11	  "scored": 2,
12	  "passed": 0,
13	  "pass_rate": 0,
14	  "mean_recall": 0.0556,
15	  "mean_precision"
... [+560 chars truncated]

### User | 2026-06-08T19:38:46.284Z

[tool_result] 1	{"part_number":"T-11BT-27-250-GR5","customers":["IPTIMASOESOLUT","OPTIMASOL","PTIMASOESOLUTI"],"print":"H:\\PRISM\\Docustrata\\Untitled Folder\\2023_08_03_15_55_20.pdf","program":"H:\\PRISM\\JM DIE\\CNC LATHE\\OMG\\CNC#1#2#3\\CUSTOMERS\\OPTIMAS\\T-11BT-27-250-GR5.MIN","program_axis":"lathe","program_max_dia_in":2,"program_length_in":1.019,"ocr_dims_mm":1,"models_ok":2,"recall":0,"precision":0,"g
... [+673 chars truncated]

### User | 2026-06-08T19:38:46.408Z

[tool_result] 1	{"key":"t-11bt-27-250-gr5","status":"scored","ts":"2026-06-08T19:36:54.643Z"}
2	{"key":"b0762-87-01","status":"skipped","ts":"2026-06-08T19:36:55.060Z"}
3	{"key":"05850","status":"skipped","ts":"2026-06-08T19:36:55.422Z"}
4	{"key":"110206","status":"scored","ts":"2026-06-08T19:37:02.428Z"}
5	

### Assistant | 2026-06-08T19:38:55.405Z

The live data is highly informative. Critical findings from the actual output:

1. **The X9/Z9 leak is REAL and confirmed**: line 4 of results — part `110206` shows `program_max_dia_in:9, program_length_in:9` with `gt_count:9`. The `<10` filter let X9/Z9 through. This is a `.mcx-8` Mastercam file, not even lathe G-code.
2. **The X20/Z20 part also has a problem**: part `T-11BT-27-250-GR5` shows `program_max_dia_in:2` — but that program's actual max turned diameter is ~0.95in (per the test fixture excerpt). A `2` got through, meaning there's an X2.x rapid/clearance value the filter doesn't catch. And `gt_count:121` confirms finding #2 (toolpath-point inflation).

Let me verify the dependency contracts and the cursor-key consistency bug I suspect.

### Assistant | 2026-06-08T19:38:56.419Z

[tool_use: Grep]

### Assistant | 2026-06-08T19:38:56.420Z

[tool_use: Read]

### User | 2026-06-08T19:38:57.600Z

[tool_result] 284	export function partitionByResumeCursor(worklist, done) {
285	  const list = Array.isArray(worklist) ? worklist : [];
286	  const doneSet = done instanceof Set ? done : new Set();
287	  const todo = [];
288	  const skipped = [];
289	  const seen = new Set();
290	  let skippedDone = 0, skippedNullKey = 0;
291	  for (const item of list) {
292	    const k = printCursorKey(item);
293	    if (!k) {
... [+336 chars truncated]

### User | 2026-06-08T19:38:57.912Z

[tool_result] 109: * Pure: cluster dimensions across N models into agreement groups.
185: *        (extraction.dimensions is the per-model dim list — the parseVisionResponse shape).
191: *   dimensions: Array<object>,            // fused, corroboration-desc
208:    dims: Array.isArray(r.extraction.dimensions) ? r.extraction.dimensions : [],
214:  const dimensions = clusters.map((cl) => {
219:    const value_mm 
... [+1225 chars truncated]

### Assistant | 2026-06-08T19:39:04.815Z

Now I understand the full picture. Let me verify two more things: the `runEnsembleOverImage` return shape (`res.fused` vs `res.dimensions`) and the `maxTimeSec` handling, since the runner reads `res.fused.dimensions` and `res.models_ok`.

### Assistant | 2026-06-08T19:39:05.891Z

[tool_use: Grep]

### User | 2026-06-08T19:39:07.375Z

[tool_result] 40://   ocrImageWithModelAsync · runEnsembleOverImage
41-
42-import {
43-  dimMatches,
--
105:  return { type, mm, confidence, raw_text };
106-}
107-
108-/**
--
191: *   dimensions: Array<object>,            // fused, corroboration-desc
192- *   ambiguous_pairs: Array<object>,       // same-type clusters within conflictBand (operator-disambiguate)
193- *   summary: object,
194- *   per_model: Arra
... [+2452 chars truncated]

### Assistant | 2026-06-08T19:40:33.544Z

The `runEnsembleOverImage` contract is confirmed: returns `{ fused, per_model_runs, models_ok, models_failed, image }` and `fused.dimensions` is the array with `value_mm`. The runner reads these correctly. `maxTimeSec` is passed through to the per-model curl `--max-time` (per-model, not a global cap — relevant detail).

I have everything I need. Let me compile the report.

## Code Quality Analysis Report — OCR True-Test Harness

### Summary
- Verdict: **PASS (with P1 corrections)** — the harness is correct *as a diagnostic*; it is wired, runs live, is resumable, and its tests genuinely fail on broken logic. But the GT precision is materially weaker than the code comments claim, and the live run already exposed it.
- Files analyzed: 3 (lib + test + runner)
- Tests: 8/8 pass; R9-valid (assertions are tied to real fixture math, not stubs)
- Live evidence: `truetest-report.json` scored 2/4, mean recall 0.0556, precision 0.5 — and the results jsonl directly confirms the two GT-precision defects below.

---

### Finding 1 — The `<10in` safe-retract filter is the wrong guard (P1, correctness)

**`cnc-program-gt-lib.mjs:69-71`** — `const partX = xs.filter((v) => Math.abs(v) < 10)`.

The operator's X9/Z9 hypothesis is **confirmed by live data, not just plausible**. `truetest-results.jsonl:4` (part `110206`): `program_max_dia_in:9, program_length_in:9`. A 9in "diameter" and 9in "length" on the same part is physically incoherent (and that file is a `.mcx-8` Mastercam source, see Finding 5). The `<10` magnitude filter passed X9/Z9 through verbatim.

Worse, **the first scored part also leaks**: `T-11BT-27-250-GR5` reports `program_max_dia_in:2`, but the test fixture for that exact program (`test.mjs:16-31`, the real `.MIN` excerpt) tops out at `X.95`. So the on-disk full program contains an `X~2` rapid/clearance move that the `<10` filter does not catch and that the 0.95 envelope test never sees. The unit test asserts `maxDiameterIn === 0.95` against a *truncated* excerpt; the r
... [+10916 chars truncated]
