/**
 * Tests for audit-dispatcher-engine-methods.mjs
 * (U-DISPATCHER-ENGINE-METHOD-AUDIT, slot:bravo 2026-06-22).
 *
 * Real behavioral invariants on the pure core via an injected readFile (no disk):
 *  - a handler calling a method the engine does NOT define -> MISSING (actionable)
 *  - a handler calling a method the engine DOES define -> LIVE (not flagged)
 *  - a method inherited from a resolvable base class -> LIVE
 *  - a method absent but base class UNRESOLVABLE -> INDETERMINATE (never false-MISSING)
 *  - getEngine key not in the local map -> INDETERMINATE
 *  - arrow/field + object-literal method forms recognized
 *
 * Engine fixtures are MULTI-LINE (methods on their own lines) because the
 * detector's method regex is line-anchored on purpose -- so it never matches a
 * call-expression like `if (` or `bar(foo())`. Real engine files are always
 * multi-line; a one-line `class X { a(){} b(){} }` is not a realistic input.
 *
 * Run: node scripts/audit-dispatcher-engine-methods.test.mjs   (node:test auto-runs)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseGetEngineMap, parseGetEngineBindings, methodsCalledOnVar,
  parseEngineMethods, resolveEnginePath, analyzeDispatcher,
  nameSimilarity, rankCandidates,
} from "./audit-dispatcher-engine-methods.mjs";

const DISP = "/r/mcp-server/src/tools/dispatchers/testDispatcher.ts";
const pGood = resolveEnginePath("../../engines/Good.js", DISP)[0];
const pBad = resolveEnginePath("../../engines/Bad.js", DISP)[0];
const pChild = resolveEnginePath("../../engines/Child.js", DISP)[0];
const pBase = resolveEnginePath("./BaseEngine.js", pChild)[0];
const pOrphan = resolveEnginePath("../../engines/Orphan.js", DISP)[0];

const GOOD = `export class GoodEngine {\n  realMethod(p) { return p; }\n}\nexport const goodEngine = new GoodEngine();`;
const BAD = `export class BadEngine {\n  otherMethod(p) { return p; }\n}\nexport const badEngine = new BadEngine();`;
const CHILD = `import { BaseEngine } from "./BaseEngine.js";\nexport class ChildEngine extends BaseEngine {\n  ownMethod() {}\n}\nexport const childEngine = new ChildEngine();`;
const CHILD_NOIMPORT = `export class ChildEngine extends MysteryBase {\n  ownMethod() {}\n}\nexport const childEngine = new ChildEngine();`;
const BASE = `export class BaseEngine {\n  inheritedMethod() {}\n}`;
const ORPHAN = `export class OrphanEngine {\n  somethingMethod() {}\n}`;

function mockFS(map) {
  return (p) => {
    const norm = String(p).replace(/\\/g, "/");
    for (const [k, v] of Object.entries(map)) {
      if (String(k).replace(/\\/g, "/") === norm) return v;
    }
    return null;
  };
}

const DISPATCHER_SRC = `
function getEngine(k){return null;}
async function h(action, params){
  let result;
  switch(action){
    case "good": return _g ??= (await import("../../engines/Good.js")).goodEngine;
    case "bad": return _b ??= (await import("../../engines/Bad.js")).badEngine;
    case "child": return _c ??= (await import("../../engines/Child.js")).childEngine;
    case "orphan": return _o ??= (await import("../../engines/Orphan.js")).orphanEngine;
  }
}
async function run(){
  const e1 = await getEngine("good");  result = e1.realMethod(params);
  const e2 = await getEngine("bad");   result = e2.ghostMethod(params);
  const e3 = await getEngine("child"); result = e3.inheritedMethod(params);
  const e4 = await getEngine("orphan"); result = e4.somethingMethod(params);
  const e5 = await getEngine("nokey"); result = e5.whatever(params);
}
`;

test("parseGetEngineMap extracts key -> module path + export", () => {
  const m = parseGetEngineMap(`case "good": return _g ??= (await import("../../engines/Good.js")).goodEngine;`);
  assert.equal(m.get("good").modPath, "../../engines/Good.js");
  assert.equal(m.get("good").exportName, "goodEngine");
});

test("parseGetEngineBindings + methodsCalledOnVar attribute calls per var", () => {
  const src = `const e = await getEngine("good"); e.alpha(1); e.beta(2);`;
  const b = parseGetEngineBindings(src);
  assert.equal(b.length, 1);
  const methods = methodsCalledOnVar(src, "e", b[0].index, src.length);
  assert.ok(methods.has("alpha") && methods.has("beta"));
});

test("parseEngineMethods recognizes method, async, get, arrow-field, object-literal", () => {
  const cls = `export class X {\n  foo() {}\n  async bar() {}\n  get baz() { return 1; }\n  qux = (a) => a;\n  quux: (a) => a;\n}`;
  const r = parseEngineMethods(cls);
  for (const m of ["foo", "bar", "baz", "qux", "quux"]) assert.ok(r.methods.has(m), `missing ${m}`);
});

test("analyzeDispatcher: ghost method -> MISSING; real + inherited -> LIVE", () => {
  const fs = mockFS({ [pGood]: GOOD, [pBad]: BAD, [pChild]: CHILD, [pBase]: BASE /* pOrphan absent */ });
  const res = analyzeDispatcher({ file: DISP, src: DISPATCHER_SRC, readFile: fs });
  const missingPairs = res.missing.map(m => `${m.key}.${m.method}`);
  assert.ok(missingPairs.includes("bad.ghostMethod"), `expected bad.ghostMethod MISSING, got ${JSON.stringify(missingPairs)}`);
  assert.ok(!missingPairs.includes("good.realMethod"), "good.realMethod should be LIVE");
  assert.ok(!missingPairs.includes("child.inheritedMethod"), "inherited method should be LIVE via base resolution");
});

