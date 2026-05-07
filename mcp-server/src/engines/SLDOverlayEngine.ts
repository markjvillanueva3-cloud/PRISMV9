/**
 * SLDOverlayEngine — Real-time Chatter Stability Lobe Overlay (U-CAM91)
 * ======================================================================
 *
 * PHASE-7 Intelligent Vericut: Real-time chatter stability visualization for the
 * four CAM plugin adapters (hyperMILL, Fusion 360, Inventor HSM, Mastercam X8).
 * Consumes the `chatter` sub-object of the PhysicsOverlay emitted by
 * PRISMVerificationPluginEngine.analyzePoint() and produces render-ready frames
 * showing the current operating point's position relative to the Stability Lobe
 * Diagram (SLD).
 *
 * Visual semantics:
 *   stable     → green   — safely inside a stability lobe
 *   marginal   → amber   — close to SLD boundary, reduced chatter margin
 *   unstable   → red     — outside stable region, regenerative chatter expected
 *   transition → magenta — stable↔unstable edge detected this frame
 *
 * Frame includes `recommended_rpm` callout when available, so plugin UIs can
 * render a "switch to X RPM" badge on unstable frames.
 *
 * Architecture (downstream of U-CAM85, consumed by U-CAM86-89 adapters):
 *
 *     OperationPoint ──► PRISMVerificationPluginEngine.analyzePoint()
 *                                      │
 *                                      ▼ PhysicsOverlay.chatter
 *                            SLDOverlayEngine.renderFrame()
 *                                      │
 *                                      ▼ SLDOverlayFrame
 *                     [HyperMill | Fusion360 | InventorHSM | Mastercam] Adapter
 *
 * References:
 *   - Altintas & Budak, "Analytical Prediction of Stability Lobes in Milling",
 *     CIRP Annals (1995) — regenerative chatter theory
 *   - Tlusty & Polacek (1963), "The Stability of Machine Tools against
 *     Self-Excited Vibrations" — SLD foundational work
 *   - Schmitz & Smith, "Machining Dynamics" (Springer, 2009) — SLD practice
 *
 * @module engines/SLDOverlayEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM91
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

/** Chatter state classification */
export const ChatterStateSchema = z.enum([
  "stable",      // inside lobe — green
  "marginal",    // near SLD boundary — amber
  "unstable",    // outside lobe / chatter expected — red
  "transition",  // state flip detected this frame — magenta
]);
export type ChatterState = z.infer<typeof ChatterStateSchema>;

/** Plugin target for encoding-specific frame formatting */
export const SLDOverlayTargetSchema = z.enum([
  "hypermill",
  "fusion360",
  "inventor_hsm",
  "mastercam",
  "generic",
]);
export type SLDOverlayTarget = z.infer<typeof SLDOverlayTargetSchema>;

/** Single rendered SLD overlay frame */
export const SLDOverlayFrameSchema = z.object({
  session_id: z.string(),
  operation_id: z.string(),
  time_s: z.number(),
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  /** Current spindle speed [RPM] at this operating point */
  rpm: z.number(),
  /** Chatter state per above classification */
  state: ChatterStateSchema,
  /** Render color (hex `#rrggbb`) */
  color_hex: HexColorSchema,
  /** SLD stability margin [distance to nearest SLD boundary] */
  stability_margin: z.number(),
  /** Recommended RPM for stable operation, if available */
  recommended_rpm: z.number().nullable(),
  /** True iff this frame is a state transition (stable↔unstable/marginal) */
  transition: z.boolean(),
  /** Encoded payload for the specific plugin target */
  payload: z.string(),
  /** Plugin target associated with `payload` */
  target: SLDOverlayTargetSchema,
});
export type SLDOverlayFrame = z.infer<typeof SLDOverlayFrameSchema>;

/** Session-scoped SLD aggregate, maintained across calls */
export const SLDOverlayStatsSchema = z.object({
  frames: z.number(),
  stable_count: z.number(),
  marginal_count: z.number(),
  unstable_count: z.number(),
  transition_count: z.number(),
  min_stability_margin: z.number(),
  last_unstable_time_s: z.number().nullable(),
  last_recommended_rpm: z.number().nullable(),
});
export type SLDOverlayStats = z.infer<typeof SLDOverlayStatsSchema>;

