/**
 * CAMSpeedFeedBridgeEngine — Per-CAM Speed/Feed Translation (U-CAM99)
 * ====================================================================
 *
 * PHASE-7: Bridge between the four CAM plugin adapters and the central
 * SpeedFeedOrchestratorEngine (2,851 LOC). Each CAM host uses its own
 * parameter vocabulary — this engine normalizes native requests into
 * OrchestratorInput, runs the computation, then encodes the result back
 * into the host's preferred response format for dispatch over the hub.
 *
 * Translation matrix (common parameters → OrchestratorInput keys):
 *
 *   | CAM host        | tool_dia field     | rpm / Vc field       | fz field         |
 *   |-----------------|--------------------|----------------------|------------------|
 *   | hyperMILL       | toolDiameter       | cuttingSpeedVc       | feedPerTooth_fz  |
 *   | Fusion 360      | toolDiameter       | spindleSpeed         | feedPerTooth     |
 *   | Inventor HSM    | toolDia            | spindleRpm           | feedPerTooth     |
 *   | Mastercam X8    | dia                | rpm / sfm            | fpt              |
 *   | ESPRIT (DP)     | cutterDiameter     | surfaceSpeed (SFM)   | feedPerToothEsp  |
 *   | SolidCAM (SW)   | solidcamDiameter   | spinSpeed (rpm)      | feedZ            |
 *   | generic         | tool_diameter_mm   | spindle_rpm          | feed_per_tooth   |
 *
 * The bridge is intentionally *pure translation + encoding*; the physics is
 * owned by SpeedFeedOrchestratorEngine. The `compute` function is accepted
 * as a parameter (default = real orchestrator) so unit tests can stub it.
 *
 * @module engines/CAMSpeedFeedBridgeEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM99
 */

import { z } from "zod";
import type {
  OrchestratorInput,
  OrchestratorResult,
  AtomicValue,
} from "./SpeedFeedOrchestratorEngine.js";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const SFBridgeTargetSchema = z.enum([
  "hypermill",
  "fusion360",
  "inventor_hsm",
  "mastercam",
  "esprit",
  "solidcam",
  "generic",
]);
export type SFBridgeTarget = z.infer<typeof SFBridgeTargetSchema>;

/** Shared subset of native fields we accept from each host. Extra fields are preserved. */
export const SFNativeRequestSchema = z
  .object({
    // Identity + context
    operation_id: z.string().min(1),
    material: z.string().optional(),
    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),

    // hyperMILL
    toolDiameter: z.number().positive().optional(),
    flutes: z.number().int().positive().optional(),
    cuttingSpeedVc: z.number().positive().optional(),
    feedPerTooth_fz: z.number().positive().optional(),

    // Fusion 360
    spindleSpeed: z.number().positive().optional(),
    feedPerTooth: z.number().positive().optional(),

    // Inventor HSM
    toolDia: z.number().positive().optional(),
    spindleRpm: z.number().positive().optional(),

    // Mastercam X8
    dia: z.number().positive().optional(),
    rpm: z.number().positive().optional(),
    sfm: z.number().positive().optional(),
    fpt: z.number().positive().optional(),

    // ESPRIT (DP Technology) — US-centric CAM; surfaceSpeed is SFM
    cutterDiameter: z.number().positive().optional(),
    surfaceSpeed: z.number().positive().optional(),
    feedPerToothEsp: z.number().positive().optional(),

    // SolidCAM (SolidWorks ecosystem)
    solidcamDiameter: z.number().positive().optional(),
    spinSpeed: z.number().positive().optional(),
    feedZ: z.number().positive().optional(),

    // Generic
    tool_diameter_mm: z.number().positive().optional(),
    spindle_rpm: z.number().positive().optional(),
    feed_per_tooth: z.number().positive().optional(),

    // Common
    axial_depth_mm: z.number().positive().optional(),
    radial_depth_mm: z.number().positive().optional(),
    operation: z
      .enum(["milling", "turning", "drilling", "tapping", "reaming", "boring", "thread_milling"])
      .optional(),
    cut_type: z.enum(["roughing", "semi_finishing", "finishing"]).optional(),
  })
  .passthrough();
export type SFNativeRequest = z.infer<typeof SFNativeRequestSchema>;

export const SFBridgeRequestSchema = z.object({
  target: SFBridgeTargetSchema,
  native_request: SFNativeRequestSchema,
});
export type SFBridgeRequest = z.infer<typeof SFBridgeRequestSchema>;

/** Result shape returned to the caller. `native_payload` is the encoded string
 *  a CAM host can consume directly. */
export const SFBridgeResponseSchema = z.object({
  target: SFBridgeTargetSchema,
  operation_id: z.string(),
  translated_input: z.record(z.string(), z.unknown()),
  orchestrator_result: z.record(z.string(), z.unknown()).nullable(),
  native_payload: z.string(),
  status: z.enum(["ok", "compute_error"]),
  error: z.string().nullable(),
});
export type SFBridgeResponse = z.infer<typeof SFBridgeResponseSchema>;

