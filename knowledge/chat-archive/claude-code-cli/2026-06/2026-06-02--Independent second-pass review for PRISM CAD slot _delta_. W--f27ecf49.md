---
type: "chat-session"
source: "claude-code-cli"
session_id: "f27ecf49-ca75-4d3e-b761-aa4fa25998f6"
title: "Independent second-pass review for PRISM CAD slot (delta). Weight toward trainin"
date: "2026-06-02"
first_ts: "2026-06-02T03:48:19.585Z"
last_ts: "2026-06-02T03:51:16.305Z"
cwd: "H:\\prism-slot-delta"
messages: 27
user_msgs: 10
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism-slot-delta/f27ecf49-ca75-4d3e-b761-aa4fa25998f6/subagents/agent-a45a3fc9b1ddc0d6e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:42"
---

# Independent second-pass review for PRISM CAD slot (delta). Weight toward trainin

> **claude-code-cli** | 2026-06-02 | 27 msgs (10 user / 17 assistant) | cwd: H:\prism-slot-delta
> Raw: `H:/.claude/projects/H--prism-slot-delta/f27ecf49-ca75-4d3e-b761-aa4fa25998f6/subagents/agent-a45a3fc9b1ddc0d6e.jsonl`

## Transcript

### User | 2026-06-02T03:48:19.585Z

Independent second-pass review for PRISM CAD slot (delta). Weight toward training-corpus integrity + honesty (R12).

FILES:
- H:/prism-slot-delta/scripts/lib/cad-fix-training-ledger.mjs (new fn trainingDataToFixEntries) + .test.mjs (3 new tests)
- H:/prism-slot-delta/scripts/cad-fusion-correction-loop-live.mjs (persistence wiring after the cycle)

This persists the closed-loop's CAD-gen gaps to an accumulating JSONL training corpus (state/shared/cad-fix-training-ledger.jsonl) — the operator's dual-training directive. Each missing feature → a labeled example (absent-in-regen vs present-in-print). Verified live: corpus grew 5→7 on a die run.

CRITICAL CHECKS:
1. TRAINING-CORPUS POISONING risk: could a spurious/unverified "fix" pollute the corpus with a false label? A feature that was NOT actually missing, or a correction that did NOT verify but gets logged as if it did? Trace the note field — does it honestly distinguish verified vs unverified vs not-buildable? (This matters: the corpus trains a model; a mislabeled row degrades training.)
2. Is every logged row a GENUINE training signal (wrong≠right, both non-null)? buildFixEntry enforces this — confirm trainingDataToFixEntries can't bypass it.
3. Are the 3 new tests real oracles (would fail if the mapping were wrong), or vacuous?
4. Append correctness: append-only (never truncates the corpus)? Path resolution correct? Idempotency — does re-running duplicate rows (each run appends its gaps again)? Is that intended (every run IS a fresh labeled observation) or a dedup concern?
5. Fail-soft: a corpus write failure must not crash the run or falsely report success. Confirm out.trainingFixError + out.trainingFixesAppended count are honest.

Report P0/P1/P2/P3 with file:line. End with exactly: GRADE: PASS or GRADE: FAIL.

### Assistant | 2026-06-02T03:48:34.981Z

I'll review these three files with focus on training-corpus integrity and honesty (R12). Let me read them.

### Assistant | 2026-06-02T03:48:35.938Z

[tool_use: Read]

### Assistant | 2026-06-02T03:48:36.228Z

[tool_use: Read]

### User | 2026-06-02T03:48:42.587Z

[tool_result] read-once-guard: 'H:\prism-slot-delta\scripts\lib\cad-fix-training-ledger.mjs' was already read 7s ago in this session and is unchanged (mtime 1780371778587). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### User | 2026-06-02T03:48:43.867Z

[tool_result] 1	// cad-fusion-correction-loop-live.mjs — the THIN live runner: injects the real Fusion bridge into runCorrectionCycle.
2	//
3	// U-CADTP-CORRECTION-LOOP (live half). The orchestrator (cad-fusion-correction-loop.mjs) is pure + offline-proven (fake
4	// bridge: 3/5 → apply radial → 4/5). This runner is the thin live layer that maps each injected dep to a real bridge
5	// call and drives the WHOLE 
... [+11441 chars truncated]

