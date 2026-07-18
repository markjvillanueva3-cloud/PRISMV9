# HM-REV Mold & Die Evaluation — Scores, Findings, Build Plan

## Evaluation Date: 2026-04-03
## Role: Mold & Die Maker evaluating HyperMILL CAM coverage in PRISM

---

## SCORE CARD

| Domain | Score | Verdict |
|---|---|---|
| 1. Cavity/Core Split Workflow | 18/100 | Critical gap |
| 2. Electrode Manufacturing | 52/100 | Partial — design engine solid, hyperMILL bridge missing |
| 3. Hardened Steel Finishing | 35/100 | Generic H-group warning only, no MAXX/CBN routing |
| 4. Surface Finish Targets | 28/100 | ISO N-grades present, SPI scale entirely absent |
| 5. Parting Line + Draft | 5/100 | Zero dedicated coverage — not addressed anywhere |
| 6. Rest Machining | 44/100 | 3D cycles exist in catalog, no progressive stack logic |

---

## DETAILED FINDINGS

### 1. Cavity/Core Split Workflow — 18/100

WHAT EXISTS:
- HyperMillMultiAxisEngine has `cavity_5x` and `freeform_5x` geometry types
- Cycles SfoRX5 (5X Shape Offset Roughing) and SfoFX5 (5X Shape Offset Finishing) are catalogued
- HyperMillCycleCatalogEngine lists Z-Level Roughing, Z-Level Finishing, Equidistant Machining, Pencil Milling

CRITICAL GAPS:
- No `MoldCavityCoreEngine` or equivalent — nothing tells the system which surfaces are cavity vs core
- No concept of "A-side/B-side" differentiation in any engine
- No steel selection routing (P20 pre-hard vs H13 hardened vs S7 shock-resistant)
- No cooling channel depth/clearance awareness
- No concept of K.O. pin pocket placement, ejector pocket machining, or support pillar bosses
- InjectionMoldQuoteEngine knows P20/H13 steel classes (cost) but never routes to CAM strategy

### 2. Electrode Manufacturing — 52/100

WHAT EXISTS:
- ElectrodeDesignEngine: graphite_fine / graphite_std / copper / copper_tungsten / tellurium_copper
- Proper overcut compensation (rough 0.15 / semi 0.08 / finish 0.03mm)
- Stage planning (rough/semi/finish electrode counts)
- EDMProgramAssemblerEngine (6 dialects — production-ready)
- StochasticEDMEngine, EDMMultiPassStrategyEngine, EDMBiMaterialCompensationEngine
- hyperMILL tips hm-085 to hm-088 exist (hyperCAD-S electrode design)

GAPS:
- No HyperMillElectrodeCycleEngine — cannot bridge ElectrodeDesignEngine output to hyperMILL electrode machining workflow
- No hyperCAD-S "Electrode" feature job creation logic
- No electrode holder collision checking specific to EDM setup (distinct from regular mold collision)
- Electrode allowance (finish stock for EDM gap) not linked to hyperMILL finishing passes
- No gang electrode / multi-cavity electrode optimization for hyperMILL MAXX roughing

### 3. Hardened Steel Finishing — 35/100

WHAT EXISTS:
- HyperMillMultiAxisEngine: ISO H group warning ("use ceramic or CBN, high speed low feed")
- HyperMillMaterialBridgeEngine: maps materials to ISO groups
- CeramicsMachiningEngine: exists for ceramics but covers workpiece ceramics not tool type
- BurnishingPolishingEngine: exists

GAPS:
- No explicit D2 (62HRC), H13 (50-54HRC), S7 (54-56HRC), P20 (pre-hard 30-34HRC) routing
- MAXX Machining cycle (high-feed roughing at hardened state) not mentioned anywhere in any engine
- No CBN insert grade selection engine for mold steels
- No "trochoidal micro-depth" strategy guidance for hard milling (ae=5-15% D, ap=0.1-0.3mm)
- No heat generation / thermal distortion warning for long hardened steel programs
- SurfaceFinishPredictorEngine computes Ra from kinematic formula only — no CBN/ceramic-specific models

### 4. Surface Finish Targets — 28/100

WHAT EXISTS:
- SurfaceFinishDatabaseEngine: ISO N1-N12 grades (Ra 0.025 to 50μm)
- SurfaceFinishPredictorEngine: scallop height formula, kinematic Ra model
- N3 = Ra 0.1μm (honing/polishing process noted)

