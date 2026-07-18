#!/usr/bin/env node
/**
 * auto-synergize-loop.test.mjs -- AUTO-SYNERGIZE-MS0 (slot:india)
 * Run: node scripts/auto-synergize-loop.test.mjs
 *
 * R9 -- the state-advance + exit-classification logic is safety-relevant: if a
 * LOCKED/FAILED regen wrongly advanced the staleness clock, a perpetually-locked
 * graph would silently stop folding forever. These tests pin that invariant.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  defaultWalk,
  loadState,
  classifyRegenExit,
  nextState,
  buildLedgerRow,
  thresholdsFromEnv,
} from "./auto-synergize-loop.mjs";
import { DEFAULT_THRESHOLDS } from "./lib/auto-synergize-staleness.mjs";

const NOW_ISO = "2026-06-29T12:00:00.000Z";

test("classifyRegenExit: 0=success, 4=locked, else=failed", () => {
  assert.deepEqual(classifyRegenExit(0), { status: "success", code: 0 });
  assert.deepEqual(classifyRegenExit(4), { status: "locked", code: 4 }); // EXIT_GRAPH_WRITE_LOCK_SKIP
  assert.deepEqual(classifyRegenExit(1), { status: "failed", code: 1 });
  assert.deepEqual(classifyRegenExit(137), { status: "failed", code: 137 });
});

test("nextState: SUCCESS advances both synergize+apply stamps", () => {
  const ns = nextState({
    prev: { lastSynergizeAt: "2026-06-28T00:00:00.000Z", lastApplyAt: "2026-06-28T00:00:00.000Z" },
    decision: { action: "regen", severity: 2, changedFiles: 30, reasons: [] },
    regenResult: { status: "success", code: 0 },
    nowIso: NOW_ISO,
  });
  assert.equal(ns.lastSynergizeAt, NOW_ISO);
  assert.equal(ns.lastApplyAt, NOW_ISO);
  assert.equal(ns.lastResult, "success");
  assert.equal(ns.lastCheckAt, NOW_ISO);
});

test("nextState: LOCKED does NOT advance synergize clock, but DOES advance apply clock (backoff)", () => {
  const prev = { lastSynergizeAt: "2026-06-28T00:00:00.000Z", lastApplyAt: "2026-06-28T00:00:00.000Z" };
  const ns = nextState({
    prev,
    decision: { action: "regen", severity: 2, changedFiles: 30 },
    regenResult: { status: "locked", code: 4 },
    nowIso: NOW_ISO,
  });
  assert.equal(ns.lastSynergizeAt, prev.lastSynergizeAt, "locked => graph still stale, synergize clock unmoved");
  assert.equal(ns.lastApplyAt, NOW_ISO, "but the ATTEMPT advances apply clock so debounce rate-limits retries");
  assert.equal(ns.lastResult, "locked");
  assert.equal(ns.lastCheckAt, NOW_ISO);
});

test("nextState: FAILED advances apply clock (backoff) but NOT synergize clock", () => {
  const prev = { lastSynergizeAt: "2026-06-28T00:00:00.000Z", lastApplyAt: "2026-06-28T00:00:00.000Z" };
  const ns = nextState({
    prev,
    decision: { action: "regen", severity: 2, changedFiles: 30 },
    regenResult: { status: "failed", code: 1 },
    nowIso: NOW_ISO,
  });
  assert.equal(ns.lastSynergizeAt, prev.lastSynergizeAt, "failed regen must not mark synergized (stays stale)");
  assert.equal(ns.lastApplyAt, NOW_ISO, "failed attempt advances apply clock => OOM-loop is debounce rate-limited");
  assert.equal(ns.lastResult, "failed");
});

test("nextState: no regen (action none) preserves prior stamps, advances check", () => {
  const ns = nextState({
    prev: { lastSynergizeAt: "2026-06-28T00:00:00.000Z", lastResult: "success" },
    decision: { action: "none", severity: 0, changedFiles: 0 },
    regenResult: null,
    nowIso: NOW_ISO,
  });
  assert.equal(ns.lastSynergizeAt, "2026-06-28T00:00:00.000Z");
  assert.equal(ns.lastResult, "success", "preserves prior result when nothing ran");
  assert.equal(ns.schemaVersion, "1.0.0");
});

test("buildLedgerRow: result=skipped when no regen ran", () => {
  const row = buildLedgerRow({
    decision: { action: "none", severity: 1, changedFiles: 3, hoursSinceSynergize: 2, reasons: ["acc"] },
    regenResult: null,
    nowIso: NOW_ISO,
  });
  assert.equal(row.result, "skipped");
  assert.equal(row.exitCode, null);
  assert.equal(row.changedFiles, 3);
  assert.equal(row.at, NOW_ISO);
});

test("buildLedgerRow: carries regen status + exit code", () => {
  const row = buildLedgerRow({
    decision: { action: "regen", severity: 2, changedFiles: 25, reasons: [] },
    regenResult: { status: "success", code: 0 },
    nowIso: NOW_ISO,
  });
  assert.equal(row.result, "success");
  assert.equal(row.exitCode, 0);
});

test("thresholdsFromEnv: defaults when unset", () => {
  assert.deepEqual(thresholdsFromEnv({}), {
    minFilesForRegen: DEFAULT_THRESHOLDS.minFilesForRegen,
    maxHoursBeforeRegen: DEFAULT_THRESHOLDS.maxHoursBeforeRegen,
    debounceMinutes: DEFAULT_THRESHOLDS.debounceMinutes,
  });
});

test("thresholdsFromEnv: valid overrides apply; invalid/negative ignored", () => {
  const th = thresholdsFromEnv({
    PRISM_AUTO_SYNERGIZE_MIN_FILES: "5",
    PRISM_AUTO_SYNERGIZE_MAX_HOURS: "-3",   // invalid -> default
    PRISM_AUTO_SYNERGIZE_DEBOUNCE_MIN: "abc", // invalid -> default
  });
  assert.equal(th.minFilesForRegen, 5);
  assert.equal(th.maxHoursBeforeRegen, DEFAULT_THRESHOLDS.maxHoursBeforeRegen);
  assert.equal(th.debounceMinutes, DEFAULT_THRESHOLDS.debounceMinutes);
});

test("loadState: missing path -> {}", () => {
  assert.deepEqual(loadState(path.join(os.tmpdir(), "nope-" + Date.now() + ".json")), {});
});

test("loadState: corrupt JSON -> {} (fail-soft, never throws)", () => {
  const p = path.join(os.tmpdir(), "asz-corrupt-" + Date.now() + ".json");
  fs.writeFileSync(p, "{not json");
  try { assert.deepEqual(loadState(p), {}); } finally { fs.rmSync(p, { force: true }); }
});

test("defaultWalk: real temp tree -> counts *.md, recurses, skips .git", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "asz-walk-"));
  try {
    fs.writeFileSync(path.join(dir, "a.md"), "x");
    fs.writeFileSync(path.join(dir, "b.MD"), "x");          // case-insensitive
    fs.writeFileSync(path.join(dir, "c.txt"), "x");          // ignored
    fs.mkdirSync(path.join(dir, "sub"));
    fs.writeFileSync(path.join(dir, "sub", "d.md"), "x");    // nested counted
    fs.mkdirSync(path.join(dir, ".git"));
    fs.writeFileSync(path.join(dir, ".git", "e.md"), "x");   // skipped dir
    const res = defaultWalk(dir);
    assert.equal(res.exists, true);
    assert.equal(res.count, 3, "a.md + b.MD + sub/d.md; .txt and .git/* excluded");
    assert.equal(res.mtimes.length, 3);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("defaultWalk: honors the maxFiles cap (cost bound, no under-count surprise)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "asz-cap-"));
  try {
    for (let i = 0; i < 7; i++) fs.writeFileSync(path.join(dir, `f${i}.md`), "x");
    const res = defaultWalk(dir, 3); // cap below the file count
    assert.equal(res.exists, true);
    assert.equal(res.count, 3, "walk stops at the cap");
    assert.equal(res.mtimes.length, 3);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("defaultWalk: non-existent root -> exists:false, count 0", () => {
  const res = defaultWalk(path.join(os.tmpdir(), "asz-missing-" + Date.now()));
  assert.equal(res.exists, false);
  assert.equal(res.count, 0);
});

test("defaultWalk: a plain file (not dir) -> exists:false", () => {
  const p = path.join(os.tmpdir(), "asz-file-" + Date.now() + ".md");
  fs.writeFileSync(p, "x");
  try {
    const res = defaultWalk(p);
    assert.equal(res.exists, false, "a file root is not a walkable dir");
  } finally { fs.rmSync(p, { force: true }); }
});
