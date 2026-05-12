/**
 * LatheExpertAdvisorEngine — Expert-Level Machinist Guidance
 * ===========================================================
 * Provides deep domain expertise for challenging lathe operations:
 *   1. Material-Specific Strategies — Best practices for each material type
 *   2. Difficult Geometry Handling — Thin walls, deep bores, long shafts
 *   3. Tooling Selection — Insert grade, geometry, holder recommendations
 *   4. Operation Expert Tips — Threading, grooving, parting, boring specifics
 *   5. Common Pitfalls — Operation-specific mistakes and prevention
 *   6. Process Optimization — Speed/feed sweet spots, cycle time reduction
 *
 * Based on decades of expert machinist knowledge and industry best practices.
 *
 * @module engines/LatheExpertAdvisorEngine
 * @version 1.0.0
 * @milestone LLM-INTEL-11
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Material category for strategy selection */
export type MaterialCategory =
  | "mild_steel"
  | "alloy_steel"
  | "stainless_steel"
  | "hardened_steel"
  | "cast_iron"
  | "aluminum"
  | "titanium"
  | "superalloy"
  | "copper_brass"
  | "plastic"
  | "composite";

/** Operation type */
export type LatheOperation =
  | "roughing"
  | "finishing"
  | "threading"
  | "grooving"
  | "parting"
  | "boring"
  | "drilling"
  | "tapping"
  | "knurling"
  | "facing";

/** Difficult geometry type */
export type DifficultGeometry =
  | "thin_wall"
  | "deep_bore"
  | "long_shaft"
  | "interrupted_cut"
  | "internal_thread"
  | "deep_groove"
  | "small_diameter"
  | "complex_profile";

/** Material-specific strategy */
export interface MaterialStrategy {
  material_category: MaterialCategory;
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  cutting_speed_range: { min: number; max: number; optimal: number; unit: string };
  feed_range: { min: number; max: number; optimal: number; unit: string };
  doc_limit: { roughing_max: number; finishing_max: number; unit: string };
  recommended_inserts: InsertRecommendation[];
  coolant_strategy: string;
  key_challenges: string[];
  expert_tips: string[];
  common_mistakes: string[];
  tool_life_factors: string[];
}

export interface InsertRecommendation {
  grade_family: string;
  coating: string;
  geometry: string;
  use_case: string;
  why: string;
}

/** Geometry handling advice */
export interface GeometryAdvice {
  geometry_type: DifficultGeometry;
  critical_factors: string[];
  setup_requirements: string[];
  parameter_guidelines: ParameterGuideline[];
  tooling_recommendations: string[];
  process_sequence: string[];
  quality_risks: string[];
  expert_tips: string[];
}

export interface ParameterGuideline {
  parameter: string;
  recommendation: string;
  why: string;
}

/** Tooling selection result */
export interface ToolingSelection {
  operation: LatheOperation;
  material: MaterialCategory;
  recommended_tools: ToolRecommendation[];
  holder_recommendations: string[];
  insert_considerations: string[];
  alternatives: string[];
}

export interface ToolRecommendation {
  tool_type: string;
  insert_style: string;
  grade_recommendation: string;
  geometry_code: string;
  nose_radius_mm: number;
  why_selected: string;
  expected_performance: string;
}

/** Operation expert tips */
export interface OperationExpertise {
  operation: LatheOperation;
  critical_success_factors: string[];
  setup_checklist: string[];
  parameter_sweet_spots: ParameterSweetSpot[];
  common_pitfalls: Pitfall[];
  troubleshooting_guide: TroubleshootingItem[];
  pro_tips: string[];
}

export interface ParameterSweetSpot {
  parameter: string;
  ideal_range: string;
  why: string;
  adjustment_for_materials: Record<string, string>;
}

export interface Pitfall {
  mistake: string;
  consequence: string;
  prevention: string;
  how_to_recognize: string;
}

export interface TroubleshootingItem {
  symptom: string;
  likely_causes: string[];
  quick_fixes: string[];
  root_cause_check: string;
}

/** Process optimization result */
export interface ProcessOptimization {
  current_issues: string[];
  optimization_opportunities: OptimizationOpportunity[];
  parameter_recommendations: ParameterRecommendation[];
  cycle_time_improvements: CycleTimeImprovement[];
  quality_improvements: string[];
  cost_reduction_ideas: string[];
}

export interface OptimizationOpportunity {
  area: string;
  current_state: string;
  recommended_change: string;
  expected_benefit: string;
  implementation_difficulty: "easy" | "moderate" | "difficult";
}

export interface ParameterRecommendation {
  parameter: string;
  current: number;
  recommended: number;
  unit: string;
  rationale: string;
  risk_if_exceeded: string;
}

export interface CycleTimeImprovement {
  operation: string;
  current_time_estimate: string;
  potential_savings_pct: number;
  how_to_achieve: string;
}

// ============================================================================
// EXPERT KNOWLEDGE DATABASES
// ============================================================================

