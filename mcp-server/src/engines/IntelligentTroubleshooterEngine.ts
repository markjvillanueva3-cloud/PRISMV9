/**
 * IntelligentTroubleshooterEngine — R14-MS4
 *
 * SAFETY CLASSIFICATION: STANDARD (advisory, human makes final call)
 *
 * Probabilistic diagnosis product composing:
 *   - Bayesian inference with prior probabilities and symptom likelihoods
 *   - Tool failure mode classification (wear/breakage/chatter/BUE)
 *   - Surface defect → root cause → parameter adjustment
 *   - Alarm code knowledge base with fix procedures
 *
 * MCP actions:
 *   diagnose        — Probabilistic diagnosis from symptoms + alarm codes
 *   diagnose_alarm  — Focused alarm code diagnosis with fix recommendations
 *   diagnose_tool   — Tool failure diagnosis (wear, breakage, chatter)
 *   diagnose_surface — Surface defect root cause analysis
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DiagnosisInput {
  symptoms?: string[];
  alarmCode?: string;
  controller?: string;
  machineContext?: {
    machineId?: string;
    spindleSpeed?: number;
    feedRate?: number;
    tool?: string;
    material?: string;
    operation?: string;
  };
}

export interface Diagnosis {
  cause: string;
  probability: number;
  evidence: string[];
  recommendedActions: Array<{
    action: string;
    priority: "immediate" | "soon" | "monitor";
    detail?: string;
  }>;
  relatedAlarms?: string[];
  category: "mechanical" | "electrical" | "programming" | "tooling" | "material" | "process";
}

export interface DiagnosisResult {
  diagnoses: Diagnosis[];
  confidence: number;
  topDiagnosis: string;
  inputSymptoms: string[];
  additionalQuestions?: string[];
}

// ─── Failure Mode Knowledge Base ────────────────────────────────────────────

interface FailureMode {
  id: string;
  cause: string;
  category: Diagnosis["category"];
  prior: number;  // base rate probability (0-1)
  symptoms: Record<string, number>; // symptom → likelihood P(symptom|cause)
  actions: Array<{ action: string; priority: "immediate" | "soon" | "monitor"; detail?: string }>;
  relatedAlarms: string[];
}

const FAILURE_MODES: FailureMode[] = [
  {
    id: "chatter", cause: "Regenerative Chatter", category: "process", prior: 0.12,
    symptoms: {
      vibration: 0.95, noise: 0.90, chatter: 0.99, "surface marks": 0.85,
      waviness: 0.80, harmonics: 0.75, "poor finish": 0.50, "tool wear": 0.30,
    },
    actions: [
      { action: "Adjust spindle speed to stable lobe", priority: "immediate", detail: "Use stability lobe diagram — shift RPM by 5-15%" },
      { action: "Reduce axial depth of cut 30-50%", priority: "immediate" },
      { action: "Reduce tool overhang, use shrink-fit holder", priority: "soon" },
      { action: "Switch to variable-pitch/helix cutter", priority: "soon" },
    ],
    relatedAlarms: ["SV0401", "SV0418", "EX1035"],
  },
  {
    id: "premature_wear", cause: "Premature Tool Wear", category: "tooling", prior: 0.15,
    symptoms: {
      "tool wear": 0.95, "short life": 0.90, "flank wear": 0.92, crater: 0.80,
      "edge breakdown": 0.85, "poor finish": 0.60, "built-up edge": 0.70, premature: 0.88,
    },
    actions: [
      { action: "Reduce cutting speed 15-25%", priority: "immediate", detail: "Operating past Taylor knee — tool life drops exponentially" },
      { action: "Verify coolant concentration and flow", priority: "immediate" },
      { action: "Switch coating: AlTiN for high-temp, TiAlN for steels", priority: "soon" },
      { action: "For BUE: increase speed or use positive rake", priority: "soon" },
    ],
    relatedAlarms: ["TC0001", "TC0007"],
  },
  {
    id: "tool_breakage", cause: "Tool Breakage", category: "tooling", prior: 0.08,
    symptoms: {
      breakage: 0.99, broken: 0.98, snap: 0.95, fracture: 0.95,
      catastrophic: 0.90, shatter: 0.88, overload: 0.70, shock: 0.65,
    },
    actions: [
      { action: "STOP — Inspect spindle and workpiece for damage", priority: "immediate" },
      { action: "Reduce feed per tooth within chip load limits", priority: "immediate" },
      { action: "Use tougher substrate for interrupted cuts", priority: "soon" },
      { action: "Switch to trochoidal milling for full-width slots", priority: "soon" },
    ],
    relatedAlarms: ["SP0750", "OT0001", "EX1004"],
  },
  {
    id: "poor_surface", cause: "Poor Surface Finish", category: "process", prior: 0.14,
    symptoms: {
      "poor finish": 0.95, rough: 0.88, "surface marks": 0.80, scratches: 0.85,
      scallop: 0.75, Ra: 0.70, "tool marks": 0.82, roughness: 0.90,
    },
    actions: [
      { action: "Reduce feed per tooth for finishing (fz < 0.05mm)", priority: "immediate" },
      { action: "Inspect cutting edge — replace if chipped/worn", priority: "immediate" },
      { action: "Measure runout with DTI — target < 5um", priority: "soon" },
      { action: "Use wiper insert or larger nose radius", priority: "soon", detail: "Ra ~ fz²/(32×r)" },
    ],
    relatedAlarms: [],
  },
  {
    id: "dimensional_error", cause: "Dimensional Inaccuracy", category: "mechanical", prior: 0.13,
    symptoms: {
      dimension: 0.90, tolerance: 0.92, oversize: 0.88, undersize: 0.88,
      inaccurate: 0.85, drift: 0.80, deviation: 0.82, "out of spec": 0.90,
    },
    actions: [
      { action: "Re-measure tool with presetter, update offset", priority: "immediate" },
      { action: "Reduce radial depth or use shorter tool", priority: "soon", detail: "Tool deflection δ ∝ (L/D)³ × force" },
      { action: "Allow machine warm-up, check thermal drift", priority: "soon" },
      { action: "Calibrate axis backlash compensation", priority: "monitor" },
    ],
    relatedAlarms: ["SV0401", "SV0404", "PS0090"],
  },
  {
    id: "chip_issues", cause: "Poor Chip Control", category: "process", prior: 0.10,
    symptoms: {
      "chip packing": 0.95, "birds nest": 0.92, "stringy chips": 0.90, clogging: 0.85,
      "long chips": 0.88, evacuation: 0.75, wrapping: 0.80, "chip recutting": 0.78,
    },
    actions: [
      { action: "Increase feed per tooth for thicker, breakable chips", priority: "immediate" },
      { action: "Switch to insert with aggressive chipbreaker", priority: "soon" },
      { action: "Enable through-spindle coolant at >=40 bar", priority: "soon" },
      { action: "Program peck cycles for deep features", priority: "soon" },
    ],
    relatedAlarms: [],
  },
  {
    id: "thermal_damage", cause: "Thermal Damage / Burns", category: "material", prior: 0.07,
    symptoms: {
      burn: 0.95, heat: 0.80, thermal: 0.90, discoloration: 0.92,
      "white layer": 0.88, "heat affected": 0.85, blue: 0.78, "burnt smell": 0.90,
    },
    actions: [
      { action: "Reduce cutting speed 20-30%", priority: "immediate" },
      { action: "Eliminate dwell — use constant feed through corners", priority: "immediate" },
      { action: "Ensure coolant reaches cut zone", priority: "immediate" },
      { action: "Check for chip recutting (redirect coolant nozzle)", priority: "soon" },
    ],
    relatedAlarms: ["SP0751", "OH0001"],
  },
  {
    id: "spindle_overload", cause: "Spindle Overload", category: "mechanical", prior: 0.06,
    symptoms: {
      overload: 0.95, stall: 0.92, "spindle alarm": 0.88, "power limit": 0.90,
      torque: 0.80, "motor fault": 0.75, bog: 0.85, slowdown: 0.70,
    },
    actions: [
      { action: "Reduce depth of cut immediately", priority: "immediate" },
      { action: "Reduce feed rate by 30%", priority: "immediate" },
      { action: "Check MRR vs machine power rating", priority: "soon", detail: "P_cut = kc × ae × ap × vf / (60×10⁶)" },
      { action: "Verify belt tension and spindle bearings", priority: "monitor" },
    ],
    relatedAlarms: ["SP0750", "SP0751", "SV0401", "SV0404", "OT0001"],
  },
  {
    id: "servo_error", cause: "Servo Following Error", category: "electrical", prior: 0.05,
    symptoms: {
      "servo alarm": 0.95, "following error": 0.98, "position error": 0.90,
      jerky: 0.75, stutter: 0.78, backlash: 0.60, "axis fault": 0.85,
    },
    actions: [
      { action: "Check servo motor cables and connections", priority: "immediate" },
      { action: "Reduce rapid traverse rate and acceleration", priority: "immediate" },
      { action: "Inspect ball screw for wear or contamination", priority: "soon" },
      { action: "Adjust servo gains (consult machine builder)", priority: "monitor" },
    ],
    relatedAlarms: ["SV0401", "SV0404", "SV0418", "SV0410"],
  },
  {
    id: "coolant_failure", cause: "Coolant System Failure", category: "mechanical", prior: 0.05,
    symptoms: {
      coolant: 0.95, "no coolant": 0.98, dry: 0.80, "coolant pressure": 0.90,
      "coolant alarm": 0.92, foam: 0.75, "low level": 0.85, "pump fault": 0.88,
    },
    actions: [
      { action: "Check coolant level and replenish", priority: "immediate" },
      { action: "Verify pump operation and filter", priority: "immediate" },
      { action: "Check nozzle direction — must reach cut zone", priority: "soon" },
      { action: "Test concentration with refractometer (6-8% typical)", priority: "soon" },
    ],
    relatedAlarms: ["MC0001", "MC0010"],
  },
  {
    id: "programming_error", cause: "G-Code / Programming Error", category: "programming", prior: 0.05,
    symptoms: {
      "alarm code": 0.70, crash: 0.80, collision: 0.85, "wrong path": 0.90,
      "unexpected move": 0.88, "modal error": 0.82, "syntax error": 0.95, "block error": 0.85,
    },
    actions: [
      { action: "Verify program with dry run / single block", priority: "immediate" },
      { action: "Check work offsets and tool offsets", priority: "immediate" },
      { action: "Simulate toolpath in CAM software", priority: "soon" },
      { action: "Review modal state: ensure G90/G91, G17/G18, G41/G42 are correct", priority: "soon" },
    ],
    relatedAlarms: ["PS0001", "PS0010", "PS0015", "PS0090", "PS0200"],
  },
];

// ─── Tool Failure Modes ─────────────────────────────────────────────────────

interface ToolFailureMode {
  id: string;
  name: string;
  symptoms: string[];
  rootCauses: string[];
  fixes: Array<{ action: string; priority: "immediate" | "soon" | "monitor" }>;
  wearPattern: string;
}

const TOOL_FAILURE_MODES: ToolFailureMode[] = [
  {
    id: "flank_wear", name: "Flank Wear (VB)",
    symptoms: ["flank wear", "gradual wear", "poor finish", "dimensional drift", "increasing force"],
    rootCauses: ["Cutting speed too high", "Abrasive material (cast iron, composites)", "Hard coating worn through", "Insufficient coolant"],
    fixes: [
      { action: "Reduce Vc by 15-20%", priority: "immediate" },
      { action: "Switch to more wear-resistant grade (lower cobalt %)", priority: "soon" },
      { action: "Use AlCrN or diamond coating for abrasive materials", priority: "soon" },
    ],
    wearPattern: "Uniform abrasion on flank face parallel to cutting edge",
  },
  {
    id: "crater_wear", name: "Crater Wear (KT)",
    symptoms: ["crater", "chip flow groove", "weakened edge", "sudden breakage risk"],
    rootCauses: ["High cutting temperature (chemical diffusion)", "High Vc in steel (>250 m/min)", "Chip sliding friction on rake face", "Wrong coating for material"],
    fixes: [
      { action: "Reduce cutting speed 20-30%", priority: "immediate" },
      { action: "Use Al₂O₃ or TiAlN coated insert", priority: "soon" },
      { action: "Increase coolant flow to rake face", priority: "soon" },
    ],
    wearPattern: "Depression on rake face behind cutting edge, from chip flow",
  },
  {
    id: "built_up_edge", name: "Built-Up Edge (BUE)",
    symptoms: ["built-up edge", "BUE", "intermittent finish", "rough-then-smooth", "edge buildup", "material adhesion"],
    rootCauses: ["Cutting speed too low for material", "Sticky/gummy material (low-carbon steel, aluminum, stainless)", "Insufficient rake angle", "No coolant or wrong type"],
    fixes: [
      { action: "Increase cutting speed 20-40%", priority: "immediate" },
      { action: "Use positive rake geometry with polished rake face", priority: "soon" },
      { action: "Apply MQL or flood coolant", priority: "soon" },
      { action: "Switch to TiN or DLC coated tool for non-ferrous", priority: "soon" },
    ],
    wearPattern: "Irregular buildup of workpiece material welded to cutting edge",
  },
  {
    id: "notch_wear", name: "Notch Wear",
    symptoms: ["notch", "depth-of-cut line", "grooved edge", "localized wear"],
    rootCauses: ["Work hardened surface layer", "Oxide scale on castings/forgings", "Constant depth of cut creating work-hardened step", "Abrasive inclusions in material"],
    fixes: [
      { action: "Vary depth of cut between passes (±10%)", priority: "immediate" },
      { action: "Use round insert or large lead angle", priority: "soon" },
      { action: "Increase first pass depth to get below hardened layer", priority: "soon" },
    ],
    wearPattern: "Localized groove at depth-of-cut line on flank",
  },
  {
    id: "chipping", name: "Edge Chipping / Micro-fracture",
    symptoms: ["chipping", "micro fracture", "small breakage", "jagged edge", "irregular wear"],
    rootCauses: ["Interrupted cut with brittle grade", "Vibration/chatter causing impact", "Chip re-entry striking edge", "Too aggressive entry angle"],
    fixes: [
      { action: "Switch to tougher grade (higher cobalt content)", priority: "immediate" },
      { action: "Use honed or chamfered edge preparation", priority: "soon" },
      { action: "Reduce entry angle — use roll-in or arc entry", priority: "soon" },
      { action: "Address chatter first if vibration present", priority: "soon" },
    ],
    wearPattern: "Small, irregular chips missing from cutting edge",
  },
  {
    id: "thermal_cracking", name: "Thermal Cracking",
    symptoms: ["thermal crack", "comb crack", "perpendicular cracks", "cyclic failure"],
    rootCauses: ["Intermittent cutting with coolant (thermal shock)", "Rapid heating/cooling cycles", "Excessive cutting speed in milling", "Wrong grade for interrupted cuts"],
    fixes: [
      { action: "Run DRY for intermittent cuts (remove coolant)", priority: "immediate" },
      { action: "Reduce cutting speed 15-20%", priority: "soon" },
      { action: "Use thermal-shock resistant grade", priority: "soon" },
      { action: "Switch from CVD to PVD coated insert", priority: "soon" },
    ],
    wearPattern: "Multiple perpendicular cracks on rake face (comb pattern)",
  },
];

// ─── Surface Defect Knowledge Base ──────────────────────────────────────────

interface SurfaceDefect {
  id: string;
  name: string;
  symptoms: string[];
  rootCauses: string[];
  parameterAdjustments: Array<{ parameter: string; adjustment: string; effect: string }>;
}

const SURFACE_DEFECTS: SurfaceDefect[] = [
  {
    id: "high_ra", name: "High Surface Roughness (Ra)",
    symptoms: ["high Ra", "rough surface", "exceeds Ra spec", "poor finish", "rough"],
    rootCauses: ["Feed per tooth too high", "Worn/chipped cutting edge", "Tool runout", "Insufficient RPM"],
    parameterAdjustments: [
      { parameter: "feed_per_tooth", adjustment: "Reduce 30-50%", effect: "Ra ~ fz²/(32r) — halving fz reduces Ra by 75%" },
      { parameter: "nose_radius", adjustment: "Increase (0.4→0.8mm)", effect: "Ra ~ 1/r — doubling radius halves Ra" },
      { parameter: "rpm", adjustment: "Increase 10-20%", effect: "Higher Vc improves surface (above BUE range)" },
    ],
  },
  {
    id: "chatter_marks", name: "Chatter Marks",
    symptoms: ["chatter marks", "regular pattern", "wavy surface", "harmonics", "vibration marks"],
    rootCauses: ["Spindle speed in unstable lobe", "Excessive depth of cut", "Long tool overhang", "Weak workholding"],
    parameterAdjustments: [
      { parameter: "spindle_speed", adjustment: "Shift ±5-15% to stable lobe", effect: "Move away from resonant frequency" },
      { parameter: "depth_of_cut", adjustment: "Reduce 30-50%", effect: "Below critical stability limit" },
      { parameter: "tool_overhang", adjustment: "Minimize L/D ratio", effect: "Stiffness ∝ D⁴/L³" },
    ],
  },
  {
    id: "feed_marks", name: "Feed Marks / Cutter Marks",
    symptoms: ["feed marks", "tool marks", "visible stepover", "scallop marks", "cutter path visible"],
    rootCauses: ["Stepover too large for ball/bull endmill", "Non-overlapping passes", "Cutter runout", "Mismatch between programmed and actual stepover"],
    parameterAdjustments: [
      { parameter: "stepover", adjustment: "Reduce to 10-15% of tool diameter", effect: "Scallop height h = R - √(R²-ae²/4)" },
      { parameter: "tool_runout", adjustment: "Check and correct (target <5μm)", effect: "Uneven tooth engagement causes visible marks" },
      { parameter: "finishing_pass", adjustment: "Add spring pass at same depth", effect: "Removes deflection-induced error from prior pass" },
    ],
  },
  {
    id: "burrs", name: "Burrs / Raised Edges",
    symptoms: ["burrs", "raised edge", "sharp edge", "material rollover", "deburring needed"],
    rootCauses: ["Ductile material with insufficient support at exit", "Worn tool pushing material instead of cutting", "Wrong helix angle for material", "Exit burr from drill or mill"],
    parameterAdjustments: [
      { parameter: "exit_strategy", adjustment: "Use back-chamfer or climb mill exit", effect: "Controls burr formation direction" },
      { parameter: "tool_sharpness", adjustment: "Replace worn tool", effect: "Sharp edge cuts cleanly, dull edge pushes material" },
      { parameter: "helix_angle", adjustment: "Use high-helix (45°+) for aluminum", effect: "Better shearing action reduces burr" },
    ],
  },
  {
    id: "smearing", name: "Surface Smearing / Glazing",
    symptoms: ["smearing", "glazing", "gummy", "material smeared", "burnished", "rubbing"],
    rootCauses: ["Cutting speed too low (below BUE threshold)", "Spring pass with zero chip load", "Dull tool rubbing instead of cutting", "Insufficient feed rate"],
    parameterAdjustments: [
      { parameter: "cutting_speed", adjustment: "Increase Vc 30-50%", effect: "Get above BUE formation zone" },
      { parameter: "feed_rate", adjustment: "Increase to ensure minimum chip thickness", effect: "h_min ≈ 0.25×re (edge radius)" },
      { parameter: "tool_edge", adjustment: "Use sharp, honed edge with positive rake", effect: "Reduces plowing/rubbing zone" },
    ],
  },
  {
    id: "thermal_discolor", name: "Thermal Discoloration",
    symptoms: ["discoloration", "blue", "purple", "burn marks", "heat affected zone", "oxidation"],
    rootCauses: ["Excessive cutting temperature", "Insufficient coolant", "Dwell in corner (stationary cut)", "Chip re-cutting generating extra heat"],
    parameterAdjustments: [
      { parameter: "cutting_speed", adjustment: "Reduce Vc 20-30%", effect: "Temperature ∝ Vc^0.4 — significant reduction" },
      { parameter: "coolant", adjustment: "Increase flow rate and pressure", effect: "Direct cooling of cut zone" },
      { parameter: "toolpath", adjustment: "Eliminate dwell, use constant feed corners", effect: "Prevents heat buildup in corners" },
    ],
  },
];

// ─── Bayesian Inference ─────────────────────────────────────────────────────

function bayesianDiagnose(symptoms: string[]): Array<{ mode: FailureMode; posterior: number; evidence: string[] }> {
  if (!symptoms.length) return [];

  const normalized = symptoms.map((s) => s.toLowerCase().trim());
  const results: Array<{ mode: FailureMode; posterior: number; evidence: string[] }> = [];

  for (const mode of FAILURE_MODES) {
    let logLikelihood = 0;
    const evidence: string[] = [];

    for (const symptom of normalized) {
      let bestMatch = 0;
      let matchedKey = "";
      for (const [key, likelihood] of Object.entries(mode.symptoms)) {
        if (symptom.includes(key) || key.includes(symptom)) {
          if (likelihood > bestMatch) {
            bestMatch = likelihood;
            matchedKey = key;
          }
        }
      }
      if (bestMatch > 0) {
        logLikelihood += Math.log(bestMatch);
        evidence.push(matchedKey);
      } else {
        logLikelihood += Math.log(0.05); // low likelihood for unmatched symptom
      }
    }

    const unnormalizedPosterior = mode.prior * Math.exp(logLikelihood);
    results.push({ mode, posterior: unnormalizedPosterior, evidence });
  }

  // Normalize posteriors
  const total = results.reduce((s, r) => s + r.posterior, 0);
  if (total > 0) {
    for (const r of results) r.posterior = r.posterior / total;
  }

  return results.sort((a, b) => b.posterior - a.posterior);
}

// ─── Main Engine ────────────────────────────────────────────────────────────

class IntelligentTroubleshooterEngineImpl {

  /** Probabilistic diagnosis from symptoms + alarm codes. */
  diagnose(input: DiagnosisInput): DiagnosisResult {
    const symptoms = input.symptoms ?? [];
    if (input.alarmCode) symptoms.push(`alarm code ${input.alarmCode}`);
    if (input.machineContext?.operation) symptoms.push(input.machineContext.operation);

    if (!symptoms.length) {
      return {
        diagnoses: [],
        confidence: 0,
        topDiagnosis: "No symptoms provided",
        inputSymptoms: [],
        additionalQuestions: [
          "What symptoms are you observing? (vibration, noise, poor finish, etc.)",
          "Is there an alarm code on the controller?",
          "What operation is running? (roughing, finishing, drilling, etc.)",
        ],
      };
    }

    const bayesResults = bayesianDiagnose(symptoms);
    const topResults = bayesResults.filter((r) => r.posterior > 0.01).slice(0, 5);

    const diagnoses: Diagnosis[] = topResults.map((r) => ({
      cause: r.mode.cause,
      probability: Math.round(r.posterior * 1000) / 1000,
      evidence: r.evidence,
      recommendedActions: r.mode.actions,
      relatedAlarms: r.mode.relatedAlarms,
      category: r.mode.category,
    }));

    const topProb = diagnoses[0]?.probability ?? 0;
    const confidence = topProb > 0.5 ? 0.85 : topProb > 0.3 ? 0.70 : topProb > 0.15 ? 0.55 : 0.40;

    // Generate follow-up questions based on ambiguity
    const questions: string[] = [];
    if (diagnoses.length > 2 && diagnoses[0].probability < 0.4) {
      questions.push("Is the issue intermittent or constant?");
      if (diagnoses.some((d) => d.category === "tooling")) questions.push("How many parts since last tool change?");
      if (diagnoses.some((d) => d.category === "mechanical")) questions.push("Does the issue occur at specific axis positions?");
      if (diagnoses.some((d) => d.category === "process")) questions.push("At what spindle speed and feed rate is this occurring?");
    }

    return {
      diagnoses,
      confidence: Math.round(confidence * 100) / 100,
      topDiagnosis: diagnoses[0]?.cause ?? "Insufficient data",
      inputSymptoms: symptoms,
      additionalQuestions: questions.length ? questions : undefined,
    };
  }

  /** Focused alarm code diagnosis. */
  diagnoseAlarm(alarmCode: string, controller?: string): any {
    if (!alarmCode) return { error: "Alarm code required" };

    const code = alarmCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const ctrl = (controller ?? "fanuc").toLowerCase();

    // Classify alarm by prefix
    let category = "unknown";
    let severity: "low" | "medium" | "high" | "critical" = "medium";
    let description = "";
    let quickFix = "";
    const fixes: Array<{ step: number; action: string; detail: string }> = [];

    if (code.startsWith("SV") || code.startsWith("41")) {
      category = "servo";
      severity = "high";
      description = "Servo system error — axis motor/drive fault";
      quickFix = "Check motor cables, reduce rapid/feed rate, check for mechanical binding";
      fixes.push(
        { step: 1, action: "Power cycle machine", detail: "Wait 30 seconds, restart" },
        { step: 2, action: "Check motor cables", detail: "Inspect connectors at motor and drive" },
        { step: 3, action: "Reduce acceleration/rapid", detail: "Lower G0 rate by 25% in parameters" },
        { step: 4, action: "Check ball screw", detail: "Hand-turn axis, feel for rough spots" },
      );
    } else if (code.startsWith("SP") || code.startsWith("75")) {
      category = "spindle";
      severity = "high";
      description = "Spindle system error — motor, drive, or orientation fault";
      quickFix = "Check spindle load, reduce cutting parameters, verify belt tension";
      fixes.push(
        { step: 1, action: "Reduce cutting parameters", detail: "Lower RPM and feed by 30%" },
        { step: 2, action: "Check spindle load meter", detail: "Should be <80% during normal cutting" },
        { step: 3, action: "Inspect drive belt", detail: "Check tension and wear on belt drive" },
        { step: 4, action: "Check spindle bearings", detail: "Listen for abnormal noise, check temperature" },
      );
    } else if (code.startsWith("PS") || code.startsWith("0") || code.startsWith("1")) {
      category = "program";
      severity = "medium";
      description = "Program error — syntax, parameter, or sequence issue";
      quickFix = "Review G-code at the line indicated, check work offsets";
      fixes.push(
        { step: 1, action: "Check the program line number", detail: "Error often points to specific N-block" },
        { step: 2, action: "Verify work offsets (G54-G59)", detail: "Touch off and confirm Z zero" },
        { step: 3, action: "Check tool offsets", detail: "Verify H and D values in offset table" },
        { step: 4, action: "Dry run program", detail: "Run in single block mode with door open" },
      );
    } else if (code.startsWith("OT") || code.startsWith("OV") || code.startsWith("OH")) {
      category = "overtravel/overheat";
      severity = "critical";
      description = "Hardware limit — overtravel, overheat, or overload protection";
      quickFix = "STOP — Do not force. Jog off limit switch carefully in opposite direction";
      fixes.push(
        { step: 1, action: "DO NOT FORCE — identify which limit triggered", detail: "Check axis position display" },
        { step: 2, action: "Jog axis in opposite direction", detail: "Use handwheel at low increment" },
        { step: 3, action: "Check work coordinates", detail: "Fixture may be shifted, causing overtravel" },
        { step: 4, action: "If overheat: let machine cool 15 min", detail: "Check fan filters and coolant system" },
      );
    } else if (code.startsWith("MC") || code.startsWith("IO")) {
      category = "mechanical/IO";
      severity = "medium";
      description = "Mechanical or I/O device error — ATC, coolant, hydraulic, pneumatic";
      quickFix = "Check the specific device (ATC, coolant pump, air supply)";
      fixes.push(
        { step: 1, action: "Identify which device faulted", detail: "Check I/O diagnostics screen" },
        { step: 2, action: "Verify air pressure", detail: "Should be 5-7 bar / 75-100 PSI" },
        { step: 3, action: "Check proximity sensors", detail: "LED indicators on sensor body" },
        { step: 4, action: "Cycle device manually", detail: "Use MDI to test M-codes individually" },
      );
    } else if (code.startsWith("EX") || code.startsWith("DS")) {
      category = "external/system";
      severity = "low";
      description = "External device or system-level notification";
      quickFix = "Check external devices, communications, and system parameters";
      fixes.push(
        { step: 1, action: "Check external connections", detail: "RS232, Ethernet, DNC cables" },
        { step: 2, action: "Verify system parameters", detail: "Compare against machine builder defaults" },
      );
    } else {
      description = `Alarm ${alarmCode} — consult controller manual for ${ctrl}`;
      quickFix = "Power cycle and check alarm history for pattern";
      fixes.push(
        { step: 1, action: "Note full alarm message text", detail: "Record from alarm history screen" },
        { step: 2, action: "Power cycle machine", detail: "Wait 30 seconds" },
        { step: 3, action: "Consult controller manual", detail: `Look up alarm ${alarmCode} in ${ctrl} maintenance manual` },
      );
    }

    return {
      alarmCode,
      controller: ctrl,
      category,
      severity,
      description,
      quickFix,
      fixProcedure: fixes,
      requiresPowerCycle: severity === "critical" || category === "servo",
      safetyWarning: severity === "critical" ? "Ensure machine is in safe state before attempting any fix" : undefined,
    };
  }

  /** Tool failure diagnosis. */
  diagnoseTool(symptoms: string[], context?: any): any {
    if (!symptoms?.length) return { error: "Symptoms required (e.g. 'flank wear', 'chipping', 'built-up edge')" };

    const normalized = symptoms.map((s) => s.toLowerCase().trim());
    const scored = TOOL_FAILURE_MODES.map((mode) => {
      let matchCount = 0;
      const matched: string[] = [];
      for (const symptom of normalized) {
        for (const modeSymptom of mode.symptoms) {
          if (symptom.includes(modeSymptom) || modeSymptom.includes(symptom)) {
            matchCount++;
            matched.push(modeSymptom);
            break;
          }
        }
      }
      return { mode, matchCount, matched, relevance: matchCount / normalized.length };
    })
      .filter((s) => s.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance);

    return {
      inputSymptoms: symptoms,
      diagnoses: scored.slice(0, 3).map((s) => ({
        failureMode: s.mode.name,
        relevance: Math.round(s.relevance * 100) / 100,
        wearPattern: s.mode.wearPattern,
        matchedSymptoms: s.matched,
        rootCauses: s.mode.rootCauses,
        fixes: s.mode.fixes,
      })),
      materialContext: context?.material ? `Consider material-specific tool grade for ${context.material}` : undefined,
      totalModesChecked: TOOL_FAILURE_MODES.length,
    };
  }

  /** Surface defect root cause analysis. */
  diagnoseSurface(defectType: string, context?: any): any {
    if (!defectType) return { error: "Defect type required (e.g. 'high Ra', 'chatter marks', 'burrs')" };

    const normalized = defectType.toLowerCase().trim();
    const scored = SURFACE_DEFECTS.map((defect) => {
      let matchCount = 0;
      const matched: string[] = [];
      for (const symptom of defect.symptoms) {
        if (normalized.includes(symptom) || symptom.includes(normalized)) {
          matchCount++;
          matched.push(symptom);
        }
      }
      return { defect, matchCount, matched, relevance: matchCount > 0 ? matchCount / defect.symptoms.length : 0 };
    })
      .filter((s) => s.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance);

    if (!scored.length) {
      // Fuzzy fallback: check individual words
      const words = normalized.split(/\s+/);
      for (const defect of SURFACE_DEFECTS) {
        for (const word of words) {
          if (defect.symptoms.some((s) => s.includes(word))) {
            scored.push({ defect, matchCount: 1, matched: [word], relevance: 0.3 });
            break;
          }
        }
      }
      scored.sort((a, b) => b.relevance - a.relevance);
    }

    return {
      inputDefect: defectType,
      diagnoses: scored.slice(0, 3).map((s) => ({
        defectType: s.defect.name,
        relevance: Math.round(s.relevance * 100) / 100,
        rootCauses: s.defect.rootCauses,
        parameterAdjustments: s.defect.parameterAdjustments,
        matchedSymptoms: s.matched,
      })),
      machiningContext: context ?? undefined,
      totalDefectsChecked: SURFACE_DEFECTS.length,
    };
  }
}

// ─── Singleton + action dispatcher ──────────────────────────────────────────

export const intelligentTroubleshooter = new IntelligentTroubleshooterEngineImpl();

export function executeTroubleshooterAction(action: string, params: Record<string, any> = {}): any {
  switch (action) {
    case "diagnose":
      return intelligentTroubleshooter.diagnose(params as DiagnosisInput);
    case "diagnose_alarm":
      return intelligentTroubleshooter.diagnoseAlarm(params.alarm_code ?? params.code ?? "", params.controller);
    case "diagnose_tool":
      return intelligentTroubleshooter.diagnoseTool(params.symptoms ?? [], params.context);
    case "diagnose_surface":
      return intelligentTroubleshooter.diagnoseSurface(params.defect_type ?? params.defect ?? "", params.context);
    default:
      return { error: `Unknown IntelligentTroubleshooter action: ${action}` };
  }
}
