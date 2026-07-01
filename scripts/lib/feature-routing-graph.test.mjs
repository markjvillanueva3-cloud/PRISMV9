// scripts/lib/feature-routing-graph.test.mjs
// Tests for U-ROUTING-GRAPH. Real reference-value asserts (R9): each pins the
// concrete classification/policy/composition behaviour that would fail if the
// routing logic regressed. No toBeDefined-style stubs.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TASK_CLASS_POLICY, classifyRoutingClass, routeTaskClass,
  buildRoutingDigest, taskClasses, BUILD_COMPLETE_GATE,
  CONTEXT_STRATEGIES, contextStrategyForSubstrate, assertCatalogCoherence,
  assertSubstrateClassCoherence,
  OPERATOR_SUBSTRATE_CATEGORIES, assertOperatorSubstrateCoverage,
  LADDER_TOKEN_TO_SUBSTRATE, NON_CATALOG_LADDER_PRIMITIVES,
  resolveLadderToken, ladderTokenKind, assertLadderTokenCoverage,
  SPINE, spineSubstrates,
  MODEL_IDS, MODEL_ROLE_BY_CLASS, resolveModelPlan, assertModelRoleCoherence,
  modelPolicyDrift, FALLBACK_LADDER,
} from "./feature-routing-graph.mjs";

// ─── TASK_CLASS_POLICY shape (the graph completeness invariant) ───────────────
test("policy: exactly 12 task classes, each with the full followable shape", () => {
  const classes = taskClasses();
  assert.equal(classes.length, 12);
  for (const c of classes) {
    const p = TASK_CLASS_POLICY[c];
    assert.ok(p.trigger && p.trigger.length > 4, `${c}.trigger`);
    assert.ok(Array.isArray(p.substrateLadder) && p.substrateLadder.length >= 2, `${c}.substrateLadder`);
    assert.ok(p.modelTier && /ollama|sonnet|opus|free|mechanical/i.test(p.modelTier), `${c}.modelTier names a tier`);
    assert.ok(Array.isArray(p.commands) && p.commands.length >= 1, `${c}.commands`);
    assert.ok(Array.isArray(p.hooks), `${c}.hooks`);
    assert.ok(Array.isArray(p.autoInvoke), `${c}.autoInvoke`);
    assert.ok(p.antipattern && p.antipattern.length > 8, `${c}.antipattern`);
    assert.ok(p.loopCron && typeof p.loopCron.loop === "string" && typeof p.loopCron.cron === "string", `${c}.loopCron {loop,cron}`);
    assert.ok(p.execution && typeof p.execution === "object", `${c}.execution`);
    for (const dim of ["harness", "hermes", "ollama"]) {
      assert.ok(typeof p.execution[dim] === "string" && p.execution[dim].length > 1, `${c}.execution.${dim} non-empty string`);
    }
  }
});
test("policy: ladder is cheapest-first -- claude (most expensive) never precedes a cheaper rung", () => {
  // Where 'claude' appears in a ladder it must be at/near the end (last rung),
  // never before master-graph/obsidian/ollama/wiki.
  const cheap = new Set(["master-graph", "obsidian", "ollama", "wiki", "tribal", "cag-cold", "prism_calc"]);
  for (const c of taskClasses()) {
    const ladder = TASK_CLASS_POLICY[c].substrateLadder;
    const ci = ladder.indexOf("claude");
    if (ci === -1) continue;
    for (let i = ci + 1; i < ladder.length; i++) {
      assert.ok(!cheap.has(ladder[i]), `${c}: cheap rung '${ladder[i]}' must not come after claude`);
    }
  }
});
test("policy is frozen (immutable graph)", () => {
  assert.throws(() => { TASK_CLASS_POLICY.build = {}; });
  assert.ok(Object.isFrozen(TASK_CLASS_POLICY));
});

// ─── classifyRoutingClass: each class recognized from a representative prompt ─────
const CASES = [
  ["where is the duplication guard hook defined", "locate"],   // clean locate: no domain-noun collision
  ["build a new engine for chip evacuation", "build"],
  ["how should we design the quoting pipeline", "plan"],
  ["what did we decide about the GNN gate last time", "recall"],
  ["ingest this pdf catalog into the wiki", "learn"],
  ["estimate the cost and margin for this bid", "quote"],
  ["compute the speed and feed for 4140 steel", "physics"],
  ["scrutinize the diff before commit", "review"],
  ["debug why the failing test is broken", "fix"],
  ["fan out parallel agents across all galaxies", "orchestrate"],
  ["checkin alpha and resume the handoff", "session"],
  ["program a lathe turning toolpath", "domain"],
  // U-CLASSIFY-RESEARCH (2026-06-15): research/understand/investigate were hitting the conf=0
  // 'build' fallback -> no routing guidance. These now classify correctly.
  ["do deep research across the entire codebase", "learn"],
  ["research how the cache works", "learn"],
  ["understand the routing system", "learn"],
  ["investigate why the build is slow", "fix"],
  ["diagnose the root cause of the leak", "fix"],
  // no-steal regression (scrutiny P2): a build prompt whose NAME contains research/investigate/
  // diagnose must STAY build (phrase signals, not bare words).
  ["build a research tool", "build"],
  ["build investigate dashboard", "build"],
  ["create a diagnose command", "build"],
];
for (const [prompt, expected] of CASES) {
  test(`classify: "${prompt.slice(0, 40)}" -> ${expected}`, () => {
    const r = classifyRoutingClass(prompt);
    assert.equal(r.taskClass, expected, `scores=${JSON.stringify(r.scores)}`);
    assert.ok(r.confidence > 0);
  });
}

