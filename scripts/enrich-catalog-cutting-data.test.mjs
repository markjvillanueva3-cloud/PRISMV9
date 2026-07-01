// node --test scripts/enrich-catalog-cutting-data.test.mjs
// Real-value assertions on the catalog cutting-data enricher's pure functions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIsoAggregate, buildDocAggregate, materialToIso, toolTypeKey, enrichTool } from "./enrich-catalog-cutting-data.mjs";

const SERIES = [
  { series: "JS512", isoGroup: "P", vc_min: 100, vc_max: 225, fz_min: 0.005, fz_max: 0.17 },
  { series: "JS513", isoGroup: "P", vc_min: 80, vc_max: 200, fz_min: 0.01, fz_max: 0.20 },
  { series: "TIX", isoGroup: "S", vc_min: 30, vc_max: 60, fz_min: 0.02, fz_max: 0.08 },
];

test("buildIsoAggregate — aggregates min/max across series per ISO group", () => {
  const agg = buildIsoAggregate(SERIES);
  assert.equal(agg.P.vc_min_m_min, 80);   // min of 100,80
  assert.equal(agg.P.vc_max_m_min, 225);  // max of 225,200
  assert.equal(agg.P.fz_min_mm, 0.005);
  assert.equal(agg.P.fz_max_mm, 0.20);
  assert.equal(agg.P.seriesSampleSize, 2);
  assert.equal(agg.S.vc_min_m_min, 30);
});
test("buildIsoAggregate — ISO groups with no data are omitted (not zero-filled)", () => {
  const agg = buildIsoAggregate(SERIES);
  assert.equal(agg.M, undefined); // no M-group series in fixture
  assert.equal(agg.K, undefined);
});

test("materialToIso — maps freetext material names to ISO groups", () => {
  assert.equal(materialToIso("Inconel 718"), "S");
  assert.equal(materialToIso("Ti-6Al-4V"), "S");
  assert.equal(materialToIso("304 Stainless"), "M");
  assert.equal(materialToIso("6061 Aluminum"), "N");
  assert.equal(materialToIso("Gray Cast Iron"), "K");
  assert.equal(materialToIso("4140 Steel"), "P");
  assert.equal(materialToIso("D2 hardened tool steel HRC 60"), "H");
  assert.equal(materialToIso("Various"), null); // unmappable freetext → null (not silently mis-bucketed)
});

test("toolTypeKey — maps catalog tool.type to proven-data toolType vocabulary", () => {
  assert.equal(toolTypeKey("endmill"), "flat_end_mill");
  assert.equal(toolTypeKey("drill"), "drill");
  assert.equal(toolTypeKey("milling_insert"), "face_mill");
  assert.equal(toolTypeKey("turning_insert"), null); // turning: mill ap/ae not applicable
});

test("buildDocAggregate — derives ap/ae ranges by toolType×ISO from proven stepdown/stepover", () => {
  const proven = [
    { material: "4140 steel", toolType: "flat_end_mill", presetStepdown: 2, presetStepover: 5 },
    { material: "1045 carbon steel", toolType: "flat_end_mill", presetStepdown: 8, presetStepover: 9 },
    { material: "Various", toolType: "flat_end_mill", presetStepdown: 99, presetStepover: 99 }, // unmappable → excluded
  ];
  const doc = buildDocAggregate(proven);
  const k = doc["flat_end_mill|P"];
  assert.ok(k, "expected flat_end_mill|P bucket");
  assert.equal(k.ap_min_mm, 2);
  assert.equal(k.ap_max_mm, 8);   // the 99 from "Various" must NOT leak in (unmappable material excluded)
  assert.equal(k.ae_max_mm, 9);
});

test("enrichTool — series match yields high-confidence per-series vc/fz", () => {
  const ctx = {
    lookupSeriesSpeedFeed: (k) => (k === "JS512" ? SERIES[0] : null),
    isoAgg: buildIsoAggregate(SERIES),
    docAgg: {},
  };
  const tool = { type: "endmill", grade: "JS512", name: "CoroMill", material_groups: ["P"] };
  const e = enrichTool(tool, ctx);
  assert.equal(e.cutting_data.length, 1);
  assert.equal(e.cutting_data[0].confidence, 0.8);
  assert.equal(e.cutting_data[0].vc_min_m_min, 100); // the exact series value, not the aggregate
  assert.match(e.cutting_data[0].matchType, /^series:JS512/);
  assert.equal(e.unmatched, false);
});

test("enrichTool — no series match falls back to ISO aggregate at lower confidence", () => {
  const ctx = { lookupSeriesSpeedFeed: () => null, isoAgg: buildIsoAggregate(SERIES), docAgg: {} };
  const tool = { type: "milling_insert", grade: "unknown", name: "Generic", material_groups: ["P", "S"] };
  const e = enrichTool(tool, ctx);
  assert.equal(e.cutting_data.length, 2); // one per ISO group
  assert.equal(e.cutting_data[0].confidence, 0.5);
  assert.equal(e.cutting_data[0].matchType, "iso-group-aggregate");
  assert.equal(e.cutting_data[0].vc_max_m_min, 225); // aggregate max for P
});

test("enrichTool — no ISO group → unmatched, loud-flagged, NOT fabricated", () => {
  const ctx = { lookupSeriesSpeedFeed: () => null, isoAgg: buildIsoAggregate(SERIES), docAgg: {} };
  const e = enrichTool({ type: "drill", grade: "x", material_groups: [] }, ctx);
  assert.equal(e.cutting_data.length, 0);
  assert.equal(e.unmatched, true);
  assert.equal(e.reason, "no-iso-group");
});

test("enrichTool — ISO group with no aggregate data is skipped, not zero-filled", () => {
  const ctx = { lookupSeriesSpeedFeed: () => null, isoAgg: buildIsoAggregate(SERIES), docAgg: {} };
  const e = enrichTool({ type: "drill", grade: "x", material_groups: ["M"] }, ctx); // M has no series data
  assert.equal(e.cutting_data.length, 0);
  assert.equal(e.unmatched, true);
});
