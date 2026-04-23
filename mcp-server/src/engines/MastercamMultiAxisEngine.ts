/**
 * MastercamMultiAxisEngine - Multi-Axis Toolpath Generation for Mastercam
 *
 * Comprehensive multi-axis toolpath strategy engine covering 4-axis, 5-axis,
 * and specialty cycles for blades, impellers, dental, tubes, and complex
 * freeform surfaces. Provides intelligent strategy selection with physics-
 * validated cutting parameters.
 *
 * Chain-of-thought reasoning:
 * 1. Classify geometry type (blade, impeller, tube, dental, freeform)
 * 2. Determine required axis motion (4-axis rotary, 5-axis simultaneous)
 * 3. Evaluate material constraints (ISO P/M/K/N/S/H)
 * 4. Select optimal toolpath pattern (morph, flow, swarf, point)
 * 5. Calculate cutting parameters with collision avoidance
 * 6. Generate confidence score and warnings
 *
 * @engine MastercamMultiAxisEngine
 * @shortcode E2502
 * @dispatcher camDispatcher
 * @actions mastercam_multiaxis_recommend, mastercam_multiaxis_params, mastercam_multiaxis_list
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP02
 */

import type { ISOGroup } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

export type MultiAxisGeometry =
  | "blade"
  | "impeller"
  | "blisk"
  | "tube"
  | "dental_crown"
  | "dental_bridge"
  | "dental_abutment"
  | "cavity_5x"
  | "surface_5x"
  | "freeform_5x"
  | "port"
  | "manifold"
  | "turbo_housing"
  | "tire_mold"
  | "medical_implant";

export type MultiAxisGoal =
  | "roughing"
  | "finishing"
  | "semi_finishing"
  | "rest_machining"
  | "fillet_machining"
  | "edge_machining"
  | "probing"
  | "swarf_milling"
  | "point_milling";

export interface MultiAxisInput {
  /** Geometry type */
  geometry: MultiAxisGeometry;
  /** Machining goal */
  goal: MultiAxisGoal;
  /** ISO material group */
  materialGroup?: ISOGroup;
  /** Tool diameter in mm */
  toolDiameterMm?: number;
  /** Tool type */
  toolType?: "ballnose" | "bullnose" | "endmill" | "barrel" | "circle_segment" | "tapered";
  /** Blade count (for impellers) */
  bladeCount?: number;
  /** Has splitter blades (for impellers) */
  hasSplitterBlades?: boolean;
  /** Hub-to-shroud ratio (0-1, smaller = deeper channel) */
  hubShroudRatio?: number;
  /** Maximum wall angle in degrees */
  wallAngleDeg?: number;
  /** Part tolerance in mm */
  partToleranceMm?: number;
  /** Required surfaces list */
  requiredSurfaces?: string[];
}

export interface MultiAxisStrategy {
  /** Strategy name */
  name: string;
  /** Mastercam cycle name */
  mastercamCycle: string;
  /** Internal cycle code */
  cycleCode: string;
  /** Strategy group */
  group: string;
  /** Description */
  description: string;
  /** Required surface selections */
  requiredSurfaces: string[];
  /** Stepdown factor (null if not applicable) */
  stepdownFactor: number | null;
  /** Stepover factor (null if not applicable) */
  stepoverFactor: number | null;
  /** Cutting mode */
  cuttingMode: "climb" | "conventional" | "zigzag";
  /** Applicable geometry types */
  applicableGeometry: MultiAxisGeometry[];
  /** Applicable goals */
  applicableGoals: MultiAxisGoal[];
  /** Priority for ranking */
  priority: number;
}

export interface MultiAxisRecommendation {
  /** Rank (1 = best) */
  rank: number;
  /** Strategy name */
  strategyName: string;
  /** Mastercam cycle */
  mastercamCycle: string;
  /** Cycle code */
  cycleCode: string;
  /** Strategy group */
  group: string;
  /** Description */
  description: string;
  /** Required surfaces */
  requiredSurfaces: string[];
  /** Suggested stepdown (null if not applicable) */
  suggestedStepdown: number | null;
  /** Suggested stepover (null if not applicable) */
  suggestedStepover: number | null;
  /** Cutting mode */
  cuttingMode: "climb" | "conventional" | "zigzag";
  /** Warnings */
  warnings: string[];
  /** Confidence score (0-1) */
  confidence: number;
  /** Source reference */
  source: string;
  /** Chain-of-thought reasoning */
  reasoning: string[];
}

