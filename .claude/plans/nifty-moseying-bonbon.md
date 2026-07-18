# FORGE: Mill Roadmap Comprehensive Audit & Gap Remediation

## Context

User requested a comprehensive audit of the entire mill roadmap to verify all builds are correct, wired, and utilized, and to identify/fix any gaps. This is a systematic quality gate enforcement across 42 mill-related milestones covering engines, dispatchers, tests, and wiring.

**Problem**: Despite 27/42 (64%) mill milestones marked complete, there are critical gaps:
- 5 dispatcher actions declared but missing handlers
- 87.5% of milling physics engines have NO tests (42/48 untested)
- 3 tested engines never wired to dispatchers (orphaned)
- 5 engines not exported from index.ts

---

## Audit Summary

### Mill Roadmap Status
| Category | Complete | Total | Status |
|----------|----------|-------|--------|
| MILL-HARD (Physics) | 9/9 | 9 | COMPLETE |
| MILL-AI (Intelligence) | 4/4 | 4 | COMPLETE |
| CAM Infrastructure | 0/20 | 20 | NOT STARTED |
| Resource Mining | 0/18 | 18 | NOT STARTED |
| **TOTAL** | **27/42** | 42 | **64%** |

### Milling Engines Audit
| Metric | Count | Target | Gap |
|--------|-------|--------|-----|
| Total engines | 48 | - | - |
| Exported | 43 | 48 | -5 |
| Tested | 6 | 48 | -42 (87.5%) |
| Dispatched | 40 | 48 | -8 |

### Dispatcher Audit
| Issue | Count | Action |
|-------|-------|--------|
| Missing handlers | 5 | Add case handlers |
| Orphaned engines | 3 | Wire to dispatchers |
| Dead exports | 1 | Wire BallMillEngine |

---

## Implementation Plan

### Phase 1: Dispatcher Gap Fix (5 missing handlers)

**File**: `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts`

Actions in z.enum with NO case handler (fall through to error):
1. `mill_harvest_tribal` (line 427)
2. `mill_agi_analyze` (line 430)
3. `mill_agi_quick` (line 431)
4. `mill_agi_optimal` (line 432)
5. `mill_agi_awareness` (line 434)

**Fix**: Add case handlers routing to existing engines:

```typescript
case "mill_harvest_tribal": {
  const { millingProductionKnowledgeHarvesterEngine } = await import("../../engines/MillingProductionKnowledgeHarvesterEngine.js");
  return ok(millingProductionKnowledgeHarvesterEngine.getTribalKnowledge(params.category, params.material));
}

case "mill_agi_analyze": {
  const { millingAGIOrchestrationEngine } = await import("../../engines/MillingAGIOrchestrationEngine.js");
  return ok(millingAGIOrchestrationEngine.analyzeWithAGI(params));
}

case "mill_agi_quick": {
  const { millingAGIOrchestrationEngine } = await import("../../engines/MillingAGIOrchestrationEngine.js");
  return ok(millingAGIOrchestrationEngine.quickAnalyze(params.material, params.tool_diameter_mm, params.cutting_speed_m_min, params.feed_per_tooth_mm, params.axial_depth_mm));
}

case "mill_agi_optimal": {
  const { millingAGIOrchestrationEngine } = await import("../../engines/MillingAGIOrchestrationEngine.js");
  return ok(millingAGIOrchestrationEngine.getOptimalParameters(params.material, params.operation, params.tool_diameter_mm, params.tool_flutes));
}

case "mill_agi_awareness": {
  const { millingAGIOrchestrationEngine } = await import("../../engines/MillingAGIOrchestrationEngine.js");
  return ok(millingAGIOrchestrationEngine.getSelfAwareness());
}
```

### Phase 2: Engine Export Fixes (5 missing)

**File**: `mcp-server/src/engines/index.ts`

