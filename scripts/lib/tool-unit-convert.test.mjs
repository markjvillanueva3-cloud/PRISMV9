// tests for tool-unit-convert.mjs -- safety-critical mm->inch conversion (UNITS-FIRST).
// Run: node scripts/lib/tool-unit-convert.test.mjs   (node:test auto-runs on exit)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MM_PER_INCH,
  LENGTH_GEOMETRY_KEYS,
  NON_LENGTH_GEOMETRY_KEYS,
  mmToInch,
  convertToolMmToInch,
  sanitizeToolGeometryMm,
  unknownGeometryKeys,
  convertPresetMmToInch,
  FT_PER_M,
  FEED_LENGTH_KEYS,
  FEED_SURFACE_SPEED_KEYS,
  FEED_UNCHANGED_KEYS,
  UNVERIFIED_GEOMETRY_KEYS,
} from "./tool-unit-convert.mjs";

// ## mmToInch -- exact reference values (a 25.4x error here is catastrophic)
test("mmToInch: exact imperial reference values", () => {
  assert.equal(MM_PER_INCH, 25.4);
  assert.equal(mmToInch(12.7), 0.5); // 1/2"
  assert.equal(mmToInch(6.35), 0.25); // 1/4"
  assert.equal(mmToInch(25.4), 1); // 1"
  assert.equal(mmToInch(101.6), 4); // 4" drill (Allied large)
  assert.equal(mmToInch(0), 0);
});

test("mmToInch: a 12mm metric tool -> its true inch size", () => {
  assert.equal(mmToInch(12), 0.472441); // 12mm is genuinely 0.4724"
});

test("mmToInch: non-numeric / non-finite passes through unchanged (absent stays absent)", () => {
  assert.equal(mmToInch(null), null);
  assert.equal(mmToInch(undefined), undefined);
  assert.equal(mmToInch("0.5"), "0.5");
  assert.ok(Number.isNaN(mmToInch(NaN)));
  assert.equal(mmToInch(Infinity), Infinity);
});

test("mmToInch: rounding honors dp", () => {
  assert.equal(mmToInch(1, 4), 0.0394);
  assert.equal(mmToInch(1, 6), 0.039370);
});

// ## convertToolMmToInch -- field selectivity (the core safety property)
const brandTool = () => ({
  BMC: "carbide",
  HAND: "R",
  type: "flat end mill",
  unit: "millimeters",
  geometry: { DC: 12.7, SFDM: 12.7, HA: 30, NOF: 4, LCF: 25.4, OAL: 76.2, RE: 0 },
  vendor: "ISCAR",
  "product-id": "EC-A12",
});

test("convertToolMmToInch: scales lengths, leaves angle(HA)+count(NOF) untouched", () => {
  const out = convertToolMmToInch(brandTool());
  assert.equal(out.unit, "inches");
  assert.equal(out.geometry.DC, 0.5);
  assert.equal(out.geometry.SFDM, 0.5);
  assert.equal(out.geometry.LCF, 1);
  assert.equal(out.geometry.OAL, 3);
  assert.equal(out.geometry.RE, 0);
  assert.equal(out.geometry.HA, 30, "helix angle is degrees -- MUST NOT scale");
  assert.equal(out.geometry.NOF, 4, "flute count is an integer -- MUST NOT scale");
});

test("convertToolMmToInch: does NOT mutate the input (immutable)", () => {
  const t = brandTool();
  const snapshot = JSON.stringify(t);
  convertToolMmToInch(t);
  assert.equal(JSON.stringify(t), snapshot, "input tool must be unchanged");
});

test("convertToolMmToInch: idempotent -- an inch tool is returned unchanged", () => {
  const inchTool = { unit: "inches", geometry: { DC: 0.5 } };
  const out = convertToolMmToInch(inchTool);
  assert.equal(out, inchTool, "already-inch tool returned as-is (same ref)");
  assert.equal(out.geometry.DC, 0.5, "DC not re-divided");
});

