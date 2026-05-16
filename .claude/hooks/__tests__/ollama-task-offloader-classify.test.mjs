// node:test coverage for ollama-task-offloader classifyPrompt().
// vitest harness is broken on this repo (pre-existing vite-transform bug);
// node --test is the working alternative. Run:
//   node --test .claude/hooks/__tests__/ollama-task-offloader-classify.test.mjs
//
// Scope: U-OFFLOADER-CAT-FIX (2026-05-16, slot echo). Validates that
// orchestration / operator_directive / deep_reasoning / safety_physics /
// multi_file / git_ops categories are correctly labeled on keep-decisions.
// Previously every keep with no positive offload match fell through to
// category="unknown" (76 of 84 historical events).

import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyPrompt } from "../ollama-task-offloader.mjs";

// ── orchestration: PRISM slash-command prompts ────────────────────────────

test("orchestration: /checkin claims slot", () => {
  const r = classifyPrompt("/checkin echo, /loop system-viz-brain");
  assert.equal(r.offloadable, false);
  assert.equal(r.category, "orchestration");
});

test("orchestration: /checkin-<slot> NATO variant", () => {
  for (const s of ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliett", "kilo", "lima"]) {
    const r = classifyPrompt(`/checkin-${s} continue where you left off`);
    assert.equal(r.category, "orchestration", `slot ${s}`);
    assert.equal(r.offloadable, false);
  }
});

test("orchestration: /loop directive", () => {
  const r = classifyPrompt("/loop docustrata until /goal");
  assert.equal(r.category, "orchestration");
});

test("orchestration: /goal", () => {
  const r = classifyPrompt("/goal complete the milestone");
  assert.equal(r.category, "orchestration");
});

test("orchestration: /forge-triple", () => {
  const r = classifyPrompt("/forge-triple new engine for X");
  assert.equal(r.category, "orchestration");
});

test("orchestration: /system-viz", () => {
  const r = classifyPrompt("/system-viz find OllamaHookBridgeEngine");
  assert.equal(r.category, "orchestration");
});

test("orchestration: /handoff", () => {
  const r = classifyPrompt("/handoff before /compact");
  assert.equal(r.category, "orchestration");
});

// ── operator_directive: imperatives that aren't explanations ─────────────

test("operator_directive: continue where you left off", () => {
  const r = classifyPrompt("continue where you left off");
  assert.equal(r.offloadable, false);
  assert.equal(r.category, "operator_directive");
});

test("operator_directive: fix this and fix whatever caused it", () => {
  const r = classifyPrompt("please fix this and fix whatever is causing me to not be able to update claude");
  assert.equal(r.category, "operator_directive");
});

test("operator_directive: sync the h and c drive", () => {
  const r = classifyPrompt("sync the h and c drive please");
  assert.equal(r.category, "operator_directive");
});

test("operator_directive: make sure settings are synced", () => {
  const r = classifyPrompt("make sure settings are synced");
  assert.equal(r.category, "operator_directive");
});

test("operator_directive: diagnose prism mcp", () => {
  const r = classifyPrompt("diagnose this prism mcp connection issue");
  assert.equal(r.category, "operator_directive");
});

// ── safety_physics: never offload ────────────────────────────────────────

test("safety_physics: kienzle force calculation", () => {
  const r = classifyPrompt("verify the kienzle force calculation for titanium");
  assert.equal(r.offloadable, false);
  assert.equal(r.category, "safety_physics");
});

test("safety_physics: collision-check", () => {
  const r = classifyPrompt("run a collision-check on this toolpath");
  assert.equal(r.category, "safety_physics");
});

test("safety_physics: stress calculation", () => {
  const r = classifyPrompt("verify the stress calculation for the part");
  assert.equal(r.category, "safety_physics");
});

// ── multi_file: codebase-wide work ───────────────────────────────────────

test("multi_file: refactor the entire engine layer", () => {
  const r = classifyPrompt("refactor the entire engine layer to use the new API");
  assert.equal(r.category, "multi_file");
});

test("multi_file: across the codebase", () => {
  const r = classifyPrompt("update naming across the codebase");
  assert.equal(r.category, "multi_file");
});

// ── git_ops: must run locally ────────────────────────────────────────────

test("git_ops: commit the changes", () => {
  const r = classifyPrompt("commit this to the main branch");
  assert.equal(r.category, "git_ops");
});

test("git_ops: push the work", () => {
  const r = classifyPrompt("push the work to origin now");
  assert.equal(r.category, "git_ops");
});

// ── deep_reasoning: chain-of-thought work ────────────────────────────────

test("deep_reasoning: root cause investigation", () => {
  const r = classifyPrompt("find the root cause of this regression");
  assert.equal(r.category, "deep_reasoning");
});

test("deep_reasoning: deep analysis", () => {
  const r = classifyPrompt("do a deep analysis of the schema mismatch");
  assert.equal(r.category, "deep_reasoning");
});

