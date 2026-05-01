# PRISM MILLING COMPREHENSIVE ROADMAP v2.0
## 11 Milestones | 113 Units | 300+ Target Tests

Generated: 2026-03-23
Expanded: 2026-03-23 (v1.0 88 units → v2.0 113 units)
Current test baseline: 0 dedicated milling tests (speed/feed gauntlet covers milling S/F only)

---

## MCP FULL UTILIZATION PROTOCOL (MANDATORY — applies to EVERY session)

```
SESSION START:  prism_session:context_boot → dispatcher_map → memory_recall → system_snapshot → action_search "<goal>"
DURING WORK:    prism_session:auto_checkpoint (every 5-10 calls) → action_search → tool_route_best → wip_capture
SESSION END:    prism_session:memory_save → system_snapshot → checkpoint_enhanced
PLUGINS:        mcp__vitest__run_tests | mcp__eslint__lint-files | codebase-memory-mcp search_graph
FEATURE CASCADE: Read SESSION_ARTIFACTS.json at start → write via PostCompact hook at end
CONTEXT RETAIN: .compaction-survival.md + HANDOFF.md + SVI-compact.md + MEMORY.md (all auto-synced)
```

## ENFORCEMENT & KNOWLEDGE PROTOCOL (applies to EVERY session)

```
ENFORCEMENT HOOKS: Same 7 enforcement hooks as all machine types (see LATHE roadmap for full list).
  Key: stub detector, test quality, constants checker, knowledge consult, context retention, wiring gate.

SKILLS: /smart CNC mill programmer + milling specialist, /forge-triple, /prism-review,
  /test, /physics-verify, /program-validate, /auto-speed-feed, /playbook, /gcode,
  /scrutinize, /forge-wiring, /trace, /forge-drift, /calibrate

4-LOOP QUALITY PROTOCOL (MANDATORY for EVERY unit):

  LOOP 1 — SCRUTINIZE:
    /prism-review (3 agents) + /scrutinize on changed files
    "Is this REAL logic?" "Would a machinist accept this output?"
    "Does physics match Sandvik/Kennametal published data?"
    "Are ALL tribal tips for this operation reflected?"
    Fix ALL findings before Loop 2

  LOOP 2 — GAP FILL:
    Run affected tests → 0 failures
    Engine WIRED? (/trace import→call→result)
    Constants from canonical source? (not inline)
    Tribal tips + playbook consulted? (hook verifies)
    ALL edge cases handled? (negative dims, exotic materials, machine limits)
    Missing test scenarios? (cross-material, cross-controller, negative)
    Output includes justification[]?
    Fill ALL gaps found

  LOOP 3 — TIE UP:
    No TODO/FIXME, no new `any` types
    Every decision has reasoning[] trail
    Output matches expected format
    Cross-engine consistency (force computed once)
    Golden snapshot saved if correct output
    MASTER_INDEX updated if new engine/action
  LOOP 4 — VALIDATE (re-verification after fixes):
    Re-run /prism-review on fixed files — findings MUST decrease
    If fixes introduced NEW findings → fix those too
    Full test suite on changed engines → 0 failures
    "This unit is DONE — validated, nothing left"

  ALL 4 LOOPS pass → next unit

MASTER KNOWLEDGE SOURCES FOR ALL MILLING SESSIONS:
  ENGINES: PrintToProgramPipelineEngine (2,194L — SCAFFOLD, needs hardening),
    ProductionToolpathEngine (polygon offset HSM), AdaptiveToolpathRouterEngine (35 algos),
    OptimalStrategySelectionEngine (E1087), CollisionPreventionEngine (E1139)
  TRIBAL TIPS: src/data/mastercam-cam-tips.ts (261 — Dynamic Motion, OptiRough),
    src/data/hypermill-cam-tips-ext.ts (83 — MAXX Roughing/Finishing),
    src/data/solidcam-cam-tips.ts (iMachining), all 18 CAM systems
  PLAYBOOK: MachiningPlaybookEngine — pocket rules, anti-patterns (never plunge flat endmill)
  FORMULAS: Kienzle (milling: Fc = kc1.1 × ae × fz^(1-mc) × z_engaged), chip thinning,
    radial engagement factor, surface finish Ra = fz²/(32×r)
  CONSTANTS: src/physics/constants.ts — canonical kc1.1, mc values
  REFERENCE: Haas Mill Workbook programs, NIST SMS Test Bed, NAS 979 test specimen
  CATALOGS: Sandvik Solid Round Tools catalog, Kennametal milling catalog
  STRATEGIES: ToolpathStrategyRegistry (752 strategies — adaptive, trochoidal, zigzag, spiral, etc.)

PER-MILESTONE INTENT:
  MS0: Pocket/contour basics → machinist gets simple 2.5D programs that actually cut metal
  MS1: Hole making (drill/tap/bore/ream) → complete hole cycle with proper peck/retract
  MS2: 3D surface finishing → ball-nose scallop, pencil tracing, rest machining
  MS3: Cutter compensation → G41/G42 with approach/exit arcs, not just offset
  MS4: Multi-setup → fixtures, WCS assignment, operation sequencing across setups
  MS5: Adaptive/trochoidal → constant chip load strategies for hard materials
  MS6-MS8: Controller hardening → Fanuc/Siemens/Heidenhain/Haas/Mazak dialect testing
  MS9-MS10: Real part testing → NIST parts, Haas workbook programs, cross-material

PHYSICS FUSION INTEGRATION (ALL S/F milestones — fusion_tier >= 2 MANDATORY):
  Every speed/feed computation MUST use PhysicsFusionOrchestratorEngine (fusion_tier >= 2).
  Tier 1 (single-pass) NOT acceptable for production — multi-model convergence required.
  Action: physics_fusion via calcDispatcher.
  Outputs: Fc_N, power_kW, temperature_C, deflection_um, Ra_um, stability, confidence.
  Inputs REQUIRED: kc1.1/mc (canonical), tool geometry (D/Z/rake/helix/edge_radius),
    engagement (ap/ae/approach_angle), material (iso_group/hardness), machine limits.
  See: PhysicsFusionOrchestratorEngine.ts + 5 plugins in src/engines/plugins/

IN-PROCESS PROBING (add to relevant milestones):
  Workpiece probing: Renishaw OMP60/OMP400 for WCS setting, first-article verification.
  Tool probing: TRS2 or TS27R for tool length, broken tool detection between ops.
  Tolerance probing: in-cycle measurement with go/no-go logic for critical features.
  Applies to: MILL-MS4 (multi-setup WCS), MILL-MS9/MS10 (real parts verification).
```

## PER-MILESTONE KNOWLEDGE SOURCES (comprehensive multi-source)

### MILL-MS0: Collision Avoidance — Knowledge Sources
```
ENGINES:
  - CollisionEngine (2,526L) — 3D collision detection (milling-focused)
  - CollisionPreventionEngine (754L) — AABB + narrow-phase, full-path certification
  - AccessibilityAnalysisEngine (689L) — tool reach validation
  - SafetyVetoEngine (E1098) — 8 hard vetoes with physics
  - GCodeSafetyAnalyzerEngine — 24 rules × 6 controllers
  - ToolAssemblyEngine + ToolAssemblyModelEngine — tool+holder collision envelope
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — milling collision anti-patterns ("never rapid Z before clearing XY")
  - src/data/mastercam-cam-tips.ts — Dynamic Motion collision avoidance tips
  - src/data/hypermill-cam-tips-ext.ts — MAXX collision avoidance
  - controller-knowledge-tips.ts — rapid traverse behavior per controller
FORMULAS:
  - Tool assembly envelope: swept_radius = holder_diameter/2 + tool_stickout × sin(tilt)
  - Safe retract height: Z_safe = Z_top_of_stock + tool_length_below_holder + clearance
  - Rapid traverse collision: check XY position BEFORE Z rapid down
REFERENCE:
  - ISO 10218 — machine tool safety standards
  - MachineRegistry — travel limits, rapid rates, spindle head geometry per machine
  - Haas Mill Workbook — safe retract positions in reference programs

INTENT: A spindle head crashing into a vise jaw = $50K+ damage + weeks of downtime.
  PRISM checks EVERY rapid move, every tool change position, every approach path.
  No program exits without collision-free certification.
```

### MILL-MS0.5: POST-ULT Wiring — Knowledge Sources
```
ENGINES:
  - PrintToProgramPipelineEngine (2,194L — SCAFFOLD, needs real geometry)
  - PostProcessorPipelineEngine (3,139L — 35 stages, 7 phases)
  - POST-ULT pipeline: PostPhysicsFoundation → LineByLineAdaptive → MotionControllerInjection
    → PostVerificationSafety → PostOutputGeneration (17 engines, 24,746L)
  - ControllerDialectEngine (970L — 20 dialects)
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — post-processing rules, program structure
  - controller-knowledge-tips.ts — dialect-specific G-code quirks
FORMULAS:
  - Per-block S/F: F_adjusted = F_base × (ae_ref/ae_actual)^chip_thinning_factor
  - HSM mode injection: G05.1 Q1 (Fanuc AICC), CYCLE832 (Siemens), M-codes (Haas)
REFERENCE:
  - POST-ULT track documentation (project_post_ultimate.md — 17 engines, 105 tests, 44 actions)
  - Controller programming manuals for HSM syntax per controller

INTENT: Raw G-code from pipeline → POST-ULT optimizes per-block S/F, injects HSM modes,
  formats for target controller, runs safety verification. This transforms scaffold
  G-code into production-quality output optimized for the specific machine.
```

