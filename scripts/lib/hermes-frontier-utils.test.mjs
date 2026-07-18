// scripts/lib/hermes-frontier-utils.test.mjs — U-HFR02/03/04 + U-HRP07 + U-HOC04 tests.
import test from "node:test";
import assert from "node:assert/strict";
import {
  CROSS_SLOT_SIMILARITY_FLOOR,
  HOC04_ALIGN_RATE_FLOOR,
  HOC04_DISSENT_RATE_FLOOR,
  SOUL_GRADUATE_MIN_SLOTS,
  TRIBAL_DISTILL_MIN_SUCCESS,
  aiGenerateDraftBody,
  findCrossSlotMatches,
  findFleetGraduatedRules,
  proposeTribalEntry,
  proposeVoiceWeightAdjustments,
} from "./hermes-frontier-utils.mjs";

function tokenRerank(query, candidates, topK) {
  const q = new Set(String(query).toLowerCase().split(/\W+/).filter(Boolean));
  return candidates
    .map((c) => {
      const ct = new Set(String(c).toLowerCase().split(/\W+/).filter(Boolean));
      let inter = 0;
      for (const t of q) if (ct.has(t)) inter++;
      const u = q.size + ct.size - inter;
      return { candidate: c, score: u > 0 ? inter / u : 0 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK || candidates.length);
}

// ── U-HFR02 ────────────────────────────────────────────────────────────────
test("findCrossSlotMatches — empty inputs return []", () => {
  assert.deepEqual(findCrossSlotMatches(null, []), []);
  assert.deepEqual(findCrossSlotMatches({ fullSignature: "x" }, null), []);
  assert.deepEqual(findCrossSlotMatches({ fullSignature: "x" }, []), []);
});

test("findCrossSlotMatches — surface peer cluster with high rerank similarity", () => {
  const my = { fullSignature: "Edit Bash:vitest Bash:git refactor authentication" };
  const others = [
    { fullSignature: "Edit Bash:vitest Bash:git refactor authentication middleware" },
    { fullSignature: "Read Grep Glob completely-unrelated" },
  ];
  const matches = findCrossSlotMatches(my, others, { rerank: tokenRerank, floor: 0.4 });
  assert.equal(matches.length, 1);
  assert.ok(matches[0].score >= 0.4);
  assert.equal(matches[0].mode, "rerank");
});

test("findCrossSlotMatches — fallback substring-exact when no rerank", () => {
  const my = { fullSignature: "Edit|Bash" };
  const others = [
    { fullSignature: "Edit|Bash" },
    { fullSignature: "Read|Grep" },
  ];
  const matches = findCrossSlotMatches(my, others);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].mode, "substring-exact");
});

// ── U-HFR03 ────────────────────────────────────────────────────────────────
test("proposeTribalEntry — below success threshold returns null", () => {
  const cluster = { id: "c1", signature: "sig", count: 5, slots: { bravo: 5 } };
  const outcomes = [
    { outcome: "success" },
    { outcome: "success" },
  ];
  assert.equal(proposeTribalEntry(cluster, outcomes), null);
});

test("proposeTribalEntry — at/above threshold returns slug + body", () => {
  const cluster = {
    id: "skc-abc",
    signature: "Edit|Bash:vitest",
    semanticSummary: "refactor test to use reference data",
    count: 8,
    slots: { bravo: 5, alpha: 3 },
    dominantKind: "edit-heavy",
    medianCallCount: 8,
  };
  const outcomes = [
    { outcome: "success" }, { outcome: "success" }, { outcome: "success" }, { outcome: "abandoned" },
  ];
  const out = proposeTribalEntry(cluster, outcomes, { now: "2026-05-23T20:00:00.000Z" });
  assert.ok(out);
  assert.equal(out.successCount, 3);
  assert.match(out.slug, /^tribal-skc-abc/);
  assert.match(out.body, /Tribal — distilled/);
  assert.match(out.body, /refactor test to use reference data/);
});

// ── U-HFR04 ────────────────────────────────────────────────────────────────
test("findFleetGraduatedRules — empty inputs return []", () => {
  assert.deepEqual(findFleetGraduatedRules(null), []);
  assert.deepEqual(findFleetGraduatedRules([]), []);
});

