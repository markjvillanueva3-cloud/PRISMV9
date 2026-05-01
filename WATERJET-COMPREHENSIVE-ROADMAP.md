# PRISM WATERJET COMPREHENSIVE ROADMAP v1.0
## Abrasive & Pure Waterjet Pipeline | 8 Milestones | 50 Units | 110+ Target Tests

Generated: 2026-03-23
Current state: WaterjetProgramAssemblerEngine — 2,106 lines, USABLE, 6 dialects, nesting wired, MC 500
Test baseline: needs establishment (WJ-MS6)

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

SKILLS: /smart waterjet process engineer + abrasive cutting specialist, /forge-triple,
  /prism-review, /test, /physics-verify, /program-validate

MASTER KNOWLEDGE SOURCES FOR ALL WATERJET SESSIONS:
  ENGINES: WaterjetProgramAssemblerEngine (2,106L — 6 dialects, nesting, MC 500),
    NestingOptimizationEngine, SheetUtilizationEngine
  TRIBAL TIPS: Waterjet-specific tips across all 18 CAM systems,
    MachiningPlaybookEngine waterjet rules
  FORMULAS: Zeng-Kim abrasive waterjet model (depth_of_cut = f(pressure, flow, abrasive_rate, speed)),
    kerf width model (kerf = nozzle_ID + 2 × standoff × tan(jet_spread_angle)),
    taper compensation (tilt head to counter natural taper),
    surface roughness zones (smooth/transition/rough vs depth from top surface)
  CONSTANTS: Garnet mesh sizes (80 mesh standard, 120 fine, 50 fast rough),
    orifice diameters (0.010"-0.014" standard), mixing tube diameters (0.030"-0.040"),
    pump pressures (60,000-94,000 PSI), abrasive flow rates (0.5-1.5 lb/min)
  REFERENCE: Flow International waterjet application guides,
    OMAX IntelliMAX programming manual, KMT Waterjet technical handbook,
    WJTA (WaterJet Technology Association) recommended practices
  KEY PHYSICS: Jet lag (bottom of cut trails top — affects corner quality),
    abrasive vs pure waterjet (abrasive for metals/composites, pure for gaskets/foam),
    stack cutting (multiple thin sheets), pierce strategies (moving pierce for brittle,
    stationary for ductile, low-pressure ramp for laminated), delamination prevention for composites

4-LOOP + FORGE-TRIPLE + AGENT HOOKS (MANDATORY per unit):
  LOOP 1 — SCRUTINIZE: /prism-review + /scrutinize + agent hook verifies Zeng-Kim model
  LOOP 2 — GAP FILL: /test + /trace wiring + agent hook checks integration
  LOOP 3 — TIE UP: no TODOs, reasoning[], golden snapshot
  LOOP 4 — VALIDATE: Re-run /prism-review on fixes, findings MUST decrease, full test suite → 0 failures
  FORGE-TRIPLE: engine + protective hook + MCP action + skill per milestone
  /compact every 3 units (auto-triggered)

PHYSICS FUSION INTEGRATION (ALL parameter milestones — fusion_tier >= 2 MANDATORY):
  Every process parameter computation MUST use PhysicsFusionOrchestratorEngine (fusion_tier >= 2).
  Tier 1 (single-pass) NOT acceptable for production — multi-model convergence required.
  Action: physics_fusion via calcDispatcher.
  Waterjet-specific physics (Zeng-Kim abrasive model, kerf width, taper, jet lag) use
  dedicated engines PLUS the fusion convergence loop for coupled effects (pressure↔speed↔quality).
  Future: WaterjetAbrasive plugin for the fusion convergence loop (extends PhysicsPlugin).
  Outputs: cut_speed_mm_min, kerf_mm, taper_deg, Ra_um, abrasive_rate_kg_min, confidence.
  Inputs REQUIRED: pump pressure_PSI, orifice/mixing_tube diameters, abrasive (type/mesh/flow),
    workpiece material (type/thickness/density), quality level (Q1-Q5), machine limits.
  See: PhysicsFusionOrchestratorEngine.ts + 5 plugins in src/engines/plugins/

