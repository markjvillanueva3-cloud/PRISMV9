/**
 * AccessibilityAnalysisEngine — Verify tool+holder can reach every feature.
 *
 * MF Track Layer 3 (Physical Feasibility).
 * Checks: tool length, holder collision, corner radius, approach path,
 * chip evacuation, 5-axis singularity, undercut geometry.
 *
 * Provides both:
 *   - Full IPW-aware API (checkAccess with OperationInput + WorkpieceState)
 *   - Simplified direct-parameter API (checkAccessDirect, findMinToolDiameter, etc.)
 *
 * Physics:
 *   Tool reach: tool_length >= feature_depth + clearance (5mm default)
 *   Holder clearance: holder_diameter/2 + margin < wall_distance
 *   Corner radius: R_corner >= R_tool (tool radius = diameter/2)
 *   Chip evacuation: depth/width ratio > 4 = warning, > 6 = critical
 *
 * @module MF-MS1/AccessibilityAnalysis
 */

import type {
  WorkpieceState, WallSection, OperationInput,
  BoundingBox, Surface
} from "./WorkpieceStateEngine.js";

// ── Types ──

export interface ToolHolderGeometry {
  tool_id: string;
  tool_diameter_mm: number;
  tool_length_mm: number;
  flute_length_mm?: number;
  tool_type?: string;
  corner_radius_mm?: number;
  holder_diameter_mm?: number;
  holder_length_mm?: number;
}

export interface AccessibilityIssue {
  type: "tool_too_short" | "holder_collision" | "corner_radius"
    | "approach_blocked" | "chip_evacuation" | "singularity" | "undercut";
  severity: "error" | "warning";
  message: string;
  suggestion?: string;
}

export interface AccessibilityResult {
  feature_id: string;
  reachable: boolean;
  issues: AccessibilityIssue[];
  suggestions: string[];
  depth_margin_mm?: number;
  holder_clearance_mm?: number;
  aspect_ratio?: number;
}

export interface FullAccessibilityReport {
  all_reachable: boolean;
  total_features: number;
  reachable_count: number;
  blocked_count: number;
  warning_count: number;
  results: AccessibilityResult[];
  critical_issues: AccessibilityIssue[];
}

export interface ToolRecommendation {
  tool: ToolHolderGeometry;
  score: number;
  reasons: string[];
}

export interface AccessibilityConfig {
  approach_clearance_mm?: number;
  holder_clearance_margin_mm?: number;
  max_aspect_ratio?: number;
  singularity_threshold_deg?: number;
  five_axis_available?: boolean;
}

// ── Direct-parameter API types ──

export interface DirectAccessParams {
  feature_depth_mm: number;
  feature_width_mm: number;
  tool_diameter_mm: number;
  tool_length_mm: number;
  holder_diameter_mm?: number;
  holder_length_mm?: number;
  ipw_wall_height_mm?: number;
  corner_radius_mm?: number;
  approach_direction?: "top" | "bottom" | "left" | "right" | "front" | "back";
}

export interface DirectAccessResult {
  accessible: boolean;
  issues: string[];
  margin_mm: number;
  suggestions: string[];
}

export interface HolderClearanceParams {
  holder_diameter_mm: number;
  wall_distance_mm: number;
  wall_height_mm: number;
}

export interface HolderClearanceResult {
  clear: boolean;
  interference_mm: number;
}

export interface ChipEvacParams {
  pocket_depth_mm: number;
  pocket_width_mm: number;
  tool_diameter_mm: number;
  flute_count: number;
}

export interface ChipEvacResult {
  adequate: boolean;
  aspect_ratio: number;
  recommendations: string[];
}

export interface SimpleFeature {
  id: string;
  depth_mm: number;
  width_mm: number;
  corner_radius_mm?: number;
}

export interface SimpleTool {
  id: string;
  diameter_mm: number;
  length_mm: number;
  holder_diameter_mm?: number;
}

export interface SimpleAccessibilityReport {
  all_accessible: boolean;
  total_features: number;
  accessible_count: number;
  blocked_count: number;
  results: Array<{
    feature_id: string;
    tool_id: string;
    accessible: boolean;
    issues: string[];
    margin_mm: number;
  }>;
  critical_issues: string[];
}

