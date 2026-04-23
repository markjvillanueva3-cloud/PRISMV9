/**
 * MastercamSafetyHooksEngine — Mastercam-Specific Safety Validations (E1113)
 *
 * 15 safety rules covering the most common mistakes when programming Mastercam.
 * Each rule produces a structured finding with severity, trigger status, message,
 * and a concrete fix suggestion.
 *
 * Rules:
 *   1.  chain_direction            — climb vs conventional mismatch warning
 *   2.  holder_clearance_dynamic   — holder body clears stock in Dynamic Motion
 *   3.  containment_boundary       — containment boundary fully encloses stock+fixture
 *   4.  stock_model_integrity      — stock model not stale from a previous operation
 *   5.  linking_retract            — retract height clears stock + fixture + clamps
 *   6.  rapid_height               — rapid height clears all obstructions
 *   7.  tool_length_vs_depth       — stickout exceeds feature depth + clearance
 *   8.  feed_entry                 — entry feed reduced vs cutting feed
 *   9.  dynamic_motion_engagement  — Dynamic Motion engagement angle vs tool/material limit
 *  10.  optirough_stepdown         — OptiRough step-down vs flute length
 *  11.  coolant_pressure           — through-tool drilling requires minimum pressure
 *  12.  rpm_vs_holder              — RPM within holder balance rating
 *  13.  thread_mill_helix          — thread mill helix pitch matches thread spec
 *  14.  peel_mill_engagement       — peel mill ae < 10 % of tool diameter
 *  15.  accelerated_finishing      — barrel/lens cutter requires 5-axis or tilted axis
 *
 * Methods:
 *   validate(operation, tool, material, machine, strategy): SafetyValidationResult
 *   validateAll(operations[]):                              BatchValidationResult
 *   getRules():                                             SafetyRuleDescription[]
 *
 * @engine MastercamSafetyHooksEngine
 * @shortcode E1113
 * @dispatcher camDispatcher
 * @actions mastercam_safety_validate, mastercam_safety_validate_all, mastercam_safety_rules
 * @milestone CAMX-MS3/U02
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

export interface SafetyOperation {
  /** Operation name / label for reporting */
  name?: string;
  /** Mastercam toolpath type */
  type:
    | "dynamic_mill"
    | "optirough"
    | "contour"
    | "pocket"
    | "face"
    | "peel_mill"
    | "drill"
    | "thread_mill"
    | "bore"
    | "surface_finish"
    | "multiaxis"
    | "other";
  /** Cut direction selected by programmer */
  cut_direction?: "climb" | "conventional" | "mixed";
  /** Whether containment boundary is defined */
  has_containment_boundary?: boolean;
  /** Whether the containment boundary fully encloses stock and fixture */
  containment_encloses_stock_and_fixture?: boolean;
  /** Whether the stock model was regenerated for this operation */
  stock_model_is_current?: boolean;
  /** Retract height in mm (absolute Z) */
  retract_height_z_mm?: number;
  /** Highest Z of stock surface in mm */
  stock_top_z_mm?: number;
  /** Highest Z of fixture/clamp body in mm */
  fixture_top_z_mm?: number;
  /** Rapid height in mm (absolute Z) */
  rapid_height_z_mm?: number;
  /** Feature depth in mm (positive value) */
  feature_depth_mm?: number;
  /** Entry feed rate in mm/min (or ipm) */
  feed_entry?: number;
  /** Full cutting feed rate in mm/min (or ipm) */
  feed_cutting?: number;
  /** Dynamic Motion engagement angle in degrees */
  dynamic_engagement_deg?: number;
  /** OptiRough step-down per pass in mm */
  optirough_stepdown_mm?: number;
  /** Whether through-tool coolant is selected */
  through_tool_coolant?: boolean;
  /** Programmed spindle speed in RPM */
  rpm?: number;
  /** Thread pitch in mm (for thread milling) */
  thread_pitch_mm?: number;
  /** Target thread pitch in mm */
  thread_spec_pitch_mm?: number;
  /** Peel mill radial engagement (ae) in mm */
  peel_ae_mm?: number;
  /** Whether 5-axis or tilted-tool-axis mode is active */
  five_axis_active?: boolean;
  /** Programmed coolant pressure in bar */
  coolant_pressure_bar?: number;
}

