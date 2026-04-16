# HANDOFF — INFRA-MS0 Session 2 Progress

## Session: INFRA Phase 3 Complete + Phase 5 Feedback Loop
**Timestamp:** 2026-04-08T00:42:00Z
**Status:** IN PROGRESS — 15/31 units done (~48%)

## Phases Completed
- **Phase 1: Data Foundation** — COMPLETE (prior session)
- **Phase 3: Auth & Security** — COMPLETE (this session: U-AUTH2 + U-AUTH3)
- **Phase 5: Calibration Feedback** — COMPLETE (this session: U-CAL1 + prior: U-CAL2, U-CAL3)
- **Phase 6: Observability** — COMPLETE (prior session)
- **Phase 10: Knowledge Graph** — COMPLETE (prior session: U-KG1, U-KG2)

## Units Completed This Session

### U-AUTH2: Redis-backed tier gate usage counters (Phase 3)
- Created `src/middleware/usageCounter.ts`: IUsageCounter interface + InMemory + Redis implementations
- Key schema: `prism:usage:{userId}:{feature}:{YYYY-MM-DD}` with midnight UTC TTL
- `trackUsage(feature)` middleware — increments on 2xx response finish
- `getUsageCounter()` singleton factory
- Modified `src/middleware/tierGate.ts`: requireTier now async, reads actual usage from Redis counter
- Modified `src/index.ts`: initUsageCounter() called during startup
- 38 new tests in `src/__tests__/infra-auth-tier-apikey.test.ts`

### U-AUTH3: API key auth against Postgres (Phase 3)
- Created `src/middleware/apiKeyAuth.ts`: verifyApiKey + verifyTokenOrApiKey middlewares
- SHA-256 key hashing (high-entropy keys, not passwords)
- `InMemoryApiKeyStore` for tests + fallback
- DB lookup via `api_keys JOIN users` with `last_used_at` update
- Key prefixes: `prism_sk_` (secret) / `prism_pk_` (publishable)
- Created `src/db/migrations/015-api-key-enhancements.sql`:
  - plan column on users (5 plans)
  - plan_override on api_keys
  - Hash index for O(1) key lookup
  - api_keys_active view with effective_plan

### U-CAL1: Calibration overrides in SpeedFeedOrchestrator (Phase 5)
- Modified `src/engines/SpeedFeedOrchestratorEngine.ts`:
  - Added `calibration_overrides` to OrchestratorInput (kc1_1, Taylor C/n, Vc, Ra, power factors)
  - Applied factors at 4 injection points: Vc, Kienzle Fc, Taylor tool life, surface finish Ra
  - Added `calibration_applied` field to OrchestratorResult
  - Formulas_used tracks calibration when active
- 10 new tests validating force increase, tool life adjustment, speed correction, Ra scaling

## Test Results
- infra-auth-redis-tokenstore.test.ts: 20 pass
- infra-calibration-actuals.test.ts: 26 pass (was 16, +10 U-CAL1)
- infra-auth-tier-apikey.test.ts: 38 pass (new)
- mcp-auth-http.test.ts: 2 pass
- prod-ms0-auth-middleware.test.ts: 29 pass
- **Total: 115/115 pass**

## Build
- 0 new TS errors (pre-existing only in core/hooks)

## Files Created
- `src/middleware/usageCounter.ts` — Redis-backed usage counter + trackUsage middleware
- `src/middleware/apiKeyAuth.ts` — API key auth middleware + InMemoryApiKeyStore
- `src/db/migrations/015-api-key-enhancements.sql` — plan columns + hash index
- `src/__tests__/infra-auth-tier-apikey.test.ts` — 38 tests

## Files Modified
- `src/middleware/tierGate.ts` — async requireTier with Redis usage lookup (INFRA-3-2)
- `src/engines/SpeedFeedOrchestratorEngine.ts` — calibration_overrides injection (INFRA-5-1)
- `src/__tests__/infra-calibration-actuals.test.ts` — +10 U-CAL1 tests
- `src/index.ts` — initUsageCounter() call
- `data/milestones/INFRA-MS0.json` — completed_units: 12 → 15

## Remaining (16 units across 5 phases)
- Phase 2: pgvector + embedding pipeline (3 units)
- Phase 4: Redis Streams event bus + OPC-UA (4 units)
- Phase 7: OpenAPI Swagger UI + Plugin SDK (4 units)
- Phase 8: K8s manifests + CI deploy (3 units)
- Phase 9: ONNX runtime + feature store (2 units)

## RESUME
Continue INFRA-MS0. Phase 3 and Phase 5 are now COMPLETE. Priority: Phase 7 (OpenAPI Swagger UI + Plugin SDK — 4 units) or Phase 2 (pgvector embeddings). Build PASS. 115 tests pass.
