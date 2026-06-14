---
name: reference-cam-corpus-locations
description: "Where every CAM-related asset lives on H: drive — installs, vendor docs, in-house JM Die project files, post-processors, E-Learning videos, automation surfaces. Read this BEFORE web-searching CAM samples."
type: reference
slot: kilo
source: prism-memory
synced: 2026-06-09T14:54:09.047Z
aliases: reference_cam_corpus_locations
---


# CAM corpus locations (H: drive — JM Die canonical)

**Critical context:** JM Die has **full Mastercam X8 + hyperMILL 31.0 / 33.0 installs with hardware keys plugged into DESKTOP-N7MI1VB**. Webscraping for samples / training files is wrong default — the vendor-shipped material is already local.

## Vendor installs (live with hardware keys)

| Software | Install root | Notes |
|---|---|---|
| Mastercam X8 | `H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/` | C-Hook + ATP NetHook + VBScript automation surface |
| hyperMILL v31.0 | `H:/PRISM/resources/HYPERMILL/hyperMILL/31.0/` | older — 57 English .LOC msg files at `cycLang/English/` |
| hyperMILL v33.0 | `H:/PRISM/resources/HYPERMILL/hyperMILL/33.0/` | newer (referenced — confirm presence) |
| OPEN MIND docs | `H:/PRISM/resources/OPEN MIND/doc/{31.0,33.0}/` | E-Learning videos + TOOL Builder HTML5 |
| Fusion 360 | `H:/PRISM/resources/FUSION360/` | + `FUSION POSTS/`, `FUSION BASIC POSTS/`, `FUSION 360 PROGRAMS/` |
| HSMWorks 2026/2027 | `H:/PRISM/resources/HSMWorks 2026/` and `2027/` | Autodesk HSM inside SW/Inventor |
| Inventor 2027 | `H:/PRISM/resources/Inventor 2027/` | Autodesk |
| SolidCAM | `H:/PRISM/resources/SOLIDCAM/` | |
| SolidWorks | `H:/PRISM/resources/SOLIDWORKS/` | |
| FreeCAD | `H:/PRISM/resources/Freecad/` | open-source |

## Vendor training material (already on disk)

### hyperMILL / OPEN MIND
- **10 official PDF manuals** at `H:/PRISM/JM DIE/OKUMA/hyperCAD-S and hyperMILL Online Training/PDF/`:
  `hyperMILL_Manual-en.pdf`, `hyperCAD-S_Manual-en.pdf`, `AUTOMATION_Center_Manual-en.pdf`, `Installation_Manual-en.pdf`, `SQL_Macro_Database_Manual-en.pdf`, `SQL_Tool_Database_Manual-en.pdf`, `Synchronization_Tool_Database_Manual-en.pdf`, `TOOL_Builder_Manual-en.pdf`, `VIRTUAL_Machining_Center_Manual-en.pdf`, Day-1 `2D_Drawing.pdf`
- **OPEN MIND E-Learning Machine-Simulation video course** (37 `.mp4` clips, identical content in both versions — prefer en-US):
  - `H:/PRISM/resources/OPEN MIND/doc/33.0/E-Learning/Machine-simulation/en-US/story_content/video_*.mp4` ← **canonical**
  - `H:/PRISM/resources/OPEN MIND/doc/31.0/E-Learning/Machine-simulation/en/story_content/video_*.mp4` (older copy)
- **57 English `.LOC` cycle-message dictionaries** at `H:/PRISM/resources/HYPERMILL/hyperMILL/31.0/cycLang/English/` — UTF-16 LE encoded, format `<id>\t<text>`. **NOT parameter schemas — they're user-facing prompts/info/warn/error strings per cycle**. Useful for tribal-knowledge mining (each line is a vendor-tagged tip). Cycle filenames: HMPOCKHC (pocket), HMPROFHC (profile), HMCONTHC (contour), HMFACEHC (face), HMDRX5HC (drill 5ax), HMRMATHC (rest-mat), HMTAPDHC (tap-drill), HMZFINHC (z-finish), HMBRX5HC (bottom-rough-5ax), and many more (full list via `Glob *.LOC` in that dir).
- TOOL Builder HTML5 interactive docs: `H:/PRISM/resources/OPEN MIND/doc/{31.0,33.0}/HTML5/TOOL Builder/`
- **JM Die "hyperCAD-S and hyperMILL Online Training" full training set** (3 days, all source `.hmc` files):
  `H:/PRISM/JM DIE/OKUMA/hyperCAD-S and hyperMILL Online Training/{1- Basic Training Day 1,2- Basic Training Day 2,3- Basic Training Day 3}/`

