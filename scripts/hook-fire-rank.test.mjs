// scripts/hook-fire-rank.test.mjs

import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { parseLedger, aggregateFires, findZeroFireHooks } from "./hook-fire-rank.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = resolve(__dirname, "hook-fire-rank.mjs");
const NOW = Date.parse("2026-05-17T02:00:00Z");

describe("parseLedger", () => {
  test("empty / null input → {events:[], parseErrors:0}", () => {
    assert.deepEqual(parseLedger(""), { events: [], parseErrors: 0 });
    assert.deepEqual(parseLedger(null), { events: [], parseErrors: 0 });
  });

  test("valid 2-line jsonl → 2 events", () => {
    const text =
      `{"ts":"2026-05-17T01:00:00Z","hook":"a","decision":"ok"}\n` +
      `{"ts":"2026-05-17T01:30:00Z","hook":"b"}`;
    const { events, parseErrors } = parseLedger(text);
    assert.equal(events.length, 2);
    assert.equal(parseErrors, 0);
    assert.equal(events[0].hook, "a");
    assert.equal(events[1].decision, null);
  });

  test("bad JSON line counted but not throwing", () => {
    const text =
      `{"ts":"2026-05-17T01:00:00Z","hook":"a"}\n` +
      `not-json{\n` +
      `{"ts":"2026-05-17T01:01:00Z","hook":"b"}`;
    const { events, parseErrors } = parseLedger(text);
    assert.equal(events.length, 2);
    assert.equal(parseErrors, 1);
  });

  test("missing hook field → parse error", () => {
    const text = `{"ts":"2026-05-17T01:00:00Z","decision":"ok"}`;
    const { events, parseErrors } = parseLedger(text);
    assert.equal(events.length, 0);
    assert.equal(parseErrors, 1);
  });

  test("invalid ts → parse error", () => {
    const text = `{"ts":"not-a-date","hook":"a"}`;
    const { events, parseErrors } = parseLedger(text);
    assert.equal(events.length, 0);
    assert.equal(parseErrors, 1);
  });

  test("trims blank lines + handles trailing newline", () => {
    const text = `\n{"ts":"2026-05-17T01:00:00Z","hook":"a"}\n\n`;
    const { events, parseErrors } = parseLedger(text);
    assert.equal(events.length, 1);
    assert.equal(parseErrors, 0);
  });
});

describe("aggregateFires", () => {
  test("empty events → zeroed totals", () => {
    const agg = aggregateFires([], NOW);
    assert.equal(agg.totalEvents, 0);
    assert.equal(agg.uniqueHooks, 0);
    assert.deepEqual(agg.perHook, []);
  });

  test("counts per hook, sorts by fire_rate DESC", () => {
    const events = [
      { ts: Date.parse("2026-05-17T00:00:00Z"), hook: "rare", decision: "ok" },
      { ts: Date.parse("2026-05-17T00:30:00Z"), hook: "frequent", decision: "ok" },
      { ts: Date.parse("2026-05-17T01:00:00Z"), hook: "frequent", decision: "skip" },
      { ts: Date.parse("2026-05-17T01:30:00Z"), hook: "frequent", decision: "ok" },
    ];
    const agg = aggregateFires(events, NOW);
    assert.equal(agg.uniqueHooks, 2);
    assert.equal(agg.perHook[0].hook, "frequent");
    assert.equal(agg.perHook[0].count, 3);
    assert.equal(agg.perHook[1].hook, "rare");
    assert.equal(agg.perHook[1].count, 1);
  });

  test("decisions aggregated + sorted DESC by count", () => {
    const events = [
      { ts: Date.parse("2026-05-17T00:00:00Z"), hook: "h", decision: "skip" },
      { ts: Date.parse("2026-05-17T00:00:10Z"), hook: "h", decision: "ok" },
      { ts: Date.parse("2026-05-17T00:00:20Z"), hook: "h", decision: "ok" },
      { ts: Date.parse("2026-05-17T00:00:30Z"), hook: "h", decision: "ok" },
    ];
    const agg = aggregateFires(events, NOW);
    const dec = agg.perHook[0].decisions;
    assert.equal(dec[0].decision, "ok");
    assert.equal(dec[0].count, 3);
    assert.equal(dec[1].decision, "skip");
    assert.equal(dec[1].count, 1);
  });

  test("first_seen / last_seen accurate", () => {
    const events = [
      { ts: Date.parse("2026-05-16T00:00:00Z"), hook: "h" },
      { ts: Date.parse("2026-05-17T00:00:00Z"), hook: "h" },
    ];
    const agg = aggregateFires(events, NOW);
    assert.equal(agg.perHook[0].first_seen, "2026-05-16T00:00:00.000Z");
    assert.equal(agg.perHook[0].last_seen, "2026-05-17T00:00:00.000Z");
  });

  test("window includes nowMs as upper bound (events stop before now)", () => {
    const events = [{ ts: Date.parse("2026-05-17T01:00:00Z"), hook: "h" }];
    const agg = aggregateFires(events, Date.parse("2026-05-17T02:00:00Z"));
    // window = nowMs - minTs = 1 hour
    assert.ok(agg.windowHours >= 0.99 && agg.windowHours <= 1.01);
  });

  test("fire-rate per hour computed correctly", () => {
    // 60 events spanning exactly 1 hour → 60 fires/hr
    const events = Array.from({ length: 60 }, (_, i) => ({
      ts: Date.parse("2026-05-17T00:00:00Z") + i * 60_000,
      hook: "h",
    }));
    const agg = aggregateFires(events, Date.parse("2026-05-17T01:00:00Z"));
    const rate = agg.perHook[0].fire_rate_per_hour;
    assert.ok(rate >= 59 && rate <= 61, `expected ~60, got ${rate}`);
  });
});

