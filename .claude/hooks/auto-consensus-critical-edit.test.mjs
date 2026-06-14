// tier: T1
// Tests for .claude/hooks/auto-consensus-critical-edit.mjs
// (INTEL-OLLAMA-OBSIDIAN-MS0/LAYER-3-AUTO-FIRE; wired + tested 2026-06-10, slot:bravo).
//
// node:test -- hermetic: the hook's QUEUE/WIKI roots are redirected to a temp dir via
// env set BEFORE import (the module reads them at load time), so no real queue/wiki is
// touched. The exported pure functions drive the hook's allow/ask/enqueue decision.
//
// Run: node --test H:/prism/.claude/hooks/auto-consensus-critical-edit.test.mjs

import { test, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ace-consensus-"));
const QUEUE = path.join(TMP, "queue.jsonl");
const WIKI = path.join(TMP, "wiki");
fs.mkdirSync(path.join(WIKI, "consensus"), { recursive: true });
process.env.PRISM_CONSENSUS_QUEUE = QUEUE;
process.env.PRISM_WIKI_ROOT = WIKI;

const { isCriticalFile, composePrompt, hashPrompt, tryRecall, enqueueBackground } =
  await import("./auto-consensus-critical-edit.mjs");

after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best-effort */ } });

test("isCriticalFile: flags physics/dispatcher/safety/tolerance/force/omega; NOT ordinary files", () => {
  // critical (must get extra consensus scrutiny)
  assert.equal(isCriticalFile("mcp-server/src/physics/constants.ts"), true);
  assert.equal(isCriticalFile("H:/prism/mcp-server/src/tools/dispatchers/calcDispatcher.ts"), true);
  assert.equal(isCriticalFile("mcp-server/src/engines/SafetyValidationEngine.ts"), true);
  assert.equal(isCriticalFile("mcp-server/src/engines/ToleranceStackEngine.ts"), true);
  assert.equal(isCriticalFile("mcp-server/src/engines/CuttingForceEngine.ts"), true);
  // regression lock: keyword-at-START files (the dominant <Keyword>Engine.ts naming) -- the
  // old `.+Keyword.+` patterns MISSED these (false-negative); `.*Keyword.*` catches them.
  assert.equal(isCriticalFile("mcp-server/src/engines/SafetyEngine.ts"), true);
  assert.equal(isCriticalFile("mcp-server/src/engines/ThermalEngine.ts"), true);
  assert.equal(isCriticalFile("mcp-server/src/engines/DeflectionEngine.ts"), true);
  assert.equal(isCriticalFile("mcp-server/src/engines/ValidatorEngine.ts"), true);
  assert.equal(isCriticalFile("mcp-server/src/engines/KienzleForceModel.ts"), true);
  assert.equal(isCriticalFile("H:/prism/state/shared/omega-thresholds.json"), true); // real absolute file_path
  assert.equal(isCriticalFile("C:\\Users\\x\\mcp-server\\src\\physics\\constants.ts"), true); // real Windows backslash path normalized
  // NOT critical
  assert.equal(isCriticalFile("mcp-server/src/engines/FooEngine.ts"), false);
  assert.equal(isCriticalFile("README.md"), false);
  assert.equal(isCriticalFile(""), false);
  assert.equal(isCriticalFile(null), false);
});

test("composePrompt + hashPrompt: stable for the same (file,old,new) tuple; whitespace-normalized", () => {
  const a = composePrompt("Edit", { file_path: "x/physics/constants.ts", old_string: "kc=1800", new_string: "kc=1900" });
  const b = composePrompt("Edit", { file_path: "x/physics/constants.ts", old_string: "kc=1800", new_string: "kc=1900" });
  assert.equal(a, b);                          // deterministic -> same cache key for a re-attempt
  assert.match(a, /constants\.ts/);
  assert.match(a, /kc=1800/);
  assert.match(a, /kc=1900/);
  const h1 = hashPrompt(a);
  assert.equal(h1.length, 64);                 // sha256 hex
  // whitespace differences collapse to the same hash (normalized)
  assert.equal(hashPrompt("a   b\n\nc"), hashPrompt("a b c"));
  // a different edit yields a different hash (cache key actually discriminates)
  assert.notEqual(h1, hashPrompt(composePrompt("Edit", { file_path: "x/physics/constants.ts", old_string: "kc=1800", new_string: "kc=2000" })));
});

test("enqueueBackground: appends a real auto-critical-edit entry the drain can consume", () => {
  const prompt = composePrompt("Edit", { file_path: "x/physics/constants.ts", old_string: "a", new_string: "b" });
  const ok = enqueueBackground(prompt, "x/physics/constants.ts", "Edit");
  assert.equal(ok, true);
  const lines = fs.readFileSync(QUEUE, "utf8").trim().split("\n").filter(Boolean);
  const last = JSON.parse(lines[lines.length - 1]);
  assert.equal(last.task_type, "auto-critical-edit"); // the drain logs/dispatches by task_type
  assert.equal(last.file, "x/physics/constants.ts");
  assert.equal(last.tool, "Edit");
  assert.equal(last.prompt_hash.length, 64);
});

test("tryRecall: cache MISS returns null; cache HIT with recommendation=escalate is detected", () => {
  const fresh = composePrompt("Edit", { file_path: "x/physics/constants.ts", old_string: "never", new_string: "seen" });
  assert.equal(tryRecall(fresh), null);          // no wiki/consensus/<sha8>.md -> miss

  const flagged = composePrompt("Edit", { file_path: "x/physics/constants.ts", old_string: "dangerous", new_string: "edit" });
  const sha8 = hashPrompt(flagged).slice(0, 8);
  fs.writeFileSync(
    path.join(WIKI, "consensus", `${sha8}.md`),
    "---\nrecommendation: escalate\nagreement_score: 0.92\nmodel_voters: [claude,ollama]\nmean_factuality: 0.88\n---\nbody",
  );
  const hit = tryRecall(flagged);
  assert.notEqual(hit, null);
  assert.equal(hit.recommendation, "escalate");  // -> main() returns permissionDecision "ask"
  assert.equal(hit.agreement, "0.92");
});

test("tryRecall: a cache entry older than the TTL is treated as a miss", () => {
  const stale = composePrompt("Edit", { file_path: "x/physics/constants.ts", old_string: "old", new_string: "ttl" });
  const sha8 = hashPrompt(stale).slice(0, 8);
  const p = path.join(WIKI, "consensus", `${sha8}.md`);
  fs.writeFileSync(p, "---\nrecommendation: accept\n---\nbody");
  const eightDaysMs = 8 * 24 * 60 * 60 * 1000;
  const past = new Date(Date.now() - eightDaysMs);
  fs.utimesSync(p, past, past);                  // backdate mtime past the 7-day TTL
  assert.equal(tryRecall(stale), null);          // expired -> miss (re-consensus, never trust stale)
});
