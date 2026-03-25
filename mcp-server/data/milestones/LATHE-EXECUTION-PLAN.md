# LATHE Execution Plan — Full Command Sequence

## Instructions
Run each command in order. `/compact quick` at marked compaction points.
Each `/smart` sets optimal model/effort. `/forge-triple` for engine creation.
Check tests after each milestone with the test commands shown.

---

## PHASE 1: SAFETY FIRST (MS0 + MS0.5)

### LATHE-MS0: Collision Avoidance & Tool Reach (13 units)

```
/smart Wire CollisionEngine + AccessibilityAnalysisEngine + CollisionPreventionEngine into TurningPrintToProgramEngine. Add lathe-specific checks: turret rotation swept volume, tool holder vs chuck jaw, rapid traverse safe zones. Read ALL 3 collision engines fully before editing.
```

```
/smart Build LatheCollisionZoneEngine — calculate turret rotation envelope (longest tool × turret radius), check every rapid G00 move clears part OD by tool_protrusion + 10mm safety margin, validate Z rapids don't plunge into part face
```

```
/smart Add boring bar reach validation to TurningPrintToProgramEngine — when bore_rough op is planned: check bore_depth vs bar_shank_length. Auto-select bar material: steel if L/D≤4, carbide if L/D≤6, dampened if L/D≤10. If no bar can reach: ERROR with recommendation
```

```
/smart Add grooving/parting overhang check — max extension = blade_width × 8 for grooving, blade_width × 6 for parting in tool steel. Auto-warn if exceeded, suggest wider blade. Check EVERY groove and cutoff operation
```

```
/smart Add live tool holder collision check — holder protrusion + tool stickout vs tailstock quill position. If tailstock engaged during live tooling: auto-insert tailstock retract before live ops, re-engage after. Safety interlock
```

```
/smart Add turret index collision detection — before every tool change: calculate longest tool in turret swing arc during rotation. If swing radius > clearance to part OD + chuck jaw: auto-insert safe X retract before index. CRITICAL SAFETY
```

```
/smart Calculate safe retract positions for every operation — before Z rapid: X must clear part_OD/2 + tool_holder_length + 5mm. Before turret index: X must clear longest_tool_swing_radius. Generate G28 U0 intermediate when needed. Never rapid in X and Z simultaneously near part
```

```
/smart Add machine swing validation — if part_OD > machine_max_swing_diameter: reject with ERROR. If part_OD > 80% of swing: WARNING about reduced clearance. Check against LATHE_CAPABILITIES database in KB
```

```
/smart Add minimum chip thickness check — if feed × sin(approach_angle) < edge_radius × 0.3: tool will rub not cut. Auto-increase feed to minimum cutting threshold or warn user. Critical for finish passes with small nose radius
```

```
/compact quick
```

```
/smart Build boring taper compensation — calculate boring bar deflection at each Z depth using delta = F×L³/(3×E×I). Program counter-taper: if bar deflects 0.005mm outward at bottom, bore 0.005mm SMALLER at bottom. Net result: straight bore. User specifically requested this feature
```

```
/smart Build boring bar springback compensation — when bar retracts at bore bottom, it springs back to neutral. Bore will be undersized by deflection amount. Program final bore pass 0.005-0.02mm LARGER to compensate. Auto-calculate from bar stiffness × cutting force
```

```
/smart Add G71 Type I vs Type II auto-detection — scan profile_points X values. If X is monotonically increasing (OD) or decreasing (ID) throughout: Type I. If X reverses direction at any point: MUST use Type II. Wrong type on Fanuc = alarm or crash. Add to safety checks
```

```
/smart Write 12 collision/safety test scenarios: (1) boring bar too short, (2) turret rapid hits part, (3) grooving overextended, (4) live tool hits tailstock, (5) chuck jaw hits tool during index, (6) part exceeds swing, (7) drill too long for headstock, (8) minimum chip thickness violation, (9) bore taper compensation verification, (10) springback compensation check, (11) G71 Type I/II detection on non-monotonic profile, (12) safe retract position calculation
```

```
/compact quick
```

