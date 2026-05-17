# COURSE-FORGE-STUBS — auto-emitted /forge proposal bundle

**Generator:** scripts/course-data-router.mjs (`--emit forge-stubs`)
**Generated:** 2026-05-17T15:31:48.697Z
**Source:** `state/shared/specs/COURSE-DATA-ROUTING-LEDGER.json` (69 FORGE-QUEUE items, 65 courses)
**Filter:** `mfg_relevance >= 0.6` → 62 stubs surfaced
**Status:** advisory · mustHumanVerify · NOT auto-build

> Per `state/shared/specs/COURSE-FORGE-PROPOSALS.md` (P1-P10 hand-curated) + Lane C policy:
> every entry below requires operator review + `duplicationGuardEngine.mustCheckBeforeCreating()`
> + (for formulas) `physics-reviewer` agent PASS before `/forge-triple` invocation.

## Hard gates (do NOT bypass)

- `duplicationGuardEngine.mustCheckBeforeCreating()` THROWS on dup at /forge time.
- Formula stubs: physics-reviewer PASS REQUIRED; constants land in `src/physics/constants.ts` only.
- Tier-1 CAM bridges (Mastercam, hyperMILL, Esprit, Fusion 360, Inventor HSM, SolidWorks) auto-REJECTED.
- Course-derived intent ≠ production-validated. The course is the IDEA source; PRISM convention + JM Die data is the VALIDATION source.

---

## Stubs

### #1 algorithm:batch-reactor-sizing-algorithm (10.490-fall-2006 / "Integrated Chemical Engineering I")

- **mfg_relevance:** 0.80
- **domains:** cad, cam, process optimization
- **proposed_path:** `mcp-server/src/algorithms/BatchReactorSizingAlgorithm.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:batch-reactor-sizing-algorithm`

### #2 algorithm:bayes-net-inference (9.66j / "Computational Cognitive Science")

- **mfg_relevance:** 0.80
- **domains:** cam, control, thermal
- **proposed_path:** `mcp-server/src/algorithms/BayesNetInference.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:bayes-net-inference`

### #3 algorithm:bayes-nets (6.871 / "Knowledge-Based Applications Systems")

- **mfg_relevance:** 0.80
- **domains:** cam, scheduling, thermal
- **proposed_path:** `mcp-server/src/algorithms/BayesNets.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:bayes-nets`

### #4 algorithm:bernoullis-equation-solver (1.060-spring-2006 / "Engineering Mechanics II")

- **mfg_relevance:** 0.80
- **domains:** cam, metrology
- **proposed_path:** `mcp-server/src/algorithms/BernoullisEquationSolver.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:bernoullis-equation-solver`

### #5 algorithm:cahn-hilliard-equation-solver (3.21 / "Kinetic Processes in Materials")

- **mfg_relevance:** 0.80
- **domains:** cam, materials, metrology
- **proposed_path:** `mcp-server/src/algorithms/CahnHilliardEquationSolver.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:cahn-hilliard-equation-solver`

### #6 algorithm:cam-path-optimization (2.007-spring-2009 / "Design and Manufacturing I")

- **mfg_relevance:** 0.80
- **domains:** cad, cam
- **proposed_path:** `mcp-server/src/algorithms/CamPathOptimization.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** **REJECT** — name matches first-party PRISM stack (no forge)
- **action:** `REJECT (reclassify TRIBAL-SHIPPED)`

### #7 algorithm:differential-evolution (15.099-fall-2003 / "Readings in Optimization")

- **mfg_relevance:** 0.80
- **domains:** cam, scheduling, thermal
- **proposed_path:** `mcp-server/src/algorithms/DifferentialEvolution.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** **REVIEW** — name-similarity hits: DifferentialEvolutionEngine
- **action:** `/forge-triple algorithm:differential-evolution`

### #8 algorithm:ellipsoid-method (15.083J / "Integer Programming and Combinatorial Optimization")

