# POST PROCESSOR MAXIMIZATION ROADMAP
## PP-MS0 through PP-MS11 | 12 Milestones | 48 Units | 26 Sessions (20 critical path) | Est. 40-52 Session-Hours

> **🗄️ ARCHIVED (2026-04-17) — SUPERSEDED BY MASTER ROADMAP**
>
> PP-MS0 through PP-MS11 were redistributed across Stages 1–10 of the master pipeline.
> **Current canonical roadmap:** `H:/prism/PP-MASTER-UNIFIED-ROADMAP-2026-04-16.md` (v1.1).
>
> Redistribution record: PP-MASTER §XXIII.2
>   • PP-MS0 → Stage 1 (Kienzle canonical)
>   • PP-MS1–MS3 → Stage 3 + Stage 7 (CPS parser, fingerprinting, UI)
>   • PP-MS4 → Stage 7 (before/after preview)
>   • PP-MS5 → Stage 8 (prove-out)
>   • PP-MS6 → Stage 7 (library)
>   • PP-MS7–MS8 → Stage 8 (coolant/probing/non-traditional)
>   • PP-MS9 → Stage 8 (integration)
>   • PP-MS10–MS11 → Stage 9 + Stage 10 (product page, launch)

**Authority (historical):** This roadmap governed all post processor product development.
**Owner:** Claude (backend + frontend) | Codex (frontend assist)
**Target:** User-driven post generation — machine make/model/year/controller/features → physics-optimized G-code

---

## MCP FULL UTILIZATION PROTOCOL (MANDATORY — applies to EVERY session)

SESSION START:  prism_session:context_boot -> dispatcher_map -> memory_recall -> system_snapshot -> action_search "<goal>"
DURING WORK:    prism_session:auto_checkpoint (every 5-10 calls) -> action_search -> tool_route_best -> wip_capture
SESSION END:    prism_session:memory_save -> system_snapshot -> checkpoint_enhanced
PLUGINS:        mcp__vitest__run_tests | mcp__eslint__lint-files | codebase-memory-mcp search_graph
FEATURE CASCADE: Read SESSION_ARTIFACTS.json at start -> write via PostCompact hook at end
CONTEXT RETAIN: .compaction-survival.md + HANDOFF.md + SVI-compact.md + MEMORY.md (all auto-synced)

## ENFORCEMENT & KNOWLEDGE PROTOCOL

ENFORCEMENT HOOKS (fire automatically):
  - review-gate.sh: BLOCKS edits after 3 engine changes without /prism-review
  - enforce-auto-compact.py: WARN@15, URGENT@25, BLOCK@35 edits
  - PostToolUse stub detector: BLOCKS stub returns in engines
  - enforce-constants-check.py: BLOCKS inline kc1.1/Taylor constants

EDIT COUNT DEFINITION:
  - Scope: per-session, resets on /compact or /prism-review completion
  - Counted: net file writes to src/engines/, src/tools/dispatchers/, src/routes/
  - NOT counted: tests, comments-only, whitespace-only, web/ components
  - Tracked by: session-edit-counter.json (auto-updated by PreToolUse hook)

ENFORCEMENT REMEDIATION (when a hook blocks you):
  - review-gate.sh → run /prism-review, fix all CRIT+HIGH+MED findings, counter resets on completion
  - enforce-auto-compact.py → run /compact, wait for HANDOFF.md write, resume from RESUME line
  - stub detector → replace stub with real implementation (see ENGINE_DIGEST.md for patterns)
  - enforce-constants-check.py → import from src/physics/constants.ts, never inline values

SKILLS TO USE:
  /forge-engines, /forge-wiring, /prism-review, /test, /physics-verify,
  /program-validate, /calibrate, /playbook, /scrutinize, /trace,
  /forge-triple, /action-search, /action-help, /navigate, /cps-analyze

---

## EXISTING ASSET LEVERAGE TABLE

