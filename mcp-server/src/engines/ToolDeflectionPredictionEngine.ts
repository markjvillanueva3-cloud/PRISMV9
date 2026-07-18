/**
 * ToolDeflectionPredictionEngine — Euler-Bernoulli cantilever beam deflection
 *
 * Models: Cantilever beam with point load (cutting force at tip),
 *         stepped shaft (holder → tool shank), bending stress, safety factor
 * References: Altintas (2012) Ch.2, Schmitz & Smith (2009), ISO 10791-6
 * Safety: Critical for precision machining — deflection causes dimensional error
 */

import { CANONICAL_TOOL_MODULUS } from "../physics/constants.js";

// ─── Types ─────────────────────────────────────────────────────────

export type ToolMaterialType =
  | "carbide"
  | "hss"
  | "ceramic"
  | "cermet"
  | "cbn"
  | "pcd";

/** Cut Direction type definition.
 */
export type CutDirection = "radial" | "axial" | "resultant";

/** Tool Deflection Input configuration/data structure.
 */
export interface ToolDeflectionInput {
  tool_diameter_mm: number;
  tool_overhang_mm: number;          // stickout from holder face
  cutting_force_N: number;           // force perpendicular to tool axis
  force_direction?: CutDirection;    // default "radial"
  tool_material?: ToolMaterialType;  // default "carbide"
  holder_diameter_mm?: number;       // if provided, models stepped shaft
  holder_length_mm?: number;         // holder unsupported length
  flute_count?: number;              // reduces effective I for endmills
  helix_angle_deg?: number;          // axial force component
  tolerance_target_mm?: number;      // part tolerance for pass/fail
}

/** Atomic Value configuration/data structure.
 */
export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

/** Tool Deflection Result configuration/data structure.
 */
