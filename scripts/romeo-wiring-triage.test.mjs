/**
 * romeo-wiring-triage.test.mjs -- pins the wiring-triage classification (slot:romeo).
 *
 * The harness partitions unwired engines into WIREABLE / CROSS-DOMAIN / WIRE-EXEMPT /
 * NEEDS-REVIEW. These assertions fail LOUD if the classification drifts -- e.g. an
 * internal-layer Bridge engine silently becomes WIREABLE, a DI engine is no longer
 * caught, or the ctor-arg parser regresses.
 *
 * DESIGN (2026-06-17 rewrite, slot:romeo): the prior suite pinned a TRANSIENT backlog
 * snapshot -- a `total >= 40` magnitude floor and four named engines (CounterfactualMill,
 * TransferLearningAdapter, EmbeddingGuard, MITCourseIntegration) -- so it went 5/8 RED the
 * moment the fleet wired the backlog down to 18 (the test failed *because romeo succeeded*).
 * The logic is now pinned by (a) PURE ctor-parser unit tests over synthetic source (no
 * disk, never rots) and (b) direct classify() calls (the engine .ts persists on disk even
 * after it is wired out of the live audit). The live end-to-end run only asserts
 * backlog-SIZE-ROBUST invariants (partition completeness against the live audit count).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  countRequiredCtorArgs,
  extractCtorParamList,
  isOptionalCtorParam,
  classify,
  engineConstructability,
  alreadyDispatcherWired,
  stripDispatcherComments,
} from "./romeo-wiring-triage.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RUN_TIMEOUT_MS = 60000;

function runJson() {
  // process.execPath (the live node binary), NOT bare "node" -- spawnSync can't resolve "node"
  // from PATH on Windows in some shells (ENOENT). --json => no file write, prints the partition.
  const out = execFileSync(process.execPath, [resolve(REPO, "scripts", "romeo-wiring-triage.mjs"), "--json"], {
    cwd: REPO, encoding: "utf8", timeout: RUN_TIMEOUT_MS,
  });
  return JSON.parse(out);
}

// ── ctor-arg parser (pure, synthetic source -- never depends on the live backlog) ──

test("countRequiredCtorArgs: zero-arg and empty constructors -> 0", () => {
  assert.equal(countRequiredCtorArgs("class X { constructor() {} }"), 0);
  assert.equal(countRequiredCtorArgs("class X { }"), 0, "no constructor -> 0");
});

test("countRequiredCtorArgs: positional required args counted", () => {
  assert.equal(countRequiredCtorArgs("constructor(a: T, b: U) {"), 2);
  assert.equal(countRequiredCtorArgs("constructor(private readonly a: T) {"), 1);
});

test("countRequiredCtorArgs: optional (?) and defaulted (=) params are NOT required", () => {
  assert.equal(countRequiredCtorArgs("constructor(a: T, b?: U) {"), 1, "b? optional");
  assert.equal(countRequiredCtorArgs("constructor(a: T = 5) {"), 0, "default => optional");
  assert.equal(countRequiredCtorArgs("constructor(a?: T, b?: U) {"), 0, "all optional");
});

test("REGRESSION: object param with optional FIELDS is still 1 REQUIRED arg (NXOpen bug)", () => {
  // The old parser did `match(/constructor\(([^)]*)\)/).split(",").filter(!/[?=]/)`:
  //  - object fields are `;`-separated -> the whole object is ONE segment (no comma split)
  //  - the segment contains `?` (from `clock?` field) -> filtered out -> ctorArgs 0 -> WIREABLE.
  // The required `opts` object must count as 1 required arg regardless of optional fields.
  const objCtor = "constructor(opts: {\n  assemblyTransport: A;\n  drawingTransport: B;\n  clock?: C;\n  maxEventLog?: number;\n}) {";
  assert.equal(countRequiredCtorArgs(objCtor), 1, "required opts object despite optional fields");
  // ...but an object param WITH a default is optional:
  assert.equal(countRequiredCtorArgs("constructor(opts: { a: A; b?: B } = {}) {"), 0, "defaulted object => optional");
});

test("countRequiredCtorArgs: arrow-type and generic params do not truncate / under-count", () => {
  // `)` inside `() => void` must not truncate the param list (old `[^)]*` regex did).
  assert.equal(countRequiredCtorArgs("constructor(cb: () => void) {"), 1, "arrow type required");
  assert.equal(countRequiredCtorArgs("constructor(a: T, cb: () => void = noop) {"), 1, "a required, cb defaulted");
  // generic with internal comma: angle brackets ignored => may over-count, which is FAIL-SAFE
  // (more required args => NEEDS-REVIEW, never a false WIREABLE).
  assert.ok(countRequiredCtorArgs("constructor(cache: Map<string, T>) {") >= 1, "generic param still required (>=1)");
});

test("extractCtorParamList: balanced extraction across nested () {} and multiline", () => {
  assert.equal(extractCtorParamList("constructor(a: T) {").trim(), "a: T");
  assert.equal(extractCtorParamList("class X {}"), null, "no constructor -> null");
  const inner = extractCtorParamList("constructor(opts: { a: A; b: B }) {");
  assert.match(inner, /opts: \{ a: A; b: B \}/);
});

test("isOptionalCtorParam: name-`?` and top-level `=` are optional; type-internal markers are not", () => {
  assert.equal(isOptionalCtorParam("a: T"), false);
  assert.equal(isOptionalCtorParam("a?: T"), true);
  assert.equal(isOptionalCtorParam("a: T = 5"), true);
  assert.equal(isOptionalCtorParam("opts: { clock?: C }"), false, "optional FIELD does not make the param optional");
  assert.equal(isOptionalCtorParam("cb: () => void"), false, "`=>` is not a default");
});

// ── classify() logic on REAL engines (disk read; robust to wired-status, the .ts persists) ──

test("REGRESSION: NXOpenAssemblyDrawingEngine (DI engine) is NEEDS-REVIEW, never WIREABLE", () => {
  // The exact false-WIREABLE the ctor-parser fix corrects: its constructor takes a REQUIRED
  // `opts` object (injected transports). It has no exported zero-arg singleton -> not a clean wire.
  const c = classify("NXOpenAssemblyDrawingEngine", "UNKNOWN");
  assert.equal(c.verdict, "NEEDS-REVIEW", `NXOpen must be NEEDS-REVIEW, got ${c.verdict} (${c.reason})`);
  const ec = engineConstructability("NXOpenAssemblyDrawingEngine");
  assert.ok(ec.ctorArgs >= 1, `NXOpen ctorArgs must be >=1, got ${ec.ctorArgs}`);
  assert.equal(ec.singleton, false, "NXOpen has no zero-arg singleton export");
});

test("zero-arg singleton detection works (the WIREABLE precondition); a wired singleton is ALREADY-WIRED", () => {
  // CounterfactualMillEngine: `export const counterfactualMillEngine = new CounterfactualMillEngine()`.
  // The parser must detect the zero-arg singleton (the precondition for WIREABLE)...
  const ec = engineConstructability("CounterfactualMillEngine");
  assert.equal(ec.singleton, true, "zero-arg singleton must be detected");
  assert.equal(ec.ctorArgs, 0, "zero-arg constructor");
  // ...but it has since been WIRED into a dispatcher, so classify() now correctly returns
  // ALREADY-WIRED (the guard supersedes a stale WIREABLE verdict; never re-wire a wired engine).
  assert.equal(classify("CounterfactualMillEngine", "UNKNOWN").verdict, "ALREADY-WIRED");
});

test("internal-layer Bridge/Adapter/Client engines are WIRE-EXEMPT (name-only rule)", () => {
  // Real still-exempt bridges + synthetic suffixes (synthetic names never collide with the
  // dispatcher corpus, so they isolate the name-suffix rule from the ALREADY-WIRED guard).
  for (const n of ["CreoToolkitBridgeEngine", "RhinoCommonBridgeEngine", "DeepSeekClientEngine", "ZzSyntheticAdapterEngine", "ZzSyntheticClientEngine"]) {
    assert.equal(classify(n, "UNKNOWN").verdict, "WIRE-EXEMPT", `${n} must be WIRE-EXEMPT`);
  }
});

test("AI/owner-internal engines are CROSS-DOMAIN (name-only rule), owner named", () => {
  // WEDMLoRADatasetBuilderEngine (real, not dispatcher-wired) + a synthetic neural engine.
  for (const n of ["WEDMLoRADatasetBuilderEngine", "ZzNeuralSyntheticEngine"]) {
    const c = classify(n, "UNKNOWN");
    assert.equal(c.verdict, "CROSS-DOMAIN", `${n} must be CROSS-DOMAIN, got ${c.verdict}`);
    assert.ok(c.owner, "cross-domain must name an owner slot");
  }
});

test("an engine whose suggested dispatcher has no file is NEEDS-REVIEW", () => {
  // a 'course/academy' engine -> prism_academy, which has no dispatcher file -> blocked on lima.
  // Synthetic name: isolates the dispatcher-missing rule (returns before any disk read).
  const c = classify("ZzCourseSyntheticEngine", "UNKNOWN");
  assert.equal(c.verdict, "NEEDS-REVIEW", `got ${c.verdict}`);
});

test("REGRESSION: an engine already routed by a dispatcher is ALREADY-WIRED (audit false-negative), not a romeo wire", () => {
  // XProcNeuralAutoFireEngine is wired via aiReasoningDispatcher xproc_autofire_* routes
  // (import(".../XProcNeuralAutoFireEngine.js").xProcNeuralAutoFireDispatch), but the audit
  // lists it UNWIRED. classify() must catch this BEFORE its cross-domain rule so romeo never
  // double-wires it and the audit miss is surfaced for tango.
  assert.equal(alreadyDispatcherWired("XProcNeuralAutoFireEngine"), true, "XProc has a live dispatcher route");
  const c = classify("XProcNeuralAutoFireEngine", "UNKNOWN");
  assert.equal(c.verdict, "ALREADY-WIRED", `XProc must be ALREADY-WIRED, got ${c.verdict}`);
  assert.equal(c.owner, "tango", "owner flagged to tango (audit fix)");
});

test("stripDispatcherComments removes commented imports, keeps live imports + URLs (directly exercises the strip)", () => {
  // a COMMENTED-OUT import must be stripped (so it is not mistaken for a live wire)...
  assert.doesNotMatch(stripDispatcherComments('// import("../../engines/Ghost.js")'), /Ghost\.js/);
  assert.doesNotMatch(stripDispatcherComments('/* import("../../engines/Block.js") */'), /Block\.js/);
  // ...a LIVE import with a trailing comment must survive...
  assert.match(stripDispatcherComments('import("../../engines/Live.js"); // note'), /Live\.js/);
  // ...and `://` URLs must NOT be mangled by the line-comment strip.
  assert.match(stripDispatcherComments('const u = "https://example.com/x";'), /https:\/\/example\.com\/x/);
});

