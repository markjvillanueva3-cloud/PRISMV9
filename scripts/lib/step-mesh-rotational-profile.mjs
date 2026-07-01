#!/usr/bin/env node
/**
 * step-mesh-rotational-profile.mjs -- slot:whiskey [KIENZLE G1 closed-loop keystone]
 * ==========================================================================
 * Pure geometry: a triangle MESH (from StepImportEngine / occt-import-js
 * ReadStepFile -> surface mesh) -> a turning ROTATIONAL PROFILE
 * (detected revolution axis + OD/ID radius-vs-axial silhouette).
 *
 * Why: occt returns a SURFACE MESH, not analytic B-rep cylinders, so
 * TurningCADImportEngine.importSolid (which needs analytic CADSolidInput
 * faces) cannot be fed directly from a STEP file. For a turned part the
 * geometry that matters is the rotational silhouette, which IS reconstructable
 * from the mesh by a radial sweep about the axis of revolution. This produces
 * the same od_profile/id_profile shape the Rung C closed loop consumes, so a
 * generated program can be scored against a REAL JM STEP solid (2,307 files)
 * -> flips full_geometry_loop_closed for the STEP path.
 *
 * No physics constants -- pure geometry. UNITS: the caller MUST resolve the
 * STEP CONVERSION_BASED_UNIT (inch 25.4 / mm) and pass opts.units; we never
 * assume (units-first safety rail -- a 25.4x scale error otherwise).
 */

const AXES = ["x", "y", "z"];
// symmetry_score above this => NOT a clean body of revolution (multi-body / off-axis /
// non-axisymmetric); the detected axis + profile are unreliable -> suspect:true.
const SUSPECT_THRESHOLD = 0.05;

function maxOf(arr) { let m = -Infinity; for (let i = 0; i < arr.length; i++) if (arr[i] > m) m = arr[i]; return m; }
function minOf(arr) { let m = Infinity; for (let i = 0; i < arr.length; i++) if (arr[i] < m) m = arr[i]; return m; }
const finite3 = (a, b, c) => Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c);

/** Normalize vertices (flat [x,y,z,...] OR {x,y,z}[]) to [[x,y,z],...]. Non-finite
 * coordinates (NaN/Infinity from a degenerate facet) are REJECTED in BOTH branches --
 * never silently coerced to 0 (that would inject a fake on-axis vertex). */
export function toTriples(vertices) {
  if (!vertices || (!Array.isArray(vertices) && !ArrayBuffer.isView(vertices))) return [];
  const out = [];
  if (vertices.length && typeof vertices[0] === "object" && vertices[0] !== null && !Array.isArray(vertices[0])) {
    for (const v of vertices) { const a = Number(v.x), b = Number(v.y), c = Number(v.z); if (finite3(a, b, c)) out.push([a, b, c]); }
    return out;
  }
  for (let i = 0; i + 2 < vertices.length; i += 3) { const a = +vertices[i], b = +vertices[i + 1], c = +vertices[i + 2]; if (finite3(a, b, c)) out.push([a, b, c]); }
  return out;
}

/** Vertex centroid -- a far better axis-line anchor than the bbox center for a part
 * with off-center features (the bbox center sits between extremes, not on the axis). */
export function centroid(triples) {
  if (!triples.length) return [0, 0, 0];
  let x = 0, y = 0, z = 0;
  for (const t of triples) { x += t[0]; y += t[1]; z += t[2]; }
  return [x / triples.length, y / triples.length, z / triples.length];
}

export function boundingBox(triples) {
  if (!triples.length) return null;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const t of triples) for (let k = 0; k < 3; k++) { if (t[k] < min[k]) min[k] = t[k]; if (t[k] > max[k]) max[k] = t[k]; }
  return {
    min, max,
    size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
    center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
  };
}

/**
 * Angular-symmetry score for a candidate axis: lower = more rotationally
 * symmetric. Per axial bin we bin vertices into angular sectors and measure
 * the coefficient of variation of per-sector mean radius; a body of revolution
 * has ~equal radius in every sector (score -> 0). A prism/blob scores high.
 */
