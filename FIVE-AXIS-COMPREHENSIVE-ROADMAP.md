# PRISM 5-AXIS COMPREHENSIVE ROADMAP v2.0
## 12 Milestones | 125 Units | 300+ Target Tests

Generated: 2026-03-23
Expanded from v1.0 (80 units) — separated 3+2 vs simultaneous, expanded kinematics/tooling/physics/testing
Current test baseline: 0/0 (no dedicated 5-axis tests exist)

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
ENFORCEMENT HOOKS: Same 7 enforcement hooks as all machine types.
  Key: stub detector, test quality, constants checker, knowledge consult, context retention, wiring gate.

SKILLS: /smart 5-axis CNC programmer + kinematics specialist, /forge-triple, /prism-review,
  /test, /physics-verify, /program-validate, /auto-speed-feed, /spindle-optimize

MASTER KNOWLEDGE SOURCES FOR ALL 5-AXIS SESSIONS:
  ENGINES: MultiAxisPrintToProgramEngine (707L — STUB, needs complete rebuild),
    CollisionPreventionEngine (E1139 — 5-axis swept volume), ControllerDialectEngine (G68.2/CYCLE800)
  TRIBAL TIPS: src/data/hypermill-cam-tips-ext.ts (83 — MAXX 5X strategies),
    src/data/*-cam-tips.ts (5-axis tips across all 18 CAM systems)
  PLAYBOOK: MachiningPlaybookEngine — 5-axis anti-patterns (never rapid with A/B tilted)
  FORMULAS: RTCP/TCP compensation math (Xm = Xt + gauge_length × sin(B) × cos(C)),
    G68.2 tilted work plane (Euler angle to rotation matrix), inverse kinematics
  CONSTANTS: Machine kinematic configs (table-table, head-table, head-head, nutating head)
  REFERENCE: DMG MORI 5-axis application guides, impeller/blisk test geometry
  CATALOGS: Barrel cutter geometry (circle-segment endmills for 5-axis surface finishing)
  KEY PHYSICS: Tool center point (TCP) management, singularity avoidance, lead/tilt angles,
    G93 inverse time feed (required for simultaneous 5-axis)

4-LOOP QUALITY PROTOCOL (MANDATORY for EVERY unit — see LATHE roadmap for full detail):
  LOOP 1 — SCRUTINIZE: /prism-review + /scrutinize → "Is this real?" "Would it run on a real 5-axis?"
  LOOP 2 — GAP FILL: /test + /trace wiring + edge cases + missing knowledge
  LOOP 3 — TIE UP: no TODOs, reasoning[], golden snapshot, MASTER_INDEX updated
  LOOP 4 — VALIDATE: Re-run /prism-review on fixes, findings MUST decrease, full test suite → 0 failures
  ALL 4 LOOPS pass → next unit. /compact every 3 units.

PHYSICS FUSION INTEGRATION (ALL S/F milestones — fusion_tier >= 2 MANDATORY):
  Every speed/feed computation MUST use PhysicsFusionOrchestratorEngine (fusion_tier >= 2).
  Tier 1 (single-pass) NOT acceptable for production — multi-model convergence required.
  Action: physics_fusion via calcDispatcher.
  Outputs: Fc_N, power_kW, temperature_C, deflection_um, Ra_um, stability, confidence.
  Inputs REQUIRED: kc1.1/mc (canonical), tool geometry (D/Z/rake/helix/edge_radius),
    engagement (ap/ae/approach_angle), material (iso_group/hardness), machine limits.
  5-axis specific: TCP compensation affects effective engagement — recalculate ae/ap
    at each tool orientation. Lead/tilt angles change chip thickness geometry.
  See: PhysicsFusionOrchestratorEngine.ts + 5 plugins in src/engines/plugins/

IN-PROCESS PROBING (add to relevant milestones):
  Workpiece probing: Renishaw OMP60/OMP400 for WCS setting in tilted coordinate frames.
  Tool probing: TRS2 or TS27R for tool length after tool change, broken tool detection.
  Tilted-plane probing: probe in rotated WCS (G68.2/CYCLE800/PLANE SPATIAL) for 5-axis WCS.
  On-machine inspection: verify critical features after 5-axis finishing passes.
  TCP verification: probe reference sphere to verify TCP calibration before critical ops.
  Applies to: 5AX-MS1 (TCP compensation), 5AX-MS3 (impeller/blisk), 5AX-MS5 (real parts).
```

## PER-MILESTONE COMPREHENSIVE KNOWLEDGE SOURCES

### 5AX-MS0: Collision Avoidance — Rotary-Aware
```
ENGINES:
  - CollisionEngine (2,526L) — base 3D collision (needs rotary extension)
  - CollisionPreventionEngine (754L) — AABB + narrow-phase
  - AccessibilityAnalysisEngine (689L) — tool reach at rotary angles
  - SafetyVetoEngine (E1098) — 8 hard vetoes
  - ToolAssemblyEngine — tool+holder+spindle collision envelope
  - GCodeSafetyAnalyzerEngine — rapid traverse safety at tilted angles
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — 5-axis collision anti-patterns ("check head tilt vs fixture at EVERY angle")
  - src/data/hypermill-cam-tips-ext.ts — collision avoidance in MAXX 5X strategies
  - src/data/*-cam-tips.ts — 5-axis collision tips across 18 CAM systems
  - controller-knowledge-tips.ts — safe retract behavior with rotary axes engaged
FORMULAS:
  - Rotary swept volume: V_swept = ∫ tool_envelope(A,C) dA dC over angular range
  - Singularity zone: where dC/dt → ∞ (gimbal lock at A=0 for table-table)
  - Head clearance at tilt: clearance = spindle_nose_to_table - tool_length × cos(A) - fixture_height
REFERENCE:
  - DMG MORI 5-axis application guide — collision avoidance procedures
  - Machine kinematic configs from MachineRegistry (topology per machine)
  - ISO 10218 — safety standards for multi-axis machines

INTENT: 5-axis has INFINITE collision possibilities — the spindle head can hit the
  table, fixture, part, OR rotary trunnion at any combination of A/B/C angles. A
  collision at 15,000 RPM with a tilted head destroys the spindle ($80K+). PRISM must
  check EVERY angular position along the toolpath, not just start/end.
```

### 5AX-MS0.5: Dialect — 5-Axis Compensation Codes
```
ENGINES:
  - ControllerDialectEngine (970L) — needs G43.4/TRAORI/M128 extension
  - PostProcessorPipelineEngine (3,139L) — needs 5-axis phase
  - POST-ULT pipeline (17 engines) — per-block optimization for 5-axis
  - FiveAxisPostEngine — skeleton, needs real implementation
TRIBAL KNOWLEDGE:
  - controller-knowledge-tips.ts — 5-axis compensation differences per controller
  - src/data/hypermill-cam-tips-ext.ts — post-processor tips for 5-axis output
  - MachiningPlaybookEngine — "always verify TCPC mode active before simultaneous moves"
FORMULAS:
  - G43.4 (Fanuc TCPC): Xm = Xt + GL × sin(B) × cos(C), Ym = Yt + GL × sin(B) × sin(C)
  - TRAORI (Siemens): TRAORI(1) activates transformation, vector format A3= B3= C3=
  - M128 (Heidenhain): TCPM + PLANE SPATIAL SPA= SPB= SPC= (Euler angles)
  - DWO (Haas): G234/G243 dynamic work offset for tilted planes
REFERENCE:
  - Fanuc 31i 5-axis programming manual — G43.4 TCPC, G68.2 tilted work plane
  - Siemens 840D sl TRAORI manual — transformation orientation
  - Heidenhain iTNC 530/640 — TCPM + PLANE SPATIAL + M128
  - Haas NGC 5-axis manual — DWO, G234/G243
  - Mazak SmoothX — G43.4 + tool vector programming

INTENT: G43.4 on Fanuc, TRAORI on Siemens, M128 on Heidenhain — same concept (tool
  center point control), completely different syntax. Without the RIGHT compensation code,
  the tool tip traces the wrong path. A program that runs perfectly on a DMG MORI (Siemens)
  will CRASH on a Haas (Fanuc-based) if compensation codes aren't translated.
```

### 5AX-MS1: Machine Kinematics Database
```
ENGINES:
  - MachineSelectionEngine — machine selection with kinematics awareness
  - MachineMatcherEngine — feature→machine capability matching
  - MachineStrategyConstraintEngine (E1091) — validate kinematic capability
  - ControllerFeatureMatrixEngine — NURBS/RTCP/HSM capability per controller
  - SpindleTorqueCurveEngine — power at speed (5-axis often at lower RPM due to tilts)
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — kinematic topology selection rules
  - controller-knowledge-tips.ts — axis naming conventions (A/B/C vary by manufacturer)
  - src/data/*-cam-tips.ts — machine-specific 5-axis tips
  - Academy courses — 5-axis machine fundamentals
FORMULAS:
  - Forward kinematics: given joint angles (A,C) → compute TCP position in work coordinates
  - Inverse kinematics: given desired TCP + tool vector → compute required (A,C) angles
  - Topology models: table-table (A/C), head-table (B/C), head-head (A/B), nutating (off-axis)
  - Singularity: det(J) = 0 at specific angle combinations per topology
  - Work envelope: accessible volume = f(travel_limits, axis_ranges, tool_length)
REFERENCE:
  - MachineRegistry — 910 machines (filter to 5-axis: DMG MORI, Hermle, Makino, Matsuura, etc.)
  - Machine kinematic data sheets from manufacturers
  - Altintas "Manufacturing Automation" Ch.9 — 5-axis kinematics
  - DMG MORI DMU/CMX/NMV specs, Hermle C-series specs, Makino a-series specs

INTENT: A table-table machine (A/C trunnion) has DIFFERENT singularity zones than a
  head-table (B/C swivel). The IK solution for the same tool vector differs. The work
  envelope changes with tool length. PRISM must model each machine's ACTUAL kinematics
  to generate correct G-code — not assume a generic 5-axis configuration.
```

### 5AX-MS2: 5-Axis Tooling — Barrel, Lollipop, Tapered Ball, Lens, Reach
```
ENGINES:
  - SmartToolSelectorEngine — needs barrel/lollipop/lens filter
  - ToolCatalogEngine — 95K tools, 5-axis types need classification
  - ToolGeometrySelectionEngine — geometry optimization for 5-axis
  - ToolDeflectionPredictionEngine — deflection at tilted engagement
  - ToolAssemblyEngine — assembly modeling for collision envelope
  - InsertGradeSelectionEngine — coating for 5-axis operations (often hard materials)
TRIBAL KNOWLEDGE:
  - src/data/hypermill-cam-tips-ext.ts — barrel cutter tips for MAXX Finishing
  - MachiningPlaybookEngine — "barrel cutter requires 5-axis simultaneous, NOT 3+2"
  - Sandvik circle-segment endmill application tips
  - src/data/*-cam-tips.ts — 5-axis tooling tips across 18 CAM systems
FORMULAS:
  - Barrel cutter scallop: h = R² × sin²(α) / (8 × Rb) where Rb = barrel radius
  - Circle-segment effective radius: Reff = R_segment (100-1000mm vs 5mm ball-nose)
  - Scallop height ratio: h_barrel/h_ball = R_ball/R_barrel (10-200× improvement)
  - Reach tool deflection: δ = F × L³/(3EI) with reduced shank (taper compensates)
REFERENCE:
  - Sandvik CoroMill barrel cutter catalog — geometry, recommended parameters
  - Emuge-Franken circle-segment endmill data
  - Kennametal 5-axis tool selection guide
  - hyperMILL MAXX Finishing documentation (barrel cutter strategy)

INTENT: A barrel cutter with 250mm effective radius produces the SAME scallop height as
  a ball-nose at 50× wider stepover. That means 50× fewer passes = 50× faster finishing.
  But barrel cutters REQUIRE simultaneous 5-axis and precise tool geometry data. PRISM must
  select the right 5-axis tool type and compute engagement geometry correctly.
```

### 5AX-MS3: 5-Axis Workholding — Tombstone, Vacuum, Zero-Point
```
ENGINES:
  - WorkholdingEngine — core workholding intelligence
  - WorkholdingIntelligenceEngine — advanced analysis
  - TombstoneLayoutEngine — tombstone face assignment for HMC
  - ModularFixtureLayoutEngine — modular fixture (Jergens, Schunk, Lang)
  - WorkholdingVerificationEngine (E1148) — grip force check
  - MultiSetupPlannerEngine — multi-setup orientation
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — 5-axis workholding rules ("vacuum chucks for thin plates only")
  - src/data/*-cam-tips.ts — 5-axis fixturing tips
  - tribal tips: "zero-point system = fastest setup change" "5th axis access requires dovetail or soft jaws"
FORMULAS:
  - Vacuum force: F = P_vacuum × A_contact × η (η = seal efficiency 0.6-0.9)
  - Zero-point repeatability: ±0.002mm (Erowa/3R/Schunk VERO-S)
  - Tombstone: 4-face utilization = parts_per_face × 4 / total_parts_needed
  - Grip accessibility: 5-axis needs 5 faces accessible = clamp from BOTTOM or single face
REFERENCE:
  - Schunk VERO-S zero-point system specifications
  - Erowa/3R pallet system data
  - Lang Makro-Grip dovetail vise specifications
  - Jergens Ball Lock mounting system data

INTENT: 5-axis needs 5 faces accessible — you can't clamp from the side you're machining.
  Zero-point systems (Schunk VERO-S, Erowa) provide ±0.002mm repeatability with instant
  pallet swap. Vacuum chucks work for thin plates but can't hold against side loads.
  PRISM must recommend the RIGHT workholding for 5-axis accessibility requirements.
```

### 5AX-MS4A: 3+2 Indexed Programming
```
ENGINES:
  - MultiAxisPrintToProgramEngine (707L — STUB, complete rebuild needed)
  - ControllerDialectEngine — G68.2 (Fanuc), CYCLE800 (Siemens), PLANE SPATIAL (Heidenhain)
  - OptimalStrategySelectionEngine (E1087) — strategy with indexed angle selection
  - FeatureRecognitionEngine — detect features at angles (angled holes, faces, pockets)
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "use 3+2 for holes/pockets/faces, simultaneous only for freeform"
  - src/data/hypermill-cam-tips-ext.ts — 3+2 strategy tips
  - src/data/*-cam-tips.ts — indexed programming tips across 18 CAM systems
  - controller-knowledge-tips.ts — G68.2 vs CYCLE800 quirks
FORMULAS:
  - Tilted work plane: rotation matrix from Euler angles (A,B,C) → new XYZ frame
  - G68.2 P1 (3-point): define plane from 3 points on surface
  - G68.2 P2 (projection): project axis onto plane
  - G68.2 P3/P4 (Euler/RPY): A,B,C angles directly
  - Feature angle detection: normal vector of feature face → required A/B/C tilt
REFERENCE:
  - Fanuc 31i G68.2 programming manual (P1-P4 modes)
  - Siemens 840D CYCLE800 swivel data manual
  - Heidenhain PLANE SPATIAL / PLANE RELAT / PLANE VECTOR documentation
  - Haas DWO (Dynamic Work Offset) documentation
  - Academy courses — 3+2 programming fundamentals

INTENT: 80% of "5-axis work" is actually 3+2 — tilt to an angle, lock rotary axes, machine
  as 3-axis in the tilted frame. Holes at 30° are 3+2, not simultaneous. Pockets on angled
  faces are 3+2. PRISM must auto-detect which features need indexed vs simultaneous, generate
  G68.2/CYCLE800/PLANE SPATIAL with correct angles, then machine in the tilted XYZ frame.
```

### 5AX-MS4B: Full Simultaneous 5-Axis
```
ENGINES:
  - MultiAxisPrintToProgramEngine — needs CutterContactEngine + ToolAxisOptimization
  - AdaptiveToolpathRouterEngine (35 algos) — 5-axis algorithm selection
  - ProductionToolpathEngine — polygon offset adapted for 5-axis
  - InstantaneousEngagementEngine — engagement at varying tool axis orientation
  - StabilityRPMRewriterEngine — chatter at varying engagement
TRIBAL KNOWLEDGE:
  - src/data/hypermill-cam-tips-ext.ts — MAXX strategies for simultaneous 5-axis
  - MachiningPlaybookEngine — "smooth AB transitions critical — no sudden axis reversals"
  - tribal tips: "lead/tilt angle 3-5° for finishing" "lag angle for chip evacuation"
  - src/data/*-cam-tips.ts — simultaneous 5-axis tips across 18 CAM systems
FORMULAS:
  - Cutter contact (CC) point: point on surface where tool touches
  - Cutter location (CL) point: CC + tool_radius × surface_normal + gauge_length × tool_axis
  - Tool axis optimization: minimize angular velocity while maintaining gouge-free contact
  - Quaternion SLERP: smooth interpolation between tool orientations
  - Inverse kinematics: CL + tool_axis → machine joint angles (A/C or B/C)
  - Lead angle: tool tilted FORWARD in feed direction (3-5° typical)
  - Tilt angle: tool tilted SIDEWAYS perpendicular to feed (for clearance)
REFERENCE:
  - Altintas "Manufacturing Automation" Ch.9 — CC/CL computation, tool axis optimization
  - STEP-NC standard — CL data format for multi-axis
  - Impeller/blisk test geometry standards
  - Published swarf cutting theory (ruled surface machining)

INTENT: Simultaneous 5-axis = tool axis changes continuously. Used for impellers, turbine
  blades, mold cavities, aerospace structures with compound curves. The CC/CL computation
  must be mathematically correct — a 0.1° error in tool axis = 0.05mm gouge on the surface.
  Quaternion SLERP ensures smooth transitions (no sudden axis jerks that cause vibration).
```

### 5AX-MS5: G93 Inverse Time Feed + NURBS
```
ENGINES:
  - PostProcessorPipelineEngine — needs G93 conversion module
  - LineByLineAdaptiveEngine — per-block feed in inverse time
  - ControllerDialectEngine — G93 vs G94 switching per controller
  - MotionControllerInjectionEngine — NURBS injection where supported
TRIBAL KNOWLEDGE:
  - controller-knowledge-tips.ts — G93 behavior differences (Fanuc: F=1/min, Siemens: FLIN)
  - MachiningPlaybookEngine — "always switch back to G94 after simultaneous section"
  - src/data/*-cam-tips.ts — inverse time feed tips
FORMULAS:
  - G93 inverse time: F = 1/T where T = time_for_block in minutes
  - T = sqrt((ΔX² + ΔY² + ΔZ²) + (R_tool × ΔA)² + (R_tool × ΔC)²) / V_desired
  - NURBS: G06.2 P K X Y Z (Fanuc), BSPLINE (Siemens), BLK FORM 0.2 SPLINE (Heidenhain)
  - Feedrate smoothing: jerk-limited acceleration profile for smooth axis motion
REFERENCE:
  - Fanuc G93 specification and examples
  - Siemens 840D FLIN (feed linear interpolation) documentation
  - Heidenhain NURBS/spline documentation
  - Published G93 calculation examples with verification

INTENT: G94 (mm/min) is MEANINGLESS when rotary axes move — a 1° rotation at the tool tip
  covers a different distance depending on tool length. G93 specifies time-per-block, so
  the controller computes the right axis velocities. Without G93, simultaneous 5-axis feeds
  are WRONG on every controller. NURBS reduces program size by 90%+ for curved paths.
```

### 5AX-MS6: Controller Deep Hardening
```
ENGINES:
  - ControllerDialectEngine — 20 dialects, 5-axis codes per controller
  - ConversationalOutputEngine — Mazatrol 5-axis UNIT format
  - GCodeTranspilerEngine — transpile between 5-axis dialects
  - ProgramStructureEngine — safety blocks with rotary home positions
TRIBAL KNOWLEDGE:
  - controller-knowledge-tips.ts — ALL controller-specific 5-axis tips
  - MachiningPlaybookEngine — controller quirk rules for 5-axis
  - src/data/*-cam-tips.ts — controller-specific 5-axis tips across 18 CAM systems
FORMULAS:
  - G43.4 (Fanuc): H offset + tool vector, TCPC active
  - TRAORI(1) (Siemens): SPOS=, A3=, B3=, C3= vector format
  - M128 (Heidenhain): TCPM active, PLANE SPATIAL SPA= SPB= SPC=
  - DWO (Haas): G234 on, G243 off, tool center point compensation
  - G43.4 (Mazak): SmoothX implementation, tool vector
  - G43.5 (Okuma): Okuma-specific TCPC variant
REFERENCE:
  - Fanuc 31i 5-axis manual, Siemens 840D TRAORI manual
  - Heidenhain iTNC 640 5-axis manual, Haas NGC 5-axis supplement
  - Mazak SmoothX 5-axis programming guide, Okuma OSP 5-axis guide
  - DMG MORI programming examples for each controller type

INTENT: Same impeller program, 6 different controllers. G43.4 + G68.2 (Fanuc) vs TRAORI +
  CYCLE800 (Siemens) vs M128 + PLANE SPATIAL (Heidenhain) vs DWO (Haas). Every compensation
  mode, every angular format, every safety block must be controller-correct. The Heidenhain
  doesn't even use G-codes for 5-axis — it uses plain-text commands.
```

### 5AX-MS7: Physics — Effective Diameter, Scallop, Singularity, RCSA, Forces
```
ENGINES:
  - KienzleForceModelEngine — force at tilted engagement (effective diameter changes)
  - ChatterStabilityLobeEngine — SLD at varying tool axis orientation
  - StochasticChatterEngine — MC stability for 5-axis (200 samples)
  - ToolDeflectionPredictionEngine — deflection at angled engagement
  - SurfaceFinishPredictorEngine — scallop height from ball/barrel at lead/tilt
  - ToolpathThermalEngine — thermal at varying engagement
  - ProcessCapabilityPredictionEngine — Cpk for 5-axis tolerance
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "5-axis force increases at steep lead angles"
  - src/data/hypermill-cam-tips-ext.ts — physics tips for 5-axis strategies
  - tribal tips: "effective cutting diameter changes with tilt — recalculate RPM"
FORMULAS:
  - Effective diameter: D_eff = D × sin(90° - tilt) for ball-nose (changes RPM requirement)
  - Scallop height: h = ae²/(8×R) for ball-nose, h = ae²/(8×R_barrel) for barrel
  - RPM correction: N = 1000 × Vc / (π × D_eff) — NOT N = 1000 × Vc / (π × D_nominal)
  - Singularity velocity: ω_C = v_tool / (R_part × sin(A)) → ∞ as A → 0
  - RCSA for 5-axis: assembly dynamics change with tilt angle (different mode shapes)
  - Cutter-workpiece engagement at tilt: ae_eff = f(tilt, lead, radial_depth)
REFERENCE:
  - Altintas "Manufacturing Automation" Ch.9 — 5-axis dynamics
  - Published effective diameter research — ball-nose, barrel, tapered ball
  - src/physics/constants.ts — canonical force constants
  - FormulaRegistry — 5-axis specific formulas

INTENT: At 30° tilt, a 10mm ball-nose has D_eff = 5mm, not 10mm. That means RPM should
  be 2× higher to maintain the same Vc. Without this correction, the surface speed is HALF
  of what it should be = poor surface finish. Singularity zones cause C-axis to spin
  infinitely fast = machine alarm or axis following error. PRISM must handle ALL of this.
```

### 5AX-MS8: Exhaustive Testing — Industry Parts × Machines × Controllers
```
ENGINES:
  - ALL 5-axis pipeline engines — full end-to-end testing
  - CNCSimulationPipelineEngine — material removal simulation with kinematics
  - BackplotEngine — fast 5-axis toolpath verification
  - ProcessCapabilityPredictionEngine — Cpk for 5-axis tolerances
TRIBAL KNOWLEDGE:
  - ALL tip sources — validate tips produce correct 5-axis outcomes
  - MachiningPlaybookEngine — rules validated against 5-axis reference programs
FORMULAS:
  - ALL 5-axis formulas — verified against published examples
  - Cross-machine: same part on table-table vs head-table → different G-code, same result
  - Cross-controller: same part on Fanuc vs Siemens vs Heidenhain → different syntax
REFERENCE:
  - Impeller test geometry (published, known correct tool paths)
  - NAS 979 5-axis test specimen (cone frustum, known dimensions)
  - DMG MORI 5-axis demo parts with reference programs
  - Aerospace bracket (5-face access, angled holes, pockets on compound surfaces)
  - Mold cavity (deep, drafted walls, freeform parting surface)
  - Golden snapshots from MS0-MS7 — regression anchors
  - Cross-controller assertion library (from Phase 0-C)
  - EXTERNAL-REFERENCE-PROGRAMS-INDEX.md — 5-axis reference sources

INTENT: The ultimate test: real impeller geometry → PRISM generates simultaneous 5-axis
  G-code → program runs on 3 different controller types → surface matches CAD within
  tolerance. Every AB angle verified. Every G93 feed verified. Every compensation code
  controller-correct. After MS8, PRISM generates correct 5-axis programs for industry
  standard test parts across multiple machine kinematics and controllers.
```

---

## CURRENT STATE (What's Built)

### Engines (existing):
| Engine | Lines | Status |
|--------|-------|--------|
| MultiAxisPrintToProgramEngine | 707 | STUB — single interpolated point + placeholder |
| PipelineDecisionOrchestratorEngine | — | Universal 5-axis decision wrapper (E1080) |
| FiveAxisPostEngine | — | 5-axis specific post (skeleton) |
| CollisionEngine | 2,526 | 3D collision detection (milling-focused, no 5-axis kinematics) |
| CollisionPreventionEngine | — | AABB+cylinder pre-flight (E1139, no rotary axis awareness) |
| PostProcessorPipelineEngine | 3,139 | 35+ stages, 20 dialects — but NO G43.4/TRAORI/M128 |
| ControllerDialectEngine | 970 | 20 dialects — 5-axis codes NOT implemented |
| ControllerStrategyValidatorEngine | — | NURBS/HSM/RTCP validation (E1090, exists) |
| MachineStrategyConstraintEngine | — | RPM/power/accel/jerk validation (E1091, exists) |
| SmartToolSelectorEngine | 557 | 95K+ tools — no barrel/lollipop/tapered-ball filtering |
| ToolCatalogEngine | 2,651 | 95,608 tools — 5-axis tool types present but unclassified |
| **TOTAL 5-AXIS-SPECIFIC CODE** | **~707** | **Essentially zero real functionality** |

### What Works:
- NOTHING produces valid 5-axis G-code
- Single interpolated XYZ-AB point is generated (hardcoded ±120° limits)
- No CC-point computation, no tool axis optimization, no SLERP
- No G93 inverse time feed, no NURBS, no machine kinematics model
- No singularity detection or avoidance
- No controller-specific 5-axis compensation (G43.4, TRAORI, M128, DWO)

---

## CRITICAL ARCHITECTURAL ISSUES (Must Fix First)

### Issue 1: Stub Toolpath — No Real Multi-Point Paths
MultiAxisPrintToProgramEngine generates ONE interpolated point. Real 5-axis requires dense CC-point arrays with smooth AB transitions via quaternion SLERP. Without this, the entire pipeline produces unusable output.
**Fix**: 5AX-MS4A/MS4B — CutterContactEngine + ToolAxisOptimizationEngine + multi-point XYZ-AB arrays.

### Issue 2: No Machine Kinematics Model
The engine has hardcoded ±120° axis limits. Real machines have wildly different kinematics: trunnion A/C (table tilts), swivel B/C (head tilts), gantry (head+table), nutating (off-axis tilt). Each has different singularity zones, work envelopes, and IK solutions.
**Fix**: 5AX-MS1 — Machine kinematics database with forward/inverse kinematic solvers per topology.

### Issue 3: No Collision Detection at Rotary Angles
Existing CollisionEngine is 3-axis only. 5-axis collision requires checking head tilt vs table/fixture at EVERY AB angle combination, tool holder clearance at extreme tilts, and singularity zone avoidance where C-axis velocity → infinity.
**Fix**: 5AX-MS0 — 5-axis collision with rotary-aware swept volume.

### Issue 4: No Controller-Specific 5-Axis Compensation
G43.4 (Fanuc TCPC), TRAORI (Siemens), M128/PLANE SPATIAL (Heidenhain), DWO (Haas), G43.4 (Mazak) — each controller implements tool center point control differently. PRISM outputs none of them.
**Fix**: 5AX-MS0.5 — Dialect engine for 5-axis compensation codes.

### Issue 5: No G93 Inverse Time Feed
Simultaneous 5-axis REQUIRES G93 (inverse time) because linear feedrate is meaningless when rotary axes move. Without G93, feeds are wrong on every controller.
**Fix**: 5AX-MS5 — G93 inverse time feed + NURBS where supported.

### Issue 6: No 3+2 vs Simultaneous Separation
The system has no concept of indexed (3+2) programming vs full simultaneous. Many features (holes, pockets, faces at angles) are BETTER done indexed — simpler code, tighter tolerance, no G93 needed. Only freeform surfaces and ruled-surface swarf cuts REQUIRE simultaneous. Mixing them wastes machine capability and increases risk.
**Fix**: 5AX-MS4A (3+2 indexed) and 5AX-MS4B (full simultaneous) as separate milestones with auto-detection.

---

## MILESTONE DETAILS

### 5AX-MS0: Collision Avoidance — Rotary-Aware Full Envelope
**Priority: CRITICAL | Units: 10 | Depends on: nothing**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Head/spindle vs table/fixture collision at EVERY AB angle — discretize AB space into 1° grid, flag no-go zones |
| U02 | Tool holder clearance at extreme tilts — holder protrusion vs part/fixture at A>60° or B>60° |
| U03 | Singularity zone detection — A/C=0° or 180° on trunnion → C-axis velocity → ∞. Auto-exclude ±3° band |
| U04 | Tool shank vs part interference — long reach tools at high tilt angles, swept cylinder check |
| U05 | Fixture/clamp interference mapping — tombstone faces, vise jaws, zero-point risers as collision bodies |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Rapid traverse safe corridors — retract to safe AB before XYZ rapid, re-engage at target AB |
| U07 | Gouging detection — tool bottom radius vs surface curvature, flag when R_tool > R_surface_concavity |
| U08 | Machine travel limit validation — XYZ + AB at every point, flag over-travel before post |
| U09 | Collision visualization data — export AB no-go map as 2D grid for UI overlay |
| U10 | 15 collision test scenarios (head-crash, holder-hit, singularity-trap, gouge, over-travel) |


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

### 5AX-MS0.5: Dialect — 5-Axis Compensation Codes + POST-ULT Pipeline
**Priority: CRITICAL | Units: 5 | Depends on: MS0**

**POST-ULT INTEGRATION:** All G-code from MultiAxisPrintToProgramEngine MUST route through
PostProcessorPipelineEngine (POST-ULT). No inline G-code. 5-axis compensation codes
(G43.4/TRAORI/M128/DWO) injected by POST-ULT dialect layer, not hardcoded in pipeline.

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Fanuc G43.4 (TCPC) — tool center point control, H-word tool length, G49 cancel. G43.5 for tilted tool |
| U02 | Siemens TRAORI — TRAORI(1)/TRAFOOF, CYCLE800 for 3+2 positioning, ORIWKS/ORIMKS orientation modes |
| U03 | Heidenhain M128 + PLANE SPATIAL — M128 continuous TCPC, PLANE SPATIAL SPA/SPB/SPC for 3+2, PLANE RESET |
| U04 | Haas DWO (Dynamic Work Offset) — G234 TCPC, G254 DWO enable, WIPS probe in tilted plane |
| U05 | Mazak G43.4 — TCPC mode, smooth tolerance G61.1, AI contour G05.1 |


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

### 5AX-MS1: Machine Kinematics Database
**Priority: HIGH | Units: 12 | Depends on: MS0.5**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | **Trunnion A/C table** — table tilts (A=-120°/+30°, C=360°), workpiece rotates, head fixed. Singularity at A=0° where C-axis velocity → ∞ for any XY motion |
| U02 | **Swivel B/C head** — head tilts (B=-10°/+100°, C=360°), workpiece fixed on table. Singularity at B=0° where C-axis becomes redundant with spindle rotation |
| U03 | **Mixed A-table / B-head** — Hermle-style: A-axis tilts table, B-axis tilts head. Two singularity zones (A=0° and B=0°). Hybrid kinematic chain |
| U04 | **Gantry head+spindle** — very large travel (X>3m, Y>2m), head tilts (A/C or B/C). Low acceleration limits, aerospace focus. Fork or swivel head |
| U05 | **Nutating off-axis tilt** — rare topology (Mori Seiki NMV, Mikron). Tilt axis not aligned with machine axes. Unique singularity locations not at A=0° or B=0° |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | **Forward kinematics solver** — given joint angles (A,B or A,C or B,C), compute tool tip position + orientation in workpiece coordinates. Matrix chain multiplication per topology |
| U07 | **Inverse kinematics solver** — given desired tool position + orientation, compute joint angles. May have 0, 1, or 2 solutions. Select solution closest to current position to minimize axis travel |
| U08 | **Singularity map** — precompute 2D grid (axis1 × axis2) marking zones where rotary velocity exceeds machine limits. Store as lookup table. Exclude ±3° band around each singularity |
| U09 | **Work envelope computation** — actual reachable XYZ volume at each AB angle combination. Shrinks at extreme tilts due to mechanical interference. Export as 3D boundary for collision engine |
| U10 | Machine capability database — 20+ 5-axis models: DMU 50/80, Hermle C42, Mikron HSM, Matsuura MX-520, Makino D500, Mazak VARIAXIS, Haas UMC-750, Okuma MU-5000V, Grob G350, Hurco VMX42 |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U11 | **Axis travel rate limits** — max velocity (°/s), max acceleration (°/s²), max jerk (°/s³) per rotary axis per machine. Used to validate feedrate feasibility at every toolpath point |
| U12 | Tests: same part on trunnion vs swivel vs mixed vs gantry → different AB solutions, different singularity zones, different G-code output |


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

### 5AX-MS2: 5-Axis Tooling — Barrel, Lollipop, Tapered Ball, Lens, Reach Tools
**Priority: HIGH | Units: 12 | Depends on: MS0**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | **Ball endmill** — standard 5-axis cutter. D_eff = D × sin(θ) varies continuously with tilt. Center dead zone at θ=0° requires lead angle 3-15° to maintain cutting speed |
| U02 | **Tapered ball nose** — taper angle (1-5°) provides wall clearance and reduced interference at steep angles. Effective diameter at contact depth: D_eff = 2×(R + ap×tan(taper)) |
| U03 | **Barrel cutter (circle-segment)** — R_barrel = 50-200mm effective radius at contact. 5-10× wider scallop-free stepover vs ball nose. hyperMILL MAXX Machining reference geometry |
| U04 | **Lens cutter (double-radius)** — two tangent arcs: larger radius for finishing complex surfaces with varying curvature. Combines barrel + ball characteristics |
| U05 | **Lollipop (undercut ball)** — spherical head on thin neck for undercut access. Max depth limited by neck_length. Neck diameter must clear slot/pocket walls at all tilt angles |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | **Conical endmill** — draft angle machining on mold/die walls. Taper matches wall draft angle (0.5-5°) for full-width contact. Used in die-casting and injection mold finishing |
| U07 | **Shrink-fit holder MANDATORY** — HSM >15,000 RPM requires shrink-fit or hydraulic chuck. No ER collet for simultaneous 5-axis. Auto-reject collet holders, flag in tool selection |
| U08 | **Reach analysis** — tool length + holder protrusion + spindle nose vs part depth + fixture height + table clearance at EVERY AB angle. Auto-flag insufficient reach at extreme tilts |
| U09 | **Tool preload for long tools** — shrink-fit grip force decreases with tool length (lever arm). Long tools (L/D>4) need higher interference fit or hydraulic. Auto-calculate required grip force |
| U10 | Tool catalog 5-axis classification — tag barrel/lollipop/tapered/conical/lens in 95K catalog, expose in SmartToolSelector with 5-axis-specific queries |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U11 | **Extended reach tools** — L/D ratio limits by substrate: solid carbide L/D≤5, carbide with dampener L/D≤8, steel shank with carbide head L/D≤3. Auto-deflection check at each tilt |
| U12 | Tests: barrel cutter finishing vs ball endmill — scallop height comparison at identical stepover; lollipop undercut access; reach analysis at A=90° vs A=30° |


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

### 5AX-MS3: 5-Axis Workholding — Tombstone, Vacuum, Zero-Point
**Priority: HIGH | Units: 6 | Depends on: MS0**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Tombstone on trunnion — 4-face indexing, part placement per face, collision envelope per face, G54.1 P1-P4 |
| U02 | Vacuum table on swivel head — holding force vs cutting force check, seal path validation, max tilt angle for vacuum integrity |
| U03 | Zero-point clamping (Erowa/3R/Lang) — pull stud locations, repeatability spec (<0.002mm), auto-pallet change codes |
| U04 | 5-axis vise (5th Axis, Kurt DX6) — jaw profile as collision body, max part height above jaws |
| U05 | Fixture plate with risers — riser height for tool clearance at tilt, interference check at all AB angles |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Tests: same part on tombstone vs vacuum vs zero-point, verify different clearance planes and G54.x |


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

### 5AX-MS4A: 3+2 Indexed Programming
**Priority: CRITICAL | Units: 15 | Depends on: MS1, MS2, MS3**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | **G68.2 tilted work plane (Fanuc/Haas)** — G68.2 X Y Z I J K R: specify tilt plane by Euler angles or two vectors. Auto-generate correct I/J/K from desired A/B orientation |
| U02 | **CYCLE800 tilted plane (Siemens)** — CYCLE800(1,"",1,27,A_angle,B_angle,0,0,0,0,0,0,0,1): auto-swivel table/head. TC=27 (table+head), TC=39 (head only) |
| U03 | **PLANE SPATIAL (Heidenhain)** — PLANE SPATIAL SPA+Q0 SPB+Q30 SPC+Q0 STAY/TURN/SEQ+/SEQ-: orientation mode with approach strategy selection |
| U04 | **Fixed AB orientation drilling** — lock A and B at target angle, run standard drill cycles (G81/G83/G73/G84) in tilted WCS. Tool axis perpendicular to tilted plane |
| U05 | **Fixed AB orientation milling** — lock A and B, run standard 2.5D milling (pocket, contour, face) in tilted WCS. Full 3-axis capability at each orientation |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | **Fixed AB orientation facing** — face mill at indexed angle for angled flats, chamfers, or datum surfaces. Single-pass or multi-pass with depth stepping |
| U07 | **Auto-detect indexed vs simultaneous** — analyze each feature: if tool axis is CONSTANT throughout the operation → indexed (G68.2/CYCLE800). If tool axis VARIES continuously → simultaneous (G93). Flag each feature with classification and reasoning |
| U08 | **Multi-angle setup optimization** — given N features at different angles, find minimum number of index positions that cover all features. Group features by angle proximity (±2° tolerance). Minimize total index moves |
| U09 | **Tool length compensation in tilted plane** — G43 (standard, controller computes) vs G43.4 (TCPC, post computes). In 3+2 mode, G43 is sufficient on most controllers. G43.4 only needed for simultaneous |
| U10 | **Safe retract between index moves** — before rotating to next AB position: retract Z to clearance, optionally retract XY to center, rotate AB, re-position XY, plunge Z. Auto-generate safe sequence |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U11 | **Tilted WCS probing** — G54.1 Pxx in tilted plane. Fanuc: G68.2 then G65 P9xxx. Siemens: CYCLE800 then CYCLE977. Heidenhain: PLANE SPATIAL then TCH PROBE |
| U12 | **Fixture offset in tilted plane** — compute G54.x offset relative to tilted WCS origin, not machine origin. Transform part zero through AB rotation matrix |
| U13 | **3+2 collision at locked angles** — with AB locked, run standard 3-axis collision (tool vs part at that orientation). Simpler than simultaneous collision — only check at N discrete orientations |
| U14 | **Index position verification** — output M0 (optional stop) + comment at each index move for operator verification on new setups. Safety-critical for first article |
| U15 | Tests: 4-angle indexed part with holes + pockets at 15°/30°/45°/60° — verify G68.2 on Fanuc, CYCLE800 on Siemens, PLANE SPATIAL on Heidenhain, DWO on Haas, G68.2 on Mazak |


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

### 5AX-MS4B: Full Simultaneous 5-Axis
**Priority: CRITICAL | Units: 20 | Depends on: MS1, MS2, MS3, MS4A**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | **Continuous XYZ-AB interpolation** — dense point arrays with 50-500+ points per operation. All 5 axes move simultaneously. Output as N×5 array (X,Y,Z,A,B) with per-block F-word (G93) |
| U02 | **CutterContactEngine — analytical surfaces** — CC-point computation on plane, cylinder, cone, sphere, torus. Closed-form solutions: offset surface normal by tool radius to get CL (cutter location) point |
| U03 | **CutterContactEngine — NURBS surfaces** — evaluate surface normal at UV parameters via cross product of partial derivatives. Iterative Newton-Raphson for closest-point projection. Chord tolerance ε = 0.005-0.01mm |
| U04 | **ToolAxisOptimizationEngine — gouge avoidance** — if local concave radius < tool radius at current orientation → gouge. Auto-tilt tool away from concavity. Continuous check at every CC point |
| U05 | **ToolAxisOptimizationEngine — stiffness maximization** — minimize tool deflection by keeping tool axis close to surface normal. Deviation from normal increases bending moment arm. Balance vs gouge avoidance |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | **ToolAxisOptimizationEngine — singularity avoidance** — if current AB approaches singularity (A→0° on trunnion), proactively re-orient tool axis away from singular configuration. Cost function penalty near singularity |
| U07 | **Multi-objective optimization** — minimize: w₁×gouge_risk + w₂×singularity_proximity + w₃×(1/stiffness) + w₄×axis_velocity. Subject to: lead∈[3°,15°], tilt∈[-5°,5°], D_eff > D_min, ω_A/ω_C < machine_max |
| U08 | **Quaternion SLERP** — smooth AB transitions between consecutive CC points via spherical linear interpolation. Prevents sudden axis reversals, jerk spikes, and surface marking. Interpolation parameter t ∈ [0,1] per segment |
| U09 | **Swarf cutting** — tool axis lies in ruled surface, side-of-tool engagement along ruling lines. For straight-walled or slightly-tapered surfaces. Tool flute length must exceed wall height. No gouge check on doubly-curved walls |
| U10 | **Flowline following** — UV parameterization on freeform surfaces. Iso-parametric passes along U or V direction. UV remapping for even scallop height across varying curvature. Morph-between-curves for complex boundaries |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U11 | **Barrel cutter scallop reduction** — hyperMILL MAXX Machining style: barrel cutter with R_barrel = 50-200mm achieves 5-10× wider stepover for same scallop height vs ball nose. Requires precise lead angle to engage barrel radius |
| U12 | **Contour following with lead/tilt** — follow 3D contour curve on surface with specified lead angle (3-15°, avoids ball center) and tilt angle (0-5°, biases chip evacuation direction). Both angles adjustable per-region |
| U13 | **Port/tube machining** — internal channel machining for impeller passages, manifold ports, exhaust channels. Tool follows centerline with AB tracking channel curvature. Collision with channel walls at every point |
| U14 | **Blade programming** — thin airfoil machining: pressure side, suction side, leading edge, trailing edge, root fillet, tip profile. Alternating passes to balance cutting forces on thin wall |
| U15 | **Impeller programming** — splitter blades, hub surface, shroud surface (if closed). Deep narrow channels require barrel or tapered ball. Singularity near impeller pole (A→0° when machining near center axis) |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U16 | **Blisk programming** — integral blade ring: blades + disk as single piece. Narrowest channels of any impeller type. 5-axis plunge roughing into channel, flow-line finishing on blade surfaces. Ti-6Al-4V typical |
| U17 | **Retract and reposition strategy** — lift-off at end of pass, retract to safe AB clearance plane, rapid traverse to next pass start, plunge at new AB orientation. Minimize non-cutting time while guaranteeing no collision |
| U18 | **Adaptive point density** — increase CC-point density at high-curvature regions (chord tolerance control). Reduce density on flat/gently-curved regions to minimize program size. Auto-refine based on chord error |
| U19 | **Multi-point XYZ-AB array output** — final output format: ordered array of (X,Y,Z,A,B,F) blocks with G93 feed per block. Include tool change, TCPC enable, safe start, safe end. Ready for post-processing |
| U20 | Tests: 7-blade impeller (simultaneous required) — verify CC-point density, scallop height ≤ 0.01mm, no singularity violation, G93 feed accuracy, output on all 5 controllers |


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

### 5AX-MS5: G93 Inverse Time Feed + NURBS
**Priority: MEDIUM | Units: 5 | Depends on: MS4B**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | G93 inverse time feed calculation — F = 1/t where t = chord_length / desired_linear_feedrate. Per-block F-word. F-value changes every line |
| U02 | Chord tolerance adaptive — subdivide segments where chord error > ε (typically 0.005-0.01mm). Re-compute F after subdivision |
| U03 | G6.2 NURBS interpolation (Fanuc) — knot vector + control points, smoother than linear segments, fewer blocks, better surface finish |
| U04 | Siemens BSPLINE / Heidenhain BLK FORM — equivalent NURBS on other controllers. COMPCAD/COMPCURV compressor on Siemens |
| U05 | Tests: G93 feed accuracy (linear speed matches at all tilt angles), NURBS vs linear segment smoothness comparison |


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

### 5AX-MS6: Controller Deep Hardening — 5-Axis Specifics
**Priority: MEDIUM | Units: 7 | Depends on: MS0.5, MS4B**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Fanuc 30i — G43.4 TCPC + G43.5, G68.2 tilted work plane (3+2), G05.1 AI contour, nano smoothing, G09 exact stop per block |
| U02 | Siemens 840D — TRAORI(1) + TRAFOOF, CYCLE800 3+2, ORIWKS vs ORIMKS, COMPCURV compressor, SOFT/FFWON |
| U03 | Heidenhain TNC7 — M128 TCPC, PLANE SPATIAL SPA/SPB/SPC, PLANE RESET, FUNCTION TCPM, tolerance CYCLE32 |
| U04 | Haas NGC — G234 TCPC, G254 DWO, Setting 33 ramp type, G187 smoothing (E/P1/P2/P3), limited simultaneous support |
| U05 | Mazak SmoothAi — G43.4 TCPC, G61.1 smooth tolerance, G05.1 AI contour, SMOOTH CORNER R, variable acceleration |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Okuma OSP-P300 — G43.4, 5-axis tilted plane G68, NAVI 5-axis tuning, collision avoidance system integration |
| U07 | Tests: identical 5-axis part on ALL 6 controllers, verify TCPC + 3+2 + G93 + retract codes, zero cross-contamination |


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

### 5AX-MS7: Physics — Effective Diameter, Scallop, Singularity, RCSA, Forces, Collision
**Priority: HIGH | Units: 15 | Depends on: MS4B**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | **Effective cutting diameter** — D_eff = D × sin(θ) where θ = surface_inclination + lead_angle. Varies CONTINUOUSLY along path. RPM must track D_eff to maintain constant V_c |
| U02 | **Scallop height model** — h = f(stepover, R_tool, κ₁, κ₂, lead_angle, tilt_angle) where κ₁κ₂ are principal surface curvatures. Concave surfaces → larger scallop, convex → smaller |
| U03 | **Effective diameter continuous tracking** — D_eff changes at every CC point as surface slope changes. RPM adjustment curve: n(t) = V_c / (π × D_eff(t)). Auto-generate variable RPM or flag when D_eff < D_min |
| U04 | **Cutting force with tilted tool (Kienzle)** — F_c = k_c1.1 × b × h^(1-m_c). When tool tilts, force components (F_c, F_f, F_p) rotate with tool axis vector. Must decompose into machine axis forces (F_x, F_y, F_z) at each AB angle |
| U05 | **Engagement arc variation** — arc-of-contact (engagement angle) changes as tool tilts on curved surface. Uphill cut → less engagement, downhill → more engagement. Affects chip load, heat, tool life. Auto-adjust feed to maintain constant chip load |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | **Singularity dynamics** — C-axis velocity ω_C = V_linear / (R_pivot × sin(A)). As A→0° on trunnion: ω_C → ∞. Controller cannot achieve infinite velocity → axis overshoot, marking, vibration. Must detect A<3° and re-orient or insert linking move |
| U07 | **RCSA (Receptance Coupling Substructure Analysis)** — assemble FRF: H_assembly = H_tool ⊕ H_holder ⊕ H_spindle via Euler-Bernoulli beam receptances at coupling interfaces. Tool stiffness changes with AB orientation (gravity, bearing preload). Predict chatter stability lobes per orientation |
| U08 | **Lead/tilt angle optimization** — lead 3-15° avoids ball center dead zone. Tilt 0-5° biases chip evacuation. Jointly optimize for: surface finish (minimize scallop), tool life (maximize stiffness), and clearance (avoid gouge). Multi-objective with Pareto front |
| U09 | **Collision at EVERY AB angle** — tool body (shank cylinder) + holder (geometry from catalog) + spindle head (machine-specific envelope) vs part (STL/BREP) + fixture (collision body) + table (machine-specific). Full 6-body check at every toolpath point |
| U10 | **Axis velocity/acceleration limits** — compute required ω_A, ω_C, α_A, α_C at each point from toolpath + feedrate. If ω > ω_max or α > α_max → auto-reduce feedrate at that segment. Report limiting axis per segment |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U11 | **Cutter deflection in tilted orientation** — deflection vector δ = F×L³/(3EI) rotates with tool orientation. Compensation vector must be applied in workpiece coordinates, not tool coordinates. Direction changes at every AB angle |
| U12 | **Chip thinning in ball nose** — actual chip thickness h_actual varies with engagement angle φ on ball. At ball tip, h→0 regardless of programmed feed. Adjust feed: F_adjusted = F_programmed × (R / R×sin(φ)) to maintain minimum chip > 0.3 × edge_radius |
| U13 | **Thermal growth compensation at tilt** — spindle thermal expansion direction changes with AB orientation. Compensation vector must rotate with head. Significant for tolerances <0.01mm over 4+ hour runs |
| U14 | **Surface integrity at high tilt** — at extreme tilt angles (>60°), cutting mechanics change: more rubbing than shearing at ball nose, higher specific cutting energy, white layer risk on hardened steel. Flag operations exceeding recommended tilt |
| U15 | Tests: D_eff tracking on 30° inclined plane, scallop on doubly-curved saddle surface (κ₁>0, κ₂<0), singularity detection at A=0° on trunnion, RCSA assembly verification, scallop prediction vs analytical (target ±20% accuracy) |


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

### 5AX-MS8: Exhaustive Testing — Industry Test Parts × Machines × Controllers
**Priority: CRITICAL | Units: 18 | Depends on: ALL**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Full test matrix: 12 parts × 5 topologies × 5 controllers = 300 test programs |
| | |
| | **Tier 1: 3+2 Indexed Parts** |
| U02 | **P1: Angled hole plate** — 4 holes at 15°/30°/45°/60° compound angles, Ø6mm thru, from Haas UMC mill workbook. Material: 6061 Al. Dims: 100×100×50mm. G68.2/CYCLE800/PLANE SPATIAL + G81 at each angle |
| U03 | **P2: Indexed pocket on angled face** — rectangular pocket (40×20×10mm deep) on 30° inclined face, from Fanuc 5-axis training. Material: 4140 steel. Dims: 80×80×60mm. Tilted WCS + standard pocket cycle |
| U04 | **P3: Multi-face tombstone part** — 6-sided part on tombstone, different feature per face (hole, pocket, slot, boss, contour, text). Job shop practice reference. Material: 7075 Al. Dims: 150×100×80mm |
| | |
| | **Tier 2: Simple Simultaneous** |
| U05 | **P4: Propeller blade** — constant cross-section, ruled surface, NiAl bronze (C95800). Dims: 200mm tip-to-hub, 8mm max thickness. Marine industry training part. Swarf cutting, G93, smooth AB transitions |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | **P5: Turbine vane** — thin airfoil, Inconel 625, 80mm span, 1.5mm trailing edge. Aerospace training part. Ball nose finish both pressure + suction sides, leading/trailing edge radii |
| U07 | **P6: Hip implant femoral component** — freeform NURBS surface, CoCrMo (ASTM F75). Dims: Ø50mm head, 130mm stem. Medical training part. Ball nose finishing, scallop ≤ 0.005mm, mirror polish target |
| | |
| | **Tier 3: Complex Simultaneous** |
| U08 | **P7: Centrifugal pump impeller 7-blade** — 316L stainless, 200mm OD, 7 full blades + 7 splitter blades, enclosed shroud. Pump industry reference. Barrel cutter finishing, singularity near pole, deep channel access |
| U09 | **P8: Turbine blade with fir-tree root** — Inconel 718, 120mm span, 4-lobe fir-tree root (broach-equivalent by 5-axis). Aerospace reference. Root: indexed 5-face machining. Airfoil: simultaneous finishing |
| U10 | **P9: Optical mirror mount** — Invar 36 (low CTE), 150×100×40mm, Ø80mm mirror pocket with 0.001mm flatness. Defense/space reference. Ultra-precision 5-axis facing, thermal stability critical |
| | |
| | **Tier 4: Industry Maximum Complexity** |
| U11 | **P10: Blisk 24-blade** — Ti-6Al-4V, 300mm OD, 24 integral blades, 2mm minimum channel width. Aerospace maximum complexity. 5-axis plunge roughing + flow-line finishing + edge blend. Titan Academy level |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U12 | **P11: Monolithic aerospace bulkhead** — 7050-T7451 Al, 600×400×80mm, 85% material removal, 47 pockets at various angles. Mixed 3+2 (pockets) + simultaneous (blend radii). Structural aerospace reference |
| U13 | **P12: Medical spinal cage** — Ti-6Al-4V ELI, 25×12×10mm, lattice structure with 0.8mm struts, porous surface for osseointegration. Medical maximum complexity. Micro ball nose, extreme precision |
| | |
| | **Cross-Validation** |
| U14 | **Cross-material validation** — each tier re-tested in 3 materials: (a) aluminum alloy (6061/7075), (b) alloy steel (4140/4340), (c) high-temp alloy (Ti-6Al-4V or Inconel 718). Verify feed/speed/DOC adaptation per material |
| U15 | **Cross-machine validation** — each tier tested on trunnion (Haas UMC-750), swivel (Hermle C42), mixed (DMU 80), gantry (Zimmermann FZ33) where applicable. Verify different AB solutions per topology |
| U16 | **Cross-controller validation** — each tier tested on Fanuc 30i, Siemens 840D, Heidenhain TNC7, Haas NGC, Mazak SmoothAi. Verify TCPC codes, 3+2 codes, G93 feeds, retract sequences, zero cross-contamination |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U17 | **3+2 vs simultaneous auto-detection** — for mixed parts (P3, P8, P11): verify indexed features get G68.2/CYCLE800, simultaneous features get G93. No simultaneous code on features that can be indexed |
| U18 | **Reference program comparison** — where published reference programs exist (Haas workbook, Fanuc training, Siemens examples): compare PRISM output line-by-line. Document deviations with justification |

### Each test part MUST validate:
- CC-point count and density (points per mm of path)
- Scallop height prediction vs analytical model (target ±20%)
- Singularity avoidance (no AB within ±3° of singularity unless explicitly flagged)
- G93 feed accuracy (resultant linear speed within ±5% of programmed)
- Collision freedom (tool+holder+spindle vs part+fixture+table at every point)
- 3+2 vs simultaneous classification correctness

---

## 5-AXIS-SPECIFIC PHYSICS (Named Models)

### Effective Cutting Diameter
```
D_eff = D × sin(θ)
θ = surface_inclination_angle + lead_angle
```
At θ=0° (tool vertical on flat surface), D_eff→0 and V_c→0 — the "dead zone" at ball nose tip. Lead angle of 3-15° eliminates this. D_eff varies **continuously** along every pass as surface slope changes.

### Scallop Height (Curvature-Aware)
```
h = stepover² / (8 × R_eff) × κ_correction
κ_correction = f(κ₁, κ₂, lead_angle, tilt_angle)
R_eff = tool effective radius at contact point
```
On concave surfaces (κ<0), scallop INCREASES. On convex (κ>0), scallop DECREASES. Standard CAM ignores curvature — PRISM must not.

### Singularity (Gimbal Lock)
```
At A=0° (or 180°) on trunnion A/C:
  ω_C = V_linear / (R_pivot × sin(A))
  As A→0°: ω_C → ∞
```
Controller cannot physically achieve infinite C velocity. Result: axis overshoot, marking, vibration. Must detect A<3° approach and re-orient or insert linking move.

### RCSA (Receptance Coupling Substructure Analysis)
```
H_assembly = H_tool ⊕ H_holder ⊕ H_spindle
Coupling via Euler-Bernoulli beam receptances at interfaces
Output: assembled FRF → stability lobes at current AB orientation
```
Tool stiffness changes with orientation (gravity direction, bearing preload). RCSA predicts chatter limits per AB angle.

### Tool Axis Optimization (Multi-Objective)
```
minimize: f(lead, tilt) = w₁×gouge_risk + w₂×singularity_proximity + w₃×(1/stiffness) + w₄×axis_velocity
subject to: lead ∈ [3°,15°], tilt ∈ [-5°,5°]
            D_eff > D_min
            ω_A, ω_C < machine_max
```
Quaternion SLERP ensures smooth orientation transitions between optimized axes at successive CC points.

### CutterContactEngine (CC Points)
```
CC point on surface S at parameter (u,v):
  P_cc = S(u,v)
  n = ∂S/∂u × ∂S/∂v  (surface normal)
  P_cl = P_cc + R_tool × n  (cutter location)
```
For analytical surfaces (plane, cylinder, cone, sphere, torus): closed-form CC. For NURBS: iterative Newton-Raphson on closest-point.

### Kienzle Cutting Force (Tilted Tool)
```
F_c = k_c1.1 × b × h^(1-m_c)
F_machine = R_AB × F_tool   (rotate force vector by AB orientation matrix)
[F_x, F_y, F_z] = R(A,B) × [F_c, F_f, F_p]
```
Force components in machine coordinates change at every AB angle. Required for deflection compensation and power validation.

### Engagement Arc Variation
```
φ_engagement = arccos(1 - ae/R_tool) × tilt_correction
tilt_correction = f(surface_slope, lead_angle, cut_direction)
h_actual = fz × sin(φ) at engagement angle φ on ball nose
```
Uphill cuts reduce engagement, downhill increases it. Constant programmed feed → variable actual chip load. Must compensate.

---

## TEST MATRIX

### Parts (12):
| ID | Part | Type | Material | Dims | Key Challenge |
|----|------|------|----------|------|--------------|
| P1 | Angled hole plate | 3+2 | 6061 Al | 100×100×50 | Compound angle drilling, G68.2 |
| P2 | Indexed pocket | 3+2 | 4140 | 80×80×60 | Pocket in tilted WCS |
| P3 | Multi-face tombstone | 3+2 | 7075 Al | 150×100×80 | 6-face indexing, minimum moves |
| P4 | Propeller blade | Simultaneous | C95800 NiAlBr | 200mm span | Swarf cutting, ruled surface |
| P5 | Turbine vane | Simultaneous | IN625 | 80mm span | Thin airfoil, ball nose finish |
| P6 | Hip implant | Simultaneous | CoCrMo | Ø50 head | Freeform NURBS, scallop ≤0.005 |
| P7 | Pump impeller 7-blade | Simultaneous | 316L | 200mm OD | Barrel cutter, splitters, singularity |
| P8 | Turbine blade+root | Mixed | IN718 | 120mm span | Fir-tree root (3+2) + airfoil (simul) |
| P9 | Optical mirror mount | Simultaneous | Invar 36 | 150×100×40 | Ultra-precision, thermal stability |
| P10 | Blisk 24-blade | Simultaneous | Ti-6Al-4V | 300mm OD | Maximum channel complexity |
| P11 | Monolithic bulkhead | Mixed | 7050 Al | 600×400×80 | 85% removal, mixed 3+2 + simul |
| P12 | Spinal cage | Simultaneous | Ti ELI | 25×12×10 | Lattice, micro-precision |

### Machine Topologies (5):
| ID | Topology | Example Machines | Axes | Singularity |
|----|----------|-----------------|------|-------------|
| T1 | Trunnion A/C table | DMU 50, Haas UMC-750, Okuma MU-5000V | A=-120/+30°, C=360° | A=0°/180° |
| T2 | Swivel B/C head | Hermle C42, Makino D500 | B=-10/+100°, C=360° | B=0° |
| T3 | Mixed A-table/B-head | DMG DMU 80, Mazak VARIAXIS, Grob G350 | A table + B head | A=0° and B=0° |
| T4 | Gantry | Zimmermann FZ33, Jobs LinX | A/C head, X>3m | A=0° |
| T5 | Nutating | Mori Seiki NMV, Mikron HSM | Off-axis tilt | Non-standard |

### Controllers (5):
| ID | Controller | TCPC Code | 3+2 Code | Feed Mode | Smoothing |
|----|-----------|-----------|----------|-----------|-----------|
| C1 | Fanuc 30i | G43.4 | G68.2 | G93 | G05.1 AI contour |
| C2 | Siemens 840D | TRAORI | CYCLE800 | G93/BSPLINE | COMPCURV |
| C3 | Heidenhain TNC7 | M128 | PLANE SPATIAL | G93 | CYCLE32 tolerance |
| C4 | Haas NGC | G234 | G254 DWO | G93 | G187 smoothing |
| C5 | Mazak SmoothAi | G43.4 | G68.2 | G93/G05.1 | SMOOTH CORNER |

### Test Coverage: 12 parts × 5 topologies × 5 controllers = 300 programs
(Not all combinations valid — gantry not applicable to small medical parts, nutating excluded from Tier 4)

### Compatibility:
| Part | T1 Trunnion | T2 Swivel | T3 Mixed | T4 Gantry | T5 Nutating |
|------|:-----------:|:---------:|:--------:|:---------:|:-----------:|
| P1-P3 (3+2) | ✓ | ✓ | ✓ | ✓ | ✓ |
| P4-P6 (simple simul) | ✓ | ✓ | ✓ | ✓ | ✓ |
| P7-P9 (complex simul) | ✓ | ✓ | ✓ | ✓* | ✗ |
| P10 (blisk) | ✓ | ✓ | ✓ | ✗ | ✗ |
| P11 (bulkhead) | ✗ | ✗ | ✓ | ✓ | ✗ |
| P12 (spinal cage) | ✓ | ✓ | ✓ | ✗ | ✗ |
**Valid test combinations: ~240 programs**

---

## EXECUTION ORDER

```
Phase 1: 5AX-MS0 (collision) → 5AX-MS0.5 (dialect)                    [15 units, SAFETY]
Phase 2: 5AX-MS1 + 5AX-MS2 + 5AX-MS3 (parallel)                      [30 units, MACHINES + TOOLS + WORKHOLDING]
Phase 3: 5AX-MS4A (3+2 indexed programming)                           [15 units, INDEXED CORE]
Phase 4: 5AX-MS4B (full simultaneous 5-axis)                          [20 units, SIMULTANEOUS CORE]
Phase 5: 5AX-MS5 + 5AX-MS6 (parallel)                                 [12 units, FEED + CONTROLLERS]
Phase 6: 5AX-MS7 (physics hardening)                                   [15 units, PHYSICS]
Phase 7: 5AX-MS8 (exhaustive validation)                               [18 units, TESTING]
```

## UNIT SUMMARY

| Milestone | Units | Priority | Key Deliverable |
|-----------|-------|----------|----------------|
| 5AX-MS0 | 10 | CRITICAL | Rotary-aware collision at every AB angle |
| 5AX-MS0.5 | 5 | CRITICAL | G43.4 / TRAORI / M128 / DWO / Mazak dialect |
| 5AX-MS1 | 12 | HIGH | 5 machine topologies with FK/IK solvers, singularity maps, work envelopes |
| 5AX-MS2 | 12 | HIGH | Ball, tapered ball, barrel, lens, lollipop, conical tools + reach analysis |
| 5AX-MS3 | 6 | HIGH | Tombstone, vacuum, zero-point workholding |
| 5AX-MS4A | 15 | CRITICAL | 3+2 indexed programming — G68.2, CYCLE800, PLANE SPATIAL, auto-detect |
| 5AX-MS4B | 20 | CRITICAL | Full simultaneous — CC points, tool axis optimization, SLERP, swarf, impeller, blisk |
| 5AX-MS5 | 5 | MEDIUM | G93 inverse time + NURBS interpolation |
| 5AX-MS6 | 7 | MEDIUM | 6 controllers deep-hardened for 5-axis |
| 5AX-MS7 | 15 | HIGH | D_eff, scallop, forces, singularity, RCSA, engagement, collision physics |
| 5AX-MS8 | 18 | CRITICAL | 300 test programs — 12 parts × 5 topologies × 5 controllers |
| **TOTAL** | **125** | | |

## FINAL TARGET: 300 tests, 100% pass rate

### MINIMUM TEST BASELINE GATE (Phase 5 prerequisite)
```
5-AXIS minimum: 50+ dedicated tests before Phase 5 milestones
Current baseline: 0/0 (no dedicated 5-axis tests)
Gap: 50+ tests needed — kinematics, TCP, collision, simultaneous 5-axis, dialect
Validation: match-then-improve against OEM application guides (DMG/Mazak/Hermle)
  Step 1: Match published feed rates within ±10% for impeller/blisk reference parts
  Step 2: Improve with fusion_tier >= 2 (engagement varies with tool orientation)
```

### MACHINE-TYPE SELECTOR REFERENCE
```
Input: part geometry (size, features, tolerances) + material + batch size
Output: ranked machine type recommendation
Engine: MachineTypeSelectorEngine (shared across all 8 machine roadmaps)
5-axis selection criteria: undercuts, compound angles, impeller/blisk/turbine geometry,
  surface finish requiring lead/tilt, deep pockets with access constraints
Contra-indicators: 2.5D only (→ 3-axis milling), pure rotational (→ lathe)
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