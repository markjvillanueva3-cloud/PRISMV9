/**
 * cmm-uncertainty-emit.test.mjs — concrete-value tests for CMM
 * uncertainty propagation lib. Hand-checked first-order RSS math.
 *
 * Hand-checked anchors:
 *   3-4-5 triangle: √(3² + 4²) = 5
 *     → propagateLinearCombination([1,1], [3,4]) = 5
 *     → tolerancestackupRSS([3,4]) = 5
 *     → sigmaOfDifference(3, 4) = 5
 *   σ_mean = σ / √n: σ=10, n=4 → 10/2 = 5
 *   k=2 coverage: U = 2σ (ISO GUM convention, ≈95% Gaussian)
 *
 * Fanuc/Haas/Mitsubishi strip parens from comments → "(k=2)" → "k=2"
 *   (same paren-strip pattern as iter51-56 dialects)
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import {
  CMM_UNCERTAINTY_EMIT_SCHEMA_VERSION,
  DEFAULT_DECIMAL_PLACES,
  DEFAULT_COVERAGE_FACTOR,
  MAX_CHAIN_LINKS,
  SUPPORTED_DIALECTS,
  formatComment,
  propagateLinearCombination,
  tolerancestackupRSS,
  sigmaOfMean,
  sigmaOfDifference,
  expandedUncertainty,
  propagateWCSOriginChain,
  formatValueWithUncertainty,
  buildWCSProbeUncertaintyComment,
  emitCMMUncertainty,
} from "./cmm-uncertainty-emit.mjs";

const EPS = 1e-9;
const approx = (a, b) => Math.abs(a - b) < EPS;

describe("constants", () => {
  it("SCHEMA_VERSION=1, DEFAULT_DECIMAL_PLACES=4, DEFAULT_COVERAGE_FACTOR=2", () => {
    assert.strictEqual(CMM_UNCERTAINTY_EMIT_SCHEMA_VERSION, 1);
    assert.strictEqual(DEFAULT_DECIMAL_PLACES, 4);
    assert.strictEqual(DEFAULT_COVERAGE_FACTOR, 2);
  });
  it("MAX_CHAIN_LINKS=64", () => {
    assert.strictEqual(MAX_CHAIN_LINKS, 64);
  });
  it("SUPPORTED_DIALECTS has 5 entries", () => {
    assert.deepStrictEqual(SUPPORTED_DIALECTS, [
      "fanuc", "haas", "heidenhain", "mitsubishi", "siemens",
    ]);
  });
});

describe("formatComment", () => {
  it("fanuc strips parens — '(k=2)' → 'k=2'", () => {
    assert.strictEqual(formatComment("fanuc", "X +/- 0.01 (k=2)"), "( X +/- 0.01 k=2 )");
  });
  it("heidenhain preserves parens", () => {
    assert.strictEqual(formatComment("heidenhain", "X +/- 0.01 (k=2)"), "; X +/- 0.01 (k=2)");
  });
});

describe("propagateLinearCombination", () => {
  it("3-4-5: [1,1] coefficients on [3,4] sigmas → 5", () => {
    assert.strictEqual(propagateLinearCombination([1, 1], [3, 4]), 5);
  });
  it("scaled: [2,1] on [1,2] → √(4·1 + 1·4) = √8", () => {
    assert.ok(approx(propagateLinearCombination([2, 1], [1, 2]), Math.sqrt(8)));
  });
  it("3 ones: [1,1,1] on [1,1,1] → √3", () => {
    assert.ok(approx(propagateLinearCombination([1, 1, 1], [1, 1, 1]), Math.sqrt(3)));
  });
  it("single: [1] on [5] → 5", () => {
    assert.strictEqual(propagateLinearCombination([1], [5]), 5);
  });
  it("all-zero sigmas → 0", () => {
    assert.strictEqual(propagateLinearCombination([1, 1], [0, 0]), 0);
  });
  it("negative coefficients square correctly: [-1, 1] on [3, 4] → 5", () => {
    assert.strictEqual(propagateLinearCombination([-1, 1], [3, 4]), 5);
  });
  it("empty → null", () => {
    assert.strictEqual(propagateLinearCombination([], []), null);
  });
  it("length mismatch → null", () => {
    assert.strictEqual(propagateLinearCombination([1], [3, 4]), null);
  });
  it("negative sigma → null", () => {
    assert.strictEqual(propagateLinearCombination([1, 1], [3, -1]), null);
  });
  it("non-finite coefficient → null", () => {
    assert.strictEqual(propagateLinearCombination([Number.NaN, 1], [3, 4]), null);
  });
  it("non-array → null", () => {
    assert.strictEqual(propagateLinearCombination("nope", [3]), null);
  });
  it("too-many links (65 > 64) → null", () => {
    const a = new Array(65).fill(1);
    const s = new Array(65).fill(1);
    assert.strictEqual(propagateLinearCombination(a, s), null);
  });
});

describe("tolerancestackupRSS", () => {
  it("[3, 4] → 5 (3-4-5)", () => {
    assert.strictEqual(tolerancestackupRSS([3, 4]), 5);
  });
  it("[1, 1, 1] → √3", () => {
    assert.ok(approx(tolerancestackupRSS([1, 1, 1]), Math.sqrt(3)));
  });
  it("[5] (single) → 5", () => {
    assert.strictEqual(tolerancestackupRSS([5]), 5);
  });
  it("empty → null", () => {
    assert.strictEqual(tolerancestackupRSS([]), null);
  });
  it("non-array → null", () => {
    assert.strictEqual(tolerancestackupRSS(null), null);
  });
});

describe("sigmaOfMean", () => {
  it("σ=10, n=4 → σ_mean = 10/2 = 5", () => {
    assert.strictEqual(sigmaOfMean(10, 4), 5);
  });
  it("σ=2, n=1 → σ_mean = 2 (no averaging)", () => {
    assert.strictEqual(sigmaOfMean(2, 1), 2);
  });
  it("σ=10, n=100 → σ_mean = 1", () => {
    assert.strictEqual(sigmaOfMean(10, 100), 1);
  });
  it("n=0 → null", () => {
    assert.strictEqual(sigmaOfMean(2, 0), null);
  });
  it("negative n → null", () => {
    assert.strictEqual(sigmaOfMean(2, -1), null);
  });
  it("non-integer n → null", () => {
    assert.strictEqual(sigmaOfMean(2, 2.5), null);
  });
  it("negative σ → null", () => {
    assert.strictEqual(sigmaOfMean(-1, 4), null);
  });
});

describe("sigmaOfDifference", () => {
  it("σ1=3 σ2=4 → 5 (3-4-5)", () => {
    assert.strictEqual(sigmaOfDifference(3, 4), 5);
  });
  it("σ1=0 σ2=3 → 3 (additive identity)", () => {
    assert.strictEqual(sigmaOfDifference(0, 3), 3);
  });
  it("σ1=σ2=1 → √2", () => {
    assert.ok(approx(sigmaOfDifference(1, 1), Math.sqrt(2)));
  });
  it("negative σ → null", () => {
    assert.strictEqual(sigmaOfDifference(-1, 3), null);
  });
});

describe("expandedUncertainty", () => {
  it("σ=0.001 k=2 → U=0.002", () => {
    assert.ok(approx(expandedUncertainty(0.001, 2), 0.002));
  });
  it("σ=1 k=3 → U=3", () => {
    assert.strictEqual(expandedUncertainty(1, 3), 3);
  });
  it("default k=DEFAULT_COVERAGE_FACTOR=2 when omitted", () => {
    assert.strictEqual(expandedUncertainty(1, undefined), 2);
  });
  it("k=0 → null", () => {
    assert.strictEqual(expandedUncertainty(1, 0), null);
  });
  it("negative σ → null", () => {
    assert.strictEqual(expandedUncertainty(-1, 2), null);
  });
});

describe("propagateWCSOriginChain", () => {
  it("3-link X chain RSS = √(0.001² + 0.002² + 0.001²)", () => {
    const r = propagateWCSOriginChain({
      x: [
        { name: "probe-stylus", sigma: 0.001 },
        { name: "repeatability", sigma: 0.002 },
        { name: "fixture", sigma: 0.001 },
      ],
      y: [{ name: "y-axis", sigma: 0.001 }],
      z: [{ name: "z-axis", sigma: 0.001 }],
    });
    assert.ok(approx(r.x, Math.sqrt(0.001 ** 2 + 0.002 ** 2 + 0.001 ** 2)));
    assert.strictEqual(r.y, 0.001);
    assert.strictEqual(r.z, 0.001);
  });
  it("single-link per axis", () => {
    const r = propagateWCSOriginChain({
      x: [{ name: "a", sigma: 3 }],
      y: [{ name: "b", sigma: 4 }],
      z: [{ name: "c", sigma: 0 }],
    });
    assert.strictEqual(r.x, 3);
    assert.strictEqual(r.y, 4);
    assert.strictEqual(r.z, 0);
  });
  it("returns null on null chains", () => {
    assert.strictEqual(propagateWCSOriginChain(null), null);
  });
  it("returns null on missing axis", () => {
    assert.strictEqual(propagateWCSOriginChain({
      x: [{ name: "a", sigma: 1 }],
      y: [{ name: "b", sigma: 1 }],
    }), null);
  });
  it("returns null on empty axis link array", () => {
    assert.strictEqual(propagateWCSOriginChain({
      x: [],
      y: [{ name: "b", sigma: 1 }],
      z: [{ name: "c", sigma: 1 }],
    }), null);
  });
  it("returns null on negative sigma", () => {
    assert.strictEqual(propagateWCSOriginChain({
      x: [{ name: "a", sigma: -1 }],
      y: [{ name: "b", sigma: 1 }],
      z: [{ name: "c", sigma: 1 }],
    }), null);
  });
  it("returns null on missing link name", () => {
    assert.strictEqual(propagateWCSOriginChain({
      x: [{ sigma: 1 }],
      y: [{ name: "b", sigma: 1 }],
      z: [{ name: "c", sigma: 1 }],
    }), null);
  });
});

describe("formatValueWithUncertainty", () => {
  it("X100.0234 ± k=2·σ=0.00175 → 'X100.0234 +/- 0.0035 (k=2)'", () => {
    assert.strictEqual(
      formatValueWithUncertainty(100.0234, 0.00175, "X"),
      "X100.0234 +/- 0.0035 (k=2)",
    );
  });
  it("custom k=3 → 'X1.0000 +/- 3.0000 (k=3)'", () => {
    assert.strictEqual(
      formatValueWithUncertainty(1, 1, "X", { coverageFactor: 3 }),
      "X1.0000 +/- 3.0000 (k=3)",
    );
  });
  it("decimalPlaces=2 → rounds value + U", () => {
    assert.strictEqual(
      formatValueWithUncertainty(100.0234, 0.0175, "X", { decimalPlaces: 2 }),
      "X100.02 +/- 0.04 (k=2)",
    );
  });
  it("Y label", () => {
    assert.strictEqual(
      formatValueWithUncertainty(50.05, 0.005, "Y"),
      "Y50.0500 +/- 0.0100 (k=2)",
    );
  });
  it("negative value renders sign", () => {
    assert.strictEqual(
      formatValueWithUncertainty(-25.01, 0.001, "Z"),
      "Z-25.0100 +/- 0.0020 (k=2)",
    );
  });
  it("returns null on non-finite value", () => {
    assert.strictEqual(formatValueWithUncertainty(Number.NaN, 0.001, "X"), null);
  });
  it("returns null on negative σ", () => {
    assert.strictEqual(formatValueWithUncertainty(1, -0.001, "X"), null);
  });
  it("returns null on empty label", () => {
    assert.strictEqual(formatValueWithUncertainty(1, 0.001, ""), null);
  });
});

describe("buildWCSProbeUncertaintyComment", () => {
  const wcs = { x: 100, y: 50, z: -25 };
  const sigmas = { x: 0.001, y: 0.002, z: 0.003 };

  it("heidenhain — parens preserved on (k=2)", () => {
    const c = buildWCSProbeUncertaintyComment({ wcs, sigmas, dialect: "heidenhain" });
    assert.strictEqual(
      c,
      "; WCS-PROBE  X100.0000 +/- 0.0020 (k=2)  Y50.0000 +/- 0.0040 (k=2)  Z-25.0000 +/- 0.0060 (k=2)",
    );
  });
  it("fanuc — parens STRIPPED from '(k=2)' → 'k=2'", () => {
    const c = buildWCSProbeUncertaintyComment({ wcs, sigmas, dialect: "fanuc" });
    assert.strictEqual(
      c,
      "( WCS-PROBE  X100.0000 +/- 0.0020 k=2  Y50.0000 +/- 0.0040 k=2  Z-25.0000 +/- 0.0060 k=2 )",
    );
  });
  it("siemens preserves parens", () => {
    const c = buildWCSProbeUncertaintyComment({ wcs, sigmas, dialect: "siemens" });
    assert.ok(c.includes("(k=2)"));
  });
  it("returns null on bad dialect", () => {
    assert.strictEqual(buildWCSProbeUncertaintyComment({ wcs, sigmas, dialect: "x" }), null);
  });
  it("returns null on negative σ", () => {
    assert.strictEqual(buildWCSProbeUncertaintyComment({
      wcs, sigmas: { x: -0.001, y: 0.002, z: 0.003 }, dialect: "heidenhain",
    }), null);
  });
  it("returns null on non-finite wcs.x", () => {
    assert.strictEqual(buildWCSProbeUncertaintyComment({
      wcs: { x: Number.NaN, y: 50, z: -25 }, sigmas, dialect: "heidenhain",
    }), null);
  });
});

describe("emitCMMUncertainty", () => {
  const chains = {
    x: [{ name: "probe-stylus", sigma: 0.001 }, { name: "repeatability", sigma: 0.002 }],
    y: [{ name: "probe-stylus", sigma: 0.001 }, { name: "repeatability", sigma: 0.002 }],
    z: [{ name: "probe-stylus", sigma: 0.001 }, { name: "repeatability", sigma: 0.002 }],
  };
  const wcs = { x: 100, y: 50, z: -25 };

  it("heidenhain: 2-line emit (header + WCS-PROBE)", () => {
    const r = emitCMMUncertainty({ wcs, chains, dialect: "heidenhain" });
    assert.strictEqual(r.lines.length, 2);
    assert.strictEqual(
      r.lines[0],
      "; CMM-UNCERTAINTY chain-links X=2 Y=2 Z=2 k=2",
    );
    assert.ok(r.lines[1].startsWith("; WCS-PROBE"));
  });
  it("propagated σ per axis = √(0.001² + 0.002²) ≈ 0.002236", () => {
    const r = emitCMMUncertainty({ wcs, chains, dialect: "heidenhain" });
    const expected = Math.sqrt(0.001 ** 2 + 0.002 ** 2);
    assert.ok(approx(r.sigmas.x, expected));
    assert.ok(approx(r.sigmas.y, expected));
    assert.ok(approx(r.sigmas.z, expected));
  });
  it("summary carries dialect + schemaVersion + link counts", () => {
    const r = emitCMMUncertainty({ wcs, chains, dialect: "fanuc" });
    assert.strictEqual(r.summary.dialect, "fanuc");
    assert.strictEqual(r.summary.schemaVersion, 1);
    assert.strictEqual(r.summary.linkCountX, 2);
    assert.strictEqual(r.summary.linkCountY, 2);
    assert.strictEqual(r.summary.linkCountZ, 2);
    assert.strictEqual(r.summary.coverageFactor, 2);
  });
  it("custom coverageFactor=3 propagates to header + summary", () => {
    const r = emitCMMUncertainty({
      wcs, chains, dialect: "heidenhain", options: { coverageFactor: 3 },
    });
    assert.ok(r.lines[0].includes("k=3"));
    assert.strictEqual(r.summary.coverageFactor, 3);
  });
  it("returns null on null req", () => {
    assert.strictEqual(emitCMMUncertainty(null), null);
  });
  it("returns null on bad dialect", () => {
    assert.strictEqual(emitCMMUncertainty({ wcs, chains, dialect: "x" }), null);
  });
  it("returns null on bad chains (negative σ)", () => {
    assert.strictEqual(emitCMMUncertainty({
      wcs,
      chains: { x: [{ name: "a", sigma: -1 }], y: chains.y, z: chains.z },
      dialect: "fanuc",
    }), null);
  });
  it("returns null on bad wcs", () => {
    assert.strictEqual(emitCMMUncertainty({
      wcs: { x: Number.NaN, y: 50, z: -25 },
      chains, dialect: "fanuc",
    }), null);
  });
});

describe("regression: schema + dialect invariants", () => {
  const chains = {
    x: [{ name: "a", sigma: 0.001 }],
    y: [{ name: "b", sigma: 0.001 }],
    z: [{ name: "c", sigma: 0.001 }],
  };
  const wcs = { x: 1, y: 1, z: 1 };

  it("every dialect produces non-null emit", () => {
    for (const dialect of SUPPORTED_DIALECTS) {
      const r = emitCMMUncertainty({ wcs, chains, dialect });
      assert.ok(r != null, `dialect=${dialect} returned null`);
      assert.strictEqual(r.summary.schemaVersion, CMM_UNCERTAINTY_EMIT_SCHEMA_VERSION);
    }
  });
});
