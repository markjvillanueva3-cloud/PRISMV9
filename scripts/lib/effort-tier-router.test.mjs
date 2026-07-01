// effort-tier-router.test.mjs -- real-assertion tests for the per-task effort-tier router.
// Run: node --test scripts/lib/effort-tier-router.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { routeEffort, routePromptWithEffort, EFFORT_TIERS } from "./effort-tier-router.mjs";

// ---- EFFORT_TIERS contract -------------------------------------------------------------------
test("EFFORT_TIERS is the frozen low<high<xhigh ladder", () => {
  assert.deepEqual(EFFORT_TIERS, ["low", "high", "xhigh"]);
  assert.ok(Object.isFrozen(EFFORT_TIERS));
});

// ---- routeEffort: model-lane -> effort mapping -----------------------------------------------
test("ollama verdict -> low effort, no fan-out", () => {
  const r = routeEffort({ prompt: "classify this enum", verdict: { engine: "ollama", model: "qwen2.5-coder:3b", taskClass: "classify" } });
  assert.equal(r.effortLevel, "low");
  assert.equal(r.fanOut, false);
  assert.equal(r.escalate, false);
});
test("openrouter long-context verdict -> high, single-shot, no fan-out", () => {
  const r = routeEffort({ prompt: "deep research across the corpus", verdict: { engine: "openrouter", model: "nemotron", tier: "cloud-long-context" } });
  assert.equal(r.effortLevel, "high");
  assert.equal(r.fanOut, false);
});
test("sonnet verdict (operator's 'sonnet' tier) -> low effort", () => {
  const r = routeEffort({ prompt: "summarize this file", verdict: { engine: "claude", tier: "sonnet" } });
  assert.equal(r.effortLevel, "low");
  assert.equal(r.model, "sonnet");
  assert.equal(r.fanOut, false);
});
test("haiku verdict -> low effort", () => {
  const r = routeEffort({ prompt: "trivial format", verdict: { engine: "claude", tier: "haiku" } });
  assert.equal(r.effortLevel, "low");
});
test("CODING on sonnet -> HIGH effort, NOT low (operator 2026-06-18 'Sonnet @ max for coding')", () => {
  // the coding->Sonnet move must not collapse coding to the mechanical 'low'; it gets deep-solo HIGH.
  const r = routeEffort({ prompt: "implement the engine and wire the dispatcher", verdict: { engine: "claude", tier: "sonnet", taskClass: "codegen" } });
  assert.equal(r.effortLevel, "high");
  assert.equal(r.model, "sonnet");
  assert.equal(r.fanOut, false);          // deep solo, NOT the 429-storm fan-out
  assert.equal(r.escalate, false);
  assert.match(r.reason, /Sonnet @ max|coding/i);
  // audit class too
  assert.equal(routeEffort({ prompt: "audit the wiring", verdict: { engine: "claude", tier: "sonnet", taskClass: "audit" } }).effortLevel, "high");
  // a MECHANICAL sonnet (summary/explain) still stays low (the coding bump must not leak to mechanical)
  assert.equal(routeEffort({ prompt: "summarize this", verdict: { engine: "claude", tier: "sonnet", taskClass: "summary" } }).effortLevel, "low");
});

// ---- the 429 FIX: heavy reasoning/build defaults to HIGH, not xhigh ---------------------------
test("opus build prompt with NO exhaustive signal -> HIGH (deep solo), escalate=false", () => {
  const r = routeEffort({ prompt: "build the GraphContextLensEngine and wire it", verdict: { engine: "claude", tier: "opus" } });
  assert.equal(r.effortLevel, "high");
  assert.equal(r.escalate, false);
  assert.equal(r.fanOut, false);
});
test("fable reasoning prompt with no exhaustive signal -> HIGH, escalate=false", () => {
  const r = routeEffort({ prompt: "think through the tradeoffs of this design", verdict: { engine: "claude", tier: "fable" } });
  assert.equal(r.effortLevel, "high");
  assert.equal(r.escalate, false);
});
test("XHIGH-conservatism: 'fix the bug in login' stays HIGH (no fan-out storm)", () => {
  const r = routeEffort({ prompt: "fix the bug in the login flow", verdict: { engine: "claude", tier: "opus" } });
  assert.equal(r.effortLevel, "high");
  assert.equal(r.escalate, false);
});
test("XHIGH-conservatism: 'review the whole module' stays HIGH (no bare-'whole' escalation)", () => {
  const r = routeEffort({ prompt: "review the whole module for style", verdict: { engine: "claude", tier: "opus" } });
  assert.equal(r.effortLevel, "high");
});

