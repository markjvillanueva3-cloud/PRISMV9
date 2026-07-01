# PRISM AutoProgram Roadmap — F360-AP

## Context

**Problem:** PRISM has 20+ production-ready backend engines for CNC programming (feature recognition, DFM analysis, tool selection from 95K catalog, 762 toolpath strategies, Kienzle/Taylor/SLD physics, collision detection, simulation, probe generation) but they aren't chained together through Fusion 360. The current F360 add-in can read CAM data but cannot CREATE operations.

**Goal:** One-button "PRISM AutoProgram" in Fusion 360 that reads the model, classifies features, selects tools, picks strategies, computes physics-backed S/F, creates CAM operations, generates toolpaths, verifies safety, and outputs setup sheet + cycle time + probe routines.

**Competitive Edge:** CloudNC CamAssist claims 80% automation with lookup-table S/F. PRISM targets 95%+ with Kienzle-backed per-block variable S/F, SLD chatter avoidance, and 3,700+ tribal knowledge tips — capabilities no competitor has.

---

## Training & Validation Data Sources (USE THESE — don't generate synthetic data)

### Tier 1: Primary Learning Set (load first, validate every stage against)
| Source | Path | Count | Use |
|---|---|---|---|
| Industrial parts (STEP) | `BOX/PART MODELS FOR LEARNING ENGINE/BATCH 1/` | 30 parts | Feature recognition training, DFM validation, strategy selection |
| Shop tool library (CSV) | `BOX/PRISM FOLDER FROM HOME/FUSION TOOL LIBRARY/` | 225 tools (7 CSVs) | Tool selection validation — real shop tools with SFM/FPT |
| Fusion post processors | `BOX/FUSION BASIC POSTS/` | 150+ .cps files | Output format, controller dialect selection |
| Tribal knowledge (20 CAMs) | `mcp-server/src/data/*cam-tips*.ts` | 49,339 lines | Strategy selection, parameter tuning, warnings |
| Reference CNC programs | `BOX/PRISM FOLDER FROM HOME/PRISM PROGRAM EXAMPLES/` | 7 programs | Output quality golden comparison |
| Okuma macros (real prod) | `BOX/MACRO PROGRAMS/` | 2 macros (14KB each) | Macro-to-hardcode validation, 170+ params |
| Fusion 360 native model | `BOX/PRISM FOLDER FROM HOME/CAD MODELS FOR TESTING/` | F3D + STEP + STL + PDF | End-to-end Fusion validation |

### Tier 2: Progressive Testing (use for hardening after Tier 1 works)
| Source | Path | Count | Use |
|---|---|---|---|
| BSHC training series | `BOX/PRISM CAD-CAM TRAINING/` | 6 variants (1A→2C) | Progressive complexity: simple→complex lathe |
| CAD reference parts | `cad-engine/reference_parts/` | 10 canonical shapes | Unit test geometry (bearing_block, bracket, manifold, etc.) |
| hyperMILL training | `resources/2- Basic Training Day 2/` | 17 STEP + 3.4MB tool DB | Strategy progression: basic→HSM→MAXX |
| External programs index | `mcp-server/data/docs/EXTERNAL-REFERENCE-PROGRAMS-INDEX.md` | 50+ programs | Haas/Mazak/DMG workbook programs |
| Engineering drawings | `BOX/` + `H:/cad test.jpg` | 15+ PDFs | Print-to-program validation (GD&T, tolerances) |

### Tier 3: Physics Calibration
| Source | Path | Use |
|---|---|---|
| Coefficient database | `data/COEFFICIENT_DATABASE.json` | Kienzle/Taylor constant validation |
| Controller tips | `mcp-server/src/data/controller-knowledge-tips.ts` | Controller-specific optimization rules |
| Fusion 360 CAM tips | `mcp-server/src/data/fusion360-cam-tips.ts` (495 + 1,996 lines) | Fusion-specific tribal knowledge |
| Learning resources | `mcp-server/data/docs/LEARNING_RESOURCES.md` | External calibration (Sandvik, Kennametal, SME) |
| Machine learning data | `mcp-server/data/machine-learning-data.json` | CAM decision-making training |

### Tier 0: Fusion 360 Cloud Library (RICHEST SOURCE — 50-100x richer than STEP files)
| Source | API | Data Available | Use |
|---|---|---|---|
| All cloud projects | `app.data.dataProjects` | Project names, folder tree, file IDs | Navigate entire shop library |
| Cloud design files | `dataFile.open()` → `adsk.fusion.Design` | Feature tree, bodies, sketches, parameters | Feature extraction + complexity scoring |
| Cloud CAM setups | `adsk.cam.CAM.cast(doc.products)` | Setups, operations, tools, S/F values | **PROVEN parameters** — actual shop-tested S/F per material/tool |
| Version history | `dataFile.versions` | Revision count, dates, authors, comments | Design maturity signal + iteration tracking |
| File metadata | `dataFile.createdDate/modifiedDate/size` | Timestamps, file size | Activity and complexity indicators |

**Why this matters:** STEP files have ZERO CAM history. Cloud files have EVERYTHING — every tool used, every S/F value, every strategy chosen, every version revision. AutoProgram can learn from ALL past shop work, not just 30 disconnected geometry snapshots.

**New endpoints needed in PRISMBridge:**
1. `GET /data/projects` — List all cloud projects
2. `POST /data/folder/list` — Traverse folder tree
3. `POST /data/file/open` — Load cloud file into workspace
4. `POST /data/file/metadata` — Extract design + CAM info (features, setups, tools, S/F)
5. `POST /data/file/versions` — Get revision history
6. `POST /data/search` — Full-text search across cloud library

**New engine:** `CloudCAMIndexerEngine.ts` — Crawls cloud library, extracts tool/S&F/strategy history, builds shop-specific preference database, provides ground truth for physics calibration.

### Fixture/Workholding Test Data
- `BOX/PRISM FOLDER FROM HOME/FIXTURES/LATHE COLLET CHUCK.stl` — workholding validation

---

## Architecture: 10-Stage Pipeline

```
[PRISM AutoProgram Button]
  S1  Model Intake ........... Fusion360LiveBridgeEngine → /cam/geometry-detail
  S2  Feature Recognition .... FeatureRecognitionEngine (20 types, confidence)
  S3  DFM Analysis ........... DFMPipelineEngine (8 substages, cost impact)
  S4  Process Planning ....... MultiSetupFeasibilityChainEngine (datum chain Monte Carlo)
  S5  Tool Selection ......... SmartToolSelectorEngine (95K catalog, 7-factor scoring)
  S6  Strategy Selection ..... ToolpathStrategyRegistry (762 strategies, 18 CAM systems)
  S7  Speed/Feed Optimization  SpeedFeedOrchestratorEngine (Kienzle/Taylor/SLD, 8 resolvers)
  S8  Fusion CAM Creation .... NEW endpoints: /cam/setup, /cam/operation, /cam/assign-tool
  S9  Verification ........... IntegratedVerificationEngine + CollisionEngine + Simulation
  S10 Output Package ......... SetupSheet + CycleTime + ProbeRoutines + Cost
```

All 20 engines exist. The work is wiring, not building.

---

## Milestone Structure (9 milestones, 56 units, ~28 sessions)

### MS0: F360-AP-MS0 — Fusion CAM API Surface + Cloud Library + HTTP Resilience (Foundation)
**Units: 10 | Sessions: 5 | Prerequisite: None**
- CAM setup/operation creation, tool assignment, toolpath gen, post-process
- B-Rep geometry extraction + feature candidate grouping
- **Cloud library access**: 6 new Data API endpoints (projects, folders, files, metadata, versions, search)
- HTTP bridge hardening: exponential backoff retry (3x), connection health monitor, graceful degradation, request queuing

### MS1: F360-AP-MS1 — AutoProgram Orchestrator Engine (Brain)
**Units: 6 | Sessions: 3 | Prerequisite: MS0**
- 10-stage pipeline with PipelineCheckpointManager
- Per-stage SLO tracking (S1<2s, S2<3s, S5<5s, S7<10s, S8<15s, S9<10s)
- 25+ operation type mapping (original 10 + bore, rest_machining, slot, spiral, steep_shallow, indexed_3plus2, swarf_5ax, multiaxis_contour, projection, radial, circular, ramp)

### MS2: F360-AP-MS2 — UX Specification + UI Panel
**Units: 6 | Sessions: 3 | Prerequisite: MS0 + MS1**
- UX wireframes for every state (idle, running, progress, error, results, DFM-blocking)
- Cancel/rollback behavior (abort pipeline, undo created operations)
- "Verify Before Run" mode — first 10 programs require manual approval
- Confidence meter: green/yellow/red based on feature complexity + physics confidence
- Detailed progress: "Analyzing feature 3/5: pocket 12x8mm" not just "Stage 4..."
- Error messages: specific, actionable ("Tool D10 too short for 25mm pocket — try D8 with longer reach")

