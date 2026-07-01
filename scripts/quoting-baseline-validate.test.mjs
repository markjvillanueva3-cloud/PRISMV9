#!/usr/bin/env node
/**
 * Tests for quoting-baseline-validate.mjs (QUOTING-SYNERGY-MS0/U-QP-BASELINE-GUARD).
 * node:test — pure buildReport() cases + a real spawn-based E2E exit-code check.
 * Run: node --test scripts/quoting-baseline-validate.test.mjs < /dev/null
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { buildReport } from "./quoting-baseline-validate.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(HERE, "quoting-baseline-validate.mjs");

const degenRec = {
  customer: "Okuma_Multus_B250II",
  actual_revenue_usd: 10,
  estimated_time_in_cut_s: 600,
  machine_rate_usd_per_hr: 95,
  estimated_material_spend_usd: 60,
};

test("buildReport: degenerate payload => refuse, ok=false", () => {
  const payload = { records: Array.from({ length: 10 }, () => ({ ...degenRec })) };
  const r = buildReport(payload);
  assert.equal(r.ok, false);
  assert.equal(r.refuse, true);
  assert.equal(r.total, 10);
  assert.equal(r.poisoned, 10);
  assert.ok(r.reasons.length >= 2);
  assert.equal(r.revenue_unique_values, 1);
});

test("buildReport: clean payload => ok=true, refuse=false", () => {
  const payload = {
    records: [
      { customer: "ITW", actual_revenue_usd: 1240 },
      { customer: "Alcoa", actual_revenue_usd: 880 },
      { customer: "Holo-Krome", actual_revenue_usd: 2310 },
      { customer: "SFS", actual_revenue_usd: 560 },
      { customer: "Optimas", actual_revenue_usd: 1990 },
      { customer: "ACME", actual_revenue_usd: 705 },
    ],
  };
  const r = buildReport(payload);
  assert.equal(r.ok, true);
  assert.equal(r.refuse, false);
  assert.equal(r.poisoned, 0);
  assert.deepEqual(r.reasons, []);
});

test("buildReport: missing/empty records => ok (CLI main handles 0-record as exit 1)", () => {
  assert.equal(buildReport({}).ok, true);
  assert.equal(buildReport({ records: [] }).total, 0);
  assert.equal(buildReport(null).total, 0);
});

test("E2E: CLI exits 2 (REFUSE) on the real degenerate baseline, 1 on a missing file", () => {
  // missing file => exit 1
  const miss = spawnSync(process.execPath, [CLI, "--baseline", "does-not-exist.json", "--json"], {
    encoding: "utf-8",
  });
  assert.equal(miss.status, 1);

  // real production baseline (if present) => exit 2 while it is degenerate, 0 once fixed
  const candidates = [
    resolve(HERE, "..", "..", "prism", "state", "shared", "quoting", "baseline-records.json"),
    "H:/prism/state/shared/quoting/baseline-records.json",
  ].filter((p) => existsSync(p));
  if (candidates.length === 0) return; // absent on this host — skip
  const run = spawnSync(process.execPath, [CLI, "--baseline", candidates[0], "--json"], {
    encoding: "utf-8",
  });
  // exit code must be consistent with the JSON verdict (2 if refuse, 0 if ok)
  const out = JSON.parse(run.stdout.trim().split("\n").pop());
  assert.equal(run.status, out.refuse ? 2 : 0);
  assert.equal(typeof out.total, "number");
});
