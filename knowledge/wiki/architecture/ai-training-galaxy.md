---
title: AI-Training Galaxy — Architecture Map
type: architecture
domain: ai-training
slot: india
maintainer: india
seeded_by: alpha
created: 2026-06-01
tags: [ai-training, gnn, graphsage, lora, rag, closed-loop, galaxy, india]
---

# AI-Training Galaxy — Architecture Map

The ai-training galaxy (owned by **slot:india**) is PRISM's full-system training backbone: the GraphSAGE GNN, per-domain LoRA stacks, the RAG corpus, and the closed-loop outcome pipeline that lets every domain's AI self-improve. Canonical knowledge lives in the galaxy brain — this page is the discovery map.

> Canonical brain (verified engine list lives here, NOT hand-copied): `mcp-server/src/engines/ai-training/MEMORY.md` · doctrine: `mcp-server/src/engines/ai-training/CLAUDE.md`

## Position in the pipeline

```
shop-floor outcomes + corpora ─►  ai-training (india: GNN / LoRA / RAG / closed-loop)  ─►  per-domain self-improving AIs
        │                                    │                                                   │
        │                                    └─ GraphSAGE GNN = tier-5 wiring-inference          └─ mill / lathe / wedm / cam ...
        └─ blueprint / CAD / tribal / MIT-OCW / PDF corpora                                         (each clones the india template)
```

India is the **substrate**: domains own their self-improving AI, cloned from india (per [[feedback_domains_own_ai_training_systems]]).

## Engines / surface (canonical counts in the brain)

Per the master-index back-pointer: **GraphSAGE GNN as tier-5 of the wiring-inference cascade, ~95 LoRA engines, RAG corpus, closed-loop outcome backbone**. Retrain lifecycle autonomy: `scripts/nn-graph-retrain-lifecycle.mjs` runs as a scheduled task (6h cadence, S4U) and promotes candidate→live ONLY when AUROC/macroF1/Brier gates clear (never auto-promotes deferred candidates). NN-GRAPH detail: root CLAUDE.md §NN-GRAPH (MS0+MS1+MS2) · [[nn-graph-ms0]].

## Tribal / corpus injection

ai-training currently rides the `backend-dev` tribal domain (tokens `lora/gnn/neural`) — partial routing, no dedicated domain (optional promotion queued in [[reference_tribal_domain_map_gap_2026_06_01]]). RAG corpus health: blueprint/CAD/tribal/MIT-OCW/PDF corpora must be re-indexed when underlying sources change.

## See also
- Galaxy doctrine + brain: `mcp-server/src/engines/ai-training/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md`
- [[galaxy-context-federation]] — ai-training is a federation spoke; rolls up to the master brain
- [[feedback_domains_own_ai_training_systems]] — the fleet rule india anchors
- [[feedback_psn_definition]] — india is the NN/GNN + PRISM-AI brain on the PSN axes

_Alpha-seeded discovery stub (GALAXY-CONTEXT-FEDERATION-MS0, 2026-06-01), derived from the india galaxy card + master-index back-pointer + root CLAUDE.md §NN-GRAPH. Domain owner (india) refines._
