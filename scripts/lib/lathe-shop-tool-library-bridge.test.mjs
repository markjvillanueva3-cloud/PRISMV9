// Hermetic tests for U-LATHE-SHOP-TOOL-LIBRARY-BRIDGE
// Design memo: reference_shop_tool_library_bridge_design_2026_05_27
//
// Resolves customer T-numbers → ANSI insert codes + vendor grade payload.
// 3-layer fallback chain: customer+job exact → customer-only → machine-model → controller default → throw.
//
// Run: node --test scripts/lib/lathe-shop-tool-library-bridge.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createBridge } from "./lathe-shop-tool-library-bridge.mjs";

// ── Synthetic Layer 1 (customer+job tool lists) ────────────────────────────
const LAYER_1_FIXTURE = {
  "ALCOA": {
    "JOB-2025-PART-A": {
      "T0101": {
        insertAnsi: "CNMG-432-PR",
        geometry: "C",
        noseRadiusMm: 0.8,
        vendor: "Kennametal",
        grade: "KCM35",
        coating: "PVD-TiAlN",
        lifeMinutesAtTargetVc: 18,
        suggestedVcSfm: [350, 420],
        suggestedFzIpr: [0.008, 0.014],
        isoGroupFit: ["P-30", "M-25"],
        substitutionOptions: ["SECO TP2500", "Sandvik 4325"]
      }
    },
    // Customer-level fallback (no jobId)
    "*": {
      "T0202": {
        insertAnsi: "DNMG-432-MF",
        geometry: "D",
        noseRadiusMm: 0.8,
        vendor: "Sandvik",
        grade: "4325",
        coating: "PVD-TiAlN",
        lifeMinutesAtTargetVc: 22,
        suggestedVcSfm: [320, 400],
        suggestedFzIpr: [0.006, 0.012],
        isoGroupFit: ["P-30"],
        substitutionOptions: ["Kennametal KCM35"]
      }
    }
  }
};

// ── Synthetic Layer 2 (cross-customer canonical) ───────────────────────────
const LAYER_2_FIXTURE = {
  vendors: {
    "Kennametal": { grades: ["KCM35", "KC8050"] },
    "Sandvik": { grades: ["4325", "GC4325"] }
  },
  wizard_query_records: [
    {
      iso_group: "P-30",
      operation: "roughing",
      insertAnsi: "CNMG-432-PR",
      vendor: "Kennametal",
      grade: "KCM35"
    }
  ]
};

// ── Machine-model heuristic fixture (Layer 3) ──────────────────────────────
const MACHINE_MODEL_DEFAULTS = {
  "okuma-lb3000": {
    "T0101": { insertAnsi: "CNMG-432", geometry: "C", vendor: "generic", grade: "P30-default" }
  }
};

describe("createBridge — resolver factory", () => {
  it("creates a bridge with required resolve API", () => {
    const bridge = createBridge({ layer1: LAYER_1_FIXTURE, layer2: LAYER_2_FIXTURE, machineDefaults: MACHINE_MODEL_DEFAULTS });
    assert.equal(typeof bridge.resolve, "function");
  });
});

