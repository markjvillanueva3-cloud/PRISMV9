// scripts/six-domain-autofire-coverage.test.mjs
// Run: node scripts/six-domain-autofire-coverage.test.mjs
//
// LIVE validation: buildCoverage() imports the REAL 6 approach-knowledge libs and
// reads the REAL ups-domain-bundle, so these asserts prove the auto-firing layer
// actually fires fleet-wide -- not a mock. Plus DI'd fail-soft + render tests.

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCoverage, renderReport, DOMAINS, BUNDLE } from "./six-domain-autofire-coverage.mjs";

const GOAL_DOMAINS = ["mill", "post", "cad", "cam", "wedm", "lathe"];

// ---- registry integrity ----

test("DOMAINS covers exactly the 6 goal domains, distinct, fully specified", () => {
  assert.equal(DOMAINS.length, 6);
  const keys = DOMAINS.map((d) => d.key);
  assert.deepEqual([...keys].sort(), [...GOAL_DOMAINS].sort());
  assert.equal(new Set(keys).size, 6, "domain keys distinct");
  for (const d of DOMAINS) {
    assert.ok(d.lib && d.lib.endsWith("-approach-knowledge.mjs"), `${d.key} lib path`);
    assert.ok(d.hook && d.hook.endsWith(".mjs"), `${d.key} hook filename`);
    assert.ok(d.slot && d.slot.length > 0, `${d.key} specialist slot`);
  }
  assert.equal(new Set(DOMAINS.map((d) => d.hook)).size, 6, "hook filenames distinct");
  assert.ok(BUNDLE.includes("ups-domain-bundle"), "bundle path");
});

// ---- LIVE: the whole layer fires + is wired (the goal's core guarantee) ----

test("LIVE: all 6 domains import OK, fire live, and are bundle-wired", async () => {
  const cov = await buildCoverage();
  assert.equal(cov.rows.length, 6);
  for (const r of cov.rows) {
    assert.equal(r.ok, true, `${r.key} imported`);
    assert.equal(r.fires, true, `${r.key} fires live (>=1 op + >=1 knowledge item)`);
    assert.ok(r.firedGates > 0, `${r.key} fired knowledge count > 0`);
    assert.ok(r.operations > 0, `${r.key} has an operations taxonomy`);
    assert.equal(r.bundleWired, true, `${r.key} firing hook registered in the bundle`);
  }
  assert.equal(cov.rollup.allFire, true);
  assert.equal(cov.rollup.allWired, true);
});

test("LIVE: only VERIFIED gates fire -- gatesVerified === gatesTotal per domain", async () => {
  // design invariant: unverified knowledge stays in the *_UNVERIFIED_GAPS export,
  // never in the firing GATES/GOTCHAS registry. If a non-verified gate ever fires,
  // this breaks -- exactly the safety boundary we want locked.
  const cov = await buildCoverage();
  for (const r of cov.rows) {
    assert.equal(r.gatesVerified, r.gatesTotal, `${r.key}: a non-verified gate is firing`);
  }
  assert.equal(cov.rollup.gatesVerifiedTotal, cov.rollup.gatesTotalAll);
  assert.ok(cov.rollup.gatesVerifiedTotal >= 58, "fleet-wide verified-gate floor");
});

test("REGRESSION: lathe binds its GOTCHAS registry (not just GATES)", async () => {
  // pre-fix the validator looked only for _internals.GATES + op.gates, so the
  // lathe lib (which names them GOTCHAS / op.gotchas) reported gatesTotal=0,
  // fires=false. This asserts the schema-tolerant binding.
  const cov = await buildCoverage();
  const lathe = cov.rows.find((r) => r.key === "lathe");
  assert.ok(lathe && lathe.gatesTotal > 0, "lathe GOTCHAS registry bound");
  assert.ok(lathe.firedGates > 0, "lathe fires its gotchas");
});

// ---- HONEST verify-backlog reporting (R12) ----

test("verify-backlog: all 6 domains now track gaps numerically (untracked backlog closed)", async () => {
  const cov = await buildCoverage();
  const by = Object.fromEntries(cov.rows.map((r) => [r.key, r]));
  // every domain now exposes a first-class UNVERIFIED_GAPS export -> numeric, non-empty backlog
  for (const k of GOAL_DOMAINS) {
    assert.equal(typeof by[k].unverifiedGaps, "number", `${k} tracks a numeric backlog`);
    assert.ok(by[k].unverifiedGaps > 0, `${k} backlog is non-empty`);
  }
  assert.deepEqual(cov.rollup.gapsUntracked, [], "no domain is untracked anymore");
  // rollup backlog == sum of every domain's count
  assert.equal(cov.rollup.verifyBacklog, GOAL_DOMAINS.reduce((n, k) => n + by[k].unverifiedGaps, 0));
});

// ---- fail-soft (a broken lib must not abort the sweep) ----

