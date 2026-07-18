// scripts/task-graph-template.test.mjs
//
// Tests for U-TASK-GRAPH-TEMPLATE. R9: assertions encode WHY -- the template's whole
// value is surfacing the GATES that will hard-stop a task (so a chat complies first
// try) and the SAME ordered routine every time; a test must fail if a gate is hidden
// or the routine shape drifts. Includes a LIVE integration test against the real four
// artifacts (R15 validate -- prove it composes real data, not just fixtures).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  rankForClass,
  splitFeatures,
  composeTemplate,
  renderTemplate,
  fillTemplate,
} from "./task-graph-template.mjs";

// ---- rankForClass ----------------------------------------------------------

test("rankForClass: returns 1-based rank + count/pct from the mined map", () => {
  const map = { total: 4870, classes: [{ taskClass: "build", count: 1932, pct: 39.7 }, { taskClass: "fix", count: 400, pct: 8.2 }] };
  assert.deepEqual(rankForClass(map, "build"), { rank: 1, count: 1932, pct: 39.7, total: 4870 });
  assert.deepEqual(rankForClass(map, "fix"), { rank: 2, count: 400, pct: 8.2, total: 4870 });
});

test("rankForClass: null when class absent or map malformed", () => {
  assert.equal(rankForClass({ classes: [] }, "build"), null);
  assert.equal(rankForClass(null, "build"), null);
  assert.equal(rankForClass({}, "build"), null);
});

// ---- splitFeatures ---------------------------------------------------------

test("splitFeatures: separates block-gate (gates) from advisory-inject (advisors)", () => {
  const feats = [
    { id: "g1", kind: "block-gate" },
    { id: "a1", kind: "advisory-inject" },
    { id: "g2", kind: "block-gate" },
  ];
  const { gates, advisors } = splitFeatures(feats);
  assert.deepEqual(gates.map((f) => f.id), ["g1", "g2"]);
  assert.deepEqual(advisors.map((f) => f.id), ["a1"]);
});

test("splitFeatures: empty/null safe", () => {
  assert.deepEqual(splitFeatures(null), { gates: [], advisors: [] });
  assert.deepEqual(splitFeatures([]), { gates: [], advisors: [] });
  // an unexpected kind is silently dropped (not a gate, not an advisor)
  assert.deepEqual(splitFeatures([{ id: "x", kind: "mutator" }]), { gates: [], advisors: [] });
});

// ---- composeTemplate -------------------------------------------------------

const POLICY = {
  substrateLadder: ["dedup-check", "master-graph", "claude"],
  modelTier: "opus for design",
  commands: ["/dedup", "/forge-triple"],
  autoInvoke: ["/dedup"],
  antipattern: "building before /dedup",
  loopCron: { loop: "yes -- per unit", cron: "no" },
  execution: { harness: "vitest", hermes: "forge-team", ollama: "qwen2.5-coder:32b" },
};

test("composeTemplate: fills the graph from all parts; classCommands excludes curated + caps", () => {
  const t = composeTemplate({
    prompt: "build a new engine",
    route: { taskClass: "build", confidence: 0.5, policy: POLICY },
    rank: { rank: 1, count: 1932, pct: 39.7, total: 4870 },
    classCmds: [{ name: "dedup" }, { name: "wire-unwired" }, { name: "forge-triple" }, { name: "scope" }], // dedup+forge-triple are curated -> excluded
    classFeatures: [{ id: "duplication-hard-block", kind: "block-gate", knob: "PRISM_X" }, { id: "build-state-inject", kind: "advisory-inject" }],
    universalFeatures: [{ id: "scrutinize-before-stop", kind: "block-gate" }, { id: "master-index", kind: "advisory-inject" }],
  });
  assert.equal(t.taskClass, "build");
  assert.equal(t.confidence, 0.5);
  assert.deepEqual(t.workflow.classCommands, ["wire-unwired", "scope"]); // curated dedup/forge-triple removed
  assert.equal(t.features.classGates[0].id, "duplication-hard-block");
  assert.equal(t.features.classGates[0].knob, "PRISM_X");
  assert.equal(t.features.classAdvisors[0].id, "build-state-inject");
  assert.equal(t.features.universalGates[0].id, "scrutinize-before-stop");
  assert.equal(t.features.universalAdvisorCount, 1);
});

test("composeTemplate: empty/missing parts degrade safely (fail-open)", () => {
  const t = composeTemplate({
    prompt: "x", route: { taskClass: "build", confidence: 0, policy: {} },
    rank: null, classCmds: null, classFeatures: null, universalFeatures: null,
  });
  assert.equal(t.taskClass, "build");
  assert.deepEqual(t.workflow.substrateLadder, []);
  assert.deepEqual(t.features.classGates, []);
  assert.equal(t.features.universalGateCount, 0);
  assert.equal(t.rank, null);
});

