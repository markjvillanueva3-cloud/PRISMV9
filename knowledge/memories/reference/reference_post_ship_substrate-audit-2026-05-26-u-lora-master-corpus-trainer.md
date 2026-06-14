---
name: reference_post_ship_substrate-audit-2026-05-26-u-lora-master-corpus-trainer
description: Auto-distilled learnings from shipping SUBSTRATE-AUDIT-2026-05-26/U-LORA-MASTER-CORPUS-TRAINER (commit cecc9c9da). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.767Z
aliases: reference_post_ship_substrate-audit-2026-05-26-u-lora-master-corpus-trainer
---


# SUBSTRATE-AUDIT-2026-05-26/U-LORA-MASTER-CORPUS-TRAINER

[MAIN] [SUBSTRATE-AUDIT-2026-05-26]/U-LORA-MASTER-CORPUS-TRAINER: corpus-agnostic dataset-builder primitive (19/19 tests). Closes audit-2026-05-26 finding #5 — CAM-AI-TRAINING-MS0 corpus shipped 5/26 had no consumer wired. Reads JSONL corpus → groups by configurable track field → stratified train/val split (default 0.15, seeded mulberry32 for reproducibility) → writes per-track *.new.jsonl files + manifest under mcp-server/data/lora-datasets/. NEW-file shadow tier per article-1 mistake #4 safety. Pure-fn lib + CLI. Fine-tune itself (Python+transformers+GPU) is a separate downstream unit; this is the substrate that unblocks it. 8 per-track CAM-AI tracks tested end-to-end. CLI: --corpus <path> --track-field <field> [--out <dir>] [--val 0.15] [--seed 42] [--dry-run].

**Shipped:** 2026-05-27T14:01:38-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[substrate-audit-2026-05-26-u-lora-master-corpus-trainer]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._