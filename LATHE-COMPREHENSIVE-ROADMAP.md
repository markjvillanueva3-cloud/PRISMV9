# PRISM LATHE COMPREHENSIVE ROADMAP v3.0
## Triple-Scrutinized | 12 Milestones | 104 Units | 165 Target Tests

Generated: 2026-03-23
Scrutinization passes: 3 (found 113 total gaps, all addressed)
Current test baseline: 172/172 passing (39 general + 133 cold heading die)

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

## ENFORCEMENT & KNOWLEDGE PROTOCOL (applies to EVERY session in this roadmap)

```
ENFORCEMENT HOOKS (fire automatically — no manual invocation):
  - enforce-knowledge-consult.py: WARNS/BLOCKS if turning domain knowledge not consulted
  - enforce-context-retention.py: BLOCKS new engine creation without ENGINE_DIGEST.md
  - enforce-constants-check.py: BLOCKS inline kc1.1/Taylor constants
  - enforce-unit-counter.py: WARN@20, STRONG@40, BLOCK@60 edits
  - enforce-review-gate.py: checks tests + review + wiring before /compact
  - enforce-wiring-gate.py: checks engines wired before stop
  - PostToolUse stub detector: BLOCKS stub returns in engines
  - PostToolUse test quality: BLOCKS || true and bare .includes() in tests

SKILLS TO USE AT EVERY LATHE SESSION:
  /smart CNC lathe programmer + turning specialist
  /forge-triple (per milestone)
  /prism-review (after every build — LOOP 1)
  /test (after every change — LOOP 2)
  /physics-verify (after any force/speed/feed change)
  /program-validate (on every generated G-code)
  /calibrate (compare to Haas workbook reference programs)
  /playbook (check turning anti-patterns)
  /gcode (quick G-code verification)
  /auto-speed-feed (per-block S/F optimization)
  /scrutinize (standalone quality review — LOOP 1)
  /forge-wiring (wiring verification — LOOP 2)
  /trace (wiring chain tracer — LOOP 2)
  /forge-drift (registry drift — LOOP 3)

4-LOOP QUALITY PROTOCOL (MANDATORY for EVERY unit):

  LOOP 1 — SCRUTINIZE (after building each unit):
    /prism-review (3 agents: physics + wiring + test)
    /scrutinize on changed files
    Ask: "Is this REAL logic or a stub/placeholder?"
    Ask: "Would a machinist accept this G-code on a real machine?"
    Ask: "Does force/speed/feed match Sandvik/Kennametal published data?"
    Ask: "Are ALL tribal tips for this operation reflected in the logic?"
    Fix ALL findings before proceeding to Loop 2

  LOOP 2 — GAP FILL (completeness check):
    npx vitest run [affected files] → 0 failures
    Is the engine WIRED? (/trace to verify import → call → result used)
    Are constants from src/physics/constants.ts? (not inline)
    Were tribal tips + playbook rules consulted? (enforcement hook checks)
    Are ALL edge cases handled? (negative dims, exotic materials, machine limits)
    Are there missing test scenarios? (cross-material, cross-controller, negative)
    Does output include justification[] with reasoning?
    Fill ALL gaps — missing tests, unwired engines, unhandled edges

  LOOP 3 — TIE UP (final polish):
    No TODO/FIXME in committed code
    No new `any` types introduced
    Every decision has reasoning[] trail
    Output matches expected format (G-code, setup sheet, cost)
    Cross-engine consistency (force computed once, not 4 times)
    Golden snapshot saved if correct output generated
    MASTER_INDEX updated if new engine/action created
    "This unit is DONE — nothing left to do"
  
  LOOP 4 — VALIDATE (re-verification after fixes):
    Re-run /prism-review on fixed files — findings MUST decrease
    If fixes introduced NEW findings → fix those too
    Full test suite on changed engines → 0 failures
    "This unit is DONE — validated, nothing left"

  Only after ALL 4 LOOPS pass → next unit

MASTER KNOWLEDGE SOURCES FOR ALL TURNING SESSIONS:
  ENGINES: TurningPrintToProgramEngine, TurningProgramAssemblerEngine,
    TurningProfileEngine, TurningForceEngine, ThreadingPipelineEngine,
    LathePostProcessorEngine, ChuckJawForceEngine, TailstockForceEngine,
    SteadyRestPlacementEngine, LiveToolingEngine, MillTurnSwissPipelineEngine
  TRIBAL TIPS: src/data/solidcam-cam-tips.ts (iMachining turning),
    src/data/*-cam-tips.ts (all 18 systems have turning tips)
  PLAYBOOK: MachiningPlaybookEngine 296 rules (turning anti-patterns)
  FORMULAS: FormulaRegistry — Kienzle (kc1.1 for ISO P/M/K/N/S/H),
    Taylor (tool life), CSS formula (Vc = πDn/1000)
  CONSTANTS: src/physics/constants.ts — CANONICAL source for all constants
  REFERENCE PROGRAMS: Haas Lathe Workbook (22 programs with drawings),
    Titans of CNC Academy lathe programs
  CATALOGS: Sandvik Turning catalog (insert grades, approach angles, CSS),
    Machinery's Handbook (threading, taper, spherical turning)
  CONTROLLER TIPS: controller-knowledge-tips.ts (Fanuc/Haas/Mazak/Okuma specifics)
  ACADEMY: College-level turning fundamentals course

PHYSICS FUSION INTEGRATION (ALL S/F milestones — fusion_tier >= 2 MANDATORY):
  Every speed/feed computation MUST use PhysicsFusionOrchestratorEngine (fusion_tier >= 2).
  Tier 1 (single-pass) NOT acceptable for production — multi-model convergence required.
  Action: physics_fusion via calcDispatcher.
  Outputs: Fc_N, power_kW, temperature_C, deflection_um, Ra_um, stability, confidence.
  Inputs REQUIRED: kc1.1/mc (canonical), tool geometry (D/Z/rake/helix/edge_radius),
    engagement (ap/ae/approach_angle), material (iso_group/hardness), machine limits.
  See: PhysicsFusionOrchestratorEngine.ts + 5 plugins in src/engines/plugins/

IN-PROCESS PROBING (add to relevant milestones):
  Tool touch-off: X/Z presetter for tool length offset, automated tool setter.
  Work offset probing: part face Z-touch, OD X-touch for G54+ offsets.
  In-cycle verification: post-rough diameter check, post-finish OD/ID confirmation.
  Bar feeder: bar end detection, remnant length verification.
  Applies to: LATHE-MS1 (multi-machine), LATHE-MS9/MS10 (real parts verification).
```

