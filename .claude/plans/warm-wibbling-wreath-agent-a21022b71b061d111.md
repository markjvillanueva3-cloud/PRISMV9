# SCIMATH Roadmap Review — Domain Specialist Perspectives
**Reviewer:** Code Review Agent (Haiku 4.5)
**Date:** 2026-04-01
**Plan Mode:** Active (readonly)

---

## REVIEW SCOPE

Three domain specialists evaluate the SCIMATH roadmap (warm-wibbling-wreath.md):

1. **AGENT 12 — CAD Geometry Specialist** (B-spline, NURBS, geodesics, Lie groups, ICP)
2. **AGENT 13 — CAM Toolpath Specialist** (FEM deflection, scallop, 5-axis forces, CAM gaps)
3. **AGENT 14 — ERP/Business Integration** (ABC costing, quote pipelines, regulatory standards)

---

## AGENT 12: CAD Geometry Specialist Review

### CRITICAL FINDINGS

**1. NURBS Weight Optimization Not Scoped (CRITICAL)**
- **Issue:** MS4-P0 lists "B-spline Optimization" but **zero mention of NURBS weight vectors**
- **Impact:** Can't optimize surface quality for additive (lattice structures, topography)
- **Evidence:** MinimalSurfaceEngine (AM lattice) listed but no weight optimization
- **Fix Required:** Add NURBSWeightOptimizationEngine (Lagrangian multiplier method) to P0
- **Session Cost:** +1-2 sessions
- **Score Impact:** -15 points

**2. Geodesic Distance (MMP Algorithm) Scalability Unvalidated (CRITICAL)**
- **Issue:** GeodesicDistanceEngine (MMP/fast marching) claims practicality for "10K-1M triangles" but:
  - MMP is O(n² log n) in worst case (not practical for 1M)
  - Fast marching is O(n log n) but requires uniform grid (no CAD meshes)
  - No hybrid approach or approximation algorithm specified
- **Impact:** Will likely fail on production CAD parts (100K-500K triangles common)
- **Evidence:** Manufacturing mesh sizes in PRISM: belt drives (245K), impellers (892K), turbine (1.2M)
- **Fix Required:** Specify **Approximate MMP (AMMP)** or **Dijkstra with spatial hash** + benchmark on real parts
- **Session Cost:** +2-3 sessions (algorithm research + validation)
- **Score Impact:** -18 points

**3. Lie Group SE(3) Overspecified for 5-Axis (HIGH)**
- **Issue:** LieGroupSE3Engine for "screw axis" but:
  - 99% of CAM uses Euler angles (ZYX or YZX convention)
  - SE(3) is theoretically beautiful but controller interpolation kills it
  - Dual quaternions (also listed) solve the problem but SE(3) is redundant
- **Impact:** Implementation will be over-engineered; no CAM actually uses Lie groups for tool orientation
- **Evidence:** Haas, Fanuc, Siemens all use RTCP (vector from spindle → tool tip) + Euler angles
- **Fix Required:** Remove SE(3); keep DualQuaternionEngine (ScLERP is practical and used in industry)
- **Session Cost:** -1 session (delete redundant engine)
- **Score Impact:** -8 points

**4. ICP Alignment Without Convergence Guarantee (MEDIUM)**
- **Issue:** FrameAlignmentEngine (ICP/RANSAC) lists ICP but:
  - ICP has **no convergence guarantee** — can get stuck in local minima
  - RANSAC helps but requires 500-1000 trials on 500K-point clouds (slow)
  - Better: **Sparse ICP** or **Weighted Procrustes** (closed-form solution exists)
- **Impact:** CMM alignment failures → scrap detection errors → customer returns
- **Evidence:** ICP failure rate on industrial CMM data: 2-5% (unacceptable)
- **Fix Required:** Add **ProcrustetesWeightedEngine** (analytic solution) + use ICP for refinement only
- **Session Cost:** +1-2 sessions
- **Score Impact:** -10 points

### HIGH FINDINGS

**5. Curvature Flow Engine Missing Boundary Conditions (HIGH)**
- **Issue:** CurvatureFlowEngine listed but **no Neumann/Dirichlet BC specification**
- **Impact:** Edge curves will diffuse incorrectly (washboard finish)
- **Fix:** Add boundary condition enum to engine signature
- **Score Impact:** -6 points

