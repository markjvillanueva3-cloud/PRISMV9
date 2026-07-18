---
type: "chat-session"
source: "claude-code-cli"
session_id: "e2da5ef3-054c-4ce9-bf15-ccdd4c5dbc63"
title: "Review a wiring change to PRISM's LIVE closed-loop OCR training grinder — the hi"
date: "2026-06-17"
first_ts: "2026-06-17T02:58:09.453Z"
last_ts: "2026-06-17T03:06:52.257Z"
cwd: "H:\\prism-slot-xray"
messages: 58
user_msgs: 21
assistant_msgs: 37
raw_file: "H:/.claude/projects/H--prism-slot-xray/e2da5ef3-054c-4ce9-bf15-ccdd4c5dbc63/subagents/agent-aa0a4dc7937d16e4c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:15"
---

# Review a wiring change to PRISM's LIVE closed-loop OCR training grinder — the hi

> **claude-code-cli** | 2026-06-17 | 58 msgs (21 user / 37 assistant) | cwd: H:\prism-slot-xray
> Raw: `H:/.claude/projects/H--prism-slot-xray/e2da5ef3-054c-4ce9-bf15-ccdd4c5dbc63/subagents/agent-aa0a4dc7937d16e4c.jsonl`

## Transcript

### User | 2026-06-17T02:58:09.453Z

Review a wiring change to PRISM's LIVE closed-loop OCR training grinder — the highest-risk kind of edit (a nightly cron runs this on the real 7142-print corpus). Read scripts/blueprint-ocr-training-loop.mjs END-TO-END in H:/prism (focus the weak-label per-page loop ~line 260-310, parseArgs ~57-85, the import ~47, and the global counter ~234). Grade PASS/FAIL with P0/P1/P2 + file:line.

WHAT CHANGED: a new OPT-IN `--page-classify` flag wires scripts/page-classify.mjs's `classifyImage(png)` as a pre-VLM page gate. Before the expensive ensemble runs on a rendered page, if --page-classify is on AND the classifier returns verdict:"skip" (a CONFIDENT non-drawing: bom/table/notes/blank/photo), the page is skipped (ensemble not run), counters `pageClassifySkips`/`pagesSkippedPaperwork` increment, and `continue`. New report field `this_run_pages_skipped_paperwork`. When all pages of a print are classify-skipped, the print is cursored as "skipped-all-paperwork" (a legit done state) rather than "skipped-ensemble-failed".

CRITICAL CONTRACT to verify (data-loss is the cardinal sin here):
1. DEFAULT-OFF byte-identical: when --page-classify is absent (the nightly cron does NOT pass it), the weak-label path must be EXACTLY as before. Confirm the `if (opts.pageClassify)` guard fully gates every new behavior; no counter/log/cursor-status change leaks into the default path.
2. DATA-LOSS SAFETY: a real drawing page must NEVER be skipped. classifyImage returns verdict:"extract" on render-fail / parse-fail / classifier-error / low-confidence / uncertain (verify in scripts/page-classify.mjs + scripts/lib/page-classifier-lib.mjs decidePageVerdict — skip requires is_drawing===false AND conf>=floor AND source==="json"). Confirm the loop only skips on cls.verdict==="skip".
3. CURSOR HONESTY: the "skipped-all-paperwork" branch must fire ONLY when opts.pageClassify AND pageClassifySkips>0 AND pageClassifySkips===rast.pages.length. A mixed case (some skipped, some ensemble-failed) must still co
... [+788 chars truncated]

### Assistant | 2026-06-17T02:58:12.435Z

I'll review this wiring change end-to-end. Let me start by reading the main file and its dependencies in parallel.

### Assistant | 2026-06-17T02:58:12.931Z

[tool_use: Read]

### Assistant | 2026-06-17T02:58:13.393Z

[tool_use: Read]

### Assistant | 2026-06-17T02:58:13.720Z

[tool_use: Read]

### User | 2026-06-17T02:58:14.607Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   THIS chat's bridge is stale-heartbeat (pid 32360 gone) | fleet-wide: 0 mcp-http-bridge processes running (enum-cache 102s old).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-
... [+521 chars truncated]

