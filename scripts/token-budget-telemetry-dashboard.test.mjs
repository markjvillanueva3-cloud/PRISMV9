#!/usr/bin/env node
// token-budget-telemetry-dashboard.test.mjs — hermetic node:test suite
//
// Pure-function tests for the dashboard's parse + aggregate + format paths,
// plus the gate-hook telemetry-row builder. No filesystem assumptions except
// tmpdir-scoped writes that are cleaned up.
//
// Run: node --test H:/prism/scripts/token-budget-telemetry-dashboard.test.mjs

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  readLedgerLines,
  parseLedger,
  filterByWindow,
  loadSlotMap,
  aggregate,
  buildHeadline,
  formatText,
} from "./token-budget-telemetry-dashboard.mjs";

import { buildTelemetryRow, recordTelemetry, telemetryDisabled } from "../.claude/hooks/token-budget-gate.mjs";

let tmpDir;
function mktmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "tbt-test-"));
}

describe("buildTelemetryRow (hook export)", () => {
  it("emits a row with required fields", () => {
    const r = buildTelemetryRow({ sid: "a61bbf34", tier: "GREEN", percent: 87.34, used: 130000, heavy: null });
    assert.equal(r.sid, "a61bbf34");
    assert.equal(r.tier, "GREEN");
    assert.equal(r.percent, 87.3); // rounded to 1 dec
    assert.equal(r.used, 130000);
    assert.equal(r.heavy, null);
    assert.ok(typeof r.ts === "string" && r.ts.includes("T"));
  });

  it("clips sid to 8 chars", () => {
    const r = buildTelemetryRow({ sid: "claude-a61bbf34-extra", tier: "GREEN", percent: 50, used: 0, heavy: null });
    assert.equal(r.sid, "claude-a");
  });

  it("returns 'unknown' for missing sid", () => {
    const r = buildTelemetryRow({ tier: "RED", percent: 20, used: 800000, heavy: "/forge" });
    assert.equal(r.sid, "unknown");
  });

  it("uses provided ts when given (regression test for deterministic ordering)", () => {
    const r = buildTelemetryRow({ sid: "x", tier: "GREEN", percent: 50, used: 0, heavy: null, ts: "2026-05-15T00:00:00.000Z" });
    assert.equal(r.ts, "2026-05-15T00:00:00.000Z");
  });

  it("normalizes non-finite percent to null", () => {
    const r = buildTelemetryRow({ sid: "x", tier: "GREEN", percent: NaN, used: 0, heavy: null });
    assert.equal(r.percent, null);
    const r2 = buildTelemetryRow({ sid: "x", tier: "GREEN", percent: Infinity, used: 0, heavy: null });
    assert.equal(r2.percent, null);
  });

  it("normalizes non-integer used to null", () => {
    const r = buildTelemetryRow({ sid: "x", tier: "GREEN", percent: 50, used: 1.5, heavy: null });
    assert.equal(r.used, null);
    const r2 = buildTelemetryRow({ sid: "x", tier: "GREEN", percent: 50, used: "999", heavy: null });
    assert.equal(r2.used, null);
  });

  it("preserves heavy as null when empty string supplied", () => {
    const r = buildTelemetryRow({ sid: "x", tier: "RED", percent: 20, used: 0, heavy: "" });
    assert.equal(r.heavy, null);
  });

  it("defaults non-string tier to UNKNOWN", () => {
    const r = buildTelemetryRow({ sid: "x", tier: 42, percent: 50, used: 0, heavy: null });
    assert.equal(r.tier, "UNKNOWN");
  });
});

