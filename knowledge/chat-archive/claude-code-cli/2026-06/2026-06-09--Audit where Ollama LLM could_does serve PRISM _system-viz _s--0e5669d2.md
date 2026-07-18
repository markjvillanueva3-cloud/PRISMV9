---
type: "chat-session"
source: "claude-code-cli"
session_id: "0e5669d2-0f99-48ce-941d-0eac73b5624f"
title: "Audit where Ollama LLM could/does serve PRISM /system-viz (sierra's domain). Ins"
date: "2026-06-09"
first_ts: "2026-06-09T15:42:37.000Z"
last_ts: "2026-06-09T15:49:59.167Z"
cwd: "H:\\prism"
messages: 62
user_msgs: 25
assistant_msgs: 37
raw_file: "H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_7f974777-bf2/agent-a689e4c1d17cb45da.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# Audit where Ollama LLM could/does serve PRISM /system-viz (sierra's domain). Ins

> **claude-code-cli** | 2026-06-09 | 62 msgs (25 user / 37 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_7f974777-bf2/agent-a689e4c1d17cb45da.jsonl`

## Transcript

### User | 2026-06-09T15:42:37.000Z

Audit where Ollama LLM could/does serve PRISM /system-viz (sierra's domain). Inspect: scripts/regen-viz.mjs, scripts/generate-vault-graph.mjs, scripts/system-viz-query.mjs, scripts/lib/node-card-*.mjs, the ghost-roost generators, scripts/system-viz-obsidian-bridge-v2.mjs, and any script that generates node/ghost DESCRIPTIONS or summaries or rerank text. Question: do any of these call Claude (or hardcode 7b, or do it procedurally) for text that a local 32b/7b could generate — e.g. ghost-roost descriptions, node-card summaries, find-result reranking, canvas summary prose? Report ALREADY-Ollama vs GAP with file:line + token evidence. LIVE Ollama models loaded NOW on the 96GB RTX PRO 6000 Blackwell (verified this session): qwen2.5-coder:1.5b, qwen2.5-coder:7b, qwen2.5-coder:32b, gpt-oss:20b, gpt-oss:120b, qwen3-vl:8b(-instruct), qwen2.5vl:7b, moondream:1.8b, llama3.2-vision:11b, nomic-embed-text. So a heavy local tier (32b coder / 120b general / vision / embeddings) is AVAILABLE — recommend the SMALLEST model that does each job well.

ALREADY-VERIFIED-NON-VIABLE (alpha, 2026-06-09, reference_obsidian_tokensavings_premise_falsified):
(a) WIDENING the local-llm-task-router WORK_CLASS_PATTERNS to push offload toward 30% is a FALSE PREMISE — live dashboard: fired=53, offload=3, keep=44, where the 44 keeps are CORRECT (orchestration 34, operator_directive 5, safety 1, deep_reasoning 1 — all judgment tasks that MUST stay on Claude per R5). The low ~5-6% offload rate is an orchestration-heavy SESSION SHAPE, not a misrouting bug. Do NOT propose widening the classifier to offload orchestration/directives/reasoning — that is a REGRESSION.
(b) session-end-goal-synthesis LLM pass is DORMANT (unwired in both settings.json) and reads month-stale data — do NOT propose wiring an LLM pass onto dead data.
The real lever is NOT a classifier code-fix; it is (1) BEHAVIORAL adoption of existing offload suggestions, and (2) routing the HEAVY CREATION/SYNTHESIS work that ALREADY goes to Ollama
... [+785 chars truncated]

### Assistant | 2026-06-09T15:42:55.977Z

I'll audit the /system-viz surfaces for Ollama LLM usage. Let me start by reading the named files and grepping for LLM-call patterns.

### Assistant | 2026-06-09T15:42:56.430Z

[tool_use: Glob]

### Assistant | 2026-06-09T15:42:56.997Z

[tool_use: Glob]

### Assistant | 2026-06-09T15:42:57.586Z

[tool_use: Glob]

### Assistant | 2026-06-09T15:42:58.485Z

[tool_use: Bash]

### User | 2026-06-09T15:43:29.959Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-09T15:43:34.560Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-09T15:43:34.645Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-09T15:44:29.320Z

[tool_result] -rwxr-xr-x 1 wompu 197611  9548 May 24 22:55 H:/prism/scripts/generate-vault-graph.mjs*
-rwxr-xr-x 1 wompu 197611 29445 Jun  9 08:58 H:/prism/scripts/regen-viz.mjs*
-rwxr-xr-x 1 wompu 197611 15453 Jun  4 08:39 H:/prism/scripts/system-viz-obsidian-bridge-v2.mjs*
-rwxr-xr-x 1 wompu 197611 25715 Jun  9 09:58 H:/prism/scripts/system-viz-query.mjs*

### Assistant | 2026-06-09T15:44:36.894Z

The graph hits aren't about Ollama wiring. I'll read the actual files directly. Let me read the four named files and find the node-card-lib and ghost-roost generators.

### Assistant | 2026-06-09T15:44:36.895Z

[tool_use: Read]

### Assistant | 2026-06-09T15:44:36.900Z

[tool_use: Read]

### Assistant | 2026-06-09T15:44:36.906Z

[tool_use: Read]

### User | 2026-06-09T15:44:41.181Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * system-viz-obsidian-bridge-v2.mjs
4	 *
5	 * Replaces the legacy v1 bridge which OOM'd on the 126K-node graph due to a
6	 * triple-nested substring scan (nodes × keywords × backlink-keys).
7	 *
8	 * v2 strategy:
9	 *   1. Scope-limit: only process semantically meaningful node layers
10	 *      (L0..L8 + L10). Skip L9 (fs root), L4a (9,228 actions), L11 (102,666
11	 
... [+16495 chars truncated]

### User | 2026-06-09T15:44:41.186Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-vault-graph.mjs — the graph→Obsidian direction of the 2nd-brain link.
4	 *
5	 * Emits a navigable JSON-Canvas summary of the PRISM system-graph into the vault so the
6	 * code map renders *inside* Obsidian (Canvas view): `knowledge/PRISM-System-Map.canvas`.
7	 * Obsidian Canvas chokes past ~a few hundred nodes, so this is a SUMMARY: the layer
8	 * hub/stru
... [+9618 chars truncated]

### User | 2026-06-09T15:44:43.796Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * regen-viz.mjs — single-shot regenerate the entire system-viz graph.
4	 *
5	 * Use cases:
6	 *   - After pdf-learn / video-learn / shop-knowledge / tribal-ingest writes
7	 *     new tips: knowledge-galaxy picks them up and emits new L8 nodes.
8	 *   - After any audit script that writes a new state/shared/UNWIRED-*.json:
9	 *     wiring-overlay emits fresh phantom ed
... [+30698 chars truncated]

### Assistant | 2026-06-09T15:44:53.496Z

These three files are pure procedural — no LLM calls, no Ollama, no Claude. Now let me read the node-card lib files, system-viz-query.mjs, and grep the ghost-roost generators for LLM patterns.

### Assistant | 2026-06-09T15:44:54.908Z

[tool_use: Read]

### Assistant | 2026-06-09T15:44:54.912Z

[tool_use: Bash]

### User | 2026-06-09T15:45:29.351Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * system-viz-query — programmatic adapter for the live system graph.
4	 *
5	 * Lets rgs / forge / roadmap tools consume system-graph.json without
6	 * embedding parsing logic. Read-only.
7	 *
8	 * Usage:
9	 *   node scripts/system-viz-query.mjs roadmap-candidates       # unwired + pending + drift
10	 *   node scripts/system-viz-query.mjs blast-radius <nodeId>    # do
... [+27201 chars truncated]

### User | 2026-06-09T15:45:44.997Z

[tool_result] H:/prism/scripts/lib/node-card-offset-lib.mjs
H:/prism/scripts/lib/node-card-offset-lib.test.mjs
H:/prism/scripts/lib/node-card-read.mjs
H:/prism/scripts/lib/node-card-read.test.mjs
H:/prism/scripts/lib/node-card-schema.mjs
H:/prism/scripts/lib/node-card-schema.test.mjs

### Assistant | 2026-06-09T15:45:53.842Z

system-viz-query is pure procedural (string formatting from graph fields — no LLM). Now the node-card lib files and the canvas-read-lib, plus the schema. Let me read those and grep all ghost-roost generators for LLM patterns.

### Assistant | 2026-06-09T15:45:54.261Z

[tool_use: Read]

### Assistant | 2026-06-09T15:45:54.404Z

[tool_use: Read]

### User | 2026-06-09T15:46:05.890Z

[tool_result] 1	/**
2	 * node-card-read.mjs — token-cheap read-by-id over the system-viz node substrate
3	 * (CHEAP-NODE-ACCESS-MS0, slot:sierra).
4	 *
5	 * `readCard(id)` returns a compact NodeCard (~200 tokens) for ANY of the ~302K
6	 * graph nodes WITHOUT loading the 644MB system-graph.json. It reads the freshest
7	 * compact projection sidecar (no new heavy build):
8	 *   - system-graph-index.json (~193MB, 
... [+14916 chars truncated]

### User | 2026-06-09T15:46:05.894Z

[tool_result] 1	/**
2	 * node-card-schema.mjs — the compact "node card" record shape for token-cheap
3	 * node reads (CHEAP-NODE-ACCESS-MS0, slot:sierra).
4	 *
5	 * THE PROBLEM: status-quo "find + read a node" loads the 644MB system-graph.json
6	 * to extract one node — ~186K tokens per access. A NodeCard is the minimal record
7	 * that lets an agent IDENTIFY + LOCATE a node (and route to its source doc) WITHOU
... [+5691 chars truncated]

### Assistant | 2026-06-09T15:46:14.484Z

Node-card pipeline is fully procedural — pure projection from sidecar fields, zero LLM. The "info"/"label"/"description" text comes from whatever the generators wrote. Now the key question: do the GHOST-ROOST GENERATORS or the find-rerank or canvas-summary generate text via LLM? Let me grep the entire scripts tree for LLM-call patterns.

### Assistant | 2026-06-09T15:46:16.819Z

[tool_use: Grep]

### Assistant | 2026-06-09T15:46:17.808Z

[tool_use: Grep]

### User | 2026-06-09T15:46:25.567Z

[tool_result] Found 100 files limit: 100
scripts\cimco-sim-fleet.mjs
scripts\mine-hotel-transcripts.mjs
scripts\lib\graphsage-train-pipeline.test.mjs
scripts\lib\graphsage-train-pipeline.mjs
scripts\lib\master-index-search-lib.test.mjs
scripts\lib\master-index-search-lib.mjs
scripts\brain-refresh.test.mjs
scripts\brain-refresh.mjs
scripts\fill-galaxy-claudemd-domain.mjs
scripts\galaxy-completeness-audit.mjs
scr
... [+3489 chars truncated]

### User | 2026-06-09T15:46:32.948Z

[tool_result] Found 105 files
scripts\merge-augmentations.mjs
scripts\regen-viz.mjs
scripts\generate-predicted-edges-features.test.mjs
scripts\generate-predicted-edges-features.mjs
scripts\generate-hermes-features.test.mjs
scripts\generate-hermes-features.mjs
scripts\embed-cited-tips-into-tribal-index.mjs
scripts\generate-octopus-consensus-features.mjs
scripts\generate-galaxy-federation-roost-features.mjs
scrip
... [+4440 chars truncated]

### Assistant | 2026-06-09T15:46:40.654Z

Key finding: NONE of the `generate-*-features.mjs` ghost-roost generators appear in the Ollama match list — confirming they are all procedural (no LLM text generation). The Ollama-touching scripts are a separate set. Let me now examine the directly-relevant ones: the canvas-read-lib (canvas summary prose), the find-rerank path, and the LLM-touching scripts that ARE in the /system-viz domain. Let me check which generators write node `info`/`description` text and whether any rerank/synthesis is LLM-backed.

### Assistant | 2026-06-09T15:46:40.655Z

[tool_use: Read]

### Assistant | 2026-06-09T15:46:40.659Z

[tool_use: Read]

### User | 2026-06-09T15:46:42.325Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\local-llm-task-router.mjs' was already read 4m ago in this session and is unchanged (mtime 1780595490364). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-09T15:46:43.661Z

[tool_result] 1	/**
2	 * canvas-read-lib.mjs — cheap reader for the Obsidian system-map CANVAS.
3	 *
4	 * THE GAP (last populated-node gap in the cheap-node-access map): the vault holds
5	 * `knowledge/PRISM-System-Map.canvas` — a JSONCanvas SUMMARY of the PRISM
6	 * system-graph (the structural backbone: layer hubs + top-degree nodes per layer,
7	 * laid out for Obsidian's Canvas view), written by `generate-va
... [+12532 chars truncated]

### Assistant | 2026-06-09T15:46:53.306Z

canvas-read-lib is pure procedural — `summarizeCanvas` builds counts + layer headers + sample basenames by string-slicing existing canvas node fields. The "summary prose" is NOT LLM-generated; it's structural. The canvas itself (generate-vault-graph.mjs) labels nodes from `n.label || n.id` truncated — also procedural.

The local-llm-task-router was already read this session. Now let me confirm: (1) whether any generator that writes node `info`/description text uses an LLM, (2) the find-rerank path, and (3) check the two scripts that look most relevant to system-viz text — the wiki-regen-from-viz and the contextual-blurb lib. Let me grep the feature generators for any description/blurb/summarize text and check the directly-named LLM-system-viz scripts.

### Assistant | 2026-06-09T15:46:55.721Z

[tool_use: Bash]

### Assistant | 2026-06-09T15:46:57.091Z

[tool_use: Read]

### User | 2026-06-09T15:47:00.286Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * contextual-blurb.mjs — Anthropic Contextual-Retrieval blurb generator.
4	 *
5	 * RAG-UPGRADE-MS0 / U-RAG-3 (2026-05-22).
6	 *
7	 * Generates a 1-2 sentence context blurb for a piece of content via Ollama's
8	 * /api/generate endpoint (small instruction-following model — qwen2.5-coder
9	 * by default). The blurb is intended to be PREPENDED to the chunk text
10	 * be
... [+6539 chars truncated]

### User | 2026-06-09T15:47:05.708Z

[tool_result] scripts/generate-ai-memo-xref-features.mjs
scripts/generate-bridge-priority-features.mjs
scripts/generate-bridge-synergy-features.mjs
scripts/generate-cadcam-training-corpus-features.mjs
scripts/generate-cag-router-features.mjs
---DESC-GREP---

### Assistant | 2026-06-09T15:47:16.214Z

Important finding: `contextual-blurb.mjs` ALREADY uses `qwen2.5-coder:32b` (line 25) via Ollama `/api/generate` — this is a heavy-tier model already wired. Confirms the corpus-context blurb is offloaded. The `info:` fields in ghost-roost generators are present but the desc-grep returned nothing for blurb/summarize/narrate, so they're hardcoded template strings, not LLM. 

Now let me verify the three key remaining surfaces: (1) is there a find-result RERANK that's LLM-backed (rag-llm-rerank.mjs)? (2) does regen-wiki-from-viz generate prose via LLM? (3) what model does the regen-wiki use? Let me check these plus a sample ghost-roost generator's info-field to confirm it's a hardcoded template.

### Assistant | 2026-06-09T15:47:17.297Z

[tool_use: Read]

### Assistant | 2026-06-09T15:47:19.189Z

[tool_use: Bash]

### User | 2026-06-09T15:47:20.771Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * rag-llm-rerank.mjs — HIGH-ROI-AI-PSN-SCOPE/U-RAG-RERANK-LLM (A7, 2026-05-23, slot golf).
4	 *
5	 * Stage-3 LLM reranker. Two-stage retrieval (cosine recall → lexical rerank)
6	 * leaves a top-N candidate set whose relative ordering still has noise. This
7	 * lib adds an optional Stage-3 LLM scoring pass that re-orders the top-N
8	 * using a small reasoning model (q
... [+7525 chars truncated]

### User | 2026-06-09T15:47:33.054Z

[tool_result] === regen-wiki-from-viz head ===
#!/usr/bin/env node
/**
 * regen-wiki-from-viz.mjs
 *
 * Orchestrator: runs every viz→wiki generator in sequence after the
 * system-viz graph regenerates. Wire into SessionStart, the system-viz-
 * on-commit hook, or invoke via slash command after `/system-viz`.
 *
 * Generators (run in dependency order):
 *   1. generate-layer-wiki.mjs       — 13 per-layer entrie
... [+1908 chars truncated]

### Assistant | 2026-06-09T15:47:45.503Z

This confirms the full picture. Key findings:

1. **`regen-wiki-from-viz.mjs`** — runs 4 wiki generators (layer/domain/dispatcher/overview entries), zero LLM refs. The viz→wiki entries are **template-generated procedural prose** (Mermaid + field interpolation), NOT LLM. This is a potential GAP for descriptive prose.
2. **Ghost-roost `info:` fields** — confirmed hardcoded template literals with field interpolation (`${trafficLine}` etc.). Not LLM.
3. **`rag-llm-rerank.mjs`** — ALREADY uses `qwen2.5-coder:32b`, but it's a RAG retrieval reranker, not the system-viz `find` path (which is procedural substring scoring in `findInGraph`).
4. **`contextual-blurb.mjs`** — ALREADY uses `qwen2.5-coder:32b`.

Let me confirm two final things: whether the system-viz `find` rerank is wired to rag-llm-rerank or is pure procedural, and verify the canvas galaxy-cluster extension + check if any node `info` text generator was ever meant to be LLM. Let me check `findInGraph` scoring and the galaxy-synthesis scripts (which feed `memory_patterns.<galaxy>_synthesis` nodes that documented-by edges point to).

### Assistant | 2026-06-09T15:47:48.573Z

[tool_use: Bash]

### User | 2026-06-09T15:47:59.176Z

[tool_result] === findInGraph scoring (system-viz-graph.mjs) ===
199:export function findInGraph(G, terms, { limit = 30 } = {}) {
=== galaxy-synthesis model refs ===
scripts/galaxy-reflection-synthesis.mjs:24:// Ollama generation required (qwen2.5-coder:32b default). Fail-loud (R12): exits 1
scripts/galaxy-reflection-synthesis.mjs:35:import { resolveSynthesisModel } from "./lib/host-aware-synthesis-model.mjs";

... [+3443 chars truncated]

### Assistant | 2026-06-09T15:48:07.187Z

Now I have the full picture. Let me read the `findInGraph` scoring function and `host-aware-synthesis-model.mjs` to confirm the find path is procedural and how the host-aware resolver picks models on this Blackwell host.

### Assistant | 2026-06-09T15:48:08.083Z

[tool_use: Read]

### Assistant | 2026-06-09T15:48:09.208Z

[tool_use: Read]

### User | 2026-06-09T15:48:12.631Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\host-aware-synthesis-model.mjs' was already read 5m ago in this session and is unchanged (mtime 1780543245747). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-09T15:48:13.871Z

[tool_result] 199	export function findInGraph(G, terms, { limit = 30 } = {}) {
200	  const q = (Array.isArray(terms) ? terms.join(" ") : terms).toLowerCase();
201	  return G.nodes
202	    .filter(n =>
203	      (n.label + " " + n.id + " " + (n.info ?? "") + " " + (n.subgroup ?? ""))
204	        .toLowerCase()
205	        .includes(q)
206	    )
207	    .slice(0, limit);
208	}
209	
210	/**
211	 * loadFindCache — 
... [+3361 chars truncated]

### Assistant | 2026-06-09T15:48:21.344Z

Confirmed: `findInGraph` (line 199-208) is a pure case-insensitive substring `.includes(q)` filter — zero ranking, zero LLM. There is no LLM rerank on the system-viz `find` path. The `rag-llm-rerank.mjs` (qwen32b) is wired to the RAG/memory retrieval pipeline, NOT to system-viz `find`.

I have everything needed. The host-aware-synthesis-model was already read this session (it resolves the small hardcoded default up to the best local model for the host). Let me do one final confirmation grep on whether the galaxy-synthesis nodes (the `documented-by` edge target) are produced via the viz pipeline and verify `resolveSynthesisModel` ceiling, then synthesize.

### Assistant | 2026-06-09T15:48:27.576Z

[tool_use: Bash]

### User | 2026-06-09T15:48:41.215Z

[tool_result] === host-aware model ladder ===
7:// `qwen2.5-coder:7b` (or `:3b`). On the 96GB RTX PRO 6000 Blackwell that
8:// throttles synthesis quality to a 7B model while `qwen2.5-coder:32b` (20GB)
71: *      held this returns `qwen2.5-coder:32b`; on weaker hosts it returns the same
=== galaxy-synthesis-refresh: is it in regen-viz / wired to viz nodes? ===
14:// generation is wedged) and compares hashes. Ch
... [+1429 chars truncated]

### Assistant | 2026-06-09T15:49:09.529Z

I have complete evidence. The host-aware resolver already ceilings at `qwen2.5-coder:32b` on this Blackwell host (line 71). `seed-ghost-llm-classify.mjs` (the GNN-tier-5 ghost-node classifier — a system-viz surface) already uses qwen32b. Let me mark the task complete and synthesize the evidence-dense report.

### Assistant | 2026-06-09T15:49:09.656Z

[tool_use: TaskUpdate]

### User | 2026-06-09T15:49:10.957Z

[tool_result] Updated task #31 status

### Assistant | 2026-06-09T15:49:59.167Z

# Ollama × /system-viz Audit — file:line evidence

Audited all named surfaces. The /system-viz **graph-build + cheap-read pipeline is 100% procedural** (zero LLM). The LLM work that DOES touch system-viz nodes is the **galaxy-synthesis** + **ghost-node-classify** family, and it ALREADY runs on the right local model (qwen2.5-coder:32b, host-aware-ceilinged). Below: ALREADY / GAP / REJECTED.

---

## (1) ALREADY Ollama-wired (correct model — leave alone)

| Surface | file:line | Model | Note |
|---|---|---|---|
| Ghost-node classifier (GNN tier-5 reference-pool feed) | `scripts/seed-ghost-llm-classify.mjs:8,43,112,119` | `qwen2.5-coder:32b` via `/api/generate`, 10 engines/call | Classifies `ghost.unwired-engine` nodes → inferred dispatcher. A system-viz roost producer. Correct heavy model. |
| Galaxy reflection synthesis (feeds `memory_patterns.<galaxy>_synthesis` nodes that `documented-by` xsub edges point at) | `scripts/galaxy-reflection-synthesis.mjs:35,54,133,267-278` | `qwen2.5-coder:32b`, **host-aware-resolved** | `resolveSynthesisModel()` already lifts the hardcoded default to best-local-for-host. |
| Galaxy meta-synthesis | `scripts/galaxy-meta-synthesis.mjs:27,32,269,286` | `qwen2.5-coder:32b`, host-aware | same resolver. |
| Weekly memory synthesis | `scripts/weekly-memory-synthesis.mjs:154` + `scripts/lib/weekly-synth-llm.mjs:9` | `qwen2.5-coder:32b` (`PRISM_WEEKLY_LLM_MODEL`) | explicitly "$0 Claude tokens" synthesis. |
| Contextual-retrieval blurb (prepended before embedding) | `scripts/lib/contextual-blurb.mjs:25,76-94` | `qwen2.5-coder:32b` via `/api/generate` | CREATION offload, correct heavy model. |
| RAG Stage-3 reranker (memory/RAG retrieval — NOT system-viz find) | `scripts/lib/rag-llm-rerank.mjs:8,32,123,126` | `qwen2.5-coder:32b` | fail-soft DI. |
| Host-aware model ceiling | `scripts/lib/host-aware-synthesis-model.mjs:71` | returns `qwen2.5-coder:32b` on this 96GB Blackwell | the single lever that already routes "hardcoded small" → 32b. |

**Ne
... [+4912 chars truncated]
