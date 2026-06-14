---
title: Cross-Substrate Synergy MS0 — typed ADD-only edge spine
type: architecture
status: in_progress
slot: sierra
created: 2026-06-03
tags: [system-viz, synergy, psn, edges, hermes, blackwell, graph]
related: [[crossroad-brainstorm-workflow]] [[psn-octopus-fleet-synergy-ms0]] [[fleet-reaper]] [[nn-graded-schema-read-fix]]
---

# Cross-Substrate Synergy MS0

**Goal origin:** sierra `/goal` (2026-06-03) — leverage the RTX PRO 6000 Blackwell to maximize synergy across the four PSN substrates (/system-viz graph · Obsidian brain · Hermes slot fleet · PRISM-AI), "map paths to every node and connect them to all logical combinations." Decomposed via the `brainstorm-path-forward` 5-lens workflow (run `wf_19e6d7e8-77b`).

## The problem, made finite

The system-viz graph (~548MB) is the fleet search substrate, but its galaxy/engine nodes are only weakly linked to the *other* PSN substrates. The literal ask — all-pairs cross-substrate closure + 34-galaxy atomic doc-sync — is **unbounded and unfalsifiable** (O(V³) closure on a mutating 548MB graph). The bounded, falsifiable reframing: a **typed, ADD-only cross-substrate edge spine** + one proven edge type materialized the canonical single-writer way.

## What shipped

1. **Schema** (`scripts/lib/cross-substrate-edge-schema.mjs`, 18/18 tests) — typed whitelist `documented-by | owned-by-slot | embeds | consensus-of`, each edge carrying `{source, confidence, addedBy, addedAt}` provenance, plus `assertAddOnly()` that throws on any deletion. Pure module (no FS/Date) → trivially testable.
2. **Generator** (`scripts/generate-cross-substrate-edges.mjs`, + intent-verifying `.test.mjs` 6/6) → `state/shared/system-viz/cross-substrate-edges-augmentation.json`: **120 edges across 2 types + 34 galaxy-roost nodes**, no 548MB graph load, endpoints confirmed:
   - **82 `owned-by-slot`** (7 eng-canon @1.0 + 41 domain-group inference @0.85 + 34 galaxy-roost @1.0) — U-XSUB-GALAXY-ROOST lifted coverage from 7 to **all 34 galaxies** via self-emitted `ghost.galaxy.<name>` roost nodes nested under `ghost.galaxy_federation`.
   - **38 `documented-by`** (U-XSUB-DOCUMENTED-BY, 2026-06-03) — galaxy node (`eng.<name>` / `ghost.galaxy.<name>`) → the wiki/memory note that documents it = the **system-viz ↔ Obsidian/Wiki** synergy edge. Node-id namespaces CONFIRMED: `memory_<kind>.<slug>` (memories-atomic fold) + `wiki.<section>.<slug>` (wiki-entries fold). Convention **B** (galaxy → `memory_patterns.<galaxy>_synthesis`, 1:1) drives all 38; convention **C** (galaxy MEMORY.md `[[backlinks]]`, bare + `section/slug` forms) is wired but yields 0 against today's curated 103-wiki+121-memory confirmed-node subset — it compounds (ADD-only) as those augmentations grow node coverage.
3. **Merge-wire** (`scripts/merge-augmentations.mjs`) — `loadOptional` + ADD-only deduped splice block (mirrors the `knowledgeGal` block); folds **both** edge types **on the next `regen-viz`** and stamps `G.meta.crossSubstrateEdges`. Target nodes (`wiki.*`/`memory_*`) are folded by the wiki-entries (line ~2476) + memories-atomic (`mergeIndexedAugmentation`, ~2710) blocks → no documented-by edge dangles in the live graph (the test's NO-DANGLING invariant re-derives the same confirmed-node union).

## Key design decisions

- **`owned-by-slot` shipped first, `documented-by` second (both now live)** — owned-by-slot endpoints provably existed day-1 (system-viz ↔ Hermes). documented-by was gated on confirming the knowledge-note node-id namespace; once confirmed (`memory_<kind>.<slug>` + `wiki.<section>.<slug>`, both folded into the live graph), it shipped as the system-viz ↔ Obsidian/Wiki edge. **Endpoints over yield** — the speculative `engines_audit_*→eng.*` convention was dropped because per-engine `eng.<engine>` ids aren't confirmable from the small augmentations (would risk dangling edges, R12).
- **Confidence is load-bearing** — operator-canonical galaxy→slot at 1.0, inference at 0.85. The provenance field is the guardrail that keeps a future GNN-sourced edge (AUROC ~0.5 degenerate) from ever being read as ground truth.
- **ADD-only, single-writer-safe** — the generator never touches `system-graph.json`; only `merge-augmentations.mjs` writes the graph (avoids the second-writer fork, the #1 risk flagged by the brainstorm).

## Deferred / fleet hand-off

The honest tail lives in `state/shared/specs/CROSS-SUBSTRATE-SYNERGY-BOUNDED.md`. **Shipped since:** `regen-viz FAST[]` registration ([[reference_sierra_regen_fast_registration_gap_2026_05_29]]), galaxy-roost nodes for all 34 galaxies (U-XSUB-GALAXY-ROOST), `documented-by` edge type (U-XSUB-DOCUMENTED-BY). **Remaining:** regen execution (24GB, gated — [[reference_u_regen_viz_merge_faillod_2026_05_17]]), `embeds` (graph-node → embedding; india+sierra) + `consensus-of` (decision → octopus ledger; bravo+india, gated on a 2nd model) edge types, broadening the confirmed knowledge-note set so `documented-by` convention C resolves, Blackwell offload for system-viz model calls, and per-galaxy doc-sync as per-slot `/loop` units. GNN-edge consumption + dense N×N + closure-as-dedup are explicitly DEFERRED-with-reason.

## Files
- `scripts/lib/cross-substrate-edge-schema.mjs` (+ `.test.mjs`, 18/18)
- `scripts/generate-cross-substrate-edges.mjs` (+ `.test.mjs`, 6/6 — owned-by-slot + documented-by emit passes)
- `scripts/merge-augmentations.mjs` (splice block)
- `state/shared/system-viz/cross-substrate-edges-augmentation.json` (artifact)
- `state/shared/specs/CROSS-SUBSTRATE-SYNERGY-BOUNDED.md` (decomposition ledger)
