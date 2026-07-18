/**
 * prompt-rewriter-throttle.test.mjs -- behavioral oracle for the same-prompt
 * throttle added to prompt-rewriter-ollama.mjs (slot:alpha 2026-06-11).
 *
 * A /loop re-submits the IDENTICAL prompt every tick; without a throttle the
 * rewriter re-runs a ~5s Ollama inference + re-injects a byte-identical block
 * every tick. The throttle (shared scripts/lib/inject-throttle.mjs, per-(session,
 * prompt-hash)) suppresses the 2nd+ identical call within the TTL. This proves it
 * via the REAL hook subprocess (Ollama pointed at a dead port = fast+deterministic;
 * OLLAMA_REWRITE_DEBUG=1 surfaces "skip_throttled" on stderr).
 *
 * node:test.  Run: node --test H:/prism/.claude/hooks/__tests__/prompt-rewriter-throttle.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";

const HOOK = "H:/prism/.claude/hooks/prompt-rewriter-ollama.mjs";
const STATE_DIR = "H:/prism/mcp-server/data/state/inject-throttle";
const PROMPT = "Please refactor the speed-feed calculator to add a coolant override flag and tests.";

function runHook(prompt, session, extraEnv = {}) {
  const env = {
    ...process.env,
    OLLAMA_URL: "http://127.0.0.1:1",   // dead port -> pickModel fails fast (no real inference)
    OLLAMA_REWRITE_DEBUG: "1",          // dbg() -> stderr so we can see skip_throttled
    ...extraEnv,
  };
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ prompt, session_id: session, hook_event_name: "UserPromptSubmit" }),
    env, encoding: "utf8", timeout: 15000,
  });
  return { stdout: r.stdout || "", stderr: r.stderr || "" };
}
function cleanup(session) {
  const safe = String(session).replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 120);
  try { rmSync(join(STATE_DIR, `${safe}.json`), { force: true }); } catch { /* */ }
}

test("2nd IDENTICAL prompt+session within TTL is throttle-suppressed", () => {
  const sid = `rwt-throttle-${process.pid}-a`;
  try {
    const r1 = runHook(PROMPT, sid);
    const r2 = runHook(PROMPT, sid);
    assert.ok(!/skip_throttled/.test(r1.stderr), "1st call must NOT be throttled (it stamps)");
    assert.match(r2.stderr, /skip_throttled/, "2nd identical call MUST be throttle-suppressed");
  } finally { cleanup(sid); }
});

test("a DIFFERENT prompt is NOT suppressed (per-prompt-hash, not time-window)", () => {
  const sid = `rwt-throttle-${process.pid}-b`;
  try {
    runHook(PROMPT, sid);                                   // stamp prompt A
    const r2 = runHook(PROMPT + " and add Esprit support", sid);  // different hash
    assert.ok(!/skip_throttled/.test(r2.stderr), "different prompt must never be throttled");
  } finally { cleanup(sid); }
});

test("knob off (PRISM_PROMPT_REWRITE_THROTTLE_MS=0) disables the throttle", () => {
  const sid = `rwt-throttle-${process.pid}-c`;
  try {
    const env = { PRISM_PROMPT_REWRITE_THROTTLE_MS: "0" };
    runHook(PROMPT, sid, env);
    const r2 = runHook(PROMPT, sid, env);
    assert.ok(!/skip_throttled/.test(r2.stderr), "ttl=0 must never throttle (legacy always-rewrite)");
  } finally { cleanup(sid); }
});

test("session 'unknown' (no real sid) is never throttled (no cross-session collision)", () => {
  try {
    runHook(PROMPT, "unknown");
    const r2 = runHook(PROMPT, "unknown");
    assert.ok(!/skip_throttled/.test(r2.stderr), "'unknown' sid is guarded -> never suppressed");
  } finally { cleanup("unknown"); }
});
