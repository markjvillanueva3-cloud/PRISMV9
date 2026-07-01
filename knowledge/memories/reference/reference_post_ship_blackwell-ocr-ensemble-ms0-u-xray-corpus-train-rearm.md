---
name: reference_post_ship_blackwell-ocr-ensemble-ms0-u-xray-corpus-train-rearm
description: Auto-distilled learnings from shipping BLACKWELL-OCR-ENSEMBLE-MS0/U-XRAY-CORPUS-TRAIN-REARM (commit 75b306e72). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.765Z
aliases: reference_post_ship_blackwell-ocr-ensemble-ms0-u-xray-corpus-train-rearm
---


# BLACKWELL-OCR-ENSEMBLE-MS0/U-XRAY-CORPUS-TRAIN-REARM

[MAIN-FORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-CORPUS-TRAIN-REARM (slot:xray): re-arm nightly OCR corpus-train grinder + throughput bump (calibrate 8->24, max-time 120s->5h). Trigger had expired (dormant since 06-09, cursor=18) -> re-registered -Daily@02:00, reaper-immune + resumable -> clears the 7,794 drawing-print corpus in ~11 nights. Proven live: cursor 18->32, trainset 8->43, AL-queue 35->86 on real JM prints (Blackwell, qwen3-vl:8b-instruct+qwen2.5vl:7b). Modifies shared-tree runtime wrapper the scheduled task hardcodes -> MAIN-FORCE. Gate to 100%: operator AL-queue gold-verification before india LoRA.

**Shipped:** 2026-06-16T15:17:14-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[blackwell-ocr-ensemble-ms0-u-xray-corpus-train-rearm]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._