### Mastercam
- **No bundled official PDF manuals found on disk** (X8 is older — manuals likely on the original install media)
- Help / scripting reference:
  - `H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/help/SCRIPT56.CHM` (VBScript ref)
  - `H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/help/VBScript.htm`

### Esprit (no local install confirmed)
- 28 `.esp` programs from a specialist programmer at `H:/PRISM/JM DIE/WIRE EDM/TOMEK - PROGRAMS/` (ELIPSE / ATF / GRANDEUR / ALLFAST / OMG / Accument / ABB)
- No sibling docs/PDFs in TOMEK dir.
- Public PDF lead: `https://vjmedia.wpi.edu/images/1/1f/GetStarted-ESPRIT-English.pdf` (WPI mirror — was unreachable from this PC at 2026-05-27, retry later).

## In-house JM Die production corpus

### hyperMILL `.hmc` files (31+)
- Production: `H:/PRISM/JM DIE/HAAS-HURCO/VALLEY FASTENER GROUP/*.hmc`, `H:/PRISM/JM DIE/OKUMA/JM Die Company/{VALLEY FASTENER,SFS}/*.hmc`, `H:/PRISM/JM DIE/OKUMA/SETUPS/*.hmc`
- Training (OPEN MIND-issued): `H:/PRISM/JM DIE/OKUMA/hyperCAD-S and hyperMILL Online Training/**/*.hmc`

### Mastercam `.mcx-8` files (95+, truncated; expect more)
- `H:/PRISM/JM DIE/CNC LATHE/**/*.mcx-8` (ATF, BELVIDERE)
- `H:/PRISM/JM DIE/CNC MILL HAAS/**/*.mcx-8` (ATF, TAPTITE, CONTINENTAL MIDLAN)
- `H:/PRISM/JM DIE/WIRE EDM/**/*.mcx-8` (HEDALLOY, FONTANA, GRANDEUR, COBRA, JACOBSON, HI-PERFORMANCE, CSM, OPTIMAS, HEDALLOY)
- `H:/PRISM/JM DIE/_PART LIBRARY/**/*.mcx-8` (cross-indexed by customer)

### Esprit `.esp` files (28)
- All at `H:/PRISM/JM DIE/WIRE EDM/TOMEK - PROGRAMS/*.esp`

## Mastercam X8 automation surface (programmatic CAM control)
- **C-Hooks (.EQN macros)**: `H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/chooks/*.EQN` — sample equation files (CANDY, CHIP, DRAIN, ELLIPSD, INVOL, SINE)
- **Automatic Tool Path (ATP) NetHook DLLs**: `H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/chooks/atp/` (Infragistics UI bindings, XMLSettings.dll)
- **VBScript drivers**: `H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/vb/*.vbs` — `RunCommand.vbs`, `CProgress.vbs`, `Copy Entities to Level.vbs`, `move_all_linestyle_center_to_new_level.vbs`
- **ATP XML definitions**: `H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/ATP/Definitions/Mastercam.xml` (canonical machine def) plus BoxBuilder/CabinetVision/KABnx/KCDw/XP-CNC variants
- **Agie wire-EDM controller map**: `agie.map` (in `chooks/`) — controller mapping for Agie EDM
- **Machine string config**: `H:/PRISM/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/UserDefaults/CONFIG/CDMachineStringsDefault.xml` and `MASTERCAM/POSTS/CONFIG/CDMachineStringsDefault.xml`

