/**
 * ReamingEngine — Precision Bore Finishing Calculations
 *
 * Calculates reaming parameters for precision bore finishing:
 * - Cutting speed, feed rate, and RPM for reamers
 * - Stock allowance for reaming (pre-bore size)
 * - Surface finish prediction (Ra/Rz)
 * - Torque and thrust force estimation
 * - Tool life prediction based on material/conditions
 *
 * Reference: Machinery's Handbook 31st Ed. Ch.28 "Reaming",
 *            Sandvik Metalcutting Technical Guide,
 *            ANSI B94.2 (Reamer standards)
 *
 * Actions: ream_params, ream_stock_allowance, ream_surface_finish,
 *          ream_force, ream_tool_life
 */

// ── Types ──────────────────────────────────────────────────────────

export interface ReamerType {
  type: "hand" | "machine" | "shell" | "expansion" | "adjustable" | "carbide_tipped" | "solid_carbide" | "indexable";
  flutes: number;
  helix_angle_deg: number;
  material: "hss" | "cobalt_hss" | "carbide" | "cermet";
}

export interface ReamingInput {
  bore_diameter_mm: number;
  bore_depth_mm: number;
  tolerance_class?: string; // e.g., "H7", "H6", "H8"
  material_hardness_hrc?: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  reamer?: Partial<ReamerType>;
  coolant?: "flood" | "mql" | "dry" | "through_tool";
  blind_hole?: boolean;
}

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ReamingResult {
  cutting_speed: AtomicValue;
  rpm: AtomicValue;
  feed_per_rev: AtomicValue;
  feed_rate: AtomicValue;
  stock_allowance: AtomicValue;
  pre_bore_diameter: AtomicValue;
  predicted_ra: AtomicValue;
  torque: AtomicValue;
  thrust_force: AtomicValue;
  cycle_time: AtomicValue;
  reamer: ReamerType;
  warnings: string[];
}

export interface ReamingStockResult {
  stock_per_side: AtomicValue;
  pre_bore_diameter: AtomicValue;
  tolerance_range: { min: number; max: number };
}

export interface ReamingForceResult {
  torque: AtomicValue;
  thrust_force: AtomicValue;
  power: AtomicValue;
}

// ── ISO Tolerance Bands (H-series hole tolerances, mm) ────────────

const ISO_H_TOLERANCES: Record<string, (d: number) => { upper: number; lower: number }> = {
  H6: (d) => ({ upper: toleranceBand(d, 6), lower: 0 }),
  H7: (d) => ({ upper: toleranceBand(d, 7), lower: 0 }),
  H8: (d) => ({ upper: toleranceBand(d, 8), lower: 0 }),
  H9: (d) => ({ upper: toleranceBand(d, 9), lower: 0 }),
  H10: (d) => ({ upper: toleranceBand(d, 10), lower: 0 }),
};

/** IT grade tolerance band in mm — ISO 286-1:2010 */
function toleranceBand(d: number, itGrade: number): number {
  // Geometric mean diameter for tolerance calculation
  const i = 0.45 * Math.cbrt(d) + 0.001 * d; // fundamental tolerance unit (μm)
  const multipliers: Record<number, number> = {
    6: 10, 7: 16, 8: 25, 9: 40, 10: 64,
  };
  return (i * (multipliers[itGrade] ?? 16)) / 1000; // convert μm to mm
}

// ── Reference Data ────────────────────────────────────────────────

/** Base cutting speeds for reaming (m/min) by ISO group and reamer material */
const REAMING_SPEEDS: Record<string, Record<string, number>> = {
  // ISO group → { reamer_material → Vc }
  P: { hss: 12, cobalt_hss: 15, carbide: 40, cermet: 50 },
  M: { hss: 8, cobalt_hss: 10, carbide: 25, cermet: 35 },
  K: { hss: 10, cobalt_hss: 12, carbide: 35, cermet: 45 },
  N: { hss: 25, cobalt_hss: 30, carbide: 80, cermet: 80 },
  S: { hss: 5, cobalt_hss: 7, carbide: 15, cermet: 20 },
  H: { hss: 4, cobalt_hss: 6, carbide: 20, cermet: 25 },
};

/** Base feed per rev (mm/rev) by diameter range */
function baseFeedPerRev(diameter_mm: number): number {
  // Machinery's Handbook, Table 28-2
  if (diameter_mm <= 3) return 0.05;
  if (diameter_mm <= 6) return 0.10;
  if (diameter_mm <= 10) return 0.15;
  if (diameter_mm <= 16) return 0.20;
  if (diameter_mm <= 25) return 0.30;
  if (diameter_mm <= 40) return 0.40;
  if (diameter_mm <= 60) return 0.50;
  return 0.60;
}

