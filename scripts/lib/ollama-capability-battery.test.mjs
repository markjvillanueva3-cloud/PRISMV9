// scripts/lib/ollama-capability-battery.test.mjs
// Tests for U-OLLAMA-CAP-PROBE battery: the verifiers must reward CORRECT answers + reject wrong ones.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { norm, firstNumber, yesNo, TASK_BATTERY, scoreMatrix, autoOffloadCandidates } from "./ollama-capability-battery.mjs";

describe("norm / firstNumber / yesNo", () => {
  it("norm strips code fences + label prefixes + trims", () => {
    assert.equal(norm("```\nmilling\n```"), "milling");
    assert.equal(norm("Answer: turning"), "turning");
    assert.equal(norm(null), "");
  });
  it("firstNumber extracts signed int/float, null when none", () => {
    assert.equal(firstNumber("about 12.7 mm"), 12.7);
    assert.equal(firstNumber("-5"), -5);
    assert.equal(firstNumber("no digits"), null);
  });
  it("yesNo maps to bool, null when ambiguous", () => {
    assert.equal(yesNo("Yes, it is."), true);
    assert.equal(yesNo("no"), false);
    assert.equal(yesNo("maybe"), null);
  });
});

describe("TASK_BATTERY verifiers reward correct / reject wrong (R9: intent not format)", () => {
  const byId = Object.fromEntries(TASK_BATTERY.map((t) => [t.id, t]));

  it("classify-enum: correct label passes, wrong label fails", () => {
    const t = byId["classify-enum"], c = t.cases[0]; // expect milling
    assert.equal(t.verify("milling", c), true);
    assert.equal(t.verify("Answer: MILLING.", c), true); // norm + lowercase + strip dot
    assert.equal(t.verify("turning", c), false);
  });
  it("unit-convert: exact mm passes, wrong fails (1in -> 25.4)", () => {
    const t = byId["unit-convert"], c = t.cases[0];
    assert.equal(t.verify("25.4", c), true);
    assert.equal(t.verify("the answer is 25.4 mm", c), true);
    assert.equal(t.verify("25.0", c), false);
    assert.equal(t.verify("one inch", c), false);
  });
  it("extract-number: correct value passes", () => {
    const t = byId["extract-number"], c = t.cases[0]; // 12.7
    assert.equal(t.verify("12.7", c), true);
    assert.equal(t.verify("30", c), false); // the depth, not the bore
  });
  it("boolean-judgment: correct yes/no passes", () => {
    const t = byId["boolean-judgment"];
    assert.equal(t.verify("yes", t.cases[0]), true);   // 17-4PH IS stainless
    assert.equal(t.verify("yes", t.cases[1]), false);  // carbide is NOT thermoplastic
  });
  it("json-extract: valid JSON with the material passes; garbage fails", () => {
    const t = byId["json-extract"], c = t.cases[0];
    assert.equal(t.verify('{"material": "6061-T6 aluminum"}', c), true);
    assert.equal(t.verify("6061 aluminum", c), false); // not JSON
  });
  it("keyword-extract: >=3 keywords incl required passes", () => {
    const t = byId["keyword-extract"], c = t.cases[0];
    assert.equal(t.verify("vise, soft jaws, part", c), true);
    assert.equal(t.verify("only, two", c), false);
  });
  it("arithmetic: exact result passes, wrong fails", () => {
    const t = byId["arithmetic"], c = t.cases[0]; // 12.5*3.2 = 40
    assert.equal(t.verify("40", c), true);
    assert.equal(t.verify("the answer is 40", c), true);
    assert.equal(t.verify("41", c), false);
  });
  it("list-sort: exact sorted sequence passes; wrong order / wrong length fails", () => {
    const t = byId["list-sort"], c = t.cases[0]; // [3,1,2] -> [1,2,3]
    assert.equal(t.verify("1, 2, 3", c), true);
    assert.equal(t.verify("[1, 2, 3]", c), true);
    assert.equal(t.verify("3, 2, 1", c), false);
    assert.equal(t.verify("1, 2", c), false);
  });
});

describe("scoreMatrix + autoOffloadCandidates", () => {
  const results = [
    { taskId: "classify-enum", category: "classification", model: "m1", pass: true },
    { taskId: "classify-enum", category: "classification", model: "m1", pass: true },
    { taskId: "classify-enum", category: "classification", model: "m2", pass: true },
    { taskId: "classify-enum", category: "classification", model: "m2", pass: false },
    { taskId: "unit-convert", category: "deterministic-transform", model: "m1", pass: true },
  ];
  it("aggregates pass/total/rate per task per model", () => {
    const mx = scoreMatrix(results);
    assert.equal(mx["classify-enum"].models.m1.rate, 1.0);
    assert.equal(mx["classify-enum"].models.m2.rate, 0.5);
    assert.equal(mx["unit-convert"].models.m1.rate, 1.0);
  });
  it("autoOffloadCandidates lists only >=threshold (default 1.0)", () => {
    const cands = autoOffloadCandidates(scoreMatrix(results), 1.0);
    assert.ok(cands.some((c) => c.taskId === "classify-enum" && c.model === "m1"));
    assert.ok(cands.some((c) => c.taskId === "unit-convert" && c.model === "m1"));
    assert.ok(!cands.some((c) => c.model === "m2")); // m2 at 0.5 excluded
  });
  it("adversarial: empty / malformed results -> empty matrix", () => {
    assert.deepEqual(scoreMatrix(null), {});
    assert.deepEqual(autoOffloadCandidates({}), []);
  });
});