GAPS:
- SPI Mold Finish standard (A-1 through D-3) entirely absent from all engines:
  - SPI A-1: Ra 0.012-0.025μm, diamond buff (optical)
  - SPI A-2: Ra 0.025-0.05μm, diamond buff
  - SPI A-3: Ra 0.05-0.1μm, diamond buff
  - SPI B-1: Ra 0.1-0.2μm, paper + stone
  - SPI B-2: Ra 0.2-0.4μm, 400-600 grit paper
  - SPI B-3: Ra 0.4-0.8μm, 400-600 grit stone
  - SPI C-1/C-2/C-3: Ra 0.8-1.6μm, 400/600 grit stone
  - SPI D-1/D-2/D-3: Ra 3.2-12.5μm, dry blast media
- No path from hyperMILL scallop calculation → SPI grade recommendation
- No "ball-nose stepover for SPI A-3" calculator (requires scallop < 0.5μm, ae ~0.08mm with R3 ball)
- BurnishingPolishingEngine exists but not linked to SPI targets

### 5. Parting Line + Draft — 5/100

WHAT EXISTS:
- Absolutely nothing mold-specific
- HyperMillStrategyEngine has no `parting_line` geometry type
- DfMRulesEngine likely has generic draft rules but not mold-specific

GAPS (everything):
- No draft angle analysis engine (1° min for plastic, 3° for textured, 5° for rubber)
- No parting line identification or machining strategy
- No "split-face at parting" toolpath guidance
- No undercut detection for slider/lifter requirement identification
- No flash-gap tolerance guidance (typically 0.025mm max at parting line)
- hyperMILL has no native parting automation — PRISM should be the intelligence layer here

### 6. Rest Machining — 44/100

WHAT EXISTS:
- HyperMillCycleCatalogEngine: "3D:Optimized Rest Roughing", "3D:Autom. Rest Machining",
  "3D:Z-Level Rest Machining", "3D:Corner Rest Machining", "3D:Curve Rest Machining"
- 5-axis: "5X:5 AXIS Rest Machining", "5X:5 AXIS Corner Rest Machining",
  "5X:5 AXIS Optimized Rest Roughing" all catalogued
- HyperMillStrategyEngine has `rest_machining` as an OperationGoal
- `corner` geometry type exists

