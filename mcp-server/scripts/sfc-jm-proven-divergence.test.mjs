import { test } from "node:test";
import assert from "node:assert/strict";
import {
  materialGroupToISO, isConventionallyTurned, classifyOp, compareCss, SUSPECT_UNITS_FACTOR,
  cssToMPerMin, SFM_TO_M_PER_MIN, resolveCssUnit, buildDivergenceRows, summarizeDivergence, formatDivergenceReport,
  feedToMmPerRev, IPR_TO_MM_PER_REV, compareFeed, toDatasetRows,
} from "./sfc-jm-proven-divergence.mjs";

// Fixture mirroring CANONICAL_TURNING_SPEEDS values (a fixture, NOT importing the .ts constant -- the
// helpers take the speeds table injected, so tests stay pure-node + tsx-free).
const SPEEDS = {
  P: { rough: 220, finish: 320 }, M: { rough: 150, finish: 220 }, K: { rough: 180, finish: 280 },
  N: { rough: 400, finish: 600 }, S: { rough: 35, finish: 70 }, H: { rough: 80, finish: 130 },
};
// Fixture mirroring CANONICAL_TURNING_FEEDS (mm/rev; rough feed is HEAVIER than finish).
const FEEDS = {
  P: { rough: 0.30, finish: 0.12 }, M: { rough: 0.25, finish: 0.10 }, K: { rough: 0.35, finish: 0.15 },
  N: { rough: 0.30, finish: 0.12 }, S: { rough: 0.18, finish: 0.08 }, H: { rough: 0.15, finish: 0.06 },
};

test("feedToMmPerRev converts JM proven IPR feed-per-rev to mm/rev (verified *25.4); mm_rev passes through", () => {
  // 0.005 ipr (a classic turning finish feed) -> 0.127 mm/rev; 0.02 ipr (roughing) -> 0.508
  assert.ok(Math.abs(feedToMmPerRev(0.005) - 0.127) < 1e-9);
  assert.ok(Math.abs(feedToMmPerRev(0.02) - 0.508) < 1e-9);
  assert.equal(IPR_TO_MM_PER_REV, 25.4);
  assert.equal(feedToMmPerRev(0.2, "mm_rev"), 0.2);   // explicit mm_rev -> passthrough (no double-convert)
  assert.ok(Number.isNaN(feedToMmPerRev(null)));      // no feed -> NaN (NOT Number(null)=0)
  assert.ok(Number.isNaN(feedToMmPerRev("x")));       // non-numeric -> NaN
});

test("buildDivergenceRows surfaces the JM proven feed converted to mm/rev (IPR); null when the config has no feed", () => {
  const configs = [
    { materialGroup: "alloy_steel", operation: "od_roughing", css: { recommended: 200 }, feed: { recommended: 0.005 }, confidence: 0.8, sampleCount: 5 },
    { materialGroup: "alloy_steel", operation: "od_finishing", css: { recommended: 220 }, confidence: 0.8, sampleCount: 5 }, // no feed field
  ];
  const { rows } = buildDivergenceRows(configs, SPEEDS); // cssUnit defaults "sfm", feedUnit defaults "ipr"
  const withFeed = rows.find((r) => r.operation === "od_roughing");
  const noFeed = rows.find((r) => r.operation === "od_finishing");
  assert.equal(withFeed.jmFeedUnit, "ipr");
  assert.equal(withFeed.jmFeedRaw, 0.005);
  assert.ok(Math.abs(withFeed.jmFeedMmRev - 0.127) < 1e-3); // 0.005 ipr -> 0.127 mm/rev
  assert.equal(noFeed.jmFeedMmRev, null);                   // absent feed -> null, not 0
});

test("compareFeed verdicts JM feed (mm/rev) vs the canonical band (auto-orients rough>finish); >1.8x = suspect-units", () => {
  // P feed band {rough 0.30, finish 0.12} -> [0.12, 0.30].
  assert.equal(compareFeed(0.08, FEEDS.P).verdict, "conservative"); // below 0.12 -> JM-light
  assert.equal(compareFeed(0.20, FEEDS.P).verdict, "in-band");      // 0.12 <= 0.20 <= 0.30
  assert.equal(compareFeed(0.40, FEEDS.P).verdict, "aggressive");   // 0.30 < 0.40 < 0.30*1.8(0.54)
  assert.equal(compareFeed(3.0, FEEDS.P).verdict, "suspect-units"); // > 0.54 -> a feed units artifact (e.g. IPR unconverted)
  assert.equal(compareFeed(NaN, FEEDS.P), null);                   // uncomparable
});