### Assistant | 2026-06-02T03:48:46.613Z

The ledger lib content is in my context from a prior read. Let me view it again to anchor line numbers precisely.

### Assistant | 2026-06-02T03:48:47.238Z

[tool_use: Read]

### User | 2026-06-02T03:48:49.705Z

[tool_result] read-once-guard: 'H:\prism-slot-delta\scripts\lib\cad-fix-training-ledger.mjs' was already read 14s ago in this session and is unchanged (mtime 1780371778587). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_
... [+8 chars truncated]

### Assistant | 2026-06-02T03:48:52.883Z

The guard says the content is in my context, but I need to actually see it to review. Let me use Grep to surface the relevant functions with line numbers.

### Assistant | 2026-06-02T03:48:53.502Z

[tool_use: Bash]

### User | 2026-06-02T03:49:17.372Z

[tool_result]   1 │ // cad-fix-training-ledger.mjs — log every print/CAD fix during closed-loop testing for DUAL training.
  2 │ //
  3 │ // U-CADTP-FIX-LEDGER (operator directive 2026-06-01: "as you test and compare, log any fixes you had to make
  4 │ // to prints and cad so we can train the print reading capabilities at the same time as the cad/cam"). Every
  5 │ // correction made while replicating a refere
... [+8634 chars truncated]

### Assistant | 2026-06-02T03:49:20.018Z

Now let me see the test file and the upstream `correctionsToTrainingData` producer to verify the contract `trainingDataToFixEntries` consumes.

### Assistant | 2026-06-02T03:49:21.437Z

[tool_use: Bash]

### Assistant | 2026-06-02T03:49:22.540Z

[tool_use: Grep]

### User | 2026-06-02T03:49:31.472Z

