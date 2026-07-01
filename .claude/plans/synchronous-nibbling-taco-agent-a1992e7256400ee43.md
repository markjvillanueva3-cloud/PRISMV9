# F360-FULL Probing & In-Process Measurement — Specialist Assessment

## Context
- Roadmap: `H:\prism\mcp-server\data\docs\roadmap\FUSION360-FULL-CAPABILITIES-ROADMAP.md`
- 8 milestones (MS1–MS8), 36 units, 17 sessions
- PRISM has 6+ probing engines, all wired to camDispatcher — but ZERO are referenced in F360-FULL milestones
- This assessment scores 6 probing dimensions and quantifies first-part-right impact

---

## CONFIRMED PRISM ENGINE INVENTORY (what exists)

| Engine | Location | Wired To | Capabilities |
|--------|----------|----------|-------------|
| ProbeRoutineGeneratorEngine | src/engines/ | camDispatcher (probe_wcs_setup, probe_inspection, probe_tool_measure, probe_first_article) | WCS setup, part inspection with tolerance/SPC, tool measure, FAI; 6 controllers (Fanuc/Haas/Siemens/Heidenhain/Mazak/Okuma) |
| ProbeRoutineEngine | src/engines/ | calcDispatcher (3 actions) | Renishaw G65 P98xx macros per controller |
| ProbingCycleEngine | src/engines/ | camDispatcher (probe_generate, production_batch_probing) | bore/boss/web/pocket/surface/corner/angle/tool_set; 4 controller dialects |
| ProbingProgramEngine | src/engines/ | camDispatcher (probe_wcs_setup_gen, probe_in_process_gen, probe_tool_measure_gen, probe_first_article_gen, probe_auto_comp_gen) | 4 controllers; auto-comp action EXISTS |
| UnifiedProbingDialectEngine | src/engines/ | camDispatcher (5 actions: ppg_probe_wcs, ppg_probe_inspect, ppg_probe_tool, ppg_probe_check) | Unified dialect across all controllers |
| CMMPathPlanningEngine | src/engines/ | qualityDispatcher (partial) | TSP path plan, ISO GUM uncertainty, Chebyshev sampling, 3-2-1 datum, ISO 10360 acceptance |
| MetrologyUncertaintyEngine | src/engines/ | qualityDispatcher | GUM uncertainty budgets |
| SPCProcessCapabilityEngine | src/engines/ | qualityDispatcher (partially wired) | Cp/Cpk/Pp/Ppk with Nelson rules |

**Critical finding:** ProbeRoutineGeneratorEngine.generatePartInspection() has `measure_every_n_parts`, `action_on_fail: "alarm" | "compensate" | "skip"`, `spc_output`, and `compensateOffset()` (G10 L2 closed-loop). ProbeToolMeasureConfig has broken-tool detection (`IF [#182 LT 1.0] GOTO 9999`). These capabilities EXIST in the engine layer. None are surfaced in F360-FULL.

---

## SCORING — 6 DIMENSIONS

### 1. SETUP PROBING — Score: 5/100

**What the roadmap has:**
- MS5/U-FSIL01: `GET /cam/setup/full` reads WCS origin from Fusion's model — but this is READING Fusion's existing WCS, not generating a probing routine to establish WCS from the physical part on the machine.
- MS7/U-FITG04: Multi-setup datum chain planning (Monte Carlo tolerance stack, G54-G59 assignment) — design-time calculation only, no on-machine probing generation.

**What is missing:**
- No milestone generates a pre-cycle WCS probing subroutine (corner probe, bore probe, 3-point plane probe) as a block inserted before the first cutting move.
- No surface verification probe (is raw stock face within tolerance before facing?).
- No datum pickup that writes measured offsets back into G54/G55 using G10 L2 (Fanuc) or $P_UIFR (Siemens) — the ProbeRoutineGeneratorEngine.generateWCSSetup() does exactly this but is never called from any F360-FULL unit.
- Fusion's WCS is set by the programmer at their desk. The part on the machine may be positioned differently due to fixture variation, thermal growth, or stock variation. Without on-machine datum pickup, G54 origin is an assumption, not a measurement.

**First-part-right impact:**
A machinist who machines to a G54 set from a CAD model rather than probed from the actual clamped part will see consistent X/Y/Z offset errors across every part. For ±0.025mm tolerances (tight machined features), a 0.1mm fixture seating variation = 100% rejection rate on the first op. Setup probing is the single highest-leverage quality action before any cutting begins.

---

### 2. IN-PROCESS GAUGING — Score: 3/100

**What the roadmap has:**
- MS5/U-FSIL02: Physics analysis per operation (force ratio, deflection, thermal, Ra, stability) — all predicted pre-cut, nothing measured in-cycle.
- MS6/U-FBLK01–04: Per-block variable S/F — still pre-cut physics, no mid-program measurement loop.

