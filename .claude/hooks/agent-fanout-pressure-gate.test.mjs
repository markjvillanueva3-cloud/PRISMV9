// tier: T3
// Tests for agent-fanout-pressure-gate.mjs -- the mechanical-fan-out enforcement arm
// (U-FANOUT-MECH-ENFORCE). Pure functions; importing the hook is side-effect-free (isMain is false
// under the test runner, so main() never fires). Most tests inject a fake router (DI, hermetic), but
// the LIVE-COUPLING regression tests wire the REAL routeClaudeTier so the gate's tier/taskClass
// dependency cannot silently break again (the 2026-06-18 coding->Sonnet retier bug).
// Run: node --test .claude/hooks/agent-fanout-pressure-gate.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractAgentPrompts,
  classifyWorkflowMechanical,
  decideFanout,
} from "./agent-fanout-pressure-gate.mjs";
import { routeClaudeTier } from "../../scripts/lib/claude-tier-router.mjs";

// Injected fake routers (DI) -- model the REAL routeClaudeTier return shape {tier, taskClass} so the
// fixtures stay faithful to the contract the gate reads (the gate keys "mechanical" off taskClass).
const mech = () => ({ tier: "sonnet", taskClass: "summarize" });                    // a cheap mechanical verdict
const byKeyword = ({ task }) => (/synthes|review|decide|design/i.test(task)
  ? { tier: "opus", taskClass: "synthesize" }                                        // judgment
  : { tier: "haiku", taskClass: "classify" });                                       // mechanical

// --- extractAgentPrompts ---
test("extractAgentPrompts: pulls double/single/backtick literal first args", () => {
  const script = [
    'const a = await agent("read file X and summarize");',
    "const b = await agent('extract dims from print');",
    "const c = await agent(`map each galaxy to its memory`);",
  ].join("\n");
  assert.deepEqual(extractAgentPrompts(script), [
    "read file X and summarize",
    "extract dims from print",
    "map each galaxy to its memory",
  ]);
});

test("extractAgentPrompts: returns [] when there are no agent() calls", () => {
  assert.deepEqual(extractAgentPrompts("const x = parallel([() => foo()])"), []);
});

test("extractAgentPrompts: skips non-literal first args (agent(VAR)) -- only string literals", () => {
  // A variable-prompt agent() cannot be classified statically; it must NOT be extracted as ''.
  assert.deepEqual(extractAgentPrompts("await agent(PROMPT_A, {model:'sonnet'})"), []);
});

test("extractAgentPrompts: tolerates junk input (null / number / undefined)", () => {
  assert.deepEqual(extractAgentPrompts(null), []);
  assert.deepEqual(extractAgentPrompts(42), []);
  assert.deepEqual(extractAgentPrompts(undefined), []);
});

// --- classifyWorkflowMechanical ---
test("classify: all-mechanical fan-out -> mechanical:true (the leak we enforce)", () => {
  const r = classifyWorkflowMechanical(["read A", "summarize B", "grep C"], mech);
  assert.equal(r.mechanical, true);
  assert.equal(r.mechanicalCount, 3);
  assert.equal(r.judgmentCount, 0);
});

test("classify: ANY judgment agent -> mechanical:false (conservative, never false-block synthesis)", () => {
  const r = classifyWorkflowMechanical(["read A", "synthesize the findings"], byKeyword);
  assert.equal(r.mechanical, false); // 1 mechanical + 1 judgment => not mechanical-heavy
  assert.equal(r.judgmentCount, 1);
});

test("classify: empty prompt list -> mechanical:false (allow)", () => {
  assert.equal(classifyWorkflowMechanical([], mech).mechanical, false);
});

test("classify: router THROWS -> task counts as judgment -> mechanical:false (fail-safe allow)", () => {
  const boom = () => { throw new Error("router down"); };
  const r = classifyWorkflowMechanical(["read A", "read B"], boom);
  assert.equal(r.mechanical, false);
  assert.equal(r.judgmentCount, 2);
});

test("classify: missing/non-function router -> mechanical:false (fail-safe allow)", () => {
  assert.equal(classifyWorkflowMechanical(["read A"], undefined).mechanical, false);
});

