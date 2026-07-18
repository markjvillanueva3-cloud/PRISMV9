---
type: "chat-session"
source: "claude-code-cli"
session_id: "05ceb444-c381-4be3-a54c-91d4043e4329"
title: "Deep dive on improving PRISM's \"Graph Neural Network (GraphSAGE wiring-inference"
date: "2026-05-29"
first_ts: "2026-05-29T19:17:18.322Z"
last_ts: "2026-05-29T19:56:01.828Z"
cwd: "H:\\prism-slot-india"
messages: 80
user_msgs: 33
assistant_msgs: 47
raw_file: "H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/workflows/wf_d1cc0086-132/agent-ad2f1877cddbfb92e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Deep dive on improving PRISM's "Graph Neural Network (GraphSAGE wiring-inference

> **claude-code-cli** | 2026-05-29 | 80 msgs (33 user / 47 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/workflows/wf_d1cc0086-132/agent-ad2f1877cddbfb92e.jsonl`

## Transcript

### User | 2026-05-29T19:17:18.322Z

Deep dive on improving PRISM's "Graph Neural Network (GraphSAGE wiring-inference)". Focus: message-passing depth, the system-graph as input, reference-pool seeding, why heterophily collapse happened, the n:<id> vs wiki:<rel-path> embedding-key mismatch

PRISM grounding (READ real files in worktree H:/prism-slot-india; it is divergent from main H:/prism — NN-GRAPH state + many engines live ONLY on main):
- Galaxy brain: mcp-server/src/engines/ai-training/{KNOWLEDGE.md,RULES.md,MEMORY.md,PATHS.md}
- VERIFIED FACTS from the first deep-dive (do not re-litigate): closed-loop IS ignited at boot (index.ts:434 XProcNeuralAutoFireEngine.activate) but CrossProcessOutcomeStore is ephemeral (configureStorePath has 0 prod callers); CAG cold-anchor is a no-op (PromptCachingEngine output reaches no live call site; LLMEngine.ts:327 _callClaude sends plain string); NN-GRAPH AUROC 0.096 is the link-prediction PRETEXT diagnostic NOT the deploy gate (gate correctly DEFERRED on poolSize=0, data-side); stratified neg-sampling ALREADY coded (graphsage-trainer.mjs:167, main).
- Constraints: duplicationGuard THROWS on new dup engines; NEVER inline physics constants; NEVER bypass the NN deploy gate. Ollama /api/chat is DEAD this session (no live embed).

TASK: Read the relevant PRISM files (Read/Grep/Glob) to establish what EXISTS — cite real paths, do not guess. Then list concrete improvements with leverage(1-10), effort, venue, the PRISM target file/engine, the named technique, and duplicationRisk (search first — duplicationGuard THROWS). Prioritize genuinely high-impact wiring/coupling fixes over cosmetic ones; be honest about what's already built.
CRITICAL: You MUST finish by calling the StructuredOutput tool with your findings. Do your file reads FIRST, keep them focused, then call StructuredOutput. Do not end your turn with prose — the StructuredOutput call IS the deliverable.

### Assistant | 2026-05-29T19:17:32.306Z

I'll establish what exists by reading the relevant PRISM files. Let me start with the galaxy brain docs and the NN-GRAPH state.

### Assistant | 2026-05-29T19:17:33.783Z

[tool_use: Bash]

### Assistant | 2026-05-29T19:17:34.294Z

[tool_use: Glob]

### Assistant | 2026-05-29T19:17:34.491Z

[tool_use: Glob]

### User | 2026-05-29T19:18:06.013Z

[tool_result] No files found

### User | 2026-05-29T19:18:07.076Z

[tool_result] No files found

### User | 2026-05-29T19:21:22.513Z

[tool_result] AI-SYSTEMS-IMPROVEMENT-ROADMAP.md  10.6K
CLAUDE.md  12.6K
KNOWLEDGE.md  4.2K
MEMORY.md  8.5K
PATHS.md  11.1K
RULES.md  4.7K
TOOLBELT.md  3.7K

### Assistant | 2026-05-29T19:21:25.832Z

The graphsage files aren't on the india slot. Let me read the galaxy brain docs and find the NN-GRAPH artifacts.

### Assistant | 2026-05-29T19:21:26.140Z

[tool_use: Read]

### Assistant | 2026-05-29T19:21:26.664Z

[tool_use: Read]

### User | 2026-05-29T19:21:53.199Z

[tool_result] 1	# AI-Training Domain Knowledge Index (slot:india)
2	
3	> Compiled one-stop index of ALL relevant wiki + tribal + action knowledge for the ai-training domain (NN/GNN/LoRA/RAG/deep-learning/retrain). Enumerated from `H:/prism/knowledge/wiki/` 2026-05-29 (U-PSGB-INDIA-AUDIT). **Auto-invoked** for india sessions via `india-awareness-inject.mjs` (surfaces the pointer + live state) + `tribal-by-domain
... [+3965 chars truncated]

### User | 2026-05-29T19:21:53.262Z

[tool_result] 1	# PATHS.md — slot:india (ai-training) H:/-wide path atlas
2	
3	> Converts future Grep/Glob from O(N) → O(1) for slot:india. **`(✓)` = verified on the canonical MAIN tree `H:/prism` (where shared/fleet substrate lives), 2026-05-28/29.**
4	> ⚠ **Worktree-staleness disclosure (R12/AI-T8):** this `slot/india` worktree is ~874 commits behind `origin/main`. The shared NN-GRAPH scripts (`scripts/lib/gr
... [+10967 chars truncated]

### Assistant | 2026-05-29T19:21:58.713Z

The worktree is divergent — the NN-GRAPH scripts live only on main (`H:/prism`). Let me read the RULES.md, MEMORY.md, the wiki entries, and the actual graphsage scripts on the main tree.

### Assistant | 2026-05-29T19:21:59.698Z

[tool_use: Read]

### Assistant | 2026-05-29T19:22:00.194Z

[tool_use: Read]

### Assistant | 2026-05-29T19:22:01.177Z

[tool_use: Bash]

### User | 2026-05-29T19:22:19.750Z

[tool_result] 1	# AI-Training Domain Rules + GSD Protocol (slot:india)
2	
3	> Domain-specific complement to global CLAUDE.md R1–R12 and the galaxy `CLAUDE.md`. These rules + the Get-Stuff-Done lifecycle govern ALL ai-training work (NN / GNN / LoRA / RAG / deep-learning / deep-reasoning / retrain / self-improvement loop). Distilled from india's session history + domain docs (U-PSGB-INDIA-AUDIT, 2026-05-28/29). L
... [+4391 chars truncated]

### User | 2026-05-29T19:22:20.435Z

[tool_result] 1	# AI Training Galaxy MEMORY.md — per-domain working brain (slot:india)
2	
3	Append-only cross-session memory for the india slot (full-system training: AI/NN/GNN/LoRA/RAG/DL/ML).
4	
5	## Master-brain link
6	> Cloned from `state/shared/specs/MASTER-BRAIN-TEMPLATE.md` (alpha-owned canonical pattern — fine-tuned for ai-training, brain wiring NOT re-derived).
7	- **UP (pull from master):** `C:/Users/
... [+8356 chars truncated]

### User | 2026-05-29T19:26:49.444Z

[tool_result] graphsage-checkpoint.mjs  10.9K
graphsage-checkpoint.test.mjs  15.9K
graphsage-model.mjs  11.2K
graphsage-model.test.mjs  14.5K
graphsage-predictor.mjs  16.7K
graphsage-predictor.test.mjs  24.2K
graphsage-train-pipeline.mjs  38.7K
graphsage-train-pipeline.test.mjs  45.8K
graphsage-trainer.mjs  20.8K
graphsage-trainer.test.mjs  26.2K
---NN-GRAPH STATE---
NN-EVAL.json  670B
NN-EVAL.md  1.1K
feedback
... [+301 chars truncated]

### Assistant | 2026-05-29T19:26:58.366Z

Now let me read the actual graphsage scripts on main — the predictor (embed-key mismatch), trainer (stratified sampling), the eval/gate, and the NN-EVAL state. These are the load-bearing files for the task.

### Assistant | 2026-05-29T19:26:58.708Z

[tool_use: Read]

### Assistant | 2026-05-29T19:26:59.195Z

[tool_use: Read]

### Assistant | 2026-05-29T19:26:59.636Z

[tool_use: Read]

### Assistant | 2026-05-29T19:27:00.146Z

[tool_use: Read]

### User | 2026-05-29T19:27:08.562Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\graphsage-predictor.mjs' was already read 15s ago in this session and is unchanged (mtime 1779662171737). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-29T19:27:13.640Z

[tool_result] 1	{
2	  "deferred": true,
3	  "reason": "insufficient-reference-pool",
4	  "checkpointPresent": true,
5	  "poolSize": 0,
6	  "checkpointMeta": {
7	    "trainedAt": "2026-05-16T21:34:13.774Z",
8	    "nodeCount": 20460,
9	    "cappedNodes": 5998,
10	    "truncated": true,
11	    "edgeCount": 6562,
12	    "trainEdgeCount": 5250,
13	    "testEdgeCount": 1312,
14	    "evalNegativeCount": 1312,
15	    "
... [+342 chars truncated]

### User | 2026-05-29T19:27:13.641Z

[tool_result] 1	# NN-GRAPH-MS0 GNN Tier-5 Assessment — NN-EVAL
2	
3	**Status: DEFERRED** — insufficient-reference-pool
4	
5	A trained GraphSAGE checkpoint **is present and loaded cleanly** — the
6	U4 training-pipeline blocker is resolved.
7	
8	The deploy gate cannot be graded yet for a **data-side** reason, not
9	a code-side one:
10	
11	- Reference pool in the current system-viz graph: **0** high-
12	  confiden
... [+818 chars truncated]

### User | 2026-05-29T19:27:15.452Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "generatedAt": "2026-05-23T20:30:00Z",
4	  "generatedBy": "alpha slot, claude-95e7030e, TOKEN-SAVINGS-PIVOT/U-PSN-NN-SEED (gap-fill 5/5)",
5	  "purpose": "Reference-pool seed for NN-GRAPH tier-5 (GraphSAGE wiring-inference). Currently dormant — AUROC 0.096 vs gate 0.78 because reference pool is 0-sized. This file provides 25+ seed examples drawn from the iter9
... [+6612 chars truncated]

### Assistant | 2026-05-29T19:27:23.144Z

The read-once guard says I already read graphsage-predictor.mjs (a prior session in this context window evidently). Let me read the predictor, trainer, model, eval, and the train-pipeline. The predictor is the key file for the embed-key mismatch. Let me grep the predictor for the embedding-key logic specifically, and read the trainer + eval files.

### Assistant | 2026-05-29T19:27:23.568Z

[tool_use: Read]

### Assistant | 2026-05-29T19:27:23.674Z

[tool_use: Read]

### User | 2026-05-29T19:27:29.663Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\graphsage-predictor.mjs' was already read 36s ago in this session and is unchanged (mtime 1779662171737). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-29T19:27:42.152Z

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
... [+25450 chars truncated]

### Assistant | 2026-05-29T19:27:47.833Z

Now I have the eval harness. The read-once guard claims I already read the predictor in this session. Since these files were read earlier in this context window, let me grep the specific load-bearing parts I need: the embed-key logic in the predictor + seed-ghost-classify, and the stratified sampling in the trainer/pipeline. Let me target those precisely.

### Assistant | 2026-05-29T19:27:50.538Z

[tool_use: Grep]

### Assistant | 2026-05-29T19:27:51.754Z

[tool_use: Grep]

### User | 2026-05-29T19:28:15.672Z

[tool_result] 75: *   1. `opts.embeddingSource` (file path) — loads the JSONL of int8 vectors
107:  const embeddingSource = typeof opts.embeddingSource === "string" && opts.embeddingSource.length > 0
108:    ? opts.embeddingSource
110:  if (embeddingSource) {
111:    const emb = loadEmbeddingFeatures(embeddingSource, nodeIds, {
117:    // with the trained embedding source (wiki:/engine.* IDs). For a 768-d
165: 
... [+841 chars truncated]

### User | 2026-05-29T19:28:18.097Z

[tool_result] 111:export function sampleNegativeEdges(nodeIds, edgeSet, count, rng) {
132: * Compute the positive-edge endpoint marginal over node-type buckets. Returns
133: * a Map<type, count> over the endpoints in `trainEdges` whose `nodeType` is
134: * known. Defensively handles a malformed `trainEdges` or `nodeType` (returns
138: * @param {Map<*,*>} nodeType per-node stratum label
141:export function posit
... [+1872 chars truncated]

### Assistant | 2026-05-29T19:28:25.439Z

Critical finding at predictor line 117: the embed-key comment says "wiki:/engine.* IDs". Let me read the predictor's `loadEmbeddingFeatures` and the key-matching logic precisely, plus where the trainer's stratified sampler is (or is NOT) wired into the training pipeline. The grep on line 502 shows the trainer's own training loop still calls plain `sampleNegativeEdges`, NOT the stratified one — that's a key wiring gap. Let me confirm.

### Assistant | 2026-05-29T19:28:26.407Z

[tool_use: Read]

### Assistant | 2026-05-29T19:28:27.040Z

[tool_use: Read]

### User | 2026-05-29T19:28:55.012Z

[tool_result] 460	    if (!feat.has(v) || !Array.isArray(nbrs)) continue;
461	    for (const u of nbrs) {
462	      if (u === v || !feat.has(u)) continue;
463	      const key = edgeKey(v, u);
464	      if (edgeSet.has(key)) continue;
465	      edgeSet.add(key);
466	      edges.push([v, u]);
467	    }
468	  }
469	  if (edges.length === 0) {
470	    return { lossHistory: [], finalLoss: NaN, epochs: 0, trained: fa
... [+1937 chars truncated]

### User | 2026-05-29T19:28:55.188Z

[tool_result] 60	
61	/** Breakpoints of a bundled calibrator, or null when there is no usable one. */
62	function calibratorBreakpoints(calibrator) {
63	  if (calibrator && Array.isArray(calibrator.breakpoints) && calibrator.breakpoints.length > 0) {
64	    return calibrator.breakpoints;
65	  }
66	  return null;
67	}
68	
69	/**
70	 * Embed every (capped) node of a graph with a frozen model. Returns
71	 * { embe
... [+7843 chars truncated]

### Assistant | 2026-05-29T19:29:04.415Z

Major finding confirmed. The trainer's low-level `trainGraphSage` loop at line 502 calls plain `sampleNegativeEdges`, NOT the stratified `sampleNegativeEdgesStratified` (defined at line 206). The CLAUDE.md/memory claim "stratified neg-sampling ALREADY coded" is true — the *function* exists — but the inner training loop in `graphsage-trainer.mjs` does NOT call it. The VERIFIED FACT says it's wired at `graphsage-trainer.mjs:167` — that's where the *function is defined* (line 167 is the JSDoc), not where it's *called*. Let me verify by checking the train-pipeline, which is the orchestrator that may pass stratification through, and confirm what `loadEmbeddingFeatures` keys on.

### Assistant | 2026-05-29T19:29:06.309Z

[tool_use: Grep]

### Assistant | 2026-05-29T19:29:08.715Z

[tool_use: Grep]

### User | 2026-05-29T19:29:44.481Z

[tool_result] 42:  positiveTypeMarginal,
65:  // U-NNG-PIPELINE-STRATIFIED-WIRE: wire the trainer's stratified negative
66:  // sampler into both train and eval paths. Off by default (nodeTypeField:
68:  // don't opt in — the deploy-gate retry sets `nodeTypeField: "layer"`.
69:  // `negPHard` is the fraction of negatives drawn INTRA-type when stratified
70:  // sampling is active; ignored when nodeTypeField is 
... [+3499 chars truncated]

### User | 2026-05-29T19:29:45.089Z

[tool_result] 9: *   normalizeGraph (edge-typology-norm)   collapse raw edge types to core types
35:import { normalizeGraph } from "./edge-typology-normalizer.mjs";
183:    const id = n.id;
199: * `q[i]/127` (recovers the L2-normalized component in roughly [-1, 1]).
218:export function loadEmbeddingFeatures(filePath, nodeIds, opts = {}) {
260:    const id = obj.n;
272:    features.set(id, v);
337:    if (typeof
... [+531 chars truncated]

### Assistant | 2026-05-29T19:29:52.499Z

This clarifies the architecture. The stratified sampler IS wired — but only in `graphsage-train-pipeline.mjs` (line 690), the orchestrator, and only when `nodeTypeField` is set (default `null` = OFF, line 72). The low-level `trainGraphSage` in `graphsage-trainer.mjs` (line 502) is a fallback uniform path. Now let me confirm the embed-key: `loadEmbeddingFeatures` keys on `obj.n` (line 260). Let me see what `obj.n` IS in the embedding JSONL vs what the system-graph node IDs are, plus how `prioritizeEmbeddedNodes` and `extractNodeTypes` work — these are the crux of the `n:<id>` vs `wiki:<rel-path>` mismatch.

### Assistant | 2026-05-29T19:29:53.797Z

[tool_use: Read]

### Assistant | 2026-05-29T19:29:55.686Z

[tool_use: Bash]

### User | 2026-05-29T19:30:45.588Z

[tool_result] 218	export function loadEmbeddingFeatures(filePath, nodeIds, opts = {}) {
219	  if (typeof filePath !== "string" || filePath.length === 0) return null;
220	  const wanted = nodeIds instanceof Set
221	    ? nodeIds
222	    : new Set(nodeIds && typeof nodeIds[Symbol.iterator] === "function" ? nodeIds : []);
223	  if (wanted.size === 0) return null;
224	  const readFileImpl = typeof opts.readFileImpl
... [+4067 chars truncated]

### User | 2026-05-29T19:35:18.973Z

[tool_result] === embedding JSONL first line keys ===
{"__meta":true,"model":"nomic-embed-text:latest","dim":768,"count":3683,"generatedAt":"2026-05-25T20:56:20.645Z","schemaVersion":1,"source":"graph-node-bridge"}
{"n":"reg.postprocessorregistry","q":[2,-1,-21,0,9,-7,1,5,-4,-7,-5,8,9,7,2,-1,6,-6,-1,5,1,-6,-3,-4,13,-1,1,-1,1,5,4,-2,0,-3,-10,-6,9,-2,-2,-6,3,0,5,-10,4,2,12,1,3,-3,10,4,-5,-1,7,5,2,5,3,-7,7,8,-1,10
... [+554 chars truncated]

### Assistant | 2026-05-29T19:35:42.177Z

This is the decisive evidence. The embedding JSONL key is `obj.n = "reg.postprocessorregistry"` (an `<type>.<name>` node-ID form, e.g. `reg.*`, and per the comment `wiki:`/`engine.*` forms). The **live** checkpoint has `inputDim: 8` — it is the OLD 8-d projected-feature model, NOT the 768-d embedding model. The 768d checkpoint is the separate `graphsage-checkpoint-768d-rag-upgrade.json`. So the live gate runs the 8-d model with zero embedding overlap. Let me confirm the embed-key form used by the system-graph nodes (the `buildAdjacency`/`normalizeGraph` IDs) and check the 768d checkpoint's metadata + embeddingSource, plus how `seed-ghost-gnn-classify` keys nodes. Then check duplication-guard surface for any new-engine risk.

### Assistant | 2026-05-29T19:35:45.862Z

[tool_use: Bash]

### Assistant | 2026-05-29T19:35:46.675Z

[tool_use: Read]

### User | 2026-05-29T19:37:14.907Z

[tool_result] === 768d-rag-upgrade checkpoint metadata ===
{
 "trainedAt": "2026-05-22T23:12:04.676Z",
 "nodeCount": 258605,
 "cappedNodes": 6000,
 "truncated": true,
 "edgeCount": 7092,
 "trainEdgeCount": 5674,
 "testEdgeCount": 1418,
 "evalNegativeCount": 1418,
 "epochs": 30,
 "trained": true,
 "finalLoss": 0.7636328383707894,
 "inputDim": 8,
 "hiddenDim": 64,
 "embedDim": 32,
 "auroc": 0.29713799606509894,
 
... [+1334 chars truncated]

### User | 2026-05-29T19:37:18.821Z

[tool_result] 160	    link(v, u);
161	  }
162	  return adj;
163	}
164	
165	/**
166	 * U-NNG-PIPELINE-STRATIFIED-WIRE: build a per-node type map from the raw
167	 * graph's node array using the named field. Returns `null` when `fieldName`
168	 * is null / not a string / no node carries the field — the pipeline then
169	 * skips stratification entirely (legacy uniform path). Pure.
170	 *
171	 * `fieldName` is rea
... [+2551 chars truncated]

### Assistant | 2026-05-29T19:37:31.428Z

Now the full picture is clear and quantified. Three checkpoints exist with a clear progression:
- **live** (`graphsage-checkpoint.json`): inputDim 8, AUROC 0.096, uniform, projected — the OLD model
- **768d-rag-upgrade**: inputDim 8 (!), AUROC 0.297, stratified=true, but `featureSource: projected`, embeddingHitCount 0 — stratification helped (0.096→0.297) but embeddings still didn't connect
- **candidate** (newest, 2026-05-25): inputDim 768, AUROC 0.405, stratified=true, `featureSource: embedding`, embeddingHitCount 3681 / miss 2317 — embeddings finally connected, AUROC nearly doubled again. But still < 0.78 gate.

The embed-key story: `loadEmbeddingFeatures` keys on `obj.n` and intersects with the graph's capped nodeIds. The candidate got 3681 hits (the full embed corpus is 3683 rows) but 2317 misses — meaning ~38% of the capped 5998 training nodes had NO embedding (zero-padded). The embedding corpus only covers 3683 nodes out of a 288K-node graph. Let me confirm the node-ID normalization key shape (the `n:` vs `wiki:` discrepancy referenced in the task) by checking how the bridge generates embedding keys vs system-graph node IDs, and verify duplication risk. Let me read the embedding bridge and the depth/aggregation config of the model.

### Assistant | 2026-05-29T19:37:33.786Z

[tool_use: Grep]

### Assistant | 2026-05-29T19:37:35.583Z

[tool_use: Grep]

### User | 2026-05-29T19:38:05.107Z

[tool_result] 9: * expects an embedding-source JSONL keyed by `n: <node.id>`, but the wiki
10: * tribal-embed-index is keyed by `wiki:<rel-path>` (or `external:<abs>`). Until
16: * back to the tribal index key, (b) look up the 768-d embedding, (c) aggregate
17: * multiple hits into an L2-normalized centroid, (d) int8-quantize for the
26: *   {"n":"p.operator","q":[127,0,-127,...]}
27: *   {"n":"engine.WireEDMOp
... [+1863 chars truncated]

### User | 2026-05-29T19:38:08.562Z

[tool_result] 10: * with the MEAN aggregator (parameter-free, robust):
12: *   layer k:  agg   = mean( h^{k-1}_u : u in neighbours(v) )
42:  hiddenDim: 256, // layer-1 output width
89:  const hiddenDim = opts.hiddenDim ?? MODEL_DEFAULTS.hiddenDim;
93:  validateDims("hiddenDim", hiddenDim);
98:    { rows: hiddenDim, cols: 2 * inputDim },  // layer 1: concat(x, agg) -> hidden
99:    { rows: embedDim, cols: 2 * hi
... [+684 chars truncated]

### Assistant | 2026-05-29T19:38:18.062Z

Now I have the complete `n:` vs `wiki:` story directly from the source. The `graph-node-embedding-bridge.mjs` header (lines 9-16) documents the exact mismatch: the GraphSAGE pipeline expects embedding JSONL keyed by `n: <node.id>`, but the wiki tribal-embed-index is keyed by `wiki:<rel-path>` (or `external:<abs>`). The bridge `wikiPathToIndexKey` resolves node→wiki and re-emits keyed by `node.id` (e.g. `engine.WireEDMOptimizationEngine`, `reg.postprocessorregistry`). The bridge IS the solution that produced the candidate's 3681 hits.

Model facts confirmed: GraphSAGE is **K=2 fixed depth** (line 112 `k: 2`), MEAN aggregator (full-neighborhood, no neighbor sampling/fanout — `forwardLayer` aggregates all neighbors). This matters for the depth-improvement item.

I have enough grounded evidence. Let me do one final duplication-guard check on candidate engine/script names I might recommend, then compile findings.

### Assistant | 2026-05-29T19:38:21.895Z

[tool_use: Bash]

### User | 2026-05-29T19:43:43.136Z

[tool_result] Command running in background with ID: bm86t0l05. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism-slot-india\30b4c486-250f-49c8-a8c5-bed55acc23f1\tasks\bm86t0l05.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-29T19:43:48.228Z

[tool_use: Bash]

### User | 2026-05-29T19:48:52.701Z

[tool_result] Command running in background with ID: b4vc3o4yq. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism-slot-india\30b4c486-250f-49c8-a8c5-bed55acc23f1\tasks\b4vc3o4yq.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-29T19:48:57.232Z

[tool_use: Read]

### User | 2026-05-29T19:49:05.180Z

[tool_result] 1	=== embedding-coverage scripts ===
2	build-node-embeddings.mjs*
3	build-node-embeddings.test.mjs*
4	=== bridge invocation sites ===
5	

### Assistant | 2026-05-29T19:49:09.541Z

The bridge grep returned empty — meaning `graph-node-embedding-bridge.mjs` and `generate-gnn-embed-bridge-features.mjs` are NOT invoked by any script under `scripts/` or `.claude/` (orphaned: the bridge that solves the key-mismatch exists but isn't wired into the retrain lifecycle). Let me confirm the retrain-lifecycle embedding refs (the second part of the grep got cut) and check the bridge's own CLI/main entry.

### Assistant | 2026-05-29T19:49:12.580Z

[tool_use: Bash]

### User | 2026-05-29T19:54:17.154Z

[tool_result] Command running in background with ID: bhej0656m. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism-slot-india\30b4c486-250f-49c8-a8c5-bed55acc23f1\tasks\bhej0656m.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-29T19:54:20.962Z

[tool_use: Grep]

### User | 2026-05-29T19:54:25.519Z

[tool_result] 17: *   3. RETRAIN      — spawn graphsage-train-pipeline.mjs with --out pointed at
20: *   4. EVALUATE     — runAssessment() grades the candidate against the
23: *   5. PROMOTE      — atomically swap candidate -> live ONLY when every gate
24: *                     clears. A deferred (un-graded) or sub-gate candidate is
25: *                     NEVER promoted. The prior live checkpoint is preserve
... [+2106 chars truncated]

### Assistant | 2026-05-29T19:54:34.086Z

Important correction to my earlier finding: `nn-graph-retrain-lifecycle.mjs` DOES import the bridge (line 62 `buildEmbeddingSource as buildNodeEmbeddingSource`), uses `nodeTypeField: "layer"` (line 90 — stratification ON in the retrain path), and uses `node-embeddings-768d.jsonl` (line 70). So the retrain lifecycle IS the wired consumer — my earlier grep for the literal filename missed the aliased import. The lifecycle: builds embedding source from tribal index → trains to candidate with stratified+768d → evals → promotes only on gate-pass. This is correct and the candidate (AUROC 0.405) is the product of it.

So the real state: the pipeline is correctly built and wired; the gate correctly refuses to promote because AUROC 0.405 < 0.78. The bottleneck is **model quality / coverage**, not wiring. The key levers are: (1) embedding coverage 3683/288K nodes, (2) only 5998 capped nodes / ~6-7K edges trained, (3) K=2 fixed depth, (4) the link-prediction pretext vs the deploy task mismatch, (5) the empty reference-pool that makes the *deploy gate itself* ungradeable independent of model quality.

I have thorough grounded evidence. Compiling the structured output now.

### Assistant | 2026-05-29T19:55:42.599Z

[tool_use: StructuredOutput]

### User | 2026-05-29T19:55:48.445Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-29T19:56:01.828Z

I have completed the deep dive and delivered findings via StructuredOutput. The background grep that failed was redundant — I had already confirmed the retrain-lifecycle's bridge import via the Grep tool (line 62) and the stratification wiring (line 90), which corrected my earlier transient assumption that the bridge was orphaned.

Summary of the grounded analysis:

The GraphSAGE wiring-inference GNN is more correctly built and wired than the galaxy docs suggest. Reading the actual checkpoints' embedded metadata revealed a clear, real improvement trajectory: AUROC 0.096 (uniform, 8d projected) → 0.297 (stratified neg-sampling) → 0.405 (stratified + 768d embeddings). Both interventions measurably worked; the candidate is still below the 0.78 gate, so the bottleneck is model quality and data coverage, not wiring.

The five focus areas resolved as:
- **Heterophily collapse**: caused by uniform neg-sampling on a type-skewed graph + a full-neighborhood MEAN aggregator at fixed K=2 (`graphsage-model.mjs:112`). Stratified sampling is the wired fix (`graphsage-train-pipeline.mjs:638-693`); the deeper fix is a heterophily-aware aggregator + supervised node-classification head replacing the link-prediction proxy.
- **n:/wiki: embed-key mismatch**: documented and already SOLVED by `graph-node-embedding-bridge.mjs` (`wikiPathToIndexKey`, lines 9-16/80), which re-keys `wiki:<rel-path>` → `n:<node.id>`. It's imported by the retrain lifecycle (line 62) and produced the candidate's 3681 embedding hits.
- **Reference-pool seeding**: the highest-leverage P0 — `reference-pool-seed-2026-05-23.json` exists with 25+ labeled triples but `buildHoldout` (`nn-graph-eval.mjs:225-249`) never reads it, so the deploy gate is ungradeable whenever graph regen yields <2 ghosts (currently poolSize 0).
- **System-graph as input + message-passing depth**: training is capped to ~6K of 288K nodes; embedding coverage is 3683/288K, leaving ~39% of trained nodes zero-padded into the MEAN.

All six improvem
... [+168 chars truncated]
