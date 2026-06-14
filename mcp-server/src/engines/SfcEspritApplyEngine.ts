/**
 * SfcEspritApplyEngine — End-to-end SFC orchestrator → Esprit live push composition.
 * =================================================================================
 *
 * Closes BRIDGE-DEEP/U-BRIDGE-SFC-ESPRIT. Composes 3 already-built engines into
 * a single dispatcher action so a caller can go from `SFNativeRequest` → live
 * Esprit operation parameter update in one MCP round-trip.
 *
 * Composition chain:
 *   1) CAMSpeedFeedBridgeEngine.compute({target:'esprit', native_request})
 *      runs SpeedFeedOrchestratorEngine.compute() under the hood and returns
 *      an SFBridgeResponse whose `orchestrator_result` carries spindle_rpm,
 *      feed_rate_mmmin, feed_per_tooth_mm, cutting_speed_mpm.
 *   2) If dryRun: stop here, return the bridge response (no live network call).
 *   3) Otherwise: EspritCAMBridgeEngine.connect() → pushParameters(operation_id,
 *      mapped machining_params) → return the combined result.
 *
 * The mapping SFC → Esprit `machining_params` is intentionally minimal:
 *   spindle_rpm     → rpm
 *   feed_rate_mmmin → feed_mmpm
 * The other Esprit machining_params fields (plunge_feed, stepover, stepdown,
 * approach/retract, clearance, safety_height) are NOT derived from SFC — they
 * are operation-strategy-level and stay caller-controlled (passed via the
 * optional `extra_machining_params` field on the request).
 *
 * Pure composition. No new physics. No new I/O — the Esprit network call lives
 * inside EspritCAMBridgeEngine where it already did.
 *
 * @module engines/SfcEspritApplyEngine
 * @milestone BRIDGE-DEEP/U-BRIDGE-SFC-ESPRIT
 */

import { z } from "zod";
import { SFNativeRequestSchema, CAMSpeedFeedBridgeEngine, type SFBridgeResponse, type SpeedFeedComputeFn } from "./CAMSpeedFeedBridgeEngine.js";
import type { EspritOperation, EspritPushResult, EspritCAMBridgeEngine } from "./EspritCAMBridgeEngine.js";

// ── Schemas ─────────────────────────────────────────────────────────────────

/** Esprit machining_params subset the caller may override on top of SFC output. */
export const EspritExtraMachiningParamsSchema = z
  .object({
    plunge_feed_mmpm: z.number().positive().optional(),
    stepover_mm: z.number().positive().optional(),
    stepdown_mm: z.number().positive().optional(),
    axial_doc_mm: z.number().positive().optional(),
    radial_doc_mm: z.number().positive().optional(),
    approach_type: z.string().min(1).optional(),
    retract_type: z.string().min(1).optional(),
    clearance_plane_mm: z.number().optional(),
    safety_height_mm: z.number().optional(),
  })
  .strict();
export type EspritExtraMachiningParams = z.infer<typeof EspritExtraMachiningParamsSchema>;

export const SfcEspritApplyRequestSchema = z
  .object({
    native_request: SFNativeRequestSchema,
    /** When true, skips the live Esprit network call — returns the bridge result only. */
    dry_run: z.boolean().optional().default(false),
    /** Optional Esprit host/port — defaults match EspritCAMBridgeEngine.connect(). */
    host: z.string().min(1).optional(),
    port: z.number().int().positive().optional(),
    /** Operation-strategy-level params the SFC doesn't compute. */
    extra_machining_params: EspritExtraMachiningParamsSchema.optional(),
  })
  .strict();
export type SfcEspritApplyRequest = z.infer<typeof SfcEspritApplyRequestSchema>;

export interface SfcEspritApplyResponse {
  operation_id: string;
  bridge: SFBridgeResponse;
  /** null when dry_run=true OR when the bridge errored before push. */
  push: EspritPushResult | null;
  status: "ok" | "dry_run" | "bridge_error" | "connect_error" | "push_error";
  message: string;
}

// ── Engine ──────────────────────────────────────────────────────────────────

/** Factory hook so unit tests can inject a stub EspritCAMBridgeEngine instance
 *  (the real engine holds connection state on a private field, so DI is the
 *  only clean way to avoid live HTTP in tests). */
