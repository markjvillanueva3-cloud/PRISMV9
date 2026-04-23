/**
 * StampingDieEngine — Sheet metal stamping force and die design
 *
 * Models: Blanking force (F = L×t×τ), drawing force (Siebel),
 *         stripping force, die clearance, press tonnage
 * References: SME Die Design Handbook, ASTM blanking theory
 * Safety: Press overload, die clearance limits
 */

// ─── Types ─────────────────────────────────────────────────────────

export type StampOp = "blanking" | "piercing" | "drawing" | "bending" | "embossing";
export type SheetMaterial = "mild_steel" | "stainless_304" | "aluminum_5052"
  | "copper" | "brass" | "galvanized";

export interface StampingDieInput {
  operation?: StampOp;
  sheet_material?: SheetMaterial;
  sheet_thickness_mm: number;
  cut_perimeter_mm?: number;         // for blanking/piercing
  blank_diameter_mm?: number;        // for drawing
  punch_diameter_mm?: number;        // for drawing
  bend_length_mm?: number;           // for bending
  bend_angle_deg?: number;           // default 90
  press_capacity_kN?: number;        // for utilization check
}

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

export interface StampingDieResult {
  cutting_force_kN: AtomicValue;
  stripping_force_kN: AtomicValue;
  total_force_kN: AtomicValue;
  die_clearance_mm: AtomicValue;
  die_clearance_pct: AtomicValue;
  press_utilization_pct: AtomicValue;
  energy_per_stroke_J: AtomicValue;
  drawing_ratio: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Reference Data ────────────────────────────────────────────────

const MAT_PROPS: Record<SheetMaterial, {
  shear_MPa: number; uts_MPa: number; clearance_pct: number
}> = {
  mild_steel:    { shear_MPa: 300, uts_MPa: 400, clearance_pct: 6 },
  stainless_304: { shear_MPa: 480, uts_MPa: 620, clearance_pct: 5 },
  aluminum_5052: { shear_MPa: 130, uts_MPa: 230, clearance_pct: 8 },
  copper:        { shear_MPa: 180, uts_MPa: 250, clearance_pct: 7 },
  brass:         { shear_MPa: 220, uts_MPa: 350, clearance_pct: 7 },
  galvanized:    { shear_MPa: 280, uts_MPa: 380, clearance_pct: 6 },
};

// ─── Engine ────────────────────────────────────────────────────────

function mkAv(
  value: number, unit: string, unc: number,
  source: string, warning?: string
): AtomicValue {
  return { value, unit, uncertainty: unc, source, warning };
}

export class StampingDieEngine {
  calculate(input: StampingDieInput): StampingDieResult {
    const {
      operation = "blanking",
      sheet_material = "mild_steel",
      sheet_thickness_mm: t,
      cut_perimeter_mm: perim = 200,
      blank_diameter_mm: Db,
      punch_diameter_mm: Dp,
      bend_length_mm: Lb,
      bend_angle_deg = 90,
      press_capacity_kN: pressCap,
    } = input;

    const recs: string[] = [];
    const mp = MAT_PROPS[sheet_material];

    let cuttingForce = 0;
    let drawingRatio = 0;

    if (operation === "blanking" || operation === "piercing") {
      // F = L × t × τ (shear)
      cuttingForce = perim * t * mp.shear_MPa / 1000; // kN
    } else if (operation === "drawing" && Db && Dp) {
      // Siebel drawing force: F = π×Dp×t×UTS×(DR-0.7)
      drawingRatio = Db / Dp;
      cuttingForce = Math.PI * Dp * t * mp.uts_MPa
        * (drawingRatio - 0.7) / 1000;
    } else if (operation === "bending") {
      const len = Lb ?? 100;
      // V-bending: F = (k×UTS×L×t²) / W, W≈8t
      const W = 8 * t;
      const k = 1.33;
      cuttingForce = k * mp.uts_MPa * len * t * t / (W * 1000);
    } else if (operation === "embossing") {
      cuttingForce = perim * t * mp.uts_MPa * 1.5 / 1000;
    }

    // Stripping force (5-10% of cutting force)
    const stripForce = cuttingForce * 0.08;
    const totalForce = cuttingForce + stripForce;

    // Die clearance
    const clearancePct = mp.clearance_pct;
    const clearanceMm = t * clearancePct / 100;

    // Energy per stroke: E ≈ F × penetration (≈ 0.6t for shear)
    const penetration = operation === "blanking" || operation === "piercing"
      ? t * 0.6 : t;
    const energy = totalForce * 1000 * penetration / 1000; // J

    // Press utilization
    const pressUtil = pressCap
      ? (totalForce / pressCap) * 100 : 0;

    const isSafe = (pressCap ? pressUtil < 80 : true)
      && (drawingRatio === 0 || drawingRatio <= 2.2);

    if (pressCap && pressUtil > 75) {
      recs.push(
        `Press utilization ${pressUtil.toFixed(0)}% — `
        + `near capacity, consider larger press`
      );
    }
    if (drawingRatio > 2.0) {
      recs.push(
        `Drawing ratio ${drawingRatio.toFixed(2)} exceeds 2.0 — `
        + `use multiple draws or blank holder`
      );
    }
    if (t > 6 && sheet_material === "stainless_304") {
      recs.push(
        `Thick stainless ${t}mm — high tool wear, `
        + `use carbide inserts`
      );
    }
    if (recs.length === 0) {
      recs.push(
        `Stamping nominal — ${totalForce.toFixed(0)}kN total, `
        + `clearance ${clearanceMm.toFixed(2)}mm`
      );
    }

    return {
      cutting_force_kN: mkAv(
        Math.round(cuttingForce * 10) / 10, "kN",
        cuttingForce * 0.10, "shear_force"
      ),
      stripping_force_kN: mkAv(
        Math.round(stripForce * 10) / 10, "kN",
        stripForce * 0.15, "empirical"
      ),
      total_force_kN: mkAv(
        Math.round(totalForce * 10) / 10, "kN",
        totalForce * 0.10, "sum_forces"
      ),
      die_clearance_mm: mkAv(
        Math.round(clearanceMm * 1000) / 1000, "mm",
        clearanceMm * 0.10, "material_table"
      ),
      die_clearance_pct: mkAv(clearancePct, "%", 0.5, "material_table"),
      press_utilization_pct: mkAv(
        Math.round(pressUtil * 10) / 10, "%",
        pressUtil * 0.05, "force_ratio"
      ),
      energy_per_stroke_J: mkAv(
        Math.round(energy * 10) / 10, "J",
        energy * 0.12, "force_distance"
      ),
      drawing_ratio: mkAv(
        Math.round(drawingRatio * 100) / 100, "ratio",
        0, "diameter_ratio"
      ),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const stampingDieEngine = new StampingDieEngine();
