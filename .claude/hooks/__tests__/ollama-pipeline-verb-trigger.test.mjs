// TOKEN-SAVINGS-PIVOT/U-PSN-OLLAMA-VERB-TRIGGER (iter4, 2026-05-23, slot:alpha)
// Tests for the verb-keyword fallback added to ollama-pipeline-injector.mjs.
// Closes the gap where bare-prose offload-eligible prompts ("summarize this
// file", "explain how X works") got no Ollama nudge because only slash-
// commands triggered the injector.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  matchVerbTrigger,
  matchPipelineTrigger,
} from "../ollama-pipeline-injector.mjs";

// --- happy paths: 7 spanning verb categories (variability floor) ---

test("matchVerbTrigger: 'summarize this file' → verb-summarize", () => {
  assert.equal(matchVerbTrigger("can you summarize this file for me"), "verb-summarize");
});

test("matchVerbTrigger: 'explain how this code works' → verb-explain", () => {
  assert.equal(matchVerbTrigger("explain how this code works"), "verb-explain");
});

test("matchVerbTrigger: 'walk me through the function' → verb-explain", () => {
  assert.equal(matchVerbTrigger("walk me through the function"), "verb-explain");
});

test("matchVerbTrigger: 'classify these items' → verb-classify", () => {
  assert.equal(matchVerbTrigger("classify these items by type"), "verb-classify");
});

test("matchVerbTrigger: 'add a docstring' → verb-docstring", () => {
  assert.equal(matchVerbTrigger("add a docstring to this function"), "verb-docstring");
  assert.equal(matchVerbTrigger("write jsdoc for this"), "verb-docstring");
});

test("matchVerbTrigger: 'lint check this' → verb-lint", () => {
  assert.equal(matchVerbTrigger("lint check this file"), "verb-lint");
});

test("matchVerbTrigger: 'summarize the diff' → verb-diff-summary (NOT verb-summarize)", () => {
  // Order matters — diff-summary precedes generic summarize in VERB_TRIGGERS.
  // If this regresses, summarize the diff would match summarize first and
  // miss the more-specific diff-summary route.
  assert.equal(matchVerbTrigger("summarize the diff"), "verb-diff-summary");
  assert.equal(matchVerbTrigger("summarize the changes"), "verb-diff-summary");
  assert.equal(matchVerbTrigger("summarize the commit"), "verb-diff-summary");
});

test("matchVerbTrigger: 'why is this failing' → verb-error-triage", () => {
  assert.equal(matchVerbTrigger("why is this failing"), "verb-error-triage");
  assert.equal(matchVerbTrigger("what's wrong with this code"), "verb-error-triage");
  assert.equal(matchVerbTrigger("triage these errors"), "verb-error-triage");
});

// --- specificity ordering (R7 — never silent-merge ambiguous matches) ---

test("matchVerbTrigger: diff-summary precedes summarize (specific > general)", () => {
  // Without the ordering, "summarize the diff" would match verb-summarize
  // first (broader pattern) and the operator would get the wrong route hint.
  const m = matchVerbTrigger("please summarize the diff of this PR");
  assert.equal(m, "verb-diff-summary",
    "specific diff-summary regex MUST win over generic summarize — order in VERB_TRIGGERS load-bearing");
});

// --- failure modes (≥3 per build-enforce floor) ---

test("matchVerbTrigger: empty string returns null", () => {
  assert.equal(matchVerbTrigger(""), null);
});

test("matchVerbTrigger: null/undefined returns null", () => {
  assert.equal(matchVerbTrigger(null), null);
  assert.equal(matchVerbTrigger(undefined), null);
});

test("matchVerbTrigger: non-string returns null", () => {
  assert.equal(matchVerbTrigger(42), null);
  assert.equal(matchVerbTrigger({}), null);
  assert.equal(matchVerbTrigger([]), null);
});

test("matchVerbTrigger: prompt with no offload verbs returns null", () => {
  assert.equal(matchVerbTrigger("build a new engine"), null);
  assert.equal(matchVerbTrigger("write a test for this"), null);
  assert.equal(matchVerbTrigger("commit and push"), null);
});

// --- adversarial inputs (≥2 per build-enforce floor) ---

test("matchVerbTrigger: prompt with the word 'explain' but no target → no match (no over-fire)", () => {
  // Plain "explain" without "this/that/the X" context shouldn't fire — avoids
  // over-triggering on prompts like "let me explain my reasoning".
  assert.equal(matchVerbTrigger("let me explain my reasoning"), null);
});

test("matchVerbTrigger: very long prompt with no verb match returns null in bounded time", () => {
  const longPrompt = "a".repeat(5000) + " build feature X";
  const start = Date.now();
  const result = matchVerbTrigger(longPrompt);
  const elapsed = Date.now() - start;
  assert.equal(result, null);
  assert.ok(elapsed < 100, `regex eval should be <100ms even on 5KB input, got ${elapsed}ms`);
});

test("matchVerbTrigger: prompt with bracket/markup noise still matches", () => {
  assert.equal(matchVerbTrigger("[SCOPED] summarize this file"), "verb-summarize");
});

// --- pipeline trigger pure-function check (regression guard) ---

test("matchPipelineTrigger: /forge-audit → forge-audit", () => {
  assert.equal(matchPipelineTrigger("/forge-audit"), "forge-audit");
});

test("matchPipelineTrigger: /rgs → rgs", () => {
  assert.equal(matchPipelineTrigger("/rgs build a new milestone"), "rgs");
});

test("matchPipelineTrigger: bare verb-prompt returns null (verb fallback's job)", () => {
  assert.equal(matchPipelineTrigger("summarize this file"), null);
});

test("matchPipelineTrigger: null returns null (defensive)", () => {
  assert.equal(matchPipelineTrigger(null), null);
  assert.equal(matchPipelineTrigger(undefined), null);
});

// --- precedence: pipeline always wins over verb when both could match ---

test("precedence: a prompt with BOTH /forge-audit AND 'summarize this file' takes pipeline route", () => {
  // The main() flow runs matchPipelineTrigger first, then matchVerbTrigger
  // only if pipeline didn't match. Verifying both functions individually here;
  // integration verified by inspection of main() in ollama-pipeline-injector.mjs.
  const prompt = "/forge-audit and also summarize this file";
  assert.equal(matchPipelineTrigger(prompt), "forge-audit", "pipeline must match first");
  assert.equal(matchVerbTrigger(prompt), "verb-summarize", "verb would also match, but pipeline wins by main() ordering");
});

// --- case insensitivity ---

test("matchVerbTrigger: case-insensitive (Summarize / SUMMARIZE)", () => {
  assert.equal(matchVerbTrigger("Summarize this file"), "verb-summarize");
  assert.equal(matchVerbTrigger("SUMMARIZE THIS FILE"), "verb-summarize");
});

test("matchVerbTrigger: en-US vs en-GB spellings ('summarise' too)", () => {
  // Doctrine accepts both spellings — operators from either side shouldn't
  // get a different experience.
  assert.equal(matchVerbTrigger("summarise this file"), "verb-summarize");
  assert.equal(matchVerbTrigger("classification of these items"), "verb-classify");
});
