/**
 * CADPatternEngine -- first-class feature/body PATTERN (replication) operations for PRISM CAD:
 * linear array, circular (polar) array, and mirror. Closes the coverage-meter "patterns: absent" gap.
 *
 * Computes the EXACT instance count + replicated feature volume analytically (count * single-feature
 * volume) and emits the real-geometry CadQuery pattern op (.rarray / .polarArray / .mirror) that the
 * cad-text-to-cadquery lane executes for true geometry. Genuinely distinct from GeometryEngine.boolean
 * (volume arithmetic) and CADSubtractiveFeatureEngine (single-feature cut) -- this is replication.
 *
 * Engine convention: pure calculation, typed returns, edge cases return structured {success:false}
 * (never throw), units mm internally; cadquery ops emitted in mm.
 */

/** A pattern (replication) kind. */
export type PatternKind = "linear" | "circular" | "mirror";

/** Result of a pattern operation. */
export interface PatternResult {
  pattern: PatternKind;
  success: boolean;
  /** Total instances INCLUDING the seed feature. */
  instance_count: number;
  /** count * single-feature volume (0 when no per-feature volume supplied). */
  total_feature_volume_mm3: number;
  /** Real-geometry CadQuery fragment (mm) the gen lane executes. */
  cadquery_op: string;
  notes: string[];
}

function allFinite(...vals: number[]): boolean {
  return vals.every((v) => typeof v === "number" && Number.isFinite(v));
}

function fail(pattern: PatternKind, note: string): PatternResult {
  return { pattern, success: false, instance_count: 0, total_feature_volume_mm3: 0, cadquery_op: "", notes: [note] };
}

function ok(pattern: PatternKind, count: number, featureVol: number, cadquery_op: string): PatternResult {
  return { pattern, success: true, instance_count: count, total_feature_volume_mm3: count * Math.max(0, featureVol), cadquery_op, notes: [] };
}

/** Pattern / replication engine. */
export class CADPatternEngine {
  /** Linear array of `count` instances at `spacingMm` pitch (count includes the seed). */
  linear(count: number, spacingMm: number, featureVolumeMm3 = 0): PatternResult {
    if (!allFinite(count, spacingMm, featureVolumeMm3)) return fail("linear", "non-finite input");
    if (!Number.isInteger(count) || count < 1) return fail("linear", "count must be an integer >= 1");
    if (spacingMm <= 0) return fail("linear", "spacing must be positive");
    return ok("linear", count, featureVolumeMm3, `.rarray(${spacingMm}, 1, ${count}, 1)  # mm linear array`);
  }

  /** Circular (polar) array of `count` instances on radius `radiusMm`, evenly over 360 degrees. */
  circular(count: number, radiusMm: number, featureVolumeMm3 = 0): PatternResult {
    if (!allFinite(count, radiusMm, featureVolumeMm3)) return fail("circular", "non-finite input");
    if (!Number.isInteger(count) || count < 1) return fail("circular", "count must be an integer >= 1");
    if (radiusMm <= 0) return fail("circular", "radius must be positive");
    return ok("circular", count, featureVolumeMm3, `.polarArray(${radiusMm}, 0, 360, ${count})  # mm polar array`);
  }

  /** Mirror across a plane ("XY"|"YZ"|"XZ") -> exactly 2 instances (seed + reflection). */
  mirror(plane: string, featureVolumeMm3 = 0): PatternResult {
    if (!allFinite(featureVolumeMm3)) return fail("mirror", "non-finite input");
    const p = String(plane || "").toUpperCase();
    if (p !== "XY" && p !== "YZ" && p !== "XZ") return fail("mirror", `mirror plane must be XY|YZ|XZ (got '${plane}')`);
    return ok("mirror", 2, featureVolumeMm3, `.mirror("${p}")  # reflect across ${p}`);
  }

  /** Dispatcher entrypoint: route a params object to the right pattern op. */
  apply(params: Record<string, unknown>): PatternResult {
    const kind = String(params.kind ?? params.pattern ?? "");
    const n = (k: string): number => Number(params[k]);
    const vol = params.feature_volume_mm3 === undefined ? 0 : Number(params.feature_volume_mm3);
    switch (kind) {
      case "linear": return this.linear(n("count"), n("spacing_mm"), vol);
      case "circular": return this.circular(n("count"), n("radius_mm"), vol);
      case "mirror": return this.mirror(String(params.plane ?? ""), vol);
      default: return fail("linear", `unknown pattern kind '${kind}' (expected linear|circular|mirror)`);
    }
  }
}

export const cadPatternEngine = new CADPatternEngine();
