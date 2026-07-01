#!/usr/bin/env node
/**
 * cad-fusion-live-roundtrip.mjs -- the CAD closed-loop LIVE-Fusion roundtrip validator
 * (U-DELTA-FUSION-LIVE-ROUNDTRIP, slot:delta 2026-06-28).
 *
 * Closes the campaign's central gate: "Fusion is up for live testing / closed-loop training."
 * Drives the live Fusion bridge (Fusion360LiveBridgeEngine HTTP surface on :18362) to GENERATE a
 * battery of known parametric primitives, READS BACK the produced solid via /geometry, and COMPARES
 * the produced volume + bounding box against the ANALYTIC ground truth (a cylinder is exactly
 * pi*R^2*D with bbox [2R,2R,D]; a box is W*H*D with bbox [W,H,D]). The per-spec dimensional error is
 * the closed-loop ACCURACY datapoint -- the geometric-fidelity signal CAD-gen training has been
 * missing (presence-only until now). Emits a JSONL ledger that feeds the training-corpus inventory.
 *
 * SAFETY (R12): explicitly detects the documented STALE-IN-MEMORY add-in failure -- "/extrude returns
 * a CONSTANT Z regardless of distance_mm" (delta CAD-awareness known-failure #) -- by extruding the
 * SAME profile at two DIFFERENT depths and asserting the read-back Z actually changes. A constant Z
 * fails loud with the operator GUI-reload instruction; it NEVER reports a silent pass.
 *
 * Bridge contract source-of-truth: mcp-server/src/engines/Fusion360LiveBridgeEngine.ts
 *   POST /new {name,parametric}  POST /sketch {plane,shapes:[{type,radius_mm|width_mm,height_mm,...}]}
 *   POST /extrude {depth_mm,operation}   GET /geometry -> {bodies:[{volume_mm3,bounding_box_mm:[x,y,z]}]}
 *
 * Pure core (analyticGeometry/compareGeometry/staleVerdict/payloads) is hermetically testable with an
 * injected fetch; the live drive only runs from the CLI (or when a real baseUrl+fetch are passed).
 *
 * Usage:
 *   node scripts/cad-fusion-live-roundtrip.mjs              # default battery vs live :18362
 *   node scripts/cad-fusion-live-roundtrip.mjs --json --port 18362
 *   node scripts/cad-fusion-live-roundtrip.mjs --no-write   # don't append the datapoint ledger
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { extractBboxMm, bboxStats, bboxTrainingPair, harvestCorpusRow, aggregateHarvest } from "./lib/step-dimension-extract.mjs";
import { inferPartClassFromCadPath } from "./lib/cad-ground-truth-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LEDGER_DIR = path.join(ROOT, "state", "shared", "cad-fusion-live");
const DEFAULT_PORT = 18362; // delta's DESIGNATED Fusion window (NOT :18360 generic, NOT :18361 kilo/CAM)
const DEFAULT_REL_TOL = 0.01; // 1% -- analytic primitives read back near-exact; this catches real drift
const ABS_FLOOR_MM = 0.01;    // absolute floor so a near-zero intended axis doesn't divide-by-~0

/**
 * Analytic ground-truth geometry for a known parametric primitive.
 * @param spec.shape  - "cylinder" (from a circle profile) | "box" (from a rectangle profile)
 * @param spec.radius_mm - cylinder radius (mm)
 * @param spec.width_mm / spec.height_mm - box footprint (mm)
 * @param spec.depth_mm - extrusion depth (mm)
 * @returns { volume_mm3, bbox_mm:[x,y,z] }
 * @throws on an unknown shape or non-finite/non-positive dimension (never fabricate a target).
 */
export function analyticGeometry(spec) {
  if (!spec || typeof spec !== "object") throw new Error("analyticGeometry: spec required");
  if (spec.shape === "cylinder") {
    const R = spec.radius_mm, D = spec.depth_mm;
    if (!Number.isFinite(D) || D <= 0) throw new Error(`analyticGeometry: depth_mm must be > 0 (got ${D})`);
    if (!Number.isFinite(R) || R <= 0) throw new Error(`analyticGeometry: radius_mm must be > 0 (got ${R})`);
    return { volume_mm3: Math.PI * R * R * D, bbox_mm: [2 * R, 2 * R, D] };
  }
  if (spec.shape === "box") {
    const W = spec.width_mm, H = spec.height_mm, D = spec.depth_mm;
    if (!Number.isFinite(D) || D <= 0) throw new Error(`analyticGeometry: depth_mm must be > 0 (got ${D})`);
    if (!Number.isFinite(W) || W <= 0 || !Number.isFinite(H) || H <= 0)
      throw new Error(`analyticGeometry: width_mm/height_mm must be > 0 (got ${W}x${H})`);
    return { volume_mm3: W * H * D, bbox_mm: [W, H, D] };
  }
  if (spec.shape === "revolved_ring") {
    // A rectangle offset in +Y revolved 360 deg about the X axis -> an annular cylinder (washer):
    // axial length L, outer radius ro, inner radius ri. V = pi*(ro^2 - ri^2)*L; bbox [L, 2ro, 2ro].
    // Live-confirmed on :18362 (ri5/ro25/L8 -> vol 15079.6447, bbox [8,50,50]). The revolve primitive
    // behind turned/shaft/die parts -- JM Die's core geometry.
    const ri = spec.r_inner_mm, ro = spec.r_outer_mm, L = spec.length_mm;
    if (!Number.isFinite(L) || L <= 0) throw new Error(`analyticGeometry: length_mm must be > 0 (got ${L})`);
    if (!Number.isFinite(ri) || ri < 0) throw new Error(`analyticGeometry: r_inner_mm must be >= 0 (got ${ri})`);
    if (!Number.isFinite(ro) || ro <= ri) throw new Error(`analyticGeometry: r_outer_mm must be > r_inner_mm (got ${ro} <= ${ri})`);
    return { volume_mm3: Math.PI * (ro * ro - ri * ri) * L, bbox_mm: [L, 2 * ro, 2 * ro] };
  }
  throw new Error(`analyticGeometry: unknown shape "${spec.shape}"`);
}

/** The /sketch request body for a spec (single-sourced so the live drive and tests never diverge). */
export function buildSketchPayload(spec) {
  if (spec.shape === "cylinder")
    return { plane: "XY", shapes: [{ type: "circle", radius_mm: spec.radius_mm, center_x_mm: 0, center_y_mm: 0 }] };
  if (spec.shape === "box")
    return { plane: "XY", shapes: [{ type: "rectangle", width_mm: spec.width_mm, height_mm: spec.height_mm, center_x_mm: 0, center_y_mm: 0 }] };
  if (spec.shape === "revolved_ring") {
    // Rectangle offset in +Y so the whole profile sits on one side of the X axis (else the revolve
    // self-intersects): x-extent = axial length L, y-extent = (ro - ri), centered at y = (ri+ro)/2.
    const ri = spec.r_inner_mm, ro = spec.r_outer_mm, L = spec.length_mm;
    return { plane: "XY", shapes: [{ type: "rectangle", width_mm: L, height_mm: ro - ri, center_x_mm: 0, center_y_mm: (ri + ro) / 2 }] };
  }
  throw new Error(`buildSketchPayload: unknown shape "${spec.shape}"`);
}

/** The /extrude request body for a spec. */
export function extrudePayload(spec) {
  return { depth_mm: spec.depth_mm, operation: "new" };
}

/** The /revolve request body for a revolved_ring spec (full 360 deg about the X axis). */
export function revolvePayload(spec) {
  return { angle_deg: spec.angle_deg ?? 360, axis: spec.axis ?? "X", operation: "new" };
}

/**
 * Compare a produced solid against analytic ground truth. Relative error per bbox axis + volume.
 * @returns { pass, volErr, bboxErr:[ex,ey,ez], maxErr, actual, expected, reason? }
 * pass iff EVERY signal is within relTol (with a small absolute floor on each axis). A missing/invalid
 * body, or a body_count != 1, is a FAIL with a reason (R12 -- never a fabricated pass on no data).
 */
