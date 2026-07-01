# AI-SYNERGY-AUDIT-MS0/U-AISYN-GNN-SILENT-TRAIN-GUARD — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-AISYN-GNN-SILENT-TRAIN-GUARD (slot:charlie): R12 silent->loud -- the GNN retrain treated a trainer exit-0-with-no-checkpoint as SUCCESS. Found chasing a measurable GNN lift: PRISM_NN_RETRAIN_HETEROPHILY_HOPS=3 (the documented +0.138 lever) NATIVE-OOMs at the default ~6000-node cap (768d*4=3072d feature matrix; native alloc failure doesn't trigger V8's heap-abort, so exit 0 / no stdout / no checkpoint). Isolated: heterophilyAggregateMap works on synthetic input; trainer runs CLEAN at --max-nodes 800 (AUROC 0.27, H2GCN 3-hop egoDim 768->3072) but silently dies at 6000. defaultTrain returned {ok: status===0} -> false success -> lifecycle eval/promotes a stale checkpoint. Fix: pure classifyTrainResult({status,signal,error,wroteCheckpoint}) + defaultTrain stamps candidate mtime before/after spawn; exit-0 + no fresh checkpoint -> {ok:false} with an actionable error (lower --max-nodes; H2GCN 4x's feature dim). Mirrors the sibling r.signal SIGKILL guard. +4 tests (61/61). Does NOT make H2GCN run at scale (india's GPU/hyperparam domain) -- makes its silent no-op LOUD. Honest: an AUROC lift is not achievable here (800-node hops=3 = 0.27 < 6000-node hops=0 = 0.40).

**Commit:** `7891b0766538` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T22:47:28-05:00
**Tags:** ai-synergy-audit-ms0, u-aisyn-gnn-silent-train-guard, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-AISYN-GNN-SILENT-TRAIN-GUARD (slot:charlie): R12 silent->loud -- the GNN retrain treated a trainer exit-0-with-no-checkpoint as SUCCESS. Found chasing a measurable GNN lift: PRISM_NN_RETRAIN_HETEROPHILY_HOPS=3 (the documented +0.138 lever) NATIVE-OOMs at the default ~6000-node cap (768d*4=3072d feature matrix; native alloc failure doesn't trigger V8's heap-abort, so exit 0 / no stdout / no checkpoint). Isolated: heterophilyAggregateMap works on synthetic input; trainer runs CLEAN at --max-nodes 800 (AUROC 0.27, H2GCN 3-hop egoDim 768->3072) but silently dies at 6000. defaultTrain returned {ok: status===0} -> false success -> lifecycle eval/promotes a stale checkpoint. Fix: pure classifyTrainResult({status,signal,error,wroteCheckpoint}) + defaultTrain stamps candidate mtime before/after spawn; exit-0 + no fresh checkpoint -> {ok:false} with an actionable error (lower --max-nodes; H2GCN 4x's feature dim). Mirrors the sibling r.signal SIGKILL guard. +4 tests (61/61). Does NOT make H2GCN run at scale (india's GPU/hyperparam domain) -- makes its silent no-op LOUD. Honest: an AUROC lift is not achievable here (800-node hops=3 = 0.27 < 6000-node hops=0 = 0.40).

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-AISYN-GNN-SILENT-TRAIN-GUARD (slot:charlie): R12 silent->loud -- the GNN retrain treated a trainer exit-0-with-no-checkpoint as SUCCESS. Found chasing a measurable GNN lift: PRISM_NN_RETRAIN_HETEROPHILY_HOPS=3 (the documented +0.138 lever) NATIVE-OOMs at the default ~6000-node cap (768d*4=3072d feature matrix; native alloc failure doesn't trigger V8's heap-abort, so exit 0 / no stdout / no checkpoint). Isolated: heterophilyAggregateMap works on synthetic input; trainer runs CLEAN at --max-nodes 800 (AUROC 0.27, H2GCN 3-hop egoDim 768->3072) but silently dies at 6000. defaultTrain returned {ok: status===0} -> false success -> lifecycle eval/promotes a stale checkpoint. Fix: pure classifyTrainResult({status,signal,error,wroteCheckpoint}) + defaultTrain stamps candidate mtime before/after spawn; exit-0 + no fresh checkpoint -> {ok:false} with an actionable error (lower --max-nodes; H2GCN 4x's feature dim). Mirrors the sibling r.signal SIGKILL guard. +4 tests (61/61). Does NOT make H2GCN run at scale (india's GPU/hyperparam domain) -- makes its silent no-op LOUD. Honest: an AUROC lift is not achievable here (800-node hops=3 = 0.27 < 6000-node hops=0 = 0.40).
```

## Files touched (3)
- scripts/__tests__/nn-graph-retrain-lifecycle.test.mjs | 31 +++++++++++++++++++++++++++++++
- scripts/nn-graph-retrain-lifecycle.mjs                | 35 ++++++++++++++++++++++++++++-------
- 2 files changed, 59 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7891b0766538`
- Milestone envelope: `mcp-server/data/milestones/AI-SYNERGY-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._