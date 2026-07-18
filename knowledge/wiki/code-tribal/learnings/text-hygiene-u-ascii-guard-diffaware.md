# TEXT-HYGIENE/U-ASCII-GUARD-DIFFAWARE — [MAIN] [TEXT-HYGIENE]/U-ASCII-GUARD-DIFFAWARE (slot:golf): fix scrutiny P1 over-block - diff-aware blocking

**Commit:** `5bd79ab19326` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T10:35:41-05:00
**Tags:** text-hygiene, u-ascii-guard-diffaware, auto-distilled

## Subject
[MAIN] [TEXT-HYGIENE]/U-ASCII-GUARD-DIFFAWARE (slot:golf): fix scrutiny P1 over-block - diff-aware blocking

## Body
```
[MAIN] [TEXT-HYGIENE]/U-ASCII-GUARD-DIFFAWARE (slot:golf): fix scrutiny P1 over-block - diff-aware blocking

3-of-3 reviewer B FAIL (P1): 83% of enforced-ext files already carry em-dashes in
JSDoc comments, and 'scan new content' meant re-including an existing em-dash line
in any Edit/Write got DENIED -> constant fleet refactor-stall. Real over-block.

Fix: findOffenders is now LINE- and DIFF-aware. collectOldText() pulls the OLD
content (Edit.old_string / MultiEdit old_strings / Write -> existing file on disk);
a line whose exact text already exists in oldText is skipped - only genuinely-NEW
smart-char lines are flagged. Operator intent (block new em-dashes) preserved;
re-including existing lines no longer stalls. Also excluded /__tests__/ (fixtures
that assert smart-quote handling), /locales/ + /i18n/ (localized UI strings).

LIVE: re-include existing em-dash line -> ALLOW; new em-dash -> DENY; src/__tests__/
-> ALLOW. 28/28 self-test (+5 diff-aware: T17 re-include, T18 new-flagged, T19/T20
collectOldText, T21 e2e). Fail-open + knobs unchanged.
```

## Files touched (2)
- .claude/hooks/ascii-guard.mjs | 87 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++----------------------
- 1 file changed, 65 insertions(+), 22 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5bd79ab19326`
- Milestone envelope: `mcp-server/data/milestones/TEXT-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._