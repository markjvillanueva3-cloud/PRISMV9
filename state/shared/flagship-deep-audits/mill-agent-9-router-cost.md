# MILL Deep Audit — Agent 9: Router Fix + Cost/ERP Integration

**Status:** Router UNREGISTERED (BLOCKING) · Cost/ERP unconnected
**Router Fix:** 3 lines (trivial) · **Integration Score:** 0%

## PART A — Router Fix Status: UNREGISTERED ⚠

**File:** `H:/PRISM/mcp-server/src/routes/index.ts`

**CRITICAL FINDING:** `createMillingRouter` is **NOT imported and NOT registered**.

Evidence:
- Line 62: `import { createLatheTurningRouter } from "./latheTurning.js";` ✓
- Line 42: `import { createEdmRouter } from "./edm.js";` ✓
- **NO IMPORT** for `createMillingRouter` ✗
- Line 134: `app.use("/api/v1/lathe", createLatheTurningRouter(callTool));` ✓
- Line 132: `app.use("/api/v1/edm", createEdmRouter(callTool));` ✓
- **NO REGISTRATION** for `/api/v1/milling` ✗

`milling.ts` has `createMillingRouter` exported at line 71 with 12 endpoints (519 LOC) — fully implemented, just not wired into main app.

## PART B — The 3-Line Fix

**Location:** `H:/PRISM/mcp-server/src/routes/index.ts`

**Add at line 43 (with other route imports):**
```typescript
import { createMillingRouter } from "./milling.js";
```

**Add at line 133 (after EDM registration, before turning):**
```typescript
app.use("/api/v1/milling", createMillingRouter(callTool));
```

**3-Line Diff Summary:**
```
+ Line 43: import { createMillingRouter } from "./milling.js";
+ Line 133: app.use("/api/v1/milling", createMillingRouter(callTool));
```

No other changes needed.

## PART C — Milling Routes Endpoint Inventory

**File:** `routes/milling.ts` (519 LOC)

### 12 HTTP Endpoints

| # | Method | Path | Target | Auth | Lines |
|---|---|---|---|---|---|
| 1 | POST | `/upload` | CADFeatureRecognitionEngine | None | 75-120 |
| 2 | POST | `/wizard-submit` | MillMasterOrchestratorFacadeEngine | None | 123-289 |
| 3 | GET | `/result/:jobId` | In-memory jobStore | None | 292-313 |
| 4 | POST | `/calculate` | prism_cam:print_to_program_full | None | 316-326 |
| 5 | POST | `/validate` | prism_cam:print_to_program_validate | None | 329-336 |
| 6 | POST | `/speed-feed` | prism_calc:speed_feed_calc | None | 339-349 |
| 7 | POST | `/ai/wisdom` | MillMasterOrchestratorFacadeEngine | None | 356-381 |
| 8 | POST | `/ai/scientific` | MillMasterOrchestratorFacadeEngine | None | 384-409 |
| 9 | POST | `/ai/agi` | MillingAGIMasterEngine | None | 412-439 |
| 10 | POST | `/ai/adaptive` | MillMasterOrchestratorFacadeEngine | None | 442-465 |
| 11 | POST | `/ai/optimize` | prism_cam:toolpath_optimize | None | 468-481 |
| 12 | GET | `/ai/capabilities` | Static response | None | 484-515 |

### Critical Notes

**Auth Status: ALL 12 endpoints have NO authentication.** No `verifyToken`, `optionalToken`, or `requirePermission` middleware. **RISK:** Anyone can POST to `/upload`, `/wizard-submit`, `/calculate` without auth.

**Recommendation:** Add `optionalToken` middleware at route mount point (matching `/api/v1/edm` pattern in edm.ts line 16).

## PART D — Mill Cost & ERP Integration: 0% WIRED

### Cost Engines: NONE Mill-Specific

```bash
$ grep -i "mill.*cost" mcp-server/src/engines/*.ts
ZERO matches
```

- No `MillCostEngine.ts`
- No `MillJobCostEngine.ts`
- No `MillCycleTimeEngine.ts`

**Comparison to WEDM:** WEDM has 8 dedicated cost engines (2,349 LOC). Mill has 0.

### Cost Action Wired to Missing Engine

`mill_quick_cost_estimate` action (millDispatcher line 200) calls:
```typescript
const result = await callOrThrow(await getEngine("optimizer"),
  ["estimateCost"], params, "MillProgramOptimizerEngine");
```

**Problem:** `MillProgramOptimizerEngine` does NOT exist in `src/engines/`. Action returns error.

### ERP Integration: 0% for Milling

**Machine Rate Lookup:**
- `businessDispatcher.machine_rate_lookup` exists (line 1910-1912)
- **NEVER called** from any milling route
- Mill routes hardcode cost assumptions (wizard-submit line 220: `cost_per_part: result?.cost_per_part ?? 45.50`)

**GL Integration:**
- `businessDispatcher.gl_record_invoice` exists (line 1678)
- **NEVER called** from any milling route

**ERP Tables Available but Unused:**
- `machine_rates(shop_id, machine_id, rate_usd_hr, effective_date)` ✓ schema exists
- `quotes`, `jobs`, `invoices`, `gl_journal_entries` ✓ schemas exist (generic)