[tool_result] 14:// does NOT confirm the expected signature is recorded verified:false (never claimed fixed). An apply that throws is
22:import { proposeFeatureCorrections, verifyCorrectionApplied, correctionsToTrainingData } from "./cad-fusion-feature-correction.mjs";
29:export function geometryToCandidatePrint(faces, { partAxis = null, partClass = null, minConfidence = 0.3 } = {}) {
32:  const candidatePrint 
... [+2612 chars truncated]

### User | 2026-06-02T03:49:42.526Z

[tool_result]   1 │ // Tests for cad-fix-training-ledger.mjs — dual-training fix logging (print-reader + cad-gen from one corpus).
  2 │ //
  3 │ // Load-bearing intents (R9/R12): (1) a fix needs BOTH wrong+right or it's rejected (a signal-less example is
  4 │ // worse than none); (2) wrong===right is rejected (not a fix); (3) domain routing tags are correct so xray
  5 │ // tails print rows and delta tails ca
... [+7930 chars truncated]

### Assistant | 2026-06-02T03:49:46.017Z

Now let me see the exact producer `correctionsToTrainingData` to confirm the field names that `trainingDataToFixEntries` consumes (`missingFeature`, `buildOp`, `buildable`, `verified`, `note`, `partClass`).

### Assistant | 2026-06-02T03:49:47.709Z

[tool_use: Grep]

### User | 2026-06-02T03:49:54.524Z

[tool_result] 11:// probe does not capture → buildable:false with an explicit reason; we never "add a chamfer" and then silently claim
12-// the feature is present when no probe could ever confirm it. Every op carries expectGeometry so the runner can
13-\ MEASURE the result rather than assume it. Unknown kinds are skipped with a caveat, never guessed. Pure. Owner: slot:delta.
--
32:// the inverse map: functiona
... [+4056 chars truncated]

### Assistant | 2026-06-02T03:49:57.023Z

I now have the full producer→consumer contract. Let me verify the two critical correctness questions by checking the producer's exact field semantics and run the tests to confirm they pass and are real oracles.

### Assistant | 2026-06-02T03:49:58.229Z

[tool_use: Bash]

### User | 2026-06-02T03:50:11.345Z

[tool_result]   ...
# Subtest: trainingDataToFixEntries: a verified vs unverified correction is distinguishable in the note
ok 13 - trainingDataToFixEntries: a verified vs unverified correction is distinguishable in the note
  ---
  duration_ms: 0.1766
  ...
# Subtest: trainingDataToFixEntries: empty / malformed / no-missingFeature → [] (no fabricated signal, no throw)
ok 14 - trainingDataToFixEntries: empty / 
... [+206 chars truncated]

### Assistant | 2026-06-02T03:50:19.268Z

14/14 pass. Now I have everything needed for the review. Let me trace each critical check thoroughly against the producer/consumer contract.

Key trace facts:
- Producer `correctionsToTrainingData` (line 117-128) emits `{ kind:"feature-correction", partClass, missingFeature, buildOp, buildable, verified, note }`. `verified` is `c.buildable ? !!verified[c.kind] : false`. For undetectable features (`bevel_face_chamfer`), `buildable:false`, `verified:false`, `note:c.reason`.
- Consumer `trainingDataToFixEntries` (line 95-112) builds the `note` itself when `td.buildable` is true (ignoring `td.note` from producer in that branch), and uses `td.note` only when not buildable.
- The live runner wires `correctionsToTrainingData`'s output (`result.trainingData`) → `trainingDataToFixEntries` → `recordFix` (loop-live lines 128-137).

Now let me verify the append path is genuinely append-only and the partClass fallback works.

### Assistant | 2026-06-02T03:50:20.351Z

[tool_use: Grep]

### User | 2026-06-02T03:50:34.229Z

[tool_result] 16:import { writeFileSync, readFileSync, existsSync, readdirSync, appendFileSync } from "node:fs";
22:import { trainingDataToFixEntries, recordFix, FIX_LEDGER_REL } from "./lib/cad-fix-training-ledger.mjs";
55:  if (loaded.error) { out.error = "PRINT-LOAD: " + loaded.error; writeFileSync(LEDGER, JSON.stringify(out, null, 2)); console.log("ABORT " + out.error); process.exit(2); }
60:  if (!health.o
... [+751 chars truncated]

### Assistant | 2026-06-02T03:51:16.305Z

I have the complete picture. Here is my independent second-pass review.

---

## Review — CAD-gen dual-training corpus persistence (slot delta)

Focus: training-corpus integrity + honesty (R12). I traced the full producer→consumer→sink contract: `correctionsToTrainingData` (`cad-fusion-feature-correction.mjs:117`) → `result.trainingData` (`cad-fusion-correction-loop.mjs:104`) → `trainingDataToFixEntries` (`cad-fix-training-ledger.mjs:95`) → `recordFix`/`buildFixEntry` → `appendFileSync`.

### CRITICAL CHECK 1 — Corpus poisoning risk: PASS (honest labeling)

The note field honestly distinguishes all three states. `trainingDataToFixEntries` (`cad-fix-training-ledger.mjs:100-102`) computes the note from the *outcome*, not from a fixed string:
- `buildable && verified` → `"closed via <op> (re-probe verified)"`
- `buildable && !verified` → `"correction <op> proposed, NOT verified"`
- `!buildable` → `td.note` or `"not buildable (undetectable feature)"`

Crucially, the upstream `verified` flag is itself honest: `cad-fusion-correction-loop.mjs:85-94` records `verified:false` on every failure path (apply threw, apply not-ok, re-probe failed, signature not observed), and `correctionsToTrainingData:125` forces `verified:false` whenever `!buildable`. The whole-run `unverifiedGain` guard (`correction-loop.mjs:110`) catches a score that rose with zero verified corrections. So a correction that did NOT verify can never be logged as if it did — the note will say "NOT verified". **No false-positive poisoning.**

One important nuance worth naming (not a defect): the `wrong`/`right` payload is a *constant pair* — `"absent-in-regen"` vs `"present-in-print"` (`:106`). Every row carries the identical learnable label; the only per-row discriminator is `field` (the feature name) and `note`. That is the correct semantic for a "missing-feature" signal (the model learns "this feature class should be generated"), and `field` = `td.missingFeature` is the genuine variable. But it means a downstr
... [+5863 chars truncated]
