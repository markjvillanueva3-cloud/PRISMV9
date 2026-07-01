# CAMX ROADMAP v19 AMENDMENTS
## Fixes the 84% gap: 49/50 algorithms unused, 0/11 registries queried, 22 orphaned engines

---

## THE PROBLEM IN ONE TABLE

| Asset | Total | Used by Pipelines | % Utilized |
|---|---|---|---|
| Engines | 1,246 | ~200 referenced | 16% |
| Algorithms | 50 | 1 (MonteCarlo) | 2% |
| Registries | 11 key | 0 | 0% |
| Orphaned engines | 22 | 0 (never referenced by anything) | 0% |

---

## AMENDMENT 8: Wire ALL 11 Registries Into Pipeline Decisions (5 units)

### U-REG1: Wire ToolpathStrategyRegistry (752 strategies) into OptimalStrategySelection
```
/smart: OPUS/MAX
FILES TO READ FIRST:
  - src/registries/ToolpathStrategyRegistry.ts (752 entries)
  - src/engines/OptimalStrategySelectionEngine.ts (E1087, has 28-entry private STRATEGY_DB)
  - src/engines/AdaptiveToolpathRouterEngine.ts (35-entry ALGORITHM_REGISTRY)

PROBLEM: OptimalStrategy has 28 strategies. The registry has 752. These OVERLAP.
FIX:
  1. OptimalStrategy.compute() should FIRST query ToolpathStrategyRegistry
     for ALL strategies matching the feature type + axis count
  2. Filter by machine capability (from MachineStrategyConstraintEngine)
  3. THEN score the filtered candidates with physics
  4. The private 28-entry STRATEGY_DB becomes a FALLBACK, not the primary source
  5. This gives the decision engine access to 752 strategies instead of 28

EXIT: Pipeline queries registry. >28 strategies evaluated for complex features.
```

### U-REG2: Wire MaterialRegistry (1,662L) into SpeedFeedOrchestrator
```
/smart: OPUS/MAX
FILES TO READ FIRST:
  - src/registries/MaterialRegistry.ts (1,662 lines)
  - src/engines/SpeedFeedOrchestratorEngine.ts (has inline 13-material MATERIAL_DB)

PROBLEM: SFO has 13 materials inline. MaterialRegistry has hundreds.
FIX:
  1. SFO.resolveMaterial() should FIRST query MaterialRegistry
  2. If registry returns full properties (kc1_1, mc, thermal_k, etc.), use those
  3. FALLBACK to inline 13-material table if registry miss
  4. Also wire hyperMILL materials catalog (2,544 entries) as secondary source

EXIT: SFO queries registry. Known alloys get alloy-specific properties.
```

### U-REG3: Wire FormulaRegistry (1,109L) into physics computation
```
/smart: OPUS/HIGH
FILES TO READ FIRST:
  - src/registries/FormulaRegistry.ts

PROBLEM: Physics engines hardcode formulas inline. FormulaRegistry catalogs ALL formulas.
FIX:
  1. When PipelineDecisionOrchestrator makes a physics-dependent decision,
     query FormulaRegistry for which formula applies
  2. FormulaRegistry returns: formula name, equation, variables, units, domain, source
  3. This enables: formula provenance in output ("Ra calculated using fz²/32r per ISO 4287")
  4. Also enables: formula switching (Kienzle vs Merchant vs Oxley for force)

EXIT: Formula provenance appears in output. Multiple formula options compared.
```

### U-REG4: Wire CoatingRegistry + CoolantRegistry + PostProcessorRegistry
```
/smart: OPUS/HIGH
FILES:
  - src/registries/CoatingRegistry.ts
  - src/registries/CoolantRegistry.ts
  - src/registries/PostProcessorRegistry.ts

FIX:
  1. CoatingSelectionEngine (E1082) queries CoatingRegistry for ALL available coatings
  2. CoolantStrategyEngine queries CoolantRegistry for ALL coolant types with properties
  3. PostSelectionEngine queries PostProcessorRegistry for best post per controller

EXIT: Selection engines query registries, not inline tables.
```

### U-REG5: Wire AlgorithmRegistry + MachineRegistry + ToolRegistry
```
/smart: OPUS/HIGH
FIX:
  1. AdaptiveToolpathRouter queries AlgorithmRegistry for ALL available algorithms
  2. MachineSelectionEngine queries MachineRegistry for ALL machine profiles
  3. SmartToolSelectorEngine queries ToolRegistry as index into 95K catalog

EXIT: Decision engines use registries as knowledge backbone.
```

---

## AMENDMENT 9: Wire Critical Algorithms Into Pipeline Physics (8 units)

### U-ALG1: Wire CWEZBuffer (Cutter Workpiece Engagement Z-buffer)
```
/smart: OPUS/MAX
FILES TO READ FIRST:
  - src/algorithms/CWEZBuffer.ts

PURPOSE: CWE Z-buffer computes EXACT instantaneous engagement between cutter and
workpiece using a Z-buffer (depth buffer) approach. This is MORE ACCURATE than the
analytical InstantaneousEngagementEngine for complex geometry (curved walls, rest stock).

WHERE: Wire into PostProcessorPipeline Phase 2 as an UPGRADE to InstantaneousEngagement.
For simple geometry → keep analytical. For complex → use CWEZBuffer.
The per-block S/F optimization becomes more accurate for non-trivial parts.

EXIT: Complex geometry parts get CWE-based per-block S/F, simple parts keep analytical.
```

