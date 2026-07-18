#!/usr/bin/env node
/**
 * rag-llm-rerank.test.mjs — pin Stage-3 LLM rerank protocol + fail-soft.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  shouldRerank,
  buildScoringPrompt,
  parseScore,
  scoreCandidate,
  rerank,
} from "./rag-llm-rerank.mjs";

const NOOP_LLM = async () => "###SCORE###50###SCORE###";

/* ---------- shouldRerank ---------- */

describe("shouldRerank", () => {
  it("RERANKS a small-to-medium candidate set", () => {
    assert.equal(shouldRerank([{}, {}, {}, {}, {}]), true);
  });
  it("SKIPS empty / single-candidate set (nothing to reorder)", () => {
    assert.equal(shouldRerank([]), false);
    assert.equal(shouldRerank([{}]), false);
    assert.equal(shouldRerank(null), false);
    assert.equal(shouldRerank(undefined), false);
  });
  it("SKIPS oversized set (defer to stronger Stage-2 first)", () => {
    const huge = new Array(100).fill({});
    assert.equal(shouldRerank(huge, { maxK: 20 }), false);
  });
  it("respects opts.disabled kill switch", () => {
    assert.equal(shouldRerank([{}, {}], { disabled: true }), false);
  });
  it("honors custom maxK", () => {
    assert.equal(shouldRerank(new Array(50).fill({}), { maxK: 30 }), true);
    assert.equal(shouldRerank(new Array(50).fill({}), { maxK: 10 }), false);
  });
});

/* ---------- buildScoringPrompt ---------- */

describe("buildScoringPrompt", () => {
  it("includes the query verbatim", () => {
    const p = buildScoringPrompt("kc1.1 SS304", { text: "Kienzle coefficient is 2100 N/mm²" });
    assert.ok(p.includes("kc1.1 SS304"));
    assert.ok(p.includes("2100 N/mm²"));
  });
  it("includes the title hint when present", () => {
    const p = buildScoringPrompt("foo", { text: "x", title: "Material Constants" });
    assert.ok(p.includes("Material Constants"));
  });
  it("truncates long candidate text at maxCandChars", () => {
    const longText = "x".repeat(5000);
    const p = buildScoringPrompt("foo", { text: longText }, { maxCandChars: 50 });
    assert.ok(p.includes("[…truncated]"));
    assert.ok(p.length < longText.length);
  });
  it("uses anchor tokens ###SCORE### the parser expects", () => {
    const p = buildScoringPrompt("foo", { text: "bar" });
    assert.ok(p.includes("###SCORE###"));
  });
  it("THROWS on empty query (boundary — caller bug)", () => {
    assert.throws(() => buildScoringPrompt("", { text: "x" }), /non-empty string/);
    assert.throws(() => buildScoringPrompt(null, { text: "x" }), /non-empty string/);
  });
  it("THROWS on candidate without .text", () => {
    assert.throws(() => buildScoringPrompt("q", {}), /\.text string/);
    assert.throws(() => buildScoringPrompt("q", { text: 42 }), /\.text string/);
    assert.throws(() => buildScoringPrompt("q", null), /\.text string/);
  });
});

/* ---------- parseScore ---------- */

describe("parseScore", () => {
  it("extracts ###SCORE###NN###SCORE### wrapped integer", () => {
    assert.equal(parseScore("###SCORE###85###SCORE###"), 85);
    assert.equal(parseScore("rationale: ... ###SCORE###42###SCORE### done"), 42);
  });
  it("extracts wrapped decimal", () => {
    assert.equal(parseScore("###SCORE###42.5###SCORE###"), 42.5);
  });
  it("clamps wrapped value to [0, 100]", () => {
    assert.equal(parseScore("###SCORE###200###SCORE###"), 100);
    assert.equal(parseScore("###SCORE###-5###SCORE###"), 0);
  });
  it("FALLBACK: first standalone integer in [0,100]", () => {
    assert.equal(parseScore("The score is 73 — done."), 73);
  });
  it("ignores out-of-range fallback integers (keeps looking)", () => {
    assert.equal(parseScore("In year 2026 the relevance is 88 / 100."), 88);
  });
  it("returns NaN when nothing parseable", () => {
    assert.ok(Number.isNaN(parseScore("no number here")));
    assert.ok(Number.isNaN(parseScore("")));
    assert.ok(Number.isNaN(parseScore(null)));
    assert.ok(Number.isNaN(parseScore(undefined)));
  });
  it("ADVERSARIAL: malformed wrapper falls through to fallback", () => {
    assert.equal(parseScore("###SCORE### no number ###SCORE### 42"), 42);
  });
});

/* ---------- scoreCandidate (DI-stubbed LLM) ---------- */