**Test checkpoint:**
```
npx tsx tests/okuma-test-suite.ts && npx tsx tests/okuma-cold-heading-die-suite.ts
```

---

### LATHE-MS0.5: Dialect Reconciliation — Single G-Code Path (5 units)

```
/smart ARCHITECTURAL FIX: Route ALL TurningPrintToProgramEngine G-code output through LathePostProcessorEngine. Remove inline G-code generation (430+ lines). Use post engine's dialect formatters for: safe start, tool change, CSS, TNC, G71/G70/G75/G76, rapid, feed, arc. This is the MOST IMPORTANT unit — fixes the dual-path bug where controller parameter is ignored
```

```
/smart Add Siemens 840D turning dialect to LathePostProcessorEngine — G18 ZX plane (MUST set), LIMS= speed clamp (not G50), CYCLE95 stock removal rough, CYCLE97 thread cutting, SUPA suppress approach for safe retract, GOTOF/GOTOB branching, R-parameters for variables
```

```
/smart Add DMG MORI CELOS dialect to LathePostProcessorEngine — Siemens 840D base + CELOS-specific: ShopTurn cycle codes, CELOS M-codes for coolant/tool management, tool magazine M06 with position
```

```
/smart Build automated dialect validation test — same P6 (H13 die) input, generate program for ALL 6 controllers (Fanuc/Haas/Okuma/Mazak/Siemens/DMG). Verify: Okuma has G15 H0 not G54, M50 not M08, T0001 not T0101. Haas has D word in G71. Siemens has LIMS= not G50. Each dialect must produce DIFFERENT output
```

```
/smart Verify controller parameter actually changes output — regression test: assert program with controller='okuma' contains 'G15 H0' AND does NOT contain 'G54'. Assert controller='haas' contains D word in G71 line. Assert controller='siemens' contains 'LIMS=' AND does NOT contain 'G50'
```

```
/compact quick
```

**Test checkpoint:**
```
npx tsx tests/okuma-test-suite.ts && npx tsx tests/okuma-cold-heading-die-suite.ts
```

---

## PHASE 2: PHYSICS & PARAMETRIC (MS7 + MS9, parallel)

### LATHE-MS7: Physics & Science Hardening (13 units)

```
/smart Wire analyzeTurningChatter() from MachiningKnowledgeBaseEngine into TurningPrintToProgramEngine. Before finalizing RPM: check if operating RPM is near a critical chatter lobe. If yes: shift RPM ±15% to stable zone. Add chatter_risk to program output warnings
```

```
/smart Wire analyzeHardTurning() from KB into pipeline. When ISO group = H: auto-calculate white layer depth prediction, residual stress type (compressive vs tensile), achievable Ra with CBN. Add to setup sheet. Warn if parameters will cause tensile stress (bad for fatigue)
```

```
/smart Wire ThreadingPipelineEngine constant chip area pass schedule into G76 output. Replace uniform depth passes with √n progression: first pass deepest, subsequent shallower. This matches Sandvik methodology and produces better thread finish
```

```
/smart Wire DrillBreakthroughForceEngine for drill thrust force validation. When drilling: calculate thrust Ff = 0.5 × kc1.1 × (D/2) × f^(1-mc) × sin(point_angle/2). If tailstock engaged: verify Ff < tailstock_force. If not: warn about workpiece push-off risk
```

```
/smart Add parting force 1.25× multiplier to power check during cutoff operations. Parting generates higher forces than straight turning at same DOC. Apply correction before power limit check to prevent stalling during cutoff
```

```
/smart Calculate actual workpiece beam deflection at tool point. Cantilever: delta = F×L³/(3EI) for chuck-only. Simply supported: delta = F×a²×b²/(3EI×L) for tailstock. If deflection > tolerance/2: auto-recommend tailstock or steady rest. Show actual deflection value in warnings
```

```
/compact quick
```

```
/smart Wire AdvancedWearPhysicsEngine for tool life prediction. Predict flank wear VB progression over time. Auto-recommend tool change interval in minutes and parts. Calculate sister tool switching point. Add to setup sheet
```