- **mfg_relevance:** 0.80
- **domains:** cam, scheduling
- **proposed_path:** `mcp-server/src/algorithms/EllipsoidMethod.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:ellipsoid-method`

### #9 algorithm:euler-method (2.003j-fall-2007 / "Dynamics and Control I")

- **mfg_relevance:** 0.80
- **domains:** cad, cam, control
- **proposed_path:** `mcp-server/src/algorithms/EulerMethod.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:euler-method`

### #10 algorithm:finite-difference-method (2.086 / "Numerical Computation for Mechanical Engineers")

- **mfg_relevance:** 0.80
- **domains:** cam, thermal, control
- **proposed_path:** `mcp-server/src/algorithms/FiniteDifferenceMethod.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:finite-difference-method`

### #11 algorithm:finite-element-analysis (1.050-fall-2004 / "Solid Mechanics")

- **mfg_relevance:** 0.80
- **domains:** cam, thermal
- **proposed_path:** `mcp-server/src/algorithms/FiniteElementAnalysis.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:finite-element-analysis`

### #12 algorithm:finite-element-analysis (3.22 / "Mechanical Behavior of Materials")

- **mfg_relevance:** 0.80
- **domains:** cam, metrology, thermal
- **proposed_path:** `mcp-server/src/algorithms/FiniteElementAnalysis.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:finite-element-analysis`

### #13 algorithm:finite-element-method (1.105-fall-2003 / "Solid Mechanics Laboratory")

- **mfg_relevance:** 0.80
- **domains:** cad, cam, metrology
- **proposed_path:** `mcp-server/src/algorithms/FiniteElementMethod.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:finite-element-method`

### #14 algorithm:gradient-descent (18.02-spring-2006 / "Multivariable Calculus")

- **mfg_relevance:** 0.80
- **domains:** cam, metrology
- **proposed_path:** `mcp-server/src/algorithms/GradientDescent.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:gradient-descent`

### #15 algorithm:lagranges-equations (16.07 / "Dynamics")

- **mfg_relevance:** 0.80
- **domains:** cam, metrology
- **proposed_path:** `mcp-server/src/algorithms/LagrangesEquations.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:lagranges-equations`

### #16 algorithm:lagranges-equations (2.032 / "Dynamics")

- **mfg_relevance:** 0.80
- **domains:** cam, metrology
- **proposed_path:** `mcp-server/src/algorithms/LagrangesEquations.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:lagranges-equations`

### #17 algorithm:lesat-algorithm (16.852j-fall-2005 / "Integrating the Lean Enterprise")

- **mfg_relevance:** 0.80
- **domains:** cad, cam, scheduling
- **proposed_path:** `mcp-server/src/algorithms/LesatAlgorithm.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:lesat-algorithm`

### #18 algorithm:multigrid-method (18.086 / "Mathematical Methods for Engineers II")

- **mfg_relevance:** 0.80
- **domains:** cam, thermal, control
- **proposed_path:** `mcp-server/src/algorithms/MultigridMethod.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:multigrid-method`

### #19 algorithm:mutation-testing (6.883 / "Program Analysis")

- **mfg_relevance:** 0.80
- **domains:** cam, scheduling, metrology
- **proposed_path:** `mcp-server/src/algorithms/MutationTesting.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:mutation-testing`

### #20 algorithm:newmarks-algorithm (16.225 / "Computational Mechanics of Materials")

- **mfg_relevance:** 0.80
- **domains:** thermal, control
- **proposed_path:** `mcp-server/src/algorithms/NewmarksAlgorithm.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:newmarks-algorithm`

### #21 algorithm:numerical-integration (3.016 / "Mathematics for Materials Scientists and Engineers")

