---
title: Tribal Knowledge Index
type: architecture
corpus: tribal
parent_layer: L8
generated_by: scripts/generate-tribal-index.mjs
last_verified: 2026-06-27
tags: [architecture, tribal, knowledge-base, shop-floor]
related:
  - knowledge/wiki/architecture/layer-l8.md
  - state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md
---

# Tribal Knowledge Index

> Compounding shop-floor tip corpus. 4247 markdown files (5.42 MB)
> at `knowledge/tribal/`. Used by Tier-3 AI specialists for retrieval-augmented
> reasoning and surfaced by `prism_ai:tribal_lookup` action.

**Corpus root:** `H:/prism/knowledge/tribal/`
**Total tips:** 4247 files · 5.42 MB
**Graph rollup node:** `mem.tribal` (L8 layer)

## Recent activity (12 most-recent files)

- [`knowledge/tribal/cimatron-cam-tips-cim-187.md`](knowledge/tribal/cimatron-cam-tips-cim-187.md) — Mold Surface Quality Analysis Before Programming *(modified 2026-06-12)*
- [`knowledge/tribal/bobcad-cam-tips-bc-140.md`](knowledge/tribal/bobcad-cam-tips-bc-140.md) — BobCAM for Rhino NURBS-Native Surface Machining *(modified 2026-06-12)*
- [`knowledge/tribal/sierra-system-viz-tips.md`](knowledge/tribal/sierra-system-viz-tips.md) — Sierra system-viz tribal tips (slot:sierra) *(modified 2026-05-29)*
- [`knowledge/tribal/auto-ingested-quarantine/README.md`](knowledge/tribal/auto-ingested-quarantine/README.md) — Auto-Ingested Tips Quarantine *(modified 2026-05-17)*
- [`knowledge/tribal/auto-ingested-quarantine/auto-ingested-tips-auto-5004.md`](knowledge/tribal/auto-ingested-quarantine/auto-ingested-tips-auto-5004.md) — hyperMILL Profile Finishing *(modified 2026-05-12)*
- [`knowledge/tribal/auto-ingested-quarantine/auto-ingested-tips-auto-5003.md`](knowledge/tribal/auto-ingested-quarantine/auto-ingested-tips-auto-5003.md) — hyperMILL Thread Milling *(modified 2026-05-12)*
- [`knowledge/tribal/auto-ingested-quarantine/auto-ingested-tips-auto-5002.md`](knowledge/tribal/auto-ingested-quarantine/auto-ingested-tips-auto-5002.md) — hyperMILL Pencil *(modified 2026-05-12)*
- [`knowledge/tribal/auto-ingested-quarantine/auto-ingested-tips-auto-5001.md`](knowledge/tribal/auto-ingested-quarantine/auto-ingested-tips-auto-5001.md) — hyperMILL Horizontal *(modified 2026-05-12)*
- [`knowledge/tribal/auto-ingested-quarantine/auto-ingested-tips-auto-5000.md`](knowledge/tribal/auto-ingested-quarantine/auto-ingested-tips-auto-5000.md) — hyperMILL Horizontal *(modified 2026-05-12)*
- [`knowledge/tribal/worknc-cam-tips-wnc-201.md`](knowledge/tribal/worknc-cam-tips-wnc-201.md) — WorkNC Cloud Collaboration — Multi-Site Program Sharing *(modified 2026-04-28)*
- [`knowledge/tribal/worknc-cam-tips-wnc-200.md`](knowledge/tribal/worknc-cam-tips-wnc-200.md) — WorkNC Post Processor Customization — Machine-Specific Output *(modified 2026-04-28)*
- [`knowledge/tribal/worknc-cam-tips-wnc-199.md`](knowledge/tribal/worknc-cam-tips-wnc-199.md) — WorkNC Probing Integration — On-Machine Verification *(modified 2026-04-28)*

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
