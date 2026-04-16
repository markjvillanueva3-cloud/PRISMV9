# LATHE-PRO 20-Agent Scrutiny Report

## Date: 2026-04-05
## Roadmap: LATHE-PRO v1.0.0 (8 milestones, 62 units)
## Goal: Zero-experience user uploads print photo/CAD file -> master-level CNC lathe program

---

## SCORECARD

| # | Role | Score | Verdict |
|---|------|-------|---------|
| 1 | Master CNC Programmer (20yr) | **68** | Architecturally sound, shop-floor incomplete |
| 2 | Safety Engineer (OSHA) | **38** | CRITICAL: No bar whip, no door interlock, no emergency recovery |
| 3 | Process Engineer (Cp/Cpk) | **58** | Single-part mentality, no production batch optimization |
| 4 | Tooling Specialist (Sandvik) | **52** | Insert selection is independent, not combinatorial |
| 5 | Metrology Expert | **34** | No GD&T-to-process mapping, no thermal error model |
| 6 | Controller Firmware Expert | **58** | Good dialect awareness, missing G73 and macro coordination |
| 7 | Physics/Materials Scientist | **58** | Kienzle/Taylor solid, missing constitutive models and surface integrity |
| 8 | Aerospace Quality (AS9100) | **28** | No material traceability, no FAI generation, no process validation |
| 9 | Swiss/Mill-Turn Expert | **31** | No multi-channel programming, no guide bush logic, no Op2 pipeline |
| 10 | UX/Automation Architect | **22** | CRITICAL: Zero UI units, no input pipeline, no output comprehension |
| 11 | Threading Specialist | **28** | Missing thread class logic, infeed methods, thread measurement |
| 12 | Hard Turning Expert | **34** | No white layer control, no CBN edge prep, no grinding replacement logic |
| 13 | Shop Floor Integration | **28** | No DNC, no tool management, no ERP/MES, no revision control |
| 14 | Chip Control Specialist | **18** | CRITICAL: No chipbreaker operating windows, no chip evacuation model |
| 15 | Cost Optimization Expert | **31** | No true cost-per-part model, no speed-life tradeoff optimization |
| 16 | CAD/CAM Integration | **28** | CRITICAL: BlueprintVisionOCR exists but NOT wired into roadmap |
| 17 | Simulation/Verification | **22** | No material removal simulation, no digital twin, no toolpath 3D viz |
| 18 | Workholding Engineer | **32** | No soft jaw design, no deformation model, no Op1/Op2 flip logic |
| 19 | Medical Device (FDA) | **18** | No IQ/OQ/PQ, no material contamination control, no burr-free logic |
| 20 | Competitive Intelligence | **72** | Physics is the moat, but "photo to program" is the killer feature |

### AVERAGE SCORE: **37.4 / 100**
### VERDICT: The roadmap builds excellent CNC programming internals but fails the stated goal of zero-experience accessibility.

---

## TOP 10 CRITICAL FINDINGS (ranked by impact)

### 1. NO INPUT PIPELINE (UX, CAD/CAM agents: 22, 28)
The roadmap starts at "part description" but the user has a PHOTO or CAD FILE.
`BlueprintVisionOCREngine`, `AutoPrintToProgramBridgeEngine`, `DocumentInboxEngine`,
`PrintToGeometryEngine` ALL EXIST in the codebase but are NEVER REFERENCED in any
of the 62 units. This is the #1 gap because it makes the stated goal impossible.

**FIX: Add LATHE-PRO-MS-1 (pre-milestone): Input Pipeline Wiring**
- Wire BlueprintVisionOCR -> AutoPrintToProgramBridge -> LatheOrchestrationEngine
- Build guided UI for the 2-3 inputs needed (material confirmation, quantity, quality tier)
- Handle ambiguity: missing dimensions, unclear tolerances, unknown material callouts

### 2. NO USER INTERFACE (UX agent: 22)
62 units of backend, ZERO units of frontend. No upload page, no result display,
no toolpath visualization, no setup sheet viewer, no download button.

**FIX: Add LATHE-PRO-MS8: Zero-Experience User Interface**
- One-page "upload and go" interface
- 3D toolpath visualization with collision highlighting
- Plain-English program summary ("4 min 12 sec, 3 tools, $2.40/part")
- Photo-annotated setup instructions for non-machinists
- Traffic-light safety indicators

