// tier: T4
// Tests for .claude/hooks/lib/ollama-cost-router.mjs (U-P4-OLLAMA-COST-ROUTING).
//
// Uses node:test (vite-bug-immune) — the `.claude/helpers/vitest.config.mjs`
// import of `vitest/config` is currently failing to resolve in this repo
// (documented in [[reference_fleet_reaper_ms1]]). Behaviour is identical to
// the equivalent vitest spec.
//
// Run: node --test H:/prism/.claude/hooks/__tests__/ollama-cost-router.test.mjs
//
// U-BW-RESEARCH-REFINE (2026-06-04): the four small models (qwen2.5-coder:3b/7b/14b
// + deepseek-r1:14b) were DELETED from the Blackwell host (BLACKWELL-MODEL-UPGRADE-
// PLAN). These fixtures no longer use those retired tags as tier stand-ins; the
// routing LOGIC under test is unchanged — only the tier *membership* moved. Tiers
// are disjoint, so each test injects a distinct representative:
//   cheap     → qwen2.5-coder:1.5b
//   balanced  → qwen2.5:7b   (also codellama:7b / deepseek-coder:6.7b)
//   strong    → gpt-oss:20b  (also qwen2.5:14b / deepseek-coder:33b-instruct)
//   best      → qwen2.5-coder:32b  (70B-class: qwen2.5:72b, gpt-oss:120b)

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  routeModelForTask,
  resolveExecutor,
  TIER_PREFERENCES,
  CATEGORY_TIER,
  TIER_ORDER,
  BLACKWELL_CEILING,
  CLAUDE_LANE_CATEGORIES,
  DETERMINISTIC_LANE_CATEGORIES,
  VLLM_PREFERRED_CATEGORIES,
  claudeFallbackModel,
  CLAUDE_REASONING_MODEL,
} from "../lib/ollama-cost-router.mjs";

// One representative from each (disjoint) tier — no Blackwell promotion fires
// because these calls pass no `hardware`.
const ALL = [
  "qwen2.5-coder:1.5b", // cheap
  "qwen2.5:7b",         // balanced
  "gpt-oss:20b",        // strong
  "qwen2.5-coder:32b",  // best
];

// ── happy path: category → tier ──────────────────────────────────────────────

test("cheap categories prefer cheap-tier models", () => {
  for (const cat of ["format_convert", "prism_inventory", "prism_introspect", "classification"]) {
    const r = routeModelForTask({ category: cat, available: ALL });
    assert.equal(r.model, "qwen2.5-coder:1.5b", `model for ${cat}`);
    assert.equal(r.tier, "cheap", `tier for ${cat}`);
    assert.equal(r.reason, "target tier", `reason for ${cat}`);
  }
});

test("balanced categories prefer balanced-tier models", () => {
  for (const cat of ["summary", "explanation", "documentation", "git_summary", "prism_audit", "search_synthesis"]) {
    const r = routeModelForTask({ category: cat, available: ALL });
    assert.equal(r.model, "qwen2.5:7b", `model for ${cat}`);
    assert.equal(r.tier, "balanced", `tier for ${cat}`);
    assert.equal(r.reason, "target tier", `reason for ${cat}`);
  }
});

// ── escalation up the tier ladder ────────────────────────────────────────────

test("cheap → balanced when no cheap-tier model is installed", () => {
  const r = routeModelForTask({
    category: "format_convert",
    available: ["qwen2.5:7b", "qwen2.5-coder:32b"],
  });
  assert.equal(r.model, "qwen2.5:7b");
  assert.equal(r.tier, "balanced");
  assert.equal(r.reason, "escalated cheap → balanced");
});

test("cheap → strong (skips empty balanced)", () => {
  const r = routeModelForTask({
    category: "classification",
    available: ["gpt-oss:20b", "qwen2.5-coder:32b"],
  });
  assert.equal(r.model, "gpt-oss:20b");
  assert.equal(r.tier, "strong");
  assert.equal(r.reason, "escalated cheap → strong");
});

