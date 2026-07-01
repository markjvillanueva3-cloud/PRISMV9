// Tests for forge-route.mjs (U-FORGE-ROUTE). Real reference values: every
// assertion fails on a real routing regression (R9). The anti-leak ones break
// the instant a mechanical forge phase is allowed onto Opus.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  routeForgePhase,
  forgeConcurrencyCap,
  planForgeRouting,
  FORGE_PHASE_CATEGORY,
} from "./forge-route.mjs";

const OLLAMA_UP = ["qwen2.5-coder:1.5b", "gpt-oss:20b", "gpt-oss:120b", "qwen2.5-coder:32b"];

// ---- routeForgePhase: mechanical phases route local/cheap, never Opus ----
test("routeForgePhase: scout (mechanical) -> ollama lane when Ollama up, NOT opus", () => {
  const r = routeForgePhase("scout", { available: OLLAMA_UP, hardware: "home_blackwell" });
  assert.equal(r.lane, "ollama");
  assert.equal(r.mechanical, true);
  assert.notEqual(r.claudeModel, "opus");
});

test("routeForgePhase: docstring -> ollama (documentation category), mechanical", () => {
  const r = routeForgePhase("docstring", { available: OLLAMA_UP, hardware: "home_blackwell" });
  assert.equal(r.category, "documentation");
  assert.equal(r.lane, "ollama");
  assert.equal(r.mechanical, true);
});

test("routeForgePhase: scout with Ollama DOWN -> cheap-Claude (sonnet), NEVER opus", () => {
  const r = routeForgePhase("scout", { available: [], ollamaAvailable: false });
  assert.equal(r.lane, "claude");
  assert.equal(r.claudeModel, "sonnet"); // search_synthesis = balanced -> sonnet
  assert.notEqual(r.claudeModel, "opus");
  assert.equal(r.mechanical, true);
});

test("routeForgePhase: dedup_check (cheap) with Ollama DOWN -> haiku", () => {
  const r = routeForgePhase("dedup_check", { available: [], ollamaAvailable: false });
  assert.equal(r.claudeModel, "haiku"); // classification = cheap tier
});

// ---- routeForgePhase: reasoning phases reserved for Opus ----
test("routeForgePhase: verify_gate (the GATE decision) -> opus reserved", () => {
  const r = routeForgePhase("verify_gate", { available: OLLAMA_UP });
  assert.equal(r.lane, "claude");
  assert.equal(r.claudeModel, "opus");
  assert.equal(r.mechanical, false);
});

test("routeForgePhase: design -> opus (architecture, reserved)", () => {
  const r = routeForgePhase("design", { available: OLLAMA_UP });
  assert.equal(r.claudeModel, "opus");
  assert.equal(r.mechanical, false);
});

test("routeForgePhase: safety_gate -> opus, never local (hard invariant)", () => {
  const r = routeForgePhase("safety_gate", { available: OLLAMA_UP });
  assert.equal(r.lane, "claude");
  assert.equal(r.model, null);
  assert.equal(r.claudeModel, "opus");
});

// ---- adversarial: unknown phase defaults mechanical, NOT opus ----
test("routeForgePhase: UNKNOWN phase -> default mechanical (summary), never Opus-by-accident", () => {
  const r = routeForgePhase("some_unknown_phase", { available: [], ollamaAvailable: false });
  assert.equal(r.category, "summary");
  assert.notEqual(r.claudeModel, "opus");
  assert.equal(r.claudeModel, "sonnet");
});

test("routeForgePhase: null/number phase coerces safely to default mechanical", () => {
  for (const bad of [null, undefined, 42, {}]) {
    const r = routeForgePhase(bad, { available: [], ollamaAvailable: false });
    assert.equal(r.category, "summary");
    assert.notEqual(r.claudeModel, "opus");
  }
});

// ---- forgeConcurrencyCap: fork-storm prevention ----
test("forgeConcurrencyCap: cores-2, clamped to hardCap 16", () => {
  assert.equal(forgeConcurrencyCap({ cores: 8 }), 6);       // 8-2
  assert.equal(forgeConcurrencyCap({ cores: 32 }), 16);     // clamp
  assert.equal(forgeConcurrencyCap({ cores: 1 }), 1);       // floor
});

test("forgeConcurrencyCap: budget gate (budget/100k) wins when tighter", () => {
  assert.equal(forgeConcurrencyCap({ cores: 32, budgetTotal: 300000 }), 3); // 300k/100k
  assert.equal(forgeConcurrencyCap({ cores: 32, budgetTotal: 50000 }), 1);  // floor >=1
});

test("forgeConcurrencyCap: unknown inputs -> conservative default 6, never 0/Infinity", () => {
  const c = forgeConcurrencyCap({});
  assert.equal(c, 6);
  assert.ok(c >= 1 && Number.isFinite(c));
});

test("forgeConcurrencyCap: junk inputs never crash, always >=1", () => {
  for (const bad of [{ cores: -5 }, { cores: NaN }, { budgetTotal: -1 }, { cores: "x" }]) {
    const c = forgeConcurrencyCap(bad);
    assert.ok(c >= 1 && c <= 16 && Number.isFinite(c), `cap for ${JSON.stringify(bad)} = ${c}`);
  }
});

// ---- planForgeRouting: whole-run plan ----
test("planForgeRouting: classifies a realistic forge run (local vs opus split)", () => {
  const phases = ["scout", "enumerate", "dedup_check", "design", "docstring", "test_scaffold", "verify_gate", "html_emit"];
  const plan = planForgeRouting(phases, { available: OLLAMA_UP, hardware: "home_blackwell" });
  assert.equal(plan.rows.length, 8);
  // design + verify_gate are the only Opus phases here
  assert.deepEqual(plan.opusPhases.sort(), ["design", "verify_gate"]);
  // the mechanical bulk routes local
  assert.ok(plan.localPhases.includes("scout"));
  assert.ok(plan.localPhases.includes("docstring"));
  assert.match(plan.summary, /6 local.*2 Opus/);
});

test("planForgeRouting: empty/non-array phases -> empty plan, no crash", () => {
  assert.equal(planForgeRouting([]).rows.length, 0);
  assert.equal(planForgeRouting(null).rows.length, 0);
});

// ---- coverage guard: every mapped phase resolves without throwing ----
test("FORGE_PHASE_CATEGORY: every phase routes cleanly (no throw, valid lane)", () => {
  const valid = new Set(["prism_calc", "claude", "vllm", "ollama"]);
  for (const phase of Object.keys(FORGE_PHASE_CATEGORY)) {
    const r = routeForgePhase(phase, { available: OLLAMA_UP, hardware: "home_blackwell" });
    assert.ok(valid.has(r.lane), `${phase} -> invalid lane ${r.lane}`);
  }
});
