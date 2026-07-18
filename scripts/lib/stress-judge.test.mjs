// scripts/lib/stress-judge.test.mjs
//
// LLM-as-judge metric for the generative stress battery. The PARSE is the safety-critical pure part
// (a misparse silently inverts a verdict), so it gets adversarial coverage; judgeFactCapture is
// exercised via an injected callFn (no network).

import test from "node:test";
import assert from "node:assert/strict";
import { parseJudgeVerdict, renderFacts, buildJudgePrompt, judgeFactCapture } from "./stress-judge.mjs";

test("parseJudgeVerdict: bare PASS / FAIL", () => {
  assert.equal(parseJudgeVerdict("PASS"), true);
  assert.equal(parseJudgeVerdict("FAIL"), false);
  assert.equal(parseJudgeVerdict("pass"), true); // case-insensitive
});

test("parseJudgeVerdict: the LAST verdict wins (model reasons then concludes)", () => {
  assert.equal(parseJudgeVerdict("It might FAIL, but on reflection it captures all facts. PASS"), true);
  assert.equal(parseJudgeVerdict("Looks like it could PASS... no, it omits fact 4. FAIL"), false);
});

test("parseJudgeVerdict: no verdict token -> false (fail-safe, never a vacuous pass)", () => {
  assert.equal(parseJudgeVerdict(""), false);
  assert.equal(parseJudgeVerdict("maybe, hard to say"), false);
  assert.equal(parseJudgeVerdict(undefined), false);
  assert.equal(parseJudgeVerdict(42), false);
});

test("parseJudgeVerdict: word-boundary -- 'passport'/'failure' are NOT verdict tokens", () => {
  assert.equal(parseJudgeVerdict("the passport office"), false); // no standalone PASS
  assert.equal(parseJudgeVerdict("this is a failure of nothing. PASS"), true); // 'failure' ignored, PASS wins
});

test("renderFacts: numbers each group + lists synonyms with slashes", () => {
  const out = renderFacts([["deflection"], ["independent", "not depend"], ["fz", "feed"]]);
  assert.match(out, /1\. deflection/);
  assert.match(out, /2\. independent \/ not depend/);
  assert.match(out, /3\. fz \/ feed/);
});

test("renderFacts: empty / invalid -> placeholder (no crash)", () => {
  assert.equal(renderFacts([]), "(no required facts)");
  assert.equal(renderFacts(undefined), "(no required facts)");
});

test("buildJudgePrompt: embeds the output + the rendered facts + asks for PASS/FAIL", () => {
  const p = buildJudgePrompt("the cut had zero scrap", [["scrap", "no scrap"]]);
  assert.match(p, /zero scrap/);
  assert.match(p, /1\. scrap \/ no scrap/);
  assert.match(p, /PASS or FAIL/);
});

test("judgeFactCapture: PASS verdict from injected judge -> true", async () => {
  const callFn = async () => "all facts present. PASS";
  assert.equal(await judgeFactCapture("anything", [["x"]], { callFn }), true);
});

test("judgeFactCapture: FAIL verdict -> false", async () => {
  const callFn = async () => "misses fact 1. FAIL";
  assert.equal(await judgeFactCapture("anything", [["x"]], { callFn }), false);
});

test("judgeFactCapture: injected judge that THROWS -> null ABSTAIN (NOT a subject FAIL)", async () => {
  const callFn = async () => { throw new Error("judge timeout"); };
  assert.equal(await judgeFactCapture("anything", [["x"]], { callFn }), null);
});

test("judgeFactCapture: judge reply with NO PASS/FAIL token -> null ABSTAIN (not a vacuous fail)", async () => {
  const callFn = async () => "hmm, hard to say, it is partially there";
  assert.equal(await judgeFactCapture("anything", [["x"]], { callFn }), null);
});

test("judgeFactCapture: a REAL FAIL verdict is still false (distinct from abstain)", async () => {
  const callFn = async () => "it omits fact 2. FAIL";
  assert.equal(await judgeFactCapture("anything", [["x"]], { callFn }), false);
});

test("judgeFactCapture: callFn returning {text} object is parsed", async () => {
  const callFn = async () => ({ text: "yes -> PASS" });
  assert.equal(await judgeFactCapture("anything", [["x"]], { callFn }), true);
});

test("judgeFactCapture: the judge actually SEES the output in the prompt (semantic grading basis)", async () => {
  let seenPrompt = "";
  const callFn = async (_m, prompt) => { seenPrompt = prompt; return "PASS"; };
  await judgeFactCapture("UNIQUE_MARKER_TEXT_123", [["fact"]], { callFn });
  assert.match(seenPrompt, /UNIQUE_MARKER_TEXT_123/);
  assert.match(seenPrompt, /1\. fact/);
});