| Asset | Count | Location | Leverage |
|-------|-------|----------|----------|
| Post engines | 36 | src/engines/*Post*.ts, *Controller*.ts | Wire, don't rebuild |
| Post actions | 61 | prism_cam (38) + prism_product (11) + prism_calc (12) | Route through existing actions |
| PPG routes | 8 | src/routes/ppg.ts | Extend, don't replace |
| Controller dialects | 20 | ControllerDialectEngine.ts | Add Swiss, extend existing |
| Machine profiles | 232+ | src/data/machine-profiles-catalog.ts | Map to post configs |
| CPS files | 180+ | C:\PRISM\BOX\FUSION BASIC POSTS\ | Parse properties → PRISM dialect |
| Controller knowledge | 17+ | src/data/controller-knowledge.json | Feed into feature matrix |
| CAM environments | 47 | web/src/data/calculatorWorkspace.ts | Cross-reference for cross-CAM |
| PPG frontend | 2112 LOC | web/src/pages/PostProcessorGeneratorPage.tsx | Extend with machine selection |
| PP product page | 701 LOC | web/src/pages/PostProcessorPage.tsx | Marketing surface |

---

# PHASE 1: FOUNDATION HARDENING (PP-MS0 — PP-MS1)
**Goal:** Fix canonical constant violations, add missing dialects, harden the pipeline.

## PP-MS0: Pipeline Physics Hardening
**Sessions: 2 | Units: 4 | Priority: CRITICAL | DEPENDS_ON: none (ROOT)**

PostProcessorPipelineEngine uses inlined DEFAULT_KC1_1 constants (P=2000) that disagree with canonical constants.ts (P=1800). Every force calculation in the physics injection phase produces incorrect results. This MUST be fixed before any other work.

### SESSION PP-MS0-1: Fix Canonical Constants + Add Missing Dialects
**SMART CONFIG:** role=R2-Engine | model=opus | effort=max | context_budget=80K

**U-PP01: Fix PostProcessorPipelineEngine canonical constants**
- Read PostProcessorPipelineEngine.ts, find DEFAULT_KC1_1 and DEFAULT_MC inline constants
- Replace with import from src/physics/constants.ts (CANONICAL_KIENZLE)
- Verify ALL 6 ISO groups match canonical values:
  - P(Steel)=1800 (was 2000, -10%), M(Stainless)=2100 (was 2400, -12.5%)
  - K(Cast Iron)=1100 (was 1200, -8.3%), N(Aluminum)=700 (was 800, -12.5%)
  - S(Superalloy)=2800 (already matches), H(Hardened)=3200 (was 3500, -8.6%)
- Document WHY pipeline used higher values (possible tuning constant — check git blame)
- Test force calculation convergence: run 5 representative materials, verify <=15% delta
- Run affected tests: npx vitest run PostProcessorPipeline
- FILES_MODIFIED: [PostProcessorPipelineEngine.ts]
- ABORT_CRITERIA: [any test failure, force delta >15% from expected, import cycle]
- ROLLBACK: git checkout src/engines/PostProcessorPipelineEngine.ts

**U-PP02: Add Citizen Cincom Swiss dialect to ControllerDialectEngine**
- Add 'citizen_cincom' to ControllerFamily type union and DIALECTS constant
- Define Citizen-specific M-codes:
  - Sub-spindle handoff: M222 (engage), M223 (release)
  - Guide bushing: M70/M71 (engage/retract)
  - LFV (Low Frequency Vibration): M131 (on), M132 (off)
  - Turret sync: M10/M11 (main), M12/M13 (sub-spindle)
  - Part catcher: M55 (open), M56 (close)
  - Thread whirling: M52/M53
- Extend ControllerFeatureSet interface with: sub_spindle?, guide_bushing?, part_catcher?, thread_whirling?
- Include program_start/end, sub_program_call/return, work_offset, tool_change patterns
- Reference: C:\PRISM\BOX\FUSION BASIC POSTS\ for Citizen-specific CPS if available
- Run tests: npx vitest run ControllerDialect
- FILES_MODIFIED: [ControllerDialectEngine.ts]
- ABORT_CRITERIA: [test failure, missing M-code definition, type error in ControllerFamily union]
- ROLLBACK: git checkout src/engines/ControllerDialectEngine.ts

**U-PP03: Add Star Swiss dialect to ControllerDialectEngine**
- Add 'star_fanuc' dialect with Star-specific sync codes, gang+turret patterns
- Include sub-spindle handoff, thread whirling, sliding head sync M-codes
- Ensure ALIAS_MAP includes common Star model names
- FILES_MODIFIED: [ControllerDialectEngine.ts]
- ABORT_CRITERIA: [test failure, dialect ID collision, missing sync code definition]
- ROLLBACK: git checkout src/engines/ControllerDialectEngine.ts

**U-PP04: Add DMG MORI CELOS and Hurco MAX5 dialects**
- Add 'dmg_celos_siemens' and 'dmg_celos_fanuc' variants (CELOS wraps both)
- Add 'hurco_max5' with UltiMotion, WinMax conversational patterns
- Update ALIAS_MAP for common model name variations
- FILES_MODIFIED: [ControllerDialectEngine.ts]
- ABORT_CRITERIA: [test failure, CELOS variant detection logic error, alias collision]
- ROLLBACK: git checkout src/engines/ControllerDialectEngine.ts

**EXIT GATE PP-MS0-1:**
- [ ] Zero inline kc1.1/Taylor constants in PostProcessorPipelineEngine (grep verification)
- [ ] ControllerDialectEngine has 24+ dialects (was 20)
- [ ] All post-related tests pass (npx vitest run --grep "Post|Controller|Dialect")
- [ ] /prism-review passes with no CRITICAL findings
- OMEGA_FLOOR: >= 0.85
- ROLLBACK: git stash + git checkout src/engines/PostProcessorPipelineEngine.ts src/engines/ControllerDialectEngine.ts
- NEW_HOOKS: enforce-pp-constants.py (blocks inline physics constants in post engines)
- NEW_ACTIONS: dialect_list now returns 24+ entries
- NEW_SKILLS: /ppg-quick-start (verify calls ControllerDialectEngine with 24+ dialects)

---

## PP-MS1: CPS Parser Engine
**Sessions: 3 | Units: 6 | Priority: HIGH | DEPENDS_ON: PP-MS0**

Parse 180+ Fusion 360 .cps files into PRISM's data model. Extract machine properties, capabilities, and dialect configurations.

### SESSION PP-MS1-1: CPS Property Extractor
**SMART CONFIG:** role=R2-Engine | model=opus | effort=max | context_budget=100K

**U-PP05: CpsPropertyExtractorEngine — parse CPS file headers**
- Create engine that reads .cps file text and extracts: description, vendor, capabilities bitmask, tolerance, circular limits, feed rates
- Handle 3 known CPS format variants:
  - Fusion 360 standard: `properties = { key: { title, description, group, type, value, scope } }`
  - CAM post variant: `properties { KEY: value }` (Mastercam/hyperMILL style)
  - Multi-line variant: `var properties = { PROPERTY_KEY: value };` (Siemens posts)
- Auto-detect variant from file content before parsing
- Handle all 5 property types: boolean, enum, integer, spatial, string
- Handle enum values with {title, id} pairs
- Graceful fallback: partial property recovery when some parse and some fail
- Error reporting: log which properties failed extraction and why
- Output: CpsPropertyMap with typed values, group categories, and parse_status per property
- PRE-WORK: Sample 10 CPS files to classify format distribution before building parser
- FILES_CREATED: [src/engines/CpsPropertyExtractorEngine.ts]
- ABORT_CRITERIA: [<80% property extraction on sample 10 CPS files, type error, unhandled variant crash]
- ROLLBACK: git rm src/engines/CpsPropertyExtractorEngine.ts

**U-PP06: CpsDialectMapperEngine — map CPS properties to PRISM dialect**
- Map CPS properties to ControllerDialectEngine fields:
  - safePositionMethod → safe_retract_style (G28|G53|clearance)
  - useRadius → arc_format (IJK|R)
  - useSmoothing → hsm.code (G187|Cycle32|AICC)
  - useTCP/useTiltedWorkplane → five_axis.tcp/dwo
  - gotChipConveyor → coolant.chip_conveyor
  - hasAAxis/hasBAxis/hasCAxis → axis_config
- Produce a PostProcessorConfig that can feed into MasterPostProcessorEngine
- FILES_CREATED: [src/engines/CpsDialectMapperEngine.ts]
- ABORT_CRITERIA: [mapping produces invalid dialect config, arc_format mismatch, HSM code wrong for controller]
- ROLLBACK: git rm src/engines/CpsDialectMapperEngine.ts

### SESSION PP-MS1-2: CPS Batch Ingestion
**SMART CONFIG:** role=R2-Engine | model=sonnet | effort=high | context_budget=60K

**U-PP07: CpsBatchIngestionEngine — process entire CPS library**
- Read all .cps files from configured directory path
- Run CpsPropertyExtractorEngine on each
- Build a CpsLibraryCatalog: Map<vendorModel, CpsPropertyMap>
- Persist to src/data/cps-library-catalog.json
- FILES_CREATED: [src/engines/CpsBatchIngestionEngine.ts, src/data/cps-library-catalog.json]
- ABORT_CRITERIA: [>10% parse failure rate, catalog JSON >50MB, crash on any CPS file]
- ROLLBACK: git rm src/engines/CpsBatchIngestionEngine.ts src/data/cps-library-catalog.json

**U-PP08: CpsMachineMatcherEngine — correlate CPS to machine profiles**
- Cross-reference CPS vendor/description against MachineProfileCatalog (232+ machines)
- Build mapping: machineProfileId → cpsFileId → recommended post config
- Handle fuzzy matching (CPS says "HAAS - Next Generation" → machine profile "haas_ngc")
- Output: MachinePostMapping[] persisted to src/data/machine-post-mapping.json
- FILES_CREATED: [src/engines/CpsMachineMatcherEngine.ts, src/data/machine-post-mapping.json]
- ABORT_CRITERIA: [<70% match rate, fuzzy match produces wrong controller family, duplicate mappings]
- ROLLBACK: git rm src/engines/CpsMachineMatcherEngine.ts src/data/machine-post-mapping.json

### SESSION PP-MS1-3: CPS Analysis Route + Tests
**SMART CONFIG:** role=R3-Wiring | model=sonnet | effort=high | context_budget=60K

**U-PP09: Wire CPS engines to dispatcher + route**
- Add actions to prism_product: cps_analyze, cps_catalog, cps_match
- Add route: GET /ppg/cps/catalog, POST /ppg/cps/analyze, POST /ppg/cps/match
- Wire through existing ppg.ts route module
- FILES_MODIFIED: [src/routes/ppg.ts, src/tools/dispatchers/productDispatcher.ts]
- ABORT_CRITERIA: [route 404, dispatcher action not found, schema validation failure]
- ROLLBACK: git checkout src/routes/ppg.ts src/tools/dispatchers/productDispatcher.ts

**U-PP10: Test suite for CPS parser**
- Test against 5 representative CPS files: haas next generation, siemens-840d, fanuc, mazak, okuma
- Verify property extraction accuracy (100% of typed properties parsed)
- Verify dialect mapping correctness (arc format, safe retract, smoothing)
- Verify batch ingestion produces catalog with 90%+ match rate
- FILES_CREATED: [src/__tests__/CpsParser.test.ts]
- ABORT_CRITERIA: [any representative CPS file fails extraction, match rate <90%]
- ROLLBACK: git rm src/__tests__/CpsParser.test.ts

**EXIT GATE PP-MS1:**
- [ ] CpsPropertyExtractorEngine parses 180+ CPS files without error (0 crashes)
- [ ] CpsDialectMapperEngine maps properties to PRISM dialect for all 15+ controller families
- [ ] CpsMachineMatcherEngine achieves 90%+ match rate against 232 fully-profiled machines
- [ ] 3 new routes active and returning 200: GET /ppg/cps/catalog, POST /ppg/cps/analyze, POST /ppg/cps/match
- [ ] 3 new dispatcher actions wired: cps_analyze, cps_catalog, cps_match
- [ ] Test suite passes with exactly 5 representative CPS files: haas-ngc, siemens-840d, fanuc, mazak, okuma
- [ ] All 3 CPS format variants handled (Fusion standard, CAM post, multi-line)
- OMEGA_FLOOR: >= 0.85
- NEW_HOOKS: none
- NEW_ACTIONS: cps_analyze, cps_catalog, cps_match
- NEW_SKILLS: /cps-analyze (verify calls CpsPropertyExtractorEngine)
- ROLLBACK: git rm src/engines/Cps*.ts src/data/cps-*.json src/__tests__/CpsParser.test.ts + git checkout src/routes/ppg.ts src/tools/dispatchers/productDispatcher.ts

---

# PHASE 2: MACHINE-DRIVEN POST GENERATION (PP-MS2 — PP-MS4)
**Goal:** User selects machine → PRISM auto-configures the optimal post.

## PP-MS2: Machine Fingerprinting Engine
**Sessions: 2 | Units: 4 | Priority: HIGH | DEPENDS_ON: PP-MS1**

### SESSION PP-MS2-1: Machine → Post Auto-Configuration
**SMART CONFIG:** role=R2-Engine | model=opus | effort=max | context_budget=80K

**U-PP11: MachineFingerprintEngine — make/model/year → post config**
- Input: { manufacturer, model, year, controller_override? }
- Controller resolution strategy (ranked fallback):
  1. Exact match in ExtendedMachineProfile controller field
  2. Fuzzy match on model name against CPS library descriptions
  3. Year-based default: old Haas → fanuc_0i, modern Haas → haas_ngc
  4. Manufacturer-based default: unknown Siemens → siemens_840d
  5. Ultimate fallback: generic_fanuc or generic_iso
- Handle edge cases: missing controller in profile, non-standard controllers, unknown firmware
- Output: RecommendedPostConfig { dialect, axis_config, features[], coolant_config, probing_dialect, hsm_config, resolution_method }
- Cross-reference against CPS library for additional property defaults
- Note: MachineProfileCatalog has 910 machines (not 232); 232 have full controller data
- FILES_CREATED: [src/engines/MachineFingerprintEngine.ts]
- ABORT_CRITERIA: [<80% resolution rate on 232 full-data profiles, fallback strategy produces wrong controller family]
- ROLLBACK: git rm src/engines/MachineFingerprintEngine.ts

**U-PP12: FirmwareFeatureMatrixEngine — year → available features**
- Build firmware version → feature availability matrix
- Example: Haas NGC v6.2+ → M65 probe cycle; pre-v6.2 → G65 macro equivalent
- Example: Siemens 840D sl → CYCLE832 smoothing; older 840D → no smoothing
- Store as src/data/firmware-feature-matrix.json
- FILES_CREATED: [src/engines/FirmwareFeatureMatrixEngine.ts, src/data/firmware-feature-matrix.json]
- ABORT_CRITERIA: [<10 controller families covered, year-based gating produces false positives]
- ROLLBACK: git rm src/engines/FirmwareFeatureMatrixEngine.ts src/data/firmware-feature-matrix.json

**U-PP13: MachineFeatureRecommenderEngine — recommend optional features**
- Given machine profile + job requirements, recommend: probing, TSC, DWO, TCP, SSV, subprograms
- Rank features by: safety impact (high → always recommend), performance impact, cost of implementation
- Output feature toggle recommendations with explanations
- FILES_CREATED: [src/engines/MachineFeatureRecommenderEngine.ts]
- ABORT_CRITERIA: [recommendation includes feature machine can't support, empty feature list for any mode]
- ROLLBACK: git rm src/engines/MachineFeatureRecommenderEngine.ts

**U-PP14: Wire fingerprint engines + routes**
- Add actions: machine_fingerprint, firmware_features, feature_recommend
- Add routes: POST /ppg/machine/fingerprint, GET /ppg/machine/features/:makeModel
- Wire through prism_product dispatcher
- FILES_MODIFIED: [src/routes/ppg.ts, src/tools/dispatchers/productDispatcher.ts]
- ABORT_CRITERIA: [route 404, dispatcher action missing, schema validation error]
- ROLLBACK: git checkout src/routes/ppg.ts src/tools/dispatchers/productDispatcher.ts

**EXIT GATE PP-MS2:**
- [ ] MachineFingerprintEngine resolves 90%+ of 232 fully-profiled machines to post configs
- [ ] FirmwareFeatureMatrixEngine covers exactly 10 controller families with year-based gating
- [ ] FeatureRecommenderEngine produces ranked feature lists for all 6 machine modes (mill, lathe, edm, wire_edm, laser, waterjet)
- [ ] 3 routes active: POST /ppg/machine/fingerprint, GET /ppg/machine/features/:makeModel, POST /ppg/machine/recommend
- [ ] All tests pass: npx vitest run --grep "Fingerprint|Firmware|Feature"
- OMEGA_FLOOR: >= 0.85
- NEW_HOOKS: none
- NEW_ACTIONS: machine_fingerprint, firmware_features, feature_recommend
- NEW_SKILLS: /machine-enrich (verify calls FirmwareFeatureMatrixEngine)
- ROLLBACK: git rm src/engines/MachineFingerprintEngine.ts FirmwareFeatureMatrixEngine.ts MachineFeatureRecommenderEngine.ts src/data/firmware-feature-matrix.json + git checkout src/routes/ppg.ts

## PP-MS3: Machine Selection UI
**Sessions: 3 | Units: 5 | Priority: HIGH | DEPENDS_ON: PP-MS2**

### SESSION PP-MS3-1: Machine Picker Component
**SMART CONFIG:** role=R5-Frontend | model=opus | effort=max | context_budget=100K

**U-PP15: MachinePickerPanel — make/model/year selection cascade**
- 3-step cascade: Manufacturer → Model → Year/Variant
- Search-as-you-type across 232+ machine profiles
- Show machine specs in preview card (spindle RPM, axes, envelope, tooling layout)
- Auto-detect controller from machine profile
- Dark theme consistent with PRISM design system
- FILES_CREATED: [web/src/components/ppg/MachinePickerPanel.tsx]
- ABORT_CRITERIA: [search returns 0 results for known machines, cascade breaks on mode switch, Vite build fail]
- ROLLBACK: git rm web/src/components/ppg/MachinePickerPanel.tsx

**U-PP16: FeatureTogglePanel — optional feature checkboxes**
- Dynamic checkbox grid based on MachineFingerprintEngine recommendations
- Categories: Safety (probing, safe start), Performance (HSM, SSV, TSC), Automation (subprograms, chip conveyor)
- Recommended features pre-checked, optional features unchecked with explanation tooltips
- Visual indicator showing which features are "required" vs "recommended" vs "optional"
- FILES_CREATED: [web/src/components/ppg/FeatureTogglePanel.tsx]
- ABORT_CRITERIA: [toggles don't update post config, required features can be unchecked, Vite build fail]
- ROLLBACK: git rm web/src/components/ppg/FeatureTogglePanel.tsx

**U-PP17: ControllerOverridePanel — manual controller selection**
- Default: auto-detected from machine profile
- Override: dropdown of all 24+ controller dialects
- Warning when override differs from detected controller
- Controller feature comparison card (show what changes with override)
- FILES_CREATED: [web/src/components/ppg/ControllerOverridePanel.tsx]
- ABORT_CRITERIA: [override doesn't propagate to post config, warning logic inverted, Vite build fail]
- ROLLBACK: git rm web/src/components/ppg/ControllerOverridePanel.tsx

### SESSION PP-MS3-2: Wire Machine Picker to PPG Page
**SMART CONFIG:** role=R5-Frontend | model=sonnet | effort=high | context_budget=80K

**U-PP18: Integrate MachinePickerPanel into PostProcessorGeneratorPage**
- Add "Machine" tab/lane to existing generate/validate/compare/library lanes
- Wire machine selection to MachineFingerprintEngine API
- Cascade: machine selection → auto-set controller → auto-set features → auto-configure post
- Replace current manual controller/operation dropdowns with machine-driven flow
- FILES_MODIFIED: [web/src/pages/PostProcessorGeneratorPage.tsx]
- ABORT_CRITERIA: [machine selection breaks existing generate flow, API 404 on fingerprint, Vite build fail]
- ROLLBACK: git checkout web/src/pages/PostProcessorGeneratorPage.tsx

**U-PP19: Wire FeatureTogglePanel to post generation pipeline**
- Feature toggles map to PostProcessorPipelineEngine stage enables/disables
- Probing toggle → enables probe routine generation stage
- HSM toggle → enables smoothing code injection (G187/Cycle32/AICC)
- TSC toggle → enables through-spindle coolant M-codes
- Show real-time post preview as features are toggled
- FILES_MODIFIED: [web/src/pages/PostProcessorGeneratorPage.tsx]
- ABORT_CRITERIA: [feature toggle doesn't update preview, pipeline stage enable/disable broken]
- ROLLBACK: git checkout web/src/pages/PostProcessorGeneratorPage.tsx

**EXIT GATE PP-MS3:**
- [ ] Machine picker loads 232+ machines with search, cascade works across manufacturer→model→year
- [ ] Feature toggles dynamically update based on machine fingerprint API response
- [ ] Controller auto-detection matches 90%+ of 232 fully-profiled machines
- [ ] Post preview updates in real-time as selections change
- [ ] Vite build passes, no new TypeScript errors
- OMEGA_FLOOR: >= 0.85
- NEW_HOOKS: none
- NEW_ACTIONS: none (frontend calls existing fingerprint API)
- NEW_SKILLS: /machine-check (verify it calls MachineFingerprintEngine)
- ROLLBACK: git checkout web/src/pages/PostProcessorGeneratorPage.tsx + rm web/src/components/ppg/*.tsx

## PP-MS4: Before/After Preview + Download
**Sessions: 2 | Units: 4 | Priority: HIGH | DEPENDS_ON: PP-MS3**

### SESSION PP-MS4-1: G-code Comparison + Download
**SMART CONFIG:** role=R5-Frontend + R2-Engine | model=opus | effort=max | context_budget=100K

**U-PP20: GcodeComparisonPanel — before/after side-by-side**
- Left panel: "Traditional" G-code (single S/F per operation)
- Right panel: "PRISM Optimized" G-code (per-block S/F with inline comments)
- Syntax highlighting for G/M codes, S/F values, comments
- Diff markers showing which lines changed
- Per-block confidence badge (green/amber/red)
- FILES_CREATED: [web/src/components/ppg/GcodeComparisonPanel.tsx]
- ABORT_CRITERIA: [diff markers wrong, syntax highlighting breaks on long programs, Vite build fail]
- ROLLBACK: git rm web/src/components/ppg/GcodeComparisonPanel.tsx

**U-PP21: PostDownloadEngine — export to controller-native format**
- Generate downloadable files in: .nc (standard), .tap (Fanuc), .mpf (Siemens), .h (Heidenhain), .eia (generic)
- Include header block with: machine model, controller, CAM system, PRISM version, generation date
- Include inline comments with physics data (cutting force, confidence, predicted Ra)
- Zip package option with: G-code + setup sheet + validation report
- FILES_CREATED: [src/engines/PostDownloadEngine.ts]
- ABORT_CRITERIA: [generated file has wrong extension, header block missing machine info, invalid G-code syntax]
- ROLLBACK: git rm src/engines/PostDownloadEngine.ts

**U-PP22: PostPreviewComponent — live G-code preview in PPG page**
- Scrollable G-code viewer with line numbers and syntax highlighting
- Inline physics annotations (hover for force, confidence, Ra per block)
- "Copy to clipboard" and "Download" buttons
- Toggle: show/hide physics comments
- FILES_CREATED: [web/src/components/ppg/PostPreviewComponent.tsx]
- ABORT_CRITERIA: [annotations don't render, copy-to-clipboard fails, scroll broken on long programs]
- ROLLBACK: git rm web/src/components/ppg/PostPreviewComponent.tsx

**U-PP23: Wire download route**
- POST /ppg/download → generates file in requested format
- Response: binary file with correct Content-Type and Content-Disposition headers
- FILES_MODIFIED: [src/routes/ppg.ts]
- ABORT_CRITERIA: [download returns 500, Content-Type wrong, file corrupt/empty]
- ROLLBACK: git checkout src/routes/ppg.ts

**EXIT GATE PP-MS4:**
- [ ] Before/after comparison shows meaningful S/F differences on >=3 test programs
- [ ] Download produces valid G-code for exactly: Fanuc (.nc), Siemens (.mpf), Haas (.nc), Heidenhain (.h)
- [ ] Preview shows inline physics annotations (force, confidence, Ra per block)
- [ ] 4 download formats working (.nc, .mpf, .h, .zip package)
- [ ] Vite build passes, no new TypeScript errors
- OMEGA_FLOOR: >= 0.85
- NEW_HOOKS: none
- NEW_ACTIONS: ppg_download, ppg_preview
- NEW_SKILLS: /program-validate (verify calls PostValidationSuiteEngine)
- ROLLBACK: git checkout src/routes/ppg.ts + rm web/src/components/ppg/GcodeComparisonPanel.tsx PostPreviewComponent.tsx

---

# PHASE 3: ADVANCED CAPABILITIES (PP-MS5 — PP-MS8)
**Goal:** Prove-out mode, post library, validation hardening, non-traditional processes.

## PP-MS5: Prove-Out Mode + Post Validation
**Sessions: 2 | Units: 4 | DEPENDS_ON: PP-MS4**

### SESSION PP-MS5-1: Prove-Out + Validation Engines
**SMART CONFIG:** role=R2-Engine | model=opus | effort=max | context_budget=80K

**U-PP24: ProveOutModeEngine — conservative first-article settings**
- Reduce all feed rates by 25% from optimized values
- Cap spindle RPM at 80% of calculated optimal
- Force single-block mode recommendations in header
- Add explicit "PROVE-OUT" comments at critical blocks
- Include stop-and-check points at operation transitions (triggered by: tool change, material change, spindle direction change)
- FILES_CREATED: [src/engines/ProveOutModeEngine.ts]
- ABORT_CRITERIA: [feed reduction >40% (over-conservative), RPM cap <70% (too aggressive), stop-check points missing at tool changes]
- ROLLBACK: git rm src/engines/ProveOutModeEngine.ts

**U-PP25: PostValidationHardeningEngine — machine limit checking**
- Validate spindle RPM against machine profile max_rpm
- Validate feed rates against machine max_feed_mm_min per axis
- Validate axis travel against machine work_envelope
- Validate tool capacity against machine tool_capacity
- Block programs that exceed any hard limit
- FILES_CREATED: [src/engines/PostValidationHardeningEngine.ts]
- ABORT_CRITERIA: [valid program falsely blocked, invalid program not caught, machine profile lookup failure]
- ROLLBACK: git rm src/engines/PostValidationHardeningEngine.ts

**U-PP26: PostValidationReportEngine — generate validation PDF**
- Summary: pass/fail for each validation dimension
- Detail: per-block flag list with severity
- Recommendations: specific parameter adjustments for failing blocks
- FILES_CREATED: [src/engines/PostValidationReportEngine.ts]
- ABORT_CRITERIA: [report generation crash, severity flags missing, empty recommendations for failing blocks]
- ROLLBACK: git rm src/engines/PostValidationReportEngine.ts

### SESSION PP-MS5-2: Wire Prove-Out to PPG UI
**SMART CONFIG:** role=R5-Frontend | model=sonnet | effort=high | context_budget=60K

**U-PP27: Wire prove-out mode into PPG UI**
- Add "Prove-Out" toggle on generate panel
- Show prove-out vs production comparison
- Validate button triggers full validation suite
- Validation report displayed inline + downloadable
- FILES_MODIFIED: [web/src/pages/PostProcessorGeneratorPage.tsx]
- ABORT_CRITERIA: [prove-out toggle doesn't update preview, validation report not rendering, Vite build fail]
- ROLLBACK: git checkout web/src/pages/PostProcessorGeneratorPage.tsx

**EXIT GATE PP-MS5:**
- [ ] ProveOutModeEngine reduces feeds by 25% and caps RPM at 80%
- [ ] PostValidationHardeningEngine blocks programs exceeding machine limits
- [ ] Validation report generates with per-block severity flags
- [ ] Prove-out toggle in PPG UI updates preview in real-time
- OMEGA_FLOOR: >= 0.85
- NEW_HOOKS: none
- NEW_ACTIONS: ppg_prove_out, ppg_validate_limits
- NEW_SKILLS: /safety-validation-guide (verify calls ProveOutModeEngine + PostValidationHardeningEngine)
- ROLLBACK: git checkout src/engines/ProveOutModeEngine.ts PostValidationHardeningEngine.ts

## PP-MS6: Post Library & Search
**Sessions: 2 | Units: 4 | DEPENDS_ON: PP-MS5**

### SESSION PP-MS6-1: Library Engine + UI
**SMART CONFIG:** role=R2-Engine + R5-Frontend | model=opus | effort=max | context_budget=80K

**U-PP28: PostLibraryCatalogEngine — searchable post catalog**
- Index all 180+ CPS posts + PRISM-native posts
- Faceted search: by manufacturer, controller, machine type, capabilities
- Show compatibility score (how well post matches user's machine)
- FILES_CREATED: [src/engines/PostLibraryCatalogEngine.ts]
- ABORT_CRITERIA: [search returns 0 for known manufacturer, compatibility score NaN, index crash on 180+ posts]
- ROLLBACK: git rm src/engines/PostLibraryCatalogEngine.ts

**U-PP29: PostLibraryUI — searchable catalog page**
- Grid of post cards with manufacturer logos, controller badges, capability tags
- Filter sidebar: manufacturer, type (mill/lathe/mill-turn/swiss), controller family
- Click card → see detailed post capabilities + "Generate for my machine" CTA
- FILES_CREATED: [web/src/components/ppg/PostLibraryUI.tsx]
- ABORT_CRITERIA: [filter returns empty for known category, card click doesn't navigate, Vite build fail]
- ROLLBACK: git rm web/src/components/ppg/PostLibraryUI.tsx

**U-PP30: PostVersioningEngine — track post revisions**
- Each generated post gets a version hash (machine + controller + features + PRISM version)
- History: show previous versions generated for this machine
- Diff: compare two post versions to see what changed
- FILES_CREATED: [src/engines/PostVersioningEngine.ts]
- ABORT_CRITERIA: [version hash collision, diff produces empty for changed posts, history lost on re-generate]
- ROLLBACK: git rm src/engines/PostVersioningEngine.ts

### SESSION PP-MS6-2: Versioning + Wiring
**SMART CONFIG:** role=R2-Engine + R3-Wiring | model=sonnet | effort=high | context_budget=60K

**U-PP31: Wire library to PPG "Library" lane**
- Replace current library lane content with PostLibraryCatalogEngine data
- Link library cards to generate flow (pre-fill machine/controller from selected post)
- FILES_MODIFIED: [web/src/pages/PostProcessorGeneratorPage.tsx]
- ABORT_CRITERIA: [library lane renders empty, card click doesn't pre-fill selections, Vite build fail]
- ROLLBACK: git checkout web/src/pages/PostProcessorGeneratorPage.tsx

**EXIT GATE PP-MS6:**
- [ ] PostLibraryCatalogEngine indexes 180+ CPS posts with faceted search
- [ ] Library UI renders card grid with manufacturer/controller/type filters
- [ ] Post versioning tracks revisions with diff capability
- [ ] Library lane in PPG links to generate flow with pre-filled selections
- OMEGA_FLOOR: >= 0.85
- NEW_HOOKS: none
- NEW_ACTIONS: ppg_library_search, ppg_library_detail, ppg_version_diff
- NEW_SKILLS: /cps-analyze (verify calls PostLibraryCatalogEngine for library search)
- ROLLBACK: git rm src/engines/PostLibraryCatalogEngine.ts src/engines/PostVersioningEngine.ts web/src/components/ppg/PostLibraryUI.tsx + git checkout web/src/pages/PostProcessorGeneratorPage.tsx

## PP-MS7: Coolant, Probing & Subprogram Specialization
**Sessions: 2 | Units: 4 | DEPENDS_ON: PP-MS0 + PP-MS2**

### SESSION PP-MS7-1: Coolant + Probing + Subprogram Engines
**SMART CONFIG:** role=R2-Engine | model=opus | effort=max | context_budget=100K

**U-PP32: CoolantControlConfigEngine — per-machine coolant M-codes**
- Define: flood (M8/M9), TSC (M88/M89 or machine-specific), mist (M7), air blast (M51)
- Pressure/flow parameters per machine (from machine profile)
- Coolant-on delay timing for different controller families
- FILES_CREATED: [src/engines/CoolantControlConfigEngine.ts, src/data/coolant-control-configs.json]
- ABORT_CRITERIA: [M-code wrong for known controller, pressure/flow data missing for profiled machine]
- ROLLBACK: git rm src/engines/CoolantControlConfigEngine.ts src/data/coolant-control-configs.json

**U-PP33: UnifiedProbingDialectEngine — cross-controller probe routines**
- Generate probe routines for: WCS setup, tool length, part inspection
- Cover 8+ controller families:
  - Fanuc 30i/31i: G65 P9832 macro → register[#143..#150]
  - Haas NGC: M65 P9xxx → modal register [PROBE_X] (6 builtin macros)
  - Siemens 840D: CYCLE977 (ISO 230-10) → system variables
  - Heidenhain TNC640/7: TCH PROBE 1001 → CSV measurement file
  - Okuma OSP: PROBING subroutine → DPRNT output
  - Mazak Smooth: M181 proprietary → custom register
  - Brother Speedio: macro-based (no native probing)
  - Doosan: CYCLE1091-based probe calls
- Handle probe TYPE detection: Renishaw OMP, Blum, Heidenhain TS (different command syntax)
- Standardize measurement OUTPUT format back to PRISM (register → JSON)
- Handle probe offset numbering per controller family
- FILES_CREATED: [src/engines/UnifiedProbingDialectEngine.ts, src/data/probing-dialect-matrix.json]
- ABORT_CRITERIA: [probe routine generates invalid G-code for any of 8 controllers, offset numbering wrong, probe type detection fails]
- ROLLBACK: git rm src/engines/UnifiedProbingDialectEngine.ts src/data/probing-dialect-matrix.json

**U-PP34: SubprogramStructureEngine — optimize program organization**
- M98/M99 (Fanuc), CALL/RET (Siemens), CALL PGM (Heidenhain), M97 (Haas local)
- Auto-detect repeating patterns → extract to subprograms
- Generate tool-change subprograms for production efficiency
- FILES_CREATED: [src/engines/SubprogramStructureEngine.ts]
- ABORT_CRITERIA: [sub call syntax wrong for controller family, pattern detection misses obvious repeats, M98/M99 vs CALL/RET mismatch]
- ROLLBACK: git rm src/engines/SubprogramStructureEngine.ts

### SESSION PP-MS7-2: Pipeline Wiring
**SMART CONFIG:** role=R3-Wiring | model=sonnet | effort=high | context_budget=60K

**U-PP35: Wire coolant/probing/subprogram to pipeline**
- Add stages to PostProcessorPipelineEngine for coolant injection, probe routine generation, subprogram extraction
- Feature toggle gates: only active when corresponding feature is enabled
- FILES_MODIFIED: [src/engines/PostProcessorPipelineEngine.ts, src/tools/dispatchers/productDispatcher.ts]
- ABORT_CRITERIA: [pipeline stage runs when feature disabled, stage output corrupts existing blocks, dispatcher action schema mismatch]
- ROLLBACK: git checkout src/engines/PostProcessorPipelineEngine.ts src/tools/dispatchers/productDispatcher.ts

**EXIT GATE PP-MS7:**
- [ ] CoolantControlConfigEngine generates correct M-codes for 6+ controller families
- [ ] UnifiedProbingDialectEngine produces valid probe routines for 8+ controllers
- [ ] SubprogramStructureEngine extracts repeating patterns into controller-native subprograms
- [ ] Pipeline stages gated by feature toggles (disabled features produce no output)
- [ ] Tests pass for coolant/probing/subprogram across Fanuc, Siemens, Haas minimum
- OMEGA_FLOOR: >= 0.85
- NEW_HOOKS: none
- NEW_ACTIONS: ppg_coolant_config, ppg_probe_generate, ppg_subprogram_extract
- NEW_SKILLS: /probe-routine-guide (already exists — verify it calls new engine)
- ROLLBACK: git rm src/engines/CoolantControlConfigEngine.ts src/engines/UnifiedProbingDialectEngine.ts src/engines/SubprogramStructureEngine.ts + git checkout src/engines/PostProcessorPipelineEngine.ts src/tools/dispatchers/productDispatcher.ts

## PP-MS8: Non-Traditional Process Posts
**Sessions: 2 | Units: 3 | DEPENDS_ON: PP-MS0**

### SESSION PP-MS8-1: EDM + Laser + Waterjet Extensions
**SMART CONFIG:** role=R2-Engine | model=opus | effort=max | context_budget=80K

**U-PP36: EDMPostProcessorExtension — wire/sinker EDM dialect**
- Wire EDM: contour cutting, skim passes, taper compensation
- Sinker EDM: burn sequences, orbiting, electrode wear compensation
- Controller support: Fanuc ROBOcut, Mitsubishi, Sodick, AgieCharmilles
- FILES_CREATED: [src/engines/EDMPostProcessorExtension.ts]
- ABORT_CRITERIA: [generated EDM program has invalid syntax for target controller, wire/sinker detection wrong, skim pass count incorrect]
- ROLLBACK: git rm src/engines/EDMPostProcessorExtension.ts

**U-PP37: LaserWaterjetPostExtension — sheet cutting posts**
- Laser: pierce sequence, cut conditions per material/thickness, nesting lead-ins
- Waterjet: quality level speed mapping, taper compensation, abrasive flow control
- Controller support: Bystronic, TRUMPF, OMAX, Flow
- FILES_CREATED: [src/engines/LaserWaterjetPostExtension.ts]
- ABORT_CRITERIA: [pierce sequence missing, quality level mapping wrong, taper compensation inverted]
- ROLLBACK: git rm src/engines/LaserWaterjetPostExtension.ts

**U-PP38: Wire non-traditional posts to pipeline**
- Extend PostProcessorPipelineEngine phase 0 to detect process type
- Route to appropriate specialized engine
- Output controller-native format per machine
- FILES_MODIFIED: [src/engines/PostProcessorPipelineEngine.ts]
- ABORT_CRITERIA: [process type detection misroutes, milling program routed to EDM engine, phase 0 regression on existing mill/lathe posts]
- ROLLBACK: git checkout src/engines/PostProcessorPipelineEngine.ts

**EXIT GATE PP-MS8:**
- [ ] EDM post generates valid wire/sinker programs for Fanuc ROBOcut + Sodick minimum
- [ ] Laser post generates valid programs for Bystronic + TRUMPF minimum
- [ ] Waterjet post generates valid programs for OMAX + Flow minimum
- [ ] Pipeline phase 0 detects process type and routes correctly
- OMEGA_FLOOR: >= 0.85
- NEW_HOOKS: none
- NEW_ACTIONS: ppg_edm_generate, ppg_laser_generate, ppg_waterjet_generate
- NEW_SKILLS: /program-gen (verify routes non-traditional process types through correct pipeline)
- ROLLBACK: git rm src/engines/EDMPostProcessorExtension.ts src/engines/LaserWaterjetPostExtension.ts + git checkout src/engines/PostProcessorPipelineEngine.ts

---

# PHASE 4: PRODUCTION HARDENING (PP-MS9 — PP-MS11)
**Goal:** Quality, testing, and commercial readiness.

## PP-MS9: Integration Testing & Validation
**Sessions: 2 | Units: 3 | DEPENDS_ON: PP-MS6 + PP-MS7 + PP-MS8**

### SESSION PP-MS9-1: End-to-End Tests + Simulation
**SMART CONFIG:** role=R6-Test | model=opus | effort=max | context_budget=80K

**U-PP39: End-to-end integration tests**
- Test complete flow: machine selection → fingerprint → feature config → generate → validate → download
- Test 10 representative machines (Haas VF-2, Fanuc 31i mill, Siemens 840D 5-axis, Mazak Integrex, Okuma lathe, Brother Speedio, Citizen Cincom, DMG MORI NLX, Hurco VMX, Doosan turning)
- Verify generated G-code is syntactically valid per controller family
- FILES_CREATED: [src/__tests__/PostProcessorE2E.test.ts]
- ABORT_CRITERIA: [any of 10 representative machines fails flow, G-code syntax error in output, flow step throws unhandled exception]
- ROLLBACK: git rm src/__tests__/PostProcessorE2E.test.ts

**U-PP40: G-code simulation validation**
- Parse generated programs through PostValidationSuiteEngine
- Verify: no unsafe rapids, correct work offsets, valid tool calls, proper coolant sequencing
- Compare against CPS reference output for same machine/operation
- FILES_CREATED: [src/__tests__/PostProcessorSimulation.test.ts]
- ABORT_CRITERIA: [unsafe rapid not caught, work offset missing in output, coolant sequence wrong]
- ROLLBACK: git rm src/__tests__/PostProcessorSimulation.test.ts

**U-PP41: Performance benchmarks**
- Pipeline throughput: time to generate post for 1000-line program
- Target: < 2 seconds for standard 3-axis, < 5 seconds for 5-axis with full physics
- FILES_CREATED: [src/__tests__/PostProcessorBenchmark.test.ts]
- ABORT_CRITERIA: [3-axis >4s, 5-axis >10s, benchmark harness crash]
- ROLLBACK: git rm src/__tests__/PostProcessorBenchmark.test.ts

**EXIT GATE PP-MS9:**
- [ ] 10 representative machines pass end-to-end flow (select → fingerprint → generate → validate → download)
- [ ] Generated G-code syntactically valid per controller family (Fanuc, Siemens, Haas minimum)
- [ ] No unsafe rapids, correct work offsets, valid tool calls in all test programs
- [ ] Pipeline < 2s for 3-axis, < 5s for 5-axis with full physics
- [ ] Coolant/probing/subprogram stages validated (PP-MS7 coverage)
- [ ] Non-traditional posts validated (PP-MS8 coverage)
- OMEGA_FLOOR: >= 0.90
- NEW_HOOKS: none
- NEW_ACTIONS: ppg_benchmark_report (returns pipeline latency metrics per machine)
- NEW_SKILLS: /program-validate (verify calls PostValidationSuiteEngine on all 10 representative machines)
- ROLLBACK: git rm src/__tests__/PostProcessorE2E.test.ts src/__tests__/PostProcessorSimulation.test.ts src/__tests__/PostProcessorBenchmark.test.ts

## PP-MS10: Product Page Enhancement
**Sessions: 2 | Units: 4 | DEPENDS_ON: PP-MS4**

### SESSION PP-MS10-1: Product Page Sections
**SMART CONFIG:** role=R7-Product + R5-Frontend | model=opus | effort=max | context_budget=80K

**U-PP42: Workflow diagram section — CAM → PRISM → Machine**
- Visual 3-node flow diagram showing where PRISM fits
- Animated or interactive (click each node for details)
- FILES_MODIFIED: [web/src/pages/PostProcessorPage.tsx]
- ABORT_CRITERIA: [diagram doesn't render, node click doesn't expand, Vite build fail]
- ROLLBACK: git checkout web/src/pages/PostProcessorPage.tsx

**U-PP43: Before/after G-code showcase**
- Real example: traditional single-S/F vs PRISM per-block optimized
- Inline physics annotations showing force, confidence, Ra
- "Try with your own program" CTA → links to /ppg
- FILES_MODIFIED: [web/src/pages/PostProcessorPage.tsx]
- ABORT_CRITERIA: [before/after shows identical code, physics annotations missing, CTA link broken]
- ROLLBACK: git checkout web/src/pages/PostProcessorPage.tsx

**U-PP44: Supported CAM systems grid**
- Grid of 18 CAM system logos with "works with" badge
- Links to calculator page for CAM-specific toolpath optimization
- FILES_MODIFIED: [web/src/pages/PostProcessorPage.tsx]
- ABORT_CRITERIA: [logos don't render, links 404, Vite build fail]
- ROLLBACK: git checkout web/src/pages/PostProcessorPage.tsx

**U-PP45: ROI calculator widget**
- Inputs: machines, avg cycle time, hourly rate, shifts/day
- Outputs: annual savings, payback period, crash prevention value
- Interactive sliders with real-time calculation
- FILES_MODIFIED: [web/src/pages/PostProcessorPage.tsx]
- ABORT_CRITERIA: [calculation produces NaN, sliders don't update output, payback period negative]
- ROLLBACK: git checkout web/src/pages/PostProcessorPage.tsx

**EXIT GATE PP-MS10:**
- [ ] Workflow diagram renders CAM → PRISM → Machine flow
- [ ] Before/after G-code showcase shows real per-block S/F differences
- [ ] Supported CAM systems grid shows 18 logos with links
- [ ] ROI calculator computes payback period from user inputs
- [ ] Vite build passes, no new TypeScript errors
- OMEGA_FLOOR: >= 0.85
- NEW_HOOKS: none
- NEW_ACTIONS: ppg_roi_calculate (returns payback period + annual savings from user inputs)
- NEW_SKILLS: /roi-analysis (verify calls ROI calculator widget with real machine cost data)
- ROLLBACK: git checkout web/src/pages/PostProcessorPage.tsx

## PP-MS11: Commercial Release Preparation
**Sessions: 2 | Units: 3 | Priority: HIGH | DEPENDS_ON: PP-MS9 + PP-MS10**

### SESSION PP-MS11-1: Navigation + Analytics + Docs
**SMART CONFIG:** role=R7-Product + R5-Frontend | model=sonnet | effort=high | context_budget=60K

**U-PP46: Post Processor navigation wiring**
- Add /post-processor to shellCatalog.ts navigation
- Add breadcrumb from /ppg back to /post-processor
- Ensure /post-processor is discoverable from command palette
- FILES_MODIFIED: [web/src/components/shell/shellCatalog.ts, web/src/pages/PostProcessorGeneratorPage.tsx]
- ABORT_CRITERIA: [nav entry missing, breadcrumb link broken, command palette search fails to find "post processor"]
- ROLLBACK: git checkout web/src/components/shell/shellCatalog.ts web/src/pages/PostProcessorGeneratorPage.tsx

**U-PP47: Analytics and telemetry**
- Track: machines selected, features toggled, posts generated, downloads completed
- Funnel: product page → machine selection → generate → download conversion
- Feed into business dashboard
- FILES_CREATED: [src/engines/PostProcessorTelemetryEngine.ts]
- ABORT_CRITERIA: [telemetry events not firing, funnel metrics missing a step, dashboard integration error]
- ROLLBACK: git rm src/engines/PostProcessorTelemetryEngine.ts

**U-PP48: Documentation and help content**
- In-app tooltips for every feature toggle
- FAQ entries for common controller-specific questions
- "Getting Started" guide embedded in PPG page header
- FILES_MODIFIED: [web/src/pages/PostProcessorGeneratorPage.tsx, web/src/pages/PostProcessorPage.tsx]
- ABORT_CRITERIA: [tooltips don't render, FAQ content missing, guide section empty]
- ROLLBACK: git checkout web/src/pages/PostProcessorGeneratorPage.tsx web/src/pages/PostProcessorPage.tsx

**EXIT GATE PP-MS11 (FINAL):**
- [ ] Complete user flow: select machine → configure features → generate → preview → download
- [ ] 24+ controller dialects with machine-specific customization
- [ ] 180+ CPS files parsed and indexed
- [ ] 232+ machine profiles mapped to post configurations
- [ ] Before/after preview working
- [ ] 3+ download formats (.nc, .mpf, .h)
- [ ] Prove-out mode available
- [ ] Post library searchable
- [ ] Product page complete with workflow diagram, ROI calculator, CAM grid
- [ ] All integration tests passing
- [ ] Pipeline < 5s for full physics post on 5-axis program
- [ ] Analytics funnel tracks: page view → machine select → generate → download conversion
- [ ] In-app tooltips render for every feature toggle
- OMEGA_FLOOR: >= 1.0
- NEW_HOOKS: enforce-pp-release-checklist.sh (blocks release if any MS0-MS10 gate incomplete)
- NEW_ACTIONS: ppg_telemetry_funnel (returns conversion metrics), ppg_release_status (returns gate completion %)
- NEW_SKILLS: /release-ready (verify all 12 exit gates pass, run final validation sweep)
- ROLLBACK: git checkout web/src/components/shell/shellCatalog.ts + git rm src/engines/PostProcessorTelemetryEngine.ts

---

## DEPENDENCY GRAPH

```
                    PP-MS0 (Constants + Dialects) ─── ROOT
                   /          |                \
              PP-MS1      PP-MS7            PP-MS8
           (CPS Parser)  (Coolant/Probe)   (Non-Trad)
                |         needs MS0+MS2      needs MS0
              PP-MS2          \                /
           (Fingerprint)       \              /
            /        \          \            /
        PP-MS3    PP-MS7*        \          /
        (UI)      starts here     \        /
          |                        \      /
        PP-MS4                   PP-MS9
      (Preview)               (Integration Tests)
       /      \               needs MS6+MS7+MS8
    PP-MS5   PP-MS10                |
   (Prove)   (Product)              |
      |         \                   |
    PP-MS6       \                  |
   (Library)      \                 |
      \            \               /
       └──────→ PP-MS11 (RELEASE) ←──┘
              needs MS9 + MS10
```

### MILESTONE GATE RULES (MANDATORY)
- Do NOT start a milestone until ALL DEPENDS_ON milestones have PASSED their EXIT GATE
- PASS EXIT_GATE → proceed to next milestone
- FAIL EXIT_GATE → rollback per ROLLBACK instructions, fix issues, re-attempt gate
- tsc --noEmit must pass before starting ANY milestone
- CONFLICT: if a parallel branch (MS7/MS8) is in-progress when an upstream (MS0) fails re-test, ABORT the parallel branch, fix upstream first, then resume
- RE-ENTRY: a failed milestone can be retried without restarting upstream IF upstream gates still pass

### PARALLELIZATION OPPORTUNITIES
- **PP-MS7** (Coolant/Probing) can start after PP-MS2 completes, IN PARALLEL with PP-MS3/MS4/MS5
  - Saves 4-6 sessions on critical path
  - MS7 needs: MS0 + MS2 (both complete by end of Phase 1)
  - MS7 does NOT need MS3/MS4/MS5
- **PP-MS8** (Non-Traditional) can start after PP-MS0 completes, IN PARALLEL with MS1-MS6
  - Saves 2-4 sessions on critical path
  - MS8 needs: MS0 only
- **PP-MS10** (Product Page) can start after PP-MS4, IN PARALLEL with PP-MS5/MS6
  - MS10 is frontend-only, independent of PP-MS5/MS6 backend work
- All parallel branches converge at **PP-MS9** (Integration Tests) and **PP-MS11** (Release)

### CRITICAL PATH (sequential minimum)
PP-MS0 → PP-MS1 → PP-MS2 → PP-MS3 → PP-MS4 → PP-MS5 → PP-MS6 → PP-MS9 → PP-MS11
= 9 milestones, 20 sessions on main chain (MS0:2 + MS1:3 + MS2:2 + MS3:3 + MS4:2 + MS5:2 + MS6:2 + MS9:2 + MS11:2)
Total across all milestones: 26 sessions (MS7:2 + MS8:2 + MS10:2 run in parallel windows)
With optimal parallelization: ~20 sessions (parallel branches absorbed into main chain duration)

### PREREQUISITE ASSUMPTIONS
- Node 20+ with npm installed
- Vite dev server: `npm run dev` succeeds (backend 3000, frontend 3100)
- tsc --noEmit passes before each milestone
- CPS library accessible at configured path (C:\PRISM\BOX\FUSION BASIC POSTS\ or env var)

## COMPACTION STRATEGY

- /compact after every 2-3 units (or earlier if context pressure exceeds 80% budget)
- ESTIMATED_CONTEXT: 60-100K tokens per session
- Milestone boundaries are natural compact points
- If /compact fails: manual recovery at H:/prism/state/HANDOFF.md

SURVIVAL DIRECTIVES (what HANDOFF.md must preserve per-compact):
  - Current unit ID and completion status (e.g., "U-PP07 done, U-PP08 in progress")
  - Exit gate checklist status for current milestone
  - Test pass/fail counts from last run
  - /prism-review findings summary (if any open)
  - Physics constants being tested (exact values, not approximations)
  - Engine file paths modified this session
  - Next-unit prerequisites and blockers

## ROLE MATRIX

| Role | Milestones | Focus |
|------|-----------|-------|
| R2-Engine | PP-MS0, PP-MS1, PP-MS2, PP-MS5, PP-MS7, PP-MS8 | Backend engine creation |
| R3-Wiring | PP-MS1, PP-MS2 | Dispatcher + route wiring |
| R5-Frontend | PP-MS3, PP-MS4, PP-MS6, PP-MS10 | UI components |
| R6-Test | PP-MS9 | Integration testing |
| R7-Product | PP-MS10, PP-MS11 | Commercial readiness |

## TOOL MAP

| Tool/Skill | Used By | Purpose |
|------------|---------|---------|
| /cps-analyze | PP-MS1 | Parse CPS files |
| /forge-engines | PP-MS0-MS2, MS5-MS8 | Create new engines |
| /forge-wiring | PP-MS1-MS2 | Wire to dispatchers |
| /prism-review | Every session | Quality gate |
| /test | Every session | Run affected tests |
| /physics-verify | PP-MS0 | Verify canonical constants |
| /program-validate | PP-MS5, MS9 | Validate G-code output |
| /navigate | All sessions | Find existing code |
| /action-search | All sessions | Find existing actions |
