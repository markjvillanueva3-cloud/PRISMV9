// tier: T4
// Tests for .claude/hooks/lib/ollama-cost-router.mjs (U-P4-OLLAMA-COST-ROUTING).
//
// Uses node:test (vite-bug-immune) — the `.claude/helpers/vitest.config.mjs`
// import of `vitest/config` is currently failing to resolve in this repo
// (documented in [[reference_fleet_reaper_ms1]]). Behaviour is identical to
// the equivalent vitest spec.
//
// Run: node --test H:/prism/.claude/hooks/__tests__/ollama-cost-router.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  routeModelForTask,
  TIER_PREFERENCES,
  CATEGORY_TIER,
  TIER_ORDER,
} from "../lib/ollama-cost-router.mjs";

const ALL = [
  "qwen2.5-coder:1.5b",
  "llama3.2:3b",
  "qwen2.5-coder:7b",
  "codellama:7b",
  "qwen2.5-coder:14b",
  "qwen2.5-coder:32b",
];

// ── happy path: category → tier ──────────────────────────────────────────────

test("cheap categories prefer cheap-tier models", () => {
  for (const cat of ["format_convert", "prism_inventory", "prism_introspect", "classification"]) {
    const r = routeModelForTask({ category: cat, available: ALL });
    assert.equal(r.model, "qwen2.5-coder:1.5b", `model for ${cat}`);
    assert.equal(r.tier, "cheap", `tier for ${cat}`);
    assert.equal(r.reason, "target tier", `reason for ${cat}`);
  }
});

test("balanced categories prefer balanced-tier models", () => {
  for (const cat of ["summary", "explanation", "documentation", "git_summary", "prism_audit", "search_synthesis"]) {
    const r = routeModelForTask({ category: cat, available: ALL });
    assert.equal(r.model, "qwen2.5-coder:7b", `model for ${cat}`);
    assert.equal(r.tier, "balanced", `tier for ${cat}`);
    assert.equal(r.reason, "target tier", `reason for ${cat}`);
  }
});

// ── escalation up the tier ladder ────────────────────────────────────────────

test("cheap → balanced when no cheap-tier model is installed", () => {
  const r = routeModelForTask({
    category: "format_convert",
    available: ["qwen2.5-coder:7b", "qwen2.5-coder:32b"],
  });
  assert.equal(r.model, "qwen2.5-coder:7b");
  assert.equal(r.tier, "balanced");
  assert.equal(r.reason, "escalated cheap → balanced");
});

test("cheap → strong (skips empty balanced)", () => {
  const r = routeModelForTask({
    category: "classification",
    available: ["qwen2.5-coder:14b", "qwen2.5-coder:32b"],
  });
  assert.equal(r.model, "qwen2.5-coder:14b");
  assert.equal(r.tier, "strong");
  assert.equal(r.reason, "escalated cheap → strong");
});

test("balanced → best when balanced+strong tiers are empty", () => {
  const r = routeModelForTask({
    category: "summary",
    available: ["qwen2.5-coder:32b"],
  });
  assert.equal(r.model, "qwen2.5-coder:32b");
  assert.equal(r.tier, "best");
  assert.equal(r.reason, "escalated balanced → best");
});

test("does NOT de-escalate — balanced task with only cheap available falls to fallback (not cheap-tier)", () => {
  const r = routeModelForTask({
    category: "summary",
    available: ["qwen2.5-coder:1.5b"],
  });
  assert.equal(r.model, "qwen2.5-coder:1.5b");
  assert.equal(r.tier, "fallback");
  assert.equal(r.reason, "no preferred model in any tier");
});

// ── unknown / missing category ───────────────────────────────────────────────

test("unknown category falls back to balanced tier", () => {
  const r = routeModelForTask({ category: "complete_nonsense_category", available: ALL });
  assert.equal(r.tier, "balanced");
  assert.equal(r.model, "qwen2.5-coder:7b");
});

test("null/undefined/empty/non-string category falls back to balanced", () => {
  for (const cat of [null, undefined, "", 42, {}]) {
    const r = routeModelForTask({ category: cat, available: ALL });
    assert.equal(r.tier, "balanced", `tier for ${String(cat)}`);
    assert.equal(r.model, "qwen2.5-coder:7b", `model for ${String(cat)}`);
  }
});

// ── empty / malformed `available` ────────────────────────────────────────────

test("empty available[] returns null + tier:none", () => {
  const r = routeModelForTask({ category: "summary", available: [] });
  assert.equal(r.model, null);
  assert.equal(r.tier, "none");
  assert.equal(r.reason, "no models available");
});

test("non-array available returns null + tier:none", () => {
  for (const a of [null, undefined, "qwen2.5-coder:7b", {}, 42]) {
    const r = routeModelForTask({ category: "summary", available: a });
    assert.equal(r.model, null, `model for ${typeof a}`);
    assert.equal(r.tier, "none", `tier for ${typeof a}`);
  }
});

test("filters non-string entries; does not crash on them", () => {
  const r = routeModelForTask({
    category: "summary",
    available: [null, undefined, 42, {}, "qwen2.5-coder:7b"],
  });
  assert.equal(r.model, "qwen2.5-coder:7b");
  assert.equal(r.tier, "balanced");
});

test("all-malformed available returns null + tier:none", () => {
  const r = routeModelForTask({
    category: "summary",
    available: [null, undefined, 42, {}],
  });
  assert.equal(r.model, null);
  assert.equal(r.tier, "none");
  assert.equal(r.reason, "no string-typed models");
});