### User | 2026-06-17T02:58:14.662Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/page-classify.mjs
3	//
4	// U-PSGB-XRAY-PAGE-CLASSIFIER — the live actuator for the drawing-vs-paperwork
5	// page classifier. Given rendered page PNG(s), it asks the GPU-resident VLM a
6	// CHEAP yes/no ("is this a dimensioned engineering drawing?") and emits a verdict
7	// per page (extract | skip). Run BEFORE the expensive full OCR extraction to skip
8	// the 
... [+14361 chars truncated]

### User | 2026-06-17T02:58:14.857Z

[tool_result] 1	// scripts/lib/page-classifier-lib.mjs
2	//
3	// U-PSGB-XRAY-PAGE-CLASSIFIER — drawing-vs-paperwork page classifier (pure core).
4	//
5	// THE PROBLEM this solves (overnight corpus, 2026-06-01): of 253 OCR-reachable
6	// pages, only 60 (~24%) were actual engineering drawings; 193 were non-drawing
7	// pages (cover sheets, notes pages, BOM tables, text documents) bundled into
8	// multi-page PDFs
... [+14690 chars truncated]

### Assistant | 2026-06-17T02:58:19.036Z

The MCP is disconnected but my file Reads worked fine (direct fallback). I have page-classify.mjs and page-classifier-lib.mjs. The main file (blueprint-ocr-training-loop.mjs) failed to read — that error was actually the MCP enforcement block, not a real read failure. Let me re-read the main file, which is the core of this review.

### Assistant | 2026-06-17T02:58:19.324Z

[tool_use: Read]

### User | 2026-06-17T02:58:19.994Z

[tool_result] read-once-guard: 'H:\prism\scripts\blueprint-ocr-training-loop.mjs' was already read 6s ago in this session and is unchanged (mtime 1781664746812). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-17T02:58:23.328Z

The read-once guard claims I already read it — but I never received its content (the first attempt returned the MCP-disconnect block, not file content). The harness thinks it's cached but I don't have it. Let me bypass with a fresh offset-based read.

### Assistant | 2026-06-17T02:58:24.203Z

[tool_use: Read]

### User | 2026-06-17T02:58:25.550Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/blueprint-ocr-training-loop.mjs
3	//
4	// U-XRAY-OCR-TRAINING-LOOP — the closed-loop OCR training-data engine (runner).
5	//
6	// Trains the print-READING stage TODAY, without delta's CAD-gen. Three phases:
7	//   1. CALIBRATE — generate perfect-GT synthetic prints (mixed difficulty) → multi-VLM ensemble →
8	//      measure P(consensus dim CORRECT | corroboration
... [+26709 chars truncated]

### Assistant | 2026-06-17T02:58:29.075Z

I now have the full main file and both classifier dependencies. Let me verify the supporting contracts I need to confirm: `parseCursorDoneSet` (does it treat ANY status line as done?), `formatCursorLine`, and `partitionByResumeCursor`.

### Assistant | 2026-06-17T02:58:29.165Z

[tool_use: Read]

### User | 2026-06-17T02:58:30.305Z

[tool_result] 1	// scripts/lib/ocr-training-loop-lib.mjs
2	//
3	// U-XRAY-OCR-TRAINING-LOOP — closed-loop OCR training-data engine (pure core).
4	//
5	// WHY (ready-now, no delta): the full print→CAD→gcode→CAD-gen loop is gated on delta's CAD-gen,
6	// but the print-READING stage trains TODAY. The multi-VLM ensemble (vision-ensemble-fuse.mjs) is a
7	// TEACHER: run it over real prints and the dims models corrob
... [+18353 chars truncated]

### Assistant | 2026-06-17T02:58:35.694Z

I now have all four files end-to-end. Let me trace the critical contracts adversarially against the actual code. Let me verify the `decidePageVerdict` skip conjunction once more and confirm the import-safety guard in page-classify.mjs (already read above), plus check that `classifyImage` is called correctly and `runEnsembleOverImage`'s `models_ok`/`models` shape is what the loop expects.

