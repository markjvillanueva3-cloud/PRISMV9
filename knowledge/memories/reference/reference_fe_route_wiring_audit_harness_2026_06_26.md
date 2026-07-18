---
name: reference_fe_route_wiring_audit_harness_2026_06_26
description: "Fleet FE<->backend wiring auditor (mcp-server/scripts/audit-fe-route-wiring.mjs) -- 170 dead-wire candidates across 37 api modules = the gap list/loss function for \"wire all backend to frontend\"."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.573Z
aliases: reference_fe_route_wiring_audit_harness_2026_06_26
---


# Fleet FE<->backend wiring auditor + the gap inventory (slot:quebec, 2026-06-26)

Built while the Kienzle Tool Crib page was blocked on the user's design HTML, to convert the unbounded
"wire the entire backend to the frontend" goal into a finite, measurable loss function.

## The harness (commit a77baa20fa)
`mcp-server/scripts/audit-fe-route-wiring.mjs` (run from `mcp-server/`): scans EVERY `web/src/api/*.ts`
module against ALL registered Express routes; flags client call-sites whose URL maps to no route.
- Route resolution is **import-anchored** (index.ts `import {createX} from "./f.js"` + `app.use("<base>", createX...)`), so it does NOT false-flag exportRoutes/threads/shopLive like the older ERP-scoped `audit-erp-fe-route-wiring.mjs` does.
- `runAudit()` + `norm()` are exported + **main-guarded** (importable, no side effects). 7 norm() tests pin the query-string-vs-path-param distinction.
- `--json` for machine output. R12 limits: literal call-sites only (computed paths skipped); ~4 residual `${}` multi-segment template artifacts + base-vs-suffix nuances remain, so the count is a CANDIDATE total, not verified.

## Live inventory (2026-06-26)
**1219 registered routes; 891 literal api call-sites in 98 modules; 170 dead-wire CANDIDATES across 37 modules.** `calc.ts` and `toolCrib.ts` = 0 (confirms this session's two wiring fixes held). **Classified (schema 1.1.0, commit d10ce5f3d8): 158 no-route + 8 near-miss + 4 dynamic.** near-miss = the same METHOD+tail (last-2-segments) is registered under a different base (likely a client base-path bug, frontend-fixable -- but several are generic `:x/:x`-tail FALSE signals in client.ts); no-route = backend route genuinely missing (owner domain); dynamic = unparsed `${}` template. **Conclusion: essentially NO clean quebec-frontend-lane fix exists -- the actionable 158 are cross-domain BACKEND route-adds, which is the owning domains' lane + wiring-for-wiring's-sake without the consuming pages. Remaining work is an operator scope decision, not auto-decidable by quebec.** Biggest: client.ts(61), admin.ts(5), shop.ts(5), orchestration family (adaptiveControl/atcs/autonomous ~4 each), cadGeometry(4). The bulk are CROSS-DOMAIN (orchestration/admin/cad/erp), confirming the goal is a multi-session, multi-slot program -- NOT a single unit. The ERP-scoped tool separately reports 48 ERP dead client calls + 2 raw-fetch bypasses in ShippingPackingPage.

## How to use (next sessions / fleet)
`node scripts/audit-fe-route-wiring.mjs` -> prioritize by domain owner (admin/orchestration = backend slots; erp = hotel; cad = delta/kilo). Each dead wire = either add the missing route OR fix the client path. Re-run after each fix; target deadWireCount -> 0. This is the closeable form of the operator's goal.

Sibling: [[reference_toolcrib_rest_bridge_2026_06_26]] (the 2 Kienzle Tool Crib backend wiring units this same session). Doctrine: [[feedback_dont_wire_for_wiring_sake_2026_05_16]] (wire to real consumers, not for count).
