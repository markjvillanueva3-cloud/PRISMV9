# PRISM v9 Web Frontend Data Architecture Review

## Scope
67 web pages, 35 API client modules, 32 hooks, 4 contexts, 11 static data files, 73 MCP dispatchers behind 32 Express route modules (322 endpoints).

---

## FINDING 1: DUPLICATE HTTP CLIENTS -- CRITICAL

**Severity: CRITICAL (Architectural)**

There are **5 independent `fetch` wrapper implementations**, each with its own timeout, error handling, and response parsing:

| File | BASE_URL | Timeout | Auth Token | Error Class |
|------|----------|---------|------------|-------------|
| `api/client.ts` | `/api/v1/sfc` | 15s | None | `ApiRequestError` |
| `api/shop.ts` | `/api/v1` | None | `localStorage prism_token` | `ShopApiError` |
| `api/data.ts` | `/api/v1/data` | 15s | None | generic `Error` |
| `api/erp.ts` | `/api/v1/erp` | 30s | None | `ApiRequestError` (imported from client.ts) |
| `api/auth.ts` | `/api/v1/auth` | 10s | None | generic `Error` |
| `api/speedfeed.ts` | `/api/v1/speed-feed` | 30s | None | generic `Error` |
| `api/machineLive.ts` | `/api/v1/machine-live` | 15s | None | generic `Error` |
| `api/cost.ts` | `/api/v1/cost` | 15s | None | generic `Error` |
| `api/ppg.ts` | `/api/v1/ppg` | 30s | None | `ApiRequestError` |
| `api/settings.ts` | `/api/v1/settings` | None | None | silent failure |

**Problems:**
- `client.ts` hardcodes its BASE_URL to `/api/v1/sfc` -- it is NOT a reusable client despite its generic name. Only `api/sfc.ts` uses it.
- `shop.ts` has a completely separate 466-line client with its own `request()` function. It is the ONLY module that sends the auth Bearer token. Every other API module makes unauthenticated requests.
- At least 8 modules define their own private `post()` / `get()` functions with copy-pasted timeout logic.
- Error handling is inconsistent: some throw `ApiRequestError`, some `ShopApiError`, some generic `Error`.
- `settings.ts` silently returns empty objects/null on failure -- no error reporting at all.

**Recommendation:** Create a single `api/httpClient.ts` with configurable base URL, automatic auth token injection from AuthContext, consistent error types, and centralized retry/timeout logic. All 35 API modules should use it.

---

## FINDING 2: `useApiCall` HOOK DUPLICATED 15+ TIMES -- HIGH

**Severity: HIGH (Code Quality / Maintainability)**

The `AsyncState<T>` interface and `useApiCall<TReq, TRes>` generic hook pattern is **copy-pasted identically** in:

- `useSfc.ts`, `useData.ts`, `useSpeedFeed.ts`, `useAuth.ts`, `useCost.ts`, `useMachineLive.ts`, `useTelemetry.ts`, `useAdmin.ts`, `useCompliance.ts`, `usePipeline.ts`, `useErp.ts`, `usePpg.ts`, `useLearning.ts`, `useCam.ts`, `useCncOps.ts`, `useDiagnosis.ts`, `useEdm.ts`, `useForming.ts`, `useGrinding.ts`, `useIntegrations.ts`, `useKnowledgeExt.ts`, `useMechanical.ts`, `useQuality.ts`, `useSafety.ts`, `useThermal.ts`, `useTurning.ts`, `useVibration.ts`, `useWelding.ts`

Each file re-declares `AsyncState<T>`, `useApiCall`, and sometimes `useGetCall` with identical logic. Some have subtle differences (e.g., `useSfc.ts` passes `AbortSignal` to the API function; `useData.ts` does not but still creates an `AbortController` that it never uses).

