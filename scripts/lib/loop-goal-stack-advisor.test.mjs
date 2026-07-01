// Tests for the /loop+/goal optimal-stack-use advisor. node --test.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyDevIntent, spotlightForIter, buildStackAdvisory, SPOTLIGHT_COUNT,
} from "./loop-goal-stack-advisor.mjs";
import { routeForgePhase } from "./forge-route.mjs";

// --- classifyDevIntent (intent routing, R9: maps representative prompts correctly) ---

test("classifyDevIntent: DISCOVER for a 'where/find' prompt", () => {
  assert.equal(classifyDevIntent("where is the cutting-force engine and does it exist").intent, "DISCOVER");
});

test("classifyDevIntent: AUDIT for an 'audit orphans/gaps' prompt", () => {
  assert.equal(classifyDevIntent("audit the fleet for orphan and unwired engines").intent, "AUDIT");
});

test("classifyDevIntent: VERIFY for a 'verify/validate/scrutinize' prompt", () => {
  assert.equal(classifyDevIntent("verify and scrutinize the regression").intent, "VERIFY");
});

test("classifyDevIntent: DATA for an 'enrich every record/corpus' prompt", () => {
  assert.equal(classifyDevIntent("enrich every tool in the catalog from the corpus").intent, "DATA");
});

test("classifyDevIntent: LEARN for a 'distill into memory/wiki/lora' prompt", () => {
  assert.equal(classifyDevIntent("distill the lesson into a memo and feed the lora dataset").intent, "LEARN");
});

test("classifyDevIntent: DESIGN for an 'architect the approach' prompt", () => {
  assert.equal(classifyDevIntent("design the architecture and decide the approach").intent, "DESIGN");
});

test("classifyDevIntent: BUILD for an 'implement the engine' prompt + 'build X and test it' stays BUILD", () => {
  assert.equal(classifyDevIntent("implement and wire the new dispatcher engine").intent, "BUILD");
  // BUILD verbs out-score the single VERIFY hit -> primary action wins.
  assert.equal(classifyDevIntent("build the engine, write the hook, then test it").intent, "BUILD");
});

test("classifyDevIntent: empty / non-string -> BUILD default with a real phase", () => {
  assert.equal(classifyDevIntent("").intent, "BUILD");
  assert.equal(classifyDevIntent(null).intent, "BUILD");
  assert.equal(classifyDevIntent(12345).phase, "novel_codegen");
});

test("classifyDevIntent: phase is always a non-empty forge phase string + reasoning is boolean", () => {
  for (const p of ["where is x", "audit x", "verify x", "enrich x", "distill x", "design x", "build x", ""]) {
    const r = classifyDevIntent(p);
    assert.ok(typeof r.phase === "string" && r.phase.length > 0, `phase for "${p}"`);
    assert.equal(typeof r.reasoning, "boolean", `reasoning for "${p}"`);
  }
});

// SELF-DEFENDING INVARIANT (arm A P2): the advisor states the model lane from its own
// `reasoning` flag, NOT a live probe. That flag MUST stay consistent with the canonical
// forge taxonomy -- if a phase is recategorized in forge-route.mjs, this test fails and
// forces the advisor's lane label back into sync (prevents silent drift).
test("classifyDevIntent: reasoning flag matches !routeForgePhase(phase).mechanical for every intent", () => {
  const reps = {
    DISCOVER: "where is the engine, find it",
    AUDIT: "audit the fleet for orphans",
    VERIFY: "verify and validate the regression",
    DATA: "enrich every part in the corpus",
    LEARN: "distill the lesson into a memo",
    DESIGN: "design the architecture approach",
    BUILD: "implement and wire the engine",
  };
  for (const [intent, prompt] of Object.entries(reps)) {
    const { intent: got, phase, reasoning } = classifyDevIntent(prompt);
    assert.equal(got, intent, `prompt "${prompt}" should classify as ${intent}`);
    const route = routeForgePhase(phase);
    assert.equal(reasoning, !route.mechanical,
      `${intent}/${phase}: advisor reasoning=${reasoning} but routeForgePhase.mechanical=${route.mechanical} (lane label would drift)`);
  }
});

// --- spotlightForIter (the "variably" mechanism) ---

test("spotlightForIter: consecutive iters return DIFFERENT spotlights (variable)", () => {
  assert.notEqual(spotlightForIter(0), spotlightForIter(1));
  assert.notEqual(spotlightForIter(1), spotlightForIter(2));
});

