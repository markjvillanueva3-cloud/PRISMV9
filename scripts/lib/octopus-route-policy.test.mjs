// scripts/lib/octopus-route-policy.test.mjs — U-HOC03 tests.
import test from "node:test";
import assert from "node:assert/strict";
import {
  KEYWORD_OCTOPUS_TRIGGERS,
  KEYWORD_OLLAMA_TRIGGERS,
  ROUTES,
  octopusRouteDecision,
} from "./octopus-route-policy.mjs";

function tokenRerank(query, candidates, topK) {
  const q = new Set(String(query).toLowerCase().split(/\s+/).filter(Boolean));
  return candidates
    .map((c) => {
      const ct = new Set(String(c).toLowerCase().split(/\s+/).filter(Boolean));
      let inter = 0;
      for (const t of q) if (ct.has(t)) inter++;
      const u = q.size + ct.size - inter;
      return { candidate: c, score: u > 0 ? inter / u : 0 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK || candidates.length);
}

test("ROUTES exported as the frozen 4-tuple", () => {
  assert.equal(ROUTES.length, 4);
  assert.ok(ROUTES.includes("route:octopus"));
  assert.ok(ROUTES.includes("route:single-claude"));
  assert.ok(ROUTES.includes("route:ollama-only"));
  assert.ok(ROUTES.includes("route:skip-ai"));
});

test("empty prompt → skip-ai", () => {
  const d = octopusRouteDecision({ prompt: "" });
  assert.equal(d.route, "route:skip-ai");
});

test("octopus-keyword fast-path", () => {
  for (const kw of KEYWORD_OCTOPUS_TRIGGERS) {
    const d = octopusRouteDecision({ prompt: `please run ${kw} on this question` });
    assert.equal(d.route, "route:octopus", `${kw} should trigger octopus`);
    assert.match(d.reason, /keyword-trigger/);
  }
});

test("ollama-keyword fast-path", () => {
  for (const kw of KEYWORD_OLLAMA_TRIGGERS) {
    const d = octopusRouteDecision({ prompt: `please ${kw} this content` });
    assert.equal(d.route, "route:ollama-only", `${kw} should trigger ollama`);
  }
});

test("default route is single-claude (no learning signal)", () => {
  const d = octopusRouteDecision({ prompt: "what is the answer to this question" });
  assert.equal(d.route, "route:single-claude");
  assert.match(d.reason, /default-no-learning-signal/);
});

test("similar prior with dissent + correct outcome → route:octopus", () => {
  const d = octopusRouteDecision({
    prompt: "should kc1.1 stainless be 2100 MPa?",
    historicalRuns: [
      {
        prompt: "should kc1.1 stainless be 2100 MPa for this material",
        outcome: "correct",
        consensus: { dissent_items: ["voice-c disagreed: cite source"] },
      },
    ],
    rerank: tokenRerank,
  });
  assert.equal(d.route, "route:octopus");
  assert.match(d.reason, /similar-prior-success/);
});

test("similar prior unanimous + correct → single-claude (overkill avoidance)", () => {
  const d = octopusRouteDecision({
    prompt: "what is 2 plus 2",
    historicalRuns: [
      { prompt: "what is 2 plus 2", outcome: "correct", consensus: { dissent_items: [] } },
    ],
    rerank: tokenRerank,
    coinFlip: () => 0.9, // > minInvokeRate → don't boost
  });
  assert.equal(d.route, "route:single-claude");
  assert.match(d.reason, /similar-prior-overkill/);
});

test("min-invoke-rate guarantee — coinFlip < rate boosts to octopus", () => {
  const d = octopusRouteDecision({
    prompt: "trivial question",
    historicalRuns: [
      { prompt: "trivial question", outcome: "correct", consensus: { dissent_items: [] } },
    ],
    rerank: tokenRerank,
    coinFlip: () => 0.05, // < 0.1 default minInvokeRate
  });
  assert.equal(d.route, "route:octopus");
  assert.match(d.reason, /min-invoke-rate-boost/);
});

test("rerank throws → falls back to default route", () => {
  const d = octopusRouteDecision({
    prompt: "novel question with no precedent",
    historicalRuns: [{ prompt: "p", outcome: "correct" }],
    rerank: () => { throw new Error("rerank down"); },
  });
  assert.equal(d.route, "route:single-claude");
});

test("variability — 3 spanning prompt classes route differently", () => {
  const cases = [
    { prompt: "summarize this 200-page paper", expect: "route:ollama-only" },
    { prompt: "run consensus on contested 5-voice question", expect: "route:octopus" },
    { prompt: "casual question with no special markers", expect: "route:single-claude" },
  ];
  for (const c of cases) {
    const d = octopusRouteDecision({ prompt: c.prompt });
    assert.equal(d.route, c.expect, `${c.prompt} → ${c.expect}`);
  }
});
