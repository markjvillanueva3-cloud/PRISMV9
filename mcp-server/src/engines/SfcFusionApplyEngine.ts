/**
 * SfcFusionApplyEngine — SFC → Fusion 360 toolpath override DTO bridge.
 * =============================================================================
 *
 * Closes BRIDGE-DEEP/U-BRIDGE-SFC-FUSION (mirror of SfcEspritApplyEngine /
 * U-BRIDGE-SFC-ESPRIT). Composes the same orchestrator chain so a caller can
 * go from `SFNativeRequest` → Fusion 360 toolpath parameter overrides in one
 * MCP round-trip.
 *
 * Architectural delta vs Esprit:
 *   • Esprit exposes a live HTTP push API (EspritCAMBridgeEngine.pushParameters).
 *   • Fusion 360's automation surface (Fusion360LiveBridgeEngine) is CAD-side
 *     only — sketch/extrude/fillet, NOT toolpath parameter mutation. Fusion's
 *     toolpath params are owned by the in-app CAM workspace + the post-processor
 *     pipeline at G-code emit time.
 *   • Therefore this engine emits a *structured override DTO* the operator
 *     (or the Fusion post pipeline / FusionPostSyncEngine) applies — the bridge
 *     is operator-gated by construction; there is no live auto-push path.
 *
 * Composition chain:
 *   1) CAMSpeedFeedBridgeEngine.compute({target:'fusion360', native_request})
 *      runs SpeedFeedOrchestratorEngine.compute() and returns an
 *      SFBridgeResponse whose `orchestrator_result` carries spindle_rpm,
 *      feed_rate_mmmin, feed_per_tooth_mm, cutting_speed_mpm.
 *   2) Map orchestrator_result → FusionToolpathOverride (Fusion-canonical
 *      param names — spindleSpeed, cuttingFeedrate, etc.).
 *   3) Wrap in operator-gated DTO (requires_operator_approval=true,
 *      auto_executed=false, identical invariants to CadCamHandoffEngine).
 *
 * Pure composition + pure mapping. No new physics. No I/O. No live network.
 *
 * @module engines/SfcFusionApplyEngine
 * @milestone BRIDGE-DEEP/U-BRIDGE-SFC-FUSION
 */

import { z } from "zod";
import {
  SFNativeRequestSchema,
  CAMSpeedFeedBridgeEngine,
  type SFBridgeResponse,
  type SpeedFeedComputeFn,
} from "./CAMSpeedFeedBridgeEngine.js";

// ── Schemas ─────────────────────────────────────────────────────────────────

/** Fusion 360 coolant enum (matches Fusion's toolpath coolant dropdown). */
export const FusionCoolantSchema = z.enum([
  "off",
  "flood",
  "mist",
  "tool",
  "air",
  "air_through_tool",
  "tool_mist",
  "flood_mist",
  "flood_and_through_tool",
]);
export type FusionCoolant = z.infer<typeof FusionCoolantSchema>;

/**
 * Fusion-canonical toolpath param overrides the caller may layer over the
 * SFC-derived ones. These map 1:1 to Fusion's toolpath parameter names
 * (spindleSpeed, cuttingFeedrate, etc. — exactly what the post `getParameter()`
 * call reads). All optional + strict so an unknown key throws loudly.
 */
export const FusionExtraToolpathOverrideSchema = z
  .object({
    plungeFeedrate_mmpm: z.number().positive().optional(),
    leadInFeedrate_mmpm: z.number().positive().optional(),
    leadOutFeedrate_mmpm: z.number().positive().optional(),
    rampFeedrate_mmpm: z.number().positive().optional(),
    rampingType: z
      .enum(["plunge", "predrilled", "back_and_forth", "ramp", "helix", "smooth_profile"])
      .optional(),
    rampingAngle_deg: z.number().min(0).max(90).optional(),
    stepover_mm: z.number().positive().optional(),
    maximumStepdown_mm: z.number().positive().optional(),
    coolant: FusionCoolantSchema.optional(),
    spindleDirection: z.enum(["clockwise", "counterclockwise"]).optional(),
    chipLoad_mm: z.number().positive().optional(),
  })
  .strict();
export type FusionExtraToolpathOverride = z.infer<typeof FusionExtraToolpathOverrideSchema>;

export const SfcFusionApplyRequestSchema = z
  .object({
    native_request: SFNativeRequestSchema,
    /** Reserved for future live-bridge work; currently identical to live (no live API exists). */
    dry_run: z.boolean().optional().default(false),
    /** Operation-strategy-level params the SFC doesn't compute. */
    extra_toolpath_overrides: FusionExtraToolpathOverrideSchema.optional(),
  })
  .strict();