test("findFleetGraduatedRules — rule present in ≥3 souls graduates", () => {
  const souls = [
    { slot: "alpha", refuse_list: ["inline-physics-constants", "stub-engine"] },
    { slot: "bravo", refuse_list: ["inline-physics-constants", "skip-physics-reviewer"] },
    { slot: "charlie", refuse_list: ["inline-physics-constants", "skip-wedm-preflight"] },
    { slot: "delta", refuse_list: ["different-rule-only"] },
  ];
  const graduated = findFleetGraduatedRules(souls);
  assert.equal(graduated.length, 1);
  assert.equal(graduated[0].rule, "inline-physics-constants");
  assert.equal(graduated[0].slotCount, 3);
  assert.deepEqual(graduated[0].slots, ["alpha", "bravo", "charlie"]);
});

test("findFleetGraduatedRules — case-insensitive deduplication", () => {
  const souls = [
    { slot: "a", refuse_list: ["RULE-X"] },
    { slot: "b", refuse_list: ["rule-x"] },
    { slot: "c", refuse_list: ["Rule-X"] },
  ];
  const graduated = findFleetGraduatedRules(souls);
  assert.equal(graduated.length, 1);
  assert.equal(graduated[0].slotCount, 3);
});

// ── U-HRP07 ────────────────────────────────────────────────────────────────
test("aiGenerateDraftBody — returns null when aiGenerate absent", async () => {
  const out = await aiGenerateDraftBody({ cluster: { signature: "x" } });
  assert.equal(out, null);
});

test("aiGenerateDraftBody — happy-path returns generated body", async () => {
  const cluster = { signature: "Edit|Bash", dominantKind: "edit", slots: { bravo: 5 }, semanticSummary: "refactor" };
  const aiGenerate = async (prompt) => `# Generated skill\n\nPrompt was ${prompt.length} chars.\n`;
  const out = await aiGenerateDraftBody({ cluster, aiGenerate });
  assert.match(out, /# Generated skill/);
});

test("aiGenerateDraftBody — aiGenerate throws → null (R12 fail-loud)", async () => {
  const out = await aiGenerateDraftBody({
    cluster: { signature: "x" },
    aiGenerate: async () => { throw new Error("budget exceeded"); },
  });
  assert.equal(out, null);
});

test("aiGenerateDraftBody — caps output at maxDraftBytes", async () => {
  const out = await aiGenerateDraftBody({
    cluster: { signature: "x" },
    aiGenerate: async () => "X".repeat(20000),
    maxDraftBytes: 1024,
  });
  assert.equal(out.length, 1024);
});

// ── U-HOC04 ────────────────────────────────────────────────────────────────
test("proposeVoiceWeightAdjustments — empty/non-Map returns []", () => {
  assert.deepEqual(proposeVoiceWeightAdjustments(null), []);
  assert.deepEqual(proposeVoiceWeightAdjustments(new Map()), []);
});

test("proposeVoiceWeightAdjustments — variability across 3 spanning voice patterns", () => {
  const stats = new Map([
    // Pattern A: high dissent rate → decrease
    ["voice-rebel", { totalRuns: 10, dissentCount: 8, alignedCount: 2, dissentRate: 0.8 }],
    // Pattern B: high align rate → increase
    ["voice-faithful", { totalRuns: 10, dissentCount: 0, alignedCount: 10, dissentRate: 0 }],
    // Pattern C: mixed → no proposal
    ["voice-mixed", { totalRuns: 10, dissentCount: 5, alignedCount: 5, dissentRate: 0.5 }],
    // Pattern D: too few samples → skip
    ["voice-new", { totalRuns: 2, dissentCount: 0, alignedCount: 2, dissentRate: 0 }],
  ]);
  const proposals = proposeVoiceWeightAdjustments(stats);
  // 2 proposals expected (rebel + faithful)
  assert.equal(proposals.length, 2);
  const rebel = proposals.find((p) => p.voiceId === "voice-rebel");
  const faithful = proposals.find((p) => p.voiceId === "voice-faithful");
  assert.equal(rebel.direction, "decrease");
  assert.equal(faithful.direction, "increase");
});

test("constants exported", () => {
  assert.equal(CROSS_SLOT_SIMILARITY_FLOOR, 0.55);
  assert.equal(TRIBAL_DISTILL_MIN_SUCCESS, 3);
  assert.equal(SOUL_GRADUATE_MIN_SLOTS, 3);
  assert.equal(HOC04_DISSENT_RATE_FLOOR, 0.7);
  assert.equal(HOC04_ALIGN_RATE_FLOOR, 0.9);
});
