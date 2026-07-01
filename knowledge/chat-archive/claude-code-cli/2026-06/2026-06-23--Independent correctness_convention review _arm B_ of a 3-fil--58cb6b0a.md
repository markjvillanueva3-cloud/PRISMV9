---
type: "chat-session"
source: "claude-code-cli"
session_id: "58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d"
title: "Independent correctness/convention review (arm B) of a 3-file change in H:/prism"
date: "2026-06-23"
first_ts: "2026-06-23T13:25:39.922Z"
last_ts: "2026-06-23T13:31:11.317Z"
cwd: "H:\\prism"
messages: 65
user_msgs: 24
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d/subagents/agent-a15efc7c0dce60999.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Independent correctness/convention review (arm B) of a 3-file change in H:/prism

> **claude-code-cli** | 2026-06-23 | 65 msgs (24 user / 41 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d/subagents/agent-a15efc7c0dce60999.jsonl`

## Transcript

### User | 2026-06-23T13:25:39.922Z

Independent correctness/convention review (arm B) of a 3-file change in H:/prism. Grade PASS or FAIL with P0/P1/P2 findings and file:line citations. Read each file end-to-end; do not assume another reviewer caught everything.

CHANGE (Unit A "U-XRAY-CALIB-ACCUMULATE"): the blueprint-OCR closed-loop calibration now accumulates {f,correct} agreement samples into a durable JSONL store across nightly runs so it crosses MIN_RELIABLE_SAMPLES (50) instead of being stuck at n≈24 reliable:false. New module = scripts/lib/calibration-sample-store.mjs (+ .test.mjs, 17 passing). Edited = scripts/blueprint-ocr-training-loop.mjs (import, args, calibrate block, report fields). See `git -C H:/prism diff` and `git -C H:/prism status` for the exact change.

Weight your review toward what an analyst is less likely to catch:
- **Ring-buffer correctness:** mergeCalibrationSamples keeps the most-recent `cap` with `combined.slice(totalBeforeCap - cap)`; fresh is concatenated last so it must always survive a cap. Confirm the slice math is right (off-by-one?) and that fresh-larger-than-cap keeps fresh's newest.
- **Provenance / forward-compat:** samples carry source+ts; calibrateAgreement only reads {f,correct}. Confirm extra fields don't break the calibrator and that mixing source="synthetic-gt" with a future source="program-gt" is additive.
- **Default-ON safety:** the store defaults ON at a FIXED repo path (state/shared/ocr-training-loop/calibration-samples.jsonl), independent of --out-dir. Confirm this is the intended behavior change (accumulation is the new default) and that it cannot silently corrupt a real running nightly cron. Is the default path sensible/discoverable next to trainset.jsonl?
- **Convention conformance:** ASCII-only, matches the heavily-documented scripts/lib idiom, NodeNext .js-suffix imports not needed for .mjs, run-as-main not applicable (pure lib). Commit-message scope will be `[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-CALIB-ACCUMULATE (slot:xray):`.
- **Coupling
... [+321 chars truncated]

### Assistant | 2026-06-23T13:25:44.220Z

I'll review this 3-file change. Let me start by examining the exact diff and status.

### Assistant | 2026-06-23T13:25:44.607Z

[tool_use: Bash]

### User | 2026-06-23T13:25:48.758Z

[tool_result] <persisted-output>
Output too large (66.6MB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d\tool-results\bniaw7vus.txt

Preview (first 2KB):
On branch cad-fusion-live-ms0
Your branch is ahead of 'origin/cad-fusion-live-ms0' by 4987 commits.
  (use "git push" to publish your local commits)

Changes not staged for commit:
  (use "git add <file>..
... [+1748 chars truncated]

### Assistant | 2026-06-23T13:25:56.951Z

The full diff is enormous due to many unrelated modified files. Let me scope the diff to only the 3 files in this change.

### Assistant | 2026-06-23T13:25:57.996Z

[tool_use: Bash]

### User | 2026-06-23T13:25:59.678Z

[tool_result] diff --git a/scripts/blueprint-ocr-training-loop.mjs b/scripts/blueprint-ocr-training-loop.mjs
index 314fd1009b..bde1a6088f 100644
--- a/scripts/blueprint-ocr-training-loop.mjs
+++ b/scripts/blueprint-ocr-training-loop.mjs
@@ -50,6 +50,13 @@ import {
   partitionByResumeCursor,
   isCorpusDrained,
 } from "./lib/ocr-training-loop-lib.mjs";
+import {
+  DEFAULT_SAMPLE_CAP,
+  loadCalibrationStore,

... [+4563 chars truncated]

### Assistant | 2026-06-23T13:26:03.195Z

Now let me read the new library module end to end, plus the test file.

### Assistant | 2026-06-23T13:26:03.430Z

[tool_use: Read]

### Assistant | 2026-06-23T13:26:03.533Z

[tool_use: Read]

### User | 2026-06-23T13:26:04.089Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\calibration-sample-store.mjs' was already read 33s ago in this session and is unchanged (mtime 1782220847425). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-23T13:26:04.410Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\calibration-sample-store.test.mjs' was already read 32s ago in this session and is unchanged (mtime 1782220897414). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### Assistant | 2026-06-23T13:26:24.037Z

The read-once guard claims these were already read this session, but they are not in my context (this is a fresh agent thread). Let me disable the cache and read them.

### Assistant | 2026-06-23T13:26:26.052Z

[tool_use: Bash]

### User | 2026-06-23T13:26:30.674Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * calibration-sample-store.mjs -- durable cross-run accumulation of agreement
     4	 * calibration samples for the blueprint-OCR closed loop (and any other
     5	 * isotonic-agreement calibrator that is starved for samples per single run).
     6	 *
     7	 * Why this exists: `blueprint-ocr-training-loop.mjs` PHASE-1 calibrates
     8	 * P(consensus 
... [+9582 chars truncated]

### Assistant | 2026-06-23T13:26:35.921Z

Now the test file.

### Assistant | 2026-06-23T13:26:36.711Z

[tool_use: Bash]

### User | 2026-06-23T13:26:38.845Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * calibration-sample-store.test.mjs -- node:test coverage for the durable
     4	 * cross-run calibration-sample accumulation store (Unit A).
     5	 *
     6	 * Run directly (node:test auto-runs on exit): `node calibration-sample-store.test.mjs`
     7	 * (NOT `node --test <file>` -- that ran 0 tests in this env, per CLAUDE.md).
     8	 */
     9	
   
... [+11056 chars truncated]

### Assistant | 2026-06-23T13:26:42.525Z

Now let me verify the surrounding context in the runner: the `calibrateAgreement` signature, `REPO_ROOT` definition, the `num`/`get`/`has` arg helpers, and the report-schema consumers. Let me read the relevant parts of the runner and the lib that exports `calibrateAgreement`.

### Assistant | 2026-06-23T13:26:43.807Z

[tool_use: Bash]

### Assistant | 2026-06-23T13:26:45.099Z

[tool_use: Grep]

### User | 2026-06-23T13:26:47.669Z

[tool_result] #!/usr/bin/env node
// scripts/blueprint-ocr-training-loop.mjs
//
// U-XRAY-OCR-TRAINING-LOOP — the closed-loop OCR training-data engine (runner).
//
// Trains the print-READING stage TODAY, without delta's CAD-gen. Three phases:
//   1. CALIBRATE — generate perfect-GT synthetic prints (mixed difficulty) → multi-VLM ensemble →
//      measure P(consensus dim CORRECT | corroboration k) → isotonic c
... [+2965 chars truncated]

### User | 2026-06-23T13:26:50.632Z

[tool_result] 64:const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
66:const GEN = join(REPO_ROOT, "scripts", "lib", "synthetic-print-gen.py");
73:  const get = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
74:  const getAll = (f) => args.reduce((acc, a, i) => (a === f && args[i + 1] ? acc.concat(args[i + 1]) : acc), []);
75:  const has = (f) => args.includes(
... [+390 chars truncated]

### Assistant | 2026-06-23T13:26:54.789Z

Good. `REPO_ROOT` is defined at line 64, `get`/`has`/`num` are local helpers in `parseArgs`. Now let me verify the `calibrateAgreement` signature and the report-schema consumers. Let me look at `ocr-training-loop-lib.mjs` for `calibrateAgreement`, and grep for consumers of the report file's `calibrate` field.

### Assistant | 2026-06-23T13:26:56.187Z

[tool_use: Grep]

### Assistant | 2026-06-23T13:26:57.379Z

[tool_use: Grep]

### User | 2026-06-23T13:26:57.748Z

[tool_result] 48:export function calibrateAgreement(samples) {
49-  const rows = (Array.isArray(samples) ? samples : []).filter((s) => s && Number.isFinite(s.f) && s.f > 0 && s.f <= 1);
50-  const agg = new Map(); // fKey → {n, correct}
51-  for (const s of rows) {
52-    const f = fracKey(s.f);
53-    const a = agg.get(f) || { n: 0, correct: 0 };
54-    a.n += 1; if (s.correct === true) a.correct += 1;
55-    
... [+1231 chars truncated]

### User | 2026-06-23T13:26:59.816Z

[tool_result] scripts\blueprint-ocr-training-loop.mjs:493:      calibrate: { count_attempted: opts.calibrateCount, cases: calCases, samples: calSamples.length,
scripts\blueprint-ocr-training-loop.mjs:494:        calibration_samples_used: calMerge.merged.length, fresh_samples_appended: calStoreWritten,
scripts\blueprint-ocr-training-loop.mjs:495:        store_path: opts.calibrationStore, store_capped: calMerge.c
... [+2576 chars truncated]

### Assistant | 2026-06-23T13:27:50.463Z

`calibrateAgreement(samples)` reads only `.f` and `.correct` (lines 49-54) - confirmed: extra provenance fields (source/ts) are ignored, forward-compatible. The only consumer of the report's `calibrate` field within scripts is the writer itself. Now let me check for consumers of the report JSON outside scripts (xray-trainset-to-lora, observability surfaces). Let me find the report filename and grep for it.

### Assistant | 2026-06-23T13:27:52.669Z

[tool_use: Bash]

### User | 2026-06-23T13:27:54.396Z

[tool_result]         }
        continue;
      }
      try { appendFileSync(cursorPath, formatCursorLine({ key, status: "labeled", trainable: printTrainable, n_models: models.length, ts: new Date().toISOString() })); }
      catch (e) { console.error(`    ⚠ cursor append failed: ${e instanceof Error ? e.message : String(e)}`); }

      scored++;
      const capNote = rast.capped ? ` (capped ${MAX_PAGES_PER_PRI
... [+3713 chars truncated]

### Assistant | 2026-06-23T13:28:01.799Z

Now let me check the consumers of the report schema. The note mentions `xray-trainset-to-lora.mjs` for trainset rows. Let me check whether any consumer reads the report's `calibrate` key set and asserts exact keys, and confirm the report path/filename.

### Assistant | 2026-06-23T13:28:05.383Z

[tool_use: Grep]

### Assistant | 2026-06-23T13:28:06.076Z

[tool_use: Grep]

### User | 2026-06-23T13:28:08.164Z

[tool_result] 320:  const reportPath = join(opts.outDir, "training-loop-report.json");

### User | 2026-06-23T13:28:08.633Z

[tool_result] Found 1 file
scripts\blueprint-ocr-training-loop.mjs

### Assistant | 2026-06-23T13:28:15.410Z

The report is `training-loop-report.json`. Let me check whether any consumer reads `training-loop-report.json` and asserts the `calibrate` key set. Let me grep for the report filename across the repo, and check the report's `calibrate` access in any consumer.

### Assistant | 2026-06-23T13:28:16.802Z

[tool_use: Grep]

### User | 2026-06-23T13:28:23.312Z

[tool_result] knowledge\memories\reference\reference_xray_ensemble_nondim_union_2026_06_23.md:28:**Test-state side effect (harmless):** my live runs appended 3 temp-basename entries to `state/shared/ocr-training-loop/processed-cursor.jsonl` (2 dense scans skipped-ensemble-failed + 1 synthetic) + overwrote `training-loop-report.json` with the synthetic test run. Temp basenames never collide with the real worklis
... [+5282 chars truncated]

### Assistant | 2026-06-23T13:28:29.143Z

The report file is only referenced in the runner itself plus `defer-queue.json` entries (just file-path records, not schema consumers). No code consumer reads `training-loop-report.json`'s `calibrate` key set. Now let me verify two things: (1) the runner's nightly cron invocation - whether it passes `--out-dir` and whether the fixed default store path could collide; and (2) whether `--worklist` is a real arg (mentioned in WEAK-LABEL but not in usage). Let me also check `xray-trainset-to-lora.mjs` doesn't read the report. Let me check the cron/nightly invocation.

### Assistant | 2026-06-23T13:28:30.565Z

[tool_use: Grep]

### User | 2026-06-23T13:28:36.833Z

[tool_result] Found 30 files limit: 30
state\shared\.fleet-reaper-enum-cache-DESKTOP-N7MI1VB.json
state\shared\dashboards\injection-dedup-cache.json
state\token-economy-session.json
state\shared\AGENT_CHAT.md
mcp-server\data\state\session-file-ownership.json
state\HANDOFF.md
knowledge\memories\galaxies\blueprint-vision\MEMORY.md
knowledge\memories\reference\reference_xray_trainloop_multipage_units_2026_06_22.md
... [+1934 chars truncated]

### Assistant | 2026-06-23T13:28:45.583Z

No `.ps1` cron installer or scheduled-task references the runner directly (the matches are all memory/state files, not invocation scripts). Let me confirm there's no scheduled-task / cron that passes a custom `--out-dir` (which would make the fixed default store path diverge from the trainset location), and check whether the `--worklist` flag actually exists. Let me check the args parsing more fully and look for any cron installer.

### Assistant | 2026-06-23T13:28:46.414Z

[tool_use: Grep]

### Assistant | 2026-06-23T13:28:47.449Z

[tool_use: Grep]

### User | 2026-06-23T13:28:48.034Z

[tool_result] 24://        [--out-dir state/shared/ocr-training-loop] [--max-time-sec 300] [--json]
82:    worklist: get("--worklist", null),     // newline file of print PNG paths (corpus-scale lane)
91:    outDir: get("--out-dir", join(REPO_ROOT, "state", "shared", "ocr-training-loop")),
99:    // every print is cursored. Meaningful only with --worklist (corpus lane); no behavior change otherwise.
131:    // 
... [+728 chars truncated]

### User | 2026-06-23T13:28:49.312Z

[tool_result] scripts\run-ocr-training-loop-overnight.ps1:4:# blueprint-ocr-training-loop.mjs calibrates the ensemble trust function on synthetic-GT prints, then
scripts\run-ocr-training-loop-overnight.ps1:31:  'H:\prism\scripts\blueprint-ocr-training-loop.mjs',

### Assistant | 2026-06-23T13:28:51.865Z

There's an overnight cron runner. Let me read it to confirm whether it passes `--out-dir` (which would diverge from the fixed default store path) and how it invokes the loop.

### Assistant | 2026-06-23T13:28:52.296Z

[tool_use: Read]

### User | 2026-06-23T13:28:54.407Z

[tool_result] read-once-guard: 'H:\prism\scripts\run-ocr-training-loop-overnight.ps1' was already read 2m ago in this session and is unchanged (mtime 1782152075771). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-23T13:28:57.490Z

[tool_use: Bash]

### User | 2026-06-23T13:29:00.120Z

[tool_result]      1	# run-ocr-training-loop-overnight.ps1 - reaper-immune + console-allocated CLOSED-LOOP TRAINING launcher.
     2	#
     3	# Sister to run-ocr-batch-overnight.ps1 (the raw-OCR-extract lane). This runs the TRAINING lane:
     4	# blueprint-ocr-training-loop.mjs calibrates the ensemble trust function on synthetic-GT prints, then
     5	# weak-labels the real drawing corpus into a tiered (gold/s
... [+6879 chars truncated]

### Assistant | 2026-06-23T13:29:12.213Z

This is the critical finding for the default-ON safety analysis. The cron passes `--out-dir 'H:\prism\state\shared\ocr-training-loop\corpus-train'`, but the new calibration store defaults to a FIXED path `state/shared/ocr-training-loop/calibration-samples.jsonl` (the parent dir, NOT `corpus-train`). So in the live nightly run:

- trainset.jsonl / cursor / report go to `corpus-train/`
- calibration store goes to `ocr-training-loop/calibration-samples.jsonl` (one level up)

This is the documented intent (the comment explicitly says "stable across --out-dir changes"). Let me verify the directory exists / is writable and that there's no collision concern. Let me check the actual filesystem layout and confirm there's no existing file that would be unexpectedly appended to.

### Assistant | 2026-06-23T13:29:15.582Z

[tool_use: Bash]

### User | 2026-06-23T13:29:20.482Z

[tool_result] total 2287
drwxr-xr-x 1 wompu 197611      0 Jun 23 03:00 .
drwxr-xr-x 1 wompu 197611      0 Jun 23 08:29 ..
-rw-r--r-- 1 wompu 197611   1773 Jun  8 10:54 _commitmsg.txt
-rw-r--r-- 1 wompu 197611 637842 Jun  8 14:36 _diag-t11bt.png
-rw-r--r-- 1 wompu 197611   1265 Jun 23 03:03 active-learning-queue.jsonl
-rw-r--r-- 1 wompu 197611  69237 Jun 16 17:38 AL-QUEUE-GOLD-REVIEW.json
-rw-r--r-- 1 wompu 1976
... [+3584 chars truncated]

### Assistant | 2026-06-23T13:29:28.336Z

Important observation. The live nightly cron writes its trainset/cursor/report into `corpus-train/`, but the new calibration store will land at the PARENT `state/shared/ocr-training-loop/calibration-samples.jsonl`. So the store is NOT discoverable next to `corpus-train/trainset.jsonl` — it sits one directory level up, alongside the parent-dir's stale `trainset.jsonl` (from Jun 4, a different/old run). 

There's no existing `calibration-samples.jsonl` to corrupt, and the format is fresh JSONL, so there's no corruption risk. This is the documented intent ("stable across --out-dir changes"), and the rationale is sound: a fixed path means the corpus accumulates even if the operator changes `--out-dir`. This is a deliberate design tradeoff, not a bug. I'll note the discoverability nuance as P2.

Now let me verify the ring-buffer slice math carefully and the `--until-complete` fast-exit path (does the calibration block even run on a drained corpus, or does the cron's `--until-complete` fast-exit BEFORE the new calibrate block, meaning the store never accumulates in the steady state?). Let me check the `--until-complete` early-exit logic relative to the calibrate block.

### Assistant | 2026-06-23T13:29:29.779Z

[tool_use: Bash]

### User | 2026-06-23T13:29:31.257Z

[tool_result] async function main() {
  const opts = parseArgs(argv.slice(2));

  // --until-complete fast-exit (operator 2026-06-19 "do it all until complete"): a frequent BACKSTOP
  // relaunch on an already-DRAINED corpus must not burn GPU re-running the 24-print calibration. Cheaply
  // read the worklist + resume cursor and exit 0 if every distinct print is cursored. Reuses the pure
  // partition core (is
... [+4976 chars truncated]

### Assistant | 2026-06-23T13:30:14.845Z

This reveals a real correctness concern about whether accumulation actually works in the live cron's steady state. Let me reason through it carefully:

**`--until-complete` fast-exit interaction:** In the live cron (`--until-complete --worklist ...`), once the corpus is DRAINED, `main()` returns at line 245 (`Fast-exit (no calibration, no work)`) BEFORE the new calibrate/accumulate block. So in the steady-state continuous backstop (the corpus is done, relaunches idle cheaply), the store does NOT accumulate. But that's correct/intended: the accumulation must happen during the run-to-completion phase. As long as the corpus is NOT yet drained, every relaunch runs calibration (`--calibrate-count 24`) and appends 24-ish samples. The comment at line 32-37 in the .ps1 confirms calibration re-runs each launch. So over the multi-day grind, each relaunch (reaper kill + 30-min auto-resume) appends another batch. Within a handful of relaunches the store crosses 50. That works.

However, there's a subtler point worth verifying: the cron is now `-Continuous` (ONE run grinds the whole corpus). If it runs to completion in ONE process without dying, the calibrate block runs exactly ONCE (calibration happens at the start of `main()`, before the weak-label loop). So a single uninterrupted continuous run appends only ONE batch of ~24 — still under 50 — and the store would only cross 50 on the SECOND launch. That's still fine (it accumulates across launches, exactly as designed), but it means "crosses MIN_RELIABLE over a few nightly runs" requires multiple process launches, which the continuous model makes less frequent. Not a bug — accumulation is monotone and correct — just a timing nuance. I'll note it as informational, not a finding, since the design goal (durable accumulation) is met.

Now let me carefully verify the ring-buffer slice math with concrete cases.

The slice: `combined.slice(totalBeforeCap - cap)` when `totalBeforeCap > cap`.

- Case A: persisted=10, fresh=2, cap=5. co
... [+864 chars truncated]

### Assistant | 2026-06-23T13:30:17.210Z

[tool_use: Bash]

### User | 2026-06-23T13:30:21.385Z

[tool_result]   ...
# Subtest: appendCalibrationStore: no valid samples -> writes nothing, returns 0
ok 14 - appendCalibrationStore: no valid samples -> writes nothing, returns 0
  ---
  duration_ms: 0.6471
  ...
# Subtest: resetCalibrationStore: truncates
ok 15 - resetCalibrationStore: truncates
  ---
  duration_ms: 1.6011
  ...
# Subtest: accumulation flips calibration reliable:false -> true across MIN_RELIAB
... [+393 chars truncated]

### Assistant | 2026-06-23T13:30:28.174Z

17/17 pass, confirmed. The tests are real reference-value/algebraic-invariant asserts (the "accumulation flips reliable:false→true" test at line 196-215 is the load-bearing one and would genuinely fail if the merge logic broke). No `.skip`/`.only`.

Now let me verify a few remaining correctness details:

1. ASCII-only check on the new lib file (the runner already has emoji/non-ASCII, but the new lib should be clean per convention).
2. Confirm the `appendCalibrationStore` is called with `calSamples` (NOT `calMerge.merged`), so it appends only fresh, not the whole merged set (otherwise it would double-count persisted on every run).

The append (line 290) uses `calSamples` (fresh only). Correct — appending `calMerge.merged` would re-persist the already-stored samples, causing geometric growth. Good. Let me check ASCII-cleanliness of the new lib and test files.

### Assistant | 2026-06-23T13:30:29.231Z

[tool_use: Bash]

### User | 2026-06-23T13:30:38.217Z

[tool_result] ASCII-CLEAN: both files are pure ASCII

### Assistant | 2026-06-23T13:31:11.317Z

Both new files are pure ASCII. The runner edits added one non-ASCII char (the `⚠` already exists in the surrounding console.log block at line 296, matching the file's existing convention; the new line 295 `console.log` uses `->` and no emoji, consistent). Let me verify the runner edit didn't introduce any new non-ASCII inconsistency relative to the surrounding lines — the existing file already uses emoji/arrows liberally, so matching it is correct convention conformance.

Let me do a final check on one edge case I want to be certain about: the `resetCalibStore` ordering. `--reset-calibration-store` calls `resetCalibrationStore` (truncate), THEN `loadCalibrationStore` returns `[]`, THEN after calibrating, `appendCalibrationStore` writes this run's fresh samples. So a reset run still seeds the store with the current run's samples. That's sensible (reset = "start the corpus over from this run"), not a wipe-and-leave-empty. Correct.

Let me also confirm there's no issue with `calibrationStoreCap` being passed through when `--no-calibration-store` is set (calibrationStore=null). When null, the load returns `[]`, merge runs on `([], calSamples)` and `calibrateAgreement` runs on fresh-only — byte-identical to pre-accumulation behavior. The `console.log` corpus line and append are both gated on `opts.calibrationStore` truthiness, so with `--no-calibration-store` nothing prints/writes. Confirmed the revert path is clean.

One last verification: confirm `num("--calibration-store-cap", DEFAULT_SAMPLE_CAP)` — `num` returns `d` (the default `DEFAULT_SAMPLE_CAP`) when not finite, then `Math.max(1, ...)`. If an operator passes `--calibration-store-cap 0`, `num` returns 0 (finite), `Math.max(1,0)=1` → cap floored to 1. Then `mergeCalibrationSamples` would keep only the single most-recent sample, making calibration permanently under-powered. That's an operator-supplied footgun but bounded and not the default; the `Math.max(1,...)` prevents a zero/negative cap from breaking the slice
... [+3669 chars truncated]