/** Material-specific machining knowledge */
const MATERIAL_STRATEGIES: Record<MaterialCategory, Omit<MaterialStrategy, "material_category">> = {
  mild_steel: {
    iso_group: "P",
    cutting_speed_range: { min: 150, max: 350, optimal: 250, unit: "m/min" },
    feed_range: { min: 0.1, max: 0.5, optimal: 0.25, unit: "mm/rev" },
    doc_limit: { roughing_max: 5, finishing_max: 0.5, unit: "mm" },
    recommended_inserts: [
      { grade_family: "GC4325", coating: "CVD TiCN+Al2O3", geometry: "MF", use_case: "General turning", why: "Excellent wear resistance and toughness balance" },
      { grade_family: "GC4315", coating: "CVD", geometry: "MM", use_case: "High-speed finishing", why: "Sharp edge for good finish at high speeds" },
    ],
    coolant_strategy: "Flood coolant recommended. High-pressure beneficial for chip control at high feeds.",
    key_challenges: ["Built-up edge at low speeds", "Long stringy chips"],
    expert_tips: [
      "Stay above 120 m/min to avoid BUE zone",
      "Use positive rake geometry for cleaner cuts",
      "Chip breaker geometry critical for automated operations",
    ],
    common_mistakes: [
      "Running too slow causes BUE and poor finish",
      "Excessive DOC without proper chip control",
      "Ignoring chip wrapping until it damages part",
    ],
    tool_life_factors: ["Speed most critical - too fast causes crater wear, too slow causes BUE"],
  },

  alloy_steel: {
    iso_group: "P",
    cutting_speed_range: { min: 100, max: 280, optimal: 180, unit: "m/min" },
    feed_range: { min: 0.1, max: 0.4, optimal: 0.2, unit: "mm/rev" },
    doc_limit: { roughing_max: 4, finishing_max: 0.4, unit: "mm" },
    recommended_inserts: [
      { grade_family: "GC4325", coating: "CVD TiCN+Al2O3", geometry: "PM", use_case: "General turning", why: "Handles work hardening and higher forces" },
      { grade_family: "GC4335", coating: "CVD", geometry: "PR", use_case: "Roughing", why: "Tougher edge for interrupted cuts" },
    ],
    coolant_strategy: "Flood coolant essential. Consider high-pressure for 4140, 4340 grades.",
    key_challenges: ["Work hardening at low speeds", "Higher cutting forces", "Heat generation"],
    expert_tips: [
      "Maintain consistent chip load - don't dwell",
      "Reduce speed 15-20% vs mild steel",
      "Use larger nose radius for strength",
    ],
    common_mistakes: [
      "Using same parameters as mild steel",
      "Dwelling in cut causing work hardening",
      "Insufficient coolant causing premature wear",
    ],
    tool_life_factors: ["Heat management critical - crater wear accelerates above optimal speed"],
  },

  stainless_steel: {
    iso_group: "M",
    cutting_speed_range: { min: 80, max: 200, optimal: 140, unit: "m/min" },
    feed_range: { min: 0.1, max: 0.35, optimal: 0.2, unit: "mm/rev" },
    doc_limit: { roughing_max: 3, finishing_max: 0.3, unit: "mm" },
    recommended_inserts: [
      { grade_family: "GC2025", coating: "PVD TiAlN", geometry: "MF", use_case: "General SS turning", why: "PVD coating resists adhesion, sharp edge reduces work hardening" },
      { grade_family: "GC1125", coating: "PVD", geometry: "FF", use_case: "Finishing", why: "Very sharp for 304/316 finishing" },
    ],
    coolant_strategy: "High-pressure coolant strongly recommended. Minimum 70 bar for best results.",
    key_challenges: ["Work hardening", "Built-up edge", "Gummy chips", "Poor thermal conductivity"],
    expert_tips: [
      "NEVER let tool dwell or rub - instant work hardening",
      "Use PVD coated inserts - less adhesion than CVD",
      "Positive rake is critical - reduce cutting forces",
      "Higher feed often better than higher speed",
    ],
    common_mistakes: [
      "Running too slow - work hardens surface for next pass",
      "Light DOC causes rubbing instead of cutting",
      "Using CVD coating - chips weld to insert",
      "Stopping in cut or retracting through work hardened layer",
    ],
    tool_life_factors: ["BUE and notch wear dominate - keep sharp, use high-pressure coolant"],
  },

  hardened_steel: {
    iso_group: "H",
    cutting_speed_range: { min: 60, max: 180, optimal: 100, unit: "m/min" },
    feed_range: { min: 0.05, max: 0.2, optimal: 0.1, unit: "mm/rev" },
    doc_limit: { roughing_max: 0.5, finishing_max: 0.15, unit: "mm" },
    recommended_inserts: [
      { grade_family: "CB7025", coating: "None", geometry: "CNGA", use_case: "Finishing 55-65 HRC", why: "CBN handles extreme hardness with good finish" },
      { grade_family: "GC4225", coating: "CVD", geometry: "WF", use_case: "Semi-finishing 45-55 HRC", why: "Wiper geometry for hard turning finish" },
    ],
    coolant_strategy: "Dry or air blast preferred for CBN. Thermal shock from coolant causes micro-fracture.",
    key_challenges: ["Extreme tool wear", "White layer formation", "Heat concentration", "Chipping risk"],
    expert_tips: [
      "CBN for >55 HRC, ceramic or carbide for 45-55 HRC",
      "Light, consistent cuts - heavy cuts chip edge",
      "Negative rake provides strength",
      "Chamfered edge (T-land) prevents chipping",
      "Dry cutting often gives longer CBN life",
    ],
    common_mistakes: [
      "Using coolant with CBN - causes thermal cracking",
      "Excessive DOC - CBN is brittle",
      "Interrupted cuts with CBN - use PCBN for that",
      "Expecting same MRR as soft steel",
    ],
    tool_life_factors: ["Flank wear dominates - monitor closely, white layer forms at failure"],
  },

  cast_iron: {
    iso_group: "K",
    cutting_speed_range: { min: 150, max: 400, optimal: 280, unit: "m/min" },
    feed_range: { min: 0.15, max: 0.6, optimal: 0.3, unit: "mm/rev" },
    doc_limit: { roughing_max: 6, finishing_max: 0.5, unit: "mm" },
    recommended_inserts: [
      { grade_family: "GC3215", coating: "CVD Al2O3", geometry: "KM", use_case: "General cast iron", why: "Ceramic coating resists abrasive wear from graphite" },
      { grade_family: "CC6190", coating: "Ceramic", geometry: "CNGA", use_case: "High-speed finishing", why: "Silicon nitride ceramic for maximum speed" },
    ],
    coolant_strategy: "Dry preferred for gray iron (dust control needed). Coolant OK for ductile iron.",
    key_challenges: ["Abrasive graphite particles", "Dust generation", "Skin/sand inclusions"],
    expert_tips: [
      "Cast iron can run FAST - don't be timid",
      "Ceramic inserts can double productivity",
      "First pass removes hard skin - use tougher grade",
      "Negative rake handles interruptions better",
    ],
    common_mistakes: [
      "Running too slow - leaving performance on table",
      "Using coolant on gray iron - messy sludge",
      "Not accounting for hard skin on first cut",
    ],
    tool_life_factors: ["Abrasive wear from graphite - harder coatings last longer"],
  },

  aluminum: {
    iso_group: "N",
    cutting_speed_range: { min: 300, max: 1500, optimal: 800, unit: "m/min" },
    feed_range: { min: 0.1, max: 0.8, optimal: 0.3, unit: "mm/rev" },
    doc_limit: { roughing_max: 8, finishing_max: 0.5, unit: "mm" },
    recommended_inserts: [
      { grade_family: "H13A", coating: "Uncoated/DLC", geometry: "AL", use_case: "General aluminum", why: "Polished rake, sharp edge, high positive geometry" },
      { grade_family: "CD10", coating: "PCD", geometry: "CCGW", use_case: "High-volume production", why: "PCD lasts 50-100x longer in abrasive alloys" },
    ],
    coolant_strategy: "Flood with emulsion, or MQL for cleaner operation. Critical for chip evacuation.",
    key_challenges: ["BUE at low speeds", "Chip welding", "Burr formation", "High-silicon alloy abrasion"],
    expert_tips: [
      "GO FAST - aluminum loves speed",
      "Sharp, polished inserts are critical",
      "High positive rake (>15°) reduces forces",
      "PCD mandatory for high-silicon alloys (A356, 390)",
      "Large nose radius OK for finish - aluminum is forgiving",
    ],
    common_mistakes: [
      "Running too slow - BUE destroys finish",
      "Using coated inserts (coating chips off)",
      "Ignoring chip evacuation - welded chips scratch parts",
    ],
    tool_life_factors: ["BUE at low speed, abrasion in high-Si alloys - stay above 300 m/min"],
  },

  titanium: {
    iso_group: "S",
    cutting_speed_range: { min: 30, max: 80, optimal: 50, unit: "m/min" },
    feed_range: { min: 0.1, max: 0.25, optimal: 0.15, unit: "mm/rev" },
    doc_limit: { roughing_max: 3, finishing_max: 0.3, unit: "mm" },
    recommended_inserts: [
      { grade_family: "GC1105", coating: "PVD TiAlN", geometry: "SM", use_case: "General Ti turning", why: "Sharp PVD edge, heat-resistant coating" },
      { grade_family: "S05F", coating: "Uncoated carbide", geometry: "MF", use_case: "Finishing", why: "Sharp uncoated edge for best surface" },
    ],
    coolant_strategy: "HIGH PRESSURE ESSENTIAL - 70+ bar. Flood at absolute minimum. Never run dry.",
    key_challenges: ["Low thermal conductivity", "Reactivity with tool", "Spring-back", "Fire risk with chips"],
    expert_tips: [
      "SLOW speeds - heat kills titanium tools",
      "High-pressure coolant is not optional",
      "Sharp edges only - dull edge = fire risk",
      "Feed aggressively to get under work-hardened layer",
      "Never stop in cut or retract through cut surface",
    ],
    common_mistakes: [
      "Running too fast - tool fails catastrophically",
      "Light cuts - rubs and work hardens",
      "Inadequate coolant - fire hazard",
      "Dwelling in cut - instant work hardening",
    ],
    tool_life_factors: ["Heat is enemy #1 - crater wear and edge breakdown from thermal damage"],
  },

  superalloy: {
    iso_group: "S",
    cutting_speed_range: { min: 15, max: 50, optimal: 30, unit: "m/min" },
    feed_range: { min: 0.1, max: 0.2, optimal: 0.12, unit: "mm/rev" },
    doc_limit: { roughing_max: 2, finishing_max: 0.25, unit: "mm" },
    recommended_inserts: [
      { grade_family: "GC1105", coating: "PVD", geometry: "SM", use_case: "Inconel, Waspaloy", why: "Sharp positive edge minimizes work hardening" },
      { grade_family: "CC6060", coating: "SiAlON ceramic", geometry: "Round", use_case: "High-speed roughing", why: "Ceramic handles heat, round insert spreads wear" },
    ],
    coolant_strategy: "HIGH PRESSURE REQUIRED - 100+ bar if available. Critical for chip control and heat.",
    key_challenges: ["Extreme work hardening", "High cutting forces", "Poor thermal conductivity", "Notch wear"],
    expert_tips: [
      "Very slow speeds - patience is key",
      "Feed hard to get under work-hardened layer",
      "Round inserts spread notch wear",
      "Ceramic can rough at 3x carbide speeds",
      "Index frequently - notch wear causes failure",
    ],
    common_mistakes: [
      "Running speeds suitable for stainless",
      "Light passes that rub instead of cut",
      "Ignoring notch wear at DOC line",
      "Not indexing soon enough",
    ],
    tool_life_factors: ["Notch wear at DOC line - vary DOC slightly between passes to distribute wear"],
  },

  copper_brass: {
    iso_group: "N",
    cutting_speed_range: { min: 150, max: 500, optimal: 300, unit: "m/min" },
    feed_range: { min: 0.1, max: 0.5, optimal: 0.25, unit: "mm/rev" },
    doc_limit: { roughing_max: 5, finishing_max: 0.4, unit: "mm" },
    recommended_inserts: [
      { grade_family: "H13A", coating: "Uncoated", geometry: "AL", use_case: "Brass/Bronze", why: "Sharp polished edge, no coating to chip off" },
      { grade_family: "CD10", coating: "PCD", geometry: "CCGW", use_case: "High-volume copper", why: "Extreme edge life in copper alloys" },
    ],
    coolant_strategy: "Light coolant or MQL. Many brasses machine well dry. Avoid heavy flood.",
    key_challenges: ["Long stringy chips (copper)", "Grabbing on exit (free-machining brass)", "Burrs"],
    expert_tips: [
      "Free-machining brass: reduce rake, increase relief",
      "Pure copper: use very sharp, positive rake",
      "Chip breakers critical for automated operation",
      "Back rake 0° or slightly negative prevents grab",
    ],
    common_mistakes: [
      "Using coated inserts - coating flakes into finish",
      "Too much positive rake on free-machining grades - grab and chatter",
      "Ignoring chip control until machine is wrapped",
    ],
    tool_life_factors: ["Generally excellent tool life - edge sharpness matters more than wear resistance"],
  },

  plastic: {
    iso_group: "N",
    cutting_speed_range: { min: 100, max: 400, optimal: 200, unit: "m/min" },
    feed_range: { min: 0.1, max: 0.4, optimal: 0.2, unit: "mm/rev" },
    doc_limit: { roughing_max: 4, finishing_max: 0.3, unit: "mm" },
    recommended_inserts: [
      { grade_family: "H10F", coating: "Uncoated", geometry: "AL", use_case: "Thermoplastics", why: "Very sharp, polished, high positive rake" },
      { grade_family: "CD10", coating: "PCD", geometry: "DCGW", use_case: "Glass-filled plastics", why: "PCD handles abrasive glass fiber" },
    ],
    coolant_strategy: "Air blast or light mist. Many plastics should run dry. Water can cause stress cracking.",
    key_challenges: ["Heat buildup (melting)", "Deflection", "Poor surface (tearing)", "Dimensional instability"],
    expert_tips: [
      "VERY sharp tools - plastic tears from dull edges",
      "Large positive rake reduces heating",
      "Light steady cuts - plastics deflect easily",
      "Air blast clears chips and cools",
      "Zero back rake for engineering plastics",
    ],
    common_mistakes: [
      "Using metal-working inserts - too dull",
      "Heavy coolant causing stress cracks",
      "Heavy cuts causing deflection and melting",
      "Ignoring heat buildup - part melts/deforms",
    ],
    tool_life_factors: ["Edge sharpness is everything - resharpen frequently, wear is minimal"],
  },

  composite: {
    iso_group: "N",
    cutting_speed_range: { min: 100, max: 300, optimal: 180, unit: "m/min" },
    feed_range: { min: 0.05, max: 0.2, optimal: 0.1, unit: "mm/rev" },
    doc_limit: { roughing_max: 2, finishing_max: 0.2, unit: "mm" },
    recommended_inserts: [
      { grade_family: "CD10", coating: "PCD", geometry: "VCGW", use_case: "CFRP, GFRP", why: "Only PCD survives abrasive fibers" },
      { grade_family: "CD1810", coating: "CVD Diamond", geometry: "DCGW", use_case: "High-volume CFRP", why: "Diamond coating for extreme abrasion" },
    ],
    coolant_strategy: "MQL or air blast preferred. Avoid flood - fiber hygroscopy and cleanup issues.",
    key_challenges: ["Extreme abrasion", "Delamination", "Fiber pull-out", "Dust hazard"],
    expert_tips: [
      "PCD or diamond coated ONLY - carbide dies instantly",
      "Sharp positive geometry reduces delamination",
      "Low forces prevent fiber pull-out",
      "Dust extraction mandatory - health hazard",
      "Support thin walls to prevent delamination",
    ],
    common_mistakes: [
      "Using carbide - lasts minutes not hours",
      "Heavy cuts causing delamination",
      "No dust extraction - serious health risk",
      "Expecting surface finish like metal",
    ],
    tool_life_factors: ["Abrasive wear only - PCD essential, carbide is false economy"],
  },
};

