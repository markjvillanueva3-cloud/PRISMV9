# BLACKWELL-OCR-ENSEMBLE-MS0/U-XRAY-CORPUS-TRAIN-REARM — [MAIN-FORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-CORPUS-TRAIN-REARM (slot:xray): re-arm nightly OCR corpus-train grinder + throughput bump (calibrate 8->24, max-time 120s->5h). Trigger had expired (dormant since 06-09, cursor=18) -> re-registered -Daily@02:00, reaper-immune + resumable -> clears the 7,794 drawing-print corpus in ~11 nights. Proven live: cursor 18->32, trainset 8->43, AL-queue 35->86 on real JM prints (Blackwell, qwen3-vl:8b-instruct+qwen2.5vl:7b). Modifies shared-tree runtime wrapper the scheduled task hardcodes -> MAIN-FORCE. Gate to 100%: operator AL-queue gold-verification before india LoRA.

**Commit:** `75b306e72c91` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T15:17:14-05:00
**Tags:** blackwell-ocr-ensemble-ms0, u-xray-corpus-train-rearm, auto-distilled

## Subject
[MAIN-FORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-CORPUS-TRAIN-REARM (slot:xray): re-arm nightly OCR corpus-train grinder + throughput bump (calibrate 8->24, max-time 120s->5h). Trigger had expired (dormant since 06-09, cursor=18) -> re-registered -Daily@02:00, reaper-immune + resumable -> clears the 7,794 drawing-print corpus in ~11 nights. Proven live: cursor 18->32, trainset 8->43, AL-queue 35->86 on real JM prints (Blackwell, qwen3-vl:8b-instruct+qwen2.5vl:7b). Modifies shared-tree runtime wrapper the scheduled task hardcodes -> MAIN-FORCE. Gate to 100%: operator AL-queue gold-verification before india LoRA.

## Body
```
[MAIN-FORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-CORPUS-TRAIN-REARM (slot:xray): re-arm nightly OCR corpus-train grinder + throughput bump (calibrate 8->24, max-time 120s->5h). Trigger had expired (dormant since 06-09, cursor=18) -> re-registered -Daily@02:00, reaper-immune + resumable -> clears the 7,794 drawing-print corpus in ~11 nights. Proven live: cursor 18->32, trainset 8->43, AL-queue 35->86 on real JM prints (Blackwell, qwen3-vl:8b-instruct+qwen2.5vl:7b). Modifies shared-tree runtime wrapper the scheduled task hardcodes -> MAIN-FORCE. Gate to 100%: operator AL-queue gold-verification before india LoRA.
```

## Files touched (2)
- scripts/run-ocr-training-loop-overnight.ps1 | 18 +++++++++++++-----
- 1 file changed, 13 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 75b306e72c91`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-OCR-ENSEMBLE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._