/**
 * SolidCAMSafetyHooksEngine — SolidCAM-Specific Safety Validations (E1114)
 *
 * 15 safety rules covering the most common programming mistakes in SolidCAM,
 * with special emphasis on iMachining, 5-axis simultaneous, SWARF, and GPP
 * post-processor compatibility. Each rule produces a structured finding with
 * severity, trigger status, message, and a concrete fix suggestion.
 *
 * Rules:
 *   1.  imachining_boundary      — iMachining boundary must fully enclose machining area
 *   2.  imachining_stepdown      — Step-down per level must not exceed tool flute length
 *   3.  technology_wizard_level  — Level 1-8 must match machine rigidity class
 *   4.  morphing_spiral_collision — Morphing spiral must not intersect islands
 *   5.  hss_stepover             — HSS finishing stepover must produce Ra within spec
 *   6.  sim5axis_tilt_limit      — Simultaneous 5-axis tilt must not exceed machine axis limits
 *   7.  swarf_ruled_surface      — SWARF cutting requires ruled surface — flag if freeform
 *   8.  tool_level_slider        — Tool level slider vs material hardness validation
 *   9.  gpp_post_compatibility   — GPP post must match target controller
 *  10.  solidworks_stock_sync    — SolidWorks stock model must be current revision
 *  11.  imachining_entry_rate    — Entry helical rate must be reduced for hard materials
 *  12.  channel_width            — iMachining channel width vs tool diameter ratio check
 *  13.  rest_machining_stock     — iRest stock model must reflect prior operation
 *  14.  holder_clearance         — Holder must clear clamps and fixtures
 *  15.  thread_mill_pitch        — Thread mill pitch must match thread specification
 *
 * Methods:
 *   validate(operation, tool, material, machine, strategy): SafetyValidationResult
 *   validateAll(operations[]):                              BatchValidationResult
 *   getRules():                                             SafetyRuleDescription[]
 *
 * @engine SolidCAMSafetyHooksEngine
 * @shortcode E1114
 * @dispatcher camDispatcher
 * @actions solidcam_safety_validate, solidcam_safety_validate_all, solidcam_safety_rules
 * @milestone CAMX-MS3/U03
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type SafetySeverity = "critical" | "warning" | "info";

export interface SafetyFinding {
  /** Rule identifier */
  rule_id: string;
  /** Severity level */
  severity: SafetySeverity;
  /** Whether the rule was triggered (i.e. a problem was detected) */
  triggered: boolean;
  /** Human-readable description of the issue (empty string when not triggered) */
  message: string;
  /** Concrete action the programmer should take */
  fix_suggestion: string;
}

export interface SafetyValidationResult {
  /** Total number of rules evaluated */
  rules_evaluated: number;
  /** Number of triggered findings */
  triggered_count: number;
  /** Critical findings count */
  critical_count: number;
  /** Warning findings count */
  warning_count: number;
  /** Info findings count */
  info_count: number;
  /** Overall pass/warn/block verdict */
  verdict: "PASS" | "WARN" | "BLOCK";
  /** All findings, triggered and not */
  findings: SafetyFinding[];
}

export interface BatchValidationResult {
  /** Number of operations validated */
  operation_count: number;
  /** Per-operation results */
  results: Array<{ operation_index: number; operation_name?: string } & SafetyValidationResult>;
  /** Aggregated totals */
  totals: {
    total_triggered: number;
    critical: number;
    warning: number;
    info: number;
  };
  /** Worst verdict across all operations */
  worst_verdict: "PASS" | "WARN" | "BLOCK";
}

export interface SafetyRuleDescription {
  rule_id: string;
  severity: SafetySeverity;
  title: string;
  description: string;
  applies_to: string[];
}

// ─── Operation / Tool / Material / Machine / Strategy inputs ──────────────────