test("balanced → best when balanced+strong tiers are empty", () => {
  const r = routeModelForTask({
    category: "summary",
    available: ["qwen2.5-coder:32b"],
  });
  assert.equal(r.model, "qwen2.5-coder:32b");
  assert.equal(r.tier, "best");
  assert.equal(r.reason, "escalated balanced → best");
});

test("does NOT de-escalate — balanced task with only cheap available falls to fallback (not cheap-tier)", () => {
  const r = routeModelForTask({
    category: "summary",
    available: ["qwen2.5-coder:1.5b"],
  });
  assert.equal(r.model, "qwen2.5-coder:1.5b");
  assert.equal(r.tier, "fallback");
  assert.equal(r.reason, "no preferred model in any tier");
});

// ── unknown / missing category ───────────────────────────────────────────────

test("unknown category falls back to balanced tier", () => {
  const r = routeModelForTask({ category: "complete_nonsense_category", available: ALL });
  assert.equal(r.tier, "balanced");
  assert.equal(r.model, "qwen2.5:7b");
});

test("null/undefined/empty/non-string category falls back to balanced", () => {
  for (const cat of [null, undefined, "", 42, {}]) {
    const r = routeModelForTask({ category: cat, available: ALL });
    assert.equal(r.tier, "balanced", `tier for ${String(cat)}`);
    assert.equal(r.model, "qwen2.5:7b", `model for ${String(cat)}`);
  }
});

// ── empty / malformed `available` ────────────────────────────────────────────

test("empty available[] returns null + tier:none", () => {
  const r = routeModelForTask({ category: "summary", available: [] });
  assert.equal(r.model, null);
  assert.equal(r.tier, "none");
  assert.equal(r.reason, "no models available");
});

test("non-array available returns null + tier:none", () => {
  for (const a of [null, undefined, "qwen2.5:7b", {}, 42]) {
    const r = routeModelForTask({ category: "summary", available: a });
    assert.equal(r.model, null, `model for ${typeof a}`);
    assert.equal(r.tier, "none", `tier for ${typeof a}`);
  }
});

test("filters non-string entries; does not crash on them", () => {
  const r = routeModelForTask({
    category: "summary",
    available: [null, undefined, 42, {}, "qwen2.5:7b"],
  });
  assert.equal(r.model, "qwen2.5:7b");
  assert.equal(r.tier, "balanced");
});

test("all-malformed available returns null + tier:none", () => {
  const r = routeModelForTask({
    category: "summary",
    available: [null, undefined, 42, {}],
  });
  assert.equal(r.model, null);
  assert.equal(r.tier, "none");
  assert.equal(r.reason, "no string-typed models");
});

// ── last-resort fallback ─────────────────────────────────────────────────────

test("returns first available + tier:fallback when no preferred model is present at any tier", () => {
  const r = routeModelForTask({
    category: "summary",
    available: ["some-totally-unknown-model:5b", "another-weird:7b"],
  });
  assert.equal(r.model, "some-totally-unknown-model:5b");
  assert.equal(r.tier, "fallback");
  assert.equal(r.reason, "no preferred model in any tier");
});

// ── constants invariants ─────────────────────────────────────────────────────

test("TIER_ORDER is frozen and has exactly the four expected entries in order", () => {
  assert.equal(Object.isFrozen(TIER_ORDER), true);
  assert.deepEqual([...TIER_ORDER], ["cheap", "balanced", "strong", "best"]);
});

test("TIER_PREFERENCES has exactly the four tiers, each frozen non-empty string array", () => {
  assert.equal(Object.isFrozen(TIER_PREFERENCES), true);
  assert.deepEqual(Object.keys(TIER_PREFERENCES).sort(), ["balanced", "best", "cheap", "strong"]);
  for (const tier of TIER_ORDER) {
    assert.equal(Array.isArray(TIER_PREFERENCES[tier]), true, `${tier} is array`);
    assert.equal(Object.isFrozen(TIER_PREFERENCES[tier]), true, `${tier} is frozen`);
    assert.ok(TIER_PREFERENCES[tier].length > 0, `${tier} non-empty`);
    for (const m of TIER_PREFERENCES[tier]) {
      assert.equal(typeof m, "string", `${tier} entry is string`);
      assert.ok(m.length > 0, `${tier} entry non-empty`);
    }
  }
});

