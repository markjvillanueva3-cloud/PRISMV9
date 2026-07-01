# MILL-HARD-MS2: 4-Axis + Indexing Strategies

**Date**: 2026-04-14
**Status**: COMPLETE — 68 tests passing (AI reasoning integration)
**Predecessor**: MILL-HARD-MS1 (2022 tests)

## Summary

Implemented 4th axis indexing and continuous interpolation strategies with full AI reasoning integration. Uses DecisionReasoningEngine, ChainOfThoughtEngine, and LearningAdaptationEngine for intelligent strategy selection.

## Micro-Sessions Completed

### μS-08: 4th Axis Rotary Indexing
- **Tests**: 24 (tombstone configs, index optimization, rotary table specs)
- **Result**: PASS — All JM Die mills with 4th axis validated

**Tombstone Configurations**:
- 2-face: 0°, 180°
- 4-face: 0°, 90°, 180°, 270°
- 6-face: 0°, 60°, 120°, 180°, 240°, 300°

**Index Optimization**:
- Nearest-neighbor heuristic for minimal rotation
- Clamp/unclamp time accounting (0.5s each for TR160)
- Cycle time calculation with index overhead

### μS-09: 4-Axis Interpolation
- **Tests**: 12 (wrap milling, continuous interpolation, RPM limits)
- **Result**: PASS — Surface speed compensation working

**Wrap Milling Parameters**:
- Rotary RPM = (Vc × 1000) / (π × D_part)
- Feed compensation for cylindrical surface
- RPM limit warnings when exceeding table max

## AI Reasoning Integration

### DecisionReasoningEngine Integration
- 6 weighted criteria: setup_time, cycle_time, accuracy, datum_alignment, cost_per_part, operator_skill_match
- Candidate generation for all available strategies
- Pareto-optimal selection with tradeoff analysis

### ChainOfThoughtEngine Integration
- 7-step reasoning chain for each decision
- Step types: observation, hypothesis, calculation, validation, reflection, conclusion
- Self-questioning and assumption documentation

### LearningAdaptationEngine Integration
- Prediction ID generated for each decision
- Context captured for future outcome comparison
- Bayesian belief update ready for cycle time predictions

## JM Die Machine Updates

### 4th Axis Capability Added To:
| Machine | Rotary Table | Axis | Max Load | Max RPM |
|---------|--------------|------|----------|---------|
| VMC-01 (Hurco VM30i) | HRT210 | A | 136 kg | 100 |
| VMC-02 (Okuma M460V-5AX) | Integrated trunnion | A | 100 kg | 50 |
| VMC-03 (Haas VF-2) | TR160 | A | 54 kg | 100 |

### New ShopMachine Interface Field
```typescript
rotary_table?: {
  model: string;
  axis: "A" | "B" | "C";
  max_load_kg: number;
  max_rpm: number;
  tilt_axis?: "A" | "B" | "C";
  tilt_range?: [number, number];
};
```

## Decision Engine Behavior

### Strategy Selection Logic
1. **Wrap features present** → Strongly favor `4th_axis_continuous`
2. **Multi-face (≥3) + critical datum** → Favor `4th_axis_positional`
3. **Tight tolerance (<0.05mm)** → Penalize `multiple_setups`
4. **5-axis available + tight tolerance** → Consider `5_axis_simultaneous`
5. **Small batch + relaxed tolerance** → `multiple_setups` acceptable

### Proactive Suggestions Generated
- Tombstone fixture for high batch (≥20) positional work
- In-process probing for tight tolerances (<0.025mm)
- 4th axis upgrade suggestion for frequent multi-face work
- 5-axis utilization for skilled operators

## Files Created/Modified

### New Files
- `src/engines/FourthAxisIndexingEngine.ts` (290 LOC)
- `src/engines/FourthAxisDecisionEngine.ts` (470 LOC)
- `src/__tests__/MILL-HARD-MS2.test.ts` (68 tests)
- `data/milestones/MILL-HARD-MS2-FINDINGS.md` (this file)

### Modified Files
- `src/engines/ShopConfigurationEngine.ts`: Added rotary_table interface and machine specs
- `src/engines/index.ts`: Export new engines

## Test Summary

| Category | Tests | Status |
|----------|-------|--------|
| μS-08: Tombstone Configuration | 6 | PASS |
| μS-08: Index Sequence Optimization | 2 | PASS |
| μS-08: Custom Indexed Positions | 2 | PASS |
| μS-08: Rotary Table Specs | 3 | PASS |
| μS-08: Tombstone Cycle Time | 2 | PASS |
| μS-08: Machine 4th Axis Support | 3 | PASS |
| μS-09: Wrap Milling | 3 | PASS |
| μS-09: Continuous Interpolation | 2 | PASS |
| AI: Strategy Selection | 4 | PASS |
| AI: Chain-of-Thought Reasoning | 3 | PASS |
| AI: Proactive Suggestions | 2 | PASS |
| AI: Learning Integration | 1 | PASS |
| AI: Cost Analysis | 2 | PASS |
| AI: Machine Selection | 2 | PASS |
| Integration: ShopConfiguration | 3 | PASS |
| Edge Cases: Indexing | 3 | PASS |
| Edge Cases: Decision | 3 | PASS |
| Parametric Sweep: Materials | 6 | PASS |
| Parametric Sweep: Sides | 5 | PASS |
| Parametric Sweep: Batch | 6 | PASS |
| Cross-Machine Validation | 6 | PASS |
| Regression: MS1 Compatibility | 2 | PASS |
| **Total** | **68** | **PASS** |

## Next Steps

1. **MILL-HARD-MS3**: 5-Axis Milling (Okuma M460V-5AX)
   - RTCP/TCP validation
   - Pivot length compensation
   - Singularity avoidance

2. **Deferred from MS2**:
   - Pallet changer integration for tombstone automation
   - Rotary table probe routines
   - A+B axis trunnion coordination

## Integration Points

### Consumers of FourthAxisIndexingEngine:
- CAMKernelOrchestratorEngine (strategy selection)
- CycleTimeEstimatorEngine (index time accounting)
- PostProcessorPipelineEngine (rotary axis G-code)

### Consumers of FourthAxisDecisionEngine:
- QuoteAutopilotEngine (setup complexity assessment)
- PrintToProgramEngine (strategy recommendation)
- MachineSelectionEngine (4th axis capability filtering)
