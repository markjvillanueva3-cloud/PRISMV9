// node:test coverage for ollama-task-offloader buildOffloadDirective() —
// U-LIMA-A1 (safe-category auto-offload directive).
//
// vitest is broken on this repo (pre-existing vite-transform bug); node --test
// is the working path. Run:
//   node --test .claude/hooks/__tests__/ollama-task-offloader-autoexec.test.mjs
//
// Scope: the SAFE_AUTOEXEC categories (explanation/summary/git_summary/
// documentation) must emit an IMPERATIVE directive naming a concrete
// ask-ollama command; every other offloadable category keeps the soft
// suggestion. Plus an integration check that the SAFE category names are
// real classifyPrompt() outputs (not a typo set that silently never fires).

import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildOffloadDirective, classifyPrompt, detectFileTarget, buildClaudeFallbackDirective } from "../ollama-task-offloader.mjs";

// Resolve the hook relative to this test so a slot-worktree run exercises its
// own copy (split-brain false-PASS vector).
const HOOK = fileURLToPath(new URL("../ollama-task-offloader.mjs", import.meta.url));
const RATE_LIMIT_FILE = "H:/prism/mcp-server/data/state/ollama-rate-limits.json";

// hasFileTarget defaults true here so the SAFE-category tests below exercise
// the imperative-directive branch; the fileless gate is tested separately.
const BASE = { model: "qwen2.5-coder:32b", savedTokens: 1234, savingsPct: 88, totalSaved: 9999, hasFileTarget: true };

// ── SAFE_AUTOEXEC categories → imperative directive ────────────────

test("explanation → imperative directive naming `ask-ollama.mjs explain`", () => {
  const d = buildOffloadDirective({ ...BASE, category: "explanation" });
  assert.match(d, /AUTO-OFFLOAD \(explanation\)/);
  assert.match(d, /ask-ollama\.mjs explain <file>/);
  assert.match(d, /do NOT re-derive/i);
});

test("summary → ask-ollama summarize mode", () => {
  const d = buildOffloadDirective({ ...BASE, category: "summary" });
  assert.match(d, /ask-ollama\.mjs summarize <file>/);
  assert.match(d, /AUTO-OFFLOAD/);
});

test("git_summary → ask-ollama summarize mode", () => {
  const d = buildOffloadDirective({ ...BASE, category: "git_summary" });
  assert.match(d, /ask-ollama\.mjs summarize <file>/);
});

test("documentation → ask-ollama explain mode", () => {
  const d = buildOffloadDirective({ ...BASE, category: "documentation" });
  assert.match(d, /ask-ollama\.mjs explain <file>/);
});

test("safe directive carries token savings + session total", () => {
  const d = buildOffloadDirective({ ...BASE, category: "summary" });
  assert.match(d, /1234 tokens/);
  assert.match(d, /88%/);
  assert.match(d, /9999/);
});

test("safe directive keeps the cross-file-reasoning escape hatch (R12 — not a blind mandate)", () => {
  const d = buildOffloadDirective({ ...BASE, category: "explanation" });
  assert.match(d, /cross-file reasoning/i,
    "directive must let Claude opt out when the task genuinely needs context Ollama lacks");
});

// ── non-SAFE offloadable categories → soft suggestion ──────────────

test("prism_inventory → soft suggestion, NOT the imperative directive", () => {
  const d = buildOffloadDirective({ ...BASE, category: "prism_inventory" });
  assert.match(d, /OFFLOAD OPPORTUNITY/);
  assert.doesNotMatch(d, /AUTO-OFFLOAD/);
  assert.doesNotMatch(d, /ask-ollama\.mjs/);
});

// U-OFFLOAD-ACTION (2026-06-12): search_synthesis + prism_introspect PROMOTED
// to SAFE_AUTOEXEC (both are self-contained file→digest shapes). The old
// "search_synthesis → soft suggestion" pin is updated to the new intent —
// behavior change ordered by the unit, not an assertion softened to pass.
test("search_synthesis → imperative summarize directive (promoted U-OFFLOAD-ACTION)", () => {
  const d = buildOffloadDirective({ ...BASE, category: "search_synthesis" });
  assert.match(d, /AUTO-OFFLOAD \(search_synthesis\)/);
  assert.match(d, /ask-ollama\.mjs summarize <file>/);
});

test("prism_introspect → imperative explain directive (promoted U-OFFLOAD-ACTION)", () => {
  const d = buildOffloadDirective({ ...BASE, category: "prism_introspect" });
  assert.match(d, /AUTO-OFFLOAD \(prism_introspect\)/);
  assert.match(d, /ask-ollama\.mjs explain <file>/);
});