### MS3: F360-AP-MS3 — Safety Verification + Physics Hardening
**Units: 6 | Sessions: 3 | Prerequisite: MS1 + MS2**
- Collision HARD BLOCK with iterative remediation (max 3x)
- Spindle overload protection: Fc vs machine power at every RPM
- Rapid-into-stock detection: validate every G0 move clears stock + fixture
- Ploughing force correction at fz < 0.02mm (size effect)
- BUE avoidance: warn when Vc in BUE range for material (60-120 m/min for steel)
- Workholding force check: Fc < clamp * 0.7 (iterative feed reduction if exceeded)

### MS4: F360-AP-MS4 — Expanded Workholding + Fixture Intelligence
**Units: 4 | Sessions: 2 | Prerequisite: MS1**
- Expand from 7 to 15 workholding types: + soft_jaws, 4th_axis_rotary, pallet_system, angle_plate, v_block, custom_fixture, modular_fixture, zero_point_system
- Wire FixtureDesignEngine, FixtureClampingEngine, FixtureDynamicsEngine, FixtureAwareStrategyEngine
- Pallet system support: multiple parts per setup, nesting optimization
- 4th axis: auto-detect when rotary indexing reduces setup count

### MS5: F360-AP-MS5 — Full Machine Coverage (ALL CNC Types)
**Units: 24 | Sessions: 12 | Prerequisite: MS1**

**Principle:** AutoProgram must be machine-agnostic. The S4 Process Planning stage auto-detects
machine type from MachineRegistry (910 machines) and routes to the correct pipeline + post.
Every machine class has its own physics, kinematics, collision envelope, and G-code dialect.

**Existing PRISM Assets (910 machines, 9 pipelines, 20 controller dialects):**
- MachineRegistry: 910 machines across all types (Okuma, Haas, DMG MORI, Mazak, Doosan, etc.)
- 9 Manufacturing Pipelines: PrintToProgram (milling), Turning, MultiAxis, MillTurn, EDM, Grinding, Laser, Waterjet, QuoteToShip
- PostProcessorPipelineEngine: 38 stages, 20 controller dialects
- 150+ CPS post-processors in BOX/FUSION BASIC POSTS/
- ToolpathStrategyRegistry: 762 strategies (127 milling roughing, 156 finishing, 98 hole-making, 124 turning, 157 multi-axis, 50+ PRISM novel)

---

#### MS5-A: Vertical Milling Centers (VMC) — 3-Axis (2 sessions)
**Machines:** Haas VF-2/VF-4, Okuma GENOS M560-V, DMG MORI CMX series, Brother, Hurco, Tormach
**Pipeline:** PrintToProgramPipelineEngine
**Controllers:** Fanuc, Haas NGC, Siemens 828D

- Operations: face, pocket_2d, contour_2d, adaptive_clear, drill_peck, tap, bore, chamfer, slot, engrave
- Strategy selection from 283 milling strategies (127 roughing + 156 finishing)
- WCS: G54-G59, G54.1 P1-P48 for multi-part fixtures
- Canned cycles: G81/G83 (drill), G84/G74 (tap), G85/G86 (bore)
- High-speed machining: G05.1 (AICC/Nano), look-ahead buffer config per controller
- Chip thinning: automatic CTF adjustment for < 50% radial engagement
- Validate: bracket.step + manifold_block.step from reference_parts/
- Validate: Haas workbook programs (EXTERNAL-REFERENCE-PROGRAMS-INDEX.md)

#### MS5-B: Horizontal Milling Centers (HMC) + 4th Axis (2 sessions)
**Machines:** Okuma MB-5000H, Haas EC-400, DMG MORI NHX series, Mazak HCN
**Pipeline:** PrintToProgramPipelineEngine + 4th axis extension
**Differences from VMC:** Tombstone fixtures, B-axis rotary, pallet changer, chip evacuation (gravity-assisted)

- Tombstone multi-face programming: 4 sides × N parts per side
- B-axis indexing: auto-detect when rotary reduces setup count
- Pallet changer integration: G-code pallet call sequences (M60/M61)
- Chip management: horizontal = gravity assists, but coolant strategy differs
- Workholding: tombstone, modular fixture, zero-point system, angle plates
- Validate: Okuma MB-5000H handbook specs vs generated programs

#### MS5-C: 5-Axis Milling (Indexed 3+2 and Simultaneous) (3 sessions)
**Machines:** Okuma MU-5000V/MU-6300V, DMG MORI DMU 50/80, Haas UMC-750, Hermle C-series
**Pipeline:** MultiAxisPrintToProgramEngine
**Controllers:** Fanuc, Siemens 840D, Heidenhain TNC

- **3+2 Indexed:** G68.2 tilted work plane (Fanuc) / CYCLE800 (Siemens) / Plane Spatial (Heidenhain)
- **Simultaneous 5-axis:** G43.4/G43.5 TCPC (tool center point control)
- Operations: swarf_5ax, multiaxis_contour, flow, morphed_spiral, steep_shallow, projection
- Strategy: 157 multi-axis strategies from ToolpathStrategyRegistry
- Singularity avoidance: A/C axis limit detection, rotary wrap handling
- Collision: tool + holder + spindle head vs part + fixture (critical for trunnion machines)
- Post-processor: RTCP (rotary tool center point) vs non-RTCP machines
- Kinematic models: trunnion-table (A+C), swivel-head (A+C), mixed, fork-head (B+C)
- Validate: MU-5000V handbook, impeller case study (EXTERNAL-REFERENCE-PROGRAMS-INDEX.md)

#### MS5-D: Lathes — 2-Axis + Live Tooling + Y-axis (3 sessions)
**Machines:** Okuma LB3000 EX II MY, LB4000 EX II, GENOS L300-MY, Haas ST-30, Mazak Quick Turn, DMG MORI CLX/NLX, Doosan Lynx
**Pipeline:** TurningPrintToProgramEngine
**Controllers:** Fanuc, Okuma OSP, Haas NGC (lathe mode), Mazak Matrix

**Phase D1: Pure Turning (all controllers)**
- G96 (CSS) vs G97 (RPM): auto-select (CSS for finish, G97 for threading/interrupted)
- G50 SMAX enforcement by chuck size + material + diameter
- Canned cycles: G71/G70 (rough/finish contour), G76 (threading), G74/G75 (peck drill/groove)
- Tool nose radius comp (TNRC): P-value by tool type (P3=OD, P2=bore, P0=drill)
- Operations: face, OD_rough, OD_finish, ID_rough, ID_bore, groove, thread, part_off, taper, contour
- Controller-specific: Okuma angle = 180 - angle; Fanuc/Haas = standard
- Validate: CASING_MACRO.MIN + CBORE_CASING_MACRO.MIN golden comparison
- Validate: BSHC 1A→2C progressive complexity
- Validate: okuma-test-suite.ts 6 test cases

**Phase D2: Live Tooling + C-axis + Y-axis**
- C-axis indexing (M19 orient → C moves): cross-drill, hex, bolt circles
- Polar interpolation (G12.1): face milling in polar coordinates
- Cylindrical interpolation (G107): keyway cutting, OD milling
- Y-axis operations: off-center drilling, milling, tapping
- Turret management: tool interference rules, shortest-Z-first layout
- Validate: LB3000 EX II MY (X/Y/Z/C, 12-turret, live tooling)

**Phase D3: Controller dialect handling**
- Fanuc: G96/G97, G71 Type I/II, G76, DPRNT
- Okuma OSP: V-variables, IF/GOTO, angle conventions, N-block naming
- Haas: Setting 27 (G28 vs G53), macro B, renishaw probing
- Mazak: Matrix conversational vs EIA, smooth turning, INTEGREX modes
- Generate controller-matched G-code from same feature set

#### MS5-E: Mill-Turn Centers (3 sessions)
**Machines:** Okuma Multus B250II/B300II/U4000, DMG MORI NTX, Mazak INTEGREX, Haas ST-30Y
**Pipeline:** MillTurnSwissPipelineEngine
**THE most complex machine type — turning + milling + 5-axis in one setup**

**Phase E1: Sub-spindle + Part Transfer**
- Sub-spindle synchronization: Okuma M200/M201, Fanuc M-codes, Mazak sync codes
- Part transfer modes: stop-transfer, synchronized, speed-match
- Grip force calculations, collet friction, timing overlap
- Cut-off coordination: part-off timing relative to transfer
- Back-working: sub-spindle turning, boring, facing, threading on back side

**Phase E2: B-axis + Mode Switching**
- B-axis mode switching: turning↔milling (Okuma M33/M34/M35/M68/M69)
- Y-axis activation constraints (milling mode only)
- Dual-turret collision detection (Okuma MT0010, DMG NTX exclusion zones)
- Simultaneous B+C: G43.4 tool center point control
- Alarm prevention: controller-specific alarm codes per machine handbook

**Phase E3: Multi-Channel Programming**
- Parallel operation scheduling: turret 1 + B-axis head simultaneous
- Gantt optimization: minimize total cycle time across channels
- Collision zone buffers in timeline
- Controller-specific multi-channel syntax (Mazak Program 1/2, Okuma $1/$2)