export interface SafetyTool {
  /** Nominal diameter in mm */
  diameter_mm: number;
  /** Overall length in mm */
  overall_length_mm: number;
  /** Stickout / gauge length in mm */
  stickout_mm: number;
  /** Flute length in mm */
  flute_length_mm?: number;
  /** Tool type */
  type:
    | "endmill"
    | "ballnose"
    | "bullnose"
    | "drill"
    | "thread_mill"
    | "face_mill"
    | "barrel"
    | "lens"
    | "peel_mill"
    | "other";
  /** Holder balance rating in RPM (G2.5 or G6.3 rating) */
  holder_balance_rpm?: number;
  /** Holder body diameter in mm (widest part) */
  holder_body_diameter_mm?: number;
  /** Holder length below spindle face in mm */
  holder_length_mm?: number;
}

export interface SafetyMaterial {
  /** ISO material group */
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  /** Hardness HRC (optional — used for engagement limit lookup) */
  hardness_hrc?: number;
}

export interface SafetyMachine {
  /** Machine type */
  type: "3axis_vertical" | "3axis_horizontal" | "4axis" | "5axis" | "mill_turn" | "other";
  /** Max spindle RPM */
  max_rpm?: number;
  /** Minimum coolant pressure available in bar */
  coolant_pressure_bar?: number;
}

export interface SafetyStrategy {
  /** Strategy name for contextual rules */
  name?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum safe retract clearance above highest obstruction (mm) */
const MIN_RETRACT_CLEARANCE_MM = 2.0;
/** Recommended retract clearance above highest obstruction (mm) */
const REC_RETRACT_CLEARANCE_MM = 5.0;
/** Minimum tool stickout margin beyond feature depth (mm) */
const MIN_STICKOUT_MARGIN_MM = 3.0;
/** Maximum allowed ratio of entry feed to cutting feed */
const MAX_ENTRY_FEED_RATIO = 0.75;
/** Default max Dynamic Motion engagement angle for steel (P-group) in degrees */
const DYNAMIC_ENGAGEMENT_LIMIT_STEEL_DEG = 60;
/** Default max Dynamic Motion engagement angle for aluminum (N-group) in degrees */
const DYNAMIC_ENGAGEMENT_LIMIT_ALUM_DEG = 72;
/** Default max Dynamic Motion engagement angle for stainless / superalloy in degrees */
const DYNAMIC_ENGAGEMENT_LIMIT_HARD_DEG = 45;
/** Minimum through-tool coolant pressure for drilling in bar */
const MIN_THROUGH_TOOL_COOLANT_BAR = 20;
/** Maximum peel mill ae as fraction of tool diameter */
const PEEL_MILL_AE_RATIO_MAX = 0.10;

// ─── Rule Registry ────────────────────────────────────────────────────────────

const RULE_DESCRIPTIONS: SafetyRuleDescription[] = [
  {
    rule_id: "chain_direction",
    severity: "warning",
    title: "Chain Direction Consistency",
    description:
      "Warns when climb vs. conventional milling direction is inconsistent with the programmed strategy or creates unexpected chip load reversals.",
    applies_to: ["contour", "pocket", "dynamic_mill"],
  },
  {
    rule_id: "holder_clearance_dynamic",
    severity: "critical",
    title: "Holder Body Clearance in Dynamic Motion",
    description:
      "In Dynamic Motion toolpaths the tool traverses large arcs. The holder body (widest diameter) must clear the stock sides with engagement margins applied.",
    applies_to: ["dynamic_mill"],
  },
  {
    rule_id: "containment_boundary",
    severity: "critical",
    title: "Containment Boundary Coverage",
    description:
      "Containment boundary must fully enclose both stock and fixture. An undersized boundary allows the tool to exit the safe zone and collide with clamps.",
    applies_to: ["dynamic_mill", "optirough", "pocket", "surface_finish"],
  },
  {
    rule_id: "stock_model_integrity",
    severity: "warning",
    title: "Stock Model Currency",
    description:
      "Stock model should reflect the as-is state at the current operation. A stale stock model from a previous operation causes incorrect in-process stock simulation.",
    applies_to: ["dynamic_mill", "optirough", "pocket", "surface_finish", "multiaxis"],
  },
  {
    rule_id: "linking_retract",
    severity: "critical",
    title: "Linking Retract Height Clearance",
    description:
      "Retract height must exceed the top of stock + fixture + clamps to prevent rapid-move collisions between cuts.",
    applies_to: ["*"],
  },
  {
    rule_id: "rapid_height",
    severity: "critical",
    title: "Rapid Height Obstruction Clearance",
    description:
      "The programmed rapid height must clear all stock, fixture, and clamp obstructions with adequate margin.",
    applies_to: ["*"],
  },
  {
    rule_id: "tool_length_vs_depth",
    severity: "critical",
    title: "Tool Stickout vs Feature Depth",
    description:
      "Tool stickout must exceed the machined feature depth plus a minimum clearance to prevent the holder from bottoming into the part or fixture.",
    applies_to: ["*"],
  },
  {
    rule_id: "feed_entry",
    severity: "warning",
    title: "Entry Feed Reduction",
    description:
      "The feed rate at entry should be reduced to 50–75 % of the cutting feed. Full-feed entry into solid material causes abrupt tool loading.",
    applies_to: ["contour", "pocket", "dynamic_mill", "peel_mill"],
  },
  {
    rule_id: "dynamic_motion_engagement",
    severity: "warning",
    title: "Dynamic Motion Max Engagement Angle",
    description:
      "Dynamic Motion engagement angle must stay within the tool/material recommended limit (typically 60° for steel, 45° for stainless/superalloy, 72° for aluminum).",
    applies_to: ["dynamic_mill"],
  },
  {
    rule_id: "optirough_stepdown",
    severity: "warning",
    title: "OptiRough Step-Down vs Flute Length",
    description:
      "OptiRough step-down should not exceed the tool flute length. Exceeding flute length engages the shank and risks breakage.",
    applies_to: ["optirough"],
  },
  {
    rule_id: "coolant_pressure",
    severity: "warning",
    title: "Through-Tool Coolant Pressure for Drilling",
    description:
      "Through-tool coolant drilling requires a minimum of 20 bar (290 psi) to effectively evacuate chips from deep holes.",
    applies_to: ["drill", "bore"],
  },
  {
    rule_id: "rpm_vs_holder",
    severity: "critical",
    title: "RPM vs Holder Balance Rating",
    description:
      "Programmed RPM must not exceed the holder balance rating (G2.5/G6.3). Exceeding the rating causes vibration, spindle bearing damage, and poor surface finish.",
    applies_to: ["*"],
  },
  {
    rule_id: "thread_mill_helix",
    severity: "critical",
    title: "Thread Mill Helix Pitch Match",
    description:
      "Thread mill helix pitch (lead) must match the target thread specification exactly. A mismatch produces an incorrect thread form that will not assemble.",
    applies_to: ["thread_mill"],
  },
  {
    rule_id: "peel_mill_engagement",
    severity: "warning",
    title: "Peel Mill Radial Engagement Limit",
    description:
      "Peel milling radial engagement (ae) should be less than 10 % of the tool diameter to maintain low radial forces and prevent deflection.",
    applies_to: ["peel_mill"],
  },
  {
    rule_id: "accelerated_finishing",
    severity: "warning",
    title: "Accelerated Finishing Axis Requirement",
    description:
      "Barrel cutters and lens-form tools used in Accelerated Surface Finishing require 5-axis capability or a tilted tool-axis control to realize the full contact-length benefit.",
    applies_to: ["surface_finish", "multiaxis"],
  },
];

// ─── Engine Class ─────────────────────────────────────────────────────────────

export class MastercamSafetyHooksEngine {

