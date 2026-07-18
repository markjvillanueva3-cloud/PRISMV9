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

## 3. The R12 fix needs a CONSUMER (U-SVH-XSUB-SURFACE, 2026-06-15)
A later unit (A3, `cf676916ec`) added `buildDegradationWarnings()` + a structured `cross-substrate-warnings.json` sidecar so an `embeds` collapse (offset-oracle absent / a source jsonl absent / 0 edges confirmed) is no longer a single buried `console.error` during regen. But the sidecar shipped **write-only -- zero consumers** -- so the "fail-loud" signal was itself silent: a regen could still stamp GREEN while the AI-substrate footprint edges were missing, with nobody reading the warning.

> **A fail-loud fix is only loud if something READS it. A new sidecar / log / warnings array with no consumer is the same silent-GREEN class, one level up.** Wire the producer to a surface (a per-prompt inject, a health header, a Stop gate) in the same milestone, or the R12 work is decorative.

**Fix (`8d5a8cac19`):** `formatEmbedsWarning(warn, now)` (pure, total, exported) + a sibling surface block in `.claude/hooks/sierra-graph-health-inject.mjs`, placed right after the existing `cross-substrate-drift` block. The sierra per-prompt graph-health header now renders `⚠ cross-substrate embeds DEGRADED (last 24h): <head> (+N more). embedsEdges=.. oracleLoaded=..` whenever the sidecar is recent + non-empty. Shared `SURFACE_WINDOW_MS` (24h half-open, parity with the drift block). `main()` is entrypoint-guarded (`import.meta.url === pathToFileURL(process.argv[1]).href`) so the hook is importable by its test without triggering its stdin read. 12 tests (7 pure helper: happy/multi + stale/empty/bad-`at` + null/garbage/missing-fields + exact-24h boundary; 5 E2E through the real hook via `execFileSync`+stdin: surfaces/slot-gated/no-sidecar/disable-knob). Live-validated against the real sierra binding (763MB GREEN regen -> embeds-DEGRADED line rendered). 2-agent scrutiny PASS, 0 P0/P1.

Related: [[cross-substrate-synergy-ms0]] · [[cheap-node-access-ms0]] · [[gnn-node-embedding-bridge]].
