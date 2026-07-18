---
title: Anonymous margin/cost leak via the /api/v1/quote compat router (redact-when-anon fix)
kind: lesson
domain: quoting
severity: P1-security
unit: QUOTING/U-QUOTE-COMPAT-REDACT
slot: charlie
date: 2026-06-24
status: built
tags: [security, auth, optionalToken, redaction, margin, R7, R12, R16]
---

# Anonymous margin/cost leak via the /api/v1/quote compat router

## The exposure (caught auditing the OPEN-THREADS `quote.ts` adjacent thread)

`quote.ts` (`createQuoteRouter`, mounted `/api/v1/quote`) is a FIXED table of ~30 NAMED routes, each
hardcoded to one `prism_business` action via `quotePost`/`quoteGet`. It is mounted under `/api`, whose
only auth is `optionalToken` (`middleware/auth.ts:64-76`) -- which attaches `req.userId` if a valid Bearer
is present but **never rejects anonymous**. So every route is reachable unauthenticated.

Two of those routes return `QuoteEstimatorEngine.estimate`'s FULL `QuoteEstimateResult`:
- `POST /quote/generate` -> `quoting_generate`
- `POST /quote/estimate` -> `quote_estimate`

`QuoteEstimateResult` (`QuoteEstimatorEngine.ts:124-202`) carries the shop's internal cost/margin stack:
`costs.machining.machine_rate_hr` (the shop $/hr rate), `costs.overhead.rate_pct`, `costs.total_cost`,
`pricing.margin_pct`. **An anonymous caller got all of it.**

**The OPEN-THREADS thread named the WRONG actions.** It flagged `material_price_lookup`/`material_surcharge`
as the suspect -- but those route to `MarketMaterialPricingEngine`, which returns PUBLIC commodity-market
prices (LME/COMEX/CRU 2024-Q4 baseline, `:28-167`), NOT internal cost basis. The genuinely sensitive routes
were the quote-BUILDERs. The other three quote routes are also NOT sensitive (verified return shapes):
`quoting_price_breaks` -> `.price_breaks` array (`:230`), `quote_compare_materials` -> projected array (`:513`),
`quote_what_if` -> projected array (`:532`).

## Why it is NOT a quiet deny (R7 conflict)

Unlike the `/api/v1/quoting` generic-passthrough leak (U-MKTPRICE01/02, fixed with a deny-set), this is a
fixed named-route table -- the route table IS the action whitelist, so there is no generic `{action}` to deny.
And the anonymous reachability is a **deliberately-shipped, test-locked compat contract**:
`quote-compat-routes.test.ts:101-123` asserts anon `/quote/generate` -> 200 (the router header: exists so
"current web desks can converge on the live backend without a broad client rewrite"). The FE client attaches a
Bearer ONLY when `setApiKey()` ran (`client.ts:43-57`, default `apiKey=null`), so a blunt `verifyToken` would
**401 a shipped page**. An authenticated duplicate already exists (`erp.ts:79` `/api/v1/erp/quote/generate`
behind `verifyToken`).

## The fix (Approach A -- redact-when-anon, backend-only, no page breakage)

`redactInternalMarginFields(result)` strips the internal stack from the two sensitive routes' results WHEN the
request is unauthenticated (`!req.userId` -- the exact branch `optionalToken` sets). `quotePost(callTool,
action, sensitive=true)` flags only `/generate` + `/estimate`. The customer-facing PRICE
(`pricing.unit_price`/`total_price`/`adjustments`) + `lead_time` are PRESERVED; authenticated callers and the
`erp.ts` authed path are UNCHANGED; the 3 projected-array + 3 material-price routes are untouched. Redaction
NEVER changes the emitted price or the margin-floor gate.

## The decisive scrutiny catch (per-file arm B P1) -- graceful-shape over delete

The first cut `delete`d the entire `costs` object. But the FE consumer `adaptQuoteEstimate` (`client.ts`)
hard-gates `if (!e.costs || !e.pricing) return null`, and `QuoteBuilderPage.tsx:1397` throws
`new ApiError(502, ...)` on null -> the **whole estimate tab would 502 for a token-less viewer**. Arm B traced
this end-to-end (the diff had not updated the consumer). The fix: keep `costs` a truthy `{}` (NOT deleted) so
`!e.costs` passes and the FE's `num(undefined) -> 0` renders a benign $0 breakdown -- no real cost/rate/margin
VALUE leaks -- instead of crashing. The page is an authenticated employee tool (`AuthContext` sets the Bearer
post-login), so the anon path is an edge case; a proper "sign in to see the cost breakdown" UX is a quebec
frontend follow-up (logged in OPEN-THREADS).

