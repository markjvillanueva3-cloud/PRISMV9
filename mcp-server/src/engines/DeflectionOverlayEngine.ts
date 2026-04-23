/**
 * DeflectionOverlayEngine — Real-time Tool/Part Deflection Overlay (U-CAM92)
 * ============================================================================
 *
 * PHASE-7 Intelligent Vericut: Real-time tool and part deflection visualization
 * for the four CAM plugin adapters (hyperMILL, Fusion 360, Inventor HSM,
 * Mastercam X8). Consumes the `deflection` sub-object of the PhysicsOverlay
 * emitted by PRISMVerificationPluginEngine.analyzePoint() and emits
 * render-ready frames showing current deflection magnitude and tolerance-zone
 * consumption.
 *
 * Visual semantics:
 *   nominal    → green   — deflection well within tolerance budget
 *   warning    → amber   — consuming a significant share of tolerance
 *   critical   → red     — tolerance violation likely
 *   transition → magenta — status flip detected this frame
 *
 * Architecture (downstream of U-CAM85, consumed by U-CAM86-89 adapters):
 *
 *     OperationPoint ──► PRISMVerificationPluginEngine.analyzePoint()
 *                                      │
 *                                      ▼ PhysicsOverlay.deflection
 *                         DeflectionOverlayEngine.renderFrame()
 *                                      │
 *                                      ▼ DeflectionOverlayFrame
 *                     [HyperMill | Fusion360 | InventorHSM | Mastercam] Adapter
 *
 * References:
 *   - Euler-Bernoulli beam theory: δ = FL³ / (3·E·I) — Gere, Mechanics of
 *     Materials (9e) §9.3 (cantilever end-load)
 *   - Kops & Vo, "Determination of the Equivalent Diameter of an End Mill
 *     based on its Compliance", CIRP Annals (1990) — tapered/fluted tools
 *   - ISO 230-2:2014 — tolerance accounting discipline
 *
 * @module engines/DeflectionOverlayEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM92
 */

import { z } from "zod";
import {
  OperationPointSchema,
  PhysicsOverlaySchema,
  type OperationPoint,
  type PhysicsOverlay,
} from "./PRISMVerificationPluginEngine.js";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const HexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/** Deflection state classification */
export const DeflectionStateSchema = z.enum([
  "nominal",     // green — within tolerance budget
  "warning",     // amber — consuming significant tolerance
  "critical",    // red — tolerance violation likely
  "transition",  // magenta — state flip detected this frame
]);
export type DeflectionState = z.infer<typeof DeflectionStateSchema>;

/** Plugin target for encoding-specific frame formatting */
export const DeflectionOverlayTargetSchema = z.enum([
  "hypermill",
  "fusion360",
  "inventor_hsm",
  "mastercam",
  "generic",
]);
export type DeflectionOverlayTarget = z.infer<typeof DeflectionOverlayTargetSchema>;

/** Single rendered deflection overlay frame */
export const DeflectionOverlayFrameSchema = z.object({
  session_id: z.string(),
  operation_id: z.string(),
  time_s: z.number(),
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  /** Tool/part deflection magnitude [mm] */
  deflection_mm: z.number(),
  /** Percent of tolerance band consumed by this deflection [0..] */
  tolerance_impact_pct: z.number(),
  /** Classified visual state */
  state: DeflectionStateSchema,
  /** Render color (hex `#rrggbb`) */
  color_hex: HexColorSchema,
  /** True iff this frame is a status transition vs the previous frame */
  transition: z.boolean(),
  /** Encoded payload for the specific plugin target */
  payload: z.string(),
  /** Plugin target associated with `payload` */
  target: DeflectionOverlayTargetSchema,
});
export type DeflectionOverlayFrame = z.infer<typeof DeflectionOverlayFrameSchema>;

/** Session-scoped deflection aggregate */
export const DeflectionOverlayStatsSchema = z.object({
  frames: z.number(),
  nominal_count: z.number(),
  warning_count: z.number(),
  critical_count: z.number(),
  transition_count: z.number(),
  max_deflection_mm: z.number(),
  max_tolerance_impact_pct: z.number(),
  last_critical_time_s: z.number().nullable(),
});
export type DeflectionOverlayStats = z.infer<typeof DeflectionOverlayStatsSchema>;

// ── Constants ────────────────────────────────────────────────────────────────

const COLOR_NOMINAL = "#22c55e";    // green
const COLOR_WARNING = "#eab308";    // amber
const COLOR_CRITICAL = "#dc2626";   // red
const COLOR_TRANSITION = "#d946ef"; // magenta

// ── Internal State ───────────────────────────────────────────────────────────

interface SessionTrack {
  last_state: Exclude<DeflectionState, "transition"> | null;
  stats: DeflectionOverlayStats;
}

const tracks = new Map<string, SessionTrack>();

// ── Helpers ──────────────────────────────────────────────────────────────────

function ensureTrack(session_id: string): SessionTrack {
  let track = tracks.get(session_id);
  if (!track) {
    track = {
      last_state: null,
      stats: {
        frames: 0,
        nominal_count: 0,
        warning_count: 0,
        critical_count: 0,
        transition_count: 0,
        max_deflection_mm: 0,
        max_tolerance_impact_pct: 0,
        last_critical_time_s: null,
      },
    };
    tracks.set(session_id, track);
  }
  return track;
}

function baseColorFor(state: DeflectionState): string {
  switch (state) {
    case "nominal":    return COLOR_NOMINAL;
    case "warning":    return COLOR_WARNING;
    case "critical":   return COLOR_CRITICAL;
    case "transition": return COLOR_TRANSITION;
  }
}

