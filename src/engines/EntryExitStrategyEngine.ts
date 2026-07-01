/**
 * Entry/Exit Strategy Engine
 *
 * Safe tool engagement and disengagement strategies for CNC milling.
 * Selects optimal entry method based on material, tool, and geometry.
 *
 * Features:
 * - Helical interpolation entry (ramp into pocket)
 * - Arc/tangent entry (smooth approach to wall)
 * - Linear ramp entry (angled plunge)
 * - Plunge strategy selection (helix vs ramp vs pre-drill vs interpolated)
 * - Material-specific entry parameters
 * - Exit strategy (arc-out, tangent, rapid retract)
 *
 * Sources:
 * - SolidCAM PRISM CAM Algorithms Roadmap Session 2.7
 * - Sandvik Coromant: Milling Entry Techniques
 * - hyperMILL Manual: Entry/Exit Strategies
 *
 * @module engines/EntryExitStrategyEngine
 */

import { log } from "../utils/Logger.js";

// ── Material-specific entry parameters ──────────────────────────
const MATERIAL_ENTRY_DEFAULTS: Record<string, {
  max_helix_angle_deg: number;
  max_ramp_angle_deg: number;
  helix_dia_factor: number;   // helix diameter as fraction of tool diameter
  plunge_allowed: boolean;
  preferred_method: "helix" | "ramp" | "arc" | "interpolated";
}> = {
  aluminum:       { max_helix_angle_deg: 5.0,  max_ramp_angle_deg: 10, helix_dia_factor: 0.9, plunge_allowed: true,  preferred_method: "helix" },
  brass:          { max_helix_angle_deg: 4.0,  max_ramp_angle_deg: 8,  helix_dia_factor: 0.85, plunge_allowed: true,  preferred_method: "helix" },
  mild_steel:     { max_helix_angle_deg: 3.0,  max_ramp_angle_deg: 5,  helix_dia_factor: 0.8, plunge_allowed: false, preferred_method: "helix" },
  alloy_steel:    { max_helix_angle_deg: 2.5,  max_ramp_angle_deg: 4,  helix_dia_factor: 0.75, plunge_allowed: false, preferred_method: "helix" },
  stainless:      { max_helix_angle_deg: 2.0,  max_ramp_angle_deg: 3,  helix_dia_factor: 0.7, plunge_allowed: false, preferred_method: "helix" },
  titanium:       { max_helix_angle_deg: 1.5,  max_ramp_angle_deg: 2,  helix_dia_factor: 0.6, plunge_allowed: false, preferred_method: "ramp" },
  inconel:        { max_helix_angle_deg: 1.0,  max_ramp_angle_deg: 1.5, helix_dia_factor: 0.5, plunge_allowed: false, preferred_method: "ramp" },
  cast_iron:      { max_helix_angle_deg: 3.5,  max_ramp_angle_deg: 6,  helix_dia_factor: 0.8, plunge_allowed: true,  preferred_method: "helix" },
  hardened_steel: { max_helix_angle_deg: 1.0,  max_ramp_angle_deg: 1.5, helix_dia_factor: 0.5, plunge_allowed: false, preferred_method: "interpolated" },
};

// ── Types ─────────────────────────────────────────────────────────

export type EntryMethod = "helix" | "ramp" | "arc" | "plunge" | "interpolated" | "pre_drill";

export interface EntryStrategyInput {
  tool_diameter: number;            // mm
  pocket_width?: number;            // mm (available space)
  pocket_depth: number;             // mm (total depth to reach)
  material?: string;
  center_cutting?: boolean;         // tool can plunge (default false)
  has_pre_drill?: boolean;          // pre-drilled hole exists
  pre_drill_diameter?: number;      // mm
  max_helix_angle_deg?: number;     // override
  max_ramp_angle_deg?: number;      // override
  feed_per_tooth?: number;          // mm/tooth for calculations
}

export interface EntryStrategyResult {
  recommended_method: EntryMethod;
  alternative_methods: EntryMethod[];
  helix_params: {
    diameter_mm: number;
    angle_deg: number;
    revolutions: number;
    ramp_height_per_rev: number;
    z_per_revolution: number;
    total_path_length: number;
  } | null;
  ramp_params: {
    angle_deg: number;
    ramp_length: number;
    z_drop_per_pass: number;
    number_of_passes: number;
  } | null;
  arc_params: {
    arc_radius: number;
    arc_angle_deg: number;
    approach_distance: number;
  } | null;
  feed_factor: number;              // multiply normal feed by this during entry
  warnings: string[];
}

