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
  // Bulk-sweep guard (ported from slot/oscar). Bulk parameter-space enumerators
  // (e.g. sfc-fullspace-sweep) call calculate() millions of times; each capture appends
  // ~11 KB to the global per-domain outcome ledger state/outcomes/speed_feed.jsonl -- a
  // 19.6M-cell grind once wrote ~215 GB there (redundant: the sweep already streams every
  // cell to its own per-shard ledger). A bulk caller sets PRISM_SFC_DISABLE_OUTCOME_CAPTURE=1
  // to skip the global wire. Default OFF -> interactive / shop-floor capture is unchanged.
  // Grammar matches the sibling PRISM_SFC_FAST_BULK knob ("1" | "true") -- the two are set
  // together by sweep shells, and a grammar mismatch (fast_bulk honoring "true" while this
  // guard silently ignored it) would re-open the 215GB ledger class (scrutiny arm-A P2).
  const disableCapture = process.env.PRISM_SFC_DISABLE_OUTCOME_CAPTURE;
  if (disableCapture === "1" || disableCapture === "true") {
    return {
      ok: false,
      lineage_id: input.lineageId ?? "",
      event_id: "",
      summary: {},
      warning: "outcome-capture suppressed (PRISM_SFC_DISABLE_OUTCOME_CAPTURE=1; bulk-sweep mode)",
    };
  }
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