// Anti-revert invariant: no tier may reference a RETIRED model tag. This is the
// mechanical lock behind "can't accidentally revert to a small model" — even if
// someone re-pulls one, no tier routes to it. KEEP-IN-SYNC with the deleted set.
test("no tier preference references a retired model tag", () => {
  const RETIRED = ["qwen2.5-coder:3b", "qwen2.5-coder:7b", "qwen2.5-coder:14b", "deepseek-r1:14b"];
  for (const tier of TIER_ORDER) {
    for (const m of TIER_PREFERENCES[tier]) {
      assert.ok(!RETIRED.includes(m), `retired model ${m} must not appear in tier ${tier}`);
    }
  }
});

test("every CATEGORY_TIER value is a member of TIER_ORDER", () => {
  for (const v of Object.values(CATEGORY_TIER)) {
    assert.ok(TIER_ORDER.includes(v), `${v} is in TIER_ORDER`);
  }
});

test("CATEGORY_TIER maps every offloader category to the correct tier (KEEP-IN-SYNC with ollama-task-offloader.mjs)", () => {
  const EXPECTED = {
    format_convert: "cheap",
    prism_inventory: "cheap",
    prism_introspect: "cheap",
    classification: "cheap",
    summary: "balanced",
    explanation: "balanced",
    documentation: "balanced",
    git_summary: "balanced",
    prism_audit: "balanced",
    search_synthesis: "balanced",
  };
  assert.deepEqual({ ...CATEGORY_TIER }, EXPECTED);
});

test("escalation order keeps cheap < balanced < strong < best", () => {
  assert.ok(TIER_ORDER.indexOf("cheap") < TIER_ORDER.indexOf("balanced"));
  assert.ok(TIER_ORDER.indexOf("balanced") < TIER_ORDER.indexOf("strong"));
  assert.ok(TIER_ORDER.indexOf("strong") < TIER_ORDER.indexOf("best"));
});

// ── preference order within a tier ───────────────────────────────────────────

test("picks the FIRST preference-list entry that is available, not the first entry of `available`", () => {
  const r = routeModelForTask({
    category: "summary",
    available: ["codellama:7b", "qwen2.5:7b", "deepseek-coder:6.7b"],
  });
  assert.equal(r.model, "qwen2.5:7b"); // balanced[0], even though codellama:7b is first in `available`
  assert.equal(r.tier, "balanced");
});

test("falls to the second preference within a tier when the first is absent", () => {
  const r = routeModelForTask({
    category: "summary",
    available: ["codellama:7b"],
  });
  assert.equal(r.model, "codellama:7b");
  assert.equal(r.tier, "balanced");
});

// ── live-host coverage: this machine's POST-UPGRADE install ───────────────────

test("on this host's post-upgrade install (gpt-oss:120b/20b + qwen2.5-coder:32b), each tier resolves to a kept model", () => {
  // After BLACKWELL-MODEL-UPGRADE-PLAN the small models are gone; the routing
  // targets are the kept/pulled set. A future host change shouldn't break this —
  // it asserts the routing the CURRENT host should produce.
  const live = ["qwen2.5-coder:32b", "gpt-oss:120b", "gpt-oss:20b"];
  // cheap → no cheap/balanced model installed → escalates to strong (gpt-oss:20b)
  assert.deepEqual(
    routeModelForTask({ category: "classification", available: live }),
    { model: "gpt-oss:20b", tier: "strong", reason: "escalated cheap → strong" },
  );
  // balanced → no balanced model installed → escalates to strong (gpt-oss:20b)
  assert.deepEqual(
    routeModelForTask({ category: "summary", available: live }),
    { model: "gpt-oss:20b", tier: "strong", reason: "escalated balanced → strong" },
  );
});

