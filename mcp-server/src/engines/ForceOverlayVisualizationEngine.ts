/**
 * ForceOverlayVisualizationEngine — Real-time Force Prediction Overlay (U-CAM90)
 * =================================================================================
 *
 * PHASE-7 Intelligent Vericut: Real-time cutting force visualization for the four
 * CAM plugin adapters (hyperMILL, Fusion 360, Inventor HSM, Mastercam X8). Consumes
 * the PhysicsOverlay stream emitted by PRISMVerificationPluginEngine.analyzePoint()
 * and produces render-ready frames with:
 *
 *   1. Color-coded force magnitude (green/yellow/red gradient, hex output)
 *   2. Sliding-window peak detection (local maxima above a peak threshold)
 *   3. Peak alert emission (alert level NOMINAL | WARNING | CRITICAL | PEAK)
 *   4. Per-plugin frame encoding (XML-RPC / JSON-RPC / NET-Hook / COM)
 *   5. Session aggregate rollup (max, mean, peak count, critical count)
 *
 * Architecture (downstream of U-CAM85, consumed by U-CAM86-89 adapters):
 *
 *     OperationPoint ──► PRISMVerificationPluginEngine.analyzePoint()
 *                                      │
 *                                      ▼ PhysicsOverlay
 *                     ForceOverlayVisualizationEngine.renderFrame()
 *                                      │
 *                                      ▼ ForceOverlayFrame
 *                     [HyperMill | Fusion360 | InventorHSM | Mastercam] Adapter
 *
 * Force thresholds are derived from the Kienzle canonical constants (via
 * PRISMVerificationPluginEngine) — this engine never inlines physics values.
 *
 * References:
 *   - Kienzle: Fc = kc1_1 · ap · fz^(1-mc) — see constants.ts / ISO 3685
 *   - Peak detection: three-point local maximum over a rolling window
 *     (Savitzky-Golay analogue; equivalent to Press et al., Numerical Recipes §14.8)
 *   - Color interpolation: linear RGB blend between anchor points in [0,1]^3 space
 *
 * @module engines/ForceOverlayVisualizationEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM90
 */

import { z } from "zod";
import { CANONICAL_KIENZLE } from "../physics/constants.js";
import {
  OperationPointSchema,
  PhysicsOverlaySchema,
  type OperationPoint,
  type PhysicsOverlay,
} from "./PRISMVerificationPluginEngine.js";

// ── Schemas ──────────────────────────────────────────────────────────────────

/** Color in sRGB hex form (`#rrggbb`) */
export const HexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/** Alert level ordered by severity */
export const AlertLevelSchema = z.enum([
  "nominal",   // green, below warning threshold
  "warning",   // yellow, between warning and critical
  "critical",  // red, above critical threshold
  "peak",      // magenta, local maximum detected (overrides when applicable)
]);
export type AlertLevel = z.infer<typeof AlertLevelSchema>;

/** Plugin target for encoding-specific frame formatting */
export const OverlayTargetSchema = z.enum([
  "hypermill",
  "fusion360",
  "inventor_hsm",
  "mastercam",
  "generic",
]);
export type OverlayTarget = z.infer<typeof OverlayTargetSchema>;

/** Single rendered frame — one point in the CAM simulation viewport */
export const ForceOverlayFrameSchema = z.object({
  session_id: z.string(),
  operation_id: z.string(),
  time_s: z.number(),
  /** World-space position matching the OperationPoint */
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  /** Cutting force magnitude [N] */
  force_n: z.number(),
  /** Force magnitude normalized to [0, 1] against critical threshold */
  normalized: z.number().min(0).max(1),
  /** Render color (hex `#rrggbb`) computed from gradient */
  color_hex: HexColorSchema,
  /** Alert severity used by plugin UIs for badges / sirens */
  alert_level: AlertLevelSchema,
  /** True if this frame is a local maximum within the rolling window */
  peak_detected: z.boolean(),
  /** Threshold reference carried for plugin tooltip rendering */
  thresholds: z.object({
    warning_n: z.number(),
    critical_n: z.number(),
    peak_n: z.number(),
  }),
  /** Encoded payload for the specific plugin target */
  payload: z.string(),
  /** Plugin target associated with `payload` */
  target: OverlayTargetSchema,
});
export type ForceOverlayFrame = z.infer<typeof ForceOverlayFrameSchema>;

