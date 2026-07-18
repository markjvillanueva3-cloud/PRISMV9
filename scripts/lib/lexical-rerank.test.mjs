#!/usr/bin/env node
/**
 * lexical-rerank.test.mjs — hermetic tests for the U-RAG-2 stage-2 reranker.
 * No I/O, no network, no model.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenize, scoreCandidate, rerank, DEFAULT_WEIGHTS } from "./lexical-rerank.mjs";

test("tokenize — lowercases, splits non-alphanumeric, drops stopwords + 1-char", () => {
  assert.deepEqual(tokenize("the Quick Brown-Fox"), ["quick", "brown", "fox"]);
  assert.deepEqual(tokenize("Cutting Force (Kienzle)"), ["cutting", "force", "kienzle"]);
  assert.deepEqual(tokenize(""), []);
  assert.deepEqual(tokenize(null), []);
});

test("scoreCandidate — full coverage + phrase + density scores high", () => {
  const qt = tokenize("cutting force");
  const s = scoreCandidate(qt, "cutting force", { text: "cutting force model kienzle" });
  // coverage 2/2=1, phrase=1, density occ2/4*4 capped=1, labelHit=0, stage1=0
  // = .35*1 + .25*1 + .10*1 = 0.70
  assert.ok(Math.abs(s - 0.70) < 1e-9, `expected 0.70, got ${s}`);
});

test("scoreCandidate — no overlap scores 0", () => {
  const qt = tokenize("cutting force");
  assert.equal(scoreCandidate(qt, "cutting force", { text: "surface finish roughness" }), 0);
});

test("scoreCandidate — partial coverage, no phrase", () => {
  const qt = tokenize("cutting force");
  const s = scoreCandidate(qt, "cutting force", { text: "force" });
  // coverage 1/2=.5, phrase 0, density occ1/1*4 capped=1, = .35*.5 + .10*1 = 0.275
  assert.ok(Math.abs(s - 0.275) < 1e-9, `expected 0.275, got ${s}`);
});

test("scoreCandidate — labelHit feature fires on label token match", () => {
  const qt = tokenize("kienzle");
  const s = scoreCandidate(qt, "kienzle", { text: "unrelated body", label: "KienzleForceModel" });
  // coverage: 'kienzle' in label → 1/1=1 ; labelHit=1 ; = .35*1 + .15*1 = 0.50
  assert.ok(Math.abs(s - 0.50) < 1e-9, `expected 0.50, got ${s}`);
});

test("scoreCandidate — stage1 score carried through and clamped", () => {
  const qt = tokenize("zzz");
  // no lexical overlap; only stage1 contributes. score 0.8 → .15*0.8 = 0.12
  const s = scoreCandidate(qt, "zzz", { text: "nothing here", score: 0.8 });
  assert.ok(Math.abs(s - 0.12) < 1e-9, `expected 0.12, got ${s}`);
  // out-of-range stage1 clamps to 1 → .15
  const s2 = scoreCandidate(qt, "zzz", { text: "nothing", score: 999 });
  assert.ok(Math.abs(s2 - 0.15) < 1e-9, `expected 0.15, got ${s2}`);
});

test("rerank — reorders candidates best→worst by combined score", () => {
  const cands = [
    { id: "b", text: "surface finish roughness" },
    { id: "a", text: "cutting force model kienzle" },
    { id: "c", text: "force" },
  ];
  const out = rerank("cutting force", cands).map((c) => c.id);
  assert.deepEqual(out, ["a", "c", "b"]); // .70, .275, 0
});

test("rerank — respects topK", () => {
  const cands = [
    { id: "a", text: "cutting force" },
    { id: "b", text: "force" },
    { id: "c", text: "nothing" },
  ];
  assert.deepEqual(rerank("cutting force", cands, { topK: 2 }).map((c) => c.id), ["a", "b"]);
});

test("rerank — stable on tie (preserves stage-1 order)", () => {
  const cands = [
    { id: "first", text: "no overlap one" },
    { id: "second", text: "no overlap two" },
  ];
  // both score 0 → original order kept
  assert.deepEqual(rerank("cutting force", cands).map((c) => c.id), ["first", "second"]);
});

test("rerank — does not mutate the input array", () => {
  const cands = [{ id: "a", text: "x" }, { id: "b", text: "cutting force" }];
  const snapshot = cands.map((c) => c.id);
  rerank("cutting force", cands);
  assert.deepEqual(cands.map((c) => c.id), snapshot);
});

test("rerank — graceful degradation: blank query / non-array → input unchanged", () => {
  const cands = [{ id: "a", text: "x" }];
  assert.deepEqual(rerank("", cands), cands);
  assert.deepEqual(rerank("   ", cands), cands);
  assert.deepEqual(rerank("the and of", cands), cands); // all-stopword query
  assert.deepEqual(rerank("q", null), []);
});

test("rerank — custom weights override defaults", () => {
  const cands = [
    { id: "phraseHit", text: "cutting force exact" },
    { id: "coverageOnly", text: "force then later cutting" },
  ];
  // default: phraseHit wins (has the verbatim phrase). With phrase weight 0
  // and coverage dominant, both have full coverage → tie → stage-1 order.
  const out = rerank("cutting force", cands, {
    weights: { ...DEFAULT_WEIGHTS, phrase: 0 },
  }).map((c) => c.id);
  assert.equal(out[0], "phraseHit"); // tie broken by original order
});
