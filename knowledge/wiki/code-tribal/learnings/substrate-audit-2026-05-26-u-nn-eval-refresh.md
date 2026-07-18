# SUBSTRATE-AUDIT-2026-05-26/U-NN-EVAL-REFRESH — [MAIN] [SUBSTRATE-AUDIT-2026-05-26]/U-NN-EVAL-REFRESH: surface latest retrain candidate metrics (14/14 tests). Closes audit finding #10 — NN-EVAL.json frozen at AUROC 0.0961 8-dim while live 768d retrains since 2026-05-22 measured better. Emits state/shared/nn-graph/latest-candidate.json envelope from retrain-lifecycle.jsonl most-recent trained:true entry, OR a degraded marker when only skip entries exist (no fake AUROC numbers). SessionStart PSN-LEG-STATE banner can prefer this over stale NN-EVAL.json. Knobs: PRISM_NN_LIFECYCLE_PATH, PRISM_NN_LATEST_OUTPUT.

**Commit:** `9311a2c55bb1` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T13:43:04-05:00
**Tags:** substrate-audit-2026-05-26, u-nn-eval-refresh, auto-distilled

## Subject
[MAIN] [SUBSTRATE-AUDIT-2026-05-26]/U-NN-EVAL-REFRESH: surface latest retrain candidate metrics (14/14 tests). Closes audit finding #10 — NN-EVAL.json frozen at AUROC 0.0961 8-dim while live 768d retrains since 2026-05-22 measured better. Emits state/shared/nn-graph/latest-candidate.json envelope from retrain-lifecycle.jsonl most-recent trained:true entry, OR a degraded marker when only skip entries exist (no fake AUROC numbers). SessionStart PSN-LEG-STATE banner can prefer this over stale NN-EVAL.json. Knobs: PRISM_NN_LIFECYCLE_PATH, PRISM_NN_LATEST_OUTPUT.

## Body
```
[MAIN] [SUBSTRATE-AUDIT-2026-05-26]/U-NN-EVAL-REFRESH: surface latest retrain candidate metrics (14/14 tests). Closes audit finding #10 — NN-EVAL.json frozen at AUROC 0.0961 8-dim while live 768d retrains since 2026-05-22 measured better. Emits state/shared/nn-graph/latest-candidate.json envelope from retrain-lifecycle.jsonl most-recent trained:true entry, OR a degraded marker when only skip entries exist (no fake AUROC numbers). SessionStart PSN-LEG-STATE banner can prefer this over stale NN-EVAL.json. Knobs: PRISM_NN_LIFECYCLE_PATH, PRISM_NN_LATEST_OUTPUT.
```

## Files touched (3)
- scripts/nn-eval-refresh.mjs      | 182 ++++++++++++++++++++++++++++++++++
- scripts/nn-eval-refresh.test.mjs | 209 +++++++++++++++++++++++++++++++++++++++
- 2 files changed, 391 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9311a2c55bb1`
- Milestone envelope: `mcp-server/data/milestones/SUBSTRATE-AUDIT-2026-05-26.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._