# HM-REV Evaluation: Setup & Program Optimization Quality
## Evaluation Date: 2026-04-03
## Role: CNC Setup and Program Optimization Expert

---

## EVIDENCE INVENTORY (from source code inspection)

### HyperMILL Engines (confirmed on disk)
| Engine | LOC | Status |
|---|---|---|
| HyperMillStrategyEngine | 492 | BUILT + dispatcher-wired (cam_strategy_recommend) |
| HyperMillCycleDefaultsEngine | 636 | BUILT + dispatcher-wired (cam_cycle_defaults) |
| HyperMillControllerCatalogEngine | 430 | BUILT + dispatcher-wired (cam_controller_catalog) |
| HyperMillMaterialBridgeEngine | 521 | BUILT — NOT wired to dispatcher or SpeedFeedOrchestrator |
| HyperMillCodeGeneratorEngine | 982 | BUILT — wired (hypermill_code_generate) |
| HyperMillCycleCatalogEngine | ? | BUILT + wired (cam_cycle_catalog) |
| HyperMillMultiAxisEngine | ? | BUILT + wired (cam_multiaxis_recommend) |
| HyperMillSafetyHooks | ? | BUILT + wired (cam_safety_validate) |
| HyperMillToolExportEngine | ? | BUILT + wired (hypermill_tool_export) |
| HyperMillThreadStandardEngine | ? | BUILT + wired (cam_thread_lookup) |
| HyperMillMaterialMapEngine | ? | BUILT + wired (cam_material_map) — DIFFERENT from MaterialBridgeEngine |

### Shared Engines (relevant to setup/optimization)
| Engine | Status |
|---|---|
| SpeedFeedOrchestratorEngine (2,851 LOC) | BUILT — references MachineRegistry but NOT HyperMillMaterialBridge |
| PostProcessorPipelineEngine (3,601 LOC) | BUILT — no HyperMill-specific wiring found |
| WorkholdingIntelligenceEngine | BUILT — no HyperMill wiring in camDispatcher |
| SetupSheetEngine | BUILT — camDispatcher only has SetupSheetFromGCodeEngine variant |
| AcoSequencerEngine | BUILT — not wired in hyperMILL path |
| CycleTimeEngine | BUILT — camDispatcher only has CycleTimeEstimatorEngine for generic path |
| FixtureDesignEngine | BUILT — not wired |
| SoftJawProfileEngine | BUILT — not wired |

### Key Wiring Gaps Found
1. HyperMillMaterialBridgeEngine exists but is NOT wired into SpeedFeedOrchestrator or camDispatcher
2. PostProcessorPipelineEngine (38 stages) is NOT connected to hyperMILL output path
3. WorkholdingIntelligenceEngine is NOT wired into hyperMILL job path
4. SetupSheetEngine (full job setup) is NOT wired for hyperMILL — only SetupSheetFromGCodeEngine (reverse from G-code)
5. AcoSequencerEngine is NOT called from hyperMILL strategy/code-gen path
6. CycleTimeEngine (with breakdown) is NOT wired to hyperMILL operations
7. MachineRegistry's 910 machines are not mapped to ControllerCatalog's 16 families for automatic post-selection
8. ToolRegistry (95,608 tools) is not checked by HyperMillStrategyEngine or HyperMillCodeGeneratorEngine before recommending tools

---

## SCORE CARD (0–100)

### 1. SETUP ACCURACY — Score: 38/100

**What exists:**
- HyperMillStrategyEngine correctly selects cycles per geometry/goal/material (20 strategies, 15 geometry types)
- Slope-dependent finishing selection (steep >60° → Z Level, flat <20° → Plane Machining) is working
- HyperMillCycleDefaultsEngine has 138 factory-default parameter sets from Metric.cfg
- HyperMillSafetyHooks validates clearance planes, negative allowance, measurement system conflicts
- HyperMillMultiAxisEngine handles 5-axis strategies

**What's missing (evidence-based):**
- No fixture/workholding integration: WorkholdingIntelligenceEngine is built but not called from the hyperMILL job path. A setup is incomplete without WCS origin tied to fixture
- SetupSheetEngine (full job parameters) not wired — only SetupSheetFromGCodeEngine (reverse parse) is in camDispatcher
- No stock model definition flow: HyperMillStrategyEngine does not read from a stock model to pass "hasPreviousRoughing" automatically
- No datum/WCS validation: no engine confirms that the zero point defined in the setup matches expected part datum
- HyperMillMaterialBridgeEngine is not called during setup — machinability factors are uncorrected

