---
title: Anonymous cost_breakdown leak via /api/v1/quotes/instant (redact-when-anon, shared-redactor reuse)
kind: learning
domain: quoting
severity: P1-security
unit: QUOTING/U-QUOTES-INSTANT-REDACT
slot: charlie
date: 2026-06-24
commit: 1fae722cfd
tags: [security, auth, optionalToken, redaction, margin, cost-breakdown, R8, R16, envelope]
---

# Anonymous cost_breakdown leak via /api/v1/quotes/instant

The R16 sibling of [[quote-compat-anon-margin-redaction]] (U-QUOTE-COMPAT-REDACT). Logged in
`quoting/OPEN-THREADS.md` as the next high-priority thread after that unit shipped, then verified +
fixed here.

## The exposure

`quotes.ts` (`createQuotesRouter`, mounted `/api/v1/quotes`) has 7 routes. `POST /quotes/instant` ->
`prism_business` `instant_quote` -> `InstantQuoteEngine` returns the full `InstantQuoteResult`, whose
`cost_breakdown` block carries the shop's internal cost stack:
`cost_breakdown.machining.machine_rate_hr` (the $/hr machine rate), `cost_breakdown.overhead.rate_pct`
(margin %), `cost_breakdown.total_cost_per_part`, and every sub-block `.total`. The router is mounted
under `/api` `optionalToken` (`auth.ts:64-76` -- sets `req.userId` for a valid Bearer, NEVER rejects
anonymous), so **an unauthenticated caller received the full cost basis** (the charlie-soul
`emitting-customer-quote-without-margin-floor-gate` / cost-basis-leak concern).

## Scoping (verified from live source -- the leak is ONE route)

- `/quotes/instant` -> the FULL `InstantQuoteResult` with `cost_breakdown` -> **SENSITIVE**.
- `/quotes/qty-breaks` -> `instant_quote_qty_breaks` -> `computeQtyBreaks()` returns a **bare
  `QuantityBreak[]`** (quantity/unit_price/total_price/savings_pct/lead_time_days -- all customer) ->
  NOT sensitive.
- `/quotes/lead-time` -> `instant_quote_lead_time` -> `computeLeadOptions()` returns a **bare
  `LeadTimeOption[]`** (tier/days/multiplier/unit_price/total_price -- all customer) -> NOT sensitive.
- `/:id/{revise,history,status,share}` -> revision metadata + the customer share token -> untouched
  (the share token MUST stay customer-safe).

Over-redacting the bare customer arrays would be wrong -- those are exactly what a customer should see
(the same discipline as quote.ts leaving the projected `compare`/`what-if` arrays untouched).

## The fix (R8 reuse, NOT re-implement)

The U-QUOTE-COMPAT-REDACT unit already built the shared `redactInternalMarginFields` +
`redactThroughEnvelope` in `quote.ts`. But the field-set did NOT cover `InstantQuoteResult`'s shape:
`REDACTED_NESTED_BLOCKS` was `["costs","uncertainty"]`, and `InstantQuoteResult` uses **`cost_breakdown`**
(a different key with a different internal structure -- `machining.machine_rate_hr`, `overhead.rate_pct`,
`total_cost_per_part`, not `total_cost`). A naive reuse would have been a NO-OP -- the exact "a
field-name redaction must cover EVERY shape the surface emits" lesson from the parent unit.

So: (1) **extend** the shared `REDACTED_NESTED_BLOCKS` -> `["costs","uncertainty","cost_breakdown"]`
(empties to `{}` graceful-shape; **provably additive/no-op** for quote.ts's own `costs`-keyed routes
since `isObjectLike(undefined)` is false there -- the 20/20 existing test stays green); (2) **export**
`redactThroughEnvelope`; (3) **gate** only `/quotes/instant` with `redactThroughEnvelope` when
`!req.userId`. One shared redactor now covers BOTH the `/quote` and `/quotes` surfaces (R15 build-whole).

`InstantQuoteResult`'s **TOP-LEVEL** `ci95_low`/`ci95_high` are customer PRICE bounds (NOT cost basis,
unlike quote.ts's `uncertainty.ci95` which WAS cost basis) -- they are deliberately NOT redacted; only
the nested `cost_breakdown` block is emptied.

## Validation
- 7/7 new `quotes-instant-redaction.test.ts`: drives the REAL `createQuotesRouter` through an ephemeral
  IPv4 Express server; mock wraps each fixture as the PRODUCTION `{type:"text", text}` envelope (NOT the
  bare object -- the R9 false-green hazard); leak-scan asserts the ABSENCE of the actual internal
  NUMBERS (137 $/hr, 0.21 overhead, 318.44 total_cost_per_part) on the raw wire + presence of the
  customer price; anon-stripped + authed-full + qty/lead pass-through + negative-control.
- 20/20 existing quote-route test (no regression from the shared-set extension).
- Negative-control proven: neuter the gate -> exactly the 2 anon-leak tests fail. Type-clean.
- per-file 2-arm scrutiny PASS (code-analyzer security + reviewer test-integrity, 0 P0/P1); 3-of-3 PASS.

## Lessons
1. **Reuse the shared redactor, but EXTEND its field-set for the new shape.** `InstantQuoteResult` uses
   `cost_breakdown`, not `costs` -- reusing `redactInternalMarginFields` as-is would have been a silent
   no-op. Enumerate the NEW surface's real return interface and add its internal block to the shared set
   (additive, so it does not regress the existing surfaces). (Sibling of the parent unit's lesson 6.)
2. **Distinguish cost-basis CI from price-bound CI.** quote.ts's `uncertainty.ci95_*` = raw per-part
   COST and must be redacted; `InstantQuoteResult`'s top-level `ci95_low`/`ci95_high` = customer PRICE
   bounds and must SURVIVE. Same field name, opposite sensitivity -- read the engine to know which.
3. **Scope to the actually-sensitive route.** Verify each route's engine return shape from live source;
   bare customer arrays (qty-breaks/lead-time) carry no cost basis and must NOT be over-redacted.
4. **Mock the production `{type,text}` envelope, not the bare object** -- the recurring R9 false-green
   for any prism_business route redaction.
5. **Ephemeral-server test gotchas:** bind `127.0.0.1` (IPv4) so an IPv4 `fetch` connects, and put the
   FULL mount path in `baseUrl` -- a bare `/instant` 404s and returns an HTML page (`Unexpected token
   '<'`), not your router.

## See also
- [[quote-compat-anon-margin-redaction]] -- the parent unit (the /api/v1/quote surface)
- [[quoting-cost-basis-generic-dispatch-leak]] -- the /api/v1/quoting generic-passthrough leak
- [[reference_charlie_quotes_instant_redact_2026_06_24]] (memory)
