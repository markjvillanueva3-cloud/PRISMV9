/**
 * SfcInventorHsmApplyEngine — SFC → Inventor HSM toolpath override DTO bridge.
 * =============================================================================
 *
 * Closes BRIDGE-DEEP/U-BRIDGE-SFC-INVENTORHSM (mirror of SfcFusionApplyEngine
 * pattern, slot:echo 2026-05-24). Composes the SFC orchestrator chain so a
 * caller can go from `SFNativeRequest` → Inventor HSM toolpath parameter
 * overrides in one MCP round-trip.
 *
 * Architectural delta vs Fusion / hyperMILL:
 *   • Inventor HSM shares its post-processor pipeline with Fusion 360 (both
 *     Autodesk HSM products), but uses a distinct CAM workspace + macro
 *     parameter vocabulary. Live toolpath mutation is operator-driven via
 *     Inventor's API; this bridge stays operator-gated for the same safety
 *     reason as the Fusion bridge.
 *   • Inventor HSM parameter names use Inventor's CAM macro vocabulary —
 *     spindle (rpm), feedrate (mm/min), feedplunge, stepover (radial),
 *     stepdown (axial), coolant enum distinct from Fusion's.
 *
 * Composition chain:
 *   1) CAMSpeedFeedBridgeEngine.compute({target:'inventor_hsm', native_request})
 *      → SFBridgeResponse with orchestrator_result (spindle_rpm,
 *        feed_rate_mmmin, feed_per_tooth_mm, cutting_speed_mpm).
 *   2) Map orchestrator_result → InventorHsmToolpathOverride.
 *   3) Wrap in operator-gated DTO (requires_operator_approval=true,
 *      auto_executed=false — identical safety contract).
 *
 * Pure composition + pure mapping. No new physics. No I/O. No live network.
 *
 * @module engines/SfcInventorHsmApplyEngine
 * @milestone BRIDGE-DEEP/U-BRIDGE-SFC-INVENTORHSM
 */

import { z } from "zod";
import {
  SFNativeRequestSchema,
  CAMSpeedFeedBridgeEngine,
  type SFBridgeResponse,
  type SpeedFeedComputeFn,
} from "./CAMSpeedFeedBridgeEngine.js";

// ── Schemas ─────────────────────────────────────────────────────────────────

/**
 * Inventor HSM coolant enum (matches Inventor's CAM coolant dropdown).
 * Distinct from Fusion's ('flood' present in both; 'tap' / 'thru' Inventor-specific).
 */
export const InventorHsmCoolantSchema = z.enum([
  "off",
  "flood",
  "mist",
  "air",
  "thru",        // through-tool (Inventor HSM canonical name; Fusion calls it 'tool')
  "tap",         // through-tap (Inventor-specific)
  "external",    // external nozzle
]);
export type InventorHsmCoolant = z.infer<typeof InventorHsmCoolantSchema>;

/**
 * Inventor-canonical toolpath param overrides the caller may layer over the
 * SFC-derived ones. Maps 1:1 to Inventor HSM macro parameter names.
 */
export const InventorHsmExtraOverrideSchema = z
  .object({
    feedplunge_mmpm: z.number().positive().optional(),
    feedlead_mmpm: z.number().positive().optional(),       // lead-in + lead-out unified
    feedramp_mmpm: z.number().positive().optional(),
    stepover_mm: z.number().positive().optional(),         // radial WOC
    stepdown_mm: z.number().positive().optional(),         // axial DOC
    rampType: z
      .enum(["plunge", "ramp", "helix", "predrilled", "smoothprofile"])
      .optional(),
    rampAngle_deg: z.number().min(0).max(90).optional(),
    coolant: InventorHsmCoolantSchema.optional(),
    spindleDirection: z.enum(["clockwise", "counterclockwise"]).optional(),
    chipLoad_mm: z.number().positive().optional(),
  })
  .strict();
export type InventorHsmExtraOverride = z.infer<typeof InventorHsmExtraOverrideSchema>;

export const SfcInventorHsmApplyRequestSchema = z
  .object({
    native_request: SFNativeRequestSchema,
    /** Reserved for future live-bridge work; identical to live today (no auto-push). */
    dry_run: z.boolean().optional().default(false),
    extra_toolpath_overrides: InventorHsmExtraOverrideSchema.optional(),
  })
  .strict();
export type SfcInventorHsmApplyRequest = z.infer<typeof SfcInventorHsmApplyRequestSchema>;

/** Inventor HSM-canonical override DTO (SFC-derived + caller-supplied). */
export interface InventorHsmToolpathOverride {
  spindle_rpm?: number;
  feedrate_mmpm?: number;
  feedPerTooth_mm?: number;
  surfaceSpeed_mpm?: number;
  feedplunge_mmpm?: number;
  feedlead_mmpm?: number;
  feedramp_mmpm?: number;
  stepover_mm?: number;
  stepdown_mm?: number;
  rampType?: InventorHsmExtraOverride["rampType"];
  rampAngle_deg?: number;
  coolant?: InventorHsmCoolant;
  spindleDirection?: "clockwise" | "counterclockwise";
  chipLoad_mm?: number;
}