// LIVE-COUPLING regression (operator 2026-06-18 coding->Sonnet): coding now routes to the SONNET
// tier, so a tier-name-only mechanical check would mis-bucket a builder Workflow as mechanical and
// HARD-BLOCK it. These wire the REAL routeClaudeTier (not a stub) so that regression stays caught.
test("classify: REAL router -- an all-coding Workflow is JUDGMENT/build, NOT mechanical (no false hard-block)", () => {
  const r = classifyWorkflowMechanical(
    [
      "implement the engine and wire the dispatcher",
      "write the engine code and add the tests",
      "refactor the routing module",
    ],
    routeClaudeTier,
  );
  assert.equal(r.mechanical, false, "a builder fan-out must NOT be flagged mechanical (would block a legit Workflow)");
  assert.equal(r.mechanicalCount, 0);
  assert.equal(r.judgmentCount, 3); // codegen task-class -> judgment even at the sonnet tier
});
test("classify: REAL router -- a genuinely mechanical fan-out (summarize/classify/explain) IS still mechanical", () => {
  // the enforcement teeth stay: true read/summarize/classify work (sonnet/haiku + non-coding class)
  // is still mechanical -> the local-GPU-fanout advice/deny still fires for the actual leak.
  const r = classifyWorkflowMechanical(
    ["summarize this file", "classify these parts into buckets", "explain this error output"],
    routeClaudeTier,
  );
  assert.equal(r.mechanical, true, "genuine mechanical fan-out is still enforced");
  assert.equal(r.judgmentCount, 0);
});

// --- decideFanout (the enforcement decision) ---
const CAPS = { costCap: 12, burstCap: 4 };

test("decide: mechanical + mechMode strict + not scoped -> DENY (the new enforcement)", () => {
  const v = decideFanout({ cost: 1, recentCount: 0, ...CAPS, mode: "warn", scoped: false, mechanical: true, mechMode: "strict" });
  assert.equal(v.action, "deny");
  assert.match(v.reasons.join(" "), /ollama-fanout/);
});

test("decide: mechanical arm fires even when RATE mode is warn (arms are independent)", () => {
  const v = decideFanout({ cost: 0, recentCount: 0, ...CAPS, mode: "warn", scoped: false, mechanical: true, mechMode: "strict" });
  assert.equal(v.action, "deny");
});

test("decide: mechanical + mechMode warn -> advise (not deny)", () => {
  const v = decideFanout({ cost: 1, recentCount: 0, ...CAPS, mode: "warn", scoped: false, mechanical: true, mechMode: "warn" });
  assert.equal(v.action, "advise");
});

test("decide: mechanical + scoped -> advise (operator override always downgrades)", () => {
  const v = decideFanout({ cost: 1, recentCount: 0, ...CAPS, mode: "strict", scoped: true, mechanical: true, mechMode: "strict" });
  assert.equal(v.action, "advise");
});

test("decide: judgment burst (rate-flagged) + mode warn -> advise, NOT denied by mechanical arm", () => {
  const v = decideFanout({ cost: 1, recentCount: 9, ...CAPS, mode: "warn", scoped: false, mechanical: false, mechMode: "strict" });
  assert.equal(v.action, "advise");
  assert.match(v.reasons.join(" "), /burst/);
});

test("decide: rate-flagged + mode strict -> deny (pre-existing 429 protection preserved)", () => {
  const v = decideFanout({ cost: 99, recentCount: 0, ...CAPS, mode: "strict", scoped: false, mechanical: false, mechMode: "strict" });
  assert.equal(v.action, "deny");
});

test("decide: nothing flagged -> allow", () => {
  const v = decideFanout({ cost: 1, recentCount: 0, ...CAPS, mode: "strict", scoped: false, mechanical: false, mechMode: "strict" });
  assert.equal(v.action, "allow");
});

test("decide: mechanical omitted defaults false (backward-compatible with old callers)", () => {
  const v = decideFanout({ cost: 1, recentCount: 0, ...CAPS, mode: "warn", scoped: false });
  assert.equal(v.action, "allow");
});