export function axisSymmetryScore(triples, axisIdx, bbox, opts = {}) {
  const { axialBins = 16, sectors = 12 } = opts;
  const center = opts.center || bbox.center;       // caller passes the centroid; bbox.center is the fallback
  const p = [0, 1, 2].filter((k) => k !== axisIdx);
  const c0 = center[p[0]], c1 = center[p[1]];
  const aMin = bbox.min[axisIdx], aMax = bbox.max[axisIdx];
  const span = (aMax - aMin) || 1;
  const sumR = Array.from({ length: axialBins }, () => new Array(sectors).fill(0));
  const cnt = Array.from({ length: axialBins }, () => new Array(sectors).fill(0));
  for (const t of triples) {
    const d0 = t[p[0]] - c0, d1 = t[p[1]] - c1;
    const r = Math.hypot(d0, d1);
    let ab = Math.floor(((t[axisIdx] - aMin) / span) * axialBins); if (!Number.isFinite(ab)) continue; if (ab >= axialBins) ab = axialBins - 1; if (ab < 0) ab = 0;
    let sec = Math.floor(((Math.atan2(d1, d0) + Math.PI) / (2 * Math.PI)) * sectors); if (sec >= sectors) sec = sectors - 1; if (sec < 0) sec = 0;
    sumR[ab][sec] += r; cnt[ab][sec] += 1;
  }
  let scoreSum = 0, scoreN = 0;
  for (let ab = 0; ab < axialBins; ab++) {
    const means = [];
    for (let s = 0; s < sectors; s++) if (cnt[ab][s] > 0) means.push(sumR[ab][s] / cnt[ab][s]);
    if (means.length < sectors * 0.5) continue;              // sparse bin -> skip
    const mu = means.reduce((a, b) => a + b, 0) / means.length;
    if (mu <= 1e-9) continue;
    const variance = means.reduce((a, b) => a + (b - mu) * (b - mu), 0) / means.length;
    scoreSum += Math.sqrt(variance) / mu; scoreN++;
  }
  return scoreN ? scoreSum / scoreN : Infinity;
}

/** Pick the axis (x|y|z) with the lowest angular-symmetry score. */
export function detectRevolutionAxis(triples, bbox, opts = {}) {
  let best = { axisIdx: 2, score: Infinity };
  for (let k = 0; k < 3; k++) {
    const score = axisSymmetryScore(triples, k, bbox, opts);
    if (score < best.score) best = { axisIdx: k, score };
  }
  return best;
}

/**
 * Radial sweep about `axisIdx`: per axial bin, OD = max radius (the silhouette),
 * ID = a dense inner-wall cluster at r < boreFactor*OD (a real bore, not end-cap
 * stragglers, which are filtered by boreMinCount + the >5% floor).
 */
export function radialProfile(triples, axisIdx, bbox, opts = {}) {
  const { bins = 50, boreFactor = 0.7, boreMinCount = 8, boreMinRun = 3 } = opts;
  const center = opts.center || bbox.center;       // caller passes the centroid; bbox.center is the fallback
  const p = [0, 1, 2].filter((k) => k !== axisIdx);
  const c0 = center[p[0]], c1 = center[p[1]];
  const aMin = bbox.min[axisIdx], aMax = bbox.max[axisIdx];
  const span = (aMax - aMin) || 1;
  const buckets = Array.from({ length: bins }, () => []);
  for (const t of triples) {
    const r = Math.hypot(t[p[0]] - c0, t[p[1]] - c1);
    let b = Math.floor(((t[axisIdx] - aMin) / span) * bins); if (!Number.isFinite(b)) continue; if (b >= bins) b = bins - 1; if (b < 0) b = 0;
    buckets[b].push(r);
  }
  const od = [];
  const rawId = new Array(bins).fill(null);   // per-bin raw inner-wall candidate
  for (let b = 0; b < bins; b++) {
    const rs = buckets[b];
    const a = aMin + (b + 0.5) * (span / bins);
    if (!rs.length) { od.push({ a, r: null }); continue; }
    const odR = maxOf(rs);
    od.push({ a, r: odR });
    const inner = rs.filter((r) => r > odR * 0.05 && r < odR * boreFactor);
    if (inner.length >= boreMinCount) rawId[b] = maxOf(inner);   // bore-wall radius candidate
  }
  // Contiguity filter: a REAL bore is a contiguous inner cylindrical surface
  // spanning >= boreMinRun bins. An isolated candidate (e.g. an end-cap disk,
  // which tessellates to r=0..R in just the 1-2 end bins) is rejected.
  const keep = new Array(bins).fill(false);
  let runStart = -1;
  for (let b = 0; b <= bins; b++) {
    const has = b < bins && rawId[b] != null;
    if (has && runStart < 0) runStart = b;
    if (!has && runStart >= 0) {
      if (b - runStart >= boreMinRun) for (let k = runStart; k < b; k++) keep[k] = true;
      runStart = -1;
    }
  }
  const id = od.map((q, b) => ({ a: q.a, r: keep[b] ? rawId[b] : null }));
  return { od, id };
}