  // ── Helpers ────────────────────────────────────────────────────────────────

  private engagementLimit(iso: string): number {
    switch (iso) {
      case "N": return DYNAMIC_ENGAGEMENT_LIMIT_ALUM_DEG;
      case "M":
      case "S": return DYNAMIC_ENGAGEMENT_LIMIT_HARD_DEG;
      default:  return DYNAMIC_ENGAGEMENT_LIMIT_STEEL_DEG;
    }
  }

  private verdict(findings: SafetyFinding[]): "PASS" | "WARN" | "BLOCK" {
    const triggered = findings.filter((f) => f.triggered);
    if (triggered.some((f) => f.severity === "critical")) return "BLOCK";
    if (triggered.some((f) => f.severity === "warning")) return "WARN";
    if (triggered.some((f) => f.severity === "info"))    return "WARN";
    return "PASS";
  }

  // ── Core Rule Evaluators ───────────────────────────────────────────────────

  private checkChainDirection(op: SafetyOperation): SafetyFinding {
    const relevantTypes = ["contour", "pocket", "dynamic_mill"];
    if (!relevantTypes.includes(op.type) || op.cut_direction === undefined) {
      return {
        rule_id: "chain_direction",
        severity: "warning",
        triggered: false,
        message: "",
        fix_suggestion: "",
      };
    }
    const triggered = op.cut_direction === "mixed";
    return {
      rule_id: "chain_direction",
      severity: "warning",
      triggered,
      message: triggered
        ? `Cut direction is 'mixed' in a ${op.type} operation. Inconsistent climb/conventional ` +
          `transitions can cause chip-re-cutting, unpredictable tool load, and poor finish. ` +
          `Mastercam defaults to climb — use a consistent direction unless the strategy explicitly requires mixed.`
        : "",
      fix_suggestion: triggered
        ? "Set cut direction to 'climb' (preferred) or 'conventional' (consistent). Avoid 'mixed' unless using " +
          "a specific clean-up pass strategy."
        : "",
    };
  }

