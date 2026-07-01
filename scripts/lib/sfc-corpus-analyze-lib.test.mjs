// scripts/lib/sfc-corpus-analyze-lib.test.mjs
//
// Reference-value tests for the corpus statistics core. Percentiles + fences are
// hand-computed below, not echoed from the implementation. Run:
// `node scripts/lib/sfc-corpus-analyze-lib.test.mjs`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  percentile, summarize, iqrFences, classifyAgainstFences, grossFlags, bucketKey,
} from "./sfc-corpus-analyze-lib.mjs";

test("percentile: linear interpolation + edges", () => {
  assert.equal(percentile([1, 2, 3, 4, 5], 50), 3);   // exact middle
  assert.equal(percentile([1, 2, 3, 4], 50), 2.5);    // rank 1.5 -> interp 2,3
  assert.equal(percentile([1, 2, 3, 4, 5], 0), 1);
  assert.equal(percentile([1, 2, 3, 4, 5], 100), 5);
  assert.equal(percentile([], 50), null);
});

test("summarize: five-number summary on 1..10", () => {
  const s = summarize([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(s.n, 10);
  assert.equal(s.min, 1);
  assert.equal(s.max, 10);
  assert.equal(s.median, 5.5);  // rank 4.5 -> interp 5,6
  assert.equal(s.p25, 3.25);    // rank 2.25 -> 3 + .25*(4-3)
  assert.equal(s.p75, 7.75);    // rank 6.75 -> 7 + .75*(8-7)
  // filters non-finite
  assert.equal(summarize([1, 2, NaN, 3]).n, 3);
  assert.equal(summarize([]).n, 0);
});

test("iqrFences + classifyAgainstFences", () => {
  const s = summarize([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); // p25 3.25, p75 7.75
  const f = iqrFences(s);                                // iqr 4.5; lower -3.5; upper 14.5
  assert.equal(f.iqr, 4.5);
  assert.equal(f.lower, -3.5);
  assert.equal(f.upper, 14.5);
  assert.equal(classifyAgainstFences(20, f), "high");
  assert.equal(classifyAgainstFences(-10, f), "low");
  assert.equal(classifyAgainstFences(5, f), "normal");
  // too small a sample -> no fences (avoid false outliers)
  assert.equal(iqrFences(summarize([1, 2, 3])), null);
});

test("grossFlags: absolute physical sanity (inch convention)", () => {
  // lathe CSS 5000 sfm is impossible; feed/rev 0.5 ipr is impossible.
  assert.deepEqual(
    grossFlags({ spindleMode: "css", spindleValue: 5000, feedMode: "per_rev", feed: 0.5 }, "inch"),
    ["css-too-high", "feed-too-high"],
  );
  // a normal turning op trips nothing.
  assert.deepEqual(
    grossFlags({ spindleMode: "css", spindleValue: 400, feedMode: "per_rev", feed: 0.008 }, "inch"),
    [],
  );
  // a normal milling op (rpm + ipm) trips nothing.
  assert.deepEqual(
    grossFlags({ spindleMode: "rpm", spindleValue: 2000, feedMode: "per_min", feed: 12 }, "inch"),
    [],
  );
  // metric CSS uses m/min bounds: 600 m/min is too high.
  assert.deepEqual(
    grossFlags({ spindleMode: "css", spindleValue: 600, feedMode: "per_rev", feed: 0.2 }, "metric"),
    ["css-too-high"],
  );
});

test("bucketKey groups by machineClass x spindleMode", () => {
  assert.equal(bucketKey("lathe", "css"), "lathe|css");
  assert.equal(bucketKey(null, null), "unknown|unknown");
});
