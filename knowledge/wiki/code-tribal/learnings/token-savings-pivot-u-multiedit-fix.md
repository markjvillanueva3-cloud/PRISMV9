# TOKEN-SAVINGS-PIVOT/U-MULTIEDIT-FIX — [MAIN] [TOKEN-SAVINGS-PIVOT]/U-MULTIEDIT-FIX (slot:alpha iter12): isLargeWrite covers MultiEdit edits[]

**Commit:** `b4df05d22369` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T19:09:15-05:00
**Tags:** token-savings-pivot, u-multiedit-fix, auto-distilled

## Subject
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-MULTIEDIT-FIX (slot:alpha iter12): isLargeWrite covers MultiEdit edits[]

## Body
```
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-MULTIEDIT-FIX (slot:alpha iter12): isLargeWrite covers MultiEdit edits[]

MultiEdit was previously slipping past the isLargeWrite check because
its content lives in edits[].new_string, NOT in a top-level
content/new_string field. A MultiEdit with 5 edits × 12KB each
(60KB cumulative — definitely worth nudging) was silently bypassing
the TOKEN-SAVE branch.

Fix: when toolName === "MultiEdit" and edits[] is an array, sum
new_string across all edits before passing to isLargeWrite. Write
and Edit paths unchanged.

Smoke:
  MultiEdit 2 × 30KB → TOKEN-SAVE fires (60KB cumulative, > 50KB)
  MultiEdit 1 × "b"  → silent (correct)

Latent-bug-fix; closes a measurement gap discovered while reviewing
the per-tool fire counts (Write fires significantly outnumbered
MultiEdit which should never be true in practice).
```

## Files touched (2)
- .claude/hooks/mcp-route-suggest.mjs | 11 +++++++++--
- 1 file changed, 9 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b4df05d22369`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-PIVOT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._