test("buildDivergenceRows attaches a feed verdict when the canonical feed band is injected (null + CSS-unchanged otherwise)", () => {
  const configs = [
    { materialGroup: "alloy_steel", operation: "od_roughing", css: { recommended: 200 }, feed: { recommended: 0.005 }, confidence: 0.8, sampleCount: 5 },
  ];
  // 0.005 ipr -> 0.127 mm/rev; P feed band [0.12, 0.30] -> in-band.
  const withBand = buildDivergenceRows(configs, SPEEDS, undefined, "sfm", "ipr", FEEDS);
  assert.equal(withBand.rows[0].feedVerdict, "in-band");
  assert.deepEqual(withBand.rows[0].feedBand, [0.12, 0.30]);
  // No band injected -> feedVerdict null, and the CSS verdict is byte-identical (purely additive).
  const noBand = buildDivergenceRows(configs, SPEEDS);
  assert.equal(noBand.rows[0].feedVerdict, null);
  assert.equal(noBand.rows[0].verdict, withBand.rows[0].verdict);
});

test("summarizeDivergence aggregates feed verdicts independently of CSS (only rows that have a feed verdict)", () => {
  const configs = [
    { materialGroup: "alloy_steel", operation: "od_roughing", css: { recommended: 200 }, feed: { recommended: 0.005 }, confidence: 0.8, sampleCount: 5 }, // feed 0.127 -> in-band
    { materialGroup: "alloy_steel", operation: "od_finishing", css: { recommended: 220 }, feed: { recommended: 0.002 }, confidence: 0.8, sampleCount: 5 }, // feed 0.051 -> below P band -> conservative
    { materialGroup: "alloy_steel", operation: "facing", css: { recommended: 220 }, confidence: 0.8, sampleCount: 5 }, // no feed -> excluded from the feed aggregate
  ];
  const { rows } = buildDivergenceRows(configs, SPEEDS, undefined, "sfm", "ipr", FEEDS);
  const s = summarizeDivergence(rows);
  assert.equal(s.comparable, 3);        // all 3 are CSS-comparable
  assert.equal(s.feed.comparable, 2);   // only 2 carry a feed verdict (facing has no feed)
  assert.equal(s.feed.inBand, 1);       // 0.005 ipr -> 0.127 mm/rev -> in-band
  assert.equal(s.feed.conservative, 1); // 0.002 ipr -> 0.051 mm/rev -> below band -> JM-light
  assert.equal(s.feed.aggressive, 0);
});

test("toDatasetRows maps comparable rows to a flat india-consumable schema (css+feed verdicts, verified units)", () => {
  const configs = [
    { materialGroup: "alloy_steel", operation: "od_roughing", css: { recommended: 200 }, feed: { recommended: 0.005 }, confidence: 0.8, sampleCount: 5 },
  ];
  const { rows } = buildDivergenceRows(configs, SPEEDS, undefined, "sfm", "ipr", FEEDS);
  const ds = toDatasetRows(rows);
  assert.equal(ds.length, 1);
  const d = ds[0];
  assert.equal(d.iso, "P");
  assert.equal(d.operation, "od_roughing");
  assert.equal(d.jm_css_mpm, 61);             // 200 SFM -> 61 m/min (verified *0.3048)
  assert.equal(d.css_verdict, "conservative"); // 61 below P band [220,320]
  assert.equal(d.jm_feed_mm_rev, 0.127);      // 0.005 ipr -> 0.127 mm/rev (verified *25.4)
  assert.equal(d.feed_verdict, "in-band");    // 0.127 in P feed band [0.12,0.30]
  assert.deepEqual(d.prism_feed_band, [0.12, 0.30]);
  assert.equal(d.sample_count, 5);
  assert.equal(typeof d.confidence, "number");
});

