// ZULU-AWARENESS-MS0 — pipeline tests (pure, hermetic).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SCHEMA_VERSION,
  DEFAULT_WEIGHTS,
  parseDomainFilter,
  buildCapabilityFingerprint,
  scoreSlotForTask,
  trainFromOutcomes,
  rankSlotsForTask,
  summarizeRanking,
} from "../../scripts/lib/zulu-awareness-pipeline.mjs";

describe("constants", () => {
  it("SCHEMA_VERSION is 1.0.0", () => assert.equal(SCHEMA_VERSION, "1.0.0"));
  it("DEFAULT_WEIGHTS is frozen", () => assert.equal(Object.isFrozen(DEFAULT_WEIGHTS), true));
  it("refuseHit is a strong veto", () => assert.equal(DEFAULT_WEIGHTS.refuseHit, -100));
});

describe("parseDomainFilter", () => {
  it("returns [] on empty/non-string", () => {
    assert.deepEqual(parseDomainFilter(null), []);
    assert.deepEqual(parseDomainFilter(""), []);
    assert.deepEqual(parseDomainFilter(undefined), []);
  });
  it("splits pipe-separated domains", () => {
    assert.deepEqual(parseDomainFilter("mill|milling|cutting-force"), ["mill", "milling", "cutting-force"]);
  });
  it("trims + lowercases", () => {
    assert.deepEqual(parseDomainFilter(" Mill | LATHE "), ["mill", "lathe"]);
  });
  it("drops empty segments", () => {
    assert.deepEqual(parseDomainFilter("|mill||lathe|"), ["mill", "lathe"]);
  });
});

describe("buildCapabilityFingerprint", () => {
  it("rejects empty slot", () => {
    const fp = buildCapabilityFingerprint("", {});
    assert.equal(fp.ok, false);
    assert.equal(fp.reason, "no-slot");
  });
  it("builds minimum fingerprint with neutral prior", () => {
    const fp = buildCapabilityFingerprint("bravo", { domain_filter: "mill" });
    assert.equal(fp.ok, true);
    assert.deepEqual(fp.domains, ["mill"]);
    assert.equal(fp.successRate, 0.5);  // neutral prior with 0 samples
    assert.equal(fp.successSampleSize, 0);
    assert.equal(fp.hermesRole, "specialist");
  });
  it("captures hermes_role + refuse_list", () => {
    const fp = buildCapabilityFingerprint("zulu", {
      hermes_role: "orchestrator-hermes",
      refuse_list: ["scope-expansion", "speculative-features"],
    });
    assert.equal(fp.hermesRole, "orchestrator-hermes");
    assert.deepEqual(fp.refuseList, ["scope-expansion", "speculative-features"]);
  });
  it("computes successRate from sample", () => {
    const fp = buildCapabilityFingerprint("bravo", {}, {
      verdictPassCount: 7,
      verdictTotalCount: 10,
    });
    assert.equal(fp.successRate, 0.7);
    assert.equal(fp.successSampleSize, 10);
  });
});

describe("scoreSlotForTask", () => {
  const fpBravo = {
    slot: "bravo", ok: true, hermesRole: "specialist-mill",
    domains: ["mill", "milling", "cutting-force"],
    refuseList: ["inline-physics-constants", "stub-engine"],
    queueLength: 3, recentCommitScopes: [], skillUsageCount: 0,
    tribalDomainScores: { mill: 8, lathe: 1 },
    vizNodeCount: 24, successRate: 0.85, successSampleSize: 20,
  };
  it("returns -Inf for no-fingerprint", () => {
    const r = scoreSlotForTask(null, { text: "x" });
    assert.equal(r.score, -Infinity);
    assert.deepEqual(r.evidence, ["no-fingerprint"]);
  });
  it("HARD VETO on refuse-list hit", () => {
    const r = scoreSlotForTask(fpBravo, { text: "add inline-physics-constants for kc1.1" });
    assert.ok(r.score <= -99);  // refuseHit veto
    assert.ok(r.evidence.some(e => e.startsWith("REFUSE:")));
  });
  it("scores domain-matched task highly", () => {
    const r = scoreSlotForTask(fpBravo, { domain: "mill", text: "calculate kc1.1 chip load" });
    assert.ok(r.score >= 5);  // domain+tribal+viz+success all kick in
    assert.ok(r.evidence.some(e => e.startsWith("domain:")));
    assert.ok(r.evidence.some(e => e.startsWith("tribal:")));
    assert.ok(r.evidence.some(e => e.startsWith("viz:")));
    assert.ok(r.evidence.some(e => e.startsWith("success:")));
  });
  it("notes no-domain-match when task domain is foreign", () => {
    const r = scoreSlotForTask(fpBravo, { domain: "wedm", text: "wire-edm pulse settings" });
    // wedm not in bravo's domains → no domain match bonus
    assert.ok(r.evidence.includes("no-domain-match"));
  });
  it("penalizes heavy queue depth", () => {
    const fpHeavy = { ...fpBravo, queueLength: 100 };
    const fpLight = { ...fpBravo, queueLength: 1 };
    const rHeavy = scoreSlotForTask(fpHeavy, { domain: "mill", text: "x" });
    const rLight = scoreSlotForTask(fpLight, { domain: "mill", text: "x" });
    assert.ok(rLight.score > rHeavy.score);
  });
  it("ignores narrow-sample success history", () => {
    const fpNarrow = { ...fpBravo, successSampleSize: 1 };
    const r = scoreSlotForTask(fpNarrow, { domain: "mill", text: "x" });
    assert.ok(!r.evidence.some(e => e.startsWith("success:")));
  });
});

