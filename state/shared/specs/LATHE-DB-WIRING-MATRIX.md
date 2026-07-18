# LATHE Domain DB Wiring Matrix + Gap Plan

> Synthesis of 5 parallel audits (machines+controllers, materials+sfc, tooling+holders, fixturing+toolpaths, posts+alarms) covering the 10 lathe-domain database categories. JM Die = 100% Okuma OSP, fleet LTH-01..07.
> Slot: whiskey (lathe). Generated 2026-05-29. Advisory work-list — every wiring proposal is `prism_turning:<action>` so the lathe Wizard reaches its own data without crossing into `prism_business` / `prism_data` / `prism_cam`.

---

## ✅ SHIPPED 2026-05-29 (slot:whiskey, LATHE-DB-WIRE-MS0)
5 actions wired to `prism_turning` (13/13 tests, per-file 2-reviewer PASS/PASS): `lathe_insert_grade_lookup`, `lathe_toolholder_lookup`, `lathe_boring_bar_select`, `lathe_canned_cycle_validate` (4 GAPs — rows 5b/6/8d) + `okuma_osp_parse` (PARTIAL row 9b). **DEFERRED:** `lathe_workholding_catalog_lookup` (7b — `MonolithWorkholdingDatabaseEngine` absent from slot/whiskey, 1543 commits behind integration), `lathe_machine_lookup` (row 1 — `ShopMachine` has no `controller` field; reachable via `prism_business`), `lathe_alarm_lookup` (10b — needs a verified real Okuma code; reachable via `prism_data:alarm_decode`), `lathe_canned_cycle_dialect` (8c — needs a dialect-table getter), kinematics re-key (row 2 — edits the engine DB). Memory: [[reference_whiskey_lathe_db_wire_ms0_2026_05_29]].

## 1. Wiring Matrix (one row per category)

