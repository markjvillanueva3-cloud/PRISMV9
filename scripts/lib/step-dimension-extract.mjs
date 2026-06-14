/**
 * step-dimension-extract.mjs -- pure: extract REAL numeric dimensions (cylindrical/circular feature
 * radii) from STEP geometry text, unit-normalized to mm (U-CAD-DIM-RADII, slot:india 2026-06-11).
 * The first TRUE dimensional training signal for delta's CAD closed loop -- prior signals
 * ([[cad-ground-truth-to-training]] presence, [[cad-geometry-composition-to-training]] topology,
 * [[cad-correction-to-fix-ledger]] corrections) were all NON-dimensional. This is the accuracy lever.
 *
 * GROUNDED (R12, real STEP syntax verified against the JM-Die corpus):
 *   #65 = CYLINDRICAL_SURFACE ( 'NONE', #764, 0.0100... )   <- 3rd arg = radius
 *   CIRCLE ( 'NONE', #588, 0.0825... )                       <- 3rd arg = radius
 * STEP files are MIXED units -- the JM-Die corpus is largely INCH (CONVERSION_BASED_UNIT 'INCH'),
 * some MM (SI_UNIT(.MILLI.,.METRE.)). UNITS-FIRST is load-bearing: a radius read in inch but treated
 * as mm is a 25.4x error. extractRadiiMm RESOLVES the per-file unit and normalizes; an UNKNOWN unit
 * yields radiiMm:[] + unit:'unknown' so the caller SKIPS the file (never fabricate dims in an
 * unknown unit). Pure -> no fs/process; hermetically testable on real STEP text.
 */

// Length-unit -> millimetre conversion factors (exact, definitional -- not physics constants).
const INCH_TO_MM = 25.4;
const FOOT_TO_MM = 304.8;   // 12 inch
const METRE_TO_MM = 1000;