```
/smart Add thermal expansion compensation — for tight tolerance parts (<0.01mm): calculate workpiece thermal growth from cutting heat using CTE × ΔT × length. Recommend: (1) coolant soak time before final pass, (2) offset compensation value, (3) let part cool to 20°C before measuring
```

```
/smart Add chip breaking feed oscillation for ISO M and P materials — when material produces continuous chips and operation is boring or deep OD turning: option to insert momentary 150% feed spike every 5-10 revolutions. Generates short chips that clear the bore
```

```
/smart Add decreasing peck depth for deep drilling — first peck = 3×D, second = 2.5×D, third = 2×D, subsequent = 1.5×D (decreasing 20% per peck). As hole gets deeper, chip evacuation gets harder → smaller pecks needed. Override G83 uniform Q with calculated schedule
```

```
/smart Add thread spring passes to G76 output — after final cutting pass: add 1-2 zero-infeed passes at final thread depth. The G76 P-word first two digits set spring pass count. For fine threads (pitch < 1mm): 1 spring pass. For coarse (> 2mm): 2 spring passes
```

```
/smart Add bore bottom dwell — auto-insert G04 dwell at blind bore bottom before retract. Dwell time by material: P=0.3s, M=0.5s, K=0.2s, N=0.1s, S=0.8s, H=0.5s. Ensures full revolution cleanup at bore floor for consistent depth and finish
```

```
/compact quick
```

### LATHE-MS9: Parametric & Macro Programming Engine (8 units)

```
/smart /forge-triple Build ParametricLatheProgramEngine — generates programs with #variables instead of hardcoded coordinates. Input: part family definition (base dims + variable dims). Output: program where #100=OD, #101=LENGTH, #102=BORE_DIA, all G-code uses #variables. One program runs entire part family by changing variables at control
```

```
/smart Add Fanuc Custom Macro B output to ParametricLatheProgramEngine — generate IF [#condition] GOTO N-label, WHILE [#counter GT 0] DO1 ... END1, M98 P-subprogram calls, G65 P-macro with A/B/C/D arguments for parametric subroutines
```

```
/smart Add Okuma NVAR output — translate #variables to NVAR(n) syntax. IF condition → IF ... THEN ... ENDIF (Okuma syntax). Persistent variables NVAR(1)-NVAR(200) for tool counters and part counters across power cycles
```

```
/smart Add Haas macro output — #100-#199 local scope, #500-#999 persistent (survive power-off), #1000+ system variables. M97 local subprogram call (Haas-specific). #3028 spindle load read for adaptive macros
```

```
/smart Build production macro template — complete macro with: part counter (#500 increment), inspection stop every N parts (IF [#500 MOD 25 EQ 0] M00), sister tool auto-switch at tool life limit, bar feeder M99 loop, tool wear auto-compensation via G10 L12
```

```
/smart Build adaptive feed macro — reads #3028 spindle load real-time. IF load > 80%: reduce feed override to 70%. IF load > 60% and ≤ 80%: feed 90%. IF load ≤ 60%: feed 100%. Embed in roughing operations. Only for machines WITH macro capability
```

```
/smart Build multi-fixture loop macro — G54→G55→G56→G57 cycling with same M98 subprogram. For multi-vise or multi-station chucking. #variable selects work offset, WHILE loop iterates through offsets
```

```
/smart Write tests: parametric program for H13 die family in 3 sizes (1.5", 2.5", 4" OD). Verify all 3 produce valid programs. Verify #variable substitution is correct. Verify macro syntax matches controller dialect
```

```
/compact quick
```

---

## PHASE 3: MACHINES + TOOLING + WORKHOLDING (MS1 + MS2 + MS3, parallel)

### LATHE-MS1: Multi-Machine Capability (7 units)

```
/smart Build machine capability database — structured data for 20+ lathe models: Okuma Genos L2000/L3000/L3000-MY, Okuma Multus B200/B300/U3000, Haas ST-10/ST-20/ST-30/DS-30Y, Mazak QTN-100/200/250MY, Integrex i-200, DMG NLX 1500/2000/2500, CTX alpha/beta. For each: axes, power, RPM, bar cap, swing, turret stations, live tool specs, sub-spindle, controller version
```

