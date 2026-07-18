/**
 * KiloCamSfcBridgesEngine — KILO-CAM-MASTERY-MS0 iter 1
 *
 * Two SFC→CAM-system bridges added by kilo's CAM-specialist pivot
 * (user directive 2026-05-24, /goal "build+wire+bridge all CAM-compatible nodes"):
 *
 *   6. sfc_mastercam_bridge — SFC output → Mastercam Dynamic Mill cycle params
 *   7. sfc_esprit_bridge    — SFC output → Esprit ProfitMilling cycle params
 *
 * Closes the SFC-bridge surface gap surfaced by camDispatcher audit
 * (user priority order hyperCAD > Mastercam > Fusion > InventorHSM > Esprit):
 *   - Fusion        ✓ bridge exists (echo)
 *   - hyperMILL     ✓ bridge exists (echo)
 *   - Inventor HSM  ✓ bridge exists (echo)
 *   - Mastercam     ← THIS ENGINE (priority #2 — JM-Die's most-used CAM, 45 tribal tips)
 *   - Esprit        ← THIS ENGINE (priority #5 — completes the 5-system surface)
 *
 * Each bridge is a pure function — no I/O, no MCP imports. They translate
 * SpeedFeedOrchestrator (SFC) output into the per-CAM-system cycle param shape,
 * preserving values per kilo's refuse-list (no silent-fallback-on-ambiguous,
 * no dropping-tolerance-stack-on-translate).
 *
 * Per kilo's CAM-domain doctrine: speed/feed values are NEVER inlined — every
 * bridge reads from an SFC-shaped input the caller supplies (call
 * `cam_speedfeed_compute` upstream, then hand the result to a bridge).
 *
 * NOTE on schema duplication: this file declares its own SFCResultSchema
 * locally rather than importing from echo's CamBridgeKitEngine (which is
 * still uncommitted in the shared tree as of 2026-05-24). On echo's merge,
 * this engine should switch to importing the shared schema — tracked as
 * follow-up unit U-KILO-CAM-SFC-SCHEMA-DEDUPE.
 *
 * Dispatcher wiring is deferred to follow-up unit U-KILO-CAM-SFC-WIRE
 * (slot/kilo's camDispatcher.ts is 874 commits behind main — wiring will
 * land at the merge point so the wire isn't lost). See companion spec
 * `state/shared/specs/U-KILO-CAM-SFC-WIRE.md` for the exact 2-line edits.
 *
 * @milestone KILO-CAM-MASTERY-MS0
 * @version 1.0.0
 */

import { z } from "zod";

// ============================================================================
// SHARED SHAPE (local declaration — see file-level NOTE on schema duplication)
// ============================================================================

/**
 * SpeedFeedOrchestrator output shape that SFC→CAM bridges consume.
 *
 * Same canonical 11-field shape echo's CamBridgeKitEngine consumes — physics-
 * determined, not arbitrary. Local declaration here so this engine can ship
 * before echo's CamBridgeKitEngine commits to main; will be deduped at merge.
 */
export const SFCResultSchema = z.object({
  vc_m_min: z.number().min(0).describe("Cutting velocity (m/min)"),
  fz_mm_tooth: z.number().min(0).describe("Feed per tooth (mm/tooth)"),
  ap_mm: z.number().min(0).describe("Axial depth of cut (mm)"),
  ae_mm: z.number().min(0).describe("Radial depth of cut / step-over (mm)"),
  rpm: z.number().min(0).describe("Spindle speed (RPM) — derived from vc + tool diameter"),
  feed_mm_min: z.number().min(0).describe("Table feed (mm/min) — derived from fz × rpm × z"),
  tool_diameter_mm: z.number().min(0),
  tool_teeth: z.number().int().min(1),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  confidence: z.number().min(0).max(1).optional(),
});
export type SFCResult = z.infer<typeof SFCResultSchema>;

// ============================================================================
// 1. sfcMastercamBridge — Mastercam Dynamic Motion cycle params
// ============================================================================

/**
 * Mastercam Dynamic Milling / Dynamic Motion cycle params. Mastercam's
 * Dynamic Mill (and 2D HighSpeed) takes spindle + feedrate plus stepover as
 * a percentage of tool diameter and step-depth in absolute mm. Dynamic Motion
 * also requires an explicit plunge feedrate — convention is 50% of the cutting
 * feed for high-speed strategies (steeper than hyperMILL's 30%, the trochoidal
 * entry sustains tool engagement so a faster plunge is safe).
 *
 * Source:
 *   - Mastercam X-series Dynamic Mill operations manual §5.2
 *   - JM-Die's 45 extracted Mastercam tribal tips (resources/MasterCam/)
 */