### U-ALG2: Wire StabilityLobeDiagram + FRFStabilityLobe + RCSA
```
/smart: OPUS/MAX
FILES:
  - src/algorithms/StabilityLobeDiagram.ts
  - src/algorithms/FRFStabilityLobe.ts
  - src/algorithms/RCSA.ts

PURPOSE:
  - StabilityLobeDiagram: the classic chatter prediction (already used by engine but
    algorithm itself not directly called by pipeline)
  - FRFStabilityLobe: Frequency Response Function for more accurate SLD
  - RCSA: Receptance Coupling Substructure Analysis — models the ASSEMBLY dynamics
    (tool + holder + spindle) rather than just tool cantilever

WHERE: Wire into RPM selection at every pipeline. Current StabilityRPMRewriterEngine
uses simplified stability check. Upgrade to use the full FRF + RCSA chain for
accurate chatter prediction that accounts for holder type and spindle dynamics.

EXIT: RPM selection uses assembly dynamics. Different holders produce different stable zones.
```

### U-ALG3: Wire AntColonyTSP for tool change optimization
```
PURPOSE: Better than greedy for tool change sequence. Finds shorter total turret/magazine
travel. Significant for >10 tool jobs.
WHERE: ToolChangeOptimizationEngine and IntelligentSequencingEngine.
EXIT: Jobs with >10 tools get TSP-optimized sequence.
```

### U-ALG4: Wire DPMultiPass for roughing depth optimization
```
PURPOSE: Dynamic programming finds OPTIMAL number of passes and depth per pass.
Better than fixed % rules. Minimizes cycle time while respecting force constraints.
WHERE: Every roughing decision in every pipeline.
EXIT: Roughing pass count + depth optimized per material/tool combo.
```

### U-ALG5: Wire GeneticOptimizer + ParticleSwarm for joint S/F optimization
```
PURPOSE: Search {Vc, fz, ap, ae} space JOINTLY to find true minimum cycle time
subject to ALL constraints simultaneously. Better than solving each independently.
WHERE: OptimalStrategySelectionEngine and SpeedFeedOrchestrator.
EXIT: Joint optimization available. Falls back to formula-based when speed needed.
```

### U-ALG6: Wire FFTAnalyzer + STFTChatter + WaveletBreakage for monitoring
```
PURPOSE:
  FFT: frequency-domain vibration analysis
  STFT: time-frequency chatter detection (identifies WHEN chatter starts)
  Wavelet: tool breakage detection from force/vibration signatures
WHERE: Generate monitoring THRESHOLDS in the CNC program output.
  Comments or macro variables that tell the machine monitoring system
  what force/vibration levels to expect and when to alarm.
EXIT: Programs include monitoring thresholds in comments/macros.
```

### U-ALG7: Wire ChipBreakingModel + ChipEvacuationModel + ChipVolumeRate
```
PURPOSE:
  ChipBreaking: predict chip form (continuous/segmented/broken) from feed/DOC/material
  ChipEvacuation: verify chip clearance in deep holes/pockets
  ChipVolumeRate: volumetric chip production rate → coolant flow requirement
WHERE: Feed selection (modify feed if continuous chips predicted) + coolant flow calc.
EXIT: Feed adjusted for chip control. Deep holes get evacuation check.
```

### U-ALG8: Wire KalmanFilter + ExtendedTaylorModel + BayesianWearModel
```
PURPOSE:
  KalmanFilter: real-time state estimation from noisy sensor data
  ExtendedTaylor: more accurate tool life (accounts for variable Vc, intermittent cutting)
  BayesianWear: probabilistic wear model, updated from actual measurements
WHERE: Self-learning feedback loop. When MTConnect/OPC-UA data available:
  KalmanFilter estimates current state → ExtendedTaylor predicts remaining life →
  BayesianWear updates prediction from actual → better next-program predictions.
EXIT: Learning loop uses advanced algorithms, not just simple Bayesian updating.
```

---

## AMENDMENT 10: Wire Orphaned Material-Specific Engines (4 units)

### U-MAT1: Wire SuperalloyMachiningEngine into ISO S material handling
```
PURPOSE: Superalloy-specific machining physics (Inconel, Hastelloy, Waspaloy).
Work hardening, notch wear, thermal damage, ceramic insert behavior.
WHERE: When material is ISO S AND is a nickel/cobalt superalloy:
  Query SuperalloyMachiningEngine for specific recommendations.
EXIT: Inconel/Hastelloy parts get superalloy-specific physics.
```

### U-MAT2: Wire CeramicsMachiningEngine + MagnesiumMachiningEngine
```
PURPOSE: Material-specific handling for edge cases.
  Ceramics: brittle fracture, diamond tooling, no coolant
  Magnesium: FIRE RISK with water-based coolant, special chip handling
WHERE: Material detection → route to specific engine for special handling.
EXIT: Ceramic and magnesium parts get safety-critical material handling.
```

