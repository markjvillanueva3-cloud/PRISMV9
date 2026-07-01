/**
 * Tests for outcome-bus-diversity-audit.mjs (#24 audit substrate, slot:india 2026-06-16).
 *
 * R9-honest: hand-verified reference values, synthetic data through the real audit core.
 * Run: node --test scripts/outcome-bus-diversity-audit.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  runDiversityAudit,
  wilsonCi,
  normalizedShannon,
  tallyField,
  topN,
  parseOutcomeBusJsonl,
  parseArgs,
  MIN_MEANINGFUL_N,
  MONOCULTURE_FLOOR,
} from "./outcome-bus-diversity-audit.mjs";

/** Build n synthetic bus rows of mixed sources with hand-verifiable distribution. */
function mixedSources(n, shares) {
  const rows = [];
  const labels = Object.keys(shares);
  let acc = 0;
  for (const label of labels) {
    const count = Math.round(n * shares[label]);
    for (let i = 0; i < count; i += 1) {
      rows.push({ source: label, slot: `s${i % 4}`, domain: `d${i % 3}`, tool: "Bash", success: true });
      acc += 1;
    }
  }
  while (acc < n) { rows.push({ source: labels[0], slot: "s0", domain: "d0" }); acc += 1; }
  return rows;
}

// ----------------------------------------------------------------------------
// Pure-math helpers
// ----------------------------------------------------------------------------

test("wilsonCi: k=N produces a CI whose lower bound stays below 1 on finite N", () => {
  // Wald gives [1,1] at p=1 (pathological); Wilson must give a finite lower bound.
  const [lo, hi] = wilsonCi(100, 100);
  assert.ok(lo < 1, `wilson lower bound at p=1 must be < 1, got ${lo}`);
  assert.equal(hi, 1);
  assert.ok(lo > 0.95, `wilson lower bound on n=100, k=100 should be ~0.964, got ${lo}`);
});

test("wilsonCi: hand-verified mid-p reference (k=80, n=100, z=1.959964)", () => {
  // Wilson center = (0.8 + z^2/200) / (1 + z^2/100). Hand-calc: ~0.7986; CI ~[0.711, 0.866].
  const [lo, hi] = wilsonCi(80, 100);
  assert.ok(Math.abs(lo - 0.7105) < 0.005, `lo expected ~0.7105, got ${lo}`);
  assert.ok(Math.abs(hi - 0.8663) < 0.005, `hi expected ~0.8663, got ${hi}`);
});

test("wilsonCi: n=0 returns [0,0] (no divide-by-zero)", () => {
  assert.deepEqual(wilsonCi(0, 0), [0, 0]);
});

test("normalizedShannon: uniform K=4 -> 1.0; single-label -> 0; K<=1 -> 0", () => {
  assert.equal(normalizedShannon({ a: 25, b: 25, c: 25, d: 25 }), 1);
  assert.equal(normalizedShannon({ a: 100 }), 0);
  assert.equal(normalizedShannon({}), 0);
  // Mixed: 50/50 over 2 labels = 1.0; over 4 labels = H(0.5,0.5)/log2(4) = 1/2.
  assert.equal(normalizedShannon({ a: 50, b: 50 }), 1);
  assert.ok(Math.abs(normalizedShannon({ a: 50, b: 50, c: 0, d: 0 }) - 1) < 1e-12);
});

test("tallyField + topN: ignores empty/null/undefined; share is over non-empty total", () => {
  const rows = [
    { source: "a" }, { source: "a" }, { source: "b" },
    { source: "" }, { source: null }, { source: undefined }, {},
  ];
  const counts = tallyField(rows, "source");
  // Prototype-agnostic equality: tallyField uses Object.create(null) so deepEqual against a plain
  // {a:2,b:1} fails on prototype mismatch (counts.__proto__ === null). Compare by entries instead.
  assert.deepEqual({ ...counts }, { a: 2, b: 1 });
  const t = topN(counts, 3, 5);
  assert.equal(t[0].label, "a");
  assert.equal(t[0].count, 2);
  assert.ok(Math.abs(t[0].share - 2 / 3) < 1e-12);
});

test("parseOutcomeBusJsonl: tracks malformed lines (no silent drop)", () => {
  const text = '{"source":"a"}\n\n{"source":"b"}\nnot-json\n{"source":"c"}';
  const { rows, malformedLines } = parseOutcomeBusJsonl(text);
  assert.equal(rows.length, 3);
  assert.equal(malformedLines, 1);
});

// ----------------------------------------------------------------------------
// India discipline: REFUSE-GATE + monoculture detection
// ----------------------------------------------------------------------------

test("REFUSE-GATE: n<MIN_MEANINGFUL_N -> {ok:false, refused:true}", () => {
  const rows = mixedSources(100, { a: 1.0 });
  const r = runDiversityAudit(rows);
  assert.equal(r.ok, false);
  assert.equal(r.refused, true);
  assert.match(r.error, new RegExp(String(MIN_MEANINGFUL_N)));
});

