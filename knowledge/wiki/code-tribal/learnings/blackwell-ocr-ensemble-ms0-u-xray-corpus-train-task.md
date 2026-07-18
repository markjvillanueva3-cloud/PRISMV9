# BLACKWELL-OCR-ENSEMBLE-MS0/U-XRAY-CORPUS-TRAIN-TASK — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-CORPUS-TRAIN-TASK (slot:xray): reaper-immune unattended closed-loop training task

**Commit:** `cdc9ec44b3b1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T12:57:32-05:00
**Tags:** blackwell-ocr-ensemble-ms0, u-xray-corpus-train-task, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-CORPUS-TRAIN-TASK (slot:xray): reaper-immune unattended closed-loop training task

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-CORPUS-TRAIN-TASK (slot:xray): reaper-immune unattended closed-loop training task

A foreground corpus closed-loop run kept getting reaped (exit 255) under heavy fleet load. The runner is resumable (processed-cursor.jsonl, re-OCR=0) so a kill only costs the in-flight print, but it never completes in the foreground. FIX: a scheduled task (Task Scheduler = always-alive parent = reaper-immune, mirroring the proven run-ocr-batch-overnight pattern). run-ocr-training-loop-overnight.ps1 (hidden-console wrapper keeping node's live parent so pdf-to-png page-count returns fast) + install-ocr-training-loop-task.ps1 ('PRISM OCR Training Loop' task, SYSTEM principal, -At/-Daily/-RunNow/-Uninstall). Both ASCII-scrubbed (PS 5.1 codepage mangled em-dashes -> parse error, per feedback_verify_actual_contract_not_proxy). VALIDATED: registered Ready, test-triggered -> State Running, node spawned, real calibration executing. Scheduled 03:30 (quiet GPU window — under heavy load 1-of-2 VLMs times out, dropping corroboration). Outputs corpus-train/{trainset,active-learning-queue,processed-cursor}.jsonl for operator-verify before LoRA fine-tune.
```

## Files touched (3)
- .claude/helpers/install-ocr-training-loop-task.ps1 | 67 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/run-ocr-training-loop-overnight.ps1        | 38 ++++++++++++++++++++++++++++++++++++++
- 2 files changed, 105 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cdc9ec44b3b1`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-OCR-ENSEMBLE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._