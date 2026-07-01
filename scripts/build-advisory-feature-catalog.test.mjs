// scripts/build-advisory-feature-catalog.test.mjs
//
// Tests for U-ADVISORY-CATALOG pure fns. R9: every assertion encodes WHY the
// behavior matters (a block-gate must never be misread as advisory -> a chat would
// not know a feature can hard-stop it; the byTaskClass projection must exclude
// orphans/passive -> the template would surface dead features). Reference inputs are
// real emit patterns copied from live hooks.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyBehavioralKind,
  stripComments,
  extractKnob,
  hookEvents,
  enrichHook,
  aggregateCatalog,
  curatedClassMap,
} from "./build-advisory-feature-catalog.mjs";

// ---- classifyBehavioralKind ------------------------------------------------

test("classifyBehavioralKind: decision:block -> block-gate", () => {
  assert.equal(classifyBehavioralKind('console.log(JSON.stringify({decision:"block",reason:"x"}))'), "block-gate");
  // quoted-key form (real hook output)
  assert.equal(classifyBehavioralKind('{ "decision": "block" }'), "block-gate");
});

test("classifyBehavioralKind: permissionDecision:deny -> block-gate", () => {
  assert.equal(classifyBehavioralKind('hookSpecificOutput:{ permissionDecision:"deny" }'), "block-gate");
});

test("classifyBehavioralKind: process.exit(2) -> block-gate", () => {
  assert.equal(classifyBehavioralKind('if (bad) { process.stderr.write("no"); process.exit(2); }'), "block-gate");
});

test("classifyBehavioralKind: continue:false -> block-gate (Stop block)", () => {
  assert.equal(classifyBehavioralKind('return { "continue": false, stopReason:"x" };'), "block-gate");
});

test("classifyBehavioralKind: additionalContext -> advisory-inject", () => {
  assert.equal(classifyBehavioralKind('out.hookSpecificOutput = { additionalContext: digest };'), "advisory-inject");
});

test("classifyBehavioralKind: systemMessage -> advisory-inject", () => {
  assert.equal(classifyBehavioralKind('return JSON.stringify({ "systemMessage": "reminder" });'), "advisory-inject");
});

test("classifyBehavioralKind: writeFileSync without inject/block -> mutator", () => {
  assert.equal(classifyBehavioralKind('fs.writeFileSync(LEDGER, JSON.stringify(rows));'), "mutator");
  assert.equal(classifyBehavioralKind('fs.appendFileSync(LOG, line);'), "mutator");
});

test("classifyBehavioralKind: none of the above -> passive", () => {
  assert.equal(classifyBehavioralKind('const x = readFileSync(p); console.error("seen", x.length);'), "passive");
  assert.equal(classifyBehavioralKind(""), "passive");
  assert.equal(classifyBehavioralKind(null), "passive");
  assert.equal(classifyBehavioralKind(undefined), "passive");
});

test("classifyBehavioralKind: a block signal ONLY in a comment is NOT a gate (scrutiny P2)", () => {
  // a hook named *-advisory that merely DOCUMENTS a block pattern but actually injects
  // must classify as advisory-inject, not block-gate (the 10/134 false-gate inflation).
  const commentedBlock = '// returns decision:"block" upstream\nout.hookSpecificOutput={additionalContext:"note"};';
  assert.equal(classifyBehavioralKind(commentedBlock), "advisory-inject");
  // block pattern in a JSDoc /* */ + no real emit -> passive, not gate.
  assert.equal(classifyBehavioralKind('/* may process.exit(2) */ const x=1;'), "passive");
  // a REAL block in code is still caught even with a comment present.
  assert.equal(classifyBehavioralKind('// note\nif(bad) return {decision:"block"};'), "block-gate");
});

test("stripComments: URL-safe (does not eat http:// or path//x), strips real comments", () => {
  assert.equal(stripComments('const u="http://x";').includes("http://x"), true);  // URL survives
  assert.equal(/process\.exit/.test(stripComments("// process.exit(2)\ncode")), false); // line comment gone
  assert.equal(/decision/.test(stripComments("/* decision:block */code")), false);     // block comment gone
});

