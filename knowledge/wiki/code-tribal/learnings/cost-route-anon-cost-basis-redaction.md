---
title: Anonymous cost-basis leak on /api/v1/cost + /api/v1/pipeline (3-site sweep, shared-redactor extend + notes-string scrub)
kind: learning
domain: quoting
severity: P1-security
unit: QUOTING/U-COST-ROUTE-REDACT
slot: charlie
date: 2026-06-24
commit: 943bf4259a
tags: [security, auth, optionalToken, redaction, margin, cost-basis, process_cost, shop_quote, notes-string, R8, R16, envelope]
---

# Anonymous cost-basis leak on /api/v1/cost + /api/v1/pipeline

The R16 sibling of [[quote-compat-anon-margin-redaction]] (U-QUOTE-COMPAT-REDACT) and
[[quotes-instant-anon-cost-breakdown-redaction]] (U-QUOTES-INSTANT-REDACT). The completion of the
anon-cost-leak sweep across the quoting/cost HTTP surface.

## The exposure (3 sites, verified)

`routes/index.ts:140` applies `app.use("/api", optionalToken)` to the WHOLE /api surface. `optionalToken`
(`middleware/auth.ts:64-76`) attaches `req.userId` only for a valid Bearer and NEVER rejects anonymous.
A sweep of all 8 prism_business/prism_intelligence passthrough route files found THREE anon cost-basis
leaks:

1. **`POST /api/v1/cost/estimate`** (`cost.ts:244`) -> `prism_intelligence:process_cost` ->
   `IntelligenceEngine.processCost` (`IntelligenceEngine.ts:1104-1119`). PURE internal cost basis, NO
   customer price: `total_cost_per_part`, `machine_cost`, `tool_cost_per_part`, `setup_cost_per_part`,
   `breakdown` (per-op cost array), and **`inputs.machine_rate_per_hour`** (the shop $/hr rate -- the
   charlie-soul `inline-shop-rate` most-protected figure).
2. **`POST /api/v1/cost/quote`** (`cost.ts:252`) -> `prism_intelligence:shop_quote` ->
   `ProductEngine.shopQuote` (`ProductEngine.ts:1908-1934`). Customer `pricing` (unit_price/quantity/
   subtotal) is fine, BUT it leaks `cost_breakdown` (internal) AND a $/hr rate inlined into a
   customer-facing STRING: `notes[0] = "Machine: <name> at $<rate>/hr"`.
3. **`POST /api/v1/pipeline/quote`** (`pipeline.ts:125`) -> the same `process_cost` -> the identical
   PURE-cost leak as site 1.

## The fix (R8 reuse + extend + a value-in-a-string scrub)

The shared `redactInternalMarginFields` + `redactThroughEnvelope` (built in U-QUOTE-COMPAT-REDACT,
extended in U-QUOTES-INSTANT-REDACT) already covered the /quote + /quotes shapes. `process_cost` is a
FOURTH shape it did not fully cover:
- `REDACTED_FLAT_KEYS` += `total_cost_per_part`, `tool_cost_per_part`, `setup_cost_per_part`
  (`machine_cost` already present). DELETE-when-anon.
- `REDACTED_NESTED_BLOCKS` += `breakdown` (the per-op cost ARRAY -- `isObjectLike([])` is true so it is
  replaced with `{}`, safe), `inputs` (holds `machine_rate_per_hour`). Empty-to-`{}`.
- **Additivity proven:** no shipped customer surface carries a TOP-LEVEL `breakdown` or `inputs` key
  (QuoteEstimateResult nests `total_cost_per_part` inside `costs`; InstantQuoteResult uses `cost_breakdown`
  + top-level customer `unit_price`/`ci95_*`). So the two new keys match ONLY `process_cost`; the 20/20
  /quote + 7/7 /quotes regression stays green.