### MILL-MS1: Multi-Machine — Knowledge Sources
```
ENGINES:
  - MachineSelectionEngine — select best machine from shop capabilities
  - MachineMatcherEngine — feature→machine capability matching
  - MachineStrategyConstraintEngine (E1091) — validate machine can execute strategy
  - ControllerFeatureMatrixEngine — controller capability matrix (look-ahead, NURBS, etc.)
  - SpindleTorqueCurveEngine — spindle power/torque curves for power validation
TRIBAL KNOWLEDGE:
  - controller-knowledge-tips.ts — controller-specific capabilities and limitations
  - MachiningPlaybookEngine — machine selection rules ("80-block look-ahead = limit adaptive complexity")
  - src/data/*-cam-tips.ts — machine-specific tips across all 18 CAM systems
FORMULAS:
  - Power check: P_required = Fc × Vc / (60000 × η) — must be < machine spindle power
  - Torque check: T_required = Fc × D / (2000) — must be < spindle torque at operating RPM
  - Look-ahead effect: max_path_points = machine_look_ahead × controller_block_rate
REFERENCE:
  - MachineRegistry — 910 machines from 48 manufacturers with full specs
  - SpindleTorqueCurveEngine — power/torque vs RPM for common spindles
  - Academy courses — CNC machine fundamentals

INTENT: A pocket strategy that needs NURBS interpolation fails on a controller without it.
  A 40-taper machine can't handle the same DOC as a 50-taper. PRISM matches the strategy
  to the MACHINE, not just the part geometry.
```

### MILL-MS2: Tooling — Knowledge Sources
```
ENGINES:
  - SmartToolSelectorEngine — 7-factor physics-scored from 95K catalog
  - InventoryAwareToolSelectorEngine — check crib FIRST
  - ToolCatalogEngine — 95,608 tools from 28 manufacturers
  - ToolROIEngine (E1081) — 3 price points with ROI
  - ToolCoatingSelectionEngine + CoatingSelectionEngine (E1082) — coating by ISO group
  - ToolGeometrySelectionEngine — helix angle, flute count, corner radius optimization
  - ToolDeflectionPredictionEngine — δ = F×L³/(3EI) for overhang check
  - ToolMagazineOptimizationEngine — minimize tool changes (TSP)
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — tool selection rules ("4 flutes for steel, 2-3 for aluminum")
  - src/data/mastercam-cam-tips.ts — Dynamic Motion tool requirements
  - src/data/*-cam-tips.ts — tool tips across 18 CAM systems
  - Sandvik application tips — helix angle vs material, coating vs operation
FORMULAS:
  - Deflection: δ = 64×F×L³/(3×E×π×D⁴) — tool stickout is CUBED (3× stickout = 27× deflection)
  - ROI: cost_per_part = tool_price / (edges × parts_per_edge)
  - Chip evacuation: flute_depth × helix_pitch > chip_volume_per_revolution
REFERENCE:
  - Sandvik Solid Round Tools catalog — endmill selection guide
  - Kennametal milling catalog — tool selection by application
  - CoatingRegistry — coating properties by ISO group and operation
  - ToolRegistry — index into full 95K catalog
  - Machinery's Handbook — endmill geometry, speed/feed tables

INTENT: Wrong tool = bad finish, broken tool, or 3× longer cycle. PRISM selects from
  95K real tools (not synthetic), checks crib first, shows 3 price points, verifies
  deflection at operating stickout. A 12mm endmill at 4×D stickout has 64× more deflection
  than at 2×D — PRISM catches this before the machinist does.
```

### MILL-MS3: Workholding — Knowledge Sources
```
ENGINES:
  - WorkholdingEngine — core workholding intelligence
  - WorkholdingIntelligenceEngine — advanced analysis
  - WorkholdingViabilityEngine — clamping force vs cutting force validation (GATE)
  - WorkholdingVerificationEngine (E1148) — Coulomb friction grip force check
  - FixtureDesignEngine — fixture design
  - ModularFixtureLayoutEngine — modular fixture layout
  - TombstoneLayoutEngine — tombstone face assignment for HMC
  - MultiSetupPlannerEngine — multi-setup orientation + fixturing
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — workholding rules ("clamp on solid stock, never on thin walls")
  - src/data/*-cam-tips.ts — workholding tips across 18 CAM systems
FORMULAS:
  - Grip force: F_grip = μ × F_clamp × n_clamps (Coulomb friction model)
  - Required: F_grip > F_cutting × SF (safety factor 2.0-3.0)
  - Tombstone: 4 faces × parts_per_face = parts_per_load
REFERENCE:
  - Machinery's Handbook — vise clamping force tables
  - Fixture design standards
  - MachineRegistry — table size, T-slot spacing per machine

INTENT: A part flying off the vise mid-cut = scrapped part + possible injury.
  PRISM verifies: clamp force × friction > cutting force × safety factor.
  For multi-setup parts, auto-assigns G54-G59 WCS and plans fixture changes.
```

### MILL-MS4: End-to-End Pipeline — Knowledge Sources
```
ENGINES:
  - ALL engines from MS0-MS3 — integrated as milling pipeline
  - AutoPrintToProgramBridgeEngine — routing: detect milling features → milling pipeline
  - FeatureRecognitionEngine — 21 feature types (pockets, holes, contours, bosses, etc.)
  - FeatureToZoneEngine — decompose into bulk/corner/wall/floor zones
  - OptimalStrategySelectionEngine (E1087) — physics-scored strategy selection
  - AdaptiveToolpathRouterEngine — 35 algorithm selection
  - ProductionToolpathEngine — polygon offset HSM toolpaths
  - BackplotEngine — fast verification before simulation
TRIBAL KNOWLEDGE:
  - TribalKnowledgeDecisionBridge — queries ALL 3,700+ tips at decision points
  - TribalKnowledgeActionEngine — 200 actionable rules modify parameters
  - MachiningPlaybookEngine — 296 rules checked at every stage
  - FeatureStrategyKnowledgeBaseEngine (E1112) — 203 feature→strategy rules
FORMULAS:
  - Full Kienzle force model: Fc = kc1.1 × ae × fz^(1-mc) × corrections
  - Chip thinning: fz_actual = fz × √(D/(D-2×ae)) for ae < D/2
  - Surface finish: Ra = fz²/(32×r) for ball-nose, Ra = fz²/(8×D) for flat endmill
  - Stability: SLD with FRF + RCSA for assembly dynamics
REFERENCE:
  - ToolpathStrategyRegistry — 752 strategies (not just 28)
  - Haas Mill Workbook — end-to-end validation
  - NIST SMS Test Bed reference programs
  - FormulaRegistry — 499 formulas with provenance
  - MaterialRegistry — alloy-specific properties

INTENT: Drawing → feature recognition → strategy selection → tool selection → S/F
  calculation → collision check → post-processing → G-code. End-to-end for milling.
  Real toolpaths with real coordinates from real geometry — not X0/Y0 placeholders.
```

### MILL-MS5: User Optimization — Knowledge Sources
```
ENGINES:
  - StrategyComparisonEngine (E1099) — radar chart + explanation
  - ToolpathCostComparisonEngine — strategy × tool cost matrix
  - PipelineDecisionOrchestratorEngine (E1080) — Level 3 decisions
  - StrategyBenchmarkEngine (E1096) — Monte Carlo comparison
  - BatchSizeStrategyEngine (E1100) — prototype vs production
TRIBAL KNOWLEDGE:
  - TribalKnowledgeActionEngine — tips modify strategy scores
  - MachiningPlaybookEngine — when to use each strategy type
  - Academy courses — milling strategy fundamentals
FORMULAS:
  - Cost per strategy: C = (cycle_time × machine_rate) + (tool_cost / parts_per_edge)
  - Time comparison: Adaptive (more toolpath, lower ae) vs Zigzag (less path, higher ae)
  - Quality comparison: Ra prediction per strategy
REFERENCE:
  - Sandvik "Milling Productivity" application guide
  - Published cycle time comparisons: adaptive vs conventional

INTENT: "Adaptive: $18.40, 23min, Ra 3.2. Trochoidal: $22.10, 28min, Ra 2.1.
  Zigzag: $14.20, 18min, Ra 4.8." Machinist picks what matters for THIS job.
```

