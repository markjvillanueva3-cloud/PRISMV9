// scripts/lib/zebra-rag-policy.test.mjs — U-HRP04 tests.
import test from "node:test";
import assert from "node:assert/strict";
import { POLICY_ACTIONS, ragPolicyDecision } from "./zebra-rag-policy.mjs";

function tokenRerank(query, candidates, topK) {
  const q = new Set(String(query).toLowerCase().split(/\s+/).filter(Boolean));
  return candidates
    .map((c) => {
      const ct = new Set(String(c).toLowerCase().split(/\s+/).filter(Boolean));
      let inter = 0;
      for (const t of q) if (ct.has(t)) inter++;
      const score = ct.size + q.size - inter > 0 ? inter / (q.size + ct.size - inter) : 0;
      return { candidate: c, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK || candidates.length);
}

test("POLICY_ACTIONS is the frozen set", () => {
  assert.deepEqual([...POLICY_ACTIONS].sort(), ["clear", "compact", "noop"]);
});

test("returns null when no inputs", () => {
  assert.equal(ragPolicyDecision({ fingerprint: "" }), null);
  assert.equal(ragPolicyDecision({ fingerprint: "fp", historicalDecisions: [] }), null);
  assert.equal(ragPolicyDecision({ fingerprint: "fp", historicalDecisions: [{ fingerprint: "x", action: "noop" }] }), null);
});

test("picks the action of the highest-scoring similar prior decision", () => {
  const d = ragPolicyDecision({
    fingerprint: "high-pressure uncommitted bravo",
    historicalDecisions: [
      { fingerprint: "high-pressure uncommitted bravo", action: "compact", outcome: "success" },
      { fingerprint: "low-pressure clean alpha", action: "noop", outcome: "success" },
    ],
    rerank: tokenRerank,
  });
  assert.equal(d.action, "compact");
  assert.match(d.reason, /rag-policy/);
});

test("ignores failure-outcome historical decisions", () => {
  const d = ragPolicyDecision({
    fingerprint: "pressure-x slot-y",
    historicalDecisions: [
      { fingerprint: "pressure-x slot-y", action: "clear", outcome: "failure" },
      { fingerprint: "pressure-x slot-y other", action: "compact", outcome: "success" },
    ],
    rerank: tokenRerank,
  });
  assert.equal(d.action, "compact");
});

test("doubles weight on success-outcome", () => {
  // 2 noop@success + 1 compact@success-but-lower-score → noop should win on weight.
  const d = ragPolicyDecision({
    fingerprint: "q1 q2 q3",
    historicalDecisions: [
      { fingerprint: "q1 q2 q3", action: "noop", outcome: "success" },
      { fingerprint: "q1 q2 q3 extra", action: "compact", outcome: "pending" },
    ],
    rerank: tokenRerank,
    minScore: 0.1,
  });
  assert.equal(d.action, "noop");
});

test("rerank throwing returns null (R12 fail-soft)", () => {
  const d = ragPolicyDecision({
    fingerprint: "q",
    historicalDecisions: [{ fingerprint: "q", action: "noop" }],
    rerank: () => { throw new Error("rerank service down"); },
  });
  assert.equal(d, null);
});

test("ignores unknown actions (forward-compat)", () => {
  const d = ragPolicyDecision({
    fingerprint: "q",
    historicalDecisions: [{ fingerprint: "q", action: "fly-to-mars" }],
    rerank: tokenRerank,
  });
  assert.equal(d, null); // no valid decisions → null
});

test("variability — 3 spanning policy domains return correct action", () => {
  const cases = [
    { fp: "edit pressure high bravo", action: "compact" },
    { fp: "clean slot idle alpha", action: "noop" },
    { fp: "many handoff pending charlie", action: "clear" },
  ];
  for (const c of cases) {
    const d = ragPolicyDecision({
      fingerprint: c.fp,
      historicalDecisions: [{ fingerprint: c.fp, action: c.action, outcome: "success" }],
      rerank: tokenRerank,
    });
    assert.equal(d.action, c.action);
  }
});
