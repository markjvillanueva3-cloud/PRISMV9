// Tests for forge-worthiness.mjs (EXTRACTION-FORGE-MS0, slot:bravo 2026-06-12).
// Verifies INTENT (R9): a real formula/algorithm capability classifies WORTHY; a plain
// advice tip does NOT (so the queue does not flood); edge cases are safe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyForgeWorthiness, deriveConceptName, forgeActionFor, FORGE_THRESHOLDS } from "./forge-worthiness.mjs";

test("classifyForgeWorthiness: a real formula/algorithm is WORTHY", () => {
  const formula = "The Kienzle force model computes cutting force Fc = kc1.1 * ap * fz^(1-mc) " +
    "using the material coefficient kc and the chip thickness exponent mc to predict the tangential force.";
  const r = classifyForgeWorthiness(formula, {});
  assert.equal(r.worthy, true, r.reason);
  assert.ok(["formula", "algorithm", "engine"].includes(r.kind), `kind=${r.kind}`);
  assert.ok(r.score >= FORGE_THRESHOLDS.formula, `score ${r.score}`);
  assert.ok(r.conceptName && r.conceptName.length > 0);
});

test("classifyForgeWorthiness: an engine/system concept classifies engine-kind", () => {
  const eng = "A trochoidal toolpath generator engine: a pipeline that computes the optimal radial " +
    "stepover and feed via an optimization algorithm to maintain constant chip load across the cut.";
  const r = classifyForgeWorthiness(eng, {});
  assert.equal(r.worthy, true, r.reason);
  assert.equal(r.kind, "engine", `kind=${r.kind} (${r.reason})`);
});

test("classifyForgeWorthiness: a plain advice tip is NOT worthy (no flooding)", () => {
  const tip = "Tip: always climb mill when possible and make sure to use flood coolant. Best practice " +
    "is to avoid full-slot cuts. Remember to check your workholding and you should never run a dull tool.";
  const r = classifyForgeWorthiness(tip, {});
  assert.equal(r.worthy, false, `should be a tip, not forge-worthy: ${r.reason}`);
  assert.equal(r.kind, null);
});

test("classifyForgeWorthiness: edge cases are safe", () => {
  assert.equal(classifyForgeWorthiness("", {}).worthy, false);
  assert.equal(classifyForgeWorthiness("too short", {}).worthy, false);
  assert.equal(classifyForgeWorthiness(null, {}).worthy, false);
  assert.equal(classifyForgeWorthiness(undefined, {}).worthy, false);
  // a long block of pure prose with no capability/math language stays unworthy
  const prose = "The shop floor was busy that morning and the operator walked over to the machine " +
    "to check on the job that had been running all night without any issues at all so far today.";
  assert.equal(classifyForgeWorthiness(prose, {}).worthy, false, classifyForgeWorthiness(prose, {}).reason);
});

test("deriveConceptName: prefers frontmatter title, then heading, then first sentence", () => {
  assert.equal(deriveConceptName("# Heading Here\nbody", { title: "Chip Thinning Model" }), "Chip Thinning Model");
  assert.equal(deriveConceptName("# Trochoidal Stepover Solver\nbody text", {}), "Trochoidal Stepover Solver");
  assert.equal(deriveConceptName("First sentence here. Second.", {}), "First sentence here");
  assert.equal(deriveConceptName("", {}), "untitled-concept");
});

test("forgeActionFor: builds a slugged /forge-triple invocation", () => {
  assert.equal(
    forgeActionFor({ kind: "algorithm", conceptName: "Chip Thinning Model" }),
    "/forge-triple algorithm:chip-thinning-model"
  );
  // defaults when fields missing
  assert.equal(forgeActionFor({}), "/forge-triple engine:concept");
  assert.equal(forgeActionFor(null), "/forge-triple engine:concept");
});
