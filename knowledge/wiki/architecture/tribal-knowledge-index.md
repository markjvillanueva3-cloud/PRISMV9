---
title: Tribal Knowledge Index
type: architecture
corpus: tribal
parent_layer: L8
generated_by: scripts/generate-tribal-index.mjs
last_verified: 2026-05-11
tags: [architecture, tribal, knowledge-base, shop-floor]
related:
  - knowledge/wiki/architecture/layer-l8.md
  - state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md
---

# Tribal Knowledge Index

> Compounding shop-floor tip corpus. 4245 markdown files (5.42 MB)
> at `knowledge/tribal/`. Used by Tier-3 AI specialists for retrieval-augmented
> reasoning and surfaced by `prism_ai:tribal_lookup` action.

**Corpus root:** `H:/prism/knowledge/tribal/`
**Total tips:** 4245 files · 5.42 MB
**Graph rollup node:** `mem.tribal` (L8 layer)

## Recent activity (12 most-recent files)

- [`knowledge/tribal/auto-ingested-tips-auto-5004.md`](knowledge/tribal/auto-ingested-tips-auto-5004.md) — hyperMILL Profile Finishing *(modified 2026-05-06)*
- [`knowledge/tribal/auto-ingested-tips-auto-5003.md`](knowledge/tribal/auto-ingested-tips-auto-5003.md) — hyperMILL Thread Milling *(modified 2026-05-06)*
- [`knowledge/tribal/auto-ingested-tips-auto-5002.md`](knowledge/tribal/auto-ingested-tips-auto-5002.md) — hyperMILL Pencil *(modified 2026-05-06)*
- [`knowledge/tribal/auto-ingested-tips-auto-5001.md`](knowledge/tribal/auto-ingested-tips-auto-5001.md) — hyperMILL Horizontal *(modified 2026-05-06)*
- [`knowledge/tribal/auto-ingested-tips-auto-5000.md`](knowledge/tribal/auto-ingested-tips-auto-5000.md) — hyperMILL Horizontal *(modified 2026-05-06)*
- [`knowledge/tribal/worknc-cam-tips-wnc-201.md`](knowledge/tribal/worknc-cam-tips-wnc-201.md) — WorkNC Cloud Collaboration — Multi-Site Program Sharing *(modified 2026-04-28)*
- [`knowledge/tribal/worknc-cam-tips-wnc-200.md`](knowledge/tribal/worknc-cam-tips-wnc-200.md) — WorkNC Post Processor Customization — Machine-Specific Output *(modified 2026-04-28)*
- [`knowledge/tribal/worknc-cam-tips-wnc-199.md`](knowledge/tribal/worknc-cam-tips-wnc-199.md) — WorkNC Probing Integration — On-Machine Verification *(modified 2026-04-28)*
- [`knowledge/tribal/worknc-cam-tips-wnc-197.md`](knowledge/tribal/worknc-cam-tips-wnc-197.md) — WorkNC High-Speed Machining Mode — Constant Curvature Toolpaths *(modified 2026-04-28)*
- [`knowledge/tribal/worknc-cam-tips-wnc-198.md`](knowledge/tribal/worknc-cam-tips-wnc-198.md) — WorkNC Multi-Setup Management — Automatic Work Coordinate Transfer *(modified 2026-04-28)*
- [`knowledge/tribal/worknc-cam-tips-wnc-196.md`](knowledge/tribal/worknc-cam-tips-wnc-196.md) — WorkNC Toolpath Smoothing — G2/G3 Arc Fitting for Controller Compatibility *(modified 2026-04-28)*
- [`knowledge/tribal/worknc-cam-tips-wnc-194.md`](knowledge/tribal/worknc-cam-tips-wnc-194.md) — WorkNC Batch Automation — Unattended Multi-Part Programming *(modified 2026-04-28)*

## Schema

Each tip file follows the auto-ingested format:
- Filename: `auto-ingested-tips-auto-<NNNN>.md`
- H1 title summarizing the tip
- Body: shop-floor lesson with material/operation/machine context
- Tags via frontmatter (optional)

## Consumers

- `prism_ai:tribal_lookup` — semantic search across corpus
- `MillingAGIMaster`, `LatheAGIKnowledgeUnification`, `WEDMNeuralTrainingEngine` — RAG retrieval at inference time
- `/tribal-knowledge-guide` skill — capture + retrieval interactive guide

## See also

- L8 layer overview: [[layer-l8]]
- Tribal capture skill: `/distill-tribal`
- Full corpus: [knowledge/tribal/](../../tribal/)
