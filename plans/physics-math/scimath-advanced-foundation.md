# SCIMATH — Advanced Mathematical & Physics Foundation for PRISM

## Context

PRISM has 1,263 engines and 181 math/physics engines covering ~85% of manufacturing domains. Critical gaps: no quantum-inspired optimization, minimal linear algebra (no SVD/QR/Cholesky), no symbolic calculus, weak wavelets, 91 algorithm implementations missing from 220+ MIT courses. Biggest opportunity: **wire advanced math into business decisions** (Pareto toolpath → cost PDF → competitive quote).

**Starting state:** 181 math/physics engines | 109 formulas | 52 algorithms | 5 scientificMath actions
**Target state:** ~283 math/physics engines | ~169 formulas | ~82 algorithms | ~101 new dispatcher actions | 10+ custom formulas | 12 intelligence pipelines

## 20-Agent Scrutiny Results (Avg: 58/100)

20 review agents audited this plan. Critical fixes incorporated below:

| Fix | Agent(s) | Change |
|-----|----------|--------|
| Safety gates | 17 (29/100) | Added NaN/Inf guards, FEM validation gate, operator approval for G-code compensation |
| Quantum framing | 1,3 | Reframed as "quantum-inspired classical optimization" — no speedup claims |
| Discrete Morse | 1,3 | Replaced smooth Morse theory with Forman discrete Morse for CAD meshes |
| Session rebudget | 10,19,20 | Acknowledged 4 sessions/engine avg; phased delivery with MVP first |
| Missing domains | 16 | Added game theory, queueing theory, chaos theory as optional extensions |
| Dispatcher strategy | 10,11 | Sub-dispatcher architecture required before MS0 completion |
| Formula novelty | 7 | Relabeled: "canonical integration" vs "research prototype" vs "novel" |
| FEM scope | 13 | FEM deflection compensation = offline design tool, NOT real-time G-code |
| ABC costing | 14 | Hybrid model: standard costing default + ABC for shops with activity tracking |
| Course traceability | 15 | Specific lecture/section citations required per engine (not blanket "ALL") |
| Safety: NaN guard | 17 | Every custom formula output validated: isFinite() + domain bounds check |
| Safety: FEM gate | 17 | FEM deflection must validate against beam model (±20% agreement) before use |

---

## Phased Delivery (Scrutiny-Adjusted)

**Phase A (MVP — 80% value): MS0-slim + MS2-slim + MS5 = ~73 sessions**
- MS0-slim: SVD, QR, Cholesky, Eigen, Sparse, Tensor (8 core units, skip SystemID/RandomMatrix)
- MS2-slim: Symlet+WaveletPacket + ChatterSignature + ToolBreakage (8 units, skip Gabor/WignerVille)
- MS5: Full (23 units — CAM physics + ERP analytics + quality stats)
- Delivers: Monte Carlo cost PDFs, learning curves, Timoshenko deflection, multivariate Cpk, chatter detection

**Phase B (Foundation): MS1 + MS4 = ~50 sessions**
- MS1: FEM 2D focus (skip 3D hex, defer to Phase C), symbolic AD, FDM thermal
- MS4: B-spline optimization, tolerance stack, DFM Bayesian, ICP alignment

**Phase C (Advanced): MS3 + MS6 + MS7 = ~74 sessions**
- MS3: Quantum-inspired (classical simulation, benchmarked vs PSO/GA/CMA-ES)
- MS6: Custom formulas (honest labels: canonical/prototype/novel)
- MS7: Cross-domain pipelines (capstone)

**Total: ~197 sessions** (phased, each phase independently valuable)

## Roadmap: 8 Milestones, 138 Units, ~197 Sessions (Phased)

### Dependency Graph
```
SCIMATH-MS0 (Linear Algebra) ─────────────────────────┐
    │                                                   │
    ▼                                                   │
SCIMATH-MS1 (Calculus / PDE / FEM) ──────┐             │
    │                                     │             │
    ▼                                     ▼             │
SCIMATH-MS2 (Wavelets / Signal)    SCIMATH-MS3 (Quantum / TDA)
    │                                     │
    └──────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
SCIMATH-MS4 (CAD Math)  SCIMATH-MS5 (CAM / ERP / Quality)
    │                     │
    └──────────┬──────────┘
               ▼
       SCIMATH-MS6 (Custom Formula Forge)
               │
               ▼
       SCIMATH-MS7 (Cross-Domain Pipelines)
```

---

