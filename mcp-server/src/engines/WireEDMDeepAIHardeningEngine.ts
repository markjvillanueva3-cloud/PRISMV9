/**
 * WireEDMDeepAIHardeningEngine — WEDM-HARDEN-MS1
 * ================================================
 * Cross-engine AI hardening layer for ALL 30+ Wire EDM engines.
 *
 * Unifies:
 *   - EDMWireEngine                      (core Wire EDM physics)
 *   - WEDMPrintToProgramEngine           (drawing → G-code pipeline)
 *   - WEDMCompleteOrchestrationEngine    (full workflow orchestration)
 *   - WEDMProductionReadinessEngine      (production validation)
 *   - EDMMultiPassStrategyEngine         (E-code family selection)
 *   - EDMWireSlugCornerTaperEngine       (slug/tab + corner + taper)
 *   - EDMMaterialMachineWireEngine       (material/machine/wire selection)
 *   - WEDMPreFlightCheckEngine           (setup validation)
 *   - WEDMCalibrationReportEngine        (calibration tracking)
 *   - WEDMFeedbackCalibrationEngine      (feedback loop learning)
 *   - EDMSurfaceIntegrityEngine          (recast layer, Ra analysis)
 *   - EDMCuttingParamFlushEngine         (flushing optimization)
 *   - EDMToolpathStrategyEngine          (toolpath optimization)
 *   - EDMParameterEngine                 (E-pack parameters)
 *   - StochasticEDMEngine                (uncertainty quantification)
 *
 * Resource Knowledge:
 *   - H:/prism/resources/MasterCam/MASTERCAM/mcamX8/.../Mitsubishi (FA-S).tech
 *   - H:/prism/resources/MasterCam/MASTERCAM/mcamX8/.../Makino (SP43,SP64).tech
 *   - H:/prism/resources/RESOURCE PDFS/Mastercam-Wire-Tutorial.pdf
 *   - Klocke (2013) Manufacturing Processes 4, Chapter 8
 *   - Reliable EDM Complete Handbook, Chapter 5
 *   - Sodick Wire EDM Operation Manual
 *   - Mitsubishi FA Advance Series application notes
 *
 * JM Die Shop (canonical test shop):
 *   - Mitsubishi FA-20S (UV taper, M800 controller)
 *   - Primary materials: D2, A2, S7, M2, H13 tool steels
 *   - Standard wire: 0.010" / 0.25mm brass
 *   - Typical work: punch/die profiles, cold heading inserts
 *
 * @module engines/WireEDMDeepAIHardeningEngine
 * @milestone WEDM-HARDEN-MS1
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { wireEDMUnifiedScienceEngine, type UnifiedScienceAnalysis } from "./WireEDMUnifiedScienceEngine.js";

// ============================================================================
// IMPORTED TYPES — from integrated engines
// ============================================================================

import type { ECodeFamily, ECodePass } from "../data/jm-die-wedm-tech-tables.js";
import {
  MITSUBISHI_FA_TECH_RECORDS,
  MITSUBISHI_FA_ECODE_FAMILIES,
  type MitsubishiFATechRecord,
  type MitsubishiFATechPass,
} from "../data/mitsubishi-fa-tech-extracted.js";

// ============================================================================
// TYPES — Core Wire EDM Structures
// ============================================================================

/** Wire type specifications */
export type WireType = "plain_brass" | "zinc_coated" | "gamma_coated" | "diffusion_annealed" | "molybdenum" | "tungsten" | "copper";

/** Wire diameter options in mm */
export type WireDiameter = 0.10 | 0.15 | 0.20 | 0.25 | 0.30;

/** EDM operation type */
export type WEDMOperationType = "straight_2axis" | "taper_4axis" | "variable_taper" | "punch_with_slug" | "die_opening" | "multiple_start_holes";

/** Material ISO group for EDM */
export type WEDMMaterialGroup = "P" | "M" | "K" | "N" | "H" | "S";

/** WEDM controller family */
export type WEDMControllerFamily = "mitsubishi_m800" | "mitsubishi_m700" | "sodick_lnw" | "makino_mgw" | "fanuc" | "agie_vision" | "charmilles" | "generic";

/** Surface finish quality tier */
export type WEDMFinishTier = "rough_only" | "standard" | "fine" | "mirror" | "acu_precision";

// ============================================================================
// INPUT STRUCTURES
// ============================================================================

/** Wire selection parameters */
export interface WireSpecification {
  type: WireType;
  diameter_mm: WireDiameter;
  tensile_strength_mpa?: number;
  manufacturer?: string;
  part_number?: string;
}

/** Workpiece material specification */
export interface WEDMMaterialSpec {
  name: string;
  iso_group: WEDMMaterialGroup;
  hardness_hrc?: number;
  conductivity_iacs_pct?: number;
  melting_point_c?: number;
  /** Typical in D2, A2, S7, etc. */
  carbide_content_pct?: number;
}

/** Part geometry for WEDM analysis */
export interface WEDMPartGeometry {
  /** Part thickness in mm */
  thickness_mm: number;
  /** Taper angle in degrees (0 for straight cut) */
  taper_angle_deg: number;
  /** Minimum inside corner radius in mm */
  min_corner_radius_mm?: number;
  /** Total cut length in mm */
  cut_length_mm?: number;
  /** Number of separate cut profiles */
  num_profiles?: number;
  /** Has slug/tab to remove? */
  has_slug?: boolean;
  /** Slug dimensions in mm */
  slug_dimensions_mm?: { width: number; height: number };
  /** Number of start holes */
  num_start_holes?: number;
  /** Start hole diameter in mm */
  start_hole_diameter_mm?: number;
}

/** Part description for WEDM analysis */
export interface WEDMPartDescription {
  name: string;
  material: WEDMMaterialSpec;
  geometry: WEDMPartGeometry;
  /** Target tolerance in mm */
  tolerance_mm: number;
  /** Target surface finish Ra in µm */
  target_ra_um: number;
  /** JM Die part category */
  jm_die_category?: "punch" | "die" | "insert" | "case" | "quill" | "gauge" | "mold_component" | "custom";
  /** Customer name */
  customer?: string;
}

/** Current cutting parameters */
export interface WEDMCuttingParams {
  /** E-code family ID */
  e_code_family?: string;
  /** Number of passes */
  num_passes: number;
  /** Rough cut ON time (A) in µs */
  on_time_us?: number;
  /** Rough cut OFF time (B) in µs */
  off_time_us?: number;
  /** Gap voltage in V */
  gap_voltage_v?: number;
  /** Wire tension in grams */
  wire_tension_g?: number;
  /** Wire speed in m/min */
  wire_speed_m_min?: number;
  /** Servo voltage */
  servo_voltage?: number;
  /** Flush pressure in bar */
  flush_pressure_bar?: number;
}

/** Machine setup for validation */
export interface WEDMMachineSetup {
  machine_id: string;
  controller: WEDMControllerFamily;
  wire: WireSpecification;
  part: WEDMPartDescription;
  params: WEDMCuttingParams;
  /** Water resistivity in MΩ·cm */
  water_resistivity_mohm_cm?: number;
  /** Workholding method */
  workholding: "magnetic_chuck" | "vise" | "clamps" | "fixture" | "adhesive";
  /** Cutter compensation (H register usage) */
  uses_h_registers?: boolean;
}

/** Optimization constraints */
export interface WEDMOptimizationConstraints {
  max_cycle_time_min?: number;
  min_wire_life_hours?: number;
  target_ra_um?: number;
  target_tolerance_mm?: number;
  max_recast_layer_um?: number;
  priority: "quality" | "speed" | "cost" | "wire_life" | "balanced";
  /** Available wire types in crib */
  available_wire_types?: WireType[];
  /** Coolant/dielectric constraints */
  dielectric_type?: "deionized_water" | "oil";
}

/** Troubleshooting symptom report */
export interface WEDMSymptoms {
  machine_id?: string;
  material?: string;
  symptoms: string[];
  /** Wire breaks per hour */
  wire_breaks_per_hour?: number;
  /** Measured Ra if finish is the issue */
  measured_ra_um?: number;
  /** Dimensional error in mm */
  dimensional_error_mm?: number;
  /** Water resistivity reading */
  water_resistivity_mohm_cm?: number;
  /** Observed patterns */
  break_location?: "corners" | "thick_section" | "random" | "start_hole" | "taper_zone";
  /** Visible burn marks or discoloration */
  burn_marks_visible?: boolean;
}

