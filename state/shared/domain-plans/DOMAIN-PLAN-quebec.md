---
artifact: domain-buildout-plan
slot: quebec
galaxy: frontend-app
galaxy_dir: mcp-server/src/engines/frontend-app/
kienzle_pages:
  - Kienzle Audit & Rebrand.dc.html
  - Kienzle Backend Wiring Map.dc.html
backend_dispatchers:
  - prism_business
  - prism_realtime
  - prism_cam
  - prism_calc
  - prism_session
  - prism_memory
  - prism_knowledge
frontend_owner: quebec
status: draft
generated_by: quebec-plan-agent
generated_at: 2026-06-26
---

# DOMAIN BUILDOUT PLAN — QUEBEC (frontend-app)

> Finalized plan to take the frontend-app galaxy to **PhD-master depth**, then
> **test → simulate → validate → fine-tune**, then build/flesh out the Kienzle UI from the
> Claude-Design deck.
> Universal rails (R1–R16 · scrutiny 3-of-3 · units-first · no-stub · no-inline-constants ·
> canonical physics from `src/physics/constants.ts`) bind every step → `H:/prism/CLAUDE.md`.
> Parent: `state/shared/domain-plans/00-MASTER-ORCHESTRATION-PLAN.md`.

---

## §1 — Domain identity & scope

- **Owns:** Every user-facing surface that consumes PRISM dispatcher actions: Vite+React SPA
  shop-floor dashboard · operator kiosks · Capacitor 6 phone wrapper · customer-portal quote
  views · Polish/Spanish localization · WebSocket real-time feeds · offline-first service
  worker · component library · `src/api/` dispatcher call-site discipline.
- **Excludes:** Dispatcher logic (hotel/business) · G-code generation (echo) · toolpath data
  (kilo) · physics constants (oscar/calc) · bundle-size audit (alpha) · ERP engine logic
  (hotel). Quebec is a **pure HTTP consumer** of the `:3100` bridge — 0 AI engines locally.
- **Slot worktree:** `H:/prism-slot-quebec` · branch `slot/quebec`
- **Galaxy brain:** `mcp-server/src/engines/frontend-app/{CLAUDE,MEMORY,PATHS,TOOLBELT,AWARENESS}.md`

---

## §2 — Current state (verified, not assumed — R12)

- **Scaffolding:** PARTIAL — galaxy has CLAUDE.md + MEMORY.md + domain anchors wired
  (2026-05-28/06-09). PATHS.md + TOOLBELT.md listed in MEMORY.md; AWARENESS.md absent on
  disk (noted; AI-synergy audit score not yet run for this galaxy specifically).
- **Engines / dispatcher actions:** 0 domain-specific AI engines (pure HTTP consumer).
  Frontend source tree verified: `~156 pages` in `mcp-server/web/src/pages/` · component
  library in `src/components/` · Zustand stores in `src/stores/` · API wrappers in
  `src/api/` (business.ts, cam.ts, calc.ts, …) · `src/lib/{resilientFetch,
  OptimisticSyncManager, OfflineQueueManager}.ts` · `src/sw.ts` service worker.
  Key dispatchers consumed: `prism_business` (heaviest — portal + ERP + scheduling) ·
  `prism_realtime` (WebSocket) · `prism_cam` / `prism_calc` (G-code preview, feed/speed
  display) · `prism_session` · `prism_memory` (Qdrant similarity search).
- **Knowledge legs (PSN 11-leg):**
  - Obsidian brain: thin (synthesis at `knowledge/memories/patterns/frontend-app_synthesis.md`,
    advisory; 10 curated memories indexed)
  - Wiki: 707 entries tagged to this galaxy (good coverage of architecture, lessons, tribal)
  - Tribal: 24 tips matching keyword heuristic — thin; operator-localization gotchas and
    WebSocket debounce patterns are undercaptured
  - Memories: 10 curated files; cross-galaxy bridges well-documented
  - System-viz: wired (owned-by-slot + documented-by cross-substrate edges generated)
  - Engines/Algorithms/Formulas: N/A (pure consumer) — not a gap, by design
  - NN/GNN: no dedicated feature vectors (ghost node for frontend-app galaxy exists in graph)
  - PRISM-OS / PRISM-AI: AI-synergy audit score not yet verified; reasoning bridge wired
    (`scripts/lib/galaxy-reasoning-bridge.mjs`) with CAG + hybrid RAG ON by default
