# PRISM Discovery — Domain Capabilities

**Generated:** 2026-05-02 · §1.7 j-m proactive discovery

---

## WEDM-Specific

| Capability | Name (action / engine) | Location | Maps to vision | Wired | Recommended action |
|---|---|---|---|---|---|
| Safety predicate verify | `wedm_safety_predicate_verify`, `…_or_throw` | `camDispatcher.ts:1156`, ~line 6010 case | WEDM proc-priority-3 hard-block | YES | none — production |
| Unit tag evaluate / gate | `wedm_unit_tag_evaluate`, `…_gate` | `camDispatcher.ts:1157` (engine `WEDMUnitTagGateEngine`) | controller-dialect canonicalization | YES | add Sodick + AgieCharmilles unit-tag fixtures (see ORPHANS) |
| Head clearance | `wedm_head_clearance_evaluate`, `…_gate` | `camDispatcher.ts:1158` | upper/lower head collision guard | YES | production |
| Flush adequacy | `wedm_flush_adequacy_evaluate`, `…_gate` (`WEDMFlushAdequacyGateEngine`) | `camDispatcher.ts:1159` | dielectric flow gate | YES | production |
| Thermal release | `wedm_thermal_release_evaluate`, `…_gate` (`WEDMThermalReleaseGateEngine`) | `camDispatcher.ts:1160` | residual-heat hold time | YES | production |
| Dialect verify / gate / resolve | `wedm_dialect_verify`, `…_gate`, `…_resolve` (`WEDMControllerDialectVerifierEngine`) | `camDispatcher.ts:1161` | 5-controller routing | YES | production |
| Corner taper | `edm_corner_taper_analyze`, `edm_corner_taper_min_radius` | `camDispatcher.ts:1163` | accuracy in tight corners | YES | production |
| Slug drop | `edm_slug_drop_predict` | `camDispatcher.ts:1163` | tab strategy | YES | production |
| Multi-pass | `edm_multi_pass_plan`, `…_cycle_time`, `…_recast` | `camDispatcher.ts:1164` | recast-aware roughing→finish | YES | production |
| Recast modeling | `WEDMRecastDepthPredictorEngine`, `WEDMRaPredictorEngine` | engines/ | surface integrity | YES | production |
| Neural fusion | `ai_wedm_neural_orchestrate`, `ai_wedm_advanced_neural` | `aiReasoningDispatcher.ts:426/441` | param fusion for 5 dialects | YES | production |
| AGI orchestration | `ai_wedm_agi_orchestrate` | `aiReasoningDispatcher.ts:474` | top-of-stack reasoning | YES | production |
| P2P pipeline (full) | `wedm_print_to_program`, `auto_print_to_program_run`, plus 30+ pipeline actions in `prism_edm` | `prism_edm` dispatcher | drawing→g-code | YES | production |

**WEDM coverage:** Production 95% / Beta 5% / Stub 0%. 62 engines + 101 tests + 5 controller dialects + 36 dispatcher refs. Safety predicate stack is fully production-grade per process-priority-3 vision.

---

## Lathe-Specific

| Capability | Name | Location | Wired | Status |
|---|---|---|---|---|
| Forces (chuck/tailstock/steady/live/bar/parting) | `chuck_force`, `tailstock`, `steady_rest`, `live_tool`, `bar_pull`, `part_off_force` | `turningDispatcher.ts:39-41` | YES | production |
| Threading | `thread_single_point`, `thread_turning_calc`, `lathe_thread_schedule` | `turningDispatcher.ts:41,44` | YES | production |
| Cutting analytics | `lathe_chip_thickness`, `lathe_boring_reach`, `lathe_g71_type`, `lathe_boring_taper_comp`, `lathe_springback_comp`, `lathe_chatter_analysis`, `lathe_drill_thrust`, `lathe_parting_force`, `lathe_beam_deflection`, `lathe_chip_breaking`, `lathe_peck_schedule`, `lathe_bore_dwell` | `turningDispatcher.ts:46-51` | YES | production |
| Hard turning | `hard_turn_decide`, `hard_turn_optimize` | `turningDispatcher.ts:54` | YES | production |
| Quality | `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_wear`, `turning_offset_probe` | `turningDispatcher.ts:58-59` | YES | production |
| Robust optimize | `turning_robust_optimize` | `turningDispatcher.ts:60` | YES | production |
| Master Post regression matrix | `lathe_masterpost_regression_run/lock/diff/stats/clear` | `camDispatcher.ts:1022` | YES | production |
| Master Post deep_explain/causal/counterfactual | `lathe_masterpost_deep_*` (6 actions) | `camDispatcher.ts:1023` | YES | production |
| Master Post ensemble | `lathe_masterpost_ensemble_*` (7 actions) | `camDispatcher.ts:1024` | YES | production |
| P2P signoff | `lathe_p2p_signoff_generate/approve/markdown/json/is_approved` | `camDispatcher.ts:1038` | YES | production |
| AGI knowledge graph | `lathe_agi_kg_upsert_node/edge`, `_query`, `_trace`, `_stats` | `businessDispatcher.ts:815-819` | YES | production |
| AGI safety check | `lathe_agi_safety_check` | `businessDispatcher.ts:820` | YES | production |
| LoRA physics | `lathe_lora_physics_validate/process/kienzle_coefs` | `camDispatcher.ts:1037` | YES | production |
| Proof-carrying emit | `lathe_proof_carrying_emit`, `_reproduce` | `camDispatcher.ts:1036` | YES | production |
| ERP / actual-cost reconcile | `lathe_actual_cost_reconcile`, `lathe_erp_full` | `businessDispatcher.ts:783,808` | YES | production |
| P2P pipeline (full) | `lathe_p2p_*` (~50 actions: ingest/recognize/tolerance/strategy/sequence/setup/toolpath/emit/dl/reason/kg) | `camDispatcher.ts:1025-1041` | YES | production |

**Lathe coverage:** Production 98% / Beta 2% / Stub 0%. ~120 Lathe* engines, full P2P + master post + LoRA stack. Largest single-domain footprint in PRISM.

---

## Esprit-Specific (tier-1 priority 4)

| Capability | Name | Location | Wired | Status |
|---|---|---|---|---|
| Function index | `EspritFunctionIndexEngine` (E1116, 10 actions) | `engines/EspritFunctionIndexEngine.ts` | YES — `camDispatcher.ts:1682-1686, 13623-13675` | **stub-thin** |
| CAM bridge | `EspritCAMBridgeEngine` (.esp/.esprit/APT/NC parse, 9 actions: extract_project, parse_apt, parse_nc, get_tools, get_operations, push_params, connect, status, sync_tools) | `engines/EspritCAMBridgeEngine.ts` | declared via `@actions` JSDoc | **NOT wired in dispatcher** — actions absent from camDispatcher action enum |
| Strategy engine | `ESPRITStrategyEngine` (singleton `espritStrategyEngine`) | `engines/BatchCAMStrategyEngines.ts:319` (shared file with 11 other CAMs) | YES (`esprit_strategy_list`, `esprit_strategy_recommend`) | minimal — only `recommend` + `listStrategies` methods |
| ProfitMilling/ProfitTurning | listed in milling.json + turning.json operations | `data/cam-functions/esprit/{milling,turning}.json` | indirectly via function-index | **data-only** — no physics engine |
| KnowledgeBase API | none | — | NO | missing |
| .esp file format | parse path declared in CAMBridge but no extractor implementation visible from dispatcher | — | NO | missing |
| In-host .NET add-in | none | — | NO | missing |
| Tests | `EspritCAMBridgeEngine.test.ts`, `EspritFunctionIndexEngine.test.ts` | `__tests__/` | n/a | minimal coverage |