/** Session-scoped force aggregate, maintained across calls */
export const ForceOverlayStatsSchema = z.object({
  frames: z.number(),
  max_force_n: z.number(),
  mean_force_n: z.number(),
  peak_count: z.number(),
  warning_count: z.number(),
  critical_count: z.number(),
  last_peak_time_s: z.number().nullable(),
});
export type ForceOverlayStats = z.infer<typeof ForceOverlayStatsSchema>;

/** Per-adapter color palette anchors */
export interface PaletteAnchor {
  /** Normalized force magnitude at this anchor */
  t: number;
  /** Anchor color components in sRGB [0, 255] */
  r: number;
  g: number;
  b: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

/**
 * Default gradient anchors — traffic-light palette with an amber mid-band.
 * Chosen to match the hard-stop thresholds used by PRISMVerificationPluginEngine
 * (warning ≈ 500 N, critical ≈ 1000 N). At normalized=1.0 the frame will read as
 * critical, which is the upper bound before the safety hook fires.
 */
const DEFAULT_PALETTE: readonly PaletteAnchor[] = Object.freeze([
  { t: 0.0,  r: 0x22, g: 0xc5, b: 0x5e }, // #22c55e — nominal green
  { t: 0.5,  r: 0xea, g: 0xb3, b: 0x08 }, // #eab308 — caution amber
  { t: 1.0,  r: 0xdc, g: 0x26, b: 0x26 }, // #dc2626 — critical red
]);

/** Peak detection rolling-window length (frames). Odd for symmetric midpoint. */
const PEAK_WINDOW = 5;

/** Peak detection minimum prominence as a fraction of critical threshold */
const PEAK_MIN_PROMINENCE = 0.1;

/** Peak override color (magenta) — distinguishes peak from generic critical */
const PEAK_COLOR_HEX = "#d946ef";

/** Maximum absolute force (N) above which canonical Kienzle models are outside
 *  their tested domain — hard-caps the normalization denominator to avoid
 *  visual saturation under unrealistic inputs. Source: Sandvik Coromant general
 *  turning reference range. */
const MAX_REASONABLE_FORCE_N = 50_000;

// ── Internal State ───────────────────────────────────────────────────────────

interface SessionTrack {
  /** Rolling force history (oldest first) */
  history: number[];
  /** Frames to look back for comparing midpoint against neighbors */
  stats: ForceOverlayStats;
  /** Sum for incremental mean calculation */
  force_sum: number;
}

const tracks = new Map<string, SessionTrack>();

// ── Helpers ──────────────────────────────────────────────────────────────────

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function toHex(n: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(n)));
  return clamped.toString(16).padStart(2, "0");
}

/**
 * Linearly interpolate between the two palette anchors bracketing `t`.
 * @param t normalized value in [0, 1]
 * @param palette ordered anchors with strictly increasing `t`
 * @returns `#rrggbb`
 */
function interpolateColor(t: number, palette: readonly PaletteAnchor[]): string {
  const clamped = clamp01(t);
  for (let i = 1; i < palette.length; i++) {
    const a = palette[i - 1];
    const b = palette[i];
    if (clamped <= b.t) {
      const span = b.t - a.t || 1;
      const local = (clamped - a.t) / span;
      const r = a.r + (b.r - a.r) * local;
      const g = a.g + (b.g - a.g) * local;
      const bl = a.b + (b.b - a.b) * local;
      return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
    }
  }
  const last = palette[palette.length - 1];
  return `#${toHex(last.r)}${toHex(last.g)}${toHex(last.b)}`;
}

/**
 * Causal rising-edge peak detector over a trailing window. Returns true iff
 * the most recent sample (the current frame) strictly dominates every earlier
 * sample in the window by at least `PEAK_MIN_PROMINENCE * criticalN`.
 *
 * Real-time streaming detection: future samples are unavailable, so the peak
 * is declared the moment force magnitude rises above all recent history by
 * the prominence margin. Downstream alert suppression is the adapter's job.
 */
