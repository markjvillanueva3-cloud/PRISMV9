#!/usr/bin/env node
// memory-namespace-classifier.test.mjs — unit tests for HMEMV05 classifier shim.
// Run: node --test scripts/lib/memory-namespace-classifier.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { classifyNamespace, NAMESPACE_KINDS } from "./memory-namespace-classifier.mjs";

test("NAMESPACE_KINDS: exports the 4 canonical namespace categories", () => {
  assert.deepEqual(NAMESPACE_KINDS, ["universal", "galaxy", "slot-soul", "ephemeral"]);
});

test("ephemeral: key prefixed temp/session/cache/scratch routes to ephemeral", () => {
  for (const prefix of ["temp_x", "session_y", "cache_z", "scratch_a", "throwaway_b", "tmp_c"]) {
    const r = classifyNamespace({ key: prefix, value: "x", sessionId: "abc" });
    assert.equal(r.namespace, "ephemeral", `${prefix} → ephemeral`);
    assert.match(r.target, /^ephemeral:abc:/);
  }
});

test("slot-soul: key with slot-soul prefix OR soul: marker routes to slot-soul", () => {
  const r1 = classifyNamespace({ key: "slot-soul:mill-specialist", value: "x", slot: "alpha" });
  assert.equal(r1.namespace, "slot-soul");
  assert.match(r1.target, /^slot-soul:alpha:/);
  const r2 = classifyNamespace({ key: "soul:alpha:refuse-list", value: "x", slot: "alpha" });
  assert.equal(r2.namespace, "slot-soul");
});

test("universal: feedback_karpathy_discipline routes to universal", () => {
  const r = classifyNamespace({ key: "feedback_karpathy_discipline", value: "think simplify surgical" });
  assert.equal(r.namespace, "universal");
  assert.match(r.target, /^universal:/);
  assert.ok(r.confidence >= 0.9);
});

test("universal: feedback_psn_definition routes to universal", () => {
  const r = classifyNamespace({ key: "feedback_psn_definition", value: "11-leg PSN taxonomy" });
  assert.equal(r.namespace, "universal");
});

test("galaxy mill: kienzle keyword routes to galaxy:mill", () => {
  const r = classifyNamespace({ key: "reference_mill_force", value: "kienzle force compute spindle" });
  assert.equal(r.namespace, "galaxy");
  assert.match(r.target, /^galaxy:mill:/);
});

test("galaxy lathe: css + g96 + boring-bar routes to galaxy:lathe", () => {
  const r = classifyNamespace({ key: "reference_lathe_css", value: "css cap g96 boring-bar deflection" });
  assert.equal(r.namespace, "galaxy");
  assert.match(r.target, /^galaxy:lathe:/);
});

test("galaxy quoting: qp- + cost-estimate routes to galaxy:quoting", () => {
  const r = classifyNamespace({ key: "reference_qp_bootstrap", value: "qp- bootstrap-distribution cost-estimate" });
  assert.equal(r.namespace, "galaxy");
  assert.match(r.target, /^galaxy:quoting:/);
});

test("galaxy business: erp + payroll + customer-portfolio routes to galaxy:business", () => {
  const r = classifyNamespace({ key: "reference_erp_audit", value: "erp payroll customer-portfolio business-sync" });
  assert.equal(r.namespace, "galaxy");
  assert.match(r.target, /^galaxy:business:/);
});

test("galaxy ambiguous (truly tied — no 2x dominance): falls back to universal", () => {
  // True tie: each galaxy hits exactly 1 keyword, NO galaxy reaches 2x next-best.
  // mill=1 (mill), lathe=1 (lathe) — neither dominates → falls back to universal.
  const r = classifyNamespace({ key: "reference_x", value: "mill lathe" });
  assert.equal(r.namespace, "universal");
  assert.match(r.reason, /fallback universal/);
});

test("no match: routes to universal with low confidence (closes the default-namespace gap)", () => {
  const r = classifyNamespace({ key: "totally_random_key", value: "no match anywhere" });
  assert.equal(r.namespace, "universal");
  assert.ok(r.confidence <= 0.5, "low-confidence fallback");
  assert.match(r.reason, /fallback universal/);
});

test("ephemeral wins over galaxy (key prefix overrides content)", () => {
  // Even with mill keywords in body, ephemeral prefix wins
  const r = classifyNamespace({ key: "scratch_throwaway", value: "kienzle mill chip-load", sessionId: "abc" });
  assert.equal(r.namespace, "ephemeral");
});

test("slot-soul wins over universal/galaxy", () => {
  const r = classifyNamespace({ key: "soul:charlie:refuse-list", value: "kienzle and ERP keywords", slot: "charlie" });
  assert.equal(r.namespace, "slot-soul");
  assert.match(r.target, /charlie/);
});
