/**
 * CamBridgeKitEngine — ECHO-CAM-BRIDGES-MS0
 *
 * Five lightweight bridges making the BRIDGE-DEEP wiring concrete:
 *
 *   1. cad_cam_handoff          — CAD AI geometry → CAM AI strategy seed
 *   2. operator_gates_emit      — operator-in-the-loop gates across CAD/CAM/post
 *   3. sfc_fusion_bridge        — SpeedFeedOrchestrator output → Fusion 360 cycle params
 *   4. sfc_hypermill_bridge     — SFC output → hyperMILL OptiRough cycle params
 *   5. sfc_inventorhsm_bridge   — SFC output → Inventor HSM adaptive cycle params
 *
 * Each bridge is a pure function — no I/O, no MCP imports. They translate
 * one engine's canonical output shape into another engine's canonical input
 * shape, preserving CAM-system context per echo's slot-soul refuse-list
 * (no lossy translation, no dropped tool number assignments / WCS deltas).
 *
 * Per echo's CAM-domain doctrine: speed/feed values are NEVER inlined — every
 * bridge reads from an SFC-shaped input the caller supplies (call
 * `cam_speedfeed_compute` upstream, then hand the result to a bridge).
 *
 * @milestone ECHO-CAM-BRIDGES-MS0
 * @version 1.0.0
 */

import { z } from "zod";

// ============================================================================
// SHARED SHAPES
// ============================================================================

/** Output shape from SpeedFeedOrchestrator that all SFC→CAM bridges consume. */
export const SFCResultSchema = z.object({
  vc_m_min: z.number().min(0).describe("Cutting velocity (m/min)"),
  fz_mm_tooth: z.number().min(0).describe("Feed per tooth (mm/tooth)"),
  ap_mm: z.number().min(0).describe("Axial depth of cut (mm)"),
  ae_mm: z.number().min(0).describe("Radial depth of cut / step-over (mm)"),
  rpm: z.number().min(0).describe("Spindle speed (RPM) — derived from vc + tool diameter"),
  feed_mm_min: z.number().min(0).describe("Table feed (mm/min) — derived from fz × rpm × z"),
  tool_diameter_mm: z.number().min(0),
  tool_teeth: z.number().int().min(1),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  confidence: z.number().min(0).max(1).optional(),
});
export type SFCResult = z.infer<typeof SFCResultSchema>;

/** Canonical CAD-AI geometry payload (subset — enough to seed a CAM strategy). */
export const CADGeometrySchema = z.object({
  part_id: z.string(),
  source: z.literal("cad_ai_generate"),
  bounding_box_mm: z.object({
    x: z.number().min(0),
    y: z.number().min(0),
    z: z.number().min(0),
  }),
  features: z.array(z.object({
    id: z.string(),
    type: z.string(),
    /** Cycle hint inferred by the CAD AI — bridge passes through as a strategy seed; CAM AI may override. */
    cycle_hint: z.string().optional(),
    /** Tolerance band (mm) — feeds finishing-pass planning downstream. */
    tolerance_total_mm: z.number().min(0).optional(),
  })).min(1),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  /** Datums the CAD AI placed — CAM AI consumes for WCS preservation per echo refuse-list. */
  datums: z.array(z.string()).optional(),
});
export type CADGeometry = z.infer<typeof CADGeometrySchema>;

/** Operator gate decision points across CAD/CAM/post pipeline boundaries. */
export const OperatorGateStageSchema = z.enum([
  "cad_geometry_review",
  "cam_strategy_review",
  "cam_toolpath_review",
  "post_processor_review",
  "gcode_release_review",
]);
export type OperatorGateStage = z.infer<typeof OperatorGateStageSchema>;

// ============================================================================
// 1. cad_cam_handoff — CAD AI → CAM AI strategy seed
// ============================================================================

export const CamStrategySeedSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  source: z.literal("cad_cam_handoff"),
  part_id: z.string(),
  candidate_features: z.array(z.object({
    feature_id: z.string(),
    feature_type: z.string(),
    seed_strategy_id: z.string(),
    tolerance_total_mm: z.number().optional(),
  })).min(1),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  preserved_datums: z.array(z.string()),
  bounding_box_mm: CADGeometrySchema.shape.bounding_box_mm,
  /** Echo refuse-list: cycle hints from CAD MUST flow through; loss = R12 violation. */
  unhandled_cycle_hints: z.array(z.string()),
});
export type CamStrategySeed = z.infer<typeof CamStrategySeedSchema>;

