/**
 * ThermalOverlayEngine — Real-time Cutting Temperature Overlay (U-CAM93)
 * ========================================================================
 *
 * PHASE-7 Intelligent Vericut: Real-time cutting-zone thermal visualization
 * for the four CAM plugin adapters (hyperMILL, Fusion 360, Inventor HSM,
 * Mastercam X8). Consumes the `temperature` sub-object of the PhysicsOverlay
 * emitted by PRISMVerificationPluginEngine.analyzePoint() and produces
 * render-ready frames showing current cutting temperature and thermal damage
 * risk.
 *
 * Visual semantics:
 *   nominal    → green   — within material-safe operating range
 *   elevated   → amber   — rising thermal risk, coolant advised
 *   critical   → red     — thermal damage zone, tool life collapsing
 *   transition → magenta — status flip detected this frame
 *
 * Unlike the deflection overlay (which uses nominal/warning/critical) the
 * temperature sub-object uses "elevated" for its middle band — terminology
 * preserved here for fidelity with the upstream PhysicsOverlay schema.
 *
 * Architecture (downstream of U-CAM85, consumed by U-CAM86-89 adapters):
 *
 *     OperationPoint ──► PRISMVerificationPluginEngine.analyzePoint()
 *                                      │
 *                                      ▼ PhysicsOverlay.temperature
 *                         ThermalOverlayEngine.renderFrame()
 *                                      │
 *                                      ▼ ThermalOverlayFrame
 *                     [HyperMill | Fusion360 | InventorHSM | Mastercam] Adapter
 *
 * References:
 *   - Loewen & Shaw, "On the Analysis of Cutting Tool Temperatures",
 *     Trans. ASME (1954) — foundational tool-chip interface temperature model
 *   - Komanduri & Hou, "Thermal Modeling of the Metal Cutting Process",
 *     Int. J. Mech. Sci. (2000) — moving-heat-source closed forms
 *   - Abukhshim, Mativenga & Sheikh, "Heat generation and temperature
 *     prediction in metal cutting", Int. J. Machine Tools & Manuf. (2006)
 *
 * @module engines/ThermalOverlayEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM93
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

/** Thermal state classification — terminology mirrors upstream overlay */
export const ThermalStateSchema = z.enum([
  "nominal",     // green — safe operating temperature
  "elevated",    // amber — rising risk
  "critical",    // red — thermal damage zone
  "transition",  // magenta — state flip this frame
]);
export type ThermalState = z.infer<typeof ThermalStateSchema>;

/** Plugin target for encoding-specific frame formatting */
export const ThermalOverlayTargetSchema = z.enum([
  "hypermill",
  "fusion360",
  "inventor_hsm",
  "mastercam",
  "generic",
]);
export type ThermalOverlayTarget = z.infer<typeof ThermalOverlayTargetSchema>;

/** Single rendered thermal overlay frame */
export const ThermalOverlayFrameSchema = z.object({
  session_id: z.string(),
  operation_id: z.string(),
  time_s: z.number(),
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  /** Cutting-zone temperature [°C] */
  temperature_c: z.number(),
  /** Thermal damage risk [0..1] */
  thermal_damage_risk: z.number().min(0).max(1),
  /** Classified visual state */
  state: ThermalStateSchema,
  /** Render color (hex `#rrggbb`) */
  color_hex: HexColorSchema,
  /** True iff this frame is a status transition vs the previous frame */
  transition: z.boolean(),
  /** Encoded payload for the specific plugin target */
  payload: z.string(),
  /** Plugin target associated with `payload` */
  target: ThermalOverlayTargetSchema,
});
export type ThermalOverlayFrame = z.infer<typeof ThermalOverlayFrameSchema>;

/** Session-scoped thermal aggregate */
export const ThermalOverlayStatsSchema = z.object({
  frames: z.number(),
  nominal_count: z.number(),
  elevated_count: z.number(),
  critical_count: z.number(),
  transition_count: z.number(),
  max_temperature_c: z.number(),
  max_damage_risk: z.number(),
  last_critical_time_s: z.number().nullable(),
});
export type ThermalOverlayStats = z.infer<typeof ThermalOverlayStatsSchema>;

// ── Constants ────────────────────────────────────────────────────────────────

const COLOR_NOMINAL = "#22c55e";    // green
const COLOR_ELEVATED = "#eab308";   // amber
const COLOR_CRITICAL = "#dc2626";   // red
const COLOR_TRANSITION = "#d946ef"; // magenta

// ── Internal State ───────────────────────────────────────────────────────────

interface SessionTrack {
  last_state: Exclude<ThermalState, "transition"> | null;
  stats: ThermalOverlayStats;
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
        elevated_count: 0,
        critical_count: 0,
        transition_count: 0,
        max_temperature_c: -Infinity,
        max_damage_risk: 0,
        last_critical_time_s: null,
      },
    };
    tracks.set(session_id, track);
  }
  return track;
}

function baseColorFor(state: ThermalState): string {
  switch (state) {
    case "nominal":    return COLOR_NOMINAL;
    case "elevated":   return COLOR_ELEVATED;
    case "critical":   return COLOR_CRITICAL;
    case "transition": return COLOR_TRANSITION;
  }
}