## PER-MILESTONE KNOWLEDGE + INTENT

### LATHE-MS0: Collision Avoidance — Knowledge Sources
```
ENGINES:
  - CollisionEngine (2,526L) — 3D collision detection
  - AccessibilityAnalysisEngine (689L) — tool reach validation
  - CollisionPreventionEngine (754L) — full-path certification with AABB + narrow-phase
  - SafetyVetoEngine (E1098) — 8 hard vetoes with physics
  - GCodeSafetyAnalyzerEngine — 24 rules × 6 controllers
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — turning collision anti-patterns ("never rapid X before clearing Z")
  - src/data/solidcam-cam-tips.ts — turning collision avoidance tips
  - controller-knowledge-tips.ts — G28 intermediate point behavior per controller
FORMULAS:
  - Boring bar deflection: δ = F×L³/(3EI) — for counter-taper compensation
  - Turret swing arc: radius = max_tool_stickout + turret_radius
  - Minimum chip thickness: h_min = edge_radius × 0.3 (below = rubbing, not cutting)
REFERENCE:
  - ISO 10218 — safety standards for machine tools
  - MachineRegistry — swing diameter, turret type, rapid traverse rates per machine
  - Haas Lathe Workbook — safe retract positions in reference programs

INTENT: A turret swinging during index can crash into the part. A boring bar
  reaching too deep deflects and cuts a tapered bore. PRISM must prevent EVERY
  collision scenario — before Cycle Start. This is SAFETY-CRITICAL.
```

### LATHE-MS0.5: Dialect Reconciliation — Knowledge Sources
```
ENGINES:
  - TurningProgramAssemblerEngine (2,615L — 20 op types, 30+ tools, 4 controllers)
  - LathePostProcessorEngine (543L — Fanuc/Haas/Mazak/Okuma)
  - TurningPrintToProgramEngine (~1,200L — profile + TNC + live tooling + CSS)
  - POST-ULT pipeline (17 engines) — per-block S/F optimization chain
TRIBAL KNOWLEDGE:
  - controller-knowledge-tips.ts — which G-codes differ across controllers
  - MachiningPlaybookEngine — program structure rules (safe start block first)
FORMULAS:
  - CSS: N = 1000×Vc/(π×D) — constant surface speed RPM calculation
  - G50 clamp: S_max = 1000×Vc_max/(π×D_min)
REFERENCE:
  - Fanuc 0i-TD programming manual — G-code reference
  - DISPATCHER_DIGEST.md — which dispatchers handle turning G-code generation

INTENT: Two engines generating G-code = conflicting output. ONE path from
  features → G-code, with controller-specific syntax applied by POST-ULT pipeline.
```

### LATHE-MS1: Multi-Machine — Knowledge Sources
```
ENGINES:
  - ControllerDialectEngine — 20 controller dialects
  - ControllerFeatureMatrixEngine — capability matrix per controller
  - ControllerStrategyValidatorEngine (E1090) — validates controller supports strategy
  - LathePostProcessorEngine — 4 turning-specific dialects
TRIBAL KNOWLEDGE:
  - controller-knowledge-tips.ts — 27 Mazatrol refs, Okuma OSP, Haas NGC specifics
  - src/data/*-cam-tips.ts — controller-specific tips across all 18 CAM systems
  - MachiningPlaybookEngine — controller quirk rules
FORMULAS:
  - G96 CSS implementation differences: Fanuc G96 S200 vs Mazak G96 S200 M03
  - G50 vs LIMS vs G92 — speed clamping per controller
  - Threading: Fanuc G76 P/Q/R vs Haas G76 I/K/D vs Mazak G76 differences
REFERENCE:
  - Fanuc 0i-TD manual, Haas NGC manual, Mazak Mazatrol/EIA manual, Okuma OSP manual
  - Academy: CNC controller fundamentals course

INTENT: Same part on 4 different lathes = 4 different programs. After this
  milestone, PRISM auto-generates the RIGHT dialect for any supported lathe.
```

### LATHE-MS2: Tooling — Knowledge Sources
```
ENGINES:
  - SmartToolSelectorEngine — 7-factor physics-scored from 95K catalog
  - InventoryAwareToolSelectorEngine — check crib FIRST
  - ToolCatalogEngine — 95,608 tools with physical dimensions
  - InsertGradeSelectionEngine — ISO insert grade optimization
  - ToolROIEngine (E1081) — 3 price points with ROI
  - ToolHolderDatabaseEngine — 1,332 holders
  - ToolCoatingSelectionEngine + CoatingSelectionEngine (E1082)
  - BoringBarDeflectionEngine — boring-specific deflection
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — tool selection rules ("ceramic for ISO H >45 HRC")
  - src/data/*-cam-tips.ts — insert selection tips across 18 CAM systems
  - Sandvik tribal tips — nose radius vs surface finish tradeoff
FORMULAS:
  - Insert grade mapping: ISO P→steel, M→stainless, K→cast iron, N→aluminum, S→superalloy, H→hard
  - Nose radius effect on Ra: Ra = fz²/(32×r) — bigger nose = better finish
  - Tool life from insert grade: Taylor VcTⁿ = C per grade
REFERENCE:
  - Sandvik Turning catalog — CNMG/DNMG/VNMG insert selection, approach angles
  - Kennametal NOVO — alternative insert data for cross-reference
  - CoatingRegistry — coating properties by ISO group
  - ToolRegistry — index into full catalog

INTENT: Machinist has a crib with 50 inserts. PRISM checks crib FIRST, shows
  3 price points with ROI, selects correct ISO grade. Wrong grade = 5× shorter tool life.
```

