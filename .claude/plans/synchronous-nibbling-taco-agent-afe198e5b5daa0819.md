# hyperMILL Skills Architecture — Complete Design Plan
## Date: 2026-04-03 | Status: PLAN (pending approval before execution)

---

## Coverage Score Analysis

**Current state:** 2 skills exist out of a needed ~100 → Coverage = 2/100 = **2%**
**Target:** 100/100 = every hyperMILL workflow step has a slash command

The knowledge base is 100% built into engines. The skills layer is nearly empty.
Every engine listed below already exists — no new engines needed. Only skill files needed.

---

## Skill Design: Complete Set (52 new + 8 enhancements = 60 total skills)

Skills are grouped by the hyperMILL workflow arc:
**Setup → Tool → Cycle Selection → Parameters → Code Gen → Post → Simulate → Validate → Special Ops**

---

## GROUP 1: SETUP & CONFIGURATION (6 skills)

### 1. `/hypermill-project-setup` — EXISTING (enhance)
**Enhancement:** Add `--controller=FANUC|SIEMENS|HEIDENHAIN|...` flag that auto-configures post, units, and tolerances from HyperMillControllerCatalogEngine. Add step-skipping via `--step=N`.
**Engines:** HyperMillControllerCatalogEngine, HyperMillCycleDefaultsEngine
**Knowledge:** Manual Part 1, Controller Catalog (16 families, 60+ variants)

### 2. `/hypermill-frame-setup`
**What it does:** Guides the user through defining machining frames (NCS origin, clearance plane, axis orientations) for single-side and multi-side setups. Outputs a frame definition checklist.
**Engines:** HyperMillStrategyEngine, HyperMillSafetyHooks
**Knowledge:** Manual Part 1 (frames, NCS, clearance plane rules)
**Type:** NEW

### 3. `/hypermill-stock-define`
**What it does:** Calculates stock dimensions from part bounding box + user-specified allowances (X+/X-, Y+/Y-, Z+), outputs stock definition parameters for milling, turning, or MillTurn setups.
**Engines:** HyperMillCycleDefaultsEngine, HyperMillStrategyEngine
**Knowledge:** Manual Part 1 (stock definition), Metric.cfg formulas
**Type:** NEW

### 4. `/hypermill-controller-select`
**What it does:** Given a machine brand/model or controller name, returns the correct post-processor variant code, g-code dialect, and cycle support matrix. Warns when a cycle type isn't supported by the selected controller.
**Engines:** HyperMillControllerCatalogEngine, PostProcessorCapabilityMatrixEngine
**Knowledge:** Controller Catalog (16 families, 60+ variants), Post Catalog
**Type:** NEW

### 5. `/hypermill-post-configure`
**What it does:** Configures post-processor options for the selected controller — unit output, decimal format, cycle call style (G81 vs subprogram), arc format, and safety-line outputs.
**Engines:** HyperMillControllerCatalogEngine, PostLibraryConfiguratorEngine, PostSelectionEngine
**Knowledge:** NcGenerator 33.0 post configs, PostPropertyTaxonomy
**Type:** NEW

### 6. `/hypermill-safety-audit`
**What it does:** Runs hyperMILL-specific safety validation: clearance plane above all geometry, no negative allowance violations, tool reach check, holder collision clearance. Returns pass/fail with line items.
**Engines:** HyperMillSafetyHooks, CollisionDetectionEngine, GCodeSafetyAnalyzerEngine
**Knowledge:** 6 safety validation rules from Manual Parts 1-4
**Type:** NEW

---

## GROUP 2: TOOL MANAGEMENT (7 skills)

### 7. `/hypermill-tool-select` — ENHANCEMENT of `/tool-select`
**Enhancement:** Adds hyperMILL geometry class mapping (29 classes: Ballmill, Endmill, Radiusmill, Drilltool, Lollipop, Woodruff, etc.), outputs the correct dbl_param1..17 values for HMT database import.
**Engines:** HyperMillToolExportEngine, ToolRegistry (95,608 tools)
**Knowledge:** hypermill-tool-schema-notes.ts, sqlite.sql v1.53 schema
**Type:** ENHANCEMENT