```
/smart Build feature-to-capability matching — given part features: if whistle_notch → needs C-axis + live tooling. If cross_drill → needs C-axis. If OD_pocket → needs Y-axis. If back_face_features → needs sub-spindle. If part_OD > bar_cap → needs chuck loading. Auto-filter incompatible machines from list
```

```
/smart Build machine auto-selector — rank compatible machines by: (1) all features achievable, (2) lowest cost per part (machine hourly rate × cycle time), (3) best tolerance capability, (4) availability. Return top 3 recommendations with reasoning
```

```
/smart Add Swiss-type support — Citizen Cincom L20/L32, Star SR-20/SR-32 dialects. Guide bushing deflection check, gang slide zero-index optimization, B-axis positioning codes, multi-channel sync ($1/$2). Wire MillTurnSwissPipelineEngine configs
```

```
/smart Add VTL support — vertical Z-axis convention (Z+ is UP), faceplate workholding, max swing > 1000mm, RPM < 400 typically, high spindle power (50-100kW). G50 Smax at 200-400 RPM. Maximize feed/rev to compensate low RPM
```

```
/smart Add twin turret simultaneous cutting — wire MillTurnSwissPipelineEngine multi-channel: upper turret OD ops + lower turret ID ops SIMULTANEOUSLY. Gantt-style overlap optimization. Channel sync codes by controller. Collision zone check between turrets
```

```
/smart Tests: same H13 3" die on all 6 machines in test matrix. Verify: dialect correct per machine, capabilities filtered (no live tool ops on 2-axis), cycle time varies by machine power/RPM
```

```
/compact quick
```

### LATHE-MS2: Tooling Variability (10 units)

```
/smart Wire sandvik-tool-catalog.ts into TurningPrintToProgramEngine.selectInsert() — query catalog by: ISO group match, operation type (rough/finish/groove/thread), nose radius range, approach angle compatibility. Return actual Sandvik part number + geometry. Fall back to generic if no match
```

```
/smart Build user tool inventory input — accept turret_layout parameter: array of {station, tool_id, insert_type, holder_type, nose_radius_mm, approach_angle_deg, overhang_mm}. Engine selects ONLY from available tools. If required tool missing: warn + suggest what to add
```

```
/smart Wire KB selectInsertGeometry() into pipeline — given feature (needs shoulder access? back-turning? interrupted cut? ISO S superalloy?): recommend optimal insert shape with reasoning. Show user: "CNMG 80° recommended for OD rough — strongest shape with 95° approach for shoulder access"
```

```
/smart Build nose radius tradeoff calculator — given target Ra + available feed range: show matrix of R0.2/0.4/0.8/1.2/1.6 with achievable Ra at each feed. Let user pick tradeoff between finish quality and productivity
```

```
/smart Wire KB BORING_BAR_RULES into pipeline — auto-select boring bar: bore Ø → shank (70% of bore minimum), depth → bar material (steel/carbide/dampened by L/D), check protrusion vs bore depth. Return specific bar recommendation
```

```
/smart Wire KB GROOVING_PARTING_RULES — auto-select grooving insert width. If groove_width > max_insert_width: calculate number of plunge passes needed. Parting: select blade by part diameter (1.5mm for <25mm, 2mm for <50mm, 3mm standard, 4mm for >80mm)
```

```
/smart Add wiper insert support — when wiper=true: halve Ra prediction (wiper geometry), adjust chip breaker code. Recommend wiper for: finish passes where Ra < 1.6µm target AND feed > 0.1mm/rev (wiper lets you keep high feed with fine finish)
```

```
/smart Add thread insert type selection — full profile 60° for metric/UNC (one pitch per insert), partial profile for multi-pitch (covers range), 55° BSP for British pipe. Wire into ThreadingPipelineEngine tool selection
```

```
/smart Add live tool holder type selection — ER collet (general, cheapest), Capto (maximum rigidity, best for heavy milling), HSK-T (highest RPM for small tools), VDI (standard turret interface). Selection affects max live RPM + stiffness
```

