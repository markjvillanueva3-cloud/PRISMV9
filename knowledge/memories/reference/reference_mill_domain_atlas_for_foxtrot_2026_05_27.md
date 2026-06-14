---
name: reference-mill-domain-atlas-for-foxtrot-2026-05-27
description: "COMPREHENSIVE mill-machining asset atlas. Built via 4 parallel Explore agents 2026-05-27 per operator directive. Maps every mill-domain production asset (engines, dispatchers, schemas, registries, posts, CAD/CAM, JM Die fleet, wiki, tribal nodes, ingestion cache) so foxtrot slot (and mill-soul) can do file-search in O(1) lookups vs O(n) glob discovery. Use this as the entry-point file for any mill-domain query."
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:09.215Z
aliases: reference_mill_domain_atlas_for_foxtrot_2026_05_27
---


# Mill-Domain Asset Atlas (for foxtrot slot)

## TL;DR

PRISM has **222+ mill engines** (+17 hypermill sub-engines), **1 dedicated dispatcher** (`prism_mill`, 49 actions), **318 mill post-processors** (.cps), **5 mill machines** in JM Die fleet (VMC-01..05), **51-58 customer mill-program archives** (`CNC MILL HAAS/` + `HURCO CNC PROGRAMS/`), **2,505 CAD files**, **126 CAM files**, **50+ wiki entries**, and **300 reference memory nodes**. The mill galactic-center sentinel at `mcp-server/src/engines/mill/CLAUDE.md` is POPULATED (127 lines, 2026-05-26) and auto-loads when editing under `src/engines/mill/` per Bibryam Context Cascade.

## 1. Mill Engines (222 + 17 hypermill = 239 total)

### Top 30 mill-specific engines (by operational domain)

| Engine | Purpose |
|--------|---------|
| `MillingAGIMasterEngine.ts` | AGI orchestration for mill program generation |
| `MillingPrintToProgramEngine.ts` | Full print-to-program pipeline (CAM→G-code) |
| `MillStrategyNeuralEngine.ts` | Neural strategy selector (roughing/finishing/adaptive) |
| `MillProgramOptimizerEngine.ts` | G-code post-optimization (rapid motion, feeds) |
| `MillKinematicsCollisionEngine.ts` | 5-axis kinematics + collision detection |
| `MillBlockTimeProfilerEngine.ts` | Mill cycle-time + dwell prediction per strategy |
| `AdaptiveMillingChipLoadMonitorEngine.ts` | Real-time chip-load adaptation + spindle-load feedback |
| `AdvancedMillingStrategiesEngine.ts` | Strategy registry (HSM/trochoidal/adaptive/peel/plunge) |
| `MillingForceEngine.ts` | Kienzle cutting-force model for end mills |
| `MillTurnOrchestrationEngine.ts` | Mill-turn handoff coordination + toolchanger |
| `SplineMillingEngine.ts` | Spline interpolation for contoured mill toolpaths |
| `ThreadMillingEngine.ts` | Mill-based thread generation via helical interpolation |
| `ChamferMillingEngine.ts` | Chamfer profile milling with radius compensation |
| `TrochoidalMillingEngine.ts` | Trochoidal entry strategy for high-speed milling |
| `PlungeMillingEngine.ts` | Plunge drilling via mill spindle |
| `HighFeedMillingEngine.ts` | High-feed shallow-engagement roughing |
| `HelicalMillingEngine.ts` | Helical interpolation for deep holes and tapered features |
| `BallEndMillEngine.ts` | Ball-end mill geometry + scallop prediction |
| `BallMillEngine.ts` | Ball-mill workholding + tool geometry analysis |
| `MicroMillingEngine.ts` | Micro-milling (<0.5mm tools) size-effect physics |
| `CircularPocketEngine.ts` | Circular pocket spiral-in + contour finishing |
| `VoronoiMedialAxisPocketEngine.ts` | Medial-axis pocket tool-path (rest-machining) |
| `CenterDrillEngine.ts` | Center-drill geometry + chip-load optimization |
| `GunDrillingEngine.ts` | Gun-drill deep-hole physics + evacuation pressure |
| `TapDrillEngine.ts` | Tap-drill sizing per ISO M/UNC/BSP standard |
| `PeckDrillingEngine.ts` | Peck-drill cycle (retract for chip evac) optimization |
| `SpotDrillingEngine.ts` | Spot-drill entry + pilot-hole geometry |
| `DrillCycleOptimizationEngine.ts` | Drill-cycle feed/speed optimization + breakthrough |
| `DeepHoleDrillingPhysicsEngine.ts` | Deep-hole physics (evacuation, thermal, stress) |
| `DrillBreakthroughForceEngine.ts` | Thrust-force spike + torque at breakthrough |

