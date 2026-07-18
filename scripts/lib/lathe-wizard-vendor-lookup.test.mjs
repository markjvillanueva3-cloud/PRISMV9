// Hermetic tests for U-LATHE-WIZARD-VENDOR-LOOKUP
// Design memo: reference_lathe_wizard_vendor_lookup_design_2026_05_27
//
// selectInsert(spec) → { primary, alternates, rationale, confidence }
// 7-component score function summing to 100:
//   ISO-group fit (30) + geometry-operation fit (20) + vendor inventory bias (15)
//   + coating-vs-material fit (10) + cost/life ratio (10) + surface-finish match (10)
//   + recency in corpus (5)
//
// Run: node --test scripts/lib/lathe-wizard-vendor-lookup.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTribalQueryEngine } from "./lathe-tribal-query-engine.mjs";
import { createBridge } from "./lathe-shop-tool-library-bridge.mjs";
import { createInsertSelector } from "./lathe-wizard-vendor-lookup.mjs";

const CORPUS = {
  vendor_grades: [
    {
      vendor: "Kennametal", grade: "KCM35",
      insertAnsi: "CNMG-432-PR", geometry: "C",
      coating: "PVD-TiAlN",
      iso_group_fit: ["P-30", "M-25"],
      suggestedVcSfm: [350, 420], suggestedFzIpr: [0.008, 0.014],
      lifeMinutesAtTargetVc: 18,
      best_application: "roughing"
    },
    {
      vendor: "Sandvik", grade: "GC4325",
      insertAnsi: "DNMG-432-MF", geometry: "D",
      coating: "PVD-TiAlN",
      iso_group_fit: ["P-30"],
      suggestedVcSfm: [320, 400], suggestedFzIpr: [0.006, 0.012],
      lifeMinutesAtTargetVc: 22,
      best_application: "finishing"
    },
    {
      vendor: "Sumitomo", grade: "BNX10",
      insertAnsi: "CNMG-432", geometry: "C",
      coating: null,
      iso_group_fit: ["H-30", "H-35"],
      suggestedVcSfm: [400, 800], suggestedFzIpr: [0.003, 0.008],
      lifeMinutesAtTargetVc: 25,
      best_application: "finishing"
    }
  ],
  video_segments: [],
  tribal_tips: []
};

// Shop bridge with Kennametal in inventory + Sandvik out-of-stock
const SHOP_INVENTORY = {
  "ALCOA": {
    "*": {
      "T0101": { insertAnsi: "CNMG-432-PR", vendor: "Kennametal", grade: "KCM35" }
    }
  }
};

describe("createInsertSelector — factory", () => {
  it("returns a selector with selectInsert API", () => {
    const queryEngine = createTribalQueryEngine(CORPUS);
    const bridge = createBridge({ layer1: SHOP_INVENTORY });
    const selector = createInsertSelector({ queryEngine, bridge });
    assert.equal(typeof selector.selectInsert, "function");
  });
});

describe("selectInsert — scoring + ranking", () => {
  const queryEngine = createTribalQueryEngine(CORPUS);
  const bridge = createBridge({ layer1: SHOP_INVENTORY });
  const selector = createInsertSelector({ queryEngine, bridge });

  it("ISO-P roughing on steel: primary=Kennametal KCM35 (best ISO-P fit + customer-inventory bias)", () => {
    const r = selector.selectInsert({
      iso_group: "P-30", operation: "roughing",
      material: "AISI-1045", customer: "ALCOA"
    });
    assert.equal(r.primary.vendor, "Kennametal");
    assert.equal(r.primary.grade, "KCM35");
    assert.ok(r.confidence >= 0.5, "should clear minimum-confidence band");
  });

  it("ISO-H hard turning: primary=Sumitomo BNX10 (only H-class grade)", () => {
    const r = selector.selectInsert({
      iso_group: "H-30", operation: "finishing",
      material: "AISI-4140-HRC60", customer: "ALCOA"
    });
    assert.equal(r.primary.grade, "BNX10");
  });

  it("returns alternates (up to 3)", () => {
    const r = selector.selectInsert({
      iso_group: "P-30", operation: "roughing",
      material: "AISI-1045", customer: "ALCOA"
    });
    assert.ok(Array.isArray(r.alternates));
    assert.ok(r.alternates.length <= 3);
  });

  it("rationale is non-empty string explaining the choice", () => {
    const r = selector.selectInsert({
      iso_group: "P-30", operation: "roughing",
      material: "AISI-1045", customer: "ALCOA"
    });
    assert.equal(typeof r.rationale, "string");
    assert.ok(r.rationale.length > 10);
  });

  it("confidence is in [0,1]", () => {
    const r = selector.selectInsert({
      iso_group: "P-30", operation: "roughing",
      material: "AISI-1045", customer: "ALCOA"
    });
    assert.ok(r.confidence >= 0 && r.confidence <= 1);
  });
});

describe("selectInsert — R12 fail-loud", () => {
  const queryEngine = createTribalQueryEngine(CORPUS);
  const bridge = createBridge({ layer1: SHOP_INVENTORY });
  const selector = createInsertSelector({ queryEngine, bridge });

  it("throws when no grade scores ≥ 50 (low-confidence-band rejection)", () => {
    assert.throws(
      () => selector.selectInsert({
        iso_group: "X-99-nonexistent", operation: "unknown",
        material: "unobtanium", customer: "UNKNOWN-CUST"
      }),
      /no candidate scored.*operator confirmation/i
    );
  });

  it("rejects when iso_group missing (spec is incomplete)", () => {
    assert.throws(
      () => selector.selectInsert({ operation: "roughing", customer: "ALCOA" }),
      /iso_group/i
    );
  });

  it("rejects when operation missing", () => {
    assert.throws(
      () => selector.selectInsert({ iso_group: "P-30", customer: "ALCOA" }),
      /operation/i
    );
  });
});
