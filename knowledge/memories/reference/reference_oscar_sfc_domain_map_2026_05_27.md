---
name: reference-oscar-sfc-domain-map-2026-05-27
description: Speed-Feed Calculator (SFC) domain map for oscar — every engine/algorithm/data/wiki/tribal/dispatcher/skill/bridge file related to SFC, with 1-line roles. Use BEFORE Grep/Glob/Agent for SFC file lookup.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.701Z
aliases: reference_oscar_sfc_domain_map_2026_05_27
---


# SFC Domain Map — oscar's fast file-lookup index

Built 2026-05-27 by 4 parallel Explore agents. Use this BEFORE Grep/Glob for ANY SFC file lookup. Order: search this map → confirm with quick file read → only escalate to Grep/Glob/Agent if missing here.

## CORE SFC ENGINES (`H:/prism/mcp-server/src/engines/`)

**Primary orchestrators:**
- `UltimateSpeedFeedEngine.ts` — canonical physics engine (Kienzle/Taylor/Merchant/Brammertz/Altintas SLD/Johnson-Cook; 31 models, 15 materials, 7 ops, 7 strategies, 401 test assertions); ToolMaterial enum source `"carbide"|"hss"|"cermet"|"ceramic"|"cbn"|"pcd"`
- `SpeedFeedOrchestratorEngine.ts` — central hub (2,851 LOC), routes all input domains → physics, post-processes for optimization modes
- `SpeedFeedNineAxisOrchestratorEngine.ts` — 9-axis composition (machine/spindle/controller/material/workholding/holder/tooling/coolant/toolpath); 3 modes (cost_batch/aggressive_rush/prism_optimized); MRR ranking; ROI popup
- `SpeedFeedAdvancedAIEngine.ts` / `SpeedFeedDeepLearningEngine.ts` / `SpeedFeedUltimateAIEngine.ts` — SF-AI-L1/L2/L3 untrained shells (Ollama-blocked training, U-OSC9-17)

**Baseline + at-scale + cross-vendor:**
- `SpeedFeedBaselineComparatorEngine.ts` — diffs PRISM vs 5 vendor baseline DBs (Sandvik/Kennametal/CNCCookbook/Titans/HSMAdvisor static tables) — per-cell only
- `SpeedFeedAtScaleHarnessEngine.ts` — PRISM-only physics invariant sweep (I1-I6), matrix runner
- `SpeedFeedExhaustiveCombinationEngine.ts` — bounded cartesian sweep (~60 cells demo, ~10K prod), ledger writer
- `SpeedFeedTriVendorBatchComparatorEngine.ts` ⭐ U-OSC9-14 — large-batch PRISM × baseline-DB × G-Wizard tri-vendor matrix; 6-verdict classification + percentiles; hard cap 10K/call, streams JSONL for larger

**Feedback + propagation:**
- `SpeedFeedOutcomeFeedbackBridgeEngine.ts` — outcome→DL calibration ring (closes audit F9)
- `SpeedFeedPSNDecisionPriorEngine.ts` — Bayesian prior from PSN data (Obsidian brain + tribal + wiki + outcome ledger)
- `SpeedFeedDownstreamSubscriberEngine.ts` — subscribes to sfcOutcomeWire bus, forwards to 5 caches
- `SpeedFeedPropagationBridgeEngine.ts` — auto-fan-out → post + mill/lathe/wedm wizards + print_to_program
- `SpeedFeedToQuoteBridgeEngine.ts` — MRR → cycle_min for cost estimation

**Specialized:**
- `SpeedFeedShopLibraryBridgeEngine.ts` — Fusion 360 shop CSV → MRR-ranked SFC (U-OSC9-08)
- `SpeedFeedPDFCorpusBridgeEngine.ts` — kilo cad-cam-pdf-tribal-seeds + fleet JSONL → SFC tribal prior (U-OSC9-10)
- `SpeedFeedChatterStabilityAdapterEngine.ts` — Altintas SLD + RCSA-derived FRF (U-OSC9-06)
- `SpeedFeedAutopilotEngine.ts` — 5-step chain (material → tool → machine → compute → clamp)
- `SpeedFeedMinerEngine.ts` — extract S/F from program records
- `ProvenSpeedFeedAggregatorEngine.ts` — Okuma lathe + mill statistical aggregation
- `SpeedFeedResourceIntegrationEngine.ts` — PDF/tribal-knowledge input layer
- `AutoSpeedFeedEngine.ts` / `AutoSpeedFeedCalculatorEngine.ts` — quick SFC from DXF/print
- `MachineAwareSpeedFeedEngine.ts` — machine-specific spindle/thermal limits
- `HeatTreatmentAwareSpeedFeedEngine.ts` — hardened material adjustments
- `CAMSpeedFeedBridgeEngine.ts` — normalize HyperMILL/Fusion/Inventor/Mastercam/Esprit/SolidCAM S/F vocabs ↔ orchestrator
- `LatheSpeedFeedCalculatorFacadeEngine.ts` + `LatheSpeedFeedDeepLearningAdvisorEngine.ts` + `LatheSpeedFeedShopAwareTuningEngine.ts` + `LatheSpeedFeedReasoningBridgeEngine.ts` — lathe facade (16 engines consolidated)
- `hypermill/HyperMillSpeedFeedMappingEngine.ts` — HyperMILL post-processor SFC