  private checkHolderClearanceDynamic(op: SafetyOperation, tool: SafetyTool): SafetyFinding {
    if (op.type !== "dynamic_mill") {
      return { rule_id: "holder_clearance_dynamic", severity: "critical", triggered: false, message: "", fix_suggestion: "" };
    }
    // If holder body diameter exceeds the tool diameter, the holder could contact the stock walls
    const holderOversized =
      tool.holder_body_diameter_mm !== undefined &&
      tool.holder_body_diameter_mm > tool.diameter_mm;
    const triggered = holderOversized && (tool.stickout_mm <= 0 || tool.holder_length_mm === undefined);
    if (!holderOversized) {
      return { rule_id: "holder_clearance_dynamic", severity: "critical", triggered: false, message: "", fix_suggestion: "" };
    }
    // Stickout must be enough so holder body clears the stock pocket wall
    const stickoutOk =
      tool.holder_length_mm !== undefined &&
      tool.stickout_mm > 0 &&
      op.feature_depth_mm !== undefined &&
      tool.stickout_mm > op.feature_depth_mm + MIN_STICKOUT_MARGIN_MM;
    const isTriggered = holderOversized && !stickoutOk;
    return {
      rule_id: "holder_clearance_dynamic",
      severity: "critical",
      triggered: isTriggered,
      message: isTriggered
        ? `Holder body diameter (${tool.holder_body_diameter_mm} mm) exceeds tool diameter ` +
          `(${tool.diameter_mm} mm). In Dynamic Motion the tool arcs into pockets — ` +
          `verify stickout (${tool.stickout_mm} mm) clears the full engagement depth ` +
          `(${op.feature_depth_mm ?? "unknown"} mm) plus ${MIN_STICKOUT_MARGIN_MM} mm margin.`
        : "",
      fix_suggestion: isTriggered
        ? `Increase stickout to at least ${(op.feature_depth_mm ?? 0) + MIN_STICKOUT_MARGIN_MM} mm, ` +
          `or use a slim-shank holder/extended flute tool to keep the holder body out of the cut zone.`
        : "",
    };
  }

  private checkContainmentBoundary(op: SafetyOperation): SafetyFinding {
    const relevantTypes = ["dynamic_mill", "optirough", "pocket", "surface_finish"];
    if (!relevantTypes.includes(op.type)) {
      return { rule_id: "containment_boundary", severity: "critical", triggered: false, message: "", fix_suggestion: "" };
    }
    const triggered =
      op.has_containment_boundary === false ||
      (op.has_containment_boundary === true && op.containment_encloses_stock_and_fixture === false);
    return {
      rule_id: "containment_boundary",
      severity: "critical",
      triggered,
      message: triggered
        ? op.has_containment_boundary === false
          ? `No containment boundary is defined for a ${op.type} operation. Without a containment ` +
            `boundary the tool can exit the safe machining zone and collide with clamps or fixtures.`
          : `Containment boundary does not fully enclose the stock and fixture. The tool may ` +
            `exit the boundary and collide with clamps during arc moves.`
        : "",
      fix_suggestion: triggered
        ? "Define a containment boundary (chain) that surrounds the entire stock footprint plus fixture clearance. Include clamp shadows. Mastercam: Toolpaths > Edit Containment Boundary."
        : "",
    };
  }

  private checkStockModelIntegrity(op: SafetyOperation): SafetyFinding {
    const relevantTypes = ["dynamic_mill", "optirough", "pocket", "surface_finish", "multiaxis"];
    if (!relevantTypes.includes(op.type)) {
      return { rule_id: "stock_model_integrity", severity: "warning", triggered: false, message: "", fix_suggestion: "" };
    }
    const triggered = op.stock_model_is_current === false;
    return {
      rule_id: "stock_model_integrity",
      severity: "warning",
      triggered,
      message: triggered
        ? `Stock model appears stale (not regenerated for this operation). An out-of-date ` +
          `in-process stock model causes incorrect rest-material calculations, missed rest passes, ` +
          `and erroneous backplot results.`
        : "",
      fix_suggestion: triggered
        ? "Right-click the Stock Model in the Toolpaths Manager and select 'Regenerate.' Ensure 'Use Stock from Previous Op' is checked and the reference operation is current."
        : "",
    };
  }

