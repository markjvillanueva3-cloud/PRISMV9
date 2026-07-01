/**
 * Sandvik Turning Force Model
 *
 * Computes tangential cutting force Ft for turning operations using the
 * Sandvik Coromant specific-cutting-force formula:
 *
 *   Ft = kc0.4 × ap × fn / fn^mc           (force before KAPR correction)
 *   Ft_corrected = Ft × sin(kapr_rad)      (entering-angle correction)
 *
 * where:
 *   kc0.4    — specific cutting force at the 0.4 mm/rev reference feed [N/mm²]
 *   mc       — Kienzle/Sandvik feed exponent [-]
 *   ap       — axial depth of cut [mm]
 *   fn       — feed per revolution [mm]
 *   kapr     — tool entering angle [deg] (90° default for square-shoulder turning)
 *
 * Sandvik design rule: Ft should not exceed 90% of the tool bar's maximum
 * permissible load to avoid catastrophic deflection / chatter.
 *
 * SAFETY-CRITICAL: Cutting force determines spindle torque demand, tool-bar
 * deflection, holder safety factor, and chatter onset. Conservative use of
 * the 90% safety-pct ceiling is non-negotiable on shop-floor SF calls.
 *
 * References:
 * - Sandvik Coromant: Cutting Force Calculation, Modern Metal Cutting
 *   (https://www.sandvik.coromant.com/en-us/knowledge/general-turning)
 * - Kienzle, O. (1952). "Die Bestimmung von Kräften und Leistungen
 *   an spanenden Werkzeugen und Werkzeugmaschinen"
 *
 * @module algorithms/SandvikTurningForceModel
 */

/** Result of a SandvikTurningForceModel.calculateTangentialCompat call. */
export interface SandvikTurningForceCompatResult {
  /** Tangential cutting force with KAPR correction applied [N]. */
  Ft: number;
  /** Sandvik safety percentage ceiling for tool-bar loading [%]. */
  safetyPct: number;
}

/**
 * Sandvik Turning Force Model — Ft = kc0.4 × ap × fn / fn^mc × sin(KAPR).
 *
 * Composed by UltimateSpeedFeedEngine.sandvikTurningForce() (SF-PSN-WIRE-MS0
 * U-SFPSN-02C-B, 2026-05-23 juliett) — bit-equivalent verbatim relocation of
 * the inline engine function, suitable for shim delegation.
 */
export class SandvikTurningForceModel {
  /**
   * Static-shim Sandvik tangential force (bit-equivalent compat with
   * UltimateSpeedFeedEngine inline sandvikTurningForce line 953).
   *
   * @param kc0_4 Specific cutting force at 0.4 mm/rev reference feed [N/mm²]
   * @param mc Feed exponent [-] (typically 0.20–0.30 per ISO group)
   * @param ap_mm Axial depth of cut [mm]
   * @param fn_mm Feed per revolution [mm]
   * @param kapr_deg Tool entering angle [deg] (default 90° = square shoulder)
   * @returns { Ft: KAPR-corrected tangential force [N], safetyPct: 90 (Sandvik rule) }
   */
  static calculateTangentialCompat(
    kc0_4: number,
    mc: number,
    ap_mm: number,
    fn_mm: number,
    kapr_deg: number = 90,
  ): SandvikTurningForceCompatResult {
    // Ft = kc0.4 × ap × fn / fn^mc (verbatim from engine line 959)
    const Ft = kc0_4 * ap_mm * fn_mm / Math.pow(Math.max(0.01, fn_mm), mc);
    // KAPR correction: for entering angles < 75°, sin(KAPR) < 1 reduces force
    const kaprRad = (kapr_deg * Math.PI) / 180;
    const Ft_corrected = Ft * Math.sin(kaprRad);
    // Design rule: Ft should not exceed 90% of tool bar max load
    const safetyPct = 90; // Sandvik recommendation
    return { Ft: Ft_corrected, safetyPct };
  }
}
