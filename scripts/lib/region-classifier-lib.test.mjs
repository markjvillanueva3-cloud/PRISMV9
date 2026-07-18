/**
 * region-classifier-lib -- unit tests for the P1.5 layout-aware region segmenter (pure core).
 *
 * Pins the PURE decision logic (GPU-free) so a future refactor cannot silently re-break
 * region routing. The load-bearing contract is the DATA-LOSS-SAFE bias: an untrusted /
 * malformed / empty segmentation MUST fall back to full-page OCR, never to a box-cropped
 * subset (region routing can only ADD recall on top of the full-page floor).
 *
 * Run: node scripts/lib/region-classifier-lib.test.mjs
 *      (node --test runs 0 tests in this env -- invoke the file directly; node:test auto-runs on exit)
 *
 * @milestone BLUEPRINT-VISION-OCR/U-XRAY-P15-REGION-LIB (slot:xray)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_VISION_MODEL,
  DEFAULT_REGION_TIMEOUT_MS,
  DEFAULT_REGION_MIN_CONFIDENCE,
  DEFAULT_MIN_TRUSTED_REGIONS,
  REGION_KINDS,
  EXTRACTORS,
  buildRegionSegmentPrompt,
  buildRegionSegmentRequestBody,
  validateBbox,
  parseRegionSegmentResponse,
  routeRegion,
  decideRegionRouting,
} from "./region-classifier-lib.mjs";

// ---------- constants / contract ----------

test("constants: floors + kinds + extractors are sane", () => {
  assert.equal(DEFAULT_REGION_MIN_CONFIDENCE, 0.7);
  assert.equal(DEFAULT_MIN_TRUSTED_REGIONS, 1);
  assert.equal(DEFAULT_REGION_TIMEOUT_MS, 45000);
  assert.ok(REGION_KINDS.includes("drawing_view") && REGION_KINDS.includes("dimension_table") && REGION_KINDS.includes("title_block"));
  assert.ok(REGION_KINDS.includes("unknown"));
  assert.ok(EXTRACTORS.includes("vlm_ocr") && EXTRACTORS.includes("table_parser") && EXTRACTORS.includes("field_parser") && EXTRACTORS.includes("light"));
  // frozen so a consumer cannot mutate the canonical lists
  assert.ok(Object.isFrozen(REGION_KINDS) && Object.isFrozen(EXTRACTORS));
});

// ---------- buildRegionSegmentPrompt ----------

test("buildRegionSegmentPrompt: names every kind + the fraction bbox rule + JSON-only", () => {
  const p = buildRegionSegmentPrompt();
  assert.equal(typeof p, "string");
  for (const k of ["drawing_view", "dimension_table", "title_block", "bom", "notes"]) {
    assert.ok(p.includes(k), `prompt must name kind ${k}`);
  }
  assert.ok(/FRACTIONS of the page in \[0,1\]/.test(p), "must instruct normalized fractional bbox");
  assert.ok(/ONLY the JSON object/.test(p), "must forbid prose/fences");
});

// ---------- buildRegionSegmentRequestBody ----------

test("buildRegionSegmentRequestBody: defaults (model, num_predict 512, num_ctx 8192, temp 0, think false)", () => {
  const b = buildRegionSegmentRequestBody("PROMPT", "BASE64IMG");
  assert.equal(b.model, DEFAULT_VISION_MODEL);
  assert.equal(b.prompt, "PROMPT");
  assert.deepEqual(b.images, ["BASE64IMG"]);
  assert.equal(b.stream, false);
  assert.equal(b.think, false);
  assert.equal(b.options.temperature, 0);
  assert.equal(b.options.num_predict, 512);
  assert.equal(b.options.num_ctx, 8192);
});

test("buildRegionSegmentRequestBody: overrides + invalid numerics fall back to defaults", () => {
  const b = buildRegionSegmentRequestBody("P", "I", { model: "custom-vlm", numPredict: 256, numCtx: 16384, think: true, modelOptions: { top_p: 0.1 } });
  assert.equal(b.model, "custom-vlm");
  assert.equal(b.think, true);
  assert.equal(b.options.num_predict, 256);
  assert.equal(b.options.num_ctx, 16384);
  assert.equal(b.options.top_p, 0.1);
  // invalid (<=0 / non-int) -> defaults, never a poison value
  const b2 = buildRegionSegmentRequestBody("P", "I", { numPredict: 0, numCtx: -5, model: "" });
  assert.equal(b2.options.num_predict, 512);
  assert.equal(b2.options.num_ctx, 8192);
  assert.equal(b2.model, DEFAULT_VISION_MODEL);
});

// ---------- validateBbox ----------

test("validateBbox: accepts a valid fractional box unchanged", () => {
  assert.deepEqual(validateBbox([0.1, 0.2, 0.5, 0.3]), [0.1, 0.2, 0.5, 0.3]);
});

test("validateBbox: clamps a box edge that spills slightly past 1.0 (VLM rounding)", () => {
  // x+w = 1.01 -> w clamped so the box stays in the page
  const out = validateBbox([0.6, 0.85, 0.41, 0.15]);
  assert.ok(out !== null);
  assert.ok(out[0] + out[2] <= 1 + 1e-9, "clamped box must not exceed page width");
});

test("validateBbox: rejects pixel coords (well above 1+eps), wrong arity, non-finite, non-positive size", () => {
  assert.equal(validateBbox([0, 0, 800, 600]), null, "pixel coords rejected (caller full-page-falls-back)");
  assert.equal(validateBbox([0.1, 0.2, 0.3]), null, "arity != 4 rejected");
  assert.equal(validateBbox([0.1, 0.2, 0.3, "x"]), null, "non-finite rejected");
  assert.equal(validateBbox([0.1, 0.2, 0, 0.3]), null, "zero width rejected");
  assert.equal(validateBbox([0.1, 0.2, -0.3, 0.3]), null, "negative width rejected");
  assert.equal(validateBbox("not-an-array"), null);
  assert.equal(validateBbox(null), null);
});

// ---------- parseRegionSegmentResponse ----------

test("parse: happy {regions:[...]} -> normalized kinds + valid flags", () => {
  const raw = JSON.stringify({
    regions: [
      { bbox: [0, 0, 0.6, 0.7], region_kind: "drawing_view", confidence: 0.9 },
      { bbox: [0.6, 0.85, 0.4, 0.15], region_kind: "title_block", confidence: 0.8 },
    ],
  });
  const r = parseRegionSegmentResponse(raw);
  assert.equal(r.success, true);
  assert.equal(r.regions.length, 2);
  assert.equal(r.regions[0].region_kind, "drawing_view");
  assert.equal(r.regions[0].valid, true);
  assert.equal(r.regions[0].id, "r0", "stable sequential id for the crop/merge seam");
  assert.equal(r.regions[1].region_kind, "title_block");
  assert.equal(r.regions[1].valid, true);
  assert.equal(r.regions[1].id, "r1");
});

test("parse: bare array form + fenced JSON + trailing prose", () => {
  const bare = "[{\"bbox\":[0,0,1,0.5],\"region_kind\":\"dimension_table\",\"confidence\":0.75}]";
  const ra = parseRegionSegmentResponse(bare);
  assert.equal(ra.success, true);
  assert.equal(ra.regions[0].region_kind, "dimension_table");

  const fenced = "```json\n{\"regions\":[{\"bbox\":[0,0,1,1],\"region_kind\":\"notes\",\"confidence\":0.6}]}\n```\nhere you go";
  const rf = parseRegionSegmentResponse(fenced);
  assert.equal(rf.success, true);
  assert.equal(rf.regions[0].region_kind, "notes");
});

test("parse: synonym kinds + synonym field names are normalized", () => {
  const raw = JSON.stringify({
    regions: [
      { box: [0, 0, 0.5, 0.5], kind: "view", conf: 0.9 },                 // box/kind/conf synonyms; view->drawing_view
      { bounding_box: [0.5, 0, 0.5, 0.5], type: "hole-table", score: 0.8 }, // bounding_box/type/score; hole-table->dimension_table
      { bbox: [0, 0.5, 1, 0.5], region_kind: "Title Block", confidence: 0.7 }, // space+case -> title_block
    ],
  });
  const r = parseRegionSegmentResponse(raw);
  assert.equal(r.success, true);
  assert.equal(r.regions[0].region_kind, "drawing_view");
  assert.equal(r.regions[1].region_kind, "dimension_table");
  assert.equal(r.regions[2].region_kind, "title_block");
});

test("parse: missing confidence defaults to 0.5", () => {
  const r = parseRegionSegmentResponse(JSON.stringify({ regions: [{ bbox: [0, 0, 1, 1], region_kind: "drawing_view" }] }));
  assert.equal(r.regions[0].confidence, 0.5);
});

test("parse: FAILURE modes -- empty, no-JSON garbage, regions-present-but-unusable", () => {
  assert.equal(parseRegionSegmentResponse("").success, false);
  assert.equal(parseRegionSegmentResponse("   ").success, false);
  assert.equal(parseRegionSegmentResponse("the page has a drawing and a table").success, false, "no JSON -> fail (no prose fallback for a region LIST)");
  assert.equal(parseRegionSegmentResponse(JSON.stringify({ regions: [1, 2, "x", null] })).success, false, "array of non-objects -> no usable region");
});

test("parse: ADVERSARIAL -- pixel bbox kept-but-invalid; unknown kind kept-but-invalid (recall, never crash)", () => {
  const raw = JSON.stringify({
    regions: [
      { bbox: [0, 0, 1920, 1080], region_kind: "drawing_view", confidence: 0.9 },  // pixel coords -> bbox null, valid:false
      { bbox: [0, 0, 0.5, 0.5], region_kind: "spline_gizmo", confidence: 0.9 },     // unknown kind -> region_kind "unknown", valid:false
    ],
  });
  const r = parseRegionSegmentResponse(raw);
  assert.equal(r.success, true);
  assert.equal(r.regions.length, 2, "both regions kept (never silently dropped)");
  assert.equal(r.regions[0].bbox, null);
  assert.equal(r.regions[0].valid, false, "pixel bbox -> not trustworthy");
  assert.equal(r.regions[1].region_kind, "unknown");
  assert.equal(r.regions[1].valid, false, "unknown kind -> not trustworthy");
  assert.equal(r.regions[1].raw_kind, "spline_gizmo", "raw kind preserved for telemetry");
  // kept-invalid regions still get stable sequential ids -- the glue seam needs EVERY
  // routed region addressable, including the ones that fall back to full-page coverage.
  assert.equal(r.regions[0].id, "r0");
  assert.equal(r.regions[1].id, "r1");
});

// ---------- routeRegion ----------

test("routeRegion: every recognized kind maps to its extractor (recall-first, none skipped)", () => {
  const box = [0, 0, 0.5, 0.5];
  const cases = [
    ["drawing_view", "vlm_ocr"],
    ["dimension_table", "table_parser"],
    ["title_block", "field_parser"],
    ["bom", "light"],
    ["notes", "light"],
    ["other", "vlm_ocr"],
    ["unknown", "vlm_ocr"],
  ];
  for (const [kind, extractor] of cases) {
    const out = routeRegion({ bbox: box, region_kind: kind, confidence: 0.9 });
    assert.equal(out.extractor, extractor, `${kind} -> ${extractor}`);
    assert.notEqual(out.extractor, "skip", "a region with a bbox is never hard-skipped (recall-first)");
  }
});

test("routeRegion: confident flag tracks the floor (>=) ; low-conf STILL extracts (recall-first)", () => {
  const box = [0, 0, 0.5, 0.5];
  assert.equal(routeRegion({ bbox: box, region_kind: "drawing_view", confidence: 0.7 }).confident, true, "conf == floor is trusted");
  const low = routeRegion({ bbox: box, region_kind: "drawing_view", confidence: 0.4 });
  assert.equal(low.confident, false);
  assert.equal(low.extractor, "vlm_ocr", "low-confidence region is still routed/extracted, not dropped");
});

test("routeRegion: no bbox / null region -> skip (the caller's per-region full-page-fallback signal)", () => {
  assert.equal(routeRegion({ bbox: null, region_kind: "drawing_view", confidence: 0.9 }).extractor, "skip");
  assert.equal(routeRegion(null).extractor, "skip");
  assert.equal(routeRegion(undefined).confident, false);
});

// ---------- decideRegionRouting (the load-bearing data-loss-safe gate) ----------

const trustedParse = () => parseRegionSegmentResponse(JSON.stringify({
  regions: [
    { bbox: [0, 0, 0.6, 0.7], region_kind: "drawing_view", confidence: 0.9 },
    { bbox: [0.6, 0.85, 0.4, 0.15], region_kind: "title_block", confidence: 0.8 },
  ],
}));

test("decide: trusted segmentation -> region_route with every region routed", () => {
  const d = decideRegionRouting(trustedParse());
  assert.equal(d.route, "region_route");
  assert.equal(d.trusted_count, 2);
  assert.equal(d.region_count, 2);
  assert.equal(d.routed.length, 2);
  assert.equal(d.routed[0].extractor, "vlm_ocr");
  assert.equal(d.routed[1].extractor, "field_parser");
});

test("decide: parse-failure / empty -> full_page (DATA-LOSS-SAFE)", () => {
  assert.equal(decideRegionRouting({ success: false, regions: [] }).route, "full_page");
  assert.equal(decideRegionRouting({ success: true, regions: [] }).route, "full_page");
  assert.equal(decideRegionRouting(null).route, "full_page");
  assert.equal(decideRegionRouting(undefined).route, "full_page");
});

test("decide: all sub-floor -> full_page (unproven segmentation, never route box-crops)", () => {
  const p = parseRegionSegmentResponse(JSON.stringify({
    regions: [
      { bbox: [0, 0, 0.5, 0.5], region_kind: "drawing_view", confidence: 0.4 },
      { bbox: [0.5, 0, 0.5, 0.5], region_kind: "notes", confidence: 0.3 },
    ],
  }));
  const d = decideRegionRouting(p);
  assert.equal(d.route, "full_page");
  assert.equal(d.trusted_count, 0);
});

test("decide: floor == confidence is trusted (>=) ; floor not strictly positive -> full_page", () => {
  // a single region at exactly the floor passes (>=)
  const p = parseRegionSegmentResponse(JSON.stringify({ regions: [{ bbox: [0, 0, 1, 1], region_kind: "drawing_view", confidence: 0.7 }] }));
  assert.equal(decideRegionRouting(p, { minConfidence: 0.7 }).route, "region_route");
  // floor 0 (or negative) is the data-loss degenerate -> refuse to trust
  assert.equal(decideRegionRouting(trustedParse(), { minConfidence: 0 }).route, "full_page");
  assert.equal(decideRegionRouting(trustedParse(), { minConfidence: -1 }).route, "full_page");
});

test("decide: minTrustedRegions boundary", () => {
  // 2 trusted regions: minTrusted 2 -> route, minTrusted 3 -> full_page
  assert.equal(decideRegionRouting(trustedParse(), { minTrustedRegions: 2 }).route, "region_route");
  assert.equal(decideRegionRouting(trustedParse(), { minTrustedRegions: 3 }).route, "full_page");
});

test("decide: ADVERSARIAL -- 1 trusted + 1 invalid still routes (>=1 trusted), routes BOTH recall-first", () => {
  const p = parseRegionSegmentResponse(JSON.stringify({
    regions: [
      { bbox: [0, 0, 0.6, 0.7], region_kind: "drawing_view", confidence: 0.9 }, // valid + confident
      { bbox: [0, 0, 1920, 1080], region_kind: "dimension_table", confidence: 0.9 }, // pixel bbox -> invalid -> skip route
    ],
  }));
  const d = decideRegionRouting(p);
  assert.equal(d.route, "region_route", "one trusted region is enough to add region-level recall");
  assert.equal(d.trusted_count, 1);
  assert.equal(d.routed.length, 2, "both regions carried through");
  // the invalid (no-bbox) region routes to skip -> the glue full-page-covers it
  const invalid = d.routed.find((r) => r.bbox === null);
  assert.ok(invalid, "invalid region present in routed set");
  assert.equal(invalid.extractor, "skip");
});