### LATHE-MS3: Workholding — Knowledge Sources
```
ENGINES:
  - ChuckJawForceEngine (498L) — grip force + centrifugal loss
  - TailstockForceEngine (496L) — support force + thermal expansion
  - SteadyRestPlacementEngine (564L) — placement optimization
  - WorkholdingVerificationEngine (E1148) — Coulomb friction grip check
  - WorkholdingForceEngine — general force calculations
  - WorkholdingIntelligenceEngine — advanced analysis
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — workholding anti-patterns ("always verify grip at max RPM")
  - src/data/*-cam-tips.ts — workholding tips across 18 CAM systems
  - controller-knowledge-tips.ts — chuck clamp/unclamp M-codes per controller
FORMULAS:
  - Centrifugal grip loss: F_centrifugal = m × ω² × r (REDUCES grip at high RPM)
  - Net grip: F_net = F_chuck - F_centrifugal - F_cutting × SF
  - Tailstock force: F_support for L/D > 4 (prevents deflection)
  - Steady rest: required for L/D > 8 (prevents whip)
REFERENCE:
  - ISO 10218 — safety factor requirements for workholding
  - Machinery's Handbook — chuck jaw force calculations, live center specifications
  - MachineRegistry — chuck size, bar capacity, tailstock quill travel per machine

INTENT: Part at 3000 RPM in 3-jaw chuck: centrifugal force REDUCES grip.
  PRISM verifies grip - centrifugal - cutting force > 0 with safety factor.
  Without this check, parts fly out of the chuck = crashed machine + injury risk.
```

### LATHE-MS4: End-to-End Pipeline — Knowledge Sources
```
ENGINES:
  - ALL engines from MS0-MS3 — integrated as a pipeline
  - AutoPrintToProgramBridgeEngine — routing: detect turning features → route to turning pipeline
  - FeatureRecognitionEngine — identify OD/ID/face/groove/thread/bore features
  - BlueprintOCREngine — extract dimensions from drawings
  - PrintToGeometryEngine — CadQuery 3D model from dimensions
  - DfMRulesEngine — manufacturability validation
TRIBAL KNOWLEDGE:
  - ALL tip sources from MS0-MS3 — available during pipeline decisions
  - TribalKnowledgeDecisionBridge — queries tips at every decision point
  - TribalKnowledgeActionEngine — 200 actionable rules modify parameters
FORMULAS:
  - ALL formulas from MS0-MS3 — chained through pipeline
  - Full Kienzle force model for turning operations
  - Taylor tool life for insert selection
REFERENCE:
  - Haas Lathe Workbook — end-to-end validation against known programs
  - EXTERNAL-REFERENCE-PROGRAMS-INDEX.md — turning reference sources

INTENT: Drawing goes in → complete CNC program comes out. Machinist uploads drawing,
  gets G-code + setup sheet + cost estimate + decision justification. No manual steps.
```

### LATHE-MS5: Optimization Choices — Knowledge Sources
```
ENGINES:
  - StrategyComparisonEngine (E1099) — radar chart + explanation
  - ToolpathCostComparisonEngine — strategy × tool cost matrix
  - PipelineDecisionOrchestratorEngine (E1080) — Level 3 multi-alternative decisions
  - StrategyBenchmarkEngine (E1096) — Monte Carlo strategy comparison
  - BatchSizeStrategyEngine (E1100) — prototype vs production strategy
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — when to use G71 Type I vs Type II
  - TribalKnowledgeActionEngine — tip-modified strategy scoring
  - Academy courses — turning strategy fundamentals
FORMULAS:
  - Cycle time per strategy: T = Σ(L_cut / (fz × N)) + Σ(L_rapid / V_rapid) + T_tool_change
  - Cost per strategy: C = T × rate + tooling_amortization + scrap_risk
  - Force comparison: Kienzle at each strategy's ap/fz combination
REFERENCE:
  - Sandvik "Turning Productivity" application guide
  - Machinery's Handbook — turning operation economics

INTENT: Machinist sees 3+ options with physics-backed tradeoffs: "Option A (G71
  constant DOC, 3.2 min, $4.80) vs Option B (stepped DOC, 2.8 min, $4.20, 15% less
  force on final pass)." They pick based on THIS job's priorities.
```

### LATHE-MS6: Controller Deep Hardening — Knowledge Sources
```
ENGINES:
  - ControllerDialectEngine — all 20 dialects
  - ConversationalOutputEngine — Mazatrol UNIT/SHAPE, Okuma AOT, Haas VQC
  - GCodeTranspilerEngine — dialect transpilation
  - SubprogramEngine — M98/CALL management
TRIBAL KNOWLEDGE:
  - controller-knowledge-tips.ts — 27 Mazatrol refs + Okuma + Haas specifics
  - src/data/*-cam-tips.ts — controller-specific turning tips
  - Academy courses — controller programming fundamentals
FORMULAS:
  - Macro B variable syntax: #100-#199 common, #500-#999 permanent (Fanuc)
  - G10 offset setting: G10 L10 P1 R-0.015 (tool comp from program)
  - G187 P-values: P1=rough, P2=medium, P3=finish (Haas smoothing)
REFERENCE:
  - Fanuc 0i-TD manual — macros, custom cycles, G10, tool management
  - Haas NGC manual — G187 smoothing, setting 191, macro variables
  - Mazak Mazatrol programming — UNIT/SHAPE/TOOL DATA/CUT COND format
  - Okuma OSP manual — One-Touch, advanced variable programming

INTENT: Deep controller features make programs feel NATIVE. Macro B for Fanuc,
  G187 smoothing for Haas, Mazatrol UNIT for Mazak. These separate a generic
  program from one that uses the machine's FULL capabilities.
```

