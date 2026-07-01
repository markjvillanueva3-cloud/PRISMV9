# SYSTEM-VIZ/U-SV-NODE-PATH-TEMPLATE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SYSTEM-VIZ]/U-SV-NODE-PATH-TEMPLATE (slot:sierra): defer nav-savings credit until banner emits (scrutiny arm-C P2)

**Commit:** `5943f8a7f4bd` · **By:** markjvillanueva3-cloud · **At:** 2026-06-03T08:09:10-05:00
**Tags:** system-viz, u-sv-node-path-template, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SYSTEM-VIZ]/U-SV-NODE-PATH-TEMPLATE (slot:sierra): defer nav-savings credit until banner emits (scrutiny arm-C P2)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SYSTEM-VIZ]/U-SV-NODE-PATH-TEMPLATE (slot:sierra): defer nav-savings credit until banner emits (scrutiny arm-C P2)

pre-bash: recordNavHit was called before the dedup block, over-crediting ~300 tokens on a within-session repeated command whose banner is suppressed. Now compute navHit, then record only when emittedBanner (not deduped) -> credit == real saved search. 21/21 tests.
```

## Files touched (2)
- .claude/hooks/pre-bash-graph-inject.mjs | 21 ++++++++++++++++-----
- 1 file changed, 16 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- til banner emits (scrutiny arm-C P2)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5943f8a7f4bd`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._