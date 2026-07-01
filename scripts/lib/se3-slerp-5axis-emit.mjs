/**
 * se3-slerp-5axis-emit.mjs — SE(3) screw-motion interpolation between
 * two 5-axis machine frames. Translation via linear lerp, rotation via
 * quaternion SLERP (shortest-arc, small-angle-guarded). Emits N
 * intermediate frames as dialect-aware G1 X..Y..Z..A..B..C.. lines.
 *
 * Why "SE3 SLERP at emit" (PRISM-only differentiator):
 *   Naive 5-axis posts linearly interpolate rotary axes in joint space.
 *   For non-aligned start/end frames this produces NON-RIGID-BODY motion
 *   (the tool-axis traces a curved path through Cartesian space — a
 *   "gimbal arc" — instead of the straight-line tool-axis sweep the
 *   programmer intended). SE3 SLERP guarantees rigid-body screw motion
 *   between the two endpoint frames: the tool-tip orientation interpolates
 *   along the geodesic in SO(3), and translation along the straight line
 *   in R³.
 *
 *   Echo-soul: pure-geometric / kinematic. NO inline cutting physics.
 *   The endpoint frames come from upstream toolpath generation; this lib
 *   only computes the interpolated intermediate frames + dialect emit.
 *
 * Frame convention:
 *   Frame = { position: [x, y, z], quaternion: [w, x, y, z] (Hamilton) }
 *   Quaternion = [w, vx, vy, vz] with w = cos(θ/2), v = sin(θ/2)·axis.
 *   Euler emit = intrinsic Z-Y-X (most common for 5-axis A/B/C tables):
 *     roll  = rotation about X (A-axis)
 *     pitch = rotation about Y (B-axis)
 *     yaw   = rotation about Z (C-axis)
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-EMIT-SE3-SLERP-5AXIS-INTERP
 * @phase 6 EMIT-side · @row 36 · @effort 3d
 * @slot echo · @date 2026-05-27
 */

export const SE3_SLERP_EMIT_SCHEMA_VERSION = 1;

export const DEFAULT_DECIMAL_PLACES = 4;

/** Below this dot-product, SLERP falls back to LERP to avoid sin(0) singularity. */
export const SMALL_ANGLE_DOT_THRESHOLD = 0.9995;

/** Max intermediate steps (guards runaway emit on bad N). */
export const MAX_INTERP_STEPS = 1024;

export const SUPPORTED_DIALECTS = ["fanuc", "haas", "heidenhain", "mitsubishi", "siemens"];

/** Default rotary-axis mapping: roll→A, pitch→B, yaw→C. */
export const DEFAULT_ROTARY_AXIS_MAP = { roll: "A", pitch: "B", yaw: "C" };

const COMMENT_DELIMITERS = {
  fanuc: { open: "( ", close: " )" },
  haas: { open: "( ", close: " )" },
  mitsubishi: { open: "( ", close: " )" },
  heidenhain: { open: "; ", close: "" },
  siemens: { open: "; ", close: "" },
};

/** Pure: dialect-aware comment formatter (mirrors iter51-55). */
export function formatComment(dialect, text) {
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  if (typeof text !== "string") return null;
  const d = COMMENT_DELIMITERS[dialect];
  const safe = (dialect === "fanuc" || dialect === "haas" || dialect === "mitsubishi")
    ? text.replace(/[()]/g, "")
    : text;
  return `${d.open}${safe}${d.close}`;
}

/** Pure: validate a quaternion array (length 4, all finite). */
function validQuaternion(q) {
  if (!Array.isArray(q) || q.length !== 4) return false;
  for (const v of q) if (!Number.isFinite(v)) return false;
  return true;
}

/** Pure: validate a position array (length 3, all finite). */
function validPosition(p) {
  if (!Array.isArray(p) || p.length !== 3) return false;
  for (const v of p) if (!Number.isFinite(v)) return false;
  return true;
}