test("stripComments: a glob/path literal '/*' inside a STRING is NOT a comment (scrutiny re-review P1)", () => {
  // the html-companion-guard.mjs failure: "patches/*.md" + a later */ mispaired by the
  // old regex and ate the real decision:"block" code between. The char-scanner must
  // preserve both the glob string AND the real emit.
  const body = 'const globs=["patches/*.md","specs/**/*.md"];\nif(bad) return {decision:"block"};';
  const stripped = stripComments(body);
  assert.ok(stripped.includes('decision:"block"'), "real block emit must survive a string-literal /*");
  assert.equal(classifyBehavioralKind(body), "block-gate"); // the gate stays visible
});

test("classifyBehavioralKind: PRECEDENCE -- a hook that BOTH blocks and injects is block-gate", () => {
  // many gates inject context on the allow path but block on deny -- the block is
  // the consequential fact a chat must know, so block-gate must win.
  const both = 'if (dup) return {decision:"block"}; out.hookSpecificOutput={additionalContext:"hint"};';
  assert.equal(classifyBehavioralKind(both), "block-gate");
});

// ---- extractKnob -----------------------------------------------------------

test("extractKnob: finds DISABLE/DISABLED/OFF/BYPASS/ENABLE/ENABLED forms", () => {
  assert.equal(extractKnob('if (process.env.PRISM_PROMPT_ROUTE_INJECT_DISABLE) return;'), "PRISM_PROMPT_ROUTE_INJECT_DISABLE");
  assert.equal(extractKnob('process.env.PRISM_GOLF_FAIL_CLOSED'), null); // not a disable/off/bypass/enable suffix
  assert.equal(extractKnob('const on = process.env.PRISM_OBSIDIAN_LIVE_ENABLE === "1";'), "PRISM_OBSIDIAN_LIVE_ENABLE");
  assert.equal(extractKnob('PRISM_SCRUTINY_CODEX_OFF'), "PRISM_SCRUTINY_CODEX_OFF");
  // scrutiny P2: -ED forms must be captured WHOLE, not truncated to ..._DISABLE/_ENABLE
  assert.equal(extractKnob('if (process.env.PRISM_FOO_DISABLED) skip();'), "PRISM_FOO_DISABLED");
  assert.equal(extractKnob('const e = process.env.PRISM_BAR_ENABLED;'), "PRISM_BAR_ENABLED");
});

test("extractKnob: null when no knob", () => {
  assert.equal(extractKnob("const x = 1;"), null);
  assert.equal(extractKnob(""), null);
});

test("extractKnob: first match wins (stable)", () => {
  const b = "PRISM_A_DISABLE ... later PRISM_B_DISABLE";
  assert.equal(extractKnob(b), "PRISM_A_DISABLE");
});

// ---- hookEvents ------------------------------------------------------------

test("hookEvents: dedup + sort distinct events", () => {
  const reg = { events: [{ event: "Stop" }, { event: "PreToolUse" }, { event: "Stop" }] };
  assert.deepEqual(hookEvents(reg), ["PreToolUse", "Stop"]);
});

test("hookEvents: empty/missing -> []", () => {
  assert.deepEqual(hookEvents({}), []);
  assert.deepEqual(hookEvents({ events: [] }), []);
  assert.deepEqual(hookEvents(null), []);
});

// ---- enrichHook ------------------------------------------------------------

// minimal classifier stub matching feature-routing-graph.classifyRoutingClass shape.
function fakeClassify(text) {
  if (/dedup|duplicat|build/i.test(text)) return { taskClass: "build", confidence: 0.5 };
  if (/scrutin|review/i.test(text)) return { taskClass: "review", confidence: 0.75 };
  return { taskClass: "build", confidence: 0 };
}

test("enrichHook: composes routing dimensions from registry record + body", () => {
  const reg = { id: "duplication-hard-block", description: "blocks duplicate engine creation", wired: true, tier: "T1", events: [{ event: "PreToolUse" }] };
  const body = 'if (dup) return { decision: "block" }; // PRISM_DUP_GUARD_DISABLE';
  const e = enrichHook(reg, body, fakeClassify);
  assert.equal(e.id, "duplication-hard-block");
  assert.equal(e.behavioralKind, "block-gate");
  assert.equal(e.taskClass, "build");
  assert.equal(e.classConf, 0.5);
  assert.equal(e.knob, "PRISM_DUP_GUARD_DISABLE");
  assert.deepEqual(e.events, ["PreToolUse"]);
  assert.equal(e.wired, true);
  assert.equal(e.tier, "T1");
});