Let me also confirm there's no other consumer of `classifyImage` or shared state, and double-check the git diff to see exactly what changed (to confirm default-off byte-identity).

### Assistant | 2026-06-17T02:58:37.105Z

[tool_use: Bash]

### Assistant | 2026-06-17T02:58:38.155Z

[tool_use: Bash]

### User | 2026-06-17T02:58:45.241Z

[tool_result] e3fababc90 [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-PAGE-CLASSIFY-NUMCTX-FIX (slot:xray): fix silent empty-response (num_ctx 4096 too small -> 8192)
a2c58ef366 [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-LOOP-DEDUP-OBS (slot:xray): split skippedDone into worklist-dup vs cursor-done + surface TRUE corpus denominator
e80e6e3a41 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-AUTORUN-BUILDLOOP]/U-OLLAMA-VIS
... [+444 chars truncated]

### User | 2026-06-17T02:58:51.022Z

[tool_result] diff --git a/scripts/blueprint-ocr-training-loop.mjs b/scripts/blueprint-ocr-training-loop.mjs
index 66e1f4b051..6fe7cf9a15 100644
--- a/scripts/blueprint-ocr-training-loop.mjs
+++ b/scripts/blueprint-ocr-training-loop.mjs
@@ -45,6 +45,9 @@ import {
   formatCursorLine,
   partitionByResumeCursor,
 } from "./lib/ocr-training-loop-lib.mjs";
+// Optional pre-VLM page gate: skip confident non-drawing
... [+6508 chars truncated]

### Assistant | 2026-06-17T02:59:00.284Z

The git diff is the authoritative source of exactly what changed. This is a clean, isolated diff: import + 2 parseArgs fields + the per-page gate + the all-paperwork cursor branch + 1 report field. Now let me adversarially verify each critical contract.

Let me verify the one external contract I haven't confirmed: does `this_run_pages_skipped_paperwork` report field appear unconditionally (always present, value 0 when off — which is fine, it's additive to the report not a behavior change), and confirm there's no other report-field or by_kind report-shape concern. The diff confirms it's `pagesSkippedPaperwork` which is `0` when off. Let me now adversarially trace the data-loss paths.

Let me verify two adversarial edge cases I want to be certain about:
1. The `decidePageVerdict` confidence-string path — could a string `confidence` slip past the `conf >= floor` check?
2. The all-paperwork cursor mis-fire when `rast.pages.length` differs from the loop iteration count.

### Assistant | 2026-06-17T02:59:09.338Z

[tool_use: Bash]

### User | 2026-06-17T02:59:16.382Z

[tool_result] PASS json confident not-drawing => "skip"
PASS prose negative => "extract"
PASS low conf => "extract"
PASS is_drawing true => "extract"
PASS is_drawing null => "extract"
PASS floor 0 degenerate => "extract"
PASS string confidence => "extract"
PASS NaN confidence => "extract"
PASS empty parse => false
PASS exactly at floor => "skip"
PASS source undefined => "skip"

### Assistant | 2026-06-17T02:59:25.212Z

All the data-loss-safety verdicts hold. Test 11 is the one to scrutinize: a classification with `source` undefined CAN skip (because `source !== "prose"` is true). But this is only reachable from `classifyImage` → `parsePageClassifierResponse`, which ALWAYS sets `source:"json"` or `source:"prose"` on success (verified lines 217, 234), and returns `verdict:"extract"` directly on any failure without ever calling `decidePageVerdict` with a sourceless object. So in the real call path, source is never undefined. The undefined-source skip is only reachable by a synthetic direct call, not via `classifyImage`. Not a live data-loss path.

