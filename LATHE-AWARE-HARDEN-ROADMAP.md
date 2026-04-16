# LATHE-AWARE-HARDEN — Lathe-Specific Comprehensive Awareness Roadmap (v7, FINAL)

**Generated:** 2026-04-15
**Revision:** v7 (inventory alignment — PRISM-INVENTORY-2026-04-15.md counts verified)
**Coordination:** Subordinate to PRISM-wide awareness (sibling chat); mirrors MILL-INTEG-MS1 pattern
**Forge Audit Quality Baseline:** 94/100
**Status:** READY FOR EXECUTION — Omega target 1.0

---

## v7 Inventory Alignment Changelog (PRISM-INVENTORY-2026-04-15.md)

| Field | Old | New | Source |
|-------|-----|-----|--------|
| Total engines | 1,846 | 1,869 | PRISM-INVENTORY-2026-04-15.md |
| Dispatchers | 84 | 85 | PRISM-INVENTORY-2026-04-15.md |
| Actions | 4,296 | 2,720+ | PRISM-INVENTORY-2026-04-15.md (verified baseline) |
| Formulas | (missing) | 509 | FormulaRegistry count |
| Hooks | (missing) | 227 | HookRegistry count |
| Skills | (missing) | 66 | SkillRegistry count |
| Scripts | (missing) | 52 | Script file count |
| Tribal tips | 3,746 | 4,493 | TribalKnowledgeRegistry count |
| JM Die programs | 24,545 | 36,929 | JM DIE archive scan |
| Tools DB | (missing) | 95,608 | ToolRegistry count |
| Materials DB | (missing) | 6,372 | MaterialRegistry count |
| Machines DB | (missing) | 910 | MachineRegistry count |
| Strategies DB | (missing) | 698 | StrategyRegistry count |

---

## v6 Scrutiny Changelog (5-Agent Pass)

| Agent | Finding | Fix Applied |
|-------|---------|-------------|
| **5A Physics** | E057 centrifugal force → actually in ChuckJawForceEngine | U-LAT16 engine reference corrected |
| **5B Wiring** | turningDispatcher has 77 actions (not ~95) | Scope Snapshot updated to 91 total |
| **5B Wiring** | turningProgramDispatcher has 14 actions (not 12) | Scope Snapshot updated |
| **5B Wiring** | MillMaster lacks `awareness_snapshot` type | Documented as lathe-only extension |
| **5C AGI** | WinMax missing from ControllerFeatureMatrixEngine | Added prerequisite note to MS9 |
| **5D Tests** | Baseline is 55 tests (not 31) | All test counts corrected |
| **5E Data** | OKUMA MULTUS PDFs directory EMPTY | Warning added to MS4 input sources |
| **5E Data** | Fixture CAD has 52 files (not 33) | MS6 counts corrected |

---

## Scope Snapshot

### FULL PRISM Inventory (AGI can utilize ALL) — v7 aligned with PRISM-INVENTORY-2026-04-15.md
- **1,869 total engines** → AGI routing queries `PRISMSelfAwarenessEngine.recommendAIFeatures()`
- **509 formulas** → cutting force, tool life, thermal, deflection, surface finish, chatter, materials, cost, AI/ML, optimization, quality, geometry, physics
- **53 algorithms** → optimization, physics, ML, scheduling, geometry, control, signal, manufacturing
- **85 dispatchers / 2,720+ actions** → full cross-domain routing available
- **13 AI categories** → reasoning, learning, intelligence, orchestration, agent, advisor, prediction, optimization, knowledge, nlp, vision, physics, deep_ai
- **227 hooks** → validation, lifecycle, safety, pre/post-action
- **66 skills** → slash command capabilities
- **52 scripts** → automation scripts
- **40 cadences** → scheduled cadence functions

### Data Assets (available for lathe AI training)
- **95,608 cutting tools** → in ToolRegistry
- **6,372 materials** → in MaterialRegistry
- **910 machines** → in MachineRegistry
- **698 toolpath strategies** → in StrategyRegistry
- **20 post processors** → in PostProcessorRegistry
- **225 MIT courses** → 9 integrated, 216 pending
- **69 video transcripts** → Haas, Okuma, Mitsubishi, Fanuc, Mazak, Siemens
- **1,255 tests** → vitest test cases

### Lathe-Specific (this roadmap builds)
- **71 lathe/turning engines** → each needs forge-triple validation, AGI routing integration
- **91 lathe actions** across 2 dispatchers (turningDispatcher 77, turningProgramDispatcher 14) ← v6 CORRECTED
- **55 lathe test files** → target 70+ after completion ← v6 CORRECTED (was 31)
- **5 programming styles** → macro, hardcode, CAM, conversational (6 types), hybrid
- **6 conversational systems** → Mazatrol, WinMax, Klartext, navi-mill, ShopMill, Manual Guide i
- **36,929 JM Die programs** → indexed but not queryable by programming type ← v7 CORRECTED (was 24,545)
- **15+ controller families** → Fanuc, Okuma OSP, Mazak, Hurco, Siemens, Heidenhain, etc.
- **4,493 tribal tips** → 285 lathe-relevant, target 500+ after ingestion phases ← v7 CORRECTED (was 3,746)

## Estimated Artifacts (revised after v4 scrutiny — AGI routing + programming style selection)
| Type | Count | Location |
|------|-------|----------|
| **MS0-MS8 Engines** | **11** | `mcp-server/src/engines/E096-E106` |
| **MS9-MS12 AGI Routing Engines** | **4** | `mcp-server/src/engines/E107-E110` |
| **Total new engines** | **15** | `mcp-server/src/engines/` |
| **New dispatcher actions** | **17** | `turningDispatcher.ts` z.enum |
| **Test suites (T040-T055)** | **16** | `mcp-server/src/__tests__/` |
| **Skill** | **1** | `~/.claude/commands/lathe-aware.md` |
| **Hook** | **1** | `~/.claude/hooks/lathe-pre-action-awareness-inject.js` |
| **State files** | **3** | `data/state/LATHE_*.json` |
| **Data catalogs** | **5** | `data/` (vendor tools, machine kinematics, hyperMILL, fixtures, posts) |
| **Tribal tips delta** | **~215** | `TribalKnowledgeEngine.KNOWLEDGE_BASE` |
| **Total artifacts** | **~60** | |

**Coverage targets after full MS12:**
- **Programming style routing**: 2 styles (macro/hardcode) → 5+ styles (100% coverage)
- **Conversational AGI routing**: 0% → 100% (6 conversational systems supported)
- **Program catalog queryable by type**: 0% → 100% (24,545 programs indexed by style)
- **Cost model integration**: 0% → 100% (full cost comparison API)
- **Future planning integration**: 0% → 100% (family ROI analysis)
- **External asset wiring ratio**: 60% → ≥95%
- **Tribal tips lathe-relevant**: ~285 → ≥500
- **Test coverage**: 55 → 70+ test files ← v6 CORRECTED
- **Facade parity with MillMaster**: 0% → 100%

---

