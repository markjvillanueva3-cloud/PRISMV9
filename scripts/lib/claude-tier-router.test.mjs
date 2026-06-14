// scripts/lib/claude-tier-router.test.mjs
// Tests for U-CLAUDE-TIER-ROUTE: the fable-vs-opus-vs-sonnet-vs-haiku decision per operator policy.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { refineTopTier, routeClaudeTier, CLAUDE_TIERS } from "./claude-tier-router.mjs";
import { CLAUDE_REASONING_MODEL } from "../../.claude/hooks/lib/ollama-cost-router.mjs";

describe("refineTopTier (split the top reserved tier fable-vs-opus)", () => {
  it("THINK task at the top tier -> fable", () => {
    assert.equal(refineTopTier({ claudeModel: CLAUDE_REASONING_MODEL, task: "brainstorm a plan to cover all angles" }), "fable");
    assert.equal(refineTopTier({ claudeModel: CLAUDE_REASONING_MODEL, taskClass: "reason" }), "fable");
  });
  it("BUILD task at the top tier -> opus", () => {
    assert.equal(refineTopTier({ claudeModel: CLAUDE_REASONING_MODEL, task: "implement the engine and wire the dispatcher" }), "opus");
    assert.equal(refineTopTier({ claudeModel: CLAUDE_REASONING_MODEL, taskClass: "codegen" }), "opus");
  });
  it("top tier with no signal -> fable (deep-think is the safer top-tier assumption)", () => {
    assert.equal(refineTopTier({ claudeModel: CLAUDE_REASONING_MODEL, task: "", taskClass: "" }), "fable");
  });
  it("a NON-top tier (sonnet/haiku) is returned UNCHANGED (only the top is refined)", () => {
    assert.equal(refineTopTier({ claudeModel: "sonnet", task: "brainstorm a plan" }), "sonnet");
    assert.equal(refineTopTier({ claudeModel: "haiku", task: "implement X" }), "haiku");
  });
});

describe("routeClaudeTier (primary raw-task router)", () => {
  it("FABLE: planning / brainstorming / deep reasoning / cover-all-angles", () => {
    assert.equal(routeClaudeTier({ task: "come up with a plan to cover all angles for model routing" }).tier, "fable");
    assert.equal(routeClaudeTier({ task: "brainstorm the architecture for the new subsystem" }).tier, "fable");
    assert.equal(routeClaudeTier({ task: "reason through why this AUROC is below the gate and the trade-offs" }).tier, "fable");
  });
  it("OPUS: heavy building / coding / wiring", () => {
    assert.equal(routeClaudeTier({ task: "implement the capability probe and wire it into the dispatcher" }).tier, "opus");
    assert.equal(routeClaudeTier({ task: "write the engine code and add the tests" }).tier, "opus");
    assert.equal(routeClaudeTier({ task: "refactor the routing module" }).tier, "opus");
  });
  it("SONNET: capable mid-tier (explain/summarize/document, not cheap-tier)", () => {
    // explain -> category "explanation" -> claudeFallbackModel = sonnet
    assert.equal(routeClaudeTier({ task: "explain how the hybrid RAG dense arm works" }).tier, "sonnet");
    assert.equal(routeClaudeTier({ task: "summarize the findings from the last run" }).tier, "sonnet");
  });
  it("HAIKU: trivial mechanical when kept on Claude (classify/format cheap-tier)", () => {
    // these match the classifier's cheap-tier classes -> category cheap -> claudeFallbackModel = haiku
    assert.equal(routeClaudeTier({ task: "triage this incoming error message" }).tier, "haiku"); // triage -> classify
    assert.equal(routeClaudeTier({ task: "convert this table to json format" }).tier, "haiku");  // format
  });
  it("a now-correctly-classified 'classify ...' task routes to haiku (cheap mechanical), post stem-fix", () => {
    // after U-CLASSIFY-STEM-FIX "classify ..." is properly the classify class -> cheap -> haiku
    assert.equal(routeClaudeTier({ task: "classify this operation into milling/turning/grinding" }).tier, "haiku");
  });
  it("a GENUINELY unknown task safe-defaults to sonnet (a capable tier, never a wrong cheap route)", () => {
    // a task the classifier truly can't bucket -> sonnet, NOT haiku (don't under-serve an unknown)
    assert.equal(routeClaudeTier({ task: "the part came back from heat treat yesterday afternoon" }).tier, "sonnet");
  });
  it("SAFETY-critical -> frontier (opus), never a cheap tier", () => {
    const r = routeClaudeTier({ task: "validate the collision-force safety margin for this toolpath" });
    assert.equal(r.tier, "opus");
    assert.equal(r.taskClass, "safety_critical");
  });
  it("every returned tier is a known Claude tier", () => {
    for (const t of ["plan the thing", "build the thing", "explain the thing", "classify the thing"]) {
      assert.ok(CLAUDE_TIERS.includes(routeClaudeTier({ task: t }).tier), `${t} -> not a known tier`);
    }
  });
  it("adversarial: empty / non-string task -> a valid tier, no throw", () => {
    assert.doesNotThrow(() => {
      assert.ok(CLAUDE_TIERS.includes(routeClaudeTier({ task: "" }).tier));
      assert.ok(CLAUDE_TIERS.includes(routeClaudeTier({ task: null }).tier));
    });
  });
});