export type SfcFusionApplyRequest = z.infer<typeof SfcFusionApplyRequestSchema>;

/** Fusion-canonical overrides (SFC-derived + caller-supplied). */
export interface FusionToolpathOverride {
  spindleSpeed_rpm?: number;
  cuttingFeedrate_mmpm?: number;
  feedPerTooth_mm?: number;
  surfaceSpeed_mpm?: number;
  plungeFeedrate_mmpm?: number;
  leadInFeedrate_mmpm?: number;
  leadOutFeedrate_mmpm?: number;
  rampFeedrate_mmpm?: number;
  rampingType?: FusionExtraToolpathOverride["rampingType"];
  rampingAngle_deg?: number;
  stepover_mm?: number;
  maximumStepdown_mm?: number;
  coolant?: FusionCoolant;
  spindleDirection?: "clockwise" | "counterclockwise";
  chipLoad_mm?: number;
}

export interface SfcFusionApplyResponse {
  operation_id: string;
  bridge: SFBridgeResponse;
  /** Fusion-canonical override DTO (operator applies it; never auto-pushed). */
  overrides: FusionToolpathOverride;
  status: "ok" | "dry_run" | "bridge_error";
  message: string;
  /** ALWAYS true — operator-in-the-loop is unconditional, per PSN invariant. */
  requires_operator_approval: true;
  /** ALWAYS false — Fusion has no live toolpath-mutate API; cannot auto-execute. */
  auto_executed: false;
  /** Inline gate explanation surfaced to the operator UI. */
  gate_reason: string;
}

// ── Mapping ─────────────────────────────────────────────────────────────────

/**
 * Map an OrchestratorResult onto the Fusion-canonical toolpath override
 * subset that SFC owns. Defensive against NaN/Infinity/negative values — any
 * malformed numeric is dropped (operator-grade output, never silent garbage).
 */
function mapSfcToFusionOverrides(
  orchestrator_result: Record<string, unknown> | null,
): FusionToolpathOverride {
  if (!orchestrator_result) return {};
  const out: FusionToolpathOverride = {};

  const rpm = orchestrator_result["spindle_rpm"];
  if (typeof rpm === "number" && Number.isFinite(rpm) && rpm > 0) {
    out.spindleSpeed_rpm = rpm;
  }
  const feed = orchestrator_result["feed_rate_mmmin"];
  if (typeof feed === "number" && Number.isFinite(feed) && feed > 0) {
    out.cuttingFeedrate_mmpm = feed;
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
  "envelope before applying to the Fusion 360 toolpath. PRISM never auto-pushes to Fusion.";

export class SfcFusionApplyEngine {
  /**
   * Run SFC → Fusion-canonical override DTO. Operator-gated by construction
   * (Fusion has no live toolpath-mutate API; the DTO is the deliverable).
   *
   * @param req         Caller request (operation id lives inside native_request.operation_id).
   * @param bridgeCompute Optional DI seam — defaults to the canonical SpeedFeedOrchestrator.
   */
  static applyToFusion(
    req: SfcFusionApplyRequest,
    bridgeCompute?: SpeedFeedComputeFn,
  ): SfcFusionApplyResponse {
    const parsed = SfcFusionApplyRequestSchema.parse(req);
    const operation_id = parsed.native_request.operation_id;

    const bridge = CAMSpeedFeedBridgeEngine.compute(
      {
        target: "fusion360",
        native_request: parsed.native_request,
      },
      bridgeCompute,
    );

    // Caller-supplied extras flow through regardless of bridge status —
    // they are operator-supplied, not SFC-derived. Even when the bridge errors
    // the operator's stepover / coolant / ramping choices remain valid.
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

    const sfcMapped = mapSfcToFusionOverrides(bridge.orchestrator_result);
    const overrides: FusionToolpathOverride = {
      ...sfcMapped,
      ...callerExtras,
    };

    const status: SfcFusionApplyResponse["status"] = parsed.dry_run
      ? "dry_run"
      : "ok";

    const overrideCount = Object.keys(overrides).length;
    const message = parsed.dry_run
      ? `Dry run — ${overrideCount} Fusion override(s) computed, no apply step.`
      : `Computed ${overrideCount} Fusion toolpath override(s) for operation ${operation_id} — operator must apply.`;

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
  static mapSfcResultToFusionOverrides(
    orchestrator_result: Record<string, unknown> | null,
  ): FusionToolpathOverride {
    return mapSfcToFusionOverrides(orchestrator_result);
  }
}

export const sfcFusionApplyEngine = SfcFusionApplyEngine;
