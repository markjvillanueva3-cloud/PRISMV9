# SYNERGY-AUDIT-CONTINUE/U-HANDOFF-PRUNE-CRON — [MAIN] [SYNERGY-AUDIT-CONTINUE]/U-HANDOFF-PRUNE-CRON (slot:echo): monthly cron archives stale handoffs >30d

**Commit:** `84e0eb555fc3` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T18:40:39-05:00
**Tags:** synergy-audit-continue, u-handoff-prune-cron, auto-distilled

## Subject
[MAIN] [SYNERGY-AUDIT-CONTINUE]/U-HANDOFF-PRUNE-CRON (slot:echo): monthly cron archives stale handoffs >30d

## Body
```
[MAIN] [SYNERGY-AUDIT-CONTINUE]/U-HANDOFF-PRUNE-CRON (slot:echo): monthly cron archives stale handoffs >30d

ECHO-UNDONE H6. state/shared/handoffs/ accrues one HANDOFF-*.md per chat
per topic and never self-cleans (600+ files). This archives (a MOVE, never
a delete — reversible) every top-level handoff untouched >30d into
archive/<YYYY-MM>/ grouped by the handoff's own month. Dry-run default;
--apply required; self-throttles to one apply-run/30d; --force/--json.

Age = frontmatter written_at when present, else fs mtime: git checkout and
the C:->H: mirror both reset mtime to "now", which would defeat an
mtime-only prune. parseWrittenAt() recovers the logical write time.

14/14 tests (pure: archiveSubdir/parseWrittenAt/planArchive/shouldRun +
determinism + STALE_DAYS boundary). Per-file scrutiny 2-of-2 PASS. Two P1
fixes verified by both reviewers: throttle arms on every non-throttled
apply-run incl. empty; name-collisions surface a WARN block, not a silent
skip. main()/apply-path unit tests are a deferred P2 (pure core covered).
```

## Files touched (3)
- scripts/handoff-prune-cron.mjs      | 245 ++++++++++++++++++++++++++++++++++++
- scripts/handoff-prune-cron.test.mjs | 127 +++++++++++++++++++
- 2 files changed, 372 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 84e0eb555fc3`
- Milestone envelope: `mcp-server/data/milestones/SYNERGY-AUDIT-CONTINUE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._