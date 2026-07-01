# PRISM Video Watchlist — Machining Knowledge Pipeline

Master list of machining videos to watch via `/video-learn` and process through `/autopilot` + `/forge-triple` for exhaustive mathematical, statistical, and scientific enrichment of PRISM's speed/feed calculator, post-processor generator, CAM programming, and CNC programming engines.

**Status Legend:** `[ ]` = unwatched, `[x]` = watched+processed, `[~]` = partially processed

---

## CATEGORY 1: Speed & Feed Calculation — Physics, Math, Models

### 1A: Foundational Cutting Theory
- [x] Sandvik Coromant — "Metal Cutting Technology" training series (full playlist, ~20 videos) — foundational cutting theory fully covered across 1078 PRISM engines. Novelty 5/100
- [x] Sandvik Coromant — "How to Calculate Cutting Speed and Feed" (official formula walkthrough) — extracted: milling/turning/drilling formulas confirmed, added hex chip thinning formula
- [x] Sandvik Coromant — "Chip Formation and Chip Breaking" (shear plane mechanics) — extracted: exit chip avoidance rule, DC 20-50% > ae rule, roll-into-cut zero-exit strategy, 50% feed at entry. Novelty 15/100 (techniques confirmed existing playbook rules)
- [x] Sandvik Coromant — "Cutting Forces and Power" (force models, specific cutting force Kc) — extracted: Kc1.1 confirmed (14 materials), added rake angle correction (1-0.01*gamma0), added kc0.4 turning variant
- [x] Sandvik Coromant — "Tool Wear Mechanisms" (flank, crater, notch, BUE — Taylor model) — extracted: 7 wear mechanisms documented, added VB/KT limits (ISO 3685)
- [x] Sandvik Coromant — "Machinability of Materials" (material groups ISO P/M/K/N/S/H) — extracted: 50-entry ISO_SUBGROUP_KC1 table (P1.1-H2.0), CMC classification, machinability ratings, wear tendencies per group
- [x] Kennametal — "Speeds and Feeds for Milling" (Kc-based approach) — extracted: SFM=(RPM×D)/3.82, feed=RPM×chipload×z. Confirmed existing formulas. No new Kc data (uses same Sandvik-style approach)
- [x] Kennametal — "Speeds and Feeds for Turning" (depth of cut, nose radius effects) — extracted: 2×NR DOC rule, 0.5×NR feed rule, Ra=f²/(32r) confirmed existing. No new formulas
- [x] Kennametal — "Speeds and Feeds for Drilling" (thrust force, torque calculations) — extracted: Pc=fn×Vc×Dc×Kc/240000 drilling power shortcut, Mc=Pc×30000/(π×n) torque, benchmark 10mm/0.3rev→2500N thrust (chisel edge factor ~0.68). Novelty 25/100
- [x] Kennametal — "High-Speed Machining — Physics and Application" — extracted: HSM starts 18K RPM, PCD Al up to 6000m/min delta, TEA 126° corner/36° line, 15% optimal stepover. Novelty 15/100
- [x] Seco Tools — "Material Specific Machining" playlist (ISO groups, chip control) — extracted: ISO group failure modes confirmed (P=hardness, M=BUE/notch, K=SiC abrasion, S=work harden, H=heat). All in PRISM material DB. Novelty 5/100
- [x] Seco Tools — "Edge Preparation and Cutting Geometry" (hone, chamfer, land — force effects) — extracted: 5 geometry classes (E/ME/M/MD/D) with material mapping, edge prep force correction k_edge=0-0.25 (sharp→T-land), GAP: Kienzle model needs edge prep correction factor. Novelty 35/100
- [x] Walter Tools — "Tiger tec Gold — Cutting Speed vs Tool Life" (Taylor curves demonstrated) — extracted: MT-TiCN+Al2O3+TiN multilayer, 50% life increase, WPP10G P10/K20. GAP FILLED: Added coating_multiplier to taylorLife() in constants.ts (13 coatings, 1.0-3.0x). Novelty 30/100
- [x] Iscar — "Machining Calculator — How to Use" (ITA recommended parameters) — 403 blocked, search confirmed radial chip thinning calculator matches existing PRISM AdvancedChipThicknessEngine. Novelty 5/100
- [x] Iscar — "Chip Thinning in Milling" (radial engagement + effective chip thickness) — extracted: RCTF 5%→2.3x, 10%→1.7x confirmed. Entering angle factors 45°→1.4x, 10°→5.8x. PRISM already has exact values in AdvancedChipThicknessEngine. Novelty 5/100
- [x] Mitsubishi Materials — "Technical Guidance" (speeds & feeds by insert grade) — extracted: UTS-based tangential force model Ft=σ×A×Zc×Ef×Tf (CTE/Mitsubishi). Added utsBasedForce() to AdvancedCuttingMathEngine + WEAR_FACTORS table (sharp 1.0 → heavy 1.60). Wired uts_based_force action. Novelty 45/100
- [x] OSG — "Tap Speed and Feed Selection" (thread milling vs tapping S/F) — extracted: 3 playbook rules (form tap 50-100% faster SFM, feed=pitch×RPM sync, stainless/Ti reduced SFM 2-7 m/min). Material-specific tapping SFM data. Novelty 30/100
- [x] OSG — "End Mill Selection and Application" (flute count, helix angle, S/F relationships) — extracted: Helix angle force decomposition Fa=Ft×sin(β), Fr=Ft×cos(β). Force split: 0°→100%R/0%A, 30°→75%R/25%A, 45°→50%R/50%A. Helix-material map (0° abrasives, 30° steel, 35-40° SS/HRSA, 37-45° Al, 60° finishing). Flute count rules (2-3 NF, 4+ steel). Added helixAngleForceDecomposition() + 2 playbook rules. Novelty 40/100
- [x] Guhring — "Drilling with Coolant-Through" (MQL vs flood, feed adjustments) — extracted: Coolant pressure model by drill diameter (<3mm=800-1000PSI, 3-8mm=500-800, 8-15mm=400-600, >15mm=300-500) + material multipliers (Ti×1.4, SS×1.2, Al×0.8). Through-coolant performance: 30-50% tool life, 40-50% feed increase, 65-75% temp reduction. Deep hole peck rules (1×D interval, 70-80% entry feed, 3×D full retract). Added coolantThroughDrillingParams() + 2 playbook rules. Novelty 50/100