// ── Translation helpers ──────────────────────────────────────────────────────

function pickFirst<T>(...vals: Array<T | undefined>): T | undefined {
  for (const v of vals) if (v !== undefined) return v;
  return undefined;
}

const SFM_TO_MPM = 0.3048;

function mapSfmToVc(sfm: number | undefined): number | undefined {
  return sfm === undefined ? undefined : sfm * SFM_TO_MPM;
}

/** Normalize a native host payload into OrchestratorInput. */
export function normalizeRequest(
  target: SFBridgeTarget,
  native: SFNativeRequest,
): OrchestratorInput {
  const toolDia = pickFirst(
    native.tool_diameter_mm,
    native.toolDiameter,
    native.toolDia,
    native.dia,
    native.cutterDiameter,
    native.solidcamDiameter,
  );
  const spindle = pickFirst(
    native.spindle_rpm,
    native.spindleSpeed,
    native.spindleRpm,
    native.rpm,
    native.spinSpeed,
  );
  const fz = pickFirst(
    native.feed_per_tooth,
    native.feedPerTooth_fz,
    native.feedPerTooth,
    native.fpt,
    native.feedPerToothEsp,
    native.feedZ,
  );
  // ESPRIT, like Mastercam, expresses cutting speed as SFM (US-centric CAM).
  // hyperMILL's cuttingSpeedVc is already m/min. Convert both SFM sources.
  const vcFromSfm = mapSfmToVc(pickFirst(native.sfm, native.surfaceSpeed));
  const cuttingSpeed = pickFirst(native.cuttingSpeedVc, vcFromSfm);

  const base: OrchestratorInput = {
    material: native.material,
    iso_group: native.iso_group,
    tool_diameter_mm: toolDia,
    flutes: native.flutes,
    axial_depth_mm: native.axial_depth_mm,
    radial_depth_mm: native.radial_depth_mm,
    operation: native.operation,
    cut_type: native.cut_type,
    cam_system: targetToCamSystem(target),
  };

  // When the host provided a spindle RPM or cutting speed, we can't feed RPM
  // directly (OrchestratorInput has no rpm field) — but we can hint via
  // cam_strategy/metadata. Instead, compute fz onto it; cutting speed survives
  // as an informational override. Keep the base input minimal so Orchestrator
  // falls back to its resolver chain.
  if (fz !== undefined) {
    // There's no direct fz input, but flutes + feedRate is derivable later.
    // Leave it to the orchestrator; record the intent in a passthrough field.
    (base as Record<string, unknown>).__fz_override = fz;
  }
  if (cuttingSpeed !== undefined) {
    (base as Record<string, unknown>).__vc_override = cuttingSpeed;
  }
  if (spindle !== undefined) {
    (base as Record<string, unknown>).__rpm_override = spindle;
  }
  return base;
}

function targetToCamSystem(target: SFBridgeTarget): string | undefined {
  switch (target) {
    case "hypermill":
      return "hyperMILL";
    case "fusion360":
      return "Fusion360";
    case "inventor_hsm":
      return "Inventor HSM";
    case "mastercam":
      return "Mastercam";
    case "esprit":
      return "ESPRIT";
    case "solidcam":
      return "SolidCAM";
    case "generic":
    default:
      return undefined;
  }
}