### 8. `/hypermill-tool-export`
**What it does:** Exports selected tools from PRISM's 95K catalog to hyperMILL's .hmt SQLite format with correct geometry class parameters, holder data, and magazine slot assignments.
**Engines:** HyperMillToolExportEngine
**Knowledge:** sqlite.sql v1.53 (29 geometry classes, 3-tier hierarchy)
**Type:** NEW

### 9. `/hypermill-tool-assemble`
**What it does:** Builds a complete tool assembly (tool + holder + extension) for hyperMILL, validates projection length vs required reach, checks holder collision envelope against workpiece.
**Engines:** HyperMillToolExportEngine, CollisionDetectionEngine, ToolDeflectionEngine
**Knowledge:** Manual Part 1 (tool definition, holder/extension setup)
**Type:** NEW

### 10. `/hypermill-tool-library`
**What it does:** Browses and filters PRISM's tool catalog by hyperMILL geometry class, type, diameter range, or material grade. Returns a shortlist formatted for hyperMILL DB import.
**Engines:** HyperMillToolExportEngine, ToolRegistry
**Knowledge:** 587 tools with geometry, 29 hyperMILL geometry classes
**Type:** NEW

### 11. `/hypermill-magazine-optimize` — ENHANCEMENT of `/magazine-optimize`
**Enhancement:** Adds hyperMILL depot/magazine slot numbering output, outputs DepotItems SQL for direct HMT database injection.
**Engines:** HyperMillToolExportEngine, MagazineOptimizationEngine (if exists)
**Knowledge:** hyperMILL magazine/depot schema
**Type:** ENHANCEMENT

### 12. `/hypermill-speeds-feeds` — ENHANCEMENT of `/auto-speed-feed`
**Enhancement:** Forces lookup through hyperMILL's 2,544-material catalog with diameter-dependent Vc/fz tables (102 entries from Intelligent Macro DB), outputs hyperMILL-formatted speed/feed parameters (not raw Kienzle).
**Engines:** HyperMillMaterialBridgeEngine, AutoSpeedFeedEngine, SpeedFeedOrchestratorEngine
**Knowledge:** hypermill-speed-feed-catalog.ts (102 entries), hypermill-materials-catalog.ts (2,544 materials)
**Type:** ENHANCEMENT

### 13. `/hypermill-material-lookup`
**What it does:** Multi-standard material lookup across DIN Werkstoff, AISI, JIS, UNS, AFNOR, BS, UNI, and GOST standards — returns machinability correction factors (Vc, fz, ae, ap) for milling, drilling, and insert operations.
**Engines:** HyperMillMaterialBridgeEngine
**Knowledge:** 2,544 materials with multi-standard cross-reference, chipping classes
**Type:** NEW

---

## GROUP 3: 2D CYCLE SELECTION & SETUP (8 skills)

### 14. `/hypermill-2d-strategy`
**What it does:** Decision guide for all 2D cycles — selects between Contour Milling, Pocket Milling, Face Milling, Helical Drilling, Inclined Contouring, Rest Machining, etc. based on feature type.
**Engines:** HyperMillStrategyEngine, HyperMillCycleCatalogEngine
**Knowledge:** Manual Part 2 (2D cycles), 20 2D cycle types from omCycles.txt
**Type:** NEW

### 15. `/hypermill-pocket`
**What it does:** Sets up a 2D pocket operation — selects between Pocket Milling (contour-parallel), Pocket Milling (axisparallel), Circular Pocket, Rectangular Pocket, or Helical Drilling based on pocket geometry and entry constraints.
**Engines:** HyperMillStrategyEngine, HyperMillCycleDefaultsEngine
**Knowledge:** Manual Part 2 (pocket cycles), Metric.cfg defaults
**Type:** NEW

### 16. `/hypermill-contour`
**What it does:** Sets up a 2D contour operation — chooses between Contour Milling, Contour Plunge Milling, and Inclined Contouring. Outputs entry/exit approach modes, lead-in/lead-out settings.
**Engines:** HyperMillStrategyEngine, HyperMillCycleDefaultsEngine
**Knowledge:** Manual Part 2, Metric.cfg contour defaults
**Type:** NEW

