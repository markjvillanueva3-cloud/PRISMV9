/**
 * rgs-rie-adapter.test.mjs — tests for the RoadmapIntelligenceEngine-backed
 * complexity adapter (U-LIMA-A6 / RGS-TOOL-AUTOINVOKE-MS1 P1 item #4).
 *
 * Coverage: pure helpers · all 5 level→tier mappings · happy path ·
 * 3 failure modes (engine null / engine throws / malformed return) ·
 * 2 adversarial inputs (null unit / NaN-Infinity-empty fields) · per-unit
 * cache · verdict-always-from-cascade · the "never throws" contract ·
 * and a REAL-DATA E2E against the actual compiled engine (the punch-list's
 * hard rule — a pure-core/injected-readers design MUST ship a real-data
 * test; hermetic fakes alone do not prove the production wiring).
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  makeRIEComplexityFn,
  loadRIEEngine,
  unitCacheKey,
  synthMilestone,
  LEVEL_TO_TIER,
} from "./rgs-rie-adapter.mjs";

const VALID_TIERS = new Set(["S", "M", "L", "XL"]);
const VALID_VERDICTS = new Set(["build", "integrate"]);

/**
 * Build a hermetic fake engine. `level` is the `overall_complexity` it
 * reports; opts.throw makes assessComplexity throw; opts.returns overrides
 * the whole return value (for malformed-response tests). Exposes `callCount`.
 */
