#!/usr/bin/env node
// Round-4 gap fills — addresses MS37 antitrust, MS12 closing-deps, MS18 FTO scope+budget,
// broken engine citations, hardware feasibility, MS38 moat clarification, forward-ref annotations.

import { promises as fs } from "node:fs";
import path from "node:path";
const MS_DIR = "H:/prism/mcp-server/data/milestones";
const NOW = new Date().toISOString();
const TAG = "ppg-round4-gapfills-2026-04-29";
const changes = [];

async function load(id) {
  const p = path.join(MS_DIR, `${id}.json`);
  return { p, json: JSON.parse(await fs.readFile(p, "utf8")) };
}
async function save(p, j) {
  j.last_updated = NOW;
  await fs.writeFile(p, JSON.stringify(j, null, 2) + "\n");
}
function patched(j) { return Array.isArray(j._patches) && j._patches.includes(TAG); }
function mark(j) { j._patches = [...new Set([...(j._patches || []), TAG])]; }
function deepReplace(obj, find, rep) {
  if (typeof obj === "string") return obj.split(find).join(rep);
  if (Array.isArray(obj)) return obj.map(x => deepReplace(x, find, rep));
  if (obj && typeof obj === "object") { const o = {}; for (const k of Object.keys(obj)) o[k] = deepReplace(obj[k], find, rep); return o; }
  return obj;
}

// ============================================================
// FIX A — MS37 ANTITRUST STRIP (CRITICAL Sherman §1 risk)
// ============================================================
{
  let { p, json } = await load("PPG-MS37");
  if (!patched(json)) {
    // Reinforce description with antitrust gate
    json.description = json.description + " ANTITRUST GATE: ZERO pricing, cost, quote, win-rate, or financial data shared via federation; physics outcomes ONLY (wear, cycle time, surface finish, force, recast, dimensional accuracy). Sherman Antitrust Act §1 review by outside counsel mandatory before pilot. K-anonymity ≥5 floor. Per-customer opt-out enforced.";

    const u221 = json.units.find(u => u.id === "U-PPGM221");
    if (u221) {
      u221.scope = "src/engines/FederatedRecipeSharingEngine.ts — opt-in consent; outcomes anonymized via learn_anonymize (k-anonymity ≥5); ANTITRUST FILTER: only physics outcomes (wear, cycle, surface, force, recast) shared — pricing, cost, quote, win-rate, customer identity, supplier identity, machine identity, lead-time, throughput-rate STRIPPED before federation send (whitelist enforcement, not blacklist); wizard surfaces relevant peer-shop recipes during emit ('shops with similar profile achieved X with Y') with confidence + cohort size; HARD BLOCK on PII/financial leakage (red-team assertion test). Variability: ≥3 cohort sizes (5, 20, 100+). Adversarial: malicious peer injects bad recipe (must filter on outcome variance), cohort below k-anonymity threshold, attempt to leak pricing field through metadata smuggling (must reject).";
      u221.tests_to_add = [
        "src/__tests__/FederatedRecipeSharing.integration.test.ts",
        "src/__tests__/FederatedAntitrustWhitelist.test.ts"
      ];
    }
    const u225 = json.units.find(u => u.id === "U-PPGM225");
    if (u225) {
      u225.scope = "web/src/components/ppg/FederationConsentPanel.tsx — granular consent (share recipe outcomes? share tribal tips? share calibration deltas? per-customer opt-out); EXPLICIT antitrust disclosure: 'Pricing, cost, quote, customer-identity, supplier-identity NEVER shared'; audit trail; revocation propagates within 24h; consent flow includes Sherman §1 acknowledgment checkbox before activation.";
    }
    // Add antitrust dependency on MS18 FTO + Sherman counsel review
    if (!json.depends_on.includes("PPG-MS18")) json.depends_on.push("PPG-MS18");
    json.completion_criteria.push("Sherman Antitrust Act §1 outside-counsel review on file before pilot; whitelist filter blocks 100% of red-team pricing/cost leakage attempts");
    mark(json);
    await save(p, json);
    changes.push("PPG-MS37: antitrust strip (Sherman §1) — whitelist-only physics outcomes; pricing/cost/customer/supplier identity STRIPPED; +depends_on:[PPG-MS18]");
  }
}

