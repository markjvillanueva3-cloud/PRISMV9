/**
 * FailureForensicsEngine.ts — R10-Rev5 Failure Forensics
 * ========================================================
 *
 * Physics-based forensic analysis of manufacturing failures:
 *   - Tool autopsy: classify failure mode from wear pattern
 *   - Chip analysis: diagnose from chip appearance
 *   - Crash investigation: systematic root cause from crash scenario
 *   - Surface defect analysis: identify defect type and cause
 *   - Failure case library: searchable database of failure patterns
 *
 * @version 1.0.0 — R10-Rev5
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToolFailureMode =
  | "flank_wear" | "crater_wear" | "notch_wear" | "edge_chipping"
  | "thermal_cracking" | "plastic_deformation" | "fracture" | "bue_adhesion";

export type ChipType =
  | "blue_discolored" | "long_stringy" | "segmented" | "birds_nest"
  | "powder" | "normal_curled" | "thick_irregular";

export type SurfaceDefect =
  | "chatter_marks" | "smeared_torn" | "feed_marks" | "scratches"
  | "discoloration" | "waviness" | "pitting" | "burrs";

export type CrashType =
  | "tool_into_fixture" | "tool_into_part" | "spindle_crash"
  | "axis_overtravel" | "tool_breakage_in_cut" | "collision_rapid";

export interface ForensicDiagnosis {
  diagnosis_id: string;
  category: "tool_autopsy" | "chip_analysis" | "crash_investigation" | "surface_defect";
  failure_mode: string;
  mechanism: string;
  root_cause_chain: string[];
  contributing_factors: string[];
  corrective_actions: CorrAction[];
  prevention_measures: string[];
  severity: "minor" | "moderate" | "severe" | "critical";
  recurrence_risk: "low" | "medium" | "high";
}

export interface CorrAction {
  action: string;
  effectiveness: "high" | "medium" | "low";
  priority: number; // 1 = highest
  details: string;
}

// ─── Tool Failure Knowledge Base ─────────────────────────────────────────────

interface FailureModeEntry {
  mode: ToolFailureMode;
  name: string;
  appearance: string;
  mechanism: string;
  root_causes: string[];
  contributing_factors: string[];
  corrections: CorrAction[];
  prevention: string[];
  severity: "minor" | "moderate" | "severe" | "critical";
}

const FAILURE_MODES: FailureModeEntry[] = [
  {
    mode: "flank_wear",
    name: "Flank Wear (VB)",
    appearance: "Uniform bright band along the flank face parallel to cutting edge",
    mechanism: "Abrasive and adhesive wear from workpiece rubbing against the clearance face",
    root_causes: [
      "Normal progressive wear — tool has reached end of life",
      "Cutting speed too high for tool grade",
      "Abrasive material (cast iron, fiber-reinforced, high-silicon aluminum)",
    ],
    contributing_factors: ["Insufficient coolant", "Low clearance angle", "Hard inclusions in material"],
    corrections: [
      { action: "Replace or index the insert", effectiveness: "high", priority: 1, details: "Tool has reached normal end of life — this is expected wear" },
      { action: "Reduce cutting speed by 15-20%", effectiveness: "medium", priority: 2, details: "Lower Vc reduces abrasive wear rate significantly (Taylor's equation)" },
      { action: "Switch to more wear-resistant grade", effectiveness: "high", priority: 3, details: "Harder substrate or Al₂O₃-coated grade for abrasion resistance" },
    ],
    prevention: [
      "Set tool life limit based on VB = 0.3mm threshold",
      "Monitor flank wear trend to predict replacement timing",
      "Use automatic tool life management system",
    ],
    severity: "minor",
  },
  {
    mode: "crater_wear",
    name: "Crater Wear (KT)",
    appearance: "Concave depression on the rake face behind the cutting edge",
    mechanism: "Chemical diffusion and dissolution at high temperature — tool material dissolves into chip",
    root_causes: [
      "Cutting temperature exceeds coating/substrate chemical stability limit",
      "Wrong tool grade for material — chemical affinity between tool and workpiece",
      "Cutting speed too high for the tool-material combination",
    ],
    contributing_factors: ["No coating or wrong coating", "Positive rake angle concentrates heat", "Insufficient coolant delivery"],
    corrections: [
      { action: "Switch to Al-based coating (AlTiN, AlCrN)", effectiveness: "high", priority: 1, details: "Al₂O₃ barrier layer blocks chemical diffusion up to 1100°C" },
      { action: "Reduce cutting speed by 25-35%", effectiveness: "high", priority: 2, details: "Lower temperature reduces diffusion rate exponentially (Arrhenius)" },
      { action: "Apply high-pressure through-tool coolant", effectiveness: "medium", priority: 3, details: "Reduces tool-chip interface temperature by 150-300°C" },
    ],
    prevention: [
      "Always use coated grades for Inconel, titanium, and austenitic stainless",
      "Check coating temperature rating vs expected cutting temperature",
      "Never use uncoated carbide above 400 m/min in steel",
    ],
    severity: "moderate",
  },
  {
    mode: "notch_wear",
    name: "Notch Wear",
    appearance: "Localized wear groove at the depth-of-cut line on the flank face",
    mechanism: "Work-hardened surface layer at DOC boundary creates accelerated abrasive wear",
    root_causes: [
      "Work-hardening material (stainless, Inconel, titanium)",
      "Constant DOC creating hardened step that subsequent passes cut through",
      "Oxidized surface layer on workpiece (scale, heat-affected zone)",
    ],
    contributing_factors: ["Insufficient DOC variation between passes", "High Vc in work-hardening material"],
    corrections: [
      { action: "Vary depth of cut between passes", effectiveness: "high", priority: 1, details: "Alternate DOC by ±15-20% to avoid cutting at the same hardened line" },
      { action: "Use round insert (RCMT) for continuous edge engagement", effectiveness: "high", priority: 2, details: "Round inserts distribute wear along the entire edge, eliminating notch concentration" },
      { action: "Reduce speed for first pass to minimize work hardening", effectiveness: "medium", priority: 3, details: "Lower Vc on the first pass reduces the depth of the work-hardened layer" },
    ],
    prevention: [
      "Program ramping or variable DOC in CAM for work-hardening materials",
      "Remove oxidized skin with a dedicated roughing pass before critical cuts",
      "Use ceramic inserts for Inconel — no notch wear tendency at high temperatures",
    ],
    severity: "moderate",
  },
  {
    mode: "edge_chipping",
    name: "Edge Chipping / Micro-fracture",
    appearance: "Small irregular chips missing from the cutting edge, visible under magnification",
    mechanism: "Mechanical impact and fatigue from intermittent loading exceeds edge toughness",
    root_causes: [
      "Interrupted cut — tool enters/exits material repeatedly",
      "Setup vibration — workpiece or tool not rigidly clamped",
      "Tool grade too hard (brittle) for the application",
    ],
    contributing_factors: ["Excessive negative rake angle", "Hard inclusions in workpiece", "Thermal shock from intermittent coolant"],
    corrections: [
      { action: "Switch to tougher (less hard) insert grade", effectiveness: "high", priority: 1, details: "Tougher grades absorb impact without chipping — trade some wear resistance for toughness" },
      { action: "Reduce feed rate during tool entry", effectiveness: "medium", priority: 2, details: "Ramping the feed down during entry reduces impact loading" },
      { action: "Use honed or chamfered edge preparation", effectiveness: "medium", priority: 3, details: "A small edge chamfer (0.05-0.1mm) strengthens the cutting edge against impact" },
    ],
    prevention: [
      "Always use toughest acceptable grade for interrupted cuts",
      "Program arc-in tool entry to gradually load the edge",
      "Ensure rigid setup — check clamp torque and workpiece support",
    ],
    severity: "moderate",
  },
  {
    mode: "thermal_cracking",
    name: "Thermal Cracking",
    appearance: "Multiple parallel cracks perpendicular to the cutting edge on the rake face",
    mechanism: "Thermal fatigue from cyclic heating/cooling — thermal expansion mismatch causes stress cracking",
    root_causes: [
      "Intermittent cut with flood coolant — rapid heating and cooling cycles",
      "Milling with coolant — each tooth enters hot, exits into coolant spray",
    ],
    contributing_factors: ["Low thermal conductivity insert material", "High cutting speed amplifies thermal gradient"],
    corrections: [
      { action: "Switch to dry cutting or MQL", effectiveness: "high", priority: 1, details: "Eliminating coolant removes thermal shock. Modern coatings handle heat better than thermal cycling." },
      { action: "If coolant required, use air blast instead of flood", effectiveness: "medium", priority: 2, details: "Compressed air removes chips without the thermal shock of liquid coolant" },
      { action: "Use ceramic or cermet insert", effectiveness: "medium", priority: 3, details: "Ceramic has better thermal shock resistance than carbide" },
    ],
    prevention: [
      "For milling: prefer dry cutting with air blast for chip evacuation",
      "If coolant must be used, ensure consistent application — intermittent coolant is worst case",
      "Use CVD-coated grades which handle thermal cycling better than PVD",
    ],
    severity: "moderate",
  },
  {
    mode: "plastic_deformation",
    name: "Plastic Deformation",
    appearance: "Edge appears bulged, rounded, or pushed downward — loss of sharp geometry",
    mechanism: "Cutting temperature exceeds hot hardness limit — insert softens and deforms under pressure",
    root_causes: [
      "Cutting speed far too high — exceeds tool's thermal capacity",
      "Feed too high — excessive mechanical pressure on softened edge",
    ],
    contributing_factors: ["Inadequate coolant", "Wrong grade — insufficient hot hardness", "Low thermal conductivity workpiece"],
    corrections: [
      { action: "Reduce cutting speed immediately by 30-40%", effectiveness: "high", priority: 1, details: "Temperature is the primary cause — reducing Vc is the most direct fix" },
      { action: "Switch to harder carbide grade or ceramic", effectiveness: "high", priority: 2, details: "Higher hot hardness grade maintains geometry at elevated temperatures" },
      { action: "Improve coolant delivery to the cutting zone", effectiveness: "medium", priority: 3, details: "Through-tool coolant at >40 bar targets the hottest zone" },
    ],
    prevention: [
      "Never exceed the recommended Vc range for the tool-material combination",
      "Monitor for edge deformation during tool inspection intervals",
      "Use grades with high hot hardness (>1500 HV at 800°C) for demanding materials",
    ],
    severity: "severe",
  },
  {
    mode: "fracture",
    name: "Catastrophic Fracture",
    appearance: "Large section of cutting edge or entire insert has broken — irregular fracture surface",
    mechanism: "Mechanical overload exceeds transverse rupture strength of the carbide",
    root_causes: [
      "Collision — tool hit fixture, clamp, or unexpected material",
      "Cutting parameters far too aggressive — force exceeds tool capacity",
      "Accumulated fatigue from micro-chipping — weakened edge finally fails",
    ],
    contributing_factors: ["Too large DOC", "Too high feed", "Excessive tool overhang", "Programming error (wrong offset)"],
    corrections: [
      { action: "STOP machine — inspect spindle and tool holder for damage", effectiveness: "high", priority: 1, details: "Catastrophic failure generates extreme forces that can damage spindle bearings and holder" },
      { action: "Verify program — check for collision paths", effectiveness: "high", priority: 2, details: "Run program in simulation/graphics mode to check for clearance issues" },
      { action: "Reduce parameters by 50% and work back up", effectiveness: "medium", priority: 3, details: "Start conservatively and increase until performance is acceptable" },
    ],
    prevention: [
      "Always run new programs in graphics/dry-run mode first",
      "Use collision detection software in CAM",
      "Set up soft limits at fixture/clamp heights",
      "Never exceed tool manufacturer's maximum recommended DOC",
    ],
    severity: "critical",
  },
  {
    mode: "bue_adhesion",
    name: "Built-Up Edge (BUE)",
    appearance: "Irregular material deposit welded to cutting edge — rough, lumpy appearance",
    mechanism: "At low cutting temperatures, workpiece material cold-welds to the tool under high pressure",
    root_causes: [
      "Cutting speed too low — insufficient temperature for clean chip flow",
      "Material with high adhesion tendency (aluminum, stainless, low-carbon steel)",
    ],
    contributing_factors: ["No coolant (dry cutting of sticky materials)", "Dull/worn tool increases contact area", "Negative rake angle increases pressure"],
    corrections: [
      { action: "Increase cutting speed by 30-50%", effectiveness: "high", priority: 1, details: "Higher temperature prevents cold-welding — chip flows cleanly over rake face" },
      { action: "Apply high-pressure coolant", effectiveness: "medium", priority: 2, details: "Coolant lubrication reduces friction and adhesion tendency" },
      { action: "Use polished rake face or TiB₂ coating", effectiveness: "high", priority: 3, details: "Low-friction surface prevents material adhesion — especially for aluminum" },
    ],
    prevention: [
      "Never cut aluminum below 150 m/min with carbide",
      "For stainless steel, ensure Vc is at least at the low end of the recommended range",
      "Use DLC or diamond coating for aluminum to prevent adhesion",
    ],
    severity: "moderate",
  },
];

// ─── Chip Analysis Knowledge Base ────────────────────────────────────────────

interface ChipDiagnosis {
  type: ChipType;
  name: string;
  indication: string;
  likely_cause: string;
  fix: string;
  severity: "minor" | "moderate" | "severe";
}

const CHIP_DB: ChipDiagnosis[] = [
  { type: "blue_discolored", name: "Blue/Purple Chips", indication: "Cutting temperature > 300°C (for steel)", likely_cause: "Speed too high or coolant not reaching cutting zone", fix: "Reduce Vc by 20-30% or improve coolant delivery", severity: "moderate" },
  { type: "long_stringy", name: "Long Stringy Chips", indication: "Feed per tooth too low for proper chip breaking", likely_cause: "fz below minimum chip thickness — tool is rubbing more than cutting", fix: "Increase feed per tooth by 30-50%", severity: "moderate" },
  { type: "segmented", name: "Segmented/Sawtooth Chips", indication: "Shear localization in the primary shear zone", likely_cause: "Normal for titanium, Inconel, hardened steel. Indicates adiabatic shearing.", fix: "No fix needed — this is the expected chip form for these materials", severity: "minor" },
  { type: "birds_nest", name: "Bird's Nest / Tangled Chips", indication: "Chips not evacuating — wrapping around tool", likely_cause: "Poor chip breaking geometry, no chipbreaker, insufficient coolant pressure for evacuation", fix: "Use chipbreaker insert, apply through-tool coolant, or switch to pecking cycle for drilling", severity: "moderate" },
  { type: "powder", name: "Fine Powder Chips", indication: "Material is being ground rather than cut — very high speed or brittle material", likely_cause: "Extremely high cutting speed (CBN/ceramic territory) or cutting graphite/composite", fix: "If unintentional: reduce speed. If cutting graphite/composites: this is normal.", severity: "minor" },
  { type: "normal_curled", name: "Normal Curled Chips (6-9 shape)", indication: "Good chip formation — proper parameters", likely_cause: "Parameters are correct — chip curls and breaks naturally", fix: "No fix needed — this is ideal chip formation", severity: "minor" },
  { type: "thick_irregular", name: "Thick Irregular Chips", indication: "Excessive chip thickness — feed too high or engagement too deep", likely_cause: "Feed per tooth or radial engagement exceeds recommended values", fix: "Reduce feed per tooth or reduce radial width of cut", severity: "moderate" },
];

// ─── Surface Defect Knowledge Base ───────────────────────────────────────────

interface SurfaceDefectEntry {
  defect: SurfaceDefect;
  name: string;
  appearance: string;
  cause: string;
  physics: string;
  fixes: string[];
  severity: "minor" | "moderate" | "severe";
}

const SURFACE_DEFECT_DB: SurfaceDefectEntry[] = [
  { defect: "chatter_marks", name: "Chatter Marks", appearance: "Regular periodic waves or marks on the surface", cause: "Self-excited vibration (regenerative chatter) at tool/workpiece natural frequency", physics: "Phase shift between successive tooth passes creates positive feedback loop", fixes: ["Change RPM to stable pocket (±10-15%)", "Reduce DOC below stability limit", "Use variable helix/pitch tool"], severity: "moderate" },
  { defect: "smeared_torn", name: "Smeared/Torn Surface", appearance: "Rough, torn-looking surface with material smearing", cause: "BUE tearing — built-up edge periodically breaks away, tearing the surface", physics: "Cold-welded material on cutting edge creates irregular geometry that tears rather than shears", fixes: ["Increase cutting speed to prevent BUE", "Improve coolant delivery", "Use polished or DLC-coated tool"], severity: "moderate" },
  { defect: "feed_marks", name: "Visible Feed Marks", appearance: "Regular parallel lines/grooves in feed direction", cause: "Feed per tooth too high relative to nose radius — geometric feed marks dominate", physics: "Ra_theoretical = fz²/(32×R). When fz is large and nose radius R is small, marks are visible.", fixes: ["Reduce fz", "Use larger nose radius", "Add wiper insert for turning"], severity: "minor" },
  { defect: "scratches", name: "Random Scratches", appearance: "Irregular directional scratches not related to feed marks", cause: "Chip re-cutting — chips not evacuating properly and being dragged across surface", physics: "Trapped chips between tool and workpiece act as abrasive particles", fixes: ["Improve chip evacuation (air blast, coolant pressure)", "Change strategy to up-milling to throw chips away", "Clean chips before finishing pass"], severity: "minor" },
  { defect: "discoloration", name: "Heat Discoloration", appearance: "Blue, purple, straw, or brown coloring on machined surface", cause: "Excessive cutting temperature — thermal damage to surface layer", physics: "Oxide film thickness on steel corresponds to temperature: straw=220°C, blue=300°C+", fixes: ["Reduce cutting speed", "Improve coolant delivery", "Lighter finishing pass"], severity: "severe" },
  { defect: "waviness", name: "Surface Waviness", appearance: "Low-frequency undulation visible when held to light", cause: "Machine axis error, loose gibs, or servo following error", physics: "Waviness (Wa) indicates machine-level error rather than tool-level. Period matches axis motion.", fixes: ["Check machine gibs and adjust backlash", "Calibrate axis with laser interferometer", "Check servo tuning parameters"], severity: "moderate" },
  { defect: "pitting", name: "Surface Pitting", appearance: "Small craters or pits scattered across surface", cause: "Hard inclusions being pulled out during cutting, or corrosion from coolant", physics: "Carbide or oxide inclusions fracture and pull out, leaving voids. Or chloride corrosion from coolant.", fixes: ["Check material certificate for inclusion rating", "Test coolant pH and chloride content", "Switch coolant if corrosive"], severity: "moderate" },
  { defect: "burrs", name: "Excessive Burrs", appearance: "Material lips/ridges extending beyond machined edge", cause: "Ductile material being pushed rather than cut at exit edges", physics: "At exit, remaining material is too thin to shear cleanly — plastic deformation pushes it into a burr", fixes: ["Use climb milling to reduce exit burrs", "Add edge-break chamfer pass", "Use sharper tool"], severity: "minor" },
];

// ─── Crash Investigation ─────────────────────────────────────────────────────

interface CrashScenario {
  type: CrashType;
  name: string;
  common_causes: string[];
  diagnosis_questions: string[];
  prevention: string[];
}

const CRASH_SCENARIOS: CrashScenario[] = [
  {
    type: "tool_into_fixture", name: "Tool Crashed Into Fixture/Vise",
    common_causes: ["Wrong Z work offset — touched off on wrong surface", "Rapid retract height too low", "Wrong tool length offset (measured wrong tool)", "G-code error — missing retract before rapid"],
    diagnosis_questions: ["Was it during a rapid move or cutting move?", "Did the tool cut into material first (wrong offset) or go straight into the fixture (rapid height)?", "Was this the first operation or mid-program?", "Were work offsets verified before starting?"],
    prevention: ["Always verify Z offset by jogging to Z0 in single-block mode", "Use datum indicator to verify work offset before first cut", "Set soft limits at fixture height", "Run graphics simulation before live cutting"],
  },
  {
    type: "tool_into_part", name: "Tool Crashed Into Part",
    common_causes: ["Wrong tool offset — using previous tool's offset", "Cutter compensation (G41/G42) error", "Approach move programming error", "Part shifted in fixture during cutting"],
    diagnosis_questions: ["Which operation was running?", "Was it the correct tool for the operation?", "Was cutter compensation active?", "Did the part appear to move?"],
    prevention: ["Verify tool offset table before each job", "Dry run with offset verification", "Check clamp torque — ensure adequate holding force", "Use tool probe to verify length before first cut"],
  },
  {
    type: "spindle_crash", name: "Spindle Crash / Head Stock Contact",
    common_causes: ["Z retract insufficient for part height", "Wrong workholding height in program", "Tombstone or pallet setup error"],
    diagnosis_questions: ["Did the spindle nose contact the part or fixture?", "What was the Z position when contact occurred?", "Is the spindle still running true (check TIR)?"],
    prevention: ["Program clearance planes 25mm above tallest feature", "Verify setup height matches program assumption", "Check spindle runout after any crash — even minor contact can damage bearings"],
  },
  {
    type: "axis_overtravel", name: "Axis Overtravel / Hard Limit",
    common_causes: ["Work coordinate origin placed too close to machine limit", "Large workpiece extends beyond travel range", "Erroneous rapid move outside machine envelope"],
    diagnosis_questions: ["Which axis triggered the overtravel?", "What was the machine position?", "Can you jog out of the limit in the opposite direction?"],
    prevention: ["Set software travel limits inside hardware limits", "Verify work coordinates fit within machine envelope", "Use simulation to check full travel range before cutting"],
  },
  {
    type: "tool_breakage_in_cut", name: "Tool Broke During Cutting",
    common_causes: ["Excessive cutting forces — DOC or feed too aggressive", "Dull tool — wear weakened the edge", "Hard spot or inclusion in material", "Chip packing in flutes — especially drilling"],
    diagnosis_questions: ["Was the cut interrupted (holes, slots in the path)?", "How many parts/minutes since last tool change?", "Was there any unusual noise before the break?", "Did chips evacuate cleanly?"],
    prevention: ["Follow manufacturer's max DOC and feed recommendations", "Replace tools before end of rated life", "Monitor spindle load — alarm on overload", "Use peck drilling for deep holes"],
  },
  {
    type: "collision_rapid", name: "Collision During Rapid Move",
    common_causes: ["G00 rapid positioning through part or fixture", "Missing retract move in program", "Copied code from different setup without adjusting clearances"],
    diagnosis_questions: ["Was the machine in rapid mode (G00)?", "Was this a first run of the program?", "Were clearance planes checked?"],
    prevention: ["Never program G00 through the part envelope", "Use G43 H__ before any Z move", "Always rapid to X,Y first, then Z down (separate moves)", "Simulate every new program"],
  },
];

// ─── Counter ─────────────────────────────────────────────────────────────────

let forensicCounter = 0;
const forensicHistory: ForensicDiagnosis[] = [];

// ─── Diagnosis Functions ─────────────────────────────────────────────────────

function diagnoseToolFailure(params: Record<string, any>): ForensicDiagnosis {
  forensicCounter++;
  const id = `FOR-TF-${String(forensicCounter).padStart(4, "0")}`;
  const mode = (params.failure_mode ?? params.mode ?? "flank_wear") as ToolFailureMode;
  const entry = FAILURE_MODES.find(f => f.mode === mode) ?? FAILURE_MODES[0];

  const diagnosis: ForensicDiagnosis = {
    diagnosis_id: id,
    category: "tool_autopsy",
    failure_mode: entry.name,
    mechanism: entry.mechanism,
    root_cause_chain: entry.root_causes,
    contributing_factors: entry.contributing_factors,
    corrective_actions: entry.corrections,
    prevention_measures: entry.prevention,
    severity: entry.severity,
    recurrence_risk: entry.severity === "critical" ? "high" : entry.severity === "severe" ? "high" : "medium",
  };

  forensicHistory.push(diagnosis);
  return diagnosis;
}

function diagnoseChip(params: Record<string, any>): ForensicDiagnosis {
  forensicCounter++;
  const id = `FOR-CH-${String(forensicCounter).padStart(4, "0")}`;
  const type = (params.chip_type ?? params.type ?? "normal_curled") as ChipType;
  const entry = CHIP_DB.find(c => c.type === type) ?? CHIP_DB[5]; // default to normal

  const diagnosis: ForensicDiagnosis = {
    diagnosis_id: id,
    category: "chip_analysis",
    failure_mode: entry.name,
    mechanism: entry.indication,
    root_cause_chain: [entry.likely_cause],
    contributing_factors: [],
    corrective_actions: [{ action: entry.fix, effectiveness: "high", priority: 1, details: entry.indication }],
    prevention_measures: [entry.fix],
    severity: entry.severity,
    recurrence_risk: entry.severity === "severe" ? "high" : "medium",
  };

  forensicHistory.push(diagnosis);
  return diagnosis;
}

function diagnoseSurfaceDefect(params: Record<string, any>): ForensicDiagnosis {
  forensicCounter++;
  const id = `FOR-SD-${String(forensicCounter).padStart(4, "0")}`;
  const defect = (params.defect_type ?? params.defect ?? "feed_marks") as SurfaceDefect;
  const entry = SURFACE_DEFECT_DB.find(d => d.defect === defect) ?? SURFACE_DEFECT_DB[2];

  const diagnosis: ForensicDiagnosis = {
    diagnosis_id: id,
    category: "surface_defect",
    failure_mode: entry.name,
    mechanism: entry.physics,
    root_cause_chain: [entry.cause],
    contributing_factors: [],
    corrective_actions: entry.fixes.map((f, i) => ({ action: f, effectiveness: i === 0 ? "high" as const : "medium" as const, priority: i + 1, details: entry.appearance })),
    prevention_measures: entry.fixes,
    severity: entry.severity,
    recurrence_risk: entry.severity === "severe" ? "high" : "medium",
  };

  forensicHistory.push(diagnosis);
  return diagnosis;
}

function investigateCrash(params: Record<string, any>): ForensicDiagnosis {
  forensicCounter++;
  const id = `FOR-CR-${String(forensicCounter).padStart(4, "0")}`;
  const type = (params.crash_type ?? params.type ?? "tool_into_fixture") as CrashType;
  const scenario = CRASH_SCENARIOS.find(c => c.type === type) ?? CRASH_SCENARIOS[0];

  const diagnosis: ForensicDiagnosis = {
    diagnosis_id: id,
    category: "crash_investigation",
    failure_mode: scenario.name,
    mechanism: `Common crash scenario: ${scenario.name}`,
    root_cause_chain: scenario.common_causes,
    contributing_factors: scenario.diagnosis_questions,
    corrective_actions: scenario.prevention.map((p, i) => ({ action: p, effectiveness: i === 0 ? "high" as const : "medium" as const, priority: i + 1, details: `Prevention measure for ${scenario.name}` })),
    prevention_measures: scenario.prevention,
    severity: "critical",
    recurrence_risk: "high",
  };

  forensicHistory.push(diagnosis);
  return diagnosis;
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

/**
 * Actions:
 *   forensic_tool_autopsy     — Diagnose tool failure from wear pattern
 *   forensic_chip_analysis    — Diagnose from chip appearance
 *   forensic_surface_defect   — Diagnose surface defect type
 *   forensic_crash            — Investigate crash scenario
 *   forensic_failure_modes    — List all known tool failure modes
 *   forensic_chip_types       — List all chip type diagnoses
 *   forensic_surface_types    — List all surface defect types
 *   forensic_crash_types      — List all crash scenario types
 *   forensic_history          — Get forensic diagnosis history
 *   forensic_get              — Get specific diagnosis by ID
 */