## Post-processor library
- **Mastercam POSTS dir confirmed exists**: `H:/PRISM/resources/MasterCam/MASTERCAM/POSTS/` (specific `.pst` files locator pending — `glob POSTS/**/*.pst` returned 0; try `.MC`, `.NX`, or scan deeper subdirs)
- **JM Die's own post library**: `H:/PRISM/JM DIE/POST PROCESSORS/`
- **PRISM-modified posts**: `H:/PRISM/JM DIE/PRISM MODIFIED POST PROCESSORS/`
- **Fusion 360 posts**: `H:/PRISM/resources/FUSION POSTS/`, `H:/PRISM/resources/FUSION BASIC POSTS/`
- **General**: `H:/PRISM/resources/POSTS AND MACHINES/`

## Other CAM-adjacent assets
- **Machining knowledge corpus**: `H:/PRISM/resources/MACHINING KNOWLEDGE FORMULAS AND ALGORITHMS/`
- **Macro programs**: `H:/PRISM/resources/MACRO PROGRAMS/`, `H:/PRISM/JM DIE/MACRO PROGRAMS/`
- **Manufacturer tool catalogs**: `H:/PRISM/resources/MANUFACTURER_CATALOGS/`
- **Tool holder CAD**: `H:/PRISM/resources/TOOL_HOLDER_CAD_FILES/`
- **Workholding catalogs**: `H:/PRISM/resources/WORKHOLDING AND FIXTURE CATALOGS/`
- **Generic machine models**: `H:/PRISM/resources/{GENERIC MACHINE MODELS,GENERIC_MACHINE_MODELS,MACHINE_SIMULATION_MODELS,MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION}/`
- **Already-built training corpus**: `H:/PRISM/resources/PRISM CAD-CAM TRAINING/`
- **Already-built test parts**: `H:/PRISM/JM DIE/PRISM CAD TESTING/`
- **JM Die tribal/wiki docs** (lima extracted from these): `H:/PRISM/JM DIE/TRIBAL + WIKI/`
- **MIT-OCW corpus**: `H:/PRISM/resources/MIT COURSES/`
- **Training Videos zip** (TBD contents): `H:/PRISM/resources/Training Videos(1).2IlEDvUm.zip/`
- **Acquisitions sandbox** (newly created): `H:/PRISM/resources/cam-acquired-2026-05-27/`

## Acquisition policy

- **Default**: use on-disk vendor material — do NOT webscrape unless the on-disk surface has been exhausted.
- **Public-PDF acquisition allowed** when there's a gap (Esprit Get Started PDF was the only one needed; network was blocked at 2026-05-27, retry later).
- **License-gated content** (eMastercam zip, The CAM Wizard Esprit Essentials, OPEN MIND customer portal): operator-action only, kilo cannot autonomously create accounts.
- **Per kilo soul**: validate-blueprint-before-cam; defer-cam-to-echo for catalog-only gap enrichment IF the gap is real after on-disk exhaustion. With this corpus, most gaps disappear.

## CAM-touching algorithms (`mcp-server/src/algorithms/`)

50+ TypeScript algorithm classes (formulas are code-resident, **no `/data/formulas/` dir exists** — that older doc claim is stale).

### Cutting-force / chip
- `KienzleForceModel.ts` — Fc = kc·h^(1-mc)·b (canonical force model)
- `ExtendedTaylorModel.ts` — V·T^n·f^a·d^b extended tool-life
- `JohnsonCookModel.ts` — flow-stress / strain-rate / thermal softening
- `MerchantShearForceModel.ts` — orthogonal cutting shear-angle
- `SandvikTurningForceModel.ts` — Sandvik insert Fc/Ff/Fp
- `GilbertMRRModel.ts` — MRR / specific cutting energy (turning)
- `ChipThinningCompensation.ts` — radial-engagement chip-thinning compensation
- `ChipTypePredictionModel.ts` / `ChipBreakingModel.ts` / `ChipEvacuationModel.ts` / `ChipVolumeRate.ts`
- `PowerTorqueCalc.ts` — spindle power & torque

### Stability / chatter / vibration
- `FRFStabilityLobe.ts` / `StabilityLobeDiagram.ts` — Altintas-style SLD
- `STFTChatter.ts` — short-time-FFT chatter detection
- `SpindleVibFFTModel.ts` / `WaveletBreakage.ts` / `RCSA.ts` (receptance-coupling)