function detectTransition(
  prev: Exclude<DeflectionState, "transition"> | null,
  curr: Exclude<DeflectionState, "transition">,
): boolean {
  if (prev === null) return false;
  return prev !== curr;
}

function encodeForTarget(
  target: DeflectionOverlayTarget,
  frame: {
    operation_id: string;
    deflection_mm: number;
    tolerance_impact_pct: number;
    state: DeflectionState;
    color_hex: string;
    transition: boolean;
    position: { x: number; y: number; z: number };
  },
): string {
  switch (target) {
    case "hypermill":
      return (
        `<methodCall><methodName>PRISM.DeflectionOverlay</methodName>` +
        `<params>` +
        `<param><value><string>${frame.operation_id}</string></value></param>` +
        `<param><value><double>${frame.deflection_mm.toFixed(4)}</double></value></param>` +
        `<param><value><double>${frame.tolerance_impact_pct.toFixed(1)}</double></value></param>` +
        `<param><value><string>${frame.state}</string></value></param>` +
        `<param><value><string>${frame.color_hex}</string></value></param>` +
        `<param><value><boolean>${frame.transition ? 1 : 0}</boolean></value></param>` +
        `</params></methodCall>`
      );
    case "fusion360":
      return JSON.stringify({
        jsonrpc: "2.0",
        method: "cam.deflectionOverlay",
        params: {
          operationId: frame.operation_id,
          deflectionMm: frame.deflection_mm,
          toleranceImpactPct: frame.tolerance_impact_pct,
          state: frame.state,
          colorHex: frame.color_hex,
          transition: frame.transition,
          position: frame.position,
        },
      });
    case "inventor_hsm":
      return JSON.stringify({
        type: "hsm.deflectionOverlay",
        operationId: frame.operation_id,
        deflection: frame.deflection_mm,
        toleranceImpact: frame.tolerance_impact_pct,
        state: frame.state,
        color: frame.color_hex,
        transition: frame.transition,
      });
    case "mastercam":
      return (
        `DEFL|${frame.operation_id}|${frame.deflection_mm.toFixed(4)}|` +
        `${frame.state}|${frame.color_hex}|${frame.tolerance_impact_pct.toFixed(1)}|` +
        `${frame.transition ? 1 : 0}`
      );
    case "generic":
    default:
      return JSON.stringify({
        type: "deflection_overlay",
        operation_id: frame.operation_id,
        deflection_mm: frame.deflection_mm,
        tolerance_impact_pct: frame.tolerance_impact_pct,
        state: frame.state,
        color_hex: frame.color_hex,
        transition: frame.transition,
        position: frame.position,
      });
  }
}

// ── Engine Class ─────────────────────────────────────────────────────────────

export class DeflectionOverlayEngine {
  /**
   * Render a single deflection overlay frame from an OperationPoint and its
   * associated PhysicsOverlay.
   */
  static renderFrame(
    session_id: string,
    point: OperationPoint,
    overlay: PhysicsOverlay,
    target: DeflectionOverlayTarget = "generic",
  ): DeflectionOverlayFrame {
    OperationPointSchema.parse(point);
    PhysicsOverlaySchema.parse(overlay);

    const { deflection } = overlay;
    const classified: Exclude<DeflectionState, "transition"> = deflection.status;

    const track = ensureTrack(session_id);
    const isTransition = detectTransition(track.last_state, classified);
    const state: DeflectionState = isTransition ? "transition" : classified;
    const color_hex = baseColorFor(state);

    const payload = encodeForTarget(target, {
      operation_id: point.operation_id,
      deflection_mm: deflection.value,
      tolerance_impact_pct: deflection.tolerance_impact,
      state,
      color_hex,
      transition: isTransition,
      position: point.position,
    });

    // Update stats
    track.stats.frames += 1;
    if (classified === "nominal")  track.stats.nominal_count += 1;
    if (classified === "warning")  track.stats.warning_count += 1;
    if (classified === "critical") {
      track.stats.critical_count += 1;
      track.stats.last_critical_time_s = point.time_s;
    }
    if (isTransition) track.stats.transition_count += 1;
    track.stats.max_deflection_mm = Math.max(track.stats.max_deflection_mm, deflection.value);
    track.stats.max_tolerance_impact_pct = Math.max(
      track.stats.max_tolerance_impact_pct,
      deflection.tolerance_impact,
    );

    track.last_state = classified;

    return {
      session_id,
      operation_id: point.operation_id,
      time_s: point.time_s,
      position: point.position,
      deflection_mm: deflection.value,
      tolerance_impact_pct: deflection.tolerance_impact,
      state,
      color_hex,
      transition: isTransition,
      payload,
      target,
    };
  }

  /** Snapshot the running aggregate for a session. */
  static getStats(session_id: string): DeflectionOverlayStats {
    const track = tracks.get(session_id);
    if (!track) {
      return {
        frames: 0,
        nominal_count: 0,
        warning_count: 0,
        critical_count: 0,
        transition_count: 0,
        max_deflection_mm: 0,
        max_tolerance_impact_pct: 0,
        last_critical_time_s: null,
      };
    }
    return { ...track.stats };
  }

  /** Discard all state for a session. */
  static resetSession(session_id: string): void {
    tracks.delete(session_id);
  }

  /** List the plugin targets this engine can encode for. */
  static supportedTargets(): DeflectionOverlayTarget[] {
    return ["hypermill", "fusion360", "inventor_hsm", "mastercam", "generic"];
  }
}

export const deflectionOverlayEngine = DeflectionOverlayEngine;