**Recommendation:** Extract to a single `hooks/useApi.ts`:
```typescript
// hooks/useApi.ts
export function useApiCall<TReq, TRes>(...) { ... }
export function useApiQuery<TRes>(...) { ... }  // auto-fetch on mount
export function useGetById<TRes>(...) { ... }
```

---

## FINDING 3: AUTHENTICATION NOT PLUMBED TO API CALLS -- CRITICAL (Security)

**Severity: CRITICAL (Security)**

`AuthContext.tsx` properly manages JWT tokens (login, refresh, localStorage persistence). However:

- Only `api/shop.ts` reads `localStorage.getItem('prism_token')` and sends `Authorization: Bearer`.
- The remaining 34 API modules (sfc, erp, ppg, data, cost, speedfeed, machineLive, telemetry, etc.) **make completely unauthenticated requests**.
- The MCP server route registry applies `optionalToken` middleware globally, meaning the server ACCEPTS tokens but the client never sends them for most endpoints.
- There is no 401 interceptor: if a token expires mid-session, API calls will fail with opaque errors rather than triggering a re-auth flow.

**Impact:** Any API endpoint that requires authentication will silently fail. Multi-tenant data isolation is broken if the server relies on the token to identify the tenant.

**Recommendation:**
1. Centralized HTTP client that always injects the token from AuthContext/localStorage.
2. Add a 401 response interceptor that calls `authApi.refresh()` and retries, or redirects to login.
3. Audit which server routes require authentication vs. are public.

---

## FINDING 4: STATIC DATA BUNDLES vs SERVER DATA -- HIGH

**Severity: HIGH (Architecture)**

The `web/src/data/` directory contains 11 hardcoded data files totaling approximately 1800 lines of manufacturing reference data:

| File | Records | Content |
|------|---------|---------|
| `materials.ts` | 29 materials | ISO groups, hardness, tensile strength, machinability |
| `machines.ts` | 9 machines | Haas, DMG MORI, Mazak, Okuma specs |
| `tools.ts` | 13 tools + 9 coatings | Endmills, face mills, drills, inserts |
| `operations.ts` | 47 operations in 13 categories | Milling, turning, drilling, grinding, EDM, laser, waterjet |
| `machineModes.ts` | 13 machine modes | Mill, lathe, grinding, EDM, laser, waterjet configs |
| `camSoftware.ts` | 5 CAM packages | Mastercam, Fusion 360, SolidCAM, HSMWorks, GibbsCAM |
| `toolpathStrategies.ts` | 21 strategies + 4 priorities | Adaptive, trochoidal, peck drill, turning strategies |
| `controllers.ts` | 22 controllers + 9 spindles + 9 ATCs | Fanuc, Siemens, Haas, Mazak, Heidenhain, EDM controllers |
| `fixtures.ts` | 19 fixture types | Vises, chucks, collets, plates |
| `toolHolders.ts` | 14 tapers + 12 holders + 10 insert geometries + 7 coatings + 4 grades | Complete toolholding reference |
| `stockShapes.ts` | 7 shapes | Plate, round, hex, tube, flat bar, angle |

**Problems:**
- This is SHOP-SPECIFIC DATA that will vary per customer/tenant. A shop with 50 machines cannot use a hardcoded 9-machine list.
- The data is baked into the JS bundle. Any change requires a code deploy.
- The MCP server already has `dataDispatcher` with material/tool/machine search endpoints, AND `api/data.ts` + `hooks/useData.ts` exist to call them. But `SfcCalculatorPage.tsx` imports `MATERIALS` directly from `data/materials.ts` instead of using `useDataSearchMaterials()`.
- The `data/` directory effectively shadows the server's data API, creating two sources of truth.

**What should be static (bundled):** ISO material group codes/colors, operation category taxonomy, UI config (stock shape field definitions, taper type labels). These are structural/UI metadata that rarely changes.

**What should come from the server:** Actual material specs (hardness, tensile), machine inventory, tool inventory, CAM software config, controller/spindle/ATC configurations, fixture inventory. These are shop-specific and must be per-tenant.

