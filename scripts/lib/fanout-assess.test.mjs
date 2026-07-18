// fanout-assess.test.mjs -- reference-value + threshold + fleet-scope + adversarial.
// Run: node scripts/lib/fanout-assess.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { assessFanout, DEFAULT_FANOUT_THRESHOLD, PRIMARY_DOMAINS } from "./fanout-assess.mjs";

test("3+ distinct domains -> shouldFanout true with evidence", () => {
  const r = assessFanout("optimize the mill feed, then the lathe turning, then the wedm spark gap");
  assert.equal(r.shouldFanout, true);
  assert.ok(r.domainCount >= 3);
  const ds = r.domains.map((d) => d.domain).sort();
  assert.deepEqual(ds, ["lathe", "mill", "wedm"]);
  assert.ok(r.domains.every((d) => d.slot && d.matched.length > 0)); // slot + evidence populated
  assert.ok(r.signals.includes("multi-domain"));
});

test("single domain -> sequential (no fan-out)", () => {
  // Pure-mill prompt: no rpm/feed-rate (speed-feed) or other domain keywords.
  const r = assessFanout("adjust the mill end mill stepover and depth for this pocket profile");
  assert.equal(r.shouldFanout, false);
  assert.equal(r.domainCount, 1);
});

test("two domains (< default threshold 3) -> no fan-out", () => {
  const r = assessFanout("quote the job then generate the cam toolpath");
  assert.equal(r.domainCount, 2);
  assert.equal(r.shouldFanout, false);
});

test("explicit fleet-wide scope overrides domain count", () => {
  const r = assessFanout("apply this enhancement across all galaxies");
  assert.equal(r.shouldFanout, true);
  assert.ok(r.signals.includes("fleet-wide-scope"));
});

test("custom threshold=2 -> two domains now fans out", () => {
  const r = assessFanout("quote the job then generate the cam toolpath", { threshold: 2 });
  assert.equal(r.shouldFanout, true);
  assert.equal(r.threshold, 2);
});

test("invalid threshold clamps to default (>=2)", () => {
  assert.equal(assessFanout("mill lathe wedm cam", { threshold: 0 }).threshold, DEFAULT_FANOUT_THRESHOLD);
  assert.equal(assessFanout("mill lathe wedm cam", { threshold: NaN }).threshold, DEFAULT_FANOUT_THRESHOLD);
  assert.equal(assessFanout("mill lathe", { threshold: 2 }).threshold, 2);
});

test("adversarial: null / empty / non-string -> no fan-out, no throw", () => {
  for (const bad of [null, undefined, "", "   ", 42, {}, []]) {
    const r = assessFanout(bad);
    assert.equal(r.shouldFanout, false);
    assert.equal(r.domainCount, 0);
  }
});

test("adversarial: oversize paste does not throw + still detects", () => {
  const big = "cad ".repeat(5000) + " lathe wedm"; // > MAX_SCAN
  const r = assessFanout(big);
  assert.equal(typeof r.shouldFanout, "boolean");
});

test("word-boundary: substring does NOT false-match (millimeter != mill)", () => {
  const r = assessFanout("the part is 5 millimeter thick");
  assert.equal(r.domains.find((d) => d.domain === "mill"), undefined);
});

test("PRIMARY_DOMAINS map is well-formed (domain/slot/keywords)", () => {
  assert.ok(PRIMARY_DOMAINS.length >= 10);
  for (const d of PRIMARY_DOMAINS) {
    assert.ok(typeof d.domain === "string" && d.domain.length > 0);
    assert.ok(typeof d.slot === "string" && d.slot.length > 0);
    assert.ok(Array.isArray(d.keywords) && d.keywords.length > 0);
  }
});