```
/smart Tests: P6 (H13 die) with 3 tool sets — economy (WNMG 6-edge, steel boring bar), standard (CNMG+DNMG, carbide bar), premium (CNMG+wiper DNMG, anti-vib bar). Compare: cycle time, Ra, cost per part, tool life
```

```
/compact quick
```

### LATHE-MS3: Workholding Adaptation (8 units)

```
/smart Wire ChuckJawForceEngine into pipeline — calculate: grip_force = num_jaws × jaw_force × friction_coeff. Verify grip_force > max_cutting_force × 2.5 (ISO 10218 safety factor). If insufficient: auto-reduce Vc (lower cutting force) or warn to increase chuck pressure
```

```
/smart Add centrifugal force RPM limiter — Fc = m_jaw × ω² × r. At high RPM, effective_grip = static_grip - Fc_centrifugal. Calculate max safe RPM where effective_grip still > cutting_force × 2.5. Set G50 Smax to this calculated limit (may be lower than machine max)
```

```
/smart Add jaw type friction coefficients — hard_smooth µ=0.3, hard_serrated µ=0.5, soft_OD µ=0.45, soft_ID_expanding µ=0.40, pie_jaws µ=0.35, collet µ=0.35. Each type → different grip → different max RPM. Wire into centrifugal force calculator
```

```
/smart Build Op2 workholding logic — after flip: detect finished surfaces (from Op1 features). If cosmetic OD: auto-recommend soft jaws bored to OD. Calculate grip force on finished diameter. Add "FLIP PART — grip on finished Ø{X}mm with soft jaws" to setup sheet
```

```
/smart Wire TailstockForceEngine — when L/D > 4: auto-recommend tailstock. Calculate: live center (for RPM > 2000) vs dead center (cheaper, lower RPM). Add tailstock engage/disengage G-code (M21/M22 Haas, or manual note for other controllers). Check thermal expansion for dead center
```

```
/smart Wire SteadyRestPlacementEngine — when L/D > 8: auto-place steady rest at optimal Z for minimum deflection. Fixed rest for roughing (higher rigidity), follow rest for finishing (moves with tool). Add setup note with Z position
```

```
/smart Add missing workholding types: 6-jaw chuck (thin wall), dead-length collet (bar feed precision — no Z shift when closing), mandrel solid/expanding (grip on bore for OD turning), spider (thin-wall tube support), dog driver (between centers). Each with grip force model
```

```
/smart Tests: P6 (H13 die) with 5 configs — 3-jaw hard, 3-jaw soft, collet, soft jaws bored to OD, between centers with dog. Verify: RPM limits differ, grip force warnings fire at correct thresholds, tailstock auto-engaged for long parts
```

```
/compact quick
```

---

## PHASE 4: PIPELINE INTEGRATION (MS4)

### LATHE-MS4: End-to-End Pipeline (8 units)

```
/smart Wire complete pipeline chain: AutoPrintToProgramBridge → BlueprintOCREngine (text parse) → feature extraction → selectLatheType (machine pick) → selectInsert (from inventory or catalog) → collision validation → workholding check → grip force verify → generateGCode (through post engine) → setup sheet output. Test full chain with text description of H13 die
```

```
/smart Wire missing operations into pipeline: reaming (ReamingEngine → G85 output), countersinking (CountersinkEngine → G82 with angle), knurling (from TurningProgramAssembler.generateKnurlOp), burnishing (from KB SPECIALTY_LATHE_OPS → single G01 pass with roller tool)
```

```
/smart Build sub-spindle back-working — after cutoff+transfer: generate Op2 program for sub-spindle side. Face back end, drill/bore/tap from opposite side. Wire MillTurnSwissPipelineEngine.SubSpindleTransfer: sync RPM, grip, cutoff, transfer, back-work ops
```

```
/smart Wire BarFeederEngine — for bar-fed production: add M99 loop at program end (returns to start for next part). Calculate parts_per_bar, remnant tracking, collet selection. Add bar feeder setup to setup sheet. Wire KB optimizeBarRemnant()
```