describe("findZeroFireHooks", () => {
  test("hooks on disk but not fired → returned sorted", () => {
    const zeros = findZeroFireHooks(["c", "a", "b", "d"], ["b", "d"]);
    assert.deepEqual(zeros, ["a", "c"]);
  });

  test("empty disk → empty result", () => {
    assert.deepEqual(findZeroFireHooks([], ["a"]), []);
  });

  test("empty fired → all disk hooks zero", () => {
    assert.deepEqual(findZeroFireHooks(["a", "b"], []), ["a", "b"]);
  });

  test("all fired → empty result", () => {
    assert.deepEqual(findZeroFireHooks(["a", "b"], ["a", "b"]), []);
  });
});

describe("CLI smoke", () => {
  function writeLedger(events) {
    const dir = mkdtempSync(join(tmpdir(), "hfr-"));
    const ledger = join(dir, "ledger.jsonl");
    writeFileSync(ledger, events.map((e) => JSON.stringify(e)).join("\n") + "\n");
    return { dir, ledger };
  }
  function runCli(args) {
    return spawnSync(process.execPath, [SCRIPT_PATH, ...args], {
      encoding: "utf8", timeout: 60_000,
    });
  }

  test("missing ledger → exit 2", () => {
    const r = runCli(["--ledger-path", "/no/such/file.jsonl"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /ledger not found/);
  });

  test("unknown flag → exit 2", () => {
    const r = runCli(["--nope"]);
    assert.equal(r.status, 2);
  });

  test("valid ledger → exit 0 + JSON shape", () => {
    const { ledger } = writeLedger([
      { ts: "2026-05-17T00:00:00Z", hook: "h1", decision: "ok" },
      { ts: "2026-05-17T00:30:00Z", hook: "h1", decision: "ok" },
      { ts: "2026-05-17T01:00:00Z", hook: "h2", decision: "skip" },
    ]);
    const r = runCli(["--ledger-path", ledger, "--no-disk-scan", "--json", "--frozen-time", "2026-05-17T02:00:00Z"]);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.ledger.totalEvents, 3);
    assert.equal(out.totals.unique_firing_hooks, 2);
    assert.equal(out.ranked[0].hook, "h1");
    assert.equal(out.ranked[0].count, 2);
    assert.equal(out.zero_fire, null); // --no-disk-scan
  });

  test("REAL-DATA smoke against live ledger (no crash, ≥1 event)", () => {
    const livePath = resolve(__dirname, "../mcp-server/data/state/hook-fire-counts.jsonl");
    const r = runCli(["--ledger-path", livePath, "--json", "--frozen-time", "2026-05-17T02:00:00Z", "--top", "3"]);
    assert.ok(r.status === 0 || r.status === 2, `unexpected ${r.status}: ${r.stderr}`);
    if (r.status === 0) {
      const out = JSON.parse(r.stdout);
      assert.ok(out.ledger.totalEvents > 0);
      assert.ok(Array.isArray(out.ranked));
    }
  });
});
