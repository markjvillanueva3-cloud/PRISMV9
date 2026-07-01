# Machine Handbook Intelligence Roadmap — Plan

## Context

PRISM has 910 machines across 20+ controller dialects but almost no structured handbook data. Machine handbooks contain critical operational intelligence: spindle specs, kinematics, controller features, alarm codes with root causes, parts books with OEM part numbers, maintenance schedules, programming tips, and safety limits. This data is currently locked in PDF manuals scattered across shops.

The goal is to build a systematic pipeline that:
1. **Gathers** manufacturer handbooks (PDF manuals, training books, parts catalogs) for all 910 machines
2. **Extracts** structured data using the existing DocumentLearning pipeline (70% reusable)
3. **Stores** data in a queryable MachineHandbookRegistry tied to the MachineRegistry
4. **Wires** handbook data into all 9 manufacturing pipelines + alarm diagnostics + quoting + scheduling
5. **Generates** skills, hooks, engines, and scripts to operationalize the data

## Existing Infrastructure (REUSE)

| Component | Path | Reuse |
|-----------|------|-------|
| DocumentLearningDispatcher | src/tools/dispatchers/documentLearningDispatcher.ts | Upload + extract + ingest |
| Python extraction pipeline | cad-engine/src/extraction/ | PDF parse, chunk, classify, validate |
| TribalKnowledgeEngine | src/engines/TribalKnowledgeEngine.ts | Store + search tips |
| VideoLearningEngine | src/engines/VideoLearningEngine.ts | Training video ingestion |
| AlarmDiagnosticsEngine | src/engines/AlarmDiagnosticsEngine.ts | Alarm code database |
| MachineRegistry | src/registries/ | 910 machines, needs handbook links |
| PostProcessorPipelineEngine | src/engines/PostProcessorPipelineEngine.ts | 20 controller dialects |
| SpindleTorqueCurveEngine | src/engines/SpindleTorqueCurveEngine.ts | Torque data |
| machine-torque-curves.ts | src/data/machine-torque-curves.ts | Existing torque data |
| machine-spindle-corrections.ts | src/data/machine-spindle-corrections.ts | Spindle compensation |

## Roadmap: HBK (Handbook Intelligence)

### Track: HBK — Machine Handbook Intelligence Pipeline
### Milestones: 12 | Sessions: ~20-30 | Phases: 4

---

### PHASE 1: FOUNDATION (HBK-MS0 through HBK-MS2)
*Build the handbook data model, extraction pipeline, and storage*

#### HBK-MS0: Handbook Data Model + Registry Schema
**Effort:** ~3 sessions | **Priority:** P0 (everything depends on this)

- U01: Design `MachineHandbook` TypeScript interface
  - Sections: cover_info, spindle_specs, axis_kinematics, controller_features, alarm_codes, maintenance_schedule, parts_book, programming_tips, safety_limits, coolant_specs, tooling_constraints
  - Each section typed with source provenance (page number, confidence, extraction method)
- U02: Create `MachineHandbookRegistry` (extends BaseRegistry pattern)
  - CRUD operations, search by machine_id/manufacturer/controller/section
  - Persists to `data/machine-handbooks/` directory (one JSON per machine family)
  - Links to MachineRegistry via machine_id foreign key
- U03: Create `HandbookSectionSchema` Zod schemas for each section type
  - SpindleSpec: max_rpm, min_rpm, taper_type, bearing_type, warmup_procedure, torque_curve_ref
  - AxisKinematics: axes[], travel_mm, rapid_mm_min, accel_g, resolution_um, backlash_um
  - ControllerFeatures: macros_supported, custom_codes, conversational_mode, probing_cycles, tool_management
  - AlarmCode: code, severity, description, probable_causes[], corrective_actions[], parts_needed[]
  - PartsBookEntry: oem_part_number, description, category, replacement_interval, vendor, cross_references[]
  - MaintenanceSchedule: interval_hours, task, procedure_steps[], parts_needed[], safety_warnings[]
  - ProgrammingTip: topic, code_example, controller_dialect, gotchas[], related_alarms[]
  - SafetyLimit: parameter, min_value, max_value, unit, consequence_of_violation
  - CoolantSpec: type, concentration_pct, pressure_bar, flow_lpm, filtration_um
  - ToolingConstraint: max_tool_diameter_mm, max_tool_length_mm, max_tool_weight_kg, magazine_capacity, tool_change_time_sec

**Exit:** Schema compiles, registry CRUD tested, 1 sample handbook entry loads

#### HBK-MS1: Handbook Extraction Engine
**Effort:** ~4 sessions | **Priority:** P0

