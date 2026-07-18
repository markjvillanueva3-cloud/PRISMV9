# ELECTRODE PIPELINE FEATURE — Print → Roku-Roku → EA12S/EA12D via System 3R Robot

## Context

JM Die needs an end-to-end electrode manufacturing pipeline that:
1. **Replaces the Excel macro entirely** with a PRISM-native parametric configurator for cold-heading die tooling (mailbox punches, taptites, heading dies, etc.) — this configurator defines the cavity geometry that electrodes burn into
2. **Outputs to Fusion 360** as the CAD/CAM target for electrode milling, BUT PRISM also generates G-code directly to validate its own capabilities
3. **Generates Roku-Roku HC 658-II milling programs** (Fanuc 31i-B5 G-code, .NC format) for electrode milling
4. **Generates Mitsubishi sinker EDM programs** for EA12S (FP80S) and EA12D (C30EA-2) — currently programmed conversationally at the machine, goal is to automate
5. **Integrates with System 3R WorkPartner 1+ robot cell** which loads/unloads System 3R pallets on the Roku-Roku (electrode queuing for lights-out milling)

## Key Decisions (From User)

| Decision | Answer | Implication |
|----------|--------|-------------|
| Excel macro role | **Replace entirely** | Build PRISM-native parametric configurator for die tooling + electrode pipeline |
| CAD/CAM tool | **Fusion 360 + PRISM direct** | Output to Fusion for CAM, AND generate G-code directly for capability validation |
| Robot cell | **Pallet load/unload** | Robot swaps System 3R pallets, programs pre-loaded on Fanuc. Generate job queue file. |
| Sinker programming | **Mostly conversational** | Currently manual/conversational at FP80S/C30EA-2. Automate this with generated programs. |

## What Already Exists in PRISM

| Component | LOC | Key Capability |
|-----------|-----|----------------|
| ElectrodeDesignEngine | 199 | Cavity → electrode sizing, spark gaps (R/S/F: 0.15/0.08/0.03mm), 5 materials, wear ratios |
| SinkerEDMCalculatorEngine | 363 | Pulse physics, 6 electrode × 18 workpiece materials, VDI 3400, recommendSettings() |
| EDMProgramAssemblerEngine | 2,705 | Full program gen for sinker+wire, 6 dialects, stochastic uncertainty |
| BlueprintVisionOCREngine | 575 | Claude Vision → dims, GD&T, material, finish from blueprint images |
| EDMDrawingInterpretationEngine | 886 | Feature classification, tolerance-to-pass mapping, process selection |
| PostProcessorPipelineEngine | 5,447 | 35-stage pipeline, Fanuc dialect supported |
| EA12S .cps post-processor | ~500+ | Complete EA12S post with E-table conditions, orbit modes, M06/M17/M18 |
| EA12D .cps post-processor | ~500+ | Complete EA12D post with dual-head support |
| edmDispatcher | 882 | 50+ actions wired |
| JM ELECTRODE 3R HOLDERS/ | 8 files | Inventor models: ER32/ER40 System 3R electrode holders |
| 972 .mcx-8 files | — | Real electrode models (hyperMILL) for reference/learning |
| Reference .NC programs | — | Real Roku-Roku Fanuc 31i G-code for pattern matching |

## Architecture: 10-Stage Pipeline

```
STAGE 0: PART CONFIGURE    → PRISM parametric configurator (replaces Excel macro)
                              Define die insert geometry → outputs cavity 3D model
STAGE 1: PRINT UPLOAD      → BlueprintVisionOCREngine reads uploaded print/3D model
STAGE 2: CAVITY ANALYSIS   → Extract cavity features, depth, tolerances, material, finish
STAGE 3: ELECTRODE DESIGN  → ElectrodeDesignEngine sizes electrodes (R/S/F staging)
STAGE 4: FUSION 360 OUTPUT → Export electrode model + CAM parameters for Fusion 360
STAGE 5: PRISM G-CODE GEN  → PRISM directly generates Roku-Roku .NC (Fanuc 31i-B5)
STAGE 6: ROBOT JOB QUEUE   → System 3R WorkPartner 1+ pallet queue file
STAGE 7: SINKER PROGRAM    → Mitsubishi EA12S/EA12D burn program (replaces conversational)
STAGE 8: SETUP DOCS        → Setup sheets, traveler cards, inspection checklists
STAGE 9: SAFETY VERIFY     → Machine limits, collision, parameter bounds, dust extraction
```