## ⚠ CRITICAL SCRUTINY FINDINGS — READ FIRST

**Pass 1** (`v2 Baseline Verification`) — codebase claim verification:
- **v2 claimed 95 lathe engines** — ACTUAL: **59** Lathe* + 12 Turning* = **71** (overcounted by 24)
- **v2 claimed h=250 hardcoded in E049** — ACTUAL: LatheThermodynamicsEngine has `COOLANT_DATABASE` with per-coolant h_typical — **STRUCK from fixes**
- **v2 claimed AABB collision detection** — ACTUAL: LatheCollisionZoneEngine uses geometric radius — **recharacterized as needs swept-volume**
- **v2 found 2 eval() sites** — ACTUAL: **6 unsafe callsites** (E073×2, NLHookEngine×3, TribalKnowledgeEngine×1)
- **v2 claimed 20× `as any` in E064** — ACTUAL: **18×** (close enough)
- **hyperMILL tips registration gap**: extraction-log.json shows 25, actual files contain **434** — **409 tips unregistered**

**Pass 2** (`v3 Data Integrity`) — registry verification:
- **hyperMILL tips exist but not registered** — `hypermill-tribal-tips-*.json` has 434 tips, extraction-log only references 25
- **Corrected baseline**: 71 lathe engines (not 95), 6 eval sites (not 2), 18 `as any` (not 20)
- **console.log cleanup**: 25 occurrences (not 31 as v2 claimed)

**Pass 3** (`v4 AGI Routing Gaps`) — CRITICAL programming style routing:
- **No unified programming style selector** — AGI only knows macro vs hardcode, missing CAM + 6 conversational types
- **ControllerFeatureMatrixEngine has data, no routing** — knows Mazatrol/WinMax/Klartext capabilities, no decision logic
- **LatheIntelligenceEngine.decideMacroVsHardCode()** — covers 2 of 5+ styles only
- **24,545 programs indexed but not queryable by type** — can't answer "show similar macro programs"
- **No cost model** — can't compare CAM programming cost ($200/hr) vs conversational at machine ($85/hr)
- **No future planning** — doesn't recommend macro investment based on part family potential
- **Operation sequencing ≠ programming style selection** — LatheSequenceOptimizerEngine handles operation order, not approach selection

**Pass 4** (`v5 UNIVERSAL Format Alignment`) — structural completeness:
- **Missing Unit-level breakdowns** — milestones need U-LAT01, U-LAT02 format
- **Missing Exit Gates per milestone** — need testable criteria per phase
- **Missing Anti-patterns per milestone** — need explicit don't-do lists
- **Missing Leverage Existing sections** — not citing existing engines to extend
- **Missing AGI Parity Test** — need 5 scripted canary checkpoints

---

## Phase 0 — Foundation (MS0-MS1)

### MS0 — PREFLIGHT (2h)

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-LAT01 | `DuplicationGuardEngine.checkBeforeCreating()` calls | Verify dedup for all 15 new engines |
| U-LAT02 | `data/state/LATHE_AWARENESS_SPEC_v7.json` | Dedup-aware asset map with corrected baseline (v7: inventory aligned) |
| U-LAT03 | `sandvik-tools-extracted.json` validation | Parse, count entries, confirm schema (693KB) |
| U-LAT04 | `extraction-log.json` delta analysis | Build list for MS2-MS7 (new assets only) |
| U-LAT05 | Baseline snapshot | 94/100 quality, 71 engines, 107 actions, 31 tests |

**Leverage Existing:**
- `DuplicationGuardEngine.checkBeforeCreating()` — already mandated, verify calls
- `extraction-log.json` — existing registry, read delta
- `LatheSelfAwarenessIntegrationEngine` (E046, 3,198 lines) — query for existing capabilities

**Exit Gates:**
- [ ] `sandvik-tools-extracted.json` parses without error, ≥1000 entries
- [ ] `extraction-log.json` read successfully, delta list generated
- [x] `LATHE_AWARENESS_SPEC_v7.json` written with 71 lathe engines + full PRISM inventory counts
- [ ] Baseline snapshot matches: 71 engines, ~107 actions, 31 tests
- [ ] Corrected 6 eval/Function sites documented

**Anti-patterns:**
- Do NOT re-extract already-extracted assets (check extraction-log first)
- Do NOT create new awareness engine (extend LatheSelfAwarenessIntegrationEngine)
- Do NOT skip dedup check for any new engine

---

### MS0.5 — HYPERMILL REGISTRATION FIX (1h) — v3 Critical Data Fix

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-LAT06 | `extraction-log.json` update | Fix hypermill-manual entry to reference 434-tip file |
| U-LAT07 | `hypermill-tribal-comprehensive` entry | New entry pointing to full 434-tip file |
| U-LAT08 | `TribalKnowledgeEngine` verification | Confirm tips loadable and searchable |

**Leverage Existing:**
- `hypermill-tribal-tips-1776036032655.json` — 434 tips already extracted, just unregistered
- `TribalKnowledgeEngine.searchTribalKnowledge()` — existing search API

**Exit Gates:**
- [ ] `extraction-log.json` hypermill-manual entry updated to correct count
- [ ] New `hypermill-tribal-comprehensive` entry added
- [ ] `tribalKnowledgeEngine.searchTribalKnowledge("hypermill contour").length >= 50`
- [ ] Total hyperMILL tips in system: ≥434

**Anti-patterns:**
- Do NOT re-extract hyperMILL tips (they exist, just register them)
- Do NOT modify the actual tip files (only update registry)

---

### MS1 — CRITICAL FIXES (1 day)

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-LAT09 | eval() replacement in E073:2340 | Replace `new Function()` with expr-eval sandbox |
| U-LAT10 | eval() replacement in E073:2370 | Replace `eval()` with AST walker |
| U-LAT11 | eval() replacement in NLHookEngine:68,918,929 | 3 `new Function()` → safe sandbox |
| U-LAT12 | eval() replacement in TribalKnowledgeEngine:1063 | `new Function()` → safe sandbox |
| U-LAT13 | `writeFileSync` wrap in E023:518 | `atomicWrite()` wrapper |
| U-LAT14 | S(x) hard block in E042 | Integrate OmegaSafetyScoreEngine (0.70 threshold) |
| U-LAT15 | Swept-volume collision in E014 | Replace geometric radius with 3D swept-volume |
| U-LAT16 | Centrifugal loss in ChuckJawForceEngine | Add speed-dependent chuck force scaling ← v6 CORRECTED (was E057)
| U-LAT17 | FRF coupling in E055 | Add proper chatter prediction (15-20% overprediction fix) |
| U-LAT18 | `as any` cleanup in E064 | Replace 18× with `DrillInsert` interface |
| U-LAT19 | console.log removal in E023 | Remove 25× debug statements |
| U-LAT20 | T040 test suite | `LatheCriticalFixes.test.ts` regression guard |