### LATHE-MS7-MS10: Battle Testing — Knowledge Sources
```
ENGINES:
  - ALL pipeline engines — full end-to-end testing
  - ProcessCapabilityPredictionEngine — Cpk prediction per tolerance
  - QualityPredictionEngine — quality metrics prediction
TRIBAL KNOWLEDGE:
  - ALL tip sources — tips validated against real part outcomes
  - MachiningPlaybookEngine — rules validated against reference programs
FORMULAS:
  - ALL formulas — verified against reference program parameters
  - Cross-material verification: same part in 4140, 316L, 6061, Ti-6Al-4V, D2
REFERENCE:
  - Haas Lathe Workbook reference programs (O00075, O0106, O0107, 22 total)
  - Machinery's Handbook turning examples with known dimensions
  - Titans of CNC Academy lathe programs with video demonstrations
  - Golden snapshots from MS0-MS6 — regression anchors
  - EXTERNAL-REFERENCE-PROGRAMS-INDEX.md — 21 GOLD + 30 SILVER sources
  - Cross-material S/F range tables (from Phase 0-C test infrastructure)
  - Controller dialect assertion library (from Phase 0-C)

INTENT: Battle testing with REAL parts from REAL sources. PRISM's output compared
  to KNOWN correct reference programs. Every coordinate, every S/F value, every
  G-code syntax element verified. After MS10, we can PROVE correct turning programs
  for 20+ real parts across 5+ materials on 4+ controller types.
```

---

## CURRENT STATE (What's Built)

### Engines (existing, working):
| Engine | Lines | Status |
|--------|-------|--------|
| MachiningKnowledgeBaseEngine | 3,667 | 56 actions, 100% lathe knowledge coverage |
| TurningPrintToProgramEngine | ~1,200 | Profile contour + TNC + live tooling + stepped CSS |
| TurningProgramAssemblerEngine | 2,615 | 20 op types, 30+ tools, 4 controllers |
| MillTurnSwissPipelineEngine | 1,587 | Swiss, mill-turn, multi-channel, bar feeder |
| ThreadingPipelineEngine | 710 | G76, thread milling, rigid tap, 12 thread types |
| LathePostProcessorEngine | 543 | 4 dialects (Fanuc/Haas/Mazak/Okuma) |
| TurningProfileEngine | 879 | OD/ID profile generation with arcs |
| CollisionEngine | 2,526 | 3D collision detection (milling-focused) |
| AccessibilityAnalysisEngine | 689 | Tool reach validation |
| CollisionPreventionEngine | 754 | Full-path certification |
| ChuckJawForceEngine | 498 | Grip force, ISO 10218 safety |
| TailstockForceEngine | 496 | Support force, thermal expansion |
| SteadyRestPlacementEngine | 564 | Placement optimization |
| LiveToolingEngine | 173 | Cross-drill, face mill, polygon turn |
| TurningForceEngine | 434 | Kienzle cutting force |
| AutoPrintToProgramBridgeEngine | 540 | File→features→program pipeline |
| CADDrawingKnowledgeEngine | 646 | GD&T, DFM, datum schemes |
| + 8 more lathe-related engines | ~3,500 | Taper, thread, spindle, diamond turning |
| **TOTAL LATHE CODE** | **~21,000** | |

### Tests (passing):
- `tests/okuma-test-suite.ts` — 39/39 (6 general Okuma tests)
- `tests/okuma-cold-heading-die-suite.ts` — 133/133 (11 die-specific tests, 7 tool steels)
- `tests/cost-efficiency-comparison.ts` — 4 cost comparisons vs tutorials

### User's Shop Profile:
- **Industry**: Cold heading dies for fastener trilobes
- **Customers**: ITW, OMG, AFS, Fastenal
- **Materials**: H13, A2, S7, 52100, O2, M2, M4, D2 tool steels
- **Sizes**: 0.5"-6" OD, 1"-8" long
- **Features**: Thru-holes, counterbores (1/2 sides), whistle notches 5-20°, OD pockets 1.25"×0.125"
- **Primary Machines**: Okuma Genos, Okuma Multus

---

## CRITICAL ARCHITECTURAL ISSUES (Must Fix First)

### Issue 1: Dual G-Code Generation Path
TurningPrintToProgramEngine has 430+ lines of inline Fanuc G-code generation.
LathePostProcessorEngine has 543 lines of dialect-aware G-code (4 controllers).
**They are NOT connected.** The `controller` parameter is accepted but IGNORED — all output is Fanuc-generic regardless of what controller is specified.
**Fix**: MS0.5 — route ALL output through LathePostProcessorEngine.

### Issue 2: No Collision Avoidance
Four collision engines exist (4,500+ lines combined) but NONE are wired into the turning pipeline. No boring bar reach check, no turret rotation collision, no safe retract validation.
**Fix**: MS0 — wire collision engines + add lathe-specific checks.

### Issue 3: No Parametric/Macro Programming
100% of output is hardcoded coordinates. No #variable support, no macro B, no part families. 50%+ of production lathe programs ARE parametric macros.
**Fix**: MS9 — new ParametricLatheProgramEngine.

### Issue 4: No Conversational Output
Mazatrol, Okuma AOT, Haas VQC are completely different programming paradigms (not G-code). PRISM only outputs G-code.
**Fix**: MS10 — paradigm advisor + conversational formatters.

---

## MILESTONE DETAILS

