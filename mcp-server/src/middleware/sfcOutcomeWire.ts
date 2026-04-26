/**
 * sfcOutcomeWire — U-PPG-SFC-01 inline helpers
 * =============================================
 *
 * Tiny wrappers around `sfcOutcomeCaptureWireEngine.recordEmission` so each
 * SFC engine adds 1–2 lines instead of inlining the full payload. Errors
 * inside the wire are swallowed — speed/feed recommendations must never
 * fail because telemetry failed.
 *
 * Used by:
 *   - UltimateSpeedFeedEngine.calculate
 *   - AutoSpeedFeedCalculatorEngine.calculate
 *   - SFCCalculateEngine.calculate (static)
 *   - MachineAwareSpeedFeedEngine.constrain
 *   - LatheSpeedFeedCalculatorFacadeEngine.calculate (static)
 *
 * @module middleware/sfcOutcomeWire
 * @milestone PSAU-PPG-SFC U-PPG-SFC-01
 */

import {
  sfcOutcomeCaptureWireEngine,
  type SFCEmissionInput,
  type SFCEmissionResult,
} from "../engines/SFCOutcomeCaptureWireEngine.js";

/**
 * Fire-and-forget capture. Returns the wire result so the caller can
 * thread `lineage_id` into its own response if it wants provenance, or
 * ignore it entirely. Never throws.
 */
export function captureSFC(input: SFCEmissionInput): SFCEmissionResult {
  try {
    return sfcOutcomeCaptureWireEngine.recordEmission(input);
  } catch (err) {
    return {
      ok: false,
      lineage_id: input.lineageId ?? "",
      event_id: "",
      summary: {},
      warning: `wire-engine threw: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Convenience for engines whose result type allows attaching a lineage_id.
 * Returns the lineage_id (existing or freshly generated). Use only when the
 * engine intends to thread the id back into its own return shape; otherwise
 * call `captureSFC` directly.
 */
export function captureSFCAndThread(input: SFCEmissionInput): string {
  const r = captureSFC(input);
  return r.lineage_id || input.lineageId || "";
}
