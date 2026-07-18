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

// STEP/EXPRESS reals are frequently written with a TRAILING DOT and no fractional digits (`20.`, `0.`,
// `-3.`) -- a valid real literal. The fractional part must therefore be `\.[0-9]*` (zero-or-more), NOT
// `\.[0-9]+`: the latter silently DROPS integer-valued reals (`5.` radius) -> under-counted dims. (fix
// U-DELTA-STEP-TRAILING-DOT, slot:delta 2026-06-28 -- see knowledge/wiki/lessons.)
const RADIUS_ENTITY_RE = /(?:CIRCLE|CYLINDRICAL_SURFACE)\s*\(\s*'[^']*'\s*,\s*#\d+\s*,\s*([0-9]+(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?)\s*\)/g;

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

// Trailing-dot reals (`20.`, `0.`, `-3.`) again: `\.[0-9]*` not `\.[0-9]+`. With `\.[0-9]+` the 3-coord
// match fails on standard STEP points like `(0.,0.,0.)` / `(12.5,...,20.)` -> 0 points matched -> n<2 ->
// extractBboxMm silently returns null on a valid part. (fix U-DELTA-STEP-TRAILING-DOT, slot:delta.)
const POINT_RE = /CARTESIAN_POINT\s*\(\s*'[^']*'\s*,\s*\(\s*(-?[0-9]+(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?)\s*,\s*(-?[0-9]+(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?)\s*,\s*(-?[0-9]+(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?)\s*\)/g;

// VERTEX-ONLY gate (U-DELTA-CADGEN-VERTEXBBOX-FIX, slot:delta 2026-07-01 -- found live grading the corpus
// self-check sweep). A `PLANE`/`CYLINDRICAL_SURFACE`/other surface entity's `AXIS2_PLACEMENT_3D` origin
// CARTESIAN_POINT can legitimately sit OFF the visible solid -- an unbounded plane's placement origin
// needn't lie on its (trimmed) face. Real repro: a CadQuery `.cutThruAll()` through-slot/through-groove
// leaves the cut side-wall PLANE's placement origin at Z=-76.2mm on an otherwise dimensionally-EXACT
// 101.6x76.2x25.4mm die plate (VERIFIED against the raw VERTEX_POINT-only envelope, which recovers the
// exact correct [101.6,76.2,25.4]). The naive full-scan (POINT_RE over every CARTESIAN_POINT in the file)
// picked up that off-solid point and corrupted the sorted-descending result to [101.6,101.6,76.2] --
// silently DROPPING the true 25.4mm height and duplicating 101.6 -- a false "inaccurate" self-check verdict
// on a part whose generated geometry was already correct (same live-repro'd on a v-block whose Z envelope
// doubled 50.8->101.6mm from a `.cutThruAll()` v-groove). `VERTEX_POINT('', #id)` is the STEP-standard
// reference to an ACTUAL solid corner (an EDGE_CURVE endpoint), so restricting the envelope scan to
// vertex-referenced points is immune to placement-origin contamination from any cut/pocket/slot feature.
const VERTEX_POINT_REF_RE = /VERTEX_POINT\s*\(\s*'[^']*'\s*,\s*#(\d+)\s*\)/g;
// #<id> = CARTESIAN_POINT('', (x,y,z)) -- id-tagged so the scan below can filter to vertex-referenced ids.
const ID_POINT_RE = /#(\d+)\s*=\s*CARTESIAN_POINT\s*\(\s*'[^']*'\s*,\s*\(\s*(-?[0-9]+(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?)\s*,\s*(-?[0-9]+(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?)\s*,\s*(-?[0-9]+(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?)\s*\)/g;

/** Scan `t` for 3D CARTESIAN_POINTs matched by `re` (whole-file, id-agnostic), optionally filtered to
 * `vertexIds` (a Set of entity-id strings; null/absent = no filter). Returns {minX..maxZ,n} or null-ish
 * via n=0 when nothing matched. Shared by extractBboxMm's vertex-only pass and its full-scan fallback. */
