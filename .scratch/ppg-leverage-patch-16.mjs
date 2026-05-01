#!/usr/bin/env node
// Apply 16-leverage-agent findings to PPG roadmap (MS1, MS3, MS7, MS9, MS14, MS17 + MS18-32 refactor notes)
// Idempotent: re-runs are safe (skip if marker present).

import fs from "node:fs";
import path from "node:path";

const MS_DIR = "H:/prism/mcp-server/data/milestones";
const NOW = new Date().toISOString();
const PATCH_TAG = "ppg-leverage-16-2026-04-29";

const changes = [];
function load(id) {
  const p = path.join(MS_DIR, `${id}.json`);
  return { p, json: JSON.parse(fs.readFileSync(p, "utf8")) };
}
function save(p, j) {
  j.last_updated = NOW;
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
}
function alreadyPatched(j) {
  return Array.isArray(j._patches) && j._patches.includes(PATCH_TAG);
}
function markPatched(j) {
  j._patches = [...new Set([...(j._patches || []), PATCH_TAG])];
}

// ----------------------------- MS1: G96 CSS lathe path -----------------------------
{
  const { p, json } = load("PPG-MS1");
  if (!alreadyPatched(json)) {
    json.leverage_existing.push(
      "CSSChipLoadInvariantCoordinatorEngine (E0125) — G96 CSS feed-rate continuity for lathe (LATHE-PROD-READY-MS0 U-LPR05)",
      "LatheSpeedFeedCalculatorFacadeEngine — lathe-specific S/F facade (already in MS1 wiring)",
      "OkumaB250LatheMasterPostEngine (E0355) + LatheMasterPostRouter (E0269) — lathe master post emit targets"
    );
    json.units.push({
      id: "U-PPGM13b",
      title: "Lathe G96 CSS block-by-block path (E0125 wired through L1+L2)",
      scope: "Wire CSSChipLoadInvariantCoordinatorEngine (E0125) into BlockByBlockFeedEngine for lathe ops; emit per-block S (m/min) → spindle RPM under G96 with S-clamp at G50; L2 macro emits #101*scale_table for diameter-aware override; round-trip test on Okuma B250 OD turning + boring + grooving (≥3 ISO groups: P=4140, M=304SS, K=cast iron).",
      files_to_modify: [
        "src/engines/BlockByBlockFeedEngine.ts",
        "src/engines/CSSChipLoadInvariantCoordinatorEngine.ts"
      ],
      tests_to_add: [
        "src/__tests__/BlockByBlockFeedLatheCSS.integration.test.ts"
      ]
    });
    json.units.push({
      id: "U-PPGM13c",
      title: "WEDM block-by-block energy schedule (skim pass override at L1)",
      scope: "Wire EDMMultiPassStrategyEngine into BlockByBlockFeedEngine for WEDM dialects (Mitsubishi M800, Sodick MotionLink, AgieCharmilles, Makino, Fanuc 31i WEDM); per-block (E, TON, TOFF, IP) instead of per-pass; sidecar carries the per-pass schedule.",
      files_to_modify: [
        "src/engines/BlockByBlockFeedEngine.ts"
      ],
      tests_to_add: [
        "src/__tests__/BlockByBlockFeedWEDM.integration.test.ts"
      ]
    });
    json.total_units = json.units.length;
    json.completion_criteria.push(
      "Lathe G96 CSS path: per-block spindle RPM consistent with cutting-speed target across diameter sweep on Okuma B250 OD turn corpus (≥10 reference programs)",
      "WEDM per-block energy schedule: 5 dialects emit pass-aware E/TON/TOFF without operator hand-edits"
    );
    markPatched(json);
    save(p, json);
    changes.push("PPG-MS1: +U-PPGM13b (lathe G96 CSS), +U-PPGM13c (WEDM per-block schedule), +3 leverage citations");
  }
}

