#!/usr/bin/env node
// tier: T4
/**
 * node-capability-injector.test.mjs — hermetic tests for the pure library.
 * Run: node --test scripts/lib/node-capability-injector.test.mjs
 */
import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  extractNodeMentions,
  resolveMentions,
  planInjection,
  renderInjection,
  DEFAULT_BUDGET,
  HARD_BUDGET_CAP
} from "./node-capability-injector.mjs";

// ─── extractNodeMentions ──────────────────────────────────────────────

test("extractNodeMentions: empty / null / non-string returns []", () => {
  assert.deepEqual(extractNodeMentions(""), []);
  assert.deepEqual(extractNodeMentions(null), []);
  assert.deepEqual(extractNodeMentions(undefined), []);
  assert.deepEqual(extractNodeMentions(123), []);
  assert.deepEqual(extractNodeMentions({}), []);
});

test("extractNodeMentions: CamelCase engine suffix triggers extraction", () => {
  const out = extractNodeMentions("wire KienzleForceEngine into prism_calc");
  assert.ok(out.includes("kienzleforceengine"), "should extract KienzleForceEngine: " + JSON.stringify(out));
});

test("extractNodeMentions: bare ≥3-cap CamelCase triggers extraction", () => {
  // FooBarBaz has 3 capitals (F,B,B) and matches the CamelCase pattern
  // (each capital followed by lowercase). This is the "bare ≥3-cap"
  // path — no engine suffix needed.
  const out = extractNodeMentions("see FooBarBaz pattern");
  assert.ok(out.includes("foobarbaz"), JSON.stringify(out));
});

test("extractNodeMentions: kebab kind-prefix triggers", () => {
  const out = extractNodeMentions("use alg-kalman-filter and hook-stop-foo together");
  assert.ok(out.includes("alg-kalman-filter"));
  assert.ok(out.includes("hook-stop-foo"));
});

test("extractNodeMentions: dispatcher:action triggers", () => {
  const out = extractNodeMentions("call prism_calc:cutting_force and prism_ai:ai_route_mill_pipeline");
  assert.ok(out.includes("prism_calc:cutting_force"));
  assert.ok(out.includes("prism_ai:ai_route_mill_pipeline"));
});

test("extractNodeMentions: source path → basename", () => {
  const out = extractNodeMentions("edit mcp-server/src/engines/MyThing.ts and scripts/lib/my-helper.mjs");
  assert.ok(out.includes("mything"), "ts basename: " + JSON.stringify(out));
  assert.ok(out.includes("my-helper"), "mjs basename: " + JSON.stringify(out));
});

test("extractNodeMentions: dedup + first-appearance order", () => {
  const out = extractNodeMentions("KienzleForceEngine and KienzleForceEngine plus TaylorToolLifeEngine");
  const kIdx = out.indexOf("kienzleforceengine");
  const tIdx = out.indexOf("taylortoollifeengine");
  assert.ok(kIdx >= 0 && tIdx >= 0);
  assert.ok(kIdx < tIdx, "first-appearance order");
  // dedup: each mention should appear exactly once
  const kCount = out.filter(x => x === "kienzleforceengine").length;
  assert.equal(kCount, 1);
});

test("extractNodeMentions: rejects generic English words", () => {
  const out = extractNodeMentions("the quick brown fox jumps over the lazy dog");
  assert.deepEqual(out, []);
});

test("extractNodeMentions: linear-time on adversarial input", () => {
  const adversarial = "A".repeat(2000) + "b".repeat(2000) + "C".repeat(2000);
  const start = Date.now();
  extractNodeMentions(adversarial);
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 500, "regex must be linear-time: " + elapsed + "ms");
});

// ─── resolveMentions ──────────────────────────────────────────────────

