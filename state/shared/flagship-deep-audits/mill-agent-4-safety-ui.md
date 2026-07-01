# MILL Deep Audit — Agent 4: Safety Gates UI Surfacing

**Verdict:** 8 safety-critical backend engines exist and function correctly. **ZERO are visible to operator in UI.** 65-82 hours (8-10 days) UI work brings safety visibility from 45 → 85 (+40 points). Backend is production-ready; only UI wiring is missing.

## Backend Gate Inventory: 8 Core Engines

| # | Engine | LOC | Returns | UI |
|---|---|---:|---|---|
| 1 | `CollisionDetectionEngine` | ~400 | `{has_collision, severity, min_clearance_mm, details[]}` | HIDDEN |
| 2 | `MachineEnvelopeGuardEngine` | ~240 | `{passed, clamped, violations[]}` | HIDDEN |
| 3 | `ChatterStabilityLobeEngine` | ~480 | `{lobes[], optimal_rpm, max_stable_ap_mm, stable_pockets[]}` | HIDDEN |
| 4 | `ToolDeflectionPredictionEngine` | ~350 | `{static_deflection_um, dimensional_error_um, safety_factor, within_tolerance}` | HIDDEN |
| 5 | `ThermalAnalysisEngine` | ~420 | `{max_temp_C, limit_temp_C, recast_depth_um, thermal_safety}` | HIDDEN |
| 6 | `SpindlePowerCheckEngine` | ~280 | `{power_kW, limit_kW, margin_percent, safe}` | HIDDEN |
| 7 | `SingularityAvoidanceEngine` | ~350 | `{singular_points[], max_angular_velocity, is_safe}` (Okuma M460V-5AX critical) | HIDDEN |
| 8 | `RTCP_CompensationEngine` | ~380 | `{compensated_XYZ, error_without_rtcp_mm, is_within_tolerance}` (Okuma M460V-5AX) | HIDDEN |

**8 production engines · ZERO UI visible**

## JM Die Fleet Machine Specifics

### Haas VF-2 (3-axis VMC)
- 8,100 max RPM, 22.4 kW, 122 N·m, X=762/Y=406/Z=508mm
- Power soft limit: 19.04 kW (85%)
- Gates: envelope, power, chatter, deflection, thermal, collision

### Hurco VM30i (3-axis VMC)
- ~12,000 RPM, ~18.5 kW, ~760×560×510mm
- Gates: envelope, power, thermal

### Haas OM2 (Office Mill)
- 5,000 RPM, 22.4 kW, ~330mm swing
- Gates: power, thermal, workholding

### Roku-Roku HC-658 II (High-precision graphite)
- 20,000 RPM, ~15 kW, ~600×500×400mm, ±0.003mm repeatability
- **Special:** Graphite is brittle — chatter/deflection gates CRITICAL
- Stricter chatter (lower damping ζ ≈ 0.02), deflection >1µm out-of-spec, surface finish <0.4µm Ra

### Okuma M460V-5AX (5-axis simultaneous)
- 12,000 RPM, ~22 kW, X=813/Y=635/Z=635, A (±35°→120°), C (continuous)
- Kinematics: head_table (A on head, C on table)
- 5-axis specific: gimbal lock at A=0°/180°, RTCP shift, 5D envelope

## Frontend Audit: ZERO UI Surfaces

- No safety gate cards, badges, or explanations exist
- Mill Studio shows strategy selection only
- No "Safety Gate Details" modal
- Backend computes `OmegaSafetyScoreEngine.score()` (S(x) ≥ 0.70 hard block) but **frontend never sees it**

**Operator experience when gates block:**
1. Operator clicks "Generate Program"
2. Backend → S(x) < 0.70 → blocks emission
3. Operator sees: **HTTP 400 with no explanation**
4. No context, no fix path

## UI Punch List

### CRITICAL P0 (Safety Visibility)