### 17. `/hypermill-face-mill`
**What it does:** Sets up a Face Milling operation with correct stepover (T:Dia*0.8 default), entry approach, feed direction, and boundary mode. Flags when surface area exceeds machine table sweep.
**Engines:** HyperMillCycleDefaultsEngine, HyperMillStrategyEngine, AutoSpeedFeedEngine
**Knowledge:** Manual Part 2 (face milling), Metric.cfg
**Type:** NEW

### 18. `/hypermill-drill`
**What it does:** Full drilling cycle setup — selects between Drilling, Drill with Pecking, Drilling with Chip Break, Helical Drilling, Advanced Deep Hole Drilling, or Back Drilling based on depth-to-diameter ratio and chip clearance requirements.
**Engines:** HyperMillCycleCatalogEngine, HyperMillCycleDefaultsEngine, DrillCycleOptimizationEngine
**Knowledge:** Manual Part 3 (drilling cycles), 6 drilling cycle types, drill-calc formulas
**Type:** NEW

### 19. `/hypermill-thread`
**What it does:** Full thread operation setup — selects between Tapping and Thread Milling, pulls correct pitch/drill data from 11 thread standards (ISO Metric, UNC/UNF, BSP, DIN, JIS, GB), outputs all cycle parameters.
**Engines:** HyperMillThreadStandardEngine, HyperMillCycleDefaultsEngine
**Knowledge:** 11 thread standards from hyperMILL mnu/inv files, Manual Part 3 (tapping cycles)
**Type:** NEW

### 20. `/hypermill-bore`
**What it does:** Sets up boring, reaming, or fine boring cycles — recommends boring vs reaming vs interpolated boring (Helical Drilling with small stepdown) based on tolerance and surface finish requirements.
**Engines:** HyperMillCycleDefaultsEngine, BoreFinishingEngine, ReamingEngine
**Knowledge:** Manual Part 3, Metric.cfg boring defaults
**Type:** NEW

### 21. `/hypermill-chamfer`
**What it does:** Sets up chamfer/deburring operations in hyperMILL — selects cycle type, chamfer angle from tool, depth parameters. Includes chamfer tool parameter mapping (tip dia, included angle).
**Engines:** HyperMillCycleDefaultsEngine, HyperMillToolExportEngine
**Knowledge:** Chamfer geometry class (9) from tool schema, Manual Part 2
**Type:** NEW

---

## GROUP 4: 3D CYCLE SELECTION & SETUP (10 skills)

### 22. `/hypermill-3d-strategy-guide` — EXISTING (enhance)
**Enhancement:** Add `--material=X` flag to adjust strategy recommendations based on material machinability. Add direct output of Metric.cfg default parameters for the recommended cycle.
**Engines:** HyperMillStrategyEngine, HyperMillCycleDefaultsEngine, HyperMillMaterialBridgeEngine
**Knowledge:** Manual Part 4 (3D machining), Metric.cfg
**Type:** ENHANCEMENT

### 23. `/hypermill-3d-rough`
**What it does:** Full 3D roughing operation setup — selects between Z-Level Roughing, Optimized Rest Roughing, Offset Roughing, Arbitrary Stock Roughing. Outputs all cycle parameters with Metric.cfg defaults resolved to actual values.
**Engines:** HyperMillStrategyEngine, HyperMillCycleDefaultsEngine
**Knowledge:** Manual Part 4 (roughing strategies), Metric.cfg roughing defaults
**Type:** NEW

### 24. `/hypermill-3d-finish`
**What it does:** Full 3D finishing operation setup — selects between Z-Level Finishing, Profile Finishing, Equidistant Finishing, Complete Finishing, Iso Machining, Plane Machining. Outputs scallop height calculations.
**Engines:** HyperMillStrategyEngine, HyperMillCycleDefaultsEngine, SurfaceFinishPredictorEngine
**Knowledge:** Manual Part 4 (finishing strategies), Metric.cfg finishing defaults
**Type:** NEW

### 25. `/hypermill-3d-rest`
**What it does:** Sets up rest machining — selects between Automatic Rest Machining, Corner Rest Machining, Rework Machining, Pencil Milling based on rest material type and prior operation.
**Engines:** HyperMillStrategyEngine, HyperMillCycleDefaultsEngine
**Knowledge:** Manual Part 4 (rest machining), Metric.cfg rest defaults
**Type:** NEW