test("convertToolMmToInch: thread-profile-angle (legacy geometry) is left untouched", () => {
  const t = { unit: "millimeters", geometry: { DC: 25.4, "thread-profile-angle": 60, "tip-length": 12.7 } };
  const out = convertToolMmToInch(t);
  assert.equal(out.geometry.DC, 1);
  assert.equal(out.geometry["tip-length"], 0.5);
  assert.equal(out.geometry["thread-profile-angle"], 60, "angle untouched");
});

test("convertToolMmToInch: holder segment diameters + heights are converted", () => {
  const t = {
    unit: "millimeters",
    geometry: { DC: 12.7 },
    holder: { description: "ER32", segments: [{ "upper-diameter": 25.4, "lower-diameter": 25.4, height: 50.8 }] },
  };
  const out = convertToolMmToInch(t);
  assert.equal(out.holder.segments[0]["upper-diameter"], 1);
  assert.equal(out.holder.segments[0].height, 2);
});

// ## adversarial / failure modes
test("convertToolMmToInch: REFUSES a feed-bearing tool (feed-unit mismatch guard)", () => {
  const feedTool = {
    unit: "millimeters",
    geometry: { DC: 5.558 },
    "start-values": { presets: [{ guid: "g", n: 11454, f_n: 0.0125 }] },
  };
  assert.throws(() => convertToolMmToInch(feedTool), /feed presets/i);
});

test("convertToolMmToInch: an EMPTY start-values.presets does not trip the feed guard", () => {
  const t = { unit: "millimeters", geometry: { DC: 25.4 }, "start-values": { presets: [] } };
  const out = convertToolMmToInch(t);
  assert.equal(out.geometry.DC, 1);
});

test("convertToolMmToInch: null/garbage tool returned as-is (no throw)", () => {
  assert.equal(convertToolMmToInch(null), null);
  assert.equal(convertToolMmToInch(undefined), undefined);
  assert.equal(convertToolMmToInch(42), 42);
});

// ## classification completeness -- the brand emitter must emit only KNOWN keys
test("unknownGeometryKeys: brand tool has zero unknown keys (total coverage)", () => {
  assert.deepEqual(unknownGeometryKeys(brandTool()), []);
});

test("unknownGeometryKeys: surfaces a genuinely-unknown key (audit anchor)", () => {
  assert.deepEqual(unknownGeometryKeys({ geometry: { DC: 1, MYSTERY_FIELD: 9 } }), ["MYSTERY_FIELD"]);
});

test("geometry classification sets are mutually disjoint (length / non-length / unverified)", () => {
  for (const k of LENGTH_GEOMETRY_KEYS) {
    assert.ok(!NON_LENGTH_GEOMETRY_KEYS.has(k), `${k} in LENGTH and NON_LENGTH`);
    assert.ok(!UNVERIFIED_GEOMETRY_KEYS.has(k), `${k} in LENGTH and UNVERIFIED`);
  }
  for (const k of NON_LENGTH_GEOMETRY_KEYS) assert.ok(!UNVERIFIED_GEOMETRY_KEYS.has(k), `${k} in NON_LENGTH and UNVERIFIED`);
});

// ## geometry classification additions (LB / SIG / HAND / TP) -- PRISM_UPSET_H13 + corpus completeness
test("geometry: LB scales (length), SIG/HAND untouched (angle/bool), TP=0 untouched", () => {
  const t = { unit: "millimeters", geometry: { DC: 8, LB: 55, SIG: 140, HAND: true, TP: 0, NOF: 2 } };
  const g = convertToolMmToInch(t).geometry;
  assert.equal(g.LB, 2.165354, "body length 55mm -> in (/25.4)");
  assert.equal(g.SIG, 140, "drill point angle (deg) untouched");
  assert.equal(g.HAND, true, "handedness boolean untouched");
  assert.equal(g.TP, 0, "TP=0 left unchanged");
  assert.equal(g.NOF, 2, "flute count untouched");
});

test("geometry: a NON-ZERO unverified field (TP) FAILS LOUD (no silent 25.4x risk)", () => {
  assert.throws(() => convertToolMmToInch({ unit: "millimeters", geometry: { DC: 10, TP: 1.5 } }), /unverified unit/i);
});

test("unknownGeometryKeys: LB/SIG/HAND/TP are all now classified (zero unknown)", () => {
  assert.deepEqual(unknownGeometryKeys({ geometry: { DC: 8, LB: 40, SIG: 118, HAND: false, TP: 0 } }), []);
});

