// scripts/lib/soul-evolution.test.mjs — U-HRP05 tests.
import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_NOVEL_THRESHOLD,
  deriveRuleSlug,
  proposeRefuseRuleCandidates,
  renderSoulDraftMarkdown,
} from "./soul-evolution.mjs";

function jaccardRerank(query, candidates, topK) {
  const q = new Set(String(query).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  return candidates
    .map((c) => {
      const ct = new Set(String(c).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
      let inter = 0;
      for (const t of q) if (ct.has(t)) inter++;
      const u = q.size + ct.size - inter;
      return { candidate: c, score: u > 0 ? inter / u : 0 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK || candidates.length);
}

test("deriveRuleSlug — kebab-case + length + reject too-short", () => {
  assert.equal(deriveRuleSlug("Never inline physics constants!"), "never-inline-physics-constants");
  assert.equal(deriveRuleSlug("ab"), ""); // too short
  assert.equal(deriveRuleSlug(""), "");
  assert.equal(deriveRuleSlug(null), "");
  assert.match(deriveRuleSlug("x".repeat(200)), /^x{4,96}$/);
});

test("constants exported", () => {
  assert.equal(DEFAULT_NOVEL_THRESHOLD, 0.5);
});

test("proposeRefuseRuleCandidates — empty inputs return empty proposed", () => {
  const r = proposeRefuseRuleCandidates({ currentRefuseList: [], sessionCorrections: [], rerank: jaccardRerank });
  assert.deepEqual(r, { proposed: [], skipped: [] });
});

test("proposes rule when refuse_list empty (first soul evolution)", () => {
  const r = proposeRefuseRuleCandidates({
    currentRefuseList: [],
    sessionCorrections: [{ text: "Stop weakening safety thresholds", source: "user" }],
    rerank: jaccardRerank,
  });
  assert.equal(r.proposed.length, 1);
  assert.equal(r.proposed[0].rule, "stop-weakening-safety-thresholds");
});

test("skips correction when existing rule has high overlap (R8 read-before-write)", () => {
  const r = proposeRefuseRuleCandidates({
    currentRefuseList: ["inline-physics-constants"],
    sessionCorrections: [{ text: "inline physics constants reminder", source: "user" }],
    rerank: jaccardRerank,
    minNovelThreshold: 0.4,
  });
  assert.equal(r.proposed.length, 0);
  assert.equal(r.skipped.length, 1);
  assert.match(r.skipped[0].reason, /existing-rule-overlap/);
});

test("proposes when correction is semantically novel", () => {
  const r = proposeRefuseRuleCandidates({
    currentRefuseList: ["inline-physics-constants", "stub-engine-creation"],
    sessionCorrections: [{ text: "skipping physics-reviewer agent dispatch", source: "user" }],
    rerank: jaccardRerank,
  });
  assert.equal(r.proposed.length, 1);
  assert.equal(r.proposed[0].rule, "skipping-physics-reviewer-agent-dispatch");
});

test("rerank-throw fail-soft → propose anyway", () => {
  const r = proposeRefuseRuleCandidates({
    currentRefuseList: ["existing-rule"],
    sessionCorrections: [{ text: "new rule needed here" }],
    rerank: () => { throw new Error("down"); },
  });
  assert.equal(r.proposed.length, 1);
});

test("fallback (no rerank) — substring containment heuristic", () => {
  const r = proposeRefuseRuleCandidates({
    currentRefuseList: ["inline-physics-constants"],
    sessionCorrections: [
      { text: "inline-physics-constants again" }, // substring match → skip
      { text: "completely separate thing" },      // no match → propose
    ],
    rerank: null,
  });
  assert.equal(r.proposed.length, 1);
  assert.equal(r.proposed[0].rule, "completely-separate-thing");
});

test("renderSoulDraftMarkdown — non-empty proposed → frontmatter + rule block", () => {
  const md = renderSoulDraftMarkdown(
    "bravo",
    [
      { rule: "test-rule", sourceCorrection: "the source correction text", maxScoreVsExisting: 0.2 },
    ],
    { now: "2026-05-23T20:00:00.000Z" },
  );
  assert.match(md, /slot: bravo/);
  assert.match(md, /kind: soul-evolution-draft/);
  assert.match(md, /test-rule/);
  assert.match(md, /the source correction text/);
});

test("renderSoulDraftMarkdown — empty proposed shows the no-rules line", () => {
  const md = renderSoulDraftMarkdown("alpha", [], { now: "2026-05-23T20:00:00.000Z" });
  assert.match(md, /no novel rules proposed/);
});