test("enrichHook: unreadable body ('') degrades to passive + null knob (R12 no fabrication)", () => {
  const reg = { id: "mystery-hook", description: "", wired: false, events: [] };
  const e = enrichHook(reg, "", fakeClassify);
  assert.equal(e.behavioralKind, "passive");
  assert.equal(e.knob, null);
  assert.equal(e.wired, false);
  assert.equal(e.curated, false);
});

test("enrichHook: CURATED classes win over the name-classifier (conf 1.0, curated=true, multi-class)", () => {
  // node-card-prefetch-inject matches no fakeClassify keyword -> conf 0 (would be universal);
  // the curated attribution must OVERRIDE that to conf 1.0 with ALL curated classes recorded
  // (this is the whole point: a hand-curated multi-class hook beats a conf-0 name-classifier).
  const reg = { id: "node-card-prefetch-inject", description: "prefetch node cards by id", wired: true, events: [{ event: "UserPromptSubmit" }] };
  const e = enrichHook(reg, "out.hookSpecificOutput={additionalContext:x}", fakeClassify, ["review", "build", "session"]);
  assert.equal(e.taskClass, "review");          // primary = first curated class
  assert.deepEqual(e.curatedClasses, ["review", "build", "session"]);  // ALL recorded
  assert.equal(e.classConf, 1);
  assert.equal(e.curated, true);
  // without the curated arg it falls back to the classifier (conf 0 here -> universal), no curatedClasses
  const e2 = enrichHook(reg, "additionalContext", fakeClassify);
  assert.equal(e2.curated, false);
  assert.equal(e2.classConf, 0);
  assert.deepEqual(e2.curatedClasses, []);
});

// ---- curatedClassMap -------------------------------------------------------

test("curatedClassMap: maps each hook to ALL classes that list it (multi-bucket), policy-order, strips /", () => {
  const policy = {
    locate: { hooks: ["master-index-precheck-inject", "/cag-router-inject"] },
    build: { hooks: ["duplication-hard-block", "scrutinize-before-stop"] },
    review: { hooks: ["cag-router-inject", "scrutinize-before-stop"] },
    session: { hooks: ["scrutinize-before-stop"] },
  };
  const m = curatedClassMap(policy);
  assert.deepEqual(m["master-index-precheck-inject"], ["locate"]);
  assert.deepEqual(m["cag-router-inject"], ["locate", "review"]);          // BOTH classes, policy order
  assert.deepEqual(m["duplication-hard-block"], ["build"]);
  assert.deepEqual(m["scrutinize-before-stop"], ["build", "review", "session"]);  // all 3, deduped, policy order
});

test("curatedClassMap: malformed/empty policy -> {}", () => {
  assert.deepEqual(curatedClassMap(null), {});
  assert.deepEqual(curatedClassMap({}), {});
  assert.deepEqual(curatedClassMap({ build: {} }), {});   // no hooks array
});

// ---- aggregateCatalog ------------------------------------------------------

function rec(over) {
  return {
    id: "h", wired: true, tier: null, events: ["UserPromptSubmit"],
    behavioralKind: "advisory-inject", taskClass: "build", classConf: 0.5, knob: null, ...over,
  };
}

test("aggregateCatalog: sum(byKind) === totalRecords (no record lost)", () => {
  const records = [
    rec({ behavioralKind: "block-gate" }),
    rec({ behavioralKind: "advisory-inject" }),
    rec({ behavioralKind: "mutator" }),
    rec({ behavioralKind: "passive" }),
  ];
  const a = aggregateCatalog(records);
  const sum = Object.values(a.byKind).reduce((s, n) => s + n, 0);
  assert.equal(sum, records.length);
  assert.equal(a.totalRecords, 4);
  assert.equal(a.automated, 1);  // block-gate
  assert.equal(a.advisory, 1);   // advisory-inject
});