function fakeEngine(level, opts = {}) {
  let calls = 0;
  return {
    get callCount() {
      return calls;
    },
    assessComplexity(ms) {
      calls += 1;
      if (opts.throw) throw new Error("simulated RIE failure");
      if ("returns" in opts) return opts.returns;
      return {
        milestone_id: ms?.id ?? "x",
        overall_complexity: level,
        complexity_score: 5,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

test("LEVEL_TO_TIER covers all 5 RIE levels and is frozen", () => {
  assert.deepEqual(
    { ...LEVEL_TO_TIER },
    { trivial: "S", simple: "S", moderate: "M", complex: "L", very_complex: "XL" },
  );
  assert.ok(Object.isFrozen(LEVEL_TO_TIER));
});

test("unitCacheKey derives a stable key from key / milestone+unitId / fallbacks", () => {
  assert.equal(unitCacheKey({ key: "MS::U1" }), "MS::U1");
  assert.equal(unitCacheKey({ milestone: "MS", unitId: "U1" }), "MS::U1");
  assert.equal(unitCacheKey({ unitId: "U1" }), "U1");
  assert.equal(unitCacheKey({ title: "just a title" }), "just a title");
  assert.equal(unitCacheKey({}), "");
  assert.equal(unitCacheKey(null), "");
  assert.equal(unitCacheKey(undefined), "");
});

test("synthMilestone produces an assessComplexity-shaped Milestone", () => {
  const ms = synthMilestone({
    key: "MS::U1",
    unitId: "U1",
    title: "Wire the foo",
    description: "connect bar to baz",
    depends_on: ["A", "B"],
  });
  assert.equal(ms.id, "MS::U1");
  assert.equal(ms.name, "Wire the foo");
  assert.ok(ms.description.includes("Wire the foo"));
  assert.ok(ms.description.includes("connect bar to baz"));
  assert.equal(ms.units.length, 1);
  assert.deepEqual(ms.dependencies, ["A", "B"]);
  assert.equal(ms.status, "not_started");
});

test("synthMilestone is null-safe and accepts `dependencies` alias", () => {
  const empty = synthMilestone(null);
  assert.equal(empty.units.length, 1);
  assert.deepEqual(empty.dependencies, []);
  assert.equal(typeof empty.description, "string");
  assert.ok(empty.description.length > 0); // never empty — assessComplexity word-counts it
  const aliased = synthMilestone({ dependencies: ["X"] });
  assert.deepEqual(aliased.dependencies, ["X"]);
});

// ---------------------------------------------------------------------------
// Happy path + level→tier variability (all 5 levels)
// ---------------------------------------------------------------------------

test("happy path: injected engine 'moderate' → tier M", async () => {
  const fn = await makeRIEComplexityFn({ engine: fakeEngine("moderate") });
  const r = fn({ key: "MS::U1", title: "do a thing", description: "a thing" });
  assert.equal(r.tier, "M");
  assert.ok(VALID_VERDICTS.has(r.verdict));
});

test("variability: every RIE level maps to its tier", async () => {
  const cases = [
    ["trivial", "S"],
    ["simple", "S"],
    ["moderate", "M"],
    ["complex", "L"],
    ["very_complex", "XL"],
  ];
  for (const [level, tier] of cases) {
    const fn = await makeRIEComplexityFn({ engine: fakeEngine(level) });
    const r = fn({ key: `K::${level}`, title: "x" });
    assert.equal(r.tier, tier, `${level} should map to ${tier}`);
  }
});

// ---------------------------------------------------------------------------
// Failure modes
// ---------------------------------------------------------------------------

test("failure: engine null → pure cascade tier+verdict, no throw", async () => {
  const fn = await makeRIEComplexityFn({ engine: null });
  // A keyword-marked title the cascade classifies deterministically.
  const r = fn({ key: "MS::U1", title: "rename the helper", description: "" });
  assert.ok(VALID_TIERS.has(r.tier));
  assert.equal(r.verdict, "integrate"); // cascade VERDICT_INTEGRATE matches "rename"
});

test("failure: engine.assessComplexity throws → falls back to cascade tier", async () => {
  const eng = fakeEngine("very_complex", { throw: true });
  const fn = await makeRIEComplexityFn({ engine: eng });
  const r = fn({ key: "MS::U1", title: "typo fix", description: "fix a typo" });
  // RIE would have said XL; it threw, so the cascade decides — "typo" → S.
  assert.equal(r.tier, "S");
  assert.equal(eng.callCount, 1); // it was attempted
});

test("failure: malformed return (no overall_complexity) → cascade tier", async () => {
  const fn = await makeRIEComplexityFn({ engine: fakeEngine("x", { returns: {} }) });
  const r = fn({ key: "MS::U1", title: "typo fix", description: "" });
  assert.equal(r.tier, "S"); // cascade keyword "typo" → S
});

test("failure: malformed return (null) → cascade tier, no throw", async () => {
  const fn = await makeRIEComplexityFn({ engine: fakeEngine("x", { returns: null }) });
  const r = fn({ key: "MS::U1", title: "rewrite the module", description: "" });
  assert.equal(r.tier, "L"); // cascade keyword "rewrite" → L
});

test("failure: unknown overall_complexity level → cascade tier", async () => {
  const fn = await makeRIEComplexityFn({
    engine: fakeEngine("x", { returns: { overall_complexity: "galactic" } }),
  });
  const r = fn({ key: "MS::U1", title: "rewrite the module" });
  assert.equal(r.tier, "L"); // "galactic" not in LEVEL_TO_TIER → cascade "rewrite" → L
});

// ---------------------------------------------------------------------------
// Adversarial inputs
// ---------------------------------------------------------------------------

test("adversarial: null / undefined unit → no throw, valid result", async () => {
  const fn = await makeRIEComplexityFn({ engine: fakeEngine("moderate") });
  for (const bad of [null, undefined]) {
    const r = fn(bad);
    assert.ok(VALID_TIERS.has(r.tier));
    assert.ok(VALID_VERDICTS.has(r.verdict));
  }
});

test("adversarial: NaN/Infinity effort + empty title → no throw, valid result", async () => {
  const fn = await makeRIEComplexityFn({ engine: fakeEngine("simple") });
  for (const effort of [NaN, Infinity, -Infinity]) {
    const r = fn({ key: `K::${effort}`, title: "", description: "", effort });
    assert.ok(VALID_TIERS.has(r.tier));
    assert.ok(VALID_VERDICTS.has(r.verdict));
  }
});

test("adversarial: oversize description does not throw", async () => {
  const fn = await makeRIEComplexityFn({ engine: fakeEngine("complex") });
  const r = fn({ key: "K::big", title: "t", description: "word ".repeat(50000) });
  assert.equal(r.tier, "L");
});

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

test("cache: same unit key assessed once; distinct keys assessed each", async () => {
  const eng = fakeEngine("moderate");
  const fn = await makeRIEComplexityFn({ engine: eng });
  fn({ key: "MS::U1", title: "a" });
  fn({ key: "MS::U1", title: "a" }); // cache hit
  assert.equal(eng.callCount, 1);
  fn({ key: "MS::U2", title: "b" }); // distinct → miss
  assert.equal(eng.callCount, 2);
});

test("cache: keyless units are re-assessed (not collapsed under empty key)", async () => {
  const eng = fakeEngine("moderate");
  const fn = await makeRIEComplexityFn({ engine: eng });
  fn({ title: "" }); // no key derivable
  fn({ title: "" });
  assert.equal(eng.callCount, 2); // each keyless call re-assesses
});

// ---------------------------------------------------------------------------
// Verdict always from cascade · never-throws contract
// ---------------------------------------------------------------------------

test("verdict always comes from the cascade, independent of RIE tier", async () => {
  const fn = await makeRIEComplexityFn({ engine: fakeEngine("very_complex") });
  const integ = fn({ key: "K::1", title: "wire engine into dispatcher" });
  assert.equal(integ.verdict, "integrate"); // cascade "wire" → integrate
  assert.equal(integ.tier, "XL"); // tier still from RIE
  const build = fn({ key: "K::2", title: "implement a new solver" });
  assert.equal(build.verdict, "build");
});

test("closure never throws even when an injected cascadeFn throws", async () => {
  const fn = await makeRIEComplexityFn({
    engine: null,
    cascadeFn: () => {
      throw new Error("bad cascade");
    },
  });
  const r = fn({ key: "K::1", title: "x" });
  assert.equal(r.tier, "M"); // documented fallback when cascade throws
  assert.equal(r.verdict, "build");
});

test("closure is synchronous — returns a plain object, not a Promise", async () => {
  const fn = await makeRIEComplexityFn({ engine: fakeEngine("moderate") });
  const r = fn({ key: "K::1", title: "x" });
  assert.ok(!(r instanceof Promise));
  assert.equal(typeof r.tier, "string");
});

test("loadRIEEngine returns null for a non-existent path (graceful)", async () => {
  const eng = await loadRIEEngine(
    new URL("./does-not-exist-rie.js", import.meta.url),
  );
  assert.equal(eng, null);
});

// ---------------------------------------------------------------------------
// REAL-DATA E2E — exercises the actual compiled RoadmapIntelligenceEngine
// (punch-list hard rule: hermetic fakes do not prove the production wiring)
// ---------------------------------------------------------------------------

test("E2E: real compiled RoadmapIntelligenceEngine loads", async () => {
  const eng = await loadRIEEngine();
  assert.notEqual(
    eng,
    null,
    "compiled RoadmapIntelligenceEngine must be importable — run `npm run build` in mcp-server/ if this fails",
  );
  assert.equal(typeof eng.assessComplexity, "function");
});

test("E2E: real engine — a heavy unit resolves to a high tier (L or XL)", async () => {
  const fn = await makeRIEComplexityFn();
  const heavy = {
    key: "RGS-TOOL-AUTOINVOKE-MS2::U-HEAVY",
    milestone: "RGS-TOOL-AUTOINVOKE-MS2",
    unitId: "U-HEAVY",
    title: "Full security and performance migration with integration refactor",
    description:
      "This unit requires a deep architectural integration spanning the " +
      "tool-planner, the Ollama reader factories, the sidecar schema, the " +
      "checkpoint store and the dispatcher layer. It involves a migration " +
      "of legacy data structures, a security review of every reader, a " +
      "performance audit of the hot path, and a refactor of the lock " +
      "manager to remove the TOCTOU window described in the punch list, " +
      "all while preserving backward compatibility with every existing " +
      "checkpointed sourceHash across the entire roadmap corpus.",
    depends_on: ["A", "B", "C", "D", "E", "F"],
  };
  const r = fn(heavy);
  assert.ok(
    r.tier === "L" || r.tier === "XL",
    `heavy unit expected L|XL, got ${r.tier}`,
  );
  assert.ok(VALID_VERDICTS.has(r.verdict));
});

test("E2E: real engine — a trivial unit resolves to tier S", async () => {
  const fn = await makeRIEComplexityFn();
  const r = fn({
    key: "X::U-TINY",
    milestone: "X",
    unitId: "U-TINY",
    title: "tiny fix",
    description: "one line change",
    depends_on: [],
  });
  assert.equal(r.tier, "S");
  assert.ok(VALID_VERDICTS.has(r.verdict));
});

test("E2E: real engine — result shape is the complexityFor contract", async () => {
  const fn = await makeRIEComplexityFn();
  const r = fn({ key: "X::U1", title: "do a normal-sized task", description: "work" });
  assert.ok(VALID_TIERS.has(r.tier));
  assert.ok(VALID_VERDICTS.has(r.verdict));
  assert.deepEqual(Object.keys(r).sort(), ["tier", "verdict"]);
});
