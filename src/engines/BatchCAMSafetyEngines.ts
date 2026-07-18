// @ts-nocheck
/**
 * BatchCAMSafetyEngines — NX CAM, PowerMill, and CATIA Safety Hooks in One File
 *
 * Three safety-hook engines sharing a common base class pattern. Each engine
 * validates CAM operations against system-specific safety rules and best
 * practices, producing structured findings with severity, verdict, and fix
 * suggestions.
 *
 * Engines:
 *   1. NXCAMSafetyHooksEngine      — 10 rules for Siemens NX CAM
 *   2. PowerMillSafetyHooksEngine  — 10 rules for Autodesk PowerMill
 *   3. CATIASafetyHooksEngine      — 10 rules for Dassault CATIA V5/V6 CAM
 *
 * Shared interface per engine:
 *   validate(op, tool, material, machine): SafetyValidationResult
 *   validateAll(ops[]):                    BatchValidationResult
 *   getRules():                            SafetyRuleDescription[]
 *
 * @engine BatchCAMSafetyEngines
 * @shortcode E1115
 * @dispatcher camDispatcher
 * @actions
 *   nxcam_safety_validate, nxcam_safety_rules,
 *   powermill_safety_validate, powermill_safety_rules,
 *   catia_safety_validate, catia_safety_rules
 */

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type SafetySeverity = "critical" | "warning" | "info";

export interface SafetyFinding {
  rule_id: string;
  severity: SafetySeverity;
  triggered: boolean;
  message: string;
  fix_suggestion: string;
}

export interface SafetyValidationResult {
  rules_evaluated: number;
  triggered_count: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  verdict: "PASS" | "WARN" | "BLOCK";
  findings: SafetyFinding[];
}

export interface BatchValidationResult {
  operation_count: number;
  results: Array<{ operation_index: number; operation_name?: string } & SafetyValidationResult>;
  totals: {
    total_triggered: number;
    critical: number;
    warning: number;
    info: number;
  };
  worst_verdict: "PASS" | "WARN" | "BLOCK";
}

export interface SafetyRuleDescription {
  rule_id: string;
  severity: SafetySeverity;
  title: string;
  description: string;
  applies_to: string[];
}

// ─── Shared Operation / Tool / Material / Machine Inputs ─────────────────────

export interface CAMSafetyOperation {
  name?: string;
  type: string;
  axis_count?: number;
  is_five_axis?: boolean;
  has_simulation?: boolean;
  stock_is_current?: boolean;
  ipw_is_current?: boolean;
  csys_matches_setup?: boolean;
  tool_axis_vector?: [number, number, number];
  holder_clearance_mm?: number;
  engagement_pct?: number;
  max_engagement_pct?: number;
  post_format?: string;
  controller_format?: string;
  strategy_tolerance_mm?: number;
  part_tolerance_mm?: number;
  toolpath_within_bounds?: boolean;
  fbm_strategy_validated?: boolean;
  viewmill_verified?: boolean;
  vortex_engagement_deg?: number;
  collision_avoidance_enabled?: boolean;
  lead_link_clears_stock?: boolean;
  rapid_height_z_mm?: number;
  stock_top_z_mm?: number;
  fixture_top_z_mm?: number;
  gouge_protection_enabled?: boolean;
  steep_shallow_boundary_correct?: boolean;
  wall_thickness_mm?: number;
  min_wall_thickness_mm?: number;
  race_line_smoothness_mm?: number;
  block_clearance_mm?: number;
  part_operation_valid?: boolean;
  mfg_program_hierarchy_valid?: boolean;
  tool_path_replay_collision_free?: boolean;
  gouge_detection_passed?: boolean;
  stock_model_current?: boolean;
  kbm_template_matches_feature?: boolean;
  offset_validated?: boolean;
  workpiece_csys_aligned?: boolean;
  pp_table_entries_exist?: boolean;
}

export interface CAMSafetyTool {
  diameter_mm: number;
  type?: string;
  holder_body_diameter_mm?: number;
  holder_clearance_mm?: number;
}

export interface CAMSafetyMaterial {
  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  hardness_hrc?: number;
}

export interface CAMSafetyMachine {
  type?: string;
  max_rpm?: number;
}

// ─── Base Engine ──────────────────────────────────────────────────────────────