// ─── classifier failure modes (R9) ───────────────────────────────────────────
test("classify: empty/null/whitespace -> build default, confidence 0", () => {
  for (const p of ["", null, undefined, "   "]) {
    const r = classifyRoutingClass(p);
    assert.equal(r.taskClass, "build");
    assert.equal(r.confidence, 0);
  }
});
test("classify: no signal -> build default with confidence 0", () => {
  const r = classifyRoutingClass("the quick brown fox jumps");
  assert.equal(r.taskClass, "build");
  assert.equal(r.score, 0);
});
test("classify: tie-break favors specialized class over generic build", () => {
  // 'build a fixture' contains both build + domain(fixture); domain is higher precedence...
  // actually 'fixture' is domain. Verify physics beats build on a mixed prompt.
  const r = classifyRoutingClass("build the cutting force g-code calc");
  assert.equal(r.taskClass, "physics", `scores=${JSON.stringify(r.scores)}`);
});
test("classify: adversarial -- huge prompt does not throw, very long input", () => {
  const big = "build ".repeat(5000) + "speed feed";
  const r = classifyRoutingClass(big);
  assert.ok(["physics", "build"].includes(r.taskClass));
});

// ─── routeTaskClass: composition + fail-open ──────────────────────────────────
test("routeTaskClass: returns policy + live composed verdicts for a physics prompt", async () => {
  const d = await routeTaskClass("compute the speed and feed for titanium");
  assert.equal(d.taskClass, "physics");
  assert.equal(d.policy, TASK_CLASS_POLICY.physics);
  assert.ok("live" in d);
  // composition either succeeded (real verdicts) or failed-open (null) -- never throws
  assert.ok(d.live.contextTier === null || typeof d.live.contextTier === "string");
  assert.ok(d.live.substratePlan === null || typeof d.live.substratePlan === "object");
});
test("routeTaskClass: never throws on empty prompt (fail-open whole-chain)", async () => {
  const d = await routeTaskClass("");
  assert.equal(d.taskClass, "build");
  assert.ok(d.policy);
});

// ─── buildRoutingDigest ───────────────────────────────────────────────────────
test("buildRoutingDigest: renders the followable lines", () => {
  const d = { taskClass: "locate", confidence: 0.5, policy: TASK_CLASS_POLICY.locate, live: {} };
  const s = buildRoutingDigest(d);
  assert.match(s, /TASK-CLASS: locate/);
  assert.match(s, /ladder: master-graph -> /);
  assert.match(s, /AVOID:.*master-index/);
});
test("buildRoutingDigest: safe on null / partial decision", () => {
  assert.equal(buildRoutingDigest(null), "");
  assert.equal(buildRoutingDigest({}), "");
  const s = buildRoutingDigest({ taskClass: "build", confidence: 0, policy: TASK_CLASS_POLICY.build, live: { modelEngine: "ollama", modelTier: "qwen2.5-coder:32b" } });
  assert.match(s, /live: ollama/);
  assert.match(s, /exec:.*harness:/, "build digest surfaces the execution machinery (U-EXEC-POLICY wired into buildRoutingDigest)");
  // physics suppresses hermes+ollama (safety) -> its digest exec line shows only the harness, never hermes:/ollama:
  const ph = buildRoutingDigest({ taskClass: "physics", confidence: 1, policy: TASK_CLASS_POLICY.physics, live: {} });
  assert.equal(/exec:.*hermes:/.test(ph), false, "physics digest must not surface hermes (safety no-egress)");
});

// --- execution machinery (U-EXEC-POLICY) -------------------------------------
// Intent (R9): the graph nodes must route through REAL engineered machinery, and
// must NOT delegate/offload safety work. These asserts fail if a future edit nulls
// a high-value class's machinery or opens a safety-class to egress. (ASCII of the
// values is enforced at write-time by the ascii-guard hook, not re-tested here.)
test("execution: build/offload classes name a REAL harness+hermes+ollama (no judgment-only gaps)", () => {
  // plan + review are EXCLUDED from the ollama check: reasoning is ALWAYS Opus (operator
  // 2026-06-18: "reasoning should always be claude opus never deepseek"), so those classes
  // legitimately carry NO local reasoner (ollama 'no'). They still name a real harness + hermes.
  for (const c of ["build", "learn", "orchestrate", "fix"]) {
    const e = TASK_CLASS_POLICY[c].execution;
    for (const dim of ["harness", "hermes", "ollama"]) {
      assert.ok(!/^(no|none)\b/i.test(e[dim]), `${c}.execution.${dim} should be a real asset, got '${e[dim]}'`);
    }
  }
  for (const c of ["plan", "review"]) {
    const e = TASK_CLASS_POLICY[c].execution;
    assert.ok(!/^(no|none)\b/i.test(e.harness), `${c}.harness should be real, got '${e.harness}'`);
    assert.ok(!/^(no|none)\b/i.test(e.hermes), `${c}.hermes should be real, got '${e.hermes}'`);
  }
});
test("execution: reasoning is ALWAYS Opus -- plan/review offload NO reasoning to a local model + NEVER deepseek (operator 2026-06-18)", () => {
  for (const c of ["plan", "review"]) {
    const o = TASK_CLASS_POLICY[c].execution.ollama;
    assert.match(o, /^no\b/i, `${c} must NOT name a local reasoner (reasoning is Opus), got '${o}'`);
    assert.match(o, /opus|claude|reasoning/i, `${c}.ollama must state the reasoning is Opus/Claude`);
    assert.equal(/deepseek/i.test(o), false, `${c} must NOT use deepseek for reasoning`);
  }
  // fix root-cause reasoning also stays Opus -- its ollama is mechanical-only (diff-summary), not a reasoner
  assert.equal(/deepseek/i.test(TASK_CLASS_POLICY.fix.execution.ollama), false, "fix must not use deepseek for reasoning");
  assert.match(TASK_CLASS_POLICY.fix.execution.ollama, /mechanical|diff-summary/i, "fix ollama is mechanical-only; reasoning is Opus");
});
test("execution: physics (safety) delegates to NOBODY and offloads NOTHING (no egress)", () => {
  const e = TASK_CLASS_POLICY.physics.execution;
  assert.match(e.hermes, /^no\b/i, "physics must not delegate to hermes (safety-critical)");
  assert.match(e.ollama, /^no\b/i, "physics must not offload calc/G-code to ollama (no egress)");
});
test("execution: orchestrate is the hermes-PRIMARY class; learn offloads the whole pipeline to ollama ($0)", () => {
  assert.match(TASK_CLASS_POLICY.orchestrate.execution.hermes, /ask-hermes|fan-out|PRIMARY/i);
  assert.match(TASK_CLASS_POLICY.learn.execution.ollama, /qwen|gpt-oss|ollama/i);
  assert.match(TASK_CLASS_POLICY.learn.execution.harness, /pdf-corpus-watcher-sweep|pypdf|post-training-harness/i);
});

