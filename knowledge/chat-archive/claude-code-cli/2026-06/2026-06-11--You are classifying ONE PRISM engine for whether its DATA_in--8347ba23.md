---
type: "chat-session"
source: "claude-code-cli"
session_id: "8347ba23-a479-47f7-8ee0-b6014bc5e610"
title: "You are classifying ONE PRISM engine for whether its DATA/introspection surface "
date: "2026-06-11"
first_ts: "2026-06-11T23:52:09.884Z"
last_ts: "2026-06-11T23:52:55.444Z"
cwd: "H:\\prism-slot-bravo"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism-slot-bravo/8347ba23-a479-47f7-8ee0-b6014bc5e610/subagents/workflows/wf_4ebeaa0f-2cc/agent-afbed98fd9c39d137.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:38"
---

# You are classifying ONE PRISM engine for whether its DATA/introspection surface 

> **claude-code-cli** | 2026-06-11 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/8347ba23-a479-47f7-8ee0-b6014bc5e610/subagents/workflows/wf_4ebeaa0f-2cc/agent-afbed98fd9c39d137.jsonl`

## Transcript

### User | 2026-06-11T23:52:09.884Z

You are classifying ONE PRISM engine for whether its DATA/introspection surface should be wired to an MCP dispatcher. Engine: mcp-server/src/engines/SFCRAGWarmStartEngine.ts

STEPS (be precise, R8 = verify, never guess):
1. Read the engine file (Read tool, the whole file if <700 lines, else the header + class signature + the exported method list).
2. Identify the export: `export const xEngine = new XEngine()` (singleton) OR `export const xEngine = XEngine` (class-static) OR both. Record export_name + export_kind exactly.
3. List its PUBLIC methods and their signatures. For each, decide returns_data_not_inference: TRUE if it returns stored DATA / stats / readiness / lineage / ledger / deterministic compute (embeddings, string match, counts), FALSE if it runs a trained NEURAL-NET PREDICTION / model inference / generates a recommendation a machine would act on.
4. Grep real consumers: run `grep -rln "<ClassName>\|<singletonName>" mcp-server/src/engines mcp-server/src/tools/dispatchers` and report non-self hits. (A dispatcher hit means it is already wired; an engine hit consumed by a dispatcher-reachable engine means REACHABLE_EXEMPT.)

CLASSIFY (verdict):
- WIRE_SAFE_DATA: it is india-AI-core (NN/GNN/LoRA/RAG/embedding/reasoning/knowledge/consensus/anomaly/policy-ledger) AND has >=1 R12-safe DATA/stats/readiness method that is currently dispatcher-dark. Propose 1-3 dispatcher actions (snake_case names, the engine method each maps to, and which dispatcher: prism_ai / prism_intelligence / prism_calc / prism_memory). NEVER propose an action that exposes NN inference.
- NN_INFERENCE_ONLY: its only meaningful surface is trained-model inference -> do NOT wire (india keeps NN inference gated until trained). Still report any stats-only method if one exists.
- MIDDLEWARE_EXEMPT: it is a *Wire/Wiring middleware engine driven by another engine in-process; dispatcher exposure is not natural.
- REACHABLE_EXEMPT: already reachable through a dispatcher-wired consumer (name it).
- IND
... [+358 chars truncated]

### Assistant | 2026-06-11T23:52:15.339Z

I'll analyze the SFCRAGWarmStartEngine.ts file systematically.

### Assistant | 2026-06-11T23:52:16.273Z

[tool_use: Read]

### Assistant | 2026-06-11T23:52:17.548Z

[tool_use: Bash]

### User | 2026-06-11T23:52:25.867Z

[tool_result] 1	// WIRE-EXEMPT: Middleware engine called by SFC engines internally, not exposed via dispatcher
2	/**
3	 * SFCRAGWarmStartEngine — U-PPG-SFC-07
4	 * =====================================
5	 *
6	 * Wire jmDieProgramRAGEngine into SFC for historical-prior retrieval. On new
7	 * quote, fetch top-5 nearest historical {material × tool_class × machine × op_type}
8	 * programs from JM Die corpus. Use as
... [+14790 chars truncated]

### User | 2026-06-11T23:52:37.987Z

[tool_result] H:\prism-slot-bravo\mcp-server\src\engines/SFCMultiHypothesisRankerEngine.ts
H:\prism-slot-bravo\mcp-server\src\engines/SFCRAGWarmStartEngine.ts

### Assistant | 2026-06-11T23:52:44.139Z

Now I have all the information needed to classify this engine.

Key findings:
- The file header line 1 explicitly states: `// WIRE-EXEMPT: Middleware engine called by SFC engines internally, not exposed via dispatcher`
- Export at line 377: `export const sfcRAGWarmStartEngine = SFCRAGWarmStartEngine` — class-static pattern
- Consumer grep returned `SFCMultiHypothesisRankerEngine.ts` as the only non-self hit (no dispatcher files hit)
- The engine is driven in-process by `SFCMultiHypothesisRankerEngine` which consumes it as a Bayesian prior source
- All methods are class-static: `retrieve`, `retrieveForProvenance`, `isIndexReady`, `getIndexStats`, `getSelfAwareness`, plus private helpers

### Assistant | 2026-06-11T23:52:51.147Z

[tool_use: StructuredOutput]

### User | 2026-06-11T23:52:55.444Z

[tool_result] Structured output provided successfully
