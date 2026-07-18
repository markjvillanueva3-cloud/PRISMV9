# QUOTING/U-MKTPRICE01-DOCS — [MAIN-FORCE] [QUOTING]/U-MKTPRICE01-DOCS (slot:charlie): wiki lesson + OPEN-THREADS follow-up for the cost-basis leak closure

**Commit:** `4007738fdf57` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T20:04:10-05:00
**Tags:** quoting, u-mktprice01-docs, auto-distilled

## Subject
[MAIN-FORCE] [QUOTING]/U-MKTPRICE01-DOCS (slot:charlie): wiki lesson + OPEN-THREADS follow-up for the cost-basis leak closure

## Body
```
[MAIN-FORCE] [QUOTING]/U-MKTPRICE01-DOCS (slot:charlie): wiki lesson + OPEN-THREADS follow-up for the cost-basis leak closure

Companion to 07b7de59ef (U-MKTPRICE01). Wiki lesson knowledge/wiki/lessons/
quoting-cost-basis-generic-dispatch-leak.md documents the pre-existing P0
(generic /quoting forwarded any {action} under only optionalToken -> cost basis
reachable unauthenticated) + the deny-by-default fix + 5 lessons (optionalToken
!= verifyToken; generic {action} passthrough is an auth hole; deny-vs-allow by
caller shape; client must catch ApiError not just unwrap; match engine nullable
contract). OPEN-THREADS T-MKTPRICE-FOLLOWUP logs the 3-reviewer-flagged residual
cost-side actions (closed_loop_provenance_check / quoting_shop_*_cost /
jm_die_financial_baseline) for a follow-up deny-list sweep.
```

## Files touched (3)
- .../quoting-cost-basis-generic-dispatch-leak.md    | 79 ++++++++++++++++++++++
- mcp-server/src/engines/quoting/OPEN-THREADS.md     | 19 ++++++
- 2 files changed, 98 insertions(+)

## Lessons surfaced in commit body
- lesson + OPEN-THREADS follow-up for the cost-basis leak closure
- lesson knowledge/wiki/lessons/
- lessons (optionalToken

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4007738fdf57`
- Milestone envelope: `mcp-server/data/milestones/QUOTING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._