- **mfg_relevance:** 0.80
- **domains:** cam, thermal, control
- **proposed_path:** `mcp-server/src/algorithms/NumericalIntegration.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** **REVIEW** — name-similarity hits: NumericalIntegrationEngine
- **action:** `/forge-triple algorithm:numerical-integration`

### #22 algorithm:operator-splitting (10.34 / "Numerical Methods Applied to Chemical Engineering")

- **mfg_relevance:** 0.80
- **domains:** cam, thermal
- **proposed_path:** `mcp-server/src/algorithms/OperatorSplitting.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:operator-splitting`

### #23 algorithm:operator-splitting (resources / "resources")

- **mfg_relevance:** 0.80
- **domains:** cam, thermal
- **proposed_path:** `mcp-server/src/algorithms/OperatorSplitting.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:operator-splitting`

### #24 algorithm:pendulum-cart-modeling (2.003 / "Modeling Dynamics and Control I")

- **mfg_relevance:** 0.80
- **domains:** control, thermal, vibration
- **proposed_path:** `mcp-server/src/algorithms/PendulumCartModeling.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:pendulum-cart-modeling`

### #25 algorithm:pid-tuning (2.004 / "Dynamics and Control II")

- **mfg_relevance:** 0.80
- **domains:** control, cam
- **proposed_path:** `mcp-server/src/algorithms/PidTuning.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:pid-tuning`

### #26 algorithm:pugh_chart_selection (ec.s06-fall-2005 / "Prototypes to Products")

- **mfg_relevance:** 0.80
- **domains:** cad, cam, scheduling
- **proposed_path:** `mcp-server/src/algorithms/PughChartSelection.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:pugh_chart_selection`

### #27 algorithm:response-surface-modeling (2.830j-spring-2008 / "Control of Manufacturing Processes (SMA 6303)")

- **mfg_relevance:** 0.80
- **domains:** cam, metrology, control
- **proposed_path:** `mcp-server/src/algorithms/ResponseSurfaceModeling.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:response-surface-modeling`

### #28 algorithm:singular-value-decomposition (12.864 / "Inference from Data and Models")

- **mfg_relevance:** 0.80
- **domains:** cam, metrology, scheduling
- **proposed_path:** `mcp-server/src/algorithms/SingularValueDecomposition.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:singular-value-decomposition`

### #29 algorithm:taylor_series_expansion (18.098 / "Street-Fighting Mathematics")

- **mfg_relevance:** 0.80
- **domains:** cam, scheduling
- **proposed_path:** `mcp-server/src/algorithms/TaylorSeriesExpansion.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:taylor_series_expansion`

### #30 algorithm:transition-equations-solver (2.854-fall-2016 / "Introduction to Manufacturing Systems")

- **mfg_relevance:** 0.80
- **domains:** cad, cam, scheduling
- **proposed_path:** `mcp-server/src/algorithms/TransitionEquationsSolver.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:transition-equations-solver`

### #31 algorithm:value-iteration (6.231 / "Dynamic Programming and Stochastic Control")

- **mfg_relevance:** 0.80
- **domains:** cam, scheduling, control
- **proposed_path:** `mcp-server/src/algorithms/ValueIteration.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:value-iteration`

### #32 algorithm:wave-propagation-simulation-algorithm (3.60 / "Symmetry, Structure, and Tensor Properties of Materials")

- **mfg_relevance:** 0.80
- **domains:** materials, metrology
- **proposed_path:** `mcp-server/src/algorithms/WavePropagationSimulationAlgorithm.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:wave-propagation-simulation-algorithm`

### #33 engine:architectural-engine (ESD.34 / "System Architecture")

- **mfg_relevance:** 0.80
- **domains:** cad, cam, metrology, scheduling
- **proposed_path:** `mcp-server/src/engines/ArchitecturalEngine.ts`
- **dispatcher_action:** `(operator-select existing dispatcher)`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple engine:architectural-engine`

### #34 engine:cilk-runtime-system (6.189 / "Multicore Programming Primer")

- **mfg_relevance:** 0.80
- **domains:** cam, scheduling, control
- **proposed_path:** `mcp-server/src/engines/CilkRuntimeSystemEngine.ts`
- **dispatcher_action:** `(operator-select existing dispatcher)`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple engine:cilk-runtime-system`

### #35 engine:constraint-based-optimizer (9.66j / "Computational Cognitive Science")

- **mfg_relevance:** 0.80
- **domains:** cam, control, thermal
- **proposed_path:** `mcp-server/src/engines/ConstraintBasedOptimizerEngine.ts`
- **dispatcher_action:** `(operator-select existing dispatcher)`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple engine:constraint-based-optimizer`

