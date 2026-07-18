import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseBlocks, validateThreading } from "../lathe-quality-pipeline.mjs";
import { createBridge } from "./lathe-shop-tool-library-bridge.mjs";
import { createTribalQueryEngine } from "./lathe-tribal-query-engine.mjs";
import { createInsertSelector } from "./lathe-wizard-vendor-lookup.mjs";
import { parsePath, groupByPart, pairAB } from "./lathe-ab-version-locator.mjs";

const AMATEUR_PROGRAM = `% O1234
(PART-1234 — AMATEUR ROUGH+THREAD)
G99
T0101 M06
G96 S180 M03
G00 X32.0 Z2.0
G71 U2.0 R0.5
G71 P10 Q20 U0.02 W0.005 F0.020
N10 G00 X20.0 Z0.1
N20 G01 X28.0 Z-25.0
G70 P10 Q20 F0.012
G92 X28.0 Z-25.0 F2.0
G00 X100.0 Z100.0
M30
%`;

const SHOP_INVENTORY = {
  ALCOA: {
    "*": {
      T0101: {
        insertAnsi: "CNMG-432-PR", vendor: "Kennametal", grade: "KCM35",
        geometry: "C", noseRadiusMm: 0.8,
        iso_group_fit: ["P-30"], suggestedVcSfm: [350, 420],
        suggestedFzIpr: [0.008, 0.014], lifeMinutesAtTargetVc: 18,
        coating: "PVD-TiAlN", substitutionOptions: []
      }
    }
  }
};

const CORPUS = {
  vendor_grades: [
    { vendor: "Kennametal", grade: "KCM35", insertAnsi: "CNMG-432-PR", geometry: "C", coating: "PVD-TiAlN", iso_group_fit: ["P-30", "M-25"], suggestedVcSfm: [350, 420], suggestedFzIpr: [0.008, 0.014], lifeMinutesAtTargetVc: 18, best_application: "roughing" },
    { vendor: "Sandvik", grade: "GC4325", insertAnsi: "DNMG-432-MF", geometry: "D", coating: "PVD-TiAlN", iso_group_fit: ["P-30"], suggestedVcSfm: [320, 400], suggestedFzIpr: [0.006, 0.012], lifeMinutesAtTargetVc: 22, best_application: "finishing" }
  ],
  video_segments: [{ video_id: "abc", title: "G71 Roughing Tutorial", body: "G71 stock removal cycle", tags: ["g71", "roughing"] }],
  tribal_tips: []
};

describe("E2E composition — five P0 engines", () => {
  it("parseBlocks emits structured blocks", () => {
    const blocks = parseBlocks(AMATEUR_PROGRAM);
    assert.ok(blocks.length >= 10);
    assert.ok(blocks.some(b => b.g === "G71"));
    assert.ok(blocks.some(b => b.g === "G92"));
  });

  it("validateThreading flags G92 deprecated", () => {
    const r = validateThreading(AMATEUR_PROGRAM, { controller: "fanuc", iso_group: "P" });
    assert.equal(r.thread_block_count, 1);
    assert.ok(r.issues.some(i => i.severity === "warning"));
  });

  it("bridge resolves T0101 to Kennametal KCM35", () => {
    const bridge = createBridge({ layer1: SHOP_INVENTORY });
    const r = bridge.resolve({ customer: "ALCOA", toolNumber: "T0101", controller: "fanuc" });
    assert.equal(r.vendor, "Kennametal");
    assert.equal(r.grade, "KCM35");
  });

  it("tribal query returns ISO-P vendor grades", () => {
    const engine = createTribalQueryEngine(CORPUS);
    const r = engine.query({ iso_group: "P", operation: "roughing", top_k: 5 });
    assert.ok(r.hits.filter(h => h.kind === "vendor_grade").length >= 2);
  });

  it("wizard selector composes bridge and query into a pick", () => {
    const bridge = createBridge({ layer1: SHOP_INVENTORY });
    const queryEngine = createTribalQueryEngine(CORPUS);
    const selector = createInsertSelector({ queryEngine, bridge });
    const r = selector.selectInsert({ iso_group: "P-30", operation: "roughing", material: "AISI-1045", customer: "ALCOA" });
    assert.ok(r.primary.vendor === "Kennametal" || r.primary.vendor === "Sandvik");
    assert.ok(r.confidence >= 0.5);
    assert.ok(r.rationale.length > 10);
  });

  it("AB locator pairs canonical paths", () => {
    const paths = [
      "JM DIE/CNC LATHE/ALCOA/PART-1234/PART-1234.MIN",
      "JM DIE/CNC LATHE/ALCOA/PART-1234/PART-1234_REV2.MIN"
    ];
    const parsed = paths.map(parsePath);
    const pairs = pairAB(groupByPart(parsed));
    assert.equal(pairs.length, 1);
    assert.equal(pairs[0].a.version_tag, "A_original");
    assert.equal(pairs[0].b.version_tag, "B_upgraded");
  });

  it("full pipeline produces a coherent verdict", () => {
    const blocks = parseBlocks(AMATEUR_PROGRAM);
    assert.ok(blocks.length > 0);

    const threadReport = validateThreading(AMATEUR_PROGRAM, { controller: "fanuc", iso_group: "P" });
    assert.ok(threadReport.issues.length >= 1);

    const bridge = createBridge({ layer1: SHOP_INVENTORY });
    const toolEntry = bridge.resolve({ customer: "ALCOA", toolNumber: "T0101", controller: "fanuc" });
    assert.equal(toolEntry.vendor, "Kennametal");

    const queryEngine = createTribalQueryEngine(CORPUS);
    const selector = createInsertSelector({ queryEngine, bridge });
    const pick = selector.selectInsert({ iso_group: "P-30", operation: "roughing", material: "AISI-1045", customer: "ALCOA" });

    assert.equal(pick.primary.vendor, "Kennametal");
    assert.ok(threadReport.issues.length > 0);
    assert.ok(toolEntry.insertAnsi);
    assert.equal(`${pick.primary.vendor} ${pick.primary.grade}`, "Kennametal KCM35");
  });
});