export interface SolidCAMOperation {
  /** Operation name / label for reporting */
  name?: string;
  /** SolidCAM operation type */
  type:
    | "imachining_2d"
    | "imachining_3d"
    | "hsr"
    | "hss"
    | "contour_3d"
    | "pocket_2d"
    | "drilling"
    | "thread_milling"
    | "swarf_5axis"
    | "simultaneous_5axis"
    | "irest"
    | "turning"
    | "other";
  /** Whether an iMachining boundary is defined */
  has_imachining_boundary?: boolean;
  /** Whether the iMachining boundary fully encloses the machining area */
  boundary_encloses_machining_area?: boolean;
  /** iMachining step-down per level in mm */
  imachining_stepdown_mm?: number;
  /** Technology Wizard level selected (1-8) */
  technology_wizard_level?: number;
  /** Whether morphing spiral intersects islands */
  morphing_spiral_intersects_islands?: boolean;
  /** HSS finishing stepover in mm */
  hss_stepover_mm?: number;
  /** Target surface roughness Ra in µm */
  target_ra_um?: number;
  /** Ball-nose tool radius in mm (for HSS Ra check) */
  ballnose_radius_mm?: number;
  /** Simultaneous 5-axis tilt angle in degrees */
  sim5axis_tilt_deg?: number;
  /** Whether the surface being cut is a ruled surface (for SWARF) */
  is_ruled_surface?: boolean;
  /** Tool level slider value (0.0–1.0, SolidCAM iMachining) */
  tool_level_slider?: number;
  /** GPP post processor name configured in job */
  gpp_post_name?: string;
  /** Whether SolidWorks stock model is synchronized (current revision) */
  solidworks_stock_is_current?: boolean;
  /** Entry helical feed rate in mm/min */
  feed_entry_mm_min?: number;
  /** Full cutting feed rate in mm/min */
  feed_cutting_mm_min?: number;
  /** iMachining channel width in mm */
  channel_width_mm?: number;
  /** Whether iRest stock model reflects all prior operations */
  irest_stock_is_current?: boolean;
  /** Thread mill pitch in mm */
  thread_pitch_mm?: number;
  /** Target thread specification pitch in mm */
  thread_spec_pitch_mm?: number;
  /** Programmed coolant pressure in bar */
  coolant_pressure_bar?: number;
}

export interface SolidCAMTool {
  /** Nominal diameter in mm */
  diameter_mm: number;
  /** Flute length in mm */
  flute_length_mm?: number;
  /** Overall length in mm */
  overall_length_mm?: number;
  /** Stickout / gauge length in mm */
  stickout_mm?: number;
  /** Tool type */
  type:
    | "endmill"
    | "ballnose"
    | "bullnose"
    | "drill"
    | "thread_mill"
    | "face_mill"
    | "barrel"
    | "other";
  /** Holder body diameter in mm (widest part) */
  holder_body_diameter_mm?: number;
  /** Holder length below spindle face in mm */
  holder_length_mm?: number;
}

export interface SolidCAMMaterial {
  /** ISO material group */
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  /** Hardness HRC */
  hardness_hrc?: number;
  /** Material name for lookup */
  name?: string;
}

export interface SolidCAMMachine {
  /** Machine type */
  type: "3axis_vertical" | "3axis_horizontal" | "4axis" | "5axis" | "mill_turn" | "other";
  /** Machine rigidity class (light / medium / heavy) */
  rigidity_class?: "light" | "medium" | "heavy";
  /** Maximum tilt axis limit in degrees (for 5-axis) */
  max_tilt_deg?: number;
  /** Target CNC controller for GPP compatibility */
  controller_name?: string;
  /** Max spindle RPM */
  max_rpm?: number;
}

