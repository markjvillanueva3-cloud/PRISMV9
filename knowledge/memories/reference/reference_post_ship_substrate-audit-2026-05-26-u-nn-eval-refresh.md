---
name: reference_post_ship_substrate-audit-2026-05-26-u-nn-eval-refresh
description: Auto-distilled learnings from shipping SUBSTRATE-AUDIT-2026-05-26/U-NN-EVAL-REFRESH (commit 9311a2c55). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.058Z
aliases: reference_post_ship_substrate-audit-2026-05-26-u-nn-eval-refresh
---


# SUBSTRATE-AUDIT-2026-05-26/U-NN-EVAL-REFRESH

[MAIN] [SUBSTRATE-AUDIT-2026-05-26]/U-NN-EVAL-REFRESH: surface latest retrain candidate metrics (14/14 tests). Closes audit finding #10 — NN-EVAL.json frozen at AUROC 0.0961 8-dim while live 768d retrains since 2026-05-22 measured better. Emits state/shared/nn-graph/latest-candidate.json envelope from retrain-lifecycle.jsonl most-recent trained:true entry, OR a degraded marker when only skip entries exist (no fake AUROC numbers). SessionStart PSN-LEG-STATE banner can prefer this over stale NN-EVAL.json. Knobs: PRISM_NN_LIFECYCLE_PATH, PRISM_NN_LATEST_OUTPUT.

**Shipped:** 2026-05-27T13:43:04-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[substrate-audit-2026-05-26-u-nn-eval-refresh]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._