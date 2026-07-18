/**
 * Tests for cimco-tmlib.mjs — PRISM tool → CIMCO Edit 2026 .tmlib emitter.
 * CIMCO-TOOLDB-FILL-MS0 / U-CTF-LIB (slot:romeo, 2026-06-02).
 *
 * Coverage: 6 cutter/holder types (variability) · happy path · the 25.4× inch
 * conversion (units-guard class) · the real CIMCO ThreadPitch value · ≥3 failure
 * modes (no diameter / NaN / Infinity / 0 / negative) · ≥2 adversarial (XML-escape,
 * empty) · round-trip parse · param ORDER lock · and a guarded check against the
 * REAL installed .tmlib bytes.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  MM_PER_INCH,
  THREAD_PITCH_FACTOR,
  classifyCutterType,
  normalizeTool,
  toolToCutter,
  cutterToXml,
  holderToXml,
  buildLibraryXml,
  toolsToLibraryXml,
  parseLibraryXml,
} from "../cimco-tmlib.mjs";

const GUID = () => "00000000-0000-4000-8000-000000000000";

// ── classification (variability across all mapped types) ──────────────────────
test("classifyCutterType maps PRISM types → CIMCO cutter types", () => {
  assert.equal(classifyCutterType("endmill"), "EndMill");
  assert.equal(classifyCutterType("Flat Endmill"), "EndMill");
  assert.equal(classifyCutterType("face mill"), "EndMill");
  assert.equal(classifyCutterType("thread mill"), "EndMill");
  assert.equal(classifyCutterType("carbide drill"), "CommonDrill");
  assert.equal(classifyCutterType("reamer"), "CommonDrill");
  assert.equal(classifyCutterType("spot drill"), "SpotDrill");
  assert.equal(classifyCutterType("center drill"), "SpotDrill");
  assert.equal(classifyCutterType("countersink"), "Countersink");
  assert.equal(classifyCutterType("1/4-20 tap"), "TapRightHand");
  assert.equal(classifyCutterType({ type: "drill" }), "CommonDrill");
  assert.equal(classifyCutterType({ category: "Endmill" }), "EndMill");
});

test("classifyCutterType returns null for unmapped/empty", () => {
  assert.equal(classifyCutterType(""), null);
  assert.equal(classifyCutterType("widget"), null);
  assert.equal(classifyCutterType(null), null);
  assert.equal(classifyCutterType({}), null);
});

// ── normalization + failure modes ─────────────────────────────────────────────
test("normalizeTool collapses aliases to mm geometry", () => {
  const n = normalizeTool({
    name: "X",
    geometry: { diameter: 12.7, shank_diameter: 10, flute_length: 38.1, overall_length: 101.6, corner_radius: 1.5, flutes: 4 },
  });
  assert.equal(n.diameter_mm, 12.7);
  assert.equal(n.shankDia_mm, 10);
  assert.equal(n.fluteLen_mm, 38.1);
  assert.equal(n.oal_mm, 101.6);
  assert.equal(n.cornerRadius_mm, 1.5);
});

test("normalizeTool honours flat aliases (cutting_diameter_mm / flute_count)", () => {
  const n = normalizeTool({ cutting_diameter_mm: 6.35, flute_count: 2, name: "Y" });
  assert.equal(n.diameter_mm, 6.35);
  assert.equal(n.flutes, 2);
});

test("normalizeTool rejects unusable diameters (failure modes)", () => {
  assert.equal(normalizeTool({ name: "no-dia" }), null);
  assert.equal(normalizeTool({ geometry: { diameter: NaN } }), null);
  assert.equal(normalizeTool({ geometry: { diameter: Infinity } }), null);
  assert.equal(normalizeTool({ geometry: { diameter: 0 } }), null);
  assert.equal(normalizeTool({ geometry: { diameter: -3 } }), null);
  assert.equal(normalizeTool(null), null);
  assert.equal(normalizeTool("nope"), null);
});

test("normalizeTool fills diameter-proportional defaults with body > flute", () => {
  const n = normalizeTool({ geometry: { diameter: 10 } });
  assert.equal(n.fluteLen_mm, 30); // 3×D
  assert.equal(n.oal_mm, 70); // flute + 4×D
  assert.ok(n.oal_mm > n.fluteLen_mm);
});

// ── EndMill happy path (Metric) ───────────────────────────────────────────────
test("toolToCutter EndMill (Metric) emits exact params", () => {
  const c = toolToCutter(
    { type: "endmill", name: "1/2 EM", geometry: { diameter: 12.7, shank_diameter: 12.7, flute_length: 38.1, overall_length: 101.6, corner_radius: 0 } },
    { unitSystem: "Metric", itemNumber: 7, guidFn: GUID }
  );
  assert.equal(c.cutterType, "EndMill");
  assert.equal(c.params.ItemUnitSystem, "Metric");
  assert.equal(c.params.ItemNumber, "7");
  assert.equal(c.params.Description, "1/2 EM");
  assert.equal(c.params.ItemGuid, GUID());
  assert.equal(c.params.FluteDiameter, "12.7");
  assert.equal(c.params.ShaftDiameter, "12.7");
  assert.equal(c.params.BodyLength, "101.6");
  assert.equal(c.params.FluteLength, "38.1");
  assert.equal(c.params.ShoulderLength, "63.5"); // 101.6 − 38.1
  assert.equal(c.params.EndMillCornerType, "Flat");
  assert.equal(c.params.CornerRadius, "0");
  assert.equal(c.params.Material, "Unspecified");
  assert.equal(c.params.Coolant, "Disabled");
});

// ── THE 25.4× UNITS CHECK (Imperial conversion) ───────────────────────────────
test("toolToCutter EndMill (Imperial) divides mm by 25.4 — units-guard class", () => {
  const c = toolToCutter(
    { type: "endmill", name: "1/2 EM", geometry: { diameter: 12.7, shank_diameter: 12.7, flute_length: 38.1, overall_length: 101.6 } },
    { unitSystem: "Imperial", guidFn: GUID }
  );
  assert.equal(c.params.ItemUnitSystem, "Imperial");
  assert.equal(c.params.FluteDiameter, "0.5"); // 12.7 / 25.4
  assert.equal(c.params.BodyLength, "4"); // 101.6 / 25.4
  assert.equal(c.params.FluteLength, "1.5"); // 38.1 / 25.4
  assert.equal(c.params.ShoulderLength, "2.5"); // 63.5 / 25.4
});

// ── Drill / SpotDrill / Countersink ───────────────────────────────────────────
test("toolToCutter CommonDrill uses point_angle, defaults 140", () => {
  const c = toolToCutter({ type: "drill", geometry: { diameter: 6.35, point_angle: 118 } }, { unitSystem: "Metric", guidFn: GUID });
  assert.equal(c.cutterType, "CommonDrill");
  assert.equal(c.params.TipAngle, "118");
  assert.equal(c.params.FluteDiameter, "6.35");
  const d = toolToCutter({ type: "drill", geometry: { diameter: 6.35 } }, { unitSystem: "Metric", guidFn: GUID });
  assert.equal(d.params.TipAngle, "140");
});

test("toolToCutter SpotDrill defaults TipAngle 90 + carries TipDiameter", () => {
  const c = toolToCutter({ type: "spot drill", geometry: { diameter: 6.35 } }, { unitSystem: "Metric", guidFn: GUID });
  assert.equal(c.cutterType, "SpotDrill");
  assert.equal(c.params.TipAngle, "90");
  assert.equal(c.params.TipDiameter, "0");
});

test("toolToCutter Countersink uses point_angle and omits TaperLength", () => {
  const c = toolToCutter({ type: "countersink", geometry: { diameter: 6.35, point_angle: 82 } }, { unitSystem: "Metric", guidFn: GUID });
  assert.equal(c.cutterType, "Countersink");
  assert.equal(c.params.TipAngle, "82");
  assert.equal("TaperLength" in c.params, false);
});

// ── Tap ThreadPitch — verified against real Inch Taps.tmlib bytes ──────────────
test("toolToCutter Tap computes CIMCO ThreadPitch (645.16/TPI)", () => {
  assert.equal(THREAD_PITCH_FACTOR, MM_PER_INCH * MM_PER_INCH);
  const t20 = toolToCutter({ type: "tap", name: "1/4-20 TAP", tpi: 20, geometry: { diameter: 6.35 } }, { unitSystem: "Imperial", guidFn: GUID });
  assert.equal(t20.cutterType, "TapRightHand");
  assert.equal(t20.params.ThreadPitch, "32.258"); // real value for 1/4-20
  const t28 = toolToCutter({ type: "tap", tpi: 28, geometry: { diameter: 6.35 } }, { unitSystem: "Imperial", guidFn: GUID });
  assert.equal(t28.params.ThreadPitch, "23.041429"); // 645.16/28
  const metric = toolToCutter({ type: "tap", pitch_mm: 1.0, geometry: { diameter: 6 } }, { unitSystem: "Metric", guidFn: GUID });
  assert.equal(metric.params.ThreadPitch, "25.4"); // 1.0mm × 25.4
});

// ── XML emission: param ORDER lock + ItemId empty form ────────────────────────
test("cutterToXml emits canonical param order with empty ItemId", () => {
  const c = toolToCutter({ type: "endmill", name: "EM", geometry: { diameter: 10 } }, { unitSystem: "Metric", guidFn: GUID });
  const xml = cutterToXml(c.cutterType, c.params);
  assert.match(xml, /<Cutter Type="EndMill">/);
  assert.match(xml, /<Parameter Type="ItemId">\n {4}<\/Parameter>/);
  const idx = (s) => xml.indexOf(`<Parameter Type="${s}">`);
  assert.ok(idx("ItemNumber") < idx("Description"));
  assert.ok(idx("Description") < idx("ItemGuid"));
  assert.ok(idx("FluteDiameter") < idx("ShaftDiameter"));
  assert.ok(idx("ShaftDiameter") < idx("BodyLength"));
  assert.ok(idx("BodyLength") < idx("FluteLength"));
  assert.ok(idx("CornerRadius") < idx("EndMillCornerType"));
});

// ── round-trip: build → parse ─────────────────────────────────────────────────
test("toolsToLibraryXml + parseLibraryXml round-trips mixed tools", () => {
  const tools = [
    { type: "endmill", name: "EM1", geometry: { diameter: 12.7 } },
    { type: "drill", name: "DR1", geometry: { diameter: 6.35, point_angle: 135 } },
    { type: "tap", name: "TAP1", tpi: 20, geometry: { diameter: 6.35 } },
  ];
  const { xml, count, skipped, byType } = toolsToLibraryXml(tools, { unitSystem: "Metric", guidFn: GUID });
  assert.equal(count, 3);
  assert.equal(skipped, 0);
  assert.deepEqual(byType, { EndMill: 1, CommonDrill: 1, TapRightHand: 1 });

  const parsed = parseLibraryXml(xml);
  assert.equal(parsed.version, "4");
  assert.equal(parsed.cutters.length, 3);
  assert.deepEqual(parsed.cutters.map((c) => c.type), ["EndMill", "CommonDrill", "TapRightHand"]);
  assert.equal(parsed.cutters[0].params.FluteDiameter, "12.7");
  assert.equal(parsed.cutters[1].params.TipAngle, "135");
  assert.equal(parsed.cutters[2].params.ThreadPitch, "32.258");
  // sequential ItemNumber
  assert.deepEqual(parsed.cutters.map((c) => c.params.ItemNumber), ["1", "2", "3"]);
});

// ── adversarial: XML escaping round-trips ─────────────────────────────────────
test("XML-special characters in Description escape and round-trip", () => {
  const name = 'A&B <"x"> \'q\'';
  const { xml } = toolsToLibraryXml([{ type: "endmill", name, geometry: { diameter: 8 } }], { unitSystem: "Metric", guidFn: GUID });
  assert.match(xml, /&amp;/);
  assert.match(xml, /&lt;/);
  assert.match(xml, /&quot;/);
  assert.match(xml, /&apos;/);
  const parsed = parseLibraryXml(xml);
  assert.equal(parsed.cutters[0].params.Description, name);
});

// ── adversarial/failure: bad records are skipped, never silently corrupt ───────
test("toolsToLibraryXml skips (not drops) unusable records", () => {
  const tools = [
    { type: "endmill" }, // no diameter → skip
    { type: "drill", geometry: { diameter: NaN } }, // NaN → skip
    { type: "widget", geometry: { diameter: 5 } }, // unclassified → skip
    { type: "endmill", name: "GOOD", geometry: { diameter: 6 } }, // ok
  ];
  const { count, skipped, byType } = toolsToLibraryXml(tools, { unitSystem: "Metric", guidFn: GUID });
  assert.equal(count, 1);
  assert.equal(skipped, 3);
  assert.deepEqual(byType, { EndMill: 1 });
});

test("empty tool list yields a valid empty library", () => {
  const { xml, count } = toolsToLibraryXml([], { unitSystem: "Metric" });
  assert.equal(count, 0);
  assert.equal(parseLibraryXml(xml).cutters.length, 0);
  assert.match(xml, /^<Library Version="4">/);
  assert.match(xml, /<\/Library>$/);
});

// ── holder emission + parse ───────────────────────────────────────────────────
test("holderToXml emits HolderSegments and round-trips", () => {
  const xml = holderToXml(
    { description: "BT 40", segments: [{ upper: 44.45, lower: 44.45, length: 2 }, { upper: 63, lower: 53, length: 2.887 }] },
    { unitSystem: "Metric", guidFn: GUID }
  );
  assert.match(xml, /<Holder Type="MillingHolder">/);
  assert.match(xml, /<Segment Upper="44.45" Lower="44.45" Length="2" \/>/);
  const parsed = parseLibraryXml(buildLibraryXml([xml]));
  assert.equal(parsed.holders.length, 1);
  assert.equal(parsed.holders[0].params.Description, "BT 40");
  assert.equal(parsed.holders[0].segments.length, 2);
  assert.deepEqual(parsed.holders[0].segments[0], { upper: 44.45, lower: 44.45, length: 2 });
});

// ── validation against the REAL installed CIMCO bytes (guarded) ────────────────
test("parseLibraryXml parses the REAL installed Inch Mills.tmlib (if present)", () => {
  const real = "C:/Program Files/CIMCO 2026/CIMCOEdit/ToolLibs/Predefined/Inch Mills.tmlib";
  if (!fs.existsSync(real)) {
    console.log("  (skip — CIMCO Edit 2026 not installed at default path)");
    return;
  }
  const parsed = parseLibraryXml(fs.readFileSync(real, "utf8"));
  assert.equal(parsed.version, "4");
  assert.ok(parsed.cutters.length > 0, "real lib has cutters");
  assert.equal(parsed.cutters[0].type, "EndMill");
  assert.ok("FluteDiameter" in parsed.cutters[0].params, "real EndMill has FluteDiameter");
  assert.equal(parsed.cutters[0].params.ItemUnitSystem, "Imperial");
});