// ## general feed-preset converter (verified vs inch crib + machining identities)
test("convertPresetMmToInch: v_c is m/min->SFM (x3.28), NOT 1/25.4; feed-rates /25.4; rpm/string unchanged", () => {
  const out = convertPresetMmToInch({ n: 800, v_c: 125.7, f_z: 0.254, v_f: 254, "tool-coolant": "flood" });
  assert.equal(out.n, 800, "rpm unchanged");
  assert.equal(out.f_z, 0.01, "feed/tooth 0.254mm -> 0.01in (/25.4)");
  assert.equal(out.v_f, 10, "feed velocity 254mm/min -> 10 IPM (/25.4)");
  assert.equal(out["tool-coolant"], "flood", "string metadata unchanged");
  assert.ok(Math.abs(out.v_c - 412.4) < 0.1, `v_c 125.7 m/min -> ~412.4 SFM, got ${out.v_c}`);
  assert.ok(out.v_c > 400 && out.v_c < 420, "rules out /25.4 (4.95) and x25.4 (3193)");
});

test("convertPresetMmToInch: FT_PER_M is the metre->foot factor; v_c non-numeric passes through", () => {
  assert.ok(Math.abs(FT_PER_M - 3.280839895) < 1e-9);
  assert.equal(convertPresetMmToInch({ v_c: "auto" }).v_c, "auto");
});

test("convertPresetMmToInch: FAILS LOUD on an unverified preset field (never guesses a feed unit)", () => {
  assert.throws(() => convertPresetMmToInch({ n: 1000, mystery_feed: 5 }), /unverified preset field/i);
});

test("feed classification sets are mutually disjoint", () => {
  for (const k of FEED_LENGTH_KEYS) {
    assert.ok(!FEED_SURFACE_SPEED_KEYS.has(k) && !FEED_UNCHANGED_KEYS.has(k), `${k} double-classified`);
  }
  for (const k of FEED_SURFACE_SPEED_KEYS) assert.ok(!FEED_UNCHANGED_KEYS.has(k), `${k} double-classified`);
});

test("full UPSET-style tool: geometry + feeds convert together via convertToolMmToInch", () => {
  const tool = {
    unit: "millimeters",
    type: "face mill",
    geometry: { DC: 50, LCF: 6, LB: 40, NOF: 4, OAL: 90, RE: 0.8, SFDM: 50, TP: 0, HAND: true },
    "start-values": { presets: [{ name: "H13 rough", "tool-coolant": "flood", n: 800, v_c: 125.7, f_z: 0.254, v_f: 254 }] },
  };
  const out = convertToolMmToInch(tool, { convertPreset: convertPresetMmToInch });
  assert.equal(out.unit, "inches");
  assert.equal(out.geometry.DC, 1.968504); // 50/25.4
  assert.equal(out.geometry.LB, 1.574803); // 40/25.4
  assert.equal(out.geometry.HAND, true);
  const p = out["start-values"].presets[0];
  assert.equal(p.n, 800);
  assert.equal(p.f_z, 0.01);
  assert.ok(Math.abs(p.v_c - 412.4) < 0.1);
});

// ## convertPreset path -- feed-aware conversion (Fusion stores feeds in the tool unit)
test("convertToolMmToInch: with convertPreset, geometry + feeds convert together", () => {
  const feedTool = {
    unit: "millimeters",
    geometry: { DC: 12.7, SFDM: 12.7 },
    "start-values": { presets: [{ guid: "g", material: "steel", n: 11454, f_n: 0.0125 }] },
  };
  // PRISM_JM_Milling preset: n=rpm (unit-independent), f_n=feed/rev (mm/rev -> in/rev = /25.4)
  const convertPreset = (p) => ({ ...p, f_n: typeof p.f_n === "number" ? +(p.f_n / 25.4).toFixed(6) : p.f_n });
  const out = convertToolMmToInch(feedTool, { convertPreset });
  assert.equal(out.unit, "inches");
  assert.equal(out.geometry.DC, 0.5);
  const p = out["start-values"].presets[0];
  assert.equal(p.n, 11454, "rpm unchanged");
  assert.equal(p.f_n, 0.000492, "feed/rev mm->in (0.0125/25.4)");
});

