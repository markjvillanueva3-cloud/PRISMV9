# AI-SYSTEMS-GNN/U-GNN-STATUS-DEPLOYED-METRIC — [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-STATUS-DEPLOYED-METRIC (slot:india): --status shows the DEPLOYED direct-embed metric, not just the pretext checkpoint AUROC

**Commit:** `324d09c661e3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T14:08:19-05:00
**Tags:** ai-systems-gnn, u-gnn-status-deployed-metric, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-STATUS-DEPLOYED-METRIC (slot:india): --status shows the DEPLOYED direct-embed metric, not just the pretext checkpoint AUROC

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-STATUS-DEPLOYED-METRIC (slot:india): --status shows the DEPLOYED direct-embed metric, not just the pretext checkpoint AUROC

The lifecycle --status printed only the trained 8-d checkpoint AUROC (~0.096)
with no deployed-path line -- a reader misreads leg #10 (GNN tier-5) as broken.
That 0.096 is the link-pred PRETEXT metric; the DEPLOYED inference path is
direct-embed (NN-EVAL.json: full-holdout AUROC 0.789, selective deploy-ready
@tau=0.7, 27.4% coverage, robust). This is the exact wrong-mode footgun the
session-start confusion + the degenerate-memory both stemmed from.

New pure exported formatDeployedStatus(evalDoc) renders the deployed state from
a parsed NN-EVAL.json (or null) -- reads the verdict the eval ALREADY computed
(selective.deployGrade), re-derives NO gate threshold (R8). printStatus now
annotates the checkpoint AUROC line 'link-pred PRETEXT, NOT the deploy gate' and
appends the deployed block (fail-soft read; absent/deferred/model-mode all
surfaced honestly -- a model-mode report is flagged NOT the deployed path).

Display-only: no change to runLifecycle/promotion/drift/write paths. +3 R9 tests
(direct/model/deferred+null; assert real rendered substrings incl coverage 27.4%
from 0.2738). lifecycle 92/92. 2-arm scrutiny PASS 0 P0/P1 (arm-B caught 4 added
em-dashes matching the file convention but ascii-guard-risky -> converted to --).
```

## Files touched (3)
- scripts/__tests__/nn-graph-retrain-lifecycle.test.mjs | 34 ++++++++++++++++++++++++++++++++++
- scripts/nn-graph-retrain-lifecycle.mjs                | 46 +++++++++++++++++++++++++++++++++++++++++++++-
- 2 files changed, 79 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- wrong-mode footgun the

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 324d09c661e3`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._