### LATHE-MS0: Collision Avoidance & Tool Reach Validation
**Priority: CRITICAL | Units: 13 | Depends on: nothing**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Wire CollisionEngine + AccessibilityAnalysisEngine + CollisionPreventionEngine into TurningPrintToProgramEngine — add lathe-specific collision checks |
| U02 | LatheCollisionZoneEngine — turret rotation swept volume, tool holder vs chuck jaw, rapid traverse safe corridors |
| U03 | Boring bar reach validation — auto-select bar material: steel L/D≤4, carbide L/D≤6, dampened L/D≤10. Shank = 70% of bore minimum |
| | **→ 4-LOOP each unit: SCRUTINIZE → GAP FILL → TIE UP (see protocol at top)** |

> **`/compact` after U01-U03 + 3 loops each**

| U04 | Grooving/parting overhang check — max extension = blade_width × 8 for groove, × 6 for parting |
| U05 | Live tool holder collision — holder protrusion vs tailstock quill. Auto-retract tailstock before live ops |
| U06 | Turret index collision — longest tool swing arc during rotation vs part OD + chuck jaw |
| | **→ 4-LOOP each unit: SCRUTINIZE → GAP FILL → TIE UP** |

> **`/compact` after U04-U06 + 3 loops each**

| U07 | Safe retract positions — X must clear part before Z rapid. G28 intermediate when needed |
| U08 | Machine swing validation — part OD vs max swing diameter |
| U09 | Minimum chip thickness check — if f×sin(kr) < edge_radius × 0.3 → rubbing, auto-increase feed |
| | **→ 4-LOOP each unit: SCRUTINIZE → GAP FILL → TIE UP** |

> **`/compact` after U07-U09 + 3 loops each**

| U10 | 12 collision/safety test scenarios (turret swing, boring reach, grooving, live tool, rapid, G28, swing, chip thickness, parting, adjacent tool, retract, coordinate) |
| U11 | **Boring taper compensation** — calculate bar deflection F×L³/(3EI), program counter-taper so deflection straightens bore |
| U12 | Boring bar springback compensation — program bore 0.005-0.02mm larger to compensate spring-back |
| U13 | G71 Type I vs Type II auto-detection — scan profile X monotonicity. Wrong type = crash |
| | **→ 4-LOOP each unit: SCRUTINIZE → GAP FILL → TIE UP** |

> **`/compact` — LATHE-MS0 COMPLETE. Fresh session for MS0.5**

### LATHE-MS0.5: Dialect Reconciliation — Route Through POST-ULT Pipeline
**Priority: CRITICAL | Units: 5 | Depends on: MS0**

**POST-ULT INTEGRATION:** All G-code from TurningPrintToProgramEngine MUST route through
PostProcessorPipelineEngine (POST-ULT). No inline G-code generation. Controller-specific
dialect, per-block S/F optimization, and safety headers all injected by POST-ULT pipeline.

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | **ARCH FIX**: Route ALL TurningPrintToProgramEngine output through LathePostProcessorEngine. Remove 430+ lines inline G-code. Single path, all dialects |
| U02 | Add Siemens 840D turning dialect — G18 plane, LIMS= clamp, CYCLE95/CYCLE97, SUPA retract |
| U03 | Add DMG MORI CELOS dialect — Siemens base + ShopTurn + CELOS M-codes |
| U04 | Automated dialect validation — same part on 6 controllers, verify different output |
| U05 | Controller parameter regression — assert controller='okuma' produces G15 H0 NOT G54 |


**SESSION BOUNDARY — MANDATORY:**
```
1. Final 4-LOOP pass on all units in this milestone (SCRUTINIZE → GAP FILL → TIE UP)
2. npx tsc --noEmit → 0 errors
3. npx vitest run [affected files] → 0 failures
4. Verify: every engine WIRED + CALLED + RESULT USED (/trace)
5. Verify: tribal tips + playbook consulted for every decision (enforcement hook checks)
6. Verify: no inline constants (enforcement hook checks)
7. /compact (save what was done + 4-loop results + what's next)
8. START NEW SESSION: /startup → /handoff read → /roadmap-quality-check → continue
```

### LATHE-MS1: Multi-Machine Capability & Dialect Adaptation
**Priority: HIGH | Units: 7 | Depends on: MS0.5**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Machine capability database — 20+ models with axes, power, RPM, bar cap, swing, turret, live tool specs |
| U02 | Feature-to-capability matching — whistle_notch needs C-axis, cross_drill needs live tooling, etc. Auto-filter incompatible |
| U03 | Machine auto-selector — rank by capability match, cost, tolerance. Top 3 with reasoning |
| U04 | Swiss-type support — Citizen Cincom, Star SR dialects, guide bushing, gang slide |
| U05 | VTL support — vertical Z, faceplate, low RPM + high power, maximize feed/rev |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Twin turret simultaneous — Gantt overlap optimization, channel sync, collision check between turrets |
| U07 | Tests: same H13 die on 6 machines, validate dialect + capability filtering |


**SESSION BOUNDARY — MANDATORY:**
```
1. Final 4-LOOP pass on all units in this milestone (SCRUTINIZE → GAP FILL → TIE UP)
2. npx tsc --noEmit → 0 errors
3. npx vitest run [affected files] → 0 failures
4. Verify: every engine WIRED + CALLED + RESULT USED (/trace)
5. Verify: tribal tips + playbook consulted for every decision (enforcement hook checks)
6. Verify: no inline constants (enforcement hook checks)
7. /compact (save what was done + 4-loop results + what's next)
8. START NEW SESSION: /startup → /handoff read → /roadmap-quality-check → continue
```