## SCIMATH-MS0: Core Linear Algebra & Matrix Methods
**Brief:** SVD, QR, Cholesky, eigensolvers, sparse matrices, tensor algebra — the foundation every downstream engine needs.
**Units:** 17 | **Sessions:** ~24 | **Dependencies:** None

| Phase | Units | Key Engines |
|-------|-------|-------------|
| P0: Matrix Decompositions | 5 | SVDEngine, QRDecompositionEngine, CholeskyEngine, EigensolverEngine, MatrixFactorizationEngine |
| P1: Numerical Infrastructure | 4 | IterativeSolverEngine (CG/GMRES), SparseMatrixEngine (CSR/CSC), MatrixNormEngine, TensorAlgebraEngine (stress/strain) |
| P2: Applied Matrix Methods | 4 | SystemIdentificationEngine (N4SID), RobustRegressionEngine (Ridge/Lasso/RANSAC), RandomMatrixEngine, LinearAlgebraDispatcherActions |
| P3: Validation & Upgrades | 4 | Test suite (40 cases), Upgrade PCA→SVD-backed, Upgrade FEM→sparse, FormulaRegistry update |

**FORGE-TRIPLE:** Hook: enforce-linalg-canonical | Action: scimath_linalg (8 sub-actions) | Skill: /scimath-linalg
**MIT Courses:** 18.06, 18.065, 18.335, 18.085, 2.071, 2.014

---

## SCIMATH-MS1: Symbolic Calculus, PDE Solvers & FEM Expansion
**Brief:** Automatic differentiation, Gauss quadrature, FDM thermal/elastic, FEM 2D/3D, thermo-mechanical coupling, residual stress.
**Units:** 20 | **Sessions:** ~30 | **Dependencies:** SCIMATH-MS0

| Phase | Units | Key Engines |
|-------|-------|-------------|
| P0: Symbolic Calculus | 4 | SymbolicDifferentiationEngine (AD forward+reverse), NumericalIntegrationEngine (Gauss-Legendre), CalculusRegistry, CalculusDispatcher |
| P1: FDM Solvers | 4 | FDMSolverEngine (Crank-Nicolson), FDMThermalFieldEngine (2D heat+moving source), FDMElasticityEngine (plane stress/strain), FDMValidation |
| P2: FEM 2D/3D | 5 | FEM2DQuadEngine, FEM2DTriEngine, FEM3DHexEngine, FEMNonlinearEngine (Newton-Raphson), FEMThermalCoupledEngine |
| P3: Special PDE | 4 | MethodOfLinesEngine, ConvectionDiffusionEngine (SUPG), ResidualStressFEMEngine, PDEDispatcher (12 actions) |
| P4: Integration | 3 | Test suite (50 cases), PhysicsFusion FEM plugin, FormulaRegistry update |

**FORGE-TRIPLE:** Hook: enforce-fem-mesh-quality | Action: scimath_pde (12 sub-actions) | Skill: /scimath-fem
**MIT Courses:** 18.085, 18.336, 2.029, 2.071, 2.093, 2.094, 2.51, 2.810

---

## SCIMATH-MS2: Wavelets, Signal Processing & Time-Frequency Analysis
**Brief:** Symlet/Coiflet/Gabor wavelets, wavelet packets, EEMD, Wigner-Ville, chatter signature library, tool breakage detection, ISO 16610 surface texture.
**Units:** 15 | **Sessions:** ~20 | **Dependencies:** SCIMATH-MS0

| Phase | Units | Key Engines |
|-------|-------|-------------|
| P0: Extended Wavelets | 4 | SymletWaveletEngine, CoifletWaveletEngine, GaborWaveletEngine, WaveletPacketEngine |
| P1: Time-Frequency | 4 | STFTWaveletBridgeEngine, HilbertHuangUpgrade (EEMD/CEEMDAN), WignerVilleDistributionEngine, MatchedFilterEngine |
| P2: Manufacturing Signal | 4 | ChatterSignatureLibraryEngine, ToolBreakageDetectionEngine, SurfaceTextureDecompositionEngine (ISO 16610), BearingFaultSignatureEngine |
| P3: Dispatcher & Validation | 3 | WaveletDispatcher (13 actions), Test suite (35 cases), FormulaRegistry update |

**FORGE-TRIPLE:** Hook: enforce-wavelet-selection | Action: scimath_wavelet (13 sub-actions) | Skill: /scimath-wavelet
**MIT Courses:** 6.003, 6.341, 6.011, 2.14, 2.810, 2.671

---

