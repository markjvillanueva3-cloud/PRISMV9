# AI-SYSTEMS-GNN/U-GNN-CONFIDENCE-HYBRID — [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-CONFIDENCE-HYBRID (slot:india): purity-gated hybrid lifts the edges lever to +0.0309 over deployed direct-embed (best tau=0.70 -> 0.7530 vs 0.7222), nearly 3x the naive blend

**Commit:** `fb496ed0abe1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T23:16:12-05:00
**Tags:** ai-systems-gnn, u-gnn-confidence-hybrid, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-CONFIDENCE-HYBRID (slot:india): purity-gated hybrid lifts the edges lever to +0.0309 over deployed direct-embed (best tau=0.70 -> 0.7530 vs 0.7222), nearly 3x the naive blend

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-CONFIDENCE-HYBRID (slot:india): purity-gated hybrid lifts the edges lever to +0.0309 over deployed direct-embed (best tau=0.70 -> 0.7530 vs 0.7222), nearly 3x the naive blend

Sharpens U-GNN-CLASSIFY-HEADTOHEAD. Non-destructive read-only tau-sweep over the 3207 single-class codebase-wired engines (NO 542MB graph; reuses .cwref-newemb.jsonl + shipped neighborVote/directEmbedVote). Trust the neighbor-vote only when its purity confidence >= tau, else direct-embed fallback. Sweep: tau=0 (naive) 0.7321 -> tau=0.70 (BEST) 0.7530 -> tau=1.01 (pure direct) 0.7222; monotone rise then slight decline. BEST tau=0.70 = +0.0209 over naive, +0.0309 over direct-embed -- and tau=0.70 coincides with GNN_DEFAULTS.minConf (the production gate; observed, not claimed causal). CONFIDENCE-GATING HELPS: YES. R12: deterministic full-LOO (no seed variance), k-sensitive; wired-set is a CEILING/proxy for the edge-sparser unwired-ghost task; accuracy is NOT the deploy gate; tau=0.70 is a CANDIDATE for the ghost-holdout head-to-head. 18/18 reference-value tests, 2-arm scrutiny PASS (0 P0/P1; 3 latent-only P2s logged). See reference_gnn_classify_headtohead_2026_06_21.
```

## Files touched (3)
- scripts/measure-confidence-hybrid.mjs      | 261 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/measure-confidence-hybrid.test.mjs | 172 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 433 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fb496ed0abe1`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._