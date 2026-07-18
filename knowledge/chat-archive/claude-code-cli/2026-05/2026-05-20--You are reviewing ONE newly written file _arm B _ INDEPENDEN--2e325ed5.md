---
type: "chat-session"
source: "claude-code-cli"
session_id: "2e325ed5-2f22-4037-af6a-89ee5773fb13"
title: "You are reviewing ONE newly written file (arm B — INDEPENDENT second-pass review"
date: "2026-05-20"
first_ts: "2026-05-20T06:40:13.360Z"
last_ts: "2026-05-20T06:43:16.870Z"
cwd: "H:\\prism\\mcp-server"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/2e325ed5-2f22-4037-af6a-89ee5773fb13/subagents/agent-a4087020c7baf79e1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# You are reviewing ONE newly written file (arm B — INDEPENDENT second-pass review

> **claude-code-cli** | 2026-05-20 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/2e325ed5-2f22-4037-af6a-89ee5773fb13/subagents/agent-a4087020c7baf79e1.jsonl`

## Transcript

### User | 2026-05-20T06:40:13.360Z

You are reviewing ONE newly written file (arm B — INDEPENDENT second-pass review). Read the file END-TO-END and grade PASS or FAIL. Do NOT assume arm A caught everything — weight on what a content-specialist code-analyzer is unlikely to flag.

FILE TO REVIEW: H:/prism/mcp-server/src/engines/SFCParameterRefinementEngine.ts

WHAT IT DOES (your read on it):
- Reads bus.query() events on domain="speed_feed", kind="recommendation_emitted" (SFC recommendations) + kind∈{operator_override, cycle_time_measurement, surface_finish_ra, quote_vs_actual} (pairing outcomes).
- Joins them by lineage_id to compute per-metric ratios (actual/recommended).
- Returns median + IQR + clamped multiplicative factors with sample-size-and-dispersion-discounted confidence.

YOUR FOCUS (DON'T re-do arm A's content checks; focus on these specifically):

1. INTEGRATION CONCERNS:
   - Bus contract drift: this engine assumes bus.query({...}).events.timestamp is ISO; verify bus signature.
   - SFCOutcomeCaptureWireEngine writes recommended.summary.{sfm,...}; verify extractMetric reads the NESTED path correctly (top-level fallback OK, but the primary path is .summary).
   - LatheActualFeedbackTuningEngine already does Taylor C refit + EWMA — is this engine duplicating that work?
   - Does this engine create a circular dep with OutcomeCaptureBusEngine? (import + dependency cycle).
   - Will inserting this into SpeedFeedOrchestratorEngine.compute() create a per-compute bus.query() bottleneck on hot paths? (you don't see the wire-in yet — judge whether the engine's API forces an expensive synchronous bus read per call.)

2. HIDDEN COUPLING:
   - The engine's METRIC_KEYS = ["sfm","fz","feed_rate","doc","ae"]. Is this consistent with SFCOutcomeCaptureWireEngine's NUMERIC_FIELDS? The wire engine has 10 keys: sfm, vc, rpm, fpt, fz, fpr, feed_rate, doc, ae, ap. The refinement engine maps sfm↔vc and doc↔ap via the applyToRecommendation aliasing. Verify this is consistent and not over-applying the factor (e.g.
... [+3174 chars truncated]

### Assistant | 2026-05-20T06:42:19.946Z

I'll read the file end-to-end and grade it as arm B (independent second-pass).

### Assistant | 2026-05-20T06:42:20.436Z

[tool_use: Read]

### User | 2026-05-20T06:42:26.375Z

[tool_result] 1	/**
2	 * SFCParameterRefinementEngine — U-BRIDGE-LEARN-SFC
3	 * ==================================================
4	 *
5	 * Closed-loop learning → SpeedFeedOrchestrator parameter refinement.
6	 *
7	 * Wires the OUTPUT side of the SFC learning pipeline into the FEEDBACK side:
8	 *
9	 *   SFCOutcomeCaptureWireEngine ──emits──► OutcomeCaptureBus
10	 *                                               
... [+24446 chars truncated]

### Assistant | 2026-05-20T06:43:16.870Z

## Verdict: FAIL

Arm-B independent review surfaces P0 + P1 issues arm-A (content/idiom) is unlikely to weight. File reads cleanly but has integration + safety holes.

### P0 — blockers

- **L386,L434 — Bus query cardinality / hot-path cost.** `computeRefinement()` issues TWO `bus.query()` calls each capped at `BUS_QUERY_HARD_LIMIT=10_000`, with no per-context server-side filter (domain/kind only; context filter applied *client-side* after fetching). If `SpeedFeedOrchestratorEngine.compute()` ever calls this on every dispatch, the orchestrator becomes O(events) per compute. The bus contract from `OutcomeCaptureBusEngine` should be verified to accept `context` predicates server-side, OR this engine must own a memoization layer keyed on `ctxHash + bus.eventCount`. As-shipped, the API *forces* a 20K-event scan per call. Fix: add `cache: { ttlMs }` option, or push context into the bus query.

- **L484 — Single-outlier dominates median at minSamples=3.** Pre-clip `[0.1, 10]` survives a 5× outlier; median of `[5, 5, 5]` from one bad lineage_id replicated across 3 metrics yields a 2× clamped factor at `confidence≈sampleSize/20·exp(-0)`. Combined with `applyToRecommendation` damping `1+(2-1)·0.15=1.15`, you ship a 15% SFM bump from one bad override. Fix: require `minSamples` to count *distinct lineage_ids per metric*, not aggregate; OR widen IQR damping floor; OR raise default `minSamples` to 5.

### P1 — must-fix

- **L607,L612 — Double-application via vc/sfm and ap/doc aliasing.** `applyToRecommendation` multiplies `sfm * sfmFactor` AND `vc * sfmFactor` AND `doc * docFactor` AND `ap * docFactor`. If the rec payload carries BOTH sfm and vc (SFCOutcomeCaptureWireEngine's `summarize()` emits both — sfm is ft/min, vc is m/min of the same physical Vc), downstream code that re-derives one from the other reads two inconsistent values. Fix: pick the canonical key per payload (prefer `sfm` if present, skip `vc`); same for `doc`/`ap`. Symmetric for `fpt`/`fz`.

- **L478 — `actual ?
... [+3203 chars truncated]