**What is missing:**
- No milestone inserts mid-program probing blocks for critical features. The ProbeRoutineGeneratorEngine.generatePartInspection() with `action_on_fail: "compensate"` (closed-loop offset via G10 L2) exists and would do exactly this.
- No concept of a "critical feature threshold" (e.g., when tolerance < 0.025mm, auto-inject an inspection block before the finishing pass).
- No mid-program branching: measure bore → if undersize, re-enter finishing pass; if oversize, alarm out.
- No "measure before finish" strategy: rough → probe remaining stock → adaptive finish to measured value.

**First-part-right impact:**
In-process gauging catches tool wear, thermal drift, and fixture shift before they produce a scrap part. Without it, the first indication of a problem is the post-process CMM measurement — which is too late to save the part. For tight-tolerance bores (H7/H6 fits, ±0.010mm), in-process gauging reduces scrap from ~8% to ~0.5% per industry data. The F360-FULL roadmap produces programs that are completely blind to what is actually happening on the machine mid-cycle.

---

### 3. TOOL LENGTH / DIAMETER MEASUREMENT — Score: 8/100

**What the roadmap has:**
- MS4/U-FTCL01: Extended tool geometry export — this exports geometry FROM PRISM's database TO Fusion for simulation. It is database-to-Fusion metadata transfer, not on-machine measurement.
- MS4/U-FTCL02: Holder geometry export — same, metadata only.

**What is missing:**
- No milestone generates a tool measurement subroutine (G65 P9023 Fanuc, CYCLE982 Siemens, TCH PROBE 480/481 Heidenhain) to be called after each tool change.
- ProbeRoutineGeneratorEngine.generateToolMeasurement() supports contact probe, laser tool setter (M26/G65 P8150 Haas), and radius measurement — none referenced in F360-FULL.
- No post-tool-change length/diameter verification block in the G-code output pipeline (MS5/S9 post-processor wiring, MS6/U-FBLK04 final pipeline — neither inserts tool measurement calls).
- The database gauge length (from U-FTCL01) may differ from the physical tool by 0.05–2mm due to pull-out, collet wear, or wrong tool loaded. Without on-machine measurement, the first cut depth is wrong.

**Why 8/100 not 0:** The tool geometry export (MS4) tangentially supports collision detection, which is tool-length-aware. But this is pre-CAM geometry, not post-tool-change verification.

**First-part-right impact:**
A 1mm tool length offset error = 1mm Z error on the first surface. For face milling or Z-depth features, this causes: overcut (scrap), undercut (requires re-machining, secondary operations), or collision if clearance is tight. Industry data: ~23% of first-part failures trace to incorrect tool offset. On-machine tool measurement after tool change is standard practice in any production environment and is completely absent from F360-FULL.

---

### 4. CLOSED-LOOP OFFSET CORRECTION — Score: 2/100

**What the roadmap has:**
- MS5/U-FSIL05 (learning engine): Stores machinist overrides to S/F parameters via Bayesian prior updating — this is human-in-loop learning, not automatic offset correction.
- MS5/U-FSIL04 (preference detection): Detects parameter changes after PRISM injection — again human behavior capture, not dimensional offset correction.

**What is missing:**
- No milestone implements probe result → G10 L2 (or equivalent) → next-part offset update loop.
- ProbeRoutineGeneratorEngine has `compensateOffset()` generating `G10 L2 P${n} ${axis}[${v}-${nom.toFixed(4)}]` (Fanuc) and `$P_UIFR[1,${axis},TR]=${v}-${nom.toFixed(4)}` (Siemens) — automatic offset compensation exists in the engine, never referenced in F360-FULL.
- No dimension-to-offset mapping: measured bore diameter → compute wear offset → update D-register (Fanuc).
- No part-to-part offset drift management: as tool wears, dimensions drift; probe → compensate → stable dimension across production run.
- The "learning engine" (U-FSIL05) learns HUMAN preferences, not dimensional feedback from the machine.

**First-part-right impact:**
Closed-loop correction is what separates a production-capable program from a prototype-quality program. Without it, dimensional drift from tool wear accumulates unchecked until the machinist manually measures and adjusts. In a 50-part run with 0.002mm/part wear drift and ±0.020mm tolerance, offset correction is required after every ~10 parts. Without automated correction: 100% manual intervention required, or parts drift out of tolerance. With closed-loop: unattended production is possible. F360-FULL claims "Ultimate tier: autonomous CNC programming" — this is impossible without closed-loop offset correction.

---

### 5. BROKEN TOOL DETECTION — Score: 4/100

