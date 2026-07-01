# BLACKWELL-AI-MS0/U-GNN-HETEROPHILY-VALIDATE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-GNN-HETEROPHILY-VALIDATE (slot:india): live-graph A/B validation of the H2GCN lever -- robust +0.067 AUROC lift, but below the gate

**Commit:** `2e5036038645` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T10:47:55-05:00
**Tags:** blackwell-ai-ms0, u-gnn-heterophily-validate, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-GNN-HETEROPHILY-VALIDATE (slot:india): live-graph A/B validation of the H2GCN lever -- robust +0.067 AUROC lift, but below the gate

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-GNN-HETEROPHILY-VALIDATE (slot:india): live-graph A/B validation of the H2GCN lever -- robust +0.067 AUROC lift, but below the gate

scripts/validate-heterophily-auroc.mjs runs the GraphSAGE pipeline on the REAL
wiring graph at heterophilyHops:0 vs N (all else identical -> the delta is the
lever's effect). Pure-JS, heap-bumped (--max-old-space-size; loadGraph
materializes the full ~676MB graph before the maxNodes cap).

LIVE RESULT (R15-step-3, numbers not 'looks fine'):
- Simple config (8-d projected, 1500 nodes): lift is SEED-NOISE -- seed5 +0.118,
  seed7 -0.049, seed11 +0.021 (both arms in the ~0.49 random floor). A single seed
  here would have been a misleading claim; multi-seed exposed it (R9/R12).
- Deploy-gate-realistic config (768-d embeddings + stratified + 4000 nodes),
  3 seeds, ROBUST: baseline (vanilla) AUROC 0.324-0.345 (BELOW random = the
  heterophily anti-correlation, the 0.096-gate symptom); H2GCN hops=2 0.389-0.423;
  lift +0.059..+0.078 (mean ~+0.067, 3/3 positive). inputDim 768->2304, droppedEdges 0.

VERDICT: the H2GCN lever is WIRED+TESTED+VALIDATED and DIRECTIONALLY CORRECT --
it robustly pulls AUROC up from the sub-random anti-correlation. But it does NOT
clear the 0.78 gate (nor reach 0.5 at hops=2) on its own; ~25% isolated nodes
(ego-only) cap the lift. Consistent with the standing finding that gate-clearance
needs reference-pool growth + H2GCN tuning (more hops / denser neighbourhoods) +
GPU retrain, not one lever. Re-run after any of those:
  node --max-old-space-size=8192 scripts/validate-heterophily-auroc.mjs --max-nodes 4000 --epochs 40 --hops 2 --embedding-source state/shared/nn-graph/node-embeddings-768d.jsonl --node-type-field layer
```

## Files touched (2)
- scripts/validate-heterophily-auroc.mjs | 88 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 88 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2e5036038645`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-AI-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._