test("comment-only reference does NOT count as wired (reactiveChainBootstrap stays WIRE-EXEMPT)", () => {
  // aiReasoningDispatcher has `// Skipped (3): ... reactiveChainBootstrap` -- a COMMENT, not a route.
  assert.equal(alreadyDispatcherWired("reactiveChainBootstrap"), false, "comment ref is not a live wire");
  assert.equal(classify("reactiveChainBootstrap", "UNKNOWN").verdict, "WIRE-EXEMPT");
});

test("a genuinely-unreferenced engine is NOT flagged ALREADY-WIRED", () => {
  // CreoToolkitBridgeEngine is a pure internal-layer bridge with no dispatcher route.
  assert.equal(alreadyDispatcherWired("CreoToolkitBridgeEngine"), false);
});

test("REGRESSION: alreadyDispatcherWired is boundary-anchored -- a strict SUFFIX must NOT false-positive", () => {
  // The match must require a path-separator/quote before the name. An unanchored substring match
  // wrongly flagged a strict suffix as ALREADY-WIRED (scrutiny arm-C P1) -> would silently hide a
  // real romeo wire. Tested against a SYNTHETIC corpus so it does not depend on which real engines
  // happen to exist (QuoteEngine/RegressionEngine/etc. turned out to be REAL wired engines, not
  // pure suffixes -- the anchoring lets a real `/Name.js` match while rejecting a glued suffix).
  const corpus = 'a(); import("../../engines/SuperFooEngine.js"); b();';
  assert.equal(alreadyDispatcherWired("FooEngine", corpus), false, "strict suffix of SuperFooEngine.js must NOT match");
  assert.equal(alreadyDispatcherWired("SuperFooEngine", corpus), true, "the real /Name.js import matches");
  assert.equal(alreadyDispatcherWired("BarEngine", '"BarEngine.js"'), true, "quote-delimited import anchors");
  assert.equal(alreadyDispatcherWired("BarEngine", 'XBarEngine.js'), false, "no separator before name => no match");
});