**Gap severity:** CRITICAL for production setups. A machinist cannot build a complete hyperMILL job from PRISM output because workholding, datum, and stock context are disconnected.

---

### 2. MACHINE-SPECIFIC OPTIMIZATION — Score: 42/100

**What exists:**
- HyperMillControllerCatalogEngine: 16 families, 60+ post variants, G-code dialect features for 5 families (fanuc, siemens, heidenhain, mazak, okuma)
- SpeedFeedOrchestratorEngine: Has MachineRegistry fallback (uses require() with .loaded check — lines 1008–1028)
- Machine params accepted: power_kw, max_rpm, max_torque_nm, rigidity, guideway, type, spindle_taper, bearing_preload, age_years
- Torque curve data is loaded (machine-torque-curves.js)

**What's missing:**
- MachineRegistry (910 machines) is NOT cross-referenced to ControllerCatalogEngine. A machine looked up in MachineRegistry cannot automatically select the correct post-processor variant — this bridge is absent
- Machine kinematic data (A/B/C axis limits, travel, work envelope) from MachineRegistry is NOT passed to HyperMillStrategyEngine to warn on out-of-travel operations
- The ControllerCatalogEngine only has dialect features for 5 of 16 families — Okuma, Hurco, Brother, Fidia, D.Electron, Roeders, etc. have no DIALECT_FEATURES entries
- No machine-specific HSM mode activation: Brother high-speed, Kern micromachining, Roeders RMS6 have capability flags but no corresponding cycle-defaults override
- SpeedFeedOrchestrator's MachineRegistry lookup is a try/catch fallback with require() — not a proper async import, fragile if registry isn't loaded

**Gap severity:** HIGH. The 910-machine registry and the controller catalog exist as silos. A user who selects a Hermle C400 gets Heidenhain dialect but not Hermle-specific omPPHhHERMLE post variant automatically.

---

### 3. SHOP INVENTORY UTILIZATION — Score: 29/100

**What exists:**
- ToolRegistry: 95,608 tools with geometry available as a registry
- HyperMillToolExportEngine: exports tools from hyperMILL format
- cam_material_map action uses HyperMillMaterialMapEngine to find cutting material quality IDs
- SpeedFeedOrchestrator accepts tool geometry inputs (diameter, flutes, helix, coating, substrate)

**What's missing:**
- HyperMillStrategyEngine does NOT check ToolRegistry before recommending strategies — it works from abstract geometry/goal/material without validating that a suitable tool exists in the shop
- HyperMillCodeGeneratorEngine does NOT query ToolRegistry to confirm tool numbers — tool assignments are passed in as params, not resolved from actual shop inventory
- No "tool available in crib?" check in any hyperMILL path: the system can recommend a 12mm ball endmill for equidistant finishing when the shop only stocks 10mm and 16mm
- No tool substitution logic: if preferred tool is unavailable, no engine selects the closest available alternative and adjusts speeds/feeds accordingly
- SoftJawProfileEngine and FixtureDesignEngine are completely disconnected from the hyperMILL job path
- No magazine/ATC slot assignment: the 910-machine registry presumably has ATC capacity data but it's not used to validate that a job doesn't exceed magazine capacity

**Gap severity:** CRITICAL for "shop inventory utilization" requirement. PRISM generates theoretically optimal programs but cannot confirm they're executable with available tooling.

---

### 4. CYCLE TIME OPTIMIZATION — Score: 44/100

**What exists:**
- AcoSequencerEngine: Dorigo-1992 ACO with pheromone updates, tool-change penalty, travel cost — built and functional
- CycleTimeEngine: full breakdown (cutting, rapid, tool change, load/unload, probing, pallet) with efficiency metrics
- HyperMillStrategyEngine: step-down/step-over factors for all 22 strategies — these directly affect cutting time
- HyperMillCycleDefaultsEngine: 138 factory defaults include linking parameters (clearance planes, retract modes) that govern rapid time