describe("resolve — 3-layer fallback chain", () => {
  const bridge = createBridge({ layer1: LAYER_1_FIXTURE, layer2: LAYER_2_FIXTURE, machineDefaults: MACHINE_MODEL_DEFAULTS });

  it("Layer 1 exact match: (customer, jobId, T-number) returns full entry + confidence ≥ 0.9", () => {
    const r = bridge.resolve({ customer: "ALCOA", jobId: "JOB-2025-PART-A", toolNumber: "T0101", controller: "fanuc" });
    assert.equal(r.insertAnsi, "CNMG-432-PR");
    assert.equal(r.vendor, "Kennametal");
    assert.equal(r.grade, "KCM35");
    assert.equal(r.sourceLayer, 1);
    assert.ok(r.confidence >= 0.9);
  });

  it("Layer 1 fallback: customer-only (no jobId match) returns customer-level entry + 'job-specific override possible' warning", () => {
    const r = bridge.resolve({ customer: "ALCOA", jobId: "UNKNOWN-JOB", toolNumber: "T0202", controller: "fanuc" });
    assert.equal(r.insertAnsi, "DNMG-432-MF");
    assert.equal(r.sourceLayer, 1);
    assert.ok(r.warnings && r.warnings.some(w => /job-specific|customer-only/i.test(w)));
    assert.ok(r.confidence < 0.9 && r.confidence >= 0.6);
  });

  it("Layer 3 machine-model heuristic: customer unknown, controller+model match returns default + low-confidence warning", () => {
    const r = bridge.resolve({ customer: "UNKNOWN-CUST", toolNumber: "T0101", controller: "fanuc", machineModel: "okuma-lb3000" });
    assert.equal(r.insertAnsi, "CNMG-432");
    assert.equal(r.sourceLayer, 3);
    assert.ok(r.confidence < 0.6);
    assert.ok(r.warnings && r.warnings.some(w => /machine-model|low-confidence/i.test(w)));
  });

  it("R12 fail-loud: no match in any layer throws with actionable message", () => {
    assert.throws(
      () => bridge.resolve({ customer: "UNKNOWN-CUST", toolNumber: "T9999", controller: "unknown-controller" }),
      /operator must populate tool-list|no match/i
    );
  });

  it("returns ShopToolEntry shape with all required fields populated", () => {
    const r = bridge.resolve({ customer: "ALCOA", jobId: "JOB-2025-PART-A", toolNumber: "T0101", controller: "fanuc" });
    assert.equal(typeof r.insertAnsi, "string");
    assert.equal(typeof r.geometry, "string");
    assert.equal(typeof r.vendor, "string");
    assert.equal(typeof r.grade, "string");
    assert.ok(Array.isArray(r.isoGroupFit));
    assert.ok(Array.isArray(r.substitutionOptions));
    assert.equal(typeof r.sourceLayer, "number");
    assert.equal(typeof r.confidence, "number");
    assert.ok(r.confidence >= 0 && r.confidence <= 1);
  });
});

describe("resolve — input validation", () => {
  const bridge = createBridge({ layer1: LAYER_1_FIXTURE, layer2: LAYER_2_FIXTURE });

  it("throws on missing customer", () => {
    assert.throws(() => bridge.resolve({ toolNumber: "T0101", controller: "fanuc" }), /customer/i);
  });

  it("throws on missing toolNumber", () => {
    assert.throws(() => bridge.resolve({ customer: "ALCOA", controller: "fanuc" }), /tool/i);
  });

  it("normalizes toolNumber format (accepts T01, T0101, t0101)", () => {
    // Implementation-defined: at minimum, lowercase t prefix should match uppercase T.
    const r1 = bridge.resolve({ customer: "ALCOA", jobId: "JOB-2025-PART-A", toolNumber: "T0101", controller: "fanuc" });
    const r2 = bridge.resolve({ customer: "ALCOA", jobId: "JOB-2025-PART-A", toolNumber: "t0101", controller: "fanuc" });
    assert.equal(r1.insertAnsi, r2.insertAnsi);
  });
});

describe("resolve — T-format normalization (iter151 — Mazak 6-digit ↔ Fanuc 4-digit)", () => {
  // Fixture: layer1 indexed by Fanuc-style T0101, but resolve() called with Mazak T010101
  const layer1WithFanucKeys = {
    ALCOA: {
      "*": {
        T0101: { insertAnsi: "CNMG-432-PR", vendor: "Kennametal", grade: "KCM35", geometry: "C", iso_group_fit: ["P-30"], suggestedVcSfm: [350, 420], suggestedFzIpr: [0.008, 0.014], lifeMinutesAtTargetVc: 18, coating: "PVD-TiAlN" }
      }
    }
  };
  const bridge = createBridge({ layer1: layer1WithFanucKeys });

  it("Mazak T010101 (6-digit) resolves against Fanuc T0101 (4-digit) inventory key", () => {
    const r = bridge.resolve({ customer: "ALCOA", toolNumber: "T010101", controller: "mazak" });
    assert.equal(r.vendor, "Kennametal");
    assert.equal(r.grade, "KCM35");
    assert.ok(r.warnings && r.warnings.some(w => /T-format normalized/.test(w)));
  });

  it("T01 (2-digit) does NOT auto-expand to T0101 — short form is ambiguous (offset unknown)", () => {
    // Inventory key is T0101 (tool 01, offset 01). T01 alone doesn't specify offset; ambiguous resolution would be wrong.
    assert.throws(
      () => bridge.resolve({ customer: "ALCOA", toolNumber: "T01", controller: "fanuc" }),
      /no match|no candidate/i
    );
  });

  it("Mazak T020202 (different tool) misses since T0202 absent from inventory", () => {
    assert.throws(
      () => bridge.resolve({ customer: "ALCOA", toolNumber: "T020202", controller: "mazak" }),
      /no match|no candidate/i
    );
  });
});