/** Full pipeline: mesh -> {revolution_axis, OD/ID profiles, diameters, has_bore, ...}. */
export function meshToRotationalProfile(mesh, opts = {}) {
  const src = mesh && (mesh.vertices || mesh.position || mesh.positions || mesh);
  const triples = toTriples(src);
  const bbox = boundingBox(triples);
  if (!bbox) throw new Error("meshToRotationalProfile: mesh has no vertices");
  const center = opts.center || centroid(triples);   // centroid anchors the axis line far better than bbox center
  const o = { ...opts, center };
  const { axisIdx, score } = detectRevolutionAxis(triples, bbox, o);
  const { od, id } = radialProfile(triples, axisIdx, bbox, o);
  const odVals = od.filter((q) => q.r != null).map((q) => q.r);
  const idVals = id.filter((q) => q.r != null).map((q) => q.r);
  const suspectAt = opts.suspectThreshold ?? SUSPECT_THRESHOLD;
  return {
    revolution_axis: AXES[axisIdx],
    symmetry_score: score,                       // lower = cleaner body of revolution
    suspect: score > suspectAt,                  // true => unreliable (multi-body / off-axis / non-axisymmetric) -- review before the closed loop consumes it
    axis_center: center,
    axis_length: bbox.size[axisIdx],
    max_od_diameter: odVals.length ? 2 * maxOf(odVals) : null,
    min_id_diameter: idVals.length ? 2 * minOf(idVals) : null,
    has_bore: idVals.length > 0,
    od_profile: od,                              // [{a, r}] radius vs axial position
    id_profile: id,
    vertex_count: triples.length,
    units: opts.units || "unknown",              // caller MUST resolve STEP units (inch/mm) -- never assume
  };
}

/**
 * Multi-body STEP segmentation. occt yields one mesh per body/face-group; a JM "OP1/OP2"
 * setup STEP often bundles the part with STOCK/FIXTURE bodies, so the combined mesh is not
 * a clean body of revolution (suspect). Evaluate each individual body + the combined-all,
 * and return the LARGEST CLEAN body of revolution (the part). If NONE is clean, return the
 * least-suspect candidate with suspect:true (honest -- never silently pass a fixture as the
 * part). `meshArrays` = array of vertex sources (flat or triple), one per occt mesh.
 * Heuristic (documented limit): "largest clean body" assumes the part is the biggest
 * axisymmetric body; a large fixture cylinder could fool it -> body_candidates is returned
 * so a consumer can audit/override.
 */
export function selectBestBodyProfile(meshArrays, opts = {}) {
  const minV = opts.minVertices ?? 60;
  const arrays = (meshArrays || []).filter((a) => a && a.length);
  if (!arrays.length) throw new Error("selectBestBodyProfile: no mesh data");
  const profileOf = (src) => { try { return meshToRotationalProfile(src, opts); } catch { return null; } };
  const candidates = [];
  arrays.forEach((a, i) => { const p = profileOf(a); if (p && p.vertex_count >= minV) candidates.push({ body_index: i, ...p }); });
  const combinedSrc = [];
  for (const a of arrays) for (const v of toTriples(a)) combinedSrc.push(v[0], v[1], v[2]);
  const combined = profileOf(combinedSrc);
  const multiBody = arrays.length > 1;       // for ONE body the combined IS that body -- don't double-count it
  if (multiBody && combined && combined.vertex_count >= minV) candidates.push({ body_index: -1, ...combined });
  if (!candidates.length) {
    if (!combined) throw new Error("selectBestBodyProfile: no body yielded a profile");
    return { body_index: -1, candidates_evaluated: 0, body_candidates: [], pick_ambiguous: false, ...combined };
  }
  const extent = (c) => (c.axis_length || 0) * (c.max_od_diameter || 0);
  const summary = candidates.map((c) => ({ body_index: c.body_index, symmetry_score: c.symmetry_score, suspect: c.suspect, max_od_diameter: c.max_od_diameter, axis_length: c.axis_length, vertex_count: c.vertex_count }));
  const clean = candidates.filter((c) => !c.suspect && c.body_index !== -1);  // a single CLEAN body (not the combined)
  let pick, pickAmbiguous = false;
  if (clean.length) {
    clean.sort((x, y) => extent(y) - extent(x)); pick = clean[0];               // largest clean body = the part
    // >=2 comparably-large clean bodies: size alone can't tell the part from a round fixture/stock -> warn the consumer
    if (clean.length >= 2 && extent(clean[1]) >= 0.6 * extent(clean[0])) pickAmbiguous = true;
  } else { candidates.sort((x, y) => x.symmetry_score - y.symmetry_score); pick = candidates[0]; }  // least-bad; stays suspect
  return { candidates_evaluated: candidates.length, body_candidates: summary, pick_ambiguous: pickAmbiguous, ...pick };
}
