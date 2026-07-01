// ZULU-AWARENESS-MS1/U-AW01 — consumer-lib tests (pure, hermetic).
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  loadAwareness,
  invalidateAwarenessCache,
  lookupSlot,
  rankSlots,
  scoreSlot,
  enrichSlotPicks,
  recommendSlotsForDomain,
} from "../../scripts/lib/zulu-awareness-consumer.mjs";

const FAKE_INDEX = {
  schemaVersion: "1.0.0",
  generatedAt: "2026-05-20T00:00:00Z",
  slotCount: 3,
  fingerprints: [
    {
      slot: "bravo", ok: true, hermesRole: "specialist-mill",
      domains: ["mill", "milling", "cutting-force"],
      refuseList: ["stub-engine"], queueLength: 3,
      recentCommitScopes: [], skillUsageCount: 0,
      tribalDomainScores: { mill: 50 }, vizNodeCount: 20000,
      successRate: 0.85, successSampleSize: 10,
    },
    {
      slot: "charlie", ok: true, hermesRole: "specialist-lathe",
      domains: ["lathe", "turning"], refuseList: [],
      queueLength: 1, recentCommitScopes: [], skillUsageCount: 0,
      tribalDomainScores: { lathe: 15 }, vizNodeCount: 500,
      successRate: 0.5, successSampleSize: 0,
    },
    {
      slot: "zulu", ok: true, hermesRole: "orchestrator-hermes",
      domains: ["orchestration", "routing", "backend-dev"],
      refuseList: ["scope-expansion"],
      queueLength: 0, recentCommitScopes: [], skillUsageCount: 0,
      tribalDomainScores: { "backend-dev": 65 }, vizNodeCount: 1500,
      successRate: 0.5, successSampleSize: 0,
    },
  ],
};

function fakeReader(filePath) {
  if (filePath.endsWith("zulu-awareness-index.json")) return FAKE_INDEX;
  if (filePath.endsWith("zulu-awareness-weights.json")) return null;  // → DEFAULT_WEIGHTS
  return null;
}

function emptyReader() { return null; }

beforeEach(() => { invalidateAwarenessCache(); });

describe("loadAwareness", () => {
  it("returns empty envelope when reader returns nothing", () => {
    const env = loadAwareness({ reader: emptyReader });
    assert.equal(env.ok, false);
    assert.equal(env.reason, "no-index");
    assert.deepEqual(env.fingerprints, []);
  });
  it("returns populated envelope from fake reader", () => {
    const env = loadAwareness({ reader: fakeReader });
    assert.equal(env.ok, true);
    assert.equal(env.fingerprints.length, 3);
    assert.equal(env.weights.domainMatch, 4.0);  // DEFAULT_WEIGHTS fallback
  });
  it("memoizes — second call returns same object", () => {
    const a = loadAwareness({ reader: fakeReader });
    const b = loadAwareness({ reader: fakeReader });
    assert.strictEqual(a, b);
  });
  it("honors PRISM_ZULU_AWARENESS_DISABLE=1", () => {
    const prev = process.env.PRISM_ZULU_AWARENESS_DISABLE;
    process.env.PRISM_ZULU_AWARENESS_DISABLE = "1";
    invalidateAwarenessCache();
    try {
      const env = loadAwareness({ reader: fakeReader });
      assert.equal(env.ok, false);
      assert.equal(env.reason, "disabled-env");
    } finally {
      if (prev === undefined) delete process.env.PRISM_ZULU_AWARENESS_DISABLE;
      else process.env.PRISM_ZULU_AWARENESS_DISABLE = prev;
      invalidateAwarenessCache();
    }
  });
});

describe("lookupSlot", () => {
  it("returns null on empty/bogus input", () => {
    assert.equal(lookupSlot("", { reader: fakeReader }), null);
    assert.equal(lookupSlot(null, { reader: fakeReader }), null);
  });
  it("returns null when slot absent", () => {
    assert.equal(lookupSlot("nonsuch", { reader: fakeReader }), null);
  });
  it("finds known slot", () => {
    const fp = lookupSlot("bravo", { reader: fakeReader });
    assert.ok(fp);
    assert.equal(fp.hermesRole, "specialist-mill");
  });
  it("returns null when index missing", () => {
    assert.equal(lookupSlot("bravo", { reader: emptyReader }), null);
  });
});

