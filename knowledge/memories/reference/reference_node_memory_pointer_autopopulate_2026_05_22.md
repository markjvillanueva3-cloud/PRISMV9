---
name: reference-node-memory-pointer-autopopulate-2026-05-22
description: 7351 node-indexed memory pointers + Stop hook that auto-populates on graph delta — wiki/memory now mirrored per node
aliases: reference_node_memory_pointer_autopopulate_2026_05_22
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:46.664Z
---


# Node-memory pointer + auto-populate (2026-05-22, whiskey)

Closed the operator ask: *"generate wiki, memories that can be indexed by nodes for all engines, algorithms, formulas, mathematical concepts with auto populating anytime either domain gains another node | complete all tasks, wired and tested"*.

## What shipped

- `scripts/lib/emit-node-memory-pointer.mjs` — pure library, 18/18 tests.
- `scripts/emit-node-memory-pointers.mjs` — driver. Walks `knowledge/wiki/architecture/{engines,algorithms,formulas,actions,skills,hooks,milestones,registries,tests,dispatchers,frontend,layers,domains,monolith,courses}` + `knowledge/wiki/code-tribal`. Emits `knowledge/memories/reference/node_<kind>_<slug>.md`.
- `.claude/hooks/stop-wiki-from-nodes-autopopulate.mjs` — Stop hook (T3, non-blocking), 6/6 tests. Detached background fire on graph delta + throttle.
- Wired into both `C:/Users/wompu/.claude/settings.json` AND `H:/.claude/settings.json` (the C→H mirror replicated automatically).
- Wiki entry `knowledge/wiki/architecture/node-memory-pointer-autopopulate.md`.

## First-run numbers

7351 pointers across 16 wiki sub-dirs. Includes the 61 algorithms, ~3.1K engines, every action/skill/hook/milestone/registry/test/dispatcher/frontend.

## Auto-populate trigger

`system-graph.json mtime > .node-memory-pointers-cache.json.lastRunMs` AND outside throttle (6h default). Knobs: `PRISM_WIKI_FROM_NODES_AUTOPOPULATE_{DISABLE,THROTTLE_MS,FULL,VERBOSE}`.

## How to use

- **Search a node by id:** the memory-relevance-inject hook now sees pointers, so a query like "kalman filter" or "kienzle force engine" surfaces `node_algorithm_alg_kalmanfilter.md` → links to the wiki entry.
- **Force a re-emit:** `node scripts/emit-node-memory-pointers.mjs --json` (full walk ~1m40s) or `--since-cache` for incremental.
- **Force the heavy wiki regen too:** export `PRISM_WIKI_FROM_NODES_AUTOPOPULATE_FULL=1`.

## Why it matters

The 26-step `regen-wiki-from-viz.mjs` orchestrator already maintained the WIKI side. The MEMORY side was unindexed by node — semantic memory searches saw 100% wiki + 0% per-node memory pointers. This closes that asymmetry; both surfaces are now node-indexed and stay in sync via the Stop hook.
