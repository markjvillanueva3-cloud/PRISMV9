---
name: reference-slim-response-strips-empty-arrays-2026-05-26
description: "Dispatcher's `slimResponse` (utils/responseSlimmer.ts L24) STRIPS empty arrays from MCP wire output — tests asserting Array.isArray on optionally-empty fields will fail"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.205Z
aliases: reference_slim_response_strips_empty_arrays_2026_05_26
---


# [[reference_slimresponse_strips_empty_arrays|slimResponse strips empty arrays]] — gotcha for dispatcher tests

**Location:** `mcp-server/src/utils/responseSlimmer.ts` line 24
```js
if (Array.isArray(value) && value.length === 0) continue;
```

Every dispatcher case returns `JSON.stringify(slimResponse(result))` (devDispatcher.ts line 12602). The slimmer drops `null`, `undefined`, and **empty arrays** from the wire output.

## Consequence for dispatcher round-trip tests

An engine that returns `{ warnings: [], reasoning: [...] }` will produce a wire output of `{ reasoning: [...] }` — `warnings` field disappears entirely. A test that asserts `Array.isArray(out.warnings)` on a no-warning happy-path call will FAIL with `expected false to be true` (because `out.warnings` is `undefined`, not `[]`).

## Caught during

EXTRA59 — RoundnessCylindricitySamplingEngine wire (`slot:november /loop iter63`, 2026-05-26). Test 1 used rotary_datum + 0.01mm + precision class — none of the warning paths trigger, so `warnings: []` got stripped.

## Recommended test pattern

```ts
// For fields that may be empty on happy path:
//   1. Don't assert Array.isArray on the wire output.
//   2. In a separate variability test, exercise the path that POPULATES the array, then assert .some(...) or .length > 0.
// For fields the engine ALWAYS populates (e.g. `reasoning` from a `reasoning.push(`${nCirc} × ${axial} = ...`)` call every invocation):
//   Keep the strict Array.isArray + length>0 assertion.
expect(Array.isArray(out.reasoning)).toBe(true);
expect(out.reasoning.length).toBeGreaterThan(0);
```

## Why we keep the slimmer

Token efficiency on the MCP wire — empty arrays add no information. The trade-off is that conditionally-populated fields disappear from happy-path responses; tests need to either probe populated branches or accept the contract.

## Cross-refs

- Engine: `mcp-server/src/engines/RoundnessCylindricitySamplingEngine.ts`
- Test: `mcp-server/src/__tests__/u_dea_november_extra59_dispatcher.test.ts` (see test 1 comment block)
- Slimmer: `mcp-server/src/utils/responseSlimmer.ts:24`
- Related: [[feedback_r5_thru_r12_doctrine]] (R12 fail-loud) — test 2 with two_point+odd-UPR is what actually catches the warnings-populated path.