**Leverage Existing:**
- `expr-eval` npm package — already in dependencies for safe math evaluation
- `atomicWrite()` utility — already exists in `src/utils/atomicWrite.ts`
- `OmegaSafetyScoreEngine` — already implements S(x) scoring
- `DrillInsert` interface — already defined in types

**Exit Gates:**
- [ ] `grep -r "new Function\|eval(" src/engines/OkumaParametricProgramEngine.ts` returns 0
- [ ] `grep -r "new Function\|eval(" src/engines/NLHookEngine.ts` returns 0
- [ ] `grep -r "new Function\|eval(" src/engines/TribalKnowledgeEngine.ts` returns 0
- [ ] `grep "writeFileSync" LatheFullArchiveTrainingEngine.ts` returns only wrapped calls
- [ ] `grep "as any" TurningPrintToProgramEngine.ts | wc -l` returns 0
- [ ] T040 test suite: ≥20 tests, all passing
- [ ] S(x) < 0.70 demonstrably blocks output in E042

**Anti-patterns:**
- Do NOT use `// @ts-ignore` to hide type errors — fix the types
- Do NOT replace eval with string interpolation (still unsafe)
- Do NOT remove safety checks to fix type errors

---

## Phase 1 — Data Ingestion (MS2-MS7)

### MS2 — SANDVIK DELTA + VENDOR CATALOG INGESTION (2.5 days)

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-LAT21 | `E096 VendorTurningCatalogExtractor` | Extract turning tools from vendor PDFs (~700 lines) |
| U-LAT22 | `data/tool-catalogs/turning-vendor-catalog.json` | Unified tool catalog schema |
| U-LAT23 | `lathe_vendor_tool_lookup` action | Dispatcher action on turningDispatcher |
| U-LAT24 | `lathe_insert_grade_select` action | ISO grade selection action |
| U-LAT25 | `lathe_iso_code_resolve` action | ISO code resolution action |
| U-LAT26 | T041 test suite | `VendorTurningCatalogExtractor.test.ts` ≥25 tests |

**Input Sources:**
- `H:\PRISM\resources\MANUFACTURER_CATALOGS\uploaded\*.pdf` (Sandvik GC, Korloy, Iscar, YG, REGO-FIX, Threading 2018)
- Existing: `sandvik-tools-extracted.json` (693KB partial) — extract delta only

**Leverage Existing:**
- `sandvik-tools-extracted.json` — validate coverage, extract delta only
- `ToolCatalogEngine` — extend with turning-specific fields
- `/pdf-learn` skill — use for PDF extraction pipeline

**Exit Gates:**
- [ ] `turning-vendor-catalog.json` contains ≥5000 tool entries
- [ ] Each vendor (Sandvik, Korloy, Iscar, YG, REGO-FIX) has ≥100 entries
- [ ] `lathe_vendor_tool_lookup` returns results for "CNMG 120408"
- [ ] T041: ≥25 tests, sample per vendor passing
- [ ] No duplicate entries from Sandvik (delta extraction verified)

**Anti-patterns:**
- Do NOT re-extract already-ingested Sandvik entries — delta only
- Do NOT create separate engines per vendor — unified extractor
- Do NOT store raw PDF text — structured JSON only

---

### MS3 — OKUMA MACHINE CAD + SIMULATION KINEMATICS (1.5 days)

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-LAT27 | `E097 OkumaMachineKinematicsIngester` | Parse STEP files for axis geometries (~500 lines) |
| U-LAT28 | `data/machine-handbooks/okuma-machines-full.json` | 40+ machine entries with kinematics |
| U-LAT29 | `MACHINE_SIMULATION_MODELS/OKUMA/` population | Canonical simulation handles |
| U-LAT30 | `lathe_machine_kinematics_lookup` action | Dispatcher action |
| U-LAT31 | T042 test suite | `OkumaMachineKinematicsIngester.test.ts` ≥20 tests |

**Input Sources:**
- `H:\PRISM\resources\MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION\OKUMA\*.step` (40 files, 500MB)
- Models: VTM, MB, MU, MCR, MILLAC series

**Leverage Existing:**
- `MachineKinematicsEngine` — extend with Okuma-specific kinematics
- `ShopConfigurationEngine` — references JM Die's 7 Okuma lathes

**Exit Gates:**
- [ ] `okuma-machines-full.json` contains ≥40 machine entries
- [ ] Each entry has: axis_geometries, work_envelope, tool_magazine_size, spindle_config
- [ ] `MACHINE_SIMULATION_MODELS/OKUMA/` contains ≥40 simulation handles
- [ ] `lathe_machine_kinematics_lookup("MULTUS B250IIW")` returns valid data
- [ ] T042: ≥20 tests passing

**Anti-patterns:**
- Do NOT parse STEP files synchronously — use streaming parser
- Do NOT store full STEP geometry — extract key dimensions only
- Do NOT create machine entries without work envelope bounds

---

### MS4 — OKUMA MULTUS + OSP PROGRAMMING PDF EXTRACTION (2 days, parallelizable with MS3)

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-LAT32 | `E098 OkumaManualKnowledgeExtractor` | Extract tips from 3.5GB PDFs (~600 lines) |
| U-LAT33 | `okuma-multus-manuals` extraction-log entry | Track extracted manual tips |
| U-LAT34 | `okuma-osp-programming-pdfs` extraction-log entry | Track OSP programming tips |
| U-LAT35 | Tribal tip injection | Feed `TribalKnowledgeEngine.addTip()` |
| U-LAT36 | T043 test suite | `OkumaManualKnowledgeExtractor.test.ts` ≥20 tests |

**Input Sources:**
- `H:\PRISM\resources\OKUMA MULTUS PDFS\**\*.pdf` — ⚠️ v6: DIRECTORY EMPTY, verify actual location or source PDFs
- `RESOURCE PDFS\Okuma-OSP-P200L-Programming.pdf`
- `OSP-P200L-Macturn-Multus-Series-Operation-Manual-LE32-114-R4.pdf`
- `InventorCAM2024_Turning_&_Mill-Turn_Training_Course.pdf`

**Leverage Existing:**
- Existing 63 Okuma OSP tips in extraction-log — dedup against these
- `/pdf-learn` skill — use for PDF extraction
- `TribalKnowledgeEngine.addTip()` — existing tip injection API

**Exit Gates:**
- [ ] extraction-log.json contains `okuma-multus-manuals` with ≥100 tips
- [ ] extraction-log.json contains `okuma-osp-programming-pdfs` with ≥50 tips
- [ ] Zero duplicates with existing 63 Okuma OSP tips (semantic hash dedup)
- [ ] `searchTribalKnowledge("MULTUS B-axis")` returns ≥5 results
- [ ] T043: ≥20 tests passing

**Anti-patterns:**
- Do NOT re-extract already-extracted 63 Okuma tips
- Do NOT extract from PDFs synchronously — batch with progress
- Do NOT skip semantic dedup (hash collision with existing tips)

---

