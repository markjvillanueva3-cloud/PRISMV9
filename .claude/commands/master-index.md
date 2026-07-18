---
description: Unified master search across system-viz graph + Obsidian vault + capability index + BUILD_STATE. Use INSTEAD OF Grep/Glob/Agent for "where is X" / "what handles Y" / "is Z built/wired/utilized" questions.
allowed-tools: mcp__prism_safe__prism_session, Bash, Read
composes_with:
  - "/system-viz"
consumes:
  - "prism_calc:cutting_force"
  - "prism_session:master_index_node_status"
  - "prism_session:master_index_query"
---
# /master-index — One Search Replaces N

Unified ranked search across the **PRISM brain** in a single call. Fuses:

| Source | What it covers |
|--------|----------------|
| `system-graph.json` | 110K nodes / 114K edges across 11 layers (engines, dispatchers, registries, hooks, skills, vault entries) — **already pre-joined to wiki + memory entries per node** |
| `PRISMSelfAwarenessEngine` | Fuzzy capability match across engines / actions / hooks / skills with confidence |
| `BUILD_STATE.json` | Per-hit classification: `wired` · `unwired` · `pending` · `frontend` · `unknown` |
| Edge in-degree | `utilization` score (log-normalized [0,1]) — answers "is this node fully utilized?" |

## When to use

- **Always before** `Grep` / `Glob` / `Agent` for code/architecture questions
- "Where is X defined?" → query the master index, get the file path + buildClass + utilization
- "What handles Y?" → master index returns engine + action + hook hits ranked by relevance × utilization
- "Is Z fully utilized?" → `master_index_node_status <id>` returns in-degree / out-degree / utilization
- "What's NOT being used?" → query for the term + `min_utilization: 0` + check `underUtilized[]`
- "What's pending vs built?" → query + filter `build_classes: ["wired"]` or `["unwired"]` etc.

## Args

- *(none — interactive)*: prompt for a query
- `<query text>`: run the query immediately
- `--node <id>`: single-node lookup (returns degree counts + utilization + wiki/memory)
- `--unwired <topic>`: shorthand for `query: <topic>, build_classes: ["unwired"]`
- `--layer <L4|L5|...>`: restrict to a graph layer
- `--limit <N>`: cap returned hits (default 20, max 200)

## How it runs

Behind the scenes invokes the MCP action:

```
prism_session:master_index_query  { query, limit?, layers?, sources?, build_classes?,
                                    min_utilization?, min_confidence? }
```

Or for single-node detail:

```
prism_session:master_index_node_status  { id }
```

The dispatcher lazy-loads `MasterIndexEngine` — it caches the 64MB graph by mtime + builds an inverted index on first call, so repeated queries are fast (cacheHit: true after the first).

## Output shape

```json
{
  "query": "kienzle",
  "totalHits": 23,
  "hits": [
    {
      "source": "graph_node" | "engine" | "action" | "hook" | "skill",
      "id": "engine.KienzleForceModel",
      "label": "...",
      "path": "...",                        // when known
      "layer": "L5",                        // graph hits only
      "status": "built",
      "confidence": 0.93,                   // [0,1]
      "utilization": 0.78,                  // [0,1] — 1 = top in-degree node
      "buildClass": "wired",
      "wikiEntries": ["kienzle-force-model"],
      "memoryEntries": [],
      "fullAction": "prism_calc:cutting_force"   // when source === 'action'
    }
  ],
  "bySource":      { "graph_node": 12, "engine": 6, "action": 5 },
  "byBuildClass":  { "wired": 18, "unwired": 5 },
  "topUtilized":   [...up to 5 highest-util hits...],
  "underUtilized": [...up to 5 graph_node hits with util < 0.1...],
  "graphMtime":    "2026-05-12T18:55:35.000Z",
  "cacheHit":      true,
  "warnings":      []
}
```

## Companion infrastructure

- **Pre-search hook** `master-index-precheck-inject.mjs` (UserPromptSubmit, T2) auto-injects the top-5 hits before every prompt that has searchable tokens — meaning `/master-index` is the *manual* entry point for the same pipeline that already runs every turn. Disable globally with `PRISM_MASTER_INDEX_INJECT=0`.
- **Tune top-K** with `PRISM_MASTER_INDEX_K=<n>` (default 5).

## Examples

```
/master-index kienzle
  # → ranks every graph node + engine + action mentioning kienzle, with
  # buildClass + utilization. Top hit usually KienzleForceModel (engine,
  # high util because every speed/feed orchestrator calls into it).

/master-index --unwired turning
  # → 879 unwired engines, filtered to turning-domain ones. Use as the
  # NEEDS_WIRING punch list.

/master-index --node engine.SpeedFeedOrchestratorEngine
  # → 1 result: in-degree (many callers), out-degree (many child engines),
  # utilization=0.94, wiki entries, last-known status.

/master-index "obsidian sync" --sources graph_node
  # → only graph nodes mentioning obsidian sync; useful when you already
  # know the engine name and just need the wiki/memory backlinks.
```

## Why this exists (origin)

Built 2026-05-12 in OBSIDIAN-PRISM-OS-MS0 (slot alpha, claude-7f79dd78) per user directive: *"set it up so we can utilize the obsidian brain and /system-viz as a master index for quick searching to hopefully save on search tool calls."*

Backed by `mcp-server/src/engines/MasterIndexEngine.ts` (singleton, mtime-cached, single-flight). Sister to `wiki-precheck-inject.mjs` (which only covers `wiki/index.md`) — `master-index-precheck-inject.mjs` covers the full graph + obsidian augmentation.

**Search-first discipline:** if `/master-index <query>` returns no hits with `confidence > 0.5`, fall through to `Grep`. Otherwise, use the hits — they're cheaper and they tell you build status + utilization, which `Grep` can't.
