/**
 * post-gen-node-bridge.test.mjs — concrete-value tests for the unified
 * post-generator bridge.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-POST-GEN-BRIDGE
 * @slot echo · @iter 40 · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  POST_GEN_CONTRACT_VERSION,
  GENERATOR_KINDS,
  SUPPORTED_CONTROLLERS,
  SAFETY_FLAG_KINDS,
  REQUIRED_REQUEST_FIELDS,
  REQUIRED_RESULT_FIELDS,
  createPostGenBridge,
  validateRequest,
  validateResult,
  registerGenerator,
  routePostGen,
  mergeGCodeOutputs,
  recordEmit,
  listRegisteredGenerators,
  summarizeBridge,
} from "./post-gen-node-bridge.mjs";

function syntheticGen(canned) {
  return (req) => ({
    gcodeText: canned.gcode || "O1000\nG0 X0 Y0\nM30\n",
    source: canned.source || "controller_direct",
    controllerId: canned.controllerId || req.controllerId,
    confidence: canned.confidence != null ? canned.confidence : 0.85,
    safetyFlags: canned.safetyFlags || [],
  });
}

describe("constants", () => {
  it("POST_GEN_CONTRACT_VERSION = 1", () => {
    assert.equal(POST_GEN_CONTRACT_VERSION, 1);
  });
  it("GENERATOR_KINDS = 4 entries", () => {
    assert.equal(GENERATOR_KINDS.length, 4);
  });
  it("GENERATOR_KINDS includes 'controller_direct'", () => {
    assert.equal(GENERATOR_KINDS.includes("controller_direct"), true);
  });
  it("GENERATOR_KINDS includes 'llm_emitted'", () => {
    assert.equal(GENERATOR_KINDS.includes("llm_emitted"), true);
  });
  it("SUPPORTED_CONTROLLERS has 12 entries", () => {
    assert.equal(SUPPORTED_CONTROLLERS.length, 12);
  });
  it("SUPPORTED_CONTROLLERS includes 'fanuc_30i'", () => {
    assert.equal(SUPPORTED_CONTROLLERS.includes("fanuc_30i"), true);
  });
  it("SUPPORTED_CONTROLLERS includes 'heidenhain_tnc640'", () => {
    assert.equal(SUPPORTED_CONTROLLERS.includes("heidenhain_tnc640"), true);
  });
  it("SUPPORTED_CONTROLLERS includes 'hurco_winmax'", () => {
    assert.equal(SUPPORTED_CONTROLLERS.includes("hurco_winmax"), true);
  });
  it("SAFETY_FLAG_KINDS has 8 entries", () => {
    assert.equal(SAFETY_FLAG_KINDS.length, 8);
  });
  it("SAFETY_FLAG_KINDS includes 'collision_risk'", () => {
    assert.equal(SAFETY_FLAG_KINDS.includes("collision_risk"), true);
  });
  it("REQUIRED_REQUEST_FIELDS = ['controllerId','operations']", () => {
    assert.deepEqual(REQUIRED_REQUEST_FIELDS, ["controllerId", "operations"]);
  });
  it("REQUIRED_RESULT_FIELDS includes 'gcodeText'", () => {
    assert.equal(REQUIRED_RESULT_FIELDS.includes("gcodeText"), true);
  });
});

describe("createPostGenBridge", () => {
  it("default bridgeId='default'", () => {
    assert.equal(createPostGenBridge().bridgeId, "default");
  });
  it("default fallbackChain = ['controller_direct','cam_bridge','legacy_postgen']", () => {
    assert.deepEqual(createPostGenBridge().fallbackChain, ["controller_direct", "cam_bridge", "legacy_postgen"]);
  });
  it("custom fallbackChain filters invalid entries", () => {
    const b = createPostGenBridge({ fallbackChain: ["cam_bridge", "fake_kind", "llm_emitted"] });
    assert.deepEqual(b.fallbackChain, ["cam_bridge", "llm_emitted"]);
  });
  it("starts with emitCount=0", () => {
    assert.equal(createPostGenBridge().emitCount, 0);
  });
});

describe("validateRequest", () => {
  const validReq = { controllerId: "fanuc_30i", operations: [{ op: "drill" }] };
  it("valid request → ok=true", () => {
    assert.equal(validateRequest(validReq).ok, true);
  });
  it("unsupported controllerId → ok=false", () => {
    const r = validateRequest({ ...validReq, controllerId: "fake_ctrl" });
    assert.equal(r.ok, false);
    assert.equal(r.errors[0].includes("unsupported controllerId"), true);
  });
  it("empty operations array → ok=false", () => {
    const r = validateRequest({ ...validReq, operations: [] });
    assert.equal(r.ok, false);
    assert.equal(r.errors.some((e) => e.includes("empty")), true);
  });
  it("operations not array → ok=false", () => {
    assert.equal(validateRequest({ ...validReq, operations: "not-array" }).ok, false);
  });
  it("missing controllerId → ok=false", () => {
    assert.equal(validateRequest({ operations: [{}] }).ok, false);
  });
  it("invalid preferredKind → ok=false", () => {
    assert.equal(validateRequest({ ...validReq, preferredKind: "fake" }).ok, false);
  });
  it("null req → ok=false", () => {
    assert.equal(validateRequest(null).ok, false);
  });
  it("variability: all 12 controllers accepted", () => {
    for (const c of SUPPORTED_CONTROLLERS) {
      assert.equal(validateRequest({ ...validReq, controllerId: c }).ok, true);
    }
  });
});

describe("validateResult", () => {
  const validRes = {
    gcodeText: "O1000\nM30\n",
    source: "controller_direct",
    controllerId: "fanuc_30i",
    confidence: 0.9,
  };
  it("valid result → ok=true", () => {
    assert.equal(validateResult(validRes).ok, true);
  });
  it("empty gcodeText → ok=false", () => {
    assert.equal(validateResult({ ...validRes, gcodeText: "" }).ok, false);
  });
  it("invalid source → ok=false", () => {
    assert.equal(validateResult({ ...validRes, source: "fake_src" }).ok, false);
  });
  it("invalid controllerId → ok=false", () => {
    assert.equal(validateResult({ ...validRes, controllerId: "fake_ctrl" }).ok, false);
  });
  it("confidence 1.5 → ok=false (out of range)", () => {
    assert.equal(validateResult({ ...validRes, confidence: 1.5 }).ok, false);
  });
  it("confidence -0.5 → ok=false", () => {
    assert.equal(validateResult({ ...validRes, confidence: -0.5 }).ok, false);
  });
  it("safetyFlags non-array → ok=false", () => {
    assert.equal(validateResult({ ...validRes, safetyFlags: "not-array" }).ok, false);
  });
  it("safetyFlags with invalid entry → ok=false", () => {
    assert.equal(validateResult({ ...validRes, safetyFlags: ["fake_flag"] }).ok, false);
  });
  it("safetyFlags with valid 'collision_risk' → ok=true", () => {
    assert.equal(validateResult({ ...validRes, safetyFlags: ["collision_risk"] }).ok, true);
  });
});

describe("registerGenerator", () => {
  it("valid kind + fn → registered", () => {
    let b = createPostGenBridge();
    b = registerGenerator(b, "controller_direct", syntheticGen({}));
    assert.equal(typeof b.generators.controller_direct, "function");
  });
  it("unknown kind 'fake' → null", () => {
    assert.equal(registerGenerator(createPostGenBridge(), "fake", () => null), null);
  });
  it("non-function → null", () => {
    assert.equal(registerGenerator(createPostGenBridge(), "controller_direct", "not-fn"), null);
  });
  it("immutable: original bridge unchanged", () => {
    const b0 = createPostGenBridge();
    registerGenerator(b0, "controller_direct", syntheticGen({}));
    assert.equal(b0.generators.controller_direct, undefined);
  });
});

describe("routePostGen", () => {
  const validReq = { controllerId: "fanuc_30i", operations: [{ op: "drill" }] };
  it("preferredKind 'cam_bridge' matches → uses cam_bridge", () => {
    let b = createPostGenBridge();
    b = registerGenerator(b, "controller_direct", syntheticGen({ source: "controller_direct" }));
    b = registerGenerator(b, "cam_bridge", syntheticGen({ source: "cam_bridge" }));
    const r = routePostGen(b, { ...validReq, preferredKind: "cam_bridge" });
    assert.equal(r.kind, "cam_bridge");
  });
  it("no preferred → first in fallback chain wins (controller_direct)", () => {
    let b = createPostGenBridge();
    b = registerGenerator(b, "controller_direct", syntheticGen({ source: "controller_direct" }));
    b = registerGenerator(b, "cam_bridge", syntheticGen({ source: "cam_bridge" }));
    const r = routePostGen(b, validReq);
    assert.equal(r.kind, "controller_direct");
  });
  it("first generator throws → falls through to next", () => {
    let b = createPostGenBridge();
    b = registerGenerator(b, "controller_direct", () => { throw new Error("boom"); });
    b = registerGenerator(b, "cam_bridge", syntheticGen({ source: "cam_bridge" }));
    const r = routePostGen(b, validReq);
    assert.equal(r.kind, "cam_bridge");
  });
  it("invalid request → ok=false with errors", () => {
    const b = createPostGenBridge();
    assert.equal(routePostGen(b, { /* missing fields */ }).ok, false);
  });
  it("no generators registered → triedKinds enumerates all 3 fallback entries", () => {
    const b = createPostGenBridge();
    const r = routePostGen(b, validReq);
    assert.equal(r.triedKinds.length, 3);
    assert.equal(r.triedKinds.every((t) => t.status === "not_registered"), true);
  });
});

