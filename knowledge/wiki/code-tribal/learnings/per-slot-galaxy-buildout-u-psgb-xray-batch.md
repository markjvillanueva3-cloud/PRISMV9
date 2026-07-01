# PER-SLOT-GALAXY-BUILDOUT/U-PSGB-XRAY-BATCH — [MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-BATCH (slot:xray): resumable overnight batch OCR runner + worklist gen + scheduled-task installer (pre-test blocker #6)

**Commit:** `a68b1f704896` · **By:** markjvillanueva3-cloud · **At:** 2026-05-30T21:19:08-05:00
**Tags:** per-slot-galaxy-buildout, u-psgb-xray-batch, auto-distilled

## Subject
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-BATCH (slot:xray): resumable overnight batch OCR runner + worklist gen + scheduled-task installer (pre-test blocker #6)

## Body
```
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-BATCH (slot:xray): resumable overnight batch OCR runner + worklist gen + scheduled-task installer (pre-test blocker #6)

Roadmap blocker #6 — the overnight workhorse for running the validated pipeline
unattended when the chat fleet is down (the live-pilot blocker all session was
fleet GPU+CPU saturation; an idle host lets qwen2.5vl stay GPU-resident).

scripts/batch-ollama-vision-extract.mjs: GPU-claim (unload fleet coder models ->
warm VL num_ctx 8192 keep_alive 8h -> confirm size_vram>0, fail-soft) + checkpoint/
resume keyed on source-PDF SHA-256 (same print at many JM paths dedups; crash/
restart resumes; failed prints marked done so no infinite retry) + --time-budget-min
(stop cleanly, resume next night) + per-print isolation (spawns the proven single-
print runner, R8 - one bad print can't kill the batch) + --limit/--max-pages/
--preprocess + summary JSON. 11 node:tests. Dry-run verified over the 400-print worklist.

scripts/build-blueprint-ocr-worklist.mjs: samples real blueprint PDFs into a
worklist - --files (jm-die-database) or --scan-dir (walk the real JM tree, depth-
bounded, fail-soft). looksLikeBlueprint predicate (drawing folders/names, size
band, reject manuals). 6 node:tests. Generated a 400-print pilot worklist.

.claude/helpers/install-blueprint-ocr-batch-task.ps1: one-shot Windows Scheduled
Task (SYSTEM principal, runs without Claude, survives closing chat windows) firing
the batch at -At with -TimeBudgetMin; default --grayscale (safe tier), -Preprocess
opt-in; logs + summary JSON for morning review. PS parse-clean.

Addresses the #1-review P2: the batch sets --max-pages (default 8) so a multi-page
manual can't eat the night. Tonight's run is operator-armed after closing peers.
```

## Files touched (6)
- .claude/helpers/install-blueprint-ocr-batch-task.ps1 |  79 ++++++++++++++++++++++++++++++++++++++++++++
- scripts/batch-ollama-vision-extract.mjs              | 225 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/batch-ollama-vision-extract.test.mjs         |  72 +++++++++++++++++++++++++++++++++++++++++
- scripts/build-blueprint-ocr-worklist.mjs             | 104 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/build-blueprint-ocr-worklist.test.mjs        |  37 +++++++++++++++++++++
- 5 files changed, 517 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a68b1f704896`
- Milestone envelope: `mcp-server/data/milestones/PER-SLOT-GALAXY-BUILDOUT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._