  private checkLinkingRetract(op: SafetyOperation): SafetyFinding {
    const { retract_height_z_mm, stock_top_z_mm, fixture_top_z_mm } = op;
    if (retract_height_z_mm === undefined || stock_top_z_mm === undefined) {
      return { rule_id: "linking_retract", severity: "critical", triggered: false, message: "", fix_suggestion: "" };
    }
    const maxObstruction = Math.max(stock_top_z_mm, fixture_top_z_mm ?? 0);
    const clearance = retract_height_z_mm - maxObstruction;
    const triggered = clearance < MIN_RETRACT_CLEARANCE_MM;
    const barely = clearance >= MIN_RETRACT_CLEARANCE_MM && clearance < REC_RETRACT_CLEARANCE_MM;
    return {
      rule_id: "linking_retract",
      severity: triggered ? "critical" : barely ? "info" : "info",
      triggered: triggered || barely,
      message:
        triggered
          ? `Retract height Z=${retract_height_z_mm} mm is only ${clearance.toFixed(2)} mm above the highest ` +
            `obstruction (Z=${maxObstruction} mm). Rapid linking moves at retract height are ` +
            `NOT collision-checked in Mastercam by default — this is a collision risk.`
          : barely
          ? `Retract height Z=${retract_height_z_mm} mm clears highest obstruction (Z=${maxObstruction} mm) ` +
            `by only ${clearance.toFixed(2)} mm. Recommend at least ${REC_RETRACT_CLEARANCE_MM} mm for safety.`
          : "",
      fix_suggestion:
        triggered
          ? `Set retract height to at least Z=${maxObstruction + REC_RETRACT_CLEARANCE_MM} mm. ` +
            `Mastercam: Linking Parameters > Retract > Absolute, enter the value above the tallest clamp.`
          : barely
          ? `Increase retract to Z=${maxObstruction + REC_RETRACT_CLEARANCE_MM} mm or higher for margin.`
          : "",
    };
  }

  private checkRapidHeight(op: SafetyOperation): SafetyFinding {
    const { rapid_height_z_mm, stock_top_z_mm, fixture_top_z_mm } = op;
    if (rapid_height_z_mm === undefined || stock_top_z_mm === undefined) {
      return { rule_id: "rapid_height", severity: "critical", triggered: false, message: "", fix_suggestion: "" };
    }
    const maxObstruction = Math.max(stock_top_z_mm, fixture_top_z_mm ?? 0);
    const clearance = rapid_height_z_mm - maxObstruction;
    const triggered = clearance < MIN_RETRACT_CLEARANCE_MM;
    return {
      rule_id: "rapid_height",
      severity: "critical",
      triggered,
      message: triggered
        ? `Rapid height Z=${rapid_height_z_mm} mm clears the highest obstruction (Z=${maxObstruction} mm) ` +
          `by only ${clearance.toFixed(2)} mm. Rapid moves are not collision-verified — this is a collision risk.`
        : "",
      fix_suggestion: triggered
        ? `Increase rapid height to Z=${maxObstruction + REC_RETRACT_CLEARANCE_MM} mm minimum. ` +
          `Mastercam: Linking Parameters > Clearance > Absolute.`
        : "",
    };
  }

  private checkToolLengthVsDepth(op: SafetyOperation, tool: SafetyTool): SafetyFinding {
    if (op.feature_depth_mm === undefined) {
      return { rule_id: "tool_length_vs_depth", severity: "critical", triggered: false, message: "", fix_suggestion: "" };
    }
    const required = op.feature_depth_mm + MIN_STICKOUT_MARGIN_MM;
    const triggered = tool.stickout_mm < required;
    return {
      rule_id: "tool_length_vs_depth",
      severity: "critical",
      triggered,
      message: triggered
        ? `Tool stickout (${tool.stickout_mm} mm) is insufficient for feature depth ` +
          `(${op.feature_depth_mm} mm). Required minimum: ${required.toFixed(1)} mm ` +
          `(depth + ${MIN_STICKOUT_MARGIN_MM} mm holder clearance). The holder will contact the part.`
        : "",
      fix_suggestion: triggered
        ? `Increase stickout to at least ${required.toFixed(1)} mm, or use a longer-reach tool / ` +
          `extended flute length. Verify gauge length in Mastercam Tool Manager.`
        : "",
    };
  }