export function compareGeometry(expected, actual, { relTol = DEFAULT_REL_TOL, absFloor = ABS_FLOOR_MM } = {}) {
  if (!actual || actual.body_count !== 1 || !Array.isArray(actual.bodies) || actual.bodies.length !== 1)
    return { pass: false, reason: `expected exactly 1 body, got ${actual?.body_count ?? "none"}`, volErr: null, bboxErr: null, maxErr: null, expected };
  const body = actual.bodies[0];
  const av = body.volume_mm3, ab = body.bounding_box_mm;
  if (!Number.isFinite(av) || !Array.isArray(ab) || ab.length !== 3 || !ab.every(Number.isFinite))
    return { pass: false, reason: "body geometry non-finite / malformed", volErr: null, bboxErr: null, maxErr: null, expected };
  const relErr = (got, want) => Math.abs(got - want) / Math.max(Math.abs(want), absFloor);
  const volErr = relErr(av, expected.volume_mm3);
  const bboxErr = [0, 1, 2].map((i) => relErr(ab[i], expected.bbox_mm[i]));
  const maxErr = Math.max(volErr, ...bboxErr);
  return { pass: maxErr <= relTol, volErr, bboxErr, maxErr, actual: { volume_mm3: av, bbox_mm: ab }, expected };
}

/**
 * Stale-in-memory verdict from >=2 extrudes of the SAME profile at DIFFERENT depths.
 * @param pairs - [{ depth_mm, z_mm }]  (z_mm = read-back bbox Z extent)
 * The add-in is LIVE iff (a) >=2 distinct intended depths were tried, (b) each read-back Z matches its
 * own intended depth within relTol, and (c) the read-back Z values actually DIFFER across depths.
 * STALE (the documented failure) iff the Z extents are ~constant despite different intended depths.
 * @returns { live, reason }
 */
export function staleVerdict(pairs, { relTol = DEFAULT_REL_TOL, absFloor = ABS_FLOOR_MM } = {}) {
  const pts = (Array.isArray(pairs) ? pairs : []).filter(
    (p) => p && Number.isFinite(p.depth_mm) && Number.isFinite(p.z_mm)
  );
  const depths = [...new Set(pts.map((p) => p.depth_mm))];
  if (depths.length < 2) return { live: false, reason: "need >=2 distinct depths to assess staleness" };
  const rel = (got, want) => Math.abs(got - want) / Math.max(Math.abs(want), absFloor);
  const mismatched = pts.filter((p) => rel(p.z_mm, p.depth_mm) > relTol);
  const zSpread = Math.max(...pts.map((p) => p.z_mm)) - Math.min(...pts.map((p) => p.z_mm));
  const depthSpread = Math.max(...depths) - Math.min(...depths);
  if (zSpread <= absFloor && depthSpread > absFloor)
    return { live: false, reason: `STALE add-in: read-back Z is constant (${pts[0].z_mm}mm) across depths ${depths.join("/")}mm -- operator must Stop then Run the PRISM add-in in Fusion (GUI-only reload)` };
  if (mismatched.length)
    return { live: false, reason: `read-back Z does not match intended depth: ${mismatched.map((p) => `${p.z_mm}!=${p.depth_mm}`).join(", ")}` };
  return { live: true, reason: `Z tracks depth across ${depths.join("/")}mm (spread ${zSpread.toFixed(2)}mm)` };
}

/**
 * Drive the live bridge for one spec: /new -> /sketch -> /extrude -> /geometry, then compare.
 * Pure w.r.t. the injected fetchImpl. Returns a datapoint { spec, ok, pass?, error?, ...compare }.
 */
export async function roundtripOne(spec, { baseUrl, fetchImpl = fetch, relTol = DEFAULT_REL_TOL } = {}) {
  const call = async (p, method, body) => {
    const init = { method, headers: { "Content-Type": "application/json" } };
    if (body !== undefined) init.body = JSON.stringify(body);
    const res = await fetchImpl(`${baseUrl}${p}`, init);
    const json = await res.json();
    return { httpOk: res.ok !== false, json };
  };
  try {
    const expected = analyticGeometry(spec); // throws on a bad spec -> never a fabricated target
    const nw = await call("/new", "POST", { name: `PRISM-CL-${spec.label ?? spec.shape}`, parametric: true });
    if (!nw.json?.success) return { spec, ok: false, error: `/new failed: ${nw.json?.error ?? "unknown"}` };
    const sk = await call("/sketch", "POST", buildSketchPayload(spec));
    if (!sk.json?.success) return { spec, ok: false, error: `/sketch failed: ${sk.json?.error ?? "unknown"}` };
    const isRev = spec.shape === "revolved_ring";
    const featPath = isRev ? "/revolve" : "/extrude";
    const ex = await call(featPath, "POST", isRev ? revolvePayload(spec) : extrudePayload(spec));
    if (!ex.json?.success) return { spec, ok: false, error: `${featPath} failed: ${ex.json?.error ?? "unknown"}` };
    const geo = await call("/geometry", "GET");
    const cmp = compareGeometry(expected, geo.json, { relTol });
    return { spec, ok: true, pass: cmp.pass, ...cmp, z_mm: geo.json?.bodies?.[0]?.bounding_box_mm?.[2] ?? null };
  } catch (e) {
    return { spec, ok: false, error: String(e?.message ?? e) };
  }
}

/**
 * Run the full battery + the stale-detection pair. Returns { datapoints, stale, summary }.
 * The stale pair re-uses the same cylinder profile at two depths (drawn from the battery if present,
 * else a dedicated R=8 D=10/30 pair) so a constant-Z add-in is caught even if every battery spec
 * happens to share one depth.
 */
export async function runRoundtrip(specs, opts = {}) {
  const datapoints = [];
  for (const spec of specs) datapoints.push(await roundtripOne(spec, opts));
  // stale pair: prefer two same-shape battery specs at different depths; else a dedicated pair.
  const cyl = specs.filter((s) => s.shape === "cylinder");
  let stalePairSpecs;
  if (cyl.length >= 2 && new Set(cyl.map((s) => s.depth_mm)).size >= 2) {
    const byDepth = [...cyl].sort((a, b) => a.depth_mm - b.depth_mm);
    stalePairSpecs = [byDepth[0], byDepth[byDepth.length - 1]];
  } else {
    stalePairSpecs = [
      { shape: "cylinder", radius_mm: 8, depth_mm: 10, label: "stale-a" },
      { shape: "cylinder", radius_mm: 8, depth_mm: 30, label: "stale-b" },
    ];
  }
  const stalePts = [];
  for (const s of stalePairSpecs) {
    const dp = datapoints.find((d) => d.spec === s && d.ok && d.z_mm != null);
    if (dp) { stalePts.push({ depth_mm: s.depth_mm, z_mm: dp.z_mm }); continue; }
    const r = await roundtripOne(s, opts);
    datapoints.push(r);
    if (r.ok && r.z_mm != null) stalePts.push({ depth_mm: s.depth_mm, z_mm: r.z_mm });
  }
  const stale = staleVerdict(stalePts, opts);
  const evaluated = datapoints.filter((d) => d.ok);
  const passed = evaluated.filter((d) => d.pass);
  const summary = {
    specs: datapoints.length,
    evaluated: evaluated.length,
    passed: passed.length,
    passRate: evaluated.length ? passed.length / evaluated.length : null,
    worstErr: evaluated.length ? Math.max(...evaluated.map((d) => d.maxErr ?? 0)) : null,
    addinLive: stale.live,
  };
  return { datapoints, stale, summary };
}

/** Default battery: known primitives spanning the fillet/hole/bore scale bands + two depths. */
export const DEFAULT_SPECS = [
  { shape: "cylinder", radius_mm: 10, depth_mm: 25, label: "cyl-R10-D25" },
  { shape: "cylinder", radius_mm: 5, depth_mm: 10, label: "cyl-R5-D10" },
  { shape: "box", width_mm: 30, height_mm: 20, depth_mm: 15, label: "box-30x20x15" },
  { shape: "box", width_mm: 12, height_mm: 12, depth_mm: 40, label: "box-12x12x40" },
  { shape: "revolved_ring", r_inner_mm: 5, r_outer_mm: 25, length_mm: 8, label: "ring-ri5-ro25-L8" },
];

