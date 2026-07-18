// tests for convert-fusion-tools-to-inch.mjs -- general mm->inch Fusion .tools converter (UNITS-FIRST).
// Run: node scripts/convert-fusion-tools-to-inch.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { convertFusionToolToInch, convertFusionLibraryToInch } from "./convert-fusion-tools-to-inch.mjs";

const upsetTool = () => ({
  unit: "millimeters",
  type: "face mill",
  geometry: { DC: 50, LCF: 6, LB: 40, NOF: 4, OAL: 90, RE: 0.8, SFDM: 50, TP: 0, HAND: true },
  "start-values": { presets: [{ name: "H13 rough", "tool-coolant": "flood", n: 800, v_c: 125.7, f_z: 0.254, v_f: 254 }] },
});

test("convertFusionToolToInch: full UPSET tool -> inches (geometry LB + feeds v_c/f_z)", () => {
  const { tool, converted } = convertFusionToolToInch(upsetTool());
  assert.equal(converted, true);
  assert.equal(tool.unit, "inches");
  assert.equal(tool.geometry.DC, 1.968504); // 50/25.4
  assert.equal(tool.geometry.LB, 1.574803); // 40/25.4 (body length)
  assert.equal(tool.geometry.HAND, true);
  assert.equal(tool.geometry.TP, 0);
  const p = tool["start-values"].presets[0];
  assert.equal(p.n, 800, "rpm unchanged");
  assert.equal(p.f_z, 0.01, "feed/tooth 0.254mm -> 0.01in");
  assert.ok(Math.abs(p.v_c - 412.4) < 0.1, "v_c m/min -> SFM (x3.28)");
});

test("convertFusionToolToInch: REFUSES a tool with an unclassified geometry key (no silent mis-scale)", () => {
  assert.throws(
    () => convertFusionToolToInch({ unit: "millimeters", geometry: { DC: 10, MYSTERY_DIM: 5 } }),
    /unclassified geometry key/i,
  );
});

test("convertFusionToolToInch: REFUSES a tool with an unverified feed field", () => {
  const t = { unit: "millimeters", geometry: { DC: 10 }, "start-values": { presets: [{ n: 1, mystery_feed: 9 }] } };
  assert.throws(() => convertFusionToolToInch(t), /unverified preset field/i);
});

test("convertFusionToolToInch: idempotent -- an inch tool is returned unchanged", () => {
  const inch = { unit: "inches", geometry: { DC: 0.5 } };
  const r = convertFusionToolToInch(inch);
  assert.equal(r.converted, false);
  assert.equal(r.tool, inch);
});

test("convertFusionLibraryToInch: converts every mm tool, counts, leaves inch tools", () => {
  const lib = { version: 2, data: [upsetTool(), { unit: "inches", geometry: { DC: 0.25 } }] };
  const r = convertFusionLibraryToInch(lib);
  assert.equal(r.total, 2);
  assert.equal(r.convertedCount, 1);
  assert.equal(r.library.data[0].unit, "inches");
  assert.equal(r.library.data[1].unit, "inches");
});

test("convertFusionLibraryToInch: a sanitizable garbage OAL is dropped + counted", () => {
  const lib = { version: 2, data: [{ unit: "millimeters", geometry: { DC: 6, OAL: 140000, LF: 24 } }] };
  const r = convertFusionLibraryToInch(lib);
  assert.equal(r.sanitizedCount, 1);
  assert.equal("OAL" in r.library.data[0].geometry, false, "garbage OAL dropped before convert");
  assert.equal(r.library.data[0].geometry.LF, 0.944882); // 24/25.4
});
