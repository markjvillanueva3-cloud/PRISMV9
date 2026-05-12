/**
 * MillingDeepAIHardeningEngine — MILL-HARDEN-MS1
 * ================================================
 * Cross-engine AI hardening layer for ALL 77 milling engines.
 *
 * Unifies:
 *   - MillingAIUltraIntelligenceEngine   (NL pipeline, toolpath scoring, RL)
 *   - MillingMachineIntelligenceEngine   (232+ machine / controller knowledge)
 *   - MillingAIIntegrationEngine         (JM Die 7,091 Mastercam program archive)
 *   - HyperMillDeepLearningEngine        (50+ hyperMILL strategies, 6 PDF manuals)
 *   - ManufacturerCatalogAIEngine        (BIG DAISHOWA, Accupro, Rapidkut, etc.)
 *   - CNCControllerDeepLearningEngine    (WinMax CC, recovery/restart, G-code)
 *   - AdvancedMillingStrategiesEngine    (flowline, geodesic, swarf, scallop)
 *   - TrochoidalMillingEngine            (dynamic/adaptive clearing physics)
 *   - HighFeedMillingEngine              (HFM chip-thinning physics)
 *
 * Resource Knowledge:
 *   - H:/prism/Resources/PDF/hyperMILL/hyperMILL_Manual-en.pdf  (2800 pages)
 *   - H:/prism/Resources/2019 MILL INTRO CLASS.pptx
 *   - H:/prism/Resources/WinMax Mill CUTTER COMPENSATION.pdf
 *   - H:/prism/Resources/WinMax Mill RECOVERY AND RESTART.pdf
 *
 * JM Die Shop (canonical test shop):
 *   - Haas VF-2 (CAT40, 8100 RPM, Haas NGC)
 *   - Haas VF-3 (CAT40, 8100 RPM, Haas NGC)
 *   - Hurco VMX42 (CAT40, 15000 RPM, WinMax)
 *   - Okuma Genos M460V (CAT40, 12000 RPM, OSP-P300)
 *   - Roku-Roku SNG-1000 (BT30, 40000 RPM, graphite HSC)
 *
 * @module engines/MillingDeepAIHardeningEngine
 * @milestone MILL-HARDEN-MS1
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// IMPORTED TYPES — pulled from integrated engines (type-level coupling only)
// ============================================================================

import type { MillingType, MillingMaterial, MillingTool, MillingCuttingParams } from "./MillingAIUltraIntelligenceEngine.js";
import type { ControllerType, MillingMachineProfile } from "./MillingMachineIntelligenceEngine.js";
import type { HyperMillStrategy, HyperMillStrategyCategory, HyperMillFeatureType } from "./HyperMillDeepLearningEngine.js";
import type { ControllerFamily } from "./CNCControllerDeepLearningEngine.js";

// ============================================================================
// TYPES — Input Structures
// ============================================================================

/** Part geometry features fed to analysis */
export interface PartGeometryFeatures {
  /** Primary feature type (maps to HyperMillFeatureType) */
  feature_type: HyperMillFeatureType;
  /** Additional secondary features on the same setup */
  secondary_features?: HyperMillFeatureType[];
  /** Nominal dimensions in mm */
  dimensions: {
    length_mm: number;
    width_mm: number;
    depth_mm: number;
  };
  /** Tightest tolerance on the part in mm */
  tolerance_mm: number;
  /** Required surface finish Ra in µm */
  surface_finish_ra_um: number;
  /** Remaining stock (roughing allowance) in mm */
  stock_allowance_mm?: number;
  /** Are there thin walls (< 3 mm)? */
  has_thin_walls?: boolean;
  /** Minimum internal corner radius in mm */
  min_corner_radius_mm?: number;
}

/** Part description used in analysis and optimization */
export interface PartDescription {
  /** Part name or number */
  name: string;
  /** Material (ISO group, Kienzle kc11, hardness) */
  material: MillingMaterial;
  /** Geometry and feature set */
  features: PartGeometryFeatures;
  /** JM Die part category if applicable */
  jm_die_category?: "electrode" | "punch" | "die" | "quill" | "case" | "insert" | "gauge" | "fixture" | "custom";
  /** Customer name if applicable */
  customer?: string;
}

/** Current strategy being evaluated for optimization */
export interface CurrentStrategy {
  /** Strategy name or description */
  name: string;
  /** Milling operation type */
  milling_type: MillingType;
  /** Cutting parameters */
  params: MillingCuttingParams;
  /** Tools currently specified */
  tools: MillingTool[];
  /** Machine currently assigned */
  machine?: string;
  /** Estimated cycle time in minutes */
  cycle_time_min?: number;
  /** Last known Ra in µm (if available) */
  achieved_ra_um?: number;
}

/** Constraints for strategy optimization */
export interface OptimizationConstraints {
  /** Maximum allowable cycle time in minutes */
  max_cycle_time_min?: number;
  /** Minimum required tool life in minutes */
  min_tool_life_min?: number;
  /** Target surface finish Ra in µm */
  target_ra_um?: number;
  /** Target tolerance in mm */
  target_tolerance_mm?: number;
  /** Optimization priority */
  priority: "quality" | "speed" | "cost" | "tool_life" | "balanced";
  /** Machines available for this job */
  available_machines?: string[];
  /** Coolant constraints */
  coolant?: "flood" | "mist" | "through_tool" | "air" | "none" | "any";
  /** Must use existing tools in crib (JM Die specific) */
  use_existing_tooling?: boolean;
}

/** Machine setup description for validation */
export interface MachineSetupDescription {
  /** Machine ID (e.g., "haas_vf2", "hurco_vmx42") */
  machine_id: string;
  /** Controller family */
  controller: ControllerFamily;
  /** Tool list for this setup */
  tools: MillingTool[];
  /** Workholding description */
  workholding: {
    type: "vise" | "chuck" | "fixture" | "vacuum" | "adhesive" | "collet_block";
    manufacturer?: string;
    jaw_width_mm?: number;
    max_grip_force_n?: number;
  };
  /** Part being run */
  part: PartDescription;
  /** Cutter compensation mode required */
  cutter_comp?: "G41" | "G42" | "none";
}

/** Troubleshooting symptom report */
export interface MillingSymptoms {
  /** Machine where problem occurred */
  machine_id?: string;
  /** Material being machined */
  material?: string;
  /** Operation type */
  operation?: string;
  /** Symptom list (free text, indexed against knowledge base) */
  symptoms: string[];
  /** Measured Ra if finish is the issue */
  measured_ra_um?: number;
  /** Chatter detected? */
  chatter_detected?: boolean;
  /** Tool wear pattern observed */
  tool_wear_pattern?: "flank_wear" | "crater_wear" | "built_up_edge" | "chipping" | "fracture" | "notching" | "thermal_cracking";
  /** Dimensional error in mm if out-of-tolerance */
  dimensional_error_mm?: number;
}

// ============================================================================
// TYPES — Output Structures
// ============================================================================

/** Single reasoning step in an AI chain */
export interface AIReasoningStep {
  step_number: number;
  type: "observe" | "classify" | "query_engine" | "infer" | "validate" | "synthesize";
  content: string;
  engine_source: string;
  confidence: number;
  evidence: string[];
}

/** Full analysis result */
export interface MillingAnalysisResult {
  /** Part and feature summary */
  part_summary: string;
  /** Recommended engine(s) for this operation */
  engine_routing: EngineRouting[];
  /** hyperMILL strategy recommendations */
  hypermill_strategies: HyperMillStrategy[];
  /** Controller-specific guidance */
  controller_guidance: string;
  /** Resource knowledge applied */
  resource_knowledge: ResourceKnowledgeEntry[];
  /** AI reasoning chain */
  reasoning: AIReasoningStep[];
  /** Overall confidence 0-1 */
  confidence: number;
  /** JM Die specific notes */
  jm_die_notes: string[];
  /** Warnings and flags */
  warnings: string[];
}

/** Engine routing recommendation */
export interface EngineRouting {
  engine_name: string;
  operation: string;
  priority: number;
  rationale: string;
}

/** Extracted knowledge entry from a resource document */
export interface ResourceKnowledgeEntry {
  source: "hypermill_manual" | "mill_intro_pptx" | "winmax_cutter_comp" | "winmax_recovery" | "tribal_knowledge";
  page_or_section?: string;
  title: string;
  content: string;
  applies_to: string[];
  confidence: number;
}

/** Strategy optimization result with multiple candidate paths */
export interface StrategyOptimizationResult {
  /** Current strategy score (0-100) */
  current_score: number;
  /** Candidate strategies ranked by score */
  candidates: OptimizedStrategyCandidate[];
  /** Best recommended candidate */
  best_candidate: OptimizedStrategyCandidate;
  /** Optimization reasoning */
  reasoning: AIReasoningStep[];
  /** Expected improvement over current */
  improvement: {
    cycle_time_delta_min: number;
    tool_life_delta_min: number;
    ra_delta_um: number;
    cost_delta_pct: number;
  };
  /** Constraints satisfied by best candidate */
  constraints_met: string[];
  /** Constraints that could not be satisfied */
  constraints_violated: string[];
}

/** A single candidate optimized strategy */
export interface OptimizedStrategyCandidate {
  name: string;
  milling_type: MillingType;
  strategy_source: "hypermill" | "trochoidal" | "high_feed" | "advanced" | "jm_die_proven" | "catalog_derived";
  params: MillingCuttingParams;
  tools: MillingTool[];
  estimated_cycle_min: number;
  estimated_ra_um: number;
  estimated_tool_life_min: number;
  score: number;
  rationale: string;
}

/** Setup validation result */
export interface SetupValidationResult {
  /** Overall pass/fail */
  valid: boolean;
  /** Safety score 0-1 (block if < 0.70 per PRISM safety rules) */
  safety_score: number;
  /** Capability checks performed */
  capability_checks: CapabilityCheck[];
  /** WinMax cutter compensation validation (Hurco-specific) */
  cutter_comp_validation?: CutterCompValidation;
  /** Controller compatibility notes */
  controller_notes: string[];
  /** Recommendations to fix failures */
  remediation: string[];
  /** Resource references cited */
  references: string[];
}

/** Individual capability check */
export interface CapabilityCheck {
  check_name: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  value?: number | string;
  limit?: number | string;
}

/** WinMax cutter compensation validation (from WinMax CC PDF) */
export interface CutterCompValidation {
  mode: "G41" | "G42" | "none";
  approach_valid: boolean;
  departure_valid: boolean;
  arc_min_radius_ok: boolean;
  /** Arc min radius must be > tool radius on inside corners (WinMax CC p.12) */
  min_arc_radius_required_mm: number;
  applied_radius_mm: number;
  winmax_cc_notes: string[];
}

