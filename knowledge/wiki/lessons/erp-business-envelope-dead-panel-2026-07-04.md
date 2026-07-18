---
title: erp.ts prism_business {type,text} envelope dead-panel + the const-before-hoist tsc trap
date: 2026-07-04
slot: hotel
unit: U-WIRE-ERP-ENVELOPE
commit: 8bea361ada
tags: [dead-panel, envelope-unwrap, slimResponse, launch-wire, erp, hoisting, tsc-vs-esbuild, R12]
severity: high
type: lesson
---

# erp.ts prism_business {type,text} envelope dead-panel + the const-before-hoist tsc trap

## The dead-panel (the primary bug)

`mcp-server/src/routes/erp.ts` called `callTool("prism_business", action)` at 27 `const result = await ...`
sites and sent the un-peeled result straight to `res.json({ ok: true, data: result })`.

`prism_business` returns a **bare** `slimResponse({ type: "text", text: JSON.stringify({success,data}) })`
with **no `content[]` wrapper**. The production `callTool` (index.ts:897 / 1408) peels only
`result?.content?.[0]?.text` — so a bare `{type,text}` envelope reaches the route **un-peeled**. The FE
consumer `web/src/api/erp.ts:59-63` reads `json.data` as the typed inner object, so it received
`{type,text}` and every typed field came back `undefined` → **every ERP panel (dispatch board, cash
flow, tool crib, margin trends, OEE, financials, quality, A3, kaizen) rendered dead for a signed-in user.**

This is the recurring **U-QT04 / estimate-flow / hotel-RFQ dead-panel class**. Only 2 of the 29
prism_business sites in the file (rfqRoute + root_cause) were correctly peeling via a closure-scoped
`unwrapEnvelope`; the other 27 were not.

**Fix:** hoist the local `unwrapEnvelope` to **module scope** (as a `function`, not a `const`) so the
module-level helpers `bizRoute`/`bizGet` AND every in-router site share ONE peel, then wrap all 27
prism_business sites. **Scope: prism_business ONLY** — `prism_calc`/`prism_product`/`prism_intelligence`/
`prism_knowledge` return `content[]` which callTool already peels; wrapping them would **double-peel and
break them**. Note the two `oee_calculate` sites are correctly split: `/analytics/oee` → prism_calc
(NOT wrapped), `/oee-six-losses` → prism_business (wrapped).

## The secondary bug the fix itself introduced (the real lesson)

The first mechanical transform wrapped the two **module-level helper** sites (`bizRoute` at line 34,
`bizGet` at line 45) — but at that point `unwrapEnvelope` was still a **closure-scoped `const`** defined
at line 105 inside `createErpRouter`. A `const` arrow is **not hoisted**, and those two helpers live in a
DIFFERENT (module) scope → `error TS2304: Cannot find name 'unwrapEnvelope'`.

**`npm run build:fast` (esbuild) did NOT catch this — esbuild does not type-check.** Only the full
`tsc --noEmit` gate surfaced it (total error count went 107→109; the 2 extra were mine). The fix was to
hoist the helper to module scope as a `function` declaration (which IS hoisted) and delete the closure
`const` — which also de-duplicated the helper.

## Takeaways

1. **A dead panel from a bare `{type,text}` slimResponse is the single most recurring FE bug in this
   repo.** Any route calling `prism_business` (or any slimResponse dispatcher) MUST peel the envelope
   before `res.json`. The FE reads `.data` as the parsed inner object.
2. **`build:fast` is a bundler, not a type-checker.** For any refactor that moves/renames symbols across
   scopes, run the FULL `tsc --noEmit` (or `npm run build`) before claiming clean — esbuild will happily
   bundle a `Cannot find name`. (R12: a green `build:fast` is not "tsc-clean".)
3. **`const` arrow vs `function` declaration matters when a helper is used above its definition or across
   scopes** — hoist to a module `function` when module-level helpers need it.
4. **A mechanical `const result = await callTool("X"` transform can over-reach** into helper functions
   that share the mark string — verify the tsc result, not just the wrap count.
5. **R9 test teeth:** the 4 regressions use the production `env({type,text})` mock and a proven
   negative-control (revert one unwrap → `AssertionError: expected undefined to be 3`). A `{success,data}`
   mock would have falsely passed with the bug present.

## De-dup debt (P2, deferred, flagged by scrutiny arm B)
This hoisted the LOCAL `unwrapEnvelope` clone rather than adopting the canonical
`unwrapDispatcherEnvelope` from `mcp-server/src/routes/dispatcher-envelope.ts` (the shared build-once
helper). erp.ts + business.ts both carry byte-equivalent clones. Follow-up: collapse all three to the
shared import.

## Fleet-wide census (2026-07-04 loop tick — TOTAL, not sampled)

All 8 dispatchers whose returns pass through `slimResponse` were enumerated and their exact return
shape verified. **`businessDispatcher.ts:8185` is the ONLY dispatcher in the fleet that returns the
bare `{type:"text", text}` envelope** (the dead-panel class). The other 7:

| Dispatcher | Shape | callTool behavior |
|---|---|---|
| resourceHarvestingDispatcher:244, resourceHarvesterDispatcher:293 | `content:[{type:"text",...}]` | peeled (fine) |
| feasibilityDispatcher:306, resourceExtractionDispatcher:405, localDispatcher (10+ sites), camDispatcher:8721+, camAITrainingDispatcher:86+ | bare plain objects (`{action,result}`, `{success,...}`, `{report}`, `{spec}`...) | passed through as the real object (fine) |

**Consequence:** the `{type,text}` peel is needed for prism_business routes ONLY. Never wrap
prism_calc/cam/cad/knowledge/intelligence (content[]-wrapped — double-peel breaks them) and never
sweep the 7 plain-object dispatchers (nothing to peel). Route-side coverage as of this census:
erp.ts ✓ (30) · hotel-portal.ts ✓ (30) · business.ts ✓ (1) · quote.ts/quotes.ts = charlie's lane
(own unwrapQuotingBody/redactThroughEnvelope discipline) · learning.ts = academy lane (5 sites
confirmed dead, fix recipe on AGENT_CHAT.md).

## See also
- `dispatcher-envelope.ts` — the canonical shared peel (`unwrapDispatcherEnvelope<T>`)
- reference_charlie_estimate_flow_envelope_nested_fix (the same class in quoting)
- reference_hotel_rfq_assign_and_envelope (the same class, hotel RFQ)
- U-WIRE-BUSINESS-ENVELOPE / U-WIRE-HOTELPORTAL-ENVELOPE (sibling fixes this campaign)