/** Operation-specific expert knowledge */
const OPERATION_EXPERTISE: Record<LatheOperation, Omit<OperationExpertise, "operation">> = {
  threading: {
    critical_success_factors: [
      "Correct infeed method for thread type",
      "Proper threading speed (usually slower)",
      "Sharp threading insert",
      "Correct compound angle or infeed selection",
    ],
    setup_checklist: [
      "Verify spindle encoder sync",
      "Check threading speed capability",
      "Confirm lead/pitch calculation",
      "Select correct infeed method (radial, flank, modified flank)",
      "Set proper DOC per pass (deeper early, lighter at finish)",
    ],
    parameter_sweet_spots: [
      { parameter: "speed", ideal_range: "30-60% of turning speed", why: "Threading generates high forces at cutting edge", adjustment_for_materials: { stainless: "25-40% of turning speed", aluminum: "50-80% of turning speed" } },
      { parameter: "first_pass_doc", ideal_range: "0.1-0.2mm", why: "Deeper cuts early reduce passes", adjustment_for_materials: { hardened: "0.05mm max", titanium: "0.08mm max" } },
      { parameter: "final_pass_doc", ideal_range: "0.02-0.05mm", why: "Light spring passes improve finish", adjustment_for_materials: {} },
    ],
    common_pitfalls: [
      { mistake: "Wrong infeed method", consequence: "Poor thread finish, chipping on one flank", prevention: "Use modified flank infeed for most external threads", how_to_recognize: "One thread flank rougher than other" },
      { mistake: "Too many passes", consequence: "Rubbing, work hardening, tool wear", prevention: "Use correct pass schedule, deeper early cuts", how_to_recognize: "Thread profile not improving with more passes" },
      { mistake: "Speed too high", consequence: "Poor finish, thread pitch error at high RPM", prevention: "Reduce speed for threading, especially fine pitch", how_to_recognize: "Pitch measures incorrectly, rough flanks" },
    ],
    troubleshooting_guide: [
      { symptom: "Rough thread flanks", likely_causes: ["Dull insert", "Wrong infeed", "Chatter"], quick_fixes: ["Replace insert", "Switch to modified flank infeed"], root_cause_check: "Run test thread with new insert" },
      { symptom: "Incorrect pitch", likely_causes: ["Encoder sync", "Programming error", "Ballscrew backlash"], quick_fixes: ["Verify program", "Check encoder"], root_cause_check: "Measure multiple threads to see if error accumulates" },
      { symptom: "Thread crest burrs", likely_causes: ["Speed too high", "Feed per pass too light"], quick_fixes: ["Reduce speed", "Slightly increase final passes"], root_cause_check: "Examine burr direction" },
    ],
    pro_tips: [
      "Use variable depth infeed for faster cycle - deeper early, lighter finishing",
      "For internal threads, reduce speed further - rigidity is lower",
      "Partial profile inserts handle multiple pitches - good for job shop",
      "Full profile inserts give best finish and last longer for production",
      "Consider thread milling for very large pitches or interrupted threads",
    ],
  },

  grooving: {
    critical_success_factors: [
      "Rigid tool and workpiece setup",
      "Proper chip control",
      "Correct speed/feed balance",
      "Adequate coolant delivery to groove",
    ],
    setup_checklist: [
      "Minimize tool overhang",
      "Verify groove width tool matches requirement",
      "Check insert for chipping (common failure mode)",
      "Ensure coolant reaches groove bottom",
      "Use pecking cycle for deep grooves",
    ],
    parameter_sweet_spots: [
      { parameter: "speed", ideal_range: "70-90% of turning speed", why: "Lower speed reduces chip evacuation problems", adjustment_for_materials: { stainless: "50-70% of turning", hardened: "40-60% of turning" } },
      { parameter: "feed", ideal_range: "0.05-0.15 mm/rev", why: "Lower feed than turning - chip must evacuate narrow slot", adjustment_for_materials: {} },
      { parameter: "peck_depth", ideal_range: "2-3x groove width", why: "Deeper pecks are efficient but risk chip packing", adjustment_for_materials: {} },
    ],
    common_pitfalls: [
      { mistake: "Chip packing in groove", consequence: "Insert breakage, poor finish, re-cutting chips", prevention: "Use pecking, reduce feed, high-pressure coolant", how_to_recognize: "Groove finish deteriorates, insert chips" },
      { mistake: "No pecking on deep groove", consequence: "Chip welding, tool breakage", prevention: "Peck at 2-3x width increments, retract fully", how_to_recognize: "Tool breaks or finish is terrible" },
      { mistake: "Too narrow insert for groove", consequence: "Insert chipping from side loads", prevention: "Match insert width to groove, not smaller", how_to_recognize: "Insert chips at corners" },
    ],
    troubleshooting_guide: [
      { symptom: "Insert breaks frequently", likely_causes: ["Chip packing", "Too much side load", "Entering too fast"], quick_fixes: ["Add pecking cycle", "Reduce feed at entry"], root_cause_check: "Examine broken insert edge location" },
      { symptom: "Poor groove floor finish", likely_causes: ["Chip re-cutting", "Dull insert", "Chatter"], quick_fixes: ["Improve chip evacuation", "Replace insert"], root_cause_check: "Run with reduced feed, new insert" },
      { symptom: "Groove width incorrect", likely_causes: ["Tool wear", "Wrong insert", "Deflection"], quick_fixes: ["Measure insert", "Check overhang"], root_cause_check: "Compare insert width to groove measurement" },
    ],
    pro_tips: [
      "High-pressure coolant is your friend for grooving",
      "Use full-width insert on OD, oversize then finish ID grooves",
      "For face grooves, watch chip flow - they curl toward spindle",
      "Parting insert geometry often works for shallow grooves",
      "Consider Y-axis grooving for better rigidity on some machines",
    ],
  },

  parting: {
    critical_success_factors: [
      "Absolute rigidity - tool and work",
      "Coolant reaching parting zone",
      "Consistent feed (never dwell)",
      "Part support to prevent drop damage",
    ],
    setup_checklist: [
      "Minimize blade overhang",
      "Verify parting blade is perpendicular to axis",
      "Check part catcher or bar feed for part exit",
      "Ensure coolant targets parting zone",
      "Use correct blade height (center height critical)",
    ],
    parameter_sweet_spots: [
      { parameter: "speed", ideal_range: "80-100 m/min (constant)", why: "As diameter decreases, RPM must increase - constant surface speed essential", adjustment_for_materials: { stainless: "60-80 m/min", aluminum: "150-250 m/min" } },
      { parameter: "feed", ideal_range: "0.05-0.1 mm/rev", why: "Light consistent feed prevents grabbing", adjustment_for_materials: { stainless: "0.04-0.08 mm/rev", aluminum: "0.08-0.15 mm/rev" } },
      { parameter: "blade_width", ideal_range: "Narrowest that survives", why: "Narrow blade = less material waste, but more fragile", adjustment_for_materials: {} },
    ],
    common_pitfalls: [
      { mistake: "Parting off-center", consequence: "Blade grabs, breaks, pip left on part", prevention: "Set blade exactly on center height, verify with test cut", how_to_recognize: "Pip on parted face, grabbing near center" },
      { mistake: "Dwelling at center", consequence: "Tool grabs, breaks when part separates", prevention: "Feed through center, have part support", how_to_recognize: "Part drops violently, blade breaks" },
      { mistake: "Too much overhang", consequence: "Chatter, poor finish, blade breakage", prevention: "Use shortest blade projection possible", how_to_recognize: "Lines on parted face, chatter marks" },
    ],
    troubleshooting_guide: [
      { symptom: "Blade breaks repeatedly", likely_causes: ["Off center", "Dwelling", "Too fast feed", "No coolant"], quick_fixes: ["Check center height", "Add coolant", "Reduce feed"], root_cause_check: "Part face shows where blade was when it broke" },
      { symptom: "Pip left on part", likely_causes: ["Blade above center", "Dull blade", "Part deflecting"], quick_fixes: ["Lower blade to center", "Replace blade"], root_cause_check: "Test with indicator at different blade positions" },
      { symptom: "Grabbing near center", likely_causes: ["Blade below center", "Part deflecting up"], quick_fixes: ["Raise blade", "Support part"], root_cause_check: "Watch part at moment of separation" },
    ],
    pro_tips: [
      "Center height is EVERYTHING in parting",
      "Constant surface speed prevents the 'death spiral' at center",
      "Never stop feed in parting - feed through or retract",
      "Support the parting piece - drops cause nicks and damage",
      "High positive rake reduces forces but is more fragile",
      "For bar work, leave 0.5mm pip and twist-off for clean break",
    ],
  },

  boring: {
    critical_success_factors: [
      "Maximum rigidity despite overhang",
      "Proper chip evacuation from hole",
      "Adequate coolant flow to cutting zone",
      "Correct bar diameter for bore size",
    ],
    setup_checklist: [
      "Use largest bar diameter that fits",
      "Minimize overhang (L/D < 4 ideal)",
      "Verify through-tool coolant if available",
      "Check insert position for radial adjustment",
      "Consider anti-vibration bar for L/D > 4",
    ],
    parameter_sweet_spots: [
      { parameter: "speed", ideal_range: "80-90% of OD turning speed", why: "Internal geometry traps heat, lower speed helps", adjustment_for_materials: { stainless: "70% of OD speed", hardened: "60% of OD speed" } },
      { parameter: "feed", ideal_range: "0.08-0.2 mm/rev", why: "Balance MRR against deflection tendency", adjustment_for_materials: { aluminum: "0.15-0.3 mm/rev" } },
      { parameter: "doc", ideal_range: "0.5-1.5mm roughing", why: "Multiple light passes better than heavy passes with deflection", adjustment_for_materials: {} },
    ],
    common_pitfalls: [
      { mistake: "Bar too small for bore", consequence: "Excessive overhang, chatter, poor finish", prevention: "Use largest bar that allows chip clearance", how_to_recognize: "Chatter marks, tapered bore" },
      { mistake: "Heavy cut with long overhang", consequence: "Deflection causes taper and oversize bore", prevention: "Light DOC, multiple passes, measure and compensate", how_to_recognize: "Bore is tapered or oversize at bottom" },
      { mistake: "Chips not evacuating", consequence: "Re-cutting chips, scratched bore surface", prevention: "Through-bar coolant, pecking, reverse chip flow", how_to_recognize: "Random scratches on bore surface" },
    ],
    troubleshooting_guide: [
      { symptom: "Bore is tapered (larger at bottom)", likely_causes: ["Bar deflection", "Insert wear"], quick_fixes: ["Reduce DOC", "Use larger bar", "Compensate in program"], root_cause_check: "Measure bore at intervals, calculate deflection" },
      { symptom: "Chatter marks in bore", likely_causes: ["L/D too high", "Speed at resonance", "Insert geometry"], quick_fixes: ["Try damped bar", "Change speed +-15%", "Smaller nose radius"], root_cause_check: "Touch bar - is it vibrating?" },
      { symptom: "Poor bore finish", likely_causes: ["Chip re-cutting", "Worn insert", "Chatter"], quick_fixes: ["Improve chip evacuation", "New insert"], root_cause_check: "Run with high-pressure coolant, new insert" },
    ],
    pro_tips: [
      "Anti-vibration (damped) bars are worth every penny for L/D > 4",
      "Carbide shank bars extend usable L/D by 30%",
      "Through-tool coolant dramatically improves chip evacuation",
      "For deep bores, bore from both ends when possible",
      "Measure mid-bore to catch deflection before finish pass",
      "Boring is where machine rigidity really shows - adjust expectations on light machines",
    ],
  },

  roughing: {
    critical_success_factors: [
      "Maximum MRR within power limits",
      "Reliable chip control",
      "Tool life predictability",
      "Consistent stock removal",
    ],
    setup_checklist: [
      "Select appropriate insert for material",
      "Verify spindle power adequate for target MRR",
      "Set up chip conveyor if needed",
      "Consider roughing geometry insert",
      "Plan passes to leave uniform stock for finishing",
    ],
    parameter_sweet_spots: [
      { parameter: "doc", ideal_range: "2/3 of insert length", why: "Engages cutting edge optimally, distributes wear", adjustment_for_materials: { hardened: "1/4 of insert length", titanium: "1/2 of insert length" } },
      { parameter: "feed", ideal_range: "0.2-0.4 mm/rev", why: "Balance MRR, chip control, and tool life", adjustment_for_materials: { aluminum: "0.3-0.6 mm/rev", stainless: "0.15-0.3 mm/rev" } },
      { parameter: "speed", ideal_range: "Use speed for target tool life", why: "Speed impacts life most - set based on cost/productivity balance", adjustment_for_materials: {} },
    ],
    common_pitfalls: [
      { mistake: "DOC too light for roughing", consequence: "Rubbing, work hardening, premature wear", prevention: "Take real cuts - roughing inserts need engagement", how_to_recognize: "Insert wears fast but not much metal removed" },
      { mistake: "Ignoring chip control", consequence: "Chips tangle, stop production, damage parts", prevention: "Select proper chip breaker, verify evacuation", how_to_recognize: "Operator constantly clearing chips" },
      { mistake: "Exceeding power limits", consequence: "Spindle stall, poor finish, accelerated wear", prevention: "Calculate power requirement, respect limits", how_to_recognize: "Spindle load meter at 100%" },
    ],
    troubleshooting_guide: [
      { symptom: "Low tool life", likely_causes: ["Speed too high", "Insufficient coolant", "Wrong grade"], quick_fixes: ["Reduce speed 15%", "Increase coolant", "Try tougher grade"], root_cause_check: "Examine wear pattern on insert" },
      { symptom: "Poor chip control", likely_causes: ["Wrong chip breaker", "Feed too low", "DOC too light"], quick_fixes: ["Increase feed", "Deeper DOC", "Different insert"], root_cause_check: "Experiment with feed/DOC combinations" },
      { symptom: "Surface finish too rough", likely_causes: ["Feed too high", "Worn insert", "Chatter"], quick_fixes: ["This is roughing - finish will be better", "Check if chatter"], root_cause_check: "Only worry if it affects finishing stock" },
    ],
    pro_tips: [
      "Roughing is about MRR - finish doesn't matter until finishing pass",
      "Leave consistent stock (1-2mm) for finishing - not less",
      "Round or C-type inserts spread wear for longer life",
      "Coated carbide handles most roughing - save ceramic for high-temp alloys",
      "Coolant matters more in roughing than finishing",
    ],
  },

  finishing: {
    critical_success_factors: [
      "Correct Ra/Rz achievement",
      "Dimensional accuracy",
      "Consistent results part-to-part",
      "Sharp insert with correct geometry",
    ],
    setup_checklist: [
      "Select finishing insert (sharp edge, wiper, or correct nose radius)",
      "Calculate feed for target Ra",
      "Verify machine accuracy at finishing speed",
      "Check thermal stability if tight tolerances",
      "Consider insert brand/grade specifically for finishing",
    ],
    parameter_sweet_spots: [
      { parameter: "feed", ideal_range: "0.05-0.15 mm/rev", why: "Ra proportional to f²/8r - lower feed = better finish", adjustment_for_materials: { aluminum: "0.1-0.2 mm/rev (forgiving)", stainless: "0.08-0.12 mm/rev" } },
      { parameter: "nose_radius", ideal_range: "0.4-0.8mm for general, 0.8-1.2mm for max finish", why: "Larger radius = better finish but may cause chatter", adjustment_for_materials: {} },
      { parameter: "doc", ideal_range: "0.2-0.5mm", why: "Light cut, sharp insert, good finish", adjustment_for_materials: { hardened: "0.1-0.2mm" } },
    ],
    common_pitfalls: [
      { mistake: "Worn insert for finishing", consequence: "Poor finish, BUE marks, dimensional drift", prevention: "Use fresh edge for every finishing pass", how_to_recognize: "Finish quality drops, burnished look" },
      { mistake: "Too high feed for Ra target", consequence: "Cannot achieve finish spec", prevention: "Calculate: Ra = 0.0321 × f² / r (μm)", how_to_recognize: "Ra measures higher than expected" },
      { mistake: "Large nose radius causing chatter", consequence: "Chatter marks override theoretical finish", prevention: "Balance nose radius against rigidity", how_to_recognize: "Wave pattern on surface" },
    ],
    troubleshooting_guide: [
      { symptom: "Ra doesn't meet spec", likely_causes: ["Feed too high", "Worn insert", "BUE", "Chatter"], quick_fixes: ["Reduce feed", "New insert", "Check speed"], root_cause_check: "Calculate theoretical Ra, compare to measured" },
      { symptom: "Dimensional variation", likely_causes: ["Thermal drift", "Insert wear", "Deflection"], quick_fixes: ["Let machine warm up", "Offset adjust"], root_cause_check: "Measure trend over multiple parts" },
      { symptom: "Finish varies around circumference", likely_causes: ["Out of round", "Spindle runout", "Unbalanced"], quick_fixes: ["Check runout", "Reduce speed"], root_cause_check: "Indicate rotating workpiece" },
    ],
    pro_tips: [
      "Theoretical finish: Ra(μm) = 32.1 × f² / r (f in mm, r in mm)",
      "Wiper inserts give 2x better finish at same feed",
      "Fresh edge is worth more than expensive grade",
      "For mirror finish, try CBN on steel or PCD on aluminum",
      "Spring passes (same pass, no feed change) help dimensional accuracy",
    ],
  },

  drilling: {
    critical_success_factors: [
      "Proper center preparation",
      "Chip evacuation from hole",
      "Coolant to cutting edges",
      "Appropriate drill for material",
    ],
    setup_checklist: [
      "Face and center drill before drilling",
      "Select drill geometry for material (point angle, helix)",
      "Verify through-spindle coolant pressure",
      "Set pecking cycle for deep holes",
      "Check drill concentricity in holder",
    ],
    parameter_sweet_spots: [
      { parameter: "speed", ideal_range: "As per drill charts", why: "HSS much slower than carbide, vary by material", adjustment_for_materials: { stainless: "50% of steel speeds", aluminum: "150% of steel speeds" } },
      { parameter: "feed", ideal_range: "0.01-0.03 mm per revolution per mm diameter", why: "Feed scales with drill diameter", adjustment_for_materials: {} },
      { parameter: "peck_depth", ideal_range: "1-3x drill diameter", why: "Deeper pecks are efficient but risk chip packing", adjustment_for_materials: { stainless: "0.5-1x diameter", aluminum: "2-4x diameter" } },
    ],
    common_pitfalls: [
      { mistake: "No center drill", consequence: "Drill walks, hole off location", prevention: "Always spot drill or use self-centering drill", how_to_recognize: "Hole position error, drill breakage" },
      { mistake: "Chips not clearing", consequence: "Chip packing, drill breakage", prevention: "Use peck cycle, through-coolant if available", how_to_recognize: "Drill squeals, gets hot, breaks" },
      { mistake: "Wrong drill type for material", consequence: "Poor results or breakage", prevention: "Match geometry to material (135° for steel, 118° for softer)", how_to_recognize: "Check drill manufacturer recommendations" },
    ],
    troubleshooting_guide: [
      { symptom: "Drill breaks", likely_causes: ["Chip packing", "Too much feed", "Work hardened layer"], quick_fixes: ["Add pecking", "Reduce feed", "Use through-coolant drill"], root_cause_check: "Examine break location on drill" },
      { symptom: "Hole oversize", likely_causes: ["Runout", "Drill geometry", "Heat expansion"], quick_fixes: ["Check holder", "Use different drill"], root_cause_check: "Measure drill TIR in holder" },
      { symptom: "Poor hole finish", likely_causes: ["Dull drill", "Insufficient coolant", "Feed too high"], quick_fixes: ["Sharpen/replace", "More coolant", "Reduce feed"], root_cause_check: "Examine drill edges for wear" },
    ],
    pro_tips: [
      "Through-coolant carbide drills are game changers for production",
      "For deep holes (>5D), consider gun drilling",
      "Split point drills self-center better than standard point",
      "Coolant pressure matters more than volume for drilling",
      "For stainless: reduce speed, increase feed, use pecking",
    ],
  },

  tapping: {
    critical_success_factors: [
      "Correct tap drill size",
      "Proper synchronization",
      "Good lubrication",
      "Appropriate tap style for material",
    ],
    setup_checklist: [
      "Verify tap drill size (use chart, don't guess)",
      "Check rigid tapping capability vs floating holder",
      "Select correct tap style (spiral flute for blind, spiral point for through)",
      "Ensure proper lubrication/coolant",
      "Reduce speed significantly from drilling",
    ],
    parameter_sweet_spots: [
      { parameter: "speed", ideal_range: "50-100 SFM for HSS, 100-200 for carbide", why: "Tapping is hard on taps - conservative speeds win", adjustment_for_materials: { stainless: "25-50 SFM", aluminum: "100-150 SFM" } },
      { parameter: "tap_percentage", ideal_range: "65-75% thread", why: "Full depth threads don't add strength but wear taps", adjustment_for_materials: {} },
      { parameter: "hole_size", ideal_range: "Per tap drill chart", why: "Correct drill size is most critical factor", adjustment_for_materials: {} },
    ],
    common_pitfalls: [
      { mistake: "Wrong tap drill size", consequence: "Tap breaks (undersize) or weak threads (oversize)", prevention: "Use published tap drill chart for thread percentage", how_to_recognize: "Tap breaks or go gauge won't fit" },
      { mistake: "Spiral point tap in blind hole", consequence: "Chips pack at bottom, tap breaks", prevention: "Spiral flute for blind holes - clears chips up", how_to_recognize: "Tap binds and breaks at hole bottom" },
      { mistake: "Too much speed", consequence: "Heat buildup, tap failure", prevention: "Tapping speed is much slower than you think", how_to_recognize: "Tap glazes over, breaks, or oversizes hole" },
    ],
    troubleshooting_guide: [
      { symptom: "Tap breaks", likely_causes: ["Hole too small", "Chips packing", "Speed too high", "Wrong tap style"], quick_fixes: ["Verify drill size", "Check tap style", "Reduce speed"], root_cause_check: "Examine drill size and tap before failure" },
      { symptom: "Threads strip/weak", likely_causes: ["Hole too large", "Material too soft", "Thread forming vs cutting"], quick_fixes: ["Smaller drill", "Thread insert"], root_cause_check: "Compare drill size to chart" },
      { symptom: "Galling on tap", likely_causes: ["Insufficient lubrication", "Stainless/titanium", "Speed too high"], quick_fixes: ["Better lubricant", "Reduce speed"], root_cause_check: "Use tapping oil, try coated tap" },
    ],
    pro_tips: [
      "Tap drill size matters more than anything else",
      "Form taps (roll taps) give stronger threads and last longer - but need bigger hole",
      "Thread mills are more forgiving for tough materials",
      "In CNC, rigid tapping is preferred but needs accurate spindle orientation",
      "For stainless: SLOW down, use tapping oil, consider form tap",
    ],
  },

  knurling: {
    critical_success_factors: [
      "Adequate support to resist rolling force",
      "Correct infeed for knurl pattern",
      "Material with good ductility",
      "Proper tracking for diamond pattern",
    ],
    setup_checklist: [
      "Support workpiece - knurling creates high radial force",
      "Select knurl pitch that divides evenly into circumference",
      "Use cut knurling for small parts, roll knurling for larger",
      "Verify material ductility - brittle materials don't knurl",
      "Set proper infeed per pass",
    ],
    parameter_sweet_spots: [
      { parameter: "speed", ideal_range: "30-60 m/min", why: "Moderate speed for material flow", adjustment_for_materials: { aluminum: "60-100 m/min", stainless: "20-40 m/min" } },
      { parameter: "infeed", ideal_range: "0.1-0.3mm per pass", why: "Gradual infeed for clean pattern", adjustment_for_materials: {} },
      { parameter: "feed", ideal_range: "0.5-1.5 mm/rev", why: "Helix feed for axial knurl travel", adjustment_for_materials: {} },
    ],
    common_pitfalls: [
      { mistake: "Pitch doesn't divide into circumference", consequence: "Double-track or spiral pattern", prevention: "Calculate: πD / pitch should be whole number or close", how_to_recognize: "Pattern is double-tracked or spirals" },
      { mistake: "Insufficient workholding", consequence: "Part pushed out of chuck", prevention: "Use tailstock or steady rest support", how_to_recognize: "Part moves during knurling" },
      { mistake: "Too aggressive infeed", consequence: "Material tears, poor pattern", prevention: "Multiple light passes", how_to_recognize: "Ragged pattern, torn material" },
    ],
    troubleshooting_guide: [
      { symptom: "Double-tracking", likely_causes: ["Pitch doesn't match diameter", "Knurl not tracking"], quick_fixes: ["Adjust diameter slightly", "Try different start position"], root_cause_check: "Calculate πD ÷ pitch" },
      { symptom: "Pattern tears", likely_causes: ["Too fast infeed", "Brittle material", "Dull knurl"], quick_fixes: ["Lighter infeed", "Lubrication"], root_cause_check: "Try on scrap with lighter cuts" },
      { symptom: "Knurl lifts material", likely_causes: ["Feed too high", "Cut knurl needed"], quick_fixes: ["Reduce feed", "Switch to cut knurl tool"], root_cause_check: "Observe material flow" },
    ],
    pro_tips: [
      "Calculate tracking: πD ÷ pitch = should be close to whole number",
      "For critical tracking, adjust part diameter slightly to match",
      "Cut knurls give cleaner patterns but slower",
      "Roll knurls are faster for production but less precise",
      "Self-centering scissor-type knurls reduce radial force",
    ],
  },

  facing: {
    critical_success_factors: [
      "Constant surface speed (CSS)",
      "Tool path clears center",
      "Adequate rigidity for large faces",
      "Chip control on large areas",
    ],
    setup_checklist: [
      "Enable constant surface speed (CSS/G96)",
      "Set spindle speed limits for safe operation",
      "Verify tool clears center (has clearance for centerline approach)",
      "For large faces, check power at max diameter",
      "Plan roughing passes for large stock",
    ],
    parameter_sweet_spots: [
      { parameter: "speed", ideal_range: "Same as turning, CSS mode", why: "CSS maintains optimal speed as diameter changes", adjustment_for_materials: {} },
      { parameter: "feed", ideal_range: "0.15-0.3 mm/rev roughing, 0.08-0.15 finishing", why: "Balance MRR against flatness and finish", adjustment_for_materials: {} },
      { parameter: "doc", ideal_range: "1-3mm roughing, 0.2-0.5mm finishing", why: "Normal turning values apply", adjustment_for_materials: {} },
    ],
    common_pitfalls: [
      { mistake: "No CSS - constant RPM", consequence: "Speed too low at OD or too high at center", prevention: "Always use G96 constant surface speed", how_to_recognize: "Poor finish or tool wear varies with radius" },
      { mistake: "No spindle limit", consequence: "Spindle over-speeds approaching center", prevention: "Set G50 max spindle speed", how_to_recognize: "Spindle alarm or scary noise at center" },
      { mistake: "Pip at center", consequence: "Center not faced clean", prevention: "Program past centerline by nose radius", how_to_recognize: "Nub left at center of face" },
    ],
    troubleshooting_guide: [
      { symptom: "Poor finish near center", likely_causes: ["Speed not increasing to center", "Tool deflects at reduced load"], quick_fixes: ["Verify CSS", "Program past center"], root_cause_check: "Watch speed change during facing" },
      { symptom: "Face not flat", likely_causes: ["Tool deflection", "Cross-slide wear", "Uneven stock"], quick_fixes: ["Light finishing pass", "Check gibs"], root_cause_check: "Indicate face after cut" },
      { symptom: "Chatter at large diameter", likely_causes: ["Insufficient power", "Part overhang", "Too much DOC"], quick_fixes: ["Reduce DOC", "Add support"], root_cause_check: "Listen for chatter, reduce engagement" },
    ],
    pro_tips: [
      "CSS is essential - never face at constant RPM unless part is very small",
      "Set spindle limit appropriate for smallest diameter in pass",
      "For large faces, rough in 2-3 passes, one finishing pass",
      "Face toward headstock when possible for better support",
      "Remember to program past center by at least nose radius",
    ],
  },
};