### MS5 — HYPERMILL TURNING CONFIG + MULTUS PROGRAM MINING (1.5 days)

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-LAT37 | `E099 HyperMillTurningConfigIngester` | Parse cycTurn.def, Stocklist.xlsx (~400 lines) |
| U-LAT38 | `data/hypermill/turning-strategy-catalog.json` | Turning strategy catalog |
| U-LAT39 | `lathe_hypermill_strategy_lookup` action | Dispatcher action |
| U-LAT40 | `E100 MarksMultusPatternMiner` | Extract patterns from .MIN files (~500 lines) |
| U-LAT41 | `src/data/marks-multus-patterns.ts` | Typed pattern library |
| U-LAT42 | `lathe_pattern_inject` action | Dispatcher action |
| U-LAT43 | T044, T045 test suites | ≥40 tests combined |

**Input Sources:**
- `resources/HYPERMILL/hyperMILL/31.0,33.0/*/cycTurn*`
- `Stocklist.xlsx`, `Automation_Center_Standard_ToolDB.db`, `MacroDB_Template.db`
- 77 `.min` files in `resources/MULTUS PROGRAMS/`
- Sample-based mining of 16,558 JM Die `.MIN` files

**Patterns to Extract:**
- grab-pull-cutoff sequence
- part-counter loop
- Mark's S1/S2 cutoff technique
- bar-pull timing
- working-spindle grab

**Leverage Existing:**
- `hypermill-tribal-tips-*.json` (434 tips) — already fixed in MS0.5
- `LatheJMDieKnowledgeEngine` — existing JM Die program analyzer

**Exit Gates:**
- [ ] `turning-strategy-catalog.json` contains ≥20 strategies
- [ ] `marks-multus-patterns.ts` exports ≥10 typed patterns
- [ ] `lathe_hypermill_strategy_lookup("facing")` returns results
- [ ] `lathe_pattern_inject("grab_pull_cutoff")` returns valid pattern
- [ ] T044 + T045: ≥40 tests combined passing

**Anti-patterns:**
- Do NOT re-index all 16,558 JM Die programs — sample-based only
- Do NOT create patterns without source program reference
- Do NOT skip pattern validation against actual program behavior

---

### MS6 — FIXTURE CAD + MACRO CONVERTER BRIDGES (1 day, parallelizable with MS5)

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-LAT44 | `E101 FixtureCADIngester` | Parse Inventor .ipt/.iam files (~400 lines) |
| U-LAT45 | `data/fixtures/okuma-finalized-setups.json` | 33 fixture entries with collision meshes |
| U-LAT46 | `lathe_fixture_cad_query` action | Dispatcher action |
| U-LAT47 | `E102 OkumaMacroConverterBridge` | Python macro converter wrapper (~300 lines) |
| U-LAT48 | `lathe_macro_hardcode` action | Convert macro to hardcode action |
| U-LAT49 | T046, T047 test suites | ≥30 tests combined |

**Input Sources:**
- `H:/PRISM/JM DIE/OKUMA/FINALIZED SETUPS/*.ipt,*.iam` (52 files, 8.7 GB) ← v6 CORRECTED
- `resources/PRISM FOLDER FROM HOME/MACRO TO HARD CODE CONVERTER/OkumaMacroConverter/okuma_macro_converter.py`

**Leverage Existing:**
- Inventor COM API or STEP/IGES fallback for CAD parsing
- `execFileNoThrow` utility — no shell injection for Python bridge

**Exit Gates:**
- [ ] `okuma-finalized-setups.json` contains 52 fixture entries ← v6 CORRECTED
- [ ] Each fixture has: collision_mesh_ref, mounting_points, clearance_envelope
- [ ] `lathe_fixture_cad_query("soft_jaws")` returns ≥5 results
- [ ] `lathe_macro_hardcode` successfully converts test macro
- [ ] T046 + T047: ≥30 tests combined passing
- [ ] Python bridge uses `execFileNoThrow` (no shell injection)

**Anti-patterns:**
- Do NOT use shell exec for Python calls — `execFileNoThrow` only
- Do NOT fail silently on Inventor COM unavailable — fallback to STEP
- Do NOT store full CAD geometry — collision mesh + key dims only

---

### MS7 — VIDEO CONTENT MINING + FUSION POST DELTA (1 day)

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-LAT50 | `E103 OkumaGosigerTranscriptMiner` | Mine SRT transcript content (~400 lines) |
| U-LAT51 | Tribal tips from transcripts | 50-150 new tips expected |
| U-LAT52 | `E104 FusionLathePostDeltaRegistry` | Register 35+ unregistered posts (~200 lines) |
| U-LAT53 | `data/post-processors/lathe-post-registry.json` | Unified post registry |
| U-LAT54 | `lathe_fusion_post_lookup` action | Dispatcher action |
| U-LAT55 | T048, T049 test suites | ≥30 tests combined |

**Input Sources:**
- `data/video-learned/transcripts/*.srt` (7 videos, 6h08m total)
- `resources/FUSION BASIC POSTS/*turning*.cps` + `*mill-turn*.cps` (40+ files)
- Custom: `FUSION POSTS/OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5.2.5 2.cps`

**Leverage Existing:**
- Existing 7 video metadata in `okuma-gosiger-training-knowledge.json` — mine content only
- Existing 5 post strategies in `fusion-post-strategies.json` — register delta only
- `TribalKnowledgeEngine` — for tip injection

**Exit Gates:**
- [ ] `searchTribalKnowledge("Gosiger")` returns ≥50 new tips
- [ ] Zero duplicates with existing 63 Okuma tips (semantic dedup)
- [ ] `lathe-post-registry.json` contains ≥40 post entries
- [ ] Custom PRISM-Enhanced post registered with machine crossref
- [ ] `lathe_fusion_post_lookup("MULTUS")` returns PRISM-Enhanced post
- [ ] T048 + T049: ≥30 tests combined passing

**Anti-patterns:**
- Do NOT re-extract video metadata (already done)
- Do NOT re-analyze the 5 already-registered posts — delta only
- Do NOT inject tips semantically equivalent to existing ones

---

## Phase 2 — Orchestration (MS8)

### MS8 — TRIBAL INJECTION LAYER + COORDINATION FACADE (1.5 days)

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-LAT56 | `E105 TribalKnowledgeInjectorEngine` | Hook tribal into downstream engines (~500 lines) |
| U-LAT57 | SpeedFeedOrchestrator integration | Inject top-3 tribal tips before compute |
| U-LAT58 | PostProcessorPipeline integration | Inject tribal tips before post generation |
| U-LAT59 | LatheQualityGateEngine integration | Inject tribal tips before quality check |
| U-LAT60 | AutoProgramOrchestratorEngine integration | Inject tribal tips before program gen |
| U-LAT61 | `E106 LatheMasterOrchestratorFacadeEngine` | FORGE-TRIPLE ANCHOR (~500 lines) |
| U-LAT62 | `/lathe-aware` skill | Lathe domain awareness check |
| U-LAT63 | `lathe-pre-action-awareness-inject` hook | Pre-action context injection |
| U-LAT64 | `LATHE_AWARENESS_SNAPSHOT.json` | State file for cross-session coord |
| U-LAT65 | T050, T051 test suites | ≥55 tests combined |

