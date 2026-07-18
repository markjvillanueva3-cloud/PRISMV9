# SFC-FRONTEND/U-SFC-FE-UNIT-TOGGLE-TEST — [MAIN-FORCE] [SFC-FRONTEND]/U-SFC-FE-UNIT-TOGGLE-TEST (slot:oscar): fix over-strict tool-diameter query in inch/metric test

**Commit:** `4cc78761ac81` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T20:52:49-05:00
**Tags:** sfc-frontend, u-sfc-fe-unit-toggle-test, auto-distilled

## Subject
[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-FE-UNIT-TOGGLE-TEST (slot:oscar): fix over-strict tool-diameter query in inch/metric test

## Body
```
[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-FE-UNIT-TOGGLE-TEST (slot:oscar): fix over-strict tool-diameter query in inch/metric test

The setup + formula/library both expose a 'tool diameter' accessible name, so the
singular getByLabelText threw 'Found multiple'. Capture ALL tool-diameter inputs and
assert the unit switch reconverts at least one value -- intent ('switching units
reconverts the displayed diameter') preserved, and the test still FAILS if the component
stops reconverting (verified green = the component genuinely reconverts). TEST-ONLY.
CalculatorPage.test.tsx now 20 pass / 4 fail.
```

## Files touched (2)
- mcp-server/web/src/__tests__/CalculatorPage.test.tsx | 34 +++++++++++++++++++++++++---------
- 1 file changed, 25 insertions(+), 9 deletions(-)

## Lessons surfaced in commit body
- till FAILS if the component

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4cc78761ac81`
- Milestone envelope: `mcp-server/data/milestones/SFC-FRONTEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._