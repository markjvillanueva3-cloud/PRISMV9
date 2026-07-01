# PRISM GRINDING COMPREHENSIVE ROADMAP v1.0
## 8 Milestones | 65 Units | 96 Target Tests

Generated: 2026-03-23
Current test baseline: 0/0 (no grinding-specific tests)

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

SKILLS: /smart grinding process engineer + abrasive technology specialist, /forge-triple,
  /prism-review, /test, /physics-verify, /program-validate, /calibrate

MASTER KNOWLEDGE SOURCES FOR ALL GRINDING SESSIONS:
  ENGINES: GrindingProgramAssemblerEngine (1,858L — MC 500, 6 dialects),
    GrindingForceEngine, GrindingWheelDressingOptimizationEngine,
    SurfaceIntegrityPredictorEngine (white layer, residual stress, thermal damage)
  TRIBAL TIPS: Grinding-specific tips across all 18 CAM systems,
    MachiningPlaybookEngine grinding rules
  FORMULAS: Malkin specific grinding energy model (u = u0 + u_plowing + u_sliding),
    maximum temperature (θmax = C × (ae × vs)^0.5 / (vw × de^0.25)),
    surface roughness from wheel parameters (Ra = f(grain_size, dressing_lead, overlap_ratio))
  CONSTANTS: Grinding wheel grade/structure/bond constants per ISO 525,
    specific energy by material (ISO P: 40-80 J/mm³, ISO S: 80-120 J/mm³)
  REFERENCE: Studer/Junker grinding application guides,
    Malkin "Grinding Technology" textbook, Norton abrasives catalog
  KEY PHYSICS: Thermal damage threshold (burn detection), wheel wear model,
    G-ratio (volume removed / volume wheel wear), dressing diamond conditioning,
    spark-out passes (for roundness), infeed rate vs surface integrity

4-LOOP + FORGE-TRIPLE + AGENT HOOKS (MANDATORY per unit):
  LOOP 1 — SCRUTINIZE: /prism-review + /scrutinize + agent hook verifies Malkin physics
  LOOP 2 — GAP FILL: /test + /trace wiring + agent hook checks cross-engine consistency
  LOOP 3 — TIE UP: no TODOs, reasoning[], golden snapshot
  LOOP 4 — VALIDATE: Re-run /prism-review on fixes, findings MUST decrease, full test suite → 0 failures
  FORGE-TRIPLE: engine + protective hook + MCP action + skill per milestone
  AGENT SESSION AUDIT: before compact, agent reviews completeness + physics integrity
  /compact every 3 units (auto-triggered by hook)

PHYSICS FUSION INTEGRATION (ALL S/F milestones — fusion_tier >= 2 MANDATORY):
  Every speed/feed computation MUST use PhysicsFusionOrchestratorEngine (fusion_tier >= 2).
  Tier 1 (single-pass) NOT acceptable for production — multi-model convergence required.
  Action: physics_fusion via calcDispatcher.
  Grinding-specific physics (Malkin specific energy, thermal damage, wheel wear) use
  dedicated engines PLUS the fusion convergence loop for coupled effects.
  Future: GrindingForce plugin for the fusion convergence loop (extends PhysicsPlugin).
  Any turning/milling sub-operations on grind machines MUST also use fusion_tier >= 2.
  Outputs: force_N, specific_energy_J_mm3, temperature_C, wheel_wear, Ra_um, confidence.
  Inputs REQUIRED: wheel spec (grade/grit/bond), workpiece material (iso_group/hardness),
    engagement (depth_of_cut/table_speed/wheel_speed), machine limits, dressing params.
  See: PhysicsFusionOrchestratorEngine.ts + 5 plugins in src/engines/plugins/

IN-PROCESS GAUGING (add to relevant milestones):
  Wheel dress verification: acoustic emission sensor + contact detection for dress amount.
  In-process diameter gauging: Marposs/Renishaw gauging head for real-time size control.
  Post-grind verification: roundness check, taper measurement, surface finish confirmation.
  Spark-out detection: in-cycle force monitoring to verify spark-out completion.
  Applies to: GR-MS2 (surface grind), GR-MS3 (cylindrical), GR-MS5 (advanced).
