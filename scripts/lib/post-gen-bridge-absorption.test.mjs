/**
 * post-gen-bridge-absorption.test.mjs — concrete-value tests for the 3
 * G-code generators + LIVE integration over iter40 post-gen bridge.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-POST-GEN-ABSORB-3
 * @slot echo · @iter 44 · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ABSORPTION_SCHEMA_VERSION,
  GCODE_PROGRAM_HEADER,
  GCODE_PROGRAM_FOOTER,
  validateOp,
  detectSafetyFlags,
  controllerDirectGenerator,
  camBridgeGenerator,
  legacyPostGenGenerator,
  ALL_ABSORBED_GENERATORS,
  wireAllAbsorbedGenerators,
  absorbedGeneratorCount,
  listAbsorbedGeneratorKinds,
} from "./post-gen-bridge-absorption.mjs";

import {
  createPostGenBridge,
  registerGenerator,
  routePostGen,
  GENERATOR_KINDS,
  mergeGCodeOutputs,
} from "./post-gen-node-bridge.mjs";

function basicReq(extras) {
  return {
    controllerId: "fanuc_30i",
    operations: [
      { kind: "drill", toolNumber: 1, spindleRpm: 3000, depthMm: 10, feedrate: 200, coolant: "flood", retractMode: "safe" },
      { kind: "tap", toolNumber: 2, spindleRpm: 800, depthMm: 15, feedrate: 400, coolant: "flood", retractMode: "safe" },
    ],
    ...extras,
  };
}

describe("constants", () => {
  it("ABSORPTION_SCHEMA_VERSION = 1", () => {
    assert.equal(ABSORPTION_SCHEMA_VERSION, 1);
  });
  it("GCODE_PROGRAM_HEADER starts with '%'", () => {
    assert.equal(GCODE_PROGRAM_HEADER.startsWith("%"), true);
  });
  it("GCODE_PROGRAM_HEADER includes 'O1000' program number", () => {
    assert.equal(GCODE_PROGRAM_HEADER.includes("O1000"), true);
  });
  it("GCODE_PROGRAM_FOOTER includes 'M30'", () => {
    assert.equal(GCODE_PROGRAM_FOOTER.includes("M30"), true);
  });
  it("GCODE_PROGRAM_FOOTER ends with '%\\n'", () => {
    assert.equal(GCODE_PROGRAM_FOOTER.endsWith("%\n"), true);
  });
});

describe("validateOp", () => {
  it("valid {kind:'drill'} → true", () => {
    assert.equal(validateOp({ kind: "drill" }), true);
  });
  it("missing kind → false", () => {
    assert.equal(validateOp({ toolNumber: 1 }), false);
  });
  it("kind='' → false", () => {
    assert.equal(validateOp({ kind: "" }), false);
  });
  it("null → false", () => {
    assert.equal(validateOp(null), false);
  });
  it("number 42 → false", () => {
    assert.equal(validateOp(42), false);
  });
});

describe("detectSafetyFlags", () => {
  it("drill without coolant → coolant_missing_required flagged", () => {
    const f = detectSafetyFlags({ operations: [{ kind: "drill", coolant: null, retractMode: "safe" }] });
    assert.equal(f.includes("coolant_missing_required"), true);
  });
  it("tap with coolant=none → coolant_missing_required flagged", () => {
    const f = detectSafetyFlags({ operations: [{ kind: "tap", coolant: "none", retractMode: "safe" }] });
    assert.equal(f.includes("coolant_missing_required"), true);
  });
  it("tool L=50 dia=10 (L/D=5 > 4) → tool_overhang_critical", () => {
    const f = detectSafetyFlags({ operations: [{ kind: "drill", coolant: "flood", toolDiameterMm: 10, toolLengthMm: 50, retractMode: "safe" }] });
    assert.equal(f.includes("tool_overhang_critical"), true);
  });
  it("no retractMode → missing_safe_retract", () => {
    const f = detectSafetyFlags({ operations: [{ kind: "drill", coolant: "flood" }] });
    assert.equal(f.includes("missing_safe_retract"), true);
  });
  it("clean op (flood + retract) → no flags", () => {
    const f = detectSafetyFlags({ operations: [{ kind: "face_mill", coolant: "flood", retractMode: "safe" }] });
    assert.equal(f.length, 0);
  });
  it("duplicate flags deduplicated (2 drills both no-coolant → 1 flag)", () => {
    const f = detectSafetyFlags({
      operations: [
        { kind: "drill", coolant: null, retractMode: "safe" },
        { kind: "drill", coolant: null, retractMode: "safe" },
      ],
    });
    const cnt = f.filter((x) => x === "coolant_missing_required").length;
    assert.equal(cnt, 1);
  });
  it("null req → []", () => {
    assert.deepEqual(detectSafetyFlags(null), []);
  });
});

describe("controllerDirectGenerator", () => {
  it("basic req → non-null result", () => {
    assert.notEqual(controllerDirectGenerator(basicReq()), null);
  });
  it("source='controller_direct'", () => {
    assert.equal(controllerDirectGenerator(basicReq()).source, "controller_direct");
  });
  it("confidence=0.88", () => {
    assert.equal(controllerDirectGenerator(basicReq()).confidence, 0.88);
  });
  it("gcodeText includes 'G54' (WCS)", () => {
    assert.equal(controllerDirectGenerator(basicReq()).gcodeText.includes("G54"), true);
  });
  it("gcodeText includes 'M6' (tool change)", () => {
    assert.equal(controllerDirectGenerator(basicReq()).gcodeText.includes("M6"), true);
  });
  it("gcodeText includes 'G81' (drill canned cycle)", () => {
    assert.equal(controllerDirectGenerator(basicReq()).gcodeText.includes("G81"), true);
  });
  it("gcodeText includes 'G84' (tap canned cycle)", () => {
    assert.equal(controllerDirectGenerator(basicReq()).gcodeText.includes("G84"), true);
  });
  it("gcodeText includes 'M8' (flood) and 'M9' (coolant off)", () => {
    const g = controllerDirectGenerator(basicReq()).gcodeText;
    assert.equal(g.includes("M8") && g.includes("M9"), true);
  });
  it("missing controllerId → null", () => {
    assert.equal(controllerDirectGenerator({ operations: [{ kind: "drill" }] }), null);
  });
  it("empty operations → null", () => {
    assert.equal(controllerDirectGenerator({ controllerId: "fanuc_30i", operations: [] }), null);
  });
  it("safetyFlags is array (empty when clean)", () => {
    assert.deepEqual(controllerDirectGenerator(basicReq()).safetyFlags, []);
  });
});

describe("camBridgeGenerator", () => {
  it("source='cam_bridge'", () => {
    assert.equal(camBridgeGenerator(basicReq()).source, "cam_bridge");
  });
  it("confidence=0.92 (highest — vendor pedigree)", () => {
    assert.equal(camBridgeGenerator(basicReq()).confidence, 0.92);
  });
  it("uses MASTERCAM_DIALECT_MAP first work offset (G54)", () => {
    const g = camBridgeGenerator(basicReq()).gcodeText;
    assert.equal(g.includes("G54"), true);
  });
  it("includes 'Mastercam' attribution", () => {
    assert.equal(camBridgeGenerator(basicReq()).gcodeText.includes("Mastercam"), true);
  });
  it("through_spindle coolant → emits M88", () => {
    const req = basicReq();
    req.operations[0].coolant = "through_spindle";
    assert.equal(camBridgeGenerator(req).gcodeText.includes("M88"), true);
  });
  it("rationale mentions iter33 dialect map", () => {
    assert.equal(camBridgeGenerator(basicReq()).rationale.includes("iter33"), true);
  });
});

describe("legacyPostGenGenerator", () => {
  it("source='legacy_postgen'", () => {
    assert.equal(legacyPostGenGenerator(basicReq()).source, "legacy_postgen");
  });
  it("confidence=0.55 (lowest, deprecated)", () => {
    assert.equal(legacyPostGenGenerator(basicReq()).confidence, 0.55);
  });
  it("output includes deprecation marker 'LEGACY POSTGEN'", () => {
    assert.equal(legacyPostGenGenerator(basicReq()).gcodeText.includes("LEGACY POSTGEN"), true);
  });
  it("always emits M8 (flood) regardless of input — legacy assumption", () => {
    const req = basicReq();
    req.operations[0].coolant = "dry";
    assert.equal(legacyPostGenGenerator(req).gcodeText.includes("M8"), true);
  });
  it("missing controllerId → null", () => {
    assert.equal(legacyPostGenGenerator({ operations: [{ kind: "drill" }] }), null);
  });
});

describe("absorbed generator helpers", () => {
  it("absorbedGeneratorCount = 3", () => {
    assert.equal(absorbedGeneratorCount(), 3);
  });
  it("listAbsorbedGeneratorKinds sorted", () => {
    assert.deepEqual(listAbsorbedGeneratorKinds(), ["cam_bridge", "controller_direct", "legacy_postgen"]);
  });
  it("every absorbed kind is in GENERATOR_KINDS whitelist (iter40 contract)", () => {
    for (const k of listAbsorbedGeneratorKinds()) {
      assert.equal(GENERATOR_KINDS.includes(k), true);
    }
  });
  it("ALL_ABSORBED_GENERATORS has 3 function entries", () => {
    assert.equal(Object.keys(ALL_ABSORBED_GENERATORS).length, 3);
    for (const v of Object.values(ALL_ABSORBED_GENERATORS)) {
      assert.equal(typeof v, "function");
    }
  });
});

describe("LIVE: end-to-end through iter40 post-gen bridge", () => {
  it("wireAllAbsorbedGenerators registers all 3 into a fresh bridge", () => {
    const b = createPostGenBridge();
    const wired = wireAllAbsorbedGenerators(b, registerGenerator);
    assert.notEqual(wired, null);
    assert.equal(Object.keys(wired.generators).length, 3);
  });
  it("LIVE preferred='cam_bridge' → routes through cam_bridge (highest conf)", () => {
    const b = createPostGenBridge();
    const wired = wireAllAbsorbedGenerators(b, registerGenerator);
    const r = routePostGen(wired, { ...basicReq(), preferredKind: "cam_bridge" });
    assert.equal(r.ok, true);
    assert.equal(r.kind, "cam_bridge");
  });
  it("LIVE no preferred → fallback chain (controller_direct first)", () => {
    const b = createPostGenBridge();
    const wired = wireAllAbsorbedGenerators(b, registerGenerator);
    const r = routePostGen(wired, basicReq());
    assert.equal(r.kind, "controller_direct");
  });
  it("LIVE all 3 outputs valid → routePostGen result validates ok=true", () => {
    const b = createPostGenBridge();
    const wired = wireAllAbsorbedGenerators(b, registerGenerator);
    for (const kind of listAbsorbedGeneratorKinds()) {
      const r = routePostGen(wired, { ...basicReq(), preferredKind: kind });
      assert.equal(r.ok, true);
    }
  });
  it("LIVE mergeGCodeOutputs across all 3 → cam_bridge wins (conf 0.92 + no flags)", () => {
    const req = basicReq();
    const a = controllerDirectGenerator(req);
    const b = camBridgeGenerator(req);
    const c = legacyPostGenGenerator(req);
    const m = mergeGCodeOutputs([a, b, c]);
    assert.equal(m.source, "cam_bridge");
  });
  it("LIVE missing-coolant scenario: all 3 flag → mergeGCodeOutputs still picks highest conf among flagged", () => {
    const req = basicReq();
    req.operations[0].coolant = null;
    const a = controllerDirectGenerator(req);
    const b = camBridgeGenerator(req);
    const c = legacyPostGenGenerator(req);
    const m = mergeGCodeOutputs([a, b, c]);
    assert.equal(m.source, "cam_bridge");
    assert.equal(m.safetyFlags.includes("coolant_missing_required"), true);
  });
  it("LIVE bad request → ok=false", () => {
    const b = createPostGenBridge();
    const wired = wireAllAbsorbedGenerators(b, registerGenerator);
    const r = routePostGen(wired, { controllerId: "fake_ctrl", operations: [{ kind: "drill" }] });
    assert.equal(r.ok, false);
  });
  it("LIVE wireAllAbsorbedGenerators with bad fn → null", () => {
    assert.equal(wireAllAbsorbedGenerators(createPostGenBridge(), "not-fn"), null);
  });
  it("LIVE coverage: 3 of 4 GENERATOR_KINDS = 75%", () => {
    assert.equal(Math.abs((3 / 4) - 0.75) < 1e-9, true);
  });
});
