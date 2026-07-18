# FORGE-AUDIT/U-SKILL-ARCHIVE-FORGE-RGS-BAK — [MAIN] [FORGE-AUDIT]/U-SKILL-ARCHIVE-FORGE-RGS-BAK: retire 16 dead skills (3 project-local + 13 mirrored user-global) (echo)

**Commit:** `1c1a81eb1a0d` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T16:48:37-05:00
**Tags:** forge-audit, u-skill-archive-forge-rgs-bak, auto-distilled

## Subject
[MAIN] [FORGE-AUDIT]/U-SKILL-ARCHIVE-FORGE-RGS-BAK: retire 16 dead skills (3 project-local + 13 mirrored user-global) (echo)

## Body
```
[MAIN] [FORGE-AUDIT]/U-SKILL-ARCHIVE-FORGE-RGS-BAK: retire 16 dead skills (3 project-local + 13 mirrored user-global) (echo)

DEV-TOOL-CONFLICT-AUDIT F5. SessionStart skill-injection list bloated by:
  C:/Users/wompu/.claude/commands/ (user-global)  - forge..forge6, rgs..rgs5, 2x .fullcopy-bak (13 files)
  H:/.claude/commands/ (mirrored)                  - same 13 files
  H:/prism/.claude/commands/ (project-local)       - forge2, rgs2, rgs3 (3 pass-through stubs)

Files MOVED (per [[feedback_never_delete_only_disable]]) to sibling _archive dirs:
  C:/Users/wompu/.claude/commands-archive/ (13 files preserved)
  H:/.claude/commands-archive/ (13 files preserved, synced from C:)
  H:/prism/.claude/commands-archive/ (3 project-local stubs preserved — this commit)

DISCOVERY (failed assumption): Claude Code's skill loader DOES scan commands/_archive/
subdirectories and namespace them as _archive:* — the audit's original
'_archive/ subdir is NOT auto-injected' claim was WRONG. Verified via live
skill-list inspection. Sibling commands-archive/ (peer dir, not under commands/)
is what actually keeps files preserved but unindexed.

Live verification (this session's refreshed skill list):
  - top-level slash commands forge/forge2-6/rgs/rgs2-5 ABSENT
  - top-level project-local forge2/rgs2/rgs3 ABSENT
  - _archive:* namespaced entries ABSENT
  - canonical forge7 + rgs6 still present

Net SessionStart shrink: ~16 skills retired (~250KB skill text no longer injected).

Survivors: forge7 (the active /forge), rgs6 (the active /rgs).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (5)
- .claude/commands-archive/forge2.md | 22 ++++++++++++++++++
- .claude/commands-archive/rgs2.md   | 33 +++++++++++++++++++++++++++
- .claude/commands-archive/rgs3.md   | 46 ++++++++++++++++++++++++++++++++++++++
- .claude/commands/fleet-reaper.md   | 42 ++++++++++++++++++----------------
- 4 files changed, 124 insertions(+), 19 deletions(-)

## Lessons surfaced in commit body
- WRONG. Verified via live
- till present

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1c1a81eb1a0d`
- Milestone envelope: `mcp-server/data/milestones/FORGE-AUDIT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._