---
title: Node-memory pointer + auto-populate
type: architecture
generated_by: hand (whiskey slot, 2026-05-22)
last_verified: 2026-05-22
related:
  - scripts/lib/emit-node-memory-pointer.mjs
  - scripts/emit-node-memory-pointers.mjs
  - .claude/hooks/stop-wiki-from-nodes-autopopulate.mjs
  - scripts/regen-wiki-from-viz.mjs
  - knowledge/wiki/architecture/wiki-coverage-audit.md
tags: [architecture, wiki, memory, auto-populate, system-viz, indexing]
---

# Node-memory pointer + auto-populate

> **Goal:** every graph node that has a wiki entry (engine, algorithm, formula, action, skill, hook, milestone, registry, test, dispatcher, frontend, layer, domain, monolith module, course, tribal category) also has a lightweight memory-vault pointer keyed by `node_<kind>_<slug>.md`. Memory searches now resolve directly to the authoritative wiki. Auto-populates whenever a domain gains another node.

## Surfaces

| Surface | Role |
|---|---|
| `scripts/lib/emit-node-memory-pointer.mjs` | Pure library — `sanitizeSlug` · `renderPointer` · `preserveHuman` · `planEmissions` · `applyEmissions` · `WIKI_KINDS`. 18/18 tests via `node:test`. |
| `scripts/emit-node-memory-pointers.mjs` | Driver. Walks 16 wiki sub-dirs, emits `knowledge/memories/reference/node_<kind>_<slug>.md`. Flags `--dry-run --since-cache --since N --limit N --json --quiet`. Caches `lastRunMs` in `state/shared/system-viz/.node-memory-pointers-cache.json`. |
| `.claude/hooks/stop-wiki-from-nodes-autopopulate.mjs` | Stop hook (T3, non-blocking). Fires the driver in detached background when graph mtime newer than pointer-cache mtime AND outside throttle. 6/6 tests via `node:test`. |
| `scripts/regen-wiki-from-viz.mjs` | Existing 26-step wiki orchestrator. Fingerprint-cached short-circuit. Hook fires it ALSO when `PRISM_WIKI_FROM_NODES_AUTOPOPULATE_FULL=1`. |

## Auto-populate semantics

`system-graph.json mtime > .node-memory-pointers-cache.json lastRunMs` AND `(now - .claude/cache/wiki-from-nodes-autopopulate.json lastFireMs) >= throttleMs` triggers a detached spawn. Cheap pointer pass takes ~1s incremental (`--since-cache`); heavyweight wiki regen is gated separately (default OFF — it takes ~8min).

## Pointer schema

Each `node_<kind>_<slug>.md` carries:
- frontmatter: `name`, `description`, `metadata.type=reference`, `metadata.node_kind`, `metadata.node_id`, `metadata.wiki_path`, `metadata.generated_at`, `metadata.generator`
- AUTO-NODE-MEMORY-POINTER-START/END block (regenerated)
- "Human notes" section (preserved across re-runs via `preserveHuman`)

Operator additions below the AUTO_END marker survive every re-emit. The regenerated block carries the canonical wiki path + node id + last-regen date.

## Knobs

| Env | Effect |
|---|---|
| `PRISM_WIKI_FROM_NODES_AUTOPOPULATE_DISABLE=1` | Hook short-circuits before any state read. |
| `PRISM_WIKI_FROM_NODES_AUTOPOPULATE_THROTTLE_MS=N` | Min ms between fires (default 6h). |
| `PRISM_WIKI_FROM_NODES_AUTOPOPULATE_FULL=1` | Also fire the heavyweight `regen-wiki-from-viz.mjs` orchestrator. |
| `PRISM_WIKI_FROM_NODES_AUTOPOPULATE_VERBOSE=1` | Replace SILENCE with a `systemMessage` so the hook's decision is visible. |

## First-run baseline (2026-05-22, whiskey slot)

7351 pointers emitted across 16 wiki sub-dirs. Includes 61 algorithms, ~3.1K engine entries, every action/skill/hook with a wiki entry, every milestone, every registry, every test wiki page.

## Sibling surfaces

- [[wiki-coverage-audit]] — answers "is every graph kind covered by a generator". Pointer emitter consumes the SAME `WIKI_KINDS` set the audit script reports against.
- [[obsidian-memory-feed-hook]] — propagates auto-memory files into the Obsidian vault. Node pointers go through the same path automatically.
- [[memory-relevance-inject]] — the UserPromptSubmit hook that surfaces relevant memos. Now sees node pointers; semantic search will match node-id and wiki-path tokens.

## Why this exists

User directive (whiskey slot, 2026-05-22): *"generate wiki, memories that can be indexed by nodes for all engines, algorithms, formulas, mathematical concepts with auto populating anytime either domain gains another node"*. The wiki-side orchestrator (`regen-wiki-from-viz.mjs`) already covered the 7 generators that produce per-node wiki entries; the memory-side mirror was the gap.