export const MastercamCycleParamsSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  source: z.literal("sfc_mastercam_bridge"),
  spindle_rpm: z.number().min(0),
  feed_rate_mm_min: z.number().min(0),
  plunge_feed_mm_min: z.number().min(0),
  stepover_pct: z.number().min(0).max(100),
  step_depth_mm: z.number().min(0),
  cycle_strategy: z.string(),
});
export type MastercamCycleParams = z.infer<typeof MastercamCycleParamsSchema>;

function sfcMastercamBridge(
  sfc: SFCResult,
  opts?: { cycle_strategy?: string; plunge_factor?: number },
): MastercamCycleParams {
  SFCResultSchema.parse(sfc);
  // Mastercam Dynamic-Mill convention: plunge feed ≈ 50% of milling feed
  // (Mastercam X-Series help, Dynamic Motion §5.2 — steeper than hyperMILL
  // because Dynamic Motion uses the trochoidal entry, not a helical ramp).
  const plungeFactor = opts?.plunge_factor ?? 0.5;
  return {
    schemaVersion: "1.0.0",
    source: "sfc_mastercam_bridge",
    spindle_rpm: sfc.rpm,
    feed_rate_mm_min: sfc.feed_mm_min,
    plunge_feed_mm_min: sfc.feed_mm_min * plungeFactor,
    stepover_pct:
      sfc.tool_diameter_mm > 0
        ? Math.min(100, (sfc.ae_mm / sfc.tool_diameter_mm) * 100)
        : 0,
    step_depth_mm: sfc.ap_mm,
    cycle_strategy: opts?.cycle_strategy ?? "Dynamic Mill",
  };
}

// ============================================================================
// 2. sfcEspritBridge — Esprit ProfitMilling cycle params
// ============================================================================

/**
 * Esprit ProfitMilling adaptive cycle params. Esprit's ProfitMilling expects
 * absolute mm units for both radial stepover and axial stepdown (no percent
 * conversion), and exposes spindle / cutting-feed / lead-in-feed independently.
 * Lead-in feed defaults to 60% of cutting feed per Esprit's "MachineSmart"
 * methodology (their high-speed adaptive convention — gentler entry than
 * Mastercam Dynamic because ProfitMilling's spiral entry sustains engagement
 * longer).
 *
 * Source:
 *   - Esprit 2022 ProfitMilling Operations Reference
 *   - EspritConnect parameter set (cam_esprit_apply_sf action contract)
 */
export const EspritCycleParamsSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  source: z.literal("sfc_esprit_bridge"),
  spindle_speed_rpm: z.number().min(0),
  cutting_feed_mm_min: z.number().min(0),
  lead_in_feed_mm_min: z.number().min(0),
  radial_stepover_mm: z.number().min(0),
  axial_stepdown_mm: z.number().min(0),
  cycle_strategy: z.string(),
});
export type EspritCycleParams = z.infer<typeof EspritCycleParamsSchema>;

function sfcEspritBridge(
  sfc: SFCResult,
  opts?: { cycle_strategy?: string; lead_in_factor?: number },
): EspritCycleParams {
  SFCResultSchema.parse(sfc);
  // Esprit ProfitMilling convention: lead-in feed ≈ 60% of cutting feed.
  const leadInFactor = opts?.lead_in_factor ?? 0.6;
  return {
    schemaVersion: "1.0.0",
    source: "sfc_esprit_bridge",
    spindle_speed_rpm: sfc.rpm,
    cutting_feed_mm_min: sfc.feed_mm_min,
    lead_in_feed_mm_min: sfc.feed_mm_min * leadInFactor,
    radial_stepover_mm: sfc.ae_mm,
    axial_stepdown_mm: sfc.ap_mm,
    cycle_strategy: opts?.cycle_strategy ?? "ProfitMilling",
  };
}

// ============================================================================
// CLASS WRAPPER (project rule: engines as classes with static methods)
// ============================================================================

class KiloCamSfcBridgesEngine {
  static sfcMastercamBridge = sfcMastercamBridge;
  static sfcEspritBridge = sfcEspritBridge;
}

export const kiloCamSfcBridgesEngine = KiloCamSfcBridgesEngine;