### MILL-MS6: Controller Hardening — Knowledge Sources
```
ENGINES:
  - ControllerDialectEngine — 20 dialects
  - ConversationalOutputEngine — Mazatrol/Okuma/Haas conversational
  - GCodeTranspilerEngine — transpile between dialects
  - SubprogramEngine — M98/CALL
  - ProgramStructureEngine — safety blocks, headers/footers
TRIBAL KNOWLEDGE:
  - controller-knowledge-tips.ts — ALL controller-specific tips
  - MachiningPlaybookEngine — controller quirk rules
  - src/data/*-cam-tips.ts — controller tips across 18 CAM systems
FORMULAS:
  - Canned cycle syntax: G83 (Fanuc) vs CYCLE83 (Siemens) vs CYCL DEF 200 (Heidenhain)
  - HSM activation: G05.1 Q1 (Fanuc AICC), CYCLE832 (Siemens HDCS), G187 (Haas)
  - Cutter comp: G41/G42 approach/exit arc requirements per controller
REFERENCE:
  - Fanuc 31i, Siemens 840D, Heidenhain iTNC 530, Haas NGC, Mazak SmoothX, Okuma OSP manuals
  - Controller dialect assertion library (from Phase 0-C)

INTENT: Same program, 6 different dialects. G83 Z-25 Q5 R2 (Fanuc) becomes
  CYCLE83(2,0,,-25,,,5,,0.5) (Siemens). Every canned cycle, every safety block,
  every HSM mode must be controller-correct.
```

### MILL-MS7: Physics Hardening — Knowledge Sources
```
ENGINES:
  - KienzleForceModelEngine — cutting force
  - ChatterStabilityLobeEngine — stability lobe diagram
  - StochasticChatterEngine — MC stability (200 samples)
  - ToolDeflectionPredictionEngine — tool bending
  - SurfaceFinishPredictorEngine — real Ra (runout+vibration+deflection)
  - ToolpathThermalEngine — thermal field along toolpath
  - StochasticToolLifeEngine — Weibull tool life distribution
  - ProcessCapabilityPredictionEngine — Cpk (500 MC)
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — physics anti-patterns ("force must not exceed 80% machine capacity")
  - src/data/*-cam-tips.ts — physics tips across 18 CAM systems
FORMULAS:
  - Kienzle: Fc = kc1.1 × ap × fz^(1-mc) × K_gamma × K_kappa × K_wear × K_vc
  - SLD: a_lim = -1/(2×Ks×Re[G(jω)]) — critical depth at each RPM
  - Deflection: δ = 64FL³/(3Eπd⁴) — cubic stickout dependency
  - Ra: multi-factor (runout + vibration + deflection + feed marks + tool wear)
  - Taylor: VcT^n = C → tool life prediction
  - Cpk: (USL-LSL)/(6σ) with Monte Carlo for σ estimation
REFERENCE:
  - Altintas "Manufacturing Automation" — SLD theory, FRF, RCSA
  - Sandvik Metal Cutting Technical Guide — force/power verification data
  - src/physics/constants.ts — CANONICAL constants
  - FormulaRegistry — all 499 formulas

INTENT: Every physics number in the output must be VERIFIABLE against published data.
  Force within ±10% of analytical. Deflection < tolerance/3. P(chatter) < 15%. Cpk ≥ 1.33.
```

### MILL-MS8-MS10: Testing & Validation — Knowledge Sources
```
ENGINES:
  - ALL pipeline engines — full end-to-end testing
  - CNCSimulationPipelineEngine — material removal simulation
  - BackplotEngine — fast toolpath verification
TRIBAL KNOWLEDGE:
  - ALL tip sources — validate tips produce correct outcomes
  - MachiningPlaybookEngine — rules validated against reference programs
FORMULAS:
  - ALL formulas — hand-calculate expected values, compare to output
  - Cross-material: same part in 4140, 316L, 6061, Ti-6Al-4V, D2 → different S/F
REFERENCE:
  - Haas Mill Workbook reference programs with matching drawings
  - NIST SMS Test Bed — standardized test programs
  - NAS 979 — test specimen standard for machine qualification
  - Titans of CNC Academy milling programs
  - Golden snapshots from MS0-MS7 — regression anchors
  - Cross-material S/F range tables (Phase 0-C)
  - Controller dialect assertion library (Phase 0-C)
  - EXTERNAL-REFERENCE-PROGRAMS-INDEX.md — all reference sources

INTENT: Real parts, real programs, real machines. PRISM output vs known-correct reference.
  Every coordinate verified. Every S/F within published ranges. Every controller syntax
  correct. After MS10, PRISM generates correct milling programs for 20+ real parts.
```

---

## CURRENT STATE (What's Built)

### Engines (existing, working):
| Engine | Lines | Status |
|--------|-------|--------|
| PrintToProgramPipelineEngine | 2,194 | SCAFFOLD — hardcoded X0/Y0, no real geometry, no cutter comp |
| MultiAxisPrintToProgramEngine | 707 | STUB — single interpolated point + placeholder |
| CNCProgramAssemblerEngine | 1,017 | Multi-op assembly with physics S/F |
| CollisionEngine | 2,526 | 3D collision detection (milling-focused but unwired) |
| CollisionPreventionEngine | 754 | AABB+cylinder pre-flight collision check |
| AccessibilityAnalysisEngine | 689 | Tool reach validation |
| PostProcessorPipelineEngine | 3,139 | 35+ stages, 7 phases, 20 controller dialects |
| ControllerDialectEngine | 970 | 20 dialects (Fanuc/Siemens/Heidenhain/Haas/Mazak/Okuma/Brother) |
| SmartToolSelectorEngine | 557 | 7-factor physics-scored from 95K+ catalog |
| ToolCatalogEngine | 2,651 | 95,608 tools from 28+ manufacturers |
| KienzleForceModelEngine | — | Fc = kc1.1 x ap x fz^(1-mc) |
| ChatterStabilityLobeEngine | — | Stability lobe diagram |
| EngagementGeometryEngine | — | Corner classification, moating, 10-80 deg bounds |
| EngagementAdaptiveFeedEngine | — | Martellotti chip thinning + S-curve ramping |
| AdaptiveClearingEngine | — | Constant-engagement trochoidal pocket clearing |
| SurfaceFinishPredictorEngine | — | Real-world Ra (runout, vibration, deflection) |
| PartDeflectionEngine | — | Part deflection prediction |
| ToolDeflectionPredictionEngine | — | Tool deflection under cutting load |
| EndToEndPipelineEngine | 680 | Feature-to-algorithm-to-toolpath-to-post-to-verify |
| MachiningKnowledgeBaseEngine | 3,667 | 56 actions, milling knowledge coverage |
| GCodeSafetyAnalyzerEngine | 1,894 | 24 safety rules x 6 controllers |
| GCodeValidationEngine | 678 | Modal tracking, arc geometry, machine envelope |
| **TOTAL MILLING-RELEVANT CODE** | **~22,000+** | |

### Tests (passing):
- `tests/speed-feed-gauntlet.ts` — 401/401 (covers milling S/F calculations)
- No dedicated milling program generation tests exist
- No milling pipeline integration tests exist

### Applicable Shop Profiles:
- **Job shops**: Aluminum aerospace, steel mold/die, medical titanium
- **Production**: Automotive castings, fixture plates, electronics housings
- **Materials**: 6061/7075 Al, 1018/4140/4340 steel, 304/316 SS, Ti-6Al-4V, Inconel 718, P20/H13/S7 tool steel
- **Features**: Pockets, contours, holes, slots, faces, 3D surfaces, thin walls, deep cavities

---

## CRITICAL ARCHITECTURAL ISSUES (Must Fix First)

### Issue 1: No Real Geometry in Program Output
PrintToProgramPipelineEngine outputs hardcoded X0 Y0 Z0 coordinates. There is NO feature-to-coordinate translation — every pocket is at origin, every contour is a placeholder. Zero production value.
**Fix**: MILL-MS4 — real geometry pipeline with coordinate generation from part dimensions.

### Issue 2: No Cutter Compensation
Zero support for G41/G42 cutter radius compensation. All toolpaths are centerline-only with no ability to compensate for tool wear, regrind, or diameter variation.
**Fix**: MILL-MS4 — G41/G42 with approach/exit moves, comp type selection (computer vs controller).

### Issue 3: Collision Engines Unwired
CollisionEngine (2,526L) and CollisionPreventionEngine (754L) exist but are NOT integrated into the milling pipeline. No spindle head vs fixture check, no holder vs vise interference, no rapid traverse safety validation.
**Fix**: MILL-MS0 — wire collision engines + add milling-specific checks.

### Issue 4: No Multi-Setup Awareness
Milling almost always requires multiple setups (Op1 top, Op2 flip, Op3 side). No flip detection, no datum transfer, no stock-left-from-previous-op tracking.
**Fix**: MILL-MS4 — multi-setup orchestration with stock evolution.

### Issue 5: 5-Axis is a Stub
MultiAxisPrintToProgramEngine is 707 lines of placeholder. No real RTCP, no tool vector interpolation, no simultaneous 5-axis toolpath.
**Fix**: Deferred beyond this roadmap (requires full CAD kernel maturity).

---

## MILESTONE DETAILS

