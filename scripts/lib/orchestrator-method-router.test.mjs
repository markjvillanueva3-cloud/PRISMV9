// scripts/lib/orchestrator-method-router.test.mjs
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  METHODS, METHOD_COMPATIBILITY, CONTROLLER_METHOD_SUPPORT, routeMethod,
} from "./orchestrator-method-router.mjs";

describe("constants frozen + complete", () => {
  it("METHODS has 4 entries (cam/macro/conversational/on_machine)", () => {
    assert.equal(METHODS.length, 4);
    for (const m of ["cam", "macro", "conversational", "on_machine"]) {
      assert.ok(METHODS.includes(m));
    }
  });

  it("METHOD_COMPATIBILITY covers all methods", () => {
    for (const m of METHODS) {
      assert.ok(METHOD_COMPATIBILITY[m]);
    }
  });

  it("8 controller dialects supported", () => {
    const expected = ["fanuc", "okuma", "haas", "mazak", "heidenhain", "siemens", "mitsubishi", "hurco"];
    for (const c of expected) {
      assert.ok(CONTROLLER_METHOD_SUPPORT[c], `missing ${c}`);
    }
  });
});

describe("routeMethod — happy paths across controllers", () => {
  it("Fanuc + production volume + simple → macro wins over CAM", () => {
    const r = routeMethod({ controller: "fanuc", volumeTier: "production_10k", complexity: "simple", operatorSkill: "expert" });
    assert.equal(r.primary, "macro");
    assert.ok(r.alternates.includes("cam"));
  });

  it("Mazak + simple + expert → conversational wins", () => {
    const r = routeMethod({ controller: "mazak", volumeTier: "low_10", complexity: "simple", operatorSkill: "expert" });
    assert.equal(r.primary, "conversational");
  });

  it("Haas + complex part → CAM (conversational not for complex)", () => {
    const r = routeMethod({ controller: "haas", volumeTier: "low_10", complexity: "complex", operatorSkill: "expert" });
    assert.equal(r.primary, "cam");
  });

  it("Heidenhain + simple + low volume → conversational or CAM", () => {
    const r = routeMethod({ controller: "heidenhain", volumeTier: "low_10", complexity: "simple", operatorSkill: "expert" });
    assert.ok(["cam", "conversational"].includes(r.primary));
  });

  it("Siemens + production → CAM or macro", () => {
    const r = routeMethod({ controller: "siemens", volumeTier: "production_10k", complexity: "simple", operatorSkill: "expert" });
    assert.ok(["cam", "macro"].includes(r.primary));
  });

  it("priors boost previously-winning methods", () => {
    const noPriors = routeMethod({ controller: "fanuc", volumeTier: "med_100", complexity: "medium", operatorSkill: "standard" });
    const macroPrior = routeMethod({ controller: "fanuc", volumeTier: "med_100", complexity: "medium", operatorSkill: "standard", priors: { macro: 50 } });
    // With heavy macro prior, macro should rank higher than without
    const macroRankNoPriors = [noPriors.primary, ...noPriors.alternates].indexOf("macro");
    const macroRankWithPrior = [macroPrior.primary, ...macroPrior.alternates].indexOf("macro");
    assert.ok(macroRankWithPrior <= macroRankNoPriors);
  });
});

describe("R12 fail-loud: input validation", () => {
  it("rejects unknown controller", () => {
    assert.throws(() => routeMethod({ controller: "mythical", volumeTier: "low_10", complexity: "simple", operatorSkill: "expert" }), /unknown controller/);
  });
  it("rejects missing volumeTier", () => {
    assert.throws(() => routeMethod({ controller: "fanuc", complexity: "simple", operatorSkill: "expert" }), /volumeTier required/);
  });
  it("rejects missing complexity", () => {
    assert.throws(() => routeMethod({ controller: "fanuc", volumeTier: "low_10", operatorSkill: "expert" }), /complexity required/);
  });
  it("rejects missing operatorSkill", () => {
    assert.throws(() => routeMethod({ controller: "fanuc", volumeTier: "low_10", complexity: "simple" }), /operatorSkill required/);
  });
});

describe("incompatibility surfacing", () => {
  it("returns null primary when no method compatible (out-of-schema volume)", () => {
    // No method's compat list includes 'experimental_future_tier' → all filter out
    const r = routeMethod({ controller: "fanuc", volumeTier: "experimental_future_tier", complexity: "simple", operatorSkill: "expert" });
    assert.equal(r.primary, null);
    assert.equal(r.alternates.length, 0);
    assert.match(r.reasoning[0], /no method compatible/);
  });
});
