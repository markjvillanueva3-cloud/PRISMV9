---
type: "chat-session"
source: "claude-code-cli"
session_id: "8dd04bd9-222f-490f-aef6-8e4e2308de01"
title: "Independent second-pass review of an additive opt-in wire into H:/prism/scripts/"
date: "2026-06-23"
first_ts: "2026-06-23T22:57:50.257Z"
last_ts: "2026-06-23T23:01:40.072Z"
cwd: "H:\\prism"
messages: 53
user_msgs: 20
assistant_msgs: 33
raw_file: "H:/.claude/projects/H--prism/8dd04bd9-222f-490f-aef6-8e4e2308de01/subagents/agent-abdbe080d9ea17fe9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Independent second-pass review of an additive opt-in wire into H:/prism/scripts/

> **claude-code-cli** | 2026-06-23 | 53 msgs (20 user / 33 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/8dd04bd9-222f-490f-aef6-8e4e2308de01/subagents/agent-abdbe080d9ea17fe9.jsonl`

## Transcript

### User | 2026-06-23T22:57:50.257Z

Independent second-pass review of an additive opt-in wire into H:/prism/scripts/validate-perfect-parts.mjs. Run `git -C H:/prism diff -- scripts/validate-perfect-parts.mjs` to see the change, and read the surrounding file for context.

The change adds a `--cad-triangulate` GPU-free mode that derives CAD-model dimensional GT (via ./lib/cad-dimension-gt-lib.mjs extractCadGT) for neutral-STEP parts and triangulates it against the posted-program GT.

Weight your review toward integration + honesty + convention:
1. HONESTY (R12): the code comments + report `note` field claim CAD-GT is "lower-confidence" and "bounded to ~11 neutral-STEP parts, NOT an OCR-recall expansion". A live run showed: 11 neutral-STEP parts, only 5 with a posted program, and the 2 sampled both yielded cad-only/0-corroborated (their programs are .mcx-8 binary CAM). Confirm the code's framing is honest and not overselling. Is the bounded value clearly stated?
2. CONVENTION (R11): does findStepForPart match the existing findOne PowerShell pattern (windowsHide, timeout, -ErrorAction SilentlyContinue, existsSync guard)? Does the report match the existing truetest-report.json shape (schemaVersion, note)?
3. R8 reuse: confirm extractProgramGT/extractMillProgramGT/isParsableNcText are reused exactly as the main branch uses them (axis=mill -> extractMillProgramGT; gtReliable gate before treating program as an answer key).
4. Orphan check (R15): is the new cad-dimension-gt-lib now actually consumed by a runnable consumer (this mode), so it is no longer an orphan?
5. Any naming collision, any --cad-triangulate flag clash with existing flags.

Report P0/P1/P2 with file:line, then a single verdict: PASS or FAIL. Review only.

### Assistant | 2026-06-23T22:58:03.771Z

I'll review this change. Let me start by examining the diff and the surrounding file context.

### Assistant | 2026-06-23T22:58:04.781Z

[tool_use: Bash]

### Assistant | 2026-06-23T22:58:04.927Z

[tool_use: Read]

### User | 2026-06-23T22:58:06.237Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### User | 2026-06-23T22:58:06.709Z

[tool_result] read-once-guard: 'H:\prism\scripts\validate-perfect-parts.mjs' was already read 18s ago in this session and is unchanged (mtime 1782255347910). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-23T22:58:10.405Z

The cache says these were already read in session context, but I don't actually have that content — this is a fresh agent thread. Let me read them properly.

### Assistant | 2026-06-23T22:58:11.395Z

[tool_use: Bash]

### User | 2026-06-23T22:58:17.809Z

[tool_result] diff --git a/scripts/validate-perfect-parts.mjs b/scripts/validate-perfect-parts.mjs
index 19287388d3..98e6196965 100644
--- a/scripts/validate-perfect-parts.mjs
+++ b/scripts/validate-perfect-parts.mjs
@@ -32,6 +32,7 @@ import { dimToMm } from "./lib/dimension-set-score.mjs";
 import { extractProgramGT, extractMillProgramGT, scorePartAgainstProgram, isParsableNcText, programGtAgreementSamples } f
... [+7027 chars truncated]

### Assistant | 2026-06-23T22:58:20.700Z

Now let me read the full file end-to-end and the library it consumes.

### Assistant | 2026-06-23T22:58:21.200Z

[tool_use: Read]

### Assistant | 2026-06-23T22:58:21.531Z

[tool_use: Read]

### User | 2026-06-23T22:58:22.650Z

[tool_result] read-once-guard: 'H:\prism\scripts\validate-perfect-parts.mjs' was already read 34s ago in this session and is unchanged (mtime 1782255347910). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-23T22:58:23.430Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\cad-dimension-gt-lib.mjs' was already read 20s ago in this session and is unchanged (mtime 1782254951064). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-23T22:58:26.036Z

The read-once guard is blocking me but the content isn't actually in my context (fresh thread). Let me work around it with the disable knob.

### Assistant | 2026-06-23T22:58:26.732Z

[tool_use: Bash]

### User | 2026-06-23T22:58:33.062Z

[tool_result] <persisted-output>
Output too large (37.2KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\8dd04bd9-222f-490f-aef6-8e4e2308de01\tool-results\b8sz72x1s.txt

Preview (first 2KB):
     1	#!/usr/bin/env node
     2	// scripts/validate-perfect-parts.mjs
     3	//
     4	// U-XRAY-PERFECT-PARTS-TRUETEST — the TRUE end-to-end test of the OCR/blueprint-reading system on the
     5	// 91 
... [+1805 chars truncated]

### Assistant | 2026-06-23T22:58:36.191Z

Let me read the saved full output file and the library.

### Assistant | 2026-06-23T22:58:37.521Z

[tool_use: Read]

### User | 2026-06-23T22:58:40.876Z

[tool_result] 1	     1	#!/usr/bin/env node
2	     2	// scripts/validate-perfect-parts.mjs
3	     3	//
4	     4	// U-XRAY-PERFECT-PARTS-TRUETEST — the TRUE end-to-end test of the OCR/blueprint-reading system on the
5	     5	// 91 perfect parts (print + CAD + CNC program) BEFORE scaling to the full corpus. For each part: OCR
6	     6	// the blueprint → extract dims (mm), parse the matching CNC program → objective
... [+39345 chars truncated]

### Assistant | 2026-06-23T22:58:44.773Z

Now I have the full file. Let me read the library it consumes to verify the contract (extractCadGT, triangulateGT signatures and return shapes).

### Assistant | 2026-06-23T22:58:45.670Z

[tool_use: Bash]

### User | 2026-06-23T22:58:56.643Z

[tool_result]      1	/**
     2	 * cad-dimension-gt-lib.mjs -- pure: derive CALLOUT-CLASS dimensional ground truth from a part's
     3	 * neutral STEP model + score/triangulate OCR dims against it (U-XRAY-CAD-GT-SCORE, slot:xray).
     4	 *
     5	 * WHY (the P2.7 measurement-backbone gap): `validate-perfect-parts.mjs` scores OCR recall against the
     6	 * posted CNC PROGRAM only (`cnc-program-gt-lib.mjs`). 
... [+17470 chars truncated]

### Assistant | 2026-06-23T22:59:02.167Z

Now I have both files fully read. Let me verify a few specific contract details. First, let me check the program GT contract — does `extractProgramGT`/`extractMillProgramGT` return a `calloutDimsIn` field (which `triangulateGT` consumes), and confirm `gt.axis`/`gt.gtReliable` shape matches main-branch usage.

### Assistant | 2026-06-23T22:59:04.068Z

[tool_use: Grep]

### Assistant | 2026-06-23T22:59:05.056Z

[tool_use: Grep]

### User | 2026-06-23T22:59:06.061Z

[tool_result] 16:// program's X/Y/Z as diameter/length (different semantics) — a mill program returns {axis:'mill'} and
50:export function isParsableNcText(text, opts = {}) {
141: *            arcMoves:number, contourFraction:number, gtClass:('stepped'|'contour'|'insufficient'),
142: *            gtReliable:boolean}}
174:  let gtClass;
175:  if (feedMoves < minFeed) gtClass = "insufficient";
176:  else gtClass 
... [+2509 chars truncated]

### User | 2026-06-23T22:59:07.161Z

[tool_result] scripts\cad-extract-blade-sections.mjs:25: *        --axis z --rmin 365 --rmax 605 --sections 8 [--out <json>] [--json]
scripts\cad-extract-blade-sections.mjs:41:    else if (k === "--axis") a.axis = String(argv[++i]).toLowerCase();
scripts\cad-extract-blade-sections.mjs:120:    console.error("ERR: --axis must be x|y|z");
scripts\find-perfect-parts.mjs:23://        [--max-bp 12] [--max-cad 20] [--
... [+1199 chars truncated]

### Assistant | 2026-06-23T22:59:13.088Z

The contracts confirm. Now let me verify the program GT extractor return for the `mill` path includes `gtReliable` and that `extractProgramGT` (lathe) returns `gtReliable` too. Let me check the extractProgramGT return shape around line 268-273, and confirm whether `findOne` is being passed a STEP filename through `part.sample_nc` (potential issue: the lib comment says STEP-only, but program triangulation reads `part.sample_nc`).

Let me also confirm whether there's a test for the new mode, and whether the lib has tests (orphan/R15 check), and check that `--cad-triangulate` has no flag clash.

### Assistant | 2026-06-23T22:59:14.520Z

[tool_use: Bash]

### Assistant | 2026-06-23T22:59:16.271Z

[tool_use: Bash]

### User | 2026-06-23T22:59:19.839Z

[tool_result] export function extractProgramGT(text, opts = {}) {
  const raw = String(text == null ? "" : text);
  const axis = classifyProgramAxis(raw, opts);
  const code = raw.replace(/\([^)]*\)/g, " "); // strip ( … ) comments before any coordinate read

  // Walk line by line, tracking modal motion (sticky across lines until changed). Collect X/Z under a
  // FEED group as machined geometry; values under 
... [+4612 chars truncated]

### User | 2026-06-23T22:59:28.343Z

[tool_result] scripts/lib/cad-dimension-gt-lib.test.mjs
---grep tests---
scripts/lib/cad-dimension-gt-lib.mjs
scripts/lib/cad-dimension-gt-lib.test.mjs
scripts/validate-perfect-parts.mjs

### Assistant | 2026-06-23T22:59:35.901Z

Contracts confirmed. The lib has a test file. Now let me verify a few remaining concerns:

1. The `findStepForPart` PowerShell `-Include` with `\\*` path requires `-Recurse` to work reliably — let me confirm the PowerShell semantics concern (`-Include` on a non-recursive `Get-ChildItem` with a `\*` wildcard path is valid). 
2. Whether the new mode runs cleanly (syntax check).
3. Check `progPath` ext handling — `part.sample_nc` being a `.mcx-8` binary; `isParsableNcText` gates it.

Let me run a syntax/parse check and verify the test file is real (not stubs), plus check the `note` honesty around "lower-confidence".

### Assistant | 2026-06-23T22:59:37.790Z

[tool_use: Bash]

### Assistant | 2026-06-23T22:59:39.503Z

[tool_use: Bash]

### User | 2026-06-23T22:59:43.430Z

[tool_result] SYNTAX_OK validate-perfect-parts
SYNTAX_OK cad-dimension-gt-lib

### User | 2026-06-23T22:59:49.770Z

[tool_result] 101
--- sample asserts ---
37:    assert.equal(gt.unit, "inch");
38:    assert.equal(gt.scaleResolved, true);
42:    assert.deepEqual(gt.featureDiametersMm, [12.7, 25.4]);
43:    assert.equal(gt.rawDiameterCount, 3);
44:    assert.equal(gt.calloutDiameterCount, 2);
47:    assert.deepEqual(gt.envelopeMm, [50.8, 25.4, 12.7]);
50:    assert.deepEqual(gt.calloutDimsMm, [12.7, 25.4, 50.8, 25.4, 12.7]);
... [+604 chars truncated]

### Assistant | 2026-06-23T22:59:53.881Z

Both files parse clean, and the lib test has 101 real reference-value asserts (algebraic invariants, deepEqual on computed mm values, gtReliable gates) — no stubs. Let me run the lib test to confirm it passes, and verify the triangulateGT tests exist.

### Assistant | 2026-06-23T22:59:54.621Z

[tool_use: Bash]

### Assistant | 2026-06-23T22:59:55.774Z

[tool_use: Bash]

### User | 2026-06-23T23:00:01.455Z

[tool_result]     # Subtest: empty/invalid cadGT -> []
    ok 5 - empty/invalid cadGT -> []
      ---
      duration_ms: 0.0342
      ...
    1..5
ok 10 - cadGtToCandidates -- reconcile-engine adapter
  ---
  duration_ms: 0.5882
  type: 'suite'
  ...
1..10
# tests 26
# suites 10
# pass 26
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 94.324

### User | 2026-06-23T23:00:08.186Z

[tool_result] 13:  triangulateGT,
147:describe("triangulateGT -- program (intersect) cad corroboration", () => {
148:  it("high confidence: dims in BOTH sources are corroborated", () => {
149:    const t = triangulateGT({
156:    assert.equal(t.confidence, "high");
159:    const t = triangulateGT({
167:  it("program-only when CAD absent", () => {
168:    const t = triangulateGT({ programGT: { calloutDimsIn: [0.
... [+588 chars truncated]

### Assistant | 2026-06-23T23:00:14.461Z

All 26 lib tests pass, including the full triangulateGT confidence matrix (high/program-only/cad-only/uncorroborated/none). 

Now let me verify the key honesty claims against the task prompt's live-run observation, and check one potential correctness concern: the PowerShell `-Include` with `Get-ChildItem -Path "dir\*"` — this is the canonical idiom (the `\*` on the path makes `-Include` work without `-Recurse`). Let me also confirm there's no double-application issue with the mill GT path and the `progPath` ext parsing for a `.mcx-8` file (the dot-split).

Let me check the git log/blame context to confirm this is genuinely additive and the `extractMillProgramGT` re-derivation discards the lathe `extractProgramGT` result correctly (matching main-branch usage at line 270).

### Assistant | 2026-06-23T23:00:17.914Z

[tool_use: Bash]

### User | 2026-06-23T23:00:24.790Z

[tool_result] === ext parse on .mcx-8 ===
ext=.mcx-8
=== git status of lib (orphan/new-file check) ===
=== is lib tracked/committed already? ===

### Assistant | 2026-06-23T23:00:34.891Z

The lib files are NOT yet tracked by git (untracked, no log history) — they are new files in this working tree along with the diff. Let me confirm the full untracked/staged state to understand whether the lib + test ship in the same change-set as the consumer wire.

### Assistant | 2026-06-23T23:00:35.169Z

[tool_use: Bash]

### User | 2026-06-23T23:00:40.632Z

[tool_result]  M scripts/launch-readiness-cron.mjs
 M scripts/lib/octopus-dispatch.mjs
 M scripts/lib/octopus-dispatch.test.mjs
 M scripts/octopus-with-hermes-rag.mjs
 M scripts/validate-perfect-parts.mjs
 M scripts/verify-launch-readiness.mjs
 M scripts/verify-launch-readiness.test.mjs
?? scripts/.gitignore
?? scripts/PLAN_deep_accuracy_v2.md
?? scripts/README.md
?? scripts/SESSION_START_TEMPLATES.md
?? script
... [+14966 chars truncated]

### Assistant | 2026-06-23T23:00:53.574Z

The lib `cad-dimension-gt-lib.mjs` + its test are untracked (new), and the consumer wire (`validate-perfect-parts.mjs` modification) is in the same uncommitted change-set. So R15 orphan check: the lib now has a runnable consumer (this `--cad-triangulate` mode), no longer an orphan. Good.

I have everything I need. Let me do one final verification of the honesty claims by checking the source memory referenced in the comment and the live-run numbers quoted in the task prompt, then assemble findings.

The key honesty facts to weigh:
- Comment says "~11 of 91 parts have a neutral STEP" — matches the live run (11 neutral-STEP parts).
- Task prompt live run: 11 neutral, only 5 with a posted program, 2 sampled both yielded cad-only/0-corroborated (programs are `.mcx-8` binary CAM).
- The note field claims CAD-GT alone is "lower-confidence than program GT" and explains why (STEP carries fillet/cosmetic features a print never dimensions).

Let me verify the code path correctly produces `cad-only` when the program is `.mcx-8` binary (so the honest framing matches actual behavior).

### Assistant | 2026-06-23T23:00:54.976Z

[tool_use: Bash]

### User | 2026-06-23T23:01:02.567Z

[tool_result] export function isParsableNcText(text, opts = {}) {
  const ext = String(opts.ext || "").toLowerCase();
  if (ext) {
    if (/^\.mcx/.test(ext) || [".emcam", ".vnc", ".f3d", ".ipt", ".sldprt", ".step", ".stp", ".igs", ".iges", ".dxf", ".dwg"].includes(ext)) {
      return { ok: false, reason: `non-NC source extension ${ext} (CAM/CAD, not posted G-code)` };
    }
    if (!NC_TEXT_EXTS.has(ext)) ret
... [+2003 chars truncated]

### Assistant | 2026-06-23T23:01:40.072Z

Confirmed. `isParsableNcText` rejects `.mcx*` extensions outright (`reason: non-NC source extension`). So in the triangulate path, a `.mcx-8` program → `isParsableNcText().ok === false` → `programGT` stays `null` → `triangulateGT` returns `confidence: "cad-only"`, `nCorroborated: 0`. This exactly matches the task prompt's observed live behavior (the 2 sampled both yielded cad-only/0-corroborated because their programs are `.mcx-8` binary CAM). The code's behavior is honest and matches reality.

I now have a complete, verified picture. Assembling the review.

---

VERDICT: PASS

summary: The `--cad-triangulate` mode is a clean, additive, opt-in early-return branch that reuses the existing program-GT extractors exactly as the main OCR path does, follows the established PowerShell/report conventions, and is backed by the now-consumed `cad-dimension-gt-lib.mjs` (26/26 lib tests pass, real reference-value asserts). The honesty framing is accurate and matches the live run: a `.mcx-8` program is correctly rejected by `isParsableNcText`, yielding the observed `cad-only`/0-corroborated outcome, and the bounded value (~11 neutral-STEP parts, not an OCR-recall expansion) is stated clearly in three places. No P0/P1 issues; the bounded payoff is honestly disclosed rather than oversold.

findings:

1. HONESTY (R12) — verified clean. The flag comment (`scripts/validate-perfect-parts.mjs:125-128`), the branch comment (`:178-184`), and the report `note` (`:220`) all state the bound consistently: "~11 of 91 parts have a neutral STEP", "NOT an OCR-recall-corpus expansion", and "CAD-GT alone is lower-confidence than program GT (a STEP carries fillet/cosmetic features a print never dimensions ... still noisier)". The live-run reality the task describes is faithfully reproduced by the code: a `.mcx-8` program hits `isParsableNcText(...,{ext:'.mcx-8'}).ok === false` (`scripts/lib/cnc-program-gt-lib.mjs:53`), so `programGT` stays `null` (`:200,205`), and `triangulateGT` returns `confidence
... [+4578 chars truncated]
