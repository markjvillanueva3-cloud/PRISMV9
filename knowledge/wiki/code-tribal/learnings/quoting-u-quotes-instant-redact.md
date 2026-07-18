# QUOTING/U-QUOTES-INSTANT-REDACT — [MAIN-FORCE] [QUOTING]/U-QUOTES-INSTANT-REDACT (slot:charlie): redact internal cost_breakdown from anon /api/v1/quotes/instant (R16 sibling of U-QUOTE-COMPAT-REDACT)

**Commit:** `1fae722cfd76` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T09:10:02-05:00
**Tags:** quoting, u-quotes-instant-redact, auto-distilled

## Subject
[MAIN-FORCE] [QUOTING]/U-QUOTES-INSTANT-REDACT (slot:charlie): redact internal cost_breakdown from anon /api/v1/quotes/instant (R16 sibling of U-QUOTE-COMPAT-REDACT)

## Body
```
[MAIN-FORCE] [QUOTING]/U-QUOTES-INSTANT-REDACT (slot:charlie): redact internal cost_breakdown from anon /api/v1/quotes/instant (R16 sibling of U-QUOTE-COMPAT-REDACT)

quotes.ts /api/v1/quotes/instant -> prism_business instant_quote -> InstantQuoteEngine
returns InstantQuoteResult.cost_breakdown -- the shop's internal stack
(machining.machine_rate_hr = $/hr rate, overhead.rate_pct = margin %,
total_cost_per_part, every sub-block .total). The router is mounted under /api
optionalToken (anon-reachable, never rejects), so an UNAUTHENTICATED caller got the
full cost basis.

FIX (R8 reuse, not re-impl): (1) extend the SHARED redactInternalMarginFields in
quote.ts -- add cost_breakdown to REDACTED_NESTED_BLOCKS (empties to {} graceful-shape;
provably additive/no-op for quote.ts's own costs-keyed routes); (2) export
redactThroughEnvelope from quote.ts; (3) gate ONLY /quotes/instant with
redactThroughEnvelope when !req.userId. Customer fields PRESERVED (unit_price,
total_price, TOP-LEVEL ci95 PRICE bounds, quantity_breaks, lead_time_options, dfm,
confidence). qty-breaks/lead-time return bare customer arrays (no cost basis) -> NOT
redacted; revise/history/status/share untouched (share token stays customer-safe).

20/20 existing quote-route (no regression) + 7/7 new (production-envelope mock +
real-wire leak-scan of the actual NUMBERS + negative-control teeth + authed-full).
Type-clean, per-file 2-arm scrutiny PASS.
```

## Files touched (4)
- mcp-server/src/__tests__/quotes-instant-redaction.test.ts | 238 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/routes/quote.ts                            |  12 ++++++---
- mcp-server/src/routes/quotes.ts                           |  12 ++++++++-
- 3 files changed, 258 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1fae722cfd76`
- Milestone envelope: `mcp-server/data/milestones/QUOTING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._