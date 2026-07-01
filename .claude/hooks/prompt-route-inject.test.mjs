// prompt-route-inject.test.mjs
// Tests for U-PROMPT-ROUTE-INJECT pure functions. Real reference-value asserts (R9).
import { test } from "node:test";
import assert from "node:assert/strict";
import { humanCore, rankFor, renderRouteBlock, renderClassCommandsLine, renderLoopCronLine, renderExecutionLine, renderGatesLine } from "./prompt-route-inject.mjs";
import { TASK_CLASS_POLICY, taskClasses } from "../../scripts/lib/feature-routing-graph.mjs";

const POLICY = {
  substrateLadder: ["master-graph", "obsidian", "claude"],
  modelTier: "opus",
  commands: ["/dedup", "/forge-triple"],
  autoInvoke: ["/dedup"],
  antipattern: "building before /dedup",
};
const MAP = {
  total: 100,
  classes: [
    { taskClass: "build", count: 40, pct: 40 },
    { taskClass: "learn", count: 19, pct: 19 },
    { taskClass: "fix", count: 11, pct: 11 },
  ],
};

// ---- humanCore -------------------------------------------------------------
test("humanCore: free-text prompt passes through", () => {
  assert.equal(humanCore("build the widget engine"), "build the widget engine");
});
test("humanCore: command-args is the directive", () => {
  assert.equal(humanCore("<command-name>/checkin-alpha</command-name> <command-args>reorient to alpha</command-args>"), "reorient to alpha");
});
test("humanCore: strips an appended system-reminder block", () => {
  assert.equal(humanCore("do the thing\n<system-reminder>injected</system-reminder>"), "do the thing");
});
test("humanCore: empty / null", () => {
  assert.equal(humanCore(""), "");
  assert.equal(humanCore(null), "");
});
test("humanCore: bare slash command (no args) -> empty (pure ceremony, no route noise)", () => {
  assert.equal(humanCore("<command-message>checkin-alpha</command-message> <command-name>/checkin-alpha</command-name>"), "");
});

// ---- rankFor ---------------------------------------------------------------
test("rankFor: returns rank/count/pct for a present class", () => {
  assert.deepEqual(rankFor(MAP, "build"), { rank: 1, count: 40, pct: 40, total: 100 });
  assert.deepEqual(rankFor(MAP, "fix"), { rank: 3, count: 11, pct: 11, total: 100 });
});
test("rankFor: absent class or null map -> null", () => {
  assert.equal(rankFor(MAP, "quote"), null);
  assert.equal(rankFor(null, "build"), null);
  assert.equal(rankFor({}, "build"), null);
});

