# SFC-JM-PROVEN/U-SFC-FIELD-MISMATCH-LESSON — [MAIN-FORCE] [SFC-JM-PROVEN]/U-SFC-FIELD-MISMATCH-LESSON (slot:oscar): synthesized wiki lesson -- a field-name mismatch silently drops every user input across a frontend-backend chain

**Commit:** `1f712df497c4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T23:27:19-05:00
**Tags:** sfc-jm-proven, u-sfc-field-mismatch-lesson, auto-distilled

## Subject
[MAIN-FORCE] [SFC-JM-PROVEN]/U-SFC-FIELD-MISMATCH-LESSON (slot:oscar): synthesized wiki lesson -- a field-name mismatch silently drops every user input across a frontend-backend chain

## Body
```
[MAIN-FORCE] [SFC-JM-PROVEN]/U-SFC-FIELD-MISMATCH-LESSON (slot:oscar): synthesized wiki lesson -- a field-name mismatch silently drops every user input across a frontend-backend chain

The integration-bug class hit 3x this session (depth/width, machine-limits, optimize_for wiring):
a page collects an input, the backend reads it under a different key, nothing maps the two -> the
input is silently dropped, the engine uses a default, every downstream number is wrong, no test fails.
Rules: verify field names across the WHOLE chain; add a test that a NON-DEFAULT input changes the
output; make the page->request mapping a pure exported helper; a .passthrough() schema collapses the
drop surface to two points. Satisfies the bug-finding->wiki gate for the depth/width finding with real
synthesis. Sibling (modeling): [[extracted-value-without-unit-label-is-a-scale-bomb]].
```

## Files touched (2)
- knowledge/wiki/lessons/frontend-field-name-mismatch-silently-drops-inputs.md | 53 +++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 53 insertions(+)

## Lessons surfaced in commit body
- LESSON (slot:oscar): synthesized wiki lesson -- a field-name mismatch silently drops every user input across a frontend-backend chain
- wrong, no test fails.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1f712df497c4`
- Milestone envelope: `mcp-server/data/milestones/SFC-JM-PROVEN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._