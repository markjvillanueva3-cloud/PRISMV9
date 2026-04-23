/**
 * SafetyScoreOverlayEngine — Real-time S(x) Composite Safety Index Overlay (U-CAM95)
 * ===================================================================================
 *
 * PHASE-7 Intelligent Vericut: Real-time composite safety-score visualization
 * for the four CAM plugin adapters (hyperMILL, Fusion 360, Inventor HSM,
 * Mastercam X8). Consumes the `safety_score` sub-object of the PhysicsOverlay
 * emitted by PRISMVerificationPluginEngine.analyzePoint() — this is the
 * overall traffic-light output of the safety chain, with per-component
 * contributions from force, stability, deflection, thermal, and tool_life.
 *
 * S(x) bands (hard traffic-light semantics):
 *   green     → S >= 0.85        — system nominal
 *   yellow    → 0.70 <= S < 0.85 — elevated risk, operator attention
 *   red       → S < 0.70         — hard-stop zone
 *   transition → magenta         — band flip detected this frame
 *
 * Hard-stop mechanism:
 *   The frame's `hard_stop` flag is TRUE whenever either
 *     (a) the upstream PhysicsOverlay.safety_score.hard_stop flag is set, OR
 *     (b) the classified band is `red` (S < 0.70)
 *   downstream plugin adapters MUST honor this flag and halt toolpath
 *   execution. The session stats track the first and most recent hard-stop
 *   events so the post-run report can pinpoint the offending cut.
 *
 * Architecture (downstream of U-CAM85, consumed by U-CAM86-89 adapters):
 *
 *     OperationPoint ──► PRISMVerificationPluginEngine.analyzePoint()
 *                                      │
 *                                      ▼ PhysicsOverlay.safety_score (S(x))
 *                       SafetyScoreOverlayEngine.renderFrame()
 *                                      │
 *                                      ▼ SafetyScoreOverlayFrame (+ hard_stop)
 *                     [HyperMill | Fusion360 | InventorHSM | Mastercam] Adapter
 *
 * References:
 *   - ISO 16090-1:2017 — Machine tools safety — Machining centres
 *   - ANSI B11.0-2020 — Safety of Machinery — General Requirements and Risk
 *     Assessment (composite-risk scoring model for machinery)
 *   - Yim, D.S. & Kim, H.S., "Machining Safety Index Computation", IJPR (2014)
 *
 * @module engines/SafetyScoreOverlayEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM95
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

/** S(x) band classification */
export const SafetyBandSchema = z.enum([
  "green",       // S >= 0.85 — nominal
  "yellow",      // 0.70 <= S < 0.85 — elevated risk
  "red",         // S < 0.70 — hard-stop zone
  "transition",  // band flip this frame
]);
export type SafetyBand = z.infer<typeof SafetyBandSchema>;

/** Plugin target for encoding-specific frame formatting */
export const SafetyScoreOverlayTargetSchema = z.enum([
  "hypermill",
  "fusion360",
  "inventor_hsm",
  "mastercam",
  "generic",
]);
export type SafetyScoreOverlayTarget = z.infer<typeof SafetyScoreOverlayTargetSchema>;

/** Single rendered S(x) overlay frame */
export const SafetyScoreOverlayFrameSchema = z.object({
  session_id: z.string(),
  operation_id: z.string(),
  time_s: z.number(),
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  /** Composite S(x) score [0..1] */
  safety_score: z.number().min(0).max(1),
  /** Per-component decomposition of S(x) */
  components: z.object({
    force: z.number(),
    stability: z.number(),
    deflection: z.number(),
    thermal: z.number(),
    tool_life: z.number(),
  }),
  /** Upstream verdict (independent of band mapping) */
  verdict: z.enum(["PASS", "WARNING", "FAIL"]),
  /** True when adapter MUST halt toolpath execution */
  hard_stop: z.boolean(),
  /** Classified visual band */
  band: SafetyBandSchema,
  /** Render color (hex `#rrggbb`) */
  color_hex: HexColorSchema,
  /** True iff this frame is a band transition vs the previous frame */
  transition: z.boolean(),
  /** Encoded payload for the specific plugin target */
  payload: z.string(),
  /** Plugin target associated with `payload` */
  target: SafetyScoreOverlayTargetSchema,
});
export type SafetyScoreOverlayFrame = z.infer<typeof SafetyScoreOverlayFrameSchema>;