// ----------------------------- MS3: WEDM 144-engine citation refresh -----------------------------
{
  const { p, json } = load("PPG-MS3");
  if (!alreadyPatched(json)) {
    json.leverage_existing.push(
      "WEDM engine pool (144 engines actually exist; wedm-engine-registry.ts shows 55 — STALE, queue refresh in U-PPGM26b)",
      "WEDMLatticeGraphEngine — 62-engine 64-dim GNN (lift to generic PrismLatticeGraph for cross-domain reuse in PPG-MS9)",
      "WEDMPrototypicalNetwork — ProtoMAML for new-material few-shot (already used in PPG-MS9; promote shared module)",
      "WEDMGraphAttention — graph attention over engine lattice (lift to generic PrismGraphAttention)",
      "WEDMRecastMLEngine — ML-driven recast prediction (overlay on RecastLayerEngine physics)",
      "WEDMHazPredictEngine + WEDMHazStockAllowanceEngine — heat-affected-zone allowance",
      "WEDMSparkErosionEngine + WEDMGapVoltageEngine + WEDMMRREngine — core spark erosion physics",
      "WEDMWireDeflectionEngine + WEDMWireFlushDeflectionEngine + WEDMWireHeatingJouleEngine + WEDMWireHeatingRACascadeEngine — wire mechanics",
      "WEDMThinWireDerateEngine — sub-0.1mm wire current derating",
      "WEDMKerfOverkerfEngine + WEDMKerfWidthEngine + WEDMKerfRoughnessEngine — kerf prediction",
      "WEDMSafetyGateEngine + WEDMUnitTagEngine + WEDMHeadClearanceEngine + WEDMFlushAdequacyEngine + WEDMThermalReleaseEngine + WEDMDialectVerifyEngine — 6 emit-time gates",
      "WEDMTribalRuntimeEngine + WEDMTipLearnerEngine + WEDMTribalPlaybookEngine — tribal/learning"
    );
    json.units.push({
      id: "U-PPGM26b",
      title: "Refresh wedm-engine-registry.ts (55 → 144 engines)",
      scope: "Audit src/engines/WEDM*.ts (currently 144 files); rebuild src/data/wedm-engine-registry.ts entries with capability + dispatcher route + test-coverage flag; assert MS3 leverage_existing matches a non-empty subset.",
      files_to_modify: [
        "src/data/wedm-engine-registry.ts"
      ],
      tests_to_add: [
        "src/__tests__/WEDMEngineRegistryFreshness.test.ts"
      ]
    });
    json.units.push({
      id: "U-PPGM26c",
      title: "Lift WEDMLatticeGraph + ProtoMAML + GraphAttention to generic PrismLattice* (consumed by PPG-MS9)",
      scope: "Extract reusable lattice infrastructure into src/engines/PrismLatticeGraphEngine.ts + PrismPrototypicalNetworkEngine.ts + PrismGraphAttentionEngine.ts; WEDM versions become thin wrappers; PPG-MS9 ProtoMAML wiring consumes the generic layer instead of WEDM-specific.",
      files_to_modify: [
        "src/engines/PrismLatticeGraphEngine.ts",
        "src/engines/PrismPrototypicalNetworkEngine.ts",
        "src/engines/PrismGraphAttentionEngine.ts",
        "src/engines/WEDMLatticeGraphEngine.ts",
        "src/engines/WEDMPrototypicalNetwork.ts",
        "src/engines/WEDMGraphAttention.ts"
      ],
      tests_to_add: [
        "src/__tests__/PrismLatticeGraphPromotion.test.ts"
      ]
    });
    json.total_units = json.units.length;
    json.completion_criteria.push(
      "wedm-engine-registry.ts reflects all 144 WEDM engines with dispatcher routes",
      "PrismLatticeGraph + PrismPrototypicalNetwork + PrismGraphAttention generic layer extracted; WEDM-specific engines pass through; PPG-MS9 consumes generic"
    );
    markPatched(json);
    save(p, json);
    changes.push("PPG-MS3: +U-PPGM26b (registry refresh), +U-PPGM26c (lift to generic), +12 leverage citations");
  }
}

