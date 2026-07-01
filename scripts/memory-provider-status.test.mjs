// Tests for formatStatusReport (U-MEM-PROVIDER-REGISTRY-WIRE CLI, slot:bravo 2026-06-14).
// Pure rendering of aggregateStats() output -> text|json. R9 intent-tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatStatusReport } from "./memory-provider-status.mjs";

const agg = {
  providers: [
    { name: "obsidian-feed", count: 4325, totalBytes: 10 * 1048576, lastSync: "2026-06-14T00:00:00.000Z" },
    { name: "prism-kg", count: 0, totalBytes: 0, lastSync: null },
  ],
  combinedCount: 4325, combinedBytes: 10 * 1048576, providerCount: 2,
};

test("text report lists each provider with entries + MB", () => {
  const r = formatStatusReport(agg, []);
  assert.match(r, /obsidian-feed: 4325 entries, 10\.00 MB/);
  assert.match(r, /prism-kg: 0 entries/);
  assert.match(r, /combined .*4325 entries.*2 provider/);
});

test("a provider error row is rendered, not crashed", () => {
  const r = formatStatusReport({ providers: [{ name: "bad", error: "disk gone" }], combinedCount: 0, combinedBytes: 0, providerCount: 1 }, []);
  assert.match(r, /bad: ERROR disk gone/);
});

test("skipped providers are surfaced (R12 -- non-conformant not hidden)", () => {
  const r = formatStatusReport(agg, [{ name: "weird", missing: ["stats"] }]);
  assert.match(r, /skipped \(non-conformant\): weird/);
});

test("--json returns parseable JSON carrying providers + skipped", () => {
  const j = JSON.parse(formatStatusReport(agg, [{ name: "weird" }], { wantJson: true }));
  assert.equal(j.providerCount, 2);
  assert.equal(j.providers[0].name, "obsidian-feed");
  assert.equal(j.skipped[0].name, "weird");
});

test("malformed/empty agg -> safe zero report (never throws)", () => {
  const r = formatStatusReport(null, null);
  assert.match(r, /0 entries.*0 provider/);
  assert.doesNotMatch(r, /skipped/);
});