test("materialGroupToISO maps each proven group to its ISO 513 group (tool_steel -> P, machined annealed)", () => {
  assert.equal(materialGroupToISO("carbon_steel"), "P");
  assert.equal(materialGroupToISO("alloy_steel"), "P");
  // tool_steel is machined ANNEALED (soft) -> P, NOT H (hardened). Mapping it to H inflated every
  // soft cut to a fabricated "aggressive" verdict (physics-reviewer 2026-06-25).
  assert.equal(materialGroupToISO("tool_steel"), "P");
  assert.equal(materialGroupToISO("hardened"), "H");   // only EXPLICIT hardened -> H
  assert.equal(materialGroupToISO("stainless"), "M");
  assert.equal(materialGroupToISO("aluminum"), "N");
  assert.equal(materialGroupToISO("inconel"), "S");
  assert.equal(materialGroupToISO("TOOL_STEEL"), "P");  // case-insensitive
  assert.equal(materialGroupToISO("unobtanium"), null);
  assert.equal(materialGroupToISO(null), null);
});

test("isConventionallyTurned excludes ground/EDM'd materials (carbide/ceramic/CBN/diamond)", () => {
  assert.equal(isConventionallyTurned("alloy_steel"), true);
  assert.equal(isConventionallyTurned("aluminum"), true);
  // carbide etc. are not turned -- a "turning CSS" for them is a mislabel, not a real cut
  assert.equal(isConventionallyTurned("tungsten_carbide"), false);
  assert.equal(isConventionallyTurned("carbide"), false);
  assert.equal(isConventionallyTurned("ceramic"), false);
  assert.equal(isConventionallyTurned("CBN"), false);
});

test("classifyOp separates band-comparable turning ops from specialized own-regime ops", () => {
  assert.equal(classifyOp("od_roughing"), "rough");
  assert.equal(classifyOp("od_finishing"), "finish");
  assert.equal(classifyOp("facing"), "general");
  assert.equal(classifyOp("boring"), "general");
  for (const op of ["parting", "grooving", "threading", "drilling", "center_drilling", "unknown"]) {
    assert.equal(classifyOp(op), "specialized");
  }
});

test("compareCss verdicts JM CSS against the PRISM band with a signed delta", () => {
  // P band [220,320]: 150 below low edge -> conservative, delta = (150-220)/220 = -31.8%
  const conservative = compareCss(150, SPEEDS.P);
  assert.equal(conservative.verdict, "conservative");
  assert.ok(Math.abs(conservative.deltaPct - (-31.818)) < 0.01);
  // 450 in (320, 320*1.8=576] -> aggressive (a plausibly-hot real cut), delta +40.6%
  const aggressive = compareCss(450, SPEEDS.P);
  assert.equal(aggressive.verdict, "aggressive");
  assert.ok(Math.abs(aggressive.deltaPct - 40.625) < 0.01);
  // 280 within [220,320] -> in-band, delta 0
  assert.equal(compareCss(280, SPEEDS.P).verdict, "in-band");
  assert.equal(compareCss(280, SPEEDS.P).deltaPct, 0);
  // boundary: exactly the low/high edge is in-band
  assert.equal(compareCss(220, SPEEDS.P).verdict, "in-band");
  assert.equal(compareCss(320, SPEEDS.P).verdict, "in-band");
});

test("compareCss flags SUSPECT-UNITS above the suspect factor (likely SFM->m/min artifact)", () => {
  // 700 > 320*1.8 (=576) -> suspect-units, NOT aggressive (700 SFM ~ 213 m/min would be in-band)
  const suspect = compareCss(700, SPEEDS.P);
  assert.equal(suspect.verdict, "suspect-units");
  assert.ok(Math.abs(suspect.deltaPct - 118.75) < 0.01);
  // exactly at the factor edge is still aggressive (strict >)
  assert.equal(compareCss(320 * SUSPECT_UNITS_FACTOR, SPEEDS.P).verdict, "aggressive");
  assert.equal(compareCss(320 * SUSPECT_UNITS_FACTOR + 1, SPEEDS.P).verdict, "suspect-units");
});

