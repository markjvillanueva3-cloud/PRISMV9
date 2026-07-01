# PPG Backend-Frontend Integration & Testing Plan

## Context

The Post Processor Generator (PPG) system has a sophisticated backend with 77+ engines, 35+ API endpoints, and 92+ dispatcher actions. However, exploration revealed **critical wiring gaps**:

1. **3 Master Post Engines are ISOLATED** — HurcoV11Mill, OkumaB250Lathe, MitsubishiMV1200RWireEDM exist as complete engines (~1,500+ lines combined) but have NO API endpoints, NO dispatcher actions, and are never instantiated
2. **Physics engines underutilized** — ChatterStabilityLobeEngine, BayesianToolLifeEngine exist but aren't wired to the post processor pipeline
3. **Frontend can't access machine-specific posts** — UI calls generic `ppgGenerate` but can't invoke Hurco/Okuma/Mitsubishi-specific generation
4. **Confidence not propagated** — Machine fingerprinting returns confidence scores but downstream components don't use them for derating

**Goal**: Wire backend engines to frontend, fill UI gaps, then systematically test baseline posts (Hurco V11, Okuma LB250, Mitsubishi MV1200R) until perfect.

---

## Phase 1: Backend Wiring (Critical Path)

### 1.1 Wire Master Post Engines to Dispatcher

**Files to modify:**
- `mcp-server/src/tools/dispatchers/camDispatcher.ts`
- `mcp-server/src/schemas/camActionSchemas.ts`

**Actions to add:**

| Action | Engine | Purpose |
|--------|--------|---------|
| `master_post_hurco_v11` | HurcoV11MillMasterPostEngine | JM Die Hurco VMX24 mill post |
| `master_post_okuma_b250` | OkumaB250LatheMasterPostEngine | JM Die Okuma LB250II-M lathe post |
| `master_post_mitsubishi_mv1200r` | MitsubishiMV1200RWireEDMMasterPostEngine | JM Die Mitsubishi MV1200R wire EDM post |
| `master_post_by_machine` | Router | Auto-route to correct engine by machine model |

**Schema for each:**
```typescript
{
  toolpath: PostMove[],           // From CAM
  material: { iso_group, kc1_1, mc, hardness_HB },
  tool: { diameter_mm, flutes, coating, stickout_mm },
  operation: string,              // facing, adaptive, threading, skim_cut, etc.
  aggressiveness?: 1-8,           // 1=conservative, 8=max MRR
  prove_out_mode?: boolean,       // Apply derating
  dialect?: string                // M700V vs M800 for Mitsubishi
}
```

### 1.2 Wire Master Post Engines to API Routes

**File to modify:** `mcp-server/src/routes/ppg.ts`

**Endpoints to add:**

| Endpoint | Method | Dispatcher Action |
|----------|--------|-------------------|
| `/ppg/master/hurco-v11` | POST | `prism_cam:master_post_hurco_v11` |
| `/ppg/master/okuma-b250` | POST | `prism_cam:master_post_okuma_b250` |
| `/ppg/master/mitsubishi-mv1200r` | POST | `prism_cam:master_post_mitsubishi_mv1200r` |
| `/ppg/master/auto` | POST | `prism_cam:master_post_by_machine` |

### 1.3 Integrate Missing Physics Engines

**File to modify:** `mcp-server/src/engines/PostProcessorFeedOptimizerEngine.ts`

**Integrations:**
1. **ChatterStabilityLobeEngine** → Add `stabilityCheck` phase
   - Input: spindle_rpm, axial_depth, tool_diameter, machine_frf
   - Output: is_stable, max_safe_depth, recommended_rpm
   
2. **BayesianToolLifeEngine** → Add `toolLifeCheck` phase
   - Input: material, speed, feed, tool
   - Output: predicted_life_min, confidence, wear_rate

### 1.4 Add Physics Calculation Caching

**New file:** `mcp-server/src/engines/PhysicsResultsCacheEngine.ts`

**Cache keys:** (material_hash, tool_hash, speed, feed) → { kienzle_result, taylor_result, sld_result }

**TTL:** 1 hour (session-scoped)

---

## Phase 2: Frontend Integration

### 2.1 Add Master Post API Functions

**File to modify:** `mcp-server/web/src/api/client.ts`

```typescript
export async function ppgMasterHurcoV11(req: MasterPostRequest): Promise<MasterPostResult>
export async function ppgMasterOkumaB250(req: MasterPostRequest): Promise<MasterPostResult>
export async function ppgMasterMitsubishiMV1200R(req: MasterPostRequest): Promise<MasterPostResult>
export async function ppgMasterAuto(req: MasterPostRequest): Promise<MasterPostResult>
```

### 2.2 Add Physics Details Panel

**New file:** `mcp-server/web/src/components/ppg/PhysicsDetailsPanel.tsx`

**Displays:**
- Kienzle constants (kc1.1, mc) with ISO group source
- Taylor tool life (C, n) with confidence
- Chatter stability status (stable/marginal/unstable)
- Force/power predictions (Fc, P) with uncertainty bands
- Source attribution (which engine calculated each value)

### 2.3 Add Master Engine Selector

**File to modify:** `mcp-server/web/src/components/ppg/MachinePickerPanel.tsx`

**Enhancement:**
- After fingerprinting, show which Master Post Engine will handle the machine
- Display engine capabilities (tribal tips count, physics models used)
- Allow override to different engine

### 2.4 Propagate Confidence to Workflow

**Files to modify:**
- `mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx`
- `mcp-server/web/src/components/ppg/FeatureTogglePanel.tsx`

**Logic:**
- If confidence < 0.6: Auto-enable prove-out mode, show warning
- If confidence < 0.85: Recommend prove-out, show amber indicator
- Pass confidence to `ppgProveOut` for derating calculation

