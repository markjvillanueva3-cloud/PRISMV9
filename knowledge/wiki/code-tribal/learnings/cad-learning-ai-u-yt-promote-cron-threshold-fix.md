# CAD-LEARNING-AI/U-YT-PROMOTE-CRON-THRESHOLD-FIX — [MAIN-FORCE] [CAD-LEARNING-AI]/U-YT-PROMOTE-CRON-THRESHOLD-FIX (slot:india): scrutiny-caught P1 -- collapsed wiki-promotion gate

**Commit:** `ce931d7527f5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T19:35:43-05:00
**Tags:** cad-learning-ai, u-yt-promote-cron-threshold-fix, auto-distilled

## Subject
[MAIN-FORCE] [CAD-LEARNING-AI]/U-YT-PROMOTE-CRON-THRESHOLD-FIX (slot:india): scrutiny-caught P1 -- collapsed wiki-promotion gate

## Body
```
[MAIN-FORCE] [CAD-LEARNING-AI]/U-YT-PROMOTE-CRON-THRESHOLD-FIX (slot:india): scrutiny-caught P1 -- collapsed wiki-promotion gate

2-of-2 scrutiny arm B caught a compound bug ACTIVATED by U-YT-PROMOTE-CRON-WIRE (b8acbfcf5c). The PRE-EXISTING step-2 line passed `--threshold 0.9` to promote-tribal-to-wiki.mjs, whose CLI parses it via parseInt('0.9',10)=0. With shouldPromote = (confidence >= threshold) on a 0-100 scale (DEFAULT_THRESHOLD=90), threshold 0 = promote-EVERYTHING. Latent until step-1 video-tip ingest (conf 60) makes it bite: conf-60 YouTube tips would leak into wiki, contradicting this unit's own "high-confidence" / "--no-wiki so step-2 owns wiki" design.

Fix: `--threshold 0.9` -> `--threshold 90` (canonical DEFAULT_THRESHOLD; matches the script's own `--threshold 95` docstring) + a comment documenting the parseInt-fractional trap so it is never reverted.

LIVE proof (dry-run, scanned=3920): @90 above=628 (high-confidence) vs @0.9->0 above=3919 (everything) -- 6.2x over-promotion eliminated. No live damage yet (WOULD PROMOTE=0; skipExisting==above today) -- fixed before the conf-60 video tips bite.
```

## Files touched (2)
- .claude/cron-runners/prism-tribal-promotion-cron.ps1 | 5 ++++-
- 1 file changed, 4 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- til step-1 video-tip ingest (conf 60) makes it bite: conf-60 YouTube tips would leak into wiki, contradicting this unit's own "high-confidence" / "--no-wiki so step-2 owns wiki" design.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ce931d7527f5`
- Milestone envelope: `mcp-server/data/milestones/CAD-LEARNING-AI.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._