  private checkFeedEntry(op: SafetyOperation): SafetyFinding {
    const relevantTypes = ["contour", "pocket", "dynamic_mill", "peel_mill"];
    if (!relevantTypes.includes(op.type) || op.feed_entry === undefined || op.feed_cutting === undefined) {
      return { rule_id: "feed_entry", severity: "warning", triggered: false, message: "", fix_suggestion: "" };
    }
    const ratio = op.feed_entry / op.feed_cutting;
    const triggered = ratio > MAX_ENTRY_FEED_RATIO;
    return {
      rule_id: "feed_entry",
      severity: "warning",
      triggered,
      message: triggered
        ? `Entry feed (${op.feed_entry} mm/min) is ${(ratio * 100).toFixed(0)} % of the cutting feed ` +
          `(${op.feed_cutting} mm/min). Full-feed entry into solid material causes abrupt tool loading ` +
          `and can snap small-diameter cutters. Recommended: ≤ ${MAX_ENTRY_FEED_RATIO * 100} % of cutting feed.`
        : "",
      fix_suggestion: triggered
        ? `Reduce entry feed to ${Math.round(op.feed_cutting * MAX_ENTRY_FEED_RATIO)} mm/min or lower. ` +
          `Mastercam: Linking Parameters > Feed Rate > Use entry/exit feed > set reduced value.`
        : "",
    };
  }

  private checkDynamicMotionEngagement(op: SafetyOperation, tool: SafetyTool, material: SafetyMaterial): SafetyFinding {
    if (op.type !== "dynamic_mill" || op.dynamic_engagement_deg === undefined) {
      return { rule_id: "dynamic_motion_engagement", severity: "warning", triggered: false, message: "", fix_suggestion: "" };
    }
    const limit = this.engagementLimit(material.iso_group);
    const triggered = op.dynamic_engagement_deg > limit;
    return {
      rule_id: "dynamic_motion_engagement",
      severity: "warning",
      triggered,
      message: triggered
        ? `Dynamic Motion engagement angle (${op.dynamic_engagement_deg}°) exceeds the recommended ` +
          `limit of ${limit}° for ISO group ${material.iso_group} material. High engagement angles ` +
          `cause heat buildup, excessive chip load, and premature tool wear.`
        : "",
      fix_suggestion: triggered
        ? `Reduce Max Engagement Angle to ≤ ${limit}° in the Dynamic Mill parameters. ` +
          `Mastercam: Toolpath Type > Dynamic Mill > Cut Parameters > Max Engagement Angle.`
        : "",
    };
  }

  private checkOptiRoughStepdown(op: SafetyOperation, tool: SafetyTool): SafetyFinding {
    if (op.type !== "optirough" || op.optirough_stepdown_mm === undefined) {
      return { rule_id: "optirough_stepdown", severity: "warning", triggered: false, message: "", fix_suggestion: "" };
    }
    if (tool.flute_length_mm === undefined) {
      return { rule_id: "optirough_stepdown", severity: "warning", triggered: false, message: "", fix_suggestion: "" };
    }
    const triggered = op.optirough_stepdown_mm > tool.flute_length_mm;
    return {
      rule_id: "optirough_stepdown",
      severity: "warning",
      triggered,
      message: triggered
        ? `OptiRough step-down (${op.optirough_stepdown_mm} mm) exceeds tool flute length ` +
          `(${tool.flute_length_mm} mm). This engages the shank at the bottom of each pass ` +
          `and risks tool breakage and chatter.`
        : "",
      fix_suggestion: triggered
        ? `Reduce step-down to ≤ ${tool.flute_length_mm} mm. Mastercam: OptiRough > Cut Parameters > ` +
          `Maximum Stepdown. Consider 80 % of flute length (${(tool.flute_length_mm * 0.8).toFixed(2)} mm) for safety margin.`
        : "",
    };
  }

