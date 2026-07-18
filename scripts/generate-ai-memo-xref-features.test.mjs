#!/usr/bin/env node
/**
 * Tests for generate-ai-memo-xref-features.mjs (/goal synergy iter 16, echo).
 *
 * Run: node --test scripts/generate-ai-memo-xref-features.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  engineMissingNodeId,
  generate,
  SCHEMA_VERSION,
  ROOST_ID,
  PLANNED_PARENT,
  ROOST_LAYER,
  ENGINE_LAYER,
} from "./generate-ai-memo-xref-features.mjs";

const AUDIT_DRIFTED = Object.freeze({
  schemaVersion: "1.0.0",
  generatedAt: "2026-05-21T17:00:00Z",
  stats: { engineCount: 7, memoCount: 863, missing: 4, coverage: 0.4286 },
  engines: [],
  missingFromMemos: [
    "PRISMCreativeReasoningEngine",
    "PRISMLoRAAdapterEngine",
    "PRISMNeuralKnowledgeSynthesisEngine",
    "PRISMVerificationPluginEngine",
  ],
});

const AUDIT_CLEAN = Object.freeze({
  schemaVersion: "1.0.0",
  stats: { engineCount: 7, memoCount: 1000, missing: 0, coverage: 1.0 },
  engines: [],
  missingFromMemos: [],
});

// ───────────────────────── exports ─────────────────────────

test("exported constants stable", () => {
  assert.equal(SCHEMA_VERSION, "1.0.0");
  assert.equal(ROOST_ID, "ghost.ai_memo_xref");
  assert.equal(PLANNED_PARENT, "ghost.planned_features");
  assert.equal(ROOST_LAYER, "L8");
  assert.equal(ENGINE_LAYER, "L9");
});

// ───────────────────────── engineMissingNodeId ─────────────────────────

test("engineMissingNodeId: PascalCase class → lowercased slug id", () => {
  assert.equal(
    engineMissingNodeId("PRISMCreativeReasoningEngine"),
    "ghost.ai_memo_missing.prismcreativereasoningengine",
  );
});

test("engineMissingNodeId: distinct engines → distinct ids (no collision)", () => {
  const a = engineMissingNodeId("PRISMLoRAAdapterEngine");
  const b = engineMissingNodeId("PRISMVerificationPluginEngine");
  assert.notEqual(a, b);
});

test("engineMissingNodeId: non-id chars stripped to underscore", () => {
  // Defensive: a future engine name with a digit-prefix or hyphen.
  assert.equal(engineMissingNodeId("PRISM-Foo.Bar"), "ghost.ai_memo_missing.prism_foo_bar");
});

test("engineMissingNodeId: empty/null → fallback 'x'", () => {
  assert.equal(engineMissingNodeId(""), "ghost.ai_memo_missing.x");
  assert.equal(engineMissingNodeId(null), "ghost.ai_memo_missing.x");
  assert.equal(engineMissingNodeId(undefined), "ghost.ai_memo_missing.x");
});

test("engineMissingNodeId: deterministic — same input twice → identical", () => {
  assert.equal(
    engineMissingNodeId("PRISMSelfAwarenessEngine"),
    engineMissingNodeId("PRISMSelfAwarenessEngine"),
  );
});

// ───────────────────────── generate: drifted ─────────────────────────

test("generate: drifted audit → 1 roost + 4 missing-coverage children", () => {
  const r = generate(AUDIT_DRIFTED);
  assert.equal(r.newNodes.length, 5, "1 roost + 4 children");
  assert.equal(r.newEdges.length, 0);
  assert.equal(r.stats.roostEmitted, 1);
  assert.equal(r.stats.childrenEmitted, 4);
  assert.equal(r.stats.childrenSkipped, 0);
  assert.equal(r.stats.missingCount, 4);
  assert.equal(r.stats.engineCount, 7);
});

test("generate: roost node shape correct", () => {
  const r = generate(AUDIT_DRIFTED);
  const roost = r.newNodes.find((n) => n.id === ROOST_ID);
  assert.ok(roost);
  assert.equal(roost.parent, PLANNED_PARENT);
  assert.equal(roost.layer, ROOST_LAYER);
  assert.equal(roost.kind, "ghost-roost");
  assert.equal(roost.ghost, true);
  assert.ok(roost.label.includes("4/7 blind"), "label encodes missing/total");
  assert.ok(roost.info.includes("42.9%"), "info encodes coverage%");
  // iter-6 P2-4: no literal `[[name]]` in label/info
  assert.ok(!/\[\[.+?\]\]/.test(roost.label));
  assert.ok(!/\[\[.+?\]\]/.test(roost.info));
});

test("generate: child nodes shape correct", () => {
  const r = generate(AUDIT_DRIFTED);
  const children = r.newNodes.filter((n) => n.kind === "missing-coverage");
  assert.equal(children.length, 4);
  for (const c of children) {
    assert.equal(c.parent, ROOST_ID);
    assert.equal(c.layer, ENGINE_LAYER);
    assert.equal(c.ghost, true);
    assert.ok(c.label.startsWith("MISSING: PRISM"), "MISSING: prefix + engine name");
    assert.ok(!/\[\[.+?\]\]/.test(c.label));
  }
  // Verify one specific child id
  assert.ok(r.newNodes.some((n) => n.id === "ghost.ai_memo_missing.prismloraadapterengine"));
});

// ───────────────────────── generate: clean ─────────────────────────

test("generate: clean audit (0 missing) → roost only, no children", () => {
  const r = generate(AUDIT_CLEAN);
  assert.equal(r.newNodes.length, 1, "roost only");
  assert.equal(r.stats.childrenEmitted, 0);
  assert.equal(r.stats.missingCount, 0);
  const roost = r.newNodes[0];
  assert.ok(roost.label.includes("0/7 blind"));
  assert.ok(roost.info.includes("100.0%"));
});

// ───────────────────────── generate: idempotency ─────────────────────────

test("generate: existingNodeIds includes ROOST_ID → skip roost, keep children", () => {
  const r = generate(AUDIT_DRIFTED, [ROOST_ID]);
  assert.equal(r.stats.roostEmitted, 0);
  // children still emitted (their ids not in skip-list)
  assert.equal(r.stats.childrenEmitted, 4);
  assert.equal(r.newNodes.length, 4);
});

test("generate: existingNodeIds includes a child id → that child skipped", () => {
  const skipId = engineMissingNodeId("PRISMLoRAAdapterEngine");
  const r = generate(AUDIT_DRIFTED, [ROOST_ID, skipId]);
  assert.equal(r.stats.childrenEmitted, 3);
  assert.equal(r.stats.childrenSkipped, 1);
  assert.ok(!r.newNodes.some((n) => n.id === skipId));
});

test("generate: Set and array existingNodeIds behave identically", () => {
  const arr = generate(AUDIT_DRIFTED, [ROOST_ID]);
  const set = generate(AUDIT_DRIFTED, new Set([ROOST_ID]));
  assert.equal(JSON.stringify(arr), JSON.stringify(set));
});

// ───────────────────────── generate: fail-soft ─────────────────────────

test("generate: null/empty/wrong-shape audit → roost with zero stats, no crash", () => {
  for (const bad of [null, {}, { stats: null }, { missingFromMemos: null }]) {
    const r = generate(bad);
    assert.equal(r.newNodes.length, 1, `degenerate ${JSON.stringify(bad)} → roost only`);
    assert.equal(r.stats.childrenEmitted, 0);
    assert.equal(r.stats.engineCount, 0);
  }
});

test("generate: non-string entries in missingFromMemos skipped", () => {
  const audit = {
    stats: { engineCount: 7, memoCount: 100, missing: 3, coverage: 0.57 },
    missingFromMemos: ["PRISMRealEngine", null, 42, "PRISMOtherEngine"],
  };
  const r = generate(audit);
  assert.equal(r.stats.childrenEmitted, 2, "only the 2 string entries become children");
  assert.equal(r.stats.childrenSkipped, 2);
});

test("generate: coverage clamped to [0,1]", () => {
  const over = generate({ stats: { engineCount: 7, missing: 0, coverage: 1.5 }, missingFromMemos: [] });
  assert.equal(over.stats.coverage, 1);
  const under = generate({ stats: { engineCount: 7, missing: 7, coverage: -0.3 }, missingFromMemos: [] });
  assert.equal(under.stats.coverage, 0);
  const nan = generate({ stats: { engineCount: 7, missing: 7, coverage: NaN }, missingFromMemos: [] });
  assert.equal(nan.stats.coverage, 0);
});

// ───────────────────────── generate: determinism ─────────────────────────

test("generate: same input twice → byte-stable output", () => {
  assert.equal(JSON.stringify(generate(AUDIT_DRIFTED)), JSON.stringify(generate(AUDIT_DRIFTED)));
});

// ───────────────────────── real-data E2E ─────────────────────────

test("real-data E2E: live audit → roost renders", () => {
  const live = path.resolve(
    path.dirname(new URL(import.meta.url).pathname.replace(/^\//, "")),
    "..", "state/shared/.prism-ai-memo-cross-ref-audit.json",
  );
  if (!existsSync(live)) {
    console.log("  SKIP: live audit missing");
    return;
  }
  const audit = JSON.parse(readFileSync(live, "utf8"));
  const r = generate(audit);
  assert.ok(r.stats.roostEmitted === 1 || r.stats.roostEmitted === 0);
  assert.ok(r.newNodes.length >= 1, "at least the roost");
  // children count must equal missing count (every blind-spot engine surfaced)
  assert.equal(r.stats.childrenEmitted + r.stats.childrenSkipped, (audit.missingFromMemos || []).length);
});