IN-PROCESS SENSING (add to relevant milestones):
  Material thickness verification: contact probe or laser height sensor before cutting.
  Standoff distance calibration: auto-calibrate nozzle-to-material distance.
  Sheet flatness mapping: multi-point Z measurement for height compensation on warped sheets.
  Cut quality feedback: monitor abrasive flow rate and pressure for quality prediction.
  Applies to: WJ-MS1 (machine database), WJ-MS3 (thick plate), WJ-MS5 (advanced).
```

## PER-MILESTONE COMPREHENSIVE KNOWLEDGE SOURCES

### WJ-MS0: Profile Cutting Basics
```
ENGINES:
  - WaterjetProgramAssemblerEngine (2,106L) — 6 dialects, nesting, MC 500
  - NestingOptimizationEngine — part arrangement on sheet/slab
  - SheetUtilizationEngine — material usage tracking
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — waterjet rules ("always start pierce in waste area")
  - src/data/*-cam-tips.ts — waterjet tips across 18 CAM systems
  - tribal tips: "moving pierce for glass/stone — stationary pierce shatters brittle materials"
FORMULAS:
  - Zeng-Kim model: depth = C × P^a × d_o^b × m_a^c / (v × t^d × ρ_m^e)
    where P=pressure, d_o=orifice dia, m_a=abrasive flow, v=speed, t=thickness, ρ_m=material density
  - Kerf width: kerf ≈ mixing_tube_ID + 2 × standoff × tan(spread_angle)
  - Natural taper: top kerf > bottom kerf by 0.5-3° depending on speed
  - Pierce time: stationary = fast (steel), moving = required (brittle)
REFERENCE:
  - Flow International application data (speed vs quality vs thickness per material)
  - OMAX IntelliMAX cutting model documentation
  - WJTA recommended practices for abrasive waterjet cutting
  - Published Zeng-Kim model validation data

INTENT: Waterjet cuts ANYTHING — steel, stone, glass, carbon fiber, rubber, food. Each
  material has wildly different parameters. A 60,000 PSI stream with 80-mesh garnet cuts
  6mm aluminum at 200 mm/min at Q3 quality. Same setup on glass = shattered if you pierce
  stationary instead of moving. PRISM must know the material-specific rules.
```

### WJ-MS1: Quality Levels Q1-Q5
```
ENGINES:
  - WaterjetProgramAssemblerEngine — quality-based speed tables
  - SurfaceFinishPredictorEngine — adapted for waterjet roughness zones
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "Q1=separation (fastest), Q5=polished (slowest, 5-10× slower)"
  - tribal tips: "Q3 is the sweet spot for most production work — good edge, reasonable speed"
FORMULAS:
  - Quality levels: Q1 (separation, rough) → Q5 (polished, mirror-like bottom)
  - Speed ratio: Q1=100%, Q2=65%, Q3=40%, Q4=25%, Q5=15% of maximum speed
  - Roughness zones: smooth zone (top 1/3), transition zone (middle 1/3), rough zone (bottom 1/3)
  - Edge taper: proportional to speed — slower = less taper = better quality
  - Striation pattern: at high speed, bottom striations trail top by jet lag distance
REFERENCE:
  - OMAX quality level definitions and speed tables
  - Flow published Q1-Q5 cutting data per material
  - ISO 9013 — adapted for waterjet cutting quality classification

INTENT: Q1 cuts fastest but edge is rough and tapered — good for rough separation.
  Q5 is mirror-finish bottom edge but 6-10× slower. Most production work is Q3 — good
  balance of edge quality and speed. PRISM must auto-select quality level from tolerance
  requirements and adjust speed accordingly.
```

### WJ-MS2-MS5: Materials + Pierce + Taper + Nesting
```
MS2 SOURCES (Materials):
  - Metals: steel, stainless, aluminum, titanium, copper, brass (all cut well)
  - Stone: granite, marble, slate (moving pierce mandatory, low pressure start)
  - Glass: tempered CANNOT be cut (shatters), annealed OK (moving pierce, slow)
  - Composites: CFRP, fiberglass (NO delamination risk unlike machining — waterjet is IDEAL)
  - Rubber/foam: pure waterjet (no abrasive — abrasive embeds in soft materials)
  - Food: pure waterjet (no abrasive, no contamination — FDA approved)
  - Published cutting parameters per material family

MS3 SOURCES (Pierce):
  - Stationary pierce: drill straight down (steel, aluminum — ductile materials)
  - Moving pierce: start moving BEFORE jet fully penetrates (glass, stone, brittle)
  - Ramped pierce: gradually increase pressure (composites — prevent delamination)
  - Low-pressure pierce: start at 15,000 PSI, ramp to 60,000 (thick plate — prevent blowback)
  - Vacuum-assist pierce: for very thick material or stack cutting
  - Published pierce strategy selection guide per material

MS4 SOURCES (Taper Compensation):
  - 5-axis head tilt: tilt cutting head 1-3° to counter natural taper
  - Taper angle = f(speed, thickness, material, abrasive_flow, pressure)
  - Dynamic taper: tilt angle changes with speed (corners slow down = less taper)
  - Published taper compensation models (Zeng, Hashish, Kovacevic)

MS5 SOURCES (Nesting):
  - NestingOptimizationEngine — same as laser but wider kerf (0.8-1.2mm vs 0.2mm)
  - Tab/bridge strategies: small uncut sections hold parts in sheet
  - Common-line cutting: LESS effective than laser (wider kerf = more material removed)
  - Submerged cutting: reduces noise + splash, may affect cut quality
  - Published nesting optimization for waterjet-specific kerf widths

INTENT: Waterjet's superpower = cuts ANYTHING. Glass, carbon fiber, titanium, food,
  stone — same machine, same abrasive (except pure waterjet for soft materials). Pierce
  strategy is material-critical: stationary on glass = shattered glass + damaged orifice.
  Taper compensation uses 5-axis head tilt — dynamic angle adjustment per speed change.
```

### WJ-MS6-MS8: Controllers + Testing
```
MS6-MS7 SOURCES:
  - Flow: FlowMaster controller (proprietary, SmartStream technology)
  - OMAX: IntelliMAX controller (OMAX-specific, built-in cutting model)
  - KMT: standard Fanuc-based G-code + waterjet M-codes
  - Bystronic: ByMotion controller for waterjet
  - AXYZ: router-style controller adapted for waterjet
  - WARDJet: standard G-code with waterjet extensions
  - Controller-specific: pressure control codes, abrasive on/off, pierce sequences

MS8 SOURCES:
  - Aluminum plate (6061, 12mm) — profile + holes, Q3 quality
  - Granite inlay (decorative floor tile) — complex profile, moving pierce, Q4 quality
  - Carbon fiber panel (aerospace, 3mm) — ramped pierce, no delamination, Q3
  - Rubber gasket (5mm) — pure waterjet (no abrasive), Q2
  - Titanium plate (Ti-6Al-4V, 25mm) — thick + hard, slow cut, Q3
  - Stack cutting: 4 layers of 3mm aluminum = 12mm total, verify uniform quality all layers
  - Cross-material: same profile in steel + aluminum + composite → 3 different programs
  - Golden snapshots from MS0-MS5

INTENT: Flow and OMAX don't use standard G-code — they have proprietary formats with
  built-in cutting models. Testing must cover the full material spectrum: metal (standard),
  stone (brittle pierce), composite (no delam), rubber (pure waterjet), thick plate (slow).
  After MS8, PRISM generates correct waterjet programs for any material a shop might cut.
```

---

## CURRENT STATE (What's Built)

### Engine (existing, working):
| Engine | Lines | Status |
|--------|-------|--------|
| WaterjetProgramAssemblerEngine | 2,106 | 6 dialects, nesting wired, MC 500, profile cutting |
| **TOTAL WATERJET CODE** | **~2,106** | |

### Dialect Support (6):
- OMAX (Intelli-MAX layout format)
- Flow Mach (FlowPath / FlowCut)
- WARDJet (WARDJet controller)
- Techni (Techjet / TechniWaterjet)
- Bystronic Waterjet (ByMotion)
- Generic (ISO G-code baseline)

### Physics Models (to be named/hardened):
| Model | Formula | Purpose |
|-------|---------|---------|
| Zeng-Kim cutting speed | V = C × Nm × P^1.25 × ma^0.687 × df^0.343 / (h^1.15 × Qq) | Max traverse rate by parameters |
| Hashish roughness | Ra = f(V, P, ma, h, abrasive_mesh) | Surface roughness prediction |
| Hashish taper | θ = f(V/V_max, h, df) | Kerf taper angle |
| Bernoulli particle velocity | Vp = √(2P/ρ) × η_mixing | Abrasive particle exit velocity |
| Pierce factor | t_pierce = K × h^1.5 × Qq / (P × ma) | Pierce time by thickness/quality |

---

## CRITICAL ARCHITECTURAL ISSUES

### Issue 1: No Collision Avoidance
Nozzle vs slat collision unchecked. For 5-axis tilt heads, swept volume vs clamps not validated. Slat deflection under heavy parts not considered.
**Fix**: WJ-MS0 — nozzle/slat/clamp collision + 5-axis tilt validation.

### Issue 2: No Machine Database
No distinction between pure waterjet vs abrasive (AWJ), no pump pressure ratings, no 5-axis taper compensation parameters.
**Fix**: WJ-MS1 — machine capability database.

### Issue 3: No Quality Auto-Selection
Q1-Q5 quality levels exist conceptually but require manual input. Should auto-derive from target Ra + taper tolerance.
**Fix**: WJ-MS2 — auto-quality selection from drawing requirements.

---

## MILESTONE DETAILS

### WJ-MS0: Collision Avoidance — Nozzle vs Slats & Fixtures
**Priority: CRITICAL | Units: 6 | Depends on: nothing**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Slat interference detection — map slat grid positions, warn when pierce point lands on slat (deflects jet, damages slat) |
| U02 | Nozzle-to-clamp collision — clamp positions as exclusion zones, clearance = nozzle_diameter + 20mm minimum |
| U03 | 5-axis tilt head collision — swept volume of tilted nozzle (±60° typical) vs clamps, sheet edge, and part features |
| U04 | Submerged cutting clearance — when cutting underwater, verify nozzle tip clears water surface for pierce (raise for pierce, lower for cut) |
| U05 | Part tip-over prevention — detect small parts that may tip into kerf after cut-off, auto-add micro-tabs or recommend vacuum assist |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Tests: 8 collision scenarios (slat hit, clamp hit, 5-axis tilt, underwater pierce, part tip-over), verify all caught |


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

### WJ-MS0.5: Dialect Hardening — 6 Controller Outputs + POST-ULT Pipeline
**Priority: CRITICAL | Units: 7 | Depends on: nothing**

**POST-ULT INTEGRATION:** All output from WaterjetProgramAssemblerEngine MUST route through
PostProcessorPipelineEngine (POST-ULT). Pump commands, abrasive control, pierce strategies,
and taper compensation injected by POST-ULT — no inline format strings in assembler.

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | OMAX Intelli-MAX — ORD file format, speed index (1-100), quality (Q1-Q5), pierce type, Intelli-ETCH for marking |
| U02 | Flow Mach — FlowPath format, SmartStream pressure control, Dynamic Waterjet taper comp commands |
| U03 | WARDJet — WARDJet controller format, multi-head synchronization, abrasive hopper commands |
| U04 | Techni — TechniWaterjet format, Quantum NXT pump integration, iP55 pressure commands |
| U05 | Bystronic — ByMotion Waterjet format, ByVision interface, pressure ramping commands |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Generic ISO — standard G-code with M-codes for pump on/off, abrasive on/off, pressure set |
| U07 | Tests: same 100×100mm square on all 6 dialects, verify structural output differences + correct pump/abrasive commands |


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

### WJ-MS1: Machine Database — Pure WJ vs AWJ Capabilities
**Priority: HIGH | Units: 6 | Depends on: MS0**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Machine capability schema — type (pure/AWJ), axes (3/5/taper_comp), pump_type (intensifier/direct_drive), max_pressure_bar, table_size_mm, max_thickness_by_material |
| U02 | AWJ fleet — OMAX 55100, Flow Mach 500 4020, WARDJet Z-Series, Techni TechCut, Bystronic ByJet Flex |
| U03 | 5-axis taper compensation fleet — Flow Dynamic Waterjet, OMAX Tilt-A-Jet, KMT A-Jet, auto-taper angle by speed ratio |
| U04 | Pure waterjet entries — for foam, rubber, gasket, food cutting — no abrasive, 2-4× faster, smaller kerf |
| U05 | Auto-machine selector — material + thickness + tolerance + quantity → rank machines by capability, quality achievable, cost |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Tests: 5 material/thickness combos → correct machine ranking, pure vs AWJ auto-selection |


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

### WJ-MS2: Auto-Quality Selection — Q1-Q5 from Drawing Requirements
**Priority: HIGH | Units: 7 | Depends on: MS1**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Quality level definitions — Q1: separation (Ra>25µm, taper>2°), Q2: through-cut, Q3: clean (Ra~6µm), Q4: fine (Ra~3µm), Q5: finish (Ra<1.5µm, taper<0.5°) |
| U02 | Ra-to-quality mapping — input target Ra from drawing → select minimum quality level |
| U03 | Taper-to-quality mapping — input taper tolerance → select quality level (Q1=don't care, Q5=<0.5°) |
| U04 | Speed calculation per quality — V_q = V_max × quality_factor (Q1=1.0, Q2=0.6, Q3=0.35, Q4=0.20, Q5=0.10) |
| U05 | Mixed-quality toolpath — different edges at different quality levels on same part (cosmetic edge Q4, hidden edge Q1) |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Cost impact reporting — Q5 is 10× slower than Q1, show time + cost at each quality level for informed decision |
| U07 | Tests: 5 parts with specified Ra/taper → verify correct quality auto-selection, speed within ±10% of Zeng-Kim |


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

### WJ-MS3: Auto-Pierce Strategy — Per Material Brittleness
**Priority: HIGH | Units: 7 | Depends on: MS1, MS2**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Stationary pierce — standard for metals, full pressure ramp-up at pierce point, dwell until through |
| U02 | Moving/dynamic pierce — for brittle materials (glass, ceramic, stone), low pressure start while moving to prevent crack propagation |
| U03 | Pre-drill pierce — for very thick material (>100mm) or laminated composites, use pre-drilled start hole to avoid delamination |
| U04 | Edge start — when geometry permits, start from material edge (zero pierce time, no pierce witness mark) |
| U05 | Low-pressure ramp pierce — for sensitive materials (carbon fiber, glass), start at 30% pressure, ramp to 100% over 2-5 seconds |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Material brittleness database — classify materials: ductile (metals), semi-brittle (hardened steel, thick acrylic), brittle (glass, ceramic, stone) → auto-select pierce strategy |
| U07 | Tests: 6 pierce scenarios (standard metal, glass with moving pierce, 100mm plate with pre-drill, edge start, carbon fiber ramp), verify correct strategy and zero cracking |


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

### WJ-MS4: Stack Cutting & Advanced Nesting
**Priority: HIGH | Units: 6 | Depends on: MS0, MS2**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Stack cutting support — multiple thin sheets clamped together, total thickness for speed calculation, inter-layer gap compensation |
| U02 | Stack delamination prevention — reduce pressure at layer boundaries for dissimilar materials, auto-detect stack composition |
| U03 | Nesting with material utilization — auto-rotate/mirror parts for >85% utilization, respect grain direction constraints |
| U04 | Tab auto-placement — by part weight and material: <0.5kg=no tab, 0.5-5kg=2 tabs, >5kg=4 tabs, brittle materials=extra tabs |
| U05 | Common-line cutting — shared edges between adjacent parts, verify kerf compensation correct for both sides |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Tests: 4 nesting scenarios (single part, 30-part nest, 3-layer stack, common-line pair), verify utilization and stack integrity |


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

### WJ-MS5: Physics Naming & Model Hardening
**Priority: MEDIUM | Units: 5 | Depends on: MS2, MS3**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Zeng-Kim speed model hardening — calibrate C, Nm constants per material, validate against OMAX/Flow published speed charts |
| U02 | Hashish roughness model — calibrate Ra prediction by quality level, validate within ±20% of measured values per material |
| U03 | Hashish taper model — predict taper angle vs speed ratio (V/V_max), auto-set 5-axis compensation angle |
| U04 | Bernoulli + pierce factor — predict pierce time within ±15%, validate abrasive particle velocity for mixing tube wear prediction |
| U05 | Tests: 6 material/thickness combos, verify speed within ±10% of Zeng-Kim, Ra within ±20% of Hashish, taper within ±0.2° |


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

### WJ-MS6: Comprehensive Test Suite — 10 Benchmark Parts
**Priority: CRITICAL | Units: 6 | Depends on: ALL**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | P1: Aluminum plate 10mm — simple rectangle + 4 holes, AWJ baseline, Q3 quality |
| U02 | P2: Stainless flange 15mm — bolt circle, contour, Q4 quality, N₂ comparison not applicable (waterjet advantage) |
| U03 | P3: 50mm titanium plate — extreme thickness, slow speed, extended pierce time, Q3 quality |
| U04 | P4: Glass panel 12mm — brittle, moving pierce mandatory, low-pressure ramp, Q5 edge quality |
| U05 | P5-P8: Rubber gasket (pure WJ) + granite countertop + carbon fiber panel + 3-layer stack (Al+SS+Cu) |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | P9-P10: Stone inlay pattern (artistic, Q5) + full 30-part production nest (mixed quality edges) |

### Test Matrix:
| Part | OMAX | Flow | WARDJet | Techni | Bystronic | Generic |
|------|:----:|:----:|:-------:|:------:|:---------:|:-------:|
| P1-P4 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| P5 (rubber) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| P6 (granite) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| P7 (CF) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| P8 (stack) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| P9 (stone) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| P10 (nest) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
**Total valid programs: 60**

---

## EXPANDED TEST MATRIX — 12 Real Industry Parts at Escalating Complexity

### Tier 1: Basic (Entry-Level Waterjet Cutting)

| ID | Part | Material | Thickness | Process | Geometry | Key Challenge |
|----|------|----------|-----------|---------|----------|---------------|
| W-P1 | Simple aluminum plate profile | 6061-T6 aluminum | 6mm | AWJ (abrasive) | Rectangular bracket + 4 bolt holes | THE simplest waterjet job — standard AWJ, Q3 quality, basic kerf comp |
| W-P2 | Rubber gasket | Nitrile rubber (NBR) | 3mm | PureWJ (no abrasive) | Closed contour with bolt pattern | Pure waterjet for soft material, no abrasive needed, fast traverse, clean edge |
| W-P3 | Steel flange | Mild steel (A36) | 10mm | AWJ | Circular flange + bolt circle | Standard AWJ with kerf compensation, lead-in/out on contour, Q3 quality |

### Tier 2: Standard Production

| ID | Part | Material | Thickness | Process | Geometry | Key Challenge |
|----|------|----------|-----------|---------|----------|---------------|
| W-P4 | Stack-cut gaskets | Nitrile rubber | 3mm × 10 layers = 30mm stack | PureWJ | 10 identical gaskets from one cut | Stack optimization — clamping pressure, jet coherence through 30mm rubber, no delamination between layers |
| W-P5 | Nested bracket sheet | Mild steel (A36) | 6mm | AWJ | 50 brackets on 1200×600mm plate | Nesting + micro-tabs for slug retention, common-line where possible, utilization optimization |
| W-P6 | Glass panel cutout | Tempered glass | 10mm | AWJ (fine mesh 120) | Rectangular cutout + round corners | Moving pierce mandatory (stationary pierce shatters brittle material), low-pressure ramp, fine abrasive, Q5 edge |

### Tier 3: Complex

| ID | Part | Material | Thickness | Process | Geometry | Key Challenge |
|----|------|----------|-----------|---------|----------|---------------|
| W-P7 | CFRP panel | Carbon fiber reinforced polymer | 8mm | AWJ (fine mesh 80) | Aerospace panel with cutouts and radii | Zero heat damage (waterjet advantage over laser), delamination risk at entry/exit edges, fiber pull-out prevention, controlled pierce, Q4 edge |
| W-P8 | Architectural stone inlay | Marble 20mm + Granite 20mm | 20mm each | AWJ (coarse mesh 60) | Interlocking decorative pieces, tight fit | Two different stone types cut to mate perfectly, kerf comp critical for fit (±0.1mm gap), material-specific speed tables, Q5 for visible edges |
| W-P9 | Inconel exhaust flange | Inconel 625 | 25mm | AWJ (coarse mesh 60) | Complex flange profile + bolt holes | Very slow cutting (high nickel alloy + thick), high abrasive consumption rate (0.7 kg/min), extended pierce time ~15s, pump duty cycle management |

### Tier 4: Extreme

| ID | Part | Material | Thickness | Process | Geometry | Key Challenge |
|----|------|----------|-----------|---------|----------|---------------|
| W-P10 | Thick titanium plate | Ti-6Al-4V Grade 5 | 50mm (2") | AWJ (coarse mesh 60) | Aerospace bracket profile | Maximum thickness AWJ — taper compensation critical (±1.5° natural taper), 5-axis tilt head mandatory for straight walls, very slow traverse ~15mm/min, extended pierce ~25s, Q3 acceptable |
| W-P11 | Armor plate complex profile | AR500 hardened steel | 30mm | AWJ (coarse mesh 60) | Complex hull section profile with notches | Hardest common steel × thick = maximum abrasive wear, mixing tube life ~4hrs, garnet consumption tracking, nozzle wear compensation mid-program |
| W-P12 | Foam packaging insert | EVA closed-cell foam | 50mm | PureWJ (no abrasive) | Multi-pocket insert with chamfered edges | Pure waterjet at high speed (5000mm/min+), stack cutting 3 layers, nesting for material utilization, zero wet retention concern |

### Expanded Machine Set (6 machines):

| ID | Machine | Controller | Pump | Pressure | Table Size | Key Feature |
|----|---------|-----------|------|----------|------------|-------------|
| M1 | OMAX GlobalMAX 2626 | OMAX Intelli-MAX | Direct drive 30HP | 55,000 PSI | 660×660mm | Tilt-A-Jet 5-axis taper comp, Intelli-VISOR monitoring |
| M2 | Flow Mach 500 4020 | Flow FlowPath | Hyplex Prime 60HP | 94,000 PSI | 4000×2000mm | HyperPressure (94k PSI), Dynamic Waterjet XD 5-axis |
| M3 | WARDJet Z-2543 | WARDJet controller | KMT 50HP | 60,000 PSI | 2500×4300mm | Large format, dual head, pneumatic drill for pierce |
| M4 | Techni Intec G2 i713 | Techni PAC controller | BFT 50HP | 60,000 PSI | 1800×3700mm | Quantum NXT pump (electric servo, no hydraulic oil) |
| M5 | Bystronic ByJet Flex | Bystronic ByMotion | KMT 50HP | 60,000 PSI | 3000×1500mm | 2D/3D switching, automatic abrasive metering |
| M6 | Flow Mach 700 | Flow FlowPath | Hyplex Prime 100HP | 94,000 PSI | 4000×2000mm | Dual intensifier, maximum thick-cut capability, 5-axis |

### Expanded Compatibility Grid:

| Part | M1 OMAX | M2 Flow 500 | M3 WARDJet | M4 Techni | M5 Bystronic | M6 Flow 700 |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| W-P1 (aluminum) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| W-P2 (rubber gasket) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| W-P3 (steel flange) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| W-P4 (stack gaskets) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| W-P5 (nested brackets) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| W-P6 (glass) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| W-P7 (CFRP) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| W-P8 (stone inlay) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| W-P9 (Inconel 25mm) | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| W-P10 (Ti 50mm) | ✗ | ✓ | ✗ | ✗ | ✗ | ✓ |
| W-P11 (AR500 30mm) | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| W-P12 (foam) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

**Valid programs per machine**: M1: 9 | M2: 12 | M3: 10 | M4: 10 | M5: 10 | M6: 12
**Total valid programs (expanded): 63**

### Controller Coverage Matrix:

| Controller | Machines | Dialect Exercised | Parts Covered |
|-----------|----------|-------------------|---------------|
| OMAX Intelli-MAX | M1 | OMAX dialect | W-P1–P8, P12 |
| Flow FlowPath | M2, M6 | Flow dialect | W-P1–P12 (all) |
| WARDJet | M3 | WARDJet dialect | W-P1–P9, P11, P12 |
| Techni PAC | M4 | Techni dialect | W-P1–P9, P11, P12 |
| Bystronic ByMotion | M5 | Bystronic WJ dialect | W-P1–P9, P11, P12 |

### Key Decision Matrix — AWJ vs PureWJ:

| Part | Process | Rationale |
|------|---------|-----------|
| W-P1, P3, P5–P11 | AWJ (abrasive) | Metals, stone, composites, glass — abrasive required for hard materials |
| W-P2, P4, P12 | PureWJ (no abrasive) | Rubber and foam — soft materials cut cleanly with pure water, faster and cheaper |

### Escalation Logic:
```
Tier 1 validates: basic AWJ/PureWJ selection, kerf comp, pierce, lead-in/out
Tier 2 validates: stack cutting, nesting optimization, brittle material handling
Tier 3 validates: exotic materials (CFRP, stone, superalloy), multi-material fit
Tier 4 validates: maximum thickness capability, taper compensation, pump duty management
```

---

## EXECUTION ORDER

```
Phase 1: MS0 + MS0.5 (parallel)                         [13 units, SAFETY + DIALECTS]
Phase 2: MS1 (machine database)                          [6 units, FOUNDATION]
Phase 3: MS2 + MS3 (parallel)                            [14 units, QUALITY + PIERCE]
Phase 4: MS4 + MS5 (parallel)                            [11 units, NESTING + PHYSICS]
Phase 5: MS6 (exhaustive validation)                     [6 units, TESTING]
```

## FINAL TARGET: 110+ tests across 60 programs, 100% pass rate

### MINIMUM TEST BASELINE GATE (Phase 5 prerequisite)
```
WATERJET minimum: 30+ dedicated tests before Phase 5 milestones
Current baseline: needs establishment
Gap: 30+ tests needed — cut speed, kerf width, taper, nesting, quality zones, dialect
Validation: match-then-improve against Flow/OMAX published cutting data
  Step 1: Match published cut speeds within ±10% per material/thickness/quality
  Step 2: Improve with Zeng-Kim model convergence and taper compensation
```

### MACHINE-TYPE SELECTOR REFERENCE
```
Input: part geometry (size, features, tolerances) + material + batch size
Output: ranked machine type recommendation
Engine: MachineTypeSelectorEngine (shared across all 8 machine roadmaps)
Waterjet selection criteria: any material (metals, composites, glass, stone, foam),
  heat-sensitive materials, thick sections (up to 200mm+), no HAZ requirement,
  composite/laminated materials (no delamination), mixed-material stacks
Contra-indicators: tight tolerance <±0.1mm (→ wire EDM/grinding), fine finish (→ grinding),
  very thin sheet (→ laser for speed), high volume thin sheet (→ laser)
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