# ZULU-BUILDLOOP/U-ZBL-PARSESHIPPED-PROSE-FIX — [MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-PARSESHIPPED-PROSE-FIX (slot:zulu): parseShipped miscounted an inline-prose unit id as shipped -> loop DRAINED early

**Commit:** `775a0f828745` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T20:24:13-05:00
**Tags:** zulu-buildloop, u-zbl-parseshipped-prose-fix, auto-distilled

## Subject
[MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-PARSESHIPPED-PROSE-FIX (slot:zulu): parseShipped miscounted an inline-prose unit id as shipped -> loop DRAINED early

## Body
```
[MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-PARSESHIPPED-PROSE-FIX (slot:zulu): parseShipped miscounted an inline-prose unit id as shipped -> loop DRAINED early

Surfaced live building C8: after committing C7, the bravo brief's C7 bullet
described over_claim as "the C8 signal". parseShipped (scripts/lib/zulu-build-
queue.mjs) matched /\bC(\d+)\b/g ANYWHERE in the SHIPPED slice, so that prose
"C8" + a summary line "C5+C6+C7+C8 build-complete" falsely marked C8 done ->
the loop reported DRAINED done=8 while C8 was NOT built (a silent over-count
that would have skipped the final unit). The docstring even CLAIMED "a candidate
merely mentioned is never miscounted" -- true only for the REMAINING section
(section-slice guard), NOT for prose inside a SHIPPED bullet.

fix: count C<n> only at a BULLET-HEADER position -- /(?:^|\n)\s*[-*]\s+\*{0,2}C(\d+)\b/g
(a "-"/"*" bullet + optional "**" bold + C<n> at line start). Inline prose
mentions ("the C8 signal", "refs C5+C6+C7") are excluded; the established brief
convention (- **C8 EngineName**) still matches. Live brief re-parses to the same
honest done=8 (all 8 are real bullet headers). +1 regression test pinning the
exact 'C8 signal' miscount; 12/12 zulu-build-queue tests pass.

Lesson: a token-anywhere regex over human prose silently over-counts; anchor
unit-id extraction to a structural position (bullet header), never free text.
```

## Files touched (3)
- scripts/lib/zulu-build-queue.mjs      | 14 +++++++++++---
- scripts/lib/zulu-build-queue.test.mjs | 18 ++++++++++++++++++
- 2 files changed, 29 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- till matches. Live brief re-parses to the same
- Lesson: a token-anywhere regex over human prose silently over-counts; anchor

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 775a0f828745`
- Milestone envelope: `mcp-server/data/milestones/ZULU-BUILDLOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._