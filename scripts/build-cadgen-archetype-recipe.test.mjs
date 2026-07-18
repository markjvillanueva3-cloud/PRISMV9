// Tests for build-cadgen-archetype-recipe.mjs (U-CADGEN-ARCHETYPE-RECIPE-RECONCILE, slot:delta 2026-07-03).
// node:test; real reference-value asserts. Proves: op-sequence extraction (incl. the cutThruAll/cutBlind
// idioms the corpus uses), frequency+threshold+canonical-order recipe synthesis, low-evidence skip, and --
// critically -- that the round archetypes reconcile to EXTRUDE (not the static revolve), and that writing
// is ADDITIVE (never clobbers a curated platform section of the live gen-steering recipe file).
//   run: node --test scripts/build-cadgen-archetype-recipe.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { extractOpSequence, canonicalRecipeForArchetype, buildCadqueryRecipes, writeRecipes, __test } from "./build-cadgen-archetype-recipe.mjs";

const CYL_PY = 'import cadquery as cq\nIN=25.4\nresult = cq.Workplane("XY").circle(0.5*IN).extrude(2.0*IN)\nfrom cadquery import exporters\nexporters.export(result, "o.step")';
const RING_PY = 'import cadquery as cq\nIN=25.4\nresult = cq.Workplane("XY").circle(1.0*IN).extrude(0.25*IN).faces(">Z").workplane().circle(0.4*IN).cutThruAll()\nexporters.export(result,"o.step")';

test("extractOpSequence: cylinder -> [create-plane, circle, extrude] in build order", () => {
  assert.deepEqual(extractOpSequence(CYL_PY), ["sketch.create-plane", "sketch.circle", "op.extrude"]);
});

test("extractOpSequence: folds cutThruAll into op.cut (the corpus idiom .cut( alone would miss)", () => {
  const seq = extractOpSequence(RING_PY);
  assert.ok(seq.includes("op.cut"), "cutThruAll must map to op.cut");
  assert.ok(seq.includes("sketch.circle") && seq.includes("op.extrude"));
  assert.deepEqual(seq, ["sketch.create-plane", "sketch.circle", "op.extrude", "op.cut"]);
});

test("extractOpSequence: empty / non-cad code -> []", () => {
  assert.deepEqual(extractOpSequence(""), []);
  assert.deepEqual(extractOpSequence("print('hello')"), []);
});

test("canonicalRecipeForArchetype: keeps ops >= 50% freq, ordered canonically; < MIN_EVIDENCE -> null", () => {
  // 10 gens: all circle+extrude; 6/10 have cut (kept, 60%); 2/10 chamfer (dropped, 20%).
  const sets = [];
  for (let i = 0; i < 10; i++) {
    const s = ["sketch.create-plane", "sketch.circle", "op.extrude"];
    if (i < 6) s.push("op.cut");
    if (i < 2) s.push("op.chamfer");
    sets.push(s);
  }
  const r = canonicalRecipeForArchetype(sets);
  assert.deepEqual(r.steps, ["sketch.create-plane", "sketch.circle", "op.extrude", "op.cut"]);
  assert.equal(r.freq["op.cut"], 60);
  assert.equal(r.n, 10);
  assert.equal(canonicalRecipeForArchetype(sets.slice(0, 4)), null, "4 gens < MIN_EVIDENCE 5 -> null");
});

test("buildCadqueryRecipes: round archetype reconciles to EXTRUDE not revolve; low-evidence skipped", () => {
  // 6 cylinder gens (-> shaft) all circle+extrude; 3 plate gens (-> flat-plate) below evidence.
  const dirs = [];
  for (let i = 0; i < 6; i++) dirs.push({ name: `cyl-${1783100000000 + i}`, arch: "cyl", py: CYL_PY, req: "a 1 inch diameter cylinder 2 inches tall" });
  for (let i = 0; i < 3; i++) dirs.push({ name: `plt-${1783100000100 + i}`, arch: "plt", py: 'cq.Workplane("XY").rect(1,1).extrude(1)', req: "a steel plate 2 inches square" });
  const deps = {
    readdir: () => dirs.map((d) => ({ name: d.name, isDirectory: () => true })),
    existsSync: () => true,
    readText: (p) => {
      const s = String(p).replace(/\\/g, "/");
      const d = dirs.find((x) => s.includes(`/${x.name}/`));
      if (!d) return "";
      return s.endsWith("request.json") ? JSON.stringify({ request: d.req }) : d.py;
    },
  };
  const { recipes, stats } = buildCadqueryRecipes("/fake/gen", deps);
  assert.equal(stats.byArchetype.shaft, 6);
  assert.ok(recipes.shaft, "shaft recipe present");
  assert.deepEqual(recipes.shaft.map((s) => s.op), ["sketch.create-plane", "sketch.circle", "op.extrude"]);
  assert.ok(!recipes.shaft.some((s) => s.op === "op.revolve"), "reconciled recipe must NOT prescribe revolve");
  assert.ok(!recipes["flat-plate"], "3-gen flat-plate below MIN_EVIDENCE -> not written");
  assert.equal(stats.archetypesSkippedLowEvidence, 1);
});

