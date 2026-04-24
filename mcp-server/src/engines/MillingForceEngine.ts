/**
 * MillingForceEngine — stub (U-EFF25).
 *
 * millDispatcher retrieves this via dynamic import as a "physics" bucket
 * instance. Real engine never existed on any branch; call sites access
 * it loosely, so a permissive singleton is enough to satisfy TS2307.
 */
class MillingForceEngine {
  compute(input: Record<string, unknown>): Record<string, unknown> {
    return { ok: false, stub: true, input };
  }
}

export const millingForceEngine = new MillingForceEngine();
