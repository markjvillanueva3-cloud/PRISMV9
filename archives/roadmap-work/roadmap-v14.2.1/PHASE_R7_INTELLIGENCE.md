# PHASE R7: INTELLIGENCE EVOLUTION
## Wire Extracted Engines, Algorithms & MIT Courses Into Live Manufacturing Intelligence
## v14.3 | Prerequisites: R1 (registries loaded), R3 (campaign actions live)

---

## PHASE OBJECTIVE

R1 loads the data. R3 builds the action layer. R7 wires the **495+ extracted JavaScript modules**,
**447 cataloged engines**, **490 cataloged formulas**, **220 MIT course algorithms**, and **9.7GB of
manufacturer catalogs** into the live MCP server — transforming PRISM from a calculation engine
into an **intelligence platform** that learns, predicts, optimizes, and recommends.

**Data Utilization Target**: 22% (current) → 65% (after R1) → **90%+** (after R7)

⚡ **CLAUDE CODE:** R7 involves wiring 495+ JS modules — bulk file reading, parsing, and integration
tasks that benefit enormously from Claude Code's direct filesystem access and parallel agents.
MS0 (physics wiring) and MS6 (9.7GB catalog extraction) are prime candidates for parallel execution.

---

## DEPENDENCY MAP

```
R1 (Registry Loading) ──┐
                         ├── R3 (Campaign Actions) ── R7 (Intelligence Evolution)
R2 (Safety Validation) ──┘
```

R7 milestones can begin as soon as R1+R3 are complete. MS0-MS2 are independent.
MS3-MS5 build on MS0-MS2 outputs. MS6 is independent (catalog extraction).

---

### EXECUTION MODEL
Environment: Hybrid — Claude Code (catalog extraction, wiring) + Claude.ai MCP (physics design)
Model: Haiku (catalog parsing/grep) → Sonnet (wiring) → Opus (coupled physics modeling)

PARALLEL EXECUTION:
- R7-MS6 (catalog extraction): BACKGROUND AGENTS — this takes hours
  Fan across manufacturer catalog families:
  Agent 1: Sandvik catalogs
  Agent 2: Kennametal catalogs
  Agent 3: Seco/Dormer catalogs
  Agent 4: Iscar catalogs
  Agent 5: Walter/Mitsubishi catalogs
  Use Haiku subagents for PDF parsing (cheap at volume)
  Main session works on R7-MS0 (coupled physics) SIMULTANEOUSLY

- R7-MS0 (coupled physics): Claude.ai MCP with Opus
  This is the highest-value intellectual work in the entire roadmap.
  Thermal-mechanical-tool wear coupling requires Opus-grade reasoning.
  Do NOT attempt with Sonnet — physics model design is not implementation.

---

## MS0: PHYSICS-INFORMED PREDICTIONS (Surface Integrity, Thermal, Chatter)
### Sessions: 1 | Effort: L | Prerequisites: R1-MS5 (materials loaded), R3-MS1 (advanced calcs)

### Objective
Wire the extracted physics engines into live prediction capabilities that no competing
tool offers: surface integrity prediction, thermal compensation, and chatter stability analysis.

### Source Assets to Wire
| Asset | Location | Size | Purpose |
|-------|----------|------|---------|
| PRISM_JOHNSON_COOK_DATABASE.js | extracted/algorithms/ | 8KB | Strain-rate constitutive models, 40+ alloys |
| PRISM_CUTTING_THERMAL_ENGINE.js | extracted/engines/ | 113KB | Heat partition, chip/tool/workpiece temperature |
| PRISM_HEAT_TRANSFER_ENGINE.js | extracted/engines/ | 19KB | Conduction/convection/radiation models |
| PRISM_THERMAL_EXPANSION_ENGINE.js | extracted/engines/ | 67KB | Thermal growth compensation per axis |
| PRISM_THERMAL_MODELING.js | extracted/engines/ | 7KB | Simplified thermal FEA |
| PRISM_SURFACE_FINISH_ENGINE.js | extracted/engines/ | 11KB | Ra/Rz prediction from cutting parameters |
| PRISM_FFT_PREDICTIVE_CHATTER.js | extracted/algorithms/ | 12KB | FFT-based chatter frequency prediction |
| PRISM_CHATTER_PREDICTION_ENGINE.js | extracted/engines/ | 17KB | Stability lobe diagrams |
| PRISM_VIBRATION_ANALYSIS_ENGINE.js | extracted/engines/ | 16KB | Modal analysis |
| PRISM_SIGNAL_ALGORITHMS.js | extracted/algorithms/ | 11KB | Signal processing for sensor data |
| PRISM_ODE_SOLVERS_MIT.js | extracted/algorithms/ | 235KB | Runge-Kutta, BDF for thermal transients |

### Implementation

**New file**: `src/engines/PhysicsPredictionEngine.ts`

**Actions to add to calcDispatcher.ts**:

#### `surface_integrity_predict`
Predict residual stress, white layer risk, and surface hardness changes for a given
material + cutting parameters combination. Critical for aerospace (Inconel, Ti-6Al-4V).

