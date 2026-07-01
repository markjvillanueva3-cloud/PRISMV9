---
title: An engine that falls back to a stub MUST signal stub-vs-real in its output, never pose stub output as a real answer
type: lesson
slot: india
date: 2026-06-23
tags: [r12, fail-loud, orchestrator, stub-fallback, fan-out, xproc-neural, tier-5, silent-trust-hazard, additive-fix]
links:
  - "[[gnn-selective-deploy]]"
  - "[[nn-graph-ms0]]"
---

# Stub-fallback engines must signal mode (R12), not silently pose stub output as real

## TL;DR
`CrossProcessHierarchicalNeuralOrchestratorEngine.orchestrate()` (XPROC-NEURAL T12) ran a built-in `defaultInvoker` -- a placeholder echo -- whenever no `tier_invoker` was supplied, yet still returned `primary_answer.headline = "Primary answer from T8-03 ... at confidence X"` and `rationale = "N succeeded"`. A consumer could NOT tell a real tiered answer from a placeholder echo (the only clue was a human-readable string buried in `provenance[].output.echo`). That is a silent-trust hazard: the orchestrator's headline LIED about having a real answer. Fixed (U-XPROC-ORCH-FANOUT-HONESTY, `884542bc`) by adding a top-level `fan_out_mode: "supplied" | "default_stub" | "none"` and making the `default_stub` headline disclose it is a placeholder.

## The generalizable rule
Any engine/pipeline that **gracefully degrades to a stub/placeholder/default** when a real dependency is absent MUST:
1. Expose a **machine-readable mode flag** in its output (`fan_out_mode`, `source`, `degraded:true`, etc.) so a downstream consumer can branch on it -- a buried human-readable string is not enough.
2. Make the **headline / primary field honest** in degraded mode -- never format placeholder output with the same confident wording as a real result.
3. Keep the fix **additive** so existing real-path consumers/tests are untouched (here: all 22 prior tests inject a `tier_invoker` -> "supplied" path -> stayed green; +7 new tests pin the three modes).

This is the engine-output sibling of R12 ("fail loud"): "Feature works" is a lie if the edge case is unverified, and "here is the answer" is a lie if the answer is a stub.

## Why it matters here
The orchestrator's **routing** is genuinely built (U-NN-TIER05 done, 22/22). What is stubbed is the per-tier **fan-out** to real engines. Because functions can't cross the MCP/JSON boundary, the `prism_intelligence` + `aiReasoning` dispatcher paths strip the `tier_invoker` param and therefore ALWAYS hit `default_stub` -- so without the flag, every MCP consumer was silently trusting placeholder echoes. `fan_out_mode` now both warns consumers AND gives the deferred real-engine-wiring unit a live progress metric (`default_stub` -> `supplied` as the 10 available tiers, `T8-01/T8-03/T9-01..04/T11-01..04`, get wired engine-side).

## How to apply
- When you add a stub/default fallback to any engine, add the mode flag + honest headline in the SAME commit.
- The real-engine invoker must be constructed **engine-side** (import each `ENGINE_BY_TIER` engine, map payload -> its primary method), NOT expected from the caller -- the MCP boundary can't carry a function.
- See [[gnn-selective-deploy]] for the sibling "abstain below the gate, defer to the next tier" honesty pattern in the same neural stack.
