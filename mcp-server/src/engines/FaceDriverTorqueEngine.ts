/**
 * FaceDriverTorqueEngine
 * ========================
 *
 * Face driver (pin-drive workholding between centers) torque capacity.
 * Pins bite into part face + transmit spindle torque. Max torque is
 * limited by pin count × penetration × material strength.
 *
 * Canonical reference:
 *   - Röhm face driver catalog (technical section)
 *   - Tschätsch Cutting Tools Ch. 7.3
 *
 * Formula:
 *   T_max = n × (σ_yield × A_bite) × R_pin_circle × μ_safety
 * where A_bite = pin_diameter × penetration_depth
 *
 * @module engines/FaceDriverTorqueEngine
 * @milestone LATHE-PRO
 */

export interface FaceDriverSpec {
  /** Number of drive pins */
  pin_count: number;
  /** Pin diameter (mm) */
  pin_diameter_mm: number;
  /** Pin penetration depth into part face (mm) */
  penetration_depth_mm: number;
  /** Radius of pin circle from centerline (mm) */
  pin_circle_radius_mm: number;
  /** Pin hardness (HRC) — harder pins penetrate harder materials */
  pin_hardness_hrc: number;
}

export interface PartMaterialSpec {
  /** Material name */
  name: string;
  /** Yield strength (MPa) */
  yield_strength_mpa: number;
  /** Hardness (HRC) — if part is harder than pins, pins deform instead of biting */
  hardness_hrc?: number;
}

export interface TorqueAnalysisResult {
  max_torque_nm: number;
  bite_area_total_mm2: number;
  per_pin_force_n: number;
  pins_harder_than_part: boolean;
  warnings: string[];
  safety_factor_vs_required?: number;
}

class FaceDriverTorqueEngineImpl {
  /**
   * Compute the maximum torque a face driver can transmit before pins
   * fail or part face yields.
   */
  analyze(
    driver: FaceDriverSpec,
    part: PartMaterialSpec,
    requiredTorqueNm?: number
  ): TorqueAnalysisResult {
    const warnings: string[] = [];

    // Bite area per pin (projected) = pin diameter × penetration depth
    const biteAreaPerPin =
      driver.pin_diameter_mm * driver.penetration_depth_mm;
    const biteAreaTotal = biteAreaPerPin * driver.pin_count;

    // Pins must be harder than part to penetrate (HRC comparison)
    const pinsHarderThanPart = part.hardness_hrc
      ? driver.pin_hardness_hrc > part.hardness_hrc
      : true;
    if (!pinsHarderThanPart) {
      warnings.push(
        `Pin hardness ${driver.pin_hardness_hrc} HRC not greater than part hardness ${part.hardness_hrc} HRC — pins will deform instead of biting`
      );
    }

    // Per-pin force before yield
    // F = σ_yield × A_bite (conservative — ignores shear, uses compressive)
    const perPinForce = part.yield_strength_mpa * biteAreaPerPin;

    // Max torque = total force × moment arm × 0.7 safety (pins don't all bite equally)
    const R_m = driver.pin_circle_radius_mm / 1000;
    const maxTorqueNm = perPinForce * driver.pin_count * R_m * 0.7;

    let safetyFactor: number | undefined;
    if (requiredTorqueNm !== undefined) {
      safetyFactor = maxTorqueNm / requiredTorqueNm;
      if (safetyFactor < 1.5) {
        warnings.push(
          `Safety factor ${safetyFactor.toFixed(2)} below 1.5 — increase pin count, penetration, or diameter`
        );
      }
    }

    if (driver.pin_count < 3) {
      warnings.push(
        `Only ${driver.pin_count} pins — 3+ recommended for stable torque transmission`
      );
    }

    if (driver.penetration_depth_mm < 0.5) {
      warnings.push(
        `Penetration ${driver.penetration_depth_mm} mm is shallow — pins may walk out under load`
      );
    }

    return {
      max_torque_nm: round2(maxTorqueNm),
      bite_area_total_mm2: round2(biteAreaTotal),
      per_pin_force_n: round2(perPinForce),
      pins_harder_than_part: pinsHarderThanPart,
      warnings,
      safety_factor_vs_required:
        safetyFactor !== undefined ? round2(safetyFactor) : undefined,
    };
  }

  /**
   * Recommend pin penetration depth to transmit a target torque.
   */
  recommendPenetration(
    targetTorqueNm: number,
    driver: Omit<FaceDriverSpec, "penetration_depth_mm">,
    part: PartMaterialSpec
  ): { penetration_depth_mm: number; achievable: boolean } {
    // Inverting: penetration = T / (n × σ × d_pin × R × 0.7)
    const R_m = driver.pin_circle_radius_mm / 1000;
    const depth =
      targetTorqueNm /
      (driver.pin_count *
        part.yield_strength_mpa *
        driver.pin_diameter_mm *
        R_m *
        0.7);
    // Penetration above 3mm is impractical
    return {
      penetration_depth_mm: round2(depth),
      achievable: depth > 0 && depth <= 3.0,
    };
  }

  getStats(): {
    formula: string;
    safety_factor: number;
    typical_pin_counts: number[];
  } {
    return {
      formula:
        "T_max = n_pins × σ_yield × (d_pin × penetration) × R_pin_circle × 0.7",
      safety_factor: 0.7,
      typical_pin_counts: [3, 4, 6, 8],
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const faceDriverTorqueEngine = new FaceDriverTorqueEngineImpl();
export type { FaceDriverTorqueEngineImpl };