function scanPoints(t, re, idGroupOffset, vertexIds) {
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity, n = 0;
  for (const m of t.matchAll(re)) {
    if (vertexIds && !vertexIds.has(m[idGroupOffset - 1])) continue; // id capture group immediately precedes the x-coord group
    const x = Number(m[idGroupOffset]), y = Number(m[idGroupOffset + 1]), z = Number(m[idGroupOffset + 2]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    n += 1;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  return { minX, minY, minZ, maxX, maxY, maxZ, n };
}

/**
 * Extract the axis-aligned bounding-box EXTENTS (part envelope) from STEP CARTESIAN_POINT coords,
 * unit-normalized to mm. Returns { dims:[L,W,H] sorted desc, maxExtentMm, pointCount } or null when
 * the unit is unknown (no fabricated dims) or fewer than 2 points are present (no envelope).
 *
 * Prefers the VERTEX_POINT-referenced subset of CARTESIAN_POINTs (true solid corners, immune to
 * placement-origin contamination -- see VERTEX_POINT_REF_RE above); falls back to the naive full-scan
 * when the file has no VERTEX_POINT entities (older/synthetic/minimal STEP snippets) or the vertex-only
 * pass yields fewer than 2 points, so existing callers/fixtures without VERTEX_POINT wrapping are unaffected.
 */
export function extractBboxMm(text) {
  const t = typeof text === "string" ? text : "";
  const { scaleToMm } = parseStepUnitScale(t);
  if (scaleToMm == null) return null; // unknown unit -> skip

  const vertexIds = new Set();
  for (const m of t.matchAll(VERTEX_POINT_REF_RE)) vertexIds.add(m[1]);

  let r = { n: 0 };
  if (vertexIds.size > 0) r = scanPoints(t, ID_POINT_RE, 2, vertexIds);
  if (r.n < 2) r = scanPoints(t, POINT_RE, 1, null); // fallback: no/insufficient vertex-tagged points

  if (r.n < 2) return null;
  const dims = [(r.maxX - r.minX) * scaleToMm, (r.maxY - r.minY) * scaleToMm, (r.maxZ - r.minZ) * scaleToMm]
    .map((d) => Math.round(d * 100) / 100)
    .sort((a, b) => b - a); // [L, W, H] descending
  return { dims, maxExtentMm: dims[0], pointCount: r.n };
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

// Machinable feature-radius bounds for the corpus radii prior. A radius above the max is a near-straight
// edge stored as a near-infinite-radius arc (a STEP representation artifact, e.g. ~1.1e6 mm observed),
// not a real hole/bore/fillet; below the min is a degenerate circle. Bounds the prior to real features.
const FEATURE_RADIUS_MIN_MM = 0.05;
const FEATURE_RADIUS_MAX_MM = 1000; // 1 m -- generous for any machined feature; the JM die corpus is <300 mm

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

// ════════════════════════════════════════════════════════════════════════════════════════════════
// GEOMETRY CLASSIFIER + CORPUS HARVEST (U-DELTA-CADGEN-GEOMCLASS, slot:delta 2026-06-29)
// ────────────────────────────────────────────────────────────────────────────────────────────────
// extractBboxMm reads the AABB from explicit CARTESIAN_POINTs. That envelope EQUALS the real envelope
// only when every face corner is an explicit point -- i.e. a solid bounded ONLY by PLANE faces (a true
// polyhedron / prismatic block). The moment a face is CURVED (cylinder/cone/sphere/torus/B-spline/
// surface-of-revolution), the silhouette / max-diameter extent is NOT pinned by any vertex point, so
// the point-cloud envelope UNDER-estimates the part. The live CORPUS-KERNEL sweep proved this: of the
// parts compared against the authoritative Fusion kernel bbox, only the plane-only prismatic part
// (bracket) agreed (0% error) -- every curved/freeform part (blisk/impeller freeform, DIE HEX/CASE)
// disagreed 47-100%. ~89% of point-cloud envelopes are wrong. classifyStepGeometry turns that finding
// into a per-part TRIAGE: prismatic -> trust the point envelope NOW ($0, no Fusion); curved/freeform ->
// queue it for a kernel-GT sweep. That makes the operator's Fusion sweep TARGETED, not a blind 3,121-part hammer.

// Surface-entity tokens. `\bPLANE\s*\(` matches the `PLANE ( 'NONE', #ref )` entity but NOT the unit
// header `PLANE_ANGLE_UNIT(` ('PLANE' there is followed by '_', so no `\s*\(`). B_SPLINE_SURFACE has no
// trailing `\(` requirement so it also catches `B_SPLINE_SURFACE_WITH_KNOTS`.
const SURFACE_PATTERNS = [
  ["plane", /\bPLANE\s*\(/g],
  ["cylindrical", /\bCYLINDRICAL_SURFACE\s*\(/g],
  ["conical", /\bCONICAL_SURFACE\s*\(/g],
  ["spherical", /\bSPHERICAL_SURFACE\s*\(/g],
  ["toroidal", /\bTOROIDAL_SURFACE\s*\(/g],
  ["bspline", /\bB_SPLINE_SURFACE/g],
  ["revolution", /\bSURFACE_OF_REVOLUTION\s*\(/g],
  ["extrusion", /\bSURFACE_OF_LINEAR_EXTRUSION\s*\(/g],
];
const CURVED_SURFACE_KINDS = ["cylindrical", "conical", "spherical", "toroidal", "bspline", "revolution", "extrusion"];
const FREEFORM_SURFACE_KINDS = ["bspline", "revolution"];

/**
 * Classify a STEP B-rep by its surface entities -> { surfaceKinds, totalSurfaces, curvedSurfaceCount,
 * planarOnly, hasFreeform, geometryClass, pointBboxReliable }.
 *   geometryClass: "prismatic" (plane-only), "curved" (analytic curved faces, no free-form),
 *                  "freeform" (B-spline / surface-of-revolution -> blisk/impeller/turbine), "unknown" (no faces parsed).
 *   pointBboxReliable: true ONLY for a plane-only solid -- the ONE class where extractBboxMm's envelope
 *                      is trustworthy. Conservative: any curved face -> false (never falsely trust the point envelope).
 * Pure -- no fs/process. Grounded against real STEP syntax + the live kernel-vs-point CORPUS finding.
 */
export function classifyStepGeometry(text) {
  const t = typeof text === "string" ? text : "";
  const surfaceKinds = {};
  for (const [kind, re] of SURFACE_PATTERNS) {
    const m = t.match(re);
    surfaceKinds[kind] = m ? m.length : 0;
  }
  const totalSurfaces = Object.values(surfaceKinds).reduce((a, b) => a + b, 0);
  const curvedSurfaceCount = CURVED_SURFACE_KINDS.reduce((a, k) => a + surfaceKinds[k], 0);
  const hasFreeform = FREEFORM_SURFACE_KINDS.some((k) => surfaceKinds[k] > 0);
  const planarOnly = totalSurfaces > 0 && curvedSurfaceCount === 0;
  let geometryClass;
  if (totalSurfaces === 0) geometryClass = "unknown";
  else if (planarOnly) geometryClass = "prismatic";
  else if (hasFreeform) geometryClass = "freeform";
  else geometryClass = "curved";
  return { surfaceKinds, totalSurfaces, curvedSurfaceCount, planarOnly, hasFreeform, geometryClass, pointBboxReliable: planarOnly };
}

/**
 * Harvest ONE corpus STEP file into a triage row. `file` = { hash, label, partClass, text }. Resolves
 * unit (UNKNOWN -> skipped, never fabricate), classifies geometry, extracts point envelope + radii.
 * Pure (caller supplies already-read text). A `skipped` row carries its reason; a processed row carries
 * geometryClass + pointBboxReliable + pointEnvelopeMm (the triage payload aggregateHarvest consumes).
 */
export function harvestCorpusRow(file) {
  const hash = file?.hash ?? null;
  const label = file?.label ?? "part";
  const partClass = file?.partClass ?? "general";
  const absPath = file?.absPath ?? null; // the on-disk path -- makes the kernel-needed worklist ACTIONABLE (drives the sweep)
  const text = typeof file?.text === "string" ? file.text : "";
  const { unit, scaleToMm } = parseStepUnitScale(text);
  if (scaleToMm == null) {
    return { hash, label, absPath, partClass, unit, skipped: "unknown-unit", geometryClass: null, pointBboxReliable: false, pointEnvelopeMm: null };
  }
  const geom = classifyStepGeometry(text);
  const bbox = extractBboxMm(text);
  const radii = extractRadiiMm(text);
  // Drop non-machinable radii: a near-straight edge is a near-INFINITE-radius arc (km-scale artifact)
  // and a sub-FEATURE_RADIUS_MIN radius is a degenerate circle -- neither is a real feature for the prior.
  const featureRadii = radii.radiiMm.filter((r) => r >= FEATURE_RADIUS_MIN_MM && r <= FEATURE_RADIUS_MAX_MM);
  // a non-degenerate envelope has thickness in every axis (mirrors bboxStats's MIN_PART_DIM_MM floor)
  const pointDegenerate = bbox ? bbox.dims[2] < MIN_PART_DIM_MM : null;
  return {
    hash, label, absPath, partClass, unit,
    geometryClass: geom.geometryClass,
    pointBboxReliable: geom.pointBboxReliable,
    curvedSurfaceCount: geom.curvedSurfaceCount,
    surfaceKinds: geom.surfaceKinds,
    pointEnvelopeMm: bbox ? bbox.dims : null,
    maxExtentMm: bbox ? bbox.maxExtentMm : null,
    pointDegenerate,
    // RADII are RELIABLE for EVERY part (the explicit CIRCLE/CYLINDRICAL_SURFACE radius literal,
    // units-resolved -- NOT a point-cloud approximation), unlike the envelope. BUT a nearly-straight
    // edge is represented as a near-infinite-radius CIRCLE (a STEP arc-approximation), so raw radii are
    // polluted by km-scale artifacts that wreck the mean/range. Keep only MACHINABLE feature radii
    // [FEATURE_RADIUS_MIN_MM, FEATURE_RADIUS_MAX_MM]; capped at 64/part to bound the ledger.
    radiiCount: featureRadii.length,
    radiiMm: featureRadii.slice(0, 64),
    skipped: null,
  };
}

/**
 * Aggregate harvest rows -> { reliablePairs, kernelNeededWorklist, stats }. The TRIAGE split:
 *   RELIABLE  = plane-only prismatic with a non-degenerate point envelope -> trustworthy dim-prior NOW
 *               (grouped by partClass -> bboxStats -> bboxTrainingPair, source:"corpus-prismatic").
 *   KERNEL-NEEDED = curved/freeform, OR a prismatic part whose point capture came back degenerate ->
 *               the SCOPED Fusion kernel-GT worklist (so the live sweep only touches parts that need it).
 * Pure -- no fs. Deterministic (reliablePairs + worklist sorted) so a re-run over the same rows is stable.
 */
export function aggregateHarvest(rows) {
  const all = Array.isArray(rows) ? rows : [];
  const processed = all.filter((r) => r && !r.skipped);
  const reliable = processed.filter((r) => r.pointBboxReliable && Array.isArray(r.pointEnvelopeMm) && r.pointDegenerate === false);
  const kernelNeeded = processed.filter((r) => !r.pointBboxReliable || r.pointDegenerate === true);
  const byClass = new Map();
  for (const r of reliable) {
    const c = r.partClass || "general";
    if (!byClass.has(c)) byClass.set(c, []);
    byClass.get(c).push({ dims: r.pointEnvelopeMm, maxExtentMm: r.maxExtentMm });
  }
  const reliablePairs = [];
  for (const [c, bboxes] of byClass) {
    const stats = bboxStats(bboxes);
    const pair = bboxTrainingPair(c, stats);
    if (pair && stats) reliablePairs.push({ ...pair, partClass: c, files: stats.files, source: "corpus-prismatic" });
  }
  reliablePairs.sort((a, b) => a.partClass.localeCompare(b.partClass));
  const kernelNeededWorklist = kernelNeeded
    .map((r) => ({
      hash: r.hash, label: r.label, absPath: r.absPath ?? null, partClass: r.partClass, geometryClass: r.geometryClass,
      pointEnvelopeMm: r.pointEnvelopeMm,
      reason: r.pointDegenerate === true ? "degenerate-point-capture" : `curved:${r.geometryClass}`,
    }))
    .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  const geometryClassHist = {};
  for (const r of processed) {
    const k = r.geometryClass || "null";
    geometryClassHist[k] = (geometryClassHist[k] || 0) + 1;
  }
  // RADII priors -- RELIABLE for EVERY part (explicit CIRCLE/CYLINDRICAL_SURFACE radius literals,
  // units-resolved; NOT a point-cloud approximation), so aggregate across ALL processed rows by class,
  // not just the prismatic subset. radiusStats -> dimensionTrainingPair (holes/bores/fillet radii).
  const radiiByClass = new Map(); // class -> { radii:[], files:int }
  for (const r of processed) {
    if (!Array.isArray(r.radiiMm) || r.radiiMm.length === 0) continue;
    const c = r.partClass || "general";
    if (!radiiByClass.has(c)) radiiByClass.set(c, { radii: [], files: 0 });
    const e = radiiByClass.get(c);
    for (const v of r.radiiMm) e.radii.push(v);
    e.files += 1;
  }
  const radiiPairs = [];
  for (const [c, e] of radiiByClass) {
    const stats = radiusStats(e.radii);
    const pair = dimensionTrainingPair(c, stats, e.files);
    if (pair && stats) radiiPairs.push({ ...pair, partClass: c, files: e.files, count: stats.count, source: "corpus-radii" });
  }
  radiiPairs.sort((a, b) => a.partClass.localeCompare(b.partClass));
  return {
    totalRows: all.length,
    skipped: all.length - processed.length,
    processed: processed.length,
    reliable: reliable.length,
    kernelNeeded: kernelNeeded.length,
    geometryClassHist,
    reliablePairs,
    radiiPairs,
    kernelNeededWorklist,
  };
}