### Wear / tool life
- `ToolWearPrediction.ts` / `UsuiWearModel.ts` / `BayesianWearModel.ts` / `ToolLifeEconomicReplacementFormula.ts`
- `ToolDeflectionModel.ts` — cantilever deflection under cutting load
- `SurfaceFinishPredictor.ts` — Ra/Rz from feed + nose-radius

### Thermal
- `JaegerTempField.ts` — Jaeger moving-heat-source field
- `ThermalFEAModel.ts` / `ThermalPartitionModel.ts` / `CoolantFlowModel.ts`

### Toolpath geometry / collision
- `MinkowskiSum.ts` — tool-offset & swept envelope
- `SweptVolumeCollision.ts` — swept-volume collision check
- `CWEZBuffer.ts` — Cutter/Workpiece Engagement Zone buffer
- `EffectiveDiameterCompensator.ts` — ball-nose effective-diameter comp

### Optimization back-ends
- `CSPSetupPlan.ts` (constraint-satisfaction setup planner)
- `DPMultiPass.ts` (dynamic-programming multi-pass depth)
- `AntColonyTSP.ts` (ACO toolpath/hole-pattern TSP)
- `ILPAssignment.ts` / `JointSpeedFeedOptimizer.ts`
- `GeneticOptimizer.ts` / `ParticleSwarm.ts` / `SimulatedAnnealing.ts` / `BayesianOptimizer.ts` / `LBFGSBOptimizer.ts`

### Control loops (feed/temp adaptive)
- `AdaptiveControllerModel.ts` / `FuzzyController.ts` / `PIDController.ts` / `KalmanFilter.ts`

### Numerical solvers
- `FEASolver2D.ts` / `FiniteElementMethod1D.ts` / `FiniteDifferenceMethod.ts`

### Physics constants (`mcp-server/src/physics/`)
- `constants.ts` — canonical Kienzle kc1.1 / mc per ISO group (P=1800, M=2100, K=1100, N=700, S=2800, H=3200), Taylor n/C, material density/hardness. **NEVER inline — import only.**
- `wedm-constants.ts` — wire-EDM dielectric, discharge-energy, kerf, recast
- `unit-conversions.ts` — mm/in, m/min/SFM, mm/rev/IPR
- `sustainability-constants.ts` — energy/CO2/coolant-disposal coefficients

## CAM-touching dispatchers (`mcp-server/src/tools/dispatchers/`)

**16 CAM-relevant dispatchers, ~5,058 CAM actions, 10 CAM-adjacent actions.**

| Dispatcher | Action count | Top actions |
|---|---|---|
| `camDispatcher.ts` (`prism_cam`) | **2475** | toolpath_generate, toolpath_simulate, toolpath_optimize, post_process, cam_strategy_recommend, collision_check_full, stock_update, fixture_setup, nesting_optimize, cam_multiaxis_recommend, cam_material_map, cam_inventor_hsm_analyze_operation, cam_solidcam_create_imachining, mill_training_template_match |
| `ppDispatcher.ts` (`prism_pp`) | 801 | pp_generate_gcode, pp_generate_canned_cycle, pp_analyze_gcode, pp_analyze_controller_fit, pp_optimize_feed, pp_analyze_safety |
| `millDispatcher.ts` (`prism_mill`) | 429 | strategy, toolpath, toolsel, kinematics, fiveaxis_cam |
| `edmDispatcher.ts` (`prism_edm`) | 388 | wire-edm electrode/surface/sinker (CAM-adjacent NTM) |
| `turningDispatcher.ts` (`prism_turning`) | 373 | chuck, thread, partoff, live_tool_plan, thread_single_point, chuck_force |
| `cncOpsDispatcher.ts` | 72 | ball-end-mill, broaching, chamfer, drilling |
| `toolpathDispatcher.ts` | 34 | strategy_select, params_calculate, generate, crosscam_compute, prism_novel |
| `threadDispatcher.ts` | 17 | tap_drill, thread_milling, depth |
| `fiveAxisDispatcher.ts` | 15 | RTCP comp, kinematics, 5-axis post |
| `multiOpDispatcher.ts` | 14 | rest_machining + multi-op orchestration |
| `turningProgramDispatcher.ts` | 14 | Turning Print-to-Program |
| `grindingDispatcher.ts` | 10 | grinding wheel/dressing |
| `camFunctionDispatcher.ts` | 8 | NL CAM-function routing |
| `holePatternDispatcher.ts` | 3 | drill-pattern recognition |
| `threadingPipelineDispatcher.ts` | 3 | thread programming pipeline |
| `multiAxisProgramDispatcher.ts` | 2 | Multi-Axis Print-to-Program |