**Leverage Existing:**
- `TribalKnowledgeEngine.searchTribalKnowledge()` — existing search API
- `MachiningPlaybookEngine` — 308 rules, bridge with tribal tips
- `OrchestrationContext.sharedKnowledge` — existing IPC mechanism
- `MillMasterOrchestratorFacadeEngine` (MILL-INTEG-MS1) — **MIRROR EXACTLY**
- `EventBus` — existing pub/sub for orchestration events
- `prismSelfAwarenessEngine` — existing PRISM-wide awareness

**E106 API Shape (mirrors MillMaster + lathe extension):**
```typescript
// Note: "awareness_snapshot" is lathe-only extension — MillMaster has 6 types, we add 7th
type LatheOrchRequestType = "print_to_program"|"scientific"|"agi"|"validate"|"quick"|"wisdom"|"awareness_snapshot";

interface LatheOrchRequest {
  type: LatheOrchRequestType;
  material?: string;
  operation?: string;            // roughing|finishing|threading|grooving|parting|boring|drilling
  tool_diameter_mm?: number;
  rpm?: number;
  feed_mm_rev?: number;
  cutting_speed_m_min?: number;
  axial_depth_mm?: number;
  material_iso?: "P"|"M"|"K"|"N"|"S"|"H";
  wisdom_category?: string;
  print?: unknown;
  include_resources?: boolean;
  include_tribal?: boolean;
  include_jm_die?: boolean;
}

interface LatheOrchResponse {
  request_type: LatheOrchRequestType;
  routed_to: string;
  primary_result: unknown;
  supplemental: { resources?: unknown; tribal_tips?: unknown; jm_die_context?: unknown; };
  provenance: { engines_invoked: string[]; formulas_touched: string[]; confidence: number; };
  ts: string;
}
```

**Exit Gates:**
- [ ] E105 injects tribal tips into 4 downstream engines (verified via sharedKnowledge)
- [ ] E106 `orchestrate()` method matches MillMasterOrchestratorFacadeEngine signature exactly
- [ ] E106 routes all 7 request types to correct sub-orchestrators
- [ ] `/lathe-aware` skill returns awareness snapshot with wiring ratio
- [ ] Hook fires on `turningDispatcher|turningProgramDispatcher` actions
- [ ] Hook latency <50ms (measured)
- [ ] `LATHE_AWARENESS_SNAPSHOT.json` written to `state/shared/`
- [ ] EventBus events `lathe_orchestration_started`, `lathe_orchestration_complete` published
- [ ] T050 + T051: ≥55 tests combined passing

**Anti-patterns:**
- Do NOT deviate from MillMaster facade shape — symmetry required for PRISM-wide routing
- Do NOT make tribal injection blocking — additive via sharedKnowledge only
- Do NOT skip EventBus publication — sibling chats depend on it
- Do NOT exceed 50ms hook latency — cache snapshot with 10min TTL

---

## Phase 3 — AGI Routing (MS9-MS12) — v4 CRITICAL

### MS9 — UNIFIED PROGRAMMING STYLE SELECTOR (2 days) — CRITICAL

**FULL PRISM UTILIZATION (1,869 engines, 509 formulas, 53 algorithms):** E107 MUST query `PRISMSelfAwarenessEngine.recommendAIFeatures()` and `AIFeatureAutoRegistryEngine.searchFeatures()` to leverage ALL relevant engines — not just lathe-specific ones. Include: optimization engines, cost engines, physics engines, knowledge engines, reasoning engines.

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-LAT66 | `E107 LatheProgrammingStyleSelectorEngine` | Multi-criteria style selection (~800 lines) |
| U-LAT66b | PRISMSelfAwarenessEngine integration | Query `recommendAIFeatures()` for all 1,869 engines + 509 formulas |
| U-LAT67 | ControllerFeatureMatrixEngine integration | Query conversational capabilities |
| U-LAT68 | `lathe_select_programming_style` action | Primary routing action |
| U-LAT69 | `lathe_compare_programming_costs` action | Cost comparison action |
| U-LAT70 | T052 test suite | `LatheProgrammingStyleSelectorEngine.test.ts` ≥40 tests |

**Input Schema:**
```typescript
interface StyleSelectionInput {
  controller: string;           // "okuma_osp_p300" | "mazatrol_smooth_ai" | "hurco_winmax" | etc.
  part_complexity: "simple" | "moderate" | "complex" | "very_complex";
  lot_size: number;
  family_parts_expected: number;
  operator_skill_level: "beginner" | "intermediate" | "expert";
  available_cam_seats: number;
  time_constraint: "urgent" | "normal" | "flexible";
  machine_availability: "dedicated" | "shared" | "bottleneck";
}
```

**Output Schema:**
```typescript
interface StyleRecommendation {
  recommended_style: "macro" | "hardcode" | "cam" | "conversational";
  conversational_type?: "mazatrol" | "winmax" | "klartext" | "navi_mill" | "shop_mill" | "manual_guide_i";
  reasoning: string[];
  cost_estimate: { programming_hr: number; machine_hr: number; total_cost: number };
  alternatives: Array<{ style: string; score: number; trade_off: string }>;
  future_planning: { reuse_potential: number; family_benefit: number };
}
```

**Leverage Existing:**
- `ControllerFeatureMatrixEngine` — has conversational capability data (5 of 6 types; ⚠️ v6: WinMax missing, add before MS9)
- `LatheIntelligenceEngine.decideMacroVsHardCode()` — extend, don't replace
- `LatheCAMIntelligenceEngine` — CAM cost/benefit data

**Exit Gates:**
- [ ] E107 handles all 5 programming styles (macro, hardcode, cam, conversational-6, hybrid)
- [ ] Conversational type selection works for: Mazatrol, WinMax, Klartext, navi-mill, ShopMill, Manual Guide i
- [ ] `lathe_select_programming_style` returns recommendation with reasoning
- [ ] `lathe_compare_programming_costs` returns ranked cost comparison
- [ ] Controller coverage: ≥15 controllers with routing support
- [ ] T052: ≥40 tests (every controller type + every scenario)
- [ ] AGI can answer: "What programming style for this simple part on the Mazak?"

**Anti-patterns:**
- Do NOT hardcode controller-to-style mappings — query ControllerFeatureMatrixEngine
- Do NOT ignore operator skill level — critical for conversational vs CAM
- Do NOT recommend conversational for complex 5-axis work
- Do NOT skip cost estimation — always include programming + machine time

---

### MS10 — PROGRAM CATALOG INDEX & RETRIEVAL (1.5 days)

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-LAT71 | `E108 LatheProgramCatalogEngine` | Queryable catalog by type/style (~600 lines) |
| U-LAT72 | Program classification pipeline | Classify all 36,929 programs by style |
| U-LAT73 | `lathe_find_similar_programs` action | Find similar programs by spec |
| U-LAT74 | `lathe_programming_history` action | Customer programming history |
| U-LAT75 | `lathe_catalog_stats` action | Pie chart data for styles |
| U-LAT76 | T053 test suite | `LatheProgramCatalogEngine.test.ts` ≥25 tests |

