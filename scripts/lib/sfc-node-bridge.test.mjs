/**
 * sfc-node-bridge.test.mjs — concrete-value tests for the Speed/Feed
 * Calculator unified bridge.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-SFC-NODE-BRIDGE
 * @slot echo · @iter 39 · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SFC_CONTRACT_VERSION,
  ISO_MATERIAL_GROUPS,
  OPERATION_KINDS,
  COMPUTER_SOURCES,
  CONFIDENCE_FLOOR,
  CONFIDENCE_CEIL,
  REQUIRED_REQUEST_FIELDS,
  REQUIRED_RESULT_FIELDS,
  createSFCBridge,
  validateRequest,
  validateResult,
  registerComputer,
  routeRequest,
  mergeAlternatives,
  recordOutcome,
  listRegisteredComputers,
  summarizeBridge,
} from "./sfc-node-bridge.mjs";

// Synthetic computer fixture: returns a canned SF result.
function syntheticComputer(canned) {
  return (req) => ({
    Vc_m_per_min: canned.Vc || 150,
    n_rpm: canned.n || 4000,
    fz_mm_per_tooth: canned.fz || 0.1,
    vf_mm_per_min: canned.vf || 800,
    source: canned.source || "kienzle",
    confidence: canned.confidence != null ? canned.confidence : 0.8,
    request: req,
  });
}

describe("constants", () => {
  it("SFC_CONTRACT_VERSION = 1", () => {
    assert.equal(SFC_CONTRACT_VERSION, 1);
  });
  it("ISO_MATERIAL_GROUPS = ['P','M','K','N','S','H'] (6 canonical groups)", () => {
    assert.deepEqual(ISO_MATERIAL_GROUPS, ["P", "M", "K", "N", "S", "H"]);
  });
  it("OPERATION_KINDS has 14 entries", () => {
    assert.equal(OPERATION_KINDS.length, 14);
  });
  it("OPERATION_KINDS includes 'face_mill'", () => {
    assert.equal(OPERATION_KINDS.includes("face_mill"), true);
  });
  it("OPERATION_KINDS includes 'trochoidal'", () => {
    assert.equal(OPERATION_KINDS.includes("trochoidal"), true);
  });
  it("COMPUTER_SOURCES = ['kienzle','table','ml','vendor','ensemble']", () => {
    assert.deepEqual(COMPUTER_SOURCES, ["kienzle", "table", "ml", "vendor", "ensemble"]);
  });
  it("CONFIDENCE_FLOOR = 0.0, CONFIDENCE_CEIL = 1.0", () => {
    assert.equal(CONFIDENCE_FLOOR, 0.0);
    assert.equal(CONFIDENCE_CEIL, 1.0);
  });
  it("REQUIRED_REQUEST_FIELDS has materialIsoGroup, toolDiameterMm, operation", () => {
    for (const f of ["materialIsoGroup", "toolDiameterMm", "operation"]) {
      assert.equal(REQUIRED_REQUEST_FIELDS.includes(f), true);
    }
  });
  it("REQUIRED_RESULT_FIELDS has Vc/n/fz/vf/source/confidence", () => {
    for (const f of ["Vc_m_per_min", "n_rpm", "fz_mm_per_tooth", "vf_mm_per_min", "source", "confidence"]) {
      assert.equal(REQUIRED_RESULT_FIELDS.includes(f), true);
    }
  });
});

describe("createSFCBridge", () => {
  it("default bridgeId='default'", () => {
    assert.equal(createSFCBridge().bridgeId, "default");
  });
  it("default fallbackChain = ['kienzle','table','vendor']", () => {
    assert.deepEqual(createSFCBridge().fallbackChain, ["kienzle", "table", "vendor"]);
  });
  it("custom fallbackChain honored", () => {
    const b = createSFCBridge({ fallbackChain: ["vendor", "ml", "kienzle"] });
    assert.deepEqual(b.fallbackChain, ["vendor", "ml", "kienzle"]);
  });
  it("invalid fallbackChain entries filtered out", () => {
    const b = createSFCBridge({ fallbackChain: ["kienzle", "fake_src", "table"] });
    assert.deepEqual(b.fallbackChain, ["kienzle", "table"]);
  });
  it("starts with outcomeCount=0", () => {
    assert.equal(createSFCBridge().outcomeCount, 0);
  });
  it("schemaVersion = 1", () => {
    assert.equal(createSFCBridge().schemaVersion, 1);
  });
});

describe("validateRequest", () => {
  const validReq = { materialIsoGroup: "P", toolDiameterMm: 12.7, operation: "face_mill" };

  it("valid request → ok=true", () => {
    assert.equal(validateRequest(validReq).ok, true);
  });
  it("missing materialIsoGroup → ok=false", () => {
    const r = validateRequest({ toolDiameterMm: 12.7, operation: "face_mill" });
    assert.equal(r.ok, false);
    assert.equal(r.errors.some((e) => e.includes("materialIsoGroup")), true);
  });
  it("invalid materialIsoGroup='X' → ok=false", () => {
    const r = validateRequest({ ...validReq, materialIsoGroup: "X" });
    assert.equal(r.ok, false);
    assert.equal(r.errors.some((e) => e.includes("invalid materialIsoGroup")), true);
  });
  it("invalid operation='fly' → ok=false", () => {
    const r = validateRequest({ ...validReq, operation: "fly" });
    assert.equal(r.ok, false);
    assert.equal(r.errors.some((e) => e.includes("invalid operation")), true);
  });
  it("toolDiameterMm=0 → ok=false", () => {
    const r = validateRequest({ ...validReq, toolDiameterMm: 0 });
    assert.equal(r.ok, false);
  });
  it("toolDiameterMm=-5 → ok=false", () => {
    const r = validateRequest({ ...validReq, toolDiameterMm: -5 });
    assert.equal(r.ok, false);
  });
  it("null request → ok=false", () => {
    assert.equal(validateRequest(null).ok, false);
  });
  it("variability: each ISO group accepted (P/M/K/N/S/H)", () => {
    for (const g of ISO_MATERIAL_GROUPS) {
      const r = validateRequest({ ...validReq, materialIsoGroup: g });
      assert.equal(r.ok, true);
    }
  });
});

describe("validateResult", () => {
  const validRes = { Vc_m_per_min: 150, n_rpm: 4000, fz_mm_per_tooth: 0.1, vf_mm_per_min: 800, source: "kienzle", confidence: 0.8 };

  it("valid result → ok=true", () => {
    assert.equal(validateResult(validRes).ok, true);
  });
  it("confidence=1.5 (>ceiling) → ok=false", () => {
    const r = validateResult({ ...validRes, confidence: 1.5 });
    assert.equal(r.ok, false);
    assert.equal(r.errors.some((e) => e.includes("out of range")), true);
  });
  it("confidence=-0.1 (<floor) → ok=false", () => {
    const r = validateResult({ ...validRes, confidence: -0.1 });
    assert.equal(r.ok, false);
  });
  it("invalid source='wat' → ok=false", () => {
    const r = validateResult({ ...validRes, source: "wat" });
    assert.equal(r.ok, false);
  });
  it("negative Vc → ok=false", () => {
    const r = validateResult({ ...validRes, Vc_m_per_min: -50 });
    assert.equal(r.ok, false);
  });
  it("missing n_rpm → ok=false", () => {
    const { n_rpm, ...rest } = validRes;
    assert.equal(validateResult(rest).ok, false);
  });
  it("null result → ok=false", () => {
    assert.equal(validateResult(null).ok, false);
  });
});

describe("registerComputer", () => {
  it("valid source + fn → registered", () => {
    const b = createSFCBridge();
    const b2 = registerComputer(b, "kienzle", syntheticComputer({}));
    assert.equal(typeof b2.computers.kienzle, "function");
  });
  it("unknown source 'fake' → null", () => {
    const b = createSFCBridge();
    assert.equal(registerComputer(b, "fake", () => null), null);
  });
  it("non-function fn → null", () => {
    const b = createSFCBridge();
    assert.equal(registerComputer(b, "kienzle", "not-fn"), null);
  });
  it("immutable: original bridge unchanged", () => {
    const b0 = createSFCBridge();
    registerComputer(b0, "kienzle", syntheticComputer({}));
    assert.equal(b0.computers.kienzle, undefined);
  });
});

describe("routeRequest", () => {
  const validReq = { materialIsoGroup: "P", toolDiameterMm: 12.7, operation: "face_mill" };

  it("preferredSource matches a registered computer → uses it", () => {
    let b = createSFCBridge();
    b = registerComputer(b, "kienzle", syntheticComputer({ source: "kienzle", Vc: 200 }));
    b = registerComputer(b, "table", syntheticComputer({ source: "table", Vc: 250 }));
    const r = routeRequest(b, { ...validReq, preferredSource: "table" });
    assert.equal(r.source, "table");
    assert.equal(r.result.Vc_m_per_min, 250);
  });
  it("no preferredSource → falls back through chain (kienzle first)", () => {
    let b = createSFCBridge();
    b = registerComputer(b, "kienzle", syntheticComputer({ source: "kienzle", Vc: 200 }));
    b = registerComputer(b, "table", syntheticComputer({ source: "table", Vc: 250 }));
    const r = routeRequest(b, validReq);
    assert.equal(r.source, "kienzle");
  });
  it("first computer throws → falls through to next", () => {
    let b = createSFCBridge();
    b = registerComputer(b, "kienzle", () => { throw new Error("boom"); });
    b = registerComputer(b, "table", syntheticComputer({ source: "table" }));
    const r = routeRequest(b, validReq);
    assert.equal(r.source, "table");
    assert.equal(r.ok, true);
  });
  it("first computer returns invalid result → falls through", () => {
    let b = createSFCBridge();
    b = registerComputer(b, "kienzle", () => ({ /* missing required fields */ }));
    b = registerComputer(b, "table", syntheticComputer({ source: "table" }));
    const r = routeRequest(b, validReq);
    assert.equal(r.source, "table");
  });
  it("invalid request → ok=false with errors", () => {
    const b = createSFCBridge();
    const r = routeRequest(b, { toolDiameterMm: 12.7 });
    assert.equal(r.ok, false);
    assert.equal(r.errors.length > 0, true);
  });
  it("no computers registered → ok=false with 'no computer returned'", () => {
    const b = createSFCBridge();
    const r = routeRequest(b, validReq);
    assert.equal(r.ok, false);
    assert.equal(r.errors[0].includes("no computer returned"), true);
  });
  it("all 3 computers in chain not registered → triedSources lists all 3 as not_registered", () => {
    const b = createSFCBridge();
    const r = routeRequest(b, validReq);
    assert.equal(r.triedSources.length, 3);
    assert.equal(r.triedSources.every((t) => t.status === "not_registered"), true);
  });
});

