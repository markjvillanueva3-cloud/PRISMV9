# AI-SYSTEMS-GNN/U-GNN-CLASSIFY-HEADTOHEAD — [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-CLASSIFY-HEADTOHEAD (slot:india): direct-embed vs neighbor-vote vs hybrid LOO head-to-head -- edges add directional value (hybrid 0.732 > direct-embed 0.722 @ full coverage; neighbor-vote 0.767 on its subset)

**Commit:** `cd3f64fe26e6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T23:06:29-05:00
**Tags:** ai-systems-gnn, u-gnn-classify-headtohead, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-CLASSIFY-HEADTOHEAD (slot:india): direct-embed vs neighbor-vote vs hybrid LOO head-to-head -- edges add directional value (hybrid 0.732 > direct-embed 0.722 @ full coverage; neighbor-vote 0.767 on its subset)

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-CLASSIFY-HEADTOHEAD (slot:india): direct-embed vs neighbor-vote vs hybrid LOO head-to-head -- edges add directional value (hybrid 0.732 > direct-embed 0.722 @ full coverage; neighbor-vote 0.767 on its subset)

Completes the edges-lever arc. Non-destructive read-only LOO over the 3207 single-class codebase-wired engines (NO 542MB graph -- uses the .cwref-newemb.jsonl cache). direct-embed cosine k-NN (the DEPLOYED mechanism) 0.7222 @ 100pct; neighbor-vote (homophilous edges) 0.7674 @ 61.4pct -- MORE accurate than direct-embed on its covered subset; hybrid (neighbor where edges, direct fallback) 0.7321 @ 100pct = +0.0100 over direct-embed. They agree only 71.4pct where both fire (complementary). EDGES-ADD-VALUE: YES (directional, deterministic full-LOO, no seed variance). R12: margin is MODEST + k-sensitive, accuracy is NOT the deploy gate, wired-set is a CEILING/proxy for the edge-sparser unwired-ghost deploy task. NEXT: confidence-aware hybrid + ghost-holdout AUROC/macroF1/Brier head-to-head. 20/20 reference-value tests, 2-arm scrutiny PASS (P1 margin-honesty + P2s fixed inline). See reference_gnn_neighbor_vote_loo + reference_gnn_edge_class_homophily.
```

## Files touched (3)
- scripts/measure-classify-headtohead.mjs      | 329 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/measure-classify-headtohead.test.mjs | 183 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 512 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cd3f64fe26e6`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._