test("alreadyDispatcherWired flags the genuinely-wired XProc on the LIVE dispatcher corpus", () => {
  assert.equal(alreadyDispatcherWired("XProcNeuralAutoFireEngine"), true);
});

// ── live end-to-end: backlog-SIZE-ROBUST invariants (no magnitude floor, no named engines) ──

test("partition is complete + matches the live audit count (no engine lost/double-counted)", () => {
  const r = runJson();
  const sum = r.wireable.length + r.crossDomain.length + r.exempt.length + r.review.length + (r.alreadyWired ?? []).length;
  assert.equal(sum, r.total, "every audited engine lands in exactly one bucket");
  const auditCount = (JSON.parse(readFileSync(r.auditPath, "utf8")).unwiredEngines ?? []).length;
  assert.equal(r.total, auditCount, "total must equal the live audit's unwiredEngines length");
  assert.ok(r.total >= 0, "total is a non-negative count");
});

test("every WIREABLE is a verified zero-arg singleton with an existing prism_* home", () => {
  const r = runJson();
  for (const w of r.wireable) {
    assert.match(w.disp ?? "", /^prism_/, `${w.engine} WIREABLE but disp=${w.disp}`);
    assert.doesNotMatch(w.engine, /(Adapter|Bridge|Client|Shim)(Engine)?$/, `${w.engine} is internal-layer but WIREABLE`);
    const ec = engineConstructability(w.engine);
    assert.ok(ec.singleton || ec.ctorArgs === 0, `${w.engine} WIREABLE but not zero-arg-constructible (singleton=${ec.singleton}, ctorArgs=${ec.ctorArgs})`);
  }
});

