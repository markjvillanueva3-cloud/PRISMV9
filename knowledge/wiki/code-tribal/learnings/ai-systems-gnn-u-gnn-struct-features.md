# AI-SYSTEMS-GNN/U-GNN-STRUCT-FEATURES — [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-STRUCT-FEATURES (slot:india): measure-first -- leakage-safe engine-import structural feature LIFTS class separability but bounded by 19.6% coverage; corrects the 2026-06-21 over-rejection

**Commit:** `d863d8fcf243` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T05:09:11-05:00
**Tags:** ai-systems-gnn, u-gnn-struct-features, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-STRUCT-FEATURES (slot:india): measure-first -- leakage-safe engine-import structural feature LIFTS class separability but bounded by 19.6% coverage; corrects the 2026-06-21 over-rejection

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-STRUCT-FEATURES (slot:india): measure-first -- leakage-safe engine-import structural feature LIFTS class separability but bounded by 19.6% coverage; corrects the 2026-06-21 over-rejection

Lib scripts/lib/node-structural-features.mjs (26 R9 tests) + harness scripts/measure-structural-augmentation-separability.mjs (5 tests), both 2-arm per-file scrutiny PASS.

MEASURED (3202 labeled engines, 43 classes, .cwref-newemb.jsonl): baseline text-only meanMargin 0.0526 (23/43 separable) -> best alpha=0.75 meanMargin 0.094-0.099 (27-30/43, +0.041..+0.046 margin, +4..+7 classes). alpha=1 struct-only COLLAPSES (6/43) -> must FUSE not replace text. Struct coverage only 19.6%.

Corrects reference_gnn_structural_feature_probe_2026_06_21, which REJECTED this exact feature ("null/non-viable") from the 28pct import-COVERAGE histogram alone, without ever measuring classSeparability. The measurement shows the connected ~20pct carries REAL class signal (margin nearly doubles). NECESSARY-not-SUFFICIENT (classSeparability, NOT the LOO classifier AUROC) -> NO apply/retrain. NEXT = GAP1 multi-feature stack (this + action-surface) + H2GCN/GPU retrain, multi-seed gated.
```

## Files touched (6)
- knowledge/wiki/code-tribal/learnings/gnn-struct-feature-measured-lift.md |  54 ++++++++++++++++++++++++++++++++++++++
- scripts/lib/node-structural-features.mjs                                 | 324 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/node-structural-features.test.mjs                            | 346 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/measure-structural-augmentation-separability.mjs                 | 211 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/measure-structural-augmentation-separability.test.mjs            |  96 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 5 files changed, 1031 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d863d8fcf243`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._