### 2.5 Add Full Pipeline Option

**File to modify:** `mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx`

**New button:** "Run Full 38-Stage Pipeline"
- Calls `ppgPipelineProcess` directly
- Shows stage-by-stage progress
- Displays analytics breakdown

---

## Phase 3: Baseline Post Testing

### 3.1 Test Matrix

| Post | Machine | Controller | Test Cases |
|------|---------|------------|------------|
| **Hurco V11** | VMX24 | WinMax V11 | 3-axis mill, probing, UltiMotion, G05.3 smoothing |
| **Okuma B250** | LB250II-M | OSP-P300L | G96 CSS, G72/G70 canned, G76 threading, C-axis G112 |
| **Mitsubishi MV1200R** | MV1200R | M800 | M700V vs M800 dialect, E-pack selection, skim passes, Ra targeting |

### 3.2 Test Scenarios per Post

**For each post, test:**

1. **Basic generation** — Simple toolpath → valid G-code
2. **Physics integration** — Kienzle force appears in annotations
3. **Tribal knowledge** — Tips injected as comments
4. **Dialect correctness** — Controller-specific M-codes used
5. **Safety limits** — Machine envelope respected
6. **Prove-out mode** — Derating applied correctly
7. **Optimization** — Feed optimizer active, improvements shown
8. **Comparison** — Same toolpath across controllers shows differences
9. **Download** — Setup sheet + G-code package correct
10. **Round-trip** — Generated code validates back through pipeline

### 3.3 Test Implementation

**New test files:**
- `mcp-server/src/__tests__/integration/HurcoV11MasterPost.integration.test.ts`
- `mcp-server/src/__tests__/integration/OkumaB250MasterPost.integration.test.ts`
- `mcp-server/src/__tests__/integration/MitsubishiMV1200RMasterPost.integration.test.ts`

**E2E test:**
- `mcp-server/src/__tests__/e2e/PPGFullPipeline.e2e.test.ts`

---

## Phase 4: Advanced Engine Verification

### 4.1 Physics Engine Utilization Checks

| Engine | Expected Usage | Verification |
|--------|----------------|--------------|
| KienzleForceModelEngine | Every toolpath block | Check `force_N` in annotations |
| PostProcessorFeedOptimizerEngine | Every generation | Check feed adjustments in diff |
| ChatterStabilityLobeEngine | When FRF data available | Check stability warnings |
| BayesianToolLifeEngine | When tool data complete | Check `predicted_life_min` in response |
| TribalKnowledgeAdvisorEngine | Always | Check tribal tips in G-code comments |
| RLPostProcessorEngine | Format selection | Check format stats in response |

### 4.2 Synchronization Verification

- **EventBus integration**: Verify post-generation events fire
- **Hook triggers**: Verify `FILE-GCODE-VALIDATE-001` fires on output
- **Session caching**: Verify repeated calls use cache

---

## Verification Plan

### Build & Test Commands

```bash
# 1. Build after changes
cd mcp-server && npm run build

# 2. Run post processor tests
npx vitest run --grep "MasterPost|PostProcessor|ppg"

# 3. Run integration tests
npx vitest run src/__tests__/integration/

# 4. Start dev server and test UI
npm run dev
# Navigate to http://localhost:3000/ppg
# Test: Select Hurco VMX24 → Generate → Verify G-code

# 5. MCP tool verification
# Call: prism_cam:master_post_hurco_v11
# Verify: G-code contains UltiMotion, G05.3, tribal tips
```

### Success Criteria

1. **Wiring complete**: All 3 master post engines callable via API + dispatcher
2. **Physics visible**: PhysicsDetailsPanel shows Kienzle/Taylor/SLD data
3. **Confidence flows**: Low-confidence fingerprints trigger prove-out
4. **Tests pass**: 100% pass rate on integration tests
5. **Real-world ready**: Generated G-code validates in Fusion 360 simulator

---

## Files to Create/Modify Summary

### New Files
- `mcp-server/src/engines/PhysicsResultsCacheEngine.ts`
- `mcp-server/web/src/components/ppg/PhysicsDetailsPanel.tsx`
- `mcp-server/src/__tests__/integration/HurcoV11MasterPost.integration.test.ts`
- `mcp-server/src/__tests__/integration/OkumaB250MasterPost.integration.test.ts`
- `mcp-server/src/__tests__/integration/MitsubishiMV1200RMasterPost.integration.test.ts`
- `mcp-server/src/__tests__/e2e/PPGFullPipeline.e2e.test.ts`

### Modified Files
- `mcp-server/src/tools/dispatchers/camDispatcher.ts` — Add 4 master post actions
- `mcp-server/src/schemas/camActionSchemas.ts` — Add schemas for new actions
- `mcp-server/src/routes/ppg.ts` — Add 4 master post endpoints
- `mcp-server/src/engines/PostProcessorFeedOptimizerEngine.ts` — Integrate SLD + BayesianToolLife
- `mcp-server/web/src/api/client.ts` — Add 4 master post API functions
- `mcp-server/web/src/components/ppg/MachinePickerPanel.tsx` — Show master engine selection
- `mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx` — Add pipeline button, propagate confidence

---

## Execution Order

1. **Phase 1.1-1.2**: Wire master post engines to dispatcher + routes (foundation)
2. **Phase 2.1**: Add frontend API functions (enables testing)
3. **Phase 3.3**: Write integration tests (verify wiring)
4. **Phase 1.3-1.4**: Integrate physics engines + caching (optimization)
5. **Phase 2.2-2.5**: Frontend enhancements (UX polish)
6. **Phase 3.2**: Full test matrix execution (validation)
7. **Phase 4**: Advanced verification (final quality gate)