export interface ExitStrategyResult {
  method: "arc_out" | "tangent" | "rapid_retract" | "lift_and_rapid";
  arc_radius: number;
  retract_height: number;
  feed_factor: number;
}

// ── Engine ────────────────────────────────────────────────────────

export class EntryExitStrategyEngine {

  /**
   * Select and calculate optimal entry strategy.
   */
  selectEntry(input: EntryStrategyInput): EntryStrategyResult {
    const {
      tool_diameter: Dc,
      pocket_width,
      pocket_depth,
      material = "mild_steel",
      center_cutting = false,
      has_pre_drill = false,
      pre_drill_diameter,
      max_helix_angle_deg: overrideHelixAngle,
      max_ramp_angle_deg: overrideRampAngle,
    } = input;

    const warnings: string[] = [];
    const R = Dc / 2;
    const matParams = MATERIAL_ENTRY_DEFAULTS[material] ?? MATERIAL_ENTRY_DEFAULTS.mild_steel;

    const maxHelixAngle = overrideHelixAngle ?? matParams.max_helix_angle_deg;
    const maxRampAngle = overrideRampAngle ?? matParams.max_ramp_angle_deg;
    const helixDia = Dc * matParams.helix_dia_factor;

    // Available space check
    const availableWidth = pocket_width ?? Dc * 3; // assume open if not specified
    const canHelix = availableWidth >= helixDia * 1.1;
    const canRamp = availableWidth >= Dc * 1.5;

    // Determine recommended method
    let recommended: EntryMethod;
    const alternatives: EntryMethod[] = [];

    if (has_pre_drill && pre_drill_diameter != null && pre_drill_diameter >= Dc * 0.7) {
      recommended = "pre_drill";
      alternatives.push("helix", "ramp");
    } else if (canHelix) {
      recommended = "helix";
      if (canRamp) alternatives.push("ramp");
      if (center_cutting && matParams.plunge_allowed) alternatives.push("plunge");
      alternatives.push("interpolated");
    } else if (canRamp) {
      recommended = "ramp";
      if (center_cutting && matParams.plunge_allowed) alternatives.push("plunge");
      alternatives.push("interpolated");
      warnings.push(`Pocket too narrow for helix (${availableWidth.toFixed(1)}mm < ${(helixDia * 1.1).toFixed(1)}mm)`);
    } else if (center_cutting && matParams.plunge_allowed) {
      recommended = "plunge";
      alternatives.push("interpolated");
      warnings.push("Very tight pocket — plunge or interpolated only");
    } else {
      recommended = "interpolated";
      warnings.push("Very tight pocket, non-center-cutting tool — interpolated bore entry required");
    }

    // Calculate helix parameters
    let helixParams: EntryStrategyResult["helix_params"] = null;
    if (canHelix) {
      const helixAngle = Math.min(maxHelixAngle, 5);
      const helixAngleRad = (helixAngle * Math.PI) / 180;
      const circumference = Math.PI * helixDia;
      const zPerRev = circumference * Math.tan(helixAngleRad);
      const revolutions = Math.ceil(pocket_depth / zPerRev);
      const totalPath = circumference * revolutions;

      helixParams = {
        diameter_mm: Math.round(helixDia * 100) / 100,
        angle_deg: Math.round(helixAngle * 10) / 10,
        revolutions,
        ramp_height_per_rev: Math.round(zPerRev * 1000) / 1000,
        z_per_revolution: Math.round(zPerRev * 1000) / 1000,
        total_path_length: Math.round(totalPath * 10) / 10,
      };
    }

    // Calculate ramp parameters
    let rampParams: EntryStrategyResult["ramp_params"] = null;
    if (canRamp) {
      const rampAngle = Math.min(maxRampAngle, 10);
      const rampAngleRad = (rampAngle * Math.PI) / 180;
      const rampLength = availableWidth * 0.8; // use 80% of available width
      const zDropPerPass = rampLength * Math.tan(rampAngleRad);
      const numberOfPasses = Math.ceil(pocket_depth / zDropPerPass);

      rampParams = {
        angle_deg: Math.round(rampAngle * 10) / 10,
        ramp_length: Math.round(rampLength * 10) / 10,
        z_drop_per_pass: Math.round(zDropPerPass * 1000) / 1000,
        number_of_passes: numberOfPasses,
      };
    }

    // Arc approach parameters (for wall approach, not pocket entry)
    const arcParams = {
      arc_radius: Math.round(Dc * 0.5 * 100) / 100,
      arc_angle_deg: 90,
      approach_distance: Math.round(Dc * 1.5 * 100) / 100,
    };

    // Feed factor during entry (slower than normal cutting)
    const feedFactor = recommended === "plunge" ? 0.3
      : recommended === "ramp" ? 0.5
      : recommended === "helix" ? 0.6
      : recommended === "interpolated" ? 0.4
      : 0.8; // pre_drill or arc

    log.debug(`[EntryExit] Dc=${Dc}, pocket=${pocket_depth}mm, method=${recommended}, helix_dia=${helixDia.toFixed(1)}mm`);

    return {
      recommended_method: recommended,
      alternative_methods: alternatives,
      helix_params: helixParams,
      ramp_params: rampParams,
      arc_params: arcParams,
      feed_factor: feedFactor,
      warnings,
    };
  }