GAPS:
- No progressive rest machining stack definition: D16 → D10 → D6 → D4 → D3 → D2 → D1
- No "minimum tool for remaining stock thickness" calculation
- No rib-depth-to-width ratio check (>3:1 = vibration risk, needs tapered tool)
- No corner radius check (part corner radius must be ≥ tool radius + 0.05mm)
- No rest material awareness for hardened steel (don't leave >0.3mm stock on hardened H13)
- Pencil milling (3D:Pencil Milling) not linked to mold rib/corner detection

---

## BUILD PLAN: SKILLS & HOOKS NEEDED

### PRIORITY 1 — New Engine: HyperMillMoldCycleEngine
File: `src/engines/HyperMillMoldCycleEngine.ts`

Responsibilities:
- Geometry classifier: cavity / core / parting_surface / lifter_pocket / ejector_pocket / cooling_channel / runner / gate / boss / rib / gusset
- Map each geometry type to hyperMILL cycle sequence (roughing → semi → finish → rest)
- Steel routing: P20 → standard carbide strategy; H13 hardened → MAXX + trochoidal; D2 → CBN only
- SPI target → scallop height → stepover calculator (ball-nose formula: ae = 2√(2Rh))
- Hook into ElectrodeDesignEngine for EDM-required features (undercuts, narrow ribs < 2×tool dia)

### PRIORITY 2 — New Engine: HyperMillRestMachiningStackEngine
File: `src/engines/HyperMillRestMachiningStackEngine.ts`

Responsibilities:
- Progressive tool-down sequence generator given: initial tool dia, minimum corner radius, rib depth/width
- Output: ordered array of [{tool_dia, cycle_code, stepdown, stepover, stock_to_leave}]
- Check rib aspect ratio → tapered ball mill recommendation if >3:1
- Verify remaining stock thickness at each step for hardened steel (no >0.3mm stock in H13)

### PRIORITY 3 — New Engine: SPIMoldFinishEngine
File: `src/engines/SPIMoldFinishEngine.ts`

Responsibilities:
- SPI A-1 through D-3 classification with Ra ranges
- Given SPI target → recommend: machine process sequence (hyperMILL finish → manual stone/paper → EDM texture)
- Given ball-nose diameter + SPI target → compute maximum stepover
- Flag when SPI A-1/A-2 cannot be achieved by milling alone (requires hand polishing + diamond compound)
- Bridge to BurnishingPolishingEngine for post-machining steps

### PRIORITY 4 — New Engine: DraftAnalysisEngine (or extend DfMRulesEngine)
File: `src/engines/DraftAnalysisEngine.ts` (or extend `DfMRulesEngine.ts`)

Responsibilities:
- Draft angle minimums by material class (generic plastic 1°, textured 3°, rubber/TPE 5°, glass-filled 1.5°)
- Flag zero-draft surfaces that will require side-action (slider/lifter)
- Parting line flash gap tolerance check (< 0.025mm tolerance at PL)
- Undercut depth-to-draft ratio calculation
- Output: surface-by-surface draft report with PASS/WARN/FAIL and recommended correction

### PRIORITY 5 — New Hook: `hypermill-mold-safety.ts`
File: `src/engines/HyperMillMoldSafetyHooks.ts`

Hooks to add (mode: "warning"):
- `validateHardenedSteelStrategy`: block non-CBN/non-ceramic tools when HRC > 58
- `validateScallopForSPI`: if target SPI A-1/A-2, warn if stepover > 0.05mm
- `validateRestMachiningStock`: if H13 + rest_machining, warn if stock_to_leave > 0.3mm
- `validatePartingLineTolerance`: warn if PL machining tolerance > 0.02mm
- `validateElectrodeUndersize`: cross-check ElectrodeDesignEngine overcut vs EDM machine gap

### PRIORITY 6 — New Skill: `hypermill-mold-strategy`
Trigger: user asks about mold machining, cavity/core, SPI finish, electrode for mold feature

Workflow:
1. Classify geometry type (cavity/core/electrode/parting/runner)
2. Identify steel grade → hardness → tool material routing
3. Build roughing stack (MAXX or Z-level depending on hardness)
4. Build rest machining sequence
5. Identify EDM candidates (features < 2× minimum tool dia)
6. Output SPI finish path per surface
7. Summarize as hyperMILL job sequence

---

## MAPPING: What hyperMILL Cycles Cover Mold Work

| Mold Operation | hyperMILL Cycle | Code | PRISM Coverage |
|---|---|---|---|
| Cavity roughing (soft P20) | 3D Z-Level Roughing | — | Partial (no mold context) |
| Cavity roughing (hard H13) | MAXX Machining (Offset Roughing) | 3D:Offset Roughing | Not routed |
| Semi-finish steep walls | 3D Z-Level Finishing | — | Exists, no mold routing |
| Semi-finish shallow | 3D Equidistant (Scallop) | — | Exists, no SPI bridge |
| Mirror finish < 0.1μm | 5X Equidistant + hand polish | SfoFX5 | Not linked to SPI |
| Pencil/corner cleanup | 3D Pencil Milling | — | Exists, not sequenced |
| Rest machining ribs | 3D Corner Rest / Auto Rest | — | Exists, no stack logic |
| Parting line face | 2D Face Milling | — | Generic only |
| Electrode roughing | 3D Z-Level Roughing | — | No electrode context |
| Electrode finishing | 3D Equidistant / Pencil | — | No electrode context |
| Runner/gate | 2D Contour Milling | — | Generic only |

---

## CROSS-WIRE OPPORTUNITIES (engines to link, not rebuild)

- ElectrodeDesignEngine → HyperMillMoldCycleEngine (EDM candidate detection)
- SurfaceFinishPredictorEngine → SPIMoldFinishEngine (scallop → SPI grade)
- InjectionMoldQuoteEngine → HyperMillMoldCycleEngine (mold class → steel → strategy)
- BurnishingPolishingEngine → SPIMoldFinishEngine (post-mill polishing steps)
- HyperMillMaterialBridgeEngine → HyperMillMoldCycleEngine (H-group detection)
- EDMProgramAssemblerEngine → HyperMillMoldCycleEngine (EDM handoff for undercuts)
- DfMRulesEngine → DraftAnalysisEngine (extend, don't rebuild)
