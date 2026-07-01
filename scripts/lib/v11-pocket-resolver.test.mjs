/**
 * v11-pocket-resolver.test.mjs — concrete-value tests for the pocket-DB
 * resolver. Every assertion is exact-value equality.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-V11-AUTO-POCKET-FROM-LIBRARY
 * @slot echo · @iter 23 · @date 2026-05-26
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultLengthOffsetFromPocket,
  defaultDiaOffsetFromPocket,
  lifeFraction,
  toolToPocketRecord,
  buildPocketDb,
  renderPocketDbAsJs,
  lookupPocket,
} from "./v11-pocket-resolver.mjs";

describe("defaultLengthOffsetFromPocket: 1:1 derivation", () => {
  it("pocket 5 → H5", () => { assert.equal(defaultLengthOffsetFromPocket(5), 5); });
  it("pocket 0 → 0 (invalid)", () => { assert.equal(defaultLengthOffsetFromPocket(0), 0); });
  it("pocket -3 → 0 (invalid)", () => { assert.equal(defaultLengthOffsetFromPocket(-3), 0); });
  it("null → 0", () => { assert.equal(defaultLengthOffsetFromPocket(null), 0); });
  it("decimal 5.7 → 5 (floor)", () => { assert.equal(defaultLengthOffsetFromPocket(5.7), 5); });
  it("string '12' → 12", () => { assert.equal(defaultLengthOffsetFromPocket("12"), 12); });
});

describe("defaultDiaOffsetFromPocket: mirrors length", () => {
  it("pocket 7 → D7", () => { assert.equal(defaultDiaOffsetFromPocket(7), 7); });
  it("NaN → 0", () => { assert.equal(defaultDiaOffsetFromPocket(NaN), 0); });
});

describe("lifeFraction: usage / capacity ratio clamped [0,1]", () => {
  it("0/100 → 1.0 (fresh)", () => { assert.equal(lifeFraction(0, 100), 1); });
  it("50/100 → 0.5", () => { assert.equal(lifeFraction(50, 100), 0.5); });
  it("100/100 → 0.0 (exhausted)", () => { assert.equal(lifeFraction(100, 100), 0); });
  it("150/100 → 0.0 (over-run clamped)", () => { assert.equal(lifeFraction(150, 100), 0); });
  it("avgLife=0 → 1.0 (unknown defaults to fresh)", () => { assert.equal(lifeFraction(50, 0), 1); });
  it("null avg → 1.0", () => { assert.equal(lifeFraction(50, null), 1); });
  it("NaN avg → 1.0", () => { assert.equal(lifeFraction(50, NaN), 1); });
});

describe("toolToPocketRecord: shape + defaults", () => {
  const tool = {
    id: "T19",
    magazine_position: 19,
    diameter_mm: 0.75 * 25.4,
    flutes: 3,
    sister_pocket: 39,
    machine_name: "HURCO_VM30i",
  };

  it("valid tool returns record (not null)", () => {
    assert.notEqual(toolToPocketRecord(tool), null);
  });

  it("pocket echoed", () => { assert.equal(toolToPocketRecord(tool).pocket, 19); });
  it("h_offset defaults to pocket #", () => { assert.equal(toolToPocketRecord(tool).h_offset, 19); });
  it("d_offset defaults to pocket #", () => { assert.equal(toolToPocketRecord(tool).d_offset, 19); });
  it("sister_pocket carried", () => { assert.equal(toolToPocketRecord(tool).sister_pocket, 39); });
  it("flutes carried", () => { assert.equal(toolToPocketRecord(tool).flutes, 3); });

  it("explicit H/D override defaults", () => {
    const t2 = { ...tool, length_offset: 99, dia_offset: 88 };
    assert.equal(toolToPocketRecord(t2).h_offset, 99);
  });

  it("crib usage drives life_remaining_min", () => {
    const r = toolToPocketRecord(tool, { total_usage_min: 12, avg_life_min: 45 });
    assert.equal(r.life_remaining_min, 33);
  });

  it("crib usage drives life_fraction", () => {
    const r = toolToPocketRecord(tool, { total_usage_min: 30, avg_life_min: 60 });
    assert.equal(r.life_fraction, 0.5);
  });

  it("no magazine_position → null record", () => {
    assert.equal(toolToPocketRecord({ id: "Tx" }), null);
  });

  it("null tool → null record", () => {
    assert.equal(toolToPocketRecord(null), null);
  });

  it("non-object tool → null", () => {
    assert.equal(toolToPocketRecord("not-a-tool"), null);
  });
});

describe("buildPocketDb: aggregation + machine filter", () => {
  const tools = [
    { id: "T2",  magazine_position: 2,  machine_name: "HURCO_VM30i", diameter_mm: 15.875 },
    { id: "T14", magazine_position: 14, machine_name: "HURCO_VM30i", diameter_mm: 19.05  },
    { id: "T19", magazine_position: 19, machine_name: "HURCO_VM30i", diameter_mm: 19.05  },
    { id: "T5",  magazine_position: 5,  machine_name: "OKUMA_MULTUS", diameter_mm: 12.7  },
    { id: "Tx",  magazine_position: 0,  machine_name: "HURCO_VM30i" }, // skipped no_pocket
    { id: "Ty",  /* no pocket */          machine_name: "HURCO_VM30i" }, // skipped no_pocket
  ];

  it("no machine filter includes 4 (excludes 2 pocketless)", () => {
    assert.equal(buildPocketDb(tools).stats.included, 4);
  });

  it("machine filter Hurco includes 3", () => {
    assert.equal(buildPocketDb(tools, { machine_name: "HURCO_VM30i" }).stats.included, 3);
  });

  it("machine filter Okuma includes 1", () => {
    assert.equal(buildPocketDb(tools, { machine_name: "OKUMA_MULTUS" }).stats.included, 1);
  });

  it("DB keyed by 'T'+pocket", () => {
    const { db } = buildPocketDb(tools, { machine_name: "HURCO_VM30i" });
    assert.equal(db.T2.pocket, 2);
  });

  it("DB carries flutes when present (T19 fixture has no flutes → null)", () => {
    const { db } = buildPocketDb(tools, { machine_name: "HURCO_VM30i" });
    assert.equal(db.T19.flutes, null);
  });

  it("skippedNoPocket count = 2", () => {
    assert.equal(buildPocketDb(tools).stats.skippedNoPocket, 2);
  });

  it("crib map drives life_remaining_min through buildPocketDb", () => {
    const crib = new Map([["T19", { total_usage_min: 10, avg_life_min: 50 }]]);
    const { db } = buildPocketDb(tools, { machine_name: "HURCO_VM30i", cribByToolId: crib });
    assert.equal(db.T19.life_remaining_min, 40);
  });

  it("empty array returns 0 included", () => {
    assert.equal(buildPocketDb([]).stats.included, 0);
  });

  it("null input returns 0 included", () => {
    assert.equal(buildPocketDb(null).stats.included, 0);
  });
});