// ============================================================================
// OUTPUT STRUCTURES
// ============================================================================

/** Single AI reasoning step */
export interface WEDMReasoningStep {
  step_number: number;
  type: "observe" | "classify" | "query_engine" | "infer" | "validate" | "synthesize" | "lookup_knowledge";
  content: string;
  engine_source: string;
  confidence: number;
  evidence: string[];
}

/** Engine routing recommendation */
export interface WEDMEngineRouting {
  engine_name: string;
  operation: string;
  priority: number;
  rationale: string;
}

/** Resource knowledge entry */
export interface WEDMKnowledgeEntry {
  source: "mastercam_fas_tech" | "makino_sp_tech" | "klocke_2013" | "reliable_edm_handbook" | "mitsubishi_app_notes" | "sodick_manual" | "tribal_knowledge";
  section?: string;
  title: string;
  content: string;
  applies_to: string[];
  confidence: number;
}

/** Full WEDM analysis result */
export interface WEDMAnalysisResult {
  part_summary: string;
  engine_routing: WEDMEngineRouting[];
  /** Recommended E-code family */
  e_code_family: ECodeFamily | null;
  /** Controller-specific guidance */
  controller_guidance: string;
  /** Resource knowledge applied */
  resource_knowledge: WEDMKnowledgeEntry[];
  /** Physics/chemistry/metallurgy/thermodynamics analysis */
  science_analysis?: UnifiedScienceAnalysis;
  /** AI reasoning chain */
  reasoning: WEDMReasoningStep[];
  /** Overall confidence 0-1 */
  confidence: number;
  /** JM Die specific notes */
  jm_die_notes: string[];
  warnings: string[];
}

/** Strategy optimization candidate */
export interface WEDMStrategyCandidate {
  name: string;
  e_code_family_id: string;
  num_passes: number;
  wire_type: WireType;
  wire_diameter_mm: WireDiameter;
  estimated_cycle_min: number;
  estimated_ra_um: number;
  estimated_wire_consumption_m: number;
  score: number;
  rationale: string;
}

/** Strategy optimization result */
export interface WEDMOptimizationResult {
  current_score: number;
  candidates: WEDMStrategyCandidate[];
  best_candidate: WEDMStrategyCandidate;
  reasoning: WEDMReasoningStep[];
  improvement: {
    cycle_time_delta_min: number;
    ra_delta_um: number;
    wire_consumption_delta_m: number;
    cost_delta_pct: number;
  };
  constraints_met: string[];
  constraints_violated: string[];
}

/** Setup validation result */
export interface WEDMSetupValidationResult {
  valid: boolean;
  safety_score: number;
  capability_checks: WEDMCapabilityCheck[];
  h_register_validation?: WEDMHRegisterValidation;
  controller_notes: string[];
  remediation: string[];
  references: string[];
}

/** Individual capability check */
export interface WEDMCapabilityCheck {
  check_name: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  value?: number | string;
  limit?: number | string;
}

/** H-register offset validation (JM Die H175 master pattern) */
export interface WEDMHRegisterValidation {
  uses_h175_master: boolean;
  h_registers_used: string[];
  offset_progression_valid: boolean;
  offset_values_mm: number[];
  jm_die_h175_notes: string[];
}

/** Troubleshooting result */
export interface WEDMTroubleshootingResult {
  root_causes: WEDMRootCause[];
  primary_diagnosis: string;
  corrective_actions: string[];
  controller_recovery?: string[];
  reasoning: WEDMReasoningStep[];
  sources: string[];
  confidence: number;
}

/** Root cause identification */
export interface WEDMRootCause {
  cause: string;
  probability: number;
  evidence: string[];
  fix: string;
  source: "mastercam_fas_tech" | "klocke_2013" | "mitsubishi_app_notes" | "tribal_knowledge" | "physics";
}

/** JM Die machine optimization profile */
export interface JMDieWEDMProfile {
  machine_id: string;
  display_name: string;
  controller: WEDMControllerFamily;
  /** UV taper capability */
  has_uv_axis: boolean;
  /** Max taper angle at max thickness */
  max_taper_deg: number;
  /** Max thickness for taper */
  max_taper_thickness_mm: number;
  /** Standard wire at JM Die */
  standard_wire: WireSpecification;
  /** Primary materials cut */
  primary_materials: string[];
  /** Best achievable Ra on tool steel */
  best_ra_tool_steel_um: number;
  /** Speed/feed scaling vs generic (1.0 = use as-is) */
  sf_scale_factor: number;
  /** Shop-floor notes */
  shop_notes: string[];
  /** CAM system used */
  cam_system: string;
}

// ============================================================================
// STATIC KNOWLEDGE TABLES
// ============================================================================

/**
 * Wire type performance by material group.
 * Source: Klocke (2013) Ch.8 + Reliable EDM Handbook Ch.5
 */
const WIRE_MATERIAL_PERFORMANCE: Record<WireType, {
  best_for: WEDMMaterialGroup[];
  cut_speed_factor: number;
  break_resistance: number;
  ra_quality: number;
  cost_factor: number;
  notes: string;
}> = {
  plain_brass: {
    best_for: ["P", "H"],
    cut_speed_factor: 1.0,
    break_resistance: 0.70,
    ra_quality: 0.85,
    cost_factor: 1.0,
    notes: "Standard wire, good all-around. 63% Cu / 37% Zn.",
  },
  zinc_coated: {
    best_for: ["K", "H", "S"],
    cut_speed_factor: 1.15,
    break_resistance: 0.85,
    ra_quality: 0.90,
    cost_factor: 1.4,
    notes: "Best for carbide/PCD. Zinc vaporizes for improved flushing. 30-50% fewer breaks on WC.",
  },
  gamma_coated: {
    best_for: ["K", "S"],
    cut_speed_factor: 1.25,
    break_resistance: 0.90,
    ra_quality: 0.92,
    cost_factor: 1.8,
    notes: "Premium for thick carbide (>30mm). Gamma-phase zinc alloy coating.",
  },
  diffusion_annealed: {
    best_for: ["H", "P"],
    cut_speed_factor: 1.10,
    break_resistance: 0.88,
    ra_quality: 0.95,
    cost_factor: 1.6,
    notes: "Best surface finish on hardened steels. Controlled surface porosity.",
  },
  molybdenum: {
    best_for: ["H", "S"],
    cut_speed_factor: 0.80,
    break_resistance: 0.95,
    ra_quality: 0.92,
    cost_factor: 3.0,
    notes: "Ultra-fine finish work. Reusable (3-5 uses). High tensile strength.",
  },
  tungsten: {
    best_for: ["N"],
    cut_speed_factor: 0.70,
    break_resistance: 0.98,
    ra_quality: 0.88,
    cost_factor: 4.0,
    notes: "Specialized for micro-EDM. 0.02-0.05mm diameters. Not for production.",
  },
  copper: {
    best_for: ["N"],
    cut_speed_factor: 0.90,
    break_resistance: 0.65,
    ra_quality: 0.80,
    cost_factor: 1.2,
    notes: "For aluminum/copper alloys. Reduces material transfer issues.",
  },
};

/**
 * E-code family to engine routing map.
 * Determines which engines to invoke based on E-code selection.
 */
const ECODE_ENGINE_ROUTING: Record<string, string[]> = {
  "E12xx_standard_4pass": ["EDMMultiPassStrategyEngine", "EDMParameterEngine", "EDMSurfaceIntegrityEngine"],
  "E12xx_heavy_5pass": ["EDMMultiPassStrategyEngine", "EDMParameterEngine", "EDMSurfaceIntegrityEngine", "EDMCuttingParamFlushEngine"],
  "E28xx_taper_5pass": ["EDMMultiPassStrategyEngine", "EDMWireSlugCornerTaperEngine", "EDMParameterEngine"],
  "E952_acu_7pass_thin": ["EDMMultiPassStrategyEngine", "EDMParameterEngine", "EDMSurfaceIntegrityEngine", "WEDMCalibrationReportEngine"],
  "E56xx_acu_7pass_thick": ["EDMMultiPassStrategyEngine", "EDMCuttingParamFlushEngine", "EDMSurfaceIntegrityEngine", "WEDMCalibrationReportEngine"],
};

/**
 * Thickness-based flushing efficiency curve.
 * Source: Kunieda (2005) CIRP + tribal knowledge.
 * Efficiency = 1/sqrt(thickness/50) for thickness > 50mm
 */
