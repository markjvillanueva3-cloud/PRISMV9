/**
 * GunDrillingEngine — Deep Hole (Gun) Drilling Calculations
 *
 * Calculates parameters for gun drilling and BTA drilling:
 * - Speed/feed for deep hole drilling (L/D > 10)
 * - Coolant pressure requirements
 * - Guide pad wear estimation
 * - Whip/deflection prediction for long drills
 * - Peck cycle vs continuous drilling decision
 *
 * Key physics: Gun drilling requires through-tool coolant at
 * high pressure to evacuate chips from deep holes. The single
 * effective cutting edge creates asymmetric forces balanced
 * by guide pads. Hole straightness degrades with depth.
 *
 * Reference: Sandvik deep hole drilling guide,
 *            UNISIG application manual,
 *            Botek gun drill catalog
 *
 * Actions: gun_drill_calc, deep_hole_coolant, gun_drill_select
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export type DeepHoleMethod = "gun_drill" | "bta" | "ejector";

export interface GunDrillInput {
  hole_diameter_mm: number;
  hole_depth_mm: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  method?: DeepHoleMethod;
  is_through_hole?: boolean;
  straightness_requirement_mm?: number;
}

export interface GunDrillResult {
  method: DeepHoleMethod;
  cutting_speed: AtomicValue;
  feed_rate: AtomicValue;
  spindle_rpm: AtomicValue;
  coolant_pressure: AtomicValue;
  coolant_flow: AtomicValue;
  predicted_straightness: AtomicValue;
  cycle_time: AtomicValue;
  ld_ratio: AtomicValue;
  peck_recommended: boolean;
  peck_depth: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Gun drill cutting speed (m/min) by ISO group */
const GD_SPEEDS: Record<string, number> = {
  P: 80, M: 50, K: 100, N: 150, S: 20, H: 25,
};

/** Gun drill feed (mm/rev) by ISO group — base for 10mm drill */
const GD_FEEDS: Record<string, number> = {
  P: 0.012, M: 0.008, K: 0.015, N: 0.020, S: 0.005, H: 0.006,
};

/** Coolant pressure (bar) by method */
const COOLANT_PRESSURE: Record<DeepHoleMethod, number> = {
  gun_drill: 70,
  bta: 40,
  ejector: 20,
};

// ── Engine ─────────────────────────────────────────────────────────

export class GunDrillingEngine {
  /**
   * Calculate gun drilling / deep hole drilling parameters.
   */
  calculate(input: GunDrillInput): GunDrillResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const d = input.hole_diameter_mm;
    const depth = input.hole_depth_mm;
    const ldRatio = depth / d;

    // Method selection
    let method: DeepHoleMethod;
    if (input.method) {
      method = input.method;
    } else if (d < 2) {
      method = "gun_drill";
    } else if (d >= 2 && d <= 40 && ldRatio <= 100) {
      method = "gun_drill";
    } else if (d > 40 || ldRatio > 100) {
      method = "bta";
    } else {
      method = "gun_drill";
    }

    // Cutting speed
    const vc = GD_SPEEDS[iso] ?? 80;

    // RPM
    const rpm = (vc * 1000) / (Math.PI * d);

    // Feed — scales with drill diameter
    const fBase = GD_FEEDS[iso] ?? 0.012;
    // Feed increases with diameter: f = fBase × sqrt(D/10)
    const fpr = fBase * Math.sqrt(d / 10);
    const feedRate = fpr * rpm;

    // Coolant pressure
    // Pressure increases for smaller holes (more restriction)
    const basePressure = COOLANT_PRESSURE[method];
    const pressureFactor = d < 5 ? 1.5
      : d < 10 ? 1.2
        : d < 20 ? 1.0
          : 0.8;
    const coolantPressure = basePressure * pressureFactor;

    // Coolant flow (L/min) ≈ proportional to hole area
    const coolantFlow = Math.PI * (d / 2) * (d / 2) *
      0.001 * 0.5; // simplified

    // Straightness prediction
    // Rule of thumb: ~0.05mm per 100mm depth for gun drill
    const straightnessFactor = method === "gun_drill" ? 0.05
      : method === "bta" ? 0.03 : 0.04;
    const predictedStraightness = (depth / 100) *
      straightnessFactor;

    // Peck cycle decision
    // Gun drills generally don't peck, but for very deep holes
    // or difficult materials, pecking helps chip evacuation
    const peckRecommended = (
      (iso === "S" || iso === "H") && ldRatio > 20
    ) || ldRatio > 50;
    const peckDepth = peckRecommended
      ? Math.min(d * 5, depth / 4) : 0;

    // Cycle time
    const drillTime = depth / feedRate;
    const peckOverhead = peckRecommended
      ? (Math.ceil(depth / peckDepth) - 1) * 0.1 : 0;
    const cycleTime = drillTime + peckOverhead;

    // Warnings
    if (ldRatio > 100) {
      warnings.push(
        `L/D ratio ${Math.round(ldRatio)} — ` +
        "extreme depth, consider BTA system"
      );
    }
    if (d < 1) {
      warnings.push(
        "Micro gun drilling (<1mm) — " +
        "requires specialized equipment"
      );
    }
    if (input.straightness_requirement_mm !== undefined &&
        predictedStraightness >
        input.straightness_requirement_mm) {
      warnings.push(
        `Predicted straightness ${r3(predictedStraightness)}mm ` +
        `may exceed requirement ` +
        `${input.straightness_requirement_mm}mm`
      );
    }
    if (!input.is_through_hole && ldRatio > 30) {
      warnings.push(
        "Blind deep hole — chip evacuation critical, " +
        "ensure adequate coolant pressure"
      );
    }

    return {
      method,
      cutting_speed: av(r1(vc), "m/min", 0.1,
        "Gun drill speed tables"),
      feed_rate: av(r3(fpr), "mm/rev", 0.1,
        "fBase × sqrt(D/10)"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc × 1000 / (π × D)"),
      coolant_pressure: av(Math.round(coolantPressure), "bar",
        0.15, `${method} base × dia factor`),
      coolant_flow: av(r2(coolantFlow), "L/min", 0.2,
        "Proportional to hole area"),
      predicted_straightness: av(
        r3(predictedStraightness), "mm", 0.3,
        "~0.05mm per 100mm depth"
      ),
      cycle_time: av(r2(cycleTime), "min", 0.15,
        "depth / feed + peck overhead"),
      ld_ratio: av(r1(ldRatio), "ratio", 0,
        "hole_depth / hole_diameter"),
      peck_recommended: peckRecommended,
      peck_depth: av(r1(peckDepth), "mm", 0.1,
        peckRecommended
          ? "min(5×D, depth/4)"
          : "Not recommended"),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const gunDrillingEngine = new GunDrillingEngine();
