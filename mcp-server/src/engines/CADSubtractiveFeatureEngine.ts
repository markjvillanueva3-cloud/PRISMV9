/**
 * CADSubtractiveFeatureEngine -- first-class sketch-subtractive feature operations (cut hole /
 * pocket / groove) for PRISM CAD. Closes the coverage-meter "sketch-subtractive: absent" gap.
 *
 * It computes the EXACT analytical removed volume from the feature geometry (pi*r^2*h for a hole,
 * w*l*d for a pocket, w*d*l for a groove) -- NOT GeometryEngine.boolean's volume-arithmetic estimate
 * (max(0, A-B)) -- AND emits the REAL-geometry CadQuery operation (the cad-text-to-cadquery lane
 * executes it -> true CSG boolean -> validated STEP, the lane proven at 36/36 valid). The analytical
 * volume is the validation oracle; the cadquery op is the geometry instruction.
 *
 * Engine convention: pure calculation, typed returns, edge cases return structured {success:false}
 * (never throw). Units are mm internally (matching GeometryEngine); cadquery ops are emitted in mm.
 */

/** A subtractive feature operation kind. */
export type SubtractiveOp = "cut_hole" | "pocket" | "groove";

/** Result of a subtractive feature operation. */
export interface SubtractiveResult {
  operation: SubtractiveOp;
  success: boolean;
  base_volume_mm3: number;
  removed_volume_mm3: number;
  result_volume_mm3: number;
  /** Real-geometry CadQuery fragment (mm) the gen lane executes for true CSG. */
  cadquery_op: string;
  notes: string[];
}

function allFinite(...vals: number[]): boolean {
  return vals.every((v) => typeof v === "number" && Number.isFinite(v));
}

function fail(operation: SubtractiveOp, baseVol: number, note: string): SubtractiveResult {
  return { operation, success: false, base_volume_mm3: baseVol, removed_volume_mm3: 0, result_volume_mm3: baseVol, cadquery_op: "", notes: [note] };
}

function ok(operation: SubtractiveOp, baseVol: number, removed: number, cadquery_op: string): SubtractiveResult {
  return { operation, success: true, base_volume_mm3: baseVol, removed_volume_mm3: removed, result_volume_mm3: baseVol - removed, cadquery_op, notes: [] };
}

/** Subtractive-feature engine. */
export class CADSubtractiveFeatureEngine {
  /** Cylindrical hole (blind, depth `depthMm`) subtracted from a base solid of `baseVolumeMm3`. */
  cutHole(baseVolumeMm3: number, diameterMm: number, depthMm: number): SubtractiveResult {
    if (!allFinite(baseVolumeMm3, diameterMm, depthMm)) return fail("cut_hole", baseVolumeMm3, "non-finite input");
    if (baseVolumeMm3 <= 0 || diameterMm <= 0 || depthMm <= 0) return fail("cut_hole", baseVolumeMm3, "non-positive dimension");
    const r = diameterMm / 2;
    const removed = Math.PI * r * r * depthMm;
    if (removed >= baseVolumeMm3) return fail("cut_hole", baseVolumeMm3, "removed volume >= base (through-all or invalid feature)");
    return ok("cut_hole", baseVolumeMm3, removed, `.faces(">Z").workplane().hole(${diameterMm}, ${depthMm})  # mm`);
  }

  /** Rectangular blind pocket `widthMm` x `lengthMm` x `depthMm` subtracted from the base. */
  pocket(baseVolumeMm3: number, widthMm: number, lengthMm: number, depthMm: number): SubtractiveResult {
    if (!allFinite(baseVolumeMm3, widthMm, lengthMm, depthMm)) return fail("pocket", baseVolumeMm3, "non-finite input");
    if (baseVolumeMm3 <= 0 || widthMm <= 0 || lengthMm <= 0 || depthMm <= 0) return fail("pocket", baseVolumeMm3, "non-positive dimension");
    const removed = widthMm * lengthMm * depthMm;
    if (removed >= baseVolumeMm3) return fail("pocket", baseVolumeMm3, "removed volume >= base (invalid pocket)");
    return ok("pocket", baseVolumeMm3, removed, `.faces(">Z").workplane().rect(${widthMm}, ${lengthMm}).cutBlind(-${depthMm})  # mm`);
  }

  /** Straight groove (channel) `widthMm` wide x `depthMm` deep x `lengthMm` long subtracted. */
  groove(baseVolumeMm3: number, widthMm: number, depthMm: number, lengthMm: number): SubtractiveResult {
    if (!allFinite(baseVolumeMm3, widthMm, depthMm, lengthMm)) return fail("groove", baseVolumeMm3, "non-finite input");
    if (baseVolumeMm3 <= 0 || widthMm <= 0 || depthMm <= 0 || lengthMm <= 0) return fail("groove", baseVolumeMm3, "non-positive dimension");
    const removed = widthMm * depthMm * lengthMm;
    if (removed >= baseVolumeMm3) return fail("groove", baseVolumeMm3, "removed volume >= base (invalid groove)");
    return ok("groove", baseVolumeMm3, removed, `.faces(">Z").workplane().rect(${widthMm}, ${lengthMm}).cutBlind(-${depthMm})  # groove, mm`);
  }

  /** Dispatcher entrypoint: route a params object to the right subtractive op. */
  apply(params: Record<string, unknown>): SubtractiveResult {
    const op = String(params.op ?? params.operation ?? "");
    const n = (k: string): number => Number(params[k]);
    switch (op) {
      case "cut_hole": return this.cutHole(n("base_volume_mm3"), n("diameter_mm"), n("depth_mm"));
      case "pocket": return this.pocket(n("base_volume_mm3"), n("width_mm"), n("length_mm"), n("depth_mm"));
      case "groove": return this.groove(n("base_volume_mm3"), n("width_mm"), n("depth_mm"), n("length_mm"));
      default: return fail("cut_hole", Number(params.base_volume_mm3) || 0, `unknown subtractive op '${op}' (expected cut_hole|pocket|groove)`);
    }
  }
}

export const cadSubtractiveFeatureEngine = new CADSubtractiveFeatureEngine();