test("analyzeDispatcher: unreadable engine + unknown key -> INDETERMINATE, never MISSING", () => {
  const fs = mockFS({ [pGood]: GOOD, [pBad]: BAD, [pChild]: CHILD, [pBase]: BASE });
  const res = analyzeDispatcher({ file: DISP, src: DISPATCHER_SRC, readFile: fs });
  const missingPairs = res.missing.map(m => `${m.key}.${m.method}`);
  const indReasons = res.indeterminate.map(i => `${i.key}.${i.method}:${i.reason}`);
  assert.ok(!missingPairs.includes("orphan.somethingMethod"));
  assert.ok(indReasons.some(r => r.startsWith("orphan.somethingMethod")), JSON.stringify(indReasons));
  assert.ok(indReasons.some(r => r === "nokey.whatever:key-not-in-getEngine-map"), JSON.stringify(indReasons));
});

test("nameSimilarity: shared verb-head + bigram overlap scores higher than unrelated", () => {
  assert.ok(nameSimilarity("getStatistics", "getQueueStats") > nameSimilarity("getStatistics", "reset"));
  assert.ok(nameSimilarity("processDocument", "extractDocument") > nameSimilarity("processDocument", "reset"));
  assert.equal(nameSimilarity("", "x"), 0);
});

test("rankCandidates: advisory did-you-mean ranks the nearest method, drops unrelated, bounded", () => {
  const methods = ["getQueueStats", "getResult", "processImage", "reset", "registerImage"];
  const cands = rankCandidates("getStatistics", methods);
  assert.ok(cands.length >= 1, "expected at least one candidate");
  assert.equal(cands[0].method, "getQueueStats"); // shares get-head + stat/ts bigrams
  assert.ok(cands.every((c) => c.score >= 0.34 && c.score <= 1));
  assert.ok(!cands.some((c) => c.method === "reset"), "unrelated 'reset' must be dropped");
  // wholly-unrelated called name -> no high candidates
  assert.ok(rankCandidates("zzzQuux", methods).every((c) => c.score < 0.5));
  // limit is respected
  assert.ok(rankCandidates("getResultX", methods, 2).length <= 2);
});