// ── Constants ────────────────────────────────────────────────────────────────

/** Traffic-light palette for chatter state. */
const COLOR_STABLE = "#22c55e";     // green
const COLOR_MARGINAL = "#eab308";   // amber
const COLOR_UNSTABLE = "#dc2626";   // red
const COLOR_TRANSITION = "#d946ef"; // magenta — state flip this frame

/** Minimum margin below which a "stable" frame is reclassified as marginal.
 *  Empirical safety band from Schmitz & Smith (2009), Table 5.2. */
const MARGINAL_BAND = 0.15;

// ── Internal State ───────────────────────────────────────────────────────────

interface SessionTrack {
  /** Last classified state, for transition detection */
  last_state: ChatterState | null;
  stats: SLDOverlayStats;
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
        stable_count: 0,
        marginal_count: 0,
        unstable_count: 0,
        transition_count: 0,
        min_stability_margin: Infinity,
        last_unstable_time_s: null,
        last_recommended_rpm: null,
      },
    };
    tracks.set(session_id, track);
  }
  return track;
}

/**
 * Classify the chatter state given the upstream `overlay.chatter` object and
 * an empirical marginal band. PRISMVerificationPluginEngine emits one of
 * {stable, marginal, unstable}; we refine using margin and detect transitions.
 */
function classifyState(
  upstreamStatus: "stable" | "marginal" | "unstable",
  stabilityMargin: number,
): ChatterState {
  if (upstreamStatus === "unstable") return "unstable";
  if (upstreamStatus === "marginal") return "marginal";
  // stable — but if margin is inside the empirical band, promote to marginal
  if (stabilityMargin < MARGINAL_BAND) return "marginal";
  return "stable";
}

function baseColorFor(state: ChatterState): string {
  switch (state) {
    case "stable":     return COLOR_STABLE;
    case "marginal":   return COLOR_MARGINAL;
    case "unstable":   return COLOR_UNSTABLE;
    case "transition": return COLOR_TRANSITION;
  }
}

/** A transition is any state change between consecutive frames. */
function detectTransition(prev: ChatterState | null, curr: ChatterState): boolean {
  if (prev === null) return false;
  return prev !== curr;
}

function encodeForTarget(target: SLDOverlayTarget, frame: {
  operation_id: string;
  rpm: number;
  state: ChatterState;
  color_hex: string;
  stability_margin: number;
  recommended_rpm: number | null;
  transition: boolean;
  position: { x: number; y: number; z: number };
}): string {
  switch (target) {
    case "hypermill":
      return (
        `<methodCall><methodName>PRISM.SLDOverlay</methodName>` +
        `<params>` +
        `<param><value><string>${frame.operation_id}</string></value></param>` +
        `<param><value><double>${frame.rpm.toFixed(1)}</double></value></param>` +
        `<param><value><string>${frame.state}</string></value></param>` +
        `<param><value><string>${frame.color_hex}</string></value></param>` +
        `<param><value><double>${frame.stability_margin.toFixed(3)}</double></value></param>` +
        `<param><value><double>${(frame.recommended_rpm ?? 0).toFixed(1)}</double></value></param>` +
        `<param><value><boolean>${frame.transition ? 1 : 0}</boolean></value></param>` +
        `</params></methodCall>`
      );
    case "fusion360":
      return JSON.stringify({
        jsonrpc: "2.0",
        method: "cam.sldOverlay",
        params: {
          operationId: frame.operation_id,
          rpm: frame.rpm,
          state: frame.state,
          colorHex: frame.color_hex,
          stabilityMargin: frame.stability_margin,
          recommendedRpm: frame.recommended_rpm,
          transition: frame.transition,
          position: frame.position,
        },
      });
    case "inventor_hsm":
      return JSON.stringify({
        type: "hsm.sldOverlay",
        operationId: frame.operation_id,
        rpm: frame.rpm,
        state: frame.state,
        color: frame.color_hex,
        margin: frame.stability_margin,
        recommendedRpm: frame.recommended_rpm,
        transition: frame.transition,
      });
    case "mastercam":
      return (
        `SLD|${frame.operation_id}|${frame.rpm.toFixed(1)}|` +
        `${frame.state}|${frame.color_hex}|${frame.stability_margin.toFixed(3)}|` +
        `${frame.recommended_rpm ?? ""}|${frame.transition ? 1 : 0}`
      );
    case "generic":
    default:
      return JSON.stringify({
        type: "sld_overlay",
        operation_id: frame.operation_id,
        rpm: frame.rpm,
        state: frame.state,
        color_hex: frame.color_hex,
        stability_margin: frame.stability_margin,
        recommended_rpm: frame.recommended_rpm,
        transition: frame.transition,
        position: frame.position,
      });
  }
}