// ─── BUILD-COMPLETE GATE (U-BUILD-COMPLETE-GATE, operator 2026-06-17) ──────────
test("BUILD_COMPLETE_GATE: carries all four completion axes + the loop rule", () => {
  for (const axis of ["gaps", "bugs", "errors", "conflicts", "rule"]) {
    assert.ok(typeof BUILD_COMPLETE_GATE[axis] === "string" && BUILD_COMPLETE_GATE[axis].length > 10,
      `BUILD_COMPLETE_GATE.${axis} must be a real description`);
  }
  assert.match(BUILD_COMPLETE_GATE.rule, /LOOP/i, "the rule must say LOOP");
  assert.match(BUILD_COMPLETE_GATE.rule, /not complete|NOT done|fail-loud|fail loud/i);
  // frozen (can't be mutated at runtime)
  assert.throws(() => { BUILD_COMPLETE_GATE.gaps = "x"; }, "must be frozen");
});

test("doneWhen: every build-PRODUCING class (build/fix/domain) carries the loop-until-zero gate", () => {
  for (const cls of ["build", "fix", "domain"]) {
    const dw = TASK_CLASS_POLICY[cls].doneWhen;
    assert.ok(typeof dw === "string" && dw.length > 20, `${cls}.doneWhen missing`);
    assert.match(dw, /LOOP/i, `${cls}.doneWhen must instruct to LOOP`);
    // references the four-axis gate (all four words appear across the doneWhen + loopCron)
    const blob = `${dw} ${TASK_CLASS_POLICY[cls].loopCron.loop}`.toLowerCase();
    assert.match(blob, /gap/, `${cls} must reference gaps`);
    assert.match(blob, /bug|regression|test/, `${cls} must reference bugs/tests`);
    assert.match(blob, /error|type|safety|validate/, `${cls} must reference errors`);
    assert.match(blob, /conflict|blast-radius|new/, `${cls} must reference conflicts/blast-radius`);
  }
});

test("doneWhen: the build loopCron.loop says LOOP UNTIL the gate holds (not a fixed pass count)", () => {
  assert.match(TASK_CLASS_POLICY.build.loopCron.loop, /LOOP until|until the BUILD_COMPLETE_GATE/i);
  assert.match(TASK_CLASS_POLICY.fix.loopCron.loop, /until.*green.*AND.*(zero|no new)/i);
});

test("buildRoutingDigest: surfaces the DONE line for a build-producing class, omits it for a class without doneWhen", () => {
  const buildDigest = buildRoutingDigest({ taskClass: "build", confidence: 1, policy: TASK_CLASS_POLICY.build, live: {} });
  assert.match(buildDigest, /DONE:/);
  assert.match(buildDigest, /gap|bug|error|conflict/i);
  // locate has no doneWhen -> no DONE line (regression guard: don't fabricate one)
  const locateDigest = buildRoutingDigest({ taskClass: "locate", confidence: 1, policy: TASK_CLASS_POLICY.locate, live: {} });
  assert.equal(/DONE:/.test(locateDigest), false);
});

// --- octopus consensus substrate (U-OCTOPUS-CONSENSUS-ROUTE, 2026-06-17) -------
// Intent (R9): octopus multi-LLM consensus is a FIRST-CLASS substrate + execution
// dimension on the three high-stakes classes (review/plan/orchestrate) where a
// single model-FAMILY blind spot is a real risk -- NOT merely a /octopus command.
// These asserts fail if a future edit drops the consensus rung/dim, points it at a
// non-existent asset, or leaks it onto a safety class (physics must never egress to
// external vendors -- Grok/Gemini are cross-vendor egress).
const CONSENSUS_CLASSES = ["review", "plan", "orchestrate"];

test("consensus: review/plan/orchestrate carry a consensus ladder rung + a real consensus execution dim", () => {
  for (const c of CONSENSUS_CLASSES) {
    const p = TASK_CLASS_POLICY[c];
    assert.ok(p.substrateLadder.includes("consensus"), `${c}.substrateLadder must include the 'consensus' rung`);
    assert.ok(typeof p.execution.consensus === "string" && p.execution.consensus.length > 10, `${c}.execution.consensus must be a real dim`);
    // names a REAL octopus invocation asset (skill / dispatcher action / engine / harness)
    assert.match(p.execution.consensus, /consensus_decide|\/octopus|MultiModelConsensus|consensus-queue|consensus_cache_recall/i,
      `${c}.execution.consensus must name a real octopus asset, got '${p.execution.consensus}'`);
    // cross-vendor is the WHOLE point -- the dim must name the multi-vendor diversity
    assert.match(p.execution.consensus, /cross-vendor|Codex|Grok|Gemini|multi-?LLM|octopus/i,
      `${c}.execution.consensus must convey cross-vendor diversity, got '${p.execution.consensus}'`);
  }
});

test("consensus: dims name ONLY real wired dispatcher actions -- no dead prism_memory:consensus_recall (arm-A R9 guard)", () => {
  // prism_memory:consensus_recall does NOT exist (verified: no such case in any dispatcher);
  // the wired recall action is prism_dev:consensus_cache_recall (devDispatcher.ts:304/5651).
  // This guard FAILS if the dead action regresses back into a consensus dim -- the exact
  // accuracy defect the substring-match above could not catch (the routing artifact injects
  // these strings for the model to FIRE, so a dead action is a fail-loud R12 defect).
  for (const c of CONSENSUS_CLASSES) {
    assert.equal(/prism_memory:consensus_recall/.test(TASK_CLASS_POLICY[c].execution.consensus), false,
      `${c}.execution.consensus must not name the dead prism_memory:consensus_recall action`);
  }
});

