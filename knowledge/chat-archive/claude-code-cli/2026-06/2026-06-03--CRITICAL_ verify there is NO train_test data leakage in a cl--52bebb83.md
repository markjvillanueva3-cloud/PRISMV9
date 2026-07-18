---
type: "chat-session"
source: "claude-code-cli"
session_id: "52bebb83-05f5-4200-810d-5da6fce8b4df"
title: "CRITICAL: verify there is NO train/test data leakage in a closed-loop calibratio"
date: "2026-06-03"
first_ts: "2026-06-03T20:32:09.703Z"
last_ts: "2026-06-03T20:33:37.423Z"
cwd: "H:\\prism"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/52bebb83-05f5-4200-810d-5da6fce8b4df/subagents/agent-aebab8d4c1c58982d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# CRITICAL: verify there is NO train/test data leakage in a closed-loop calibratio

> **claude-code-cli** | 2026-06-03 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/52bebb83-05f5-4200-810d-5da6fce8b4df/subagents/agent-aebab8d4c1c58982d.jsonl`

## Transcript

### User | 2026-06-03T20:32:09.703Z

CRITICAL: verify there is NO train/test data leakage in a closed-loop calibration learner. A false "+30.8 held-out accuracy lift" claim would be a serious R12 honesty violation. Read both files end-to-end:

FILE 1: H:/prism/mcp-server/scripts/lathe-closed-loop-trainer.ts
FILE 2: H:/prism/mcp-server/scripts/lib/lathe-roundtrip-core.ts (shared parser/derive/regen/score)

The trainer: samples JM Okuma .MIN programs, splits TRAIN/TEST, learns per-op-category SFM/IPR multipliers = median(master)/median(PRISM-baseline-regen) from TRAIN only, applies them to TEST regen params, reports baseline-vs-calibrated TEST accuracy. Reported: test_baseline 45.2% → test_calibrated 76% (+30.8 held-out lift), overfit_gap 1.5%.

VERIFY RIGOROUSLY:
1. LEAKAGE — are train and test file sets genuinely DISJOINT? Trace: stratifiedSample → shuffle → slice(0,nTest) for test, slice(nTest) for train. Confirm no file appears in both. Confirm the shuffle is on the sampled list and the split is a clean partition.
2. learnCalibration() reads ONLY the train array — confirm it never touches test samples. Confirm the multiplier math (median(master)/median(baseline-regen) per cat, MIN_TRAIN_SAMPLES=3 gate, clamp).
3. measure(test, cal) — confirm it applies the TRAIN-learned cal to TEST regen and scores vs TEST master. Confirm applyCalibration scales sfmByCat/iprByCat per-cat correctly and doesn't mutate the baseline rp (the same s.rp is measured both baseline AND calibrated — confirm applyCalibration returns a NEW object, not mutating s.rp, else baseline measurement is corrupted).
4. Is the baseline-vs-calibrated comparison fair (same test programs, same scorer, only the multiplier differs)?
5. Determinism: seeded rng — is the split reproducible? Note the rng is consumed by stratifiedSample THEN reused for the shuffle — is that a correctness issue or just determinism flavor?
6. Could the 76% be inflated by any artifact (e.g., cats with no test data counted as matched, division quirks, multiplier clamp hi
... [+476 chars truncated]

### Assistant | 2026-06-03T20:32:18.643Z

I'll verify this rigorously. Let me read both files end-to-end.

### Assistant | 2026-06-03T20:32:21.408Z

[tool_use: Read]

### Assistant | 2026-06-03T20:32:21.415Z

[tool_use: Read]

### User | 2026-06-03T20:32:32.881Z

[tool_result] 1	#!/usr/bin/env npx tsx
2	/**
3	 * lathe-closed-loop-trainer.ts — slot:whiskey (Lathe Wizard)
4	 * ==========================================================================
5	 * The CLOSED-LOOP SELF-LEARNING step for print→lathe-program accuracy.
6	 *
7	 * Rung B (lathe-print-to-program-roundtrip-accuracy.ts) showed PRISM plans the
8	 * right OPERATIONS (op-coverage 100%) but its textbook P-grou
... [+14611 chars truncated]

### User | 2026-06-03T20:32:35.811Z

[tool_result] 1	/**
2	 * lathe-roundtrip-core.ts — shared substrate for the lathe print→program
3	 * roundtrip ACCURACY tools (slot:whiskey, WHISKEY-LATHE-ACCURACY-MS0).
4	 * ==========================================================================
5	 * Single source of truth for: JM Okuma .MIN ground-truth parsing, .MIN→TurningInput
6	 * derivation, regenerated-program parameter extraction, scoring, and corpu
... [+12221 chars truncated]

### Assistant | 2026-06-03T20:32:41.273Z

I've read both files end-to-end. Let me trace the critical leakage path with precision, examining the split partition logic and the mutation concern around `applyCalibration`.

### Assistant | 2026-06-03T20:32:44.022Z

[tool_use: Read]

### User | 2026-06-03T20:32:50.936Z

[tool_result] 119	/** Apply the learned profile to a regen param set (scale each sample by its cat multiplier). */
120	function applyCalibration(rp: RegenParams, cal: Calibration): RegenParams {
121	  const out: RegenParams = { cats: rp.cats, ok: rp.ok, toolCount: rp.toolCount, sfmByCat: {}, iprByCat: {} };
122	  for (const [cat, arr] of Object.entries(rp.sfmByCat)) {
123	    const k = cal.sfm[cat as OpCat] ?? 
... [+1527 chars truncated]

### Assistant | 2026-06-03T20:33:37.423Z

I have everything I need. Here is the rigorous verification.

---

## Closed-Loop Calibration Learner — Leakage & Honesty Audit

### 1. LEAKAGE — train/test disjointness — **PASS**

Trace (`trainer.ts:162-172`):
- `walkMin(CORPUS, all)` → full file list (core.ts:70-78).
- `sampled = stratifiedSample(all, n, rng)` → each file is `arr.pop()`'d from its customer bucket exactly once; no file pushed twice (core.ts:109-115). `sampled` has no duplicates.
- `shuffled = [...sampled]` then Fisher-Yates (`trainer.ts:168-169`) — a permutation, introduces/removes nothing.
- `nTest = Math.round(len*testFrac)`; `testFiles = shuffled.slice(0, nTest)`; `trainFiles = shuffled.slice(nTest)` (`trainer.ts:170-172`).

`slice(0,nTest)` ∪ `slice(nTest)` is a **clean, exhaustive, non-overlapping partition** of `shuffled`. Since `shuffled` has unique entries, train ∩ test = ∅. The shuffle is on the sampled list and the split is a clean partition. **No file appears in both sets.** PASS — no P0 leakage at the file level.

### 2. `learnCalibration` reads TRAIN only — **PASS**

`trainer.ts:177` calls `learnCalibration(trainB.samples, a)` — argument is `trainB.samples`, built from `trainFiles` only (`trainer.ts:174`). The function body (`94-117`) iterates `for (const s of train)` exclusively (line 99); it never references `testB`, `testFiles`, or any global test handle. `testB` is built independently at `175`. **No test sample is touched during learning.** PASS.

Multiplier math (`107-114`): per cat, `m = median(masterSfm) / median(regenSfm)`, gated by `masterSfm.length >= MIN_TRAIN_SAMPLES (3)`, clamped to `[0.1, 10]`. Per-program medians collected so each program contributes once (`98-104`), with `rS > 0` / `rI > 0` guards against div-by-zero. Correct.

### 3. `measure(test, cal)` + the mutation concern — **PASS (the critical one)**

This is the trap the prompt flagged: `s.rp` is measured **both** baseline (`measure(testB.samples, band, null)`, line 181) **and** calibrated (`measure(testB.sampl
... [+5823 chars truncated]