test("aggregateCatalog: conf>0 -> byTaskClass; conf==0 wired actionable -> universalFeatures (NONE dropped)", () => {
  const records = [
    rec({ id: "gate", behavioralKind: "block-gate", taskClass: "build", classConf: 0.5, wired: true }),
    rec({ id: "advis", behavioralKind: "advisory-inject", taskClass: "build", classConf: 0.5, wired: true }),
    rec({ id: "orphan-gate", behavioralKind: "block-gate", taskClass: "build", classConf: 0.5, wired: false }), // unwired -> excluded from BOTH buckets
    rec({ id: "mut", behavioralKind: "mutator", taskClass: "build", classConf: 0.5, wired: true }),             // not actionable -> excluded
    rec({ id: "uni-gate", behavioralKind: "block-gate", taskClass: "build", classConf: 0, wired: true }),       // conf 0 -> UNIVERSAL (scrutiny P1: NOT dropped)
    rec({ id: "uni-advis", behavioralKind: "advisory-inject", taskClass: "build", classConf: 0, wired: true }), // conf 0 -> UNIVERSAL
    rec({ id: "rev", behavioralKind: "advisory-inject", taskClass: "review", classConf: 0.75, wired: true }),
  ];
  const a = aggregateCatalog(records);
  assert.deepEqual(a.byTaskClass.build.map((f) => f.id), ["gate", "advis"]); // gate (block) sorts before advis
  assert.equal(a.byTaskClass.review[0].id, "rev");
  // conf-0 wired actionable now land in universalFeatures (gate before advis), NOT dropped
  assert.deepEqual(a.universalFeatures.map((f) => f.id), ["uni-gate", "uni-advis"]);
  // conservation: class-specific + universal === actionableWired (only orphan-gate + mut excluded)
  assert.equal(a.classSpecificCount + a.universalCount, a.actionableWired);
  assert.equal(a.actionableWired, 5); // gate, advis, uni-gate, uni-advis, rev
  // unwired + non-actionable never appear in either bucket
  const allIds = [...Object.values(a.byTaskClass).flat(), ...a.universalFeatures].map((f) => f.id);
  assert.ok(!allIds.includes("orphan-gate") && !allIds.includes("mut"));
});

test("aggregateCatalog: NO wired block-gate is ever dropped (the scrutiny-P1 invariant)", () => {
  // every wired block-gate must be findable in byTaskClass OR universalFeatures,
  // regardless of classConf -- a chat must never be blind to a hard stop.
  const records = [
    rec({ id: "g0", behavioralKind: "block-gate", classConf: 0, wired: true }),
    rec({ id: "g1", behavioralKind: "block-gate", taskClass: "review", classConf: 0.9, wired: true }),
  ];
  const a = aggregateCatalog(records);
  const present = new Set([...Object.values(a.byTaskClass).flat(), ...a.universalFeatures].map((f) => f.id));
  assert.ok(present.has("g0") && present.has("g1"));
});

test("aggregateCatalog: a curated MULTI-class hook lands in EVERY class bucket but counts ONCE (distinct conservation)", () => {
  const records = [
    // curated into 3 classes -> appears in build+review+session buckets, counted once
    rec({ id: "scrutinize-before-stop", behavioralKind: "block-gate", classConf: 1, curated: true, curatedClasses: ["build", "review", "session"], wired: true }),
    rec({ id: "solo", behavioralKind: "advisory-inject", taskClass: "fix", classConf: 0.5, wired: true }),
    rec({ id: "uni", behavioralKind: "advisory-inject", classConf: 0, wired: true }),
  ];
  const a = aggregateCatalog(records);
  // present in ALL THREE class buckets (review no longer shows gate 0)
  for (const cls of ["build", "review", "session"]) {
    assert.ok(a.byTaskClass[cls].some((f) => f.id === "scrutinize-before-stop"), `must appear in ${cls}`);
  }
  // distinct conservation holds despite 3 placements + 1 solo + 1 universal
  assert.equal(a.actionableWired, 3);
  assert.equal(a.classSpecificCount, 2);   // distinct: scrutinize-before-stop + solo
  assert.equal(a.universalCount, 1);        // uni
  assert.equal(a.classSpecificCount + a.universalCount, a.actionableWired);  // 2+1===3
  assert.equal(a.classPlacements, 4);       // 3 (multi-class) + 1 (solo) -- exceeds distinct, as expected
});

test("aggregateCatalog: block-gate sorts before advisory-inject within a class", () => {
  const records = [
    rec({ id: "z-advis", behavioralKind: "advisory-inject", classConf: 0.5 }),
    rec({ id: "a-gate", behavioralKind: "block-gate", classConf: 0.5 }),
  ];
  const a = aggregateCatalog(records);
  assert.deepEqual(a.byTaskClass.build.map((f) => f.kind), ["block-gate", "advisory-inject"]);
});

test("aggregateCatalog: withKnob counts knobbed records", () => {
  const records = [rec({ knob: "PRISM_X_DISABLE" }), rec({ knob: null }), rec({ knob: "PRISM_Y_DISABLE" })];
  assert.equal(aggregateCatalog(records).withKnob, 2);
});