export interface ToolDeflectionResult {
  static_deflection_um: AtomicValue;
  dimensional_error_um: AtomicValue;
  max_bending_stress_MPa: AtomicValue;
  safety_factor: AtomicValue;
  max_recommended_overhang_mm: AtomicValue;
  stiffness_N_per_um: AtomicValue;
  deflection_to_diameter_ratio: number;
  within_tolerance: boolean;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Constants ─────────────────────────────────────────────────────

/**
 * Young's modulus by tool material (GPa) -- sourced from the canonical
 * CANONICAL_TOOL_MODULUS map (constants.ts, stored in MPa; /1000 -> GPa) so a
 * canonical edit propagates here and no inline value can drift. pcd corrected
 * 890 -> 800 GPa (row 17): canonical separates PCD (800) from mono-diamond (1050);
 * lowering E raises predicted deflection (delta = FL^3/3EI) -> MORE conservative.
 */
const YOUNGS_MODULUS_GPA: Record<ToolMaterialType, number> = {
  carbide: CANONICAL_TOOL_MODULUS.carbide / 1000, // 600
  hss:     CANONICAL_TOOL_MODULUS.hss / 1000,     // 210
  ceramic: CANONICAL_TOOL_MODULUS.ceramic / 1000, // 380
  cermet:  CANONICAL_TOOL_MODULUS.cermet / 1000,  // 450
  cbn:     CANONICAL_TOOL_MODULUS.cbn / 1000,      // 680
  pcd:     CANONICAL_TOOL_MODULUS.pcd / 1000,      // 800 (was 890 -- drift fixed)
};

/** Yield/fracture strength by tool material (MPa) */
const STRENGTH_MPA: Record<ToolMaterialType, number> = {
  carbide: 1500,  // transverse rupture strength
  hss: 3000,      // yield strength
  ceramic: 700,   // fracture strength (brittle)
  cermet: 1200,   // TRS
  cbn: 800,       // TRS
  pcd: 600,       // TRS
};

/**
 * Flute correction factor for second moment of area.
 * Endmill flutes reduce the effective cross-section.
 * Empirical: I_eff ≈ I_solid × correction(flutes)
 * Reference: Schmitz & Smith (2009)
 */
const fluteCorrection = (flutes: number): number => {
  if (flutes <= 0) return 1.0;
  if (flutes === 1) return 0.55;
  if (flutes === 2) return 0.65;
  if (flutes === 3) return 0.72;
  if (flutes === 4) return 0.78;
  if (flutes === 5) return 0.82;
  return 0.85;  // 6+ flutes
};

// ─── Engine ────────────────────────────────────────────────────────

/** Tool Deflection Prediction Engine engine/manager.
 */
export class ToolDeflectionPredictionEngine {
  calculate(input: ToolDeflectionInput): ToolDeflectionResult {
    const {
      tool_diameter_mm: d,
      tool_overhang_mm: L,
      cutting_force_N: F,
      force_direction: dir = "radial",
      tool_material: mat = "carbide",
      holder_diameter_mm: dh,
      holder_length_mm: Lh,
      flute_count: flutes,
      helix_angle_deg: helix,
      tolerance_target_mm: tolTarget,
    } = input;

    const recs: string[] = [];

    // ── 1. Material properties ──
    const E_GPa = YOUNGS_MODULUS_GPA[mat];
    const E = E_GPa * 1e3;  // MPa (= N/mm²)
    const sigma_limit = STRENGTH_MPA[mat];

    // ── 2. Second moment of area ──
    // I = π × d⁴ / 64 for solid round cross-section
    const I_solid = (Math.PI * Math.pow(d, 4)) / 64;
    const correction = flutes ? fluteCorrection(flutes) : 1.0;
    const I_eff = I_solid * correction;

    // ── 3. Force decomposition for helical tools ──
    let F_radial = F;
    /** If.
     * @param dir - dir
     * @returns void
     */
    if (dir === "axial") {
      F_radial = 0;  // axial force doesn't cause lateral deflection
    } else if (dir === "resultant" && helix) {
      // Resultant force has axial component from helix angle
      const helixRad = (helix * Math.PI) / 180;
      F_radial = F * Math.cos(helixRad);
    }

    // ── 4. Static deflection: δ = F × L³ / (3 × E × I) ──
    // Cantilever beam with point load at free end
    let delta_mm: number;

    /** If.
     * @param dh - dh
     * @returns void
     */
    if (dh && Lh && dh > d) {
      // Stepped shaft model: holder section + tool section
      // Holder contributes deflection at holder tip + slope × tool length
      const I_holder = (Math.PI * Math.pow(dh, 4)) / 64;
      const delta_holder = (F_radial * Math.pow(Lh, 3)) / (3 * E * I_holder);
      const slope_holder = (F_radial * Math.pow(Lh, 2)) / (2 * E * I_holder);
      const delta_tool = (F_radial * Math.pow(L, 3)) / (3 * E * I_eff);
      delta_mm = delta_holder + slope_holder * L + delta_tool;
    } else {
      // Simple cantilever
      delta_mm = I_eff > 0
        ? (F_radial * Math.pow(L, 3)) / (3 * E * I_eff)
        : 0;
    }

    const delta_um = delta_mm * 1000;

    // ── 5. Dimensional error on workpiece ──
    // The workpiece error is approximately 2× the tool deflection
    // because the tool deflects away, under-cutting by δ on one side
    // For finishing: error ≈ δ (single-sided)
    // For slotting: error ≈ 2δ (both walls affected)
    const dimensional_error_um = delta_um;  // conservative: 1:1

    // ── 6. Maximum bending stress at tool root ──
    // σ = M / Z = (F × L) / (π × d³ / 32)
    const Z = (Math.PI * Math.pow(d, 3)) / 32;  // section modulus
    const M = F_radial * L;  // bending moment at root (N·mm)
    const sigma_max = Z > 0 ? M / Z : 0;  // MPa

    // ── 7. Safety factor ──
    const SF = sigma_max > 0 ? sigma_limit / sigma_max : 99;

    // ── 8. Stiffness ──
    const stiffness = delta_um > 0 ? F_radial / delta_um : 0;  // N/µm

    // ── 9. Max recommended overhang ──
    // Target: deflection < 10µm at given force, or < tolerance/2
    const target_um = tolTarget ? (tolTarget * 1000) / 2 : 10;
    const L_max = I_eff > 0 && F_radial > 0
      ? Math.pow((target_um / 1000) * 3 * E * I_eff / F_radial, 1 / 3)
      : L;

    // ── 10. Deflection-to-diameter ratio ──
    const deflRatio = d > 0 ? delta_um / (d * 1000) : 0;

    // ── 11. Tolerance check ──
    const withinTol = tolTarget
      ? dimensional_error_um <= (tolTarget * 1000) / 2
      : delta_um < 50;  // default: 50µm practical limit

    // ── 12. Safety assessment ──
    const isSafe = SF > 1.5 && delta_um < 200;

    // ── 13. Recommendations ──
    /** If.
     * @param SF - s f
     * @returns void
     */
    if (SF < 1.5) {
      recs.push(
        `SAFETY: Safety factor ${SF.toFixed(2)} below minimum 1.5 — `
        + `risk of tool breakage at σ=${Math.round(sigma_max)}MPa `
        + `(limit ${sigma_limit}MPa). Reduce overhang or force`
      );
    }

    /** If.
     * @param delta_um - delta_um
     * @returns void
     */
    if (delta_um > 100) {
      recs.push(
        `HIGH DEFLECTION: ${delta_um.toFixed(1)}µm — consider shorter `
        + `overhang (max ${L_max.toFixed(1)}mm for ${target_um}µm), `
        + `larger diameter, or carbide extension`
      );
    } else if (delta_um > 25) {
      recs.push(
        `Moderate deflection ${delta_um.toFixed(1)}µm — acceptable for `
        + `roughing, may affect finishing tolerance`
      );
    }

    /** If.
     * @param L - l
     * @returns void
     */
    if (L / d > 5) {
      recs.push(
        `L/D ratio ${(L / d).toFixed(1)} exceeds 5:1 — high deflection `
        + `risk. Use stub-length or extended-reach with damping`
      );
    } else if (L / d > 3.5) {
      recs.push(
        `L/D ratio ${(L / d).toFixed(1)} approaching limit — `
        + `reduce radial depth of cut to compensate`
      );
    }

    /** If.
     * @param !withinTol - !within tol
     * @returns void
     */
    if (!withinTol && tolTarget) {
      recs.push(
        `Deflection ${delta_um.toFixed(1)}µm exceeds tolerance budget `
        + `${(tolTarget * 1000 / 2).toFixed(1)}µm (half of ±${(tolTarget * 1000).toFixed(0)}µm). `
        + `Max overhang for this tolerance: ${L_max.toFixed(1)}mm`
      );
    }

    /** If.
     * @param mat - mat
     * @returns void
     */
    if (mat === "hss" && L / d > 3) {
      recs.push(
        `HSS tool with long overhang — E=${E_GPa}GPa is 2.8× lower `
        + `than carbide (600GPa). Switch to solid carbide for 2.8× stiffer tool`
      );
    }

    /** If.
     * @param flutes - flutes
     * @returns void
     */
    if (flutes && flutes <= 2 && L / d > 3) {
      recs.push(
        `2-flute endmill has ${(correction * 100).toFixed(0)}% of solid `
        + `cross-section stiffness — consider 4-flute for better rigidity`
      );
    }

    /** If.
     * @param recs.length - recs.length
     * @returns void
     */
    if (recs.length === 0) {
      recs.push(
        `Tool deflection ${delta_um.toFixed(1)}µm — within limits, `
        + `SF=${SF.toFixed(1)}, stiffness ${stiffness.toFixed(2)} N/µm`
      );
    }

    return {
      static_deflection_um: {
        value: Math.round(delta_um * 10) / 10,
        unit: "µm",
        uncertainty: Math.round(delta_um * 0.15 * 10) / 10,
        source: "euler_bernoulli_cantilever",
      },
      dimensional_error_um: {
        value: Math.round(dimensional_error_um * 10) / 10,
        unit: "µm",
        uncertainty: Math.round(dimensional_error_um * 0.20 * 10) / 10,
        source: "single_sided_deflection",
      },
      max_bending_stress_MPa: {
        value: Math.round(sigma_max * 10) / 10,
        unit: "MPa",
        uncertainty: Math.round(sigma_max * 0.10 * 10) / 10,
        source: "beam_bending_theory",
      },
      safety_factor: {
        value: Math.round(SF * 100) / 100,
        unit: "ratio",
        uncertainty: SF * 0.15,
        source: "trs_over_max_stress",
      },
      max_recommended_overhang_mm: {
        value: Math.round(L_max * 10) / 10,
        unit: "mm",
        uncertainty: L_max * 0.10,
        source: "inverse_deflection_limit",
      },
      stiffness_N_per_um: {
        value: Math.round(stiffness * 100) / 100,
        unit: "N/µm",
        uncertainty: stiffness * 0.15,
        source: "F_over_delta",
      },
      deflection_to_diameter_ratio: Math.round(deflRatio * 1e6) / 1e6,
      within_tolerance: withinTol,
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

/** Tool Deflection Prediction Engine constant.
 */
export const toolDeflectionPredictionEngine = new ToolDeflectionPredictionEngine();