describe("mergeGCodeOutputs", () => {
  it("3 outputs: prefers no-safety-flags entry even if lower confidence", () => {
    const outs = [
      { gcodeText: "G1", source: "controller_direct", controllerId: "fanuc_30i", confidence: 0.95, safetyFlags: ["collision_risk"] },
      { gcodeText: "G2", source: "cam_bridge", controllerId: "fanuc_30i", confidence: 0.8, safetyFlags: [] },
      { gcodeText: "G3", source: "legacy_postgen", controllerId: "fanuc_30i", confidence: 0.7, safetyFlags: [] },
    ];
    const m = mergeGCodeOutputs(outs);
    // 0.8 (no flags) beats 0.95 (flagged)
    assert.equal(m.source, "cam_bridge");
  });
  it("all outputs flagged → picks highest confidence among flagged", () => {
    const outs = [
      { gcodeText: "G1", source: "controller_direct", controllerId: "fanuc_30i", confidence: 0.7, safetyFlags: ["collision_risk"] },
      { gcodeText: "G2", source: "cam_bridge", controllerId: "fanuc_30i", confidence: 0.95, safetyFlags: ["coolant_missing_required"] },
    ];
    const m = mergeGCodeOutputs(outs);
    assert.equal(m.source, "cam_bridge");
    assert.equal(m.confidence, 0.95);
  });
  it("_provenance lists all valid entries with flagCount", () => {
    const outs = [
      { gcodeText: "G1", source: "controller_direct", controllerId: "fanuc_30i", confidence: 0.95, safetyFlags: ["collision_risk", "rapid_through_stock"] },
      { gcodeText: "G2", source: "cam_bridge", controllerId: "fanuc_30i", confidence: 0.8, safetyFlags: [] },
    ];
    const m = mergeGCodeOutputs(outs);
    const ctrlEntry = m._provenance.find((p) => p.source === "controller_direct");
    assert.equal(ctrlEntry.flagCount, 2);
  });
  it("invalid in array skipped", () => {
    const outs = [
      null,
      { gcodeText: "G1", source: "cam_bridge", controllerId: "fanuc_30i", confidence: 0.9, safetyFlags: [] },
    ];
    const m = mergeGCodeOutputs(outs);
    assert.equal(m.source, "cam_bridge");
  });
  it("all invalid → null", () => {
    assert.equal(mergeGCodeOutputs([null, undefined, {}]), null);
  });
  it("empty array → null", () => {
    assert.equal(mergeGCodeOutputs([]), null);
  });
  it("null → null", () => {
    assert.equal(mergeGCodeOutputs(null), null);
  });
});