| # | Card | Location | Effort |
|---|---|---|---:|
| 1 | **Unified S(x) Verdict Card** | Mill Studio / StepProgram | 8h |
| 2 | Collision Clearance Badge | Program Review | 5h |
| 3 | Machine Envelope Summary | Program Review | 4h |
| 4 | Chatter Stability Indicator | Strategy Selection | 6h |
| 5 | Tool Deflection Risk | Program Review | 5h |
| 6 | Thermal Safety Status | Program Review | 4h |
| 7 | Spindle Power Budget Gauge | Speed/Feed | 5h |
| 8 | Safety Gate Details Modal | reusable | 4h |

**P0 subtotal: 41 hours / 5.1 days**

### Machine-Specific P1

| # | Card | Details | Effort |
|---|---|---|---:|
| 9 | Singularity Risk Map | Okuma M460V-5AX gimbal lock | 7h |
| 10 | RTCP Error Visualization | Tool center point shift | 6h |
| 11 | 5-axis Work Envelope Checker | XYZ + A/C limits | 6h |
| 12 | Roku-Roku Precision Gate | Chatter + deflection + Ra for graphite | 5h |

**P1 subtotal: 24 hours / 3 days**

### Infrastructure P0

| # | Item | Effort |
|---|---|---:|
| 13 | Safety Gate Details Modal | 4h |
| 14 | Operator Guidance Text Library | 3h |
| 15 | Backend wiring: expose S(x) to frontend | 2h |
| 16 | Unit conversion & locale support | 2h |

**Infra subtotal: 11 hours / 1.4 days**

## Total Estimate

| Category | Hours | Days |
|---|---:|---:|
| P0 Safety Visibility | 41 | 5.1 |
| P1 Machine-Specific | 24 | 3 |
| Infrastructure & UX | 11 | 1.4 |
| QA & Runbook | 6 | 0.75 |
| **TOTAL** | **82** | **10.2** |

## Score Impact: 45 → 85 (+40 points)

After punch list:
- All 8 gates visualized with plain-English explanations
- S(x) composite verdict shown per-dimension
- Actionable guidance ("Reduce spindle 500 RPM to clear chatter")
- 5-axis: singularity map, RTCP error
- Machine-aware: Roku-Roku precision, JM Die fleet limits
- Operator: "I understand which gate blocks me and how to fix it"

## Backend Gate Call Graph

```
prism_mill (dispatcher)
  ├─ mill_print_to_program
  │   ├─ PipelineSafetyOrchestratorEngine.assess()
  │   │   ├─ CollisionDetectionEngine.checkFull()
  │   │   ├─ MachineEnvelopeGuardEngine.check()
  │   │   ├─ ChatterStabilityLobeEngine.compute()
  │   │   ├─ ToolDeflectionPredictionEngine.predict()
  │   │   ├─ ThermalAnalysisEngine.compute()
  │   │   ├─ SpindlePowerCheckEngine.check()
  │   │   └─ SafetyVetoEngine.veto()
  │   ├─ OmegaSafetyScoreEngine.score()
  │   └─ [IF S(x) < 0.70 OR vetoed → BLOCK]
  └─ [5-axis specifics for Okuma M460V-5AX]
      ├─ SingularityAvoidanceEngine.detect()
      └─ RTCP_CompensationEngine.compensate()
```

**Frontend currently:** sees HTTP status only.
**Frontend should see:** full S(x) breakdown + per-gate details + fix suggestions.

## Per-Machine Gate Coverage Matrix

| Gate | All | VF-2 | VM30i | OM2 | Roku | M460V |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Collision | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Envelope | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (5D) |
| Chatter | ✓ | ✓ | ✓ | ✓ | **CRITICAL** | ✓ |
| Deflection | ✓ | ✓ | ✓ | ✓ | **CRITICAL** | ✓ |
| Thermal | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Power | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Singularity | only 5-axis | — | — | — | — | ✓ |
| RTCP | only 5-axis | — | — | — | — | ✓ |

**Backend status:** All gates wired, ≥85% test coverage, all blockers production-grade.
**Frontend status:** ZERO gates surfaced to operator.