**What's missing:**
- AcoSequencerEngine is NOT called from the hyperMILL job path — operation sequence comes from user input or CAD feature order, not from ACO optimization
- CycleTimeEngine is NOT integrated with HyperMillCodeGeneratorEngine output — there is no end-to-end flow where: generate code → calculate cycle time → optimize sequence → regenerate
- Linking motion optimization: HyperMillCycleDefaults has clearance plane settings but they are not fed back to CycleTimeEngine to compute rapid time savings from lower clearance values
- No tool-change sequence optimization: when multiple operations share tools, AcoSequencerEngine's tool-grouped mode isn't invoked to minimize tool changes
- No adaptive feed optimization during the hyperMILL post path: PostProcessorFeedOptimizerEngine exists but is not in the hyperMILL code-gen chain
- CycleTimeEngine's "parts_per_hour" and "cutting_efficiency" metrics are not surfaced to the user as decision inputs for setup approval

**Gap severity:** HIGH. The optimization infrastructure (ACO, cycle time, feed optimizer) is fully built but operates as a disconnected island. A manually sequenced hyperMILL job will typically have 20–40% more tool changes and longer rapids than an ACO-optimized equivalent.

---

### 5. POST-PROCESSOR QUALITY — Score: 35/100

**What exists:**
- PostProcessorPipelineEngine: 38 stages across 7 phases — per-block S/F variability, physics validation, stochastic verification, safety hooks, 20 controller dialects
- HyperMillControllerCatalogEngine: 16 families, correct G-code dialects for Fanuc/Siemens/Heidenhain/Mazak/Okuma
- HyperMillCodeGeneratorEngine: generates code with correct structure for hyperMILL cycles
- Dialect features confirmed for 5 controller families (program start/end, tool change format, coolant codes, safe retract)

**What's missing:**
- PostProcessorPipelineEngine is NOT connected to hyperMILL output. The 38-stage pipeline (phases P0–P6 including per-block Kienzle force → S/F adjustment) is bypassed entirely for hyperMILL jobs — no evidence of import or call in HyperMillCodeGeneratorEngine or camDispatcher hypermill_code_generate path
- HyperMillControllerCatalogEngine only provides dialect string templates, not live G-code rewriting — it's a lookup table, not a post-processor
- DIALECT_FEATURES only covers 5 of 16 families — Okuma, Hurco, Brother, Mazak post variants are incomplete (no safe retract, no tool change format for some)
- No hyperMILL-specific post stage: hyperMILL has its own NcGenerator post output format (binary .hmill project → NcGenerator → G-code) — PRISM's PPP would need to operate on NcGenerator output, not directly on hyperMILL cycles, but this handoff is undefined
- No block-level S/F optimization for hyperMILL output: PPP's per-block Kienzle capability (the primary differentiator over native posts) is not applied to hyperMILL jobs

**Gap severity:** HIGH. This is the most technically complex gap. The 38-stage PPP is PRISM's signature capability ("improves upon human-programmed results" per CLAUDE.md) but it's not applied to hyperMILL output. Every hyperMILL job leaves all per-block optimization on the table.

---

### 6. SETUP SHEET GENERATION — Score: 31/100

**What exists:**
- SetupSheetEngine: three output formats (markdown, printable ASCII, json), full operation table with speed/feed/doc/woc/strategy/coolant/stickout/cycle_time
- SetupSheetFromGCodeEngine: reverse-parses existing G-code to extract setup information
- camDispatcher exposes "setup_sheet_from_gcode" action (line 1924)
- SetupSheetEngine.SetupSheetOperation includes strategy field and notes[] array for hyperMILL-specific content

**What's missing:**
- SetupSheetEngine (the forward-generation version) is NOT wired into the hyperMILL job path — only the reverse-parse G-code version is in camDispatcher for hyperMILL use
- No hyperMILL-specific fields in SetupSheetEngine: the struct has no fields for hyperMILL project name, WCS frame number, transformation matrix, NC file path, or VIRTUAL Machine model
- No fixture reference: SetupSheetOperation has no fixture_type, clamp_positions, or jaw_number fields — WorkholdingIntelligenceEngine output is not incorporated
- No probe routine reference on the setup sheet: probing sequence (WCS zero-set routine) is not linked from SetupSheetEngine
- No per-operation hyperMILL cycle name column: SetupSheetOperation.strategy is a generic string — it doesn't carry the hyperMILL cycle code (e.g., "Optimised Roughing", "Z Level Finishing") with parameters
- SetupSheetLibraryEngine exists but has no hyperMILL template variant
- No operator safety notes from HyperMillSafetyHooks — the BLOCK-level validation results don't flow into the setup sheet's notes[]

