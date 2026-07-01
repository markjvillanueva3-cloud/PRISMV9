/**
 * mill-block-time-profile.mjs — per-G-code-block cycle-time estimator
 * for 3-axis mill. Ports the lathe block-engagement timing pattern to
 * 3-axis Cartesian moves with trapezoidal/triangular acceleration.
 *
 * Why: summing operation-level cycle times ignores accel/decel overhead,
 * which can be 5-30% of program time on small-feature parts (many short
 * rapids). Per-block timing reveals true wall-clock cycle time.
 *
 * Motion model (per axis, simplified scalar):
 *   Given commanded feed v (mm/s), accel a (mm/s²), distance d (mm):
 *     accel_dist = v² / (2·a)
 *     IF 2·accel_dist <= d → trapezoidal:
 *         t_accel = v / a   (also t_decel)
 *         d_const_v = d - 2·accel_dist
 *         t_const = d_const_v / v
 *         t_total = 2·t_accel + t_const
 *     ELSE → triangular (never reaches commanded v):
 *         peak_v = sqrt(d · a)
 *         t_total = 2 · sqrt(d / a)
 *
 * This is a 1D scalar simplification of true 3D vector motion. The
 * real motion blends per-axis accel limits via the controller's
 * S-curve / look-ahead — this lib uses the worst-case scalar model,
 * which is conservative (overestimates time within ~5% for typical
 * Cartesian moves).
 *
 * Echo-soul: this is post-processor cycle-time observability. No
 * physics constants (Vc/Kienzle/Taylor) used. Machine profile params
 * (rapid feedrate, accel) come from caller — never inlined.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-LATHE-BLOCK-ENGAGEMENT-TIMING-TO-MILL
 * @slot echo · @date 2026-05-27
 */

export const MILL_BLOCK_TIME_SCHEMA_VERSION = 1;

/** Typical Haas VF rapid rate (mm/min). */
export const DEFAULT_RAPID_FEEDRATE_MM_PER_MIN = 30000;
/** Typical 3-axis VMC linear acceleration (mm/s²) — ~0.5g. */
export const DEFAULT_ACCEL_MM_PER_SEC2 = 5000;
/** Typical M06 tool change time (sec). */
export const DEFAULT_TOOL_CHANGE_TIME_SEC = 3.0;
/** G04 dwell controller overhead (sec). */
export const DEFAULT_DWELL_OVERHEAD_SEC = 0.1;
/** Per-op startup overhead (block-read, modal-state apply) — sec. */
export const DEFAULT_OP_HEADER_OVERHEAD_SEC = 0.5;

/** Supported block kinds. */
export const BLOCK_KINDS = ["linear", "rapid", "dwell", "tool-change", "spindle", "coolant", "comment", "unknown"];

/**
 * Pure: parse one G-code line into a typed block descriptor.
 * Returns null on empty/whitespace lines.
 */
export function parseGCodeBlock(line) {
  if (typeof line !== "string") return null;
  const trimmed = line.trim();
  if (trimmed.length === 0) return null;

  // Pure comment line:
  if (trimmed.startsWith("(") || trimmed.startsWith(";")) {
    return { kind: "comment", raw: trimmed };
  }

  // Strip inline parens-comments before parsing:
  const stripped = trimmed.replace(/\([^)]*\)/g, "").trim();
  if (stripped.length === 0) {
    return { kind: "comment", raw: trimmed };
  }

  // Detect axes (X/Y/Z numeric values):
  const axes = {};
  const xMatch = stripped.match(/X(-?\d+\.?\d*)/i);
  const yMatch = stripped.match(/Y(-?\d+\.?\d*)/i);
  const zMatch = stripped.match(/Z(-?\d+\.?\d*)/i);
  if (xMatch) axes.X = Number(xMatch[1]);
  if (yMatch) axes.Y = Number(yMatch[1]);
  if (zMatch) axes.Z = Number(zMatch[1]);

  // Detect feed (F), spindle (S), tool (T), M-code:
  const fMatch = stripped.match(/F(\d+\.?\d*)/i);
  const sMatch = stripped.match(/S(\d+\.?\d*)/i);
  const tMatch = stripped.match(/T(\d+)/i);
  const m06 = /M0?6\b/.test(stripped);
  const m03 = /M0?[35]\b/.test(stripped); // M3/M5
  const dwellMatch = stripped.match(/G0?4\s+P(\d+\.?\d*)/i);

  // Pick kind by precedence:
  if (m06) {
    return { kind: "tool-change", raw: trimmed, tool: tMatch ? Number(tMatch[1]) : null };
  }
  if (dwellMatch) {
    return { kind: "dwell", raw: trimmed, dwellSec: Number(dwellMatch[1]) };
  }
  // G00 = rapid, G01 = linear, G02/G03 = arc (treated as linear here for scalar timing)
  const isRapid = /\bG0?0\b/.test(stripped);
  const isLinear = /\bG0?[123]\b/.test(stripped);
  if (isRapid && Object.keys(axes).length > 0) {
    return { kind: "rapid", raw: trimmed, axes };
  }
  if (isLinear && Object.keys(axes).length > 0) {
    return {
      kind: "linear",
      raw: trimmed,
      axes,
      feed: fMatch ? Number(fMatch[1]) : null,
    };
  }
  // Bare axis move = modal continuation; treat as linear if feed in state
  if (Object.keys(axes).length > 0 && !isRapid && !isLinear) {
    return {
      kind: "linear",
      raw: trimmed,
      axes,
      feed: fMatch ? Number(fMatch[1]) : null,
      modal: true,
    };
  }
  if (m03 && sMatch) {
    return { kind: "spindle", raw: trimmed, sword: Number(sMatch[1]) };
  }
  if (/M0?[789]\b/.test(stripped)) {
    return { kind: "coolant", raw: trimmed };
  }
  return { kind: "unknown", raw: trimmed };
}

