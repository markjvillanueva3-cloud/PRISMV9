#!/usr/bin/env node
/**
 * wiki-propagation-watchdog.test.mjs — hermetic node:test suite
 *
 * Pure-function tests for classifyStaleness + aggregateStatus.
 * Run: node --test H:/prism/scripts/wiki-propagation-watchdog.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  classifyStaleness,
  aggregateStatus,
} from "./wiki-propagation-watchdog.mjs";

const HOURS = 3600 * 1000;

describe("classifyStaleness", () => {
  it("returns fresh when age < threshold", () => {
    const now = Date.now();
    const r = classifyStaleness(now - 1 * HOURS, 4, now);
    assert.equal(r.stale, false);
    assert.equal(r.reason, "fresh");
    assert.ok(Math.abs(r.ageHrs - 1) < 0.01);
  });

  it("returns stale when age > threshold", () => {
    const now = Date.now();
    const r = classifyStaleness(now - 25 * HOURS, 24, now);
    assert.equal(r.stale, true);
    assert.match(r.reason, /25\.0h > 24h/);
  });

  it("returns stale with missing-or-unreadable reason when mtime is null", () => {
    const r = classifyStaleness(null, 24);
    assert.equal(r.stale, true);
    assert.equal(r.reason, "missing-or-unreadable");
    assert.equal(r.ageHrs, null);
  });

  it("returns stale with missing-or-unreadable reason when mtime is NaN", () => {
    const r = classifyStaleness(NaN, 24);
    assert.equal(r.stale, true);
    assert.equal(r.reason, "missing-or-unreadable");
  });

  it("returns stale with missing-or-unreadable reason when mtime is undefined", () => {
    const r = classifyStaleness(undefined, 24);
    assert.equal(r.stale, true);
    assert.equal(r.reason, "missing-or-unreadable");
  });

  it("boundary case: age exactly at threshold is fresh", () => {
    const now = Date.now();
    const r = classifyStaleness(now - 24 * HOURS, 24, now);
    assert.equal(r.stale, false, "age == threshold should be fresh, not stale");
  });

  it("ageHrs accurately reflects elapsed time", () => {
    const now = Date.now();
    const r = classifyStaleness(now - 12.5 * HOURS, 24, now);
    assert.ok(Math.abs(r.ageHrs - 12.5) < 0.01);
  });
});

describe("aggregateStatus", () => {
  const fresh = { stale: false, reason: "fresh" };
  const stale = { stale: true, reason: "25h > 24h" };

  it("all-fresh returns clean / exit 0", () => {
    const r = aggregateStatus([fresh, fresh, fresh, fresh]);
    assert.equal(r.status, "clean");
    assert.equal(r.exitCode, 0);
    assert.equal(r.staleCount, 0);
  });

  it("one-stale returns warn / exit 1", () => {
    const r = aggregateStatus([fresh, stale, fresh, fresh]);
    assert.equal(r.status, "warn");
    assert.equal(r.exitCode, 1);
    assert.equal(r.staleCount, 1);
  });

  it("two-stale returns critical / exit 2", () => {
    const r = aggregateStatus([fresh, stale, stale, fresh]);
    assert.equal(r.status, "critical");
    assert.equal(r.exitCode, 2);
    assert.equal(r.staleCount, 2);
  });

  it("all-stale returns critical / exit 2", () => {
    const r = aggregateStatus([stale, stale, stale, stale]);
    assert.equal(r.status, "critical");
    assert.equal(r.exitCode, 2);
    assert.equal(r.staleCount, 4);
  });

  it("empty stages returns clean (no-op)", () => {
    const r = aggregateStatus([]);
    assert.equal(r.status, "clean");
    assert.equal(r.exitCode, 0);
  });
});

describe("integration — real PRISM root", () => {
  it("module imports cleanly and exports the pure fns", async () => {
    const mod = await import("./wiki-propagation-watchdog.mjs");
    assert.equal(typeof mod.classifyStaleness, "function");
    assert.equal(typeof mod.aggregateStatus, "function");
  });
});

describe("regression oracle — obsidian-feed canonical stamp path (iter12)", () => {
  // iter10 shipped checkObsidianFeed() with 3 state/shared/ candidate paths,
  // none of which matched the actual writer (stop-obsidian-memory-feed.mjs)
  // which uses .claude/cache/obsidian-memory-feed-last.json. Net: the watchdog
  // false-CRITICAL'd every run from iter10 ship → iter12 fix.
  //
  // This source-code regex assertion catches any future revert that removes
  // the cache-path candidate (the canonical stamp the hook actually writes).
  // R12 fail-on-revert oracle, not a logic test — checkObsidianFeed itself
  // depends on filesystem state we don't want to fake in a unit test.
  it("watchdog source includes the .claude/cache/obsidian-memory-feed-last.json candidate", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "wiki-propagation-watchdog.mjs"), "utf8");
    assert.match(
      src,
      /["']\.claude["']\s*,\s*["']cache["']\s*,\s*["']obsidian-memory-feed-last\.json["']/,
      "removing the canonical cache stamp path will re-introduce the iter10 false-CRITICAL bug — see Recent regressions 2026-05-18",
    );
  });
  it("watchdog source keeps PRISM_ROOT-rooted (not STATE_DIR-rooted) cache candidate", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "wiki-propagation-watchdog.mjs"), "utf8");
    // .claude/cache/ lives under PRISM_ROOT, NOT under state/shared/. If a
    // future edit "tidies" this into STATE_DIR by mistake, the probe breaks.
    assert.match(
      src,
      /path\.join\(\s*PRISM_ROOT\s*,\s*["']\.claude["']\s*,\s*["']cache["']/,
      "the canonical obsidian-feed stamp lives under PRISM_ROOT/.claude/cache/, not STATE_DIR",
    );
  });
});
