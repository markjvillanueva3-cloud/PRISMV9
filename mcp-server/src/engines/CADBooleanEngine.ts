/**
 * CADBooleanEngine -- dispatcher-facing COMPOSER for CAD boolean solid operations
 * (union / subtract / intersect). Closes the coverage-meter "boolean: absent" cad-dispatcher gap by
 * WIRING existing engines, NOT reimplementing boolean math:
 *   - the result-volume estimate is DELEGATED to GeometryEngine.boolean (the pure volume-arithmetic
 *     model -- union = A + 0.95*B, subtract = max(0, A-B), intersect = 0.5*min(A,B));
 *   - the emitted CadQuery op string (`.union`/`.cut`/`.intersect`) is what the codegen lane writes;
 *   - the dispatcher pairs this with the REAL CSG kernel (BooleanKernelEngine, cadquery-bridge) when
 *     live solid IDs are supplied -- this engine flags `uses_real_kernel` so the dispatcher knows to run it.
 *
 * Engine convention: pure calc, typed returns, edge cases return structured {success:false} (never
 * throw). Volume estimate is dimensionless mm^3; the real kernel owns exact geometry when solids exist.
 */
import { geometryEngine, type BooleanOp } from "./GeometryEngine.js";
// type-only: the dispatcher attaches the real-kernel result to this object; declaring the field keeps
// typed consumers honest without coupling this composer to BooleanKernelEngine's runtime (CadBridge).
import type { BooleanKernelResult } from "./BooleanKernelEngine.js";

/** Result of a CAD boolean composition. */
export interface CADBooleanResult {
  op: BooleanOp;
  success: boolean;
  /** Estimated result volume (mm^3) from GeometryEngine.boolean; 0 when only the real kernel applies. */
  result_volume_mm3: number;
  /** CadQuery boolean op the codegen lane emits (solidA <op> solidB). */
  cadquery_op: string;
  /** True when solid IDs were supplied -> the dispatcher should run the real BooleanKernelEngine. */
  uses_real_kernel: boolean;
  /** Real CSG kernel result, attached by the cadDispatcher cad_boolean case when uses_real_kernel. */
  real_kernel?: BooleanKernelResult;
  notes: string[];
}

const OPS = new Set<BooleanOp>(["union", "subtract", "intersect"]);
const CQ_OP: Record<BooleanOp, string> = {
  union: ".union(solidB)",
  subtract: ".cut(solidB)",
  intersect: ".intersect(solidB)",
};

function fail(op: BooleanOp, note: string, usesRealKernel = false): CADBooleanResult {
  return { op, success: false, result_volume_mm3: 0, cadquery_op: "", uses_real_kernel: usesRealKernel, notes: [note] };
}

/** CAD boolean composer. */
export class CADBooleanEngine {
  /** Dispatcher entrypoint: compose a boolean op from volumes (estimate) and/or solid IDs (real kernel). */
  apply(params: Record<string, unknown>): CADBooleanResult {
    const op = String(params.op ?? params.operation ?? "") as BooleanOp;
    if (!OPS.has(op)) return fail("union", `unknown boolean op '${op}' (expected union|subtract|intersect)`);

    const hasSolids = typeof params.solid_a === "string" && typeof params.solid_b === "string"
      && (params.solid_a as string).length > 0 && (params.solid_b as string).length > 0;
    const va = Number(params.volume_a_mm3);
    const vb = Number(params.volume_b_mm3);
    const haveVolumes = Number.isFinite(va) && Number.isFinite(vb);

    if (haveVolumes) {
      if (va < 0 || vb < 0) return fail(op, "volumes must be non-negative", hasSolids);
      // DELEGATE the volume result to GeometryEngine.boolean -- do not reimplement the boolean model.
      const est = geometryEngine.boolean(op, va, vb);
      return {
        op, success: est.success, result_volume_mm3: est.result_volume_mm3, cadquery_op: CQ_OP[op],
        uses_real_kernel: hasSolids, notes: [...est.notes],
      };
    }
    if (hasSolids) {
      // No volumes supplied but live solids are -- the real BooleanKernelEngine (dispatcher) owns the
      // exact result geometry/volume; this composer just emits the op + signals the real path.
      return { op, success: true, result_volume_mm3: 0, cadquery_op: CQ_OP[op], uses_real_kernel: true,
        notes: ["real kernel (BooleanKernelEngine) owns the result volume; estimate skipped"] };
    }
    return fail(op, "provide volume_a_mm3 + volume_b_mm3 (estimate) or solid_a + solid_b (real kernel)");
  }
}

export const cadBooleanEngine = new CADBooleanEngine();