**Vendor-bridge engines (operator's live integrations):**
- `GWizardAdapterEngine.ts` (U-OSC9-12) — G-Wizard toolcrib.csv reader
- `HSMAdvisorAdapterEngine.ts` (U-OSC9-09) — settings_v2.xml live-state reader (BOM-sniff UTF-16-declared/UTF-8-stored fix)
- `HSMAdvisorComparatorBridgeEngine.ts` (U-OSC9-11) — 5-axis PRISM ↔ HSMAdvisor diff (3-tier enum translation)
- `WedmTrainingPairBridgeEngine.ts` (U-OSC9-13) — mike's 98-pair WEDM training-corpus indexer

**Parity exporters (U-OSC9-15, 2026-05-27):**
- `PRISMToolCatalogAggregatorEngine.ts` — unions 24 `*-extracted.json` → 41,192 deduped tools
- `GWizardLibraryExporterEngine.ts` — ShopTool[] → toolcrib.csv (operator's AIR sandbox auto-resolve, RFC-4180 escape, round-trip via adapter)
- `HSMAdvisorLibraryExporterEngine.ts` — ShopTool[] → user_tool_lib.tooldb2.xml (~70 fields/Tool, .NET XmlSerializer compatible)
- `HSMAdvisorMachineExporterEngine.ts` — JM_DIE_CONTROLLER_MAP → machines.xml (ADO.NET DataSet, skv_fswizard_machine elements)

## ALGORITHMS (`H:/prism/mcp-server/src/algorithms/`)

- `KienzleForceModel.ts` — Fc = kc1.1 × ap × fz^(1-mc)
- `ExtendedTaylorModel.ts` — T = (C/Vc)^(1/n) multi-variable
- `MerchantShearForceModel.ts`, `PowerTorqueCalc.ts`, `GilbertMRRModel.ts`
- `ToolWearPrediction.ts`, `BayesianWearModel.ts`, `UsuiWearModel.ts`, `ToolLifeEconomicReplacementFormula.ts`
- `StabilityLobeDiagram.ts`, `FRFStabilityLobe.ts`, `STFTChatter.ts`, `SpindleVibFFTModel.ts`
- `ToolDeflectionModel.ts`, `ThermalFEAModel.ts`, `ThermalPartitionModel.ts`
- `SurfaceFinishPredictor.ts`, `ChipVolumeRate.ts`, `ChipEvacuationModel.ts`, `ChipTypePredictionModel.ts`
- `JohnsonCookModel.ts`, `JointSpeedFeedOptimizer.ts`, `AdaptiveControllerModel.ts`, `EnsemblePredictorModel.ts`, `DigitalTwinEstimator.ts`

## CONSTANTS + REGISTRIES (`H:/prism/mcp-server/src/`)

- `physics/constants.ts` — canonical Kienzle (kc1.1 P=1800, M=2100, K=1100, N=700, S=2800, H=3200) + Taylor C/n + MaterialEntry — **NEVER inline elsewhere**
- `physics/unit-conversions.ts` — RPM ↔ m/min, feed ↔ chip thickness
- `registries/MaterialRegistry.ts` (58K) — ISO P/M/K/N/S/H groups + density/hardness/machinability
- `registries/ToolRegistry.ts` (54K) — geometry, materials, coatings
- `registries/MachineRegistry.ts` (55K) — kinematics, axes, thermal profiles
- `registries/MachineSpindleDefaults.ts` (12K) — spindle envelope per machine
- `registries/CoatingRegistry.ts` (25K) — TiN/AlCrN/DLC etc.
- `registries/CoolantRegistry.ts` (31K) — flood/through-tool/MQL/cryo
- `registries/AlgorithmRegistry.ts` (62K) — algorithm catalog
- `registries/FormulaRegistry.ts` (68K) — MRR/power/torque/Taylor formulae
- `services/MaterialService.ts` — material resolver for SFC lookup

## DATA CATALOGS (`H:/prism/mcp-server/src/data/`)

**Tool catalogs (`.ts` files):** sgs, osg, guhring, sandvik, seco, indexable, additional (2.1MB / 13K tools — Flash+MA-Ford+Korloy+Rapidkut+Generic+YG-1), ingersoll, emuge (2.9MB), zenit, ampc (1.0MB), global-cnc, tungaloy-us, tungaloy-tooling, sandvik-2022, kennametal-tooling-systems, mitsubishi, helical (3.9MB), horn, niagara, dormer-pramet, sumitomo, lathe-tooling — all `*-tool-catalog.ts`

**Tool catalogs (`.json` extracted, used by PRISMToolCatalogAggregatorEngine):** accupro/additional/ampc/camfix/catalog-c010b/emuge/flash/guhring/haimer-holders/hsm-advisor/hypermill/iscar/ingersoll/big-daishowa-holder — `*-extracted.json` in same dir. 41,192 unique tools after dedupe.

**Speed-feed data tables:** `guhring-iscar-speed-feed-data.ts`, `helical-speed-feed-data.ts`, `hypermill-speed-feed-catalog.ts` (1.2M, materials × tools matrix), `osg-speed-feed-data.ts`, `manufacturer-speed-feed-data.ts`, `new-manufacturer-speed-feed-data.ts`

**Material data:** `hypermill-materials-catalog.ts` (1.2M Kienzle + Johnson-Cook), `hypermill-materials.json`, `edm-material-db.ts`

**Machine data:** `machine-kinematics-catalog.ts` (166K), `machine-kinematics-enriched.ts` (430K), `machine-3d-model-catalog.ts`, `machine-profiles-catalog{,-ext,-ext2}.ts`, `machine-post-enriched.ts` (381K), `machine-enrichment-catalog.ts` (242K), `machine-spindle-corrections.ts`, `machine-torque-curves.ts` (745K), `okuma-machines-from-step.ts`, `wedm-published-machines.ts`

**Tool holders:** `guhring-holder-catalog.ts`, `haimer-holder-catalog.ts`, `regofix-holder-catalog.ts`, `tungaloy-holder-catalog.ts`, `kennametal-tooling-systems-catalog.ts`

**Tribal tips (CAM-system speeds/feeds doctrine):** `tribal-tips/milling-pdf-cited-tips.ts` (260K Kennametal/Sandvik/CNC-Cookbook cited), `tribal-tips/post-pdf-cited-tips.ts`, `tribal-tips/jm-die-curriculum/` (FANUC/HAAS/OKUMA/MAZAK/SIEMENS/HURCO), `bobcad-cam-tips.ts`, `camworks-cam-tips.ts`, `hypermill-cam-tips-ext.ts`, `fusion360-cam-tips.ts`, `catia-cam-tips.ts`, `esprit-cam-tips.ts`, `edgecam-cam-tips.ts`, `gibbscam-cam-tips.ts`

**Shop CSVs (JM Die on-hand tools):** `mcp-server/src/data/shop-tools/shop-tools-{endmills,twist-drills,insert-drills-130,insert-drills-180,boring-rough,boring-finish,turning}.csv` — 218 total (the small CSV path, NOT the catalog aggregation)

## JM DIE FLEET (`H:/PRISM/JM DIE/`)

- `jm-die-profile.ts` — `JM_DIE_CONTROLLER_MAP` 15 entries (7 Okuma lathes + 5 mills + 2 sinker EDMs + 1 wire EDM)
- `H:/PRISM/JM DIE/CNC LATHE/` — 93 lathe part programs (HAAS + Okuma)
- `H:/PRISM/JM DIE/CNC MILL HAAS/`, `CNC OKUMA MULTUS/`, `HAAS-HURCO/`, `HURCO CNC PROGRAMS/`, `LATHE/`, `OKUMA/`, `WIRE EDM/`, `MACRO PROGRAMS/`, `SETUPS/`, `JM DIE COMPANY/`
- `H:/PRISM/JM DIE/POST PROCESSORS/` — post-processor registry

## OPERATOR LIVE VENDOR DATA

- `C:/Users/wompu/AppData/Roaming/HSMAdvisor/machines.xml` — 12 PRISM machines applied 2026-05-27 (backup .bak-2026-05-27T12-28-06-983Z)
- `C:/Users/wompu/AppData/Roaming/HSMAdvisor/user_tool_lib.tooldb2.xml` — 41,209 PRISM tools applied (backup .bak-2026-05-27T02-58-25-176Z = TRUE ORIGINAL)
- `C:/Users/wompu/AppData/Roaming/HSMAdvisor/settings_v2.xml` — operator defaults (read by HSMAdvisorAdapter)
- `C:/Users/wompu/AppData/Roaming/GWizard.10BF72DB3E21DFA5E488DD435BD80808DFD917E3.1/Local Store/toolcrib.csv` — 41,209 PRISM tools applied (backup .bak-2026-05-27T02-58-25-065Z = TRUE ORIGINAL)
- `.../GWizard.db` — 11KB SQLite (effectively empty machines DB, deferred to U-OSC9-15-GWIZARD-MACHINE-DB)

## DISPATCHERS + SLASH COMMANDS

**`calcDispatcher.ts` SFC actions:** `sfc_calculate`, `sfc_feed_for_target`, `sfc_optimize_run`, `sfc_nine_axis_run`, `sfc_baseline_compare`, `sfc_propagate_all`, `sfc_bridge_to_post_processor`, `sfc_bridge_to_print_to_program`, `sfc_subscriber_register`, `sfc_subscriber_cache_snapshot`, `sfc_subscriber_get_pack`, `sfc_psn_decision_prior`, `sfc_chatter_stable_rpm`, `sfc_exhaustive_sweep`, `sfc_outcome_feedback_stats/recent/record_actuals`, `sfc_tri_vendor_batch_compare` (U-OSC9-14), `sfc_shop_library_rank`, `sfc_pdf_corpus_bridge`, `gwizard_read_toolcrib`, `hsmadvisor_read_current_state`, `hsmadvisor_compare`, `wedm_training_pair_lookup`, `gwizard_library_export`, `hsmadvisor_library_export`, `hsmadvisor_machine_export` (U-OSC9-15), `joint_speed_feed_optimize`, `auto_speed_feed_calc`, `cam_speed_feed_bridge`, `ultimate_speed_feed`, `speedfeed_dl_stats/advanced_ai_stats/ultimate_ai_stats`, `speed_feed_mine`, `speed_feed_compare_to_baseline`, `speed_feed_autopilot`, `proven_speed_feed_aggregate_lathe/mill`, `proven_speed_feed_query/export`, `speed_feed_resource_{sfm,chiploads,facemill_strategy,hem,jmdie_material,optimal}`

**`camDispatcher.ts` SFC actions:** `lathe_sf_full`, `auto_speed_feed_optimize`

**Slash commands:** `/auto-speed-feed`, `/auto-speed-feed-lathe`, `/test-speed-feed` (401-test gauntlet), `/cycle-time-crush`, `/mill-studio`, `/lathe-studio`, `/wire-edm-studio`, `/quote-to-ship` (stage 5 SFC), `/wedm-program`

## CROSS-DOMAIN ADJACENCY MAP

```
                      UltimateSpeedFeedEngine (PHYSICS)
                                  ↕
                      SpeedFeedOrchestratorEngine (HUB)
                                  ↕
   ┌──────────┬───────────┬────────────┬──────────────┬────────────┐
   ↓          ↓           ↓            ↓              ↓            ↓
  MILL      LATHE       WEDM        POST-PROC      QUOTE         CAM
  CAM*Bridge LatheFacade  WEDMReason  PropagationBr ToQuoteBr    Feature→Strat
  +6 ApplyEng +DLAdvisor  +Klocke    +override blk +MRR→cyc      +CAMSpeedFeed
            +Reasoning   +pulse params               (re-feedback)
            +ShopAware
            +Bayesian
            +JMDieUpgrader
```

**sfcOutcomeWire bus** broadcasts every recommendation → DL calibration ring + outcome feedback (audit F9) + 5 downstream caches + all domain consumers.

## WIKI ENTRIES (`H:/prism/knowledge/wiki/`)

**Architecture/tests/sf/:** `sfccalculateengine.md`, `sfcdriftcanaryengine.md`, `sfcfewshotnewmaterialengine.md`, `sfcmultihypothesisrankerengine.md`, `sfcinferencegatewireengine.md`, `sfcprovenancewireengine.md`, `sfcoutcomecapturewireengine.md`, `sfcragwarmstartengine.md`, `sfcparameterrefinementengine.md`, `pp/ppgsfcclosedlooporchestratorengine.md`

**Architecture/actions/calc/:** `speed-feed.md`, `auto-speed-feed-calc.md`, `cam-speed-feed-bridge.md`, `ultimate-speed-feed.md`, `speed-feed-compare-to-baseline.md`, `speed-feed-resource-{sfm,chiploads,facemill_strategy,hem,jmdie_material,optimal}.md`, `proven-speed-feed-*.md`, `speed-feed-autopilot.md`

**Architecture/actions/aireasoning/:** `ai-resource-speed-feed.md`, `ppg-sfc-closed-loop.md`, `sfc-drift-canary-check.md`, `xproc-neural-consult-speedfeed.md`

**Architecture/actions/adaptivecontrol/:** `tool-life-predict.md` (Weibull), `adaptive-chatter-analyze.md`, `adaptive-spindle-stability.md`

**Architecture/dispatcher-calc.md** — 1353-action manifest

## OBSIDIAN MEMORIES (`C:/Users/wompu/.claude/projects/H--prism/memory/`)

**Oscar SFC reference snapshots:**
- `reference_oscar_sfc_9axis_ship_absorbed_2026_05_25.md` — U-OSC9-01 9-axis orchestrator (1954 LOC)
- `reference_oscar_sfc_9axis_ms0_2026_05_26.md` — 6 units (ShopLibBridge, HSMAdvisor, PDFCorpus, Comparator, G-Wizard, WEDM)
- `reference_oscar_sfc_9axis_u_osc9_14_2026_05_26.md` — TriVendor batch comparator (162-cell smoke result)
- `reference_oscar_sfc_domain_map_2026_05_27.md` — **THIS FILE**

## HOOKS + SCRIPTS

- `H:/prism/mcp-server/scripts/hooks/sfc-provenance-guard.mjs` — PostToolCall gate blocking SFC actions lacking provenance (set `PRISM_SFC_PROVENANCE_HARD_BLOCK=1` for ITAR/AS9100)
- `H:/prism-slot-oscar/scripts/sf-tri-vendor-smoke.mjs` — tri-vendor batch matrix smoke
- `H:/prism-slot-oscar/scripts/sf-parity-preview.mjs` — G-Wizard + HSMAdvisor parity export (tools + machines)

## STATE LEDGERS (`H:/prism/mcp-server/data/state/`)

- `MILLING_REASONING_TRACE_LEDGER.jsonl` — mill SFC reasoning traces
- `REASONING_TRACE_LEDGER.jsonl` — cross-domain SFC reasoning
- `TEMPORAL_STATE_LEDGER.jsonl` — historical snapshots
- `cost-telemetry.jsonl` — tool cost + MRR correlation
- `outcomes/outcomes.jsonl` — domain completion events
- `dev-outcomes.jsonl` — dev testing outcomes

## MILESTONE ENVELOPES (`H:/prism/mcp-server/data/milestones/`)

- `OSCAR-SFC-9AXIS-MS0.json` — primary SFC milestone (14 shipped + 3 future-work: U-OSC9-17-AI-TRAINING, U-OSC9-15-GWIZARD-MACHINE-DB, U-OSC9-16-MATERIAL-MAP)

## FAST-LOOKUP CHEAT SHEET

| Need | Hit |
|---|---|
| Run a single SFC cell | `speedFeedNineAxisOrchestratorEngine.run({material, tooling, toolpath, mode})` |
| Compare to vendor baselines | `prism_calc:sfc_baseline_compare` |
| Cross-vendor batch | `prism_calc:sfc_tri_vendor_batch_compare` |
| Push tools to vendors | `prism_calc:{gwizard_library_export, hsmadvisor_library_export}` |
| Push machines to vendors | `prism_calc:hsmadvisor_machine_export` |
| Lathe SFC | `latheSpeedFeedCalculatorFacadeEngine.calculate()` / `prism_cam:lathe_sf_full` |
| CAM bridge | `camSpeedFeedBridgeEngine.translate()` |
| Aggregate all PRISM tools | `prismToolCatalogAggregatorEngine.aggregate({})` — 41K |
| Find which engine handles X | search this file FIRST, then Grep on `engines/` |
| Find a wiki entry | `knowledge/wiki/index.md` grep — or hit this file's wiki section |
| Tribal tip lookup | `mcp-server/src/data/tribal-tips/` + the `*-cam-tips.ts` family |
| Operator vendor live state | `C:/Users/wompu/AppData/Roaming/{HSMAdvisor,GWizard*}` |
