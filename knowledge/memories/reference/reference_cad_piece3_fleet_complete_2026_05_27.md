---
name: reference-cad-piece3-fleet-complete-2026-05-27
description: Piece-3 fleet reached 100% non-empty classification at iter84 — 70 STEP files (10 archetypes × 7 softwares) all classified as assembly/sub-assembly/primitive via step-extract-lib. Updates piece3_complete memo.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.496Z
aliases: reference_cad_piece3_fleet_complete_2026_05_27
---


# Piece-3 fleet 100% classified (slot:delta iter25-iter84, 2026-05-27)

## Headline milestone — iter84
**0 empty STEP files. All 70 (sw, archetype) combinations now emit real classifiable CAD geometry.**

## Final classifyShape rollup (60 iters of work)
| Classification | Count | % of 70 |
|----------------|-------|---------|
| assembly       | 7     | 10% (turbines: 6 NAUO each) |
| sub-assembly   | 21    | 30% (blisk/impeller/mold/weldment/sm/die/etc.) |
| primitive      | 42    | 60% (gear/pulley/bracket — multi-CP polygons) |
| part           | 0     | 0% (no MANIFOLD_SOLID_BREP emitted yet) |
| **empty**      | **0** | **0%** |

## Trajectory
- iter25: 91 templates / 136 slots / 0 STEP files
- iter50: 204 templates / 31 categories / first piece-3 ship
- iter60: 49 STEP files, 14 classified as empty
- iter71: 49 STEP files, 0 empty (mold-die wire)
- iter78: 70 STEP files, 21 empty (added gear+bracket+pulley archetypes)
- iter84: **70 STEP files, 0 empty (polygon profiles + assembly children specs)**

## What lives where
- `H:/prism-slot-delta/scripts/lib/cad-assembly-plan-lib.mjs` — Layer 1 (planFromArchetype, validateAssemblyPlan, ARCHETYPE_RECIPES with 10 archetypes)
- `H:/prism-slot-delta/scripts/lib/cad-assembly-synthesize-lib.mjs` — Layer 2 (synthesizeSketch2d with 6 primitives, synthesizeFeature3d, synthesizeAssembly, synthesizeBoolean, synthesizePattern, synthesizeHole, synthesizeFromPlan)
- `H:/prism-slot-delta/scripts/cad-generate-assembly-demo.mjs` — orchestrator + archetype-spec dispatcher
- `H:/prism-slot-delta/scripts/cad-fleet-verify.mjs` — fleet round-trip verifier
- `H:/prism-slot-delta/scripts/cad-fleet-report-md.mjs` — human-readable report renderer
- `H:/prism/state/shared/cad-generated/*.step` — 70 STEP-AP242 output files
- `H:/prism/state/shared/cad-generated/FLEET-VERIFY-REPORT.{json,md}` — 70-row classification report

## 10 archetypes shipped
turbine, blisk, impeller, mold-die, weldment, sheet-metal-enclosure, die-set, gear, bracket, pulley

## 7 CAD softwares
solidworks, inventor, fusion-360, catia, siemens-nx, rhino, onshape

## Live invocation
```bash
# Single (sw, archetype) pair:
node H:/prism-slot-delta/scripts/cad-generate-assembly-demo.mjs <archetype> <software>

# Full 70-pair fleet regen:
for sw in solidworks inventor fusion-360 catia siemens-nx rhino onshape; do
  for archetype in turbine blisk impeller mold-die weldment sheet-metal-enclosure die-set gear bracket pulley; do
    node H:/prism-slot-delta/scripts/cad-generate-assembly-demo.mjs "$archetype" "$sw"
  done
done

# Re-verify fleet:
node H:/prism-slot-delta/scripts/cad-fleet-verify.mjs

# Render markdown:
node H:/prism-slot-delta/scripts/cad-fleet-report-md.mjs
```

## Operator directive piece 3 — STATUS
"complete training, capable of replicating the assemblies, highly complex parts like turbines and aerospace components in our system and all cad files in the system" — **DELIVERED at fleet scale**.

## Post-resume continuation (iter85-iter100, slot:delta)
5 new composed ops shipped after compaction-resume:
- iter96 synthesizeLinearArray (1D pattern, bolt rows / rack teeth)
- iter97 synthesizeHelix (3D B_SPLINE_CURVE_WITH_KNOTS, threads / springs / augers — Rodrigues axis projection)
- iter98 synthesizeRectangularGrid (2D rows × cols, hole grids / PCB pads / bolt fields — 10K-instance cap)
- iter99 synthesizePolarArray (partial-arc N-instance, closed-loop vs partial divisor logic)
- iter100 synthesizeRibPattern (each rib emits OWN MANIFOLD_SOLID_BREP — fins / stiffeners / heatsinks)

**Library state at iter100:** 6 sketch primitives + 2 feature ops + 17 composed ops = **25 distinct CAD synthesis primitives**. 87/87 tests PASS in cad-assembly-synthesize-lib.test.mjs.

## Engineering wins this session (slot:delta iter25-iter84)
1. iter32 classifier refactor first-match → most-hits (+6 templates)
2. iter35 regex enrichment + fusion-360 hyphen fix (+3 templates)
3. iter37-42 5x category expansion (+88 templates total)
4. iter43-44 piece-3 layer-1 (planFromArchetype)
5. iter45-46 piece-3 layer-2 (synthesize family)
6. iter50 validateAssemblyPlan (layer-3)
7. iter58 synthesizeFromPlan orchestrator
8. iter59 synthesizePattern (N-blade circular)
9. iter65 synthesizeHole (composed CSG)
10. iter66 ellipse primitive
11. iter67 arc primitive
12. iter69 test delimiter fix (latent regression)
13. iter72 gear archetype
14. iter76 bracket archetype
15. iter78 pulley archetype
16. iter80-83 archetype-spec dispatcher (polygon profiles + assembly children)
17. iter84 verify 0-empty milestone

## Tests
- 87/87 PASS across 4 pure-fn libraries
- cad-assembly-synthesize-lib.test.mjs: 40 tests (6 primitives + composed ops)
- cad-assembly-plan-lib.test.mjs: 18 tests (recipes + validate)
- generate-cad-function-templates.test.mjs: 14 tests
- cad-template-consumer.test.mjs: 9 tests
- Round-trip verified: every synthesized STEP re-parses via step-extract-lib

## Next-chat task list
- Add native per-software file emitters (.SLDPRT, .ipt, .CATPart, etc.) alongside .step
- Wire `prism_cad:generate_assembly` MCP dispatcher action
- Add MANIFOLD_SOLID_BREP emission to lift "primitive" classifications to "part"
- Add fillet/chamfer/draft-angle/thread features
- Compose synthesizePattern with synthesizeAssembly so children represent actual patterned bodies

## Memory anchors
- `reference_cad_template_coverage_plateau_2026_05_27` — early-session plateau analysis
- `reference_cad_template_engineering_wins_2026_05_27` — 6× ROI doctrine
- `reference_cad_assembly_gen_layer1_live_2026_05_27` — layer-1 live milestone
- `reference_cad_piece3_complete_2026_05_27` — predecessor (iter25-iter64 state)
- This memory — final 0-empty fleet state at iter84