| # | Category | DB path (+count) | Dispatcher action | Consuming engine | Verdict |
|---|----------|------------------|-------------------|------------------|---------|
| 1 | **MACHINES — JM Die fleet** | `mcp-server/src/engines/ShopConfigurationEngine.ts` (LTH-01..07 = 7 Okuma lathes within 21-machine roster) | `prism_business:shop_config_machines`, `shop_config_get` | `ShopConfigurationEngine` | **PARTIAL** — wired on the *business* surface; no lathe-domain lookup by machine_id |
| 2 | **MACHINES — lathe kinematics specs** | `mcp-server/src/engines/LatheKinematicsDeepLearningEngine.ts` `OKUMA_MACHINE_DATABASE` (3 entries: LB300M / LB3000EX / LB4000EX; OSP-P300L; axes/turret/envelope/safety-zones/build-quality) | `prism_turning:lathe_kinematics_get_machine_specs` | `LatheKinematicsDeepLearningEngine.getMachineSpecs()` | **PARTIAL** — action+engine exist, but DB keys (`LB300M`) ≠ fleet IDs (`LTH-01..07`); lookup by real shop ID returns null; covers only 3 of 7 machines |
| 3 | **MATERIALS — property DB** (Kienzle kc1.1/mc, Taylor C/n, density/hardness/thermal-k) | Canonical: `mcp-server/src/physics/constants.ts` (`CANONICAL_KIENZLE` + `CANONICAL_TAYLOR`, 6 ISO groups + `MATERIAL_PHYSICS_TABLE` ~15 alloys). Bulk: `mcp-server/src/registries/MaterialRegistry.ts` (audit `MATERIAL_REGISTRY_AUDIT.md` ≈ 6,346 live) | `prism_data:material_get` / `material_search` / `material_compare` (dataDispatcher.ts:257,275,287) | `MaterialRegistry` (`registryManager.materials`); physics via `buildMaterialPhysics()` in `LatheSpeedFeedCalculatorFacadeEngine` + `KienzleForceModelEngine` / `TaylorToolLifeEngine` | **WIRED** — exposed on `prism_data` + consumed by lathe physics engines |
| 4 | **SFC — turning speed-feed** (vc/fn recs, tool-life; lathe consumption of oscar's SFC core) | No stored table — values *computed*. Inputs: `physics/constants.ts`. Compute engine: `mcp-server/src/engines/LatheSpeedFeedCalculatorFacadeEngine.ts` (U-LTH07, consolidates 16 SFC engines incl. `SpeedFeedOrchestratorEngine`) | `prism_cam:lathe_sf_calculate` / `lathe_sf_advise` / `lathe_sf_whatif` / `lathe_sf_cite_sources` / `lathe_sf_explain` / `lathe_sf_full` (camDispatcher.ts:3606-3664); core `prism_calc:speed_feed_*` | `LatheSpeedFeedCalculatorFacadeEngine.calculate()` → wraps `SpeedFeedOrchestratorEngine` (oscar's SFC) + `LatheCSSOptimizerEngine` + `LatheUnifiedScienceEngine` | **WIRED** — 6 `lathe_sf_*` actions invoke the facade |
| 5 | **TOOLING — turning insert/tool vendor catalog** | `mcp-server/src/data/{tungaloy,widia-2022,kennametal,mitsubishi}-turning-catalog.ts` via `turning-vendor-catalog-loader.ts` (~4,095 inserts: Tungaloy 2,973 + Widia 1,122; Kennametal/Mitsubishi present but NOT in loader) | `prism_turning:turning_vendor_insert_search` / `turning_vendor_grade_recommend` / `turning_vendor_iso_code_resolve` / `turning_vendor_catalog_stats` / `turning_iso1832_parse` / `turning_chipbreaker_classify` | `VendorTurningCatalogExtractorEngine` | **WIRED** — follow-up: register Kennametal+Mitsubishi files in `loadVendorTurningCatalogs()` |
| 5b | **TOOLING — Okuma-Multus lathe insert+grade catalog** | `mcp-server/src/data/lathe-tooling-catalog.ts` — 27 insert grades (Sandvik 12 / KMT 8 / Iscar 7) + 11 geometries + cutting params + 9 application guidelines (part of `LATHE_TOOLING_CATALOG`, 138 records) | **NONE** | **NONE** (`InsertGradeSelectionEngine` derives grades from `MachiningPlaybookEngine`, does NOT read this catalog) | **GAP** — populated, exported, dormant dead data |
| 6 | **TOOL HOLDERS — turning holders / boring bars / grooving-parting** | `mcp-server/src/data/lathe-tooling-catalog.ts` — `SANDVIK_OD_TURNING_HOLDERS` + `SANDVIK_CAPTO_OD_HOLDERS` + `SANDVIK_CAPTO_BORING_BARS` + `SANDVIK_SHANK_BORING_BARS` + `SANDVIK_GROOVING_HOLDERS` + `KENNAMETAL_TURNING_HOLDERS` + `ISCAR_TURNING_HOLDERS` + `CAPTO_CONNECTION_SPECS` (~111 of 138 records; ISO 5608 shank + boring-bar bore/overhang/min-bore + Capto) | **NONE** (`getCaptoHoldersBySize()` accessor called nowhere) | **NONE** | **GAP** — dormant dead data, zero engine consumer, zero `prism_turning` action |
| 7 | **FIXTURING — physics surfaces** (chuck-jaw force / steady-rest / face-driver / workholding selection) | `ChuckJawForceEngine` / `SteadyRestPlacementEngine` / `FaceDriverTorqueEngine` (Röhm formula) / `LatheWorkholdingEngine` (7 jaw types) / `LatheChuckJawSetupEngine` | `prism_turning:chuck_force`, `:steady_rest`, `:lathe_workholding_{select_jaw,trilobe,face_driver,expanding_mandrel,magnetic_chuck,stock_form}`, `:lathe_chuck_jaw_compute`, `:lathe_chuck_jaw_stats`, `:lathe_cam_intelligence_workholding` | ChuckJawForceEngine, SteadyRestPlacementEngine, LatheWorkholdingEngine, LatheChuckJawSetupEngine, LatheCAMIntelligenceEngine | **WIRED** — 11 actions, physics-first, ISO 10218 safety-relevant |
| 7b | **FIXTURING — workholding CATALOG/geometry DB** (chuck/collet/steady-rest/face-driver product+geometry records) | `mcp-server/src/data/workholding-catalog.ts` (24.4K) + `mcp-server/src/engines/MonolithWorkholdingDatabaseEngine.ts` (13 fixture cats: chuck_3jaw/6jaw/collet_chuck/hydraulic_vise/vacuum/magnetic…) + `calculatorWorkholdingCatalog.ts` | **NONE in lathe surface** — `workholding-catalog.ts` imported only by `PostProcessorComprehensiveKnowledgeEngine`; `calculatorWorkholdingCatalog` via `routes/data.ts` (HTTP only); `StockWorkholdingCatalogEngine` wired to camDispatcher (mill-leaning) | `MonolithWorkholdingDatabaseEngine` (self-documents: catalog bridge "returns empty for real workholding queries today") | **GAP** — populated records no lathe action can query |
| 8 | **TOOL PATHS — turning strategy catalog** (roughing/finishing/grooving/threading/parting) | `mcp-server/src/registries/ToolpathStrategyRegistry.ts` (`TURNING_STRATEGIES` = 124) via `TurningStrategyCatalog.ts`; `hypermill-turning-strategy-catalog.ts` | `prism_turning:turning_strategy_catalog_select`; `:lathe_cam_intelligence_toolpath`; `:lathe_print_feature_strategy_select` | TurningStrategyCatalog, LatheCAMIntelligenceEngine, LathePrintFeatureStrategySelectorEngine | **WIRED** |
| 8b | **TOOL PATHS — feature recognition** (feature→canned-cycle classification) | `LatheTurningFeatureRecognizerEngine.ts` + `TurningFeatureTaxonomyEngine.ts` + `LatheProgramFeatureInferenceEngine.ts` | `prism_turning:lathe_feature_recognizer_recognize`, `:lathe_g71_type` | LatheTurningFeatureRecognizerEngine, LatheCannedZoneEngine | **WIRED** |
| 8c | **TOOL PATHS — G70/G71/G72/G73/G75/G76 canned-cycle DIALECT map** (per-controller templates: Fanuc / Okuma GROV·GFIN / Mitsubishi / Mazak / Siemens CYCLE95) | `mcp-server/src/engines/LathePostGeneratorDialectEngine.ts` (`DialectTemplate` w/ `g71_format`/`g76_format`/`g83_format` per family); supporting `okuma-dialect-knowledge.ts` | `prism_cam:*` (camDispatcher imports `getSupportedCycles`/`.generate` ~3812 & ~4063); okuma-dialect via dataDispatcher; turning-side has `:okuma_macro_convert`, `:lathe_lora_program_miner_detect_dialect`, `:lathe_post_validate_program` | LathePostGeneratorDialectEngine, OkumaDialectKnowledgeEngine | **PARTIAL** — generation lives on camDispatcher + dataDispatcher; no `prism_turning` query for "G71-G76 dialect table for controller X" |
| 8d | **TOOL PATHS — canned-cycle VALIDATOR** (G7x structural/parameter validation) | `mcp-server/src/engines/PPCannedCycleValidatorEngine.ts` | **NONE** — camDispatcher "canned_cycle" hits are an unrelated `use_canned_cycles` flag + Inventor `cam_inventor_camfn_canned_cycle_ref`; engine has 0 dispatcher refs | PPCannedCycleValidatorEngine (no route) | **GAP** |
| 8e | **TOOL PATHS — toolpath wear integration** | `mcp-server/src/engines/TurningToolpathWearEngine.ts` | `prism_turning:turning_toolpath_wear` | TurningToolpathWearEngine | **WIRED** |
| 9 | **CONTROLLERS — Okuma OSP dialect KB** | `mcp-server/src/data/okuma-dialect-knowledge.ts` (~54 tips: gcode/mcode/variable/subroutine/safety/dialect_diff/cycle/caxis/barfeeder/threading/tooling/graphics/macro; OSP-P300L/P500L) | `prism_data:box_okuma_dialect_search` / `_lookup_gcode` / `_lookup_mcode` / `_diffs` / `_analyze` / `_stats` | `OkumaDialectKnowledgeEngine` | **WIRED** (caveat: `prism_data` surface, not lathe) |
| 9b | **CONTROLLERS — OSP program parser** | (engine, no static DB) `mcp-server/src/engines/OkumaOSPParserEngine.ts` | `prism_turning:turning_min_fingerprint` (uses `.parse` as sub-call only); `prism_turning:okuma_macro_convert` (OSP→ISO) | OkumaOSPParserEngine, OkumaMacroConverterBridgeEngine | **PARTIAL** — parser consumed only as an internal fingerprint helper; no first-class "parse an OSP program" action |
| 9c | **CONTROLLERS — generic controller-knowledge DBs** | `mcp-server/src/data/controller-knowledge.json` (29.9K) + `mcp-server/data/state/learned-cnc-controller-patterns.json` (59.6K) | `prism_data:controller_knowledge_get/list/compare` (QCMG-WIRE-MS0) | `ControllerKnowledgeEngine` (+ lathe consumers `LatheDeepAIHardeningEngine`, `LathePostKnowledgeGraphEngine`, `LatheResourceKnowledgeEngine`) | **WIRED** — multi-controller |
| 10 | **POST PROCESSORS — lathe post DB / registry / dialect tables** | `mcp-server/data/post-processors/lathe-post-registry.json` (58 posts) + `okuma-dialect-knowledge.ts` + `machine-post-enriched.ts` (381K) + `PostProcessorRegistry.ts` (generic 14-family) | `prism_cam:cam_fusion_lathe_post_lookup/_scan_register/_save_registry/_get_registry/_by_manufacturer/_by_controller/_summary` (7); `master_post_okuma_b250`; `lathe_postgen_transfer`; `lathe_masterpost_*`; `master_post_okuma_osp` | FusionLathePostDeltaRegistryEngine, OkumaB250LatheMasterPostEngine, LatheSwissPostGeneratorEngine, LatheMasterPostRouterEngine, LatheMasterPostSelfAwarenessEngine | **WIRED** (lives on `prism_cam`) |
| 10b | **ALARMS — controller alarm-code DB (Okuma OSP)** | `mcp-server/src/data/controller-alarm-database.json` (2,588 alarms; 267 Okuma) + `alarm-fix-procedures.json` (2.7M) + `AlarmRegistry.ts` (2,500+ / 12 families) | `prism_data:alarm_decode` / `alarm_search` / `alarm_fix` / `alarm_diagnose`; `prism_shop:mobile_alarm_decode`. **0 actions on turningDispatcher** | `AlarmRegistry` (registryManager), `AlarmDiagnosticsEngine` (reads both JSONs directly L127-134) | **PARTIAL** — DB fully queryable via `prism_data`, but no lathe entry point + no Okuma-OSP-specialized alarm engine |

