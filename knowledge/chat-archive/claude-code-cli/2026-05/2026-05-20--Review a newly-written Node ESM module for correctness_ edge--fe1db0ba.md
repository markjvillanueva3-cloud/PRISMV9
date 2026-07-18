---
type: "chat-session"
source: "claude-code-cli"
session_id: "fe1db0ba-56e2-4bf4-8faa-3ecc49b65d27"
title: "Review a newly-written Node ESM module for correctness, edge cases, and contract"
date: "2026-05-20"
first_ts: "2026-05-20T23:51:50.920Z"
last_ts: "2026-05-20T23:52:29.505Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/fe1db0ba-56e2-4bf4-8faa-3ecc49b65d27/subagents/agent-abcf7011ca2914d8e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# Review a newly-written Node ESM module for correctness, edge cases, and contract

> **claude-code-cli** | 2026-05-20 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fe1db0ba-56e2-4bf4-8faa-3ecc49b65d27/subagents/agent-abcf7011ca2914d8e.jsonl`

## Transcript

### User | 2026-05-20T23:51:50.920Z

Review a newly-written Node ESM module for correctness, edge cases, and contract adherence. Read the WHOLE file end-to-end.

FILE: H:\prism\scripts\lib\rgs-calibration-adapter.mjs

WHAT IT IS (U-LIMA-A7): An adapter that backs the RGS tool-planner's confidence value with the compiled `CAMConfidenceCalibrationEngine`. `makeCalibrationFn()` is an async factory: it reads the RGS outcome ledger (JSONL of `{unitKey, outcome}`), joins each outcome against the plans sidecar JSON (`{plans:{[unitKey]:{confidence}}}`) to recover the predicted confidence, feeds `(predictedConfidence, wasCorrect)` pairs into the engine, and returns a SYNC closure `(rawConfidence:number)=>number` that the planner applies to every plan's confidence.

CONTRACT IT MUST MEET:
1. The returned closure must be fully synchronous and must NEVER throw — any bad input or engine throw returns the raw confidence unchanged.
2. The >=50 gate: if fewer than 50 joined (predictedConfidence,wasCorrect) samples exist, the factory must return identity pass-through. Below the gate, plan confidence must be UNCHANGED.
3. Graceful degradation: compiled engine absent / import error / wrong shape / ledger or sidecar unreadable or malformed / recordOutcome or calibrate throwing — ALL must degrade to identity pass-through, never crash.
4. `joinConfidences` must produce ONE sample per distinct unit, where `wasCorrect` is true iff ANY ledger record for that unit is `outcome:"shipped"`; units with no sidecar plan or a non-finite confidence are dropped.
5. The engine (`CAMConfidenceCalibrationEngine`) keeps a PROCESS-GLOBAL static outcome buffer; the factory must `clearOutcomes()` before feeding so a prior call cannot bleed in.

ENGINE API (compiled, mcp-server/dist/engines/CAMConfidenceCalibrationEngine.js): static `calibrate(rawConfidence:number, opts?:{task?,method?,binCount?}) -> {rawConfidence,calibratedConfidence,uncertaintyInterval,method,calibrated,rationale}` (THROWS if rawConfidence non-finite); static `recordOutcome(
... [+1063 chars truncated]

### Assistant | 2026-05-20T23:52:03.098Z

I'll review the file and its sibling pattern.

### Assistant | 2026-05-20T23:52:03.601Z

[tool_use: Read]

### Assistant | 2026-05-20T23:52:03.610Z

[tool_use: Read]

### User | 2026-05-20T23:52:13.165Z

[tool_result] 1	/**
2	 * rgs-calibration-adapter.mjs — CAMConfidenceCalibrationEngine-backed
3	 * confidence calibration for the rgs-tool-planner.
4	 *
5	 * Why this exists (U-LIMA-A7 / RGS-TOOL-AUTOINVOKE-MS1 P1 item #5):
6	 *   The planner emits a `ToolPlan.confidence` per roadmap unit — the
7	 *   deterministic path is a mean-of-pipeline-confidences capped at 0.6, the
8	 *   Ollama path is the model's self-r
... [+15439 chars truncated]

### User | 2026-05-20T23:52:13.226Z

[tool_result] 1	/**
2	 * rgs-rie-adapter.mjs — RoadmapIntelligenceEngine-backed complexity adapter
3	 * for the rgs-tool-planner.
4	 *
5	 * Why this exists (U-LIMA-A6 / RGS-TOOL-AUTOINVOKE-MS1 P1 punch-list item #4):
6	 *   MS0's in-line heuristic defaulted 57.6% of units to tier M. U-COMPLEXITY-
7	 *   FALLBACK fixed the *symptom* with the multi-signal keyword cascade in
8	 *   `rgs-complexity.mjs`. The punch-
... [+8820 chars truncated]

### Assistant | 2026-05-20T23:52:29.505Z

Both files read end-to-end. The calibration adapter faithfully mirrors the A6 sibling pattern. Findings:

## Findings

**P3 — `recommendMethod` failure fallback uses "histogram" instead of identity-feeding the engine's own default.** Line 341-343: on `recommendMethod` throw, `method` is forced to `"histogram"`. This is harmless (histogram is a valid method enum value and `calibrate` accepts it; per-call throws still fall to identity), but it silently overrides the engine's auto-selection logic. Acceptable — it's a defensive choice, not a bug. Could pass `undefined` instead to let `calibrate`'s own `opts.method` default apply. Not load-bearing.

**P3 — `readPlansSidecar` returns the engine's internal `plans` object by reference, not a copy.** Line 232 returns `doc.plans` directly. `joinConfidences` only reads it, so no mutation risk today, but a future caller mutating the returned map would corrupt nothing persistent. Cosmetic; the JSDoc doesn't promise immutability. No fix required.

**P3 — closure return for non-finite input returns `rawConfidence` unchanged (line 352-354), which may be a non-number.** If the planner passes a string/`undefined`, the closure returns that same non-number. This is *contract-correct* ("returns the raw confidence unchanged" — contract item 1 says never throw, never says coerce), and mirrors A6's `complexityForViaRIE` fallback semantics. The planner is documented to pass numbers. Not a bug — flagging only for completeness.

## Contract verification (all PASS)

1. **Sync + never-throws closure** — `calibrateConfidence` is sync; non-finite input early-returns; `engine.calibrate` wrapped in try/catch; `result == null` and non-finite `calibratedConfidence` both fall to `rawConfidence`. Airtight.
2. **>=50 gate** — Two gates: raw `ledger.length < 50` (line 309) AND joined `pairs.length < 50` (line 315). Both return the shared `identityCalibration` reference → confidence unchanged below the gate. Correct, and the pre-gate correctly skips the s
... [+2088 chars truncated]
