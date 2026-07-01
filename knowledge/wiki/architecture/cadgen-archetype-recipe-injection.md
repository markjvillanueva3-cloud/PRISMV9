---
node_type: architecture
title: CADGEN archetype build-recipe injection -- op-sequence scaffolding for the text-to-CAD GEN prompt
status: shipped (commit 09704278fd, 32/32 tests, 3-of-3 PASS, live-validated)
slot: delta
created: 2026-06-28
related:
  - cad-text-to-cad-landscape
  - cadgen-spurious-sparkgap-units-bug
  - cad-galaxy
  - cad-step-toolchain
---

# CADGEN archetype build-recipe injection

The fourth advisory prompt-shaping loader for the local-LLM text-to-CAD generation bridge
(`scripts/cad-text-to-cadquery.mjs`), alongside `loadTribalTips`, `loadLearnedRisk`, and
`loadClassDimPrior`. It injects the shop's canonical **build ORDER** for a request's part family --
the goal's "templates / design pipelines for quicker CAD generation" -- shipped as
`U-DELTA-CADGEN-RECIPE-INJECT` (commit `09704278fd`).

## What it does

1. **`classifyRequestArchetype(request)`** -- an ordered, specific-first keyword classifier mapping a
   free-text request to one of the **11 build archetypes** (the recipe keys): `flat-plate, shaft, shell,
   revolve, extrude, loft-sweep, threaded, pocket, assembly, complex-organic, unknown` (default
   `unknown`). Bounded `\b`-anchored alternations -> linear time, no ReDoS (the dim-prior arm-C lesson).
   This is a build-SHAPE taxonomy, **distinct + complementary** to the sibling
   `classifyRequestPartClass` (a corpus `part_class` taxonomy used for dimensional priors).

2. **`loadArchetypeRecipe(request, opts)`** -- loads the **platform-invariant operation sequence** for
   the archetype from `state/shared/cad-action-templates/ARCHETYPE-RECIPES.json` (11 archetypes x 11 CAD
   platforms) and emits ONE advisory recipe line, e.g.
   `flat-plate part -- build order: sketch.create-plane -> sketch.rect-2pt -> op.extrude -> op.fillet`.

3. **`buildPrompt(..., recipe = [])`** -- a 7th param injects a "REFERENCE BUILD RECIPE" section,
   worded as a hint the request always overrides. Back-compatible: an absent recipe injects nothing, so
   the prior 6-arg callers (only `main()`) are unaffected. `main()` records `archetype` + `recipeInjected`
   into the staged `request.json` and the run summary for traceability.

## The core design invariant: op verbs ONLY, never platform `fn` names

The GEN target is **build123d / cadquery** Python, not any of the 11 recipe platforms. The recipe steps
carry both an `op` verb (`op.extrude`) and a platform-specific `fn` (`features.extrudeFeatures.addSimple`
for Fusion, `linear_extrude` for OpenSCAD, etc.). `loadArchetypeRecipe` emits **only the `op` verbs** --
injecting another platform's API call names would steer the local model to **hallucinate those calls** in
the generated build123d code. The function never references `st.fn`; this is structurally guaranteed and
proven by an adversarial test (real Fusion fn names embedded in a fixture + asserted absent) plus a LIVE
test against the real corpus.

## Why it is lower-risk than the dimensional prior

`loadClassDimPrior` injects numeric envelope dimensions, so a misclassification can contradict a stated
dimension (the failure class behind the spark-gap units bug, [[cadgen-spurious-sparkgap-units-bug]]). The
recipe carries **zero numeric values** -- only a build-ORDER hint -- so a misclassification is low-harm: it
can never undersize or mis-scale a part. The injection is also fail-soft (`unknown` archetype, missing /
malformed recipe, or any error -> `[]`); generation always proceeds on doctrine + tribal + priors alone.

## Validation

32/32 tests (classify priority + default, op-only-no-fn-leak, dedup + order, platform routing + fallback,
three failure modes, buildPrompt inject + back-compat both ways, LIVE real-corpus load). Live-validated on
`flat-plate` / `shaft` / `shell` through the real `ARCHETYPE-RECIPES.json` -- correct distinct build
orders, `fn-leak=false` on all. 3-of-3 scrutiny all PASS.

## Where it sits in the closed loop

GEN prompt assembly: `loadEnginePrompt` (canonical codegen prompt) + hard-coded JM doctrine +
`loadTemplateNames` (RAG-lite) + **`loadArchetypeRecipe` (build order)** + `loadTribalTips` (draw rules) +
`loadLearnedRisk` (historical failure modes) + `loadClassDimPrior` (learned dimensions). Each is advisory
and fail-soft; together they are the shop-knowledge scaffolding around every local-LLM CAD generation.

Memory: `reference_delta_cadgen_recipe_injection_2026_06_28`. Loop map:
`reference_delta_live_cad_loop_map_2026_06_28`.