// ════════════════════════════════════════════════════════════════════════════════════════════════
// REAL-CORPUS stock-envelope closed loop (U-DELTA-FUSION-CORPUS-ROUNDTRIP, slot:delta 2026-06-29)
// ────────────────────────────────────────────────────────────────────────────────────────────────
// The analytic battery above proves the live bridge on SYNTHETIC primitives. This extends the SAME
// drive machinery to the REAL JM-Die CAD corpus (cad-corpus-manifest.json, 665 classified STEP parts):
// for each real part it reads the STEP, extracts the part's axis-aligned STOCK ENVELOPE (bounding box,
// unit-resolved to mm via the shared extractor), reproduces that envelope as a stock block in live
// Fusion, reads it back, and compares. R12 HONEST FRAMING: reproducing a box of dims D and reading
// back D is near-exact BY CONSTRUCTION -- the bridge round-trips a box. The SUITE's real signal is
// therefore TWOFOLD and is NOT the per-part error: (1) end-to-end COVERAGE across the real corpus's
// size/aspect/class distribution -- which real parts survive [read -> STEP-parse -> unit-resolve ->
// envelope-extract -> live-generate -> read-back], and WHERE the pipeline silently drops a part
// (unknown unit / <2 points / degenerate planar capture) -- the silent-extraction-failure class the
// trailing-dot regression was; (2) the per-class / size-band reproduction map. It is a COVERAGE+SMOKE
// suite over all existing CAD files, NOT a claim the model GENERATES real geometry (that is the
// install/seat-gated print->geometry track). Pure w.r.t. injected readFile/fetch (hermetically tested).

const MIN_ENVELOPE_DIM_MM = 0.05; // a real machined solid has thickness in every axis (mirrors bboxStats's degenerate floor)

/**
 * A "box" spec reproducing a real part's STOCK ENVELOPE. `bbox` is the extractBboxMm result
 * ({ dims:[L,W,H] descending, mm }). Returns null for a missing/non-finite/degenerate envelope
 * (smallest axis < MIN_ENVELOPE_DIM_MM = a planar/degenerate point capture, not a manufacturable
 * stock block) so the caller SKIPS it -- NEVER feed Fusion a zero-thickness extrude (fabricated solid).
 */
export function stockEnvelopeSpec(bbox, label, partClass) {
  if (!bbox || !Array.isArray(bbox.dims) || bbox.dims.length !== 3) return null;
  const [L, W, H] = bbox.dims; // descending: L >= W >= H
  if (![L, W, H].every((d) => Number.isFinite(d) && d > 0)) return null;
  if (H < MIN_ENVELOPE_DIM_MM) return null; // degenerate / planar capture -> skip (caller records it)
  return { shape: "box", width_mm: L, height_mm: W, depth_mm: H, label: label ?? "envelope", partClass: partClass ?? "general" };
}

/**
 * Select up to `n` STEP/STP entries from a cad-corpus-manifest object. classBalanced=true round-robins
 * across part_class so a sample of N spans the corpus's class diversity (die/shaft/bushing/plate/...)
 * rather than N near-identical parts from one bucket -- the live coverage signal is only meaningful
 * across a diverse sample. Pure (no fs); the caller reads each entry's abs_path. Deterministic order
 * (manifest order preserved within a class) so a re-run over the same manifest selects the same parts.
 */
export function selectCorpusStepEntries(manifest, { n = 12, classBalanced = true, classFilter = null } = {}) {
  const entries = Array.isArray(manifest?.entries) ? manifest.entries : [];
  let steps = entries.filter((e) => /\.(step|stp)$/i.test(String(e?.ext || e?.abs_path || e?.path || "")));
  if (classFilter) steps = steps.filter((e) => (e.part_class || "general") === classFilter);
  if (n <= 0) return [];
  if (!classBalanced) return steps.slice(0, n);
  const byClass = new Map();
  for (const e of steps) { const c = e.part_class || "general"; if (!byClass.has(c)) byClass.set(c, []); byClass.get(c).push(e); }
  const classes = [...byClass.keys()];
  const out = [];
  let i = 0;
  // round-robin until n reached or every class bucket drained
  while (out.length < n && classes.some((c) => byClass.get(c).length > 0)) {
    const bucket = byClass.get(classes[i % classes.length]);
    if (bucket.length > 0) out.push(bucket.shift());
    i += 1;
  }
  return out;
}

/**
 * Select up to `n` sweep entries from a kernel-needed WORKLIST (the --corpus-harvest output), ordered by
 * priorityOrder (default freeform first -- the live kernel sweep showed freeform parts have the LARGEST
 * point-vs-kernel error: blisk 61%, impeller 72%, so they gain the most from a kernel envelope -- then
 * curved, then degenerate-prismatic, then unknown). Entries without an absPath are dropped (can't read).
 * Maps to {abs_path, rel_path, part_class, ext} so runCorpusKernelImport consumes them unchanged. Pure
 * (no fs); deterministic (label tiebreak) so a re-run over the same worklist selects the same parts.
 */
export function selectWorklistEntries(worklist, { n = 12, priorityOrder = ["freeform", "curved", "prismatic", "unknown"] } = {}) {
  const items = (Array.isArray(worklist) ? worklist : []).filter((w) => w && w.absPath);
  const rank = (w) => { const idx = priorityOrder.indexOf(w.geometryClass); return idx < 0 ? priorityOrder.length : idx; };
  const sorted = items.slice().sort((a, b) => rank(a) - rank(b) || String(a.label).localeCompare(String(b.label)));
  const picked = n > 0 ? sorted.slice(0, n) : sorted;
  return picked.map((w) => ({ abs_path: w.absPath, rel_path: w.label, part_class: w.partClass, ext: ".step" }));
}

/**
 * Filter a worklist to parts NOT yet kernel-swept (resumability for a long full-corpus sweep). A part is
 * "done" iff a kernelValid kernel-gt row matches its absPath (precise) OR its label (older rows written
 * before the absPath field existed). Failed parts (kernelValid:false) are NOT done -> retried next run.
 * Pure (no fs). Returns { remaining, alreadyDone }.
 */
export function resumeFilterWorklist(items, kernelGtRows) {
  const doneAbs = new Set(), doneLabel = new Set();
  for (const o of Array.isArray(kernelGtRows) ? kernelGtRows : []) {
    if (!o || !o.kernelValid) continue;
    if (o.absPath) doneAbs.add(o.absPath);
    if (o.label) doneLabel.add(o.label);
  }
  const src = Array.isArray(items) ? items : [];
  const remaining = src.filter((w) => w && !doneAbs.has(w.absPath) && !doneLabel.has(w.label));
  return { remaining, alreadyDone: src.length - remaining.length };
}

/**
 * Coverage rollup over corpus datapoints. Separates the THREE distinct outcomes (R12 -- a skip is data
 * quality, a fusionFail is a bridge defect, a non-pass is drift): skipped (envelope never extracted),
 * fusionEvaluated (reached Fusion + got geometry), reproduced (within tol). Per-class + worst-error.
 */
export function corpusCoverage(datapoints) {
  const dps = Array.isArray(datapoints) ? datapoints : [];
  const total = dps.length;
  const skipped = dps.filter((d) => d.skipped);
  const skippedBy = {};
  for (const d of skipped) skippedBy[d.skipped] = (skippedBy[d.skipped] || 0) + 1;
  const evaluated = dps.filter((d) => d.ok);                 // reached Fusion + read geometry back
  const reproduced = evaluated.filter((d) => d.pass);        // envelope reproduced within tol
  const fusionFailed = dps.filter((d) => !d.ok && !d.skipped); // reached Fusion but the drive errored
  const byClass = {};
  for (const d of dps) {
    const c = d.partClass || "general";
    byClass[c] = byClass[c] || { total: 0, reproduced: 0, skipped: 0 };
    byClass[c].total += 1;
    if (d.pass) byClass[c].reproduced += 1;
    if (d.skipped) byClass[c].skipped += 1;
  }
  const errs = evaluated.map((d) => d.maxErr ?? 0);
  return {
    totalParts: total,
    extracted: total - skipped.length,
    skipped: skipped.length,
    skippedBy,
    fusionEvaluated: evaluated.length,
    reproduced: reproduced.length,
    fusionFailed: fusionFailed.length,
    extractionRate: total ? (total - skipped.length) / total : null,
    reproductionRate: evaluated.length ? reproduced.length / evaluated.length : null,
    worstErr: errs.length ? Math.max(...errs) : null,
    byClass,
  };
}

/**
 * Drive the live bridge to reproduce each real part's stock envelope. Per entry:
 *   read(abs_path) -> extractBboxMm -> stockEnvelopeSpec -> roundtripOne -> datapoint.
 * Every drop-out is recorded with its reason (unreadable / extract / degenerate) -- never silently
 * skipped (R12). Pure w.r.t. injected readFileImpl + fetchImpl. Returns { datapoints, coverage, stale }.
 * The stale verdict is ADVISORY here (the authoritative add-in liveness check is the analytic battery's
 * dedicated D10/D30 pair); a corpus sample may coincide on depths.
 */