test("composeTemplate: universalGates capped at 8 but count preserves the true total", () => {
  const many = Array.from({ length: 20 }, (_, i) => ({ id: `g${i}`, kind: "block-gate" }));
  const t = composeTemplate({
    prompt: "x", route: { taskClass: "build", confidence: 0.5, policy: POLICY },
    rank: null, classCmds: [], classFeatures: [], universalFeatures: many,
  });
  assert.equal(t.features.universalGates.length, 8);   // capped for render hygiene
  assert.equal(t.features.universalGateCount, 20);      // true total preserved (no silent loss, R12)
});

// ---- renderTemplate --------------------------------------------------------

test("renderTemplate: produces the stable numbered routine with gates surfaced + mute knobs", () => {
  const t = composeTemplate({
    prompt: "build a new engine",
    route: { taskClass: "build", confidence: 0.5, policy: POLICY },
    rank: { rank: 1, count: 1932, pct: 39.7, total: 4870 },
    classCmds: [], classFeatures: [{ id: "duplication-hard-block", kind: "block-gate", knob: "PRISM_DUP" }],
    universalFeatures: [{ id: "scrutinize-before-stop", kind: "block-gate" }],
  });
  const out = renderTemplate(t);
  assert.match(out, /# TASK-GRAPH: build/);
  assert.match(out, /#1 most-common \(1932x, 39.7%/);
  assert.match(out, /1\. SUBSTRATES.*dedup-check -> master-graph -> claude/);
  assert.match(out, /4\. GATES that MAY hard-stop you \(if not env-muted\):.*duplication-hard-block\(mute:PRISM_DUP\)/);
  assert.match(out, /universal: scrutinize-before-stop/);
  assert.match(out, /8\. AVOID: building before \/dedup/);
});

test("renderTemplate: empty/invalid template -> empty string (no crash)", () => {
  assert.equal(renderTemplate(null), "");
  assert.equal(renderTemplate({}), "");
});

test("composeTemplate+renderTemplate: surfaces doneWhen (loop-until-zero gate) when the class carries it", () => {
  const policyWithDone = { ...POLICY, doneWhen: "LOOP until ZERO open gaps + bugs + errors + conflicts" };
  const t = composeTemplate({
    prompt: "build x", route: { taskClass: "build", confidence: 0.5, policy: policyWithDone },
    rank: null, classCmds: [], classFeatures: [], universalFeatures: [],
  });
  assert.equal(t.workflow.doneWhen, "LOOP until ZERO open gaps + bugs + errors + conflicts");
  const out = renderTemplate(t);
  assert.match(out, /DONE-WHEN \(loop until zero\):.*ZERO open gaps/);
  // a class without doneWhen renders no DONE-WHEN line (regression guard)
  const t2 = composeTemplate({ prompt: "x", route: { taskClass: "build", confidence: 0.5, policy: POLICY }, rank: null, classCmds: [], classFeatures: [], universalFeatures: [] });
  assert.equal(/DONE-WHEN/.test(renderTemplate(t2)), false);
});

// ---- fillTemplate (LIVE integration over the real four artifacts) ----------

test("fillTemplate: LIVE -- an unambiguous build prompt routes to build + surfaces real hard gates", async () => {
  // unambiguous build lead (no physics/domain signal) -> must classify EXACTLY build
  // (R9: pin the intent; a build->domain misroute must FAIL, not silently pass).
  const t = await fillTemplate("build and wire a new dispatcher action and add tests");
  assert.equal(t.taskClass, "build");
  assert.ok(Array.isArray(t.workflow.substrateLadder) && t.workflow.substrateLadder.length > 0);
  assert.ok(t.workflow.antipattern, "policy antipattern must be present");
  // the catalog must have contributed real features (gates or advisors, class or universal)
  const totalFeatures = t.features.classGates.length + t.features.classAdvisors.length +
    t.features.universalGates.length + t.features.universalAdvisorCount;
  assert.ok(totalFeatures > 0, "live catalog must contribute >=1 feature");
  // render must produce the stable routine
  assert.match(renderTemplate(t), /# TASK-GRAPH:/);
});

test("fillTemplate: LIVE -- empty prompt degrades to build default, still fully filled", async () => {
  const t = await fillTemplate("");
  assert.equal(t.taskClass, "build");
  assert.ok(t.workflow && t.features, "structure present even on empty prompt");
});
