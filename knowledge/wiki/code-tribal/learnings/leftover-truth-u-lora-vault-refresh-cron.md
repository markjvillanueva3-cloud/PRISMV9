# LEFTOVER-TRUTH/U-LORA-VAULT-REFRESH-CRON — [MAIN-FORCE] [LEFTOVER-TRUTH]/U-LORA-VAULT-REFRESH-CRON (slot:zulu): close the LoRA dataset-feeder loop (cron harness; train half routed to india)

**Commit:** `3856285939bc` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T21:01:27-05:00
**Tags:** leftover-truth, u-lora-vault-refresh-cron, auto-distilled

## Subject
[MAIN-FORCE] [LEFTOVER-TRUTH]/U-LORA-VAULT-REFRESH-CRON (slot:zulu): close the LoRA dataset-feeder loop (cron harness; train half routed to india)

## Body
```
[MAIN-FORCE] [LEFTOVER-TRUTH]/U-LORA-VAULT-REFRESH-CRON (slot:zulu): close the LoRA dataset-feeder loop (cron harness; train half routed to india)

Knowledge-substrate audit (this session) found the feedback->LoRA loop OPEN: the
GNN loop auto-compounds (vault-to-gnn-refpool in nn-graph-retrain-lifecycle, run
by PRISM NN-Graph Retrain cron) but the LoRA dataset FEEDERS had NO cron -- the
Alpaca pairs only refreshed on a manual run, so new feedback/wiki/lesson memories
never reached the training corpus on a schedule.

This ships the SAFE half (in-lane infra per hermes-zulu grant B-1, coordinated
with india via chat bus):
 - refresh-lora-vault-datasets.mjs: $0/no-GPU/idempotent harness that re-runs the
   COMPLETE current feeder set (DECLARATIVE FEEDERS list -- R16 fit-the-whole):
   vault-to-lora-dataset x3 sources (feedback/galaxy/galaxy-ai-synergy) +
   vault-wiki-to-lora-dataset (U-LORA-WIKI-DOMAIN, india added it TODAY) +
   vault-lessons-to-lora-dataset. Fail-soft per feeder; non-zero exit ONLY if
   EVERY feeder fails (a single transient miss must not flap the task red, R12).
 - install-lora-dataset-refresh-task.ps1: weekly Sun 03:47 + AtLogOn cron (clone
   of the proven install-tango/misc pattern; SYSTEM principal, header-marker
   sanity check, -RunNow LastTaskResult proof). Preserved installer -- operator/
   india registers it.
 - 7/7 tests (fit-the-whole oracle: all 3 feeder scripts covered; exact-CLI-args;
   fail-soft isolation; allFailed-only-when-every-job-failed). LIVE: 5/5 feeders
   refreshed 3,634 pairs (feedback 328 + galaxy 413 + ai-synergy 12 + wiki 2714 +
   lessons 167). PS AST parse clean.

The TRAIN half (wire a doctrine-LoRA train cycle CONSUMING these jsonl --
cadence/GPU/eval-gate/base-model) is routed to india (chat bus); NOT decided here.
```

## Files touched (4)
- .claude/helpers/install-lora-dataset-refresh-task.ps1 | 140 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/refresh-lora-vault-datasets.mjs               | 117 ++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/refresh-lora-vault-datasets.test.mjs          |  79 +++++++++++++++++++++++++++++++++
- 3 files changed, 336 insertions(+)

## Lessons surfaced in commit body
- lesson memories
- lessons-to-lora-dataset. Fail-soft per feeder; non-zero exit ONLY if
- lessons 167). PS AST parse clean.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3856285939bc`
- Milestone envelope: `mcp-server/data/milestones/LEFTOVER-TRUTH.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._