Now let me verify the `models_ok` field — the loop reads `res.models_ok` to decide a page failed. Let me confirm `runEnsembleOverImage` actually returns that field (a drifted contract here would be a different bug, but it's pre-existing/unchanged). The critical new question: does the page-classify gate correctly interact with the `anyPageOk`/`rast.pages.length` accounting? Let me trace the all-paperwork branch arithmetic adversarially.

### Assistant | 2026-06-17T02:59:32.834Z

[tool_use: Bash]

### User | 2026-06-17T02:59:40.223Z

[tool_result] PASS all-3-paperwork => skipped-all-paperwork
PASS mixed 2skip 1ensemble-fail => skipped-ensemble-failed(+ensembleFailed)
PASS mixed 2skip 1ok => labeled-path
PASS classify off all-fail => skipped-ensemble-failed(+ensembleFailed)
PASS single paperwork => skipped-all-paperwork
PASS classify on 0skip ensemble-fail => skipped-ensemble-failed(+ensembleFailed)

### Assistant | 2026-06-17T02:59:49.448Z

The cursor-honesty branch is correct in every case. The mixed case (some skipped, some ensemble-failed) correctly counts as `ensembleFailed` + `skipped-ensemble-failed`, exactly as the contract requires.

Now let me verify the resume-cursor treats BOTH skip statuses as DONE. `parseCursorDoneSet` keys on `obj.key` regardless of `status` — so any status line (`skipped-all-paperwork`, `skipped-ensemble-failed`, `labeled`, `skipped-missing`) marks the print done. Confirmed at lib lines 239-252: it never inspects `status`, only extracts `key`. A resumed run skips the print. Let me confirm the import-safety guard and run the existing tests to be sure nothing is broken.

### Assistant | 2026-06-17T02:59:50.443Z

[tool_use: Bash]

### Assistant | 2026-06-17T02:59:51.325Z

[tool_use: Bash]

### User | 2026-06-17T02:59:55.721Z

[tool_result] PASS import did not exit; classifyImage type = function
PASS blueprint-ocr-training-loop.mjs imported without running main()

### User | 2026-06-17T03:00:00.647Z

[tool_result] scripts/lib/page-classifier-lib.test.mjs
---ascii-check---
grep: -P supports only unibyte and UTF-8 locales
exit=0 (1=no non-ascii in diff region expected; pre-existing emoji/arrows may match)

### Assistant | 2026-06-17T03:00:07.366Z

Import safety confirmed: both files import cleanly without running `main()`. The `isMain` guard at page-classify.mjs:265-266 (`fileURLToPath(import.meta.url) === resolve(argv[1])`) works, and the loop's guard at line 381 matches.

Let me check the ASCII concern properly. The CONTRACT requires ASCII-only. The diff has comments with `->` and `≤` and the older code has emoji/arrows. Let me check whether the NEW changed lines introduced any non-ASCII (the existing file already has `→`, `⚠`, `🔁`, `≤` which are pre-existing).

### Assistant | 2026-06-17T03:00:11.685Z

[tool_use: Bash]

### User | 2026-06-17T03:05:13.594Z

[tool_result] Command running in background with ID: bzwdlk4s1. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism-slot-xray\e2da5ef3-054c-4ce9-bf15-ccdd4c5dbc63\tasks\bzwdlk4s1.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-17T03:05:16.377Z

The python heredoc spawned a background process (likely a slow Python cold-start). Let me check its output and also run the page-classifier-lib tests directly.

### Assistant | 2026-06-17T03:05:18.698Z

[tool_use: Bash]

### User | 2026-06-17T03:05:22.485Z

[tool_result] Exit code 1
Traceback (most recent call last):
  File "<string>", line 4, in <module>
    for ln in open('/tmp/added_lines.txt',encoding='utf-8'):
              ~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
FileNotFoundError: [Errno 2] No such file or directory: '/tmp/added_lines.txt'

### Assistant | 2026-06-17T03:05:25.505Z

The Git Bash `/tmp` path doesn't map cleanly for the Windows python. Let me use a simpler approach with node, which I know works in this environment.

### Assistant | 2026-06-17T03:05:28.222Z

[tool_use: Bash]

### User | 2026-06-17T03:05:28.987Z

[tool_result] PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)
   THIS chat's bridge is stale-heartbeat (pid 32360 gone) | fleet-wide: 0 mcp-http-bridge processes running (enum-cache 153s old).
   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.
   This block fires ONCE per disconnect episode (~3min), then degraded-
... [+521 chars truncated]

### Assistant | 2026-06-17T03:05:32.916Z