**Recommendation:**
1. Keep `data/` files as FALLBACK/SEED data for offline mode or initial load.
2. Primary data flow: server API -> cache -> UI components.
3. Components like `SmartMaterialSelector` should call `useDataSearchMaterials()` with the static `MATERIALS` as initial state.

---

## FINDING 5: NO CACHING STRATEGY -- HIGH

**Severity: HIGH (Performance)**

There is zero client-side caching:

- No HTTP cache headers (Cache-Control, ETag, Last-Modified) handling.
- No in-memory cache for reference data (materials, machines, tools never change during a session).
- No React Query, SWR, or similar library for stale-while-revalidate patterns.
- Every hook creates fresh state on mount. Navigate away from SFC page and back = all data gone, must re-fetch.
- `useSettings()` manually caches in localStorage but this is ad-hoc, not a pattern.
- `LearningContext` and `PpgContext` autosave to localStorage every 30s, but this is for form persistence, not data caching.

**Impact:** Unnecessary network traffic, poor perceived performance, data loss on navigation.

**Recommendation:** Adopt a query cache layer (e.g., TanStack Query / React Query) that provides:
- Automatic caching with configurable stale times
- Background refetching
- Optimistic updates
- Request deduplication (critical when multiple components mount and each calls the same API)

---

## FINDING 6: WEBSOCKET INFRASTRUCTURE EXISTS BUT IS BARELY WIRED -- MEDIUM

**Severity: MEDIUM (Missing Integration)**

Three WebSocket touch points exist:

1. **`hooks/useWebSocket.ts`** -- Generic, well-built hook with auto-reconnect, exponential backoff, room subscriptions, typed messages. Supports `machine:status`, `job:progress`, `tool:wear`, `safety:alert`, etc. **Not imported anywhere in the codebase.**

2. **`contexts/ErpContext.tsx`** -- Has its own independent WebSocket connection to `/ws/erp`, handling `job_update`, `oee_update`, `jobs_snapshot`, `oee_snapshot` messages. Uses a custom reconnect (fixed 5s delay, no exponential backoff). Does NOT use `useWebSocket.ts`.

3. **MCP Server** -- Route registry comment mentions "WebSocket handler at /ws (6 channels)".

**Problems:**
- Two independent WebSocket implementations that don't share a connection.
- The generic `useWebSocket` hook (the better implementation) is unused.
- Machine live pages, telemetry pages, safety dashboard have no real-time updates despite WebSocket events being defined for them.
- No WebSocket connection management at the app shell level.

**Recommendation:**
1. Mount a single `WebSocketProvider` at the app shell level, using the existing `useWebSocket` hook.
2. Refactor `ErpContext` to consume from the shared provider rather than managing its own socket.
3. Wire real-time updates to: MachineLivePage, TelemetryPage, SafetyDashboard, ShopDashboard.

---

## FINDING 7: INCONSISTENT PAGE DATA PATTERNS -- MEDIUM

**Severity: MEDIUM (Architecture Consistency)**

Pages get data in at least 4 different ways:

**Pattern A: Static imports only (no server calls)**
- `SfcCalculatorPage.tsx` imports `MATERIALS`, `getOperationById`, `CUTTING_PRIORITIES`, etc. directly from `data/` files. Only the final "Calculate" button calls the server.

**Pattern B: Hook-based API calls**
- Pages using `useErpQuoteGenerate()`, `useSfcCalculate()`, etc. Each page manually manages loading/error state.

**Pattern C: Context providers**
- `/erp/*` routes wrap in `ErpProvider` which manages WebSocket state and shared job data.
- `/learning/*` routes wrap in `LearningProvider` which manages localStorage-backed state.
- PPG pages use `PpgContext` for editor state persistence.

**Pattern D: Direct shop.ts function calls**
- `shop.ts` exports 120+ individual functions. Pages import specific functions and call them directly, managing their own state.