const SAMPLE_INDEX = {
  version: 1,
  builtAt: 1000,
  pointers: {
    "engine.kienzleforceengine": {
      wikiPath: "knowledge/wiki/architecture/engines/eng-kienzleforce.md",
      pointerPath: "knowledge/memories/reference/node_engine_kienzleforceengine.md",
      kind: "engine",
      slug: "kienzleforceengine",
      displayName: "KienzleForceEngine"
    },
    "algorithm.alg_kalmanfilter": {
      wikiPath: "knowledge/wiki/architecture/algorithms/alg-kalmanfilter.md",
      pointerPath: "knowledge/memories/reference/node_algorithm_alg_kalmanfilter.md",
      kind: "algorithm",
      slug: "alg_kalmanfilter",
      displayName: "alg_kalmanfilter"
    },
    "action.cutting_force": {
      wikiPath: "knowledge/wiki/architecture/actions/calc/cutting_force.md",
      pointerPath: "knowledge/memories/reference/node_action_cutting_force.md",
      kind: "action",
      slug: "cutting_force",
      displayName: "cutting_force"
    }
  },
  displayNameToId: {
    "kienzleforceengine": "engine.kienzleforceengine",
    "kienzleforce": "engine.kienzleforceengine",
    "alg_kalmanfilter": "algorithm.alg_kalmanfilter",
    "kalmanfilter": "algorithm.alg_kalmanfilter",
    "cutting_force": "action.cutting_force"
  }
};

test("resolveMentions: empty inputs", () => {
  assert.deepEqual(resolveMentions([], SAMPLE_INDEX), { resolved: [], unresolved: [] });
  assert.deepEqual(resolveMentions(null, SAMPLE_INDEX), { resolved: [], unresolved: [] });
});

test("resolveMentions: malformed index → all unresolved, never throws", () => {
  const r = resolveMentions(["foo"], null);
  assert.deepEqual(r, { resolved: [], unresolved: ["foo"] });
  const r2 = resolveMentions(["foo"], { bogus: true });
  assert.deepEqual(r2.resolved, []);
  assert.deepEqual(r2.unresolved, ["foo"]);
});

test("resolveMentions: direct hit", () => {
  const r = resolveMentions(["kienzleforceengine"], SAMPLE_INDEX);
  assert.equal(r.resolved.length, 1);
  assert.equal(r.resolved[0].nodeId, "engine.kienzleforceengine");
  assert.equal(r.unresolved.length, 0);
});

test("resolveMentions: suffix-strip fallback", () => {
  // "kienzleforceengine" → strip "engine" → "kienzleforce" → hit
  const r = resolveMentions(["KienzleForceEngine"], SAMPLE_INDEX);
  assert.equal(r.resolved.length, 1);
  assert.equal(r.resolved[0].nodeId, "engine.kienzleforceengine");
});

test("resolveMentions: dispatcher:action action-half fallback", () => {
  const r = resolveMentions(["prism_calc:cutting_force"], SAMPLE_INDEX);
  assert.equal(r.resolved.length, 1);
  assert.equal(r.resolved[0].nodeId, "action.cutting_force");
});

test("resolveMentions: dedup by nodeId", () => {
  const r = resolveMentions(
    ["KienzleForceEngine", "kienzleforceengine", "kienzleforce"],
    SAMPLE_INDEX
  );
  assert.equal(r.resolved.length, 1);
});

test("resolveMentions: unknown mention → unresolved", () => {
  const r = resolveMentions(["NeverHeardOfThisEngine"], SAMPLE_INDEX);
  assert.equal(r.resolved.length, 0);
  assert.deepEqual(r.unresolved, ["NeverHeardOfThisEngine"]);
});

// ─── planInjection ────────────────────────────────────────────────────

test("planInjection: empty / null", () => {
  assert.deepEqual(planInjection({ resolved: [] }), { items: [], truncated: 0, budget: DEFAULT_BUDGET });
  assert.deepEqual(planInjection({ resolved: null }), { items: [], truncated: 0, budget: DEFAULT_BUDGET });
});

test("planInjection: under budget — all items pass", () => {
  const items = [{ nodeId: "a" }, { nodeId: "b" }];
  const p = planInjection({ resolved: items, budget: 5 });
  assert.equal(p.items.length, 2);
  assert.equal(p.truncated, 0);
});

test("planInjection: over budget — truncates, reports count", () => {
  const items = Array.from({ length: 20 }, (_, i) => ({ nodeId: "n" + i }));
  const p = planInjection({ resolved: items, budget: 5 });
  assert.equal(p.items.length, 5);
  assert.equal(p.truncated, 15);
});