export interface SfcInventorHsmApplyResponse {
  operation_id: string;
  bridge: SFBridgeResponse;
  /** Inventor HSM-canonical override DTO (operator applies it). */
  overrides: InventorHsmToolpathOverride;
  status: "ok" | "dry_run" | "bridge_error";
  message: string;
  /** ALWAYS true — operator-in-the-loop is unconditional, per PSN invariant. */
  requires_operator_approval: true;
  /** ALWAYS false — no live toolpath-mutate auto-push from this bridge. */
  auto_executed: false;
  /** Inline gate explanation surfaced to operator UI. */
  gate_reason: string;
}

// ── Mapping ─────────────────────────────────────────────────────────────────

/**
 * Map an OrchestratorResult onto the Inventor HSM-canonical override subset
 * that SFC owns. Defensive against NaN/Infinity/negative — any malformed
 * numeric is dropped (operator-grade output, never silent garbage).
 */
function mapSfcToInventorHsmOverrides(
  orchestrator_result: Record<string, unknown> | null,
): InventorHsmToolpathOverride {
  if (!orchestrator_result) return {};
  const out: InventorHsmToolpathOverride = {};

  const rpm = orchestrator_result["spindle_rpm"];
  if (typeof rpm === "number" && Number.isFinite(rpm) && rpm > 0) {
    out.spindle_rpm = rpm;
  }
  const feed = orchestrator_result["feed_rate_mmmin"];
  if (typeof feed === "number" && Number.isFinite(feed) && feed > 0) {
    out.feedrate_mmpm = feed;
  }
  const fz = orchestrator_result["feed_per_tooth_mm"];
  if (typeof fz === "number" && Number.isFinite(fz) && fz > 0) {
    out.feedPerTooth_mm = fz;
  }
  const vc = orchestrator_result["cutting_speed_mpm"];
  if (typeof vc === "number" && Number.isFinite(vc) && vc > 0) {
    out.surfaceSpeed_mpm = vc;
  }
  return out;
}

// ── Engine ──────────────────────────────────────────────────────────────────

const BASE_GATE =
  "Operator must verify SFC-derived spindle + feed values against tool/material/machine " +
  "envelope before applying to the Inventor HSM toolpath. PRISM never auto-pushes to Inventor HSM.";

export class SfcInventorHsmApplyEngine {
  /**
   * Run SFC → Inventor HSM-canonical override DTO. Operator-gated by construction.
   *
   * @param req           Caller request (operation id lives inside native_request.operation_id).
   * @param bridgeCompute Optional DI seam — defaults to canonical SpeedFeedOrchestrator.
   */
  static applyToInventorHsm(
    req: SfcInventorHsmApplyRequest,
    bridgeCompute?: SpeedFeedComputeFn,
  ): SfcInventorHsmApplyResponse {
    const parsed = SfcInventorHsmApplyRequestSchema.parse(req);
    const operation_id = parsed.native_request.operation_id;

    const bridge = CAMSpeedFeedBridgeEngine.compute(
      {
        target: "inventor_hsm",
        native_request: parsed.native_request,
      },
      bridgeCompute,
    );

    // Caller extras flow through regardless of bridge status (operator-supplied).
    const callerExtras = parsed.extra_toolpath_overrides ?? {};

    if (bridge.status !== "ok") {
      return {
        operation_id,
        bridge,
        overrides: { ...callerExtras },
        status: "bridge_error",
        message: `Bridge failed: ${bridge.error ?? "unknown"} (caller extras preserved)`,
        requires_operator_approval: true,
        auto_executed: false,
        gate_reason: BASE_GATE + " (no SFC overrides — bridge errored; caller extras preserved)",
      };
    }

    const sfcMapped = mapSfcToInventorHsmOverrides(bridge.orchestrator_result);
    const overrides: InventorHsmToolpathOverride = {
      ...sfcMapped,
      ...callerExtras,
    };

    const status: SfcInventorHsmApplyResponse["status"] = parsed.dry_run
      ? "dry_run"
      : "ok";

    const overrideCount = Object.keys(overrides).length;
    const message = parsed.dry_run
      ? `Dry run — ${overrideCount} Inventor HSM override(s) computed, no apply step.`
      : `Computed ${overrideCount} Inventor HSM toolpath override(s) for operation ${operation_id} — operator must apply.`;

    return {
      operation_id,
      bridge,
      overrides,
      status,
      message,
      requires_operator_approval: true,
      auto_executed: false,
      gate_reason:
        BASE_GATE + ` (${overrideCount} field(s) ready for operator review)`,
    };
  }

  /** Pure helper exposed for tests + future composition. */
  static mapSfcResultToInventorHsmOverrides(
    orchestrator_result: Record<string, unknown> | null,
  ): InventorHsmToolpathOverride {
    return mapSfcToInventorHsmOverrides(orchestrator_result);
  }
}

export const sfcInventorHsmApplyEngine = SfcInventorHsmApplyEngine;