### LATHE-MS2: Tooling Variability & Real Library Integration
**Priority: HIGH | Units: 10 | Depends on: MS0**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Wire sandvik-tool-catalog.ts (95K tools) into selectInsert() — query by ISO group, operation, nose radius |
| U02 | User tool inventory input — turret_layout with actual tools → select from AVAILABLE only |
| U03 | Insert geometry optimizer — recommend C/D/V/W/T/S/R with reasoning per feature |
| U04 | Nose radius tradeoff calculator — R0.2/0.4/0.8/1.2/1.6 vs Ra at each feed |
| U05 | Boring bar auto-selection — bore dia → shank (70%), depth → material (steel/carbide/dampened) |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Grooving width auto-selection — match groove to insert, multiple plunges if needed |
| U07 | Wiper insert support — halve Ra prediction when selected |
| U08 | Thread insert type — full profile 60°, partial profile, 55° BSP |
| U09 | Live tool holder types — ER/Capto/HSK-T/VDI with RPM + stiffness effects |
| U10 | Tests: economy/standard/premium tool sets on same part |


**SESSION BOUNDARY — MANDATORY:**
```
1. Final 4-LOOP pass on all units in this milestone (SCRUTINIZE → GAP FILL → TIE UP)
2. npx tsc --noEmit → 0 errors
3. npx vitest run [affected files] → 0 failures
4. Verify: every engine WIRED + CALLED + RESULT USED (/trace)
5. Verify: tribal tips + playbook consulted for every decision (enforcement hook checks)
6. Verify: no inline constants (enforcement hook checks)
7. /compact (save what was done + 4-loop results + what's next)
8. START NEW SESSION: /startup → /handoff read → /roadmap-quality-check → continue
```

### LATHE-MS3: Workholding Adaptation & Grip Force Safety
**Priority: HIGH | Units: 8 | Depends on: MS0**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Wire ChuckJawForceEngine — grip > cutting_force × 2.5 (ISO 10218) |
| U02 | Centrifugal force RPM limiter — effective_grip = static - centrifugal → auto-set G50 Smax |
| U03 | Jaw type friction — hard_smooth(0.3), hard_serrated(0.5), soft_OD(0.45), soft_ID(0.40) |
| U04 | Op2 workholding — detect finished surfaces, recommend soft jaws for cosmetic OD |
| U05 | Wire TailstockForceEngine — auto-engage at L/D > 4, live vs dead center selection |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Wire SteadyRestPlacementEngine — auto-place at L/D > 8, fixed vs follow rest |
| U07 | Missing types: 6-jaw, dead-length collet, mandrel, spider, dog driver, magnetic |
| U08 | Tests: 5 workholding configs on same part, verify RPM limits change |


**SESSION BOUNDARY — MANDATORY:**
```
1. Final 4-LOOP pass on all units in this milestone (SCRUTINIZE → GAP FILL → TIE UP)
2. npx tsc --noEmit → 0 errors
3. npx vitest run [affected files] → 0 failures
4. Verify: every engine WIRED + CALLED + RESULT USED (/trace)
5. Verify: tribal tips + playbook consulted for every decision (enforcement hook checks)
6. Verify: no inline constants (enforcement hook checks)
7. /compact (save what was done + 4-loop results + what's next)
8. START NEW SESSION: /startup → /handoff read → /roadmap-quality-check → continue
```

### LATHE-MS4: End-to-End Pipeline Integration
**Priority: CRITICAL | Units: 8 | Depends on: MS0.5, MS1, MS2, MS3**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Complete chain: text→parse→features→machine_select→tool_select→collision→workholding→program→setup_sheet |
| U02 | Wire missing ops: reaming, countersinking, knurling, burnishing |
| U03 | Sub-spindle back-working — Op2 from sub-spindle side after transfer |
| U04 | Bar feeder loop — M99, parts/bar, remnant tracking |
| U05 | Setup sheet generation — fixture, tools, offsets, datum, inspection, cycle time, safety notes |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Error handling — graceful degradation, never silently drop features |
| U07 | Cycle time accuracy — target ±15% of actual |
| U08 | Tests: 5 end-to-end runs × 2 machines = 10 pipeline tests |


**SESSION BOUNDARY — MANDATORY:**
```
1. Final 4-LOOP pass on all units in this milestone (SCRUTINIZE → GAP FILL → TIE UP)
2. npx tsc --noEmit → 0 errors
3. npx vitest run [affected files] → 0 failures
4. Verify: every engine WIRED + CALLED + RESULT USED (/trace)
5. Verify: tribal tips + playbook consulted for every decision (enforcement hook checks)
6. Verify: no inline constants (enforcement hook checks)
7. /compact (save what was done + 4-loop results + what's next)
8. START NEW SESSION: /startup → /handoff read → /roadmap-quality-check → continue
```

### LATHE-MS5: User Optimization Choices
**Priority: MEDIUM | Units: 5 | Depends on: MS4**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Multi-option: (A) fastest cycle, (B) best finish, (C) longest tool life |
| U02 | Cost-per-part breakdown: material + tooling + machine time + setup |
| U03 | What-if analysis: change any parameter → instant recalculation + delta |
| U04 | Batch size optimization: 1 part vs 100 vs 10,000 → different strategies |
| U05 | Tests: A/B/C for H13 die with cost validation |


**SESSION BOUNDARY — MANDATORY:**
```
1. Final 4-LOOP pass on all units in this milestone (SCRUTINIZE → GAP FILL → TIE UP)
2. npx tsc --noEmit → 0 errors
3. npx vitest run [affected files] → 0 failures
4. Verify: every engine WIRED + CALLED + RESULT USED (/trace)
5. Verify: tribal tips + playbook consulted for every decision (enforcement hook checks)
6. Verify: no inline constants (enforcement hook checks)
7. /compact (save what was done + 4-loop results + what's next)
8. START NEW SESSION: /startup → /handoff read → /roadmap-quality-check → continue
```