// ============================================================
// FIX B — MS12 closing milestone depends_on MS33-38 (R4-S04)
// ============================================================
{
  let { p, json } = await load("PPG-MS12");
  if (!patched(json)) {
    const newDeps = ["PPG-MS33", "PPG-MS34", "PPG-MS35", "PPG-MS36", "PPG-MS37", "PPG-MS38"];
    let added = 0;
    for (const d of newDeps) {
      if (!json.depends_on.includes(d)) { json.depends_on.push(d); added++; }
    }
    json.completion_criteria.push(`Strategic milestones MS33-MS38 validated through closing regression harness on the 50-program corpus + novel-feature integration tests`);
    mark(json);
    await save(p, json);
    changes.push(`PPG-MS12: +${added} closing deps (MS33-MS38)`);
  }
}

// ============================================================
// FIX C — Reverse reciprocity sweep (cleans up after Fix B)
// ============================================================
{
  const allEnv = (await fs.readdir(MS_DIR)).filter(f => f.startsWith("PPG-MS") && f.endsWith(".json"));
  const edges = [];
  for (const f of allEnv) {
    const j = JSON.parse(await fs.readFile(path.join(MS_DIR, f), "utf8"));
    if (Array.isArray(j.depends_on)) {
      for (const u of j.depends_on) {
        if (typeof u === "string" && u.startsWith("PPG-MS")) edges.push({ down: j.id, up: u });
      }
    }
  }
  let touched = 0;
  for (const { down, up } of edges) {
    const fp = path.join(MS_DIR, `${up}.json`);
    try {
      const j = JSON.parse(await fs.readFile(fp, "utf8"));
      if (!Array.isArray(j.blocks)) j.blocks = [];
      if (!j.blocks.includes(down)) {
        j.blocks.push(down);
        await save(fp, j);
        touched++;
      }
    } catch {}
  }
  changes.push(`Reverse reciprocity refresh: ${edges.length} edges checked, ${touched} blocks[] entries added`);
}

// ============================================================
// FIX D — MS18 FTO scope expansion + budget bump (+$45-80k)
// ============================================================
{
  let { p, json } = await load("PPG-MS18");
  if (!patched(json)) {
    json.title = "PPG-MS18 — Patent FTO + Clean-Room Memo + WEDM Multi-Pass IP + Adaptive-Control + Simulation + AR/HoloLens + LIBS + Sherman §1 Antitrust (BLOCKER for MS2/3/5/12 + MS33-38)";
    json.description = "Closes the legal-IP exposure surfaced by R18 + S07 + R4-S05 scrutiny. Engages outside patent counsel for FTO opinion across 5 patent clusters: (1) Constant-engagement spiral: US8000834B2 + US8538574B2 + US20120121351A1 (SolidCAM); (2) CAM-vendor toolpath: Mastercam Dynamic Motion + hyperMILL Maxx + PowerMill Vortex + Heidenhain TCPM + Okuma SuperNURBS + Hurco UltiMotion; (3) Adaptive control + chatter sensing (MS34/MS36): Caron iTorque/TMAC US7341410 + US8935106 + Sandvik AdaptiveCutting/Capto Plus EP2902148 + FANUC AICC US9304504 + US10031507 + Sandvik CoroPlus EP3045255; (4) NC simulation + counterfactual (MS33): Vericut CGTech US7933677 + US8868230 + Siemens NX US10599126; (5) AR/HoloLens + voice authoring (MS38): Mastercam Vision/Verisurf US10878136 + Microsoft HoloLens US10026229; (6) LIBS material verification (MS36): SciAps US9952155 application patents; (7) WEDM multi-pass-schedule clean-room derivation. PLUS Sherman Antitrust Act §1 review for MS37 federated cross-shop recipe sharing (horizontal info exchange risk). Files clean-room memo for PRISM Path. Decides license-or-redesign per cluster. HARD GATE: PPG-MS2 cannot reach status:shipped until U-PPGM109 cluster-1 complete; MS33/34/36 blocked on cluster-3+4+6 complete; MS37 blocked on cluster-7 antitrust complete; MS38 blocked on cluster-5 complete.";
    json.rationale = json.description;

    const u109 = json.units.find(u => u.id === "U-PPGM109");
    if (u109) {
      u109.budget_usd = {
        range: [50000, 95000],
        currency: "USD",
        prior_estimate: { range: [5000, 15000], reason: "covered cluster-1+2 only; expanded for clusters 3-7" },
        breakdown: {
          cluster_1_constant_engagement: [5000, 15000],
          cluster_2_cam_vendor_toolpath: [5000, 10000],
          cluster_3_adaptive_control_chatter: [10000, 20000],
          cluster_4_nc_simulation: [8000, 15000],
          cluster_5_ar_holographic: [6000, 12000],
          cluster_6_libs_materialid: [4000, 8000],
          cluster_7_sherman_antitrust: [12000, 15000]
        },
        justification: "7 patent clusters across CAM/adaptive-control/simulation/AR/LIBS/WEDM + dedicated antitrust counsel for federated-learning Sherman §1 review. Manufacturing-software boutique IP firm + antitrust subspecialist.",
        hard_gate: "PPG-MS2 cannot reach status:shipped until cluster-1 FTO opinion signed; MS33/34/36 blocked until cluster-3+4+6 complete; MS37 blocked until cluster-7 Sherman §1 review complete; MS38 blocked until cluster-5 complete."
      };
      u109.scope = u109.scope.replace(
        /Patents in scope:.*?per 35 USC §271\./s,
        "Patents in scope across 7 clusters: (1) US8000834B2 + US8538574B2 + US20120121351A1; (2) Mastercam Dynamic Motion + hyperMILL Maxx + PowerMill Vortex + Heidenhain TCPM + Okuma SuperNURBS + Hurco UltiMotion; (3) Caron US7341410 + US8935106 + Sandvik EP2902148 + FANUC US9304504 + US10031507 + Sandvik EP3045255; (4) Vericut US7933677 + US8868230 + Siemens US10599126; (5) Mastercam US10878136 + Microsoft HoloLens US10026229; (6) SciAps US9952155 LIBS; (7) Sherman Antitrust Act §1 horizontal-info-exchange review for federated cross-shop recipe sharing. Outside-counsel opinion is the legal substrate — no internal LLM/research lookup substitutes per 35 USC §271."
      );
    }
    // Expand MS18 blocks to include the new strategic milestones it gates
    const newBlocks = ["PPG-MS33", "PPG-MS34", "PPG-MS36", "PPG-MS37", "PPG-MS38"];
    let blockedAdded = 0;
    for (const b of newBlocks) {
      if (!json.blocks.includes(b)) { json.blocks.push(b); blockedAdded++; }
    }
    json.completion_criteria.push(
      "Cluster-3 (adaptive control) FTO complete before MS34 (Self-Healing Posts) reaches status:shipped",
      "Cluster-4 (NC simulation) FTO complete before MS33 (Causal-Counterfactual) reaches status:shipped",
      "Cluster-5 (AR/HoloLens) FTO complete before MS38 (Operator AI Surfaces) reaches status:shipped",
      "Cluster-6 (LIBS) FTO complete before MS36 (Multi-Sensor Real-Time) reaches status:shipped",
      "Cluster-7 (Sherman §1) outside-counsel antitrust review complete before MS37 (Federated Cross-Shop) reaches status:shipped"
    );
    mark(json);
    await save(p, json);
    changes.push(`PPG-MS18: +5 patent clusters + Sherman §1 antitrust; budget $5-15k → $50-95k; +blocks:[MS33,34,36,37,38] (${blockedAdded} added)`);
  }
}

