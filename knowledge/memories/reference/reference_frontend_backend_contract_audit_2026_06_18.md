---
name: reference_frontend_backend_contract_audit_2026_06_18
description: "Frontend<->backend API contract audit (romeo) -- scripts/audit-frontend-backend-contract.mjs maps SPA /api/* calls vs backend routes; found shopLive router built-but-never-mounted (fixed), 4 gaps routed to owners"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.580Z
aliases: reference_frontend_backend_contract_audit_2026_06_18
---


# Frontend<->backend API contract audit (slot:romeo, 2026-06-18, operator goal: backend -> enable frontend focus)

`scripts/audit-frontend-backend-contract.mjs` (re-runnable) diffs the Vite/React SPA's distinct `/api/<domain>`
fetch prefixes (`mcp-server/web/src`) against the Express backend-for-frontend's served routes
(`mcp-server/src/routes/index.ts registerRoutes()`). KEY: it resolves each `app.use(prefix, router)` mount to
its router SOURCE FILE and EXPANDS the `router.METHOD("/sub")` paths -- so a bare `app.use("/api", shopLiveRouter)`
correctly credits `/api/shop/*` (without this expansion the audit false-flags every router that embeds its own
sub-paths, same false-positive class as the 197-ghost dispatcher audit). A gap = a SPA prefix whose domain is
served by NO backend route; each was then manually confirmed a REAL `fetch()` (not a type/doc string) with the
exact SPA file:line.

## Result: 65 SPA prefixes, 55 covered, 10 gaps -> 3 FIXED (romeo orphaned-router mounts), 7 routed
(First run said 5 gaps; scrutiny caught the audit MASKING 7 -- honest count was 12; romeo then mounted 2 more
orphaned routers -> 10 remain. The 3 fixes: shopLive /api/shop/* + shopProfile /api/v1/shop + wedm-erp /api/v1/wedm-erp.)

**FIXED+SHIPPED (romeo wiring lane): `/api/shop/*`** -- `mcp-server/src/routes/shopLive.ts` is a complete 19-endpoint
live-shop router (ShopStateEngine-backed: snapshot/jobs/job/labor/traveler/approval/quantity/rooms) that had
**ZERO imports/mounts anywhere** -> the SPA's `getShopFloorSnapshot()` (GET /api/shop/snapshot) + `getShopJobs()`
(GET /api/shop/jobs, `web/src/api/client.ts`) both 404'd. Fix: `app.use("/api", shopLiveRouter)` in registerRoutes
(paths are top-level `/shop/*` so it mounts BARE at `/api`; no callTool dep -- uses the `shopStateEngine`
singleton w/ InMemoryShopRepository). Test `src/__tests__/shopLive-route-mount.test.ts` 4/4 (snapshot 200, jobs
200+shape, create->list round-trip, negative-control 404). tsc clean. Re-run audit confirms /api/shop now covered.

**ROUTED (NOT pure wiring -- new route+engine OR a security-gated dispatch surface):**
- `/api/dispatch/cam` (LathePrintToProgram.tsx:74) + `/api/dispatch/business` (LatheERPDashboard.tsx:80) -> need a
  generic `/api/dispatch/:domain` surface (clone hotel U-VNET-ROUTE deny-by-default allowlist) OR rewire SPA to the
  existing `/api/v1/cam` + `/api/v1/business` (the business generic dispatch ALREADY exists). Owners: whiskey/echo/hotel.
- `/api/operator/feedback` (OperatorFeedbackPanel.tsx:69, has tests) -> new operator-feedback route+engine. shop-floor/golf.
- `/api/machine-audit` (MachineDataAuditPage.tsx:57) -> new machine-audit route. foxtrot/shop-floor.
- `/api/prism` (LathePrintToProgramPage.tsx:123, lathe_print_full) -> blanket arbitrary-tool POST = SECURITY SMELL
  (controlled MCP surface is the :3100 bridge); scope it to a lathe-print route. whiskey.

## The 10 remaining gaps (categorized) -- (A) shopProfile + wedm-erp now MOUNTED by romeo
- **(A) DONE -- romeo mounted both:** `/api/v1/shop` (shopProfile.ts) + `/api/v1/wedm-erp` (wedm-erp.ts), both
  no-arg engine-backed factories, guard test fe-route-mount-romeo.test.ts 3/3. (Was routed to sierra; romeo did it.)
- **(B) Sierra-deferred:** `/api/v1/{grinding,forming,welding}` (createSpecialtyRouter -- dispatcher actions
  don't exist; sierra's U-FE-SPECIALTY-CONTRACT).
- **(C) No router (build):** `/api/v1/ai/reasoning` (latheAI.ts->@india), `/api/v1/doc-learn` (docLearn.ts->@lima),
  `/api/v1/knowledge` (PATH MISMATCH: knowledgeExt.ts serves `/knowledge-ext`, SPA calls `/knowledge`).
- **(D) Bare-prefix generic surfaces:** `/api/dispatch/{cam,business}`, `/api/operator/feedback`,
  `/api/machine-audit`, `/api/prism` -- security-gated dispatch (clone hotel deny-by-default allowlist) or rewire.

## Lessons
- **An orphaned built ROUTER is the frontend twin of an orphaned engine** -- shopLive was a fully-built, correct
  router that 404'd purely because nobody added the one `app.use` line. Recurring class (sierra's e195a2b425
  mounted 9 + folded shopLive); shopProfile + wedm-erp are the same pattern, still unmounted.
- **A gap-auditor that MASKS gaps is worse than none (R12, scrutiny arm-A P1).** My first version credited a bare
  namespace mount (`app.use("/api/v1", router)`) as covering EVERY `/api/v1/<domain>` -- hiding 7 real gaps. Fix:
  never direct-credit a namespace-only mount (`/api`, `/api/v1`, `/api/mcp`); credit only its router's EXPANDED
  sub-paths. The auditor must also expand sub-router paths or it false-flags its own fixes. Same false-positive/
  negative family as the 197-ghost dispatcher audit -- a detector's blind spots cut BOTH ways.
- **Shared-tree absorption is real + can be benign:** romeo's uncommitted shopLive mount got folded into sierra's
  e195a2b425 (the documented absorption pattern) -- here it SHIPPED the fix cleanly (comment preserved), but
  attribution moved to sierra's commit. The test + audit stayed uncommitted (lane guard).
- Backend-for-frontend is substantially built: 53/65 SPA domains served +1 fixed. 11 gaps remain, each with
  file:line + a buildable fix + owner.

Spec: `state/shared/specs/FRONTEND-BACKEND-CONTRACT-2026-06-18.md`. Posted to AGENT_CHAT.jsonl (events
fe-be-contract-audit + fe-be-contract-audit-v2). All artifacts UNCOMMITTED except the shopLive mount (folded into
e195a2b425). Sibling: [[reference_dispatcher_ghost_audit_2026_06_18]].