---

## 2. Gap Summary

**Verdict tally across 16 matrix rows (10 categories, some split):**

| Verdict | Count | Rows |
|---------|-------|------|
| **WIRED** | 9 | 3 (materials), 4 (sfc), 5 (vendor inserts), 7 (fixturing physics), 8 (strategy catalog), 8b (feature recog), 8e (wear), 9 (osp dialect KB), 9c (generic controller), 10 (posts) |
| **PARTIAL** | 5 | 1 (JM fleet machines), 2 (kinematics specs), 8c (canned-cycle dialect map), 9b (OSP parser), 10b (alarms) |
| **GAP** | 4 | 5b (Okuma-Multus insert+grade), 6 (toolholders/boring-bars), 7b (workholding catalog), 8d (canned-cycle validator) |

> Categories 3, 4, 5, 7, 8/8b/8e, 9, 9c, 10 are WIRED — **SKIP**. Work-list below is the 5 PARTIAL + 4 GAP rows only (9 wiring units).

**Work-list (PARTIAL + GAP):**

| Row | Verdict | One-line gap | New action |
|-----|---------|--------------|------------|
| 5b | GAP | Okuma-Multus insert/grade catalog (138-rec) has zero consumer + zero action | `prism_turning:lathe_insert_grade_lookup` |
| 6 | GAP | Turning holders / boring-bars / grooving (~111 ISO-5608 recs) dormant | `prism_turning:lathe_toolholder_lookup` + `lathe_boring_bar_select` |
| 7b | GAP | Workholding product/geometry catalog unreachable from lathe (bridge returns empty) | `prism_turning:lathe_workholding_catalog_lookup` |
| 8d | GAP | `PPCannedCycleValidatorEngine` fully unwired (0 dispatcher refs) | `prism_turning:lathe_canned_cycle_validate` |
| 9b | PARTIAL | OSP parser only an internal fingerprint sub-call | `prism_turning:okuma_osp_parse` |
| 8c | PARTIAL | G70-G76 dialect map only on camDispatcher/dataDispatcher | `prism_turning:lathe_canned_cycle_dialect` |
| 1 | PARTIAL | No lathe-surface lookup against canonical LTH-01..07 fleet | `prism_turning:lathe_machine_lookup` |
| 2 | PARTIAL | `lathe_kinematics_get_machine_specs` keys on `LB300M` ≠ LTH IDs; 3 of 7 | re-key/alias resolver (same action) |
| 10b | PARTIAL | No lathe alarm entry point for the 100%-Okuma fleet | `prism_turning:lathe_alarm_lookup` (+ optional `lathe_alarm_diagnose`) |

