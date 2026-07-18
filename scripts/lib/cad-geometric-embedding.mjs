/**
 * cad-geometric-embedding.mjs -- pure GEOMETRIC retrieval featurizer for CAD parts (slot:delta,
 * U-CAD-GEOMETRIC-EMBEDDING-BACKEND core). This is the verifiable CORE (R13: build the core before the
 * integration) of the pattern-recognition/RAG gap: CADEmbeddingIndexOrchestratorEngine's current backends
 * (HashBasedEmbeddingBackend / TextEmbeddingBackend, :74-114) are FNV/Murmur HASHES of tokens -- two parts
 * that look geometrically identical hash to unrelated vectors, so KNN retrieval is meaningless. This maps a
 * part's REAL geometry -> a fixed-dim vector where cosine similarity reflects geometric SHAPE similarity
 * (a blisk retrieves the impeller; a cube retrieves a cube; a prismatic die does NOT retrieve a freeform
 * rotor). It de-risks the whole embedding line: if geometry can't separate archetypes here, populating
 * Qdrant with 31k parts is pointless; if it can (proven by recall@k), the wiring is mechanical.
 *
 * REUSES the tested step-dimension-extract.mjs extractors (R8 -- do NOT re-parse STEP): classifyStepGeometry
 * (8-kind surface histogram + prismatic/curved/freeform class), extractBboxMm (unit-resolved envelope),
 * extractRadiiMm (unit-resolved feature radii). Those are the geometric SIGNAL; this composes them into a
 * normalized SHAPE vector.
 *
 * Karpathy discipline:
 *   CLASSIFY: transform (raw geometric features -> fixed vector) + similarity (cosine) + eval (recall@k).
 *   TECHNIQUE: SCALE-INVARIANT shape features -- sorted-bbox aspect ratios (W/L,H/L,H/W in [0,1]) +
 *     surface-kind FRACTIONS (normalized by total surfaces) -- so a 10 mm cube and a 100 mm cube land
 *     near each other (same SHAPE) while a cube and a blisk do not. One bounded log-scale dim carries
 *     absolute size for retrieval without letting scale dominate shape.
 *   EDGE CASES: totalSurfaces=0 / bbox=null (unknown unit or <2 points) / maxExtent=0 / no radii ->
 *     every ratio guarded by safeDiv -> a defined (mostly-zero) vector, NEVER NaN.
 *   FAILURE MODES: a zero vector -> cosineSim returns 0 (guarded norm), never NaN/Infinity.
 *   DETERMINISM: pure arithmetic, no Date/Math.random -> identical vector across restarts/machines/slots.
 *
 * @module scripts/lib/cad-geometric-embedding
 */

import { classifyStepGeometry, extractBboxMm, extractRadiiMm } from "./step-dimension-extract.mjs";

/** Surface-kind order -- MUST match classifyStepGeometry's SURFACE_PATTERNS keys (8 kinds). */
export const SURFACE_KINDS = ["plane", "cylindrical", "conical", "spherical", "toroidal", "bspline", "revolution", "extrusion"];

/** Total geometric feature-vector dimension. */
export const GEOM_FEATURE_DIM = 16;

