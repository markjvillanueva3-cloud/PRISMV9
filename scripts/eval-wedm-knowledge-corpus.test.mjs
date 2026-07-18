/**
 * Tests for the WEDM knowledge-corpus evaluator (eval-wedm-knowledge-corpus.mjs).
 * Pure-core only — no engine/build dependency. node:test.
 *   node --test scripts/eval-wedm-knowledge-corpus.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  salientTerms,
  instructionFollowingScore,
  groundingScore,
  reasoningProxyScore,
  blendKnowledgeScore,
  evaluateKnowledgePair,
} from "./eval-wedm-knowledge-corpus.mjs";

test("salientTerms — strips generic framing, keeps domain words + short codes", () => {
  const terms = salientTerms("As a Mitsubishi expert, explain the following G29 detail");
  assert.ok(terms.has("mitsubishi"), "keeps a length>=4 domain word");
  assert.ok(terms.has("g29"), "keeps a g-code short token");
  assert.ok(!terms.has("explain"), "drops framing word 'explain'");
  assert.ok(!terms.has("the"), "drops stopword 'the'");
  assert.ok(!terms.has("as"), "drops a 2-char non-code token");
});

test("instructionFollowingScore — full coverage=1, zero coverage=0, no demand=1", () => {
  assert.equal(instructionFollowingScore("taper recast", "", "taper and recast are controlled"), 1);
  assert.equal(instructionFollowingScore("taper recast", "", "nothing relevant here xyzzy"), 0);
  assert.equal(instructionFollowingScore("", "", "anything at all"), 1); // vacuous
});

test("instructionFollowingScore — partial coverage is the matched fraction", () => {
  // salient terms: {taper, recast}; output mentions only taper -> 1/2
  assert.equal(instructionFollowingScore("taper recast", "", "taper is set to zero"), 0.5);
});

test("groundingScore — counts distinct anchor categories, capped at 1", () => {
  // E-code + G-code + numeric+unit + wire + machine = 5 categories -> capped 1.0
  assert.equal(
    groundingScore("Use E1234 with G41 at 0.12 ipm on brass wire, Mitsubishi FA-10S"),
    1,
  );
  assert.equal(groundingScore("vague advice with no concrete specifics"), 0);
  // one category (G-code) only -> 1/4 target
  assert.equal(groundingScore("apply G41 then continue"), 0.25);
});

test("groundingScore — preposition 'in' is NOT a false unit anchor; decimal-inch IS", () => {
  // P1-1 regression: "in"/"us" as English words must not score numeric_unit.
  assert.equal(groundingScore("run 3 passes in the rough stage for us today"), 0);
  // genuine WEDM fractional-inch offset DOES count (h_register H42 + numeric_unit)
  assert.equal(groundingScore("set register H42 to 0.0085 in per pass"), 0.5);
  // spelled-out integer inch counts; bare integer "in" does not
  assert.equal(groundingScore("part is 4 inch thick"), 0.25);
});

test("reasoningProxyScore — empty=0, rich domain+justified text scores high; bounded 0..1", () => {
  assert.equal(reasoningProxyScore(""), 0);
  const rich =
    "The recast layer scales with pulse-on time because longer ton deposits more energy; " +
    "therefore run additional skim passes. Flush at the nozzle. Use the FA-10S tech table.";
  const s = reasoningProxyScore(rich);
  assert.ok(s > 0.5, "rich justified domain text scores > 0.5, got " + s);
  assert.ok(s <= 1, "bounded at 1");
});

test("blendKnowledgeScore — exact weighted blend (0.4/0.25/0.35)", () => {
  assert.equal(blendKnowledgeScore(1, 1, 1), 1);
  assert.equal(blendKnowledgeScore(1, 0, 0), 0.4);
  assert.equal(blendKnowledgeScore(0, 1, 0), 0.25);
  assert.equal(blendKnowledgeScore(0, 0, 1), 0.35);
  assert.equal(blendKnowledgeScore(0.5, 0.5, 0.5), 0.5);
});

test("evaluateKnowledgePair — injected reasoning, grounded+relevant answer PASSES", () => {
  const pair = {
    instruction: "taper recast",
    input: "",
    output: "taper and recast are controlled because of pulse-on; use E1234 G41 at 0.12 ipm brass FA-10S",
  };
  const r = evaluateKnowledgePair(pair, 0.8);
  assert.equal(r.instruction_following, 1);
  assert.equal(r.grounding, 1);
  assert.equal(r.reasoning, 0.8);
  assert.equal(r.knowledge_score, 0.93); // 0.4*1 + 0.25*1 + 0.35*0.8
  assert.equal(r.passed, true);
});

test("evaluateKnowledgePair — vague off-topic answer FAILS the 0.6 threshold", () => {
  const pair = { instruction: "explain dielectric conductivity control", input: "", output: "it depends" };
  const r = evaluateKnowledgePair(pair, 0.1);
  assert.equal(r.instruction_following, 0);
  assert.equal(r.grounding, 0);
  assert.equal(r.knowledge_score, 0.035); // 0.35*0.1
  assert.equal(r.passed, false);
});

test("evaluateKnowledgePair — no injected reasoning falls back to proxy (numeric 0..1)", () => {
  const pair = { instruction: "skim pass", input: "", output: "run skim passes because recast shrinks; flush nozzle" };
  const r = evaluateKnowledgePair(pair); // reasoning omitted -> proxy
  assert.equal(typeof r.reasoning, "number");
  assert.ok(r.reasoning >= 0 && r.reasoning <= 1, "proxy reasoning bounded");
  assert.ok(r.knowledge_score >= 0 && r.knowledge_score <= 1, "blend bounded");
});