```
/smart Build setup sheet generator — output document: fixture type + jaw description, complete tool list with turret stations + insert part numbers + nose radii, work offset (G54/G15 H1), datum surface description, inspection points with tolerances, estimated cycle time, safety notes (L/D warnings, power limits, collision clearances)
```

```
/smart Build error handling — when feature can't be machined: (1) bore too deep for any available bar → ERROR with recommendation, (2) no tool available for feature → WARN + skip with note, (3) collision detected → ERROR + show clearance needed, (4) power exceeded → auto-reduce + WARN. Never silently drop features
```

```
/smart Validate cycle time accuracy — instrument every segment: cutting time = distance/feedrate, rapid time = distance/rapid_rate, tool change time from KB TURRET_INDEX_TIMES, dwell time. Sum all. Compare against manual estimate. Target ±15% accuracy
```

```
/smart Tests: 5 complete end-to-end runs — (1) simple shaft text→program, (2) H13 die text→program, (3) stepped die with whistle notch, (4) hardened H13 CBN, (5) XL 6" D2 die. Each on 2 different machines = 10 pipeline tests total
```

```
/compact quick
```

---

## PHASE 5: OPTIMIZATION + CONTROLLERS + PARADIGM (MS5 + MS6 + MS10, parallel)

### LATHE-MS5: User Optimization Choices (5 units)

```
/smart Build multi-option program generator — given same part input, produce 3 complete programs: (A) FASTEST — aggressive Vc, max DOC, fewer passes, accepts higher Ra. (B) BEST FINISH — light DOC, slow feed, wiper inserts, spring passes, target Ra < 0.8µm. (C) LONGEST TOOL LIFE — conservative Vc (80% of recommended), more edges per insert, lower cost per part at scale
```

```
/smart Build cost-per-part breakdown — for each option: material_cost = stock_volume × $/kg, tooling_cost = (edges_used / edges_per_insert) × $/insert per operation, machine_cost = cycle_time × hourly_rate / 3600, setup_cost = setup_time × rate / batch_size. Show total $/part for each option
```

```
/smart Build what-if analysis — user changes any parameter (drill size, material grade, different tool, different machine) → instant recalculation of entire program + cost. Show delta: "Changing to Ø12mm drill: saves 3.2s/part (-8%), adds $0.02 tooling (+1%), net saving $0.15/part at 500 parts"
```

```
/smart Build batch size optimization — 1 part: no bar feeder, manual load, maximize flexibility. 10-100 parts: add sister tools at 50% tool life, bar feeder loop. 1000+ parts: optimize turret layout for minimum index time, maximum overlap, sister tools with auto-offset. 10000+: recommend multi-spindle
```

```
/smart Tests: generate A/B/C for H13 die, verify: (A) shortest cycle, (B) best Ra, (C) lowest $/part at 100-unit batch. Verify cost breakdown math is correct (material + tooling + machine = total)
```

### LATHE-MS6: Controller Deep Hardening (7 units)

```
/smart Okuma OSP-P300L deep — test every Okuma-specific code: G15 H0-H48 offsets, T0001-T9999 tool format, M50/M51/M52 coolant, M19 R-angle orient, G199/G198 sync, NVAR(1)-NVAR(200). Generate test program using every feature, verify no Fanuc codes leak through
```

```
/smart Okuma Multus OSP-P300M deep — B-axis: G00 B{angle} positioning, sub-spindle: M143(fwd)/M144(rev)/M145(stop), live tool: M133(fwd)/M134(rev)/M135(stop), C-axis: G112 polar ON / G113 polar OFF, ATC: M06 + magazine position
```

```
/smart Haas NGC deep — Setting 33 Fanuc mode: D-word DOC in G71 (not U-word), P-seconds dwell (P1000 = 1 second, not milliseconds), macro #100-#199/#500-#999, M97 local sub-call, G65 P9811 probing. Test with Setting 33 ON and OFF variants
```

```
/smart Mazak SmoothAi deep — !L/!R channel select, G53.5 Mazatrol work offset (not G54), SMOOTH interpolation (smooth path blending), multi-channel WAIT codes, S1/S2 spindle ID selection, M-code differences from Fanuc
```

