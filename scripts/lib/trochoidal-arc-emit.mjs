/**
 * trochoidal-arc-emit.mjs — closed-form trochoidal toolpath arc emit
 * for high-feed-mill slotting. Replaces N tiny G1 linear segments per
 * trochoidal petal with ONE native G2/G3 arc → ~10× speedup on any
 * controller that handles G02/G03 (Fanuc / Haas / Siemens / Heidenhain
 * / Mitsubishi — i.e., every modern dialect).
 *
 * Why "closed-form":
 *   Naive trochoidal posts emit each petal as 36-72 linear segments
 *   (one per 5-10° of arc). That bloats the program 10-50× and stresses
 *   the look-ahead buffer. Closed-form emit uses the controller's native
 *   G2/G3 arc — one block per full petal + one G1 step-over.
 *
 *   Echo-soul: pure geometric kinematic, NO inline cutting physics.
 *   The cutting/feed/spindle parameters (Vc, feedrate, RPM) are INPUTS
 *   from upstream Speed/Feed engines — this lib only computes the arc
 *   geometry + dialect-aware G-code emission.
 *
 *   Failure mode the unit prevents: emit-time program bloat from
 *   linear-segment arc approximation, AND controller-side look-ahead
 *   starvation that causes pause-and-replan stutter on every petal.
 *
 * Pipeline:
 *   1. Caller provides slot dims (width, length), tool diameter, stepOver
 *   2. trochoidalRadiusMm() computes the petal arc radius
 *   3. loopsForSlotLength() computes how many petals span the slot
 *   4. buildTrochoidalArcBlocks() emits [arc, linear, arc, linear, ...]
 *   5. emitTrochoidalArcProgram() wraps it all into dialect-aware G-code
 *
 *   Each petal: ONE G3 arc (counter-clockwise full circle, controller-
 *   native I/J center offset) + ONE G1 step-over to the next petal start.
 *
 *   Geometry (canonical trochoidal slot):
 *     slot_width  W (mm)  — the cleared channel width
 *     tool_diam   D (mm)  — end mill diameter
 *     step_over   s (mm)  — feed advance per petal
 *     arc radius  r = (W - D) / 2
 *     loops       n = floor((L - 2r) / s)
 *     path length per loop = 2π·r + s
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-EMIT-CLOSED-FORM-TROCHOIDAL-ARC
 * @phase 6 EMIT-side · @row 35 · @effort 3d
 * @slot echo · @date 2026-05-27
 */

export const TROCHOIDAL_ARC_SCHEMA_VERSION = 1;

/** Default decimal precision for emitted X/Y/I/J values. */
export const DEFAULT_DECIMAL_PLACES = 4;

/** Min slot width minus tool diameter clearance — arc radius must be > 0. */
export const MIN_RADIUS_MM = 0.05;

/** Hard upper bound on emitted loops — prevents runaway emit on bad input. */
export const MAX_LOOPS = 100000;

export const SUPPORTED_DIALECTS = ["fanuc", "haas", "heidenhain", "mitsubishi", "siemens"];

/** Arc-direction G-codes. G2=CW (right-hand cut), G3=CCW (left-hand cut). */
export const SUPPORTED_ARC_DIRECTIONS = ["G2", "G3"];

const COMMENT_DELIMITERS = {
  fanuc: { open: "( ", close: " )" },
  haas: { open: "( ", close: " )" },
  mitsubishi: { open: "( ", close: " )" },
  heidenhain: { open: "; ", close: "" },
  siemens: { open: "; ", close: "" },
};

/**
 * Pure: format a comment per dialect (mirrors iter51-53).
 */
export function formatComment(dialect, text) {
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  if (typeof text !== "string") return null;
  const d = COMMENT_DELIMITERS[dialect];
  const safe = (dialect === "fanuc" || dialect === "haas" || dialect === "mitsubishi")
    ? text.replace(/[()]/g, "")
    : text;
  return `${d.open}${safe}${d.close}`;
}

/**
 * Pure: trochoidal arc radius. Returns null on invalid dims.
 *   r = (W - D) / 2
 */
export function trochoidalRadiusMm(slotWidthMm, toolDiameterMm) {
  if (!Number.isFinite(slotWidthMm) || !Number.isFinite(toolDiameterMm)) return null;
  if (slotWidthMm <= 0 || toolDiameterMm <= 0) return null;
  if (slotWidthMm <= toolDiameterMm) return null; // tool wider than slot → no trochoidal possible
  const r = (slotWidthMm - toolDiameterMm) / 2;
  if (r < MIN_RADIUS_MM) return null;
  return r;
}