/** Session-scoped S(x) aggregate */
export const SafetyScoreOverlayStatsSchema = z.object({
  frames: z.number(),
  green_count: z.number(),
  yellow_count: z.number(),
  red_count: z.number(),
  transition_count: z.number(),
  hard_stop_count: z.number(),
  min_safety_score: z.number(),
  max_safety_score: z.number(),
  first_hard_stop_time_s: z.number().nullable(),
  last_hard_stop_time_s: z.number().nullable(),
  verdict_pass_count: z.number(),
  verdict_warning_count: z.number(),
  verdict_fail_count: z.number(),
});
export type SafetyScoreOverlayStats = z.infer<typeof SafetyScoreOverlayStatsSchema>;

// ── Constants ────────────────────────────────────────────────────────────────

// Traffic-light thresholds per U-CAM95 envelope
export const GREEN_THRESHOLD = 0.85;
export const YELLOW_THRESHOLD = 0.70;

const COLOR_GREEN = "#22c55e";
const COLOR_YELLOW = "#eab308";
const COLOR_RED = "#dc2626";
const COLOR_TRANSITION = "#d946ef";

// ── Internal State ───────────────────────────────────────────────────────────

type ClassifiedSafetyBand = Exclude<SafetyBand, "transition">;

interface SessionTrack {
  last_band: ClassifiedSafetyBand | null;
  stats: SafetyScoreOverlayStats;
}

const tracks = new Map<string, SessionTrack>();

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEmptyStats(): SafetyScoreOverlayStats {
  return {
    frames: 0,
    green_count: 0,
    yellow_count: 0,
    red_count: 0,
    transition_count: 0,
    hard_stop_count: 0,
    min_safety_score: Infinity,
    max_safety_score: -Infinity,
    first_hard_stop_time_s: null,
    last_hard_stop_time_s: null,
    verdict_pass_count: 0,
    verdict_warning_count: 0,
    verdict_fail_count: 0,
  };
}

function ensureTrack(session_id: string): SessionTrack {
  let track = tracks.get(session_id);
  if (!track) {
    track = { last_band: null, stats: makeEmptyStats() };
    tracks.set(session_id, track);
  }
  return track;
}

function classifyBand(score: number): ClassifiedSafetyBand {
  if (score >= GREEN_THRESHOLD) return "green";
  if (score >= YELLOW_THRESHOLD) return "yellow";
  return "red";
}

function baseColorFor(band: SafetyBand): string {
  switch (band) {
    case "green":      return COLOR_GREEN;
    case "yellow":     return COLOR_YELLOW;
    case "red":        return COLOR_RED;
    case "transition": return COLOR_TRANSITION;
  }
}

function detectTransition(
  prev: ClassifiedSafetyBand | null,
  curr: ClassifiedSafetyBand,
): boolean {
  if (prev === null) return false;
  return prev !== curr;
}

function encodeForTarget(
  target: SafetyScoreOverlayTarget,
  frame: {
    operation_id: string;
    safety_score: number;
    components: {
      force: number; stability: number; deflection: number;
      thermal: number; tool_life: number;
    };
    verdict: "PASS" | "WARNING" | "FAIL";
    hard_stop: boolean;
    band: SafetyBand;
    color_hex: string;
    transition: boolean;
    position: { x: number; y: number; z: number };
  },
): string {
  switch (target) {
    case "hypermill":
      return (
        `<methodCall><methodName>PRISM.SafetyScoreOverlay</methodName>` +
        `<params>` +
        `<param><value><string>${frame.operation_id}</string></value></param>` +
        `<param><value><double>${frame.safety_score.toFixed(3)}</double></value></param>` +
        `<param><value><string>${frame.band}</string></value></param>` +
        `<param><value><string>${frame.verdict}</string></value></param>` +
        `<param><value><string>${frame.color_hex}</string></value></param>` +
        `<param><value><boolean>${frame.hard_stop ? 1 : 0}</boolean></value></param>` +
        `<param><value><boolean>${frame.transition ? 1 : 0}</boolean></value></param>` +
        `</params></methodCall>`
      );
    case "fusion360":
      return JSON.stringify({
        jsonrpc: "2.0",
        method: "cam.safetyScoreOverlay",
        params: {
          operationId: frame.operation_id,
          safetyScore: frame.safety_score,
          components: frame.components,
          verdict: frame.verdict,
          hardStop: frame.hard_stop,
          band: frame.band,
          colorHex: frame.color_hex,
          transition: frame.transition,
          position: frame.position,
        },
      });
    case "inventor_hsm":
      return JSON.stringify({
        type: "hsm.safetyScoreOverlay",
        operationId: frame.operation_id,
        safetyScore: frame.safety_score,
        components: frame.components,
        verdict: frame.verdict,
        hardStop: frame.hard_stop,
        band: frame.band,
        color: frame.color_hex,
        transition: frame.transition,
      });
    case "mastercam":
      return (
        `SAFE|${frame.operation_id}|${frame.safety_score.toFixed(3)}|` +
        `${frame.band}|${frame.verdict}|${frame.color_hex}|` +
        `${frame.hard_stop ? 1 : 0}|${frame.transition ? 1 : 0}`
      );
    case "generic":
    default:
      return JSON.stringify({
        type: "safety_score_overlay",
        operation_id: frame.operation_id,
        safety_score: frame.safety_score,
        components: frame.components,
        verdict: frame.verdict,
        hard_stop: frame.hard_stop,
        band: frame.band,
        color_hex: frame.color_hex,
        transition: frame.transition,
        position: frame.position,
      });
  }
}

