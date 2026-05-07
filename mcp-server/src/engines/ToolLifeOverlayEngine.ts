/**
 * ToolLifeOverlayEngine — Real-time Tool Life Countdown Overlay (U-CAM94)
 * =========================================================================
 *
 * PHASE-7 Intelligent Vericut: Real-time tool life visualization for the four
 * CAM plugin adapters (hyperMILL, Fusion 360, Inventor HSM, Mastercam X8).
 * Consumes the `tool_life` sub-object of the PhysicsOverlay emitted by
 * PRISMVerificationPluginEngine.analyzePoint(). The upstream value itself is
 * grounded in the Taylor tool-life equation ( V * T^n = C ) evaluated by the
 * existing physics stack — this engine is strictly a presentation layer that
 * classifies, colorizes, and encodes per-plugin payloads for display.
 *
 * Visual semantics (mirrors upstream `tool_life.status` vocabulary):
 *   good        → green    — plenty of life remaining
 *   monitor     → yellow   — routine check-in
 *   change_soon → orange   — plan the swap
 *   change_now  → red      — change at next safe stop
 *   transition  → magenta  — status flip detected this frame
 *
 * Architecture (downstream of U-CAM85, consumed by U-CAM86-89 adapters):
 *
 *     OperationPoint ──► PRISMVerificationPluginEngine.analyzePoint()
 *                                      │
 *                                      ▼ PhysicsOverlay.tool_life (Taylor)
 *                         ToolLifeOverlayEngine.renderFrame()
 *                                      │
 *                                      ▼ ToolLifeOverlayFrame
 *                     [HyperMill | Fusion360 | InventorHSM | Mastercam] Adapter
 *
 * References:
 *   - Taylor, F. W., "On the Art of Cutting Metals", Trans. ASME 28 (1907) —
 *     foundational V * T^n = C tool-life formulation
 *   - Kronenberg, "Machining Science and Application" (Pergamon, 1966) —
 *     generalized Taylor constants for modern tooling
 *
 * @module engines/ToolLifeOverlayEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM94
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

/** Tool life state classification — terminology mirrors upstream overlay */
export const ToolLifeStateSchema = z.enum([
  "good",         // green — plenty of life remaining
  "monitor",      // yellow — routine check-in
  "change_soon",  // orange — plan the swap
  "change_now",   // red — change at next safe stop
  "transition",   // magenta — state flip this frame
]);
export type ToolLifeState = z.infer<typeof ToolLifeStateSchema>;

/** Plugin target for encoding-specific frame formatting */
export const ToolLifeOverlayTargetSchema = z.enum([
  "hypermill",
  "fusion360",
  "inventor_hsm",
  "mastercam",
  "generic",
]);
export type ToolLifeOverlayTarget = z.infer<typeof ToolLifeOverlayTargetSchema>;

/** Single rendered tool life overlay frame */
export const ToolLifeOverlayFrameSchema = z.object({
  session_id: z.string(),
  operation_id: z.string(),
  tool_id: z.string(),
  time_s: z.number(),
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  /** Remaining tool life [%] */
  remaining_pct: z.number().min(0).max(100),
  /** Estimated remaining minutes at current conditions */
  estimated_remaining_min: z.number(),
  /** True iff upstream recommends changing the tool */
  change_recommended: z.boolean(),
  /** Classified visual state */
  state: ToolLifeStateSchema,
  /** Render color (hex `#rrggbb`) */
  color_hex: HexColorSchema,
  /** True iff this frame is a status transition vs the previous frame */
  transition: z.boolean(),
  /** Encoded payload for the specific plugin target */
  payload: z.string(),
  /** Plugin target associated with `payload` */
  target: ToolLifeOverlayTargetSchema,
});
export type ToolLifeOverlayFrame = z.infer<typeof ToolLifeOverlayFrameSchema>;

/** Session-scoped tool life aggregate */
export const ToolLifeOverlayStatsSchema = z.object({
  frames: z.number(),
  good_count: z.number(),
  monitor_count: z.number(),
  change_soon_count: z.number(),
  change_now_count: z.number(),
  transition_count: z.number(),
  min_remaining_pct: z.number(),
  min_remaining_min: z.number(),
  change_recommended_count: z.number(),
  first_change_now_time_s: z.number().nullable(),
});
export type ToolLifeOverlayStats = z.infer<typeof ToolLifeOverlayStatsSchema>;