// ----------------------------- MS7: rename + lathe + WEDM siblings -----------------------------
{
  const { p, json } = load("PPG-MS7");
  if (!alreadyPatched(json)) {
    json.title = "PPG-MS7 — Print → Program (Mill + Lathe + WEDM): MillingPrintToProgramEngine + LathePrintIngestPipeline + WEDM print-to-program wiring";
    json.description = "Wires the print-to-program pipelines for all three machining domains: (a) MillingPrintToProgramEngine (2,123 LOC mill engine, deprecates 14-LOC stub); (b) LathePrintIngestPipelineEngine (E0277, lathe domain, currently unwired into wizard); (c) wedm_print_to_program dispatcher action (WEDM domain, leverages WEDMGeometryParseEngine + WEDMFeatureClassifyEngine + WEDMDrawingInterpretEngine). Addresses user reminder: 'we're doing lathe and wire too'.";
    json.leverage_existing.push(
      "LathePrintIngestPipelineEngine (E0277) — lathe print-to-program pipeline (U-LTH33 LATHE-MASTER P4)",
      "TurningBlueprintIntakeEngine — converts blueprint OCR to TurningFeature[] (lathe sibling of mill blueprint vision)",
      "TurningParseMaterialEngine + TurningParseToleranceEngine + TurningParseFitEngine — lathe domain parsers",
      "TurningCadImportEngine + TurningRevProfileEngine + TurningFeatureTaxonomyEngine — lathe geometry pipeline",
      "TurningStockSelectEngine + TurningResolveAmbiguityEngine + TurningApplyISO2768Engine — lathe ambiguity resolution",
      "WEDMGeometryParseEngine + WEDMValidateGeometryEngine + WEDMInterpretDrawingEngine + WEDMClassifyFeaturesEngine — WEDM print intake (already wired in EDM dispatcher: wedm_parse_geometry, wedm_interpret_drawing, wedm_classify_features)",
      "auto_print_to_program + auto_detect_format + iges_parse + iges_extract_geometry — generic print intake (camDispatcher)"
    );
    json.units.push({
      id: "U-PPGM51b",
      title: "Lathe print → program dispatcher wiring (E0277 + 14 turning_* actions)",
      scope: "Wire LathePrintIngestPipelineEngine (E0277) into wizard step 0 for lathe jobs; route turning_print_to_program + turning_blueprint_intake + turning_parse_material + turning_parse_tolerance + turning_cad_import + turning_stock_select + turning_resolve_ambiguity + turning_rev_profile + turning_feature_taxonomy + turning_parse_fit + turning_apply_iso2768 + turning_process_plan + lathe_ui_submit + lathe_orchestrate (already in turningProgramDispatcher) through wizard. Round-trip test on 5 JM Die lathe reference prints (4140/304SS/A2/D2/carbide).",
      files_to_modify: [
        "web/src/api/ppg.ts",
        "web/src/pages/PostProcessorGeneratorPage.tsx",
        "src/engines/LathePrintIngestPipelineEngine.ts"
      ],
      tests_to_add: [
        "src/__tests__/LathePrintToProgram.integration.test.ts"
      ]
    });
    json.units.push({
      id: "U-PPGM51c",
      title: "WEDM print → program dispatcher wiring (4 wedm_* actions)",
      scope: "Wire wedm_parse_geometry + wedm_interpret_drawing + wedm_classify_features + wedm_assess_feasibility into wizard step 0 for WEDM jobs; add wedm_print_to_program top-level action that orchestrates the 4 underlying. Round-trip test on 3 JM Die WEDM reference prints (D2 12mm 4° taper, M2 8mm straight, carbide 6mm with 0.25R corners).",
      files_to_modify: [
        "src/tools/dispatchers/edmDispatcher.ts",
        "web/src/api/ppg.ts",
        "web/src/pages/PostProcessorGeneratorPage.tsx"
      ],
      tests_to_add: [
        "src/__tests__/WEDMPrintToProgram.integration.test.ts"
      ]
    });
    json.units.push({
      id: "U-PPGM51d",
      title: "Domain-router unit at wizard step 0 (auto-detect mill vs lathe vs WEDM)",
      scope: "Wizard step 0 detects file format + part geometry → routes to mill_print_to_program | turning_print_to_program | wedm_print_to_program; uses auto_detect_format + iges_parse + step_analyze; falls back to user choice on ambiguous geometry (e.g. mill-turn parts).",
      files_to_modify: [
        "web/src/pages/PostProcessorGeneratorPage.tsx",
        "web/src/api/ppg.ts"
      ],
      tests_to_add: [
        "src/__tests__/WizardDomainRouter.integration.test.ts"
      ]
    });
    json.total_units = json.units.length;
    json.completion_criteria.push(
      "Lathe print upload routes to E0277; populates lathe operation tree on 5 reference prints with ≥80% feature recognition",
      "WEDM print upload routes through wedm_print_to_program; multi-pass schedule generated automatically on 3 reference prints",
      "Wizard step 0 auto-detects domain across mill/lathe/WEDM with explicit fallback on ambiguous (mill-turn) parts"
    );
    markPatched(json);
    save(p, json);
    changes.push("PPG-MS7: title renamed to Mill+Lathe+WEDM, +U-PPGM51b/c/d, +7 leverage citations");
  }
}

