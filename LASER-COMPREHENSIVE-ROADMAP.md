# PRISM LASER COMPREHENSIVE ROADMAP v1.0
## Flat Sheet Laser Pipeline | 8 Milestones | 55 Units | 120+ Target Tests

Generated: 2026-03-23
Current state: LaserProgramAssemblerEngine — 2,013 lines, USABLE, 7 dialects, nesting wired, MC 500
Test baseline: needs establishment (MS6)

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

SKILLS: /smart laser cutting process engineer + thermal specialist, /forge-triple,
  /prism-review, /test, /physics-verify, /program-validate

MASTER KNOWLEDGE SOURCES FOR ALL LASER SESSIONS:
  ENGINES: LaserProgramAssemblerEngine (2,013L — 7 dialects, nesting, MC 500),
    NestingOptimizationEngine, SheetUtilizationEngine
  TRIBAL TIPS: Laser-specific tips across all 18 CAM systems,
    MachiningPlaybookEngine laser rules
  FORMULAS: Schulz thermal model for laser cutting (kerf width = f(power, speed, focus, gas)),
    pierce time model (t_pierce = C × thickness^n × material_factor),
    cut speed vs thickness (speed ∝ power / (thickness × material_absorptivity)),
    heat affected zone (HAZ = f(power_density, interaction_time, thermal_diffusivity))
  CONSTANTS: Gas assist pressures (N2: 12-20 bar for stainless, O2: 0.5-6 bar for mild steel,
    air: 6-10 bar for aluminum), beam quality (BPP) by laser source type
  REFERENCE: TRUMPF TruLaser application data, Bystronic ByStar fiber specs,
    Amada ENSIS application guides, Mazak OptiPlex technical data
  KEY PHYSICS: Beam focus position (in/on/below surface for different materials),
    assist gas selection (O2 exothermic for mild steel, N2 inert for stainless/aluminum),
    pierce strategies (pulse pierce for thick, CW pierce for thin, ramp pierce for reflective),
    nesting optimization (common-line cutting, part spacing, sheet utilization %)

4-LOOP + FORGE-TRIPLE + AGENT HOOKS (MANDATORY per unit):
  LOOP 1 — SCRUTINIZE: /prism-review + /scrutinize + agent hook verifies Schulz thermal model
  LOOP 2 — GAP FILL: /test + /trace wiring + agent hook checks integration
  LOOP 3 — TIE UP: no TODOs, reasoning[], golden snapshot
  LOOP 4 — VALIDATE: Re-run /prism-review on fixes, findings MUST decrease, full test suite → 0 failures
  FORGE-TRIPLE: engine + protective hook + MCP action + skill per milestone
  /compact every 3 units (auto-triggered)

PHYSICS FUSION INTEGRATION (ALL parameter milestones — fusion_tier >= 2 MANDATORY):
  Every process parameter computation MUST use PhysicsFusionOrchestratorEngine (fusion_tier >= 2).
  Tier 1 (single-pass) NOT acceptable for production — multi-model convergence required.
  Action: physics_fusion via calcDispatcher.
  Laser-specific physics (Schulz thermal model, kerf width, HAZ, pierce time) use
  dedicated engines PLUS the fusion convergence loop for coupled thermal effects.
  Future: LaserThermal plugin for the fusion convergence loop (extends PhysicsPlugin).
  Outputs: cut_speed_mm_min, kerf_mm, HAZ_mm, pierce_time_s, gas_consumption, confidence.
  Inputs REQUIRED: laser type (fiber/CO2/disk), power_W, material (type/thickness/reflectivity),
    assist gas (type/pressure), focus position, nozzle diameter, machine limits.
  See: PhysicsFusionOrchestratorEngine.ts + 5 plugins in src/engines/plugins/

IN-PROCESS SENSING (add to relevant milestones):
  Capacitive height sensing: real-time focus distance control during cutting.
  Sheet thickness verification: through-beam or contact probe for material verification.
  Pierce feedback: detect pierce completion from reflected light/plasma sensor.
  Nozzle standoff calibration: auto-calibrate nozzle distance to sheet surface.
  Sheet warp mapping: multi-point height measurement for Z-compensation on warped sheets.
  Applies to: LAS-MS1 (machine database), LAS-MS3 (thick plate), LAS-MS5 (advanced).
