/**
 * region-classify -- DI tests for the P1.5 step-2b live glue orchestrator (GPU-free).
 *
 * extractWithRegionRouting takes injectable deps (readImageSize/segment/cropRegions/runEnsemble) so
 * the routing + recall-first union logic is tested WITHOUT a GPU/Ollama. The load-bearing contract:
 * the full-page OCR floor ALWAYS runs; a low-confidence/failed segmentation routes to "full_page"
 * (the floor IS the result, no box-cropped subset); "region_route" UNIONs per-region passes ON TOP
 * of the floor (region routing can only ADD recall). Also covers the fail-soft default segment dep.
 *
 * Run: node scripts/region-classify.test.mjs
 *
 * @milestone BLUEPRINT-VISION-OCR/U-XRAY-P15-REGION-CLASSIFY (slot:xray)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { extractWithRegionRouting, runRegionSegment, classifyRegionPageDrop } from "./region-classify.mjs";

const linear = (mm, raw) => ({ type: "linear", nominal_mm: mm, raw_text: raw, confidence: 0.9 });
const diameter = (mm, raw) => ({ type: "diameter", nominal_mm: mm, raw_text: raw, confidence: 0.9 });
const ens = (dims) => ({ fused: { dimensions: dims }, models_ok: 2, error: null });

// A segmentation JSON with N trusted drawing-view regions across the page.
function segJson(regions) {
  return JSON.stringify({ regions });
}
const TWO_REGIONS = [
  { bbox: [0, 0, 0.5, 0.5], region_kind: "drawing_view", confidence: 0.9 },
  { bbox: [0.5, 0.5, 0.5, 0.5], region_kind: "dimension_table", confidence: 0.9 },
];

// Build injectable deps. runEnsemble returns dims keyed by which png it is handed.
function makeDeps({ segText, pngDims }) {
  const calls = { crop: 0, ensembleArgs: [] };
  const deps = {
    readImageSize: () => ({ width: 1000, height: 800 }),
    segment: () => segText,
    cropRegions: (pngPath, specs) => {
      calls.crop++;
      const m = new Map();
      for (const s of specs) m.set(s.id, `/fake/${s.id}.png`);
      return m;
    },
    runEnsemble: (args) => {
      calls.ensembleArgs.push(args.png);
      return ens(pngDims[args.png] || []);
    },
  };
  return { deps, calls };
}

test("region_route: UNIONs full-page floor + per-region, de-dupes, computes lift, crops", async () => {
  const { deps, calls } = makeDeps({
    segText: segJson(TWO_REGIONS),
    pngDims: {
      "/page.png": [linear(25.4, "1.000")],          // full-page floor
      "/fake/r0.png": [diameter(6.35, ".250")],      // region-only -> ADDED (the recall lift)
      "/fake/r1.png": [linear(25.4, "1.000")],       // dup of full-page -> COLLAPSES
    },
  });
  const r = await extractWithRegionRouting({ pngPath: "/page.png", models: ["m"], workDir: "/tmp/keep" }, deps);
  assert.equal(r.route, "region_route");
  assert.equal(calls.crop, 1, "regions were cropped");
  assert.ok(calls.ensembleArgs.includes("/page.png"), "full-page floor ran");
  assert.equal(r.regionsOcrOk, 2);
  assert.equal(r.fullPage.dimensions.length, 1);
  // union = {25.4 (full+r1 collapsed), 6.35 (r0 added)} = 2
  assert.equal(r.dimensions.length, 2);
  assert.ok(r.dimensions.find((d) => d.nominal_mm === 6.35), "region-only dim added");
  assert.ok(r.dimensions.find((d) => d.nominal_mm === 25.4), "shared dim present");
  assert.ok(r.lift.newInTiled >= 1, "lift reports the region-only recall gain");
});

test("full_page route: low-confidence/garbage segmentation -> floor IS the result, NO crop", async () => {
  const { deps, calls } = makeDeps({
    segText: "there is a drawing and a table here",  // no JSON -> parse fail -> full_page
    pngDims: { "/page.png": [linear(25.4, "1.000")] },
  });
  const r = await extractWithRegionRouting({ pngPath: "/page.png", models: ["m"] }, deps);
  assert.equal(r.route, "full_page");
  assert.equal(calls.crop, 0, "no crop when routing to full-page (data-loss-safe, not a box-subset)");
  assert.deepEqual(r.dimensions.map((d) => d.nominal_mm), [25.4]);
  assert.equal(r.lift, null);
  assert.equal(r.regionsOcrOk, 0);
});

test("DATA-LOSS-SAFE: a full-page-only dim is NEVER lost under region_route", async () => {
  const { deps } = makeDeps({
    segText: segJson([TWO_REGIONS[0]]),  // 1 trusted region
    pngDims: {
      "/page.png": [linear(25.4, "1.000"), linear(50.8, "2.000")], // 50.8 only the full-page found
      "/fake/r0.png": [diameter(6.35, ".250")],
    },
  });
  const r = await extractWithRegionRouting({ pngPath: "/page.png", models: ["m"], workDir: "/tmp/k" }, deps);
  assert.equal(r.route, "region_route");
  assert.ok(r.dimensions.find((d) => d.nominal_mm === 50.8), "full-page-only dim survives (the recall floor)");
  assert.ok(r.dimensions.find((d) => d.nominal_mm === 6.35), "region-only dim added");
  assert.ok(r.dimensions.find((d) => d.nominal_mm === 25.4), "shared dim present");
});

test("segment THROWS -> full_page fallback, no crash (the real dep is fail-soft; orchestrator is too)", async () => {
  const { deps, calls } = makeDeps({ segText: "", pngDims: { "/page.png": [linear(12.7, "0.500")] } });
  deps.segment = () => { throw new Error("ollama down"); };
  const r = await extractWithRegionRouting({ pngPath: "/page.png", models: ["m"] }, deps);
  assert.equal(r.route, "full_page");
  assert.equal(calls.crop, 0);
  assert.deepEqual(r.dimensions.map((d) => d.nominal_mm), [12.7]);
});

test("uncroppable region (cropMap missing id) -> counted failed, full-page floor still covers it", async () => {
  const { deps } = makeDeps({ segText: segJson([TWO_REGIONS[0]]), pngDims: { "/page.png": [linear(25.4, "1.000")] } });
  deps.cropRegions = () => new Map();  // crop produced NO tile for any region
  const r = await extractWithRegionRouting({ pngPath: "/page.png", models: ["m"], workDir: "/tmp/k" }, deps);
  assert.equal(r.route, "region_route");
  assert.equal(r.regionsOcrFailed, 1, "the uncroppable region is a counted failure, not a silent pass");
  assert.equal(r.regionsOcrOk, 0);
  assert.ok(r.dimensions.find((d) => d.nominal_mm === 25.4), "full-page floor still covers the page (no data loss)");
});

test("full-page floor counts as failed when models_ok=0 (R12 fail-loud parity)", async () => {
  const { deps } = makeDeps({ segText: "garbage", pngDims: {} });
  deps.runEnsemble = () => ({ fused: { dimensions: [] }, models_ok: 0, error: null }); // empty-response trap
  const r = await extractWithRegionRouting({ pngPath: "/page.png", models: ["m"] }, deps);
  assert.equal(r.route, "full_page");
  assert.equal(r.fullPage.ok, false, "models_ok=0 is NOT a silent success");
  assert.equal(r.dimensions.length, 0);
});

test("runRegionSegment: fail-soft -> '' on a missing image (no Ollama needed)", () => {
  // readFileSync throws on a nonexistent path -> the dep returns '' (parse fails -> full_page).
  assert.equal(runRegionSegment("H:/prism/this-image-does-not-exist-xyz.png", { timeoutMs: 1000 }), "");
});

test("pngPath required (fail-loud contract)", async () => {
  await assert.rejects(() => extractWithRegionRouting({}, {}), /pngPath required/);
});

test("region_route -> .fused is the HYBRID (region dims + full-page non-dimension labels) -- unblocks the cron", async () => {
  const { deps } = makeDeps({
    segText: segJson([TWO_REGIONS[0]]),
    pngDims: { "/page.png": [linear(25.4, "1.000")], "/fake/r0.png": [diameter(6.35, ".250")] },
  });
  // the full-page floor also carries non-dimension labels (gdt/notes) the cron's buildTrainsetRow needs
  const baseEns = deps.runEnsemble;
  deps.runEnsemble = (args) => {
    const r = baseEns(args);
    if (args.png === "/page.png") { r.fused.gdt = [{ symbol: "position" }]; r.fused.notes = ["NOTE A"]; }
    return r;
  };
  const r = await extractWithRegionRouting({ pngPath: "/page.png", models: ["m"], workDir: "/tmp/k" }, deps);
  assert.equal(r.route, "region_route");
  assert.ok(r.fused, "fused present for direct buildTrainsetRow consumption");
  assert.ok(r.fused.dimensions.find((d) => d.nominal_mm === 6.35), "region-recovered dim in the hybrid fused");
  assert.deepEqual(r.fused.gdt, [{ symbol: "position" }], "full-page gdt preserved (NOT dropped)");
  assert.deepEqual(r.fused.notes, ["NOTE A"], "full-page notes preserved (NOT dropped)");
});

test("full_page route -> .fused is the full-page pass fused", async () => {
  const { deps } = makeDeps({ segText: "garbage", pngDims: { "/page.png": [linear(25.4, "1.000")] } });
  const baseEns = deps.runEnsemble;
  deps.runEnsemble = (args) => { const r = baseEns(args); r.fused.notes = ["FP NOTE"]; return r; };
  const r = await extractWithRegionRouting({ pngPath: "/page.png", models: ["m"] }, deps);
  assert.equal(r.route, "full_page");
  assert.deepEqual(r.fused.notes, ["FP NOTE"]);
  assert.ok(r.fused.dimensions.find((d) => d.nominal_mm === 25.4));
});

test("DENSE-RESCUE: full-page floor FAILS but a region rescues -> hybrid summary.n_models synthesized (dims stay TRAINABLE for the cron)", async () => {
  // This is region routing's WHOLE VALUE for the training cron: a dense page the full-page VLM cannot
  // read (0 dims, no summary) where the cropped region DOES. Without a synthesized summary.n_models the
  // recovered dims are untrainable (buildTrainsetRow corroboration gate is n_models>=2 -> defaults to 0).
  const { deps } = makeDeps({
    segText: segJson([TWO_REGIONS[0]]),
    pngDims: { "/fake/r0.png": [diameter(6.35, ".250")] }, // region recovers a dim
  });
  const baseEns = deps.runEnsemble;
  deps.runEnsemble = (args) =>
    args.png === "/page.png"
      ? { fused: { dimensions: [] }, models_ok: 0, error: null } // dense floor: nothing read, no summary
      : baseEns(args);                                            // region: models_ok=2 (the ensemble depth)
  const r = await extractWithRegionRouting({ pngPath: "/page.png", models: ["m1", "m2"], workDir: "/tmp/k" }, deps);
  assert.equal(r.route, "region_route");
  assert.equal(r.fullPage.ok, false, "the full-page floor genuinely failed");
  assert.equal(r.regionsOcrOk, 1, "the region rescued the page");
  assert.equal(r.regionNModels, 2, "captured the region ensemble depth");
  assert.ok(r.fused.summary, "hybrid fused carries a synthesized summary despite the failed floor");
  assert.equal(r.fused.summary.n_models, 2, "n_models from the region ensemble -> corroboration gate passes -> TRAINABLE");
  assert.ok(r.fused.dimensions.find((d) => d.nominal_mm === 6.35), "the rescued dim is in the trainable hybrid");
});

// ---- classifyRegionPageDrop: the multi-seed-investigation diagnostic ----------------------------
// Each label maps a (floor, region, union) page state to the ROOT CAUSE the GPU drop-investigation
// needs to separate -- code bug vs host contention vs genuine blank vs VLM variance. The labels
// behave differently across seeds, which is what makes a >=3-seed run conclusive (see fn docstring).

test("classifyRegionPageDrop: any scoreable dim -> 'ok' (no drop, regardless of floor/region state)", () => {
  assert.equal(classifyRegionPageDrop({ floorOk: false, floorDimCount: 0, unionScoreableCount: 3, regionsOcrOk: 0 }), "ok");
  assert.equal(classifyRegionPageDrop({ floorOk: true, floorDimCount: 5, unionScoreableCount: 1, regionsOcrOk: 2 }), "ok");
});

test("classifyRegionPageDrop: floor READ dims but 0 scoreable -> 'merge_or_unit_dropped' (the code-bug signal)", () => {
  // floor.ok and floor read 8 dims, yet none survived as a finite value_mm in the union -> a merge
  // clique-collapse or a unit-normalization drop. Reproducible across seeds = chase THIS first.
  assert.equal(classifyRegionPageDrop({ floorOk: true, floorDimCount: 8, unionScoreableCount: 0, regionsOcrOk: 0 }), "merge_or_unit_dropped");
  assert.equal(classifyRegionPageDrop({ floorOk: true, floorDimCount: 1, unionScoreableCount: 0, regionsOcrOk: 3 }), "merge_or_unit_dropped");
});

test("classifyRegionPageDrop: floor ran clean but read 0 dims -> 'blank_page' (genuine non-callout page)", () => {
  // floor.ok, 0 dims -> a cover/notes/table page with no callouts. Stable across seeds = an EXPECTED
  // drop, not a bug -- the 05850 lathe scan has exactly this kind of non-drawing page.
  assert.equal(classifyRegionPageDrop({ floorOk: true, floorDimCount: 0, unionScoreableCount: 0, regionsOcrOk: 0 }), "blank_page");
});

test("classifyRegionPageDrop: floor FAILED but regions ran -> 'floor_failed_regions_ran' (host starvation under the heavier path)", () => {
  // the floor's full-page pass failed (timeout/contention) while the lighter region crops still ran but
  // recovered no scoreable dims -- the per-page-heavier region path starving the floor (the degraded-host signal).
  assert.equal(classifyRegionPageDrop({ floorOk: false, floorDimCount: 0, unionScoreableCount: 0, regionsOcrOk: 2 }), "floor_failed_regions_ran");
});

test("classifyRegionPageDrop: nothing read at all -> 'extraction_failed' (VLM/host -- variance if it differs across seeds)", () => {
  assert.equal(classifyRegionPageDrop({ floorOk: false, floorDimCount: 0, unionScoreableCount: 0, regionsOcrOk: 0 }), "extraction_failed");
});

test("classifyRegionPageDrop: missing/NaN counts are treated as 0/false (defensive) -> 'extraction_failed'", () => {
  assert.equal(classifyRegionPageDrop({}), "extraction_failed");
  assert.equal(classifyRegionPageDrop({ floorDimCount: NaN, unionScoreableCount: undefined, regionsOcrOk: null }), "extraction_failed");
  // a non-boolean truthy floorOk must NOT count as ok-floor (strict === true)
  assert.equal(classifyRegionPageDrop({ floorOk: 1, floorDimCount: 5, unionScoreableCount: 0, regionsOcrOk: 0 }), "extraction_failed");
});