```typescript
interface SurfaceIntegrityInput {
  material: string;                    // material_id from MaterialRegistry
  operation: 'turning' | 'milling' | 'drilling' | 'grinding';
  cutting_speed_mpm: number;           // Vc in m/min
  feed_mmrev: number;                  // f in mm/rev (turning) or fz in mm/tooth (milling)
  depth_of_cut_mm: number;             // ap in mm
  tool_material: 'carbide' | 'ceramic' | 'cbn' | 'diamond' | 'hss';
  tool_nose_radius_mm?: number;        // r_epsilon
  coolant: 'flood' | 'mql' | 'dry' | 'cryogenic';
}

interface SurfaceIntegrityResult {
  surface_roughness: {
    ra_predicted_um: number;           // Arithmetic mean roughness
    rz_predicted_um: number;           // Ten-point height
    confidence: number;                // 0-1 based on model coverage
    model: string;                     // Which model was used
  };
  residual_stress: {
    surface_mpa: number;               // Positive=tensile, Negative=compressive
    depth_of_effect_mm: number;        // How deep the stress field extends
    risk_level: 'low' | 'moderate' | 'high';
    mitigation: string[];              // Recommendations to improve
  };
  white_layer: {
    risk: boolean;                     // True if conditions favor white layer
    thickness_um: number | null;       // Predicted thickness if risk=true
    contributing_factors: string[];    // What's causing it
  };
  thermal: {
    max_tool_temp_c: number;           // Peak temperature at tool-chip interface
    max_workpiece_temp_c: number;      // Peak workpiece temperature
    heat_partition_ratio: number;      // Fraction of heat into workpiece (0-1)
  };
  recommendations: string[];          // Parameter adjustments to improve integrity
  safety: { score: number; flags: string[] };
}
```

**Physics chain**:
1. Look up Johnson-Cook parameters for material (PRISM_JOHNSON_COOK_DATABASE.js)
2. Calculate cutting forces via Merchant/Kienzle (ManufacturingCalculations.ts — already exists)
3. Calculate heat generation from force × velocity (PRISM_CUTTING_THERMAL_ENGINE.js)
4. Solve heat partition using Loewen-Shaw model (PRISM_HEAT_TRANSFER_ENGINE.js)
5. Predict surface roughness from geometry + vibration (PRISM_SURFACE_FINISH_ENGINE.js)
6. Estimate residual stress from thermal + mechanical loading (Johnson-Cook flow stress)
7. Assess white layer risk from temperature vs. austenitizing temperature

**Failure handling**: If Johnson-Cook data missing for material → fall back to empirical
Ra prediction only, set residual_stress.risk_level = 'unknown', log gap.

#### `chatter_predict`
Predict chatter stability for a given setup (machine + tool + workpiece + parameters).

```typescript
interface ChatterInput {
  machine: string;                     // machine_id from MachineRegistry
  tool_diameter_mm: number;
  tool_flutes: number;
  tool_overhang_mm: number;            // Stick-out from holder
  holder_type: string;                 // HSK-A63, BT40, CAT40 etc.
  operation: 'slotting' | 'side_milling' | 'face_milling' | 'turning';
  radial_depth_mm: number;             // ae
  axial_depth_mm: number;              // ap
  spindle_rpm: number;
  material: string;                    // For specific cutting force
}

interface ChatterResult {
  stable: boolean;                     // Is this combination stable?
  stability_margin: number;            // How far from instability (0=borderline, 1=very stable)
  critical_depth_mm: number;           // Maximum stable ap at this RPM
  recommended_rpm: number[];           // Stable RPM pockets (sweet spots)
  dominant_frequency_hz: number;       // Expected chatter frequency if unstable
  sld_data: {                          // Stability Lobe Diagram data points
    rpm: number[];
    max_stable_depth_mm: number[];
  };
  recommendations: string[];
  safety: { score: number; flags: string[] };
}
```

**Physics chain**:
1. Estimate tool FRF from diameter, overhang, flutes, holder (analytical model)
2. Get specific cutting force from material properties (MaterialRegistry)
3. Calculate stability lobes using Altintas method (PRISM_CHATTER_PREDICTION_ENGINE.js)
4. Determine if current (RPM, ap) point is in stable zone
5. Find nearest stable RPM pockets using FFT (PRISM_FFT_PREDICTIVE_CHATTER.js)

**Failure handling**: If machine dynamics unknown → use generic stiffness by machine type
(VMC/HMC/lathe/5-axis). Flag result as "estimated — tap test recommended for accuracy."

#### `thermal_compensate`
Calculate thermal growth compensation offsets for a running machine.

```typescript
interface ThermalCompInput {
  machine: string;
  spindle_rpm: number;
  runtime_minutes: number;             // How long the spindle has been running
  ambient_temp_c: number;
  spindle_power_kw: number;
}

interface ThermalCompResult {
  offsets: {
    x_um: number;                      // Thermal growth in X
    y_um: number;                      // Thermal growth in Y
    z_um: number;                      // Thermal growth in Z (typically largest)
  };
  steady_state_minutes: number;        // When thermal equilibrium is reached
  recommendation: string;              // "warm up 15 min before final pass" etc.
}
```

**Source**: PRISM_THERMAL_EXPANSION_ENGINE.js (67KB) + PRISM_THERMAL_MODELING.js

### Test Protocol
| Test | Input | Expected | Source |
|------|-------|----------|--------|
| Ra prediction Ti-6Al-4V | Vc=60, f=0.15, ap=2.0, carbide, flood | Ra ≤ 1.6μm | Machining Data Handbook |
| Chatter stability 20mm endmill | 4-flute, 60mm overhang, BT40, 8000rpm | stable=true for ae≤4mm | Altintas textbook example |
| White layer Inconel 718 | Vc=80 (too fast), ceramic, dry | white_layer.risk=true | Published research |
| Thermal growth VMC after 30min | 10,000rpm, 7.5kW, 22°C ambient | Z offset 15-25μm | Typical VMC specification |

### Validation
- S(x) ≥ 0.70 on all predictions (uncertainty bounds must be included)
- Cross-validate Ra predictions against at least 10 published experimental results
- Stability lobe diagrams must match Altintas benchmark case within 10%

### COUPLED PHYSICS MODELS (v14.2 — Gap 6, the real breakthrough)

**Source:** SYSTEMS_ARCHITECTURE_AUDIT.md Finding 2
**Why this is the differentiator:** Sequential calculation (force, then temperature, then wear,
then surface finish) misses feedback loops. In reality, higher force = more heat = faster wear =
worse surface finish = DIFFERENT force in the next pass. 20 HYBRID formulas (15 INVENTION/NOVEL)
model these coupled effects. This makes PRISM qualitatively different from handbook lookup.