export type EspritBridgeFactory = () => Pick<
  EspritCAMBridgeEngine,
  "connect" | "pushParameters"
>;

let _defaultFactory: EspritBridgeFactory | null = null;
function defaultFactory(): EspritBridgeFactory {
  if (_defaultFactory) return _defaultFactory;
  _defaultFactory = () => {
    // Lazy require avoids an import cycle: EspritCAMBridgeEngine is a heavy
    // network-aware module + this file is consumed by the camDispatcher chain
    // that also touches that engine directly. Module-top `import` would cause
    // the dispatcher's lazy `await import()` of THIS engine to drag the Esprit
    // bridge into the cold-path graph and break test isolation. The
    // eslint-disable below is required by the project's typescript-eslint
    // ruleset which otherwise rejects require() outright.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./EspritCAMBridgeEngine.js") as {
      EspritCAMBridgeEngine: new () => EspritCAMBridgeEngine;
    };
    return new mod.EspritCAMBridgeEngine();
  };
  return _defaultFactory;
}

/** Map an OrchestratorResult onto the Esprit `machining_params` subset that SFC owns. */
function mapSfcToEspritParams(
  orchestrator_result: Record<string, unknown> | null,
): Partial<EspritOperation["machining_params"]> {
  if (!orchestrator_result) return {};
  const out: Partial<EspritOperation["machining_params"]> = {};
  const rpm = orchestrator_result["spindle_rpm"];
  const feed = orchestrator_result["feed_rate_mmmin"];
  if (typeof rpm === "number" && Number.isFinite(rpm) && rpm > 0) out.rpm = rpm;
  if (typeof feed === "number" && Number.isFinite(feed) && feed > 0) out.feed_mmpm = feed;
  return out;
}

export class SfcEspritApplyEngine {
  /**
   * Run SFC → Esprit-encode → live push.
   *
   * @param req       Caller request (operation id lives inside native_request.operation_id)
   * @param factory   Optional DI seam for tests; defaults to a fresh EspritCAMBridgeEngine.
   */
  static async applyToEsprit(
    req: SfcEspritApplyRequest,
    factory?: EspritBridgeFactory,
    bridgeCompute?: SpeedFeedComputeFn,
  ): Promise<SfcEspritApplyResponse> {
    const parsed = SfcEspritApplyRequestSchema.parse(req);
    const operation_id = parsed.native_request.operation_id;

    const bridge = CAMSpeedFeedBridgeEngine.compute(
      {
        target: "esprit",
        native_request: parsed.native_request,
      },
      bridgeCompute,
    );

    if (bridge.status !== "ok") {
      return {
        operation_id,
        bridge,
        push: null,
        status: "bridge_error",
        message: `Bridge failed: ${bridge.error ?? "unknown"}`,
      };
    }

    if (parsed.dry_run) {
      return {
        operation_id,
        bridge,
        push: null,
        status: "dry_run",
        message: "Dry run — bridge computed, live push skipped.",
      };
    }

    const sfcMapped = mapSfcToEspritParams(bridge.orchestrator_result);
    const fullParams: Partial<EspritOperation["machining_params"]> = {
      ...sfcMapped,
      ...(parsed.extra_machining_params ?? {}),
    };

    const espritBridge = (factory ?? defaultFactory())();

    const conn = await espritBridge.connect(parsed.host, parsed.port);
    if (!conn.connected) {
      return {
        operation_id,
        bridge,
        push: null,
        status: "connect_error",
        message: `Esprit connect failed: ${conn.message}`,
      };
    }

    const push = await espritBridge.pushParameters(operation_id, fullParams);
    if (!push.success) {
      return {
        operation_id,
        bridge,
        push,
        status: "push_error",
        message: `Esprit push failed: ${push.message}`,
      };
    }

    return {
      operation_id,
      bridge,
      push,
      status: "ok",
      message: `Applied ${push.parameters_updated} parameter(s) to Esprit operation ${operation_id}` +
        (push.requires_regeneration ? " (regen required)" : ""),
    };
  }

  /** Pure helper exposed for tests + future composition. */
  static mapSfcResultToEspritParams(
    orchestrator_result: Record<string, unknown> | null,
  ): Partial<EspritOperation["machining_params"]> {
    return mapSfcToEspritParams(orchestrator_result);
  }
}

export const sfcEspritApplyEngine = SfcEspritApplyEngine;