```
/smart Fanuc 31i-B deep — G12.1 polar interpolation (C-axis milling), G68.1 tilted work plane (B-axis mill-turn), nano CNC interpolation (G05.1 Q1), AI contour control II, WHILE/DO1/END1 loops (numbered 1-3), tool group management
```

```
/smart Siemens 840D/sl deep — CYCLE95 (stock removal rough with contour), CYCLE97 (thread cutting with auto-pass-schedule), LIMS= speed limit, SUPA G0 (suppress approach), G18 ZX plane SET, GOTOF/GOTOB branching, R1-R99 parameters, define/call cycle
```

```
/smart Tests: generate G71+G70+G75+G76 program (H13 die with thread + groove) in ALL 6 controller dialects. Side-by-side comparison showing exact syntax differences. Verify zero cross-contamination (no Fanuc codes in Okuma output, etc)
```

```
/compact quick
```

### LATHE-MS10: Paradigm Advisor + Conversational (6 units)

```
/smart /forge-triple Build ProgrammingParadigmAdvisorEngine — input: part_complexity, batch_size, machine_type, operator_skill, features[]. Output: recommended_paradigm with reasoning. Rules: simple+low_batch → conversational. Part_family → parametric_macro. Complex_profile → G71+CAM. Multi_axis → MUST_USE_CAM. High_volume → macro+sister_tools. Prototype → conversational_fastest_setup
```

```
/smart Build Mazatrol conversational output format — generate UNIT+SHAPE Mazatrol-native format (not G-code). For simple parts: UNIT TRN (turning), UNIT THR (threading), UNIT GRV (grooving). Include speed/feed in Mazatrol format. Recommend when: Mazak machine + batch < 10 + simple geometry
```

```
/smart Build Okuma AOT guidance output — generate AOT-compatible simplified format or step-by-step AOT setup instructions. For simple parts on Okuma: "Use AOT → select TURNING → enter OD, LENGTH, MATERIAL → AOT calculates speeds/feeds automatically"
```

```
/smart Build Haas VQC guidance — generate VQC-compatible format or instructions: "Use VQC → TURNING tab → enter profile points → VQC generates G71/G70 automatically with Setting 33 speeds/feeds"
```

```
/smart Build paradigm decision rules engine — simple (face+turn+drill+cutoff, < 5 features) → hardcode/conversational. Part family (same shape, variable sizes) → parametric macro. Complex profile (> 8 profile points or arcs) → G71+CAM profile. Multi-axis (B-axis, simultaneous 5-axis) → MUST use full CAM. High volume (> 1000 parts) → macro with tool life + sister tools + bar feeder loop
```

```
/smart Tests: 5 parts ranked by complexity → verify paradigm advisor recommends: (1) simple shaft → "conversational or hardcode", (2) die family 3 sizes → "parametric macro", (3) 12-point profile → "G71 with CAM profile", (4) B-axis angled bore → "full CAM required", (5) 10,000 qty simple part → "production macro with sister tools"
```

```
/compact quick
```

---

## PHASE 6: EXHAUSTIVE VALIDATION (MS8)

### LATHE-MS8: Production Validation & Test Suites (14 units)

```
/smart Build FULL TEST MATRIX: 12 parts × 6 machines = 61 valid programs. Write automated test that generates ALL 61, validates each for: correct dialect, collision-free (no overlap warnings), safe speeds/feeds (within KB ranges), proper operation sequence (face→drill→rough→finish→groove→thread→live→cutoff)
```

```
/smart Simple Part Tests (P1-P3) — generate on ALL 6 machines = 18 programs. P1: simple shaft (face + single OD). P2: stepped shaft (3 diameters). P3: chamfer + R3 fillet. Validate: G71/G70 pair, TNC, clean N-numbers, correct dialect per machine
```

```
/smart Medium Part Tests (P4-P6) — P4: thread+groove+cutoff (G76+G75, G97 before G76). P5: bore+drill+tap (center drill first, G83 peck, G84 tap). P6: H13 die cbore both sides (sub-spindle for Op2). On all compatible machines
```

