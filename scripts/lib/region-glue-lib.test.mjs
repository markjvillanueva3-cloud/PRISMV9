/**
 * region-glue-lib -- unit tests for the P1.5 step-2 pure orchestration core.
 *
 * Pins the two correctness-critical seams of region routing:
 *   1. scaleBboxToPixels -- fractional bbox -> integer pixel crop (a missed/wrong scaling crops a
 *      ~1px box = silent recall loss). Degenerate (<1px) -> null -> caller full-page-floors it.
 *   2. mergeRegionResults -- the RECALL-FIRST union of the full-page floor with the per-region
 *      passes. Includes a LIVE integration test through the real vision-tiling-lib
 *      mergeTiledDimensions proving: a dim found by both collapses (no double-count), a full-page-
 *      only dim is NEVER lost, a region-only dim is added, and two distinct same-valued features in
 *      non-overlapping regions stay SEPARATE (the non-transitive clique guard, via the whole-page
 *      overlap tile this lib injects).
 *
 * Run: node scripts/lib/region-glue-lib.test.mjs
 *
 * @milestone BLUEPRINT-VISION-OCR/U-XRAY-P15-REGION-GLUE-LIB (slot:xray)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FULL_PAGE_TILE_ID,
  scaleBboxToPixels,
  buildRegionCropSpecs,
  buildMergeTiles,
  mergeRegionResults,
  buildRegionRoutedFused,
  mergeRegionFused,
} from "./region-glue-lib.mjs";

// ---------- scaleBboxToPixels (the critical fraction->pixel seam) ----------

test("scaleBboxToPixels: exact reference conversion", () => {
  assert.deepEqual(scaleBboxToPixels([0.5, 0.5, 0.25, 0.25], 1000, 800), { x: 500, y: 400, w: 250, h: 200 });
  assert.deepEqual(scaleBboxToPixels([0, 0, 1, 1], 1000, 800), { x: 0, y: 0, w: 1000, h: 800 });
});

test("scaleBboxToPixels: clamps a box that would spill past the page edge", () => {
  // x=0.9*1000=900, w=0.5*1000=500 -> clamped to pageW-x = 100; full-height
  assert.deepEqual(scaleBboxToPixels([0.9, 0, 0.5, 1], 1000, 800), { x: 900, y: 0, w: 100, h: 800 });
});

test("scaleBboxToPixels: sub-pixel crop -> null (degenerate, caller full-page-floors it)", () => {
  assert.equal(scaleBboxToPixels([0, 0, 0.0001, 0.5], 100, 100), null, "0.0001*100 rounds to 0px width");
  assert.equal(scaleBboxToPixels([0, 0, 0.5, 0.0001], 100, 100), null, "0px height");
});

test("scaleBboxToPixels: invalid bbox / page dims -> null", () => {
  assert.equal(scaleBboxToPixels([0, 0, 0.5], 1000, 800), null, "arity != 4");
  assert.equal(scaleBboxToPixels([0, 0, "x", 0.5], 1000, 800), null, "non-finite member");
  assert.equal(scaleBboxToPixels(null, 1000, 800), null);
  assert.equal(scaleBboxToPixels([0, 0, 0.5, 0.5], 0, 800), null, "zero page width");
  assert.equal(scaleBboxToPixels([0, 0, 0.5, 0.5], 1000, -1), null, "negative page height");
  assert.equal(scaleBboxToPixels([0, 0, 0.5, 0.5], NaN, 800), null, "NaN page width");
});

// ---------- buildRegionCropSpecs ----------

test("buildRegionCropSpecs: only croppable non-skip regions get a spec; ids + extractor carried", () => {
  const routed = [
    { id: "r0", bbox: [0, 0, 0.5, 0.5], extractor: "vlm_ocr", region_kind: "drawing_view" },
    { id: "r1", bbox: null, extractor: "skip", region_kind: "unknown" },          // no bbox + skip -> excluded
    { id: "r2", bbox: [0.5, 0.5, 0.5, 0.5], extractor: "table_parser", region_kind: "dimension_table" },
    { id: "r3", bbox: [0, 0, 0.0001, 0.5], extractor: "vlm_ocr", region_kind: "notes" }, // degenerate -> excluded
  ];
  const specs = buildRegionCropSpecs(routed, 1000, 800);
  assert.equal(specs.length, 2, "r1 (skip/no-bbox) + r3 (degenerate) excluded -> full-page floor");
  assert.deepEqual(specs[0], { id: "r0", x: 0, y: 0, w: 500, h: 400, extractor: "vlm_ocr", region_kind: "drawing_view" });
  assert.equal(specs[1].id, "r2");
  assert.equal(specs[1].extractor, "table_parser");
});

test("buildRegionCropSpecs: non-array / empty -> []", () => {
  assert.deepEqual(buildRegionCropSpecs(null, 1000, 800), []);
  assert.deepEqual(buildRegionCropSpecs([], 1000, 800), []);
});

// ---------- buildMergeTiles ----------

test("buildMergeTiles: region rects + a whole-page full_page overlap tile", () => {
  const cropSpecs = [{ id: "r0", x: 0, y: 0, w: 500, h: 400 }];
  const tiles = buildMergeTiles(cropSpecs, 1000, 800);
  assert.equal(tiles.length, 2);
  assert.deepEqual(tiles[0], { id: "r0", x: 0, y: 0, w: 500, h: 400 });
  assert.deepEqual(tiles[1], { id: FULL_PAGE_TILE_ID, x: 0, y: 0, w: 1000, h: 800 });
});

test("buildMergeTiles: invalid page dims -> no full_page tile (region rects only)", () => {
  assert.deepEqual(buildMergeTiles([{ id: "r0", x: 0, y: 0, w: 10, h: 10 }], 0, 800), [{ id: "r0", x: 0, y: 0, w: 10, h: 10 }]);
});

// ---------- mergeRegionResults: LIVE integration through real mergeTiledDimensions ----------

const linear = (mm, raw, conf) => ({ type: "linear", nominal_mm: mm, raw_text: raw, confidence: conf });
const diameter = (mm, raw, conf) => ({ type: "diameter", nominal_mm: mm, raw_text: raw, confidence: conf });

test("mergeRegionResults: RECALL-FIRST union -- dup collapses, full-page-only kept, region-only added", () => {
  const pageW = 1000, pageH = 800;
  const routed = [{ id: "r0", bbox: [0, 0, 0.5, 0.5], extractor: "vlm_ocr", region_kind: "drawing_view" }];
  const cropSpecs = buildRegionCropSpecs(routed, pageW, pageH);
  const perRegion = [{ id: "r0", dimensions: [
    linear(25.4, "1.000", 0.9),        // ALSO found by full-page -> must collapse
    { type: "diameter", nominal_mm: 6.35, raw_text: ".250", confidence: 0.95 }, // region-only -> must be ADDED
  ] }];
  const fullPageDims = [
    linear(25.4, "1.000", 0.8),        // shared with r0
    linear(50.8, "2.000", 0.85),       // full-page-only -> must NEVER be lost
  ];
  const res = mergeRegionResults(perRegion, fullPageDims, cropSpecs, pageW, pageH);
  // 3 distinct dims: 25.4 (collapsed), 50.8 (full-page-only), 6.35 (region-only)
  assert.equal(res.dimensions.length, 3, "union de-dupes the shared dim, keeps both exclusives");
  const shared = res.dimensions.find((d) => d.nominal_mm === 25.4);
  const fullOnly = res.dimensions.find((d) => d.nominal_mm === 50.8);
  const regionOnly = res.dimensions.find((d) => d.nominal_mm === 6.35);
  assert.ok(shared, "shared dim present");
  assert.ok(shared.tileAgreement >= 2, "shared dim corroborated by region + full-page (no double-count)");
  assert.ok(fullOnly, "full-page-only dim NEVER lost (the recall floor)");
  assert.ok(regionOnly, "region-only dim ADDED (the recall lift)");
});

test("mergeRegionResults: two distinct same-valued features in NON-overlapping regions stay SEPARATE", () => {
  const pageW = 1000, pageH = 800;
  // r0 top-left, r1 bottom-right -- they do NOT overlap each other (only the full_page tile overlaps both)
  const routed = [
    { id: "r0", bbox: [0, 0, 0.3, 0.3], extractor: "vlm_ocr", region_kind: "drawing_view" },
    { id: "r1", bbox: [0.7, 0.7, 0.3, 0.3], extractor: "vlm_ocr", region_kind: "drawing_view" },
  ];
  const cropSpecs = buildRegionCropSpecs(routed, pageW, pageH);
  const perRegion = [
    { id: "r0", dimensions: [linear(25.4, "1.000", 0.9)] },
    { id: "r1", dimensions: [linear(25.4, "1.000", 0.9)] },
  ];
  // full-page also reads one 1.000 instance
  const res = mergeRegionResults(perRegion, [linear(25.4, "1.000", 0.7)], cropSpecs, pageW, pageH);
  // The non-transitive clique guard must keep r0 and r1's distinct features apart (the whole-page
  // tile corroborates ONE, the other survives as its own) -> exactly 2 dims, NOT over-merged to 1.
  assert.equal(res.dimensions.length, 2, "distinct same-valued features must not over-merge via the full_page tile");
});

test("mergeRegionResults: ADVERSARIAL -- null perRegion still returns the full-page floor (no crash)", () => {
  const res = mergeRegionResults(null, [linear(12.7, "0.500", 0.9)], [], 1000, 800);
  assert.equal(res.dimensions.length, 1, "full-page floor always participates even with no regions");
  assert.equal(res.dimensions[0].nominal_mm, 12.7);
});

test("mergeRegionResults: ADVERSARIAL -- empty everything -> empty result, no throw", () => {
  const res = mergeRegionResults([], [], [], 1000, 800);
  assert.equal(res.dimensions.length, 0);
});

// ---------- buildRegionRoutedFused (the step-3b unblock: hybrid fused, no dropped labels) ----------

test("buildRegionRoutedFused: keeps the full-page non-dimension schema, swaps in the region dims", () => {
  const fullPageFused = {
    dimensions: [linear(25.4, "1.000")],            // the full-page's (worse/fewer) dims -- to be replaced
    gdt: [{ symbol: "position", tol_mm: 0.05 }],
    notes: ["BREAK ALL SHARP EDGES"],
    surface_finishes: [{ ra_um: 0.8 }],
    summary: { part_no: "2475-037" },
  };
  const regionDims = [linear(25.4, "1.000"), diameter(6.35, ".250"), linear(50.8, "2.000")];
  const out = buildRegionRoutedFused(regionDims, fullPageFused);
  // dimensions REPLACED by the richer region union...
  assert.equal(out.dimensions.length, 3);
  assert.ok(out.dimensions.find((d) => d.nominal_mm === 6.35), "region-recovered dim present");
  // ...while every non-dimension label type is PRESERVED from the full-page pass (no drop)
  assert.deepEqual(out.gdt, fullPageFused.gdt);
  assert.deepEqual(out.notes, fullPageFused.notes);
  assert.deepEqual(out.surface_finishes, fullPageFused.surface_finishes);
  // summary non-count fields preserved; n_hallucination_candidates is recomputed over the union
  // (0 here -- none of these region dims is a hallucination candidate) -- see the dedicated recompute test.
  assert.equal(out.summary.part_no, fullPageFused.summary.part_no);
  assert.equal(out.summary.n_hallucination_candidates, 0);
});

test("buildRegionRoutedFused: null/absent full-page fused -> dims-only fused (honest, no crash)", () => {
  assert.equal(buildRegionRoutedFused([linear(12.7, "0.500")], null).dimensions.length, 1);
  assert.equal(buildRegionRoutedFused([linear(12.7, "0.500")], null).gdt, undefined);
  assert.deepEqual(buildRegionRoutedFused([], undefined), { dimensions: [] });
});

test("buildRegionRoutedFused: non-array dims -> [] (never undefined into a label builder)", () => {
  assert.deepEqual(buildRegionRoutedFused(null, { gdt: [], notes: [] }).dimensions, []);
  assert.deepEqual(buildRegionRoutedFused(undefined, { summary: {} }).dimensions, []);
});

test("buildRegionRoutedFused: does NOT mutate the input full-page fused (pure)", () => {
  const fp = { dimensions: [linear(1, "x")], gdt: [{ a: 1 }] };
  const out = buildRegionRoutedFused([diameter(6.35, ".250")], fp);
  assert.equal(fp.dimensions.length, 1, "original full-page fused dimensions unchanged");
  assert.notEqual(out, fp, "returns a new object");
  assert.equal(out.dimensions[0].nominal_mm, 6.35);
});

test("buildRegionRoutedFused: recomputes summary.n_hallucination_candidates over the UNION dims (AL correctness)", () => {
  // full-page found 0 hallucination candidates; region routing recovered a region-ONLY singleton
  const fullPageFused = {
    dimensions: [linear(25.4, "1.000")],
    summary: { n_models: 2, n_hallucination_candidates: 0, n_ambiguous_pairs: 0 },
  };
  const unionDims = [
    linear(25.4, "1.000"),
    { type: "diameter", nominal_mm: 6.35, raw_text: ".250", hallucination_candidate: true }, // region-only singleton
  ];
  const out = buildRegionRoutedFused(unionDims, fullPageFused);
  assert.equal(out.summary.n_hallucination_candidates, 1, "region-only hallucination candidate now counted -> routes to AL review");
  assert.equal(out.summary.n_models, 2, "other summary fields (n_models) preserved");
  assert.equal(out.summary.n_ambiguous_pairs, 0, "n_ambiguous_pairs left as the full-page value (documented limit)");
  // and it does NOT mutate the input summary
  assert.equal(fullPageFused.summary.n_hallucination_candidates, 0, "input summary not mutated");
});

test("buildRegionRoutedFused: no summary on the full-page fused + no fallback -> no crash, no synthesized summary", () => {
  const out = buildRegionRoutedFused([{ type: "linear", nominal_mm: 5, hallucination_candidate: true }], { gdt: [] });
  assert.equal(out.summary, undefined, "absent summary stays absent (failed-floor case, no fallback -> AL via n_models=0 default)");
  assert.equal(out.dimensions.length, 1);
});

// ---- rescue path: full-page floor FAILED (no summary) but regions succeeded -> synthesize summary so
//      the region-rescued dims are TRAINABLE (buildTrainsetRow's corroboration gate is summary.n_models>=2).
//      WITHOUT this, the dense-page rescue (region routing's whole value for the cron) produces 0 trainable
//      labels because runNModels defaults to 0 -> corroborationPossible false -> every label "no_corroboration".

test("buildRegionRoutedFused: null full-page fused + fallbackNModels -> SYNTHESIZES summary from the region ensemble (dense-rescue trainable)", () => {
  const rescuedDims = [
    diameter(6.35, ".250"),
    { type: "linear", nominal_mm: 12.7, raw_text: "0.500", hallucination_candidate: true }, // region-only singleton
  ];
  const out = buildRegionRoutedFused(rescuedDims, null, { fallbackNModels: 3 });
  assert.ok(out.summary, "summary synthesized when the full-page floor failed but regions ran");
  assert.equal(out.summary.n_models, 3, "n_models = the region ensemble depth -> corroboration gate (>=2) now passes");
  assert.equal(out.summary.n_hallucination_candidates, 1, "hallucination count computed over the rescued union -> AL routing intact");
  assert.equal(out.dimensions.length, 2);
});

test("buildRegionRoutedFused: full-page fused present but summary missing/malformed + fallbackNModels -> synthesizes (rescue)", () => {
  // full-page returned a fused object (e.g. gdt[] from a partial read) but no usable summary, regions rescued the dims
  const out = buildRegionRoutedFused([diameter(6.35, ".250")], { gdt: [{ symbol: "position" }] }, { fallbackNModels: 2 });
  assert.deepEqual(out.gdt, [{ symbol: "position" }], "full-page non-dim labels still preserved");
  assert.equal(out.summary.n_models, 2, "summary synthesized so the rescued dim is trainable");
  assert.equal(out.summary.n_hallucination_candidates, 0);
});

test("buildRegionRoutedFused: fallbackNModels<=0 on a failed floor -> NO synthesis (honest: can't claim corroboration depth)", () => {
  assert.equal(buildRegionRoutedFused([diameter(6.35, ".250")], null, { fallbackNModels: 0 }).summary, undefined);
  assert.equal(buildRegionRoutedFused([diameter(6.35, ".250")], null, { fallbackNModels: -1 }).summary, undefined);
  assert.equal(buildRegionRoutedFused([diameter(6.35, ".250")], null, { fallbackNModels: NaN }).summary, undefined);
});

test("buildRegionRoutedFused: full-page summary PRESENT + fallbackNModels -> full-page summary WINS (fallback ignored, no overwrite)", () => {
  const fullPageFused = { dimensions: [linear(25.4, "1.000")], summary: { n_models: 4, n_hallucination_candidates: 0, n_ambiguous_pairs: 1 } };
  const out = buildRegionRoutedFused([linear(25.4, "1.000"), diameter(6.35, ".250")], fullPageFused, { fallbackNModels: 2 });
  assert.equal(out.summary.n_models, 4, "real full-page n_models is authoritative -- the region fallback never overwrites it");
  assert.equal(out.summary.n_ambiguous_pairs, 1, "full-page pairwise metric preserved");
  assert.equal(out.summary.n_hallucination_candidates, 0, "still recomputed over the union (0 candidates here)");
});

// ---------- mergeRegionFused + dense-rescue non-dim recovery (U-XRAY-P15-REGION-NONDIM-RESCUE) ----------

const gdtFrame = (symbol, tol, datums = []) => ({ symbol, tolerance_value: tol, datum_references: datums });

test("mergeRegionFused: dense-rescue -- floor gdt empty, two regions each contribute a frame -> union has both", () => {
  const floor = { gdt: [], notes: [], profiles: [], surface_finishes: [] };
  const regions = [
    { gdt: [gdtFrame("position", 0.1, ["A"])] },
    { gdt: [gdtFrame("flatness", 0.05)] },
  ];
  const m = mergeRegionFused(floor, regions);
  assert.equal(m.gdt.length, 2, "both region frames recovered when the floor read none");
  assert.deepEqual(m.gdt.map((g) => g.symbol).sort(), ["flatness", "position"]);
});

test("mergeRegionFused: a frame in BOTH floor and region de-dupes to one (floor representative wins the tie)", () => {
  const floor = { gdt: [{ symbol: "position", tolerance_value: 0.1, datum_references: ["A", "B"], raw_text: "FLOOR" }] };
  const regions = [{ gdt: [{ symbol: "position", tolerance_value: 0.1, datum_references: ["B", "A"], raw_text: "REGION" }] }];
  const m = mergeRegionFused(floor, regions);
  assert.equal(m.gdt.length, 1, "same FCF identity (datums order-insensitive) de-dupes");
  assert.equal(m.gdt[0].raw_text, "FLOOR", "floor is the first source -> wins the key tie");
});

test("mergeRegionFused: distinct frames across regions are all kept (recall-first)", () => {
  const m = mergeRegionFused(null, [
    { gdt: [gdtFrame("position", 0.1, ["A"])] },
    { gdt: [gdtFrame("position", 0.2, ["A"])] }, // different tolerance -> distinct identity
  ]);
  assert.equal(m.gdt.length, 2);
});

test("mergeRegionFused: notes / profiles / surface_finishes union across floor + regions too", () => {
  const floor = { notes: [{ category: "finish", text: "black oxide" }] };
  const regions = [{ surface_finishes: [{ ra_um: 0.8, location: "bore" }] }, { profiles: [{ name: "slot", type: "slot" }] }];
  const m = mergeRegionFused(floor, regions);
  assert.equal(m.notes.length, 1);
  assert.equal(m.surface_finishes.length, 1);
  assert.equal(m.profiles.length, 1);
});

test("mergeRegionFused: malformed inputs -> no throw; non-array fields ignored + null items dropped", () => {
  const m = mergeRegionFused(null, [{ gdt: "notarray" }, { gdt: [null] }, null]);
  assert.deepEqual(m.gdt, [], "non-array gdt field ignored + null item dropped");
  assert.deepEqual(m.notes, []);
});

test("mergeRegionFused: recall-first -- a primitive label (string note) is KEPT, deduped by value, never dropped", () => {
  const m = mergeRegionFused({ notes: ["NOTE A"] }, [{ notes: ["NOTE A", "NOTE B"] }]);
  assert.deepEqual(m.notes.sort(), ["NOTE A", "NOTE B"], "string notes deduped by value; both kept (floor's NOTE A not duplicated)");
});

test("buildRegionRoutedFused: dense-rescue -- floor gdt empty + regionFused recovers region gdt/notes into the fused", () => {
  const floorFailed = { dimensions: [], gdt: [], notes: [], profiles: [], surface_finishes: [], summary: { n_models: 2, n_hallucination_candidates: 0 } };
  const regionFused = [{ gdt: [gdtFrame("position", 0.1, ["A"])], notes: [{ category: "process", text: "deburr" }] }];
  const out = buildRegionRoutedFused([diameter(6.35, ".250")], floorFailed, { regionFused });
  assert.equal(out.gdt.length, 1, "region gdt recovered even though the full-page floor read 0");
  assert.equal(out.gdt[0].symbol, "position");
  assert.equal(out.notes.length, 1, "region notes recovered");
  assert.equal(out.dimensions.length, 1, "region dims still swapped in");
});

test("buildRegionRoutedFused: no regionFused opt -> floor non-dim passes through byte-identical (back-compat)", () => {
  const floor = { dimensions: [], gdt: [{ symbol: "flatness" }], notes: [], summary: { n_models: 2 } };
  const out = buildRegionRoutedFused([diameter(6.35, ".250")], floor);
  assert.deepEqual(out.gdt, [{ symbol: "flatness" }], "floor gdt unchanged when no regionFused supplied");
});