**COUPLED MODELS TO IMPLEMENT:**
```
F-HYB-005: Force-Thermal Coupling
  Higher cutting force → more heat generation → faster tool wear
  Iterate until force-temperature-wear converge (typically 3-5 iterations)

F-HYB-006: Wear-Surface Coupling
  As tool wears (flank wear VB increases) → Ra increases nonlinearly
  Fresh tool Ra=0.4μm → worn tool Ra=1.2μm for same parameters

F-HYB-007: Vibration-Wear Coupling
  Chatter events destroy tools 3x faster than stable cutting
  If stability lobe predicts marginal stability → apply 3x wear factor

F-HYB-008: Thermal-Deflection Coupling
  Hot spindle = thermal growth = position shift = dimensional error
  Model: time-dependent thermal growth per axis from spindle speed + load

F-HYB-017: Unified Machining Model (THE key model)
  Predict everything from one set of inputs:
  Material + Tool + Machine + Operation →
    Force → Temperature → Wear → Surface Finish → Dimensional Accuracy
  Iterates all couplings until global convergence
```

**NEW ACTIONS:**
```
unified_machining_model(material, tool, machine, operation)
  → Runs ALL couplings simultaneously for integrated prediction
  → Returns: { force, temperature, wear_rate, surface_finish, dimensional_accuracy,
               convergence_iterations, coupling_sensitivities }
  → Safety: S(x) computed on the COUPLED result, not individual models

coupling_sensitivity(model_result, parameter)
  → Shows which input most affects each output
  → "Increasing speed 10% increases temperature 15% but only wear 8%"
  → Enables what_if analysis on the coupled model
```

**CONVERGENCE HOOK:**
```
coupled_physics_convergence — blocking, post-calculation
  Checks: did the iterative solver converge?
  If iterations > 20 or residual > threshold → BLOCK result
  Log: convergence_iterations, residual, which coupling was slowest
coupled_physics_divergence_alert — warning
  If sensitivity analysis shows >50% output change for <5% input change → ALERT
  Indicates numerically unstable regime — recommend different parameters
```

---

## MS1: CONSTRAINED OPTIMIZATION (Cost, Quality, Productivity Tradeoffs)
### Sessions: 1 | Effort: L | Prerequisites: R3-MS0 (job_plan), R7-MS0 (physics predictions)

### Objective
Move beyond single-parameter calculations to **multi-objective optimization**: find the
cutting parameters that minimize cost while meeting surface quality and tolerance constraints.
No other free manufacturing tool does this.

### Source Assets to Wire
| Asset | Location | Size | Purpose |
|-------|----------|------|---------|
| PRISM_CONSTRAINED_OPTIMIZER.js | extracted/engines/optimization/ | 32KB | SQP, penalty, augmented Lagrangian |
| PRISM_MULTI_OBJECTIVE_ENGINE.js | extracted/engines/optimization/ | 28KB | Pareto front generation |
| PRISM_MOEAD_ENGINE.js | extracted/engines/optimization/ | 18KB | Decomposition-based multi-objective |
| PRISM_MONTE_CARLO_ENGINE.js | extracted/engines/optimization/ | 15KB | Stochastic sampling for robustness |
| PRISM_INTERIOR_POINT_ENGINE.js | extracted/engines/optimization/ | 22KB | Large-scale constrained optimization |
| PRISM_LOCAL_SEARCH.js | extracted/algorithms/ | 13KB | Local search for parameter refinement |
| PRISM_ACO_SEQUENCER.js | extracted/algorithms/ | 197KB | Operation sequencing optimization |
| PRISM_COST_DATABASE.js | extracted_modules/COMPLETE/ | 288KB | Comprehensive cost models |
| PRISM_SWARM_ALGORITHMS.js | extracted/engines/optimization/ | 20KB | PSO, firefly, cuckoo search |

### Implementation

**New file**: `src/engines/OptimizationEngine.ts`

**Actions to add to calcDispatcher.ts**:

#### `optimize_parameters`
Given a part requirement (material, feature, tolerance, surface finish), find the optimal
cutting parameters across the full solution space.

```typescript
interface OptimizeInput {
  material: string;
  feature: 'pocket' | 'slot' | 'face' | 'contour' | 'hole' | 'thread';
  dimensions: {
    depth_mm: number;
    width_mm?: number;
    length_mm?: number;
    diameter_mm?: number;
  };
  constraints: {
    surface_finish_ra_max_um?: number;    // e.g., 1.6
    tolerance_mm?: number;                 // e.g., 0.02
    max_cycle_time_min?: number;
    max_tool_cost_usd?: number;
    machine?: string;                      // Constrain to specific machine
  };
  objective: 'min_cost' | 'min_time' | 'max_tool_life' | 'balanced';
  tool_candidates?: string[];              // Limit to specific tools, or auto-select
}

interface OptimizeResult {
  optimal: {
    vc_mpm: number;
    fz_mm: number;
    ap_mm: number;
    ae_mm: number;
    strategy: string;
    tool: string;
    num_passes: number;
    estimated_cycle_time_min: number;
    estimated_cost_usd: number;
    estimated_tool_life_min: number;
    predicted_ra_um: number;
  };
  alternatives: OptimalSolution[];         // Top 3-5 Pareto-optimal alternatives
  pareto_front: {                          // For visualization
    cost: number[];
    time: number[];
    quality: number[];
  };
  sensitivity: {                           // What matters most
    parameter: string;
    impact: 'high' | 'medium' | 'low';
    recommendation: string;
  }[];
  safety: { score: number; flags: string[] };
}
```

