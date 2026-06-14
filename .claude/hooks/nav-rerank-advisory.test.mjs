// nav-rerank-advisory.test.mjs -- hermetic tests for the PreToolUse:Bash advisory
// that surfaces the verified ollama nav re-rank when a system-viz find runs.
// R9: assert the parsed query + advise decision concretely, never toBeDefined-style.

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFindCommand, decideNavAdvisory, HOOK_KEY } from "./nav-rerank-advisory.mjs";

// ---- parseFindCommand ----

test("parses a plain find with a single-word query, strips --json", () => {
  const r = parseFindCommand("node scripts/system-viz-query.mjs find mill --json");
  assert.deepEqual(r, { isFind: true, query: "mill" });
});

test("parses a multi-word query", () => {
  const r = parseFindCommand("node scripts/system-viz-query.mjs find speed feed calc");
  assert.equal(r.isFind, true);
  assert.equal(r.query, "speed feed calc");
});

test("strips surrounding quotes from a quoted query", () => {
  const r = parseFindCommand('node scripts/system-viz-query.mjs find "wire edm"');
  assert.equal(r.isFind, true);
  assert.equal(r.query, "wire edm");
});

test("strips multiple flags (--brain-only --json)", () => {
  const r = parseFindCommand("node scripts/system-viz-query.mjs find mill --brain-only --json");
  assert.deepEqual(r, { isFind: true, query: "mill" });
});

test("matches through an rtk wrapper prefix", () => {
  const r = parseFindCommand("rtk node scripts/system-viz-query.mjs find lathe");
  assert.deepEqual(r, { isFind: true, query: "lathe" });
});

test("matches the bare `system-viz find` form at the segment start", () => {
  const r = parseFindCommand("system-viz find toolpath");
  assert.deepEqual(r, { isFind: true, query: "toolpath" });
});

// --- P2 hardening (2026-06-10): anchor so a MENTION never fires; cut at shell operators ---

test("does NOT match `system-viz find` mid-string without the -query script name (mention)", () => {
  // `node x system-viz find toolpath` -- system-viz not at segment start AND not the
  // real `system-viz-query` script => indistinguishable from a mention => no advise.
  const r = parseFindCommand("node x system-viz find toolpath");
  assert.equal(r.isFind, false);
  assert.equal(r.reason, "not-a-find");
});

test("does NOT match a quoted/echoed mention of system-viz find", () => {
  const r = parseFindCommand('echo "run system-viz find later"');
  assert.equal(r.isFind, false);
  assert.equal(r.reason, "not-a-find");
});

test("does NOT match a grep that merely contains the words", () => {
  const r = parseFindCommand("grep -r system-viz find src/");
  assert.equal(r.isFind, false);
  assert.equal(r.reason, "not-a-find");
});

test("redirect tail does NOT pollute the query (cut at the > operator)", () => {
  const r = parseFindCommand("node scripts/system-viz-query.mjs find mill > out.txt");
  assert.deepEqual(r, { isFind: true, query: "mill" });
});

test("piped tail does NOT pollute the query (cut at the | operator)", () => {
  const r = parseFindCommand("node scripts/system-viz-query.mjs find lathe | head");
  assert.deepEqual(r, { isFind: true, query: "lathe" });
});

test("does NOT match a non-find subcommand (node-card)", () => {
  const r = parseFindCommand("node scripts/system-viz-query.mjs node-card eng.mill");
  assert.equal(r.isFind, false);
  assert.equal(r.reason, "not-a-find");
});

test("self-trigger guard: does NOT match the re-rank CLI itself", () => {
  const r = parseFindCommand('node scripts/ollama-nav-rerank.mjs "mill" --top-k 5');
  assert.equal(r.isFind, false);
  assert.equal(r.reason, "already-rerank");
});

test("does NOT match an unrelated bash command", () => {
  const r = parseFindCommand("git status");
  assert.equal(r.isFind, false);
});

test("find with only flags (no query) -> empty-query", () => {
  const r = parseFindCommand("node scripts/system-viz-query.mjs find --json");
  assert.equal(r.isFind, false);
  assert.equal(r.reason, "empty-query");
});