// ── PRISM_OLLAMA_OFFLOAD_AUTOEXEC knob (U-OFFLOAD-ACTION) ───────────
// The 2026-06-11 fleet audit found this knob LIVE in env but read by NO hook.
// Semantics: for SAFE_AUTOEXEC categories it bypasses the per-category rate
// limit (operator opted into every-time action). Never widens to unsafe cats.

test("E2E WIRING (revert canary): PRISM_OLLAMA_OFFLOAD_AUTOEXEC=1 bypasses the per-category rate limit in main()", () => {
  // Pure tests cannot pin the `!knobActive && isRateLimited(...)` consumer line
  // (scrutiny P2 2026-06-12) -- spawn the REAL hook. Without the knob a FRESH
  // rate limit suppresses injection; with it the hook must inject (AUTO-OFFLOAD
  // when Ollama is up, the cheap-Claude fallback when it is down -- both prove
  // the rate gate was bypassed). Live rate-limit file is saved + restored.
  const orig = fs.existsSync(RATE_LIMIT_FILE) ? fs.readFileSync(RATE_LIMIT_FILE, "utf8") : null;
  const payload = JSON.stringify({ prompt: "summarize the design doc at docs/overview.md please" });
  const run = (env) => spawnSync(process.execPath, [HOOK], {
    input: payload, encoding: "utf8", timeout: 20000, env: { ...process.env, ...env },
  });
  const seedFreshLimit = () => fs.writeFileSync(RATE_LIMIT_FILE,
    JSON.stringify({ lastSuggestion: { summary: new Date().toISOString() } }));
  try {
    seedFreshLimit();
    const blocked = run({ PRISM_OLLAMA_OFFLOAD_AUTOEXEC: "" });
    assert.equal(blocked.status, 0);
    assert.equal(JSON.parse(blocked.stdout.trim()).hookSpecificOutput, undefined,
      "without the knob a fresh rate limit must suppress injection (precondition)");
    seedFreshLimit();
    const bypassed = run({ PRISM_OLLAMA_OFFLOAD_AUTOEXEC: "1" });
    assert.equal(bypassed.status, 0);
    const out = JSON.parse(bypassed.stdout.trim());
    assert.ok(out.hookSpecificOutput?.additionalContext,
      "knob=1 must bypass the rate limit and inject a directive");
  } finally {
    if (orig === null) { try { fs.unlinkSync(RATE_LIMIT_FILE); } catch { /* best-effort */ } }
    else fs.writeFileSync(RATE_LIMIT_FILE, orig);
  }
});

test("autoexecKnobActive: knob=1 + safe category → true; unsafe category or knob off → false", async () => {
  const { autoexecKnobActive } = await import("../ollama-task-offloader.mjs");
  assert.equal(autoexecKnobActive("summary", { PRISM_OLLAMA_OFFLOAD_AUTOEXEC: "1" }), true);
  assert.equal(autoexecKnobActive("search_synthesis", { PRISM_OLLAMA_OFFLOAD_AUTOEXEC: "1" }), true);
  // unsafe categories never bypass, knob or not (safety direction)
  assert.equal(autoexecKnobActive("prism_inventory", { PRISM_OLLAMA_OFFLOAD_AUTOEXEC: "1" }), false);
  assert.equal(autoexecKnobActive("format_convert", { PRISM_OLLAMA_OFFLOAD_AUTOEXEC: "1" }), false);
  // knob unset/0 → never active
  assert.equal(autoexecKnobActive("summary", {}), false);
  assert.equal(autoexecKnobActive("summary", { PRISM_OLLAMA_OFFLOAD_AUTOEXEC: "0" }), false);
});

test("format_convert → soft suggestion (offloadable but no ask-ollama file-mode)", () => {
  const d = buildOffloadDirective({ ...BASE, category: "format_convert" });
  assert.match(d, /OFFLOAD OPPORTUNITY/);
  assert.doesNotMatch(d, /AUTO-OFFLOAD/);
});

// ── fail-on-revert regression guard ────────────────────────────────

test("fail-on-revert: a SAFE category directive MUST differ from the soft suggestion", () => {
  // If buildOffloadDirective is reverted to always returning the soft text,
  // these two become equal and this fails.
  const safe = buildOffloadDirective({ ...BASE, category: "explanation" });
  const soft = buildOffloadDirective({ ...BASE, category: "prism_inventory" });
  assert.notEqual(safe, soft);
  assert.ok(safe.includes("AUTO-OFFLOAD") && !soft.includes("AUTO-OFFLOAD"));
});

