// Tests for the Fusion live-enum ingest (slot:kilo). node:test, concrete-value
// assertions only. The load-bearing invariant: min/max are NEVER fabricated —
// a numeric param with no API-exposed range ships WITHOUT min/max.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeFusionStrategy,
  parseUnit,
  normalizeParam,
  mergeFusionEnum,
} from "./ingest-fusion-cam-enum.mjs";

test("normalizeFusionStrategy: camelCase → snake_case (maps to catalog op ids)", () => {
  assert.equal(normalizeFusionStrategy("turningProfileFinishing"), "turning_profile_finishing");
  assert.equal(normalizeFusionStrategy("adaptive"), "adaptive");
  assert.equal(normalizeFusionStrategy("scallop_new"), "scallop_new");
  assert.equal(normalizeFusionStrategy("Multi-Axis Contour"), "multi_axis_contour");
});

test("normalizeFusionStrategy: invalid input → stable sentinel, never throws", () => {
  assert.equal(normalizeFusionStrategy(null), "unknown_operation");
  assert.equal(normalizeFusionStrategy(""), "unknown_operation");
  assert.equal(normalizeFusionStrategy(42), "unknown_operation");
});

test("parseUnit: extracts trailing unit token from a Fusion expression", () => {
  assert.equal(parseUnit("0.1 mm"), "mm");
  assert.equal(parseUnit("15 deg"), "deg");
  assert.equal(parseUnit("50 %"), "%");
  assert.equal(parseUnit("2.5mm"), "mm");
  assert.equal(parseUnit("5"), undefined); // bare number → no unit
  assert.equal(parseUnit(undefined), undefined);
});

test("normalizeParam: float param → type/default/unit grounded, NO fabricated range", () => {
  const p = normalizeParam(
    { name: "tolerance", title: "Tolerance", valueType: "FloatCAMParameterValue", value: 0.1, expression: "0.1 mm" },
    "Fusion 360 2.0.19828 live-enum"
  );
  assert.equal(p.id, "tolerance");
  assert.equal(p.type, "float");
  assert.equal(p.default, 0.1);
  assert.equal(p.unit, "mm");
  assert.equal(p.source, "Fusion 360 2.0.19828 live-enum");
  // THE grounding guarantee: no invented bounds.
  assert.equal(p.min, undefined);
  assert.equal(p.max, undefined);
  assert.equal(p.rangeSource, "not-exposed-by-fusion-api");
});

test("normalizeParam: choice param → enum captured, type=enum", () => {
  const p = normalizeParam(
    { name: "tool_orientation", title: "Tool Orientation", valueType: "ChoiceCAMParameterValue", value: "Z+", enumValues: ["Z+", "Z-", "X+"] },
    "src"
  );
  assert.equal(p.type, "enum");
  assert.deepEqual(p.enumValues, ["Z+", "Z-", "X+"]);
  assert.equal(p.rangeSource, undefined); // enums are not numeric ranges
});

test("normalizeParam: inaccessible value → unverified:true with note (R12 honest)", () => {
  const p = normalizeParam(
    { name: "computed_feed", title: "Feed", valueType: "FloatCAMParameterValue", error: "value object inaccessible" },
    "src"
  );
  assert.equal(p.unverified, true);
  assert.equal(p.note, "value object inaccessible");
  assert.equal(Object.prototype.hasOwnProperty.call(p, "default"), false);
});

test("normalizeParam: missing name → null (un-keyable, dropped)", () => {
  assert.equal(normalizeParam({ title: "x", valueType: "FloatCAMParameterValue" }, "s"), null);
});

test("mergeFusionEnum: dedups across dumps; later grounded value upgrades unverified", () => {
  const dumpA = {
    source: "Fusion 360 2.0 live-enum",
    operations: [
      { strategy: "adaptive", operationName: "Adaptive1", parameters: [
        { name: "stepover", title: "Stepover", valueType: "FloatCAMParameterValue", value: 4, expression: "4 mm" },
        { name: "feed", title: "Feed", valueType: "FloatCAMParameterValue", error: "value object inaccessible" },
      ] },
    ],
  };
  const dumpB = {
    source: "Fusion 360 2.0 live-enum",
    operations: [
      { strategy: "adaptive", operationName: "Adaptive2", parameters: [
        { name: "stepover", title: "Stepover", valueType: "FloatCAMParameterValue", value: 4, expression: "4 mm" }, // dup
        { name: "feed", title: "Feed", valueType: "FloatCAMParameterValue", value: 1200, expression: "1200 mm/min" }, // grounds the prior gap
        { name: "tolerance", title: "Tolerance", valueType: "FloatCAMParameterValue", value: 0.01, expression: "0.01 mm" }, // new
      ] },
    ],
  };
  const { operations, stats } = mergeFusionEnum([dumpA, dumpB]);
  assert.equal(operations.length, 1);
  const op = operations[0];
  assert.equal(op.id, "adaptive");
  assert.deepEqual(op.operationNames.sort(), ["Adaptive1", "Adaptive2"]);
  // stepover deduped to 1; feed upgraded to grounded; tolerance added → 3 params
  assert.equal(op.parameters.length, 3);
  const feed = op.parameters.find((p) => p.id === "feed");
  assert.equal(feed.default, 1200); // upgraded from unverified
  assert.equal(feed.unverified, undefined);
  assert.equal(stats.operations, 1);
  assert.equal(stats.params, 3);
  assert.equal(stats.unverified, 0);
  assert.equal(stats.dumps, 2);
});

test("mergeFusionEnum: operations with an error are skipped; empty input → empty", () => {
  const { operations, stats } = mergeFusionEnum([
    { source: "s", operations: [{ error: "operation extract failed" }] },
  ]);
  assert.equal(operations.length, 0);
  assert.equal(stats.params, 0);
  assert.deepEqual(mergeFusionEnum([]).operations, []);
});

test("mergeFusionEnum: NO param anywhere carries a fabricated min/max", () => {
  const { operations } = mergeFusionEnum([
    { source: "s", operations: [
      { strategy: "scallop", parameters: [
        { name: "stepdown", valueType: "FloatCAMParameterValue", value: 0.5, expression: "0.5 mm" },
        { name: "count", valueType: "IntegerCAMParameterValue", value: 3 },
      ] },
    ] },
  ]);
  for (const op of operations) {
    for (const p of op.parameters) {
      assert.equal(p.min, undefined, `${p.id} must not have a fabricated min`);
      assert.equal(p.max, undefined, `${p.id} must not have a fabricated max`);
    }
  }
});