// ----------------------------- MS9: orchestrator citations -----------------------------
{
  const { p, json } = load("PPG-MS9");
  if (!alreadyPatched(json)) {
    json.leverage_existing.push(
      "MasterPostProcessorUnifiedAGI (E0322) — already wired in prism_cam (post_*); the canonical orchestrator for AGI gates, NOT a new build",
      "PPValidatorAGIWiring (E0385) — AGI Orchestration for 50+ PP Validators (exact fit for MS9 gate band)",
      "TribalEnrichmentCoordinator (E0468) — 3,700+ tribal tips runtime injection (already in prism_knowledge)",
      "MillingAGIMaster (E0328) + MillMasterOrchestratorFacade (E0331) + CAMAGIMasterOrchestrator (E0072) — mill-domain AGI mounts",
      "LatheLoRAMasterOrchestrator (E0238) + LatheLoRAPipeline (E0250) + LatheLoRAEnsembleOrchestrator (E0229) + LatheLoRANeuralOrchestrator (E0245) + LatheLoRACadenceOrchestrator (E0220) + LatheLoRAPipelineCoordinator (E0249) — lathe-domain AGI mounts",
      "MastercamAIOrchestration (E0305) + HyperMillAIOrchestration (E0185) + FusionAIOrchestration (E0163) + InventorCAMAIOrchestration (E0201) + NXCAMAIOrchestration (E0350) + PowerMillAIOrchestration (E0384) + SolidCAMAIOrchestration (E0436) + CATIAMachiningAIOrchestration (E0101) — 8 vendor orchestrators (cite, do not rebuild)",
      "OrchestratorConfidenceFeedback (E0366) — orchestrator-level confidence aggregation (CAM-ML-CLOSEDLOOP-MS0 U-CMCCL13)",
      "OfflineRLOrchestrator (E0354) — RL-based feedback loop substrate",
      "RealTimeAdaptiveController (E0405) — adaptive control orchestrator (already in prism_adaptive_control)",
      "CAMPostInvokeOrchestrator (E0091) — post-emission orchestrator (LatheMasterPostRouter E0269 already wired)"
    );
    json.units.push({
      id: "U-PPGM61d",
      title: "Mount AGI gates on E0322 + E0385 (the existing master orchestrator pair)",
      scope: "Wire RAG warm-start, drift canary, ProtoMAML adapter as method calls on MasterPostProcessorUnifiedAGI (E0322) → routed through PPValidatorAGIWiring (E0385) → vendor orchestrator (E0163/E0185/E0201/E0305/E0350/E0384/E0436/E0101 by source CAM). Asserts no new master orchestrator created (would HARD BLOCK via duplicationGuardEngine).",
      files_to_modify: [
        "src/engines/MasterPostProcessorUnifiedAGIEngine.ts",
        "src/engines/PPValidatorAGIWiringEngine.ts",
        "src/engines/PostProcessorPipelineEngine.ts"
      ],
      tests_to_add: [
        "src/__tests__/AGIGatesOnExistingOrchestrator.integration.test.ts"
      ]
    });
    json.units.push({
      id: "U-PPGM61e",
      title: "Confidence aggregation through E0366 OrchestratorConfidenceFeedback",
      scope: "Aggregate per-gate confidence (RAG hit rate, drift canary σ-distance, ProtoMAML transfer source, tribal-rule match count) through OrchestratorConfidenceFeedbackEngine; surface composite confidence in wizard PhysicsDetailsPanel.",
      files_to_modify: [
        "src/engines/OrchestratorConfidenceFeedbackEngine.ts",
        "web/src/components/ppg/PhysicsDetailsPanel.tsx"
      ],
      tests_to_add: [
        "src/__tests__/OrchestratorConfidenceAggregation.test.ts"
      ]
    });
    json.total_units = json.units.length;
    json.completion_criteria.push(
      "AGI gates mount on E0322 + E0385 (no new master orchestrator built)",
      "8 vendor orchestrators routed by source CAM at gate time",
      "Composite confidence visible in wizard via E0366 aggregation"
    );
    markPatched(json);
    save(p, json);
    changes.push("PPG-MS9: +U-PPGM61d/e (mount on existing orchestrators), +13 leverage citations");
  }
}