**Optimization chain**:
1. Define decision variables: Vc, fz, ap, ae, strategy, tool
2. Define constraints from input + safety limits (S(x) ≥ 0.70)
3. Calculate objective function using ManufacturingCalculations + process_cost + tool_life
4. Run multi-objective optimizer (MOEAD or NSGA-II from extracted engines)
5. Generate Pareto front of cost vs. time vs. quality
6. Select recommendation based on objective preference
7. Validate all solutions against safety thresholds

#### `optimize_sequence`
For multi-operation parts, find the optimal operation order to minimize tool changes,
machine repositioning, and total cycle time.

```typescript
interface SequenceInput {
  operations: {
    id: string;
    feature: string;
    tool_required: string;
    estimated_time_min: number;
    setup_constraints?: string[];        // "must be before op_3", "same setup as op_1"
  }[];
  machine: string;
  optimize_for: 'min_tool_changes' | 'min_cycle_time' | 'min_setup_changes';
}

interface SequenceResult {
  optimal_order: string[];               // Operation IDs in optimal order
  tool_changes: number;
  estimated_total_min: number;
  savings_vs_input_order: {
    time_saved_min: number;
    tool_changes_saved: number;
  };
}
```

**Source**: PRISM_ACO_SEQUENCER.js (197KB) — ant colony optimization for sequencing.

### Test Protocol
| Test | Input | Expected |
|------|-------|----------|
| Optimize pocket in 4140 steel | Ra≤3.2, tol ±0.05, min_cost | Vc within handbook range, cost < brute force |
| Optimize face mill Inconel 718 | Ra≤0.8, min_time | Selects ceramic insert at high Vc |
| Sequence 8-operation part | 3 tools, 2 setups | Reduces tool changes by ≥30% vs input order |

### SUSTAINABILITY / ESG METRICS (v14.2 — Gap 3)

**Source:** SYSTEMS_ARCHITECTURE_AUDIT.md Finding 6, 13 SUSTAINABILITY formulas unused
**Why:** European manufacturers face mandatory ESG reporting. ISO 14955. Competitive advantage:
"this approach reduced energy 18%, coolant 30%."

**MANDATORY OUTPUT EXTENSION for optimize_parameters:**
Every optimization result must now include:
```
sustainability: {
  energy_kwh: number,        // from F-SUST-001 (Energy Consumption Model)
  co2_kg: number,            // from F-SUST-003 (Carbon Footprint)
  coolant_liters: number,    // from F-SUST-005 (Coolant Consumption)
  chip_waste_kg: number,     // from MRR × material density × time
  eco_efficiency_score: number  // from F-SUST-011 (Eco-Efficiency Index)
}
```

**NEW ACTIONS:**
```
sustainability_report(job_plan_result)
  → Full environmental impact of a machining job
  → Energy, CO2, coolant, waste, water, tool material usage
  → Comparison vs "typical" parameters (baseline from registry)
  → ISO 14955 compliance notes where applicable

eco_optimize(job_plan, weight_eco: 0.0-1.0)
  → Rebalance optimization with sustainability weight
  → weight_eco=0.0 → pure cost/quality/productivity optimization
  → weight_eco=1.0 → minimize environmental impact (may be slower/costlier)
  → weight_eco=0.3 → recommended balance (30% eco consideration)
```

**FORMULAS TO WIRE:**
  F-SUST-011: Eco-Efficiency Index
  F-SUST-012: Optimal Sustainability Score
  F-SUST-013: Circular Economy Score
  F-ECON-001 through F-ECON-005: Energy/coolant/waste cost models

**NEW HOOK:**
  sustainability_bounds — warning, post-optimization
  Alerts if eco_efficiency_score < 0.3 (very wasteful parameters)
  Suggests alternative parameters with better sustainability profile

---

## MS2: WORKHOLDING INTELLIGENCE (Fixture Selection, Clamping Force, Deflection)
### Sessions: 1 | Effort: M | Prerequisites: R1 (material + machine data loaded)

### Objective
Wire the WorkholdingEngine.ts (46KB, already in MCP) to the extracted fixture databases
and provide intelligent workholding recommendations — not just "use a vise" but "use a
Kurt DL640, clamp at positions X and Y with 4,500N force, expect max deflection of 0.008mm."

### Source Assets to Wire
| Asset | Location | Size | Purpose |
|-------|----------|------|---------|
| PRISM_FIXTURE_DATABASE.js (extracted) | extracted/workholding/ | 13KB | Basic fixture catalog |
| PRISM_FIXTURE_DATABASE.js (ULTRA) | extracted_modules/ULTRA/ | 2.4MB | Comprehensive fixture DB |
| PRISM_WORKHOLDING_DATABASE.js | extracted/workholding/ | varies | Material + stock data |
| PRISM_WORKHOLDING_ENGINE.js | extracted/workholding/ | 4KB | Clamping force calculations |
| PRISM_JERGENS_DATABASE.js | extracted_modules/COMPLETE/ | varies | Jergens fixture components |
| PRISM_STOCK_POSITIONS_DATABASE.js | extracted/engines/simulation/ | varies | Stock/fixture positioning |
| WorkholdingEngine.ts | mcp-server/src/engines/ | 46KB | **Already live** — has physics, needs data |

### Implementation

**New data file**: `data/workholding/FIXTURES.json` — merged from extracted databases

**Actions to add to dataDispatcher.ts**:

#### `fixture_recommend`
Given a part geometry, material, and cutting forces, recommend optimal workholding.