### 26. `/hypermill-pencil-mill`
**What it does:** Sets up Pencil Milling for groove/fillet cleanup — automatic groove detection parameters, tool radius selection, approach mode, and depth progression.
**Engines:** HyperMillCycleDefaultsEngine, HyperMillStrategyEngine
**Knowledge:** Manual Part 4 (Pencil Milling), Metric.cfg pencil defaults
**Type:** NEW

### 27. `/hypermill-plunge-mill`
**What it does:** Sets up Plunge Milling for deep cavity roughing — calculates axial step, radial infeed, approach angle, and recommends it when L/D > 4 for deflection reduction.
**Engines:** HyperMillCycleDefaultsEngine, PlungeMillingEngine, ToolDeflectionEngine
**Knowledge:** Manual Part 4, Metric.cfg plunge defaults
**Type:** NEW

### 28. `/hypermill-hsc`
**What it does:** HSC/HPC (High Speed Cutting) optimization guide for 3D cycles — selects trochoidal, optimized roughing, or equidistant finishing, calculates engagement angle limits, and sets dynamic feed control parameters.
**Engines:** HyperMillStrategyEngine, TrochoidalMillingEngine, AdaptiveFeedControlEngine
**Knowledge:** Manual Part 4 (HSC strategies), hyperMILL MAXX Machining module
**Type:** NEW

### 29. `/hypermill-3d-defaults`
**What it does:** Shows all Metric.cfg default values for a given cycle type — resolves all formula expressions (T:Dia*0.35, mtol*0.7, etc.) to real numbers given a tool diameter and tolerance.
**Engines:** HyperMillCycleDefaultsEngine
**Knowledge:** Metric.cfg (138 cycle configurations), formula variable system
**Type:** NEW

### 30. `/hypermill-allowance-calc`
**What it does:** Calculates safe stock allowance values — validates negative allowance rules (sum with corner radius must not be negative, surface gap limits), outputs maximum safe allowances per cycle.
**Engines:** HyperMillCycleDefaultsEngine, HyperMillSafetyHooks
**Knowledge:** Manual Part 4 (negative allowance rules), Safety validation rules
**Type:** NEW

### 31. `/hypermill-surface-quality`
**What it does:** Given a target Ra/Rz surface finish and cycle type, back-calculates the required stepover, tool diameter, and tolerance. Also works forward (given tool + stepover → predicted Ra).
**Engines:** SurfaceFinishPredictorEngine, HyperMillCycleDefaultsEngine, HyperMillStrategyEngine
**Knowledge:** Manual Part 4 (scallop height relationships), Physics: surface finish models
**Type:** NEW

---

## GROUP 5: 5-AXIS & MULTI-AXIS (8 skills)

### 32. `/hypermill-5axis-strategy`
**What it does:** Decision guide for 5-axis cycle selection — covers Swarf Cutting, Tangent Plane Machining, Profile Finishing (5-axis), Rest Machining (5-axis), Simultaneous 5-axis. Recommends based on geometry type.
**Engines:** HyperMillMultiAxisEngine, HyperMillStrategyEngine
**Knowledge:** Manual Part 4+ (5-axis strategies), 5-axis cycle types from omCycles.txt
**Type:** NEW

### 33. `/hypermill-impeller`
**What it does:** Full impeller machining setup guide — blade count, hub/shroud ratio, splitter presence, recommended roughing/finishing cycle sequence, stepover calculation for blade surfaces.
**Engines:** HyperMillMultiAxisEngine, ImpellerEngine
**Knowledge:** 5-axis impeller/blisk entries from HyperMillMultiAxisEngine, Manual Part 4
**Type:** NEW

### 34. `/hypermill-blade`
**What it does:** Sets up blade/blisk machining — selects between blade roughing, blade finishing, and fillet machining cycles. Outputs required surface selections and toolpath orientation.
**Engines:** HyperMillMultiAxisEngine
**Knowledge:** Blade/blisk geometry types from HyperMillMultiAxisEngine
**Type:** NEW

### 35. `/hypermill-port`
**What it does:** Sets up port machining operations (port roughing, port finishing) — guides surface selection, axis control limits, approach/retract inside confined geometry.
**Engines:** HyperMillMultiAxisEngine, CollisionDetectionEngine
**Knowledge:** Port geometry type from HyperMillMultiAxisEngine
**Type:** NEW