// ── fileless safe task → soft suggestion (P1 fix) ──────────────────

test("SAFE category but NO file target → soft suggestion, not imperative directive", () => {
  // "explain how promises work" classifies as `explanation` but names no file.
  // Feeding ask-ollama a blank <file> wastes a turn — emit the soft text.
  const d = buildOffloadDirective({ ...BASE, category: "explanation", hasFileTarget: false });
  assert.match(d, /OFFLOAD OPPORTUNITY/);
  assert.doesNotMatch(d, /AUTO-OFFLOAD/);
  assert.doesNotMatch(d, /ask-ollama\.mjs/);
});

test("SAFE category WITH file target → imperative directive (default branch)", () => {
  const d = buildOffloadDirective({ ...BASE, category: "explanation", hasFileTarget: true });
  assert.match(d, /AUTO-OFFLOAD/);
  assert.match(d, /ask-ollama\.mjs explain/);
});

// ── detectFileTarget ───────────────────────────────────────────────

test("detectFileTarget: prompt with a file extension → true", () => {
  assert.equal(detectFileTarget("explain scripts/foo.mjs"), true);
  assert.equal(detectFileTarget("summarize the README.md"), true);
  assert.equal(detectFileTarget("explain this engine.ts module"), true);
});

test("detectFileTarget: prompt with a path separator → true", () => {
  assert.equal(detectFileTarget("explain src/engines/Foo"), true);
});

test("detectFileTarget: explicit 'this file' / 'the module' phrase → true", () => {
  assert.equal(detectFileTarget("explain this file"), true);
  assert.equal(detectFileTarget("summarize the module"), true);
});

test("detectFileTarget: fileless conceptual prompt → false", () => {
  assert.equal(detectFileTarget("explain how promises work"), false);
  assert.equal(detectFileTarget("summarize what happened"), false);
});

test("detectFileTarget: empty / null / non-string → false (no crash)", () => {
  assert.equal(detectFileTarget(""), false);
  assert.equal(detectFileTarget(null), false);
  assert.equal(detectFileTarget(undefined), false);
  assert.equal(detectFileTarget(42), false);
});

// ── integration: SAFE category names are REAL classifier outputs ───

test("integration: every SAFE_AUTOEXEC category is actually emitted by classifyPrompt", () => {
  // A typo'd SAFE category would silently never match a real classification —
  // the auto-exec path would be dead code. Drive classifyPrompt with prompts
  // that should land in each safe category and confirm the label.
  const probes = [
    { prompt: "explain this function to me", expect: "explanation" },
    { prompt: "summarize the design doc", expect: "summary" },
    { prompt: "summarize the git log for this session", expect: "git_summary" },
    { prompt: "write a docstring for this method", expect: "documentation" },
  ];
  for (const { prompt, expect } of probes) {
    const c = classifyPrompt(prompt);
    assert.equal(c.category, expect,
      `classifyPrompt(${JSON.stringify(prompt)}) → ${c.category}, expected ${expect}`);
    assert.equal(c.offloadable, true, `${expect} must be offloadable`);
  }
});

test("integration: a non-safe offloadable category still classifies offloadable", () => {
  // sanity — the soft-suggestion path is reachable for a real category.
  // format_convert pattern is /convert\s+(to|from)|format\s+(as|to)/i.
  const c = classifyPrompt("convert to YAML the config block");
  assert.equal(c.offloadable, true);
  assert.equal(c.category, "format_convert");
});

// ── buildClaudeFallbackDirective (U-FLOR-CLAUDE-TIER) ────────────────────────
// The ollama-down branch surfaces the cheap-Claude tier so a mechanical task is
// dispatched to a cheaper agent rather than silently riding this Opus session.

test("buildClaudeFallbackDirective: names the cheap-Claude model + the Agent dispatch + reserves Opus", () => {
  const d = buildClaudeFallbackDirective("summary", "sonnet");
  assert.match(d, /OLLAMA DOWN/);
  assert.match(d, /summary/);
  assert.match(d, /model: "sonnet"/);          // concrete dispatch param
  assert.match(d, /do NOT run it/i);           // anti-leak instruction
  assert.match(d, /reasoning \/ planning \/ heavy coding/i); // opus reserved for
  assert.ok(!/model: "opus"/.test(d), "must never tell Claude to dispatch to opus");
});

test("buildClaudeFallbackDirective: passes haiku through for a cheap-tier task", () => {
  const d = buildClaudeFallbackDirective("classification", "haiku");
  assert.match(d, /model: "haiku"/);
  assert.match(d, /classification/);
});