/**
 * Pure: number of loops needed to cover slot length given step-over.
 *   n = floor((L - 2r) / s)
 * Returns null on invalid input, integer ≥ 0 on success.
 * Caller may emit n+1 petals (the first centered on (r, slot-axis-center)
 * and the last one finishing at slot end).
 */
export function loopsForSlotLength(slotLengthMm, trochoidalRadiusMm, stepOverMm) {
  if (!Number.isFinite(slotLengthMm) || !Number.isFinite(trochoidalRadiusMm) || !Number.isFinite(stepOverMm)) return null;
  if (slotLengthMm <= 0 || trochoidalRadiusMm <= 0 || stepOverMm <= 0) return null;
  if (slotLengthMm < 2 * trochoidalRadiusMm) return null; // slot too short for even one petal
  const usable = slotLengthMm - 2 * trochoidalRadiusMm;
  const n = Math.floor(usable / stepOverMm);
  if (n < 0) return null;
  if (n > MAX_LOOPS) return null;
  return n;
}

/**
 * Pure: path length per loop = circle + step-over linear advance.
 *   L_loop = 2π·r + s
 */
export function pathLengthPerLoopMm(trochoidalRadiusMm, stepOverMm) {
  if (!Number.isFinite(trochoidalRadiusMm) || !Number.isFinite(stepOverMm)) return null;
  if (trochoidalRadiusMm <= 0 || stepOverMm < 0) return null;
  return 2 * Math.PI * trochoidalRadiusMm + stepOverMm;
}

/**
 * Pure: total trochoidal path length.
 *   total = n_loops × (2π·r + s)
 * Returns null on bad input.
 */
export function totalPathLengthMm(slotWidthMm, slotLengthMm, toolDiameterMm, stepOverMm) {
  const r = trochoidalRadiusMm(slotWidthMm, toolDiameterMm);
  if (r == null) return null;
  const n = loopsForSlotLength(slotLengthMm, r, stepOverMm);
  if (n == null) return null;
  // n step-overs ⇒ n+1 petals (the i=0..n loop in buildTrochoidalArcBlocks).
  // Total = (n+1) full circles + n step-over linear advances.
  return (n + 1) * 2 * Math.PI * r + n * stepOverMm;
}

/**
 * Pure: build the arc-by-arc emit blocks for a trochoidal slot.
 *
 * Coordinate convention:
 *   - feed direction = +X
 *   - slot centerline at startY
 *   - arc center walks from (startX + r, startY) toward (startX + slotLength - r, startY)
 *
 * For each loop i ∈ [0, n_loops]:
 *   - arc i: center = (startX + r + i·s, startY), G3 full circle ending back at start
 *   - linear i: G1 from (cur_x, startY) to (cur_x + s, startY) — except after the last arc
 *
 * Returns null on bad input. Otherwise:
 *   { blocks: [{kind, ...}, ...], summary: {radius, loops, totalLengthMm, ...} }
 *
 * Block shapes:
 *   { kind: "arc",    direction: "G3", centerX, centerY, radius, startX, startY }
 *   { kind: "linear", direction: "G1", endX, endY }
 */
export function buildTrochoidalArcBlocks(req) {
  if (!req || typeof req !== "object") return null;
  const {
    slotWidthMm, slotLengthMm, toolDiameterMm, stepOverMm,
    startX, startY,
  } = req;
  const arcDirection = req.arcDirection ?? "G3";
  if (!SUPPORTED_ARC_DIRECTIONS.includes(arcDirection)) return null;
  if (!Number.isFinite(startX) || !Number.isFinite(startY)) return null;

  const r = trochoidalRadiusMm(slotWidthMm, toolDiameterMm);
  if (r == null) return null;
  const n = loopsForSlotLength(slotLengthMm, r, stepOverMm);
  if (n == null) return null;

  const blocks = [];
  // First arc center sits at (startX + r, startY) so the arc's leftmost
  // point touches the slot start. The tool starts at the leftmost point
  // of that first circle: (startX, startY).
  let curX = startX;
  const curY = startY;
  for (let i = 0; i <= n; i++) {
    const centerX = startX + r + i * stepOverMm;
    blocks.push({
      kind: "arc",
      direction: arcDirection,
      centerX,
      centerY: startY,
      radius: r,
      startX: curX,
      startY: curY,
    });
    if (i < n) {
      const nextX = curX + stepOverMm;
      blocks.push({
        kind: "linear",
        direction: "G1",
        endX: nextX,
        endY: curY,
      });
      curX = nextX;
    }
  }

  const perLoop = pathLengthPerLoopMm(r, stepOverMm);
  const totalLength = (n + 1) * 2 * Math.PI * r + n * stepOverMm;
  return {
    blocks,
    summary: {
      radius: r,
      loops: n + 1,
      stepOver: stepOverMm,
      perLoopLengthMm: perLoop,
      totalLengthMm: totalLength,
      arcDirection,
      schemaVersion: TROCHOIDAL_ARC_SCHEMA_VERSION,
    },
  };
}