  /**
   * Calculate exit strategy.
   */
  selectExit(toolDiameter: number, operation: "roughing" | "finishing" | "semi_finishing" = "roughing"): ExitStrategyResult {
    if (operation === "finishing") {
      return {
        method: "arc_out",
        arc_radius: Math.round(toolDiameter * 0.3 * 100) / 100,
        retract_height: 2,
        feed_factor: 0.8,
      };
    }
    if (operation === "semi_finishing") {
      return {
        method: "tangent",
        arc_radius: Math.round(toolDiameter * 0.2 * 100) / 100,
        retract_height: 5,
        feed_factor: 1.0,
      };
    }
    return {
      method: "rapid_retract",
      arc_radius: 0,
      retract_height: 10,
      feed_factor: 1.0,
    };
  }

  /**
   * Validate if a given entry method is safe for the geometry.
   */
  validateEntry(
    method: EntryMethod,
    toolDiameter: number,
    pocketWidth: number,
    material: string = "mild_steel",
  ): { is_valid: boolean; reason: string } {
    const matParams = MATERIAL_ENTRY_DEFAULTS[material] ?? MATERIAL_ENTRY_DEFAULTS.mild_steel;

    switch (method) {
      case "plunge":
        if (!matParams.plunge_allowed) return { is_valid: false, reason: `Plunge not recommended for ${material}` };
        return { is_valid: true, reason: "OK" };

      case "helix": {
        const helixDia = toolDiameter * matParams.helix_dia_factor;
        if (pocketWidth < helixDia * 1.1) {
          return { is_valid: false, reason: `Pocket ${pocketWidth.toFixed(1)}mm too narrow for helix ${helixDia.toFixed(1)}mm` };
        }
        return { is_valid: true, reason: "OK" };
      }

      case "ramp":
        if (pocketWidth < toolDiameter * 1.5) {
          return { is_valid: false, reason: `Pocket ${pocketWidth.toFixed(1)}mm too narrow for ramp (need ${(toolDiameter * 1.5).toFixed(1)}mm)` };
        }
        return { is_valid: true, reason: "OK" };

      case "interpolated":
        return { is_valid: true, reason: "Always available (slowest method)" };

      case "pre_drill":
        return { is_valid: true, reason: "Requires pre-drilled hole" };

      case "arc":
        return { is_valid: true, reason: "For wall approach, not pocket entry" };

      default:
        return { is_valid: false, reason: `Unknown entry method: ${method}` };
    }
  }

  /**
   * Get material defaults.
   */
  getMaterialDefaults(material: string): typeof MATERIAL_ENTRY_DEFAULTS[string] | null {
    return MATERIAL_ENTRY_DEFAULTS[material] ?? null;
  }

  /**
   * List all supported materials.
   */
  listMaterials(): string[] {
    return Object.keys(MATERIAL_ENTRY_DEFAULTS);
  }
}

export const entryExitStrategyEngine = new EntryExitStrategyEngine();
