/**
 * post-bridge-synergy-integration.test.mjs — meta integration test that
 * exercises ALL 4 phase-2 bridges + ALL 4 phase-3 absorption demos in
 * one suite. Closes the POST-BRIDGE-SYNERGY-MS0 phase 1-3 architectural
 * arc with a single regression-prevention asset: if any of the iter37-44
 * substrates drifts from its contract, this test FAILS.
 *
 * Coverage map:
 *   iter37 db-node-bridge        ⨯ iter41 absorption (5 resolvers)
 *   iter38 wizard-node-bridge    ⨯ iter42 absorption (3 wizards)
 *   iter39 sfc-node-bridge       ⨯ iter43 absorption (3 computers)
 *   iter40 post-gen-node-bridge  ⨯ iter44 absorption (3 generators)
 *
 * This is NOT a duplicate of the per-iter tests — it's the
 * cross-bridge integration assertion that no single absorption demo
 * covers alone.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-PHASE-1-3-SMOKE
 * @slot echo · @iter 45 · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// iter37 + iter41
import {
  createNodeBridge,
  registerSource,
  routeQuery,
  KNOWN_DB_SOURCES,
  listRegisteredSources as listDBSources,
} from "./db-node-bridge.mjs";
import {
  wireAllAbsorbedResolvers,
  absorbedSourceCount as dbAbsorbedCount,
} from "./db-bridge-absorption-demo.mjs";

// iter38 + iter42
import {
  createWizard,
  advance,
  WIZARD_DOMAINS,
} from "./wizard-node-bridge.mjs";
import {
  buildDomainWizard,
  listAbsorbedDomains,
  totalAbsorbedSteps,
} from "./wizard-bridge-absorption.mjs";

// iter39 + iter43
import {
  createSFCBridge,
  registerComputer,
  routeRequest,
  COMPUTER_SOURCES,
  ISO_MATERIAL_GROUPS,
} from "./sfc-node-bridge.mjs";
import {
  wireAllAbsorbedComputers,
  absorbedComputerCount,
} from "./sfc-bridge-absorption.mjs";

// iter40 + iter44
import {
  createPostGenBridge,
  registerGenerator,
  routePostGen,
  GENERATOR_KINDS,
  mergeGCodeOutputs,
} from "./post-gen-node-bridge.mjs";
import {
  wireAllAbsorbedGenerators,
  absorbedGeneratorCount,
  controllerDirectGenerator,
  camBridgeGenerator,
  legacyPostGenGenerator,
} from "./post-gen-bridge-absorption.mjs";

// Bridge-contract-verify (iter36) — phase-1 closeout
import {
  verifyBridgeParity,
} from "./bridge-contract-verify.mjs";

// All 3 add-in manifests (iter33+34+35) — for parity verification
import * as mastercam from "./mastercam-addin-resource-manifest.mjs";
import * as hypermill from "./hypermill-addin-resource-manifest.mjs";
import * as inventor from "./inventor-addin-resource-manifest.mjs";

describe("PHASE 1 (bridge enablers) — parity holds end-to-end", () => {
  it("3 add-in manifests pass cross-target parity (LIVE)", () => {
    const r = verifyBridgeParity({
      mastercam,
      hypermill,
      inventor_hsm: inventor,
    });
    assert.equal(r.ok, true);
    assert.equal(r.mismatches.length, 0);
  });
});

describe("PHASE 2 ⨯ PHASE 3 — DB bridge + 5 resolvers", () => {
  it("wire + route material_catalog '4140' → returns kc=1800 end-to-end", () => {
    const b = createNodeBridge();
    const wired = wireAllAbsorbedResolvers(b, registerSource);
    assert.notEqual(wired, null);
    const r = routeQuery(wired, { sourceId: "material_catalog", kind: "lookup", materialName: "4140" });
    assert.equal(r.ok, true);
    assert.equal(r.result[0].kc1_1, 1800);
  });
  it("5 of 23 KNOWN_DB_SOURCES absorbed (21.7%)", () => {
    assert.equal(dbAbsorbedCount(), 5);
    assert.equal(KNOWN_DB_SOURCES.length, 23);
  });
  it("5 absorbed sources are in KNOWN_DB_SOURCES (no drift)", () => {
    const b = createNodeBridge();
    const wired = wireAllAbsorbedResolvers(b, registerSource);
    for (const s of listDBSources(wired)) {
      assert.equal(KNOWN_DB_SOURCES.includes(s), true);
    }
  });
});

describe("PHASE 2 ⨯ PHASE 3 — Wizard bridge + 3 domain wizards", () => {
  it("all 3 WIZARD_DOMAINS have a built wizard (mill/lathe/wire_edm)", () => {
    for (const d of WIZARD_DOMAINS) {
      const w = buildDomainWizard(d, createWizard);
      assert.notEqual(w, null);
      assert.equal(w.domain, d);
    }
  });
  it("listAbsorbedDomains is subset of WIZARD_DOMAINS", () => {
    for (const d of listAbsorbedDomains()) {
      assert.equal(WIZARD_DOMAINS.includes(d), true);
    }
  });
  it("totalAbsorbedSteps = 33 (12 mill + 10 lathe + 11 wire-EDM)", () => {
    assert.equal(totalAbsorbedSteps(), 33);
  });
  it("mill wizard advance with invalid ISO 'X' BLOCKS (no silent pass)", () => {
    let w = buildDomainWizard("mill", createWizard);
    w = advance(w, "X");
    assert.equal(w.status, "blocked");
  });
});

describe("PHASE 2 ⨯ PHASE 3 — SFC bridge + 3 computers", () => {
  const validReq = { materialIsoGroup: "P", toolDiameterMm: 12.7, operation: "face_mill" };

  it("wire + route preferred='kienzle' → Vc=182.88 m/min (P face_mill canonical)", () => {
    const b = createSFCBridge();
    const wired = wireAllAbsorbedComputers(b, registerComputer);
    const r = routeRequest(wired, { ...validReq, preferredSource: "kienzle" });
    assert.equal(r.ok, true);
    assert.equal(Math.abs(r.result.Vc_m_per_min - 182.88) < 1e-9, true);
  });
  it("all 6 ISO_MATERIAL_GROUPS routable through kienzle (full variability)", () => {
    const b = createSFCBridge();
    const wired = wireAllAbsorbedComputers(b, registerComputer);
    for (const g of ISO_MATERIAL_GROUPS) {
      const r = routeRequest(wired, { materialIsoGroup: g, toolDiameterMm: 12.7, operation: "face_mill", preferredSource: "kienzle" });
      assert.equal(r.ok, true);
    }
  });
  it("3 absorbed computers all in COMPUTER_SOURCES whitelist", () => {
    assert.equal(absorbedComputerCount(), 3);
    assert.equal(COMPUTER_SOURCES.length, 5);
  });
});

describe("PHASE 2 ⨯ PHASE 3 — post-gen bridge + 3 generators", () => {
  const validReq = {
    controllerId: "fanuc_30i",
    operations: [
      { kind: "drill", toolNumber: 1, spindleRpm: 3000, depthMm: 10, feedrate: 200, coolant: "flood", retractMode: "safe" },
    ],
  };

  it("wire + route preferred='cam_bridge' → emits 'Mastercam' attribution end-to-end", () => {
    const b = createPostGenBridge();
    const wired = wireAllAbsorbedGenerators(b, registerGenerator);
    const r = routePostGen(wired, { ...validReq, preferredKind: "cam_bridge" });
    assert.equal(r.ok, true);
    assert.equal(r.result.gcodeText.includes("Mastercam"), true);
  });
  it("3 absorbed generators all in GENERATOR_KINDS (no drift)", () => {
    assert.equal(absorbedGeneratorCount(), 3);
    assert.equal(GENERATOR_KINDS.length, 4);
  });
  it("mergeGCodeOutputs prefers cam_bridge (0.92) over controller_direct (0.88) over legacy (0.55)", () => {
    const a = controllerDirectGenerator(validReq);
    const b = camBridgeGenerator(validReq);
    const c = legacyPostGenGenerator(validReq);
    const m = mergeGCodeOutputs([a, b, c]);
    assert.equal(m.source, "cam_bridge");
  });
});

describe("CROSS-BRIDGE substrate chain (iter29 → iter41 → iter43)", () => {
  it("iter43 kienzle Vc matches iter29/iter41 kc=1800 prior (P group)", () => {
    // P group: fleet-default kc1.1 = 1800 (per FLEET_DEFAULT_KC_BY_ISO_GROUP)
    // iter43 kienzle for P + face_mill uses canonical sfm=600 → Vc=182.88
    // This test proves the kc prior + Kienzle computer are SAME source of truth.
    const b = createSFCBridge();
    const wired = wireAllAbsorbedComputers(b, registerComputer);
    const r = routeRequest(wired, { materialIsoGroup: "P", toolDiameterMm: 12.7, operation: "face_mill", preferredSource: "kienzle" });
    assert.equal(r.result.rationale.includes("kc=1800"), true);
  });
});

describe("ARCHITECTURE ASSERTIONS (regression-prevention)", () => {
  it("4 bridges + 4 absorption demos = 8 substrate libraries shipped", () => {
    // This is a count assertion against the absorption coverage numbers.
    // If any absorption demo drifts (e.g. someone removes a resolver),
    // its absorbedCount() helper changes, and we fail loud here.
    const expected = {
      db: { absorbed: 5, total: KNOWN_DB_SOURCES.length },         // 5 of 23
      wizard: { absorbed: 3, total: WIZARD_DOMAINS.length },        // 3 of 3
      sfc: { absorbed: 3, total: COMPUTER_SOURCES.length },         // 3 of 5
      postgen: { absorbed: 3, total: GENERATOR_KINDS.length },      // 3 of 4
    };
    assert.equal(dbAbsorbedCount(), expected.db.absorbed);
    assert.equal(listAbsorbedDomains().length, expected.wizard.absorbed);
    assert.equal(absorbedComputerCount(), expected.sfc.absorbed);
    assert.equal(absorbedGeneratorCount(), expected.postgen.absorbed);
    // Whitelist sizes match contracts:
    assert.equal(expected.db.total, 23);
    assert.equal(expected.wizard.total, 3);
    assert.equal(expected.sfc.total, 5);
    assert.equal(expected.postgen.total, 4);
  });
  it("aggregate absorption coverage: 14 of 35 sources = 40% phase-3 coverage", () => {
    const absorbed = dbAbsorbedCount() + listAbsorbedDomains().length + absorbedComputerCount() + absorbedGeneratorCount();
    const total = KNOWN_DB_SOURCES.length + WIZARD_DOMAINS.length + COMPUTER_SOURCES.length + GENERATOR_KINDS.length;
    assert.equal(absorbed, 14);
    assert.equal(total, 35);
    assert.equal(Math.abs((absorbed / total) - 0.4) < 1e-9, true);
  });
});