export interface SolidCAMStrategy {
  /** Strategy name for contextual notes */
  name?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum iMachining step-down as fraction of flute length */
const IMACHINING_STEPDOWN_FLUTE_RATIO_MAX = 1.0;

/**
 * Technology Wizard level upper bounds per machine rigidity class.
 * Levels above these limits risk chatter and spindle damage on lighter machines.
 */
const WIZARD_LEVEL_LIMIT: Record<string, number> = {
  light: 3,
  medium: 6,
  heavy: 8,
};

/** Default max tilt for 5-axis machines with no explicit limit configured (degrees) */
const DEFAULT_MAX_TILT_DEG = 90;

/**
 * Minimum tool level slider for hard materials (HRC ≥ 45).
 * Values above this indicate excessive aggressiveness for hardened steel.
 */
const TOOL_LEVEL_SLIDER_HARD_MAX = 0.6;

/**
 * Minimum tool level slider for superalloys (ISO S).
 * Values above this indicate excessive aggressiveness.
 */
const TOOL_LEVEL_SLIDER_SUPERALLOY_MAX = 0.5;

/**
 * Maximum allowed ratio of iMachining channel width to tool diameter.
 * Channels narrower than 1.05× diameter will cause rubbing; wider than 5× waste material.
 */
const CHANNEL_WIDTH_RATIO_MIN = 1.05;
const CHANNEL_WIDTH_RATIO_MAX = 5.0;

/**
 * Entry helical feed rate must be at most this fraction of cutting feed for hard materials.
 * Hard: HRC ≥ 45, Superalloys: ISO S group.
 */
const ENTRY_RATE_HARD_MAX_RATIO = 0.50;

/** Thread pitch mismatch tolerance in mm */
const THREAD_PITCH_TOLERANCE_MM = 0.005;

/** Minimum holder clearance from fixture/clamps in mm */
const MIN_HOLDER_CLEARANCE_MM = 3.0;

// ─── Rule Registry ────────────────────────────────────────────────────────────

const RULE_DESCRIPTIONS: SafetyRuleDescription[] = [
  {
    rule_id: "imachining_boundary",
    severity: "critical",
    title: "iMachining Boundary Enclosure",
    description:
      "The iMachining machining boundary must fully enclose the entire machining area including all features. " +
      "If the boundary is open or undersized, the morphing spiral extends beyond the stock edge and the tool " +
      "may plunge into a fixture or leave an uncut island.",
    applies_to: ["imachining_2d", "imachining_3d"],
  },
  {
    rule_id: "imachining_stepdown",
    severity: "critical",
    title: "iMachining Step-Down vs Flute Length",
    description:
      "iMachining step-down per level must not exceed the tool flute length. Cutting above the flute into " +
      "the shank produces severe rubbing, work hardening, and catastrophic tool breakage.",
    applies_to: ["imachining_2d", "imachining_3d"],
  },
  {
    rule_id: "technology_wizard_level",
    severity: "warning",
    title: "Technology Wizard Level vs Machine Rigidity",
    description:
      "The Technology Wizard level (1-8) must be consistent with the machine's rigidity class. " +
      "Selecting an aggressive level on a light machine causes chatter, deflection, and poor surface finish.",
    applies_to: ["imachining_2d", "imachining_3d"],
  },
  {
    rule_id: "morphing_spiral_collision",
    severity: "critical",
    title: "Morphing Spiral Island Collision",
    description:
      "The iMachining morphing spiral toolpath must not intersect islands or internal bosses. " +
      "A collision causes direct cutter impact on the island wall, leading to tool breakage and part damage.",
    applies_to: ["imachining_2d", "imachining_3d"],
  },
  {
    rule_id: "hss_stepover",
    severity: "warning",
    title: "HSS Finishing Stepover vs Ra Target",
    description:
      "HSS (High Speed Surface) finishing stepover determines theoretical scallop height and achieved Ra. " +
      "Stepover too large for the specified Ra target and ball-nose radius will produce out-of-tolerance finish.",
    applies_to: ["hss"],
  },
  {
    rule_id: "sim5axis_tilt_limit",
    severity: "critical",
    title: "Simultaneous 5-Axis Tilt Limit",
    description:
      "Simultaneous 5-axis tilt angle must not exceed the machine's physical axis limits. " +
      "Exceeding the limit triggers an in-cycle hardware fault or axis overtravel alarm.",
    applies_to: ["simultaneous_5axis", "swarf_5axis"],
  },
  {
    rule_id: "swarf_ruled_surface",
    severity: "warning",
    title: "SWARF Surface Geometry Check",
    description:
      "SWARF (Side Wall And Radial Finishing) cutting requires a ruled surface — a surface formed by sweeping " +
      "a straight line. Applying SWARF to a freeform doubly-curved surface produces unacceptable gouging " +
      "and undercutting along the tool axis.",
    applies_to: ["swarf_5axis"],
  },
  {
    rule_id: "tool_level_slider",
    severity: "warning",
    title: "Tool Level Slider vs Material Hardness",
    description:
      "The iMachining Tool Level Slider controls chip load aggressiveness. For hard or difficult materials " +
      "(HRC ≥ 45 or ISO S superalloys) the slider should be set conservatively to avoid premature tool failure.",
    applies_to: ["imachining_2d", "imachining_3d"],
  },
  {
    rule_id: "gpp_post_compatibility",
    severity: "critical",
    title: "GPP Post Processor / Controller Compatibility",
    description:
      "The GPP (Generic Post Processor) configured for the job must target the same controller dialect " +
      "as the machine being programmed. A mismatched post generates syntactically valid but semantically " +
      "incorrect G-code that may crash the machine.",
    applies_to: ["imachining_2d", "imachining_3d", "hsr", "hss", "simultaneous_5axis", "swarf_5axis", "other"],
  },
  {
    rule_id: "solidworks_stock_sync",
    severity: "warning",
    title: "SolidWorks Stock Model Synchronization",
    description:
      "The in-process SolidWorks stock model must be the current revision reflecting the part as-machined " +
      "up to the current operation. A stale stock model causes toolpath regeneration to use incorrect " +
      "material boundaries, producing air-cutting or unexpected collision.",
    applies_to: ["imachining_2d", "imachining_3d", "hsr", "hss", "irest"],
  },
  {
    rule_id: "imachining_entry_rate",
    severity: "warning",
    title: "iMachining Entry Helical Rate for Hard Materials",
    description:
      "The entry helical feed rate must be reduced relative to cutting feed for hard materials (HRC ≥ 45) " +
      "and superalloys (ISO S). A high entry rate during the helical ramp generates extreme radial load " +
      "at the tool tip, causing premature fracture.",
    applies_to: ["imachining_2d", "imachining_3d"],
  },
  {
    rule_id: "channel_width",
    severity: "warning",
    title: "iMachining Channel Width vs Tool Diameter Ratio",
    description:
      "The iMachining channel width should be between 1.05× and 5× the tool diameter. " +
      "Narrower channels cause rubbing on both flanks simultaneously; wider channels reduce " +
      "the morphing spiral efficiency and produce excessive step-overs.",
    applies_to: ["imachining_2d", "imachining_3d"],
  },
  {
    rule_id: "rest_machining_stock",
    severity: "critical",
    title: "iRest Stock Model Currency",
    description:
      "The iRest (iMachining rest material) stock model must accurately reflect all prior roughing " +
      "operations. An outdated iRest model causes the engine to program cuts into already-removed material " +
      "or to miss unmachined pockets, leaving rest material on the finished part.",
    applies_to: ["irest"],
  },
  {
    rule_id: "holder_clearance",
    severity: "critical",
    title: "Holder Clearance vs Clamps and Fixtures",
    description:
      "The tool holder body must maintain at least 3 mm clearance from all clamps, fixtures, and " +
      "vise jaws throughout the operation. Holder collision is a catastrophic event that damages " +
      "the workholding, spindle, and part.",
    applies_to: ["imachining_2d", "imachining_3d", "hsr", "hss", "simultaneous_5axis", "swarf_5axis"],
  },
  {
    rule_id: "thread_mill_pitch",
    severity: "critical",
    title: "Thread Mill Pitch vs Thread Specification",
    description:
      "The thread mill helix pitch programmed in SolidCAM must exactly match the target thread " +
      "specification. A pitch mismatch produces a thread that will not accept the mating fastener " +
      "or gage, rendering the feature scrap.",
    applies_to: ["thread_milling"],
  },
];

// ─── Helper utilities ─────────────────────────────────────────────────────────

/**
 * Compute theoretical scallop height (mm) for a ball-nose tool.
 * h = ae² / (8 * R)   where ae = stepover, R = ball radius.
 * Ra ≈ h / 4 (approximate for arithmetic mean roughness).
 */
function hssScallopRa(stepover_mm: number, ball_radius_mm: number): number {
  if (ball_radius_mm <= 0) return Infinity;
  const h = (stepover_mm * stepover_mm) / (8 * ball_radius_mm);
  return h / 4; // Ra approximation in mm → same unit as stepover
}

/**
 * Determine if a material is considered "hard" for entry rate and slider rules.
 */
function isHardMaterial(material: SolidCAMMaterial): boolean {
  if (material.iso_group === "H") return true;
  if (material.iso_group === "S") return true;
  if (material.hardness_hrc !== undefined && material.hardness_hrc >= 45) return true;
  return false;
}

// ─── Core Rule Evaluators ─────────────────────────────────────────────────────

function ruleImachiiningBoundary(op: SolidCAMOperation): SafetyFinding {
  const relevant = op.type === "imachining_2d" || op.type === "imachining_3d";
  const triggered =
    relevant &&
    (op.has_imachining_boundary === false ||
      op.boundary_encloses_machining_area === false);
  return {
    rule_id: "imachining_boundary",
    severity: "critical",
    triggered,
    message: triggered
      ? "iMachining boundary is missing or does not fully enclose the machining area. " +
        "The morphing spiral may extend beyond stock limits, risking fixture collision."
      : "",
    fix_suggestion: triggered
      ? "Define a closed iMachining boundary that encompasses all features including stock overhangs. " +
        "Use 'Boundary from Stock' or sketch a boundary at least 1× tool diameter beyond the outermost feature edge."
      : "",
  };
}

function ruleImachiiningStepdown(op: SolidCAMOperation, tool: SolidCAMTool): SafetyFinding {
  const relevant = op.type === "imachining_2d" || op.type === "imachining_3d";
  const flute = tool.flute_length_mm;
  const stepdown = op.imachining_stepdown_mm;
  const triggered =
    relevant &&
    flute !== undefined &&
    stepdown !== undefined &&
    stepdown > flute * IMACHINING_STEPDOWN_FLUTE_RATIO_MAX;
  return {
    rule_id: "imachining_stepdown",
    severity: "critical",
    triggered,
    message: triggered
      ? `iMachining step-down of ${op.imachining_stepdown_mm!.toFixed(2)} mm exceeds tool flute length of ${tool.flute_length_mm!.toFixed(2)} mm. ` +
        "Cutting above the flute length will engage the shank and cause rubbing and breakage."
      : "",
    fix_suggestion: triggered
      ? `Reduce iMachining step-down to no more than ${tool.flute_length_mm!.toFixed(2)} mm (tool flute length). ` +
        "For deeper pockets, use multiple z-level passes or a longer-fluted tool."
      : "",
  };
}

function ruleTechnologyWizardLevel(op: SolidCAMOperation, machine: SolidCAMMachine): SafetyFinding {
  const relevant = op.type === "imachining_2d" || op.type === "imachining_3d";
  const level = op.technology_wizard_level;
  const rigidity = machine.rigidity_class ?? "medium";
  const limit = WIZARD_LEVEL_LIMIT[rigidity] ?? 6;
  const triggered =
    relevant &&
    level !== undefined &&
    level > limit;
  return {
    rule_id: "technology_wizard_level",
    severity: "warning",
    triggered,
    message: triggered
      ? `Technology Wizard level ${level} exceeds the recommended maximum of ${limit} for a '${rigidity}' rigidity machine. ` +
        "Aggressive levels on light machines will cause chatter and deflection."
      : "",
    fix_suggestion: triggered
      ? `Reduce Technology Wizard level to ${limit} or below for this machine class. ` +
        "Alternatively, upgrade to a heavier machine or increase workholding rigidity before raising the level."
      : "",
  };
}

function ruleMorphingSpiralCollision(op: SolidCAMOperation): SafetyFinding {
  const relevant = op.type === "imachining_2d" || op.type === "imachining_3d";
  const triggered = relevant && op.morphing_spiral_intersects_islands === true;
  return {
    rule_id: "morphing_spiral_collision",
    severity: "critical",
    triggered,
    message: triggered
      ? "The iMachining morphing spiral toolpath intersects one or more islands. " +
        "Direct island wall contact will cause immediate tool breakage and part damage."
      : "",
    fix_suggestion: triggered
      ? "Enable 'Avoid Islands' in the iMachining operation parameters and verify island boundary detection is ON. " +
        "If islands are user-defined, ensure they are properly closed and slightly oversized relative to the physical boss."
      : "",
  };
}

function ruleHssStepover(op: SolidCAMOperation, tool: SolidCAMTool): SafetyFinding {
  const relevant = op.type === "hss";
  const stepover = op.hss_stepover_mm;
  const target_ra = op.target_ra_um;
  const radius = op.ballnose_radius_mm ?? (tool.type === "ballnose" ? tool.diameter_mm / 2 : undefined);

  let triggered = false;
  let achieved_ra_um = 0;
  if (relevant && stepover !== undefined && target_ra !== undefined && radius !== undefined) {
    achieved_ra_um = hssScallopRa(stepover, radius) * 1000; // convert mm to µm
    triggered = achieved_ra_um > target_ra;
  }

  return {
    rule_id: "hss_stepover",
    severity: "warning",
    triggered,
    message: triggered
      ? `HSS finishing stepover of ${op.hss_stepover_mm!.toFixed(3)} mm with ball-nose radius ${radius!.toFixed(3)} mm ` +
        `yields estimated Ra ≈ ${achieved_ra_um.toFixed(3)} µm, exceeding the target of ${target_ra!.toFixed(3)} µm.`
      : "",
    fix_suggestion: triggered
      ? `Reduce HSS stepover so that theoretical Ra remains below ${target_ra!.toFixed(3)} µm. ` +
        `For Ra target ${target_ra!.toFixed(3)} µm and radius ${radius!.toFixed(3)} mm, stepover ≤ ${(Math.sqrt(32 * radius! * (target_ra! / 1000))).toFixed(3)} mm.`
      : "",
  };
}

function ruleSim5axTiltLimit(op: SolidCAMOperation, machine: SolidCAMMachine): SafetyFinding {
  const relevant = op.type === "simultaneous_5axis" || op.type === "swarf_5axis";
  const tilt = op.sim5axis_tilt_deg;
  const limit = machine.max_tilt_deg ?? DEFAULT_MAX_TILT_DEG;
  const triggered =
    relevant &&
    tilt !== undefined &&
    tilt > limit;
  return {
    rule_id: "sim5axis_tilt_limit",
    severity: "critical",
    triggered,
    message: triggered
      ? `Simultaneous 5-axis tilt of ${op.sim5axis_tilt_deg!.toFixed(1)}° exceeds machine axis limit of ${limit.toFixed(1)}°. ` +
        "This will trigger an axis overtravel alarm mid-cycle."
      : "",
    fix_suggestion: triggered
      ? `Constrain the tool tilt axis to a maximum of ${limit.toFixed(1)}° in the SolidCAM 5-axis linking page. ` +
        "If more tilt is required, verify the machine's axis limit in the controller parameters and update the PRISM machine profile."
      : "",
  };
}

function ruleSwarfRuledSurface(op: SolidCAMOperation): SafetyFinding {
  const relevant = op.type === "swarf_5axis";
  const triggered = relevant && op.is_ruled_surface === false;
  return {
    rule_id: "swarf_ruled_surface",
    severity: "warning",
    triggered,
    message: triggered
      ? "SWARF cutting is applied to a freeform (non-ruled) surface. The side of the cutter cannot " +
        "maintain full contact with a doubly-curved surface, causing gouging and undercutting."
      : "",
    fix_suggestion: triggered
      ? "Verify that the target surface is a ruled surface in SolidWorks/SolidCAM surface analysis. " +
        "For true freeform walls, switch to 5-axis simultaneous (contact point) finishing instead of SWARF."
      : "",
  };
}

function ruleToolLevelSlider(op: SolidCAMOperation, material: SolidCAMMaterial): SafetyFinding {
  const relevant = op.type === "imachining_2d" || op.type === "imachining_3d";
  const slider = op.tool_level_slider;
  const hard = isHardMaterial(material);
  const limit =
    material.iso_group === "S"
      ? TOOL_LEVEL_SLIDER_SUPERALLOY_MAX
      : TOOL_LEVEL_SLIDER_HARD_MAX;

  const triggered =
    relevant &&
    hard &&
    slider !== undefined &&
    slider > limit;

  return {
    rule_id: "tool_level_slider",
    severity: "warning",
    triggered,
    message: triggered
      ? `Tool Level Slider of ${op.tool_level_slider!.toFixed(2)} is above the recommended maximum of ${limit.toFixed(2)} ` +
        `for ${material.iso_group === "S" ? "superalloy" : "hardened"} material (${material.iso_group} group${material.hardness_hrc !== undefined ? `, ${material.hardness_hrc} HRC` : ""}). ` +
        "Excessive chip load in hard materials will cause rapid tool wear or fracture."
      : "",
    fix_suggestion: triggered
      ? `Set the Tool Level Slider to ${limit.toFixed(2)} or lower when machining ${material.iso_group === "S" ? "superalloys" : "hardened materials"}. ` +
        "Monitor spindle load during first-run and fine-tune incrementally."
      : "",
  };
}

function ruleGppPostCompatibility(op: SolidCAMOperation, machine: SolidCAMMachine): SafetyFinding {
  const gppPost = op.gpp_post_name;
  const controller = machine.controller_name;
  // Triggered when both are known and they don't match (case-insensitive substring check)
  const triggered =
    gppPost !== undefined &&
    controller !== undefined &&
    !gppPost.toLowerCase().includes(controller.toLowerCase()) &&
    !controller.toLowerCase().includes(gppPost.toLowerCase());

  return {
    rule_id: "gpp_post_compatibility",
    severity: "critical",
    triggered,
    message: triggered
      ? `GPP post processor '${gppPost}' does not appear to target controller '${controller}'. ` +
        "A mismatched post generates G-code that may execute incorrect motion on the machine."
      : "",
    fix_suggestion: triggered
      ? `In SolidCAM Job Manager, select the GPP post that matches '${controller}'. ` +
        "Contact your post developer or use SolidCAM's Post Processor List to confirm the correct post for this controller family."
      : "",
  };
}

function ruleSolidworksStockSync(op: SolidCAMOperation): SafetyFinding {
  const relevant =
    op.type === "imachining_2d" ||
    op.type === "imachining_3d" ||
    op.type === "hsr" ||
    op.type === "hss" ||
    op.type === "irest";
  const triggered = relevant && op.solidworks_stock_is_current === false;
  return {
    rule_id: "solidworks_stock_sync",
    severity: "warning",
    triggered,
    message: triggered
      ? "The SolidWorks in-process stock model is not synchronized to the current operation. " +
        "Toolpath regeneration will use stale stock boundaries, causing air-cuts or missed material."
      : "",
    fix_suggestion: triggered
      ? "In SolidCAM Part Manager, right-click the stock model and select 'Update from SolidWorks'. " +
        "Ensure all upstream operations are recalculated before regenerating the current toolpath."
      : "",
  };
}

function ruleImachiningEntryRate(op: SolidCAMOperation, material: SolidCAMMaterial): SafetyFinding {
  const relevant = op.type === "imachining_2d" || op.type === "imachining_3d";
  const hard = isHardMaterial(material);
  const feedEntry = op.feed_entry_mm_min;
  const feedCutting = op.feed_cutting_mm_min;
  const triggered =
    relevant &&
    hard &&
    feedEntry !== undefined &&
    feedCutting !== undefined &&
    feedCutting > 0 &&
    feedEntry / feedCutting > ENTRY_RATE_HARD_MAX_RATIO;

  return {
    rule_id: "imachining_entry_rate",
    severity: "warning",
    triggered,
    message: triggered
      ? `Entry helical feed rate of ${op.feed_entry_mm_min!.toFixed(0)} mm/min is ${((op.feed_entry_mm_min! / op.feed_cutting_mm_min!) * 100).toFixed(0)}% of cutting feed — ` +
        `exceeds the ${(ENTRY_RATE_HARD_MAX_RATIO * 100).toFixed(0)}% limit for hard/superalloy materials. ` +
        "High entry rates cause excessive radial load at the tip during helical engagement."
      : "",
    fix_suggestion: triggered
      ? `Reduce entry helical feed to ≤ ${(ENTRY_RATE_HARD_MAX_RATIO * 100).toFixed(0)}% of cutting feed (≤ ${(op.feed_cutting_mm_min! * ENTRY_RATE_HARD_MAX_RATIO).toFixed(0)} mm/min). ` +
        "Adjust in SolidCAM iMachining → Entry Parameters → Helical Feed Override."
      : "",
  };
}

function ruleChannelWidth(op: SolidCAMOperation, tool: SolidCAMTool): SafetyFinding {
  const relevant = op.type === "imachining_2d" || op.type === "imachining_3d";
  const channelWidth = op.channel_width_mm;
  const dia = tool.diameter_mm;
  const ratio = channelWidth !== undefined && dia > 0 ? channelWidth / dia : undefined;

  const tooNarrow = ratio !== undefined && ratio < CHANNEL_WIDTH_RATIO_MIN;
  const tooWide = ratio !== undefined && ratio > CHANNEL_WIDTH_RATIO_MAX;
  const triggered = relevant && (tooNarrow || tooWide);

  let message = "";
  let fix_suggestion = "";
  if (triggered && ratio !== undefined) {
    if (tooNarrow) {
      message =
        `iMachining channel width of ${channelWidth!.toFixed(2)} mm is only ${ratio.toFixed(2)}× the tool diameter (${dia.toFixed(2)} mm). ` +
        "Channels narrower than 1.05× diameter will rub on both flanks simultaneously.";
      fix_suggestion =
        `Increase channel width to at least ${(dia * CHANNEL_WIDTH_RATIO_MIN).toFixed(2)} mm, or switch to a smaller tool (≤ ${(channelWidth! / CHANNEL_WIDTH_RATIO_MIN).toFixed(2)} mm diameter).`;
    } else {
      message =
        `iMachining channel width of ${channelWidth!.toFixed(2)} mm is ${ratio.toFixed(2)}× the tool diameter — ` +
        `exceeds the ${CHANNEL_WIDTH_RATIO_MAX}× recommended maximum. Morphing spiral efficiency degrades significantly.`;
      fix_suggestion =
        `Consider subdividing the wide channel into sub-regions, or increase step-over to improve material removal rate in wide open areas.`;
    }
  }

  return {
    rule_id: "channel_width",
    severity: "warning",
    triggered,
    message,
    fix_suggestion,
  };
}

function ruleRestMachiningStock(op: SolidCAMOperation): SafetyFinding {
  const relevant = op.type === "irest";
  const triggered = relevant && op.irest_stock_is_current === false;
  return {
    rule_id: "rest_machining_stock",
    severity: "critical",
    triggered,
    message: triggered
      ? "The iRest stock model is not current — it does not reflect all prior operations. " +
        "SolidCAM will compute rest passes over already-machined areas or miss actual remaining stock."
      : "",
    fix_suggestion: triggered
      ? "In the iRest operation setup, update the Previous Operations list to include all upstream roughing and semi-finishing ops. " +
        "Recalculate the iRest stock model before generating toolpaths."
      : "",
  };
}

function ruleHolderClearance(op: SolidCAMOperation, tool: SolidCAMTool): SafetyFinding {
  const relevant =
    op.type === "imachining_2d" ||
    op.type === "imachining_3d" ||
    op.type === "hsr" ||
    op.type === "hss" ||
    op.type === "simultaneous_5axis" ||
    op.type === "swarf_5axis";

  // Check: if holder_body_diameter_mm is known and clearance context is available via stickout
  // In absence of fixture geometry, we flag when holder_length_mm exceeds stickout (assembly error)
  const holderLen = tool.holder_length_mm;
  const stickout = tool.stickout_mm;
  const triggered =
    relevant &&
    holderLen !== undefined &&
    stickout !== undefined &&
    holderLen > stickout - MIN_HOLDER_CLEARANCE_MM &&
    stickout > 0;

  return {
    rule_id: "holder_clearance",
    severity: "critical",
    triggered,
    message: triggered
      ? `Holder length (${holderLen!.toFixed(1)} mm) may not clear fixtures/clamps given stickout of ${stickout!.toFixed(1)} mm — ` +
        `less than the required ${MIN_HOLDER_CLEARANCE_MM} mm margin. A holder collision is catastrophic.`
      : "",
    fix_suggestion: triggered
      ? `Use a shorter holder or increase stickout to at least ${(holderLen! + MIN_HOLDER_CLEARANCE_MM).toFixed(1)} mm. ` +
        "Verify clearance by running SolidCAM's Holder Collision Check before first dry run."
      : "",
  };
}

function ruleThreadMillPitch(op: SolidCAMOperation): SafetyFinding {
  const relevant = op.type === "thread_milling";
  const programmed = op.thread_pitch_mm;
  const spec = op.thread_spec_pitch_mm;
  const triggered =
    relevant &&
    programmed !== undefined &&
    spec !== undefined &&
    Math.abs(programmed - spec) > THREAD_PITCH_TOLERANCE_MM;

  return {
    rule_id: "thread_mill_pitch",
    severity: "critical",
    triggered,
    message: triggered
      ? `Thread mill pitch of ${op.thread_pitch_mm!.toFixed(4)} mm does not match the thread specification pitch of ${op.thread_spec_pitch_mm!.toFixed(4)} mm ` +
        `(difference: ${Math.abs(op.thread_pitch_mm! - op.thread_spec_pitch_mm!).toFixed(4)} mm). ` +
        "The produced thread will not accept the mating fastener."
      : "",
    fix_suggestion: triggered
      ? `Set the thread mill helix pitch to exactly ${op.thread_spec_pitch_mm!.toFixed(4)} mm in the SolidCAM Thread Milling operation. ` +
        "Confirm the thread specification from the drawing and verify the tool pitch matches the TPI/pitch standard."
      : "",
  };
}

// ─── Engine Class ─────────────────────────────────────────────────────────────

class SolidCAMSafetyHooksEngine {
  /**
   * Validate a single SolidCAM operation against all 15 safety rules.
   * Rules not applicable to the operation type are returned as not-triggered.
   */
  validate(
    operation: SolidCAMOperation,
    tool: SolidCAMTool,
    material: SolidCAMMaterial,
    machine: SolidCAMMachine,
    _strategy: SolidCAMStrategy = {},
  ): SafetyValidationResult {
    const findings: SafetyFinding[] = [
      ruleImachiiningBoundary(operation),
      ruleImachiiningStepdown(operation, tool),
      ruleTechnologyWizardLevel(operation, machine),
      ruleMorphingSpiralCollision(operation),
      ruleHssStepover(operation, tool),
      ruleSim5axTiltLimit(operation, machine),
      ruleSwarfRuledSurface(operation),
      ruleToolLevelSlider(operation, material),
      ruleGppPostCompatibility(operation, machine),
      ruleSolidworksStockSync(operation),
      ruleImachiningEntryRate(operation, material),
      ruleChannelWidth(operation, tool),
      ruleRestMachiningStock(operation),
      ruleHolderClearance(operation, tool),
      ruleThreadMillPitch(operation),
    ];

    const triggered = findings.filter(f => f.triggered);
    const critical_count = triggered.filter(f => f.severity === "critical").length;
    const warning_count = triggered.filter(f => f.severity === "warning").length;
    const info_count = triggered.filter(f => f.severity === "info").length;

    const verdict: "PASS" | "WARN" | "BLOCK" =
      critical_count > 0 ? "BLOCK" : warning_count > 0 ? "WARN" : "PASS";

    return {
      rules_evaluated: findings.length,
      triggered_count: triggered.length,
      critical_count,
      warning_count,
      info_count,
      verdict,
      findings,
    };
  }