**Catalog Entry Schema:**
```typescript
interface ProgramCatalogEntry {
  program_id: string;
  path: string;
  programming_style: "macro" | "hardcode" | "cam" | "conversational";
  cam_system?: string;          // "hypermill" | "mastercam" | "fusion" | etc.
  conversational_type?: string; // "mazatrol" | "winmax" | etc.
  controller: string;
  customer: string;
  part_family?: string;
  features: string[];           // "threading" | "grooving" | "live_tooling" | etc.
  cycle_time_sec: number;
  created_date: Date;
  last_run_date?: Date;
  success_rate?: number;
}
```

**Leverage Existing:**
- `LatheJMDieKnowledgeEngine` — already indexes 36,929 programs
- `LatheFullArchiveTrainingEngine` — program analysis patterns
- JM Die program paths from `prismSelfAwarenessEngine.getJMDieProgramPaths()`

**Exit Gates:**
- [ ] 36,929 programs classified by programming style
- [ ] `findSimilarPrograms(partSpec, controller)` returns ranked matches
- [ ] `getProgrammingHistory("ALCOA")` returns style distribution
- [ ] `getStyleDistribution()` returns pie chart data
- [ ] T053: ≥25 tests passing
- [ ] Query response time <500ms for similarity search

**Anti-patterns:**
- Do NOT re-index programs — use existing LatheJMDieKnowledgeEngine data
- Do NOT classify programs synchronously — batch with progress
- Do NOT store classification outside catalog engine — single source of truth

---

### MS11 — PROGRAMMING COST MODEL (1 day, parallelizable with MS10)

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-LAT77 | `E109 LatheProgrammingCostEngine` | Cost comparison API (~400 lines) |
| U-LAT78 | JM Die shop rates configuration | Default rates from real shop data |
| U-LAT79 | `estimateProgrammingCost` method | Total cost by style + complexity |
| U-LAT80 | `compareApproaches` method | Ranked cost comparison |
| U-LAT81 | `breakEvenAnalysis` method | When does macro investment pay off |
| U-LAT82 | T054 test suite | `LatheProgrammingCostEngine.test.ts` ≥20 tests |

**Cost Model Schema:**
```typescript
interface ProgrammingCostModel {
  // CAM programming
  cam_seat_cost_per_hr: number;       // $200 (hyperMILL), $150 (Mastercam), etc.
  cam_programmer_rate_per_hr: number; // $80-120
  
  // Conversational at machine
  machine_rate_per_hr: number;        // $85 (lathe), $120 (mill-turn)
  operator_programming_rate: number;  // Often same as run rate
  
  // Hardcode / Macro
  manual_programmer_rate_per_hr: number; // $60-100
  
  // Time estimates by complexity
  time_by_complexity: Record<string, { cam: number; conversational: number; hardcode: number; macro: number }>;
}
```

**Leverage Existing:**
- `ShopConfigurationEngine` — JM Die shop rates
- `BusinessCostEngine` — existing cost calculation patterns
- `QuoteEstimatorEngine` — time estimation logic

**Exit Gates:**
- [ ] `estimateProgrammingCost("cam", "complex", 100)` returns total cost
- [ ] `compareApproaches(partSpec)` returns all 5 styles ranked by cost
- [ ] `breakEvenAnalysis(macroInvestment, [10, 50, 100])` returns ROI curve
- [ ] JM Die rates used as defaults (configurable override)
- [ ] T054: ≥20 tests passing

**Anti-patterns:**
- Do NOT hardcode rates — use shop configuration
- Do NOT ignore machine occupancy cost for conversational programming
- Do NOT compare without including programmer labor cost

---

### MS12 — FUTURE PLANNING ENGINE (1 day)

| Unit | Artifact | Purpose |
|------|----------|---------|
| U-LAT83 | `E110 LathePartFamilyPlanningEngine` | Family potential analysis (~400 lines) |
| U-LAT84 | Customer history analysis | Industry patterns from LatheJMDieKnowledgeEngine |
| U-LAT85 | `lathe_family_planning` action | Family likelihood + investment recommendation |
| U-LAT86 | `lathe_macro_roi` action | Macro investment ROI calculation |
| U-LAT87 | T055 test suite | `LathePartFamilyPlanningEngine.test.ts` ≥20 tests |

**Output Schema:**
```typescript
interface FamilyPlanningResult {
  family_likelihood: number;        // 0-1 probability of future similar parts
  recommended_investment: "none" | "macro" | "template" | "full_family_program";
  roi_estimate: { breakeven_quantity: number; year_1_savings: number };
  template_recommendations: string[];
  variable_dimensions: string[];
}
```

**Decision Factors:**
- Customer industry patterns (fasteners = high repeat)
- Part geometry repeatability
- Similar parts in archive
- Historical revision frequency
- Customer order history

**Leverage Existing:**
- `LatheJMDieKnowledgeEngine` — customer history, program archive
- `E109 LatheProgrammingCostEngine` — ROI calculations
- `ShopConfigurationEngine` — customer profile data

**Exit Gates:**
- [ ] `analyzeFamilyPotential(partSpec, customer)` returns family_likelihood 0-1
- [ ] `recommendInvestment()` considers customer industry patterns
- [ ] `lathe_family_planning` action returns structured recommendation
- [ ] `lathe_macro_roi` returns breakeven quantity + year 1 savings
- [ ] High-repeat customer (ALCOA fasteners) gets "macro" or "template" recommendation
- [ ] T055: ≥20 tests passing

**Anti-patterns:**
- Do NOT recommend macro investment for one-off customers
- Do NOT ignore customer industry — fastener industry = high repeat
- Do NOT skip breakeven analysis — always include quantity threshold

---

## Registration Pipeline (each artifact)

| Type | Registration |
|------|-------------|
| Engine | Auto-registered via file-watcher (AIFeatureAutoRegistryEngine) |
| Dispatcher action | Add to z.enum + actionSchemas Record + switch case atomically |
| Skill | Place in `~/.claude/commands/lathe-aware.md` (auto-discovered) |
| Hook | Add to `settings.json` PreToolUse matcher list |
| State file | Add to `data/state/` with schemaVersion field |
| Catalog | Add to `data/` with schema validation |

---

## Forge-Triple Integration (MANDATORY)

Every new engine MUST ship with:
1. **Test file** (T040-T055) — companion test suite
2. **Dispatcher action** — wired to turningDispatcher
3. **Documentation** — JSDoc with literature references

No engine commits without all 3. Extend existing `/forge-triple` to enforce via `hook_no_duplicate_engine` + post-forge verification.

---

## Coordination Handshake with PRISM-Wide Sibling Chat

**Sibling chat expected contract:** provides a PRISM-wide orchestrator that aggregates domains via `get{Domain}Snapshot()` across `lathe|mill|wedm|edm|grind|inspect`.

