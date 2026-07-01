# TOKEN-SAVINGS-PIVOT/U-SIDECAR-SIZE-CAP — [MAIN] [TOKEN-SAVINGS-PIVOT]/U-SIDECAR-SIZE-CAP (slot:alpha iter14): defensive size cap on sidecar JSON

**Commit:** `0f15a2c1b7b1` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T19:11:49-05:00
**Tags:** token-savings-pivot, u-sidecar-size-cap, auto-distilled

## Subject
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-SIDECAR-SIZE-CAP (slot:alpha iter14): defensive size cap on sidecar JSON

## Body
```
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-SIDECAR-SIZE-CAP (slot:alpha iter14): defensive size cap on sidecar JSON

Defensive guard against unbounded sidecar growth — never write a
file > 256KB. Three-tier truncation strategy:

  1. Soft cap (always): recent[] ≤ 100, takeups[] ≤ 100 (double-belt
     with the takeup hook's own cap, in case either drifts).
  2. Hard cap (if body > 256KB): truncate both arrays to 25 entries
     and re-serialize.
  3. Final cap (if still > 256KB): truncate both to 10 entries; if
     STILL > 256KB, bail and skip the write entirely (next fire
     re-attempts with smaller state).

Live smoke: hook fires normally, file size 3216 bytes — well under cap.

This is belt-and-suspenders defense. Under normal operation neither
truncation tier fires; if a future bug somehow grows the entries it
defends against silent disk fill across the 26-chat fleet (worst case
~6.5MB total if every slot hits the cap simultaneously — bounded).

Closes a latent safety gap: the iter-3 sidecar had cap=100 on each
array but NO defense against per-entry bloat. If a future change
adds large fields (e.g. full tool_input dumps), this guard catches it
before it eats the disk.
```

## Files touched (2)
- .claude/hooks/mcp-route-suggest.mjs | 24 +++++++++++++++++++++++-
- 1 file changed, 23 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till > 256KB): truncate both to 10 entries; if
- TILL > 256KB, bail and skip the write entirely (next fire

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0f15a2c1b7b1`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-PIVOT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._