test("consensus: NOT wired onto safety/one-shot classes (no cross-vendor egress for physics)", () => {
  // physics is safety no-egress; locate/recall/quote/session/learn/build/fix/domain do
  // not escalate to a cross-vendor consensus pass -> they carry no consensus dim/rung.
  for (const c of taskClasses()) {
    if (CONSENSUS_CLASSES.includes(c)) continue;
    assert.equal(TASK_CLASS_POLICY[c].execution.consensus, undefined,
      `${c} must NOT carry a consensus exec dim (only review/plan/orchestrate escalate cross-vendor)`);
    assert.equal(TASK_CLASS_POLICY[c].substrateLadder.includes("consensus"), false,
      `${c}.substrateLadder must not include the 'consensus' rung`);
  }
});

test("consensus: physics execution stays EXACTLY the 3 base dims (the no-egress invariant is not widened)", () => {
  // Guards the safety boundary: adding a 4th dim must never have touched physics.
  assert.deepEqual(Object.keys(TASK_CLASS_POLICY.physics.execution).sort(), ["harness", "hermes", "ollama"]);
});

test("buildRoutingDigest: surfaces the consensus exec dim + ladder rung for review, omits both for a class without it", () => {
  const reviewDigest = buildRoutingDigest({ taskClass: "review", confidence: 1, policy: TASK_CLASS_POLICY.review, live: {} });
  assert.match(reviewDigest, /exec:.*consensus:/, "review digest must surface the consensus execution dim");
  assert.match(reviewDigest, /ladder:.*consensus/, "review ladder must list the consensus rung");
  // physics (safety) -> never a consensus exec dim (no cross-vendor egress)
  const physicsDigest = buildRoutingDigest({ taskClass: "physics", confidence: 1, policy: TASK_CLASS_POLICY.physics, live: {} });
  assert.equal(/consensus:/.test(physicsDigest), false, "physics digest must not surface consensus (no cross-vendor egress)");
  // a class with consensus still renders the 3 base dims (additive, not a replacement)
  assert.match(reviewDigest, /exec:.*harness:/, "review digest still surfaces the harness dim alongside consensus");
});

// --- context-engineering lens (U-CONTEXT-STRATEGY-LENS, 2026-06-18) -----------
// Intent (R9): the LangChain Write/Select/Compress/Isolate framework (sairahul1
// context-engineering playbook) is applied to the substrate catalog. These asserts
// fail if a strategy is dropped, a substrate is double-bucketed, or the helper
// mis-resolves. The EXACT-match-with-SUBSTRATES coherence is enforced in the
// generator (which owns the catalog); here we pin the structural invariants.
test("context-strategies: exactly the 4 canonical strategies, each with what + substrates + prismNote", () => {
  assert.deepEqual(Object.keys(CONTEXT_STRATEGIES).sort(), ["compress", "isolate", "select", "write"]);
  for (const [s, def] of Object.entries(CONTEXT_STRATEGIES)) {
    assert.ok(def.what && def.what.length > 10, `${s}.what`);
    assert.ok(Array.isArray(def.substrates) && def.substrates.length >= 1, `${s}.substrates`);
    assert.ok(def.prismNote && def.prismNote.length > 10, `${s}.prismNote`);
  }
  assert.ok(Object.isFrozen(CONTEXT_STRATEGIES));
});
test("context-strategies: every substrate is bucketed EXACTLY once (no dup, no omission), 20 total = catalog size", () => {
  const all = Object.values(CONTEXT_STRATEGIES).flatMap((d) => d.substrates);
  const uniq = new Set(all);
  assert.equal(all.length, uniq.size, `a substrate is double-bucketed: ${all.filter((n, i) => all.indexOf(n) !== i)}`);
  // 20 substrates in the catalog as of U-OCTOPUS-CONSENSUS-ROUTE; the generator
  // fail-loud-asserts this equals the SUBSTRATES catalog names exactly.
  assert.equal(uniq.size, 20, "context-strategy map must cover all 20 catalog substrates");
});
// --- the load-bearing SPINE (U-GRAPH-SPINE, operator 2026-06-18) --------------
// Intent (R9): the operator's architecture -- Hermes agents (OS driver) + Obsidian
// vault (brain) -- is declared explicitly. These asserts fail if the spine names a
// non-catalog substrate, mis-roles os/brain, or the buckets drift from the lens.
test("SPINE: declares os (Hermes-agent driver) + brain (Obsidian vault) with role/substrates/note", () => {
  assert.deepEqual(Object.keys(SPINE).sort(), ["brain", "os"]);
  for (const k of ["os", "brain"]) {
    assert.ok(SPINE[k].role && SPINE[k].role.length > 8, `${k}.role`);
    assert.ok(Array.isArray(SPINE[k].substrates) && SPINE[k].substrates.length >= 1, `${k}.substrates`);
    assert.ok(SPINE[k].note && SPINE[k].note.length > 10, `${k}.note`);
  }
  assert.ok(Object.isFrozen(SPINE));
  assert.deepEqual(SPINE.os.substrates, ["hermes-agents", "hermes"]);
  assert.deepEqual(SPINE.brain.substrates, ["obsidian-vault", "memories", "second-brain", "psn"]);
});
test("SPINE: every spine substrate is a REAL catalog substrate, correctly bucketed (os->isolate, brain->write)", () => {
  // cross-check against the live context-strategy lens (the catalog source of truth):
  for (const n of SPINE.os.substrates) {
    assert.equal(contextStrategyForSubstrate(n), "isolate", `os substrate '${n}' must be a real catalog substrate in the isolate strategy`);
  }
  for (const n of SPINE.brain.substrates) {
    assert.equal(contextStrategyForSubstrate(n), "write", `brain substrate '${n}' must be a real catalog substrate in the write strategy`);
  }
  // spineSubstrates() is the flat union, no dup
  const flat = spineSubstrates();
  assert.equal(flat.length, 6);
  assert.equal(new Set(flat).size, 6, "no duplicate spine substrate");
});