// ── Engine ──

export class AccessibilityAnalysisEngine {
  readonly name = "AccessibilityAnalysisEngine";

  private static readonly DEFAULTS: Required<AccessibilityConfig> = {
    approach_clearance_mm: 5,
    holder_clearance_margin_mm: 2,
    max_aspect_ratio: 4,
    singularity_threshold_deg: 5,
    five_axis_available: false,
  };

  private static readonly CHIP_EVAC_WARNING_RATIO = 4;
  private static readonly CHIP_EVAC_CRITICAL_RATIO = 6;
  private static readonly MIN_HOLDER_CLEARANCE_MM = 2;

  // ═══════════════════════════════════════════════════════════
  // DIRECT-PARAMETER API (MF-MS1 spec methods)
  // ═══════════════════════════════════════════════════════════

  /**
   * Check tool+holder access using direct parameters (no IPW state needed).
   *
   * Physics:
   *   - Tool reach: tool_length >= feature_depth + 5mm clearance
   *   - Holder clearance: holder_diameter/2 + 2mm < wall distance
   *   - Corner radius: feature corner_radius >= tool_diameter/2
   *   - Chip evacuation: depth/width > 4 warning, > 6 critical
   */
  checkAccessDirect(params: DirectAccessParams): DirectAccessResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const clearance = AccessibilityAnalysisEngine.DEFAULTS.approach_clearance_mm;

    // 1. Tool reach check
    const requiredLength = params.feature_depth_mm + clearance;
    const margin = params.tool_length_mm - requiredLength;

    if (margin < 0) {
      issues.push(
        `Tool too short: need ${requiredLength.toFixed(1)}mm, have ${params.tool_length_mm.toFixed(1)}mm ` +
        `(${Math.abs(margin).toFixed(1)}mm deficit)`
      );
      suggestions.push(`Use tool with >= ${requiredLength.toFixed(1)}mm length`);
    }

    // 2. Holder clearance against feature walls
    if (params.holder_diameter_mm !== undefined) {
      const holderRadius = params.holder_diameter_mm / 2;
      const featureRadius = params.feature_width_mm / 2;
      const wallDistance = featureRadius - params.tool_diameter_mm / 2;

      // Holder interferes if its radius exceeds available wall clearance
      // when tool is deeper than flute and holder enters the pocket
      const toolStickout = params.tool_length_mm;
      const holderEntersFeature = params.feature_depth_mm > toolStickout * 0.8;

      if (wallDistance > 0) {
        const holderClearance = wallDistance - holderRadius + params.tool_diameter_mm / 2;
        if (holderClearance < AccessibilityAnalysisEngine.MIN_HOLDER_CLEARANCE_MM && holderEntersFeature) {
          issues.push(
            `Holder collision risk: Ø${params.holder_diameter_mm}mm holder, ` +
            `only ${holderClearance.toFixed(1)}mm clearance to walls`
          );
          suggestions.push("Use slimmer holder or shrink-fit toolholder");
        }
      }

      // IPW wall height check — holder can collide with workpiece walls above feature
      if (params.ipw_wall_height_mm !== undefined && params.ipw_wall_height_mm > 0) {
        const wallClearanceNeeded = holderRadius + AccessibilityAnalysisEngine.MIN_HOLDER_CLEARANCE_MM;
        // If walls are tall and feature is narrow, holder may collide at pocket entry
        if (params.feature_width_mm < params.holder_diameter_mm + AccessibilityAnalysisEngine.MIN_HOLDER_CLEARANCE_MM * 2) {
          if (params.ipw_wall_height_mm > params.feature_depth_mm * 0.5) {
            issues.push(
              `Holder blocked by IPW walls: wall height ${params.ipw_wall_height_mm.toFixed(1)}mm, ` +
              `holder Ø${params.holder_diameter_mm}mm needs ${wallClearanceNeeded.toFixed(1)}mm clearance`
            );
            suggestions.push("Use extended-reach tooling or remove obstructing walls first");
          }
        }
      }
    }

