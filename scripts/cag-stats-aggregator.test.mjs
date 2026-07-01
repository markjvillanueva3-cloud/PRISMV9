// scripts/cag-stats-aggregator.test.mjs
// Tests for U-CAG-02-TELEMETRY-CHANNEL. Run: node --test scripts/cag-stats-aggregator.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const {
  listSidecars,
  readSidecar,
  aggregateSidecars,
  appendStats,
  aggregate,
} = await import("./cag-stats-aggregator.mjs");

function makeTempCagDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cag-stats-test-"));
}

function writeSidecar(dir, sid, data) {
  const p = path.join(dir, `slot-soul-cached-${sid}.json`);
  fs.writeFileSync(p, JSON.stringify(data));
  return p;
}

function sidecar(slot, soulBytes, blockBytes, ts = "2026-05-27T00:00:00.000Z") {
  return {
    schemaVersion: 1,
    ts,
    sid: `test-${slot}-${ts}`,
    slot,
    soulBytes,
    blockBytes,
    kind: "slot-soul-cache-block",
    psn_legs: [1, 2],
  };
}

// ─── listSidecars ──────────────────────────────────────────────────────────
test("listSidecars: returns empty array when dir missing", () => {
  const p = path.join(os.tmpdir(), `nonexistent-cag-${process.pid}-${Date.now()}`);
  assert.deepEqual(listSidecars(p), []);
});

test("listSidecars: filters to slot-soul-cached-*.json only + sorts", () => {
  const dir = makeTempCagDir();
  writeSidecar(dir, "b", sidecar("alpha", 100, 150));
  writeSidecar(dir, "a", sidecar("alpha", 100, 150));
  fs.writeFileSync(path.join(dir, "other-file.json"), "{}");
  fs.writeFileSync(path.join(dir, "slot-soul-cached-not-json.txt"), "ignored");
  const got = listSidecars(dir);
  assert.equal(got.length, 2);
  assert.ok(got[0].endsWith("slot-soul-cached-a.json"));
  assert.ok(got[1].endsWith("slot-soul-cached-b.json"));
});

// ─── readSidecar ───────────────────────────────────────────────────────────
test("readSidecar: parses valid JSON sidecar", () => {
  const dir = makeTempCagDir();
  const p = writeSidecar(dir, "x", sidecar("india", 1000, 1500));
  const got = readSidecar(p);
  assert.equal(got.slot, "india");
  assert.equal(got.soulBytes, 1000);
});

test("readSidecar: returns null on missing file or corrupt JSON", () => {
  const dir = makeTempCagDir();
  assert.equal(readSidecar(path.join(dir, "nonexistent.json")), null);
  const p = path.join(dir, "corrupt.json");
  fs.writeFileSync(p, "not-json-at-all");
  assert.equal(readSidecar(p), null);
});

// ─── aggregateSidecars ─────────────────────────────────────────────────────
test("aggregateSidecars: empty input → zero counts", () => {
  const out = aggregateSidecars([]);
  assert.equal(out.total, 0);
  assert.equal(out.totalSoulBytes, 0);
  assert.equal(out.totalBlockBytes, 0);
  assert.equal(out.overallExpansionRatio, 0);
  assert.deepEqual(out.by_slot, {});
});

test("aggregateSidecars: groups by slot + computes per-slot + total stats", () => {
  const out = aggregateSidecars([
    sidecar("alpha", 1000, 1200, "2026-05-25T00:00:00.000Z"),
    sidecar("alpha", 1100, 1300, "2026-05-26T00:00:00.000Z"),
    sidecar("india", 2000, 2400, "2026-05-27T00:00:00.000Z"),
  ]);
  assert.equal(out.total, 3);
  assert.equal(out.totalSoulBytes, 4100);
  assert.equal(out.totalBlockBytes, 4900);
  assert.equal(out.overallExpansionRatio.toFixed(4), "1.1951");
  // alpha cell
  const alpha = out.by_slot.alpha;
  assert.equal(alpha.sessions, 2);
  assert.equal(alpha.totalSoulBytes, 2100);
  assert.equal(alpha.totalBlockBytes, 2500);
  assert.equal(alpha.firstTs, "2026-05-25T00:00:00.000Z");
  assert.equal(alpha.lastTs, "2026-05-26T00:00:00.000Z");
  assert.equal(alpha.expansionRatio.toFixed(4), "1.1905");
  // india cell
  const india = out.by_slot.india;
  assert.equal(india.sessions, 1);
  assert.equal(india.totalSoulBytes, 2000);
});

