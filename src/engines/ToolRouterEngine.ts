/**
 * ToolRouterEngine — Intent-based tool routing for token efficiency
 *
 * Maps natural-language intents to the most efficient tool/action path.
 * Prevents wasted dispatcher calls by recommending the shortest path
 * to the answer (e.g., use QuickCalcEngine directly instead of going
 * through calcDispatcher for simple RPM calculations).
 *
 * Token savings: Eliminates trial-and-error tool exploration.
 *
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

export interface RouteResult {
  /** Recommended approach */
  route: string;
  /** Engine or dispatcher to use */
  target: string;
  /** Specific action or method */
  action: string;
  /** Parameters hint */
  params?: string;
  /** Why this route was chosen */
  reason: string;
  /** Estimated token cost (lower is better) */
  estimatedTokens: number;
}

interface RoutePattern {
  keywords: string[];
  route: string;
  target: string;
  action: string;
  params?: string;
  reason: string;
  estimatedTokens: number;
}

const ROUTE_PATTERNS: RoutePattern[] = [
  // Quick calculations — use QuickCalcEngine directly
  { keywords: ["rpm", "spindle speed", "surface speed to rpm"], route: "direct", target: "QuickCalcEngine", action: "rpm(sfm, diameter, metric?)", reason: "Direct calc, no dispatcher overhead", estimatedTokens: 50 },
  { keywords: ["feed rate", "feedrate", "ipm", "feed per tooth"], route: "direct", target: "QuickCalcEngine", action: "feedRate(rpm, chipLoad, flutes, metric?)", reason: "Direct calc", estimatedTokens: 50 },
  { keywords: ["mrr", "material removal", "removal rate"], route: "direct", target: "QuickCalcEngine", action: "mrr(woc, doc, feedRate, metric?)", reason: "Direct calc", estimatedTokens: 50 },
  { keywords: ["chip load", "chipload"], route: "direct", target: "QuickCalcEngine", action: "chipLoad(feedRate, rpm, flutes)", reason: "Direct calc", estimatedTokens: 50 },
  { keywords: ["tap drill", "tapping drill"], route: "direct", target: "QuickCalcEngine", action: "tapDrill(majorDia, pitch)", reason: "Direct calc", estimatedTokens: 50 },
  { keywords: ["scallop", "cusp height", "ball nose finish"], route: "direct", target: "QuickCalcEngine", action: "scallopHeight(toolRadius, stepover)", reason: "Direct calc", estimatedTokens: 50 },
  { keywords: ["cutting time", "machining time", "cycle time estimate"], route: "direct", target: "QuickCalcEngine", action: "cuttingTime(distance, feedRate)", reason: "Direct calc", estimatedTokens: 50 },
  { keywords: ["horsepower", "cutting power", "hp required"], route: "direct", target: "QuickCalcEngine", action: "cuttingPower(mrr, material)", reason: "Direct calc", estimatedTokens: 50 },
  { keywords: ["thread pitch", "tpi to metric"], route: "direct", target: "QuickCalcEngine", action: "threadPitch(tpi)", reason: "Direct calc", estimatedTokens: 50 },

  // System info — use snapshot engines
  { keywords: ["system status", "how many engines", "system counts"], route: "direct", target: "SystemSnapshotEngine", action: "getCompactSnapshot()", reason: "Cached snapshot, ~100 tokens", estimatedTokens: 100 },
  { keywords: ["what changed", "recent changes", "delta"], route: "direct", target: "SessionDeltaEngine", action: "getRecentActivity(hours)", reason: "Git-based delta", estimatedTokens: 150 },
  { keywords: ["drift", "count mismatch", "docs outdated"], route: "direct", target: "SystemSnapshotEngine", action: "getDriftReport()", reason: "Cached drift check", estimatedTokens: 200 },

  // Action discovery — use DispatcherMapEngine
  { keywords: ["find action", "which dispatcher", "action search", "what actions"], route: "direct", target: "DispatcherMapEngine", action: "searchActions(query) or findAction(name)", reason: "Cached action index", estimatedTokens: 100 },
  { keywords: ["dispatcher list", "all dispatchers", "dispatcher map"], route: "direct", target: "DispatcherMapEngine", action: "getCompactMap()", reason: "Cached map", estimatedTokens: 200 },

  // Material lookup — use calcDispatcher
  { keywords: ["material properties", "material lookup", "hardness", "tensile strength"], route: "dispatcher", target: "calcDispatcher", action: "material_lookup", reason: "Full material DB query", estimatedTokens: 300 },
  { keywords: ["material strategy", "speed and feed for", "cutting parameters for"], route: "dispatcher", target: "camDispatcher", action: "strategy_recommend", reason: "Strategy DB with 66 material-op combos", estimatedTokens: 400 },

  // Tool selection
  { keywords: ["tool selection", "which end mill", "tool recommend", "cutter for"], route: "dispatcher", target: "dataDispatcher", action: "tool_recommend", reason: "Tool catalog search", estimatedTokens: 400 },

  // Batch operations
  { keywords: ["batch", "multiple actions", "bulk query"], route: "direct", target: "BatchQueryEngine", action: "executeBatch(actions[])", reason: "N actions in 1 call", estimatedTokens: 100 },

  // CNC Program generation with auto S/F
  { keywords: ["generate program", "cnc program", "g-code program", "auto speed feed", "program with speeds"], route: "dispatcher", target: "camDispatcher", action: "program_assemble", reason: "Full CNC program with physics-optimized S/F", estimatedTokens: 500 },
  { keywords: ["batch speed feed", "speeds for all tools", "tool table speeds"], route: "dispatcher", target: "camDispatcher", action: "program_batch_sf", reason: "Batch S/F calculation", estimatedTokens: 300 },
  { keywords: ["optimize g-code", "optimize gcode feeds", "line by line feed"], route: "dispatcher", target: "camDispatcher", action: "auto_speed_feed_optimize", reason: "Line-by-line G-code S/F optimization", estimatedTokens: 500 },

  // Motion dynamics
  { keywords: ["acceleration profile", "velocity profile", "trapezoidal motion"], route: "dispatcher", target: "camDispatcher", action: "motion_trapezoidal", reason: "Machine motion dynamics", estimatedTokens: 200 },
  { keywords: ["s-curve", "jerk limit", "smooth motion"], route: "dispatcher", target: "camDispatcher", action: "motion_scurve", reason: "Jerk-limited S-curve profile", estimatedTokens: 200 },
  { keywords: ["corner speed", "cornering velocity", "direction change"], route: "dispatcher", target: "camDispatcher", action: "motion_corner_velocity", reason: "Corner velocity from chord error", estimatedTokens: 150 },
  { keywords: ["look ahead", "lookahead", "feed effectiveness"], route: "dispatcher", target: "camDispatcher", action: "motion_look_ahead", reason: "Controller look-ahead simulation", estimatedTokens: 300 },

  // Engagement & chip thinning
  { keywords: ["chip thinning", "engagement angle", "wrap angle"], route: "dispatcher", target: "camDispatcher", action: "engage_chip_thinning", reason: "Chip thinning compensation", estimatedTokens: 150 },
  { keywords: ["constant force feed", "adaptive feed", "engagement adaptive"], route: "dispatcher", target: "camDispatcher", action: "engage_adapt_feed", reason: "Engagement-adaptive feed control", estimatedTokens: 300 },
  { keywords: ["constant mrr", "maintain removal rate"], route: "dispatcher", target: "camDispatcher", action: "engage_constant_mrr", reason: "Constant MRR feed scaling", estimatedTokens: 150 },

  // Science & physics
  { keywords: ["oxley", "oblique cutting", "cutting physics", "size effect"], route: "dispatcher", target: "camDispatcher", action: "sci_oxley", reason: "Advanced cutting physics models", estimatedTokens: 300 },
  { keywords: ["reliability", "rul", "remaining useful life", "weibull"], route: "dispatcher", target: "camDispatcher", action: "rel_bayesian_rul", reason: "Reliability engineering", estimatedTokens: 300 },
  { keywords: ["volumetric accuracy", "geometric accuracy", "ball bar", "21 error"], route: "dispatcher", target: "camDispatcher", action: "acc_volumetric", reason: "Machine geometric accuracy", estimatedTokens: 300 },
  { keywords: ["spc", "process monitoring", "hotelling", "pca monitoring"], route: "dispatcher", target: "camDispatcher", action: "spm_hotelling_t2", reason: "Statistical process monitoring", estimatedTokens: 300 },
  { keywords: ["constitutive", "zerilli", "johnson cook", "flow stress"], route: "dispatcher", target: "camDispatcher", action: "const_zerilli_armstrong", reason: "Constitutive material models", estimatedTokens: 200 },
  { keywords: ["crater wear", "flank wear", "stochastic wear", "wear physics"], route: "dispatcher", target: "camDispatcher", action: "wear_combined_mechanisms", reason: "Advanced wear physics", estimatedTokens: 300 },
  { keywords: ["sustainability", "lca", "lifecycle", "eco efficiency", "carbon footprint"], route: "dispatcher", target: "camDispatcher", action: "sus_lifecycle_assessment", reason: "Sustainability LCA analysis", estimatedTokens: 300 },
  { keywords: ["coolant", "mql", "cryogenic", "through spindle"], route: "dispatcher", target: "camDispatcher", action: "cool_reynolds_flow", reason: "Coolant dynamics modeling", estimatedTokens: 200 },

  // Cross-domain
  { keywords: ["monte carlo process", "process simulation", "stochastic"], route: "dispatcher", target: "calcDispatcher", action: "monte_carlo_process", reason: "Monte Carlo process simulation", estimatedTokens: 300 },
  { keywords: ["doe", "taguchi", "design of experiments"], route: "dispatcher", target: "calcDispatcher", action: "doe_taguchi", reason: "DOE/Taguchi optimization", estimatedTokens: 300 },
  { keywords: ["fixture", "clamping", "workholding force"], route: "dispatcher", target: "calcDispatcher", action: "fixture_clamping", reason: "Fixture clamping analysis", estimatedTokens: 200 },
  { keywords: ["springback", "bending compensation"], route: "dispatcher", target: "calcDispatcher", action: "springback_predict", reason: "Springback prediction", estimatedTokens: 200 },
  { keywords: ["gd&t", "tolerance stackup", "gdt"], route: "dispatcher", target: "calcDispatcher", action: "gdt_stackup", reason: "GD&T tolerance stackup", estimatedTokens: 300 },
  { keywords: ["digital twin", "process twin"], route: "dispatcher", target: "calcDispatcher", action: "process_digital_twin", reason: "Process digital twin", estimatedTokens: 400 },

  // Turning & lathe
  { keywords: ["turning", "lathe", "boring bar", "facing", "parting", "grooving", "taper turning"], route: "dispatcher", target: "turningDispatcher", action: "chuck_force", reason: "Lathe operations (7 actions)", estimatedTokens: 300 },
  { keywords: ["thread turning", "single point thread", "thread mill"], route: "dispatcher", target: "camDispatcher", action: "cam_thread_lookup", reason: "Threading operations", estimatedTokens: 300 },

  // Grinding
  { keywords: ["grinding", "surface grind", "creep feed", "centerless", "cylindrical grind"], route: "dispatcher", target: "grindingDispatcher", action: "wheel_select", reason: "Grinding operations (6 actions)", estimatedTokens: 300 },

  // EDM
  { keywords: ["edm", "wire edm", "sinker edm", "electrical discharge", "spark erosion"], route: "dispatcher", target: "edmDispatcher", action: "electrode_design", reason: "EDM operations (16 actions)", estimatedTokens: 300 },

  // 5-axis
  { keywords: ["5 axis", "five axis", "5-axis", "rtcp", "tool vector", "simultaneous milling"], route: "dispatcher", target: "fiveAxisDispatcher", action: "rtcp_calc", reason: "5-axis operations (5 actions)", estimatedTokens: 400 },

  // Quality & inspection
  { keywords: ["inspection", "cmm", "measurement", "first article", "quality check"], route: "dispatcher", target: "qualityDispatcher", action: "inspection_plan", reason: "Quality/inspection", estimatedTokens: 300 },
  { keywords: ["compliance", "as9100", "iso 9001", "medical device", "itar"], route: "dispatcher", target: "complianceDispatcher", action: "compliance_check", reason: "Standards compliance", estimatedTokens: 300 },

  // CAD & feature recognition
  { keywords: ["feature recognition", "geometry analysis", "cad import", "step file", "feature extract"], route: "dispatcher", target: "cadDispatcher", action: "geometry_analyze", reason: "CAD feature analysis (33 actions)", estimatedTokens: 400 },

  // Knowledge & tribal knowledge
  { keywords: ["tribal knowledge", "shop tip", "machinist tip", "best practice", "lessons learned"], route: "dispatcher", target: "knowledgeDispatcher", action: "search", reason: "Tribal knowledge DB (9 actions)", estimatedTokens: 200 },
  { keywords: ["hypermill tip", "mastercam tip", "fusion 360 tip", "cam tip", "solidcam tip"], route: "dispatcher", target: "knowledgeExtDispatcher", action: "search", reason: "CAM-specific knowledge", estimatedTokens: 200 },

  // Business & scheduling
  { keywords: ["quote", "costing", "price estimate", "job cost", "cycle cost"], route: "dispatcher", target: "businessDispatcher", action: "quote_estimate", reason: "Job costing/quoting", estimatedTokens: 300 },
  { keywords: ["schedule", "capacity", "job scheduling", "production plan", "due date"], route: "dispatcher", target: "schedulingDispatcher", action: "job_schedule", reason: "Production scheduling (8 actions)", estimatedTokens: 300 },

  // Safety
  { keywords: ["safety check", "collision check", "spindle limit", "rapid override", "safety validate"], route: "dispatcher", target: "guardDispatcher", action: "safety_validate", reason: "Safety validation", estimatedTokens: 200 },

  // Process control & telemetry
  { keywords: ["process control", "adaptive control", "in-process", "feedback loop"], route: "dispatcher", target: "processControlDispatcher", action: "ctc_analyze", reason: "Adaptive process control (6 actions)", estimatedTokens: 300 },
  { keywords: ["machine monitoring", "telemetry", "opc ua", "mtconnect", "machine data"], route: "dispatcher", target: "telemetryDispatcher", action: "telemetry_query", reason: "Machine telemetry", estimatedTokens: 300 },

  // Spindle torque/power curve
  { keywords: ["spindle torque", "spindle power", "torque curve", "power limit", "stall", "machine capacity"], route: "dispatcher", target: "calcDispatcher", action: "spindle_torque_available", reason: "Spindle torque/power curve analysis (5 actions)", estimatedTokens: 200 },

  // Diagnosis & troubleshooting
  { keywords: ["troubleshoot", "diagnose", "root cause", "chatter", "vibration problem", "surface finish problem"], route: "dispatcher", target: "diagnosisDispatcher", action: "diagnose_issue", reason: "Problem diagnosis", estimatedTokens: 400 },

  // Tool change & ATC
  { keywords: ["tool change", "atc", "automatic tool changer", "tool magazine", "tool pot"], route: "dispatcher", target: "atcsDispatcher", action: "task_init", reason: "ATC task management (12 actions)", estimatedTokens: 200 },

  // Novel toolpath algorithms
  { keywords: ["novel toolpath", "tgar", "hraf", "vortex chip", "adaptive roughing algorithm"], route: "dispatcher", target: "toolpathDispatcher", action: "novel_compute", reason: "Novel toolpath algorithms", estimatedTokens: 400 },

  // Process fingerprint
  { keywords: ["process fingerprint", "signature", "process dna", "fingerprint match"], route: "dispatcher", target: "pfpDispatcher", action: "fingerprint_match", reason: "Process fingerprint matching", estimatedTokens: 300 },

  // Shop practice
  { keywords: ["shop practice", "shop floor", "operator guide", "setup procedure"], route: "dispatcher", target: "shopPracticeDispatcher", action: "practice_search", reason: "Shop floor practices (18 actions)", estimatedTokens: 200 },

  // Adaptive control
  { keywords: ["adaptive control", "pid tuning", "real-time compensation", "feedback control"], route: "dispatcher", target: "adaptiveControlDispatcher", action: "pid_tune", reason: "Adaptive process control", estimatedTokens: 300 },

  // Multi-operation orchestration
  { keywords: ["multi operation", "multi-op", "operation sequence", "setup planning", "multi setup"], route: "dispatcher", target: "multiOpDispatcher", action: "plan_sequence", reason: "Multi-op orchestration", estimatedTokens: 400 },

  // Industry-specific
  { keywords: ["aerospace", "medical device", "automotive", "oil gas", "defense", "industry specific"], route: "dispatcher", target: "industryDispatcher", action: "industry_guide", reason: "Industry-specific requirements", estimatedTokens: 300 },

  // Scientific math
  { keywords: ["scientific calculation", "advanced math", "numerical method", "fea", "finite element"], route: "dispatcher", target: "scientificMathDispatcher", action: "compute", reason: "Scientific/mathematical computing", estimatedTokens: 300 },

  // Validation
  { keywords: ["validate program", "verify gcode", "program check", "dry run", "simulation verify"], route: "dispatcher", target: "validationDispatcher", action: "validate_program", reason: "Program verification", estimatedTokens: 300 },

  // Intelligence / AI recommendations
  { keywords: ["ai recommend", "intelligent suggest", "smart optimize", "what if analysis", "parameter optimize"], route: "dispatcher", target: "intelligenceDispatcher", action: "parameter_optimize", reason: "AI-powered recommendations", estimatedTokens: 400 },

  // Real-time monitoring
  { keywords: ["real time", "live monitoring", "streaming data", "sensor data", "real-time"], route: "dispatcher", target: "realtimeDispatcher", action: "stream_start", reason: "Real-time data streaming", estimatedTokens: 200 },

  // Thread operations
  { keywords: ["thread mill", "single point thread", "thread pitch", "thread class", "thread gage"], route: "dispatcher", target: "threadDispatcher", action: "thread_calc", reason: "Threading operations", estimatedTokens: 200 },

  // Document learning
  { keywords: ["learn pdf", "extract document", "ingest catalog", "document learn"], route: "dispatcher", target: "documentLearningDispatcher", action: "doc_upload", reason: "Document knowledge extraction", estimatedTokens: 300 },

  // Automation / scripting
  { keywords: ["automate", "script", "macro", "batch process", "workflow automate"], route: "dispatcher", target: "automationDispatcher", action: "script_run", reason: "Task automation", estimatedTokens: 200 },

  // Bridge / external integration
  { keywords: ["api bridge", "external system", "erp connect", "mes integration", "data bridge"], route: "dispatcher", target: "bridgeDispatcher", action: "bridge_query", reason: "External system integration", estimatedTokens: 300 },

  // Export / reporting
  { keywords: ["export report", "generate pdf", "export csv", "data export", "report generate"], route: "dispatcher", target: "exportDispatcher", action: "export_report", reason: "Report generation/export", estimatedTokens: 200 },

  // Safety guard
  { keywords: ["machine limit", "spindle limit check", "rapid limit", "safety guard"], route: "dispatcher", target: "guardDispatcher", action: "machine_limit_check", reason: "Machine safety limits", estimatedTokens: 150 },

  // Orchestration / workflow
  { keywords: ["workflow orchestrate", "pipeline run", "chain actions", "orchestrate"], route: "dispatcher", target: "orchestrationDispatcher", action: "orchestrate", reason: "Multi-step workflow orchestration", estimatedTokens: 400 },

  // ── Batch 106: CNC Core Engine Routes ──
  { keywords: ["boring bar", "boring deflection", "boring operation", "line boring"], route: "dispatcher", target: "calcDispatcher", action: "boring_bar_calc", reason: "Boring bar selection & deflection (L/D, δ=FL³/3EI)", estimatedTokens: 200 },
  { keywords: ["part deflection", "workpiece deflection", "thin wall", "cantilever deflection"], route: "dispatcher", target: "calcDispatcher", action: "part_deflection_calc", reason: "Workpiece deflection under cutting loads", estimatedTokens: 200 },
  { keywords: ["setup reduction", "smed", "setup time", "quick change", "changeover"], route: "dispatcher", target: "calcDispatcher", action: "setup_reduction_calc", reason: "SMED setup time reduction analysis", estimatedTokens: 200 },
  { keywords: ["machine vibration", "chatter prediction", "stability lobe", "regenerative chatter"], route: "dispatcher", target: "calcDispatcher", action: "machine_vibration_calc", reason: "Stability lobe & chatter prediction", estimatedTokens: 250 },
  { keywords: ["runout compensation", "tir", "total indicator reading", "runout effect"], route: "dispatcher", target: "calcDispatcher", action: "runout_compensation_calc", reason: "TIR stack-up & compensation", estimatedTokens: 200 },
  { keywords: ["axis compensation", "thermal growth", "backlash compensation", "leadscrew error", "pitch error"], route: "dispatcher", target: "calcDispatcher", action: "axis_compensation_calc", reason: "Machine axis error compensation", estimatedTokens: 200 },
  { keywords: ["tool presetting", "tool offset", "tool measurement", "presetter"], route: "dispatcher", target: "calcDispatcher", action: "tool_presetting_calc", reason: "Tool presetting with thermal correction", estimatedTokens: 200 },
  { keywords: ["broaching", "broach force", "keyway broach", "pull broach", "push broach"], route: "dispatcher", target: "calcDispatcher", action: "broaching_calc", reason: "Broaching force & cycle time", estimatedTokens: 200 },
  { keywords: ["fatigue life", "s-n curve", "goodman diagram", "endurance limit", "fatigue analysis"], route: "dispatcher", target: "calcDispatcher", action: "fatigue_life_calc", reason: "S-N fatigue life (Goodman/Gerber/Miner)", estimatedTokens: 250 },
  { keywords: ["injection molding", "injection mold", "clamp force", "shot volume", "cooling time"], route: "dispatcher", target: "calcDispatcher", action: "injection_molding_calc", reason: "Injection molding process calc", estimatedTokens: 250 },
  { keywords: ["spindle load monitor", "load threshold", "breakage detection", "spindle overload"], route: "dispatcher", target: "safetyDispatcher", action: "spindle_load_monitor", reason: "Spindle load monitoring thresholds", estimatedTokens: 200 },
  { keywords: ["thread turning", "lathe threading", "thread pass schedule", "thread infeed"], route: "dispatcher", target: "turningDispatcher", action: "thread_turning_calc", reason: "Thread turning pass schedule", estimatedTokens: 200 },
  { keywords: ["master post processor", "multi cam post", "unified post", "cross cam gcode"], route: "dispatcher", target: "camDispatcher", action: "master_post_process", reason: "Mixed-CAM unified G-code synthesis", estimatedTokens: 500 },
  // --- Batch 109: Mechanical + Fluid/Thermal routing ---
  { keywords: ["ball screw", "ballscrew", "lead accuracy", "screw preload"], route: "dispatcher", target: "calcDispatcher", action: "ball_screw_calc", reason: "Ball screw selection & preload calc", estimatedTokens: 200 },
  { keywords: ["bevel gear", "spiral bevel", "gear tooth bending", "bevel mesh"], route: "dispatcher", target: "calcDispatcher", action: "bevel_gear_calc", reason: "Bevel gear geometry & load rating", estimatedTokens: 200 },
  { keywords: ["bolted joint", "bolt preload", "bolt fatigue", "joint separation"], route: "dispatcher", target: "calcDispatcher", action: "bolted_joint_calc", reason: "VDI 2230 bolted joint analysis", estimatedTokens: 200 },
  { keywords: ["column buckling", "euler buckling", "slenderness ratio", "critical load"], route: "dispatcher", target: "calcDispatcher", action: "column_buckling_calc", reason: "Column buckling (Euler/Johnson)", estimatedTokens: 200 },
  { keywords: ["flywheel", "rotational inertia", "energy storage flywheel", "flywheel sizing"], route: "dispatcher", target: "calcDispatcher", action: "flywheel_calc", reason: "Flywheel energy & inertia sizing", estimatedTokens: 200 },
  { keywords: ["gear train", "gear ratio", "gear mesh", "spur gear", "helical gear"], route: "dispatcher", target: "calcDispatcher", action: "gear_train_calc", reason: "Gear train ratio & load analysis", estimatedTokens: 200 },
  { keywords: ["hertz contact", "contact stress", "bearing contact", "contact pressure"], route: "dispatcher", target: "calcDispatcher", action: "hertz_contact_calc", reason: "Hertzian contact stress (sphere/cylinder)", estimatedTokens: 200 },
  { keywords: ["planetary gear", "epicyclic", "sun gear", "ring gear", "planet carrier"], route: "dispatcher", target: "calcDispatcher", action: "planetary_gear_calc", reason: "Planetary gear ratio & torque split", estimatedTokens: 200 },
  { keywords: ["centrifugal pump", "pump curve", "pump head", "npsh", "pump efficiency"], route: "dispatcher", target: "calcDispatcher", action: "centrifugal_pump_calc", reason: "Centrifugal pump sizing & NPSH", estimatedTokens: 200 },
  { keywords: ["heat exchanger", "lmtd", "shell tube", "heat transfer area", "ntu"], route: "dispatcher", target: "calcDispatcher", action: "heat_exchanger_calc", reason: "Heat exchanger LMTD/NTU sizing", estimatedTokens: 250 },
  { keywords: ["hydraulic cylinder", "hydraulic force", "bore size", "rod buckling"], route: "dispatcher", target: "calcDispatcher", action: "hydraulic_cylinder_calc", reason: "Hydraulic cylinder force & bore sizing", estimatedTokens: 200 },
  { keywords: ["pipe sizing", "pipe diameter", "flow velocity pipe", "pipe schedule"], route: "dispatcher", target: "calcDispatcher", action: "pipe_sizing_calc", reason: "Pipe sizing by velocity/pressure drop", estimatedTokens: 200 },
  { keywords: ["pipe stress", "pipe thermal expansion", "pipe support", "pipe flexibility"], route: "dispatcher", target: "calcDispatcher", action: "pipe_stress_calc", reason: "Pipe stress & thermal expansion analysis", estimatedTokens: 200 },
  { keywords: ["valve sizing", "cv coefficient", "valve flow", "control valve"], route: "dispatcher", target: "calcDispatcher", action: "valve_sizing_calc", reason: "Control valve Cv sizing", estimatedTokens: 200 },
  { keywords: ["spring design", "coil spring", "spring rate", "spring fatigue", "compression spring"], route: "dispatcher", target: "calcDispatcher", action: "spring_design_calc", reason: "Helical spring stress & fatigue", estimatedTokens: 200 },

  // --- Week 2: Non-Traditional, Specialty, Business, Maintenance routes ---
  { keywords: ["ultrasonic machining", "usm", "abrasive slurry"], route: "dispatcher", target: "calcDispatcher", action: "usm_mrr", reason: "Ultrasonic machining MRR prediction", estimatedTokens: 200 },
  { keywords: ["electrochemical machining", "ecm", "faraday"], route: "dispatcher", target: "calcDispatcher", action: "ecm_mrr", reason: "ECM material removal via Faraday law", estimatedTokens: 200 },
  { keywords: ["abrasive jet", "ajm", "garnet cutting"], route: "dispatcher", target: "calcDispatcher", action: "ajm_cutting", reason: "Abrasive jet cutting prediction", estimatedTokens: 200 },
  { keywords: ["iso compliance", "as9100", "industry standard", "iatf 16949"], route: "dispatcher", target: "calcDispatcher", action: "standards_check_compliance", reason: "Industry standards compliance check", estimatedTokens: 250 },
  { keywords: ["material cert", "calibration tracking", "tool certification"], route: "dispatcher", target: "calcDispatcher", action: "cert_track_material", reason: "Certification & calibration tracking", estimatedTokens: 200 },
  { keywords: ["hobby cnc", "grbl", "linuxcnc", "tormach", "shapeoko"], route: "dispatcher", target: "machineSetupDispatcher", action: "hobby_cnc_search", reason: "Hobby/desktop CNC machine profiles", estimatedTokens: 200 },
  { keywords: ["cobot", "collaborative robot", "ur5", "ur10"], route: "dispatcher", target: "machineSetupDispatcher", action: "cobot_assess_safety", reason: "Cobot machining safety assessment", estimatedTokens: 250 },
  { keywords: ["shift schedule", "job assignment", "machine allocation", "gantt"], route: "dispatcher", target: "businessDispatcher", action: "schedule_optimize", reason: "Shift/job schedule optimization", estimatedTokens: 300 },
  { keywords: ["bottleneck", "theory of constraints", "drum buffer rope"], route: "dispatcher", target: "calcDispatcher", action: "bottleneck_identify", reason: "TOC bottleneck identification & DBR", estimatedTokens: 250 },
  { keywords: ["predictive maintenance", "machine health", "mtbf", "mttr"], route: "dispatcher", target: "calcDispatcher", action: "maintenance_assess_health", reason: "Predictive maintenance & health assessment", estimatedTokens: 250 },
  { keywords: ["wheel dressing", "grinding wheel life", "creep feed grinding"], route: "dispatcher", target: "calcDispatcher", action: "grinding_wheel_life", reason: "Grinding wheel dressing optimization", estimatedTokens: 200 },
  { keywords: ["burnishing", "lapping", "polishing process"], route: "dispatcher", target: "calcDispatcher", action: "burnish_predict", reason: "Burnishing/lapping/polishing prediction", estimatedTokens: 200 },
  { keywords: ["honing", "bore honing", "plateau honing"], route: "dispatcher", target: "calcDispatcher", action: "honing_design", reason: "Bore honing process design", estimatedTokens: 200 },
  { keywords: ["post am finishing", "additive finishing", "am machining"], route: "dispatcher", target: "calcDispatcher", action: "post_am_finishing_plan", reason: "Post-AM finishing plan generation", estimatedTokens: 250 },
  { keywords: ["job profitability", "profit waterfall", "cost breakdown"], route: "dispatcher", target: "businessDispatcher", action: "job_profitability_analyze", reason: "Job profitability waterfall analysis", estimatedTokens: 300 },
  { keywords: ["scrap analysis", "scrap root cause", "defect analysis"], route: "dispatcher", target: "calcDispatcher", action: "scrap_root_cause", reason: "Scrap root cause Ishikawa/Pareto analysis", estimatedTokens: 250 },
  { keywords: ["capability study", "cpk report", "process capability"], route: "dispatcher", target: "businessDispatcher", action: "report_capability_study", reason: "Cp/Cpk/Pp/Ppk process capability study", estimatedTokens: 300 },
  { keywords: ["profitability report", "cost report", "scrap report"], route: "dispatcher", target: "businessDispatcher", action: "report_scrap", reason: "Scrap/defect Pareto reporting", estimatedTokens: 300 },
  { keywords: ["pareto chart", "waterfall chart", "control chart", "histogram"], route: "dispatcher", target: "dataDispatcher", action: "chart_pareto", reason: "Manufacturing chart data generation", estimatedTokens: 250 },
];

