/**
 * Tests for cad-fusion-live-roundtrip.mjs (U-DELTA-FUSION-LIVE-ROUNDTRIP, slot:delta).
 * Run: node scripts/cad-fusion-live-roundtrip.test.mjs   (node:test auto-runs on exit)
 *
 * R9: closed-loop accuracy has EXACT analytic reference points -- a cylinder is pi*R^2*D with bbox
 * [2R,2R,D]; a box is W*H*D with bbox [W,H,D]. The live :18362 probe that motivated this unit returned
 * volume 7853.9816 mm3 for R=10 D=25 (analytic pi*100*25 = 7853.98163) -- the fixtures below reuse that
 * real read-back so the compare gate is pinned to live-observed truth, not invented numbers.
 * No live calls here: every drive test injects a fake fetch.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyticGeometry, buildSketchPayload, extrudePayload, revolvePayload,
  compareGeometry, staleVerdict, roundtripOne, runRoundtrip, DEFAULT_SPECS,
  stockEnvelopeSpec, selectCorpusStepEntries, corpusCoverage, runCorpusRoundtrip,
  kernelVsPointVerdict, kernelCoverage, runCorpusKernelImport,
  normalizeF3dStem, buildF3dCorpus,
  parseKernelExecResult, KERNEL_OCCURRENCE_TRAVERSAL_CODE, kernelDimPriorPairs,
  harvestCorpusFiles, selectWorklistEntries, resumeFilterWorklist,
} from "./cad-fusion-live-roundtrip.mjs";

const near = (a, b, tol) => Math.abs(a - b) <= tol;

// ---- analyticGeometry: exact reference values ----
test("analyticGeometry: cylinder R=10 D=25 -> pi*100*25 vol, bbox [20,20,25] (matches live read-back)", () => {
  const g = analyticGeometry({ shape: "cylinder", radius_mm: 10, depth_mm: 25 });
  assert.ok(near(g.volume_mm3, 7853.981633974483, 1e-6), `vol=${g.volume_mm3}`);
  assert.deepEqual(g.bbox_mm, [20, 20, 25]);
});

test("analyticGeometry: box 30x20x15 -> vol 9000, bbox [30,20,15]", () => {
  const g = analyticGeometry({ shape: "box", width_mm: 30, height_mm: 20, depth_mm: 15 });
  assert.equal(g.volume_mm3, 9000);
  assert.deepEqual(g.bbox_mm, [30, 20, 15]);
});

test("analyticGeometry: throws on unknown shape + non-positive dims (never fabricate a target)", () => {
  assert.throws(() => analyticGeometry({ shape: "sphere", depth_mm: 1 }), /unknown shape/);
  assert.throws(() => analyticGeometry({ shape: "cylinder", radius_mm: -1, depth_mm: 5 }), /radius_mm/);
  assert.throws(() => analyticGeometry({ shape: "cylinder", radius_mm: 5, depth_mm: 0 }), /depth_mm/);
  assert.throws(() => analyticGeometry({ shape: "box", width_mm: 10, height_mm: NaN, depth_mm: 5 }), /width_mm\/height_mm/);
  assert.throws(() => analyticGeometry(null), /spec required/);
});

// ---- payloads: single-sourced request bodies ----
test("buildSketchPayload/extrudePayload: correct bridge request shapes", () => {
  assert.deepEqual(buildSketchPayload({ shape: "cylinder", radius_mm: 10 }),
    { plane: "XY", shapes: [{ type: "circle", radius_mm: 10, center_x_mm: 0, center_y_mm: 0 }] });
  assert.deepEqual(buildSketchPayload({ shape: "box", width_mm: 30, height_mm: 20 }),
    { plane: "XY", shapes: [{ type: "rectangle", width_mm: 30, height_mm: 20, center_x_mm: 0, center_y_mm: 0 }] });
  assert.deepEqual(extrudePayload({ depth_mm: 25 }), { depth_mm: 25, operation: "new" });
  assert.throws(() => buildSketchPayload({ shape: "torus" }), /unknown shape/);
});

// ---- compareGeometry: the accuracy gate (happy + failure modes) ----
const liveCyl = { body_count: 1, bodies: [{ volume_mm3: 7853.9816339741465, bounding_box_mm: [20.0, 20.0, 25.0] }] };

test("compareGeometry happy: live R=10 D=25 read-back matches analytic -> pass, ~0 error", () => {
  const cmp = compareGeometry(analyticGeometry({ shape: "cylinder", radius_mm: 10, depth_mm: 25 }), liveCyl);
  assert.ok(cmp.pass, `should pass; maxErr=${cmp.maxErr}`);
  assert.ok(cmp.maxErr < 1e-6, `near-exact; got ${cmp.maxErr}`);
});

test("compareGeometry failure 1: a drifted depth (Z=30 vs intended 25) is FLAGGED", () => {
  const drifted = { body_count: 1, bodies: [{ volume_mm3: 7853.98, bounding_box_mm: [20, 20, 30] }] };
  const cmp = compareGeometry(analyticGeometry({ shape: "cylinder", radius_mm: 10, depth_mm: 25 }), drifted);
  assert.ok(!cmp.pass, "20% Z drift must fail");
  assert.ok(near(cmp.bboxErr[2], 0.2, 1e-9), `Z err ${cmp.bboxErr[2]}`);
});

test("compareGeometry failure 2: body_count != 1 -> fail + reason (R12, no fabricated pass)", () => {
  const c0 = compareGeometry({ volume_mm3: 1, bbox_mm: [1, 1, 1] }, { body_count: 0, bodies: [] });
  assert.equal(c0.pass, false);
  assert.match(c0.reason, /1 body/);
  const c2 = compareGeometry({ volume_mm3: 1, bbox_mm: [1, 1, 1] }, { body_count: 2, bodies: [{}, {}] });
  assert.equal(c2.pass, false);
});

test("compareGeometry failure 3: malformed/non-finite body geometry -> fail + reason", () => {
  const bad = { body_count: 1, bodies: [{ volume_mm3: NaN, bounding_box_mm: [20, 20, 25] }] };
  const cmp = compareGeometry({ volume_mm3: 7853.98, bbox_mm: [20, 20, 25] }, bad);
  assert.equal(cmp.pass, false);
  assert.match(cmp.reason, /non-finite|malformed/);
});

test("compareGeometry adversarial: volume right but ONE bbox axis wrong still fails (MAX, not averaged)", () => {
  // vol exact, X+Y exact, Z off by 2% -> under maxErr this FAILS (0.02 > 0.01 tol); under a (buggy)
  // MEAN-of-errors it would PASS (mean of {volErr 0, ex 0, ey 0, ez 0.02} = 0.005 < 0.01). The fixture
  // sits in that discriminating gap so the assert PINS the max semantics, not just the outcome -- a
  // 5% drift would pass identically under max OR mean and prove nothing (R9: fail if the logic inverts).
  const sneaky = { body_count: 1, bodies: [{ volume_mm3: 7853.981633974483, bounding_box_mm: [20, 20, 25.5] }] };
  const cmp = compareGeometry(analyticGeometry({ shape: "cylinder", radius_mm: 10, depth_mm: 25 }), sneaky);
  assert.ok(!cmp.pass, "a single bad axis must fail even when volume matches");
  assert.ok(near(cmp.maxErr, 0.02, 1e-9), `maxErr must equal the Z-axis 2% (max), got ${cmp.maxErr} (a mean impl would give ~0.005 and wrongly pass)`);
});

// ---- staleVerdict: the documented stale-in-memory failure (SAFETY, R12) ----
test("staleVerdict LIVE: read-back Z tracks two distinct intended depths", () => {
  const v = staleVerdict([{ depth_mm: 10, z_mm: 10 }, { depth_mm: 30, z_mm: 30 }]);
  assert.ok(v.live, v.reason);
});

test("staleVerdict STALE: constant Z across different depths -> not live + GUI-reload instruction", () => {
  const v = staleVerdict([{ depth_mm: 10, z_mm: 10 }, { depth_mm: 30, z_mm: 10 }]);
  assert.equal(v.live, false);
  assert.match(v.reason, /STALE|constant|reload/i);
});

test("staleVerdict failure: <2 distinct depths cannot assess; Z!=depth flagged", () => {
  assert.equal(staleVerdict([{ depth_mm: 10, z_mm: 10 }]).live, false);
  const mism = staleVerdict([{ depth_mm: 10, z_mm: 10 }, { depth_mm: 30, z_mm: 27 }]);
  assert.equal(mism.live, false);
  assert.match(mism.reason, /does not match|27!=30/);
});

// ---- roundtripOne / runRoundtrip with INJECTED fetch (no live calls) ----
/** A fake Fusion bridge: serves success responses; the body Z echoes the last extrude depth (live add-in). */
function fakeBridge({ stale = false, sketchFail = false } = {}) {
  let lastDepth = null, lastSpec = null, lastFeature = null;
  return async (url, init) => {
    const p = url.replace(/^https?:\/\/[^/]+/, "");
    const body = init?.body ? JSON.parse(init.body) : {};
    const ok = (j) => ({ ok: true, json: async () => j });
    if (p === "/new") { lastSpec = body.name; return ok({ success: true, document_name: body.name }); }
    if (p === "/sketch") {
      if (sketchFail) return ok({ success: false, error: "sketch rejected" });
      lastSpec = body.shapes?.[0]; return ok({ success: true, sketch_name: "Sketch1", profile_count: 1 });
    }
    if (p === "/extrude") { lastFeature = "extrude"; lastDepth = body.depth_mm; return ok({ success: true, feature_name: "Extrude1", body_count: 1 }); }
    if (p === "/revolve") { lastFeature = "revolve"; return ok({ success: true, feature_name: "Revolve1" }); }
    if (p === "/geometry") {
      const s = lastSpec || {};
      if (lastFeature === "revolve") {
        // a rectangle (w=L axial, h=ro-ri, center_y=cy) revolved 360 about X -> annular cylinder.
        // Mirrors the LIVE-confirmed :18362 behavior (ri5/ro25/L8 -> vol 15079.6447, bbox [8,50,50]).
        const L = s.width_mm, hh = s.height_mm, cy = s.center_y_mm ?? 0;
        const ro = cy + hh / 2, ri = cy - hh / 2;
        return ok({ body_count: 1, bodies: [{ name: "Body1", volume_mm3: Math.PI * (ro * ro - ri * ri) * L, bounding_box_mm: [L, 2 * ro, 2 * ro] }] });
      }
      const r = s.radius_mm, w = s.width_mm, h = s.height_mm;
      const z = stale ? 10 : lastDepth; // stale add-in: constant Z regardless of depth
      const bbox = r != null ? [2 * r, 2 * r, z] : [w, h, z];
      const vol = r != null ? Math.PI * r * r * lastDepth : w * h * lastDepth;
      return ok({ body_count: 1, bodies: [{ name: "Body1", volume_mm3: vol, bounding_box_mm: bbox }] });
    }
    return { ok: false, json: async () => ({ error: `unknown ${p}` }) };
  };
}