/** Encode an orchestrator result into the host's preferred wire format. */
export function encodeResponse(
  target: SFBridgeTarget,
  operation_id: string,
  result: OrchestratorResult | null,
  error: string | null,
): string {
  if (result === null) {
    return JSON.stringify({
      status: "compute_error",
      operation_id,
      error,
    });
  }
  const payload = {
    operation_id,
    vc_mpm: result.cutting_speed_mpm,
    rpm: result.spindle_rpm,
    fz_mm: result.feed_per_tooth_mm,
    feed_rate_mm_min: result.feed_rate_mmmin,
    ap_mm: result.axial_depth_mm,
    ae_mm: result.radial_depth_mm,
  };
  switch (target) {
    case "hypermill":
      return (
        `<methodCall><methodName>PRISM.SpeedFeedRecommendation</methodName>` +
        `<params>` +
        `<param><value><string>${payload.operation_id}</string></value></param>` +
        `<param><value><double>${payload.vc_mpm.toFixed(2)}</double></value></param>` +
        `<param><value><double>${payload.rpm.toFixed(0)}</double></value></param>` +
        `<param><value><double>${payload.fz_mm.toFixed(4)}</double></value></param>` +
        `<param><value><double>${payload.feed_rate_mm_min.toFixed(1)}</double></value></param>` +
        `</params></methodCall>`
      );
    case "fusion360":
      return JSON.stringify({
        jsonrpc: "2.0",
        method: "cam.speedFeedRecommendation",
        params: payload,
      });
    case "inventor_hsm":
      return JSON.stringify({
        type: "hsm.speedFeedRecommendation",
        ...payload,
      });
    case "mastercam":
      return (
        `SF|${payload.operation_id}|${payload.rpm.toFixed(0)}|` +
        `${payload.feed_rate_mm_min.toFixed(1)}|${payload.fz_mm.toFixed(4)}|` +
        `${payload.vc_mpm.toFixed(2)}`
      );
    case "esprit":
      // ESPRIT KB consumes a pipe-delimited record via its COM automation
      // bridge. Field [5] is the RECOMMENDED surface speed (the orchestrator's
      // computed Vc), converted m/min→SFM for ESPRIT's US-centric UI — it is
      // the recommendation, not an echo of the request's surfaceSpeed.
      return (
        `ESPRIT|${payload.operation_id}|${payload.rpm.toFixed(0)}|` +
        `${payload.feed_rate_mm_min.toFixed(1)}|${payload.fz_mm.toFixed(4)}|` +
        `${(payload.vc_mpm / SFM_TO_MPM).toFixed(1)}`
      );
    case "solidcam":
      // SolidCAM reads a flat JSON tag through its SolidWorks add-in.
      return JSON.stringify({
        type: "solidcam.speedFeed",
        operationId: payload.operation_id,
        spinSpeed: Number(payload.rpm.toFixed(0)),
        feedZ: Number(payload.fz_mm.toFixed(4)),
        feedRate: Number(payload.feed_rate_mm_min.toFixed(1)),
        vc: Number(payload.vc_mpm.toFixed(2)),
      });
    case "generic":
    default:
      return JSON.stringify({ type: "speed_feed_recommendation", ...payload });
  }
}

/** Signature for the speed/feed compute function accepted by the bridge. */
export type SpeedFeedComputeFn = (
  input: OrchestratorInput,
) => AtomicValue<OrchestratorResult>;

// ── Engine ───────────────────────────────────────────────────────────────────

export class CAMSpeedFeedBridgeEngine {
  /** Normalize a native payload without running the orchestrator. */
  static translateRequest(
    target: SFBridgeTarget,
    native: SFNativeRequest,
  ): OrchestratorInput {
    SFBridgeTargetSchema.parse(target);
    SFNativeRequestSchema.parse(native);
    return normalizeRequest(target, native);
  }

  /** Encode an orchestrator result into the host-preferred wire format. */
  static translateResponse(
    target: SFBridgeTarget,
    operation_id: string,
    result: OrchestratorResult,
  ): string {
    SFBridgeTargetSchema.parse(target);
    return encodeResponse(target, operation_id, result, null);
  }

  /**
   * Run end-to-end: translate request → compute → translate response.
   * `compute` is injectable for test isolation; defaults to the real
   * orchestrator lazily so the engine has no import cycle at module load.
   */
  static compute(
    req: SFBridgeRequest,
    compute?: SpeedFeedComputeFn,
  ): SFBridgeResponse {
    const parsed = SFBridgeRequestSchema.parse(req);
    const translated = normalizeRequest(parsed.target, parsed.native_request);
    const fn = compute ?? defaultCompute;
    try {
      const atomic = fn(translated);
      const result = atomic.value;
      const native_payload = encodeResponse(
        parsed.target,
        parsed.native_request.operation_id,
        result,
        null,
      );
      return {
        target: parsed.target,
        operation_id: parsed.native_request.operation_id,
        translated_input: translated as Record<string, unknown>,
        orchestrator_result: result as unknown as Record<string, unknown>,
        native_payload,
        status: "ok",
        error: null,
      };
    } catch (e) {
      const err = (e as Error).message;
      return {
        target: parsed.target,
        operation_id: parsed.native_request.operation_id,
        translated_input: translated as Record<string, unknown>,
        orchestrator_result: null,
        native_payload: encodeResponse(
          parsed.target,
          parsed.native_request.operation_id,
          null,
          err,
        ),
        status: "compute_error",
        error: err,
      };
    }
  }

  static supportedTargets(): SFBridgeTarget[] {
    return [
      "hypermill",
      "fusion360",
      "inventor_hsm",
      "mastercam",
      "esprit",
      "solidcam",
      "generic",
    ];
  }
}

/** Lazy binding to the real orchestrator. */
function defaultCompute(input: OrchestratorInput): AtomicValue<OrchestratorResult> {
  // Lazy require so the bridge can load without a heavy orchestrator init.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("./SpeedFeedOrchestratorEngine.js") as {
    speedFeedOrchestratorEngine: {
      compute: (i: OrchestratorInput) => AtomicValue<OrchestratorResult>;
    };
  };
  return mod.speedFeedOrchestratorEngine.compute(input);
}

export const camSpeedFeedBridgeEngine = CAMSpeedFeedBridgeEngine;