test("contextStrategyForSubstrate: resolves each strategy + null for unknown (R9 real values)", () => {
  assert.equal(contextStrategyForSubstrate("obsidian-vault"), "write");
  assert.equal(contextStrategyForSubstrate("master-graph"), "select");
  assert.equal(contextStrategyForSubstrate("ollama-offload"), "compress");
  assert.equal(contextStrategyForSubstrate("consensus"), "isolate");      // the octopus substrate -> isolate
  assert.equal(contextStrategyForSubstrate("hermes-agents"), "isolate");
  assert.equal(contextStrategyForSubstrate("nonexistent-substrate"), null);
  assert.equal(contextStrategyForSubstrate(""), null);
});

test("assertCatalogCoherence: clean match returns true (the live lens vs its own names)", () => {
  const names = Object.values(CONTEXT_STRATEGIES).flatMap((d) => d.substrates);
  assert.equal(assertCatalogCoherence(names, names), true);
  assert.equal(assertCatalogCoherence([], []), true);                       // empty/empty is coherent
});
test("assertCatalogCoherence: THROWS a NAMED drift error -- missing + extra + dup all named (arm-C P3 fix)", () => {
  // missing: catalog has a name the lens lacks
  assert.throws(() => assertCatalogCoherence(["a", "b"], ["a", "b", "c"]), /missing:\[c\]/);
  // extra: lens has a name the catalog lacks
  assert.throws(() => assertCatalogCoherence(["a", "b", "z"], ["a", "b"]), /extra:\[z\]/);
  // the P3 case: a VALID catalog name duplicated in the lens -> previously rendered dup:[] EMPTY; now named
  assert.throws(() => assertCatalogCoherence(["a", "b", "a"], ["a", "b"]), /dup:\[a\]/);
  // a pure dup must not falsely populate missing/extra (only dup names it)
  assert.throws(() => assertCatalogCoherence(["a", "b", "a"], ["a", "b"]), /missing:\[\] extra:\[\] dup:\[a\]/);
});

// ─── assertSubstrateClassCoherence (the THIRD coherence leg: substrate<->class) ──
test("assertSubstrateClassCoherence: a clean substrate<->class mapping returns true", () => {
  const subs = [{ name: "s1", taskClasses: ["build", "fix"] }, { name: "s2", taskClasses: ["fix"] }];
  assert.equal(assertSubstrateClassCoherence(subs, ["build", "fix"]), true);
  assert.equal(assertSubstrateClassCoherence([], []), true); // vacuously coherent (no subs, no classes)
});
test("assertSubstrateClassCoherence: THROWS naming each drift branch (dangling / orphan / starved)", () => {
  // dangling -- a substrate names a class that does not exist
  assert.throws(() => assertSubstrateClassCoherence([{ name: "s1", taskClasses: ["ghostclass"] }], ["build"]),
    /dangling:\[s1->ghostclass\]/);
  // orphan -- a substrate with no taskClasses is catalogued but unreachable
  assert.throws(() => assertSubstrateClassCoherence([{ name: "lonely", taskClasses: [] }], ["build"]),
    /orphanSubstrate:\[lonely\]/);
  // starved -- a class no substrate reaches (the EXACT physics-starvation bug this guard exists to catch)
  assert.throws(() => assertSubstrateClassCoherence([{ name: "s1", taskClasses: ["build"] }], ["build", "physics"]),
    /starvedClass:\[physics\]/);
});
test("assertSubstrateClassCoherence: simultaneous orphan + starved are BOTH named (no branch masks another)", () => {
  // substrate x is orphaned (empty) AND class build is starved (x reaches nothing) -> both surfaced.
  assert.throws(() => assertSubstrateClassCoherence([{ name: "x", taskClasses: [] }], ["build"]),
    /orphanSubstrate:\[x\] starvedClass:\[build\]/);
});

