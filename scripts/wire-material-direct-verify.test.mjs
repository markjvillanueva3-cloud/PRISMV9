import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const DISP = "H:/prism/mcp-server/src/tools/dispatchers/dataDispatcher.ts";
const ACTIONS = ["material_harvest", "material_hardness_classify", "fusion_material_physics_profile", "quoting_material_get"];
const CALLS = [
  "MaterialHarvesterEngine.harvest(",
  "MaterialHardnessStateClassifierEngine.classifyBand(",
  "fusionMaterialPhysicsBridge.getPhysicsProfile(",
  "QuotingMaterialBridgeEngine.getMaterialForQuote(",
];

describe("WIRE-MATERIAL-DIRECT-MS0 anti-regression", () => {
  const d = readFileSync(DISP, "utf8");
  it("4 actions in the enum", () => {
    for (const a of ACTIONS) assert.ok(d.includes('"' + a + '"'), 'missing "' + a + '"');
  });
  it("4 dispatch cases", () => {
    for (const a of ACTIONS) assert.ok(d.includes('case "' + a + '"'), 'case missing for ' + a);
  });
  it("each case calls correct method", () => {
    for (const c of CALLS) assert.ok(d.includes(c), "missing call: " + c);
  });
  it("doctrine header present", () => {
    assert.ok(d.includes("WIRE-MATERIAL-DIRECT-MS0"), "doctrine header missing");
  });
});
