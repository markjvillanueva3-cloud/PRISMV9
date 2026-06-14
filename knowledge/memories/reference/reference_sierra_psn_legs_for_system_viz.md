---
name: reference_sierra_psn_legs_for_system_viz
description: How the system-viz galaxy satisfies each of the 11 PSN legs (sierra owns leg #6 System Viz; bridges to NN/GNN, AI, memory).
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.942Z
aliases: reference_sierra_psn_legs_for_system_viz
---


**system-viz × the 11 PSN legs (per [[feedback_psn_definition]]).** Sierra's galaxy maps to PSN as:
1. **Obsidian brain** — `*_sierra_*.md` memories (≥10, this buildout) auto-fed to `knowledge/memories/`.
2. **PRISM OS** — slot domain known via `slot-context-bundle-inject` SLOT_GALAXY_MAP (sierra→system-viz, line 77).
3. **Wiki** — `architecture/{system-viz-add-node,regen-viz-merge-guard,viz-domain-coverage,system-viz-galaxy}.md`.
4. **Memories** — ≥10 indexed in galaxy MEMORY.md `## Indexed memories`.
5. **Tribal** — ≥5 `prism_knowledge:tribal_capture slot=sierra` tips (surface via `tribal-by-domain-inject`).
6. **System Viz** — sierra OWNS this leg: the graph itself + `system-viz-query` + ghost roosts.
7. **Engines** — system-viz scripts/libs surfaced in BUILD_STATE/ENGINE_DIGEST.
8. **Algorithms** — graph algos (BM25-lite, random-walk, GraphSAGE) in `scripts/lib/graph-*`.
9. **Formulas** — N/A inline (graph/numeric primitives; never inline physics).
10. **NN/GNN** — sierra PRODUCES the seed-ghost ref-pool + node embeddings; india's GraphSAGE tier-5 CONSUMES them.
11. **PRISM AI** — `aiSystemRouterEngine.route()` + master-index resolve against the graph.

**Why:** the buildout VERIFICATION GATE checks all 11 legs; this is the per-leg evidence map for system-viz.

**How to apply:** when auditing sierra's PSN synergy, walk this list; the weakest legs are tribal (#5, capture more) and NN/GNN (#10, eval deferred — embeddingSource mismatch). See [[reference_sierra_galaxy_buildout_2026_05_29]].