  /**
   * Validate a batch of SolidCAM operations.
   * Each entry must supply operation, tool, material, machine, and optionally strategy.
   */
  validateAll(
    operations: Array<{
      operation: SolidCAMOperation;
      tool: SolidCAMTool;
      material: SolidCAMMaterial;
      machine: SolidCAMMachine;
      strategy?: SolidCAMStrategy;
    }>,
  ): BatchValidationResult {
    const results = operations.map((entry, idx) => {
      const r = this.validate(
        entry.operation,
        entry.tool,
        entry.material,
        entry.machine,
        entry.strategy ?? {},
      );
      return {
        operation_index: idx,
        operation_name: entry.operation.name,
        ...r,
      };
    });

    const totals = results.reduce(
      (acc, r) => ({
        total_triggered: acc.total_triggered + r.triggered_count,
        critical: acc.critical + r.critical_count,
        warning: acc.warning + r.warning_count,
        info: acc.info + r.info_count,
      }),
      { total_triggered: 0, critical: 0, warning: 0, info: 0 },
    );

    const worst_verdict: "PASS" | "WARN" | "BLOCK" =
      results.some(r => r.verdict === "BLOCK")
        ? "BLOCK"
        : results.some(r => r.verdict === "WARN")
        ? "WARN"
        : "PASS";

    return {
      operation_count: operations.length,
      results,
      totals,
      worst_verdict,
    };
  }

  /**
   * Return the full rule registry with descriptions.
   */
  getRules(): SafetyRuleDescription[] {
    return RULE_DESCRIPTIONS.slice();
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const solidCAMSafetyHooksEngine = new SolidCAMSafetyHooksEngine();
