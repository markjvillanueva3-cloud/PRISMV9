---
type: "chat-session"
source: "claude-code-cli"
session_id: "5c91e392-f5b8-473b-bddc-c0de161b8ee0"
title: "Re-review the OCR true-test harness in H:/prism after P0 fixes (a prior review F"
date: "2026-06-09"
first_ts: "2026-06-09T01:54:33.754Z"
last_ts: "2026-06-09T01:58:34.376Z"
cwd: "H:\\prism"
messages: 40
user_msgs: 15
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/5c91e392-f5b8-473b-bddc-c0de161b8ee0/subagents/agent-a87b63cfcfc27ca82.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Re-review the OCR true-test harness in H:/prism after P0 fixes (a prior review F

> **claude-code-cli** | 2026-06-09 | 40 msgs (15 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5c91e392-f5b8-473b-bddc-c0de161b8ee0/subagents/agent-a87b63cfcfc27ca82.jsonl`

## Transcript

### User | 2026-06-09T01:54:33.754Z

Re-review the OCR true-test harness in H:/prism after P0 fixes (a prior review FAILed it). Read END-TO-END:
- scripts/lib/cnc-program-gt-lib.mjs + .test.mjs (10 tests)
- scripts/validate-perfect-parts.mjs

The prior FAIL had 3 P0s, now claimed fixed:
1. P0-1 (binary .mcx-8 read as G-code → garbage coords): FIX = isParsableNcText() guard (extension allowlist NC_TEXT_EXTS + non-printable-ratio>0.05 → reject). The runner skips program-not-nc.
2. P0-3 (recall denominator = 121 toolpath vertices → structurally ceilings perfect OCR at ~8%): FIX = extractProgramGT now tracks modal G-motion; only FEED moves (G1/G2/G3) endpoints become featureDiametersIn; G0 rapids excluded. scorePartAgainstProgram uses calloutDimsIn (feature diameters + length), not all coords. toolpathPoints surfaced as context only.
3. Resolver bug (basename() split on "/" in "Scanned Document - 12/1/2020...pdf" mangled the name): FIX = diskFilename() sanitizes /:*?"<>| → _ ; findOne no longer basename()s first.

VERIFY each fix actually closes its P0:
- Does isParsableNcText reject .mcx-8 AND binary content? Any bypass (e.g. a .nc file that's actually binary)?
- Is the feed-move-aware GT correct? Trace: a G1 X.5 line → feature diameter .5; a G0 X20 line → excluded. Does modal state leak across lines wrongly (e.g. a G0 line with no motion word keeps prior 'feed')? Check the FEED_RE/RAPID_RE line detection.
- Does the live run's verdict (5/8 scored, ALL recall=0/precision=0, OCR reads 1-3 dims) now reflect REAL OCR weakness, not a metric artifact? Is that verdict TRUSTWORTHY to report to the operator as "system NOT ready for full corpus"?
- R9: do the 10 tests fail if the fixes regress? Any tautology?

This gates an operator decision (run the full corpus or not). SHORT verdict: PASS or FAIL + P0/P1 (file:line). Is the "NOT ready" verdict trustworthy?

### Assistant | 2026-06-09T01:54:39.743Z

I'll review the OCR true-test harness end-to-end after the P0 fixes. Let me read all three files completely.

### Assistant | 2026-06-09T01:54:40.688Z

[tool_use: Read]

### Assistant | 2026-06-09T01:54:41.161Z

[tool_use: Read]

### Assistant | 2026-06-09T01:54:41.222Z

[tool_use: Read]

### User | 2026-06-09T01:54:42.385Z

[tool_result] 1	// scripts/lib/cnc-program-gt-lib.mjs
2	//
3	// U-XRAY-PERFECT-PARTS-TRUETEST — extract objective ground-truth dimensions from a CNC program, to
4	// validate what the OCR pipeline reads off the matching blueprint. The program is the STRONGEST GT
5	// available: it encodes the ACTUAL machined coordinates (what the part is literally cut to), in plain
6	// text, no STEP kernel / GPU / MCP needed. 
... [+12527 chars truncated]

### User | 2026-06-09T01:54:42.937Z

[tool_result] 1	// scripts/lib/cnc-program-gt-lib.test.mjs
2	// Tests the CNC-program ground-truth extractor that validates the OCR pipeline against real machined
3	// geometry. The program is the answer key for the 91-perfect-parts true-test, so a wrong GT here =
4	// either passing a broken OCR (false confidence before the full-corpus run) or failing a correct one.
5	// Fixtures are REAL G-code excerpts (T-11
... [+7694 chars truncated]

### User | 2026-06-09T01:54:43.018Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/validate-perfect-parts.mjs
3	//
4	// U-XRAY-PERFECT-PARTS-TRUETEST — the TRUE end-to-end test of the OCR/blueprint-reading system on the
5	// 91 perfect parts (print + CAD + CNC program) BEFORE scaling to the full corpus. For each part: OCR
6	// the blueprint → extract dims (mm), parse the matching CNC program → objective machined-dim GT, and
7	// score recall (d
... [+13429 chars truncated]

### Assistant | 2026-06-09T01:54:46.372Z

I have all three files fully read. Let me verify each P0 fix against the live data and trace the logic carefully. Let me check the supporting files the runner depends on, since the verdict's trustworthiness hinges on the whole chain.

### Assistant | 2026-06-09T01:54:47.311Z

[tool_use: Read]

### Assistant | 2026-06-09T01:54:48.055Z

[tool_use: Bash]

### User | 2026-06-09T01:54:48.954Z

[tool_result] 1	// scripts/lib/ocr-training-loop-lib.mjs
2	//
3	// U-XRAY-OCR-TRAINING-LOOP — closed-loop OCR training-data engine (pure core).
4	//
5	// WHY (ready-now, no delta): the full print→CAD→gcode→CAD-gen loop is gated on delta's CAD-gen,
6	// but the print-READING stage trains TODAY. The multi-VLM ensemble (vision-ensemble-fuse.mjs) is a
7	// TEACHER: run it over real prints and the dims models corrob
... [+16916 chars truncated]

### User | 2026-06-09T01:54:56.085Z

[tool_result]   ...
# Subtest: dimMatchesProgram: an OCR'd mm dim matches a program inch coord within tolerance
ok 7 - dimMatchesProgram: an OCR'd mm dim matches a program inch coord within tolerance
  ---
  duration_ms: 0.3352
  ...
# Subtest: scorePartAgainstProgram: recall over CALLOUT-class GT (feature dias+length), NOT toolpath points
ok 8 - scorePartAgainstProgram: recall over CALLOUT-class GT (feature di
... [+647 chars truncated]

### Assistant | 2026-06-09T01:55:04.657Z

10/10 tests pass. Now let me trace the critical correctness paths and probe for bypasses. The most important verification: does the modal G-motion tracking actually behave correctly, and does isParsableNcText reject a binary file with an allowlisted extension. Let me write targeted probes.

### Assistant | 2026-06-09T01:55:23.547Z

[tool_use: Bash]

### User | 2026-06-09T01:55:34.588Z

[tool_result] node:internal/modules/esm/load:217
    throw new ERR_UNSUPPORTED_ESM_URL_SCHEME(parsed, schemes);
          ^

Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'h:'
    at throwIfUnsupportedURLScheme (node:internal/modules/esm/load:217:11)

... [+499 chars truncated]

### Assistant | 2026-06-09T01:55:47.221Z

Need a relative import path. Let me fix the probe.

### Assistant | 2026-06-09T01:55:52.814Z

[tool_use: Bash]

### User | 2026-06-09T01:55:58.345Z

[tool_result] === P0-1: binary .nc bypass test ===
binary .nc: {"ok":false,"reason":"binary (non-printable ratio 0.994 > 0.05)"}
clean text .mcx-8: {"ok":false,"reason":"non-NC source extension .mcx-8 (CAM/CAD, not posted G-code)"}
clean text NO ext: {"ok":true,"reason":"ok"}
no-dot file ext would be: .program

=== mostly-printable binary under 0.05 threshold ===
mostly-text .nc (3 ctrl bytes): {"ok":true,"reas
... [+523 chars truncated]

### Assistant | 2026-06-09T01:56:06.564Z

My probes confirm the key behaviors. Let me note one finding (same-line G0+G1 leak), then verify the live verdict is real by checking the actual truetest report and the resolver behavior. Let me look at the live results and the vision ensemble's `models_ok` semantics.

### Assistant | 2026-06-09T01:56:06.947Z

[tool_use: Bash]

### Assistant | 2026-06-09T01:56:09.515Z

[tool_use: Grep]

### User | 2026-06-09T01:56:20.715Z

[tool_result] 232:      n_models: nModels,
283:    n_models: nModels,
408: *   models_ok:number, models_failed:number, image:string,
416:  if (!a.png || typeof a.png !== "string") return { fused: fuseEnsemble([], a.fuseOpts), per_model_runs: [], models_ok: 0, models_failed: 0, image: a.png || null, error: "no png" };
417:  if (!models.length) return { fused: fuseEnsemble([], a.fuseOpts), per_model_runs: [], mod
... [+298 chars truncated]

### User | 2026-06-09T01:56:25.317Z

[tool_result] total 21
drwxr-xr-x 1 wompu 197611     0 Jun  8 14:35 ./
drwxr-xr-x 1 wompu 197611     0 Jun  8 14:36 ../
-rw-r--r-- 1 wompu 197611   555 Jun  8 14:53 processed-cursor.jsonl
-rw-r--r-- 1 wompu 197611  1326 Jun  8 14:53 truetest-report.json
-rw-r--r-- 1 wompu 197611 10432 Jun  8 14:53 truetest-results.jsonl
---REPORT---
{
  "schemaVersion": "1.0.0",
  "generated_from": "H:\\prism\\state\\shared\\oc
... [+1243 chars truncated]

### Assistant | 2026-06-09T01:56:31.185Z

The live report shows the prior FAIL's stated verdict has changed. Let me examine the actual per-part results to verify the "5 scored, all recall=0, OCR reads 1-3 dims" claim and confirm the 3 program-not-nc skips are legitimate (not a guard over-rejecting real NC).

### Assistant | 2026-06-09T01:56:32.881Z

[tool_use: Read]

### User | 2026-06-09T01:56:34.509Z

[tool_result] 1	{"part_number":"T-11BT-27-250-GR5","customers":["IPTIMASOESOLUT","OPTIMASOL","PTIMASOESOLUTI"],"print":"H:\\PRISM\\Docustrata\\Untitled Folder\\2023_08_03_15_55_20.pdf","program":"H:\\PRISM\\JM DIE\\CNC LATHE\\OMG\\CNC#1#2#3\\CUSTOMERS\\OPTIMAS\\T-11BT-27-250-GR5.MIN","program_axis":"lathe","feature_diameters_in":[0.04,0.176,0.179,0.181,0.183,0.185,0.202,0.205,0.238,0.254,0.255,0.271,0.276,0.289
... [+10050 chars truncated]

### Assistant | 2026-06-09T01:56:41.343Z

Now I have the full picture. The live results reveal something the prior FAIL claim didn't capture. Let me analyze the GT quality critically — the P0-3 fix was supposed to produce *callout-class* dims, but I'm seeing parts with 28, 55, 1214 feature diameters. That is the crux. Let me verify whether the feed-move-aware GT is actually producing print-callout-class dims or still ceiling-ing recall.

### Assistant | 2026-06-09T01:56:44.426Z

[tool_use: Bash]

### User | 2026-06-09T01:56:49.542Z

[tool_result] === callout_gt_count per scored part (the recall denominator) ===
T-11BT: calloutGT=28, ocr_dims=2, toolpath=224
05850:  calloutGT=8,  ocr_dims=1, toolpath=68
9102741: calloutGT=1214, ocr_dims=3, toolpath=59417  <-- .hnc
1648933: calloutGT=55, ocr_dims=1, toolpath=275
43210:  calloutGT=8,  ocr_dims=1, toolpath=66

=== Does 9102741.hnc REALLY have 1214 distinct feed diameters, or is the modal-feed 
... [+1550 chars truncated]

### Assistant | 2026-06-09T01:57:00.342Z

This is a **critical finding**. The `9102741 OP1.hnc` is a **MILL program** (`G17` plane select, `Y` axis everywhere, `T...end mill`/`face mill`/`ball end mill` in the tool comments, `G2/G3` arcs in XY) — but `classifyProgramAxis` returned `lathe`, and `extractProgramGT` minted **1214 "feature diameters"** from mill X-coordinates that are not diameters at all. This program should have been excluded by the `program-non-lathe` guard but wasn't. Let me confirm the misclassification root cause.

### Assistant | 2026-06-09T01:57:04.763Z

[tool_use: Bash]

### User | 2026-06-09T01:57:12.964Z

[tool_result] axis classified: lathe
file size: 1097501 chars
has G17 (mill plane): true
has Y axis: true
has G96/G97 CSS: false
has G50 spindle clamp: false
has G71/G72/G81/G85/G87 turn cycle: true
has NTURN/NBAR: false

>>> latheExt .hnc = true <- THIS forces lathe regardless of mill signals
G81 present: true G83: false
first G8x match: G81 <- drilling cycle misread as turning cycle

### Assistant | 2026-06-09T01:57:24.984Z

Confirmed. Two independent classifier bugs both fire on this mill program: (1) `latheExt` includes `.hnc` and forces lathe regardless of signals, and (2) `G81` (a drilling canned cycle, universal on mills) is matched by `hasTurnCycle` and short-circuits the mill branch. The `hasY && !hasCss && !hasTurnCycle` mill guard never fires. Let me verify this is a real reachable failure (it is — it's in the live results) and assess its impact on the operator verdict, then check whether the prior reviewer's claim about the OCR results is accurate.

### Assistant | 2026-06-09T01:57:29.485Z

[tool_use: Bash]

### User | 2026-06-09T01:57:36.863Z

[tool_result] === Impact assessment on the operator verdict ===
9102741: a MILL .hnc misclassified as lathe -> 1214 fake 'feature diameters' from X-coords
  that are mill XY positions, not turned diameters. callout_gt_count=1214 (denominator).
  recall=0 reported. But this recall is GARBAGE GT, not a real OCR weakness signal.

=== Are the OTHER 4 scored parts genuine lathe? ===
T-11BT .MIN: yes (G96+G50+NTURN) 
... [+750 chars truncated]

### Assistant | 2026-06-09T01:57:46.550Z

I now have enough to assess the verdict's trustworthiness. Let me do one final check on the prior reviewer's specific claims about the recall=0 / OCR-reads-1-3-dims being real OCR weakness, by confirming the OCR genuinely read few dims (not an OCR-side crash), and tracing whether even a *clean* GT would still show recall=0.

### Assistant | 2026-06-09T01:57:50.392Z

[tool_use: Bash]

### User | 2026-06-09T01:57:55.714Z

[tool_result] === Cross-check: even ignoring GT inflation, would recall be 0 on the CLEAN lathe parts? ===
T-11BT: OCR read 2 dims_mm. Feature dias span .04in(1.0mm) to .444in(11.3mm), length .9707in(24.66mm).
  If OCR read 2 real dims and matched ANY of 28, recall>0. gt_matched=0 => OCR's 2 dims matched none.
  matched_pairs=[] => the 2 OCR dims are off (either misread or not corroborating machined dims).

058
... [+657 chars truncated]

### Assistant | 2026-06-09T01:58:34.376Z

I have everything needed. Let me finalize the verdict.

## VERDICT: FAIL

The 3 stated P0 fixes do close their *original* P0s, and 10/10 tests pass — but the same live run that the fixes enabled surfaces a **new P0 of the identical class** the harness was built to prevent (binary/mill noise minting fake ground-truth diameters). The "NOT ready" *direction* is correct, but the headline numbers (`scored=5, mean_recall=0`) are contaminated and not safe to report verbatim.

### P0 fixes — verified individually
- **P0-1 (binary guard)** — closes. `isParsableNcText` rejects `.mcx-8` on extension AND binary content via non-printable ratio (`cnc-program-gt-lib.mjs:40-62`). Probed: binary `.nc` → rejected (ratio 0.994), `.mcx-8` clean text → rejected on ext. Live: 3 `.mcx-8` correctly skipped as `program-not-nc`. No bypass found for the real corpus exts. (Minor residual: a file with >95% printable bytes + an allowlisted ext passes — not reachable for the live `.mcx`/`.MIN`/`.hnc` set.)
- **P0-3 (rapids excluded)** — partially closes. Modal `FEED_RE`/`RAPID_RE` tracking is correct line-to-line (`:112-123`); G0 `X.879` canned-cycle approach correctly excluded; G2/G3 arcs counted. R12-honest.
- **Resolver bug** — closes. `diskFilename()` sanitizes `/:*?"<>|→_` (`validate-perfect-parts.mjs:47-49`), `findOne` no longer `basename()`s. Live: `Scanned Document - 11_18_2020 6_17 AM.pdf` resolved (0 `print_unresolved`).

### NEW P0 (blocking) — mill program scored as lathe, mints 1214 fake GT diameters
`cnc-program-gt-lib.mjs:68-79` `classifyProgramAxis` returns `lathe` for `9102741 OP1.hnc`, a **mill** program (`G17`, `Y` axis throughout, tool comments `end mill`/`face mill`/`ball end mill`). Two compounding defects:
1. `:71` — `latheExt = [".min",".hnc"].includes(ext)` forces lathe for any `.hnc` regardless of mill signals. Hurco `.hnc` is a mill controller format here.
2. `:74` — `hasTurnCycle = /G(7[12]|8[1567])/` matches **G81** (a universal mill *drilling* canned cycle), so the `
... [+3121 chars truncated]