test("analyzeDispatcher attaches advisory candidates to a MISSING finding", () => {
  const fs = mockFS({ [pGood]: GOOD, [pBad]: BAD, [pChild]: CHILD, [pBase]: BASE });
  const res = analyzeDispatcher({ file: DISP, src: DISPATCHER_SRC, readFile: fs });
  const bad = res.missing.find((m) => m.key === "bad" && m.method === "ghostMethod");
  assert.ok(bad, "bad.ghostMethod should be MISSING");
  assert.ok(Array.isArray(bad.candidates), "MISSING finding carries a candidates array");
});

test("analyzeDispatcher: method absent + base UNRESOLVABLE -> INDETERMINATE (no false MISSING)", () => {
  const fs = mockFS({ [pGood]: GOOD, [pBad]: BAD, [pChild]: CHILD_NOIMPORT, [pOrphan]: ORPHAN });
  const res = analyzeDispatcher({ file: DISP, src: DISPATCHER_SRC, readFile: fs });
  const missingPairs = res.missing.map(m => `${m.key}.${m.method}`);
  const indReasons = res.indeterminate.map(i => `${i.key}.${i.method}:${i.reason}`);
  assert.ok(!missingPairs.includes("child.inheritedMethod"), "must not false-MISSING when base unresolvable");
  assert.ok(indReasons.some(r => r === "child.inheritedMethod:unresolved-base-class"), JSON.stringify(indReasons));
});

// ---------------------------------------------------------------------------
// Object-literal singleton export recognition (FP-elimination tests)
// ---------------------------------------------------------------------------

// Shorthand keys: export const eng = { compute, technologyWizard, run }
const OBJ_SHORTHAND = [
  "export function compute(params) { return params; }",
  "export function technologyWizard(p) { return p; }",
  "export function run(p) { return p; }",
  "export const iMachiningEngine = { compute, technologyWizard, run };",
].join("\n");

// key:value keys: export const eng = { analyze: analyzeFn, run: runImpl }
const OBJ_KEYVALUE = [
  "function analyzeFn(p) { return p; }",
  "function runImpl(p) { return p; }",
  "export const analysisEngine = {",
  "  analyze: analyzeFn,",
  "  run: runImpl,",
  "};",
].join("\n");

// An object-literal engine that does NOT have a specific method (ghostMethod).
// ghostMethod must still be MISSING -- the patch must not over-widen.
const OBJ_NO_GHOST = [
  "export function realMethod(p) { return p; }",
  "export const singletonEngine = { realMethod };",
].join("\n");

const pObjShorthand = resolveEnginePath("../../engines/ObjShorthand.js", DISP)[0];
const pObjKeyValue = resolveEnginePath("../../engines/ObjKeyValue.js", DISP)[0];
const pObjNoGhost = resolveEnginePath("../../engines/ObjNoGhost.js", DISP)[0];

test("parseEngineMethods: object-literal shorthand keys are recognized as methods", () => {
  const r = parseEngineMethods(OBJ_SHORTHAND);
  assert.ok(r.shaped, "shaped must be true for object-literal engine");
  assert.ok(r.methods.has("compute"), "shorthand key 'compute' must be recognized");
  assert.ok(r.methods.has("technologyWizard"), "shorthand key 'technologyWizard' must be recognized");
  assert.ok(r.methods.has("run"), "shorthand key 'run' must be recognized");
});

test("parseEngineMethods: object-literal key:value entries are recognized as methods", () => {
  const r = parseEngineMethods(OBJ_KEYVALUE);
  assert.ok(r.shaped, "shaped must be true for object-literal engine");
  assert.ok(r.methods.has("analyze"), "key:value key 'analyze' must be recognized");
  assert.ok(r.methods.has("run"), "key:value key 'run' must be recognized");
});

