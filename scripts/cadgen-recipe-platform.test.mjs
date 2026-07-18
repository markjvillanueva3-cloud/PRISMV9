// Lock-in test: the corpus-grounded cadquery recipe wins on the gen path (U-CADGEN-RECIPE-PLATFORM-TEST,
// slot:delta 2026-07-04). U-CADGEN-ARCHETYPE-RECIPE-RECONCILE (10118bc798) made loadArchetypeRecipe prefer
// the `cadquery` platform so ROUND parts get "sketch.circle -> op.extrude" instead of the static fusion360
// "op.revolve" -- validated by HAND (cylinder BEFORE=revolve, AFTER=extrude). Nothing automated it: a future
// edit to loadArchetypeRecipe's platform-fallback, or to ARCHETYPE-RECIPES.json, could silently regress round
// parts back to the misleading revolve hint. This hermetic test (injected readFileImpl -> no real recipe
// file, fast even on the slow disk) pins: (1) the classifier maps cylinder->shaft, (2) the cadquery platform
// yields extrude NOT revolve, (3) the fusion360 platform still yields the curated revolve (fallback intact),
// (4) an archetype lacking a cadquery section falls back to fusion360, (5) unknown archetype yields no hint.
//   run: node --test scripts/cadgen-recipe-platform.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { loadArchetypeRecipe, classifyRequestArchetype } from "./cad-text-to-cadquery.mjs";

// Synthetic ARCHETYPE-RECIPES.json: shaft has BOTH a corpus-grounded cadquery section (extrude) and the
// curated fusion360 section (revolve); flat-plate has ONLY fusion360 (tests the fallback).
const RECIPES = {
  schemaVersion: 1,
  recipes: {
    shaft: {
      cadquery: [{ op: "sketch.create-plane" }, { op: "sketch.circle" }, { op: "op.extrude" }],
      fusion360: [{ op: "sketch.create-plane" }, { op: "sketch.line-polyline" }, { op: "op.revolve" }, { op: "op.chamfer" }],
    },
    "flat-plate": {
      fusion360: [{ op: "sketch.create-plane" }, { op: "sketch.rect-2pt" }, { op: "op.extrude" }],
    },
  },
};
const readFileImpl = () => JSON.stringify(RECIPES);
const CYL = "a 1 inch diameter cylinder 2 inches tall";

test("classifyRequestArchetype maps a cylinder to the shaft archetype", () => {
  assert.equal(classifyRequestArchetype(CYL), "shaft");
});

test("cadquery platform -> round part gets EXTRUDE, NOT revolve (the reconcile fix)", () => {
  const hint = loadArchetypeRecipe(CYL, { platform: "cadquery", readFileImpl }).join(" ");
  assert.match(hint, /op\.extrude/, "cadquery hint must extrude");
  assert.doesNotMatch(hint, /op\.revolve/, "cadquery hint must NOT prescribe revolve");
  assert.match(hint, /sketch\.circle/);
});

test("fusion360 platform still yields the curated revolve (fallback path intact -- backward compatible)", () => {
  const hint = loadArchetypeRecipe(CYL, { platform: "fusion360", readFileImpl }).join(" ");
  assert.match(hint, /op\.revolve/, "the curated fusion360 recipe is untouched");
});

test("archetype WITHOUT a cadquery section falls back to fusion360 (no silent empty)", () => {
  const hint = loadArchetypeRecipe("a 2 inch square steel plate 0.25 inch thick", { platform: "cadquery", readFileImpl }).join(" ");
  assert.match(hint, /flat-plate part/);
  assert.match(hint, /op\.extrude/, "flat-plate falls back to its fusion360 recipe");
});

test("unknown archetype yields NO hint (generation still runs on doctrine alone)", () => {
  assert.deepEqual(loadArchetypeRecipe("a typical thingamajig", { platform: "cadquery", readFileImpl }), []);
});