/** Difficult geometry handling knowledge */
const GEOMETRY_ADVICE: Record<DifficultGeometry, Omit<GeometryAdvice, "geometry_type">> = {
  thin_wall: {
    critical_factors: ["Wall thickness relative to diameter", "Material spring-back", "Chuck pressure deformation", "Cutting force magnitude"],
    setup_requirements: [
      "Soft jaws or collet to distribute pressure",
      "Consider mandrel support for internal turning",
      "Follower rest for external turning",
      "Minimum necessary chuck pressure",
    ],
    parameter_guidelines: [
      { parameter: "DOC", recommendation: "50% or less of normal", why: "Reduce cutting forces to prevent deformation" },
      { parameter: "Feed", recommendation: "Slightly higher than normal", why: "Get under work-hardened layer before spring-back" },
      { parameter: "Speed", recommendation: "Normal or slightly lower", why: "Balance heat generation against cycle time" },
    ],
    tooling_recommendations: [
      "Sharp positive-rake insert - minimize cutting forces",
      "Smaller nose radius - reduce radial forces",
      "Consider climb milling approach where possible",
    ],
    process_sequence: [
      "1. Machine OD features first if possible",
      "2. Support OD with soft jaws for ID operations",
      "3. Multiple light passes rather than few heavy",
      "4. Leave finishing stock for spring-pass",
      "5. Use expanding mandrel for final finishing if critical",
    ],
    quality_risks: ["Out of round from chuck pressure", "Taper from deflection", "Chatter marks from vibration"],
    expert_tips: [
      "Test chuck pressure on scrap - minimum that holds",
      "Consider machining in softer state, then heat treating",
      "For extreme cases, stress-relieve between operations",
      "ID follow OD features for best concentricity",
    ],
  },

  deep_bore: {
    critical_factors: ["Bore L/D ratio", "Chip evacuation", "Tool deflection", "Coolant delivery"],
    setup_requirements: [
      "Largest diameter boring bar that fits",
      "Anti-vibration bar for L/D > 4",
      "Through-tool coolant if available",
      "Consider pecking or interrupted cycle",
    ],
    parameter_guidelines: [
      { parameter: "DOC", recommendation: "Light - 0.5-1mm", why: "Minimize deflection in long bar" },
      { parameter: "Speed", recommendation: "70-80% of OD turning", why: "Reduced clearance traps heat" },
      { parameter: "Feed", recommendation: "Normal or slightly lower", why: "Balance MRR against deflection" },
    ],
    tooling_recommendations: [
      "Anti-vibration (damped) boring bar",
      "Carbide shank for extra stiffness",
      "Through-coolant bar for chip evacuation",
      "Smaller nose radius for less deflection",
    ],
    process_sequence: [
      "1. Drill pilot hole if possible",
      "2. Rough bore in steps, measuring deflection",
      "3. Semi-finish to check taper",
      "4. Compensate for taper in offset",
      "5. Light finishing pass for final size",
    ],
    quality_risks: ["Bore taper from deflection", "Bell-mouth at entry", "Surface finish from chip re-cutting"],
    expert_tips: [
      "Measure bore at multiple depths to quantify deflection",
      "Program taper compensation if CNC allows",
      "Bore from both ends if possible (back bore)",
      "Through-tool coolant is not optional for serious deep boring",
    ],
  },

  long_shaft: {
    critical_factors: ["Unsupported length", "Whip frequency", "Tailstock pressure", "Steady rest setup"],
    setup_requirements: [
      "Center drill both ends if possible",
      "Tailstock support is essential",
      "Steady rest for very long parts",
      "Dog driver for between-centers work",
    ],
    parameter_guidelines: [
      { parameter: "DOC", recommendation: "Light passes initially", why: "Build up cuts as support improves" },
      { parameter: "Speed", recommendation: "Avoid whip frequency", why: "Long shafts have low natural frequency" },
      { parameter: "Feed", recommendation: "Normal", why: "Feed less critical than DOC for deflection" },
    ],
    tooling_recommendations: [
      "Standard external tools adequate",
      "Use dead center (live center in tailstock)",
      "Follower rest tracks behind tool",
    ],
    process_sequence: [
      "1. Face and center drill both ends",
      "2. Mount between centers with dog",
      "3. Set up steady rest at 1/3 point if needed",
      "4. Rough with light passes",
      "5. Set follower rest for finishing",
      "6. Finish in single pass head to tail",
    ],
    quality_risks: ["Taper from tailstock thrust", "Whipping at resonance", "Marks from steady rest"],
    expert_tips: [
      "Light tailstock pressure - just enough to prevent lift",
      "Steady rest must be set carefully - too tight causes marks",
      "Consider straightening between rough and finish",
      "For very long parts, turn in segments",
    ],
  },

  interrupted_cut: {
    critical_factors: ["Impact on tool entry", "Insert grade toughness", "Workholding during impact", "Speed at impact"],
    setup_requirements: [
      "Tougher insert grade",
      "Secure workholding",
      "Verify part won't shift from impact",
    ],
    parameter_guidelines: [
      { parameter: "Speed", recommendation: "Reduce 20-30%", why: "Lower impact energy" },
      { parameter: "Feed", recommendation: "Reduce 20% at entry", why: "Gradual engagement" },
      { parameter: "DOC", recommendation: "Normal or slightly reduced", why: "Balance chip load against impact" },
    ],
    tooling_recommendations: [
      "Tougher grade insert (e.g., GC4335 vs 4325)",
      "Negative rake geometry handles impact better",
      "Larger nose radius distributes impact",
    ],
    process_sequence: [
      "1. Select tough grade insert",
      "2. Reduce feed at entry/exit",
      "3. Keep cut continuous if possible",
      "4. Monitor insert for chipping",
    ],
    quality_risks: ["Insert chipping", "Surface marks at interruption", "Dimensional variation"],
    expert_tips: [
      "Negative rake geometry is your friend",
      "Some interrupted cuts are better as milling",
      "Monitor insert closely - interrupt failure is sudden",
      "For keyways, consider hobbing or slotting",
    ],
  },

  internal_thread: {
    critical_factors: ["Bore diameter vs thread pitch", "Chip evacuation", "Tool rigidity", "Thread depth"],
    setup_requirements: [
      "Threading bar with through-coolant",
      "Correct thread form insert",
      "Adequate bore depth for thread length",
    ],
    parameter_guidelines: [
      { parameter: "Speed", recommendation: "50-70% of OD threading", why: "Reduced rigidity needs slower cuts" },
      { parameter: "Infeed", recommendation: "Lighter passes than OD", why: "Bar deflection compounds error" },
      { parameter: "Passes", recommendation: "More passes, lighter DOC", why: "Build up thread gradually" },
    ],
    tooling_recommendations: [
      "Largest bar that fits thread minor diameter",
      "Through-coolant threading bar",
      "Full profile insert if possible",
    ],
    process_sequence: [
      "1. Bore to minor diameter + relief",
      "2. Thread relief at bottom if blind hole",
      "3. Threading with modified flank infeed",
      "4. More passes than OD threading",
      "5. Thread gauge after every few parts",
    ],
    quality_risks: ["Thread taper from bar deflection", "Poor finish from chip re-cutting", "Pitch error from synchronization"],
    expert_tips: [
      "Internal threading is much harder than external - expect lower speeds",
      "Through-coolant is essential for chip evacuation",
      "Consider thread milling for large threads",
      "Gauge frequently - errors accumulate",
    ],
  },

  deep_groove: {
    critical_factors: ["Groove depth vs width", "Chip evacuation", "Coolant access", "Tool rigidity"],
    setup_requirements: [
      "High-pressure coolant aimed at groove bottom",
      "Pecking cycle programmed",
      "Correct width grooving tool",
    ],
    parameter_guidelines: [
      { parameter: "Feed", recommendation: "Light - 0.05-0.1 mm/rev", why: "Chip must evacuate narrow slot" },
      { parameter: "Peck depth", recommendation: "2x tool width max", why: "Prevent chip packing" },
      { parameter: "Speed", recommendation: "70-80% of turning", why: "Reduced coolant access" },
    ],
    tooling_recommendations: [
      "Narrow-width high-quality grooving insert",
      "Through-tool coolant holder if available",
      "Full-width insert to match groove",
    ],
    process_sequence: [
      "1. Use pecking cycle with full retract",
      "2. Each peck 2-3x tool width",
      "3. High-pressure coolant at groove",
      "4. Clear chips between pecks",
      "5. Final peck to depth with dwell for cleanup",
    ],
    quality_risks: ["Chips re-cutting floor", "Insert breakage from packing", "Taper from deflection"],
    expert_tips: [
      "High-pressure coolant can triple productivity",
      "Full retract between pecks even if slower",
      "For very deep grooves, consider different approach (wire EDM)",
      "Wider tool runs faster but wastes material",
    ],
  },

  small_diameter: {
    critical_factors: ["Material rigidity at small diameter", "Tool overhang relative to diameter", "RPM limits", "Tailstock force"],
    setup_requirements: [
      "Collet or small-jaw chuck",
      "Guide bushing if available",
      "Minimal tool overhang",
      "Light tailstock pressure",
    ],
    parameter_guidelines: [
      { parameter: "Speed", recommendation: "CSS with high RPM limit", why: "Small diameter = high RPM for surface speed" },
      { parameter: "DOC", recommendation: "Light - percentage of diameter", why: "Small parts deflect easily" },
      { parameter: "Feed", recommendation: "Normal or slightly lower", why: "Balance MRR against deflection" },
    ],
    tooling_recommendations: [
      "Small nose radius (0.2-0.4mm)",
      "Sharp positive geometry",
      "Smallest shank that's rigid enough",
    ],
    process_sequence: [
      "1. Use guide bushing or collet",
      "2. Turn from largest to smallest diameter",
      "3. Light passes on smallest sections",
      "4. Support with tailstock when possible",
      "5. Consider Swiss-style approach if available",
    ],
    quality_risks: ["Deflection causing taper", "Chatter on slender sections", "Workpiece breaking"],
    expert_tips: [
      "Turn large diameter features first for support",
      "Guide bushings dramatically improve small part turning",
      "Swiss-type lathes excel at small slender parts",
      "Consider gang tooling to reduce tool changes",
    ],
  },

  complex_profile: {
    critical_factors: ["Multiple diameter changes", "Blend radii", "Tool interference", "Feature sequence"],
    setup_requirements: [
      "Multiple tools or CNMG type for roughing",
      "Profile finishing insert with clearance",
      "Verify no interference in toolpath",
    ],
    parameter_guidelines: [
      { parameter: "Speed", recommendation: "CSS essential", why: "Multiple diameters need adaptive speed" },
      { parameter: "DOC", recommendation: "Consistent chip load", why: "Varying diameter needs varying DOC" },
      { parameter: "Feed", recommendation: "May need to vary for radii", why: "Tight radii need lower feed" },
    ],
    tooling_recommendations: [
      "CNMG style for roughing (multiple quadrants)",
      "55° or 35° insert for profile access",
      "Appropriate nose radius for smallest radius in profile",
    ],
    process_sequence: [
      "1. Plan roughing strategy - stair-step or parallel passes",
      "2. Leave consistent stock for finishing",
      "3. Verify no interference at tight radii",
      "4. Finish in continuous pass if possible",
      "5. Watch for deflection at feature transitions",
    ],
    quality_risks: ["Blend quality at radius transitions", "Interference gouging", "Varying finish on different surfaces"],
    expert_tips: [
      "Simulation is essential for complex profiles",
      "Consistent stock removal for best finish",
      "Consider form tool for repetitive profiles",
      "Breaking into segments can improve quality",
    ],
  },
};

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