describe("renderPocketDbAsJs: Fusion-postable string", () => {
  const db = {
    T2: { pocket: 2, h_offset: 2, d_offset: 2, sister_pocket: null, life_remaining_min: null, diameter_mm: 15.875, flutes: 4 },
    T19: { pocket: 19, h_offset: 19, d_offset: 19, sister_pocket: 39, life_remaining_min: 33.0, diameter_mm: 19.05, flutes: 3 },
  };

  it("contains AUTO-GENERATED header", () => {
    assert.equal(renderPocketDbAsJs(db).includes("AUTO-GENERATED"), true);
  });

  it("declares default var name", () => {
    assert.equal(renderPocketDbAsJs(db).includes("var PRISM_TOOL_POCKET_DB"), true);
  });

  it("custom var name applied", () => {
    assert.equal(renderPocketDbAsJs(db, { varName: "X" }).includes("var X "), true);
  });

  it("T2 entry rendered with pocket 2", () => {
    assert.equal(renderPocketDbAsJs(db).includes("\"T2\": { pocket: 2"), true);
  });

  it("T19 sister rendered as 'T39'", () => {
    assert.equal(renderPocketDbAsJs(db).includes("sister: \"T39\""), true);
  });

  it("T2 sister null rendered as null literal", () => {
    assert.equal(renderPocketDbAsJs(db).includes("sister: null"), true);
  });

  it("life_min 33.0 rendered", () => {
    assert.equal(renderPocketDbAsJs(db).includes("life_min: 33.0"), true);
  });

  it("life_min null rendered as null literal", () => {
    assert.equal(renderPocketDbAsJs(db).includes("life_min: null"), true);
  });

  it("entries sorted numerically T2 before T19", () => {
    const out = renderPocketDbAsJs(db);
    assert.equal(out.indexOf("\"T2\":") < out.indexOf("\"T19\":"), true);
  });
});

describe("lookupPocket: emit-time accessor", () => {
  const db = { T2: { pocket: 2, h_offset: 2 } };

  it("lookup T2 returns record", () => {
    assert.equal(lookupPocket(db, 2).pocket, 2);
  });

  it("lookup T5 (absent) returns null", () => {
    assert.equal(lookupPocket(db, 5), null);
  });

  it("null DB returns null", () => {
    assert.equal(lookupPocket(null, 2), null);
  });

  it("non-numeric tool# returns null", () => {
    assert.equal(lookupPocket(db, "bogus"), null);
  });

  it("zero tool# returns null", () => {
    assert.equal(lookupPocket(db, 0), null);
  });
});