/** Pure: normalize a quaternion (force unit-length). Returns null on zero norm. */
export function normalizeQuaternion(q) {
  if (!validQuaternion(q)) return null;
  const n = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
  if (n === 0) return null;
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

/** Pure: dot product of two quaternions. */
export function quaternionDot(a, b) {
  if (!validQuaternion(a) || !validQuaternion(b)) return null;
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}

/**
 * Pure: SLERP between two unit quaternions at parameter τ ∈ [0, 1].
 *   q(τ) = (sin((1-τ)Ω)/sinΩ) · q0 + (sin(τΩ)/sinΩ) · q1
 *   Ω = acos(q0 · q1)
 *
 * Edge cases handled (Karpathy K3):
 *   - dot < 0: negate q1 (shortest-arc on the 4-sphere)
 *   - dot > SMALL_ANGLE_DOT_THRESHOLD: fall back to LERP + renormalize
 *     (avoids 0/0 singularity at sin(0))
 *
 * Returns null on bad input.
 */
export function slerp(q0, q1, tau) {
  if (!validQuaternion(q0) || !validQuaternion(q1)) return null;
  if (!Number.isFinite(tau) || tau < 0 || tau > 1) return null;
  let dot = quaternionDot(q0, q1);
  let q1Adj = q1;
  if (dot < 0) {
    dot = -dot;
    q1Adj = [-q1[0], -q1[1], -q1[2], -q1[3]];
  }
  if (dot > SMALL_ANGLE_DOT_THRESHOLD) {
    // Near-identical: linear interpolation + renormalize.
    const lerp = [
      q0[0] + tau * (q1Adj[0] - q0[0]),
      q0[1] + tau * (q1Adj[1] - q0[1]),
      q0[2] + tau * (q1Adj[2] - q0[2]),
      q0[3] + tau * (q1Adj[3] - q0[3]),
    ];
    return normalizeQuaternion(lerp);
  }
  // Standard SLERP
  const omega = Math.acos(Math.min(1, Math.max(-1, dot)));
  const sinOmega = Math.sin(omega);
  const a = Math.sin((1 - tau) * omega) / sinOmega;
  const b = Math.sin(tau * omega) / sinOmega;
  return [
    a * q0[0] + b * q1Adj[0],
    a * q0[1] + b * q1Adj[1],
    a * q0[2] + b * q1Adj[2],
    a * q0[3] + b * q1Adj[3],
  ];
}

/** Pure: linear interpolation between two 3-vectors at τ ∈ [0, 1]. */
export function lerpPosition(p0, p1, tau) {
  if (!validPosition(p0) || !validPosition(p1)) return null;
  if (!Number.isFinite(tau) || tau < 0 || tau > 1) return null;
  return [
    p0[0] + tau * (p1[0] - p0[0]),
    p0[1] + tau * (p1[1] - p0[1]),
    p0[2] + tau * (p1[2] - p0[2]),
  ];
}

/**
 * Pure: convert a unit quaternion to intrinsic Z-Y-X Euler angles
 * (roll-X, pitch-Y, yaw-Z) in radians.
 *   roll  = atan2(2(wx + yz), 1 - 2(x² + y²))
 *   pitch = asin(2(wy - zx))   [clamped to ±1]
 *   yaw   = atan2(2(wz + xy), 1 - 2(y² + z²))
 *
 * Returns { roll, pitch, yaw } in radians, or null on bad input.
 */
export function quaternionToEulerZYX(q) {
  if (!validQuaternion(q)) return null;
  const [w, x, y, z] = q;
  const roll = Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y));
  const pitchArg = Math.min(1, Math.max(-1, 2 * (w * y - z * x)));
  const pitch = Math.asin(pitchArg);
  const yaw = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
  return { roll, pitch, yaw };
}

/** Pure: radians → degrees. */
export function radToDeg(r) {
  if (!Number.isFinite(r)) return null;
  return r * 180 / Math.PI;
}

/**
 * Pure: interpolate N+1 frames between f0 and f1 (inclusive).
 *
 * Returns { frames: Frame[], summary } where frames has length steps+1.
 * Each frame = { position: [x,y,z], quaternion: [w,x,y,z], tau }.
 * Returns null on bad input.
 */