function isLocalPeak(history: number[], criticalN: number): boolean {
  if (history.length < PEAK_WINDOW) return false;
  const current = history[history.length - 1];
  const prominence = criticalN * PEAK_MIN_PROMINENCE;
  for (let i = history.length - PEAK_WINDOW; i < history.length - 1; i++) {
    if (history[i] + prominence > current) return false;
  }
  return true;
}

function encodeForTarget(target: OverlayTarget, frame: {
  operation_id: string;
  force_n: number;
  color_hex: string;
  alert_level: AlertLevel;
  peak_detected: boolean;
  position: { x: number; y: number; z: number };
}): string {
  switch (target) {
    // hyperMILL: XML-RPC over COM (see HyperMillPluginAdapterEngine)
    case "hypermill":
      return (
        `<methodCall><methodName>PRISM.ForceOverlay</methodName>` +
        `<params>` +
        `<param><value><string>${frame.operation_id}</string></value></param>` +
        `<param><value><double>${frame.force_n.toFixed(2)}</double></value></param>` +
        `<param><value><string>${frame.color_hex}</string></value></param>` +
        `<param><value><string>${frame.alert_level}</string></value></param>` +
        `<param><value><boolean>${frame.peak_detected ? 1 : 0}</boolean></value></param>` +
        `</params></methodCall>`
      );
    // Fusion 360: JSON-RPC 2.0 over WebSocket
    case "fusion360":
      return JSON.stringify({
        jsonrpc: "2.0",
        method: "cam.forceOverlay",
        params: {
          operationId: frame.operation_id,
          forceN: frame.force_n,
          colorHex: frame.color_hex,
          alertLevel: frame.alert_level,
          peak: frame.peak_detected,
          position: frame.position,
        },
      });
    // Inventor HSM: COM payload (property bag as JSON over named pipe)
    case "inventor_hsm":
      return JSON.stringify({
        type: "hsm.forceOverlay",
        operationId: frame.operation_id,
        force: frame.force_n,
        color: frame.color_hex,
        alert: frame.alert_level,
        peak: frame.peak_detected,
      });
    // Mastercam X8 NET-Hook: pipe-delimited record (tree icon expects compact
    // format for sub-ms updates; see MastercamPluginAdapterEngine)
    case "mastercam":
      return (
        `FORCE|${frame.operation_id}|${frame.force_n.toFixed(2)}|` +
        `${frame.color_hex}|${frame.alert_level}|${frame.peak_detected ? 1 : 0}`
      );
    case "generic":
    default:
      return JSON.stringify({
        type: "force_overlay",
        operation_id: frame.operation_id,
        force_n: frame.force_n,
        color_hex: frame.color_hex,
        alert_level: frame.alert_level,
        peak_detected: frame.peak_detected,
        position: frame.position,
      });
  }
}

function classify(
  force_n: number,
  warning: number,
  critical: number,
  peakDetected: boolean,
): AlertLevel {
  if (peakDetected) return "peak";
  if (force_n >= critical) return "critical";
  if (force_n >= warning) return "warning";
  return "nominal";
}

function ensureTrack(session_id: string): SessionTrack {
  let track = tracks.get(session_id);
  if (!track) {
    track = {
      history: [],
      stats: {
        frames: 0,
        max_force_n: 0,
        mean_force_n: 0,
        peak_count: 0,
        warning_count: 0,
        critical_count: 0,
        last_peak_time_s: null,
      },
      force_sum: 0,
    };
    tracks.set(session_id, track);
  }
  return track;
}

// ── Engine Class ─────────────────────────────────────────────────────────────

