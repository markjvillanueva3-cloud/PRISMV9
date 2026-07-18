---
title: Quoting estimate-flow dead path -- content envelope + nested-vs-flat double mismatch
type: lesson
tags: [quoting, frontend, contract, mcp-content-envelope, R9, R12, dead-panel]
slot: charlie
date: 2026-06-23
commit: 17b445e69c
related: [quoting-fe-dead-panel-bare-body, read-full-content-not-titles]
---

# Quoting estimate-flow dead path (envelope + nested-vs-flat)

**HIGH severity.** The entire QuoteBuilderPage estimate tab read `undefined` -- headline quote, cost
breakdown, and every downstream seed (three-view machine_hours, vendor pricing, make-vs-buy in-house
total). `formatCurrency(undefined)` THROWS, crashing the panel. Shipped with the `quote_what_if`
feature in commit `17b445e69c` (U-WHATIF01).

## Two coupled defects

1. **Unparsed MCP content envelope.** The `prism_business` dispatcher emits
   `slimResponse({type:"text", text: JSON.stringify(result)})` -- a `{type,text}` object with NO
   `content[]` wrapper (`responseSlimmer.ts` only prunes; it does not MCP-wrap). So `callTool`
   (`src/index.ts:1398`, `result?.content?.[0]?.text`) sees `undefined` and returns the raw
   `{type:"text",text}`. `sendCompatResponse` (`routes/quote.ts:44`) then wraps it as
   `{ result: {type:"text",text} }`. **Every `/quote/*` route (estimate, compare-materials, what-if)
   returns this content envelope -- NOT a bare `{result:<data>}`.** Contrast: the `/quoting` generic
   routes ARE bare, because `quotingDispatcher` emits `content:[{text}]` which `callTool` DOES parse.
   That asymmetry is the trap -- the earlier dead-panel fix (U-QT04) caught the bare `/quoting`
   panels (three-view/LVP/outsource) but missed the `/quote/*` envelope on estimate/compare.

2. **Nested engine shape vs flat page type.** `QuoteEstimatorEngine.estimate()` returns a NESTED
   `QuoteEstimateResult` (`costs.material.total`, `costs.machining.cycle_time_min`,
   `pricing.unit_price`, `pricing.total_price`, `costs.total_cost`, `confidence_score` 0-100). The
   web `QuoteEstimate` type is FLAT (`material_cost`, `total`, `unit_price`, `cycle_time_min`,
   `confidence` 0-1). NONE of the flat fields exist on the engine output.

The page read `estimateResponse.value.result as unknown as QuoteEstimate` RAW -> got the envelope ->
every flat field undefined.

## Why it survived
All 3 FE tests that mock `quoteEstimate` mocked a FLAT `{result: {material_cost, total, ...}}` --
encoding the WRONG contract. They passed while production was dead (R9: a test that mocks the
response shape certifies that shape; mock the REAL shape or it certifies a fiction).

## Fix
- `unwrapQuotingBody` (peels `.result` -> `{type:"text",text}` -> `JSON.parse`) on the estimate +
  compare reads.
- New `adaptQuoteEstimate(raw)` maps nested -> flat: `material_cost<-costs.material.total`,
  `total<-pricing.total_price`, `margin = pricing.total_price - costs.total_cost`,
  `cycle_time_min<-costs.machining.cycle_time_min`, `confidence = confidence_score/100`, price-breaks
  re-keyed `qty->quantity` + `savings_pct` derived vs the smallest-qty baseline, margin-floor gate
  passed through. Null-safe: missing `costs`/`pricing` -> null -> page throws `ApiError(502)`
  (fail-loud), panel hides.
- All 4 quoting test files corrected to the real content-envelope + nested shape (47/47).
  `quote-pages.test.tsx` converted its `vi.mock` factory to `importActual + ...actual` so the real
  helpers run. One stale `focusJobId=` assertion corrected to `focusType=quote`+`focusQuoteId=` (a
  job-less quote flow structurally cannot emit focusJobId -- live-probed).

## Lesson
A FE read of a backend route is a contract with TWO axes: the WRAPPING (bare vs `{result}` vs MCP
content envelope) AND the DATA SHAPE (flat vs nested). Verify BOTH against a LIVE probe -- never infer
the wrapping from reading `sendCompatResponse` alone, because `callTool` parsing depends on which
dispatcher emitted (`content:[{text}]` parses; bare `{type,text}` does not). Mock the REAL shape.