## SCIMATH-MS3: Quantum-Inspired Optimization & Topological Data Analysis
**Brief:** Quantum annealing, QAOA, VQE for combinatorial manufacturing problems. Persistent homology for process fingerprinting and defect detection. Morse theory for CAD feature recognition.
**Units:** 16 | **Sessions:** ~24 | **Dependencies:** SCIMATH-MS0

| Phase | Units | Key Engines |
|-------|-------|-------------|
| P0: Quantum-Inspired | 5 | QuantumAnnealingEngine (QUBO/Ising), QAOAEngine (variational circuits), VQEEngine (ground state), QuantumWalkSearchEngine, QISPBenchmarkEngine |
| P1: TDA Manufacturing | 4 | PersistentHomologyPipelineEngine (Rips filtration), TDADefectDetectionEngine (Betti→porosity/cracks), TDAProcessFingerprintEngine (persistence landscapes), MorseTheoryEngine (critical points) |
| P2: Algebraic Topology | 3 | ManifoldAnalysisEngine (Isomap/UMAP), SimplicialDataAnalysisEngine (sensor coverage), HomologicalFeatureEngine (cubical CT scan) |
| P3: Dispatcher & Validation | 4 | QuantumDispatcher (5 actions), TDADispatcher (7 actions), Test suite (30 cases), FormulaRegistry update |

**FORGE-TRIPLE:** Hook: enforce-quantum-benchmark | Action: prism_quantum_math (5), scimath_tda (7) | Skill: /scimath-quantum, /scimath-tda
**MIT Courses:** 8.04, 8.05, 6.845, 18.435, 18.905, 18.950, Stanford CS 468

---

## SCIMATH-MS4: CAD Mathematical Enhancement
**Brief:** B-spline optimization, geodesic distance, Monte Carlo tolerance stack, DFM Bayesian learning, Lie group SE(3), dual quaternions, ICP alignment, differential geometry toolpaths.
**Units:** 15 | **Sessions:** ~20 | **Dependencies:** SCIMATH-MS0, MS1

| Phase | Units | Key Engines |
|-------|-------|-------------|
| P0: Surface Optimization | 4 | BSplineOptimizationEngine, GeodesicDistanceEngine (MMP/fast marching), CurvatureFlowEngine, MinimalSurfaceEngine (AM lattice) |
| P1: Tolerance & DFM | 4 | MonteCarloToleranceStackEngine, DFMBayesianLearningEngine, GeometricTolerancingEngine (GD&T), StatisticalToleranceAllocationEngine |
| P2: Rigid Body Geometry | 4 | LieGroupSE3Engine (screw axis), DualQuaternionEngine (ScLERP), FrameAlignmentEngine (ICP/RANSAC), DifferentialGeometryToolpathEngine (parallel transport) |
| P3: Dispatcher & Validation | 3 | CADMathDispatcher (16 actions), Test suite (35 cases), FormulaRegistry update |

**FORGE-TRIPLE:** Hook: enforce-geodesic-5axis | Action: scimath_cad_geometry (16) | Skill: /scimath-cad
**MIT Courses:** 2.158J, 18.950, 2.008, 2.830, 6.838, 6.867, 8.033, 18.755

---

## SCIMATH-MS5: CAM Physics, ERP Analytics & Quality Statistics
**Brief:** Johnson-Cook chip formation, Timoshenko beam, coolant CFD-lite, 5-axis cutting physics; Monte Carlo cost PDFs, learning curves, demand forecasting, ABC costing; multivariate Cpk, Gage R&R propagation, Bayesian reliability.
**Units:** 23 | **Sessions:** ~35 | **Dependencies:** SCIMATH-MS0, MS1, MS4

| Phase | Units | Key Engines |
|-------|-------|-------------|
| P0: CAM Physics | 5 | JohnsonCookChipFormationEngine, TimoshenkoBeamEngine, NonlinearDeflectionFEMBridgeEngine, CoolantCFDLiteEngine, FiveAxisCuttingPhysicsEngine |
| P1: ERP Analytics | 5 | MonteCarloCostPDFEngine, LearningCurveEngine (Crawford/Wright), DemandForecastingEngine (ARIMA/Holt-Winters), PriceElasticityEngine, ABCCostingEngine |
| P2: Quality Statistics | 5 | MultivariateProcessCapabilityEngine (Hotelling T²), GageRRPropagationEngine, BayesianReliabilityGrowthEngine, ProcessRobustnessIndexEngine (Taguchi S/N), AcceptanceSamplingEngine (MIL-STD-1916) |
| P3: Dispatcher Wiring | 4 | CAMPhysicsDispatcher (5), ERPAnalyticsDispatcher (9), QualityStatsDispatcher (7), Integration test suite (40 cases) |
| P4: Cross-Engine Validation | 4 | CAM test suite (25), ERP test suite (20), Quality test suite (15), FormulaRegistry update |