## New Engines to Create

### 1. ColdHeadingToolConfiguratorEngine (~600 LOC)
**Replaces**: `Automated Program_Corrected 5-25.xlsm`
**Purpose**: PRISM-native parametric configurator for all die tooling types
**File**: `src/engines/ColdHeadingToolConfiguratorEngine.ts`

Replicates the 10 sheet types from the Excel macro:
- Mailbox punch (round + square)
- Altracs thread form die (+ orbit variant)
- Square recess punch
- Heading die (serrated)
- Single taptite / trilobe die
- Triple taptite die
- TD tooling
- Template for new types

Input: part type + parametric dimensions (same B11-B44 inputs as Excel)
Output: 3D cavity geometry definition (dimensions, profiles, features) that feeds Stage 1
**Key difference from Excel**: No SolidWorks dependency. Outputs a parametric geometry definition that can:
- Export to Fusion 360 as STEP
- Feed directly into ElectrodeDesignEngine
- Store in job history (replaces Excel's T2:AZ2 history)

### 2. ElectrodePipelineOrchestratorEngine (~500 LOC)
**Purpose**: Orchestrates all 10 stages
**File**: `src/engines/ElectrodePipelineOrchestratorEngine.ts`

Input: uploaded print (image/PDF) OR ColdHeadingToolConfigurator output + workpiece material + target finish
Output: complete job package (Fusion params, Roku-Roku .NC, sinker program, robot job, setup sheets)

### 3. RokuRokuPostProcessorEngine (~800 LOC)
**Purpose**: Generate Fanuc 31i-B5 G-code for electrode milling on HC 658-II
**File**: `src/engines/RokuRokuPostProcessorEngine.ts`

G-code dialect (from reference programs):
```
%
O0000 (PART-NUMBER)
(PROGRAM   - filename.NC)
(DATE      - date)
(TIME      - time)
(T1   - tool description - H1 - D1 - diameter - radius)
G00 G17 G20 G40 G49 G80 G90      (safety line)
G91 G28 Z0.                       (home Z)
T1 M06                            (tool change)
G00 G17 G90 G54 X__ Y__ S__ M03  (position, spindle on)
G43 H1 Z__ M07                   (height comp, coolant)
G94                                (IPM feed mode)
M162                               (look-ahead enable)
G05 P10000                        (precision path control)
...machining moves...
G05 P0                            (path control off)
G91 G28 Z0.                       (home)
M30                                (end)
%
```

Graphite-specific additions:
- Dust collection M-code (MANDATORY — safety critical)
- HSM parameters optimized for graphite (high RPM, light DOC, climb milling)
- System 3R G54 pallet reference offset
- Tool header comments matching JM Die convention

### 4. ElectrodeCAMStrategyEngine (~500 LOC)
**Purpose**: Select milling strategy based on electrode geometry
**File**: `src/engines/ElectrodeCAMStrategyEngine.ts`

Strategies:
- Simple profile: 2.5D pocket + profile finishing
- Complex 3D: Adaptive rough → rest mill → ball-nose finish
- Thin rib: Reduced DOC, climb only, spring pass, diamond-coated tooling
- Flat: Face mill + contour, high-feed milling

Speed/feed: graphite-specific Kienzle (kc1.1 per grade)
Tool selection: diamond-coated carbide primary, uncoated for prototype

### 5. System3RWorkPartnerJobEngine (~300 LOC)
**Purpose**: Generate WorkPartner 1+ pallet queue file
**File**: `src/engines/System3RWorkPartnerJobEngine.ts`

The robot loads/unloads System 3R pallets. Generate a job queue:
- Pallet number → electrode ID → NC program file → priority
- Electrode sequence: rough electrodes first, then semi, then finish
- ER32 vs ER40 holder assignment based on electrode shank diameter
- Pallet reference offset (System 3R repeatability: ±0.002mm)

### 6. MitsubishiSinkerProgramEngine (~600 LOC)
**Purpose**: Generate FP80S (EA12S) and C30EA-2 (EA12D) burn programs
**File**: `src/engines/MitsubishiSinkerProgramEngine.ts`

**Replaces conversational programming** at the machine. Generate complete burn program:

From the .cps post-processor specs:
```
FP80S G-codes:
  G90/G91  — Abs/Inc positioning
  G01      — Linear plunge (Z-axis burn)
  G02/G03  — Circular orbit (CW/CCW)
  G73      — Peck EDM cycle (rough)
  G83      — Deep peck EDM cycle (precision)
  G92      — Reference point set

FP80S M-codes:
  M06      — Electrode change (16-station ATC on EA12S, 24 on EA12D)
  M07/M09  — Flushing on/off
  M17/M18  — EDM power on/off
  M50-M65  — E-table condition selection

Orbit modes:
  Circular  — uniform cavity enlargement
  Square    — rectangular pocket finishing
  Planetary — complex geometry averaging
  Random    — uniform electrode wear
```

Material pair → condition table (from .cps):
- D2 + Graphite EDM-200 → rough: high power E-table, wear ~1:1
- D2 + Copper CuW70 → finish: low power, wear ~0.1:1
- H13 + Graphite EDM-3 → rough: medium power, wear ~0.8:1
- Carbide + CuW80 ONLY → **never graphite on carbide (microcracking)**

Multi-electrode sequence:
1. Load rough electrode (M06 T01)
2. M17 power on, M07 flush on
3. G73 peck to rough depth with E-table rough condition
4. M18 power off, M09 flush off
5. M06 T02 (load semi electrode)
6. Burn to semi depth with semi condition
7. M06 T03 (load finish electrode)
8. Burn to final depth with finish condition, orbital finishing
9. M02 program end

### 7. ElectrodeSetupDocEngine (~300 LOC)
**Purpose**: Setup sheets, travelers, inspection checklists
**File**: `src/engines/ElectrodeSetupDocEngine.ts`

### 8. Graphite Constants Addition
**File**: `src/physics/constants.ts`
**Add**: Graphite workpiece material with grade-specific kc1.1:
- EDM-200 (coarse grain): kc1.1 = 150 N/mm², mc = 0.20
- EDM-3 (fine grain): kc1.1 = 250 N/mm², mc = 0.22
- POCO AF-5 (ultra-fine): kc1.1 = 350 N/mm², mc = 0.25

Note: Graphite does NOT form chips — it fractures. Kienzle is approximate.
Also add: thermal conductivity, density, flexural strength per grade.

## Files to Modify

- `src/physics/constants.ts` — Add graphite material data (3 grades)
- `src/tools/dispatchers/edmDispatcher.ts` — Add actions: `electrode_pipeline_run`, `electrode_configure_tooling`, `electrode_mill_program`, `electrode_sinker_program`, `electrode_robot_job`, `electrode_setup_docs`, `electrode_fusion_export`
- `src/engines/index.ts` — Export 7 new engines
- `src/routes/edm.ts` — Add `/api/v1/edm/electrode-pipeline` endpoints
- `src/hooks/SafetyQualityHooks.ts` — Add graphite dust extraction enforcement hook
- `web/src/pages/ElectrodePipelinePage.tsx` — New frontend page
- `web/src/api/electrode.ts` — New API client module

## Implementation Sessions (9 sessions)

### Session 1: Graphite Physics + Parametric Configurator (U-ELEC01..U-ELEC02)
- Add graphite to constants.ts (3 grades with kc1.1, thermal, mechanical props)
- Create ColdHeadingToolConfiguratorEngine (replaces Excel macro)
  - 10 tooling types with parametric dimension inputs
  - Job history storage (replaces Excel's T2:AZ2 history table)
  - Geometry output for electrode pipeline input
- Tests: configurator outputs match Excel dimension-to-geometry mapping

### Session 2: Pipeline Orchestrator + CAM Strategy (U-ELEC03..U-ELEC04)
- Create ElectrodePipelineOrchestratorEngine (10-stage skeleton)
- Create ElectrodeCAMStrategyEngine (graphite milling strategies)
- Wire BlueprintVisionOCREngine as Stage 1 input
- Wire ElectrodeDesignEngine as Stage 3
- Tests: pipeline routes print → cavity analysis → electrode plan

### Session 3: Roku-Roku Post-Processor (U-ELEC05..U-ELEC06)
- Create RokuRokuPostProcessorEngine (Fanuc 31i-B5 dialect)
- Match reference format from 014-41009H-00.NC exactly
- System 3R G54 pallet offset handling
- Dust extraction M-code enforcement (SAFETY CRITICAL)
- Tests: output matches reference program structure; dust extraction hook blocks without M-code

### Session 4: Robot Job + Sinker Programs (U-ELEC07..U-ELEC08)
- Create System3RWorkPartnerJobEngine (pallet queue file)
- Create MitsubishiSinkerProgramEngine (FP80S + C30EA-2 dialects)
  - G73/G83 peck EDM, M06 electrode change, M17/M18 power, M50-M65 E-table
  - Orbit mode selection per cavity geometry
  - Multi-electrode burn sequences with Z-axis wear compensation
- Tests: sinker output matches .cps post-processor G-code specs

### Session 5: Fusion 360 Export + Setup Docs (U-ELEC09..U-ELEC10)
- Add Fusion 360 export path (STEP geometry + CAM parameter sheet)
- Create ElectrodeSetupDocEngine (setup sheets, travelers, inspection checklists)
- Wire dispatcher actions and HTTP routes
- Tests: Fusion 360 can import exported STEP; docs contain all required info

### Session 6: Frontend Page (U-ELEC11..U-ELEC12)
- Create ElectrodePipelinePage in frontend:
  - Upload print (image/PDF) or select from configurator
  - Preview extracted cavity data
  - Electrode plan display (count, materials, staging, estimated times)
  - Generate buttons (Roku-Roku, Sinker, Robot Job, Fusion Export)
  - Download package (all files bundled)
- Wire to auth/RBAC

### Session 7: Safety Gates + Integration (U-ELEC13..U-ELEC14)
- Graphite dust extraction enforcement hook
- Sinker parameter bounds (max current per electrode area, min flush time)
- Polarity validation (never graphite on carbide)
- Machine travel limit checks (Roku-Roku + EA12S/EA12D envelopes)
- Collision pre-check gate
- Full pipeline integration wiring (all stages connected end-to-end)

### Session 8: Turned Electrodes + Eccentric Turning (U-ELEC15..U-ELEC16)
- Create EccentricTurningEngine (trilobe C-axis + X-axis polar interpolation)
- Add turned electrode path to pipeline (simple OD/taper for cylindrical electrodes)
- Okuma OSP-P300 post-processor for turned electrodes (G96, G42, A-word taper)
- Support target lathes: GENOS L300-M (C-axis), Multus B250II (full mill-turn)
- Trilobe physics: force variation per revolution, finish at varying engagement
- Tests: validate against BFELECTRODE.MIN; verify trilobe profile within ±0.001"

### Session 9: E2E Testing + Polish (U-ELEC17..U-ELEC18)
- End-to-end test with real electrode geometry from JM Die .mcx-8 reference models
- Test across workpiece materials: D2, H13, A2, S7, carbide (per .cps recommendations)
- Test both EA12S (single head, 16-station) and EA12D (dual head, 24-station)
- Verify System 3R pallet assignments match ER32/ER40 physical holders
- Performance target: full pipeline < 30 seconds
- Verify Roku-Roku .NC output is safe to DNC to Fanuc 31i controller

## ADDITION: Turned Electrodes + Eccentric Turning for Trilobes

### Discovery
The JM Die CNC LATHE folder contains **turned electrodes** (BFELECTRODE.MIN, ALPINEELECTR.MIN, ELECT.MIN, EDMHOLDER.MIN, etc.) — simple OD profiles turned on Okuma lathes. Example BFELECTRODE.MIN:
```
G96 S500 M3 M8          (CSS 500 SFM)
G1 A135 X.936 F.002     (angular taper move)
G1 X.995 Z-1.76 F.003   (straight OD)
```

Additionally, **trilobe electrode models** exist (TRILOBE C.2842, TRILOBE C.3571 .mcx-8 files) and a **TRILOBE TEMPLATE.invhsm-template** for hyperMILL. Trilobe electrodes require **eccentric turning** — the electrode cross-section is a 3-lobed profile, not circular.

### What Eccentric Turning Requires
Trilobe (taptite) electrodes have a 3-lobed cross-section defined by C(1) and E(1) diameters (from the Excel macro's "Single Taptite" sheet). To turn this profile:

1. **C-axis interpolation** (G12.1 polar interpolation on Okuma OSP, or equivalent)
   - The lathe C-axis rotates the spindle while X-axis moves in/out to create the lobed profile
   - Requires: synchronized C-axis + X-axis coordinated motion
   - Okuma OSP-P300 supports this natively
2. **Y-axis eccentric turning** (on lathes with Y-axis: GENOS L300-M, L200E-M)
   - For asymmetric profiles where polar interpolation is insufficient
3. **Live tooling alternative** — some trilobes are milled on the lathe using C-axis indexing + live endmill

### New Engine: EccentricTurningEngine (~400 LOC)
**File**: `src/engines/EccentricTurningEngine.ts`

Purpose: Generate CNC programs for non-circular turning profiles (trilobes, taptites, eccentric shapes)
- Input: lobe count, C diameter, E diameter, length, draft angle, target surface finish
- Output: G-code with C-axis/X-axis synchronization for Okuma OSP-P300 family
- Controller dialects: OSP-P300L-R (GENOS L300-M), OSP-P300LA-E (GENOS L400II-E), OSP-P300SA (Multus B250II)
- Physics: cutting force variation per revolution (force peaks at lobe crests), surface finish at varying diameter
- Safety: spindle speed limit at max C(1) diameter, acceleration limits for X-axis reversal

### Turned Electrode Sub-Pipeline
Add Stage 4B alongside Stage 5 (PRISM G-code gen):
```
STAGE 4B: LATHE PROGRAM → For cylindrical/trilobe electrodes turned on Okuma lathes
  - Simple OD electrodes: standard OD turning + taper (like BFELECTRODE.MIN)
  - Trilobe electrodes: EccentricTurningEngine with C-axis polar interpolation
  - Target: Okuma GENOS L300-M (live tooling, C-axis) or Multus B250II (full mill-turn)
```

### Additional Session: Turned Electrodes + Eccentric (U-ELEC17..U-ELEC18)

**Session 9: Turned Electrodes + Eccentric Turning**
- Create EccentricTurningEngine for trilobe profiles (C-axis + X-axis sync)
- Add turned electrode path to pipeline (simple OD + taper profiles)
- Okuma OSP-P300 post-processor for turned electrodes (G96 CSS, G42 tool nose comp, A-word taper)
- Trilobe-specific physics: force variation, surface finish at varying engagement
- Tests: compare against BFELECTRODE.MIN reference; validate trilobe profile geometry

## Safety Gates (MANDATORY — Non-Negotiable)

1. **Graphite dust extraction**: Roku-Roku .NC MUST include dust collector M-code. Graphite is combustible (NFPA 652/654) and a respiratory hazard. Hook BLOCKS program output without it.
2. **Never graphite on carbide**: If workpiece is WC-Co, electrode material MUST be copper-tungsten. Graphite causes microcracking. Auto-enforced.
3. **Sinker parameter bounds**: Peak current ≤ electrode area capacity. Burn without flush → arcing → fire.
4. **Polarity auto-set**: Per material pair table from .cps. Wrong polarity destroys workpiece.
5. **Machine travel limits**: All XYZ within Roku-Roku envelope AND EA12S (X300/Y250/Z250mm) limits.
6. **Collision gate**: Electrode clears fixture before program runs.

## Verification Plan

1. **Unit tests**: ≥10 per new engine, assert specific values not just toBeTruthy()
2. **Graphite physics**: Compare Kienzle forces against Poco/Toyo Tanso published cutting data
3. **Roku-Roku G-code**: Diff generated .NC against reference `014-41009H-00.NC` for format compliance
4. **Sinker G-code**: Verify against FP80S/C30EA-2 .cps post-processor expected output
5. **Configurator**: Test all 10 tooling types, compare against Excel macro dimension mapping
6. **E2E pipeline**: Upload real print → verify all 10 stages produce valid output
7. **Safety hooks**: Verify dust extraction block, graphite-on-carbide block, parameter bounds block
8. **Frontend**: Upload → preview → generate → download flow works end-to-end