/** a/b, but 0 when b<=0 or non-finite (never NaN/Infinity from a 0/0 or x/0). */
function safeDiv(a, b) {
  return Number.isFinite(a) && Number.isFinite(b) && b > 0 ? a / b : 0;
}
function clamp01(x) {
  return !Number.isFinite(x) ? 0 : x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * Extract the raw geometric feature bundle from STEP text (reuses the tested extractors). Returns
 * { dims:[L,W,H]|null, maxExtentMm, surfaceKinds, totalSurfaces, curvedSurfaceCount, radiiMm, medianRadiusMm }.
 * Pure over the supplied text.
 */
export function geometricFeaturesFromStep(text) {
  const geom = classifyStepGeometry(text);
  const bbox = extractBboxMm(text); // { dims:[L,W,H] desc, maxExtentMm } | null
  const radii = extractRadiiMm(text); // { radiiMm } (unit-resolved; [] on unknown unit)
  const rad = (radii.radiiMm || []).filter((r) => Number.isFinite(r) && r > 0).sort((a, b) => a - b);
  const medianRadiusMm = rad.length ? rad[Math.floor((rad.length - 1) / 2)] : 0;
  return {
    dims: bbox ? bbox.dims : null,
    maxExtentMm: bbox ? bbox.maxExtentMm : 0,
    surfaceKinds: geom.surfaceKinds,
    totalSurfaces: geom.totalSurfaces,
    curvedSurfaceCount: geom.curvedSurfaceCount,
    radiiMm: rad,
    medianRadiusMm,
  };
}

/**
 * Map a raw geometric feature bundle -> a fixed GEOM_FEATURE_DIM vector (Float32Array). All components are
 * bounded ~[0,1]. Layout:
 *   [0..2]  bbox aspect ratios W/L, H/L, H/W  (SHAPE, scale-invariant; dims are sorted L>=W>=H so <=1)
 *   [3]     size scale = log10(maxExtentMm+1)/3 clamped  (1 mm~0, 1000 mm~1; absolute size, one dim)
 *   [4..11] surface-kind FRACTIONS (plane..extrusion, normalized by totalSurfaces) -- the archetype signal
 *   [12]    curved fraction  = curvedSurfaceCount/totalSurfaces
 *   [13]    freeform fraction = (bspline+revolution)/totalSurfaces  (blisk/impeller/turbine marker)
 *   [14]    radii density = tanh(radiiCount/20)  (hole/bore-rich parts)
 *   [15]    relative feature radius = medianRadiusMm/maxExtentMm clamped
 * Accepts either a raw bundle (from geometricFeaturesFromStep) or STEP text (string) for convenience.
 */
export function geometricFeatureVector(bundleOrText) {
  const f = typeof bundleOrText === "string" ? geometricFeaturesFromStep(bundleOrText) : bundleOrText;
  const v = new Float32Array(GEOM_FEATURE_DIM);
  const dims = Array.isArray(f?.dims) && f.dims.length === 3 ? f.dims : [0, 0, 0];
  const [L, W, H] = dims;
  v[0] = clamp01(safeDiv(W, L));
  v[1] = clamp01(safeDiv(H, L));
  v[2] = clamp01(safeDiv(H, W));
  v[3] = clamp01(Math.log10((Number(f?.maxExtentMm) || 0) + 1) / 3);
  const total = Number(f?.totalSurfaces) || 0;
  const sk = f?.surfaceKinds || {};
  for (let i = 0; i < SURFACE_KINDS.length; i++) v[4 + i] = clamp01(safeDiv(sk[SURFACE_KINDS[i]] || 0, total));
  v[12] = clamp01(safeDiv(Number(f?.curvedSurfaceCount) || 0, total));
  v[13] = clamp01(safeDiv((sk.bspline || 0) + (sk.revolution || 0), total));
  const radiiCount = Array.isArray(f?.radiiMm) ? f.radiiMm.length : 0;
  v[14] = Math.tanh(radiiCount / 20);
  v[15] = clamp01(safeDiv(Number(f?.medianRadiusMm) || 0, Number(f?.maxExtentMm) || 0));
  return v;
}

/** Cosine similarity of two equal-length numeric vectors. 0 when either has zero norm (never NaN). */
export function cosineSim(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na <= 0 || nb <= 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * recall@k for a labeled vector set. For the query at `queryIndex`, rank all OTHER entries by cosine
 * similarity (desc) and return the fraction of the top-k that share the query's label. `entries` =
 * [{ label, vec }]. Returns 0 when there are no other entries or k<=0.
 */
export function recallAtK(entries, queryIndex, k) {
  const list = Array.isArray(entries) ? entries : [];
  const q = list[queryIndex];
  if (!q || k <= 0) return 0;
  const others = list.map((e, i) => ({ i, label: e.label, sim: cosineSim(q.vec, e.vec) })).filter((e) => e.i !== queryIndex);
  if (others.length === 0) return 0;
  others.sort((a, b) => b.sim - a.sim);
  const topK = others.slice(0, Math.min(k, others.length));
  const hits = topK.filter((e) => e.label === q.label).length;
  return hits / topK.length;
}

/** Mean recall@k over every entry as the query in turn (macro-average). */
export function meanRecallAtK(entries, k) {
  const list = Array.isArray(entries) ? entries : [];
  if (list.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < list.length; i++) sum += recallAtK(list, i, k);
  return sum / list.length;
}
