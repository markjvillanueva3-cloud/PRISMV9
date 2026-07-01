// tests for convert-jm-milling-to-inch.mjs -- legacy lib mm->inch with feed conversion (UNITS-FIRST).
// Run: node scripts/convert-jm-milling-to-inch.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { convertJmMillingPreset, convertJmMillingTool, convertJmMillingLibrary } from "./convert-jm-milling-to-inch.mjs";

test("convertJmMillingPreset: f_n mm/rev -> in/rev, n (rpm) untouched", () => {
  const out = convertJmMillingPreset({ guid: "g", material: "steel", "tool-coolant": "flood", n: 11454, f_n: 0.0125 });
  assert.equal(out.n, 11454);
  assert.equal(out.f_n, 0.000492); // 0.0125 / 25.4
  assert.equal(out.material, "steel");
});

test("convertJmMillingPreset: REFUSES an unverified feed field (f_z/v_c/v_f)", () => {
  assert.throws(() => convertJmMillingPreset({ n: 1000, f_n: 0.1, f_z: 0.05 }), /unexpected preset field/i);
  assert.throws(() => convertJmMillingPreset({ n: 1000, v_c: 120 }), /unexpected preset field/i);
});

test("convertJmMillingPreset: preset without f_n is passed through (still a copy)", () => {
  const inp = { guid: "g", n: 5000 };
  const out = convertJmMillingPreset(inp);
  assert.deepEqual(out, inp);
  assert.notEqual(out, inp, "returns a copy, not the same ref");
});

test("convertJmMillingTool: full tool -> inches (geometry + f_n), garbage SFDM repaired", () => {
  const tool = {
    unit: "millimeters",
    type: "flat end mill",
    geometry: { DC: 5.558, SFDM: 25374.6, OAL: 93, LF: 24, "thread-profile-angle": 0, NOF: 4 },
    "start-values": { presets: [{ guid: "g", n: 11454, f_n: 0.0125 }] },
  };
  const { tool: out, sanitized, converted } = convertJmMillingTool(tool);
  assert.equal(converted, true);
  assert.equal(sanitized, true, "garbage 25374mm SFDM repaired");
  assert.equal(out.unit, "inches");
  assert.equal(out.geometry.DC, 0.218819); // 5.558/25.4 rounded to 6dp
  assert.equal(out.geometry.SFDM, 0.218819, "SFDM repaired to DC, then converted");
  assert.equal(out.geometry.OAL, 3.661417); // 93/25.4
  assert.equal(out.geometry["thread-profile-angle"], 0, "angle untouched");
  assert.equal(out.geometry.NOF, 4, "flute count untouched");
  assert.equal(out["start-values"].presets[0].f_n, 0.000492);
  assert.equal(out["start-values"].presets[0].n, 11454);
});

test("convertJmMillingTool: idempotent -- an inch tool is left unchanged", () => {
  const inch = { unit: "inches", geometry: { DC: 0.5 } };
  const r = convertJmMillingTool(inch);
  assert.equal(r.converted, false);
  assert.equal(r.tool, inch);
});

test("convertJmMillingLibrary: counts conversions + sanitizations across the library", () => {
  const lib = {
    version: 2,
    data: [
      { unit: "millimeters", geometry: { DC: 12.7, OAL: 76 }, "start-values": { presets: [{ n: 1, f_n: 0.254 }] } },
      { unit: "millimeters", geometry: { DC: 6, OAL: 140000 } }, // garbage OAL
      { unit: "inches", geometry: { DC: 0.5 } }, // already inches -> skipped
    ],
  };
  const r = convertJmMillingLibrary(lib);
  assert.equal(r.total, 3);
  assert.equal(r.convertedCount, 2);
  assert.equal(r.sanitizedCount, 1);
  assert.equal(r.library.data[0].unit, "inches");
  assert.equal(r.library.data[0].geometry.DC, 0.5);
  assert.equal(r.library.data[0]["start-values"].presets[0].f_n, 0.01); // 0.254/25.4
  assert.equal("OAL" in r.library.data[1].geometry, false, "garbage OAL deleted");
  assert.equal(r.library.data[2].unit, "inches");
});