## Lessons

1. **An OPEN-THREADS thread can name the WRONG actions.** Verify each action's RETURN SHAPE from live source
   before scoping a security unit -- do not trust the thread's action list. Here, verifying narrowed the
   sensitive set from 4 routes to 2 and flipped the suspect entirely (the named material-price routes were the
   LEAST sensitive; the unnamed quote-builders were the leak). (R16 gap-closing.)
2. **A redaction that DELETEs a field the FE consumer hard-gates on is a 502, not a fix.** Grep EVERY consumer
   of the redacted shape (`adaptQuoteEstimate`'s `!e.costs` guard); prefer a graceful empty-`{}` over `delete`
   when the consumer guards on presence. (Sibling of [[feedback_audit_consumers_when_moving_logic_into_engine]].)
3. **`optionalToken` is a PUBLIC surface.** A route under `optionalToken` is reachable by anon; if it returns
   internal data, an in-handler `redact-when-!req.userId` is the no-page-breakage fix when a blunt
   `verifyToken` would 401 a test-locked compat contract. (`optionalToken != verifyToken`, same root as
   [[quoting-cost-basis-generic-dispatch-leak]].)

## 3-of-3 expansion -- the scope was too narrow (commit b3cad3b84e)

The initial 2-route cut PASSED per-file scrutiny but the holistic **3-of-3 gate FAILED it on 3 gaps** --
the gap-closing loop working as designed. All verified from live source and fixed:

1. **P0 (arm A): the redaction was a NO-OP in production.** `prism_business` returns a SLIMMED MCP text
   envelope `{type:"text", text: JSON.stringify(result)}` (`businessDispatcher.ts:7788` slimResponse, no
   `content[]`). Production `callTool` (`index.ts:1397-1399`) reads `result?.content?.[0]?.text` -> `undefined`
   -> returns the RAW `{type,text}`. So `redactInternalMarginFields` saw no costs/pricing keys -> passed the
   full stack through inside `text`. **The same envelope class already fixed on the FE
   ([[reference_charlie_estimate_flow_envelope_nested_fix_2026_06_23]]), re-introduced on the backend.** FIX:
   `redactThroughEnvelope` parses `text` -> redacts -> re-wraps. The test mocked the BARE object, hiding the
   leak (a false-green); fixed to mock the production envelope + scan the real wire (`rawResult`).
2. **P1 (arm B): the `uncertainty` block leaked** (`estimated_cost`/`ci95_low`/`ci95_high` = raw per-part cost
   basis, `QuoteEstimatorEngine.ts:215`). FIX: `uncertainty` added to the emptied nested blocks.
3. **P1 (arm C): 3 sibling routes** (`/injection-mold` FLAT, `/sheet-metal` + `/additive` nested) leaked the
   same stack unflagged. FIX: all 3 flagged + a FLAT-key deletion path added (the helper was nested-only).

**Final: 5 sensitive routes, both nested+flat shapes, envelope-aware.** 20/20 test (production-envelope mock +
real-wire leak-scan + negative-control teeth), 3-of-3 PASS.

**Lessons 4-6:**
4. **A per-file scrutiny PASS is NOT a 3-of-3 PASS.** The holistic gate sees cross-route completeness +
   production wiring the per-file pass (one file at a time) structurally cannot. Run BOTH.
5. **When you fixed an envelope bug on one consumer, grep EVERY sibling consumer.** A test mock that returns
   the convenient BARE shape (vs the real `{type,text}` envelope) is the false-green that hides it.
6. **A field-name redaction must cover EVERY shape the surface emits** -- nested-`costs`-only missed the FLAT
   injection-mold shape AND the separate `uncertainty` block. Enumerate every route's real return interface.

## See also
- [[quoting-cost-basis-generic-dispatch-leak]] -- the /api/v1/quoting generic-passthrough leak (U-MKTPRICE01/02)
- [[reference_charlie_estimate_flow_envelope_nested_fix_2026_06_23]] -- the SAME {type,text} envelope class
- [[reference_charlie_quote_compat_redact_2026_06_24]] (memory)