test("gpt-oss:20b is recognised as a strong-tier model", () => {
  // gpt-oss:20b (20B MoE, 185 tok/s) leads the strong tier — the higher-tier
  // replacement for the retired 14B reasoners. A balanced task with only it
  // installed escalates balanced→strong (not fallback).
  const r = routeModelForTask({
    category: "summary",
    available: ["gpt-oss:20b"],
  });
  assert.equal(r.model, "gpt-oss:20b");
  assert.equal(r.tier, "strong");
  assert.equal(r.reason, "escalated balanced → strong");
});

// ── BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-OFFLOAD-TIER: hardware-aware promotion ───
// On the 96GB Blackwell the strong tier is free, so a balanced-tier task is
// promoted balanced→strong (now landing on gpt-oss:20b). Trivial cheap tasks
// stay cheap; other hosts keep the conservative map (back-compat).

test("blackwell promotes a balanced category (summary) to the strong tier (gpt-oss:20b)", () => {
  const r = routeModelForTask({
    category: "summary", // base tier = balanced
    available: ["qwen2.5:7b", "gpt-oss:20b", "qwen2.5-coder:32b"],
    hardware: "home_blackwell",
  });
  assert.equal(r.model, "gpt-oss:20b");
  assert.equal(r.tier, "strong");
  assert.equal(r.reason, "target tier [blackwell:balanced→strong]");
});

test("blackwell does NOT promote a cheap category (classification stays cheap)", () => {
  const r = routeModelForTask({
    category: "classification", // base tier = cheap
    available: ["qwen2.5-coder:1.5b", "qwen2.5:7b", "gpt-oss:20b"],
    hardware: "home_blackwell",
  });
  assert.equal(r.model, "qwen2.5-coder:1.5b");
  assert.equal(r.tier, "cheap");
  // No promotion suffix — cheap tasks are untouched on Blackwell.
  assert.equal(r.reason, "target tier");
});

test("non-blackwell hardware keeps the conservative balanced map (back-compat)", () => {
  const r = routeModelForTask({
    category: "summary",
    available: ["qwen2.5:7b", "gpt-oss:20b", "qwen2.5-coder:32b"],
    hardware: "home_4080",
  });
  assert.equal(r.model, "qwen2.5:7b");
  assert.equal(r.tier, "balanced");
  assert.equal(r.reason, "target tier");
});

test("omitting hardware is identical to the pre-Blackwell behaviour", () => {
  const without = routeModelForTask({
    category: "documentation",
    available: ["qwen2.5:7b", "gpt-oss:20b"],
  });
  assert.equal(without.model, "qwen2.5:7b");
  assert.equal(without.tier, "balanced");
  assert.equal(without.reason, "target tier");
});

test("blackwell does NOT promote when no strong-tier model is held — falls through honestly (P1 guard)", () => {
  // Host holds ONLY a balanced model. Promoting would land in the misleading
  // `fallback` tier. Instead we behave exactly like a non-Blackwell host:
  // balanced hit, honest telemetry, same model.
  const r = routeModelForTask({
    category: "summary",
    available: ["qwen2.5:7b"],
    hardware: "home_blackwell",
  });
  assert.equal(r.model, "qwen2.5:7b");
  assert.equal(r.tier, "balanced");
  assert.equal(r.reason, "target tier"); // no promotion suffix — gate held
});

test("blackwell with only a best-tier (32B) model held: no false promotion, escalates honestly to best", () => {
  // No strong model present, so the promotion gate does NOT fire; the normal
  // balanced→best escalation still reaches the 32B with honest wording.
  const r = routeModelForTask({
    category: "explanation",
    available: ["qwen2.5-coder:32b"], // only best tier present, no strong
    hardware: "home_blackwell",
  });
  assert.equal(r.model, "qwen2.5-coder:32b");
  assert.equal(r.tier, "best");
  assert.equal(r.reason, "escalated balanced → best"); // no promo suffix — gate held
});

// ── U-BW-BEST-TIER-REACH: synthesis categories reach the `best` tier ──────────
// On the 96GB Blackwell the heaviest *offloadable* category (search_synthesis —
// galaxy roll-ups, system-viz roost summaries, Obsidian memory consolidation)
// rises one tier further than balanced→strong: all the way to `best`, free on
// the idle GPU. Same honest-telemetry gate.

