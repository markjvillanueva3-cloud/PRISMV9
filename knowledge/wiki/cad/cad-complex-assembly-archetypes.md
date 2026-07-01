---
title: Complex component + assembly archetypes — generation strategies (molds, jets, conveyors, machinery, automobiles, F1)
slug: cad-complex-assembly-archetypes
kind: cad
domain: cad
status: shipped
shipped_at: 2026-06-12
shipped_by: claude-f61fa6d7 (slot zulu, delta-galaxy population — operator "generate highly complicated components and assemblies")
provenance: model-knowledge decomposition doctrine + in-repo asset cross-refs; capability grades derive from [[cad-function-taxonomy]] coverage column
related:
  - cad-function-taxonomy
  - cad-text-to-cad-landscape
  - cad-foundations
---

# Complex assembly archetypes — how delta generates the hard stuff

Operator targets: **plastic injection molds, fighter jet assemblies, conveyor systems, heavy machinery, full automobiles, F1 vehicles and parts.** None of these is "one model" — each is a *decomposition pattern* + a *component-generator library* + an *assembly composition step*. This entry hard-codes the pattern per archetype, the CAD-function subset it needs (graded against [[cad-function-taxonomy]]), and what PRISM has today vs must build.

## The universal strategy (applies to every archetype)

1. **Skeleton / master model first.** One parametric layout (datum planes, layout curves/surfaces, key envelope dims) is generated first; every component generator takes the skeleton as input. This is the code-CAD form of top-down design — cross-component consistency is *function arguments*, not in-context references.
2. **Component-generator library.** Each part family = one parametric generator (function: params → solid). Catalog hardware (fasteners, bearings, mold bases, motors) is *table-driven* — dims from vendor data ([[vendor-catalog-db]]), never modeled freehand.
3. **Instancing over duplication.** One definition, N `Location`-placed occurrences (pattern functions) — this is how 10,000-fastener assemblies stay tractable.
4. **Assembly composition.** `cq.Assembly` / build123d `Compound` with named occurrences → STEP AP242 assembly tree out (`NEXT_ASSEMBLY_USAGE_OCCURRENCE` — our emitter lane already speaks AP203/AP242).
5. **Validate per stage.** Interference (`CollisionDetectionEngine` — SAFETY surface), mass properties, envelope vs skeleton; never compose atop an unvalidated component (R13 logical order).

Capability tiers used below: **T1 = generatable NOW** (programmatic lane) · **T2 = NEAR** (compose existing functions, needs the generator written) · **T3 = BUILD** (needs new capability, e.g. surface lane) · **T4 = RESEARCH** (open problem for us).

## 1. Plastic injection mold — T1/T2 (closest to JM's die DNA)

**Decomposition:** mold base (A/B plates, risers, clamp plates — catalog: HASCO/DME/LKM dim tables) → core + cavity inserts → ejector system (pins, return pins, ejector plate) → cooling circuit (drilled-line networks + baffles) → feed system (sprue, runners, gates) → side actions (slides/lifters/cams) → leader pins/bushings/interlocks.

**Generation strategy:** mold base = pure table-driven parametrics (T1). Core/cavity = boolean the shrink-scaled part solid from insert blocks + parting surface (T1 for machinable parting lines, T3 for freeform parting). Cooling/ejection/feed = parametric hole-and-pipe networks from layout points (T1). Slides/lifters = catalog mechanism families (T2).