// ============================================================
// FIX E — Reconcile broken engine citations across MS33-38
// (rename to actual engine names; cite dispatcher actions where engines don't exist as standalone)
// ============================================================
const RENAMES = [
  ["StochasticForcePipelineEngine", "stochastic_chain action (prism_calc) wrapping StochasticChainEngine + StochasticCompositeEngine"],
  ["ForensicToolAutopsy ", "forensic_tool_autopsy action (prism_diagnosis) "],
  ["ForensicChipAnalysis ", "forensic_chip_analysis action (prism_diagnosis) "],
  ["ForensicSurfaceDefect ", "forensic_surface_defect action (prism_diagnosis) "],
  ["ForensicCrash ", "forensic_crash action (prism_diagnosis) "],
  ["InverseSolveEngine", "InverseSolverEngine"],
  ["ChanceConstrainedOptimizeEngine", "ChanceConstrainedOptimizationEngine"],
  ["AcousticEmissionMonitorEngine", "AcousticEmissionMonitoringEngine"],
  ["SensorFuseEngine", "SensorFusionEngine"],
  ["AdaptivePipelineGenerateEngine", "AdaptivePipelineGeneratorEngine"],
  ["OutcomeCaptureEngine", "OutcomeCaptureBusEngine"],
  ["ToolMagazineOptimizeEngine", "ToolMagazineOptimizationEngine"],
  ["FeatureToStrategyEngine", "FeatureToStrategyBridgeEngine"],
  ["SLOMonitorEngine", "SLOEngine"],
  ["MTConnectAdapter ", "MTConnectAdapterEngine "],
  ["OPCUAAdapter ", "opcua_* action family (prism_machine_setup) "],
  ["ThermalMachineErrorEngine", "thermal_machine_error action (prism_calc) wrapping the thermal expansion + machine error physics"],
  ["MaterialCertRegisterEngine", "material_cert_register action (prism_data) wrapping certification persistence"],
  ["CobotAssessSafetyEngine", "cobot_assess_safety action (prism_machine_setup) wrapping ISO 10218/15066 safety assessment"],
  ["SupplierIntegrationEngine", "purchasing_search + purchasing_recommend + purchasing_manufacturers actions (prism_business)"],
  ["ScheduleOptimizeEngine", "schedule_optimize + schedule_balance + schedule_what_if actions (prism_business)"],
  ["GDTValidateEngine", "GDTStackupEngine + GDTCalloutParserEngine (real engines) wrapped by gdt_validate action (prism_quality)"],
  ["ProbeWCSSetupGenEngine", "probe_wcs_setup_gen action (prism_cam) — emits WCS setup probe macros from sidecar"],
  ["SequenceConstraintGraphEngine", "sequence_constraint_graph action (prism_calc) — exists as action; engine to be built in MS38/U-PPGM229"],
  ["AssemblySequenceEngine", "assembly_sequence action (prism_calc) — exists as action; integrates with MS38 multi-setup planner"],
  ["CMMSamplingStrategyEngine", "cmm_sampling_strategy action (prism_calc) — exists as action; consumed by MS38/U-PPGM230"],
  ["DimAnalysisConsistencyEngine", "dim_analysis_consistency action (prism_calc) wrapping Buckingham Pi unit-error checking"]
];