test("parseEngineMethods: metadata-only key:value entries (string/array) are NOT added as methods", () => {
  const src = [
    "export const eng = {",
    "  name: \"MyEngine\",",
    "  version: \"1.0.0\",",
    "  actions: [\"foo\"],",
    "  realMethod,",
    "};",
    "export function realMethod(p) { return p; }",
  ].join("\n");
  const r = parseEngineMethods(src);
  assert.ok(!r.methods.has("name"), "string-valued key 'name' must not be a method");
  assert.ok(!r.methods.has("version"), "string-valued key 'version' must not be a method");
  assert.ok(!r.methods.has("actions"), "array-valued key 'actions' must not be a method");
  assert.ok(r.methods.has("realMethod"), "shorthand key 'realMethod' must still be recognized");
});

test("analyzeDispatcher: object-literal shorthand keys are LIVE (not false MISSING)", () => {
  const DISP_OBJ = `
function getEngine(k){return null;}
async function h(action, params){
  case "obj": return _o ??= (await import("../../engines/ObjShorthand.js")).iMachiningEngine;
}
async function run(){
  const eng = await getEngine("obj");
  result = eng.compute(params);
  result = eng.technologyWizard(params);
}`;
  const fs = mockFS({ [pObjShorthand]: OBJ_SHORTHAND });
  const res = analyzeDispatcher({ file: DISP, src: DISP_OBJ, readFile: fs });
  const missingPairs = res.missing.map(m => `${m.key}.${m.method}`);
  assert.ok(!missingPairs.includes("obj.compute"), "compute is a real shorthand key -- must be LIVE");
  assert.ok(!missingPairs.includes("obj.technologyWizard"), "technologyWizard is a real shorthand key -- must be LIVE");
});

test("analyzeDispatcher: object-literal key:value entries are LIVE (not false MISSING)", () => {
  const DISP_OBJ = `
function getEngine(k){return null;}
async function h(action, params){
  case "analysis": return _a ??= (await import("../../engines/ObjKeyValue.js")).analysisEngine;
}
async function run(){
  const eng = await getEngine("analysis");
  result = eng.analyze(params);
  result = eng.run(params);
}`;
  const fs = mockFS({ [pObjKeyValue]: OBJ_KEYVALUE });
  const res = analyzeDispatcher({ file: DISP, src: DISP_OBJ, readFile: fs });
  const missingPairs = res.missing.map(m => `${m.key}.${m.method}`);
  assert.ok(!missingPairs.includes("analysis.analyze"), "analyze is a real key:value entry -- must be LIVE");
  assert.ok(!missingPairs.includes("analysis.run"), "run is a real key:value entry -- must be LIVE");
});

test("analyzeDispatcher: genuinely-absent method on object-literal engine is still MISSING (no false-green)", () => {
  const DISP_OBJ = `
function getEngine(k){return null;}
async function h(action, params){
  case "singleton": return _s ??= (await import("../../engines/ObjNoGhost.js")).singletonEngine;
}
async function run(){
  const eng = await getEngine("singleton");
  result = eng.realMethod(params);
  result = eng.ghostMethod(params);
}`;
  const fs = mockFS({ [pObjNoGhost]: OBJ_NO_GHOST });
  const res = analyzeDispatcher({ file: DISP, src: DISP_OBJ, readFile: fs });
  const missingPairs = res.missing.map(m => `${m.key}.${m.method}`);
  assert.ok(!missingPairs.includes("singleton.realMethod"), "realMethod exists -- must be LIVE");
  assert.ok(missingPairs.includes("singleton.ghostMethod"), "ghostMethod is genuinely absent -- must be MISSING");
});

test("methodsCalledOnVar: method names in line comments are not collected", () => {
  // Regression for the inference_orch / millPartClassifier scope-window FP:
  // a comment referencing engine.classify() must not produce a finding.
  const src = "const engine = await getEngine(\"foo\"); // engine.classify() FAIL-LOUD\nresult = engine.infer(params);";
  const b = parseGetEngineBindings(src);
  assert.equal(b.length, 1);
  const methods = methodsCalledOnVar(src, "engine", b[0].index, src.length);
  assert.ok(methods.has("infer"), "real call engine.infer() must be collected");
  assert.ok(!methods.has("classify"), "classify appears only in a comment -- must NOT be collected");
});
