/**
 * forge-dedup-prefilter tests -- the real 2026-06-15 false-positive batch as fixtures.
 *
 * The pre-filter must flag already-built concepts (so they never enter the forge queue)
 * WITHOUT flagging genuinely-novel concepts (a false-negative would silently drop a real
 * capability). Conservative by design: only a significant-stem bigram that is a substring
 * of an engine filename counts as built.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { conceptAlreadyBuilt, significantStems, stem, STOPWORDS } from "./forge-dedup-prefilter.mjs";

// A slice of the real engine/algorithm inventory (verified on disk 2026-06-15).
const ENGINES = [
  "ChipThinningCompensationEngine", "ChipThinningCompensation",
  "FixtureTopologyOptimizerEngine", "TopologyEngine",
  "CollisionDetectionEngine", "RigidBodyDynamicsEngine", "BayesianWearModel",
  "AdaptiveClearingEngine", "GeometryEngine", "CADKernelEngine",
];

test("stem strips common suffixes (>=4 chars remain)", () => {
  assert.equal(stem("thinning"), "thinn");
  assert.equal(stem("optimization"), "optimiz");
  assert.equal(stem("compensation"), "compens");
  assert.equal(stem("axis"), "axis");          // axis - s = axi (3) -> not stripped
  assert.equal(stem("topology"), "topology");  // no matching suffix
});

test("significantStems drops vendors + title noise + numbers", () => {
  const s = significantStems("SOLIDWORKS Simulation: Topology Optimization");
  assert.ok(!s.includes("solidworks"), "vendor dropped");
  assert.ok(s.includes("topology"), "topology kept");
  assert.ok(s.includes("optimiz"), "optimization stemmed+kept");
  const e = significantStems("Episode 2: Chip Thinning");
  assert.deepEqual(e, ["chip", "thinn"]);      // episode + 2 dropped
});

test("STOPWORDS includes the observed vendor/title noise", () => {
  for (const w of ["solidworks", "mastercam", "haas", "episode", "tutorial"]) {
    assert.ok(STOPWORDS.has(w), `${w} is a stopword`);
  }
});

test("BUILT: Radial Chip Thinning -> ChipThinningCompensationEngine", () => {
  const r = conceptAlreadyBuilt("Radial Chip Thinning", ENGINES);
  assert.equal(r.built, true);
  assert.match(r.match, /ChipThinning/);
  assert.equal(r.matchedOn, "chipthinn");
});

test("BUILT: SOLIDWORKS Simulation Topology Optimization -> FixtureTopologyOptimizerEngine", () => {
  const r = conceptAlreadyBuilt("SOLIDWORKS Simulation: Topology Optimization", ENGINES);
  assert.equal(r.built, true);
  assert.match(r.match, /TopologyOptimizer/);
});

test("BUILT: Episode 2 Chip Thinning (title noise stripped) -> built", () => {
  assert.equal(conceptAlreadyBuilt("Episode 2: Chip Thinning", ENGINES).built, true);
});

test("NOT built: genuinely novel concept queues (low false-negative guard)", () => {
  const r = conceptAlreadyBuilt("Gyroid Lattice Infill Generator", ENGINES);
  assert.equal(r.built, false);
});

test("NOT built: single significant token is too vague to auto-judge", () => {
  assert.equal(conceptAlreadyBuilt("Macro", ENGINES).built, false);
  assert.equal(conceptAlreadyBuilt("Topology", ENGINES).built, false);
});

test("NOT built: empty / non-string input -> not built (fail-soft)", () => {
  assert.equal(conceptAlreadyBuilt("", ENGINES).built, false);
  assert.equal(conceptAlreadyBuilt(null, ENGINES).built, false);
  assert.equal(conceptAlreadyBuilt("Chip Thinning", null).built, false);
});

test("NOT built: a vendor-only title (all stopwords) -> not built", () => {
  // "Mastercam Class" -> mastercam(stop) + class(stop) -> 0 sig tokens -> not built (queues)
  assert.equal(conceptAlreadyBuilt("Mastercam Class", ENGINES).built, false);
});
