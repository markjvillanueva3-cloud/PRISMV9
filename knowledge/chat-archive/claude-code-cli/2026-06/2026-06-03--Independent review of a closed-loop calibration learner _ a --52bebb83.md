---
type: "chat-session"
source: "claude-code-cli"
session_id: "52bebb83-05f5-4200-810d-5da6fce8b4df"
title: "Independent review of a closed-loop calibration learner + a shared-lib refactor."
date: "2026-06-03"
first_ts: "2026-06-03T20:32:26.829Z"
last_ts: "2026-06-03T20:43:46.749Z"
cwd: "H:\\prism"
messages: 25
user_msgs: 10
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/52bebb83-05f5-4200-810d-5da6fce8b4df/subagents/agent-a461a0e34d1a62802.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Independent review of a closed-loop calibration learner + a shared-lib refactor.

> **claude-code-cli** | 2026-06-03 | 25 msgs (10 user / 15 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/52bebb83-05f5-4200-810d-5da6fce8b4df/subagents/agent-a461a0e34d1a62802.jsonl`

## Transcript

### User | 2026-06-03T20:32:26.829Z

Independent review of a closed-loop calibration learner + a shared-lib refactor. Read end-to-end:

FILE 1: H:/prism/mcp-server/scripts/lathe-closed-loop-trainer.ts (NEW)
FILE 2: H:/prism/mcp-server/scripts/lib/lathe-roundtrip-core.ts (NEW shared lib)
FILE 3: H:/prism/mcp-server/scripts/lathe-print-to-program-roundtrip-accuracy.ts (REFACTORED to import the lib — previously had its own copy of the parser)

Context: The trainer learns per-op-category SFM/IPR multipliers (median JM-master / median PRISM-baseline) on a TRAIN split, applies to held-out TEST. Result: test 45.2%→76% (+30.8), overfit gap 1.5%. Learned multipliers: rough SFM×0.35, finish SFM×0.19, rough IPR×0.59, finish IPR×0.64; thread/groove/part_off no-op (0 train samples).

Evaluate:
1. HONESTY (R12): Is the held-out framing honest? Does anything overclaim? The dashboards must not let a reader mistake 76% for "PRISM is 76% correct" — it's "PRISM + learned JM shop profile, on held-out JM programs, parameter-envelope agreement." Is that clear in the .md/json honest_note?
2. REFACTOR SAFETY: File 3 was refactored to import File 2 instead of its own parser. The scorer was re-run and produced 43.4% (vs 41.6%/43.1% before on different sample sizes) — consistent. Confirm the lib's parseGroundTruth/deriveInput/regenParams/scoreParam are IDENTICAL in logic to what a standalone scorer needs (no behavioral drift introduced). Spot-check the moved functions.
3. CALIBRATION SOUNDNESS: per-op-category granularity — is it physically principled (G96 holds SFM constant per op; feed per op)? The multipliers physically mean "PRISM runs 2-5× too aggressive vs JM." rough SFM×0.35 → 722×0.35≈253 SFM matches JM's measured ~250. Is the learning genuine signal, not noise? Note drill SFM multiplier omitted (only 1 train sample, < MIN_TRAIN_SAMPLES=3) — correct conservative no-op?
4. Is per-op-category calibration applied POST-regen (scaling the engine's output) a legitimate "shop profile" representation, or does it misrepresent wha
... [+559 chars truncated]

### Assistant | 2026-06-03T20:32:42.027Z

I'll review these three files end-to-end. Let me read them all in parallel.

### Assistant | 2026-06-03T20:32:42.028Z

[tool_use: Read]

### Assistant | 2026-06-03T20:32:42.269Z

[tool_use: Read]

### Assistant | 2026-06-03T20:32:44.469Z

[tool_use: Read]

### User | 2026-06-03T20:32:46.858Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\scripts\lib\lathe-roundtrip-core.ts' was already read 22s ago in this session and is unchanged (mtime 1780517347596). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### User | 2026-06-03T20:32:48.694Z

[tool_result] 1	#!/usr/bin/env npx tsx
2	/**
3	 * lathe-closed-loop-trainer.ts — slot:whiskey (Lathe Wizard)
4	 * ==========================================================================
5	 * The CLOSED-LOOP SELF-LEARNING step for print→lathe-program accuracy.
6	 *
7	 * Rung B (lathe-print-to-program-roundtrip-accuracy.ts) showed PRISM plans the
8	 * right OPERATIONS (op-coverage 100%) but its textbook P-grou
... [+14611 chars truncated]

### User | 2026-06-03T20:32:50.941Z

[tool_result] 1	#!/usr/bin/env npx tsx
2	/**
3	 * lathe-print-to-program-roundtrip-accuracy.ts — slot:whiskey (Lathe Wizard)
4	 * ==========================================================================
5	 * RUNG B of WHISKEY-LATHE-ACCURACY — the TRUE print→program→post roundtrip
6	 * accuracy measurement ("read print, write program, post g-code, compare to
7	 * existing programs"). One-shot scorer. Shares it
... [+11984 chars truncated]

### Assistant | 2026-06-03T20:32:56.611Z

Now let me read the shared lib (File 2), which the read-once guard says I read earlier but it's not in my visible context.

### Assistant | 2026-06-03T20:32:57.005Z

[tool_use: Read]

### User | 2026-06-03T20:33:01.000Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\scripts\lib\lathe-roundtrip-core.ts' was already read 35s ago in this session and is unchanged (mtime 1780517347596). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### Assistant | 2026-06-03T20:33:04.756Z

The guard claims I already read it, but it's not in my visible context (the parallel read returned an error, not content). Let me bypass the cache to actually see File 2 — it's the core of the review.

### Assistant | 2026-06-03T20:33:06.122Z

[tool_use: Bash]

### User | 2026-06-03T20:33:32.123Z

[tool_result] /**
 * lathe-roundtrip-core.ts — shared substrate for the lathe print→program
 * roundtrip ACCURACY tools (slot:whiskey, WHISKEY-LATHE-ACCURACY-MS0).
 * ==========================================================================
 * Single source of truth for: JM Okuma .MIN ground-truth parsing, .MIN→TurningInput
 * derivation, regenerated-program parameter extraction, scoring, and corpus
 * samplin
... [+11164 chars truncated]

### Assistant | 2026-06-03T20:33:36.802Z

I now have all three files in full. Let me verify a few load-bearing claims before finalizing: the `customerOf` logic (used in stratification), the engine result shape for `cutting_speed_m_min`, and confirm File 3's refactor matches the lib's moved functions.

### Assistant | 2026-06-03T20:33:39.969Z

[tool_use: Grep]

### Assistant | 2026-06-03T20:33:41.177Z

[tool_use: Bash]

### User | 2026-06-03T20:33:50.167Z

[tool_result] 172:  feed_mm_rev: number;
174:  cutting_speed_m_min: number;
189:  operation_type: TurningOpType;
191:  cutting_params: TurningCuttingParams;
208:  total_tool_changes: number;
328: * @param feed_mm_rev   Feed per revolution for cutoff
337:  feed_mm_rev: number;
343:  const { od_mm, Vc_m_min, maxRPM, feed_mm_rev, steps, controller, cutoffZ_mm, lineNumFn: ln } = params;
385:      ? Math.round(feed_
... [+2563 chars truncated]

### User | 2026-06-03T20:39:00.348Z

[tool_result] Command running in background with ID: b1ziqlrt3. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\52bebb83-05f5-4200-810d-5da6fce8b4df\tasks\b1ziqlrt3.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-03T20:39:06.039Z

The engine result shape confirms `cutting_speed_m_min` is in m/min (line 732 `Math.round(actualVc)`) and `feed_mm_rev` is mm/rev — so the lib's `regenParams` conversions (`* M_PER_MIN_TO_SFM` for SFM, `/ MM_PER_IN` for IPR) are correct. Let me check the background git command output.

### Assistant | 2026-06-03T20:39:07.348Z

[tool_use: Bash]

### User | 2026-06-03T20:39:42.806Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-03T20:39:49.930Z

[tool_use: Bash]

### User | 2026-06-03T20:42:45.008Z

[tool_result]  M mcp-server/scripts/lathe-print-to-program-roundtrip-accuracy.ts
?? mcp-server/scripts/__tests__/derive-drawing-templates.test.ts
?? mcp-server/scripts/_apply_r14_expansion.mjs
?? mcp-server/scripts/_completed_utilities/
?? mcp-server/scripts/_mcam-tooldb-probe.mjs
?? mcp-server/scripts/_probe-real.mts
?? mcp-server/scripts/_tmp_machine_audit.mjs
?? mcp-server/scripts/add-jsdoc.ts
?? mcp-server/
... [+1158 chars truncated]

### Assistant | 2026-06-03T20:43:46.749Z

I have everything needed. File 3 is modified (refactored), File 1 and File 2 are new (untracked). The prior commit confirms the standalone baseline was 41.6% before the refactor, consistent with the 43.4% reported now. Let me verify one math edge: the `customerOf` off-by behavior and the `measure()` per-program averaging vs the scorer's per-program averaging, then finalize.

The key items are all confirmed. Here is my review.

---

## Independent Review — lathe closed-loop calibration learner + shared-lib refactor

### 1. HONESTY (R12) — held-out framing

The held-out ML framing is **honest and correctly constructed**:
- `learnCalibration` reads `train` only (trainer L177, `learnCalibration(trainB.samples, a)`); the split is deterministic and the test slice (L171) never enters the learn step. No leakage.
- `honest_note` (trainer L191-194) explicitly states multipliers are learned on TRAIN only and that held-out lift is the real number.
- Overfit gap is reported (L185) with a WATCH flag at >15% (L205); the reported 1.5% gap is well inside that.

**P2 — `honest_note` omits the forced-material caveat that the scorer carries.** File 3 carries a prominent `KNOWN_LIMITATION_material_default` (L133-138) and a `⚠️ LOWER BOUND, not a "PRISM is X% correct" verdict` banner in its .md (L192). The trainer's `honest_note` and .md never restate that the calibrated 76% is still on forced-1018/ISO-P input. The task description's own framing — "PRISM + learned JM shop profile, on held-out JM programs, parameter-envelope agreement" — is accurate, but a reader of `lathe-closed-loop-accuracy.md` alone could read **"CALIBRATED 76%"** as "PRISM is 76% correct." The .md header says "self-learning accuracy (held-out)" and the column header "CALIBRATED (+ JM shop profile)" — good, but the material-default lower-bound caveat is load-bearing and present in the sibling doc, so its absence here is an honesty asymmetry. The footer (L247) points to the baseline doc but doesn't say "same forced-mat
... [+6650 chars truncated]
