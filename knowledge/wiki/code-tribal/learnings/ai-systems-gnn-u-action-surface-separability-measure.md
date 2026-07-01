# AI-SYSTEMS-GNN/U-ACTION-SURFACE-SEPARABILITY-MEASURE — [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-ACTION-SURFACE-SEPARABILITY-MEASURE (slot:india): measure-first verdict on the action-surface GNN feature

**Commit:** `df4a0ba27981` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T17:49:59-05:00
**Tags:** ai-systems-gnn, u-action-surface-separability-measure, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-ACTION-SURFACE-SEPARABILITY-MEASURE (slot:india): measure-first verdict on the action-surface GNN feature

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-ACTION-SURFACE-SEPARABILITY-MEASURE (slot:india): measure-first verdict on the action-surface GNN feature

New non-destructive measurement harness scripts/measure-action-surface-separability.mjs answers GAP#1's go/no-go BEFORE any production mutation or GPU retrain (india soul: measure-before-promote). Fair test: for each labeled single-dispatcher engine WITH an action surface, embed BOTH its humanized NAME and its ACTION-SURFACE text via the same nomic-embed-text model the pipeline uses, group by dispatcher, run the SAME classSeparability metric on each -- isolating the feature effect on identical nodes/classes.

VERDICT (1822 engines, 18 classes, min-class 5, 0 embed failures -- real numbers, no softening):
- NAME baseline: 5/18 separable, meanMargin 0.0377
- ACTION-SURFACE: 6/18 separable, meanMargin 0.0432 (+1 class, +0.0055 margin)
- Gains concentrate in the right manufacturing domains: cad +0.0672 (0.056->0.123), cam +0.0318, data +0.0282, turning +0.0232, infra +0.023, session +0.0145, quoting +0.0107, shop +0.0106 (8 classes improved).

INTERPRETATION: action-surface is a REAL but MODEST additive feature -- it sharpens cad/cam/turning/data but does NOT alone clear the bar (6/18 ~= 33% separable, meanMargin still < 0.05 "entangled") and only 57% of engines have a surface (43% empty -> cannot use it). So it JUSTIFIES wiring action-surface into build-node-embeddings sourceSignal as ONE additive feature, but the full-coverage lift still needs multiple sharper features + H2GCN/GPU retrain (consistent with the cap-sweep + structural-probe conclusions). Do NOT expect this feature alone to clear the deploy gate (R12 -- no overclaiming).

Reuses tested cores: classSeparability (analyze-ghost-embed-separability), buildEngineDispatcherMap/extractWiredEngines (labels), buildActionSurfaceMap/actionSurfaceText (U-ENGINE-ACTION-SURFACE, 13/13). 2/2 pure-helper tests (humanizeEngineName camel/acronym/underscore; groupByClass bucketing + vec-drop). Report: state/shared/nn-graph/action-surface-separability-report.json. Non-destructive (in-memory embed, writes only the report).
```

## Files touched (4)
- scripts/measure-action-surface-separability.mjs               | 187 ++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/measure-action-surface-separability.test.mjs          |  33 +++++++++
- state/shared/nn-graph/action-surface-separability-report.json | 159 ++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 379 insertions(+)

## Lessons surfaced in commit body
- till < 0.05 "entangled") and only 57% of engines have a surface (43% empty -> cannot use it). So it JUSTIFIES wiring action-surface into build-node-embeddings sourceSignal as ONE additive feature, but the full-coverage lift still needs multiple sharper features + H2GCN/GPU retrain (consistent with the cap-sweep + structural-probe conclusions). Do NOT expect this feature alone to clear the deploy gate

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show df4a0ba27981`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._