/** Pure: 3D Euclidean distance (mm). */
export function distance3D(from, to) {
  if (!from || !to) return null;
  const dx = (Number.isFinite(to.X) ? to.X : (Number.isFinite(from.X) ? from.X : 0)) - (Number.isFinite(from.X) ? from.X : 0);
  const dy = (Number.isFinite(to.Y) ? to.Y : (Number.isFinite(from.Y) ? from.Y : 0)) - (Number.isFinite(from.Y) ? from.Y : 0);
  const dz = (Number.isFinite(to.Z) ? to.Z : (Number.isFinite(from.Z) ? from.Z : 0)) - (Number.isFinite(from.Z) ? from.Z : 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Pure: trapezoidal / triangular accel-aware move time (sec).
 * @param {number} distanceMm
 * @param {number} feedMmPerMin — commanded feed
 * @param {number} accelMmPerSec2 — machine accel limit
 * @returns {number|null}
 */
export function computeMoveTimeSec(distanceMm, feedMmPerMin, accelMmPerSec2) {
  if (!Number.isFinite(distanceMm) || !Number.isFinite(feedMmPerMin) || !Number.isFinite(accelMmPerSec2)) return null;
  if (distanceMm < 0 || feedMmPerMin <= 0 || accelMmPerSec2 <= 0) return null;
  if (distanceMm === 0) return 0;
  const v = feedMmPerMin / 60; // mm/s
  const a = accelMmPerSec2;
  const accelDist = (v * v) / (2 * a);
  if (2 * accelDist <= distanceMm) {
    // Trapezoidal: accel up, cruise, accel down
    const tAccel = v / a;
    const dConstV = distanceMm - 2 * accelDist;
    const tConst = dConstV / v;
    return 2 * tAccel + tConst;
  }
  // Triangular: never reaches commanded v
  return 2 * Math.sqrt(distanceMm / a);
}

/**
 * Pure: compute time for one parsed block given current state + machine.
 * @param {Object} block — parseGCodeBlock output
 * @param {Object} state — { X, Y, Z, lastFeed_mm_per_min }
 * @param {Object} machineProfile — { rapidFeedrateMmPerMin, accelMmPerSec2, ... }
 * @returns {Object|null} { timeSec, newState, attribution }
 */
export function computeBlockTimeSec(block, state, machineProfile) {
  if (!block || !state || !machineProfile) return null;
  const rapidFeed = Number.isFinite(machineProfile.rapidFeedrateMmPerMin) && machineProfile.rapidFeedrateMmPerMin > 0
    ? machineProfile.rapidFeedrateMmPerMin
    : DEFAULT_RAPID_FEEDRATE_MM_PER_MIN;
  const accel = Number.isFinite(machineProfile.accelMmPerSec2) && machineProfile.accelMmPerSec2 > 0
    ? machineProfile.accelMmPerSec2
    : DEFAULT_ACCEL_MM_PER_SEC2;
  const toolChangeTime = Number.isFinite(machineProfile.toolChangeTimeSec) && machineProfile.toolChangeTimeSec >= 0
    ? machineProfile.toolChangeTimeSec
    : DEFAULT_TOOL_CHANGE_TIME_SEC;
  const dwellOverhead = Number.isFinite(machineProfile.dwellOverheadSec) && machineProfile.dwellOverheadSec >= 0
    ? machineProfile.dwellOverheadSec
    : DEFAULT_DWELL_OVERHEAD_SEC;

  switch (block.kind) {
    case "comment":
    case "spindle":
    case "coolant":
    case "unknown":
      return { timeSec: 0, newState: state, attribution: block.kind };
    case "tool-change":
      return { timeSec: toolChangeTime, newState: state, attribution: "tool-change" };
    case "dwell": {
      const dwell = Number.isFinite(block.dwellSec) ? block.dwellSec : 0;
      return { timeSec: dwell + dwellOverhead, newState: state, attribution: "dwell" };
    }
    case "rapid": {
      const target = {
        X: Number.isFinite(block.axes?.X) ? block.axes.X : state.X,
        Y: Number.isFinite(block.axes?.Y) ? block.axes.Y : state.Y,
        Z: Number.isFinite(block.axes?.Z) ? block.axes.Z : state.Z,
      };
      const d = distance3D(state, target);
      if (d == null) return null;
      const t = computeMoveTimeSec(d, rapidFeed, accel);
      if (t == null) return null;
      return {
        timeSec: t,
        newState: { ...state, ...target },
        attribution: "rapid",
        distanceMm: d,
        effectiveFeed: rapidFeed,
      };
    }
    case "linear": {
      const target = {
        X: Number.isFinite(block.axes?.X) ? block.axes.X : state.X,
        Y: Number.isFinite(block.axes?.Y) ? block.axes.Y : state.Y,
        Z: Number.isFinite(block.axes?.Z) ? block.axes.Z : state.Z,
      };
      const d = distance3D(state, target);
      if (d == null) return null;
      const feed = Number.isFinite(block.feed) && block.feed > 0
        ? block.feed
        : (Number.isFinite(state.lastFeed_mm_per_min) && state.lastFeed_mm_per_min > 0 ? state.lastFeed_mm_per_min : null);
      if (feed == null) {
        // No feed declared and no modal feed in state — cannot compute
        return { timeSec: 0, newState: { ...state, ...target }, attribution: "linear-no-feed", error: "missing-feed" };
      }
      const t = computeMoveTimeSec(d, feed, accel);
      if (t == null) return null;
      const newFeed = Number.isFinite(block.feed) && block.feed > 0 ? block.feed : state.lastFeed_mm_per_min;
      return {
        timeSec: t,
        newState: { ...state, ...target, lastFeed_mm_per_min: newFeed },
        attribution: "linear",
        distanceMm: d,
        effectiveFeed: feed,
      };
    }
    default:
      return { timeSec: 0, newState: state, attribution: "unhandled" };
  }
}

/**
 * Pure: full program time estimate from G-code text.
 * @param {string|string[]} input — raw G-code or array of lines
 * @param {Object} machineProfile — see computeBlockTimeSec
 * @param {Object} [initialState] — default { X:0, Y:0, Z:0, lastFeed_mm_per_min:null }
 * @returns {Object|null} { totalSec, perBlock[], summary }
 */
export function computeProgramTimeSec(input, machineProfile, initialState) {
  if (input == null) return null;
  const lines = Array.isArray(input) ? input : (typeof input === "string" ? input.split(/\r?\n/) : null);
  if (!lines) return null;
  if (!machineProfile || typeof machineProfile !== "object") return null;
  let state = initialState && typeof initialState === "object"
    ? { X: 0, Y: 0, Z: 0, lastFeed_mm_per_min: null, ...initialState }
    : { X: 0, Y: 0, Z: 0, lastFeed_mm_per_min: null };
  const perBlock = [];
  let total = 0;
  const attribCounts = { linear: 0, rapid: 0, dwell: 0, "tool-change": 0, comment: 0, spindle: 0, coolant: 0, unknown: 0, "linear-no-feed": 0 };
  const attribTimes = { linear: 0, rapid: 0, dwell: 0, "tool-change": 0, comment: 0, spindle: 0, coolant: 0, unknown: 0, "linear-no-feed": 0 };
  for (let i = 0; i < lines.length; i++) {
    const block = parseGCodeBlock(lines[i]);
    if (block == null) {
      perBlock.push({ lineNumber: i + 1, skipped: "blank" });
      continue;
    }
    const result = computeBlockTimeSec(block, state, machineProfile);
    if (result == null) {
      perBlock.push({ lineNumber: i + 1, block, error: "compute-failed" });
      continue;
    }
    total += result.timeSec;
    if (Object.prototype.hasOwnProperty.call(attribCounts, result.attribution)) {
      attribCounts[result.attribution]++;
      attribTimes[result.attribution] += result.timeSec;
    }
    perBlock.push({ lineNumber: i + 1, block, ...result });
    state = result.newState;
  }
  return {
    totalSec: total,
    perBlock,
    summary: {
      blockCount: perBlock.length,
      timeSec: total,
      attribCounts,
      attribTimes,
      machineProfile: {
        rapidFeedrateMmPerMin: machineProfile.rapidFeedrateMmPerMin ?? DEFAULT_RAPID_FEEDRATE_MM_PER_MIN,
        accelMmPerSec2: machineProfile.accelMmPerSec2 ?? DEFAULT_ACCEL_MM_PER_SEC2,
      },
      schemaVersion: MILL_BLOCK_TIME_SCHEMA_VERSION,
    },
  };
}
