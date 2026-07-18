---
name: reference-slimresponse-strips-empty-arrays
description: "The PRISM MCP dispatcher framework wraps every response through `slimResponse()` which silently strips empty arrays — `driftWarnings: []` from an engine becomes `undefined` at the MCP transport layer. Wire tests must assert `toBe(undefined)` on the empty path, not `toEqual([])`."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.914Z
aliases: reference_slimresponse_strips_empty_arrays
---


# slimResponse strips empty arrays at MCP transport

**Source of truth:** `H:/prism/mcp-server/src/utils/responseSlimmer.ts` line 24:
```typescript
if (Array.isArray(value) && value.length === 0) continue;
```

`slimResponse(response)` is applied to every dispatcher result at the framework
boundary (e.g. `camDispatcher.ts:18100`:
`return { content: [{ type: "text", text: JSON.stringify(slimResponse(result)) }] }`).
It recurses through objects and arrays and **drops** every:
- `null` value
- `undefined` value
- empty array (`[]`)

## Implication for wire / round-trip tests

When an engine returns `{ ok: true, ..., driftWarnings: [], ...fields }` and the
dispatcher bridges to `{ success: true, data: <engineResult> }`, the MCP response
that the test observes is **missing** `driftWarnings` entirely. So:

- ❌ `expect(data.driftWarnings).toEqual([]);`  → fails (received `undefined`)
- ✅ `expect(data.driftWarnings).toBe(undefined);` on the no-drift path
- ✅ Add a second test that forces a non-empty drift path (e.g. missing
  reference file) to prove the bridge preserves real warnings:
  ```typescript
  expect(Array.isArray(drift)).toBe(true);
  expect(drift?.length).toBe(1);
  ```

## How to apply

Whenever building round-trip tests against any prism_* dispatcher, **pin both
sides of any-array-valued field**: the empty path expects `undefined` (slimmed),
the populated path expects the exact array contents. Skipping the populated test
makes the empty-path assertion tautological — slimResponse strips empties for
*any* engine, real or stubbed.

Surfaced 2026-05-13 during 3-of-3 scrutiny of
[[TRAINING-LEARNING-MS0]]/U-TL-U3 wire tests (Arm A blocker #4 cascade — the
permissive payload extraction masked this, the strict `pinnedEngineResult`
helper exposed it).

See also: [[feedback_always_close_out]] R12 "Fail loud" — pinning both shapes
prevents a wire-layer field-drop from silently masking a real bug.


## Related
[[skills/prism|/prism]] • [[skills/mcp-server|/mcp-server]] • [[skills/src|/src]] • [[skills/utils|/utils]] • [[skills/response|/response]]