// reconcile-candidate-adapters.test.mjs -- U-XRAY-RECONCILE-CANDIDATES
// The cnc + print source-adapters feeding DimCandidate[] to CrossSourceDimensionReconciliationEngine,
// plus buildPartCandidates. Reference values computed from the documented contract (mm-vs-inch, source
// tags, optional-confidence). Each assertion is load-bearing (R9).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  programGtToCandidates,
  printOcrToCandidates,
  buildPartCandidates,
  cadGtToCandidates,
} from "./reconcile-candidate-adapters.mjs";

describe("programGtToCandidates (cnc adapter)", () => {
  it("clustered diameters (inch)->mm diameter + overall_length linear; source cnc; no confidence by default", () => {
    const c = programGtToCandidates({ clusteredDiametersIn: [0.5, 1.0], lengthIn: 2.0 });
    assert.equal(c.length, 3);
    assert.deepEqual(c[0], { value_mm: 12.7, type: "diameter", source: "cnc" });
    assert.deepEqual(c[1], { value_mm: 25.4, type: "diameter", source: "cnc" });
    assert.deepEqual(c[2], { value_mm: 50.8, type: "linear", source: "cnc", label: "overall_length" });
  });
  it("falls back to featureDiametersIn when no clustered set", () => {
    assert.deepEqual(programGtToCandidates({ featureDiametersIn: [0.25] }), [{ value_mm: 6.35, type: "diameter", source: "cnc" }]);
  });
  it("opts.confidence sets an explicit confidence (else engine prior applies)", () => {
    const c = programGtToCandidates({ clusteredDiametersIn: [0.5] }, { confidence: 0.9 });
    assert.equal(c[0].confidence, 0.9);
  });
  it("null / empty / non-positive -> []", () => {
    assert.deepEqual(programGtToCandidates(null), []);
    assert.deepEqual(programGtToCandidates({}), []);
    assert.deepEqual(programGtToCandidates({ clusteredDiametersIn: [0, -1] }), []);
  });
});

describe("printOcrToCandidates (print adapter)", () => {
  it("contract dims carry their per-field confidence + type", () => {
    assert.deepEqual(
      printOcrToCandidates([{ value_mm: 12.7, type: "diameter", confidence: 0.8 }]),
      [{ value_mm: 12.7, type: "diameter", source: "print", confidence: 0.8 }],
    );
  });
  it("bare numbers -> unknown type, no confidence (engine print prior); drops non-positive/NaN", () => {
    assert.deepEqual(printOcrToCandidates([25.4, -1, 0, Number.NaN]), [{ value_mm: 25.4, type: "unknown", source: "print" }]);
  });
  it("opts.confidence applies only when a dim has none of its own", () => {
    assert.equal(printOcrToCandidates([{ value_mm: 5 }], { confidence: 0.6 })[0].confidence, 0.6);
    assert.equal(printOcrToCandidates([{ value_mm: 5, confidence: 0.9 }], { confidence: 0.6 })[0].confidence, 0.9);
  });
  it("non-array -> []", () => assert.deepEqual(printOcrToCandidates(null), []));
});

describe("buildPartCandidates (merger)", () => {
  const cadGT = { calloutDimsMm: [12.7, 50.8], featureDiametersMm: [12.7], envelopeMm: [50.8], gtReliable: true };
  it("merges cad + cnc + print, each tagged by source", () => {
    const c = buildPartCandidates({ cadGT, programGT: { clusteredDiametersIn: [1.0] }, ocrDimsMm: [{ value_mm: 12.7, confidence: 0.7 }] });
    const bySrc = (s) => c.filter((x) => x.source === s).length;
    assert.equal(bySrc("cad"), 2); // 1 feature diameter + 1 envelope linear
    assert.equal(bySrc("cnc"), 1);
    assert.equal(bySrc("print"), 1);
    // every candidate is a valid DimCandidate (value_mm finite>0, a source tag)
    assert.ok(c.every((x) => Number.isFinite(x.value_mm) && x.value_mm > 0 && ["cad", "cnc", "print"].includes(x.source)));
  });
  it("emits ONLY the sources provided", () => {
    const c = buildPartCandidates({ programGT: { clusteredDiametersIn: [1.0] } });
    assert.ok(c.length > 0 && c.every((x) => x.source === "cnc"));
  });
  it("empty -> []", () => assert.deepEqual(buildPartCandidates({}), []));
});

describe("re-export", () => {
  it("cadGtToCandidates (the (b) cad adapter) is re-exported so all 3 sources import from one module", () => {
    assert.equal(typeof cadGtToCandidates, "function");
  });
});