### MILL-MS0: Collision Avoidance & Rapid Traverse Safety
**Priority: CRITICAL | Units: 10 | Depends on: nothing**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Wire CollisionEngine + CollisionPreventionEngine into PrintToProgramPipelineEngine — add milling-specific collision checks |
| U02 | Spindle head vs fixture collision — swept volume of spindle nose + holder vs vise/clamp/fixture plate at each Z level |
| U03 | Tool holder vs vise jaw interference — holder OD + stickout vs jaw height at pocket/contour positions near vise |
| U04 | Rapid traverse safety — G0 moves must clear all fixtures by safe_clearance (default 25mm). Intermediate Z retract before XY rapid |
| U05 | Machine travel limit validation — X/Y/Z program coordinates vs machine envelope. Auto-reject if part+fixture exceeds travel |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Tool length vs Z-depth check — tool_stickout must exceed feature_depth + clearance. Auto-flag if endmill flute length < pocket depth |
| U07 | Collet/chuck-to-part interference — for long tools, check ER collet nut or chuck body vs part top surface at deep reach |
| U08 | Adjacent feature collision — tool entering narrow slot: shank OD must clear slot width. Auto-reject if shank > slot - 2mm |
| U09 | Safe Z retract sequencing — retract to R-plane before XY rapid between features. G98/G99 selection for canned cycles |
| U10 | 12 collision/safety test scenarios (spindle crash, holder crash, rapid crash, travel exceeded, tool too short, shank interference) |


**SESSION BOUNDARY — MANDATORY:**
```
1. Final 4-LOOP pass on all units in this milestone (SCRUTINIZE → GAP FILL → TIE UP)
2. npx tsc --noEmit → 0 errors
3. npx vitest run [affected files] → 0 failures
4. Verify: every engine WIRED + CALLED + RESULT USED (/trace)
5. Verify: tribal tips + playbook consulted for every decision
6. Verify: no inline constants (enforcement hook checks)
7. /compact (save 4-loop results + what's next)
8. START NEW SESSION: /startup → /handoff read → /roadmap-quality-check → continue
```

### MILL-MS0.5: Dialect Reconciliation — Route Through POST-ULT Pipeline
**Priority: CRITICAL | Units: 5 | Depends on: MILL-MS0**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | **ARCH FIX**: Route ALL PrintToProgramPipelineEngine output through PostProcessorPipelineEngine. Remove any inline G-code. Single path, all dialects |
| U02 | Add Siemens 828D/840D milling dialect — G17, CYCLE81-89 drilling, POCKET3/POCKET4, MCALL modal, CYCLE832 HSM tolerance |
| U03 | Add Heidenhain TNC640/iTNC530 dialect — conversational BLK FORM, CYCL DEF 200-series, M120 look-ahead, PLANE SPATIAL |
| U04 | Add Mazak SmoothG/SmoothAi dialect — G05.1 HPCC, G187 smoothing, variable acceleration, MAZATROL conversational |
| U05 | Add Okuma OSP-P300 milling dialect — G08 high-speed, G15 H-codes, NVAR variables, OSP-specific M-codes |


**SESSION BOUNDARY — MANDATORY:**
```
1. Final 4-LOOP pass on all units in this milestone (SCRUTINIZE → GAP FILL → TIE UP)
2. npx tsc --noEmit → 0 errors
3. npx vitest run [affected files] → 0 failures
4. Verify: every engine WIRED + CALLED + RESULT USED (/trace)
5. Verify: tribal tips + playbook consulted for every decision
6. Verify: no inline constants (enforcement hook checks)
7. /compact (save 4-loop results + what's next)
8. START NEW SESSION: /startup → /handoff read → /roadmap-quality-check → continue
```

### MILL-MS1: Multi-Machine Capability Database
**Priority: HIGH | Units: 7 | Depends on: MILL-MS0.5**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Machine capability database — 20+ VMC/HMC/gantry/5-axis models with travel, RPM, power, torque, tool magazine, pallet, ATC speed |
| U02 | VMC vs HMC vs gantry classification — vertical spindle (most common), horizontal (chip evacuation, tombstone), gantry (large parts) |
| U03 | Feature-to-capability matching — deep_pocket needs high Z travel, thin_wall needs high RPM + low force, heavy_roughing needs high torque |
| U04 | Machine auto-selector — rank by capability match, cost-per-hour, tolerance capability. Top 3 with reasoning |
| U05 | Spindle taper compatibility — CAT40 vs BT40 vs HSK-A63 vs HSK-F63 vs CAT50 vs BT50 vs HSK-A100. RPM limits per taper |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | 4th-axis / 5th-axis awareness — trunnion table vs swivel head, A/B/C axis assignments, work envelope reduction |
| U07 | Tests: same part on 6 machines (VMC, HMC, gantry, 40-taper, 50-taper, HSK), validate capability filtering + dialect |


**SESSION BOUNDARY — MANDATORY:**
```
1. Final 4-LOOP pass on all units in this milestone (SCRUTINIZE → GAP FILL → TIE UP)
2. npx tsc --noEmit → 0 errors
3. npx vitest run [affected files] → 0 failures
4. Verify: every engine WIRED + CALLED + RESULT USED (/trace)
5. Verify: tribal tips + playbook consulted for every decision
6. Verify: no inline constants (enforcement hook checks)
7. /compact (save 4-loop results + what's next)
8. START NEW SESSION: /startup → /handoff read → /roadmap-quality-check → continue
```

### MILL-MS2: Tooling Variability & Catalog Integration
**Priority: HIGH | Units: 15 | Depends on: MILL-MS0**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Wire SmartToolSelectorEngine + ToolCatalogEngine (95K tools) into milling pipeline — query by operation, material, diameter, flute count |
| U02 | Endmill selection by flute count — 2-flute (aluminum, deep slots, chip evacuation), 3-flute (stainless, general purpose), 4-flute (steel, high feed), 5-6 flute (finishing, high-feed at light DOC). Auto-select with reasoning |
| U03 | High-feed cutter support — XNEX/HELI2000 style button/round insert. Very low ap (0.5-1.5mm), very high fz (1.5-3mm/tooth). Chip thinning factor = D/(2 x ae). Forces primarily axial — pushes into spindle, not sideways. Different force model from standard endmill |
| U04 | Indexable face mill selection — 45-deg lead (lower axial force, thin chip) vs 90-deg (square shoulder, full ap) vs round insert (strongest, variable chip thin). Part width vs cutter diameter (1.3x rule). Insert grade by material group |
| U05 | Ball endmill for 3D surfaces — effective diameter D_eff = 2 x sqrt(ap x (D - ap)). At shallow ap, D_eff << D so RPM must increase. Scallop height = stepover^2 / (8 x R). Auto-calculate stepover from target Ra |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Bull nose (corner radius) endmill — compromise between flat-end (max MRR) and ball-end (3D). Corner radius strengthens tip, reduces chipping. D_eff calculation differs from ball — flat portion + radius blend |
| U07 | Thread mill — helical interpolation G2/G3 with simultaneous Z feed = pitch per rev. Single-point (any pitch) vs multi-tooth (faster, fixed pitch). Climb vs conventional thread milling. ID thread = climb CW, OD thread = climb CCW |
| U08 | Chamfer mill — fixed-angle (30/45/60 deg) chamfer tool. Depth controls chamfer width. Back-chamfer tool for deburring inaccessible edges. Single-flute vs multi-flute selection |
| U09 | Drill selection by L/D ratio — twist drill (L/D < 3, universal), stub drill (L/D < 2, stiffest), carbide drill (L/D < 5, through-coolant preferred), through-coolant carbide (L/D < 8, mandatory coolant), gun drill (L/D > 8, single-lip, guide bushing). Auto-select with peck cycle assignment |
| U10 | Tap selection — form tap (soft materials < 35 HRC, no chips, faster, higher torque) vs cut tap (universal, chips, lower torque). Spiral flute (blind hole, lifts chips) vs spiral point (thru hole, pushes chips). Thread size to tap drill diameter table |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U11 | Reamer for tight-tolerance holes — H7 tolerance after drilling to H11. Reamer requires pre-drill at diameter - 0.2mm. Low RPM, high feed, no peck. Floating holder recommended for alignment |
| U12 | Boring head for precision bores — single-point adjustable boring. For H6/H7 bores > 20mm where reamer is expensive. Rough bore → semi-finish → finish bore. Micro-adjust 0.002mm resolution |
| U13 | Spot drill / center drill — spot drill (90/120/142 deg) for hole location accuracy before drilling. Center drill (60 deg) only for lathe center support. Spot depth = enough to fully form the point, not deeper |
| U14 | Minimum corner radius constraint — internal corner radius >= tool radius. Sharp internal corners impossible with round tool. Auto-warn when drawing shows sharp corners, recommend smallest available endmill or EDM |
| U15 | Tests: 15-tool job with magazine position optimization, tool change minimization, and sister-tool assignment for batch > 500 |


**SESSION BOUNDARY — MANDATORY:**
```
1. Final 4-LOOP pass on all units in this milestone (SCRUTINIZE → GAP FILL → TIE UP)
2. npx tsc --noEmit → 0 errors
3. npx vitest run [affected files] → 0 failures
4. Verify: every engine WIRED + CALLED + RESULT USED (/trace)
5. Verify: tribal tips + playbook consulted for every decision
6. Verify: no inline constants (enforcement hook checks)
7. /compact (save 4-loop results + what's next)
8. START NEW SESSION: /startup → /handoff read → /roadmap-quality-check → continue
```