// ── Constants ────────────────────────────────────────────────────────────────

const COLOR_GOOD = "#22c55e";         // green
const COLOR_MONITOR = "#eab308";      // yellow
const COLOR_CHANGE_SOON = "#f97316";  // orange
const COLOR_CHANGE_NOW = "#dc2626";   // red
const COLOR_TRANSITION = "#d946ef";   // magenta

// ── Internal State ───────────────────────────────────────────────────────────

type ClassifiedToolLifeState = Exclude<ToolLifeState, "transition">;

interface SessionTrack {
  last_state: ClassifiedToolLifeState | null;
  stats: ToolLifeOverlayStats;
}

const tracks = new Map<string, SessionTrack>();

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEmptyStats(): ToolLifeOverlayStats {
  return {
    frames: 0,
    good_count: 0,
    monitor_count: 0,
    change_soon_count: 0,
    change_now_count: 0,
    transition_count: 0,
    min_remaining_pct: Infinity,
    min_remaining_min: Infinity,
    change_recommended_count: 0,
    first_change_now_time_s: null,
  };
}

function ensureTrack(session_id: string): SessionTrack {
  let track = tracks.get(session_id);
  if (!track) {
    track = { last_state: null, stats: makeEmptyStats() };
    tracks.set(session_id, track);
  }
  return track;
}

function baseColorFor(state: ToolLifeState): string {
  switch (state) {
    case "good":        return COLOR_GOOD;
    case "monitor":     return COLOR_MONITOR;
    case "change_soon": return COLOR_CHANGE_SOON;
    case "change_now":  return COLOR_CHANGE_NOW;
    case "transition":  return COLOR_TRANSITION;
  }
}

function detectTransition(
  prev: ClassifiedToolLifeState | null,
  curr: ClassifiedToolLifeState,
): boolean {
  if (prev === null) return false;
  return prev !== curr;
}

function encodeForTarget(
  target: ToolLifeOverlayTarget,
  frame: {
    operation_id: string;
    tool_id: string;
    remaining_pct: number;
    estimated_remaining_min: number;
    change_recommended: boolean;
    state: ToolLifeState;
    color_hex: string;
    transition: boolean;
    position: { x: number; y: number; z: number };
  },
): string {
  switch (target) {
    case "hypermill":
      return (
        `<methodCall><methodName>PRISM.ToolLifeOverlay</methodName>` +
        `<params>` +
        `<param><value><string>${frame.operation_id}</string></value></param>` +
        `<param><value><string>${frame.tool_id}</string></value></param>` +
        `<param><value><double>${frame.remaining_pct.toFixed(1)}</double></value></param>` +
        `<param><value><double>${frame.estimated_remaining_min.toFixed(2)}</double></value></param>` +
        `<param><value><string>${frame.state}</string></value></param>` +
        `<param><value><string>${frame.color_hex}</string></value></param>` +
        `<param><value><boolean>${frame.change_recommended ? 1 : 0}</boolean></value></param>` +
        `<param><value><boolean>${frame.transition ? 1 : 0}</boolean></value></param>` +
        `</params></methodCall>`
      );
    case "fusion360":
      return JSON.stringify({
        jsonrpc: "2.0",
        method: "cam.toolLifeOverlay",
        params: {
          operationId: frame.operation_id,
          toolId: frame.tool_id,
          remainingPct: frame.remaining_pct,
          estimatedRemainingMin: frame.estimated_remaining_min,
          changeRecommended: frame.change_recommended,
          state: frame.state,
          colorHex: frame.color_hex,
          transition: frame.transition,
          position: frame.position,
        },
      });
    case "inventor_hsm":
      return JSON.stringify({
        type: "hsm.toolLifeOverlay",
        operationId: frame.operation_id,
        toolId: frame.tool_id,
        remainingPct: frame.remaining_pct,
        estimatedRemainingMin: frame.estimated_remaining_min,
        changeRecommended: frame.change_recommended,
        state: frame.state,
        color: frame.color_hex,
        transition: frame.transition,
      });
    case "mastercam":
      return (
        `TOOLLIFE|${frame.operation_id}|${frame.tool_id}|` +
        `${frame.remaining_pct.toFixed(1)}|${frame.estimated_remaining_min.toFixed(2)}|` +
        `${frame.state}|${frame.color_hex}|${frame.change_recommended ? 1 : 0}|` +
        `${frame.transition ? 1 : 0}`
      );
    case "generic":
    default:
      return JSON.stringify({
        type: "tool_life_overlay",
        operation_id: frame.operation_id,
        tool_id: frame.tool_id,
        remaining_pct: frame.remaining_pct,
        estimated_remaining_min: frame.estimated_remaining_min,
        change_recommended: frame.change_recommended,
        state: frame.state,
        color_hex: frame.color_hex,
        transition: frame.transition,
        position: frame.position,
      });
  }
}