export function interpolateFramesSE3(f0, f1, steps) {
  if (!f0 || typeof f0 !== "object" || !f1 || typeof f1 !== "object") return null;
  if (!validPosition(f0.position) || !validPosition(f1.position)) return null;
  if (!validQuaternion(f0.quaternion) || !validQuaternion(f1.quaternion)) return null;
  if (!Number.isInteger(steps) || steps < 1 || steps > MAX_INTERP_STEPS) return null;
  const q0n = normalizeQuaternion(f0.quaternion);
  const q1n = normalizeQuaternion(f1.quaternion);
  if (q0n == null || q1n == null) return null;
  const frames = [];
  for (let i = 0; i <= steps; i++) {
    const tau = i / steps;
    const position = lerpPosition(f0.position, f1.position, tau);
    const quaternion = slerp(q0n, q1n, tau);
    if (position == null || quaternion == null) return null;
    frames.push({ position, quaternion, tau });
  }
  return {
    frames,
    summary: {
      stepCount: steps,
      frameCount: frames.length,
      schemaVersion: SE3_SLERP_EMIT_SCHEMA_VERSION,
    },
  };
}

/**
 * Pure: format a single Frame as a G1 line (dialect-aware).
 * Output: "G1 X.. Y.. Z.. A.. B.. C.." with A/B/C = Euler angles in DEGREES.
 *   (Mill controllers expect rotary axes in degrees; SLERP outputs are
 *    converted via quaternionToEulerZYX + radToDeg.)
 *
 * The rotaryAxisMap option lets caller swap roll/pitch/yaw → A/B/C mapping
 * (e.g. {roll:"B", pitch:"A", yaw:"C"} for a different kinematic layout).
 *
 * Returns null on bad input.
 */
export function formatFrameLine(frame, dialect, options) {
  if (!frame || typeof frame !== "object") return null;
  if (!validPosition(frame.position) || !validQuaternion(frame.quaternion)) return null;
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  const euler = quaternionToEulerZYX(frame.quaternion);
  if (euler == null) return null;
  const dp = Number.isFinite(options?.decimalPlaces) && options.decimalPlaces >= 0
    ? Math.floor(options.decimalPlaces)
    : DEFAULT_DECIMAL_PLACES;
  const map = (options?.rotaryAxisMap && typeof options.rotaryAxisMap === "object")
    ? options.rotaryAxisMap
    : DEFAULT_ROTARY_AXIS_MAP;
  const rollDeg = radToDeg(euler.roll);
  const pitchDeg = radToDeg(euler.pitch);
  const yawDeg = radToDeg(euler.yaw);
  const parts = [
    "G1",
    `X${frame.position[0].toFixed(dp)}`,
    `Y${frame.position[1].toFixed(dp)}`,
    `Z${frame.position[2].toFixed(dp)}`,
    `${map.roll}${rollDeg.toFixed(dp)}`,
    `${map.pitch}${pitchDeg.toFixed(dp)}`,
    `${map.yaw}${yawDeg.toFixed(dp)}`,
  ];
  return parts.join(" ");
}

/**
 * Pure: full SE(3) interp emit pipeline.
 *
 * @param {Object} req
 * @param {Object} req.f0 — start frame {position, quaternion}
 * @param {Object} req.f1 — end frame
 * @param {number} req.steps — number of interpolation steps (1 → 2 frames; N → N+1 frames)
 * @param {string} req.dialect
 * @param {Object} [req.options] — { decimalPlaces, rotaryAxisMap }
 * @returns {Object|null} { lines, headerLine, summary }
 */
export function emitSE3InterpolatedProgram(req) {
  if (!req || typeof req !== "object") return null;
  const { f0, f1, steps, dialect } = req;
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  const interp = interpolateFramesSE3(f0, f1, steps);
  if (interp == null) return null;
  const dp = Number.isFinite(req.options?.decimalPlaces) && req.options.decimalPlaces >= 0
    ? Math.floor(req.options.decimalPlaces)
    : DEFAULT_DECIMAL_PLACES;
  const headerText = `SE3-SLERP steps=${interp.summary.stepCount} frames=${interp.summary.frameCount} from X${f0.position[0].toFixed(dp)} to X${f1.position[0].toFixed(dp)}`;
  const headerLine = formatComment(dialect, headerText);
  if (headerLine == null) return null;
  const lines = [headerLine];
  for (const frame of interp.frames) {
    const line = formatFrameLine(frame, dialect, req.options);
    if (line == null) return null;
    lines.push(line);
  }
  return {
    lines,
    headerLine,
    summary: {
      ...interp.summary,
      dialect,
      lineCount: lines.length,
    },
  };
}
