/**
 * SfcHyperMillApplyEngine — SFC → hyperMILL macro-parameter override DTO.
 * =============================================================================
 *
 * Closes BRIDGE-DEEP/U-BRIDGE-SFC-HYPERMILL (mirror of SfcFusionApplyEngine
 * pattern, slot:echo 2026-05-24). Composes the SFC orchestrator chain so a
 * caller can go from `SFNativeRequest` → hyperMILL macro parameter overrides
 * in one MCP round-trip.
 *
 * Architectural delta vs Fusion 360:
 *   • Fusion 360 has no live toolpath-mutate API — overrides flow through
 *     the post-processor or Fusion Setup Sheet.
 *   • hyperMILL exposes a macro-API surface (HyperMILLMacroAPIEngine) which
 *     CAN apply parameter sets, BUT the live-push path stays operator-gated
 *     by construction (the API requires explicit operator confirmation per
 *     hyperMILL's UX contract). This engine emits the override DTO; live push
 *     is a SEPARATE concern owned by HyperMILLMacroAPIEngine.
 *   • hyperMILL parameter names differ from Fusion's: nSpindle (rpm),
 *     feedRate (mm/min), feedPlunge, feedRamp, zStepover (axial DOC),
 *     stepover (radial DOC), coolingMode (hyperMILL coolant enum).
 *
 * Composition chain:
 *   1) CAMSpeedFeedBridgeEngine.compute({target:'hypermill', native_request})
 *      → SFBridgeResponse with orchestrator_result (spindle_rpm,
 *        feed_rate_mmmin, feed_per_tooth_mm, cutting_speed_mpm).
 *   2) Map orchestrator_result → HyperMillMacroOverride (hyperMILL-canonical
 *      param names).
 *   3) Wrap in operator-gated DTO (requires_operator_approval=true,
 *      auto_executed=false — identical safety contract to Fusion bridge).
 *
 * Pure composition + pure mapping. No new physics. No I/O. No live network.
 *
 * @module engines/SfcHyperMillApplyEngine
 * @milestone BRIDGE-DEEP/U-BRIDGE-SFC-HYPERMILL
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
 * hyperMILL coolant enum (matches HyperMILL macro `coolingMode` parameter).
 * Distinct vocabulary from Fusion's coolant ('flood' vs 'em' for emulsion etc).
 */
export const HyperMillCoolantSchema = z.enum([
  "off",
  "em",            // emulsion (hyperMILL canonical for flood)
  "mql",           // minimum-quantity lubrication
  "air",
  "internal",      // through-tool / internal-coolant
  "external",      // external nozzle (no flood)
  "cryo",          // cryogenic (CO2/LN2)
]);
export type HyperMillCoolant = z.infer<typeof HyperMillCoolantSchema>;

/**
 * hyperMILL-canonical macro-parameter overrides the caller may layer over
 * the SFC-derived ones. Maps 1:1 to hyperMILL macro parameter names —
 * exactly what `HyperMILLMacroAPIEngine.setParameters()` expects.
 */
export const HyperMillExtraMacroOverrideSchema = z
  .object({
    feedPlunge_mmpm: z.number().positive().optional(),
    feedRamp_mmpm: z.number().positive().optional(),
    feedLeadIn_mmpm: z.number().positive().optional(),
    feedLeadOut_mmpm: z.number().positive().optional(),
    zStepover_mm: z.number().positive().optional(),    // axial DOC
    stepover_mm: z.number().positive().optional(),     // radial WOC
    rampingMode: z
      .enum(["plunge", "ramp", "helical", "predrilled", "smooth"])
      .optional(),
    rampingAngle_deg: z.number().min(0).max(90).optional(),
    coolingMode: HyperMillCoolantSchema.optional(),
    spindleDirection: z.enum(["cw", "ccw"]).optional(),
    chipLoad_mm: z.number().positive().optional(),
  })
  .strict();
export type HyperMillExtraMacroOverride = z.infer<
  typeof HyperMillExtraMacroOverrideSchema
>;

export const SfcHyperMillApplyRequestSchema = z
  .object({
    native_request: SFNativeRequestSchema,
    /** Reserved for future live-bridge work; identical to live today (no auto-push). */
    dry_run: z.boolean().optional().default(false),
    extra_macro_overrides: HyperMillExtraMacroOverrideSchema.optional(),
  })
  .strict();
export type SfcHyperMillApplyRequest = z.infer<
  typeof SfcHyperMillApplyRequestSchema
>;