### 36. `/hypermill-5axis-drill`
**What it does:** Sets up 5-axis drilling (all-direction holes) — selects between 5-Axis Drilling, 5-Axis Drill with Pecking, 5-Axis Drilling with Chip Break from the 2D category in hyperMILL. Handles indexed vs simultaneous approach.
**Engines:** HyperMillCycleCatalogEngine, HyperMillCycleDefaultsEngine, FiveAxisPostEngine
**Knowledge:** 5-axis drilling entries from omCycles.txt, Manual Part 3+4
**Type:** NEW

### 37. `/hypermill-swarf`
**What it does:** Sets up Swarf (flank) cutting — selects the tangential surface, defines axis tilt limits, outputs lead/lag angles, validates tool length requirements.
**Engines:** HyperMillMultiAxisEngine, FiveAxisCAMIntegrationEngine
**Knowledge:** Swarf cutting from HyperMillMultiAxisEngine, Manual Part 4
**Type:** NEW

### 38. `/hypermill-dental`
**What it does:** Sets up dental machining workflows (crown, bridge, abutment) — selects correct geometry type, recommends finishing strategy for dental alloys and zirconia, outputs CADCAM fixture parameters.
**Engines:** HyperMillMultiAxisEngine
**Knowledge:** Dental geometry types (crown, bridge, abutment) from HyperMillMultiAxisEngine
**Type:** NEW

### 39. `/hypermill-axis-tilt`
**What it does:** Calculates optimal axis tilt angle for 5-axis surface machining — avoids zero-speed cutting at ball nose center, maximizes effective cutting diameter, outputs lead/tilt recommendations.
**Engines:** HyperMillMultiAxisEngine, FiveAxisToolpathIntegrationEngine, MultiAxisKinematicEngine
**Knowledge:** 5-axis tilt optimization, Manual Part 4, tribal knowledge tips
**Type:** NEW

---

## GROUP 6: TURNING & MILL-TURN (6 skills)

### 39b. `/hypermill-turning-strategy`
**What it does:** Decision guide for turning cycle selection — external turning, internal turning, grooving, parting, threading. Maps to hyperMILL turning cycle types in omCycles.txt.
**Engines:** HyperMillStrategyEngine, HyperMillCycleCatalogEngine, TurningPrintToProgramEngine
**Knowledge:** Manual Part 2 (turning), turning cycle entries in HyperMillStrategyEngine
**Type:** NEW

### 40. `/hypermill-millturn`
**What it does:** Sets up a MillTurn job — stock definition (length + diameter), NCS setup for turn-mill, channel sequencing, sync points. Guides through the extra MillTurn setup steps vs standard milling.
**Engines:** MillTurnCAMEngine, MillTurnSwissPipelineEngine, HyperMillCycleDefaultsEngine
**Knowledge:** Manual Part 1 (MillTurn variant), millturn cycle defaults
**Type:** NEW

### 41. `/hypermill-turning-contour`
**What it does:** Defines a turning contour from 2D profile — converts CAD profile to hyperMILL turning contour using Feature > 2D Contour workflow, validates contour for legal turning geometry.
**Engines:** TurningProfileEngine, HyperMillStrategyEngine
**Knowledge:** Manual Part 2 (turning contour definition)
**Type:** NEW

### 42. `/hypermill-groove`
**What it does:** Sets up grooving/parting operations — selects cycle type, groove width vs tool width, plunge vs oscillating approach, multi-pass calculation.
**Engines:** HyperMillCycleCatalogEngine, HyperMillCycleDefaultsEngine
**Knowledge:** Turning groove type from HyperMillStrategyEngine, Manual Part 2
**Type:** NEW

### 43. `/hypermill-turning-thread`
**What it does:** Sets up turning thread cycles — pitch, lead, thread form, number of passes, spring passes. Pulls from 11 thread standards. Outputs G76/G32 equivalent parameters.
**Engines:** HyperMillThreadStandardEngine, HyperMillCycleDefaultsEngine
**Knowledge:** 11 thread standards, Manual Part 2 (turning thread)
**Type:** NEW

