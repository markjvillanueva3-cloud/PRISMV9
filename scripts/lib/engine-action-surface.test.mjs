/**
 * Tests for engine-action-surface.mjs (AI-SYSTEMS-GNN, slot:india 2026-06-21).
 * Real reference-value / algebraic-invariant assertions (R9): every test fails if
 * the case-body parse, the inverse-map build, the leak-free empty-for-unwired rule,
 * or the text projection regresses. Pure functions tested on synthetic dispatcher
 * source; one live-data invariant test against the real dispatcher dir.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractActionLabels,
  actionEngineRefsFromSource,
  buildActionSurfaceMap,
  engineStemFromNodeId,
  actionSurfaceText,
  CASE_BODY_CAP,
} from "./engine-action-surface.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REAL_DISP_DIR = path.resolve(HERE, "..", "..", "mcp-server", "src", "tools", "dispatchers");

// A realistic two-action dispatcher switch fragment.
const SRC = `
export async function fooDispatcher(action, params) {
  const helperEngine = getHelper(); // BEFORE any case -- must NOT attribute to an action
  switch (action) {
    case "force_calc": {
      const r = await kienzleEngine.compute(params);
      return r;
    }
    case "thermal_map":
      return new ThermalEngine().run(params);
    case "noop_action":
      return { ok: true };
    default:
      throw new Error("unknown");
  }
}
`;

// ---- extractActionLabels ----
test("extractActionLabels: finds every case label in order; non-string -> []", () => {
  const labels = extractActionLabels(SRC).map((l) => l.name);
  assert.deepEqual(labels, ["force_calc", "thermal_map", "noop_action"]);
  assert.deepEqual(extractActionLabels(null), []);
  // single + double quotes both match
  assert.deepEqual(extractActionLabels(`case 'a_x': ; case "b_y":`).map((l) => l.name), ["a_x", "b_y"]);
});

// ---- actionEngineRefsFromSource: happy ----
test("actionEngineRefsFromSource happy: lowerCamelEngine + new PascalEngine attributed to the right action", () => {
  const refs = actionEngineRefsFromSource(SRC);
  const byAction = Object.fromEntries(refs.map((r) => [r.action, [...r.engines].sort()]));
  assert.deepEqual(byAction.force_calc, ["kienzleengine"]);
  assert.deepEqual(byAction.thermal_map, ["thermalengine"]);
  assert.deepEqual(byAction.noop_action, []); // a real action with no engine -> empty set
});

// ---- actionEngineRefsFromSource: failure / leak-safety ----
test("actionEngineRefsFromSource failure 1: an engine ref BEFORE the first case is never attributed", () => {
  const refs = actionEngineRefsFromSource(SRC);
  for (const r of refs) assert.ok(!r.engines.has("helperengine"), "pre-case helperEngine must not leak into any action");
});

test("actionEngineRefsFromSource failure 2: a case body stops at the next case (no cross-case leak)", () => {
  const src = `switch(a){ case "first": doThing(); break;\n case "second": return otherEngine.go(); }`;
  const byAction = Object.fromEntries(actionEngineRefsFromSource(src).map((r) => [r.action, [...r.engines]]));
  assert.deepEqual(byAction.first, []);                 // otherEngine belongs to "second", not "first"
  assert.deepEqual(byAction.second, ["otherengine"]);
});

test("actionEngineRefsFromSource failure 3: empty / non-string -> []", () => {
  assert.deepEqual(actionEngineRefsFromSource(""), []);
  assert.deepEqual(actionEngineRefsFromSource(undefined), []);
});

// ---- actionEngineRefsFromSource: adversarial ----
test("actionEngineRefsFromSource adversarial 1: regex-special action name does not crash + is captured", () => {
  // action names are [A-Za-z0-9_.] so a dot is legal; ensure the dot label parses
  const src = `switch(a){ case "ns.sub_action": return fancyEngine.x(); }`;
  const refs = actionEngineRefsFromSource(src);
  assert.equal(refs.length, 1);
  assert.equal(refs[0].action, "ns.sub_action");
  assert.deepEqual([...refs[0].engines], ["fancyengine"]);
});

test("actionEngineRefsFromSource adversarial 2: a runaway case body is capped at CASE_BODY_CAP", () => {
  // engine ref placed JUST PAST the cap must not be attributed (bounds the scan)
  const filler = "x".repeat(CASE_BODY_CAP + 50);
  const src = `switch(a){ case "big": ${filler} farEngine.y(); }`;
  const refs = actionEngineRefsFromSource(src);
  assert.deepEqual([...refs[0].engines], [], "engine beyond CASE_BODY_CAP must not be attributed");
});

test("actionEngineRefsFromSource adversarial 3 (R12 precision): a helper CALL like getEngine(name) is NOT an engine; only method-access counts", () => {
  const src = `switch(a){ case "real": { const e = getEngine(params.name); return kienzleEngine.compute(e); } }`;
  const refs = actionEngineRefsFromSource(src);
  const engines = [...refs[0].engines];
  assert.ok(!engines.includes("getengine"), "getEngine(...) helper call must NOT be attributed");
  assert.deepEqual(engines, ["kienzleengine"], "only the .method()-accessed singleton counts");
  // optional-chaining method access still counts
  const oc = actionEngineRefsFromSource(`switch(a){ case "x": return fooEngine?.bar(); }`);
  assert.deepEqual([...oc[0].engines], ["fooengine"]);
});

test("actionEngineRefsFromSource adversarial 4 (arm-A P2 recall): PascalCase STATIC method-call counts; type/constant positions do not", () => {
  const src = `switch(a){ case "s": {
    const r = ThermalEngine.calc(p);          // static method call -> counts
    const i = ConfigEngine.getInstance();     // static method call -> counts
    const t = ReturnEngine.SomeType;          // TYPE position (uppercase after dot) -> NOT
    const c = SettingEngine.MAX_CONFIG;        // CONSTANT (no call) -> NOT
    return new BuiltEngine().go();             // construction -> counts via NEW_ENGINE_RE
  } }`;
  const engines = [...actionEngineRefsFromSource(src)[0].engines].sort();
  assert.deepEqual(engines, ["builtengine", "configengine", "thermalengine"]);
  assert.ok(!engines.includes("returnengine"), "type-position XEngine.SomeType must NOT count");
  assert.ok(!engines.includes("settingengine"), "constant XEngine.CONST must NOT count");
});

// ---- buildActionSurfaceMap (DI'd fs) ----
test("buildActionSurfaceMap: inverts to engine->actions across files; skips .test.ts/.d.ts; fail-soft", () => {
  const files = {
    "a.ts": `switch(x){ case "a1": return kienzleEngine.f(); case "a2": return kienzleEngine.g(); }`,
    "b.ts": `switch(x){ case "b1": return new ThermalEngine().h(); }`,
    "a.test.ts": `switch(x){ case "junk": return shouldNotCountEngine.z(); }`,
    "t.d.ts": `declare const x: number;`,
  };
  const fakeFs = {
    readdirSync: (d) => { if (d !== "/disp") throw new Error("ENOENT"); return Object.keys(files); },
    readFileSync: (p) => { const v = files[p.split(/[\\/]/).pop()]; if (v == null) throw new Error("ENOENT"); return v; },
  };
  const map = buildActionSurfaceMap("/disp", fakeFs);
  assert.deepEqual([...(map.get("kienzleengine") || [])].sort(), ["a1", "a2"]);
  assert.deepEqual([...(map.get("thermalengine") || [])], ["b1"]);
  assert.ok(!map.has("shouldnotcountengine"), ".test.ts must be skipped");
  // fail-soft: unreadable dir -> empty map
  assert.equal(buildActionSurfaceMap("/nope", fakeFs).size, 0);
});

// ---- engineStemFromNodeId ----
test("engineStemFromNodeId: eng.<domain>.<Name> -> lowered stem; non-engine -> ''", () => {
  assert.equal(engineStemFromNodeId("eng.calc.KienzleEngine"), "kienzleengine");
  assert.equal(engineStemFromNodeId("eng.cam.toolpath.HSMEngine"), "toolpath.hsmengine");
  assert.equal(engineStemFromNodeId("disp.calc"), "");
  assert.equal(engineStemFromNodeId(null), "");
});

// ---- actionSurfaceText ----
test("actionSurfaceText: sorted+deduped, _->space, suffix-tolerant; '' for unwired ghost + non-map", () => {
  const map = new Map([["kienzleengine", new Set(["force_calc", "deflection_calc"])]]);
  // sorted (deflection before force), underscores -> spaces
  assert.equal(actionSurfaceText(map, "kienzleengine"), "deflection calc force calc");
  // suffix-less handle resolves via the <stem>engine fallback
  assert.equal(actionSurfaceText(map, "kienzle"), "deflection calc force calc");
  // unwired ghost (no actions) -> empty BY DESIGN (the leak-free contract)
  assert.equal(actionSurfaceText(map, "someunwiredghost"), "");
  assert.equal(actionSurfaceText(null, "kienzle"), "");
  assert.equal(actionSurfaceText(map, ""), "");
});

// ---- live-data invariant (real dispatcher dir) ----
test("buildActionSurfaceMap on the REAL dispatcher dir: non-trivial, every value a non-empty action set", () => {
  const map = buildActionSurfaceMap(REAL_DISP_DIR);
  assert.ok(map.size > 20, `expected many engines with an action surface, got ${map.size}`);
  let totalLinks = 0;
  for (const [eng, acts] of map) {
    assert.ok(acts instanceof Set && acts.size > 0, `engine ${eng} must map to a non-empty action set`);
    totalLinks += acts.size;
  }
  assert.ok(totalLinks > map.size, "expected some engines to back multiple actions");
  // the highest-degree engine must produce non-empty embeddable text
  const top = [...map.entries()].sort((a, b) => b[1].size - a[1].size)[0];
  assert.ok(actionSurfaceText(map, top[0]).length > 0, "top engine must yield non-empty action-surface text");
});