### LATHE-MS6: Controller-Specific Deep Hardening
**Priority: MEDIUM | Units: 7 | Depends on: MS0.5**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Okuma OSP-P300L deep — G15 H0-H48, T0001, M50/M51, M19 R-angle, G199/G198, NVAR |
| U02 | Okuma Multus OSP-P300M — B-axis, M143/M144/M145, M133/M135, G112/G113 polar |
| U03 | Haas NGC — Setting 33, D-word G71, P-seconds dwell, macros, M97 local sub |
| U04 | Mazak SmoothAi — !L/!R channel, G53.5 offset, SMOOTH interpolation |
| U05 | Fanuc 31i-B — G12.1 polar, G68.1 tilted work plane, nano interpolation, WHILE/DO/END |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Siemens 840D — CYCLE95/CYCLE97, LIMS=, SUPA, G18, GOTOF/GOTOB |
| U07 | Tests: G71+G70+G75+G76 in ALL 6 dialects, verify zero cross-contamination |


**SESSION BOUNDARY — MANDATORY:**
```
1. Final 4-LOOP pass on all units in this milestone (SCRUTINIZE → GAP FILL → TIE UP)
2. npx tsc --noEmit → 0 errors
3. npx vitest run [affected files] → 0 failures
4. Verify: every engine WIRED + CALLED + RESULT USED (/trace)
5. Verify: tribal tips + playbook consulted for every decision (enforcement hook checks)
6. Verify: no inline constants (enforcement hook checks)
7. /compact (save what was done + 4-loop results + what's next)
8. START NEW SESSION: /startup → /handoff read → /roadmap-quality-check → continue
```

### LATHE-MS7: Physics & Science Hardening
**Priority: HIGH | Units: 13 | Depends on: MS0**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Turning chatter/SLD — wire analyzeTurningChatter(), auto-avoid critical RPM |
| U02 | Hard turning surface integrity — white layer depth, residual stress, achievable Ra |
| U03 | Thread constant chip area — √n pass progression in G76 output |
| U04 | Drill thrust force — verify vs tailstock force (push-off risk) |
| U05 | Parting force 1.25× multiplier in power check |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Workpiece beam deflection — actual δ at tool point, auto-recommend support |
| U07 | Tool wear progression — predict VB vs time, sister tool switching point |
| U08 | Thermal expansion compensation — for <0.01mm tolerance parts |
| U09 | Tests: chatter, white layer, thread schedule, deflection validation |
| U10 | Chip breaking feed oscillation — 150% feed spike for ISO M/P continuous chips |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U11 | Decreasing peck depth — first peck largest, 20% smaller per subsequent |
| U12 | Thread spring passes — 1-2 zero-infeed passes in G76 P-word |
| U13 | Bore bottom dwell — G04 auto-insert by material (P:0.3s, M:0.5s, S:0.8s) |


**SESSION BOUNDARY — MANDATORY:**
```
1. Final 4-LOOP pass on all units in this milestone (SCRUTINIZE → GAP FILL → TIE UP)
2. npx tsc --noEmit → 0 errors
3. npx vitest run [affected files] → 0 failures
4. Verify: every engine WIRED + CALLED + RESULT USED (/trace)
5. Verify: tribal tips + playbook consulted for every decision (enforcement hook checks)
6. Verify: no inline constants (enforcement hook checks)
7. /compact (save what was done + 4-loop results + what's next)
8. START NEW SESSION: /startup → /handoff read → /roadmap-quality-check → continue
```

### LATHE-MS8: Production Validation & Exhaustive Test Suites
**Priority: CRITICAL | Units: 14 | Depends on: ALL**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Full matrix: 12 parts × 6 machines = 61 programs, all validated |
| U02 | Simple tests: P1-P3 × 6 machines = 18 programs |
| U03 | Medium tests: P4-P6 × compatible machines |
| U04 | Complex tests: P7-P9 × live-tool machines only |
| U05 | Extreme tests: P10-P12 × compatible machines |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Cross-dialect: P6 on ALL 6 controllers, line-by-line diff |
| U07 | Collision scenarios: 12 deliberate setups, all caught |
| U08 | Tooling variation: economy/standard/premium |
| U09 | Workholding variation: 5 configs |
| U10 | Cost efficiency: every PRISM program vs manual, document savings |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U11 | Swiss-type test: P12 on Citizen Cincom |
| U12 | VTL test: P12 on vertical lathe |
| U13 | Regression CI/CD: single command runs ALL, zero tolerance for failure |
| U14 | Real machine dry run: Okuma Genos single-block verification |


**SESSION BOUNDARY — MANDATORY:**
```
1. Final 4-LOOP pass on all units in this milestone (SCRUTINIZE → GAP FILL → TIE UP)
2. npx tsc --noEmit → 0 errors
3. npx vitest run [affected files] → 0 failures
4. Verify: every engine WIRED + CALLED + RESULT USED (/trace)
5. Verify: tribal tips + playbook consulted for every decision (enforcement hook checks)
6. Verify: no inline constants (enforcement hook checks)
7. /compact (save what was done + 4-loop results + what's next)
8. START NEW SESSION: /startup → /handoff read → /roadmap-quality-check → continue
```

### LATHE-MS9: Parametric & Macro Programming Engine
**Priority: HIGH | Units: 8 | Depends on: MS0.5**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Parametric part families — #variables for dimensions, one program → many sizes |
| U02 | Fanuc Macro B output — IF/GOTO, WHILE/DO/END, M98/M99, G65 |
| U03 | Okuma NVAR output — NVAR(1)-NVAR(200), IF/THEN/ENDIF |
| U04 | Haas macro output — #100-#199 local, #500-#999 persistent, M97 |
| U05 | Production macro template — part counter, inspection stop, sister tool, bar feeder, G10 auto-offset |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Adaptive feed macro — read #3028 spindle load, IF > 80% reduce F |
| U07 | Multi-fixture loop — G54→G55→G56→G57 with M98 subprogram |
| U08 | Tests: die family in 3 sizes, verify parametric output |