  private checkCoolantPressure(op: SafetyOperation, machine: SafetyMachine): SafetyFinding {
    const relevantTypes = ["drill", "bore"];
    if (!relevantTypes.includes(op.type) || !op.through_tool_coolant) {
      return { rule_id: "coolant_pressure", severity: "warning", triggered: false, message: "", fix_suggestion: "" };
    }
    const pressure = op.coolant_pressure_bar ?? machine.coolant_pressure_bar;
    if (pressure === undefined) {
      return { rule_id: "coolant_pressure", severity: "warning", triggered: false, message: "", fix_suggestion: "" };
    }
    const triggered = pressure < MIN_THROUGH_TOOL_COOLANT_BAR;
    return {
      rule_id: "coolant_pressure",
      severity: "warning",
      triggered,
      message: triggered
        ? `Through-tool coolant pressure (${pressure} bar) is below the minimum ` +
          `${MIN_THROUGH_TOOL_COOLANT_BAR} bar required for effective chip evacuation in deep-hole drilling. ` +
          `Insufficient pressure causes chip packing, drill breakage, and poor hole finish.`
        : "",
      fix_suggestion: triggered
        ? `Increase coolant pressure to ≥ ${MIN_THROUGH_TOOL_COOLANT_BAR} bar. ` +
          `Check machine coolant pump capacity and through-spindle adapter rating. ` +
          `Alternatively use pecking cycles with reduced peck depth if pressure cannot be increased.`
        : "",
    };
  }

  private checkRpmVsHolder(op: SafetyOperation, tool: SafetyTool): SafetyFinding {
    if (op.rpm === undefined || tool.holder_balance_rpm === undefined) {
      return { rule_id: "rpm_vs_holder", severity: "critical", triggered: false, message: "", fix_suggestion: "" };
    }
    const triggered = op.rpm > tool.holder_balance_rpm;
    return {
      rule_id: "rpm_vs_holder",
      severity: "critical",
      triggered,
      message: triggered
        ? `Programmed RPM (${op.rpm}) exceeds the holder balance rating of ${tool.holder_balance_rpm} RPM. ` +
          `Running above the balance rating causes vibration, accelerated spindle bearing wear, ` +
          `runout growth at temperature, and poor surface finish.`
        : "",
      fix_suggestion: triggered
        ? `Reduce spindle speed to ≤ ${tool.holder_balance_rpm} RPM, or use a precision-balanced ` +
          `holder rated for the required speed (G2.5 at the operating RPM). ` +
          `Verify holder rating in Mastercam Tool Manager > Holder tab.`
        : "",
    };
  }

  private checkThreadMillHelix(op: SafetyOperation): SafetyFinding {
    if (op.type !== "thread_mill") {
      return { rule_id: "thread_mill_helix", severity: "critical", triggered: false, message: "", fix_suggestion: "" };
    }
    if (op.thread_pitch_mm === undefined || op.thread_spec_pitch_mm === undefined) {
      return { rule_id: "thread_mill_helix", severity: "critical", triggered: false, message: "", fix_suggestion: "" };
    }
    const delta = Math.abs(op.thread_pitch_mm - op.thread_spec_pitch_mm);
    const triggered = delta > 0.001; // tolerance 1 µm
    return {
      rule_id: "thread_mill_helix",
      severity: "critical",
      triggered,
      message: triggered
        ? `Thread mill helix pitch (${op.thread_pitch_mm} mm) does not match the thread specification ` +
          `(${op.thread_spec_pitch_mm} mm). Delta = ${delta.toFixed(4)} mm. An incorrect pitch ` +
          `produces a thread that will not assemble to print and typically requires scrapping the part.`
        : "",
      fix_suggestion: triggered
        ? `Correct the helix pitch to exactly ${op.thread_spec_pitch_mm} mm in Mastercam. ` +
          `Toolpaths > Thread Mill > Helix Parameters > Pitch. Verify the programmed thread mill ` +
          `matches the required thread standard (e.g., M8×1.25 requires 1.25 mm pitch).`
        : "",
    };
  }

  private checkPeelMillEngagement(op: SafetyOperation, tool: SafetyTool): SafetyFinding {
    if (op.type !== "peel_mill" || op.peel_ae_mm === undefined) {
      return { rule_id: "peel_mill_engagement", severity: "warning", triggered: false, message: "", fix_suggestion: "" };
    }
    const maxAe = tool.diameter_mm * PEEL_MILL_AE_RATIO_MAX;
    const triggered = op.peel_ae_mm > maxAe;
    return {
      rule_id: "peel_mill_engagement",
      severity: "warning",
      triggered,
      message: triggered
        ? `Peel mill radial engagement ae = ${op.peel_ae_mm} mm exceeds 10 % of tool diameter ` +
          `(max = ${maxAe.toFixed(3)} mm for a ${tool.diameter_mm} mm tool). Excessive ae in ` +
          `peel milling defeats the purpose of low-radial-force machining and increases deflection.`
        : "",
      fix_suggestion: triggered
        ? `Reduce ae to ≤ ${maxAe.toFixed(3)} mm. Mastercam: Peel Mill > Cut Parameters > ` +
          `Maximum Stepover (ae). Typical recommended range: 3–8 % of tool diameter.`
        : "",
    };
  }