All under `H:/PRISM/mcp-server/src/engines/`.

### HyperMILL sub-galaxy (17 dedicated + 50+ flat `Hyper*` files)

Under `H:/PRISM/mcp-server/src/engines/hypermill/`:
- `HyperMillCADArtifactGeneratorEngine.ts` — CAD artifact extraction + fixture modeling
- `HyperMillCAMCoreArtifactGeneratorEngine.ts` — HyperMILL CAM toolpath → PRISM IR
- `HyperMillKienzleMappingEngine.ts` — HyperMILL Kienzle ISO table mapping
- `HyperMillSpeedFeedMappingEngine.ts` — HyperMILL speed/feed catalog → PRISM calcs
- +14 additional hypermill/* artifacts + 50+ flat `Hyper*` files in parent

## 2. Mill Algorithms

**Status: 0 dedicated files** in `mcp-server/src/algorithms/`. Mill algorithms are embedded in engines. Physics algorithms (Kienzle, Taylor, deflection, chatter) live in `H:/PRISM/mcp-server/src/physics/algorithms/` and are imported by engines.

## 3. Mill Dispatchers

### Primary

- `H:/PRISM/mcp-server/src/tools/dispatchers/millDispatcher.ts` (217.8K, **49 actions**)
  - Actions: `mill_print_to_program`, `mill_strategy`, `mill_optimize`, `mill_collision`, `mill_physics`, `mill_thermal`, `mill_toolpath`, `mill_adaptive`, `mill_agi`, `mill_selfaware`, `mill_scientific`, `mill_pattern_mine`, `mill_digital_twin`, `mill_tool_select`, `mill_validate`, `mill_kinematics`, +13 L2-aggregator + unwired + U-BRIDGE variants

### Secondary (have mill sub-actions)

- `camDispatcher.ts` — `cam_mill_strategy`, `cam_pocket`, `cam_face_mill`, `cam_5axis`, `cam_post_process`
- `cncOpsDispatcher.ts` — Drill/mill/turn ops routing
- `algorithmDispatcher.ts` — Kienzle/force/chatter/deflection/thermal algorithms

## 4. Mill Schemas (8 files)

Under `H:/PRISM/mcp-server/src/schemas/`:
- `millActionSchemas.ts` (87.3K) — 49 Zod schemas + shared types (isoMaterialGroup, millingStrategy, toolpathType, toolGeometry, cuttingParams, machineConfig)
- `hyperMillCodeGeneratorActionSchemas.ts`
- `nxcamMillingFunctionIndexActionSchemas.ts`
- `powerMillRoughingFunctionIndexActionSchemas.ts`
- `powerMillFinishingFunctionIndexActionSchemas.ts`
- `solidcamMillTurnFunctionIndexActionSchemas.ts`
- `hypermill/cam/toolCompSchemas.ts` — Tool compensation
- `hypermill/settings/toolDbSchemas.ts` — Tool database

## 5. Mill Registries (8 files)

Under `H:/PRISM/mcp-server/src/registries/`:
- `ToolRegistry.ts` (54.2K) — Geometry, coatings, material-specific grades
- `ToolGeometryDefaults.ts` (14.8K) — ISO defaults: end mills, face mills, ball-nose, taps, drills, reamers
- `ToolpathStrategyRegistry.ts` (197.0K) — Strategy LUT (roughing, finishing, adaptive, HSM, trochoidal, peel, plunge, waterline, rest-milling)
- `ToolpathStrategyRegistry_Part1.ts` (26.2K) — Continuation partition
- `MachineRegistry.ts` (55.2K) — Spindle specs (RPM, power, torque, acceleration)
- `MaterialRegistry.ts` (58.0K) — Hardness, density, cutting-force coefficients
- `CoolantRegistry.ts` (31.3K) — Flood/mist/through-spindle properties
- `CoatingRegistry.ts` (25.2K) — Tool coatings + wear curves

## 6. Mill Galactic-Center Sentinel (CLAUDE.md)

**Path**: `H:/PRISM/mcp-server/src/engines/mill/CLAUDE.md` (9.1K, 127 lines, 2026-05-26)
**Status**: POPULATED — Bibryam Pillar P1 domain-local doctrine
**Sections**: scope (3/5-axis vertical/horizontal), slot affinity (alpha+bravo, NOW EXTENDS to foxtrot per operator directive), file geography, canonical constants (Kienzle/Taylor imports), 7 common mill engines, test commands, gotchas (chip-thinning, tool deflection, spindle power, coolant blocks, trochoidal entry angle, 5-axis singularity), tribal pointers, cross-galaxy edges (mill-turn/CAM/quality/post)

Companion: `H:/PRISM/mcp-server/src/engines/mill/MEMORY.md` (3.0K, stub index)

### Sister sentinels (cross-galaxy edges)

- `mcp-server/src/engines/cam/CLAUDE.md` — EXISTS, honest stub
- `mcp-server/src/engines/lathe/CLAUDE.md` — EXISTS (mill-turn handoffs)
- `mcp-server/src/engines/post-processor/CLAUDE.md` — EXISTS (mill engines terminate here)
- `mcp-server/src/engines/hypermill/CLAUDE.md` — **NOT FOUND** (FUTURE per parent mill/CLAUDE.md §3)

## 7. Mill Post-Processor Files (580+ total)

### Primary: Canonical post library

`H:/PRISM/mcp-server/data/posts/` — **318 mill .cps files** (Fusion 360 format)
- Controllers: Haas (75+ variants), Hurco (10+ variants), Okuma (12+ variants), Mazak, Fanuc, Brother, DMG Mori, Doosan, Siemens, Jyoti, Samsung, Takisawa, Toshiba

### Secondary: JM Die-tuned posts

`H:/PRISM/JM DIE/POST PROCESSORS/` — **262 mill-specific posts**
- `.cps` (Fusion 360): 241 files
- `.pst` (hyperMILL): 21 files
- Structure: `1. CONSOLIDATED/vanilla/mill/` + `2. PRISM ENHANCED/mill/{brother,datron,deckel,dmg-mori,fadal,fanuc,grbl,haas,heidenhain,hurco,kern,mazak,mitsubishi,okuma,siemens,unknown,roku-roku}`

### PRISM-tuned PRISM_v11+ posts (referenced in jm-die-profile.ts)

- `HURCO_VM30i_PRISM_v11.cps` → VMC-01 (Hurco VM30i, WinMAX v10)
- `HAAS_VF2_-Ai-Enhanced_(iMachining).cps` → VMC-03 (Haas VF-2)
- `HAAS_OM-2_PRE-NGC_PRISM.cps` → VMC-04 (Haas OM-2)
- `OKUMA_M460V-5AX-Ai Enhanced-(iMachining).cps` → VMC-02 (Okuma 5-axis)

## 8. JM Die Mill Program Archive

### Locations (NOTE: NO `CNC MILLING/` folder — uses controller-keyed naming)

- `H:/PRISM/JM DIE/CNC MILL HAAS/` — **51-58 customer folders, 469 total files**
  - Top customers by file count: FONTANA (102), OMG (51), ATF (49), HEDALLOY (45), HOLO-KROME (45), SFS GROUP USA (31), OPTIMAS (15), VALLEY (15), ALLFAST (12), BIRMINGHAM (12), TAPTITE (12)
  - Sample customers: acronic, Agrati-Medina, AIR INDUSTRIES, AJ MANUFACTURING, ALCOA FASTENING, ALL STAR, ALLFAST, ANDERSON, SPS TECHNOLOGIES, stabio, STEVENAGE, STL, TECOMEC
- `H:/PRISM/JM DIE/HURCO CNC PROGRAMS/` — **25 part/program files** (mixed naming: numbered jobs, descriptive names like "RADIAL FORMING DIE", "SQ DRIVE PUNCH", "SHEAR BLADES")

### File extensions in mill archive

- HAAS dir: 22 `.NC` + 4 `.nc` + 483 `.mcx-8` (Mastercam exports) + 8 `.stp` + 4 `.x_t` + 3 `.STEP` + 3 `.MIN` (legacy) + 2 `.SLDPRT` + 1 `.pdf`
- HURCO dir: 24 `.hnc` files (Hurco proprietary post format)

### Controller dialects observed in mill archive

- HAAS/Fanuc (.nc): `% O01506 (description)` — Fanuc Oxxxx program numbering
- HURCO (.hnc): `% O1001 (Using G0 dogleg path)` + tool defs with D/CR/ZMIN — Hurco WinMax CAM post
- Legacy MIN (.MIN in ATF/FASTRON): operator-written, older generic dialect

### NOT FOUND (vs lathe archive)

- `H:/PRISM/JM DIE/CNC MILLING/` — DOES NOT EXIST (mill uses `CNC MILL HAAS/` + `HURCO CNC PROGRAMS/`)
- `H:/PRISM/JM DIE/CNC MILL HAAS/<customer>/PRISM_UPGRADED/` — DOES NOT EXIST (no v2.0.0 mill upgrades scanned yet, unlike lathe)
- `H:/PRISM/JM DIE/TOOL LIST/` — DOES NOT EXIST (tool data is embedded in program headers, e.g. `(T7 D=0.25 CR=0.01 - bullnose end mill)`)

## 9. JM Die Mill Machine Fleet (5 machines)

From `H:/PRISM/mcp-server/src/data/jm-die-profile.ts` and `ShopConfigurationEngine.ts`:

| Machine ID | Model | Controller | Controller Model | Post |
|------------|-------|------------|------------------|------|
| **VMC-01** | Hurco VM30i | Hurco | WinMAX v10 | `HURCO_VM30i_PRISM_v11.cps` |
| **VMC-02** | Okuma M460V-5AX | Okuma | OSP-P300MA-H | `OKUMA_M460V-5AX-Ai Enhanced-(iMachining).cps` |
| **VMC-03** | Haas VF-2 | Haas | PRE-NGC | `HAAS_VF2_-Ai-Enhanced_(iMachining).cps` |
| **VMC-04** | Haas OM-2 | Haas | PRE-NGC | `HAAS_OM-2_PRE-NGC_PRISM.cps` |
| **VMC-05** | Roku-Roku HC 658-II | Fanuc | 31i-B5 | (no post registered) |

**Note**: 7 OKUMA Multus machines (LTH-01..LTH-07) are lathe-only, excluded from mill enumeration. Total shop: 21 machines (7 lathe, 5 mill, 2 sinker EDM, 1 wire EDM, 6 support).

## 10. CAD Reference Files (2,505 files)

### Distribution by extension
- `.DWG` (AutoCAD): 231
- `.dxf` (AutoCAD 2D): 1,586
- `.STEP` + `.stp`: 499 (315 STEP + 184 stp)
- `.x_b` + `.x_t` (Parasolid): 129 (104 .x_b + 25 .x_t)
- `.SLDPRT` + `.SLDASM`: 48 (47 prt + 1 asm)
- `.igs` (IGES): 12

### Primary locations
- `H:/PRISM/JM DIE/_PART LIBRARY/` (customer-keyed: ELITE, OPTIMAS, VALLEY, ITW, ATF, KEYSTONE, etc.)
- `H:/PRISM/JM DIE/CNC MILL HAAS/` (6 customer CAD folders)
- `H:/PRISM/JM DIE/OKUMA/hyperCAD-S training/` (1,400+ tool-holder CAD)
- `H:/PRISM/JM DIE/HAAS-HURCO/` (embedded CAD for setups)
- `H:/PRISM/JM DIE/MACHINE MODELS FOR LEARNING/` (machine geometry models)

## 11. CAM Reference Files (126 files)

### Distribution
- `.cnc` (Inventor HSM/generic): 98 files
- `.esp` (Esprit): 28 files
- `.vnc` (Mastercam), `.hmcs` (hyperMILL), `.f3d` (Fusion 360), `.sldcrt` (SolidWorks CAM): **NOT FOUND**

### Locations
- `H:/PRISM/JM DIE/POST PROCESSORS/1. CONSOLIDATED/vanilla/mill/unknown/` (97 .cnc files)
- `H:/PRISM/JM DIE/WIRE EDM/TOMEK - PROGRAMS/` (28 Esprit files)

## 12. Mill Wiki Entries (50+ files)

### Learnings tier (tribal, video/PDF extraction)
- `knowledge/wiki/code-tribal/learnings/mill-video-corpus-ms0-u-haas-sandvik-video-corpus.md` — 12 tribal tips from Haas + Sandvik manufacturer sources
- `mill-video-corpus-ms0-u-dapra-hem-video-corpus.md` — DAPRA HEM (High Energy Milling) video extraction
- `master-machinist-orchestrator-ms0-u-mmo-setup-orchestration-engine.md` — SetupPlan orchestration (4-engine composite)
- `speed-feed-ms0-u-sfm82-effective-diameter.md` — Effective diameter chip-thinning
- `bridge-consolidated-u-bridge-wire-milling.md` — Wire-EDM to milling bridge
- `bridge-deep-u-bridge-sfc-hypermill.md` — Surface-finish coupling + HyperMILL CAM bridge
- `mill-parity-upgrade-ms0-u-scoping-spec.md` — Mill parity upgrade roadmap
- `mill-pdf-corpus-ms0-u-foxtrot-lima-crossover.md` — PDF corpus extraction curriculum

### Actions tier (calculation + CAM)
- `knowledge/wiki/architecture/actions/aireasoning/ai-mill-adaptive-strategy.md`
- `aireasoning/ai-mill-agi-reason.md`
- `calc/ball-end-mill-calc.md`
- `calc/chamfer-milling-calc.md`
- `calc/helical-milling-calc.md`
- `calc/high-feed-milling-calc.md`
- `calc/kienzle-milling.md`
- `calc/milling-forces.md`
- `calc/plunge-milling-calc.md`
- `calc/trochoidal-milling-calc.md`
- `calc/thread-mill-calc.md`
- `calc/spline-mill-calc.md`
- `cam/cam-hypermill-ai-orchestrate.md`
- `cam/cam-fusion360-millturn-validate-handoff.md`

## 13. Tribal Memory Nodes (300 references)

### Mill-domain reference nodes
- `reference_u_bridge_wire_mill_loop_2026_05_22.md` — 6 of 13 unwired mill/5-axis engines wired to prism_mill dispatcher
- `reference_u_axis4_mill_adapter_2026_05_26.md` — Axis-4 mill adapter closes 1/3 of MillingPrintToProgramEngine dispatcher gap

### Mill-dispatcher formula nodes (15+ direct)
- `node_formula_*milldispatcher_action_mill_5axis_orchestrate.md`
- `*mill_force_calculate.md`
- `*mill_high_feed_calc.md`
- `*mill_helical_calc.md`
- `*mill_multiaxis_orchestrate.md`
- `*mill_turn_orchestrate.md` (cross-galaxy bridge)
- `*mill_uncertainty_quantify.md`

## 14. Mill-Domain Ingestion Cache

Under `H:/PRISM/mcp-server/data/ingestion_cache/`:
- `milling-extraction-curriculum.json` (16.4K) — 50 PDFs, 3-tier (easiest→complex), feeds 11 sub-systems (g-code, compensation, thread-milling, haas-ngc, etc.). LIVE generated 2026-05-26.
- `milling-vendor-online-resources.json` (18.6K) — 8 vendor manifests (DAPRA, Sandvik, Widia/Kennametal, Ingersoll, Iscar, Mitsubishi, Seco, Sumitomo), 47+ resource URLs. LIVE generated 2026-05-26.

## 15. Quick-Reference Entry Points for foxtrot

| Need | Go to |
|------|-------|
| Doctrine | `H:/PRISM/mcp-server/src/engines/mill/CLAUDE.md` (auto-loads when editing under mill/) |
| Dispatcher entry | `prism_mill` action enum (49 actions) at `mcp-server/src/tools/dispatchers/millDispatcher.ts` |
| Physics constants | `mcp-server/src/physics/constants.ts` (Kienzle kc1.1, Taylor — MUST IMPORT, never inline) |
| Tool registry | `mcp-server/src/registries/ToolRegistry.ts` |
| Strategy LUT | `mcp-server/src/registries/ToolpathStrategyRegistry.ts` (197K, the biggest) |
| Posts | `mcp-server/data/posts/` (318 .cps canonical) or `JM DIE/POST PROCESSORS/2. PRISM ENHANCED/mill/{controller}/` (PRISM-tuned) |
| Mill programs | `JM DIE/CNC MILL HAAS/<customer>/` + `JM DIE/HURCO CNC PROGRAMS/` |
| CAD | `JM DIE/_PART LIBRARY/<customer>/` (.dxf primary, .STEP for 3D) |
| Mill machine specs | `mcp-server/src/data/jm-die-profile.ts` + `ShopConfigurationEngine.ts` (VMC-01..05) |
| Vendor catalogs | `mcp-server/data/ingestion_cache/milling-vendor-online-resources.json` |
| PDF curriculum | `mcp-server/data/ingestion_cache/milling-extraction-curriculum.json` |
| Cross-galaxy | mill-turn → lathe (mcp-server/src/engines/lathe/CLAUDE.md); CAM → cam/CLAUDE.md; post-processor → post-processor/CLAUDE.md |

## 16. Test commands

```bash
# All mill tests
cd H:/PRISM/mcp-server && npx vitest run -t "Mill"

# Mill-specific engine smoke tests
npx vitest run src/__tests__/MillingForce.test.ts
npx vitest run src/__tests__/MillKinematicsCollision.test.ts
npx vitest run src/__tests__/AdaptiveMillingChipLoadMonitor.test.ts
```

## 17. Known gaps + next-session candidates

1. **No `CNC MILLING/` parent folder** — programs split across `CNC MILL HAAS/` + `HURCO CNC PROGRAMS/`. A unified mill-archive locator (like iter200 lathe AB-locator) is missing.
2. **No `PRISM_UPGRADED/` mill outputs** — the v2.0.0 lathe pipeline ran on lathe programs; mill equivalent is not yet wired.
3. **No mill tool-list ingestion** — same gap that exists for lathe (per iter194 template); tool data is embedded in program headers, not centralized.
4. **HyperMILL sub-galaxy CLAUDE.md missing** — documented as FUTURE in parent mill/CLAUDE.md §3. Should be filled by mill-soul slot or foxtrot.
5. **VMC-05 (Roku-Roku) has no registered post** — bug or by-design? Worth verifying.

## 18. Addendum — foxtrot extension (2026-05-27 iter23, slot:foxtrot)

Built by 6 parallel Explore agents during foxtrot's video-corpus /loop. Adds detail the whiskey iter275 atlas didn't cover. Sister of §1-17.

### Mill algorithms — CORRECTION
§2 says "0 dedicated files in src/algorithms/". **Wrong.** There ARE 12 algorithm files used by mill engines (cross-domain, but mill is the primary consumer):
`mcp-server/src/algorithms/{KienzleForceModel,ExtendedTaylorModel,ChipThinningCompensation,SurfaceFinishPredictor,ToolDeflectionModel,ThermalPartitionModel,JaegerTempField,JohnsonCookModel,PowerTorqueCalc,StabilityLobeDiagram,ToolWearPrediction,ChipTypePredictionModel,GilbertMRRModel}.ts`

### Verbatim physics constants — Kienzle kc1.1 / mc
(Lookup shortcut — canonical source is `mcp-server/src/physics/constants.ts`. NEVER inline.)
- **P** (steel) = 1800 N/mm² / mc 0.25 · **M** (stainless) = 2100 / 0.25 · **K** (cast iron) = 1100 / 0.28
- **N** (al/cu/brass) = 700 / 0.22 · **S** (Inconel/Ti) = 2800 / 0.27 · **H** (HRC 45-65) = 3200 / 0.30

### Verbatim Taylor C / n (carbide tool)
Steel 350/0.25 · Stainless 200/0.20 · Cast iron 250/0.25 · Aluminum 600/0.40 · Superalloys 150/0.18 · Hardened (CBN/ceramic) 120/0.15

### Verbatim CANONICAL_MILLING_SPEEDS [m/min] (rough / finish)
P 200/280 · M 130/200 · K 160/240 · N 500/800 · S 40/70 · H 60/100

### Verbatim CANONICAL_MILLING_FEEDS [mm/tooth] (rough / finish)
P 0.15/0.08 · M 0.12/0.06 · K 0.18/0.10 · N 0.20/0.10 · S 0.08/0.04 · H 0.06/0.03

### Tool modulus (deflection): carbide 600 GPa, HSS 210 GPa

### Speed-Feed Orchestration Hub (3-engine triad)
- `SpeedFeedOrchestratorEngine.ts` — **2,851 LOC, central hub, 67 integration points**. Coordinates UltimateSpeedFeed + AutoSpeedFeed + MachiningPlaybook
- `UltimateSpeedFeedEngine.ts` — core physics; any input subset → infer missing via Kienzle/Taylor/chip-thinning/thermal/stability/surface-finish/MRR
- `AutoSpeedFeedEngine.ts` — G-code line-by-line optimizer (chip-thinning, corner decel, arc/plunge limit, CuttingPowerBudget verify)
- Supporting: `SpeedFeedPropagationBridgeEngine.ts` · `CAMSpeedFeedBridgeEngine.ts` · `SpeedFeedBaselineComparatorEngine.ts`

### Bridge / extraction scripts (regen-able)
- `scripts/generate-milling-extracted-pdf-bridge.mjs` — whiskey PDF → system-viz (68 PDFs)
- `scripts/generate-milling-tribal-tip-bridge-features.mjs` — cited-tips → system-viz (R12 Windows-path fix shipped this session)
- `scripts/audit-mill-psn-coverage.mjs` — PSN-coverage audit
- `scripts/extract-jm-milling-tools-fusion.mjs` — Fusion 360 tool extraction
- `scripts/extract-{tungaloy-endmills,kennametal-milling,hypermill-speedfeed}.{mjs,py}` — vendor catalog extractors

### System-viz augmentation files
- `state/shared/system-viz/milling-extracted-pdf-bridge-augmentation.json` (91.4K, 68 PDFs)
- `state/shared/system-viz/milling-tribal-tip-bridge-augmentation.json` (12.8K, 78 tips bridged of 262)
- `state/shared/system-viz/staging/galaxy-roosts/{mill,pdf-corpus-mill}.json`

### Tribal-tip catalog evolution (live tip count, session-tracked)
- `mcp-server/src/data/tribal-tips/milling-pdf-cited-tips.ts` — **268 tips** as of iter23. Export `MILLING_PDF_CITED_TIPS`. Operation buckets active: `face_milling`, `high_feed_milling` (new this session), `high_efficiency_milling`, `pocket_milling`, `slotting`, `chamfering`, `thread_milling`, `cam_strategy`, `probing` (new this session), `tool_selection`, `machine_setup` (new this session), plus more.
- Companion derived index: `milling-training-index.ts` (`MILLING_TRAINING_NODES`)
- Consumer: `KnowledgeCurriculumBridgeEngine.tipsForMillingOperation(operation)`

### Operator-named video sources (goal directive 2026-05-27)
- **Dapra** — covered via manufacturer docs (high-feed/operating-instructions, application-information). 9 tips iter22.
- **Haas** — covered via RD0064 + Mill Operator Manual + CNC Training Centre. 6 tips iter23.
- **Sandvik Coromant** — covered via inserts-grades/milling-inserts-grades + face-milling family pages. 6 tips iter23.
- **https://www.youtube.com/@performancetoolingsecrets** — channel has 25+ milling videos confirmed via yt-dlp; first 3 caption files pulled to /tmp (zGVJU9jmVpI ball-nose, DvUYTVn72SE plunge, 3vB4D3-atPQ trochoidal) — extraction-to-tip-catalog pending next iter.

## Related

- `H:/PRISM/mcp-server/src/engines/mill/CLAUDE.md` — domain-local doctrine sentinel
- `[[reference_whiskey_iter250_cron_re_establishment_2026_05_27]]` — predecessor whiskey-slot work
- `[[feedback_psn_definition]]` — 11-leg PSN taxonomy (mill is the largest single-domain galaxy)
- `H:/PRISM/state/shared/MILL-MASTER-HANDOFF.md` — 79 phases, 900 units, 2026-04-21 lock
- `H:/PRISM/CLAUDE.md` §DOMAIN-GALAXY-DOCTRINE-MS0 — galaxy doctrine