test("spotlightForIter: cycles the full set (iter and iter+COUNT are identical)", () => {
  assert.equal(spotlightForIter(3), spotlightForIter(3 + SPOTLIGHT_COUNT));
  // over one full cycle, every spotlight is distinct (no accidental dup keys)
  const seen = new Set();
  for (let i = 0; i < SPOTLIGHT_COUNT; i++) seen.add(spotlightForIter(i));
  assert.equal(seen.size, SPOTLIGHT_COUNT, "all spotlights distinct across one cycle");
});

test("spotlightForIter: bad input (null/negative/float) -> index 0, never throws", () => {
  assert.equal(spotlightForIter(null), spotlightForIter(0));
  assert.equal(spotlightForIter(-5), spotlightForIter(0));
  assert.equal(spotlightForIter(1.5), spotlightForIter(0));
});

// --- buildStackAdvisory (composition + render) ---

test("buildStackAdvisory: a BUILD prompt yields the block with intent, model lane, substrates, spotlight, catalog pointer", () => {
  const out = buildStackAdvisory({ prompt: "build and wire the FrobEngine to prism_dev", iter: 0 });
  assert.ok(typeof out === "string");
  assert.match(out, /OPTIMAL STACK USE/);
  assert.match(out, /intent: BUILD/);
  assert.match(out, /Model lane \(reasoning-led\):/); // BUILD is reasoning-led
  assert.match(out, /Engage these substrates/);
  assert.match(out, /SPOTLIGHT/);
  assert.match(out, /\[\[feedback_synergy_definition\]\]/);
  assert.match(out, /\[\[feedback_psn_definition\]\]/);
  assert.match(out, /R15/);
  // U-BUILD-COMPLETE-GATE: a build-producing class restates the loop-until-zero gate each iter
  assert.match(out, /DONE-WHEN \(class build -- keep looping until ALL hold\):/);
  assert.match(out, /gap.*bug.*error.*conflict|gaps/i);
});

test("buildStackAdvisory: disabled knob -> null", () => {
  assert.equal(buildStackAdvisory({ prompt: "build x", disabled: true }), null);
});

test("buildStackAdvisory: empty / non-string / object prompt -> null (never throws)", () => {
  assert.equal(buildStackAdvisory({ prompt: "" }), null);
  assert.equal(buildStackAdvisory({ prompt: null }), null);
  assert.equal(buildStackAdvisory({ prompt: { evil: true } }), null);
  assert.equal(buildStackAdvisory({}), null);
});

test("buildStackAdvisory: DIFFERENT intents produce DIFFERENT blocks (proves routing, not a static dump)", () => {
  const dataBlock = buildStackAdvisory({ prompt: "enrich every part in the corpus dataset", iter: 0 });
  const buildBlock = buildStackAdvisory({ prompt: "implement the new engine and wire it", iter: 0 });
  assert.match(dataBlock, /intent: DATA/);
  assert.match(buildBlock, /intent: BUILD/);
  assert.notEqual(dataBlock, buildBlock);
});

test("buildStackAdvisory: same prompt, different iter -> different spotlight (variable across a loop)", () => {
  const i0 = buildStackAdvisory({ prompt: "build the engine", iter: 0 });
  const i1 = buildStackAdvisory({ prompt: "build the engine", iter: 1 });
  assert.notEqual(i0, i1, "the spotlight must rotate between iterations");
});

test("buildStackAdvisory: reads iter from loopState when iter not given", () => {
  const a = buildStackAdvisory({ prompt: "build the engine", loopState: { iter: 0 } });
  const b = buildStackAdvisory({ prompt: "build the engine", loopState: { iter: 1 } });
  assert.notEqual(a, b);
});

test("buildStackAdvisory: a DISCOVER prompt surfaces search-first / system-viz guidance", () => {
  const out = buildStackAdvisory({ prompt: "where does the lathe galaxy live, find it", iter: 0 });
  assert.match(out, /intent: DISCOVER/);
  // always-on rail names search-first regardless of which spotlight is active
  assert.match(out, /search-first/);
});

// FEATURE-ROUTING-GRAPH-MS0: the auto-invoke line surfaces the workflow-class
// fire-on-sight commands so a /loop runs them without the operator typing them.
test("buildStackAdvisory: physics prompt surfaces the auto-invoke line (fire without typing)", () => {
  const out = buildStackAdvisory({ prompt: "compute the speed and feed for 4140 steel", iter: 0 });
  assert.match(out, /Auto-invoke \(class physics -- fire WITHOUT typing\): \/auto-speed-feed/);
});
test("buildStackAdvisory: a class with no autoInvoke (plan) omits the line, never throws", () => {
  const out = buildStackAdvisory({ prompt: "how should we architect the approach", iter: 0 });
  assert.equal(/Auto-invoke \(class/.test(out), false);
});