**What the roadmap has:**
- MS4/U-FTCL04: Collision pre-check detects geometric collisions before the toolpath runs — this is pre-run simulation, not post-operation physical tool verification.
- MS5/U-FSIL02: Tool life estimate (Taylor hours remaining) — a prediction, not a measurement.

**What is missing:**
- No milestone generates a post-operation tool check subroutine. ProbeRoutineGeneratorEngine.generateToolMeasurement() includes `IF [#182 LT 1.0] GOTO 9999 (BROKEN TOOL - T${toolNum})` for Fanuc/Haas/Mazak — exists in the engine, not in F360-FULL.
- No "measure after drill cycle" block: drills break without warning; detecting a broken drill before the next operation (which may be boring or threading into the drill hole) prevents catastrophic crashes.
- No integration with laser tool setter M-codes (M26/M27 Haas pattern) in the post-processor output (MS5/S9 or MS6/U-FBLK04).
- The Taylor tool life estimate (MS5/U-FSIL02) predicts WHEN a tool SHOULD wear out — it does not detect THAT a tool HAS broken.

**Why 4/100 not 0:** The Taylor life prediction in U-FSIL02 at least gives a rough guard that could theoretically trigger a "check this tool" prompt, though it doesn't generate any G-code verification.

**First-part-right impact:**
A broken drill in a 5-operation program: operation 2 drills and breaks the drill (silently if no detection), operations 3-5 (bore, ream, thread) then try to enter a partially drilled hole — crash, destroyed part, possible machine damage. Broken tool detection (15-second laser scan or stylus touch per tool per operation) is mandatory for unattended operation and is completely absent from F360-FULL. The "Ultimate tier: lights-out" claim in the broader PRISM roadmap is impossible without it.

---

### 6. STATISTICAL MEASUREMENT (MULTI-PART SAMPLING, Cpk TRACKING) — Score: 6/100

**What the roadmap has:**
- MS8/U-FINT01: Test matrix (216 cases, S/F within ±10% of reference tools) — this is software validation testing, not production SPC from probe data.
- MS8/U-FINT02: Golden comparison validation (Cpk mentioned in CAMX roadmap context, not in F360-FULL directly) — predicted Cpk from physics models, not measured Cpk from actual parts.
- The broader CAMX roadmap has SPCProcessCapabilityEngine, SPCChartingEngine, NelsonSPCRulesEngine (all exist, partially wired to qualityDispatcher).

**What is missing:**
- No F360-FULL milestone defines `measure_every_n_parts` sampling strategy. ProbeRoutineGeneratorEngine.generatePartInspection() has this parameter — unused in F360-FULL.
- No pipeline from: probe DPRNT output → parse measured values → feed to SPCProcessCapabilityEngine → compute Cpk → alarm if Cpk < 1.33 → trigger offset correction.
- No control chart update from probe feedback (X-bar/R from actual measured parts, not predicted Ra).
- No SPC output integration in the post-processor pipeline (MS5/S9). ProbeRoutineGeneratorEngine.generatePartInspection() has `spc_output: true` generating `DPRNT[label*var[44]]` blocks — these data streams are never parsed or fed to an SPC engine in F360-FULL.
- No production sampling schedule in F360-FULL (sample 1st, 5th, 10th, 25th, then every 25th part) — standard automotive/aerospace practice.

**Why 6/100 not 0:** The SPC engines exist and are partially wired elsewhere in PRISM. The infrastructure to receive probe data exists. But F360-FULL generates no probe data stream to feed these engines, so in the context of F360-FULL, the capability is 0/100 at the output level. Partial credit for the infrastructure being available.

**First-part-right impact:**
Statistical measurement is the feedback loop that tells a shop whether their process is capable of consistently making good parts BEFORE committing to a production run. Without Cpk tracking from actual probe data: you only know the process is bad after scrap accumulates. With Cpk from probe data on the first 5 parts: you can halt production, adjust offsets, and confirm capability before running 500 more. For aerospace (Cpk ≥ 1.67 required) and automotive (Cpk ≥ 1.33), this is a contractual requirement, not optional. F360-FULL has no path to produce this data.

---

## COMPOSITE SCORES

| Dimension | Score | Primary Gap |
|-----------|-------|------------|
| 1. Setup Probing | 5/100 | No pre-cycle datum pickup subroutine in any F360-FULL unit |
| 2. In-Process Gauging | 3/100 | No mid-program feature check, no measure-before-finish |
| 3. Tool Length/Diameter Measurement | 8/100 | MS4 exports DB geometry only; no on-machine verification |
| 4. Closed-Loop Offset Correction | 2/100 | Learning engine is human-preference, not dimensional feedback |
| 5. Broken Tool Detection | 4/100 | Taylor life prediction only; no G-code check block generation |
| 6. Statistical Measurement / Cpk | 6/100 | SPC engines exist; no probe data stream from F360-FULL to feed them |
| **Overall** | **5/100** | **Zero probing coverage in all 8 milestones, 36 units** |