export function failureForensics(action: string, params: Record<string, any>): any {
  switch (action) {
    case "forensic_tool_autopsy":
      return diagnoseToolFailure(params);

    case "forensic_chip_analysis":
      return diagnoseChip(params);

    case "forensic_surface_defect":
      return diagnoseSurfaceDefect(params);

    case "forensic_crash":
      return investigateCrash(params);

    case "forensic_failure_modes":
      return {
        modes: FAILURE_MODES.map(f => ({
          mode: f.mode, name: f.name, appearance: f.appearance, severity: f.severity,
        })),
        total: FAILURE_MODES.length,
      };

    case "forensic_chip_types":
      return {
        types: CHIP_DB.map(c => ({
          type: c.type, name: c.name, indication: c.indication, severity: c.severity,
        })),
        total: CHIP_DB.length,
      };

    case "forensic_surface_types":
      return {
        types: SURFACE_DEFECT_DB.map(d => ({
          defect: d.defect, name: d.name, appearance: d.appearance, severity: d.severity,
        })),
        total: SURFACE_DEFECT_DB.length,
      };

    case "forensic_crash_types":
      return {
        types: CRASH_SCENARIOS.map(c => ({
          type: c.type, name: c.name, common_causes: c.common_causes.length,
        })),
        total: CRASH_SCENARIOS.length,
      };

    case "forensic_history":
      return {
        diagnoses: forensicHistory,
        total: forensicHistory.length,
        by_category: {
          tool_autopsy: forensicHistory.filter(d => d.category === "tool_autopsy").length,
          chip_analysis: forensicHistory.filter(d => d.category === "chip_analysis").length,
          surface_defect: forensicHistory.filter(d => d.category === "surface_defect").length,
          crash_investigation: forensicHistory.filter(d => d.category === "crash_investigation").length,
        },
      };

    case "forensic_get": {
      const id = params.diagnosis_id ?? params.id ?? "";
      const diagnosis = forensicHistory.find(d => d.diagnosis_id === id);
      if (!diagnosis) return { error: "Diagnosis not found", id };
      return diagnosis;
    }

    default:
      return { error: `FailureForensicsEngine: unknown action "${action}"` };
  }
}