describe("mergeAlternatives", () => {
  it("3 results: picks the highest confidence (0.9)", () => {
    const alts = [
      { Vc_m_per_min: 150, n_rpm: 4000, fz_mm_per_tooth: 0.1, vf_mm_per_min: 800, source: "kienzle", confidence: 0.7 },
      { Vc_m_per_min: 160, n_rpm: 4100, fz_mm_per_tooth: 0.11, vf_mm_per_min: 850, source: "table", confidence: 0.9 },
      { Vc_m_per_min: 140, n_rpm: 3900, fz_mm_per_tooth: 0.09, vf_mm_per_min: 750, source: "ml", confidence: 0.6 },
    ];
    const m = mergeAlternatives(alts);
    assert.equal(m.source, "table");
    assert.equal(m.confidence, 0.9);
  });
  it("_provenance contains all 3 sources with confidence", () => {
    const alts = [
      { Vc_m_per_min: 150, n_rpm: 4000, fz_mm_per_tooth: 0.1, vf_mm_per_min: 800, source: "kienzle", confidence: 0.7 },
      { Vc_m_per_min: 160, n_rpm: 4100, fz_mm_per_tooth: 0.11, vf_mm_per_min: 850, source: "table", confidence: 0.9 },
    ];
    const m = mergeAlternatives(alts);
    assert.equal(m._provenance.length, 2);
    assert.equal(m._provenance[1].source, "table");
  });
  it("invalid result in array skipped", () => {
    const alts = [
      { /* invalid */ },
      { Vc_m_per_min: 160, n_rpm: 4100, fz_mm_per_tooth: 0.11, vf_mm_per_min: 850, source: "table", confidence: 0.9 },
    ];
    const m = mergeAlternatives(alts);
    assert.equal(m.source, "table");
  });
  it("all invalid → null", () => {
    assert.equal(mergeAlternatives([{}, null]), null);
  });
  it("empty array → null", () => {
    assert.equal(mergeAlternatives([]), null);
  });
  it("null → null", () => {
    assert.equal(mergeAlternatives(null), null);
  });
});