function detectTransition(
  prev: Exclude<ThermalState, "transition"> | null,
  curr: Exclude<ThermalState, "transition">,
): boolean {
  if (prev === null) return false;
  return prev !== curr;
}

function encodeForTarget(
  target: ThermalOverlayTarget,
  frame: {
    operation_id: string;
    temperature_c: number;
    thermal_damage_risk: number;
    state: ThermalState;
    color_hex: string;
    transition: boolean;
    position: { x: number; y: number; z: number };
  },
): string {
  switch (target) {
    case "hypermill":
      return (
        `<methodCall><methodName>PRISM.ThermalOverlay</methodName>` +
        `<params>` +
        `<param><value><string>${frame.operation_id}</string></value></param>` +
        `<param><value><double>${frame.temperature_c.toFixed(1)}</double></value></param>` +
        `<param><value><double>${frame.thermal_damage_risk.toFixed(3)}</double></value></param>` +
        `<param><value><string>${frame.state}</string></value></param>` +
        `<param><value><string>${frame.color_hex}</string></value></param>` +
        `<param><value><boolean>${frame.transition ? 1 : 0}</boolean></value></param>` +
        `</params></methodCall>`
      );
    case "fusion360":
      return JSON.stringify({
        jsonrpc: "2.0",
        method: "cam.thermalOverlay",
        params: {
          operationId: frame.operation_id,
          temperatureC: frame.temperature_c,
          damageRisk: frame.thermal_damage_risk,
          state: frame.state,
          colorHex: frame.color_hex,
          transition: frame.transition,
          position: frame.position,
        },
      });
    case "inventor_hsm":
      return JSON.stringify({
        type: "hsm.thermalOverlay",
        operationId: frame.operation_id,
        temperature: frame.temperature_c,
        damageRisk: frame.thermal_damage_risk,
        state: frame.state,
        color: frame.color_hex,
        transition: frame.transition,
      });
    case "mastercam":
      return (
        `THERM|${frame.operation_id}|${frame.temperature_c.toFixed(1)}|` +
        `${frame.state}|${frame.color_hex}|${frame.thermal_damage_risk.toFixed(3)}|` +
        `${frame.transition ? 1 : 0}`
      );
    case "generic":
    default:
      return JSON.stringify({
        type: "thermal_overlay",
        operation_id: frame.operation_id,
        temperature_c: frame.temperature_c,
        thermal_damage_risk: frame.thermal_damage_risk,
        state: frame.state,
        color_hex: frame.color_hex,
        transition: frame.transition,
        position: frame.position,
      });
  }
}

// ── Engine Class ─────────────────────────────────────────────────────────────

export class ThermalOverlayEngine {
  /**
   * Render a single thermal overlay frame from an OperationPoint and its
   * associated PhysicsOverlay.
   */
  static renderFrame(
    session_id: string,
    point: OperationPoint,
    overlay: PhysicsOverlay,
    target: ThermalOverlayTarget = "generic",
  ): ThermalOverlayFrame {
    OperationPointSchema.parse(point);
    PhysicsOverlaySchema.parse(overlay);

    const { temperature } = overlay;
    const classified: Exclude<ThermalState, "transition"> = temperature.status;

    const track = ensureTrack(session_id);
    const isTransition = detectTransition(track.last_state, classified);
    const state: ThermalState = isTransition ? "transition" : classified;
    const color_hex = baseColorFor(state);

    const payload = encodeForTarget(target, {
      operation_id: point.operation_id,
      temperature_c: temperature.value,
      thermal_damage_risk: temperature.thermal_damage_risk,
      state,
      color_hex,
      transition: isTransition,
      position: point.position,
    });

    // Update stats
    track.stats.frames += 1;
    if (classified === "nominal")  track.stats.nominal_count += 1;
    if (classified === "elevated") track.stats.elevated_count += 1;
    if (classified === "critical") {
      track.stats.critical_count += 1;
      track.stats.last_critical_time_s = point.time_s;
    }
    if (isTransition) track.stats.transition_count += 1;
    track.stats.max_temperature_c = Math.max(
      track.stats.max_temperature_c,
      temperature.value,
    );
    track.stats.max_damage_risk = Math.max(
      track.stats.max_damage_risk,
      temperature.thermal_damage_risk,
    );

    track.last_state = classified;

    return {
      session_id,
      operation_id: point.operation_id,
      time_s: point.time_s,
      position: point.position,
      temperature_c: temperature.value,
      thermal_damage_risk: temperature.thermal_damage_risk,
      state,
      color_hex,
      transition: isTransition,
      payload,
      target,
    };
  }

  /** Snapshot the running aggregate for a session. */
  static getStats(session_id: string): ThermalOverlayStats {
    const track = tracks.get(session_id);
    if (!track) {
      return {
        frames: 0,
        nominal_count: 0,
        elevated_count: 0,
        critical_count: 0,
        transition_count: 0,
        max_temperature_c: -Infinity,
        max_damage_risk: 0,
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
  static supportedTargets(): ThermalOverlayTarget[] {
    return ["hypermill", "fusion360", "inventor_hsm", "mastercam", "generic"];
  }
}

export const thermalOverlayEngine = ThermalOverlayEngine;