test("roundtripOne happy: injected live bridge -> pass with ~0 error", async () => {
  const r = await roundtripOne({ shape: "cylinder", radius_mm: 10, depth_mm: 25, label: "t" },
    { baseUrl: "http://x", fetchImpl: fakeBridge() });
  assert.ok(r.ok && r.pass, JSON.stringify(r));
  assert.ok(r.maxErr < 1e-9);
});

test("roundtripOne failure: a /sketch error is surfaced, never a silent pass (R12)", async () => {
  const r = await roundtripOne({ shape: "cylinder", radius_mm: 10, depth_mm: 25 },
    { baseUrl: "http://x", fetchImpl: fakeBridge({ sketchFail: true }) });
  assert.equal(r.ok, false);
  assert.match(r.error, /sketch/);
});

test("runRoundtrip: full battery on a LIVE fake bridge -> 100% pass + addinLive true", async () => {
  const r = await runRoundtrip(DEFAULT_SPECS, { baseUrl: "http://x", fetchImpl: fakeBridge() });
  assert.equal(r.summary.passRate, 1);
  assert.ok(r.summary.addinLive, r.stale.reason);
  assert.equal(r.summary.evaluated, DEFAULT_SPECS.length);
});

test("runRoundtrip adversarial: a STALE add-in (constant Z) is caught -> addinLive false", async () => {
  const r = await runRoundtrip(DEFAULT_SPECS, { baseUrl: "http://x", fetchImpl: fakeBridge({ stale: true }) });
  assert.equal(r.summary.addinLive, false);
  assert.match(r.stale.reason, /STALE|constant|reload/i);
});