**SESSION BOUNDARY — MANDATORY:**
```
1. Final 4-LOOP pass on all units in this milestone (SCRUTINIZE → GAP FILL → TIE UP)
2. npx tsc --noEmit → 0 errors
3. npx vitest run [affected files] → 0 failures
4. Verify: every engine WIRED + CALLED + RESULT USED (/trace)
5. Verify: tribal tips + playbook consulted for every decision (enforcement hook checks)
6. Verify: no inline constants (enforcement hook checks)
7. /compact (save what was done + 4-loop results + what's next)
8. START NEW SESSION: /startup → /handoff read → /roadmap-quality-check → continue
```

### LATHE-MS10: Programming Paradigm Advisor & Conversational Output
**Priority: MEDIUM | Units: 6 | Depends on: MS4, MS9**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Paradigm Decision Engine — complexity + batch + machine + operator → hardcode/parametric/conversational/CAM |
| U02 | Mazatrol conversational output — UNIT+SHAPE format for simple Mazak parts |
| U03 | Okuma AOT guidance — AOT setup instructions for simple Okuma parts |
| U04 | Haas VQC guidance — VQC-compatible format for simple Haas parts |
| U05 | Decision rules: simple→conversational, family→macro, complex→G71+CAM, multi-axis→CAM, volume→macro+sister |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Tests: 5 parts → correct paradigm recommendation |

---

## TEST MATRIX

### Parts (12):
| ID | Part | Material | OD | Length | Key Features |
|----|------|----------|-----|--------|-------------|
| P1 | Simple shaft | 1045 | 2" | 3" | Face + single OD |
| P2 | Stepped shaft | 4140 | 2.5" | 4" | 3 diameters |
| P3 | Chamfer+fillet shaft | 1018 | 2" | 3" | C1 chamfer, R3 fillet |
| P4 | Thread+groove+cutoff | 4140 | 1.75" | 2.5" | M40×1.5, O-ring groove |
| P5 | Bore+drill+tap | A2 | 2.5" | 2" | Ø25H7 bore, M8 tap |
| P6 | Die casing cbore both | H13 | 3" | 4" | Thru-hole, cbore each end |
| P7 | 12-point profile | S7 | 3" | 5" | G02/G03 arcs, steps, tapers |
| P8 | Whistle notch die | H13 | 3" | 4" | 10° notch (live tool) |
| P9 | OD pocket die | D2 | 2.5" | 3" | 1.25"×0.125" pocket (live) |
| P10 | ULTIMATE all features | H13 | 3" | 5" | Everything combined |
| P11 | Hardened CBN | H13 48HRC | 3" | 2" | Hard turning, Ra 0.4µm |
| P12 | XL die | D2 | 6" | 8" | Max size, deep bore |

### Machines (6):
| ID | Machine | Controller | Axes | Live | Sub |
|----|---------|-----------|------|------|-----|
| M1 | Okuma Genos L3000 | OSP-P300L | 2 | No | No |
| M2 | Okuma Genos L3000-MY | OSP-P300L | 3+C | Yes | Yes |
| M3 | Okuma Multus B300 | OSP-P300M | 5+C+Y+B | Yes | Yes |
| M4 | Haas ST-20 | Haas NGC | 2 | No | No |
| M5 | Haas DS-30Y | Haas NGC | 3+C | Yes | Yes |
| M6 | Mazak QTN-250MY | SmoothAi | 3+C | Yes | Yes |

### Compatibility (✓=can run, ✗=cannot):
| Part | M1 | M2 | M3 | M4 | M5 | M6 |
|------|:--:|:--:|:--:|:--:|:--:|:--:|
| P1-P5 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| P6 | ✓* | ✓ | ✓ | ✓* | ✓ | ✓ |
| P7 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| P8-P9 | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ |
| P10 | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ |
| P11 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| P12 | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
**Total valid programs: 61**

---

## EXECUTION ORDER

```
Phase 1: MS0 (collision) → MS0.5 (dialect fix)     [18 units, SAFETY]
Phase 2: MS7 + MS9 (parallel)                       [21 units, PHYSICS + PARAMETRIC]
Phase 3: MS1 + MS2 + MS3 (parallel)                 [25 units, MACHINES + TOOLS + WORKHOLDING]
Phase 4: MS4 (pipeline integration)                  [8 units, WIRING]
Phase 5: MS5 + MS6 + MS10 (parallel)                [18 units, OPTIMIZATION + CONTROLLERS]
Phase 6: MS8 (exhaustive validation)                 [14 units, TESTING]
```

## FINAL TARGET: 165 tests, 100% pass rate

### MINIMUM TEST BASELINE GATE (Phase 5 prerequisite)
```
LATHE minimum: 50+ dedicated tests before Phase 5 milestones
Current baseline: 172/172 passing ✓ (exceeds minimum)
Validation: match-then-improve against Sandvik/Kennametal published turning data
  Step 1: Match published S/F within ±10% for reference materials
  Step 2: Improve with fusion_tier >= 2 convergence (force, temperature, wear)
```

### MACHINE-TYPE SELECTOR REFERENCE
```
Input: part geometry (size, features, tolerances) + material + batch size
Output: ranked machine type recommendation
Engine: MachineTypeSelectorEngine (shared across all 8 machine roadmaps)
Lathe selection criteria: rotational symmetry, OD/ID/face/thread, ±0.025mm+ tolerance
Contra-indicators: prismatic features (→ milling), off-center features (→ mill-turn)
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
5. Verify: tribal tips + playbook consulted for every decision (enforcement hook checks)
6. Verify: no inline constants (enforcement hook checks)
7. /compact (save what was done + 4-loop results + what's next)
8. START NEW SESSION: /startup → /handoff read → /roadmap-quality-check → continue
```