test("convertToolMmToInch: convertPreset does not mutate the input presets", () => {
  const feedTool = { unit: "millimeters", geometry: { DC: 25.4 }, "start-values": { presets: [{ n: 1000, f_n: 0.254 }] } };
  const snap = JSON.stringify(feedTool);
  convertToolMmToInch(feedTool, { convertPreset: (p) => ({ ...p, f_n: p.f_n / 25.4 }) });
  assert.equal(JSON.stringify(feedTool), snap);
});

test("convertToolMmToInch: numeric 2nd arg still works as dp (back-compat)", () => {
  const out = convertToolMmToInch({ unit: "millimeters", geometry: { DC: 1 } }, 4);
  assert.equal(out.geometry.DC, 0.0394);
});

test("convertToolMmToInch: numeric dp arg does NOT bypass the feed guard (still throws)", () => {
  const feedTool = { unit: "millimeters", geometry: { DC: 25.4 }, "start-values": { presets: [{ n: 1000, f_n: 0.254 }] } };
  assert.throws(() => convertToolMmToInch(feedTool, 4), /feed presets/i);
});

// lock the live legacy PRISM_JM_Milling key set into CI (not a one-time manual audit) -- if a future
// source schema adds an unclassified length key it surfaces HERE, before it silently mis-scales a tool.
test("legacy-schema geometry keys are all classified + correctly scaled (no silent passthrough)", () => {
  const legacy = {
    unit: "millimeters",
    geometry: {
      DC: 12.7, DCN: 12.7, SFDM: 12.7, LF: 25.4, NOF: 4, OAL: 76.2, RE: 0,
      "shoulder-length": 25.4, "shaft-diameter": 12.7, "tip-diameter": 12.7, "tip-length": 0,
      "thread-profile-angle": 0,
    },
  };
  assert.deepEqual(unknownGeometryKeys(legacy), [], "every legacy key is classified");
  const g = convertToolMmToInch(legacy).geometry;
  assert.equal(g.DC, 0.5);
  assert.equal(g.LF, 1);
  assert.equal(g["shoulder-length"], 1);
  assert.equal(g["tip-diameter"], 0.5);
  assert.equal(g["tip-length"], 0, "0 length stays 0");
  assert.equal(g.NOF, 4, "flute count untouched");
  assert.equal(g["thread-profile-angle"], 0, "angle untouched");
});

// ## sanitizeToolGeometryMm -- parse-artifact hygiene on mm .tools
const BOUNDS = { oalMax: 1000, lcfMax: 1000, shankMax: 250 };
test("sanitizeToolGeometryMm: deletes garbage OAL, keeps the tool + DC", () => {
  const { tool, changed } = sanitizeToolGeometryMm({ geometry: { DC: 6, OAL: 140000, LF: 24 } }, BOUNDS);
  assert.equal(changed, true);
  assert.equal("OAL" in tool.geometry, false, "impossible OAL deleted");
  assert.equal(tool.geometry.DC, 6);
  assert.equal(tool.geometry.LF, 24, "valid flute length kept");
});

test("sanitizeToolGeometryMm: oversize/zero SFDM falls back to DC", () => {
  const big = sanitizeToolGeometryMm({ geometry: { DC: 6.35, SFDM: 25374.6 } }, BOUNDS);
  assert.equal(big.tool.geometry.SFDM, 6.35, "SFDM -> DC fallback");
  const noDc = sanitizeToolGeometryMm({ geometry: { SFDM: 9999 } }, BOUNDS);
  assert.equal("SFDM" in noDc.tool.geometry, false, "no DC to fall back to -> SFDM deleted");
});

test("sanitizeToolGeometryMm: clean geometry untouched (changed=false, same ref)", () => {
  const t = { geometry: { DC: 12.7, OAL: 76, LF: 25, SFDM: 12.7 } };
  const out = sanitizeToolGeometryMm(t, BOUNDS);
  assert.equal(out.changed, false);
  assert.equal(out.tool, t, "no change -> same object ref");
});