### U-MAT3: Wire CompositesMachiningPhysicsEngine
```
PURPOSE: CFRP, fiberglass, Kevlar — completely different physics.
  Delamination risk, fiber direction effects, no thermal damage (matrix melts),
  abrasive wear on diamond-coated tools, dust extraction mandatory.
WHERE: When material is composite → route to composites engine.
EXIT: Composite parts get delamination-safe S/F and special tool selection.
```

### U-MAT4: Wire orphaned CAMX engines (E1085 WorkholdingSurfaceInference, E1086 QuoteToShip)
```
PROBLEM: Two engines WE BUILT in this roadmap are ORPHANED:
  - WorkholdingSurfaceInferenceEngine (E1085) — never referenced by any other engine
  - QuoteToShipOrchestratorEngine (E1086) — never referenced by any other engine
FIX:
  1. Wire E1085 into FeasibilityOrchestratorEngine (dead-end detection)
  2. Wire E1086 into the main routing layer (it's supposed to be THE entry point)
  3. Verify both are exported from index.ts and accessible via dispatchers
EXIT: Both engines callable and referenced by at least one other engine.
```

---

## AMENDMENT 11: Wire Orphaned Process-Specific Engines (3 units)

### U-PROC1: Wire HoningProcessEngine + BurnishingPolishingEngine
```
PURPOSE: Honing and burnishing are POST-machining finishing processes.
  Honing: precision bore finishing (Ra 0.1-0.4μm, roundness <1μm)
  Burnishing: cold-work surface hardening + finish improvement
WHERE: When tolerance or Ra requirements exceed turning/grinding capability:
  Auto-suggest honing or burnishing as secondary operation.
  Include in cost estimate and process plan.
EXIT: Tight-tolerance bores get honing recommendation. Ra<0.2μm suggests burnishing.
```

### U-PROC2: Wire GrindingWheelDressingOptimizationEngine
```
PURPOSE: Optimize dressing parameters (lead, depth, overlap ratio) for target Ra.
Currently in GrindingProgramAssembler but the OPTIMIZATION engine is separate and orphaned.
WHERE: Wire into GrindingProgramAssembler as the dressing parameter source.
EXIT: Dressing parameters come from optimization, not lookup tables.
```

### U-PROC3: Wire ScrapRootCauseEngine + ToolSubstitutionRiskEngine
```
PURPOSE:
  ScrapRootCause: when a part is scrapped, analyze which operation/parameter was the cause
  ToolSubstitution: when substituting a different tool, assess the risk (different geometry,
    different coating → different forces → different Ra)
WHERE:
  ScrapRootCause: post-production feedback loop
  ToolSubstitution: when InventoryAwareToolSelector suggests a substitute from crib
EXIT: Substitution risk assessment in tool selection output. Root cause in feedback loop.
```

---

## UPDATED UTILIZATION PROJECTIONS

| Asset | v18 (before) | v19 (after) | Change |
|---|---|---|---|
| Algorithms used by pipelines | 1/50 (2%) | **25/50 (50%)** | +24 algorithms wired |
| Registries queried by pipelines | 0/11 (0%) | **11/11 (100%)** | All registries connected |
| Orphaned engines resolved | 0/22 | **10/22** | Material-specific + CAMX + process engines |
| Engines referenced by pipelines | ~200/1,246 (16%) | **~350/1,246 (28%)** | +150 through registry + algorithm wiring |

The remaining ~900 engines are legitimately niche (FilamentWindingEngine, HeatExchangerPlateEngine, StripeBillingEngine, etc.) or are CONSUMED by other engines (not directly by pipelines). 28% direct pipeline utilization is realistic for a system this large — the other 72% serve standalone dispatcher actions, web UI, ERP integration, etc.

---

## v19 TOTAL ADDITIONS

| Amendment | Units Added |
|---|---|
| Amendment 8: Registry wiring | 5 |
| Amendment 9: Algorithm wiring | 8 |
| Amendment 10: Material-specific + orphan fix | 4 |
| Amendment 11: Process-specific orphans | 3 |
| **Total new units** | **20** |

**Combined with v18 amendments (14 units): total amendments = 34 new units on top of v17's ~950.**

---

## FINAL ROADMAP EXECUTION ORDER (v19)

```
Phase 0-A: Print Reading Validation (6 units)
Phase 0-B: Critical Bug Fixes (7 units)
Phase 0-C: Test Infrastructure Hardening (6 units) [v18]
Phase 0-D: Registry + Algorithm + Orphan Wiring (20 units) [v19 NEW]
Phase 1:   Knowledge + Decision Architecture (22 units) [v18 expanded]
Phase 2:   Business Logic (5 units)
Phase 3:   Level 3 Decisions + Process Physics (16 units) [v18 expanded]
Phase 4-10: Per-Machine Pipeline Completion (~600 units)
Phase 11:  Exhaustive Testing (15 units + golden snapshots)
Phase 12:  Final Wiring + Web UI (6 units)

TOTAL: ~984 units + 34 amendments = ~1,018 units
```
