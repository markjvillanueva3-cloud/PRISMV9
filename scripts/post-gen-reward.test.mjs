#!/usr/bin/env node
/**
 * post-gen-reward.test.mjs — behavior tests for the post-gen reward harness.
 * Run: node --test scripts/post-gen-reward.test.mjs
 * Real-value assertions (R9): each encodes WHY a reward component matters.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "post-gen-reward.mjs");
const { scorePost } = await import("file:///" + SCRIPT.replace(/\\/g, "/"));

// clean Hurco (fanuc-family) mill program: units, speed+spindle, coolant after,
// feed-mode, retract before tool change, M30. Should score high.
const CLEAN_HURCO = [
  "(PART B-19213 OP1 - HURCO VM30i)",
  "G21 G90 G94 G17 G54",
  "T1 M06",
  "S6000 M03",
  "M08",
  "G00 X0 Y0",
  "G43 Z25. H01",
  "G01 Z-2. F300.",
  "G01 X40. F600.",
  "G00 Z25.",
  "M09",
  "G91 G28 Z0.",
  "M30",
].join("\n");

test("happy: clean Hurco mill program scores high reward", async () => {
  const r = await scorePost(CLEAN_HURCO, { dialect: "hurco" });
  assert.ok(r.reward >= 0.85, `expected high reward, got ${r.reward}: ${JSON.stringify(r.components)}`);
  assert.equal(r.components.structure, 1, `structure should be complete: ${JSON.stringify(r.detail.structure)}`);
  assert.ok(r.components.lint >= 0.9, `lint should be near-clean: ${r.components.lint}`);
});

test("failure mode: coolant-before-spindle (mill) drops reward below clean", async () => {
  const bad = "G21 G90 G94 G17\nM08\nS6000 M03\nT1 M06\nG01 Z-2. F300.\nG00 Z25.\nM30\n";
  const r = await scorePost(bad, { dialect: "hurco" });
  const clean = await scorePost(CLEAN_HURCO, { dialect: "hurco" });
  assert.ok(r.reward < clean.reward, `coolant-before-spindle should lower reward: ${r.reward} vs ${clean.reward}`);
  assert.ok(r.components.lint < 1, "lint component should penalize the ERROR");
});

test("failure mode: missing structure (no units/end/retract) drops structure component", async () => {
  const nc = "S6000 M03\nG01 X10. F600.\n";
  const r = await scorePost(nc, { dialect: "hurco" });
  assert.ok(r.components.structure < 0.6, `structure should be low: ${JSON.stringify(r.detail.structure)}`);
  assert.ok(r.detail.structure.missing.length >= 2, "should report missing elements");
});

test("golden: identical golden yields golden≈1 and lifts reward", async () => {
  const r = await scorePost(CLEAN_HURCO, { dialect: "hurco", golden: CLEAN_HURCO });
  assert.ok(r.components.golden >= 0.99, `identical golden should be ~1: ${r.components.golden}`);
  assert.ok(r.reward >= 0.9, `reward with perfect golden should be high: ${r.reward}`);
});

test("golden: a wholly different golden yields low golden similarity", async () => {
  const other = "%\nO9999\nG18 G97 S500 M04\nG0 X1 Z1\nM30\n%\n";
  const r = await scorePost(CLEAN_HURCO, { dialect: "hurco", golden: other });
  assert.ok(r.components.golden < 0.3, `dissimilar golden should be low: ${r.components.golden}`);
});

test("dialect variability: turning program scores (G96/G97), structure adapts", async () => {
  const lathe = "G50 S2500\nG95 G18\nN1 T0101\nM8\nG97 S1053 M3\nG0 Z0.1\nG1 Z-10. F0.1\nG0 Z25.\nM30\n";
  const r = await scorePost(lathe, { dialect: "okuma" });
  assert.ok(r.reward > 0, `turning reward computed: ${r.reward}`);
  assert.equal(r.dialect, "okuma");
  // turning M8-before-M3 must NOT crater lint (it's INFO on lathes)
  assert.ok(r.components.lint >= 0.9, `turning coolant-order is INFO not ERROR: ${r.components.lint}`);
});

test("alarm EXCLUDED for families without non-universal alarm codes (FANUC + HURCO target) — no dead +constant", async () => {
  // FANUC/HURCO have zero non-universal code-bearing HIGH/CRITICAL alarms in the DB, so the
  // alarm component carries NO signal. It must be excluded (null) and its weight redistributed —
  // NOT left as a constant 1.0 that silently flattens discrimination (the bug the reviewers found).
  const rf = await scorePost(CLEAN_HURCO, { dialect: "fanuc" });
  assert.equal(rf.detail.alarm.family, "FANUC", "family still resolves");
  assert.equal(rf.components.alarm, null, "FANUC alarm excluded (no usable signal)");
  assert.ok(!("alarm" in rf.weights), "excluded alarm carries no weight");
  const wsum = Object.values(rf.weights).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(wsum - 1) < 1e-9, `surviving weights renormalize to 1: ${JSON.stringify(rf.weights)}`);
  const rh = await scorePost(CLEAN_HURCO, { dialect: "hurco" });
  assert.equal(rh.components.alarm, null, "HURCO (the fine-tune target) alarm excluded — never dead-weighted");
});

test("alarm SIGNAL: SIEMENS penalizes a non-universal alarm code (G25) but NOT universal codes (M06/G41/G43)", async () => {
  // SIEMENS is the one family with non-universal code-bearing alarms (G25/G26 speed/area limits).
  const universalOnly = "G21 G90 G94 G17\nT1 M06\nG43 H01 Z25.\nS3000 M03\nM08\nG41 D1\nG01 Z-2. F300.\nG01 X10. F600.\nG00 Z25.\nM09\nG28 Z0.\nM30\n";
  const ok = await scorePost(universalOnly, { dialect: "siemens" });
  assert.equal(ok.components.alarm, 1, `universal M06/G41/G43 must NOT be alarm-penalized: ${JSON.stringify(ok.detail.alarm.matches)}`);
  const withG25 = universalOnly.replace("G41 D1", "G41 D1\nG25 S500");
  const bad = await scorePost(withG25, { dialect: "siemens" });
  assert.ok(bad.components.alarm < 1, `G25 (non-universal, named in HIGH/CRITICAL Siemens alarms) must penalize: ${bad.components.alarm}`);
  assert.ok(bad.detail.alarm.matches.some((m) => m.code === "G25"), "G25 should be the matched code");
  assert.ok(bad.reward < ok.reward, "an alarm-associated code lowers the overall reward");
});

test("reward + all NON-NULL components are within [0,1]", async () => {
  const r = await scorePost(CLEAN_HURCO, { dialect: "hurco" });
  for (const k of ["lint", "structure", "alarm", "golden"]) {
    if (r.components[k] == null) continue; // excluded component (e.g. alarm for HURCO) — not scored
    assert.ok(r.components[k] >= 0 && r.components[k] <= 1, `${k} out of range: ${r.components[k]}`);
  }
  assert.ok(r.reward >= 0 && r.reward <= 1, `reward out of range: ${r.reward}`);
});

test("adversarial: null / empty / number / garbage do not throw", async () => {
  await assert.doesNotReject(() => scorePost(null, { dialect: "hurco" }));
  await assert.doesNotReject(() => scorePost("", { dialect: "hurco" }));
  await assert.doesNotReject(() => scorePost(12345, { dialect: "hurco" }));
  await assert.doesNotReject(() => scorePost("\x00�()[]%%%\nG\nM\n", { dialect: "okuma" }));
});

test("adversarial: empty NC scores low (nothing correct to reward)", async () => {
  const r = await scorePost("", { dialect: "hurco" });
  assert.ok(r.reward < 0.6, `empty NC should fail threshold: ${r.reward}`);
});

// ── CLI round-trip ──
test("CLI: clean program exits 0; bad-flag exits 2", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "pgr-"));
  try {
    const f = path.join(dir, "ok.nc");
    writeFileSync(f, CLEAN_HURCO + "\n");
    const r = spawnSync(process.execPath, [SCRIPT, f, "--dialect", "hurco"], { encoding: "utf8" });
    assert.equal(r.status, 0, `clean should exit 0: status=${r.status} out=${r.stdout}${r.stderr}`);
    assert.match(r.stdout, /reward=/);
    const bad = spawnSync(process.execPath, [SCRIPT, "--nonsense"], { encoding: "utf8" });
    assert.equal(bad.status, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("CLI: --json emits parseable reward; failing program exits 3", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "pgr-"));
  try {
    const f = path.join(dir, "empty.nc");
    writeFileSync(f, "G01 X1\n");
    const r = spawnSync(process.execPath, [SCRIPT, f, "--dialect", "hurco", "--json"], { encoding: "utf8" });
    assert.equal(r.status, 3, `low-reward program should exit 3: status=${r.status}`);
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.schemaVersion, "1.0.0");
    assert.ok(typeof parsed.reward === "number");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