// ---- revolve primitive (annular ring) -- the turned/shaft/die generation op ----
test("analyticGeometry revolved_ring: ri5/ro25/L8 -> pi(625-25)*8 vol, bbox [8,50,50] (live-confirmed)", () => {
  const g = analyticGeometry({ shape: "revolved_ring", r_inner_mm: 5, r_outer_mm: 25, length_mm: 8 });
  assert.ok(near(g.volume_mm3, 15079.644737230361, 1e-6), `vol=${g.volume_mm3}`);
  assert.deepEqual(g.bbox_mm, [8, 50, 50]);
});

test("analyticGeometry revolved_ring: throws on ro<=ri, length<=0, ri<0 (never fabricate a target)", () => {
  assert.throws(() => analyticGeometry({ shape: "revolved_ring", r_inner_mm: 25, r_outer_mm: 5, length_mm: 8 }), /r_outer_mm must be > r_inner_mm/);
  assert.throws(() => analyticGeometry({ shape: "revolved_ring", r_inner_mm: 5, r_outer_mm: 25, length_mm: 0 }), /length_mm/);
  assert.throws(() => analyticGeometry({ shape: "revolved_ring", r_inner_mm: -1, r_outer_mm: 25, length_mm: 8 }), /r_inner_mm must be >= 0/);
});

test("buildSketchPayload/revolvePayload: revolved_ring -> offset rectangle + 360deg X-axis revolve", () => {
  assert.deepEqual(buildSketchPayload({ shape: "revolved_ring", r_inner_mm: 5, r_outer_mm: 25, length_mm: 8 }),
    { plane: "XY", shapes: [{ type: "rectangle", width_mm: 8, height_mm: 20, center_x_mm: 0, center_y_mm: 15 }] });
  assert.deepEqual(revolvePayload({ shape: "revolved_ring" }), { angle_deg: 360, axis: "X", operation: "new" });
});

test("roundtripOne revolve: annular ring matches analytic via /revolve (not /extrude)", async () => {
  const r = await roundtripOne({ shape: "revolved_ring", r_inner_mm: 5, r_outer_mm: 25, length_mm: 8, label: "ring" },
    { baseUrl: "http://x", fetchImpl: fakeBridge() });
  assert.ok(r.ok && r.pass, JSON.stringify(r));
  assert.ok(r.maxErr < 1e-9, `near-exact; got ${r.maxErr}`);
});