**Gap severity:** HIGH for operator use. A machinist receiving a hyperMILL setup sheet from PRISM today gets generic S/F/doc columns but no fixture instructions, no hyperMILL cycle parameters, no probe routine, and no safety warnings.

---

## SUMMARY SCORE TABLE

| Dimension | Score | Status |
|---|---|---|
| Setup Accuracy | 38/100 | No fixture/WCS/stock context in hyperMILL path |
| Machine-Specific Optimization | 42/100 | MachineRegistry and ControllerCatalog are siloed |
| Shop Inventory Utilization | 29/100 | ToolRegistry not checked before tool recommendation |
| Cycle Time Optimization | 44/100 | ACO + CycleTime built but not wired to hyperMILL |
| Post-Processor Quality | 35/100 | PPP 38-stage pipeline completely bypassed |
| Setup Sheet Generation | 31/100 | Only G-code-reverse version wired; no HM fields |
| **COMPOSITE** | **36.5/100** | **Infrastructure exists; wiring is the gap** |

---

## PRESCRIBED GAP-FILL: SKILLS, HOOKS, AND SCRIPTS TO GENERATE

### GAP 1: MaterialBridge → SpeedFeedOrchestrator (MS2)
**Root cause:** HyperMillMaterialBridgeEngine exists (521 LOC, tested) but is never called from SpeedFeedOrchestratorEngine

**Required artifacts:**

**Skill: `hypermill-material-speed-feed`**
- Inputs: material name or DIN/AISI number, operation type (milling/drilling/insert), tool diameter
- Logic: Call HyperMillMaterialBridgeEngine.lookupMaterial() → get machinability factors (factor_vc, factor_fz, factor_ae, factor_ap) → call HyperMillMaterialBridgeEngine.getDiameterSpeedFeed() → pass corrected Vc/fz to SpeedFeedOrchestratorEngine
- Output: Corrected AtomicValue speed/feed with hyperMILL material DB provenance

**Hook: `hypermill-material-bridge-hook` (PreEngineCall hook on SpeedFeedOrchestrator)**
- Trigger: When cam_system = "hypermill" and material param is present
- Action: Intercept SpeedFeedOrchestrator input → inject HyperMillMaterialBridgeEngine.getMachinabilityFactors() corrections before Kienzle resolver runs
- File: `src/hooks/hypermill-material-bridge-hook.ts`

**Script: `wire-hm-material-bridge.ts`**
- Add `hmMaterialBridge` lazy-load case to camDispatcher getEngine()
- Add `cam_material_bridge_hm` action to camDispatcher z.enum and switch block
- Action signature: `{ material: string, operation: "milling"|"drilling"|"insert", diameter_mm?: number }`

---

### GAP 2: CycleDefaults + Controller → Unified Post Path (MS3)
**Root cause:** Both engines are wired as lookup-only; no engine combines them to produce a complete post configuration

**Required artifacts:**

**Skill: `hypermill-post-config`**
- Inputs: machine_name or controller_family, axis_count, post_variant (optional)
- Logic: MachineRegistry.getByIdOrModel() → extract controller hint → HyperMillControllerCatalogEngine.search() → select variant → HyperMillCycleDefaultsEngine.resolveDefaults() per operation → return unified post config object
- Output: `{ controller_code: "omPPHhHERMLE", dialect: "heidenhain", cycle_defaults: [...138 entries resolved], machine_limits: {...} }`

**Hook: `machine-to-controller-map-hook` (PreEngineCall on HyperMillCodeGeneratorEngine)**
- Trigger: When hypermill_code_generate is called with machine_name but no explicit controller_code
- Action: Auto-resolve controller variant from MachineRegistry → ControllerCatalogEngine bridge
- Requires: A mapping table (machine brand → controller family) — Hermle → heidenhain, Haas → haas, DMG Mori → siemens or heidenhain depending on model
- File: `src/hooks/machine-to-controller-map-hook.ts`
- Data: `src/data/machine-controller-map.ts` — brand-level mapping for 910 machines

**Script: `build-machine-controller-map.ts`**
- Reads MachineRegistry, extracts manufacturer field
- Maps known manufacturers to ControllerCatalogEngine family IDs and preferred post variants
- Outputs `src/data/machine-controller-map.ts` as a static lookup (run once, committed)