#### MS5-F: Wire EDM (2 sessions)
**Pipeline:** EDMProgramAssemblerEngine (6 dialects, production-ready)
**Machines:** Sodick, Mitsubishi, Makino, AgieCharmilles, Fanuc ROBOCUT

- Wire EDM operations: first_cut, skim_cuts (2-4 passes), taper, 4-axis_independent
- Wire selection: brass (standard), coated (speed), molybdenum (fine), tungsten (micro)
- Flushing strategy: submerged vs jet, pressure by material thickness
- Kerf compensation: automatic by wire diameter + skim count
- Corner strategy: pause, reduce power, radius compensation
- Taper cutting: UV axis programming, angle limits by machine
- Threading: auto-thread, wire break detection + recovery
- Process routing: S3 DFM detects when features need EDM (hardened steel, complex shapes, tight tolerance <±0.005mm)
- Validate: EDMProgramAssemblerEngine 6-dialect output

#### MS5-G: Non-Traditional Processes — Grinding, Laser, Waterjet (2 sessions — DEFERRED Phase 2)
**Pipelines:** GrindingProgramAssemblerEngine, LaserProgramAssemblerEngine, WaterjetProgramAssemblerEngine
- Grinding: surface, cylindrical, centerless, creep-feed, tool-and-cutter (5 types, 6 dialects)
- Laser: cut, mark, weld, drill + nesting (7 dialects)
- Waterjet: AWJ, pure, taper compensation, depth cutting + nesting (6 dialects)
- These pipelines are production-ready but integration into AutoProgram orchestrator deferred to Phase 2
- S3 DFM should flag when grinding/laser/waterjet is the better process alternative

---

**Machine Type Detection Logic (S4 Process Planning):**
```
Model geometry → Feature analysis → Machine type recommendation:
  - Rotational symmetry + axial features → LATHE (MS5-D)
  - Rotational + cross-holes/flats → LATHE + LIVE TOOLING (MS5-D Phase 2)
  - Rotational + milling + back-work → MILL-TURN (MS5-E)
  - Prismatic + 1 orientation → VMC 3-axis (MS5-A)
  - Prismatic + 2-3 orientations → HMC/4th-axis (MS5-B)
  - Prismatic + undercuts/compound angles → 5-AXIS (MS5-C)
  - Hardened + complex profile → WIRE EDM (MS5-F)
  - Post-heat-treat finish → GRINDING (MS5-G deferred)

User can override: "Force to [machine type]" or "Use [specific machine from registry]"
```

**Post-Processor Coverage Matrix (validate per machine class):**
| Machine Class | Controllers | CPS Files Available | Tested |
|---|---|---|---|
| VMC 3-axis | Fanuc, Haas, Siemens, Heidenhain | 50+ | Phase 1 |
| HMC 4-axis | Fanuc, Haas, Mazak, Okuma | 20+ | Phase 1 |
| 5-axis | Fanuc, Siemens 840D, Heidenhain TNC | 30+ | Phase 1 |
| Lathe 2-axis | Fanuc, Okuma OSP, Haas, Mazak | 15+ | Phase 1 |
| Lathe C/Y | Fanuc, Okuma, Haas, Mazak | 10+ | Phase 1 |
| Mill-Turn | Okuma OSP, Mazak Matrix, DMG | 5+ | Phase 1 |
| Wire EDM | Sodick, Mitsubishi, Fanuc, AgieCharmilles | 10+ | Phase 1 |
| Grinding | Studer, Kellenberger, generic | 5+ | Phase 2 |
| Laser/Waterjet | Various | 10+ | Phase 2 |

### MS6: F360-AP-MS6 — Testing + Performance + CI/CD
**Units: 8 | Sessions: 4 | Prerequisite: MS2 + MS3 + MS5**
- **30+ tests across ALL machine types** (not just milling):
  - VMC 3-axis: 5 parts (bracket, manifold, pocket plate, contour, drill pattern)
  - HMC 4-axis: 3 parts (tombstone multi-face, pallet, rotary indexed)
  - 5-axis: 3 parts (impeller, undercut cavity, compound angle)
  - Lathe 2-axis: 5 parts (BSHC 1A→2C, CASING, shaft, groove+thread)
  - Lathe C/Y: 3 parts (cross-drill, hex, bolt circle)
  - Mill-turn: 3 parts (sub-spindle transfer, back-work, B-axis contour)
  - Wire EDM: 2 parts (profile cut, taper)
  - Multi-process: 2 parts (mill rough → EDM finish, turn → grind)
- Golden comparison: ±10% S/F, ±15% cycle time, **per controller dialect**
- Per-stage SLO regression tracking (auto-alert if budget exceeded)
- CI/CD: automated regression on every build, nightly perf benchmark
- Performance profiling: budget HTTP roundtrips (<3 per stage), lazy-load 95K tools
- Determinism test: same part twice → identical output
- Controller dialect test: same part → Fanuc + Haas + Okuma + Siemens outputs compared

### MS7: F360-AP-MS7 — Dispatcher Wiring + Ship
**Units: 4 | Sessions: 2 | Prerequisite: All above**

### MS8: F360-AP-MS8 — Learning Pipeline + Cloud Indexing + Beta Program
**Units: 6 | Sessions: 3 | Prerequisite: MS7**
- **Cloud library crawl**: CloudCAMIndexerEngine scans all cloud projects, extracts tool/S&F/strategy history from CAM setups (50-100x richer than STEP files)
- Ingest 30 BOX parts + 225 shop tools + 150 CPS files as baseline
- **Shop-specific calibration**: Compare PRISM's Kienzle predictions vs actual cloud S/F values → calibrate aggressiveness per material/machine
- Feedback loop: log user modifications → recalibrate tool preference + aggressiveness
- Auto-discover Fusion tool libraries + post processors
- **"Similar Part" recommendation**: When AutoProgram runs on a new part, search cloud library for geometrically similar parts → recommend proven tools + parameters
- 5-shop beta program plan: onboarding, monitoring, case study collection
- Liability model: "verify before run" default, audit trail per program

---

## Detailed Session Plans

### SESSION AP-0-1: CAM Setup + Operation Creation Endpoints (U01-U02)

```
KNOWLEDGE SOURCES:
  ENGINES: fusion360_api_server.py (1,576 LOC), Fusion360LiveBridgeEngine.ts (753 LOC)
  REFERENCE: auto_cam.py prototype (352 LOC) in brave-euclid worktree
  TRIBAL: Fusion 360 CAM API: adsk.cam.CAM, Setup, Operation, GenerateToolpathFuture
  FORMULAS: Unit conversion cm↔mm (Fusion internal = cm)

INTENT: The add-in can read CAM but can't create it. Every AutoProgram run needs
  to create Setups and Operations. This session adds the Python endpoints.

WORK:
  U01: POST /cam/setup endpoint
    - cam.setups.createInput(OperationTypes.MillingOperation)
    - Set stock mode (fixed/relative), dimensions, WCS origin
    - Assign model bodies by index
    - Test: create 3-axis milling setup on open doc

  U02: POST /cam/operation endpoint with type mapping
    Operation type mapping (PRISM → Fusion command string):
      face_mill → "face" | pocket_2d → "pocket2d" | contour_2d → "contour2d"
      adaptive_clear → "adaptive" | drill_peck → "drill" | chamfer → "chamfer2d"
      thread_mill → "thread" | waterline → "contour3d" | parallel_3d → "parallel"
    Parameter mapping (all divide by 10 for mm→cm):
      spindle_speed_rpm → tool_spindleSpeed (direct)
      feed_mm_min → tool_feedCutting (/10)
      stepdown_mm → maximumStepdown (/10)
      stepover_mm → maximumStepover (/10)
    Test: create face mill + adaptive pocket

EXIT GATE: Setup creation works, 5+ operation types create successfully
```

### SESSION AP-0-2: Tool Assignment + Toolpath + Post (U03-U04)

```
KNOWLEDGE SOURCES:
  ENGINES: SmartToolSelectorEngine.ts, FusionToolExportEngine.ts
  REFERENCE: tool_library_sync.py prototype, fusion-post-strategies.json
  TRIBAL: Fusion 360 tool library API, GenerateToolpathFuture async pattern

INTENT: Operations without tools and toolpaths are empty shells. Add tool assignment
  from PRISM library, async toolpath generation, and native post-processing.

WORK:
  U03: POST /cam/assign-tool endpoint
    - Search Fusion tool library for match by description/diameter
    - If no match: create tool via adsk.cam.Tool from PRISM spec
    - Assign to operation via parameter setting
    - Test: assign endmill, drill, face mill

  U04: POST /cam/toolpath + POST /cam/post endpoints
    - /cam/toolpath: fire cam.generateToolpath(), return job_id for polling
    - GET /cam/toolpath/status: poll GenerateToolpathFuture.isGenerationCompleted
    - /cam/post: PostProcessInput.createInput() + cam.postProcess()
    - Async pattern: 180s timeout for toolpath gen, background job tracking
    - Test: generate toolpath for face+pocket, post to Fanuc/Haas

EXIT GATE: Tools assigned, toolpaths generate, G-code posts correctly
```

### SESSION AP-0-3: B-Rep Geometry Extraction (U05-U06)

