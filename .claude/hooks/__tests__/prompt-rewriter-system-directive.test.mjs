/**
 * prompt-rewriter-system-directive.test.mjs -- behavioral oracle for the system/operator
 * AUTONOMOUS-LOOP directive skip added to prompt-rewriter-ollama.mjs (slot:alpha 2026-06-19).
 *
 * Operator loop-directives ([AUTONOMOUS BUILD LOOP ...], [ZULU AUTONOMOUS BUILD LOOP ...], etc.)
 * are re-submitted every /loop tick fleet-wide. The rewriter must NOT spend an ~8s Ollama
 * round-trip "compressing" them -- a lossy restatement of operator rails adds no value and the
 * raw directive still reaches the model anyway. LOOP_DIRECTIVE_RE skips them with
 * skip_reason:"system-directive" BEFORE pickModel.
 *
 * Proven via the REAL hook subprocess with Ollama pointed at a dead port: a SKIPPED directive
 * exits before pickModel (stderr shows skip_system_directive, never the pickModel/model path),
 * while a NON-skipped prompt falls through to pickModel and fails there (ollama-offline) -- so
 * the absence of skip_system_directive on stderr proves the negative cases fell through.
 * OLLAMA_REWRITE_DEBUG=1 surfaces dbg() on stderr; OLLAMA_REWRITE_LOG=off keeps the real ledger
 * clean. Mirrors the prompt-rewriter-throttle.test.mjs harness.
 *
 * node:test.  Run: node --test H:/prism/.claude/hooks/__tests__/prompt-rewriter-system-directive.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const HOOK = "H:/prism/.claude/hooks/prompt-rewriter-ollama.mjs";

function runHook(prompt, session = "unknown", extraEnv = {}) {
  const env = {
    ...process.env,
    OLLAMA_URL: "http://127.0.0.1:1", // dead port -> a NON-skipped prompt fails at pickModel
    OLLAMA_REWRITE_DEBUG: "1",         // dbg() -> stderr
    OLLAMA_REWRITE_LOG: "off",         // don't write test rows to the production ledger
    ...extraEnv,
  };
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ prompt, session_id: session, hook_event_name: "UserPromptSubmit" }),
    env, encoding: "utf8", timeout: 15000,
  });
  return { stdout: r.stdout || "", stderr: r.stderr || "" };
}

// Real operator loop-directive shapes observed in live sessions (slot prefixes vary).
const DIRECTIVES = [
  '[AUTONOMOUS BUILD LOOP — operator-armed 2026-06-18, slot:alpha] Continue building. Order: finish any in-flight unit; then descend the hunt ladder into backlog.',
  '[ZULU AUTONOMOUS BUILD LOOP — operator-armed 2026-06-18: "continue building autonomously"] One build unit this iteration, full substrate ladder.',
  '[AUTONOMOUS BUILD + PC-HEALTH MONITOR — golf]. STEP 1 (monitor, always): snapshot PC health via PowerShell.',
  '[AUTONOMOUS BUILD LOOP — sierra, operator-armed 2026-06-18] Continue building. Read the vault-ops handoff for the backlog.',
];

for (const [i, d] of DIRECTIVES.entries()) {
  test(`autonomous-loop directive #${i + 1} is skipped (system-directive) BEFORE any Ollama call`, () => {
    const r = runHook(d, `sysdir-${process.pid}-${i}`);
    assert.match(r.stderr, /skip_system_directive/, "operator loop-directive MUST be directive-skipped");
    // Proof it exited before the model path: none of the pickModel / model-call markers appear.
    assert.doesNotMatch(r.stderr, /pickModel|using model=|no models|skip reason=/,
      "a directive-skip must happen BEFORE pickModel (no Ollama round-trip)");
  });
}

test("a normal user prompt that mentions 'build loop' mid-sentence is NOT directive-skipped", () => {
  // no leading [..] directive tag -> must fall through to the model path (which fails on dead port)
  const r = runHook("Please fix the build loop in our CI workflow so it stops retrying failed jobs forever.",
    `sysdir-${process.pid}-norm`);
  assert.doesNotMatch(r.stderr, /skip_system_directive/, "a normal prompt mentioning 'build loop' must NOT be skipped");
  assert.match(r.stderr, /pickModel|skip reason=/, "a non-directive prompt must fall through to the model path");
});

test("a leading bracket tag that is NOT a loop-directive is NOT skipped", () => {
  // [NOTE] is a leading [..] tag but carries none of AUTONOMOUS BUILD / operator-armed
  const r = runHook("[NOTE] please summarize the speed-feed calculator changes from yesterday for me.",
    `sysdir-${process.pid}-note`);
  assert.doesNotMatch(r.stderr, /skip_system_directive/, "a non-directive bracket tag must NOT be skipped");
  assert.match(r.stderr, /pickModel|skip reason=/, "a [NOTE] prompt must fall through to the model path");
});

test("a leading bracket tag containing 'build loop' WITHOUT a directive signal is NOT skipped (arm-C P2 closed)", () => {
  // The over-broad bare "BUILD LOOP" alternative was dropped: these realistic prompts that merely
  // lead with a bracket tag mentioning "build loop" must fall through (they carry neither
  // AUTONOMOUS BUILD nor operator-armed). Regression-locks the tightening.
  for (const [i, p] of [
    "[todo: build loop refactor] make the CI build loop stop retrying failed jobs.",
    "[v2 build loop spec] implement the new build loop per the attached design.",
  ].entries()) {
    const r = runHook(p, `sysdir-${process.pid}-fp${i}`);
    assert.doesNotMatch(r.stderr, /skip_system_directive/, `'${p.slice(0, 24)}...' must NOT be directive-skipped`);
    assert.match(r.stderr, /pickModel|skip reason=/, "must fall through to the model path");
  }
});

test("an explicit [RAW] opt-out still wins (precedence preserved, not regressed)", () => {
  const r = runHook("[RAW] keep building the autonomous loop work exactly as written, no rewrite.",
    `sysdir-${process.pid}-raw`);
  // OPTOUT_RE fires first -> opt-out, NOT system-directive (the [RAW] tag is honored verbatim)
  assert.match(r.stderr, /opt-out/, "[RAW] opt-out must still take precedence");
  assert.doesNotMatch(r.stderr, /skip_system_directive/, "[RAW] is an opt-out skip, not a directive skip");
});

test("a pathological huge no-close-bracket prompt is NOT skipped and the hook still completes (bounded scan)", () => {
  // ~340KB: leading "[" + many AUTONOMOUS BUILD tokens, NO closing "]". The DIRECTIVE_SCAN_CHARS
  // slice keeps LOOP_DIRECTIVE_RE linear here (the unbounded two-`[^\]]*` form backtracks O(n^2)
  // on this exact shape). With no closing "]" in the leading window the regex cannot match, so
  // the prompt is NOT directive-skipped and falls through to the model path -- and the hook must
  // COMPLETE (not hang), which the model-path marker proves.
  const huge = "[" + "AUTONOMOUS BUILD ".repeat(20000); // ~340KB, no "]"
  const r = runHook(huge, `sysdir-${process.pid}-redos`);
  assert.doesNotMatch(r.stderr, /skip_system_directive/, "no closing ] -> not a directive match -> not skipped");
  assert.match(r.stderr, /pickModel|skip reason=/, "must fall through to the model path (hook completed, did not hang)");
});