// ── Engine Class ─────────────────────────────────────────────────────────────

export class ToolLifeOverlayEngine {
  /**
   * Render a single tool life overlay frame from an OperationPoint and its
   * associated PhysicsOverlay. Tool life values are Taylor-grounded upstream
   * in PRISMVerificationPluginEngine; this engine classifies and encodes.
   */
  static renderFrame(
    session_id: string,
    point: OperationPoint,
    overlay: PhysicsOverlay,
    target: ToolLifeOverlayTarget = "generic",
  ): ToolLifeOverlayFrame {
    OperationPointSchema.parse(point);
    PhysicsOverlaySchema.parse(overlay);

    const { tool_life } = overlay;
    const classified: ClassifiedToolLifeState = tool_life.status;

    const track = ensureTrack(session_id);
    const isTransition = detectTransition(track.last_state, classified);
    const state: ToolLifeState = isTransition ? "transition" : classified;
    const color_hex = baseColorFor(state);

    const payload = encodeForTarget(target, {
      operation_id: point.operation_id,
      tool_id: point.tool.tool_id,
      remaining_pct: tool_life.remaining_pct,
      estimated_remaining_min: tool_life.estimated_remaining_min,
      change_recommended: tool_life.change_recommended,
      state,
      color_hex,
      transition: isTransition,
      position: point.position,
    });

    // Update stats
    track.stats.frames += 1;
    if (classified === "good")        track.stats.good_count += 1;
    if (classified === "monitor")     track.stats.monitor_count += 1;
    if (classified === "change_soon") track.stats.change_soon_count += 1;
    if (classified === "change_now") {
      track.stats.change_now_count += 1;
      if (track.stats.first_change_now_time_s === null) {
        track.stats.first_change_now_time_s = point.time_s;
      }
    }
    if (isTransition) track.stats.transition_count += 1;
    if (tool_life.change_recommended) track.stats.change_recommended_count += 1;
    track.stats.min_remaining_pct = Math.min(
      track.stats.min_remaining_pct,
      tool_life.remaining_pct,
    );
    track.stats.min_remaining_min = Math.min(
      track.stats.min_remaining_min,
      tool_life.estimated_remaining_min,
    );

    track.last_state = classified;

    return {
      session_id,
      operation_id: point.operation_id,
      tool_id: point.tool.tool_id,
      time_s: point.time_s,
      position: point.position,
      remaining_pct: tool_life.remaining_pct,
      estimated_remaining_min: tool_life.estimated_remaining_min,
      change_recommended: tool_life.change_recommended,
      state,
      color_hex,
      transition: isTransition,
      payload,
      target,
    };
  }

  /** Snapshot the running aggregate for a session. */
  static getStats(session_id: string): ToolLifeOverlayStats {
    const track = tracks.get(session_id);
    if (!track) return makeEmptyStats();
    return { ...track.stats };
  }

  /** Discard all state for a session. */
  static resetSession(session_id: string): void {
    tracks.delete(session_id);
  }

  /** List the plugin targets this engine can encode for. */
  static supportedTargets(): ToolLifeOverlayTarget[] {
    return ["hypermill", "fusion360", "inventor_hsm", "mastercam", "generic"];
  }
}

export const toolLifeOverlayEngine = ToolLifeOverlayEngine;