### MILL-MS3: Workholding Adaptation
**Priority: HIGH | Units: 8 | Depends on: MILL-MS0**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Vise jaw force calculation — grip force vs cutting force x safety factor (2.5). Kurt vs Schunk vs Lang. Max part pullout force |
| U02 | Vacuum table support — holding force = vacuum x area x friction. Material permeability check. Minimum surface area for safe hold |
| U03 | Fixture plate / modular fixturing — grid plate bolt pattern, Jergens/Carr Lane ball-lock, repeatability vs setup time tradeoff |
| U04 | Tombstone workholding (HMC) — 4-sided tombstone, 2-sided angle plate. Part count per load, Z-height limit per face |
| U05 | Pallet system support — 2-pallet, 6-pallet, linear pallet pool. Setup while running, spindle utilization optimization |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Soft jaw for Op2 — detect finished surfaces from Op1, recommend soft jaw profile to protect cosmetic surfaces |
| U07 | Missing types: magnetic chuck (grinding crossover), 3R/Erowa zero-point, custom fixture with locating pins + toe clamps |
| U08 | Tests: 5 workholding configs on same part, verify force limits and RPM/feed adjustments |


**SESSION BOUNDARY — MANDATORY:**
```
1. Final 4-LOOP pass on all units in this milestone (SCRUTINIZE → GAP FILL → TIE UP)
2. npx tsc --noEmit → 0 errors
3. npx vitest run [affected files] → 0 failures
4. Verify: every engine WIRED + CALLED + RESULT USED (/trace)
5. Verify: tribal tips + playbook consulted for every decision
6. Verify: no inline constants (enforcement hook checks)
7. /compact (save 4-loop results + what's next)
8. START NEW SESSION: /startup → /handoff read → /roadmap-quality-check → continue
```

### MILL-MS4: End-to-End Pipeline — Real Toolpath Generation & Multi-Setup
**Priority: CRITICAL | Units: 20 | Depends on: MILL-MS0.5, MILL-MS1, MILL-MS2, MILL-MS3**

**Apply: `/smart /forge-triple` at session start for this milestone**


#### Pipeline Orchestration (3 units)
| Unit | Description |
|------|-------------|
| U01 | Complete chain: text→parse→features→machine_select→tool_select→collision→workholding→toolpath→program→setup_sheet |
| U02 | Multi-setup orchestration — Op1 (top features) → flip → Op2 (bottom features) → rotate → Op3 (side features). Datum transfer A/B/C, stock tracking per-setup, WCS assignment (G54/G55/G56) |
| U03 | Error handling and setup sheet — graceful degradation (never silently drop features), warn on tolerance risk. Setup sheet: fixture layout, tool list with stickout, WCS datum, inspection points, cycle time, safety notes |

#### Pocket Toolpath Generation (8 units)
| Unit | Description |
|------|-------------|
| U04 | Rectangular pocket — compute boundary from feature dims (X_min, X_max, Y_min, Y_max), offset inward by tool_radius + stock_allowance, generate zigzag passes with stepover = 10-40% of tool_diameter. Climb milling direction. Output real G1 X/Y coordinates |
| U05 | Circular pocket — spiral inward from outer boundary with constant stepover. Arc interpolation G2/G3 for smooth surface. Center point + radius from feature dims. Finish pass at final diameter with spring pass option |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Freeform pocket — contour-following offset passes from arbitrary boundary. Morphing offset algorithm: each pass shrinks boundary inward by stepover. Rest material detection at tight corners where large tool leaves stock |
| U07 | Helical entry into pocket — G2/G3 with simultaneous Z feed to ramp into pocket floor. Helix diameter = tool_dia x 0.7 (must fit in pocket). Helix pitch from material: Al 2mm/rev, steel 1mm/rev, SS 0.5mm/rev. No plunge into material — always helical or ramp |
| U08 | Ramp entry — angled linear approach for materials/machines that cannot helical. Ramp angle: Al 5-8 deg, steel 2-3 deg, hardened 1-1.5 deg. Ramp length = Z_depth / tan(angle). Zigzag ramp for narrow pockets where ramp length exceeds pocket length |
| U09 | Multi-depth Z-level passes — stepdown from DPMultiPass physics model per material. Al: ap = 1.0-1.5D, steel: ap = 0.5-1.0D, SS: ap = 0.3-0.5D, Ti: ap = 0.5-1.0D at reduced ae. Each Z-level is a complete pocket clearing pass. Final floor pass with finish allowance |
| U10 | Rest machining — detect uncut material left by previous larger tool. Compute material remaining in corners where R_large_tool > R_small_tool. Generate toolpath ONLY in rest-material zones, skip already-cleared areas. Tool load limiting in corners |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U11 | Island detection — pockets with internal bosses (raised features inside pocket). Toolpath must route around island boundary with offset = tool_radius + stock. Island approach: contour island first, then clear remaining pocket. Multiple islands supported |

#### Contour Toolpath Generation (6 units)
| Unit | Description |
|------|-------------|
| U12 | Open contour — G1/G2/G3 along profile with G41/G42 cutter radius compensation. Approach from safe point perpendicular to first element. Tool follows programmed path offset by tool radius. Real XYZ from feature geometry |
| U13 | Closed contour — lead-in arc (radius = tool_dia x 0.5) tangent to first profile element → G41 engage → full profile loop → lead-out arc tangent from last element → G40 cancel. Seamless entry/exit to avoid witness mark |
| U14 | Lead-in/lead-out geometry — arc lead-in radius by material: Al = tool_dia x 0.5, steel = tool_dia x 0.75, SS/Ti = tool_dia x 1.0. Linear lead-in for tight spaces where arc won't fit. Lead-out mirrors lead-in. Never start/stop cut on a corner |
| U15 | Multi-pass contour — roughing passes at offset (stock_allowance + 0.2mm per pass) → semi-finish at stock_allowance → finish at final dimension. Pass count = total_stock / DOC_per_pass. Each pass has own lead-in/lead-out |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U16 | Corner handling — external corners: tool path extends beyond corner, arc around corner maintaining cutter comp contact. Internal corners: tool decelerates (feed override), radius = tool_radius minimum. Auto-insert corner radius if drawing allows |
| U17 | Chamfer and deburr pass — automatic edge break at programmed angle (default 45 deg, also 30/60) with reduced depth (0.2-0.5mm). Chamfer tool or endmill tip. Generate separate pass after finish contour. Back-chamfer for bottom edges where accessible |

#### Face Milling (3 units)
| Unit | Description |
|------|-------------|
| U18 | Full face mill — passes across entire top surface. Stepover = 65-75% of cutter diameter for optimal chip thinning. Overshoot each side by 10-20% of cutter dia for clean edge. Climb direction (right-to-left). Multiple Z-passes if stock > max DOC |
| U19 | Partial face — mill only the feature area, not entire part top. Approach from outside part boundary, traverse across feature width, retract. Useful for bosses, raised pads, local face cleanup. Avoid cutting air over already-finished areas |
| U20 | Climb vs conventional selection — climb milling (default for CNC): cutter rotation matches feed direction, lower cutting force, better finish, longer tool life. Conventional milling: for manual machines, worn ballscrews, interrupted cuts on hard materials. Auto-select based on machine_type and material |


**SESSION BOUNDARY — MANDATORY:**
```
1. Final 4-LOOP pass on all units in this milestone (SCRUTINIZE → GAP FILL → TIE UP)
2. npx tsc --noEmit → 0 errors
3. npx vitest run [affected files] → 0 failures
4. Verify: every engine WIRED + CALLED + RESULT USED (/trace)
5. Verify: tribal tips + playbook consulted for every decision
6. Verify: no inline constants (enforcement hook checks)
7. /compact (save 4-loop results + what's next)
8. START NEW SESSION: /startup → /handoff read → /roadmap-quality-check → continue
```

### MILL-MS5: User Optimization Choices
**Priority: MEDIUM | Units: 5 | Depends on: MILL-MS4**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Multi-option: (A) fastest cycle — max MRR, aggressive engagement, (B) best finish — light DOC, high RPM, (C) longest tool life — conservative, (D) cheapest per part |
| U02 | Cost-per-part breakdown: material + tooling_amortized + machine_time x rate + setup_amortized + inspection |
| U03 | What-if analysis: change any parameter (material, machine, tool, batch) → instant recalculation + delta display |
| U04 | Batch size optimization: 1 part → minimize setup. 100 parts → maximize spindle utilization. 10,000 → pallet automation + sister tools |
| U05 | Tests: A/B/C/D for 6061-T6 pocket part with cost validation against shop-floor actuals |


