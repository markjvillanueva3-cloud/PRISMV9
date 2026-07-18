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

const { isCriticalFile, composePrompt, hashPrompt, tryRecall, enqueueBackground, voterCount } =
  await import("./auto-consensus-critical-edit.mjs");

const { spawnSync } = await import("node:child_process");
const { fileURLToPath } = await import("node:url");
const HOOK_PATH = fileURLToPath(new URL("./auto-consensus-critical-edit.mjs", import.meta.url));

// Drive the hook end-to-end: stdin JSON in, parsed stdout decision out. Hermetic via
// the same temp QUEUE/WIKI env the suite already set.
function runHook(stdinObj) {
  const r = spawnSync(process.execPath, [HOOK_PATH], {
    input: JSON.stringify(stdinObj),
    env: { ...process.env, PRISM_CONSENSUS_QUEUE: QUEUE, PRISM_WIKI_ROOT: WIKI },
    encoding: "utf8",
  });
  const out = JSON.parse(r.stdout.trim().split("\n").pop());
  return out.hookSpecificOutput ?? out;
}

function writeConsensusCache(prompt, frontmatter) {
  const sha8 = hashPrompt(prompt).slice(0, 8);
  fs.writeFileSync(path.join(WIKI, "consensus", `${sha8}.md`), `---\n${frontmatter}\n---\nbody`);
  return sha8;
}

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

// -- voterCount: distinct-voice counting for the consensus quorum gate ----------
test("voterCount: parses a JSON voter list, fails soft to 0 on junk/empty", () => {
  assert.equal(voterCount('["qwen2.5-coder:32b","gpt-oss:20b"]'), 2);
  assert.equal(voterCount('["qwen2.5-coder:32b"]'), 1); // the single-voter degraded case
  assert.equal(voterCount("[]"), 0);
  assert.equal(voterCount(""), 0);
  assert.equal(voterCount(undefined), 0);
  assert.equal(voterCount("not-json-garbage"), 0);
  assert.equal(voterCount(["a", "b", "c"]), 3); // already an array
  // fail-soft bracket fallback when JSON.parse trips (e.g. unquoted tokens)
  assert.equal(voterCount("[claude, ollama]"), 2);
});

// -- main() quorum gate: single-voice run is NOT trusted as a consensus ----------
const CRIT_FILE = "H:/prism/mcp-server/src/tools/dispatchers/cadDispatcher.ts";
const critEdit = { tool_name: "Edit", tool_input: { file_path: CRIT_FILE, old_string: "const a = 1;", new_string: "const a = 2;" } };

test("main(): a SINGLE-VOICE accept run is NOT surfaced as consensus -> degraded notice + re-queue", () => {
  const prompt = composePrompt("Edit", critEdit.tool_input);
  writeConsensusCache(prompt, "recommendation: accept\nagreement_score: 1\nmodel_voters: [\"qwen2.5-coder:32b\"]\nmean_factuality: null");
  const before = fs.existsSync(QUEUE) ? fs.readFileSync(QUEUE, "utf8") : "";
  const out = runHook(critEdit);
  assert.equal(out.permissionDecision, "allow"); // never blocks
  assert.match(out.permissionDecisionReason, /NOT a real consensus/);
  assert.doesNotMatch(out.permissionDecisionReason, /✅/); // must NOT claim an authoritative consensus
  const after = fs.readFileSync(QUEUE, "utf8");
  assert.ok(after.length > before.length, "degraded single-voice hit must re-queue a proper fan-out");
});

test("main(): a 2-VOICE accept run IS surfaced as an authoritative consensus", () => {
  const edit2 = { tool_name: "Edit", tool_input: { file_path: CRIT_FILE, old_string: "x", new_string: "y" } };
  const prompt = composePrompt("Edit", edit2.tool_input);
  writeConsensusCache(prompt, 'recommendation: accept\nagreement_score: 0.85\nmodel_voters: ["qwen2.5-coder:32b","gpt-oss:20b"]\nmean_factuality: 0.9');
  const out = runHook(edit2);
  assert.equal(out.permissionDecision, "allow");
  assert.match(out.permissionDecisionReason, /✅/);
  assert.match(out.permissionDecisionReason, /voters=2/);
});

test("main(): a SINGLE-VOICE escalate still forces ask (extra scrutiny is safe-direction)", () => {
  const edit3 = { tool_name: "Edit", tool_input: { file_path: CRIT_FILE, old_string: "p", new_string: "q" } };
  const prompt = composePrompt("Edit", edit3.tool_input);
  writeConsensusCache(prompt, 'recommendation: escalate\nagreement_score: 1\nmodel_voters: ["qwen2.5-coder:32b"]\nmean_factuality: null');
  const out = runHook(edit3);
  assert.equal(out.permissionDecision, "ask"); // escalate ignores the quorum floor -> conservative
});