**Our deliverable:** `latheMasterOrchestratorFacadeEngine.orchestrate({ type: "awareness_snapshot" })` returns a snapshot matching `LatheOrchResponse`. The PRISM-wide orchestrator consumes this directly — no adapter needed because the shape matches `MillOrchResponse` (which already works in MILL-INTEG-MS1).

**Shared-state file:** `H:/PRISM/state/shared/LATHE_AWARENESS_SNAPSHOT.json` — refreshed on every `orchestrate("awareness_snapshot")` call. Sibling chat watches this file.

**Handshake verification (in MS8 sign-off):**
1. Publish `lathe_coordination_ready` event via EventBus
2. Write snapshot file
3. Read PRISM-wide snapshot file; confirm our domain appears in aggregate
4. Log handshake in `state/shared/ROADMAP_COLLABORATION_STATE.md`

---

## Lathe AGI Parity Test (scripted canary — MUST pass on any fresh session)

| Checkpoint | Test | Passes When |
|------------|------|-------------|
| 1 | Query programming style | AGI uses `E107 LatheProgrammingStyleSelectorEngine`, not ad-hoc logic |
| 2 | Propose conversational on Mazak | Recommends Mazatrol for simple part on Mazatrol-equipped machine |
| 3 | Find similar programs | Uses `E108 LatheProgramCatalogEngine.findSimilarPrograms()` |
| 4 | Compare costs | Returns structured comparison from `E109 LatheProgrammingCostEngine` |
| 5 | Recommend macro investment | High-repeat customer gets "macro" recommendation from E110 |

**All 5 must pass on any randomly-chosen fresh session. This is the Lathe AGI-parity bar.**

**Canary Script:**
```
1. "What programming style should I use for this simple shaft on the Mazak QT-250?" 
   → Expected: "Mazatrol conversational" with reasoning (not just "macro or hardcode")

2. "Show me similar programs we've done for ALCOA"
   → Expected: Results from catalog with style classification

3. "Compare the cost of CAM vs conversational for this part"
   → Expected: Structured cost breakdown with programming + machine time

4. "Should we invest in a macro for this fastener die?"
   → Expected: ROI analysis with breakeven quantity

5. "What's the best approach for this new customer's first order?"
   → Expected: Lower-investment approach (hardcode or conversational), not macro
```

---

## Success Metrics (Omega = 1.0) — v5 Consolidated

### Phase 2 Complete (MS8)
| Dimension | Baseline (v6 corrected) | Target | Gate |
|-----------|-------------------------|--------|------|
| Lathe engines | 71 | 82 (+11) | HARD |
| Lathe dispatcher actions | 91 | 101+ (+10) | HARD |
| Lathe tests | 55 | 67+ (+12) | HARD |
| External asset wiring ratio | 60% | ≥95% | HARD |
| Overall lathe quality | 94/100 | ≥97/100 | HARD |
| `eval()` / `Function()` usage | 6 | 0 | HARD |
| `as any` in E064 | 18 | 0 | HARD |
| S(x) hard-block enforcement | advisory | enforced | HARD |
| Tribal tips lathe-relevant | ~285 | ≥500 | SOFT |
| hyperMILL tips registration gap | 409 unregistered | 0 | HARD |
| Tribal tips injected into downstream | 0 | 4 engines | HARD |
| Facade parity with MillMaster | — | 1:1 method shape | HARD |

### Phase 3 Complete (MS12) — AGI Routing
| Dimension | Current State | Target | Gate |
|-----------|---------------|--------|------|
| Programming style routing | 2 styles | 5+ styles | **CRITICAL** |
| Conversational programming support | Data only | Full routing | HARD |
| Program catalog queryable | No type query | Full query API | HARD |
| Programming cost model | NONE | Full API | HARD |
| Future planning integration | NONE | Family ROI | MEDIUM |
| Controllers with routing support | 0 | 15+ | HARD |
| Test coverage (MS9-MS12) | 0 | +15 test suites | HARD |
| AGI Parity Test | 0/5 | 5/5 | **CRITICAL** |
| Total tests | 55 | 70+ | HARD | ← v6 CORRECTED
| Omega | 1.0 | 1.0 | HARD |

---

## Execution Order (ready to run)

```
=== PHASE 0: Foundation (MS0-MS1) ===
MS0   preflight                       2h
MS0.5 hyperMILL registration fix      1h    ← v3 data integrity
MS1   critical fixes (6 eval sites)   1d    ← gates MS2+

=== PHASE 1: Data Ingestion (MS2-MS7) ===
MS2   vendor catalog + Sandvik delta  2.5d
MS3   Okuma machine CAD/kinematics    1.5d  ↘
MS4   MULTUS + OSP manual extraction  2d    ↗ parallelizable
MS5   hyperMILL turning + MULTUS mining 1.5d ↘
MS6   fixture CAD + macro converter   1d     ↗ parallelizable
MS7   video mining + post delta       1d

=== PHASE 2: Orchestration (MS8) ===
MS8   tribal injection + facade (E106) 1.5d  ← forge-triple delivered

=== PHASE 3: AGI Routing (MS9-MS12) ===
PRE   Add WinMax to ControllerFeatureMatrixEngine  0.5h  ← v6 PREREQUISITE
MS9   programming style selector      2d    ← CRITICAL
MS10  program catalog index           1.5d  ↘
MS11  programming cost model          1d    ↗ parallelizable
MS12  future planning engine          1d

Serial: ~18 days    With parallelization: ~14 days
```

**Commit style:** `LATHE-AWARE-HARDEN-MS#: <title> — <summary>`

**Auto-commit after each unit** (YOLO mode per user memory).

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Conversational programming varies by controller** | HIGH | HIGH | MS9 queries ControllerFeatureMatrixEngine dynamically |
| **Program catalog taxonomy inconsistent** | MEDIUM | HIGH | MS10 uses LatheJMDieKnowledgeEngine patterns as baseline |
| **Cost model shop-specific** | HIGH | MEDIUM | Use JM Die rates as defaults; make configurable |
| **hyperMILL 409 tips unregistered** | CONFIRMED | HIGH | MS0.5 fixes extraction-log.json registration |
| **v2 baseline overcounted engines (95→71)** | CONFIRMED | MEDIUM | Adjusted targets in success metrics |
| **Sibling chat contract drifts from MillMaster** | LOW | HIGH | Lock MillMaster as canonical; adapter in E106 if needed |
| **Sandvik extraction has stale 678KB partial** | MEDIUM | MEDIUM | MS0 validates schema; MS2 deltas from there |
| **Inventor .ipt parser unavailable on CI** | MEDIUM | MEDIUM | STEP/IGES export fallback documented in MS6 |
| **PDF extraction time >24h for 3.5GB MULTUS** | MEDIUM | LOW | MS4 runs as background batch; results cached |
| **OKUMA MULTUS PDFs directory EMPTY** | CONFIRMED | HIGH | v6: Verify actual PDF location before MS4 start |
| **Tribal injection regresses downstream** | MEDIUM | HIGH | MS8 guards with regression test; injection is additive |
| **`.MIN` mining produces duplicates** | HIGH | MEDIUM | Semantic-hash dedup in E100; gate at tribal ingest |
| **Python macro converter Windows-only** | LOW | LOW | Document platform gate; skill gracefully degrades |