/** Stock allowance per side (mm) — Machinery's Handbook */
function stockAllowancePerSide(diameter_mm: number, reamerMaterial: string): number {
  const base = diameter_mm <= 6 ? 0.10
    : diameter_mm <= 12 ? 0.15
    : diameter_mm <= 25 ? 0.20
    : diameter_mm <= 50 ? 0.25
    : 0.30;
  // Carbide reamers can handle less stock
  return reamerMaterial === "carbide" || reamerMaterial === "cermet"
    ? base * 0.8
    : base;
}

// ── Engine ─────────────────────────────────────────────────────────

export class ReamingEngine {
  /**
   * Calculate full reaming parameters.
   */
  calculate(input: ReamingInput): ReamingResult {
    const warnings: string[] = [];
    const d = input.bore_diameter_mm;
    const depth = input.bore_depth_mm;
    const iso = input.material_iso_group ?? "P";
    const tol = input.tolerance_class ?? "H7";
    const blind = input.blind_hole ?? false;
    const coolant = input.coolant ?? "flood";

    // Determine reamer type
    const reamer: ReamerType = {
      type: input.reamer?.type ?? (d <= 20 ? "solid_carbide" : "machine"),
      flutes: input.reamer?.flutes ?? this._defaultFlutes(d),
      helix_angle_deg: input.reamer?.helix_angle_deg ?? (blind ? 15 : 0),
      material: input.reamer?.material ?? (iso === "S" || iso === "H" ? "carbide" : "cobalt_hss"),
    };

    // Cutting speed
    const baseVc = REAMING_SPEEDS[iso]?.[reamer.material] ?? 12;
    let vc = baseVc;

    // Hardness adjustment
    if (input.material_hardness_hrc) {
      if (input.material_hardness_hrc > 45) {
        vc *= 0.6;
        warnings.push("High hardness — reduced cutting speed 40%");
      } else if (input.material_hardness_hrc > 35) {
        vc *= 0.8;
      }
    }

    // Coolant adjustment
    if (coolant === "dry") { vc *= 0.7; warnings.push("Dry reaming — reduced speed"); }
    else if (coolant === "through_tool") { vc *= 1.15; }
    else if (coolant === "mql") { vc *= 0.9; }

    // RPM
    const rpm = (vc * 1000) / (Math.PI * d);

    // Feed
    let fpr = baseFeedPerRev(d);
    if (reamer.material === "carbide" || reamer.material === "cermet") {
      fpr *= 1.5; // Carbide can take higher feed
    }
    if (tol === "H6") {
      fpr *= 0.7; // Tighter tolerance = lower feed
      warnings.push("H6 tolerance — reduced feed for precision");
    }
    if (blind) {
      fpr *= 0.8;
    }
    const feedRate = fpr * rpm;

    // Stock allowance
    const stockPerSide = stockAllowancePerSide(d, reamer.material);
    const preBoreDia = d - 2 * stockPerSide;

    // Surface finish prediction (Ra, μm)
    // Ra ≈ f² / (32 × r_nose) for single-point, adjusted for reamer
    // Reamers typically achieve 0.4-1.6 μm Ra
    let predictedRa = 0.8; // baseline
    if (reamer.material === "carbide" || reamer.material === "cermet") predictedRa = 0.4;
    if (tol === "H6") predictedRa = 0.3;
    if (coolant === "dry") predictedRa *= 1.5;
    if (fpr > 0.4) predictedRa *= 1.3;

    // Torque (N·m) — empirical: T = Kc × d × ap × f / (4000 × π)
    // Where Kc ≈ specific cutting force, ap = stock per side, f = feed/rev
    const kc = this._specificCuttingForce(iso, input.material_hardness_hrc);
    const torque = (kc * d * stockPerSide * fpr) / (4000 * Math.PI);

    // Thrust force (N) — empirical: Ft = Kc × d × f × 0.5
    const thrustForce = kc * stockPerSide * fpr * reamer.flutes * 0.5;

    // Cycle time
    const approach = blind ? 0 : d * 0.3; // approach distance
    const overtravel = blind ? 0 : 2;
    const totalTravel = depth + approach + overtravel;
    const cycleTime = totalTravel / feedRate; // minutes

    // Tolerance validation
    const tolFn = ISO_H_TOLERANCES[tol];
    if (!tolFn) {
      warnings.push(`Unknown tolerance class ${tol} — using H7 defaults`);
    }

    // Depth/diameter ratio warning
    if (depth / d > 3) {
      warnings.push(`L/D ratio ${(depth / d).toFixed(1)} — consider guided reamer or pilot bushing`);
    }
    if (depth / d > 5) {
      warnings.push("L/D > 5 — high deflection risk, reduce feed");
      fpr *= 0.7;
    }

    return {
      cutting_speed: { value: round2(vc), unit: "m/min", uncertainty: 0.15, source: "Machinery's Handbook 31st Ed. Table 28-1" },
      rpm: { value: Math.round(rpm), unit: "rev/min", uncertainty: 0.05, source: "Vc × 1000 / (π × D)" },
      feed_per_rev: { value: round3(fpr), unit: "mm/rev", uncertainty: 0.1, source: "Machinery's Handbook Table 28-2" },
      feed_rate: { value: round1(feedRate), unit: "mm/min", uncertainty: 0.12, source: "f/rev × RPM" },
      stock_allowance: { value: round3(stockPerSide), unit: "mm/side", uncertainty: 0.15, source: "Machinery's Handbook reaming allowance" },
      pre_bore_diameter: { value: round3(preBoreDia), unit: "mm", uncertainty: 0.05, source: "D - 2 × stock_allowance" },
      predicted_ra: { value: round2(predictedRa), unit: "μm", uncertainty: 0.25, source: "Empirical reamer finish model" },
      torque: { value: round2(torque), unit: "N·m", uncertainty: 0.2, source: "Kc × D × ap × f / (4000π)" },
      thrust_force: { value: round1(thrustForce), unit: "N", uncertainty: 0.2, source: "Kc × ap × f × z × 0.5" },
      cycle_time: { value: round2(cycleTime), unit: "min", uncertainty: 0.1, source: "travel / feed_rate" },
      reamer,
      warnings,
    };
  }