// ----------------------------- MS14: lathe + WEDM safety predicates -----------------------------
{
  const { p, json } = load("PPG-MS14");
  if (!alreadyPatched(json)) {
    json.leverage_existing.push(
      "Lathe predicates: chuck_force + tailstock + steady_rest + part_off_force + lathe_collision_check + lathe_swing_check + lathe_grooving_overhang + lathe_chip_thickness + lathe_boring_reach + lathe_g71_type + lathe_boring_taper_comp + lathe_springback_comp + lathe_chatter_analysis + lathe_drill_thrust + lathe_parting_force + lathe_beam_deflection + lathe_chip_breaking + lathe_peck_schedule (turningDispatcher — 18 actions all unwired into MS14 gate)",
      "WEDM predicates: wedm_safety_gate_evaluate + wedm_unit_tag_evaluate + wedm_head_clearance_evaluate + wedm_flush_adequacy_evaluate + wedm_thermal_release_evaluate + wedm_dialect_verify + wedm_predict_wire_break + wedm_assess_surface_integrity + wedm_check_spec + wedm_thin_wire_derate_summary + wedm_kerf_overcut + wedm_wire_stress_analyze + wedm_wire_tension_optimize + wedm_wire_heating_safe_params (edmDispatcher — 14 actions all unwired into MS14 gate)",
      "BoringBarDeflectionEngine + LatheBeamDeflectionEngine — lathe deflection physics",
      "LatheChatterAnalysisEngine — lathe-specific chatter (different harmonic profile from mill)"
    );
    json.units.push({
      id: "U-PPGM89c",
      title: "Lathe safety predicate band (18 turningDispatcher actions wired into PreEmitSafetyPredicateEngine)",
      scope: "Extend PreEmitSafetyPredicateEngine to load lathe-mode predicate set when domain=lathe: chuck_force (clamp adequacy), tailstock (counter-support), steady_rest (long-overhang), part_off_force (parting tool stress), lathe_collision_check (turret + chuck + tailstock envelope), lathe_swing_check (max OD vs swing), lathe_grooving_overhang, lathe_chip_thickness, lathe_boring_reach, lathe_drill_thrust, lathe_parting_force, lathe_beam_deflection, lathe_chip_breaking, lathe_peck_schedule, lathe_chatter_analysis, lathe_g71_type (G71 vs G72 vs G73 selection sanity), lathe_boring_taper_comp, lathe_springback_comp. Tier-aware HARD BLOCK on shop_floor.",
      files_to_modify: [
        "src/engines/PreEmitSafetyPredicateEngine.ts"
      ],
      tests_to_add: [
        "src/__tests__/PreEmitSafetyLathe.integration.test.ts"
      ]
    });
    json.units.push({
      id: "U-PPGM89d",
      title: "WEDM safety predicate band (14 edmDispatcher actions wired into PreEmitSafetyPredicateEngine)",
      scope: "Extend PreEmitSafetyPredicateEngine to load WEDM-mode predicate set when domain=wedm: wedm_safety_gate_evaluate (composite), wedm_unit_tag_evaluate (program units sanity), wedm_head_clearance_evaluate (top-head + bottom-head clearance), wedm_flush_adequacy_evaluate (flush pressure vs material thickness), wedm_thermal_release_evaluate (thermal stress release), wedm_dialect_verify (controller dialect syntax), wedm_predict_wire_break (Weibull breakage prob per pass), wedm_assess_surface_integrity (recast/HAZ/white layer), wedm_thin_wire_derate_summary (sub-0.1mm derate), wedm_kerf_overcut (corner overcut), wedm_wire_stress_analyze (tension safe envelope), wedm_wire_tension_optimize, wedm_wire_heating_safe_params (Joule heating limit), wedm_check_spec (recast ≤ spec). Tier-aware HARD BLOCK on shop_floor.",
      files_to_modify: [
        "src/engines/PreEmitSafetyPredicateEngine.ts"
      ],
      tests_to_add: [
        "src/__tests__/PreEmitSafetyWEDM.integration.test.ts"
      ]
    });
    json.units.push({
      id: "U-PPGM89e",
      title: "Domain dispatch within PreEmitSafetyPredicateEngine (mill | lathe | wedm)",
      scope: "Replace the mill-only predicate list with a domain-aware dispatch: domain detected from sidecar.machineClass (mill | lathe | wedm | grinder | laser); each domain loads its predicate band; cross-domain (mill-turn, EDM-with-mill-finish) loads union with conflict detection (e.g. lathe_chuck_force vs mill_workholding_verify cannot both apply to same setup).",
      files_to_modify: [
        "src/engines/PreEmitSafetyPredicateEngine.ts"
      ],
      tests_to_add: [
        "src/__tests__/PreEmitSafetyDomainDispatch.test.ts"
      ]
    });
    json.total_units = json.units.length;
    json.completion_criteria.push(
      "Lathe safety predicate band (18 actions) HARD BLOCKs on shop_floor when any critical predicate fails on Okuma B250 reference corpus",
      "WEDM safety predicate band (14 actions) HARD BLOCKs on shop_floor when any critical predicate fails on MV1200R reference corpus",
      "Domain dispatch correctly selects mill / lathe / wedm bands; mill-turn correctly loads union"
    );
    markPatched(json);
    save(p, json);
    changes.push("PPG-MS14: +U-PPGM89c (lathe), +U-PPGM89d (WEDM), +U-PPGM89e (domain dispatch), +4 leverage citations");
  }
}

