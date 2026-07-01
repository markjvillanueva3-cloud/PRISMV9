# CONTEXT-RETENTION/U-AUTORESUME-STALE-WINDOW — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CONTEXT-RETENTION]/U-AUTORESUME-STALE-WINDOW (slot:alpha): fix silent resume-loss on >4h gaps — bump staleness 4h→12h + boot-path STALE-hint parity

**Commit:** `c83ca9be642b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T21:34:33-05:00
**Tags:** context-retention, u-autoresume-stale-window, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CONTEXT-RETENTION]/U-AUTORESUME-STALE-WINDOW (slot:alpha): fix silent resume-loss on >4h gaps — bump staleness 4h→12h + boot-path STALE-hint parity

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CONTEXT-RETENTION]/U-AUTORESUME-STALE-WINDOW (slot:alpha): fix silent resume-loss on >4h gaps — bump staleness 4h→12h + boot-path STALE-hint parity

Workflow w9brtuij1 context-retention lane F5 (verified). Two silent-context-loss fixes in session-start-auto-resume.mjs:
1. DEFAULT_MAX_AGE_MIN 240→720 (4h→12h). New-PC GPU/OCR bakes routinely exceed 4h, so valid handoffs were dropped as 'stale' = silent resume loss. 12h covers a realistic overnight-bake gap while still rejecting truly-dead handoffs.
2. Boot path (source=startup + PRISM_BOOT_SLOT) used to emit(SILENCE) on a stale handoff — the boot chat got NO context AND no signal it had prior work. The compact path already surfaces a STALE hint; gave the boot path parity (same ageMinutesFromFrontmatter check + hint-emit shape).

Tests: 44/44 (was 42; +2 new — '12h default resumes a 10h handoff' regression guard, fixed staleHandoff fixture 10h→24h so it stays stale under the new default + the 48h-window custom test). Live smoke: hook emits valid {continue:true}, exit 0. Both fixes reduce silent context loss = context retention (alpha domain).
```

## Files touched (3)
- .claude/hooks/__tests__/session-start-auto-resume.test.mjs | 24 ++++++++++++++++++------
- .claude/hooks/session-start-auto-resume.mjs                | 19 +++++++++++++++++--
- 2 files changed, 35 insertions(+), 8 deletions(-)

## Lessons surfaced in commit body
- till rejecting truly-dead handoffs.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c83ca9be642b`
- Milestone envelope: `mcp-server/data/milestones/CONTEXT-RETENTION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._