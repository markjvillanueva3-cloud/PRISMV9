import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { foldDebtVerdict } from "./system-viz-on-commit.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "system-viz-on-commit.mjs");
// Windows: dynamic import() needs a file:// URL, not a raw `H:\...` path.
const SCRIPT_URL = pathToFileURL(SCRIPT).href;

// Real-process helper: run the script/module in a fresh node with env-pointed
// fixture paths so the REAL reader wiring is exercised (RGS-TOOL-AUTOINVOKE-MS1
// lesson: hermetic in-process fakes hide key-mismatch bugs — this is the
// real-data E2E oracle that catches them).
function runNode(code, env) {
  return spawnSync(process.execPath, ["-e", code], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

// W1 / U-FOLD-DEFAULT — pure verdict logic for the fold-debt staleness gate.
// Date.now() is injected (nowMs) so every branch is deterministic.

const NOW = Date.parse("2026-05-16T12:00:00.000Z");
const hrsAgo = (h) => new Date(NOW - h * 3.6e6).toISOString();

test("no marker → clean, exit 0 (chain never skipped a fold)", () => {
  const v = foldDebtVerdict(null, 6, NOW);
  assert.equal(v.ok, true);
  assert.equal(v.code, 0);
  assert.match(v.message, /no marker yet/);
});

test("status=folded → clean regardless of age (fold happened in-commit)", () => {
  const v = foldDebtVerdict({ status: "folded", pendingCount: 12, ts: hrsAgo(99) }, 6, NOW);
  assert.equal(v.ok, true);
  assert.equal(v.code, 0);
  assert.match(v.message, /clean/);
});

test("status=skipped, pendingCount=0 → clean (nothing was actually pending)", () => {
  const v = foldDebtVerdict({ status: "skipped", pendingCount: 0, ts: hrsAgo(48) }, 6, NOW);
  assert.equal(v.ok, true);
  assert.equal(v.code, 0);
  assert.match(v.message, /pendingCount=0/);
});

test("status=skipped, fresh (age ≤ maxHrs) → clean, next round-2 will fold", () => {
  const v = foldDebtVerdict({ status: "skipped", pendingCount: 5, ts: hrsAgo(2) }, 6, NOW);
  assert.equal(v.ok, true);
  assert.equal(v.code, 0);
  assert.match(v.message, /next commit's round-2/);
});

test("status=skipped, STUCK (age > maxHrs, pending>0) → FAIL exit 1 with remedy", () => {
  const v = foldDebtVerdict({ status: "skipped", pendingCount: 7, ts: hrsAgo(9) }, 6, NOW);
  assert.equal(v.ok, false);
  assert.equal(v.code, 1);
  assert.match(v.message, /STUCK/);
  assert.match(v.message, /FOLD_NEWLY_BUILT=1/);
  assert.match(v.message, /7 newly-built/);
});

test("boundary: age exactly == maxHrs is NOT stuck (strict > threshold)", () => {
  const v = foldDebtVerdict({ status: "skipped", pendingCount: 3, ts: hrsAgo(6) }, 6, NOW);
  assert.equal(v.ok, true, "age == maxHrs must be treated as still-fresh (strict >)");
  assert.equal(v.code, 0);
});

test("adversarial: malformed ts → treated as infinitely old → STUCK when pending>0", () => {
  const v = foldDebtVerdict({ status: "skipped", pendingCount: 2, ts: "not-a-date" }, 6, NOW);
  assert.equal(v.ok, false, "unparseable ts must fail-loud as stuck, not silently pass");
  assert.equal(v.code, 1);
});

test("adversarial: missing ts field → infinitely old → STUCK when pending>0", () => {
  const v = foldDebtVerdict({ status: "skipped", pendingCount: 1 }, 6, NOW);
  assert.equal(v.ok, false);
  assert.equal(v.code, 1);
});

test("adversarial: unknown status string → not folded, not skipped → treated as skipped-path", () => {
  // Defensive: an unexpected status with stale ts + pending must not silently pass.
  const v = foldDebtVerdict({ status: "garbage", pendingCount: 4, ts: hrsAgo(99) }, 6, NOW);
  assert.equal(v.ok, false, "unknown status with stale pending debt must fail-loud");
  assert.equal(v.code, 1);
});

test("variability: large maxHrs window keeps an old skip clean", () => {
  const v = foldDebtVerdict({ status: "skipped", pendingCount: 9, ts: hrsAgo(20) }, 48, NOW);
  assert.equal(v.ok, true, "with a 48h window a 20h-old skip is still fresh");
  assert.equal(v.code, 0);
});

// ---------------------------------------------------------------------------
// REAL-DATA integration (subprocess, env-pointed fixtures). These would have
// caught the P0 where readNewlyBuiltCount() read the wrong key and returned 0
// against the actual detect-newly-built.mjs output shape.
// ---------------------------------------------------------------------------

test("readNewlyBuiltCount reads the REAL detect-newly-built shape {totals:{totalNew}}", () => {
  const tmp = path.join(os.tmpdir(), `prism-nb-real-${Date.now()}.json`);
  // EXACT shape detect-newly-built.mjs:148-155 writes.
  fs.writeFileSync(tmp, JSON.stringify({
    generatedAt: new Date().toISOString(),
    sinceCommit: "abc1234",
    prevGeneratedAt: null,
    totals: { added: 51756, wired: 1, needsWiring: 1, totalNew: 51758 },
    headlineDelta: {},
    entries: new Array(51758).fill({ id: "x" }),
  }));
  try {
    const r = runNode(
      `import(${JSON.stringify(SCRIPT_URL)}).then(m=>process.stdout.write(String(m.readNewlyBuiltCount())))`,
      { PRISM_NEWLY_BUILT_PATH: tmp }
    );
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim(), "51758", "must read totals.totalNew, NOT return 0 on the real shape");
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});

test("readNewlyBuiltCount falls back to entries.length when totals absent", () => {
  const tmp = path.join(os.tmpdir(), `prism-nb-entries-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify({ entries: [{ id: 1 }, { id: 2 }, { id: 3 }] }));
  try {
    const r = runNode(
      `import(${JSON.stringify(SCRIPT_URL)}).then(m=>process.stdout.write(String(m.readNewlyBuiltCount())))`,
      { PRISM_NEWLY_BUILT_PATH: tmp }
    );
    assert.equal(r.stdout.trim(), "3");
  } finally { fs.rmSync(tmp, { force: true }); }
});

test("readNewlyBuiltCount returns 0 on a missing file (no throw)", () => {
  const r = runNode(
    `import(${JSON.stringify(SCRIPT_URL)}).then(m=>process.stdout.write(String(m.readNewlyBuiltCount())))`,
    { PRISM_NEWLY_BUILT_PATH: path.join(os.tmpdir(), `prism-nb-absent-${Date.now()}.json`) }
  );
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), "0");
});

test("--fold-debt-status exits 1 when a real STUCK marker is present (the verification channel itself)", () => {
  const tmp = path.join(os.tmpdir(), `prism-fd-stuck-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify({
    status: "skipped",
    pendingCount: 42,
    ts: new Date(Date.now() - 9 * 3.6e6).toISOString(), // 9h ago > 6h default
  }));
  try {
    const r = spawnSync(process.execPath, [SCRIPT, "--fold-debt-status"], {
      encoding: "utf8",
      env: { ...process.env, PRISM_FOLD_DEBT_PATH: tmp },
    });
    assert.equal(r.status, 1, `stuck marker must exit 1; got ${r.status} / ${r.stdout} / ${r.stderr}`);
    assert.match(r.stdout, /STUCK/);
    assert.match(r.stdout, /42 newly-built/);
  } finally { fs.rmSync(tmp, { force: true }); }
});

test("--fold-debt-status exits 0 on a folded marker (round-trip green path)", () => {
  const tmp = path.join(os.tmpdir(), `prism-fd-ok-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify({
    status: "folded", pendingCount: 5, ts: new Date().toISOString(),
  }));
  try {
    const r = spawnSync(process.execPath, [SCRIPT, "--fold-debt-status"], {
      encoding: "utf8",
      env: { ...process.env, PRISM_FOLD_DEBT_PATH: tmp },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /clean/);
  } finally { fs.rmSync(tmp, { force: true }); }
});

test("--fold-debt-status honors PRISM_FOLD_DEBT_MAX_HRS (48h window keeps 9h skip clean)", () => {
  const tmp = path.join(os.tmpdir(), `prism-fd-window-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify({
    status: "skipped", pendingCount: 3, ts: new Date(Date.now() - 9 * 3.6e6).toISOString(),
  }));
  try {
    const r = spawnSync(process.execPath, [SCRIPT, "--fold-debt-status"], {
      encoding: "utf8",
      env: { ...process.env, PRISM_FOLD_DEBT_PATH: tmp, PRISM_FOLD_DEBT_MAX_HRS: "48" },
    });
    assert.equal(r.status, 0, `48h window must keep a 9h skip clean; got ${r.status}`);
  } finally { fs.rmSync(tmp, { force: true }); }
});