// ----------------------------- MS17: WEDM verifier path -----------------------------
{
  const { p, json } = load("PPG-MS17");
  if (!alreadyPatched(json)) {
    json.leverage_existing.push(
      "WEDMRunPipelineEngine + wedm_run_pipeline + wedm_studio_pipeline + wedm_advanced_analysis + wedm_generate_complete_program — WEDM-native verifier substrate",
      "WEDMSafetyGateEngine — emit-time gates that double as a verifier when run on existing programs",
      "wedm_verify_quality + wedm_assess_surface_integrity — quality verification actions",
      "Custom WEDM simulation: WEDMSparkErosionEngine + WEDMGapVoltageEngine + WEDMMRREngine — physics-accurate simulation (Vericut does NOT cover WEDM)"
    );
    json.units.push({
      id: "U-PPGM107b",
      title: "WEDM verifier path (no Vericut substitute — uses native WEDM physics simulation)",
      scope: "src/engines/WEDMVerifyAdapterEngine.ts — implements CamSimulatorAdapter interface but routes to WEDM-native physics simulation (WEDMRunPipelineEngine + wedm_safety_gate_evaluate + wedm_predict_wire_break + wedm_assess_surface_integrity + wedm_kerf_overcut + wedm_thermal_release_evaluate); produces same verdict structure as Fusion/Vericut adapters so EnsembleVerdictAggregator treats it transparently. Vericut/NCSIMUL do not support WEDM dialects (Mitsubishi M800 / Sodick / AgieCharmilles WEDM-specific) — PRISM owns this gap.",
      files_to_modify: [
        "src/engines/WEDMVerifyAdapterEngine.ts",
        "src/engines/EnsembleVerdictAggregatorEngine.ts"
      ],
      tests_to_add: [
        "src/__tests__/WEDMVerifyAdapter.integration.test.ts"
      ]
    });
    json.units.push({
      id: "U-PPGM107c",
      title: "Lathe verifier path (Fusion 360 lathe + Vericut + native lathe physics)",
      scope: "src/engines/LatheVerifyAdapterEngine.ts — Fusion 360 has lathe verify (different from mill verify); Vericut supports lathe controllers (Okuma OSP, Fanuc lathe); add native lathe physics fallback (LatheCollisionCheckEngine + LatheSwingCheckEngine + LatheChatterAnalysisEngine) for offline verification.",
      files_to_modify: [
        "src/engines/LatheVerifyAdapterEngine.ts",
        "src/engines/Fusion360VerifyAdapterEngine.ts",
        "src/engines/VericutAdapterEngine.ts"
      ],
      tests_to_add: [
        "src/__tests__/LatheVerifyAdapter.integration.test.ts"
      ]
    });
    json.total_units = json.units.length;
    json.completion_criteria.push(
      "WEDM verifier path uses native physics simulation; ensemble verdict passes Mitsubishi MV1200R 5-pass D2 reference",
      "Lathe verifier path uses Fusion 360 lathe verify + Vericut + native lathe physics; ensemble verdict passes Okuma B250 OD turning reference"
    );
    markPatched(json);
    save(p, json);
    changes.push("PPG-MS17: +U-PPGM107b (WEDM verifier), +U-PPGM107c (lathe verifier), +4 leverage citations");
  }
}

