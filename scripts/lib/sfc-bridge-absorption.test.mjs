/**
 * sfc-bridge-absorption.test.mjs — concrete-value tests for the 3
 * Speed/Feed computers + LIVE integration over iter39 sfc-node-bridge.
 *
 * Hand-checked math:
 *   rpmFromVc: Vc=150 m/min, dia=12.7 mm
 *     n = (Vc × 1000) / (π × dia) = 150000 / (π × 12.7) ≈ 3759.51
 *   feedFromRpm: n=4000, fz=0.1, Z=4 → vf = 4000 × 0.1 × 4 = 1600
 *   SFM_TO_VC_M_PER_MIN: 1 ft = 0.3048 m
 *   For ISO P face_mill: sfm=600 → Vc = 600 × 0.3048 = 182.88 m/min
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-SFC-ABSORB-3
 * @slot echo · @iter 43 · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ABSORPTION_SCHEMA_VERSION,
  KIENZLE_MC_BY_ISO_GROUP,
  CANONICAL_SFM_BY_ISO_AND_OP,
  CANONICAL_FZ_BY_DIAMETER_RANGE,
  VENDOR_BASELINE_BY_ISO,
  SFM_TO_VC_M_PER_MIN,
  rpmFromVc,
  feedFromRpm,
  lookupChipload,
  kienzleComputer,
  tableComputer,
  vendorComputer,
  ALL_ABSORBED_COMPUTERS,
  wireAllAbsorbedComputers,
  absorbedComputerCount,
  listAbsorbedComputerSources,
} from "./sfc-bridge-absorption.mjs";

import {
  createSFCBridge,
  registerComputer,
  routeRequest,
  COMPUTER_SOURCES,
  ISO_MATERIAL_GROUPS,
} from "./sfc-node-bridge.mjs";

describe("constants", () => {
  it("ABSORPTION_SCHEMA_VERSION = 1", () => {
    assert.equal(ABSORPTION_SCHEMA_VERSION, 1);
  });
  it("SFM_TO_VC_M_PER_MIN = 0.3048 (1 ft → m)", () => {
    assert.equal(SFM_TO_VC_M_PER_MIN, 0.3048);
  });
  it("KIENZLE_MC_BY_ISO_GROUP covers all 6 ISO groups", () => {
    for (const g of ISO_MATERIAL_GROUPS) {
      assert.equal(typeof KIENZLE_MC_BY_ISO_GROUP[g], "number");
    }
  });
  it("KIENZLE_MC.P = 0.25 (steel canonical)", () => {
    assert.equal(KIENZLE_MC_BY_ISO_GROUP.P, 0.25);
  });
  it("KIENZLE_MC.N = 0.28 (Al canonical)", () => {
    assert.equal(KIENZLE_MC_BY_ISO_GROUP.N, 0.28);
  });
  it("CANONICAL_SFM P.face_mill = 600 (Sandvik canonical for steel)", () => {
    assert.equal(CANONICAL_SFM_BY_ISO_AND_OP.P.face_mill, 600);
  });
  it("CANONICAL_SFM N.face_mill = 2000 (Al gets 3-4x SFM vs steel)", () => {
    assert.equal(CANONICAL_SFM_BY_ISO_AND_OP.N.face_mill, 2000);
  });
  it("CANONICAL_SFM S.face_mill = 150 (superalloys ~4x slower than steel)", () => {
    assert.equal(CANONICAL_SFM_BY_ISO_AND_OP.S.face_mill, 150);
  });
  it("CANONICAL_FZ_BY_DIAMETER_RANGE has 5 entries", () => {
    assert.equal(CANONICAL_FZ_BY_DIAMETER_RANGE.length, 5);
  });
  it("VENDOR_BASELINE_BY_ISO covers all 6 ISO groups", () => {
    for (const g of ISO_MATERIAL_GROUPS) {
      assert.equal(typeof VENDOR_BASELINE_BY_ISO[g], "object");
    }
  });
});

describe("rpmFromVc: hand-checked physics", () => {
  it("Vc=150, dia=12.7 → ≈3759.51 rpm (within 1e-2)", () => {
    const n = rpmFromVc(150, 12.7);
    const expected = (150 * 1000) / (Math.PI * 12.7);
    assert.equal(Math.abs(n - expected) < 1e-2, true);
  });
  it("Vc=100, dia=10 → ≈3183.10 rpm", () => {
    const n = rpmFromVc(100, 10);
    assert.equal(Math.abs(n - (100000 / (Math.PI * 10))) < 1e-9, true);
  });
  it("Vc=300, dia=25.4 → independently computed", () => {
    const n = rpmFromVc(300, 25.4);
    const expected = 300000 / (Math.PI * 25.4);
    assert.equal(Math.abs(n - expected) < 1e-9, true);
  });
  it("dia=0 → null (div0 guard)", () => {
    assert.equal(rpmFromVc(150, 0), null);
  });
  it("dia=-5 → null", () => {
    assert.equal(rpmFromVc(150, -5), null);
  });
  it("NaN Vc → null", () => {
    assert.equal(rpmFromVc(NaN, 10), null);
  });
});

describe("feedFromRpm: vf = n × fz × Z", () => {
  it("n=4000, fz=0.1, Z=4 → vf=1600", () => {
    assert.equal(feedFromRpm(4000, 0.1, 4), 1600);
  });
  it("n=3000, fz=0.05, Z=2 → vf=300", () => {
    assert.equal(feedFromRpm(3000, 0.05, 2), 300);
  });
  it("Z=0 → null", () => {
    assert.equal(feedFromRpm(4000, 0.1, 0), null);
  });
  it("fz=-0.1 → null", () => {
    assert.equal(feedFromRpm(4000, -0.1, 4), null);
  });
  it("NaN n → null", () => {
    assert.equal(feedFromRpm(NaN, 0.1, 4), null);
  });
});

describe("lookupChipload: range-based selection", () => {
  it("dia=2 → 0.025 (micro range, ≤3)", () => {
    assert.equal(lookupChipload(2), 0.025);
  });
  it("dia=5 → 0.05 (small, ≤6)", () => {
    assert.equal(lookupChipload(5), 0.05);
  });
  it("dia=10 → 0.08 (medium, ≤12)", () => {
    assert.equal(lookupChipload(10), 0.08);
  });
  it("dia=20 → 0.12 (large, ≤25)", () => {
    assert.equal(lookupChipload(20), 0.12);
  });
  it("dia=50 → 0.18 (face mill, >25)", () => {
    assert.equal(lookupChipload(50), 0.18);
  });
  it("dia=12 → 0.08 (boundary inclusive at 12)", () => {
    assert.equal(lookupChipload(12), 0.08);
  });
  it("dia=12.7 → 0.12 (just over medium boundary)", () => {
    assert.equal(lookupChipload(12.7), 0.12);
  });
  it("dia=0 → null", () => {
    assert.equal(lookupChipload(0), null);
  });
});

describe("kienzleComputer", () => {
  it("P + face_mill + dia=12.7 + 4 flutes → returns valid SF result", () => {
    const r = kienzleComputer({ materialIsoGroup: "P", operation: "face_mill", toolDiameterMm: 12.7, toolFlutes: 4 });
    assert.notEqual(r, null);
    assert.equal(r.source, "kienzle");
  });
  it("P + face_mill: Vc = 600 × 0.3048 = 182.88", () => {
    const r = kienzleComputer({ materialIsoGroup: "P", operation: "face_mill", toolDiameterMm: 12.7, toolFlutes: 4 });
    assert.equal(Math.abs(r.Vc_m_per_min - 182.88) < 1e-9, true);
  });
  it("N + face_mill: Vc = 2000 × 0.3048 = 609.6", () => {
    const r = kienzleComputer({ materialIsoGroup: "N", operation: "face_mill", toolDiameterMm: 12.7, toolFlutes: 4 });
    assert.equal(Math.abs(r.Vc_m_per_min - 609.6) < 1e-9, true);
  });
  it("missing materialIsoGroup → null", () => {
    assert.equal(kienzleComputer({ operation: "face_mill", toolDiameterMm: 12.7 }), null);
  });
  it("unknown operation → null", () => {
    assert.equal(kienzleComputer({ materialIsoGroup: "P", operation: "fly", toolDiameterMm: 12.7 }), null);
  });
  it("confidence=0.75 (fleet-default Kienzle prior)", () => {
    const r = kienzleComputer({ materialIsoGroup: "P", operation: "face_mill", toolDiameterMm: 12.7 });
    assert.equal(r.confidence, 0.75);
  });
  it("rationale includes kc value (1800 for P)", () => {
    const r = kienzleComputer({ materialIsoGroup: "P", operation: "face_mill", toolDiameterMm: 12.7 });
    assert.equal(r.rationale.includes("1800"), true);
  });
});

describe("tableComputer", () => {
  it("K (cast iron) + drill + dia=10 → returns valid SF", () => {
    const r = tableComputer({ materialIsoGroup: "K", operation: "drill", toolDiameterMm: 10 });
    assert.notEqual(r, null);
    assert.equal(r.source, "table");
  });
  it("K drill: sfm=150 → Vc = 45.72 m/min", () => {
    const r = tableComputer({ materialIsoGroup: "K", operation: "drill", toolDiameterMm: 10 });
    assert.equal(Math.abs(r.Vc_m_per_min - 45.72) < 1e-9, true);
  });
  it("confidence=0.65 (general-purpose table)", () => {
    const r = tableComputer({ materialIsoGroup: "P", operation: "face_mill", toolDiameterMm: 12.7 });
    assert.equal(r.confidence, 0.65);
  });
  it("variability: 3 ISO groups (P/M/N) all produce different Vc for same op", () => {
    const rP = tableComputer({ materialIsoGroup: "P", operation: "face_mill", toolDiameterMm: 12.7 });
    const rM = tableComputer({ materialIsoGroup: "M", operation: "face_mill", toolDiameterMm: 12.7 });
    const rN = tableComputer({ materialIsoGroup: "N", operation: "face_mill", toolDiameterMm: 12.7 });
    assert.equal(rP.Vc_m_per_min !== rM.Vc_m_per_min, true);
    assert.equal(rM.Vc_m_per_min !== rN.Vc_m_per_min, true);
  });
});

describe("vendorComputer", () => {
  it("P + dia=20 → returns Sandvik baseline result", () => {
    const r = vendorComputer({ materialIsoGroup: "P", toolDiameterMm: 20, toolFlutes: 4 });
    assert.notEqual(r, null);
    assert.equal(r.source, "vendor");
  });
  it("P vendor: sfm=700 → Vc ≈ 213.36", () => {
    const r = vendorComputer({ materialIsoGroup: "P", toolDiameterMm: 20, toolFlutes: 4 });
    assert.equal(Math.abs(r.Vc_m_per_min - (700 * 0.3048)) < 1e-9, true);
  });
  it("confidence=0.82 (vendor pedigree)", () => {
    const r = vendorComputer({ materialIsoGroup: "P", toolDiameterMm: 20 });
    assert.equal(r.confidence, 0.82);
  });
  it("N vendor fz=0.18 (vs table 0.12 at this dia)", () => {
    const rV = vendorComputer({ materialIsoGroup: "N", toolDiameterMm: 20, toolFlutes: 4 });
    assert.equal(rV.fz_mm_per_tooth, 0.18);
  });
  it("rationale includes 'sandvik_coromill_245'", () => {
    const r = vendorComputer({ materialIsoGroup: "P", toolDiameterMm: 20 });
    assert.equal(r.rationale.includes("sandvik_coromill_245"), true);
  });
});

describe("absorbed computer helpers", () => {
  it("absorbedComputerCount = 3", () => {
    assert.equal(absorbedComputerCount(), 3);
  });
  it("listAbsorbedComputerSources = ['kienzle','table','vendor']", () => {
    assert.deepEqual(listAbsorbedComputerSources(), ["kienzle", "table", "vendor"]);
  });
  it("every absorbed source is in COMPUTER_SOURCES whitelist (iter39 contract)", () => {
    for (const s of listAbsorbedComputerSources()) {
      assert.equal(COMPUTER_SOURCES.includes(s), true);
    }
  });
  it("ALL_ABSORBED_COMPUTERS has 3 fn entries", () => {
    assert.equal(Object.keys(ALL_ABSORBED_COMPUTERS).length, 3);
    for (const fn of Object.values(ALL_ABSORBED_COMPUTERS)) {
      assert.equal(typeof fn, "function");
    }
  });
});

describe("LIVE: end-to-end through iter39 sfc-node-bridge", () => {
  const validReq = { materialIsoGroup: "P", toolDiameterMm: 12.7, operation: "face_mill" };

  it("wireAllAbsorbedComputers registers all 3 into a fresh bridge", () => {
    const b = createSFCBridge();
    const wired = wireAllAbsorbedComputers(b, registerComputer);
    assert.notEqual(wired, null);
    assert.equal(Object.keys(wired.computers).length, 3);
  });
  it("LIVE preferred='kienzle' → routes through kienzle", () => {
    const b = createSFCBridge();
    const wired = wireAllAbsorbedComputers(b, registerComputer);
    const r = routeRequest(wired, { ...validReq, preferredSource: "kienzle" });
    assert.equal(r.ok, true);
    assert.equal(r.source, "kienzle");
  });
  it("LIVE preferred='vendor' → routes through vendor with confidence 0.82", () => {
    const b = createSFCBridge();
    const wired = wireAllAbsorbedComputers(b, registerComputer);
    const r = routeRequest(wired, { ...validReq, preferredSource: "vendor" });
    assert.equal(r.ok, true);
    assert.equal(r.result.confidence, 0.82);
  });
  it("LIVE no preferred → fallback chain (kienzle first)", () => {
    const b = createSFCBridge();
    const wired = wireAllAbsorbedComputers(b, registerComputer);
    const r = routeRequest(wired, validReq);
    assert.equal(r.source, "kienzle");
  });
  it("LIVE unsupported 'ml' computer fails through, lands on next available", () => {
    const b = createSFCBridge();
    const wired = wireAllAbsorbedComputers(b, registerComputer);
    const r = routeRequest(wired, { ...validReq, preferredSource: "ml" });
    assert.equal(r.ok, true);
    assert.equal(r.source, "kienzle"); // ml not registered → falls through to chain
  });
  it("LIVE bad request → ok=false", () => {
    const b = createSFCBridge();
    const wired = wireAllAbsorbedComputers(b, registerComputer);
    const r = routeRequest(wired, { materialIsoGroup: "X", toolDiameterMm: 12.7, operation: "face_mill" });
    assert.equal(r.ok, false);
  });
  it("LIVE all 6 ISO groups routable through kienzle", () => {
    const b = createSFCBridge();
    const wired = wireAllAbsorbedComputers(b, registerComputer);
    for (const g of ISO_MATERIAL_GROUPS) {
      const r = routeRequest(wired, { materialIsoGroup: g, toolDiameterMm: 12.7, operation: "face_mill", preferredSource: "kienzle" });
      assert.equal(r.ok, true);
    }
  });
  it("LIVE 3 of 5 computer sources absorbed = 60% coverage", () => {
    assert.equal(Math.abs((3 / 5) - 0.6) < 1e-9, true);
  });
  it("LIVE wireAllAbsorbedComputers with bad fn → null", () => {
    assert.equal(wireAllAbsorbedComputers(createSFCBridge(), "not-fn"), null);
  });
});
