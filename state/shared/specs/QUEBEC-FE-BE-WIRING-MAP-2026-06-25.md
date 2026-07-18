# QUEBEC FE<->BE WIRING MAP + PLAN-FOR-EVERYTHING (2026-06-25)

> slot:quebec (frontend web + phone app). Operator goal: wire the ENTIRE backend to the new
> Claude-Design frontend so the web app + Electron + iOS/Android shells are ready for internal
> shop-floor testing. Per [[feedback_frontend_ui_owned_by_desktop_claude_2026_06_25]]: Claude Design
> (desktop app) owns UI/visual design; quebec owns the **data/API WIRING** that makes it functional.
> A backend defect surfaced THROUGH a page (missing route / mock fallback) is in-scope quebec work.

## Architecture (verified)
- SPA: Vite + React 19 + react-router-dom at `mcp-server/web/`, packaged as **web + Electron
  (`electron/main.cjs`) + Capacitor iOS/Android** from ONE build (`package.json` scripts:
  `build`, `electron:dist`, `cap:sync`, `mobile:add:{ios,android}`). 161 pages in `web/src/pages/`.
- Wiring contract: page -> `web/src/api/*` client -> `request('METHOD','/api/v1/...')` -> Express
  bridge (`:3100`, HEALTHY v2.10.0) -> `callTool('prism_*', {action})` dispatcher. ~96 api modules.
- `API_BASE='/api/v1'` is relative; an installed fetch-proxy rewrites it to the backend origin in
  Electron/mobile (`web/src/lib/apiBase.ts`), so ALL form factors share ONE mechanism.

## Loss functions (deterministic done-tests)
| LF | Definition | Tool | Current |
|---|---|---|---|
| LF1 | every SPA `/api` prefix served by a real backend route | `audit-frontend-backend-contract.mjs` | **3 gaps** (was 10 on 06-18) |
| LF1b | every route `callTool` action exists on its dispatcher | `audit-fe-route-action-contract.mjs` | **CLEAN** (561 pairs, 0 broken) |
| LF2 | every page renders LIVE data (no mock/empty) | `audit-page-wiring.mjs` (NEW) | **136 wired / 4 dead / 2 partial** |
| LF4 | web + Electron + Capacitor build green + :3100 smoke | `vite build` / `electron:dist` / `cap sync` | **web `tsc --noEmit` GREEN + `vite build` GREEN (10.35s, real chunks) + `:3100` healthy** (2026-06-25). electron-builder/cap-sync wrap the same green `dist/web` bundle (native toolchains not run this loop). |

## LF1 -- 3 remaining route-prefix gaps (the precise frontend-blocking 404s)
All confirmed REAL `fetch()` calls (not data strings). All are LATHE/AI pages using the legacy
raw-fetch anti-pattern. Per FRONTEND-BACKEND-CONTRACT-2026-06-18 + the security note (NEVER mount an
open `/api/dispatch` arbitrary-tool surface -- clone hotel's deny-by-default allowlist or rewire to a
scoped `/api/v1/*` route):

| SPA gap | call site | `lathe_p2p_*` etc. home | disposition / owner |
|---|---|---|---|
| `/api/dispatch/cam` | `pages/LathePrintToProgram.tsx:74` | `camDispatcher.ts` (`prism_cam`) | needs SCOPED `/api/v1/cam` dispatch route (allowlist the 12 `lathe_p2p_*` actions) -> whiskey/echo |
| `/api/dispatch/business` | `pages/LatheERPDashboard.tsx:80` | `/api/v1/business/dispatch` EXISTS (auth + allowlist) | NOT a clean rewire (contract-doc was wrong): the 5 actions it sends (`lathe_order_pipeline`, `billing_stats`, `lathe_inv_snapshot`, `lathe_profit_portfolio`, `lathe_actual_cost_accuracy`) are NONE of them in `business-dispatch-allowlist.ts` -> would 403. Needs: (1) hotel allowlist the 5 read actions (security review -- 3 are financial reads); (2) page add auth header + path `/api/v1/business/dispatch`. -> hotel (allowlist) + quebec (page) |
| `/api/prism` (`lathe_print_full`) | `pages/LathePrintToProgramPage.tsx:127` | scoped lathe-print route | new scoped print route -> whiskey |
| `/api/v1/ai/reasoning` | `api/latheAI.ts:8` | `prism_ai`/`prism_intelligence` | new ai-reasoning route -> india |

## LF2 -- page-wiring map (161 pages, deterministic + agent-confirmed)
`audit-page-wiring.mjs`: **wired 136 / partial 2 / dead 13 / static-ok 10**. The 13 heuristic-"dead"
were agent-confirmed (R12 -- the auditor is a conservative narrowing tool, NOT final judgement):

