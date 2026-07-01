---
type: "chat-session"
source: "claude-code-cli"
session_id: "fe1db0ba-56e2-4bf4-8faa-3ecc49b65d27"
title: "Re-review a wiring fix. You previously FAILED this with a P1 (calibration feedba"
date: "2026-05-21"
first_ts: "2026-05-21T00:24:39.934Z"
last_ts: "2026-05-21T00:25:40.105Z"
cwd: "H:\\prism"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/fe1db0ba-56e2-4bf4-8faa-3ecc49b65d27/subagents/agent-a7c6417c26902692e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# Re-review a wiring fix. You previously FAILED this with a P1 (calibration feedba

> **claude-code-cli** | 2026-05-21 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fe1db0ba-56e2-4bf4-8faa-3ecc49b65d27/subagents/agent-a7c6417c26902692e.jsonl`

## Transcript

### User | 2026-05-21T00:24:39.934Z

Re-review a wiring fix. You previously FAILED this with a P1 (calibration feedback loop: the adapter would fit its mapping on already-calibrated confidences because the planner writes calibrated values back to the same sidecar the adapter reads) and a P3 (the calibrate call sat outside the loop's try/catch).

Both are now fixed. Verify the fixes on their merits.

FILES:
- H:\prism\scripts\rgs-tool-planner.mjs (planner)
- H:\prism\scripts\lib\rgs-calibration-adapter.mjs (`joinConfidences`)
- H:\prism\scripts\lib\rgs-signal-fusion.mjs (`ToolPlan` typedef — JSDoc only)

THE P1 FIX (your own suggested in-scope option): the planner now stamps `plan.rawConfidence = plan.confidence` (the pre-calibration model output) BEFORE applying the calibration remap, whenever `calibrateConfidence` is a function. `joinConfidences` now recovers `plan.rawConfidence` in preference to `plan.confidence`, falling back to `confidence` only when `rawConfidence` is absent (pre-A7 sidecar / calibration off — there `confidence` is raw). So the calibration mapping is always fit on RAW inputs and applied to RAW inputs, run over run — no calibrate-on-calibrated drift. The adapter header's confidence-join note was rewritten to describe this; a residual minor caveat remains (the recovered raw confidence is the CURRENT plan's, not the pick-time plan's, if the unit was re-planned between pick and outcome — genuinely out of A7 scope, would need confidence stored in the outcome ledger).

THE P3 FIX: the `plan.confidence = calibrateConfidence(...)` call is now wrapped in try/catch — a per-unit calibration throw logs to stderr and continues instead of aborting the batch.

VERIFY:
- Does the `rawConfidence` stash + the `joinConfidences` preference genuinely close the feedback loop? Trace run 1 -> outcome -> run 2 and confirm the fit domain and apply domain are both raw.
- Is the fallback (`rawConfidence` absent -> use `confidence`) correct for ALL cases: pre-A7 sidecar, `PRISM_RGS_CALIBRATION=0`, and the ada
... [+776 chars truncated]

### Assistant | 2026-05-21T00:24:56.086Z

I'll verify the fixes by reading the three files.

### Assistant | 2026-05-21T00:24:56.287Z

[tool_use: Read]

### Assistant | 2026-05-21T00:24:56.805Z

[tool_use: Read]

### Assistant | 2026-05-21T00:24:56.807Z

[tool_use: Read]

### User | 2026-05-21T00:25:23.800Z

[tool_result] 1	/**
2	 * rgs-tool-planner.mjs
3	 * Batch orchestrator: builds a per-roadmap-unit tool-plan sidecar.
4	 *
5	 * Memory note: the system-viz graph is ~324 MB. Under portable-node's default
6	 * heap this is fine, but if you hit GC pressure on very large runs add:
7	 *   node --max-old-space-size=4096 scripts/rgs-tool-planner.mjs ...
8	 *
9	 * CLI usage:
10	 *   node scripts/rgs-tool-planner.mjs [--
... [+30803 chars truncated]

### User | 2026-05-21T00:25:23.812Z

[tool_result] 1	/**
2	 * rgs-signal-fusion.mjs
3	 * Pure signal-fusion core for RGS tool-auto-invoke pipeline.
4	 *
5	 * export async function fuseSignals({ unit, complexity, readers }) -> ToolPlan | null
6	 *
7	 * All I/O is injected via `readers`; the only direct import is the pure rule
8	 * table from ./rgs-pipeline-rules.mjs (matchPipelines, matchAgents).
9	 *
10	 * CONTRACT: see task spec — implement every
... [+11722 chars truncated]

### User | 2026-05-21T00:25:23.833Z

[tool_result] 1	/**
2	 * rgs-calibration-adapter.mjs — CAMConfidenceCalibrationEngine-backed
3	 * confidence calibration for the rgs-tool-planner.
4	 *
5	 * Why this exists (U-LIMA-A7 / RGS-TOOL-AUTOINVOKE-MS1 P1 item #5):
6	 *   The planner emits a `ToolPlan.confidence` per roadmap unit — the
7	 *   deterministic path is a mean-of-pipeline-confidences capped at 0.6, the
8	 *   Ollama path is the model's self-r
... [+17976 chars truncated]

### Assistant | 2026-05-21T00:25:40.105Z

I have all three files. Let me trace the feedback loop carefully.

## Verification trace

**Run 1 → outcome → Run 2:**

Run 1, calibration active (`calibrateConfidence` is a fn). Planner line 558-569: `fuseSignals` returns `plan.confidence = C_raw`. Line 559 stamps `plan.rawConfidence = C_raw`. Line 562 overwrites `plan.confidence = calibrateConfidence(C_raw)`. Sidecar stores `{rawConfidence: C_raw, confidence: C_cal}`.

Outcome recorded → ledger gets `{unitKey, outcome}`.

Run 2, `makeCalibrationFn` reads ledger + sidecar, `joinConfidences` (line 290-291): `typeof plan.rawConfidence === "number"` → `conf = C_raw`. **Fit domain = raw.** The closure then applies `engine.calibrate(rawConfidence, ...)` per-unit on `plan.rawConfidence` stamped at line 559 (`plan.rawConfidence = plan.confidence`, the fresh fuseSignals output). **Apply domain = raw.** Both domains are raw — loop closed.

**Fallback correctness (all three cases):**
- *Pre-A7 sidecar:* no `rawConfidence` key → line 291 `confidence` used; pre-A7 `confidence` was the raw mean — correct.
- *`PRISM_RGS_CALIBRATION=0`:* planner passes `calibrateConfidence=undefined` → line 558 branch skipped, no `rawConfidence` stamped, `confidence` stays raw → join falls back to `confidence` (raw) — correct.
- *Identity passthrough (ledger <50):* `makeCalibrationFn` returns `identityCalibration`, a `function` → line 558 branch runs, stamps `rawConfidence = C_raw`, line 562 `confidence = identityCalibration(C_raw) = C_raw`. So `rawConfidence === confidence`. Join prefers `rawConfidence` (= raw) — correct, and even the fallback would be correct here. No issue.

**Additive check:** `rawConfidence` is added to the in-memory `plan` object only; not in `sourceHash` (line 100-111 hashes title/description/tier/verdict only — confirmed). `readPlansSidecar` returns the whole plan map untouched; no consumer enumerates plan keys destructively. `ToolPlan` typedef (line 121) marks `rawConfidence?` optional. Purely additive — confirmed.

**Mi
... [+1900 chars truncated]