### 3. SAFETY GAPS ARE LIFE-THREATENING (Safety agent: 38)
- **No bar stock whip hazard gate** (BarStockVibrationEngine exists, NOT wired)
- **No door interlock / machine readiness pre-flight** (zero mention)
- **No emergency recovery** (power loss during threading, tool breakage, coolant failure)
- **Clamping force check is not per-operation** (boring pulls part OUT of chuck)
- **No mandatory prove-out mode** (ProveOutModeEngine exists, NOT wired)

**FIX: Add 5 safety stages to the 30-stage orchestrator:**
- BAR_STOCK_SAFETY (wire BarStockVibrationEngine)
- MACHINE_READINESS_PREFLIGHT (M00 preamble with operator checklist)
- EMERGENCY_RECOVERY_BLOCKS (threading recovery, broken tool probing)
- PER_OPERATION_CLAMPING_CHECK (force direction per operation type)
- MANDATORY_PROVE_OUT (first-ever program always in prove-out mode)

### 4. NO GD&T INTERPRETATION (Metrology agent: 34)
Zero mentions of concentricity, runout, perpendicularity, true position, cylindricity.
For aerospace/medical parts, GD&T drives EVERYTHING: setup strategy, operation order,
inspection method. RunoutCompensationEngine and ToleranceStackUpEngine EXIST but unwired.

**FIX: Add GDTToProcessMapperEngine to MS0 Stage 2 (before operation sequencing)**
- Map GD&T callouts -> machining constraints (single-setup requirements, datum strategy)
- Drive inspection method selection per feature
- Wire RunoutCompensationEngine and ToleranceStackUpEngine

### 5. NO MULTI-CHANNEL / SWISS PROGRAMMING (Swiss agent: 31)
MillTurnSwissPipelineEngine already has 5 sync code dialects, multi-channel Gantt,
guide bush deflection — referenced ONCE in passing. The roadmap builds a single-
channel orchestrator for what should be a multi-channel system.

**FIX: Expand MS4 or add dedicated Swiss milestone:**
- Multi-channel G-code output (Citizen $1/$2, Star M200, Mazak !C1/!C2)
- Guide bush vs non-GB mode switching with bar tolerance validation
- Op2 (back-working) toolpath generation with coordinate system flip
- Channel balancing optimizer (critical path analysis, overlap maximization)

### 6. NO CHIP CONTROL OPTIMIZATION (Chip agent: 18, Tooling agent: 52)
Chip form prediction exists but is NOT used to constrain speed/feed selection.
No chipbreaker operating window validation. No chip evacuation model. This is
THE bottleneck for unmanned/lights-out operation.

**FIX: Add ChipControlConstraintEngine to MS0 physics core:**
- Chipbreaker operating window diagrams (feed vs DOC per breaker code)
- Validate selected parameters fall within chipbreaker effective range
- High-pressure coolant requirements for deep bores and stringy materials
- ChipConveyorEngine already exists — wire it in

### 7. NO THERMAL COMPENSATION (Metrology: 34, CNC Programmer: 68)
ThermalGrowthCompensationEngine and InverseThermalCompensationEngine EXIST
but are never referenced. Thermal error is 40-70% of total dimensional error
on CNC lathes (Bryan 1990, Mayr 2012).

**FIX: Add thermal superposition to MS2 offset model:**
- delta_total = delta_wear + delta_thermal_spindle + delta_thermal_part + delta_geometric
- Wire ThermalGrowthCompensationEngine for spindle growth prediction
- Add machine warmup cycle generation (first-part-of-day strategy)
- Add ambient temperature correction using material CTE from MaterialRegistry

### 8. MISSING CRITICAL G-CODE CYCLES (CNC Programmer: 68, Controller: 58)
- **G73 pattern repeat** — required for all forgings/castings (30-40% of lathe work)
- **Multi-op support** — no Op1/Op2 flip, no soft jaw boring program, no Z-reference transfer
- **Work coordinate system** — no G54/G55 management, no Z-zero establishment logic
- **Specialty ops** — no knurling, polygon turning, eccentric turning, form tools, burnishing

**FIX: Add these to MS0 G-code generation stage + MS3 part families**

### 9. NO PRODUCTION BATCH INTELLIGENCE (Process: 58, Cost: 31)
The roadmap optimizes single parts. Production requires:
- Bar remnant optimization (BarStockOptimizationEngine needed)
- Accurate non-cutting time modeling (turret index, spindle accel, chuck clamp)
- Setup time optimization (jaw boring, part family grouping, presetter data)
- OEE tracking (OEECalculatorEngine exists, NOT wired)

**FIX: Add 3-4 units to MS7 or new MS for production optimization**