test("MONOCULTURE detected: dominant source CI lower bound >= floor -> healthy=false", () => {
  // 99.5% single emitter on n=400 -> Wilson lo ~0.983 -> >= 0.95 floor -> monoculture.
  const rows = mixedSources(400, { autoTap: 0.995, other1: 0.003, other2: 0.002 });
  const r = runDiversityAudit(rows);
  assert.equal(r.ok, true);
  assert.equal(r.monoculture, true);
  assert.equal(r.healthy, false);
  assert.equal(r.dominantSource, "autoTap");
  assert.ok(r.dominantShare > 0.99, `dominantShare expected >0.99, got ${r.dominantShare}`);
  assert.ok(r.dominantCi95[0] >= MONOCULTURE_FLOOR, `CI lower ${r.dominantCi95[0]} should be >= ${MONOCULTURE_FLOOR}`);
  assert.match(r.reason, /MONOCULTURE/);
});

test("DIVERSE: 5-way roughly-even distribution -> healthy=true, monoculture=false", () => {
  const rows = mixedSources(500, { a: 0.25, b: 0.25, c: 0.2, d: 0.15, e: 0.15 });
  const r = runDiversityAudit(rows);
  assert.equal(r.ok, true);
  assert.equal(r.healthy, true);
  assert.equal(r.monoculture, false);
  assert.ok(r.sourceShannonNormalized > 0.9, `expected high entropy, got ${r.sourceShannonNormalized}`);
  assert.ok(r.dominantShare < 0.3, `dominantShare expected <0.3, got ${r.dominantShare}`);
});

test("DEFENSE-IN-DEPTH: small-sample wobble at the floor is NOT flagged (uses CI lower, not point estimate)", () => {
  // Point estimate exactly on the floor, but CI is wide enough that lower bound is below it ->
  // do NOT flip to monoculture on a borderline case (no false positive on real-world wobble).
  const rows = mixedSources(MIN_MEANINGFUL_N, { dom: 0.95, other: 0.05 });
  const r = runDiversityAudit(rows);
  assert.equal(r.ok, true);
  assert.ok(r.dominantShare >= 0.94 && r.dominantShare <= 0.96, `share ${r.dominantShare} should be ~0.95`);
  assert.ok(r.dominantCi95[0] < MONOCULTURE_FLOOR, `expected CI lower < ${MONOCULTURE_FLOOR}, got ${r.dominantCi95[0]}`);
  assert.equal(r.monoculture, false);
});

// ----------------------------------------------------------------------------
// Adversarial / failure modes
// ----------------------------------------------------------------------------

test("adversarial: non-array input -> ok:false", () => {
  assert.equal(runDiversityAudit(null).ok, false);
  assert.equal(runDiversityAudit("not-an-array").ok, false);
});

test("adversarial: monocultureFloor outside (0,1] is rejected", () => {
  const rows = mixedSources(300, { a: 0.99, b: 0.01 });
  assert.match(runDiversityAudit(rows, { monocultureFloor: 0 }).error, /monocultureFloor/);
  assert.match(runDiversityAudit(rows, { monocultureFloor: 1.5 }).error, /monocultureFloor/);
});

test("parseArgs rejects non-finite flags (no silent NaN)", () => {
  assert.throws(() => parseArgs(["--top-n", "abc"]), /top-n.*finite/i);
  assert.throws(() => parseArgs(["--monoculture-floor", "NaN"]), /monoculture-floor.*finite/i);
});

// ----------------------------------------------------------------------------
// CLI exit-code regression: monoculture + --strict -> exit 1 (the WHOLE POINT)
// ----------------------------------------------------------------------------
test("CLI: monoculture + --strict on a synthetic bus exits 1 (CI gate)", () => {
  // Build a fixture bus + run the real CLI. Verifies the exit-code branch in main() that an
  // in-process test cannot reach.
  const lines = [];
  for (let i = 0; i < 400; i += 1) {
    const source = i < 398 ? "autoTap" : `other${i}`;
    lines.push(JSON.stringify({ source, slot: `s${i % 3}`, domain: `d${i % 2}`, tool: "Bash", success: true }));
  }
  const fixture = path.join(os.tmpdir(), `_busdiv_strict_${process.pid}.jsonl`);
  fs.writeFileSync(fixture, lines.join("\n"));
  try {
    const cli = path.resolve(new URL("./outcome-bus-diversity-audit.mjs", import.meta.url).pathname.replace(/^\//, ""));
    const r = spawnSync(process.execPath, [cli, "--path", fixture, "--strict", "--json"], { encoding: "utf8" });
    assert.equal(r.status, 1, `expected exit 1 on monoculture+strict; got ${r.status}; stdout=${r.stdout} stderr=${r.stderr}`);
    const report = JSON.parse(r.stdout);
    assert.equal(report.monoculture, true);
    assert.equal(report.dominantSource, "autoTap");
  } finally {
    fs.rmSync(fixture, { force: true });
  }
});