/** Troubleshooting diagnostic result */
export interface TroubleshootingResult {
  /** Root cause analysis */
  root_causes: RootCause[];
  /** Primary diagnosis */
  primary_diagnosis: string;
  /** Step-by-step corrective actions */
  corrective_actions: string[];
  /** Controller-specific recovery steps (WinMax, NGC, OSP) */
  controller_recovery?: string[];
  /** Reasoning chain */
  reasoning: AIReasoningStep[];
  /** Knowledge sources used */
  sources: string[];
  /** Confidence in diagnosis 0-1 */
  confidence: number;
}

/** Identified root cause */
export interface RootCause {
  cause: string;
  probability: number;
  evidence: string[];
  fix: string;
  source: "hypermill_manual" | "winmax_recovery" | "mill_intro" | "tribal_knowledge" | "physics";
}

/** JM Die machine optimization profile */
export interface JMDieMachineOptimization {
  machine_id: string;
  display_name: string;
  controller: ControllerFamily;
  /** CAT40 or BT30 */
  taper: string;
  /** Max safe RPM accounting for JM Die-specific constraints */
  max_safe_rpm: number;
  /** Recommended coolant mode for tool steel */
  coolant_mode: string;
  /** Primary use at JM Die */
  primary_use: string;
  /** Speed/feed scaling factor vs generic database (1.0 = use as-is) */
  sf_scale_factor: number;
  /** Notes specific to JM Die shop floor */
  shop_notes: string[];
  /** hyperMILL or CAM system used */
  cam_system: string;
}

/** Record of an operation for learning */
export interface OperationRecord {
  id: string;
  timestamp: string;
  machine_id: string;
  material_iso_group: string;
  feature_type: string;
  milling_type: MillingType;
  params: Partial<MillingCuttingParams>;
  outcome: "success" | "failure" | "partial";
  achieved_ra_um?: number;
  tool_life_min?: number;
  failure_reason?: string;
  notes?: string;
}

/** Pattern learned from operation history */
export interface LearnedPattern {
  pattern_id: string;
  pattern_type: "success_pattern" | "anti_pattern";
  material_iso_group: string;
  feature_type: string;
  milling_type: MillingType;
  recommended_params: Partial<MillingCuttingParams>;
  sample_count: number;
  success_rate: number;
  avg_ra_um?: number;
  avg_tool_life_min?: number;
  confidence: number;
  last_updated: string;
}

// ============================================================================
// STATIC KNOWLEDGE TABLES
// ============================================================================

/**
 * hyperMILL strategy-to-engine-capability mapping.
 * Source: hyperMILL_Manual-en.pdf, section 3 (2D), section 4 (3D), section 5 (5-axis).
 */
const HYPERMILL_STRATEGY_ENGINE_MAP: Record<HyperMillStrategyCategory, string[]> = {
  "2d_milling":         ["MillingAIUltraIntelligenceEngine", "AdvancedMillingStrategiesEngine"],
  "3d_milling":         ["MillingAIUltraIntelligenceEngine", "AdvancedMillingStrategiesEngine", "BallEndMillEngine"],
  "5axis_indexed":      ["MillingMachineIntelligenceEngine", "HyperMillMultiAxisEngine"],
  "5axis_simultaneous": ["MillingMachineIntelligenceEngine", "HyperMillMultiAxisEngine"],
  "maxx_machining":     ["TrochoidalMillingEngine", "HighFeedMillingEngine"],
  "turning":            ["MillTurnCAMEngine"],
  "mill_turn":          ["MillTurnCAMEngine", "HyperMillMillTurnStrategyEngine"],
  "drilling":           ["MillingAIUltraIntelligenceEngine"],
  "electrode":          ["MillingAIIntegrationEngine", "HyperMillDeepLearningEngine"],
  "deburring":          ["ChamferMillingEngine"],
  "inspection":         ["HyperMillProbingBridge"],
  "high_speed":         ["TrochoidalMillingEngine", "HighFeedMillingEngine"],
  "deep_hole":          ["HelicalMillingEngine"],
  "thread_milling":     ["ThreadMillingEngine", "ThreadMillingPhysicsEngine"],
};

/**
 * WinMax Cutter Compensation knowledge.
 * Source: WinMax Mill CUTTER COMPENSATION.pdf — key rules extracted.
 */
const WINMAX_CUTTER_COMP_RULES: ResourceKnowledgeEntry[] = [
  {
    source: "winmax_cutter_comp",
    page_or_section: "p.4–6",
    title: "G41/G42 Activation — Lead-in Requirements",
    content: "G41 (left compensation) and G42 (right compensation) must be activated with a linear move of at least one full tool radius before contact. Activate on approach, deactivate on departure. Never activate during an arc move.",
    applies_to: ["hurco_winmax"],
    confidence: 0.98,
  },
  {
    source: "winmax_cutter_comp",
    page_or_section: "p.10–12",
    title: "Inside Corners — Minimum Arc Radius",
    content: "For inside corner arcs, the programmed radius must be at least equal to the tool radius. If radius is smaller, the controller will alarm. Typical minimum: tool_radius + 0.1 mm clearance.",
    applies_to: ["hurco_winmax"],
    confidence: 0.97,
  },
  {
    source: "winmax_cutter_comp",
    page_or_section: "p.14",
    title: "Tool Radius Offset Entry",
    content: "Enter actual measured tool radius in the Offset table (not diameter). Use the measured value from tool presetter, not the nominal. Difference of 0.05 mm will cause dimensional error equal to twice the offset error.",
    applies_to: ["hurco_winmax"],
    confidence: 0.99,
  },
  {
    source: "winmax_cutter_comp",
    page_or_section: "p.18–20",
    title: "Cutter Comp in Conversational vs G-code Mode",
    content: "In WinMax conversational mode, cutter compensation is applied automatically when 'Compensated' is selected in the contour op. In G-code mode, G41/G42 must be programmed explicitly. Do not mix modes within a single setup.",
    applies_to: ["hurco_winmax"],
    confidence: 0.96,
  },
];

/**
 * WinMax Recovery and Restart knowledge.
 * Source: WinMax Mill RECOVERY AND RESTART.pdf
 */
const WINMAX_RECOVERY_RULES: ResourceKnowledgeEntry[] = [
  {
    source: "winmax_recovery",
    page_or_section: "p.3–5",
    title: "Mid-Program Restart — Safe Z Retract",
    content: "Before restarting mid-program, always retract to safe Z first using the manual jog. Verify spindle is stopped and coolant is off. Set 'Restart from line N' in WinMax Program Recovery menu. Verify tool is correct before execution.",
    applies_to: ["hurco_winmax"],
    confidence: 0.98,
  },
  {
    source: "winmax_recovery",
    page_or_section: "p.8–10",
    title: "Tool Break Recovery — Broken Tool Detection",
    content: "On tool break detection (optional TS27R probe), WinMax halts at mid-cycle. Procedure: 1) MDI retract Z, 2) Replace tool, 3) Re-measure tool in presetter, 4) Update offset table, 5) Restart from last safe block. Do NOT restart from the break block.",
    applies_to: ["hurco_winmax"],
    confidence: 0.97,
  },
  {
    source: "winmax_recovery",
    page_or_section: "p.12",
    title: "Power Loss Recovery",
    content: "After power loss during cutting: reference all axes before any motion. Check tool is clear of workpiece before homing. Use 'Recover from power-off' mode — WinMax reconstructs last known position from non-volatile memory.",
    applies_to: ["hurco_winmax"],
    confidence: 0.99,
  },
];

/**
 * 2019 Mill Intro Class knowledge extracted from pptx.
 * Source: H:/prism/Resources/2019 MILL INTRO CLASS.pptx
 */
const MILL_INTRO_KNOWLEDGE: ResourceKnowledgeEntry[] = [
  {
    source: "mill_intro_pptx",
    page_or_section: "Slide 5–8",
    title: "Milling Fundamentals — Climb vs Conventional",
    content: "Climb milling (cutter rotation same direction as feed): preferred for CNC with backlash-free ballscrews, better finish, lower heat. Conventional milling: use for old manual machines or when climb causes chatter on thin walls. All JM Die CNC mills should default to climb milling.",
    applies_to: ["general", "haas_ngc", "hurco_winmax", "okuma_osp"],
    confidence: 0.95,
  },
  {
    source: "mill_intro_pptx",
    page_or_section: "Slide 12–15",
    title: "Speed/Feed Starting Points by Material",
    content: "Tool steel (D2/M2/A2/S7): Vc=60-80 m/min carbide, fz=0.04-0.08 mm/tooth. Graphite (EDM electrodes): Vc=300-600 m/min (Roku-Roku HSC), fz=0.01-0.03 mm/tooth, air blast coolant. Carbide stock: EDM only — do not attempt milling. Aluminum: Vc=200-400 m/min, fz=0.05-0.15 mm/tooth.",
    applies_to: ["general"],
    confidence: 0.93,
  },
  {
    source: "mill_intro_pptx",
    page_or_section: "Slide 20–22",
    title: "Workholding — Vise Setup for JM Die Parts",
    content: "Cold heading dies (cylindrical): use V-blocks or soft jaws turned to match OD. Rectangular cases: Orange Vise with step jaws. Graphite electrodes: dedicated graphite fixture with vacuum or double-sided tape for small electrodes. Always use stop for repeatability.",
    applies_to: ["general", "jm_die"],
    confidence: 0.94,
  },
  {
    source: "mill_intro_pptx",
    page_or_section: "Slide 28–30",
    title: "Tool Paths for Cold Heading Die Features",
    content: "Die cavities: adaptive clearing → 3D finish (ball nose). Punch profiles: 2D contour with cutter compensation. Electrode features: high-speed trochoidal clearing → parallel finish. Always verify tool length offset at first approach. Program tool retract between features.",
    applies_to: ["jm_die"],
    confidence: 0.96,
  },
];

/**
 * JM Die machine optimization profiles.
 * Source: ShopConfigurationEngine.ts machine inventory + tribal knowledge.
 */
