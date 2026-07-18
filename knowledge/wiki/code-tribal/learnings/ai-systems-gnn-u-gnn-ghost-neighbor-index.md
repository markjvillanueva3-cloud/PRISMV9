# AI-SYSTEMS-GNN/U-GNN-GHOST-NEIGHBOR-INDEX — [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-GHOST-NEIGHBOR-INDEX (slot:india): ghost-aware neighbor index -- the first (graph-free) piece of the ghost-holdout head-to-head; solves the gap buildNeighborIndex can't (it drops ghost->wired edges)

**Commit:** `df6aa71bf705` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T23:41:13-05:00
**Tags:** ai-systems-gnn, u-gnn-ghost-neighbor-index, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-GHOST-NEIGHBOR-INDEX (slot:india): ghost-aware neighbor index -- the first (graph-free) piece of the ghost-holdout head-to-head; solves the gap buildNeighborIndex can't (it drops ghost->wired edges)

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-GHOST-NEIGHBOR-INDEX (slot:india): ghost-aware neighbor index -- the first (graph-free) piece of the ghost-holdout head-to-head; solves the gap buildNeighborIndex can't (it drops ghost->wired edges)

Pure lib: Map<ghostStem, Map<wiredStem, weight>> from leak-free homophilous edge augmentations (import+schema+test). The unwired GHOST is the queryable target (no label); WIRED engines (in stemToClass) are the voting references -- leak-free by construction (only ghost->wired links; ghost->ghost and wired->wired never stored; both-ghost-and-wired collision resolves to wired). The shipped neighborVote(ghostStem, ghostIndex, stemToClass) works drop-in. buildNeighborIndex cannot serve this arm -- its link() requires BOTH endpoints classifiable, and the ghost is unwired. Live-validated graph-free (throwaway probe, deleted): 161 deployed unwired ghosts, 106 get >=1 wired neighbor = 65.8pct coverage, avg 3.36 wired nbrs (consistent with the 62.5pct ghost-edge-coverage diagnostic). 15/15 reference-value tests, 2-arm scrutiny PASS (P2s fixed inline: defensive lowercase of the ghost roster + shared-mode collision + lowercase regression tests). NEXT (fresh window): the graph-dependent 3-arm eval (direct-embed vs neighbor-vote vs confidence-hybrid) on the live holdout via nn-graph-eval. See [[gnn-edges-lever]].
```

## Files touched (3)
- scripts/lib/ghost-neighbor-index.mjs      | 145 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/ghost-neighbor-index.test.mjs | 170 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 315 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show df6aa71bf705`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._