---

## ROOT CAUSE

The F360-FULL roadmap was designed from the perspective of CAM parameter optimization (what goes INTO the machine program) but not measurement (what the machine REPORTS BACK). This is the pre-CNC era mental model: program → machine → inspect → adjust. Modern production practice is: probe → program → machine → probe in-cycle → closed-loop adjust → machine → probe → SPC → approve run.

PRISM has all the engine capability for the second model. The F360-FULL roadmap implements the first.

---

## RECOMMENDED REMEDIATION

### Immediate Fixes (add to existing milestones, no new milestones needed)

**MS5/SESSION S9 (Post-Processor Wiring) — add to U-FSIL03:**
- Insert pre-cycle WCS probing block (ProbeRoutineGeneratorEngine.generateWCSSetup()) before first cutting move
- Insert tool measurement block (generateToolMeasurement()) after each tool change in post output
- Insert broken-tool check (IF #182 LT 1.0 GOTO 9999) per tool in post pipeline

**MS6/U-FBLK04 (Final Pipeline):**
- When tolerance < 0.025mm on any feature: auto-inject in-process inspection block (generatePartInspection() with action_on_fail: "compensate")
- Wire SPC output (DPRNT blocks) from probe inspection to a parseable data stream

### New Unit Required (add to MS5 or MS7)

**U-FPRB01: Closed-Loop Probe Integration (~400 LOC)**
- Wire generatePartInspection() closed-loop path into post-processor output
- Map measured dimension deviation → G10 L2 offset update (per controller dialect)
- Sampling schedule: configurable (1st part full, then every N)
- Feed DPRNT output → SPCProcessCapabilityEngine → Cpk gate (alarm if Cpk < 1.33)
- Broken tool: post-operation tool check, alarm + stop if length deviation > 0.5mm

### New Milestone Required (post-MS8)

**F360-FULL-MS9: In-Process Measurement + Closed-Loop Quality (6 units, 2 sessions)**
- U-FPRB01: Setup Probing Integration (WCS from probe, stock verification)
- U-FPRB02: In-Process Gauging (mid-program feature check, measure-before-finish)
- U-FPRB03: Tool Measurement After Tool Change (laser/contact, all 6 controller dialects)
- U-FPRB04: Closed-Loop Offset Correction (probe → G10/UIFR → next pass/part)
- U-FPRB05: Broken Tool Detection (post-operation check, M19 orient + P9023/CYCLE982)
- U-FPRB06: Production SPC Pipeline (sampling schedule, Cpk from probe data, X-bar/R chart)

**Existing engines to wire (zero new engine code required for MS9):**
- ProbeRoutineGeneratorEngine (all 4 methods)
- ProbeRoutineEngine
- ProbingCycleEngine
- ProbingProgramEngine (probe_auto_comp_gen action already exists in camDispatcher)
- UnifiedProbingDialectEngine
- SPCProcessCapabilityEngine
- NelsonSPCRulesEngine
- SPCChartingEngine

---

## KEY FILES REFERENCED
- Roadmap: `H:\prism\mcp-server\data\docs\roadmap\FUSION360-FULL-CAPABILITIES-ROADMAP.md`
- Primary probing engine: `H:\prism\mcp-server\src\engines\ProbeRoutineGeneratorEngine.ts`
  - `generateWCSSetup()` — Setup probing, WCS establishment (lines 359–426)
  - `generatePartInspection()` — In-process gauging + closed-loop compensateOffset (lines 431–526)
  - `generateToolMeasurement()` — Tool length/diameter + broken tool (lines 531–587)
  - `generateFirstArticle()` — FAI with DPRNT SPC output (lines 592–678)
- camDispatcher wiring: `H:\prism\mcp-server\src\tools\dispatchers\camDispatcher.ts` (lines 789–878, 1776–1792, 2885–2910)
- ProbeRoutineEngine (Renishaw macros): `H:\prism\mcp-server\src\engines\ProbeRoutineEngine.ts`
- ProbingCycleEngine: `H:\prism\mcp-server\src\engines\ProbingCycleEngine.ts`
- ProbingProgramEngine: `H:\prism\mcp-server\src\engines\ProbingProgramEngine.ts`
- UnifiedProbingDialectEngine: `H:\prism\mcp-server\src\engines\UnifiedProbingDialectEngine.ts`
- SPC engine: `H:\prism\mcp-server\src\engines\SPCProcessCapabilityEngine.ts`
- CAMX Session 3-EXT-PROBE (reference): `H:\prism\CAMX-RESTRUCTURED-ROADMAP-v24.md` line 5027