Add exports for:
1. `AutoSpeedFeedCalculatorEngine`
2. `AdaptiveChatterEngine`
3. `WorkpieceDeflectionCompensationEngine`
4. `ProvenSpeedFeedAggregatorEngine`
5. `SpeedFeedResourceIntegrationEngine`

### Phase 3: Wire Orphaned Engines (3 engines)

**File**: `mcp-server/src/tools/dispatchers/calcDispatcher.ts`

| Engine | New Actions |
|--------|-------------|
| ChatterNeuralClassifierEngine | `chatter_neural_classify`, `chatter_neural_batch` |
| SurfaceFinishCnnEngine | `surface_finish_cnn_predict`, `surface_finish_cnn_batch` |
| MachineAwareSpeedFeedEngine | `speed_feed_machine_aware`, `speed_feed_machine_constrain` |

### Phase 4: Critical Test Coverage (Priority 5 engines)

| Engine | Physics Model | Safety Risk | Test File |
|--------|---------------|-------------|-----------|
| CuttingForceEngine | Kienzle | Tool breakage | `CuttingForceEngine.test.ts` |
| ChatterPredictionEngine | Altintas SLD | Machine crash | `ChatterPredictionEngine.test.ts` |
| SurfaceFinishEngine | Ra = f^2/(32r) | Quality | `SurfaceFinishEngine.test.ts` |
| UltimateSpeedFeedEngine | 31 models | All risks | `UltimateSpeedFeedEngine.test.ts` |
| PartDeflectionEngine | Beam theory | Tolerance | `PartDeflectionEngine.test.ts` |

**Min 10 test cases each** covering:
- Dimensional consistency (units check)
- Formula validation (hand-calculated references)
- Edge cases (zero, negative, extreme)
- Material variations (ISO groups)
- Warning generation

### Phase 5: Wire Dead Export (BallMillEngine)

**File**: `mcp-server/src/tools/dispatchers/calcDispatcher.ts`

Add actions: `ball_mill_size`, `ball_mill_power`, `ball_mill_optimize`

---

## Critical Files

| File | Changes |
|------|---------|
| `src/tools/dispatchers/aiReasoningDispatcher.ts` | +5 case handlers |
| `src/tools/dispatchers/calcDispatcher.ts` | +9 actions, wire 4 engines |
| `src/engines/index.ts` | +5 exports |
| `src/__tests__/CuttingForceEngine.test.ts` | NEW (15 tests) |
| `src/__tests__/ChatterPredictionEngine.test.ts` | NEW (20 tests) |
| `src/__tests__/SurfaceFinishEngine.test.ts` | NEW (15 tests) |
| `src/__tests__/UltimateSpeedFeedEngine.test.ts` | NEW (10 tests) |
| `src/__tests__/PartDeflectionEngine.test.ts` | NEW (12 tests) |

---

## Verification

```bash
# After each phase:
npm run build:fast          # esbuild check (~3s)
npx vitest run              # all tests pass

# After Phase 1 (dispatcher fix):
# Verify actions no longer return "Unknown action" error

# After Phase 4 (tests):
npx vitest run src/__tests__/CuttingForceEngine.test.ts
npx vitest run src/__tests__/ChatterPredictionEngine.test.ts
# etc.

# Final:
npm run build:verify        # full tsc + esbuild
```

---

## Execution Order

1. **Phase 1**: Dispatcher handlers (quick win, unblocks users)
2. **Phase 2**: Engine exports (enables external use)
3. **Phase 3**: Wire orphaned engines (completes dispatcher coverage)
4. **Phase 4**: Test coverage (safety-critical, highest effort)
5. **Phase 5**: Wire BallMillEngine (cleanup)

**Estimated effort**: 4-6 units across 2-3 sessions

---

## Success Criteria

- [ ] All 5 missing dispatcher handlers implemented
- [ ] Build passes with 0 tsc errors
- [ ] 48/48 engines exported from index.ts
- [ ] 48/48 engines wired to dispatchers
- [ ] 5 critical physics engines have test coverage (72 tests)
- [ ] All tests pass