```
KNOWLEDGE SOURCES:
  ENGINES: FeatureRecognitionEngine.ts (302 LOC, 20 feature types)
  REFERENCE: /geometry endpoint (existing body-level metrics)
  TRIBAL: adsk.fusion.BRepBody, BRepFace, BRepEdge surface type classification
  TRAINING DATA:
    - BOX/PART MODELS FOR LEARNING ENGINE/BATCH 1/ — 30 STEP files for validation
    - cad-engine/reference_parts/ — 10 canonical shapes (bracket, manifold_block, etc.)
    - BOX/PRISM FOLDER FROM HOME/CAD MODELS FOR TESTING/ — F3D native model

INTENT: Current /geometry returns only bounding box. For AutoProgram we need
  face-by-face B-Rep analysis to classify holes, pockets, slots, bosses.
  Validate against the 30 BOX learning parts — load 3 diverse parts into Fusion
  and confirm features are correctly extracted.

WORK:
  U05: GET /cam/geometry-detail — face-level B-Rep extraction
    - Per BRepFace: surface type (plane/cylinder/cone/sphere/torus/nurbs)
    - For planar: normal vector, area, is_external
    - For cylindrical: radius, axis, is_hole (concavity check)
    - Group by surface type + normal direction

  U06: GET /cam/feature-candidates — topology-based grouping
    - Cylindrical faces by axis → hole candidates (through vs blind)
    - Planar faces by Z-level → pocket floor candidates
    - Boss detection (convex cylinders)
    - Output: RecognizedFeature[]-compatible JSON for FeatureRecognitionEngine
    - VALIDATE: Load CASING WITH SINGLE SIDE BORE.step → expect holes + bore + face features
    - VALIDATE: Load 9106018H-E8 6 LOBE PLUS.step → expect complex lobe geometry

EXIT GATE: Per-face geometry extracted, features grouped, format matches engine schema,
  validated against 2+ real BOX parts
```

### SESSION AP-0-4: Fusion 360 Cloud Library Access (U07-U08)

```
KNOWLEDGE SOURCES:
  REFERENCE: Fusion 360 Data API: adsk.core.Data, DataProject, DataFolder, DataFile
  ENGINES: Fusion360LiveBridgeEngine.ts (753 LOC) — TypeScript HTTP client
  TRIBAL: app.data.dataProjects → project.rootFolder → folder.dataFiles → dataFile.open()

INTENT: The user's Fusion 360 cloud has ALL their shop's parts with full CAM
  history (tools, S/F, strategies, cycle times). This is 50-100x richer than
  STEP files. Add 6 endpoints to browse, search, and extract CAM data from
  every cloud-stored design.

WORK:
  U07: Cloud browsing endpoints (GET /data/projects, POST /data/folder/list, POST /data/search)
    - Enumerate all DataProjects in user's hub
    - Traverse folder tree recursively (max depth 10)
    - Full-text search by name/extension across all projects
    - Return: file IDs, names, types, sizes, dates

  U08: File metadata + CAM extraction (POST /data/file/open, /data/file/metadata, /data/file/versions)
    - Open cloud file → extract Design features + CAM setups
    - For each CAM setup: operation types, tool specs, S/F parameters
    - Version history: revision count, dates, authors, comments
    - Design maturity signal: parts with 8+ versions = proven, stable
    - Test: enumerate real cloud project, extract metadata from 3 files

EXIT GATE: All 6 endpoints functional, cloud project enumerable,
  CAM metadata extractable from cloud-stored designs
```

### SESSION AP-1-1: Orchestrator Engine S1-S4 (U09-U10)

```
KNOWLEDGE SOURCES:
  ENGINES: PrintToProgramPipelineEngine.ts (2,168 LOC) — pipeline pattern reference
  ENGINES: UnifiedCAMPipelineEngine.ts — existing feature→gcode chain
  ENGINES: FeatureRecognitionEngine.ts, DFMPipelineEngine.ts (857 LOC)
  ENGINES: MultiSetupFeasibilityChainEngine.ts — datum chain Monte Carlo
  REFERENCE: pipelineCheckpoint.js — checkpoint/resume pattern

INTENT: Build AutoProgramOrchestratorEngine — the 10-stage brain that chains
  all 20 engines through Fusion 360. Uses PipelineCheckpointManager for staged
  execution with rollback. This session builds the skeleton + stages 1-4.

WORK:
  U07: AutoProgramOrchestratorEngine.ts skeleton
    - Define AutoProgramInput, AutoProgramResult, AutoProgramStage interfaces
    - Lazy-load all 20 sub-engines
    - PipelineCheckpointManager for 10 stages
    - S1: call Fusion bridge /cam/geometry-detail, return part geometry

  U08: Stages S2-S4
    - S2: Map B-Rep → FeatureRecognitionEngine.recognize()
    - S3: Map features → DFMPipelineEngine.analyze() (block on critical DFM)
    - S4: Map features → MultiSetupFeasibilityChainEngine.analyze()
    - Determine: setup count, orientation, datum chain, feature→setup assignment

EXIT GATE: Engine exists with 10-stage skeleton, S1-S4 produce valid outputs
```

### SESSION AP-1-2: Orchestrator S5-S7 — Tool + Strategy + S/F (U09-U10)

```
KNOWLEDGE SOURCES:
  ENGINES: SmartToolSelectorEngine.ts — 95K catalog, physics-scored
  ENGINES: ToolpathStrategyRegistry.ts (2,900 LOC) — 762 strategies
  ENGINES: SpeedFeedOrchestratorEngine.ts (2,851 LOC) — 8 resolvers
  ENGINES: SurfaceFinishPredictorEngine.ts — Brammertz Ra prediction
  FORMULAS: Kienzle Fc = kc1.1 × ap × fz^(1-mc), Taylor VT^n = C
  FORMULAS: Chip thinning CTF = D / (2×sqrt(ae×(D-ae)))
  TRAINING DATA:
    - BOX/PRISM FOLDER FROM HOME/FUSION TOOL LIBRARY/ — 225 real shop tools (CSV)
    - mcp-server/src/data/fusion360-cam-tips.ts — 2,491 lines of Fusion strategies
    - BOX/PRISM PROGRAM EXAMPLES/ — 7 reference programs for S/F validation
    - data/COEFFICIENT_DATABASE.json — Kienzle/Taylor constants
    - mcp-server/src/data/controller-knowledge-tips.ts — controller-specific rules

INTENT: Select the BEST tool, strategy, and S/F for each operation. This is
  where PRISM's physics advantage materializes — Kienzle-backed, not lookup tables.

WORK:
  U09: S5 Tool Selection + S6 Strategy Selection
    - Per feature: SmartToolSelectorEngine.select() (7-factor scoring)
    - Per (feature, tool): ToolpathStrategyRegistry match
    - Narrow 762 strategies to top 3 per operation

  U10: S7 Speed/Feed Optimization
    - Per (feature, tool, strategy): SpeedFeedOrchestratorEngine.compute()
    - Returns: rpm, feed, Fc, deflection, Ra, tool life
    - Cross-validate: force < power, deflection < tol/3, Ra < target
    - If violated: try alternative tool/strategy

EXIT GATE: Every operation has physics-validated tool + strategy + S/F
```

### SESSION AP-1-3: Orchestrator S8-S10 — Create + Verify + Output (U11-U12)

```
KNOWLEDGE SOURCES:
  ENGINES: IntegratedVerificationEngine.ts (442 LOC) — unified go/no-go
  ENGINES: CollisionEngine.ts (2,526 LOC) — SAT + swept volume
  ENGINES: CycleTimeEstimatorEngine.ts (1,325 LOC) — machine kinematics
  ENGINES: SetupSheetFromGCodeEngine.ts (1,156 LOC) — auto setup sheets
  ENGINES: ProbeRoutineEngine.ts (1,592 LOC) — 6 controllers, Renishaw macros

INTENT: Close the loop: push intelligence INTO Fusion, verify safety, generate
  the full production package (setup sheet, cycle time, cost, probes).

WORK:
  U11: S8 Fusion CAM Creation
    - Call /cam/setup, /cam/operation, /cam/assign-tool per planned operation
    - Set all S/F parameters from S7 results
    - Generate toolpaths via /cam/toolpath (async with polling)

  U12: S9 Verification + S10 Output Package
    - S9: Post-process → IntegratedVerificationEngine.verify()
    - Collision check, physics limits, machine envelope, surface finish
    - S10: SetupSheet + CycleTime + ProbeRoutines + cost estimate
    - Assemble into AutoProgramResult

EXIT GATE: Full S1-S10 pipeline testable with mocked Fusion bridge
```

### SESSION AP-2-0: UX Wireframe Specification (U13-U14)

