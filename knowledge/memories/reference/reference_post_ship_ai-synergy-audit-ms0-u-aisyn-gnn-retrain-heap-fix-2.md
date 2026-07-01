---
name: reference_post_ship_ai-synergy-audit-ms0-u-aisyn-gnn-retrain-heap-fix-2
description: Auto-distilled learnings from shipping AI-SYNERGY-AUDIT-MS0/U-AISYN-GNN-RETRAIN-HEAP-FIX-2 (commit 15123dff6). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.734Z
aliases: reference_post_ship_ai-synergy-audit-ms0-u-aisyn-gnn-retrain-heap-fix-2
---


# AI-SYNERGY-AUDIT-MS0/U-AISYN-GNN-RETRAIN-HEAP-FIX-2

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-AISYN-GNN-RETRAIN-HEAP-FIX-2 (slot:charlie): the validating retrain (HEAP-FIX-1) ran to completion but surfaced a SIBLING OOM -- step 2c's galaxy-node-features child (build-galaxy-node-embeddings.mjs, spawned line ~605) crashed exit 134 (SIGABRT + GC dump at ~380MB) because that spawn had NO --max-old-space-size either. It embeds 34 galaxies' doctrine + reads/rewrites the multi-hundred-row source; under concurrent fleet RAM pressure it hit the default heap ceiling. Fail-soft meant the retrain continued on the PRIOR run's galaxy features (so unit #6 substrate still exercised), but the fresh merge silently never ran. Fix: prepend --max-old-space-size (reuses PRISM_NN_RETRAIN_LIFECYCLE_HEAP_MB / LIFECYCLE_DEFAULTS.heapMb=8192) to the 2c spawn. VALIDATED: 'node --max-old-space-size=8192 build-galaxy-node-embeddings.mjs --dry' now exits 0, embeds all 34 galaxies (4 docs each), merges 34 ghost.galaxy.<g> rows (was OOM). Completes HEAP-FIX-1 (R15 build-it-whole: every heavy spawn in the lifecycle now heap-bumped: trainer L288, lifecycle self-reexec, 2c child).

**Shipped:** 2026-06-10T20:55:12-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[ai-synergy-audit-ms0-u-aisyn-gnn-retrain-heap-fix-2]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._