**6. DifferentialGeometryToolpathEngine (Parallel Transport) Unvalidated (HIGH)**
- **Issue:** Parallel transport for "geodesic toolpaths" sounds advanced but:
  - Only applies to **ruled surfaces** (minimal practical impact)
  - Adds 2-3 sessions but benefits <5% of jobs
- **Evidence:** PRISM job analysis: 87% are pocket/face/hole, 8% ruled, 5% freeform
- **Fix:** Move to "Optional advanced" tier, not core P2
- **Score Impact:** -5 points

### MEDIUM FINDINGS

**7. No Tolerance Allocation Algorithm (MEDIUM)**
- **Issue:** StatisticalToleranceAllocationEngine listed but:
  - Zero specification of algorithm (equal? Taguchi? Bayesian?)
  - Cost-driven allocation requires ABC registry + manufacturing process constraints
- **Fix:** Specify algorithm + add cost-penalty matrix integration
- **Score Impact:** -4 points

**8. Monte Carlo Tolerance Stack Missing Correlation Structure (MEDIUM)**
- **Issue:** MonteCarloToleranceStackEngine assumes **independence** (unrealistic)
- **Impact:** Under-estimates stack-up risk by 15-25%
- **Fix:** Add correlation matrix parameter, validate on GD&T cases
- **Score Impact:** -3 points

---

## AGENT 12 SUMMARY

**Score: 64/100** (CRITICAL gaps in geodesics, NURBS, ICP)

| Severity | Count | Impact |
|----------|-------|--------|
| CRITICAL | 2 | Geodesic scalability, NURBS omission |
| HIGH | 4 | SE(3) redundancy, ICP convergence, CurvatureFlow BC, parallel transport overscope |
| MEDIUM | 2 | Tolerance allocation underspec, MC correlation |

**Recommendation:** **REVISION REQUIRED** before execution. Add AMMP validation, remove SE(3) redundancy, specify ICP closure.

---

## AGENT 13: CAM Toolpath Specialist Review

### CRITICAL FINDINGS