- U01: Create `HandbookExtractionEngine.ts` (~800 LOC)
  - Extends Python extraction pipeline with handbook-specific extractors
  - Detects handbook structure: chapter > section > subsection > procedure
  - Extracts tables (alarm code tables, parts lists, maintenance schedules)
  - Parses parameter specifications (RPM ranges, axis travels, load limits)
  - Handles multi-format: PDF pages, scanned images (OCR), HTML online manuals
- U02: Create `handbook_extractor.py` in cad-engine/src/extraction/
  - Page classifier: TOC page, spec page, alarm table, parts list, wiring diagram, procedure page
  - Table extractor: structured tables with headers/rows/units detection
  - Parameter extractor: regex patterns for "Max RPM: 12,000" style specs
  - Alarm extractor: code-description-cause-action table parser
  - Parts extractor: part_number-description-quantity BOM parser
- U03: Create `handbook_validator.py`
  - Cross-validate extracted spindle specs against existing MachineRegistry data
  - Flag extraction confidence < 0.70 for human review
  - Validate alarm codes against existing AlarmDiagnosticsEngine database
  - Check dimensional units consistency (metric vs imperial detection)
- U04: Wire HandbookExtractionEngine into DocumentLearningDispatcher
  - New action: `handbook_ingest` — accepts PDF + machine_id, runs handbook-specific pipeline
  - Auto-detects handbook vs general document via page classification
  - Routes extracted sections to appropriate registries

**Exit:** Can ingest a Haas VF-2 manual PDF and extract spindle specs, alarm codes, and parts list with >70% accuracy

#### HBK-MS2: Handbook Acquisition Pipeline
**Effort:** ~3 sessions | **Priority:** P1

- U01: Create `HandbookAcquisitionEngine.ts` (~500 LOC)
  - Manufacturer URL database for online manuals (Haas, Mazak, DMG MORI, Okuma, Fanuc, Siemens, etc.)
  - Web scraper for publicly available manuals (respect robots.txt)
  - Manual upload workflow for shop-owned PDFs
  - Progress tracker: which machines have handbooks, which need them
- U02: Create handbook acquisition script (`scripts/acquire-handbooks.ts`)
  - Batch download from manufacturer portals
  - Organize by manufacturer/model/year
  - Generate acquisition status report per machine in registry
- U03: Create `/handbook-status` skill
  - Shows: X/910 machines have handbooks, breakdown by manufacturer
  - Lists machines with highest ROI for handbook acquisition (most used, most alarms)
  - Prioritizes by: user's machines first, then common machines, then rare