// ---- escalation: only genuine exhaustive/orchestration signals reach xhigh --------------------
test("'comprehensive audit' -> xhigh, escalate=true, fanOut=true", () => {
  const r = routeEffort({ prompt: "do a comprehensive audit of the hooks", verdict: { engine: "claude", tier: "opus" } });
  assert.equal(r.effortLevel, "xhigh");
  assert.equal(r.escalate, true);
  assert.equal(r.fanOut, true);
});
test("'all galaxies' -> xhigh", () => {
  assert.equal(routeEffort({ prompt: "apply this to all galaxies", verdict: { engine: "claude", tier: "opus" } }).effortLevel, "xhigh");
});
test("'ultracode' keyword -> xhigh", () => {
  assert.equal(routeEffort({ prompt: "ultracode this refactor", verdict: { engine: "claude", tier: "opus" } }).effortLevel, "xhigh");
});
test("'fan out' / 'orchestrate' -> xhigh", () => {
  assert.equal(routeEffort({ prompt: "fan out agents to cover the codebase", verdict: { engine: "claude", tier: "opus" } }).effortLevel, "xhigh");
  assert.equal(routeEffort({ prompt: "orchestrate the migration", verdict: { engine: "claude", tier: "opus" } }).effortLevel, "xhigh");
});
test("'multi-step migration' -> xhigh", () => {
  assert.equal(routeEffort({ prompt: "a multi-step migration of the schema", verdict: { engine: "claude", tier: "opus" } }).effortLevel, "xhigh");
});
test("WEAK adjective ('comprehensive') on a SONNET verdict does NOT escalate (cheap stays cheap)", () => {
  // a mechanical task that merely mentions 'comprehensive' must not jump to xhigh -- the model lane
  // already proved it's cheap; a bare adjective is not orchestration intent.
  const r = routeEffort({ prompt: "summarize the comprehensive report", verdict: { engine: "claude", tier: "sonnet" } });
  assert.equal(r.effortLevel, "low");
  assert.equal(r.modelOverride, false);
});

// ---- STRONG scope OVERRIDES a cheap lane (the live-validation gap fix) ------------------------
test("STRONG scope 'every dispatcher' on a sonnet lane -> override to opus + xhigh", () => {
  // live-validation case that exposed the gap: the model router called this sonnet, but an explicit
  // 'every dispatcher' scope is heavy orchestration -> override up.
  const r = routeEffort({ prompt: "do a comprehensive audit of every dispatcher", verdict: { engine: "claude", tier: "sonnet" } });
  assert.equal(r.effortLevel, "xhigh");
  assert.equal(r.model, "opus");
  assert.equal(r.escalate, true);
  assert.equal(r.modelOverride, true);
});
test("STRONG scope 'across all galaxies' on a sonnet lane -> override to opus + xhigh", () => {
  const r = routeEffort({ prompt: "apply this pattern across all galaxies", verdict: { engine: "claude", tier: "sonnet" } });
  assert.equal(r.effortLevel, "xhigh");
  assert.equal(r.model, "opus");
  assert.equal(r.modelOverride, true);
});
test("STRONG scope does NOT override Ollama (matrix-proven bulk-mechanical stays free)", () => {
  const r = routeEffort({ prompt: "classify these records across all engines", verdict: { engine: "ollama", model: "qwen2.5-coder:3b", taskClass: "classify" } });
  assert.equal(r.effortLevel, "low");
  assert.equal(r.engine, undefined); // routeEffort returns the effort shape; engine stays in the verdict
  assert.equal(r.modelOverride, false);
});
test("normal opus build carries modelOverride=false", () => {
  const r = routeEffort({ prompt: "build the engine", verdict: { engine: "claude", tier: "opus" } });
  assert.equal(r.effortLevel, "high");
  assert.equal(r.modelOverride, false);
});

// ---- adversarial inputs (never throw) --------------------------------------------------------
test("adversarial: null verdict -> defaults to high (opus assumed)", () => {
  const r = routeEffort({ prompt: "do something", verdict: null });
  assert.equal(r.effortLevel, "high");
});
test("adversarial: null/empty prompt -> high, no throw", () => {
  assert.equal(routeEffort({ prompt: null, verdict: { engine: "claude", tier: "opus" } }).effortLevel, "high");
  assert.equal(routeEffort({ prompt: "", verdict: { engine: "claude", tier: "opus" } }).effortLevel, "high");
});
test("adversarial: missing tier defaults to opus -> high", () => {
  assert.equal(routeEffort({ prompt: "x", verdict: { engine: "claude" } }).effortLevel, "high");
});

// ---- routePromptWithEffort: fused verdict (injected routePrompt) ------------------------------
test("fused: injected routePrompt opus verdict -> merged result carries effortLevel=high", () => {
  const fakeRoute = () => ({ engine: "claude", model: "opus", tier: "opus", taskClass: "codegen", reason: "build -> opus" });
  const r = routePromptWithEffort({ prompt: "write the engine", routePrompt: fakeRoute });
  assert.equal(r.tier, "opus");
  assert.equal(r.effortLevel, "high");
  assert.equal(r.escalate, false);
  assert.equal(r.taskClass, "codegen");
  assert.match(r.effortReason, /high/);
});
test("fused: exhaustive prompt escalates to xhigh", () => {
  const fakeRoute = () => ({ engine: "claude", model: "opus", tier: "opus", taskClass: "audit", reason: "audit -> opus" });
  const r = routePromptWithEffort({ prompt: "exhaustively audit every dispatcher", routePrompt: fakeRoute });
  assert.equal(r.effortLevel, "xhigh");
  assert.equal(r.escalate, true);
});
test("fused: ollama verdict carries low effort + local model", () => {
  const fakeRoute = () => ({ engine: "ollama", model: "qwen2.5-coder:3b", tier: "local", taskClass: "classify", reason: "matrix-proven" });
  const r = routePromptWithEffort({ prompt: "classify x", routePrompt: fakeRoute });
  assert.equal(r.effortLevel, "low");
  assert.equal(r.engine, "ollama");
  assert.equal(r.model, "qwen2.5-coder:3b");
});
