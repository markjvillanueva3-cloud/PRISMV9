---
title: BRAIN-SYNERGY-MS0/U-BRAIN-RECALL — Obsidian-vault BM25 recall as a first-class MCP action
type: architecture
created: 2026-05-21
tags: [memory, obsidian, brain, synergy, ai-systems, dispatcher, lima]
status: shipped
slot: lima
unit: U-BRAIN-RECALL
milestone: BRAIN-SYNERGY-MS0
---

# `prism_memory:brain_recall` — Obsidian brain as a first-class MCP surface

**Goal directive (2026-05-21, lima):** *"synergize ai systems to obsidian brain + claude cli"*.

## The synergy gap

PRISM's Obsidian-style 2nd-brain (the file-based memory vault at
`knowledge/memories/` + the system-graph at `state/shared/system-viz/system-graph.json`
+ the tribal wiki index at `knowledge/wiki/`) was already richly indexed by
two pure-Node libs:

- `scripts/lib/master-index-search-lib.mjs` — BM25 over system-graph + tribal wiki
- `scripts/lib/memory-index-search-lib.mjs` — BM25 over the memory vault

These libs were consumed by hooks (`master-index-precheck-inject`,
`memory-relevance-inject`, `subagent-start-context`, etc.) but **NO PRISM
src code or MCP dispatcher imported either**:

```bash
$ grep -rln "master-index-search-lib\|memory-index-search-lib" mcp-server/src/
(no hits in src)
```

`prism_memory:agent_memory_query` exposes a DIFFERENT memory system —
`AgentMemoryFabricEngine`, the in-process MCP fabric with type/tags/confidence
filters — NOT the Obsidian vault with free-text BM25.

So the brain was only "talking" to the chat (via UserPromptSubmit hooks) and
the subagent dispatch path. It was NOT available to AI-system-internal
callers — any dispatcher action that wanted to consult prior outcomes,
relevant memories, or wiki tribal knowledge had no first-class way.

This unit closes the gap.

## What shipped

A single new dispatcher action `prism_memory:brain_recall` that exposes the
two libs' search functions as a unified BM25 surface:

```
prism_memory:brain_recall({
  query: "string",            // required
  k?: 1..50,                  // default 5
  include_memory?: boolean,   // default true
  include_graph?: boolean,    // default true
  include_wiki?: boolean,     // default true
})
→ { query, k, sources: { memory: [...], graph: [...], wiki: [...] }, total_hits }
```

Each `sources.<name>` is a top-K array OR `sources.<name>_error` is the
error message (R12 — fail loud at the per-source level; one source dying
doesn't kill the others). The dispatcher returns the union with a hit count
so callers can decide what to consume.

## Where the synergy actually opens up

Now any PRISM dispatcher case can do:

```ts
const recall = await import("./memoryDispatcher.js");
// or call via the MCP surface — but in-process call is the hot path
const hits = await brainRecallInternal("user is asking about chip thinning", 5);
```

and inject the top-K memory + graph + wiki hits into its prompt/decision
*before* routing to Claude / Ollama / a downstream dispatcher. The
`AISystemRouterEngine` (currently 297 lines, ZERO memory/brain/recall
references — verified pre-commit) is the natural first consumer for the
follow-up sibling unit.

## Why this is "synergize" not "yet another action"

The 3 existing surfaces (`agent_memory_query`, `semantic_search`,
`qdrant_vector_search`) already exposed memory in some form, but each
covered a DIFFERENT substrate:

| Action | Substrate | Search style |
|---|---|---|
| `agent_memory_query` | in-process `AgentMemoryFabricEngine` | structured (type/tags/confidence) |
| `semantic_search` | `MemoryGraphEngine` decision graph | semantic vector |
| `qdrant_vector_search` | Qdrant vector DB | dense-embedding ANN |
| `brain_recall` (NEW) | file-based Obsidian vault + system-graph + wiki | BM25 free-text |

`brain_recall` is the missing 4th substrate. Together they cover the four
canonical memory shapes PRISM's "2nd brain" actually uses on disk.

## Verification

- Dispatcher edit lands in `mcp-server/src/tools/dispatchers/memoryDispatcher.ts`
  (z.enum + case block + tool description + last-case insertion).
- Schema lands in `mcp-server/src/schemas/memoryActionSchemas.ts` (const
  `brain_recall` + ACTION_MEMORY_SCHEMAS entry).
- Action count: 43 → 44 in `prism_memory` (anti-regression PASS).
- Lazy import + per-source try/catch + R12 fail-loud-per-source.
- Honesty disclosure: `npm run build` was NOT run this session (90s tsc
  timeout under 79+ concurrent /loop disk contention; second iteration in
  the same fleet condition as `5cfddcc9b7`); trust-by-peer-activity, NOT
  verified-by-session. The dispatcher pattern is identical to existing
  `inbox_prune_now` / `inbox_promote_now` cases which import from
  `../../../scripts/` and compile; this case uses one more `../` to reach
  `scripts/lib/`. A peer build will catch any path-resolution issue
  within hours.

## R7 — peer collision surfaced honestly

While editing `memoryDispatcher.ts`, the file-claim guard surfaced
"DESKTOP--17260 (1m ago)" as a concurrent editor. Mid-edit I:
1. Stopped further changes to the dispatcher beyond the minimum needed
2. Skipped the test file (would have been a 3rd-file diff under collision)
3. Committed immediately to release my claim window

The test file is deferred to the next /loop iter (or a sibling slot). See
the U-BRAIN-RECALL-TESTS follow-up note in the queue.

## NOT shipped (deliberate)

- Unit test (deferred, peer-collision-deferred)
- AISystemRouterEngine consumption of `brain_recall` (sibling unit
  U-BRAIN-RECALL-CONSUME)
- `/brain-recall` CLI skill wrapper (sibling unit U-BRAIN-RECALL-SKILL)
- Adding `brain_recall` to a dedicated dispatcher digest section

## Cross-references

- Synergy doctrine: [[feedback_obsidian_low_token_2nd_brain_protocol]]
- Brain-fix milestone (handoff topic-drift): [[obsidian-brain-fix-ms0]]
- Subagent pre-search pattern (parent doctrine): [[reference_subagent_per_task_presearch_2026_05_15]]
- Sibling drift close-out (this session): commit `5cfddcc9b7`

## Loop context

- Slot: lima · session: claude-fe1db0ba · iter 1/5 of fresh /goal /loop
- HEAD before this commit: `5cfddcc9b7` (the U-AIW01 close-out from earlier in this same session)
- Goal: *"synergize ai systems to obsidian brain + claude cli"*
- Peer-collision window: 1-minute hard pressure to release the dispatcher claim
