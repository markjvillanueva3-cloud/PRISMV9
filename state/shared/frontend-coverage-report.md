# PRISM Web Frontend — Coverage Audit

**Generated:** 2026-06-25 15:08 UTC (scheduled task: web-frontend-coverage)
**Scope:** `H:/PRISM/mcp-server/web/src/pages/*.tsx` vs `H:/PRISM/mcp-server/src/routes/*.ts` (`/api/v1/`)
**Supersedes:** prior run 2026-06-22T17:14Z
**Method:** Static analysis — transitive import resolution (depth 3) from each page into `web/src/api/*`, hooks, and child components to detect `/api/v1`, `fetch()`, `WebSocket`, `EventSource`, `useQuery/useSWR/useMutation`; router-registration check against `App.tsx` + all files containing `<Route>` / `lazy()`.

---

## Headline Numbers

| Status | Count | Share |
|--------|-------|-------|
| **WIRED** (calls backend, directly or via api-layer/child) | 135 | 83.9% |
| **PARTIAL** (wired but contains TODO/stub/WIP markers) | 7 | 4.3% |
| **STATIC** (renders, no backend connection) | 5 | 3.1% |
| **ORPHAN** (component + tests exist, not in any router) | 14 | 8.7% |
| **TOTAL page components** | **161** | 100% |

**Frontend wiring coverage = 135 / 161 = 83.9%** (WIRED only).
Counting PARTIAL as backend-connected: 142 / 161 = **88.2%**.
Reachable-and-wired (excludes the 14 orphans entirely): 135 / 147 routed pages = **91.8%**.

> Note: the 45-page figure in CLAUDE.md is stale — the SPA now has **161 page components** (147 routed + 14 orphaned). The "partially wired" characterization is too pessimistic; the real gaps are concentrated in orphaned pages and the SVI dashboard, not in broad un-wiring.

---

## ORPHAN Pages (14) — built, even unit-tested, but NOT reachable by any user

Largest waste pocket: full page components (several with `__tests__` coverage) that no route renders. Highest-value to wire because the UI already exists.

| Page | Notes |
|------|-------|
| `MillStudioPage` | Full 6-step milling wizard (parity with LatheStudioPage); has E2E test. **High value.** |
| `LatheStudioPage` | Lathe studio wizard; referenced by MillStudioPage header comment only. **High value.** |
| `SwissPage` | Swiss/mill-turn programming surface — backend `prism_turning`/swiss pipeline exists. |
| `MillTurnPage` | Mill-turn multi-channel surface — backend pipeline exists. |
| `MachineDataAuditPage` | **Has a dedicated backend route** `/api/machine-audit` (real JM fleet audit) with zero way to reach it — double waste. |
| `LatheERPDashboard` | BI dashboard (U-LTH55), unit-tested, never routed. |
| `LathePrintToProgramPage` / `LathePrintToProgram` | Two lathe print-to-program variants, neither routed. |
| `CADRegressionDashboardPage` | Unit-tested; backend `/api/v1/cad-regression` is live. |
| `CADRegenerationDashboardPage` | CAD regen dashboard, unrouted. |
| `CADAIStatePage` | CAD AI state machine view, unrouted. |
| `QuoteFollowUpPage` | Unit-tested quote follow-up surface, unrouted. |
| `PrintDropPage` | Print-drop intake surface (uses WorkspaceRecoveryScaffold), unrouted. |
| `HotelPortalPage` | Hotel portal (backend `/api/v1/hotel-portal` is live) — orphaned; `HotelEmployeeHubPage` IS routed. |

All "references" found for these are in `__tests__/*` or source comments — none are router registrations.

---

## STATIC Pages (5) — no backend connection detected

| Page | Assessment |
|------|------------|
| `LandingPage` | Expected static (marketing). No action. |
| `MillingResultsPage` | Likely receives results via router state/props from MillingWizard rather than fetching — verify it isn't dropping data on refresh. |
| `WireEdmResultsPage` | Same pattern as MillingResultsPage (wizard hands off via state). |
| `PostProcessorPage` | Static shell; `PostProcessorGeneratorPage` is the wired sibling. Candidate for merge or wiring to `/api/v1` PPG routes. |
| `ValueStreamPage` | VSM board with no backend persistence — value-stream data is in-memory only. |

`LoginPage`/`SignupPage` classified WIRED (they call `/api/v1/auth`).

---

## PARTIAL Pages (7) — wired but carry TODO/stub/WIP markers

`CalculatorPage`, `JobsPage`, `KanbanBoardPage`, `MechanicalDesignPage`, `PayrollPage`, `PostProcessorStorePage`, `PricingPage`.

These reach the backend but contain explicit incompleteness markers (TODO/FIXME/"coming soon"/stub/hardcoded). Triage for gap-fill rather than wiring.

---

## Backend Routes With NO Frontend Consumer (12 of 78 mounted bases)

Backend capabilities currently invisible to users (exact mount-base string absent anywhere in `web/src`):