test("aggregateSidecars: handles malformed sidecars gracefully (null + missing fields)", () => {
  const out = aggregateSidecars([
    sidecar("alpha", 100, 150),
    null,
    { slot: "bravo", ts: "2026-05-27T00:00:00.000Z" }, // missing byte counts
    undefined,
    "not-an-object",
  ]);
  assert.equal(out.total, 2); // null + non-object skipped; bravo counts
  assert.ok(out.by_slot.alpha);
  assert.ok(out.by_slot.bravo);
  assert.equal(out.by_slot.bravo.totalSoulBytes, 0); // missing → 0
});

test("aggregateSidecars: assigns missing-slot sidecars to '_unknown'", () => {
  const out = aggregateSidecars([{ ts: "2026-05-27T00:00:00.000Z", soulBytes: 100, blockBytes: 150 }]);
  assert.equal(out.total, 1);
  assert.ok(out.by_slot._unknown);
  assert.equal(out.by_slot._unknown.sessions, 1);
});

// ─── appendStats ───────────────────────────────────────────────────────────
test("appendStats: creates dir + appends JSONL line", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cag-out-"));
  const out = path.join(dir, "nested", "cag-stats.jsonl");
  const entry = aggregateSidecars([sidecar("alpha", 100, 150)]);
  appendStats(entry, out);
  const lines = fs.readFileSync(out, "utf8").split("\n").filter(Boolean);
  assert.equal(lines.length, 1);
  const parsed = JSON.parse(lines[0]);
  assert.equal(parsed.total, 1);
});

test("appendStats: multiple calls accumulate (history preserved)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cag-out2-"));
  const out = path.join(dir, "cag-stats.jsonl");
  appendStats(aggregateSidecars([sidecar("alpha", 1, 2)]), out);
  appendStats(aggregateSidecars([sidecar("bravo", 3, 4)]), out);
  const lines = fs.readFileSync(out, "utf8").split("\n").filter(Boolean);
  assert.equal(lines.length, 2);
});

// ─── aggregate (top-level) ─────────────────────────────────────────────────
test("aggregate: end-to-end scan + parse + aggregate", () => {
  const dir = makeTempCagDir();
  writeSidecar(dir, "a", sidecar("india", 1500, 1800));
  writeSidecar(dir, "b", sidecar("india", 1500, 1800));
  writeSidecar(dir, "c", sidecar("alpha", 800, 1000));
  fs.writeFileSync(path.join(dir, "ignore.json"), "{}"); // not a slot-soul-cached sidecar
  const out = aggregate(dir);
  assert.equal(out.total, 3);
  assert.equal(out.by_slot.india.sessions, 2);
  assert.equal(out.by_slot.alpha.sessions, 1);
  assert.equal(out.totalSoulBytes, 3800);
  assert.equal(out.totalBlockBytes, 4600);
});

// ─── variability ──────────────────────────────────────────────────────────
test("variability: 5 NATO slots × distinct sidecar shapes all aggregate correctly", () => {
  const dir = makeTempCagDir();
  const slots = ["alpha", "bravo", "charlie", "delta", "india"];
  for (const s of slots) {
    writeSidecar(dir, `${s}-1`, sidecar(s, 1000, 1200));
    writeSidecar(dir, `${s}-2`, sidecar(s, 1100, 1300));
  }
  const out = aggregate(dir);
  assert.equal(out.total, 10);
  assert.equal(Object.keys(out.by_slot).length, 5);
  for (const s of slots) {
    assert.equal(out.by_slot[s].sessions, 2);
    assert.equal(out.by_slot[s].totalSoulBytes, 2100);
  }
});