// ----------------------------- MS18-MS32: refactor markers (mount on existing orchestrators) -----------------------------
const REFACTOR_MAP = {
  "PPG-MS18": "Patent FTO — keep as-is (legal milestone, no orchestrator mount)",
  "PPG-MS19": "Security IEC 62443 — mount on existing security_manager + auth dispatcher (no new orchestrator)",
  "PPG-MS20": "Compliance Spine — mount on existing prism_compliance dispatcher (already has 17 actions: nda_manage, export_control, audit_trail, osha_300_log, cert_manage, legal_dashboard)",
  "PPG-MS21": "Test corpus — keep as-is (test infrastructure)",
  "PPG-MS22": "Operability — mount on existing prism_monitoring (Grafana/Prometheus already wired)",
  "PPG-MS23": "Architecture — collapse to single 'mount on E0322 MasterPostProcessorUnifiedAGI' unit (no new architecture layer)",
  "PPG-MS24": "Constants v2 — split into MS24a (data hardening), MS24b (wire existing physics), MS24c (UQ wiring through StochasticForcePipelineEngine + MonteCarloProcessEngine — already exist)",
  "PPG-MS25": "Machine Fingerprint — mount on existing MachineFingerprintEngine + machine_fingerprint dispatcher (already wired)",
  "PPG-MS26": "PRD/GA — keep as-is (product milestone)",
  "PPG-MS27": "Demo/ROI — mount on existing prism_business savings_dashboard + roi_advisor_analyze + tool_roi_analyze",
  "PPG-MS28": "CS — mount on existing prism_business customer_create + customer_pipeline (already wired)",
  "PPG-MS29": "Override — mount on existing wedm_override_quality_gate + wedm_get_gate_overrides pattern; extend to mill + lathe",
  "PPG-MS30": "UX — keep as-is (frontend milestone)",
  "PPG-MS31": "Pilot — keep as-is (deployment milestone)",
  "PPG-MS32": "FAI — mount on existing fai_run + fai_disposition + fai_evaluate_characteristic + fai_generate_forms (prism_quality dispatcher, already wired)"
};

for (const [id, note] of Object.entries(REFACTOR_MAP)) {
  const fp = path.join(MS_DIR, `${id}.json`);
  if (!fs.existsSync(fp)) continue;
  const j = JSON.parse(fs.readFileSync(fp, "utf8"));
  if (alreadyPatched(j)) continue;
  j.refactor_notes_2026_04_29 = {
    source: "Leverage agent L08 (orchestrator inventory) — 33 orchestrators exist, 27 uncited in PPG plan",
    direction: note,
    target_unit_count_after_refactor: id === "PPG-MS24" ? "split into 3 sub-milestones" : "5-7 thin wiring units (down from current)",
    consumers_of_existing_orchestrators: [
      "E0322 MasterPostProcessorUnifiedAGI (master AGI)",
      "E0385 PPValidatorAGIWiring (50+ validators)",
      "E0072 CAMAGIMasterOrchestrator (CAM-domain AGI)",
      "E0468 TribalEnrichmentCoordinator (3,700+ tips)",
      "E0366 OrchestratorConfidenceFeedback (confidence aggregation)"
    ]
  };
  markPatched(j);
  save(fp, j);
  changes.push(`${id}: refactor note added (${note.slice(0, 60)}...)`);
}

// ----------------------------- summary -----------------------------
console.log(JSON.stringify({ patched_at: NOW, tag: PATCH_TAG, changes }, null, 2));