test("empty / non-string command -> no-command", () => {
  assert.equal(parseFindCommand("").isFind, false);
  assert.equal(parseFindCommand(null).isFind, false);
  assert.equal(parseFindCommand(42).reason, "no-command");
});

// ---- decideNavAdvisory ----

test("advises on a find, suggestion cites the re-rank CLI and the query", () => {
  const d = decideNavAdvisory({ command: "node scripts/system-viz-query.mjs find mill --json" });
  assert.equal(d.advise, true);
  assert.equal(d.query, "mill");
  assert.match(d.suggestion, /ollama-nav-rerank\.mjs/);
  assert.match(d.suggestion, /"mill"/);
});

test("suggestion explains the verifier (node-card resolvability)", () => {
  const d = decideNavAdvisory({ command: "node scripts/system-viz-query.mjs find lathe" });
  assert.match(d.suggestion, /node-card/);
  assert.match(d.suggestion, /verif/i);
});

test("does NOT advise on a non-find command (reason passes through)", () => {
  const d = decideNavAdvisory({ command: "node scripts/system-viz-query.mjs node-card eng.mill" });
  assert.equal(d.advise, false);
  assert.equal(d.reason, "not-a-find");
});

test("does NOT advise on the re-rank CLI itself (no self-suggest loop)", () => {
  const d = decideNavAdvisory({ command: "node scripts/ollama-nav-rerank.mjs mill" });
  assert.equal(d.advise, false);
  assert.equal(d.reason, "already-rerank");
});

test("HOOK_KEY is the offload-stats key", () => {
  assert.equal(HOOK_KEY, "nav-rerank-advisory");
});

// === U-NAV-RERANK-DECAY-WIRE (2026-06-10): advisory-decay gate (representative twin clone) ===
// Subprocess test of the impure gate. The same decayDecision pattern is proven with
// dedicated tests in large-read-digest (3-of-3 PASS) + grep-index-first; this confirms
// the byte-identical clone behaves in a Bash-hook sibling. PRISM_NAV_RERANK_STATS_PATH
// points bump+decay at the fixture (read==write). No rate-limiter in this hook, so no
// TEMP isolation needed.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const NAV_HOOK = fileURLToPath(new URL("./nav-rerank-advisory.mjs", import.meta.url));

function runNavHook(command, seedSlot) {
  const dir = mkdtempSync(join(tmpdir(), "nav-decay-"));
  try {
    const stats = join(dir, "stats.json");
    writeFileSync(stats, JSON.stringify({ schemaVersion: "2.0.0", byHook: { "nav-rerank-advisory": seedSlot } }, null, 2));
    const out = execFileSync(process.execPath, [NAV_HOOK], {
      input: JSON.stringify({ tool_name: "Bash", tool_input: { command } }),
      env: { ...process.env, PRISM_NAV_RERANK_STATS_PATH: stats, PRISM_ADVISORY_DECAY_DISABLE: "" },
      encoding: "utf8",
    });
    return JSON.parse(out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("decay-gate: PROVEN-NOISE (>=50 injections, off-probe) MUTES the nav advisory", () => {
  // seed 52 -> bumpStats -> 53; 53 % 20 != 0 -> muted.
  const res = runNavHook("node scripts/system-viz-query.mjs find mill", { fired: 52, suggested: 52, offloaded: 0 });
  assert.equal(res.continue, true);
  assert.ok(
    !res.hookSpecificOutput || !res.hookSpecificOutput.additionalContext,
    "a proven-noise nav advisory must be muted (no additionalContext)",
  );
});

test("decay-gate: INSUFFICIENT telemetry (<50) still FIRES (fail-safe)", () => {
  const res = runNavHook("node scripts/system-viz-query.mjs find mill", { fired: 5, suggested: 5, offloaded: 0 });
  assert.equal(res.continue, true);
  assert.ok(
    res.hookSpecificOutput && res.hookSpecificOutput.additionalContext &&
      res.hookSpecificOutput.additionalContext.includes("ollama-nav-rerank"),
    "with insufficient telemetry the nav advisory must still fire",
  );
});