test("BLACKWELL_CEILING maps the synthesis category to best (and nothing else)", () => {
  assert.equal(BLACKWELL_CEILING.search_synthesis, "best");
  // The default ceiling (balanced→strong) covers every other balanced category,
  // so only the genuinely-synthesis category is listed here.
  assert.deepEqual(Object.keys(BLACKWELL_CEILING), ["search_synthesis"]);
});

// ── U-BW-BEST-MODEL-CEILING + U-BW-RESEARCH-REFINE: prefer the biggest held ───
// best tier leads with gpt-oss:120b (120B MoE) then qwen3:32b, the dense 70B/72B,
// then qwen2.5-coder:32b. The down-walk returns the FIRST installed entry.

test("blackwell prefers an installed 70B-class model over the 32B for best-tier synthesis", () => {
  const r = routeModelForTask({
    category: "search_synthesis",
    available: ["qwen2.5-coder:32b", "qwen2.5:72b"], // both held
    hardware: "home_blackwell",
  });
  assert.equal(r.model, "qwen2.5:72b"); // listed ahead of the 32B in `best` → preferred
  assert.equal(r.tier, "best");
});

test("blackwell prefers gpt-oss:120b (research winner) ahead of the dense 70B/72B for synthesis", () => {
  const r = routeModelForTask({
    category: "search_synthesis",
    available: ["qwen2.5-coder:32b", "qwen2.5:72b", "gpt-oss:120b"], // all held
    hardware: "home_blackwell",
  });
  assert.equal(r.model, "gpt-oss:120b"); // best[0] — the highest-quality-that-fits-fast pick
  assert.equal(r.tier, "best");
});

test("blackwell prefers gemma4:31b over the 32b for synthesis, but below gpt-oss:120b (U-BW-GEMMA4 ordering)", () => {
  // gemma4 installed, no gpt-oss → gemma4 wins (strong+fast 31B beats the plain 32b coder for synthesis).
  const noGpt = routeModelForTask({
    category: "search_synthesis",
    available: ["qwen2.5-coder:32b", "gemma4:31b"],
    hardware: "home_blackwell",
  });
  assert.equal(noGpt.model, "gemma4:31b");
  assert.equal(noGpt.tier, "best");
  // both gpt-oss:120b and gemma4 installed → the 120B leads on synthesis breadth.
  const both = routeModelForTask({
    category: "search_synthesis",
    available: ["qwen2.5-coder:32b", "gemma4:31b", "gpt-oss:120b"],
    hardware: "home_blackwell",
  });
  assert.equal(both.model, "gpt-oss:120b");
});

test("best-tier falls back to the 32B when no larger best model is installed (back-compat)", () => {
  const r = routeModelForTask({
    category: "search_synthesis",
    available: ["codellama:7b", "qwen2.5-coder:32b"],
    hardware: "home_blackwell",
  });
  assert.equal(r.model, "qwen2.5-coder:32b"); // down-walk: no larger best held → the 32B
  assert.equal(r.tier, "best");
});

test("blackwell promotes search_synthesis to the 32B best tier when held", () => {
  const r = routeModelForTask({
    category: "search_synthesis",
    available: ["codellama:7b", "qwen2.5-coder:32b"],
    hardware: "home_blackwell",
  });
  assert.equal(r.model, "qwen2.5-coder:32b");
  assert.equal(r.tier, "best");
  assert.equal(r.reason, "target tier [blackwell:balanced→best]");
});

test("blackwell search_synthesis degrades to strong (gpt-oss:20b) when no best model is held — honest", () => {
  // best-tier model absent → walk down the ceiling to the highest held tier
  // (strong), exactly as the balanced→strong path would. No false 'best' claim.
  const r = routeModelForTask({
    category: "search_synthesis",
    available: ["qwen2.5:7b", "gpt-oss:20b"],
    hardware: "home_blackwell",
  });
  assert.equal(r.model, "gpt-oss:20b");
  assert.equal(r.tier, "strong");
  assert.equal(r.reason, "target tier [blackwell:balanced→strong]");
});