### #36 engine:digital-logic-engine (16.682 / "Prototyping Avionics")

- **mfg_relevance:** 0.80
- **domains:** control, thermal
- **proposed_path:** `mcp-server/src/engines/DigitalLogicEngine.ts`
- **dispatcher_action:** `(operator-select existing dispatcher)`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple engine:digital-logic-engine`

### #37 engine:dynamic-system-simulation-engine (2.141 / "Modeling and Simulation of Dynamic Systems")

- **mfg_relevance:** 0.80
- **domains:** cam, metrology
- **proposed_path:** `mcp-server/src/engines/DynamicSystemSimulationEngine.ts`
- **dispatcher_action:** `(operator-select existing dispatcher)`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple engine:dynamic-system-simulation-engine`

### #38 engine:economic-model-engine (10.490-fall-2006 / "Integrated Chemical Engineering I")

- **mfg_relevance:** 0.80
- **domains:** cad, cam, process optimization
- **proposed_path:** `mcp-server/src/engines/EconomicModelEngine.ts`
- **dispatcher_action:** `(operator-select existing dispatcher)`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple engine:economic-model-engine`

### #39 engine:finite-element-analysis-fea (18.02-spring-2006 / "Multivariable Calculus")

- **mfg_relevance:** 0.80
- **domains:** cam, metrology
- **proposed_path:** `mcp-server/src/engines/FiniteElementAnalysisFeaEngine.ts`
- **dispatcher_action:** `(operator-select existing dispatcher)`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple engine:finite-element-analysis-fea`

### #40 engine:inertial-guidance-system (16.07 / "Dynamics")

- **mfg_relevance:** 0.80
- **domains:** cam, metrology
- **proposed_path:** `mcp-server/src/engines/InertialGuidanceSystemEngine.ts`
- **dispatcher_action:** `(operator-select existing dispatcher)`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple engine:inertial-guidance-system`

### #41 engine:lean-enterprise-engine (16.852j-fall-2005 / "Integrating the Lean Enterprise")

- **mfg_relevance:** 0.80
- **domains:** cad, cam, scheduling
- **proposed_path:** `mcp-server/src/engines/LeanEnterpriseEngine.ts`
- **dispatcher_action:** `(operator-select existing dispatcher)`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple engine:lean-enterprise-engine`

### #42 engine:lean-manufacturing-engine (16.885j-fall-2004 / "Aircraft Systems Engineering")

- **mfg_relevance:** 0.80
- **domains:** cam, scheduling, thermal
- **proposed_path:** `mcp-server/src/engines/LeanManufacturingEngine.ts`
- **dispatcher_action:** `(operator-select existing dispatcher)`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple engine:lean-manufacturing-engine`

### #43 engine:material-property-prediction-engine (3.60 / "Symmetry, Structure, and Tensor Properties of Materials")

- **mfg_relevance:** 0.80
- **domains:** materials, metrology
- **proposed_path:** `mcp-server/src/engines/MaterialPropertyPredictionEngine.ts`
- **dispatcher_action:** `(operator-select existing dispatcher)`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple engine:material-property-prediction-engine`

### #44 engine:material-property-prediction-engine (3.225-fall-2007 / "Electronic and Mechanical Properties of Materials")

- **mfg_relevance:** 0.80
- **domains:** materials, metrology
- **proposed_path:** `mcp-server/src/engines/MaterialPropertyPredictionEngine.ts`
- **dispatcher_action:** `(operator-select existing dispatcher)`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple engine:material-property-prediction-engine`

### #45 engine:operating-window-methods (esd.33-summer-2010 / "Systems Engineering")

- **mfg_relevance:** 0.80
- **domains:** cam, thermal, scheduling
- **proposed_path:** `mcp-server/src/engines/OperatingWindowMethodsEngine.ts`
- **dispatcher_action:** `(operator-select existing dispatcher)`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple engine:operating-window-methods`