```typescript
interface FixtureInput {
  part: {
    material: string;
    length_mm: number;
    width_mm: number;
    height_mm: number;
    weight_kg?: number;
  };
  operation: string;
  max_cutting_force_n: number;           // From force calculations
  tolerance_mm: number;                  // Tightest tolerance on part
  machine: string;                       // For table size/T-slot constraints
  batch_size: number;                    // 1=prototype, 1000=production
}

interface FixtureResult {
  primary_recommendation: {
    fixture_type: string;                // "6-inch precision vise", "vacuum table", etc.
    manufacturer?: string;               // Kurt, Schunk, Orange Vise, etc.
    model?: string;                      // DL640, KSC, etc.
    clamp_positions: { x: number; y: number }[];
    clamp_force_n: number;
    contact_area_mm2: number;
  };
  analysis: {
    max_deflection_mm: number;           // Under cutting load
    deflection_at_tolerance: boolean;    // Is deflection < tolerance?
    safety_factor: number;               // Clamp force / cutting force
    pull_out_risk: boolean;
  };
  alternatives: FixtureRecommendation[];
  soft_jaw_design?: {                    // If vise recommended
    jaw_width_mm: number;
    step_depth_mm: number;
    bore_pattern?: string;
  };
  safety: { score: number; flags: string[] };
}
```

**Physics chain**:
1. Calculate cutting forces for planned operation (already available from R3 job_plan)
2. Determine minimum clamping force: F_clamp > (safety_factor × F_cutting) / μ
3. Check part deflection under clamping + cutting loads (WorkholdingEngine.ts beam model)
4. Query fixture database for suitable fixtures given part dimensions + machine constraints
5. Rank by: deflection impact, setup time, cost, batch suitability

### Test Protocol
| Test | Input | Expected |
|------|-------|----------|
| Small prismatic part, 6061-T6 | 100×50×25mm, Fc=800N, tol ±0.02 | Vise, 3500N clamp, defl < 0.01mm |
| Large plate, mild steel | 500×300×12mm, Fc=2000N, tol ±0.1 | Fixture plate with toe clamps |
| Round bar, Inconel 718 | Ø50×200mm, turning, Fc=3000N | 3-jaw chuck, 6000N+ grip, soft jaws |

---

## MS3: LEARNING FROM JOBS (Accumulate, Analyze, Improve Recommendations)
### Sessions: 1 | Effort: L | Prerequisites: R3-MS0 (job_plan generating structured outputs)

### Objective
Every job_plan execution produces a complete parameter set. After accumulating job data,
PRISM can identify patterns: "for Inconel 718 pockets on DMU 50s, trochoidal at Vc=38
produced 40% better tool life than the formula predicted." This is **adaptive manufacturing
intelligence** — the system gets smarter with use.

### Source Assets to Wire
| Asset | Location | Size | Purpose |
|-------|----------|------|---------|
| PRISM_LEARNING_ENGINE.js | extracted/learning/ | 2.3KB | Base learning framework |
| PRISM_LEARNING_PERSISTENCE_ENGINE.js | extracted/learning/ | varies | Persistent storage for learned data |
| PRISM_LEARNING_FEEDBACK_CONNECTOR.js | extracted/learning/ | varies | Feedback loop integration |
| PRISM_BAYESIAN_LEARNING.js | extracted_modules/COMPLETE/ | varies | Bayesian parameter updating |
| PRISM_ONLINE_LEARNING_COMPLETE.js | extracted/engines/ai_complete/ | varies | Online/streaming learning |
| PRISM_TIME_SERIES_COMPLETE.js | extracted/engines/ai_complete/ | varies | Time series analysis of job trends |
| MemoryGraphEngine.ts | mcp-server/src/engines/ | exists | **Already live** — use for persistence |

### Implementation

**New file**: `src/engines/JobLearningEngine.ts`
**New data directory**: `data/job_history/` — structured job outcome storage

**Actions to add to intelligenceDispatcher.ts**:

#### `job_record`
Record the outcome of a completed job for future learning.

```typescript
interface JobRecordInput {
  job_plan_id: string;                   // Links to the original job_plan output
  material: string;
  operation: string;
  parameters_used: {
    vc_mpm: number;
    fz_mm: number;
    ap_mm: number;
    ae_mm: number;
    strategy: string;
    tool: string;
  };
  outcome: {
    actual_tool_life_min?: number;       // How long the tool actually lasted
    actual_surface_finish_ra?: number;   // Measured Ra
    actual_cycle_time_min?: number;
    chatter_occurred?: boolean;
    tool_failure_mode?: 'none' | 'flank_wear' | 'crater_wear' | 'chipping' | 'breakage';
    operator_notes?: string;
  };
  machine: string;
}
```

#### `job_insights`
Analyze accumulated job history to surface patterns and improve future recommendations.

```typescript
interface JobInsightsInput {
  material?: string;                     // Filter by material
  operation?: string;                    // Filter by operation
  machine?: string;                      // Filter by machine
  min_jobs?: number;                     // Minimum sample size (default: 5)
}

interface JobInsightsResult {
  sample_size: number;
  patterns: {
    finding: string;                     // "Tool life 35% higher than Taylor prediction"
    confidence: number;                  // Statistical confidence
    recommendation: string;             // "Consider increasing Vc by 10% for this material"
    evidence: {
      predicted_avg: number;
      actual_avg: number;
      std_dev: number;
    };
  }[];
  parameter_adjustments: {               // Bayesian-updated parameter corrections
    parameter: string;
    current_formula_value: number;
    recommended_value: number;
    basis: string;                       // "47 jobs, 0.92 correlation"
  }[];
}
```

**Learning pipeline**:
1. job_plan generates parameters → user runs the job → user records outcome via job_record
2. JobLearningEngine accumulates outcomes, keyed by material+operation+machine
3. After N jobs (configurable, default 5), Bayesian updating adjusts formula coefficients
4. job_insights surfaces patterns: over/under-prediction, material-specific corrections
5. Future job_plan calls query JobLearningEngine for adjusted parameters before formula calc

**Privacy/multi-tenant**: Job data is tenant-isolated (MultiTenantEngine.ts handles this).
Shared learning across tenants requires explicit opt-in flag.