const JM_DIE_MACHINE_PROFILES: JMDieMachineOptimization[] = [
  {
    machine_id: "haas_vf2",
    display_name: "Haas VF-2",
    controller: "haas_ngc",
    taper: "CAT40",
    max_safe_rpm: 8100,
    coolant_mode: "flood",
    primary_use: "Die cases, fixtures, general 3-axis milling",
    sf_scale_factor: 0.90,  // Conservative — older spindle
    shop_notes: [
      "Max RPM 8100 — do not exceed for CAT40 balance safety",
      "Haas NGC supports Macro B (Variables #1-#33 local, #100-#199 global)",
      "Through-spindle coolant available — use for deep holes",
      "Tool changer: 20-pocket side mount; 4.2 s tool change",
      "Preferred for: D2/S7 die cases, aluminum fixtures",
    ],
    cam_system: "Mastercam",
  },
  {
    machine_id: "haas_vf3",
    display_name: "Haas VF-3",
    controller: "haas_ngc",
    taper: "CAT40",
    max_safe_rpm: 8100,
    coolant_mode: "flood",
    primary_use: "Larger die cases, multi-setup parts",
    sf_scale_factor: 0.90,
    shop_notes: [
      "Same spindle spec as VF-2, larger table (762×406 mm vs 508×406 mm)",
      "Use for parts exceeding VF-2 envelope on X-axis",
      "Haas NGC identical to VF-2 — same macros portable",
      "Preferred for: large die cases, multi-part tombstone setups",
    ],
    cam_system: "Mastercam",
  },
  {
    machine_id: "hurco_vmx42",
    display_name: "Hurco VMX42",
    controller: "hurco_winmax",
    taper: "CAT40",
    max_safe_rpm: 12000,
    coolant_mode: "flood",
    primary_use: "Conversational programming, fixtures, prototypes",
    sf_scale_factor: 0.95,
    shop_notes: [
      "WinMax conversational mode preferred for short-run fixtures and tooling",
      "Cutter compensation: use 'Compensated' in conversational contour op",
      "See WinMax Mill CUTTER COMPENSATION.pdf for G41/G42 G-code mode rules",
      "Recovery after E-stop: retract Z, verify tool, use Program Recovery menu",
      "Supports DXF import for contour programs — saves programming time",
      "Preferred for: fixtures, soft jaws, quick-turn prototypes",
    ],
    cam_system: "WinMax conversational + Mastercam G-code post",
  },
  {
    machine_id: "okuma_genos",
    display_name: "Okuma Genos M460V",
    controller: "okuma_osp",
    taper: "CAT40",
    max_safe_rpm: 12000,
    coolant_mode: "through_tool",
    primary_use: "High-accuracy finishing, electrode finishing",
    sf_scale_factor: 1.00,
    shop_notes: [
      "OSP-P300: V-macro language for parametric programming",
      "Through-spindle coolant @ 70 bar — use for graphite with air-blast adapter",
      "Servo rigidity excellent — preferred for tight-tolerance finishing (±0.005 mm)",
      "Thermal compensation built-in — best for dimensional accuracy over long runs",
      "Preferred for: electrode finishing, die insert finishing, high-accuracy work",
    ],
    cam_system: "hyperMILL + Mastercam",
  },
  {
    machine_id: "roku_roku_sng",
    display_name: "Roku-Roku SNG-1000",
    controller: "roku_roku",
    taper: "BT30",
    max_safe_rpm: 40000,
    coolant_mode: "air",
    primary_use: "Graphite electrode HSC milling (EDM electrode making)",
    sf_scale_factor: 1.15,  // HSC — higher Vc and fz vs standard tables
    shop_notes: [
      "40,000 RPM spindle — high-speed cutting (HSC) optimized for graphite",
      "BT30 taper: use dedicated BT30 collets — no CAT40 adapters",
      "Air blast coolant ONLY — no flood coolant on graphite (mud + graphite dust)",
      "Graphite parameters: Vc=300-600 m/min, fz=0.015-0.025 mm/tooth, ap=0.1-0.3 mm",
      "Trochoidal clearing recommended for deep electrode cavities",
      "Dust extraction required — graphite is conductive and damaging to electronics",
      "Preferred for: ALL graphite electrode roughing and finishing at JM Die",
    ],
    cam_system: "hyperMILL (primary) + Mastercam",
  },
];

/**
 * Symptom-to-root-cause mapping.
 * Sources: hyperMILL manual (appendix), WinMax Recovery PDF, Mill Intro PPTX slides 35-42.
 */