describe("recordEmit", () => {
  it("increments emitCount 0 → 1", () => {
    const b1 = recordEmit(createPostGenBridge());
    assert.equal(b1.emitCount, 1);
  });
  it("immutable: original unchanged", () => {
    const b0 = createPostGenBridge();
    recordEmit(b0);
    assert.equal(b0.emitCount, 0);
  });
  it("null bridge → returns null", () => {
    assert.equal(recordEmit(null), null);
  });
});

describe("listRegisteredGenerators", () => {
  it("empty → []", () => {
    assert.deepEqual(listRegisteredGenerators(createPostGenBridge()), []);
  });
  it("returns sorted list", () => {
    let b = createPostGenBridge();
    b = registerGenerator(b, "llm_emitted", syntheticGen({}));
    b = registerGenerator(b, "cam_bridge", syntheticGen({}));
    b = registerGenerator(b, "controller_direct", syntheticGen({}));
    assert.deepEqual(listRegisteredGenerators(b), ["cam_bridge", "controller_direct", "llm_emitted"]);
  });
});

describe("summarizeBridge", () => {
  it("knownControllers=12, knownGeneratorKinds=4, knownSafetyFlags=8", () => {
    const s = summarizeBridge(createPostGenBridge());
    assert.equal(s.knownControllers, 12);
    assert.equal(s.knownGeneratorKinds, 4);
    assert.equal(s.knownSafetyFlags, 8);
  });
  it("emitCount reflects accumulated emits", () => {
    let b = createPostGenBridge();
    b = recordEmit(b);
    b = recordEmit(b);
    assert.equal(summarizeBridge(b).emitCount, 2);
  });
  it("null bridge → null", () => {
    assert.equal(summarizeBridge(null), null);
  });
});