```
KNOWLEDGE SOURCES:
  REFERENCE: Existing FusionFeedsCalculator panel (5 tabs, 960 LOC)
  REFERENCE: auto_cam.py panel prototype (brave-euclid worktree)
  TRIBAL: Fusion 360 palette API: adsk.core.Palette, HTMLEventHandler

INTENT: Before building UI, define EVERY user state: idle, running, progress,
  error, results, DFM-blocking, cancel/rollback. Machinists see a black box
  for 60s — this session makes the box transparent.

WORK:
  U13: UX state machine + wireframes
    States: IDLE → CONFIGURING → RUNNING (10 sub-states) → RESULTS | ERROR | DFM_BLOCK
    Cancel: abort pipeline at any stage, undo created CAM operations
    Progress detail: "Analyzing feature 3/5: pocket 12x8mm, selecting D10 endmill..."
    Error messages: specific + actionable (not "Error in stage 4")
    DFM-blocking: pause at S3, show critical issues, user approves or cancels
    "Verify Before Run" toggle: first 10 programs require manual approval
    Confidence meter: green (>85%) / yellow (70-85%) / red (<70%)

  U14: Results dashboard wireframe
    Operations list: each with tool icon, strategy name, S/F values, physics metrics
    DFM panel: severity-colored cards (red/yellow/green) with cost impact
    Physics grid: Fc, Power, Deflection, Ra, Tool Life, Cpk — all color-coded
    Cycle time: P50/P75/P95 bars with cost estimate ($materials + $tooling + $time)
    Action buttons: "Open Setup Sheet", "Export Probe Routine", "Export G-code"
    Comparison view: "PRISM suggested X, you can override to Y"

EXIT GATE: Complete state machine diagram, wireframes for all 6 states,
  error message catalog (20+ specific messages), progress text for all 10 stages
```

### SESSION AP-2-1: Panel Implementation + Progress Streaming (U15-U16)

```
WORK:
  U15: Build panel from UX wireframes
    - AutoProgram tab with material/machine/aggressiveness/target inputs
    - 10-stage progress with per-stage detail text
    - Confidence meter bar
    - "Verify Before Run" checkbox (default ON for first 10 runs)

  U16: Python command handler + progress streaming
    - Fire orchestrator, stream stage updates via palette.sendInfoToHTML()
    - Cancel handler: abort pipeline, clean up partial CAM operations
    - Error recovery: show failure point, "Retry from Stage N" button
    - DFM-blocking: pause dialog with approve/cancel

EXIT GATE: Panel renders, progress streams, cancel works, DFM-blocking pauses correctly
```

### SESSION AP-2-2: Results Display + Override Controls (U17-U18)

```
WORK:
  U17: Results dashboard — operations, DFM warnings, physics grid, cycle time bars
  U18: Override controls — user can modify S/F per operation, AutoProgram re-validates
    - "Apply PRISM Recommendation" vs "Use My Values" per operation
    - When user overrides, log delta for learning pipeline (MS8)
    - Safety check on overrides: warn if user values exceed physics limits

EXIT GATE: Full results visible, overrides functional with safety check
```

### SESSION AP-3-1: Collision Safety Loop (U17-U18)

```
INTENT: SAFETY CRITICAL. Missing collision = destroyed spindle + operator injury.
  Iterative verify→fix→re-verify loop with HARD BLOCK on unresolved collisions.

WORK:
  U17: Verification loop — collision check → auto-remediation → re-verify (max 3x)
  U18: Physics constraint verification — force/deflection/finish + G-code safety (24 rules)

EXIT GATE: No program released without collision verification pass
```

### SESSION AP-3-2: Probe Routines + Multi-Setup (U19-U20)

```
WORK:
  U19: Auto-generate WCS probe routines per setup (Fanuc/Haas/Siemens)
  U20: Multi-setup orchestration with datum chain tolerance tracking

EXIT GATE: Probe macros generated, multi-setup parts handled
```

### SESSION AP-3-3: Integration Tests + Performance (U21-U22)

```
KNOWLEDGE SOURCES:
  TRAINING DATA:
    - BOX/PART MODELS FOR LEARNING ENGINE/BATCH 1/ — 30 real parts for testing
    - BOX/PRISM CAD-CAM TRAINING/BSHC series — progressive complexity (1A→2C)
    - cad-engine/reference_parts/ — deterministic shapes for unit tests
    - BOX/PRISM FOLDER FROM HOME/FUSION TOOL LIBRARY/ — 225 shop tools
    - BOX/FUSION BASIC POSTS/ — 150+ post processors for output validation
    - BOX/MACRO PROGRAMS/ — golden reference for output comparison

WORK:
  U21: End-to-end tests using REAL parts from BOX library
    Test 1: CASING WITH SINGLE SIDE BORE.step — lathe+mill, side bore, real GD&T
    Test 2: BSHC 1A → 2C progressive (simple→complex lathe)
    Test 3: 9106018H-E8 6 LOBE PLUS.step — complex geometry, multi-feature
    Test 4: bracket.step from reference_parts — canonical prismatic milling
    Golden comparison: output S/F vs MACRO PROGRAMS/ reference values
    Error cases: no model, unsupported geometry, Fusion disconnected

  U22: Performance profiling — target <60s for 5-feature part
    Profile each pipeline stage
    Parallelize independent tool selections (Promise.all)
    Batch Fusion API calls via /batch
    Cache machine profile lookups across operations

EXIT GATE: 4+ real-part tests pass, golden comparison within 10% of reference,
  <60s for typical part
```

### SESSION AP-MACH-1: VMC 3-Axis + HMC 4-Axis Milling Validation (U-M1, U-M2)

```
KNOWLEDGE SOURCES:
  ENGINES: PrintToProgramPipelineEngine.ts (2,168 LOC) — milling pipeline
  TRAINING DATA: BOX/PART MODELS FOR LEARNING ENGINE/BATCH 1/ — prismatic parts
  TRAINING DATA: cad-engine/reference_parts/ — bracket, manifold_block, flanged_plate
  TRAINING DATA: EXTERNAL-REFERENCE-PROGRAMS-INDEX.md — Haas workbook programs
  REFERENCE: MachineRegistry — Haas VF-2, VF-4, Okuma GENOS M560-V, MB-5000H

INTENT: VMC + HMC are 70%+ of shop volume. Validate that AutoProgram produces
  correct programs for 3-axis and 4-axis machines across Fanuc/Haas/Okuma controllers.

WORK:
  U-M1: VMC 3-axis program generation + validation
    - Route features through PrintToProgramPipelineEngine
    - Strategy selection: adaptive (roughing), contour (finishing), drill cycles
    - WCS management: G54-G59 automatic assignment
    - Post-process to Fanuc + Haas + Siemens dialects
    - Validate: bracket.step on Haas VF-4 profile, compare to Haas workbook
    - Validate: manifold_block.step — multi-pocket part with holes

  U-M2: HMC 4-axis + tombstone programming
    - B-axis indexing: detect when rotary reduces setups (4-sided access)
    - Tombstone fixture: multi-part per face, WCS per part (G54.1 P1-P48)
    - Pallet changer sequencing (M60/M61)
    - Post-process: Okuma MB-5000H, Haas EC-400 dialects
    - Validate: Generate 4-sided tombstone program from single part model

EXIT GATE: VMC generates correct G-code for 3 controllers, HMC handles
  tombstone + pallet. Golden comparison within ±10% of reference programs.
```

### SESSION AP-MACH-2: 5-Axis Milling Validation (U-M3, U-M4)

```
KNOWLEDGE SOURCES:
  ENGINES: MultiAxisPrintToProgramEngine.ts — 5-axis pipeline
  ENGINES: ToolpathStrategyRegistry — 157 multi-axis strategies
  REFERENCE: MachineRegistry — Okuma MU-5000V, DMG DMU 50, Haas UMC-750
  TRAINING DATA: Impeller case study (EXTERNAL-REFERENCE-PROGRAMS-INDEX.md)

WORK:
  U-M3: 3+2 indexed 5-axis
    - G68.2 tilted work plane (Fanuc) / CYCLE800 (Siemens) / Plane Spatial (Heidenhain)
    - Auto-detect features accessible from tilted orientations
    - Machine kinematics: trunnion-table vs swivel-head vs fork-head

  U-M4: Simultaneous 5-axis
    - G43.4/G43.5 TCPC (tool center point control)
    - Swarf milling, flow, morphed spiral strategies
    - Singularity avoidance: A/C limits, rotary wrap
    - Collision: tool+holder+spindle head vs part+fixture envelope

EXIT GATE: 3+2 and simultaneous 5-axis programs generate for 3 kinematic models
```

### SESSION AP-MACH-3: Lathe Programming — All Controllers (U-M5, U-M6)