/**
 * Pure: format an arc block as a single G-code line for the dialect.
 *
 * Fanuc/Haas/Mitsubishi: G3 X.. Y.. I.. J..  (I,J = signed offsets from
 *   current position to center)
 * Heidenhain: CC X.. Y.. ; then C X.. Y.. DR+/DR-   (different syntax)
 *   For simplicity (and dialect parity with the spec target), we emit
 *   the ISO-equivalent: G3 X.. Y.. I.. J..  Heidenhain controllers
 *   accept this in ISO/G-code mode (set by %BEGIN ISO or G70/G71).
 * Siemens: G3 X.. Y.. I.. J..  (same ISO syntax)
 *
 * Returns null on bad input.
 */
export function formatArcLine(block, dialect, options) {
  if (!block || typeof block !== "object" || block.kind !== "arc") return null;
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  if (!SUPPORTED_ARC_DIRECTIONS.includes(block.direction)) return null;
  const dp = Number.isFinite(options?.decimalPlaces) && options.decimalPlaces >= 0
    ? Math.floor(options.decimalPlaces)
    : DEFAULT_DECIMAL_PLACES;
  // Full-circle G3 ends at the same point it started; controllers require
  // X/Y match start, and I/J = (center - start). For a full circle starting
  // at the leftmost point of a circle whose center is (cx, cy):
  //   start = (cx - r, cy)   →  end = same as start
  //   I = cx - startX = +r,  J = cy - startY = 0
  const endX = block.startX;
  const endY = block.startY;
  const iOff = block.centerX - block.startX;
  const jOff = block.centerY - block.startY;
  return `${block.direction} X${endX.toFixed(dp)} Y${endY.toFixed(dp)} I${iOff.toFixed(dp)} J${jOff.toFixed(dp)}`;
}

/**
 * Pure: format a linear-move block as G1.
 */
export function formatLinearLine(block, dialect, options) {
  if (!block || typeof block !== "object" || block.kind !== "linear") return null;
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  const dp = Number.isFinite(options?.decimalPlaces) && options.decimalPlaces >= 0
    ? Math.floor(options.decimalPlaces)
    : DEFAULT_DECIMAL_PLACES;
  return `G1 X${block.endX.toFixed(dp)} Y${block.endY.toFixed(dp)}`;
}

/**
 * Pure: format any block (arc or linear).
 */
export function formatBlock(block, dialect, options) {
  if (!block || typeof block !== "object") return null;
  if (block.kind === "arc") return formatArcLine(block, dialect, options);
  if (block.kind === "linear") return formatLinearLine(block, dialect, options);
  return null;
}

/**
 * Pure: full emit pipeline.
 *
 * @param {Object} req — { slotWidthMm, slotLengthMm, toolDiameterMm,
 *   stepOverMm, startX, startY, dialect, arcDirection?, options? }
 * @returns {Object|null} { lines, headerLine, summary }
 *
 * Emits ONE header comment summarizing the trochoidal params + total
 * length, then one G3/G2 + G1 pair per loop.
 */
export function emitTrochoidalArcProgram(req) {
  if (!req || typeof req !== "object") return null;
  const { dialect } = req;
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  const built = buildTrochoidalArcBlocks(req);
  if (built == null) return null;
  const lines = [];
  const dp = Number.isFinite(req.options?.decimalPlaces) && req.options.decimalPlaces >= 0
    ? Math.floor(req.options.decimalPlaces)
    : DEFAULT_DECIMAL_PLACES;
  const headerText = `TROCHOIDAL slot W=${Number(req.slotWidthMm).toFixed(dp)} L=${Number(req.slotLengthMm).toFixed(dp)} D=${Number(req.toolDiameterMm).toFixed(dp)} step=${Number(req.stepOverMm).toFixed(dp)} r=${built.summary.radius.toFixed(dp)} loops=${built.summary.loops} totalL=${built.summary.totalLengthMm.toFixed(dp)}`;
  const headerLine = formatComment(dialect, headerText);
  if (headerLine == null) return null;
  lines.push(headerLine);
  for (const block of built.blocks) {
    const line = formatBlock(block, dialect, req.options);
    if (line == null) return null;
    lines.push(line);
  }
  return {
    lines,
    headerLine,
    summary: {
      ...built.summary,
      dialect,
      lineCount: lines.length,
    },
  };
}
