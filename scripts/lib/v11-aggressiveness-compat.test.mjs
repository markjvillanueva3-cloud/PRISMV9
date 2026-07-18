/**
 * v11-aggressiveness-compat.test.mjs — concrete-value tests for the
 * legacy v8.9 prismAggressivenessLevel → v11 per-tool resolution shim.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-V11-AGGRESSIVENESS-RENAME-SHIM
 * @slot echo · @iter 27 · @date 2026-05-26
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LEGACY_AGGR_PROP,
  DEFAULT_AGGR_LEVEL,
  AGGR_MIN,
  AGGR_MAX,
  clampLevel,
  resolveAggressiveness,
  perToolPropName,
  migrationNotice,
  resolveAllTools,
} from "./v11-aggressiveness-compat.mjs";

describe("constants", () => {
  it("LEGACY_AGGR_PROP = 'prismAggressivenessLevel'", () => {
    assert.equal(LEGACY_AGGR_PROP, "prismAggressivenessLevel");
  });
  it("DEFAULT_AGGR_LEVEL = 4 (mid-range Balanced)", () => {
    assert.equal(DEFAULT_AGGR_LEVEL, 4);
  });
  it("AGGR_MIN = 1", () => {
    assert.equal(AGGR_MIN, 1);
  });
  it("AGGR_MAX = 8", () => {
    assert.equal(AGGR_MAX, 8);
  });
});

describe("clampLevel", () => {
  it("null → null", () => {
    assert.equal(clampLevel(null), null);
  });
  it("undefined → null", () => {
    assert.equal(clampLevel(undefined), null);
  });
  it("NaN → null", () => {
    assert.equal(clampLevel(NaN), null);
  });
  it("string 'abc' → null", () => {
    assert.equal(clampLevel("abc"), null);
  });
  it("string '5' → 5", () => {
    assert.equal(clampLevel("5"), 5);
  });
  it("3 → 3", () => {
    assert.equal(clampLevel(3), 3);
  });
  it("0 → clamped up to AGGR_MIN (1)", () => {
    assert.equal(clampLevel(0), 1);
  });
  it("-2 → clamped up to AGGR_MIN (1)", () => {
    assert.equal(clampLevel(-2), 1);
  });
  it("9 → clamped down to AGGR_MAX (8)", () => {
    assert.equal(clampLevel(9), 8);
  });
  it("5.7 → floor to 5", () => {
    assert.equal(clampLevel(5.7), 5);
  });
});

describe("resolveAggressiveness: 3-tier waterfall", () => {
  it("per-tool 6 + legacy 3 → per-tool 6 wins", () => {
    assert.equal(resolveAggressiveness(3, 6).level, 6);
  });
  it("per-tool 6 + legacy 3 → source = per_tool", () => {
    assert.equal(resolveAggressiveness(3, 6).source, "per_tool");
  });
  it("per-tool null + legacy 7 → legacy 7", () => {
    assert.equal(resolveAggressiveness(7, null).level, 7);
  });
  it("per-tool null + legacy 7 → source = legacy_global", () => {
    assert.equal(resolveAggressiveness(7, null).source, "legacy_global");
  });
  it("per-tool null + legacy null → DEFAULT_AGGR_LEVEL (4)", () => {
    assert.equal(resolveAggressiveness(null, null).level, 4);
  });
  it("per-tool null + legacy null → source = default", () => {
    assert.equal(resolveAggressiveness(null, null).source, "default");
  });
  it("per-tool 99 (out of range) clamped to 8 + source = per_tool", () => {
    assert.equal(resolveAggressiveness(null, 99).level, 8);
  });
  it("per-tool 0 (out of range) clamped to 1 + source = per_tool", () => {
    assert.equal(resolveAggressiveness(null, 0).level, 1);
  });
  it("per-tool NaN treated as unset → falls to legacy", () => {
    assert.equal(resolveAggressiveness(5, NaN).source, "legacy_global");
  });
  it("legacy 'invalid' + per-tool null → default 4", () => {
    assert.equal(resolveAggressiveness("invalid", null).level, 4);
  });
});

describe("perToolPropName", () => {
  it("1 → 'prismT1Aggressiveness'", () => {
    assert.equal(perToolPropName(1), "prismT1Aggressiveness");
  });
  it("19 → 'prismT19Aggressiveness'", () => {
    assert.equal(perToolPropName(19), "prismT19Aggressiveness");
  });
  it("0 → null (invalid tool number)", () => {
    assert.equal(perToolPropName(0), null);
  });
  it("-3 → null", () => {
    assert.equal(perToolPropName(-3), null);
  });
  it("1.5 → null (non-integer)", () => {
    assert.equal(perToolPropName(1.5), null);
  });
  it("null → null", () => {
    assert.equal(perToolPropName(null), null);
  });
  it("'abc' → null", () => {
    assert.equal(perToolPropName("abc"), null);
  });
});

describe("migrationNotice", () => {
  it("legacy=7 → returns operator notice string", () => {
    assert.equal(
      migrationNotice(7),
      "(PRISM: legacy prismAggressivenessLevel=7 mapped to per-tool default; set prismT<N>Aggressiveness to override)"
    );
  });
  it("legacy null → returns null (no notice needed)", () => {
    assert.equal(migrationNotice(null), null);
  });
  it("legacy invalid 'abc' → null", () => {
    assert.equal(migrationNotice("abc"), null);
  });
  it("legacy out-of-range 99 → notice includes clamped value 8", () => {
    assert.equal(migrationNotice(99).includes("=8"), true);
  });
});

describe("resolveAllTools: bulk waterfall with prop accessor", () => {
  const props = {
    prismAggressivenessLevel: 7,
    prismT2Aggressiveness: 8,
    prismT14Aggressiveness: 3,
  };
  const getter = (name) => (Object.prototype.hasOwnProperty.call(props, name) ? props[name] : null);

  it("T2 (has per-tool override) → level 8 + source per_tool", () => {
    const result = resolveAllTools(getter, [2, 14, 19]);
    assert.equal(result[0].level, 8);
  });
  it("T14 (has per-tool override 3) → level 3", () => {
    const result = resolveAllTools(getter, [2, 14, 19]);
    assert.equal(result[1].level, 3);
  });
  it("T19 (no per-tool, has legacy global) → level 7 + source legacy_global", () => {
    const result = resolveAllTools(getter, [2, 14, 19]);
    assert.equal(result[2].source, "legacy_global");
  });
  it("T19 propName = 'prismT19Aggressiveness'", () => {
    const result = resolveAllTools(getter, [2, 14, 19]);
    assert.equal(result[2].propName, "prismT19Aggressiveness");
  });
  it("empty toolNumbers array → empty result", () => {
    assert.equal(resolveAllTools(getter, []).length, 0);
  });
  it("non-function getter → empty result", () => {
    assert.equal(resolveAllTools(null, [1, 2, 3]).length, 0);
  });
  it("getter returning null everywhere → all default 4", () => {
    const nullGetter = () => null;
    const result = resolveAllTools(nullGetter, [1, 2, 3]);
    assert.equal(result[0].level, 4);
  });
  it("getter returning null everywhere → source default", () => {
    const nullGetter = () => null;
    const result = resolveAllTools(nullGetter, [1, 2, 3]);
    assert.equal(result[2].source, "default");
  });
});