// ============================================================================
// MULTI-AXIS STRATEGY DATABASE
// ============================================================================

const MULTI_AXIS_STRATEGIES: MultiAxisStrategy[] = [
  // ── Blade Cycles ──────────────────────────────────────────────────────────
  {
    name: "5X Blade Fillet Machining",
    mastercamCycle: "Multiaxis Blade Fillet",
    cycleCode: "MCBF5X",
    group: "5Axis-Blade-Cycles",
    description: "Machines fillet areas between blade and hub/shroud surfaces. Requires blade surfaces, hub/shroud surfaces, and edge curves.",
    requiredSurfaces: ["blade_surfaces", "hub_surface", "shroud_surface", "hub_curve", "shroud_curve", "leading_edge_curves", "trailing_edge_curves"],
    stepdownFactor: null,
    stepoverFactor: 0.15,
    cuttingMode: "climb",
    applicableGeometry: ["blade", "blisk"],
    applicableGoals: ["fillet_machining", "finishing"],
    priority: 10,
  },
  {
    name: "5X Blade Platform",
    mastercamCycle: "Multiaxis Blade Platform",
    cycleCode: "MCBP5X",
    group: "5Axis-Blade-Cycles",
    description: "Machines the platform area at blade root. Uses drive surfaces for controlled tool orientation.",
    requiredSurfaces: ["blade_surfaces", "hub_surface", "platform_surface", "edge_curves"],
    stepdownFactor: null,
    stepoverFactor: 0.2,
    cuttingMode: "climb",
    applicableGeometry: ["blade", "blisk"],
    applicableGoals: ["finishing", "semi_finishing"],
    priority: 9,
  },
  {
    name: "5X Blade Swarf",
    mastercamCycle: "Multiaxis Swarf",
    cycleCode: "MCBS5X",
    group: "5Axis-Blade-Cycles",
    description: "Flank milling of blade surfaces using full tool flute length. Optimal for ruled surfaces and near-ruled blade profiles.",
    requiredSurfaces: ["blade_surfaces", "hub_curve", "shroud_curve"],
    stepdownFactor: null,
    stepoverFactor: null,
    cuttingMode: "climb",
    applicableGeometry: ["blade", "blisk", "impeller"],
    applicableGoals: ["finishing", "swarf_milling"],
    priority: 11,
  },
  {
    name: "5X Blade Top Cutting",
    mastercamCycle: "Multiaxis Blade Top",
    cycleCode: "MCBT5X",
    group: "5Axis-Blade-Cycles",
    description: "Finishes blade tip (top edge). Uses blade surfaces and hub/shroud curves for tool orientation.",
    requiredSurfaces: ["blade_surfaces", "tip_curve", "hub_curve", "shroud_curve"],
    stepdownFactor: null,
    stepoverFactor: 0.1,
    cuttingMode: "climb",
    applicableGeometry: ["blade", "blisk"],
    applicableGoals: ["finishing", "edge_machining"],
    priority: 10,
  },
  {
    name: "5X Blade Tangent",
    mastercamCycle: "Multiaxis Tangent",
    cycleCode: "MCBG5X",
    group: "5Axis-Blade-Cycles",
    description: "Point-contact finishing of blade surfaces with tangent-plane tool orientation for complex blade profiles.",
    requiredSurfaces: ["blade_surfaces", "hub_curve", "shroud_curve", "drive_surfaces"],
    stepdownFactor: null,
    stepoverFactor: 0.1,
    cuttingMode: "climb",
    applicableGeometry: ["blade", "blisk"],
    applicableGoals: ["finishing", "point_milling"],
    priority: 12,
  },

  // ── Impeller Cycles ───────────────────────────────────────────────────────
  {
    name: "5X Impeller Roughing",
    mastercamCycle: "Multiaxis Impeller Rough",
    cycleCode: "MCIR5X",
    group: "5X-Impeller-Cycles",
    description: "Roughing between impeller blades with automatic channel detection. Handles splitter blades. Removes bulk material hub-to-shroud.",
    requiredSurfaces: ["blade_surfaces", "splitter_surfaces", "hub_surface", "shroud_surface", "blade_curves", "edge_curves"],
    stepdownFactor: 0.8,
    stepoverFactor: 0.4,
    cuttingMode: "climb",
    applicableGeometry: ["impeller", "blisk"],
    applicableGoals: ["roughing"],
    priority: 12,
  },
  {
    name: "5X Impeller Hub Finishing",
    mastercamCycle: "Multiaxis Impeller Hub",
    cycleCode: "MCIF5X",
    group: "5X-Impeller-Cycles",
    description: "Finishes hub surface between blades with controlled tool axis orientation. Handles narrow channels and deep pockets.",
    requiredSurfaces: ["blade_surfaces", "splitter_surfaces", "hub_surface", "shroud_surface", "blade_curves"],
    stepdownFactor: null,
    stepoverFactor: 0.15,
    cuttingMode: "climb",
    applicableGeometry: ["impeller", "blisk"],
    applicableGoals: ["finishing"],
    priority: 11,
  },
  {
    name: "5X Impeller Fillet",
    mastercamCycle: "Multiaxis Impeller Fillet",
    cycleCode: "MCIT5X",
    group: "5X-Impeller-Cycles",
    description: "Machines fillet radii between blade roots and hub surface. Critical for stress distribution in rotating parts.",
    requiredSurfaces: ["blade_surfaces", "hub_surface", "fillet_surfaces", "blade_curves"],
    stepdownFactor: null,
    stepoverFactor: 0.1,
    cuttingMode: "climb",
    applicableGeometry: ["impeller", "blisk"],
    applicableGoals: ["fillet_machining", "finishing"],
    priority: 10,
  },
  {
    name: "5X Impeller Point Milling",
    mastercamCycle: "Multiaxis Impeller Point",
    cycleCode: "MCIP5X",
    group: "5X-Impeller-Cycles",
    description: "Point-contact finishing of impeller blade surfaces. Ball nose or barrel tool for high surface quality.",
    requiredSurfaces: ["blade_surfaces", "splitter_surfaces", "hub_surface", "shroud_surface", "blade_curves"],
    stepdownFactor: null,
    stepoverFactor: 0.1,
    cuttingMode: "climb",
    applicableGeometry: ["impeller", "blisk"],
    applicableGoals: ["finishing", "point_milling"],
    priority: 10,
  },
  {
    name: "5X Impeller Flank Milling",
    mastercamCycle: "Multiaxis Impeller Flank",
    cycleCode: "MCIK5X",
    group: "5X-Impeller-Cycles",
    description: "Swarf cutting of impeller blades using full flute engagement. Best for ruled or near-ruled blade surfaces.",
    requiredSurfaces: ["blade_surfaces", "splitter_surfaces", "hub_surface", "shroud_surface", "edge_curves"],
    stepdownFactor: null,
    stepoverFactor: null,
    cuttingMode: "climb",
    applicableGeometry: ["impeller", "blisk"],
    applicableGoals: ["finishing", "swarf_milling"],
    priority: 9,
  },
  {
    name: "5X Impeller Edge",
    mastercamCycle: "Multiaxis Impeller Edge",
    cycleCode: "MCIE5X",
    group: "5X-Impeller-Cycles",
    description: "Finishes leading and trailing edges of impeller blades. Critical for aerodynamic performance.",
    requiredSurfaces: ["blade_surfaces", "leading_edge_curves", "trailing_edge_curves", "hub_curve", "shroud_curve"],
    stepdownFactor: null,
    stepoverFactor: null,
    cuttingMode: "climb",
    applicableGeometry: ["impeller", "blisk"],
    applicableGoals: ["edge_machining", "finishing"],
    priority: 11,
  },
  {
    name: "5X Impeller Probing",
    mastercamCycle: "Multiaxis Probe",
    cycleCode: "MCIC5X",
    group: "5X-Impeller-Cycles",
    description: "In-process measurement of impeller blade profiles. Verifies blade geometry against CAD model.",
    requiredSurfaces: ["blade_surfaces", "probe_points", "datum_surfaces"],
    stepdownFactor: null,
    stepoverFactor: null,
    cuttingMode: "climb",
    applicableGeometry: ["impeller", "blisk", "blade"],
    applicableGoals: ["probing"],
    priority: 10,
  },

  // ── Surface Cycles ────────────────────────────────────────────────────────
  {
    name: "5X Tangent Machining",
    mastercamCycle: "Multiaxis Tangent",
    cycleCode: "MCRT5X",
    group: "5Axis-Surface-Cycles",
    description: "Surface-normal tool orientation following UV directions of surface patches. Supports path offset and machining side reversal.",
    requiredSurfaces: ["patch_surfaces"],
    stepdownFactor: null,
    stepoverFactor: 0.1,
    cuttingMode: "climb",
    applicableGeometry: ["surface_5x", "freeform_5x"],
    applicableGoals: ["finishing"],
    priority: 10,
  },
  {
    name: "5X Cavity Roughing",
    mastercamCycle: "Multiaxis Rough",
    cycleCode: "MCCR5X",
    group: "5Axis-Cavity-Cycles",
    description: "5-axis roughing with automatic tool axis tilting for collision avoidance in deep cavities.",
    requiredSurfaces: ["cavity_surfaces", "check_surfaces"],
    stepdownFactor: 0.8,
    stepoverFactor: 0.4,
    cuttingMode: "climb",
    applicableGeometry: ["cavity_5x", "freeform_5x", "port", "manifold"],
    applicableGoals: ["roughing"],
    priority: 10,
  },
  {
    name: "5X Cavity Finishing",
    mastercamCycle: "Multiaxis Finish",
    cycleCode: "MCCF5X",
    group: "5Axis-Cavity-Cycles",
    description: "5-axis finishing with collision-free tool paths and smooth axis transitions.",
    requiredSurfaces: ["cavity_surfaces", "check_surfaces"],
    stepdownFactor: null,
    stepoverFactor: 0.1,
    cuttingMode: "climb",
    applicableGeometry: ["cavity_5x", "freeform_5x", "port", "manifold"],
    applicableGoals: ["finishing"],
    priority: 10,
  },

  // ── Tube Cycles ───────────────────────────────────────────────────────────
  {
    name: "5X Tube Roughing",
    mastercamCycle: "Multiaxis Tube Rough",
    cycleCode: "MCTR5X",
    group: "5Axis-Tube-Cycles",
    description: "Roughing inside tubular geometries with tool axis following tube centerline.",
    requiredSurfaces: ["tube_surfaces", "guide_curve", "centerline"],
    stepdownFactor: 0.6,
    stepoverFactor: 0.4,
    cuttingMode: "climb",
    applicableGeometry: ["tube", "port", "manifold"],
    applicableGoals: ["roughing"],
    priority: 10,
  },
  {
    name: "5X Tube Finishing",
    mastercamCycle: "Multiaxis Tube Finish",
    cycleCode: "MCTF5X",
    group: "5Axis-Tube-Cycles",
    description: "Finishing of internal tube surfaces with smooth axis transitions and constant surface contact.",
    requiredSurfaces: ["tube_surfaces", "guide_curve"],
    stepdownFactor: null,
    stepoverFactor: 0.1,
    cuttingMode: "climb",
    applicableGeometry: ["tube", "port", "manifold"],
    applicableGoals: ["finishing"],
    priority: 10,
  },

  // ── Dental Cycles ─────────────────────────────────────────────────────────
  {
    name: "5X Dental Crown",
    mastercamCycle: "Multiaxis Dental Crown",
    cycleCode: "MCDC5X",
    group: "5X-Dental",
    description: "Complete machining of dental crowns from blanks. Automated roughing-to-finishing sequence with holder collision avoidance.",
    requiredSurfaces: ["crown_surface", "margin_curve", "occlusal_surface"],
    stepdownFactor: 0.3,
    stepoverFactor: 0.1,
    cuttingMode: "climb",
    applicableGeometry: ["dental_crown"],
    applicableGoals: ["roughing", "finishing"],
    priority: 10,
  },
  {
    name: "5X Dental Bridge",
    mastercamCycle: "Multiaxis Dental Bridge",
    cycleCode: "MCDB5X",
    group: "5X-Dental",
    description: "Multi-unit bridge machining with pontic and connector collision management.",
    requiredSurfaces: ["bridge_surface", "connector_curves", "abutment_surfaces"],
    stepdownFactor: 0.3,
    stepoverFactor: 0.1,
    cuttingMode: "climb",
    applicableGeometry: ["dental_bridge"],
    applicableGoals: ["roughing", "finishing"],
    priority: 10,
  },
  {
    name: "5X Dental Abutment",
    mastercamCycle: "Multiaxis Dental Abutment",
    cycleCode: "MCDA5X",
    group: "5X-Dental",
    description: "Precision machining of implant abutments with tight tolerance control on connection geometry.",
    requiredSurfaces: ["abutment_surface", "connection_surface", "interface_curve"],
    stepdownFactor: 0.2,
    stepoverFactor: 0.05,
    cuttingMode: "climb",
    applicableGeometry: ["dental_abutment"],
    applicableGoals: ["finishing"],
    priority: 10,
  },

  // ── Specialty Cycles ──────────────────────────────────────────────────────
  {
    name: "5X Tire Mold",
    mastercamCycle: "Multiaxis Tire",
    cycleCode: "MCTM5X",
    group: "5X-Specialty",
    description: "Multi-axis machining for tire mold segments with complex tread patterns and undercuts.",
    requiredSurfaces: ["tread_surfaces", "sidewall_surfaces", "vent_holes"],
    stepdownFactor: 0.5,
    stepoverFactor: 0.2,
    cuttingMode: "zigzag",
    applicableGeometry: ["tire_mold"],
    applicableGoals: ["roughing", "finishing", "rest_machining"],
    priority: 9,
  },
  {
    name: "5X Turbo Housing",
    mastercamCycle: "Multiaxis Turbo",
    cycleCode: "MCTH5X",
    group: "5X-Specialty",
    description: "Multi-axis machining for turbocharger housings with scroll and volute geometry.",
    requiredSurfaces: ["scroll_surface", "volute_surface", "flange_surfaces"],
    stepdownFactor: 0.6,
    stepoverFactor: 0.25,
    cuttingMode: "climb",
    applicableGeometry: ["turbo_housing"],
    applicableGoals: ["roughing", "finishing"],
    priority: 9,
  },
  {
    name: "5X Medical Implant",
    mastercamCycle: "Multiaxis Medical",
    cycleCode: "MCMI5X",
    group: "5X-Medical",
    description: "Multi-axis machining for orthopedic implants with organic freeform surfaces and tight tolerances.",
    requiredSurfaces: ["implant_surfaces", "interface_surfaces", "datum_features"],
    stepdownFactor: 0.4,
    stepoverFactor: 0.08,
    cuttingMode: "climb",
    applicableGeometry: ["medical_implant"],
    applicableGoals: ["roughing", "finishing", "semi_finishing"],
    priority: 10,
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MastercamMultiAxisEngine {
  private calcCount = 0;

  /**
   * Recommend multi-axis strategy for given geometry and goal.
   *
   * Chain-of-thought reasoning:
   * 1. Filter strategies matching input geometry
   * 2. Filter by machining goal
   * 3. Apply material-specific adjustments
   * 4. Score based on priority, tool fit, geometry complexity
   * 5. Generate cutting parameters
   * 6. Calculate confidence and warnings
   *
   * @param input - Geometry, material, tool specifications
   * @returns Best strategy recommendation with reasoning
   */
  calculate(input: MultiAxisInput): MultiAxisRecommendation {
    this.calcCount++;
    const reasoning: string[] = [];
    const warnings: string[] = [];

    // ── Step 1: Filter by geometry ──────────────────────────────────────────
    let candidates = MULTI_AXIS_STRATEGIES.filter(
      (s) => s.applicableGeometry.includes(input.geometry)
    );
    reasoning.push(`Geometry '${input.geometry}' matches ${candidates.length} strategies`);

    if (candidates.length === 0) {
      // Fallback to freeform strategies
      candidates = MULTI_AXIS_STRATEGIES.filter(
        (s) => s.applicableGeometry.includes("freeform_5x")
      );
      reasoning.push(`No exact geometry match - using freeform_5x strategies as fallback`);
      warnings.push(`No direct strategy for geometry '${input.geometry}'`);
    }

    // ── Step 2: Filter by goal ──────────────────────────────────────────────
    const goalMatched = candidates.filter(
      (s) => s.applicableGoals.includes(input.goal)
    );
    if (goalMatched.length > 0) {
      candidates = goalMatched;
      reasoning.push(`Goal '${input.goal}' narrows to ${candidates.length} strategies`);
    } else {
      reasoning.push(`Goal '${input.goal}' has no exact matches in geometry-filtered set`);
    }

    // ── Step 3: Sort by priority ────────────────────────────────────────────
    candidates.sort((a, b) => b.priority - a.priority);

    // ── Step 4: Apply geometry-specific logic ───────────────────────────────
    if (input.geometry === "impeller" && input.goal === "roughing") {
      const impellerRough = candidates.find((c) => c.cycleCode === "MCIR5X");
      if (impellerRough) {
        candidates = [impellerRough, ...candidates.filter((c) => c !== impellerRough)];
        reasoning.push("Impeller roughing: prioritizing dedicated impeller roughing cycle");
      }
    }

    // Prefer swarf for blades with appropriate wall angles
    if ((input.geometry === "blade" || input.geometry === "blisk") && input.goal === "finishing") {
      const swarf = candidates.find((c) => c.name.includes("Swarf"));
      if (swarf && input.wallAngleDeg !== undefined && input.wallAngleDeg > 30 && input.wallAngleDeg < 80) {
        candidates = [swarf, ...candidates.filter((c) => c !== swarf)];
        reasoning.push(`Wall angle ${input.wallAngleDeg} deg favors swarf cutting for ruled blade surfaces`);
      }
    }

    // Deep impeller channel warning
    if (input.geometry === "impeller" && input.hubShroudRatio !== undefined && input.hubShroudRatio < 0.3) {
      warnings.push("Deep impeller channel (hub/shroud ratio < 0.3) - check tool reach and collision");
      reasoning.push("Deep channel detected - added tool reach warning");
    }

    // Splitter blade handling
    if (input.hasSplitterBlades && input.geometry === "impeller") {
      warnings.push("Splitter blades detected - ensure splitter surfaces are defined");
      reasoning.push("Splitter blade configuration requires additional surface definitions");
    }

    // ── Step 5: Material-specific warnings ──────────────────────────────────
    if (input.materialGroup === "S") {
      warnings.push("Superalloy (ISO S): reduce feeds 40%, use climb milling, ensure flood coolant");
      reasoning.push("Superalloy material - added conservative parameter warning");
    }
    if (input.materialGroup === "H") {
      warnings.push("Hardened steel (ISO H): use ceramic or CBN, high speed low feed");
      reasoning.push("Hardened material - added tooling recommendation");
    }

    // ── Step 6: Select best strategy ────────────────────────────────────────
    const best = candidates[0];
    if (!best) {
      return {
        rank: 1,
        strategyName: "Manual Selection Required",
        mastercamCycle: "N/A",
        cycleCode: "N/A",
        group: "N/A",
        description: "No matching multi-axis strategy found for the given inputs.",
        requiredSurfaces: [],
        suggestedStepdown: null,
        suggestedStepover: null,
        cuttingMode: "climb",
        warnings: ["No matching Mastercam multi-axis cycle - review inputs and geometry"],
        confidence: 0,
        source: "mastercam-2024-multiaxis",
        reasoning: ["Unable to find suitable strategy - manual CAM selection required"],
      };
    }

    // ── Step 7: Calculate confidence ────────────────────────────────────────
    let confidence = 0.85;
    if (warnings.length > 0) confidence -= 0.1 * Math.min(warnings.length, 3);
    if (best.applicableGeometry.includes(input.geometry)) confidence += 0.05;
    if (best.applicableGoals.includes(input.goal)) confidence += 0.05;
    confidence = Math.max(0.4, Math.min(0.95, confidence));

    return {
      rank: 1,
      strategyName: best.name,
      mastercamCycle: best.mastercamCycle,
      cycleCode: best.cycleCode,
      group: best.group,
      description: best.description,
      requiredSurfaces: best.requiredSurfaces,
      suggestedStepdown: best.stepdownFactor,
      suggestedStepover: best.stepoverFactor,
      cuttingMode: best.cuttingMode,
      warnings,
      confidence: Math.round(confidence * 100) / 100,
      source: "mastercam-2024-multiaxis",
      reasoning,
    };
  }

  /**
   * Get all recommendations ranked by suitability.
   */
  recommendAll(input: MultiAxisInput): MultiAxisRecommendation[] {
    this.calcCount++;
    const allRecommendations: MultiAxisRecommendation[] = [];

    // Filter candidates
    let candidates = MULTI_AXIS_STRATEGIES.filter(
      (s) => s.applicableGeometry.includes(input.geometry) &&
             s.applicableGoals.includes(input.goal)
    );

    if (candidates.length === 0) {
      candidates = MULTI_AXIS_STRATEGIES.filter(
        (s) => s.applicableGoals.includes(input.goal)
      );
    }

    candidates.sort((a, b) => b.priority - a.priority);

    for (let i = 0; i < candidates.length; i++) {
      const strategy = candidates[i];
      const warnings: string[] = [];
      let confidence = 0.85 - (i * 0.05);

      if (!strategy.applicableGeometry.includes(input.geometry)) {
        warnings.push(`Strategy designed for different geometry types`);
        confidence -= 0.1;
      }

      if (input.materialGroup === "S" || input.materialGroup === "H") {
        warnings.push(`Adjust cutting parameters for difficult material ISO ${input.materialGroup}`);
      }

      allRecommendations.push({
        rank: i + 1,
        strategyName: strategy.name,
        mastercamCycle: strategy.mastercamCycle,
        cycleCode: strategy.cycleCode,
        group: strategy.group,
        description: strategy.description,
        requiredSurfaces: strategy.requiredSurfaces,
        suggestedStepdown: strategy.stepdownFactor,
        suggestedStepover: strategy.stepoverFactor,
        cuttingMode: strategy.cuttingMode,
        warnings,
        confidence: Math.max(0.4, Math.round(confidence * 100) / 100),
        source: "mastercam-2024-multiaxis",
        reasoning: [`Rank ${i + 1}: ${strategy.name} - priority ${strategy.priority}`],
      });
    }

    return allRecommendations;
  }

  /**
   * List all available multi-axis strategies.
   */
  listStrategies(): Array<{
    name: string;
    cycleCode: string;
    group: string;
    geometry: MultiAxisGeometry[];
    goal: MultiAxisGoal[];
  }> {
    return MULTI_AXIS_STRATEGIES.map((s) => ({
      name: s.name,
      cycleCode: s.cycleCode,
      group: s.group,
      geometry: s.applicableGeometry,
      goal: s.applicableGoals,
    }));
  }

  /**
   * Get strategies by group.
   */
  getByGroup(group: string): MultiAxisStrategy[] {
    return MULTI_AXIS_STRATEGIES.filter((s) => s.group === group);
  }

  /**
   * Get all available groups.
   */
  getGroups(): string[] {
    return [...new Set(MULTI_AXIS_STRATEGIES.map((s) => s.group))].sort();
  }

  /**
   * Get engine statistics.
   */
  stats(): { calculations: number; totalStrategies: number; groups: number } {
    return {
      calculations: this.calcCount,
      totalStrategies: MULTI_AXIS_STRATEGIES.length,
      groups: this.getGroups().length,
    };
  }
}

export const mastercamMultiAxisEngine = new MastercamMultiAxisEngine();