// ── Engine Class ─────────────────────────────────────────────────────────────

export class SLDOverlayEngine {
  /**
   * Render a single SLD overlay frame from an OperationPoint and its
   * associated PhysicsOverlay (as returned by
   * PRISMVerificationPluginEngine.analyzePoint).
   */
  static renderFrame(
    session_id: string,
    point: OperationPoint,
    overlay: PhysicsOverlay,
    target: SLDOverlayTarget = "generic",
  ): SLDOverlayFrame {
    // Validate at the boundary
    OperationPointSchema.parse(point);
    PhysicsOverlaySchema.parse(overlay);

    const { chatter } = overlay;

    const classified = classifyState(chatter.status, chatter.stability_margin);
    const track = ensureTrack(session_id);
    const isTransition = detectTransition(track.last_state, classified);
    const state: ChatterState = isTransition ? "transition" : classified;
    const color_hex = baseColorFor(state);

    const payload = encodeForTarget(target, {
      operation_id: point.operation_id,
      rpm: point.cutting.spindle_rpm,
      state,
      color_hex,
      stability_margin: chatter.stability_margin,
      recommended_rpm: chatter.recommended_rpm ?? null,
      transition: isTransition,
      position: point.position,
    });

    // Update stats
    track.stats.frames += 1;
    if (classified === "stable")   track.stats.stable_count += 1;
    if (classified === "marginal") track.stats.marginal_count += 1;
    if (classified === "unstable") {
      track.stats.unstable_count += 1;
      track.stats.last_unstable_time_s = point.time_s;
    }
    if (isTransition) track.stats.transition_count += 1;
    track.stats.min_stability_margin = Math.min(
      track.stats.min_stability_margin,
      chatter.stability_margin,
    );
    if (chatter.recommended_rpm !== undefined) {
      track.stats.last_recommended_rpm = chatter.recommended_rpm;
    }

    // Remember classified (not "transition") state so we can detect further flips
    track.last_state = classified;

    return {
      session_id,
      operation_id: point.operation_id,
      time_s: point.time_s,
      position: point.position,
      rpm: point.cutting.spindle_rpm,
      state,
      color_hex,
      stability_margin: chatter.stability_margin,
      recommended_rpm: chatter.recommended_rpm ?? null,
      transition: isTransition,
      payload,
      target,
    };
  }

  /**
   * Snapshot the running aggregate for a session. Safe to call at any time.
   */
  static getStats(session_id: string): SLDOverlayStats {
    const track = tracks.get(session_id);
    if (!track) {
      return {
        frames: 0,
        stable_count: 0,
        marginal_count: 0,
        unstable_count: 0,
        transition_count: 0,
        min_stability_margin: Infinity,
        last_unstable_time_s: null,
        last_recommended_rpm: null,
      };
    }
    return { ...track.stats };
  }

  /** Discard all state for a session. */
  static resetSession(session_id: string): void {
    tracks.delete(session_id);
  }

  /** List the plugin targets this engine can encode for. */
  static supportedTargets(): SLDOverlayTarget[] {
    return ["hypermill", "fusion360", "inventor_hsm", "mastercam", "generic"];
  }
}

export const sldOverlayEngine = SLDOverlayEngine;
