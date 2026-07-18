// scripts/lib/octopus-input-curator.test.mjs — U-HOC01 tests (pure, hermetic).

import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTEXT_BLOCK_MAX_BYTES,
  DEFAULT_RERANK_FLOOR,
  DEFAULT_TOP_K,
  buildSharedContext,
  collectExemplars,
  spliceIntoVoicePrompt,
} from "./octopus-input-curator.mjs";

function jaccardRerank(query, candidates, topK) {
  const qTokens = new Set(String(query).toLowerCase().split(/\s+/).filter(Boolean));
  const scored = candidates.map((c) => {
    const cTokens = new Set(String(c).toLowerCase().split(/\s+/).filter(Boolean));
    let intersect = 0;
    for (const t of qTokens) if (cTokens.has(t)) intersect++;
    const union = qTokens.size + cTokens.size - intersect;
    const score = union > 0 ? intersect / union : 0;
    return { candidate: c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK || candidates.length);
}

test("constants are exported with sane defaults", () => {
  assert.equal(DEFAULT_TOP_K, 3);
  assert.equal(DEFAULT_RERANK_FLOOR, 0.3);
  assert.ok(CONTEXT_BLOCK_MAX_BYTES > 1024);
});

test("buildSharedContext returns '' on missing rerank or corpora (back-compat)", () => {
  assert.equal(buildSharedContext("q"), "");
  assert.equal(buildSharedContext("q", { rerank: jaccardRerank }), "");
  assert.equal(buildSharedContext("q", { psnCorpora: { tribal: ["x"] } }), "");
  assert.equal(buildSharedContext("", { rerank: jaccardRerank, psnCorpora: { tribal: ["x"] } }), "");
});

test("buildSharedContext renders one block per usable leg, with rerank scores", () => {
  const out = buildSharedContext("fix Kienzle constant lookup for steel", {
    rerank: jaccardRerank,
    psnCorpora: {
      tribal: ["Kienzle constants live in constants.ts steel", "drink coffee", "fix lookup steel"],
      skills: ["physics-verify Kienzle constant lookup steel", "unrelated git stash"],
    },
    topK: 2,
  });
  assert.match(out, /PSN context/);
  assert.match(out, /Leg: tribal/);
  assert.match(out, /Leg: skills/);
  // Top tribal candidate by token overlap is "fix lookup steel" (3/6 = 0.5).
  assert.match(out, /fix lookup steel|Kienzle constant lookup steel/);
});

test("collectExemplars returns structured legs + errors", () => {
  const ex = collectExemplars({
    prompt: "fix Kienzle steel",
    rerank: jaccardRerank,
    corpora: {
      tribal: ["Kienzle steel fix"],
      skills: [],
      wiki: ["Kienzle reference page steel"],
    },
  });
  assert.equal(ex.legs.length, 2); // empty skills array skipped
  assert.equal(ex.legs[0].name, "tribal");
  assert.equal(ex.legs[1].name, "wiki");
  assert.ok(ex.legs[0].hits[0].score > 0);
});

test("collectExemplars captures per-leg rerank errors (R12 fail-soft)", () => {
  const flakyRerank = (_q, candidates) => {
    if (candidates[0] === "tribal-broken") throw new Error("downstream failure");
    return candidates.map((c) => ({ candidate: c, score: 0.8 }));
  };
  const ex = collectExemplars({
    prompt: "p",
    rerank: flakyRerank,
    corpora: {
      tribal: ["tribal-broken"],
      skills: ["wiki-good"],
    },
  });
  assert.equal(ex.errors.length, 1);
  assert.equal(ex.errors[0].leg, "tribal");
  assert.equal(ex.legs.length, 1);
  assert.equal(ex.legs[0].name, "skills");
});

test("collectExemplars discards rerank scores below RERANK_FLOOR", () => {
  const lowScoreRerank = (_q, candidates) => candidates.map((c) => ({ candidate: c, score: 0.05 }));
  const ex = collectExemplars({
    prompt: "p",
    rerank: lowScoreRerank,
    corpora: { tribal: ["a", "b", "c"] },
  });
  // All scores below floor → no usable hits → no legs emitted
  assert.equal(ex.legs.length, 0);
});

test("buildSharedContext output never exceeds CONTEXT_BLOCK_MAX_BYTES", () => {
  // Force a huge corpus
  const giant = new Array(50).fill(0).map((_, i) => `extremely long candidate string ${i} `.repeat(50));
  const out = buildSharedContext("query matches all", {
    rerank: (_q, c, k) => c.slice(0, k).map((cc) => ({ candidate: cc, score: 0.9 })),
    psnCorpora: { tribal: giant, skills: giant, wiki: giant },
    topK: 20,
  });
  assert.ok(out.length <= CONTEXT_BLOCK_MAX_BYTES);
});

test("buildSharedContext adversarial: rerank returns non-array → treated as no-hits", () => {
  const weirdRerank = () => "not an array";
  const out = buildSharedContext("q", {
    rerank: weirdRerank,
    psnCorpora: { tribal: ["x"] },
  });
  assert.equal(out, "");
});

test("buildSharedContext adversarial: NaN/Infinity scores filtered", () => {
  const insaneRerank = (_q, c) => c.map((cc, i) => ({ candidate: cc, score: i === 0 ? NaN : Infinity }));
  const out = buildSharedContext("q", {
    rerank: insaneRerank,
    psnCorpora: { tribal: ["a", "b"] },
  });
  assert.equal(out, ""); // all scores invalid → no usable hits
});

test("spliceIntoVoicePrompt prepends context before prompt template", () => {
  const tmpl = "You are voice 1. Respond to:\n{{PROMPT}}";
  const ctx = "## PSN context\n- bla\n";
  const spliced = spliceIntoVoicePrompt(tmpl, ctx);
  assert.match(spliced, /^## PSN context/);
  assert.match(spliced, /You are voice 1/);
});

test("spliceIntoVoicePrompt is idempotent (back-compat with double-injection)", () => {
  const tmpl = "voice template";
  const ctx = "## context block\n";
  const once = spliceIntoVoicePrompt(tmpl, ctx);
  const twice = spliceIntoVoicePrompt(once, ctx);
  assert.equal(once, twice);
});

test("spliceIntoVoicePrompt is a no-op when context block is empty", () => {
  const tmpl = "voice";
  assert.equal(spliceIntoVoicePrompt(tmpl, ""), tmpl);
  assert.equal(spliceIntoVoicePrompt(tmpl, null), tmpl);
});

test("variability — 3 spanning prompt domains exercise the same curator", () => {
  // Domain A: physics/mill (bravo soul); Domain B: zebra/orchestrator;
  // Domain C: octopus/consensus. Each should produce a non-empty block
  // when corpora carry domain-relevant strings.
  const cases = [
    { prompt: "Kienzle steel kc1.1 mill", corpus: "Kienzle steel kc1.1 reference", expectHit: true },
    { prompt: "zebra orchestrator slot bravo compact", corpus: "zebra orchestrator compact decision", expectHit: true },
    { prompt: "octopus 5-voice consensus dissent", corpus: "octopus consensus voice dissent", expectHit: true },
  ];
  for (const c of cases) {
    const out = buildSharedContext(c.prompt, {
      rerank: jaccardRerank,
      psnCorpora: { tribal: [c.corpus] },
    });
    if (c.expectHit) {
      assert.match(out, /Leg: tribal/, `domain ${c.prompt}`);
    }
  }
});