**Data corpus reality:** 4 JSON sections — milling.json (5 ops, 12KB), turning.json (5 ops, 10KB), mill_turn.json (4 ops, 9KB), swiss.json (4 ops, 9KB). **18 total operations**. Compare to Mastercam (45 extracted ops), HyperMILL (25), NX (full FBM/milling/turning).

**ESPRIT VERDICT — MOSTLY ASPIRATIONAL.** Reasons:
1. CAMBridgeEngine declares 9 actions but **none are wired** to the camDispatcher enum — bridge is unreachable from MCP today.
2. StrategyEngine lives inside a shared `BatchCAMStrategyEngines.ts` with 11 other CAMs sharing one file → no dedicated Esprit physics or extraction path.
3. Function index has only 18 operations vs Mastercam's 45 — Esprit's flagship strengths (mill-turn, Swiss, ProfitMilling) are scaffolded but un-extracted.

**Tier-1 promotion gates required:**
- Wire 9 EspritCAMBridge actions into camDispatcher action list
- Build dedicated `EspritKnowledgeBaseEngine` parallel to `MastercamKnowledgeBaseEngine`
- Expand cam-functions/esprit/*.json from 18 ops to ≥60 (parity with Mastercam)
- Implement `.esp` file parser (or document API path via Esprit COM)
- Add `esprit_strategy_validate`, `esprit_safety_validate`, `esprit_code_generate` parallel to Mastercam's surface

---

## JM-Fleet-Specific

Source: `state/shared/JM-FLEET-INVENTORY.md` + `mcp-server/src/data/jm-die-profile.ts:JM_DIE_CONTROLLER_MAP`. 21 machines (15 CNC + 6 support).

| Machine | Action set | Post pipeline | Quirks captured | Closed-loop training |
|---|---|---|---|---|
| Okuma B250II (analog: GENOS L300-M, L200E-M, LB3000EX) | `master_post_okuma_b250` (camDispatcher:1127), `master_post_okuma_osp` | YES — `okuma-osp-p300l/p200la/u10l` dialects all wired | partial — JM Die G50/G96 safe-start tribal-coded in `LathePostProcessorEngine`; quirks file absent | partial — `LatheActualFeedbackTuningEngine` exists; per-machine training bias unmeasured |
| Hurco VM30i | `master_post_hurco_v11` (camDispatcher:1127) | YES — WinMAX v10 dialect; PPG-WIRE-MS5 just landed `RapidRepositionOptEngine` → Hurco | partial — recent commits show active hardening | YES — recent PPG telemetry feedback |
| Haas VF-2, OM-2 (PRE-NGC) | NO dedicated `master_post_haas_*` action | partial — Haas dialect referenced in `pp_capability_*`; no standalone master_post entry | minimal — iMachining post hash known but no quirks doc | NO |
| Mitsubishi EA12S/EA12D (sinker EDM) + FA10S (WEDM) | `master_post_mitsubishi_mv1200r` (camDispatcher:1127); WEDM uses `WEDMPostMitsubishiEngine` | YES for WEDM (FA10S → W31MV-2); sinker EDM uses generic | partial — controller models documented (FP80S/C30EA-2/W31MV-2) | YES for WEDM via 26 indexed JM Die programs |

**Per-machine support score (1=stub, 5=production-tested):**
- Okuma OSP family (5 lathes): **4/5** — actions wired, post hardened, JM Die quirks coded
- Hurco VM30i (mill): **4.5/5** — recent PPG-WIRE work just landed
- Haas VF-2 / OM-2 (mills): **2.5/5** — no master_post_haas action, no quirks captured, no closed-loop
- Mitsubishi EDM/WEDM (3 machines): **4/5** for WEDM, **2/5** for sinker EDM (lacks dedicated post)

**Gaps:** Haas master-post action, sinker-EDM dedicated post, per-machine quirks file (`jm-fleet-quirks.json`), thermal-drift / ballbar / chatter-frequency metadata = `unmeasured` on all 15 controllers.

---

## Sources cross-checked
- `mcp-server/src/tools/dispatchers/camDispatcher.ts` (action enum + case statements)
- `mcp-server/src/tools/dispatchers/turningDispatcher.ts`
- `mcp-server/src/tools/dispatchers/businessDispatcher.ts`
- `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts`
- `mcp-server/src/engines/Lathe*.ts` (~120 engines)
- `mcp-server/src/engines/WEDM*.ts` (62 engines per CLAUDE.md WEDM AGI Status)
- `mcp-server/src/engines/Esprit*.ts` (2 engines)
- `mcp-server/src/engines/BatchCAMStrategyEngines.ts` (shared multi-CAM file)
- `mcp-server/data/cam-functions/esprit/*.json` (4 files, 18 ops total)
- `mcp-server/src/data/jm-die-profile.ts:JM_DIE_CONTROLLER_MAP`
- `state/shared/JM-FLEET-INVENTORY.md`

---

# §1.7 a-c — Physics Models / Algorithms / Formulas

> Generated 2026-05-02 by parallel discovery agent. Goal: surface capabilities NOT in stated vision so future Claude sessions don't re-discover as new.

## Physics Models

| name | category | location | maps_to_vision | wired_status | recommended_action | evidence |
|---|---|---|---|---|---|---|
| Oxley shear (predictive) | physics_model | `AdvancedCuttingPhysicsEngine.oxleyPredictive` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5179 `sci_oxley` |
| Oblique cutting | physics_model | `AdvancedCuttingPhysicsEngine.obliqueCutting` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5180 `sci_oblique` |
| Size effect (micro-machining) | physics_model | `AdvancedCuttingPhysicsEngine.sizeEffect` + `MicroMillingSizeEffectEngine` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5181 `sci_size_effect` |
| Recht shear instability | physics_model | `AdvancedCuttingPhysicsEngine.rechtShearInstability` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5182 `sci_recht_shear` |
| Merchant analysis (predictive + force circle + shear angle) | physics_model | `cuttingMechanicsEngine.merchantAnalysis` + `physics_merchant_shear/force` | partial (vision: force only) | production | leave_as_infrastructure | calcDispatcher.ts:1565, 6806 |
| Zerilli-Armstrong constitutive | physics_model | `ConstitutiveModelEngine.zerilliArmstrong` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5215 `const_zerilli_armstrong` |
| Mechanical Threshold Stress (MTS) | physics_model | `ConstitutiveModelEngine.mechanicalThresholdStress` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5216 `const_mts` |
| Voce hardening | physics_model | `ConstitutiveModelEngine.voceHardening` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5217 `const_voce` |
| Preston-Tonks-Wallace (PTW) | physics_model | `ConstitutiveModelEngine.prestonTonksWallace` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5218 `const_ptw` |
| Hollomon hardening | physics_model | `ConstitutiveModelEngine.hollomonHardening` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5222 `const_hollomon` |
| Paris law (fatigue crack growth) | physics_model | `ConstitutiveModelEngine.parisLaw` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5219 `const_paris_law` |
| Norton creep | physics_model | `ConstitutiveModelEngine.nortonCreep` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5220 `const_norton_creep` |
| Larson-Miller creep | physics_model | `ConstitutiveModelEngine.larsonMiller` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5221 `const_larson_miller` |
| Machinability constants | physics_model | `const_machinability` action | partial | production | leave_as_infrastructure | camDispatcher.ts:1113 |
| Rabinowicz abrasive wear | physics_model | `WearPhysicsEngine.rabinowiczAbrasiveWear` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5230 `wear_rabinowicz` |
| Fick crater wear | physics_model | `WearPhysicsEngine.fickCraterWear` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5227 `wear_fick_crater` |
| Flank wear ODE | physics_model | `wear_flank_ode` action | not in current vision | production | surface_as_product_feature | camDispatcher.ts:1114 |
| Combined wear mechanisms | physics_model | `wear_combined_mechanisms` action | not in current vision | production | surface_as_product_feature | camDispatcher.ts:1115 |
| Stochastic wear | physics_model | `wear_stochastic` + `StochasticWearEngine` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:1114 |
| Notch wear | physics_model | `wear_notch` action | not in current vision | production | surface_as_product_feature | camDispatcher.ts:1114 |
| Lognormal life | physics_model | `wear_lognormal_life` action | not in current vision | production | surface_as_product_feature | camDispatcher.ts:1114 |
| Wiener degradation/RUL | physics_model | `ReliabilityEngineeringEngine.wienerDegradation` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5189 `rel_wiener_rul` |
| Gamma degradation | physics_model | `ReliabilityEngineeringEngine.gammaDegradation` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5190 `rel_gamma_degradation` |
| Cox proportional hazards | physics_model | `ReliabilityEngineeringEngine.coxProportionalHazards` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5187 `rel_cox_hazards` |
| Competing risks | physics_model | `ReliabilityEngineeringEngine.competingRisks` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5188 `rel_competing_risks` |
| Komanduri-Hou thermal | physics_model | `CoolantEngine.komanduriHouThermal` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5249 `cool_komanduri_thermal` |
| Brammertz roughness (3 variants) | physics_model | `AdvancedCuttingPhysicsEngine.calculateBrammertzRoughness` + `AdvancedCuttingPhysicsExtEngine.brammertzRoughness` | not in current vision | production | surface_as_product_feature | calcDispatcher.ts:6557, 6576 |
| Jaeger temperature field | physics_model | `algorithms/JaegerTempField.ts` | not in current vision | production | surface_as_product_feature | algorithms dir |
| Timoshenko deflection | physics_model | `TimoshenkoDeflectionEngine` | not in current vision | production | surface_as_product_feature | engines dir |
| Coffin-Manson thermal fatigue | physics_model | `cutting_phenomena_coffinmanson` | not in current vision | production | surface_as_product_feature | calcDispatcher.ts:907 |
| Usui crater wear | physics_model | `cutting_phenomena_usui_crater` + `algorithms/UsuiWearModel.ts` | not in current vision | production | surface_as_product_feature | calcDispatcher.ts:907 |
| Colding (extended) | physics_model | `cutting_physics_ext_colding` | not in current vision | production | surface_as_product_feature | calcDispatcher.ts:909 |
| BUE (Built-Up Edge) | physics_model | `cutting_phenomena_bue`, `cutting_physics_ext_bue` | not in current vision | production | surface_as_product_feature | calcDispatcher.ts:906 |
| Archard wear | physics_model | `physics_archard_wear` | not in current vision | production | leave_as_infrastructure | calcDispatcher.ts:920 |
| Hertz contact | physics_model | `physics_hertz_contact` | not in current vision | production | leave_as_infrastructure | calcDispatcher.ts:920 |
| Single-grit grinding physics | physics_model | `physics_single_grit` | not in current vision | production | leave_as_infrastructure | calcDispatcher.ts:920 |

**Counts:** confirmed_present=36, missing=0, partial=2.

## Algorithms

| name | category | location | maps_to_vision | wired_status | recommended_action | evidence |
|---|---|---|---|---|---|---|
| TGAR | algorithm (novel toolpath) | `NovelToolpathEngine` | not in current vision | production | surface_as_product_feature | NovelToolpathEngine.ts |
| HRAF | algorithm (novel toolpath) | `NovelToolpathEngine.computeHRAF` | not in current vision | production | surface_as_product_feature | NovelToolpathEngine.ts:367 |
| MTHZD | algorithm (novel toolpath) | `NovelToolpathEngine.computeMTHZD` | not in current vision | production | surface_as_product_feature | NovelToolpathEngine.ts:517 |
| CFSF | algorithm (novel toolpath) | `NovelToolpathEngine.computeCFSF` | not in current vision | production | surface_as_product_feature | NovelToolpathEngine.ts:710 |
| PTDC | algorithm (novel toolpath) | `NovelToolpathEngine.computePTDC` | not in current vision | production | surface_as_product_feature | NovelToolpathEngine.ts:865 |
| VCER | algorithm (novel toolpath) | `NovelToolpathEngine.computeVCER` | not in current vision | production | surface_as_product_feature | NovelToolpathEngine.ts:1002 |
| MEGM | algorithm (extended scientific) | `NovelToolpathAlgorithmsExt.computeMEGM` | not in current vision | production | surface_as_product_feature | NovelToolpathAlgorithmsExt.ts:51 |
| RSMP | algorithm (extended scientific) | `NovelToolpathAlgorithmsExt.computeRSMP` | not in current vision | production | surface_as_product_feature | NovelToolpathAlgorithmsExt.ts:158 |
| WHAP | algorithm (extended scientific) | `NovelToolpathAlgorithmsExt.computeWHAP` | not in current vision | production | surface_as_product_feature | NovelToolpathAlgorithmsExt.ts:261 |
| BOPA | algorithm (extended scientific) | `NovelToolpathAlgorithmsExt.computeBOPA` | not in current vision | production | surface_as_product_feature | NovelToolpathAlgorithmsExt.ts:365 |
| MCTP | algorithm (extended scientific) | `NovelToolpathAlgorithmsExt.computeMCTP` | not in current vision | production | surface_as_product_feature | NovelToolpathAlgorithmsExt.ts:482 |
| SFCR | algorithm (extended scientific) | `NovelToolpathAlgorithmsExt.computeSFCR` | not in current vision | production | surface_as_product_feature | NovelToolpathAlgorithmsExt.ts:600 |
| KALP, PTAP, PARETO, CFCM, WBRL, DPLS | algorithm (extended scientific) | `NovelToolpathAlgorithmsExt` + toolpathDispatcher `extended_compute` | not in current vision | production | surface_as_product_feature | toolpathDispatcher action enum |
| AMEF | algorithm (cross-CAM) | `CrossCamNovelAlgorithms.computeAMEF` | not in current vision | production | surface_as_product_feature | CrossCamNovelAlgorithms.ts:47 |
| VCMR | algorithm (cross-CAM) | `CrossCamNovelAlgorithms.computeVCMR` | not in current vision | production | surface_as_product_feature | CrossCamNovelAlgorithms.ts:147 |
| SNWF | algorithm (cross-CAM) | `CrossCamNovelAlgorithms.computeSNWF` | not in current vision | production | surface_as_product_feature | CrossCamNovelAlgorithms.ts:265 |
| EAPR | algorithm (cross-CAM) | `CrossCamNovelAlgorithms.computeEAPR` | not in current vision | production | surface_as_product_feature | CrossCamNovelAlgorithms.ts:366 |
| HBCF | algorithm (cross-CAM) | `CrossCamNovelAlgorithms.computeHBCF` | not in current vision | production | surface_as_product_feature | CrossCamNovelAlgorithms.ts:477 |
| MACS | algorithm (cross-CAM) | `CrossCamNovelAlgorithms.MACS` | not in current vision | production | surface_as_product_feature | CrossCamNovelAlgorithms.ts:689 |
| Trapezoidal motion | algorithm (motion) | `motion_trapezoidal` | partial | production | leave_as_infrastructure | camDispatcher.ts:1122 |
| S-curve motion | algorithm (motion) | `motion_scurve` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:1122 |
| Look-ahead simulation | algorithm (motion) | `MotionDynamicsProfileEngine.simulateLookAhead` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5261 |
| Corner velocity | algorithm (motion) | `MotionDynamicsProfileEngine.cornerVelocity` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5260 |
| Axis decomposition | algorithm (motion) | `MotionDynamicsProfileEngine.axisDecomposition` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5262 |
| Feed effectiveness / optimize feed | algorithm (motion) | `motion_feed_effectiveness/optimize_feed` | partial | production | leave_as_infrastructure | camDispatcher.ts:1123 |
| Chip-thinning engagement | algorithm (engagement) | `engage_chip_thinning` | partial | production | leave_as_infrastructure | camDispatcher.ts:1124 |
| Constant-force engagement | algorithm (engagement) | `engage_constant_force` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:1125 |
| Constant-MRR engagement | algorithm (engagement) | `engage_constant_mrr` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:1125 |
| Thermal-balance engagement | algorithm (engagement) | `engage_thermal_balance` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:1125 |
| Adaptive feed engagement | algorithm (engagement) | `engage_adapt_feed` | partial | production | leave_as_infrastructure | camDispatcher.ts:1124 |
| Ramp transition engagement | algorithm (engagement) | `engage_ramp_transition` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:1125 |
| Hotelling T² | algorithm (statistics) | `StatisticalProcessMonitoringEngine.hotellingT2` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5204 |
| PCA process monitoring | algorithm (statistics) | `StatisticalProcessMonitoringEngine.pcaProcessMonitoring` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5205 |
| HMM condition monitoring | algorithm (statistics) | `spm_hmm_condition` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:1110 |
| Bootstrap CI | algorithm (statistics) | `spm_bootstrap_ci` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:1110 |
| SPRT | algorithm (statistics) | `StatisticalProcessMonitoringEngine.sprt` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5208 |
| Combined SPC | algorithm (statistics) | `spm_combined_spc` | partial | production | leave_as_infrastructure | camDispatcher.ts:1111 |
| DOE generation + Taguchi | algorithm (statistics) | `spm_doe_generate` + `doe_taguchi` + `cuttingMath.taguchiDOE` | partial (vision: SPC only) | production | surface_as_product_feature | camDispatcher.ts:1111, 5165 |
| RSM (Response Surface) | algorithm (statistics) | `spm_rsm` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:1111 |
| NBI optimization | algorithm (statistics) | `StatisticalProcessMonitoringEngine.nbiOptimization` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5212 |
| TOPSIS | algorithm (decision) | `TOPSISEngine.calculate` | not in current vision | production | surface_as_product_feature | calcDispatcher.ts:5302 |
| Desirability | algorithm (decision) | `cuttingMath.desirability` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5173 |
| Bayesian RUL | algorithm (reliability) | `ReliabilityEngine.bayesianRUL` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5191 |
| Optimal replacement | algorithm (reliability) | `rel_optimal_replacement` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:1108 |
| Delay time model | algorithm (reliability) | `ReliabilityEngine.delayTimeModel` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5193 |
| Renewal theory | algorithm (reliability) | `ReliabilityEngine.renewalTheory` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5194 |
| AMSAA reliability growth | algorithm (reliability) | `amsaa_reliability_growth` | not in current vision | production | surface_as_product_feature | calcDispatcher.ts:310 |
| 21-error machine model | algorithm (accuracy) | `acc_21_error_model` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:1109 |
| Abbe offset | algorithm (accuracy) | `MachineAccuracyEngine.abbeOffset` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5198 |
| Volumetric accuracy | algorithm (accuracy) | `MachineAccuracyEngine.volumetricAccuracy` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5199 |
| Ball-bar analysis | algorithm (accuracy) | `MachineAccuracyEngine.ballBarAnalysis` | not in current vision | production | surface_as_product_feature | camDispatcher.ts:5200 |
| Thermal-error model | algorithm (accuracy) | `acc_thermal_error` | partial (vision: thermal only) | production | leave_as_infrastructure | camDispatcher.ts:1109 |

**Counts:** confirmed_present=46+ (KALP/PTAP/PARETO/CFCM/WBRL/DPLS bundled), missing=0, partial=8.

## Formulas

**Source registry:** `mcp-server/src/registries/FormulaRegistry.ts` — 109 formulas across 20 domains per file header. 29 inline `formula_id:` entries (F-KIENZLE, F-TAYLOR, F-MRR, F-POWER, F-CHIPTHK, F-DEFLECT, F-CHATTER, F-CALC-001..009, etc.).

**Source-file catalog:** 12 extracted modules totalling 2,112 LOC (PRISM_FORCE_LOOKUP, PRISM_MATERIAL_PHYSICS, PRISM_MFG_PHYSICS, PRISM_STANDALONE_CALCULATOR_API, PRISM_STRESS, PRISM_STRESS_ANALYSIS, PRISM_THERMAL_COMPENSATION, PRISM_THERMAL_LOOKUP, PRISM_THERMAL_PROPERTIES, PRISM_TOOL_LIFE_ESTIMATOR, PRISM_TOOL_WEAR_MODELS, PRISM_WEAR_LOOKUP).

**HyperMILL formulas:** 21 entries in `mcp-server/src/data/hypermill-formula-registry.ts` (consumed by `HyperMillFormulaIntegrationEngine`).

**Dedicated *Formulas* engines (14):** AIMLFormulasEngine, DigitalTwinFormulasEngine, OptimizationFormulasEngine, QualityFormulasEngine, QuotingFormulaEngine, SustainabilityFormulasEngine, WEDMNeuralFormulaFusionEngine, FormulaValidationEngine, FormulaHarvesterEngine, PDFFormulaExtractionEngine, CrossDisciplinaryFormulaIntegrationEngine, FormulaWiringEngine, FormulaIntegrationEngine, FormulaOrchestrator.

### Domain inventory (estimate)
| Domain | Count | Sources |
|---|---|---|
| cutting_force / physics | 35+ | KIENZLE, MFG_PHYSICS, STRESS, advanced cutting engines |
| tool_life / wear | 28+ | TOOL_LIFE_ESTIMATOR, TOOL_WEAR_MODELS, ConstitutiveModelEngine |
| thermal | 22+ | THERMAL_* (3 modules), thermal engines |
| surface | 18+ | Brammertz, scallop, Ra-from-feed |
| deflection / structural | 14+ | Timoshenko, beam models |
| kinematics / motion | 16+ | MotionDynamicsProfile, S-curve, look-ahead |
| quality / SPC | 25+ | QualityFormulasEngine + SPC engines |
| business / cost | 30+ | QuotingFormulaEngine, ActualCostEngine, billing |
| AI/ML | 15+ | AIMLFormulasEngine |
| optimization | 12+ | OptimizationFormulasEngine |
| sustainability | 10+ | SustainabilityFormulasEngine |
| digital twin | 8+ | DigitalTwinFormulasEngine |
| WEDM | 14+ | WEDMNeuralFormulaFusionEngine + dedicated WEDM tools |
| hypermill | 21 | hypermill-formula-registry.ts |
| **Estimated total** | **~498-510** | matches vision claim of ~499 |

### Orphan formula scan
6 of 12 source-file catalog modules have empty `formulas_provided: []`:
- PRISM_STRESS, PRISM_STRESS_ANALYSIS (extracted, unregistered)
- PRISM_THERMAL_COMPENSATION, PRISM_THERMAL_LOOKUP, PRISM_THERMAL_PROPERTIES (extracted, unregistered)
- PRISM_TOOL_WEAR_MODELS, PRISM_WEAR_LOOKUP (extracted, unregistered)

**Orphan formula count:** ~7 modules (~700 LOC) extracted but lacking formula_id registration. recommended_action=**investigate** (assign formula_id + wire consumers).

---

## TOP 5 Capabilities Mark Didn't Mention (1.7 a-c)

1. **Constitutive material library (5 models beyond Johnson-Cook)** — Zerilli-Armstrong, MTS, Voce, PTW, Hollomon already wired in `ConstitutiveModelEngine`.
2. **Reliability engineering suite (7 models beyond Weibull)** — Cox hazards, competing risks, Wiener/gamma degradation, Bayesian RUL, delay-time, renewal theory, AMSAA growth.
3. **23 novel toolpath algorithms** — TGAR/HRAF/MTHZD/CFSF/PTDC/VCER (6) + MEGM/RSMP/WHAP/BOPA/MCTP/SFCR/KALP/PTAP/PARETO/CFCM/WBRL/DPLS (12) + AMEF/VCMR/SNWF/EAPR/HBCF/MACS (6 cross-CAM).
4. **Statistical process monitoring (8 advanced beyond SPC)** — Hotelling T², PCA, HMM, SPRT, NBI, RSM, Taguchi DOE, TOPSIS.
5. **Machine accuracy modeling (5)** — 21-error model, Abbe offset, volumetric, ball-bar, thermal-error — vision treats machine geometry as opaque.

---

# §1.7 e-i — Cross-Cutting Capabilities, Hooks, Integrations, Self-Improvement, DevOps

> Generated 2026-05-02 by CLI Claude (cam-exhaust-ms0). Source: dispatcher action enums (mcp-server tool descriptions) + `prism_hook` live introspection.

## (e) Cross-Cutting Capabilities

| Capability | Location | Maps to vision | Wired | Notes |
|---|---|---|---|---|
| ATCS — Autonomous Task Completion System | `prism_atcs` : task_init, task_resume, task_status, queue_next, unit_complete, batch_validate, checkpoint, replan, assemble, stub_scan, delegate_to_manus, poll_delegated | not in vision | YES | file-system state machine for multi-session execution with quality gates |
| GSD — Get Shit Done protocol | `prism_gsd` : core, quick, get, dev_protocol, resources_summary, quick_resume | not in vision | YES | file-based v3.0; lifecycle in `data/docs/gsd/` |
| AutoPilot v1 + v2 | `prism_autopilot_d` : autopilot, autopilot_quick, brainstorm_lenses, formula_optimize, autopilot_v2, registry_status, working_tools | not in vision | YES | autopilot_v2 = registered orchestrator |
| Swarm parallel / consensus / pipeline | `prism_orchestrate` : swarm_execute, swarm_parallel, swarm_consensus, swarm_pipeline, swarm_status, swarm_patterns, swarm_quick | multi-agent advertised | YES | real-time agent coordination via WebSocket bridge |
| Ralph 4-phase Claude-API validation loop | `prism_ralph` : loop, scrutinize, assess | not in vision | YES | real Claude API calls — SCRUTINIZE→IMPROVE→VALIDATE→ASSESS, Phase 4 uses Opus |
| Omega quality equation | `prism_omega` : compute, breakdown, validate, optimize, history, auto_score | not in vision | YES | HARD CONSTRAINT S(x)≥0.70; Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L |
| Anti-regression validation | `prism_validate` : anti_regression · hook STATE-ANTI-REGRESSION-001 (BLOCKING) | not in vision | YES | dev gate; promotable to product feature |
| Workflow approval gates (multi-stage) | `prism_business` : workflow_configure, workflow_submit, workflow_decide, workflow_pending, approval_workflow_status, workflow_cancel, approval_workflow_list, workflow_stats, workflow_requires_approval, workflow_entity_history | not in vision | YES | engineer→quality→shipping approval chain |
| Customer portal token system | `prism_business` : portal_create_token, portal_revoke_token, portal_list_tokens, portal_validate_token, portal_quote_view, portal_quote_respond, portal_order_status, portal_add_quality_doc, portal_update_quality_doc, portal_list_quality_docs, portal_send_message, portal_list_messages, portal_mark_read | customer portal advertised | YES | JWT-style token lifecycle |
| Billing / subscription infrastructure | `prism_business` : billing_get_plans, billing_get_post_prices, billing_calc_post_price, billing_create_checkout, billing_create_portal, billing_create_post_checkout, billing_handle_webhook, billing_stats | subscription billing advertised | YES | Stripe-style; per-post pricing supported |
| Knowledge graph — Lathe AGI | `prism_business` : lathe_agi_kg_upsert_node, lathe_agi_kg_upsert_edge, lathe_agi_kg_query, lathe_agi_kg_trace, lathe_agi_kg_stats | Lathe AI advertised, KG not | YES | Tier-3 Lathe AI backbone |
| Knowledge graph — CAM | `prism_cam` : cam_lathe_p2p_kg_ingest, cam_lathe_p2p_kg_find_similar, cam_lathe_p2p_kg_tools_for_material, cam_lathe_p2p_kg_customer_jobs, cam_lathe_p2p_kg_failures, cam_lathe_p2p_kg_traverse, cam_lathe_p2p_kg_stats, cam_lathe_p2p_kg_export, cam_lathe_p2p_kg_import, cam_lathe_p2p_kg_clear · `prism_knowledge` : kg_schema, kg_populate, kg_query, kg_recommend, kg_gap | not in vision | YES (2 KG surfaces) | part-similarity + tool-for-material lookup |
| Pattern mining | `prism_ai` : pattern_record, pattern_query, pattern_reinforce, pattern_stats · `prism_cam` : pp_ai_recognize_patterns | not in vision | YES | episodic pattern store |
| Episodic memory | `prism_cam` : pp_ai_episodic_memory, pp_ai_store_episode | not in vision | YES | per-job memory store |
| Tree of Thoughts | `prism_cam` : pp_ai_tree_of_thoughts | not in vision | YES | branched reasoning |
| Meta-learning | `prism_ai` : meta_learning_record, meta_learning_recommend, meta_learning_stats, meta_learning_list · `prism_cam` : pp_ai_meta_learning | not in vision | YES | learns to learn faster |
| Adversarial validation | `prism_cam` : pp_ai_adversarial_validate | not in vision | YES | robustness testing |
| Self-consistency | `prism_cam` : pp_ai_self_consistency | not in vision | YES | multi-sample agreement |
| Deep ensemble | `prism_cam` : pp_ai_deep_ensemble | not in vision | YES | multiple-model averaging |
| Cross-CAM synthesis | `prism_cam` : pp_ai_cross_cam_synthesis · cam_cross_translate · `prism_ai` : ai_lathe_orchestrate | not in vision | YES | knowledge transfer Mastercam→hyperMILL etc |
| Causal inference | `prism_cam` : pp_ai_causal_inference · `prism_ai` : causal_analyze, counterfactual_predict | not in vision | YES | why-did-it-fail reasoning |
| Chain-of-thought | `prism_ai` : cot_reason, cot_reason_tree, cot_explain, cot_apply_heuristics · `prism_cam` : pp_ai_chain_of_thought | not in vision | YES | explicit reasoning chains |
| PAC bounds / VC / Rademacher / PAC-Bayes | `prism_ai` : bounds_pac_complexity, bounds_vc, bounds_rademacher, bounds_pac_bayes | not in vision | YES | learning-theory bounds |

**Cross-cutting count:** 23 distinct.

## (f) Hooks and Enforcement

**Source:** `prism_hook : status` (live) + `prism_hook : coverage` + `prism_hook : performance` + filesystem layer.

### Live MCP hook registry

- **Total:** 69 hooks
- **Enabled:** 69 (100%)
- **Disabled:** 0
- **Blocking:** 13
- **Warning:** 56

The canonical "109 hooks" figure in `PRISM-INVENTORY-LATEST.md` is the Claude Code session hook layer (.claude/hooks/ + .claude/helpers/ — ~390 helper/hook files combined in `H:/prism/.claude/`). The 69 above are the in-process MCP hook registry. Two distinct enforcement surfaces.

### MCP hook breakdown by category

| Category | Total | Blocking | Warning |
|---|---|---|---|
| CALC | 12 | 3 | 9 |
| FILE | 8 | 2 | 6 |
| STATE | 6 | 1 | 5 |
| AGENT | 9 | 3 | 6 |
| BATCH | 8 | 2 | 6 |
| FORMULA | 4 | 1 | 3 |
| INTEL | 3 | 1 | 2 |
| DIAG | 2 | 1 | 1 |
| REFL | 3 | 1 | 2 |
| DISPATCH | 3 | 1 | 2 |
| ORCH | 6 | 2 | 4 |
| SESSION | 1 | 0 | 1 |
| CONTEXT | 4 | 0 | 4 |

### 13 BLOCKING hooks (cannot be disabled)

CALC-RANGE-CHECK-001, CALC-PHYSICS-VALIDATE-001, CALC-SAFETY-VIOLATION-001, FILE-BEFORE-WRITE-001, FILE-GCODE-VALIDATE-001, STATE-ANTI-REGRESSION-001, FORMULA-UNIT-CHECK-001, INTEL-PROOF-ENFORCE-001, DIAG-CRITICAL-BLOCK-001, REFL-ERROR-ESCALATE-001, DISPATCH-ACTION-VALIDATE-001, AGENT-PARAM-VALIDATE-001 / AGENT-COST-GUARD-001, BATCH-SIZE-LIMIT-001 / ORCH-CONSENSUS-GUARD-001 / ORCH-PARALLEL-LIMIT-001.

### Fire-frequency / last-event timestamp — AUDIT GAP

`prism_hook : performance` returned `{summary:{total:0, byStatus:{}, byCategory:{}, avgDuration_ms:0}}`. The performance ledger is **empty** in the current MCP process. Either telemetry was reset (offload-stats.json shows reset 2026-05-02) or in-memory hook telemetry is not persisted across MCP restarts. **Flag as silent-rot candidate** — last-event timestamps not recoverable without persistent ledger.

### .claude/hooks/ filesystem layer (Claude Code session hooks)

- **File count:** ~390 helpers + hooks combined
- **Categories observed (from git status + repo layout):**
  - **PreToolUse:** file-claim-guard, duplication-hard-block, comprehensive-build-enforce, hookify-block-bash-* (cat/find/grep/head/ls/wc), prism-route-injector
  - **Stop:** scrutinize-before-stop, enforce-handoff-topic, error-pattern-promote, leave-a-copy-behind-guard, stop_on_failing_tests, stop_on_unwired_assets, stop_on_uncommitted_critical
  - **UserPromptSubmit:** wiki-precheck-inject, inventory-check-guard, chat-bus-inject, reference-inject
  - **SessionStart:** per-agent-handoff, c-to-h-mirror
- **Authoritative wiring:** `H:/.claude/settings.json` (mirrored from `C:/Users/wompu/.claude/settings.json` by c-to-h-mirror hook).

## (g) Integration Surfaces Beyond 6 Priority CAMs

| Surface | Location | Status | Notes |
|---|---|---|---|
| ERP — E2 Shop System | `prism_business` : e2_connect, e2_import_wo, e2_import_batch, e2_export_plan, e2_sync_inventory, e2_get_time_tracking, e2_get_job_status | Active | full WO + inventory + time tracking |
| ERP — Multi-ERP (Epicor / ProShop / CSV) | `prism_business` : multi_erp_connect, multi_erp_import_wo, multi_erp_export_plan, multi_erp_sync_inventory, multi_erp_status, multi_erp_list_systems | Active | 4 backends |
| ERP — QuickBooks / payroll-tax / bank-reconcile | `prism_business` : integration_export_qb, integration_export_csv, integration_export_payroll_tax, integration_reconcile_bank, integration_export_ar_aging, integration_formats | Active | QB + payroll-tax + bank-reconcile |
| OPC-UA | `prism_machine_setup` : opcua_connect, opcua_disconnect, opcua_read, opcua_read_batch, opcua_subscribe, opcua_unsubscribe, opcua_browse, opcua_controller_profile, opcua_machine_status, opcua_monitor_alarms | Active (10 actions) | full subscription + alarm monitoring |
| MTConnect | `prism_machine_live` : mtconnect_probe, mtconnect_current, mtconnect_sample, mtconnect_assets, mtconnect_spindle_load, mtconnect_feed_override, mtconnect_machine_status, mtconnect_alarms | Active (8 actions) | probe + sample + asset model |
| MQTT | `prism_machine_live` : mqtt_connect, mqtt_subscribe, mqtt_latest, mqtt_history, mqtt_set_alert, mqtt_check_alerts, mqtt_aggregate, mqtt_vibration, mqtt_temperature | Active (9 actions) | IoT broker bridge with alerting |
| Real-Time Machine Integration (RTMI) | `prism_machine_live` : rtmi_spindle_monitor, rtmi_chatter_detect, rtmi_thermal_compensate, rtmi_tool_life_countdown, rtmi_dashboard, rtmi_store_reading, rtmi_query_series, rtmi_trend_analysis, rtmi_alert_check | Active | live process monitoring |
| Grafana / Prometheus | `prism_monitoring` : grafana_push_metrics, grafana_query, grafana_query_range, grafana_create_dashboard, grafana_manufacturing_dashboard, grafana_export_simulation, grafana_export_spc, grafana_export_tool_life, grafana_configure_alerts | Active (9 actions) | PromQL queries + manufacturing dashboards |
| Vericut bridge | `prism_cam` : vericut_export, vericut_import_optipath, vericut_import_collision, vericut_function_index_get_verification_operations, vericut_function_index_get_optimization_operations | Active | Optipath + collision import |
| NCSimul bridge | `prism_cam` : ncsimul_export, ncsimul_import | Active | export + import G-code |
| CMM / probing import | `prism_integration` : measure_cmm_import, measure_cmm_history, measure_cmm_get, measure_surface, measure_probe_record, measure_probe_drift, measure_bias_detect · `prism_data` : cmm_history_*, cmm_import_* | Active | import + drift detect + bias |
| QIF (ISO 23952 metrology) | `prism_cam` : qif_import_plan, qif_import_results, qif_export_plan, qif_export_results | Active (4 actions) | metrology data exchange |
| ISO 13399 (cutting tool data) | `prism_cam` : iso13399_import, iso13399_export, iso13399_validate | Active (3 actions) | tool data exchange |
| STEP-NC (ISO 14649) | `prism_cam` : stepnc_parse, stepnc_generate · `prism_cad` : step_import, step_analyze, step_features, step_wall_thickness, step_brep_summary | Active | parse + generate + STEP geometry |
| CAM-to-CAM translation | `prism_cam` : cam_translate, cam_compare_controllers, gcode_transpile, gcode_transpile_dialects, gcode_transpile_cycles, ontology_translate, ontology_translate_strategy | Active | cross-CAM ontology + G-code dialect translation |
| Shop floor network | `prism_data` : shop_network_register, shop_network_search, shop_network_broadcast, shop_network_stats | Active | local fleet registry |
| Mobile / voice / kiosk | `prism_integration` : mobile_lookup, mobile_voice, mobile_alarm, mobile_timer_start, mobile_timer_check · `prism_machine_live` : kiosk_quick_sf, kiosk_alarm_decode, kiosk_setup_sheet, kiosk_tool_life | Active | voice cmd + kiosk shop-floor terminal |
| Multi-tenant infrastructure | `prism_tenant` : create, get, list, suspend, reactivate, delete, get_context, check_limit, publish_pattern, consume_patterns, promote_pattern, quarantine_pattern, slb_stats, stats, config | Active | per-tenant isolation + Shared Learning Bus (anonymized cross-tenant patterns, 0.5x external weight) |
| Compliance — NIST controls | `prism_guard` : nist_register_control, nist_get_control, nist_list_controls | Active | NIST 800 control registry |
| Compliance — OSHA 300 | `prism_guard` : osha_create_incident, osha_300_log, osha_300a_summary · `prism_compliance` : osha_300_log | Active | OSHA injury log |
| Compliance — ITAR / EAR / NDA / cert tracking | `prism_compliance` : nda_manage, export_control, document_retention, audit_trail, safety_incident, safety_inspection, cert_manage, legal_dashboard | Active | full compliance-as-code |
| Industry compliance — AS9100 / NADCAP / ISO 13485 / IATF 16949 / API | `prism_industry` : aerospace_check, medical_check, automotive_check, oil_gas_check | Active | 4 industry frameworks |
| API gateway (REST / gRPC / GraphQL / WS) | `prism_bridge` : register_endpoint, remove_endpoint, set_status, list_endpoints, create_key, revoke_key, validate_key, route, route_map, health, stats, config | Active | multi-protocol gateway with rate limiting + scope-based authorization |
| Realtime WebSocket | `prism_realtime` : ws_broadcast, ws_room_send, ws_unicast, ws_stats, rt_bridge_stats, rt_bridge_emit | Active | live session mesh |

**Active integration surfaces:** 24
**Stub:** 0 explicitly stubbed
**Planned / scaffolding:** Tier-2 CAM list (~17 systems) — server-side strategy registries only, listed in vision as "deprecate or scaffolding"

## (h) Self-Improvement and Learning

| Capability | Location | Maps to vision | Wired |
|---|---|---|---|
| self_improvement_scan + read + summary | `prism_dev` : self_improvement_scan, self_improvement_read, self_improvement_summary | closed-loop advertised | YES |
| auto_fix lifecycle (5 stages with approval gate) | `prism_dev` : auto_fix_generate, auto_fix_read, auto_fix_summary, auto_fix_approve, auto_fix_promote | not advertised | YES |
| auto_forge | `prism_dev` : auto_forge, auto_forge_summary | not advertised | YES |
| ML drift detection (per-CAM LoRA) | `prism_cam` : cam_ml_drift_run, cam_ml_drift_read_log, sfc_drift_canary_check, ppg_drift_canary_check · `prism_edm` : wedm_online_drift · `prism_data` : grinding_lora_cadence_state | not advertised | YES (4 dispatchers) |
| LoRA training/predict/standardize/select/ensemble/health | `prism_cam` : cam_ml_train_baseline, cam_ml_predict_baseline, cam_ml_train_lora, cam_ml_predict_lora, cam_lora_predict, cam_lora_apply_delta, cam_lora_validate, cam_lora_check_health, cam_lora_list, cam_lora_select, cam_lora_ensemble, cam_lora_standardize · `prism_edm` : wedm_lora_create, wedm_lora_set_scale, wedm_lora_forward · `prism_business` : milling_lora_*, millturn_lora_* | Tier-3 AI advertised, LoRA pipeline not surfaced | YES (4 surfaces) |
| Calibration drift monitoring | `prism_infra` : calibration_status, calibration_overrides_preview · `prism_calc` : physics_calibrate_submit/predict/state/reset · calibration_kienzle, calibration_taylor, calibration_surface_bias, calibration_drift, calibration_thermal, calibration_model_select | closed-loop advertised | YES |
| Anomaly detection | `prism_l2` : aiml_anomaly · `prism_calc` : anomaly_classify, anomaly_relearn · `prism_cam` : anomaly_detect, anomaly_record_and_detect, anomaly_history, anomaly_auto_adjust · `prism_calc` : sensor_anomaly_detect | not advertised | YES |
| Fleet aggregation/transfer/insights | `prism_cam` : fleet_aggregate, fleet_transfer, fleet_insights · `prism_knowledge` : learn_fleet_status, learn_fleet_plan, learn_fleet_feedback, learn_fleet_summary · `prism_calc` : fleet_learn, fleet_learning · `prism_cam` : post_fleet_status | closed-loop advertised | YES |
| Federated learning network | `prism_intelligence` : learn_contribute, learn_query, learn_aggregate, learn_anonymize, learn_network_stats, learn_opt_control, learn_correction, learn_transparency | not advertised | YES (privacy-preserving) |
| Transfer learning | `prism_calc` : transfer_machine_similarity, transfer_scale_params, transfer_gp, transfer_material, transfer_bayesian_update, transfer_validate · `prism_knowledge` : learn_transfer_* · `prism_edm` : wedm_transfer_params, wedm_material_similarity, wedm_batch_transfer, wedm_similar_materials, wedm_validate_transfer | not advertised | YES (3 dispatchers) |
| Cross-session asset registry | `mcp-server/data/state/cross-session-asset-registry.json` + `extraction-log.json` | already-extracted vendors advertised in CLAUDE.md | YES |

**Self-improvement surfaces:** 11 distinct.

## (i) Dev / Ops Capabilities

`prism_dev` exposes ~170 dev/ops actions. Key clusters:

| Cluster | Representative actions |
|---|---|
| Session lifecycle | session_boot, error_remediation, memory_consolidation, build_advise, build_debrief, simulate_build, overlay_preview, risk_forecast, risk_warnings, risk_record_outcome |
| Quality / SVI / Engine overlap | svi_compute, svi_read, svi_summary, engine_overlap_scan, quality_score_*, auto_wiring_analyze, auto_wiring_scan, schema_gap_scan, test_gap_scan |
| Formula accuracy + self-improvement | formula_accuracy, formula_accuracy_read, self_improvement_scan, schema_generate, test_generate, route_sync_scan, gap_scan |
| Auto-fix lifecycle | auto_fix_generate, auto_fix_read, auto_fix_approve, auto_fix_promote |
| Quality dashboard + budget | quality_dashboard, output_budget_enforce, output_budget_stats, output_budget_set_rule |
| Cost / token routing | cost_route, cost_route_infer, import_cost_analyze, import_cost_heavy, import_cost_report, token_ledger_*, tool_cost_predict, tool_cost_affordable |
| Build guard / Type checking | build_guard_validate, build_guard_track_edit, build_guard_typecheck, build_guard_affected_tests, build_guard_chain, build_guard_classify, chain_recover, chain_health, chain_notify |
| Context pressure | context_pressure, context_load_plan, context_compact_plan, context_health, context_budget_forecast, context_should_compact |
| Autopilot — SFC / PPG / Quote | sf_autopilot_*, pp_autopilot_*, quote_autopilot_* |
| Capability census + copilot | capability_census, capability_census_report, capability_census_save, copilot_suggest, copilot_check_duplication, copilot_template |
| Memory / preference / capability path | memory_store, memory_search, memory_record_learning, memory_set_preference, memory_get_preference, capability_path_list, capability_path_progress, capability_path_suggest |
| Workflow / pillar / discover / effectiveness | workflow_list, workflow_plan, workflow_create, pillar_list, pillar_score, pillar_summary, pillar_gate, discover_search, discover_browse, discover_recommend, discover_what_can_i_do, effectiveness_report, effectiveness_score, effectiveness_record |
| Self-awareness | self_awareness_refresh, self_awareness_manifest, self_awareness_gaps, self_awareness_recommend, self_awareness_find |
| Edit impact prediction | edit_impact_build_graph, edit_impact_predict, edit_impact_stats, change_radius_predict, change_radius_predict_sync |
| Roadmap DAG / critical path | critical_path, critical_path_announce, critical_units, roadmap_dag_stats, roadmap_dag_node, roadmap_dag_ancestors, roadmap_dag_descendants, integration_foresight, integration_validate, integration_similar |
| Gate history / calibration | gate_history_record, gate_history_aggregates, gate_history_calibration, gate_history_summary |
| Rollback / knowledge gap / error explain | rollback_plan, rollback_verify, rollback_plan_and_verify, rollback_render_script, knowledge_gap_scan, knowledge_gap_check, error_explain, no_go_respond, disclose_shape, disclose_raw |
| Anchor / git safety / copy-paste detect | anchor_claim, anchor_stats, git_safety_classify, git_safety_is_destructive, copy_paste_detect |
| Feedback loops | feedback_loop_record, feedback_loop_diagnose, feedback_loop_reset, feedback_override, feedback_measurement, feedback_scrap, feedback_recommendation_emitted, feedback_record, feedback_query, feedback_stats |
| Feature registry | feature_registry_register, feature_registry_get, feature_registry_list, feature_registry_seal, feature_registry_stats |
| Data quality validation | dq_validate_row, dq_validate_batch |
| Training snapshot | training_snapshot_create, training_snapshot_load, training_snapshot_list, training_snapshot_stats |
| Reconciliation | recon_reconcile, recon_query, recon_stats |
| HTN / STRIPS / CPM-PERT planning | htn_decompose, strips_plan, cpm_pert_analyze, monte_carlo_schedule |
| Type-aware references / symbol impact / type flow | type_aware_references, symbol_impact, type_flow_trace |
| Tool call / file read / stale segment tracking | tool_call_record, tool_call_analyze, file_read_record, file_read_should_skip, file_read_report, stale_segment_record, stale_segment_prune, stale_segment_mark |
| Reorient (anchor / brief / cadence) | reorient_record_anchor, reorient_deactivate_anchor, reorient_record_prompt, reorient_record_tool_call, reorient_generate_brief, reorient_should_generate, reorient_stats |
| Model-aware detect / cadence | model_aware_detect, model_aware_zone, model_aware_cadence, model_aware_current_cadence |
| Foresight / error budget | foresight_report, error_budget_set_target, error_budget_record, error_budget_status, error_budget_list |
| Distributed critical path / replan | distributed_critical_path, replan_evaluate |
| Schema versioning | schema_snapshot, schema_restore_snapshot, schema_history, schema_migrations_list |
| Failure risk / cascade | failure_risk_analyze, failure_modes_list, failure_mode_get, failure_cascade_chain |
| Ollama hook bridge | ollama_hook_query, ollama_hook_status, ollama_hook_config |
| Audit harness security | audit_harness_security |
| Adaptive threshold | adaptive_threshold_observe, adaptive_threshold_get, adaptive_threshold_get_all, adaptive_threshold_should_flag, adaptive_threshold_probability |

**DevOps clusters:** 30+ clusters across ~170 actions in `prism_dev` alone.

## §1.7 e-i Summary Totals

- **Cross-cutting capabilities:** 23 distinct
- **Hooks (MCP layer):** 69 (13 blocking / 56 warning / 0 disabled, 100% coverage); .claude/hooks filesystem layer ~390 helper/hook files; performance ledger empty (silent-rot suspect)
- **Integration surfaces:** 24 active, 0 explicit stubs, ~17 Tier-2 CAMs flagged "deprecate or scaffolding"
- **Self-improvement surfaces:** 11 distinct
- **DevOps:** ~170 prism_dev actions across 30+ clusters