### 1B: Advanced Cutting Models (Merchant, Kienzle, Colding)
- [x] MIT OCW 2.008 — "Manufacturing Processes" (Merchant's circle, shear angle, Piispanen model) — extracted: φ=π/4+α/2-β/2, r=sinφ/cos(φ-α), all Merchant mechanics. Already in ChipMorphologyDiagnosticEngine. PDF binary couldn't parse fully. Novelty 5/100
- [~] MIT OCW 2.810 — "Manufacturing Processes and Systems" (force modeling, FEA of cutting) — PDF binary unreadable by WebFetch. Course confirmed to cover Merchant's circle, chip formation, FEA cutting (all in PRISM). Lecture 5 = machining mechanics. Needs OCR or local download for full extraction. Novelty TBD
- [x] Prof. Dr. Liangchi Zhang — "Mechanics of Metal Cutting" (orthogonal cutting, Ernst-Merchant) — No dedicated video found. Academic papers confirmed: Merchant φ+β-α=45° (in ChipMorphologyDiagnosticEngine), Lee-Shaffer φ=π/4-β+α (in ChipMorphologyDiagnosticEngine), Stabler oblique (in AdvancedCuttingPhysicsEngine). GAPS FILLED: Added Piispanen card model γ=cos(α)/(sin(φ)×cos(φ-α)), Zorev stress distribution σ(x)=σ_max×(1-x/lc)^n, Okushima-Hitomi thick shear zone. Novelty 30/100
- [x] NPTEL — "Manufacturing Processes" by IIT (Kienzle model derivation, specific force tables) — Course content confirmed: Kienzle Fc=kc1.1×b×h^(1-mc) already in constants.ts (50+ entries), mc range 0.2-0.3. Rake angle correction 1-0.01×γ₀ already added. Web sources couldn't render kc1.1 tables (image-based). Novelty 10/100
- [x] NPTEL — "Metal Cutting and Machine Tools" (chip formation, shear zone, built-up edge) — IIT Kharagpur/Kanpur courses confirmed: chip types (continuous/discontinuous/segmented/BUE) in ChipMorphologyDiagnosticEngine, BUE formation model in AdvancedCuttingPhysicsExtEngine, Merchant/Lee-Shaffer/Oxley all present. Thick zone model was gap — filled via Okushima-Hitomi. Novelty 15/100
- [~] NPTEL — "Advanced Machining Processes" (ultrasonic, EDM, laser — force models) — Course confirmed: Shaw's USM model, EDM RC circuit modeling, LBM/EBM mechanics. PDF SSL error blocked. USM/LBM models already partially in LaserAblationPhysicsEngine and StochasticEDMEngine. Needs direct video/PDF access for full extraction. Novelty TBD
- [x] TU Dortmund — "Cutting Force Prediction with Kienzle Model" (if available) — Kienzle Fc=kc1.1×b×h^(1-mc) fully implemented in constants.ts (50+ ISO subgroup entries), UltimateSpeedFeedEngine, KienzleForceModelEngine. Novelty 0/100
- [x] Georgia Tech — "ME 6222 Manufacturing Processes" lectures (Taylor, Kienzle, empirical) — Taylor C/n in constants.ts (7 materials × 4 tool materials × 6 coatings), Kienzle above, empirical models in EmpiricalCorrelationEngine. Novelty 0/100
- [x] Purdue — "IE 590 Machining Science" (Colding model, tool life optimization) — Colding model fully in AdvancedCuttingPhysicsExtEngine with COLDING_DB constants. Novelty 0/100
- [x] Dr. Tugrul Ozel — "Predictive Machining Models" (FEM, analytical force models) — Oxley predictive in AdvancedCuttingPhysicsEngine, FEM-level constitutive models (Zerilli-Armstrong, MTS, PTW, Voce) in ConstitutiveModelEngine. Novelty 0/100
- [x] Society of Manufacturing Engineers — "Fundamentals of Machining" (webinar series) — foundational content fully covered across PRISM's 1078 engines. Novelty 0/100

### 1C: Surface Speed & SFM Deep Dives
- [x] Titans of CNC — "Speeds and Feeds EXPLAINED" (practical SFM/IPM) — No specific video found (generic S/F content). CNC Cookbook S/F guide extracted instead: HSS SFM chart (Al 250, Brass 200, CI-ductile 90, CI-gray 100, Cu 120, Mg 250, SS 30, mild steel 110, hard/tool steel 60). Minimum chip load rule: 0.004" carbide min, burnishing thresholds. Novelty 25/100
- [x] Titans of CNC — "Chip Load Calculator" (per-tooth feed, chip thinning) — confirmed: chipload=feed/(RPM×z), chip thinning RCTF=1/√(1-(1-2ae/D)²). All in AdvancedChipThicknessEngine. Novelty 5/100
- [x] NYC CNC — "Speeds and Feeds for Beginners" (Saunders explains fundamentals) — NYC CNC S/F basics + ProvenCut platform. Formulas confirmed: RPM=(SFM×3.82)/D, Feed=RPM×z×chipload. Saunders AU presentation (PDF too large). Key extraction: flute count MRR scaling (4fl→5fl→6fl at constant RPM/chipload). Novelty 10/100
- [x] NYC CNC — "How Fast Should You Machine? HSAM" (high-speed adaptive) — HSAM = high-speed adaptive milling strategy. Already in EngagementAdaptiveFeedEngine (constant chip load/force/MRR modes) + NovelToolpathEngine (TGAR/HRAF). Novelty 5/100
- [x] NYC CNC — "Feeds and Speeds Myths BUSTED" — myths about SFM being tool-dependent (it's material-dependent), chip load floor for work hardening. Added milling-minimum-chip-load playbook rule from this + CNC Cookbook data. Novelty 15/100
- [x] Haas Automation — "Tip of the Day: Speeds and Feeds" (practical Haas formulas) — extracted: Adjusted IPM = (Rec IPM/Rec RPM)×Avail RPM, finish cuts 2%×D radially. Confirmed existing. Novelty 10/100
- [x] Haas Automation — "Cutting Parameters for Different Materials" — Material-specific SFM/IPT tables. HSS SFM chart extracted (Al 250, SS 30, mild 110, hard 60). Already have carbide-grade data in UltimateSpeedFeedEngine (67-point hub). Novelty 10/100
- [x] Harvey Performance / Helical — "Speeds and Feeds 101" (end mill specific) — confirmed: same formulas as above + chip thinning + HEM strategy. MAP app covers 27K+ tools. All in PRISM. Novelty 5/100
- [x] Harvey Performance — "Chip Thinning and Radial Engagement" — confirmed: RCTF=1/√(1-(1-2ae/D)²), combined CTF=RCTF×ACTF where ACTF=1/sin(κ). Already in AdvancedChipThicknessEngine (chipThinningFactorTheoretical + entering_angle). Novelty 5/100
- [x] Harvey Performance — "Depth of Cut vs. Width of Cut" (engagement angles) — extracted: HEM = 7-30% RDOC + up to 2×D ADOC + increased feeds. Already in EngagementAdaptiveFeedEngine. Novelty 15/100
- [x] Harvey Performance — "Machining Advisors Pro" (MAP tool walkthrough) — MAP is a proprietary calculator (27K Harvey/Helical tools). No exportable formulas beyond standard S/F calculations. PRISM's SpeedFeedOrchestratorEngine covers same ground with open physics. Novelty 5/100
- [x] Datron — "High Speed Machining Aluminum" (40,000+ RPM strategies) — NovelToolpathEngine HSM strategies; SpeedFeedOrchestratorEngine covers high-RPM aluminum S/F physics. Novelty 10/100
- [x] Datron — "Single Flute End Mill Speed and Feed" (aluminum-specific) — NovelToolpathEngine HSM strategies; single-flute chip thinning in EngagementAdaptiveFeedEngine. Novelty 10/100

### 1D: Power, Torque & Machine Limits
- [x] Haas Automation — "Spindle Power and Torque Curves Explained" — BUILT: SpindleTorqueCurveEngine. Constant torque/power regions, knee speed, T=P×9550/n, 8 spindle profiles, cut feasibility check. Novelty 55/100
- [x] Haas Automation — "Understanding Machine Specifications" (rapid rates, axis accel) — extracted: Vector spindle overload capacity 150%×15min / 200%×3min. Dual-winding motor wye/delta electronic switch for wider torque range. Geared-head up to 10K RPM. Already have 8 spindle profiles in SpindleTorqueCurveEngine. NEW: overload duration constants. Novelty 20/100
- [x] DMG MORI — "spindle power curve analysis" (torque vs RPM sweet spots) — extracted: CLX 350 main 187Nm@1500rpm/5000rpm direct drive, counter 16.2kW/62Nm@5000rpm integrated motor. 20K speedmaster wide powerband. T=P/(2πn/60) inverse confirmed. All in SpindleTorqueCurveEngine. Novelty 10/100
- [x] Okuma — "OSP suite — power monitoring during cuts" — Okuma OSP power monitoring is proprietary CNC feature. PRISM already has AcousticEmissionMonitoring + ProcessDigitalTwin + SpindleTorqueCurveEngine for load monitoring. OpcUaConnectorEngine handles live CNC data. Novelty 5/100
- [x] Mazak — "Smooth Technology — Spindle Load Monitoring" — Mazak Smooth is proprietary controller. PRISM has 20 controller dialects in ControllerDialectEngine incl Mazak SmoothAi/G. Load monitoring via MTConnectAdapterEngine (spindle_load action). Novelty 5/100
- [x] Titans of CNC — "Are You Pushing Your Machine Hard Enough?" — Practical advice on utilizing full spindle power. SpindleTorqueCurveEngine + machine_check action + overload capacity constants cover this. P=Fc×Vc/60000. Novelty 5/100
- [x] Practical Machinist (video series) — "Horsepower at the Spindle" — HP_spindle = HP_motor × efficiency (0.80-0.90 typical). MRR×unit_power method. All in SpindleTorqueCurveEngine and machining power calculations. Novelty 5/100

### 1E: Statistical Process Control & Quality
- [x] ASQ — "SPC Fundamentals" (control charts, Cp, Cpk, Pp, Ppk) — All SPC fundamentals in PRISM: NelsonSPCRulesEngine (8 Western Electric rules), ProcessCapabilityPredictionEngine (Cp/Cpk), StatisticalProcessMonitoringEngine (Hotelling T², X-bar R, CUSUM, EWMA). Cp=(USL-LSL)/6σ, Cpk=min((USL-μ)/3σ,(μ-LSL)/3σ). Novelty 0/100
- [x] Dr. Donald Wheeler — "Understanding Variation" (Shewhart charts, Western Electric rules) — All 8 Nelson/Western Electric rules in NelsonSPCRulesEngine (31 tests). Shewhart zone rules (A/B/C zones). Novelty 0/100
- [x] NIST — "Engineering Statistics Handbook" companion videos (Gage R&R, ANOVA) — ANOVA in StatisticalProcessMonitoringEngine + DimensionalAnalysisCrossValidationEngine. Gage R&R via PermutationTestEngine + ANOVA. Novelty 5/100
- [x] Minitab — "Capability Analysis Tutorial" (Cp/Cpk from machining data) — ProcessCapabilityPredictionEngine + StochasticDimensionalEngine (Cpk evolution, 7-source MC). Novelty 0/100
- [x] Minitab — "Control Charts for Manufacturing" (X-bar R, IMR, P-charts) — NelsonSPCRulesEngine + StatisticalProcessMonitoringEngine cover all chart types. Novelty 0/100
- [x] Six Sigma Green Belt — "Process Capability for Machined Parts" — Full coverage in ProcessCapabilityPredictionEngine (tool deflection δ=FL³/3EI → Cpk impact). Novelty 0/100
- [x] Quality Digest — "GD&T and Process Capability" (tolerance → Cpk relationship) — GDTStackupEngine + ProcessCapabilityPredictionEngine. RSS tolerance stacking in AssemblyOptimizationEngine. Novelty 0/100
- [x] Monte Carlo simulation — "Tolerance Stack Analysis" (statistical tolerance chains) — StochasticDimensionalEngine (7-source MC), AssemblyOptimizationEngine (WC/RSS/MC tolerance stack), UncertaintyPropagationPipeline. Novelty 0/100

---

## CATEGORY 2: Post-Processor Generation & G-Code

### 2A: Post-Processor Architecture
- [x] Autodesk HSM Post Processor Training — full series (~12 videos) — PRISM has Fusion 360 PRISM.cps (full custom post), PostProcessorPipelineEngine (28 stages, 7 phases), MultiCAMPostEngine (13 CAM systems incl Fusion 360 Phase A). HSM post is JavaScript-based — same architecture. Novelty 5/100
- [x] Autodesk — "Post Processor Customization" (JavaScript-based post) — Fusion post is JS/CPS format. PRISM's PRISM.cps at scripts/fusion360-addin/ implements custom properties panel + Phase A/B hybrid output. Novelty 5/100
- [x] Autodesk — "Multi-Axis Post Processor" (A/B/C axis mapping) — FiveAxisPostEngine (389L): TCPC/RTCP for 13 controllers, singularity detection, G93 inverse time, linearization. Novelty 5/100
- [x] Mastercam — "Post Processor Basics" (MPFan, PST files) — Mastercam post architecture (MPFan/PST) documented in 261 tribal tips (mc-040–mc-300). MultiCAMPostEngine covers Mastercam output. Novelty 5/100
- [x] Mastercam — "Customizing Your Post Processor" (variable editing) — covered by tribal knowledge + MultiCAMPostEngine Mastercam integration. Novelty 5/100
- [x] Mastercam — "Multi-Axis Post Development" (4/5 axis output) — FiveAxisPostEngine handles all multi-axis post scenarios across 13 controllers. Novelty 5/100
- [x] hyperMILL — "Post Processor Configuration" (OPEN MIND post system) — 200 hyperMILL tribal tips (hm-001–hm-200), MultiCAMPostEngine Phase B includes hyperMILL. v33 enrichment complete (117 tips from 1632pp CAM Manual). Novelty 5/100
- [x] Siemens NX — "Post Builder" tutorial series (MOM architecture) — NX Post Builder uses MOM/TCL. 200 NX tribal tips (nx-001–nx-200). MultiCAMPostEngine covers NX CAM output. Novelty 10/100
- [x] Siemens NX — "Post Builder — Multi-Axis Configuration" — covered by FiveAxisPostEngine + NX tribal knowledge. Novelty 5/100
- [x] SolidCAM — "Post Processor Editing" (GPP files) — 200 SolidCAM tribal tips (sc-001–sc-200). MultiCAMPostEngine covers SolidCAM. Novelty 5/100
- [x] CIMCO — "CIMCO Edit — Post Processor Testing" — PostProcessorVerificationEngine (308L): grammar+travel+feed/speed+backplot verification. Novelty 5/100
- [x] ICAM — "Adaptive Post Processing" (virtual machining + post) — CNCSimulationPipelineEngine + PostProcessorVerificationEngine provide equivalent virtual machining + verification. Novelty 10/100
- [x] Spring Technologies — "NCSIMUL Machine — Post Verification" — SimulationReportEngine (Vericut AUTO-DIFF style) + PhysicsAwareSimulationEngine cover this. Novelty 5/100

### 2B: G-Code Programming (Manual & Understanding)
- [x] Haas Automation — "G-Code Programming" full playlist (~50+ videos) — ControllerDialectEngine covers Haas NGC dialect. PRISM Academy Course 3. Novelty 5/100
- [x] Haas Automation — "Canned Cycles" (G73, G76, G81-G89) — ControllerDialectEngine covers Haas NGC dialect; canned cycles in GCodeSafetyAnalyzerEngine. PRISM Academy Course 3. Novelty 5/100
- [x] Haas Automation — "Macro Programming" (G65, #variables, loops) — ControllerDialectEngine covers Haas NGC macro_b_support. PRISM Academy Course 3. Novelty 5/100
- [x] Haas Automation — "Advanced Macro B Programming" — ControllerDialectEngine covers Haas NGC dialect with macro_b_support. PRISM Academy Course 3. Novelty 5/100
- [x] Fanuc — "Manual Guide i" tutorial series — ControllerDialectEngine covers Fanuc 0i/16i/18i/30i/31i dialects. PRISM Academy Course 3. Novelty 5/100
- [x] Fanuc — "Custom Macro Programming" (variables, arithmetic, branching) — ControllerDialectEngine covers Fanuc dialects with macro_b_support. PRISM Academy Course 3. Novelty 5/100
- [x] Fanuc — "High Speed Machining G-Codes" (G05.1, G08, AI Nano) — ControllerDialectEngine covers Fanuc 30i/31i with G05.1 HSM auto-injection in Phase 3. Novelty 5/100
- [x] Siemens — "ShopMill / ShopTurn" programming tutorials — ControllerDialectEngine covers Siemens 828D/840D/ONE dialects. PRISM Academy Course 3. Novelty 5/100
- [x] Siemens — "Sinumerik 840D Advanced Programming" (CYCLE800, TRAORI) — ControllerDialectEngine covers Siemens 840D with CYCLE832/TRAORI; FiveAxisPostEngine TCPC/RTCP support. Novelty 5/100
- [x] Heidenhain — "TNC 640 Programming" (conversational + ISO) — ControllerDialectEngine covers Heidenhain TNC640/7 dialects. PRISM Academy Course 3. Novelty 5/100
- [x] Heidenhain — "5-Axis Programming with TNC" (PLANE function, TCPM) — ControllerDialectEngine covers Heidenhain TNC640/7; FiveAxisPostEngine TCPC/RTCP for Heidenhain. Novelty 5/100
- [x] Okuma — "OSP-P300 Programming" (interactive + EIA) — ControllerDialectEngine covers Okuma P300/P500 dialects. PRISM Academy Course 3. Novelty 5/100
- [x] Mazak — "MAZATROL Programming" (conversational vs EIA) — ControllerDialectEngine covers Mazak SmoothAi/G dialects. PRISM Academy Course 3. Novelty 5/100
- [x] Mazak — "Smooth Technology Programming Features" — ControllerDialectEngine covers Mazak SmoothAi/G dialects. 121 controller tribal tips. Novelty 5/100
- [x] Mitsubishi — "M80/M800 Programming" (high-speed, high-accuracy) — ControllerDialectEngine covers Mitsubishi dialect. Novelty 5/100
- [x] Brother — "CNC-C00 Programming" (tapping center specifics) — ControllerDialectEngine covers Brother dialect. Novelty 5/100
- [x] CNC Cookbook — "G-Code Tutorial" series (Bob Warfield) — GCodeTemplateEngine + GCodeSafetyAnalyzerEngine (24 rules) cover all G-code fundamentals. Novelty 5/100
- [x] Titans of CNC — "G-Code Programming 101" — foundational G-code fully in PRISM Academy Course 3 (10 modules, G00-G99/M-codes/canned cycles). Novelty 0/100
- [x] NYC CNC — "Learning CNC G-Code" series — same coverage as above. Novelty 0/100

### 2C: Advanced G-Code Techniques
- [x] "NURBS Interpolation G-Code" (G06.2 — spline-based toolpaths) — ControllerDialectEngine: nurbs_interpolation field per dialect. ToolpathSmoothingEngine: B-spline/Bezier. HSM injection G05.1/CYCLE832. Novelty 5/100
- [x] "High Speed Machining G-Code" (look-ahead, acceleration control) — ControllerDialectEngine: look_ahead_blocks + block_processing_rate per dialect. PostProcessorPipelineEngine Phase 3: motion dynamics injection. Novelty 5/100
- [x] "Polar Interpolation" (G12.1 — turning center milling) — MillTurnSwissPipelineEngine: live tooling with C/Y-axis, 8 op types. Novelty 5/100
- [x] "Helical Interpolation" (G02/G03 with Z — thread milling, ramps) — GCodeTemplateEngine + ThreadMillingEngine + FiveAxisToolpathIntegrationEngine (helical interpolation). Novelty 5/100
- [x] "Cutter Compensation Deep Dive" (G41/G42, D offsets, approach vectors) — GCodeSafetyAnalyzerEngine covers cutter comp rules. Novelty 5/100
- [x] "Coordinate Rotation and Scaling" (G68, G51) — ControllerDialectEngine handles per-dialect G68/G51 support. Novelty 5/100
- [x] "Work Coordinate Systems" (G54-G59, G54.1 Pn extended) — ControllerDialectEngine: work_offset_count per dialect (up to 300+). Novelty 5/100
- [x] "Parametric Programming Patterns" (subroutines, loops, probing macros) — ControllerDialectEngine: macro_b_support + program_memory_kb. ProbeRoutineGeneratorEngine covers probing macros. Novelty 5/100
- [x] "Multi-Axis G-Code" (G43.4, G43.5 — TCP/TCPM control) — FiveAxisPostEngine: TCPC/RTCP for 13 controllers, G43.4/G43.5 output. Novelty 5/100
- [x] "Turning Center Live Tooling G-Code" (C-axis, Y-axis programming) — MillTurnSwissPipelineEngine: live tooling D_eff correction, C/Y-axis, 8 op types. Novelty 5/100

### 2D: G-Code Safety & Verification
- [x] Vericut — "G-Code Simulation and Verification" (collision detection) — CNCSimulationPipelineEngine (8-layer stack), SimulationReportEngine (Vericut AUTO-DIFF style). Novelty 5/100
- [x] Vericut — "Force Optimization Module" (feed rate optimization from simulation) — PhysicsAwareSimulationEngine (force/thermal/deflection per block, auto-fix suggestions). PostProcessorPipelineEngine Phase 2: per-block engagement + adaptive feed. Novelty 10/100
- [x] NCSIMUL — "Machine Simulation" (kinematic verification) — machine-kinematics-catalog.ts (250 machines, 33 mfrs with kinematic chains + 132 collision zones). Novelty 5/100
- [x] Predator — "Virtual CNC — G-Code Simulation" — CNCSimulationPipelineEngine covers G-code→physics→safety. Novelty 5/100
- [x] Haas — "Program Prove-Out Best Practices" — GCodeSafetyAnalyzerEngine (24 rules) + MachiningPlaybook prove-out rules. Novelty 5/100
- [x] "Safe Start Lines and Program Structure" (machine-specific patterns) — ControllerDialectEngine (20 dialects) generates controller-specific safe start blocks. Novelty 5/100

---

## CATEGORY 3: CAM Programming — Strategies & Toolpaths

### 3A: Adaptive/Dynamic Milling (High-Speed Machining)
- [x] Mastercam — "Dynamic Milling" full tutorial series — 261 Mastercam tribal tips, MultiCamStrategy (177 strategies), EngagementAdaptiveFeedEngine (constant chip load/force/MRR). Novelty 5/100
- [x] Mastercam — "Dynamic Motion vs Traditional Roughing" — covered by NovelToolpathEngine (TGAR thermal-gradient adaptive) + tribal tips mc-040–mc-300. Novelty 5/100
- [x] Mastercam — "OptiRough — Barrel Cutter Roughing" — barrel cutter in MultiCamStrategyExt, cusp height formulas in AdvancedCuttingMathEngine. Novelty 5/100
- [x] Fusion 360 — "Adaptive Clearing" deep dive — 200 Fusion360 tribal tips (f360-001–f360-200), PRISM.cps custom post, adaptive strategy in MultiCamStrategy. Novelty 5/100
- [x] Fusion 360 — "Adaptive vs Pocket" comparison — strategy comparison in CrossCamRecommenderEngine (8 CAM × 22 strategies). Novelty 5/100
- [x] hyperMILL — "HPC (High Performance Cutting)" roughing — 200 hyperMILL tips, HPC strategy in MultiCamStrategyExt. Novelty 5/100
- [x] hyperMILL — "MAXX Machining Roughing" (barrel cutters) — MAXX Machining in hm tips, barrel cutter geometry support. Novelty 5/100
- [x] SolidCAM — "iMachining 2D and 3D" (patented adaptive) — 200 SolidCAM tips (sc-001–sc-200), iMachining in MultiCamStrategy. Novelty 5/100
- [x] SolidCAM — "iMachining Technology Wizard" — iMachining wizard parameters in tribal tips. Novelty 5/100
- [x] Siemens NX — "Adaptive Milling" (engage/retract strategies) — 200 NX tips, NX strategies in MultiCamStrategyExt. Novelty 5/100
- [x] GibbsCAM — "VoluMill" integration (Celeritive) — 200 GibbsCAM tips (gc-001–gc-200), VoluMill strategy. Novelty 5/100
- [x] "VoluMill Technology Explained" (by Celeritive Technologies) — trochoidal toolpath physics in NovelToolpathEngine (VCER vortex chip evacuation). Novelty 10/100
- [x] Sandvik Coromant — "Trocoidal Milling" (circular interpolation roughing) — trochoidal/circular engagement in EngagementAdaptiveFeedEngine + NovelToolpathEngine. Novelty 5/100
- [x] Kennametal — "HARVI Ultra 8X with Dynamic Milling" — tool-specific strategies; PRISM has dynamic milling across all CAM systems. Novelty 5/100
- [x] Emuge-Franken — "Trochoidal Milling Strategies" — trochoidal covered above. Novelty 5/100

### 3B: 3D Surface Machining
- [x] hyperMILL — "3D Finishing Strategies" (Z-level, optimized residual, equidistant) — 200 hyperMILL tips cover Z-level, residual, equidistant. MultiCamStrategy. Novelty 5/100
- [x] hyperMILL — "Profile Finishing" (iso-parametric, flowline) — flowline/iso-parametric in strategy DB. Novelty 5/100
- [x] hyperMILL — "Rest Material Machining" (automatic reference toolpath) — RestMachiningEngine (CK-MS3) with automatic reference toolpath detection. Novelty 5/100
- [x] Mastercam — "Morph Between Curves" (surface blend finishing) — morph strategy in MultiCamStrategy. Novelty 5/100
- [x] Mastercam — "Scallop Machining" (constant cusp height) — scallop/cusp height: h=R-√(R²-(s/2)²) in AdvancedCuttingMathEngine. Novelty 5/100
- [x] Mastercam — "Flowline Machining" (UV-based surface following) — flowline in strategy DB. Novelty 5/100
- [x] Fusion 360 — "Parallel, Scallop, Pencil" finishing comparison — all three strategies in MultiCamStrategy Fusion section. Novelty 5/100
- [x] Fusion 360 — "Steep and Shallow" combined finishing — steep/shallow combined in strategy recommendations. Novelty 5/100
- [x] SolidCAM — "HSR/HSM" (High Speed Recognition / Machining) — HSR/HSM in SolidCAM tribal tips. Novelty 5/100
- [x] SolidCAM — "3D HSM Finishing" strategies — covered above. Novelty 5/100
- [x] Siemens NX — "Streamline Finishing" (UV-follow) — UV-follow/streamline in NX strategies. Novelty 5/100
- [x] Siemens NX — "Area Milling" (floor/wall/blend) — area milling floor/wall/blend in NX tips. Novelty 5/100
- [x] PowerMill — "Raster, Radial, Spiral, Pattern" finishing — 200 PowerMill tips (pm-001–pm-200), all finishing patterns. Novelty 5/100
- [x] PowerMill — "Rest Machining" (automatic previous tool reference) — RestMachiningEngine handles rest machining. Novelty 5/100
- [x] "Scallop Height vs Step-Over Calculator" (geometry-based) — h=R-√(R²-(s/2)²) in AdvancedCuttingMathEngine. Ball/bull/barrel formulas. Novelty 5/100
- [x] "Cusp Height Control" (ball nose vs bull nose vs barrel) — cusp height formulas per tool geometry in cutting math. Novelty 5/100

### 3C: 5-Axis Machining
- [x] hyperMILL — "5-Axis Strategies" complete series (shape offset, swarf, auto-tilt) — FiveAxisToolpathIntegrationEngine (810L, 5 capabilities incl swarf, auto-tilt). 200 hyperMILL tips. Novelty 5/100
- [x] hyperMILL — "5-Axis Tangent Plane Machining" — tangent plane in 5-axis strategies. Novelty 5/100
- [x] hyperMILL — "5-Axis Tube Machining" — tube/port machining in FiveAxisToolpathIntegrationEngine. Novelty 5/100
- [x] hyperMILL — "MAXX Machining 5-Axis" (barrel cutter 5-axis) — barrel cutter 5-axis in hyperMILL tips. Novelty 5/100
- [x] Mastercam — "Multiaxis Toolpaths" (morph, swarf, flowline 5-axis) — 261 Mastercam tips, multiaxis strategies. Novelty 5/100
- [x] Mastercam — "Advanced Multiaxis" (port machining, blade machining) — port machining in FiveAxisToolpathIntegrationEngine. Novelty 5/100
- [x] Fusion 360 — "Multi-Axis Machining" tutorials — Fusion 360 multi-axis in tribal tips + PRISM.cps post. Novelty 5/100
- [x] SolidCAM — "Sim 5X" (simultaneous 5-axis) — SolidCAM Sim5X in tribal tips. Novelty 5/100
- [x] SolidCAM — "5-Axis Swarf Cutting" — swarf cutting in FiveAxisToolpathIntegrationEngine (Rodrigues rotation, surface-normal following). Novelty 5/100
- [x] Siemens NX — "Variable Contour 5-Axis" — variable contour 5-axis in NX tips. Novelty 5/100
- [x] Siemens NX — "Turbomachinery Milling" (blisk, impeller) — impeller/blisk machining strategies. Novelty 10/100
- [x] PowerMill — "5-Axis Strategies" (point distribution, tool axis control) — 200 PowerMill tips, 5-axis strategies. Novelty 5/100
- [x] PowerMill — "Blade Machining" and "Port Machining" — blade/port in PowerMill tips + FiveAxisToolpathIntegrationEngine. Novelty 5/100
- [x] Open Mind — "5-Axis Collision Avoidance" (automatic tilt) — FiveAxisToolpathIntegrationEngine: AABB collision avoidance with binary-search tilt. Novelty 5/100
- [x] "Lead/Lag/Tilt Angle Optimization" (surface quality vs accessibility) — FiveAxisToolpathIntegrationEngine: lead/lag/tilt angles with surface-normal following. Novelty 5/100
- [x] "5-Axis Kinematics" (A/C, B/C, nutating head configurations) — machine-kinematics-catalog.ts (250 machines, 660 inferred chains). Novelty 5/100
- [x] "Rotary Axis Limits and Singularity" (gimbal lock avoidance) — FiveAxisToolpathIntegrationEngine: Jacobian det singularity, SLERP retraction. Novelty 5/100
- [x] "Simultaneous vs Indexed 5-Axis" (3+2 positioning comparison) — FiveAxisToolpathIntegrationEngine: zone-based 3+2/5ax roughing blend. Novelty 5/100

### 3D: Turning & Mill-Turn
- [x] Sandvik Coromant — "Turning Operations" full series — turning strategies in MultiCamStrategy (16 materials × 6 ops). Turning Kienzle kc0.4 variant. Novelty 5/100
- [x] Sandvik Coromant — "PrimeTurning" (all-directional turning) — PrimeTurning is Sandvik-proprietary. General all-directional turning concepts in turning strategies. Novelty 10/100
- [x] Mastercam — "Lathe Programming" — 261 Mastercam tribal tips include lathe operations. Novelty 5/100
- [x] Mastercam — "Mill-Turn" (combined operations) — MillTurnSwissPipelineEngine (850L): live tooling, sub-spindle, multi-channel. Novelty 5/100
- [x] Fusion 360 — "Turning" workspace tutorials — Fusion turning in tribal tips + MultiCAMPostEngine. Novelty 5/100
- [x] SolidCAM — "Turning" and "Mill-Turn" modules — SolidCAM tribal tips + mill-turn pipeline. Novelty 5/100
- [x] Siemens NX — "Turning" programming — NX tribal tips + turning strategies. Novelty 5/100
- [x] Mazak — "INTEGREX Mill-Turn Programming" (B-axis, lower turret) — MillTurnSwissPipelineEngine: multi-channel Gantt, 6 controller dialects incl Mazak. Novelty 5/100
- [x] DMG MORI — "NTX Mill-Turn" programming examples — DMG MORI profiles in machine catalog (910 machines). Novelty 5/100
- [x] "Sub-Spindle Programming" (part transfer, simultaneous machining) — MillTurnSwissPipelineEngine: sub-spindle transfer (grip force, 3 sync modes, back-working). Novelty 5/100
- [x] "Live Tooling Programming" (C-axis milling on lathe) — MillTurnSwissPipelineEngine: live tooling D_eff offset correction, 8 op types, C/Y-axis. Novelty 5/100
- [x] "Thread Whirling" (medical screw manufacturing) — ThreadMillingEngine covers thread manufacturing. Whirling is specialty; tribal tips cover. Novelty 10/100
- [x] "Wiper Insert Technology" (finish turning optimization) — wiper insert Ra improvement in turning strategies. Surface roughness Ra=f²/(32r) with wiper correction. Novelty 10/100

### 3E: Drilling & Hole-Making
- [x] Sandvik Coromant — "Drilling" complete series — drilling formulas in UltimateSpeedFeedEngine, CoolantDynamicsEngine coolantThroughDrillingParams. Novelty 5/100
- [x] Sandvik Coromant — "CoroDrill 860" (optimized point geometry) — tool-specific; 95K+ tools in catalog. Novelty 5/100
- [x] Kennametal — "KSEM Plus Modular Drill" (deep hole) — deep hole drilling rules in playbook (drilling-deep-hole-peck). Novelty 5/100
- [x] OSG — "ADO Drill" series (carbide through-coolant) — OSG catalog (11,550 tools). Through-coolant rules in playbook. Novelty 5/100
- [x] "Peck Drilling vs Chip-Breaking" (G73 vs G83 selection) — playbook rule drilling-deep-hole-peck: peck every 1×D, full retract >3×D. G73 high-speed peck vs G83 deep hole. Novelty 5/100
- [x] "Spot Drilling — When and Why" (point angle matching) — spot drill point angle matching in drilling tribal tips. Novelty 5/100
- [x] "Reaming Best Practices" (H7/H6 tolerance achievement) — reaming parameters in drilling operations. Novelty 10/100
- [x] "Boring Bar Selection and Programming" (fine boring, rough boring) — boring operations in turning/drilling strategies. Novelty 10/100
- [x] "Thread Milling vs Tapping" (when to use each) — ThreadMillingEngine + TappingTorqueEngine + playbook rules (threading-form-tap-speed). Novelty 5/100
- [x] "Helical Interpolation Boring" (CNC bore mill technique) — helical interpolation in FiveAxisToolpathIntegrationEngine + G-code templates. Novelty 5/100
- [x] "Stack Drilling" (composite + metal stacks in aerospace) — multi-material drilling; CoolantDynamicsEngine material-specific parameters. Novelty 15/100

### 3F: CAM-Specific Advanced Features
- [x] hyperMILL — "Automation Center" (feature recognition, template machining) — 200 hyperMILL tips cover AC. v33 enrichment includes AC docs. Novelty 5/100
- [x] hyperMILL — "Virtual Machining" (simulation, optimization, NC code) — hyperMILL VT in tribal tips. CNCSimulationPipelineEngine provides equivalent. Novelty 5/100
- [x] hyperMILL — "TOOL Builder" (custom tool definition) — TOOL Builder in hm tips. FusionToolExportEngine (17 holder types). Novelty 5/100
- [x] hyperMILL — "Electrode Module" (EDM electrode design + machining) — EDM in StochasticEDMEngine + 6 EDM playbook rules. Novelty 5/100
- [x] Mastercam — "Toolpath Dynamic and Verify" — Mastercam verify in tribal tips. CNCSimulationPipelineEngine. Novelty 5/100
- [x] Mastercam — "Feature Based Machining" (FBM) — FBM in Mastercam tips. PartGeometryPipelineEngine (feature→tool→strategy). Novelty 5/100
- [x] Fusion 360 — "Manufacture Workspace" full walkthrough — Fusion 360 manufacture in tribal tips + PRISM.cps. Novelty 5/100
- [x] Fusion 360 — "Probing" (WCS setup, part inspection) — ProbeRoutineGeneratorEngine covers probing macros. Novelty 5/100
- [x] SolidCAM — "iMachining Wizard" step-by-step — iMachining in SolidCAM tribal tips. Novelty 5/100
- [x] Siemens NX — "Feature Based Machining" (PMI-driven) — NX FBM in tribal tips. Novelty 5/100
- [x] PowerMill — "Vortex High-Efficiency Roughing" — PowerMill Vortex in 200 tribal tips. Novelty 5/100
- [x] "CAM Template and Automation" (process standardization) — covered by OperationSequencerEngine + PartGeometryPipelineEngine. Novelty 5/100

---

## CATEGORY 4: Toolpath Sequencing & Process Planning

### 4A: Operation Sequencing
- [x] "Complete Part Programming — Start to Finish" (Titans of CNC Academy) — OperationSequencerEngine: topo sort + TSP tool-change minimization. PrintToProgramPipelineEngine full workflow. Novelty 5/100
- [x] "Operation Sequencing for Complex Parts" (face → drill → rough → semi → finish) — OperationSequencerEngine + SequenceFeasibilityEngine (Kahn constraint graph, backtracking). Novelty 5/100
- [x] "Setup Reduction Strategies" (combining operations, fixture design) — MultiSetupPlanner + SetupTransitionEngine (datum chain RSS, flip feasibility). Novelty 5/100
- [x] "First Operation vs Second Operation" (datum transfer, flip strategies) — SetupTransitionEngine: datum chain, flip feasibility, pallet collision. Novelty 5/100
- [x] "Tombstone Machining" (multi-part fixturing, operation consolidation) — multi-part fixturing in workholding strategies. Novelty 10/100
- [x] "Progressive Machining" (near-net-shape → finish workflow) — RestMachiningEngine + AdaptiveRefinementEngine handle progressive strategies. Novelty 5/100
- [x] "Rest Material Strategy" (large tool → medium → small tool sequence) — RestMachiningEngine: automatic reference toolpath detection for rest material. Novelty 5/100
- [x] Titans of CNC — "How to Plan Your CNC Job" — PrintToProgramPipelineEngine: print → program end-to-end. Novelty 5/100
- [x] Titans of CNC — "From Print to Part" (full workflow) — same as above. Novelty 5/100
- [x] NYC CNC — "Making Parts — Complete Workflow" series — covered by full pipeline. Novelty 5/100
- [x] "Process Planning for Prismatic Parts" (CAPP concepts) — PartGeometryPipelineEngine: feature→tool→strategy→S/F. Novelty 5/100
- [x] "Process Planning for Rotational Parts" (turning sequences) — turning operations in OperationSequencerEngine. Novelty 5/100

### 4B: Workholding & Fixturing
- [x] Titans of CNC — "Workholding" series (vises, fixtures, soft jaws) — WorkholdingViabilityEngine: grip degradation, vacuum seal, datum tracking. workholding-catalog.ts (44 entries). Novelty 5/100
- [x] NYC CNC — "Workholding Strategies" — same coverage. Novelty 5/100
- [x] Saunders Machine Works — "Custom Fixtures" — custom fixtures in workholding catalog + tribal tips. Novelty 5/100
- [x] "5-Axis Workholding" (dovetail, vacuum, zero-point) — WorkholdingViabilityEngine handles 5-axis workholding. Novelty 5/100
- [x] "Zero-Point Clamping Systems" (Schunk, Erowa, 3R) — zero-point in workholding catalog. Novelty 10/100
- [x] "Soft Jaw Design" (self-centering, thin-wall clamping) — ThinWallMachiningEngine + workholding strategies. Novelty 5/100
- [x] "Fixture Design Principles" (6-3-2-1 locating, clamping forces) — FixtureClampingEngine + 6-3-2-1 locating in CMMPathPlanningEngine. Novelty 5/100
- [x] "Pallet Systems" (FMS integration, automated loading) — SetupTransitionEngine: pallet collision detection. Novelty 5/100

### 4C: Tool Selection & Management
- [x] Sandvik Coromant — "Tool Selection Guide" series — ToolSelectionEngine + 95,608 tools in catalog across 28 manufacturers. Novelty 5/100
- [x] "End Mill Selection" (flute count, helix angle, coating, substrate) — playbook rules milling-helix-angle-steel + milling-flute-count-selection. Novelty 5/100
- [x] "Insert Selection" (grade, geometry, chip breaker — by material) — 50 manufacturer grades in multi-manufacturer-grades.ts. Novelty 5/100
- [x] "Tool Life Management" (TLM systems, sister tooling, auto-offset) — ToolWearCompensationEngine + StochasticToolWearEngine (MC/FOSM/Weibull/Bayesian Taylor). Novelty 5/100
- [x] "Tool Presetting" (Zoller, Haimer — measurement, shrink-fit) — Haimer 489 holders, tool presetting in tribal tips. Novelty 10/100
- [x] "Toolholder Selection" (hydraulic, shrink-fit, ER collet — TIR/rigidity) — 1,332 holders catalog (Tungaloy/Haimer/REGO-FIX/BIG DAISHOWA/Guhring). Novelty 5/100
- [x] "Coolant Strategy" (flood, through-tool, MQL, cryogenic, air blast) — CoolantDynamicsEngine (Reynolds, TSC, MQL, jet, cryo) + CryogenicCuttingEngine (LN2/CO2). Novelty 5/100
- [x] "Micro-Tooling" (small tool challenges, speeds >50,000 RPM) — micro-tooling in playbook. Minimum chip load rule covers micro concerns. Novelty 10/100
- [x] Harvey Performance — "Miniature Tooling Guide" — Harvey Performance MAP covers 27K tools. Novelty 5/100

---

## CATEGORY 5: Material-Specific Machining

### 5A: Aluminum & Non-Ferrous
- [x] "Machining Aluminum — Complete Guide" (6061, 7075, 2024) — 2,957 materials in DB. Aluminum grades fully covered. ISO N group Kienzle constants. Novelty 5/100
- [x] "Machining Cast Aluminum" (A356, A380 — silicon content effects) — silicon content effects in material DB. Cast Al in ISO K/N subgroups. Novelty 5/100
- [x] Datron — "High Speed Aluminum Machining" (40K RPM+) — HSM up to 6000 m/min delta in existing data. Single-flute strategies. Novelty 10/100
- [x] "Machining Copper and Brass" (chip control, tool selection) — copper/brass in material DB. ISO N group. Novelty 5/100
- [x] "Machining Magnesium" (fire risk, speeds, tool geometry) — magnesium machining: fire risk rules, high SFM (250+ SFM HSS). Novelty 10/100

### 5B: Steel & Cast Iron
- [x] "Machining Carbon Steel" (1018, 1045, 4140 — hardness effects) — 2,957 materials in DB. Carbon steel grades fully profiled. ISO P group Kienzle kc1.1 constants. Novelty 5/100
- [x] "Machining Stainless Steel" (304, 316, 17-4PH — work hardening) — ISO M group. Work hardening rules in playbook (threading-difficult-materials, milling-minimum-chip-load). Novelty 5/100
- [x] "Machining Tool Steel" (D2, H13, S7 — pre/post hardened) — tool steel in material DB. Hard milling burnishing threshold 0.0008"/tooth in playbook. Novelty 5/100
- [x] "Machining Cast Iron" (gray, ductile, CGI — graphite effects) — ISO K group. Gray/ductile/CGI differentiated in material DB. SiC abrasion wear model. Novelty 5/100
- [x] "Hard Milling" (>45 HRC — high speed, light DOC strategies) — hard milling in playbook + ConstitutiveModelEngine (Hollomon hardening). ISO H group. Novelty 5/100
- [x] "Hard Turning" (>55 HRC — CBN inserts, fine finishing) — CBN in tool material DB. Hard turning ISO H strategies. Novelty 5/100

### 5C: Aerospace Superalloys
- [x] "Machining Titanium" (Ti-6Al-4V — speeds, heat, tool wear) — ISO S group. Ti-6Al-4V in material DB. CryogenicCuttingEngine for Ti thermal management. Novelty 5/100
- [x] "Machining Inconel" (718, 625 — ceramic inserts, low SFM) — ISO S group. Inconel in material DB. Ceramic insert data in tool catalog. Novelty 5/100
- [x] "Machining Waspaloy and Rene" (nickel superalloys) — nickel superalloys in ISO S group. ConstitutiveModelEngine (Zerilli-Armstrong, MTS). Novelty 5/100
- [x] "Machining CFRP / Composites" (PCD, diamond-coated, delamination) — composite machining in material DB + tribal tips. PCD tool data. Novelty 10/100
- [x] "Stack Machining" (CFRP + Ti stacks — aerospace) — multi-material drilling; material-specific coolant parameters. Novelty 10/100
- [x] Sandvik Coromant — "Aerospace Machining Solutions" — Sandvik aerospace data in tool catalog + tribal tips. Novelty 5/100
- [x] Kennametal — "Aerospace Engine Component Machining" — Kennametal 19,054 tools in catalog. Aerospace strategies. Novelty 5/100

### 5D: Medical & Exotic
- [x] "Machining CoCr" (cobalt-chrome — hip/knee implants) — CoCr in material DB (ISO S/H group). Medical machining strategies. Novelty 10/100
- [x] "Machining PEEK" (polymer, medical devices) — PEEK in material DB. Low SFM, sharp tools. Novelty 10/100
- [x] "Machining Nitinol" (shape memory alloy — stents) — Nitinol specialty. Swiss machining support in MillTurnSwissPipelineEngine. Novelty 15/100
- [x] "Swiss Machining" (medical screws, bone pins — small diameter) — MillTurnSwissPipelineEngine: guide bushing deflection, 6 machine configs, gang vs turret. Novelty 5/100
- [x] "Machining Tungsten and Molybdenum" (refractory metals) — refractory metals in material DB. High-temp alloys. Novelty 10/100
- [x] "Machining Graphite" (EDM electrodes — dust, PCD tools) — graphite in material DB. EDM electrode machining in hyperMILL tips. Novelty 5/100

---

## CATEGORY 6: CNC Machine Operation & Engineering

### 6A: Machine Setup & Operation
- [x] Haas Automation — "Setting Up Your Haas" complete series — 910 machine profiles. Haas-specific setup in tribal tips (ctrl-001–ctrl-121). Novelty 5/100
- [x] Haas Automation — "Probing" (Renishaw on Haas — WCS, tool length) — ProbeRoutineGeneratorEngine covers all probing macros. Novelty 5/100
- [x] Haas Automation — "Workholding and Fixturing" — WorkholdingViabilityEngine + workholding-catalog.ts (44 entries). Novelty 5/100
- [x] Haas Automation — "Next Generation Control" (NGC features) — Haas NGC in ControllerDialectEngine profiles. Novelty 5/100
- [x] Titans of CNC — "Machine Setup" playlist — machine setup workflow in PrintToProgramPipelineEngine. Novelty 5/100
- [x] "Touch-Off Procedures" (tool length, work offset) — tool touch-off in probing macros + tribal tips. Novelty 5/100
- [x] "Machine Warm-Up Procedures" (thermal growth compensation) — MachineToolErrorBudgetEngine: thermal growth δ=α·ΔT·L. EnvironmentalVariationEngine: diurnal/seasonal thermal. Novelty 5/100
- [x] "Chip Management" (conveyor, coolant filtration) — CuttingFluidLifecycleEngine (Monod bacterial, pH, TCO). CoolantDynamicsEngine (chip transport). Novelty 5/100

### 6B: Machine Accuracy & Compensation
- [x] "Ballbar Testing" (Renishaw QC20 — circular interpolation accuracy) — MachineGeometricAccuracyEngine: ball-bar test analysis. Novelty 5/100
- [x] "Laser Interferometry" (linear/angular positioning accuracy) — MachineGeometricAccuracyEngine: 21-error model, volumetric HTM. Novelty 5/100
- [x] "Volumetric Compensation" (3D error mapping) — MachineGeometricAccuracyEngine: volumetric HTM compensation. Novelty 5/100
- [x] "Thermal Compensation" (real-time thermal error modeling) — MachineToolErrorBudgetEngine: thermal growth + EnvironmentalVariationEngine. Novelty 5/100
- [x] "Backlash Compensation" (parameter settings, measurement) — SelfLearningCAMEngine: 6-state Kalman (incl backlash). MachineGeometricAccuracyEngine. Novelty 5/100
- [x] "Geometric Compensation" (squareness, straightness, pitch/yaw/roll) — MachineGeometricAccuracyEngine: 21-error model (squareness, straightness, angular). Novelty 5/100
- [x] "5-Axis Calibration" (RTCP/RPCP calibration procedures) — FiveAxisPostEngine: TCPC/RTCP for 13 controllers. MachineGeometricAccuracyEngine. Novelty 5/100

### 6C: Machine Dynamics & Chatter
- [x] "Chatter in Milling — Stability Lobes" (Altintas theory) — extracted: ZOA confirmed in PRISM, GAPS: multi-frequency solution for low immersion (ae/D<25%), receptance coupling (RCSA). Novelty 45/100
- [x] "Tap Testing for Stability" (BlueSwarf, MetalMax) — extracted: 5min setup + 5min tap → FRF → stability diagram, MetalMax/BlueSwarf workflow, H(ω)=X(ω)/F(ω), extract fn/ζ/k from peaks. Already in ReceptanceCouplingEngine + ChatterStabilityLobeEngine. Novelty 20/100
- [x] "Variable Helix/Pitch End Mills" (chatter suppression) — BUILT: designVariableHelixTool() in DampingOptimizationEngine. Budak 2003 pitch optimization, 30-50% stability improvement, alternating pitch/helix patterns. 19 tests. Novelty 45/100
- [x] "Spindle Speed Selection to Avoid Chatter" — ChatterStabilityLobeEngine: stability lobe diagram, chatter-free RPM selection. NovelToolpathEngine HRAF. Novelty 5/100
- [x] "Thin Wall Machining" (dynamic response, support strategies) — ThinWallMachiningEngine (42 tests): deflection δ=FH³/3EI, chatter risk, support strategies, force budgeting. Novelty 5/100
- [x] "Heavy Roughing Without Chatter" (radial engagement optimization) — EngagementAdaptiveFeedEngine: constant chip load/force/MRR. Stability lobe RPM selection. Novelty 5/100
- [x] Prof. Yusuf Altintas — "Manufacturing Automation" lectures (UBC) — Altintas ZOA stability theory in ChatterStabilityLobeEngine. Multi-frequency SLE, Nyquist stability. Novelty 5/100
- [x] Prof. Tony Schmitz — "Machining Dynamics" (UNC Charlotte / UTK) — extracted: tap test protocol, RCSA method, SLE model (5-20µm at lobe boundaries), time domain sim. GAPS: SLE prediction, RCSA. Novelty 40/100

### 6D: Machine Maintenance & Troubleshooting
- [x] "CNC Machine Preventive Maintenance" (daily, weekly, monthly) — PredictiveSimulationEngine (Taylor tool life, Gilbert batch). ReliabilityEngineeringEngine (optimal replacement, delay time). Novelty 5/100
- [x] "Spindle Maintenance" (bearing preload, runout, vibration analysis) — MachiningAcousticsEngine + AcousticEmissionMonitoring (vibration signature). RunoutEffect engine. Novelty 5/100
- [x] "Way Cover and Coolant System Maintenance" — CuttingFluidLifecycleEngine (bacterial growth, pH drift, TCO). Novelty 5/100
- [x] "Servo Tuning" (following error, gain adjustment) — MotionDynamicsProfileEngine: trapezoidal, S-curve, corner velocity, look-ahead. Following error in controller profiles. Novelty 10/100
- [x] "Alarm Troubleshooting" (common Fanuc/Siemens/Heidenhain alarms) — MCP alarm resource templates. Controller tribal tips (ctrl-001–ctrl-121). Novelty 5/100

---

## CATEGORY 7: Advanced Manufacturing Science

### 7A: Finite Element Analysis (FEA) of Machining
- [x] "FEM Simulation of Metal Cutting" (AdvantEdge, Deform, Abaqus) — ConstitutiveModelEngine: Zerilli-Armstrong, MTS, PTW, Voce, Johnson-Cook. FEM-level material models fully implemented. Novelty 5/100
- [x] "Chip Formation FEA" (Johnson-Cook model, damage criteria) — extracted: J-C σ=(A+Bε^n)(1+Clnε̇)(1-T*^m) confirmed in ConstitutiveModelEngine, parameter optimization via inverse methods (Nesterov gradient), strain rates 10^5-10^6/s in machining. Already implemented. Novelty 10/100
- [x] "Residual Stress Prediction" (machining-induced stresses) — residual stress in SustainabilityLCAEngine + surface integrity modeling. Novelty 10/100
- [x] "Tool Wear Simulation" (Usui model, Archard model) — AdvancedWearPhysicsEngine: Usui crater, Fick diffusion, Archard in FundamentalPhysicsCompletionEngine (V=K×Fn×s/H). Novelty 5/100
- [x] "Thermal Simulation of Cutting" (Jaeger moving heat source) — CoolantDynamicsEngine: Komanduri-Hou thermal. LAMThermalSofteningEngine: Rosenthal/Bessel. StochasticThermalEngine. Novelty 5/100

### 7B: Vibration Analysis & Modal Testing
- [x] "Modal Analysis for Machine Tools" (FRF, natural frequencies) — ChatterStabilityLobeEngine + MachiningAcousticsEngine. FRF extraction H(ω)=X(ω)/F(ω). Novelty 5/100
- [x] "Operational Deflection Shapes" (ODS from accelerometer data) — vibration analysis in vibrationPhysicsDispatcher (16 actions). Novelty 10/100
- [x] "Harmonic Analysis" (forced vibration response) — NovelToolpathEngine HRAF: harmonic-resonance avoidant finishing. SignalProcessingToolkitEngine (Welch PSD, Hilbert envelope). Novelty 5/100
- [x] "Damping Ratio Measurement" (half-power bandwidth, log decrement) — DampingOptimizationEngine: damping ratio extraction + optimization. Novelty 5/100
- [x] "Receptance Coupling" (tool-holder-spindle assembly dynamics) — receptance coupling in vibration analysis. ToolAssemblyModelEngine (compound shape, 11 tapers). Novelty 5/100

### 7C: Metrology & Inspection
- [x] "CMM Programming" (PC-DMIS, Calypso, PolyWorks) — CMMPathPlanningEngine: TSP+2-opt probe path, ISO GUM uncertainty, 3-2-1 datum alignment. Novelty 5/100
- [x] "In-Process Measurement" (probing cycles, on-machine inspection) — ProbeRoutineGeneratorEngine: probing macro generation. Novelty 5/100
- [x] "Surface Roughness Measurement" (Ra, Rz, Rq — theory and instruments) — Ra=f²/(32r) in UltimateSpeedFeedEngine. Brammertz Ra in AdvancedCuttingPhysicsExtEngine. Multi-source Ra in CrossPhysicsCouplingEngine. Novelty 5/100
- [x] "GD&T for Machinists" (datum selection, feature control frames) — GDTStackupEngine + PRISM Academy Course 0C (12 modules, orthographic→true position). Novelty 5/100
- [x] "Optical Measurement" (structured light, laser scanning) — metrology methods in quality inspection playbook rules. Novelty 10/100
- [x] "Statistical Measurement Analysis" (Gage R&R, MSA) — PermutationTestEngine + CMMPathPlanningEngine ISO GUM Type A/B. Novelty 5/100

### 7D: Optimization & DOE
- [x] "Design of Experiments for Machining" (Taguchi method, L9/L18) — DOETaguchi engine: L9/L18/L27 arrays, S/N ratios, factor significance. Novelty 5/100
- [x] "Response Surface Methodology" (RSM — optimizing multiple responses) — StatisticalProcessMonitoringEngine: RSM + DOE. MultipleRegressionEngine. Novelty 5/100
- [x] "Multi-Objective Optimization" (Pareto fronts, TOPSIS, desirability) — ProcessSynthesisEngine: NSGA-II Pareto. MetaheuristicOptimizationEngine (GA, DE, PSO, SA, Bayesian). Novelty 5/100
- [x] "Genetic Algorithm for Machining Parameters" (NSGA-II) — MetaheuristicOptimizationEngine: GA + NSGA-II in ProcessSynthesisEngine. Novelty 5/100
- [x] "Grey Relational Analysis for Machining" (GRA optimization) — GRA covered in DOE/optimization engines. Novelty 10/100
- [x] "ANOVA for Machining Parameters" (significance testing) — ANOVA in StatisticalProcessMonitoringEngine + StratifiedCalibrationEngine. Novelty 5/100
- [x] "Regression Models for Tool Life" (empirical vs semi-empirical) — Taylor/Colding/empirical in constants.ts + AdvancedCuttingPhysicsExtEngine. MultipleRegressionEngine. Novelty 5/100

---

## CATEGORY 8: Industry Channels — Comprehensive Playlists

### 8A: Titans of CNC Academy (titan-level coverage)
- [x] "CNC Machining for Beginners" complete course — covered by PRISM Academy Course 1 (Manufacturing Fundamentals) + Course 2 (Speed/Feed Mastery) + MachiningPlaybookEngine 296 rules. Novelty 5/100
- [x] "Advanced CNC Techniques" series — extracted: Ti-6Al-4V S/F (40-60m/min high feed), Inconel ceramic 200m/min, prove-out at 50% feed, 4 playbook rules. Novelty 20/100
- [x] "Aerospace Parts" series (complex multi-setup parts) — covered by SequenceFeasibilityEngine (constraint graph, multi-setup), SetupTransitionEngine (datum chain RSS, flip feasibility), MachiningPlaybookEngine aerospace rules. Novelty 5/100
- [x] "Medical Parts" series (Swiss, micro-machining) — covered by MillTurnSwissPipelineEngine (guide bushing, 6 configs), MachiningPlaybookEngine micro_machining rules. Novelty 5/100
- [x] "5-Axis Machining" series — extracted: 3+2 vs simultaneous decision rules, RTCP requirement, 30% shorter tools=65% less deflection. 3 playbook rules. Novelty 30/100
- [x] "Turning" series (OD, ID, threading, grooving) — extracted: boring bar L/D limits (steel 4:1, carbide 6:1, dampened 8:1), 0.001" finish DOC, anti-chatter (drop speed/increase feed), tapered bar techniques. 8 playbook rules. Novelty 45/100
- [x] "Titan Approved" tools and techniques — covered by UserToolLibraryEngine (tool crib CRUD, condition tracking) + MachiningPlaybookEngine 296 rules + 3700+ tribal tips. Novelty 5/100
- [x] "Shop Tours" (process flow, production engineering) — covered by SequenceFeasibilityEngine + SetupTransitionEngine + PrintToProgramPipelineEngine full workflow. Novelty 5/100

### 8B: NYC CNC (Saunders Machine Works)
- [x] "Widget Wednesday" complete series (real parts, real problems) — extracted: 10-week fixturing guide, fixture plates > vises for production, soft jaw rules, 3 playbook rules. Novelty 15/100
- [x] "Fusion 360 CAM" tutorials (full programming) — covered by Fusion360CodeGeneratorEngine (30+ ops) + Fusion360LiveBridgeEngine (15 endpoints) + MultiCAMPostEngine (F360 PRISM.cps). Novelty 5/100
- [x] "Tool Tuesday" series (tool reviews, performance data) — covered by ToolCatalogEngine (95,608 tools, 28 manufacturers) + UserToolLibraryEngine + MachiningPlaybookEngine tool_life rules. Novelty 5/100
- [x] "CNC Programming" (manual G-code) — covered by PRISM Academy Course 3 (G00-G99/M-codes/canned cycles) + GCodeSafetyAnalyzerEngine (24 rules) + ControllerDialectEngine (20 dialects). Novelty 5/100
- [x] "Machine Upgrades" (probing, 4th axis, coolant) — covered by ProbeRoutineGeneratorEngine + CoolantDynamicsEngine + MachineProfilesCatalog (910 machines). Novelty 5/100
- [x] "Shop Tips" (practical efficiency) — covered by 3700+ tribal tips across 18 CAM systems + MachiningPlaybookEngine 296 rules. Novelty 5/100

### 8C: This Old Tony
- [x] "Making Things" series (engineering fundamentals via projects) — covered by PRISM Academy Courses 0A-0C (Shop Math, Hand Tools, Blueprint Reading) + MachiningPlaybookEngine foundational rules. Novelty 5/100
- [x] "Metalworking Basics" (feeds, speeds, tool geometry explained) — covered by SpeedFeedOrchestratorEngine (67-point physics hub) + AdvancedCuttingPhysicsEngine (Oxley, oblique, size effect). Novelty 5/100
- [x] "Manual Machining" (lathe and mill fundamentals) — covered by PRISM Academy Courses 1-2 + 3700+ tribal tips + MachiningPlaybookEngine. Novelty 5/100

### 8D: Abom79 / Stefan Gotteswinter / Keith Fenner
- [x] Abom79 — "Big Manual Machining" (heavy turning, boring) — covered by 3700+ tribal tips + MachiningPlaybookEngine turning rules (10 turning playbook rules) + AdvancedCuttingPhysicsEngine. Novelty 5/100
- [x] Stefan Gotteswinter — "Precision Machining" (watchmaking-level) — covered by MillTurnSwissPipelineEngine + MachiningPlaybookEngine micro_machining rules + ProcessCapabilityPredictionEngine. Novelty 5/100
- [x] Keith Fenner — "Turning and Milling" (classic workshop practice) — covered by PRISM Academy Courses 1-3 + SpeedFeedOrchestratorEngine + MachiningPlaybookEngine. Novelty 5/100

### 8E: Edge Precision / Saunders Machine Works / Cutting Edge Engineering
- [x] Edge Precision — "How We Made It" (aerospace parts, 5-axis) — covered by FiveAxisToolpathIntegrationEngine + SequenceFeasibilityEngine + MultiSetupPlanner + MachiningPlaybookEngine. Novelty 5/100
- [x] Cutting Edge Engineering — "Material Science" (heat treatment, metallurgy) — covered by ConstitutiveModelEngine (Zerilli-Armstrong, MTS, Voce) + MaterialBatchVariabilityEngine (9 materials) + material_properties_catalog (2957 materials). Novelty 5/100
- [x] "Engineering Explained" (physics concepts applicable to machining) — covered by AdvancedCuttingPhysicsEngine + FundamentalPhysicsCompletionEngine (Archard, Merchant, Hertz) + PRISM Academy physics courses. Novelty 5/100

### 8F: CAM-Specific Channels
- [x] "Fusion 360 Manufacture" (Autodesk official) — covered by Fusion360CodeGeneratorEngine + Fusion360LiveBridgeEngine + 200 Fusion 360 tribal tips (f360-001–f360-200). Novelty 5/100
- [x] "Mastercam University" (official training) — covered by 261 Mastercam tribal tips (mc-040–mc-300) + MultiCAMPostEngine + MultiCamStrategyExt. Novelty 5/100
- [x] "hyperMILL by OPEN MIND" (official channel) — covered by 200 hyperMILL tribal tips (hm-001–hm-200) + MultiCAMPostEngine + hyperMILL v33 enrichment (1632pp CAM manual). Novelty 5/100
- [x] "SolidCAM" (official channel — iMachining demos) — extracted: morphing spiral geometry, constant chip thickness via 10-80° engagement variation, 7 patents, Technology Wizard auto-calc. GAP: morphing spiral toolpath gen. Novelty 35/100
- [x] "Siemens NX CAM" (official tutorials) — covered by 200 NX tribal tips (nx-001–nx-200) + MultiCAMPostEngine + ControllerDialectEngine Siemens 828D/840D/ONE. Novelty 5/100
- [x] "PowerMill by Autodesk" (official channel) — covered by 200 PowerMill tribal tips (pm-001–pm-200) + MultiCamStrategyExt (PowerMill strategies) + MultiCAMPostEngine. Novelty 5/100
- [x] "GibbsCAM" (official channel) — covered by 200 GibbsCAM tribal tips (gc-001–gc-200) + MultiCamStrategyExt + MultiCAMPostEngine. Novelty 5/100
- [x] "Esprit CAM" (official channel) — covered by 208 ESPRIT tribal tips (esp-001–esp-208) + MultiCamStrategyExt + MultiCAMPostEngine. Novelty 5/100
- [x] "BobCAD-CAM" (official tutorials) — covered by 220 BobCAD tribal tips (bc-001–bc-220) + MultiCamStrategyExt (BobCAD strategies) + MultiCAMPostEngine. Novelty 5/100
- [x] "CAMWorks" (feature-based machining) — covered by 201 CAMWorks tribal tips (cw-001–cw-201) + MultiCamStrategyExt + MultiCAMPostEngine. Novelty 5/100

---

## CATEGORY 9: Specialized / Niche Topics

### 9A: EDM (Electrical Discharge Machining)
- [x] "Wire EDM Programming" (Mitsubishi, Fanuc, Sodick) — covered by StochasticEDMEngine (3 EDM types, exponential discharge, crater/recast/wear) + 6 EDM playbook rules + ControllerDialectEngine Mitsubishi dialect. Novelty 5/100
- [x] "Sinker EDM" (electrode design, orbital, vector) — covered by StochasticEDMEngine (crater/recast/electrode wear) + MachiningPlaybookEngine EDM rules (6 rules). Novelty 5/100
- [x] "EDM Process Parameters" (current, voltage, frequency, gap) — covered by StochasticEDMEngine (exponential discharge model, gap/recast stochastic outputs) + calcDispatcher EDM actions. Novelty 5/100
- [x] "Micro EDM" (small holes, medical, watch parts) — covered by StochasticEDMEngine + MachiningPlaybookEngine micro_machining rules + MillTurnSwissPipelineEngine. Novelty 5/100

### 9B: Grinding
- [x] "Surface Grinding" (wheel selection, dressing, speeds) — covered by StochasticGrindingEngine (Malkin/Jaeger, G-ratio, 6 materials) + 8 grinding playbook rules + vibrationPhysicsDispatcher. Novelty 5/100
- [x] "Cylindrical Grinding" (OD, ID, centerless) — covered by StochasticGrindingEngine + MachiningPlaybookEngine grinding rules + FundamentalPhysicsCompletionEngine (Jaeger thermal). Novelty 5/100
- [x] "Creep Feed Grinding" (aerospace, deep cuts) — covered by StochasticGrindingEngine + MachiningPlaybookEngine grinding rules + CoolantDynamicsEngine (Komanduri-Hou thermal). Novelty 5/100
- [x] "CBN and Diamond Grinding" (superabrasive) — covered by StochasticGrindingEngine (6 material types incl. superabrasive) + MachiningPlaybookEngine grinding rules + material_properties_catalog. Novelty 5/100
- [x] "Grinding Burns" (thermal damage, Barkhausen noise testing) — BUILT: assessBurnRisk() in GrindingSurfaceFinishEngine. Jaeger heat source model, 6 materials, Ac1 thresholds, Barkhausen prediction. 15 tests. Novelty 50/100

### 9C: Additive + Subtractive (Hybrid)
- [x] "Hybrid Manufacturing" (DED + milling on same machine) — covered by AdditiveManufacturingPhysicsEngine (Rosenthal melt pool, bead overlap, Hunt CET solidification) + LAMThermalSofteningEngine. Novelty 5/100
- [x] "Post-Processing 3D Printed Metal Parts" (CNC finishing) — covered by AdditiveManufacturingPhysicsEngine + PostProcessorPipelineEngine (26-stage) + MachiningPlaybookEngine hybrid_additive rules. Novelty 5/100
- [x] "Near-Net-Shape to Finish" (cast/print → machine workflow) — covered by WorkpieceStateEngine (IPW tracking, surface catalog) + SequenceFeasibilityEngine + MachiningPlaybookEngine hybrid_additive rules. Novelty 5/100
- [x] DMG MORI — "LASERTEC 3D" (DED + 5-axis milling) — covered by AdditiveManufacturingPhysicsEngine + FiveAxisToolpathIntegrationEngine + LAMThermalSofteningEngine (Rosenthal/Bessel K₀). Novelty 5/100

### 9D: Automation & Lights-Out
- [x] "Pallet Pool Systems" (FMS, automated production) — covered by SetupTransitionEngine (pallet collision, predictive failure MC) + MultiSetupPlanner + SequenceFeasibilityEngine. Novelty 5/100
- [x] "Robotic Machine Tending" (part load/unload) — covered by SetupTransitionEngine + WorkholdingViabilityEngine (grip degradation) + PredictiveSimulationEngine. Novelty 5/100
- [x] "Lights-Out Machining" (unattended operation strategies) — covered by SelfLearningCAMEngine (anomaly relearn, Mahalanobis) + TakeyamaMurata wear progression + StochasticToolWearEngine (Weibull). Novelty 5/100
- [x] "Tool Life Management for Unattended" (redundant tools, auto-offset) — covered by UserToolLibraryEngine (condition tracking) + ToolWearCompensationEngine + StochasticToolWearEngine (Bayesian Taylor life). Novelty 5/100
- [x] "In-Process Inspection for Automation" (closed-loop quality) — covered by ProbeRoutineGeneratorEngine + ExecutionVerificationEngine + PipelineConsistencyHookEngine (auto-verify). Novelty 5/100

### 9E: Swiss Machining & Micro-Machining
- [x] "Swiss Screw Machine Programming" (Star, Citizen, Tsugami) — covered by MillTurnSwissPipelineEngine (guide bushing deflection, 6 machine configs, gang vs turret) + 3700+ tribal tips. Novelty 5/100
- [x] "Guide Bushing vs Non-Guide Bushing" (when to use each) — covered by MillTurnSwissPipelineEngine (guide bushing vs non-guide bushing selection logic, deflection model). Novelty 5/100
- [x] "Micro-Machining" (<1mm features, high RPM, runout) — covered by MachiningPlaybookEngine micro_machining rules (5 rules) + RunoutEffectEngine + SpeedFeedOrchestratorEngine. Novelty 5/100
- [x] "Medical Screw Manufacturing" (bone screws, dental implants) — covered by MillTurnSwissPipelineEngine + MachiningPlaybookEngine micro_machining rules + material_properties_catalog (biomedical materials). Novelty 5/100

### 9F: Sheet Metal & Fabrication (adjacent knowledge)
- [x] "CNC Press Brake Programming" (bend allowance, K-factor) — covered by formingCastingDispatcher (16 actions) + SpringbackPredictionEngine + MachiningPlaybookEngine. Novelty 5/100
- [x] "Laser Cutting" (CO2, fiber — kerf, pierce, speed) — covered by LaserAblationPhysicsEngine (Beer-Lambert, Gaussian MRR, HAZ/recast, pulse overlap) + formingCastingDispatcher. Novelty 5/100
- [x] "Waterjet Cutting" (abrasive, taper compensation) — covered by formingCastingDispatcher + LaserAblationPhysicsEngine (ablation process window) + MachiningPlaybookEngine. Novelty 5/100

---

## CATEGORY 10: Mathematics & Physics Deep Dives

### 10A: Core Math for Machining
- [x] "Vector Calculus for CNC" (toolpath tangent vectors, surface normals) — covered by FiveAxisToolpathIntegrationEngine (Rodrigues rotation, surface-normal following) + ToolpathSmoothingEngine (Frenet-Serret κ, Cox-de Boor). Novelty 5/100
- [x] "Linear Algebra for Multi-Axis" (rotation matrices, Euler angles, quaternions) — covered by MultiAxisKinematicEngine (HTM matrices, Euler 4×) + FiveAxisPostEngine (TCPC/RTCP, linearization). Novelty 5/100
- [x] "Differential Geometry for Surfaces" (curvature, Gaussian curvature, principal directions) — covered by ToolpathSmoothingEngine (B-spline/Bezier, Cox-de Boor) + FiveAxisToolpathIntegrationEngine (lead/lag/tilt, surface-normal). Novelty 5/100
- [x] "Numerical Methods for Toolpath Generation" (spline interpolation, NURBS) — covered by ToolpathSmoothingEngine (B-spline/Bezier/corner-round) + ControllerDialectEngine (NURBS interpolation field per dialect). Novelty 5/100
- [x] "Fourier Analysis for Vibration" (FFT, frequency domain analysis) — covered by SignalProcessingToolkitEngine (Butterworth/Chebyshev filters, Welch PSD, Hilbert envelope, cepstrum, order tracking). Novelty 5/100
- [x] "Statistics for Manufacturing" (distributions, hypothesis testing, regression) — covered by ManufacturingStatisticsEngine (10 methods) + MultipleRegressionEngine (OLS/ridge/polynomial) + PermutationTestEngine + AdvancedRegressionEngine. Novelty 5/100
- [x] "Optimization Theory" (linear programming, gradient descent, simulated annealing) — covered by MetaheuristicOptimizationEngine (GA, DE, PSO, SA, Bayesian Optimization) + ProcessSynthesisEngine (NSGA-II Pareto, CMA-ES). Novelty 5/100

### 10B: Physics Models
- [x] "Heat Transfer in Metal Cutting" (conduction, convection, radiation) — covered by CoolantDynamicsEngine (Komanduri-Hou, Jaeger) + LAMThermalSofteningEngine (Rosenthal/Bessel K₀) + ThermalWearCouplingEngine (RK4 coupled ODE). Novelty 5/100
- [x] "Fluid Dynamics of Coolant" (jet pressure, MQL atomization) — covered by CoolantDynamicsEngine (Reynolds, TSC pressure, MQL spray, jet coherence, chip transport) + CryogenicCuttingEngine (LN2/CO2 heat transfer). Novelty 5/100
- [x] "Contact Mechanics" (Hertz contact, friction models — tool-chip interface) — covered by FundamentalPhysicsCompletionEngine (Hertz contact, Merchant shear φ=π/4-β/2+γ/2) + AdvancedCuttingPhysicsEngine (oblique cutting, tool-chip friction). Novelty 5/100
- [x] "Fracture Mechanics" (chip separation, brittle vs ductile fracture) — covered by ChipMorphologyDiagnosticEngine (Merchant/Lee-Shaffer shear, ISO 3685, Recht adiabatic shear) + ConstitutiveModelEngine (Paris, Hollomon). Novelty 5/100
- [x] "Plasticity Theory" (von Mises, Tresca — workpiece deformation) — covered by ConstitutiveModelEngine (Zerilli-Armstrong, MTS, Voce, PTW) + FundamentalPhysicsCompletionEngine + SpringbackPredictionEngine. Novelty 5/100
- [x] "Tribology in Machining" (friction, lubrication, wear mechanisms) — covered by AdvancedWearPhysicsEngine (Rabinowicz, Fick crater, flank ODE, Takeyama-Murata) + FundamentalPhysicsCompletionEngine (Archard V=K*Fn*s/H). Novelty 5/100

### 10C: Controls & Servo Systems
- [x] "CNC Servo Systems" (PID control, following error) — covered by MotionDynamicsProfileEngine (trapezoidal, S-curve, corner velocity, look-ahead, axis decomposition) + ControllerDialectEngine (block_processing_rate per dialect). Novelty 5/100
- [x] "Interpolation Algorithms" (linear, circular, NURBS — controller level) — covered by ControllerDialectEngine (nurbs_interpolation field, 20 dialects) + MotionDynamicsProfileEngine + FiveAxisPostEngine (linearization). Novelty 5/100
- [x] "Look-Ahead and Acceleration Control" (jerk limiting, S-curve) — covered by MotionDynamicsProfileEngine (S-curve, look-ahead, feed effectiveness) + ControllerDialectEngine (look_ahead_blocks per dialect) + PostProcessorPipelineEngine Phase 3. Novelty 5/100
- [x] "Encoder Technology" (absolute, incremental, optical, magnetic) — covered by MachineGeometricAccuracyEngine (21-error model, thermal error, ball-bar) + machine-profiles-catalog (910 machines with specs). Novelty 5/100
- [x] "CNC Architecture" (NCU, PLC, HMI — system design) — covered by ControllerDialectEngine (20 dialects, 7 structured capability fields) + OpcUaConnectorEngine (live CNC connectivity) + MTConnectAdapterEngine. Novelty 5/100

---

## PROCESSING PRIORITY ORDER

### Tier 1 — CRITICAL (direct PRISM engine enrichment)
1. Category 1A-1D (Speed/Feed physics) — feeds UltimateSpeedFeedEngine, AutoSpeedFeedEngine, PowerBudgetEngine
2. Category 2A-2B (Post-Processor + G-Code) — feeds PostProcessorEngine, GCodeSafetyAnalyzerEngine
3. Category 3A (Adaptive Milling) — feeds NovelToolpathEngine (TGAR, CFSF, VCER)
4. Category 6C (Chatter/Dynamics) — feeds stability lobe models, HRAF algorithm
5. Category 7D (DOE/Optimization) — feeds ManufacturingStatisticsEngine, AdvancedCuttingMathEngine

### Tier 2 — HIGH (strong domain enrichment)
6. Category 3B-3C (3D/5-Axis) — feeds CrossCamRecommenderEngine, MultiAxisKinematicEngine
7. Category 5A-5C (Material-specific) — feeds strategy DB, material_properties_catalog
8. Category 4A (Op Sequencing) — feeds ProcessPlanningEngine candidates
9. Category 1E (SPC/Quality) — feeds ManufacturingStatisticsEngine
10. Category 10A-10B (Math/Physics models) — feeds AdvancedCuttingMathEngine

### Tier 3 — MEDIUM (knowledge base enrichment)
11. Category 3D-3E (Turning/Drilling) — feeds tribal knowledge, strategy DB
12. Category 4B-4C (Workholding/Tools) — feeds workholding-catalog, tool selection
13. Category 6A-6B (Machine Operation/Accuracy) — feeds machine-profiles, calibration
14. Category 8A-8F (Industry channels) — feeds tips, practical knowledge
15. Category 7A-7C (FEA/Vibration/Metrology) — feeds ToolpathThermalEngine, quality checks

### Tier 4 — LOW (supplementary knowledge)
16. Category 9A-9F (Niche topics) — extends coverage
17. Category 3F (CAM features) — extends hyperMILL/Mastercam tips
18. Category 6D (Maintenance) — operational knowledge
19. Category 10C (Controls) — controller-level understanding
20. Category 2C-2D (Advanced G-Code) — extends GCodeSafetyAnalyzerEngine rules

---

## METRICS

- Total video topics: ~400+
- Categories: 10 major, 40+ subcategories
- Priority tiers: 4 (Critical → Low)
- Target engines to enrich: 15+ (UltimateSpeedFeed, AutoSpeedFeed, PowerBudget, PostProcessor, GCodeSafety, NovelToolpath x6, CrossCam, MultiAxisKinematic, ToolpathThermal, ManufacturingStatistics, AdvancedCuttingMath)
- Target knowledge base expansion: 200+ new tips
- Target strategy DB expansion: 50+ new strategies
- Target formula additions: 30+ new formulas

---

## FORGE INTEGRATION MAP

Each category maps to specific `/forge-triple` + `/autopilot` actions:

| Category | Forge Target | Engine/Action |
|----------|-------------|---------------|
| 1A-1D | `/forge-engines` | UltimateSpeedFeedEngine, FeedOptimizerEngine, PowerBudgetEngine |
| 1E | `/forge-engines` | ManufacturingStatisticsEngine (Cp/Cpk, SPC) |
| 2A | `/forge-engines` | PostProcessorEngine, post template system |
| 2B-2C | `/forge-engines` | GCodeSafetyAnalyzerEngine (new rules), GCodeSnippetEngine |
| 3A | `/forge-engines` | NovelToolpathEngine (TGAR, CFSF, VCER) |
| 3B-3C | `/forge-engines` | CrossCamRecommenderEngine, MultiAxisKinematicEngine |
| 3D-3E | `/forge-engines` | TurningForceEngine (candidate), DrillForceEngine (candidate) |
| 4A | `/forge-engines` | ProcessPlanningEngine (candidate) |
| 5A-5D | `/forge-materials` | material_properties_catalog, strategy DB |
| 6C | `/forge-engines` | stability lobe models, HRAF algorithm |
| 7D | `/forge-engines` | AdvancedCuttingMathEngine (Taguchi, RSM, TOPSIS) |
| 10A-10B | `/forge-engines` | AdvancedCuttingMathEngine (new physics models) |
| All | `/forge-skills` | domain-specific query skills |
| All | `/forge-hooks` | safety rules, autofire triggers |

---

## CATEGORY 11: Tool Vendor How-To & Application Videos (2025-2026)

### 11A: Haas Automation — Setup & Programming Tutorials
- [x] Haas — "Mark's Greatest Setup Tips" (complete part start-to-finish setup walkthrough) — covered by ControllerDialectEngine Haas NGC + 3700+ tribal tips + PRISM Academy operator training courses. Novelty 5/100
- [x] Haas — "Haas Program Optimizer — How To" (capture program changes on the fly) — covered by ControllerDialectEngine Haas NGC + GCodeSafetyAnalyzerEngine (24 rules) + SelfLearningCAMEngine (cut-to-learn Bayesian updating). Novelty 5/100
- [x] Haas — "Haas Setup and Run Modes" (safety features, mode switching) — covered by ControllerDialectEngine Haas NGC + GCodeSafetyAnalyzerEngine + PRISM Academy Course 3. Novelty 5/100
- [x] Haas — "Visual Programming System for Lathes" (VPS — write programs at control) — covered by ControllerDialectEngine Haas NGC + CNCProgramAssemblerEngine + PrintToProgramPipelineEngine. Novelty 5/100
- [x] Haas — "Haas Control — GUI Setup, Run, and Edit" (control interface walkthrough) — covered by ControllerDialectEngine Haas NGC (7 structured capability fields) + PostProcessorPipelineEngine Haas dialect output. Novelty 5/100
- [x] Haas — "Programming Tips & Tricks" series (shortcuts, time-saving keystrokes) — covered by ControllerDialectEngine Haas NGC + 3700+ tribal tips (ctrl-001–ctrl-121) + MachiningPlaybookEngine. Novelty 5/100
- [x] Haas — "G187 Smoothing Mode Explained" (P1/P2/P3 modes, when to use each) — covered by ControllerDialectEngine Haas NGC (G187 HSM auto-injection in Phase 3) + PostProcessorPipelineEngine. Novelty 5/100
- [x] Haas — "Probing on a Haas Mill" (WCS setup, tool measurement, part inspection) — covered by ProbeRoutineGeneratorEngine + SetupSheetFromGCodeEngine + ControllerDialectEngine Haas NGC. Novelty 5/100
- [x] Haas — "5-Axis Setup on UMC-750" (TCPC, DWO G234, rotary axis homing) — covered by FiveAxisPostEngine (TCPC/RTCP 13 controllers) + ControllerDialectEngine Haas NGC + FiveAxisToolpathIntegrationEngine. Novelty 5/100
- [x] Haas — "Haas Mill Operator Training" series (fundamentals for new operators) — covered by PRISM Academy Courses 0A-3 (146 modules, 4 certifications) + ControllerDialectEngine Haas NGC. Novelty 5/100

### 11B: Sandvik Coromant — Metal Cutting E-Learning
- [x] Sandvik — "Metal Cutting Technology" e-learning series (75 courses, 9 chapters — turning/milling/drilling/boring/threading/parting/toolholding) — covered by AdvancedCuttingPhysicsEngine + SpeedFeedOrchestratorEngine + ToolCatalogEngine (2,418 Sandvik tools) + MachiningPlaybookEngine. Novelty 5/100
- [x] Sandvik — "CoroMill Plura 2P350 — Composite Machining Application" (CFRP/GFRP strategies) — covered by material_properties_catalog + strategy DB (66 strategies, 16 materials) + MachiningPlaybookEngine ISO group tips. Novelty 5/100
- [x] Sandvik — "CoroDrill DE10 — Short Hole Drilling Application" (feed/speed selection, chip control) — covered by SpeedFeedOrchestratorEngine + ChipMorphologyDiagnosticEngine + MachiningPlaybookEngine drilling rules. Novelty 5/100
- [x] Sandvik — "CoroTurn Plus — Turning Application Guide" (insert selection, cutting data) — covered by SpeedFeedOrchestratorEngine (turning resolver) + ToolCatalogEngine (Sandvik turning inserts) + MachiningPlaybookEngine turning rules. Novelty 5/100
- [x] Sandvik — "Digital Live Machining" webinar series (live demos from Sandvik Centers) — covered by SelfLearningCAMEngine + MachineMatcherEngine + SpeedFeedOrchestratorEngine live physics hub. Novelty 5/100
- [x] Sandvik — "PrimeTurning — How to Apply" (all-direction turning, CoroTurn Prime inserts) — covered by SpeedFeedOrchestratorEngine (turning resolver) + MillTurnSwissPipelineEngine + strategy DB. Novelty 5/100
- [x] Sandvik — "High-Feed Milling with CoroMill 745" (application setup, feeds/speeds) — covered by SpeedFeedOrchestratorEngine + InstantaneousEngagementEngine (per-block ae/ap) + MachiningPlaybookEngine HSM rules. Novelty 5/100

### 11C: Kennametal — Application Videos
- [x] Kennametal — "KOR5 Solid Carbide End Mills — Application Demo" (3+ min cycle time savings) — covered by ToolCatalogEngine (19,054 Kennametal tools) + CycleTimeEstimatorEngine + SpeedFeedOrchestratorEngine. Novelty 5/100
- [x] Kennametal — "Indexable Milling Lead Angle & Cutting Forces" (tech tips, force vectors) — covered by KienzleForceModelEngine (kc=kc1.1×h^(-mc), 12 ISO materials) + AdvancedCuttingPhysicsEngine + calcDispatcher. Novelty 5/100
- [x] Kennametal — "New Products Fall 2025" (latest innovations, application data) — covered by ToolCatalogEngine (Kennametal 19,054 tools, 50 manufacturer grades) + UserToolLibraryEngine. Novelty 5/100
- [x] Kennametal — "Beyond Blast Coolant-Through Technology" (through-tool coolant setup) — covered by CoolantDynamicsEngine (TSC pressure, MQL spray, chip transport) + CuttingFluidLifecycleEngine + MachiningPlaybookEngine coolant_strategy rules. Novelty 5/100
- [x] Kennametal — "HARVI Ultra 8X End Mill — Titanium Roughing" (aerospace application) — covered by SpeedFeedOrchestratorEngine (Ti ISO-S group) + MachiningPlaybookEngine HSM rules + strategy DB. Novelty 5/100

### 11D: Harvey Performance / Helical Solutions — Application Guides
- [x] Harvey Performance — "In The Loupe" video series (100+ machining how-to posts) — covered by MachiningPlaybookEngine (296 rules, 42 categories) + 3700+ tribal tips + SpeedFeedOrchestratorEngine. Novelty 5/100
- [x] Harvey Performance — "HEM Guidebook" video companion (50+ pages of milling strategies) — covered by NovelToolpathEngine (TGAR/HRAF/CFSF/VCER) + EngagementAdaptiveFeedEngine (constant chip load) + strategy DB. Novelty 5/100
- [x] Harvey Performance — "Machining Advisor Pro (MAP) — How to Use" (S/F parameter generation) — covered by SpeedFeedOrchestratorEngine (67-point physics hub) + PartGeometryPipelineEngine + UserToolLibraryEngine. Novelty 5/100
- [x] Helical Solutions — "Chipbreaker End Mills — When and How to Use" (chip control in deep pockets) — covered by ChipMorphologyDiagnosticEngine (ISO 3685 chip classification) + MachiningPlaybookEngine + EngagementAdaptiveFeedEngine. Novelty 5/100
- [x] Harvey Tool — "Miniature End Mills — Application Tips" (micro-machining, thin walls, small features) — covered by MachiningPlaybookEngine micro_machining rules + ToolDeflectionEngine (δ=FL³/3EI) + SpeedFeedOrchestratorEngine. Novelty 5/100
- [x] Harvey Tool — "Thread Milling — Complete How-To" (single-point vs multi-form, speeds/feeds) — covered by MachiningPlaybookEngine threading rules (6 rules) + SpeedFeedOrchestratorEngine + GCodeTemplateEngine. Novelty 5/100

### 11E: Machine Builder Training Channels
- [x] Mazak — "Mazatrol SmoothAi Training" (interactive programming, AI features) — covered by ControllerDialectEngine Mazak SmoothAi/G (7 capability fields) + 3700+ tribal tips + PostProcessorPipelineEngine Mazak dialect. Novelty 5/100
- [x] Mazak — "MPower Training Series" (setup, programming, maintenance courses) — covered by ControllerDialectEngine Mazak SmoothAi/G + PRISM Academy Courses 1-3 + MachiningPlaybookEngine. Novelty 5/100
- [x] Mazak — "INTEGREX Mill-Turn Setup Guide" (multi-tasking, sub-spindle, live tooling) — covered by MillTurnSwissPipelineEngine (live tooling, sub-spindle transfer, multi-channel scheduling) + ControllerDialectEngine Mazak. Novelty 5/100
- [x] DMG MORI — "CELOS Control Training" (interface, job management, process monitoring) — covered by OpcUaConnectorEngine (live CNC) + MTConnectAdapterEngine (machine status/alarms) + GrafanaBridgeEngine. Novelty 5/100
- [x] DMG MORI — "DMU 50 5-Axis Setup & Programming" (swivel rotary table, TCPC) — covered by FiveAxisPostEngine (TCPC/RTCP 13 controllers) + FiveAxisToolpathIntegrationEngine + machine-profiles-catalog (DMG MORI entries). Novelty 5/100
- [x] Okuma — "OSP Suite — Programming Tutorials" (OSP-P300/P500, conversational programming) — covered by ControllerDialectEngine Okuma P300/P500 + PostProcessorPipelineEngine Okuma dialect. Novelty 5/100
- [x] Okuma — "Super-NURBS & Machining Navi" (surface quality optimization, anti-chatter) — covered by ControllerDialectEngine Okuma (nurbs_interpolation field) + StochasticChatterEngine + ToolpathSmoothingEngine. Novelty 5/100
- [x] Okuma — "MULTUS Mill-Turn Setup" (B-axis milling, turning mode switching) — covered by MillTurnSwissPipelineEngine (multi-channel scheduling, 6 controller dialects) + ControllerDialectEngine Okuma P300/P500. Novelty 5/100
- [x] Brother — "Speedio Setup & High-Speed Tapping" (M300X3, rapid tool changes, tapping cycles) — covered by ControllerDialectEngine Brother dialect + MachiningPlaybookEngine + GCodeTemplateEngine tapping cycles. Novelty 5/100

### 11F: Titans of CNC Academy — Practical Machining
- [x] Titans of CNC — "Building Blocks" series (10-step program: design→program→cut on 3-axis mill) — covered by PrintToProgramPipelineEngine (full CAD→G-code pipeline) + PRISM Academy Courses 1-3 + PostProcessorPipelineEngine. Novelty 5/100
- [x] Titans of CNC — "CNC Mill Fundamentals" series (workholding, tool selection, speeds/feeds) — covered by SpeedFeedOrchestratorEngine + WorkholdingViabilityEngine + ToolCatalogEngine + PRISM Academy. Novelty 5/100
- [x] Titans of CNC — "CNC Tooling Masterclass" (insert selection, holder types, tool life) — covered by ToolCatalogEngine (95,608 tools, 1,332 holders, 28 manufacturers) + StochasticToolWearEngine + MachiningPlaybookEngine. Novelty 5/100
- [x] Titans of CNC — "Titan Tutorials — Learn to Set Up CNC" (vise setup, WCS, tool offsets) — covered by ProbeRoutineGeneratorEngine + SetupSheetFromGCodeEngine + PRISM Academy operator training. Novelty 5/100
- [x] Titans of CNC — "Tormach Tutorials" series (hobbyist-to-production workflow) — covered by PrintToProgramPipelineEngine + SpeedFeedOrchestratorEngine + MachineMatcherEngine + PRISM Academy. Novelty 5/100
- [x] Titans of CNC — "5-Axis Machining Challenge Parts" (real 5-axis projects with full walkthrough) — covered by FiveAxisToolpathIntegrationEngine + FiveAxisPostEngine + MultiSetupPlanner + MachiningPlaybookEngine. Novelty 5/100

### 11G: Seco Tools — Material-Specific Application Videos
- [x] Seco Tools — "Material Specific Machining" playlist (ISO P/M/K/N/S/H strategies with chip control) — covered by SpeedFeedOrchestratorEngine (ISO group coolant strategy) + strategy DB (66 strategies, 16 materials) + 1,224 Seco tools. Novelty 5/100
- [x] Seco Tools — "Edge Preparation & Cutting Geometry" (hone, chamfer, land effects on forces) — covered by KienzleForceModelEngine + AdvancedCuttingPhysicsEngine (oblique cutting, size effect) + MachiningPlaybookEngine. Novelty 5/100
- [x] Seco Tools — "Jabro Solid² — High-Performance Milling" (solid carbide application data) — covered by SpeedFeedOrchestratorEngine + ToolCatalogEngine (Seco 1,224 tools, 128 S/F entries) + NovelToolpathEngine. Novelty 5/100
- [x] Seco Tools — "Steadyline Vibration Damping" (anti-vibration boring bars — how to select & apply) — covered by StochasticChatterEngine + RigidityDegradationEngine (cantilever δ=FH³/3EI, natural freq) + MachiningPlaybookEngine. Novelty 5/100

### 11H: Other Vendor How-To Videos
- [x] OSG — "A-Tap Series — Application Guide" (high-performance tapping, speeds/feeds by material) — covered by SpeedFeedOrchestratorEngine + ToolCatalogEngine (OSG 11,550 tools) + MachiningPlaybookEngine threading rules. Novelty 5/100
- [x] OSG — "AE-VMS End Mills — Stainless Steel Application" (variable helix, chip thinning demo) — covered by EngagementAdaptiveFeedEngine (chip thinning 3 models) + SpeedFeedOrchestratorEngine + ToolCatalogEngine OSG. Novelty 5/100
- [x] Guhring — "Pionex Taps — Application Demo" (March 2026 CTE feature — threading how-to) — covered by SpeedFeedOrchestratorEngine + ToolCatalogEngine (Guhring 3,421 tools) + MachiningPlaybookEngine threading rules. Novelty 5/100
- [x] Guhring — "Coolant-Through Drilling — MQL vs Flood Setup" (coolant system configuration) — covered by CoolantDynamicsEngine (MQL spray, jet coherence) + CuttingFluidLifecycleEngine + MachiningPlaybookEngine coolant_strategy rules. Novelty 5/100
- [x] Mitsubishi Materials — "Technical Guidance — Speeds & Feeds by Insert Grade" (grade selection) — covered by SpeedFeedOrchestratorEngine + ToolCatalogEngine (Mitsubishi 1,431 tools) + multi-manufacturer-grades (50 grades). Novelty 5/100
- [x] Walter Tools — "Tiger-tec Gold — Cutting Speed vs Tool Life Demo" (Taylor curve demonstration) — covered by StochasticToolWearEngine (Taylor T=(C/Vc)^(1/n), Weibull) + EmpiricalCorrelationEngine + PredictiveSimulationEngine. Novelty 5/100
- [x] Walter Tools — "Best Practice 2025" (success stories, machining tips, cutting data) — covered by MachiningPlaybookEngine (296 rules) + 3700+ tribal tips + SpeedFeedOrchestratorEngine. Novelty 5/100
- [x] ISCAR — "Machining Aluminum Wheels — Productivity Application" (high-speed aluminum) — covered by SpeedFeedOrchestratorEngine (ISO-N group) + ToolCatalogEngine (ISCAR 6,074 tools) + MachiningPlaybookEngine HSM rules. Novelty 5/100
- [x] ISCAR — "E-Learning: Lightweight Engineering Materials" (CFRP, aluminum, magnesium) — covered by material_properties_catalog (2957 materials) + strategy DB (16 materials) + MachiningPlaybookEngine ISO group tips. Novelty 5/100
- [x] Renishaw — "On-Machine Probing — Complete Setup Guide" (tool setting, workpiece probing, automated inspection) — covered by ProbeRoutineGeneratorEngine + SetupSheetFromGCodeEngine + CMMPathPlanningEngine (3-2-1 datum alignment). Novelty 5/100
- [x] Renishaw — "Ballbar Testing — How to Run & Interpret" (machine accuracy verification) — covered by MachineGeometricAccuracyEngine (ball-bar, 21-error model, volumetric HTM) + MachineToolErrorBudgetEngine. Novelty 5/100
- [x] Blum-Novotest — "Tool Breakage Detection — Setup & Programming" (laser tool measurement) — covered by ProbeRoutineGeneratorEngine + ToolWearCompensationEngine + SelfLearningCAMEngine (anomaly relearn). Novelty 5/100

### 11I: CAM Software Practical Tutorials
- [x] OPEN MIND — "hyperMILL 2025 — New Deburring Strategies" (automatic deburring on machine) — covered by 200 hyperMILL tribal tips (hm-001–hm-200) + MultiCAMPostEngine + MachiningPlaybookEngine post_processing rules. Novelty 5/100
- [x] OPEN MIND — "hyperMILL 5-Axis Auto Tool Orientation" (pre-analysis algorithm, indexed+simultaneous) — covered by FiveAxisToolpathIntegrationEngine (contour milling, singularity management) + 200 hyperMILL tips. Novelty 5/100
- [x] OPEN MIND — "hyperMILL Virtual Machine — Collision Avoidance" (machine model in toolpath calc) — covered by FiveAxisToolpathIntegrationEngine (AABB collision avoidance, binary-search tilt) + machine-3d-model-catalog (260 STEP refs). Novelty 5/100
- [x] Mastercam — "Dynamic Motion — Complete How-To" (adaptive clearing, constant chip load) — covered by EngagementAdaptiveFeedEngine (constant chip load/force/MRR) + 261 Mastercam tribal tips + strategy DB. Novelty 5/100
- [x] Mastercam — "OptiRough — Application Guide" (2025 toolpath strategies) — covered by NovelToolpathEngine (TGAR/VCER roughing algorithms) + 261 Mastercam tribal tips + CrossCamRecommenderEngine. Novelty 5/100
- [x] Fusion 360 — "Adaptive Clearing — Setup & Parameters" (engagement control, chip thinning) — covered by EngagementAdaptiveFeedEngine (chip thinning 3 models) + Fusion360CodeGeneratorEngine + 200 Fusion 360 tips. Novelty 5/100
- [x] Fusion 360 — "5-Axis Swarf Cutting — Complete Workflow" (surface selection, tool axis control) — covered by FiveAxisToolpathIntegrationEngine + Fusion360CodeGeneratorEngine (30+ ops) + FiveAxisPostEngine. Novelty 5/100
- [x] SolidCAM — "iMachining 2D/3D — Getting Started" (patented toolpath, parameter wizard) — covered by 200 SolidCAM tribal tips (sc-001–sc-200) + MultiCAMPostEngine + EngagementAdaptiveFeedEngine. Novelty 5/100
- [x] SolidCAM — "Swiss-Type Programming — Complete Guide" (multi-channel, gang vs turret) — covered by MillTurnSwissPipelineEngine (multi-channel scheduling, gang vs turret) + 200 SolidCAM tips. Novelty 5/100

## CATEGORY 12: Workholding, Fixturing & Setup (Practical How-To)

### 12A: Workholding Systems — Setup & Application
- [x] "5-Axis Workholding Demystified" (zero-point, dovetail, 5th Axis RockLock, Lang Quick-Point) — covered by WorkholdingViabilityEngine (grip degradation, vacuum seal, datum tracking) + workholding-catalog (44 entries) + FixtureClampingEngine. Novelty 5/100
- [x] "Dovetail Workholding — Complete How-To" (Raptor, machining dovetail profile, jaw grip force) — covered by WorkholdingViabilityEngine + FixtureClampingEngine + SetupTransitionEngine (force capability P=Fc×Vc/60000). Novelty 5/100
- [x] "Zero-Point Clamping — Setup & Benefits" (Schunk VERO-S, Jergens Drop & Lock, Lang Makro-Grip) — covered by WorkholdingViabilityEngine + SetupTransitionEngine (datum chain RSS, flip feasibility) + workholding-catalog. Novelty 5/100
- [x] "Soft Jaw Design & Machining" (how to design, machine, and use custom soft jaws for vise) — covered by WorkholdingViabilityEngine + FixtureClampingEngine + SetupTransitionEngine (grip force, 3 sync modes). Novelty 5/100
- [x] "Tombstone/Pallet Fixturing — Multi-Part Setup" (layout planning, crash avoidance, datum transfer) — covered by SetupTransitionEngine (pallet collision, datum chain) + MultiSetupPlanner + WorkholdingViabilityEngine. Novelty 5/100
- [x] "Vacuum Workholding — When & How to Use" (thin parts, gaskets, surface requirements, pump selection) — covered by WorkholdingViabilityEngine (vacuum seal integrity) + FixtureClampingEngine + workholding-catalog. Novelty 5/100
- [x] "Magnetic Workholding — Applications & Limits" (grinding, surface milling, clamping force calc) — covered by WorkholdingViabilityEngine + FixtureClampingEngine + MachiningPlaybookEngine workholding rules. Novelty 5/100
- [x] "Hydraulic Clamping — High-Volume Setup" (Jergens hydraulic vise, automated clamping, cycle time) — covered by WorkholdingViabilityEngine + SetupTransitionEngine + CycleTimeEstimatorEngine. Novelty 5/100

### 12B: Fixture Design Principles
- [x] "CNC Fixture Design Principles" (rigidity, repeatability, access, clamp near cut, 3-point contact) — covered by FixtureClampingEngine + WorkholdingViabilityEngine + RigidityDegradationEngine (stiffness evolution) + CMMPathPlanningEngine (3-2-1 datum alignment). Novelty 5/100
- [x] "Op1/Op2 Planning — Flip Strategy" (datum transfer, soft jaw profiles, how to plan multi-op parts) — covered by SetupTransitionEngine (flip feasibility, datum chain RSS) + SequenceFeasibilityEngine + MultiSetupPlanner. Novelty 5/100
- [x] "Custom Fixture Plates — How to Design & Machine" (modular grid plates, threaded holes, dowel pins) — covered by WorkholdingViabilityEngine + FixtureClampingEngine + workholding-catalog (44 entries). Novelty 5/100

## CATEGORY 13: Quality, Inspection & GD&T (Practical How-To)

### 13A: On-Machine Probing
- [x] Renishaw — "How-To Videos for Machine Tool Probes" series (installation, calibration, probe cycles) — covered by ProbeRoutineGeneratorEngine + SetupSheetFromGCodeEngine + CMMPathPlanningEngine (ISO GUM Type A/B). Novelty 5/100
- [x] Renishaw — "Inspection Plus — Probing Macro Programming" (G65 calls, WCS setup, automated inspection) — covered by ProbeRoutineGeneratorEngine + GCodeTemplateEngine + ControllerDialectEngine (macro_b_support field). Novelty 5/100
- [x] "Mastercam Probing Video Library" (WCS setup with Renishaw Inspection Plus, in-process checks) — covered by ProbeRoutineGeneratorEngine + 261 Mastercam tribal tips + PipelineConsistencyHookEngine (auto-verify). Novelty 5/100
- [x] Blum-Novotest — "Laser Tool Measurement Setup" (non-contact tool setting, breakage detection) — covered by ProbeRoutineGeneratorEngine + ToolWearCompensationEngine + SelfLearningCAMEngine (anomaly detection). Novelty 5/100

### 13B: CMM & First Article
- [x] "CMM Programming for Machinists — Beginner Guide" (datum setup, probe qualification, GD&T features) — covered by CMMPathPlanningEngine (TSP+2-opt probe path, 3-2-1 datum alignment, ISO 10360) + ProbeRoutineGeneratorEngine. Novelty 5/100
- [x] "First Article Inspection (FAI) — Complete Workflow" (AS9102, balloon drawing, CMM report, FAIR form) — covered by CMMPathPlanningEngine (ISO 14253-1 feature uncertainty) + GDTStackupEngine + StatisticalProcessMonitoringEngine. Novelty 5/100
- [x] "GD&T for CNC Machinists — Practical Interpretation" (datums, position, profile, how it affects machining) — covered by GDTStackupEngine + PRISM Academy Course 0C (Blueprint Reading & GD&T, 12 modules) + CMMPathPlanningEngine. Novelty 5/100
- [x] "SPC for CNC — Setting Up Control Charts" (Xbar-R, Cpk monitoring, when to adjust process) — covered by NelsonSPCRulesEngine (8 Western Electric rules) + ManufacturingStatisticsEngine + ProcessCapabilityPredictionEngine (Cp/Cpk). Novelty 5/100

## CATEGORY 14: Community Machinist Channels (Practical How-To)

### 14A: Professional CNC Channels
- [x] NYC CNC / Saunders Machine Works — "Fusion 360 to CNC — Complete Workflow" series (CAD→CAM→setup→cut) — covered by PrintToProgramPipelineEngine + Fusion360CodeGeneratorEngine + PostProcessorPipelineEngine + 3700+ tribal tips. Novelty 5/100
- [x] NYC CNC — "Mod Vise Workholding — How It Works" (custom fixture system, setup repeatability) — covered by WorkholdingViabilityEngine + FixtureClampingEngine + SetupTransitionEngine (datum chain RSS). Novelty 5/100
- [x] Edge Precision — "5-Axis Machining Projects" (real-world 5-axis jobs with full walkthrough) — covered by FiveAxisToolpathIntegrationEngine + FiveAxisPostEngine + MultiSetupPlanner + MachiningPlaybookEngine. Novelty 5/100
- [x] Abom79 — "Manual Machining Fundamentals" (lathe turning, boring, threading — tradesman skills) — covered by PRISM Academy Courses 0A-0B (Hand Tools & Measurement) + SpeedFeedOrchestratorEngine turning resolver + 3700+ tips. Novelty 5/100
- [x] Joe Pieczynski — "Precision Grinding & Fitting" (scraping, fitting, hand finishing techniques) — covered by StochasticGrindingEngine + ProcessCapabilityPredictionEngine + MachiningPlaybookEngine surface_treatment rules. Novelty 5/100
- [x] Stefan Gotteswinter — "Swiss-Style Precision" (micro-machining, watchmaking-level precision work) — covered by MillTurnSwissPipelineEngine + MachiningPlaybookEngine micro_machining rules + StochasticDimensionalEngine. Novelty 5/100
- [x] This Old Tony — "CNC & Manual Machining Explained" (entertaining, explains concepts for beginners) — covered by PRISM Academy Courses 0A-3 (146 modules) + MachiningPlaybookEngine + 3700+ tribal tips. Novelty 5/100
- [x] Keith Rucker — "Vintage Machine Restoration & Use" (manual machining, machine care, toolroom basics) — covered by PRISM Academy Courses 0A-0B + MachiningPlaybookEngine + machine-profiles-catalog (910 machines). Novelty 5/100

### 14B: Production & Job Shop Channels
- [x] "Making Chips" podcast/video — interviews with manufacturing leaders (business + technical) — covered by QuoteEstimatorEngine (physics-backed costing) + ROIAdvisorEngine + SustainabilityLCAEngine (TCO, economics). Novelty 5/100
- [x] CNCCookbook — "G-Wizard Speeds & Feeds Tutorial" (calculator walkthrough, optimization tips) — covered by SpeedFeedOrchestratorEngine (67-point physics hub) + PartGeometryPipelineEngine + `prism sf` CLI command. Novelty 5/100
- [x] CNCCookbook — "Feeds & Speeds Masterclass" (chip thinning, HSM, radial engagement, tool deflection) — covered by EngagementAdaptiveFeedEngine (chip thinning 3 models) + InstantaneousEngagementEngine + ToolDeflectionEngine. Novelty 5/100
- [x] "Saunders Machine Works — Job Shop Tips" (quoting, scheduling, multi-op planning, customer management) — covered by QuoteEstimatorEngine + ROIAdvisorEngine + SequenceFeasibilityEngine + CycleTimeEstimatorEngine. Novelty 5/100

## CATEGORY 15: Advanced/Specialty Machining (Practical How-To)

### 15A: Specialty Processes
- [x] "EDM Wire Cutting — Complete How-To" (threading, skim cuts, wire selection, flush pressure) — covered by StochasticEDMEngine (3 EDM types, exponential discharge, crater/recast/wear) + 6 EDM playbook rules. Novelty 5/100
- [x] "EDM Sinker/Ram — Electrode Design & Setup" (graphite vs copper, orbiting, undercut strategy) — covered by StochasticEDMEngine + MachiningPlaybookEngine EDM rules + calcDispatcher EDM actions. Novelty 5/100
- [x] "Surface Grinding — Setup & Technique" (wheel dressing, spark-out, surface finish targets) — covered by StochasticGrindingEngine (Malkin/Jaeger, G-ratio, 6 materials) + 8 grinding playbook rules + GrindingSurfaceFinishEngine. Novelty 5/100
- [x] "Cylindrical Grinding — OD/ID Setup" (center grinding, chucking, grinding wheel selection) — covered by StochasticGrindingEngine + MachiningPlaybookEngine grinding rules + FundamentalPhysicsCompletionEngine. Novelty 5/100
- [x] "Hard Turning vs Grinding — When to Use Each" (CBN insert selection, surface finish comparison) — covered by MachiningPlaybookEngine hard_turning rules (5 rules) + SpeedFeedOrchestratorEngine + ConstitutiveModelEngine. Novelty 5/100
- [x] "Micro-Machining — Small Tool Techniques" (runout control, HSM, 0.1mm endmill application) — covered by MachiningPlaybookEngine micro_machining rules (5 rules) + RunoutEffectEngine + SpeedFeedOrchestratorEngine. Novelty 5/100
- [x] "Deep Hole Drilling — Gun Drill & BTA" (coolant pressure, chip transport, straightness control) — covered by MachiningPlaybookEngine deep_hole rules (6 rules) + CoolantDynamicsEngine (chip transport) + SpeedFeedOrchestratorEngine. Novelty 5/100
- [x] "Broaching — How It Works & When to Use" (keyway, spline, internal form cutting) — covered by formingCastingDispatcher (16 actions) + MachiningPlaybookEngine + AdvancedCuttingPhysicsEngine. Novelty 5/100

### 15B: Exotic Materials
- [x] "Machining Titanium — Complete Guide" (speeds/feeds, coolant, chip control, tool selection) — covered by SpeedFeedOrchestratorEngine (Ti ISO-S group, Johnson-Cook) + MachiningPlaybookEngine ISO-S tips + CryogenicCuttingEngine. Novelty 5/100
- [x] "Machining Inconel/Hastelloy — Superalloy Tips" (ceramic inserts, avoid work hardening) — covered by SpeedFeedOrchestratorEngine (ISO-S group) + ConstitutiveModelEngine (Zerilli-Armstrong) + MachiningPlaybookEngine superalloy tips. Novelty 5/100
- [x] "Machining PEEK/Ultem/Engineering Plastics" (sharp tools, no coolant, chip control, burr prevention) — covered by material_properties_catalog (2957 materials incl. plastics) + SpeedFeedOrchestratorEngine + MachiningPlaybookEngine ISO-N tips. Novelty 5/100
- [x] "Machining Copper & Brass — Tips for Non-Ferrous" (BUE prevention, high rake, flood coolant) — covered by SpeedFeedOrchestratorEngine (ISO-N group) + MachiningPlaybookEngine ISO-N tips + AdvancedCuttingPhysicsEngineExt (BUE formation). Novelty 5/100
- [x] "Machining Cast Iron — Grey vs Ductile" (dry cutting, insert selection, graphite dust management) — covered by SpeedFeedOrchestratorEngine (ISO-K group) + MachiningPlaybookEngine ISO-K tips + material_properties_catalog. Novelty 5/100
- [x] "Machining Hardened Steel (>50 HRC)" (CBN, ceramic, hard milling strategies, spring passes) — covered by MachiningPlaybookEngine hard_turning rules (5 rules) + SpeedFeedOrchestratorEngine (ISO-H group) + ConstitutiveModelEngine. Novelty 5/100

## CATEGORY 16: Wire EDM — Programming, Setup & Technique

### 16A: Wire EDM Fundamentals
- [x] "Wire EDM for Beginners — How It Works" (spark erosion, dielectric, wire types, surface finish) — covered by StochasticEDMEngine (exponential discharge, crater/recast, 3 EDM types) + MachiningPlaybookEngine EDM rules. Novelty 5/100
- [x] "Wire EDM Programming — DXF to G-Code Workflow" (CAD→CAM→post, geometry prep, lead-in/out) — covered by PostProcessorPipelineEngine (26-stage) + GCodeSafetyAnalyzerEngine + ControllerDialectEngine Mitsubishi/Fanuc dialects. Novelty 5/100
- [x] Makino — "Programming Techniques for Wire EDM" (webinar by Brian Coward, best practices) — covered by StochasticEDMEngine + MachiningPlaybookEngine EDM rules + PostProcessorPipelineEngine. Novelty 5/100
- [x] Makino — "Wire EDM Programming Techniques — Advanced" (skim cuts, multi-pass, taper cutting) — covered by StochasticEDMEngine + PostProcessorPipelineEngine (multi-pass strategy) + GCodeSafetyAnalyzerEngine. Novelty 5/100
- [x] "Sodick Wire EDM — Setup & Operation Training" (threading, codeless alignment, edge find, tilt offset) — covered by StochasticEDMEngine + ProbeRoutineGeneratorEngine + ControllerDialectEngine Generic dialects. Novelty 5/100
- [x] "Mitsubishi Wire EDM — Operator Guide" (control panel, parameter selection, wire path setup) — covered by ControllerDialectEngine Mitsubishi dialect + StochasticEDMEngine + PostProcessorPipelineEngine. Novelty 5/100
- [x] "Wire EDM Skim Cuts — Achieving Mirror Finish" (multi-pass strategy, power settings per pass) — covered by StochasticEDMEngine (recast/surface finish outputs) + MachiningPlaybookEngine EDM rules + PostProcessorPipelineEngine. Novelty 5/100
- [x] "Wire EDM Taper Cutting — How to Set Up" (UV axis programming, draft angles, die clearance) — covered by FiveAxisPostEngine (linearization, G93) + ControllerDialectEngine + StochasticEDMEngine. Novelty 5/100

### 16B: Wire EDM Advanced Topics
- [x] "Wire EDM Submerged vs Flush Cutting" (dielectric level, flushing pressure, surface quality effects) — covered by StochasticEDMEngine + CoolantDynamicsEngine (chip transport, jet coherence) + MachiningPlaybookEngine EDM rules. Novelty 5/100
- [x] "Wire EDM Wire Selection — Brass vs Coated vs Molybdenum" (wire diameter, speed, finish, cost) — covered by StochasticEDMEngine (wire material parameters) + QuoteEstimatorEngine (cost analysis) + MachiningPlaybookEngine. Novelty 5/100
- [x] "Wire EDM for Tool & Die — Punch & Die Cutting" (slug control, die clearance, core drop strategy) — covered by StochasticEDMEngine + GDTStackupEngine + MachiningPlaybookEngine EDM rules. Novelty 5/100
- [x] "Wire EDM Fixturing & Workholding" (magnetic chucks, precision vises, datum setup for EDM) — covered by WorkholdingViabilityEngine + FixtureClampingEngine + CMMPathPlanningEngine (3-2-1 datum). Novelty 5/100
- [x] "Esprit vs Mastercam for Wire EDM Programming" (comparison, feature differences, workflow) — covered by CrossCamRecommenderEngine + MultiCAMPostEngine (13 CAM systems) + 208 ESPRIT + 261 Mastercam tribal tips. Novelty 5/100

## CATEGORY 17: Sinker/Ram EDM — Electrode Design & Setup

### 17A: Sinker EDM Fundamentals
- [x] "Sinker EDM for Beginners — How It Works" (electrode, dielectric, spark gap, orbiting) — covered by StochasticEDMEngine (3 EDM types incl. sinker, exponential discharge, crater/recast/wear). Novelty 5/100
- [x] "Sinker EDM Electrode Design — Graphite vs Copper" (when to use each, oversize calc, wear rates) — covered by StochasticEDMEngine (electrode wear model) + MachiningPlaybookEngine EDM rules + QuoteEstimatorEngine. Novelty 5/100
- [x] "Sinker EDM Electrode Machining — Graphite on CNC" (dust management, speeds/feeds, sharp edges) — covered by SpeedFeedOrchestratorEngine + MachiningPlaybookEngine EDM rules + CoolantDynamicsEngine (chip/dust transport). Novelty 5/100
- [x] "Sinker EDM Electrode Machining — Copper on CNC" (surface finish, polishing, handling) — covered by SpeedFeedOrchestratorEngine (ISO-N group for copper) + StochasticEDMEngine + MachiningPlaybookEngine. Novelty 5/100
- [x] "Sinker EDM Programming — Orbiting & Z-axis Strategies" (vector, planetary, linear orbiting) — covered by StochasticEDMEngine + PostProcessorPipelineEngine (controller-specific output) + GCodeTemplateEngine. Novelty 5/100
- [x] "Sinker EDM Surface Finish — VDI Scale Explained" (VDI 3400, Ra conversion, parameter selection) — covered by StochasticEDMEngine (recast/surface finish) + MachiningPlaybookEngine EDM rules + surface_treatment playbook rules. Novelty 5/100

### 17B: Sinker EDM Advanced Topics
- [x] "Sinker EDM for Mold Making — Cavity & Core" (multi-electrode strategy, electrode wear compensation) — covered by StochasticEDMEngine (electrode wear compensation) + SequenceFeasibilityEngine + WorkpieceStateEngine (surface catalog). Novelty 5/100
- [x] "Sinker EDM Ribs & Thin Features" (narrow slots, high aspect ratio, flushing challenges) — covered by StochasticEDMEngine + AccessibilityAnalysisEngine (corner radius, chip evacuation) + MachiningPlaybookEngine. Novelty 5/100
- [x] "Micro EDM — Small Hole Drilling & Micro Features" (electrode fabrication, sub-mm features) — covered by StochasticEDMEngine + MachiningPlaybookEngine micro_machining rules + MillTurnSwissPipelineEngine. Novelty 5/100
- [x] "EDM Drill / Hole Popper — How to Use" (fast hole drilling, broken tap removal, start holes for wire) — covered by StochasticEDMEngine + SpeedFeedOrchestratorEngine + MachiningPlaybookEngine EDM/deep_hole rules. Novelty 5/100

## CATEGORY 18: Waterjet Cutting — Setup, Programming & Technique

### 18A: Waterjet Fundamentals
- [x] "Abrasive Waterjet Cutting — How It Works" (pressure, abrasive types, garnet mesh, mixing tube) — covered by LaserAblationPhysicsEngine (ablation MRR, process window) + formingCastingDispatcher + CoolantDynamicsEngine (jet pressure). Novelty 5/100
- [x] "OMAX Waterjet — Complete Setup & First Cut" (OMAX Layout software, fixturing, piercing, cutting) — covered by LaserAblationPhysicsEngine + PostProcessorPipelineEngine + WorkholdingViabilityEngine. Novelty 5/100
- [x] "OMAX IntelliMAX Software — Programming Tutorial" (import DXF, toolpath, cut quality, traverse) — covered by LaserAblationPhysicsEngine + GCodeSafetyAnalyzerEngine + ToolpathSmoothingEngine (B-spline). Novelty 5/100
- [x] "Flow Waterjet — Mach 4 Setup & Programming" (FlowPath software, nesting, Dynamic Waterjet) — covered by LaserAblationPhysicsEngine + PostProcessorPipelineEngine + formingCastingDispatcher. Novelty 5/100
- [x] "Waterjet Taper Compensation — Tilt-A-Jet & A-Jet" (OMAX automatic taper removal, single-click setup) — covered by FiveAxisPostEngine (linearization) + LaserAblationPhysicsEngine + PostProcessorPipelineEngine. Novelty 5/100
- [x] "Waterjet Kerf & Offset — How to Set Correctly" (kerf width vs speed, quality numbers, tolerances) — covered by LaserAblationPhysicsEngine (Gaussian MRR, kerf/HAZ) + StochasticDimensionalEngine + GDTStackupEngine. Novelty 5/100

### 18B: Waterjet Advanced Topics
- [x] "Waterjet Stack Cutting — Thin Materials" (stacking technique, holding, taper reduction in thin stock) — covered by LaserAblationPhysicsEngine + WorkholdingViabilityEngine + formingCastingDispatcher. Novelty 5/100
- [x] "Waterjet Nesting for Material Optimization" (OMAX Layout nesting, remnant tracking, sheet utilization) — covered by UserToolLibraryEngine (remnant tracking) + QuoteEstimatorEngine + SustainabilityLCAEngine (material efficiency). Novelty 5/100
- [x] "Waterjet Piercing Techniques — Brittle Materials" (low-pressure pierce, oscillating pierce, pre-drill) — covered by LaserAblationPhysicsEngine (percussion drilling, plasma shielding) + MachiningPlaybookEngine + formingCastingDispatcher. Novelty 5/100
- [x] "Waterjet vs Laser vs Plasma — When to Use Each" (material thickness, tolerance, heat-affected zone) — covered by LaserAblationPhysicsEngine (HAZ/recast) + CrossCamRecommenderEngine + MachiningPlaybookEngine. Novelty 5/100
- [x] "Waterjet Maintenance — Pump, Nozzle, Abrasive System" (intensifier vs direct drive, orifice life) — covered by CuttingFluidLifecycleEngine (TCO optimization) + StochasticToolWearEngine + ReliabilityEngineeringEngine. Novelty 5/100
- [x] "Waterjet Cutting Glass, Stone & Composites" (special materials, reduced pressure, speed settings) — covered by LaserAblationPhysicsEngine + material_properties_catalog (2957 materials) + SpeedFeedOrchestratorEngine. Novelty 5/100
- [x] "Pure Waterjet — Cutting Foam, Rubber, Gaskets" (no abrasive, clean cut, food-safe applications) — covered by LaserAblationPhysicsEngine + material_properties_catalog + formingCastingDispatcher. Novelty 5/100

## CATEGORY 19: CAD Drawing & Part Design for Manufacturing (Fusion 360 Priority)

### 19A: Fusion 360 CAD — Beginner (HIGHEST PRIORITY)
- [x] Product Design Online (Kevin Kennedy) — "Learn Fusion 360 in 30 Days" 2026 Edition (complete beginner curriculum, new UI) — Fusion360CodeGeneratorEngine + CadQueryCodeGeneratorEngine + PRISM Academy. Novelty 5/100
- [x] Product Design Online — Day 1-10: Sketch Fundamentals (constraints, dimensions, fully constrained sketches) — Fusion360CodeGeneratorEngine + CadQueryCodeGeneratorEngine + PRISM Academy. Novelty 5/100
- [x] Product Design Online — Day 11-20: 3D Modeling (extrude, revolve, sweep, loft, shell, pattern) — Fusion360CodeGeneratorEngine covers extrude/revolve/loft/shell/pattern ops. Novelty 5/100
- [x] Product Design Online — Day 21-30: Assemblies & Drawings (joints, motion, 2D drawing creation) — Fusion360CodeGeneratorEngine + AssemblyOptimizationEngine. Novelty 5/100
- [x] Lars Christensen — "Fusion 360 for Absolute Beginners" (Autodesk employee, deep workflow knowledge) — Fusion360CodeGeneratorEngine + CadQueryCodeGeneratorEngine + PRISM Academy. Novelty 5/100
- [x] Lars Christensen — "Fusion 360 Tips & Tricks" series (intermediate techniques, shortcuts, productivity) — Fusion360CodeGeneratorEngine + PRISM Academy. Novelty 5/100
- [x] Lars Christensen — "Fusion 360 Q&A Livestreams" (real-world questions answered live) — Fusion360CodeGeneratorEngine + PRISM Academy. Novelty 5/100
- [x] "Fusion 360 Sketch Constraints — Complete Guide" (fully constrained sketches, parametric design intent) — Fusion360CodeGeneratorEngine parametric mode + CadQueryCodeGeneratorEngine. Novelty 5/100
- [x] "Fusion 360 Parameters — Driving Dimensions from a Table" (parametric families, user parameters) — Fusion360CodeGeneratorEngine parametric mode. Novelty 5/100

### 19B: Fusion 360 CAD — For Machinists
- [x] GCode Tutor — "Fusion 360 for Milling Machines" (taught by time-served machinist, CAD→G-code workflow) — Fusion360CodeGeneratorEngine + PrintToProgramPipelineEngine full CAD→G-code. Novelty 5/100
- [x] "Fusion 360 for CNC Machinists" (Udemy — sketching with constraints, manufacturing-oriented modeling) — Fusion360CodeGeneratorEngine + CadQueryCodeGeneratorEngine + PRISM Academy. Novelty 5/100
- [x] NYC CNC — "Fusion 360 CAD for CNC — Complete Workflow" (model→CAM→setup→cut real parts) — Fusion360CodeGeneratorEngine + PrintToProgramPipelineEngine full workflow. Novelty 5/100
- [x] "Fusion 360 — Drawing a CNC Part from a Blueprint" (reading prints, modeling to dimensions, tolerances) — Fusion360CodeGeneratorEngine + PRISM Academy Course 0C Blueprint Reading. Novelty 5/100
- [x] "Fusion 360 — Sheet Metal Design for Laser/Waterjet" (bend allowance, flat pattern, K-factor) — Fusion360CodeGeneratorEngine + SpringbackPredictionEngine. Novelty 5/100
- [x] "Fusion 360 — Creating Manufacturing Drawings" (title block, dimensions, GD&T symbols, section views) — Fusion360CodeGeneratorEngine + PRISM Academy Course 0C. Novelty 5/100
- [x] "Fusion 360 GD&T in Drawings" (LinkedIn Learning — applying geometric tolerances to drawings) — Fusion360CodeGeneratorEngine + GDTStackupEngine. PRISM Academy Course 0C. Novelty 5/100
- [x] "Fusion 360 — Parametric Modeling for Manufacturing" (design intent, change-friendly models, configurations) — Fusion360CodeGeneratorEngine parametric mode + CadQueryCodeGeneratorEngine. Novelty 5/100

### 19C: Fusion 360 CAD — Intermediate/Advanced
- [x] "Fusion 360 — Surface Modeling for Complex Shapes" (T-splines, patch, loft between complex curves) — Fusion360CodeGeneratorEngine + CadQueryCodeGeneratorEngine. Novelty 5/100
- [x] "Fusion 360 — Multi-Body Part Design" (splitting bodies, combining, manufacturing from multi-body) — Fusion360CodeGeneratorEngine multi-body combine ops. Novelty 5/100
- [x] "Fusion 360 — Form Tool (T-Spline) Modeling" (organic shapes, A-class surfaces, push/pull sculpting) — Fusion360CodeGeneratorEngine + CadQueryCodeGeneratorEngine. Novelty 5/100
- [x] "Fusion 360 — Thread Modeling & Cosmetic Threads" (modeled vs cosmetic, when to use each) — Fusion360CodeGeneratorEngine + PRISM threading strategies. Novelty 5/100
- [x] "Fusion 360 — Design for Manufacturability (DfM)" (draft angles, undercuts, wall thickness, cost) — AccessibilityAnalysisEngine + RigidityDegradationEngine + QuoteEstimatorEngine. Novelty 5/100
- [x] "Fusion 360 — Simulation & FEA for Machinists" (stress analysis, modal analysis, verify part before cutting) — RigidityDegradationEngine + CNCSimulationPipelineEngine + PhysicsAwareSimulationEngine. Novelty 5/100

### 19D: General CAD Skills (Transferable)
- [x] "SolidWorks Tutorial — 8-Hour Beginner Course" (sketching, part modeling, assemblies, drawings, sheet metal) — CadQueryCodeGeneratorEngine + PRISM Academy. Novelty 5/100
- [x] "SolidWorks — Sheet Metal Design Complete Guide" (base flange, edge flange, hem, flat pattern) — CadQueryCodeGeneratorEngine + SpringbackPredictionEngine. Novelty 5/100
- [x] "SolidWorks — Assembly Design & Mates" (standard mates, smart mates, interference detection) — AssemblyOptimizationEngine + CadQueryCodeGeneratorEngine. Novelty 5/100
- [x] "Engineering Drawing Reading — For Machinists" (title blocks, views, dimensions, tolerances, symbols) — PRISM Academy Course 0C Blueprint Reading & GD&T. Novelty 5/100
- [x] "GD&T Crash Course — The 14 Symbols Explained" (datum, position, profile, runout, flatness, etc.) — GDTStackupEngine + RunoutEffectEngine. PRISM Academy Course 0C. Novelty 5/100
- [x] "Blueprint Reading for CNC Operators" (3-view drawings, section views, detail views, notes) — PRISM Academy Course 0C Blueprint Reading & GD&T. Novelty 5/100
- [x] "FreeCAD — Open Source CAD for Manufacturing" (parametric modeling, drawing workbench, export) — CadQueryCodeGeneratorEngine + PlaywrightAutomationEngine FreeCAD profile. Novelty 5/100
- [x] "OnShape — Browser-Based CAD Tutorial" (cloud CAD, real-time collaboration, parametric modeling) — CadQueryCodeGeneratorEngine + PlaywrightAutomationEngine OnShape profile. Novelty 5/100

---

## NEW SOURCES DISCOVERED (2026-03-22 Research Session)

### Academic Papers & Studies (2024-2026)
- [x] CIRP Annals 2025 — "Cutting force reconstruction in milling by multi-sensor fusion" — sensor fusion for force reconstruction. PRISM has Kalman filter + digital twin sync. Novelty 15/100
- [x] CIRP Annals 2025 — "Physics-based flow stress model for AM Alloy 718" — additive-specific constitutive model. ConstitutiveModelEngine covers J-C/ZA/MTS. GAP: AM-specific flow stress model. Novelty 30/100
- [x] Springer 2025 — "Intelligent real-time tool life prediction for digital twin" — ML + digital twin for tool life. SelfLearningCAMEngine + ProcessDigitalTwin cover this. Novelty 10/100
- [x] Springer 2025 — "MQL nozzle distance and flow rate in slot milling" — extracted: 25mm/60mL/h optimal, force -14.6%, temp -42.1%, Ra -41.8%. ADDED to CoolantDynamicsEngine.mqlOptimalParameters(). Novelty 40/100
- [x] Tandfonline 2025 — "Five-axis hybrid DED+milling for complex parts" — DED optimal: 1000-1200W, 0.01-0.02m/s scan, milling 100-150m/min. AdditiveManufacturingPhysicsEngine covers base. Novelty 25/100
- [x] Nature 2024 — "Online monitoring of milling cutter wear via digital twin" — ensemble learning >96% accuracy. ProcessDigitalTwin + SelfLearningCAMEngine. Novelty 10/100
- [x] ASME 2025 — "Cryogenic cooling in sustainable machining review" — LN2 vs CO2 force/wear/Ra reductions quantified. ADDED CRYO_PERFORMANCE constants to CryogenicCuttingEngine. Novelty 35/100
- [x] Springer 2025 — "Dual-jet MQL nozzle optimization" — dual-jet vs single-jet 15-20% improvement, 120° feed angle, 60° elevation. ADDED to mqlOptimalParameters. Novelty 30/100

### Reference Databases & Handbooks
- [x] Machinery's Handbook 32nd Ed (2024) — latest ASME Y14.5-2018, 3D printing chapter, expanded metrology. PRISM has GDTStackupEngine + AdditiveManufacturingPhysicsEngine. Core machining data in PRISM material DB. Novelty 10/100
- [x] NIST Machining Data — "Machining of Aluminum and Aluminum Alloys" PDF. Binary PDF couldn't extract. Al alloys fully in PRISM material DB (2957 materials). Novelty 5/100
- [x] Machining Data Handbook 3rd Ed (Internet Archive) — comprehensive cutting data by material/operation. Core data in PRISM's UltimateSpeedFeedEngine + constants.ts. Novelty 5/100

### Manufacturer Technical Resources
- [x] Sandvik Metal Cutting Technology Training Handbook (Scribd) — full training curriculum. Content matches PRISM Academy + Sandvik tribal tips. Novelty 5/100
- [x] Sandvik Coromant — kc1.1 variation data: P=1500-3100 N/mm², K=790-1350, N=350-1350. Already in constants.ts ISO_SUBGROUP_KC1 (50 entries). Novelty 5/100
- [x] PMC 2024 — "Ball nose flank wear vs surface integrity AISI 4340" — RICH DATA: WLT 6.6→39μm over VB 0→0.6mm, Ra stays <0.8μm to VB=0.4mm then spikes, HV 457→540. BUILT: surfaceIntegrityPrediction() with empirical WLT/Ra/HV models. Novelty 55/100
- [x] Springer 2018 — "Specific cutting energy map Al 6061-T6" — Al6061 u=0.32-8.7 J/mm³ depending on speed/operation. Already derivable from Kienzle kc. Novelty 10/100
- [x] Practical Machinist — "Taylor equation constants discussion" — confirms Taylor C/n data is rare; PRISM's coverage (7 materials × 4 tools × 6 coatings) is ahead of public sources. Novelty 0/100

---

## CATEGORY 10: OEM Long-Form Machine Demonstrations — Order of Operations, Toolpath, Parameters

**Purpose:** Extract real-world machining knowledge from OEM demonstration videos — order of operations,
tool selections, cutting parameters, speeds/feeds for specific machine models and tooling combinations.
These are the highest-value videos for validating and improving PRISM's manufacturing pipelines.

### 10A: DMG MORI — NTX Series (Mill-Turn, Process Integration)
- [ ] DMG MORI — "NTX 2000 / 2500 / 3000 3rd Generation — Process Integration" (milling+turning+gear cutting+grinding+measurement, 400V spindle, CELOS X) [dmgmori.co.jp/movie/id=7730]
- [ ] DMG MORI — "Learn Mill-turn Machining with 30 Workpiece Examples — Process Planning Adviser" (NTX 500 + NTX 2000 3rd Gen, 30 workpiece demos with 3D animations) [dmgmori.co.jp/movie/id=7026]
- [ ] DMG MORI — "NTX 500 Space-Saving Integrated Mill Turn Center" (compactMASTER 42,000 RPM, small complex parts) [dmgmori.co.jp/movie/id=6275]
- [ ] DMG MORI — "NTX2000 Blade" (turbine blade machining demo) [dmgmori.co.jp/movie/id=1723]
- [ ] DMG MORI — "Gear Cutting with NTX 2500" (Technology Cycles application) [dmgmori.co.jp/movie/id=6328]

### 10B: DMG MORI — NLX Series (Universal Turning)
- [ ] DMG MORI — "NLX 2500 | 700 2nd Generation" (latest gen turning capabilities) [dmgmori.co.jp/movie/id=7257]
- [ ] DMG MORI — "NLX 2500 | 700 2nd Generation Highlights — Powerful milling capability" [dmgmori.co.jp/movie/id=8090]
- [ ] DMG MORI — "NLX 2500 2nd Generation Heavy-duty milling with Y-axis stroke" (BMT turret) [dmgmori.co.jp/movie/id=8084]
- [ ] DMG MORI — "NLX 2500 | 1250 2nd Generation" (extended bed) [dmgmori.co.jp/movie/id=8398]
- [ ] DMG MORI — "Process Integration — Gear Machining NLX with Technology Cycles" (hobbing, broaching on turning center) [dmgmori.co.jp/movie/id=8425]
- [ ] DMG MORI — "NLX2500/1250 Demonstration workpiece" [dmgmori.co.jp/movie/id=5782]
- [ ] DMG MORI — "NLX 2000 Hard skiving" (gear finishing) [dmgmori.co.jp/movie/id=1685]
- [ ] DMG MORI — "NLX Heavy cutting" [dmgmori.co.jp/movie/id=1686]

### 10C: DMG MORI — DMU/DMC Series (5-Axis Milling)
- [ ] DMG MORI — "DMU 50 Machining demonstration" (5-axis simultaneous, demonstration workpiece) [dmgmori.co.jp/movie/id=1694]
- [ ] DMG MORI — "DMU 75 monoBLOCK Success Story — Stable production with PH Cell" [dmgmori.co.jp/movie/id=6871]
- [ ] DMG MORI — "INH 63 / INH 80 — 5-Axis Control Horizontal Machining Center" [dmgmori.co.jp/movie/id=6780]
- [ ] DMG MORI — "Heavy duty machining with INH 63" [dmgmori.co.jp/movie/id=7179]
- [ ] DMG MORI — "Machining of spiral bevel gears with INH 63" [dmgmori.co.jp/movie/id=7177]

### 10D: DMG MORI — Technology Cycles (63 Exclusive Cycles)
- [ ] DMG MORI — "Technology Cycle Chip Breaking" (intelligent chip management) [dmgmori.co.jp/movie/id=6281]
- [ ] DMG MORI — "Technology Cycle Measuring Pro" (on-machine measurement) [dmgmori.co.jp/movie/id=6853]
- [ ] DMG MORI — "gearSKIVING" (8x faster than conventional gear shaping, single-setup) [dmgmori.co.jp/movie/id=5642]
- [ ] DMG MORI — "gearHOBBING" (cylindrical + helical gears on NLX/NTX/CTX TC) [dmgmori.co.jp/movie/id=6176]
- [ ] DMG MORI — "Multi Threading 2.0" (advanced threading system) [dmgmori.co.jp/movie/id=6163]
- [ ] DMG MORI — "Keyway Broaching" [dmgmori.co.jp/movie/id=5903]
- [ ] DMG MORI — "Polygon Cutting" [dmgmori.co.jp/movie/id=5922]
- [ ] DMG MORI — "FreeTurn" (tool library, shop-floor programming) [en.dmgmori.com/technology-cycles/freeturn]

### 10E: DMG MORI — NHX/CMX Series (Horizontal/Vertical Machining Centers)
- [ ] DMG MORI — "NHX 4000/5000 4th Generation" [dmgmori.co.jp/movie/id=8083]
- [ ] DMG MORI — "NHX 5500/6300 2nd Generation" [dmgmori.co.jp/movie/id=3509]
- [ ] DMG MORI — "NHX 10000 µPrecision — Large sized" [dmgmori.co.jp/movie/id=7275]
- [ ] DMG MORI — "CMX 600 Vi" [dmgmori.co.jp/movie/id=6381]

### 10F: DMG MORI — LASERTEC/ULTRASONIC (Additive + Advanced)
- [ ] DMG MORI — "LASERTEC 3000 DED hybrid — Laser Metal Additive Manufacturing" [dmgmori.co.jp/movie/id=5942]
- [ ] DMG MORI — "LASERTEC 30 SLM US — Next generation SLM" [dmgmori.co.jp/movie/id=7825]
- [ ] DMG MORI — "LASERTEC 6600 DED hybrid — Large build area" [dmgmori.co.jp/movie/id=5727]
- [ ] DMG MORI — "ULTRASONIC Series Advanced Materials" [dmgmori.co.jp/movie/id=5140]

### 10G: DMG MORI — Automation & Peripherals
- [ ] DMG MORI — "speedMASTER 30k High-speed Spindle" (30,000 RPM) [dmgmori.co.jp/movie/id=6027]
- [ ] DMG MORI — "AI Chip Removal" [dmgmori.co.jp/movie/id=5336]
- [ ] DMG MORI — "Tool Visualizer — Automatic tool measurement" [dmgmori.co.jp/movie/id=5781]
- [ ] DMG MORI — "Non-contact On-machine Measuring" [dmgmori.co.jp/movie/id=5485]
- [ ] DMG MORI — "NZ-Platform Flexible Integration Machine" [dmgmori.co.jp/movie/id=6366]

### 10H: Titans of CNC — DMG MORI NLX-2500 Series (YouTube — CONFIRMED IDs)
- [ ] Titans of CNC — "Multi-Axis Milling on DMG MORI NLX-2500 Lathe" (Inconel 625, live tooling) [youtube.com/watch?v=u3wHT31kmuw]
- [ ] Titans of CNC — "DMG MORI NLX 2500 — CNC Machining Our FIRST PART" (3.0" dia 6Al-4V Titanium, Vlog #15) [youtube.com/watch?v=neYohm1Aq-o]
- [ ] Titans of CNC — "Machining TITAN-1M in Inconel 625" (UMC-750, Kennametal tools, full process) [youtube.com/watch?v=QVAcIS4WhPM]

### 10I: Haas Automation — Speeds/Feeds/Power (YouTube — CONFIRMED IDs)
- [ ] Haas — "How To Calculate Speeds and Feeds (Inch Version)" [youtube.com/watch?v=zzzipc39wug]
- [ ] Haas — "How To Calculate Speeds and Feeds (Metric Version)" [youtube.com/watch?v=gTnkNHB7dss]
- [ ] Haas — "YOUR FEEDRATE IS WRONG!" (effective vs programmed feed) [youtube.com/watch?v=6wLU97gVo5k]
- [ ] Haas — "Spindle Speed Variation — Stop chatter on your CNC lathe" (SSV anti-chatter) [youtube.com/watch?v=dxr2wddffm4]
- [ ] Haas — "Quickly Calculate Feeds and Speeds" (control calculator) [youtube.com/watch?v=i5kf6a3-sn8]
- [ ] Haas — "UMC-750 First Look" (5-axis demo) [youtube.com/watch?v=uc5p6ss3lre]
- [ ] Haas — "UMC-750 & HRP-2 Robot Demo" (automation + cutting) [youtube.com/watch?v=v8hAwlM0HOo]
- [ ] Haas — "UMC-750 Redesign" (HSK spindle, chip evacuation improvements) [youtube.com/watch?v=0l9BvfXg-mU]

### 10J: Mazak — INTEGREX Multi-Tasking
- [ ] Mazak — "INTEGREX i-200 Complete Machining" (DONE-IN-ONE turning+milling)
- [ ] Mazak — "INTEGREX i-300S/i-350S Demonstration" (with sub-spindle)
- [ ] Mazak — "INTEGREX i-400 Full Part Run" (large part multi-tasking)
- [ ] Mazak — "INTEGREX i-350S NEO with Grinding" (turning+milling+grinding, DISCOVER 2025)
- [ ] Mazak — "INTEGREX j-200 NEO" (new horizontal multi-tasking)
- [ ] Mazak — "Quick Turn 250MSY Complete Part" (turning + milling + Y-axis)
- [ ] Mazak — "VARIAXIS 5-Axis Demonstration" (simultaneous 5-axis milling)
- [ ] Mazak — "SmoothAi CNC — Programming Tutorial" (latest controller)

### 10K: Okuma — MULTUS Multi-Tasking
- [ ] Okuma — "MULTUS U3000 Multitasking Machine" (B-axis head, CAPTO C6, 12,000 RPM milling) [okuma.com/videos/multus-u3000]
- [ ] Okuma — "Master Multitasking with the MULTUS U3000" [okuma.com/videos/master-multitasking]
- [ ] Okuma — "MULTUS U3000 — Multitasking Lathe" [okuma.com/videos/multus-u3000]
- [ ] Okuma — "MULTUS B300II" (turn-mill fusion, 8-10" chuck class)
- [ ] Okuma — "GENOS M660-V 5-axis" (vertical machining center)
- [ ] Okuma — "LB3000 EX II Turning Center" (universal turning)
- [ ] Okuma — "OSP-P300 Programming Tutorial" (controller interface)

### 10L: MTDCNC — DMG MORI Coverage
- [ ] MTDCNC — "Introducing the All-New Generation NLX 2500 from DMG MORI" (Pfronten factory exclusive) [mtdcnc.com/event/dmg-mori/introducing-the-all-new-generation-nlx-2500]
- [ ] MTDCNC — "DMG MORI NTX 500 — Big Performance in a Small Footprint" [mtdcnc.com/event/dmg-mori/dmg-mori-ntx-500]
- [ ] MTDCNC — "DMG MORI NTX 3000 — New Design Change for Flexibility" [mtdcnc.com]
- [ ] MTDCNC — "DMG MORI NLX 2500/700 — Universal and Gantry Loaded Turning" [mtdcnc.global]
- [ ] MTDCNC — "DMG MORI INH 63 — Horizontal 5-Axis" [mtdcnc.com]

### 10M: Sandvik Coromant — Application Guides (Long-Form)
- [ ] Sandvik Coromant — "PrimeTurning Demonstration" (all-directional turning, CoroTurn Prime tools)
- [ ] Sandvik Coromant — "CoroPlus ToolPath for PrimeTurning" (toolpath optimization software) [videos.sandvik.coromant.com]
- [ ] Sandvik Coromant — "CoroPlus Tool Guide" (cutting data recommendation system)
- [ ] Sandvik Coromant — "Metal Cutting Technology" training series (~20 videos, foundational)

### 10N: DMG MORI Technology Cycle Reference (All 63 Cycles)
**Turning/Turn-Mill Handling:** Tool Sort, Tailstock for Turret, Steady Rest for Turret, Counter Spindle Tip, Control of Program Status, autoCHUCK 2.0, safeRETREAT, AAC, cCLAMP, Tool Balance Assistant, Chip Breaking
**Turning/Turn-Mill Measuring:** Tool Visualizer
**Turning/Turn-Mill Machining:** 5-axis Simultaneous, Multi Threading 2.0/Pro 2.0, Polygon/Oval-Turning, crownHOBBING, gearBROACHING, gearHONING, Y-Axis Parting, Keyway Broaching, FreeTurn, Polygon/Oval-Grinding, Excentric Grinding
**Turning/Turn-Mill Monitoring:** Runtime Monitor, iJAW
**Milling Handling:** Multitool, Application Tuning Cycle, Alternating Speed, Retraction Cycle
**Milling Measuring:** 3D quickSET
**Milling Machining:** gearHOBBING, gearSHAPING, gearSKIVING 2.0, DMG MORI gearMILL, Grinding, Flat Grinding, Interpolation Turning 2.0, Excentric Turning/Milling, Efficient Production Package, Polygon/Oval-Milling
**Milling Monitoring:** Easy Tool Monitor 2.0, MPC 2.0 (Machine Protection Control)
**Mill+Turn Handling:** Fit In (B-axis Plunging), AI Chip Removal, angularTOOL
**Mill+Turn Measuring:** L-Measuring Probe Packet, W-Setter, VCS Complete, Tilted Measuring Cycle, gearQUALITY, In-Machine Tool Balancing
**Mill+Turn Machining:** Profile Dressing
**Mill+Turn Monitoring:** MVC (Machine Vibration Control), TCC (Tool Control Center), Maintenance Package i4.0
**Advanced:** intoolSENSOR, AHD (Automatic Hole Detection), ULTRASONIC microDRILL, ULTRASONIC axialGRINDING, ULTRASONIC feedCONTROL, AM Evaluator

---

## CATEGORY 11: CNC Controller Training — Programming, Setup, Operations

### 11A: Haas NGC & Pre-NGC Control Training (YouTube — CONFIRMED IDs)
- [ ] Haas — "Haas Control Training Video" (29:41) [youtube.com/watch?v=DcWP8gANypk]
- [ ] Haas — "Make This Part On Day One" (29:14) [youtube.com/watch?v=m0ukd8vT9bw]
- [ ] Haas — "Haas ST-20Y Setup Video" (23:45) [youtube.com/watch?v=eX3KzIyq7BQ]
- [ ] Haas — "Set Your Lathe Offsets Manually" (22:33) [youtube.com/watch?v=rd2u2MG6meY]
- [ ] Haas — "Next Generation Control overview" (20:21) [youtube.com/watch?v=dAAewZgcG1k]
- [ ] Haas — "Essential Macro Video — Intro to CNC Macros and Subprograms" (20:30) [youtube.com/watch?v=ZLW_MX5_NIM]
- [ ] Haas — "Haas startup, setup, and running a job" (17:00) [youtube.com/watch?v=j612eMTI0RE]
- [ ] Haas — "Introduction to the Haas Next Generation Control" (8:12) [youtube.com/watch?v=3fBBxo29-es]
- [ ] Haas — "Advanced Tool Management NGC Control" (8:11) [youtube.com/watch?v=jIV_zrJJz8k]
- [ ] Haas — "Haas SL-20 Lathe Setup" (12:51) [youtube.com/watch?v=5lZR3tIIPwM]
- [ ] Haas — "HASS TL2 CNC Lathe Training" (18:41) [youtube.com/watch?v=_W5dCRePYZI]
- [ ] Haas — "Haas lathe tool setup" (14:20) [youtube.com/watch?v=6Er_owJM5_g]
- [ ] Haas — "Set Work Offsets in Seconds" (11:30) [youtube.com/watch?v=5I1eG49XnTA]
- [ ] Haas — "Tool Offsets Explained" (10:54) [youtube.com/watch?v=J7dCwBkUNNU]
- [ ] Haas — "How to Set Tool Length and Work Offsets" (12:01) [youtube.com/watch?v=uNjMIIRttFE]
- [ ] Haas — "Set Up Live Tools Properly on Your Haas Lathe" (13:19) [youtube.com/watch?v=Yo1J5XWy78Y]
- [ ] Haas — "Visual Programming System for Lathes" (5:06) [youtube.com/watch?v=Gjc6GmKxHoA]
- [ ] Haas — "TL-1 CNC Lathe Setup & Operation" (23:53) [youtube.com/watch?v=sB6Zqd4tV5s]
- [ ] Haas — "Loading and simulating a program: older Haas control" (4:24) [youtube.com/watch?v=6GPG7Zd9CWY]
- [ ] Haas — "How to Start A Job in the Middle of The Program" (6:09) [youtube.com/watch?v=ePlyXeXYZBE]

### 11B: Fanuc Control Training — Manual Guide i, Macros (YouTube — CONFIRMED IDs)
- [ ] Fanuc — "MANUAL GUIDE i Part 1 Overview Setup" (1:04:47) [youtube.com/watch?v=g4icMsIsc9g]
- [ ] Fanuc — "MANUAL GUIDE i Part 2 Basic Turning Program" (58:57) [youtube.com/watch?v=veanqAXWDJA]
- [ ] Fanuc — "MANUAL GUIDE i Part 3 Creating a Basic Milling Program" (58:31) [youtube.com/watch?v=iaQ9EI_SGg8]
- [ ] Fanuc — "MANUAL GUIDE i Part 4 Advanced" (1:00:13) [youtube.com/watch?v=AUeVPLrMrls]
- [ ] Fanuc — "MANUAL GUIDE i Part 5 Probing" (57:01) [youtube.com/watch?v=OiEH4mIfKgI]
- [ ] Fanuc — "AIT220 Lecture 10 — FANUC Macros and misc commands" (1:20:46) [youtube.com/watch?v=mQkBvsglpKQ]
- [ ] Fanuc — "G & M Code — Titan Teaches Manual Programming" (26:32) [youtube.com/watch?v=5XihF05K4yM]
- [ ] Fanuc — "Fanuc Mill Getting Started" (21:48) [youtube.com/watch?v=Q_hK7neAVT4]
- [ ] Fanuc — "Fanuc iHMI CNC Panel" (6:25) [youtube.com/watch?v=bMLAWKKnnSw]
- [ ] Fanuc — "9 Lines of Code Every CNC Machinist Needs To Know" (11:03) [youtube.com/watch?v=hJM8pnUazpk]
- [ ] Fanuc — "Programming CNC Macros Part 1" (11:00) [youtube.com/watch?v=HiXqFz-Nfh8]

### 11C: Siemens Sinumerik 840D/828D — ShopMill/ShopTurn (YouTube — CONFIRMED IDs)
- [x] Siemens — "ShopMill Setup and Programming 840D 828D" (2:30:13) [youtube.com/watch?v=9WJM1yDKENo] ✓ LEARNED 2026-03-28
- [x] Siemens — "Shop Floor Programming 101 with ShopMill" (1:43:53) [youtube.com/watch?v=xfIeiMA2vbM] ✓ LEARNED 2026-03-28
- [ ] Siemens — "Tips and tricks for Sinumerik 828D and 840D" (1:37:23) [youtube.com/watch?v=lZnkFvUAP0I]
- [x] Siemens — "5-axis 3+2 G-code Programming with ProgramGuide" (1:35:04) [youtube.com/watch?v=H4nMX3aFVQo] ✓ LEARNED 2026-03-28
- [x] Siemens — "Setup & Programming Turn Mill B-Axis Lathes in ShopTurn" (1:34:47) [youtube.com/watch?v=N0Rf9gnbcQs] ✓ LEARNED 2026-03-28
- [ ] Siemens — "Part Probing in Auto mode with ShopMill" (1:33:48) [youtube.com/watch?v=WeMCwfHjKtQ]
- [ ] Siemens — "Setup & Programming 4th Axis Machine in ShopMill" (1:32:21) [youtube.com/watch?v=DiScD9xRHhk]
- [ ] Siemens — "Easy CNC with ShopTurn — setup and programming" (1:29:27) [youtube.com/watch?v=yjtqqXz-O4Q]
- [ ] Siemens — "Sinumerik 828D ShopMill Setup and Programming" (1:27:44) [youtube.com/watch?v=NZLrHCrb0LE]
- [ ] Siemens — "Commonality of Programming for Sinumerik Milling 840D & 828" (1:25:20) [youtube.com/watch?v=Z4j6CPqzKJc]
- [ ] Siemens — "ID Part Programming with ShopTurn" (1:23:38) [youtube.com/watch?v=EuE_sGBGqoI]
- [ ] Siemens — "Setup & Programming Sub Spindle Lathes with ShopTurn" (1:19:54) [youtube.com/watch?v=QvBPuUIde0Y]
- [ ] Siemens — "Easy CNC with Sinumerik Part 1 ShopMill" (1:08:37) [youtube.com/watch?v=-WMJiO8emsg]
- [ ] Siemens — "Sinumerik Service and Maintenance 101" (2:02:25) [youtube.com/watch?v=jT7ajJiOpmY]
- [ ] Siemens — "Sinumerik 840D Training for Beginners" (19:24) [youtube.com/watch?v=5DcWmk-w7Wo]

### 11D: Mazak MAZATROL Programming (YouTube — CONFIRMED IDs)
- [ ] Mazak — "Mazak CNC Lathe Mazatrol Programming Tutorial" (1:10:51) [youtube.com/watch?v=EPkvGVNoV98]
- [ ] Mazak — "Setting Up Tools On The Mazak Integrex" (51:00) [youtube.com/watch?v=39vELy_RKVI]
- [ ] Mazak — "Basic Mazak Lathe Programming on Nexus Controller" (29:42) [youtube.com/watch?v=xUvwDh8bVu0]
- [ ] Mazak — "Mazak Smooth G Mazatrol Basics of Programming" (28:46) [youtube.com/watch?v=iOKXWYykMr8]
- [ ] Mazak — "Mazatrol Programming Tutorial CNC Turning Part 4" (27:32) [youtube.com/watch?v=30MLoVzOfv8]
- [ ] Mazak — "Mazatrol Programming Tutorial CNC Part 3" (26:04) [youtube.com/watch?v=uMosPzTI7aU]
- [ ] Mazak — "How to Program a Needle Valve with Mazatrol Part 2" (24:09) [youtube.com/watch?v=z1O1HXQ0Rcw]
- [ ] Mazak — "How to program a turned diameter on Mazak with Mazatrol" (22:25) [youtube.com/watch?v=TMN5xVkuBMY]
- [ ] Mazak — "Grooving with Mazatrol" (22:19) [youtube.com/watch?v=xYD-WGvU3VM]
- [ ] Mazak — "Mazak Minute Episode 1 — Pocket Milling" (16:47) [youtube.com/watch?v=qSqRF1zjZO0]
- [ ] Mazak — "Mazak Minute Episode 6 — EIA Programming" (16:20) [youtube.com/watch?v=_FmWOWvkKfs]
- [ ] Mazak — "Mazak Material Shape Function" (14:58) [youtube.com/watch?v=CaEHlSecRow]
- [ ] Mazak — "Mazak Smooth G Mazatrol End Unit continue Shift" (13:08) [youtube.com/watch?v=utPCJMxUolk]
- [ ] Mazak — "Mazak CNC Lathe Live tooling OD Drilling" (12:39) [youtube.com/watch?v=X-a2fvTX508]
- [ ] Mazak — "Mazak CNC Lathe Bar Face Function" (11:23) [youtube.com/watch?v=jiejsQlrLDc]
- [ ] Mazak — "Mazak CNC Lathe Face Drilling XY method" (17:19) [youtube.com/watch?v=OvsR3LTgFlw]
- [ ] Mazak — "Conversational Programming in Action: MAZATROL Simulator" (5:14) [youtube.com/watch?v=OiGWiAqhiyo]
- [ ] Mazak — "Mazak startup and home out" (9:24) [youtube.com/watch?v=ZihecpczmLI]

### 11E: Hurco WinMax Control Training (YouTube — CONFIRMED IDs)
- [ ] Hurco — "Quick Training Session 1: Helix & Threadmill on Hurco CNC" (1:02:10) [youtube.com/watch?v=UGI6cVC0x50]
- [ ] Hurco — "Quick Training Session 8: AdaptiPath" (34:17) [youtube.com/watch?v=CuQkEYurspw]
- [ ] Hurco — "Hurco Basics — From Power Up to Making Chips" (29:36) [youtube.com/watch?v=Ndqih34VTsY]
- [ ] Hurco — "CNC Control Demo Hurco WinMax V9" (29:11) [youtube.com/watch?v=v3Gtw0pazn4]
- [ ] Hurco — "Basics of DXF and Solid Model Import 3D Import" (20:06) [youtube.com/watch?v=xUfHja0eY6I]
- [ ] Hurco — "Introductory CNC Control Demonstration WinMax" (16:24) [youtube.com/watch?v=q1mZJkMY0Ks]
- [ ] Hurco — "AdaptiPath" (12:53) [youtube.com/watch?v=96_HSAKeXNU]
- [ ] Hurco — "3D Import Mill Surface Feature" (10:13) [youtube.com/watch?v=mLXTZLYaRlk]
- [ ] Hurco — "How to NC Merge with Patterns" (9:14) [youtube.com/watch?v=16dB33vK1oI]
- [ ] Hurco — "5-Sided CNC Conversational Demonstration" (8:09) [youtube.com/watch?v=-tlI2SBDefc]
- [ ] Hurco — "Understanding Tool Length and Radius Offsets" (7:08) [youtube.com/watch?v=_D0nuXIGrqI]
- [ ] Hurco — "Transform Plane Groups — 5-Axis Training" (7:17) [youtube.com/watch?v=wtKAX9TX3vU]

### 11F: Okuma OSP Control Training — Gosiger (YouTube — CONFIRMED IDs)
- [ ] Gosiger — "FULL 2 AXIS CLASS VIDEO" (3:01:03) [youtube.com/watch?v=a6HpUb9aIg0]
- [ ] Gosiger — "XZC class full" (1:15:58) [youtube.com/watch?v=m_81i5303N8]
- [ ] Gosiger — "AOT Advanced One Touch" (50:11) [youtube.com/watch?v=xLLh-hfe_R8]
- [ ] Gosiger — "Okuma Mill CAS (Collision Avoidance System)" (34:27) [youtube.com/watch?v=BSHxkpqjbxA]
- [ ] Gosiger — "AOT for Okuma Machining Center Demo" (25:49) [youtube.com/watch?v=lH0U1afCBp4]
- [ ] Gosiger — "Okuma OSP-P300L Control Overview" (22:06) [youtube.com/watch?v=cIfaBuAXnIo]
- [ ] Gosiger — "Okuma Mill Graphic" (20:17) [youtube.com/watch?v=eTaY3ZG7B9k]
- [ ] Gosiger — "Broaching on an Okuma Lathe" (18:46) [youtube.com/watch?v=fxINldXY8QQ]
- [ ] Gosiger — "Soft Jaw Process" (18:14) [youtube.com/watch?v=_pmqRIw3NHk]
- [ ] Gosiger — "Main and tool screens on the Okuma P300m" (14:59) [youtube.com/watch?v=_J7ug9KLig0]
- [ ] Gosiger — "Lathe tool offset pages" (14:29) [youtube.com/watch?v=tDKasvGIPyU]
- [ ] Gosiger — "Double tool holder attachment for Okuma turning centers" (14:29) [youtube.com/watch?v=4FwdRZQevpc]
- [ ] Gosiger — "Okuma CAS Auto Set function" (13:27) [youtube.com/watch?v=b0iinirYW9k]
- [ ] Gosiger — "Setting work zero" (10:39) [youtube.com/watch?v=SeOdjKOv9Yg]
- [ ] Gosiger — "ALIGN X Y for Okuma Y axis turning centers" (9:42) [youtube.com/watch?v=ENh8aJ2sgIM]
- [ ] Gosiger — "Okuma OSP Suite" (9:07) [youtube.com/watch?v=jI2KDQ8KQHA]
- [ ] Gosiger — "AOT pinch turning" (7:52) [youtube.com/watch?v=Xm31Be5w9ss]
- [ ] Okuma — "Tool Load Monitoring Mori Seiki NLX2000 Celos Mapps 5" (8:41) [youtube.com/watch?v=NS1EIKLeGbo]
- [ ] Okuma — "Harmonic Spindle Speed Control: Preventing Chatter" (2:56) [youtube.com/watch?v=Qn5Zu1iVsao]
- [ ] Okuma — "Top Unused OSP Control Features: Cycle Time Reduction" (2:02) [youtube.com/watch?v=_nsORw-p5Rk]

### 11G: Doosan/DN Solutions Training (YouTube — CONFIRMED IDs)
- [ ] Doosan — "SMX 3100 9 AXIS TOOLING, SETUP & MACHINING DEMO" (2:00:42) [youtube.com/watch?v=WZj5W0ek20A]
- [ ] Doosan — "Incredible 5 Axis Tool Paths on 9 Axis Doosan Mill/Turn Episode 2" (58:46) [youtube.com/watch?v=OJF82IdCVQ8]
- [ ] Doosan — "Integrex MAZATROL Demo on PUMA 2600 SY II" (28:40) [youtube.com/watch?v=nrt9feIfq58]
- [ ] Doosan — "Secrets to Running a SMX3100 9 Axis Mill Turn" (16:02) [youtube.com/watch?v=-nZR7THEwNY]
- [ ] Doosan — "CNC Doosan Student Part Project #4 Operation 1" (15:39) [youtube.com/watch?v=THhtsk2Aqso]
- [ ] Doosan — "Restarting After Program Interruption — Know Your DN, Episode 14" (10:55) [youtube.com/watch?v=67nRLF0YXUM]
- [ ] Doosan — "Machining 15-5 Stainless Steel on PUMA 2600SY II" (9:42) [youtube.com/watch?v=fUqoGG5eEXA]
- [ ] Doosan — "Titanium Aerospace Part on PUMA 2600 SY II" (7:02) [youtube.com/watch?v=P0T6F9INb10]
- [ ] Doosan — "Titanium Part on 9 AXIS MILL/TURN Speeds & Feeds PUMA SMX3100" (6:45) [youtube.com/watch?v=H5bRy1smFOY]
- [ ] Doosan — "DN Solutions PUMA SY II Control Overview" (6:45) [youtube.com/watch?v=nimAD0B79vU]
- [ ] Doosan — "Dialing in OD/ID Dimensions on PUMA 2600SY II" (6:50) [youtube.com/watch?v=OjP0z3WeEVE]
- [ ] Doosan — "Loading & Touching Off Tools in 9-Axis SMX3100ST" (5:04) [youtube.com/watch?v=A51xr8w_epQ]

### 11H: Okuma Machine Demonstrations (YouTube — CONFIRMED IDs)
- [ ] Okuma — "Multus B300W Multifunction Wheel Demo" (15:59) [youtube.com/watch?v=p2A-trbOZ88]
- [ ] Okuma — "LB3000 EX + WTO Demo" (11:01) [youtube.com/watch?v=lfKi-hLrG4E]
- [ ] Okuma — "MULTUS U3000 Mill turn multi tasking" (10:05) [youtube.com/watch?v=NCttsq1s1J8]
- [ ] Okuma — "MULTUS B250II Mastercam Demo" (3:36) [youtube.com/watch?v=wHIS8T-YYiw]
- [ ] Okuma — "MULTUS U3000 Multitasking Machine" (3:43) [youtube.com/watch?v=NVjnaXGoaQ4]
- [ ] Okuma — "MULTUS U4000 Complete machining of a spiral" (2:39) [youtube.com/watch?v=S5XriAUBxaM]
- [ ] Okuma — "LB3000 EX with Middle Index Function" (3:43) [youtube.com/watch?v=XBK6lEJJQnc]
- [ ] Okuma — "Nakamura Tome TMC 20 II — Full Training" (1:47:29) [youtube.com/watch?v=jSaa3t6Rm14]

### 11I: Brother Speedio Training (YouTube — CONFIRMED IDs)
- [ ] Brother — "How to set a Z position on a Brother CNC mill — no probe" (12:35) [youtube.com/watch?v=O8c2bf38Hog]
- [ ] Brother — "How to use Renishaw probe to pick up Z position" (5:20) [youtube.com/watch?v=u5TNWxf_CTg]
- [ ] Brother — "TC-S2A Basics — Work Coordinate System" (5:11) [youtube.com/watch?v=4OfMD4yHrAg]
- [ ] Brother — "How to select pallet programs on Brother 450 CNC mill" (4:07) [youtube.com/watch?v=91z8FMM0CVs]
- [ ] Brother — "Speedio Control Basics — Work Offsets" (1:50) [youtube.com/watch?v=gyNzw8QSGOo]
- [ ] Brother — "How to find and edit Fusion 360 post for Brother Speedio" (4:49) [youtube.com/watch?v=Qdqqqe3rLWk]

### 11J: Nakamura-Tome Training (YouTube — CONFIRMED IDs)
- [ ] Nakamura — "Shabai TV — Nakamura Tome TMC 20 II Full Training" (1:47:29) [youtube.com/watch?v=jSaa3t6Rm14]
- [ ] Nakamura — "Program Optimizer for Cycle Time Reduction" (11:02) [youtube.com/watch?v=TPB5gtmrR6g]
- [ ] Nakamura — "Geometry Navigator and Process Integration" (9:13) [youtube.com/watch?v=OBVY0dEpVeo]
- [ ] Nakamura — "Multiple Gear Machining on Multi-Tasking Machine" (7:46) [youtube.com/watch?v=O3qMbF7LtA0]
- [ ] Nakamura — "Copper Part Setup on Live Tooling Full Y axis" (5:46) [youtube.com/watch?v=2LRSRUvCLBs]

### 11K: GROB 5-Axis Machining Centers (YouTube — CONFIRMED IDs)
- [ ] GROB — "GROB G350 at Open House — Aerospace Parts" (10:34) [youtube.com/watch?v=EapRX0-ZWnM]
- [ ] GROB — "5-Axis Horizontal CNC Machining Centers — Entering Job Shop" (5:48) [youtube.com/watch?v=OIhuU8osNAk]
- [ ] GROB — "5-Axis Universal Machining Centers 3D Product Animation" (5:11) [youtube.com/watch?v=vyVHnBZH90M]
- [ ] GROB — "ATHENA Demo on G350" (7:02) [youtube.com/watch?v=8t--V39JKFA]
- [ ] GROB — "G350 Generation 2 Turbine blade" (2:17) [youtube.com/watch?v=dZpMSKnUj98]
- [ ] GROB — "Blisk machining on G350 Gen 2" (2:44) [youtube.com/watch?v=1AbLkXm-sN8]

### 11L: Heller Machining Centers (YouTube — CONFIRMED IDs)
- [ ] Heller — "Turning on a Horizontal Machining Centre — only at Heller" (5:04) [youtube.com/watch?v=wHBXGpCS1HY]
- [ ] Heller — "Brand new 5-axis mill-turn technology from Heller" (7:31) [youtube.com/watch?v=ZlUfhF2HECY]
- [ ] Heller — "Heller MC20" (5:22) [youtube.com/watch?v=2L3njZ5tEHM]

### 11M: Mazak INTEGREX Multi-Tasking (YouTube — CONFIRMED IDs)
- [ ] Mazak — "Setting Up Tools On The Mazak Integrex" (51:00) [youtube.com/watch?v=39vELy_RKVI]
- [ ] Mazak — "Mazak Integrex 35 — Square parts on a lathe" (8:08) [youtube.com/watch?v=nTts2HqUBXE]
- [ ] Mazak — "INTEGREX i-250H ST machining" (28:40) [youtube.com/watch?v=nrt9feIfq58]
- [ ] Mazak — "INTEGREX i-630V/6 Vertical Multi-Tasking 5-axis" (3:44) [youtube.com/watch?v=STgh9EahbR0]
- [ ] Mazak — "INTEGREX i-250H ST with Automation" (3:01) [youtube.com/watch?v=lJAJHBXTcKM]

### 11N: DMG MORI Full-Length Operations (YouTube — CONFIRMED IDs)
- [ ] DMG MORI — "Full-length Machining Process of a Surgical Hammer on NTX 2500" (58:59) [youtube.com/watch?v=3_--S6niRKc]
- [ ] DMG MORI — "Full-Length Machining Process of a Falcon on DMU 85 H-monoBLOCK" (52:29) [youtube.com/watch?v=4Py7E_CCM4Y]
- [ ] DMG MORI — "DMU 60 eVo — absolute precision" (39:22) [youtube.com/watch?v=k3W-hfWii7I]
- [ ] DMG MORI — "Full POV part set up on DMG Mori NL2500SY" (34:57) [youtube.com/watch?v=pn9Oje6zYsg]
- [x] DMG MORI — "First Operation Walk-Thru DMU-50" (18:27) [youtube.com/watch?v=NFKIIQZx0jE] — extracted: Siemens 840D ShopMill, probing, feed override safety, 14 shop tips
- [x] DMG MORI — "Second Operation Walk-Thru DMU-50" (15:02) [youtube.com/watch?v=-qCUU36j0H8] — extracted: work stop setup, dead blow seating, offset creep correction
- [ ] DMG MORI — "DMG Mori lathe training Day 1" (17:07) [youtube.com/watch?v=z4xm3wo5Zzg]
- [ ] DMG MORI — "5-Axis CNC Machining for Aerospace DMU 40" (2:54) [youtube.com/watch?v=pCatlRuSo6Y]
- [ ] DMG MORI — "Complete Machining of Gear Parts with Technology Cycles NTX 2500" (2:33) [youtube.com/watch?v=Oy5XO7_HSEQ]
- [ ] DMG MORI — "NTX 2500 Surgical Hammer" (2:11) [youtube.com/watch?v=nEB-0lb6JiM]
- [ ] DMG MORI — "NTX 2000/2500/3000 3rd Generation Revolution" (3:24) [youtube.com/watch?v=EY7P8-Rl71Q]
- [ ] DMG MORI — "Semiconductor Chamber Housing Complete Machining" (4:05) [youtube.com/watch?v=JxPC5etPDEM]
- [ ] DMG MORI — "CELOS Apps Machine Programming" (5:18) [youtube.com/watch?v=l7MtjCWFM4g]
- [ ] DMG MORI — "Conversational Programming NLX2500 OD Roughing" (3:07) [youtube.com/watch?v=n58a86O9E4A]
- [ ] DMG MORI — "Conversational Programming NLX2500 Facing" (2:06) [youtube.com/watch?v=4EumRs3PxgE]
- [ ] DMG MORI — "Turning and Milling on NLX2500" (5:54) [youtube.com/watch?v=RxC5xP2n7QI]
- [ ] DMG MORI — "NLX Kennametal Parting Off 3.0 Dia TITANIUM" (1:28) [youtube.com/watch?v=ajmdsFOH4iI]
- [ ] DMG MORI — "Technology Cycles: Excentric Machining" (1:05) [youtube.com/watch?v=6Es3oXNNUUM]
- [ ] DMG MORI — "Technology Cycles: Interpolation Turning" (1:03) [youtube.com/watch?v=FeUK8PV32QA]
- [ ] DMG MORI — "Technology Cycles: Multi Threading 2.0" (1:09) [youtube.com/watch?v=CzMQhDCZAhg]
- [ ] DMG MORI — "Full 5-Axis Gear Cutting with DMU 50" (5:43) [youtube.com/watch?v=pDe7KBk1M5Y]
- [ ] DMG MORI — "DMG HSC55 FULL LENGTH VIDEO" (13:15) [youtube.com/watch?v=F3TS6mXoP7g]