test("blackwell search_synthesis with only a balanced model held: no promotion, honest balanced hit", () => {
  // Neither strong nor best installed → behave exactly like a non-Blackwell host.
  const r = routeModelForTask({
    category: "search_synthesis",
    available: ["qwen2.5:7b"],
    hardware: "home_blackwell",
  });
  assert.equal(r.model, "qwen2.5:7b");
  assert.equal(r.tier, "balanced");
  assert.equal(r.reason, "target tier"); // no promo suffix — gate held
});

test("non-blackwell search_synthesis is NOT promoted to best (back-compat)", () => {
  const r = routeModelForTask({
    category: "search_synthesis",
    available: ["qwen2.5:7b", "gpt-oss:20b", "qwen2.5-coder:32b"],
    // no hardware → conservative pre-Blackwell behaviour
  });
  assert.equal(r.model, "qwen2.5:7b");
  assert.equal(r.tier, "balanced");
  assert.equal(r.reason, "target tier");
});

test("blackwell still caps a NON-synthesis balanced category (documentation) at strong, not best", () => {
  // documentation is balanced but not in BLACKWELL_CEILING — even with the 32B
  // present it must stop at strong (gpt-oss:20b). Guards against over-broad promotion.
  const r = routeModelForTask({
    category: "documentation",
    available: ["qwen2.5:7b", "gpt-oss:20b", "qwen2.5-coder:32b"],
    hardware: "home_blackwell",
  });
  assert.equal(r.model, "gpt-oss:20b");
  assert.equal(r.tier, "strong");
  assert.equal(r.reason, "target tier [blackwell:balanced→strong]");
});

// ── resolveExecutor — lane-aware routing (FLEET-OLLAMA-ROUTING-MS0/U-FLOR01) ──
// R9: each test fails on a real logic regression — flip a ladder branch and the
// lane/model assertion breaks. Reasons asserted by substring (assert.match) so
// they stay robust to wording while still proving the decision provenance.

test("resolveExecutor: deterministic category → prism_calc lane, NO model spend", () => {
  const r = resolveExecutor({ category: "physics_calc", available: ["qwen2.5:7b"] });
  assert.equal(r.lane, "prism_calc");
  assert.equal(r.model, null);
  assert.equal(r.tier, "deterministic");
  assert.match(r.reason, /R5/);
});

test("resolveExecutor: safety category → claude lane, never a local model (hard invariant)", () => {
  const r = resolveExecutor({ category: "safety", available: ["gpt-oss:120b", "qwen2.5-coder:32b"] });
  assert.equal(r.lane, "claude");
  assert.equal(r.model, null);
  assert.equal(r.tier, "cloud");
  assert.equal(r.claudeModel, "opus"); // reserved reasoning tier
  assert.match(r.reason, /never local/); // hard invariant preserved
});

test("resolveExecutor: multi_file_refactor (judgment) → claude even with a strong model present", () => {
  const r = resolveExecutor({
    category: "multi_file_refactor",
    available: ["qwen2.5-coder:32b"],
    hardware: "home_blackwell",
  });
  assert.equal(r.lane, "claude");
  assert.equal(r.model, null);
});

test("resolveExecutor: mechanical category, Ollama up → ollama lane at the routed tier/model", () => {
  const r = resolveExecutor({ category: "summary", available: ["qwen2.5:7b"] });
  assert.equal(r.lane, "ollama");
  assert.equal(r.model, "qwen2.5:7b"); // balanced tier, no Blackwell promotion (no hardware)
  assert.equal(r.tier, "balanced");
});

test("resolveExecutor: Blackwell promotion flows THROUGH the lane router (summary → strong)", () => {
  const r = resolveExecutor({
    category: "summary",
    available: ["gpt-oss:20b"],
    hardware: "home_blackwell",
  });
  assert.equal(r.lane, "ollama");
  assert.equal(r.model, "gpt-oss:20b");
  assert.equal(r.tier, "strong");
  assert.match(r.reason, /blackwell:balanced->strong|blackwell:balanced→strong/);
});

