# QUOTING-SYNERGY-MS0/U-QP-FRONTEND-TEST-REPAIR — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-FRONTEND-TEST-REPAIR (slot:charlie): fix quote-pages packet white-screen on degraded history + correct stale mock to real InstantQuoteHistory contract

**Commit:** `8258918f785b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T13:47:19-05:00
**Tags:** quoting-synergy-ms0, u-qp-frontend-test-repair, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-FRONTEND-TEST-REPAIR (slot:charlie): fix quote-pages packet white-screen on degraded history + correct stale mock to real InstantQuoteHistory contract

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-FRONTEND-TEST-REPAIR (slot:charlie): fix quote-pages packet white-screen on degraded history + correct stale mock to real InstantQuoteHistory contract

Root cause: the "Generated pricing packet" view crashed at QuoteBuilderPage.tsx:2115
with "Cannot read properties of undefined (reading 'length')". The quoteHistory test
mock returned a FLAT ARRAY [{id,status}] but the declared contract InstantQuoteHistory
(web/src/api/types.ts:840) is a rich object {revisions[], status_history[], current_*}.
The component reads .revisions.length / .status_history.length off that shape; the array
mock made .revisions undefined -> render threw -> panel never mounted -> test failed at
getByText('Generated pricing packet'). The crash was masked until 62b114cb7b added the
ResizeObserver polyfill that let chart-rendering quote pages mount in jsdom.

Fix (R9 test correctness + R13 component hardening):
- Test: corrected the quoteHistory mock to a valid InstantQuoteHistory object; replaced the
  stale `Q-200-R1 (draft)` assertion (targeted a revision-row render that no longer exists)
  with a real assertion on the rendered "N revision(s) / M status change(s)" summary.
- Component: null-guard .revisions?.length ?? 0 and .status_history?.length so a degraded/
  partial backend history response degrades gracefully instead of white-screening the entire
  quote (runtime backend data can violate compile-time types -- same class as the hotel
  QuoteAnalyticsPage .length bug). Added a failure-mode test feeding a partial history object.

13/13 quote-pages tests pass (was 12, +1 degraded-shape failure-mode test); web tsc --noEmit
clean. Closes charlie's share of the 10 ResizeObserver-unmasked frontend fails; the remaining
9 (QuoteAnalyticsPage + JMDieFleetScanStatusPanel) are hotel-owned.
```

## Files touched (3)
- mcp-server/web/src/__tests__/quote-pages.test.tsx | 50 +++++++++++++++++++++++++++++++++++++++++++++-----
- mcp-server/web/src/pages/QuoteBuilderPage.tsx     |  4 ++--
- 2 files changed, 47 insertions(+), 7 deletions(-)

## Lessons surfaced in commit body
- til 62b114cb7b added the

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8258918f785b`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._