**Exit:** At least 20 handbooks ingested (covering user's actual machines), status dashboard working

---

### PHASE 2: KNOWLEDGE ENGINES (HBK-MS3 through HBK-MS6)
*Build domain-specific engines that consume handbook data*

#### HBK-MS3: Alarm Intelligence Engine Enhancement
**Effort:** ~3 sessions

- U01: Extend AlarmDiagnosticsEngine with handbook-sourced alarm codes
  - Merge handbook alarm tables into existing alarm database
  - Add: probable_causes[], corrective_actions[], parts_needed[], estimated_downtime_min
  - Priority by manufacturer: Fanuc (most common), Siemens, Haas, Mazak, Okuma, Mitsubishi
- U02: Create `AlarmTroubleshootingFlowEngine.ts` (~600 LOC)
  - Decision tree from handbook troubleshooting procedures
  - Step-by-step guided diagnosis with yes/no branching
  - Links to parts book for replacement parts needed at each step
  - Tracks resolution history for pattern detection
- U03: Wire into AlarmDiagnosticsEngine consumer pipeline
  - When alarm looked up: return handbook page reference, troubleshooting flow, parts needed
  - Feed alarm resolutions back as tribal knowledge tips

**Exit:** Alarm lookup returns handbook-sourced troubleshooting steps + parts list for top 50 alarm codes

#### HBK-MS4: Machine Capability Intelligence
**Effort:** ~3 sessions

- U01: Create `MachineCapabilityEngine.ts` (~700 LOC)
  - Queries handbook registry for machine-specific limits
  - Returns: max RPM by gear range, axis rapids, tool magazine capacity, max tool dimensions
  - Validates requested parameters against handbook limits (not just registry estimates)
  - Generates machine capability report card
- U02: Enhance SpindleTorqueCurveEngine with handbook torque data
  - Extract torque curves from handbook performance charts
  - Digitize torque-vs-RPM graphs from PDF images (Claude Vision)
  - Merge with existing machine-torque-curves.ts data
- U03: Create `MachineKinematicsEngine.ts` (~500 LOC)
  - Full kinematic model from handbook axis specs
  - Axis acceleration profiles, jerk limits, servo tuning parameters
  - Work envelope computation from axis travels
  - Simultaneous axis move optimization (knows which axes can interpolate)

**Exit:** Machine capability queries return handbook-verified specs for 20+ machines

#### HBK-MS5: Parts Book + Maintenance Intelligence
**Effort:** ~3 sessions

- U01: Create `PartsBookEngine.ts` (~500 LOC)
  - Search parts by: OEM part number, description, machine, category
  - Cross-reference equivalent parts across manufacturers
  - Track replacement intervals from maintenance schedules
  - Generate purchase orders with OEM part numbers + quantities
- U02: Create `MaintenanceScheduleEngine.ts` (~500 LOC)
  - Generates maintenance calendar from handbook schedules
  - Tracks hours/cycles for interval-based maintenance
  - Alerts for upcoming maintenance based on usage patterns
  - Links maintenance tasks to required parts from PartsBookEngine
- U03: Wire into business dispatchers
  - PurchaseOrder integration: auto-populate part numbers from handbook
  - MaintenanceSchedule → job scheduling: block machine time for PM
  - Parts inventory: suggest reorder levels from maintenance frequency

**Exit:** Can generate maintenance schedule + parts order for any ingested machine

#### HBK-MS6: Controller Programming Intelligence
**Effort:** ~3 sessions

- U01: Create `ControllerProgrammingGuideEngine.ts` (~600 LOC)
  - Handbook-sourced programming tips per controller dialect
  - Custom G/M code reference (controller-specific codes not in standard)
  - Macro programming patterns (Fanuc custom macro B, Siemens PROC, etc.)
  - Probing cycle documentation from handbooks
- U02: Enhance PostProcessorPipelineEngine with handbook controller features
  - Use handbook to know which G-codes a specific machine actually supports
  - Avoid generating code that the machine's controller version doesn't have
  - Controller firmware version awareness (feature matrix by version)
- U03: Wire into post-processing and program validation
  - Program validation: check G-code against machine's actual feature set
  - Post-processor: generate only codes the target machine supports
  - Programming tips: surface relevant handbook tips in program generation output

**Exit:** Post-processor uses handbook data to validate controller feature compatibility

---

### PHASE 3: PIPELINE INTEGRATION (HBK-MS7 through HBK-MS9)
*Wire handbook data into all 9 manufacturing pipelines*

#### HBK-MS7: Physics Pipeline Handbook Integration
**Effort:** ~3 sessions

- U01: Wire handbook spindle specs into SpeedFeedOrchestratorEngine
  - Use actual max RPM from handbook (not estimated), actual power curve
  - Gear change points from handbook for optimal gear selection
  - Spindle bearing load limits from handbook for force validation
- U02: Wire handbook axis specs into toolpath generation
  - Actual rapid rates for cycle time estimation
  - Acceleration limits for corner velocity optimization
  - Work envelope for collision checking
- U03: Wire handbook coolant specs into CoolantStrategyEngine
  - Required coolant type/pressure from handbook
  - Through-spindle coolant capabilities and limits
  - Flood vs mist vs MQL capabilities per machine

**Exit:** Speed/feed calculations use handbook-verified machine limits

#### HBK-MS8: Business Pipeline Handbook Integration
**Effort:** ~2 sessions

- U01: Wire maintenance costs into QuoteToShipOrchestratorEngine
  - Factor machine maintenance intervals into capacity planning
  - Include consumable costs from parts book in quoting
  - Machine-specific setup time estimates from handbook
- U02: Wire parts book into inventory and purchasing
  - Auto-suggest stock replenishment for handbook-defined consumables
  - Spare parts inventory optimization based on maintenance schedule
  - Vendor cross-reference for competitive parts sourcing

**Exit:** Quotes include handbook-based machine costs, maintenance factored into scheduling

#### HBK-MS9: Safety + Quality Pipeline Integration
**Effort:** ~2 sessions

- U01: Wire handbook safety limits into SafetyQualityHooks
  - Hard-block parameters that exceed handbook maximum ratings
  - Machine-specific safety interlocks from handbook
  - Required PPE and safety procedures per machine/operation
- U02: Wire handbook into quality planning
  - Machine-specific accuracy specs for tolerance allocation
  - Positioning repeatability from handbook for process capability
  - Thermal compensation procedures from handbook

**Exit:** Safety hooks enforce handbook-specified machine limits

---

### PHASE 4: SKILLS + HOOKS + AUTOMATION (HBK-MS10 through HBK-MS11)
*User-facing skills, protective hooks, and automation*

#### HBK-MS10: Skills + Scripts + Hooks
**Effort:** ~2 sessions

- U01: Skills (7 new slash commands)
  - `/handbook-ingest` — Upload and process a machine handbook PDF
  - `/handbook-search <query>` — Search across all ingested handbooks
  - `/machine-specs <machine>` — Show handbook-verified machine specifications
  - `/alarm-guide <code> <controller>` — Handbook troubleshooting for alarm code
  - `/parts-lookup <part_number>` — Find OEM parts across handbooks
  - `/maintenance-due <machine>` — Show upcoming maintenance from handbook schedule
  - `/controller-guide <controller> <topic>` — Programming reference from handbook
- U02: Hooks (4 new enforcement hooks)
  - `enforce-handbook-machine-limits` — Block S/F exceeding handbook spindle max
  - `enforce-handbook-tool-limits` — Block tool dimensions exceeding magazine specs
  - `enforce-maintenance-due` — Warn when machine is past maintenance interval
  - `enforce-controller-feature` — Warn when generating unsupported G-codes
- U03: Scripts (3 automation scripts)
  - `scripts/handbook-batch-ingest.ts` — Batch process all PDFs in a directory
  - `scripts/handbook-coverage-report.ts` — Generate coverage report (machines with/without handbooks)
  - `scripts/handbook-alarm-merge.ts` — Merge handbook alarms into AlarmDiagnosticsEngine

**Exit:** All skills, hooks, scripts created and tested

#### HBK-MS11: Consumer Matrix + SVI Integration
**Effort:** ~2 sessions

- U01: Update SVI to include handbook coverage dimension
  - New SVI subsystem: Handbooks (entities=910, dims=10 sections, wired_pct tracks coverage)
  - Psi increases as more machines get handbook data
- U02: Create handbook consumer matrix (like TK consumer matrix)
  - Track which engines consume handbook data
  - Document wiring status per engine per handbook section
- U03: End-to-end validation
  - Pick 3 real machines (user's machines), run full pipeline with handbook data
  - Verify: quote accuracy, alarm troubleshooting, maintenance scheduling, program validation
  - Compare before/after handbook data quality metrics

**Exit:** SVI updated, consumer matrix complete, 3 end-to-end validated machines

---

## Verification Plan

1. **Build:** `npx tsc --noEmit` — 0 errors after each milestone
2. **Tests:** Each new engine gets companion test file, run with `npx vitest run`
3. **Integration test:** Ingest a real Haas VF-2 manual, verify:
   - Alarm code lookup returns handbook data
   - Speed/feed calc respects handbook spindle limits
   - Parts lookup returns OEM part numbers
   - Maintenance schedule generates correctly
4. **SVI check:** Psi should increase as handbook coverage grows
5. **/prism-review:** Run after each milestone for multi-role scrutiny

## Critical Files to Create/Modify

**New engines (7):**
- `src/engines/MachineHandbookRegistryEngine.ts`
- `src/engines/HandbookExtractionEngine.ts`
- `src/engines/HandbookAcquisitionEngine.ts`
- `src/engines/AlarmTroubleshootingFlowEngine.ts`
- `src/engines/MachineCapabilityEngine.ts`
- `src/engines/PartsBookEngine.ts`
- `src/engines/MaintenanceScheduleEngine.ts`

**New Python extractors (3):**
- `cad-engine/src/extraction/handbook_extractor.py`
- `cad-engine/src/extraction/handbook_classifier.py`
- `cad-engine/src/extraction/handbook_validator.py`

**Modified engines (8):**
- `src/engines/AlarmDiagnosticsEngine.ts` — handbook alarm merge
- `src/engines/SpeedFeedOrchestratorEngine.ts` — handbook machine limits
- `src/engines/SpindleTorqueCurveEngine.ts` — handbook torque data
- `src/engines/PostProcessorPipelineEngine.ts` — controller feature validation
- `src/engines/CoolantStrategyEngine.ts` — handbook coolant specs
- `src/engines/QuoteToShipOrchestratorEngine.ts` — maintenance cost factors
- `src/engines/SystemVariabilityIndexEngine.ts` — handbook SVI dimension
- `src/tools/dispatchers/documentLearningDispatcher.ts` — handbook_ingest action

**New data directories:**
- `data/machine-handbooks/` — structured handbook JSON per machine family
- `data/handbook-sources/` — raw PDF storage with provenance metadata

**New skills (7), hooks (4), scripts (3)** as listed in HBK-MS10.
