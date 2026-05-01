# PRISM WIRE EDM COMPREHENSIVE ROADMAP v1.0
## Production Pipeline — Testing & Enhancement | 7 Milestones | 45 Units | 250+ Target Tests

Generated: 2026-03-23
Current state: PRODUCTION QUALITY — 12 pipeline engines, 15,900 lines, 20-stage WEDM-P2P pipeline
Test baseline: 151 passing + 98 validation tests = 249 total

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

SKILLS: /smart wire EDM process engineer + EDM specialist, /forge-triple,
  /prism-review, /test, /physics-verify, /program-validate

MASTER KNOWLEDGE SOURCES FOR ALL WIRE EDM SESSIONS:
  ENGINES: WireEDMPrintToProgramEngine (~2,400L — 20-stage P2P pipeline, PRODUCTION QUALITY),
    EDMQualityOrchestratorEngine (20-stage entry point), EDMProgramAssemblerEngine,
    All 12 WEDM-P2P pipeline engines (15,900L total, 151 tests + 98 validation)
  TRIBAL TIPS: EDM-specific tips across all 18 CAM systems,
    MachiningPlaybookEngine EDM rules
  FORMULAS: Sato EDM gap model (gap = f(voltage, current, pulse_on, pulse_off, dielectric)),
    material removal rate (MRR = K × I × ton / (ton + toff)),
    surface roughness from discharge energy (Ra = C × Ie^a × te^b),
    wire lag compensation (deflection = f(cutting_speed, wire_tension, workpiece_height))
  CONSTANTS: Wire electrode properties (brass ø0.25mm: tensile 900MPa, conductivity 20%IACS),
    dielectric properties (deionized water: resistivity, flushing pressure tables)
  REFERENCE: Sodick/Makino/AgieCharmilles application guides,
    wire electrode manufacturer specs (Berkenhoff, Thermocompact)
  KEY PHYSICS: Spark gap control, wire vibration modes, corner slowdown (to prevent wire break),
    skim cut parameters (decreasing energy per pass), auto-threading sequence,
    slug retention (bridge tabs for drop prevention)

4-LOOP + FORGE-TRIPLE + AGENT HOOKS (MANDATORY per unit):
  LOOP 1 — SCRUTINIZE: /prism-review + /scrutinize + agent hook verifies Sato EDM physics
  LOOP 2 — GAP FILL: /test + /trace wiring + agent hook checks integration
  LOOP 3 — TIE UP: no TODOs, reasoning[], golden snapshot
  LOOP 4 — VALIDATE: Re-run /prism-review on fixes, findings MUST decrease, full test suite → 0 failures
  FORGE-TRIPLE: engine + protective hook + MCP action + skill per milestone
  /compact every 3 units (auto-triggered)

PHYSICS FUSION INTEGRATION (ALL parameter milestones — fusion_tier >= 2 MANDATORY):
  Every process parameter computation MUST use PhysicsFusionOrchestratorEngine (fusion_tier >= 2).
  Tier 1 (single-pass) NOT acceptable for production — multi-model convergence required.
  Action: physics_fusion via calcDispatcher.
  Wire EDM-specific physics (Sato gap model, MRR, Ra from discharge energy) use
  dedicated engines PLUS the fusion convergence loop for coupled effects (gap↔MRR↔Ra).
  Future: EDMDischarge plugin for the fusion convergence loop (extends PhysicsPlugin).
  Outputs: MRR_mm3_min, Ra_um, gap_um, wire_tension_N, power_W, confidence.
  Inputs REQUIRED: wire type (brass/moly/coated), workpiece material (iso_group/hardness/thickness),
    power settings (voltage/current/pulse_on/pulse_off), dielectric properties, machine limits.
  See: PhysicsFusionOrchestratorEngine.ts + 5 plugins in src/engines/plugins/

IN-PROCESS PROBING (add to relevant milestones):
  Edge detection: wire touch or spark-based workpiece edge finding for WCS.
  Centering: 4-point wire touch for bore centering (precision ±0.001mm).
  Z-height detection: touch for submerge level and workpiece thickness verification.
  Auto-reference: re-establish position after wire break and re-thread.
  Slug drop verification: detect slug separation completion before moving to next cut.
  Applies to: WEDM-MS0 (complex parts), WEDM-MS2 (taper cutting), WEDM-MS3 (micro).