```
/smart Complex Part Tests (P7-P9) — P7: 12-point OD profile with G02/G03 arcs (ALL machines). P8: whistle notch at 10° (ONLY live-tool machines: M2, M3, M5, M6). P9: OD pocket 1.25"×0.125" (ONLY Y-axis machines). Verify live tool M05/M19/M133/M135 sequence
```

```
/smart Extreme Part Tests (P10-P12) — P10: ULTIMATE all features combined (live-tool machines only). P11: hardened H13 48HRC CBN hard turning (ALL machines, verify ISO H speeds). P12: XL 6" D2 die (ONLY Multus B300 — largest swing). Verify power warnings on small machines
```

```
/smart Cross-dialect validation — P6 (H13 die) generated on ALL 6 controllers. Line-by-line diff showing: G15 vs G54, M50 vs M08, T0001 vs T0101, LIMS= vs G50, D-word vs U-word. Automated assertion: zero cross-contamination between dialects
```

```
/smart Collision test scenarios — run ALL 12 scenarios from MS0 U10: boring bar too short, turret rapid hit, grooving overextended, live tool hits tailstock, chuck jaw collision, swing exceeded, drill clearance, min chip thickness, bore taper compensation, springback, G71 Type I/II, safe retract. Each must produce correct ERROR or WARNING
```

```
/smart Tooling variation tests — P6 with economy/standard/premium tool sets (from MS2 U10). Verify: cycle time FASTEST with premium (best tools), Ra BEST with premium (wiper), cost LOWEST with economy (6-edge inserts). All 3 must produce valid collision-free programs
```

```
/smart Workholding variation tests — P6 with 5 workholding configs (from MS3 U08). Verify: collet has highest RPM (lowest centrifugal loss), hard jaws have lowest RPM, soft jaws recommended for Op2. Grip force warnings fire when cutting force approaches limit
```

```
/smart Cost efficiency validation — every PRISM program vs equivalent manual/tutorial program. Document: CSS improvement (%), tool change savings, safety additions (L/D, power, collision checks not in manual programs). Target: PRISM 20%+ faster cycle with equal or better safety
```

```
/smart Swiss-type test — P12 on Citizen Cincom config from MillTurnSwissPipelineEngine. Guide bushing, gang slide (zero index time), multi-channel, sub-spindle back-working. Verify Swiss-specific codes
```

```
/smart VTL test — P12 (6" die) on VTL config. Vertical Z convention, faceplate workholding, G50 Smax at 300 RPM, maximize feed per rev to compensate low RPM. Verify VTL-specific setup notes
```

```
/smart Build regression CI/CD suite — ALL tests packaged as single executable: `npx tsx tests/lathe-regression-full.ts`. Run on every code change. Zero tolerance for test count decrease. If any test fails: block merge. Output: PASS/FAIL summary with timing
```

```
/smart Real machine dry run preparation — generate final validation program for Okuma Genos. Include: single-block mode instructions, cycle-stop verification points, expected tool positions at each stop, safe abort procedure. This is the last step before cutting real metal
```

```
/compact quick
```

---

## FINAL VERIFICATION

```
npx tsx tests/lathe-regression-full.ts
```

Expected output:
```
LATHE REGRESSION SUITE: ALL TESTS
==================================
MS0  Collision Tests:     12/12 PASS
MS0.5 Dialect Tests:       6/6 PASS
MS1  Machine Tests:       42/42 PASS (7 machines × 6 dialects)
MS2  Tooling Tests:        3/3 PASS (economy/standard/premium)
MS3  Workholding Tests:    5/5 PASS (5 configs)
MS4  Pipeline Tests:      10/10 PASS (5 parts × 2 machines)
MS5  Optimization Tests:   3/3 PASS (A/B/C options)
MS6  Controller Tests:     6/6 PASS (6 dialects)
MS7  Physics Tests:        9/9 PASS (chatter/white layer/deflection...)
MS8  Full Matrix:         61/61 PASS (12 parts × 6 machines)
MS9  Parametric Tests:     3/3 PASS (3 die sizes)
MS10 Paradigm Tests:       5/5 PASS (5 complexity levels)

TOTAL: 165/165 (100%)
```
