#!/usr/bin/env node
/**
 * Tests for cold-script-rank.mjs.
 *
 * node:test (the .claude/ vitest infra has a documented pre-existing
 * vite-transform bug; scripts/ ranker tests standardise on `node --test`).
 *
 * Two layers, per the RGS-MS1 lesson ([[reference_rgs_tool_autoinvoke_ms1_2026_05_16]]):
 *   1. Pure-core unit tests with INJECTED resolvers (classifyScript / rankScripts).
 *   2. ONE real-data E2E that spawns the actual script with --json and asserts
 *      the production wiring against the live scripts/ tree — hermetic fakes
 *      alone do not prove the corpus scan works. The wiring anchor is
 *      MANDATORY (not `if (known)`) and bracketed by non-degeneracy floors so
 *      the E2E fails loud on either a false-all-cold OR a false-no-cold scan.
 *
 * Run: node --test scripts/cold-script-rank.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import url from "node:url";

import { classifyScript, rankScripts } from "./cold-script-rank.mjs";

const __filename = url.fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const SCRIPT = path.join(ROOT, "scripts", "cold-script-rank.mjs");

// ---------- pure core: classifyScript ----------

test("classifyScript: strong beats self-test", () => {
  assert.equal(classifyScript({ strong: true, selfTest: true }), "wired-strong");
  assert.equal(classifyScript({ strong: true, selfTest: false }), "wired-strong");
});

test("classifyScript: self-test only when sole reference is its own test", () => {
  assert.equal(classifyScript({ strong: false, selfTest: true }), "self-test-only");
});

test("classifyScript: cold only when zero references anywhere", () => {
  assert.equal(classifyScript({ strong: false, selfTest: false }), "cold");
});

// ---------- pure core: rankScripts ----------

test("rankScripts: counts, coldRate math, and cold ordering (loc → bytes → rel)", () => {
  const scripts = [
    { name: "a.mjs", rel: "a.mjs", loc: 10, sizeBytes: 100, ageDays: 1 },
    { name: "b.mjs", rel: "sub/b.mjs", loc: 999, sizeBytes: 9000, ageDays: 2 }, // biggest cold
    { name: "c.mjs", rel: "c.mjs", loc: 50, sizeBytes: 500, ageDays: 3 },       // cold
    { name: "d.mjs", rel: "d.mjs", loc: 50, sizeBytes: 800, ageDays: 4 },       // cold, loc tie -> bytes
    { name: "e.mjs", rel: "e.mjs", loc: 5, sizeBytes: 50, ageDays: 5 },         // wired
    { name: "f.mjs", rel: "f.mjs", loc: 7, sizeBytes: 70, ageDays: 6 },         // self-test
  ];
  const refMap = {
    "a.mjs": { strong: false, selfTest: false }, // cold
    "b.mjs": { strong: false, selfTest: false }, // cold
    "c.mjs": { strong: false, selfTest: false }, // cold
    "d.mjs": { strong: false, selfTest: false }, // cold
    "e.mjs": { strong: true, selfTest: false },  // wired-strong
    "f.mjs": { strong: false, selfTest: true },  // self-test-only
  };
  const r = rankScripts(scripts, (n) => refMap[n]);

  assert.equal(r.summary.totalScripts, 6);
  assert.equal(r.summary.wiredStrong, 1);
  assert.equal(r.summary.selfTestOnly, 1);
  assert.equal(r.summary.cold, 4);
  assert.equal(r.summary.coldRate, 0.6667); // 4/6 -> 0.6667 (4dp)

  // cold sorted: b(999) > [d,c loc 50 -> bytes desc d800>c500] > a(10)
  assert.deepEqual(r.cold.map((c) => c.name), ["b.mjs", "d.mjs", "c.mjs", "a.mjs"]);
});

test("rankScripts: empty input yields zero coldRate (no divide-by-zero)", () => {
  const r = rankScripts([], () => ({ strong: false, selfTest: false }));
  assert.equal(r.summary.totalScripts, 0);
  assert.equal(r.summary.coldRate, 0);
  assert.deepEqual(r.cold, []);
});

test("rankScripts: all-wired yields coldRate 0 and empty cold list", () => {
  const scripts = [
    { name: "x.mjs", rel: "x.mjs", loc: 1, sizeBytes: 1, ageDays: 0 },
    { name: "y.mjs", rel: "y.mjs", loc: 2, sizeBytes: 2, ageDays: 0 },
  ];
  const r = rankScripts(scripts, () => ({ strong: true, selfTest: false }));
  assert.equal(r.summary.coldRate, 0);
  assert.equal(r.summary.wiredStrong, 2);
  assert.deepEqual(r.cold, []);
});

// ---------- real-data E2E (production wiring proof) ----------

test("E2E: --json against the live scripts/ tree is self-consistent", () => {
  const res = spawnSync(process.execPath, [SCRIPT, "--json"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  assert.equal(res.status, 0, `script exited ${res.status}: ${res.stderr?.slice(0, 400)}`);

  const out = JSON.parse(res.stdout);
  assert.equal(out.ok, true);

  const s = out.summary;
  assert.ok(s.totalScripts > 100, `expected >100 candidate scripts, got ${s.totalScripts}`);

  // coldRate finite in [0,1].
  assert.ok(
    Number.isFinite(s.coldRate) && s.coldRate >= 0 && s.coldRate <= 1,
    `coldRate out of range: ${s.coldRate}`,
  );

  // three classes partition the total exactly (no script double-counted).
  assert.equal(
    s.wiredStrong + s.selfTestOnly + s.cold,
    s.totalScripts,
    "classification buckets must partition totalScripts",
  );

  // cold[] length matches the cold count, sorted by loc desc.
  assert.equal(out.cold.length, s.cold, "cold[] length must match summary.cold");
  for (let i = 1; i < out.cold.length; i++) {
    assert.ok(
      out.cold[i - 1].loc >= out.cold[i].loc,
      `cold not sorted by loc desc at index ${i}`,
    );
  }

  // MANDATORY wiring anchor — system-synergy-map.mjs is referenced both by a
  // sibling script (synergy-regression-watch.mjs → cross-script STRONG) and by
  // the /forge-audit-v2 skill .md (STRONG). It MUST classify wired-strong. Not
  // skippable: if it is ever renamed, this test FAILS LOUD so the anchor is
  // updated rather than silently bypassed (RGS-MS1 false-green class).
  const anchor = out.all.find((c) => c.name === "system-synergy-map.mjs");
  assert.ok(
    anchor,
    "anchor script system-synergy-map.mjs missing from out.all — E2E cannot prove the strong-corpus scan; rename ⇒ update this anchor",
  );
  assert.equal(
    anchor.classification,
    "wired-strong",
    "strong-corpus scan regressed: a doubly-referenced script classified non-strong ⇒ likely false-all-cold",
  );

  // Non-degeneracy (scan returned empty → false-all-cold): a working strong
  // scan classifies many scripts wired-strong.
  assert.ok(
    s.wiredStrong >= 20,
    `only ${s.wiredStrong} wired-strong of ${s.totalScripts} — corpus scan likely degraded/empty`,
  );

  // Negative control (over-matching → false-no-cold): the scan must retain
  // discriminating power on a tree that is empirically substantially cold.
  assert.ok(s.cold > 0, "real scan found ZERO cold scripts — over-matching; F5 metric is dead");
  assert.ok(s.coldRate < 0.95, "near-total cold ⇒ strong scan effectively returned empty");
});