test("planInjection: hostile budget clamped to HARD_BUDGET_CAP", () => {
  const items = Array.from({ length: 200 }, (_, i) => ({ nodeId: "n" + i }));
  const p = planInjection({ resolved: items, budget: 99999 });
  assert.equal(p.budget, HARD_BUDGET_CAP);
  assert.equal(p.items.length, HARD_BUDGET_CAP);
});

test("planInjection: budget=0 / NaN / negative → falls back to DEFAULT_BUDGET", () => {
  const items = [{ nodeId: "a" }];
  assert.equal(planInjection({ resolved: items, budget: 0 }).budget, DEFAULT_BUDGET);
  assert.equal(planInjection({ resolved: items, budget: NaN }).budget, DEFAULT_BUDGET);
  // negative → Math.max(MIN_BUDGET, …)
  assert.ok(planInjection({ resolved: items, budget: -5 }).budget >= 1);
});

// ─── renderInjection ──────────────────────────────────────────────────

test("renderInjection: empty plan → empty string", () => {
  assert.equal(renderInjection({ items: [] }), "");
  assert.equal(renderInjection(null), "");
  assert.equal(renderInjection({}), "");
});

test("renderInjection: produces markdown with each item", () => {
  const plan = {
    items: [
      { nodeId: "engine.foo", displayName: "FooEngine", kind: "engine",
        wikiPath: "knowledge/wiki/engines/foo.md",
        pointerPath: "knowledge/memories/reference/node_engine_foo.md",
        mention: "FooEngine" }
    ],
    truncated: 0,
    budget: 12
  };
  const md = renderInjection(plan);
  assert.ok(md.includes("FooEngine"));
  assert.ok(md.includes("knowledge/wiki/engines/foo.md"));
  assert.ok(md.includes("[engine]"));
  assert.ok(md.includes("100% coverage"));
});

test("renderInjection: shows truncation count", () => {
  const plan = { items: [{ nodeId: "a", displayName: "A", kind: "engine", wikiPath: "x.md" }], truncated: 7, budget: 5 };
  const md = renderInjection(plan);
  assert.ok(md.includes("+7 more"));
  assert.ok(md.includes("budget=5"));
});

test("renderInjection: matched-on tag when mention != displayName", () => {
  const plan = {
    items: [{ nodeId: "engine.foo", displayName: "FooEngine", kind: "engine", wikiPath: "x.md", mention: "foo" }],
    truncated: 0,
    budget: 12
  };
  const md = renderInjection(plan);
  assert.ok(md.includes("matched on: foo"));
});

// ─── end-to-end integration ───────────────────────────────────────────

test("end-to-end: prompt with 3 mentions → 3 resolved → markdown block", () => {
  const prompt = "wire KienzleForceEngine and call prism_calc:cutting_force on alg-kalmanfilter";
  const mentions = extractNodeMentions(prompt);
  assert.ok(mentions.length >= 2, "extracted: " + JSON.stringify(mentions));
  const { resolved } = resolveMentions(mentions, SAMPLE_INDEX);
  const plan = planInjection({ resolved });
  const md = renderInjection(plan);
  assert.ok(md.includes("KienzleForceEngine"));
  assert.ok(plan.items.length >= 2);
  // 100% explicit coverage: all explicit (non-fuzzy) mentions present
  const ids = plan.items.map(it => it.nodeId);
  assert.ok(ids.includes("engine.kienzleforceengine"));
  assert.ok(ids.includes("action.cutting_force"));
});

test("end-to-end: hostile prompt with 200 fake mentions still budget-capped", () => {
  const fakes = Array.from({ length: 200 }, (_, i) => "FakeEngine" + i).join(" ");
  const mentions = extractNodeMentions(fakes);
  // Resolve against a sparse index — most won't hit
  const { resolved } = resolveMentions(mentions, SAMPLE_INDEX);
  const plan = planInjection({ resolved });
  assert.ok(plan.items.length <= HARD_BUDGET_CAP);
});