describe("scoreCandidate", () => {
  it("happy path: returns the LLM-parsed score", async () => {
    const llm = async () => "###SCORE###77###SCORE###";
    const s = await scoreCandidate("q", { text: "doc" }, llm);
    assert.equal(s, 77);
  });
  it("FAIL-SOFT: non-function llm → NaN", async () => {
    assert.ok(Number.isNaN(await scoreCandidate("q", { text: "d" }, null)));
  });
  it("FAIL-SOFT: malformed candidate (no .text) → NaN, no LLM call", async () => {
    let called = 0;
    const llm = async () => { called++; return "###SCORE###50###SCORE###"; };
    assert.ok(Number.isNaN(await scoreCandidate("q", {}, llm)));
    assert.equal(called, 0);
  });
  it("FAIL-SOFT: LLM throws → NaN + onError fired", async () => {
    let errSeen = null;
    const llm = async () => { throw new Error("ollama timeout"); };
    const s = await scoreCandidate("q", { text: "d" }, llm, {
      onError: (e) => { errSeen = e; },
    });
    assert.ok(Number.isNaN(s));
    assert.match(errSeen.message, /ollama timeout/);
  });
  it("FAIL-SOFT: LLM returns garbage → NaN", async () => {
    const llm = async () => "I don't know how to rate this.";
    const s = await scoreCandidate("q", { text: "d" }, llm);
    assert.ok(Number.isNaN(s));
  });
  it("uses default model qwen2.5-coder:32b when opts.model omitted", async () => {
    let seenModel = null;
    const llm = async (_p, opts) => { seenModel = opts.model; return "###SCORE###50###SCORE###"; };
    await scoreCandidate("q", { text: "d" }, llm);
    assert.equal(seenModel, "qwen2.5-coder:32b");
  });
});

/* ---------- rerank (end-to-end) ---------- */

describe("rerank (end-to-end with DI llm)", () => {
  const candidates = [
    { id: "a", text: "Apple" },
    { id: "b", text: "Banana" },
    { id: "c", text: "Cherry" },
  ];

  it("happy path: sorts candidates by LLM score DESC", async () => {
    // LLM returns score = length of candidate text * 10 (deterministic)
    const llm = async (prompt) => {
      const m = prompt.match(/CANDIDATE:\s*\n([\s\S]+?)\nRelevance/);
      const cand = m ? m[1].trim() : "";
      const score = cand.length * 10;
      return `###SCORE###${score}###SCORE###`;
    };
    const r = await rerank("fruit", candidates, llm);
    assert.equal(r.usedLLM, true);
    assert.equal(r.scoredCount, 3);
    // Cherry(6*10=60) > Banana(6*10=60 — tie, kept stable) > Apple(5*10=50)
    assert.equal(r.ranked[r.ranked.length - 1].id, "a");
  });

  it("KILL-SWITCH: disabled returns input order, usedLLM=false", async () => {
    let llmCalled = 0;
    const llm = async () => { llmCalled++; return "###SCORE###99###SCORE###"; };
    const r = await rerank("q", candidates, llm, { disabled: true });
    assert.equal(r.usedLLM, false);
    assert.equal(llmCalled, 0);
    assert.equal(r.ranked.length, 3);
    assert.equal(r.ranked[0].id, "a"); // original order preserved
  });

  it("FAIL-SOFT: non-function llm → original order, usedLLM=false", async () => {
    const r = await rerank("q", candidates, null);
    assert.equal(r.usedLLM, false);
    assert.equal(r.ranked.length, 3);
    assert.equal(r.ranked[0].id, "a");
  });

  it("BOUNDARY: empty candidates → empty result, no LLM call", async () => {
    let called = 0;
    const r = await rerank("q", [], async () => { called++; return "###SCORE###50###SCORE###"; });
    assert.equal(r.usedLLM, false);
    assert.equal(r.scoredCount, 0);
    assert.equal(r.ranked.length, 0);
    assert.equal(called, 0);
  });

  it("BOUNDARY: single candidate → unchanged, no LLM call", async () => {
    let called = 0;
    const r = await rerank("q", [{ id: "x", text: "y" }], async () => { called++; return "###SCORE###50###SCORE###"; });
    assert.equal(r.usedLLM, false);
    assert.equal(called, 0);
    assert.equal(r.ranked[0].id, "x");
  });

  it("FAIL-SOFT partial: 1 of 3 LLM calls fails → NaN candidate sinks to end", async () => {
    const llm = async (prompt) => {
      if (prompt.includes("Banana")) throw new Error("transient");
      return "###SCORE###50###SCORE###";
    };
    const r = await rerank("fruit", candidates, llm);
    assert.equal(r.usedLLM, true);
    assert.equal(r.scoredCount, 2);
    // Banana (NaN) should be LAST; Apple + Cherry (50 each) come first in stable orig order
    assert.equal(r.ranked[r.ranked.length - 1].id, "b");
    assert.ok(Number.isNaN(r.ranked[r.ranked.length - 1].llmScore));
  });

  it("FAIL-SOFT total: ALL LLM calls throw → all NaN → input order preserved", async () => {
    const llm = async () => { throw new Error("ollama down"); };
    const r = await rerank("q", candidates, llm);
    assert.equal(r.scoredCount, 0);
    // All NaN — stable sort preserves orig idx → a, b, c
    assert.equal(r.ranked[0].id, "a");
    assert.equal(r.ranked[1].id, "b");
    assert.equal(r.ranked[2].id, "c");
  });

  it("ADVERSARIAL: oversized set (> maxK*2) → skips reranking", async () => {
    let called = 0;
    const llm = async () => { called++; return "###SCORE###50###SCORE###"; };
    const huge = new Array(100).fill(0).map((_, i) => ({ id: String(i), text: "x" }));
    const r = await rerank("q", huge, llm, { maxK: 20 });
    assert.equal(r.usedLLM, false);
    assert.equal(called, 0);
    assert.equal(r.ranked.length, 100); // unchanged
  });

  it("strips internal _origIdx field from output (no schema leak)", async () => {
    const r = await rerank("q", candidates, NOOP_LLM);
    for (const c of r.ranked) {
      assert.equal(c._origIdx, undefined);
    }
  });
});