test("deep_reasoning: deep reasoning (new)", () => {
  const r = classifyPrompt("apply deep reasoning to this design choice");
  assert.equal(r.category, "deep_reasoning");
});

test("deep_reasoning: trace through", () => {
  const r = classifyPrompt("trace through the call path");
  assert.equal(r.category, "deep_reasoning");
});

test("deep_reasoning: scrutinize", () => {
  const r = classifyPrompt("scrutinize the latest commit");
  assert.equal(r.category, "deep_reasoning");
});

// ── unknown: genuinely ambiguous (rare after fix) ────────────────────────

test("unknown: pure question with no signal", () => {
  // No slash command, no safety word, no codebase-wide marker, no
  // deep-reasoning verb, no operator-directive imperative.
  const r = classifyPrompt("is there a way to do this differently");
  assert.equal(r.offloadable, false);
  assert.equal(r.category, "unknown");
});

// ── offload still wins over keep-list when both could match ──────────────

test("offload wins (real interaction): summarize a commit offloads, not git_ops", () => {
  // `commit` is in the git_ops keep list, but `summarize` in OFFLOADABLE_PATTERNS
  // fires first — must offload as git_summary. This locks the offload-precedence
  // contract: a positive offload signal beats a keep-list match.
  const r = classifyPrompt("summarize the commits since yesterday");
  assert.equal(r.offloadable, true, "summarize ... commits should offload");
  assert.equal(r.category, "git_summary");
});

test("safety pre-gate BEATS offload patterns (load-bearing)", () => {
  // Critical: Ollama lacks src/physics/constants.ts. "explain the kienzle model"
  // must NOT offload — the local model would hallucinate kc1.1 / Taylor values.
  // SAFETY_PRE runs BEFORE OFFLOADABLE_PATTERNS so this is unconditional.
  for (const prompt of [
    "explain the kienzle model",
    "what does kienzle do for cutting force",
    "summarize the johnson-cook constitutive model",
    "tldr taylor tool-life equation behavior at high speed",
    "verify the force model for titanium",
    "explain the deflection calculation for thin walls",
    "collision-check on the toolpath",
  ]) {
    const r = classifyPrompt(prompt);
    assert.equal(r.offloadable, false, `safety-critical must keep: ${prompt}`);
    assert.equal(r.category, "safety_physics", `safety-critical label: ${prompt}`);
  }
});

test("safety pre-gate CLOSES Unicode-evasion bypasses across all hostile classes", () => {
  // Comprehensive bypass-class coverage per Arm B's R2 scrutiny finding.
  // Each entry exercises a distinct confusable/invisibility class. If any of
  // these regress, an attacker (or copy-paste from a foreign-script source)
  // can bypass SAFETY_PRE and route a physics prompt to a model that lacks
  // mcp-server/src/physics/constants.ts.
  const bypassPayloads = [
    // Cyrillic homoglyphs (10 mapped: а е о р с х у і ј к)
    ["explain the кienzle model",         "Cyrillic к (U+043A)"],
    ["summarize the jоhnson-cook model",  "Cyrillic о (U+043E)"],
    // Greek homoglyphs (11 mapped: α ε ο ρ ν χ ι κ μ τ γ)
    ["explain the jοhnson-cook model",    "Greek omicron (U+03BF)"],
    ["summarize tαylor wear analysis",    "Greek alpha (U+03B1)"],
    // Latin-Extended (no NFKD canonical decomposition; must be explicitly mapped)
    ["explain the kıenzle force",         "Turkish dotless-i (U+0131)"],
    // Combining diacritics (NFKD-decomposable)
    ["explain the kïenzle model",         "ï = i + combining diaeresis (U+0308)"],
    // Zero-width / invisible (default-ignorable codepoints)
    ["explain the kien​zle model",         "ZWSP (U+200B)"],
    ["explain the kien‌zle model",         "ZWNJ (U+200C)"],
    ["explain the kien‍zle model",         "ZWJ (U+200D)"],
    ["explain the kien­zle model",         "SHY (U+00AD)"],
    ["explain the kien⁠zle model",         "Word Joiner (U+2060)"],
    // Bidi controls (default-ignorable)
    ["explain the kien‮zle model",         "RLO bidi override (U+202E)"],
    ["explain the kien‎zle model",         "LRM (U+200E)"],
    ["explain the kien‏zle model",         "RLM (U+200F)"],
    // Variation selectors / tag chars (default-ignorable)
    ["explain the kien󠀀zle model",         "Tag char (U+E0000)"],
  ];
  for (const [prompt, label] of bypassPayloads) {
    const r = classifyPrompt(prompt);
    assert.equal(r.offloadable, false, `bypass must be caught (${label}): ${JSON.stringify(prompt)}`);
    assert.equal(r.category, "safety_physics", `bypass labeled (${label}): ${JSON.stringify(prompt)}`);
  }
});

