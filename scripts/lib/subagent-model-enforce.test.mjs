// scripts/lib/subagent-model-enforce.test.mjs
// Tests for U-SUBAGENT-MODEL-ENFORCE: the anti-leak deny (mechanical task on opus/fable).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isExpensiveModel, decideSubagentModel } from "./subagent-model-enforce.mjs";

describe("isExpensiveModel", () => {
  it("true for opus/fable (any casing/suffix), false for sonnet/haiku/ollama/empty", () => {
    assert.equal(isExpensiveModel("opus"), true);
    assert.equal(isExpensiveModel("claude-opus-4-8"), true);
    assert.equal(isExpensiveModel("Fable"), true);
    assert.equal(isExpensiveModel("sonnet"), false);
    assert.equal(isExpensiveModel("haiku"), false);
    assert.equal(isExpensiveModel("qwen2.5-coder:32b"), false);
    assert.equal(isExpensiveModel(""), false);
    assert.equal(isExpensiveModel(null), false);
  });
});

describe("decideSubagentModel", () => {
  it("DENY: a mechanical task dispatched to opus is the anti-leak case", () => {
    const r = decideSubagentModel({ prompt: "summarize the last run's findings", model: "opus" });
    assert.equal(r.action, "deny");
    assert.equal(r.recommend, "sonnet"); // summarize -> sonnet
    assert.match(r.reason, /mechanical task/);
  });
  it("DENY: a mechanical task on fable -> recommend the cheap tier", () => {
    const r = decideSubagentModel({ prompt: "classify this part into a bucket", model: "fable" });
    assert.equal(r.action, "deny");
    assert.equal(r.recommend, "haiku"); // classify -> haiku
  });

  it("ALLOW: a genuine deep-reasoning task on fable is justified", () => {
    const r = decideSubagentModel({ prompt: "brainstorm the architecture and reason through the trade-offs", model: "fable" });
    assert.equal(r.action, "allow");
  });
  it("ALLOW: a heavy build task on opus is justified", () => {
    const r = decideSubagentModel({ prompt: "implement the engine and wire the dispatcher", model: "opus" });
    assert.equal(r.action, "allow");
  });
  it("ALLOW: a mechanical task already on a cheap model (sonnet/haiku) -> never over-spend", () => {
    assert.equal(decideSubagentModel({ prompt: "summarize this", model: "sonnet" }).action, "allow");
    assert.equal(decideSubagentModel({ prompt: "classify this", model: "haiku" }).action, "allow");
  });
  it("ALLOW: no model specified -> inherits parent, not enforced", () => {
    assert.equal(decideSubagentModel({ prompt: "summarize this", model: undefined }).action, "allow");
    assert.equal(decideSubagentModel({ prompt: "summarize this" }).action, "allow");
  });
  it("ALLOW: safety task on opus is justified (frontier, never a cheap tier)", () => {
    const r = decideSubagentModel({ prompt: "validate the collision-force safety margin", model: "opus" });
    assert.equal(r.action, "allow");
  });
  it("adversarial: empty / non-string prompt with an expensive model -> deny (mechanical default), no throw", () => {
    assert.doesNotThrow(() => {
      const r = decideSubagentModel({ prompt: "", model: "opus" });
      // empty prompt -> unknown class -> sonnet recommended -> opus is a leak -> deny
      assert.equal(r.action, "deny");
      assert.equal(r.recommend, "sonnet");
    });
  });
});