---

## 3. Wiring Build Order

**Ordering principle:** standalone DB reads first (lowest coupling, no dependency on a sibling action), composite/derived last. All new actions land on `turningDispatcher.ts` via the `await import()` lazy-load pattern already used there (e.g. `latheSFCalc` lazy-import at camDispatcher.ts:425).

### Tier A — Standalone static-DB reads (no dependencies)

**A1. `prism_turning:lathe_insert_grade_lookup`** (Row 5b — GAP)
- Engine route: `const { LATHE_TOOLING_CATALOG, getGradesByMaterial, getFinishingGrades, getRoughingGrades } = await import("../../data/lathe-tooling-catalog.js");` (thin reader; OR refactor `InsertGradeSelectionEngine` to import `LATHE_TOOLING_CATALOG` as grade source and reuse existing `insert_grade_select`)
- DB exposed: `lathe-tooling-catalog.ts` — 27 insert grades (Sandvik/KMT/Iscar) + 11 geometries + cutting params
- Params: `{ manufacturer?, isoGroup, operation }`
- Test: `expect(result.grades.length).toBeGreaterThan(0); expect(result.grades.every(g => ["Sandvik","Kennametal","Iscar"].includes(g.manufacturer))).toBe(true);` — assert a Sandvik P-finishing query returns ≥1 grade with a real `vc_range` (not empty/null).

