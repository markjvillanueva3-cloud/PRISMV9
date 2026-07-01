import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toConfigArray, classifyTrust, rangeWidthPct, summarize, buildRows, formatReport,
  DEFAULT_TRUST_THRESHOLD,
} from "./sfc-jm-proven-report.mjs";

// A small fixture mirroring the real store shape (materialGroup x op, css/feed with range, confidence).
const CONFIGS = [
  { materialGroup: "alloy_steel", operation: "parting", css: { recommended: 150, range: [100, 150] }, feed: { recommended: 0.0015, range: [0.001, 0.0015] }, confidence: 0.86, sampleCount: 800 },
  { materialGroup: "tool_steel", operation: "od_finishing", css: { recommended: 200, range: [180, 220] }, feed: { recommended: 0.1, range: [0.08, 0.12] }, confidence: 0.74, sampleCount: 1200 },
  { materialGroup: "tool_steel", operation: "drilling", css: { recommended: 30, range: [10, 60] }, feed: { recommended: 0.1, range: [0.02, 0.2] }, confidence: 0.41, sampleCount: 500 },
  { materialGroup: "aluminum", operation: "unknown", css: { recommended: 300, range: [250, 350] }, feed: { recommended: 0.2, range: [0.15, 0.25] }, confidence: 0.3, sampleCount: 50 },
];

test("toConfigArray normalizes array, keyed-object, and null", () => {
  assert.equal(toConfigArray(CONFIGS).length, 4);
  assert.equal(toConfigArray({ a: CONFIGS[0], b: CONFIGS[1] }).length, 2);
  assert.deepEqual(toConfigArray(null), []);
  assert.deepEqual(toConfigArray(undefined), []);
  // null entries inside an array are dropped (the aggregator can emit holes)
  assert.equal(toConfigArray([CONFIGS[0], null, CONFIGS[1]]).length, 2);
});

test("classifyTrust gates on the confidence threshold (>= cutoff = trust)", () => {
  assert.equal(classifyTrust(CONFIGS[0]), "trust");        // 0.86 >= 0.7
  assert.equal(classifyTrust(CONFIGS[1]), "trust");        // 0.74 >= 0.7
  assert.equal(classifyTrust(CONFIGS[2]), "override");     // 0.41 <  0.7
  assert.equal(classifyTrust(CONFIGS[3]), "override");     // 0.30 <  0.7
  // boundary: exactly the threshold is TRUST
  assert.equal(classifyTrust({ confidence: 0.7 }), "trust");
  assert.equal(classifyTrust({ confidence: 0.6999 }), "override");
  // custom threshold re-classifies 0.74 as override
  assert.equal(classifyTrust(CONFIGS[1], 0.75), "override");
});

test("classifyTrust fail-safe: missing/NaN confidence is OVERRIDE (an unknown JM value is not trusted)", () => {
  assert.equal(classifyTrust({}), "override");
  assert.equal(classifyTrust({ confidence: "abc" }), "override");
  assert.equal(classifyTrust(null), "override");
});

test("rangeWidthPct is the proven range width as a % of recommended (a variance proxy)", () => {
  // alloy_steel parting css: (150-100)/150 = 33.3%
  assert.ok(Math.abs(rangeWidthPct(CONFIGS[0].css) - 33.333) < 0.01);
  // tool_steel drilling css is wide: (60-10)/30 = 166.7%  (amateur programs disagreed a lot)
  assert.ok(Math.abs(rangeWidthPct(CONFIGS[2].css) - 166.667) < 0.01);
  // a reversed range [hi,lo] yields a NON-NEGATIVE proxy (never a misleading negative %)
  assert.ok(Math.abs(rangeWidthPct({ recommended: 150, range: [200, 100] }) - 66.667) < 0.01);
  // bad inputs -> null (never NaN/Infinity)
  assert.equal(rangeWidthPct(null), null);
  assert.equal(rangeWidthPct({ recommended: 0, range: [0, 1] }), null);   // div-by-zero guard
  assert.equal(rangeWidthPct({ recommended: 1e-12, range: [0, 1] }), null); // sub-epsilon recommended guard
  assert.equal(rangeWidthPct({ recommended: 10, range: [1] }), null);     // malformed range
  assert.equal(rangeWidthPct({ recommended: 10 }), null);                  // no range
});

test("summarize counts trust/override + carries the sample weight + per-group breakdown", () => {
  const s = summarize(CONFIGS);
  assert.equal(s.total, 4);
  assert.equal(s.trust, 2);          // 0.86, 0.74
  assert.equal(s.override, 2);       // 0.41, 0.30
  // sample weight follows the classification (the high-variance configs are excluded from trust)
  assert.equal(s.samplesInTrust, 800 + 1200);
  assert.equal(s.samplesInOverride, 500 + 50);
  // tool_steel has one trust (od_finishing) + one override (drilling)
  assert.deepEqual(s.byMaterial.tool_steel, { trust: 1, override: 1 });
  assert.deepEqual(s.byMaterial.alloy_steel, { trust: 1, override: 0 });
  assert.deepEqual(s.byOperation.drilling, { trust: 0, override: 1 });
});

test("summarize re-weights when the threshold changes", () => {
  const strict = summarize(CONFIGS, 0.8);  // only 0.86 clears
  assert.equal(strict.trust, 1);
  assert.equal(strict.override, 3);
});

test("buildRows sorts trust-first then by descending sampleCount, with computed variance", () => {
  const rows = buildRows(CONFIGS);
  // trust rows first: tool_steel od_finishing (1200) before alloy_steel parting (800)
  assert.equal(rows[0].classification, "trust");
  assert.equal(rows[1].classification, "trust");
  assert.equal(rows[0].sampleCount, 1200);
  assert.equal(rows[1].sampleCount, 800);
  // override rows last, also sampleCount-desc: drilling (500) before unknown (50)
  assert.equal(rows[2].classification, "override");
  assert.equal(rows[2].sampleCount, 500);
  assert.equal(rows[3].sampleCount, 50);
  // a computed field is present + sane
  assert.ok(Math.abs(rows[1].cssVariancePct - 33.333) < 0.01); // alloy_steel parting
});

test("formatReport renders the trust/override headline + every config row", () => {
  const store = {
    source: "JM-Die Okuma lathe", totalPrograms: 16524, totalSamples: 94015,
    outliersFlagged: 9633, provenParams: CONFIGS,
  };
  const txt = formatReport(store, DEFAULT_TRUST_THRESHOLD);
  assert.match(txt, /TRUST 2 \(guideline\) \/ OVERRIDE 2/);
  assert.match(txt, /programs: 16524/);
  assert.match(txt, /alloy_steel/);
  assert.match(txt, /drilling/);
  // the wide-variance drilling config shows a high css variance %
  assert.match(txt, /167%|166%/);
});
