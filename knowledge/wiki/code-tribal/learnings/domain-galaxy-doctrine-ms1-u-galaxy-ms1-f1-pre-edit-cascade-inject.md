# DOMAIN-GALAXY-DOCTRINE-MS1/U-GALAXY-MS1-F1-PRE-EDIT-CASCADE-INJECT — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DOMAIN-GALAXY-DOCTRINE-MS1]/U-GALAXY-MS1-F1-PRE-EDIT-CASCADE-INJECT (slot:alpha iter24 yolo-goal): NEW .claude/hooks/pre-edit-galaxy-cascade-inject.mjs PreToolUse hook (88L T2). Insurance against Bibryam Context Cascade misfire — when editing under engines/<galaxy>/, injects the first N (default 30, clamp 5..100) lines of that galaxy's CLAUDE.md as additionalContext so chats / subagents / long-running sessions see galaxy-local doctrine even if the harness's natural CLAUDE.md walk skipped it. Mirrors F2 + F3 KNOWN_GALAXIES set (all 21 covered: 20 galaxies + 1 sentinel for engines/baseline). Advisory only never blocks. Fail-soft. Knobs: PRISM_GALAXY_CASCADE_INJECT_DISABLE=1 / _LINES=N. Wiring deferred to settings.json registration. Cumulative: 26 commits ~3610L. F1+F2+F3 trio = Octopus/orchestrator synergy per SCOPE-EXPANSION §Q1 substrate edits.

**Commit:** `24d4a0951345` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T21:04:06-05:00
**Tags:** domain-galaxy-doctrine-ms1, u-galaxy-ms1-f1-pre-edit-cascade-inject, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DOMAIN-GALAXY-DOCTRINE-MS1]/U-GALAXY-MS1-F1-PRE-EDIT-CASCADE-INJECT (slot:alpha iter24 yolo-goal): NEW .claude/hooks/pre-edit-galaxy-cascade-inject.mjs PreToolUse hook (88L T2). Insurance against Bibryam Context Cascade misfire — when editing under engines/<galaxy>/, injects the first N (default 30, clamp 5..100) lines of that galaxy's CLAUDE.md as additionalContext so chats / subagents / long-running sessions see galaxy-local doctrine even if the harness's natural CLAUDE.md walk skipped it. Mirrors F2 + F3 KNOWN_GALAXIES set (all 21 covered: 20 galaxies + 1 sentinel for engines/baseline). Advisory only never blocks. Fail-soft. Knobs: PRISM_GALAXY_CASCADE_INJECT_DISABLE=1 / _LINES=N. Wiring deferred to settings.json registration. Cumulative: 26 commits ~3610L. F1+F2+F3 trio = Octopus/orchestrator synergy per SCOPE-EXPANSION §Q1 substrate edits.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DOMAIN-GALAXY-DOCTRINE-MS1]/U-GALAXY-MS1-F1-PRE-EDIT-CASCADE-INJECT (slot:alpha iter24 yolo-goal): NEW .claude/hooks/pre-edit-galaxy-cascade-inject.mjs PreToolUse hook (88L T2). Insurance against Bibryam Context Cascade misfire — when editing under engines/<galaxy>/, injects the first N (default 30, clamp 5..100) lines of that galaxy's CLAUDE.md as additionalContext so chats / subagents / long-running sessions see galaxy-local doctrine even if the harness's natural CLAUDE.md walk skipped it. Mirrors F2 + F3 KNOWN_GALAXIES set (all 21 covered: 20 galaxies + 1 sentinel for engines/baseline). Advisory only never blocks. Fail-soft. Knobs: PRISM_GALAXY_CASCADE_INJECT_DISABLE=1 / _LINES=N. Wiring deferred to settings.json registration. Cumulative: 26 commits ~3610L. F1+F2+F3 trio = Octopus/orchestrator synergy per SCOPE-EXPANSION §Q1 substrate edits.
```

## Files touched (2)
- .claude/hooks/pre-edit-galaxy-cascade-inject.mjs | 100 +++++++++++++++++++++++
- 1 file changed, 100 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 24d4a0951345`
- Milestone envelope: `mcp-server/data/milestones/DOMAIN-GALAXY-DOCTRINE-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._