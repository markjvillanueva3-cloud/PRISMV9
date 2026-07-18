/**
 * KiloSfcSolidWorksBridgeEngine — KILO-CAM-MASTERY-MS0 campaign iter 6
 *
 * Closes the U-BRIDGE-SFC-SOLIDWORKS gap surfaced by iter5's CAM-pickup
 * compile. SolidWorks CAM ships SolidCAM iMachining as its high-speed
 * adaptive strategy; this engine translates SFC output into the SolidCAM
 * iMachining cycle param shape (`spindle`, `feedXY`, `feedZ`, `maxStepover`,
 * `maxStepdown`, `strategy`).
 *
 * Pure function — no I/O. Sourced from SolidCAM 2024 iMachining Operations
 * Reference + the existing `solidcam_imachining_*` dispatcher actions in
 * camDispatcher.ts (catalog of SolidCAM iMachining knobs).
 *
 * SolidCAM iMachining convention:
 *   - `feedXY` = lateral feed = SFC `feed_mm_min` (translation feed)
 *   - `feedZ` (helical-down / plunge feed) = 40% of XY feed (iMachining's
 *     spiral-entry assumption — gentler than Mastercam's 50% trochoidal,
 *     steeper than hyperMILL's 30% helical because iMachining sustains
 *     full radial engagement on entry)
 *   - `maxStepover` = absolute mm (NOT pct, unlike Mastercam)
 *   - `maxStepdown` = absolute mm
 *   - `strategy` = `"iMachining 2D"` default; `"iMachining 3D"` overridable
 *
 * Per kilo refuse-list (audited by tests):
 *   - emitting-program-without-pmi-validation: bridge consumes SFC only
 *   - dropping-tolerance-stack-on-translate: source values flow verbatim
 *   - silent-fallback-on-ambiguous-callouts: strategy is explicit default
 *
 * @milestone KILO-CAM-MASTERY-MS0
 * @version 1.0.0
 */

import { z } from "zod";

// ============================================================================
// SHARED SHAPE — local SFC schema (matches sibling iter1 KiloCamSfcBridges)
// ============================================================================

export const SFCResultSchema = z.object({
  vc_m_min: z.number().min(0),
  fz_mm_tooth: z.number().min(0),
  ap_mm: z.number().min(0),
  ae_mm: z.number().min(0),
  rpm: z.number().min(0),
  feed_mm_min: z.number().min(0),
  tool_diameter_mm: z.number().min(0),
  tool_teeth: z.number().int().min(1),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  confidence: z.number().min(0).max(1).optional(),
});
export type SFCResult = z.infer<typeof SFCResultSchema>;

// ============================================================================
// SOLIDCAM iMACHINING CYCLE PARAMS
// ============================================================================

export const SolidWorksCycleParamsSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  source: z.literal("sfc_solidworks_bridge"),
  spindle_rpm: z.number().min(0),
  feed_xy_mm_min: z.number().min(0),
  feed_z_mm_min: z.number().min(0),
  max_stepover_mm: z.number().min(0),
  max_stepdown_mm: z.number().min(0),
  strategy: z.string(),
});
export type SolidWorksCycleParams = z.infer<typeof SolidWorksCycleParamsSchema>;

function sfcSolidWorksBridge(
  sfc: SFCResult,
  opts?: { strategy?: string; feed_z_factor?: number },
): SolidWorksCycleParams {
  SFCResultSchema.parse(sfc);
  // SolidCAM iMachining convention: feedZ ≈ 40% of feedXY (spiral entry).
  const feedZFactor = opts?.feed_z_factor ?? 0.4;
  return {
    schemaVersion: "1.0.0",
    source: "sfc_solidworks_bridge",
    spindle_rpm: sfc.rpm,
    feed_xy_mm_min: sfc.feed_mm_min,
    feed_z_mm_min: sfc.feed_mm_min * feedZFactor,
    max_stepover_mm: sfc.ae_mm,
    max_stepdown_mm: sfc.ap_mm,
    strategy: opts?.strategy ?? "iMachining 2D",
  };
}

// ============================================================================
// CLASS WRAPPER
// ============================================================================

class KiloSfcSolidWorksBridgeEngine {
  static sfcSolidWorksBridge = sfcSolidWorksBridge;
}

export const kiloSfcSolidWorksBridgeEngine = KiloSfcSolidWorksBridgeEngine;