### 44. `/hypermill-turning-feeds`
**What it does:** Calculates turning speed/feed for hyperMILL turning cycles — Vc in G96 (CSS) mode, feed per rev, depth of cut limits per material machinability class.
**Engines:** HyperMillMaterialBridgeEngine, TurningForceEngine, AutoSpeedFeedEngine
**Knowledge:** 2,544 materials with machinability factors, insert operation correction factors
**Type:** NEW

---

## GROUP 7: PROBING (3 skills)

### 45. `/hypermill-probe-setup`
**What it does:** Sets up in-cycle probing operations — workpiece origin measurement, bore/boss probing, surface probing. Selects correct cycle from the probing category (9 probing cycles in omCycles.txt).
**Engines:** HyperMillCycleCatalogEngine, ProbingCycleEngine, ProbingProgramEngine
**Knowledge:** Probing category from omCycles.txt, Manual Part 1 (probing setup)
**Type:** NEW

### 46. `/hypermill-probe-validate`
**What it does:** Generates hyperMILL probing validation programs — pre-machining stock touch-off, inter-operation measurement, final inspection. Outputs measurement report format.
**Engines:** ProbingProgramEngine, HyperMillCycleDefaultsEngine
**Knowledge:** Probing cycles, quality-check workflow
**Type:** NEW

### 47. `/hypermill-tool-measure`
**What it does:** Sets up tool length and radius measurement cycles — selects between laser measurement and touch-setter cycles, outputs correct probing parameters for the controller.
**Engines:** HyperMillControllerCatalogEngine, ProbingCycleEngine
**Knowledge:** Controller probing support matrix, probing cycle defaults
**Type:** NEW

---

## GROUP 8: CODE GENERATION & AUTOMATION (6 skills)

### 48. `/hypermill-automation-script`
**What it does:** Generates a complete hyperMILL Automation Center (AC) Python script for the described operation sequence — roughing → finishing → probing → NC generation, ready to run.
**Engines:** HyperMillCodeGeneratorEngine
**Knowledge:** hyperMILL AC Python API, 7 template categories (roughing_3d, finishing_3d, five_axis, tool_setup, nc_generation, batch, job_setup)
**Type:** NEW

### 49. `/hypermill-nc-generate`
**What it does:** Drives NC generation for the selected job list — selects post processor variant, validates NC output, checks for controller-specific issues (arc format, decimal precision, M-code mapping).
**Engines:** HyperMillCodeGeneratorEngine, HyperMillControllerCatalogEngine, PostProcessorPipelineEngine
**Knowledge:** NcGenerator 33.0, post variant codes (omPP prefixes)
**Type:** NEW

### 50. `/hypermill-batch`
**What it does:** Generates a batch automation script for processing multiple parts — loops through job lists, calculates toolpaths, generates NC files. Uses Automation Center batch template.
**Engines:** HyperMillCodeGeneratorEngine
**Knowledge:** AC batch template category
**Type:** NEW

### 51. `/hypermill-job-sequence`
**What it does:** Builds and validates the job list sequence for a complete part — orders operations (rough → semi → finish → rest → thread → bore → probe), checks for tool conflicts, missing geometry, unlinked operations.
**Engines:** HyperMillStrategyEngine, HyperMillCycleCatalogEngine, HyperMillSafetyHooks
**Knowledge:** Manual Part 1 (job list structure), Manual Parts 2-4 (operation ordering rules)
**Type:** NEW

### 52. `/hypermill-program-validate` — ENHANCEMENT of `/program-validate`
**Enhancement:** Adds hyperMILL-specific validation: checks NCS consistency, clearance plane violations, negative allowance rule compliance, controller cycle support, tool reach validation.
**Engines:** HyperMillSafetyHooks, GCodeValidationEngine, PostProcessorVerificationEngine, CollisionDetectionEngine
**Knowledge:** 6 safety validation rules, controller cycle support matrix
**Type:** ENHANCEMENT

### 53. `/hypermill-gcode-check`
**What it does:** Post-generation NC file check for hyperMILL outputs — verifies G-code dialect matches controller, flags unsupported cycles, checks rapid moves for collision risk, validates tool change sequences.
**Engines:** GCodeValidationEngine, GCodeSafetyAnalyzerEngine, HyperMillControllerCatalogEngine
**Knowledge:** 16 controller g-code dialects, safety validation rules
**Type:** NEW