- **Known landmines (R12):**
  - Silent-zero regression: `200 OK` with `{result: null, error: "..."}` rendered as "0
    jobs" — recurring regression class per MEMORY.md §Known regression classes
  - Re-render storm: spindle-load WebSocket 10 Hz × 5 machines × N charts = 600 re-renders/s
    without debounce at hook/store layer (NOT component layer)
  - `useEffect` race on tab-switch without `AbortController` + request key — verified open
  - Polish character mis-encoding (`ą`/`ę`/`ł` corruption at Latin-1 storage boundary) —
    UTF-8 declaration required at every HTTP response header + storage write
  - English-only operator surfaces shipped to Polish/Spanish-primary JM Die shop floor —
    P0 safety failure; recurring regression
  - Pending merge status of `cqask/ui` + `mcp-cadquery/frontend` unverified since 2026-05-28
  - Kienzle Backend Wiring Map identifies 10 domains with backend-ready endpoints but NO UI
    (Shop-Floor Live, Scheduling, Inventory/Purchasing, Blueprint/OCR, CAD, CAM Strategy,
    Sales/RFQ, Accounting/GL, Maintenance/PM, Lean Toolkit) — the critical frontend path

---

## §3 — Deepening roadmap → PhD master

> PhD master here = mastery of frontend UX patterns for industrial operator surfaces at the
> depth of Apple HIG + Bloomberg Terminal information density + offline-first PWA/Capacitor
> engineering. The galaxy has no physics engines; "PhD" is applied UX/systems engineering.

- **Tribal tips to add:** current 24 → target 60. Missing clusters:
  - WebSocket debounce + store-layer patterns (not component-level) — 5 tips
  - `AbortController` + request-key dispatcher fetch races — 3 tips
  - Offline idempotency-key pattern for `OptimisticSyncManager` — 4 tips
  - Polish/Spanish localization gotchas (UTF-8 boundaries, i18n key discipline) — 6 tips
  - Capacitor 6 safe-area + native gesture wiring patterns — 5 tips
  - Silent-zero envelope guard pattern (`{result, error}` shape check) — 3 tips
  - `sw.ts` cache invalidation after dispatcher mutation — 4 tips
  Capture via: `prism_knowledge:tribal_capture slot=quebec domain=frontend-app`