describe("rankSlots", () => {
  it("emits no-task on empty input", () => {
    const r = rankSlots(null, { reader: fakeReader });
    assert.equal(r.ok, false);
    assert.equal(r.reason, "no-task");
  });
  it("emits no-index when reader empty", () => {
    const r = rankSlots({ domain: "mill" }, { reader: emptyReader });
    assert.equal(r.ok, false);
    assert.equal(r.reason, "no-index");
    assert.deepEqual(r.ranking, []);
  });
  it("ranks mill task → bravo wins", () => {
    const r = rankSlots({ domain: "mill", text: "kc1.1 cutting force" }, { reader: fakeReader });
    assert.equal(r.ok, true);
    assert.ok(r.ranking.length >= 1);
    assert.equal(r.ranking[0].slot, "bravo");
  });
  it("respects maxResults", () => {
    const r = rankSlots({ domain: "orchestration", text: "x" }, { reader: fakeReader, maxResults: 1 });
    assert.equal(r.ranking.length, 1);
  });
  it("includes a summary string", () => {
    const r = rankSlots({ domain: "mill", text: "x" }, { reader: fakeReader });
    assert.equal(typeof r.summary, "string");
    assert.ok(r.summary.length > 0);
  });
});

describe("scoreSlot", () => {
  it("returns -Inf for unknown slot", () => {
    const r = scoreSlot("nonsuch", { domain: "mill" }, { reader: fakeReader });
    assert.equal(r.ok, false);
    assert.equal(r.score, -Infinity);
  });
  it("scores known slot against domain", () => {
    const r = scoreSlot("bravo", { domain: "mill", text: "kc1.1 mill" }, { reader: fakeReader });
    assert.equal(r.ok, true);
    assert.ok(r.score > 0);
    assert.ok(r.evidence.some(e => e.startsWith("domain:")));
  });
});

describe("enrichSlotPicks", () => {
  it("returns [] on non-array", () => {
    assert.deepEqual(enrichSlotPicks(null, { reader: fakeReader }), []);
  });
  it("decorates picks with awareness fields", () => {
    const picks = [{ slot: "bravo", pid: 1 }, { slot: "charlie", pid: 2 }];
    const out = enrichSlotPicks(picks, { reader: fakeReader });
    assert.equal(out.length, 2);
    assert.equal(out[0].awareness.hermesRole, "specialist-mill");
    assert.equal(out[0].awareness.primaryDomain, "mill");
    assert.equal(out[0].awareness.queueLength, 3);
  });
  it("sets awareness=null for unknown slot", () => {
    const picks = [{ slot: "nonsuch", pid: 99 }];
    const out = enrichSlotPicks(picks, { reader: fakeReader });
    assert.equal(out[0].awareness, null);
  });
  it("preserves original fields", () => {
    const picks = [{ slot: "bravo", pid: 1, extra: "keep" }];
    const out = enrichSlotPicks(picks, { reader: fakeReader });
    assert.equal(out[0].extra, "keep");
    assert.equal(out[0].pid, 1);
  });
});

describe("recommendSlotsForDomain", () => {
  it("returns [] on empty domain hint", () => {
    assert.deepEqual(recommendSlotsForDomain("", { reader: fakeReader }), []);
    assert.deepEqual(recommendSlotsForDomain(null, { reader: fakeReader }), []);
  });
  it("returns [] when index missing", () => {
    assert.deepEqual(recommendSlotsForDomain("mill", { reader: emptyReader }), []);
  });
  it("surfaces bravo for mill hint", () => {
    const recs = recommendSlotsForDomain("mill", { reader: fakeReader });
    assert.ok(recs.length >= 1);
    assert.equal(recs[0].slot, "bravo");
    assert.equal(recs[0].hermesRole, "specialist-mill");
    assert.ok(recs[0].score > 0);
  });
  it("surfaces zulu for backend-dev hint", () => {
    const recs = recommendSlotsForDomain("backend-dev", { reader: fakeReader });
    assert.ok(recs.length >= 1);
    assert.equal(recs[0].slot, "zulu");
  });
  it("filters out zero-score slots", () => {
    const recs = recommendSlotsForDomain("wedm", { reader: fakeReader });
    // No slot in our fake index has wedm in domain_filter
    // — every result should have score > 0 (or list is empty)
    for (const r of recs) assert.ok(r.score > 0);
  });
});