That was the MCP enforcement hook firing again (advisory), not a real command failure. Let me re-run; the hook fires once per ~3min episode.

### Assistant | 2026-06-17T03:05:35.713Z

[tool_use: Bash]

### User | 2026-06-17T03:05:39.847Z

[tool_result] PASS: all ADDED lines pure ASCII

### Assistant | 2026-06-17T03:05:43.348Z

All added lines are pure ASCII. The author deliberately used `--` and `->` in the new comments/logs instead of the `—`/`→` that the pre-existing lines use. Good ASCII discipline. Now let me run the page-classifier-lib test suite to confirm nothing regressed.

### Assistant | 2026-06-17T03:05:44.416Z

[tool_use: Bash]

### User | 2026-06-17T03:05:48.219Z

[tool_result]   ...
# Subtest: a prose negative, end-to-end, does NOT skip at default floor
ok 28 - a prose negative, end-to-end, does NOT skip at default floor
  ---
  duration_ms: 0.0276
  ...
# Subtest: PAGE_KINDS includes drawing + unknown and is frozen
ok 29 - PAGE_KINDS includes drawing + unknown and is frozen
  ---
  duration_ms: 0.0281
  ...
1..29
# tests 29
# suites 0
# pass 29
# fail 0
# cancelled 0
#
... [+41 chars truncated]

### Assistant | 2026-06-17T03:05:53.841Z

All 29 page-classifier-lib tests pass. Now let me verify the default-off byte-identity at the bytecode/control-flow level. The critical claim: when `--page-classify` is absent, `opts.pageClassify` is `false`, so the entire `if (opts.pageClassify)` block at lines 278-287 is dead, `pageClassifySkips` stays 0, and the `allPaperwork` condition at line 318 (`opts.pageClassify && ...`) short-circuits to `false`. Let me confirm there are no OTHER references to the new variables that could leak into the default path.

### Assistant | 2026-06-17T03:05:55.280Z

[tool_use: Grep]

### User | 2026-06-17T03:05:56.247Z

[tool_result] 49:// expensive ensemble. Opt-in via --page-classify; data-loss-safe (skips ONLY a confident not-a-drawing).
50:import { classifyImage } from "./page-classify.mjs";
81:    pageClassify: has("--page-classify"),
82:    pageClassifyMinConf: num("--page-classify-min-conf", undefined), // override the lib's 0.70 skip floor
244:  let scored = 0, totalLabels = 0, trainableLabels = 0, alQueue = 0, ensembl
... [+886 chars truncated]

### Assistant | 2026-06-17T03:06:07.767Z

This confirms the full surface of every new reference. Let me trace each against the default-off (`opts.pageClassify === false`) path:

- **Line 50** (import): top-level, side-effect-free (import-safety verified). No runtime behavior change.
- **Lines 81-82** (parseArgs): `pageClassify=false`, `pageClassifyMinConf=undefined`. Pure data, unread when false.
- **Line 244** (`pagesSkippedPaperwork=0`): a new counter, initialized to 0, only incremented inside the `if (opts.pageClassify)` block (line 281). Stays 0 when off.
- **Line 272** (`pageClassifySkips=0`): per-print local, reset each iteration. Only incremented at line 281 (inside the guard). Stays 0 when off. **Per-print scope confirmed** — declared inside the `for (const entry of todo)` loop body, so it resets every print (no cross-print leakage).
- **Lines 278-287**: fully gated by `if (opts.pageClassify)`. Dead when off.
- **Line 318** (`allPaperwork`): `opts.pageClassify && ...` short-circuits to `false` when off → falls to the `else` (existing `skipped-ensemble-failed`) branch, byte-identical to the original behavior.
- **Line 362** (report field): `this_run_pages_skipped_paperwork: 0` when off. This is an *additive report field*, not a behavior change — the trainset/queue/cursor data files are untouched. The report is a non-load-bearing summary snapshot (`mustHumanVerify`), and adding a `:0` field doesn't alter any consumer's existing-field reads.