### GENUINELY DEAD -- renders mock/seed data, needs a NEW backend route+engine (4)
| page | mock source | wiring needed | owner |
|---|---|---|---|
| `CADRegenerationDashboardPage.tsx` | `getMockData()` seed (L57-124), TODO L361 | `fetchRegenerationMetrics()` route | delta (cad) |
| `MillTurnPage.tsx` | hardcoded `useState` (L23-27) | `/api/v1/millturn/{channels,bar-tracking}` | foxtrot (mill) |
| `SwissPage.tsx` | hardcoded `useState` (L23-41) | `/api/v1/swiss/{guide-bushing,gang-slides}` | whiskey (lathe) |
| `ValueStreamPage.tsx` (ROUTED) | seed `PROCESS_STEPS`/`WASTES` (L41-96) | backend `/erp/value-stream/:jobId` is a **501 stub** (`routes/erp.ts:367`) -- needs a NEW `prism_business:value_stream_map` engine. lead/cycle/VA computable from job-time records; the 7 wastes need a real capture source, NOT fabricatable (R12) | hotel/ERP + shop-floor |

**ROUTING REALITY (CRITICAL, 2026-06-25):** of the 4 "dead" pages, ONLY `ValueStreamPage` is routed in `App.tsx` (`/value-stream`, L150/343). `MillTurnPage`, `SwissPage`, `CADRegenerationDashboardPage` -- and the LF1 lathe pages (`LatheERPDashboard`, `LathePrintToProgram`, `LathePrintToProgramPage`) -- are **ORPHANS** (not imported/routed anywhere). Wiring them has ZERO user impact until they are first registered in the router (a product decision). So the LF1 `/api/dispatch/business` gap is for an orphan page = effectively MOOT. The single high-value routed dead-page wire is `ValueStreamPage`, and its backend is a 501 stub needing a real VSM engine + a wastes data source.

### PARTIAL -- has a backend call but falls back to mock when it fails (2)
| page | live path | gap | owner |
|---|---|---|---|
| `ShopDashboardPage.tsx` | `useWebSocket()` + `/api/machine-audit` | wire WS -> live telemetry; remove silent mock fallback | shop-floor/foxtrot |
| `MachineDataAuditPage.tsx` | `fetch('/api/machine-audit')` (romeo shipped base) | confirm live route returns real corpus; drop mock fallback | foxtrot (MCAT-MS0) |

### NOT DEAD (heuristic false-positives -- do NOT re-chase; recorded so future runs skip them)
store-fed / provider-wizard / shell -- all read LIVE data via a store, route `location.state`, OS
service, or child component:
- `EmployeePortalPage` (OS service `getEmployeeShell*`), `MessagesPage` (OS service `getMessagesWorkspace`)
- `LatheStudioPage`/`MillStudioPage`/`WireEdmStudioPage` (provider-context wizard, step components fetch)
- `MillingResultsPage`/`WireEdmResultsPage` (fed by upstream wizard via `location.state`)
- `CaptureOpsPage` (route + device APIs + child copilot), `PostProcessorPage` (shell/nav showcase)

## LF4 -- 3-target packaging (all CONFIGURED; build-verify pending)
- web: `vite build` -> `../dist/web`. electron: `electron-builder` (`build.appId=tools.prism.app`,
  win zip/nsis targets) via `electron:dist`. mobile: `@capacitor/{core,ios,android}@6` -> `cap sync`.
- TODO this loop: `tsc --noEmit` in `web/`, `vite build` green, `cap sync` dry-run, smoke top wired
  pages vs live `:3100` (e.g. SfcCalculatorPage, ErpDashboard, ShopFloorLivePage).

## LF3 (broader, lower priority for shop-floor readiness) -- reverse coverage
Operator goal also says "databases/engines/algorithms/formulas all wired to all compatible consumers"
(backend -> FE direction: does every dispatcher action have a FE surface?). This is a SEPARATE, larger
audit than LF1/LF2 and is NOT claimed done. `audit-unwired-engines.mjs` covers backend engine
consumption; a FE-surface-coverage audit is a future unit. Shop-floor TEST readiness depends on the
pages WORKING (LF1+LF2+LF4), not on 100% reverse coverage.

## Continuity harness (operator: "crons that fire so you stay busy")
`scripts/qcron-fe-be-wiring.mjs` (NEW) re-runs the 3 audits + diffs vs the last snapshot and writes
`state/shared/dashboards/QUEBEC-WIRING-PULSE.md`. Scheduled so the loop always has a fresh queue.

## Next-iteration order (logical dependency order, R13)
1. LF1 `/api/dispatch/business` SPA-rewire (quebec-clean, verify body shape) -> drop a gap.
2. LF4 build-verify (tsc + vite build + cap sync) -- proves the 3 shells assemble.
3. LF2 dead pages 1-by-1 (each = new scoped route+engine; coordinate with domain owner) starting with
   `ValueStreamPage`/`MachineDataAuditPage` (shop-floor, highest test-floor value).
4. LF1 scoped cam/prism/ai routes (security-allowlisted) with whiskey/india.
5. LF3 reverse-coverage audit.

_Artifacts: `scripts/audit-page-wiring.mjs` (+test 10/10) -> `state/shared/dashboards/PAGE-WIRING-AUDIT.{json,md}`._