export class ToolRouterEngine {
  /**
   * Route an intent to the most token-efficient path.
   */
  route(intent: string): RouteResult[] {
    const q = intent.toLowerCase();
    const matches: Array<RoutePattern & { score: number }> = [];

    for (const pattern of ROUTE_PATTERNS) {
      let score = 0;
      for (const kw of pattern.keywords) {
        if (q.includes(kw)) {
          score += kw.length; // Longer keyword matches = higher confidence
        }
      }
      if (score > 0) {
        matches.push({ ...pattern, score });
      }
    }

    // Sort by score desc, then by estimated tokens asc
    matches.sort((a, b) => b.score - a.score || a.estimatedTokens - b.estimatedTokens);

    const results = matches.slice(0, 3).map(m => ({
      route: m.route,
      target: m.target,
      action: m.action,
      params: m.params,
      reason: m.reason,
      estimatedTokens: m.estimatedTokens,
    }));

    if (results.length === 0) {
      log.debug(`[ToolRouter] No route found for: ${intent}`);
    }

    return results;
  }

  /**
   * Get the single best route for an intent.
   */
  bestRoute(intent: string): RouteResult | null {
    const routes = this.route(intent);
    return routes[0] || null;
  }

  /**
   * Get all registered route patterns (for debugging/discovery).
   */
  getPatterns(): Array<{ keywords: string[]; target: string; action: string }> {
    return ROUTE_PATTERNS.map(p => ({
      keywords: p.keywords,
      target: p.target,
      action: p.action,
    }));
  }

  /**
   * Get pattern count.
   */
  getStats(): { patterns: number; targets: number; avgTokens: number } {
    const targets = new Set(ROUTE_PATTERNS.map(p => p.target));
    const avgTokens = Math.round(
      ROUTE_PATTERNS.reduce((sum, p) => sum + p.estimatedTokens, 0) / ROUTE_PATTERNS.length
    );
    return { patterns: ROUTE_PATTERNS.length, targets: targets.size, avgTokens };
  }
}

export const toolRouterEngine = new ToolRouterEngine();
