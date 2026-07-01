/**
 * algorithm-dispatcher-coverage tests -- synthetic src trees with known wiring,
 * exercising the import-context reference rule, barrel re-exports, WIRE-EXEMPT
 * classification, --via scoping, and --strict.
 *
 * DISCOVERY-EFFICIENCY/U-ALGORITHM-COVERAGE-DIFF (slot:tango, 2026-06-15).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  listAlgorithmModules,
  walkTsFiles,
  computeReferenced,
  computeBarrelReexports,
  hasWireExemptMarker,
  computeCoverage,
} from "./algorithm-dispatcher-coverage.mjs";

// Build a synthetic src tree:
//   algorithms/{Alpha,Beta,Gamma,Delta}.ts + index.ts + types.ts + Alpha.test.ts
//   engines/Consumer.ts imports algorithms/Alpha; Notes.ts only MENTIONS Beta in a comment.
//   Gamma carries a WIRE-EXEMPT marker; Delta is re-exported by the barrel.
function buildFixture() {
  const root = mkdtempSync(join(tmpdir(), "algo-cov-"));
  const algo = join(root, "algorithms");
  const eng = join(root, "engines");
  mkdirSync(algo, { recursive: true });
  mkdirSync(eng, { recursive: true });
  const IMPORT = "im" + "port"; // avoid this test file self-matching the import regex
  writeFileSync(join(algo, "Alpha.ts"), `export class Alpha {}`);
  writeFileSync(join(algo, "Beta.ts"), `export class Beta {}`);
  writeFileSync(join(algo, "Gamma.ts"), `// WIRE-EXEMPT: takes a closure\nexport class Gamma {}`);
  writeFileSync(join(algo, "Delta.ts"), `export class Delta {}`);
  writeFileSync(join(algo, "index.ts"), `export * from "./Delta.js";\n`);
  writeFileSync(join(algo, "types.ts"), `export type T = number;`);
  writeFileSync(join(algo, "Alpha.test.ts"), `// test for Alpha`);
  writeFileSync(join(eng, "Consumer.ts"), `${IMPORT} { Alpha } from "../algorithms/Alpha.js";\nexport const c = new Alpha();`);
  // Bare comment mention of Beta -- must NOT count as a reference (import-context rule).
  writeFileSync(join(eng, "Notes.ts"), `// see algorithms/Beta for the legacy approach\nexport const n = 1;`);
  return { root, algo, eng };
}

// -- listAlgorithmModules --

test("listAlgorithmModules: excludes tests, index.ts, types.ts", () => {
  const { root, algo } = buildFixture();
  try {
    assert.deepEqual(listAlgorithmModules(algo), ["Alpha", "Beta", "Delta", "Gamma"]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// -- walkTsFiles --

test("walkTsFiles: recurses and collects .ts, skips node_modules", () => {
  const { root } = buildFixture();
  try {
    mkdirSync(join(root, "node_modules", "pkg"), { recursive: true });
    writeFileSync(join(root, "node_modules", "pkg", "x.ts"), `export const x = 1;`);
    const files = walkTsFiles(root).map((f) => f.replace(/\\/g, "/"));
    assert.ok(files.some((f) => f.endsWith("/engines/Consumer.ts")));
    assert.ok(files.some((f) => f.endsWith("/algorithms/Alpha.ts")));
    assert.ok(!files.some((f) => f.includes("node_modules")), "node_modules skipped");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("walkTsFiles: missing dir returns empty (fail-soft)", () => {
  assert.deepEqual(walkTsFiles("/no/such/dir/xyz"), []);
});

// -- computeReferenced: import-context only --

test("computeReferenced: counts a real import, NOT a bare comment mention", () => {
  const { root, eng } = buildFixture();
  try {
    const ref = computeReferenced([join(eng, "Consumer.ts"), join(eng, "Notes.ts")]);
    assert.ok(ref.has("Alpha"), "Alpha is imported");
    assert.ok(!ref.has("Beta"), "Beta is only mentioned in a comment -- not a wiring");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("computeReferenced: matches dynamic import() form", () => {
  const ref = computeReferenced(["x.ts"], () => `const m = await import("../algorithms/Foo.js");`);
  assert.ok(ref.has("Foo"));
});

// -- computeBarrelReexports --

test("computeBarrelReexports: extracts re-exported module names", () => {
  const { root, algo } = buildFixture();
  try {
    const b = computeBarrelReexports(algo);
    assert.ok(b.has("Delta"));
    assert.equal(b.has("Alpha"), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("computeBarrelReexports: missing index.ts -> empty set", () => {
  const dir = mkdtempSync(join(tmpdir(), "algo-nobarrel-"));
  try {
    assert.equal(computeBarrelReexports(dir).size, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// -- hasWireExemptMarker --

test("hasWireExemptMarker: true for a marked module, false otherwise", () => {
  const { root, algo } = buildFixture();
  try {
    assert.equal(hasWireExemptMarker(algo, "Gamma"), true);
    assert.equal(hasWireExemptMarker(algo, "Alpha"), false);
    assert.equal(hasWireExemptMarker(algo, "DoesNotExist"), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// -- computeCoverage: full classification --

test("computeCoverage: classifies wired / orphaned / wire-exempt / barrel-only", () => {
  const { root } = buildFixture();
  try {
    const r = computeCoverage({ srcDir: root });
    assert.equal(r.total, 4);
    // Alpha (imported) + Delta (barrel) wired; Beta orphaned; Gamma wire-exempt.
    assert.equal(r.wiredCount, 2);
    assert.equal(r.dormantCount, 2);
    assert.deepEqual(r.orphaned, ["Beta"]);
    assert.deepEqual(r.wireExempt, ["Gamma"]);
    assert.deepEqual(r.barrelOnly, ["Delta"]);
    assert.equal(r.orphanedCount, 1);
    assert.equal(r.wireExemptCount, 1);
    assert.equal(r.coveragePct, 50);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("computeCoverage --strict: barrel re-exports do NOT count as wired", () => {
  const { root } = buildFixture();
  try {
    const r = computeCoverage({ srcDir: root, strict: true });
    // Delta loses its barrel wiring -> dormant+orphaned (no marker).
    assert.ok(r.orphaned.includes("Delta"), "Delta orphaned under strict");
    assert.equal(r.wiredCount, 1); // only Alpha
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("computeCoverage --via: scopes consumers to a path substring", () => {
  const { root } = buildFixture();
  try {
    // Scope to the engines/Consumer file only -> Alpha imported there; barrel ignored under via.
    const r = computeCoverage({ srcDir: root, via: "engines/Consumer" });
    assert.ok(r.orphaned.includes("Beta"), "Beta still orphaned");
    assert.ok(r.orphaned.includes("Delta"), "Delta orphaned (barrel ignored when via-scoped)");
    assert.equal(r.wiredCount, 1, "only Alpha is imported by the scoped consumer");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("computeCoverage: empty algorithms dir -> 0 total, no throw", () => {
  const root = mkdtempSync(join(tmpdir(), "algo-empty-"));
  try {
    mkdirSync(join(root, "algorithms"), { recursive: true });
    const r = computeCoverage({ srcDir: root });
    assert.equal(r.total, 0);
    assert.equal(r.dormantCount, 0);
    assert.equal(r.coveragePct, 0);
    assert.deepEqual(r.orphaned, []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("computeCoverage: real PRISM tree -- orphaned set excludes WIRE-EXEMPT (regression oracle)", () => {
  // Live tree: WIRE-EXEMPT course-forge algorithms must NEVER appear in orphaned.
  const r = computeCoverage();
  assert.ok(r.total > 100, `expected 100+ algorithm modules, got ${r.total}`);
  const exempt = new Set(r.wireExempt);
  for (const o of r.orphaned) {
    assert.ok(!exempt.has(o), `${o} is both orphaned and wire-exempt -- classification leak`);
  }
  // FiniteDifferenceMethod carries a WIRE-EXEMPT marker -> must be exempt, not orphaned.
  assert.ok(!r.orphaned.includes("FiniteDifferenceMethod"), "FiniteDifferenceMethod is WIRE-EXEMPT, not orphaned");
});