### Test Protocol
| Test | Expected |
|------|----------|
| Record 10 identical jobs, vary tool life ±20% | job_insights identifies mean and std dev |
| Record 5 jobs with actual Ra consistently lower than predicted | Parameter adjustment suggested |
| Query insights with 0 jobs | Graceful "insufficient data" response |

---

## MS4: ADVANCED ALGORITHMS (MIT Course Integration, Numerical Methods)
### Sessions: 1 | Effort: M | Prerequisites: R7-MS0 (physics engines wired)

### Objective
Wire the MIT/Stanford course algorithms into production use. The 220 courses contain
850 algorithms covering numerical methods, optimization, signal processing, control theory,
and computational geometry — most of which are directly applicable to manufacturing problems.

### Source Assets to Wire
| Asset | Location | Size | Algorithms |
|-------|----------|------|------------|
| PRISM_UNIVERSITY_ALGORITHMS.js | extracted/mit/ | 206KB | 20 core algorithms (Ruppert mesh, Delaunay, etc.) |
| PRISM_220_COURSES_MASTER.js | extracted/knowledge_bases/ | 15KB | Gateway routing for all 850 algorithms |
| PRISM_CAD_KERNEL_MIT.js | extracted/mit/ | varies | CAD geometry from MIT courses |
| PRISM_SURFACE_GEOMETRY_MIT.js | extracted/mit/ | varies | Surface mathematics |
| PRISM_CAM_KERNEL_MIT.js | extracted/mit/ | varies | CAM algorithms |
| PRISM_COURSE_GATEWAY_GENERATOR.js | extracted/mit/ | varies | Route generator for courses→engines |
| PRISM_MATH_FOUNDATIONS.js | extracted/algorithms/ | 67KB | Linear algebra, interpolation, root finding |
| PRISM_NUMERICAL_METHODS_MIT.js | extracted/algorithms/ | varies | Numerical differentiation/integration |
| PRISM_LINALG_MIT.js | extracted/algorithms/ | varies | Matrix operations, eigenvalue solvers |
| prism-knowledge-base SKILL.md | skills-consolidated/ | 8.5KB | Course lookup tables |

### Implementation Strategy

Rather than wiring all 850 algorithms, identify the **high-impact manufacturing applications**
and wire those first. The gateway routing system (PRISM_220_COURSES_MASTER.js) already maps
algorithms to namespaces — we register the manufacturing-relevant ones.

**New file**: `src/engines/AlgorithmGatewayEngine.ts`

**Priority wiring targets**:

| Algorithm | Course Source | Manufacturing Application |
|-----------|-------------|--------------------------|
| Ruppert mesh refinement | MIT 2.158J | Workpiece mesh for FEA-lite deflection |
| FFT / spectral analysis | MIT 6.003 | Chatter frequency identification (→ MS0) |
| Gradient descent + Newton | MIT 6.079 | Parameter optimization (→ MS1) |
| Bayesian inference | MIT 6.041 | Learning from jobs (→ MS3) |
| Eigenvalue solvers | MIT 18.06 | Modal analysis for chatter prediction |
| Interpolation methods | MIT 18.330 | Material property interpolation between known points |
| Kalman filter (EKF) | MIT 6.832 | Adaptive machining — estimate tool wear in real-time |
| Graph algorithms | MIT 6.046J | Operation sequencing, dependency resolution |
| Monte Carlo methods | MIT 6.867 | Uncertainty quantification for predictions |
| Control theory | MIT 6.302 | Adaptive feed rate control modeling |

**Action to add**:

#### `algorithm_select`
Given a manufacturing problem, recommend and execute the appropriate algorithm.

```typescript
interface AlgorithmSelectInput {
  problem_type: 'optimize' | 'predict' | 'classify' | 'interpolate' | 'sequence' | 'filter';
  domain: 'cutting_params' | 'toolpath' | 'scheduling' | 'quality' | 'maintenance';
  data?: any;                            // Problem-specific input
}

interface AlgorithmSelectResult {
  selected_algorithm: string;
  source_course: string;
  rationale: string;
  result: any;                           // Algorithm-specific output
  alternatives: string[];                // Other applicable algorithms
}
```

### Test Protocol
| Test | Expected |
|------|----------|
| FFT on simulated chatter signal | Identifies dominant frequency within 5% |
| Bayesian update with 10 tool life observations | Posterior mean within 15% of true mean |
| Gradient descent on Vc optimization | Converges to known optimal within 20 iterations |

---

## MS5: SHOP FLOOR OPTIMIZATION (Scheduling, Machine Assignment, Utilization)
### Sessions: 1 | Effort: L | Prerequisites: R1 (machine capabilities loaded)

### Objective
A real shop has 15 machines and 40 jobs in queue. PRISM should answer: "Which machine
should run which job to minimize total cycle time, maximize machine utilization, and
respect due dates?" This is a scheduling + assignment problem we can solve with the
optimization engines and machine capability data we already have.

### Source Assets to Wire
| Asset | Location | Size | Purpose |
|-------|----------|------|---------|
| PRISM_JOB_SHOP_SCHEDULING_ENGINE.js | extracted_modules/COMPLETE/ | varies | Job shop scheduling algorithms |
| PRISM_ACO_SEQUENCER.js | extracted/algorithms/ | 197KB | Ant colony for sequencing |
| PRISM_SWARM_ALGORITHMS.js | extracted/engines/optimization/ | 20KB | Swarm optimization for assignment |
| PRISM_COMBINATORIAL_OPTIMIZER.js | extracted/engines/optimization/ | 32KB | Combinatorial assignment |
| MachineRegistry.ts | mcp-server/src/registries/ | exists | Machine capabilities |
| PRISM_LEAN_SIX_SIGMA_KAIZEN.js | extracted_modules/complete_extraction/ | 68KB | Waste elimination, value stream |

### Implementation

**New file**: `src/engines/ShopSchedulerEngine.ts`

**Actions to add to intelligenceDispatcher.ts**:

#### `shop_schedule`
```typescript
interface ShopScheduleInput {
  jobs: {
    id: string;
    operations: {
      type: string;                      // milling, turning, grinding, etc.
      estimated_time_min: number;
      required_capabilities: string[];   // "5-axis", "live tooling", etc.
      material: string;
      tolerance_mm: number;
    }[];
    due_date?: string;                   // ISO date
    priority: 'rush' | 'normal' | 'low';
  }[];
  machines: string[];                    // machine_ids from MachineRegistry
  optimize_for: 'min_makespan' | 'min_tardiness' | 'max_utilization' | 'balanced';
}

interface ShopScheduleResult {
  schedule: {
    machine: string;
    assignments: {
      job_id: string;
      operation_index: number;
      start_time_min: number;            // Relative to schedule start
      end_time_min: number;
    }[];
    utilization_pct: number;
  }[];
  metrics: {
    total_makespan_min: number;
    average_utilization_pct: number;
    jobs_on_time: number;
    jobs_late: number;
  };
  bottlenecks: string[];                 // "Machine X is overloaded — consider outsourcing op Y"
}
```

#### `machine_utilization`
Analyze machine fleet utilization and recommend balancing actions.

**Source**: Combines MachineRegistry capabilities with scheduling output to identify
underutilized machines, capability gaps, and investment recommendations.

### Test Protocol
| Test | Expected |
|------|----------|
| 5 jobs, 3 machines, no constraints | Valid schedule with no overlaps |
| 10 jobs, 5 machines, 2 rush priority | Rush jobs scheduled first |
| Job requires 5-axis, only 1 machine capable | Bottleneck identified |

---

## MS6: MANUFACTURER CATALOG EXTRACTION (9.7GB → Structured Data)
### Sessions: 1-2 | Effort: XL | Prerequisites: None (independent track)

### Objective
Extract structured tool data from the 44 manufacturer PDF catalogs (9.7GB total) into
JSON format compatible with ToolRegistry. This is the single largest untapped data source
in the entire PRISM ecosystem.

### Source Assets
```
C:\PRISM\CATALOGS\                      44 PDFs, 9.7GB total
Key catalogs:
- Sandvik Coromant (Drilling, Milling, Turning, Tooling) — 4 files
- ISCAR Part 1 — cutting tools
- Kennametal Master Catalog — 2 volumes
- OSG — taps and drills
- SGS Global Catalog — solid carbide
- Guhring — full catalog + tool holders
- Emuge — threading
- MA Ford — end mills
- REGO-FIX — toolholding
- 30+ more manufacturers
```

### Implementation Strategy

This is NOT a single-session task. Strategy:

1. **Phase 1 (MS6a)**: Build the extraction pipeline
   - PDF → text extraction (per page)
   - Pattern recognition for tool tables (diameter, flutes, length, grade, coating)
   - Output to intermediate JSON per catalog

2. **Phase 2 (MS6b)**: Extract priority catalogs
   - Sandvik (most comprehensive, best-structured tables)
   - Kennametal (large market share)
   - OSG (excellent tap/drill data)

3. **Phase 3 (future)**: Remaining catalogs

**New file**: `src/engines/CatalogExtractionEngine.ts`
**New data directory**: `data/tools/catalogs/` — per-manufacturer extracted JSON

**Output schema** must match R1-MS5 tool schema (14 canonical categories from TOOL_EXPANSION_ROADMAP.md):
```
end_mills, drills, taps, reamers, boring_bars, inserts, thread_mills,
face_mills, chamfer_tools, slot_drills, ball_nose, corner_radius,
step_drills, countersinks
```

### Test Protocol
| Test | Expected |
|------|----------|
| Extract 1 page of Sandvik milling catalog | Valid JSON with ≥5 tool entries |
| Cross-validate extracted data against known Sandvik specs | ≥95% accuracy |
| Load extracted JSON into ToolRegistry | Registry count increases |

### Risk
PDF table extraction is inherently messy. Catalogs use different formats, units (inch vs metric),
and table layouts. The extraction pipeline needs robust error handling and human-in-the-loop
validation for the first few catalogs to calibrate accuracy.

---

## NOVEL DIFFERENTIATORS ENABLED BY R7

These capabilities emerge from the combination of R7 milestones and distinguish PRISM
from every other manufacturing tool:

### 1. Adaptive Parameters Based on Machine Condition
A new Haas VF-2 and a 15-year-old VF-2 with worn ballscrews should NOT get the same
cutting parameters. MS0 thermal compensation + MS3 learning from jobs enables:
- Track parameter success rates per individual machine
- Detect degradation trends (increasing chatter, decreasing accuracy)
- Automatically derate parameters for aging machines

### 2. Full-Spectrum What-If Analysis
R3 what_if compares two scenarios. R7 MS1 explores the ENTIRE solution space:
- "What's the cheapest way to make this part at Ra ≤ 1.6?"
- Generates Pareto front of cost vs. quality vs. time
- Sensitivity analysis: "Vc matters more than fz for this combination"

### 3. Surface Integrity Certification
For aerospace parts, PRISM can predict and certify:
- Residual stress profile (compressive = good, tensile = bad)
- White layer risk assessment
- Metallurgical phase change predictions
- This is currently done by expensive testing — PRISM does it computationally

### 4. Self-Improving Recommendations
After MS3, every job PRISM plans becomes training data:
- Formula coefficients auto-adjust based on real outcomes
- Material-specific corrections emerge from accumulated data
- Machine-specific performance profiles build over time

### 5. Thread Engine Expansion
ThreadCalculationEngine.ts (22KB) currently handles basic tap/thread-mill selection.
R7 enables:
- Multi-start thread calculations
- Tapered pipe threads (NPT/BSPT) with interference fit analysis
- Form tapping vs. cut tapping decision logic (based on material + hole depth)
- Thread whirling for medical bone screws
- Thread milling single-point for large diameters