export class LatheExpertAdvisorEngine {

  /**
   * Get material-specific machining strategy.
   */
  getMaterialStrategy(category: MaterialCategory): MaterialStrategy {
    log.info(`[LatheExpert] Getting strategy for material: ${category}`);

    const strategy = MATERIAL_STRATEGIES[category];
    if (!strategy) {
      throw new Error(`Unknown material category: ${category}`);
    }

    return {
      material_category: category,
      ...strategy,
    };
  }

  /**
   * Get expert guidance for difficult geometry.
   */
  getGeometryAdvice(geometry: DifficultGeometry): GeometryAdvice {
    log.info(`[LatheExpert] Getting advice for geometry: ${geometry}`);

    const advice = GEOMETRY_ADVICE[geometry];
    if (!advice) {
      throw new Error(`Unknown geometry type: ${geometry}`);
    }

    return {
      geometry_type: geometry,
      ...advice,
    };
  }

  /**
   * Get operation-specific expert tips.
   */
  getOperationExpertise(operation: LatheOperation): OperationExpertise {
    log.info(`[LatheExpert] Getting expertise for operation: ${operation}`);

    const expertise = OPERATION_EXPERTISE[operation];
    if (!expertise) {
      throw new Error(`Unknown operation: ${operation}`);
    }

    return {
      operation,
      ...expertise,
    };
  }