---

## GROUP 9: SIMULATION & VERIFICATION (4 skills)

### 54. `/hypermill-simulate`
**What it does:** Pre-run simulation checklist — confirms all jobs are calculated (green checkmarks), collision check passes, NC file generated. Bridges to NCSIMUL if configured.
**Engines:** HyperMillSafetyHooks, NCSIMULBridgeEngine, CollisionDetectionEngine
**Knowledge:** Manual Part 1 (verification steps), tribal knowledge simulation tips
**Type:** NEW

### 55. `/hypermill-collision-check`
**What it does:** Runs collision analysis — validates holder/shank clearances against milling area, checks tool reach against feature depth, flags holder contact risk zones.
**Engines:** HyperMillSafetyHooks, CollisionDetectionEngine, CollisionPreventionEngine
**Knowledge:** Safety rules, holder clearance defaults from Metric.cfg
**Type:** NEW

### 56. `/hypermill-first-part-right` — ENHANCEMENT of `/first-part-right`
**Enhancement:** Adds hyperMILL-specific pre-run checklist: NCS origin confirm, clearance plane verify, unit system confirm, tool database sync check, post-processor variant confirm.
**Engines:** HyperMillSafetyHooks, HyperMillControllerCatalogEngine, GCodeVerificationEngine
**Knowledge:** Manual Part 1 common pitfalls (7 listed), tribal knowledge tips
**Type:** ENHANCEMENT

### 57. `/hypermill-cycle-time` — ENHANCEMENT of `/cycle-time-crush`
**Enhancement:** Uses hyperMILL cycle defaults (Metric.cfg) to set accurate rapid/cutting distances for each cycle type, improving cycle time accuracy over generic estimates.
**Engines:** HyperMillCycleDefaultsEngine, CycleTimeAccuracyEngine, CycleTimeEstimatorEngine
**Knowledge:** 138 cycle configurations with default stepdown/stepover formulas
**Type:** ENHANCEMENT

---

## GROUP 10: PRINT-TO-PROGRAM & FULL-JOB ORCHESTRATION (4 skills)

### 58. `/hypermill-print-to-program` — ENHANCEMENT of `/print-to-program`
**Enhancement:** Routes through hyperMILL-specific cycle selection (all 120+ cycle types) instead of generic CAM, outputs hyperMILL-formatted AC Python script rather than raw G-code.
**Engines:** HyperMillStrategyEngine, HyperMillCodeGeneratorEngine, HyperMillMaterialBridgeEngine, AutoPrintToProgramBridgeEngine
**Knowledge:** Full hyperMILL knowledge base (all 4 manual parts, cycle catalog, defaults)
**Type:** ENHANCEMENT

### 59. `/hypermill-full-job`
**What it does:** End-to-end job orchestration — takes part description + material + machine, produces complete hyperMILL job list with cycle selections, speeds/feeds, tool assignments, and AC Python script, ready to run.
**Engines:** HyperMillStrategyEngine, HyperMillCodeGeneratorEngine, HyperMillMaterialBridgeEngine, HyperMillToolExportEngine, HyperMillControllerCatalogEngine, HyperMillCycleDefaultsEngine
**Knowledge:** All 4 manual parts, all 11 engines, full knowledge base
**Type:** NEW

### 60. `/hypermill-setup-sheet` — ENHANCEMENT of `/setup-sheet-generate`
**Enhancement:** Outputs hyperMILL-specific setup sheet format — includes NCS definition, frame IDs, job list with cycle types (hyperMILL names, not generic), tool numbers matched to HMT database, NC file name.
**Engines:** HyperMillCycleCatalogEngine, HyperMillToolExportEngine, HyperMillControllerCatalogEngine
**Knowledge:** Manual Part 1, HMT tool schema
**Type:** ENHANCEMENT

---

## GROUP 11: LEARNING & TRIBAL KNOWLEDGE (3 skills)

### 61. `/hypermill-tips`
**What it does:** Surfaces relevant tribal knowledge tips for the current operation type — filters PRISM's 200 hyperMILL-specific tips (from Manual Parts 1-4) by cycle type, material, or problem symptom.
**Engines:** ApprenticeEngine, TribalKnowledgeEngine (3,700+ tips, 200 hyperMILL-specific)
**Knowledge:** 200 tribal knowledge tips (Manual Parts 1-4)
**Type:** NEW