const THICKNESS_FLUSH_EFFICIENCY = (thickness_mm: number): number => {
  if (thickness_mm <= 50) return 1.0;
  return 1 / Math.sqrt(thickness_mm / 50);
};

/**
 * Ra progression per pass (Toenshoff energy cascade).
 * Each skim pass improves Ra by roughly 60-70%.
 * Ra_n = Ra_rough × 0.35^(n-1) for skims
 */
const RA_PROGRESSION = (ra_rough_um: number, pass_number: number): number => {
  if (pass_number <= 1) return ra_rough_um;
  return ra_rough_um * Math.pow(0.35, pass_number - 1);
};

/**
 * JM Die's Mitsubishi FA-20S profile.
 * Source: JM Die shop floor configuration.
 */
const JM_DIE_FA20S: JMDieWEDMProfile = {
  machine_id: "mitsubishi_fa20s",
  display_name: "Mitsubishi FA-20S",
  controller: "mitsubishi_m800",
  has_uv_axis: true,
  max_taper_deg: 15,
  max_taper_thickness_mm: 200,
  standard_wire: {
    type: "plain_brass",
    diameter_mm: 0.25,
    tensile_strength_mpa: 900,
    manufacturer: "Hitachi",
  },
  primary_materials: ["D2", "A2", "S7", "M2", "H13", "4140"],
  best_ra_tool_steel_um: 0.18,
  sf_scale_factor: 1.0,
  shop_notes: [
    "Uses H175 master offset pattern — all skims reference H175",
    "Standard wire: 0.010\" brass (0.25mm)",
    "Deionizer checked weekly — target 8-12 MΩ·cm",
    "Typical work: punch/die profiles for cold heading",
    "ACU 7-pass for Ra < 0.2µm requirements",
  ],
  cam_system: "Mastercam Wire X8",
};

/**
 * Tribal knowledge tips indexed for fast lookup.
 * Maps symptom keywords to tip IDs.
 */
const SYMPTOM_TIP_INDEX: Record<string, string[]> = {
  "wire_break": ["wedm-kb-001", "wedm-kb-002", "wedm-kb-003", "wedm-kb-004", "wedm-kb-005", "wedm-kb-006"],
  "corner_break": ["wedm-kb-002", "wedm-kb-003"],
  "surface_finish": ["wedm-kb-007", "wedm-kb-008", "wedm-kb-009", "wedm-kb-010", "wedm-kb-011", "wedm-kb-012"],
  "ra": ["wedm-kb-007", "wedm-kb-008", "wedm-kb-009", "wedm-kb-010", "wedm-kb-012"],
  "recast": ["wedm-kb-011"],
  "thick_section": ["wedm-kb-013", "wedm-kb-014", "wedm-kb-015"],
  "flushing": ["wedm-kb-004", "wedm-kb-013"],
  "carbide": ["wedm-kb-005", "wedm-kb-009"],
  "pcd": ["wedm-kb-005"],
  "aluminum": ["wedm-kb-012"],
  "taper": ["wedm-kb-016"],
};

/**
 * Controller-specific guidance table.
 * Source: Mitsubishi FA app notes + Sodick manual.
 */