**Problems:**
- No consistent "how does a page get its data?" answer.
- Pages that should share data (e.g., material lists across SFC, SpeedFeed, CostEstimator) each fetch or import independently.
- Only 4 contexts exist for 67 pages. Most pages are isolated data islands.

---

## FINDING 8: 73 DISPATCHERS vs 35 API CLIENTS -- COVERAGE GAP -- HIGH

**Severity: HIGH (Feature Gap)**

The MCP server has 73 dispatchers and 32 Express route modules (322 endpoints). The web frontend has only 35 API client modules covering a subset:

**Dispatchers WITH frontend wiring:**
sfc, data, auth, erp, ppg, learning, cost, speedfeed, machineLive, telemetry, cam, cncOps, compliance, diagnosis, edm, forming, grinding, integrations, knowledgeExt, mechanical, pipeline, quality, safety, thermal, turning, vibration, welding, admin, billing, settings, shop (super-module), viewer, docLearn

**Dispatchers WITHOUT frontend API clients (not accessible from web):**
- `adaptiveControlDispatcher` -- no `api/adaptiveControl.ts`
- `atcsDispatcher` -- no web client
- `autoPilotDispatcher` -- no web client
- `automationDispatcher` -- no web client
- `autonomousDispatcher` -- no web client
- `bridgeDispatcher` -- partially via `shop.ts`
- `cadDispatcher` -- no `api/cad.ts` (routes exist server-side but no frontend client)
- `calcDispatcher` -- no web client
- `contextDispatcher` -- no web client
- `cplDispatcher` -- no web client
- `devDispatcher` -- no web client
- `feasibilityDispatcher` -- no web client
- `fiveAxisDispatcher` -- no web client
- `fluidThermalDispatcher` -- no web client (thermal.ts is different)
- `formingCastingDispatcher` -- partial via forming.ts
- `generatorDispatcher` -- no web client
- `gsdDispatcher` -- no web client
- `guardDispatcher` -- no web client
- `hookDispatcher` -- no web client
- `industryDispatcher` -- no web client
- `intelligenceDispatcher` -- no web client
- `knowledgeDispatcher` -- no web client (knowledgeExt is different)
- `l2EngineDispatcher` -- no web client
- `machineSetupDispatcher` -- no web client
- `manusDispatcher` -- no web client
- `materialProcessingDispatcher` -- no web client
- `memoryDispatcher` -- no web client
- `monitoringDispatcher` -- no web client
- `multiOpDispatcher` -- no web client
- `nlHookDispatcher` -- no web client
- `omegaDispatcher` -- no web client
- `orchestrationDispatcher` -- no web client
- `pfpDispatcher` -- no web client
- `processControlDispatcher` -- no web client
- `productDispatcher` -- no web client
- `provenPipelineDispatcher` -- no web client
- `ralphDispatcher` -- no web client
- `realtimeDispatcher` -- no web client
- `schedulingDispatcher` -- no web client (schedule route exists but no frontend API)
- `scientificMathDispatcher` -- no web client
- `sessionDispatcher` -- no web client
- `shopPracticeDispatcher` -- no web client
- `skillScriptDispatcher` -- no web client
- `spDispatcher` -- no web client
- `tenantDispatcher` -- no web client
- `threadDispatcher` -- no web client
- `toolpathDispatcher` -- no web client
- `validationDispatcher` -- no web client

Roughly 48 dispatchers have no corresponding frontend API client.

**Impact:** Over half the MCP server's capabilities are unreachable from the web UI. Pages that exist (e.g., CAD viewer, scheduling) may be partially functional or using mock data.

---

## FINDING 9: LOADING/ERROR/EMPTY STATES ARE INCONSISTENT -- MEDIUM

**Severity: MEDIUM (UX)**