**A2. `prism_turning:lathe_toolholder_lookup`** (Row 6 — GAP)
- Engine route: `const cat = await import("../../data/lathe-tooling-catalog.js");` reading `SANDVIK_OD_TURNING_HOLDERS` / `SANDVIK_CAPTO_OD_HOLDERS` / `KENNAMETAL_TURNING_HOLDERS` / `ISCAR_TURNING_HOLDERS` + `getCaptoHoldersBySize()` (or a new thin `LatheToolHolderCatalogEngine`)
- DB exposed: `lathe-tooling-catalog.ts` turning-holder arrays (~111 records, ISO 5608 shank + Capto specs)
- Params: `{ system: "capto"|"vdi"|"shank"|"boring_bar", mountingSize, insertShape }`
- Test: `expect(result.holders.find(h => h.shankCode === "PCLNR2020K12")).toBeDefined();` — assert an ISO-5608 shank-code query resolves to a real holder record with a `mountingSize`.

**A3. `prism_turning:lathe_boring_bar_select`** (Row 6 — GAP, pairs with A2)
- Engine route: same import as A2 — `SANDVIK_CAPTO_BORING_BARS` / `SANDVIK_SHANK_BORING_BARS`
- DB exposed: boring-bar bore/overhang/min-bore records
- Params: `{ bore_dia_mm, depth_mm }` → L/D + overhang gate
- Test: `expect(result.selected.minBore_mm).toBeLessThanOrEqual(input.bore_dia_mm); expect(result.ld_ratio).toBeCloseTo(input.depth_mm / result.selected.shankDia_mm, 1);` — assert min-bore fits and L/D computes from real geometry.