describe("recordTelemetry (hook export)", () => {
  beforeEach(() => { tmpDir = mktmp(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it("appends one JSONL line per call", () => {
    const target = path.join(tmpDir, "ledger.jsonl");
    recordTelemetry({ ts: "2026-01-01T00:00:00.000Z", sid: "a", tier: "GREEN", percent: 80, used: 100, heavy: null }, { path: target });
    recordTelemetry({ ts: "2026-01-01T00:01:00.000Z", sid: "b", tier: "RED", percent: 20, used: 800, heavy: "/forge" }, { path: target });
    const lines = fs.readFileSync(target, "utf8").split("\n").filter(Boolean);
    assert.equal(lines.length, 2);
    assert.equal(JSON.parse(lines[0]).sid, "a");
    assert.equal(JSON.parse(lines[1]).heavy, "/forge");
  });

  it("creates parent dir if missing", () => {
    const target = path.join(tmpDir, "nested", "deep", "ledger.jsonl");
    recordTelemetry({ ts: "T", sid: "x", tier: "GREEN", percent: 50, used: 0, heavy: null }, { path: target });
    assert.ok(fs.existsSync(target));
  });

  it("telemetryDisabled() reads env at call time (regression for reviewer-B P1)", () => {
    const prior = process.env.PRISM_TOKEN_BUDGET_TELEMETRY_DISABLE;
    try {
      delete process.env.PRISM_TOKEN_BUDGET_TELEMETRY_DISABLE;
      assert.equal(telemetryDisabled(), false);
      process.env.PRISM_TOKEN_BUDGET_TELEMETRY_DISABLE = "1";
      assert.equal(telemetryDisabled(), true);
      process.env.PRISM_TOKEN_BUDGET_TELEMETRY_DISABLE = "0"; // anything not "1" is enabled
      assert.equal(telemetryDisabled(), false);
      process.env.PRISM_TOKEN_BUDGET_TELEMETRY_DISABLE = "true"; // strict "1" check
      assert.equal(telemetryDisabled(), false);
    } finally {
      if (prior === undefined) delete process.env.PRISM_TOKEN_BUDGET_TELEMETRY_DISABLE;
      else process.env.PRISM_TOKEN_BUDGET_TELEMETRY_DISABLE = prior;
    }
  });

  it("recordTelemetry skips append when telemetryDisabled() returns true", () => {
    const prior = process.env.PRISM_TOKEN_BUDGET_TELEMETRY_DISABLE;
    const target = path.join(tmpDir, "disabled-ledger.jsonl");
    try {
      process.env.PRISM_TOKEN_BUDGET_TELEMETRY_DISABLE = "1";
      recordTelemetry({ ts: "T", sid: "x", tier: "GREEN", percent: 50, used: 0, heavy: null }, { path: target });
      assert.equal(fs.existsSync(target), false, "ledger must NOT be created when disabled");
    } finally {
      if (prior === undefined) delete process.env.PRISM_TOKEN_BUDGET_TELEMETRY_DISABLE;
      else process.env.PRISM_TOKEN_BUDGET_TELEMETRY_DISABLE = prior;
    }
  });

  it("emits v:1 schemaVersion on every row (forward-compat contract)", () => {
    const r = buildTelemetryRow({ sid: "a", tier: "GREEN", percent: 80, used: 100, heavy: null });
    assert.equal(r.v, 1);
  });

  it("never throws on unwritable path (fail-safe contract)", () => {
    // Use a path that almost certainly won't be writable on Windows.
    const bad = "Z:/__definitely_not_a_real_drive_zzz__/x.jsonl";
    assert.doesNotThrow(() => recordTelemetry({ ts: "T", sid: "x", tier: "GREEN", percent: 50, used: 0, heavy: null }, { path: bad }));
  });
});

describe("readLedgerLines", () => {
  beforeEach(() => { tmpDir = mktmp(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it("returns [] for missing file", () => {
    assert.deepEqual(readLedgerLines(path.join(tmpDir, "nope.jsonl")), []);
  });

  it("returns non-empty lines preserving order", () => {
    const p = path.join(tmpDir, "l.jsonl");
    fs.writeFileSync(p, "a\n\nb\nc\n", "utf8");
    assert.deepEqual(readLedgerLines(p), ["a", "b", "c"]);
  });

  it("handles empty file", () => {
    const p = path.join(tmpDir, "empty.jsonl");
    fs.writeFileSync(p, "", "utf8");
    assert.deepEqual(readLedgerLines(p), []);
  });
});

describe("parseLedger", () => {
  it("parses valid JSONL rows with sid", () => {
    const rows = parseLedger([
      '{"ts":"T","sid":"abc","tier":"GREEN"}',
      '{"ts":"T2","sid":"def","tier":"RED","heavy":"/forge"}',
    ]);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].sid, "abc");
    assert.equal(rows[1].heavy, "/forge");
  });

  it("skips malformed JSON without throwing", () => {
    const rows = parseLedger([
      "not json",
      '{"sid":"good","tier":"GREEN","ts":"T"}',
      '{"truncated":',
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].sid, "good");
  });

  it("drops rows missing string sid (regression: protect downstream slot join)", () => {
    const rows = parseLedger([
      '{"sid":null,"tier":"GREEN"}',
      '{"sid":123,"tier":"GREEN"}',
      '{"tier":"GREEN"}',
    ]);
    assert.equal(rows.length, 0);
  });

  it("ignores non-object JSON literals", () => {
    const rows = parseLedger(["42", '"sid"', "true", "null", "[]"]);
    assert.equal(rows.length, 0);
  });
});

describe("filterByWindow", () => {
  const now = Date.parse("2026-05-15T20:00:00.000Z");

  it("includes rows within window", () => {
    const rows = [
      { ts: "2026-05-15T19:00:00.000Z", sid: "a" }, // 1h ago
      { ts: "2026-05-15T10:00:00.000Z", sid: "b" }, // 10h ago
    ];
    const out = filterByWindow(rows, 2 * 3600 * 1000, now);
    assert.equal(out.length, 1);
    assert.equal(out[0].sid, "a");
  });

  it("includes everything in long window", () => {
    const rows = [
      { ts: "2026-05-14T20:00:00.000Z", sid: "a" }, // 24h ago
      { ts: "2026-05-15T19:30:00.000Z", sid: "b" }, // 30m ago
    ];
    assert.equal(filterByWindow(rows, 7 * 86400 * 1000, now).length, 2);
  });

  it("drops rows with unparseable ts", () => {
    const rows = [
      { ts: "garbage", sid: "a" },
      { ts: "2026-05-15T19:55:00.000Z", sid: "b" },
    ];
    const out = filterByWindow(rows, 60 * 60 * 1000, now);
    assert.equal(out.length, 1);
    assert.equal(out[0].sid, "b");
  });
});

describe("loadSlotMap", () => {
  beforeEach(() => { tmpDir = mktmp(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it("maps slot ↔ sid8 via claude-<sid> chatId", () => {
    const p = path.join(tmpDir, "slots.json");
    fs.writeFileSync(p, JSON.stringify({
      schemaVersion: 1,
      slots: {
        alpha: { chatId: "claude-aaaaaaaa", topic: "t1", branch: "b1" },
        echo:  { chatId: "claude-eeeeeeee", topic: "t2", branch: "b2" },
      },
    }));
    const m = loadSlotMap(p);
    assert.equal(m.size, 2);
    assert.equal(m.get("aaaaaaaa").slot, "alpha");
    assert.equal(m.get("eeeeeeee").slot, "echo");
    assert.equal(m.get("eeeeeeee").topic, "t2");
  });

  it("returns empty Map for missing slots file", () => {
    const m = loadSlotMap(path.join(tmpDir, "no-such-slots.json"));
    assert.equal(m.size, 0);
  });

  it("silently skips slot entries with non-string chatId", () => {
    const p = path.join(tmpDir, "slots-bad.json");
    fs.writeFileSync(p, JSON.stringify({
      slots: {
        alpha: { chatId: 42 },
        bravo: {},
        charlie: { chatId: "claude-12345678" },
      },
    }));
    const m = loadSlotMap(p);
    assert.equal(m.size, 1);
    assert.ok(m.has("12345678"));
  });

  it("falls back to slice(0,8) when chatId doesn't have claude- prefix", () => {
    const p = path.join(tmpDir, "slots-noprefix.json");
    fs.writeFileSync(p, JSON.stringify({ slots: { alpha: { chatId: "abcdefghxyz" } } }));
    const m = loadSlotMap(p);
    assert.ok(m.has("abcdefgh"));
  });
});

describe("aggregate", () => {
  const slotMap = new Map([
    ["aaaaaaaa", { slot: "alpha", chatId: "claude-aaaaaaaa", topic: "t1", branch: "b1" }],
    ["bbbbbbbb", { slot: "bravo", chatId: "claude-bbbbbbbb", topic: "t2", branch: "b2" }],
  ]);

  it("buckets per slot with unmapped fallback", () => {
    const rows = [
      { ts: "2026-05-15T19:00:00.000Z", sid: "aaaaaaaa", tier: "GREEN", percent: 80 },
      { ts: "2026-05-15T19:01:00.000Z", sid: "aaaaaaaa", tier: "RED", percent: 20, heavy: "/forge" },
      { ts: "2026-05-15T19:02:00.000Z", sid: "bbbbbbbb", tier: "GREEN", percent: 70 },
      { ts: "2026-05-15T19:03:00.000Z", sid: "zzzzzzzz", tier: "CRITICAL", percent: 10 },
    ];
    const agg = aggregate(rows, slotMap);
    assert.equal(agg.bySlot.alpha.fires, 2);
    assert.equal(agg.bySlot.bravo.fires, 1);
    assert.equal(agg.bySlot.unmapped.fires, 1);
  });

  it("collects RED/CRITICAL into separate list sorted desc by ts", () => {
    const rows = [
      { ts: "2026-05-15T19:00:00.000Z", sid: "aaaaaaaa", tier: "GREEN", percent: 80 },
      { ts: "2026-05-15T19:05:00.000Z", sid: "aaaaaaaa", tier: "RED", percent: 22 },
      { ts: "2026-05-15T19:10:00.000Z", sid: "bbbbbbbb", tier: "CRITICAL", percent: 11 },
    ];
    const agg = aggregate(rows, slotMap);
    assert.equal(agg.redCritical.length, 2);
    assert.equal(agg.redCritical[0].ts, "2026-05-15T19:10:00.000Z"); // newest first
    assert.equal(agg.redCritical[1].tier, "RED");
  });

  it("counts heavyNearLimit only on RED or CRITICAL with heavy set", () => {
    const rows = [
      { ts: "2026-05-15T19:00:00.000Z", sid: "aaaaaaaa", tier: "GREEN", percent: 80, heavy: "/forge" },
      { ts: "2026-05-15T19:01:00.000Z", sid: "aaaaaaaa", tier: "RED", percent: 20, heavy: "/forge" },
      { ts: "2026-05-15T19:02:00.000Z", sid: "aaaaaaaa", tier: "CRITICAL", percent: 10, heavy: "/pdf-learn" },
      { ts: "2026-05-15T19:03:00.000Z", sid: "aaaaaaaa", tier: "RED", percent: 20, heavy: null },
    ];
    const agg = aggregate(rows, slotMap);
    assert.equal(agg.bySlot.alpha.heavyNearLimit, 2);
  });

  it("computes p50/p95/min using nearest-rank percentile (regression for reviewer-A P2)", () => {
    // Samples [0,10,20,30,40,50,60,70,80,90] sorted ascending.
    // Nearest-rank p50 (NIST): ceil(0.5*10)-1 = 4 → ps[4] = 40.
    // Nearest-rank p95: ceil(0.95*10)-1 = 9 → ps[9] = 90.
    // Previous floor()-1 formula returned 80 (p80) — the new formula must reach 90.
    const rows = [];
    for (let i = 0; i < 10; i++) {
      rows.push({ ts: `2026-05-15T19:00:0${i}.000Z`, sid: "aaaaaaaa", tier: "GREEN", percent: i * 10 });
    }
    const agg = aggregate(rows, slotMap);
    assert.equal(agg.bySlot.alpha.min, 0);
    assert.equal(agg.bySlot.alpha.p50, 40);
    assert.equal(agg.bySlot.alpha.p95, 90); // strict: catches the floor()-1 regression
  });

  it("nearest-rank percentile handles single-sample slot", () => {
    const agg = aggregate([
      { ts: "T", sid: "aaaaaaaa", tier: "GREEN", percent: 73 },
    ], slotMap);
    assert.equal(agg.bySlot.alpha.p50, 73);
    assert.equal(agg.bySlot.alpha.p95, 73);
    assert.equal(agg.bySlot.alpha.min, 73);
  });

  it("deduplicates sids", () => {
    const rows = [
      { ts: "T", sid: "aaaaaaaa", tier: "GREEN", percent: 50 },
      { ts: "T", sid: "aaaaaaaa", tier: "GREEN", percent: 50 },
    ];
    const agg = aggregate(rows, slotMap);
    assert.equal(agg.bySlot.alpha.sids.length, 1);
  });

  it("buckets unknown tier under UNKNOWN", () => {
    const rows = [
      { ts: "T", sid: "aaaaaaaa", tier: "WEIRD", percent: 50 },
    ];
    const agg = aggregate(rows, slotMap);
    assert.equal(agg.bySlot.alpha.tiers.UNKNOWN, 1);
  });
});

describe("buildHeadline", () => {
  it("returns zero counts for empty input", () => {
    const h = buildHeadline([], { bySlot: {} });
    assert.equal(h.totalFires, 0);
    assert.equal(h.distinctSids, 0);
    assert.equal(h.slotsWithFires, 0);
  });

  it("counts RED/CRITICAL and heavyOpsNearLimit", () => {
    const rows = [
      { sid: "a", tier: "GREEN" },
      { sid: "a", tier: "RED", heavy: "/forge" },
      { sid: "b", tier: "CRITICAL", heavy: "/pdf-learn" },
      { sid: "b", tier: "CRITICAL", heavy: null },
    ];
    const h = buildHeadline(rows, { bySlot: { alpha: {}, bravo: {} } });
    assert.equal(h.totalFires, 4);
    assert.equal(h.distinctSids, 2);
    assert.equal(h.slotsWithFires, 2);
    assert.equal(h.redFires, 1);
    assert.equal(h.criticalFires, 2);
    assert.equal(h.heavyOpsNearLimit, 2);
  });

  it("excludes 'unmapped' from slotsWithFires count", () => {
    const h = buildHeadline([], { bySlot: { unmapped: {}, alpha: {} } });
    assert.equal(h.slotsWithFires, 1);
  });
});

describe("formatText", () => {
  it("renders headline, per-slot bars, and recent RED/CRITICAL", () => {
    const headline = { totalFires: 3, distinctSids: 2, slotsWithFires: 1, redFires: 1, criticalFires: 0, heavyOpsNearLimit: 1 };
    const agg = {
      bySlot: { alpha: { fires: 3, tiers: { GREEN: 2, YELLOW: 0, RED: 1, CRITICAL: 0, UNKNOWN: 0 }, heavyNearLimit: 1, sids: ["aaaaaaaa"], p50: 50, p95: 80, min: 20 } },
      redCritical: [{ ts: "2026-05-15T19:00:00.000Z", sid: "aaaaaaaa", slot: "alpha", tier: "RED", percent: 22, heavy: "/forge" }],
    };
    const out = formatText(headline, agg, agg.redCritical);
    assert.match(out, /Token-Budget Telemetry/);
    assert.match(out, /alpha/);
    assert.match(out, /3 fires/);
    assert.match(out, /RED/);
    assert.match(out, /\/forge/);
  });

  it("handles empty bySlot gracefully", () => {
    const headline = { totalFires: 0, distinctSids: 0, slotsWithFires: 0, redFires: 0, criticalFires: 0, heavyOpsNearLimit: 0 };
    const out = formatText(headline, { bySlot: {}, redCritical: [] }, []);
    assert.match(out, /no rows in window/);
  });

  it("surfaces ledgerMissing in header (regression for reviewer-B P2: first-run UX)", () => {
    const headline = { totalFires: 0, distinctSids: 0, slotsWithFires: 0, redFires: 0, criticalFires: 0, heavyOpsNearLimit: 0 };
    const out = formatText(headline, { bySlot: {}, redCritical: [] }, [], { ledgerMissing: true, ledgerPath: "/nope/ledger.jsonl" });
    assert.match(out, /not yet created/);
    assert.match(out, /\/nope\/ledger\.jsonl/);
  });

  it("does NOT mention ledger when present and empty", () => {
    const headline = { totalFires: 0, distinctSids: 0, slotsWithFires: 0, redFires: 0, criticalFires: 0, heavyOpsNearLimit: 0 };
    const out = formatText(headline, { bySlot: {}, redCritical: [] }, [], { ledgerMissing: false });
    assert.equal(out.includes("not yet created"), false);
  });

  it("sorts slots alphabetically with unmapped pushed last", () => {
    const headline = { totalFires: 2, distinctSids: 2, slotsWithFires: 1, redFires: 0, criticalFires: 0, heavyOpsNearLimit: 0 };
    const agg = {
      bySlot: {
        unmapped: { fires: 1, tiers: { GREEN: 1, YELLOW: 0, RED: 0, CRITICAL: 0, UNKNOWN: 0 }, heavyNearLimit: 0, sids: ["z"], p50: 50, p95: 50, min: 50 },
        alpha:    { fires: 1, tiers: { GREEN: 1, YELLOW: 0, RED: 0, CRITICAL: 0, UNKNOWN: 0 }, heavyNearLimit: 0, sids: ["a"], p50: 80, p95: 80, min: 80 },
      },
      redCritical: [],
    };
    const out = formatText(headline, agg, []);
    const alphaIdx = out.indexOf("alpha");
    const unmappedIdx = out.indexOf("unmapped");
    assert.ok(alphaIdx > -1 && unmappedIdx > -1 && alphaIdx < unmappedIdx);
  });
});
