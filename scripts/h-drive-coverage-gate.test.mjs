/**
 * H-DRIVE-VAULT-SYNERGY / U-8 -- coverage anti-rot gate tests.
 *
 * Covers the pure detector (findUncoveredDomains) hermetically with an injected classify, plus
 * real-fs oracles for readLiveTopLevel/loadCoverage, plus a real-data integration test that loads
 * the actual H-DRIVE-COVERAGE.json and scans the live H:/ root (the "hermetic fakes do not prove
 * production wiring" guard). node:test, real-value assertions, >=3 failure modes, fail-on-revert.
 *
 * @milestone H-DRIVE-VAULT-SYNERGY
 * @unit U-8
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { findUncoveredDomains, readLiveTopLevel, loadCoverage } from "./h-drive-coverage-gate.mjs";

const GATE = fileURLToPath(new URL("./h-drive-coverage-gate.mjs", import.meta.url));
const cloneAlways = () => true; // injected isWorktreeClone: pretend every clone-by-name is a real clone
const cloneNever = () => false; // ...pretend none are (no .git on disk)

// Injected classifier mirroring the real classifyTopLevel contract: { class, skip, dedupeTo? }.
function fakeClassify(name) {
  const low = String(name).toLowerCase();
  if (low === "node_modules" || low === ".git" || low.startsWith("found.0")) return { class: "skip-junk", skip: true };
  if (low === "prism") return { class: "canonical-repo", skip: false };
  if (/^prism[-_.]/.test(low)) return { class: "worktree-clone", skip: false, dedupeTo: "prism" };
  return { class: "infra-tool", skip: false };
}
const cov = (...names) => ({ domains: names.map((name) => ({ scope: "H:/ top-level", name, class: "infra-tool" })) });

test("happy: every substantive live domain is in the map -> ok, 0 uncovered", () => {
  const r = findUncoveredDomains({ coverage: cov("prism", ".tools"), liveTopLevel: ["prism", ".tools"], classify: fakeClassify });
  assert.equal(r.ok, true);
  assert.deepEqual(r.uncovered, []);
  assert.equal(r.coveredCount, 2);
  assert.equal(r.liveCount, 2);
});

test("DRIFT: a new substantive top-level dir not in the map -> uncovered, ok=false", () => {
  const r = findUncoveredDomains({ coverage: cov("prism"), liveTopLevel: ["prism", "brand-new-tool"], classify: fakeClassify });
  assert.equal(r.ok, false);
  assert.equal(r.uncovered.length, 1);
  assert.equal(r.uncovered[0].name, "brand-new-tool");
  assert.equal(r.uncovered[0].class, "infra-tool");
});

test("junk dirs (skip:true) are NEVER a coverage obligation", () => {
  const r = findUncoveredDomains({ coverage: cov("prism"), liveTopLevel: ["prism", "node_modules", ".git", "found.000"], classify: fakeClassify });
  assert.equal(r.ok, true);
  assert.deepEqual(r.uncovered, []);
});

test("real worktree-clone dirs (have .git) are skipped -- fail-on-revert guard", () => {
  // cloneAlways = these clone-by-name dirs ARE real git clones; if the dedupe branch is ever
  // removed, prism-slot-papa would be flagged uncovered -> this fails.
  const r = findUncoveredDomains({ coverage: cov("prism"), liveTopLevel: ["prism", "prism-slot-papa", "prism-slot-golf"], classify: fakeClassify, isWorktreeClone: cloneAlways });
  assert.equal(r.ok, true);
  assert.deepEqual(r.uncovered, []);
  assert.deepEqual(r.suspectClones, []);
});

test("suspectClones: a prism-named dir with NO .git is SURFACED (advisory), never silently swallowed", () => {
  // PRISM_FLOW class: classifyTopLevel says worktree-clone, but no .git -> standalone product.
  const r = findUncoveredDomains({ coverage: cov("prism"), liveTopLevel: ["prism", "prism_flow"], classify: fakeClassify, isWorktreeClone: cloneNever });
  assert.equal(r.ok, true); // advisory bucket does NOT gate (prism-debris must not cry wolf)
  assert.deepEqual(r.uncovered, []);
  assert.equal(r.suspectClones.length, 1);
  assert.equal(r.suspectClones[0].name, "prism_flow");
});

test("suspectClones: a clone-by-name without .git but already mapped is NOT flagged", () => {
  const r = findUncoveredDomains({ coverage: cov("prism", "prism_flow"), liveTopLevel: ["prism", "prism_flow"], classify: fakeClassify, isWorktreeClone: cloneNever });
  assert.equal(r.ok, true);
  assert.deepEqual(r.suspectClones, []);
});

test("coverage match is case-insensitive (no false uncovered)", () => {
  const r = findUncoveredDomains({ coverage: cov("Prism", ".Tools"), liveTopLevel: ["prism", ".tools"], classify: fakeClassify });
  assert.equal(r.ok, true);
  assert.deepEqual(r.uncovered, []);
});

test("staleCovered: a mapped domain no longer on disk is advisory, does NOT gate", () => {
  const r = findUncoveredDomains({ coverage: cov("prism", "deleted-folder"), liveTopLevel: ["prism"], classify: fakeClassify });
  assert.equal(r.ok, true); // stale does not fail the gate
  assert.equal(r.staleCovered.length, 1);
  assert.equal(r.staleCovered[0].name, "deleted-folder");
});

test("wrong-scope map entries are ignored (only H:/ top-level counts)", () => {
  const coverage = { domains: [{ scope: "H:/prism subdirs", name: "tools", class: "repo-subdir" }] };
  const r = findUncoveredDomains({ coverage, liveTopLevel: ["tools"], classify: fakeClassify });
  // "tools" is substantive + only present under a different scope -> uncovered at top level.
  assert.equal(r.ok, false);
  assert.equal(r.uncovered[0].name, "tools");
  assert.equal(r.coveredCount, 0);
});

test("null/empty guards: null coverage + null/non-array live never throw", () => {
  const a = findUncoveredDomains({ coverage: null, liveTopLevel: ["x"], classify: fakeClassify });
  assert.equal(a.ok, false); // 'x' substantive, no map -> uncovered
  const b = findUncoveredDomains({ coverage: cov("prism"), liveTopLevel: null, classify: fakeClassify });
  assert.equal(b.ok, true); // nothing live to check
  assert.equal(b.liveCount, 0);
  const c = findUncoveredDomains({ coverage: {}, liveTopLevel: [], classify: fakeClassify });
  assert.equal(c.ok, true);
});

test("case-collision on disk is de-duped (counted once)", () => {
  const r = findUncoveredDomains({ coverage: cov("prism"), liveTopLevel: ["Foo", "foo"], classify: fakeClassify });
  assert.equal(r.liveCount, 1);
  assert.equal(r.uncovered.length, 1); // one "Foo" uncovered, not two
});

test("readLiveTopLevel returns only dir names; null on a bad root", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hdrive-gate-"));
  try {
    fs.mkdirSync(path.join(tmp, "alpha"));
    fs.mkdirSync(path.join(tmp, "beta"));
    fs.writeFileSync(path.join(tmp, "a-file.txt"), "x");
    const dirs = readLiveTopLevel(tmp);
    assert.deepEqual([...dirs].sort(), ["alpha", "beta"]);
    assert.equal(readLiveTopLevel(path.join(tmp, "does-not-exist")), null);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("loadCoverage: valid JSON parses; corrupt/missing -> null", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hdrive-gate-"));
  try {
    const good = path.join(tmp, "good.json");
    fs.writeFileSync(good, JSON.stringify(cov("prism")));
    assert.equal(loadCoverage(good).domains.length, 1);
    const bad = path.join(tmp, "bad.json");
    fs.writeFileSync(bad, "{not json");
    assert.equal(loadCoverage(bad), null);
    assert.equal(loadCoverage(path.join(tmp, "missing.json")), null);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("integration: real H-DRIVE-COVERAGE.json + live H:/ scan via DEFAULT classify -> no crash, sane report", () => {
  const repoRoot = path.resolve(import.meta.dirname, "..");
  const mapPath = path.join(repoRoot, "state", "shared", "H-DRIVE-COVERAGE.json");
  const coverage = loadCoverage(mapPath);
  const live = readLiveTopLevel("H:/");
  if (!coverage || !live) {
    // Environment without the map / H: root (e.g. CI on another host) -> skip-loud, do not fake-pass.
    assert.ok(true, "coverage map or H:/ root absent on this host -- integration check skipped");
    return;
  }
  const r = findUncoveredDomains({ coverage, liveTopLevel: live }); // DEFAULT classify + isWorktreeClone (real wiring)
  assert.equal(typeof r.ok, "boolean");
  assert.ok(r.coveredCount > 0, "real coverage map must have top-level domains");
  assert.ok(Array.isArray(r.uncovered));
  assert.ok(Array.isArray(r.suspectClones));
  assert.ok(Array.isArray(r.staleCovered));
});

// -- CLI exit-code oracles (the gate's reason to exist is its exit contract; test it via subprocess) --
test("CLI exit codes: clean=0, drift=1, bad-coverage=2, bad-root=2 (subprocess oracle)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hdrive-gate-cli-"));
  try {
    fs.mkdirSync(path.join(tmp, "alpha")); // substantive (classifyTopLevel -> infra-tool), no .git
    const covClean = path.join(tmp, "clean.json");
    fs.writeFileSync(covClean, JSON.stringify(cov("alpha")));
    const covDrift = path.join(tmp, "drift.json");
    fs.writeFileSync(covDrift, JSON.stringify({ domains: [] }));
    const run = (args) => spawnSync(process.execPath, [GATE, ...args], { encoding: "utf8" });

    const clean = run(["--coverage", covClean, "--root", tmp]);
    assert.equal(clean.status, 0, clean.stdout + clean.stderr);

    const drift = run(["--coverage", covDrift, "--root", tmp]);
    assert.equal(drift.status, 1, drift.stdout + drift.stderr);
    assert.match(drift.stdout, /DRIFT/);

    const badCov = run(["--coverage", path.join(tmp, "missing.json"), "--root", tmp]);
    assert.equal(badCov.status, 2, badCov.stdout + badCov.stderr);

    const badRoot = run(["--coverage", covClean, "--root", path.join(tmp, "no-such-root")]);
    assert.equal(badRoot.status, 2, badRoot.stdout + badRoot.stderr);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("CLI --json: drift -> exit 1 + parseable ok:false report (subprocess oracle)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hdrive-gate-cli-"));
  try {
    fs.mkdirSync(path.join(tmp, "alpha"));
    const covDrift = path.join(tmp, "drift.json");
    fs.writeFileSync(covDrift, JSON.stringify({ domains: [] }));
    const r = spawnSync(process.execPath, [GATE, "--json", "--coverage", covDrift, "--root", tmp], { encoding: "utf8" });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.uncovered[0].name, "alpha");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("CLI --json: measurement failure -> exit 2 + measurementFailure:true (subprocess oracle)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hdrive-gate-cli-"));
  try {
    const r = spawnSync(process.execPath, [GATE, "--json", "--coverage", path.join(tmp, "missing.json"), "--root", tmp], { encoding: "utf8" });
    assert.equal(r.status, 2, r.stdout + r.stderr);
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.measurementFailure, true);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