| Route base | Capability | Comment |
|------------|------------|---------|
| `/api/v1/agent` | Agent control | No UI surface. |
| `/api/v1/bridge` | Claude<->Codex bridge | Internal; UI optional. |
| `/api/v1/calibration` | INFRA-5-1 actuals ingestion + outlier detection | **High value** — feeds quoting accuracy; no UI to view/ingest. |
| `/api/v1/document` | Document service | `DocumentInboxPage` uses `/api/v1/inbox`, not this. |
| `/api/v1/drawing` | Drawing service | No consumer; PrintDrop/intake could use it. |
| `/api/v1/ext` | External integration (optimize/feedback/learning) | No UI. |
| `/api/v1/gsd` | Session lifecycle / GSD | Internal tooling. |
| `/api/v1/manus` | Manus surface | No UI. |
| `/api/v1/ralph` | Ralph autonomous loop | Internal. |
| `/api/v1/schedule` | Scheduling service | `SchedulingPage` is WIRED but to a different base — verify it isn't hitting a dead path. |
| `/api/v1/skill-script` | Skill-script runner | No UI. |
| `/api/v1/upload` | File upload | Likely used via constructed FormData paths; flagged because no literal base string found — **verify manually.** |

Plus the not-mounted/disabled: `/api/v1/puoa` (commented out — "file corrupted") and `createMachineAuditRouter` → `/api/machine-audit` IS mounted but its only consumer (`MachineDataAuditPage`) is orphaned.

> Caveat: detection is by exact base-string match. A page that builds the URL dynamically (template literal with a variable base) could consume a route the scan marks "unconsumed." `/api/v1/upload` and `/api/v1/schedule` are the two most likely such cases and should be hand-verified.

---

## SVI Dashboard Status — NOT DISPLAYED

- Backend exposes the full SVI surface in `src/routes/dev.ts`: `GET /api/v1/dev/svi/read`, `GET /api/v1/dev/svi/summary`, `POST /api/v1/dev/svi/compute` (all proxy `prism_dev` actions `svi_read` / `svi_summary` / `svi_compute`).
- **Zero frontend consumers.** No file under `web/src` references `dev/svi`, `svi/read`, or any SVI endpoint. (The only `svi` substring hits in `web/src` are false positives from `isVisible`/`isVitest` and one comment string.)
- Confirms `CODEX-SVI-AWARENESS.md` gap: the SVI (currently **1.5x10^46**, Psi reachability **100%**, per `SVI-compact.md` @ 2026-06-25T15:05Z) is computed and live on the backend but the operator has **no in-app view of it.**

---

## Highest-Impact Frontend Wiring Recommendations

1. **Route the 4 studio/program orphans** (`MillStudioPage`, `LatheStudioPage`, `SwissPage`, `MillTurnPage`) — complete, tested wizards whose backend pipelines already exist. Pure router-registration work; largest user-facing value per hour.
2. **Wire `MachineDataAuditPage` to its existing `/api/machine-audit` route** and register the route — a fully-built backend+frontend pair currently severed at the router. Near-zero-risk win.
3. **Build/route an SVI dashboard** consuming `/api/v1/dev/svi/summary` — closes the explicit CODEX-SVI-AWARENESS gap and gives the operator visibility into the metric the whole roadmap optimizes. Can reuse an existing dashboard page shell.
4. **Surface the calibration loop** (`/api/v1/calibration`) in the quoting UI (e.g. on `QuotingCalibrationHealthPage`, already WIRED) — outlier detection + actuals ingestion directly improve quote accuracy but are headless today.
5. **Route the 3 CAD dashboards** (`CADRegressionDashboardPage`, `CADRegenerationDashboardPage`, `CADAIStatePage`) — `/api/v1/cad-regression` is live; the regression dashboard is even unit-tested.
6. **Resolve the duplicate/dead statics**: merge `PostProcessorPage` into `PostProcessorGeneratorPage`; add persistence to `ValueStreamPage`; confirm `MillingResultsPage`/`WireEdmResultsPage` survive a page refresh (router-state-only handoff risks data loss).
7. **Hand-verify the 2 ambiguous "unconsumed" routes** (`/api/v1/upload`, `/api/v1/schedule`) before treating them as gaps — likely consumed via dynamic URLs.

---

## Method Caveats (R12 — fail-loud)

- "WIRED" means an API call is reachable through the import graph (depth <=3); it does **not** prove the endpoint returns correct data or that every feature on the page is connected — only that a backend connection exists.
- "ORPHAN" = not registered in any router file detected. A page reachable only through a runtime-computed route string could be misclassified; all 14 here had their non-router references inspected and confirmed to be tests/comments.
- Route-consumer matching is exact-string on the mount base; dynamically-constructed URLs can cause false "unconsumed" reports (flagged inline for `/upload` and `/schedule`).
- Counts are page components under `pages/*.tsx` (161); non-page `.ts` utilities (`postExportSafety.ts`, `recovery/recoveryUtils.ts`) were excluded.
