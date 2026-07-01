---
name: reference_post_ship_ai-synergy-audit-ms0-u-aisyn-gnn-silent-train-guard
description: Auto-distilled learnings from shipping AI-SYNERGY-AUDIT-MS0/U-AISYN-GNN-SILENT-TRAIN-GUARD (commit 7891b0766). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.734Z
aliases: reference_post_ship_ai-synergy-audit-ms0-u-aisyn-gnn-silent-train-guard
---


# AI-SYNERGY-AUDIT-MS0/U-AISYN-GNN-SILENT-TRAIN-GUARD

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-AISYN-GNN-SILENT-TRAIN-GUARD (slot:charlie): R12 silent->loud -- the GNN retrain treated a trainer exit-0-with-no-checkpoint as SUCCESS. Found chasing a measurable GNN lift: PRISM_NN_RETRAIN_HETEROPHILY_HOPS=3 (the documented +0.138 lever) NATIVE-OOMs at the default ~6000-node cap (768d*4=3072d feature matrix; native alloc failure doesn't trigger V8's heap-abort, so exit 0 / no stdout / no checkpoint). Isolated: heterophilyAggregateMap works on synthetic input; trainer runs CLEAN at --max-nodes 800 (AUROC 0.27, H2GCN 3-hop egoDim 768->3072) but silently dies at 6000. defaultTrain returned {ok: status===0} -> false success -> lifecycle eval/promotes a stale checkpoint. Fix: pure classifyTrainResult({status,signal,error,wroteCheckpoint}) + defaultTrain stamps candidate mtime before/after spawn; exit-0 + no fresh checkpoint -> {ok:false} with an actionable error (lower --max-nodes; H2GCN 4x's feature dim). Mirrors the sibling r.signal SIGKILL guard. +4 tests (61/61). Does NOT make H2GCN run at scale (india's GPU/hyperparam domain) -- makes its silent no-op LOUD. Honest: an AUROC lift is not achievable here (800-node hops=3 = 0.27 < 6000-node hops=0 = 0.40).

**Shipped:** 2026-06-10T22:47:28-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[ai-synergy-audit-ms0-u-aisyn-gnn-silent-train-guard]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._