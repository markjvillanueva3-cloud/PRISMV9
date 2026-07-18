---
type: "chat-session"
source: "claude-code-cli"
session_id: "fe1db0ba-56e2-4bf4-8faa-3ecc49b65d27"
title: "Review a newly-written node:test test suite for coverage quality and test integr"
date: "2026-05-21"
first_ts: "2026-05-21T00:06:33.062Z"
last_ts: "2026-05-21T00:07:06.746Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/fe1db0ba-56e2-4bf4-8faa-3ecc49b65d27/subagents/agent-a7d70a5a932bf2ffa.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# Review a newly-written node:test test suite for coverage quality and test integr

> **claude-code-cli** | 2026-05-21 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fe1db0ba-56e2-4bf4-8faa-3ecc49b65d27/subagents/agent-a7d70a5a932bf2ffa.jsonl`

## Transcript

### User | 2026-05-21T00:06:33.062Z

Review a newly-written node:test test suite for coverage quality and test integrity. Read the WHOLE file end-to-end.

TEST FILE: H:\prism\scripts\lib\rgs-calibration-adapter.test.mjs
MODULE UNDER TEST: H:\prism\scripts\lib\rgs-calibration-adapter.mjs

WHAT THE MODULE DOES (U-LIMA-A7): `makeCalibrationFn()` is an async factory that reads the RGS outcome ledger (JSONL) + the plans sidecar (JSON), joins them into `(predictedConfidence, wasCorrect)` pairs, feeds the compiled `CAMConfidenceCalibrationEngine`, and returns a sync `(rawConfidence:number)=>number` closure the planner applies to each plan's confidence. Below a >=50 joined-sample gate it returns the `identityCalibration` pass-through. Exports: `identityCalibration`, `loadCalibrationEngine`, `readOutcomeLedger`, `readPlansSidecar`, `joinConfidences`, `makeCalibrationFn`, `MIN_CALIBRATION_OUTCOMES`, `CALIBRATION_TASK`, `DEFAULT_LEDGER_PATH`, `DEFAULT_SIDECAR_PATH`.

All 29 tests currently PASS.

EVALUATE (PRISM rule R9 — tests verify INTENT, not behavior; placeholder/tautological asserts are rejected by the hook stack):
1. Does every test assert something that would actually FAIL if the corresponding logic broke? Flag any tautological assert (e.g. `toBeDefined()` stubs, asserting a hardcoded value the test itself supplied with no transform).
2. Coverage completeness: are all 8 functional exports exercised? Are the key contracts tested — the never-throws closure, the >=50 gate (boundary 49 vs 50), graceful degradation on engine null/malformed/throwing, `joinConfidences` one-sample-per-unit + shipped-wins + drop-no-plan + drop-non-finite, the prototype-pollution `__proto__` case?
3. Real-data E2E: the punch-list's core lesson is "hermetic unit tests with injected fakes do NOT prove production wiring — ship a real-data E2E." Three E2E tests exercise the actual compiled engine. Are they genuine (no mocks), and do they prove the production path? Note E2E #1 and #3 early-`return` when `loadCalibrationEngine()` is null
... [+423 chars truncated]

### Assistant | 2026-05-21T00:06:40.012Z

I'll read and evaluate this test suite comprehensively.

### Assistant | 2026-05-21T00:06:40.022Z

[tool_use: Read]

### Assistant | 2026-05-21T00:06:40.199Z

[tool_use: Read]

### User | 2026-05-21T00:06:48.180Z

[tool_result] 1	/**
2	 * rgs-calibration-adapter.mjs — CAMConfidenceCalibrationEngine-backed
3	 * confidence calibration for the rgs-tool-planner.
4	 *
5	 * Why this exists (U-LIMA-A7 / RGS-TOOL-AUTOINVOKE-MS1 P1 item #5):
6	 *   The planner emits a `ToolPlan.confidence` per roadmap unit — the
7	 *   deterministic path is a mean-of-pipeline-confidences capped at 0.6, the
8	 *   Ollama path is the model's self-r
... [+16434 chars truncated]

### User | 2026-05-21T00:06:48.209Z

[tool_result] 1	/**
2	 * rgs-calibration-adapter.test.mjs — tests for the CAMConfidenceCalibration
3	 * Engine-backed confidence-calibration adapter (U-LIMA-A7).
4	 *
5	 * Coverage:
6	 *   - pure helpers: identityCalibration, readOutcomeLedger, readPlansSidecar,
7	 *     joinConfidences (incl. adversarial / prototype-pollution inputs)
8	 *   - the >=50 joined-sample gate (boundary 49 vs 50)
9	 *   - graceful de
... [+19633 chars truncated]

### Assistant | 2026-05-21T00:07:06.746Z

## Test Coverage Review: rgs-calibration-adapter.test.mjs

**Verdict: FAIL (3 P1 findings, 1 P2)**

### P1 Findings

**1. Silent coverage hole in E2E tests #1 & #3 (lines 442–446, 483–485)**

Both real-data E2E tests early-`return` when `loadCalibrationEngine()` is null (dist not built). This is documented as "skip rather than false-fail" but silently downgrades the production wiring proof to hermetic-only. **The test suite cannot verify the module works end-to-end with the real compiled engine in any CI environment where `mcp-server/dist/` is not available.** This violates R9 (tests encode intent, not just behavior).

**Fix:** Either (a) make dist-not-built a hard `skip()` with a message, or (b) add a prerequisite hook that fails the test run if dist is absent and E2E tests are enabled. Per PRISM's `comprehensive-build-enforce` mandate, the test should assert the contract is testable, not silently pass when it cannot be.

---

**2. Test #8 (line 345–356) asserts fake-engine behavior, not production behavior**

```javascript
const fn = await makeCalibrationFn({ engine, ledgerPath, sidecarPath });
assert.notEqual(fn, identityCalibration);
assert.equal(fn(0.5), 0.99); // ← fake always returns 0.99
assert.equal(engine._recorded.length, 55);
assert.equal(engine._recorded[0].task, CALIBRATION_TASK);
```

This test **passes the gate (55 >= 50) and verifies the closure is routed through the fake engine**, but it does NOT verify:
- The closure never throws (the contract in line 63: "The closure NEVER throws").
- Non-numeric / non-finite inputs are handled (tested in #9 but with fake engine).

The fake `calibrate()` is hard-wired to return `0.99`, so this test would still pass even if the real engine's isotonic calibration logic were broken. **This is a tautological assert masquerading as a production-readiness test.**

**Fix:** Split into two tests:
- (a) Assert the closure is NOT identity when gate is met (current).
- (b) Rename the closure-never-throws test (#9) to run wi
... [+2798 chars truncated]