The $/hr-in-a-string is a shape NO field-name redactor catches. A new `cost.ts`-local
**`redactShopQuoteNotes`** filters the `notes` array, dropping any entry matching `/\$\s*[\d.,]+\s*\/\s*hr/i`
(catches `$137/hr`, `$ 62.5 / hr`, etc., machine-name-independent) while KEEPING the customer-safe
lead-time / "Volume discount" notes. It is shop_quote-specific, so it lives in cost.ts, NOT the generic
redactor. Each handler gated `redact-when-!req.userId`.

## The envelope distinction (why the DIRECT redactor, not redactThroughEnvelope)

`prism_business` returns a BARE `{type,text}` slimResponse the route must envelope-peel (the recurring
no-op false-green -- that is why /quote and /quotes use `redactThroughEnvelope`). **`prism_intelligence`
is different:** it returns the STANDARD `{content:[{type,text}]}` envelope, which the real callTool
(`index.ts:887`: `return text ? JSON.parse(text) : result`) UNWRAPS + JSON.parses BEFORE the route sees
it. So the route receives the PARSED engine object, and the fix calls `redactInternalMarginFields`
DIRECTLY (no envelope peel). The test's mock therefore returns the parsed engine fixture directly (NOT a
`{type,text}` envelope) -- matching the production wire (R9).

## Validation
- 12/12 new `cost-route-redaction.test.ts`: ephemeral IPv4 Express; mock returns the parsed engine shape
  (machine_rate_per_hour=95, total_cost_per_part=42.5, notes[0]="...at $137/hr"); anon wire NUMBER
  leak-scan + the customer price survives + authed-full pass-through + negative-control + adversarial
  (empty notes / no-notes identity / null-string scrubber input).
- 5/5 cost-route-contract + 7/7 quotes-instant + 3/3 quote-compat adapter green (additive, no regression).
- **3-of-3 CLEARED.** Arm B ran a LIVE mutation test: neutered the /estimate gate (`const safe = result`)
  -> the 2 anon leak-scan tests FAILED with the raw cost stack on the wire -> restored. Arm C cleared the
  shared-redactor blast radius, the req.userId-unspoofable check, and confirmed no OTHER anon cost route
  was missed (erp.ts is verifyToken-gated).

## Lessons (beyond the two parent units)
1. **A value embedded in a STRING needs a content scrub, not a field-name redactor.** The $/hr rate in
   `notes[0]` survives every field-name redactor; a dedicated regex filter on the array is required, and
   it belongs with the engine-specific route (cost.ts), not the generic redactor.
2. **The envelope class depends on the DISPATCHER, not the route.** prism_business -> bare {type,text}
   (peel needed); prism_intelligence -> content[] (callTool already parsed). Confirm which the surface
   uses (read the real callTool's unwrap) before choosing the direct vs envelope-peel redactor -- the
   wrong choice is a silent no-op (the recurring R9 false-green).
3. **Extend the shared redactor for each NEW shape, prove additivity by grepping the OTHER surfaces'
   top-level keys.** `breakdown`/`inputs` are generic names -- safe ONLY because no shipped customer
   surface exposes them at the top level. Verify, do not assume.
4. **A scrutiny arm earns its keep on coverage gaps.** Arm C found a `web/src` caller of /cost/estimate
   (`CostEstimatorPage.tsx`) the orchestrator's grep missed, and confirmed the redaction degrades it
   gracefully (blank panel, no 502) -- AND surfaced a pre-existing FE<->route shape mismatch
   (per_part_cost vs total_cost_per_part) as a separate P2.

## See also
- [[quote-compat-anon-margin-redaction]] -- parent (/api/v1/quote)
- [[quotes-instant-anon-cost-breakdown-redaction]] -- sibling (/api/v1/quotes/instant)
- [[quoting-cost-basis-generic-dispatch-leak]] -- the /api/v1/quoting generic-passthrough leak
- [[reference_charlie_cost_route_redact_2026_06_24]] (memory)