  /**
   * Select tooling for operation and material combination.
   */
  selectTooling(
    operation: LatheOperation,
    material: MaterialCategory,
    specificRequirements?: {
      finish_required?: "rough" | "medium" | "fine" | "mirror";
      depth_of_cut_mm?: number;
      interrupted_cut?: boolean;
      internal?: boolean;
    }
  ): ToolingSelection {
    log.info(`[LatheExpert] Selecting tooling: ${operation} on ${material}`);

    const materialStrategy = MATERIAL_STRATEGIES[material];
    const operationExpert = OPERATION_EXPERTISE[operation];

    const recommendedTools: ToolRecommendation[] = [];

    // Get primary insert recommendation from material strategy
    const primaryInsert = materialStrategy.recommended_inserts[0];

    // Determine tool type based on operation
    let toolType = "External turning tool";
    let insertStyle = "CNMG";
    let noseRadius = 0.8;

    switch (operation) {
      case "roughing":
        insertStyle = "CNMG/WNMG";
        toolType = specificRequirements?.internal ? "Boring bar" : "External turning tool";
        noseRadius = 1.2;
        break;
      case "finishing":
        insertStyle = "DNMG/VNMG";
        toolType = specificRequirements?.internal ? "Boring bar" : "External turning tool";
        noseRadius = specificRequirements?.finish_required === "mirror" ? 0.8 : 0.4;
        break;
      case "threading":
        insertStyle = "16ER/16IR";
        toolType = specificRequirements?.internal ? "Internal threading bar" : "External threading tool";
        noseRadius = 0; // Threading has no nose radius concept
        break;
      case "grooving":
        insertStyle = "N151/CoroCut";
        toolType = specificRequirements?.internal ? "Internal grooving tool" : "External grooving tool";
        noseRadius = 0.2;
        break;
      case "parting":
        insertStyle = "N151/CoroCut";
        toolType = "Parting blade";
        noseRadius = 0.1;
        break;
      case "boring":
        insertStyle = "CCMT/TCMT";
        toolType = "Boring bar";
        noseRadius = 0.4;
        break;
      default:
        insertStyle = "CNMG";
    }

    // Adjust for interrupted cuts
    if (specificRequirements?.interrupted_cut) {
      recommendedTools.push({
        tool_type: toolType,
        insert_style: insertStyle,
        grade_recommendation: "Tougher grade (e.g., GC4335)",
        geometry_code: "PR or PM (tough)",
        nose_radius_mm: noseRadius,
        why_selected: "Tougher edge to handle interrupted cutting impact",
        expected_performance: "Reduced chipping risk, slightly lower MRR",
      });
    }

    // Primary recommendation
    recommendedTools.push({
      tool_type: toolType,
      insert_style: insertStyle,
      grade_recommendation: primaryInsert.grade_family,
      geometry_code: primaryInsert.geometry,
      nose_radius_mm: noseRadius,
      why_selected: primaryInsert.why,
      expected_performance: `Optimal for ${material} ${operation}`,
    });

    // Add alternative for special materials
    if (material === "hardened_steel" && operation === "finishing") {
      recommendedTools.push({
        tool_type: "CBN insert holder",
        insert_style: "CNGA",
        grade_recommendation: "CB7025",
        geometry_code: "CNGA",
        nose_radius_mm: 0.8,
        why_selected: "CBN is optimal for hard turning >55 HRC",
        expected_performance: "Mirror finish possible, 50x life vs carbide",
      });
    }

    if (material === "aluminum" && (operation === "roughing" || operation === "finishing")) {
      recommendedTools.push({
        tool_type: toolType,
        insert_style: "CCGW",
        grade_recommendation: "CD10 (PCD)",
        geometry_code: "CCGW-PCD",
        nose_radius_mm: 0.8,
        why_selected: "PCD gives 100x tool life in aluminum",
        expected_performance: "Production volumes - highest life and speed",
      });
    }

    // Holder recommendations
    const holderRecommendations: string[] = [];
    if (specificRequirements?.internal) {
      holderRecommendations.push("Use largest bar diameter that fits");
      holderRecommendations.push("Anti-vibration bar for L/D > 4");
      holderRecommendations.push("Through-coolant holder recommended");
    } else {
      holderRecommendations.push("Standard PCLNR/PDJNR holder");
      holderRecommendations.push("25mm or 32mm shank for rigidity");
    }

    // Insert considerations
    const insertConsiderations: string[] = [
      `Coating: ${primaryInsert.coating}`,
      `Primary use case: ${primaryInsert.use_case}`,
      ...materialStrategy.tool_life_factors,
    ];

    return {
      operation,
      material,
      recommended_tools: recommendedTools,
      holder_recommendations: holderRecommendations,
      insert_considerations: insertConsiderations,
      alternatives: materialStrategy.recommended_inserts.slice(1).map(i => `${i.grade_family}: ${i.use_case}`),
    };
  }