test("fail-soft: one broken domain import yields ok:false, others unaffected", async () => {
  const importImpl = (p) => {
    if (p.includes("cam-approach")) throw new Error("simulated import failure");
    return import(new URL("../" + p, import.meta.url).href);
  };
  const cov = await buildCoverage({ importImpl });
  const cam = cov.rows.find((r) => r.key === "cam");
  assert.equal(cam.ok, false);
  assert.equal(cam.fires, false);
  assert.ok(cam.error && cam.error.includes("simulated"));
  // the other 5 still imported + fired
  assert.equal(cov.rows.filter((r) => r.ok).length, 5);
  assert.equal(cov.rollup.allFire, false, "a broken domain breaks the rollup guarantee");
});

test("bundle read is DI'd: empty bundle text marks every domain un-wired", async () => {
  const cov = await buildCoverage({ readImpl: () => "" });
  for (const r of cov.rows) assert.equal(r.bundleWired, false);
  assert.equal(cov.rollup.allWired, false);
});

// ---- render (null-safe, informative) ----

test("renderReport: lists every domain + a rollup, and is null-safe", async () => {
  const cov = await buildCoverage();
  const md = renderReport(cov, "STAMP");
  for (const k of GOAL_DOMAINS) assert.ok(md.includes(`| ${k} |`), `report row for ${k}`);
  assert.ok(md.includes("## Rollup"));
  assert.ok(md.includes("STAMP"));
  assert.ok(md.includes("all six fire live"));
  // null-safe on degenerate inputs
  assert.doesNotThrow(() => renderReport(null));
  assert.doesNotThrow(() => renderReport({}));
  assert.doesNotThrow(() => renderReport({ rows: [{ ok: false, key: "x", slot: "y", error: "boom" }] }));
});

test("renderReport surfaces a non-firing domain as NO (not silently passing)", () => {
  const md = renderReport({
    rows: [{ ok: true, key: "mill", slot: "foxtrot", operations: 3, gatesVerified: 0, gatesTotal: 0, unverifiedGaps: null, firedOps: 0, firedGates: 0, fires: false, bundleWired: true }],
    rollup: { domains: 1, allFire: false, allWired: true, gatesTotalAll: 0, gatesVerifiedTotal: 0, verifyBacklog: 0, gapsUntracked: ["mill"] },
  });
  assert.ok(md.includes("| NO |") || /\bNO\b/.test(md), "non-firing domain rendered as NO");
  assert.ok(md.includes("all six fire live: **NO**"));
});

// ---- verify-backlog WORKLIST (actual gap items, not just a count) ----

test("LIVE: all 6 domains expose ACTUAL gap items as a worklist (item count == backlog count)", async () => {
  const cov = await buildCoverage();
  const by = Object.fromEntries(cov.rows.map((r) => [r.key, r]));
  for (const k of GOAL_DOMAINS) {
    assert.ok(Array.isArray(by[k].gapItems), `${k} exposes gap items`);
    assert.equal(by[k].gapItems.length, by[k].unverifiedGaps, `${k} item count == backlog count`);
    assert.ok(by[k].gapItems.every((s) => typeof s === "string" && s.length > 0), `${k} items are non-empty strings`);
  }
});

test("renderReport: emits the Verify-backlog worklist for all 6 with REAL cited items; no untracked section when all tracked", async () => {
  const cov = await buildCoverage();
  const md = renderReport(cov, "STAMP");
  assert.ok(md.includes("## Verify-backlog worklist"), "worklist section present");
  // real items prove items are surfaced, not just counts
  assert.ok(/- \[ \] .*rest_machining/.test(md) || /- \[ \] .*5-axis singularity/.test(md), "a real cam gap item is listed");
  assert.ok(md.includes("reference_mill_vault_enrichment"), "a real mill worklist item cites its source");
  assert.ok(
    md.includes("reference_lathe_vault_enrichment") || md.includes("reference_cad_vault_enrichment") || md.includes("reference_post-processor_vault_enrichment"),
    "the newly-tracked domains surface real cited items"
  );
  // with all 6 tracked, the untracked-routing section must NOT render
  assert.ok(!md.includes("## Untracked-gap domains"), "no untracked-routing section when all 6 track gaps");
});

test("renderReport worklist: null-safe when no domain tracks gaps", () => {
  const md = renderReport({
    rows: [{ ok: true, key: "mill", slot: "foxtrot", operations: 3, gatesVerified: 7, gatesTotal: 7, unverifiedGaps: null, gapItems: null, firedOps: 3, firedGates: 9, fires: true, bundleWired: true }],
    rollup: { domains: 1, allFire: true, allWired: true, gatesTotalAll: 7, gatesVerifiedTotal: 7, verifyBacklog: 0, gapsUntracked: ["mill"] },
  });
  assert.ok(!md.includes("## Verify-backlog worklist"), "no worklist section when nothing tracks items");
  assert.ok(md.includes("## Untracked-gap domains"), "still routes the untracked domain");
});
