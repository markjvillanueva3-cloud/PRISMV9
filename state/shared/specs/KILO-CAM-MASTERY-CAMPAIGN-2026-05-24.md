# KILO-CAM-MASTERY-CAMPAIGN — 2026-05-24

> Operational expansion of MS-CAM-MASTERY §R9 (REVENUE-ROADMAP v7.5) under
> kilo's CAM-specialist pivot. Adopts user's revised priority order:
> **hyperMILL > Fusion > Mastercam > Esprit** (4 systems on the GA path;
> hyperCAD/Inventor stay on §R9's queue).

## Goal (user directive, verbatim)

> "continue ms-cam-mastery pillars, once we wired and bridged all cam nodes,
> begin training the ai system, neural network to accurately generate cam
> programs for hypermill, fusion, mastercam, espirit in that priority order.
> we need full input functionality of every button with knowledge of how to
> effectively and efficiently use them. final test with be a combination of
> cad/cam demonstration of intaking a print and generating a cad model,
> inserted into an assembly with fixturing (jm die mate 5 axis vise) then
> generate a highly complex cam program that utilizes every single available
> tool path in the cam software (efficiency, cost efficiency not factored in
> since we're just trying to prove you can use every feature not generate an
> optimized full program), next step will be to train to generate the most
> efficient and optimized cam program possible, then test in the hypermill
> simulator and our own computational algorithms for collision avoidance."

## Phase plan (one-cycle plan; iter mapping to slot/kilo /loop)

| Phase | Deliverable | Owner / iter |
|---|---|---|
| **0** | This campaign spec | kilo iter 1 (current) |
| **1** | Toolpath coverage catalog JSON (per system, every toolpath enumerated) | kilo iter 2 |
| **2** | KiloCamDatasetBuilderEngine — emits `{intent, features, system} → {strategy, parameters}` tuples for LoRA training | kilo iter 3 + test |
| **3** | KiloCamCoverageHarnessEngine — given a CAD-AI part, returns the "use every toolpath" demo plan (toolpath ID + recommended feature target) | kilo iter 4 + test |
| **4** | Per-system Pillar-B "how to CAM" stub catalogs (hyperMILL/Fusion/Mastercam/Esprit toolpath inventories) | kilo iter 5 |
| **5** | E2E-COVERAGE-DEMO spec — JM-Die-mate 5-axis vise fixture + print intake → CAD → assembly → coverage-demo CAM program → hyperMILL simulator + PRISM collision-avoidance gate | kilo iter 6 |
| **6** | Test plan: optimized-program training (Pillar B+C), validation against simulator + PRISM CollisionAvoidanceEngine | kilo iter 7 |
| **7** | PSN-synergy retrospective + close-out | kilo iter 8 |

## Per-system toolpath surface (Pillar B target — count of toolpaths to demonstrate)

These are the toolpaths that must appear in the coverage demo to satisfy "use every available toolpath in the CAM software." Counts sourced from each vendor's
2024 strategy reference.

### hyperMILL 2024 — priority #1 (~62 toolpaths)
**2D**: Face Milling, 2D Contour, 2D Pocket, 2D Slot, 2D Chamfer, 2D Engraving, Thread Milling
**Drilling**: G81 Drill, G73 Peck, G83 Deep Peck, G82 Dwell, G84 Tap, G85 Bore, Helical Drill, Trepanning
**3D Roughing**: OptiRough, OptiHorizontal, OptiPlunge, RestRough, 3D Pocket, Z-Level Rough
**3D Finishing**: Z-Level Finish, Equidistant Finish, ISO Machining, Profile Finish, Plain Finish, Restmachining Finish, Pencil Finish, Project Curves, Spiral Finish, Radial Finish, Project Surfaces, Morph Between Two Curves
**5-axis**: Swarf Cutting, 5X Tangent Machining, 5X Indexing, 5X Multi-Axis Shape Offset Finishing, 5X Surface Finishing, 5X Side Milling Tilting, 5X Rotational Indexing, 5X Tool Tilting, Port Machining, Impeller/Blisk, Multi-Blade, Deburring
**Mill-Turn**: Turn Rough, Turn Finish, Turn Groove, Turn Thread, Turn Part-Off, Driven Tools
**Probing**: Touch Probe, Tool Probe, 5-Axis Calibration

### Fusion 360 2024 — priority #2 (~45 toolpaths)
**2D**: Face, 2D Contour, 2D Adaptive, 2D Pocket, Slot, Trace, Engrave, Bore, Thread, Circular
**Drilling**: Drill (canned cycles), Helical, Tapping
**3D Roughing**: Adaptive Clearing, Pocket Clearing, Steep and Shallow
**3D Finishing**: Parallel, Contour, Ramp, Horizontal, Pencil, Scallop, Spiral, Radial, Morphed Spiral, Project, Flow, Surface
**5-axis**: Multi-Axis Contour, Swarf, Multi-Axis Shape Offset, Multi-Axis Flow, Multi-Axis Spiral, Multi-Axis Radial, Multi-Axis Curve, Multi-Axis Project, Multi-Axis Steep and Shallow, Multi-Axis Floor, Rotary, Indexing
**Turning** (Fusion turning workspace): Profile Rough, Profile Finish, Groove, Thread, Part, Face, Bore, Stock Transfer
**Probing**: WCS Probe, Tool Length Probe

### Mastercam 2024 — priority #3 (~52 toolpaths)
**2D**: Face, Contour, Pocket, Dynamic Mill, Dynamic Contour, 2D HighSpeed, Engraving, Plunge, FBM Mill, FBM Drill, Spiral, Drill (canned), Peck Drill, Tap, Bore, Helical
**3D Roughing**: OptiRough, Pocket, Plunge Rough, Horizontal Area, Area Roughing, Dynamic OptiRough
**3D Finishing**: Parallel, Contour, Hybrid, Equal Scallop, Spiral, Pencil, Project, Flowline, Constant Scallop, Z-Level Finish, Rest Finish, Surface High Speed, Scallop, Horizontal Area Finish
**5-axis**: Multiaxis Curve, Multiaxis Drill, Multiaxis Pocketing, Multiaxis Swarf, Multiaxis Flow, Multiaxis Parallel To Multiple Curves, Multiaxis Projection, Multiaxis Rotary, Multiaxis Triangular Mesh, Multiaxis Port, Multiaxis Blade Expert
**Lathe** (Mill-Turn): Rough, Finish, Groove, Thread, Drill, Bore, Part Off, C-Axis Mill, Y-Axis Mill, Live Tooling
**Probing**: Tool Probe, Probe WCS, Probe Geometry

### Esprit 2024 — priority #4 (~38 toolpaths)
**2D**: Facing, Contouring, Pocketing, ProfitMilling, Pattern Drilling, ESPRIT High-Speed Roughing
**3D Roughing**: ProfitMilling 3D, Z-Level Roughing, Plunge Roughing, Rest Roughing
**3D Finishing**: Parallel Plane, Contour, Equidistant, Spiral, Radial, Pencil, Project, Flowline, Constant Cusp
**5-axis**: Swarf, Multi-Axis Drill, Port Roughing, Port Finishing, 5-Axis Indexed, Multi-Axis Surface, Multi-Axis Curve, Multi-Axis Tilt-Composite, Blade/Impeller Machining
**Turning** (Mill-Turn): SolidTurn Rough, SolidTurn Finish, Groove, Thread, Drill, Part, Y-Axis Mill, B-Axis Live, Sub-Spindle Transfer
**Probing**: Touch Probe Cycle, Tool Probe Cycle, In-Process Verification

## Coverage-demo acceptance criteria (Phase 5)

The E2E coverage demo passes IF:

1. **Print intake**: a JM-Die blueprint (one of the 130 pair-complete parts in
   `state/shared/jm-die-partlib-manifest.json` — kilo iter13's substrate)
   parses via the existing print-OCR pipeline, no PMI gap, no ambiguous callout.
2. **CAD generation**: a Fusion 360 .f3d (or any-CAD via
   `CADMultiSystemAIProducerEngine`) is produced from the print, regen-test
   passes ≥75% (the hypercad validation harness baseline).
3. **Assembly + fixture**: the CAD part is mated to the **JM Die Mate 5-Axis
   Vise** fixture in a Fusion assembly. Fixture geometry is loaded from
   `state/shared/fixtures/jm-die-mate-5ax-vise.{f3d,step}` (substrate to ship).
4. **CAM program emission (every toolpath)**: a single CAM program in the
   target CAM system that calls at least 1 operation of EVERY toolpath in the
   per-system catalog above. Operation parameters can be vendor-defaults
   (efficiency NOT a criterion in Phase 5). Coverage tracking via
   KiloCamCoverageHarnessEngine.
5. **Post-process + simulate**: the program posts to G-code (per the
   subscription post-processor for the JM Die Mate's controller) AND
   simulates clean in the hyperMILL simulator (Phase 5 uses hyperMILL's
   simulator as the universal target — Fusion/Mastercam/Esprit programs
   roundtrip through a STEP/CL export and replay in hyperMILL).
6. **Collision avoidance**: the program passes the PRISM
   CollisionAvoidanceEngine gate. Any collision found in either the vendor
   simulator OR PRISM's algorithm is a Phase 5 failure.

## Phase 6 (optimized program training) — design notes

Optimization training adds these signals on top of Phase 5's "every toolpath" baseline:

- **Cycle time** (Z-axis time + table time + tool-change time — physics-based, not vendor-reported)
- **Tool life** (Taylor equation forecast per operation, summed)
- **Surface finish predictability** (Ra forecast per finishing operation)
- **MRR** (material removal rate per roughing operation)
- **Cost** (deferred — `MaterialCost + ToolCost + MachineTime × hourly_rate`)

The optimized-program LoRA train uses Phase-5's "every-toolpath corpus" as the
breadth-first scaffold, then adds Phase-6 efficiency signals via the
SpeedFeedOrchestrator + ChatterStabilityLobe + ToolLifeEngine outputs as
training-time reward.

## Cross-refs

- `state/shared/audit-findings/revenue-roadmap/round8/00-v7.5-cam-mastery.md` — canonical MS-CAM-MASTERY §R9
- `knowledge/memories/reference/reference_kilo_cam_pivot_2026_05_24.md` — pivot retrospective
- `knowledge/memories/reference/reference_p2p_substrate_trio_2026_05_24.md` — p2p substrate (partlib manifest = source for fixture mate + part selection)
- `mcp-server/src/engines/CAMLoRAAdapterTrainerEngine.ts` — existing per-system LoRA training infrastructure (will extend `Priority4CAM` to `Priority4CAM | "esprit"` at echo's merge)
- `mcp-server/src/engines/CamBridgeKitEngine.ts` (echo, uncommitted in shared tree) — sibling SFC-bridge layer
- `mcp-server/src/engines/KiloCamSfcBridgesEngine.ts` (kilo iter1) — Mastercam + Esprit SFC bridges shipped this campaign
- `mcp-server/src/engines/KiloHyperCadFeatureTaggerEngine.ts` (kilo iter4) — hyperMILL PFC tagger
