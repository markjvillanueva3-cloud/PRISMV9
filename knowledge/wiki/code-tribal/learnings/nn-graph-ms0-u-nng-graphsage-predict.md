# NN-GRAPH-MS0/U-NNG-GRAPHSAGE-PREDICT — [MAIN] [NN-GRAPH-MS0]/U-NNG-GRAPHSAGE-PREDICT: U5 — link-prediction inference

**Commit:** `458ece24ac55` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T09:00:50-05:00
**Tags:** nn-graph-ms0, u-nng-graphsage-predict, auto-distilled

## Subject
[MAIN] [NN-GRAPH-MS0]/U-NNG-GRAPHSAGE-PREDICT: U5 — link-prediction inference

## Body
```
[MAIN] [NN-GRAPH-MS0]/U-NNG-GRAPHSAGE-PREDICT: U5 — link-prediction inference

Loads a U4-trained checkpoint, embeds a graph with frozen weights, and ranks
candidate MISSING ("wiring") links with raw + calibrated probabilities.
2-hop bounded candidate generation; leakage-free non-edge filtering via the
symmetric adjacency; rejects a checkpoint trained on a mismatched feature
layout. Verified signal: held-out intra-cluster edges score 0.90 and rank
above cross-cluster non-edges (0.0-0.42), margin 0.49. 37 node:test cases
incl an untrained-vs-trained margin assertion; per-file 2-agent scrutiny PASS.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- scripts/lib/graphsage-predictor.mjs      | 322 ++++++++++++++++++++++++
- scripts/lib/graphsage-predictor.test.mjs | 415 +++++++++++++++++++++++++++++++
- 2 files changed, 737 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 458ece24ac55`
- Milestone envelope: `mcp-server/data/milestones/NN-GRAPH-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._