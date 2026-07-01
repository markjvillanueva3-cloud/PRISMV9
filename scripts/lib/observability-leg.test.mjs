import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadObservabilityState,
  summarizeObservability,
  detectHallucination,
  evaluateRetrieval,
} from "./observability-leg.mjs";

function fakeFs(map) {
  return {
    readImpl: (p) => { if (!(p in map)) throw new Error("ENOENT"); return map[p]; },
    existsImpl: (p) => p in map,
  };
}

test("loadObservabilityState: missing files give all nulls", () => {
  const s = loadObservabilityState({ roots: { scrutiny: "/x", errorPattern: "/y", tokenEconomy: "/z", routeSavings: "/a", ollamaOffload: "/b" }, ...fakeFs({}) });
  assert.equal(s.scrutiny, null);
  assert.equal(s.errorPattern, null);
});

test("loadObservabilityState: malformed JSON gives null per file, never throws", () => {
  const fs = fakeFs({ "/sc": "{not-json", "/ep": '{"patterns":[]}' });
  const s = loadObservabilityState({ roots: { scrutiny: "/sc", errorPattern: "/ep", tokenEconomy: "/x", routeSavings: "/y", ollamaOffload: "/z" }, ...fs });
  assert.equal(s.scrutiny, null);
  assert.deepEqual(s.errorPattern, { patterns: [] });
});

test("summarizeObservability: counts present surfaces", () => {
  const s = summarizeObservability({ scrutiny: { a: 1, b: 2 }, errorPattern: { patterns: [1, 2, 3] }, tokenEconomy: null, routeSavings: null, ollamaOffload: null });
  assert.equal(s.surfacesPresent, 2);
  assert.equal(s.scrutinyEntries, 2);
  assert.equal(s.errorPatterns, 3);
});

test("summarizeObservability: ollama offload rate math", () => {
  const s = summarizeObservability({ scrutiny: null, errorPattern: null, tokenEconomy: null, routeSavings: null, ollamaOffload: { offloaded: 30, keptOnClaude: 70 } });
  assert.equal(s.offloadRate, 0.3);
});

test("summarizeObservability: zero-divide guard", () => {
  const s = summarizeObservability({ scrutiny: null, errorPattern: null, tokenEconomy: null, routeSavings: null, ollamaOffload: { offloaded: 0, keptOnClaude: 0 } });
  assert.equal(s.offloadRate, 0);
});

test("summarizeObservability: null state returns null", () => {
  assert.equal(summarizeObservability(null), null);
});

test("detectHallucination: no-citation in clean prose triggers", () => {
  const r = detectHallucination("The system was rewritten last week to fix the crash.");
  assert.ok(r.signals.some((s) => s.id === "no-citation"));
});

test("detectHallucination: cited claim does NOT trigger no-citation", () => {
  const r = detectHallucination("Per CLAUDE.md the slot system has 26 chats.");
  assert.ok(!r.signals.some((s) => s.id === "no-citation"));
});

test("detectHallucination: absolute claim triggers", () => {
  const r = detectHallucination("This is per spec always correct.");
  assert.ok(r.signals.some((s) => s.id === "absolute-claim"));
});

test("detectHallucination: vague-attribution triggers", () => {
  const r = detectHallucination("Some say the model is faster than expected.");
  assert.ok(r.signals.some((s) => s.id === "vague-attribution"));
});

test("detectHallucination: empty input gives 0 score", () => {
  assert.equal(detectHallucination("").score, 0);
  assert.equal(detectHallucination(null).score, 0);
});

test("detectHallucination: score capped at 1.0", () => {
  const r = detectHallucination("Some say it is always 100% guaranteed and never wrong.");
  assert.ok(r.score <= 1.0);
});

test("evaluateRetrieval: perfect retrieval gives precision=1 recall=1 mrr=1", () => {
  const queries = [{ id: "q1", expected: ["a", "b"] }];
  const hits = [{ queryId: "q1", results: ["a", "b"] }];
  const r = evaluateRetrieval(queries, hits, { k: 5 });
  assert.equal(r.precisionAtK, 1);
  assert.equal(r.recallAtK, 1);
  assert.equal(r.mrr, 1);
});

test("evaluateRetrieval: zero overlap gives all 0", () => {
  const r = evaluateRetrieval([{ id: "q1", expected: ["a"] }], [{ queryId: "q1", results: ["z"] }]);
  assert.equal(r.precisionAtK, 0);
  assert.equal(r.recallAtK, 0);
  assert.equal(r.mrr, 0);
});

test("evaluateRetrieval: MRR is reciprocal of first-hit rank", () => {
  const r = evaluateRetrieval(
    [{ id: "q1", expected: ["target"] }],
    [{ queryId: "q1", results: ["x", "y", "target", "z"] }],
    { k: 5 },
  );
  assert.equal(r.mrr, 1 / 3);
});

test("evaluateRetrieval: empty inputs give n=0", () => {
  assert.deepEqual(evaluateRetrieval([], []), { precisionAtK: 0, recallAtK: 0, mrr: 0, n: 0 });
});

test("evaluateRetrieval: missing query.expected skipped", () => {
  const r = evaluateRetrieval([{ id: "q1" }, { id: "q2", expected: ["a"] }], [{ queryId: "q2", results: ["a"] }]);
  assert.equal(r.n, 1);
  assert.equal(r.precisionAtK, 1);
});
