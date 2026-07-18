# AI-SYSTEMS-GNN/U-GNN-COVERAGE-RESOLVED — [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-COVERAGE-RESOLVED (slot:india): resolve the tier-5 coverage question -- embedding-model-limited, full-LDA reasoned-deferred

**Commit:** `dd09c9d618f5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T10:42:46-05:00
**Tags:** ai-systems-gnn, u-gnn-coverage-resolved, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-COVERAGE-RESOLVED (slot:india): resolve the tier-5 coverage question -- embedding-model-limited, full-LDA reasoned-deferred

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-COVERAGE-RESOLVED (slot:india): resolve the tier-5 coverage question -- embedding-model-limited, full-LDA reasoned-deferred

Closes the GNN tier-5 coverage investigation. Two facts resolve it WITHOUT building full off-diagonal
LDA: (1) the sharp/Fisher lever measurements were LEAKAGE-OPTIMISTIC (transform fit on the full cache,
--refs-only then splits a holdout from that same cache -> upper-bound AUROC) and diagonal-Fisher STILL
moved only +0.005 / stayed no-deployable -- a rejection robust under optimistic measurement; (2) diagonal-
Fisher is LDA constrained to axis-scaling, full LDA only adds rotation -- both LINEAR transforms of the
nomic embedding that cannot ADD discriminative info not already linearly present, and the leak-optimistic
+0.005 bounds the linear headroom as small. So full-LDA = LOW-EV + leak-confounded -> reasoned-deferred.
The real remaining lever is a STRONGER EMBEDDING MODEL (re-embed), a separate large infra unit. The
deployed selective-deploy 2-class posture stays correct. EigensolverEngine.ts noted for a future build.
```

## Files touched (2)
- knowledge/wiki/lessons/ref-pool-growth-can-regress-deploy-gate.md | 25 ++++++++++++++++++++-----
- 1 file changed, 20 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- TILL

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show dd09c9d618f5`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._