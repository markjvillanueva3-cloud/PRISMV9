---
title: Cross-substrate embeds edge + documented-by oracle fix
type: lesson
domain: system-viz
slot: sierra
unit: CROSS-SUBSTRATE-SYNERGY-MS0/U-XSUB-EMBEDS+DOCBY-ORACLE
commit_branch: cad-fusion-live-ms0
date: 2026-06-10
tags: [cross-substrate, system-viz, embeds, documented-by, oracle, silent-regression, nn-graph, rag, synergy]
---

# Cross-substrate `embeds` edge + `documented-by` oracle fix

Two things shipped in one commit (slot:sierra, 2026-06-10), both serving the goal "AI systems synergized with vault/hermes/PSN/awareness/memories/wikis across all galaxies."

## 1. `embeds` -- the 3rd typed cross-substrate edge (948 edges)
The `embeds` schema type (`graph-node -> embedding`) was defined but never materialized. The generator now links each graph node to the **nomic-768d embedding pool** that embedded it:
- `node-embeddings-768d.jsonl` (id field `n`) -> roost `ghost.embedding_index.gnn768` (771/771 confirmed).
- `ghost-node-embeddings.jsonl` (id field `id`) -> roost `ghost.embedding_index.ghosts768` (177/636 confirmed; 459 stale-ghost ids correctly skipped).
- `to` roosts are **self-emitted** (can never dangle); `from` confirmed against the node-card **offset oracle** (`node-card-offsets.json`, ~336K merged-graph node ids) -- never a 548MB graph load.
- `confidence: 1.0` -- the embedding vector demonstrably EXISTS (a fact), orthogonal to the GNN's AUROC-gated *prediction* quality.

This surfaces the NN/GNN/RAG embedding footprint as a first-class, traversable relationship in the canonical search graph: "is this node in the embedding pool?" answered in one hop.

## 2. `documented-by` silent regression (0 -> 320)
**Symptom:** the regenerated cross-substrate artifact had `documented-by: 0` (was ~38) and its test was already red (8h pre-existing, undetected).

**Root cause (the reusable lesson):** the documented-by pass confirmed knowledge-note endpoints against `memNodeIds` = the `newNodes` of the **volatile, rotating** `memories-atomic-augmentation.json` (it emits only a handful of recent notes). When the `memory_patterns.<galaxy>_synthesis` nodes rotated out of that augmentation, documented-by silently collapsed to 0 -- even though the system-viz merge is ADD-only, so those synthesis nodes still LIVE in the merged graph.

> **A generator that confirms endpoints against a VOLATILE/rotating source silently loses coverage when that source rotates. Confirm against the STABLE, ADD-only merged-graph oracle instead.**

**Fix:** union the offset-oracle keys matching `memory_*`/`wiki.*` into `knowledgeNodeIds`. documented-by restored to **320** (42 synthesis@1.0 + 278 backlink@0.9 -- more than the original because the full merged-graph note set resolves far more of each galaxy's authored `[[backlinks]]`), and hardened against silent re-collapse.

## CI-safety pattern (gitignored oracle)
The oracle is gitignored (local build input). The test loads it optionally (`ORACLE` flag): endpoint-membership asserts gate on `ORACLE`; structural asserts (regex shape, self-emitted-roost membership, `confidence==1.0`, provenance) always run. Proven by hiding the oracle + re-running -> 7/7 still pass. The generator's build-time NO-DANGLING FATAL (with oracle present) is the hard guarantee; the committed test is the structural check.

## Gotchas
- The augmentation artifact is **gitignored/derived** -- commit the generator (`.mjs`), not the artifact; it rebuilds via the FAST[]-registered generator on every regen-viz.
- Keep volatile values (e.g. the 336K oracle count) OUT of per-edge `source` provenance strings -- they churn the diff every regen. Put them in `stats`.

## Canonical pattern + fleet-wide sweep (2026-06-10)
A cross-edge / cross-substrate generator MUST confirm edge endpoints against the **merged graph** -- iterate `graph.nodes` directly, or use the node-card **offset oracle** (`state/shared/system-viz/node-card-offsets.json`) when avoiding the 548MB load. **NEVER** confirm against a peer augmentation's `newNodes` (those rotate / are partial -> silent edge-type collapse, the exact bug above). A fleet-wide sweep of the system-viz edge-bridge generators (2026-06-10) confirmed the bug-class is **CONFINED** to the now-fixed `generate-cross-substrate-edges.mjs`: every other genuine cross-edge emitter already confirms against `graph.nodes` directly. When you write a new cross-substrate generator, copy the fixed idiom, not the original bug.

Related: [[cross-substrate-synergy-ms0]] · [[cheap-node-access-ms0]] · [[gnn-node-embedding-bridge]].
