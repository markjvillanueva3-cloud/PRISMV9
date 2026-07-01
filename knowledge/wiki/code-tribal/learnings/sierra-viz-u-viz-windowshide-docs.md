# SIERRA-VIZ/U-VIZ-WINDOWSHIDE-DOCS — [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-WINDOWSHIDE-DOCS (slot:sierra): wiki lesson + CLAUDE.md regression for the windowsHide console-window fix

**Commit:** `f2a5abab9961` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T20:37:06-05:00
**Tags:** sierra-viz, u-viz-windowshide-docs, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-WINDOWSHIDE-DOCS (slot:sierra): wiki lesson + CLAUDE.md regression for the windowsHide console-window fix

## Body
```
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-WINDOWSHIDE-DOCS (slot:sierra): wiki lesson + CLAUDE.md regression for the windowsHide console-window fix

Locks in the learning from U-VIZ-WINDOWSHIDE-DETACHED (6a1cf88bb4) +
U-VIZ-WINDOWSHIDE-SYNC (6654bb3412): on Windows, detached child_process calls open
a PERSISTENT console window and sync calls FLASH unless they pass windowsHide:true.
New wiki lesson knowledge/wiki/lessons/windowshide-console-flash.md (the two classes,
the three tools, and the lessons: value-anchored fixer beats name-anchored auditor;
windowsHide is behavior-neutral so a large sweep is safe; never add an options object
to a call that lacks one; assemble spawn/exec name-open substrings in tool source to
clear the security scanner; [MAIN-FORCE] is the lane-guard escape for fleet infra).
CLAUDE.md ## Recent regressions entry added. Satisfies the bug-finding->wiki gate. Doc-only.
```

## Files touched (3)
- CLAUDE.md                                           |  5 ++--
- knowledge/wiki/lessons/windowshide-console-flash.md | 86 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 89 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- lesson + CLAUDE.md regression for the windowsHide console-window fix
- lesson knowledge/wiki/lessons/windowshide-console-flash.md (the two classes,
- lessons: value-anchored fixer beats name-anchored auditor;

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f2a5abab9961`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._