```

## PER-MILESTONE COMPREHENSIVE KNOWLEDGE SOURCES

### LASER-MS0: Profile Cutting Basics
```
ENGINES:
  - LaserProgramAssemblerEngine (2,013L) — 7 dialects, nesting, MC 500
  - NestingOptimizationEngine — part arrangement on sheet
  - SheetUtilizationEngine — material usage tracking
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — laser cutting rules ("always pierce before cutting, never start on edge")
  - src/data/*-cam-tips.ts — laser cutting tips across 18 CAM systems
  - tribal tips: "lead-in arc, not straight — straight lead-in leaves witness mark"
FORMULAS:
  - Cut speed: v = P / (k × t × ρ × Cp × ΔT) where P=power, t=thickness, ρ=density
  - Kerf width: kerf = beam_diameter + 2 × HAZ (heat affected zone)
  - Pierce time: t_pierce = C × thickness^n × material_factor
  - Gas consumption: flow_rate × cut_time + pierce_purge_time
REFERENCE:
  - TRUMPF TruLaser application data tables (speed × thickness × material × gas)
  - Bystronic ByStar fiber cutting parameters
  - ISO 9013 — thermal cutting quality classes (perpendicularity, roughness)

INTENT: A machinist loads a sheet of 3mm mild steel, uploads a DXF profile, and gets a
  laser program with: pierce sequence → lead-in arc → profile cut → lead-out → next part.
  Cut speed, gas pressure, focus position, and power must be correct for THIS material
  and THIS thickness — wrong gas pressure = dross on bottom edge = reject.
```

### LASER-MS1: Material-Specific Parameters
```
ENGINES:
  - LaserProgramAssemblerEngine — material parameter lookup
  - MaterialSelectionEngine — material identification + properties
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "O2 for mild steel (exothermic), N2 for stainless (inert, clean edge)"
  - tribal tips: "aluminum reflects laser — use high power + ramped pierce"
    "brass/copper reflect even more — fiber laser only, CO2 can't cut"
FORMULAS:
  - Mild steel + O2: exothermic reaction adds ~60% energy → faster cut, oxidized edge
  - Stainless + N2: inert gas, clean edge, NO oxide → but 50% slower (no exothermic assist)
  - Aluminum + N2: high reflectivity + high thermal conductivity → need 2-3× power vs steel
  - Focus position: IN material for O2 steel, ON surface for N2 stainless, ABOVE for aluminum
  - Gas pressure: O2 0.5-6 bar (low for thick), N2 12-20 bar (high for clean edge)
REFERENCE:
  - TRUMPF material parameter database (power × speed × gas × focus × nozzle per material+thickness)
  - Bystronic ByOptimizer cutting data
  - Published laser absorption coefficients per material per wavelength (1μm fiber vs 10.6μm CO2)

INTENT: Same laser, same power — mild steel cuts at 5 m/min, stainless at 3 m/min,
  aluminum at 2 m/min (same thickness). Wrong gas type on stainless = oxidized edge = reject
  for food/medical applications. PRISM must auto-select gas + pressure + focus + power.
```

### LASER-MS2-MS5: Pierce + Nesting + Quality + Tube
```
MS2 SOURCES (Pierce):
  - Pierce strategies: pulse (thick plate — controlled energy), CW (thin — fast),
    ramp (reflective materials — gradually increase power), pre-pierce (thick plate —
    pierce all holes first, then cut — reduces thermal distortion)
  - Published pierce time data per material+thickness
  - TRUMPF SmartPierce technology documentation

MS3 SOURCES (Nesting):
  - NestingOptimizationEngine — bin-packing algorithms for sheet layout
  - Common-line cutting: shared edges between adjacent parts (saves 1 kerf width per shared edge)
  - Part spacing rules: min gap = kerf + HAZ + thermal stability margin
  - Sheet utilization target: >85% for production, >70% acceptable
  - Published nesting optimization algorithms (bottom-left fill, genetic, simulated annealing)

MS4 SOURCES (Quality Features):
  - Lead-in/lead-out: arc entry (radius = 1-3mm), tangent exit
  - Micro-joints (tabs): 0.2-0.5mm uncut bridges to prevent part tip-up
  - Corner loops: small circles at sharp corners to prevent burn-through
  - Start point optimization: start on waste side, never on finished edge
  - Published laser cutting quality standards (ISO 9013 classes)

MS5 SOURCES (Tube Laser):
  - Rotary axis programming: C-axis rotation synchronized with Z-axis travel
  - Seam detection: avoid cutting through weld seam (weakest point)
  - Intersection trimming: tube-to-tube joints with cope/miter profiles
  - Support structures: prevent tube sagging during cut
  - TRUMPF TruLaser Tube specifications

INTENT: Pierce strategy determines whether thick plate starts cleanly (pulse) or blows
  through with spatter (CW). Nesting at 90% utilization vs 70% = 20% material savings on
  every sheet. Micro-joints prevent parts from tipping into the beam = fire hazard. Tube
  laser adds rotary axis — seam avoidance is critical (cut through weld = weak joint).
```

### LASER-MS6-MS8: Controllers + Testing
```
MS6-MS7 SOURCES (Controllers):
  - TRUMPF: TruControl programming (machine-specific, proprietary format)
  - Bystronic: BySoft 7 / ByVision programming
  - Amada: AMNC 3i programming (ENSIS fiber + CO2 hybrid)
  - Mazak: Mazatrol/Smart System programming for OptiPlex
  - Mitsubishi: CNC-specific laser cycles
  - Fanuc: standard G-code + laser-specific M-codes (beam on/off, gas select, focus)
  - Controller assertion library (from Phase 0-C) — laser-specific assertions

MS8 SOURCES (Testing):
  - Sheet metal bracket (mild steel 3mm) — basic profile + holes
  - Chassis plate (aluminum 6mm) — complex contour + large cutouts
  - Cover panel (stainless 1.5mm) — cosmetic edge quality critical
  - Tube frame (mild steel 50×50×3mm) — rotary axis + intersections
  - Cross-material: same bracket in mild steel + stainless + aluminum → different parameters
  - Cross-thickness: same material at 1mm, 3mm, 6mm, 12mm → different speed/gas/power
  - Golden snapshots from MS0-MS5

INTENT: Laser controllers are HIGHLY proprietary — TRUMPF doesn't use standard G-code at all.
  Testing must prove correct output for sheet metal (the 80% use case) AND tube (growing market).
  Cross-material and cross-thickness validation ensures parameters are correct across the full
  range, not just one sweet-spot combination.
```

---

## CURRENT STATE (What's Built)

### Engine (existing, working):
| Engine | Lines | Status |
|--------|-------|--------|
| LaserProgramAssemblerEngine | 2,013 | 7 dialects, nesting wired, MC 500, profile cutting |
| **TOTAL LASER CODE** | **~2,013** | |

### Dialect Support (7):
- Fanuc laser (generic G-code + M-codes for laser on/off/power)
- Siemens 840D laser
- TRUMPF TruTops
- Bystronic BySoft
- Mazak Optiplex (Mazatrol + G-code hybrid)
- Amada AMNC
- Generic (ISO G-code baseline)

### Physics Models (to be named/hardened):
| Model | Formula | Purpose |
|-------|---------|---------|
| Schulz cutting speed | V = K × P / (t^n × ρ × c × ΔT) | Max feed rate by power/thickness |
| Beer-Lambert absorption | I = I₀ × exp(-αz) | Beam penetration depth |
| Yilbas roughness | Rz = C × t^0.4 × V^0.3 / P^0.5 | Surface roughness prediction |
| Carslaw HAZ | d_HAZ = 2√(αt) | Heat-affected zone width |
| Swift-Hook weld penetration | d = P / (V × w × ρ × [c×ΔT + L]) | Penetration depth (also applies to cutting kerf) |

---

## CRITICAL ARCHITECTURAL ISSUES

### Issue 1: No Collision Avoidance
Nozzle vs clamp collision is completely unchecked. Nozzle standoff distance is not validated against sheet warpage or clamp height.
**Fix**: LAS-MS0 — nozzle/clamp collision + standoff validation.

### Issue 2: No Machine Database
All output assumes generic capabilities. No distinction between fiber vs CO2, no power range limits, no bed size constraints.
**Fix**: LAS-MS1 — machine capability database.

### Issue 3: No Process Auto-Selection
Fiber vs CO2, O₂ vs N₂ assist gas — these are material-dependent decisions that are currently manual.
**Fix**: LAS-MS2 — auto-process selection matrix.

---

## MILESTONE DETAILS

### LAS-MS0: Collision Avoidance — Nozzle vs Fixtures
**Priority: CRITICAL | Units: 6 | Depends on: nothing**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Clamp zone exclusion — define clamp positions on sheet, generate no-go zones with clearance radius (clamp_radius + 15mm) |
| U02 | Nozzle standoff validation — check programmed Z vs actual sheet height including thermal warpage estimate (bow = α×ΔT×L²/8t) |
| U03 | Sheet edge clearance — nozzle must not overshoot sheet boundary, auto-retract or extend lead-out to remain on material |
| U04 | Repositioner collision — when using sheet repositioners (shuttle table), verify head parks before table moves |
| U05 | Head tilt collision (5-axis) — for bevel cutting heads, swept volume of tilted nozzle vs clamps and sheet edge |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Tests: 8 collision scenarios (clamp hit, edge overshoot, warped sheet, 5-axis tilt), verify all caught |


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

### LAS-MS0.5: Dialect Hardening — 7 Controller Outputs + POST-ULT Pipeline
**Priority: CRITICAL | Units: 7 | Depends on: nothing**

**POST-ULT INTEGRATION:** All output from LaserProgramAssemblerEngine MUST route through
PostProcessorPipelineEngine (POST-ULT). Laser power commands, pierce sequences, gas assist
codes, and nesting headers injected by POST-ULT — no inline format strings in assembler.

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Fanuc laser dialect — M-codes for beam on/off (M80/M81), power via S-word, pierce dwell G04, pulsed mode |
| U02 | Siemens 840D laser — LASER_ON/LASER_OFF cycles, power via analog output, synchronized actions for corner modulation |
| U03 | TRUMPF TruTops — native TRUMPF format, technology tables by material+thickness, automatic parameter lookup |
| U04 | Bystronic BySoft — BySoft 7 format, ByVision control, parameter sets per material/gas combination |
| U05 | Mazak Optiplex — MAZATROL laser format + G-code fallback, FX/SGM smart functions |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Amada AMNC — AMNC format, auto-nozzle selection, WACS water-assisted cutting commands |
| U07 | Tests: same 100×100mm square on all 7 dialects, verify structural differences (not just cosmetic) |


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

### LAS-MS1: Machine Database — Fiber vs CO2 Capabilities
**Priority: HIGH | Units: 7 | Depends on: MS0**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Machine capability schema — laser_type (fiber/CO2/direct_diode), power_kW, bed_size_mm, max_thickness_by_material, axis_count, max_feed_m_min |
| U02 | Fiber laser fleet — TRUMPF TruLaser 3030/5030, Bystronic ByStar Fiber, Mazak Optiplex 3015 Fiber, Amada ENSIS, IPG generic |
| U03 | CO2 laser fleet — TRUMPF TruLaser 3030 CO2, Mazak Optiplex CO2, Mitsubishi ML, Amada FO-MII, Cincinnati CL-800 |
| U04 | Combo/specialty — TRUMPF TruLaser Cell (3D), tube laser specs, direct diode parameters |
| U05 | Auto-machine selector — input material+thickness+quantity → rank machines by capability, speed, cost |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Power validation — verify requested cut parameters do not exceed machine rated power (continuous vs peak) |
| U07 | Tests: 5 material/thickness combos → correct machine ranking, reject impossible combinations |


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

### LAS-MS2: Auto-Process Selection — Laser Type × Assist Gas
**Priority: HIGH | Units: 8 | Depends on: MS1**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Fiber + N₂ rules — mild steel ≤6mm (clean edge, no oxide), stainless all thicknesses, aluminum all thicknesses |
| U02 | Fiber + O₂ rules — mild steel >6mm (exothermic boost, faster but oxide edge), structural steel |
| U03 | CO2 + O₂ rules — thick mild steel >20mm, legacy machines, consistent edge on heavy plate |
| U04 | CO2 + N₂ rules — stainless/aluminum on CO2 machines (lower quality than fiber, but usable) |
| U05 | Specialty gases — argon for titanium (prevent embrittlement), compressed air for non-critical cuts (cheapest) |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Gas pressure auto-set — thickness-dependent: thin=high pressure (blow-through), thick=moderate (maintain kerf) |
| U07 | Auto-selection engine — material + thickness + edge_requirement + machine → laser_type + gas + pressure |
| U08 | Tests: 12 material/thickness combinations, verify correct gas and laser type selection vs published charts |


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

### LAS-MS3: Corner Modulation — Power & Speed Control
**Priority: HIGH | Units: 7 | Depends on: MS0.5**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Corner detection — scan toolpath for direction changes >15°, classify as gentle (15-45°), moderate (45-90°), sharp (90-180°) |
| U02 | Speed reduction — decelerate before corner: V_corner = V_cut × (R_corner / R_threshold), minimum 10% of cutting speed |
| U03 | Power reduction — reduce power proportional to speed to maintain constant energy density: P_corner = P_cut × (V_corner / V_cut) |
| U04 | Pulsed mode at corners — switch from CW to pulsed at sharp corners to prevent burn-through on thin material |
| U05 | Lead-in arc at corners — optional micro-loop at sharp corners for thermal management (radius = kerf_width × 3) |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Overburn prevention — dwell time = 0 at corners for thin material, controlled micro-pause for thick (prevent melt pooling) |
| U07 | Tests: 6 corner angle scenarios × 3 thicknesses = 18 tests, verify no burn-through and no undercut |


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

### LAS-MS4: Nesting Optimization — Common-Line & Tabs
**Priority: HIGH | Units: 8 | Depends on: MS0, MS1**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Common-line cutting — detect adjacent parallel edges, merge into single cut (50% time savings on paired parts) |
| U02 | Tab auto-placement — auto-add micro-tabs by part weight: <0.5kg=no tab, 0.5-5kg=2 tabs, >5kg=4 tabs, tab width = 0.3-1.0mm |
| U03 | Scrap skeleton optimization — minimize skeleton connections, ensure skeleton lifts as one piece without snagging |
| U04 | Part spacing rules — minimum gap = kerf_width + 2mm (thermal), +5mm for thick material (>10mm) |
| U05 | Cut sequencing — inside features first, then profile, outermost parts last, thermal drift compensation by alternating quadrants |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Sheet utilization reporting — material utilization %, remnant tracking, cost per part breakdown |
| U07 | Grain direction constraint — allow user to lock part rotation for grain-sensitive materials (spring steel, perforated patterns) |
| U08 | Tests: 5 nesting scenarios (single part, 50-part nest, common-line pair, heavy parts with tabs, grain-locked), verify utilization >85% |


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

### LAS-MS5: Physics Naming & Model Hardening
**Priority: MEDIUM | Units: 5 | Depends on: MS2, MS3**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Schulz cutting speed hardening — calibrate K, n constants per material/gas combination, validate against manufacturer speed charts |
| U02 | Beer-Lambert absorption model — α coefficient by material and laser wavelength (1.06µm fiber vs 10.6µm CO2), predict pierce time |
| U03 | Yilbas roughness prediction — calibrate C constant, validate Rz prediction within ±20% of measured values |
| U04 | Carslaw HAZ + Swift-Hook kerf — predict HAZ width and kerf width, auto-compensate toolpath offset = kerf/2 |
| U05 | Tests: 6 material/thickness combos, verify cutting speed within ±10% of Schulz, Rz within ±20% of Yilbas |


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

### LAS-MS6: Comprehensive Test Suite — 10 Benchmark Parts
**Priority: CRITICAL | Units: 7 | Depends on: ALL**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | P1: Simple bracket — 3mm mild steel, 4 holes + rectangular profile, basic validation |
| U02 | P2: Complex contour — 6mm stainless, spline curves, acute angles, small radii R1-R3 |
| U03 | P3: Thick plate — 20mm mild steel, O₂ assist, slow speed, heavy slug management |
| U04 | P4: Aluminum panel — 4mm 5052-H32, N₂ assist, high reflectivity considerations for CO2 |
| U05 | P5: Perforated screen — 1.5mm stainless, 500+ holes Ø3mm, thermal distortion management |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | P6-P8: Gear blank + spring steel strip + decorative panel — medium complexity, grain/orientation constraints |
| U07 | P9-P10: Medical stent on tube (5-axis) + 25mm titanium plate (argon assist) — extreme difficulty |

### Test Matrix:
| Part | Fanuc | Siemens | TRUMPF | Bystronic | Mazak | Amada | Generic |
|------|:-----:|:-------:|:------:|:---------:|:-----:|:-----:|:-------:|
| P1-P5 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| P6-P8 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| P9 (tube) | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |
| P10 (Ti) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
**Total valid programs: 66**

---

## EXPANDED TEST MATRIX — 12 Real Industry Parts at Escalating Complexity

### Tier 1: Basic (Entry-Level Laser Cutting)

| ID | Part | Material | Thickness | Geometry | Key Challenge |
|----|------|----------|-----------|----------|---------------|
| L-P1 | Simple bracket | Mild steel (A36) | 1.5mm | Single rectangular profile + 2 mounting holes | THE simplest laser job — O₂ assist, single contour, basic lead-in/out |
| L-P2 | Gasket | 304 stainless | 1mm | Closed contour with smooth radii, no sharp corners | N₂ assist for clean edge, no oxidation, Ra validation |
| L-P3 | Electrical panel cutout | Galvanized steel | 1.2mm | Rectangular holes + round holes in flat panel | Zinc coating fume management, multiple small features, micro-joint tabs |

### Tier 2: Standard Production

| ID | Part | Material | Thickness | Geometry | Key Challenge |
|----|------|----------|-----------|----------|---------------|
| L-P4 | Perforated screen | 5052-H32 aluminum | 2mm | 500+ holes in rectangular pattern, Ø4mm holes | Head travel optimization (nearest-neighbor vs serpentine), thermal distortion from cumulative heat, N₂ assist |
| L-P5 | Nested bracket sheet (production) | Mild steel (A36) | 1.5mm | 200 identical brackets on 1500×3000mm sheet | Common-line cutting, micro-tabs for slug retention, nesting utilization ≥85%, skeleton management |
| L-P6 | Architectural panel | Corten steel (A588) | 3mm | 3000×1500mm artistic pattern with organic curves | Large format thermal growth compensation, sheet sag on slats, weathering steel specific parameters |

### Tier 3: Complex

| ID | Part | Material | Thickness | Geometry | Key Challenge |
|----|------|----------|-----------|----------|---------------|
| L-P7 | Thick armor plate profile | AR500 hardened plate | 12mm | Complex profile with notches and acute angles | High power (6kW+), very slow feed, dross management on bottom edge, O₂ vs N₂ tradeoff (speed vs quality), slug drop safety |
| L-P8 | Roll cage tube joints | DOM tubing 1.5" × 0.120" wall | 3mm wall | 3D saddle copes, miters, fish-mouth joints | 3D tube laser (rotary + linear), saddle intersection geometry, tube end prep, weld-fit validation |
| L-P9 | Multi-material sheet | Steel 2mm + Aluminum 3mm | Mixed | Side-by-side materials on same sheet | Mid-program gas change (O₂→N₂), power change (4kW→2kW), focus shift, material boundary detection |

### Tier 4: Extreme

| ID | Part | Material | Thickness | Geometry | Key Challenge |
|----|------|----------|-----------|----------|---------------|
| L-P10 | Medical stent on tube | Nitinol (NiTi shape memory alloy) | 0.1mm wall, 2mm dia tube | Micro strut pattern, 0.15mm strut width | Micro pulsed cutting, heat control critical (shape memory transformation), 5-axis rotary, HAZ ≤20µm, sub-mm feature validation |
| L-P11 | Copper heat sink fins | C110 pure copper | 1mm | Fine fin array, 0.5mm spacing | HIGHEST reflectivity material — back-reflection protection mandatory, green/blue laser preferred (515nm/450nm), fiber 1µm near-impossible, power ramp strategy |
| L-P12 | Thick titanium profile | Ti-6Al-4V Grade 5 | 6mm | Complex aerospace bracket with fillets | Inert gas mandatory (argon trailing shield), zero oxidation tolerance, α-case prevention, moderate speed, high power, kerf width comp for precision |

### Expanded Machine Set (6 machines):

| ID | Machine | Controller | Laser Type | Power | Bed Size | Key Feature |
|----|---------|-----------|-----------|-------|----------|-------------|
| M1 | TRUMPF TruLaser 3030 | TRUMPF TruTops | Fiber (TruDisk) | 6kW | 3000×1500mm | Highspeed Eco, automatic nozzle changer, collision protection |
| M2 | Bystronic ByStar Fiber | Bystronic BySoft 7 | Fiber | 10kW | 3000×1500mm | Bystronic cutting technology (BeamShaper), high power thick cutting |
| M3 | Mazak Optiplex 3015 | Mazak PreviewG / Mazatrol | Fiber | 8kW | 3000×1500mm | Mazak Smart System, auto focus, beam parameter product switching |
| M4 | Amada ENSIS-3015 | Amada AMNC 3i | Fiber (ENSIS technology) | 9kW | 3000×1500mm | Variable beam control, thin-to-thick without lens change |
| M5 | TRUMPF TruLaser Tube 5000 | TRUMPF TruTops Tube | Fiber | 3kW | Tube up to Ø152mm | 3D tube laser, saddle cope, rotary axis, automatic loading |
| M6 | IPG/custom micro cutting | Fanuc 31i-LB | Green fiber (515nm) | 500W pulsed | 300×300mm | Micro cutting, pulsed mode, rotary 5-axis for stents |

### Expanded Compatibility Grid:

| Part | M1 TRUMPF 3030 | M2 Bystronic | M3 Mazak | M4 Amada | M5 TRUMPF Tube | M6 Micro/Green |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| L-P1 (bracket) | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| L-P2 (gasket) | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| L-P3 (panel cutout) | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| L-P4 (perforated) | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| L-P5 (nested prod) | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| L-P6 (architectural) | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| L-P7 (AR500 thick) | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| L-P8 (tube joints) | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| L-P9 (multi-material) | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| L-P10 (stent) | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| L-P11 (copper) | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| L-P12 (titanium) | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |

**Valid programs per machine**: M1: 9 | M2: 9 | M3: 9 | M4: 9 | M5: 1 | M6: 2
**Total valid programs (expanded): 39**

### Controller Coverage Matrix:

| Controller | Machines | Dialect Exercised | Parts Covered |
|-----------|----------|-------------------|---------------|
| TRUMPF TruTops | M1 | TRUMPF flat dialect | L-P1–P7, P9, P12 |
| TRUMPF TruTops Tube | M5 | TRUMPF tube dialect | L-P8 |
| Bystronic BySoft 7 | M2 | Bystronic dialect | L-P1–P7, P9, P12 |
| Mazak PreviewG | M3 | Mazak dialect | L-P1–P7, P9, P12 |
| Amada AMNC 3i | M4 | Amada dialect | L-P1–P7, P9, P12 |
| Fanuc 31i-LB | M6 | Fanuc laser dialect | L-P10, P11 |
| Siemens 840D (generic) | — | Siemens laser dialect | All flat parts (alternative post) |

### Escalation Logic:
```
Tier 1 validates: basic profile cutting, lead-in/out, pierce, gas selection
Tier 2 validates: nesting optimization, production throughput, large format handling
Tier 3 validates: thick plate parameters, 3D tube cutting, mid-program parameter changes
Tier 4 validates: micro cutting, reflective materials, inert gas shielding, exotic alloys
```

---

## EXECUTION ORDER

```
Phase 1: MS0 + MS0.5 (parallel)                         [13 units, SAFETY + DIALECTS]
Phase 2: MS1 (machine database)                          [7 units, FOUNDATION]
Phase 3: MS2 + MS3 (parallel)                            [15 units, PROCESS + CORNERS]
Phase 4: MS4 + MS5 (parallel)                            [13 units, NESTING + PHYSICS]
Phase 5: MS6 (exhaustive validation)                     [7 units, TESTING]
```

## FINAL TARGET: 120+ tests across 66 programs, 100% pass rate

### MINIMUM TEST BASELINE GATE (Phase 5 prerequisite)
```
LASER minimum: 30+ dedicated tests before Phase 5 milestones
Current baseline: needs establishment
Gap: 30+ tests needed — cut speed, pierce, kerf width, nesting, dialect, thermal
Validation: match-then-improve against TRUMPF/Bystronic published cutting data
  Step 1: Match published cut speeds within ±10% per material/thickness/gas
  Step 2: Improve with Schulz thermal model convergence and HAZ prediction
```

### MACHINE-TYPE SELECTOR REFERENCE
```
Input: part geometry (size, features, tolerances) + material + batch size
Output: ranked machine type recommendation
Engine: MachineTypeSelectorEngine (shared across all 8 machine roadmaps)
Laser selection criteria: flat sheet cutting, thin to medium thickness (0.5-25mm),
  high volume (nesting efficiency), mild steel/stainless/aluminum, clean edges
Contra-indicators: thick material >25mm (→ waterjet/plasma), 3D parts (→ milling),
  non-flat stock (→ machining), heat-sensitive material (→ waterjet)
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