/** hyperMILL-canonical override DTO (SFC-derived + caller-supplied). */
export interface HyperMillMacroOverride {
  nSpindle_rpm?: number;
  feedRate_mmpm?: number;
  feedPerTooth_mm?: number;
  vc_mpm?: number;
  feedPlunge_mmpm?: number;
  feedRamp_mmpm?: number;
  feedLeadIn_mmpm?: number;
  feedLeadOut_mmpm?: number;
  zStepover_mm?: number;
  stepover_mm?: number;
  rampingMode?: HyperMillExtraMacroOverride["rampingMode"];
  rampingAngle_deg?: number;
  coolingMode?: HyperMillCoolant;
  spindleDirection?: "cw" | "ccw";
  chipLoad_mm?: number;
}

export interface SfcHyperMillApplyResponse {
  operation_id: string;
  bridge: SFBridgeResponse;
  /** hyperMILL-canonical macro override DTO (operator applies it). */
  overrides: HyperMillMacroOverride;
  status: "ok" | "dry_run" | "bridge_error";
  message: string;
  /** ALWAYS true — operator-in-the-loop is unconditional, per PSN invariant. */
  requires_operator_approval: true;
  /** ALWAYS false — bridge never auto-pushes (live push owned downstream). */
  auto_executed: false;
  /** Inline gate explanation surfaced to operator UI. */
  gate_reason: string;
}

// ── Mapping ─────────────────────────────────────────────────────────────────

/**
 * Map an OrchestratorResult onto the hyperMILL-canonical macro override
 * subset that SFC owns. Defensive against NaN/Infinity/negative — any
 * malformed numeric is dropped (operator-grade output, never silent garbage).
 */
function mapSfcToHyperMillOverrides(
  orchestrator_result: Record<string, unknown> | null,
): HyperMillMacroOverride {
  if (!orchestrator_result) return {};
  const out: HyperMillMacroOverride = {};

  const rpm = orchestrator_result["spindle_rpm"];
  if (typeof rpm === "number" && Number.isFinite(rpm) && rpm > 0) {
    out.nSpindle_rpm = rpm;
  }
  const feed = orchestrator_result["feed_rate_mmmin"];
  if (typeof feed === "number" && Number.isFinite(feed) && feed > 0) {
    out.feedRate_mmpm = feed;
  }
  const fz = orchestrator_result["feed_per_tooth_mm"];
  if (typeof fz === "number" && Number.isFinite(fz) && fz > 0) {
    out.feedPerTooth_mm = fz;
  }
  const vc = orchestrator_result["cutting_speed_mpm"];
  if (typeof vc === "number" && Number.isFinite(vc) && vc > 0) {
    out.vc_mpm = vc;
  }
  return out;
}

// ── Engine ──────────────────────────────────────────────────────────────────

const BASE_GATE =
  "Operator must verify SFC-derived spindle + feed values against tool/material/machine " +
  "envelope before applying to the hyperMILL macro. PRISM never auto-pushes to hyperMILL " +
  "(live push owned by HyperMILLMacroAPIEngine under separate operator gate).";

export class SfcHyperMillApplyEngine {
  /**
   * Run SFC → hyperMILL macro override DTO. Operator-gated by construction.
   *
   * @param req           Caller request (operation id lives inside native_request.operation_id).
   * @param bridgeCompute Optional DI seam — defaults to canonical SpeedFeedOrchestrator.
   */
  static applyToHyperMill(
    req: SfcHyperMillApplyRequest,
    bridgeCompute?: SpeedFeedComputeFn,
  ): SfcHyperMillApplyResponse {
    const parsed = SfcHyperMillApplyRequestSchema.parse(req);
    const operation_id = parsed.native_request.operation_id;

    const bridge = CAMSpeedFeedBridgeEngine.compute(
      {
        target: "hypermill",
        native_request: parsed.native_request,
      },
      bridgeCompute,
    );

    // Caller extras flow through regardless of bridge status — operator-supplied,
    // not SFC-derived (matches SfcFusion contract for symmetry).
    const callerExtras = parsed.extra_macro_overrides ?? {};

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

    const sfcMapped = mapSfcToHyperMillOverrides(bridge.orchestrator_result);
    const overrides: HyperMillMacroOverride = {
      ...sfcMapped,
      ...callerExtras,
    };

    const status: SfcHyperMillApplyResponse["status"] = parsed.dry_run
      ? "dry_run"
      : "ok";

    const overrideCount = Object.keys(overrides).length;
    const message = parsed.dry_run
      ? `Dry run — ${overrideCount} hyperMILL macro override(s) computed, no apply step.`
      : `Computed ${overrideCount} hyperMILL macro override(s) for operation ${operation_id} — operator must apply.`;

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
  static mapSfcResultToHyperMillOverrides(
    orchestrator_result: Record<string, unknown> | null,
  ): HyperMillMacroOverride {
    return mapSfcToHyperMillOverrides(orchestrator_result);
  }
}

export const sfcHyperMillApplyEngine = SfcHyperMillApplyEngine;
