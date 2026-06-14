/**
 * Merchant Shear Force Model (Ernst-Merchant 1945)
 *
 * First-principles orthogonal cutting force model based on shear-plane
 * mechanics. Alternative to empirical Kienzle/Sandvik specific-cutting-force
 * formulas — derives Fc and Ft from material shear strength + geometry
 * (rake angle, friction coefficient) rather than tabulated kc values.
 *
 *   Shear angle (Merchant):  φ = π/4 - β/2 + γ/2
 *     where β = arctan(μ) is friction angle, γ is rake angle.
 *
 *   Shear plane area:        As = ap × feed / sin(φ)
 *   Shear force:             Fs = τs × As                  (τs = material shear strength)
 *   Cutting force:           Fc = Fs × cos(β-γ) / cos(φ+β-γ)
 *   Thrust force:            Ft = Fs × sin(β-γ) / cos(φ+β-γ)
 *   Chip compression ratio:  r = sin(φ) / cos(φ-γ)
 *
 * SAFETY-CRITICAL: Cutting and thrust forces drive spindle torque, tool
 * deflection, and holder stress. Merchant model provides an independent
 * cross-check against empirical Kienzle/Sandvik when material τs is known.
 *
 * Shear angle clamp [5°, 45°] enforced — values outside this range indicate
 * either pathological inputs (extreme rake) or breakdown of orthogonal-cut
 * assumptions; clamping prevents the cos(φ+β-γ) denominator from blowing up.
 *
 * References:
 * - Ernst, H. & Merchant, M.E. (1941). "Chip Formation, Friction and Finish",
 *   Cincinnati Milling Machine Co.
 * - Merchant, M.E. (1945). "Mechanics of the Metal Cutting Process",
 *   J. Appl. Phys. 16, 267–275
 * - Shaw, M.C. (1984). "Metal Cutting Principles", Oxford University Press
 *
 * @module algorithms/MerchantShearForceModel
 */

/** Result of MerchantShearForceModel.calculateForcesCompat. */
export interface MerchantForceCompatResult {
  /** Cutting force [N]. */
  Fc: number;
  /** Thrust force [N]. */
  Ft: number;
  /** Shear angle [deg], clamped to [5, 45]. */
  shearAngle: number;
  /** Chip compression ratio (dimensionless). */
  chipRatio: number;
}

/**
 * Merchant orthogonal cutting force model.
 *
 * Composed by UltimateSpeedFeedEngine.merchantForce()/merchantShearAngle()
 * (SF-PSN-WIRE-MS0 U-SFPSN-02C-C, 2026-05-23 juliett) — bit-equivalent
 * verbatim relocation of the inline engine functions, suitable for shim delegation.
 */
export class MerchantShearForceModel {
  /**
   * Static-shim Merchant shear angle (bit-equivalent compat with
   * UltimateSpeedFeedEngine inline merchantShearAngle line 1110).
   *
   * φ = π/4 - β/2 + γ/2, clamped to [5°, 45°].
   *
   * @param rakeAngle_deg Rake angle γ [deg]
   * @param frictionCoeff Friction coefficient μ [dimensionless]
   * @returns Shear angle [deg], clamped to [5, 45]
   */
  static calculateShearAngleCompat(rakeAngle_deg: number, frictionCoeff: number): number {
    const beta = Math.atan(frictionCoeff); // friction angle
    const gamma = rakeAngle_deg * Math.PI / 180;
    // Merchant: φ = π/4 - β/2 + γ/2
    const phi = Math.PI / 4 - beta / 2 + gamma / 2;
    return Math.max(5, Math.min(45, phi * 180 / Math.PI));
  }

  /**
   * Static-shim full Merchant force decomposition (bit-equivalent compat with
   * UltimateSpeedFeedEngine inline merchantForce line 1118).
   *
   * @param shearStrength_MPa Material shear strength τs [MPa]
   * @param ap_mm Axial depth of cut [mm]
   * @param feed_mm Feed per revolution [mm]
   * @param rakeAngle_deg Rake angle γ [deg]
   * @param frictionCoeff Friction coefficient μ [dimensionless]
   * @returns { Fc, Ft, shearAngle, chipRatio }
   */
  static calculateForcesCompat(
    shearStrength_MPa: number,
    ap_mm: number,
    feed_mm: number,
    rakeAngle_deg: number,
    frictionCoeff: number,
  ): MerchantForceCompatResult {
    const phi_deg = MerchantShearForceModel.calculateShearAngleCompat(rakeAngle_deg, frictionCoeff);
    const phi = phi_deg * Math.PI / 180;
    const gamma = rakeAngle_deg * Math.PI / 180;
    const beta = Math.atan(frictionCoeff);
    // Shear plane area
    const As = (ap_mm * feed_mm) / Math.sin(phi);
    // Shear force
    const Fs = shearStrength_MPa * As;
    // Cutting force: Fc = Fs × cos(β - γ) / cos(φ + β - γ)
    const Fc = Fs * Math.cos(beta - gamma) / Math.cos(phi + beta - gamma);
    // Thrust force: Ft = Fs × sin(β - γ) / cos(φ + β - γ)
    const Ft = Fs * Math.sin(beta - gamma) / Math.cos(phi + beta - gamma);
    const chipRatio = Math.sin(phi) / Math.cos(phi - gamma);
    return { Fc, Ft, shearAngle: phi_deg, chipRatio };
  }
}
