# HOTEL/U-AMORT-RECURRING — [MAIN] [HOTEL]/U-AMORT-RECURRING (slot:hotel iter12) [BOOTSTRAP-SLOT-ENFORCE]: G8 close-out — amortization + depreciation + recurring expenses (utilities/subscriptions/insurance/lease)

**Commit:** `e5d4c2e176b4` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T15:41:10-05:00
**Tags:** hotel, u-amort-recurring, auto-distilled

## Subject
[MAIN] [HOTEL]/U-AMORT-RECURRING (slot:hotel iter12) [BOOTSTRAP-SLOT-ENFORCE]: G8 close-out — amortization + depreciation + recurring expenses (utilities/subscriptions/insurance/lease)

## Body
```
[MAIN] [HOTEL]/U-AMORT-RECURRING (slot:hotel iter12) [BOOTSTRAP-SLOT-ENFORCE]: G8 close-out — amortization + depreciation + recurring expenses (utilities/subscriptions/insurance/lease)

NEW ALGORITHM: AmortizationScheduleFormula.ts (3 surfaces)
- fixedPayment(P, r, n) — closed-form PMT = P·r/(1−(1+r)^−n); reduces to P/n at r=0
- amortizationSchedule(P, r_annual, n, periods_per_year) — period-by-period breakdown
- straightLineDepreciation(cost, salvage, life) — FASB ASC 360 SL with final-residue absorption
Hotel-soul: financial-invariant gate throws on principal-sum imbalance > \$0.01.
Reference: Brigham & Houston "Fundamentals of Financial Management" 15e §5.3.
Tests: 32/32 PASS — canonical \$100k/30y/6% PMT=\$599.55, \$200k/15y/4% PMT=\$1479.38, ledger-balanced rows, monotonic interest/principal curves, R12 fail-loud (NaN/Infinity/negative/non-integer rejected with descriptive errors).

NEW ENGINE: RecurringExpenseEngine.ts (G8 — utilities · subscriptions · insurance · lease · service · membership · other)
- CRUD: create / get / list (active/category filters) / updateAmount / deactivate / __resetForTests
- monthlyBurden() with by_category bucket aggregation + hotel-soul ledger gate (sum(categories) == total_monthly within \$0.01)
- forecastDueDates(id, lookahead) — deterministic, end-of-month clamping (Jan-31 monthly → Feb-28/29), end_date cutoff respected
- PII redaction: SSN (XXX-XX-XXXX) and 13-19-digit card numbers auto-redacted on memo store
- R12 fail-loud: empty/oversize strings, unknown category/frequency, malformed ISO dates, non-positive amounts
- Defensive copy on every public read (internal Map state never escapes by reference)
Tests: 32/32 PASS — vendor REXP-NNNNNN id format, mixed-frequency normalization (\$1250mo + \$4800qtr + \$2400yr → \$3349.95mo), PII redaction verified, end-of-month clamp + end_date cutoff, deterministic id-ASC list order.

DISPATCHER WIRING: businessDispatcher.ts (+10 actions in ACTIONS enum + 10 case handlers)
- amortization_{payment, schedule, straight_line}
- recurring_expense_{create, get, list, update_amount, deactivate, monthly_burden, forecast}
Lazy-import pattern per dispatcher convention; flat-param + camelCase boundary preserved.

PHONE-APP/PWA WIRING: prismBusiness.ts (+10 typed REST wrappers) + BusinessSuitePage.tsx (3 new GlowBox sub-cards in Accounting tab)
- AmortizationCard — cyan glow, principal/rate/periods inputs, displays payment + total_paid + total_interest
- DepreciationCard — violet glow, cost/salvage/life inputs, displays annual depreciation
- RecurringExpensesCard — emerald glow, full CRUD over recurring charges with live monthly-burden ledger summary (\$X/mo · N active) + normalized \$/mo column in the table + per-row deactivate (×) button
- GlowBox extended with optional className prop (back-compat default '')
Calculator-Studio dark-HUD aesthetic preserved per web/CLAUDE.md (no soft-pastel SaaS).

PSN synergy:
- Algorithms leg: AmortizationScheduleFormula registers as canonical financial-math primitive
- Engines leg: RecurringExpenseEngine extends business/ERP engine cohort
- Wiki leg: doctrine + reference values land in commit body for future query
- System Viz leg: dispatcher_action_count + 7 new engine surfaces (next snapshot regen will pick up)
- PRISM AI leg: amortization/depreciation now queryable via prism_business dispatcher for cross-domain reasoning

Tests: 230/230 across 7 hotel iter1-12 test suites — zero regressions.

Closes G8 from the 13-gap ERP-comparison audit. Remaining: G2-G7, G10-G13 (multi-day full GL/AP-invoice-automation is the only multi-day item; the rest are <1d each).
```

## Files touched (8)
- .../__tests__/AmortizationScheduleFormula.test.ts  | 247 +++++++++++++++
- .../src/__tests__/RecurringExpenseEngine.test.ts   | 295 ++++++++++++++++++
- .../src/algorithms/AmortizationScheduleFormula.ts  | 217 +++++++++++++
- mcp-server/src/engines/RecurringExpenseEngine.ts   | 340 +++++++++++++++++++++
- .../src/tools/dispatchers/businessDispatcher.ts    |  74 +++++
- mcp-server/web/src/api/prismBusiness.ts            | 101 ++++++
- mcp-server/web/src/pages/BusinessSuitePage.tsx     | 203 +++++++++++-
- 7 files changed, 1475 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- tilities/subscriptions/insurance/lease)
- tilities · subscriptions · insurance · lease · service · membership · other)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e5d4c2e176b4`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._