**Function subset:** booleans, scale (shrinkage — material data table), draft analysis, parting line, hole networks, patterns, assembly tree. **PRISM assets now:** electrode derivation PROVEN (`cad-generate-ejot-electrode-exact.mjs` + spark-gap doctrine), die-plate generation live-validated (text→CAD gen #3), `MastercamMoldCycleEngine`, draft-analysis math T1. **Gap:** parametric mold-base catalog generator (the highest-ROI single build on this list — pure tables + primitives).

## 2. Conveyor systems — T2 (the design-automation sweet spot)

**Decomposition:** structural frame (extruded profiles: 80/20-style or welded channel) → roller/idler families → belt/chain path → drive package (motor+gearbox+sprockets — vendor STEP/dims) → guards/rails → supports/feet. Modular *sections* (straight, curve, incline, transfer) compose into a system.

**Generation strategy:** THE classic configurator: section-level generators driven by a route spec (length/width/elevation/load), frame from profile sweep along layout, rollers as patterned instances, vendor components placed by dims. Everything is T1 functions; the work is the generator library + the route-spec schema (T2).

**Why it matters:** identical pattern to machine-base/fixture work JM already does; first full-ASSEMBLY proof target for the text→CAD lane ("a 10 ft, 18 in wide roller conveyor with 6 in roller pitch" is fully expressible today).

## 3. Heavy machinery — T2/T3

**Decomposition:** weldment frame (plate + structural sections, gussets) → castings/weldment housings (draft+fillet heavy) → machined interfaces (ways, bores, mounting faces) → drivetrain (gearboxes, cylinders, bearings — catalog) → pins/bushings/fasteners → guarding.

**Generation strategy:** frames = plate/profile generators + bolt-pattern functions (T1). Machined interfaces = prismatic features, our core strength (T1). Castings = T3 (heavy variable filleting/draft is the OCC weak spot — design simplified machinable weldment equivalents instead, which is ALSO what JM would actually build). Hydraulics/drives = catalog families (T2).

## 4. Fighter jet assembly — T3 skeleton-first (structures T2, aero skin T3)

**Decomposition:** OML (outer mold line — lofted aero surfaces over stations/waterlines/buttlines) → structural grid (bulkheads/frames at stations, longerons, wing spars+ribs from airfoil sections) → skins (surface offsets w/ thickness) → systems routing (T4 for us) → fastener fields (thousands — pure instancing).

**Generation strategy:** the skeleton IS the aircraft: station-line + airfoil-section curves drive everything. Spars/ribs = profile sections cut to OML (loft + boolean — T2 once an OML exists). OML itself = multi-section lofts with rail control — build123d *can* loft (⚠ grade), but aero-quality surface control is T3. Fastener fields = T1 instancing. **Honest grade (R12):** a *recognizable, structurally-decomposed* jet assembly = T2/T3 demo territory; a flight-grade OML is not claimable. Airfoil section data (NACA et al.) = table-driven curves, T1.

## 5. Full automobile — T3/T4 (structure yes, Class-A no)

**Decomposition:** body-in-white (stamped sheet-metal panels — Class-A exterior surfaces) → closures → chassis/subframes → suspension (kinematic hardpoints skeleton) → powertrain envelope → interior. 10K-30K unique parts at OEM scale.

**Generation strategy:** suspension hardpoint skeleton + machined/tubular components = T2 (it's geometry + catalogs). Frame/chassis = weldment patterns (T2). **Class-A body surfacing is T4** — G2+/highlight-quality NURBS is a craft+toolchain we do not have programmatically and should not claim; ICEM/Alias-class work stays in seats. A *styling-buck-level* car body (loft-quality, not Class-A) is T3. State this split explicitly whenever "generate a car" comes up.

## 6. F1 vehicle + parts — parts T1/T2 NOW, aero T3

**Decomposition:** monocoque (composite surfaces — T3) → aero package (regulation-box-constrained wings/floor/diffuser — lofted surfaces, T3) → machined billet parts: **uprights, hubs, gearbox internals, brackets, suspension members — T1/T2 TODAY** → tubular/additive nodes (T2/T3).

**Generation strategy:** start where we're strong: F1-style machined components are prismatic+revolved+pocketed parts with tight GD&T — exactly the JM Die function set and the text→CAD lane's wheelhouse. Wing profiles from section tables = same airfoil-curve machinery as the jet OML (shared T3 surface-lane investment serves both).

## Existing foundation (extend, don't rebuild — R8)

Delta ALREADY shipped the archetype substrate: `scripts/lib/cad-assembly-plan-lib.mjs` (slot-delta worktree) carries **`ARCHETYPE_RECIPES`** — 7 prerequisite-ordered recipes (turbine, blisk, impeller, **mold-die**, weldment, sheet-metal-enclosure, die-set) with `validateArchetypeParams` + `planFromArchetype`, proven by the 70-file generated-STEP fleet (`state/shared/cad-generated/`, 0 empty files — [[reference_cad_piece3_fleet_complete_2026_05_27]]). Dispatcher actions `assembly_to_cadquery` / `cad_assembly_add_node` / `cad_assembly_add_ref` exist. **The six operator archetypes below = NEW RECIPES in that registry**, not a new system.

## The shared gap list (what delta builds, dependency-ordered)

1. **U-ARCH-MOLDBASE** — table-driven mold-base generator as an `ARCHETYPE_RECIPES` entry extending the existing `mold-die` recipe (T2→T1; pure primitives + catalogs; highest ROI, JM-adjacent).
2. **U-ARCH-ASSEMBLY-COMPOSE** — named-occurrence assembly composer → AP242 tree emit, building on `cad-assembly-plan-lib.mjs` + `assembly_to_cadquery` (unlocks EVERY archetype; the emitter needs the assembly-tree path exercised).
3. **U-ARCH-CONFIGURATOR** — route/spec-schema → conveyor-section demo (first full-assembly live proof).
4. **U-ARCH-SECTION-CURVES** — airfoil/section-table curve library (feeds jet + F1 + any loft work).
5. **U-ARCH-SURFACE-LANE** — controlled multi-section loft + rail quality work on OCC (the T3 unlock; gates jet OML, F1 aero, styling-buck bodies).
6. **Class-A (T4)** — explicitly parked; revisit only with a dedicated surfacing toolchain decision.

Every generated archetype feeds india's closed loop (function-coverage + composition signals, commits `a872dbcfa8`/`e485a0ac18`/`22be177ec3`) — complex-assembly generation is also training-data generation.
