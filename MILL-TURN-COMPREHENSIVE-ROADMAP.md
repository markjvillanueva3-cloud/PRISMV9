# PRISM MILL-TURN/SWISS COMPREHENSIVE ROADMAP v2.0
## 12 Milestones | 138 Units | 220 Target Tests

Generated: 2026-03-23
Current test baseline: 0/0 (pipeline broken — no G-code output)

Mill-turn is THE MOST COMPLEX machine type. It combines full turning capability
(OD/ID/thread/groove/face), full milling capability (pocket/contour/drill/tap),
multi-channel synchronization (2-4 channels), sub-spindle with part transfer,
live tooling (C/Y/B-axis), Swiss-type (guide bushing, gang slide, micro-features),
and bar feeder production (M99 loop, parts/bar, remnant tracking).

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

SKILLS: /smart mill-turn/Swiss CNC programmer + multi-axis specialist, /forge-triple, /prism-review,
  /test, /physics-verify, /program-validate, /auto-speed-feed, /playbook

MASTER KNOWLEDGE SOURCES FOR ALL MILL-TURN SESSIONS:
  ENGINES: MillTurnSwissPipelineEngine (1,787L — live tool + sub-spindle + Swiss + bar feeder + assembleProgram),
    TurningPrintToProgramEngine (~1,200L), LiveToolingEngine (173L),
    ThreadingPipelineEngine (710L), CollisionPreventionEngine (E1139)
  TRIBAL TIPS: src/data/solidcam-cam-tips.ts (iMachining turning + mill-turn),
    src/data/*-cam-tips.ts (mill-turn tips across all 18 CAM systems),
    controller-knowledge-tips.ts (27 Mazatrol references — UNIT/SHAPE format)
  PLAYBOOK: MachiningPlaybookEngine — multi-process sequencing rules, transfer anti-patterns
  FORMULAS: Turning: Kienzle + CSS (G96). Milling: chip thinning. Combined: channel synchronization timing
  CONSTANTS: src/physics/constants.ts. NOTE: MillTurnSwissPipelineEngine has inline KIENZLE_ISO (Phase 0-PRE fix)
  REFERENCE: Mazak Integrex programming manual, Star/Citizen/Tsugami Swiss programming guides,
    Siemens 840D multi-channel programming manual
  KEY COMPLEXITY: Multi-channel sync codes (M200/M201 Mazak, WAITM Siemens),
    sub-spindle transfer (grip force + thermal contraction), C/Y/B axis indexing,
    guide bushing vs non-guide-bushing Swiss, bar remnant tracking

4-LOOP QUALITY PROTOCOL (MANDATORY for EVERY unit):
  LOOP 1 — SCRUTINIZE: /prism-review + /scrutinize
  LOOP 2 — GAP FILL: /test + /trace wiring + edge cases
  LOOP 3 — TIE UP: no TODOs, reasoning[], golden snapshot, MASTER_INDEX
  LOOP 4 — VALIDATE: Re-run /prism-review on fixes, findings MUST decrease, full test suite → 0 failures
  FORGE-TRIPLE: every milestone → engine + protective hook + MCP action + skill
  ALL pass → next unit. /compact every 3 units (auto-triggered by hook).

PHYSICS FUSION INTEGRATION (ALL S/F milestones — fusion_tier >= 2 MANDATORY):
  Every speed/feed computation MUST use PhysicsFusionOrchestratorEngine (fusion_tier >= 2).
  Tier 1 (single-pass) NOT acceptable for production — multi-model convergence required.
  BOTH turning AND milling operations require fusion_tier >= 2 independently.
  Live tooling S/F: fusion applies with milling plugin set (chip thinning, radial engagement).
  Main spindle S/F: fusion applies with turning parameters (CSS, nose radius engagement).
  Action: physics_fusion via calcDispatcher.
  Outputs: Fc_N, power_kW, temperature_C, deflection_um, Ra_um, stability, confidence.
  See: PhysicsFusionOrchestratorEngine.ts + 5 plugins in src/engines/plugins/

IN-PROCESS PROBING (add to relevant milestones):
  Workpiece probing: touch probe in turret for WCS setting on main AND sub-spindle.
  Tool probing: tool touch setter for live tooling length after tool change.
  Multi-spindle probing: measure after rough on main spindle, auto-compensate finish pass.
  Part transfer verification: probe after sub-spindle pickup to verify alignment.
  Swiss-type probing: guide bushing centerline verification via skip signal (G31).
  Applies to: MT-MS2 (turning basics), MT-MS4 (live tooling), MT-MS6 (real parts).
```

## PER-MILESTONE COMPREHENSIVE KNOWLEDGE SOURCES

### MT-MS0: Collision Avoidance — Multi-Element
```
ENGINES:
  - MillTurnSwissPipelineEngine (1,787L) — base pipeline with assembleProgram()
  - CollisionEngine (2,526L) — 3D collision (needs multi-turret extension)
  - CollisionPreventionEngine (754L) — AABB + narrow-phase
  - SafetyVetoEngine (E1098) — 8 hard vetoes
  - ToolAssemblyEngine — tool+holder envelope for EACH turret position
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — mill-turn collision anti-patterns
    ("never move upper turret while sub-spindle is transferring")
  - src/data/solidcam-cam-tips.ts — iMachining mill-turn collision tips
  - src/data/*-cam-tips.ts — mill-turn collision tips across 18 CAM systems
  - controller-knowledge-tips.ts — sync code behavior during collision zones
FORMULAS:
  - Multi-element swept volume: V = Σ turret_envelope(position) at each time step
  - Sub-spindle approach clearance: gap > tool_stickout + part_diameter + safety_margin
  - Simultaneous motion check: at time t, ALL moving elements must have clearance > 0
  - Gang slide travel vs guide bushing position
REFERENCE:
  - Mazak Integrex collision avoidance documentation
  - DMG MORI NTX multi-turret collision zones
  - Citizen Cincom guide bushing clearance specifications
  - MachineRegistry — turret positions, sub-spindle travel per machine

INTENT: Mill-turn has 2-4 things moving AT THE SAME TIME. Upper turret cutting OD while
  lower turret drills cross-hole while sub-spindle approaches for transfer. ONE collision
  = $200K+ machine destroyed. PRISM must check every element at every time step.
```

### MT-MS0.5: Multi-Channel Sync Dialects
```
ENGINES:
  - ControllerDialectEngine (970L) — needs multi-channel sync extension
  - PostProcessorPipelineEngine (3,139L) — needs channel-aware post
  - MillTurnSwissPipelineEngine — assembleProgram() channel output
TRIBAL KNOWLEDGE:
  - controller-knowledge-tips.ts — 27 Mazatrol references for UNIT/SHAPE sync
  - MachiningPlaybookEngine — "sync codes must match between channels"
  - src/data/*-cam-tips.ts — multi-channel tips
FORMULAS:
  - 6 sync paradigms:
    Mazak: M200/M201 (wait), !C2 (channel designator), M888/M889 (simultaneous)
    Fanuc: M200/M201 (wait), $1/$2 (channel header)
    Siemens: WAITM(1,2,3) (wait marks), CHAN=1/2 (channel switch)
    Citizen: M200/M201 (Cincom), G14.1/G14.2 (sub-spindle)
    Star: M200/M201 + gang slide codes
    Index: M200/M201 + B-axis channel codes
REFERENCE:
  - Mazak SmoothX multi-channel programming manual
  - Siemens 840D multi-channel (WAITM) programming guide
  - Citizen Cincom Wizard multi-channel documentation
  - Fanuc multi-path programming manual

INTENT: Mazak uses M200/M201, Siemens uses WAITM, Citizen uses Cincom-specific codes.
  Same synchronization concept, 6 completely different syntaxes. Without the RIGHT sync
  codes, Channel 1 finishes turning while Channel 2 is still drilling = crash.
```

### MT-MS1: Machine Database — Channel Topology
```
ENGINES:
  - MachineSelectionEngine — mill-turn capability matching
  - MachineMatcherEngine — feature→machine with channel awareness
  - MachineStrategyConstraintEngine (E1091) — validate strategy vs machine channels
  - SpindleTorqueCurveEngine — main + sub-spindle power curves
TRIBAL KNOWLEDGE:
  - controller-knowledge-tips.ts — machine-specific channel configurations
  - MachiningPlaybookEngine — "Integrex = 2ch, NTX = 3ch, Citizen = 2ch+gang"
  - src/data/*-cam-tips.ts — machine-specific mill-turn tips
FORMULAS:
  - Channel topology: {channels: N, turrets: [{type, positions, live_tool, axis_list}], sub_spindles: N}
  - Integrex: 2ch (main + sub), upper turret (12-pos + milling spindle), lower turret (9-pos)
  - NTX: 3ch (main + sub + B-axis), B-axis = dedicated milling spindle (0-120°)
  - Citizen: 2ch (main + guide_bushing_side), gang slide + back-working turret
  - Star: 2ch with guide bushing, gang slide positions fixed
REFERENCE:
  - MachineRegistry — filter to mill-turn: Mazak, DMG MORI, Nakamura, Citizen, Star, Index
  - Mazak Integrex specifications (i-200, i-300, e-series)
  - DMG MORI NTX 1000/2000 specifications
  - Citizen Cincom L20/L32/M32 specifications
  - Star SR/SV series specifications

INTENT: An Integrex has 2 channels, an NTX has 3, a Citizen has 2+gang. The program
  structure is FUNDAMENTALLY different. PRISM must know the exact channel topology to
  generate correct multi-channel G-code for each machine model.
```

### MT-MS2: Tooling — Turning Inserts + Live Tools in Same Turret
```
ENGINES:
  - SmartToolSelectorEngine — filter to turning + live tool types
  - ToolCatalogEngine — 95K tools (turning inserts + live tool holders)
  - InsertGradeSelectionEngine — ISO grade for turning operations
  - ToolMagazineOptimizationEngine — turret station assignment
  - LiveToolingEngine (173L) — cross-drill, face mill, polygon turn
  - ToolROIEngine (E1081) — ROI for combined turning + milling tooling
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "live tool RPM limited by turret gearbox (typ 6000-12000)"
  - src/data/*-cam-tips.ts — mill-turn tooling tips
  - tribal tips: "use ER collet holders for live tools — less runout than Weldon"
  - Sandvik Coromant Capto for mill-turn applications
FORMULAS:
  - Turret station assignment: minimize index distance between sequential operations
  - Live tool RPM limit: check turret gearbox max RPM (varies by machine)
  - Tool change time: includes turret rotation + spindle orient + C-axis index
  - Combined tool count: turning stations + live tool stations ≤ turret_capacity
REFERENCE:
  - Sandvik Coromant Capto mill-turn catalog
  - Kennametal KM quick-change tooling for mill-turn
  - Machine-specific turret specifications (station count, shank type)

INTENT: A 12-station turret holds BOTH turning inserts AND live tool holders. Station 1
  might be a CNMG roughing insert, station 5 a drill chuck, station 8 a face mill holder.
  PRISM must assign stations optimally and know the RPM limits of each machine's turret.
```

### MT-MS3: Workholding — Main + Sub + Bar Feeder + Guide Bushing
```
ENGINES:
  - ChuckJawForceEngine (498L) — main + sub spindle grip force
  - WorkholdingVerificationEngine (E1148) — Coulomb friction check
  - MillTurnSwissPipelineEngine — sub-spindle transfer + bar feeder logic
  - SteadyRestPlacementEngine (564L) — if needed for long parts
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "sub-spindle grip force must exceed main during transfer"
  - tribal tips: "thermal contraction = part shrinks ~0.005mm after machining"
    "sub-spindle must grip BEFORE main releases — never both open"
  - controller-knowledge-tips.ts — chuck clamp/unclamp M-codes per controller
  - src/data/*-cam-tips.ts — mill-turn workholding tips
FORMULAS:
  - Transfer grip: F_sub > F_cutting_during_transfer + F_gravity + safety_factor
  - Thermal contraction: ΔD = D × α × ΔT (part cools from cutting temp to ambient)
  - Bar feeder push force: F_push > friction + gravity_component + acceleration
  - Guide bushing clearance: bushing_ID = bar_OD + 0.002-0.005mm (precision fit)
  - Parts per bar: N = (bar_length - remnant - chuck_grip) / (part_length + cutoff_width)
REFERENCE:
  - LNS/IEMCA/FMB bar feeder specifications
  - Hainbuch/Röhm chuck specifications for mill-turn
  - Guide bushing manufacturer specifications (Citizen, Star)
  - Machinery's Handbook — bar feeder calculations

INTENT: Part transfer between main and sub-spindle is the most dangerous moment —
  sub must grip firmly BEFORE main releases, accounting for thermal contraction
  (hot part is slightly smaller). Guide bushing fit is critical — too tight = scoring,
  too loose = vibration. Bar feeder must track remnant length to avoid short-feed crashes.
```

### MT-MS4: Multi-Channel G-Code Assembly
```
ENGINES:
  - MillTurnSwissPipelineEngine — assembleProgram() (just fixed, needs hardening)
  - PostProcessorPipelineEngine — channel-aware post-processing
  - POST-ULT pipeline (17 engines) — per-block optimization per channel
  - ControllerDialectEngine — multi-channel sync codes per controller
  - ProgramStructureEngine — channel headers, sync markers, end blocks
TRIBAL KNOWLEDGE:
  - controller-knowledge-tips.ts — 27 Mazatrol refs for multi-channel structure
  - MachiningPlaybookEngine — "channel programs must have matching sync points"
  - src/data/*-cam-tips.ts — multi-channel programming tips
  - tribal tips: "channel 2 must START with spindle sync before cutting"
FORMULAS:
  - Channel timing: T_ch1 = Σ(op_times), T_ch2 = Σ(op_times), T_total = max(T_ch1, T_ch2)
  - Sync point insertion: at transfer, at simultaneous start, at M30
  - Gantt overlap: identify operations that CAN run in parallel vs MUST be sequential
  - Program structure: % → channel header → safety → operations → sync → end
REFERENCE:
  - Mazak Integrex multi-channel programming examples
  - Siemens 840D multi-channel programming manual (CHANDATA, WAITM)
  - Published multi-channel optimization examples

INTENT: THIS IS THE CRITICAL MILESTONE. Without multi-channel G-code, mill-turn is just
  a lathe. Channel 1 turns OD while Channel 2 drills cross-holes SIMULTANEOUSLY. The
  program must have matching sync points, correct channel headers, and proper timing
  so operations overlap without collision. This is what makes mill-turn FAST.
```

### MT-MS5: Optimization — Minimize Cycle by Overlapping Channels
```
ENGINES:
  - GeneticOptimizer — search operation assignment to channels for min cycle time
  - AntColonyTSP — tool sequence optimization within each channel
  - ToolMagazineOptimizationEngine — turret station assignment across channels
  - StrategyBenchmarkEngine (E1096) — MC comparison of channel assignments
TRIBAL KNOWLEDGE:
  - MachiningPlaybookEngine — "overlap turning + drilling = best cycle time"
  - tribal tips: "face in Channel 1 while drilling in Channel 2 saves 30%"
  - src/data/*-cam-tips.ts — mill-turn optimization tips
FORMULAS:
  - Cycle time: T = max(T_ch1, T_ch2, ..., T_chN) + T_sync_waits + T_transfers
  - Optimization: minimize T by reassigning operations between channels
  - Constraint: operations on same spindle can't overlap
  - Constraint: collision-free at every time step during parallel execution
REFERENCE:
  - Published mill-turn cycle optimization research
  - Mazak Smooth Ai cycle time optimization documentation

INTENT: The whole point of mill-turn is doing two things at once. If Channel 1 is idle
  while Channel 2 works, you're wasting half the machine's capability. Optimization
  assigns operations to channels to minimize max(channel_times), not sum(channel_times).
```

### MT-MS6-MS8: Controller Hardening + Physics + Testing
```
MS6 SOURCES:
  - Mazak SmoothX programming manual (Mazatrol + EIA dual mode)
  - Citizen Cincom Wizard programming guide
  - Star SV/SR series programming manual
  - Index iXcenter programming manual
  - DMG MORI CELOS NTX programming examples
  - Nakamura-Tome Supermill programming guide

MS7 SOURCES:
  - ChuckJawForceEngine — grip at high RPM + centrifugal loss on BOTH spindles
  - Bar whip analysis: critical speed = f(bar_OD, bar_length, material_E, material_density)
  - Guide bushing friction: F_friction = μ × F_normal × contact_area
  - Sub-spindle thermal contraction: ΔD = D × α × ΔT (11.7×10⁻⁶/°C for steel)
  - Channel timing verification: actual vs predicted sync point timing

MS8 SOURCES:
  - Swiss medical pin (bone screw) — 3mm OD, internal hex, thread, 304/Ti6Al4V
  - Mazak Integrex shaft — OD turning + cross-drill + keyway + thread
  - Multi-process housing — turn + mill + drill + tap in one setup
  - Golden snapshots from MS0-MS7 for regression
  - Cross-controller: same part on Mazak + Citizen + Star + Index → different programs

INTENT: MS6: 6 controllers × completely different multi-channel syntax.
  MS7: bar whip at high RPM (critical speed), sub-spindle thermal contraction during
  transfer, guide bushing friction heating, channel timing accuracy.
  MS8: Swiss bone screw tests EVERYTHING — micro-features, tight tolerance, exotic material,
  guide bushing, gang slide, back-working, bar feeder loop.
```

### MT-MS9-MS11: Swiss + Parametric + Bar Feeder Production
```
ENGINES:
  - MillTurnSwissPipelineEngine — Swiss-specific guide bushing + gang slide logic
  - ParametricLatheProgramEngine (to be built) — #variable families for bar production
  - Bar feeder loop: M99 + parts counter + remnant tracking
TRIBAL KNOWLEDGE:
  - Citizen/Star/Tornos Swiss programming tips
  - MachiningPlaybookEngine — Swiss anti-patterns ("never retract past guide bushing")
  - tribal tips: "Swiss guide bushing Z-axis = part moves, not tool"
    "gang slide tools are FIXED — part moves to tool, not tool to part"
FORMULAS:
  - Guide bushing Z convention: Z_part = 0 at bushing face (opposite of standard lathe)
  - Gang slide offset: each tool at fixed Y position, part moves to align
  - Bar production: parts_per_bar = (L_bar - L_grip - L_remnant) / (L_part + L_cutoff)
  - Remnant detection: remaining_length < L_part + L_cutoff → eject bar, load new
REFERENCE:
  - Citizen Cincom L/M series programming manuals
  - Star SR/SV series programming manuals
  - Tornos Swiss GT/DT programming documentation
  - Published Swiss-type machining best practices

INTENT: Swiss-type is a DIFFERENT PARADIGM — the part moves through the guide bushing,
  not the tool. Z-axis convention is reversed. Gang slide tools are fixed — part aligns
  to them. Bar production with M99 loop must track remnant length and auto-load new bars.
  A medical bone screw (3mm OD, 50-feature) is the ultimate Swiss test part.
```

---

## CURRENT STATE (What's Built)

### Engine (existing, BROKEN):
| Engine | Lines | Status |
|--------|-------|--------|
| MillTurnSwissPipelineEngine | 1,696 | BROKEN — assembleProgram() missing, no G-code output |

### Critical Failures:
1. **No G-code output** — assembleProgram() stub exists but produces nothing
2. **No multi-channel sync** — channel concept declared but never emitted as G-code
3. **No sub-spindle transfer program** — M132/M232 handoff not implemented
4. **No collision checks** — turret-vs-turret, turret-vs-sub-spindle, gang-slide all unchecked

---

## CRITICAL ARCHITECTURAL ISSUES (Must Fix First)

### Issue 1: assembleProgram() Is Empty
The entire pipeline ends at operation sequencing. No G-code assembly, no channel headers, no sync codes. Every downstream milestone is blocked until this produces output.
**Fix**: MS4 — full multi-channel G-code assembly (THE critical milestone).

### Issue 2: No Collision Detection for Multi-Turret
Mill-turn machines have 2-4 simultaneously moving elements (upper turret, lower turret, sub-spindle, tailstock). Collision is not optional — it is a crash guarantee without it.
**Fix**: MS0 — collision zones for all moving elements.

### Issue 3: No Controller Dialect Differentiation
Six completely different multi-channel sync paradigms exist. PRISM treats them as one.
**Fix**: MS0.5 — multi-channel dialect layer with 6 sync paradigms.

### Issue 4: No Machine-Specific Channel Structure
An Integrex has 2 channels (main+sub). An NTX has 3 (main+sub+B-axis). A Citizen has 2+gang. A Star has guide-bushing logic. All are different.
**Fix**: MS1 — machine database with channel topology per model.

---

## MILESTONE DETAILS

### MT-MS0: Collision Avoidance — Multi-Element Machines
**Priority: CRITICAL | Units: 15 | Depends on: nothing**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Upper turret vs lower turret — swept volume envelope of each turret's active tool during simultaneous cutting, verify non-overlapping Z zones with 2mm minimum gap |
| U02 | Upper turret vs sub-spindle chuck — tool path envelope vs sub-spindle chuck face + workpiece protrusion, especially during transfer approach sequence |
| U03 | Lower turret vs main chuck — verify lower turret tool tip clears main chuck jaws at all X/Z positions, including jaw step height |
| U04 | Gang slide vs guide bushing — linear tool bank approach angle vs bushing face, minimum 0.5mm clearance, adjacent tool interference during Z travel |
| U05 | Live tool holder vs tailstock quill — radial tool protrusion during cross-milling/drilling vs tailstock quill face and live center, auto-retract tailstock before live ops |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Bar stock protrusion vs sub-spindle approach — bar extension past main chuck during cutoff must not exceed 3x diameter; sub-spindle approach path must clear protruding bar |
| U07 | Longest tool swing arc during turret index — calculate max radius tool in each turret station, swept circle during index vs opposing turret/sub-spindle/part OD |
| U08 | Turret index while adjacent turret is cutting — BLOCK index on turret A if turret B is actively cutting in the shared Z zone; enforce sync point before index |
| U09 | Steady rest vs turret interference — steady rest ring position vs both turret approach corridors, auto-retract steady rest before turret crosses its Z position |
| U10 | Safe rapid corridors between turrets — define safe X/Z rapid zones per turret where no collision is possible regardless of opposing turret position |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U11 | Sub-spindle approach path clear of main turret — sub-spindle Z travel corridor must be verified empty of all main turret tools before approach begins |
| U12 | Cut-off tool vs part catcher mechanism — part catcher arm swing arc vs cutoff blade Z position, timing sequence: cutoff complete -> catcher activate -> retract blade |
| U13 | Coolant nozzle vs part geometry — programmable coolant nozzle position must not collide with part OD during turret index or sub-spindle approach |
| U14 | Chip conveyor vs bar feeder — bar feeder push rod retract position vs chip conveyor auger, interlock sequence during bar advance |
| U15 | Test: 15 deliberate collision scenarios — 5 turret-vs-turret, 3 turret-vs-sub, 2 gang-slide, 2 guide-bushing, 1 steady-rest, 1 catcher, 1 coolant — ALL caught |


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

### MT-MS0.5: Multi-Channel Sync Dialects + POST-ULT Pipeline
**Priority: CRITICAL | Units: 8 | Depends on: MS0**

**POST-ULT INTEGRATION:** All G-code from MillTurnSwissPipelineEngine MUST route through
PostProcessorPipelineEngine (POST-ULT). Multi-channel sync codes, sub-spindle transfers,
and live tooling dialect all injected by POST-ULT — no inline G-code in pipeline stages.

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Fanuc M200/M201/M202 wait codes — M200 = wait for channel 2, bidirectional sync points, $1/$2 program path structure |
| U02 | Siemens WAITM(1,2,3) — named sync marks, NEWCONF for axis reassignment between channels, CHANDATA declarations |
| U03 | Mazak !L / !R channel markers — left/right spindle program separation, !C common block, smooth interpolation |
| U04 | Index GETIME/SYNCO — real-time channel synchronization, GETIME reads opposing channel position, WTIME wait |
| U05 | Citizen $1/$2 channel prefix — every line prefixed with channel ID, simultaneous execution by line pairing |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Star SR guide-bushing dialect — gang-slide G-code with bushing compensation, B-axis indexing, separate format from Citizen |
| U07 | Dialect abstraction layer — SyncPoint interface: emit(dialect) -> correct wait/sync code per controller, channel header/footer templates |
| U08 | Cross-dialect validation — same 2-channel part on all 6 dialects, verify sync point count matches, no cross-contamination |


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

### MT-MS1: Machine Database — Channel Topology
**Priority: HIGH | Units: 8 | Depends on: MS0.5**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Mazak Integrex i-200 — 2 channels, main+sub spindle, upper turret 12-pos, lower turret 9-pos, Y-axis upper only |
| U02 | Okuma Multus B300II — 2 channels, B-axis on upper turret, 40-tool ATC option, Capto C6, OSP-P300M |
| U03 | DMG MORI NTX 2000 — 3 channels (main+sub+B-axis milling), compactMASTER spindle, 76-tool ATC, Siemens 840D |
| U04 | Citizen Cincom L20 — 2 channels, guide bushing, gang slide + back-working turret, 0.5-20mm bar capacity |
| U05 | Star SR-20J — 2 channels, guide bushing, 8-pos gang + 8-pos turret, sub-spindle back-work, separate format from Citizen |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Tsugami SS20 — 2 channels, guide bushing, cross-slide gang, 5 back-working positions |
| U07 | Channel topology abstraction — {channels: [{id, spindle, turrets[], axes[]}], sync_method, max_rpm, bar_cap} |
| U08 | Machine auto-selector — part features + bar diameter + channel needs -> rank top 3 machines with reasoning |


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

### MT-MS2: Tooling — Turning Inserts + Live Tools in Same Turret
**Priority: HIGH | Units: 9 | Depends on: MS0**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | VDI tool holder system — VDI 20/25/30/40/50, static + driven, axial + radial orientation, RPM limits per size |
| U02 | BMT (base-mount tooling) — BMT 45/55/65, higher rigidity than VDI, angular positioning, preferred for heavy milling |
| U03 | Capto tooling — C3/C4/C5/C6/C8 polygon interface, quick-change, modular extensions, torque ratings per size |
| U04 | Turning insert in live turret — same station holds OD turn insert AND driven end-mill, T-word + M133/M135 switching |
| U05 | Gang slide tool layout — linear arrangement, no index time, tool-to-tool distance = Z offset only, max 8-10 tools |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Back-working tool selection — sub-spindle side tools: ID drill, chamfer, tap, thread mill, deburr — shorter holders for limited Z travel |
| U07 | Tool interference map — each turret station occupied tool envelope, auto-check neighbor clearance during index rotation |
| U08 | Swiss-type micro tooling — 0.5-6mm drills, 0.3mm grooving inserts, form tools for small OD profiles, micro boring bars |
| U09 | Tests: VDI vs BMT vs Capto on same part, verify holder-specific offsets + M-codes + RPM limits |


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

### MT-MS3: Workholding — Main + Sub + Bar Feeder + Guide Bushing
**Priority: HIGH | Units: 8 | Depends on: MS0**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Main spindle chuck — 3-jaw hydraulic, collet chuck, grip force vs RPM (centrifugal loss), jaw type friction coefficients |
| U02 | Sub-spindle chuck — smaller capacity, approach sequence: Z approach -> sync RPM -> close -> unclamp main -> cutoff -> retract |
| U03 | Bar feeder integration — LNS, Iemca, FMB: bar diameter, remnant length, feed-to-stop M-code, handshake protocol |
| U04 | Guide bushing mechanics — bushing ID = bar OD + 0.002mm, oil film support, deflection = F*L^3/(3EI) with L = tool-to-bushing (short) |
| U05 | Collet chuck for Swiss — 5C, 16C, ER collet: drawbar pull force, concentricity spec, bar diameter range per collet |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Part transfer sequence — M132 sub approach -> sync RPM -> M232 sub close -> verify grip -> cutoff -> M134 sub retract -> back-work |
| U07 | Grip force during transfer — F_axial from cutoff insert vs sub-spindle grip. Grip must exceed 2.5x cutoff axial force. If insufficient -> reduce cutoff feed |
| U08 | Tests: 5 workholding configs (chuck+tail, chuck+sub, collet+guide, bar+chuck, bar+guide) all verified |


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

### MT-MS4: Multi-Channel G-Code Assembly
**Priority: CRITICAL | Units: 20 | Depends on: MS0.5, MS1, MS2, MS3**

**Apply: `/smart /forge-triple` at session start for this milestone**


This is THE critical milestone. Everything before it builds infrastructure; everything after it depends on its output.

| Unit | Description |
|------|-------------|
| U01 | **assembleProgram() full implementation** — accept operation list, emit complete multi-channel G-code with headers, tool calls, sync points, end codes |
| U02 | Channel 1 (main spindle) turning G-code structure — safe start, spindle on, tool calls, turning cycles (G71/G70/G76/G75), coolant, spindle stop |
| U03 | Channel 2 (sub-spindle) turning G-code structure — independent safe start, sub-spindle on (M232), tool calls from sub turret, back-working cycles |
| U04 | Channel 3 (milling spindle/B-axis) milling G-code structure — G19 plane select, B-axis angle, live spindle on, milling cycles (G12.1 polar, peck drill, tap) |
| U05 | Sync points: wait codes between channels — M200/WAITM/!C per dialect, placed at every operation boundary and every collision-risk transition |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Overlap optimization — identify which ops CAN run simultaneously (e.g., OD rough on CH1 while ID drill on CH2), flag mutual exclusions |
| U07 | Critical path analysis — which channel is the bottleneck? Sum cut time per channel, identify the longest path that determines total cycle time |
| U08 | Gantt chart scheduling — minimize total cycle time by overlapping independent operations, output timing diagram as comment block |
| U09 | Collision zone checking during overlapping operations — before allowing simultaneous blocks, verify Z zones don't overlap with 2mm clearance |
| U10 | Tool change coordination — don't index turret while other channel is cutting in shared zone; insert sync point before any turret index |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U11 | Sub-spindle transfer sequence — approach (G0 Z_transfer) -> clamp sub (M232) -> unclamp main (M10) -> cutoff (G75) -> retract sub (G0 Z_sub_home) -> back-work |
| U12 | Back-working — face, chamfer, center-drill, deburr on sub-spindle after transfer; short tools, limited Z travel, separate WCS |
| U13 | Bar advance — M99 loop structure, bar feeder M-codes (M371 feed, M372 clamp), part counter (#500 increment), face stock removal |
| U14 | Part ejection — part catcher M-codes (M24 open, M25 close), chute activation, blow-off air, timing delay for part clear |
| U15 | Swiss-specific: guide bushing mode vs collet mode — G-code differences: Z-axis is bar (sliding headstock) vs Z-axis is tool (fixed headstock) |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U16 | Swiss: gang slide tool assignment — multiple tools on one slide, no turret index, Z offset between tools, simultaneous front+back work |
| U17 | Swiss: B-axis angle for off-axis features — B0 (axial), B90 (radial), B-angle (compound), interpolation for helical features |
| U18 | Swiss: sliding headstock vs fixed headstock — Z-axis convention reversal, guide bushing compensation, program structure differences |
| U19 | Program structure: header per channel — O-number, channel ID comment, G18/G19 plane, work offset, units, safe start, per-channel footer with M30 |
| U20 | Controller-specific program structure — each of 6 dialects (Fanuc, Siemens, Mazak, Index, Citizen, Star) gets DIFFERENT multi-channel program layout |
| **TEST** | Dual-channel program with 4 sync points: OD rough (CH1) || ID drill (CH2) -> sync -> OD finish (CH1) || thread (CH2) -> sync -> transfer -> back-work. Verify timing on 2 dialects |


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

### MT-MS5: Optimization — Minimize Total Cycle by Overlapping Channels
**Priority: HIGH | Units: 8 | Depends on: MS4**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Gantt chart builder — each operation: channel, start_time, duration, dependencies, collision zones occupied |
| U02 | Overlap identification — OD rough on upper turret while ID drill on lower turret simultaneously, verify Z separation |
| U03 | Critical path calculation — longest single-thread path = cycle time floor, identify bottleneck channel |
| U04 | Operation reordering — move independent ops to opposing channel to balance load, maintain precedence constraints |
| U05 | Idle time minimization — if channel 1 waits for channel 2 at sync point, insert deburr/chamfer into gap |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Transfer overlap — begin sub-spindle approach during final main-spindle finish cut (approach is non-cutting, safe to overlap) |
| U07 | Cycle time estimator — rapid time + cut time + index time + sync wait time per channel, total = max(channels) + sync overhead |
| U08 | Tests: unoptimized vs optimized cycle time on 4 parts, verify >15% improvement on each |


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

### MT-MS6: Controller Deep Hardening — 6 Controllers x 2 Units
**Priority: MEDIUM | Units: 12 | Depends on: MS0.5**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Fanuc 31i-B5 multi-path — M200/M201 wait codes, T-word per turret ($1 T0101, $2 T0201), G14 path switch |
| U02 | Fanuc deep — M132/M232 sub-spindle codes, safe start per channel (G28 U0 W0), M30 per path, G12.1 polar for live tool |
| U03 | Siemens 840D sl multi-channel — WAITM(n, ch1, ch2) sync, SETMS(n) spindle assignment, CHANDATA(n) channel programs |
| U04 | Siemens deep — NEWCONF axis reassignment, REPOS after interrupt, CYCLE95/CYCLE97 turning cycles, SUPA retract, TRANSMIT for face milling |
| U05 | Mazak SmoothAi multi-tasking — !L/!R/!C channel prefix, G53.5 tool offset, M832 sync code, smooth interpolation |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Mazak deep — SMOOTH AI corner control, conversational multi-task mode awareness, !C common sync blocks, M200-series custom sync |
| U07 | Index C200-4D — GETIME/WTIME sync, up to 4 simultaneous channels, gang + turret + sub, C-line channel structure |
| U08 | Index deep — SYNCO real-time synchronization, GETIME reads opposing channel position, channel program nesting |
| U09 | Citizen Cincom M-series — $1/$2 channel codes, guide bushing Z compensation, gang slide G-code structure, line-by-line channel pairing |
| U10 | Citizen deep — back-working program structure, guide bushing mode switching, gang slide tool offset management |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U11 | Star SR programming format — different channel structure from Citizen, B-axis indexing codes, gang slide conventions |
| U12 | Test: same transfer part (OD turn + cross-drill + cutoff + back-face) on ALL 6 controllers -> 6 different programs, line-by-line sync point verification |


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

### MT-MS7: Physics — Grip Force, Bar Whip, Guide Bushing, Timing
**Priority: HIGH | Units: 8 | Depends on: MS0**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Grip force during transfer — F_grip_sub > 2.5 x F_cutoff_axial. F_cutoff = Kc x f x blade_width. If insufficient -> reduce cutoff feed or widen blade |
| U02 | Bar whip natural frequency — f_n = (lambda^2 / 2piL^2) * sqrt(EI/rhoA). If spindle_RPM/60 > 0.8 x f_n -> auto-limit RPM, warn operator |
| U03 | Guide bushing deflection — delta = F*L^3/(3EI) where L = tool-to-bushing distance (typically 2-8mm). delta < tolerance/3 required |
| U04 | Centrifugal chuck force loss — F_eff = F_static - m*omega^2*r. Auto-set G50 S_max where F_eff > 2.5 x F_cut |
| U05 | Multi-channel timing model — T_total = max(T_ch1, T_ch2, ...) + sum(T_sync_wait). Sync overhead typically 0.3-0.8s per point |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Cutoff dynamics — blade enters at center: increasing then decreasing chip load. Feed must drop 30% in final 2mm to prevent pip |
| U07 | Sub-spindle RPM matching — deltaN during transfer < 5 RPM. Ramp time = J*deltaOmega/T_motor. If ramp > 0.5s -> pre-sync before approach |
| U08 | Tests: bar whip limit on 4 L/D ratios, grip force on 3 materials, guide bushing deflection on 5 tool positions |


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

### MT-MS8: Testing — Exhaustive Multi-Tier Validation
**Priority: CRITICAL | Units: 30 | Depends on: ALL**

**Apply: `/smart /forge-triple` at session start for this milestone**


#### Tier 1 — Basic Mill-Turn (6 units)
| Unit | Description |
|------|-------------|
| U01 | T1-P1 stepped shaft with cross-hole — 25mm 1045, OD turn + live drill, 2-channel on Integrex, verify sync |
| U02 | T1-P2 hex fitting — 32mm 4140, OD hex mill (C-axis) + thread, 2-channel on Multus, verify B-axis positioning |
| U03 | T1-P3 stepped bushing — 20mm 12L14, OD step + ID bore + cutoff + back-face, 2-channel, verify transfer sequence |
| U04 | T1-P1 cross-machine — same shaft on Integrex vs NTX vs Multus, verify identical geometry, different G-code |
| U05 | T1-P2 cross-controller — hex fitting on Fanuc vs Siemens vs Mazak, verify sync codes differ correctly |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | T1-P3 bar production — bushing as 50-part bar job, verify M99 loop, part counter, remnant detection |

#### Tier 2 — Advanced Mill-Turn (8 units)
| Unit | Description |
|------|-------------|
| U07 | T2-P1 hydraulic valve spool — 25mm 4140, 4 lands (OD grooves), 3 cross-ports (C-axis drill), O-ring grooves, 2-channel overlapping |
| U08 | T2-P2 firearms bolt — 20mm 4340, OD profile + spiral flutes (B-axis interpolation) + extractor groove + face features |
| U09 | T2-P3 turbocharger shaft — 30mm Inconel 718, OD journal turn + thread + keyway (C-axis) + balance groove |
| U10 | T2-P4 hydraulic fitting — 38mm 316L SS, hex body (C-axis) + taper thread + cross-port + ID bore, 2-channel |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U11 | T2-P1 multi-channel overlap — valve spool with OD rough (CH1) || cross-drill (CH2) overlap, verify timing savings >20% |
| U12 | T2-P2 B-axis stress — bolt spiral flutes require continuous B-axis interpolation, verify no axis limit violations |
| U13 | T2-P3 Inconel feeds — turbocharger shaft with Inconel-specific S/F tables, verify cutting force within spindle power |
| U14 | T2-P4 taper thread — fitting with NPT taper thread, verify G76 compound angle + taper compensation |

#### Tier 3 — Swiss-Type (8 units)
| Unit | Description |
|------|-------------|
| U15 | T3-P1 dental implant — 4mm Ti-6Al-4V, external thread (M3.5 special pitch), hex socket, tapered body, guide bushing mode |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U16 | T3-P2 bone screw — 3.5mm Ti-6Al-4V, custom buttress thread (thread whirling), cross-slot (C-axis), 10mm length |
| U17 | T3-P3 connector pin — 1mm BeCu, OD step + cross-drill 0.3mm + form groove, extreme micro-tooling, 12,000+ RPM |
| U18 | T3-P4 watch stem — 2mm brass, sub-mm features, polygon turning (hex), thread M1.2, guide bushing deflection critical |
| U19 | T3-P1 on Cincom — dental implant on Citizen Cincom L20, verify channel pairing, guide bushing Z comp |
| U20 | T3-P2 on Star — bone screw on Star SR-20J, verify different program format from Citizen |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U21 | T3-P3 production — connector pin 1000-part batch, bar optimization, tool life tracking for micro-drills |
| U22 | T3-P4 micro-tolerance — watch stem with 0.005mm OD tolerance, verify guide bushing deflection < tolerance/3 |

#### Tier 4 — Extreme Complexity (6 units)
| Unit | Description |
|------|-------------|
| U23 | T4-P1 aerospace bearing housing — 50mm Inconel 718, C-axis drilling (8 holes on bolt circle), OD profile, ID bore H6, multi-channel 3-axis on NTX |
| U24 | T4-P2 watch component — 8mm brass, sub-mm features, polygon turning, micro-thread M0.8, Swiss on Cincom |
| U25 | T4-P1 3-channel — bearing housing on NTX with 3 simultaneous channels: OD (CH1) + ID (CH2) + B-axis milling (CH3), verify all sync points |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U26 | T4-P2 tolerance stack — watch component tolerance stack-up analysis: guide bushing + tool deflection + thermal < total tolerance |

#### Cross-Validation (10 units)
| Unit | Description |
|------|-------------|
| U27 | Cross-machine: T1-P1 on all 6 machines (Integrex, Multus, NTX, Cincom, Star, Tsugami) — verify machine-specific output |
| U28 | Cross-controller: T2-P1 valve spool on all 6 controllers (Fanuc, Siemens, Mazak, Index, Citizen, Star) — verify dialect correctness |
| U29 | Multi-channel sync timing: 4 parts with 2+ channels, verify sync wait time < 10% of total cycle |
| U30 | Transfer grip force: 5 materials (1045, 4140, Ti-6Al-4V, Inconel, 316L) x transfer sequence, verify grip > 2.5x cutoff force on each |


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

### MT-MS9: Swiss-Type Specific Features
**Priority: HIGH | Units: 15 | Depends on: MS0, MS3, MS4**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Guide bushing mode — very short tool overhang (2-8mm from bushing), different deflection model than chuck-held, bushing ID = bar OD + 0.002mm |
| U02 | Gang slide programming — multiple tools in a row, no turret index time, Z offset between tools, can run simultaneously with back turret |
| U03 | Sliding headstock kinematics — Z-axis IS the bar (headstock slides), tool is stationary in Z; program structure reversal vs fixed headstock |
| U04 | Guide bushing deflection model — delta = F*L^3/(3EI) with L = overhang from bushing (2-8mm); compare to collet-held where L = full part length |
| U05 | Bar whip natural frequency check — f_n for bar diameter at extended length from collet; if spindle RPM > 0.8*f_n -> auto-limit RPM, flag for operator |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Micro-features — 0.5-4mm diameter parts, very high RPM (8,000-15,000), micro-tool S/F from manufacturer tables, breakage risk monitoring |
| U07 | Cross-drilling with C-axis — position C0/C90/C180/C270, drill with live tool, pecking for depth > 1.5x drill dia, chip evacuation critical |
| U08 | Cross-tapping with synchronized live spindle — synchronize live spindle RPM with Z feed rate, rigid tap cycle, verify pitch accuracy |
| U09 | Thread whirling — single-point thread generation on Swiss, common for medical bone screws (buttress, acme), whirling head setup |
| U10 | Polygon turning — hex, square, double-D on small parts, speed ratio = (n_main / n_tool) for polygon count, verify geometric accuracy |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U11 | Cut-off optimization — blade width (0.5-2mm) x material -> optimal feed rate and RPM; feed reduction 30% in final 2mm to prevent pip |
| U12 | Part ejection + bar advance timing — sequence: cutoff complete -> catcher close -> eject air -> bar advance -> clamp -> face -> next part |
| U13 | Coolant optimization — through-tool vs flood vs MQL on Swiss; through-tool preferred for deep holes, MQL for micro-features, flood for general |
| U14 | Production batch: 1000+ parts — bar length tracking, parts-per-bar calculation, remnant eject, total cycle estimation, tool life per station |
| U15 | Test: medical bone screw (Ti-6Al-4V, 3.5mm dia, buttress thread via whirling, cross-slot C-axis, 10mm length) on Cincom + Star, verify both programs |


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

### MT-MS10: Parametric/Macro Programming for Mill-Turn
**Priority: MEDIUM | Units: 8 | Depends on: MS4, MS0.5**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Part family macros — #variables for diameter, length, feature positions; one program -> multiple sizes, auto-adjust S/F per size |
| U02 | Bar feeder loop with part counter and auto-offset — M99 loop, #500 counter, G10 L11 offset correction every N parts from gauge |
| U03 | Sister tool management across multiple turrets — tool life counter per station, auto-switch T0101->T0111 at N parts, works across CH1 and CH2 |
| U04 | In-process probing on main AND sub-spindle — touch probe in turret, G31 skip, measure after rough, auto-compensate finish pass, both spindles |
| U05 | Adaptive feed control — read #3028 spindle load real-time, IF load > 80% reduce F by 20%, IF load < 40% increase F by 15%, per channel |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Production reporting macros — parts/hour calculation, tool wear tracking (#variables), shift report output to DPRNT, alarm on tool break |
| U07 | Multi-fixture macro — run same program at multiple WCS positions (G54->G59, G54.1 Pn), for fixture-plate mill-turn setups |
| U08 | Test: die family in 3 sizes (1", 2", 3" OD) on Integrex, parametric program with #100=#OD, verify all 3 produce correct G-code |


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

### MT-MS11: Bar Feeder + Production Loop
**Priority: MEDIUM | Units: 8 | Depends on: MS4**

**Apply: `/smart /forge-triple` at session start for this milestone**


| Unit | Description |
|------|-------------|
| U01 | Bar feeder handshake — M-code start feed (M371), confirm bar at stop (M370 check), auto-clamp sequence, timeout alarm |
| U02 | Parts-per-bar calculator — (bar_length - chuck_grip - remnant) / (part_length + cutoff_width + face_stock), display in program header |
| U03 | Remnant detection — bar length tracking via #variable decrement, auto-eject when remaining < part_length + 5mm, alarm + new bar load |
| U04 | Parts counter — #500 increment per cycle, M00 at inspection interval (every 50th), M30 at batch complete (e.g., 500 parts) |
| U05 | Auto-offset compensation — G10 L11 P1 R(measured-target) every N parts from gauge feedback, drift compensation |

> **4-LOOP GATE:** SCRUTINIZE (`/prism-review` + `/scrutinize`) → GAP FILL (`/test` + `/trace` wiring + edge cases) → TIE UP (no TODOs, reasoning[], golden snapshot). **`/compact` here if 3+ units done.**

| U06 | Sister tool management — tool life counter per station, auto-switch T0101->T0111 at wear limit, zero downtime, multi-turret aware |
| U07 | Lights-out safety — door close verify (M-code), chip conveyor run, coolant level check, bar feeder magazine empty alarm |
| U08 | Tests: 100-part simulation on Integrex + Cincom, verify counter, remnant eject, sister tool trigger, no false alarms |

---

## TEST MATRIX

### Parts (14):
| ID | Part | Material | Bar Dia | Length | Key Features |
|----|------|----------|---------|--------|--------------|
| P1 | Stepped shaft | 1045 | 25mm | 40mm | OD turn + cross-hole + cutoff + back-face |
| P2 | Hex fitting | 4140 | 32mm | 35mm | C-axis hex mill + M24x1.5 thread + back-drill |
| P3 | Stepped bushing | 12L14 | 20mm | 25mm | OD step + ID bore + cutoff + back-chamfer |
| P4 | Hydraulic valve spool | 4140 | 25mm | 60mm | 4 lands, 3 cross-ports, O-ring grooves |
| P5 | Firearms bolt | 4340 | 20mm | 55mm | Spiral flutes (B-axis), extractor groove |
| P6 | Dental implant | Ti-6Al-4V | 4mm | 10mm | Guide bushing, special thread, hex socket |
| P7 | Bone screw | Ti-6Al-4V | 3.5mm | 10mm | Thread whirling, cross-slot, buttress thread |
| P8 | Connector pin | BeCu | 1mm | 8mm | Micro cross-drill 0.3mm, form groove |
| P9 | Bearing housing | Inconel 718 | 50mm | 60mm | 3-channel NTX, bolt circle C-axis, H6 bore |
| P10 | Watch stem | Brass | 2mm | 12mm | Polygon hex, M1.2 thread, sub-mm features |
| P11 | Production connector | 12L14 | 16mm | 18mm | 500pc bar job, auto cycle, sister tools |
| P12 | Transfer part | A2 | 38mm | 55mm | Op1 main + cutoff + Op2 sub-spindle |
| P13 | Turbocharger shaft | Inconel 718 | 30mm | 45mm | Journal turn + thread + keyway + balance groove |
| P14 | Hydraulic fitting | 316L SS | 38mm | 40mm | Hex body + NPT taper thread + cross-port |

### Machines (6):
| ID | Machine | Controller | Channels | Key Feature |
|----|---------|-----------|----------|-------------|
| M1 | Mazak Integrex i-200 | SmoothAi | 2 | Upper+lower turret, Y-axis, Fanuc-base |
| M2 | Okuma Multus B300II | OSP-P300M | 2 | B-axis, Capto C6, 40-tool ATC |
| M3 | DMG MORI NTX 2000 | Siemens 840D | 3 | compactMASTER, 76-tool ATC, 3-channel |
| M4 | Citizen Cincom L20 | Citizen M-series | 2 | Guide bushing, gang slide, 0.5-20mm bar |
| M5 | Star SR-20J | Star SR CNC | 2 | Guide bushing, gang+turret, different from Citizen |
| M6 | Tsugami SS20 | Fanuc 31i | 2 | Guide bushing, cross-slide gang, 5 back-work |

### Compatibility:
| Part | M1 | M2 | M3 | M4 | M5 | M6 |
|------|:--:|:--:|:--:|:--:|:--:|:--:|
| P1-P3 | Y | Y | Y | Y | Y | Y |
| P4 | Y | Y | Y | N | N | N |
| P5 | N | Y | Y | N | N | N |
| P6-P7 | N | N | N | Y | Y | Y |
| P8 | N | N | N | Y | Y | Y |
| P9 | N | N | Y | N | N | N |
| P10 | N | N | N | Y | Y | N |
| P11 | Y | Y | Y | Y | Y | Y |
| P12 | Y | Y | Y | Y | Y | Y |
| P13 | Y | Y | Y | N | N | N |
| P14 | Y | Y | Y | N | N | N |
**Total valid programs: 58 (before cross-validation multiplier)**
**With cross-controller variants: 220 target tests**

---

## UNIT COUNT SUMMARY

| Milestone | Units | Focus |
|-----------|-------|-------|
| MT-MS0 | 15 | Collision avoidance — 15 multi-element scenarios |
| MT-MS0.5 | 8 | Multi-channel sync dialects — 6 controllers |
| MT-MS1 | 8 | Machine database — channel topology |
| MT-MS2 | 9 | Tooling — turning + live in same turret |
| MT-MS3 | 8 | Workholding — main + sub + bar + guide |
| MT-MS4 | 20 | **Multi-channel G-code assembly** (THE critical build) |
| MT-MS5 | 8 | Optimization — overlap channels |
| MT-MS6 | 12 | Controller deep hardening — 6 x 2 |
| MT-MS7 | 8 | Physics — grip, whip, deflection, timing |
| MT-MS8 | 30 | Testing — 4 tiers + cross-validation |
| MT-MS9 | 15 | Swiss-type specific features |
| MT-MS10 | 8 | Parametric/macro for mill-turn |
| MT-MS11 | 8 | Bar feeder + production loop |
| **TOTAL** | **147** | |

Note: MS9 (formerly bar feeder) renumbered to MS11. New MS9 = Swiss-type. New MS10 = Parametric.

---

## EXECUTION ORDER

```
Phase 1: MS0 (collision)                                    [15 units, SAFETY FIRST]
       -> MS0.5 (sync dialects)                             [8 units, DIALECT LAYER]
Phase 2: MS7 (physics, parallel OK)                         [8 units, PHYSICS]
Phase 3: MS1 + MS2 + MS3 (parallel)                         [25 units, MACHINES + TOOLS + WORKHOLDING]
Phase 4: MS4 (multi-channel G-code assembly)                [20 units, THE CRITICAL BUILD]
Phase 5: MS5 + MS6 + MS9 + MS10 + MS11 (parallel)          [51 units, OPTIMIZATION + CONTROLLERS + SWISS + MACRO + PRODUCTION]
Phase 6: MS8 (exhaustive validation)                        [30 units, 4-TIER TESTING]
```

## WHY 147 UNITS (vs 104 for lathe)

Mill-turn encompasses ALL of lathe PLUS:
- Multi-channel G-code assembly (20 units — lathe has 0)
- Collision for 2-4 simultaneous moving elements (15 units — lathe has 13 but single-turret)
- 6 different multi-channel sync dialects (8 units — lathe has 0)
- Swiss-type specific features (15 units — lathe has 1 mention)
- Controller deep hardening x2 per controller for multi-channel (12 units — lathe has 7)
- 30-unit 4-tier test matrix (lathe has 14)
- Parametric across multiple turrets and channels (8 units — lathe has 8 single-turret)

## FINAL TARGET: 220 tests, 100% pass rate

### MINIMUM TEST BASELINE GATE (Phase 5 prerequisite)
```
MILL-TURN minimum: 30+ dedicated tests before Phase 5 milestones
Current baseline: 0/0 (pipeline broken — no G-code output)
Gap: 30+ tests needed — channel sync, live tooling, sub-spindle transfer, Swiss
Validation: match-then-improve against Mazak/Star/Citizen programming references
  Step 1: Match published S/F within ±10% for both turning and milling operations
  Step 2: Improve with fusion_tier >= 2 for BOTH turning AND live tooling paths
```

### MACHINE-TYPE SELECTOR REFERENCE
```
Input: part geometry (size, features, tolerances) + material + batch size
Output: ranked machine type recommendation
Engine: MachineTypeSelectorEngine (shared across all 8 machine roadmaps)
Mill-turn selection criteria: combined rotational + prismatic features, cross-drilled holes,
  off-center features on turned parts, high-volume bar work, Swiss-type small parts
Contra-indicators: pure prismatic (→ milling), pure rotational without milling (→ lathe)
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