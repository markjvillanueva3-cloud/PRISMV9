# Frontend ↔ Backend API contract audit + disposition (2026-06-18)

> slot:romeo, operator goal "complete romeo tasks → backend → enable frontend focus; coordinate with fleet".
> Romeo's lane = wiring + API integrity. This maps EXACTLY which SPA `/api/*` calls have no backend route
> (= a frontend feature that 404s = a frontend-blocking backend gap), fixes the one in-lane wiring gap, and
> routes the rest to owning slots. Tool: `scripts/audit-frontend-backend-contract.mjs` (re-runnable).

## Method (R12 — verified, not heuristic-only)
The Vite/React SPA (`mcp-server/web/src`) fetches `/api/*` endpoints; nginx/vite proxy them to the Express
backend-for-frontend on :3000 (`mcp-server/src/routes/index.ts registerRoutes()`). The audit extracts the
SPA's distinct `/api/<domain>` prefixes (65) and the backend's served prefixes — resolving each mount in
`registerRoutes` to its router source file and **expanding** `router.METHOD("/sub")` paths (so a bare
`app.use("/api", shopLiveRouter)` correctly credits `/api/shop/*`). A gap = a SPA prefix whose domain is
served by no backend route. **Every gap below was then manually confirmed to be a real `fetch()` call**
(not a type/doc string — the 197-ghost false-positive trap) with the exact SPA file:line.

Result: **65 SPA prefixes · 56 covered · 9 gaps → 4 FIXED in-lane (shopLive + shopProfile + wedm-erp +
machine-audit) · the rest categorized + routed.** Every gap was confirmed a REAL SPA fetch (a `BASE_URL`/
`API_BASE` API-client module or a component fetch), zero data-string false positives. (machine-audit was a
group-D gap; romeo shipped an honest real-fleet base 2026-06-18 — see dispositions below.)

## AUDIT-ACCURACY FIX (R12 — the tool was masking gaps)
The first run reported only 5 gaps. Scrutiny caught why: a bare `app.use("/api/v1", router)` mount added the
namespace `/api/v1` to the served set, and the coverage check's child-match then marked EVERY `/api/v1/<domain>`
covered — silently HIDING 7 real gaps (a gap-masking auditor, the exact failure this tool exists to prevent).
Fixed: namespace-only mounts (`/api`, `/api/v1`, `/api/mcp`) are no longer direct-credited; their coverage comes
ONLY from expanding their router's real sub-paths. The honest count is **12 gaps, not 5**.

## FIXED (romeo lane — orphaned-router wiring) — SHIPPED
### `/api/shop/*` — shopLive router was built but NEVER mounted ✅ (committed `e195a2b425`)
`mcp-server/src/routes/shopLive.ts` is a complete 19-endpoint live-shop router (ShopStateEngine-backed:
`/shop/snapshot`, `/shop/jobs`, `/shop/job/*`, `/shop/labor/*`, `/shop/traveler/*`, `/shop/approval/*`,
`/shop/quantity/record`, `/shop/rooms`) — but had **zero imports/mounts anywhere** in the backend. The SPA's
`getShopFloorSnapshot()` (`GET /api/shop/snapshot`) and `getShopFloorJobs()` (`GET /api/shop/jobs`, `client.ts`)
both 404'd. **Fix:** mount `app.use("/api", shopLiveRouter)` in `registerRoutes` (paths are top-level
`/shop/*` so it mounts bare at `/api`; no `callTool` dependency — uses the `shopStateEngine` singleton).
Verified: `src/__tests__/shopLive-route-mount.test.ts` (6/6 — incl. a `registerRoutes()`-level guard that fails
if the mount line is reverted, R9). tsc clean. **Shipped:** romeo's uncommitted mount was folded into sierra's
`e195a2b425` (SIERRA-BACKEND/U-FE-ROUTE-MOUNT) on the shared tree — the mount + comment are live at HEAD; the
shopLive test + this audit remain uncommitted (lane guard).