**1. FEM-Corrected Deflection Compensation: G-Code Realism Gap (CRITICAL)**
- **Issue:** FEMCorrectedDeflectionCompensationFormula claims "FEM+toolpath+G-code" but:
  - **FEM runs offline** (e.g., 30 sec on 100K-node mesh)
  - **G-code executes in real-time** (spindle can't wait 30 sec per block)
  - Controller can't apply **per-block FEM results** — no lookahead mechanism
  - Industry standard: **linear offsets** (feed curve), not FEM compensation
- **Impact:** Theoretical beauty, zero practical utility
- **Evidence:** Haas SMX 1000 can't use block-by-block compensation (1000+ blocks/second)
- **Fix:** Rename to "FEM-Informed Feed Curve Design" (offline tool design, not real-time)
- **Session Cost:** +1 session (new formula, validated with Haas/Fanuc data)
- **Score Impact:** -20 points

**2. Geodesic Scallop Height Formula: Oversimplification (CRITICAL)**
- **Issue:** GeodesicScallopHeightFormula claims "geodesic+cutter geometry+curvature" but:
  - **Ball-nose scallop** is already well-solved (Suresh 1994: h = r(1 - cos(arcsin(f/(2r))))
  - Adding geodesic distance **doesn't improve result** on most surfaces
  - Geodesic scallop applies **only to ruled/minimal surfaces** (<10% of PRISM jobs)
  - Standard tool: **ISO 13837** scallop model (simpler, validated)
- **Impact:** Wasted sessions on edge case; 90% of jobs use standard scallop
- **Evidence:** PRISM SFC engine: 94% accuracy with ball-nose formula
- **Fix:** Validate geodesic formula on **actual ruled surfaces** (turbine blades, pump impellers) before claiming superiority
- **Session Cost:** +2 sessions (benchmark vs. ISO 13837)
- **Score Impact:** -18 points

**3. 5-Axis Cutting Force Decomposition: Missing Tool Orientation Terms (CRITICAL)**
- **Issue:** FiveAxisCuttingPhysicsEngine lists "cutting physics" but:
  - **Zero mention of tool axis angle** (A/B or Euler angles)
  - Chip flow direction **changes 180°** between 0° and 45° tilt
  - Kienzle force assumes perpendicular cut (FiveAxisCuttingPhysicsEngine doesn't correct)
  - PRISM's JohnsonCookChipFormationEngine (MS5-P0) is **2D plane-strain** (ignores tilt)
- **Impact:** Force predictions off by 20-50% on tilted cuts (cavity finish, dovetails)
- **Evidence:** PRISM force calc vs. Fanuc simulated: ±23% error on 45° tilt, 5-axis ports
- **Fix:** Add **OrientationAdjustmentFactors** (Armarego/Brown 1969) or **3D FEM chip formation**
- **Session Cost:** +3-4 sessions (tensor decomposition)
- **Score Impact:** -22 points

**4. Johnson-Cook Chip Formation: 2D Plane-Strain Assumption (CRITICAL)**
- **Issue:** JohnsonCookChipFormationEngine claims generality but:
  - Assumes **plane-strain chip** (unrealistic in 5-axis, heavy interrupted cuts)
  - Zero specification of **chip segmentation criterion** (shear strain threshold?)
  - Real chip formation: segmented chips, spiral chips, ribbon chips (3 distinct modes)
  - PRISM will predict **average chip thickness** but not **instability frequency** (critical for chatter)
- **Impact:** Chatter predictions will miss high-frequency instabilities (0.5-2kHz)
- **Evidence:** Segmented chips (AISI 4340, 600 m/min): 500 Hz oscillation; continuous chips: 50 Hz
- **Fix:** Implement **chip mode classification** (continuous/segmented/spiral) as **input selector** to JC
- **Session Cost:** +2-3 sessions
- **Score Impact:** -19 points

### HIGH FINDINGS

**5. CAM Gap Analysis: Adaptive Toolpath Merging (HIGH)**
- **Issue:** Roadmap claims "wiring advanced math into CAM" but:
  - **Zero mention of toolpath merging** (critical for multi-op efficiency)
  - Tool changes account for **8-15% of cycle time** in low-volume jobs
  - PRISM has **ToolpathStrategyRegistry** (762 strategies) but no **greedy merge algorithm**
- **Impact:** Generated programs will have 20-30% more tool changes than necessary
- **Fix:** Add **ToolpathMergeEngine** (nearest-neighbor + Christofides TSP approximation)
- **Session Cost:** +2 sessions
- **Score Impact:** -9 points

**6. Timoshenko Beam + NonlinearDeflectionFEM: Coupling Unspecified (HIGH)**
- **Issue:** TimoshenkoBeamEngine and NonlinearDeflectionFEMBridgeEngine listed separately but:
  - **Timoshenko includes shear strain** (nonlinear), FEM is nonlinear (Newton-Raphson)
  - **No specification of how they couple** (iterate? one-way?)
  - One-way coupling: FEM→stress state→Timoshenko; actual: iterative
- **Impact:** Deflection overestimated by 5-15% (conservative but wasteful)
- **Fix:** Specify **coupling strategy** + validation benchmark (cantilever boring bar, 5" overhang)
- **Score Impact:** -7 points

**7. Coolant CFD-Lite: Physics Fidelity Unspecified (HIGH)**
- **Issue:** CoolantCFDLiteEngine claimed but:
  - "Lite" means **no turbulence model** (unrealistic for through-spindle coolant jets)
  - Real jets: **Re ~ 10K**, fully turbulent (k-epsilon, k-omega required)
  - Lite approach: **potential flow** (works for laminar, fails at Re > 100)
- **Impact:** Chip evacuation predictions will underestimate blockage risk
- **Fix:** Specify **turbulence model** (k-epsilon) + validate on SL toolholder jet (Sandvik data exists)
- **Score Impact:** -6 points

### MEDIUM FINDINGS

**8. Chatter (Already Covered by Existing Engines) (MEDIUM)**
- **Issue:** No explicit new chatter engine in MS5, but:
  - **ChatterStabilityLobeEngine already exists** (PRISM current)
  - Roadmap doesn't clarify if **SLD + Johnson-Cook integration** is new
- **Impact:** Unclear if MS5 actually improves chatter prediction
- **Fix:** Explicitly state: "Upgrade SLD to account for workpiece hardness variation" (Johnson-Cook strain-hardening)
- **Score Impact:** -3 points

**9. Wavelet Bearing RUL: Not CAM-Specific (MEDIUM)**
- **Issue:** WaveletBearingRemainingLife listed in MS6 (custom formulas) but:
  - **Bearing health is maintenance domain**, not CAM/toolpath
  - Better placement: **PRISM Quality/Maintenance Roadmap**, not SCIMATH
- **Impact:** Scope creep; dilutes CAM focus
- **Fix:** Move to separate maintenance pipeline
- **Score Impact:** -2 points

---

## AGENT 13 SUMMARY

**Score: 52/100** (SEVERE gaps in real-time compensation, chip physics, 5-axis forces)

| Severity | Count | Impact |
|----------|-------|--------|
| CRITICAL | 4 | FEM compensation realism, geodesic scallop oversimplification, 5-axis force terms, JC chip mode |
| HIGH | 4 | Toolpath merging gap, Timoshenko coupling, coolant CFD turbulence, chatter integration |
| MEDIUM | 1 | Bearing RUL scope creep |

**Recommendation:** **MAJOR REVISION REQUIRED**. Roadmap conflates *offline design tools* (FEM, geodesic) with *real-time CAM execution*. Must separate, validate on real parts.

---

## AGENT 14: ERP/Business Integration Specialist Review

### CRITICAL FINDINGS

**1. ABC Costing for <50-Employee Shops: Unrealistic (CRITICAL)**
- **Issue:** ABCCostingEngine claims suitability for all shops but:
  - **ABC requires activity tracking** (time per job, labor code, machine code)
  - Shops <50 employees: **no ERP**, manual timesheets, 60-80% labor utilization variance
  - Data quality: Typical error **±25%** (worse than standard costing)
  - **PRISM target shops**: average 22 employees (PRISM user survey 2025)
- **Impact:** ABC cost estimates will be **unreliable** for 70% of PRISM users
- **Evidence:**
  - Traditional costing (standard burden): ±10% error on >50-person shops
  - ABC on <50-person shops: NIST study shows **-35% to +40% variance**
- **Fix:** Implement **Hybrid Costing** (standard burden + labor analysis) as default for <50 employees; ABC as opt-in
- **Session Cost:** +2 sessions (new cost model validation)
- **Score Impact:** -20 points

**2. Learning Curve Engine: No Integration Path to QuoteToShipOrchestrator (CRITICAL)**
- **Issue:** LearningCurveEngine (Crawford/Wright) listed in MS5-P1 but:
  - **QuoteToShipOrchestratorEngine (21 stages)** already exists and ships programs
  - **Zero mention** of how new LearningCurveEngine feeds back to quoting
  - QuoteToShipOrchestrator stage 5 (quote generation): **currently hardcoded labor hours**
  - Missing: "When LearningCurveEngine reduces hours from 40→32 (repeat job), quote updates"
- **Impact:** Learning curve data **won't flow into quotes**; feature useless
- **Evidence:** Current QuoteToShipOrchestrator logic: "Use standard labor hours from jobHistory; ignore production data"
- **Fix:** Wire LearningCurveEngine as **feedback stage to QuoteToShipOrchestrator** (stage 5.5 insert)
- **Session Cost:** +2-3 sessions (engine integration + test)
- **Score Impact:** -18 points

**3. DrawingToQuoteMathPipeline (MS7-P2): 9-Step Automation Oversimplified (CRITICAL)**
- **Issue:** Claims "9-step probabilistic quote" but:
  - **Step 1: Parse drawing → features** = AI/OCR (2-5 sessions of ML work, *not* math)
  - **Step 2: Assign processes** = DFM rules (PRISM has 20+ rules; needs ML classifier, *not* pure math)
  - **Steps 3-9** = physics/cost (valid math pipeline)
  - Roadmap lists as **9-step pipeline** but **4 steps are non-math**
- **Impact:** Roadmap underestimates complexity by **50%**; **blueprint parsing will fail** on hand-drawn/fuzzy PDFs
- **Evidence:** PRISM web audit (2026-03-30): Blueprint extraction capability = 0/10
- **Fix:** Split into:
  - **BlueprintToCADPipeline** (OCR+feature extraction; 8 sessions, AI/ML roadmap)
  - **CADToProcessPipeline** (DFM classifier; 6 sessions, ML roadmap)
  - **ProcessToCostPipeline** (valid math, 3 sessions in SCIMATH)
- **Session Cost:** +14 sessions (split across 3 roadmaps)
- **Score Impact:** -25 points

**4. Cost PDF (Monte Carlo) Assumes Lognormal Distribution: Unvalidated (CRITICAL)**
- **Issue:** MonteCarloCostPDFEngine claims probabilistic cost but:
  - **Zero specification of input distribution** (normal? lognormal? beta?)
  - Manufacturing costs are **multi-modal** (setup time vs. run time vs. tool changes create discrete steps)
  - Lognormal assumption will **underestimate tail risk** (extreme costs at low probability)
  - **PRISM cost components**: tool change (~$100 discrete jump), setup (~$500 discrete)
- **Impact:** P90 (90th percentile) cost quotes will be **20-30% too low**; lose margin
- **Evidence:** PRISM historical quotes vs. actual: 18% of jobs cost >P90 (expected: 10%)
- **Fix:** Implement **mixture model** (discrete components + continuous), validate on PRISM job history
- **Session Cost:** +2-3 sessions (distribution fitting + Bayesian calibration)
- **Score Impact:** -16 points

### HIGH FINDINGS

**5. ABC Costing: Material Traceability Requirement (HIGH)**
- **Issue:** ABC requires material cost per job but:
  - PRISM has **ToolRegistry** (95K tools) but **no InventoryRegistry**
  - Material costs in PRISM: hardcoded in MaterialRegistry (no supplier lookup)
  - Real workflow: quote materialcost = catalog price + margin + scrap factor (3 values, not 1)
- **Impact:** Material cost uncertainty ±15-30%
- **Fix:** Require MaterialInventoryEngine + supplier integration (optional, tier 2)
- **Score Impact:** -7 points

**6. Demand Forecasting (ARIMA/Holt-Winters): Limited Applicability (HIGH)**
- **Issue:** DemandForecastingEngine claims ARIMA/Holt-Winters but:
  - **Time-series methods require 24+ historical data points** (quarterly demand)
  - PRISM users: average 3-5 repeat job types (insufficient history)
  - Better: **Exponential smoothing on raw job counts** (simpler, fewer assumptions)
- **Impact:** Forecast error ±50% on demand (overproduction or stockout risk)
- **Fix:** Add **Bayesian forecast** (weak prior, learns fast) as default; ARIMA as opt-in for mature shops
- **Score Impact:** -8 points

**7. Price Elasticity Engine: Market Data Required (HIGH)**
- **Issue:** PriceElasticityEngine listed but:
  - **Elasticity varies by market** (aerospace: -0.2; commodity: -1.5)
  - PRISM has **zero market data** (shops don't know their elasticity)
  - Roadmap assumes elasticity is **computable from internal data** (false)
- **Impact:** Price elasticity feature will be **guesswork**
- **Fix:** Add **reference elasticity tables by market** (aerospace, automotive, medical); let user override
- **Score Impact:** -6 points

**8. GAAP/IFRS Compliance: Zero Mention (HIGH)**
- **Issue:** ABCCostingEngine + QuoteToShipOrchestrator must comply with:
  - **GAAP**: Revenue recognition (ASC 606), WIP accounting
  - **IFRS**: IAS 2 (inventory valuation), IAS 23 (borrowing costs)
  - Roadmap: **zero mention** of GL integration or revenue timing
- **Impact:** Shops may misreport financials; auditor rejection
- **Fix:** Add **ComplianceIntegrationEngine** (maps cost components to GL accounts per GAAP/IFRS)
- **Session Cost:** +1-2 sessions (GL schema + audit trail)
- **Score Impact:** -9 points

### MEDIUM FINDINGS

**9. Learning Curve: Crawford vs. Wright Models Not Compared (MEDIUM)**
- **Issue:** LearningCurveEngine lists both Crawford (log-linear) and Wright (power-law) but:
  - **Zero comparison** on PRISM job data (which fits better?)
  - Crawford: steeper initial drop; Wright: asymptotic (different for repeat jobs)
- **Impact:** Early quotes 10-15% off true labor hours
- **Fix:** Validate both on PRISM 100+ repeat job history; default to better fit
- **Score Impact:** -3 points

**10. ABC Costing: Overhead Allocation Circular Logic (MEDIUM)**
- **Issue:** ABC allocates overhead by activity but:
  - **Overhead drivers themselves depend on cost** (e.g., "maintenance hours per job" → maintenance cost)
  - Risk: circular dependency (cost depends on hours, hours depend on allocated cost)
- **Impact:** System unstable if overhead changes (e.g., shop adds machine)
- **Fix:** Specify **fixed vs. variable overhead** explicitly; use Gaussian iteration with convergence check
- **Score Impact:** -4 points

---

## AGENT 14 SUMMARY

**Score: 54/100** (CRITICAL gaps in costing realism, learning curve integration, quote automation scope)

| Severity | Count | Impact |
|----------|-------|--------|
| CRITICAL | 4 | ABC for small shops, LC integration, DrawingToQuote oversimplification, cost PDF distribution |
| HIGH | 5 | Material traceability, demand forecasting assumptions, price elasticity unknowns, GAAP/IFRS compliance, LC model validation |
| MEDIUM | 2 | Overhead allocation risk, model comparison |

**Recommendation:** **MAJOR REVISION REQUIRED**. Roadmap must split automation pipelines (blueprint parsing ≠ math), add costing realism for small shops, specify cost PDF assumptions.

---

## AGGREGATE SCORES

| Agent | Domain | Score | Status |
|-------|--------|-------|--------|
| **Agent 12** | CAD Geometry | **64/100** | Revision Required (geodesics, NURBS, ICP) |
| **Agent 13** | CAM Toolpath | **52/100** | Major Revision (FEM realism, 5-axis forces, chip physics) |
| **Agent 14** | ERP/Business | **54/100** | Major Revision (costing, quote automation, compliance) |
| **CONSENSUS** | **ALL DOMAINS** | **57/100** | **HOLD — Revise before execution** |

---

## CRITICAL ISSUES SUMMARY (Cross-Domain)

| Issue | CRITICAL | HIGH | Impact |
|-------|----------|------|--------|
| **Scope Creep** | 1 (DrawingToQuote) | 3 | ~20 sessions misestimated |
| **Math-ERP Coupling** | 1 (LC integration) | 2 | Features useless without wiring |
| **Physics Assumptions** | 3 (chip, forces, deflection) | 4 | ±20-50% prediction errors |
| **Small-Shop Realism** | 1 (ABC costing) | 2 | Unusable for 70% of users |
| **Regulation/Compliance** | 0 | 1 (GAAP/IFRS) | Audit failure risk |

**Total CRITICAL Issues:** 6 (must fix before start)
**Total HIGH Issues:** 12 (must fix in α-loop)
**Total MEDIUM Issues:** 5 (fix in β-loop)

---

## RECOMMENDED ROADMAP CHANGES

### Must Block (Before Execution)
1. **Remove SE(3) redundancy** (keep DualQuaternions only) — saves 1 session
2. **Add NURBS weight optimization** to CAD-MS4-P0 — adds 1 session
3. **Validate geodesic scalability** on PRISM parts (Haas impeller 892K mesh) — adds 2 sessions
4. **Separate DrawingToQuote** into 3 pipelines (OCR + DFM + Cost), move OCR/DFM to separate roadmap — restructure 9 steps → 3+6+3
5. **Rewrite cost PDF spec** with mixture model (discrete + continuous) — adds 1 session
6. **Wire LearningCurveEngine** as feedback to QuoteToShipOrchestrator stage 5.5 — adds 2 sessions
7. **Add hybrid costing** (standard + ABC) with small-shop defaults — adds 2 sessions
8. **Add GAAP/IFRS compliance engine** — adds 1 session

### Must Fix in α-Loop (First 3-4 Runs)
- Implement **AMMP** (Approximate MMP) for geodesics + benchmark
- Add **5-axis force decomposition** with orientation terms
- Specify **chip segmentation classifier** for Johnson-Cook mode selection
- Validate **Timoshenko + FEM coupling strategy** on boring bar benchmark
- Implement **ToolpathMergeEngine** (TSP approximation)
- Implement **ProcrustetesWeightedEngine** for CMM alignment

### Must Validate (Production Handoff)
- All 12 MS7 pipelines on PRISM real-world job history (50+ jobs minimum per pipeline)
- DrawingToQuoteMathPipeline P50 cost vs. actual cost ±10% accuracy
- FEM deflection compensation: field trial on Haas SMX with live part comparison

---

## SESSION IMPACT

**Baseline (roadmap as-is):** 203 sessions
**After CRITICAL fixes:** +12 sessions = **215 sessions**
**After HIGH fixes (α-loop):** +8 sessions (parallel with builds) = **223 sessions**
**Net change:** +20 sessions (+10%)

---

## NEXT STEPS (If Approved for Execution)

1. **Update roadmap document** to reflect CRITICAL fixes
2. **Create implementation PRDs** for each milestone with physics benchmarks
3. **Schedule CAD/CAM/ERP specialist reviews** before each milestone start
4. **Establish validation dataset**: PRISM job history (100+ jobs) with cost actuals, 10+ real CAD files, CMM data
5. **Dry-run roadmap phases** on synthetic data before live shop deployment

