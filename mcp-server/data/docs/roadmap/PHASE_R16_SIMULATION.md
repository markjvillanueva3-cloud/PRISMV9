# PHASE R16: SIMULATION & DIGITAL TWIN
## Status: in-progress | MS0 IN PROGRESS

### Phase Vision

R16 builds time-domain cutting simulation and digital twin capabilities on top of R15's
first-principles physics models. This closes the prediction-to-reality loop by providing:
- Time-domain cutting simulation combining force, thermal, and vibration models
- Digital workpiece tracking (material removal, geometry evolution)
- Process verification comparing predicted outcomes to tolerance targets
- What-if sensitivity analysis for parameter optimization
- Multi-operation batch simulation for process planning validation

### Composition Dependencies

```
R16 builds on:
  R2  (Safety)            — parameter bounds, safety classification
  R7  (Intelligence)      — physics prediction, advanced calculations
  R14 (Products)          — process planning, campaign engine
  R15 (Physics)           — Rz kinematic, SLD, thermal distortion, chip formation, CCE

R16 new engines:
  NEW: CuttingSimulationEngine  ← time-domain force/thermal/vibration simulation
  NEW: DigitalTwinEngine        ← workpiece material removal + geometry tracking
  NEW: ProcessVerificationEngine← predicted vs target comparison, drift detection
  NEW: SensitivityEngine        ← parameter sensitivity analysis, Pareto fronts
  Extended: CCELiteEngine       ← simulation recipes for multi-step verification
```

### Milestone Plan

| MS | Title | Effort | Entry |
|----|-------|--------|-------|
| MS0 | Phase Architecture | S (10) | R15 COMPLETE |
| MS1 | CuttingSimulationEngine — Time-Domain Cutting | L (35) | MS0 COMPLETE |
| MS2 | DigitalTwinEngine — Workpiece Model | M (25) | MS0 COMPLETE (parallel) |
| MS3 | ProcessVerificationEngine — Prediction vs Target | M (20) | MS1 COMPLETE |
| MS4 | SensitivityEngine — What-If Analysis | M (20) | MS1 COMPLETE (parallel) |
| MS5 | Multi-Op Batch Simulation + CCE Recipes | S (15) | MS1+MS2 COMPLETE |
| MS6 | Phase Gate | S (10) | MS0-MS5 COMPLETE |

### Action Projections (18 new actions)

| Engine | New Actions |
|--------|------------|
| CuttingSimulationEngine (NEW) | sim_cutting, sim_force_profile, sim_thermal_profile, sim_vibration |
| DigitalTwinEngine (NEW) | twin_create, twin_remove_material, twin_state, twin_compare |
| ProcessVerificationEngine (NEW) | verify_process, verify_tolerance, verify_surface, verify_stability |
| SensitivityEngine (NEW) | sensitivity_1d, sensitivity_2d, sensitivity_pareto, sensitivity_montecarlo |
| CCELiteEngine (ext) | 2 new recipes: sim_full_verification, sim_batch_optimize |

### MS0 Deliverables (IN PROGRESS)
1. Phase architecture defined (this document)
2. Existing simulation engines audited (ScenarioAnalysisEngine, InverseSolverEngine)
3. R15 physics model integration points identified
4. Milestone dependencies mapped
