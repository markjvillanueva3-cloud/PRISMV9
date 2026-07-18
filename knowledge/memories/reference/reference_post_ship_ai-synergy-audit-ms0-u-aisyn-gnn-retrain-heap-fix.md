---
name: reference_post_ship_ai-synergy-audit-ms0-u-aisyn-gnn-retrain-heap-fix
description: Auto-distilled learnings from shipping AI-SYNERGY-AUDIT-MS0/U-AISYN-GNN-RETRAIN-HEAP-FIX (commit 15123dff6). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.734Z
aliases: reference_post_ship_ai-synergy-audit-ms0-u-aisyn-gnn-retrain-heap-fix
---


# AI-SYNERGY-AUDIT-MS0/U-AISYN-GNN-RETRAIN-HEAP-FIX

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-AISYN-GNN-RETRAIN-HEAP-FIX (slot:charlie): fix lifecycle in-process heap OOM (regression). The GNN self-retrain ran the eval (runAssessment) + base-embedding builds IN-PROCESS -- each loads the ~550MB system graph -- but only the spawned TRAINER got --max-old-space-size (line ~288); the lifecycle's own node process used the default heap and OOM'd at ~381MB during the graph load (2.5s in), so an ad-hoc 'node ...lifecycle --force' crashed before training. Surfaced validating U-AISYN-GNN-NODEFEAT: the 34 galaxy node-features merged fine (count 805, galaxyNodesCovered 34) but the retrain RUN died on graph load. Fix: pure shouldReexecForHeap(argv,env) + a self-reexec guard in __isMain that re-execs once with --max-old-space-size (PRISM_NN_RETRAIN_LIFECYCLE_HEAP_MB, default LIFECYCLE_DEFAULTS.heapMb=8192); cheap modes (--status/--help) skip; PRISM_NN_RETRAIN_REEXEC=1 breaks the loop; PRISM_NN_RETRAIN_NO_REEXEC=1 opts out. Mirrors the MCP supervisor NODE_OPTIONS pattern. 5 reference tests (default->bump, child->no-loop, opt-out, cheap-modes-skip, non-array argv); 54/54 suite green (heap-bumped runner). Fixes india's scheduled retrain too.

**Shipped:** 2026-06-10T20:55:12-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[ai-synergy-audit-ms0-u-aisyn-gnn-retrain-heap-fix]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._