test("roundtripOne revolve adversarial: a wrong-radius read-back is FLAGGED (gate isn't revolve-blind)", async () => {
  // a fake whose revolve returns the WRONG outer radius (ro 30 not 25) must fail the analytic gate
  const wrongFake = async (url) => {
    const p = url.replace(/^https?:\/\/[^/]+/, "");
    const ok = (j) => ({ ok: true, json: async () => j });
    if (p === "/new") return ok({ success: true });
    if (p === "/sketch") return ok({ success: true, sketch_name: "S1", profile_count: 1 });
    if (p === "/revolve") return ok({ success: true, feature_name: "R1" });
    if (p === "/geometry") return ok({ body_count: 1, bodies: [{ volume_mm3: Math.PI * (30 * 30 - 5 * 5) * 8, bounding_box_mm: [8, 60, 60] }] });
    return { ok: false, json: async () => ({ error: "x" }) };
  };
  const r = await roundtripOne({ shape: "revolved_ring", r_inner_mm: 5, r_outer_mm: 25, length_mm: 8, label: "ring" },
    { baseUrl: "http://x", fetchImpl: wrongFake });
  assert.equal(r.pass, false, "wrong outer radius must fail the analytic gate");
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// REAL-CORPUS stock-envelope closed loop (U-DELTA-FUSION-CORPUS-ROUNDTRIP) -- extends the analytic
// battery to the real 665-part JM-Die CAD corpus. Reference values are REAL: a 1-inch coordinate is
// exactly 25.4 mm; a mm part's extents are unscaled. The fakeBridge above is reused (it round-trips a
// box's [w,h,depth]); the corpus harness's signal is COVERAGE across real parts + reason-tagged skips.
// ════════════════════════════════════════════════════════════════════════════════════════════════

/** Minimal but REAL STEP text: a length-unit declaration + CARTESIAN_POINTs spanning given corners. */
function mkStep(unit, corners) {
  const u = unit === "inch" ? "#9 = CONVERSION_BASED_UNIT ( 'INCH', #10 );"
    : unit === "mm" ? "#9 = ( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT ( .MILLI., .METRE. ) );"
      : "/* no length unit declared */";
  const pts = corners.map((c, i) => `#${100 + i} = CARTESIAN_POINT ( 'NONE', ( ${c[0]}, ${c[1]}, ${c[2]} ) );`).join("\n");
  return `ISO-10303-21;\nHEADER;ENDSEC;\nDATA;\n${u}\n${pts}\nENDSEC;\nEND-ISO-10303-21;`;
}

test("stockEnvelopeSpec: real bbox [30,20,15] -> box stock spec (L->width, W->height, H->depth)", () => {
  assert.deepEqual(stockEnvelopeSpec({ dims: [30, 20, 15], maxExtentMm: 30 }, "p1", "die"),
    { shape: "box", width_mm: 30, height_mm: 20, depth_mm: 15, label: "p1", partClass: "die" });
});

test("stockEnvelopeSpec: degenerate (smallest axis < 0.05mm) + malformed -> null (never a 0-thickness extrude)", () => {
  assert.equal(stockEnvelopeSpec({ dims: [30, 20, 0.02] }, "flat"), null, "planar capture must be skipped");
  assert.equal(stockEnvelopeSpec(null, "x"), null);
  assert.equal(stockEnvelopeSpec({ dims: [10, 5] }, "x"), null, "needs 3 axes");
  assert.equal(stockEnvelopeSpec({ dims: [10, 5, NaN] }, "x"), null, "non-finite axis -> null");
  assert.equal(stockEnvelopeSpec({ dims: [10, 5, -1] }, "x"), null, "negative axis -> null");
});

test("selectCorpusStepEntries: class-balanced round-robin spans classes; filters non-STEP; honors n + classFilter", () => {
  const manifest = { entries: [
    { abs_path: "a1.step", ext: ".step", part_class: "die" },
    { abs_path: "a2.step", ext: ".step", part_class: "die" },
    { abs_path: "a3.step", ext: ".step", part_class: "die" },
    { abs_path: "b1.stp", ext: ".stp", part_class: "shaft" },
    { abs_path: "c1.ipt", ext: ".ipt", part_class: "bushing" }, // non-STEP -> excluded
    { abs_path: "d1.step", ext: ".step", part_class: "plate" },
  ] };
  const sel = selectCorpusStepEntries(manifest, { n: 3, classBalanced: true });
  assert.equal(sel.length, 3);
  assert.deepEqual([...new Set(sel.map((e) => e.part_class))].sort(), ["die", "plate", "shaft"], "3 distinct classes before a 2nd die");
  assert.ok(!sel.some((e) => e.ext === ".ipt"), "non-STEP excluded");
  const filtered = selectCorpusStepEntries(manifest, { n: 10, classFilter: "die" });
  assert.equal(filtered.length, 3);
  assert.ok(filtered.every((e) => e.part_class === "die"));
  assert.equal(selectCorpusStepEntries(manifest, { n: 0 }).length, 0);
});

test("corpusCoverage: separates skipped (data) / fusionFailed (bridge) / reproduced (pass) + per-class", () => {
  const cov = corpusCoverage([
    { label: "p1", partClass: "die", ok: true, pass: true, maxErr: 0.0 },
    { label: "p2", partClass: "die", ok: true, pass: false, maxErr: 0.05 },
    { label: "p3", partClass: "shaft", ok: false, skipped: "extract" },
    { label: "p4", partClass: "plate", ok: false, error: "sketch failed" }, // reached bridge, errored
  ]);
  assert.equal(cov.totalParts, 4);
  assert.equal(cov.extracted, 3);
  assert.equal(cov.skipped, 1);
  assert.deepEqual(cov.skippedBy, { extract: 1 });
  assert.equal(cov.fusionEvaluated, 2);
  assert.equal(cov.reproduced, 1);
  assert.equal(cov.fusionFailed, 1, "a bridge-side error is NOT a data skip");
  assert.ok(near(cov.reproductionRate, 0.5, 1e-9));
  assert.ok(near(cov.worstErr, 0.05, 1e-9));
  assert.deepEqual(cov.byClass.die, { total: 2, reproduced: 1, skipped: 0 });
});

test("runCorpusRoundtrip happy: real mm + inch STEP parts reproduce their envelope via the live fake bridge", async () => {
  const files = {
    "die.step": mkStep("mm", [[0, 0, 0], [30, 20, 15]]),       // bbox [30,20,15] mm
    "shaft.stp": mkStep("inch", [[0, 0, 0], [1, 0.5, 0.25]]),  // 1x0.5x0.25 in -> [25.4,12.7,6.35] mm
  };
  const res = await runCorpusRoundtrip(
    [{ abs_path: "die.step", ext: ".step", part_class: "die", rel_path: "die.step" },
     { abs_path: "shaft.stp", ext: ".stp", part_class: "shaft", rel_path: "shaft.stp" }],
    { readFileImpl: (p) => files[p], baseUrl: "http://x", fetchImpl: fakeBridge() });
  assert.equal(res.coverage.fusionEvaluated, 2);
  assert.equal(res.coverage.reproduced, 2);
  assert.ok(res.coverage.worstErr < 1e-6, `near-exact reproduction; got ${res.coverage.worstErr}`);
  assert.deepEqual(res.datapoints.find((d) => d.label === "die.step").envelope_mm, [30, 20, 15]);
  assert.deepEqual(res.datapoints.find((d) => d.label === "shaft.stp").envelope_mm, [25.4, 12.7, 6.35], "inch unit-resolved to mm");
});

test("runCorpusRoundtrip failure modes: unreadable / unknown-unit / degenerate are recorded with reasons (R12, never silent)", async () => {
  const files = {
    "nounit.step": mkStep("none", [[0, 0, 0], [10, 10, 10]]), // unknown unit -> extractBboxMm null
    "flat.step": mkStep("mm", [[0, 0, 0], [30, 20, 0]]),       // smallest axis 0 -> degenerate
  };
  const readFileImpl = (p) => { if (!(p in files)) throw new Error("ENOENT no such file"); return files[p]; };
  const res = await runCorpusRoundtrip(
    [{ abs_path: "missing.step", ext: ".step", part_class: "die", rel_path: "missing.step" },
     { abs_path: "nounit.step", ext: ".step", part_class: "shaft", rel_path: "nounit.step" },
     { abs_path: "flat.step", ext: ".step", part_class: "plate", rel_path: "flat.step" }],
    { readFileImpl, baseUrl: "http://x", fetchImpl: fakeBridge() });
  assert.equal(res.coverage.fusionEvaluated, 0);
  assert.deepEqual(res.coverage.skippedBy, { unreadable: 1, extract: 1, degenerate: 1 });
  assert.match(res.datapoints.find((d) => d.label === "missing.step").error, /ENOENT/);
});

test("runCorpusRoundtrip adversarial: a huge inch block still reproduces; a /sketch-failing bridge is fusionFailed NOT a skip", async () => {
  const big = mkStep("inch", [[0, 0, 0], [12, 8, 4]]); // 12x8x4 in -> [304.8,203.2,101.6] mm
  const ent = [{ abs_path: "big.step", ext: ".step", part_class: "die", rel_path: "big.step" }];
  const ok = await runCorpusRoundtrip(ent, { readFileImpl: () => big, baseUrl: "http://x", fetchImpl: fakeBridge() });
  assert.deepEqual(ok.datapoints[0].envelope_mm, [304.8, 203.2, 101.6]);
  assert.ok(ok.datapoints[0].pass, "a huge real part still round-trips");
  const failed = await runCorpusRoundtrip(ent, { readFileImpl: () => big, baseUrl: "http://x", fetchImpl: fakeBridge({ sketchFail: true }) });
  assert.equal(failed.coverage.fusionFailed, 1);
  assert.equal(failed.coverage.skipped, 0, "a bridge defect must not be miscounted as a data skip");
  assert.match(failed.datapoints[0].error, /sketch/);
});

test("runCorpusRoundtrip: missing readFileImpl throws (R12 -- no silent no-op)", async () => {
  await assert.rejects(() => runCorpusRoundtrip([{ abs_path: "x.step", ext: ".step" }], { baseUrl: "http://x" }), /readFileImpl required/);
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// KERNEL-BBOX ground truth via /import (U-DELTA-FUSION-STEP-IMPORT-KERNELBBOX) -- resolves the ~29%
// degenerate point-cloud envelopes. The kernel bbox from /geometry IS the authoritative envelope;
// these tests verify the kernel-vs-point verdict + the degenerate-RESCUE win, with injected fetch
// (the LIVE leg needs the /import add-in route, live only after an operator add-in reload).
// ════════════════════════════════════════════════════════════════════════════════════════════════

test("kernelVsPointVerdict: clean part -> kernel agrees with the point extractor (validates the text extractor)", () => {
  const v = kernelVsPointVerdict([30, 20, 15], { dims: [30, 20, 15] });
  assert.equal(v.kernelValid, true);
  assert.deepEqual(v.kernelEnvelopeMm, [30, 20, 15]);
  assert.equal(v.agree, true);
  assert.equal(v.resolvedByKernel, false);
  assert.ok(v.agreement < 1e-9, `near-exact; got ${v.agreement}`);
});

test("kernelVsPointVerdict: kernel RESCUES a degenerate point envelope (the win) -- NO false agreement", () => {
  const v = kernelVsPointVerdict([63.88, 12.5, 50.93], { dims: [63.88, 50.93, 0] }); // point flat in Z
  assert.equal(v.kernelValid, true);
  assert.deepEqual(v.kernelEnvelopeMm, [63.88, 50.93, 12.5], "kernel bbox sorted desc");
  assert.equal(v.pointDegenerate, true);
  assert.equal(v.resolvedByKernel, true);
  assert.equal(v.agreement, null, "no agreement is computed against a degenerate point envelope");
  assert.equal(v.agree, null);
});

test("kernelVsPointVerdict: invalid kernel + disagreement are flagged (R12, no fabricated pass)", () => {
  assert.equal(kernelVsPointVerdict(null, { dims: [10, 10, 10] }).kernelValid, false);
  assert.equal(kernelVsPointVerdict([10, 10, 0], { dims: [10, 10, 10] }).kernelValid, false, "a flat kernel bbox is invalid");
  const dis = kernelVsPointVerdict([40, 20, 15], { dims: [30, 20, 15] }); // longest axis off by 10/30
  assert.equal(dis.agree, false);
  assert.ok(near(dis.agreement, 10 / 30, 1e-9), `max-axis err ${dis.agreement}`);
});

test("kernelCoverage: counts kernelValid / resolvedDegenerate / point-agreement separately", () => {
  const cov = kernelCoverage([
    { kernelValid: true, ok: true, agreement: 0.0, agree: true, resolvedByKernel: false },
    { kernelValid: true, ok: true, agreement: null, agree: null, resolvedByKernel: true },  // rescued
    { kernelValid: false, ok: false, error: "/import: x" },
  ]);
  assert.equal(cov.totalParts, 3);
  assert.equal(cov.kernelValid, 2);
  assert.equal(cov.resolvedDegenerate, 1);
  assert.equal(cov.comparedToPoint, 1);
  assert.equal(cov.pointAgreed, 1);
  assert.ok(near(cov.pointAgreementRate, 1, 1e-9));
  assert.equal(cov.failed, 1);
});

test("runCorpusKernelImport happy: kernel import RESCUES a degenerate-point part + AGREES on a clean part", async () => {
  const files = {
    "flat.step": mkStep("mm", [[0, 0, 0], [63.88, 50.93, 0]]), // point-degenerate (Z extent 0)
    "clean.step": mkStep("mm", [[0, 0, 0], [30, 20, 15]]),      // point [30,20,15]
  };
  const kernelByLabel = { "flat.step": [63.88, 50.93, 12.5], "clean.step": [30, 20, 15] };
  let lastKernel = null;
  const fetchImpl = async (url, init) => {
    const p = url.replace(/^https?:\/\/[^/]+/, "");
    const body = init?.body ? JSON.parse(init.body) : {};
    const ok = (j) => ({ ok: true, json: async () => j });
    if (p === "/new") return ok({ success: true });
    if (p === "/import") { lastKernel = kernelByLabel[String(body.path).split(/[\\/]/).pop()]; return ok({ success: true, bodies_imported: 1 }); }
    if (p === "/geometry") return ok({ body_count: 1, bodies: [{ bounding_box_mm: lastKernel }] });
    return { ok: false, json: async () => ({ error: "x" }) };
  };
  const res = await runCorpusKernelImport(
    [{ abs_path: "flat.step", ext: ".step", part_class: "casing", rel_path: "flat.step" },
     { abs_path: "clean.step", ext: ".step", part_class: "die", rel_path: "clean.step" }],
    { readFileImpl: (pp) => files[pp], baseUrl: "http://x", fetchImpl });
  assert.equal(res.coverage.kernelValid, 2);
  assert.equal(res.coverage.resolvedDegenerate, 1, "the flat point part is rescued by the kernel envelope");
  assert.equal(res.datapoints.find((d) => d.label === "flat.step").resolvedByKernel, true);
  assert.equal(res.datapoints.find((d) => d.label === "clean.step").agree, true);
});

test("runCorpusKernelImport: DOC-BOUNDING closes each prior loop doc by name + prefix-cleans at end (no Fusion wedge at scale)", async () => {
  const files = { "a.step": mkStep("mm", [[0, 0, 0], [10, 10, 10]]), "b.step": mkStep("mm", [[0, 0, 0], [20, 20, 20]]), "c.step": mkStep("mm", [[0, 0, 0], [30, 30, 30]]) };
  const closes = [];
  const fetchImpl = async (url, init) => {
    const p = url.replace(/^https?:\/\/[^/]+/, "");
    const body = init?.body ? JSON.parse(init.body) : {};
    const ok = (j) => ({ ok: true, json: async () => j });
    if (p === "/new") return ok({ success: true, document_name: body.name });
    if (p === "/import") return ok({ success: true, bodies_imported: 1, bounding_box_mm: [10, 10, 10] });
    if (p === "/close") { closes.push(body); return ok({ success: true, closed: body.names ?? [], remaining: 1 }); }
    return { ok: false, json: async () => ({ error: "x" }) };
  };
  const ent = ["a", "b", "c"].map((n) => ({ abs_path: `${n}.step`, ext: ".step", part_class: "die", rel_path: `${n}.step` }));
  const res = await runCorpusKernelImport(ent, { readFileImpl: (pp) => files[pp], baseUrl: "http://x", fetchImpl });
  assert.equal(res.coverage.kernelValid, 3);
  // 2 mid-loop named closes (prior doc for b and c) + 1 final prefix close = 3 total
  const named = closes.filter((c) => c.names);
  assert.deepEqual(named.map((c) => c.names[0]), ["PRISM-KGT-a.step", "PRISM-KGT-b.step"], "each prior loop doc closed BY NAME (never the active one)");
  assert.ok(named.every((c) => c.force === true), "force=true closes our own modified disposable docs");
  const prefixClose = closes.find((c) => c.prefix);
  assert.equal(prefixClose?.prefix, "PRISM-KGT-", "final prefix-clean of the last (active) loop doc");
  // closeDocs:false -> never closes (debug / operator-keeps-docs path)
  const closes2 = [];
  const fetch2 = async (url, init) => { const p = url.replace(/^https?:\/\/[^/]+/, ""); const ok = (j) => ({ ok: true, json: async () => j }); if (p === "/close") { closes2.push(1); } return ok(p === "/import" ? { success: true, bounding_box_mm: [10, 10, 10] } : { success: true }); };
  await runCorpusKernelImport(ent, { readFileImpl: (pp) => files[pp], baseUrl: "http://x", fetchImpl: fetch2, closeDocs: false });
  assert.equal(closes2.length, 0, "closeDocs:false suppresses all /close calls");
});

test("runCorpusKernelImport: onDatapoint fires PER PART (incl failures) -> durable mid-sweep persistence", async () => {
  const files = { "ok.step": mkStep("mm", [[0, 0, 0], [10, 10, 10]]), "bad.step": mkStep("mm", [[0, 0, 0], [5, 5, 5]]) };
  const fetchImpl = async (url, init) => {
    const p = url.replace(/^https?:\/\/[^/]+/, ""); const body = init?.body ? JSON.parse(init.body) : {};
    const ok = (j) => ({ ok: true, json: async () => j });
    if (p === "/new") return ok({ success: true, document_name: body.name });
    if (p === "/import") return String(body.path).includes("bad") ? ok({ success: false, error: "no_body" }) : ok({ success: true, bounding_box_mm: [10, 10, 10] });
    if (p === "/close") return ok({ success: true });
    return { ok: false, json: async () => ({ error: "x" }) };
  };
  const seen = [];
  const ent = ["ok", "bad"].map((n) => ({ abs_path: `${n}.step`, ext: ".step", part_class: "die", rel_path: `${n}.step` }));
  await runCorpusKernelImport(ent, { readFileImpl: (pp) => files[pp], baseUrl: "http://x", fetchImpl, onDatapoint: (d) => seen.push(d) });
  assert.equal(seen.length, 2, "fires for BOTH the success and the /import failure (every part persisted)");
  assert.equal(seen.filter((d) => d.kernelValid).length, 1);
  assert.ok(seen.every((d) => "absPath" in d), "every persisted row carries absPath (resume key)");
});

test("runCorpusKernelImport failures: /import error + read error are recorded; missing readFileImpl throws (R12)", async () => {
  const ent = [{ abs_path: "p.step", ext: ".step", part_class: "die", rel_path: "p.step" }];
  const files = { "p.step": mkStep("mm", [[0, 0, 0], [10, 10, 10]]) };
  const importFail = async (url) => {
    const p = url.replace(/^https?:\/\/[^/]+/, "");
    const ok = (j) => ({ ok: true, json: async () => j });
    if (p === "/new") return ok({ success: true });
    if (p === "/import") return ok({ success: false, error: "no_active_design" });
    return ok({ body_count: 0, bodies: [] });
  };
  const failRes = await runCorpusKernelImport(ent, { readFileImpl: (pp) => files[pp], baseUrl: "http://x", fetchImpl: importFail });
  assert.equal(failRes.coverage.kernelValid, 0);
  assert.match(failRes.datapoints[0].error, /import/);
  const readFail = await runCorpusKernelImport(ent, { readFileImpl: () => { throw new Error("ENOENT"); }, baseUrl: "http://x", fetchImpl: importFail });
  assert.match(readFail.datapoints[0].error, /read.*ENOENT/);
  await assert.rejects(() => runCorpusKernelImport(ent, { baseUrl: "http://x" }), /readFileImpl required/);
});

test("parseKernelExecResult: parses 'x,y,z' -> [x,y,z]; rejects 'none' / wrong arity / non-finite", () => {
  assert.deepEqual(parseKernelExecResult("30.0000,30.0000,40.0000"), [30, 30, 40]);
  assert.equal(parseKernelExecResult("none"), null);
  assert.equal(parseKernelExecResult("1,2"), null, "needs exactly 3");
  assert.equal(parseKernelExecResult("a,b,c"), null, "non-finite -> null");
  assert.equal(parseKernelExecResult(null), null);
  assert.equal(parseKernelExecResult(""), null);
});

test("kernelDimPriorPairs: groups KERNEL envelopes per class -> generator-format dim-prior pairs; drops invalid", () => {
  const pairs = kernelDimPriorPairs([
    { partClass: "casing", kernelEnvelopeMm: [63.88, 50.93, 50.93] },
    { partClass: "casing", kernelEnvelopeMm: [44.83, 38.23, 38.23] },
    { partClass: "die", kernelEnvelopeMm: [31.88, 31.88, 19.63] },
    { partClass: "die", kernelEnvelopeMm: [50, 40, 30] },
    { partClass: "drop1", kernelEnvelopeMm: [10, 10, 0] }, // zero axis -> invalid -> skipped
    { partClass: "drop2", kernelEnvelopeMm: null },         // null -> skipped
  ]);
  assert.deepEqual(pairs.map((p) => p.partClass).sort(), ["casing", "die"], "valid classes only");
  const casing = pairs.find((p) => p.partClass === "casing");
  assert.equal(casing.source, "kernel-gt");
  assert.equal(casing.files, 2);
  assert.match(casing.instruction, /classified as "casing"/);
  assert.match(casing.output, /envelope/i);
  assert.deepEqual(kernelDimPriorPairs([]), []);
  assert.deepEqual(kernelDimPriorPairs(null), []);
});

test("KERNEL_OCCURRENCE_TRAVERSAL_CODE: sandbox-safe (no `import`), traverses occurrences, sets `result`", () => {
  assert.ok(!/\bimport\b/.test(KERNEL_OCCURRENCE_TRAVERSAL_CODE), "must NOT contain `import` (/execute blocks __import__)");
  assert.match(KERNEL_OCCURRENCE_TRAVERSAL_CODE, /allOccurrences/);
  assert.match(KERNEL_OCCURRENCE_TRAVERSAL_CODE, /result\s*=/);
});

test("runCorpusKernelImport: /execute occurrence-traversal FALLBACK when /import + /geometry give no bbox (pre-reload add-in)", async () => {
  // pre-reload add-in: /import has no bounding_box_mm AND root-only /geometry is empty (body is in an
  // occurrence) -> the validator must fall back to POST /execute, which returns the kernel bbox "x,y,z".
  const files = { "casing.step": mkStep("mm", [[0, 0, 0], [60, 50, 0]]) }; // point-degenerate (Z=0)
  const fetchImpl = async (url, init) => {
    const p = url.replace(/^https?:\/\/[^/]+/, "");
    const ok = (j) => ({ ok: true, json: async () => j });
    if (p === "/new") return ok({ success: true });
    if (p === "/import") return ok({ success: true, bodies_imported: 0, body_count: 0 }); // no bbox (old add-in)
    if (p === "/geometry") return ok({ body_count: 0, bodies: [] });                       // root-only -> empty
    if (p === "/execute") return ok({ success: true, result: "60.0000,50.0000,50.0000" }); // occurrence traversal
    return { ok: false, json: async () => ({ error: "x" }) };
  };
  const res = await runCorpusKernelImport(
    [{ abs_path: "casing.step", ext: ".step", part_class: "casing", rel_path: "casing.step" }],
    { readFileImpl: (pp) => files[pp], baseUrl: "http://x", fetchImpl });
  assert.equal(res.coverage.kernelValid, 1, "kernel resolves via /execute fallback");
  assert.equal(res.datapoints[0].resolvedByKernel, true, "point was degenerate -> rescued by the kernel");
  assert.deepEqual(res.datapoints[0].kernelEnvelopeMm, [60, 50, 50]);
});

test("runCorpusKernelImport: reads the KERNEL bbox from /import bounding_box_mm (occurrence-aware add-in; /geometry root-only is empty)", async () => {
  // A STEP imports as an occurrence -> root-only /geometry sees nothing; the occurrence-aware /import
  // returns the kernel bbox directly. Verifies the validator prefers it (live-proven: cylinder -> [30,30,40]).
  const files = { "p.step": mkStep("mm", [[0, 0, 0], [30, 20, 15]]) };
  const fetchImpl = async (url, init) => {
    const p = url.replace(/^https?:\/\/[^/]+/, "");
    const ok = (j) => ({ ok: true, json: async () => j });
    if (p === "/new") return ok({ success: true });
    if (p === "/import") return ok({ success: true, bodies_imported: 0, body_count: 1, bounding_box_mm: [30, 30, 40] });
    if (p === "/geometry") return ok({ body_count: 0, bodies: [] }); // root-only -> empty (the occurrence trap)
    return { ok: false, json: async () => ({ error: "x" }) };
  };
  const res = await runCorpusKernelImport(
    [{ abs_path: "p.step", ext: ".step", part_class: "shaft", rel_path: "p.step" }],
    { readFileImpl: (pp) => files[pp], baseUrl: "http://x", fetchImpl });
  assert.equal(res.coverage.kernelValid, 1, "kernel resolves from /import even though /geometry is empty");
  assert.deepEqual(res.datapoints[0].kernelEnvelopeMm, [40, 30, 30]);
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// Fusion .f3d corpus inventory (U-DELTA-FUSION-F3D-CORPUS) -- the operator's "fusion files" database.
// Reference values are REAL JM filenames sampled from the live corpus.
// ════════════════════════════════════════════════════════════════════════════════════════════════

test("normalizeF3dStem: real JM forms -> part stem + OP + version (FUSION noise stripped, upper-cased)", () => {
  assert.deepEqual(normalizeF3dStem(".25 SALVI WIRE STOP OP1 v1.f3d"),
    { partStem: ".25 SALVI WIRE STOP", op: "OP1", version: "v1", raw: ".25 SALVI WIRE STOP OP1 v1.f3d" });
  assert.deepEqual(normalizeF3dStem("40-003-080 OP1 FUSION v1.f3d"),
    { partStem: "40-003-080", op: "OP1", version: "v1", raw: "40-003-080 OP1 FUSION v1.f3d" });
  assert.deepEqual(normalizeF3dStem("1563181 v3.f3d"),
    { partStem: "1563181", op: null, version: "v3", raw: "1563181 v3.f3d" });
  // OP with leading zero + no version
  assert.equal(normalizeF3dStem("ABC-12 OP02.f3d").op, "OP2");
  assert.equal(normalizeF3dStem("ABC-12 OP02.f3d").partStem, "ABC-12");
  // bare/odd name never throws
  assert.equal(normalizeF3dStem("").partStem, "");
  assert.equal(normalizeF3dStem(null).partStem, "");
});

test("buildF3dCorpus: groups by part stem; flags multi-OP parts (prime multi-setup training examples)", () => {
  const corpus = buildF3dCorpus([
    "1563181 OP1 v1.f3d",
    "1563181 OP2 v1.f3d",   // same part, 2nd OP -> multi-OP
    "1563181 OP2 v2.f3d",   // same part+OP, new version
    ".25 SALVI WIRE STOP v1.f3d", // single-OP part (no OP token)
    "weird-no-stem.bin.f3d",      // its own stem, 1 file
  ]);
  assert.equal(corpus.totalFiles, 5);
  assert.equal(corpus.distinctParts, 3);
  assert.equal(corpus.partsWithMultipleOps, 1, "only 1563181 has >=2 OPs");
  const p = corpus.parts.find((x) => x.partStem === "1563181");
  assert.deepEqual(p.ops, ["OP1", "OP2"]);
  assert.deepEqual(p.versions, ["v1", "v2"]);
  assert.equal(p.fileCount, 3);
  // sorted by fileCount desc -> 1563181 (3 files) first
  assert.equal(corpus.parts[0].partStem, "1563181");
});

test("buildF3dCorpus: empty + non-array inputs are safe (R12, never throws)", () => {
  assert.deepEqual(buildF3dCorpus([]), { totalFiles: 0, distinctParts: 0, partsWithMultipleOps: 0, parts: [] });
  assert.equal(buildF3dCorpus(null).totalFiles, 0);
});

// ---- harvestCorpusFiles (U-DELTA-CADGEN-CORPUS-HARVEST): content-dedup + size-cap + resumable skip ----
const MM_H = "( LENGTH_UNIT ( ) SI_UNIT ( .MILLI., .METRE. ) )";
const ptL = (x, y, z) => `#1 = CARTESIAN_POINT ( 'NONE', ( ${x}, ${y}, ${z} ) )`;
const PLANE = "#10 = PLANE ( 'NONE', #11 )";
const CYL = "#20 = CYLINDRICAL_SURFACE ( 'NONE', #21, 5.0 )";
const prismaticText = (tag) => `${MM_H}\n${ptL(0, 0, 0)}\n${ptL(40, 20, 10)}\n${PLANE}\n/* ${tag} */`;
const curvedText = `${MM_H}\n${ptL(0, 0, 0)}\n${ptL(40, 20, 10)}\n${CYL}`;

test("harvestCorpusFiles: CONTENT-dedups byte-identical path-duplicates (the JM corpus's 14x copies)", () => {
  const txt = prismaticText("die");
  const fakeFs = { "a/die.stp": txt, "b/die.stp": txt, "c/other.stp": curvedText };
  const r = harvestCorpusFiles(Object.keys(fakeFs), {
    readFileImpl: (p) => fakeFs[p], inferClassImpl: () => "die",
  });
  assert.equal(r.totalFound, 3);
  assert.equal(r.unique, 2);       // die.stp counted once despite 2 paths
  assert.equal(r.dupSkipped, 1);
  assert.equal(r.rows.length, 2);
});

test("harvestCorpusFiles: oversized files (huge assemblies) are counted, not harvested", () => {
  const big = "x".repeat(5000); // a 44MB-assembly stand-in -- genuinely larger than the prismatic fixture
  const r = harvestCorpusFiles(["big.stp", "ok.stp"], {
    readFileImpl: (p) => (p === "big.stp" ? big : prismaticText("ok")),
    inferClassImpl: () => "general", sizeCapBytes: 1000,
  });
  assert.equal(r.oversized, 1);
  assert.equal(r.rows.length, 1); // only ok.stp harvested
});

test("harvestCorpusFiles: doneHashes lets --resume skip already-harvested content (no re-work)", () => {
  const txt = prismaticText("die");
  const hashImpl = () => "FIXEDHASH";
  const r = harvestCorpusFiles(["die.stp"], {
    readFileImpl: () => txt, inferClassImpl: () => "die", hashImpl, doneHashes: new Set(["FIXEDHASH"]),
  });
  assert.equal(r.rows.length, 0, "already-done hash is skipped");
  assert.equal(r.unique, 1);
});

test("harvestCorpusFiles: onRow fires per NEW row (durability sink for reaper-kill resumability)", () => {
  const seen = [];
  harvestCorpusFiles(["a.stp", "b.stp"], {
    readFileImpl: (p) => (p === "a.stp" ? prismaticText("a") : curvedText),
    inferClassImpl: () => "general", onRow: (row) => seen.push(row.label),
  });
  assert.deepEqual(seen.sort(), ["a.stp", "b.stp"]);
});

test("harvestCorpusFiles: unreadable files counted, never throw; missing readFileImpl throws (R12)", () => {
  const r = harvestCorpusFiles(["x.stp"], { readFileImpl: () => { throw new Error("EACCES"); }, inferClassImpl: () => "g" });
  assert.equal(r.unreadable, 1);
  assert.equal(r.rows.length, 0);
  assert.throws(() => harvestCorpusFiles(["x"], {}), /readFileImpl required/);
});

// ---- selectWorklistEntries: drive the kernel sweep from the scoped worklist, freeform-first ----
const WL = [
  { label: "block.stp", absPath: "/c/block.stp", partClass: "die", geometryClass: "prismatic", reason: "degenerate-point-capture" },
  { label: "imp.stp", absPath: "/c/imp.stp", partClass: "impeller", geometryClass: "freeform", reason: "curved:freeform" },
  { label: "shaft.stp", absPath: "/c/shaft.stp", partClass: "shaft", geometryClass: "curved", reason: "curved:curved" },
  { label: "noPath.stp", absPath: null, partClass: "die", geometryClass: "freeform", reason: "curved:freeform" }, // dropped
];
test("selectWorklistEntries: freeform-first priority (highest kernel-vs-point error swept first)", () => {
  const e = selectWorklistEntries(WL, { n: 10 });
  assert.deepEqual(e.map((x) => x.rel_path), ["imp.stp", "shaft.stp", "block.stp"]); // freeform > curved > prismatic; null-path dropped
  assert.equal(e[0].abs_path, "/c/imp.stp");
  assert.equal(e[0].part_class, "impeller");
  assert.equal(e[0].ext, ".step"); // shaped for runCorpusKernelImport
});
test("selectWorklistEntries: caps at n; n<=0 returns all; entries without absPath dropped (can't read)", () => {
  assert.equal(selectWorklistEntries(WL, { n: 2 }).length, 2);
  assert.equal(selectWorklistEntries(WL, { n: 0 }).length, 3); // all actionable (noPath dropped)
  assert.equal(selectWorklistEntries([{ label: "x", absPath: null }], { n: 5 }).length, 0);
});
test("selectWorklistEntries: adversarial empty / non-array -> [], no throw", () => {
  assert.deepEqual(selectWorklistEntries([], { n: 5 }), []);
  assert.doesNotThrow(() => selectWorklistEntries(null, {}));
  assert.deepEqual(selectWorklistEntries(null), []);
});

// ---- resumeFilterWorklist: skip already-swept parts so a long sweep resumes (U-DELTA-KERNELSWEEP-RESUME) ----
test("resumeFilterWorklist: skips parts kernelValid in the ledger by absPath OR label; failed parts retried", () => {
  const items = [
    { label: "a.step", absPath: "/c/a.step" },
    { label: "b.step", absPath: "/c/b.step" },   // done by absPath
    { label: "c.step", absPath: "/c/c.step" },   // done by label only (older row, no absPath)
    { label: "d.step", absPath: "/c/d.step" },   // failed last run -> retried
  ];
  const gt = [
    { kernelValid: true, absPath: "/c/b.step", label: "b.step" },
    { kernelValid: true, absPath: null, label: "c.step" },        // older row: no absPath, label match
    { kernelValid: false, absPath: "/c/d.step", label: "d.step" }, // failed -> NOT done
  ];
  const r = resumeFilterWorklist(items, gt);
  assert.deepEqual(r.remaining.map((w) => w.label), ["a.step", "d.step"], "b (absPath) + c (label) skipped; d (failed) retried");
  assert.equal(r.alreadyDone, 2);
});
test("resumeFilterWorklist: empty ledger -> nothing done; adversarial non-array -> no throw", () => {
  const items = [{ label: "a", absPath: "/a" }];
  assert.equal(resumeFilterWorklist(items, []).alreadyDone, 0);
  assert.equal(resumeFilterWorklist(items, null).remaining.length, 1);
  assert.doesNotThrow(() => resumeFilterWorklist(null, null));
  assert.deepEqual(resumeFilterWorklist(null, null).remaining, []);
});