// ---- renderRouteBlock ------------------------------------------------------
test("renderRouteBlock: renders ordered ops + rank + avoid", () => {
  const b = renderRouteBlock("build", POLICY, { rank: 1, count: 40, pct: 40, total: 100 });
  assert.match(b, /ROUTE -- task class: build/);
  assert.match(b, /#1 most-common task type \(40x, 40% of history\)/);
  assert.match(b, /substrates: master-graph -> obsidian -> claude/);
  assert.match(b, /commands: \/dedup -> \/forge-triple/);
  assert.match(b, /auto-fire now: \/dedup/);
  assert.match(b, /AVOID: building before \/dedup/);
});
test("renderRouteBlock: no rank (zero-count class) omits the rank phrase", () => {
  const b = renderRouteBlock("quote", POLICY, { rank: 7, count: 0, pct: 0, total: 100 });
  assert.match(b, /ROUTE -- task class: quote/);
  assert.equal(/most-common task type/.test(b), false);
});
test("renderRouteBlock: null policy -> null", () => {
  assert.equal(renderRouteBlock("build", null, null), null);
});
test("renderRouteBlock: policy without autoInvoke omits the auto-fire line", () => {
  const b = renderRouteBlock("plan", { substrateLadder: ["a", "b"], modelTier: "opus", commands: ["/forge"], autoInvoke: [], antipattern: "x" }, null);
  assert.equal(/auto-fire now/.test(b), false);
});

// ---- renderClassCommandsLine (U-SLASH-PLANS) -------------------------------
const CLASS_PLAN = [
  { name: "dedup", when: "check dups", archived: false, confidence: 0.9 },
  { name: "forge-triple", when: "engine+skill+hook", archived: false, confidence: 0.8 },
  { name: "wire-unwired", when: "wire orphans", archived: false, confidence: 0.7 },
  { name: "old-build", when: "legacy", archived: true, confidence: 0.6 },
];
test("renderClassCommandsLine: null when no class plan", () => {
  assert.equal(renderClassCommandsLine("build", [], ["/dedup"]), null);
  assert.equal(renderClassCommandsLine("build", undefined, ["/dedup"]), null);
});
test("renderClassCommandsLine: excludes curated + archived, shows extras + query pointer", () => {
  const line = renderClassCommandsLine("build", CLASS_PLAN, ["/dedup", "/forge-triple"]);
  assert.match(line, /\+4 build-class commands/);          // full count of the class
  assert.match(line, /\/wire-unwired/);                    // extra (not curated, not archived)
  assert.equal(/\/dedup\b/.test(line), false);             // curated excluded
  assert.equal(/old-build/.test(line), false);             // archived excluded
  assert.match(line, /--query build/);                     // pointer to full table
});
test("renderClassCommandsLine: all curated -> '(all curated above)' but keeps count + pointer", () => {
  const line = renderClassCommandsLine("build", CLASS_PLAN.slice(0, 2), ["/dedup", "/forge-triple"]);
  assert.match(line, /all curated above/);
  assert.match(line, /\+2 build-class commands/);
});
test("renderRouteBlock: WITH classPlan appends the +N line; WITHOUT keeps old behavior", () => {
  const withPlan = renderRouteBlock("build", POLICY, null, CLASS_PLAN);
  assert.match(withPlan, /\+4 build-class commands/);
  const without = renderRouteBlock("build", POLICY, null);  // 3-arg backward-compat
  assert.equal(/build-class commands/.test(without), false);
});

// ---- renderLoopCronLine (U-LOOP-CRON-POLICY) -------------------------------
test("renderLoopCronLine: loop=yes -> LOOP clause", () => {
  const l = renderLoopCronLine({ loop: "yes -- one unit/iter", cron: "no" });
  assert.match(l, /loop\/cron: LOOP yes -- one unit\/iter/);
  assert.equal(/CRON/.test(l), false);
});
test("renderLoopCronLine: cron=yes -> CRON clause", () => {
  const l = renderLoopCronLine({ loop: "no", cron: "yes -- nightly ingest" });
  assert.match(l, /CRON yes -- nightly ingest/);
  assert.equal(/LOOP/.test(l), false);
});
test("renderLoopCronLine: both yes -> both clauses joined", () => {
  const l = renderLoopCronLine({ loop: "yes -- a", cron: "yes -- b" });
  assert.match(l, /LOOP yes -- a \| CRON yes -- b/);
});
test("renderLoopCronLine: both no / null / missing -> null (one-shot classes stay silent)", () => {
  assert.equal(renderLoopCronLine({ loop: "no -- one-shot", cron: "no" }), null);
  assert.equal(renderLoopCronLine(null), null);
  assert.equal(renderLoopCronLine(undefined), null);
});
test("renderRouteBlock: appends loop/cron line when policy.loopCron worthwhile + showLoopCron; suppressed when false", () => {
  const p = { ...POLICY, loopCron: { loop: "yes -- iter", cron: "no" } };
  assert.match(renderRouteBlock("build", p, null, null, true), /loop\/cron: LOOP yes -- iter/);
  assert.equal(/loop\/cron/.test(renderRouteBlock("build", p, null, null, false)), false);  // knob off
  assert.equal(/loop\/cron/.test(renderRouteBlock("build", POLICY, null, null, true)), false);  // no loopCron field
});

// ---- live TASK_CLASS_POLICY completeness invariant -------------------------
test("TASK_CLASS_POLICY: every class carries a loopCron {loop, cron} (U-LOOP-CRON-POLICY coverage)", () => {
  const classes = taskClasses();
  assert.ok(classes.length >= 12);
  for (const cls of classes) {
    const lc = TASK_CLASS_POLICY[cls].loopCron;
    assert.ok(lc && typeof lc.loop === "string" && lc.loop.length > 0, `${cls} missing loopCron.loop`);
    assert.ok(typeof lc.cron === "string" && lc.cron.length > 0, `${cls} missing loopCron.cron`);
  }
});

// ---- renderExecutionLine (U-EXEC-POLICY) -----------------------------------
test("renderExecutionLine: real harness+hermes+ollama -> exec line with all three clauses", () => {
  const l = renderExecutionLine({ harness: "Workflow", hermes: "ask-hermes fan-out", ollama: "qwen2.5-coder:32b" });
  assert.match(l, /^ {2}exec: /);
  assert.match(l, /harness: Workflow/);
  assert.match(l, /hermes: ask-hermes fan-out/);
  assert.match(l, /ollama: qwen2.5-coder:32b/);
});
test("renderExecutionLine: 'no'/'none' dims are suppressed (judgment-only stays terse)", () => {
  const l = renderExecutionLine({ harness: "none -- one-shot", hermes: "no -- direct lookup", ollama: "qwen2.5-coder:1.5b summarize" });
  assert.equal(/harness:/.test(l), false);
  assert.equal(/hermes:/.test(l), false);
  assert.match(l, /ollama: qwen2.5-coder:1.5b summarize/);
});
test("renderExecutionLine: every dim suppressed (safety class) / null / undefined -> null", () => {
  assert.equal(renderExecutionLine({ harness: "none", hermes: "no", ollama: "no -- safety" }), null);
  assert.equal(renderExecutionLine(null), null);
  assert.equal(renderExecutionLine(undefined), null);
});
test("renderExecutionLine: the consensus dim (4th, octopus) renders when present, suppressed when absent or 'no'", () => {
  // present -> the 4th clause appears alongside the base three (additive, not a replacement)
  const withC = renderExecutionLine({ harness: "scrutiny-3way", hermes: "3 reviewer Agents", ollama: "deepseek-r1:14b advisory", consensus: "prism_ai:consensus_decide cross-vendor escalation" });
  assert.match(withC, /consensus: prism_ai:consensus_decide cross-vendor escalation/);
  assert.match(withC, /harness: scrutiny-3way/);
  // absent consensus key -> no consensus clause (the base-3 classes are unchanged)
  const noKey = renderExecutionLine({ harness: "Workflow", hermes: "no", ollama: "qwen2.5-coder:32b" });
  assert.equal(/consensus:/.test(noKey), false);
  // a 'no' consensus value is suppressed like the other dims
  const suppressed = renderExecutionLine({ harness: "Workflow", hermes: "no", ollama: "no", consensus: "no -- not applicable" });
  assert.equal(/consensus:/.test(suppressed), false);
});
test("renderRouteBlock: appends exec line when policy.execution has real dims + showLoopCron; suppressed when false / absent", () => {
  const p = { ...POLICY, loopCron: { loop: "no", cron: "no" }, execution: { harness: "Workflow", hermes: "no", ollama: "qwen2.5-coder:32b" } };
  const on = renderRouteBlock("build", p, null, null, true);
  assert.match(on, /exec: harness: Workflow \| ollama: qwen2.5-coder:32b/);  // hermes "no" suppressed
  assert.equal(/exec:/.test(renderRouteBlock("build", p, null, null, false)), false);   // knob off
  assert.equal(/exec:/.test(renderRouteBlock("build", POLICY, null, null, true)), false); // no execution field
});

// ---- live TASK_CLASS_POLICY execution completeness invariant ---------------
test("TASK_CLASS_POLICY: every class carries execution {harness, hermes, ollama} (U-EXEC-POLICY coverage)", () => {
  for (const cls of taskClasses()) {
    const e = TASK_CLASS_POLICY[cls].execution;
    assert.ok(e && typeof e === "object", `${cls} missing execution`);
    for (const dim of ["harness", "hermes", "ollama"]) {
      assert.ok(typeof e[dim] === "string" && e[dim].length > 1, `${cls}.execution.${dim} missing`);
    }
  }
});
test("renderRouteBlock: a real class (orchestrate) surfaces hermes + ollama in the exec line", () => {
  const blk = renderRouteBlock("orchestrate", TASK_CLASS_POLICY.orchestrate, null, null, true);
  assert.match(blk, /exec:.*hermes:/);
  assert.match(blk, /exec:.*ollama:/);
});
test("renderRouteBlock: review surfaces the octopus consensus dim + ladder rung (cross-vendor escalation)", () => {
  const blk = renderRouteBlock("review", TASK_CLASS_POLICY.review, null, null, true);
  assert.match(blk, /exec:.*consensus:/, "review exec line must surface the consensus dim");
  assert.match(blk, /substrates:.*consensus/, "review substrate ladder must list the consensus rung");
  // physics (safety) must NOT surface consensus -- no cross-vendor egress
  const ph = renderRouteBlock("physics", TASK_CLASS_POLICY.physics, null, null, true);
  assert.equal(/consensus:/.test(ph), false, "physics must not surface a consensus dim (no egress)");
});

// ---- renderGatesLine (U-TASK-GRAPH-TEMPLATE WIRE) --------------------------
const CATALOG = {
  byTaskClass: {
    build: [
      { id: "duplication-hard-block", kind: "block-gate", knob: "PRISM_DUP_DISABLE" },
      { id: "build-state-inject", kind: "advisory-inject" },   // advisor, not a gate
    ],
  },
  universalFeatures: [
    { id: "ascii-guard", kind: "block-gate", knob: "PRISM_ASCII_GUARD_BYPASS" },
    { id: "scrutinize-before-stop", kind: "block-gate" },
    { id: "master-index", kind: "advisory-inject" },           // advisor, not counted
  ],
};
test("renderGatesLine: surfaces class block-gates (with mute knob) + universal gate count", () => {
  const l = renderGatesLine("build", CATALOG);
  assert.match(l, /GATES that MAY hard-stop this \(if not env-muted\)/);
  assert.match(l, /class: duplication-hard-block\(mute:PRISM_DUP_DISABLE\)/);
  assert.equal(/build-state-inject/.test(l), false);   // an advisory-inject is NOT a gate
  assert.match(l, /\+2 universal always-on gates/);    // 2 universal block-gates, advisor excluded
});
test("renderGatesLine: null catalog / class with no gates -> null (fail-soft)", () => {
  assert.equal(renderGatesLine("build", null), null);
  assert.equal(renderGatesLine("nonexistent", CATALOG), "  GATES that MAY hard-stop this (if not env-muted): +2 universal always-on gates -- comply first-try");
  // a class whose only feature is an advisor (no gate) + no universal -> null
  assert.equal(renderGatesLine("x", { byTaskClass: { x: [{ id: "a", kind: "advisory-inject" }] }, universalFeatures: [] }), null);
});
test("renderRouteBlock: appends the gates line when passed; absent when null (back-compat)", () => {
  const withGates = renderRouteBlock("build", POLICY, null, null, true, "  GATES that can hard-stop this: class: x");
  assert.match(withGates, /GATES that can hard-stop this: class: x/);
  assert.equal(/GATES/.test(renderRouteBlock("build", POLICY, null, null, true)), false); // omitted by default
});
test("renderRouteBlock: surfaces the DONE-WHEN line when the class carries doneWhen (build-complete gate)", () => {
  const withDone = renderRouteBlock("build", { ...POLICY, doneWhen: "LOOP until ZERO gaps/bugs/errors/conflicts" }, null, null, true);
  assert.match(withDone, /DONE-WHEN: LOOP until ZERO gaps\/bugs\/errors\/conflicts/);
  // a class without doneWhen renders no DONE-WHEN line (regression guard)
  assert.equal(/DONE-WHEN/.test(renderRouteBlock("build", POLICY, null, null, true)), false);
});
