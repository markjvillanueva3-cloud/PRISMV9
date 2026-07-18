# SUBSTRATE-AUDIT-2026-05-26/U-LORA-MASTER-CORPUS-TRAINER — [MAIN] [SUBSTRATE-AUDIT-2026-05-26]/U-LORA-MASTER-CORPUS-TRAINER: corpus-agnostic dataset-builder primitive (19/19 tests). Closes audit-2026-05-26 finding #5 — CAM-AI-TRAINING-MS0 corpus shipped 5/26 had no consumer wired. Reads JSONL corpus → groups by configurable track field → stratified train/val split (default 0.15, seeded mulberry32 for reproducibility) → writes per-track *.new.jsonl files + manifest under mcp-server/data/lora-datasets/. NEW-file shadow tier per article-1 mistake #4 safety. Pure-fn lib + CLI. Fine-tune itself (Python+transformers+GPU) is a separate downstream unit; this is the substrate that unblocks it. 8 per-track CAM-AI tracks tested end-to-end. CLI: --corpus <path> --track-field <field> [--out <dir>] [--val 0.15] [--seed 42] [--dry-run].

**Commit:** `cecc9c9da84a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T14:01:38-05:00
**Tags:** substrate-audit-2026-05-26, u-lora-master-corpus-trainer, auto-distilled

## Subject
[MAIN] [SUBSTRATE-AUDIT-2026-05-26]/U-LORA-MASTER-CORPUS-TRAINER: corpus-agnostic dataset-builder primitive (19/19 tests). Closes audit-2026-05-26 finding #5 — CAM-AI-TRAINING-MS0 corpus shipped 5/26 had no consumer wired. Reads JSONL corpus → groups by configurable track field → stratified train/val split (default 0.15, seeded mulberry32 for reproducibility) → writes per-track *.new.jsonl files + manifest under mcp-server/data/lora-datasets/. NEW-file shadow tier per article-1 mistake #4 safety. Pure-fn lib + CLI. Fine-tune itself (Python+transformers+GPU) is a separate downstream unit; this is the substrate that unblocks it. 8 per-track CAM-AI tracks tested end-to-end. CLI: --corpus <path> --track-field <field> [--out <dir>] [--val 0.15] [--seed 42] [--dry-run].

## Body
```
[MAIN] [SUBSTRATE-AUDIT-2026-05-26]/U-LORA-MASTER-CORPUS-TRAINER: corpus-agnostic dataset-builder primitive (19/19 tests). Closes audit-2026-05-26 finding #5 — CAM-AI-TRAINING-MS0 corpus shipped 5/26 had no consumer wired. Reads JSONL corpus → groups by configurable track field → stratified train/val split (default 0.15, seeded mulberry32 for reproducibility) → writes per-track *.new.jsonl files + manifest under mcp-server/data/lora-datasets/. NEW-file shadow tier per article-1 mistake #4 safety. Pure-fn lib + CLI. Fine-tune itself (Python+transformers+GPU) is a separate downstream unit; this is the substrate that unblocks it. 8 per-track CAM-AI tracks tested end-to-end. CLI: --corpus <path> --track-field <field> [--out <dir>] [--val 0.15] [--seed 42] [--dry-run].
```

## Files touched (3)
- scripts/lora-dataset-builder.mjs      | 227 +++++++++++++++++++++++++++++++++
- scripts/lora-dataset-builder.test.mjs | 228 ++++++++++++++++++++++++++++++++++
- 2 files changed, 455 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cecc9c9da84a`
- Milestone envelope: `mcp-server/data/milestones/SUBSTRATE-AUDIT-2026-05-26.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._