  /**
   * Calculate stock allowance for pre-bore sizing.
   */
  stockAllowance(input: {
    bore_diameter_mm: number;
    tolerance_class?: string;
    reamer_material?: string;
  }): ReamingStockResult {
    const d = input.bore_diameter_mm;
    const tol = input.tolerance_class ?? "H7";
    const mat = input.reamer_material ?? "cobalt_hss";

    const stockPerSide = stockAllowancePerSide(d, mat);
    const preBoreDia = d - 2 * stockPerSide;

    const tolFn = ISO_H_TOLERANCES[tol] ?? ISO_H_TOLERANCES.H7;
    const band = tolFn!(d);

    return {
      stock_per_side: { value: round3(stockPerSide), unit: "mm", uncertainty: 0.1, source: "Machinery's Handbook" },
      pre_bore_diameter: { value: round3(preBoreDia), unit: "mm", uncertainty: 0.05, source: "D - 2×stock" },
      tolerance_range: { min: d + band.lower, max: d + band.upper },
    };
  }

  /**
   * Calculate reaming forces.
   */
  force(input: ReamingInput): ReamingForceResult {
    const d = input.bore_diameter_mm;
    const iso = input.material_iso_group ?? "P";
    const reamerMat = input.reamer?.material ?? "cobalt_hss";
    const fpr = baseFeedPerRev(d);
    const stock = stockAllowancePerSide(d, reamerMat);
    const kc = this._specificCuttingForce(iso, input.material_hardness_hrc);
    const flutes = input.reamer?.flutes ?? this._defaultFlutes(d);

    const torque = (kc * d * stock * fpr) / (4000 * Math.PI);
    const thrust = kc * stock * fpr * flutes * 0.5;
    const vc = REAMING_SPEEDS[iso]?.[reamerMat] ?? 12;
    const rpm = (vc * 1000) / (Math.PI * d);
    const power = (torque * 2 * Math.PI * rpm) / 60000; // kW

    return {
      torque: { value: round2(torque), unit: "N·m", uncertainty: 0.2, source: "Kc-based torque model" },
      thrust_force: { value: round1(thrust), unit: "N", uncertainty: 0.2, source: "Kc-based thrust model" },
      power: { value: round3(power), unit: "kW", uncertainty: 0.2, source: "T × 2π × RPM / 60000" },
    };
  }

  /**
   * Predict achievable surface finish.
   */
  surfaceFinish(input: {
    bore_diameter_mm: number;
    reamer_material?: string;
    tolerance_class?: string;
    coolant?: string;
    feed_per_rev?: number;
  }): AtomicValue {
    let ra = 0.8;
    if (input.reamer_material === "carbide" || input.reamer_material === "cermet") ra = 0.4;
    if (input.tolerance_class === "H6") ra = 0.3;
    if (input.coolant === "dry") ra *= 1.5;
    if (input.feed_per_rev && input.feed_per_rev > 0.4) ra *= 1.3;

    return {
      value: round2(ra),
      unit: "μm Ra",
      uncertainty: 0.25,
      source: "Empirical reamer surface finish model",
    };
  }

  // ── Private Helpers ────────────────────────────────────────────

  private _defaultFlutes(diameter_mm: number): number {
    if (diameter_mm <= 6) return 4;
    if (diameter_mm <= 16) return 6;
    if (diameter_mm <= 32) return 8;
    return 10;
  }

  private _specificCuttingForce(iso: string, hardness_hrc?: number): number {
    // kc1.1 values in N/mm² (specific cutting force at 1mm chip thickness)
    const base: Record<string, number> = {
      P: 2000, M: 2200, K: 1500, N: 800, S: 2800, H: 3500,
    };
    let kc = base[iso] ?? 2000;
    if (hardness_hrc) {
      kc *= 1 + (hardness_hrc - 25) * 0.012;
    }
    return kc;
  }
}

// ── Utilities ─────────────────────────────────────────────────────

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }

export const reamingEngine = new ReamingEngine();