/**
 * Map CAD-AI cycle_hint strings to CAM strategy_ids. Surface-level — CAM AI
 * applies tribal-knowledge + material adjustments downstream.
 */
const CYCLE_HINT_TO_STRATEGY: Record<string, string> = {
  rough: "rough_adaptive",
  finish: "finish_contour",
  drill: "drill_peck",
  bore: "bore_finish",
  thread: "thread_cycle",
  pocket: "rough_pocket_adaptive",
  slot: "rough_slot",
  contour: "finish_contour",
  face: "face_mill",
};

function cadCamHandoff(cad: CADGeometry): CamStrategySeed {
  CADGeometrySchema.parse(cad);
  const unhandled: string[] = [];
  const seeds = cad.features.map(f => {
    const hint = f.cycle_hint ?? inferHintFromType(f.type);
    const strategy = CYCLE_HINT_TO_STRATEGY[hint];
    if (!strategy && f.cycle_hint) unhandled.push(f.cycle_hint);
    return {
      feature_id: f.id,
      feature_type: f.type,
      seed_strategy_id: strategy ?? "rough_adaptive",
      tolerance_total_mm: f.tolerance_total_mm,
    };
  });
  return {
    schemaVersion: "1.0.0",
    source: "cad_cam_handoff",
    part_id: cad.part_id,
    candidate_features: seeds,
    material_iso_group: cad.material_iso_group,
    preserved_datums: cad.datums ?? [],
    bounding_box_mm: cad.bounding_box_mm,
    unhandled_cycle_hints: unhandled,
  };
}

function inferHintFromType(type: string): string {
  if (/pocket|cavity/i.test(type)) return "pocket";
  if (/slot/i.test(type)) return "slot";
  if (/drill|hole/i.test(type)) return "drill";
  if (/bore/i.test(type)) return "bore";
  if (/thread/i.test(type)) return "thread";
  if (/face/i.test(type)) return "face";
  if (/contour|profile/i.test(type)) return "contour";
  return "rough";
}

// ============================================================================
// 2. operator_gates_emit — unconditional review gates at autonomous boundaries
// ============================================================================

export const OperatorGateRequestSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  stage: OperatorGateStageSchema,
  artifact_id: z.string(),
  artifact_kind: z.string().describe("e.g. 'cad_part', 'cam_strategy', 'toolpath', 'gcode'"),
  blocking: z.boolean().describe("true = pipeline halts until operator decides"),
  prompt: z.string(),
  required_role: z.enum(["machinist", "programmer", "engineer", "supervisor"]),
  surfaced_at: z.string(),
});
export type OperatorGateRequest = z.infer<typeof OperatorGateRequestSchema>;

export type OperatorRole = "machinist" | "programmer" | "engineer" | "supervisor";

const STAGE_DEFAULTS: Record<OperatorGateStage, { role: OperatorRole; blocking: boolean }> = {
  cad_geometry_review:    { role: "engineer",   blocking: true },
  cam_strategy_review:    { role: "programmer", blocking: true },
  cam_toolpath_review:    { role: "programmer", blocking: true },
  post_processor_review:  { role: "programmer", blocking: false }, // advisory — post must produce valid output regardless
  gcode_release_review:   { role: "machinist",  blocking: true },  // hard gate — machinist signs off on shop floor
};

function operatorGatesEmit(input: {
  stage: OperatorGateStage;
  artifact_id: string;
  artifact_kind: string;
  prompt?: string;
  required_role?: OperatorRole;
}): OperatorGateRequest {
  const defaults = STAGE_DEFAULTS[input.stage];
  return {
    schemaVersion: "1.0.0",
    stage: input.stage,
    artifact_id: input.artifact_id,
    artifact_kind: input.artifact_kind,
    blocking: defaults.blocking,
    prompt: input.prompt ?? `Operator review required at ${input.stage} for ${input.artifact_kind} ${input.artifact_id}`,
    required_role: input.required_role ?? defaults.role,
    surfaced_at: new Date().toISOString(),
  };
}

// ============================================================================
// 3, 4, 5. SFC → CAM-system bridges
// ============================================================================

/**
 * Fusion 360 cycle param shape. Fusion's "adaptive clearing" uses RPM + feed
 * directly plus stepover/stepdown as fractions of tool diameter — bridge
 * computes those from SFC ae/ap and the tool dia.
 */
