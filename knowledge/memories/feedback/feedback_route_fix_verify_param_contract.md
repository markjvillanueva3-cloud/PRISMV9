---
name: feedback_route_fix_verify_param_contract
description: "When fixing an FE-route's dispatcher action, verify the target action's PARAM contract (Zod schema), not just that the action name exists -- a recording-stub test only checks the name."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.442Z
aliases: feedback_route_fix_verify_param_contract
---


# Route-fix: verify the action's PARAM contract, not just its existence

When wiring/rewiring an Express route's `callTool("prism_X", "action", params)`, confirming the
`action` exists on the dispatcher is NECESSARY but NOT SUFFICIENT. The dispatcher validates `params`
against the action's Zod schema (`validateActionParams` -> `schema.safeParse(params)`); a required
field you don't supply makes `safeParse` FAIL -> the dispatcher returns a `{ error }` body at
**HTTP 200** -- the exact silent-failure class (the SPA's `if(!res.ok)` can't see it) that the
FE-route action-contract campaign exists to kill.

**Why:** caught live by 3-of-3 scrutiny arm C (2026-06-19). I rerouted `/schedule/machines` (a GET
with NO body, so `params = {}`) to `prism_machine_live:machine_live_status` -- a real action -- but its
schema REQUIRES `machine_id:min(1)`, so `{}` fails validation -> 200+{error}. Fixed to
`machine_all_status` (the all-machines overview, schema `{ response_level? }.passthrough()` -> `{}`
validates). Arms A + B (existence-only checks) and my own recording-stub route test all PASSED -- the
stub `callTool` does NOT run the real Zod schema, so it verifies the action NAME, never the PARAM
contract. (commit 2520f8277f, follow-up to 93c3d40ddb.)

**How to apply (every route fix, esp. a no-body GET or a cross-dispatcher reroute):**
1. After picking the real action, READ its schema (`mcp-server/src/schemas/<domain>ActionSchemas.ts`)
   -- does it have REQUIRED fields the route does not supply? An empty-`{}` GET endpoint MUST target an
   action whose schema accepts `{}` (all-optional / `.passthrough()`); prefer an `*_all_*` / list /
   overview action over a single-entity action that needs an id.
2. For POST routes passing `req.body`, the param contract is the SPA's responsibility -- but still
   confirm the field NAMES match (e.g. SPA `refreshToken` -> engine `refresh_token`; map in the route).
3. The behavioral route-contract test (recording `callTool`) guards the action NAME + the route's own
   param mapping, NOT the dispatcher's schema -- so ALSO eyeball the schema, or add an integration test
   that round-trips through the real dispatcher when the param contract is non-trivial.

Sibling: [[reference_fe_route_action_contract_2026_06_19]] (the verifier that finds the name mismatches;
it is static + name-level, so it CANNOT catch a param-contract mismatch on a name that resolves). R9/R12.