### CAM-adjacent (physics gate / dev-tooling)
- `prism_calc:cutting_force` (Kienzle feeding CAM feed-rate optimizer)
- `prism_calc:tool_life` (Taylor → CAM strategy/tool selector)
- `prism_calc:speed_feed` / `mrr` / `chip_load` / `chip_thinning_compensation`
- `prism_calc:stochastic_tool_life` (Monte-Carlo life → CAM scheduler)
- `prism_calc:chatter_critical_speeds` (SLD-driven spindle limits)
- `prism_validate:validate (kienzle/taylor/post)` — physics gate on CAM-emitted feed/speed
- `prism_dev:roadmap_tool_plan_*` — RGS toolchain plan per roadmap CAM unit

Reference: `mcp-server/data/docs/DISPATCHER_DIGEST.md` (counts + 1-line summaries).

## CAM state files + databases

**26 CAM-specific state files in `mcp-server/data/state/`, 49 CAM-relevant in `state/shared/`, 1 SQLite memory.db, 1 HNSW vector index.**

### `mcp-server/data/state/` (CAM-specific)
| File | Purpose |
|---|---|
| `CAM_AI_ACTIONS_INDEX.json` | CAM skill action resolution & dispatch index |
| `CAM_TRIBAL_RAG_INDEX.json` | CAM tribal knowledge RAG index |
| `CAM_UIX_COVERAGE_BASELINE.json` | CAM UI/UX feature coverage baseline |
| `CAM_UIX_RATELIMIT_REGISTRY.json` | CAM UI/UX rate-limiting & throttle config |
| `CAM_VENDOR_REGISTRY.json` | CAM vendor (Mastercam, HyperMILL, Fusion) metadata |
| `cam_uix_scope_decisions.json` | CAM scope & decision log |
| `cad-cam-resources-pdf-index.json` | CAD/CAM PDF resource manifest |
| `HYPERMILL_SDK_APIS.json` | **HyperMILL SDK API definitions + bindings** (key for automation) |
| `JM_DIE_POST_PROCESSOR_TRIBAL_KNOWLEDGE.json` | JM Die post-processor tribal KB |
| `JM_DIE_PROGRAM_RAG_INDEX.json` | JM Die program RAG retrieval index |
| `POST_PROCESSOR_KNOWLEDGE_EXTRACT.json` | Post-processor extracted knowledge |
| `ONLINE_POST_PROCESSOR_KNOWLEDGE.json` | Online post-processor knowledge corpus |
| `MILL_CAPABILITY_MANIFEST.json` | Milling machine capability manifest |
| `LATHE_AWARENESS_SPEC_v6.json` / `_v7.json` | Lathe awareness spec versions |
| `lathe-engine-registry.json` | Lathe engine skill registry |
| `learned-cnc-controller-patterns.json` | Learned CNC controller patterns |
| `shop-machine-overlays.json` | Shop machine vendor overlays + capabilities |
| `ontology/machine-def-ontology.json` | Machine definition ontology (all platforms) |
| `jm-die-full-program-index.json` / `_v2.json` | JM Die program full-text index |
| `program-labels.json` | Program label taxonomy + naming conventions |
| `WEDM_* (31 files)` | Wire-EDM machine state, telemetry, indexes, controller config, LoRA checkpoints, digital twin |
| `cad-corpus-manifest.json` / `_recovered.json` | CAD corpus (includes CAM models) manifest |
| `cad-corpus-insights.json` / `_prevalence-report.json` / `_step-geometry-report.json` | CAD corpus analysis |