    // 3. Corner radius check — tool radius must be <= corner radius
    if (params.corner_radius_mm !== undefined) {
      const toolRadius = params.tool_diameter_mm / 2;
      if (toolRadius > params.corner_radius_mm) {
        issues.push(
          `Tool Ø${params.tool_diameter_mm}mm (R${toolRadius.toFixed(1)}mm) cannot cut ` +
          `R${params.corner_radius_mm.toFixed(1)}mm corners`
        );
        suggestions.push(
          `Use tool with Ø <= ${(params.corner_radius_mm * 2).toFixed(1)}mm ` +
          `or accept R${toolRadius.toFixed(1)}mm corners`
        );
      }
    }

    // 4. Chip evacuation — aspect ratio
    const aspectRatio = params.feature_width_mm > 0
      ? params.feature_depth_mm / params.feature_width_mm
      : Infinity;

    if (aspectRatio > AccessibilityAnalysisEngine.CHIP_EVAC_CRITICAL_RATIO) {
      issues.push(
        `Critical chip evacuation: aspect ratio ${aspectRatio.toFixed(1)}:1 (> 6:1)`
      );
      suggestions.push("Use peck cycles, through-tool coolant, and air blast");
    } else if (aspectRatio > AccessibilityAnalysisEngine.CHIP_EVAC_WARNING_RATIO) {
      issues.push(
        `Chip evacuation warning: aspect ratio ${aspectRatio.toFixed(1)}:1 (> 4:1)`
      );
      suggestions.push("Consider through-spindle coolant for deep feature");
    }