test("resolveExecutor: Ollama DOWN on an offloadable task → claude lane, FAIL-LOUD (R12), not silent", () => {
  const r = resolveExecutor({ category: "summary", available: ["qwen2.5:7b"], ollamaAvailable: false });
  assert.equal(r.lane, "claude");
  assert.equal(r.model, null);
  assert.match(r.reason, /Ollama unavailable/);
  assert.match(r.reason, /fail-loud/);
});

test("resolveExecutor: empty Ollama roster → claude fail-loud (routed.model null)", () => {
  const r = resolveExecutor({ category: "summary", available: [] });
  assert.equal(r.lane, "claude");
  assert.equal(r.model, null);
  assert.match(r.reason, /Ollama unavailable/);
});

test("resolveExecutor: vLLM enabled + available + high-fan-out class → vllm lane, names ollama fallback", () => {
  const r = resolveExecutor({
    category: "summary",
    available: ["qwen2.5:7b"],
    vllmEnabled: true,
    vllmAvailable: true,
  });
  assert.equal(r.lane, "vllm");
  assert.equal(r.model, "local-vllm");
  assert.equal(r.tier, "vllm");
  assert.match(r.reason, /ollama-fallback: qwen2\.5:7b/);
});

test("resolveExecutor: vLLM enabled but DOWN → falls back to ollama with an explicit note", () => {
  const r = resolveExecutor({
    category: "summary",
    available: ["qwen2.5:7b"],
    vllmEnabled: true,
    vllmAvailable: false,
  });
  assert.equal(r.lane, "ollama");
  assert.equal(r.model, "qwen2.5:7b");
  assert.match(r.reason, /vllm-enabled-but-down->ollama/);
});

test("resolveExecutor: vLLM up but category NOT high-fan-out (format_convert) → stays on ollama, not vllm", () => {
  // Proves the VLLM_PREFERRED subset gate: cheap/trivial work stays on Ollama's
  // elastic multi-model lane even when vLLM is hot. format_convert → cheap tier.
  const r = resolveExecutor({
    category: "format_convert",
    available: ["qwen2.5-coder:1.5b"],
    vllmEnabled: true,
    vllmAvailable: true,
  });
  assert.equal(r.lane, "ollama");
  assert.equal(r.model, "qwen2.5-coder:1.5b");
  assert.equal(r.tier, "cheap");
});

test("resolveExecutor: UNKNOWN offloadable category does NOT silently go to claude (preserves routeModelForTask fall-through)", () => {
  // Adversarial: a category absent from CATEGORY_TIER + all lane sets must still
  // offload (balanced default), matching the pre-existing routeModelForTask
  // contract — NOT regress to keeping unclassified mechanical work on Claude.
  const r = resolveExecutor({ category: "some_new_offloadable_category", available: ["qwen2.5:7b"] });
  assert.equal(r.lane, "ollama");
  assert.equal(r.model, "qwen2.5:7b");
  assert.equal(r.tier, "balanced");
  assert.equal(r.claudeModel, null); // ran local -> no Claude spend
});

// ── claudeModel sub-tier (FLEET-OLLAMA-ROUTING-MS1/U-FLOR-CLAUDE-TIER) ────────
// The operator fallback ladder: Ollama -> Sonnet/Haiku -> Opus(reserved). Every
// test here fails on a real regression of that ladder (R9): the anti-leak ones
// break the instant a mechanical offload-miss is allowed to land on Opus.

test("claudeModel: judgment/reasoning category -> opus (the reserved top tier)", () => {
  const r = resolveExecutor({ category: "deep_reasoning", available: ["gpt-oss:120b"] });
  assert.equal(r.lane, "claude");
  assert.equal(r.claudeModel, "opus");
  assert.match(r.reason, /reasoning\/planning\/heavy-coding/);
});

test("claudeModel: safety category -> opus (heavy reasoning, never local)", () => {
  const r = resolveExecutor({ category: "safety", available: ["qwen2.5-coder:32b"] });
  assert.equal(r.claudeModel, "opus");
});

test("claudeModel: deterministic lane -> null (no Claude model at all)", () => {
  const r = resolveExecutor({ category: "physics_calc", available: ["qwen2.5:7b"] });
  assert.equal(r.lane, "prism_calc");
  assert.equal(r.claudeModel, null);
});