test("compareCss tolerates a reversed band + rejects bad inputs (never NaN)", () => {
  assert.equal(compareCss(150, { rough: 320, finish: 220 }).verdict, "conservative"); // reversed band
  assert.equal(compareCss("abc", SPEEDS.P), null);
  assert.equal(compareCss(150, null), null);
  assert.equal(compareCss(150, { rough: 0, finish: 0 }), null);     // non-positive band
  assert.equal(compareCss(150, { rough: "x", finish: 320 }), null); // non-numeric band edge
});

test("cssToMPerMin converts SFM->m/min (exact 0.3048) + passes m_min through + NaN-guards", () => {
  assert.equal(SFM_TO_M_PER_MIN, 0.3048);
  assert.ok(Math.abs(cssToMPerMin(700, "sfm") - 213.36) < 0.001);  // 700 SFM = 213.36 m/min (the in-band truth)
  assert.equal(cssToMPerMin(1000, "sfm"), 304.8);
  assert.equal(cssToMPerMin(200, "m_min"), 200);                    // already metric -> passthrough
  assert.ok(Number.isNaN(cssToMPerMin(null)));
  assert.ok(Number.isNaN(cssToMPerMin("abc")));
});

test("resolveCssUnit: explicit flag wins > store's own label > sfm default (forward-compat with the source fix)", () => {
  // explicit flag wins over everything
  assert.equal(resolveCssUnit("m_min", "sfm"), "m_min");
  assert.equal(resolveCssUnit("sfm", "m_min"), "sfm");
  // no explicit -> the store's self-described unit (set once the aggregator units-fix lands)
  assert.equal(resolveCssUnit(null, "m_min"), "m_min");
  assert.equal(resolveCssUnit(null, "sfm"), "sfm");
  // neither / invalid -> "sfm" default (the current unlabeled JM-inch corpus)
  assert.equal(resolveCssUnit(null, undefined), "sfm");
  assert.equal(resolveCssUnit(null, "bogus"), "sfm");
  assert.equal(resolveCssUnit("typo", null), "sfm");
});

test("buildDivergenceRows converts SFM css to m/min before comparison (the JM-inch default)", () => {
  // As SFM (default): 820 SFM = 250 m/min -> in-band P[220,320]; 500 SFM = 152 m/min -> conservative.
  // (Read as m/min those would be wildly aggressive -- this is the iter-11 units bug the conversion fixes.)
  const cfgs = [
    { materialGroup: "carbon_steel", operation: "od_finishing", css: { recommended: 820 }, confidence: 0.8, sampleCount: 100 },
    { materialGroup: "alloy_steel", operation: "od_roughing", css: { recommended: 500 }, confidence: 0.8, sampleCount: 100 },
  ];
  const { rows } = buildDivergenceRows(cfgs, SPEEDS); // default cssUnit "sfm"
  const byMat = Object.fromEntries(rows.map((r) => [r.materialGroup, r]));
  assert.equal(byMat.carbon_steel.jmCssRaw, 820);
  assert.equal(byMat.carbon_steel.jmCssUnit, "sfm");
  assert.equal(byMat.carbon_steel.jmCss, 250);          // 820 * 0.3048 rounded
  assert.equal(byMat.carbon_steel.verdict, "in-band");
  assert.equal(byMat.alloy_steel.jmCss, 152);           // 500 * 0.3048 rounded
  assert.equal(byMat.alloy_steel.verdict, "conservative");
});

