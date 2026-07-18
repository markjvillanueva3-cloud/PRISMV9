---
type: "chat-session"
source: "claude-code-cli"
session_id: "23c10eea-c03b-414f-9e26-380e20195aee"
title: "Review a node:test suite for test quality and coverage. Read the WHOLE file end-"
date: "2026-05-17"
first_ts: "2026-05-17T19:38:07.525Z"
last_ts: "2026-05-17T19:38:35.502Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/23c10eea-c03b-414f-9e26-380e20195aee/subagents/agent-a532c9ce229ac71ae.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Review a node:test suite for test quality and coverage. Read the WHOLE file end-

> **claude-code-cli** | 2026-05-17 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/23c10eea-c03b-414f-9e26-380e20195aee/subagents/agent-a532c9ce229ac71ae.jsonl`

## Transcript

### User | 2026-05-17T19:38:07.525Z

Review a node:test suite for test quality and coverage. Read the WHOLE file end-to-end: `H:/prism/scripts/__tests__/nn-graph-retrain-lifecycle.test.mjs` (49 tests, all currently passing).

It tests `H:/prism/scripts/nn-graph-retrain-lifecycle.mjs` — a GNN self-retrain lifecycle orchestrator. The system under test exports: `graphFingerprint(graph)`, `driftDecision(opts)`, `promoteDecision(opts)`, `runLifecycle(opts)`, `parseArgs`, `main`, `renderResult`, `LIFECYCLE_DEFAULTS`. Read the SUT too if needed (`H:/prism/scripts/nn-graph-retrain-lifecycle.mjs`).

The PRISM test bar (comprehensive-build enforcement):
- Real assertions against reference values or algebraic invariants — NEVER `toBeDefined()`-style stubs.
- Coverage floor: happy path + ≥3 failure modes + ≥2 adversarial inputs (NaN/Infinity/empty/oversize).
- A test must FAIL if the business logic changes (a test that passes against a hardcoded return is worthless).

EVALUATE:
1. THE SAFETY INVARIANT: `promoteDecision` must promote IFF `deferred===false && grade.pass===true` (strict booleans). Are all the violating inputs covered — null, `{}`, missing grade, string `"false"` deferred, string `"true"` pass, sub-gate, deferred? Is each assertion strong enough to fail if the strictness were loosened to `==`?
2. Does the suite verify the load-bearing behaviors: live checkpoint never touched (candidate path used), baseline NOT advanced on train-failure, baseline NOT advanced in dry-run, baseline ADVANCED on a sub-gate candidate, lock released on every exit path, runLifecycle never throws?
3. The "real-wiring" test (around line 480) drives the actual `runAssessment` from `nn-graph-eval.mjs` with a `readFileImpl` spy — is it a genuine fail-on-revert oracle? Would it actually fail if someone made `runAssessment` ignore `opts.checkpoint`? Or could it false-pass?
4. Are there WEAK tests — assertions that would pass even if the function returned a constant? Any test that asserts only "no throw" without checking a value wher
... [+657 chars truncated]

### Assistant | 2026-05-17T19:38:12.329Z

I'll read both files end-to-end to evaluate test coverage and safety.

### Assistant | 2026-05-17T19:38:12.526Z

[tool_use: Read]

### Assistant | 2026-05-17T19:38:12.606Z

[tool_use: Read]

### User | 2026-05-17T19:38:13.391Z

[tool_result] 1	/**
2	 * nn-graph-retrain-lifecycle.test.mjs — NN-GRAPH-MS2 / U2-SELF-RETRAIN-LIFECYCLE
3	 *
4	 * Reference-valued node:test suite for the GNN self-retrain lifecycle. The pure
5	 * decision functions (graphFingerprint / driftDecision / promoteDecision) are
6	 * tested against concrete expected values; runLifecycle is exercised end-to-end
7	 * with injected dependencies covering happy path + fail
... [+25554 chars truncated]

### User | 2026-05-17T19:38:13.728Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * nn-graph-retrain-lifecycle.mjs — NN-GRAPH-MS2 / U2-SELF-RETRAIN-LIFECYCLE
4	 *
5	 * The autonomous half of the GNN tier-5 wiring classifier. Runs as a Windows
6	 * scheduled task (see .claude/helpers/install-nn-graph-retrain-task.ps1),
7	 * independent of any Claude session, on a periodic poll:
8	 *
9	 *   1. FINGERPRINT  — read system-graph.json, summarize {nodeCo
... [+32371 chars truncated]

### Assistant | 2026-05-17T19:38:35.502Z

## Test Coverage Review: `nn-graph-retrain-lifecycle.test.mjs`

I've reviewed both the test suite (49 tests) and the system under test. Here's my assessment:

### SAFETY INVARIANT — promoteDecision()

**EXCELLENT coverage** (tests 272–316, lines 272–316). All 6 required cases are tested:
- ✅ Graded + `pass:true` → promote (line 272)
- ✅ `pass:false` (sub-gate) → NO promote (line 279)
- ✅ `deferred:true` → NO promote (line 287)
- ✅ `null` assessment → NO promote (line 295)
- ✅ Missing grade object → NO promote (line 300)
- ✅ **Strict boolean checks** — string `"false"` ≠ `false`, string `"true"` ≠ `true` (lines 304–316)

Each assertion is **fail-on-revert strong**: the code at line 203 checks `a.deferred !== false` (strict inequality), and line 208 checks `g.pass !== true`. Loosening these to `==` would break tests 304–316.

---

### Load-Bearing Behaviors

**ALL verified:**
- ✅ **Live checkpoint never touched** (test line 334–344): spy verifies `CANDIDATE_CKPT` path flows to train/eval, not `LIVE_CKPT`
- ✅ **Baseline NOT advanced on train-failure** (line 387–398): `writeBaseline` call count = 0
- ✅ **Baseline NOT advanced in dry-run** (line 461–470): `writeBaseline` = 0, but training still executes (operative inspect)
- ✅ **Baseline ADVANCED on sub-gate candidate** (line 346–359): baseline written even when `pass:false`
- ✅ **Lock released on every exit path** (lines 322, 331, 356, 384, 396, 423, 432, 444, 458): all 8 failure modes confirm `released == 1`
- ✅ **runLifecycle never throws** (line 507–522): every injected dependency throws, result is `ok:false, action:"error"`, not a crash

---

### Real-Wiring Test (lines 528–565)

**GENUINE fail-on-revert oracle.** The test drives the actual `runAssessment()` from `nn-graph-eval.mjs` with a spy `readFileImpl` that:
1. Records which checkpoint path is read
2. Throws ENOENT to defer the assessment (safe no-op)
3. Asserts the spy saw the exact path (`CANDIDATE-A.json`, then `CANDIDATE-B.json` in the second sub-test)

**
... [+2974 chars truncated]