  /**
   * Identify common pitfalls for an operation.
   */
  identifyPitfalls(
    operation: LatheOperation,
    material?: MaterialCategory
  ): Pitfall[] {
    log.info(`[LatheExpert] Identifying pitfalls for: ${operation}`);

    const operationPitfalls = OPERATION_EXPERTISE[operation]?.common_pitfalls || [];

    let materialPitfalls: Pitfall[] = [];
    if (material) {
      const materialMistakes = MATERIAL_STRATEGIES[material]?.common_mistakes || [];
      materialPitfalls = materialMistakes.map(m => ({
        mistake: m,
        consequence: "Reduced tool life or quality issues",
        prevention: "Follow material-specific guidelines",
        how_to_recognize: "Monitor tool wear and part quality",
      }));
    }

    return [...operationPitfalls, ...materialPitfalls];
  }

  /**
   * Get process optimization recommendations.
   */
  optimizeProcess(
    currentParams: {
      operation: LatheOperation;
      material: MaterialCategory;
      speed_m_min: number;
      feed_mm_rev: number;
      doc_mm: number;
    },
    goals: {
      improve_tool_life?: boolean;
      improve_finish?: boolean;
      improve_cycle_time?: boolean;
      reduce_chatter?: boolean;
    }
  ): ProcessOptimization {
    log.info(`[LatheExpert] Optimizing process for: ${currentParams.operation} on ${currentParams.material}`);

    const materialStrategy = MATERIAL_STRATEGIES[currentParams.material];
    const operationExpertise = OPERATION_EXPERTISE[currentParams.operation];

    const currentIssues: string[] = [];
    const opportunities: OptimizationOpportunity[] = [];
    const parameterRecs: ParameterRecommendation[] = [];
    const cycleTimeImprovements: CycleTimeImprovement[] = [];

    // Check speed against optimal
    const optimalSpeed = materialStrategy.cutting_speed_range.optimal;
    const speedDelta = (currentParams.speed_m_min - optimalSpeed) / optimalSpeed;

    if (speedDelta > 0.2) {
      currentIssues.push("Speed significantly above optimal - accelerated wear expected");
      parameterRecs.push({
        parameter: "cutting_speed",
        current: currentParams.speed_m_min,
        recommended: optimalSpeed,
        unit: "m/min",
        rationale: "Current speed reduces tool life significantly",
        risk_if_exceeded: "Crater wear and premature failure",
      });
    } else if (speedDelta < -0.3) {
      currentIssues.push("Speed well below optimal - leaving performance on table");
      if (goals.improve_cycle_time) {
        parameterRecs.push({
          parameter: "cutting_speed",
          current: currentParams.speed_m_min,
          recommended: optimalSpeed * 0.9,
          unit: "m/min",
          rationale: "Can safely increase speed for faster cycle",
          risk_if_exceeded: "Watch tool life as speed increases",
        });
        cycleTimeImprovements.push({
          operation: currentParams.operation,
          current_time_estimate: "Based on current speed",
          potential_savings_pct: 20,
          how_to_achieve: "Increase speed toward optimal range",
        });
      }
    }

    // Check feed
    const optimalFeed = materialStrategy.feed_range.optimal;
    if (currentParams.feed_mm_rev > materialStrategy.feed_range.max) {
      currentIssues.push("Feed exceeds recommended maximum");
      parameterRecs.push({
        parameter: "feed",
        current: currentParams.feed_mm_rev,
        recommended: materialStrategy.feed_range.max,
        unit: "mm/rev",
        rationale: "Current feed may cause chipping or poor finish",
        risk_if_exceeded: "Insert chipping, poor surface finish",
      });
    }

    if (goals.improve_finish && currentParams.feed_mm_rev > 0.15) {
      opportunities.push({
        area: "Surface finish",
        current_state: `Feed at ${currentParams.feed_mm_rev} mm/rev`,
        recommended_change: "Reduce feed to 0.1-0.15 mm/rev for finishing",
        expected_benefit: "Ra improvement proportional to f² reduction",
        implementation_difficulty: "easy",
      });
    }

    if (goals.improve_tool_life) {
      opportunities.push({
        area: "Tool life",
        current_state: "Current parameters",
        recommended_change: "Reduce speed 10-15%, maintain feed and DOC",
        expected_benefit: "Tool life typically improves 30-50% with speed reduction",
        implementation_difficulty: "easy",
      });
    }

    if (goals.reduce_chatter) {
      opportunities.push({
        area: "Chatter reduction",
        current_state: "Chatter present",
        recommended_change: "Reduce DOC 30-50%, increase feed to maintain MRR",
        expected_benefit: "Lower cutting forces below stability threshold",
        implementation_difficulty: "easy",
      });
      opportunities.push({
        area: "Chatter reduction",
        current_state: "Current speed may be at resonance",
        recommended_change: "Change speed by 15-20% up or down",
        expected_benefit: "Move away from system resonant frequency",
        implementation_difficulty: "easy",
      });
    }

    // Quality improvements
    const qualityImprovements: string[] = [];
    if (currentParams.feed_mm_rev > 0.2) {
      qualityImprovements.push("Reduce feed for finishing passes");
    }
    qualityImprovements.push("Use fresh insert edge for finishing");
    qualityImprovements.push("Verify machine is thermally stable");

    // Cost reduction
    const costReduction: string[] = [
      "Index insert at optimal wear level, not at failure",
      "Match insert grade to material for best value",
      "Consider higher productivity grades for production runs",
    ];

    return {
      current_issues: currentIssues,
      optimization_opportunities: opportunities,
      parameter_recommendations: parameterRecs,
      cycle_time_improvements: cycleTimeImprovements,
      quality_improvements: qualityImprovements,
      cost_reduction_ideas: costReduction,
    };
  }