```

## PER-MILESTONE COMPREHENSIVE KNOWLEDGE SOURCES

### GR-MS0: Collision Avoidance — Grinding Machine Elements
```
ENGINES:
  - GrindingProgramAssemblerEngine (1,858L) — base grinding pipeline
  - CollisionEngine (2,526L) — needs wheel guard + dresser arm extension
  - CollisionPreventionEngine (754L) — AABB for wheel + dresser + steady rest
  - SafetyVetoEngine (E1098) — wheel burst speed check (CRITICAL safety)
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — grinding collision anti-patterns ("wheel guard must clear workpiece at ALL positions")
  - src/data/*-cam-tips.ts — grinding collision tips across 18 CAM systems
  - tribal tips: "dresser arm collision during traverse is #1 grinding crash cause"
FORMULAS:
  - Wheel peripheral speed: V_wheel = π × D_wheel × N_wheel / 60000 (must be < max_wheel_speed)
  - Wheel burst speed: V_burst = V_max × SF (SF=1.5 vitrified, 1.25 resin — NEVER exceed)
  - Dresser arm clearance: check at every table traverse position
  - Steady rest vs wheel guard: both near workpiece — must not collide
REFERENCE:
  - ISO 16089 — safety standards for grinding machines (wheel burst protection)
  - ANSI B7.1 — grinding wheel safety standards
  - Studer S33/S41 machine specifications (wheel guard geometry)
  - Norton/Saint-Gobain wheel safety documentation

INTENT: A grinding wheel bursting at 35 m/s launches fragments like shrapnel — this is
  the MOST DANGEROUS failure mode in any machine shop. PRISM must NEVER allow a program
  that exceeds wheel speed rating. Dresser arm collision during table traverse is the
  most common grinding crash — checked at every position, not just start/end.
```

### GR-MS0.5: Controller Dialect Layer
```
ENGINES:
  - ControllerDialectEngine — needs grinding-specific cycle extensions
  - PostProcessorPipelineEngine — needs grinding phase (dress cycles, spark-out, gauging)
  - GrindingProgramAssemblerEngine — current 6-dialect output
TRIBAL KNOWLEDGE:
  - controller-knowledge-tips.ts — grinding controller specifics
  - MachiningPlaybookEngine — "Studer StuderGRIND uses object-oriented programming, NOT G-code"
FORMULAS:
  - Studer: StuderGRIND objects (PROCESS, SHAPE, DRESSING, GAUGING)
  - Junker: GRIPS programming (G71/G72 infeed, G81 plunge, G83 traverse)
  - Kellenberger: KEL-VERA programming language
  - Toyoda/JTEKT: standard Fanuc G-code + custom grinding cycles
  - Okuma: OSP + grinding macros (G180/G181)
  - Siemens 840D: ShopGrind + standard cycles
REFERENCE:
  - Studer StuderGRIND programming manual
  - Junker GRIPS programming guide
  - JTEKT/Toyoda grinding cycle specifications

INTENT: Grinding controllers are MORE VARIED than turning/milling — Studer uses object-
  oriented programming, Junker uses GRIPS, Kellenberger uses KEL-VERA. These aren't
  dialects of G-code — they're completely different languages. PRISM must support each one.
```

### GR-MS1: Machine Database — Grinder Types
```
ENGINES:
  - MachineSelectionEngine — grinder capability matching
  - MachineMatcherEngine — feature→grinder type
  - SpindleTorqueCurveEngine — grinding spindle power curves
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "OD grinder for shafts, surface for flats, centerless for high-volume"
  - src/data/*-cam-tips.ts — grinder selection tips
FORMULAS:
  - Machine types: OD cylindrical (centers, chuck), ID (internal), surface (reciprocating, rotary),
    centerless (throughfeed, infeed), creep-feed (deep), tool & cutter, jig
  - Work speed: V_work = π × D_work × N_work / 1000 (m/min, NOT same as wheel speed)
  - Wheel-to-work speed ratio: typical 60:1 to 120:1
REFERENCE:
  - MachineRegistry — filter to grinders: Studer, Junker, Kellenberger, Okuma, JTEKT, Anca
  - Grinding machine classification standards

INTENT: Centerless grinding has NO centers — part floats between grinding wheel, regulating
  wheel, and blade. The physics is completely different from OD grinding. PRISM must select
  the right grinder TYPE, not just "a grinder."
```

### GR-MS2: Wheel Selection — 11 Specifications
```
ENGINES:
  - GrindingProgramAssemblerEngine — wheel specification handling
  - GrindingWheelDressingOptimizationEngine — dress parameters from wheel spec
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "vitrified bond for precision, resin for tool grinding, CBN for hardened steel"
  - tribal tips: "open structure (12-14) for soft materials, dense (4-6) for hard"
  - Sandvik/Norton grinding application tips
FORMULAS:
  - Wheel specification: [Abrasive][Grain size][Grade][Structure][Bond] (e.g., WA60K8V = white alumina, 60 grit, K grade, 8 structure, vitrified)
  - Abrasive selection: A (aluminum oxide) for steel, C (silicon carbide) for cast iron/non-ferrous,
    CBN for hardened steel (>50 HRC), Diamond for carbide/ceramic
  - Grade vs removal rate: soft grade (F-K) for hard materials, hard grade (N-T) for soft
  - G-ratio: G = Volume_removed / Volume_wheel_wear (higher = more economical)
  - Dress lead vs roughness: Ra ∝ (dress_lead / dress_depth)^0.5
REFERENCE:
  - Norton/Saint-Gobain wheel selection guide (all 11 specs explained)
  - ISO 525 — grinding wheel marking standard
  - 3M/Winterthur superabrasive catalog (CBN/diamond specifications)
  - Machinery's Handbook — grinding wheel selection tables

INTENT: A wrong wheel grade means: too soft = wheel wears instantly ($$$), too hard = burns
  the workpiece surface (scrap). 11 specifications must ALL be correct for the material +
  operation + tolerance. CBN for hardened steel is 10× more expensive but lasts 100× longer.
```

### GR-MS3: Workholding — Grinding-Specific
```
ENGINES:
  - WorkholdingEngine — magnetic chuck, centers, collets
  - ChuckJawForceEngine — adapted for grinding (lower forces but higher precision)
  - SteadyRestPlacementEngine — prevent deflection during OD grinding
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "magnetic chuck for surface grinding — demagnetize after!"
  - tribal tips: "dead centers for precision OD — live centers introduce runout"
  - src/data/*-cam-tips.ts — grinding workholding tips
FORMULAS:
  - Magnetic chuck force: F_hold = B² × A / (2μ₀) (magnetic flux density × area)
  - Center support: dead center = zero runout, live center = 0.002-0.005mm TIR
  - Part deflection: δ = F_grinding × L³ / (192EI) for between-centers (supported both ends)
REFERENCE:
  - Magnetic chuck specifications (Walker, Eclipse)
  - Center specifications (Riten, Royal)
  - Machinery's Handbook — grinding workholding

INTENT: Grinding forces are LOW (10-100N vs 1000N+ for turning) but tolerances are TIGHT
  (0.001mm vs 0.01mm). The workholding must be PRECISE, not just strong. Dead centers for
  OD grinding give zero runout but no torque drive — use drive dogs or faceplate.
```

### GR-MS4: Gauging + Adaptive Spark-Out
```
ENGINES:
  - GrindingProgramAssemblerEngine — gauging cycle integration
  - ProcessCapabilityPredictionEngine — Cpk from gauging feedback
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "spark-out passes until gauge shows size — never time-based"
  - tribal tips: "in-process gauging saves 30% cycle time vs over-grind + measure"
  - src/data/*-cam-tips.ts — gauging tips
FORMULAS:
  - Spark-out: keep grinding at zero infeed until workpiece roundness stabilizes
  - Adaptive: gauge reads diameter → compare to target → infeed more or spark-out
  - Thermal growth: machine grows ~0.005mm/hour → gauging compensates automatically
  - Cp/Cpk from consecutive measurements during production run
REFERENCE:
  - Marposs/Renishaw in-process gauging specifications
  - Studer gauging integration documentation

INTENT: Grinding to ±0.001mm without gauging = hope. In-process gauging measures the part
  WHILE grinding and adjusts infeed automatically. Spark-out (zero infeed) continues until
  the gauge shows the part is round and on-size — not for a fixed number of passes.
```

### GR-MS5: Form Profiles — Thread, Gear, Multi-Rib
```
ENGINES:
  - GrindingProgramAssemblerEngine — form profile programming
  - GrindingWheelDressingOptimizationEngine — profile dressing
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "dress wheel to profile shape — wheel transfers shape to workpiece"
  - tribal tips: "CNC dress for complex profiles, single-point dress for simple"
FORMULAS:
  - Thread grinding: wheel profile = thread form (60° V, Acme 29°, buttress)
  - Gear grinding: involute profile on wheel, continuous generating motion
  - Multi-rib: multiple form profiles on wheel face, grind all ribs simultaneously
  - Profile accuracy: dressed profile vs theoretical form — deviation < 0.002mm
REFERENCE:
  - Reishauer/Klingelnberg gear grinding documentation
  - Thread grinding specifications (Studer, Kellenberger)

INTENT: Thread grinding produces higher precision than thread cutting (pitch accuracy
  ±0.001mm vs ±0.01mm). The wheel IS the form — dress it wrong and every thread is wrong.
  Gear grinding involute profiles require continuous generating motion (wheel + workpiece
  synchronized) — not just point-to-point like turning.
```

### GR-MS6: Physics — Malkin, Jaeger, Verkerk, G-Ratio
```
ENGINES:
  - GrindingForceEngine — specific grinding energy model
  - SurfaceIntegrityPredictorEngine — thermal damage, white layer, residual stress
  - GrindingProgramAssemblerEngine — physics-integrated parameter selection
  - StochasticToolLifeEngine — adapted for wheel life (G-ratio based)
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "if you see temper colors, you've burned the surface — scrap"
  - tribal tips: "creep-feed grinding thermal damage = deep subsurface — may pass visual inspection but FAIL in service"
  - Malkin "Grinding Technology" textbook tips
FORMULAS:
  - Malkin specific energy: u = u_chip + u_plowing + u_sliding (3-component model)
  - Jaeger maximum temperature: θ_max = C × (a_e × v_s)^0.5 / (v_w × d_e^0.25)
  - Verkerk wheel wear: dG/dt = f(force, wheel_grade, grain_fracture_toughness)
  - G-ratio: G = V_material_removed / V_wheel_worn (CBN: G=1000+, conventional: G=10-100)
  - Thermal damage threshold: θ_max < θ_temper (570°C for bearing steel, 400°C for case-hardened)
  - Barkhausen noise: BN_amplitude ∝ residual_stress + white_layer_depth (non-destructive detection)
  - Specific material removal rate: Q'w = a_e × v_w (mm³/mm·s) — must not exceed thermal limit
REFERENCE:
  - Malkin & Guo "Grinding Technology" textbook — canonical grinding physics source
  - Jaeger "Moving Sources of Heat" (1942) — thermal model foundation
  - Published thermal damage threshold data per material
  - Barkhausen noise inspection standards (grinding burn detection)
  - src/physics/constants.ts — grinding energy constants

INTENT: Grinding burn is INVISIBLE — the surface looks fine but the metallurgy is destroyed.
  White layer (untempered martensite) = brittle = catastrophic failure in service. A bearing
  ground with thermal damage fails at 10% of expected life. PRISM must predict θ_max and
  BLOCK any program where grinding temperature exceeds the material's tempering threshold.
  This is SAFETY-CRITICAL for aerospace and automotive bearing applications.
```

### GR-MS7: Testing — 8 Parts × 4 Machine Types
```
ENGINES:
  - ALL grinding pipeline engines — full end-to-end testing
  - CNCSimulationPipelineEngine — material removal simulation
  - ProcessCapabilityPredictionEngine — Cpk for grinding tolerances
TRIBAL KNOWLEDGE:
  - ALL tip sources — validate tips produce correct grinding outcomes
  - MachiningPlaybookEngine — rules validated against reference programs
FORMULAS:
  - ALL grinding formulas — hand-calculate expected values, compare to output
  - Cross-material: same bearing race in 52100, M50, 440C, Si3N4 ceramic
REFERENCE:
  - Studer/Junker application examples with known parameters
  - Bearing race grinding specifications (ISO 492 — rolling bearing tolerances)
  - Crankshaft journal grinding examples (automotive)
  - Camshaft lobe grinding examples (profile accuracy)
  - Tool & cutter grinding examples (Anca, Walter)
  - Golden snapshots from MS0-MS6 — regression anchors
  - Cross-material S/F range tables (grinding-specific)

INTENT: Bearing race (52100 steel, roundness 0.5μm, Ra 0.1μm) is the ULTIMATE grinding
  test part. Crankshaft journal tests multi-diameter traverse grinding. Camshaft lobe tests
  form profile accuracy. Tool grinding tests 5-axis simultaneous with diamond wheel.
  After MS7, PRISM generates correct grinding programs for real industry parts.
```

---

## CURRENT STATE (What's Built)

### Engine (existing, NEAR-PRODUCTION):
| Engine | Lines | Status |
|--------|-------|--------|
| GrindingProgramAssemblerEngine | 1,858 | MC 500 material coverage, 6 controller dialects, basic cycle generation |

### What Works:
- Material classification for 500+ materials
- 6 controller dialect stubs (Studer, Kellenberger, Fanuc, Siemens, Junker, generic)
- Basic cylindrical OD traverse grind cycle
- Wheel speed / work speed calculation

### Critical Gaps:
1. **No in-process gauging** — no G31 skip signal, no adaptive spark-out, no roundness feedback
2. **No form profiles** — no thread grinding (G33 sync), no gear involute, no multi-rib
3. **No adaptive spark-out** — fixed pass count instead of roundness/size convergence
4. **No wheel wear compensation** — no G-ratio tracking, no dress-per-part scheduling
5. **No burn detection model** — no Jaeger thermal threshold, no specific energy check

---

## CRITICAL ARCHITECTURAL ISSUES (Must Fix First)

### Issue 1: No Gauging Integration
Production grinding is closed-loop: grind → gauge → adjust → grind → gauge → spark-out until size. Without gauging, every program is open-loop and will produce scrap on tight tolerances (<0.005mm).
**Fix**: MS4 — G31 skip signal + in-process gauge + adaptive spark-out.

### Issue 2: No Thermal Damage Model
Grinding burn destroys parts silently — surface looks fine but subsurface is rehardened/tempered. Without Jaeger thermal threshold checking, PRISM cannot warn when parameters will burn.
**Fix**: MS6 — full Malkin/Jaeger/Verkerk physics suite.

### Issue 3: No Wheel Specification Engine
Grinding wheel selection has 11 interdependent specifications (abrasive, grit, grade, structure, bond, shape, size, max RPM, concentration, layer depth, core). Wrong wheel = burn, load, chatter, or poor finish.
**Fix**: MS2 — wheel selection scoring all 11 specs.

### Issue 4: No Dress Cycle Integration
Dressing restores wheel sharpness and form. Without it, programs assume infinitely sharp wheels — unrealistic for any production run.
**Fix**: MS2 (wheel selection includes dress parameters) + MS4 (dress cycle in program).

---

## MILESTONE DETAILS

### GR-MS0: Collision Avoidance — Grinding Machine Elements
**Priority: CRITICAL | Units: 8 | Depends on: nothing**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Wheel guard collision — guard OD envelope vs workpiece fixtures, tailstock, steady rest |
| U02 | Dresser arm collision — rotary dresser swing arc vs workpiece, diamond nib clearance during traverse |
| U03 | Steady rest collision — rest jaw positions vs wheel traverse path, auto-retract before wheel passes |
| U04 | Gauging probe collision — probe arm swing-in path vs wheel guard, auto-sequence: wheel retract → probe in → measure → probe out → wheel in |
| U05 | Wheel approach clearance — minimum 2mm air gap before grind contact, rapid-to-feed transition point |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Tailstock/headstock interference — wheel edge vs drive dog, wheel edge vs tailstock quill |
| U07 | Coolant nozzle positioning — nozzle tip vs wheel periphery, auto-angle = tangent to contact arc |
| U08 | 10 collision test scenarios: 3 guard, 2 dresser, 2 steady rest, 2 probe, 1 coolant |


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

### GR-MS0.5: Controller Dialect Layer + POST-ULT Pipeline
**Priority: CRITICAL | Units: 7 | Depends on: MS0**

**POST-ULT INTEGRATION:** All G-code from GrindingProgramAssemblerEngine MUST route through
PostProcessorPipelineEngine (POST-ULT). Grinding-specific cycles, dress commands, and gauge
integration codes injected by POST-ULT dialect layer — no inline G-code in assembler.

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Studer StuderWIN dialect — proprietary cycle codes, wheel/work axis naming (X1/Z1/C1), dress cycle format |
| U02 | Kellenberger KeVision dialect — KeVision HMI cycle structure, in-process gauge integration codes |
| U03 | Fanuc grinding dialect — standard G-code with grinding-specific M-codes, G31 skip, macro B for gauge loops |
| U04 | Siemens grinding dialect — CYCLE4xx grinding cycles, WAITM for gauge sync, ShopGrind conversational |
| U05 | Junker dialect — Junker proprietary codes, Quickpoint angular approach, high-speed peel grinding |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Dialect abstraction — GrindCycle interface: {rough, finish, sparkout, dress, gauge} → emit per controller |
| U07 | Cross-dialect validation — same cylindrical grind on all 5 controllers, verify output structure |


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

### GR-MS1: Machine Database — Grinder Types
**Priority: HIGH | Units: 8 | Depends on: MS0.5**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Cylindrical OD — Studer S33, Kellenberger Kel-Vera: between centers, chuck work, max swing, wheel speed range |
| U02 | Cylindrical ID — Studer S131, Jones & Shipman: small wheel high RPM (60-120k), quill deflection limits |
| U03 | Surface/reciprocating — Okamoto ACC-820DX, Chevalier FSG: magnetic chuck, cross-feed increment, table speed |
| U04 | Centerless — Cincinnati Milacron, Lidkoping: regulating wheel angle (1-5°), blade height, rounding stability |
| U05 | Creep-feed — Blohm Profimat, Magerle: high depth (0.5-5mm), low table speed (100-500mm/min), continuous dress |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | ID honing (adjacent) — Sunnen, Gehring: stone expansion, crosshatch angle, plateau finish |
| U07 | Machine capability abstraction — {type, axes, max_wheel_dia, max_rpm, gauge_option, dresser_type, coolant_type} |
| U08 | Machine auto-selector — part geometry + tolerance + finish → rank grinder type and model |


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

### GR-MS2: Wheel Selection — Score All 11 Specifications
**Priority: HIGH | Units: 9 | Depends on: MS0**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Abrasive type selector — Al2O3 (A, soft steels), CBN (B, hardened >45HRC), Diamond (D, carbide/ceramic), SiC (C, cast iron/non-ferrous) |
| U02 | Grit size selector — 46-60 rough, 80-120 finish, 150-320 superfinish. Score by Ra target and material removal rate |
| U03 | Grade (hardness) selector — E-H soft (hard materials), J-M medium, O-R hard (soft materials). Inverse rule: hard material → soft wheel |
| U04 | Structure selector — 1-4 dense (finish), 5-8 medium, 9-12 open (soft/gummy materials, creep-feed) |
| U05 | Bond type selector — V vitrified (precision), B resinoid (offhand/high-speed), M metal (electroplated CBN/diamond), E epoxy |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Wheel shape/size — Type 1 (straight), Type 5 (recessed), Type 11 (flaring cup), Type 6/11 ID. Diameter vs machine spindle |
| U07 | CBN/Diamond concentration — 25/50/75/100/125 concentration, layer depth (2-5mm), core material |
| U08 | Dressing specification — single-point diamond (form), rotary diamond (crush), blade (vitrified), no-dress (electroplated CBN) |
| U09 | Composite wheel score — weighted score across all 11 specs, top 3 recommendations with reasoning, supplier cross-ref (Norton/3M/Tyrolit) |


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

### GR-MS3: Workholding — Grinding-Specific Fixtures
**Priority: HIGH | Units: 6 | Depends on: MS0**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Between centers — dead center + drive dog (cylindrical OD), center hole quality check, 60° included angle |
| U02 | Magnetic chuck — fine-pole electroperm for surface grinding, holding force vs cut force check, demagnetize cycle |
| U03 | Collet chuck — 5C/16C/ER for cylindrical, concentricity spec (<0.005mm TIR), pull-back force |
| U04 | 3-jaw chuck — scroll chuck for large cylindrical, soft jaws for ground OD reference, grip force check |
| U05 | Centerless blade+regulating wheel — blade height = center height, regulating wheel angle = 1-5° for throughfeed rate |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Tests: 5 workholding setups on same shaft, verify holding force adequacy and TIR spec per method |


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

### GR-MS4: Gauging + Adaptive Spark-Out
**Priority: CRITICAL | Units: 8 | Depends on: MS1, MS2, MS3**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | G31 skip signal integration — probe touches part, skip signal fires, capture position in #5061 |
| U02 | In-process gauge cycle — wheel retract → gauge arm in → measure diameter → gauge arm out → compute remaining stock |
| U03 | Adaptive rough-to-finish transition — gauge reads within 0.02mm of target → switch from rough to finish parameters |
| U04 | Adaptive spark-out — continue zero-infeed passes until: (a) size within tolerance, OR (b) roundness < spec, OR (c) max passes reached |
| U05 | Post-process gauge — final measurement, SPC data logging, auto-compensate wheel wear offset for next part |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Dress compensation — after each dress cycle, advance wheel by dress_depth to maintain size. Track cumulative dress amount |
| U07 | Size control loop — macro B: WHILE[#100 GT #101] DO1 ... END1 (grind until size met) |
| U08 | Tests: 8 gauge scenarios (rough/finish transition, spark-out convergence, dress compensation, SPC logging) |


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

### GR-MS5: Form Profiles — Thread, Gear, Multi-Rib
**Priority: HIGH | Units: 7 | Depends on: MS4**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Thread grinding — single-rib wheel G33 synchronized traverse, multi-rib wheel plunge. Pitch accuracy ±0.002mm |
| U02 | Gear involute profile — generate involute curve points, dress wheel to conjugate form, index per tooth (C-axis) |
| U03 | Multi-rib form grinding — dress wheel to multi-step profile, plunge grind, continuous dress for form holding |
| U04 | Cam/lobe grinding — C-axis interpolation with X-axis for non-round profiles, lift table lookup |
| U05 | Radius form — R-dress wheel to concave/convex radius, single-plunge form grind |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Taper grinding — swivel table angle calculation, auto-set per taper spec (Morse, Brown & Sharpe, metric) |
| U07 | Tests: thread (M20×1.5), gear (20-tooth mod 2), multi-rib (3-step form), cam lobe, taper (Morse #3) |


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

### GR-MS6: Physics — Malkin, Jaeger, Verkerk, G-Ratio
**Priority: HIGH | Units: 12 | Depends on: MS0**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Malkin specific energy — u = u_ch + u_pl + u_sl. u_ch = chip formation (material-dependent), u_pl = plowing (grit-dependent), u_sl = sliding (wear-dependent) |
| U02 | u_ch values — steel 13-40 J/mm³, cast iron 12-25, aluminum 6-15, titanium 20-50, Inconel 25-60, carbide 80-120 |
| U03 | Jaeger burn threshold — θ_max = (u × a_e × v_w) / (k × √(π × α × l_c / v_s)). θ_max < T_temper for no burn |
| U04 | Burn temperature limits — carbon steel 350°C, alloy steel 400°C, HSS 550°C, CBN-ground hardened steel 700°C (higher wheel conductivity) |
| U05 | Verkerk kinematic roughness — Ra_kinematic = f(v_s, v_w, d_s, a_e, C, r). Theoretical minimum finish achievable |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | G-ratio (grinding ratio) — G = V_material_removed / V_wheel_worn. Al2O3: 20-80, CBN: 1000-5000, Diamond: 500-3000 |
| U07 | Wheel wear rate — V_wheel = V_material / G. Dress when cumulative wear exceeds form tolerance |
| U08 | Specific material removal rate — Q'w = a_e × v_w (mm³/mm·s). Limits: conventional 10-20, CBN 50-200, creep-feed 5-10 at deep ae |
| U09 | Power check — P = u × Q'w × b_w (wheel width). P < P_spindle_motor required |
| U10 | Dressing overlap ratio — U_d = b_d / (f_d per rev). U_d = 2-4 for rough, 5-8 for finish. Higher U_d = sharper wheel but more dress time |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U11 | Contact length — l_c = √(a_e × d_s) for surface, l_c = √(a_e × d_s × d_w / (d_s ± d_w)) for cylindrical (+ external, - internal) |
| U12 | Tests: burn threshold check on 4 materials, G-ratio tracking over 20-part run, Ra prediction vs Verkerk model |


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

### GR-MS7: Testing — 8 Parts x 4 Machine Types
**Priority: CRITICAL | Units: 8 | Depends on: ALL**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | P1 simple OD shaft — cylindrical OD traverse grind to h6, Studer + Kellenberger + Fanuc + Siemens |
| U02 | P2 stepped shaft — multiple diameters, shoulder grind, plunge + traverse combination |
| U03 | P3 ID bore — bore grinding to H7, small wheel high RPM, quill deflection check |
| U04 | P4 surface flat — surface grind to ±0.005mm flatness, magnetic chuck, reciprocating + cross-feed |
| U05 | P5 centerless throughfeed — 1000pc production run, blade height, regulating wheel setup |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | P6 creep-feed slot — deep slot (3mm) in Inconel, continuous dress, burn threshold validation |
| U07 | P7 thread grind — M20×1.5 ground thread, G33 sync, single-rib wheel, pitch accuracy check |
| U08 | P8 gear tooth — 20-tooth module 2 spur gear, involute profile, index per tooth |

---

## TEST MATRIX

### Parts (8):
| ID | Part | Material | Geometry | Tolerance | Ra Target | Key Challenge |
|----|------|----------|----------|-----------|-----------|---------------|
| P1 | OD shaft | 4140 58HRC | Ø40×200mm | h6 (±0.008mm) | 0.4µm | CBN wheel, spark-out convergence |
| P2 | Stepped shaft | 52100 60HRC | 3 diameters | h5 (±0.005mm) | 0.2µm | Shoulder blend, multi-plunge |
| P3 | ID bore | H13 50HRC | Ø25×50mm deep | H7 (±0.010mm) | 0.8µm | Small wheel, quill deflection |
| P4 | Surface flat | A2 60HRC | 200×100×25mm | ±0.005mm flat | 0.4µm | Magnetic chuck, thermal distortion |
| P5 | Centerless pin | 1045 | Ø12×80mm | h6 | 0.8µm | 1000pc throughfeed, rounding |
| P6 | Creep-feed slot | Inconel 718 | 3mm deep slot | ±0.02mm | 1.6µm | Burn risk, continuous dress |
| P7 | Thread | 4140 55HRC | M20×1.5 | ±0.002mm pitch | 0.4µm | G33 sync, single-rib dress |
| P8 | Gear tooth | 8620 case 60HRC | 20T mod 2 | DIN 5 | 0.4µm | Involute profile, C-axis index |

### Machines (4 types):
| ID | Machine | Controller | Type | Key Feature |
|----|---------|-----------|------|-------------|
| M1 | Studer S33 | StuderWIN | Cylindrical OD/ID | B-axis wheel swivel, dual wheel head |
| M2 | Okamoto ACC-820DX | Fanuc | Surface reciprocating | Magnetic chuck, auto cross-feed |
| M3 | Cincinnati CL-22 | Siemens 840D | Centerless | Regulating wheel, blade support |
| M4 | Blohm Profimat | Siemens 840D | Creep-feed | Continuous dress, high-pressure coolant |

### Compatibility:
| Part | M1 | M2 | M3 | M4 |
|------|:--:|:--:|:--:|:--:|
| P1-P2 | ✓ | ✗ | ✗ | ✗ |
| P3 | ✓ | ✗ | ✗ | ✗ |
| P4 | ✗ | ✓ | ✗ | ✓ |
| P5 | ✗ | ✗ | ✓ | ✗ |
| P6 | ✗ | ✗ | ✗ | ✓ |
| P7 | ✓ | ✗ | ✗ | ✗ |
| P8 | ✓ | ✗ | ✗ | ✗ |
**Total valid programs: 10**

---

## EXPANDED TEST MATRIX — 12 Real Industry Parts at Escalating Complexity

### Tier 1: Basic (Entry-Level Grinding)

| ID | Part | Material | Geometry | Tolerance | Ra Target | Key Challenge |
|----|------|----------|----------|-----------|-----------|---------------|
| G-P1 | Dowel pin OD grind | 4140 hardened 60HRC | Ø10mm × 50mm | h6 (±0.008mm) | 0.4µm | Simplest grinding job — single OD pass, CBN wheel, minimal spark-out |
| G-P2 | Gauge block surface grind | Tool steel (O1/A2) 62HRC | 25×25×10mm block | Flatness ≤0.001mm | 0.05µm (mirror) | Extreme flatness + finish, magnetic chuck demagnetize cycle, thermal soak required |
| G-P3 | Shaft journal OD traverse grind | 4340 hardened 58HRC | Ø50mm × 150mm journal | Roundness ≤2µm | 0.2µm | Traverse grind with crosshatch, steady rest required for L/D ratio, taper comp |

### Tier 2: Standard Production

| ID | Part | Material | Geometry | Tolerance | Ra Target | Key Challenge |
|----|------|----------|----------|-----------|-----------|---------------|
| G-P4 | Bearing race OD | 52100 bearing steel 62HRC | Ø80mm OD × 20mm wide | Roundness ≤0.5µm | 0.1µm | Sub-micron roundness, in-process gauging mandatory, controlled spark-out to size |
| G-P5 | Bearing race ID bore grind | 52100 bearing steel 62HRC | Ø65mm bore × 18mm deep | Roundness ≤0.5µm, cylindricity ≤1µm | 0.1µm | Small wheel high RPM, quill deflection compensation, bore geometry feedback loop |
| G-P6 | Centerless through-feed grind | 1045 medium carbon | Ø12mm × 100mm | h6 (±0.008mm) | 0.8µm | 1000 parts/hr production rate, regulating wheel angle calc, rounding effect control |

### Tier 3: Complex

| ID | Part | Material | Geometry | Tolerance | Ra Target | Key Challenge |
|----|------|----------|----------|-----------|-----------|---------------|
| G-P7 | Crankshaft multi-journal grind | 4340 forged 55HRC | 4 main + 4 rod journals, offset throws | Roundness ≤2µm per journal | 0.2µm | In-process gauging on every journal, steady rest repositioning, orbital/angular grinding for rod journals, journal-to-journal runout ≤5µm |
| G-P8 | Thread grinding single-rib | M2 HSS 64HRC | M16×2.0 thread, 50mm engagement | Pitch ≤±0.002mm, flank angle ±10' | 0.4µm | G33 synchronous spindle-to-work, single-rib wheel dress to 60° V-profile, multiple passes with depth increment, helix comp |
| G-P9 | Gear tooth profile form grind | 8620 case-hardened 60HRC | Module 3, 20° pressure angle, 24 teeth | DIN 4 profile, ≤4µm total | 0.3µm | Involute profile dressed onto wheel, C-axis indexing for each tooth, tip relief integration, profile + lead measurement |

### Tier 4: Extreme

| ID | Part | Material | Geometry | Tolerance | Ra Target | Key Challenge |
|----|------|----------|----------|-----------|-----------|---------------|
| G-P10 | Turbine blade root creep-feed slot | Inconel 718 (42HRC, high nickel) | 3mm wide × 25mm deep fir-tree slot | Profile ±0.015mm | 1.6µm | Maximum burn risk — Jaeger thermal model critical, continuous dress mandatory, high-pressure coolant 70+ bar, specific energy monitoring, cBN or SG wheel |
| G-P11 | Cam lobe profile grind | Chilled cast iron 55HRC | Non-circular cam profile, 40mm base circle, 8mm lift | Profile ±5µm | 0.2µm | C-axis interpolation for non-circular profile, lift curve digitized to profile data, X-C synchronization at variable angular velocity, in-process profile measurement |
| G-P12 | PCD tool blank OD grind | Polycrystalline diamond (PCD) on carbide substrate | Ø16mm × 10mm PCD layer | ±0.005mm | 0.1µm | Diamond wheel mandatory (resin bond diamond on diamond), extreme hardness ~8000 HV, very low MRR, EDM-assisted grinding may be needed, thermal damage to PCD bond layer |

### Expanded Machine Set (6 machines):

| ID | Machine | Controller | Type | Key Feature |
|----|---------|-----------|------|-------------|
| M1 | Studer S33 | StuderWIN | Universal cylindrical OD/ID | B-axis wheel swivel, dual wheel head, automatic in-process gauging |
| M2 | Okamoto ACC-820DX | Fanuc 0i-GC | Surface reciprocating | Magnetic chuck, auto cross-feed, creep-feed capable |
| M3 | Cincinnati CL-22 | Siemens 840D | Centerless through-feed/plunge | Regulating wheel, blade support, angular adjustment |
| M4 | Blohm Profimat MT | Siemens 840D | Creep-feed / profile | Continuous dress, high-pressure coolant, deep slot capable |
| M5 | Kellenberger Kel-Vista | KeVision | Universal cylindrical OD/ID | Hydrostatic spindle, nanometer resolution, in-process gauging |
| M6 | Studer S41 | StuderWIN | Large cylindrical + crankshaft | Extended center distance, orbital grinding mode, heavy-duty |

### Expanded Compatibility Grid:

| Part | M1 Studer S33 | M2 Okamoto | M3 Cincinnati CL | M4 Blohm Profimat | M5 Kellenberger | M6 Studer S41 |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| G-P1 (dowel OD) | ✓ | ✗ | ✓ | ✗ | ✓ | ✓ |
| G-P2 (gauge block) | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ |
| G-P3 (shaft journal) | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ |
| G-P4 (bearing OD) | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ |
| G-P5 (bearing ID) | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| G-P6 (centerless) | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| G-P7 (crankshaft) | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| G-P8 (thread) | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ |
| G-P9 (gear tooth) | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ |
| G-P10 (turbine slot) | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| G-P11 (cam lobe) | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ |
| G-P12 (PCD blank) | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |

**Valid programs per machine**: M1: 7 | M2: 1 | M3: 2 | M4: 2 | M5: 7 | M6: 5
**Total valid programs (expanded): 24**

### Controller Coverage Matrix:

| Controller | Machines | Dialect Exercised | Parts Covered |
|-----------|----------|-------------------|---------------|
| StuderWIN | M1, M6 | Studer dialect | G-P1,3,4,5,7,8,9,11,12 |
| KeVision | M5 | Kellenberger dialect | G-P1,3,4,5,8,9,11,12 |
| Fanuc 0i-GC | M2 | Fanuc grind dialect | G-P2 |
| Siemens 840D | M3, M4 | Siemens grind dialect | G-P2,6,9,10 |

### Escalation Logic:
```
Tier 1 validates: basic cycle generation, wheel speed calc, single-pass programs
Tier 2 validates: in-process gauging, sub-micron tolerances, production throughput
Tier 3 validates: multi-axis sync (G33, C-axis), complex profiles, adaptive spark-out
Tier 4 validates: thermal models (Jaeger), exotic materials, edge-case geometries
```

---

## EXECUTION ORDER

```
Phase 1: MS0 (collision) → MS0.5 (dialects)                [15 units, SAFETY]
Phase 2: MS6 (physics, parallel OK)                         [12 units, PHYSICS]
Phase 3: MS1 + MS2 + MS3 (parallel)                         [23 units, MACHINES + WHEELS + WORKHOLDING]
Phase 4: MS4 (gauging + adaptive spark-out)                  [8 units, THE CRITICAL BUILD]
Phase 5: MS5 (form profiles)                                 [7 units, ADVANCED GEOMETRY]
Phase 6: MS7 (exhaustive validation)                         [8 units, TESTING]
```

## FINAL TARGET: 96 tests, 100% pass rate

### MINIMUM TEST BASELINE GATE (Phase 5 prerequisite)
```
GRINDING minimum: 30+ dedicated tests before Phase 5 milestones
Current baseline: 0/0 (no grinding-specific tests)
Gap: 30+ tests needed — surface/cylindrical/centerless, dress cycles, thermal damage
Validation: match-then-improve against Studer/Norton/Malkin reference data
  Step 1: Match published specific energy values within ±15% per ISO material group
  Step 2: Improve with thermal damage prediction and wheel wear compensation
```

### MACHINE-TYPE SELECTOR REFERENCE
```
Input: part geometry (size, features, tolerances) + material + batch size
Output: ranked machine type recommendation
Engine: MachineTypeSelectorEngine (shared across all 8 machine roadmaps)
Grinding selection criteria: tight tolerances (±0.005mm), surface finish < Ra 0.4µm,
  hardened materials (>45 HRC), cylindrical OD/ID, flat surfaces requiring flatness
Contra-indicators: stock removal only (→ milling), soft material (→ turning/milling)
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