- **Wiki entries to write/cross-link:**
  - `knowledge/wiki/lessons/frontend-silent-zero-dispatcher-envelope.md` — the `{result,error}`
    guard pattern with examples; cross-link from every api/*.ts lesson
  - `knowledge/wiki/lessons/websocket-debounce-store-layer.md` — 10 Hz storm root cause + fix
  - `knowledge/wiki/architecture/capacitor6-safe-area-anatomy.md` — env() vars + MobileSafeArea
  - `knowledge/wiki/lessons/offline-idempotency-optimistic-sync.md` — double-submit class
  - `knowledge/wiki/architecture/kienzle-ui-gap-build-order.md` — the 10 UI gaps from the
    Backend Wiring Map with endpoint references and page targets

- **Memories to write:**
  - `reference/reference_quebec_kienzle_wiring_map_2026_06_26.md` — the 10 UI gaps + build
    order from `Kienzle Backend Wiring Map.dc.html` (endpoints live, UI missing)
  - `feedback/feedback_dispatcher_envelope_silent_zero.md` — standing doctrine for the
    200-OK-with-error regression class
  - `reference/reference_quebec_shopfloor_live_wiring_2026_06_26.md` — ShopFloorLivePage.tsx
    endpoint mapping after live-data wiring is confirmed

- **RAG corpus:** Primary corpus = `mcp-server/web/src/` (TSX/TS source) +
  `mcp-server/web/DESIGN.md` + the Kienzle `.dc.html` design files + Apple HIG excerpts
  (public) + `state/shared/specs/FLEET-IOS-REDESIGN-DOCTRINE-2026-06-09.md`. Target embed:
  all 156 pages + 10 Kienzle design slides summarized → `frontend-app_rag_corpus.jsonl`.

- **CAG cold-anchor:** Cache `CLAUDE.md` §3 (dispatcher quick-ref) + `DESIGN.md` token
  catalog + iOS design doctrine `FLEET-IOS-REDESIGN-DOCTRINE-2026-06-09.md` as the
  cold-tier CAG anchor via `scripts/lib/cag-router.mjs`. These are high-reuse, low-churn
  reference surfaces.

- **NN/GNN features:** The `ghost.galaxy.frontend-app` node in the system-viz graph needs
  feature vectors derived from: page count (156), tribal tip count (24→60 target), dispatcher
  action call-sites per api/*.ts, test coverage %, PSN leg health scores. Owner: india for
  retrain; this galaxy populates the feature manifest.

- **LoRA dataset:** `frontend-app_lora_train.jsonl` — instruction pairs from:
  (1) verified tribal tip Q&A (dispatcher envelope guard, debounce pattern, localization);
  (2) Kienzle `.dc.html` design intent → TSX implementation mappings;
  (3) Playwright E2E failure → fix pairs (the adversarial split). Target 200 train / 40 test.
  Emit with `PRISM_GALAXY_BRIDGE_LORA_EMIT=1`; india trains; promote IFF eval gate passes.

- **Engineered loop + cron:** Nightly (3:17 AM local) `mine-galaxy-transcripts.mjs` over
  quebec slot transcripts → Ollama qwen2.5-coder:32b summarize → new tribal tips appended
  → `prism_knowledge:tribal_capture` → wiki synthesis updated. Acceptance signal: tribal
  count ≥ 60 AND wiki entries for all 10 Kienzle UI gap domains present. Weekly (Sunday
  2:22 AM) Playwright E2E regression sweep → failures → LoRA augmentation.

- **Ollama offload:** Route all TSX lint / component explanation / Playwright failure summary
  / design-vs-implementation diff to `qwen2.5-coder:32b` (free on Blackwell). Deep UX
  reasoning (localization architecture, accessibility audit) → `gpt-oss:120b`. Reserve
  Claude for cross-galaxy integration decisions and safety-string localization review.

---

## §4 — Test plan (real assertions — R9)

- **Unit — core lib engines (reference-value tests):**
  - `resilientFetch.test.ts`: assert retry fires on 503 after ≤ 200ms; timeout throws
    `DispatcherError` not raw `TypeError`; offline detection sets `navigator.onLine=false`
    guard. Reference: `src/lib/resilientFetch.ts` contract.
  - `OptimisticSyncManager.test.ts`: idempotency-key UUID uniqueness (assert ≠ on 1000
    calls); double-submit with same key → deduplicated (1 POST not 2); offline queue drains
    in FIFO order on reconnect.
  - `OfflineQueueManager.test.ts`: enqueue 50 mutations → assert drain order; corrupt entry
    skipped + error logged (not thrown); queue bounded at 500 entries (adversarial).

- **Integration — through the dispatcher (not the singleton):**
  - `businessApi.integration.test.ts`: `portal_create_token` action + Zod schema round-trip;
    assert `{result, error}` envelope is always checked before the caller can access `.data`;
    `portal_validate_token` with expired token → `DispatcherError`, NOT silent null.
  - `realtimeDispatcher.integration.test.ts`: `ws_room_send` with room `"VMC-01"` → assert
    message arrives on the matching subscriber; `"vmc01"` (wrong case) → 0 events received
    (the known regression).
  - `shopFloorLivePage.integration.test.ts`: `getShopFloorSnapshot` + `getActiveMachineJobs`
    → assert rendered OEE numeric ≥ 0 and ≤ 100; downtime Pareto top-5 bars sum ≤ total.

- **E2E (Playwright, real JM Die data via `:3100`):**
  - `shopFloorLive.e2e.ts`: navigate `/shop-floor-live` → assert ≥ 1 machine card renders
    with live `oee` value from `getShopFloorSnapshot`; assert Polish locale string present
    when `navigator.language = 'pl'`.
  - `customerPortal.e2e.ts`: `portal_create_token` → token in response → portal page loads
    with `portal_quote_view` data populated; `portal_validate_token` with stale token → 401
    error boundary rendered (not blank page).

- **Coverage floor per test file:**
  Happy path + ≥3 failure modes + ≥2 adversarial + ≥3 spanning configs:
  - Failure: (1) MCP bridge down → resilientFetch falls to offline queue; (2) `200 OK`
    `{error:"..."}` → DispatcherError thrown; (3) WebSocket room mismatch → 0 events
  - Adversarial: (1) `NaN` in OEE numeric field → renders "—" not "NaN"; (2) 10,000-item
    job list → `<ResponsiveTable>` virtualizes, no DOM freeze
  - Spanning configs: (1) Polish locale + UTF-8 boundary; (2) iPhone SE 375×667 viewport;
    (3) offline + reconnect sequence

- **Target test files to add/extend:**
  `src/__tests__/resilientFetch.test.ts` · `src/__tests__/OptimisticSyncManager.test.ts` ·
  `src/__tests__/OfflineQueueManager.test.ts` · `src/__tests__/businessApi.integration.test.ts` ·
  `e2e/shopFloorLive.e2e.ts` · `e2e/customerPortal.e2e.ts`

- **Runner:** `cd mcp-server/web && rtk npx vitest run src/__tests__/` for unit/integration;
  `rtk npx playwright test e2e/` for E2E (requires `:3100` + vite dev server). CI gate green.

---

## §5 — Simulation plan

- **What to simulate:** UI state-machine dry-runs for the 5 highest-impact live-data flows:
  WebSocket telemetry storm · offline-then-reconnect mutation drain · dispatcher envelope
  error propagation · Polish locale fallback chain · Capacitor 6 safe-area at 5 viewports.
  No physics simulation (pure UI consumer); simulation = controlled Playwright scenario
  replay with mock dispatcher responses.

- **Tools:** Playwright MCP page simulation + Vitest with `vi.mock` for `resilientFetch`;
  `prism_realtime:ws_stats` for real connection health check; manual device emulation via
  `devices['iPhone SE']` / `devices['Pixel 7']` in `playwright.config.ts`.

- **Scenarios:**
  1. **WebSocket storm:** 5 machines × 10 Hz × 30s → assert Zustand store update count ≤
     150 (debounce target: ≤ 1 update/200ms per machine per store slice)
  2. **Offline queue drain:** enqueue 20 mutations during `navigator.onLine=false` → restore
     → assert all 20 POST within 5s; assert idempotency: replay same queue → 0 duplicate POSTs
  3. **Envelope-error propagation:** mock `getShopFloorSnapshot` returning `{error:"timeout"}`
     → assert `<ErrorBoundary>` catches; assert NO silent "0 machines" render
  4. **Polish locale + UTF-8:** `navigator.language='pl'` → assert `ą`/`ę`/`ł` in alarm
     decode strings render correctly; assert no `?` replacement characters
  5. **iPhone SE viewport (375×667):** ShopFloorLivePage.tsx → assert all CTAs ≥ 44pt tap
     target; assert no horizontal scroll; assert bottom-safe-area respected

- **Pass criteria:**
  - Storm: store update count ≤ 150 over 30s (not 1500)
  - Queue drain: 100% of mutations POSTed, 0 duplicates, latency ≤ 5s on reconnect
  - Envelope error: `<ErrorBoundary>` renders within 500ms; NO blank/zero render
  - Polish: 0 `?` replacement characters in any operator-facing string
  - Mobile: 0 elements with tap target < 44px; 0 horizontal scrollbars at 375px

---

## §6 — Validation plan (live data + numbers — R12/R15)

- **Live-data validation:** Run against JM Die's live `:3100` bridge:
  - `getShopFloorSnapshot` → verify response contains `oee` numeric in `[0,100]` for each
    of the 15 production machines; report machine count returned vs JM Die's 15
  - `getActiveMachineJobs` → verify ≥ 1 active job present during production hours
  - `portal_create_token` + `portal_quote_view` → verify a real quote payload renders
    (cite quote ID used in test run)

- **Acceptance gates:**
  - OEE parity: page-rendered OEE value must match `prism_business:getShopFloorSnapshot`
    `oee` field ± 0.1% (no rounding loss in display layer)
  - Payload fidelity: `portal_quote_view` rendered total must match dispatcher `totalCost`
    field exactly (zero tolerance — financial display)
  - First-paint (cold cache): ≤ 3s on a 10 Mbps connection (measured via Playwright
    `networkidle` timing — the 3s cold-boot budget from MEMORY.md §Standing focus)
  - Localization coverage: 100% of operator-visible strings in `/shop-floor-live` page
    have Polish translation keys present (`pl.json` coverage = 100% of English keys)

- **Safety gate:** `prism_safety:validate_physics` not directly applicable (pure UI);
  however: alarm decode strings and E-stop confirmation dialogs are safety-critical operator
  surfaces — validate via bilingual Playwright screenshot comparison (Polish + English
  side-by-side) before any merge touching alarm/fault text.

- **Parity probe:** For every numeric value rendered on a page:
  `rendered_value == dispatcher_response[field]` with zero intermediate transform loss.
  Specifically: OEE %, job cost totals, tool life remaining, spindle load % — assert
  1:1 with backend. Any transform (e.g. `* 100` for percentage) must be tested to survive
  `0`, `1`, `NaN`, `Infinity` inputs.

---

## §7 — Fine-tune loop (results → retrain)

- **Outcome capture:** On every E2E failure or Playwright regression:
  `xproc_outcome_publish {slot:'quebec', domain:'frontend-app', outcome:'fail', detail:'...'}`.
  Store to `mcp-server/data/state/frontend-app-outcomes.jsonl` (append-only, schemaVersion).

- **LoRA:** Playwright failure → root-cause summary (Ollama qwen2.5-coder:32b) →
  instruction pair appended to `frontend-app_lora_train.jsonl` →
  india retrains → promote IFF eval gate: BLEU ≥ 0.65 on the frontend-app held-out test
  split AND manual spot-check of 5 pairs by operator.

- **RAG/CAG:** After each verified UI fix:
  - New tribal tip captured → `prism_knowledge:tribal_capture` → re-embed corpus
  - New wiki entry written → `wiki-ingest` → re-embed
  - `DESIGN.md` token additions → refresh CAG cold-anchor via `scripts/lib/cag-router.mjs`

- **NN/GNN:** After reaching tribal tip target (60) and test coverage floor:
  update `frontend-app` ghost node feature vector (tribal_count, test_coverage, page_count,
  dispatcher_callsite_count) → refpool entry → india retrain IFF AUROC ≥ 0.78 / macro-F1
  ≥ 0.55 / Brier ≤ 0.15.

- **Trigger + cadence:**
  - LoRA augment: nightly cron (3:17 AM) if `frontend-app-outcomes.jsonl` has ≥ 5 new
    failure rows since last run
  - RAG re-embed: on any new tribal tip or wiki entry (event-driven via stop hook)
  - GNN retrain: weekly (Sunday 2:22 AM), promoted only if AUROC gate met

---

## §8 — Frontend build (Kienzle Claude-Design rollout)

- **Assigned Kienzle pages:**
  1. `Kienzle Audit & Rebrand.dc.html` — design identity doctrine (Space Grotesk + Archivo +
     JetBrains Mono · ember-pulse animation · Kienzle logo mark · `#FF5A2B` accent · dark
     `#070809` / `#0A0B0D` surface). This is NOT a buildable screen — it is the **design
     language source** for the brand token set. Extract: accent `#FF5A2B` (map to
     `--color-kienzle-accent` token in `src/index.css`); logo SVG geometry; font stack.
  2. `Kienzle Backend Wiring Map.dc.html` — maps 22 backend domains to build status.
     Defines the **10 UI-gap screens** to build and their endpoint sets (see below).

- **Priority UI gap → target page mapping (Codex Page Protection — reuse first):**

  | Kienzle Gap | Existing Page to Extend | Key Endpoints |
  |---|---|---|
  | Shop-Floor Live | `ShopFloorLivePage.tsx` (EXISTS — wire to live data) | `getShopFloorSnapshot` · `getActiveMachineJobs` · `getDowntimePareto` · `analyticsOEETrend` · `getShiftCountdown` |
  | Scheduling & Capacity | `CapacityPlanningPage.tsx` (EXISTS — extend) | `schedulingJobShop` · `capacityAllLoads` · `capacityBottlenecks` · `batchGroup` · `batchSequence` |
  | Inventory / Purchasing | `InventoryPage.tsx` (EXISTS — extend) | `inventoryEOQ` · `inventoryABC` · `purchasingRecommend` · `poCreate` · `poList` · `receivingLog` |
  | Blueprint / OCR Intake | `BlueprintQuotePage.tsx` (EXISTS — extend) | `wireEdmOcr` · `wireEdmParseGeometry` |
  | CAD / Feature Recognition | `CADAIStatePage.tsx` (EXISTS — extend) | `wireEdmParseGeometry` (STEP viewer) |
  | CAM Strategy | `CamStrategyPage.tsx` (EXISTS — extend) | `camDispatcher` (2476 routes) · `submit*Wizard` |
  | Sales: RFQ / Pipeline | `CustomersPage.tsx` + `CommissionTrackerPage.tsx` (EXTEND) | `rfqList` · `rfqAssign` · `pipelineForecast` · `creditReview` |
  | Accounting / GL | `GeneralLedgerPage.tsx` (EXISTS — wire to live data) | `glChartOfAccounts` · `glJournalEntry` · `glTrialBalance` · `glIncomeStatement` |
  | Maintenance / PM | `EquipmentAssetPage.tsx` (EXISTS — extend) | `pmSchedules` · `maintenanceWorkOrders` · `pmGenerateWorkOrder` |
  | Lean Toolkit | `A3ReportPage.tsx` (EXISTS — extend) | `getKanbanBoard` · `getValueStreamData` · `submitRootCauseAnalysis` · `analyticsOEELosses` |

  **Zero net-new pages required for the 10 UI gaps** — every gap maps to an existing page.
  The Kienzle Backend Wiring Map confirms: "~0 net-new endpoints needed"; same applies to
  pages. Wire, extend, and wire-to-live-data before creating anything new.

- **Backend wiring per page:**
  All calls route through `mcp-server/web/src/api/<domain>.ts` wrapper →
  `src/lib/resilientFetch.ts` → `http://127.0.0.1:3100/api/v1/<action>`. Pattern per
  Kienzle Wiring Map: swap `renderVals()` demo arrays for `componentDidMount` fetch →
  store result in Zustand slice → keep same prop names → `PrismResponse.data` mapped onto
  props. New `src/api/shopFloor.ts` + `src/api/scheduling.ts` wrappers if absent; reuse
  `src/api/business.ts` for all `prism_business` actions.

- **Design language:** iOS fleet language per `web/DESIGN.md` tokens + Kienzle accent
  `#FF5A2B` as `--color-kienzle-accent` (NOT inlined). Font stack: Space Grotesk (headings)
  · Archivo (body) · JetBrains Mono (numerics/G-code) — matches `.dc.html` exactly.
  Critically-damped spring (`stiffness: 500 / damping: 34`) for press states. Dark canonical
  (`#070809` / `#0A0B0D`). 44pt tap targets. `<MobileSafeArea>` wrapper mandatory.
  `<ErrorBoundary>` on every page. Never inline hex/px — reference `DESIGN.md` token names.

- **Build/verify loop:** Edit → `cd mcp-server/web && rtk npx vite build` → Playwright
  screenshot at: desktop 1440×900 + iPhone 14 390×844 + Pixel 7 412×915 → compare to
  `.dc.html` intent → list concrete gaps → iterate. Three screenshots per change minimum.

- **Acceptance:** Page renders live data from `:3100` (not demo arrays) · parity probe
  passes (§6) · 3-viewport screenshots match Kienzle design language · Polish locale active
  for all operator-facing strings · Playwright smoke test green.

---

## §9 — Dependencies & sequencing

- **Blocked by:**
  - `india` for LoRA training + GNN retrain (consumer of this galaxy's output files)
  - `hotel` (business dispatcher) for ERP actions (`prism_business` must be live at `:3100`)
  - `echo` (post-processor) for G-code preview data in any toolpath page
  - `oscar` (speed-feed) for feed/speed display values via `prism_calc`
  - `juliett` (database-expansion) for `prism_memory` Qdrant similarity search
- **Blocks:**
  - Customer-facing demo readiness (the Kienzle UI IS the demo surface for every galaxy's
    backend work — no demo without quebec's pages wired to live data)
- **Logical order (R13):**
  1. Wire `ShopFloorLivePage.tsx` to live `getShopFloorSnapshot` (highest daily value, §8 #1)
  2. Add dispatcher envelope guard + offline tests (§4 unit) — no page ships without the guard
  3. Extend remaining 9 UI-gap pages in Kienzle build order (steps 2–10 from `.dc.html`)
  4. Deepen tribal tips + wiki entries (§3) — continuous, driven by cron
  5. Run E2E + Playwright validation (§5/§6) — after pages are live-data-wired
  6. Feed outcomes to LoRA + GNN (§7) — last; requires validated ground truth from step 5

---

## §10 — Done-definition (R15: WIRE → TEST → VALIDATE → APPLY)

- [ ] WIRE: All 10 Kienzle UI-gap pages wired to their live `:3100` dispatcher endpoints
      in the same commit; `src/api/<domain>.ts` wrappers exist for each; `App.tsx` routes
      registered; no demo-array data in any shipped page.
- [ ] TEST: Dispatcher envelope guard tested in every `src/api/*.ts` wrapper; unit tests
      for `resilientFetch` + `OptimisticSyncManager` + `OfflineQueueManager` pass with
      happy + ≥3 failure + ≥2 adversarial + ≥3 spanning configs; E2E Playwright green.
- [ ] VALIDATE: Live-data numbers reported (OEE ± 0.1% parity; first-paint ≤ 3s;
      Polish locale 100% key coverage; 0 horizontal scroll at 375px; 0 tap targets < 44pt).
- [ ] APPLY: Tribal tip count ≥ 60; wiki entries for all 10 Kienzle gap domains written;
      `frontend-app_lora_train.jsonl` populated ≥ 200 pairs; nightly deepening cron live;
      Kienzle brand tokens (`--color-kienzle-accent`, font stack) in `src/index.css`.
- [ ] Per-file 2-arm scrutiny on every new/extended `.tsx` + `api/*.ts` + test file;
      3-of-3 Stop gate on every session.