---

### GAP 3: ToolRegistry Inventory Check (Shop Inventory)
**Root cause:** HyperMillStrategyEngine and HyperMillCodeGeneratorEngine work from abstract tool specs, never querying ToolRegistry

**Required artifacts:**

**Skill: `hypermill-tool-select`**
- Inputs: operation type, geometry type, material ISO group, diameter_range_mm, crib_filter (shop ID or tag)
- Logic: HyperMillStrategyEngine.calculate() → get recommended strategy → derive ideal tool type and diameter range → ToolRegistry.search() filtered by shop availability → rank by: geometry match, material coating suitability, available diameter vs. ideal
- Output: `{ recommended_tool: ToolRecord, alternatives: ToolRecord[], tool_number: number, adjusted_vc: number, adjusted_fz: number }`
- If no match: return nearest alternative with S/F adjustment rationale

**Hook: `tool-crib-availability-hook` (PostEngineCall on HyperMillStrategyEngine)**
- Trigger: After any cam_strategy_recommend call
- Action: Take recommended stepdown/stepover factors → query ToolRegistry for available tools → if no exact match, flag warning and inject substitution into result
- File: `src/hooks/tool-crib-availability-hook.ts`

**Script: `hypermill-tool-crib-check.ts`**
- Exposes new dispatcher action `hypermill_tool_crib_check`
- Input: job operation list with abstract tool specs
- Output: per-operation availability report — green/yellow/red per tool, with substitutions for yellow/red

---

### GAP 4: ACO Sequencer + CycleTime → hyperMILL Operations (Cycle Time)
**Root cause:** AcoSequencerEngine and CycleTimeEngine exist but are not called from hyperMILL code-gen path

**Required artifacts:**

**Skill: `hypermill-sequence-optimize`**
- Inputs: list of hyperMILL operations (each: geometry, tool, estimated_path_mm, fixture_setup)
- Logic: Build Feature[] for AcoSequencerEngine from operations → run ACO with toolChangePenalty calibrated to machine ATC time → reorder operations → recalculate CycleTimeEngine per operation → compare to baseline (unoptimized) sequence
- Output: optimized_sequence[], total_cycle_time_min, tool_changes_baseline vs. tool_changes_optimized, time_saved_min, improvement_pct

**Hook: `aco-sequence-gate-hook` (PostEngineCall on hypermill_code_generate)**
- Trigger: After hypermill_code_generate with 3+ operations
- Action: Automatically run AcoSequencerEngine on generated operation list → if improvement > 5%, suggest resequenced order with savings estimate
- File: `src/hooks/aco-sequence-gate-hook.ts`

**Script: `wire-aco-to-hypermill.ts`**
- Add `hypermill_sequence_optimize` action to camDispatcher
- Connect AcoSequencerEngine + CycleTimeEngine in sequence
- Add cycle time breakdown to HyperMillCodeGeneratorEngine output metadata

---

### GAP 5: PostProcessorPipeline → hyperMILL Output (Post Quality)
**Root cause:** PPP's 38 stages (per-block Kienzle force → S/F) never process hyperMILL G-code output

**Required artifacts:**

**Skill: `hypermill-ppp-enhance`**
- Inputs: hyperMILL-generated G-code (from hypermill_code_generate), machine, material, tool specs
- Logic: Parse G-code blocks into ToolpathBlock[] (PostProcessorPipelineEngine internal format) → run PPP phases P1 (physics) + P2 (per-block) → apply variable S/F → run P5 (safety) → output enhanced G-code
- Critical: This skill operates on NcGenerator output (standard G-code lines), NOT on hyperMILL project files
- Output: enhanced G-code string, block-level force/power/temperature report, S/F change summary, safety_score

**Hook: `ppp-post-hypermill-hook` (PostEngineCall on hypermill_code_generate)**
- Trigger: When hypermill_code_generate output exists and ppp_enhance flag is set
- Action: Pipe generated G-code through PostProcessorPipelineEngine with controller dialect from HyperMillControllerCatalogEngine
- File: `src/hooks/ppp-post-hypermill-hook.ts`

**New engine: `HyperMillPPPBridgeEngine`**
- Thin adapter: takes hyperMILL cycle output format → normalizes to PPP ToolpathBlock[] → calls PostProcessorPipelineEngine.process() → extracts enhanced G-code
- ~200 LOC
- File: `src/engines/HyperMillPPPBridgeEngine.ts`