**A4. `prism_turning:lathe_workholding_catalog_lookup`** (Row 7b — GAP)
- Engine route: `const { MonolithWorkholdingDatabaseEngine } = await import("../../engines/MonolithWorkholdingDatabaseEngine.js");` (read-only query; NOTE: the engine self-documents its bridge returns empty — wire the engine's own category accessor, not the `CatalogUnifiedQueryEngine.workholding_top` bridge)
- DB exposed: `MonolithWorkholdingDatabaseEngine` 13 fixture categories + `workholding-catalog.ts` records
- Params: `{ fixture_type ∈ {chuck_3jaw,chuck_6jaw,collet_chuck,face_driver,steady_rest}, part_od?, bore? }`
- Test: `expect(result.fixtures.filter(f => f.fixture_type === "chuck_3jaw").length).toBeGreaterThan(0);` — assert a `chuck_3jaw` filter returns real product records (NOT empty — directly refutes the "returns empty" docstring).

**A5. `prism_turning:okuma_osp_parse`** (Row 9b — PARTIAL)
- Engine route: `const { okumaOSPParserEngine } = await import("../../engines/OkumaOSPParserEngine.js");` → `okumaOSPParserEngine.parse(text)`
- DB exposed: the parser directly (no static DB — code-embedded grammar)
- Params: `{ text | base64 }` → `OkumaProgram` structure
- Test: `const r = await dispatch("okuma_osp_parse", {text: "N10 G0 X100 Z50\nN20 G96 S200 M3"}); expect(r.blocks.length).toBe(2); expect(r.blocks[0].words.find(w => w.address === "G").value).toBe(0);` — assert real block decomposition, not just a non-null return.

**A6. `prism_turning:lathe_canned_cycle_dialect`** (Row 8c — PARTIAL)
- Engine route: `const { LathePostGeneratorDialectEngine } = await import("../../engines/LathePostGeneratorDialectEngine.js");` → `.getSupportedCycles(controllerId)` + a read-only dialect-table getter (add one if absent — `getDialectTemplate(controllerId)`)
- DB exposed: `LathePostGeneratorDialectEngine` `DialectTemplate` G7x format strings per family
- Params: `{ controller: "okuma"|"fanuc"|"mitsubishi"|"mazak"|"siemens" }`
- Test: `const d = await dispatch("lathe_canned_cycle_dialect", {controller: "okuma"}); expect(d.cycles).toContain("G71"); expect(d.templates.g71_format).toMatch(/G71/);` — assert the Okuma table carries a real G71 format string distinct from Fanuc's.

**A7. `prism_turning:lathe_alarm_lookup`** (Row 10b — PARTIAL)
- Engine route: `const { AlarmDiagnosticsEngine } = await import("../../engines/AlarmDiagnosticsEngine.js");` (or `registryManager.alarms.decode`) — default `controller="OKUMA"` when caller omits it
- DB exposed: `controller-alarm-database.json` (267 Okuma rows) + `alarm-fix-procedures.json`
- Params: `{ code, controller? (default "OKUMA") }`
- Test: `const a = await dispatch("lathe_alarm_lookup", {code: "<real Okuma OSP code>"}); expect(a.controller).toBe("OKUMA"); expect(a.description).toBeTruthy(); expect(a.fixSteps.length).toBeGreaterThan(0);` — assert default-to-Okuma resolves a real 267-row alarm with fix steps.

### Tier B — Derived / composite (depend on Tier-A surfaces or another engine)

**B1. `prism_turning:lathe_machine_lookup`** (Row 1 — PARTIAL)
- Engine route: `const { shopConfigurationEngine } = await import("../../engines/ShopConfigurationEngine.js");` → `.getMachines()` filtered to `type === "Lathe"`
- DB exposed: `ShopConfigurationEngine` canonical LTH-01..07 roster (single source of truth for the fleet)
- Params: `{ machine_id }` (e.g. `"LTH-07"`)
- Test: `const m = await dispatch("lathe_machine_lookup", {machine_id: "LTH-07"}); expect(m.controller).toBe("okuma"); expect(m.type).toBe("Lathe");` — assert a real fleet ID resolves on the lathe surface without touching `prism_business`.

**B2. Re-key/alias resolver in `lathe_kinematics_get_machine_specs`** (Row 2 — PARTIAL; depends on B1's roster as truth)
- Engine route: inside `LatheKinematicsDeepLearningEngine` add an `LTH→internal-key` alias map (or re-key `OKUMA_MACHINE_DATABASE` to LTH-01..07) and expand 3→7 entries (add LTH-01/02/03/04 = GENOS L300-M / L200E-M / LNC8 / Crown, + Multus B250II); cross-reference `ShopConfigurationEngine` for the roster — **same `lathe_kinematics_get_machine_specs` action, fixed resolver**
- DB exposed: `OKUMA_MACHINE_DATABASE` (expanded + re-keyed)
- Params: `{ machine_id: "LTH-07" }` (previously only `"LB300M"`)
- Test: `const s = await dispatch("lathe_kinematics_get_machine_specs", {machine_id: "LTH-07"}); expect(s).not.toBeNull(); expect(s.axes).toBeDefined();` — assert an LTH fleet ID returns specs (was `null` pre-fix) AND legacy `"LB300M"` still resolves (back-compat).

**B3. `prism_turning:lathe_canned_cycle_validate`** (Row 8d — GAP; pairs with A6 dialect + existing `lathe_g71_type`)
- Engine route: `const { PPCannedCycleValidatorEngine } = await import("../../engines/PPCannedCycleValidatorEngine.js");` → `.validate(...)`
- DB exposed: the validator (code-embedded G7x rules)
- Params: `{ program_text, controller? }` → validate G70/G71/G72/G73/G75/G76 block syntax + parameter ranges against detected dialect
- Test: `const v = await dispatch("lathe_canned_cycle_validate", {program_text: "G71 U2.0 R1.0\nG71 P10 Q20 U0.4 W0.2 F0.3", controller: "fanuc"}); expect(v.valid).toBe(true); const bad = await dispatch(..., {program_text: "G71 P10 Q20", controller: "fanuc"}); expect(bad.valid).toBe(false); expect(bad.errors).toContainEqual(expect.objectContaining({param: "U"}));` — assert it FAILS a malformed G71 (missing U/W roughing depth) and PASSES a well-formed one.

### Tier C — Optional ergonomics aliases (defer; not gaps)

- `prism_turning:lathe_material_lookup` → `registryManager.materials.getByIdOrName` + auto-attach `CANONICAL_KIENZLE`/`CANONICAL_TAYLOR` (Row 3 convenience — DB already reachable via `prism_data`)
- `prism_turning:lathe_sf_full` → alias to `prism_cam:lathe_sf_full` facade (Row 4 discoverability)
- `prism_turning:lathe_okuma_dialect_search` → delegate to `OkumaDialectKnowledgeEngine` (Row 9 ergonomics)
- `prism_turning:lathe_controller_caps` (Okuma/Fanuc/Haas lathe dialects) — note `lathe_ai_ultra_list_controllers` / `lathe_ai_ultra_get_controller_caps` already partially serve this (Row 9c)
- `prism_turning:lathe_alarm_diagnose` → wire `OkumaDialectKnowledgeEngine` + `AlarmDiagnosticsEngine` for OSP-P/B-axis context (Row 10b extension)
- Register Kennametal + Mitsubishi turning files in `loadVendorTurningCatalogs()` (Row 5 follow-up — files exist, not in loader)

---

## 4. Risks

- **Code-embedded "DBs" (no separate data file) — assert behavior, not file presence.** Rows 4 (SFC, computed not stored), 9b (`OkumaOSPParserEngine` grammar), 8c (`LathePostGeneratorDialectEngine` templates), 8d (`PPCannedCycleValidatorEngine` rules) have NO standalone JSON/TS data table — the "DB" is the engine's logic. Tests MUST exercise real parse/validate/generate output (A5/A6/B3 assertions above check decomposed structure + format strings + pass/fail), never `toBeDefined()` stubs.

- **SFC cross-domain boundary — oscar owns the engine; whiskey is a CLIENT.** Row 4: `SpeedFeedOrchestratorEngine` is oscar's SFC core. The lathe facade (`LatheSpeedFeedCalculatorFacadeEngine`) already wraps it; the optional Tier-C `lathe_sf_full` alias must **delegate to the existing facade call** — do NOT re-implement SFC compute or duplicate Kienzle/Taylor logic in `turningDispatcher`. Physics stays single-sourced from `physics/constants.ts` via `buildMaterialPhysics()`; no inlined kc1.1/Taylor constants in any new action.

- **`MonolithWorkholdingDatabaseEngine` bridge is documented-broken.** Row 7b: the engine self-documents that `CatalogUnifiedQueryEngine.workholding_top` "returns empty for real workholding queries today." A4 must wire the engine's **own category accessor**, not that bridge — and the A4 test explicitly asserts non-empty results to refute the stale docstring (R12: a green test that returns `[]` would be a lie).

- **Machine-roster single-source-of-truth contention.** Rows 1 + 2: `ShopConfigurationEngine` is the canonical fleet (LTH-01..07); `LatheKinematicsDeepLearningEngine.OKUMA_MACHINE_DATABASE` is a SEPARATE 3-entry spec store keyed `LB300M`. B2 must alias/cross-reference, NOT fork a second roster — re-keying without pointing at ShopConfigurationEngine recreates the drift. B1 should land before B2 so the roster source is the live one.

- **Already-WIRED categories to SKIP** (do not re-wire): 3 (materials), 4 (sfc), 5 (vendor inserts), 7 (fixturing physics), 8/8b/8e (strategy catalog / feature recog / wear), 9 (OSP dialect KB), 9c (generic controller), 10 (posts). Touching these is churn — their only open items are the Tier-C ergonomics aliases + the Row-5 loader follow-up, all deferrable.

- **Empty audit inputs:** none. All 5 audits returned complete findings with concrete paths, counts, action names, and verdicts. No category was flagged as un-investigated.

- **Surface-placement is the recurring theme, not orphaning.** Materials (`prism_data`), SFC (`prism_cam`/`prism_calc`), posts (`prism_cam`), alarms (`prism_data`), OSP dialect KB (`prism_data`) are all functionally reachable — the lathe-surface gap is ergonomic for 5 of the 9 work-list rows. The 4 true GAPs (5b, 6, 7b, 8d) are dormant dead data / fully-unwired engines and are the highest-value fixes; sequence them ahead of the PARTIAL ergonomics rows when prioritizing.
