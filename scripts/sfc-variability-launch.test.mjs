#!/usr/bin/env node
/**
 * Hermetic tests for sfc-variability-launch.mjs pure helpers.
 *
 * The launcher's resume-param resolution is covered by the guard suite's
 * `pickResumeParams` tests (the launcher imports that pure fn). This file
 * pins the launcher's OWN pure helpers: --domain parsing and the fail-soft
 * sidecar reader.
 *
 * Run: node --test scripts/sfc-variability-launch.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parseDomain, readSidecarFile } from "./sfc-variability-launch.mjs";

const LAUNCHER = resolve(fileURLToPath(import.meta.url), "../sfc-variability-launch.mjs");

// ─── parseDomain ─────────────────────────────────────────────────────────
test("parseDomain: extracts the --domain value", () => {
  assert.equal(parseDomain(["--domain", "mill"]), "mill");
  assert.equal(parseDomain(["--workers", "4", "--domain", "lathe"]), "lathe");
});
test("parseDomain: missing flag / trailing flag → null", () => {
  assert.equal(parseDomain([]), null);
  assert.equal(parseDomain(["--workers", "4"]), null);
  assert.equal(parseDomain(["--domain"]), null); // no value after flag
});

// ─── readSidecarFile (real fs, tmpdir) ───────────────────────────────────
test("readSidecarFile: valid sidecar → parsed object", () => {
  const dir = mkdtempSync(join(tmpdir(), "sfc-launch-test-"));
  try {
    writeFileSync(join(dir, ".resume-state.json"),
      JSON.stringify({ host: "PC-X", launchSkip: 400100, workers: 4 }));
    const sc = readSidecarFile(dir);
    assert.equal(sc.host, "PC-X");
    assert.equal(sc.launchSkip, 400100);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("readSidecarFile: absent file → null (fail-soft)", () => {
  const dir = mkdtempSync(join(tmpdir(), "sfc-launch-test-"));
  try {
    assert.equal(readSidecarFile(dir), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("readSidecarFile: malformed JSON → null (fail-soft, never throws)", () => {
  const dir = mkdtempSync(join(tmpdir(), "sfc-launch-test-"));
  try {
    writeFileSync(join(dir, ".resume-state.json"), "{not valid json");
    assert.equal(readSidecarFile(dir), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("readSidecarFile: array JSON → returned as-is (object-typed, fields absent)", () => {
  // An array is typeof "object" so readSidecarFile returns it; the launcher's
  // downstream pickResumeParams then finds no launchSkip/workers fields →
  // safe defaults. Pin the actual contract, not a tautology.
  const dir = mkdtempSync(join(tmpdir(), "sfc-launch-test-"));
  try {
    writeFileSync(join(dir, ".resume-state.json"), "[1,2,3]");
    const sc = readSidecarFile(dir);
    assert.ok(Array.isArray(sc), "an array sidecar is returned as the array");
    assert.equal(sc.launchSkip, undefined, "an array has no launchSkip field");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── SUBPROCESS INTEGRATION ORACLE ───────────────────────────────────────
// Per the standing PRISM lesson (RGS-TOOL-AUTOINVOKE-MS1, U-SLOT-BIND-ENFORCE):
// a pure-core + injected-deps design MUST ship a real subprocess oracle — the
// launcher's load-bearing main() (domain validation → sidecar → argv → spawn →
// exit-code passthrough) lives outside the pure helpers and is otherwise dark.
//
// The stub batch is a tiny .mjs that tsx runs in place of the real batch; it
// exits with a code derived from its --skip arg, so the test proves the
// launcher (a) resolved the skip from the fixtured sidecar and (b) propagated
// the child's exit code.
const NODE = process.execPath;

function runLauncher(args, env) {
  return spawnSync(NODE, [LAUNCHER, ...args], {
    encoding: "utf8",
    timeout: 60000,
    env: { ...process.env, ...env },
  });
}

test("oracle: missing --domain → exit 2 (loud bad-args)", () => {
  const r = runLauncher([], {});
  assert.equal(r.status, 2);
  assert.match(String(r.stderr), /invalid\/missing --domain/);
});

test("oracle: invalid --domain → exit 2", () => {
  const r = runLauncher(["--domain", "plasma"], {});
  assert.equal(r.status, 2);
  assert.match(String(r.stderr), /invalid\/missing --domain/);
});

test("oracle: --domain mill → resolves sidecar skip + propagates batch exit code", () => {
  const fix = mkdtempSync(join(tmpdir(), "sfc-launch-oracle-"));
  try {
    // Stub batch: a plain .mjs that echoes its argv and exits with a code
    // encoded from --skip (skip 7 → exit 7) — proves skip flowed end-to-end.
    const stub = join(fix, "stub-batch.mjs");
    writeFileSync(stub,
      "const a=process.argv.slice(2);" +
      "const i=a.indexOf('--skip');" +
      "const skip=i>=0?Number(a[i+1]):-1;" +
      "process.stdout.write('STUB skip='+skip+'\\n');" +
      "process.exit(skip===7?7:9);\n");
    // Fixtured results root with a sidecar carrying launchSkip 7.
    const resultsRoot = join(fix, "results");
    const millDir = join(resultsRoot, "mill");
    mkdirSync(millDir, { recursive: true });
    writeFileSync(join(millDir, ".resume-state.json"),
      JSON.stringify({ host: "PC-X", launchSkip: 7, workers: 4, chunkSize: 50, maxMinutes: 600 }));
    const r = runLauncher(["--domain", "mill"], {
      PRISM_SFC_LAUNCH_BATCH_SCRIPT: stub,
      PRISM_SFC_LAUNCH_RESULTS_ROOT: resultsRoot,
    });
    // exit 7 ⇒ the launcher read launchSkip=7 from the sidecar, built the
    // batch argv with --skip 7, AND propagated the stub's exit code.
    assert.equal(r.status, 7, `expected exit 7 (skip propagated), got ${r.status}: ${r.stderr}`);
    assert.match(String(r.stdout), /STUB skip=7/);
  } finally {
    rmSync(fix, { recursive: true, force: true });
  }
});

test("oracle: --domain mill, no sidecar → starts at skip 0 (genuine first run)", () => {
  const fix = mkdtempSync(join(tmpdir(), "sfc-launch-oracle-"));
  try {
    const stub = join(fix, "stub-batch.mjs");
    writeFileSync(stub,
      "const a=process.argv.slice(2);" +
      "const i=a.indexOf('--skip');" +
      "process.exit(Number(a[i+1])===0?0:9);\n");
    const resultsRoot = join(fix, "results");
    mkdirSync(join(resultsRoot, "mill"), { recursive: true }); // dir but NO sidecar
    const r = runLauncher(["--domain", "mill"], {
      PRISM_SFC_LAUNCH_BATCH_SCRIPT: stub,
      PRISM_SFC_LAUNCH_RESULTS_ROOT: resultsRoot,
    });
    assert.equal(r.status, 0, `expected skip 0 on no-sidecar, got ${r.status}: ${r.stderr}`);
    assert.match(String(r.stderr), /no sidecar/);
  } finally {
    rmSync(fix, { recursive: true, force: true });
  }
});