// ─── assertOperatorSubstrateCoverage (the 4th leg: operator-directive <-> live graph) ──
test("OPERATOR_SUBSTRATE_CATEGORIES: the 13 operator-enumerated categories, each with an axis", () => {
  const ids = OPERATOR_SUBSTRATE_CATEGORIES.map((c) => c.id);
  assert.equal(ids.length, 13);
  for (const want of ["skills", "scripts", "hooks", "harnesses", "loops", "crons", "hermes",
    "ollama", "obsidian", "prism-ai", "memories", "wiki", "tribal"]) {
    assert.ok(ids.includes(want), `category ${want} present`);
  }
  for (const c of OPERATOR_SUBSTRATE_CATEGORIES) assert.ok(c.axis && c.axis.length > 8, `${c.id}.axis`);
});
test("assertOperatorSubstrateCoverage: the LIVE graph satisfies the operator directive (defaults -> true)", () => {
  // Proves the operator's 'enforces usage of EVERYTHING' is actually met by the live policy +
  // SPINE + ladders -- NO substrateNames needed (every category has a policy/spine/ladder axis).
  assert.equal(assertOperatorSubstrateCoverage(), true);
});
test("assertOperatorSubstrateCoverage: a graph that enforces NO category THROWS naming the uncovered set", () => {
  const empty = { os: { substrates: [] }, brain: { substrates: [] } };
  const barren = { x: { commands: [], autoInvoke: [], hooks: [], substrateLadder: [], loopCron: { loop: "no", cron: "no" }, execution: { harness: "none", hermes: "no", ollama: "no" } } };
  assert.throws(() => assertOperatorSubstrateCoverage({ policy: barren, substrateNames: [], spine: empty }),
    /operator-substrate-coverage drift -- uncovered:\[skills,scripts/);
});
test("assertOperatorSubstrateCoverage: an unknown category id is flagged noDetector (table<->detector sync)", () => {
  assert.throws(() => assertOperatorSubstrateCoverage({ categories: [{ id: "ghostcat", axis: "x" }], policy: {}, substrateNames: [], spine: { os: { substrates: [] }, brain: { substrates: [] } } }),
    /noDetector:\[ghostcat\]/);
});
test("assertOperatorSubstrateCoverage: per-detector intent -- 'loops' covered iff a real loop/cron-loop signal exists", () => {
  const empty = { os: { substrates: [] }, brain: { substrates: [] } };
  const loopsCat = [{ id: "loops", axis: "x" }];
  // covered via loopCron.loop = "yes ..."
  assert.equal(assertOperatorSubstrateCoverage({ categories: loopsCat, substrateNames: [], spine: empty,
    policy: { a: { loopCron: { loop: "yes -- one unit/iter", cron: "no" } } } }), true);
  // covered via the SUBSTRATES catalog row even when no class loops
  assert.equal(assertOperatorSubstrateCoverage({ categories: loopsCat, substrateNames: ["loops"], spine: empty,
    policy: { a: { loopCron: { loop: "no", cron: "no" } } } }), true);
  // NOT covered: no loop signal anywhere -> throws
  assert.throws(() => assertOperatorSubstrateCoverage({ categories: loopsCat, substrateNames: [], spine: empty,
    policy: { a: { loopCron: { loop: "no", cron: "no" } } } }), /uncovered:\[loops\]/);
});
test("assertOperatorSubstrateCoverage: 'prism-ai' detector is ANCHORED -- a real prism_* rung covers, a mid-string 'prism_' does NOT", () => {
  const empty = { os: { substrates: [] }, brain: { substrates: [] } };
  const cat = [{ id: "prism-ai", axis: "x" }];
  // covered via a genuine prism_*-prefixed ladder rung (the physics ladder's prism_calc/prism_safety)
  assert.equal(assertOperatorSubstrateCoverage({ categories: cat, substrateNames: [], spine: empty,
    policy: { a: { substrateLadder: ["prism_calc", "prism_safety", "claude"] } } }), true);
  // covered via the explicit catalog row
  assert.equal(assertOperatorSubstrateCoverage({ categories: cat, substrateNames: ["prism-ai"], spine: empty,
    policy: { a: { substrateLadder: [] } } }), true);
  // NOT covered: a pathological mid-string 'prism_' rung must not anchor-match (arm-C P2 precision)
  assert.throws(() => assertOperatorSubstrateCoverage({ categories: cat, substrateNames: [], spine: empty,
    policy: { a: { substrateLadder: ["notprism_thing", "claude"] } } }), /uncovered:\[prism-ai\]/);
});

// ─── ladder<->catalog navigation bridge (the 5th leg) ─────────────────────────
test("resolveLadderToken + ladderTokenKind: map a ladder token to its catalog node, classify primitives", () => {
  assert.equal(resolveLadderToken("wiki"), "wikis");
  assert.equal(resolveLadderToken("prism_calc"), "prism-ai");
  assert.equal(resolveLadderToken("master-graph-blast-radius"), "master-graph");
  assert.equal(resolveLadderToken("claude"), null);          // a non-catalog primitive resolves to null
  assert.equal(resolveLadderToken("totally-unknown"), null);
  assert.equal(ladderTokenKind("wiki"), "catalog");
  assert.equal(ladderTokenKind("claude"), "primitive");      // known primitive, NOT unknown
  assert.equal(ladderTokenKind("totally-unknown"), "unknown");
});
test("assertLadderTokenCoverage: EVERY live ladder token resolves to a catalog node or a known primitive", () => {
  // self-derived catalog = the map's own targets -> proves no live ladder token is unmapped/unknown
  const catalog = [...new Set(Object.values(LADDER_TOKEN_TO_SUBSTRATE))];
  assert.equal(assertLadderTokenCoverage(TASK_CLASS_POLICY, catalog), true);
});
test("assertLadderTokenCoverage: THROWS on an unmapped token AND on a dangling map target", () => {
  // unmapped -- a ladder rung that is neither in the bridge map nor a known primitive
  assert.throws(() => assertLadderTokenCoverage({ a: { substrateLadder: ["mystery-rung"] } }, ["x"]),
    /unmapped:\[mystery-rung\]/);
  // danglingMap -- a token mapped to a catalog name that does not exist in the passed catalog
  assert.throws(() => assertLadderTokenCoverage({ a: { substrateLadder: ["wiki"] } }, ["not-wikis"]),
    /danglingMap:\[wiki->wikis\]/);
  // a known primitive ('claude') alone is coherent -> no throw
  assert.equal(assertLadderTokenCoverage({ a: { substrateLadder: ["claude"] } }, []), true);
});
test("NON_CATALOG_LADDER_PRIMITIVES: each primitive names its KIND (model-rung/raw-tool/gate/...)", () => {
  for (const [tok, desc] of Object.entries(NON_CATALOG_LADDER_PRIMITIVES)) {
    assert.ok(desc && /rung|tool|gate|ref|doctrine/.test(desc), `${tok} names a kind`);
  }
});
test("prototype-pollution safe (arm-B P2): a built-in-named token never resolves via the prototype chain", () => {
  for (const evil of ["constructor", "toString", "__proto__", "hasOwnProperty", "valueOf"]) {
    assert.equal(resolveLadderToken(evil), null, `resolveLadderToken(${evil}) -> null`);
    assert.equal(ladderTokenKind(evil), "unknown", `ladderTokenKind(${evil}) -> unknown`);
  }
  // a 'constructor' ladder rung is reported as unmapped, NOT misrouted to danglingMap via Object()
  assert.throws(() => assertLadderTokenCoverage({ a: { substrateLadder: ["constructor"] } }, []),
    /unmapped:\[constructor\]/);
  // a 'constructor' category id is noDetector, NOT an inherited Object() run as a detector
  assert.throws(() => assertOperatorSubstrateCoverage({ categories: [{ id: "constructor", axis: "x" }],
    policy: {}, substrateNames: [], spine: { os: { substrates: [] }, brain: { substrates: [] } } }),
    /noDetector:\[constructor\]/);
});

// --- structured model-routing resolver (U-MODEL-PLAN-RESOLVER, operator 2026-06-18) ---
// Intent (R9): the operator's directive -- reasoning=ALWAYS Opus (never a local/cloud
// reasoner); coding=Sonnet @ max + a local coder ENSEMBLE -- is encoded as machine-
// checkable DATA, not just prose. These asserts pin the CONCRETE model ids/roles and
// fail if a future edit routes a coding class to opus-as-coder, seats a local reasoner
// for a reasoning class, or drifts the structured map from the prose modelTier.
test("MODEL_IDS: concrete, single-sourced ids -- newest Opus/Sonnet + the two LIVE coders", () => {
  assert.equal(MODEL_IDS.opus, "claude-opus-4-8");
  assert.equal(MODEL_IDS.sonnet, "claude-sonnet-4-6");
  assert.deepEqual([...MODEL_IDS.coderEnsemble], ["qwen2.5-coder:32b", "qwen3-coder:30b"]);
  assert.deepEqual([...MODEL_IDS.coderEnsemblePending], ["deepseek-coder"]); // not pulled locally
  assert.ok(Object.isFrozen(MODEL_IDS));
});
test("resolveModelPlan: reasoning classes resolve to Opus ONLY, never a coder ensemble", () => {
  for (const c of ["plan", "review", "physics", "orchestrate", "domain"]) {
    const plan = resolveModelPlan(c);
    assert.equal(plan.role, "reasoning", `${c} role`);
    assert.equal(plan.reasoning.model, "claude-opus-4-8", `${c} reasoning model is Opus`);
    assert.equal(plan.coding, null, `${c} has no coding/coder-ensemble`);
    assert.equal(plan.neverLocalReasoner, true, `${c} never a local reasoner`);
  }
});
test("resolveModelPlan: coding classes resolve to Sonnet @ max + the two real coders, NEVER opus-as-coder", () => {
  for (const c of ["build", "fix"]) {
    const plan = resolveModelPlan(c);
    assert.equal(plan.role, "coding");
    assert.equal(plan.coding.claudeModel, "claude-sonnet-4-6", `${c} codes on Sonnet`);
    assert.equal(plan.coding.effort, "max");
    assert.deepEqual(plan.coding.coderEnsemble, ["qwen2.5-coder:32b", "qwen3-coder:30b"], `${c} runs the two coders together`);
    // Opus is the ESCALATION only, never the coding default
    assert.equal(plan.reasoning.model, "claude-opus-4-8");
    assert.match(plan.reasoning.when, /escalate ONLY/i, `${c} Opus is escalation-only, not the coding default`);
    // R12 honesty flag: the local two-coder combo is now WIRED (U-OCTOPUS-CODER-ENSEMBLE) -- the
    // octopus coderEnsemble:true seats the two coders via CODER_ENSEMBLE_MODELS.
    assert.equal(plan.coding.localEnsembleWired, true, `${c} local ensemble is wired (octopus coderEnsemble)`);
    assert.match(plan.coding.localEnsembleVia, /coderEnsemble|CODER_ENSEMBLE_MODELS|U-OCTOPUS-CODER-ENSEMBLE/i, `${c} names the wiring path`);
  }
});
test("resolveModelPlan: mechanical classes never opus; mixed (quote) is Sonnet + an Opus judgment sub-step", () => {
  for (const c of ["locate", "recall", "session", "learn"]) {
    const plan = resolveModelPlan(c);
    assert.equal(plan.role, "mechanical");
    assert.equal(plan.reasoning, null, `${c} mechanical -> no reasoning tier`);
    assert.match(plan.note, /NEVER opus/i, `${c} must state never-opus`);
  }
  const q = resolveModelPlan("quote");
  assert.equal(q.role, "mixed");
  assert.equal(q.coding.claudeModel, "claude-sonnet-4-6");
  assert.equal(q.reasoning.model, "claude-opus-4-8");
  assert.match(q.reasoning.when, /margin|judgment/i);
});
test("resolveModelPlan: unknown class -> null (fail-soft, no fabricated plan)", () => {
  assert.equal(resolveModelPlan("nonexistent"), null);
  assert.equal(resolveModelPlan(""), null);
  assert.equal(resolveModelPlan(undefined), null);
});
test("MODEL_ROLE_BY_CLASS: covers EXACTLY the 12 task classes (no missing/extra)", () => {
  assert.deepEqual(Object.keys(MODEL_ROLE_BY_CLASS).sort(), taskClasses().sort());
  assert.ok(Object.isFrozen(MODEL_ROLE_BY_CLASS));
});
test("assertModelRoleCoherence: the live map agrees with the prose modelTier (returns true)", () => {
  assert.equal(assertModelRoleCoherence(), true);
});
test("assertModelRoleCoherence: THROWS on EACH injected role<->prose drift branch (negative path exercised via DI)", () => {
  const ids = { coderEnsemble: ["qwen2.5-coder:32b", "qwen3-coder:30b"] };
  // reasoning class whose prose names NO opus -> throw
  assert.throws(
    () => assertModelRoleCoherence({ x: "reasoning" }, { x: { modelTier: "sonnet only", execution: { ollama: "no" } } }, ids),
    /role=reasoning but modelTier prose names no opus/);
  // coding class whose prose names NO Sonnet -> throw
  assert.throws(
    () => assertModelRoleCoherence({ x: "coding" }, { x: { modelTier: "opus", execution: { ollama: "qwen2.5-coder:32b" } } }, ids),
    /role=coding but modelTier prose names no Sonnet/);
  // coding class whose execution.ollama carries NO coder-ensemble model -> throw
  assert.throws(
    () => assertModelRoleCoherence({ x: "coding" }, { x: { modelTier: "sonnet", execution: { ollama: "gpt-oss:120b only" } } }, ids),
    /role=coding but execution.ollama carries no coder-ensemble model/);
  // mechanical class whose prose LEADS with opus -> throw
  assert.throws(
    () => assertModelRoleCoherence({ x: "mechanical" }, { x: { modelTier: "opus then ollama", execution: { ollama: "no" } } }, ids),
    /role=mechanical but modelTier leads with opus/);
  // missing (role for a class not in roleMap) + extra (roleMap key absent from policy) -> named
  assert.throws(() => assertModelRoleCoherence({}, { y: { modelTier: "sonnet" } }, ids), /missing:\[y\]/);
  assert.throws(() => assertModelRoleCoherence({ z: "coding" }, {}, ids), /extra:\[z\]/);
  // a "never opus" mechanical prose must NOT falsely trip the leads-with-opus check (the misfire concern)
  assert.equal(
    assertModelRoleCoherence({ x: "mechanical" }, { x: { modelTier: "ollama-or-sonnet (never opus)", execution: { ollama: "no" } } }, ids),
    true);
  // and the real live tables remain coherent (no-arg happy path)
  assert.equal(assertModelRoleCoherence(), true);
});
test("FALLBACK_LADDER: the cheap-claude rung's nested models array is frozen (no shallow-freeze leak)", () => {
  const cheapClaude = FALLBACK_LADDER.rungs.find((r) => r.tier === "cheap-claude");
  assert.ok(Object.isFrozen(cheapClaude.models), "nested models[] must be frozen");
  assert.throws(() => { cheapClaude.models.push("INJECTED"); });
  assert.deepEqual([...cheapClaude.models], ["claude-sonnet-4-6", "claude-haiku-4-5"]);
});

// --- cloud-overflow fallback ladder (folds in CLOUD-OVERFLOW-MS0, fleet 2026-06-17) ---
// Intent (R9): the fleet's live Ollama/cloud work -- the $0 OpenRouter Nemotron rung
// between local Ollama and paid Claude -- is reflected in the graph as the canonical
// fallback ladder, with the load-bearing safety/quality rules. Fails if a rung is
// dropped, the cloud rung is mis-described as writeable, or a rule is softened.
test("FALLBACK_LADDER: the canonical 4-rung ladder Ollama-free -> cloud-free -> cheap-Claude -> Opus", () => {
  const tiers = FALLBACK_LADDER.rungs.map((r) => r.tier);
  assert.deepEqual(tiers, ["ollama-local-free", "openrouter-cloud-free", "cheap-claude", "opus"]);
  // the $0 cloud rung is the verified Nemotron-super-free slug with 1M ctx at $0
  const cloud = FALLBACK_LADDER.rungs[1];
  assert.equal(cloud.model, "nvidia/nemotron-3-super-120b-a12b:free");
  assert.equal(cloud.cost, "$0");
  assert.equal(cloud.ctx, 1000000);
  // Opus is the top reasoning rung; ollama is the cheap default
  assert.equal(FALLBACK_LADDER.rungs[3].model, "claude-opus-4-8");
  assert.ok(Object.isFrozen(FALLBACK_LADDER));
});
test("FALLBACK_LADDER.rules: cloud is READ-only + safety never egresses + reasoning always Opus (load-bearing invariants)", () => {
  assert.match(FALLBACK_LADDER.rules.cloudReadOnly, /READ.*ONLY|CLOUD_VETO|never writes code/i);
  assert.match(FALLBACK_LADDER.rules.safetyNeverCloud, /NEVER offloads to cloud|G-code|NC-program/i);
  assert.match(FALLBACK_LADDER.rules.reasoningAlwaysOpus, /ALWAYS Claude Opus|never a local/i);
  assert.match(FALLBACK_LADDER.rules.candidateGate, /assess-cloud-candidate|battery evidence/i);
  // cites the LIVE implementers (spec-twin, not a re-implementation -- R8)
  assert.ok(FALLBACK_LADDER.liveImplementers.some((s) => /model-routing-policy/.test(s)));
  assert.ok(FALLBACK_LADDER.liveImplementers.some((s) => /openrouter-client/.test(s)));
});
test("MODEL_IDS.cloudFree: the $0 cloud rung is declared READ-only (never codegen/safety) -- matches the operator 'cloud-if-free' nuance", () => {
  assert.equal(MODEL_IDS.cloudFree.provider, "openrouter");
  assert.equal(MODEL_IDS.cloudFree.slug, "nvidia/nemotron-3-super-120b-a12b:free");
  assert.equal(MODEL_IDS.cloudFree.cost, "$0");
  assert.match(MODEL_IDS.cloudFree.scope, /READ.*ONLY|never codegen/i);
  // the coding plan note surfaces that 'deepseek-coder cloud-if-free' hits the codegen veto
  assert.match(resolveModelPlan("build").note, /cloud rung.*READ-only|CLOUD_VETO|codegen-capable cloud rung/i);
});

// --- modelPolicyDrift: operationalizes the surfaced R7 conflict (declared vs live router) ---
test("modelPolicyDrift: flags a coding class whose LIVE router tier is opus (declared policy is Sonnet)", () => {
  // simulate the live router routing build->Opus (the india model-routing-policy behaviour)
  const driftDecision = { taskClass: "build", live: { modelTier: "opus" } };
  const d = modelPolicyDrift(driftDecision);
  assert.equal(d.drift, true);
  assert.equal(d.declared, "claude-sonnet-4-6");
  assert.match(d.note, /align the live router|R7/i);
});
test("modelPolicyDrift: NO drift when the live tier names sonnet; null for non-coding or absent live tier", () => {
  assert.equal(modelPolicyDrift({ taskClass: "build", live: { modelTier: "sonnet (coding)" } }).drift, false);
  // opus AND sonnet both named -> not a contradiction (escalation language) -> no drift
  assert.equal(modelPolicyDrift({ taskClass: "build", live: { modelTier: "sonnet, escalate to opus" } }).drift, false);
  assert.equal(modelPolicyDrift({ taskClass: "plan", live: { modelTier: "opus" } }), null);   // reasoning class -> not a coding-drift concern
  assert.equal(modelPolicyDrift({ taskClass: "build", live: {} }), null);                       // no live tier to compare
  assert.equal(modelPolicyDrift(null), null);
});