**SESSION BOUNDARY — MANDATORY:**
```
1. Final 4-LOOP pass on all units in this milestone (SCRUTINIZE → GAP FILL → TIE UP)
2. npx tsc --noEmit → 0 errors
3. npx vitest run [affected files] → 0 failures
4. Verify: every engine WIRED + CALLED + RESULT USED (/trace)
5. Verify: tribal tips + playbook consulted for every decision
6. Verify: no inline constants (enforcement hook checks)
7. /compact (save 4-loop results + what's next)
8. START NEW SESSION: /startup → /handoff read → /roadmap-quality-check → continue
```

### MILL-MS6: Controller-Specific Deep Hardening
**Priority: MEDIUM | Units: 7 | Depends on: MILL-MS0.5**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Fanuc 0i-MF/31i-B5 — G05.1 AICC, nano smoothing, G68.1 tilted work plane, WHILE/DO/END macro, corner override |
| U02 | Haas NGC — G187 P1/P2/P3 smoothing levels, Setting 191 look-ahead, D-word offset, M97 local sub, macro variables |
| U03 | Siemens 828D/840D — CYCLE832 tolerance, COMPCURV, SOFT, FFWON, TRAORI 5-axis, MCALL modal drill, POCKET3/POCKET4 |
| U04 | Heidenhain TNC640/TNC7 — M120 look-ahead, PLANE SPATIAL, CYCL DEF 200-series, BLK FORM, FK free-contour, FUNCTION TCPM |
| U05 | Mazak SmoothG — G05.1 HPCC, G187 variable acceleration, G68.2 tilted work plane, SMOOTH Ai corner control |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Okuma OSP-P300 — G08 high-speed, G15 H-codes (WCS), NVAR macros, NURBS G06.2, acceleration/jerk parameters |
| U07 | Tests: same contour part on ALL 6 controllers, verify zero cross-contamination between dialects |


**SESSION BOUNDARY — MANDATORY:**
```
1. Final 4-LOOP pass on all units in this milestone (SCRUTINIZE → GAP FILL → TIE UP)
2. npx tsc --noEmit → 0 errors
3. npx vitest run [affected files] → 0 failures
4. Verify: every engine WIRED + CALLED + RESULT USED (/trace)
5. Verify: tribal tips + playbook consulted for every decision
6. Verify: no inline constants (enforcement hook checks)
7. /compact (save 4-loop results + what's next)
8. START NEW SESSION: /startup → /handoff read → /roadmap-quality-check → continue
```

### MILL-MS7: Physics & Science Hardening
**Priority: HIGH | Units: 10 | Depends on: MILL-MS0**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | **KienzleForceModel with ChipThinningCompensation** — in milling, actual chip thickness h = fz x sin(engagement_angle). At low ae/D ratios, h << fz → must increase fz to maintain minimum chip thickness. Compensated fz = fz_nominal x (D / (2 x ae)) for ae < D/2 |
| U02 | **Ball-end effective diameter** — D_eff = 2 x sqrt(ap x (D - ap)). At shallow ap, effective cutting diameter shrinks dramatically → SFM drops → must increase RPM. Auto-calculate RPM = (Vc x 1000) / (pi x D_eff) |
| U03 | **StabilityLobeDiagram (multi-tooth milling)** — unlike 1-DOF turning, milling SLD depends on number of teeth, radial engagement, helix angle. Time-varying directional factors (Budak & Altintas 1998). Auto-identify stable pockets between lobes |
| U04 | **Corner deceleration dynamics** — at direction changes, machine axes decelerate from programmed feed to near-zero. Actual feed at corners = f(jerk_limit, accel_limit, corner_angle). Chip load drops → rubbing. Auto-insert corner feed override or arc transition |
| U05 | **Process damping for hard milling** — at low Vc (hard milling HRC 45-65), tool flank contact with machined surface provides damping that stabilizes cut below conventional SLD limit. Model: Fd = Cd x Vc x (vibration_amplitude / wavelength). Enables deeper DOC at low speed |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | **Helical interpolation forces** — during helical bore milling, effective cutting diameter changes along the helix. Entry angle varies continuously. Force model must integrate around helix, not use single-point approximation |
| U07 | **Plunge milling forces** — forces primarily axial (into spindle), radial forces minimal. Spindle thrust bearing is the limit, not radial stiffness. Preferred for long-reach deep cavity roughing where radial deflection would be excessive |
| U08 | Thin wall deflection — wall thickness < 3mm: cutting force deflects wall → thickness error + chatter. Auto-reduce DOC, alternate sides, leave finishing stock. Model: delta = F x L^3 / (3 x E x I_wall) |
| U09 | Tool runout effect on chip load — with runout TIR, one flute takes (fz + TIR) while opposite takes (fz - TIR). Surface finish degrades by factor (1 + TIR/fz). At high TIR, effective single-flute cutting |
| U10 | Tests: chip thinning correction, D_eff RPM calc, SLD validation, corner feed, process damping, helical force, plunge force, thin wall, runout — 15 physics scenarios |


**SESSION BOUNDARY — MANDATORY:**
```
1. Final 4-LOOP pass on all units in this milestone (SCRUTINIZE → GAP FILL → TIE UP)
2. npx tsc --noEmit → 0 errors
3. npx vitest run [affected files] → 0 failures
4. Verify: every engine WIRED + CALLED + RESULT USED (/trace)
5. Verify: tribal tips + playbook consulted for every decision
6. Verify: no inline constants (enforcement hook checks)
7. /compact (save 4-loop results + what's next)
8. START NEW SESSION: /startup → /handoff read → /roadmap-quality-check → continue
```

### MILL-MS8: Exhaustive Testing & Production Validation
**Priority: CRITICAL | Units: 25 | Depends on: ALL**

**Apply: `/smart /forge-triple` at session start for this milestone**


#### Tier 1 — Simple (every shop, every day) — 3 units
| Unit | Description |
|------|-------------|
| U01 | **P1: Flat plate with 6 bolt holes** (6061-T6 Al, 150x100x25mm) — G83 peck drill x6 + G1 face mill entire top. THE simplest milling job. Validate: hole positions match bolt circle, face mill stepover correct, G98 retract between holes |
| U02 | **P2: Rectangular pocket 30x50x15mm** (1045 steel, 100x80x30mm plate) — pocket clearing zigzag + G83 drill x4 + G84 rigid tap M8x1.25 x4. Validate: pocket boundary coords match dims, helical entry, multi-depth passes, tap depth = thread depth + 2 pitch |
| U03 | **P3: Simple contour bracket with 4 holes** (304 SS, 120x80x20mm) — G41 closed contour with lead-in arc + 4x drill. Validate: contour XY matches profile dims, lead-in tangent to first element, G40 after lead-out, SS-specific feeds (50% of steel) |

#### Tier 2 — Standard production — 3 units
| Unit | Description |
|------|-------------|
| U04 | **P4: Multi-pocket plate** (7075-T6 Al, 200x150x40mm) — 3 pockets (rect 60x40x20, rect 80x30x25, circular dia50x15) + 12 holes (4x M6 tap, 4x M8 tap, 4x dia10 ream) + full face mill. Tool consolidation test: minimize tool changes, group by tool |
| U05 | **P5: Valve block** (4140 pre-hard 28HRC, 150x100x80mm) — 6 tool types: spot drill, twist drill, reamer H7, form tap M10, counterbore dia18x8, countersink 90deg. Validate: each hole type uses correct canned cycle, proper tool sequence |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | **P6: Bracket with contour + pocket + chamfer** (316L SS, 180x120x30mm) — OD contour G41 + internal pocket + 0.5mm 45deg chamfer all edges. Gummy material: validate reduced Vc (25% below 304), increased chip load, climb-only, no dwell |

#### Tier 3 — Complex job shop — 3 units
| Unit | Description |
|------|-------------|
| U07 | **P7: Deep pocket plate** (7075-T6 Al, 200x150x70mm) — 60mm deep pocket, 2mm thin walls, internal boss (island 30x20mm). Validate: rest machining (25mm rough → 12mm semi → 6mm finish), thin wall reduced DOC, island contour before pocket clear, alternating-side wall finish |
| U08 | **P8: Multi-setup fixture body** (4140 28HRC, 150x100x100mm) — 4 setups: Op1 top face+pockets, Op2 flip bottom pockets, Op3 side drill/tap, Op4 opposite side contour. Validate: datum chain A→B→C transfer, stock-left tracking per setup, WCS G54/G55/G56/G57 assignment |
| U09 | **P9: Gear blank** (8620 steel, dia120x40mm) — H7 bore dia50mm (drill→rough bore→finish bore), 6x bolt circle dia90 M10 tapped, 8mm keyway slot, face both sides. Validate: bore tolerance ±0.012mm achievable with boring head, keyway width = cutter width, bolt circle angular positions |