export class ForceOverlayVisualizationEngine {
  /**
   * Render a single overlay frame from an OperationPoint and its associated
   * PhysicsOverlay (as returned by PRISMVerificationPluginEngine.analyzePoint).
   *
   * @param session_id verification session identifier (same as upstream)
   * @param point CAM simulation sample — position, cutting params, tool, material
   * @param overlay physics overlay produced by the verification plugin
   * @param target plugin target for payload encoding (defaults to generic)
   * @returns render-ready frame for the named plugin
   */
  static renderFrame(
    session_id: string,
    point: OperationPoint,
    overlay: PhysicsOverlay,
    target: OverlayTarget = "generic",
  ): ForceOverlayFrame {
    // Validate at the boundary
    OperationPointSchema.parse(point);
    PhysicsOverlaySchema.parse(overlay);

    const { force } = overlay;
    const warning_n = force.warning_threshold;
    const critical_n = force.critical_threshold;
    // Peak threshold = 90% of critical (configurable upstream via overlay thresholds)
    const peak_n = critical_n * 0.9;

    const denom = Math.min(critical_n, MAX_REASONABLE_FORCE_N);
    const normalized = clamp01(force.value / denom);

    const track = ensureTrack(session_id);
    track.history.push(force.value);
    if (track.history.length > PEAK_WINDOW * 2) {
      track.history.shift();
    }

    const peakDetected =
      force.value >= peak_n && isLocalPeak(track.history, critical_n);

    const alert_level = classify(force.value, warning_n, critical_n, peakDetected);
    const color_hex = peakDetected
      ? PEAK_COLOR_HEX
      : interpolateColor(normalized, DEFAULT_PALETTE);

    const payload = encodeForTarget(target, {
      operation_id: point.operation_id,
      force_n: force.value,
      color_hex,
      alert_level,
      peak_detected: peakDetected,
      position: point.position,
    });

    // Update session stats
    track.stats.frames += 1;
    track.force_sum += force.value;
    track.stats.max_force_n = Math.max(track.stats.max_force_n, force.value);
    track.stats.mean_force_n = track.force_sum / track.stats.frames;
    if (peakDetected) {
      track.stats.peak_count += 1;
      track.stats.last_peak_time_s = point.time_s;
    }
    if (alert_level === "warning") track.stats.warning_count += 1;
    if (alert_level === "critical") track.stats.critical_count += 1;

    return {
      session_id,
      operation_id: point.operation_id,
      time_s: point.time_s,
      position: point.position,
      force_n: force.value,
      normalized,
      color_hex,
      alert_level,
      peak_detected: peakDetected,
      thresholds: { warning_n, critical_n, peak_n },
      payload,
      target,
    };
  }

  /**
   * Snapshot the running aggregate for a session. Safe to call at any time.
   * Returns a frozen copy — callers cannot mutate internal state.
   */
  static getStats(session_id: string): ForceOverlayStats {
    const track = tracks.get(session_id);
    if (!track) {
      return {
        frames: 0,
        max_force_n: 0,
        mean_force_n: 0,
        peak_count: 0,
        warning_count: 0,
        critical_count: 0,
        last_peak_time_s: null,
      };
    }
    return { ...track.stats };
  }

  /**
   * Discard all state for a session. Called when the CAM plugin closes the
   * verification session or switches parts.
   */
  static resetSession(session_id: string): void {
    tracks.delete(session_id);
  }

  /**
   * Compute the expected peak threshold for a material group. Useful for
   * plugin UI pre-configuration before a session starts. Derived directly
   * from canonical Kienzle (no inline constants).
   *
   * @param iso_group material ISO group (P, M, K, N, S, H)
   * @param ap axial depth of cut [mm]
   * @param fz feed per tooth [mm]
   * @returns nominal Kienzle force [N] at the given operating point
   */
  static expectedKienzleForce(
    iso_group: keyof typeof CANONICAL_KIENZLE,
    ap: number,
    fz: number,
  ): number {
    if (!(iso_group in CANONICAL_KIENZLE)) {
      throw new Error(`Unknown ISO group: ${iso_group}`);
    }
    if (ap <= 0 || fz <= 0) {
      throw new Error(`Non-positive cutting params: ap=${ap}, fz=${fz}`);
    }
    const { kc1_1, mc } = CANONICAL_KIENZLE[iso_group];
    // Fc = kc1_1 · ap · fz^(1-mc)
    return kc1_1 * ap * Math.pow(fz, 1 - mc);
  }

  /**
   * List the plugin targets this engine can encode for. Matches the adapters
   * created in U-CAM86-U-CAM89.
   */
  static supportedTargets(): OverlayTarget[] {
    return ["hypermill", "fusion360", "inventor_hsm", "mastercam", "generic"];
  }

  /** Test-only helper — exposes the rolling history for a session */
  static _peekHistory(session_id: string): number[] {
    return [...(tracks.get(session_id)?.history ?? [])];
  }
}

export const forceOverlayVisualizationEngine = ForceOverlayVisualizationEngine;
