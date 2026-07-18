/**
 * Tests for cad-regen-stale-gens.mjs (slot:delta, U-CAD-REGEN-STALE-GENS). Fully hermetic -- every dep
 * (curvedDimCheck, the emitters, cadquery execution, fs) is injected, so NO real STEP parsing or cadquery
 * run is needed. Proves:
 *  - classifyStaged flags ONLY a stale-failing curved gen the deterministic emitter can reproduce;
 *  - healOneGen dry-run reports would-heal without writing;
 *  - healOneGen --write regenerates in place and reports HEALED when the fresh geometry passes;
 *  - a fresh gen that STILL fails is surfaced as still-failing, never counted as healed (R12);
 *  - exec failure and missing files are handled fail-soft.
 *   run: node --test scripts/cad-regen-stale-gens.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { classifyStaged, healOneGen } from "./cad-regen-stale-gens.mjs";

// dimsMm is an ARRAY [dia, length] to match the real emitters (cad-primitive-emit.mjs) so the parametric
// sidecar branch (paramsFromDims requires Array.isArray) actually runs -- an object silently no-ops it (arm-A).
const DET_EMIT = { code: "import cadquery as cq\n# ...", shape: "cylinder", dimsMm: [38.1, 19.05] };
// fake curvedDimCheck: a step containing "GOOD" is accurate, anything else is a 96%-off miss (the stale radius).
const fakeCurved = (_req, step) => String(step).includes("GOOD")
  ? { applicable: true, accurate: true, deltaPct: 0 }
  : { applicable: true, accurate: false, deltaPct: 96 };

// --- poison-code heal fixtures (validated by the REAL codeInvalidReason, not a mock) ---
// A clean deterministic emit (mirrors cad-primitive-emit tube output): import + STEP export + inch->mm evidence,
// NO divide-by-IN -> codeInvalidReason returns null.
const CLEAN_EMIT = { code: [
  "import cadquery as cq", "from cadquery import exporters", "import os",
  "# PRISM deterministic tube OD 25.02 ID 22.1 x 25.44 mm (IN=25.4)",
  'result = cq.Workplane("XY").circle(12.51).circle(11.05).extrude(25.44)',
  "exporters.export(result, os.environ.get('OUTPUT_STEP','out.step'))",
].join("\n"), shape: "tube", dimsMm: [25.02, 22.1, 25.44] };
// The live poison class: a CANCELLED divide-then-multiply -- dimensionally CORRECT (OD=25.02/IN then *IN = 25.02)
// yet codeInvalidReason flags the `= 25.02 / IN` as the 25.4x-undersize idiom, so it is excluded from training.
const CANCELLED_POISON_PY = [
  "import cadquery as cq", "from cadquery import exporters", "import os",
  "IN = 25.4", "OD = 25.02 / IN", "OD_MM = OD * IN",
  'result = cq.Workplane("XY").circle(OD_MM/2).extrude(25.44)',
  "exporters.export(result, os.environ.get('OUTPUT_STEP','out.step'))",
].join("\n");

function healDeps({ request = "a 38.1 mm diameter cylinder 19.05 mm long", startStep = "BAD-STEP", emit = DET_EMIT, execOk = true, execFlipsTo = "GOOD-STEP", hasStep = true, pyCode = "" } = {}) {
  const state = { step: startStep };
  const writes = {};
  return {
    _writes: writes, _state: state,
    readText: (p) => {
      const b = String(p).replace(/\\/g, "/").split("/").pop();
      if (b === "request.json") return JSON.stringify({ request });
      if (b === "model.step") return state.step;
      if (b === "model.py") { if (pyCode === null) throw new Error("ENOENT: no model.py"); return pyCode; } // null -> simulate a stage with no model.py
      if (b === "status.json") return "{}";
      return "";
    },
    existsSync: (p) => { const b = String(p).replace(/\\/g, "/").split("/").pop(); return b === "request.json" || (b === "model.step" && hasStep); },
    writeFileSync: (p, c) => { writes[String(p).replace(/\\/g, "/").split("/").pop()] = c; },
    execCadquery: () => { if (execOk) state.step = execFlipsTo; return execOk ? { ok: true } : { ok: false, reason: "python exit 1" }; },
    emitPrimitive: () => emit,
    emitFeature: () => null,
    curvedCheck: fakeCurved,
  };
}

// ---- classifyStaged (pure) ----
test("classifyStaged: flags a stale-failing curved gen the deterministic emitter can reproduce", () => {
  const c = classifyStaged("a 38.1 mm diameter cylinder 19.05 mm long", "BAD", { emitPrimitive: () => DET_EMIT, emitFeature: () => null, curvedCheck: fakeCurved });
  assert.equal(c.candidate, true);
  assert.equal(c.reason, "stale-failing-deterministic");
  assert.equal(c.shape, "cylinder");
  assert.equal(c.staged.deltaPct, 96);
});

test("classifyStaged: already-ok when the staged geometry passes", () => {
  const c = classifyStaged("a 38.1 mm diameter cylinder", "GOOD", { emitPrimitive: () => DET_EMIT, emitFeature: () => null, curvedCheck: fakeCurved });
  assert.equal(c.candidate, false);
  assert.equal(c.reason, "already-ok");
});

test("classifyStaged: not-curved-checkable when curvedDimCheck is not applicable", () => {
  const c = classifyStaged("a 50 mm cube", "BAD", { emitPrimitive: () => ({ code: "x", shape: "cube" }), emitFeature: () => null, curvedCheck: () => ({ applicable: false }) });
  assert.equal(c.candidate, false);
  assert.equal(c.reason, "not-curved-checkable");
});

test("classifyStaged: not-deterministic when no emitter can reproduce the part (LLM part)", () => {
  const c = classifyStaged("a turbine blisk with 48 curved blades", "BAD", { emitPrimitive: () => null, emitFeature: () => null, curvedCheck: fakeCurved });
  assert.equal(c.candidate, false);
  assert.equal(c.reason, "not-deterministic");
});

// ---- healOneGen (injected IO) ----
test("healOneGen: dry run reports would-heal and writes nothing", () => {
  const d = healDeps();
  const r = healOneGen("/g/cyl", { write: false, deps: d });
  assert.equal(r.outcome, "would-heal");
  assert.equal(r.stagedDeltaPct, 96);
  assert.equal(Object.keys(d._writes).length, 0, "dry run must not write");
});

test("healOneGen: --write regenerates in place and reports HEALED when the fresh geometry passes", () => {
  const d = healDeps({ startStep: "BAD-STEP", execFlipsTo: "GOOD-STEP" });
  const r = healOneGen("/g/cyl", { write: true, deps: d });
  assert.equal(r.outcome, "healed");
  assert.equal(r.beforeDeltaPct, 96);
  assert.equal(r.afterDeltaPct, 0);
  assert.ok(d._writes["model.py"], "model.py was overwritten with the fresh emit");
  assert.ok(d._writes["model.parametric.py"], "parametric sidecar refreshed on heal (array dimsMm exercises the branch)");
  assert.ok(d._writes["params.json"], "params.json sidecar refreshed on heal");
  const status = JSON.parse(d._writes["status.json"]);
  assert.equal(status.healed.accurate, true, "heal provenance stamped on status.json");
  assert.equal(status.healed.by, "cad-regen-stale-gens");
});

test("classifyStaged: refuses a heal when a primitive emit would DROP a named feature (keyway)", () => {
  // The primitive emitter 'wins' on a featured request -> it would draw the part plain, silently dropping the
  // keyway (invisible to curvedDimCheck). Must refuse, not heal-by-feature-drop (arm-C scrutiny).
  const c = classifyStaged("a 20 mm diameter cylinder with a 5 mm keyway", "BAD", {
    emitPrimitive: () => ({ code: "plain cyl", shape: "cylinder", dimsMm: [20, 40] }), emitFeature: () => null, curvedCheck: fakeCurved,
  });
  assert.equal(c.candidate, false);
  assert.equal(c.reason, "featured-primitive-refused");
});

test("healOneGen: a fresh gen that STILL fails is surfaced, not counted as healed (R12)", () => {
  const d = healDeps({ startStep: "BAD-STEP", execFlipsTo: "STILL-BAD" }); // no "GOOD" -> fakeCurved still fails
  const r = healOneGen("/g/cyl", { write: true, deps: d });
  assert.equal(r.outcome, "still-failing");
  assert.equal(r.afterDeltaPct, 96);
});

test("healOneGen: exec-failed when cadquery does not run", () => {
  const d = healDeps({ execOk: false });
  const r = healOneGen("/g/cyl", { write: true, deps: d });
  assert.equal(r.outcome, "exec-failed");
});

test("healOneGen: missing step / request are skipped fail-soft", () => {
  assert.equal(healOneGen("/g/nostep", { write: true, deps: healDeps({ hasStep: false }) }).outcome, "no-step");
  const noReq = { readText: () => "{}", existsSync: (p) => /request\.json|model\.step/.test(String(p)), writeFileSync: () => {}, curvedCheck: fakeCurved, emitPrimitive: () => DET_EMIT, emitFeature: () => null, execCadquery: () => ({ ok: true }) };
  assert.equal(healOneGen("/g/noreq", { write: true, deps: noReq }).outcome, "no-request");
});

// ---- poison-code heal (dimensionally-correct part whose model.py trips the LoRA units poison-guard) ----
test("classifyStaged: poison-code-clean-emit -- accurate geometry + poison model.py + clean emit -> heal candidate", () => {
  const c = classifyStaged("a turned bushing 25.02 mm outer diameter 22.1 mm bore 25.44 mm long", "GOOD",
    { emitPrimitive: () => CLEAN_EMIT, emitFeature: () => null, curvedCheck: fakeCurved, currentCode: CANCELLED_POISON_PY });
  assert.equal(c.candidate, true);
  assert.equal(c.reason, "poison-code-clean-emit");
  assert.equal(c.wasAccurate, true, "the staged geometry was already accurate; only the code idiom was fragile");
  assert.equal(c.code, CLEAN_EMIT.code, "carries the clean emit that will replace the poison code");
});

test("classifyStaged: already-ok when accurate + CLEAN currentCode (nothing to fix -- REAL validator)", () => {
  const c = classifyStaged("a 38.1 mm diameter cylinder", "GOOD",
    { emitPrimitive: () => CLEAN_EMIT, emitFeature: () => null, curvedCheck: fakeCurved, currentCode: CLEAN_EMIT.code });
  assert.equal(c.candidate, false);
  assert.equal(c.reason, "already-ok");
});

test("classifyStaged: no currentCode passed -> pure dimensional-heal behavior (back-compat, poison path disabled)", () => {
  // an accurate part with NO currentCode is already-ok (the caller opted out of the poison path) -- unchanged.
  const c = classifyStaged("a 38.1 mm diameter cylinder", "GOOD",
    { emitPrimitive: () => CLEAN_EMIT, emitFeature: () => null, curvedCheck: fakeCurved });
  assert.equal(c.candidate, false);
  assert.equal(c.reason, "already-ok");
});

test("classifyStaged: emit-also-poison -- accurate + poison code but the emit is ALSO poison -> refuse (no gain)", () => {
  const c = classifyStaged("a 38.1 mm diameter cylinder", "GOOD",
    { emitPrimitive: () => ({ code: CANCELLED_POISON_PY, shape: "cylinder", dimsMm: [38.1, 19.05] }), emitFeature: () => null, curvedCheck: fakeCurved, currentCode: CANCELLED_POISON_PY });
  assert.equal(c.candidate, false);
  assert.equal(c.reason, "emit-also-poison");
});

test("healOneGen: poison-code heal -- clean emit re-enters an accurate part + stamps via=deterministic-primitive + status.mode", () => {
  const d = healDeps({ request: "a turned bushing 25.02 mm outer diameter 22.1 mm bore 25.44 mm long", startStep: "GOOD-STEP", pyCode: CANCELLED_POISON_PY, emit: CLEAN_EMIT, execFlipsTo: "GOOD-STEP" });
  const r = healOneGen("/g/bush", { write: true, deps: d });
  assert.equal(r.outcome, "healed");
  assert.equal(r.mode, "poison-code-clean-emit");
  assert.equal(d._writes["model.py"], CLEAN_EMIT.code, "model.py replaced with the clean deterministic emit");
  const rj = JSON.parse(d._writes["request.json"]);
  assert.equal(rj.via, "deterministic-primitive", "via stamped so the training lane treats it as emitter-owned (--llm-only excludes it)");
  assert.equal(rj.request, "a turned bushing 25.02 mm outer diameter 22.1 mm bore 25.44 mm long", "the original request text is preserved");
  const status = JSON.parse(d._writes["status.json"]);
  assert.equal(status.healed.mode, "poison-code-clean-emit");
  assert.equal(status.healed.accurate, true);
});

test("healOneGen: regressed-restored -- a poison-heal that would make an accurate part inaccurate is REVERTED (R12)", () => {
  const d = healDeps({ request: "a turned bushing 25.02 mm outer diameter 22.1 mm bore 25.44 mm long", startStep: "GOOD-STEP", pyCode: CANCELLED_POISON_PY, emit: CLEAN_EMIT, execFlipsTo: "STILL-BAD" });
  const r = healOneGen("/g/bush", { write: true, deps: d });
  assert.equal(r.outcome, "regressed-restored");
  assert.equal(d._writes["model.py"], CANCELLED_POISON_PY, "prior (correct-but-poison) model.py restored -- never trade correct for clean-but-wrong");
  assert.equal(d._writes["request.json"], undefined, "no via stamp on a reverted heal");
  assert.equal(d._writes["status.json"], undefined, "no heal-provenance stamp on a reverted heal");
});

test("healOneGen: regress-restore-failed -- when the revert re-exec FAILS, surface divergence distinctly (arm-A P2, R12)", () => {
  const d = healDeps({ request: "a turned bushing 25.02 mm outer diameter 22.1 mm bore 25.44 mm long", startStep: "GOOD-STEP", pyCode: CANCELLED_POISON_PY, emit: CLEAN_EMIT });
  let calls = 0;
  d.execCadquery = () => { calls++; if (calls === 1) { d._state.step = "STILL-BAD"; return { ok: true }; } return { ok: false, reason: "revert exec boom" }; };
  const r = healOneGen("/g/bush", { write: true, deps: d });
  assert.equal(r.outcome, "regress-restore-failed", "the failed revert re-exec is not falsely reported as a clean revert");
  assert.equal(d._writes["model.py"], CANCELLED_POISON_PY, "prior code was still written back (best-effort)");
});

test("classifyStaged: via reflects the emitter -- primitive vs feature (ternary vocabulary, not blanket -primitive)", () => {
  const prim = classifyStaged("a 38.1 mm diameter cylinder", "BAD", { emitPrimitive: () => DET_EMIT, emitFeature: () => null, curvedCheck: fakeCurved });
  assert.equal(prim.via, "deterministic-primitive");
  const feat = classifyStaged("a 38.1 mm diameter shaft with a 5 mm keyway", "BAD",
    { emitPrimitive: () => null, emitFeature: () => ({ code: "x", shape: "keyed-shaft", dimsMm: [38.1, 19.05] }), curvedCheck: fakeCurved });
  assert.equal(feat.via, "deterministic-feature", "a feature-emitter heal is labeled deterministic-feature, matching cad-text-to-cadquery");
});

test("healOneGen: a feature-emitter heal stamps request.json via=deterministic-feature (matches canonical vocabulary)", () => {
  const featEmit = { code: CLEAN_EMIT.code, shape: "keyed-shaft", dimsMm: [38.1, 19.05] };
  const d = healDeps({ request: "a 38.1 mm diameter shaft with a 5 mm keyway", startStep: "BAD-STEP", emit: featEmit, execFlipsTo: "GOOD-STEP" });
  d.emitPrimitive = () => null; d.emitFeature = () => featEmit; // route the emit through emitFeature (prim=null)
  const r = healOneGen("/g/shaft", { write: true, deps: d });
  assert.equal(r.outcome, "healed");
  assert.equal(JSON.parse(d._writes["request.json"]).via, "deterministic-feature", "feature heal labeled deterministic-feature, not -primitive");
});

test("healOneGen: exec-fail with NO prior model.py deletes the freshly-written py (no fresh-code-beside-stale-step, arm-A P2)", () => {
  const removed = [];
  const d = healDeps({ startStep: "BAD-STEP", pyCode: null, execOk: false });
  d.rm = (p) => removed.push(String(p).replace(/\\/g, "/").split("/").pop());
  const r = healOneGen("/g/x", { write: true, deps: d });
  assert.equal(r.outcome, "exec-failed");
  assert.ok(removed.includes("model.py"), "the fresh model.py is removed when there was no prior to restore");
});