```

## PER-MILESTONE COMPREHENSIVE KNOWLEDGE SOURCES

### WEDM-MS0: Multi-Material Validation
```
ENGINES:
  - WireEDMPrintToProgramEngine (~2,400L) — 20-stage PRODUCTION pipeline
  - EDMQualityOrchestratorEngine — 20-stage entry point
  - All 12 WEDM-P2P pipeline engines (15,900L total)
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — EDM material rules ("D2 = standard, carbide = slow + fine wire")
  - src/data/*-cam-tips.ts — EDM material-specific tips
  - tribal tips: "PCD = diamond — use brass wire, very slow, fine settings"
FORMULAS:
  - Sato gap model: gap = f(voltage, current, pulse_on, pulse_off, dielectric_resistivity)
  - MRR per material: MRR = K_material × I_peak × t_on / (t_on + t_off)
  - Surface roughness: Ra = C × Ie^a × te^b (different C/a/b per material)
  - Wire tension adjustment: harder materials need lower tension (less wire vibration)
REFERENCE:
  - Sodick/Makino EDM application data per material
  - Wire electrode specifications (brass ø0.25: D2/M2, molybdenum: carbide/PCD)
  - Published EDM data: D2 (standard), M2 (high-speed), carbide (slow), PCD (very slow)

INTENT: WEDM pipeline already works (249 tests passing). This milestone validates across
  materials — same die profile in D2 (easy), M2 (medium), carbide (hard), PCD (extreme).
  Each material needs different power settings, wire type, and flushing parameters.
```

### WEDM-MS1: Corner Control + Wire Lag
```
ENGINES:
  - WireEDMPrintToProgramEngine — corner slowdown logic
  - EDMParameterEngine — adaptive power settings at corners
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "corners = wire lag + overburn — slow down AND reduce power"
  - tribal tips: "90° corner at full speed = radius 0.05mm larger than programmed"
FORMULAS:
  - Wire lag: deflection = f(cutting_speed, wire_tension, workpiece_height, gap_force)
  - Corner slowdown: speed_corner = speed_straight × (R_corner / R_corner + wire_lag)
  - Overburn compensation: offset_corner ≠ offset_straight (different at sharp corners)
  - Corner strategy: sharp corners need STOP + backtrack + approach from new angle
REFERENCE:
  - Published wire lag compensation research (Puri & Bhattacharyya model)
  - AgieCharmilles corner strategy documentation
  - Sodick corner control parameters

INTENT: Wire EDM wire is NOT rigid — it deflects under cutting force. At corners, the wire
  lags behind the programmed path, producing a radius instead of a sharp corner. PRISM must
  compute wire lag per material+height+speed and apply corner compensation automatically.
```

### WEDM-MS2-MS5: Taper + Threading + Controllers + Testing
```
MS2 SOURCES (Taper):
  - UV axis kinematics: upper guide offset creates taper angle
  - Max taper angle per machine (typ 15-45° depending on workpiece height)
  - Taper compensation: top profile ≠ bottom profile for drafted shapes
  - Published UV axis programming examples

MS3 SOURCES (Auto-Threading):
  - Auto-thread wire path: thread through start hole → tension → flush → detect
  - Broken wire recovery: retract wire, re-thread, resume from breakpoint
  - Start hole strategies: pre-drilled (conventional), no-hole (special machines)
  - Slug retention: bridge tabs prevent parts from dropping into tank

MS4 SOURCES (Controllers):
  - Sodick: LN2/ALC series programming (G92 wire offset, custom M-codes)
  - Makino: MAKINO-Pro programming (G41/G42 wire comp, hyper-i control)
  - AgieCharmilles: CUT E/P series (AC CAM, expert system parameters)
  - Mitsubishi: MV series programming (auto-power, standard G-code)
  - Fanuc: α/β series (standard G-code + custom wire cycles)
  - ONA: AF series programming

MS5 SOURCES (Testing):
  - Progressive die test part (20+ punches, clearances to ±0.002mm)
  - Extrusion die test (complex profile, uniform wall thickness)
  - EDM electrode test (graphite/copper, smooth finish for die sinking)
  - Golden snapshots from MS0-MS4
  - Cross-controller: same die on Sodick + Makino + AgieCharmilles → different programs

INTENT: Taper cutting uses UV axes (upper guide offset) — PRISM must compute the upper
  and lower contours separately and synchronize them. Auto-threading reliability is what
  makes WEDM suitable for unattended operation — broken wire recovery must work 100%.
  Progressive die with 20+ punches at ±0.002mm is the ultimate WEDM test part.
```

---

## CURRENT STATE (What's Built)

### Engines (existing, working):
| Engine | Lines | Status |
|--------|-------|--------|
| WireEDMPrintToProgramEngine | ~2,400 | 20-stage P2P pipeline, feature extraction |
| WireEDMProfileEngine | ~1,800 | Wire path generation, offset compensation |
| WireEDMLeadInOutEngine | ~1,200 | Lead-in/out strategies, slug retention |
| WireEDMCornerEngine | ~1,100 | Corner radius compensation, wire lag |
| WireEDMPostProcessorEngine | ~1,400 | 5 controller dialects |
| WireEDMPowerSettingsEngine | ~1,300 | Multi-pass power scheduling, skim cuts |
| WireEDMFlushingEngine | ~900 | Upper/lower flushing, submerged vs spray |
| WireEDMThreadingEngine | ~800 | Auto-thread, re-thread after break |
| WireEDMTaperEngine | ~1,100 | UV-axis taper, independent upper/lower |
| WireEDMCostEngine | ~700 | Wire consumption, power, time estimation |
| WireEDMNestingEngine | ~1,600 | Multi-part nesting, slug management |
| WireEDMValidationEngine | ~1,500 | 98 validation rules, geometry checks |
| **TOTAL WIRE EDM CODE** | **~15,900** | |

### Controller Posts (5):
- Fanuc α-C600iA (Robocut)
- Mitsubishi MV Series
- Sodick AQ/VL Series
- AgieCharmilles CUT P/E
- Makino U-Series

### Tests (passing):
- 151 pipeline tests (feature extraction, path generation, power scheduling)
- 98 validation tests (geometry, clearance, wire break risk, taper limits)

### Physics Models (implemented):
| Model | Formula | Purpose |
|-------|---------|---------|
| Sato MRR | MRR = K × I × ton × f | Material removal rate |
| DiBitonto recast | d_recast = 2√(αt) | Recast layer depth |
| Carslaw HAZ | d_HAZ = 3 × d_recast | Heat-affected zone depth |
| Wire lag | δ = FL²/(8T) | Wire deflection at midpoint |
| Wire break | P = 1 - exp(-λ × H × DC/FF) | Break probability per cut |

---

## MILESTONE DETAILS

### WEDM-MS0: Test Expansion — Tier 6 Complex Parts
**Priority: HIGH | Units: 8 | Depends on: nothing**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Progressive die 12-station — 12 punch profiles in sequence, tight pitch tolerance ±0.005mm, shared slug retention strategy |
| U02 | Turbine blade cooling holes — 0.3-0.8mm diameter array, fir-tree root profile, Inconel 718 discharge parameters |
| U03 | PCD tool profiles — polycrystalline diamond blanks, 0.1mm edge radius, ultra-low power to avoid delamination |
| U04 | Micro-gear test — module 0.3 involute, 24 teeth, simultaneous 4-axis taper on tooth flanks |
| U05 | Stacking test — 3 plates clamped, common wire path, different material per layer (D2 + carbide + copper) |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Re-cut / skim-7 test — roughing + 7 skim passes, verify power schedule decreasing monotonically to Ra 0.1µm |
| U07 | Tall workpiece test — 150mm height, wire lag compensation must auto-increase, flushing pressure validation |
| U08 | Tests: all 6 Tier-6 parts generate valid programs on all 5 controllers (30 programs total) |


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

### WEDM-MS0.5: Dialect Reconciliation — Route Through POST-ULT Pipeline
**Priority: CRITICAL | Units: 5 | Depends on: MS0**

**POST-ULT INTEGRATION:** All G-code from WireEDMPrintToProgramEngine MUST route through
PostProcessorPipelineEngine (POST-ULT). Controller-specific wire EDM codes, power settings,
wire threading sequences, and flushing commands injected by POST-ULT — no inline G-code.

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | **ARCH FIX**: Route ALL WireEDMPrintToProgramEngine output through PostProcessorPipelineEngine. Remove inline G-code. Single path, all dialects |
| U02 | Sodick dialect — Sodick LN/SL series format, SP/SV power parameters, AWT auto-threading sequence |
| U03 | Makino dialect — Makino U-series format, Hyper-i control, EDCAM integration commands |
| U04 | AgieCharmilles dialect — CUT E/P format, ISPG generator settings, iWire auto-threading |
| U05 | Cross-dialect validation — same progressive die profile on all 5 controllers, verify output structure |


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

### WEDM-MS1: Lead-In/Out Arcs & Slug Retention Hardening
**Priority: HIGH | Units: 6 | Depends on: MS0.5**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Lead-in arc optimization — radius = 2× wire offset minimum, tangent entry, angle auto-selection (90°/180°/270°) per geometry |
| U02 | Lead-out tab strategy — auto-place 0.2mm tab at slug centroid, tab width by slug weight (area × height × density) |
| U03 | Multi-slug sequencing — cut order optimization to prevent thermal distortion, heaviest slugs last |
| U04 | Island retention — detect internal islands, reverse cut direction for island-first strategy |
| U05 | No-tab skim strategy — rough with tab → skim passes without tab → final tab cut. Prevents skim mark on finished surface |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Tests: 10 slug retention scenarios (single slug, multi-slug, island, progressive die), verify zero uncontrolled drops |


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

### WEDM-MS2: Corner Physics Hardening
**Priority: HIGH | Units: 7 | Depends on: MS0**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Wire lag model hardening — δ = FL²/(8T), F from discharge force + flushing + drag, T from wire tension setting |
| U02 | Corner radius compensation — auto-reduce speed at corners where R < 5× wire_lag, dwell time insertion |
| U03 | Sharp corner strategy — wire reversal technique for R < 0.05mm (backup, re-approach from opposite side) |
| U04 | Taper corner interaction — when UV taper meets sharp corner, calculate actual corner radius at both top and bottom surfaces |
| U05 | Corner power reduction — auto-reduce discharge energy at corners to prevent wire break (corner_power = base × R/(R + δ)) |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Corner accuracy validation — measure programmed vs actual corner radius error, target < 0.003mm for R > 0.1mm |
| U07 | Tests: 8 corner scenarios (sharp, radius, taper+corner, acute angle, re-entrant), verify compensation applied correctly |


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

### WEDM-MS3: Cross-Material Testing & Discharge Characterization
**Priority: HIGH | Units: 8 | Depends on: MS0**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | D2 tool steel baseline — standard EDM material, establish reference MRR and surface finish at each power level |
| U02 | Carbide (WC-Co) — high resistivity, requires high voltage open-circuit, reduced wire speed, anti-electrolysis polarity |
| U03 | Copper / brass — high conductivity, fast MRR but prone to short circuits, increased flushing, reduced servo voltage |
| U04 | Titanium — poor thermal conductivity, thick recast, require low duty cycle, risk of wire break from TiO₂ debris |
| U05 | PCD (polycrystalline diamond) — non-conductive binder issue, requires special polarity, ultra-low current, long pulse-off |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Inconel 718 — nickel-based superalloy, recast includes Laves phase, aggressive flushing, slow speed mandatory |
| U07 | Material-adaptive auto-tuning — input material → auto-set voltage, current, ton, toff, wire speed, flushing, servo |
| U08 | Tests: same 25mm square pocket on all 6 materials, verify MRR within ±15% of Sato prediction, recast within DiBitonto bounds |


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

### WEDM-MS4: Integration into Main Routing
**Priority: CRITICAL | Units: 5 | Depends on: MS1, MS2, MS3**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Fix QuoteToShip line 200+1492 — wire EDM operations must appear in quote routing with correct cycle time + cost |
| U02 | Fix MultiProcessCAMBridge lines 53-57 — wire EDM handoff from milling when feature requires EDM (sharp internal corners, hardened pockets, thin walls) |
| U03 | Auto-detection of EDM-required features — internal corner R < 0.5mm on hardened steel, keyway in HRC>50, through-hole profile tolerance < 0.01mm |
| U04 | Multi-process sequencing — rough mill → heat treat → wire EDM finish, or wire EDM blank → grind, proper datum transfer |
| U05 | Tests: 5 multi-process parts route correctly through QuoteToShip with EDM operations, cycle times sum correctly |


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

### WEDM-MS5: Sinker EDM Completion
**Priority: MEDIUM | Units: 6 | Depends on: MS3**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Electrode sequencing engine — roughing electrode (copper, +0.3mm undersize) → finishing electrode (copper-tungsten, +0.05mm), electrode wear tracking |
| U02 | Orbiting strategy — circular/vectorial orbiting for uniform electrode wear, orbit radius by finish requirement |
| U03 | Adaptive flushing — pressure flushing for blind cavities, suction flushing for through holes, jet flushing for ribs |
| U04 | Jump cycle optimization — electrode retract height by depth (shallow: 1mm, deep: 3mm), retract frequency by debris density |
| U05 | Electrode design rules — min wall thickness 3× spark gap, draft angle for extraction, split electrodes for complex shapes |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Tests: 3 sinker EDM parts (blind cavity, through pocket with island, rib feature), verify electrode sequence + flushing + jump cycle |

---

## TEST MATRIX

### Parts (10):
| ID | Part | Material | Thickness | Key Features |
|----|------|----------|-----------|-------------|
| P1 | Simple square | D2 | 25mm | 4 straight cuts, basic validation |
| P2 | Radius profile | A2 | 20mm | Convex/concave arcs, R2-R10 |
| P3 | Keyway | S7 40HRC | 30mm | Internal slot, sharp corners |
| P4 | Gear profile | M2 | 15mm | Module 1.0 involute, 20 teeth |
| P5 | Progressive die station | D2 | 25mm | 12 punch profiles, ±0.005mm |
| P6 | Turbine cooling holes | Inconel 718 | 10mm | 0.5mm holes × 40, array pattern |
| P7 | PCD blank | PCD/carbide | 5mm | Edge radius 0.1mm, delamination risk |
| P8 | Taper extrusion die | Carbide | 40mm | 3° taper, UV-axis, Ra 0.2µm |
| P9 | Stacked plates | D2+Cu+Ti | 3×20mm | Common path, material transitions |
| P10 | ULTIMATE 150mm tall | D2 | 150mm | Max height, wire lag dominant, 7 skims |

### Controllers (5):
| ID | Controller | Machine | UV Taper | Max Height |
|----|-----------|---------|----------|-----------|
| C1 | Fanuc α-C600iA | Robocut α-C600iA | ±30° | 210mm |
| C2 | Mitsubishi MV | MV2400S | ±30° | 220mm |
| C3 | Sodick AQ/VL | AQ750LH | ±45° | 250mm |
| C4 | AgieCharmilles | CUT P 550 | ±30° | 256mm |
| C5 | Makino U-Series | U6 H.E.A.T. | ±30° | 205mm |

### Compatibility (all parts run on all controllers except):
| Part | C1 | C2 | C3 | C4 | C5 |
|------|:--:|:--:|:--:|:--:|:--:|
| P1-P7 | ✓ | ✓ | ✓ | ✓ | ✓ |
| P8 (taper) | ✓ | ✓ | ✓ | ✓ | ✓ |
| P9 (stack) | ✓ | ✓ | ✓ | ✓ | ✓ |
| P10 (150mm) | ✗ | ✓ | ✓ | ✓ | ✗ |
**Total valid programs: 48**

---

## EXECUTION ORDER

```
Phase 1: MS0 (Tier 6 test expansion)                    [8 units, BASELINE]
Phase 1B: MS0.5 (POST-ULT dialect reconciliation)       [5 units, ARCHITECTURE]
Phase 2: MS1 + MS2 + MS3 (parallel)                     [21 units, HARDENING]
Phase 3: MS4 (main routing integration)                  [5 units, WIRING]
Phase 4: MS5 (sinker EDM completion)                     [6 units, NEW CAPABILITY]
```

## FINAL TARGET: 249 baseline + 100 new tests = 349 tests, 100% pass rate

### MINIMUM TEST BASELINE GATE (Phase 5 prerequisite)
```
WIRE-EDM minimum: 30+ dedicated tests before Phase 5 milestones
Current baseline: 249 total ✓ (exceeds minimum — 151 passing + 98 validation)
Validation: match-then-improve against Sodick/Makino/AgieCharmilles application data
  Step 1: Match published cut speeds within ±10% per material/thickness
  Step 2: Improve with Sato gap model convergence and wire lag compensation
```

### MACHINE-TYPE SELECTOR REFERENCE
```
Input: part geometry (size, features, tolerances) + material + batch size
Output: ranked machine type recommendation
Engine: MachineTypeSelectorEngine (shared across all 8 machine roadmaps)
Wire EDM selection criteria: hardened materials (any HRC), tight tolerance (±0.005mm),
  complex 2D profiles (dies, punches, gears), no cutting force (fragile parts),
  conductive materials only, internal profiles (start hole required)
Contra-indicators: non-conductive material (→ waterjet/laser), 3D geometry (→ 5-axis)
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