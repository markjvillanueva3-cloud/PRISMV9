# OBSIDIAN-BRAIN-FIX-MS0/U-OBF-F4 — [MAIN] [OBSIDIAN-BRAIN-FIX-MS0]/U-OBF-F4: hook fire-rate audit + punch list — 516 zero-fire categorized into 136 wired-silent + 380 unwired-on-disk

**Commit:** `e467a4ca0e68` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T15:37:25-05:00
**Tags:** obsidian-brain-fix-ms0, u-obf-f4, auto-distilled

## Subject
[MAIN] [OBSIDIAN-BRAIN-FIX-MS0]/U-OBF-F4: hook fire-rate audit + punch list — 516 zero-fire categorized into 136 wired-silent + 380 unwired-on-disk

## Body
```
[MAIN] [OBSIDIAN-BRAIN-FIX-MS0]/U-OBF-F4: hook fire-rate audit + punch list — 516 zero-fire categorized into 136 wired-silent + 380 unwired-on-disk

META analyzer + 25 tests + punch-list spec + 516-name JSON dump. Splits the
BRAVO-TASK-QUEUE-OBSIDIAN-BRAIN-FIX-2026-05-17 ranker-output (516 'never-fired')
into 136 wired-silent (real fork-storm risk, disable target) and 380
unwired-on-disk (already inert, archive target only).

Mass-disabling all 516 would target a 73%-noise population (R12). U-OBF-F4-DISABLE
deferred — wired-silent set includes rare-but-critical hooks the 18-day ledger
window may not have exercised (always-build-guard, pre-compact-context-budget,
subagent-start-context); per-hook source review needed before any disable.

Files:
- scripts/hook-wiring-vs-fire-categorize.mjs (META analyzer)
- scripts/hook-wiring-vs-fire-categorize.test.mjs (25 node:test cases, all PASS)
- state/shared/specs/U-OBF-F4-HOOK-FIRE-AUDIT-PUNCHLIST-2026-05-18.md
- state/shared/specs/U-OBF-F4-HOOK-FIRE-AUDIT-2026-05-18.json (516-name dump)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (5)
- scripts/hook-wiring-vs-fire-categorize.mjs         |  242 +++++
- scripts/hook-wiring-vs-fire-categorize.test.mjs    |  251 +++++
- .../specs/U-OBF-F4-HOOK-FIRE-AUDIT-2026-05-18.json | 1052 ++++++++++++++++++++
- ...-OBF-F4-HOOK-FIRE-AUDIT-PUNCHLIST-2026-05-18.md |   95 ++
- 4 files changed, 1640 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e467a4ca0e68`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-BRAIN-FIX-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._