describe("recordOutcome", () => {
  it("valid outcome → outcomeCount increments", () => {
    const b0 = createSFCBridge();
    const b1 = recordOutcome(b0, { predictedVf: 800, actualVf: 850 });
    assert.equal(b1.outcomeCount, 1);
  });
  it("invalid predictedVf (NaN) → bridge unchanged", () => {
    const b0 = createSFCBridge();
    const b1 = recordOutcome(b0, { predictedVf: NaN, actualVf: 850 });
    assert.equal(b1.outcomeCount, 0);
  });
  it("null outcome → bridge returned unchanged", () => {
    const b0 = createSFCBridge();
    assert.equal(recordOutcome(b0, null), b0);
  });
});

describe("listRegisteredComputers", () => {
  it("empty bridge → []", () => {
    assert.deepEqual(listRegisteredComputers(createSFCBridge()), []);
  });
  it("3 computers registered → sorted list", () => {
    let b = createSFCBridge();
    b = registerComputer(b, "vendor", syntheticComputer({}));
    b = registerComputer(b, "kienzle", syntheticComputer({}));
    b = registerComputer(b, "table", syntheticComputer({}));
    assert.deepEqual(listRegisteredComputers(b), ["kienzle", "table", "vendor"]);
  });
});

describe("summarizeBridge", () => {
  it("knownSources=5, knownMaterialGroups=6, knownOperationKinds=14", () => {
    const s = summarizeBridge(createSFCBridge());
    assert.equal(s.knownSources, 5);
    assert.equal(s.knownMaterialGroups, 6);
    assert.equal(s.knownOperationKinds, 14);
  });
  it("registeredCount echoes len of registered computers", () => {
    let b = createSFCBridge();
    b = registerComputer(b, "kienzle", syntheticComputer({}));
    b = registerComputer(b, "table", syntheticComputer({}));
    assert.equal(summarizeBridge(b).registeredCount, 2);
  });
  it("outcomeCount reflects accumulated outcomes", () => {
    let b = createSFCBridge();
    b = recordOutcome(b, { predictedVf: 800, actualVf: 850 });
    b = recordOutcome(b, { predictedVf: 700, actualVf: 720 });
    assert.equal(summarizeBridge(b).outcomeCount, 2);
  });
  it("null bridge → null", () => {
    assert.equal(summarizeBridge(null), null);
  });
});