```
KNOWLEDGE SOURCES:
  ENGINES: TurningPrintToProgramEngine.ts — G96/G97, TNRC, 25 feature types
  TRAINING DATA: BSHC 1A→2C, CASING_MACRO.MIN, CBORE_CASING_MACRO.MIN
  REFERENCE: MachineRegistry — Okuma LB3000/LB4000/GENOS, Haas ST-30, Mazak QT

INTENT: Cover ALL lathe controllers (Fanuc, Okuma OSP, Haas, Mazak) with the
  same feature set. Controller-specific dialect handling in post-processor.

WORK:
  U-M5: Pure turning — all controllers
    - G96/G97 auto-selection (CSS for finish, RPM for threading/interrupted)
    - G50 SMAX by chuck size + material + diameter
    - Canned cycles: G71/G70 (Fanuc/Haas), Okuma equivalent
    - TNRC: P-value by tool type (P3=OD, P2=bore, P0=drill)
    - Validate: CASING_MACRO.MIN golden comparison (Okuma)
    - Validate: BSHC series (progressive complexity)
    - Post to: Fanuc, Okuma OSP, Haas, Mazak (same part → 4 outputs)

  U-M6: Live tooling + C-axis + Y-axis
    - C-axis: M19 orient, cross-drill, hex, bolt circles
    - Polar interpolation (G12.1): face milling
    - Cylindrical interpolation (G107): OD keyway
    - Y-axis: off-center drilling, milling, tapping
    - Validate: Okuma LB3000 EX II MY, Haas ST-30Y capabilities

EXIT GATE: Same part generates correct code for 4 controller dialects.
  BSHC golden comparison within ±10%.
```

### SESSION AP-MACH-4: Mill-Turn Centers (U-M7, U-M8)

```
KNOWLEDGE SOURCES:
  ENGINES: MillTurnSwissPipelineEngine.ts (2,013 LOC)
  REFERENCE: okuma-multus-b300ii.json handbook (867 lines)
  REFERENCE: MachineRegistry — Multus B250II/B300II, DMG NTX, Mazak INTEGREX

WORK:
  U-M7: Sub-spindle + part transfer + B-axis mode switching
    - Sub-spindle sync: Okuma M200/M201, Fanuc/Mazak equivalents
    - Part transfer 3 modes: stop, synchronized, speed-match
    - B-axis: M69 unlock → B move → M68 clamp (Okuma)
    - Turning↔Milling transitions: M33/M34/M35
    - Y-axis constraints: active only in milling mode
    - Alarm prevention: MT0001/MT0002/BA0001/YA0001

  U-M8: Back-working + dual-turret collision
    - Sub-spindle operations: turning, boring, facing, threading
    - Dual-turret collision zones (MT0010 prevention)
    - Simultaneous B+C motion: G43.4 TCPC
    - Validate: Multus B300II handbook specs vs generated code

EXIT GATE: Mill-turn program with sub-spindle transfer generates correctly.
  Collision zones enforced. B-axis mode switching verified.
```

### SESSION AP-MACH-5: Wire EDM + Process Routing (U-M9, U-M10)

```
KNOWLEDGE SOURCES:
  ENGINES: EDMProgramAssemblerEngine.ts — 6 dialects, production-ready
  REFERENCE: MachineRegistry — EDM machines (Sodick, Mitsubishi, Fanuc ROBOCUT)

WORK:
  U-M9: Wire EDM program generation
    - First cut + skim passes (2-4), taper, 4-axis independent UV
    - Wire selection, flushing, kerf compensation, corner strategy
    - Threading: auto-thread, break detection + recovery
    - Post to: Sodick, Mitsubishi, AgieCharmilles, Fanuc dialects

  U-M10: Process routing decision engine
    - S3 DFM auto-detects when EDM is required:
      Hardened steel (>50 HRC), complex internal shapes, tight tolerance (<±0.005mm)
    - S3 also flags: grinding needed (post-heat-treat finish), laser (sheet cutting)
    - User override: "Force to [machine type]" or "Use [specific machine]"
    - Multi-process jobs: mill rough → EDM finish → grind surface

EXIT GATE: EDM programs generate for 4 dialects. Process routing correctly
  detects EDM-required features. Multi-process routing functional.
```

### SESSION AP-HTTP-1: HTTP Bridge Hardening (U-H1, U-H2)

```
INTENT: HTTP bridge between TS (port 18361) and Python (port 18360) is the
  single point of failure. Add resilience so a network glitch doesn't crash
  the entire pipeline.

WORK:
  U-H1: Retry + timeout + health monitoring
    - Exponential backoff: 3 retries with 100ms/500ms/2000ms delays
    - Per-stage timeout configuration (S1-S4: 30s, S5-S7: 60s, S8: 120s, S9: 60s)
    - Connection health check before pipeline start (/health ping)
    - Graceful degradation: if bridge dies, save pipeline state, allow resume

  U-H2: Request queuing + memory management
    - Request queue: max 5 concurrent, FIFO ordering
    - 95K tool catalog lazy-loading: load on first query, cache with TTL
    - Memory budget: <500MB for Python process, <1GB for TS process
    - Connection pooling: reuse HTTP connections between stages

EXIT GATE: Bridge survives 10 rapid sequential requests without crash,
  retry handles 1 simulated failure, memory stays under budget
```

### SESSION AP-4-1: Dispatcher Wiring + API Route (U23-U24)

```
WORK:
  U23: Wire autoprogram_run, autoprogram_plan, autoprogram_verify to camDispatcher
  U24: HTTP route /api/v1/cam/autoprogram + /autoprogram skill registration

EXIT GATE: Actions wired, route functional, skill registered
```

### SESSION AP-4-2: Packaging + Release Gate (U25-U26)

```
WORK:
  U25: Documentation (AUTOPROGRAM_ARCHITECTURE.md) + installer update
  U26: Release quality gate — all tests pass, collision safety verified, manual test

EXIT GATE: SHIP GATE PASSED
```

---

## Dependency Graph

```
MS0 (CAM API Surface)
  ├─ AP-0-1 (setup + operations)
  ├─ AP-0-2 (tools + toolpaths) ← depends on AP-0-1
  └─ AP-0-3 (B-Rep extraction) ← independent

MS1 (Orchestrator) ← depends on ALL of MS0
  ├─ AP-1-1 (S1-S4) ← depends on AP-0-3
  ├─ AP-1-2 (S5-S7) ← depends on AP-1-1
  └─ AP-1-3 (S8-S10) ← depends on AP-1-2 + AP-0-1 + AP-0-2

MS2 (UI Panel) ← depends on MS1
  ├─ AP-2-1 (panel + progress) ← depends on AP-1-3
  └─ AP-2-2 (results + errors) ← depends on AP-2-1

MS3 (Verification) ← depends on MS1
  ├─ AP-3-1 (collision loop) ← depends on AP-1-3
  ├─ AP-3-2 (probes + multi-setup) ← depends on AP-1-3
  └─ AP-3-3 (integration tests) ← depends on ALL prior

MS4 (Wiring + Ship) ← depends on ALL
  ├─ AP-4-1 (dispatcher) ← depends on MS1
  └─ AP-4-2 (package + release) ← depends on ALL
```

---

## FORGE-TRIPLE Per Milestone

| Milestone | Protective Hook | MCP Action | Skill |
|---|---|---|---|
| MS0 | `fusion-cam-write-safety` — validate CAM writes against machine envelope | `f360_cam_create_setup`, `f360_cam_create_operation`, `f360_cam_generate_toolpath`, `f360_cam_post_process` | `/fusion-cam-create` |
| MS1 | `autoprogram-physics-consistency` — cross-check forces/deflection/finish | `autoprogram_run`, `autoprogram_plan`, `autoprogram_verify` | `/autoprogram` |
| MS2 | `autoprogram-ui-validation` — verify model open + CAM active before launch | `autoprogram_ui_launch`, `autoprogram_ui_progress` | `/autoprogram-panel` |
| MS3 | `autoprogram-collision-block` — HARD BLOCK if collision severity > 0 | `autoprogram_validate`, `autoprogram_optimize_iterative` | `/autoprogram-verify` |
| MS4 | `autoprogram-session-log` — telemetry for every run | All actions registered | `/autoprogram` fully documented |

---

## Engine-to-Stage Mapping (20 engines, all existing)

| Stage | Engine | Lines | Purpose |
|---|---|---|---|
| S1 | Fusion360LiveBridgeEngine | 753 | HTTP bridge to Fusion 360 |
| S2 | FeatureRecognitionEngine | 302 | 20 feature types, confidence scoring |
| S3 | DFMPipelineEngine | 857 | 8-substage DFM with cost impact |
| S4 | MultiSetupFeasibilityChainEngine | ~400 | Datum chain Monte Carlo |
| S5 | SmartToolSelectorEngine | ~200 | 95K catalog, 7-factor physics scoring |
| S6 | ToolpathStrategyRegistry | 2,900 | 762 strategies, 18 CAM systems |
| S7 | SpeedFeedOrchestratorEngine | 2,851 | Kienzle/Taylor/SLD, 8 resolvers |
| S8 | Fusion360CodeGeneratorEngine | 900 | Native F360 Python generation |
| S9a | CollisionEngine | 2,526 | SAT + swept volume (SAFETY CRITICAL) |
| S9b | IntegratedVerificationEngine | 442 | Unified go/no-go |
| S9c | CNCSimulationPipelineEngine | 409 | Vericut-class simulation |
| S10a | SetupSheetFromGCodeEngine | 1,156 | Auto setup sheets from G-code |
| S10b | CycleTimeEstimatorEngine | 1,325 | Physics-based machine kinematics |
| S10c | SurfaceFinishPredictorEngine | ~300 | Brammertz + scallop Ra prediction |
| S10d | ProbeRoutineEngine | 1,592 | 6 controllers, Renishaw macros |
| S10e | ToolWearProgressionEngine | ~400 | Taylor + Usui + Archard wear |
| S10f | ToleranceStackEngine | ~200 | Worst-case, RSS, Monte Carlo |
| S10g | NestingEngine | ~100 | 2D stock nesting |
| S10h | PostProcessorPipelineEngine | 3,149 | 38-stage, 20 controllers |
| S10i | CAMIntegrationEngine | ~300 | Type defs for 40+ operation types |

