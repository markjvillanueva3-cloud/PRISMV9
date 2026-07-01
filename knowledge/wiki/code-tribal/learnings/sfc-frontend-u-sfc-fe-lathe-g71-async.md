# SFC-FRONTEND/U-SFC-FE-LATHE-G71-ASYNC — [MAIN-FORCE] [SFC-FRONTEND]/U-SFC-FE-LATHE-G71-ASYNC (slot:oscar): fix manual-lathe G71 test async-timing

**Commit:** `06c187cc9f05` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T21:23:41-05:00
**Tags:** sfc-frontend, u-sfc-fe-lathe-g71-async, auto-distilled

## Subject
[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-FE-LATHE-G71-ASYNC (slot:oscar): fix manual-lathe G71 test async-timing

## Body
```
[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-FE-LATHE-G71-ASYNC (slot:oscar): fix manual-lathe G71 test async-timing

Lathe mode reloads the programming-package list asynchronously; the test changed the
package select to 'manual-lathe' on the same tick as the lathe-mode click, before the
option loaded -> fireEvent.change no-op'd (no matching option) -> G71 toolpaths never
rendered. Fix: findByRole-wait for the 'Manual Programming' option, assert its value is
'manual-lathe', THEN select it; assert the G71 button text. Strengthened from toBeDefined
to value/text assertions (test-legitimacy gate). Proves the manual-lathe feature genuinely
works -- it was a test-timing bug, not a component gap. TEST-ONLY. File now 21 pass / 3 fail.
```

## Files touched (2)
- mcp-server/web/src/__tests__/CalculatorPage.test.tsx | 20 +++++++++++++-------
- 1 file changed, 13 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 06c187cc9f05`
- Milestone envelope: `mcp-server/data/milestones/SFC-FRONTEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._