test("NXOpen is NOT in the live WIREABLE bucket (false-WIREABLE regression guard)", () => {
  const r = runJson();
  assert.ok(!r.wireable.find((w) => w.engine === "NXOpenAssemblyDrawingEngine"), "NXOpen must not be WIREABLE in the live run");
});

test("CROSS-DOMAIN names an owner; NEEDS-REVIEW has a reason", () => {
  const r = runJson();
  for (const c of r.crossDomain) assert.ok(c.owner, `${c.engine} cross-domain must name an owner`);
  for (const n of r.review) assert.ok(n.reason, `${n.engine} needs-review must carry a reason`);
});

test("the partition is DETERMINISTIC across repeated runs (no fail-open flakiness)", () => {
  // REGRESSION GUARD (scrutiny arm-A P1, 2026-06-14): engineConstructability used to fail OPEN on a
  // transient FS read failure -> a DI engine flipped to WIREABLE, making the partition
  // non-deterministic. Re-running must yield the identical partition + WIREABLE set.
  const a = runJson();
  const b = runJson();
  const sig = (r) => `${r.wireable.length}/${r.crossDomain.length}/${r.exempt.length}/${r.review.length}`;
  assert.equal(sig(a), sig(b), `partition not deterministic: ${sig(a)} vs ${sig(b)}`);
  const setOf = (r) => r.wireable.map((x) => x.engine).sort().join(",");
  assert.equal(setOf(a), setOf(b), "WIREABLE set drifted between runs");
});
