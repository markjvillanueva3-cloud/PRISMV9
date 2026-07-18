/**
 * AnisotropicMaterialModelEngine — grain-direction cutting force modifier
 *
 * Closes the iter20 P1 "anisotropic material model" gap. Forged + rolled + 3DP
 * materials have feed-direction-dependent cutting force that the isotropic
 * Kienzle model misses. The modifier scales base force:
 *
 *   F_effective = F_kienzle × A(θ, form)
 *
 * where A is the anisotropy multiplier (1.00-1.30 range) and θ is feed direction
 * relative to the dominant grain axis (0° = with grain, 90° = across).
 *
 * Anisotropy ratios per material form (Shaw §4 + Wohlfahrt §3.5):
 *   - Cast random:                A=1.00 ± 0%    (isotropic)
 *   - Rolled with-grain:          A=1.00 ± 5%    (mild)
 *   - Rolled across-grain:        A=1.15 ± 5%    (15% higher force)
 *   - Forged longitudinal:        A=0.95 + 5%   (slight reduction along grain)
 *   - Forged transverse:          A=1.20 + 10%   (20% higher force across grain)
 *   - 3D-printed XY-layer (along build):  A=1.10 ± 5%
 *   - 3D-printed Z-direction (across build): A=1.30 ± 10%  (laminar weakness)
 *
 * Direction-dependent: maps continuous θ via cosine interpolation:
 *   A(θ) = A_with + (A_across - A_with) × sin²(θ)
 *
 * Reference: Boothroyd-Knight "Fundamentals of Machining" §8 (anisotropic
 *   chip formation); Shaw MC (2005) "Metal Cutting Principles" 2nd ed §4.3-4.5;
 *   Wohlfahrt H (2018) "Metal Cutting Mechanics" §3.5; ASTM E8/E9 (tensile
 *   anisotropy testing); ISO 5577 (grain orientation flaw classification).
 *
 * @version 1.0.0
 * @module AnisotropicMaterialModelEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type MaterialForm =
  | "cast_random"
  | "rolled_with"
  | "rolled_across"
  | "forged_longitudinal"
  | "forged_transverse"
  | "printed_xy_layer"
  | "printed_z_build"
  | "drawn_wire"
  | "extruded";

export interface AnisotropicInput {
  /** Material form (drives base anisotropy ratio) */
  material_form: MaterialForm;
  /** Feed direction relative to dominant grain axis (degrees, 0=with grain, 90=across) */
  feed_direction_deg: number;
  /** Base Kienzle cutting force (N) — from isotropic calc */
  base_cutting_force_n: number;
}

interface FormProfile {
  /** Anisotropy multiplier with-grain (feed along grain) */
  a_with: number;
  /** Anisotropy multiplier across-grain (feed transverse) */
  a_across: number;
  /** Optimum feed direction (deg) — angle that minimizes force */
  optimum_deg: number;
  /** Worst-case ductility drop relative to isotropic (%) */
  ductility_drop_pct: number;
}

const FORM_PROFILES: Record<MaterialForm, FormProfile> = {
  cast_random:          { a_with: 1.00, a_across: 1.00, optimum_deg: 0,  ductility_drop_pct: 0 },
  rolled_with:          { a_with: 1.00, a_across: 1.10, optimum_deg: 0,  ductility_drop_pct: 8 },
  rolled_across:        { a_with: 1.00, a_across: 1.15, optimum_deg: 0,  ductility_drop_pct: 12 },
  forged_longitudinal:  { a_with: 0.95, a_across: 1.15, optimum_deg: 0,  ductility_drop_pct: 10 },
  forged_transverse:    { a_with: 1.05, a_across: 1.20, optimum_deg: 0,  ductility_drop_pct: 15 },
  printed_xy_layer:     { a_with: 1.05, a_across: 1.10, optimum_deg: 0,  ductility_drop_pct: 18 },
  printed_z_build:      { a_with: 1.10, a_across: 1.30, optimum_deg: 0,  ductility_drop_pct: 35 },
  drawn_wire:           { a_with: 0.90, a_across: 1.25, optimum_deg: 0,  ductility_drop_pct: 20 },
  extruded:             { a_with: 0.95, a_across: 1.15, optimum_deg: 0,  ductility_drop_pct: 12 },
};

export interface AnisotropicResult {
  anisotropy_multiplier: AtomicValue;
  effective_cutting_force_n: AtomicValue;
  recommended_feed_rotation_deg: AtomicValue;
  ductility_drop_pct: AtomicValue;
  worst_case_force_n: AtomicValue;
  warnings: string[];
  source: string;
}