### `state/shared/` (CAM-relevant cross-slot)
| File | Purpose |
|---|---|
| `cadcam-consolidated-corpus.json` | Unified CAD/CAM corpus (Mastercam, HyperMILL, Fusion, NX, Powermill) |
| `cad-cam-pdf-tribal-seeds.json` | CAD/CAM PDF tribal seed data |
| `.wire-unwired-loop-cam.json` | CAM wire/unwired engine loop state |
| `lathe-agi-knowledge-state.json` / `lathe-agi-bridge-state.json` / `lathe-inventory-state.json` / `lathe-order-lifecycle-state.json` | Lathe AGI state |
| `LATHE_AWARENESS_SNAPSHOT.json` | Lathe awareness snapshot (peer-shared) |
| `MILL-PSN-COVERAGE.json` | Milling PSN coverage |
| `hurco-post-discovery.json` | Hurco CNC post-processor discovery index |
| `post-processor-coverage.json` | Post-processor platform coverage matrix |
| `post-compact-log.json` | Post-processor optimization log |
| `wedm-comparable-pairs.json` / `-cross-process-manifests.json` / `-mcx-{compression,material-vocab,wmd}-scan.json` / `-pair-v3-results.json` / `-pair-v4-results.json` / `-phase-b-patterns.json` / `-standalone-nc-corpus.json` / `-zero-overlap-analysis.json` | WEDM analysis chain |
| `cad-action-templates/{hypermill,mastercam,fusion360}.actions.json` | **CAM software action template mappings** (cross-CAM convergence target) |
| `dashboards/milling-pdf-corpus.json` / `r12-audit-post-camel-2026-05-23.json` | Dashboards |
| `system-viz/cam-vendor-catalog-augmentation.json` / `cadcam-training-corpus-augmentation.json` / `milling-extracted-pdf-bridge-augmentation.json` / `milling-tribal-tip-bridge-augmentation.json` / `post-gap-augmentation.json` / `post-pdf-corpus-augmentation.json` | System-viz augmentation |
| `system-viz/staging/galaxy-roosts/*.json` (4 CAM files) | CAM/mill/lathe/WEDM galaxy-roost staging |
| `peer-repo-signatures/prism-*{cam,mill,lathe,wedm,hypermill}*.json` (15+ files) | Peer-agent CAM engine checksums |

### Vector / SQLite
- `H:/prism/.swarm/memory.db` — Session memory persistence
- `H:/prism/.swarm/hnsw.index` (1.5M) — Vector embedding index for memory recall
- `H:/prism/.swarm/schema.sql` — Database schema

### CSV
- `H:/prism/state/shared/extracted-modules-classified.csv` — Extracted modules classification

## Deferred sub-maps (TODO — additional agent passes)

Three categories were partially covered or deferred when the parallel-agent fanout was stopped 2026-05-27:
- **CAM-touching engines** — `mcp-server/src/engines/` CAM-domain engine listing (mill/lathe/wedm/cam-bridges/post). Top of mind: mill-galaxy, lathe-galaxy, wedm-galaxy, hypermill bridge, mastercam bridge, fusion360 bridge, cycle engines, force/wear/finish engines (some captured indirectly via algorithms above + dispatcher actions).
- **Wiki + tribal nodes** — 50+ wiki entries + 224 per-toolpath tribal nodes at `knowledge/wiki/architecture/tribal/per-toolpath/` (kilo built these prior session — coverageStatus breakdown known: 52 youtube+pdf, 27 youtube-only, 30 pdf-only, 115 catalog-only).
- **Prints + CAD-side feeders** — JM Die customer blueprint PDFs + neutral CAD (STEP/IGES/X_T/SAT/STL) + native CAD project files (SLDPRT/IPT/CATPART). Re-fire scoped agents when needed.

Trigger follow-up agents on demand — don't pre-emptively spawn since the corpus index above is enough for most lookups.

## Related memories
- [[feedback_use_lima_pypdf_page_extractor]] — canonical PDF extractor for the 10 hyperMILL manuals
- [[feedback_playwright_for_online_sources]] — Playwright over WebFetch when scraping IS needed
- [[feedback_no_public_h_drive]] — nothing here gets published publicly; internal-only
- [[feedback_ai_training_first_before_revenue]] — pre-revenue, train per-domain AI on the full corpus
- [[reference_mill_domain_atlas_for_foxtrot_2026_05_27]] — sister atlas (mill-specific) built by foxtrot slot the same day; overlaps for mill-specific subsets