## Integration Completeness Score

| Component | Score | Status |
|---|---:|---|
| Router Registration | 0% | ✗ BLOCKING — not imported or mounted |
| Route Implementation | 100% | ✓ 12 endpoints fully coded |
| Dispatcher Actions | 50% | ⚠ 85 actions defined; cost action wired to missing engine |
| Cost Engine | 0% | ✗ Missing — no MillCostEngine |
| Machine Rate Lookup | 0% | ✗ Action exists, not called |
| Quote Storage | 0% | ✗ No POST /quote route |
| Quote Approval | 0% | ✗ No approval workflow |
| Job Tracking | 0% | ✗ In-memory jobStore only |
| Invoice Generation | 0% | ✗ No invoice flow |
| GL Posting | 0% | ✗ Action exists, not called |
| Auth | 0% | ✗ All endpoints open |
| **Overall** | **0%** | ✗ **PRE-ALPHA** |

## PART E — Frontend Impact: What Gets Unblocked?

### Once Router is Registered (30 minutes)

**Becomes Functional:**
1. MillingUploadPage → POST `/api/v1/milling/upload`
2. MillingWizardPage → POST `/api/v1/milling/wizard-submit` (jobId returned)
3. MillingResultsPage → GET `/api/v1/milling/result/:jobId`
4. MillingSpeedFeedPage → POST `/api/v1/milling/speed-feed`
5. MillingAIPage → POST `/api/v1/milling/ai/*`

### Currently Broken (404 errors)
- All milling UI routes return 404 until router registered

## PART F — Phase 2 Punch List (14 Hours Total)

### Phase 2A: Database Persistence (4 hours)
1. Create migration: `mill_quotes(shop_id, program_id, total_usd, per_unit_usd, created_at, status)`
2. Create migration: `mill_jobs(shop_id, quote_id, status, job_packet_json, created_at, completed_at)`
3. Create migration: `mill_invoices(shop_id, job_id, line_items_json, total_usd, variance_pct, created_at)`
4. Replace `jobStore.set()` in milling.ts with INSERT/UPDATE queries
5. Test: Quote survives server restart

**Blocker:** Phase 2A must complete before 2B (approval depends on DB)

### Phase 2B: Approval Workflow (3 hours)
1. Add `shop_id` parameter to all milling routes
2. Call `businessDispatcher.approval_workflow_submit()` if quote.total > threshold ($5,000 default)
3. Gate wizard-submit to require approval before job creation
4. Add POST `/api/v1/milling/approval/:approval_id/decide` endpoint
5. Test: Quote pending → approval blocks job creation

**Prerequisite:** Phase 2A

### Phase 2C: ERP Rate Lookup (3 hours)
1. Add `shop_id` to all cost routes
2. Implement `businessDispatcher.machine_rate_lookup(shop_id, machine_id)` with 30-min cache
3. Pass machine_id to cost calc (wizard-submit line 149)
4. Fallback to hardcoded defaults if ERP unavailable
5. Test: rate lookup succeeds, fallback works, cache expires

**Prerequisite:** Phase 2A

### Phase 2D: GL Integration + Testing (4 hours)
1. Create `MillCostEngine.ts` with:
   - `estimateCost(material, machine, features, strategies)` → CostEstimate
   - `generateInvoice(job_id, machine_rate, cycle_time)` → InvoiceDraft
2. Wire `businessDispatcher.gl_record_invoice()` in POST /job/:id/complete
3. Pass `invoice_id, line_items, shop_id, posting_date` to GL
4. End-to-end test: Upload → Wizard → Quote → Job → Invoice → GL
5. Rate fallback test
6. Auth test: Add optionalToken middleware

**Prerequisite:** Phase 2A, 2B, 2C complete

## Critical Blockers (Severity Order)

1. **Router Not Registered** (IMMEDIATE) — /api/v1/milling/* returns 404
2. **No Cost Engine** — `mill_quick_cost_estimate` calls non-existent engine
3. **No ERP Lookup** — Machine rates hardcoded, multi-tenant impossible
4. **No GL Posting** — Accounting break in quote-to-invoice loop
5. **Auth Open** — All endpoints unauthenticated (security risk)
6. **Volatile Storage** — In-memory jobStore loses all data on restart

## Recommendations

1. **IMMEDIATE (30 min):** Register router with 3-line fix
2. **HIGH (2 hours):** Add `optionalToken` middleware to milling.ts
3. **HIGH (4 hours):** Phase 2A — DB persistence
4. **MEDIUM (8 hours):** Phase 2B + 2C + 2D
5. **TESTING (Day 2):** End-to-end integration test

## Summary

- **Router fix:** Trivial 3 lines — unblocks entire milling feature set immediately
- **Cost/ERP:** Phase 1 (router) 100% ready · Phase 2 (ERP) 0% started
- **Total to production:** 18.5 hours
  - Router fix: 0.5h
  - Auth: 2h
  - Phase 2A-2D: 14h
  - Testing: 2h

**Next Action:** Apply 3-line router fix, then schedule Phase 2A (DB persistence) with highest priority.
