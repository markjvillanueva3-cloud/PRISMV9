---
type: "chat-session"
source: "claude-code-cli"
session_id: "9a962981-7a23-49ca-a503-804671284925"
title: "You are the synthesis agent for PRISM slot:sierra. Below are 5 read-only mapping"
date: "2026-06-04"
first_ts: "2026-06-04T03:56:25.976Z"
last_ts: "2026-06-04T03:57:07.198Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/9a962981-7a23-49ca-a503-804671284925/subagents/workflows/wf_a038895a-8d1/agent-a481eba6ec439c72f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# You are the synthesis agent for PRISM slot:sierra. Below are 5 read-only mapping

> **claude-code-cli** | 2026-06-04 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9a962981-7a23-49ca-a503-804671284925/subagents/workflows/wf_a038895a-8d1/agent-a481eba6ec439c72f.jsonl`

## Transcript

### User | 2026-06-04T03:56:25.976Z

You are the synthesis agent for PRISM slot:sierra. Below are 5 read-only mapping reports on token-cheap node access. The operator goal (ultracode /yolo): "map a pathway to every node, then BUILD a skill/script/hook/engine/pipeline so tool-calls to search & read any node are CHEAPER in tokens; use the Blackwell GPU if it helps."

### FACET tooling
Now I have all the information I need. Let me create the comprehensive findings report:

## FINDINGS: Token-Cheap Node Access Architecture Mapping

### CURRENT NODE-ACCESS TOOLING INVENTORY

#### 1. **`scripts/system-viz-query.mjs` (384 LOC)** — Primary CLI for graph queries
- **Invocation**: `node scripts/system-viz-query.mjs <cmd> [params]`
- **Commands**: `find`, `blast-radius`, `roadmap-candidates`, `dispatcher-summary`, `cache-status`, `headline`
- **Graph Load**: **CONDITIONAL SHORT-CIRCUIT** for `find` (line 44–73)
  - `find` short-circuits directly to `loadFindCache()` BEFORE `loadGraph()`
  - Other commands trigger full `loadGraph()` parse
- **Token Cost**: ~2,000–5,000 tokens (includes parse time + JSON stringify of results)

#### 2. **`scripts/lib/system-viz-graph.mjs` (529 LOC)** — Graph I/O + cache layer
- **Exports**: `loadGraph()`, `findInGraph()`, `loadFindCache()`, `regenFindCache()`
- **Load Strategy**: Streaming reader for 645MB graph (V8 max-string-length bypass via `readGraphStreaming`)
- **In-Process Cache**: Module-scope cache keyed on mtime+size (60s TTL default)
  - Only benefits long-lived processes; hook subprocesses don't benefit (each spawns fresh `node`)
- **Token Cost**: ~500 tokens to load and parse full 645MB graph in-process

#### 3. **`scripts/lib/graph-io.mjs` (176 LOC)** — Streaming reader/writer
- **Exports**: `readGraphStreaming()`, `writeGraphStreaming()`
- **Purpose**: Bypass V8's 512MB string-length ceiling by walking byte offsets + parsing sub-chunks
- **Behavior**: No full-graph-to-string materialization; reads entire buffer, extracts individual nodes on demand
- **Token Cost**: E
... [+23348 chars truncated]

### Assistant | 2026-06-04T03:57:07.198Z

# Token-Cheap Node Access — The `node_card` Primitive

## 1. The ONE primitive: a compact node-card sidecar + `prism_session:node_card` action + `/node-card` skill + a pre-read hint hook

Build **`node-card-index.json`** — a flat `Map<nodeId, NodeCard>` sidecar (~88 MB, ~307 B/node) generated from the existing graph by extending the existing `build-graph-index.mjs`, NOT a new builder. Per the graph-structure facet's minimal-viable schema:

```
NodeCard = { id, label, layer, kind, info?, sourceFile?, topNeighbors?:string[5], wikiEntries?:[paths], memoryEntries?:[names] }
```

It **reads** node records from `system-graph.json` once (offline build, ~138s) and **emits** one slim record per node + an `{idOffset}` byte-offset table so a reader can `fs.read` a single record by byte range — never loading the 88 MB, let alone the 644 MB graph.

**Surface (all three reuse, none duplicate):**
- **`prism_session:node_card`** — new action on the EXISTING session dispatcher (where `master_index_query` / `dispatcher_map_compact` already live). Input `{id}` or `{ids:[]}`; opens the index, seeks via offset table, returns the card(s) + 1-hop neighbor labels. **No graph load.**
- **`/node-card <id>`** skill — thin wrapper over the action (mirrors `/master-index`).
- **`node-card-prefetch-inject.mjs`** pre-read hint hook (UserPromptSubmit) — when a prompt names a node id (`eng.*`, `ghost.*`, `disp.*`, `wiki.*`), inject its card inline so the agent never spawns a read at all.

Search stays on the existing `loadFindCache()` (`system-viz-query find`); `node_card` is the **read-by-id** half the fleet is missing. Together: `find` → ids → `node_card` → records, both index-only.

## 2. Why it beats the status quo

Baseline facet: status-quo "find + read a node" = **~186.5 K tokens** (the 644 MB `loadGraph()` dominates). With the offset-seeked card: **index open + O(1) byte-range read + return ≈ 2–3 K tokens**. That is **186.5 K → 2.5 K, a 98.7% reduction (~184 K saved per access)**, at <100 m
... [+3228 chars truncated]
