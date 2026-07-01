// scripts/lib/determining-inputs.test.mjs
// U-OUTCOME-INPUT-SHARED: shared determining-input extractor for producer wire engines.
// Run: node scripts/lib/determining-inputs.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scalarToStr, determiningInputs, enrichContext } from "./determining-inputs.mjs";

describe("scalarToStr", () => {
  it("trims non-empty strings; rejects empty/whitespace", () => {
    assert.equal(scalarToStr("  4140 steel "), "4140 steel");
    assert.equal(scalarToStr("   "), null);
    assert.equal(scalarToStr(""), null);
  });
  it("coerces finite numbers + booleans; rejects NaN/Infinity/objects", () => {
    assert.equal(scalarToStr(12), "12");
    assert.equal(scalarToStr(true), "true");
    assert.equal(scalarToStr(NaN), null);
    assert.equal(scalarToStr(Infinity), null);
    assert.equal(scalarToStr({ a: 1 }), null);
  });
});

describe("determiningInputs", () => {
  it("happy: a real SFC caller params object -> material/tool/operation", () => {
    const got = determiningInputs({ material: "4140 steel", tool: "CNMG432", operation: "turning", machine_id: "haas-vf-2" });
    assert.equal(got.material, "4140 steel");
    assert.equal(got.tool_id, "CNMG432");
    assert.equal(got.operation, "turning");
    assert.equal(got.machine_id, "haas-vf-2");
  });
  it("normalizes spelling variants + numeric diameter", () => {
    const got = determiningInputs({ materialName: "Inconel 718", toolDiameter: 6, cut_type: "roughing", iso_group: "S" });
    assert.equal(got.material, "Inconel 718");
    assert.equal(got.operation, "roughing");
    assert.equal(got.tool_diameter_mm, "6");
    assert.equal(got.iso, "S");
  });
  it("reads inputs nested under a wrapper key", () => {
    assert.equal(determiningInputs({ action: "x", params: { material: "D2" } }).material, "D2");
  });
  it("failure: no inputs -> {} ; adversarial null/array -> {} (never throws)", () => {
    assert.deepEqual(determiningInputs({ action: "speed_feed_recommend" }), {});
    assert.doesNotThrow(() => {
      assert.deepEqual(determiningInputs(null), {});
      assert.deepEqual(determiningInputs([{ material: "x" }]), {});
      assert.deepEqual(determiningInputs(42), {});
    });
  });
  it("adversarial: non-scalar values are not surfaced", () => {
    const got = determiningInputs({ material: { name: "x" }, tool: "T1" });
    assert.ok(!("material" in got));
    assert.equal(got.tool_id, "T1");
  });
});

describe("enrichContext (the wire-engine call-site convenience)", () => {
  it("fills MISSING inputs but never overrides an explicit caller context field", () => {
    const ctx = enrichContext({ machine_id: "okuma-genos", material: "EXPLICIT" }, { material: "INFERRED", operation: "turning" });
    assert.equal(ctx.machine_id, "okuma-genos");   // caller field preserved
    assert.equal(ctx.material, "EXPLICIT");          // explicit wins over inferred
    assert.equal(ctx.operation, "turning");          // missing field filled from params
  });
  it("closes the gap: a machine-only caller context gains material/operation", () => {
    // mirrors the speed_feed.jsonl degenerate case (context:{machine_id} only)
    const ctx = enrichContext({ machine_id: "haas-vf-2" }, { material: "1045", operation: "facing", tool: "WNMG" });
    assert.equal(ctx.material, "1045");
    assert.equal(ctx.operation, "facing");
    assert.equal(ctx.tool_id, "WNMG");
    assert.equal(ctx.machine_id, "haas-vf-2");
  });
  it("null/empty base context -> just the inferred inputs", () => {
    assert.deepEqual(enrichContext(null, { material: "A2" }), { material: "A2" });
    assert.deepEqual(enrichContext(undefined, {}), {});
  });
});