const CONFIGS = [
  { materialGroup: "alloy_steel", operation: "od_roughing", css: { recommended: 150 }, confidence: 0.8, sampleCount: 400 },  // P, conservative, trust
  { materialGroup: "carbon_steel", operation: "od_finishing", css: { recommended: 700 }, confidence: 0.5, sampleCount: 900 }, // P, suspect-units, override
  { materialGroup: "tool_steel", operation: "od_finishing", css: { recommended: 280 }, confidence: 0.75, sampleCount: 120 },  // P (annealed), in-band, trust
  { materialGroup: "alloy_steel", operation: "boring", css: { recommended: 450 }, confidence: 0.4, sampleCount: 60 },         // P, aggressive, override
  { materialGroup: "tungsten_carbide", operation: "boring", css: { recommended: 350 }, confidence: 0.6, sampleCount: 50 },    // excluded: not-turned
  { materialGroup: "carbon_steel", operation: "parting", css: { recommended: 700 }, confidence: 0.9, sampleCount: 50 },       // excluded: specialized
  { materialGroup: "tool_steel", operation: "drilling", css: { recommended: null }, confidence: 0.3, sampleCount: 200 },      // excluded: no-css
  { materialGroup: "unobtanium", operation: "od_roughing", css: { recommended: 100 }, confidence: 0.6, sampleCount: 30 },     // excluded: unmapped
];

test("buildDivergenceRows compares the comparable configs + surfaces every excluded one honestly", () => {
  const { rows, excluded } = buildDivergenceRows(CONFIGS, SPEEDS, undefined, "m_min");
  assert.equal(rows.length, 4);
  assert.equal(excluded.length, 4);
  const reasons = excluded.map((e) => e.reason).sort();
  assert.deepEqual(reasons, [
    "material-not-conventionally-turned", "no-css", "specialized-op-own-regime", "unmapped-material",
  ]);
  // sorted biggest |delta| first: carbon_steel suspect (+119%) > alloy_steel boring aggressive (+41%)
  // > alloy_steel od_roughing conservative (-32%) > tool_steel in-band (0)
  assert.equal(rows[0].verdict, "suspect-units");
  assert.equal(rows[0].materialGroup, "carbon_steel");
  assert.equal(rows[1].verdict, "aggressive");
  assert.equal(rows[2].verdict, "conservative");
  assert.equal(rows[3].verdict, "in-band");
  // tool_steel resolved to P (not H) -> 280 is in-band, NOT a fabricated aggressive
  assert.equal(rows[3].materialGroup, "tool_steel");
  assert.equal(rows[3].iso, "P");
});

test("summarizeDivergence counts all four verdicts overall + split by trust/override", () => {
  const { rows } = buildDivergenceRows(CONFIGS, SPEEDS, undefined, "m_min");
  const s = summarizeDivergence(rows);
  assert.equal(s.comparable, 4);
  assert.equal(s.conservative, 1);
  assert.equal(s.inBand, 1);
  assert.equal(s.aggressive, 1);
  assert.equal(s.suspectUnits, 1);
  // trust: alloy_steel od_roughing(conservative) + tool_steel od_finishing(in-band)
  assert.deepEqual(s.trust, { conservative: 1, inBand: 1, aggressive: 0, suspectUnits: 0 });
  // override: alloy_steel boring(aggressive) + carbon_steel od_finishing(suspect-units)
  assert.deepEqual(s.override, { conservative: 0, inBand: 0, aggressive: 1, suspectUnits: 1 });
});

test("buildDivergenceRows surfaces a no-band-for-iso exclusion when a mapped ISO lacks a band", () => {
  // K maps (cast_iron) but the injected speeds table omits K -> excluded as no-band-for-iso, not crash
  const partial = { P: SPEEDS.P }; // only P has a band
  const cfgs = [{ materialGroup: "cast_iron", operation: "od_roughing", css: { recommended: 200 }, confidence: 0.8 }];
  const { rows, excluded } = buildDivergenceRows(cfgs, partial);
  assert.equal(rows.length, 0);
  assert.equal(excluded[0].reason, "no-band-for-iso");
});

test("formatDivergenceReport renders the four-verdict headline + every comparable row", () => {
  const store = { source: "JM Die Okuma lathe", totalPrograms: 16524, provenParams: CONFIGS };
  const txt = formatDivergenceReport(store, SPEEDS, undefined, "m_min");
  assert.match(txt, /CONSERVATIVE 1 \(JM slow\) \| IN-BAND 1 \(agrees\) \| AGGRESSIVE 1 \(JM hot\) \| SUSPECT-UNITS 1/);
  assert.match(txt, /excluded 4/);
  assert.match(txt, /carbon_steel/);
  assert.match(txt, /tool_steel -> ISO P/);  // the corrected-mapping note
});
