# QUOTING-SYNERGY-MS0/U-QP-MARGIN-FLOOR-FRONTEND — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-MARGIN-FLOOR-FRONTEND (slot:charlie): surface below_margin_floor on the QuoteBuilder estimate panel

**Commit:** `87d5c4bf9ae6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T11:17:29-05:00
**Tags:** quoting-synergy-ms0, u-qp-margin-floor-frontend, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-MARGIN-FLOOR-FRONTEND (slot:charlie): surface below_margin_floor on the QuoteBuilder estimate panel

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-MARGIN-FLOOR-FRONTEND (slot:charlie): surface below_margin_floor on the QuoteBuilder estimate panel

Completes the margin-floor gate's R15 chain (engine gate -> dispatcher
round-trip -> frontend). The flag was computed + proven to reach the API
(U-QP-MARGIN-FLOOR-DISPATCHER-RT) but the UI dropped it: the frontend
QuoteEstimate type declared neither pricing nor dfm_warnings, so the
money-losing-quote signal was invisible to whoever reads the quote.

- web/src/api/types.ts: QuoteEstimate gains an optional pricing block
  ({margin_pct, below_margin_floor, margin_floor_pct}) -- additive, matches the
  verbatim quote_estimate result; existing flat fields untouched.
- web/src/pages/QuoteBuilderPage.tsx: a prominent amber role="alert" banner in
  the Cost-breakdown panel (beside the Margin tile) when pricing.below_margin_floor,
  citing eroded margin % + floor % + "review before sending". Page amber-warning
  Tailwind idiom, a11y role, mobile-safe.
- QuoteBuilderPage.test.tsx: +2 R9 tests -- below-floor raises the alert citing
  real margin (11.3%) + floor (20%); above-floor (38%) does NOT.

6/6 web tests green; tsc --noEmit clean on both edited files. Charlie soul #1
(emitting-customer-quote-without-margin-floor-gate) now visible end-to-end.
```

## Files touched (4)
- mcp-server/web/src/__tests__/QuoteBuilderPage.test.tsx | 60 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/api/types.ts                        | 12 ++++++++++++
- mcp-server/web/src/pages/QuoteBuilderPage.tsx          | 13 +++++++++++++
- 3 files changed, 85 insertions(+)

## Lessons surfaced in commit body
- tile) when pricing.below_margin_floor,

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 87d5c4bf9ae6`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._