### 10. NO INSPECTION PLAN GENERATION (Metrology: 34, Aerospace: 28)
System predicts Cpk but generates no inspection plan. FirstArticleInspectionPipelineEngine,
MetrologyUncertaintyEngine, CMMPathPlanningEngine, GaugingEngine ALL EXIST unwired.

**FIX: Add TurningInspectionPlanEngine to MS2:**
- What to measure, with what gage, at what frequency, acceptance criteria
- FAI plan per AS9102 (mandatory for aerospace)
- Gage R&R adequacy check per AIAG MSA 4th edition

---

## EXISTING ENGINES THAT MUST BE WIRED (currently orphaned)

These engines ALREADY EXIST in the codebase and are NEVER REFERENCED in the roadmap.
Wiring them closes the majority of gaps identified by the 20 agents:

| Engine | Gap It Closes | Agent(s) |
|--------|--------------|----------|
| BlueprintVisionOCREngine | Photo-to-features input pipeline | UX, CAD/CAM |
| AutoPrintToProgramBridgeEngine | CAD file import automation | UX, CAD/CAM |
| PrintToGeometryEngine | 2D print -> 3D geometry | CAD/CAM |
| ProveOutModeEngine | Mandatory first-article prove-out | Safety, CNC |
| BarStockVibrationEngine | Bar whip hazard prevention | Safety |
| ThermalGrowthCompensationEngine | Spindle thermal error compensation | Metrology, CNC |
| InverseThermalCompensationEngine | Real-time thermal correction | Metrology |
| RunoutCompensationEngine | GD&T runout-driven machining | Metrology |
| ToleranceStackUpEngine | Multi-feature tolerance analysis | Metrology |
| FirstArticleInspectionPipelineEngine | AS9102 FAI generation | Aerospace, Metrology |
| MetrologyUncertaintyEngine | Gage R&R and measurement uncertainty | Metrology |
| CMMPathPlanningEngine | CMM program generation | Metrology |
| GaugingEngine | Gage selection per feature | Metrology |
| OEECalculatorEngine | Production efficiency tracking | Process |
| ChipConveyorEngine | Chip evacuation requirements | Chip Control |
| SpindleLoadMonitorEngine | Real-time overload detection | Safety |
| MillTurnSwissPipelineEngine (full) | Multi-channel, guide bush, sync codes | Swiss |

**COUNT: 17 engines already built, sitting idle, that would raise the average score by 15-20 points if wired.**

---

## RECOMMENDED ROADMAP REVISION

### Add 3 new milestones, expand 2 existing:

| New/Changed | Title | Units | Impact |
|-------------|-------|-------|--------|
| **NEW: LATHE-PRO-MS-1** | Input Pipeline (Photo/CAD -> Features) | 6 | +25 pts UX |
| **EXPAND: MS0** | Add 5 safety stages + G73 + WCS + multi-op | +8 | +15 pts Safety |
| **EXPAND: MS2** | Add thermal + GD&T + inspection plan | +6 | +20 pts Metrology |
| **NEW: LATHE-PRO-MS8** | Zero-Experience UI & Output Visualization | 8 | +30 pts UX |
| **NEW: LATHE-PRO-MS9** | Swiss/Mill-Turn Multi-Channel Extension | 8 | +20 pts Swiss |

### Projected score improvement:
- Current average: **36.2 / 100**
- After wiring 17 existing engines: **~52 / 100**
- After adding 3 new milestones + expanding 2: **~72 / 100**
- After chipbreaker windows + production batch + cost model: **~82 / 100**

### Priority order for maximum impact:
1. Wire the 17 orphaned engines (biggest bang, least effort)
2. Add MS-1 (input pipeline) — without this, the product doesn't work AT ALL
3. Add safety stages to MS0 — without this, people get hurt
4. Add MS8 (UI) — without this, zero-experience users can't interact
5. Expand MS2 (thermal + GD&T + inspection) — without this, parts are wrong
6. Add MS9 (Swiss) — without this, 40% of lathe work is excluded

---

## AGENT CONSENSUS: WHAT MAKES PRISM WIN

Despite the low average score, ALL 20 agents agreed on these differentiators:

1. **Physics-first approach** (Kienzle/Taylor/thermal/chatter) is a genuine moat
2. **Per-block variable speed/feed** is something NO competitor does well
3. **95,608-tool catalog + 910 machines + 2,957 materials** is an unmatched data asset
4. **Photo-to-program** would be an industry-first killer feature IF built
5. **The engine infrastructure already exists** — it's a wiring problem, not a physics problem

The path to "master-level machining outputs" is not building more engines.
It's wiring the 1,364 engines that already exist into a seamless pipeline
with a UI that a non-machinist can actually use.