### #46 engine:pdca-cycle-engine (esd.60-summer-2004 / "Lean/Six Sigma Processes")

- **mfg_relevance:** 0.80
- **domains:** scheduling, metrology
- **proposed_path:** `mcp-server/src/engines/PdcaCycleEngine.ts`
- **dispatcher_action:** `(operator-select existing dispatcher)`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple engine:pdca-cycle-engine`

### #47 engine:policy-iteration-engine (6.231 / "Dynamic Programming and Stochastic Control")

- **mfg_relevance:** 0.80
- **domains:** cam, scheduling, control
- **proposed_path:** `mcp-server/src/engines/PolicyIterationEngine.ts`
- **dispatcher_action:** `(operator-select existing dispatcher)`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple engine:policy-iteration-engine`

### #48 engine:relativistic-dynamics-engine (8.022 / "Physics II: Electricity and Magnetism")

- **mfg_relevance:** 0.80
- **domains:** thermal, cam
- **proposed_path:** `mcp-server/src/engines/RelativisticDynamicsEngine.ts`
- **dispatcher_action:** `(operator-select existing dispatcher)`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple engine:relativistic-dynamics-engine`

### #49 engine:scheme-evaluator-engine (6.001 / "Structure and Interpretation of Computer Programs")

- **mfg_relevance:** 0.80
- **domains:** cam, process optimization
- **proposed_path:** `mcp-server/src/engines/SchemeEvaluatorEngine.ts`
- **dispatcher_action:** `(operator-select existing dispatcher)`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple engine:scheme-evaluator-engine`

### #50 engine:seelect (6.871 / "Knowledge-Based Applications Systems")

- **mfg_relevance:** 0.80
- **domains:** cam, scheduling, thermal
- **proposed_path:** `mcp-server/src/engines/SeelectEngine.ts`
- **dispatcher_action:** `(operator-select existing dispatcher)`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple engine:seelect`

### #51 engine:simulink-models (2.004 / "Dynamics and Control II")

- **mfg_relevance:** 0.80
- **domains:** control, cam
- **proposed_path:** `mcp-server/src/engines/SimulinkModelsEngine.ts`
- **dispatcher_action:** `(operator-select existing dispatcher)`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple engine:simulink-models`

### #52 engine:solidworks (2.007-spring-2009 / "Design and Manufacturing I")

- **mfg_relevance:** 0.80
- **domains:** cad, cam
- **proposed_path:** `mcp-server/src/engines/SolidworksEngine.ts`
- **dispatcher_action:** `(operator-select existing dispatcher)`
- **physics_gate:** not required
- **dedup_preflight:** **REJECT** — name matches first-party PRISM stack (no forge)
- **action:** `REJECT (reclassify TRIBAL-SHIPPED)`

### #53 engine:test-case-reduction-engine (6.883 / "Program Analysis")

- **mfg_relevance:** 0.80
- **domains:** cam, scheduling, metrology
- **proposed_path:** `mcp-server/src/engines/TestCaseReductionEngine.ts`
- **dispatcher_action:** `(operator-select existing dispatcher)`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple engine:test-case-reduction-engine`

### #54 formula:buckling-formula (1.050-fall-2004 / "Solid Mechanics")

- **mfg_relevance:** 0.80
- **domains:** cam, thermal
- **proposed_path:** `mcp-server/src/physics/constants.ts + prism_calc:<action>`
- **dispatcher_action:** `prism_calc:<action> (constants ALWAYS in physics/constants.ts)`
- **physics_gate:** required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple formula:buckling-formula`

### #55 formula:euler-buckling-formula (1.105-fall-2003 / "Solid Mechanics Laboratory")

