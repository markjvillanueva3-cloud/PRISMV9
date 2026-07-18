#!/usr/bin/env node
/**
 * Tests for helper-orphan-rank.mjs.
 *
 * Uses node:test (the .claude/ vitest infra has a documented pre-existing
 * vite-transform bug; scripts/ ranker tests standardise on `node --test`).
 *
 * Two layers, per the RGS-MS1 lesson ([[reference_rgs_tool_autoinvoke_ms1_2026_05_16]]):
 *   1. Pure-core unit tests with INJECTED resolvers (classifyHelper / rankHelpers).
 *   2. ONE real-data E2E that spawns the actual script with --json and asserts
 *      the production wiring against the live .claude/helpers tree — hermetic
 *      fakes alone do not prove the corpus scan works.
 *
 * Run: node --test scripts/helper-orphan-rank.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import url from "node:url";

import { classifyHelper, rankHelpers } from "./helper-orphan-rank.mjs";

const __filename = url.fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const SCRIPT = path.join(ROOT, "scripts", "helper-orphan-rank.mjs");

// ---------- pure core: classifyHelper ----------

test("classifyHelper: strong beats every weaker signal", () => {
  assert.equal(classifyHelper({ strong: true, crossHelper: true, selfTest: true }), "wired-strong");
  assert.equal(classifyHelper({ strong: true, crossHelper: false, selfTest: false }), "wired-strong");
});

test("classifyHelper: cross-helper when no strong but referenced by a peer helper", () => {
  assert.equal(classifyHelper({ strong: false, crossHelper: true, selfTest: true }), "cross-helper-only");
  assert.equal(classifyHelper({ strong: false, crossHelper: true, selfTest: false }), "cross-helper-only");
});

test("classifyHelper: self-test only when the sole reference is its own test", () => {
  assert.equal(classifyHelper({ strong: false, crossHelper: false, selfTest: true }), "self-test-only");
});

test("classifyHelper: orphan only when zero references anywhere", () => {
  assert.equal(classifyHelper({ strong: false, crossHelper: false, selfTest: false }), "orphan");
});

// ---------- pure core: rankHelpers ----------

test("rankHelpers: counts, orphanRate math, and orphan ordering", () => {
  const helpers = [
    { name: "a.mjs", loc: 10, sizeBytes: 100, ageDays: 1 },
    { name: "b.mjs", loc: 999, sizeBytes: 9000, ageDays: 2 }, // biggest orphan
    { name: "c.mjs", loc: 50, sizeBytes: 500, ageDays: 3 },   // orphan
    { name: "d.mjs", loc: 50, sizeBytes: 800, ageDays: 4 },   // orphan, same loc as c -> bytes tiebreak
    { name: "e.mjs", loc: 5, sizeBytes: 50, ageDays: 5 },     // wired
  ];
  const refMap = {
    "a.mjs": { strong: false, crossHelper: true, selfTest: false },  // cross-helper-only
    "b.mjs": { strong: false, crossHelper: false, selfTest: false }, // orphan
    "c.mjs": { strong: false, crossHelper: false, selfTest: false }, // orphan
    "d.mjs": { strong: false, crossHelper: false, selfTest: false }, // orphan
    "e.mjs": { strong: true, crossHelper: false, selfTest: false },  // wired-strong
  };
  const r = rankHelpers(helpers, (n) => refMap[n]);

  assert.equal(r.summary.totalHelpers, 5);
  assert.equal(r.summary.wiredStrong, 1);
  assert.equal(r.summary.crossHelperOnly, 1);
  assert.equal(r.summary.selfTestOnly, 0);
  assert.equal(r.summary.orphan, 3);
  assert.equal(r.summary.orphanRate, 0.6); // 3/5

  // orphans sorted: b (loc 999) > [d,c same loc 50 -> bytes desc: d 800 > c 500]
  assert.deepEqual(r.orphans.map((o) => o.name), ["b.mjs", "d.mjs", "c.mjs"]);
});

test("rankHelpers: empty input yields zero orphanRate (no divide-by-zero)", () => {
  const r = rankHelpers([], () => ({ strong: false, crossHelper: false, selfTest: false }));
  assert.equal(r.summary.totalHelpers, 0);
  assert.equal(r.summary.orphanRate, 0);
  assert.deepEqual(r.orphans, []);
});

test("rankHelpers: all-wired yields orphanRate 0 and empty orphan list", () => {
  const helpers = [
    { name: "x.mjs", loc: 1, sizeBytes: 1, ageDays: 0 },
    { name: "y.mjs", loc: 2, sizeBytes: 2, ageDays: 0 },
  ];
  const r = rankHelpers(helpers, () => ({ strong: true, crossHelper: false, selfTest: false }));
  assert.equal(r.summary.orphanRate, 0);
  assert.equal(r.summary.wiredStrong, 2);
  assert.deepEqual(r.orphans, []);
});

// ---------- real-data E2E (production wiring proof) ----------

test("E2E: --json against the live .claude/helpers tree is self-consistent", () => {
  const res = spawnSync(process.execPath, [SCRIPT, "--json"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  assert.equal(res.status, 0, `script exited ${res.status}: ${res.stderr?.slice(0, 400)}`);

  const out = JSON.parse(res.stdout);
  assert.equal(out.ok, true);

  // totalHelpers MUST equal the on-disk non-test .mjs count.
  const helperDir = path.join(ROOT, ".claude", "helpers");
  assert.ok(existsSync(helperDir), "helpers dir must exist for this repo");
  const onDisk = readdirSync(helperDir).filter(
    (n) => n.endsWith(".mjs") && !n.endsWith(".test.mjs"),
  ).length;
  assert.equal(
    out.summary.totalHelpers,
    onDisk,
    `script reported ${out.summary.totalHelpers} helpers, on-disk count is ${onDisk}`,
  );

  // orphanRate is a finite number in [0,1].
  const rate = out.summary.orphanRate;
  assert.ok(Number.isFinite(rate) && rate >= 0 && rate <= 1, `orphanRate out of range: ${rate}`);

  // The four classes partition the total exactly (no helper double-counted).
  const s = out.summary;
  assert.equal(
    s.wiredStrong + s.crossHelperOnly + s.selfTestOnly + s.orphan,
    s.totalHelpers,
    "classification buckets must partition totalHelpers",
  );

  // orphans array length matches the orphan count, and is sorted by loc desc.
  assert.equal(out.orphans.length, s.orphan, "orphans[] length must match summary.orphan");
  for (let i = 1; i < out.orphans.length; i++) {
    assert.ok(
      out.orphans[i - 1].loc >= out.orphans[i].loc,
      `orphans not sorted by loc desc at index ${i}`,
    );
  }

  // MANDATORY wiring anchor. A well-known load-bearing helper that is heavily
  // referenced by hooks/skills MUST classify wired-strong. This is the SOLE
  // line of defense against a false-all-orphan (the structural assertions
  // above all hold even when the corpus scan silently returns empty). It must
  // NOT be skippable via `if (known)` — that is the exact RGS-MS1 false-green
  // class the design claims to defend against. If per-agent-handoff.mjs is
  // ever renamed/archived, this test must FAIL LOUD so the anchor is updated,
  // not silently bypassed.
  const known = out.all.find((h) => h.name === "per-agent-handoff.mjs");
  assert.ok(
    known,
    "anchor helper per-agent-handoff.mjs missing from out.all — E2E cannot prove the strong-corpus scan without it; rename ⇒ update this anchor, do not let it vanish",
  );
  assert.equal(
    known.classification,
    "wired-strong",
    "strong-corpus scan regressed: a heavily-wired helper classified non-strong ⇒ likely false-all-orphan",
  );

  // Non-degeneracy floor: a working strong scan classifies MANY helpers
  // wired-strong. A scan that returned empty (every corpus dir missing /
  // walkFiles swallowing every throw) collapses wiredStrong→0 while still
  // satisfying every structural assertion above.
  assert.ok(
    s.wiredStrong >= 10,
    `only ${s.wiredStrong} wired-strong of ${s.totalHelpers} — corpus scan likely degraded/empty`,
  );

  // Negative control (brackets the metric from the OTHER side): the scan must
  // retain discriminating power. An over-matching scan (treats the corpus as
  // one blob / matches bare stems) collapses orphan→0 and defeats F6 entirely.
  assert.ok(out.summary.orphan > 0, "real scan found ZERO orphans on a 187-helper tree — over-matching; F6 metric is dead");
  assert.ok(out.summary.orphanRate < 0.95, "near-total orphan ⇒ strong scan effectively returned empty");
});