test("buildCadqueryRecipes EXCLUDES non-executed gens (no model.step) -- recipes grounded in successes only", () => {
  // 6 executed cylinder gens + 1 that never executed (model.step absent): the 7th is dropped, notExecuted=1.
  const names = [];
  for (let i = 0; i < 6; i++) names.push(`cyl-${1783100000000 + i}`);
  const noStep = "cyl-1783100000099";
  names.push(noStep);
  const deps = {
    readdir: () => names.map((n) => ({ name: n, isDirectory: () => true })),
    existsSync: (p) => {
      const s = String(p).replace(/\\/g, "/");
      // the failed gen produced NO model.step (executed:false) -> must be excluded from recipe mining
      if (s.includes(`/${noStep}/`) && s.endsWith("model.step")) return false;
      return true;
    },
    readText: (p) => (String(p).replace(/\\/g, "/").endsWith("request.json")
      ? JSON.stringify({ request: "a 1 inch diameter cylinder 2 inches tall" })
      : 'cq.Workplane("XY").circle(0.5).extrude(2)'),
  };
  const { recipes, stats } = buildCadqueryRecipes("/fake/gen", deps);
  assert.equal(stats.notExecuted, 1, "the model.step-less gen is excluded (scrutiny arm B fix)");
  assert.equal(stats.byArchetype.shaft, 6, "only the 6 EXECUTED gens are mined, not the failed one");
  assert.deepEqual(recipes.shaft.map((s) => s.op), ["sketch.create-plane", "sketch.circle", "op.extrude"]);
});

test("writeRecipes is ADDITIVE: keeps every curated platform section, adds only cadquery", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "arch-recipe-"));
  try {
    const file = path.join(tmp, "ARCHETYPE-RECIPES.json");
    const orig = {
      schemaVersion: 1,
      recipes: {
        shaft: {
          fusion360: [{ op: "op.revolve", platform: "fusion360", fn: "revolveFeatures.add", args: [], notes: "curated" }],
          solidworks: [{ op: "op.revolve", platform: "solidworks", fn: "FeatureRevolve2", args: [], notes: "curated" }],
        },
      },
    };
    fs.writeFileSync(file, JSON.stringify(orig));
    const mined = { shaft: [{ op: "sketch.circle", platform: "cadquery", fn: ".circle(r)", args: [], notes: "corpus" }, { op: "op.extrude", platform: "cadquery", fn: ".extrude(h)", args: [], notes: "corpus" }] };
    const updated = writeRecipes(mined, file);
    assert.deepEqual(updated, ["shaft"]);
    const back = JSON.parse(fs.readFileSync(file, "utf8"));
    // curated sections untouched
    assert.equal(back.recipes.shaft.fusion360[0].op, "op.revolve");
    assert.equal(back.recipes.shaft.solidworks[0].op, "op.revolve");
    // cadquery section added
    assert.deepEqual(back.recipes.shaft.cadquery.map((s) => s.op), ["sketch.circle", "op.extrude"]);
    assert.ok(back.cadqueryReconciledAt, "stamps the reconcile time");
    assert.ok(!fs.existsSync(`${file}.tmp`), "tmp renamed away (atomic)");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("writeRecipes throws (R12 fail-loud) on a recipe file missing .recipes", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "arch-recipe-bad-"));
  try {
    const file = path.join(tmp, "bad.json");
    fs.writeFileSync(file, JSON.stringify({ schemaVersion: 1 }));
    assert.throws(() => writeRecipes({ shaft: [] }, file), /missing a \.recipes object/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
