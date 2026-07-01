# DB-HYGIENE/U-TMPJAN01-FIX — [MAIN] [DB-HYGIENE]/U-TMPJAN01-FIX (slot:golf): close .tmp-<pid> scan gap in tmp-orphan-janitor

**Commit:** `63dac04f0b6b` · **By:** markjvillanueva3-cloud · **At:** 2026-05-30T21:32:28-05:00
**Tags:** db-hygiene, u-tmpjan01-fix, auto-distilled

## Subject
[MAIN] [DB-HYGIENE]/U-TMPJAN01-FIX (slot:golf): close .tmp-<pid> scan gap in tmp-orphan-janitor

## Body
```
[MAIN] [DB-HYGIENE]/U-TMPJAN01-FIX (slot:golf): close .tmp-<pid> scan gap in tmp-orphan-janitor

P0: scan+classify gates used endsWith('.tmp'), so the .tmp-<pid> family (defer-queue.json,
ollama-offload-stats.json — 3438 orphans / 98.6MB measured) was SKIPPED despite pidOf() parsing it.
Added isTmpName() covering all 3 patterns; replaced both gates. +2 regression tests (18/18 pass,
fail vs pre-fix code). golf swept 98.5MB manually + wired 'PRISM Tmp Sweep' task (--apply, 10min)
per U-TMPJAN01's 'recommend golf schedule --apply'.
```

## Files touched (3)
- scripts/tmp-orphan-janitor.mjs      | 15 +++++++++++++--
- scripts/tmp-orphan-janitor.test.mjs | 25 ++++++++++++++++++++++++-
- 2 files changed, 37 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 63dac04f0b6b`
- Milestone envelope: `mcp-server/data/milestones/DB-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._