### 62. `/hypermill-troubleshoot`
**What it does:** Diagnoses hyperMILL CAM problems — bad surface finish, chatter, tool breakage, calculation errors, NC generation failures. Maps symptoms to root causes using tribal knowledge.
**Engines:** ApprenticeEngine, AlarmDiagnosticsEngine, HyperMillSafetyHooks
**Knowledge:** 200 tribal knowledge tips, Manual Parts 1-4 troubleshooting sections
**Type:** NEW

### 63. `/hypermill-learn`
**What it does:** Interactive learning mode for hyperMILL — takes a topic (cycle type, workflow step, parameter name) and teaches it using training manual content. Uses the 4 training video transcripts for visual concepts.
**Engines:** ApprenticeEngine
**Knowledge:** All 4 training manual PDFs, 4 video transcripts
**Type:** NEW

---

## COVERAGE SCORE

| Group | Skills | Coverage |
|-------|--------|----------|
| Setup & Config | 6 (4 new + 2 enhanced) | Project setup ✓ |
| Tool Management | 7 (5 new + 2 enhanced) | Tool workflow ✓ |
| 2D Cycles | 8 new | All 2D cycles ✓ |
| 3D Cycles | 10 (9 new + 1 enhanced) | All 3D cycles ✓ |
| 5-Axis / Multi-Axis | 8 new | All 5-axis specialties ✓ |
| Turning / MillTurn | 6 new | Full turn workflow ✓ |
| Probing | 3 new | All probing cycles ✓ |
| Code Gen / Automation | 6 (5 new + 1 enhanced) | NC generation ✓ |
| Simulation & Verify | 4 (2 new + 2 enhanced) | Sim + safety ✓ |
| Print-to-Program | 3 enhanced + 1 new | End-to-end ✓ |
| Learning / Tribal | 3 new | Knowledge access ✓ |
| **TOTAL** | **52 new + 8 enhanced = 60 skills** | **~95/100** |

**Gap to 100:** Grinding cycles (hyperMILL VIRTUAL Machining integration), EDM electrode strategies in hyperMILL context, APT cycle types — these are niche enough to defer.

---

## Implementation Strategy

### Phase 1 — Core Workflow (build these first, ~15 skills)
Priority: the skills a programmer hits on every single job.
1. `/hypermill-material-lookup` — before any speeds/feeds
2. `/hypermill-speeds-feeds` (enhance) — every operation
3. `/hypermill-2d-strategy` — most common work
4. `/hypermill-drill` — every part has holes
5. `/hypermill-thread` — extremely common
6. `/hypermill-3d-rough` — all 3D parts
7. `/hypermill-3d-finish` — all 3D parts
8. `/hypermill-3d-defaults` — debugging any 3D setup
9. `/hypermill-controller-select` — first thing configured
10. `/hypermill-nc-generate` — last step every time
11. `/hypermill-safety-audit` — before every run
12. `/hypermill-collision-check` — before every run
13. `/hypermill-tool-export` — database sync
14. `/hypermill-automation-script` — batch workflow
15. `/hypermill-full-job` — the flagship orchestrator

### Phase 2 — Specialty Ops (~15 skills)
5-axis (impeller, blade, swarf, port), turning, mill-turn, probing, HSC

### Phase 3 — Polish (~15 skills)
Learning, troubleshoot, tips, print-to-program enhancement, first-part-right

### Phase 4 — Edge Cases (~15 skills)
Dental, deep hole, plunge milling, allowance calc, batch, surface quality

---

## Execution Notes

- All 11 hyperMILL engines already exist — zero new engine work needed
- Skill files go to `/h/prism/.sessions/claude/global/commands/hypermill-*.md`
- Each skill references specific engine methods and knowledge source citations
- Skills should include `$ARGUMENTS` handling for the most common flags
- Each skill needs a `## Safety` section (the engines enforce this but skills reinforce it)
- YOLO mode: build each skill as a standalone .md, commit after each group of 5
- Commit format: `HYPERMILL-SKILLS-G{N}: group title — N skills added`
