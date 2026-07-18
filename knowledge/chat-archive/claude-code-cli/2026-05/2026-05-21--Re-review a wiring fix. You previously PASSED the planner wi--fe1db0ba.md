---
type: "chat-session"
source: "claude-code-cli"
session_id: "fe1db0ba-56e2-4bf4-8faa-3ecc49b65d27"
title: "Re-review a wiring fix. You previously PASSED the planner wiring; a second revie"
date: "2026-05-21"
first_ts: "2026-05-21T00:24:39.904Z"
last_ts: "2026-05-21T00:25:27.557Z"
cwd: "H:\\prism"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/fe1db0ba-56e2-4bf4-8faa-3ecc49b65d27/subagents/agent-a8ec8b35697179dd2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# Re-review a wiring fix. You previously PASSED the planner wiring; a second revie

> **claude-code-cli** | 2026-05-21 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fe1db0ba-56e2-4bf4-8faa-3ecc49b65d27/subagents/agent-a8ec8b35697179dd2.jsonl`

## Transcript

### User | 2026-05-21T00:24:39.904Z

Re-review a wiring fix. You previously PASSED the planner wiring; a second reviewer then FAILED it on a legitimate P1. Verify the P1 fix is correct.

FILES:
- H:\prism\scripts\rgs-tool-planner.mjs (the planner — wiring)
- H:\prism\scripts\lib\rgs-calibration-adapter.mjs (`joinConfidences` — the join)

THE P1 THAT WAS FOUND: After a calibrated planner run, the plans sidecar (`roadmap-tool-plans.json`) stores CALIBRATED `confidence` values. The calibration adapter recovers predicted confidences by joining the outcome ledger against that sidecar — so the next run would fit the calibration mapping on calibrated inputs but apply it to raw `fuseSignals` outputs. A domain mismatch.

THE FIX (verify it is correct + complete):
1. In `rgs-tool-planner.mjs` `runPlanner`'s per-unit loop: when `calibrateConfidence` is a function, the planner now does `plan.rawConfidence = plan.confidence;` (stash the pre-calibration value) BEFORE `plan.confidence = calibrateConfidence(plan.confidence)` (the remap, still guarded by `unit.milestone`). The remap call is now also wrapped in try/catch (P3 fix — a per-unit calibration throw must not abort the batch; it logs to stderr and continues).
2. In `rgs-calibration-adapter.mjs` `joinConfidences`: now reads `plan.rawConfidence` (the pre-calibration value) in preference to `plan.confidence`, falling back to `plan.confidence` only when `rawConfidence` is absent (pre-A7 sidecar, or calibration off — in which case `confidence` IS the raw value).
3. The `ToolPlan` typedef in `rgs-signal-fusion.mjs` gained `rawConfidence?: number` (JSDoc only).

VERIFY:
- The `rawConfidence` stash happens for EVERY unit when `calibrateConfidence` is a function (even missing-milestone units and even when the adapter is in identity-passthrough mode), so the join is always consistent. Is that correct?
- When `calibrateConfidence` is `undefined` (`PRISM_RGS_CALIBRATION=0`): `rawConfidence` is never set, `confidence` stays raw, the join falls back to `confidence`. Consiste
... [+542 chars truncated]

### Assistant | 2026-05-21T00:24:53.523Z

I'll verify the P1 fix by reading the actual files.

### Assistant | 2026-05-21T00:24:53.759Z

[tool_use: Read]

### Assistant | 2026-05-21T00:24:54.260Z

[tool_use: Read]

### Assistant | 2026-05-21T00:24:54.296Z

[tool_use: Read]

### User | 2026-05-21T00:25:15.262Z

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

### User | 2026-05-21T00:25:16.391Z

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

### User | 2026-05-21T00:25:16.405Z

[tool_result] 1	/**
2	 * rgs-calibration-adapter.mjs — CAMConfidenceCalibrationEngine-backed
3	 * confidence calibration for the rgs-tool-planner.
4	 *
5	 * Why this exists (U-LIMA-A7 / RGS-TOOL-AUTOINVOKE-MS1 P1 item #5):
6	 *   The planner emits a `ToolPlan.confidence` per roadmap unit — the
7	 *   deterministic path is a mean-of-pipeline-confidences capped at 0.6, the
8	 *   Ollama path is the model's self-r
... [+17976 chars truncated]

### Assistant | 2026-05-21T00:25:27.557Z

All three files verified. The fix is correct and complete.

## Findings

**P0: none**

**P1: none** — the original P1 (calibrate-on-calibrated domain mismatch) is correctly closed.

**P2: none**

**P3: none** — the try/catch placement is correct.

## Verification detail

**1. `rawConfidence` stash universality** (planner L558-570) — Correct. `plan.rawConfidence = plan.confidence` is the FIRST statement inside `if (typeof calibrateConfidence === "function")`, BEFORE the `unit.milestone` gate. It runs for every unit when calibration is active: missing-milestone units, identity-passthrough mode, and units where calibration throws. The join (`joinConfidences` L290) always finds a numeric `rawConfidence`. Consistent.

**2. `PRISM_RGS_CALIBRATION=0`** — `calibrateConfidence` is `undefined` (L726-729). The `typeof === "function"` guard is false, the whole block is skipped, `rawConfidence` is never set, `confidence` stays raw. `joinConfidences` L290-291 falls through `rawConfidence` (absent) → `confidence` (raw). Consistent.

**3. Feedback loop closed** — Run N writes calibrated `confidence` + raw `rawConfidence`. Run N+1's `joinConfidences` reads `rawConfidence`, so the engine is fit on raw inputs and `calibrateConfidence` is applied to raw `fuseSignals` outputs. fit-domain == apply-domain == raw. No residual drift.

**4. Additive `rawConfidence`** — `buildSidecarDoc` serializes `plans` whole; the field rides along. `sourceHash` (L100-111) hashes only title/description/tier/verdict — `confidence`/`rawConfidence` excluded, so no re-plan stampede. `readPlansSidecar` consumers tolerate the extra key. The `ToolPlan` typedef gained `rawConfidence?: number` (signal-fusion L122, L126-129) — JSDoc only.

**5. try/catch placement** (L561-569) — Wraps ONLY `plan.confidence = calibrateConfidence(...)`. The `rawConfidence` stash (L559) is outside it — a calibration throw cannot prevent the stash. The catch logs to stderr and continues; `plan.confidence` retains the raw value (already 
... [+440 chars truncated]