### `/api/v1/shop` + `/api/v1/wedm-erp` — 2 more orphaned routers, NOW MOUNTED ✅ (romeo)
Same shopLive pattern: `routes/shopProfile.ts` (`createShopProfileRouter`, /profile + /machines + /magazine) and
`routes/wedm-erp.ts` (`createWedmErpRouter`) were complete engine-backed routers (no `callTool`/dispatcher
dependency → no missing-action issue, unlike specialty) with passing route tests, but never mounted → the SPA's
`shopProfile.ts` + `wedmErp.ts` clients 404'd. **Fix:** `app.use("/api/v1/shop", createShopProfileRouter())` +
`app.use("/api/v1/wedm-erp", createWedmErpRouter())` in `registerRoutes`. Guarded by
`src/__tests__/fe-route-mount-romeo.test.ts` (3/3 registerRoutes-level, fails-on-revert). tsc clean. Audit gaps
12→10. (Uncommitted on the shared tree; next [MAIN-FORCE] sweep folds them, like shopLive into `e195a2b425`.)

## REMAINING 10 GAPS — categorized + routed (the precise frontend blockers): B(3) + C(3) + D(4)

### B. Sierra-owned, already DEFERRED (createSpecialtyRouter — dispatcher actions don't exist yet)
`/api/v1/grinding` · `/api/v1/forming` · `/api/v1/welding` — SPA clients `web/src/api/{grinding,forming,welding}.ts`.
Sierra explicitly deferred these in `e195a2b425` → **U-FE-SPECIALTY-CONTRACT** (the specialty router calls
dispatcher action names that don't exist; needs the actions built first). Owner: sierra.

### C. No backend router — needs a new route (+ maybe engine)
| SPA gap | SPA client | What it needs | Owner |
|---|---|---|---|
| `/api/v1/ai/reasoning` | `web/src/api/latheAI.ts` | an ai-reasoning route → `callTool("prism_ai"/"prism_intelligence", ...)` | india (ai) / whiskey (lathe) |
| `/api/v1/doc-learn` (5 endpoints) | `web/src/api/docLearn.ts` | a doc-learn route → the PDF/doc-learning dispatcher | lima (academy/pdf) |
| `/api/v1/knowledge` | `web/src/api/knowledge.ts` | PATH MISMATCH: `routes/knowledgeExt.ts` serves `/api/v1/knowledge-ext`, SPA calls `/api/v1/knowledge` — mount knowledgeExt at `/api/v1/knowledge` too, or rewire the SPA | sierra + india |

### D. Bare-prefix generic surfaces (NOT pure wiring — security-gated or rewire)
| SPA gap | SPA file:line (verified real fetch) | What it needs | Owner |
|---|---|---|---|
| `/api/dispatch/cam` (POST) | `web/src/pages/LathePrintToProgram.tsx:74` | generic `/api/dispatch/:domain` w/ deny-by-default allowlist (cf. hotel `/api/v1/business`), OR rewire SPA → `/api/v1/cam` | whiskey + echo |
| `/api/dispatch/business` (POST) | `web/src/pages/LatheERPDashboard.tsx:80` | backend ALREADY has `/api/v1/business` generic dispatch — likely just rewire the SPA | whiskey + hotel |
| `/api/operator/feedback` (POST) | `web/src/components/operator/OperatorFeedbackPanel.tsx:69,97` (has tests) | new operator-feedback route + engine | shop-floor / golf |
| `/api/machine-audit` (GET) | `web/src/pages/MachineDataAuditPage.tsx:57` | new machine-audit route | foxtrot / shop-floor |
| `/api/prism` (POST, `lathe_print_full`) | `web/src/pages/LathePrintToProgramPage.tsx:123` | a SCOPED lathe-print route (blanket `/api/prism` arbitrary-tool POST is a security smell — controlled surface is the :3100 bridge); rewire SPA → a print route | whiskey |

Security note (group D `/api/dispatch/*` + `/api/prism`): a blanket "POST any {tool,action,params}" surface
bypasses per-domain validation. The existing pattern (hotel `/api/v1/business`) gates it with a
**deny-by-default allowlist** — clone that, never ship an open dispatch surface.

## Verified backend-build dispositions (romeo deep investigation, 2026-06-18 turn 2)
Romeo investigated the group-C/D routes to confirm which (if any) are clean romeo wires vs domain builds.
Verdict: **all remaining FE-gap backend routes are domain builds, not romeo wires** — building them as romeo
would require fabrication or expose misleading data (R12). Evidence per route:
- **`/api/machine-audit` — BASE SHIPPED by romeo (2026-06-18); enrichment -> foxtrot (MCAT-MS0).**
  `routes/machineAudit.ts` (wired `app.use("/api/machine-audit", ...)`, 5/5 tests, 2-arm scrutiny PASS) serves
  the REAL 21-machine JM fleet (ShopConfigurationEngine) through a flat->nested adapter (restructures real
  values only) audited against PRISM's TRACKED attributes (`REQUIRED_MAPPABLE`: spindle rpm/power/torque,
  controller.family, envelope x/z, coolant.type) -> real per-category complete booleans + completeness (Okuma
  lathes ~1.0, data-thin mills 0.36–0.45, gaps surfaced). The SPA now gets real data, not its mock fallback.
  HONEST gaps left for the foxtrot MCAT enrichment (documented in-file, NOT fabricated): (1) the full 54-field
  CANONICAL-spec completeness view (romeo's is vs the tracked subset); (2) per-machine `backfilled_fields`
  provenance via `MachineDataHardeningEngine` (romeo emits `[]`); (3) real `confidence_overall` via
  `MachineQualityScoreEngine` (romeo uses a labeled presence-proxy); (4) per-machine-TYPE field criteria
  (mill-only taper / envelope.y). Note: `MachineDataAuditEngine` audits static `SAMPLE_MACHINES`; romeo's route
  bypasses that by auditing the live ShopConfigurationEngine fleet directly via the engine's per-field statics.
- **`/api/operator/feedback` -> shop-floor.** No dedicated operator-feedback engine (only generic AI/learning
  engines match) — needs a feedback-capture engine + route.
- **`/api/v1/ai/reasoning` -> india** (latheAI.ts); **`/api/v1/doc-learn` (5ep) + `/api/v1/knowledge` (14ep
  LEARN-MS5) -> lima** — feature-route builds against the AI/academy dispatchers, not thin wires.
- **`/api/dispatch/{cam,business}` + `/api/prism` -> whiskey/quebec** (SPA-rewire to `/api/v1/*`) — backend
  `/api/v1/business/dispatch` already exists; the SPA calls a nonexistent reversed path. Security: a blanket
  arbitrary-tool surface needs the hotel deny-by-default allowlist, never an open dispatch.

## Frontend-readiness summary
The backend-for-frontend (Express :3000, ~60 domain routers → callTool → dispatchers) is substantially built:
**55/65 SPA `/api` domains served** — romeo fixed 3 orphaned-router mounts (`/api/shop`, `/api/v1/shop`,
`/api/v1/wedm-erp`). The 10 remaining gaps are the precise frontend blockers — 3 are sierra's already-tracked
specialty deferral (B), 3 need a new route (C: ai/reasoning→india, doc-learn→lima, knowledge path-fix), 4 are
generic/security-sensitive surfaces (D: dispatch/operator/machine-audit/prism). Re-run
`audit-frontend-backend-contract.mjs` after any mount to watch the count drop.

_Artifacts (uncommitted — git-add-lane-guard): this spec · `state/shared/FRONTEND-BACKEND-CONTRACT-AUDIT.json`
· `scripts/audit-frontend-backend-contract.mjs` · `mcp-server/src/routes/index.ts` (+shopLive mount) ·
`mcp-server/src/__tests__/shopLive-route-mount.test.ts`._
