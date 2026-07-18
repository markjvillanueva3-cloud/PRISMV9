// tier: T4
// Tests for scripts/system-health/27-wsl-memory-guard.mjs pure logic.
//
// node:test — hermetic: only the PURE functions (parseWslConfigCap, classify)
// are exercised. The PowerShell/FS shells (readVmmem, dockerActive, file read)
// are NOT touched — the import is side-effect-free thanks to the import.meta
// run-guard. No real WSL / powershell / disk needed.
//
// Run: node --test H:/prism/scripts/system-health/27-wsl-memory-guard.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWslConfigCap, classify } from "./27-wsl-memory-guard.mjs";

// ── parseWslConfigCap: unit handling ───────────────────────────────────────────
test("parseWslConfigCap reads GB directly", () => {
  assert.equal(parseWslConfigCap("[wsl2]\nmemory=16GB\n"), 16);
});

test("parseWslConfigCap converts MB and KB to GB", () => {
  assert.equal(parseWslConfigCap("memory=16384MB"), 16);     // 16384/1024
  assert.equal(parseWslConfigCap("memory=16777216KB"), 16);  // 16777216/1024/1024
});

test("parseWslConfigCap treats a bare number as bytes (WSL .wslconfig spec)", () => {
  // 17179869184 bytes = 16 GiB
  assert.equal(parseWslConfigCap("memory=17179869184"), 16);
});

test("parseWslConfigCap is case-insensitive and tolerates whitespace", () => {
  assert.equal(parseWslConfigCap("  Memory = 8 Gb  "), 8);
});

// ── parseWslConfigCap: failure / adversarial ───────────────────────────────────
test("parseWslConfigCap ignores commented-out memory lines", () => {
  // The REAL bug class: a commented cap must NOT be read as active.
  assert.equal(parseWslConfigCap("# memory=16GB\n; memory=32GB\n[wsl2]\n"), null);
});

test("parseWslConfigCap returns null when no memory= present", () => {
  assert.equal(parseWslConfigCap("[wsl2]\nprocessors=8\nswap=8GB\n"), null);
});

test("parseWslConfigCap returns null on empty / non-string input", () => {
  assert.equal(parseWslConfigCap(""), null);
  assert.equal(parseWslConfigCap(null), null);
  assert.equal(parseWslConfigCap(undefined), null);
  assert.equal(parseWslConfigCap(12345), null);
});

test("parseWslConfigCap first uncommented match wins", () => {
  assert.equal(parseWslConfigCap("memory=8GB\nmemory=32GB\n"), 8);
});

// ── classify: the verdict state machine ────────────────────────────────────────
test("classify: WSL down → wsl-down, exit 0 (nothing to guard)", () => {
  const r = classify({ running: false, capGB: 16, commitGB: 0, overrunFactor: 1.5 });
  assert.equal(r.status, "wsl-down");
  assert.equal(r.exitCode, 0);
});

test("classify: no cap configured → no-cap-config, exit 1 (unbounded WSL is a watch)", () => {
  const r = classify({ running: true, capGB: null, commitGB: 50, overrunFactor: 1.5 });
  assert.equal(r.status, "no-cap-config");
  assert.equal(r.exitCode, 1);
});

test("classify: commit within cap → healthy, exit 0", () => {
  const r = classify({ running: true, capGB: 16, commitGB: 12, overrunFactor: 1.5 });
  assert.equal(r.status, "healthy");
  assert.equal(r.exitCode, 0);
  assert.equal(r.capEnforced, true);
});

test("classify: over cap but under overrun factor → watch, exit 1", () => {
  // 16 < 20 <= 16*1.5(=24): cap technically exceeded but not yet a runaway.
  const r = classify({ running: true, capGB: 16, commitGB: 20, overrunFactor: 1.5 });
  assert.equal(r.status, "watch");
  assert.equal(r.exitCode, 1);
  assert.equal(r.capEnforced, true);
});

test("classify: commit far past factor → overrun, exit 2 (THE real bug — 95GB vs 16GB cap)", () => {
  const r = classify({ running: true, capGB: 16, commitGB: 95.35, overrunFactor: 1.5 });
  assert.equal(r.status, "overrun");
  assert.equal(r.exitCode, 2);
  assert.equal(r.capEnforced, false);
});

test("classify: boundary — commit exactly at cap*factor is still enforced (<=)", () => {
  // 24 == 16*1.5 → boundary belongs to 'enforced' side (watch, not overrun).
  const r = classify({ running: true, capGB: 16, commitGB: 24, overrunFactor: 1.5 });
  assert.equal(r.status, "watch");
  assert.equal(r.exitCode, 1);
});

test("classify: boundary — a hair over cap*factor flips to overrun", () => {
  const r = classify({ running: true, capGB: 16, commitGB: 24.01, overrunFactor: 1.5 });
  assert.equal(r.status, "overrun");
  assert.equal(r.exitCode, 2);
});
