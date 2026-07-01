# TOKEN-SAVINGS-PIVOT/U-PSN-DOC-REFLECT — [MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-DOC-REFLECT (slot:alpha iter3): wiki entry for paired iter1+2 — action-hint + banner-fail-loud

**Commit:** `c4eba862af89` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T13:28:27-05:00
**Tags:** token-savings-pivot, u-psn-doc-reflect, auto-distilled

## Subject
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-DOC-REFLECT (slot:alpha iter3): wiki entry for paired iter1+2 — action-hint + banner-fail-loud

## Body
```
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-DOC-REFLECT (slot:alpha iter3): wiki entry for paired iter1+2 — action-hint + banner-fail-loud

Per feedback_reflect_all_changes_post_update — closes the wiki surface
for iter1 (U-PSN-ACTION-HINT, commit 4690e17f3b) and iter2
(U-PSN-BANNER-FAIL-LOUD, ~8a5168f). Memory + MEMORY.md index pointer
land in user-space C:/ memory dir (auto-mirrored to knowledge/memories/
by stop-obsidian-memory-feed.mjs at session end — NOT committed here,
that's a separate surface). CLAUDE.md ## Recent regressions
auto-updates via the regression hook.

Architecture entry covers:
  • the two gaps that left take-rate stuck at 0% (hints not actionable +
    dashboard hiding the gap)
  • the iter1 _PREFERRED_ACTION_FOR_CLASSIFIER map and round-trip cross-
    check against mcp-route-takeup
  • the iter2 three-state honest banner + named-constants extraction
  • PSN-leg synergy: PRISM OS + telemetry sidecar + SessionStart inject
    + R12 fail-loud + take-up credit map
  • knobs to revert each iter independently
  • test file pointers (45/45 total: 23+22)
```

## Files touched (2)
- .../psn-action-hint-and-banner-fail-loud.md        | 78 ++++++++++++++++++++++
- 1 file changed, 78 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c4eba862af89`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-PIVOT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._