#### Tier 4 — Advanced — 3 units
| Unit | Description |
|------|-------------|
| U10 | **P10: Hydraulic manifold** (6061-T6 Al, 200x150x120mm) — 8 cross-drilled ports (L/D = 10, through-coolant carbide drill), O-ring grooves (groove mill), thread bosses M22x1.5 (thread mill helical). Validate: deep hole drill with peck, multi-setup (min 3 setups for cross-drilling), thread mill helix pitch = thread pitch |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U11 | **P11: Precision optical mount** (Invar 36, 100x80x30mm) — flatness ±0.005mm (spring passes, stress-relief between rough/finish), bore ±0.01mm (boring head micro-adjust). Validate: exotic material Vc (Invar = ~30 m/min), reduced feed for flatness, boring head spring pass, thermal stability note |
| U12 | **P12: Hard milling die insert** (D2 62HRC, 150x100x60mm) — 3D contour ball-end finish, thin ribs 1.5mm x 50mm deep, rest machining in corners. Validate: CBN/ceramic at Vc 150-300 m/min, per-depth S/F (deeper = more deflection = lower feed), scallop height from stepover, HSM G05.1/CYCLE832 |

#### Tier 5 — Extreme — 3 units
| Unit | Description |
|------|-------------|
| U13 | **P13: Ti-6Al-4V aerospace structural rib** (350x200x50mm) — 10 pockets (varying depth 15-45mm), 2mm thin walls, ±0.025mm profile tolerance. Validate: trochoidal milling ae = 10% D, Vc = 45-65 m/min, thermal compensation note, flood coolant mandatory, multi-setup (2 setups min), high-pressure coolant callout |
| U14 | **P14: Injection mold cavity** (P20 30HRC, 300x250x80mm) — complex 3D cavity surface, thin ribs 1mm x 40mm deep, 3deg draft angles on all walls. Validate: Z-level rough → rest machining → pencil trace (rib roots) → ball-end finish, scallop height < 0.01mm, electrode pocket for EDM areas where mill can't reach |
| U15 | **P15: Inconel aerospace housing** (Inconel 718 aged 40HRC, 200x150x100mm) — deep pockets 80mm + precision bores H7 + M16 thread mill x8. Validate: ceramic roughing Vc 200-800 m/min, carbide finishing Vc 20-40 m/min, per-tool Vc/fz (rough vs finish differ 10x), extreme tool life tracking (ceramic = 5 min at Vc 500) |

#### Tier 6 — Industry maximum — 3 units
| Unit | Description |
|------|-------------|
| U16 | **P16: Complete die/mold set** (core P20 + cavity H13 52HRC + 2 slides S7, 4 components) — multi-component routing, different material per component, electrode extraction for EDM, assembly clearance check. Validate: 4 separate programs, material-specific S/F per component, process routing (rough all → heat treat cavity → hard-finish cavity → assemble) |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U17 | **P17: Full hydraulic manifold** (6061-T6 Al, 300x200x200mm, 20+ ports) — gun-drilled passages L/D = 20, intersecting cross-holes, pressure test plug threads, surface finish Ra 0.8 on seal faces. Validate: gun drill cycle, 6-setup minimum (all 6 faces), port intersection deburr, thread mill all ports, maximum multi-setup complexity |
| U18 | **P18: Aerospace wing rib** (7050-T7451 Al, 800x300x80mm, 85% material removal) — thin web 1.2mm, deep pockets 75mm, stiffening ribs 1.5mm thick. Validate: gantry machine selection (travel > 800mm), extreme MRR (Al rough: 500+ cm3/min), adaptive/trochoidal for thin web, vacuum + side clamp workholding, multi-pass web thinning (never full-depth on thin web) |

#### Cross-validation — 7 units
| Unit | Description |
|------|-------------|
| U19 | **Cross-material**: P2 (pocket) in 6061-T6 Al, 4140 steel, 304 SS — verify Vc/fz/ap change correctly per material. P7 (deep pocket) in 7075 Al and Ti-6Al-4V — verify strategy change (zigzag Al → trochoidal Ti) |
| U20 | **Cross-machine**: P4 (multi-pocket plate) on Haas VF-2, Brother S300X2, DMG CMX 600V, Mazak VCN-530C, Makino a51nx, Kern Micro HD — verify travel limits, RPM limits, power limits per machine. 6 programs, line-by-line parameter diff |
| U21 | **Cross-controller**: P5 (valve block) on Fanuc 0i-MF, Haas NGC, Siemens 840D sl, Heidenhain TNC640, Mazak SmoothG, Okuma OSP-P300 — verify canned cycle syntax (G83 vs CYCLE83 vs CYCL DEF 200), zero cross-contamination between dialects |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U22 | **Coordinate validation**: EVERY test part — parse output G-code, extract all XYZ coordinates, verify against input feature dimensions. Pocket at X=50 Y=30 must produce G1 moves within pocket boundary. Hole at X=75 Y=45 must produce drill at X75. Y45. Zero tolerance for X0 Y0 stub coordinates |
| U23 | **Physics validation**: EVERY test part — verify cutting force within machine power, Ra prediction within target, tool life prediction > 1 part minimum. Per-block S/F check: F must change at corners (chip thinning), S must change for ball-end (D_eff), no constant S/F across entire program |
| U24 | **Reference comparison**: P1, P2, P4 — compare PRISM output to hand-written reference programs from Haas/Fanuc training manuals. Diff analysis: cycle time within 20%, tool sequence matches, safety moves present |
| U25 | **Regression CI/CD**: single `npm test` command runs ALL milling tests, zero tolerance for failure, <60s total execution time. Test count target: 300+ individual assertions across all 18 parts x machines x controllers |


**SESSION BOUNDARY — MANDATORY:**
```
1. Final 4-LOOP pass on all units in this milestone (SCRUTINIZE → GAP FILL → TIE UP)
2. npx tsc --noEmit → 0 errors
3. npx vitest run [affected files] → 0 failures
4. Verify: every engine WIRED + CALLED + RESULT USED (/trace)
5. Verify: tribal tips + playbook consulted for every decision
6. Verify: no inline constants (enforcement hook checks)
7. /compact (save 4-loop results + what's next)
8. START NEW SESSION: /startup → /handoff read → /roadmap-quality-check → continue
```

### MILL-MS9: Parametric & Macro Programming
**Priority: HIGH | Units: 6 | Depends on: MILL-MS0.5**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Parametric part families — #variables for pocket L/W/D, hole patterns, contour offsets. One program → many sizes |
| U02 | Fanuc Macro B output — IF/GOTO, WHILE/DO/END, G65 macro call, #100-#199 local vars, #500+ persistent |
| U03 | Haas macro output — same Fanuc base + M97 local sub, Setting 9000+ unlock, #10000+ system vars |
| U04 | Multi-fixture loop — G54→G55→G56→...→G59+G54.1 P1-P48 with M98 subprogram. Part counter, tool life counter |
| U05 | Bolt circle / pattern macros — polar array, rectangular grid, irregular pattern from table. Calculate positions at runtime |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Tests: pocket family in 4 sizes + bolt circle in 3 patterns, verify parametric output on 2 controllers |

---

## TEST MATRIX

### Parts (18):
| ID | Part | Material | Size | Key Features |
|----|------|----------|------|--------------|
| P1 | Flat plate + bolt holes | 6061-T6 | 150x100x25mm | Face + 6x drill |
| P2 | Rectangular pocket | 1045 | 100x80x30mm | Pocket 30x50x15 + drill + tap |
| P3 | Contour bracket | 304 SS | 120x80x20mm | Closed contour G41 + 4x drill |
| P4 | Multi-pocket plate | 7075-T6 | 200x150x40mm | 3 pockets + 12 holes + face |
| P5 | Valve block | 4140 28HRC | 150x100x80mm | 6 tool types, mixed holes |
| P6 | Contour+pocket+chamfer bracket | 316L SS | 180x120x30mm | Mixed features, gummy material |
| P7 | Deep pocket + thin wall + island | 7075-T6 | 200x150x70mm | 60mm deep, 2mm wall, rest machining |
| P8 | Multi-setup fixture body | 4140 28HRC | 150x100x100mm | 4 setups, datum chain |
| P9 | Gear blank | 8620 | dia120x40mm | H7 bore + bolt circle + keyway |
| P10 | Hydraulic manifold | 6061-T6 | 200x150x120mm | 8 cross-drilled ports L/D=10, thread mill |
| P11 | Precision optical mount | Invar 36 | 100x80x30mm | ±0.005mm flatness, exotic material |
| P12 | Hard milling die insert | D2 62HRC | 150x100x60mm | 3D ball-end, thin ribs, HSM |
| P13 | Aerospace structural rib | Ti-6Al-4V | 350x200x50mm | 10 pockets, trochoidal, ±0.025mm |
| P14 | Injection mold cavity | P20 30HRC | 300x250x80mm | 3D surface, 1mm ribs, draft angles |
| P15 | Inconel aerospace housing | Inconel 718 40HRC | 200x150x100mm | Ceramic rough, deep pockets, threads |
| P16 | Die/mold set (4 components) | P20/H13/S7 | Various | Multi-component, multi-process |
| P17 | Full hydraulic manifold | 6061-T6 | 300x200x200mm | 20+ ports, gun drill L/D=20, 6 setups |
| P18 | Aerospace wing rib | 7050-T7451 | 800x300x80mm | 85% removal, 1.2mm web, gantry machine |