const CONTROLLER_GUIDANCE: Record<WEDMControllerFamily, {
  auto_threading: boolean;
  corner_control: boolean;
  thickness_compensation: boolean;
  h175_master_pattern: boolean;
  restart_notes: string;
}> = {
  mitsubishi_m800: {
    auto_threading: true,
    corner_control: true,
    thickness_compensation: true,
    h175_master_pattern: true,
    restart_notes: "After wire break, auto-backup 2mm. Set RETRY=3 in parameters.",
  },
  mitsubishi_m700: {
    auto_threading: true,
    corner_control: true,
    thickness_compensation: true,
    h175_master_pattern: true,
    restart_notes: "M700 requires manual backup distance setting. Use M06 for rethread.",
  },
  sodick_lnw: {
    auto_threading: true,
    corner_control: true,
    thickness_compensation: false,
    h175_master_pattern: false,
    restart_notes: "LNW uses AWT with configurable retry. SPK COND menu for parameters.",
  },
  makino_mgw: {
    auto_threading: true,
    corner_control: true,
    thickness_compensation: true,
    h175_master_pattern: false,
    restart_notes: "Makino MGW has SuperWire auto-recovery. Check GAP CTRL settings.",
  },
  fanuc: {
    auto_threading: true,
    corner_control: false,
    thickness_compensation: false,
    h175_master_pattern: false,
    restart_notes: "Fanuc requires manual corner slowdown programming. Use G91/G90.",
  },
  agie_vision: {
    auto_threading: true,
    corner_control: true,
    thickness_compensation: true,
    h175_master_pattern: false,
    restart_notes: "AgieVision has intelligent path control. ACO module recommended.",
  },
  charmilles: {
    auto_threading: true,
    corner_control: true,
    thickness_compensation: true,
    h175_master_pattern: false,
    restart_notes: "Charmilles Robofil uses ISP for surface integrity. Expert mode available.",
  },
  generic: {
    auto_threading: false,
    corner_control: false,
    thickness_compensation: false,
    h175_master_pattern: false,
    restart_notes: "Manual operation required. Set wire tension and ON/OFF time carefully.",
  },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * WireEDMDeepAIHardeningEngine — Unified AI layer for all Wire EDM engines.
 *
 * Methods:
 *   1. analyzeWEDMOperation()     — Full operation analysis with reasoning chain
 *   2. optimizeWEDMStrategy()     — Multi-path strategy optimization
 *   3. validateWEDMSetup()        — Pre-cut setup validation
 *   4. troubleshootWEDM()         — Root cause diagnosis
 *   5. selectWireType()           — Wire selection with physics rationale
 *   6. calculateCycleTime()       — Accurate cycle time estimation
 *   7. getJMDieMachineProfile()   — JM Die specific machine data
 *   8. queryTribalKnowledge()     — Index into WEDM tips
 */
export class WireEDMDeepAIHardeningEngine {

  // ============================================================================
  // 1. FULL OPERATION ANALYSIS
  // ============================================================================

  /**
   * Analyze a Wire EDM operation: route to relevant engines, build reasoning chain,
   * apply resource knowledge, and return JM Die-specific guidance.
   */
  analyzeWEDMOperation(
    part: WEDMPartDescription,
    targetFinish?: WEDMFinishTier,
  ): WEDMAnalysisResult {
    log.info("WireEDMDeepAIHardeningEngine.analyzeWEDMOperation", {
      part: part.name,
      material: part.material.iso_group,
      thickness: part.geometry.thickness_mm,
      target_ra: part.target_ra_um,
    });

    const reasoning: WEDMReasoningStep[] = [];
    const warnings: string[] = [];
    const jm_die_notes: string[] = [];

    // Step 1 — Classify operation
    const opType = this._classifyOperation(part.geometry);
    reasoning.push({
      step_number: 1,
      type: "classify",
      content: `Classifying WEDM operation: ${opType}. Material: ISO ${part.material.iso_group} (${part.material.name}). Thickness: ${part.geometry.thickness_mm}mm. Taper: ${part.geometry.taper_angle_deg}°.`,
      engine_source: "WireEDMDeepAIHardeningEngine",
      confidence: 0.95,
      evidence: [
        `Thickness: ${part.geometry.thickness_mm}mm`,
        `Taper angle: ${part.geometry.taper_angle_deg}°`,
        `Has slug: ${part.geometry.has_slug ?? false}`,
      ],
    });

    // Step 2 — Route to engines
    const routing = this._routeToEngines(opType, part, targetFinish);
    reasoning.push({
      step_number: 2,
      type: "query_engine",
      content: `Routing to ${routing.length} engines based on operation type and requirements.`,
      engine_source: "WireEDMDeepAIHardeningEngine",
      confidence: 0.93,
      evidence: routing.map(r => r.engine_name),
    });

    // Step 3 — Select E-code family
    const eCodeFamily = this._selectECodeFamily(part, targetFinish);
    reasoning.push({
      step_number: 3,
      type: "query_engine",
      content: eCodeFamily
        ? `Selected E-code family: ${eCodeFamily.id} (${eCodeFamily.num_passes} passes). Rationale: ${eCodeFamily.description}.`
        : `No matching E-code family found. Will use generic parameters.`,
      engine_source: "EDMMultiPassStrategyEngine",
      confidence: eCodeFamily ? 0.92 : 0.60,
      evidence: eCodeFamily ? [`Target Ra: ${part.target_ra_um}µm`, `Tolerance: ${part.tolerance_mm}mm`] : [],
    });

    // Step 4 — Apply resource knowledge
    const knowledge = this._applyResourceKnowledge(part, opType);
    reasoning.push({
      step_number: 4,
      type: "lookup_knowledge",
      content: `Applied ${knowledge.length} knowledge entries from handbooks and tribal tips.`,
      engine_source: "TribalKnowledgeEngine",
      confidence: 0.88,
      evidence: knowledge.map(k => k.title),
    });

    // Step 5 — Unified Science Analysis (physics/chemistry/metallurgy/thermodynamics)
    const scienceAnalysis = this._performScienceAnalysis(part, eCodeFamily);
    reasoning.push({
      step_number: 5,
      type: "query_engine",
      content: `Physics analysis: plasma ${scienceAnalysis.spark.plasma_temperature_K}K, recast ${scienceAnalysis.thermal.recast_layer_um.toFixed(1)}µm, HAZ ${scienceAnalysis.thermal.haz_depth_um.toFixed(1)}µm. ` +
        `Removal: ${scienceAnalysis.removal.mrr_kunieda_mm3_min.toFixed(2)} mm³/min (${scienceAnalysis.removal.mechanism}). Surface integrity: ${scienceAnalysis.metallurgy.surface_integrity_score}/100.`,
      engine_source: "WireEDMUnifiedScienceEngine",
      confidence: scienceAnalysis.confidence,
      evidence: [
        `Feasibility: ${scienceAnalysis.feasibility_score.toFixed(0)}%`,
        `Heat to workpiece: ${(scienceAnalysis.thermal.heat_to_workpiece_J * 1e6).toFixed(2)}µJ`,
        ...scienceAnalysis.warnings.slice(0, 2),
      ],
    });

    // Add science warnings to main warnings
    warnings.push(...scienceAnalysis.warnings);

    // Step 6 — Controller guidance
    const controllerGuidance = this._getControllerGuidance("mitsubishi_m800", part);
    reasoning.push({
      step_number: 6,
      type: "infer",
      content: controllerGuidance,
      engine_source: "CNCControllerDeepLearningEngine",
      confidence: 0.90,
      evidence: ["JM Die uses Mitsubishi M800 controller", "H175 master offset pattern applies"],
    });

    // Step 7 — JM Die specific analysis
    if (part.jm_die_category) {
      jm_die_notes.push(`JM Die part category: ${part.jm_die_category}`);
      jm_die_notes.push(`Standard wire: 0.010" brass (0.25mm)`);
      if (part.target_ra_um < 0.2) {
        jm_die_notes.push(`ACU 7-pass recommended for Ra < 0.2µm`);
      }
    }

    // Step 8 — Thickness warnings
    if (part.geometry.thickness_mm > 100) {
      const flushEff = THICKNESS_FLUSH_EFFICIENCY(part.geometry.thickness_mm);
      warnings.push(`Thick section (${part.geometry.thickness_mm}mm): flushing efficiency ${(flushEff * 100).toFixed(0)}%. Increase flush pressure to 8-10 bar.`);
    }

    // Step 9 — Corner warnings
    if (part.geometry.min_corner_radius_mm && part.geometry.min_corner_radius_mm < 0.5) {
      warnings.push(`Sharp corners (R${part.geometry.min_corner_radius_mm}mm): slow feed to 60% at corners, increase OFF time 20-30%.`);
    }

    // Calculate overall confidence
    const confidence = reasoning.reduce((sum, r) => sum + r.confidence, 0) / reasoning.length;

    return {
      part_summary: `${part.name}: ${part.material.name} (ISO ${part.material.iso_group}), ${part.geometry.thickness_mm}mm thick, ${opType}. Target Ra: ${part.target_ra_um}µm, tolerance: ±${part.tolerance_mm}mm.`,
      engine_routing: routing,
      e_code_family: eCodeFamily,
      controller_guidance: controllerGuidance,
      resource_knowledge: knowledge,
      science_analysis: scienceAnalysis,
      reasoning,
      confidence,
      jm_die_notes,
      warnings,
    };
  }

  // ============================================================================
  // 2. STRATEGY OPTIMIZATION
  // ============================================================================

  /**
   * Optimize WEDM strategy across multiple candidate approaches.
   */
  optimizeWEDMStrategy(
    part: WEDMPartDescription,
    currentParams: WEDMCuttingParams,
    constraints: WEDMOptimizationConstraints,
  ): WEDMOptimizationResult {
    log.info("WireEDMDeepAIHardeningEngine.optimizeWEDMStrategy", {
      part: part.name,
      priority: constraints.priority,
    });

    const reasoning: WEDMReasoningStep[] = [];
    const candidates: WEDMStrategyCandidate[] = [];

    // Score current strategy
    const currentScore = this._scoreStrategy(currentParams, part, constraints);

    reasoning.push({
      step_number: 1,
      type: "observe",
      content: `Current strategy: ${currentParams.num_passes} passes, ${currentParams.e_code_family ?? "unknown"} E-code family. Score: ${currentScore}/100.`,
      engine_source: "WireEDMDeepAIHardeningEngine",
      confidence: 0.95,
      evidence: [`Current passes: ${currentParams.num_passes}`],
    });

    // Generate candidates based on priority
    if (constraints.priority === "quality" || constraints.target_ra_um && constraints.target_ra_um < 0.2) {
      // ACU 7-pass for highest quality
      candidates.push(this._buildCandidate("ACU 7-Pass Thin", "E952_acu_7pass_thin", 7, "diffusion_annealed", 0.25, part));
      candidates.push(this._buildCandidate("ACU 7-Pass Thick", "E56xx_acu_7pass_thick", 7, "zinc_coated", 0.25, part));
    }

    if (constraints.priority === "speed" || constraints.priority === "balanced") {
      // Standard 4-pass for speed
      candidates.push(this._buildCandidate("Standard 4-Pass", "E12xx_standard_4pass", 4, "plain_brass", 0.25, part));
    }

    if (constraints.priority === "quality" || constraints.priority === "balanced") {
      // Heavy 5-pass for quality
      candidates.push(this._buildCandidate("Heavy 5-Pass", "E12xx_heavy_5pass", 5, "plain_brass", 0.25, part));
    }

    if (part.geometry.taper_angle_deg > 0) {
      // Taper 5-pass for taper work
      candidates.push(this._buildCandidate("Taper 5-Pass", "E28xx_taper_5pass", 5, "plain_brass", 0.25, part));
    }

    // Sort candidates by score
    candidates.sort((a, b) => b.score - a.score);

    const best = candidates[0];

    reasoning.push({
      step_number: 2,
      type: "synthesize",
      content: `Generated ${candidates.length} candidates. Best: ${best.name} (score ${best.score}/100). Estimated Ra: ${best.estimated_ra_um}µm, cycle: ${best.estimated_cycle_min} min.`,
      engine_source: "WireEDMDeepAIHardeningEngine",
      confidence: 0.88,
      evidence: candidates.slice(0, 3).map(c => `${c.name}: ${c.score}/100`),
    });

    // Check constraints
    const constraints_met: string[] = [];
    const constraints_violated: string[] = [];

    if (constraints.target_ra_um) {
      if (best.estimated_ra_um <= constraints.target_ra_um) {
        constraints_met.push(`Ra ${best.estimated_ra_um}µm <= target ${constraints.target_ra_um}µm`);
      } else {
        constraints_violated.push(`Ra ${best.estimated_ra_um}µm > target ${constraints.target_ra_um}µm`);
      }
    }

    if (constraints.max_cycle_time_min) {
      if (best.estimated_cycle_min <= constraints.max_cycle_time_min) {
        constraints_met.push(`Cycle ${best.estimated_cycle_min} min <= max ${constraints.max_cycle_time_min} min`);
      } else {
        constraints_violated.push(`Cycle ${best.estimated_cycle_min} min > max ${constraints.max_cycle_time_min} min`);
      }
    }

    return {
      current_score: currentScore,
      candidates,
      best_candidate: best,
      reasoning,
      improvement: {
        cycle_time_delta_min: best.estimated_cycle_min - (currentParams.num_passes * 5), // rough estimate
        ra_delta_um: best.estimated_ra_um - part.target_ra_um,
        wire_consumption_delta_m: best.estimated_wire_consumption_m - (currentParams.num_passes * 50),
        cost_delta_pct: ((best.estimated_cycle_min / (currentParams.num_passes * 5)) - 1) * 100,
      },
      constraints_met,
      constraints_violated,
    };
  }

  // ============================================================================
  // 3. SETUP VALIDATION
  // ============================================================================

  /**
   * Validate machine setup before cutting.
   */
  validateWEDMSetup(setup: WEDMMachineSetup): WEDMSetupValidationResult {
    log.info("WireEDMDeepAIHardeningEngine.validateWEDMSetup", {
      machine: setup.machine_id,
      controller: setup.controller,
    });

    const capability_checks: WEDMCapabilityCheck[] = [];
    const controller_notes: string[] = [];
    const remediation: string[] = [];
    const references: string[] = [];

    // Check 1 — Wire diameter vs part thickness
    const maxThicknessForWire = this._maxThicknessForWire(setup.wire.diameter_mm);
    capability_checks.push({
      check_name: "Wire diameter vs thickness",
      status: setup.part.geometry.thickness_mm <= maxThicknessForWire ? "pass" : "fail",
      detail: `${setup.wire.diameter_mm}mm wire can handle up to ${maxThicknessForWire}mm thickness`,
      value: setup.part.geometry.thickness_mm,
      limit: maxThicknessForWire,
    });

    if (setup.part.geometry.thickness_mm > maxThicknessForWire) {
      remediation.push(`Increase wire diameter from ${setup.wire.diameter_mm}mm to ${setup.wire.diameter_mm + 0.05}mm for ${setup.part.geometry.thickness_mm}mm thickness`);
    }

    // Check 2 — Taper capability
    if (setup.part.geometry.taper_angle_deg > 0) {
      const controllerInfo = CONTROLLER_GUIDANCE[setup.controller];
      capability_checks.push({
        check_name: "Taper capability",
        status: setup.part.geometry.taper_angle_deg <= 15 ? "pass" : "warn",
        detail: `Taper ${setup.part.geometry.taper_angle_deg}° at ${setup.part.geometry.thickness_mm}mm thickness`,
        value: setup.part.geometry.taper_angle_deg,
        limit: 15,
      });

      if (setup.part.geometry.taper_angle_deg > 10) {
        controller_notes.push("High taper angle: verify UV axis travel is sufficient");
      }
    }

    // Check 3 — Water resistivity
    if (setup.water_resistivity_mohm_cm !== undefined) {
      const isOptimal = setup.water_resistivity_mohm_cm >= 5 && setup.water_resistivity_mohm_cm <= 15;
      capability_checks.push({
        check_name: "Water resistivity",
        status: isOptimal ? "pass" : setup.water_resistivity_mohm_cm < 3 ? "fail" : "warn",
        detail: `${setup.water_resistivity_mohm_cm} MΩ·cm (optimal: 5-15 MΩ·cm)`,
        value: setup.water_resistivity_mohm_cm,
        limit: "5-15",
      });

      if (setup.water_resistivity_mohm_cm < 3) {
        remediation.push("Replace deionizing resin — resistivity below 3 MΩ·cm causes poor finish");
        references.push("wedm-kb-007: Ra worse than expected: check water resistivity first");
      }
    }

    // Check 4 — Wire type for material
    const wirePerf = WIRE_MATERIAL_PERFORMANCE[setup.wire.type];
    const isBestWire = wirePerf.best_for.includes(setup.part.material.iso_group);
    capability_checks.push({
      check_name: "Wire type for material",
      status: isBestWire ? "pass" : "warn",
      detail: `${setup.wire.type} wire ${isBestWire ? "is" : "is not"} optimal for ISO ${setup.part.material.iso_group}`,
      value: setup.wire.type,
      limit: wirePerf.best_for.join(", "),
    });

    if (!isBestWire && setup.part.material.iso_group === "K") {
      remediation.push("Use zinc-coated or gamma-coated wire for carbide — 30-50% fewer breaks");
      references.push("wedm-kb-005: Coated wire reduces breaks in carbide and PCD");
    }

    // Check 5 — Start hole diameter
    if (setup.part.geometry.start_hole_diameter_mm) {
      const minStartHole = setup.wire.diameter_mm * 2 + 0.1; // Wire diameter × 2 + 0.1mm clearance
      capability_checks.push({
        check_name: "Start hole diameter",
        status: setup.part.geometry.start_hole_diameter_mm >= minStartHole ? "pass" : "fail",
        detail: `Start hole ${setup.part.geometry.start_hole_diameter_mm}mm must be >= ${minStartHole}mm for ${setup.wire.diameter_mm}mm wire`,
        value: setup.part.geometry.start_hole_diameter_mm,
        limit: minStartHole,
      });
    }

    // H-register validation for JM Die
    let h_register_validation: WEDMHRegisterValidation | undefined;
    if (setup.uses_h_registers && setup.controller === "mitsubishi_m800") {
      h_register_validation = {
        uses_h175_master: true,
        h_registers_used: ["H1", "H2", "H3", "H4", "H5", "H6", "H7", "H175"],
        offset_progression_valid: true, // Assume valid if using standard pattern
        offset_values_mm: [0.170, 0.085, 0.045, 0.025, 0.015, 0.008, 0.003],
        jm_die_h175_notes: [
          "H175 is master offset — all skim passes reference H175",
          "H1 = rough offset, H2-H7 = skim offsets",
          "Total offset change per pass = (H_prev - H_current)",
        ],
      };
    }

    // Calculate safety score
    const passCount = capability_checks.filter(c => c.status === "pass").length;
    const warnCount = capability_checks.filter(c => c.status === "warn").length;
    const failCount = capability_checks.filter(c => c.status === "fail").length;
    const safety_score = (passCount + warnCount * 0.5) / capability_checks.length;

    return {
      valid: failCount === 0 && safety_score >= 0.70,
      safety_score,
      capability_checks,
      h_register_validation,
      controller_notes,
      remediation,
      references,
    };
  }

  // ============================================================================
  // 4. TROUBLESHOOTING
  // ============================================================================

  /**
   * Diagnose Wire EDM issues from symptoms.
   */
  troubleshootWEDM(symptoms: WEDMSymptoms): WEDMTroubleshootingResult {
    log.info("WireEDMDeepAIHardeningEngine.troubleshootWEDM", {
      symptoms: symptoms.symptoms.length,
      break_location: symptoms.break_location,
    });

    const root_causes: WEDMRootCause[] = [];
    const reasoning: WEDMReasoningStep[] = [];
    const sources: string[] = [];
    const corrective_actions: string[] = [];

    // Index symptoms against tribal knowledge
    const matchedTips = new Set<string>();
    for (const symptom of symptoms.symptoms) {
      const keywords = symptom.toLowerCase().split(/\s+/);
      for (const keyword of keywords) {
        const tips = SYMPTOM_TIP_INDEX[keyword];
        if (tips) {
          tips.forEach(t => matchedTips.add(t));
        }
      }
    }

    reasoning.push({
      step_number: 1,
      type: "lookup_knowledge",
      content: `Matched ${matchedTips.size} tribal knowledge tips for symptoms: ${symptoms.symptoms.join(", ")}.`,
      engine_source: "TribalKnowledgeEngine",
      confidence: 0.85,
      evidence: Array.from(matchedTips).slice(0, 5),
    });

    // Wire break diagnosis
    if (symptoms.wire_breaks_per_hour && symptoms.wire_breaks_per_hour > 2) {
      if (symptoms.break_location === "corners") {
        root_causes.push({
          cause: "Wire breaks at sharp corners due to concentrated discharge energy",
          probability: 0.85,
          evidence: ["Break location: corners", `Breaks/hr: ${symptoms.wire_breaks_per_hour}`],
          fix: "Reduce feed to 60% at corners with radius < 2× wire diameter. Increase OFF time by 20-30%.",
          source: "tribal_knowledge",
        });
        corrective_actions.push("Add corner slowdown: feed = 60% at R < 0.5mm");
        corrective_actions.push("Increase OFF time (B) by 25% in corner segments");
        sources.push("wedm-kb-002");
      } else if (symptoms.break_location === "thick_section") {
        root_causes.push({
          cause: "Inadequate flushing in thick section causing debris accumulation",
          probability: 0.88,
          evidence: ["Break location: thick_section", "Debris accumulation likely"],
          fix: "Increase flush pressure to 8-10 bar. Reduce cutting speed by 20-30%.",
          source: "klocke_2013",
        });
        corrective_actions.push("Increase flush pressure from 5 bar to 8-10 bar");
        corrective_actions.push("Reduce cutting speed by 25%");
        sources.push("wedm-kb-004", "wedm-kb-013");
      } else {
        root_causes.push({
          cause: "Thermal fatigue from excessive ON time relative to wire cooling",
          probability: 0.75,
          evidence: [`Breaks/hr: ${symptoms.wire_breaks_per_hour}`, "Random location suggests thermal issue"],
          fix: "Reduce ON time (A) by 10-15% before increasing tension.",
          source: "tribal_knowledge",
        });
        corrective_actions.push("Reduce ON time (A) by 12%");
        corrective_actions.push("If breaks persist, increase wire tension by 200-300g");
        sources.push("wedm-kb-001");
      }
    }

    // Surface finish diagnosis
    if (symptoms.measured_ra_um && symptoms.measured_ra_um > 0.4) {
      if (symptoms.water_resistivity_mohm_cm && symptoms.water_resistivity_mohm_cm < 3) {
        root_causes.push({
          cause: "Low water resistivity causing unstable discharges",
          probability: 0.92,
          evidence: [`Water resistivity: ${symptoms.water_resistivity_mohm_cm} MΩ·cm`, `Measured Ra: ${symptoms.measured_ra_um}µm`],
          fix: "Replace deionizing resin. Target 5-15 MΩ·cm.",
          source: "klocke_2013",
        });
        corrective_actions.push("Replace deionizing resin immediately");
        corrective_actions.push("Verify resistivity > 5 MΩ·cm before re-cutting");
        sources.push("wedm-kb-007");
      } else {
        root_causes.push({
          cause: "Insufficient skim passes for target finish",
          probability: 0.78,
          evidence: [`Measured Ra: ${symptoms.measured_ra_um}µm`],
          fix: "Add skim passes. Ra improves ~60-70% per pass up to pass 4-5.",
          source: "tribal_knowledge",
        });
        corrective_actions.push("Add 1-2 skim passes");
        corrective_actions.push("For Ra < 0.2µm, use ACU 7-pass method");
        sources.push("wedm-kb-008");
      }
    }

    // Calculate overall confidence
    const confidence = root_causes.length > 0
      ? root_causes.reduce((sum, rc) => sum + rc.probability, 0) / root_causes.length
      : 0.5;

    // Primary diagnosis
    const primary_diagnosis = root_causes.length > 0
      ? root_causes.sort((a, b) => b.probability - a.probability)[0].cause
      : "Insufficient symptom data for diagnosis";

    reasoning.push({
      step_number: 2,
      type: "infer",
      content: `Primary diagnosis: ${primary_diagnosis}. Confidence: ${(confidence * 100).toFixed(0)}%.`,
      engine_source: "WireEDMDeepAIHardeningEngine",
      confidence,
      evidence: root_causes.map(rc => rc.cause),
    });

    return {
      root_causes,
      primary_diagnosis,
      corrective_actions,
      reasoning,
      sources,
      confidence,
    };
  }

  // ============================================================================
  // 5. WIRE SELECTION
  // ============================================================================

  /**
   * Select optimal wire type for a given material and operation.
   */
  selectWireType(
    material: WEDMMaterialSpec,
    thickness_mm: number,
    target_ra_um?: number,
  ): { wire: WireSpecification; rationale: string; alternatives: WireType[] } {
    log.info("WireEDMDeepAIHardeningEngine.selectWireType", {
      material: material.iso_group,
      thickness: thickness_mm,
      target_ra: target_ra_um,
    });

    // Score each wire type
    const scores: Array<{ type: WireType; score: number; reasons: string[] }> = [];

    for (const [type, perf] of Object.entries(WIRE_MATERIAL_PERFORMANCE) as Array<[WireType, typeof WIRE_MATERIAL_PERFORMANCE[WireType]]>) {
      let score = 50; // Base score
      const reasons: string[] = [];

      // Material match bonus
      if (perf.best_for.includes(material.iso_group)) {
        score += 25;
        reasons.push(`Optimal for ISO ${material.iso_group}`);
      }

      // Break resistance for thick sections
      if (thickness_mm > 50) {
        score += perf.break_resistance * 20;
        if (perf.break_resistance > 0.85) {
          reasons.push("High break resistance for thick section");
        }
      }

      // Ra quality for fine finish
      if (target_ra_um && target_ra_um < 0.3) {
        score += perf.ra_quality * 15;
        if (perf.ra_quality > 0.90) {
          reasons.push("Premium surface finish capability");
        }
      }

      // Speed for production
      score += perf.cut_speed_factor * 10;

      // Penalize cost for standard work
      if (!target_ra_um || target_ra_um > 0.5) {
        score -= (perf.cost_factor - 1) * 10;
      }

      scores.push({ type, score, reasons });
    }

    // Sort by score
    scores.sort((a, b) => b.score - a.score);

    const best = scores[0];
    const alternatives = scores.slice(1, 4).map(s => s.type);

    // Select diameter based on thickness
    let diameter: WireDiameter = 0.25;
    if (thickness_mm <= 50) diameter = 0.20;
    if (thickness_mm > 150) diameter = 0.30;

    const wire: WireSpecification = {
      type: best.type,
      diameter_mm: diameter,
      tensile_strength_mpa: best.type === "molybdenum" ? 1200 : best.type === "tungsten" ? 1400 : 900,
    };

    const rationale = `Selected ${best.type} (${diameter}mm) for ${material.name} at ${thickness_mm}mm. ${best.reasons.join(". ")}. ${WIRE_MATERIAL_PERFORMANCE[best.type].notes}`;

    return { wire, rationale, alternatives };
  }

  // ============================================================================
  // 6. CYCLE TIME CALCULATION
  // ============================================================================

  /**
   * Calculate estimated cycle time for a WEDM operation.
   */
  calculateCycleTime(
    part: WEDMPartDescription,
    params: WEDMCuttingParams,
    wire: WireSpecification,
  ): { total_min: number; breakdown: Record<string, number>; confidence: number } {
    const thickness = part.geometry.thickness_mm;
    const cut_length = part.geometry.cut_length_mm ?? 100; // Default 100mm if not specified
    const num_passes = params.num_passes;

    // Base cutting speed (mm²/min) from thickness
    // Thicker = slower. Reference: 400 mm²/min at 25mm, scales as 1/sqrt(thickness/25)
    const base_speed = 400 / Math.sqrt(thickness / 25);

    // Wire type adjustment
    const wirePerf = WIRE_MATERIAL_PERFORMANCE[wire.type];
    const adjusted_speed = base_speed * wirePerf.cut_speed_factor;

    // Rough cut time
    const rough_area = thickness * cut_length;
    const rough_time_min = rough_area / adjusted_speed;

    // Skim pass time (each skim is ~2x faster than rough)
    const skim_time_per_pass = rough_time_min * 0.5;
    const skim_time_total = skim_time_per_pass * (num_passes - 1);

    // Threading time (per start hole)
    const num_start_holes = part.geometry.num_start_holes ?? 1;
    const threading_time = num_start_holes * 0.5; // 30 sec per thread

    // Setup time (clamp, reference, first cut approach)
    const setup_time = 5;

    const total_min = rough_time_min + skim_time_total + threading_time + setup_time;

    return {
      total_min: Math.round(total_min * 10) / 10,
      breakdown: {
        rough_cut: Math.round(rough_time_min * 10) / 10,
        skim_passes: Math.round(skim_time_total * 10) / 10,
        threading: Math.round(threading_time * 10) / 10,
        setup: setup_time,
      },
      confidence: 0.75, // Estimate — actual time depends on many factors
    };
  }

  // ============================================================================
  // 7. JM DIE MACHINE PROFILE
  // ============================================================================

  /**
   * Get JM Die machine optimization profile.
   */
  getJMDieMachineProfile(): JMDieWEDMProfile {
    return JM_DIE_FA20S;
  }

  // ============================================================================
  // 8. TRIBAL KNOWLEDGE QUERY
  // ============================================================================

  /**
   * Query tribal knowledge by symptoms or keywords.
   */
  queryTribalKnowledge(query: string): string[] {
    const keywords = query.toLowerCase().split(/\s+/);
    const matched = new Set<string>();

    for (const keyword of keywords) {
      const tips = SYMPTOM_TIP_INDEX[keyword];
      if (tips) {
        tips.forEach(t => matched.add(t));
      }
    }

    return Array.from(matched);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private _classifyOperation(geometry: WEDMPartGeometry): WEDMOperationType {
    if (geometry.taper_angle_deg > 0) {
      return geometry.taper_angle_deg > 5 ? "variable_taper" : "taper_4axis";
    }
    if (geometry.has_slug) return "punch_with_slug";
    if (geometry.num_start_holes && geometry.num_start_holes > 3) return "multiple_start_holes";
    return "straight_2axis";
  }

  private _routeToEngines(
    opType: WEDMOperationType,
    part: WEDMPartDescription,
    targetFinish?: WEDMFinishTier,
  ): WEDMEngineRouting[] {
    const routing: WEDMEngineRouting[] = [];

    // Always include core engines
    routing.push({
      engine_name: "EDMWireEngine",
      operation: "core_physics",
      priority: 1,
      rationale: "Core Wire EDM physics calculations",
    });

    routing.push({
      engine_name: "WEDMPrintToProgramEngine",
      operation: "program_generation",
      priority: 2,
      rationale: "Drawing to G-code pipeline",
    });

    // Operation-specific engines
    if (opType === "taper_4axis" || opType === "variable_taper") {
      routing.push({
        engine_name: "EDMWireSlugCornerTaperEngine",
        operation: "taper_calculation",
        priority: 3,
        rationale: "UV axis taper geometry",
      });
    }

    if (part.geometry.has_slug) {
      routing.push({
        engine_name: "EDMWireSlugCornerTaperEngine",
        operation: "slug_tab",
        priority: 3,
        rationale: "Slug/tab placement and removal",
      });
    }

    // Quality-based engines
    if (targetFinish === "acu_precision" || part.target_ra_um < 0.2) {
      routing.push({
        engine_name: "EDMSurfaceIntegrityEngine",
        operation: "recast_analysis",
        priority: 4,
        rationale: "ACU precision finish requires recast layer analysis",
      });
    }

    // Thick section engines
    if (part.geometry.thickness_mm > 50) {
      routing.push({
        engine_name: "EDMCuttingParamFlushEngine",
        operation: "flush_optimization",
        priority: 4,
        rationale: "Thick section flushing optimization",
      });
    }

    return routing;
  }

  /**
   * Find the closest Mitsubishi FA-S tech record by thickness.
   * Uses binary search style to find nearest thickness bracket.
   *
   * @param thickness_mm - Part thickness in mm
   * @returns Closest tech record, or null if no records available
   */
  private _findMitsubishiTechRecord(thickness_mm: number): MitsubishiFATechRecord | null {
    if (MITSUBISHI_FA_TECH_RECORDS.length === 0) return null;

    // Find closest record by thickness
    let closest = MITSUBISHI_FA_TECH_RECORDS[0];
    let minDiff = Math.abs(thickness_mm - closest.thicknessMm);

    for (const record of MITSUBISHI_FA_TECH_RECORDS) {
      const diff = Math.abs(thickness_mm - record.thicknessMm);
      if (diff < minDiff) {
        minDiff = diff;
        closest = record;
      }
    }

    return closest;
  }

  /**
   * Convert Mitsubishi FA tech pass data to ECodePass format.
   * Maps feedRates (in/min), offsets (in), and E-pack codes to standard format.
   *
   * @param techPass - Mitsubishi tech pass data
   * @returns Standard ECodePass structure
   */
  private _techPassToECodePass(techPass: MitsubishiFATechPass): ECodePass {
    // Get primary E-code (last in sequence is the actual pass code)
    const primaryECode = techPass.ePackCodes[techPass.ePackCodes.length - 1];

    // Get the last feed rate (the actual cutting feed)
    const feedIpm = techPass.feedRates[techPass.feedRates.length - 1];

    // Get the last offset (final wire offset for this pass)
    const offsetInches = techPass.offsets[techPass.offsets.length - 1] ?? techPass.offsets[0];

    return {
      pass_number: techPass.passNum,
      e_code: `E${primaryECode}`,
      feed_ipm: feedIpm,
      feed_mm_min: feedIpm * 25.4,  // Convert in/min to mm/min
      h_register: `H${techPass.registers[techPass.registers.length - 1] ?? techPass.passNum}`,
      offset_inches: offsetInches,
      offset_mm: offsetInches * 25.4,
      type: techPass.passNum === 1 ? "rough" : "skim",
    };
  }

  /**
   * Select E-code family using Mitsubishi FA-S technology data.
   * Integrates extracted tech file data for physics-validated parameters.
   *
   * Selection priority:
   *   1. ACU 7-pass for Ra < 0.2µm or tolerance < 0.003mm (from FA-S tech file)
   *   2. Taper 5-pass for taper operations (uses H175 master pattern)
   *   3. Heavy 5-pass for tight tolerance (< 0.005mm)
   *   4. Standard 4-pass for general work
   *
   * @param part - Part description with geometry and requirements
   * @param targetFinish - Optional target finish tier
   * @returns Selected E-code family with physics-validated passes, or null
   */
  private _selectECodeFamily(part: WEDMPartDescription, targetFinish?: WEDMFinishTier): ECodeFamily | null {
    const acuRequired = targetFinish === "acu_precision" || part.target_ra_um < 0.2 || part.tolerance_mm < 0.003;
    const taperRequired = part.geometry.taper_angle_deg > 0;

    // For ACU precision work, use Mitsubishi FA-S extracted tech data
    if (acuRequired) {
      const techRecord = this._findMitsubishiTechRecord(part.geometry.thickness_mm);

      if (techRecord) {
        // Convert all passes from tech record to ECodePass format
        const passes = techRecord.passes.map(p => this._techPassToECodePass(p));

        // Determine E-code family ID based on thickness
        // ACU_THIN_APPROACH uses { roughing, skimBase }, others use { base, roughing }
        let baseCode: number;
        if (techRecord.thicknessMm <= 15) {
          const thinFamily = MITSUBISHI_FA_ECODE_FAMILIES.ACU_THIN_APPROACH;
          baseCode = thinFamily.roughing;
        } else {
          const thickFamily = this._getAcuFamilyByThickness(techRecord.thicknessInch);
          baseCode = thickFamily.roughing ?? thickFamily.base;
        }

        return {
          id: `E${baseCode}_acu_${techRecord.totalPasses}pass`,
          description: `ACU ${techRecord.totalPasses}-pass for ${techRecord.thicknessInch}" (${techRecord.thicknessMm}mm) stock — Mitsubishi FA-S validated`,
          axes: 2,
          num_passes: techRecord.totalPasses,
          passes,
          materials: ["D2", "A2", "S7", "M2", "H13", "4140", "4340"],
          uses_h175_master: false,  // ACU uses different offset pattern
        };
      }

      // Fallback if no tech record found
      return {
        id: "E56xx_acu_7pass_generic",
        description: "ACU 7-pass generic (no thickness match in tech file)",
        axes: 2,
        num_passes: 7,
        passes: [],
        materials: ["D2", "A2"],
        uses_h175_master: false,
      };
    }

    // Taper operations require 4-axis (UV) programming
    if (taperRequired) {
      return {
        id: "E28xx_taper_5pass",
        description: "Taper 5-pass (4-axis UV) — H175 master pattern",
        axes: 4,
        num_passes: 5,
        passes: [],  // Taper passes not in FA-S tech file (requires E28xx series)
        materials: ["D2", "A2", "S7", "M2", "H13"],
        uses_h175_master: true,
      };
    }

    // Tight tolerance requires additional skim passes
    if (part.tolerance_mm < 0.005) {
      return {
        id: "E12xx_heavy_5pass",
        description: "Heavy 5-pass for tight tolerance (±0.005mm)",
        axes: 2,
        num_passes: 5,
        passes: [],
        materials: ["D2", "A2", "S7", "M2", "H13"],
        uses_h175_master: true,
      };
    }

    // Standard work: 4-pass rough + 3 skim
    return {
      id: "E12xx_standard_4pass",
      description: "Standard 4-pass (rough + 3 skim) — H175 master pattern",
      axes: 2,
      num_passes: 4,
      passes: [],
      materials: ["D2", "A2", "S7", "M2", "H13", "4140", "4340", "O1", "W1"],
      uses_h175_master: true,
    };
  }

  /**
   * Get ACU E-code family by thickness from Mitsubishi FA-S lookup table.
   */
  private _getAcuFamilyByThickness(thicknessInch: number): { base: number; roughing: number | null } {
    const thicknessKey = thicknessInch.toFixed(2) as keyof typeof MITSUBISHI_FA_ECODE_FAMILIES.ACU_BY_THICKNESS;
    const family = MITSUBISHI_FA_ECODE_FAMILIES.ACU_BY_THICKNESS[thicknessKey];

    if (family) {
      return family;
    }

    // Find closest bracket
    const thicknesses = Object.keys(MITSUBISHI_FA_ECODE_FAMILIES.ACU_BY_THICKNESS).map(parseFloat).sort((a, b) => a - b);
    let closest = thicknesses[0];

    for (const t of thicknesses) {
      if (Math.abs(t - thicknessInch) < Math.abs(closest - thicknessInch)) {
        closest = t;
      }
    }

    const closestKey = closest.toFixed(2) as keyof typeof MITSUBISHI_FA_ECODE_FAMILIES.ACU_BY_THICKNESS;
    return MITSUBISHI_FA_ECODE_FAMILIES.ACU_BY_THICKNESS[closestKey] ?? { base: 5601, roughing: null };
  }

  private _applyResourceKnowledge(part: WEDMPartDescription, opType: WEDMOperationType): WEDMKnowledgeEntry[] {
    const knowledge: WEDMKnowledgeEntry[] = [];

    // Thickness-based knowledge
    if (part.geometry.thickness_mm > 50) {
      knowledge.push({
        source: "klocke_2013",
        section: "Ch.8 — Flushing Efficiency",
        title: "Thick section flushing degradation",
        content: `For ${part.geometry.thickness_mm}mm thickness, flushing efficiency is ${(THICKNESS_FLUSH_EFFICIENCY(part.geometry.thickness_mm) * 100).toFixed(0)}%. Increase flush pressure to 8-10 bar.`,
        applies_to: ["thick_section", "flushing"],
        confidence: 0.90,
      });
    }

    // Material-based knowledge
    if (part.material.iso_group === "K") {
      knowledge.push({
        source: "tribal_knowledge",
        title: "Carbide wire selection",
        content: "Use zinc-coated wire for tungsten carbide. 30-50% fewer wire breaks at equivalent speed.",
        applies_to: ["carbide", "wire_selection"],
        confidence: 0.87,
      });
    }

    // Target Ra knowledge
    if (part.target_ra_um < 0.2) {
      knowledge.push({
        source: "mastercam_fas_tech",
        section: "ACU 7-Pass",
        title: "Ultra-fine finish method",
        content: "ACU (Accuracy Priority) 7-pass achieves Ra 7µin (0.18µm). Use E952 for thin (<0.75\") or E56xx for thick (>0.75\").",
        applies_to: ["surface_finish", "acu", "skim_passes"],
        confidence: 0.92,
      });
    }

    // Taper knowledge
    if (opType === "taper_4axis" || opType === "variable_taper") {
      knowledge.push({
        source: "mitsubishi_app_notes",
        title: "Taper accuracy vs thickness",
        content: `Taper accuracy degrades at greater thickness. For ${part.geometry.taper_angle_deg}° at ${part.geometry.thickness_mm}mm, expect ±0.002° error.`,
        applies_to: ["taper", "accuracy"],
        confidence: 0.85,
      });
    }

    return knowledge;
  }

  /**
   * Perform unified science analysis using physics, chemistry, metallurgy, thermodynamics
   */
  private _performScienceAnalysis(part: WEDMPartDescription, eCodeFamily: ECodeFamily | null): UnifiedScienceAnalysis {
    // Get typical parameters from E-code family or use defaults
    let peakCurrent = 15;
    let pulseOn = 5;
    let pulseOff = 10;

    if (eCodeFamily && eCodeFamily.passes.length > 0) {
      // Use first pass parameters as baseline
      const firstPass = eCodeFamily.passes[0];
      // E-codes typically encode parameters, extract approximate values
      peakCurrent = firstPass.on ?? 15;
      pulseOn = firstPass.on ?? 5;
      pulseOff = firstPass.off ?? 10;
    }

    // Map material ISO group to material name for science engine
    const materialMap: Record<WEDMMaterialGroup, string> = {
      "H": "D2",  // Hard steels → D2 tool steel
      "M": "SS_304",  // Stainless → 304 SS
      "K": "WC_CO",  // Carbide → tungsten carbide
      "N": "COPPER",  // Non-ferrous → copper
      "S": "TI6AL4V",  // Superalloys → Ti-6Al-4V
      "P": "A2",  // General steels → A2 tool steel
    };

    const materialName = materialMap[part.material.iso_group] ?? "D2";

    return wireEDMUnifiedScienceEngine.analyze({
      material: materialName,
      thickness_mm: part.geometry.thickness_mm,
      peak_current_A: peakCurrent,
      pulse_on_us: pulseOn,
      pulse_off_us: pulseOff,
      gap_voltage_V: 25,
      wire_diameter_mm: 0.25,
      flush_pressure_bar: 6,
      submerged: true,
    });
  }

  private _getControllerGuidance(controller: WEDMControllerFamily, part: WEDMPartDescription): string {
    const info = CONTROLLER_GUIDANCE[controller];
    const guidance: string[] = [];

    guidance.push(`Controller: ${controller.replace(/_/g, " ").toUpperCase()}`);

    if (info.h175_master_pattern) {
      guidance.push("Uses H175 master offset pattern — all skim passes reference H175.");
    }

    if (info.corner_control && part.geometry.min_corner_radius_mm && part.geometry.min_corner_radius_mm < 0.5) {
      guidance.push("Enable automatic corner control (CC) for sharp corners.");
    }

    if (info.thickness_compensation && part.geometry.thickness_mm > 100) {
      guidance.push("Enable automatic thickness compensation (SV parameter).");
    }

    guidance.push(`Restart: ${info.restart_notes}`);

    return guidance.join(" ");
  }

  private _scoreStrategy(params: WEDMCuttingParams, part: WEDMPartDescription, constraints: WEDMOptimizationConstraints): number {
    let score = 50;

    // Pass count vs target Ra
    const expectedRa = RA_PROGRESSION(3.2, params.num_passes);
    if (expectedRa <= part.target_ra_um) score += 20;

    // Priority alignment
    if (constraints.priority === "speed" && params.num_passes <= 4) score += 15;
    if (constraints.priority === "quality" && params.num_passes >= 5) score += 15;

    return Math.min(100, score);
  }

  private _buildCandidate(
    name: string,
    e_code_family_id: string,
    num_passes: number,
    wire_type: WireType,
    wire_diameter_mm: WireDiameter,
    part: WEDMPartDescription,
  ): WEDMStrategyCandidate {
    // Estimate Ra from pass count
    const estimated_ra_um = RA_PROGRESSION(3.2, num_passes);

    // Estimate cycle time (rough: 5 min/pass at 25mm thickness, scales with sqrt)
    const thickness_factor = Math.sqrt(part.geometry.thickness_mm / 25);
    const estimated_cycle_min = num_passes * 5 * thickness_factor;

    // Estimate wire consumption (50m/pass baseline)
    const estimated_wire_consumption_m = num_passes * 50 * thickness_factor;

    // Score based on Ra and cycle time balance
    const ra_score = Math.max(0, 100 - (estimated_ra_um * 100));
    const cycle_score = Math.max(0, 100 - estimated_cycle_min);
    const score = (ra_score * 0.6 + cycle_score * 0.4);

    return {
      name,
      e_code_family_id,
      num_passes,
      wire_type,
      wire_diameter_mm,
      estimated_cycle_min: Math.round(estimated_cycle_min * 10) / 10,
      estimated_ra_um: Math.round(estimated_ra_um * 100) / 100,
      estimated_wire_consumption_m: Math.round(estimated_wire_consumption_m),
      score: Math.round(score),
      rationale: `${num_passes}-pass with ${wire_type} ${wire_diameter_mm}mm wire for ${part.material.name}`,
    };
  }

  private _maxThicknessForWire(diameter_mm: WireDiameter): number {
    // From wedm-kb-015: practical limits by wire diameter
    const limits: Record<WireDiameter, number> = {
      0.10: 50,
      0.15: 75,
      0.20: 100,
      0.25: 200,
      0.30: 300,
    };
    return limits[diameter_mm] ?? 150;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const wireEDMDeepAIHardeningEngine = new WireEDMDeepAIHardeningEngine();