export class AnisotropicMaterialModelEngine {
  apply(input: AnisotropicInput): AnisotropicResult {
    if (!input || !input.material_form || input.feed_direction_deg == null || input.base_cutting_force_n == null) {
      throw new Error("AnisotropicMaterialModelEngine.apply: material_form + feed_direction_deg + base_cutting_force_n required");
    }
    if (input.base_cutting_force_n <= 0) {
      throw new Error("AnisotropicMaterialModelEngine.apply: positive base_cutting_force_n required");
    }
    if (input.feed_direction_deg < -360 || input.feed_direction_deg > 360) {
      throw new Error("AnisotropicMaterialModelEngine.apply: feed_direction_deg must be in [-360, 360]");
    }

    const warnings: string[] = [];
    const profile = FORM_PROFILES[input.material_form];

    // ── Wrap θ into [0, 90] for cosine interpolation ──────────────────
    // Anisotropy is symmetric every 180°; use absolute deviation from 0/180/360
    let theta = Math.abs(input.feed_direction_deg) % 180;
    if (theta > 90) theta = 180 - theta;  // fold into [0, 90]
    const thetaRad = theta * Math.PI / 180;

    // ── A(θ) = A_with + (A_across - A_with) × sin²(θ) ─────────────────
    const sinSq = Math.sin(thetaRad) ** 2;
    const A = profile.a_with + (profile.a_across - profile.a_with) * sinSq;

    const effectiveForce = input.base_cutting_force_n * A;
    const worstCaseForce = input.base_cutting_force_n * profile.a_across;  // 90° feed

    // ── Recommended feed rotation (min force = A_with direction) ──────
    // Optimum feed direction is along the with-grain axis. If the user's
    // current θ is >30° off, recommend rotating fixture or program.
    const optimumDeg = 0;  // always 0° (along grain) for these profiles
    const recommendedRotation = theta - optimumDeg;  // how much to rotate to reach optimum

    // ── Warnings ──────────────────────────────────────────────────────
    if (input.material_form === "printed_z_build") {
      warnings.push("3D-printed Z-direction cutting — laminar weakness; expect delamination + 30%+ Ra penalty (Wohlfahrt §3.5)");
    }
    if (input.material_form === "printed_xy_layer" && theta > 60) {
      warnings.push("3D-printed XY-layer cut across build direction — layer-line tearing likely; reduce feed by 20-30%");
    }
    if (profile.ductility_drop_pct > 15 && theta > 60) {
      warnings.push(`Ductility drop ${profile.ductility_drop_pct}% at θ=${theta.toFixed(0)}° — material may fracture instead of plastically deform; reduce DOC + feed`);
    }
    if (input.material_form === "forged_transverse" && theta > 70) {
      warnings.push("Forged transverse + across-grain feed — Kienzle underestimates by 20%+; verify with cutting-force prototype before committing");
    }
    if (input.material_form === "drawn_wire" && theta > 30) {
      warnings.push("Drawn wire cross-cut — fiber-flow direction creates rough exit burr; consider rotating part 90° in fixture");
    }
    if (Math.abs(recommendedRotation) > 30 && profile.a_across / profile.a_with > 1.15) {
      warnings.push(`Rotate part/program by ${(-recommendedRotation).toFixed(0)}° to feed with grain — reduces cutting force by ${((1 - profile.a_with / A) * 100).toFixed(0)}%`);
    }

    return {
      anisotropy_multiplier: {
        value: Number(A.toFixed(4)),
        unit: "ratio",
        source: `${input.material_form}: A(θ=${theta.toFixed(1)}°) = ${profile.a_with} + (${profile.a_across} - ${profile.a_with}) × sin²(θ)`,
      },
      effective_cutting_force_n: {
        value: Number(effectiveForce.toFixed(1)),
        unit: "N",
        source: `F_kienzle × A(θ) per Shaw §4.3 + Wohlfahrt §3.5`,
      },
      recommended_feed_rotation_deg: {
        value: Number(-recommendedRotation.toFixed(1)),
        unit: "deg",
        source: "rotate program/fixture toward grain axis (negative = with current orientation, 0=optimal)",
      },
      ductility_drop_pct: {
        value: Number((profile.ductility_drop_pct * sinSq).toFixed(1)),
        unit: "%",
        source: "max drop × sin²(θ) per ASTM E8/E9 anisotropy testing",
      },
      worst_case_force_n: {
        value: Number(worstCaseForce.toFixed(1)),
        unit: "N",
        source: `F_kienzle × A_across=${profile.a_across} (90° feed worst case)`,
      },
      warnings,
      source: "AnisotropicMaterialModelEngine — Boothroyd-Knight §8 + Shaw §4.3-4.5 + Wohlfahrt §3.5 + ASTM E8/E9 + ISO 5577",
    };
  }
}

export const anisotropicMaterialModelEngine = new AnisotropicMaterialModelEngine();