### Machines (6):
| ID | Machine | Controller | Taper | RPM | HP | Travel X/Y/Z |
|----|---------|-----------|-------|-----|-----|--------------|
| M1 | Haas VF-2 | Haas NGC | CAT40 | 8,100 | 30 | 762x406x508mm |
| M2 | Brother S300X2 | Brother CNC-C00 | BT30 | 16,000 | 11 | 584x406x305mm |
| M3 | DMG MORI CMX 600V | Siemens 840D sl | HSK-A63 | 12,000 | 25 | 584x510x510mm |
| M4 | Mazak VCN-530C | SmoothG | CAT40 | 12,000 | 30 | 1,050x530x510mm |
| M5 | Makino a51nx (HMC) | Fanuc 31i-B5 | HSK-A63 | 14,000 | 40 | 560x560x560mm |
| M6 | Kern Micro HD | Heidenhain TNC640 | HSK-E40 | 50,000 | 8 | 300x250x250mm |

### Compatibility (Y=can run, X=cannot):
| Part | M1 | M2 | M3 | M4 | M5 | M6 |
|------|:--:|:--:|:--:|:--:|:--:|:--:|
| P1-P3 | Y | Y | Y | Y | Y | Y |
| P4-P6 | Y | Y | Y | Y | Y | Y |
| P7 | Y | Y | Y | Y | Y | X |
| P8 | Y | X | Y | Y | Y | X |
| P9 | Y | Y | Y | Y | Y | Y |
| P10 | Y | X | Y | Y | Y | X |
| P11 | Y | Y | Y | Y | Y | Y |
| P12 | Y | X | Y | Y | Y | Y* |
| P13 | Y | X | Y | Y | Y | X |
| P14 | Y | X | Y | Y | Y | X |
| P15 | Y | X | Y | Y | Y | X |
| P16 | Y | X | Y | Y | Y | X |
| P17 | X | X | X | Y | Y | X |
| P18 | X | X | X | Y | X | X |
**Y* = Kern for micro-finish pass only, roughing on larger machine**
**Total valid programs: ~72**

---

## EXECUTION ORDER

```
Phase 1: MILL-MS0 (collision) → MILL-MS0.5 (dialect fix)     [15 units, SAFETY + ARCHITECTURE]
Phase 2: MILL-MS7 + MILL-MS9 (parallel)                       [16 units, PHYSICS + PARAMETRIC]
Phase 3: MILL-MS1 + MILL-MS2 + MILL-MS3 (parallel)            [30 units, MACHINES + TOOLS + WORKHOLDING]
Phase 4: MILL-MS4 (pipeline + real toolpaths)                  [20 units, REAL GEOMETRY + TOOLPATHS]
Phase 5: MILL-MS5 + MILL-MS6 (parallel)                        [12 units, OPTIMIZATION + CONTROLLERS]
Phase 6: MILL-MS8 (exhaustive validation)                      [25 units, TESTING]
```

## MILLING-SPECIFIC PHYSICS MODELS (Named)

| Model | Formula / Description | Where Used |
|-------|----------------------|------------|
| **KienzleForceModel + ChipThinningCompensation** | h_actual = fz x sin(phi_e). Compensated fz = fz_nom x D/(2xae) when ae < D/2 | MS7-U01, all roughing |
| **Ball-End Effective Diameter** | D_eff = 2 x sqrt(ap x (D - ap)). RPM = Vc x 1000 / (pi x D_eff) | MS7-U02, 3D surfacing |
| **StabilityLobeDiagram (Multi-Tooth)** | Budak & Altintas 1998. Time-varying directional factors, N teeth, ae/D dependent | MS7-U03, all milling |
| **CornerDecelerationDynamics** | f_corner = f(jerk, accel, angle). Chip load collapse at direction change | MS7-U04, contouring |
| **ProcessDamping (Hard Milling)** | Fd = Cd x Vc x (A/lambda). Stabilizes below SLD at low Vc | MS7-U05, HRC 45-65 |
| **HelicalInterpolationForces** | Integrated force around helix, variable engagement angle | MS7-U06, bore milling |
| **PlungeMillingForces** | Primarily axial, spindle thrust limit. Preferred for L/D > 4 | MS7-U07, deep cavities |
| **ThinWallDeflection** | delta = F x L^3 / (3 x E x I_wall). Auto-reduce DOC for t < 3mm | MS7-U08, thin features |

## UNIT COUNT SUMMARY

| Milestone | v1.0 | v2.0 | Delta |
|-----------|------|------|-------|
| MILL-MS0 | 10 | 10 | +0 |
| MILL-MS0.5 | 5 | 5 | +0 |
| MILL-MS1 | 7 | 7 | +0 |
| MILL-MS2 | 10 | **15** | **+5** |
| MILL-MS3 | 8 | 8 | +0 |
| MILL-MS4 | 8 | **20** | **+12** |
| MILL-MS5 | 5 | 5 | +0 |
| MILL-MS6 | 7 | 7 | +0 |
| MILL-MS7 | 10 | 10 | +0 |
| MILL-MS8 | 12 | **25** | **+13** |
| MILL-MS9 | 6 | 6 | +0 |
| **TOTAL** | **88** | **113** | **+25** |

## FINAL TARGET: 300+ tests, 100% pass rate, 113 units across 11 milestones

### MINIMUM TEST BASELINE GATE (Phase 5 prerequisite)
```
MILLING minimum: 50+ dedicated tests before Phase 5 milestones
Current baseline: 0 dedicated milling tests
Gap: 50+ tests needed — speed/feed, toolpath, collision, dialect, cross-material
Validation: match-then-improve against Sandvik/Kennametal published cutting data
  Step 1: Match published S/F within ±10% for reference materials (4140, 6061, 304)
  Step 2: Improve with fusion_tier >= 2 convergence (temperature, deflection, stability)
```

### MACHINE-TYPE SELECTOR REFERENCE
```
Input: part geometry (size, features, tolerances) + material + batch size
Output: ranked machine type recommendation (milling vs 5-axis vs mill-turn vs grinding)
Engine: MachineTypeSelectorEngine (shared across all 8 machine roadmaps)
Milling selection criteria: 2.5D/3D features, ±0.025mm+ tolerance, VMC/HMC envelope
Contra-indicators: rotational symmetry (→ lathe), simultaneous multi-axis (→ 5-axis)
```


---

## MANDATORY SESSION-END PROTOCOL (EVERY SESSION, NO EXCEPTIONS)

### Code Review (after EVERY build)
1. `npx tsc --noEmit` -> 0 errors
2. `/prism-review` -> 3 parallel agents (physics, wiring, test) ALL approve
3. `npx vitest run [affected files]` -> 0 failures
4. IF ANY fail -> FIX before moving to next unit or ending session

### Quality Check (end of EVERY session)
1. `npx tsc --noEmit` -> verify full build
2. `/prism-review` -> final review of ALL changes this session
3. `npx vitest run` -> verify ZERO regressions across full suite
4. `git diff --stat` -> review every file changed
5. Verify: every engine built is WIRED (imported AND called, not just imported)
6. Verify: every wired engine's result is USED in output (not computed and discarded)
7. Verify: physics constants match canonical source (src/physics/constants.ts)
8. Verify: no duplicate force/life/Ra computations (compute ONCE, pass result forward)
9. `/compact` with quality check results in handoff

### Wiring Verification (for every wire unit)
- [ ] Engine file created/exists
- [ ] Exported from index.ts (no duplicate identifiers)
- [ ] Lazy-load follows pattern (require + try/catch + null fallback)
- [ ] Engine method CALLED (not just imported)
- [ ] Result USED in pipeline output (not discarded)
- [ ] Dispatcher action added to z.enum (if needed)
- [ ] Schema created with correct types (if needed)
- [ ] vitest created with >=3 real-data test cases
- [ ] /prism-review passes (all 3 agents)

### Constant Consistency Rule
ALL physics constants (kc1.1, mc, Taylor C/n, etc.) MUST come from:
  src/physics/constants.ts — the ONE canonical source
NO inline constant databases. Import, don't hardcode.
If a constant appears in your engine that differs from canonical -> FIX IT.

### Duplicate Calculation Prevention
Force/life/Ra/power/deflection computed ONCE per operation at Stage 8-9.
Result stored in PhysicsResult object. All downstream stages READ, don't RECOMPUTE.
Adjustments (wear, thermal) are EXPLICIT multipliers on stored values.

See H:/prism/CAMX-CODE-REVIEW-PROTOCOL.md for full details.
See H:/prism/CAMX-ROADMAP-v22-QUALITY-FIXES.md for quality fix requirements.


**SESSION BOUNDARY — MANDATORY:**
```
1. Final 4-LOOP pass on all units in this milestone (SCRUTINIZE → GAP FILL → TIE UP)
2. npx tsc --noEmit → 0 errors
3. npx vitest run [affected files] → 0 failures
4. Verify: every engine WIRED + CALLED + RESULT USED (/trace)
5. Verify: tribal tips + playbook consulted for every decision
6. Verify: no inline constants (enforcement hook checks)
7. /compact (save 4-loop results + what's next)
8. START NEW SESSION: /startup → /handoff read → /roadmap-quality-check → continue
```