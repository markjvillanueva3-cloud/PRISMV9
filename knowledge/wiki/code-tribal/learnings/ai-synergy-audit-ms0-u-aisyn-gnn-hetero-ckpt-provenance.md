# AI-SYNERGY-AUDIT-MS0/U-AISYN-GNN-HETERO-CKPT-PROVENANCE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-AISYN-GNN-HETERO-CKPT-PROVENANCE (slot:alpha): persist H2GCN feature-widening provenance IN the checkpoint so the predictor reads hops+normalize instead of inferring them.

**Commit:** `676dd275b555` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T10:22:02-05:00
**Tags:** ai-synergy-audit-ms0, u-aisyn-gnn-hetero-ckpt-provenance, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-AISYN-GNN-HETERO-CKPT-PROVENANCE (slot:alpha): persist H2GCN feature-widening provenance IN the checkpoint so the predictor reads hops+normalize instead of inferring them.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-AISYN-GNN-HETERO-CKPT-PROVENANCE (slot:alpha): persist H2GCN feature-widening provenance IN the checkpoint so the predictor reads hops+normalize instead of inferring them.

The predict-fix (b1f72793f8) let the heterophily eval grade by INFERRING hops=inputDim/baseDim-1 and assuming normalize='mean'. That inference cannot recover normalize='sum' -- a sum-normalized H2GCN checkpoint would be reproduced with the wrong aggregation at inference (silent accuracy loss, not a crash). This unit makes the checkpoint self-describing.

WIRE (R15): three coupled edits, one contract -- (1) graphsage-train-pipeline stamps model.config.heterophily={hops,normalize,egoDim} after createModel when heterophily was applied; (2) saveCheckpoint persists it (additive+optional spread, absent on legacy); (3) loadCheckpoint MIRRORS it back through reconstruction -- WITHOUT the mirror, save persisted it but load silently DROPPED it, making the predictor's read a dead no-op (caught by reading the actual loadCheckpoint config contract, R8). Predictor now PREFERS persisted provenance, falls back to inference for legacy.

TEST: +7 provenance tests (persist / round-trip / normalize='sum' verbatim / unknown->mean coercion / legacy-omits-both-ways / forward-valid byte-identical). 369/369 green across the full graphsage+nn-graph-eval suite (0 regression; legacy deepEqual config guard stays green).

VALIDATE (live): the fresh retrain wrote graphsage-checkpoint.candidate.json with config.heterophily={hops:3,normalize:mean,egoDim:768}, inputDim=3072=768*(1+3); loadCheckpoint(candidate).model.config.heterophily reads it back intact -- the predictor at line 191 now reads, not infers. Live 8-dim checkpoint omits the key (legacy path preserved). Model still below the 0.78 full-coverage gate = honest research reality (ref-pool growth + arch, india's GPU lane); this unit is correctness/robustness of the eval path, not a gate pass.
```

## Files touched (5)
- scripts/lib/graphsage-checkpoint.mjs      | 23 +++++++++++++++++++++++
- scripts/lib/graphsage-checkpoint.test.mjs | 52 ++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/graphsage-predictor.mjs       | 11 +++++++++--
- scripts/lib/graphsage-train-pipeline.mjs  | 12 ++++++++++++
- 4 files changed, 96 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- wrong aggregation at inference (silent accuracy loss, not a crash). This unit makes the checkpoint self-describing.
- till below the 0.78 full-coverage gate = honest research reality (ref-pool growth + arch, india's GPU lane); this unit is correctness/robustness of the eval path, not a gate pass.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 676dd275b555`
- Milestone envelope: `mcp-server/data/milestones/AI-SYNERGY-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._