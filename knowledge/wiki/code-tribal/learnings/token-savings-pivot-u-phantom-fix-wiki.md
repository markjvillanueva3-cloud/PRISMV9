# TOKEN-SAVINGS-PIVOT/U-PHANTOM-FIX-WIKI — [MAIN] [TOKEN-SAVINGS-PIVOT]/U-PHANTOM-FIX-WIKI (slot:alpha iter6): phantom prism_dev:bash fix + wiki entry

**Commit:** `8dbac9f11bab` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T18:45:02-05:00
**Tags:** token-savings-pivot, u-phantom-fix-wiki, auto-distilled

## Subject
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-PHANTOM-FIX-WIKI (slot:alpha iter6): phantom prism_dev:bash fix + wiki entry

## Body
```
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-PHANTOM-FIX-WIKI (slot:alpha iter6): phantom prism_dev:bash fix + wiki entry

Two follow-ups from iter-5 reference memory closed in one commit:

(1) Phantom action ref fixed in mcp-route-suggest.mjs Bash nudge.
    iter-2 text named `prism_dev:bash (server-side truncate+compact)`
    but no such action exists in devDispatcher's z.enum ACTIONS list.
    Replaced with the actual canonical answer: `rtk <cmd>` for verbose
    bash; Read tool with offset/limit for cat; prism_session:action_search
    for git log; prism_session:master_index_query for find/grep.
    Smoke-verified: nudge still fires with new text on Bash:cat.

(2) Wiki entry at knowledge/wiki/architecture/token-savings-pivot.md.
    Architecture diagram, 9-classifier table, iter-by-iter ship history
    (now covering iter1..iter6), R12-inversion doctrine note, disable
    knobs, 4 remaining follow-ups. Cross-refs to mcp-route-suggest,
    ollama-route-check (sister), atomic-write-idempotency-patterns
    (mirrored pattern), session-continuity-stack (sister sidecar).

Closes CLAUDE.md §Doc reflection rule for this milestone (all 4
surfaces now updated: CLAUDE.md pointer doctrine, MEMORY.md index,
Obsidian memory mirror, wiki entry).
```

## Files touched (3)
- .claude/hooks/mcp-route-suggest.mjs                |  2 +-
- knowledge/wiki/architecture/token-savings-pivot.md | 98 ++++++++++++++++++++++
- 2 files changed, 99 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till fires with new text on Bash:cat.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8dbac9f11bab`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-PIVOT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._