abstract class BaseCAMSafetyEngine {
  protected abstract readonly RULES: SafetyRuleDescription[];
  protected abstract readonly camSystem: string;

  protected abstract runRules(
    op: CAMSafetyOperation,
    tool: CAMSafetyTool,
    material: CAMSafetyMaterial,
    machine: CAMSafetyMachine,
  ): SafetyFinding[];

  validate(
    op: CAMSafetyOperation,
    tool: CAMSafetyTool = { diameter_mm: 10 },
    material: CAMSafetyMaterial = {},
    machine: CAMSafetyMachine = {},
  ): SafetyValidationResult {
    const findings = this.runRules(op, tool, material, machine);
    const triggered = findings.filter((f) => f.triggered);
    const critical_count = triggered.filter((f) => f.severity === "critical").length;
    const warning_count = triggered.filter((f) => f.severity === "warning").length;
    const info_count = triggered.filter((f) => f.severity === "info").length;

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

  validateAll(ops: CAMSafetyOperation[]): BatchValidationResult {
    const results = ops.map((op, i) => ({
      operation_index: i,
      operation_name: op.name,
      ...this.validate(op),
    }));

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
      totals.critical > 0 ? "BLOCK" : totals.warning > 0 ? "WARN" : "PASS";

    return { operation_count: ops.length, results, totals, worst_verdict };
  }

  getRules(): SafetyRuleDescription[] {
    return this.RULES;
  }

  protected ok(rule_id: string, severity: SafetySeverity): SafetyFinding {
    return { rule_id, severity, triggered: false, message: "", fix_suggestion: "" };
  }

  protected fail(
    rule_id: string,
    severity: SafetySeverity,
    message: string,
    fix_suggestion: string,
  ): SafetyFinding {
    return { rule_id, severity, triggered: true, message, fix_suggestion };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ENGINE 1: NXCAMSafetyHooksEngine
// ═════════════════════════════════════════════════════════════════════════════

class NXCAMSafetyHooksEngine extends BaseCAMSafetyEngine {
  protected readonly camSystem = "NX CAM";

  protected readonly RULES: SafetyRuleDescription[] = [
    {
      rule_id: "ipw_boundary",
      severity: "critical",
      title: "IPW Currency Check",
      description:
        "In-Process Workpiece (IPW) must be regenerated and current before each operation. A stale IPW causes incorrect material recognition and potential gouges.",
      applies_to: ["cavity_mill", "zlevel_profile", "fixed_contour", "variable_contour", "rest_milling"],
    },
    {
      rule_id: "csys_alignment",
      severity: "critical",
      title: "CSYS vs Setup Orientation",
      description:
        "The machining Coordinate System (MCS) must match the physical setup orientation. Misalignment causes all programmed moves to be in the wrong reference frame.",
      applies_to: ["*"],
    },
    {
      rule_id: "tool_axis_gouge",
      severity: "critical",
      title: "Tool Axis Vector Gouge Check",
      description:
        "The programmed tool axis vector must not drive the tool into the part surface or under-cut geometry. Requires validation against the part model.",
      applies_to: ["variable_contour", "sequential_mill", "multi_axis_surface"],
    },
    {
      rule_id: "holder_clearance",
      severity: "critical",
      title: "Holder Clearance vs Stock",
      description:
        "The tool holder body must maintain sufficient clearance from the stock at all positions along the toolpath. Insufficient clearance causes holder collision.",
      applies_to: ["*"],
    },
    {
      rule_id: "fbm_mapping",
      severity: "warning",
      title: "FBM Auto-Mapped Strategy Validation",
      description:
        "Feature-Based Machining (FBM) automatically maps strategies to recognized features. Each auto-mapped strategy must be reviewed and validated before NC output.",
      applies_to: ["fbm_operation"],
    },
    {
      rule_id: "adaptive_engagement",
      severity: "warning",
      title: "Adaptive Milling Max Engagement",
      description:
        "Adaptive milling maximum engagement percentage must stay within tool and material limits. Excess engagement causes overload and premature tool failure.",
      applies_to: ["adaptive_milling", "cavity_mill"],
    },
    {
      rule_id: "post_output",
      severity: "critical",
      title: "Post Output Format vs Controller",
      description:
        "The post processor output format (G-code dialect, macro syntax, subprogram structure) must exactly match the target CNC controller specification.",
      applies_to: ["*"],
    },
    {
      rule_id: "simulation_required",
      severity: "critical",
      title: "5-Axis Simulation Mandatory",
      description:
        "Complex 5-axis operations must have full machine simulation completed and verified before NC output. Skipping simulation risks machine collision or axis overtravel.",
      applies_to: ["variable_contour", "sequential_mill", "multi_axis_surface"],
    },
    {
      rule_id: "tolerance_vs_strategy",
      severity: "warning",
      title: "Strategy Tolerance Capability vs Part Tolerance",
      description:
        "The selected strategy's achievable tolerance must be equal to or tighter than the drawing part tolerance. A strategy incapable of holding the required tolerance will produce scrap.",
      applies_to: ["fixed_contour", "variable_contour", "zlevel_profile"],
    },
    {
      rule_id: "tool_path_containment",
      severity: "critical",
      title: "Toolpath Containment Boundary",
      description:
        "The generated toolpath must remain entirely within the specified cut region or part boundary. Excursions outside the boundary risk collisions with fixtures or adjacent setups.",
      applies_to: ["cavity_mill", "planar_mill", "zlevel_profile"],
    },
  ];

  protected runRules(
    op: CAMSafetyOperation,
    tool: CAMSafetyTool,
    _material: CAMSafetyMaterial,
    _machine: CAMSafetyMachine,
  ): SafetyFinding[] {
    const findings: SafetyFinding[] = [];

    // 1. ipw_boundary
    if (op.ipw_is_current === false) {
      findings.push(this.fail(
        "ipw_boundary", "critical",
        "IPW is not current. The In-Process Workpiece has not been regenerated for this operation.",
        "Regenerate the IPW in NX CAM before computing the toolpath. Right-click the operation group and select 'Generate IPW'.",
      ));
    } else {
      findings.push(this.ok("ipw_boundary", "critical"));
    }

    // 2. csys_alignment
    if (op.csys_matches_setup === false) {
      findings.push(this.fail(
        "csys_alignment", "critical",
        "MCS orientation does not match the physical setup orientation. All programmed coordinates will be incorrect.",
        "Open the MCS dialog in NX CAM, verify the origin and axis directions against the setup sheet, and re-align the CSYS before proceeding.",
      ));
    } else {
      findings.push(this.ok("csys_alignment", "critical"));
    }

    // 3. tool_axis_gouge
    if (
      op.is_five_axis &&
      op.tool_axis_vector !== undefined &&
      op.tool_axis_vector[2] < 0
    ) {
      findings.push(this.fail(
        "tool_axis_gouge", "critical",
        `Tool axis Z component is ${op.tool_axis_vector[2]}, pointing into the part. This vector will cause a gouge.`,
        "Review the tool axis definition in the Drive Method dialog. Ensure the tool axis points away from the part surface at all positions. Run gouge check in NX CAM.",
      ));
    } else {
      findings.push(this.ok("tool_axis_gouge", "critical"));
    }

    // 4. holder_clearance
    const holderClearance = op.holder_clearance_mm ?? tool.holder_clearance_mm;
    if (holderClearance !== undefined && holderClearance < 1.0) {
      findings.push(this.fail(
        "holder_clearance", "critical",
        `Holder clearance is ${holderClearance.toFixed(2)} mm, which is below the 1.0 mm minimum safe margin.`,
        "Reduce tool stickout, select a slimmer holder profile, or increase the tilt angle in a 5-axis approach to gain clearance.",
      ));
    } else {
      findings.push(this.ok("holder_clearance", "critical"));
    }

    // 5. fbm_mapping
    if (op.type === "fbm_operation" && op.fbm_strategy_validated === false) {
      findings.push(this.fail(
        "fbm_mapping", "warning",
        "FBM has auto-mapped strategies to recognized features but the mappings have not been manually validated.",
        "Review each FBM operation in the Feature Navigator, confirm the strategy selection is appropriate for the feature geometry, and approve before post-processing.",
      ));
    } else {
      findings.push(this.ok("fbm_mapping", "warning"));
    }

    // 6. adaptive_engagement
    const engPct = op.engagement_pct;
    const maxEngPct = op.max_engagement_pct ?? 60;
    if (engPct !== undefined && engPct > maxEngPct) {
      findings.push(this.fail(
        "adaptive_engagement", "warning",
        `Adaptive milling engagement is ${engPct}%, exceeding the ${maxEngPct}% limit for this tool/material combination.`,
        `Reduce the Max Engagement parameter in the Cutting Parameters dialog to ${maxEngPct}% or lower. Consider reducing radial depth of cut.`,
      ));
    } else {
      findings.push(this.ok("adaptive_engagement", "warning"));
    }

    // 7. post_output
    if (op.post_format && op.controller_format && op.post_format !== op.controller_format) {
      findings.push(this.fail(
        "post_output", "critical",
        `Post output format '${op.post_format}' does not match the controller requirement '${op.controller_format}'.`,
        "Select the correct post processor in the Post Processing dialog that matches your controller model. Verify with the machine tool builder's post guide.",
      ));
    } else {
      findings.push(this.ok("post_output", "critical"));
    }

    // 8. simulation_required
    if (op.is_five_axis && op.has_simulation === false) {
      findings.push(this.fail(
        "simulation_required", "critical",
        "Complex 5-axis operation has not been verified with machine simulation prior to NC output.",
        "Run full machine simulation in NX CAM Machine Simulation module. Verify there are no collisions, over-travels, or singularity passes before outputting NC.",
      ));
    } else {
      findings.push(this.ok("simulation_required", "critical"));
    }

    // 9. tolerance_vs_strategy
    if (
      op.strategy_tolerance_mm !== undefined &&
      op.part_tolerance_mm !== undefined &&
      op.strategy_tolerance_mm > op.part_tolerance_mm
    ) {
      findings.push(this.fail(
        "tolerance_vs_strategy", "warning",
        `Strategy tolerance capability (${op.strategy_tolerance_mm} mm) is coarser than the part tolerance (${op.part_tolerance_mm} mm). The strategy cannot hold the required accuracy.`,
        "Switch to a finer-tolerance finishing strategy or tighten the Tolerance parameter in the strategy dialog to be equal to or less than the part drawing tolerance.",
      ));
    } else {
      findings.push(this.ok("tolerance_vs_strategy", "warning"));
    }

    // 10. tool_path_containment
    if (op.toolpath_within_bounds === false) {
      findings.push(this.fail(
        "tool_path_containment", "critical",
        "Toolpath extends outside the specified cut region or part boundary.",
        "Review the Part, Blank, and Check geometry assignments in the operation dialog. Add or tighten a Trim Boundary to confine the toolpath to the safe machining zone.",
      ));
    } else {
      findings.push(this.ok("tool_path_containment", "critical"));
    }

    return findings;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ENGINE 2: PowerMillSafetyHooksEngine
// ═════════════════════════════════════════════════════════════════════════════

class PowerMillSafetyHooksEngine extends BaseCAMSafetyEngine {
  protected readonly camSystem = "PowerMill";

  protected readonly RULES: SafetyRuleDescription[] = [
    {
      rule_id: "viewmill_verify",
      severity: "critical",
      title: "ViewMill Stock Verification",
      description:
        "ViewMill stock model must be verified after each operation to detect gouges or excess material. Running subsequent operations on unverified stock risks tool breakage.",
      applies_to: ["*"],
    },
    {
      rule_id: "vortex_engagement",
      severity: "warning",
      title: "Vortex Max Engagement Angle",
      description:
        "Vortex high-efficiency roughing controls engagement angle to protect the tool. The programmed maximum engagement angle must not exceed tool and material limits.",
      applies_to: ["vortex_roughing", "vortex_area_clear"],
    },
    {
      rule_id: "collision_check",
      severity: "critical",
      title: "5-Axis Auto Collision Avoidance",
      description:
        "Auto Collision Avoidance (ACA) must be enabled for all 5-axis operations in PowerMill. Without ACA the tool holder and shank are not protected from collision with the model.",
      applies_to: ["swarf_machining", "5axis_finishing", "multi_axis_roughing"],
    },
    {
      rule_id: "lead_link_safety",
      severity: "critical",
      title: "Lead/Link/Connection Move Clearance",
      description:
        "All lead-in, lead-out, and link moves (ramps, arcs, zig-zag connections) must clear the stock and any fixtures. Unverified link moves are a common source of gouges.",
      applies_to: ["*"],
    },
    {
      rule_id: "rapid_height",
      severity: "critical",
      title: "Rapid Move Height Clearance",
      description:
        "The Safe Z (rapid height) must be set above all obstructions including clamps, fixtures, and part high points. Rapid moves at insufficient height cause collisions.",
      applies_to: ["*"],
    },
    {
      rule_id: "gouge_protection",
      severity: "critical",
      title: "Automatic Gouge Protection",
      description:
        "PowerMill's automatic gouge protection settings must be active. Disabling gouge protection removes the system-level safeguard against cutter penetrating the model.",
      applies_to: ["*"],
    },
    {
      rule_id: "steep_shallow_split",
      severity: "warning",
      title: "Steep & Shallow Boundary Correctness",
      description:
        "The steep/shallow boundary angle must be correctly set to ensure the steep strategy covers steep walls and the shallow strategy covers flat areas without gaps or overlap.",
      applies_to: ["steep_machining", "shallow_machining", "steep_and_shallow"],
    },
    {
      rule_id: "rib_thickness",
      severity: "warning",
      title: "Rib Machining Minimum Wall Thickness",
      description:
        "When machining ribs or thin walls, the remaining wall thickness must not fall below the minimum specified for the material to avoid deflection or breakout.",
      applies_to: ["rib_machining", "finishing", "pencil_milling"],
    },
    {
      rule_id: "race_line_smoothness",
      severity: "warning",
      title: "Race Line Finishing Smoothness vs Tolerance",
      description:
        "The Race Line machining smoothness parameter controls the deviation from the ideal toolpath to achieve fluid motion. It must be within the part surface tolerance.",
      applies_to: ["race_line_finishing"],
    },
    {
      rule_id: "block_clearance",
      severity: "critical",
      title: "Multi-Axis Tool Block Clearance",
      description:
        "In multi-axis operations the entire tool assembly (block, holder, extension) must be checked for clearance against the block model at all tilt positions.",
      applies_to: ["swarf_machining", "5axis_finishing", "multi_axis_roughing"],
    },
  ];

  protected runRules(
    op: CAMSafetyOperation,
    tool: CAMSafetyTool,
    _material: CAMSafetyMaterial,
    _machine: CAMSafetyMachine,
  ): SafetyFinding[] {
    const findings: SafetyFinding[] = [];

    // 1. viewmill_verify
    if (op.viewmill_verified === false) {
      findings.push(this.fail(
        "viewmill_verify", "critical",
        "ViewMill stock has not been verified after the previous operation. Residual material state is unknown.",
        "Run ViewMill simulation for all preceding operations and verify the stock state before programming this operation. Use 'Verify' in the ViewMill toolbar.",
      ));
    } else {
      findings.push(this.ok("viewmill_verify", "critical"));
    }

    // 2. vortex_engagement
    const vortexDeg = op.vortex_engagement_deg;
    if (vortexDeg !== undefined && vortexDeg > 90) {
      findings.push(this.fail(
        "vortex_engagement", "warning",
        `Vortex engagement angle is ${vortexDeg}°, which exceeds the recommended 90° maximum for most tooling.`,
        "Reduce the Maximum Engagement Angle in the Vortex strategy dialog. Check the tool manufacturer's engagement recommendation for this material.",
      ));
    } else {
      findings.push(this.ok("vortex_engagement", "warning"));
    }

    // 3. collision_check
    if (op.is_five_axis && op.collision_avoidance_enabled === false) {
      findings.push(this.fail(
        "collision_check", "critical",
        "Auto Collision Avoidance (ACA) is disabled for this 5-axis operation. Holder and shank collisions are not being detected.",
        "Enable Auto Collision Avoidance in the Tool Axis and Tilt Angle settings. Ensure the holder geometry is correctly defined in the tool database.",
      ));
    } else {
      findings.push(this.ok("collision_check", "critical"));
    }

    // 4. lead_link_safety
    if (op.lead_link_clears_stock === false) {
      findings.push(this.fail(
        "lead_link_safety", "critical",
        "One or more lead/link/connection moves do not clear the stock model.",
        "Review the Leads and Links dialog. Increase the link height, use a safe Z link type, or switch to a 'Safe' link style that retracts to the rapid height between passes.",
      ));
    } else {
      findings.push(this.ok("lead_link_safety", "critical"));
    }

    // 5. rapid_height
    const rapidZ = op.rapid_height_z_mm;
    const stockTop = op.stock_top_z_mm ?? 0;
    const fixtureTop = op.fixture_top_z_mm ?? 0;
    const obstruction = Math.max(stockTop, fixtureTop);
    if (rapidZ !== undefined && rapidZ <= obstruction) {
      findings.push(this.fail(
        "rapid_height", "critical",
        `Safe Z rapid height (${rapidZ} mm) is at or below the highest obstruction (${obstruction} mm). Rapid moves will collide.`,
        `Set the Safe Z to at least ${(obstruction + 10).toFixed(1)} mm. Update the rapid height in the Toolpath Settings > Rapid Moves dialog.`,
      ));
    } else {
      findings.push(this.ok("rapid_height", "critical"));
    }

    // 6. gouge_protection
    if (op.gouge_protection_enabled === false) {
      findings.push(this.fail(
        "gouge_protection", "critical",
        "Automatic gouge protection is disabled. The system will not prevent the cutter from penetrating the model surface.",
        "Enable Gouge Protection in the Toolpath > Gouge Checking dialog. Set 'Check Tool' and 'Check Holder' to active before computing the toolpath.",
      ));
    } else {
      findings.push(this.ok("gouge_protection", "critical"));
    }

    // 7. steep_shallow_split
    if (op.steep_shallow_boundary_correct === false) {
      findings.push(this.fail(
        "steep_shallow_split", "warning",
        "Steep and shallow boundary split angle is not correctly configured, causing gaps or over-machining at the transition zone.",
        "Verify the Limit Angle parameter in both Steep Machining and Shallow Machining strategies. Ensure they share the same angle threshold and boundary offsets don't leave a gap.",
      ));
    } else {
      findings.push(this.ok("steep_shallow_split", "warning"));
    }

    // 8. rib_thickness
    const wallThickness = op.wall_thickness_mm;
    const minWall = op.min_wall_thickness_mm;
    if (wallThickness !== undefined && minWall !== undefined && wallThickness < minWall) {
      findings.push(this.fail(
        "rib_thickness", "warning",
        `Rib/wall thickness ${wallThickness} mm is below the minimum safe thickness ${minWall} mm for this material.`,
        "Increase the stock allowance on thin wall passes, reduce depth of cut, use a smaller-diameter tool, or add a finishing pass with reduced radial engagement.",
      ));
    } else {
      findings.push(this.ok("rib_thickness", "warning"));
    }

    // 9. race_line_smoothness
    if (
      op.race_line_smoothness_mm !== undefined &&
      op.part_tolerance_mm !== undefined &&
      op.race_line_smoothness_mm > op.part_tolerance_mm
    ) {
      findings.push(this.fail(
        "race_line_smoothness", "warning",
        `Race Line smoothness deviation (${op.race_line_smoothness_mm} mm) exceeds the part surface tolerance (${op.part_tolerance_mm} mm).`,
        `Reduce the Smoothing Tolerance in Race Line Finishing to ${(op.part_tolerance_mm * 0.5).toFixed(4)} mm or less to ensure the toolpath stays within the surface tolerance envelope.`,
      ));
    } else {
      findings.push(this.ok("race_line_smoothness", "warning"));
    }

    // 10. block_clearance
    const blockClearance = op.block_clearance_mm ?? (tool.holder_clearance_mm);
    if (op.is_five_axis && blockClearance !== undefined && blockClearance < 2.0) {
      findings.push(this.fail(
        "block_clearance", "critical",
        `Multi-axis tool block clearance is ${blockClearance?.toFixed(2)} mm, below the 2.0 mm minimum safe margin.`,
        "Increase tool stickout, use a reduced-neck holder, or adjust the tool axis tilt to gain clearance between the block and the model at the tightest point.",
      ));
    } else {
      findings.push(this.ok("block_clearance", "critical"));
    }

    return findings;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ENGINE 3: CATIASafetyHooksEngine
// ═════════════════════════════════════════════════════════════════════════════

class CATIASafetyHooksEngine extends BaseCAMSafetyEngine {
  protected readonly camSystem = "CATIA";

  protected readonly RULES: SafetyRuleDescription[] = [
    {
      rule_id: "part_operation_validate",
      severity: "critical",
      title: "Part Operation Structure Validation",
      description:
        "The Part Operation must have a valid machine, stock model, part model, and fixture all correctly assigned. An incomplete Part Operation causes downstream errors in all Manufacturing Programs.",
      applies_to: ["*"],
    },
    {
      rule_id: "mfg_program_structure",
      severity: "critical",
      title: "Manufacturing Program Hierarchy Check",
      description:
        "The Manufacturing Program hierarchy must be logically ordered: roughing before semi-finishing before finishing. Out-of-order programs cause incorrect in-process stock states.",
      applies_to: ["*"],
    },
    {
      rule_id: "tool_path_replay",
      severity: "critical",
      title: "Tool Path Replay Collision Check",
      description:
        "Tool path replay must complete without any collision detection errors. Unresolved collisions reported during replay will cause real collisions at the machine.",
      applies_to: ["*"],
    },
    {
      rule_id: "gouge_detection",
      severity: "critical",
      title: "Gouge Detection Validation",
      description:
        "CATIA's gouge detection analysis must pass with zero gouges for all operations. Any detected gouge represents a guaranteed part defect.",
      applies_to: ["*"],
    },
    {
      rule_id: "machine_simulation",
      severity: "critical",
      title: "Machine Simulation for 5-Axis",
      description:
        "5-axis operations require full machine simulation (using a DMU kinematics model or Machine Tool Builder model) before NC output to verify no structural collisions occur.",
      applies_to: ["5axis_sweeping", "5axis_flank_contouring", "multi_axis_contouring"],
    },
    {
      rule_id: "stock_model",
      severity: "warning",
      title: "In-Process Material Currency",
      description:
        "The In-Process Material (IPM) model must be regenerated to reflect the current state after each preceding operation. A stale IPM produces incorrect material removal simulations.",
      applies_to: ["*"],
    },
    {
      rule_id: "kbm_template",
      severity: "warning",
      title: "KBM Template Feature Type Match",
      description:
        "Knowledge-Based Machining (KBM) templates must be matched to the correct feature type. Applying a pocket template to a hole or vice versa produces incorrect strategies.",
      applies_to: ["kbm_operation"],
    },
    {
      rule_id: "offset_safety",
      severity: "warning",
      title: "Tool Compensation Offset Validation",
      description:
        "Tool compensation offset values (diameter offset, length offset) must be validated against the actual measured tool geometry before first use.",
      applies_to: ["*"],
    },
    {
      rule_id: "workpiece_coordinate",
      severity: "critical",
      title: "Workpiece Coordinate System Alignment",
      description:
        "The Workpiece Coordinate System (WCS) origin and axis orientation must match the physical part datum as defined on the engineering drawing and setup sheet.",
      applies_to: ["*"],
    },
    {
      rule_id: "post_table",
      severity: "critical",
      title: "PP Table Entry Existence Check",
      description:
        "Every operation must have a corresponding PP Table (Post Processor Table) entry defined. Missing PP Table entries cause post-processing failures and potentially corrupt NC output.",
      applies_to: ["*"],
    },
  ];

  protected runRules(
    op: CAMSafetyOperation,
    _tool: CAMSafetyTool,
    _material: CAMSafetyMaterial,
    _machine: CAMSafetyMachine,
  ): SafetyFinding[] {
    const findings: SafetyFinding[] = [];

    // 1. part_operation_validate
    if (op.part_operation_valid === false) {
      findings.push(this.fail(
        "part_operation_validate", "critical",
        "Part Operation is incomplete. One or more required elements (machine, stock, part model, or fixture) are missing or invalid.",
        "Open the Part Operation dialog in CATIA Manufacturing. Verify that Machine, Part, Stock, and Fixture geometry are all correctly assigned before computing any toolpath.",
      ));
    } else {
      findings.push(this.ok("part_operation_validate", "critical"));
    }

    // 2. mfg_program_structure
    if (op.mfg_program_hierarchy_valid === false) {
      findings.push(this.fail(
        "mfg_program_structure", "critical",
        "Manufacturing Program hierarchy is not in the correct machining order. Programs or operations are out of sequence.",
        "Reorder Manufacturing Programs and operations in the PPR tree to follow the correct sequence: roughing → semi-finishing → finishing. Use drag-and-drop in the tree to reorder.",
      ));
    } else {
      findings.push(this.ok("mfg_program_structure", "critical"));
    }

    // 3. tool_path_replay
    if (op.tool_path_replay_collision_free === false) {
      findings.push(this.fail(
        "tool_path_replay", "critical",
        "Tool path replay reported one or more collisions. These represent real machine collisions that will occur if the NC program is run.",
        "Identify the collision locations from the replay analysis report. Modify the toolpath parameters (tool axis, links, clearance planes) to resolve each collision before proceeding.",
      ));
    } else {
      findings.push(this.ok("tool_path_replay", "critical"));
    }

    // 4. gouge_detection
    if (op.gouge_detection_passed === false) {
      findings.push(this.fail(
        "gouge_detection", "critical",
        "Gouge detection analysis found one or more gouges in the toolpath. The generated toolpath will damage the part.",
        "Use CATIA's Gouge Detection analysis to identify gouge locations. Adjust the tool, the machining strategy parameters, or the surface tolerances to eliminate all detected gouges.",
      ));
    } else {
      findings.push(this.ok("gouge_detection", "critical"));
    }

    // 5. machine_simulation
    if (op.is_five_axis && op.has_simulation === false) {
      findings.push(this.fail(
        "machine_simulation", "critical",
        "5-axis operation has not been verified with CATIA machine simulation.",
        "Run machine simulation using the kinematic machine model in CATIA DMU or Manufacturing. Verify all axes remain within travel limits and no structural collisions occur.",
      ));
    } else {
      findings.push(this.ok("machine_simulation", "critical"));
    }

    // 6. stock_model
    if (op.stock_model_current === false) {
      findings.push(this.fail(
        "stock_model", "warning",
        "In-Process Material (IPM) model is not current. It has not been updated to reflect the material removed by preceding operations.",
        "Regenerate the In-Process Material by updating all preceding operations and selecting 'Update' on the IPM in the PPR tree before computing this operation.",
      ));
    } else {
      findings.push(this.ok("stock_model", "warning"));
    }

    // 7. kbm_template
    if (op.type === "kbm_operation" && op.kbm_template_matches_feature === false) {
      findings.push(this.fail(
        "kbm_template", "warning",
        "KBM template selected does not match the recognized feature type. The auto-generated strategy is inappropriate for this feature.",
        "Open the KBM feature recognition results and manually select the correct template for the feature type. Verify the mapped strategies are appropriate before generating the toolpath.",
      ));
    } else {
      findings.push(this.ok("kbm_template", "warning"));
    }

    // 8. offset_safety
    if (op.offset_validated === false) {
      findings.push(this.fail(
        "offset_safety", "warning",
        "Tool compensation offsets have not been validated against the actual measured tool geometry.",
        "Measure the actual tool length and diameter, update the offset registers in the tool database, and verify the compensation values in the NC program header before first use.",
      ));
    } else {
      findings.push(this.ok("offset_safety", "warning"));
    }

    // 9. workpiece_coordinate
    if (op.workpiece_csys_aligned === false) {
      findings.push(this.fail(
        "workpiece_coordinate", "critical",
        "Workpiece Coordinate System (WCS) does not align with the physical part datum. All coordinate output will be incorrect.",
        "Verify the WCS definition in the Part Operation dialog. Ensure the origin and axis directions match the engineering drawing datum scheme and the physical setup on the machine.",
      ));
    } else {
      findings.push(this.ok("workpiece_coordinate", "critical"));
    }

    // 10. post_table
    if (op.pp_table_entries_exist === false) {
      findings.push(this.fail(
        "post_table", "critical",
        "One or more operations do not have the required PP Table entries defined. Post-processing will fail or produce incomplete NC output.",
        "Open the PP Table in the Manufacturing workbench and add entries for all operations. Ensure each operation type has a corresponding macro call defined in the PP Table.",
      ));
    } else {
      findings.push(this.ok("post_table", "critical"));
    }

    return findings;
  }
}

// ─── Singleton Exports ────────────────────────────────────────────────────────

export const nxCAMSafetyEngine = new NXCAMSafetyHooksEngine();
export const powerMillSafetyEngine = new PowerMillSafetyHooksEngine();
export const catiaSafetyEngine = new CATIASafetyHooksEngine();
