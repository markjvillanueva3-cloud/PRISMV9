// Tests for memory-provider-registry (U-MEM-PROVIDER-REGISTRY-WIRE, slot:bravo 2026-06-14).
// DI mock providers -> hermetic. R9 intent-tests for discovery + conformance-gating + aggregate.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultProviders, buildRegistry, listProviders, getProvider, aggregateStats,
} from "./memory-provider-registry.mjs";

// A fully-conformant mock provider with a configurable stats() result (or thrown error).
const mkProvider = (name, statsResult) => ({
  providerName: () => name,
  async list() { return []; },
  async read() { return null; },
  async write() { return { written: true }; },
  async delete() { return { deleted: true }; },
  async stats() { if (statsResult instanceof Error) throw statsResult; return statsResult; },
});

test("buildRegistry registers all conformant providers", () => {
  const { registry, skipped } = buildRegistry([mkProvider("a", {}), mkProvider("b", {})]);
  assert.equal(registry.size, 2);
  assert.deepEqual(skipped, []);
  assert.deepEqual(listProviders(registry).sort(), ["a", "b"]);
});

test("R9: a non-conformant provider is SKIPPED + RECORDED, not silently registered", () => {
  // Missing stats + delete -> must NOT be registered; must appear in skipped with the missing list.
  const broken = { providerName: () => "broken", list: async () => [], read: async () => null, write: async () => ({}) };
  const { registry, skipped } = buildRegistry([mkProvider("ok", {}), broken]);
  assert.equal(registry.size, 1);             // only the conformant one
  assert.equal(getProvider(registry, "broken"), null);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].name, "broken");
  assert.deepEqual(skipped[0].missing.sort(), ["delete", "stats"]);
});

test("getProvider returns the instance or null", () => {
  const { registry } = buildRegistry([mkProvider("x", {})]);
  assert.equal(getProvider(registry, "x").providerName(), "x");
  assert.equal(getProvider(registry, "nope"), null);
});

test("aggregateStats sums per-provider count/bytes, sorted by count desc", async () => {
  const { registry } = buildRegistry([
    mkProvider("small", { count: 2, totalBytes: 20 }),
    mkProvider("big", { count: 10, totalBytes: 100 }),
  ]);
  const agg = await aggregateStats(registry);
  assert.equal(agg.providerCount, 2);
  assert.equal(agg.combinedCount, 12);
  assert.equal(agg.combinedBytes, 120);
  assert.equal(agg.providers[0].name, "big");   // largest count first
  assert.equal(agg.providers[1].name, "small");
  // R12: the naive-sum caveat travels with the data (JSON consumers reading combined* must see it)
  assert.match(agg.combinedNote, /naive sum/i);
});

test("R9: aggregateStats is fail-soft per provider -- one throwing stats() does not break the others", async () => {
  const { registry } = buildRegistry([
    mkProvider("good", { count: 5, totalBytes: 50 }),
    mkProvider("bad", new Error("disk gone")),
  ]);
  const agg = await aggregateStats(registry);
  assert.equal(agg.providerCount, 2);
  const good = agg.providers.find((p) => p.name === "good");
  const bad = agg.providers.find((p) => p.name === "bad");
  assert.equal(good.count, 5);
  assert.match(bad.error, /disk gone/);
  assert.equal(agg.combinedCount, 5);            // the broken one contributes 0, not NaN
});

test("aggregateStats coerces non-finite count/bytes to 0 (no NaN leak)", async () => {
  const { registry } = buildRegistry([mkProvider("weird", { count: "x", totalBytes: undefined })]);
  const agg = await aggregateStats(registry);
  assert.equal(agg.providers[0].count, 0);
  assert.equal(agg.combinedCount, 0);
  assert.equal(Number.isNaN(agg.combinedCount), false);
});

test("empty / null registry -> empty aggregate (never throws)", async () => {
  assert.deepEqual(listProviders(null), []);
  const agg = await aggregateStats(null);
  assert.deepEqual(agg.providers, []);
  assert.equal(agg.combinedCount, 0);
});

test("defaultProviders yields the 3 real first-party providers, all conformant", () => {
  const { registry, skipped } = buildRegistry(defaultProviders());
  assert.deepEqual(skipped, []);                 // all 3 conform (no drift)
  assert.deepEqual(listProviders(registry).sort(), ["obsidian-feed", "obsidian-receipt", "prism-kg"]);
});