  private checkAcceleratedFinishing(op: SafetyOperation, tool: SafetyTool): SafetyFinding {
    const relevantTypes = ["surface_finish", "multiaxis"];
    const relevantTools = ["barrel", "lens"];
    if (!relevantTypes.includes(op.type) || !relevantTools.includes(tool.type)) {
      return { rule_id: "accelerated_finishing", severity: "warning", triggered: false, message: "", fix_suggestion: "" };
    }
    const triggered = op.five_axis_active === false || op.five_axis_active === undefined;
    return {
      rule_id: "accelerated_finishing",
      severity: "warning",
      triggered,
      message: triggered
        ? `A ${tool.type} cutter is programmed in a surface finishing operation but 5-axis or ` +
          `tilted-tool-axis control does not appear active. Barrel/lens cutters require a tilted ` +
          `tool axis to use the effective large-radius contact point — in 3-axis mode they behave ` +
          `like large-radius ball end mills with poor scallop height.`
        : "",
      fix_suggestion: triggered
        ? `Enable 5-axis (or 3+2) tool axis control in Mastercam: Surface Finish > Tool Axis Control > ` +
          `Fixed/Dynamic. Set the tilt angle to expose the optimal contact radius of the ${tool.type} cutter.`
        : "",
    };
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Validate a single operation against all 15 safety rules.
   *
   * @param operation  - Mastercam operation parameters
   * @param tool       - Cutting tool + holder data
   * @param material   - Workpiece material
   * @param machine    - CNC machine configuration
   * @param strategy   - Optional strategy metadata
   */
  validate(
    operation: SafetyOperation,
    tool: SafetyTool,
    material: SafetyMaterial,
    machine: SafetyMachine,
    strategy: SafetyStrategy = {},
  ): SafetyValidationResult {
    const findings: SafetyFinding[] = [
      this.checkChainDirection(operation),
      this.checkHolderClearanceDynamic(operation, tool),
      this.checkContainmentBoundary(operation),
      this.checkStockModelIntegrity(operation),
      this.checkLinkingRetract(operation),
      this.checkRapidHeight(operation),
      this.checkToolLengthVsDepth(operation, tool),
      this.checkFeedEntry(operation),
      this.checkDynamicMotionEngagement(operation, tool, material),
      this.checkOptiRoughStepdown(operation, tool),
      this.checkCoolantPressure(operation, machine),
      this.checkRpmVsHolder(operation, tool),
      this.checkThreadMillHelix(operation),
      this.checkPeelMillEngagement(operation, tool),
      this.checkAcceleratedFinishing(operation, tool),
    ];

    const triggered = findings.filter((f) => f.triggered);
    const critical_count = triggered.filter((f) => f.severity === "critical").length;
    const warning_count  = triggered.filter((f) => f.severity === "warning").length;
    const info_count     = triggered.filter((f) => f.severity === "info").length;

    return {
      rules_evaluated: findings.length,
      triggered_count: triggered.length,
      critical_count,
      warning_count,
      info_count,
      verdict: this.verdict(findings),
      findings,
    };
  }

  /**
   * Validate a batch of operations and return per-operation results plus aggregated totals.
   *
   * @param operations  - Array of { operation, tool, material, machine, strategy? }
   */
  validateAll(
    operations: Array<{
      operation: SafetyOperation;
      tool: SafetyTool;
      material: SafetyMaterial;
      machine: SafetyMachine;
      strategy?: SafetyStrategy;
    }>,
  ): BatchValidationResult {
    const results = operations.map((entry, idx) => {
      const res = this.validate(
        entry.operation,
        entry.tool,
        entry.material,
        entry.machine,
        entry.strategy ?? {},
      );
      return { operation_index: idx, operation_name: entry.operation.name, ...res };
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

    const worstVerdict = results.reduce<"PASS" | "WARN" | "BLOCK">(
      (worst, r) => {
        if (r.verdict === "BLOCK") return "BLOCK";
        if (r.verdict === "WARN" && worst === "PASS") return "WARN";
        return worst;
      },
      "PASS",
    );

    return {
      operation_count: operations.length,
      results,
      totals,
      worst_verdict: worstVerdict,
    };
  }

  /**
   * Return all 15 safety rule descriptions with their applies_to metadata.
   */
  getRules(): SafetyRuleDescription[] {
    return RULE_DESCRIPTIONS;
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const mastercamSafetyHooksEngine = new MastercamSafetyHooksEngine();