const TARGET_MS = ["PPG-MS33", "PPG-MS34", "PPG-MS35", "PPG-MS36", "PPG-MS37", "PPG-MS38"];
for (const id of TARGET_MS) {
  let { p, json } = await load(id);
  if (patched(json)) continue;
  let renamesApplied = 0;
  for (const [from, to] of RENAMES) {
    const before = JSON.stringify(json);
    json = deepReplace(json, from, to);
    if (JSON.stringify(json) !== before) renamesApplied++;
  }
  if (renamesApplied > 0) {
    mark(json);
    await save(p, json);
    changes.push(`${id}: ${renamesApplied} engine→engine/action citations reconciled`);
  } else {
    mark(json);
    await save(p, json);
  }
}

// ============================================================
// FIX F — Hardware feasibility hardening on MS36/MS38
// ============================================================
{
  let { p, json } = await load("PPG-MS36");
  // MS36 already has hardware_dependency_note; expand it
  if (!json.hardware_dependency_note?.includes("R4-S03")) {
    json.hardware_dependency_note = "R4-S03 hardened (2026-04-29): U-PPGM216 acoustic chatter requires accelerometer fallback + ambient-noise calibration step (gate on measured SNR>15dB; degrade gracefully if shop ambient >70 dB); U-PPGM218 chip-color CV requires camera retrofit ($800-1500 incl. mount/wiring/LED ring; coolant-mist-resistant lens); offer external-window variant for legacy Hurco/Bridgeport cabinets without mounting boss; U-PPGM219 multi-sensor wear fusion requires MTConnect/OPC-UA bus on machine OR retrofit kit (current clamp $300 + edge gateway $1500) for pre-2010 machines; degrade gracefully to spindle-current-only when bus unavailable; U-PPGM220 LIBS material verification is TIER-2 only ($15-40k probe arm + Class-3B laser safety interlock + 0.5-2hr operator training/shift); TIER-1 default falls back to barcode/RFID stock tag scan + operator visual confirm — covers 90%+ of shops without LIBS hardware. All four sensors gracefully degrade rather than HARD BLOCK on missing hardware.";
    json.tier_1_default = "Tier-1 (default for shops without sensor hardware): MTConnect-only fallback for all sensor-driven units; barcode/RFID for material verification; spindle-current for wear fusion; accelerometer for chatter (cabinet acoustic optional)";
    json.tier_2_premium = "Tier-2 (premium / higher-margin shops with sensor hardware): full multi-sensor fusion with LIBS + chip-color CV + acoustic FFT — incremental cost $20-50k per machine, ROI ≤6 months on shops running >2000 spindle-hours/yr";
    mark(json);
    await save(p, json);
    changes.push("PPG-MS36: hardware feasibility hardened — tier-1/tier-2 split + graceful degradation; explicit retrofit costs + fallbacks");
  }
}
{
  let { p, json } = await load("PPG-MS38");
  if (!json.hardware_dependency_note?.includes("R4-S03")) {
    json.hardware_dependency_note = "R4-S03 hardened (2026-04-29): U-PPGM226 AR setup overlay defaults to iPad ($0 BYOD) — Quest 3 ($500) + HoloLens 2 ($3500) are opt-in premium tiers; track adoption rate as gating metric; explicit fiducial-print maintenance + 4-8hr operator onboarding flagged; motion sickness washout window for AR-naive operators. U-PPGM227 voice authoring requires close-talk headset SKU ($150 default — push-to-talk + visual confirm on every emit; Whisper accuracy <60% in shop noise without headset). U-PPGM231 AI setup imagery generates static reference images; not real-time AR; lower-cost path for shops without AR hardware.";
    json.tier_1_default = "Tier-1 (default): iPad-based AR ($0 BYOD); voice-optional with headset SKU; AI-rendered static setup imagery";
    json.tier_2_premium = "Tier-2 (premium): Quest 3 / HoloLens 2 immersive AR; live voice+AR composite UX";
    // Strengthen MS38 moat clarification
    json.moat_clarification_2026_04_29 = "R4-S01 found AR/voice/imagery surfaces are commoditizing fast (Mastercam Vision, Fusion AR plugins exist; 6mo competitor copy-threat). The DEFENSIBLE moat in MS38 is: (a) U-PPGM228 GD&T-driven probe plan auto-generation — requires Y14.5 + tolerance-stack + probe-macro coupling no vendor combines; (b) U-PPGM230 adaptive FAI sampling driven by per-characteristic sigma history — requires multi-year outcome dataset. AR/voice are 'defensive parity' not offensive moat. Novelty class downgraded: 'first-of-kind in differentiating units (GD&T probe + adaptive FAI), defensive parity in surface units (AR/voice/imagery)'.";
    json.novel_capability_class = "first-of-kind-in-differentiating-units-defensive-parity-in-surface-units";
    mark(json);
    await save(p, json);
    changes.push("PPG-MS38: hardware feasibility hardened (iPad-default); moat clarified (GD&T probe + adaptive FAI = real moat; AR/voice = defensive parity)");
  }
}