export async function runCorpusRoundtrip(entries, { readFileImpl, baseUrl, fetchImpl = fetch, relTol = DEFAULT_REL_TOL } = {}) {
  if (typeof readFileImpl !== "function") throw new Error("runCorpusRoundtrip: readFileImpl required");
  const datapoints = [];
  for (const e of Array.isArray(entries) ? entries : []) {
    const absPath = e?.abs_path || e?.path;
    const partClass = e?.part_class || "general";
    const label = String(e?.rel_path || absPath || "part").split(/[\\/]/).pop();
    let text;
    try { text = await readFileImpl(absPath); }
    catch (err) { datapoints.push({ label, partClass, ok: false, skipped: "unreadable", error: String(err?.message ?? err) }); continue; }
    const bbox = extractBboxMm(typeof text === "string" ? text : "");
    if (!bbox) { datapoints.push({ label, partClass, ok: false, skipped: "extract", error: "no envelope (unknown unit or <2 points)" }); continue; }
    const spec = stockEnvelopeSpec(bbox, label, partClass);
    if (!spec) { datapoints.push({ label, partClass, ok: false, skipped: "degenerate", error: `degenerate envelope ${JSON.stringify(bbox.dims)}` }); continue; }
    const r = await roundtripOne(spec, { baseUrl, fetchImpl, relTol });
    datapoints.push({
      label, partClass, envelope_mm: bbox.dims, maxExtentMm: bbox.maxExtentMm, pointCount: bbox.pointCount,
      ok: r.ok, pass: r.pass ?? null, maxErr: r.maxErr ?? null, z_mm: r.z_mm ?? null, error: r.error ?? null,
    });
  }
  const stalePts = datapoints
    .filter((d) => d.ok && Number.isFinite(d.z_mm) && Array.isArray(d.envelope_mm))
    .map((d) => ({ depth_mm: d.envelope_mm[2], z_mm: d.z_mm }));
  const stale = staleVerdict(stalePts, { relTol });
  return { datapoints, coverage: corpusCoverage(datapoints), stale };
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// KERNEL-BBOX ground truth via STEP /import (U-DELTA-FUSION-STEP-IMPORT-KERNELBBOX, slot:delta 2026-06-29)
// ────────────────────────────────────────────────────────────────────────────────────────────────
// The point-cloud envelope (extractBboxMm) collapses to [x,y,0] on ~29% of curved/hollow parts (the
// CORPUS-ROUNDTRIP finding). This resolves it: import the real STEP into the live add-in (POST /import,
// added to prism_api_server.py this unit) and read Fusion's KERNEL bounding box via /geometry -- the
// AUTHORITATIVE envelope, with the STEP's own units resolved natively by Fusion (no manual 25.4x). For
// each part we compare kernel vs point: AGREEMENT validates the text extractor on clean parts; a part
// the point extractor reported degenerate but the kernel resolves is RESCUED (the real win). The JS +
// hermetic tests are validatable now; the LIVE leg needs an operator add-in Stop+Run (the new /import
// route is in-memory-loaded), so there is intentionally NO live-gated test that would falsely fail headless.

// Python for POST /execute (sandbox-safe: NO `import` -- /execute blocks __import__; uses the pre-injected
// `adsk` global and captures a `result` var). Traverses root + ALL occurrences and returns the most-recent
// body's KERNEL bbox as "x,y,z" mm (cm*10). The pre-reload fallback: a STEP imports as a sub-component
// OCCURRENCE, so neither /import's root-body delta nor root-only /geometry sees it. Live-proven: the
// generated cylinder -> [30,30,40]; 3/3 real degenerate casings rescued (U-DELTA-FUSION-KERNEL-GT-PROVEN).
export const KERNEL_OCCURRENCE_TRAVERSAL_CODE = [
  "app=adsk.core.Application.get()",
  "design=adsk.fusion.Design.cast(app.activeProduct)",
  "root=design.rootComponent",
  "bodies=[root.bRepBodies.item(i) for i in range(root.bRepBodies.count)]",
  "for i in range(root.allOccurrences.count):",
  "    comp=root.allOccurrences.item(i).component",
  "    for j in range(comp.bRepBodies.count):",
  "        bodies.append(comp.bRepBodies.item(j))",
  "if bodies:",
  " b=bodies[-1]; bb=b.boundingBox",
  " result=\"%.4f,%.4f,%.4f\" % ((bb.maxPoint.x-bb.minPoint.x)*10,(bb.maxPoint.y-bb.minPoint.y)*10,(bb.maxPoint.z-bb.minPoint.z)*10)",
  "else:",
  " result=\"none\"",
].join("\n");

/** Parse a "x,y,z" kernel-traversal /execute result into a [x,y,z] mm array, or null. Pure. */
export function parseKernelExecResult(result) {
  if (typeof result !== "string" || result === "none") return null;
  const p = result.split(",").map(Number);
  return p.length === 3 && p.every((n) => Number.isFinite(n)) ? p : null;
}

/**
 * Compare Fusion's KERNEL bbox (from /geometry, mm, unsorted [x,y,z]) against the point-extracted bbox
 * ({ dims:[L,W,H] desc } or null). Returns the resolution verdict. `agreement` (max-axis rel err) is set
 * ONLY when BOTH envelopes are valid + non-degenerate -- it validates the text extractor; `resolvedByKernel`
 * marks a part the point extractor could not envelope but the kernel did (the degenerate-rescue, the win).
 */
export function kernelVsPointVerdict(kernelBboxMm, pointBbox, { relTol = DEFAULT_REL_TOL } = {}) {
  const kernelValid = Array.isArray(kernelBboxMm) && kernelBboxMm.length === 3
    && kernelBboxMm.every((d) => Number.isFinite(d) && d > 0);
  const kernelEnvelopeMm = kernelValid
    ? kernelBboxMm.map((d) => Math.round(d * 100) / 100).sort((a, b) => b - a) // [L,W,H] desc, mirror extractBboxMm
    : null;
  const pointDims = pointBbox && Array.isArray(pointBbox.dims) && pointBbox.dims.length === 3 ? pointBbox.dims : null;
  const pointDegenerate = !pointDims || pointDims.some((d) => !Number.isFinite(d) || d < MIN_ENVELOPE_DIM_MM);
  let agreement = null;
  if (kernelValid && pointDims && !pointDegenerate) {
    const rel = (g, w) => Math.abs(g - w) / Math.max(Math.abs(w), ABS_FLOOR_MM);
    agreement = Math.max(...[0, 1, 2].map((i) => rel(kernelEnvelopeMm[i], pointDims[i])));
  }
  return {
    kernelValid,
    kernelEnvelopeMm,
    pointEnvelopeMm: pointDims,
    pointDegenerate,
    resolvedByKernel: kernelValid && pointDegenerate, // kernel rescued a part the point extractor couldn't envelope
    agreement,                                         // max-axis rel err when BOTH valid (validates the text extractor)
    agree: agreement == null ? null : agreement <= relTol,
  };
}

/**
 * Build KERNEL-GT dimensional-prior training pairs (the generator's dim-prior format) from accumulated
 * kernel-gt rows ([{ partClass, kernelEnvelopeMm:[L,W,H] }]). Groups by part_class -> bboxStats ->
 * bboxTrainingPair on the AUTHORITATIVE kernel envelopes, instead of the point-cloud dataset that is
 * unreliable for complex/curved parts (only ~33% agree -- U-DELTA-FUSION-KERNEL-EXEC-FALLBACK). Reuses
 * the proven training-pair builders. Returns [{ instruction, output, partClass, files, source:"kernel-gt" }].
 * The dataset compounds as more --corpus-kernel runs accumulate kernel-gt rows.
 */
export function kernelDimPriorPairs(rows) {
  const byClass = {};
  for (const r of Array.isArray(rows) ? rows : []) {
    const env = r?.kernelEnvelopeMm;
    if (!Array.isArray(env) || env.length !== 3 || !env.every((n) => Number.isFinite(n) && n > 0)) continue;
    const c = r.partClass || "general";
    (byClass[c] ??= []).push({ dims: env, maxExtentMm: Math.max(...env) });
  }
  const pairs = [];
  for (const [c, bboxes] of Object.entries(byClass)) {
    const stats = bboxStats(bboxes); // degenerate-axis filter + median L/W/H, reused from the extractor
    const pair = bboxTrainingPair(c, stats);
    if (pair) pairs.push({ ...pair, partClass: c, files: stats?.files ?? bboxes.length, source: "kernel-gt" });
  }
  return pairs;
}

/** Coverage rollup over kernel-import datapoints. */
export function kernelCoverage(datapoints) {
  const dps = Array.isArray(datapoints) ? datapoints : [];
  const valid = dps.filter((d) => d.kernelValid);
  const compared = dps.filter((d) => d.agreement != null);
  const agreed = compared.filter((d) => d.agree === true);
  return {
    totalParts: dps.length,
    kernelValid: valid.length,
    resolvedDegenerate: dps.filter((d) => d.resolvedByKernel).length, // point-degenerate parts the kernel rescued
    comparedToPoint: compared.length,
    pointAgreed: agreed.length,
    pointAgreementRate: compared.length ? agreed.length / compared.length : null,
    failed: dps.filter((d) => !d.ok && !d.kernelValid).length,
  };
}

/**
 * For each real part: read (point bbox) -> /new -> /import(absPath) -> /geometry (kernel bbox) -> verdict.
 * Pure w.r.t. injected readFileImpl + fetchImpl. The LIVE leg requires the /import add-in route (live only
 * after an operator add-in reload). Returns { datapoints, coverage }.
 */
export async function runCorpusKernelImport(entries, { readFileImpl, baseUrl, fetchImpl = fetch, relTol = DEFAULT_REL_TOL, closeDocs = true, onDatapoint = null } = {}) {
  if (typeof readFileImpl !== "function") throw new Error("runCorpusKernelImport: readFileImpl required");
  const call = async (p, method, body) => {
    const init = { method, headers: { "Content-Type": "application/json" } };
    if (body !== undefined) init.body = JSON.stringify(body);
    const res = await fetchImpl(`${baseUrl}${p}`, init);
    return res.json();
  };
  const datapoints = [];
  // record() pushes AND fires the durability sink per part -- so a long sweep killed mid-run (session
  // limit / reaper) has every completed part already persisted (the OCR-corpus resumability lesson).
  const record = (dp) => { datapoints.push(dp); if (typeof onDatapoint === "function") { try { onDatapoint(dp); } catch { /* sink best-effort */ } } };
  let prevDocName = null; // the prior loop doc -> closed once a fresh doc is active (bounds open docs to ~1)
  for (const e of Array.isArray(entries) ? entries : []) {
    const absPath = e?.abs_path || e?.path;
    const partClass = e?.part_class || "general";
    const label = String(e?.rel_path || absPath || "part").split(/[\\/]/).pop();
    let pointBbox = null;
    try { pointBbox = extractBboxMm(await readFileImpl(absPath)); }
    catch (err) { record({ label, partClass, absPath, ok: false, error: `read: ${String(err?.message ?? err)}` }); continue; }
    try {
      const nw = await call("/new", "POST", { name: `PRISM-KGT-${label}`, parametric: true });
      if (!nw?.success) { record({ label, partClass, absPath, ok: false, error: `/new: ${nw?.error ?? "unknown"}` }); continue; }
      // DOC-BOUNDING: a fresh doc is now active, so close the PRIOR loop doc BY NAME (named-close refuses the
      // active doc -> never closes the current one; only targets our PRISM-KGT-* disposable imports, never the
      // operator's docs; saveChanges=False so nothing persists). Without this, a full-corpus sweep would
      // accumulate thousands of open Fusion windows and wedge -- the real scaling limit (the route already exists).
      if (closeDocs && prevDocName) { try { await call("/close", "POST", { names: [prevDocName], force: true }); } catch { /* best-effort cleanup */ } }
      prevDocName = nw.document_name || `PRISM-KGT-${label}`;
      const imp = await call("/import", "POST", { path: absPath });
      if (!imp?.success) { record({ label, partClass, absPath, ok: false, error: `/import: ${imp?.error ?? "unknown"}` }); continue; }
      // /import returns the imported body's KERNEL bbox directly (occurrence-aware -- a STEP imports as a
      // sub-component, NOT a root body, so root-only /geometry can't see it). Fall back to /geometry for
      // older add-ins that don't return bounding_box_mm.
      let kernelBbox = imp.bounding_box_mm;
      if (!Array.isArray(kernelBbox)) {
        const geo = await call("/geometry", "GET");
        kernelBbox = geo?.bodies?.[0]?.bounding_box_mm;
      }
      if (!Array.isArray(kernelBbox)) {
        // Pre-reload fallback: a STEP imports as a sub-component OCCURRENCE, so neither /import's root-body
        // delta nor root-only /geometry sees it -- POST /execute traverses root.allOccurrences (no add-in
        // reload needed; live-proven). Sandbox-safe code (no `import`); returns "x,y,z" mm.
        const ex = await call("/execute", "POST", { code: KERNEL_OCCURRENCE_TRAVERSAL_CODE });
        const parsed = ex?.success ? parseKernelExecResult(ex.result) : null;
        if (parsed) kernelBbox = parsed;
      }
      const v = kernelVsPointVerdict(kernelBbox, pointBbox, { relTol });
      record({ label, partClass, absPath, ok: v.kernelValid, bodiesImported: imp.bodies_imported ?? null, ...v });
    } catch (err) { record({ label, partClass, absPath, ok: false, error: String(err?.message ?? err) }); }
  }
  // final cleanup: the LAST loop doc is still active -> prefix-close reactivates a non-loop doc, then closes
  // every remaining PRISM-KGT-* (refuses empty prefix; only our disposable docs). Best-effort.
  if (closeDocs && prevDocName) { try { await call("/close", "POST", { prefix: "PRISM-KGT-", force: true }); } catch { /* best-effort */ } }
  return { datapoints, coverage: kernelCoverage(datapoints) };
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// Fusion .f3d corpus inventory (U-DELTA-FUSION-F3D-CORPUS, slot:delta 2026-06-29)
// ────────────────────────────────────────────────────────────────────────────────────────────────
// The operator's "fusion files" half of the closed-loop training corpus. The 1,738 .f3d files (vs only
// 2 in cad-corpus-manifest.json) carry a clean `<part> OP<n> v<n>` naming -> group by part-stem to a
// durable database the kernel-GT path (/import handles f3d) draws from. R12: cross-MODALITY filename
// linkage (CAD<->CAM<->CNC<->print) is NOT attempted -- those naming systems diverge (CAD descriptive,
// Mastercam/CNC numeric, print TT/It codes) so a filename join would be sparse + misleading; this stays
// WITHIN the f3d modality where the naming is consistent. Pure (no fs) -> hermetically testable.

/**
 * Normalize a Fusion .f3d/.f3z filename to its part stem, operation, and version. Real JM forms:
 *   ".25 SALVI WIRE STOP OP1 v1.f3d" -> { partStem:".25 SALVI WIRE STOP", op:"OP1", version:"v1" }
 *   "40-003-080 OP1 FUSION v1.f3d"   -> { partStem:"40-003-080", op:"OP1", version:"v1" }
 *   "1563181 v3.f3d"                 -> { partStem:"1563181", op:null,  version:"v3" }
 * Strips the trailing version, the OP<n> token (captured), and noise words (FUSION/FINAL). Upper-cased,
 * whitespace-collapsed. Never throws (a bare/odd name yields its own upper-cased stem).
 */
export function normalizeF3dStem(filename) {
  let s = String(filename ?? "").replace(/\.f3[dz]$/i, "");
  let op = null, version = null;
  const vm = s.match(/\s+v(\d+)\s*$/i);
  if (vm) { version = `v${vm[1]}`; s = s.slice(0, vm.index); }
  const om = s.match(/\s+OP\s*0*(\d+)\b/i);
  if (om) { op = `OP${om[1]}`; s = s.slice(0, om.index) + s.slice(om.index + om[0].length); }
  s = s.replace(/\b(FUSION|FINAL)\b/gi, " ").replace(/\s+/g, " ").trim().toUpperCase();
  return { partStem: s, op, version, raw: String(filename ?? "") };
}

/**
 * Group .f3d filenames into a per-part inventory. Returns
 * { totalFiles, distinctParts, partsWithMultipleOps, parts:[{partStem, ops[], versions[], fileCount}] }.
 * partsWithMultipleOps (>=2 OPs) = parts with a full machining setup captured in Fusion -- the prime
 * multi-setup closed-loop training examples. Empty-stem files (no recoverable part name) are bucketed
 * under "" and reported, never silently dropped (R12).
 */
export function buildF3dCorpus(filenames) {
  const byPart = new Map();
  for (const f of Array.isArray(filenames) ? filenames : []) {
    const n = normalizeF3dStem(f);
    if (!byPart.has(n.partStem)) byPart.set(n.partStem, { ops: new Set(), versions: new Set(), files: [] });
    const p = byPart.get(n.partStem);
    if (n.op) p.ops.add(n.op);
    if (n.version) p.versions.add(n.version);
    p.files.push(n.raw);
  }
  const parts = [...byPart.entries()]
    .map(([partStem, p]) => ({ partStem, ops: [...p.ops].sort(), versions: [...p.versions].sort(), fileCount: p.files.length }))
    .sort((a, b) => b.fileCount - a.fileCount || a.partStem.localeCompare(b.partStem));
  return {
    totalFiles: (Array.isArray(filenames) ? filenames : []).length,
    distinctParts: parts.length,
    partsWithMultipleOps: parts.filter((p) => p.ops.length >= 2).length,
    parts,
  };
}

/**
 * Walk a list of absolute STEP paths -> harvest rows (U-DELTA-CADGEN-CORPUS-HARVEST, slot:delta 2026-06-29).
 * CONTENT-dedups byte-identical path-duplicates (the JM corpus copies one part across many customer
 * folders -- e.g. 1413-246-02-1.stp appears ~14x). Skips files over sizeCapBytes (huge multi-part
 * assemblies are not single parts -> counted oversized, not harvested). doneHashes lets a --resume pass
 * skip already-harvested content. Pure w.r.t. injected readFileImpl/inferClassImpl/hashImpl; onRow is a
 * durability sink (append-per-row) so a reaper kill mid-walk loses nothing. Returns walk stats + rows.
 */
export function harvestCorpusFiles(absPaths, { readFileImpl, inferClassImpl, sizeCapBytes = 25 * 1024 * 1024, hashImpl, doneHashes = new Set(), onRow = null } = {}) {
  if (typeof readFileImpl !== "function") throw new Error("harvestCorpusFiles: readFileImpl required");
  const hash = typeof hashImpl === "function" ? hashImpl : (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
  const inferClass = typeof inferClassImpl === "function" ? inferClassImpl : inferPartClassFromCadPath;
  const seen = new Set();
  const rows = [];
  let dupSkipped = 0, oversized = 0, unreadable = 0;
  for (const abs of Array.isArray(absPaths) ? absPaths : []) {
    let text;
    try { text = readFileImpl(abs); } catch { unreadable++; continue; }
    if (typeof text !== "string") { unreadable++; continue; }
    if (text.length > sizeCapBytes) { oversized++; continue; }
    const h = hash(text);
    if (seen.has(h)) { dupSkipped++; continue; }
    seen.add(h);
    if (doneHashes.has(h)) continue; // already harvested in a prior resumable pass
    const label = String(abs).split(/[\\/]/).pop();
    const partClass = inferClass(abs);
    const row = harvestCorpusRow({ hash: h, label, absPath: abs, partClass, text });
    rows.push(row);
    if (typeof onRow === "function") onRow(row);
  }
  return { rows, totalFound: Array.isArray(absPaths) ? absPaths.length : 0, unique: seen.size, dupSkipped, oversized, unreadable };
}

async function main() {
  const args = process.argv.slice(2);
  const get = (n, d) => { const i = args.indexOf(n); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
  const asJson = args.includes("--json");
  const noWrite = args.includes("--no-write");
  const port = parseInt(process.env.PRISM_FUSION_DELTA_PORT || get("--port", String(DEFAULT_PORT)), 10) || DEFAULT_PORT;
  const baseUrl = `http://127.0.0.1:${port}`;

  // ---- OFFLINE mode: --f3d-inventory enumerates the Fusion .f3d corpus (no live bridge needed) ----
  if (args.includes("--f3d-inventory")) {
    const roots = get("--roots", "H:/PRISM/JM DIE,H:/prism/resources").split(",").map((r) => r.trim()).filter(Boolean);
    const files = [];
    for (const root of roots) {
      try {
        for (const ent of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
          if (ent.isFile() && /\.f3[dz]$/i.test(ent.name)) files.push(ent.name);
        }
      } catch (e) { process.stderr.write(`f3d-inventory: cannot read root ${root}: ${e.message}\n`); }
    }
    const corpus = buildF3dCorpus(files);
    if (!noWrite) {
      try {
        fs.mkdirSync(LEDGER_DIR, { recursive: true });
        fs.writeFileSync(path.join(LEDGER_DIR, "f3d-corpus.json"), JSON.stringify({ schemaVersion: "1.0.0", roots, ...corpus }, null, 2) + "\n");
      } catch (e) { process.stderr.write(`f3d-corpus write warn: ${e.message}\n`); }
    }
    if (asJson) { process.stdout.write(JSON.stringify(corpus, null, 2) + "\n"); return; }
    process.stdout.write(`[CAD-FUSION-F3D] ${corpus.totalFiles} .f3d files -> ${corpus.distinctParts} distinct parts; ${corpus.partsWithMultipleOps} with multi-OP setups\n`);
    for (const p of corpus.parts.slice(0, 15)) process.stdout.write(`  ${p.partStem || "(unnamed)"}: ${p.fileCount} file(s) ops[${p.ops.join(",")}] vers[${p.versions.join(",")}]\n`);
    if (corpus.parts.length > 15) process.stdout.write(`  ... +${corpus.parts.length - 15} more parts\n`);
    return;
  }

  // ---- OFFLINE mode: --kernel-dimprior emits a KERNEL-GT dim-prior dataset from accumulated kernel-gt rows ----
  if (args.includes("--kernel-dimprior")) {
    const ledger = path.join(LEDGER_DIR, "kernel-gt.jsonl");
    let rows = [];
    try { rows = fs.readFileSync(ledger, "utf8").split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); }
    catch (e) { process.stderr.write(`kernel-gt ledger unreadable (${ledger}): ${e.message}\n`); process.exit(2); }
    const pairs = kernelDimPriorPairs(rows);
    const outPath = get("--out", path.join(ROOT, "state", "shared", "lora", "cad-dimension-dataset-kernel.jsonl"));
    if (!noWrite) {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, pairs.map((p) => JSON.stringify({ instruction: p.instruction, output: p.output, partClass: p.partClass, files: p.files, source: p.source })).join("\n") + (pairs.length ? "\n" : ""));
    }
    process.stdout.write(`[CAD-FUSION-KERNEL-DIMPRIOR] ${pairs.length} kernel-GT dim-prior pair(s) from ${rows.length} kernel-gt row(s) -> ${outPath}\n`);
    for (const p of pairs) process.stdout.write(`  ${p.partClass} (${p.files} part(s)): ${p.output.slice(0, 100)}\n`);
    return;
  }

  // ---- OFFLINE mode: --corpus-harvest walks the FULL STEP corpus -> per-part geometry TRIAGE ($0, no Fusion) ----
  // Plane-only prismatic -> a TRUSTWORTHY point-cloud dim-prior NOW; curved/freeform -> a SCOPED kernel-GT
  // worklist so the operator's live Fusion sweep only touches parts that actually need it (not a blind 3,121-hammer).
  // Content-dedups the JM corpus's path-duplicate copies. Resumable: --resume skips already-harvested hashes.
  if (args.includes("--corpus-harvest")) {
    const roots = get("--roots", "H:/PRISM/JM DIE,H:/prism/resources/CAD FILES,H:/prism/BOX").split(",").map((r) => r.trim()).filter(Boolean);
    const limit = parseInt(get("--limit", "0"), 10) || 0; // 0 = all
    const rowsPath = path.join(LEDGER_DIR, "corpus-harvest-rows.jsonl");
    const resume = args.includes("--resume");
    if (!noWrite) fs.mkdirSync(LEDGER_DIR, { recursive: true });
    const doneHashes = new Set();
    if (resume) {
      try { for (const l of fs.readFileSync(rowsPath, "utf8").split(/\r?\n/)) { if (!l) continue; try { const o = JSON.parse(l); if (o.hash) doneHashes.add(o.hash); } catch {} } }
      catch (e) { process.stderr.write(`corpus-harvest resume: no prior ledger (${e.message}); fresh run\n`); }
    } else if (!noWrite) {
      try { fs.writeFileSync(rowsPath, ""); } catch {} // fresh run: aggregation reflects THIS run only
    }
    let files = [];
    for (const root of roots) {
      try {
        for (const ent of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
          if (ent.isFile() && /\.(step|stp)$/i.test(ent.name)) files.push(path.join(ent.parentPath || ent.path || root, ent.name));
        }
      } catch (e) { process.stderr.write(`corpus-harvest: cannot read root ${root}: ${e.message}\n`); }
    }
    if (limit) files = files.slice(0, limit);
    const onRow = noWrite ? null : (row) => { try { fs.appendFileSync(rowsPath, JSON.stringify(row) + "\n"); } catch {} };
    const walk = harvestCorpusFiles(files, { readFileImpl: (p) => fs.readFileSync(p, "utf8"), doneHashes, onRow });
    // aggregate from the FULL durable ledger (fresh-truncated or resume-appended) so --resume composes
    let allRows = walk.rows;
    if (!noWrite) {
      try { allRows = fs.readFileSync(rowsPath, "utf8").split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); } catch {}
    }
    const agg = aggregateHarvest(allRows);
    const priorPath = get("--out", path.join(ROOT, "state", "shared", "lora", "cad-dimension-dataset-prismatic.jsonl"));
    const radiiPath = path.join(ROOT, "state", "shared", "lora", "cad-dimension-dataset-radii.jsonl");
    const worklistPath = path.join(LEDGER_DIR, "kernel-needed-worklist.json");
    const summaryPath = path.join(LEDGER_DIR, "corpus-harvest-summary.json");
    if (!noWrite) {
      try {
        fs.mkdirSync(path.dirname(priorPath), { recursive: true });
        fs.writeFileSync(priorPath, agg.reliablePairs.map((p) => JSON.stringify({ instruction: p.instruction, output: p.output, partClass: p.partClass, files: p.files, source: p.source })).join("\n") + (agg.reliablePairs.length ? "\n" : ""));
        // RADII dataset -- reliable corpus-wide (all parts), consumed by the generator independent of envelope source
        fs.writeFileSync(radiiPath, agg.radiiPairs.map((p) => JSON.stringify({ instruction: p.instruction, output: p.output, partClass: p.partClass, files: p.files, count: p.count, source: p.source })).join("\n") + (agg.radiiPairs.length ? "\n" : ""));
        fs.writeFileSync(worklistPath, JSON.stringify({ schemaVersion: "1.0.0", count: agg.kernelNeededWorklist.length, worklist: agg.kernelNeededWorklist }, null, 2) + "\n");
        fs.writeFileSync(summaryPath, JSON.stringify({
          schemaVersion: "1.0.0", roots, totalFound: walk.totalFound, unique: walk.unique, dupSkipped: walk.dupSkipped,
          oversized: walk.oversized, unreadable: walk.unreadable, processed: agg.processed, skipped: agg.skipped,
          reliable: agg.reliable, kernelNeeded: agg.kernelNeeded, geometryClassHist: agg.geometryClassHist,
          reliableClasses: agg.reliablePairs.map((p) => ({ partClass: p.partClass, files: p.files })),
        }, null, 2) + "\n");
      } catch (e) { process.stderr.write(`corpus-harvest write warn: ${e.message}\n`); }
    }
    if (asJson) { process.stdout.write(JSON.stringify({ walk, processed: agg.processed, reliable: agg.reliable, kernelNeeded: agg.kernelNeeded, geometryClassHist: agg.geometryClassHist, reliablePairs: agg.reliablePairs, radiiPairs: agg.radiiPairs }, null, 2) + "\n"); return; }
    process.stdout.write(`[CAD-CORPUS-HARVEST] ${walk.totalFound} STEP files -> ${walk.unique} unique (${walk.dupSkipped} dup, ${walk.oversized} oversized) | processed ${agg.processed}: ${agg.reliable} prismatic-reliable + ${agg.kernelNeeded} kernel-needed + ${agg.skipped} skipped\n`);
    process.stdout.write(`  geometry: ${JSON.stringify(agg.geometryClassHist)}\n`);
    process.stdout.write(`  reliable envelope dim-prior -> ${priorPath}: ${agg.reliablePairs.map((p) => `${p.partClass}(${p.files})`).join(", ") || "(none)"}\n`);
    process.stdout.write(`  radii dim-prior (all parts) -> ${radiiPath}: ${agg.radiiPairs.map((p) => `${p.partClass}(${p.count}r)`).join(", ") || "(none)"}\n`);
    process.stdout.write(`  scoped kernel-GT worklist (${agg.kernelNeededWorklist.length}) -> ${worklistPath}\n`);
    return;
  }

  // fail loud if the bridge isn't reachable (never silently "pass" against a dead bridge)
  try {
    const s = await fetch(`${baseUrl}/status`, { signal: AbortSignal.timeout(5000) }).then((r) => r.json());
    if (s?.status !== "connected") { process.stderr.write(`Fusion bridge :${port} not connected: ${JSON.stringify(s)}\n`); process.exit(2); }
  } catch (e) { process.stderr.write(`Fusion bridge :${port} unreachable (${e.message}). Open Fusion + run the PRISM add-in, then retry.\n`); process.exit(2); }

  // ---- REAL-CORPUS mode: --corpus N reproduces N real STEP parts' stock envelopes in live Fusion ----
  const corpusN = args.includes("--corpus") ? (parseInt(get("--corpus", "12"), 10) || 12) : 0;
  if (corpusN > 0) {
    const manifestPath = get("--manifest", path.join(ROOT, "mcp-server", "data", "state", "cad-corpus-manifest.json"));
    const classFilter = get("--class", null);
    let manifest;
    try { manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")); }
    catch (e) { process.stderr.write(`corpus manifest unreadable (${manifestPath}): ${e.message}\n`); process.exit(2); }
    const entries = selectCorpusStepEntries(manifest, { n: corpusN, classBalanced: true, classFilter });
    if (!entries.length) { process.stderr.write(`no STEP entries in ${manifestPath}${classFilter ? ` for class=${classFilter}` : ""}\n`); process.exit(2); }
    const readFileImpl = (p) => fs.promises.readFile(p, "utf8");
    const result = await runCorpusRoundtrip(entries, { readFileImpl, baseUrl });
    const cov = result.coverage;
    if (!noWrite) {
      try {
        fs.mkdirSync(LEDGER_DIR, { recursive: true });
        const stamp = process.env.PRISM_RUN_STAMP || ""; // caller-supplied; scripts forbid Date.now()
        for (const d of result.datapoints) {
          fs.appendFileSync(path.join(LEDGER_DIR, "roundtrip-accuracy.jsonl"), JSON.stringify({
            schemaVersion: "1.0.0", mode: "corpus", port, stamp, label: d.label, partClass: d.partClass,
            ok: d.ok, pass: d.pass ?? null, maxErr: d.maxErr ?? null, envelope_mm: d.envelope_mm ?? null,
            skipped: d.skipped ?? null, error: d.error ?? null,
          }) + "\n");
        }
        fs.writeFileSync(path.join(LEDGER_DIR, "corpus-coverage-latest.json"), JSON.stringify({
          schemaVersion: "1.0.0", port, stamp, manifest: manifestPath, requested: corpusN, classFilter, coverage: cov, stale: result.stale,
        }, null, 2) + "\n");
      } catch (e) { process.stderr.write(`corpus ledger write warn: ${e.message}\n`); }
    }
    if (asJson) { process.stdout.write(JSON.stringify(result, null, 2) + "\n"); return; }
    process.stdout.write(`[CAD-FUSION-CORPUS] :${port} -- ${cov.reproduced}/${cov.fusionEvaluated} real parts reproduced (extraction ${cov.extracted}/${cov.totalParts}, worstErr ${cov.worstErr == null ? "n/a" : (100 * cov.worstErr).toFixed(3) + "%"})\n`);
    for (const d of result.datapoints) {
      if (d.skipped) { process.stdout.write(`  ⊘ ${d.label} [${d.partClass}]: skipped (${d.skipped})${d.error ? " " + d.error : ""}\n`); continue; }
      if (!d.ok) { process.stdout.write(`  ✗ ${d.label} [${d.partClass}]: ${d.error}\n`); continue; }
      process.stdout.write(`  ${d.pass ? "✓" : "✗"} ${d.label} [${d.partClass}]: env [${d.envelope_mm.join(" x ")}]mm maxErr ${(100 * d.maxErr).toFixed(3)}%\n`);
    }
    process.stdout.write(`  skipped ${JSON.stringify(cov.skippedBy)} | per-class ${JSON.stringify(cov.byClass)} | add-in ${result.stale.live ? "LIVE" : "(advisory) " + result.stale.reason}\n`);
    process.exit(cov.fusionEvaluated > 0 && cov.reproductionRate === 1 ? 0 : 1);
  }

  // ---- KERNEL-GT mode: --corpus-kernel N imports N real STEP parts -> Fusion KERNEL bbox (authoritative GT) ----
  // Requires the /import add-in route (live only after an operator add-in Stop+Run). Resolves the ~29%
  // of curved/hollow parts the point-cloud extractor reports degenerate.
  const kernelN = args.includes("--corpus-kernel") ? (parseInt(get("--corpus-kernel", "12"), 10) || 12) : 0;
  if (kernelN > 0) {
    const manifestPath = get("--manifest", path.join(ROOT, "mcp-server", "data", "state", "cad-corpus-manifest.json"));
    const classFilter = get("--class", null);
    // SCOPED source: --from-worklist drives the sweep from the --corpus-harvest kernel-needed worklist
    // (freeform-first, the highest point-vs-kernel error) instead of the small class-balanced manifest.
    let entries;
    if (args.includes("--from-worklist")) {
      const wlArg = get("--from-worklist", "");
      const wlPath = wlArg && !wlArg.startsWith("--") ? wlArg : path.join(LEDGER_DIR, "kernel-needed-worklist.json");
      let wl;
      try { wl = JSON.parse(fs.readFileSync(wlPath, "utf8")); }
      catch (e) { process.stderr.write(`kernel-needed worklist unreadable (${wlPath}): ${e.message} -- run --corpus-harvest first\n`); process.exit(2); }
      const items = Array.isArray(wl?.worklist) ? wl.worklist : (Array.isArray(wl) ? wl : []);
      let remaining = classFilter ? items.filter((w) => (w.partClass || "general") === classFilter) : items;
      // RESUME (default on): skip parts already kernel-swept (kernelValid rows in kernel-gt.jsonl, keyed by
      // absPath) so a long full-corpus sweep that gets interrupted (session limit / reaper) CONTINUES from
      // where it stopped instead of re-importing from the top. --no-resume forces a full re-sweep.
      let alreadyDone = 0;
      if (!args.includes("--no-resume")) {
        let gtRows = [];
        try { gtRows = fs.readFileSync(path.join(LEDGER_DIR, "kernel-gt.jsonl"), "utf8").split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); }
        catch { /* no prior ledger -> nothing done yet */ }
        const r = resumeFilterWorklist(remaining, gtRows);
        remaining = r.remaining; alreadyDone = r.alreadyDone;
      }
      entries = selectWorklistEntries(remaining, { n: kernelN });
      if (!entries.length) {
        process.stderr.write(`worklist ${wlPath}${classFilter ? ` class=${classFilter}` : ""}: nothing left to sweep${alreadyDone ? ` (${alreadyDone} already kernel-swept -- resume complete)` : " (need absPath)"}\n`);
        process.exit(alreadyDone ? 0 : 2);
      }
      process.stderr.write(`corpus-kernel: sweeping ${entries.length} part(s) from worklist ${wlPath} (freeform-first${alreadyDone ? `, ${alreadyDone} already done -- resuming` : ""})\n`);
    } else {
      let manifest;
      try { manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")); }
      catch (e) { process.stderr.write(`corpus manifest unreadable (${manifestPath}): ${e.message}\n`); process.exit(2); }
      entries = selectCorpusStepEntries(manifest, { n: kernelN, classBalanced: true, classFilter });
      if (!entries.length) { process.stderr.write(`no STEP entries in ${manifestPath}${classFilter ? ` for class=${classFilter}` : ""}\n`); process.exit(2); }
    }
    // PER-PART durable sink: append each kernel-gt row AS IT COMPLETES (not batch-at-end) so a long sweep
    // killed mid-run (session limit / reaper) keeps every finished part -> --resume continues from there.
    const stamp = process.env.PRISM_RUN_STAMP || "";
    const kgtPath = path.join(LEDGER_DIR, "kernel-gt.jsonl");
    if (!noWrite) fs.mkdirSync(LEDGER_DIR, { recursive: true });
    const onDatapoint = noWrite ? null : (d) => {
      try {
        fs.appendFileSync(kgtPath, JSON.stringify({
          schemaVersion: "1.0.0", port, stamp, label: d.label, absPath: d.absPath ?? null, partClass: d.partClass, kernelValid: d.kernelValid ?? false,
          kernelEnvelopeMm: d.kernelEnvelopeMm ?? null, pointEnvelopeMm: d.pointEnvelopeMm ?? null,
          resolvedByKernel: d.resolvedByKernel ?? false, agreement: d.agreement ?? null, error: d.error ?? null,
        }) + "\n");
      } catch { /* best-effort durability */ }
    };
    const result = await runCorpusKernelImport(entries, { readFileImpl: (p) => fs.promises.readFile(p, "utf8"), baseUrl, closeDocs: !args.includes("--keep-docs"), onDatapoint });
    const cov = result.coverage;
    if (!noWrite) {
      try {
        fs.writeFileSync(path.join(LEDGER_DIR, "kernel-gt-coverage-latest.json"), JSON.stringify({ schemaVersion: "1.0.0", port, stamp, manifest: manifestPath, coverage: cov }, null, 2) + "\n");
      } catch (e) { process.stderr.write(`kernel-gt ledger write warn: ${e.message}\n`); }
    }
    if (asJson) { process.stdout.write(JSON.stringify(result, null, 2) + "\n"); return; }
    process.stdout.write(`[CAD-FUSION-KERNEL-GT] :${port} -- ${cov.kernelValid}/${cov.totalParts} kernel envelopes (rescued ${cov.resolvedDegenerate} degenerate-point parts; point-agreement ${cov.pointAgreementRate == null ? "n/a" : (100 * cov.pointAgreementRate).toFixed(1) + "%"} of ${cov.comparedToPoint})\n`);
    for (const d of result.datapoints) {
      if (!d.kernelValid) { process.stdout.write(`  ✗ ${d.label} [${d.partClass}]: ${d.error ?? "no kernel body"}\n`); continue; }
      const tag = d.resolvedByKernel ? "RESCUED" : (d.agree === true ? "agree" : d.agree === false ? "DISAGREE" : "kernel");
      process.stdout.write(`  ✓ ${d.label} [${d.partClass}]: kernel [${d.kernelEnvelopeMm.join(" x ")}]mm (${tag}${d.agreement != null ? " " + (100 * d.agreement).toFixed(2) + "%" : ""})\n`);
    }
    process.exit(cov.kernelValid > 0 ? 0 : 1);
  }

  const result = await runRoundtrip(DEFAULT_SPECS, { baseUrl });

  if (!noWrite) {
    try {
      fs.mkdirSync(LEDGER_DIR, { recursive: true });
      const stamp = process.env.PRISM_RUN_STAMP || ""; // caller-supplied; scripts forbid Date.now()
      const line = JSON.stringify({ schemaVersion: "1.0.0", port, stamp, summary: result.summary, stale: result.stale,
        datapoints: result.datapoints.map((d) => ({ label: d.spec.label, ok: d.ok, pass: d.pass ?? null, maxErr: d.maxErr ?? null, error: d.error ?? null })) });
      fs.appendFileSync(path.join(LEDGER_DIR, "roundtrip-accuracy.jsonl"), line + "\n");
    } catch (e) { process.stderr.write(`ledger append warn: ${e.message}\n`); }
  }

  if (asJson) { process.stdout.write(JSON.stringify(result, null, 2) + "\n"); return; }
  process.stdout.write(`[CAD-FUSION-LIVE] :${port} -- ${result.summary.passed}/${result.summary.evaluated} dim-accurate (worstErr ${result.summary.worstErr == null ? "n/a" : (100 * result.summary.worstErr).toFixed(3) + "%"})\n`);
  for (const d of result.datapoints) {
    if (!d.ok) { process.stdout.write(`  ✗ ${d.spec.label}: ${d.error}\n`); continue; }
    process.stdout.write(`  ${d.pass ? "✓" : "✗"} ${d.spec.label}: volErr ${(100 * d.volErr).toFixed(3)}% bboxErr [${d.bboxErr.map((e) => (100 * e).toFixed(2) + "%").join(", ")}]\n`);
  }
  process.stdout.write(`  add-in ${result.stale.live ? "LIVE" : "STALE/FAIL"}: ${result.stale.reason}\n`);
  process.exit(result.summary.passRate === 1 && result.stale.live ? 0 : 1);
}

const isMain = (() => { try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (isMain) main().catch((e) => { process.stderr.write(`${e?.stack ?? e}\n`); process.exit(1); });