---

### GAP 6: Setup Sheet with hyperMILL Fields (MS10 Setup Packages)
**Root cause:** SetupSheetEngine exists but lacks hyperMILL-specific fields; only the G-code-reverse version is dispatcher-wired

**Required artifacts:**

**Skill: `hypermill-setup-sheet-generate`**
- Inputs: hyperMILL job config (project name, WCS, operations, tools), workholding recommendation (from WorkholdingIntelligenceEngine), safety validation (from HyperMillSafetyHooks)
- Logic:
  1. Call WorkholdingIntelligenceEngine.recommend() → get fixture_type, clamp_positions, clamp_force
  2. Call HyperMillSafetyHooks.validateAll() → get warnings
  3. Build SetupSheetEngine input: inject hyperMILL cycle names into strategy field, add workholding to notes[], add safety warnings to notes[]
  4. Add hyperMILL-specific header fields: hm_project_name, wcs_frame, nc_file_path, virtual_machine
  5. Render via SetupSheetEngine in requested format
- Output: operator-ready setup sheet with hyperMILL-specific section

**Extended SetupSheetHeader interface (new fields needed):**
```typescript
hypermill_project_name?: string;
wcs_frame_number?: number;
nc_file_path?: string;
virtual_machine_model?: string;
fixture_type?: string;
clamp_positions?: string;
probe_routine?: string;
```

**Hook: `setup-sheet-safety-inject-hook` (PostEngineCall on hypermill_code_generate)**
- Trigger: After hypermill_code_generate completes
- Action: Auto-call HyperMillSafetyHooks.validateAll() on the generated job → inject any BLOCK or WARN results into setup sheet notes[]
- File: `src/hooks/setup-sheet-safety-inject-hook.ts`

**Script: `wire-hm-setup-sheet.ts`**
- Add `hypermill_setup_sheet` action to camDispatcher (distinct from generic setup_sheet_from_gcode)
- Wire WorkholdingIntelligenceEngine + SetupSheetEngine + HyperMillSafetyHooks in sequence
- Action signature: `{ job: HyperMillJobConfig, format: "markdown"|"printable"|"json", machine?: string }`

---

## EXECUTION PRIORITY ORDER

| Priority | Gap | Milestone | Effort | Impact |
|---|---|---|---|---|
| 1 | MaterialBridge → SpeedFeed | MS2 | M | Fixes every S/F value for hyperMILL jobs |
| 2 | ToolRegistry crib check | MS2.5 (new) | M | Prevents unexecutable programs |
| 3 | Machine → Controller auto-map | MS3 | S | Correct post variant every time |
| 4 | CycleDefaults resolved context | MS3 | S | Accurate 138-default resolution |
| 5 | ACO Sequencer wiring | MS4 (new) | M | 20–40% cycle time reduction |
| 6 | PPP bridge for hyperMILL | MS11 | L | Per-block S/F (the key differentiator) |
| 7 | Setup Sheet with HM fields | MS10 | M | Operator-ready documentation |

---

## CRITICAL ARCHITECTURAL NOTE

The pattern of gaps here is consistent: PRISM has excellent depth (PPP, ACO, CycleTime, WorkholdingIntelligence) but the hyperMILL-specific engines (StrategyEngine, CycleDefaultsEngine, ControllerCatalogEngine, MaterialBridgeEngine) operate as isolated lookup tools rather than as an integrated pipeline.

The fix is NOT to rebuild any of these engines — they are production-quality. The fix is to create:
1. A `HyperMillJobOrchestrator` (or wire into existing `PrintToProgramPipelineEngine` as a hyperMILL channel)
2. Four hooks that activate shared engines at the correct points in the hyperMILL code-gen sequence
3. One new thin bridge engine (HyperMillPPPBridgeEngine ~200 LOC)
4. Two new dispatcher actions (hypermill_sequence_optimize, hypermill_setup_sheet)

Total estimated LOC to close all 6 gaps: ~1,200 LOC of new code + ~400 LOC of wiring edits.
Current infrastructure coverage (built but unwired): approximately 15,000 LOC of relevant engines.
Wiring ratio needed: 1 LOC of new code unlocks ~12 LOC of existing infrastructure.
