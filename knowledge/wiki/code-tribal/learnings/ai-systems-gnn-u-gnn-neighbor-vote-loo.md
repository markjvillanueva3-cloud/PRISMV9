# AI-SYSTEMS-GNN/U-GNN-NEIGHBOR-VOTE-LOO — [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-NEIGHBOR-VOTE-LOO (slot:india): leave-one-out neighbor-vote over the homophilous leak-free edges classifies dispatcher at 0.767 acc / 2.88x base-rate -> GREEN-LIGHT the full head-to-head vs direct-embed

**Commit:** `0a2c081f04f0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T22:43:56-05:00
**Tags:** ai-systems-gnn, u-gnn-neighbor-vote-loo, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-NEIGHBOR-VOTE-LOO (slot:india): leave-one-out neighbor-vote over the homophilous leak-free edges classifies dispatcher at 0.767 acc / 2.88x base-rate -> GREEN-LIGHT the full head-to-head vs direct-embed

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-NEIGHBOR-VOTE-LOO (slot:india): leave-one-out neighbor-vote over the homophilous leak-free edges classifies dispatcher at 0.767 acc / 2.88x base-rate -> GREEN-LIGHT the full head-to-head vs direct-embed

Measure-before-build gate for the neighbor-vote-vs-direct-embed unit. Non-destructive read-only LOO over the 3208 single-class codebase-wired engines using engine_import + shared_schema + shared_test edges (physics + action-engine excluded). LIVE: 1969/3208 covered (61.4%), LOO accuracy 0.7674 vs base-rate 0.2668 (predict prism_cam) = 2.88x lift; at production gate tau=0.7 -> 47.1% coverage, 86.2% accuracy (vs deployed direct-embed ~32% coverage spanning 2/13 classes). A zero-ML neighbor vote broadens coverage -> the homophilous edges ARE exploitable. R12 caveat: LOO ran on the edge-DENSE wired set (ceiling); unwired ghosts are edge-sparser so the deployed holdout will score lower; accuracy is NOT the deploy gate. 20/20 reference-value tests, 2-arm scrutiny PASS (arm A no findings; arm B 2 P2 honesty caveats fixed inline). See reference_gnn_edge_class_homophily_2026_06_21.
```

## Files touched (3)
- scripts/measure-neighbor-vote-loo.mjs      | 336 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/measure-neighbor-vote-loo.test.mjs | 224 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 560 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0a2c081f04f0`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._