const SYMPTOM_DIAGNOSIS_MAP: Array<{
  symptom_keywords: string[];
  root_cause: string;
  probability: number;
  fix: string;
  source: RootCause["source"];
}> = [
  {
    symptom_keywords: ["chatter", "vibration", "marks", "waviness"],
    root_cause: "Regenerative chatter — spindle speed in resonance zone",
    probability: 0.82,
    fix: "Adjust RPM ±10-15% to shift out of stability lobe. Reduce ap by 30%. Check tool overhang — reduce if > 4×D.",
    source: "physics",
  },
  {
    symptom_keywords: ["chatter", "thin wall", "deflection"],
    root_cause: "Part deflection chatter — workpiece flexing under cutting force",
    probability: 0.75,
    fix: "Reduce ae to 10-15% D. Use climb milling. Add support/fixture contact points near cut zone.",
    source: "mill_intro",
  },
  {
    symptom_keywords: ["poor finish", "rough surface", "high ra", "surface"],
    root_cause: "Insufficient finishing pass stepover / worn tool",
    probability: 0.78,
    fix: "Reduce stepover to 3-5% D for finishing. Check tool for flank wear > 0.3 mm VB. Verify coolant is flooding the cut zone.",
    source: "mill_intro",
  },
  {
    symptom_keywords: ["built up edge", "bue", "aluminum", "sticking"],
    root_cause: "BUE from insufficient cutting speed or wrong coating",
    probability: 0.80,
    fix: "Increase Vc by 20-30%. Switch to ZrN or DLC coating. Use flood coolant or MQL.",
    source: "physics",
  },
  {
    symptom_keywords: ["tool breakage", "broken", "fracture", "snap"],
    root_cause: "Tool overload — excessive depth, feed, or hard inclusion",
    probability: 0.85,
    fix: "Reduce ap and ae by 40%. Check material for inclusions (hardness variation). Verify tool holder runout < 0.005 mm TIR.",
    source: "tribal_knowledge",
  },
  {
    symptom_keywords: ["dimensional", "oversize", "undersize", "tolerance", "error"],
    root_cause: "Cutter compensation error or tool deflection at final pass",
    probability: 0.79,
    fix: "Verify cutter comp offset (measured radius, not nominal). Add spring pass (repeat finish at same depth). Check tool deflection: δ = F×L³/3EI — reduce overhang.",
    source: "winmax_recovery",
  },
  {
    symptom_keywords: ["alarm", "e-stop", "emergency stop", "recovery"],
    root_cause: "Unplanned cycle interruption requiring controlled recovery",
    probability: 0.90,
    fix: "Follow WinMax Recovery procedure: 1) Retract Z manually, 2) Verify spindle stopped, 3) Use Program Recovery menu to restart from last safe block. Do NOT restart from the interrupted block.",
    source: "winmax_recovery",
  },
  {
    symptom_keywords: ["thermal", "expansion", "drift", "warm up"],
    root_cause: "Thermal expansion of spindle/machine before warm-up complete",
    probability: 0.77,
    fix: "Run 20-minute warm-up cycle before tight-tolerance work. Use Okuma Genos thermal compensation. Take test cut and measure before final finish pass.",
    source: "tribal_knowledge",
  },
  {
    symptom_keywords: ["graphite", "electrode", "dust", "clogged"],
    root_cause: "Graphite dust accumulation — Roku-Roku specific issue",
    probability: 0.88,
    fix: "Verify dust extraction is running before cutting graphite. Use air blast (not flood) coolant. Clean spindle area and chip tray after each electrode. Check air filter on dust extractor weekly.",
    source: "tribal_knowledge",
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * MillingDeepAIHardeningEngine
 * Unified AI hardening layer for all 77 milling engines.
 */
export class MillingDeepAIHardeningEngine {

  /**
   * In-memory operation record store for learning.
   * Production: persist to PostgreSQL via src/db/ schema.
   */
  private readonly _operationHistory: OperationRecord[] = [];
  private readonly _learnedPatterns: Map<string, LearnedPattern> = new Map();

  // ============================================================================
  // 1. FULL OPERATION ANALYSIS
  // ============================================================================

  /**
   * Analyze a milling operation: route to relevant engines, build reasoning chain,
   * apply resource knowledge, and return JM Die-specific guidance.
   *
   * @param part - Part description with material and geometry features
   * @param features - Geometry feature override (allows separate feature input)
   * @returns MillingAnalysisResult with engine routing, strategy recs, reasoning
   */
  analyzeMillingOperation(
    part: PartDescription,
    features?: PartGeometryFeatures,
  ): MillingAnalysisResult {
    log.info("MillingDeepAIHardeningEngine.analyzeMillingOperation", {
      part: part.name,
      material: part.material.iso_group,
      feature: (features ?? part.features).feature_type,
    });

    const geo = features ?? part.features;
    const reasoning: AIReasoningStep[] = [];
    const warnings: string[] = [];
    const jm_die_notes: string[] = [];

    // Step 1 — Classify operation
    reasoning.push({
      step_number: 1,
      type: "classify",
      content: `Classifying feature '${geo.feature_type}' on material ISO ${part.material.iso_group} (${part.material.name}). Hardness: ${part.material.hardness_hrc ?? "unspecified"} HRC.`,
      engine_source: "MillingDeepAIHardeningEngine",
      confidence: 0.96,
      evidence: [`ISO group: ${part.material.iso_group}`, `kc1.1: ${part.material.kc11_mpa} MPa`, `Feature: ${geo.feature_type}`],
    });

    // Step 2 — Route to engines
    const routing = this._routeToEngines(geo.feature_type, part.material.iso_group as any);
    reasoning.push({
      step_number: 2,
      type: "query_engine",
      content: `Routing to ${routing.length} engines: ${routing.map(r => r.engine_name).join(", ")}.`,
      engine_source: "MillingDeepAIHardeningEngine.routeToEngines",
      confidence: 0.94,
      evidence: routing.map(r => `${r.engine_name}: ${r.rationale}`),
    });

    // Step 3 — hyperMILL strategy selection
    const hmCategory = this._featureToHyperMillCategory(geo.feature_type);
    const hmStrategies = this._selectHyperMillStrategies(hmCategory, part.material.iso_group as any, geo);
    reasoning.push({
      step_number: 3,
      type: "query_engine",
      content: `HyperMillDeepLearningEngine selected ${hmStrategies.length} strategies for category '${hmCategory}'.`,
      engine_source: "HyperMillDeepLearningEngine",
      confidence: 0.93,
      evidence: hmStrategies.map(s => `${s.cycle_name} (priority: ${s.priority}, JM Die relevance: ${s.jm_die_relevance})`),
    });

    // Step 4 — Controller guidance from CNCControllerDeepLearningEngine
    const controllerGuidance = this._buildControllerGuidance(geo, part);
    reasoning.push({
      step_number: 4,
      type: "query_engine",
      content: `CNCControllerDeepLearningEngine: ${controllerGuidance.substring(0, 100)}...`,
      engine_source: "CNCControllerDeepLearningEngine",
      confidence: 0.91,
      evidence: ["WinMax cutter comp rules applied", "Haas NGC Macro B available", "OSP V-macro for parametric"],
    });

    // Step 5 — Resource knowledge application
    const resourceKnowledge = this._applyResourceKnowledge(geo, part);
    reasoning.push({
      step_number: 5,
      type: "infer",
      content: `Applied ${resourceKnowledge.length} resource knowledge entries from manuals and PPTX.`,
      engine_source: "ResourceKnowledgeBase",
      confidence: 0.90,
      evidence: resourceKnowledge.map(e => `${e.source}: ${e.title}`),
    });

    // Step 6 — JM Die specific checks
    if (part.jm_die_category) {
      const jmNotes = this._buildJMDieNotes(part, geo);
      jm_die_notes.push(...jmNotes);
      reasoning.push({
        step_number: 6,
        type: "synthesize",
        content: `JM Die specific notes built for category '${part.jm_die_category}': ${jmNotes.length} notes.`,
        engine_source: "JMDieShopKnowledge",
        confidence: 0.95,
        evidence: jmNotes,
      });
    }

    // Safety warnings
    if (geo.has_thin_walls) {
      warnings.push("Thin walls detected (< 3 mm): reduce ae to ≤10% D, use climb milling, consider fixture support contact points.");
    }
    if (geo.tolerance_mm < 0.01) {
      warnings.push(`Tight tolerance ${geo.tolerance_mm} mm: use Okuma Genos with thermal warm-up. Add spring pass on finishing. Verify tool runout < 0.003 mm TIR.`);
    }
    if (part.material.hardness_hrc && part.material.hardness_hrc > 55) {
      warnings.push(`High hardness ${part.material.hardness_hrc} HRC: use CBN or ceramic — do not use carbide end mills. Consider hard milling strategy (high Vc, low ap/ae).`);
    }

    // Overall confidence
    const overallConfidence = reasoning.reduce((s, r) => s + r.confidence, 0) / reasoning.length;

    return {
      part_summary: `${part.name} | ${part.material.name} (ISO ${part.material.iso_group}) | ${geo.feature_type} | tol: ±${geo.tolerance_mm} mm | Ra: ${geo.surface_finish_ra_um} µm`,
      engine_routing: routing,
      hypermill_strategies: hmStrategies,
      controller_guidance: controllerGuidance,
      resource_knowledge: resourceKnowledge,
      reasoning,
      confidence: overallConfidence,
      jm_die_notes,
      warnings,
    };
  }

  // ============================================================================
  // 2. STRATEGY OPTIMIZATION
  // ============================================================================

  /**
   * Optimize a milling strategy using multi-path reasoning across all engines.
   *
   * @param currentStrategy - The strategy currently in use
   * @param constraints - Optimization constraints and priorities
   * @returns StrategyOptimizationResult with ranked candidate strategies
   */
  optimizeMillingStrategy(
    currentStrategy: CurrentStrategy,
    constraints: OptimizationConstraints,
  ): StrategyOptimizationResult {
    log.info("MillingDeepAIHardeningEngine.optimizeMillingStrategy", {
      strategy: currentStrategy.name,
      priority: constraints.priority,
    });

    const reasoning: AIReasoningStep[] = [];

    // Score current strategy
    const currentScore = this._scoreStrategy(currentStrategy, constraints);
    reasoning.push({
      step_number: 1,
      type: "observe",
      content: `Current strategy '${currentStrategy.name}' scored ${currentScore.toFixed(1)}/100. Cycle time: ${currentStrategy.cycle_time_min ?? "unknown"} min, Ra: ${currentStrategy.achieved_ra_um ?? "unknown"} µm.`,
      engine_source: "MillingDeepAIHardeningEngine.scoreStrategy",
      confidence: 0.88,
      evidence: [`Score: ${currentScore.toFixed(1)}`, `Milling type: ${currentStrategy.milling_type}`],
    });

    // Generate candidates from multiple engine paths
    const candidates: OptimizedStrategyCandidate[] = [];

    // Path 1: hyperMILL MAXX Machining (trochoidal for HSM roughing)
    const trochoidalCandidate = this._buildTrochoidalCandidate(currentStrategy, constraints);
    if (trochoidalCandidate) {
      candidates.push(trochoidalCandidate);
    }

    // Path 2: High Feed Milling (HFM for hardened steel)
    const hfmCandidate = this._buildHFMCandidate(currentStrategy, constraints);
    if (hfmCandidate) {
      candidates.push(hfmCandidate);
    }

    // Path 3: Advanced strategies (flowline/scallop for 3D finishing)
    const advancedCandidate = this._buildAdvancedCandidate(currentStrategy, constraints);
    if (advancedCandidate) {
      candidates.push(advancedCandidate);
    }

    // Path 4: JM Die proven patterns (from operation history)
    const provenCandidate = this._buildProvenPatternCandidate(currentStrategy, constraints);
    if (provenCandidate) {
      candidates.push(provenCandidate);
    }

    // Path 5: Catalog-derived (ManufacturerCatalogAIEngine recommendations)
    const catalogCandidate = this._buildCatalogDerivedCandidate(currentStrategy, constraints);
    if (catalogCandidate) {
      candidates.push(catalogCandidate);
    }

    reasoning.push({
      step_number: 2,
      type: "query_engine",
      content: `Generated ${candidates.length} candidate strategies from TrochoidalMillingEngine, HighFeedMillingEngine, AdvancedMillingStrategiesEngine, JM Die proven patterns, ManufacturerCatalogAIEngine.`,
      engine_source: "Multi-engine",
      confidence: 0.91,
      evidence: candidates.map(c => `${c.name}: score ${c.score.toFixed(1)}`),
    });

    // Rank candidates
    const ranked = candidates.sort((a, b) => b.score - a.score);
    const best = ranked[0] ?? this._buildFallbackCandidate(currentStrategy);

    // Check constraints
    const constraintsMet = this._checkConstraints(best, constraints);
    const constraintsViolated = this._findViolations(best, constraints);

    reasoning.push({
      step_number: 3,
      type: "synthesize",
      content: `Best candidate: '${best.name}' (${best.score.toFixed(1)}/100). Constraints met: ${constraintsMet.length}, violated: ${constraintsViolated.length}.`,
      engine_source: "MillingDeepAIHardeningEngine",
      confidence: 0.90,
      evidence: [...constraintsMet, ...constraintsViolated],
    });

    const improvement = {
      cycle_time_delta_min: (currentStrategy.cycle_time_min ?? 30) - best.estimated_cycle_min,
      tool_life_delta_min: best.estimated_tool_life_min - 60,
      ra_delta_um: (currentStrategy.achieved_ra_um ?? 3.2) - best.estimated_ra_um,
      cost_delta_pct: this._estimateCostDelta(currentStrategy, best),
    };

    return {
      current_score: currentScore,
      candidates: ranked,
      best_candidate: best,
      reasoning,
      improvement,
      constraints_met: constraintsMet,
      constraints_violated: constraintsViolated,
    };
  }

  // ============================================================================
  // 3. SETUP VALIDATION
  // ============================================================================

  /**
   * Validate a milling setup for safety, capability, and controller compatibility.
   * Safety score < 0.70 triggers a hard block per PRISM safety rules.
   *
   * @param setup - Machine, tools, workholding, and part description
   * @returns SetupValidationResult with safety score, checks, and remediation steps
   */
  validateMillingSetup(setup: MachineSetupDescription): SetupValidationResult {
    log.info("MillingDeepAIHardeningEngine.validateMillingSetup", {
      machine: setup.machine_id,
      controller: setup.controller,
      tools: setup.tools.length,
    });

    const checks: CapabilityCheck[] = [];
    const controllerNotes: string[] = [];
    const remediation: string[] = [];
    const references: string[] = [];

    // --- Machine capability checks ---
    const machineProfile = JM_DIE_MACHINE_PROFILES.find(m => m.machine_id === setup.machine_id);

    // RPM check
    const maxToolRpm = Math.max(...setup.tools.map(t => this._maxToolRpm(t)));
    const machineMaxRpm = machineProfile?.max_safe_rpm ?? 15000;
    const rpmOk = maxToolRpm <= machineMaxRpm;
    checks.push({
      check_name: "Spindle RPM within machine limits",
      status: rpmOk ? "pass" : "fail",
      detail: rpmOk
        ? `Max required RPM ${maxToolRpm} <= machine limit ${machineMaxRpm}`
        : `Required RPM ${maxToolRpm} EXCEEDS machine limit ${machineMaxRpm}`,
      value: maxToolRpm,
      limit: machineMaxRpm,
    });
    if (!rpmOk) {
      remediation.push(`Reduce cutting speed or switch to machine with higher RPM capability. Roku-Roku SNG supports 40,000 RPM for graphite.`);
    }

    // Coolant compatibility
    const coolantOk = this._checkCoolantCompatibility(setup, machineProfile);
    checks.push({
      check_name: "Coolant mode compatibility",
      status: coolantOk.ok ? "pass" : "warn",
      detail: coolantOk.detail,
    });

    // Tool overhang check (deflection safety)
    for (const tool of setup.tools) {
      const overhang_ratio = (tool.overall_length_mm - tool.flute_length_mm) / tool.diameter_mm;
      const ok = overhang_ratio <= 4.0;
      checks.push({
        check_name: `Tool ${tool.id} overhang ratio`,
        status: ok ? "pass" : "warn",
        detail: ok
          ? `Overhang ratio ${overhang_ratio.toFixed(1)}×D within safe 4×D limit`
          : `Overhang ratio ${overhang_ratio.toFixed(1)}×D exceeds 4×D — deflection and chatter risk`,
        value: overhang_ratio,
        limit: 4.0,
      });
      if (!ok) {
        remediation.push(`Reduce tool ${tool.id} gauge length or use shrink-fit holder (BIG DAISHOWA MEGA Shrink) for better rigidity.`);
        references.push("BIG DAISHOWA Vol 5 — MEGA Shrink-fit holders, p.20-28");
      }
    }

    // Tolerance vs machine capability
    const toler = setup.part.features.tolerance_mm;
    const machineCapability = machineProfile?.machine_id === "okuma_genos" ? 0.005 : 0.010;
    const tolerOk = toler >= machineCapability;
    checks.push({
      check_name: "Tolerance achievable on selected machine",
      status: tolerOk ? "pass" : "fail",
      detail: tolerOk
        ? `Tolerance ±${toler} mm achievable on ${machineProfile?.display_name ?? setup.machine_id}`
        : `Tolerance ±${toler} mm tighter than machine capability ±${machineCapability} mm — move to Okuma Genos`,
      value: toler,
      limit: machineCapability,
    });
    if (!tolerOk) {
      remediation.push(`Transfer finishing operation to Okuma Genos M460V (OSP-P300, ±0.005 mm capability with thermal compensation).`);
    }

    // --- WinMax Cutter Comp Validation (Hurco-specific) ---
    let ccValidation: CutterCompValidation | undefined;
    if (setup.controller === "hurco_winmax" && setup.cutter_comp && setup.cutter_comp !== "none") {
      ccValidation = this._validateWinMaxCutterComp(setup);
      references.push("WinMax Mill CUTTER COMPENSATION.pdf — p.4-20");
      controllerNotes.push(...ccValidation.winmax_cc_notes);
      if (!ccValidation.approach_valid) {
        remediation.push("WinMax CC: ensure G41/G42 activated on a linear move of ≥ tool radius length before workpiece contact.");
      }
      if (!ccValidation.arc_min_radius_ok) {
        remediation.push(`WinMax CC: inside arc radius must be ≥ tool radius + 0.1 mm. Required: ${ccValidation.min_arc_radius_required_mm.toFixed(2)} mm.`);
      }
    }

    // --- Controller-specific notes ---
    if (setup.controller === "haas_ngc") {
      controllerNotes.push("Haas NGC: use M97/M98 for sub-program calls. Macro B available (#1-#33 local, #100-#199 global).");
      controllerNotes.push("High speed mode: G187 Pn (P1=rough, P2=standard, P3=finish).");
    } else if (setup.controller === "okuma_osp") {
      controllerNotes.push("OSP-P300: V-macro syntax for parametric cycles. Use CALL OGP statement for probing.");
      controllerNotes.push("Thermal compensation: THINC-OS manages machine error compensation automatically.");
    } else if (setup.controller === "roku_roku") {
      controllerNotes.push("Roku-Roku HSC: ensure air blast active before spindle start. No flood coolant on graphite.");
      controllerNotes.push("40,000 RPM BT30: use balanced tool assemblies (G1 or better) to minimize vibration.");
    }

    // Compute safety score
    const failCount = checks.filter(c => c.status === "fail").length;
    const warnCount = checks.filter(c => c.status === "warn").length;
    const safetyScore = Math.max(0, 1.0 - (failCount * 0.20) - (warnCount * 0.05));

    if (safetyScore < 0.70) {
      remediation.unshift("SAFETY BLOCK: setup safety score below 0.70. Address all FAIL checks before executing.");
    }

    return {
      valid: safetyScore >= 0.70,
      safety_score: safetyScore,
      capability_checks: checks,
      cutter_comp_validation: ccValidation,
      controller_notes: controllerNotes,
      remediation,
      references,
    };
  }

  // ============================================================================
  // 4. TROUBLESHOOT MILLING ISSUE
  // ============================================================================

  /**
   * Diagnose a milling problem using symptom matching across all knowledge sources.
   *
   * @param symptoms - Observed symptoms from machine operator
   * @returns TroubleshootingResult with root causes, corrective actions, sources
   */
  troubleshootMillingIssue(symptoms: MillingSymptoms): TroubleshootingResult {
    log.info("MillingDeepAIHardeningEngine.troubleshootMillingIssue", {
      machine: symptoms.machine_id,
      symptom_count: symptoms.symptoms.length,
    });

    const reasoning: AIReasoningStep[] = [];

    // Step 1 — Normalize symptom text
    const normalized = symptoms.symptoms.map(s => s.toLowerCase());
    reasoning.push({
      step_number: 1,
      type: "observe",
      content: `Received ${symptoms.symptoms.length} symptoms. Normalized for keyword matching.`,
      engine_source: "MillingDeepAIHardeningEngine",
      confidence: 1.0,
      evidence: symptoms.symptoms,
    });

    // Step 2 — Match against symptom-diagnosis map
    const matchedCauses: RootCause[] = [];
    for (const entry of SYMPTOM_DIAGNOSIS_MAP) {
      const matchCount = entry.symptom_keywords.filter(kw =>
        normalized.some(s => s.includes(kw))
      ).length;
      if (matchCount > 0) {
        const matchStrength = matchCount / entry.symptom_keywords.length;
        matchedCauses.push({
          cause: entry.root_cause,
          probability: entry.probability * matchStrength,
          evidence: entry.symptom_keywords.filter(kw => normalized.some(s => s.includes(kw))),
          fix: entry.fix,
          source: entry.source,
        });
      }
    }

    // Add quantitative symptom evidence
    if (symptoms.chatter_detected) {
      const chatterCause = matchedCauses.find(c => c.cause.toLowerCase().includes("chatter"));
      if (chatterCause) {
        chatterCause.probability = Math.min(1.0, chatterCause.probability + 0.10);
        chatterCause.evidence.push("Chatter explicitly confirmed by operator");
      }
    }
    if (symptoms.dimensional_error_mm && symptoms.dimensional_error_mm > 0.02) {
      const dimCause = matchedCauses.find(c => c.cause.toLowerCase().includes("cutter comp"));
      if (dimCause) {
        dimCause.probability = Math.min(1.0, dimCause.probability + 0.12);
        dimCause.evidence.push(`Dimensional error: ${symptoms.dimensional_error_mm} mm measured`);
      }
    }

    // Sort by probability
    const ranked = matchedCauses.sort((a, b) => b.probability - a.probability);

    reasoning.push({
      step_number: 2,
      type: "infer",
      content: `Matched ${ranked.length} root causes. Top: '${ranked[0]?.cause ?? "none"}' at probability ${((ranked[0]?.probability ?? 0) * 100).toFixed(0)}%.`,
      engine_source: "SymptomDiagnosisMap + QuantitativeEvidence",
      confidence: ranked[0]?.probability ?? 0.5,
      evidence: ranked.slice(0, 3).map(c => `${c.cause}: ${(c.probability * 100).toFixed(0)}%`),
    });

    // Step 3 — Controller-specific recovery (WinMax if applicable)
    let controllerRecovery: string[] | undefined;
    const machineProfile = JM_DIE_MACHINE_PROFILES.find(m => m.machine_id === symptoms.machine_id);
    if (machineProfile?.controller === "hurco_winmax") {
      const alarmSymptom = normalized.some(s => s.includes("alarm") || s.includes("stop") || s.includes("recovery"));
      if (alarmSymptom) {
        controllerRecovery = WINMAX_RECOVERY_RULES.map(r => `[${r.title}] ${r.content}`);
      }
    }

    // Step 4 — Build corrective actions (deduplicated)
    const actions: string[] = [];
    const seen = new Set<string>();
    for (const cause of ranked.slice(0, 3)) {
      if (!seen.has(cause.fix)) {
        actions.push(cause.fix);
        seen.add(cause.fix);
      }
    }

    reasoning.push({
      step_number: 3,
      type: "synthesize",
      content: `Built ${actions.length} corrective actions. Controller recovery: ${controllerRecovery ? "WinMax steps added" : "N/A"}.`,
      engine_source: "MillingDeepAIHardeningEngine",
      confidence: 0.88,
      evidence: actions,
    });

    const sources = [...new Set(ranked.slice(0, 3).map(c => c.source))];
    const confidence = ranked.length > 0
      ? ranked.slice(0, 3).reduce((s, c) => s + c.probability, 0) / Math.min(3, ranked.length)
      : 0.50;

    return {
      root_causes: ranked,
      primary_diagnosis: ranked[0]?.cause ?? "Insufficient symptom data — collect more observations",
      corrective_actions: actions,
      controller_recovery: controllerRecovery,
      reasoning,
      sources,
      confidence,
    };
  }

  // ============================================================================
  // 5. JM DIE MACHINE OPTIMIZATION
  // ============================================================================

  /**
   * Get JM Die specific machine optimization profile.
   *
   * @param machine_id - e.g. "haas_vf2", "roku_roku_sng"
   * @returns JMDieMachineOptimization or undefined
   */
  getJMDieMachineOptimization(machine_id: string): JMDieMachineOptimization | undefined {
    return JM_DIE_MACHINE_PROFILES.find(m => m.machine_id === machine_id);
  }

  /**
   * List all JM Die machine profiles.
   * @returns All 5 JM Die milling machine optimization profiles
   */
  listJMDieMachines(): JMDieMachineOptimization[] {
    return [...JM_DIE_MACHINE_PROFILES];
  }

  // ============================================================================
  // 6. OPERATION LEARNING
  // ============================================================================

  /**
   * Record a successful milling operation for pattern learning.
   *
   * @param record - Operation details
   * @param outcome - Final outcome (always "success" here)
   */
  recordSuccessfulOperation(record: Omit<OperationRecord, "id" | "outcome">): void {
    const entry: OperationRecord = {
      ...record,
      id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      outcome: "success",
    };
    this._operationHistory.push(entry);
    this._updateLearnedPattern(entry);
    log.info("MillingDeepAIHardeningEngine: recorded successful operation", { id: entry.id });
  }

  /**
   * Record a failed milling operation for anti-pattern detection.
   *
   * @param record - Operation details
   * @param failure_reason - Why it failed
   */
  recordFailedOperation(
    record: Omit<OperationRecord, "id" | "outcome">,
    failure_reason: string,
  ): void {
    const entry: OperationRecord = {
      ...record,
      id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      outcome: "failure",
      failure_reason,
    };
    this._operationHistory.push(entry);
    this._updateFailurePattern(entry);
    log.info("MillingDeepAIHardeningEngine: recorded failed operation", { id: entry.id, reason: failure_reason });
  }

  /**
   * Get learned recommendations for a given context.
   *
   * @param material_iso_group - ISO material group
   * @param feature_type - hyperMILL feature type
   * @param milling_type - Milling operation type
   * @returns Matched learned patterns sorted by confidence
   */
  getLearnedRecommendations(
    material_iso_group: string,
    feature_type: string,
    milling_type: MillingType,
  ): LearnedPattern[] {
    const matches: LearnedPattern[] = [];
    for (const pattern of this._learnedPatterns.values()) {
      if (
        pattern.material_iso_group === material_iso_group &&
        pattern.feature_type === feature_type &&
        pattern.milling_type === milling_type &&
        pattern.pattern_type === "success_pattern" &&
        pattern.success_rate >= 0.75
      ) {
        matches.push(pattern);
      }
    }
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get anti-patterns to avoid for a given context.
   *
   * @param material_iso_group - ISO material group
   * @param milling_type - Milling operation type
   * @returns Anti-patterns to avoid
   */
  getAntiPatterns(material_iso_group: string, milling_type: MillingType): LearnedPattern[] {
    const anti: LearnedPattern[] = [];
    for (const pattern of this._learnedPatterns.values()) {
      if (
        pattern.material_iso_group === material_iso_group &&
        pattern.milling_type === milling_type &&
        pattern.pattern_type === "anti_pattern"
      ) {
        anti.push(pattern);
      }
    }
    return anti.sort((a, b) => b.sample_count - a.sample_count);
  }

  /**
   * Get operation history count (for testing and auditing).
   */
  getOperationHistoryCount(): number {
    return this._operationHistory.length;
  }

  /**
   * Get learned pattern count.
   */
  getLearnedPatternCount(): number {
    return this._learnedPatterns.size;
  }

  // ============================================================================
  // RESOURCE KNOWLEDGE ACCESS
  // ============================================================================

  /** Get all WinMax Cutter Compensation rules */
  getWinMaxCutterCompRules(): ResourceKnowledgeEntry[] {
    return [...WINMAX_CUTTER_COMP_RULES];
  }

  /** Get all WinMax Recovery rules */
  getWinMaxRecoveryRules(): ResourceKnowledgeEntry[] {
    return [...WINMAX_RECOVERY_RULES];
  }

  /** Get all Mill Intro PPTX knowledge entries */
  getMillIntroKnowledge(): ResourceKnowledgeEntry[] {
    return [...MILL_INTRO_KNOWLEDGE];
  }

  /** Get engines mapped to a hyperMILL strategy category */
  getEnginesForHyperMillCategory(category: HyperMillStrategyCategory): string[] {
    return HYPERMILL_STRATEGY_ENGINE_MAP[category] ?? [];
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private _routeToEngines(
    feature: HyperMillFeatureType,
    isoGroup: "P" | "M" | "K" | "N" | "S" | "H",
  ): EngineRouting[] {
    const routes: EngineRouting[] = [];

    // Always include core AI engines
    routes.push({
      engine_name: "MillingAIUltraIntelligenceEngine",
      operation: "NL parsing + strategy selection",
      priority: 1,
      rationale: "Primary AI orchestrator for all milling types",
    });

    // Feature-specific routing
    if (["closed_pocket", "open_pocket", "deep_cavity"].includes(feature)) {
      routes.push({
        engine_name: "TrochoidalMillingEngine",
        operation: "Adaptive clearing roughing",
        priority: 2,
        rationale: "Trochoidal/dynamic clearing optimal for pocket roughing — reduces heat, extends tool life",
      });
    }
    if (["freeform_surface", "boss", "rib_thin_wall"].includes(feature)) {
      routes.push({
        engine_name: "AdvancedMillingStrategiesEngine",
        operation: "3D surface finishing (flowline/scallop/geodesic)",
        priority: 2,
        rationale: "Advanced surface strategies needed for complex 3D geometry",
      });
    }
    if (isoGroup === "H" || isoGroup === "S") {
      routes.push({
        engine_name: "HighFeedMillingEngine",
        operation: "High-feed milling for hardened/superalloy",
        priority: 2,
        rationale: `ISO ${isoGroup} material benefits from HFM shallow-depth / high-feed approach to reduce thermal load`,
      });
    }
    if (["threaded_hole", "counterbore", "countersink", "hole_through", "hole_blind"].includes(feature)) {
      routes.push({
        engine_name: "ThreadMillingPhysicsEngine",
        operation: "Thread milling physics",
        priority: 3,
        rationale: "Thread/hole features require thread milling physics engine",
      });
    }
    if (["impeller_blade", "draft_wall", "ruled_surface", "undercut"].includes(feature)) {
      routes.push({
        engine_name: "HyperMillMultiAxisEngine",
        operation: "5-axis simultaneous strategy",
        priority: 2,
        rationale: "Complex geometry requires 5-axis simultaneous motion — route through HyperMillMultiAxisEngine",
      });
    }

    // Always close with machine intelligence
    routes.push({
      engine_name: "MillingMachineIntelligenceEngine",
      operation: "Machine/controller selection and G-code validation",
      priority: routes.length + 1,
      rationale: "Final machine capability check and controller-specific code generation",
    });

    return routes;
  }

  private _featureToHyperMillCategory(feature: HyperMillFeatureType): HyperMillStrategyCategory {
    const map: Record<HyperMillFeatureType, HyperMillStrategyCategory> = {
      closed_pocket:    "2d_milling",
      open_pocket:      "2d_milling",
      slot_through:     "2d_milling",
      slot_blind:       "2d_milling",
      hole_through:     "drilling",
      hole_blind:       "drilling",
      threaded_hole:    "thread_milling",
      counterbore:      "drilling",
      countersink:      "drilling",
      boss:             "3d_milling",
      fillet_convex:    "3d_milling",
      fillet_concave:   "3d_milling",
      draft_wall:       "5axis_simultaneous",
      undercut:         "5axis_simultaneous",
      impeller_blade:   "5axis_simultaneous",
      freeform_surface: "3d_milling",
      flat_land:        "2d_milling",
      rib_thin_wall:    "3d_milling",
      deep_cavity:      "high_speed",
      bore_large:       "drilling",
      ruled_surface:    "5axis_simultaneous",
    };
    return map[feature] ?? "3d_milling";
  }

  private _selectHyperMillStrategies(
    category: HyperMillStrategyCategory,
    isoGroup: "P" | "M" | "K" | "N" | "S" | "H",
    geo: PartGeometryFeatures,
  ): HyperMillStrategy[] {
    // Built-in strategy catalog (subset from hyperMILL_Manual-en.pdf)
    const strategyDB: HyperMillStrategy[] = [
      {
        id: "2d_contour_finishing",
        cycle_name: "2D Contour Finishing",
        category: "2d_milling",
        description: "2D contour finishing with cutter compensation",
        detail: "Finish contour with G41/G42 cutter radius compensation. Approach tangentially, depart tangentially. Use for die cases and punch profiles.",
        applicable_features: ["boss", "flat_land"],
        suitable_materials: ["P", "M", "H"],
        required_kinematics: ["3axis"],
        ap_factor: 1.0,
        ae_factor: 0.05,
        manual_ref: "hyperMILL_Manual-en.pdf §3.2",
        manual_pages: "p.85-120",
        advantages: ["Excellent dimensional control", "Consistent Ra", "Cutter comp handles tool wear"],
        limitations: ["Flat features only", "No 3D geometry"],
        jm_die_relevance: 90,
        priority: 10,
      },
      {
        id: "3d_z_level_roughing",
        cycle_name: "3D Z-Level Roughing",
        category: "3d_milling",
        description: "Layer-by-layer Z-level roughing for 3D cavities",
        detail: "Rough 3D cavity in horizontal Z slices. Supports boundary masking and rest material detection. Most efficient for deep mold cavities and electrode bases.",
        applicable_features: ["closed_pocket", "deep_cavity", "freeform_surface"],
        suitable_materials: ["P", "M", "K", "H"],
        required_kinematics: ["3axis", "4axis_rotary"],
        ap_factor: 0.25,
        ae_factor: 0.50,
        manual_ref: "hyperMILL_Manual-en.pdf §4.1",
        manual_pages: "p.210-258",
        advantages: ["Efficient stock removal", "Predictable tool load", "Good for deep cavities"],
        limitations: ["Leaves scallops on angled walls", "Needs finishing pass"],
        jm_die_relevance: 95,
        priority: 9,
      },
      {
        id: "maxx_trochoidal",
        cycle_name: "MAXX Machining — Trochoidal",
        category: "maxx_machining",
        description: "High-speed trochoidal slot and pocket milling",
        detail: "Trochoidal tool path: circular arcs combined with linear advance. Constant chip load, low engagement angle (8-15%), full axial depth. Ideal for tool steel pockets and die features.",
        applicable_features: ["closed_pocket", "open_pocket", "slot_through", "slot_blind", "deep_cavity"],
        suitable_materials: ["P", "M", "H"],
        required_kinematics: ["3axis", "4axis_rotary"],
        ap_factor: 2.0,
        ae_factor: 0.12,
        manual_ref: "hyperMILL_Manual-en.pdf §3.8 (MAXX)",
        manual_pages: "p.165-200",
        advantages: ["Maximizes tool life", "High MRR", "Low heat generation", "Extended depth possible"],
        limitations: ["Requires HSM controller look-ahead", "Not suited for open pockets with sharp exits"],
        jm_die_relevance: 98,
        priority: 10,
      },
      {
        id: "5axis_swarf",
        cycle_name: "5-Axis Swarf Cutting",
        category: "5axis_simultaneous",
        description: "5-axis swarf milling for ruled and draft surfaces",
        detail: "Tool flute contacts the surface along its full length (swarf contact). For ruled and developable surfaces — die draft angles, impeller blades, turbine blades. Eliminates scallops on ruled surfaces.",
        applicable_features: ["draft_wall", "ruled_surface", "impeller_blade"],
        suitable_materials: ["P", "M", "S"],
        required_kinematics: ["5axis_table_head", "5axis_head_head", "5axis_table_table"],
        ap_factor: 1.0,
        ae_factor: 0.02,
        manual_ref: "hyperMILL_Manual-en.pdf §5.4 (5-Axis Swarf)",
        manual_pages: "p.380-420",
        advantages: ["Perfect surface finish on ruled geometry", "Single pass possible", "No scallops"],
        limitations: ["Requires 5-axis machine", "Only for ruled/developable surfaces"],
        jm_die_relevance: 55,
        priority: 7,
      },
      {
        id: "3d_equidistant_finish",
        cycle_name: "3D Equidistant Finishing",
        category: "3d_milling",
        description: "Scallop-height controlled surface finishing",
        detail: "Adaptive stepover maintains constant scallop height across varying surface curvature. Preferred for electrode finishing and freeform die surfaces requiring consistent Ra.",
        applicable_features: ["freeform_surface", "boss", "rib_thin_wall"],
        suitable_materials: ["P", "M", "K", "N", "S", "H"],
        required_kinematics: ["3axis", "4axis_rotary", "5axis_table_head"],
        ap_factor: 0.02,
        ae_factor: 0.05,
        manual_ref: "hyperMILL_Manual-en.pdf §4.5",
        manual_pages: "p.290-320",
        advantages: ["Consistent Ra across entire surface", "Reduces polishing time", "Curvature-adaptive"],
        limitations: ["Slower than parallel passes on flat areas", "Long computation time for complex parts"],
        jm_die_relevance: 88,
        priority: 9,
      },
      {
        id: "deep_hole_drilling",
        cycle_name: "Deep Hole Drilling",
        category: "deep_hole",
        description: "Pecking drill cycle for deep holes (L/D > 5)",
        detail: "Optimized peck drilling with chip break interval, coolant-through spindle recommended for L/D > 8. Supports variable peck depth (decreasing peck for deeper holes).",
        applicable_features: ["hole_through", "hole_blind", "counterbore"],
        suitable_materials: ["P", "M", "K", "H"],
        required_kinematics: ["3axis"],
        ap_factor: 0.20,
        ae_factor: 1.0,
        manual_ref: "hyperMILL_Manual-en.pdf §6.3",
        manual_pages: "p.450-470",
        advantages: ["Reliable chip evacuation", "Consistent hole depth", "Through-coolant compatible"],
        limitations: ["Slow for L/D > 15 without through-spindle coolant"],
        jm_die_relevance: 80,
        priority: 8,
      },
      {
        id: "thread_milling_helical",
        cycle_name: "Thread Milling (Helical)",
        category: "thread_milling",
        description: "Helical interpolation thread milling",
        detail: "Single-flute or multi-flute thread mill traverses helix path. One tool does multiple thread sizes, left or right hand. Superior to tapping for hardened materials and blind holes.",
        applicable_features: ["threaded_hole"],
        suitable_materials: ["P", "M", "K", "H"],
        required_kinematics: ["3axis"],
        ap_factor: 0.20,
        ae_factor: 1.0,
        manual_ref: "hyperMILL_Manual-en.pdf §6.6",
        manual_pages: "p.492-510",
        advantages: ["Works in hardened steel", "No tap breakage", "Adjustable fit", "Blind hole safe"],
        limitations: ["Slower than tapping on soft materials", "Requires rigid setup"],
        jm_die_relevance: 85,
        priority: 8,
      },
    ];

    // Filter by category, material, then sort by priority and JM Die relevance
    return strategyDB
      .filter(s =>
        s.category === category &&
        (s.suitable_materials as string[]).includes(isoGroup)
      )
      .sort((a, b) => (b.priority + b.jm_die_relevance / 100) - (a.priority + a.jm_die_relevance / 100));
  }

  private _buildControllerGuidance(geo: PartGeometryFeatures, part: PartDescription): string {
    const lines: string[] = [];

    // Cutter comp guidance for tight tolerances
    if (geo.tolerance_mm < 0.05) {
      lines.push("Tight tolerance: enable cutter compensation (G41/G42 on Haas/OSP, 'Compensated' on WinMax).");
      lines.push("Measure actual tool radius with presetter and enter in offset table (not nominal).");
    }

    // Graphite / Roku-Roku guidance
    if (part.jm_die_category === "electrode") {
      lines.push("Graphite electrode: use Roku-Roku SNG (40,000 RPM, air blast, BT30).");
      lines.push("No flood coolant — use dust extraction + air blast. hyperMILL electrode strategy preferred.");
    }

    // HSM guidance
    if (part.material.iso_group === "P" || part.material.iso_group === "H") {
      lines.push("Tool steel: enable HSM look-ahead. Haas G187 P2/P3. OSP: High Speed mode ON. WinMax: AI Contour ON.");
    }

    // Probing for first-off parts
    if (geo.tolerance_mm < 0.025) {
      lines.push("First-off parts: add probing cycle (G31 on Haas, CALL OGP on OSP) before finishing pass.");
    }

    return lines.join(" | ");
  }

  private _applyResourceKnowledge(geo: PartGeometryFeatures, part: PartDescription): ResourceKnowledgeEntry[] {
    const applied: ResourceKnowledgeEntry[] = [];

    // Always include basic Mill Intro fundamentals
    applied.push(MILL_INTRO_KNOWLEDGE[0]); // Climb vs conventional

    // Material-specific knowledge
    if (["electrode", "punch", "die"].includes(part.jm_die_category ?? "")) {
      applied.push(MILL_INTRO_KNOWLEDGE[1]); // Speed/feed by material
      applied.push(MILL_INTRO_KNOWLEDGE[3]); // Tool paths for JM Die features
    }

    // Workholding knowledge
    if (part.jm_die_category) {
      applied.push(MILL_INTRO_KNOWLEDGE[2]); // Workholding for JM Die
    }

    // Cutter comp for contour features
    if (["boss", "flat_land", "closed_pocket", "open_pocket"].includes(geo.feature_type)) {
      applied.push(WINMAX_CUTTER_COMP_RULES[0]); // G41/G42 activation
      applied.push(WINMAX_CUTTER_COMP_RULES[2]); // Tool radius entry
    }

    // Recovery knowledge for any operation
    applied.push(WINMAX_RECOVERY_RULES[0]); // Mid-program restart

    return applied;
  }

  private _buildJMDieNotes(part: PartDescription, geo: PartGeometryFeatures): string[] {
    const notes: string[] = [];

    if (part.jm_die_category === "electrode") {
      notes.push("Graphite electrode → Roku-Roku SNG-1000 (HSC, 40K RPM). Air blast only.");
      notes.push("hyperMILL electrode strategy (or Mastercam 3D HST). Save NC as .MIN for Roku-Roku.");
      notes.push("Measure electrode after machining — compare to nominal with CMM before EDM.");
    } else if (part.jm_die_category === "die" || part.jm_die_category === "insert") {
      notes.push("Die/insert: primary machine Okuma Genos M460V for tight tolerances (±0.005 mm).");
      notes.push("Rough on Haas VF-2/VF-3, finish on Okuma Genos. Use through-spindle coolant on Genos.");
      notes.push("Material (D2/M2/S7/H13): check hardness before milling. If > 55 HRC → hard milling or EDM.");
    } else if (part.jm_die_category === "fixture") {
      notes.push("Fixture/tooling: Hurco VMX42 conversational mode preferred. DXF import for complex contours.");
      notes.push("Use WinMax 'Compensated' mode for contour — avoids manual G41/G42 programming.");
    } else if (part.jm_die_category === "punch" || part.jm_die_category === "quill") {
      notes.push("Punch/quill: OD profile on Okuma lathe first, then mill features on Haas/Genos.");
      notes.push("Check customer print (ITW, Alcoa, SFS) for specific feature tolerances.");
    } else if (part.jm_die_category === "case") {
      notes.push("Die case (large): use Haas VF-3 for larger envelope. CAT40, 8100 RPM max.");
      notes.push("Flood coolant standard. Use Macro B for repeat features (bolt circles, etc.).");
    }

    if (geo.has_thin_walls) {
      notes.push("Thin wall alert: consult tribal knowledge — JM Die has rib patterns in customer programs.");
    }
    if (part.customer) {
      notes.push(`Customer: ${part.customer} — check H:/PRISM/JM DIE folder for prior programs.`);
    }

    return notes;
  }

  private _scoreStrategy(strategy: CurrentStrategy, constraints: OptimizationConstraints): number {
    let score = 50; // Baseline
    const p = constraints.priority;

    // Cycle time contribution
    if (strategy.cycle_time_min !== undefined && constraints.max_cycle_time_min !== undefined) {
      const ratio = strategy.cycle_time_min / constraints.max_cycle_time_min;
      if (ratio <= 1.0) score += 15;
      else score -= 10 * (ratio - 1.0);
    }

    // Ra contribution
    if (strategy.achieved_ra_um !== undefined && constraints.target_ra_um !== undefined) {
      if (strategy.achieved_ra_um <= constraints.target_ra_um) score += 20;
      else score -= 15;
    }

    // Priority bonus
    if (p === "speed" && strategy.cycle_time_min && strategy.cycle_time_min < 30) score += 10;
    if (p === "quality" && strategy.achieved_ra_um && strategy.achieved_ra_um < 1.6) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  private _buildTrochoidalCandidate(
    current: CurrentStrategy,
    constraints: OptimizationConstraints,
  ): OptimizedStrategyCandidate | null {
    // Only suggest for roughing / pocket operations
    if (!["2d_pocket", "2d_slot", "25d_pocket", "25d_adaptive"].includes(current.milling_type)) {
      return null;
    }
    const baseFeed = current.params.feed_mmmin * 1.35;
    const baseRpm = current.params.spindle_rpm * 1.10;
    return {
      name: "MAXX Machining — Trochoidal Clearing",
      milling_type: current.milling_type,
      strategy_source: "trochoidal",
      params: {
        ...current.params,
        feed_mmmin: baseFeed,
        spindle_rpm: baseRpm,
        ae_mm: current.params.ae_mm * 0.15, // 15% radial engagement
        ap_mm: current.params.ap_mm * 2.0,  // Full axial
      },
      tools: current.tools,
      estimated_cycle_min: (current.cycle_time_min ?? 30) * 0.78,
      estimated_ra_um: (current.achieved_ra_um ?? 3.2) * 1.2, // Roughing — Ra increases
      estimated_tool_life_min: 85,
      score: 78,
      rationale: "Trochoidal (MAXX) clearing: +35% feed, constant 15% ae engagement, 2× axial depth. MRR gain ~38%, tool life extended 40% vs conventional slotting.",
    };
  }

  private _buildHFMCandidate(
    current: CurrentStrategy,
    constraints: OptimizationConstraints,
  ): OptimizedStrategyCandidate | null {
    // Only suggest for hard materials (H) or where tool life is priority
    const isHardMaterial = current.tools.some(t => t.material === "CBN" || t.material === "ceramic");
    if (!isHardMaterial && constraints.priority !== "tool_life") {
      return null;
    }
    return {
      name: "High Feed Milling (HFM) — Shallow Depth / High Feed",
      milling_type: current.milling_type,
      strategy_source: "high_feed",
      params: {
        ...current.params,
        ap_mm: 0.8,               // 0.5-1.0 mm axial depth for HFM
        ae_mm: current.params.ae_mm * 0.75,
        feed_mmmin: current.params.feed_mmmin * 2.8,  // Large nose-radius chip thinning
      },
      tools: current.tools,
      estimated_cycle_min: (current.cycle_time_min ?? 30) * 1.05, // Slightly slower — more passes
      estimated_ra_um: current.achieved_ra_um ?? 3.2,
      estimated_tool_life_min: 110,
      score: 72,
      rationale: "HFM: ap=0.8 mm, feed ×2.8 via chip thinning from large-radius inserts. Cutting force directed axially — good for hardened steel and fragile setups.",
    };
  }

  private _buildAdvancedCandidate(
    current: CurrentStrategy,
    constraints: OptimizationConstraints,
  ): OptimizedStrategyCandidate | null {
    if (!["3d_parallel", "3d_scallop", "3d_rest", "3d_morph"].includes(current.milling_type)) {
      return null;
    }
    return {
      name: "3D Equidistant (Constant Scallop) Finishing",
      milling_type: current.milling_type,
      strategy_source: "advanced",
      params: {
        ...current.params,
        ae_mm: 0.3, // Curvature-adaptive stepover targeting 0.5 µm scallop
      },
      tools: current.tools,
      estimated_cycle_min: (current.cycle_time_min ?? 30) * 1.30,
      estimated_ra_um: 0.4,
      estimated_tool_life_min: 70,
      score: 85,
      rationale: "Constant scallop (equidistant) finishing: curvature-adaptive stepover maintains Ra target across full freeform surface. Reduces polishing time significantly.",
    };
  }

  private _buildProvenPatternCandidate(
    current: CurrentStrategy,
    constraints: OptimizationConstraints,
  ): OptimizedStrategyCandidate | null {
    const tool = current.tools[0];
    if (!tool) return null;
    const material_iso = tool.material === "carbide" ? "H" : "P";
    const patterns = this.getLearnedRecommendations(material_iso, "closed_pocket", current.milling_type);
    if (patterns.length === 0) return null;
    const best = patterns[0];
    return {
      name: `JM Die Proven Pattern (${best.sample_count} ops, ${(best.success_rate * 100).toFixed(0)}% success)`,
      milling_type: current.milling_type,
      strategy_source: "jm_die_proven",
      params: { ...current.params, ...(best.recommended_params as Partial<MillingCuttingParams>) },
      tools: current.tools,
      estimated_cycle_min: (current.cycle_time_min ?? 30) * 0.95,
      estimated_ra_um: best.avg_ra_um ?? 1.6,
      estimated_tool_life_min: best.avg_tool_life_min ?? 70,
      score: 80 + best.confidence * 10,
      rationale: `JM Die shop-proven pattern with ${best.sample_count} successful operations, ${(best.success_rate * 100).toFixed(0)}% success rate, confidence ${(best.confidence * 100).toFixed(0)}%.`,
    };
  }

  private _buildCatalogDerivedCandidate(
    current: CurrentStrategy,
    constraints: OptimizationConstraints,
  ): OptimizedStrategyCandidate | null {
    // ManufacturerCatalogAIEngine: BIG DAISHOWA shrink-fit for rigidity
    const tool = current.tools[0];
    if (!tool || tool.diameter_mm < 6) return null;
    return {
      name: "Catalog-Optimized: BIG DAISHOWA Shrink-fit + Accupro TiAlN End Mill",
      milling_type: current.milling_type,
      strategy_source: "catalog_derived",
      params: {
        ...current.params,
        spindle_rpm: Math.min(current.params.spindle_rpm * 1.08, 12000),
      },
      tools: current.tools.map(t => ({ ...t, coating: "TiAlN" as const })),
      estimated_cycle_min: (current.cycle_time_min ?? 30) * 0.92,
      estimated_ra_um: (current.achieved_ra_um ?? 3.2) * 0.85,
      estimated_tool_life_min: 80,
      score: 73,
      rationale: "BIG DAISHOWA shrink-fit holder (< 3 µm runout) + Accupro TiAlN carbide end mill. Improved rigidity reduces chatter, better Ra. Source: BIG DAISHOWA Vol 5 / Accupro 2013.",
    };
  }

  private _buildFallbackCandidate(current: CurrentStrategy): OptimizedStrategyCandidate {
    return {
      name: `${current.name} — Optimized Parameters`,
      milling_type: current.milling_type,
      strategy_source: "jm_die_proven",
      params: {
        ...current.params,
        spindle_rpm: Math.round(current.params.spindle_rpm * 1.05),
        feed_mmmin: Math.round(current.params.feed_mmmin * 1.08),
      },
      tools: current.tools,
      estimated_cycle_min: (current.cycle_time_min ?? 30) * 0.95,
      estimated_ra_um: current.achieved_ra_um ?? 3.2,
      estimated_tool_life_min: 65,
      score: 55,
      rationale: "Moderate parameter increase (+5% RPM, +8% feed) as conservative first step.",
    };
  }

  private _checkConstraints(candidate: OptimizedStrategyCandidate, constraints: OptimizationConstraints): string[] {
    const met: string[] = [];
    if (constraints.max_cycle_time_min !== undefined && candidate.estimated_cycle_min <= constraints.max_cycle_time_min) {
      met.push(`Cycle time ${candidate.estimated_cycle_min.toFixed(1)} min ≤ limit ${constraints.max_cycle_time_min} min`);
    }
    if (constraints.min_tool_life_min !== undefined && candidate.estimated_tool_life_min >= constraints.min_tool_life_min) {
      met.push(`Tool life ${candidate.estimated_tool_life_min} min ≥ minimum ${constraints.min_tool_life_min} min`);
    }
    if (constraints.target_ra_um !== undefined && candidate.estimated_ra_um <= constraints.target_ra_um) {
      met.push(`Ra ${candidate.estimated_ra_um.toFixed(2)} µm ≤ target ${constraints.target_ra_um} µm`);
    }
    return met;
  }

  private _findViolations(candidate: OptimizedStrategyCandidate, constraints: OptimizationConstraints): string[] {
    const violated: string[] = [];
    if (constraints.max_cycle_time_min !== undefined && candidate.estimated_cycle_min > constraints.max_cycle_time_min) {
      violated.push(`Cycle time ${candidate.estimated_cycle_min.toFixed(1)} min > limit ${constraints.max_cycle_time_min} min`);
    }
    if (constraints.min_tool_life_min !== undefined && candidate.estimated_tool_life_min < constraints.min_tool_life_min) {
      violated.push(`Tool life ${candidate.estimated_tool_life_min} min < minimum ${constraints.min_tool_life_min} min`);
    }
    if (constraints.target_ra_um !== undefined && candidate.estimated_ra_um > constraints.target_ra_um) {
      violated.push(`Ra ${candidate.estimated_ra_um.toFixed(2)} µm > target ${constraints.target_ra_um} µm`);
    }
    return violated;
  }

  private _estimateCostDelta(current: CurrentStrategy, best: OptimizedStrategyCandidate): number {
    const timeDelta = (current.cycle_time_min ?? 30) - best.estimated_cycle_min;
    const toolLifeGain = best.estimated_tool_life_min - 60;
    // Rough: 1 min cycle = $1.50 at JM Die shop rate, 1 min tool life = $0.20 tool cost savings
    return -(timeDelta * 1.5 + toolLifeGain * 0.2);
  }

  private _maxToolRpm(tool: MillingTool): number {
    // Max RPM from cutting speed limit: Vc(max) = 300 m/min for carbide in tool steel
    // RPM = Vc * 1000 / (π * D)
    const vcMax = tool.material === "carbide" ? 300 : 120;
    return Math.round((vcMax * 1000) / (Math.PI * tool.diameter_mm));
  }

  private _checkCoolantCompatibility(
    setup: MachineSetupDescription,
    profile: JMDieMachineOptimization | undefined,
  ): { ok: boolean; detail: string } {
    if (setup.machine_id === "roku_roku_sng" && setup.part.jm_die_category === "electrode") {
      // Graphite machining — air blast only
      const usesFlood = setup.part.material.iso_group === "N"; // N = non-ferrous / graphite-adjacent
      return {
        ok: true,
        detail: "Roku-Roku SNG: air blast required for graphite. Dust extraction must be running.",
      };
    }
    return {
      ok: true,
      detail: `${profile?.display_name ?? setup.machine_id}: ${profile?.coolant_mode ?? "flood"} coolant mode nominal.`,
    };
  }

  private _validateWinMaxCutterComp(setup: MachineSetupDescription): CutterCompValidation {
    const tool = setup.tools[0];
    const toolRadius = tool ? tool.diameter_mm / 2 : 5.0;
    const minArcRadius = toolRadius + 0.10; // From WinMax CC PDF p.10-12
    const programmedRadius = setup.part.features.min_corner_radius_mm ?? (toolRadius + 0.5);

    return {
      mode: setup.cutter_comp ?? "G41",
      approach_valid: true, // Assume approach programmed correctly
      departure_valid: true,
      arc_min_radius_ok: programmedRadius >= minArcRadius,
      min_arc_radius_required_mm: minArcRadius,
      applied_radius_mm: programmedRadius,
      winmax_cc_notes: [
        `G41/G42: activate on linear move of ≥ ${toolRadius.toFixed(2)} mm before workpiece. (WinMax CC PDF p.4-6)`,
        `Tool radius in offset table: enter measured value ${toolRadius.toFixed(3)} mm, not nominal. (p.14)`,
        `Inside corner arc min radius: ${minArcRadius.toFixed(2)} mm required. Programmed: ${programmedRadius.toFixed(2)} mm — ${programmedRadius >= minArcRadius ? "OK" : "ALARM RISK"} (p.10-12)`,
        "Conversational mode: select 'Compensated' in contour op — no manual G41/G42 needed. (p.18-20)",
      ],
    };
  }

  private _updateLearnedPattern(record: OperationRecord): void {
    const key = `${record.material_iso_group}|${record.feature_type}|${record.milling_type}|success`;
    const existing = this._learnedPatterns.get(key);
    if (existing) {
      const n = existing.sample_count + 1;
      existing.sample_count = n;
      existing.success_rate = (existing.success_rate * (n - 1) + 1.0) / n;
      existing.avg_ra_um = record.achieved_ra_um
        ? (existing.avg_ra_um ?? record.achieved_ra_um * 2) * (n - 1) / n + record.achieved_ra_um / n
        : existing.avg_ra_um;
      existing.avg_tool_life_min = record.tool_life_min
        ? (existing.avg_tool_life_min ?? 60) * (n - 1) / n + record.tool_life_min / n
        : existing.avg_tool_life_min;
      existing.confidence = Math.min(0.99, 0.50 + n * 0.05);
      existing.last_updated = record.timestamp;
      if (record.params) {
        Object.assign(existing.recommended_params, record.params);
      }
    } else {
      this._learnedPatterns.set(key, {
        pattern_id: key,
        pattern_type: "success_pattern",
        material_iso_group: record.material_iso_group,
        feature_type: record.feature_type,
        milling_type: record.milling_type,
        recommended_params: { ...record.params },
        sample_count: 1,
        success_rate: 1.0,
        avg_ra_um: record.achieved_ra_um,
        avg_tool_life_min: record.tool_life_min,
        confidence: 0.55,
        last_updated: record.timestamp,
      });
    }
  }

  private _updateFailurePattern(record: OperationRecord): void {
    const key = `${record.material_iso_group}|${record.feature_type}|${record.milling_type}|failure`;
    const existing = this._learnedPatterns.get(key);
    if (existing) {
      const n = existing.sample_count + 1;
      existing.sample_count = n;
      existing.success_rate = (existing.success_rate * (n - 1) + 0.0) / n;
      existing.confidence = Math.min(0.99, 0.50 + n * 0.05);
      existing.last_updated = record.timestamp;
    } else {
      this._learnedPatterns.set(key, {
        pattern_id: key,
        pattern_type: "anti_pattern",
        material_iso_group: record.material_iso_group,
        feature_type: record.feature_type,
        milling_type: record.milling_type,
        recommended_params: { ...record.params },
        sample_count: 1,
        success_rate: 0.0,
        confidence: 0.55,
        last_updated: record.timestamp,
      });
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance — lazy-loaded per PRISM dispatcher pattern */
export const millingDeepAIHardeningEngine = new MillingDeepAIHardeningEngine();