describe("trainFromOutcomes", () => {
  it("returns DEFAULT_WEIGHTS unchanged when no data", () => {
    const r = trainFromOutcomes([], {});
    assert.equal(r.weights.successRate, DEFAULT_WEIGHTS.successRate);
    assert.equal(r.weights.queueDepth, DEFAULT_WEIGHTS.queueDepth);
  });
  it("bumps successRate weight when recommendedPassRate ≥ 0.7", () => {
    const lines = new Array(10).fill(0).map((_, i) =>
      JSON.stringify({ verdict: i < 8 ? "AUTO-PASS" : "AUTO-FAIL" })
    );
    const r = trainFromOutcomes(lines, {});
    assert.ok(r.weights.successRate > DEFAULT_WEIGHTS.successRate);
    assert.equal(r.stats.recommendedTotal, 10);
    assert.equal(r.stats.recommendedPass, 8);
  });
  it("dampens successRate weight when recommendedPassRate ≤ 0.3", () => {
    const lines = new Array(10).fill(0).map((_, i) =>
      JSON.stringify({ verdict: i < 2 ? "AUTO-PASS" : "AUTO-FAIL" })
    );
    const r = trainFromOutcomes(lines, {});
    assert.ok(r.weights.successRate < DEFAULT_WEIGHTS.successRate);
  });
  it("bounds adjustments — never exceeds ±50% of default", () => {
    const lines = new Array(100).fill(JSON.stringify({ verdict: "AUTO-PASS" }));
    const r = trainFromOutcomes(lines, {});
    const def = DEFAULT_WEIGHTS.successRate;
    assert.ok(r.weights.successRate <= def + Math.abs(def) * 0.5);
    assert.ok(r.weights.successRate >= def - Math.abs(def) * 0.5);
  });
  it("learns from heavy-queue claim outcomes", () => {
    const claims = {
      claims: {
        u1: { queueDepthAtClaim: 10, outcome: "success" },
        u2: { queueDepthAtClaim: 12, outcome: "success" },
        u3: { queueDepthAtClaim: 8, outcome: "success" },
      },
    };
    const r = trainFromOutcomes([], claims);
    // Heavy-queue success → softer penalty (less negative)
    assert.ok(r.weights.queueDepth >= DEFAULT_WEIGHTS.queueDepth);
  });
});

describe("rankSlotsForTask", () => {
  const fpBravo = buildCapabilityFingerprint("bravo", { domain_filter: "mill", refuse_list: ["stub"] }, { vizNodeCount: 20, verdictPassCount: 8, verdictTotalCount: 10 });
  const fpCharlie = buildCapabilityFingerprint("charlie", { domain_filter: "lathe" }, { vizNodeCount: 15 });
  const fpZulu = buildCapabilityFingerprint("zulu", { domain_filter: "orchestration", refuse_list: ["scope-expansion"] });

  it("returns [] on non-array input", () => {
    assert.deepEqual(rankSlotsForTask({ text: "x" }, null), []);
  });
  it("ranks mill task to bravo first", () => {
    const r = rankSlotsForTask({ domain: "mill", text: "calculate cutting force" }, [fpBravo, fpCharlie, fpZulu]);
    assert.ok(r.length >= 1);
    assert.equal(r[0].slot, "bravo");
  });
  it("ranks lathe task to charlie first", () => {
    const r = rankSlotsForTask({ domain: "lathe", text: "turning insert wear" }, [fpBravo, fpCharlie, fpZulu]);
    assert.equal(r[0].slot, "charlie");
  });
  it("filters out refused slots entirely", () => {
    const r = rankSlotsForTask({ domain: "mill", text: "add stub engine" }, [fpBravo]);
    assert.equal(r.length, 0);  // bravo refuses 'stub'
  });
  it("falls through to generic match when no slot has exact domain", () => {
    const r = rankSlotsForTask({ domain: "wedm", text: "wire-edm work" }, [fpBravo, fpCharlie, fpZulu]);
    // None match exactly; the strongest fingerprint wins (bravo has viz+success bonuses)
    assert.ok(r.length > 0);
  });
});

describe("summarizeRanking", () => {
  it("returns placeholder on empty", () => {
    assert.equal(summarizeRanking([]), "(no slots ranked)");
    assert.equal(summarizeRanking(null), "(no slots ranked)");
  });
  it("formats top-N entries", () => {
    const ranking = [
      { slot: "bravo", score: 7.5, evidence: ["domain:mill", "tribal:mill=8"] },
      { slot: "charlie", score: 4.0, evidence: ["domain:lathe"] },
      { slot: "zulu", score: 1.0, evidence: [] },
    ];
    const s = summarizeRanking(ranking, 2);
    assert.match(s, /bravo=7\.50/);
    assert.match(s, /charlie=4\.00/);
    assert.ok(!s.includes("zulu"));  // top 2 only
  });
});