    return {
      accessible: issues.filter(i =>
        i.startsWith("Tool too short") ||
        i.startsWith("Holder collision risk") ||
        i.startsWith("Holder blocked") ||
        i.includes("cannot cut")
      ).length === 0 && aspectRatio <= AccessibilityAnalysisEngine.CHIP_EVAC_CRITICAL_RATIO,
      issues,
      margin_mm: margin,
      suggestions: [...new Set(suggestions)],
    };
  }

  /**
   * Find minimum tool diameter for a given corner radius.
   * Tool radius must be <= corner radius, so min diameter = 2 × corner_radius.
   * For zero/negative corner radius (sharp), returns near-zero.
   */
  findMinToolDiameter(corner_radius_mm: number): number {
    if (corner_radius_mm <= 0) return 0.1; // practical minimum
    return corner_radius_mm * 2;
  }

  /**
   * Check holder clearance against a wall.
   *
   * Physics: holder_diameter/2 + 2mm must be < wall_distance.
   * Returns interference as negative = collision, positive = clearance.
   */
  checkHolderClearance(params: HolderClearanceParams): HolderClearanceResult {
    const holderRadius = params.holder_diameter_mm / 2;
    const requiredClearance = holderRadius + AccessibilityAnalysisEngine.MIN_HOLDER_CLEARANCE_MM;
    const interference = requiredClearance - params.wall_distance_mm;

    return {
      clear: interference <= 0,
      interference_mm: interference,
    };
  }

  /**
   * Check chip evacuation adequacy for a pocket.
   *
   * Physics:
   *   - Aspect ratio = depth / width
   *   - > 4:1 = warning (chip packing risk)
   *   - > 6:1 = critical (likely recutting, tool breakage)
   *   - Flute count affects chip space — fewer flutes = better evacuation
   *   - Tool diameter vs pocket width affects chip clearance
   */
  checkChipEvacuation(params: ChipEvacParams): ChipEvacResult {
    const { pocket_depth_mm, pocket_width_mm, tool_diameter_mm, flute_count } = params;
    const recommendations: string[] = [];

    const aspectRatio = pocket_width_mm > 0
      ? pocket_depth_mm / pocket_width_mm
      : Infinity;

    // Chip space ratio — how much gullet space vs pocket cross section
    const chipSpaceRatio = (pocket_width_mm - tool_diameter_mm) / pocket_width_mm;

    // Aspect ratio checks
    if (aspectRatio > AccessibilityAnalysisEngine.CHIP_EVAC_CRITICAL_RATIO) {
      recommendations.push("CRITICAL: Use peck drilling cycle (G83) for chip breaking");
      recommendations.push("Use through-tool coolant (high pressure if available)");
      recommendations.push("Consider EDM for extreme aspect ratio features");
    } else if (aspectRatio > AccessibilityAnalysisEngine.CHIP_EVAC_WARNING_RATIO) {
      recommendations.push("Use peck cycle or high-pressure coolant");
      recommendations.push("Reduce depth of cut per pass");
    }

    // Flute count guidance
    if (flute_count > 3 && aspectRatio > 3) {
      recommendations.push(
        `Reduce to 2-flute endmill for better chip clearance (currently ${flute_count} flutes)`
      );
    }

    // Tool-to-pocket ratio
    if (tool_diameter_mm > pocket_width_mm * 0.85) {
      recommendations.push(
        "Tool diameter is > 85% of pocket width — limited chip clearance on sides"
      );
    }

    // Chip packing risk
    if (chipSpaceRatio < 0.2 && pocket_depth_mm > 20) {
      recommendations.push("Very tight chip clearance — use trochoidal milling strategy");
    }

    const adequate = aspectRatio <= AccessibilityAnalysisEngine.CHIP_EVAC_WARNING_RATIO;

    return {
      adequate,
      aspect_ratio: aspectRatio,
      recommendations,
    };
  }

  /**
   * Check all features against available tools — simplified direct API.
   * Assigns best-fit tool to each feature and checks accessibility.
   */
  checkAllFeatures(
    features: SimpleFeature[],
    tools: SimpleTool[]
  ): SimpleAccessibilityReport {
    const results: SimpleAccessibilityReport["results"] = [];
    const criticalIssues: string[] = [];

    for (const feature of features) {
      // Find best matching tool (smallest that fits)
      const compatibleTools = tools
        .filter(t => t.diameter_mm / 2 <= (feature.corner_radius_mm ?? Infinity))
        .sort((a, b) => a.diameter_mm - b.diameter_mm);

      const tool = compatibleTools.length > 0
        ? compatibleTools[0]
        : tools.sort((a, b) => a.diameter_mm - b.diameter_mm)[0];

      if (!tool) {
        results.push({
          feature_id: feature.id,
          tool_id: "none",
          accessible: false,
          issues: ["No tools available"],
          margin_mm: -Infinity,
        });
        criticalIssues.push(`Feature ${feature.id}: No tools available`);
        continue;
      }

      const access = this.checkAccessDirect({
        feature_depth_mm: feature.depth_mm,
        feature_width_mm: feature.width_mm,
        tool_diameter_mm: tool.diameter_mm,
        tool_length_mm: tool.length_mm,
        holder_diameter_mm: tool.holder_diameter_mm,
        corner_radius_mm: feature.corner_radius_mm,
      });

      results.push({
        feature_id: feature.id,
        tool_id: tool.id,
        accessible: access.accessible,
        issues: access.issues,
        margin_mm: access.margin_mm,
      });

      if (!access.accessible) {
        for (const issue of access.issues) {
          criticalIssues.push(`Feature ${feature.id}: ${issue}`);
        }
      }
    }

    const blocked = results.filter(r => !r.accessible).length;
    return {
      all_accessible: blocked === 0,
      total_features: results.length,
      accessible_count: results.length - blocked,
      blocked_count: blocked,
      results,
      critical_issues: criticalIssues,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // FULL IPW-AWARE API (original, used by forward simulation)
  // ═══════════════════════════════════════════════════════════

  /**
   * Check if a tool+holder can reach a feature in the current IPW.
   */
  checkAccess(
    op: OperationInput,
    tool: ToolHolderGeometry,
    state: WorkpieceState,
    config?: AccessibilityConfig
  ): AccessibilityResult {
    const cfg = { ...AccessibilityAnalysisEngine.DEFAULTS, ...config };
    const issues: AccessibilityIssue[] = [];
    const suggestions: string[] = [];

    const depth = op.depth_mm;
    const width = op.width_mm ?? op.tool_diameter_mm;
    const length = op.length_mm ?? op.tool_diameter_mm;
    const minDim = Math.min(width, length);

    // 1. Tool length vs depth + clearance
    const requiredLen = depth + cfg.approach_clearance_mm;
    const effectiveLen = tool.flute_length_mm ?? tool.tool_length_mm;
    const depthMargin = effectiveLen - requiredLen;

    if (depthMargin < 0) {
      issues.push({
        type: "tool_too_short",
        severity: "error",
        message: `Tool ${tool.tool_id} is ${Math.abs(depthMargin).toFixed(1)}mm too short `
          + `(need ${requiredLen.toFixed(1)}mm, have ${effectiveLen.toFixed(1)}mm)`,
        suggestion: `Use tool with ≥${requiredLen.toFixed(1)}mm flute length`,
      });
    }

    // 2. Holder collision with stock walls
    const holderClearance = this.checkHolderCollision(op, tool, state, cfg);
    if (holderClearance !== null && holderClearance < 0) {
      issues.push({
        type: "holder_collision",
        severity: "error",
        message: `Holder (Ø${tool.holder_diameter_mm}mm) collides with walls `
          + `by ${Math.abs(holderClearance).toFixed(1)}mm`,
        suggestion: "Use slimmer holder or shrink-fit",
      });
    } else if (holderClearance !== null && holderClearance < cfg.holder_clearance_margin_mm) {
      issues.push({
        type: "holder_collision",
        severity: "warning",
        message: `Holder clearance only ${holderClearance.toFixed(1)}mm`,
        suggestion: "Consider slimmer holder for safety",
      });
    }

    // 3. Corner radius check — tool diameter/2 must be <= required corner radius
    if (op.type === "pocket" || op.type === "slot") {
      const toolRadius = tool.tool_diameter_mm / 2;
      const cornerRadius = tool.corner_radius_mm;
      // If feature width implies a tight corner
      if (cornerRadius !== undefined && toolRadius > cornerRadius) {
        issues.push({
          type: "corner_radius",
          severity: "error",
          message: `Tool R${toolRadius.toFixed(1)}mm cannot achieve R${cornerRadius.toFixed(1)}mm corners`,
          suggestion: `Need tool Ø ≤ ${(cornerRadius * 2).toFixed(1)}mm`,
        });
      }
    }

    // 4. Chip evacuation — aspect ratio
    const aspectRatio = minDim > 0 ? depth / minDim : Infinity;
    if (aspectRatio > AccessibilityAnalysisEngine.CHIP_EVAC_CRITICAL_RATIO) {
      issues.push({
        type: "chip_evacuation",
        severity: "error",
        message: `Critical aspect ratio ${aspectRatio.toFixed(1)}:1 — chip evacuation failure likely`,
        suggestion: "Use peck cycles, through-tool coolant, or EDM",
      });
    } else if (aspectRatio > cfg.max_aspect_ratio) {
      issues.push({
        type: "chip_evacuation",
        severity: "warning",
        message: `Aspect ratio ${aspectRatio.toFixed(1)}:1 — chip evacuation risk`,
        suggestion: "Use peck cycles or through-tool coolant",
      });
      suggestions.push("Consider through-spindle coolant for deep feature");
    }

    // 5. Approach path check
    if (this.isApproachBlocked(op, state)) {
      issues.push({
        type: "approach_blocked",
        severity: cfg.five_axis_available ? "warning" : "error",
        message: "Approach from Z+ blocked by overhanging material",
        suggestion: cfg.five_axis_available
          ? "Use 5-axis tilted approach"
          : "Resequence to clear blocking feature first",
      });
    }

    // 6. Undercut check — feature wider than opening
    if (op.type === "slot" || op.type === "groove") {
      // Slot features may require undercut tooling (T-slot, lollipop)
      if (width > tool.tool_diameter_mm * 1.5 && depth > width) {
        issues.push({
          type: "undercut",
          severity: "warning",
          message: `Feature may require undercut tooling (width ${width.toFixed(1)}mm > tool Ø${tool.tool_diameter_mm}mm)`,
          suggestion: "Use T-slot cutter or lollipop endmill",
        });
      }
    }

    // Collect suggestions
    for (const issue of issues) {
      if (issue.suggestion) suggestions.push(issue.suggestion);
    }

    const hasErrors = issues.some(i => i.severity === "error");
    return {
      feature_id: op.id,
      reachable: !hasErrors,
      issues,
      suggestions: [...new Set(suggestions)],
      depth_margin_mm: depthMargin,
      holder_clearance_mm: holderClearance ?? undefined,
      aspect_ratio: aspectRatio,
    };
  }

  /**
   * Rank tools from a catalog that can reach a given feature.
   */
  findReachableTools(
    op: OperationInput,
    state: WorkpieceState,
    catalog: ToolHolderGeometry[],
    config?: AccessibilityConfig
  ): ToolRecommendation[] {
    const recs: ToolRecommendation[] = [];
    for (const tool of catalog) {
      const result = this.checkAccess(op, tool, state, config);
      if (!result.reachable) continue;

      let score = 100;
      const reasons: string[] = [`Ø${tool.tool_diameter_mm}mm`];

      if (result.depth_margin_mm !== undefined && result.depth_margin_mm > 10) {
        score += 5;
        reasons.push("Good depth margin");
      }
      score += Math.min(10, tool.tool_diameter_mm / 2);
      score -= result.issues.filter(i => i.severity === "warning").length * 5;

      recs.push({ tool, score, reasons });
    }
    return recs.sort((a, b) => b.score - a.score);
  }

  /**
   * Check all operations against their assigned tools (full IPW-aware).
   */
  checkAllFeaturesIPW(
    state: WorkpieceState,
    assignments: Array<{ op: OperationInput; tool: ToolHolderGeometry }>,
    config?: AccessibilityConfig
  ): FullAccessibilityReport {
    const results: AccessibilityResult[] = [];
    const criticalIssues: AccessibilityIssue[] = [];

    for (const { op, tool } of assignments) {
      const result = this.checkAccess(op, tool, state, config);
      results.push(result);
      for (const issue of result.issues) {
        if (issue.severity === "error") criticalIssues.push(issue);
      }
    }

    const blocked = results.filter(r => !r.reachable).length;
    return {
      all_reachable: blocked === 0,
      total_features: results.length,
      reachable_count: results.length - blocked,
      blocked_count: blocked,
      warning_count: results.filter(
        r => r.reachable && r.issues.some(i => i.severity === "warning")
      ).length,
      results,
      critical_issues: criticalIssues,
    };
  }

  // ── Private ──

  private checkHolderCollision(
    op: OperationInput,
    tool: ToolHolderGeometry,
    state: WorkpieceState,
    cfg: Required<AccessibilityConfig>
  ): number | null {
    if (!tool.holder_diameter_mm) return null;

    const holderR = tool.holder_diameter_mm / 2;
    const pos = op.position ?? { x: 0, y: 0, z: state.current_ipw.max.z };

    // Check clearance to stock boundary walls
    const clearances = [
      pos.x - state.stock.min.x - holderR,
      state.stock.max.x - pos.x - holderR,
      pos.y - state.stock.min.y - holderR,
      state.stock.max.y - pos.y - holderR,
    ];

    let min = Math.min(...clearances);

    // Check clearance to tracked wall sections
    for (const wall of state.wall_sections) {
      const dx = Math.abs(pos.x - wall.position.x);
      const dy = Math.abs(pos.y - wall.position.y);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const wc = dist - holderR - wall.thickness_mm / 2;
      if (wc < min) min = wc;
    }

    return min;
  }

  private isApproachBlocked(op: OperationInput, state: WorkpieceState): boolean {
    const approach = op.approach_direction ?? "top";
    if (approach !== "top") return false;

    const pos = op.position ?? { x: 0, y: 0, z: state.current_ipw.max.z };
    const featureTopZ = pos.z;

    // If feature starts below the stock top with no prior removal above it
    if (featureTopZ < state.stock.max.z - 1) {
      // Check if a previous operation cleared material above
      for (const prevOp of state.operations_applied) {
        if (prevOp.position.z >= featureTopZ) {
          return false;
        }
      }
      return true;
    }
    return false;
  }
}

export const accessibilityAnalysisEngine = new AccessibilityAnalysisEngine();