// ── Engine Class ─────────────────────────────────────────────────────────────

export class SafetyScoreOverlayEngine {
  /** Band thresholds, exported for documentation / cross-engine alignment. */
  static readonly GREEN_THRESHOLD = GREEN_THRESHOLD;
  static readonly YELLOW_THRESHOLD = YELLOW_THRESHOLD;

  /**
   * Render a single S(x) overlay frame from an OperationPoint and its
   * associated PhysicsOverlay. Hard-stop is asserted whenever the upstream
   * safety_score.hard_stop flag is set OR the classified band is `red`.
   */
  static renderFrame(
    session_id: string,
    point: OperationPoint,
    overlay: PhysicsOverlay,
    target: SafetyScoreOverlayTarget = "generic",
  ): SafetyScoreOverlayFrame {
    OperationPointSchema.parse(point);
    PhysicsOverlaySchema.parse(overlay);

    const { safety_score } = overlay;
    const classified: ClassifiedSafetyBand = classifyBand(safety_score.value);
    const hard_stop = safety_score.hard_stop || classified === "red";

    const track = ensureTrack(session_id);
    const isTransition = detectTransition(track.last_band, classified);
    const band: SafetyBand = isTransition ? "transition" : classified;
    const color_hex = baseColorFor(band);

    const payload = encodeForTarget(target, {
      operation_id: point.operation_id,
      safety_score: safety_score.value,
      components: safety_score.components,
      verdict: safety_score.verdict,
      hard_stop,
      band,
      color_hex,
      transition: isTransition,
      position: point.position,
    });

    // Update stats
    track.stats.frames += 1;
    if (classified === "green")  track.stats.green_count += 1;
    if (classified === "yellow") track.stats.yellow_count += 1;
    if (classified === "red")    track.stats.red_count += 1;
    if (isTransition) track.stats.transition_count += 1;
    if (hard_stop) {
      track.stats.hard_stop_count += 1;
      if (track.stats.first_hard_stop_time_s === null) {
        track.stats.first_hard_stop_time_s = point.time_s;
      }
      track.stats.last_hard_stop_time_s = point.time_s;
    }
    if (safety_score.verdict === "PASS")    track.stats.verdict_pass_count += 1;
    if (safety_score.verdict === "WARNING") track.stats.verdict_warning_count += 1;
    if (safety_score.verdict === "FAIL")    track.stats.verdict_fail_count += 1;
    track.stats.min_safety_score = Math.min(
      track.stats.min_safety_score,
      safety_score.value,
    );
    track.stats.max_safety_score = Math.max(
      track.stats.max_safety_score,
      safety_score.value,
    );

    track.last_band = classified;

    return {
      session_id,
      operation_id: point.operation_id,
      time_s: point.time_s,
      position: point.position,
      safety_score: safety_score.value,
      components: safety_score.components,
      verdict: safety_score.verdict,
      hard_stop,
      band,
      color_hex,
      transition: isTransition,
      payload,
      target,
    };
  }

  /** Snapshot the running aggregate for a session. */
  static getStats(session_id: string): SafetyScoreOverlayStats {
    const track = tracks.get(session_id);
    if (!track) return makeEmptyStats();
    return { ...track.stats };
  }

  /** Discard all state for a session. */
  static resetSession(session_id: string): void {
    tracks.delete(session_id);
  }

  /** List the plugin targets this engine can encode for. */
  static supportedTargets(): SafetyScoreOverlayTarget[] {
    return ["hypermill", "fusion360", "inventor_hsm", "mastercam", "generic"];
  }

  /** Classify a raw S(x) value into its traffic-light band (pure, no state). */
  static classify(score: number): ClassifiedSafetyBand {
    return classifyBand(score);
  }
}

export const safetyScoreOverlayEngine = SafetyScoreOverlayEngine;