---

---

## Learning & Calibration Pipeline (Continuous Improvement)

### SESSION AP-5-1: Part Library Ingestion + Feature Learning (U27-U28)

```
KNOWLEDGE SOURCES:
  TRAINING DATA: ALL Tier 1 sources (30 BOX parts, 225 tools, 49K tribal lines)
  ENGINES: SelfLearningCAMEngine.ts, LearningPathEngine.ts, CourseBuilderEngine.ts
  ENGINES: SourceCatalogAggregator.ts — aggregate cross-source data
  REFERENCE: mcp-server/data/machine-learning-data.json

INTENT: AutoProgram should get BETTER with each run. When the user accepts
  or modifies PRISM's recommendations, log the delta (what PRISM suggested vs
  what the machinist chose). Over time, build a local model of the shop's
  preferences (favorite tools, preferred strategies, typical materials).

WORK:
  U27: Ingest BOX part library into feature learning database
    - Load all 30 STEP files from BATCH 1
    - Extract features via FeatureRecognitionEngine
    - Cross-reference with Okuma macro parameters (170+ params)
    - Build feature→strategy→S/F mapping from reference programs
    - Store in mcp-server/data/ as autoprogram-learning-corpus.json

  U28: Feedback loop — log user modifications
    - When user modifies AutoProgram output (changes tool, adjusts S/F, etc.)
    - Log: original recommendation → user choice → material → machine
    - Feed back into SmartToolSelectorEngine preference weighting
    - Feed back into SpeedFeedOrchestratorEngine aggressiveness calibration
    - Persistent across sessions via SelfLearningCAMEngine

EXIT GATE: 30 parts ingested into learning corpus, feedback loop captures
  at least 5 parameter modification events during testing
```

### SESSION AP-5-2: Tool Library Sync + Post Processor Discovery (U29-U30)

```
KNOWLEDGE SOURCES:
  TRAINING DATA:
    - BOX/PRISM FOLDER FROM HOME/FUSION TOOL LIBRARY/ — 225 shop tools
    - BOX/FUSION BASIC POSTS/ — 150+ .cps files
    - mcp-server/src/data/fusion-post-strategies.json — CPS analysis

INTENT: AutoProgram should automatically discover the user's installed tools
  and post processors. On first run, scan Fusion's tool libraries and
  installed CPS files, match against PRISM's 95K catalog for enrichment,
  and present the user with their actual shop capabilities.

WORK:
  U29: Auto-discover Fusion tool libraries + enrich from PRISM
    - GET /tool-library → enumerate all installed libraries
    - Match tools against PRISM 95K catalog by diameter/type/manufacturer
    - Enrich: add Kienzle constants, speed/feed recommendations
    - Import BOX/FUSION TOOL LIBRARY/ CSVs into Fusion if not present
    - Cache enriched tool data for fast S5 (Tool Selection) lookups

  U30: Auto-discover installed post processors + machine profiles
    - Scan Fusion CPS directories for installed .cps files
    - Match against BOX/FUSION BASIC POSTS/ catalog (150+)
    - Read CPS metadata for controller type, machine brand
    - Auto-select best CPS for detected machine in S10 (Post-Processing)
    - Build: machine→CPS mapping for one-click post processing

EXIT GATE: Tool libraries discovered and enriched, CPS files cataloged,
  machine→post mapping functional
```

---

## Critical Files to Modify

| File | Changes |
|---|---|
| `scripts/fusion360-addin/fusion360_api_server.py` | +6 CAM endpoints (~400 lines): /cam/setup, /cam/operation, /cam/assign-tool, /cam/toolpath, /cam/post, /cam/geometry-detail, /cam/feature-candidates |
| `scripts/fusion360-addin/FusionFeedsCalculator.py` | +AutoProgram tab with progress UI (~150 lines) |
| `src/engines/AutoProgramOrchestratorEngine.ts` | NEW: 10-stage pipeline orchestrator (~800 lines) |
| `src/engines/Fusion360LiveBridgeEngine.ts` | +6 typed client methods for CAM endpoints (~200 lines) |
| `src/tools/dispatchers/camDispatcher.ts` | +7 new actions for AutoProgram |
| `src/schemas/autoProgramActionSchemas.ts` | NEW: Zod schemas for all actions |

---

## 80-AGENT SCRUTINY RESULTS (4 rounds, avg 73/100 → targeting 90)

### R4 Score Distribution + Concrete Fixes to Reach 90

| Role | R4 | Target | Fix (NO MORE "deferred" — specify the solution) |
|---|---|---|---|
| 1 CNC Machinist | 78 | 88 | Add adaptive feed override: if spindle load >85%, reduce feed 15% per block. Wire to SpeedFeedOrchestratorEngine `aggressiveness` param. |
| 2 CAM Programmer | 82 | 90 | Add rest-machining detection: compare previous-op stock vs current geometry → auto-insert rest-machining pass. Strategy validation gate before CAM creation. |
| 3 Safety Engineer | 71 | 90 | **Spindle torque gate**: lookup torque curve from MachineRegistry (already has torque_nm), validate Fc×arm < torque at RPM. **Thermal derating**: after 30min continuous cut, derate feed 5% (configurable). **Workholding pullout**: Fc_radial < clamp_force × friction × 0.7. |
| 4 Physics Engineer | 75 | 88 | **Engagement angle decomposition**: for partial immersion, compute entry/exit angles → adjust Kienzle kc1.1 by (arc_engaged/360). Already in SpeedFeedOrchestratorEngine resolver #4. **Thermal-wear coupling**: wire ThermalWearCouplingEngine output (tool temp °C) into S/F derating when T > 600°C. |
| 5 Software Architect | 76 | 88 | **State machine**: DRAFT→VERIFIED→RELEASED→EXECUTING→COMPLETED. Persist at each checkpoint via PipelineCheckpointManager. **Machine override**: auto-replan (clear S5-S10, re-run from S4). **Error fallback**: if S/F calc fails, use Sandvik catalog lookup (MaterialRegistry has vendor defaults). |
| 6 Fixture Designer | 68 | 85 | **Clamping force model**: Fc_tangential + Fc_radial vs clamp_force × μ (friction coefficients: steel-on-steel 0.15, serrated jaws 0.35, soft jaws 0.25). Wire FixtureClampingEngine. **Setup time**: add setup_time_min per workholding type (vise=10, chuck=15, tombstone=25, pallet=5) to cycle time estimate. **Part stability**: CoG check — if cutting force moment > clamping moment at CoG, warn. |
| 7 Production Manager | 73 | 85 | **Capacity check**: query MachineRegistry `status` field (available/busy/maintenance). If target machine busy, suggest alternative with delta cost/time. **Setup overhead**: include per-setup time (load program + verify + first-article) in total job time. Typical: 30-45 min per setup. |
| 8 Competitive Analyst | 72 | 85 | **Differentiator dashboard**: show "PRISM vs default" comparison — predicted cycle time vs Fusion default S/F, predicted tool life vs catalog estimate. Quantify savings per job. |
| 9 Metrology Engineer | 66 | 85 | **Cpk prediction**: use physics uncertainty (SpeedFeedOrchestratorEngine Monte Carlo σ) → predict process spread → Cpk = (USL-LSL)/(6σ). If Cpk < 1.33, warn before program release. **Inspection plan**: auto-generate "probe these N critical features" list from tolerance < 0.05mm filter. Wire to ProbeRoutineEngine. |
| 10 Data Scientist | 70 | 85 | **Model drift**: track prediction_error = |predicted_S/F - actual_from_cloud|. If running mean > 15%, trigger recalibration alert. **Cross-shop**: normalize S/F by machine power (S/F per kW) to make data transferable. **Cold-start bootstrap**: use 49K tribal lines as symbolic rules (Phase 1), switch to statistical model after 100 cloud parts indexed (Phase 2). |
| 11 UX Designer | 74 | 88 | **Error specificity**: each of 20+ errors has: (1) what happened, (2) why it matters, (3) what to do. Example: "Feed 800mm/min exceeds spindle torque at 3000 RPM. Risk: stall. Fix: reduce to 550mm/min or increase RPM to 4500." **Confidence categories**: GREEN (>90%, safe to run) / YELLOW (75-90%, verify recommended) / RED (<75%, manual review required). |
| 12 Post-Processor | 79 | 88 | **Controller quirks DB**: add `controller-quirks.json` with known issues per controller model (e.g., Haas NGC macro B limit 9999 lines, Okuma OSP angle convention, Fanuc 0i vs 31i G68 differences). Query during post-processing. |
| 13 Tool Crib Manager | 69 | 85 | **Availability check**: query shop tool inventory (cloud library tools → "in stock" flag). If unavailable: auto-suggest substitute (same diameter ±0.5mm, same type, different manufacturer). Show cost delta. **Insert cost/part**: tool_cost / (tool_life_min / cycle_time_min) = cost per part insert consumption. |
| 14 Quality Engineer | 72 | 88 | **SPC auto-setup**: after first 5 parts, compute Xbar/R, set UCL/LCL. If any point outside limits → auto-hold for MRB. Wire to QualityManagementEngine.createSPCChart(). **FAI auto-generate**: from tolerance-tagged features → generate AS9102 Form 3 characteristic list. |
| 15 Turning Specialist | 81 | 90 | **Boring-bar chatter gate**: if L/D ratio > 4:1, flag chatter risk + suggest reduced DOC or damped boring bar. **CSS derating**: near SMAX, auto-reduce 10% (bearing preload changes at max RPM). **Facing strategy**: default to climb face for finish, conventional for heavy stock removal. |
| 16 EDM/Grinding | 75 | 82 | **WEDM corner radius**: predict actual corner = nominal + wire_radius + spark_gap. Warn if actual > print tolerance. **Process routing in S3**: add decision tree (hardness >50 HRC → suggest EDM, Ra <0.4µm → suggest grinding, thin wall <0.5mm → suggest EDM over milling). |
| 17 Performance Engineer | 73 | 85 | **Optimization target selector**: user picks "Fastest" / "Longest Tool Life" / "Lowest Cost" / "Best Finish" → adjusts SpeedFeedOrchestratorEngine `optimization_target` param. **Geometry cache**: hash feature signature (type+dims) → if seen before, skip S5-S7, reuse cached S/F. |
| 18 QA/Test Engineer | 68 | 85 | **Edge-case catalog**: add 10 specific edge cases to test suite: (1) 0.5mm hole, (2) 0.3mm wall, (3) 50 HRC steel, (4) Inconel 718, (5) 10:1 L/D bore, (6) 45° chamfer on curved surface, (7) thread M3×0.5, (8) part-off 0.5mm wall tube, (9) 100-feature part, (10) empty model. **Fuzz testing**: random geometry + material + machine combos (100 runs, no crashes). |
| 19 Business Analyst | 70 | 85 | **Pricing model**: AutoProgram included in PRISM subscription. Value prop: "Save 2-4 hours CAM time per job × $75/hr = $150-300/job saved." **Margin analysis**: tool_cost + machine_time_cost + setup_cost + material_cost → total. If margin < 15%, flag. Wire to QuoteEstimatorEngine. |
| 20 Gap Analysis | 68 | 82 | **Batch optimization**: if quantity > 10, suggest tool consolidation (fewer tool changes = less overhead). **Sustainability**: energy_kwh = power_kw × cycle_time_hr. Display on results dashboard. **Adaptive control**: define as Phase 2 milestone F360-AP-MS9 with specific units (not just "deferred"). |