export const FusionCycleParamsSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  source: z.literal("sfc_fusion_bridge"),
  rpm: z.number().min(0),
  feed_mm_min: z.number().min(0),
  stepover_pct: z.number().min(0).max(100),
  stepdown_mm: z.number().min(0),
  cycle_strategy: z.string(),
});
export type FusionCycleParams = z.infer<typeof FusionCycleParamsSchema>;

function sfcFusionBridge(sfc: SFCResult, opts?: { cycle_strategy?: string }): FusionCycleParams {
  SFCResultSchema.parse(sfc);
  return {
    schemaVersion: "1.0.0",
    source: "sfc_fusion_bridge",
    rpm: sfc.rpm,
    feed_mm_min: sfc.feed_mm_min,
    stepover_pct: sfc.tool_diameter_mm > 0 ? Math.min(100, (sfc.ae_mm / sfc.tool_diameter_mm) * 100) : 0,
    stepdown_mm: sfc.ap_mm,
    cycle_strategy: opts?.cycle_strategy ?? "Adaptive Clearing",
  };
}

/**
 * hyperMILL OptiRough cycle params — uses "MILLING_FEEDRATE" + "PLUNGE_FEEDRATE"
 * named pair, plus "STEPDOWN" and "STEPOVER" with absolute mm units (no pct).
 */
export const HyperMillCycleParamsSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  source: z.literal("sfc_hypermill_bridge"),
  spindle_speed: z.number().min(0),
  milling_feedrate: z.number().min(0),
  plunge_feedrate: z.number().min(0),
  stepdown_mm: z.number().min(0),
  stepover_mm: z.number().min(0),
  cycle_strategy: z.string(),
});
export type HyperMillCycleParams = z.infer<typeof HyperMillCycleParamsSchema>;

function sfcHyperMillBridge(sfc: SFCResult, opts?: { cycle_strategy?: string; plunge_factor?: number }): HyperMillCycleParams {
  SFCResultSchema.parse(sfc);
  const plungeFactor = opts?.plunge_factor ?? 0.3; // hyperMILL convention: plunge = 30% of milling feed
  return {
    schemaVersion: "1.0.0",
    source: "sfc_hypermill_bridge",
    spindle_speed: sfc.rpm,
    milling_feedrate: sfc.feed_mm_min,
    plunge_feedrate: sfc.feed_mm_min * plungeFactor,
    stepdown_mm: sfc.ap_mm,
    stepover_mm: sfc.ae_mm,
    cycle_strategy: opts?.cycle_strategy ?? "OptiRough",
  };
}

/**
 * Inventor HSM adaptive cycle params — uses RPM + feedrate + "Optimal Load"
 * (engagement-controlled stepover) and "Maximum Step Down" (per-pass depth).
 * Optimal Load is expressed as a tool-diameter fraction in HSM.
 */
export const InventorHsmCycleParamsSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  source: z.literal("sfc_inventorhsm_bridge"),
  spindle_rpm: z.number().min(0),
  cutting_feedrate: z.number().min(0),
  optimal_load_mm: z.number().min(0),
  max_step_down_mm: z.number().min(0),
  cycle_strategy: z.string(),
});
export type InventorHsmCycleParams = z.infer<typeof InventorHsmCycleParamsSchema>;

function sfcInventorHsmBridge(sfc: SFCResult, opts?: { cycle_strategy?: string }): InventorHsmCycleParams {
  SFCResultSchema.parse(sfc);
  return {
    schemaVersion: "1.0.0",
    source: "sfc_inventorhsm_bridge",
    spindle_rpm: sfc.rpm,
    cutting_feedrate: sfc.feed_mm_min,
    optimal_load_mm: sfc.ae_mm,
    max_step_down_mm: sfc.ap_mm,
    cycle_strategy: opts?.cycle_strategy ?? "Adaptive 2D",
  };
}

// ============================================================================
// CLASS WRAPPER (project rule: engines as classes with static methods)
// ============================================================================

class CamBridgeKitEngine {
  static cadCamHandoff = cadCamHandoff;
  static operatorGatesEmit = operatorGatesEmit;
  static sfcFusionBridge = sfcFusionBridge;
  static sfcHyperMillBridge = sfcHyperMillBridge;
  static sfcInventorHsmBridge = sfcInventorHsmBridge;
}

export const camBridgeKitEngine = CamBridgeKitEngine;
