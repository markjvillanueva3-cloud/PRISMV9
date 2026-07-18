---
name: reference_validation_data_discarded_dispatcher_2026_06_10
description: dataDispatcher validated params then DISCARDED validation.data -> every Zod transform/clamp/coercion in ACTION_DATA_SCHEMAS was inert on the live path. Audit other dispatchers for the same validate-then-ignore-data silent no-op.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.250Z
aliases: reference_validation_data_discarded_dispatcher_2026_06_10
---


**Bug class: validate-then-ignore-data (Zod transform silent no-op on the live dispatch path)** — found 2026-06-10 (slot:sierra, U-MCP-HARDEN-3).

`mcp-server/src/tools/dispatchers/dataDispatcher.ts:282` called `validateActionParams(action, params, ACTION_DATA_SCHEMAS)` but read only `validation.valid` and then forwarded the RAW `params` to every registry call (the id-coalescing helpers + every `case` read `params.limit ?? N`). `validation.data` (the Zod `safeParse().data` — the VALIDATED + TRANSFORMED object) was computed and thrown away. Consequence: **any `.transform` / `.default` / `.coerce` in the schema map is inert in production** — it only changes the discarded output. A new pagination `limit` clamp (`pagination.limit.transform(v => Math.min(v, PAGINATION_MAX))`) therefore did NOT cap anything on the live path; a client could still request `limit: 50000` and materialize the whole registry into one response.

**Why the unit tests missed it:** they called `schema.parse({limit:50000})` directly and asserted the clamp — proving the schema, NOT the dispatcher round-trip. Classic R15 "test through the dispatcher, not the singleton" hole. Caught by scrutiny **arm C** (regression/integration weighting); arms A+B (holistic + test-integrity) both PASSed it. This is why 3-of-3 with a dedicated integration-weighted arm matters.

**Fix:** after the `!validation.valid` guard, `if (validation.data) params = validation.data as Record<string, any>;`. Safe because `validateActionParams` (`utils/dispatcherMiddleware.ts:82-88`) returns `data: params` (IDENTITY) for schema-less actions and `data: result.data` otherwise, and every schema in the file is `.passthrough()` with no `.coerce` -> `validation.data` is byte-identical to `params` except the intended clamp. Proven by a through-dispatcher integration test (`dataDispatcher-pagination.integration.test.ts`) that runs `normalizeParams -> validateActionParams -> params=validation.data` and asserts `50000 -> 10000`. Commit (this session, branch cad-fusion-live-ms0): subject `U-MCP-HARDEN-3`.

**FLEET FOLLOW-UP (unverified, worth an audit):** other dispatchers may have the same `validateActionParams(...)` + ignore-`data` pattern, making their schema transforms/defaults inert too. Grep `dispatchers/*.ts` for `validateActionParams` calls whose result is only checked for `.valid`. NOTE there are TWO `validateActionParams` in the repo: `utils/dispatcherMiddleware.ts` (returns `{valid,data}`) vs `validation/actionParamValidator.ts` (returns `{valid,params}`, NO `data`) — a dispatcher importing the latter and reading `.data` would silently get `undefined`.

Related: [[feedback_wire_test_validate_all_galaxies]] (R15 test-through-dispatcher), [[feedback_verify_actual_contract_not_proxy]].