test("claudeModel: mechanical task running on Ollama -> null (no Claude spend)", () => {
  const r = resolveExecutor({ category: "summary", available: ["qwen2.5:7b"] });
  assert.equal(r.lane, "ollama");
  assert.equal(r.claudeModel, null);
});

test("claudeModel: ANTI-LEAK — balanced mechanical, Ollama DOWN -> sonnet, NOT opus", () => {
  const r = resolveExecutor({ category: "summary", available: ["qwen2.5:7b"], ollamaAvailable: false });
  assert.equal(r.lane, "claude");
  assert.equal(r.claudeModel, "sonnet");
  assert.notEqual(r.claudeModel, "opus"); // the leak this field closes
  assert.match(r.reason, /NOT Opus/);
});

test("claudeModel: cheap mechanical (classification), Ollama DOWN -> haiku", () => {
  const r = resolveExecutor({ category: "classification", available: ["qwen2.5-coder:1.5b"], ollamaAvailable: false });
  assert.equal(r.lane, "claude");
  assert.equal(r.claudeModel, "haiku");
});

test("claudeModel: cheap mechanical (format_convert), empty roster -> haiku fail-loud", () => {
  const r = resolveExecutor({ category: "format_convert", available: [] });
  assert.equal(r.lane, "claude");
  assert.equal(r.claudeModel, "haiku");
});

test("claudeModel: ANTI-LEAK — UNKNOWN offloadable + Ollama DOWN -> sonnet, NOT opus", () => {
  // An unclassified mechanical task that can't offload must drop to cheap-Claude,
  // never silently ride the session Opus.
  const r = resolveExecutor({ category: "some_unknown_mechanical", available: [], ollamaAvailable: false });
  assert.equal(r.lane, "claude");
  assert.equal(r.claudeModel, "sonnet");
  assert.notEqual(r.claudeModel, "opus");
});

test("claudeFallbackModel: pure helper — cheap->haiku, balanced->sonnet, junk->sonnet", () => {
  assert.equal(claudeFallbackModel("classification"), "haiku");
  assert.equal(claudeFallbackModel("prism_inventory"), "haiku");
  assert.equal(claudeFallbackModel("summary"), "sonnet");
  assert.equal(claudeFallbackModel("documentation"), "sonnet");
  assert.equal(claudeFallbackModel("totally_unknown"), "sonnet"); // safe default
  assert.equal(claudeFallbackModel(null), "sonnet");
  assert.equal(claudeFallbackModel(42), "sonnet");
  assert.notEqual(claudeFallbackModel("classification"), "opus");
});

test("resolveExecutor: lane category sets are frozen + single-sourced (anti-mutation guard)", () => {
  assert.ok(Object.isFrozen(CLAUDE_LANE_CATEGORIES));
  assert.ok(Object.isFrozen(DETERMINISTIC_LANE_CATEGORIES));
  assert.ok(Object.isFrozen(VLLM_PREFERRED_CATEGORIES));
  assert.ok(CLAUDE_LANE_CATEGORIES.has("safety"));
  assert.ok(DETERMINISTIC_LANE_CATEGORIES.has("physics_calc"));
  assert.ok(VLLM_PREFERRED_CATEGORIES.has("summary"));
  // VLLM_PREFERRED must be a SUBSET of offloadable work (never includes a
  // judgment class) — a safety class leaking in would mis-route to vLLM.
  for (const c of VLLM_PREFERRED_CATEGORIES) {
    assert.ok(!CLAUDE_LANE_CATEGORIES.has(c), `${c} must not be both Claude-only and vLLM-preferred`);
  }
});

test("blackwell never promotes a cheap category to best even if synthesis-shaped models are held", () => {
  // classification is cheap; the Blackwell block is skipped entirely for cheap.
  const r = routeModelForTask({
    category: "classification",
    available: ["qwen2.5-coder:1.5b", "qwen2.5-coder:32b"],
    hardware: "home_blackwell",
  });
  assert.equal(r.tier, "cheap");
  assert.equal(r.model, "qwen2.5-coder:1.5b");
  assert.equal(r.reason, "target tier");
});