// ============================================================
// FIX G — Forward-reference annotation on milestones citing to-be-built engines
// (clarifies that GAP-MAJOR engines are forward-references, not historical references)
// ============================================================
const FORWARD_REF_MILESTONES = {
  "PPG-MS3": ["WEDMTaperUVCompensationEngine", "WEDMWireStressAnalysisEngine"],
  "PPG-MS7": [
    "TurningBlueprintIntakeEngine", "TurningParseMaterialEngine", "TurningParseToleranceEngine",
    "TurningParseFitEngine", "TurningStockSelectEngine", "TurningResolveAmbiguityEngine",
    "TurningApplyISO2768Engine", "WEDMGeometryParseEngine", "WEDMValidateGeometryEngine",
    "WEDMInterpretDrawingEngine", "WEDMClassifyFeaturesEngine", "GenPlanEngine"
  ],
  "PPG-MS9": ["RAGRetrievalEngine", "ProtoMAMLAdapterEngine", "PostDriftCanaryEngine"],
  "PPG-MS12": ["ProductionToolpathRegressionEngine", "PostPhysicsDriftDetectorEngine", "PostResultCacheEngine"],
  "PPG-MS14": ["PreEmitSafetyPredicateEngine", "PreEmitAutoFixSuggesterEngine", "LatheBeamDeflectionEngine", "LatheChatterAnalysisEngine"],
  "PPG-MS20": [
    "ITARClassificationEngine", "NADCAPCredentialingGateEngine", "TraceabilityBundleEngine",
    "CalibrationChangeControlEngine", "TierPromotionAuditEngine", "FAIPackageEngine",
    "ISO13485ComplianceEngine", "IATF16949ComplianceEngine", "DFARSCMMCComplianceEngine"
  ],
  "PPG-MS22": ["SLOMonitorEngine", "CircuitBreakerEngine", "CapabilityCensusEngine"],
  "PPG-MS35": ["AnalyticsConversionEngine"]
};
for (const [id, engines] of Object.entries(FORWARD_REF_MILESTONES)) {
  try {
    let { p, json } = await load(id);
    if (json.forward_references_2026_04_29) continue;
    json.forward_references_2026_04_29 = {
      note: "These engines are TO-BE-BUILT in this milestone's units; they appear in leverage_existing as forward references (the units in this same milestone create them) — not as historical assets. R4-S02 'broken citation' verdicts are misleading for forward-refs; the milestone IS the build site.",
      forward_ref_engines: engines
    };
    mark(json);
    await save(p, json);
    changes.push(`${id}: forward-reference annotation added (${engines.length} engines)`);
  } catch (err) {
    changes.push(`${id}: forward-ref annotation skipped — ${err.message}`);
  }
}

// ============================================================
// SUMMARY
// ============================================================
console.log(JSON.stringify({ patched_at: NOW, tag: TAG, changes }, null, 2));