test("safety pre-gate does NOT mis-claim legitimate non-physics prompts (P1 from Arm B)", () => {
  // The tightened SAFETY_PRE requires:
  //   - taylor + (tool-life|wear|equation|formula) — NOT bare "taylor"
  //   - collision-check + (mfg context word) — NOT bare "collision-check"
  // This prevents "taylor swift fans" / "hash collision-check algorithm"
  // / "john taylor wants to know" from polluting the safety_physics counter.
  const nonPhysics = [
    "taylor swift fans love her music",
    "explain the taylor series in calculus",
    "the hash collision-check algorithm in this code",
    "john taylor wants to know how the dispatcher works",
    "explain the taylor expansion for the function",
  ];
  for (const prompt of nonPhysics) {
    const r = classifyPrompt(prompt);
    assert.notEqual(r.category, "safety_physics", `non-physics must not lock safety: ${prompt}`);
  }
});

test("git_summary regex tightened: 'summarize X change' falls through to generic summary", () => {
  // Previously the bare `changes?` token in git_summary regex poisoned the
  // label for any "summarize X change" prompt. After the fix this must be
  // categorized as the generic `summary` (not `git_summary`).
  const r = classifyPrompt("summarize the kienzle change");
  // It's safety_physics-gated first — but the gate is `kienzle` not `change`,
  // so this prompt hits safety_physics (correct: don't offload kienzle work).
  assert.equal(r.category, "safety_physics");
  // A non-safety variant proves the regex tightening:
  const r2 = classifyPrompt("summarize the dispatcher change");
  assert.equal(r2.offloadable, true);
  assert.equal(r2.category, "summary", "bare 'change' must not hit git_summary");
});

test("orchestration regex left-anchored: rejects '/goal' embedded in a token (no leading WS)", () => {
  // Real protection of (^|\s) anchor: a URL-like or path-like token where the
  // slash is preceded by a non-WS char (e.g., "http://server/goal") must NOT
  // mis-label as orchestration. Whitespace-prefixed mentions remain
  // indistinguishable from invocations and both correctly keep on Claude.
  const r = classifyPrompt("see the docs at http://server/goal for more info");
  assert.notEqual(r.category, "orchestration", "embedded /goal in URL must not be orchestration");
});

test("orchestration regex still catches '/goal' at line-start AND after-whitespace", () => {
  for (const prompt of [
    "/goal complete the milestone",
    "please /goal complete the milestone",  // leading WS via 'please '
  ]) {
    const r = classifyPrompt(prompt);
    assert.equal(r.category, "orchestration", `valid orchestration: ${prompt}`);
  }
});

// ── word-boundary regression tests ──────────────────────────────────────
// Lock the \b boundaries so a future refactor doesn't silently widen the
// operator_directive regex into substring-matching.

test("word boundary: 'discontinue' does NOT match operator_directive 'continue'", () => {
  const r = classifyPrompt("please discontinue support for the old api");
  assert.notEqual(r.category, "operator_directive", "discontinue must not match continue");
});

test("word boundary: 'asynchronous' does NOT match operator_directive 'sync'", () => {
  const r = classifyPrompt("can we do this asynchronous fetch differently");
  assert.notEqual(r.category, "operator_directive", "asynchronous must not match sync");
});

test("word boundary: 'incontinent' does NOT match operator_directive 'continue'", () => {
  // Adversarial: any token containing 'continue' as a substring must not leak.
  const r = classifyPrompt("incontinent regex testing here for sure");
  assert.notEqual(r.category, "operator_directive", "incontinent must not match continue");
});

// ── regression replay: the 8 keep-events from offload-stats.json ─────────
// These are real prompts that produced category="unknown" before the fix.
// After the fix, NONE should be "unknown" — each should carry a meaningful
// label. This locks the regression in place.

test("regression replay: previously-unknown prompts now labeled", () => {
  const replays = [
    { prompt: "/checkin India. utilize /system-viz, prism-awareness, deep reasoning and deep loop", expected: "orchestration" },
    { prompt: "/checkin to golf. all other slots currently accounted for now", expected: "orchestration" },
    { prompt: "close out your session. other chat is finishing up splitting this envelope", expected: "operator_directive" },
    { prompt: "sync the h and c drive please", expected: "operator_directive" },
    { prompt: "make sure settings are synced", expected: "operator_directive" },
    { prompt: "please fix this and fix whatever is causing me to not be able to update claude", expected: "operator_directive" },
    { prompt: "/checkin alpha, /loop system viz expansion until fully complete /goal", expected: "orchestration" },
    { prompt: "/checkin echo, /loop system-viz-brain until all units are complete = /goal", expected: "orchestration" },
  ];
  for (const { prompt, expected } of replays) {
    const r = classifyPrompt(prompt);
    // Single non-redundant assertion: if category equals expected and expected
    // is not "unknown", then category !== "unknown" by transitivity.
    assert.equal(r.category, expected, `expected ${expected} for: ${prompt.slice(0, 60)}`);
  }
  // Meta-check: no replay item expects "unknown" — proves the fix's scope.
  for (const { expected } of replays) {
    assert.notEqual(expected, "unknown", "no replay item should still expect unknown");
  }
});