**FORGE-TRIPLE:** Hook: enforce-chip-formation-jc | Actions: scimath_cam_physics (5), scimath_erp_analytics (9), scimath_quality_stats (7) | Skills: /scimath-cam, /scimath-erp, /scimath-quality
**MIT Courses:** 2.810, 2.071, 2.094, 2.006, 2.29, 15.060, 15.071, 15.515, 14.01, 2.830, 2.671, 6.431

---

## SCIMATH-MS6: Custom Manufacturing Formulas & Formula Forge
**Brief:** 10 PRISM-unique cross-domain formulas (not in any textbook) + FormulaForge meta-engine for composing formulas from primitives with automatic uncertainty propagation.
**Units:** 17 | **Sessions:** ~25 | **Dependencies:** SCIMATH-MS0 through MS5

| Phase | Units | Key Custom Formulas |
|-------|-------|-------------|
| P0: Cross-Domain Composites | 5 | ThermoMechanicalWearFormula (JC+Jaeger+Usui+Bayesian), StochasticToleranceDeflectionFormula (MC tolerance+Timoshenko+force uncertainty), TopologicalChatterIndex (TDA+SLD+wavelet), QuantumInspiredScheduleOptimality (QA+learning curve+MC), InformationTheoreticProcessHealth (entropy+transfer entropy+wavelet+Bayesian) |
| P1: Novel Manufacturing | 5 | GeodesicScallopHeight (geodesic+cutter geometry+curvature), BayesianMachinability (Bayesian+Kienzle+production data), FEMCorrectedDeflectionCompensation (FEM+toolpath+G-code), ParetoToleranceCost (allocation+ABC+Pareto), WaveletBearingRemainingLife (wavelet+Weibull+Kalman) |
| P2: Formula Forge Infrastructure | 4 | FormulaForgeEngine (DAG composition), FormulaValidationFramework (Buckingham Pi+monotonicity), FormulaDocumentationEngine (LaTeX+sensitivity), FormulaForgeDispatcher (7 actions) |
| P3: Validation | 3 | Test suite (40 cases), FormulaRegistry update, AlgorithmRegistry update |

**FORGE-TRIPLE:** Hook: enforce-formula-validation | Action: prism_formula_forge (7) | Skill: /formula-forge
**MIT Courses:** ALL 220+ courses (cross-domain synthesis)

---

## SCIMATH-MS7: Cross-Domain Pipelines & Manufacturing Intelligence Chains
**Brief:** 12 end-to-end pipelines that chain math engines across domains into actionable business outcomes. The capstone: physics → cost → quality → scheduling → quote.
**Units:** 15 | **Sessions:** ~25 | **Dependencies:** SCIMATH-MS0 through MS6

| Phase | Units | Key Pipelines |
|-------|-------|-------------|
| P0: Physics-to-Cost | 4 | ParetoToolpathCostPipeline, FirstArticleOptimalPipeline, PredictiveMaintenanceCostPipeline, SupplierQuoteValidationPipeline |
| P1: Quality-to-Decision | 4 | ProcessCapabilityDrivenSchedulingPipeline, GageRRToTolerancePipeline, TopologicalProcessDriftPipeline, ReliabilityGrowthToCapacityPipeline |
| P2: End-to-End Intelligence | 4 | DrawingToQuoteMathPipeline (9-step probabilistic quote), ContinuousImprovementPipeline (every job makes PRISM smarter), DigitalTwinMathPipeline (real-time FEM+TDA+cost), WhatIfScenarioEngine |
| P3: Infrastructure | 3 | PipelineOrchestratorMathEngine, Test suite (50 cases), FormulaRegistry update |

**FORGE-TRIPLE:** Hook: enforce-pipeline-uncertainty | Action: prism_math_pipeline (12) | Skill: /scimath-pipeline, /what-if-math
**MIT Courses:** ALL courses (capstone integrates everything)

---

## Summary