Counter scope is correct: `pagesSkippedPaperwork` is run-global (declared at 244, outside the print loop), `pageClassifySkips` is per-print (declared at 272, inside the loop). No leakage.

Let me do one final adversarial check — confirm `runEnsembleOverImage` actually returns `models_ok` (so the gate's interaction with the existing failure detection is sound) and that the new code didn't change the call signature in a way that breaks the default path. The default-path call at line 288 is unchanged by the diff (it's the same `runEnsembleOverImage({ png, models, ...
... [+60 chars truncated]

### Assistant | 2026-06-17T03:06:08.752Z

[tool_use: Bash]

### User | 2026-06-17T03:06:12.554Z

[tool_result] 105:  return { type, mm, confidence, raw_text };
227:    return {
299:  return { dimensions, ambiguous_pairs, summary, per_model };
375:  if (typeof a.imageBase64 !== "string" || !a.imageBase64) return { error: "no imageBase64" };
376:  if (typeof a.model !== "string" || !a.model) return { error: "no model" };
382:  try { writeFile(reqFile, JSON.stringify(body)); } catch (e) { return { error: `wri
... [+1408 chars truncated]

### Assistant | 2026-06-17T03:06:16.756Z

Confirmed: `runEnsembleOverImage` returns `models_ok` (line 444, and in every early-return path). The loop's existing `if (res.models_ok === 0) continue;` check at line 289 is intact and the contract is honored. The diff did not touch that call's signature.

I now have everything I need. Let me compile the verdict. Let me do one last verification of the cursor-done resume behavior with both new statuses, to be fully auditable on contract #3.

### Assistant | 2026-06-17T03:06:22.979Z

[tool_use: Bash]

### User | 2026-06-17T03:06:27.117Z

[tool_result] PASS all-paperwork resumes as DONE => true
PASS ensemble-failed resumes as DONE => true
PASS labeled DONE => true
PASS missing DONE => true
PASS rasterize-failed DONE => true
PASS torn line skipped (no throw) => 5

### Assistant | 2026-06-17T03:06:52.257Z

All contracts verified end-to-end with live execution. Here is my verdict.

---

VERDICT: PASS

summary: The `--page-classify` wiring is data-loss-safe, default-off byte-identical, and cursor-honest. Every new behavior is fully gated by `if (opts.pageClassify)` / `opts.pageClassify && ...`; with the flag absent (the nightly cron path) the weak-label loop is control-flow identical to before — the only delta is one additive report field `this_run_pages_skipped_paperwork:0`, which alters no consumer's existing reads or any durable data file. A real drawing can only be skipped on `cls.verdict==="skip"`, which `decidePageVerdict` grants only on the strict conjunction `is_drawing===false && floor>0 && conf>=floor && source!=="prose"`; every render/parse/curl/classifier failure and every uncertain/low-confidence/string-confidence/NaN case returns `verdict:"extract"` (verified live, 11/11 adversarial cases + 29/29 lib tests).

findings:
- [INFO] `scripts/blueprint-ocr-training-loop.mjs:318` -- Cursor honesty correct: `allPaperwork = opts.pageClassify && pageClassifySkips>0 && pageClassifySkips===rast.pages.length`. The mixed case (some classify-skipped, some ensemble-failed) correctly falls to `ensembleFailed++` + `"skipped-ensemble-failed"` (verified live across 6 scenarios). Both skip statuses resume as DONE via `parseCursorDoneSet` (keys on `obj.key` irrespective of `status`; torn final line fail-soft-skipped). -- no fix needed.
- [INFO] `scripts/blueprint-ocr-training-loop.mjs:244,272` -- Counter scope correct: `pagesSkippedPaperwork` declared run-global outside the print loop; `pageClassifySkips` declared inside the `for (const entry of todo)` body so it resets per-print. No cross-print leakage; both only mutate inside the `opts.pageClassify` guard. -- no fix needed.
- [INFO] `scripts/page-classify.mjs:265-266` -- `isMain` guard correct; live import test confirms neither page-classify.mjs nor the loop runs `main()` on import. -- no fix needed.
- [P2-NON-BLOCKING] `scri
... [+2540 chars truncated]