### 6. Intelligent Alarm Diagnosis
AlarmRegistry has 9,200 codes across 12 controller families. R7 adds:
- Correlate alarm patterns with root causes (e.g., "alarm 5073 after rapid to Z0 = reference not set")
- Recommend recovery procedures from accumulated knowledge
- Predict alarms before they occur (spindle overload trending upward → warn operator)

---

## CROSS-REFERENCE: R7 ACTIONS → SOURCE ASSETS → ENGINES

| R7 Action | New Engine | Key Source Assets | Est. Lines |
|-----------|-----------|-------------------|------------|
| surface_integrity_predict | PhysicsPredictionEngine.ts | Johnson-Cook DB + Thermal + Surface Finish (236KB) | ~400 |
| chatter_predict | PhysicsPredictionEngine.ts | Chatter + FFT + Vibration + Signal (56KB) | ~300 |
| thermal_compensate | PhysicsPredictionEngine.ts | Thermal Expansion + Modeling (74KB) | ~150 |
| optimize_parameters | OptimizationEngine.ts | 9 optimization engines (557KB) | ~350 |
| optimize_sequence | OptimizationEngine.ts | ACO Sequencer (197KB) | ~200 |
| fixture_recommend | WorkholdingEngine.ts (extend) | 4 fixture/workholding files + ULTRA DB (2.7MB) | ~250 |
| job_record | JobLearningEngine.ts | Learning engines (6 files) | ~150 |
| job_insights | JobLearningEngine.ts | Bayesian + Online Learning | ~200 |
| algorithm_select | AlgorithmGatewayEngine.ts | 220 courses + gateway routing | ~200 |
| shop_schedule | ShopSchedulerEngine.ts | Scheduling + Swarm + Combinatorial (250KB) | ~300 |
| machine_utilization | ShopSchedulerEngine.ts | MachineRegistry + scheduling output | ~100 |

**Total new code: ~2,600 lines across 5 new engine files**
**Total source assets consumed: ~3.8MB of extracted JavaScript + 2.4MB fixture DB**

---

## PHASE GATE: R7 → COMPLETE

### Definition of Done
- [ ] All 11 actions respond correctly to valid inputs
- [ ] S(x) ≥ 0.70 on ALL predictions (surface integrity, chatter, thermal)
- [ ] Optimization converges for standard benchmark problems
- [ ] Job learning pipeline stores, retrieves, and applies corrections
- [ ] Fixture recommendation produces valid clamping force calculations
- [ ] Ω ≥ 0.70 for overall R7 quality
- [ ] At least 1 manufacturer catalog extracted and loaded into ToolRegistry
- [ ] Data utilization metric ≥ 85% (measured against ASSET_INVENTORY.md baseline)

### Fault Injection Tests
| Test | Expected Behavior |
|------|-------------------|
| Surface integrity with unknown material | Graceful degradation, flags missing J-C data |
| Chatter prediction with no machine dynamics | Uses generic stiffness, flags as estimated |
| Optimize with infeasible constraints | Returns "no feasible solution" with relaxation suggestions |
| Job record with missing fields | Accepts partial data, stores what's available |
| Schedule with impossible due dates | Reports tardiness, suggests priority changes |
| Catalog extraction on corrupted PDF page | Skips page, continues extraction, reports skipped count |

### Validation Protocol
- Hand-calculate 3 surface integrity cases against published data
- Compare optimization results against brute-force grid search (must find same optimum)
- Validate scheduling against known benchmark problems (Fisher-Thompson ft06)
- Verify fixture recommendations against engineering judgment for 5 representative parts

---

## ESTIMATED TOTAL EFFORT

| Milestone | Sessions | New Lines | Source Assets Consumed |
|-----------|----------|-----------|----------------------|
| MS0: Physics + Coupled Models | 1-2 | ~1100 | 11 files, 584KB + 20 HYBRID formulas |
| MS1: Optimization + Sustainability | 1 | ~700 | 9 files, 557KB + 13 SUST formulas |
| MS2: Workholding Intelligence | 1 | ~250 | 6 files, 2.7MB |
| MS3: Learning from Jobs | 1 | ~350 | 6 files, varies |
| MS4: Advanced Algorithms | 1 | ~200 | 10 files, 300KB |
| MS5: Shop Floor Optimization | 1 | ~400 | 6 files, 320KB |
| MS6: Catalog Extraction | 1-2 | ~500 | 44 PDFs, 9.7GB |
| **TOTAL** | **7-9** | **~3,500** | **~4.5MB code + 9.7GB catalogs** |

---

## R7 COMPANION ASSETS (v14.2 — build AFTER R7 gate passes)

```
HOOKS (3 new — plus coupled_physics hooks from MS0):
  sustainability_bounds       — warning, post-optimization, alerts if eco_efficiency < 0.3
  optimization_convergence    — blocking, post-optimize, checks optimizer converged
  learning_data_quality       — warning, post-job-record, validates recorded job data quality

SCRIPTS (2 new):
  coupled_physics_demo        — Runs unified_machining_model on 5 representative scenarios.
                                Shows convergence behavior and coupling sensitivities.
  sustainability_comparison   — Compares eco metrics for conventional vs optimized params
                                across 3 materials. Shows energy/coolant/CO2 savings.

SKILLS (2 new):
  prism-sustainability-advisor — Teaches Claude ESG metrics, ISO 14955, eco-optimization
                                 tradeoffs. Maps SUSTAINABILITY formulas to use cases.
  prism-coupled-physics        — Teaches Claude the unified machining model, when to use
                                 coupled vs sequential calcs, convergence troubleshooting.
```

---

*This phase transforms PRISM from a calculation tool into a manufacturing intelligence platform.
Every action is grounded in extracted, validated intellectual property that already exists on disk.
R7 is the bridge between "we have the data" and "the data works for you."*
