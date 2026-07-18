// .claude/hooks/__tests__/post-recommendation-capture.test.mjs
// U-OUTCOME-INPUT-CAPTURE: the post-recommendation-capture hook must surface the
// dispatcher's determining inputs into the event context so the outcome->LoRA SFT
// converter can build a learnable pair (instead of skipping an input-barren event).
//
// Run: node .claude/hooks/__tests__/post-recommendation-capture.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractDeterminingInputs } from "../post-recommendation-capture.mjs";
import { buildInstruction, outcomeToAlpaca } from "../../../scripts/lib/outcome-to-alpaca-converter.mjs";

describe("extractDeterminingInputs", () => {
  it("happy: a real lathe speed_feed_recommend input -> material/tool/operation", () => {
    const got = extractDeterminingInputs({
      action: "speed_feed_recommend",
      material: "4140 steel",
      tool: "CNMG432",
      operation: "turning",
    });
    assert.equal(got.material, "4140 steel");
    assert.equal(got.tool_id, "CNMG432"); // `tool` alias -> canonical tool_id
    assert.equal(got.operation, "turning");
  });

  it("normalizes the wide variety of dispatcher param spellings", () => {
    const got = extractDeterminingInputs({
      materialName: "Inconel 718",
      toolDiameter: 6,
      cut_type: "roughing",
      iso_group: "S",
      machineId: "okuma-genos",
    });
    assert.equal(got.material, "Inconel 718");
    assert.equal(got.operation, "roughing");          // cut_type alias
    assert.equal(got.tool_diameter_mm, "6");          // number coerced to string
    assert.equal(got.iso, "S");
    assert.equal(got.machine_id, "okuma-genos");
  });

  it("reads inputs nested one level under a wrapper key (params/input/request)", () => {
    const got = extractDeterminingInputs({ action: "sinker_calculate", params: { material: "D2", op: "burn" } });
    assert.equal(got.material, "D2");
    assert.equal(got.operation, "burn");
  });

  it("first non-empty alias wins; empty/whitespace strings are skipped", () => {
    const got = extractDeterminingInputs({ material: "   ", material_name: "A2 tool steel" });
    assert.equal(got.material, "A2 tool steel");
  });

  it("failure: no determining inputs -> {} (harmless; event still carries engine/action/hook)", () => {
    assert.deepEqual(extractDeterminingInputs({ action: "speed_feed_recommend" }), {});
  });

  it("adversarial: null / non-object / array -> {} (never throws)", () => {
    assert.doesNotThrow(() => {
      assert.deepEqual(extractDeterminingInputs(null), {});
      assert.deepEqual(extractDeterminingInputs("x"), {});
      assert.deepEqual(extractDeterminingInputs(42), {});
      assert.deepEqual(extractDeterminingInputs([{ material: "x" }]), {}); // array is not a param object
    });
  });

  it("adversarial: non-scalar param values (objects/arrays) are not surfaced", () => {
    const got = extractDeterminingInputs({ material: { name: "x" }, operation: ["roughing"], tool: "T1" });
    assert.ok(!("material" in got));   // object value rejected
    assert.ok(!("operation" in got));  // array value rejected
    assert.equal(got.tool_id, "T1");   // the one valid scalar still captured
  });
});

describe("round-trip: closes the converter's input-barren skip (the actual gap)", () => {
  // Mirrors the hook's context construction: {engine, action, hook} + extracted inputs.
  function hookContext(toolName, action, toolInput) {
    return { engine: toolName, action, hook: "post-recommendation-capture", ...extractDeterminingInputs(toolInput) };
  }

  it("BEFORE: a bare lathe context (no inputs) is NOT learnable -> converter skips it", () => {
    const bare = { domain: "lathe", context: { engine: "mcp__prism__prism_turning", action: "speed_feed_recommend", hook: "post-recommendation-capture" }, recommended: { sfm: 400, ipr: 0.012 } };
    assert.equal(buildInstruction(bare), null);   // the input-barren skip we observed live (3,459 lathe rows)
    assert.equal(outcomeToAlpaca(bare), null);
  });

  it("AFTER: the enriched context yields a learnable (state -> recommendation) pair", () => {
    const ctx = hookContext("mcp__prism__prism_turning", "speed_feed_recommend", { action: "speed_feed_recommend", material: "4140 steel", tool: "CNMG432", operation: "turning" });
    const event = { domain: "lathe", context: ctx, recommended: { sfm: 400, ipr: 0.012 } };
    const pair = outcomeToAlpaca(event);
    assert.ok(pair, "enriched event must convert to a pair");
    assert.match(pair.instruction, /material=4140 steel/);
    assert.match(pair.instruction, /operation=turning/);
    assert.match(pair.instruction, /tool=CNMG432/);   // converter strips _id -> tool=
    assert.match(pair.output, /sfm=400/);
    assert.match(pair.output, /ipr=0.012/);
  });
});