### Concrete Additions to Plan (grouped by where they go)

**In MS1 (Orchestrator) — add to S7:**
- Optimization target selector (fastest/tool-life/cost/finish)
- Geometry signature caching (hash → skip S5-S7 for repeat features)
- Cpk prediction from Monte Carlo σ → warn if < 1.33

**In MS3 (Safety) — add to verification:**
- Spindle torque gate: Fc×arm < machine torque at RPM (from MachineRegistry)
- Thermal derating: feed -5% after 30min continuous cut
- Workholding pullout: Fc_radial < clamp × μ × 0.7
- Boring-bar chatter gate: L/D > 4:1 → warn + suggest damped bar

**In MS4 (Fixtures) — add:**
- Clamping force model with friction coefficients (steel 0.15, serrated 0.35, soft 0.25)
- Part CoG stability check (cutting moment vs clamping moment)
- Setup time per workholding type added to cycle time

**In MS5 (Machines) — add to each sub-milestone:**
- Controller quirks database (`controller-quirks.json`)
- CSS derating near SMAX for all lathe controllers
- WEDM corner radius prediction

**In MS6 (Testing) — add:**
- 10 specific edge-case tests (0.5mm hole through 100-feature part)
- Fuzz testing: 100 random combos, no crashes
- SPC auto-setup after first 5 parts

**In MS7 (Ship) — add:**
- "PRISM vs Default" comparison dashboard
- Insert cost per part calculation
- Energy consumption display (kWh = kW × hours)
- Tool availability + substitute suggestion

**In MS8 (Learning) — add:**
- Model drift tracking (running mean prediction error)
- Cross-shop normalization (S/F per kW)
- Inspection plan auto-generation from tolerance < 0.05mm

**Phase 2 (defined, not deferred):**
- F360-AP-MS9: Adaptive In-Cycle Control (spindle load monitoring, thermal compensation, tool breakage detection)
- F360-AP-MS10: Batch + Shop-Wide Optimization (batch quantity optimizer, shop-wide learning propagation, sustainability dashboard)

---

## Key Technical Risks

1. **Fusion CAM API fragility** — Operation creation varies by type; fallback to /execute with generated Python
2. **B-Rep feature extraction accuracy** — Start with 10 common prismatic features; complex geometry gets manual fallback
3. **Toolpath generation timeout** — Async job pattern with polling (180s max)
4. **Geometry selection via HTTP** — Default to "all geometry in setup"; targeted face selection later
5. **HTTP bridge resilience** — Exponential backoff retry (3x), connection health check, graceful degradation
6. **Machinist trust** — "Verify Before Run" + confidence meter (GREEN/YELLOW/RED)
7. **Performance regression** — Per-stage SLO + geometry caching + nightly benchmark
8. **Spindle torque validation** — Must validate against MachineRegistry torque curves, not just power
9. **State machine recovery** — DRAFT→VERIFIED→RELEASED→EXECUTING→COMPLETED with checkpoint persistence
10. **Cpk prediction accuracy** — Monte Carlo σ must be validated against CMM data from 5+ real parts

---

## Verification Plan (COMPREHENSIVE — all scrutiny gaps addressed)

### Unit Tests (40+ files)
- Each pipeline stage mocked independently (vitest)
- Each machine class has dedicated test file
- Each controller dialect has output validation test

### Integration Tests (10+ scenarios)
- Full S1-S10 with mocked Fusion bridge per machine class
- State machine transitions (cancel mid-S7, resume from checkpoint)
- Error fallback (S/F calc fails → Sandvik catalog lookup)

### Real-Part Validation (30+ parts across all machine types)
**VMC 3-axis (5):** bracket, manifold_block, pocket_plate, contour_part, drill_pattern
**HMC 4-axis (3):** tombstone_multi, pallet_part, rotary_indexed
**5-axis (3):** impeller, undercut_cavity, compound_angle
**Lathe 2-axis (5):** BSHC 1A/1B/2A/2C, CASING
**Lathe C/Y (3):** cross_drill, hex_mill, bolt_circle
**Mill-turn (3):** sub_spindle_transfer, back_work, B_axis_contour
**Wire EDM (2):** profile_cut, taper_cut
**Multi-process (2):** mill_then_edm, turn_then_grind
**Error cases (4):** empty_model, unsupported_geometry, Fusion_disconnected, impossible_tolerance

### Edge-Case Catalog (10 specific cases)
1. 0.5mm diameter hole (micro-drill physics)
2. 0.3mm wall thickness (chatter + deflection risk)
3. 50 HRC hardened steel (force explosion, EDM recommendation)
4. Inconel 718 (work hardening, speed derating)
5. 10:1 L/D bore (boring bar chatter gate)
6. 45° chamfer on curved surface (5-axis required?)
7. M3×0.5 thread (rigid tap vs thread mill decision)
8. Part-off 0.5mm wall tube (vibration, feed reduction)
9. 100-feature part (performance: still <60s?)
10. Empty model (graceful error, not crash)

### Golden Comparison
- S/F within ±10% of MACRO PROGRAMS/ reference values
- Cycle time within ±15% of CycleTimeEstimatorEngine prediction
- Per controller dialect: same part → Fanuc + Haas + Okuma + Siemens outputs

### Safety Verification
- Collision HARD BLOCK verified on 5 test cases
- Spindle torque gate: Fc×arm < torque at RPM
- Workholding pullout: Fc_radial < clamp × μ × 0.7
- Rapid-into-stock detection on 3 test cases
- Boring-bar chatter gate on L/D > 4:1 case

### Quality Gates
- Cpk prediction on 3 tolerance-critical features (validate against CMM)
- SPC auto-setup from first 5 parts simulation
- FAI Form 3 auto-generation from toleranced features
- Inspection plan: auto-select features with tolerance < 0.05mm

### Performance
- <60s for 5-feature VMC part
- <90s for 10-feature lathe part with live tooling
- Per-stage SLO tracking with regression alerts
- Geometry caching: second run of same part < 10s
- Fuzz test: 100 random combos, 0 crashes, 0 hangs

### CI/CD
- Automated regression on every build (30+ part suite)
- Nightly performance benchmark (SLO tracking)
- Determinism test: same input → identical output
- Controller dialect cross-validation nightly