  /**
   * Get combined expert advice for a specific scenario.
   */
  getScenarioAdvice(
    material: MaterialCategory,
    operation: LatheOperation,
    geometry?: DifficultGeometry,
    challenges?: string[]
  ): {
    material_strategy: MaterialStrategy;
    operation_expertise: OperationExpertise;
    geometry_advice?: GeometryAdvice;
    combined_recommendations: string[];
    priority_warnings: string[];
  } {
    log.info(`[LatheExpert] Getting scenario advice: ${material} ${operation} ${geometry || ""}`);

    const materialStrategy = this.getMaterialStrategy(material);
    const operationExpertise = this.getOperationExpertise(operation);
    const geometryAdvice = geometry ? this.getGeometryAdvice(geometry) : undefined;

    // Combine recommendations with priority
    const combinedRecommendations: string[] = [];
    const priorityWarnings: string[] = [];

    // Material-specific must-knows
    combinedRecommendations.push(`Material key: ${materialStrategy.coolant_strategy}`);
    materialStrategy.expert_tips.forEach(tip => combinedRecommendations.push(tip));

    // Operation critical factors
    operationExpertise.critical_success_factors.forEach(factor => {
      combinedRecommendations.push(`${operation}: ${factor}`);
    });

    // Geometry-specific if applicable
    if (geometryAdvice) {
      geometryAdvice.expert_tips.forEach(tip => combinedRecommendations.push(`${geometry}: ${tip}`));
      geometryAdvice.quality_risks.forEach(risk => priorityWarnings.push(`Risk: ${risk}`));
    }

    // Common mistakes as warnings
    materialStrategy.common_mistakes.forEach(m => priorityWarnings.push(`Avoid: ${m}`));

    return {
      material_strategy: materialStrategy,
      operation_expertise: operationExpertise,
      geometry_advice: geometryAdvice,
      combined_recommendations: combinedRecommendations,
      priority_warnings: priorityWarnings,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheExpertAdvisorEngine = new LatheExpertAdvisorEngine();