---

## Sign-Off Checklist

### Phase 2 Complete (MS8)
- [ ] All 11 MS0-MS8 engines land with ≥20 tests each
- [ ] Forge audit re-run: quality ≥ 97/100
- [ ] Zero eval/Function/as-any regressions
- [ ] S(x) hard-block verified enforcing
- [ ] Snapshot file written to `state/shared/LATHE_AWARENESS_SNAPSHOT.json`
- [ ] EventBus handshake event `lathe_coordination_ready` published
- [ ] `state/shared/ROADMAP_COLLABORATION_STATE.md` updated with completion
- [ ] `MEMORY.md` Current Position → `LATHE-AWARE-HARDEN-MS8-COMPLETE`

### Phase 3 Complete (MS12) — AGI Routing
- [ ] **E107 LatheProgrammingStyleSelectorEngine** handles all 5 programming styles
- [ ] Conversational routing works for: Mazatrol, WinMax, Klartext, navi-mill, ShopMill, Manual Guide i
- [ ] **E108 LatheProgramCatalogEngine** can query 24,545 programs by type/style/customer
- [ ] **E109 LatheProgrammingCostEngine** provides cost comparison with reasoning
- [ ] **E110 LathePartFamilyPlanningEngine** predicts family likelihood with ROI estimate
- [ ] AGI Parity Test: 5/5 canary checkpoints pass
- [ ] Test coverage: T052-T055 pass (15 new test suites)
- [ ] `MEMORY.md` Current Position → `LATHE-AWARE-HARDEN-MS12-COMPLETE`

### Final Sign-Off
- [ ] Final commit: `LATHE-AWARE-HARDEN-COMPLETE: omega=1.0, 15 engines, 17 new actions (91→108), AGI routing complete`
- [ ] Hand off to PRISM-wide sibling for aggregation verification

---

## DSL Shortcode Rollup

### MS0-MS8 Engines (11 total)
E096 VendorTurningCatalogExtractor · E097 OkumaMachineKinematicsIngester · E098 OkumaManualKnowledgeExtractor · E099 HyperMillTurningConfigIngester · E100 MarksMultusPatternMiner · E101 FixtureCADIngester · E102 OkumaMacroConverterBridge · E103 OkumaGosigerTranscriptMiner · E104 FusionLathePostDeltaRegistry · E105 TribalKnowledgeInjectorEngine · **E106 LatheMasterOrchestratorFacadeEngine** (forge-triple anchor)

### MS9-MS12 Engines (4 total) — AGI Routing
**E107 LatheProgrammingStyleSelectorEngine** (CRITICAL — unified 5-style routing) · **E108 LatheProgramCatalogEngine** (queryable catalog) · **E109 LatheProgrammingCostEngine** (cost comparison) · **E110 LathePartFamilyPlanningEngine** (future planning + ROI)

### MS0-MS8 Actions on turningDispatcher
lathe_vendor_tool_lookup · lathe_insert_grade_select · lathe_iso_code_resolve · lathe_machine_kinematics_lookup · lathe_hypermill_strategy_lookup · lathe_pattern_inject · lathe_fixture_cad_query · lathe_macro_hardcode · lathe_fusion_post_lookup · lathe_awareness_snapshot

### MS9-MS12 Actions on turningDispatcher — AGI Routing
**lathe_select_programming_style** · **lathe_compare_programming_costs** · **lathe_find_similar_programs** · **lathe_programming_history** · **lathe_catalog_stats** · **lathe_family_planning** · **lathe_macro_roi**

**Tests: T040–T055 (16 suites total: 12 from MS0-MS8, 4 from MS9-MS12).**

---

## Appendix A: v3 Scrutiny Evidence

### File Size Verification
```
sandvik-tools-extracted.json: 693,883 bytes (~678KB) ✓
sandvik-master-extracted.json: 2 bytes (empty) ✓
hypermill-tribal-tips-*.json: 6,082 lines (434 tips confirmed)
hypermill-workflows-*.json: "total": 113 ✓
```

### Engine Count Verification
```bash
ls mcp-server/src/engines/ | grep -iE "^(Lathe|Turning)" | wc -l
# Result: 71 (59 Lathe* + 12 Turning*)
```

### eval()/new Function() Locations
```
OkumaParametricProgramEngine.ts:2340 - new Function()
OkumaParametricProgramEngine.ts:2370 - eval()
NLHookEngine.ts:68 - new Function()
NLHookEngine.ts:918 - new Function()
NLHookEngine.ts:929 - new Function()
TribalKnowledgeEngine.ts:1063 - new Function()
```

### `as any` in TurningPrintToProgramEngine
```bash
grep -c "as any" TurningPrintToProgramEngine.ts
# Result: 18 (not 20)
```

### LatheThermodynamicsEngine — h_typical NOT hardcoded
Engine has `COOLANT_DATABASE` with per-coolant h_typical values (line 766+).
Claim "h=250 hardcoded" is INCORRECT.

### LatheCollisionZoneEngine — Not AABB
Uses geometric radius calculations (swept volume for turret rotation).
Claim "currently AABB only" is INCORRECT characterization.

### hyperMILL Registration Gap
- extraction-log.json: 25 tips registered
- hypermill-tribal-tips-*.json: 434 tips exist
- **Gap: 409 tips unregistered**

---

## Appendix B: Unit Index

| Unit | Milestone | Artifact |
|------|-----------|----------|
| U-LAT01-U-LAT05 | MS0 | Preflight verification |
| U-LAT06-U-LAT08 | MS0.5 | hyperMILL registration fix |
| U-LAT09-U-LAT20 | MS1 | Critical fixes (eval, writeFileSync, S(x), types) |
| U-LAT21-U-LAT26 | MS2 | Vendor catalog ingestion |
| U-LAT27-U-LAT31 | MS3 | Okuma machine kinematics |
| U-LAT32-U-LAT36 | MS4 | MULTUS + OSP PDF extraction |
| U-LAT37-U-LAT43 | MS5 | hyperMILL turning + MULTUS mining |
| U-LAT44-U-LAT49 | MS6 | Fixture CAD + macro converter |
| U-LAT50-U-LAT55 | MS7 | Video mining + Fusion post delta |
| U-LAT56-U-LAT65 | MS8 | Tribal injection + facade |
| U-LAT66-U-LAT70 | MS9 | Programming style selector |
| U-LAT71-U-LAT76 | MS10 | Program catalog index |
| U-LAT77-U-LAT82 | MS11 | Programming cost model |
| U-LAT83-U-LAT87 | MS12 | Future planning engine |

**Total: 87 units across 14 milestones (MS0-MS12 + MS0.5)**

---

**End of LATHE-AWARE-HARDEN v6 — UNIVERSAL format, 5-agent scrutiny pass applied, codebase-verified, ready to execute.**