- **mfg_relevance:** 0.80
- **domains:** cad, cam, metrology
- **proposed_path:** `mcp-server/src/physics/constants.ts + prism_calc:<action>`
- **dispatcher_action:** `prism_calc:<action> (constants ALWAYS in physics/constants.ts)`
- **physics_gate:** required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple formula:euler-buckling-formula`

### #56 formula:kinetic-rate-equation (10.490-fall-2006 / "Integrated Chemical Engineering I")

- **mfg_relevance:** 0.80
- **domains:** cad, cam, process optimization
- **proposed_path:** `mcp-server/src/physics/constants.ts + prism_calc:<action>`
- **dispatcher_action:** `prism_calc:<action> (constants ALWAYS in physics/constants.ts)`
- **physics_gate:** required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple formula:kinetic-rate-equation`

### #57 formula:moody-diagram-analysis (1.060-spring-2006 / "Engineering Mechanics II")

- **mfg_relevance:** 0.80
- **domains:** cam, metrology
- **proposed_path:** `mcp-server/src/physics/constants.ts + prism_calc:<action>`
- **dispatcher_action:** `prism_calc:<action> (constants ALWAYS in physics/constants.ts)`
- **physics_gate:** required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple formula:moody-diagram-analysis`

### #58 formula:transfer-functions (2.003 / "Modeling Dynamics and Control I")

- **mfg_relevance:** 0.80
- **domains:** control, thermal, vibration
- **proposed_path:** `mcp-server/src/physics/constants.ts + prism_calc:<action>`
- **dispatcher_action:** `prism_calc:<action> (constants ALWAYS in physics/constants.ts)`
- **physics_gate:** required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple formula:transfer-functions`

### #59 formula:transistor-gain-formula (16.682 / "Prototyping Avionics")

- **mfg_relevance:** 0.80
- **domains:** control, thermal
- **proposed_path:** `mcp-server/src/physics/constants.ts + prism_calc:<action>`
- **dispatcher_action:** `prism_calc:<action> (constants ALWAYS in physics/constants.ts)`
- **physics_gate:** required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple formula:transistor-gain-formula`

### #60 algorithm:cauchy-goursat-theorem (18.112-fall-2008 / "Functions of a Complex Variable")

- **mfg_relevance:** 0.70
- **domains:** cam, metrology
- **proposed_path:** `mcp-server/src/algorithms/CauchyGoursatTheorem.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:cauchy-goursat-theorem`

### #61 algorithm:louvain-algorithm (esd.342-spring-2006 / "Advanced System Architecture")

- **mfg_relevance:** 0.60
- **domains:** cam, metrology, scheduling
- **proposed_path:** `mcp-server/src/algorithms/LouvainAlgorithm.ts`
- **dispatcher_action:** `prism_calc:<action> OR prism_intelligence:<action>`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple algorithm:louvain-algorithm`

### #62 engine:ucinet (esd.342-spring-2006 / "Advanced System Architecture")

- **mfg_relevance:** 0.60
- **domains:** cam, metrology, scheduling
- **proposed_path:** `mcp-server/src/engines/UcinetEngine.ts`
- **dispatcher_action:** `(operator-select existing dispatcher)`
- **physics_gate:** not required
- **dedup_preflight:** CLEAR (no name-match in algorithms/ or engines/)
- **action:** `/forge-triple engine:ucinet`

---

## Re-run

```bash
node scripts/course-data-router.mjs --emit forge-stubs --min-relevance 0.6
node scripts/course-data-router.mjs --emit forge-stubs --min-relevance 0.8  # top tier only
```

## Related

- `state/shared/specs/COURSE-FORGE-PROPOSALS.md` — hand-curated P1-P10 (companion doc)
- `state/shared/specs/COURSE-DATA-ROUTING-LEDGER.{json,md}` — full inventory
- `state/shared/specs/COURSE-DATA-ROUTING-PIPELINE.md` — 3-lane policy doctrine
- `mcp-server/src/engines/DuplicationGuardEngine.ts` — pre-create gate (THROWS on dup)
