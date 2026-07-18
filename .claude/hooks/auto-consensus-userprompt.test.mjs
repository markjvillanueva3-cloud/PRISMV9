// tier: T2
// Tests for .claude/hooks/auto-consensus-userprompt.mjs
// (INTEL-OLLAMA-OBSIDIAN-MS0/LAYER-3-AUTO-FIRE; wired-but-untested -> covered 2026-06-10, slot:bravo).
//
// node:test -- hermetic: QUEUE/WIKI roots + the MAX_QUEUE cap are redirected to a temp
// dir via env set BEFORE import (the module reads them at load time). No real queue/wiki
// touched. The MAX_QUEUE cap is the highest-value path: this hook fires on EVERY prompt
// fleet-wide and bounds consensus-queue.jsonl (unbounded growth was a real past incident).
//
// Run: node --test H:/prism/.claude/hooks/auto-consensus-userprompt.test.mjs

import { test, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "acu-consensus-"));
const QUEUE = path.join(TMP, "queue.jsonl");
const WIKI = path.join(TMP, "wiki");
fs.mkdirSync(path.join(WIKI, "consensus"), { recursive: true });
process.env.PRISM_CONSENSUS_QUEUE = QUEUE;
process.env.PRISM_WIKI_ROOT = WIKI;
process.env.PRISM_CONSENSUS_QUEUE_MAX = "5"; // small cap so the bound is cheap to exercise

const { detectIntent, isOptOut, hashPrompt, tryRecall, enqueueForBackground, extractAnswer } =
  await import("./auto-consensus-userprompt.mjs");

after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best-effort */ } });

test("detectIntent: dev-intent keywords match; plain prose does not", () => {
  for (const p of ["build a new engine", "should I refactor this", "review the diff", "fix the bug", "plan the roadmap", "how do I wire it"]) {
    assert.equal(detectIntent(p), true, `expected intent in: ${p}`);
  }
  assert.equal(detectIntent("the cat sat on the mat quietly"), false);
  assert.equal(detectIntent("good morning everyone here"), false);
});

test("isOptOut: explicit opt-out tokens short-circuit the hook", () => {
  assert.equal(isOptOut("build it [no-consensus]"), true);
  assert.equal(isOptOut("plan this [skip-consensus] please"), true);
  assert.equal(isOptOut("[trivial] rename a var"), true);
  assert.equal(isOptOut("build it normally"), false);
});

test("hashPrompt: deterministic, whitespace-normalized, and discriminating", () => {
  assert.equal(hashPrompt("build the X").length, 64);
  assert.equal(hashPrompt("build   the\n\nX"), hashPrompt("build the X")); // normalized
  assert.notEqual(hashPrompt("build the X"), hashPrompt("build the Y"));   // discriminates
});

test("enqueueForBackground: appends an auto-userprompt entry the drain consumes", () => {
  const ok = enqueueForBackground("build the thing", "sess-123");
  assert.equal(ok, true);
  const lines = fs.readFileSync(QUEUE, "utf8").trim().split("\n").filter(Boolean);
  const last = JSON.parse(lines[lines.length - 1]);
  assert.equal(last.task_type, "auto-userprompt");
  assert.equal(last.session_id, "sess-123");
  assert.equal(last.prompt_hash.length, 64);
});

test("enqueueForBackground: BOUNDS the queue at MAX_QUEUE (fleet-wide unbounded-growth guard)", () => {
  // seed exactly MAX_QUEUE(5) stale lines, then enqueue one more
  const seed = Array.from({ length: 5 }, (_, i) => JSON.stringify({ ts: "t", prompt_hash: "old" + i, task_type: "auto-userprompt" }));
  fs.writeFileSync(QUEUE, seed.join("\n") + "\n", "utf8");
  const ok = enqueueForBackground("a fresh capped prompt", "sess-cap");
  assert.equal(ok, true);
  const lines = fs.readFileSync(QUEUE, "utf8").trim().split("\n").filter(Boolean);
  assert.equal(lines.length, 5);                       // capped, did NOT grow to 6
  const last = JSON.parse(lines[lines.length - 1]);
  assert.equal(last.session_id, "sess-cap");           // newest entry kept
  assert.equal(JSON.parse(lines[0]).prompt_hash, "old1"); // oldest (old0) evicted, old1 is now first
});

test("tryRecall: miss -> null; accept-cache hit returns recommendation + extracted answer; TTL -> miss", () => {
  assert.equal(tryRecall("never seen this prompt before now"), null);

  const prompt = "should I use trochoidal milling for the pocket";
  const sha8 = hashPrompt(prompt).slice(0, 8);
  const body = [
    "---", "recommendation: accept", "agreement_score: 0.9",
    "model_voters: [claude,ollama]", "mean_factuality: 0.85", "---",
    "## Consensus answer", "", "```", "Yes -- trochoidal keeps radial engagement constant.", "```", "",
  ].join("\n");
  const p = path.join(WIKI, "consensus", `${sha8}.md`);
  fs.writeFileSync(p, body);
  const hit = tryRecall(prompt);
  assert.notEqual(hit, null);
  assert.equal(hit.recommendation, "accept");
  assert.match(hit.answer, /trochoidal keeps radial engagement/);
  assert.equal(extractAnswer(body), "Yes -- trochoidal keeps radial engagement constant.");

  // backdate past the 7-day TTL -> treated as a miss (never serve stale consensus)
  const past = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  fs.utimesSync(p, past, past);
  assert.equal(tryRecall(prompt), null);
});
