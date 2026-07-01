/**
 * CADStockAllowanceEngine -- secondary-operation finish-stock planning for the CAD-drawing pipeline
 * (delta/CAD, U-CADDRAW-STOCK-OFFSET, 2026-06-19). Stage S4 of
 * state/shared/specs/CAD-DRAWING-PIPELINE-COMPREHENSIVE-2026-06-19.md.
 *
 * The operator plans ahead for secondary ops -- leave material for grinding/honing, undersize a
 * sinker-EDM electrode by the spark gap -- so the AS-MODELED geometry carries the finish stock and
 * the final print-regen validation (stage S5) compares against the STOCK-INCLUDED nominal, not the
 * finished print dimension.
 *
 * GEOMETRIC DIRECTION (per-side material allowance applied to a nominal dimension):
 *   external surface (OD / boss / outer length): grind/hone REMOVES material from the outside, so the
 *     as-machined part must be LARGER -> OVERSIZE  (modeled = nominal + delta).
 *   internal surface (bore ID / pocket): grind/hone ENLARGES the feature, so leave material ->
 *     UNDERSIZE (modeled = nominal - delta).
 *   electrode (sinker EDM): the discharge burns a cavity LARGER than the electrode by the spark gap,
 *     so the electrode is UNDERSIZE by the spark gap (modeled = nominal - delta).
 *   delta = (diametral ? 2 : 1) x perSideAllowance  -- a diameter changes by twice the radial stock.
 *
 * UNITS: mm. PURITY: pure + deterministic, no I/O, no input mutation.
 * CONSTANTS: the sinker-EDM spark gap is imported from src/physics/constants.ts (EDM_PHYSICS) --
 *   NEVER inlined. The grind/hone allowance VALUES are operator/process inputs (passed in), not the
 *   engine's decision; per the delta soul, exact tolerance values defer to physics-reviewer.
 *
 * Actions (via cadDispatcher): cad_apply_stock_allowance
 */

import { z } from "zod";
import { EDM_PHYSICS } from "../physics/constants.js";

export type StockSurface = "external" | "internal" | "electrode";
export type StockOp = "grind" | "hone" | "spark-gap" | "finish";
export type EdmRegime = "finish" | "semi" | "rough";

export interface StockAllowance {
  op: StockOp;
  surface: StockSurface;
  /** per-side material allowance in mm. For op "spark-gap" it may be omitted to default from constants. */
  allowanceMm?: number;
  /** the dimension is a diameter -> the dimensional delta is 2x the per-side allowance. Default false. */
  diametral?: boolean;
  /** electrode material for the spark-gap default lookup. Default "graphite". */
  electrodeMaterial?: string;
  /** EDM regime for the spark-gap default lookup. Default "finish". */
  regime?: EdmRegime;
}

export interface StockedDimension {
  nominalMm: number;
  modeledMm: number; // as-modeled, stock-included
  perSideAllowanceMm: number;
  appliedDeltaMm: number; // signed (modeled - nominal)
  op: StockOp;
  surface: StockSurface;
  diametral: boolean;
  direction: "oversize" | "undersize";
  source: string;
  warning?: string;
}

const StockAllowanceSchema = z.object({
  op: z.enum(["grind", "hone", "spark-gap", "finish"]),
  surface: z.enum(["external", "internal", "electrode"]),
  allowanceMm: z.number().optional(),
  diametral: z.boolean().optional(),
  electrodeMaterial: z.string().optional(),
  regime: z.enum(["finish", "semi", "rough"]).optional(),
});

export class CADStockAllowanceEngine {
  /**
   * Resolve the canonical sinker-EDM lateral spark gap (per side, mm) from src/physics/constants.ts.
   *
   * @throws if the electrode material is not in the canonical table (fail loud, never guess)
   */
  resolveSparkGapMm(electrodeMaterial = "graphite", regime: EdmRegime = "finish"): number {
    const gap = EDM_PHYSICS.sinker_spark_gap;
    const table = regime === "rough" ? gap.rough_mm : regime === "semi" ? gap.semi_mm : gap.finish_mm;
    const v = table[electrodeMaterial];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new Error(
        `CADStockAllowance.resolveSparkGapMm: unknown electrode material "${electrodeMaterial}" (have: ${Object.keys(table).join(", ")})`,
      );
    }
    return v;
  }

  /**
   * Apply a finish-stock allowance to one nominal dimension, returning the as-modeled (stock-included)
   * dimension plus full provenance. The model is left OVERSIZE for external removal and UNDERSIZE for
   * internal removal / EDM electrode, by (diametral ? 2 : 1) x the per-side allowance.
   *
   * @throws on a non-finite nominal, a negative allowance, or a missing allowance for a non-spark-gap op
   */
  applyAllowance(nominalMm: number, allowance: StockAllowance): StockedDimension {
    if (!Number.isFinite(nominalMm)) {
      throw new Error("CADStockAllowance.applyAllowance: nominalMm must be a finite number");
    }
    const a = StockAllowanceSchema.parse(allowance) as StockAllowance;

    let perSide: number;
    let source: string;
    if (a.allowanceMm !== undefined) {
      perSide = a.allowanceMm;
      source = "operator-specified";
    } else if (a.op === "spark-gap" || a.surface === "electrode") {
      perSide = this.resolveSparkGapMm(a.electrodeMaterial, a.regime);
      source = EDM_PHYSICS.sinker_spark_gap.source;
    } else {
      throw new Error(
        `CADStockAllowance.applyAllowance: allowanceMm is required for op "${a.op}" (only spark-gap defaults from constants)`,
      );
    }
    if (!Number.isFinite(perSide) || perSide < 0) {
      throw new Error("CADStockAllowance.applyAllowance: per-side allowance must be a finite, non-negative number");
    }

    const diametral = a.diametral ?? false;
    const sign = a.surface === "external" ? 1 : -1; // external removal -> oversize; internal/electrode -> undersize
    const appliedDeltaMm = sign * (diametral ? 2 : 1) * perSide;
    const modeledMm = nominalMm + appliedDeltaMm;

    const out: StockedDimension = {
      nominalMm,
      modeledMm,
      perSideAllowanceMm: perSide,
      appliedDeltaMm,
      op: a.op,
      surface: a.surface,
      diametral,
      direction: sign > 0 ? "oversize" : "undersize",
      source,
    };
    if (modeledMm <= 0) {
      out.warning = "modeled dimension is non-positive -- the allowance exceeds the nominal";
    }
    return out;
  }

  /**
   * Batch-apply allowances to a list of nominal dimensions.
   * @param items each { nominalMm, allowance, label? }
   */
  applyPlan(items: Array<{ nominalMm: number; allowance: StockAllowance; label?: string }>):
    Array<StockedDimension & { label?: string }> {
    if (!Array.isArray(items)) {
      throw new Error("CADStockAllowance.applyPlan: items must be an array");
    }
    return items.map((it) => ({ ...this.applyAllowance(it.nominalMm, it.allowance), label: it.label }));
  }
}

export const cadStockAllowanceEngine = new CADStockAllowanceEngine();