| Milestone | Phases | Units | New Engines | New Actions | Sessions |
|-----------|--------|-------|-------------|-------------|----------|
| SCIMATH-MS0: Linear Algebra | 4 | 17 | 13 + 4 upgrades | 8 | 24 |
| SCIMATH-MS1: Calculus/PDE/FEM | 5 | 20 | 14 + 2 upgrades | 12 | 30 |
| SCIMATH-MS2: Wavelets/Signal | 4 | 15 | 12 | 13 | 20 |
| SCIMATH-MS3: Quantum/TDA | 4 | 16 | 11 | 12 | 24 |
| SCIMATH-MS4: CAD Math | 4 | 15 | 12 | 16 | 20 |
| SCIMATH-MS5: CAM/ERP/Quality | 5 | 23 | 15 | 21 | 35 |
| SCIMATH-MS6: Custom Formulas | 4 | 17 | 14 | 7 | 25 |
| SCIMATH-MS7: Pipelines | 4 | 15 | 12 | 12 | 25 |
| **TOTAL** | **34** | **138** | **~103 + 6 upgrades** | **~101** | **~203** |

## Critical Files
- `src/physics/constants.ts` — All material properties (kc1_1, mc, E_GPa, k_thermal)
- `src/registries/FormulaRegistry.ts` — Register all ~60 new formulas
- `src/registries/AlgorithmRegistry.ts` — Register all ~30 new algorithms
- `src/tools/dispatchers/scientificMathDispatcher.ts` — Extend from 5→~30 actions; pattern for new sub-dispatchers
- `src/engines/MathIntegrationPipelineEngine.ts` — Pipeline chaining pattern for MS7

## Safety Gates (Agent 17 — MANDATORY)

| Gate | Where | Check |
|------|-------|-------|
| NaN/Infinity guard | Every custom formula (MS6) | `if (!isFinite(result)) throw` + domain bounds |
| FEM validation | MS1 FEM engines | Must agree with beam model within ±20% on simple cases |
| G-code compensation | MS6 FEM deflection | Offline only; operator approval before post-processing |
| Quantum bias check | MS3 optimization | Must benchmark vs classical (PSO/GA); flag if >10% worse |
| Monte Carlo convergence | MS5 cost PDF | Require ≥10K samples; check P90 stability (±2% between runs) |
| Chatter false-negative | MS2 detection | Specify ROC curve; false-negative rate <5% at 90% confidence |
| Pipeline uncertainty | MS7 pipelines | Track confidence degradation; warn if <60% at any stage |

## RGS Pipeline Compliance

This roadmap follows the 10-stage RGS pipeline:
- **Stage 1 (Brief):** ✅ Parsed into 8 milestones across linear algebra, calculus, wavelets, quantum, CAD, CAM/ERP/quality, custom formulas, pipelines
- **Stage 2 (Audit):** ✅ 181 existing math/physics engines audited; DO NOT REBUILD list specified
- **Stage 3 (Knowledge):** ✅ Per-milestone knowledge sources (engines, formulas, constants, MIT courses)
- **Stage 4 (Scope):** ✅ Classified XL; phased into A/B/C for incremental delivery
- **Stage 5 (Phases):** ✅ 34 phases with session boundaries and compact points
- **Stage 6 (Units):** ✅ 138 units with exit criteria and edge cases
- **Stage 7 (Forge-Triple):** ✅ Hook + Action + Skill per milestone
- **Stage 8 (Enforcement):** Active hooks: physics agent, wiring agent, constants checker, stub detector, review gate, forge-triple gate
- **Stage 9 (Dependencies):** ✅ DAG validated; no circular deps; compact points don't split dependent units
- **Stage 10 (Output):** Milestone JSONs to be written to `data/milestones/SCIMATH-MS{0-7}.json` upon approval

## Verification
1. **Per-unit:** `node --max-old-space-size=16384 node_modules/typescript/bin/tsc --noEmit` (0 errors), vitest for engine test file, dispatcher action callable via MCP
2. **Per-milestone:** Full test suite passes, FORGE-TRIPLE complete (hook+action+skill), FormulaRegistry updated, safety gates pass
3. **Per-phase:** Phase A delivers independently useful Monte Carlo cost PDFs + chatter detection + multivariate Cpk
4. **Final:** All 12 MS7 pipelines produce physically meaningful results on real machining scenarios; DrawingToQuoteMathPipeline generates probabilistic quote with P10/P50/P90

## Execution: After Plan Approval
1. Write 8 milestone JSONs to `data/milestones/SCIMATH-MS{0-7}.json`
2. Update `roadmap-index.json` with new milestones
3. Update `CURRENT_POSITION.md` and coordination state
4. Begin Phase A (MVP): `/rgs continue SCIMATH-MS0` (slim variant)