// ── last-resort fallback ─────────────────────────────────────────────────────

test("returns first available + tier:fallback when no preferred model is present at any tier", () => {
  const r = routeModelForTask({
    category: "summary",
    available: ["some-totally-unknown-model:5b", "another-weird:7b"],
  });
  assert.equal(r.model, "some-totally-unknown-model:5b");
  assert.equal(r.tier, "fallback");
  assert.equal(r.reason, "no preferred model in any tier");
});

// ── constants invariants ─────────────────────────────────────────────────────

test("TIER_ORDER is frozen and has exactly the four expected entries in order", () => {
  assert.equal(Object.isFrozen(TIER_ORDER), true);
  assert.deepEqual([...TIER_ORDER], ["cheap", "balanced", "strong", "best"]);
});

test("TIER_PREFERENCES has exactly the four tiers, each frozen non-empty string array", () => {
  assert.equal(Object.isFrozen(TIER_PREFERENCES), true);
  assert.deepEqual(Object.keys(TIER_PREFERENCES).sort(), ["balanced", "best", "cheap", "strong"]);
  for (const tier of TIER_ORDER) {
    assert.equal(Array.isArray(TIER_PREFERENCES[tier]), true, `${tier} is array`);
    assert.equal(Object.isFrozen(TIER_PREFERENCES[tier]), true, `${tier} is frozen`);
    assert.ok(TIER_PREFERENCES[tier].length > 0, `${tier} non-empty`);
    for (const m of TIER_PREFERENCES[tier]) {
      assert.equal(typeof m, "string", `${tier} entry is string`);
      assert.ok(m.length > 0, `${tier} entry non-empty`);
    }
  }
});

test("every CATEGORY_TIER value is a member of TIER_ORDER", () => {
  for (const v of Object.values(CATEGORY_TIER)) {
    assert.ok(TIER_ORDER.includes(v), `${v} is in TIER_ORDER`);
  }
});

test("CATEGORY_TIER maps every offloader category to the correct tier (KEEP-IN-SYNC with ollama-task-offloader.mjs)", () => {
  const EXPECTED = {
    format_convert: "cheap",
    prism_inventory: "cheap",
    prism_introspect: "cheap",
    classification: "cheap",
    summary: "balanced",
    explanation: "balanced",
    documentation: "balanced",
    git_summary: "balanced",
    prism_audit: "balanced",
    search_synthesis: "balanced",
  };
  assert.deepEqual({ ...CATEGORY_TIER }, EXPECTED);
});

test("escalation order keeps cheap < balanced < strong < best", () => {
  assert.ok(TIER_ORDER.indexOf("cheap") < TIER_ORDER.indexOf("balanced"));
  assert.ok(TIER_ORDER.indexOf("balanced") < TIER_ORDER.indexOf("strong"));
  assert.ok(TIER_ORDER.indexOf("strong") < TIER_ORDER.indexOf("best"));
});

// ── preference order within a tier ───────────────────────────────────────────

test("picks the FIRST preference-list entry that is available, not the first entry of `available`", () => {
  const r = routeModelForTask({
    category: "summary",
    available: ["codellama:7b", "qwen2.5-coder:7b", "deepseek-coder:6.7b"],
  });
  assert.equal(r.model, "qwen2.5-coder:7b");
  assert.equal(r.tier, "balanced");
});

test("falls to the second preference within a tier when the first is absent", () => {
  const r = routeModelForTask({
    category: "summary",
    available: ["codellama:7b"],
  });
  assert.equal(r.model, "codellama:7b");
  assert.equal(r.tier, "balanced");
});

// ── live-host coverage: this machine's actual install ────────────────────────

test("on this host's actual install (qwen2.5-coder:7b/14b/32b + deepseek-r1:14b), each tier resolves sensibly", () => {
  // Sanity that the live install is recognised — these models ARE on
  // H:/Tools/ollama (verified 2026-05-15, [[reference_local_llm_routing]]).
  // A future host change shouldn't break this — it asserts the routing the
  // CURRENT host should produce.
  const live = ["qwen2.5-coder:7b", "qwen2.5-coder:14b", "qwen2.5-coder:32b", "deepseek-r1:14b"];
  // cheap → escalates to balanced (no cheap-tier model installed)
  assert.deepEqual(
    routeModelForTask({ category: "classification", available: live }),
    { model: "qwen2.5-coder:7b", tier: "balanced", reason: "escalated cheap → balanced" },
  );
  // balanced → target tier
  assert.deepEqual(
    routeModelForTask({ category: "summary", available: live }),
    { model: "qwen2.5-coder:7b", tier: "balanced", reason: "target tier" },
  );
});

test("deepseek-r1:14b is recognised as a strong-tier model", () => {
  // Strong tier preference list includes deepseek-r1:14b after qwen2.5-coder:14b.
  // If a host has BOTH installed, qwen2.5-coder:14b wins (codegen-focused);
  // if it has only deepseek-r1:14b, it still resolves to strong (not fallback).
  const r = routeModelForTask({
    category: "summary",
    available: ["deepseek-r1:14b"], // only the reasoning 14b, no balanced/best
  });
  assert.equal(r.model, "deepseek-r1:14b");
  assert.equal(r.tier, "strong");
  assert.equal(r.reason, "escalated balanced → strong");
});