/** Resolve a STEP length-unit -> mm scale factor. inch=25.4, mm=1, metre=1000; unknown=null. */
export function parseStepUnitScale(text) {
  const t = typeof text === "string" ? text : "";
  // INCH is unambiguously a length unit (CONVERSION_BASED_UNIT 'INCH'). Check first.
  if (/CONVERSION_BASED_UNIT\s*\(\s*'INCH'/i.test(t)) return { unit: "inch", scaleToMm: INCH_TO_MM };
  if (/CONVERSION_BASED_UNIT\s*\(\s*'(FOOT|FEET)'/i.test(t)) return { unit: "foot", scaleToMm: FOOT_TO_MM };
  // Millimetre: SI_UNIT(.MILLI.,.METRE.) or a CONVERSION_BASED_UNIT 'MILLIMETRE'.
  if (/SI_UNIT\s*\(\s*\.MILLI\.\s*,\s*\.METRE\./i.test(t)) return { unit: "mm", scaleToMm: 1 };
  if (/CONVERSION_BASED_UNIT\s*\(\s*'MILLI(METRE|METER)?'/i.test(t)) return { unit: "mm", scaleToMm: 1 };
  // Bare metre length unit (no MILLI): SI_UNIT(.METRE.) -> metres.
  if (/SI_UNIT\s*\(\s*\.METRE\./i.test(t)) return { unit: "m", scaleToMm: METRE_TO_MM };
  return { unit: "unknown", scaleToMm: null };
}

const RADIUS_ENTITY_RE = /(?:CIRCLE|CYLINDRICAL_SURFACE)\s*\(\s*'[^']*'\s*,\s*#\d+\s*,\s*([0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)\s*\)/g;

/**
 * Extract circular/cylindrical feature radii from STEP text, normalized to mm.
 * Returns { unit, scaleToMm, radiiMm } where radiiMm is [] when the unit is unknown (caller skips)
 * or no radius-bearing entities are present. Radii <= 0 or non-finite are dropped (degenerate).
 */
export function extractRadiiMm(text) {
  const t = typeof text === "string" ? text : "";
  const { unit, scaleToMm } = parseStepUnitScale(t);
  if (scaleToMm == null) return { unit, scaleToMm, radiiMm: [] }; // unknown unit -> skip (no fabricated dims)
  const radiiMm = [];
  for (const m of t.matchAll(RADIUS_ENTITY_RE)) {
    const raw = Number(m[1]);
    if (!Number.isFinite(raw) || raw <= 0) continue;
    radiiMm.push(raw * scaleToMm);
  }
  return { unit, scaleToMm, radiiMm };
}

/** Percentile (linear interpolation) of a SORTED-ascending numeric array. */
function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Round to `d` decimals as a number (deterministic). */
function round(n, d = 2) { const f = 10 ** d; return Math.round((Number(n) || 0) * f) / f; }

/**
 * Distribution stats over a radii-in-mm array. Returns null for an empty array (no claim without
 * data -- R12). { count, minMm, p25Mm, medianMm, p75Mm, maxMm, meanMm }.
 */
export function radiusStats(radiiMm) {
  const arr = (Array.isArray(radiiMm) ? radiiMm : []).filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (arr.length === 0) return null;
  const sum = arr.reduce((a, b) => a + b, 0);
  return {
    count: arr.length,
    minMm: round(arr[0]),
    p25Mm: round(percentile(arr, 25)),
    medianMm: round(percentile(arr, 50)),
    p75Mm: round(percentile(arr, 75)),
    maxMm: round(arr[arr.length - 1]),
    meanMm: round(sum / arr.length),
  };
}

/**
 * Build a CAD-gen dimensional training pair for a class's radius distribution. `files` = number of
 * STEP files the stats were measured over (provenance). Returns null when stats is null.
 */
export function dimensionTrainingPair(partClass, stats, files) {
  if (!partClass || !stats) return null;
  const fileClause = Number.isFinite(Number(files)) && Number(files) > 0 ? ` across ${Number(files)} STEP files` : "";
  return {
    instruction: `CAD generation from print -- a part classified as "${partClass}". What are the typical cylindrical/circular feature radii (holes, bores, fillets) in mm?`,
    output: `A "${partClass}" part's circular features have radii spanning ~${stats.minMm}-${stats.maxMm} mm (median ~${stats.medianMm} mm; interquartile ~${stats.p25Mm}-${stats.p75Mm} mm; mean ~${stats.meanMm} mm), from ${stats.count} measured features${fileClause}.`,
  };
}

const POINT_RE = /CARTESIAN_POINT\s*\(\s*'[^']*'\s*,\s*\(\s*(-?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)\s*,\s*(-?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)\s*,\s*(-?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)\s*\)/g;

/**
 * Extract the axis-aligned bounding-box EXTENTS (part envelope) from STEP CARTESIAN_POINT coords,
 * unit-normalized to mm. Returns { dims:[L,W,H] sorted desc, maxExtentMm, pointCount } or null when
 * the unit is unknown (no fabricated dims) or fewer than 2 points are present (no envelope).
 */
export function extractBboxMm(text) {
  const t = typeof text === "string" ? text : "";
  const { scaleToMm } = parseStepUnitScale(t);
  if (scaleToMm == null) return null; // unknown unit -> skip
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity, n = 0;
  for (const m of t.matchAll(POINT_RE)) {
    const x = Number(m[1]), y = Number(m[2]), z = Number(m[3]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    n += 1;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  if (n < 2) return null;
  const dims = [(maxX - minX) * scaleToMm, (maxY - minY) * scaleToMm, (maxZ - minZ) * scaleToMm]
    .map((d) => Math.round(d * 100) / 100)
    .sort((a, b) => b - a); // [L, W, H] descending
  return { dims, maxExtentMm: dims[0], pointCount: n };
}

/** Median (linear-interp) of a numeric array; 0 for empty. */
function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  if (s.length === 0) return 0;
  return percentile(s, 50);
}

// A real machined solid has thickness in every axis. A per-file bbox whose smallest dim is ~0 is a
// DEGENERATE/planar point capture (e.g. only coplanar vertices parsed) -> "a casing is 63x50x0 mm"
// is misleading. Exclude such bboxes from the envelope aggregate (the file's radii are still kept).
const MIN_PART_DIM_MM = 0.05;

/**
 * Aggregate per-file bboxes -> per-class envelope stats. `bboxes` = [{dims:[L,W,H], maxExtentMm}].
 * Degenerate bboxes (smallest dim < MIN_PART_DIM_MM) are dropped. Returns null when none remain.
 * { files, medianL, medianW, medianH, medianMaxExtentMm }.
 */
export function bboxStats(bboxes) {
  const arr = (Array.isArray(bboxes) ? bboxes : []).filter(
    (b) => b && Array.isArray(b.dims) && b.dims.length === 3 && b.dims[2] >= MIN_PART_DIM_MM,
  );
  if (arr.length === 0) return null;
  const r = (n) => Math.round(n * 100) / 100;
  return {
    files: arr.length,
    medianL: r(median(arr.map((b) => b.dims[0]))),
    medianW: r(median(arr.map((b) => b.dims[1]))),
    medianH: r(median(arr.map((b) => b.dims[2]))),
    medianMaxExtentMm: r(median(arr.map((b) => b.maxExtentMm))),
  };
}

/** Build a CAD-gen part-envelope training pair from per-class bbox stats. Null when stats null. */
export function bboxTrainingPair(partClass, stats) {
  if (!partClass || !stats) return null;
  return {
    instruction: `CAD generation from print -- a part classified as "${partClass}". What is the typical overall part envelope (bounding box) in mm?`,
    output: `A "${partClass}" part's overall envelope is typically ~${stats.medianL} x ${stats.medianW} x ${stats.medianH} mm (median longest extent ~${stats.medianMaxExtentMm} mm), measured across ${stats.files} STEP files.`,
  };
}
