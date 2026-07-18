---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "Review the wiki entry `H:/prism/knowledge/wiki/architecture/nn-graph-ms0.md` (U8"
date: "2026-05-16"
first_ts: "2026-05-16T19:23:50.269Z"
last_ts: "2026-05-16T19:25:34.431Z"
cwd: "H:\\prism"
messages: 23
user_msgs: 10
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-ac87ebc8b42988418.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review the wiki entry `H:/prism/knowledge/wiki/architecture/nn-graph-ms0.md` (U8

> **claude-code-cli** | 2026-05-16 | 23 msgs (10 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-ac87ebc8b42988418.jsonl`

## Transcript

### User | 2026-05-16T19:23:50.269Z

Review the wiki entry `H:/prism/knowledge/wiki/architecture/nn-graph-ms0.md` (U8 of NN-GRAPH-MS0). Use the Read tool on it.

This is the architecture wiki entry for the NN-GRAPH-MS0 milestone — a GraphSAGE GNN added as a 5th tier to PRISM's wiring-inference cascade. Verify it for FACTUAL ACCURACY and HONESTY against the actual shipped code. Cross-check these claims by Reading the real files:
  - `H:/prism/scripts/seed-ghost-gnn-classify.mjs` — does it actually do GraphSAGE-embedding k-NN label propagation with an edgeless subgraph, and are the env knobs `PRISM_NNG_DISABLE / PRISM_NNG_MIN_CONF (0.7) / PRISM_NNG_REF_MIN_CONF (0.8) / PRISM_NNG_TOPK (15) / PRISM_NNG_CHECKPOINT` correct?
  - `H:/prism/scripts/lib/nn-graph-eval.mjs` — does it assess against AUROC>=0.78 / macro-F1>=0.55 / Brier<=0.15, and does it genuinely emit the "internal-consistency, NOT ground truth" caveat?
  - `H:/prism/mcp-server/data/milestones/NN-GRAPH-MS0.json` — is the unit list (U1..U8) and the 8-unit count right?

Assess:
  - Are any claims OVERSTATED? In particular the entry says "all 8 units built, tested, committed" and "status: shipped-research-only" with the deploy gate DEFERRED. Is that honest given there is no trained checkpoint? Flag any claim that overclaims completion or measured performance.
  - Is the honesty framing (internal-consistency metric, deferred deploy) clearly carried, or buried?
  - Is the GraphSAGE description accurate (2-layer, mean aggregator, linear output layer)?
  - Frontmatter: does it match the format of sibling entries (title/slug/kind/domain/status/shipped_at/milestone)?
  - Is anything important MISSING for an operator who needs to understand or run this milestone?
  - Any broken/wrong file paths or commit hashes?

Report concrete P0/P1 findings (P0/P1 = a factual error, an overclaim, or a missing critical section). End with `VERDICT: PASS` or `VERDICT: FAIL`.

### Assistant | 2026-05-16T19:23:53.811Z

I'll review the wiki entry and cross-check its claims against the actual shipped code.

### Assistant | 2026-05-16T19:23:54.693Z

[tool_use: Read]

### Assistant | 2026-05-16T19:23:55.089Z

[tool_use: Read]

### Assistant | 2026-05-16T19:23:55.499Z

[tool_use: Read]

### Assistant | 2026-05-16T19:23:55.725Z

[tool_use: Read]

### User | 2026-05-16T19:23:58.819Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\nn-graph-eval.mjs' was already read 7m ago in this session and is unchanged (mtime 1778958846393). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-16T19:23:59.675Z

[tool_result] 1	---
2	title: NN-GRAPH-MS0 — Hybrid neural-symbolic GNN tier-5 wiring inference
3	slug: nn-graph-ms0
4	kind: architecture
5	domain: ai-routing
6	status: shipped-research-only
7	shipped_at: 2026-05-16
8	shipped_by: claude-b6c4b196 (slot alpha)
9	milestone: NN-GRAPH-MS0
10	related:
11	  - graphsage-predictor
12	  - system-viz-first-audit
13	  - close-out-audit
14	---
15	
16	# NN-GRAPH-MS0 — GraphSA
... [+5704 chars truncated]

### User | 2026-05-16T19:23:59.858Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * seed-ghost-gnn-classify.mjs — NN-GRAPH-MS0 / U-NNG-INFERENCE-FIFTH-TIER (U6)
4	 *
5	 * The 5th tier of the wiring-inference cascade. The first four tiers —
6	 * keyword -> expanded-keyword -> sibling-prefix -> LLM (seed-ghost-llm-classify)
7	 * — classify UNKNOWN ghost.unwired-engine nodes into a dispatcher. This tier
8	 * adds a GraphSAGE-derived classifier and ru
... [+23328 chars truncated]

### User | 2026-05-16T19:24:00.041Z

[tool_result] 1	{
2	  "id": "NN-GRAPH-MS0",
3	  "title": "Hybrid neural-symbolic GNN — GraphSAGE link-prediction over system-viz",
4	  "track": "INFRA-INTELLIGENCE",
5	  "status": "in_progress",
6	  "version": "1.0.0",
7	  "schemaVersion": 2,
8	  "created_at": "2026-05-16",
9	  "updated_at": "2026-05-16",
10	  "priority": "HIGH",
11	  "target_omega": 0.85,
12	  "description": "Adds a 5th tier to the existing 4-
... [+8496 chars truncated]

### Assistant | 2026-05-16T19:24:03.359Z

The eval lib was already read this session. Let me retrieve it via Grep to verify the specific claims about thresholds and the honesty caveat.

### Assistant | 2026-05-16T19:24:06.056Z

[tool_use: Grep]

### Assistant | 2026-05-16T19:24:07.166Z

[tool_use: Grep]

### User | 2026-05-16T19:24:13.206Z

[tool_result] 8: *     AUROC >= 0.78   ·   macro-F1 >= 0.55   ·   Brier <= 0.15
19: * HONESTY NOTE — this is an INTERNAL-CONSISTENCY metric, not ground truth. The
26: * Pure metric functions — computeAUROC, computeMacroF1, computeBrier,
27: * bucketize, gradeMetrics — are exported and reference-tested. Consistent with
51:export const GATE_THRESHOLDS = Object.freeze({ auroc: 0.78, macroF1: 0.55, brier: 0.15 });

... [+2473 chars truncated]

### User | 2026-05-16T19:24:13.872Z

[tool_result] 33:import { gnnClassifyUnknowns } from "./seed-ghost-gnn-classify.mjs";
197: * prism_* name. Both producers (LLM parseBatchResponse, GNN gnnClassifyUnknowns)
199: * classification may carry its own `confidence` + `reason` (the GNN tier-5
268:  // --- Tier-5 GNN gate (NN-GRAPH-MS0/U-NNG-INFERENCE-FIFTH-TIER) ----------
270:  // or above PRISM_NNG_MIN_CONF. Hybrid stays the floor: a missing checkpoi
... [+674 chars truncated]

### Assistant | 2026-05-16T19:24:16.640Z

Let me verify the eval lib's honesty caveat in the report body and check the commit hashes.

### Assistant | 2026-05-16T19:24:17.562Z

[tool_use: Read]

### Assistant | 2026-05-16T19:24:18.436Z

[tool_use: Read]

### User | 2026-05-16T19:24:20.255Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * nn-graph-eval.mjs — NN-GRAPH-MS0 / U-NNG-EVAL-HARNESS U7
4	 *
5	 * The assessment harness for the GNN tier-5 wiring classifier. It measures
6	 * whether the GraphSAGE classifier (U6 seed-ghost-gnn-classify) is good enough
7	 * to deploy, against the milestone's mandatory exit gates:
8	 *     AUROC >= 0.78   ·   macro-F1 >= 0.55   ·   Brier <= 0.15
9	 *
10	 * Method
... [+1324 chars truncated]

### User | 2026-05-16T19:24:20.702Z

[tool_result] 340	    return { deferred: true, reason: scored.reason };
341	  }
342	  const grade = gradeMetrics(scored.metrics);
343	  return {
344	    deferred: false,
345	    assessedAt: opts.now || new Date().toISOString(),
346	    holdoutN: scored.n,
347	    gates: GATE_THRESHOLDS,
348	    metrics: scored.metrics,
349	    buckets: scored.buckets,
350	    grade,
351	    samples: scored.samples,
352	  };
353
... [+2128 chars truncated]

### Assistant | 2026-05-16T19:24:20.811Z

[tool_use: Bash]

### User | 2026-05-16T19:24:45.829Z

[tool_result] 6655a98a1 [MAIN] [NN-GRAPH-MS0]/U-NNG-INFERENCE-FIFTH-TIER: U6 — GNN tier-5 wiring-inference gate
e7db71cbc [MAIN] [NN-GRAPH-MS0]/U-NNG-EVAL-HARNESS: U7 — GNN tier-5 assessment harness
645f5fe99 [MAIN] [NN-GRAPH-MS0]/U-NNG-GRAPHSAGE-TRAIN: U4c — model checkpoint JSON serialization
ae25ba33d [MAIN] [NN-GRAPH-MS0]/U-NNG-GRAPHSAGE-TRAIN: U4d — end-to-end training-pipeline CLI orchestrator
458ece24a [
... [+76 chars truncated]

### Assistant | 2026-05-16T19:25:34.431Z

All cross-checks complete. Here is the review.

## Code Review: `nn-graph-ms0.md` (U8 of NN-GRAPH-MS0)

### Verification summary

I cross-checked every claim against the shipped code:
- `H:/prism/scripts/seed-ghost-gnn-classify.mjs`
- `H:/prism/scripts/lib/nn-graph-eval.mjs`
- `H:/prism/scripts/seed-ghost-llm-classify.mjs` (tier-5 gate integration)
- `H:/prism/mcp-server/data/milestones/NN-GRAPH-MS0.json`
- Commit hashes via `git log`

**The wiki entry is accurate on nearly every load-bearing claim.** Findings below.

---

### Accurate claims (verified)

- **Env knobs** — all five match `GNN_DEFAULTS` (`seed-ghost-gnn-classify.mjs:61-67`) and `resolveGnnConfig` (`:104-116`): `PRISM_NNG_DISABLE`, `PRISM_NNG_MIN_CONF` (0.7), `PRISM_NNG_REF_MIN_CONF` (0.8), `PRISM_NNG_TOPK` (15), `PRISM_NNG_CHECKPOINT` → `DEFAULT_CHECKPOINT = state/shared/nn-graph/graphsage-checkpoint.json` (`:53`). Correct.
- **Method** — GraphSAGE-embedding k-NN label propagation with an **edgeless subgraph** is real: `buildGhostSubgraph` (`:185-194`) returns `{ nodes, edges:[] }`; the leak-avoidance rationale in the doc matches the in-code comment (`:178-184`). `voteDispatcher` (`:203-252`) does the confidence-weighted top-K vote with the `confidenceCap: 0.8` clamp.
- **Graceful no-op** — `loadGnnCheckpoint` returns `{ok:false, reason:"no-checkpoint"}` on ENOENT (`:128`) and `classifyUnknownGhosts` skips (`:275-277`). `PRISM_NNG_DISABLE=1` → `empty(true,"disabled")` (`:271`). Doc claim "missing checkpoint makes the GNN tier a graceful no-op" is honest.
- **Exit gates** — `GATE_THRESHOLDS = {auroc:0.78, macroF1:0.55, brier:0.15}` (`nn-graph-eval.mjs:51`). Exact match.
- **Honesty caveat is genuinely carried** — `nn-graph-eval.mjs:19-24` header HONESTY NOTE, plus the rendered report body emits the caveat as a blockquote (`renderReport`, `:367-368`: *"Internal-consistency metric ... NOT verified ground truth."*). The doc's claim "`scripts/lib/nn-graph-eval.mjs` states this in every report" is verified 
... [+5839 chars truncated]
