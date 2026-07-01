---
type: "chat-session"
source: "claude-code-cli"
session_id: "8dd04bd9-222f-490f-aef6-8e4e2308de01"
title: "Review an ADDITIVE, opt-in change to a measurement harness for correctness + sil"
date: "2026-06-23"
first_ts: "2026-06-23T22:57:40.280Z"
last_ts: "2026-06-23T22:59:30.847Z"
cwd: "H:\\prism"
messages: 28
user_msgs: 11
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/8dd04bd9-222f-490f-aef6-8e4e2308de01/subagents/agent-afee3cd968cb3d865.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Review an ADDITIVE, opt-in change to a measurement harness for correctness + sil

> **claude-code-cli** | 2026-06-23 | 28 msgs (11 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/8dd04bd9-222f-490f-aef6-8e4e2308de01/subagents/agent-afee3cd968cb3d865.jsonl`

## Transcript

### User | 2026-06-23T22:57:40.280Z

Review an ADDITIVE, opt-in change to a measurement harness for correctness + silent breakage. Read the current file H:/prism/scripts/validate-perfect-parts.mjs and focus on the NEW additions (run `git -C H:/prism diff -- scripts/validate-perfect-parts.mjs` to see exactly what changed):
1. a new import of extractCadGT/triangulateGT from ./lib/cad-dimension-gt-lib.mjs
2. a new `cadTriangulate` parse flag (--cad-triangulate)
3. a new `findStepForPart(part, root)` helper (resolves the part's sample CAD via findOne, then globs its directory for a *.stp/*.step sibling via PowerShell)
4. a new `--cad-triangulate` mode block (after the parts slice, returns early before the OCR loop): for each has_neutral_step part, resolve STEP -> extractCadGT -> best-effort posted-program GT -> triangulateGT -> write cad-triangulation-report.json.

Verify, citing file:line:
- DEFAULT-OFF byte-identical: when --cad-triangulate is NOT passed, the OCR/recall path is completely unchanged (the new block is fully guarded by `if (opts.cadTriangulate)` and returns early only when set).
- The early `return 0` does not skip any required cleanup that the normal path needs (it returns BEFORE the raster tmpdir is created, so no leak).
- findStepForPart: PowerShell argument construction is safe (dir path interpolation) and the .stp/.step glob is correct; returns null safely when no CAD/STEP resolves.
- The mode loop: error handling records (not swallows) per-part errors; counters (cadReliable/programReliable/both/totalCorroborated) are computed correctly; reuses existing extractProgramGT/extractMillProgramGT/isParsableNcText correctly (mirrors the main scoring branch's program-GT logic).
- No regression to the existing scoring branch.

Report P0/P1/P2 with file:line, then a single verdict: PASS or FAIL. Review only.

### Assistant | 2026-06-23T22:57:45.966Z

I'll review this additive change to the measurement harness. Let me start by examining the current file and the diff.

### Assistant | 2026-06-23T22:57:47.135Z

[tool_use: Bash]

### Assistant | 2026-06-23T22:57:47.196Z

[tool_use: Read]

### User | 2026-06-23T22:57:49.155Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/validate-perfect-parts.mjs
3	//
4	// U-XRAY-PERFECT-PARTS-TRUETEST — the TRUE end-to-end test of the OCR/blueprint-reading system on the
5	// 91 perfect parts (print + CAD + CNC program) BEFORE scaling to the full corpus. For each part: OCR
6	// the blueprint → extract dims (mm), parse the matching CNC program → objective machined-dim GT, and
7	// score recall (d
... [+36237 chars truncated]

### User | 2026-06-23T22:57:52.243Z

[tool_result] diff --git a/scripts/validate-perfect-parts.mjs b/scripts/validate-perfect-parts.mjs
index 19287388d3..98e6196965 100644
--- a/scripts/validate-perfect-parts.mjs
+++ b/scripts/validate-perfect-parts.mjs
@@ -32,6 +32,7 @@ import { dimToMm } from "./lib/dimension-set-score.mjs";
 import { extractProgramGT, extractMillProgramGT, scorePartAgainstProgram, isParsableNcText, programGtAgreementSamples } f
... [+7027 chars truncated]

### Assistant | 2026-06-23T22:58:01.220Z

Now let me verify the contract of the new library it depends on, since the entire new block's correctness hinges on `extractCadGT`/`triangulateGT` returning the exact shapes the consumer reads.

### Assistant | 2026-06-23T22:58:01.508Z

[tool_use: Read]

### User | 2026-06-23T22:58:03.099Z

[tool_result] 1	/**
2	 * cad-dimension-gt-lib.mjs -- pure: derive CALLOUT-CLASS dimensional ground truth from a part's
3	 * neutral STEP model + score/triangulate OCR dims against it (U-XRAY-CAD-GT-SCORE, slot:xray).
4	 *
5	 * WHY (the P2.7 measurement-backbone gap): `validate-perfect-parts.mjs` scores OCR recall against the
6	 * posted CNC PROGRAM only (`cnc-program-gt-lib.mjs`). On the 91-part `perfect-print-
... [+16476 chars truncated]

### Assistant | 2026-06-23T22:58:07.366Z

The library contract matches the consumer's reads exactly. Now I need to verify the program-GT contract — specifically whether `extractProgramGT`/`extractMillProgramGT` return a `calloutDimsIn` field, which `triangulateGT` reads off `programGT`. This is a critical integration-coupling point.

### Assistant | 2026-06-23T22:58:08.781Z

[tool_use: Grep]

### Assistant | 2026-06-23T22:58:09.878Z

[tool_use: Grep]

### User | 2026-06-23T22:58:10.786Z

[tool_result] 222: *            calloutDimsIn:number[], xValues:number[], zValues:number[], nToolpathPoints:number}}
255:  const calloutDimsIn = [...clusteredDiametersIn];
256:  if (lengthIn != null && lengthIn > 0) calloutDimsIn.push(lengthIn);
268:    calloutDimsIn,                            // clusteredDiameters + length = the recall denominator
307: * GT (`calloutDimsIn` = distinct feed-move feature diamet
... [+1302 chars truncated]

### User | 2026-06-23T22:58:12.703Z

[tool_result] 50:export function isParsableNcText(text, opts = {}) {
224:export function extractProgramGT(text, opts = {}) {
571:export function extractMillProgramGT(text /*, opts */) {

### Assistant | 2026-06-23T22:58:18.381Z

Both `extractProgramGT` (line 255-268) and `extractMillProgramGT` (line 589) return `calloutDimsIn`. The contract `triangulateGT` reads (`programGT.calloutDimsIn`) is satisfied by both. Let me verify one critical detail: `extractMillProgramGT`'s signature. The diff calls it as `extractMillProgramGT(progText, { ext })` but the grep shows `extractMillProgramGT(text /*, opts */)` — it ignores opts. Let me confirm this matches the main scoring branch and check the `axis`/`gtReliable` fields it returns, plus how the main branch handles the same call.

### Assistant | 2026-06-23T22:58:19.797Z

[tool_use: Read]

### Assistant | 2026-06-23T22:58:20.510Z

[tool_use: Read]

### User | 2026-06-23T22:58:21.711Z

[tool_result] 40	
41	/**
42	 * Pure: is this string plausibly POSTED G-code TEXT (not binary, not a CAM source)? Two guards:
43	 * (1) ext allowlist (if provided) — reject .mcx-style/.emcam/CAD sources; (2) printable-ratio — a binary
44	 * file read as utf8 is full of control bytes / replacement chars. Returns {ok, reason}. The runner
45	 * calls this BEFORE extractProgramGT so binary noise never becomes fake G
... [+4392 chars truncated]

### User | 2026-06-23T22:58:22.607Z

[tool_result] 560	/**
561	 * Pure: extract CALLOUT-CLASS ground-truth dims from a posted MILL program -- the hole/bore feature
562	 * diameters a print labels. Returns the SAME shape as extractProgramGT (so scorePartAgainstProgram + the
563	 * validate runner are unchanged): calloutDimsIn = distinct hole + bore diameters (inch). gtReliable iff
564	 * >=1 feature was found ('mill-holes'); an empty mill GT ('mill
... [+2192 chars truncated]

### Assistant | 2026-06-23T22:58:28.535Z

The contracts all check out. `extractMillProgramGT` ignores `opts` but the diff still passes `{ ext }` harmlessly (matching the main branch's call at line 270). Both return `axis`, `gtReliable`, and `calloutDimsIn`. Now let me verify the main scoring branch's program-GT logic precisely to confirm the new block "mirrors" it, and check the `findStepForPart` PowerShell `-Include` semantics for the path-injection question. Let me also confirm whether the `step-dimension-extract.mjs` dep exists (the new lib imports it).

### Assistant | 2026-06-23T22:58:29.946Z

[tool_use: Bash]

### Assistant | 2026-06-23T22:58:31.161Z

[tool_use: Bash]

### User | 2026-06-23T22:58:35.357Z

[tool_result] -rw-r--r-- 1 wompu 197611 15793 Jun 23 17:49 H:/prism/scripts/lib/cad-dimension-gt-lib.mjs
-rw-r--r-- 1 wompu 197611  8801 Jun 12 08:03 H:/prism/scripts/lib/step-dimension-extract.mjs
---tests---
cad-dimension-gt-lib.mjs
cad-dimension-gt-lib.test.mjs
step-dimension-extract.mjs
step-dimension-extract.test.mjs

### User | 2026-06-23T22:58:39.685Z

[tool_result] e1cfab0e20 [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-ENHANCE-HARNESS-WIRE (slot:xray): wire --enhance (preprocess+deskew) into validate-perfect-parts + GT-validation finding -- 05850 recall is GT-ceiling-bound at 3/7 across 6 runs/4 levers (num_predict 4096/8192, reading-guidance off/on, region-route, enhance ALL leave recall immovable). KEEP num_predict=4096 + reading-guidance opt-in (neither li
... [+1663 chars truncated]

### Assistant | 2026-06-23T22:58:44.415Z

All dependencies exist, the lib has its own test file, and the change is the latest uncommitted work on a well-established harness. Let me do a final `node --check` on the changed file to confirm it parses, and verify the `findStepForPart` PowerShell `-Include` glob behavior with a quick reasoning check against the actual file extension handling.

### Assistant | 2026-06-23T22:58:45.282Z

[tool_use: Bash]

### User | 2026-06-23T22:58:52.130Z

[tool_result] PARSE_OK

### Assistant | 2026-06-23T22:59:30.847Z

The file parses cleanly. I now have everything needed to trace the change end-to-end. Let me record my findings.

## Analysis Summary

I traced the new `--cad-triangulate` block, both library contracts it depends on (`cad-dimension-gt-lib.mjs` for `extractCadGT`/`triangulateGT`, `cnc-program-gt-lib.mjs` for `extractProgramGT`/`extractMillProgramGT`/`isParsableNcText`), the `step-dimension-extract.mjs` transitive dependency, and the existing scoring branch it claims to mirror.

### Verifications passed

**1. DEFAULT-OFF byte-identical.** `opts.cadTriangulate` is `has("--cad-triangulate")` (validate-perfect-parts.mjs:129). The entire new block is wrapped in `if (opts.cadTriangulate)` (line 185-226). When the flag is absent, control flows straight from the parts slice (line 176) to `resultsPath`/`cursorPath` setup (line 228) — identical to before. No shared mutable state is touched in the new block before the guard.

**2. Early `return 0` skips no required cleanup.** The new block returns at line 225, which is BEFORE `rasterDir` is created (line 239-240). The only cleanup the normal path needs is the `Remove-Item` of `rasterDir` at line 420 — and since no rasterDir is created on the triangulate path, there is no tmpdir leak. `mkdirSync(opts.outDir)` (line 169) runs before the branch, so the `writeFileSync` to `outDir` at line 221 is safe. Confirmed: no leak.

**3. Contract integrity (the silent-breakage check I weight highest).** `triangulateGT` reads `programGT.calloutDimsIn` (cad-dimension-gt-lib.mjs:259) and `cadGT.calloutDimsMm` (line 262). Both producers honor these: `extractCadGT` always returns `calloutDimsMm` + `gtReliable` + `cadGtClass` + `unit` (lines 91-96, 117-125), and BOTH `extractProgramGT` (cnc-program-gt-lib.mjs:268) and `extractMillProgramGT` (line 589) return `calloutDimsIn` + `axis` + `gtReliable`. The consumer's reads at validate-perfect-parts.mjs:196, 207-208, 214 all match. `extractMillProgramGT(progText, { ext })` passes `{ext}` though the func
... [+4773 chars truncated]