- All `useApiCall` hooks expose `{ data, loading, error }` -- this is good.
- However, the actual rendering varies by page:
  - `SfcCalculatorPage` shows "Calculating..." on the button + `ResultsDisplay` handles its own loading/error -- decent pattern.
  - `useSettings()` silently swallows all errors (`catch(() => {})`) -- settings failures are invisible.
  - Most hooks return `null` on error, not an error object, making it impossible for the UI to display contextual error messages.
  - There is no global error boundary or toast notification system.
  - Empty states (e.g., "no machines found", "no materials match") depend entirely on each component.

**Recommendation:** Create shared `<ApiErrorBanner>`, `<EmptyState>`, and `<LoadingSkeleton>` components used consistently across all pages.

---

## FINDING 10: `shop.ts` IS A 466-LINE GOD MODULE -- MEDIUM

**Severity: MEDIUM (Maintainability)**

`api/shop.ts` exports 120+ functions covering: ERP, quoting, HR, payroll, capacity planning, quality management, CRM, inventory, scheduling, batch optimization, financial analysis, reporting, tool management, document learning, and more.

**Problems:**
- Violates single-responsibility. A change to quoting logic requires editing a file that also handles payroll.
- Every import of any shop function pulls the entire module into scope.
- Uses `Record<string, unknown>` for parameters in 30+ functions -- no type safety.
- Has its own `request()` helper that duplicates logic from other API modules.

**Recommendation:** Break into domain-specific modules: `api/erp/quoting.ts`, `api/erp/hr.ts`, `api/erp/capacity.ts`, etc.

---

## FINDING 11: NO REQUEST DEDUPLICATION OR OPTIMISTIC UPDATES -- LOW

**Severity: LOW (Performance)**

- Multiple components on the same page calling the same API endpoint will make duplicate requests.
- No optimistic update pattern exists outside `ErpContext.updateJob()`.
- No request batching for related data (e.g., fetching material + tool + machine for a single SFC calculation could be one round-trip).

---

## ARCHITECTURAL RECOMMENDATIONS

### Phase 1: Foundation (Week 1-2)
1. **Unified HTTP client** (`api/httpClient.ts`) with auth injection, retry, 401 handling
2. **Shared `useApi` hook** replacing 28 duplicated implementations
3. **Error boundary + toast system** for consistent error UX

### Phase 2: Data Layer (Week 3-4)
4. **Adopt TanStack Query** for caching, deduplication, stale-while-revalidate
5. **Migrate static data to server-fetched with static fallbacks** (materials, machines, tools)
6. **Break `shop.ts` into domain modules** with proper TypeScript types

### Phase 3: Real-Time & Coverage (Week 5-6)
7. **App-level WebSocket provider** using existing `useWebSocket` hook
8. **Wire WebSocket events** to MachineLive, Telemetry, Safety, ShopDashboard
9. **Generate API clients for remaining 48 dispatchers** (automated from OpenAPI spec if available)

### Phase 4: Type Safety (Week 7-8)
10. **Replace `Record<string, unknown>` params** in shop.ts with proper request/response types
11. **End-to-end type sharing** between MCP server Zod schemas and frontend TypeScript types
12. **API client code generation** from the server's OpenAPI route (`/api/openapi`)

---

## SUMMARY TABLE

| # | Finding | Severity | Effort |
|---|---------|----------|--------|
| 1 | 5 duplicate HTTP clients, inconsistent error handling | CRITICAL | Medium |
| 2 | `useApiCall` hook duplicated 28 times | HIGH | Low |
| 3 | Auth token not sent on 34/35 API modules | CRITICAL | Medium |
| 4 | Static data that should come from server | HIGH | High |
| 5 | No caching strategy | HIGH | Medium |
| 6 | WebSocket exists but barely wired | MEDIUM | Medium |
| 7 | 4 different page data patterns | MEDIUM | High |
| 8 | 48/73 dispatchers have no frontend client | HIGH | High |
| 9 | Inconsistent loading/error/empty states | MEDIUM | Low |
| 10 | `shop.ts` is a 466-line god module | MEDIUM | Medium |
| 11 | No request deduplication or optimistic updates | LOW | Medium |
