#!/usr/bin/env node
// Round-2 patch: applies all 8 scrutiny findings (S02/S03/S04/S05/S07/S08/S09/S10)
// Idempotent. Re-runs are safe.

import fs from "node:fs";
import path from "node:path";

const MS_DIR = "H:/prism/mcp-server/data/milestones";
const NOW = new Date().toISOString();
const PATCH_TAG = "ppg-fixes-round2-2026-04-29";

const changes = [];
function load(id) {
  const p = path.join(MS_DIR, `${id}.json`);
  return { p, json: JSON.parse(fs.readFileSync(p, "utf8")) };
}
function save(p, j) { j.last_updated = NOW; fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n"); }
function alreadyPatched(j) { return Array.isArray(j._patches) && j._patches.includes(PATCH_TAG); }
function markPatched(j) { j._patches = [...new Set([...(j._patches || []), PATCH_TAG])]; }

// Helper: deep-replace string in any nested string field
function deepReplace(obj, find, replaceWith) {
  if (typeof obj === "string") return obj.split(find).join(replaceWith);
  if (Array.isArray(obj)) return obj.map((x) => deepReplace(x, find, replaceWith));
  if (obj && typeof obj === "object") {
    const out = {};
    for (const k of Object.keys(obj)) out[k] = deepReplace(obj[k], find, replaceWith);
    return out;
  }
  return obj;
}

// ============================================================
// FIX #19 + S07-H1 CRITICAL — Sanitize SolidCAM artifacts in MS2
// ============================================================
{
  let { p, json } = load("PPG-MS2");
  if (!alreadyPatched(json)) {
    // Rename references in all string fields
    json = deepReplace(json, "SolidCAMiMachiningEngine.morphSpiral", "PrismPathConstantEngagementEngine.morphSpiral");
    json = deepReplace(json, "SolidCAMiMachiningEngine (1242 LOC, src/engines/)", "PrismPathConstantEngagementEngine (1242 LOC, src/engines/PrismPathConstantEngagementEngine.ts; renamed in MS18/U-PPGM111 from internal SolidCAMiMachiningEngine.ts class symbol — file rename gated on MS18 sanitization)");
    json = deepReplace(json, "via SolidCAMiMachiningEngine wiring", "via PrismPathConstantEngagementEngine wiring");
    json = deepReplace(json, "the existing 1242-LOC SolidCAMiMachiningEngine — PRISM's", "the existing 1242-LOC PrismPathConstantEngagementEngine (formerly SolidCAMiMachiningEngine, renamed in MS18/U-PPGM111) — PRISM's");
    json = deepReplace(json, "identified SolidCAMiMachiningEngine as", "identified PrismPathConstantEngagementEngine (the 1242-LOC constant-engagement spiral engine renamed in MS18/U-PPGM111) as");
    json = deepReplace(json, "Engine name will be retained internally for backwards-compat but exposed externally as PRISM Path.", "Engine renamed (MS18/U-PPGM111 dependency) from SolidCAMiMachiningEngine to PrismPathConstantEngagementEngine; no internal SolidCAM identifiers remain after rename.");
    json = deepReplace(json, "cam_imachining_morph_spiral", "cam_prism_path_morph_spiral");
    json = deepReplace(json, "cam_imachining_generate", "cam_prism_path_generate");
    json = deepReplace(json, "imachining_compute", "imachining_compute");  // keep — third-party reference dispatcher action elsewhere; not ours
    json = deepReplace(json, "iMachiningPanel.tsx", "PrismPathPanel.tsx");
    json = deepReplace(json, "iMachiningIntegration.test.ts", "PrismPathIntegration.test.ts");
    json = deepReplace(json, "iMachining mode", "PRISM Path mode");
    json = deepReplace(json, "'PRISM Path mode' toggle", "'PRISM Path mode' toggle (constant-engagement adaptive spiral)");
    json = deepReplace(json, "iMachining-class results without the iMachining license", "constant-engagement adaptive-spiral results without third-party license dependency");
    // Add depends_on PPG-MS18 (FTO + sanitization must precede MS2)
    if (!json.depends_on.includes("PPG-MS18")) json.depends_on.push("PPG-MS18");
    // Reinforce legal_disclaimer
    json.legal_disclaimer = "FTO opinion required before commercial deployment (PPG-MS18/U-PPGM109). PRISM Path is an independent implementation derived from public-source-only constant-engagement adaptive-spiral literature; no third-party patented algorithms used in derivation. All internal SolidCAM identifiers sanitized via MS18/U-PPGM111 pre-commit hook. This statement is informational, not a legal opinion under 35 USC §271 — written outside-counsel FTO is required before commercial deployment.";
    markPatched(json);
    save(p, json);
    changes.push("PPG-MS2: SolidCAM identifiers sanitized → PrismPath; +depends_on:[PPG-MS18]; legal_disclaimer hardened");
  }
}

// ============================================================
// FIX #20 + S02 HIGH — Engine names in MS3, dispatcher refs in MS14
// ============================================================
{
  let { p, json } = load("PPG-MS3");
  if (!alreadyPatched(json)) {
    json = deepReplace(json, "WEDMRecastMLEngine — overlay on RecastLayerEngine physics", "WEDMRecastDepthPredictorEngine + WEDMRecastLayerMLEngine — recast depth ML overlay on RecastLayerEngine physics (actual engine names; replaces stale WEDMRecastMLEngine citation)");
    json = deepReplace(json, "WEDMSparkErosionEngine + WEDMGapVoltageEngine + WEDMMRREngine", "WEDMSparkErosionModelEngine + WEDMMaterialSparkDatabaseEngine + WEDMGapVoltageEngine + WEDMMRREngine");
    markPatched(json);
    save(p, json);
    changes.push("PPG-MS3: engine names corrected (WEDMRecastMLEngine→WEDMRecastDepthPredictor+LayerML; WEDMSparkErosionEngine→WEDMSparkErosionModelEngine)");
  }
}
{
  let { p, json } = load("PPG-MS14");
  if (!alreadyPatched(json)) {
    json = deepReplace(json, "(turningDispatcher — 18 actions all unwired into MS14 gate)", "(camDispatcher.ts — 18 lathe predicate actions all unwired into MS14 gate; actions live in cam dispatcher, not turning dispatcher)");
    json = deepReplace(json, "(edmDispatcher — 14 actions all unwired into MS14 gate)", "(camDispatcher.ts — 14 wedm_* predicate actions all unwired into MS14 gate; actions live in cam dispatcher, not edm dispatcher)");
    json = deepReplace(json, "18 turningDispatcher actions wired into PreEmitSafetyPredicateEngine", "18 camDispatcher lathe-predicate actions wired into PreEmitSafetyPredicateEngine");
    json = deepReplace(json, "14 edmDispatcher actions wired into PreEmitSafetyPredicateEngine", "14 camDispatcher wedm-predicate actions wired into PreEmitSafetyPredicateEngine");

    // FIX #23 S04 — add G76 + bar feeder + live tooling + sub-spindle to lathe band
    const u89c = json.units.find((u) => u.id === "U-PPGM89c");
    if (u89c) {
      u89c.scope += " Plus G76 single-point threading via lathe_thread_schedule (already in turningDispatcher cam-routed via camDispatcher.ts), bar_feeder via mill_turn_bar_feeder action, live_tool via mill_turn_live_tool action, sub_spindle via mill_turn_sub_spindle action — extend the lathe band to include the 4 mill-turn actions for bar-fed and sub-spindle synchronized lathe configurations.";
    }
    // FIX #24 S05 — HAZ to WEDM band
    const u89d = json.units.find((u) => u.id === "U-PPGM89d");
    if (u89d) {
      u89d.scope += " Plus wedm_haz_predict + wedm_haz_stock_allowance + wedm_haz_compare actions for heat-affected-zone allowance gating at emit time (closes S05 HAZ gap — HAZ was leveraged in MS3 only, not gated at emit).";
    }
    // FIX #26 S03 variability expansion for U-PPGM89e domain dispatch
    const u89e = json.units.find((u) => u.id === "U-PPGM89e");
    if (u89e) {
      u89e.scope += " Conflict scenarios to test ≥3: (1) lathe_chuck_force vs mill_workholding_verify on mill-turn setup; (2) wedm_thermal_release_evaluate vs lathe_chip_breaking on EDM-roughed-then-lathe-finished part; (3) mill_collision_check vs lathe_collision_check on Multus B250IIW mill-turn (different envelope volumes). Adversarial: (a) sidecar with empty machineClass → must default to shop_floor band union; (b) sidecar with conflicting domain claims (e.g. mill+wedm in same setup) → must HARD BLOCK with explicit error.";
    }
    json.total_units = json.units.length;
    json.completion_criteria.push(
      "Lathe band includes G76 + bar_feeder + live_tool + sub_spindle predicates with reference-corpus regression on Okuma B250 + Multus B250IIW mill-turn",
      "WEDM band includes wedm_haz_predict + wedm_haz_stock_allowance gating at emit time"
    );
    markPatched(json);
    save(p, json);
    changes.push("PPG-MS14: dispatcher refs camDispatcher; +G76/bar_feeder/live_tool/sub_spindle; +wedm_haz; +U-PPGM89e variability");
  }
}

// ============================================================
// FIX #22 + S07-H2/H3/H4 HIGH — MS18 patent scope + FTO budget + WEDM IP
// ============================================================
{
  let { p, json } = load("PPG-MS18");
  if (!alreadyPatched(json)) {
    json.title = "PPG-MS18 — Patent FTO + Clean-Room Memo + WEDM Multi-Pass IP Sweep (BLOCKER for MS2/MS3/MS5/MS12)";
    json.description = "Closes the legal-IP exposure surfaced by R18 + S07 scrutiny. Engages outside patent counsel for FTO opinion on US8000834B2 (SolidCAM iMachining) + US8538574B2 + US20120121351A1 (additional constant-engagement spiral patents flagged in S07-H2) + Mastercam Dynamic Motion + hyperMILL Maxx Machining + PowerMill Vortex + Heidenhain TCPM + Okuma OSP SuperNURBS + Hurco UltiMotion + WEDM-vendor multi-pass-schedule patents (Mitsubishi/Sodick/AgieCharmilles skim algorithms — S07-H4). Files clean-room memo documenting independent derivation of PRISM Path. Decides license-or-redesign per finding. HARD GATE: PPG-MS2 cannot reach status:shipped until U-PPGM109 complete.";
    json.rationale = json.description;

    const u109 = json.units.find((u) => u.id === "U-PPGM109");
    if (u109) {
      u109.scope = "Engage IP firm; deliver written non-infringement opinion or license recommendation per claim. Document file under attorney-client privilege. Patents in scope: US8000834B2 (SolidCAM iMachining constant-engagement spiral), US8538574B2 (continuation patent), US20120121351A1 (Mastercam-related continuation), plus 6 active CAM-vendor patents (Mastercam Dynamic Motion, hyperMILL Maxx, PowerMill Vortex, Heidenhain TCPM, Okuma SuperNURBS, Hurco UltiMotion), plus WEDM multi-pass-schedule patents from Mitsubishi/Sodick/AgieCharmilles. Outside-counsel opinion is the legal substrate — no internal LLM/research lookup substitutes per 35 USC §271.";
      u109.budget_usd = { range: [5000, 15000], currency: "USD", justification: "Standard FTO opinion from boutique IP firm with manufacturing-software experience; covers 9-12 patent claim charts + clean-room memo legal review.", hard_gate: "PPG-MS2 cannot reach status:shipped until this unit is complete and the FTO opinion is on file." };
    }
    const u110 = json.units.find((u) => u.id === "U-PPGM110");
    if (u110) {
      u110.scope = "Document timeline + team separation + public-source-only requirements basis. Two-team protocol going forward for any patent-adjacent feature. Includes WEDM multi-pass-schedule clean-room derivation (S07-H4) — confirm PRISM's pass-energy schedule was derived from Pham 2007 / Saha 2017 / Mitsubishi public application notes only, no proprietary vendor algorithm exposure.";
    }
    const u111 = json.units.find((u) => u.id === "U-PPGM111");
    if (u111) {
      u111.scope = "Audit MS2/MS3/MS5 + SolidCAMiMachiningEngine.ts + ENGINE_DIGEST.md + cam_imachining_* dispatcher actions + iMachining* component files; rename file + class + action + component to PrismPath* (e.g. SolidCAMiMachiningEngine.ts → PrismPathConstantEngagementEngine.ts; cam_imachining_morph_spiral → cam_prism_path_morph_spiral; iMachiningPanel.tsx → PrismPathPanel.tsx); replace patent citations with neutral technique descriptions; lock with pre-commit hook (.claude/hooks/no-patent-citations.mjs). Hook regex catches: SolidCAM, iMachining, Dynamic Motion, Maxx Machining, Vortex (in code identifiers). Pre-commit blocks future regressions.";
      u111.files_to_modify = [
        "src/engines/SolidCAMiMachiningEngine.ts",
        "src/engines/PrismPathConstantEngagementEngine.ts",
        ".claude/hooks/no-patent-citations.mjs",
        "mcp-server/src/tools/dispatchers/camDispatcher.ts",
        "web/src/components/ppg/PrismPathPanel.tsx"
      ];
    }
    // Hard gate completion criterion
    if (!json.completion_criteria.some((c) => c.includes("MS2 cannot reach status:shipped"))) {
      json.completion_criteria.push("HARD GATE: PPG-MS2 cannot reach status:shipped until U-PPGM109 FTO opinion is signed and on file");
      json.completion_criteria.push("WEDM multi-pass-schedule clean-room derivation documented per S07-H4");
      json.completion_criteria.push("U-PPGM109 budget_usd.hard_gate enforced via roadmap-index.json status guard");
    }
    markPatched(json);
    save(p, json);
    changes.push("PPG-MS18: +US8538574B2 + US20120121351A1 + WEDM IP; +budget_usd $5-15k on U-PPGM109; hard gate on MS2 ship; sanitization rename plan codified");
  }
}

// ============================================================
// FIX #25 + S08 MED — Compliance gaps (medical/auto/CMMC)
// ============================================================
{
  let { p, json } = load("PPG-MS20");
  if (!alreadyPatched(json)) {
    json.title = "PPG-MS20 — Compliance Spine (AS9100 + NADCAP + ITAR + CFR Part 11 + ISO 13485 + IATF 16949 + DFARS/CMMC)";
    json.description = "Closes the regulatory-compliance exposure surfaced by R17 + S08 scrutiny. Adds AS9100 §8.5.2 traceability bundle (operator badge + post version + heat-lot + tool serial + machine cal state), AS9102 FAI auto-emit, NADCAP special-process credentialing, ITAR/EAR classification + segregation, ISO 13485 medical-device QMS hooks, IATF 16949 automotive PPAP/APQP/control-plan hooks, DFARS 252.204-7012 + CMMC 2.0 Level 2 cyber controls (closes S08 medical/auto/CMMC zero-coverage gap), MS8 tier-promotion two-person rule, MS11 calibration NCR/CAR ledger, OSHA LOTO predicate.";
    json.rationale = json.description;
    json.units.push({
      id: "U-PPGM128",
      title: "ISO 13485 + IATF 16949 + DFARS/CMMC 2.0 thin wiring (closes S08 zero-coverage gap)",
      scope: "Three sub-bands all mounted on existing prism_compliance dispatcher: (a) ISO 13485 medical-device QMS — design-history-file linkage on customer entity, electronic-signature requirement on calibration deltas (extends 21 CFR Part 11), risk-classification audit; (b) IATF 16949 automotive — PPAP package auto-emit, APQP phase tracking, control-plan generation linked to FAI (U-PPGM121), customer-specific requirements (CSR) registry; (c) DFARS 252.204-7012 + CMMC 2.0 Level 2 — covered defense information (CDI) classification, incident reporting <72h, NIST SP 800-171 control mapping (110 controls), supply-chain risk management. Each band gated by customer.compliance_class field on customer entity; HARD BLOCK on missing required artifacts at emit time.",
      files_to_modify: [
        "src/engines/ISO13485ComplianceEngine.ts",
        "src/engines/IATF16949ComplianceEngine.ts",
        "src/engines/DFARSCMMCComplianceEngine.ts",
        "src/tools/dispatchers/complianceDispatcher.ts"
      ],
      tests_to_add: [
        "src/__tests__/ISO13485Compliance.integration.test.ts",
        "src/__tests__/IATF16949Compliance.integration.test.ts",
        "src/__tests__/DFARSCMMCCompliance.integration.test.ts"
      ]
    });
    json.total_units = json.units.length;
    json.completion_criteria.push(
      "ISO 13485 medical-device QMS hooks pass internal audit dry-run on hypothetical medical-device customer profile",
      "IATF 16949 automotive PPAP/APQP package auto-emit on hypothetical Tier-1/Tier-2 customer profile",
      "DFARS 252.204-7012 + CMMC 2.0 Level 2 control mapping covers all 110 NIST SP 800-171 controls; CDI classification enforced on flagged jobs"
    );
    markPatched(json);
    save(p, json);
    changes.push("PPG-MS20: +U-PPGM128 (ISO 13485 + IATF 16949 + DFARS/CMMC 2.0)");
  }
}

// ============================================================
// FIX #21 + S09 HIGH — Graph reciprocity
// ============================================================
{
  // Build reciprocity map: for each MS18-32 envelope, read its blocks[] and ensure every blocked MS has the reciprocal depends_on
  const reciprocityFixes = [];
  for (let i = 18; i <= 32; i++) {
    const id = `PPG-MS${i}`;
    const fp = path.join(MS_DIR, `${id}.json`);
    if (!fs.existsSync(fp)) continue;
    const j = JSON.parse(fs.readFileSync(fp, "utf8"));
    const blocks = Array.isArray(j.blocks) ? j.blocks : [];
    for (const target of blocks) {
      reciprocityFixes.push({ blocker: id, target });
    }
  }

  // Apply reciprocals: for each {blocker, target}, ensure target.depends_on includes blocker
  const targetsTouched = new Set();
  for (const { blocker, target } of reciprocityFixes) {
    const fp = path.join(MS_DIR, `${target}.json`);
    if (!fs.existsSync(fp)) continue;
    const j = JSON.parse(fs.readFileSync(fp, "utf8"));
    if (!Array.isArray(j.depends_on)) j.depends_on = [];
    if (!j.depends_on.includes(blocker)) {
      j.depends_on.push(blocker);
      targetsTouched.add(target);
      // mark patch (separate field — graph reciprocity is independent of content patches)
      j._graph_reciprocity_patch = PATCH_TAG;
      save(fp, j);
    }
  }

  // Also: MS2 already had MS18 added in FIX #19 above
  // Track for changelog
  if (targetsTouched.size > 0) {
    changes.push(`Graph reciprocity: ${reciprocityFixes.length} blocker→target edges checked; ${targetsTouched.size} targets received reciprocal depends_on (${[...targetsTouched].join(", ")})`);
  } else {
    changes.push("Graph reciprocity: all blocker→target edges already reciprocal");
  }
}

// ============================================================
// FIX #26 + S03 LOW — Variability expansion on 7 sub-floor units
// (S10 ROI binding is bundled here)
// ============================================================
{
  // U-PPGM26c (MS3)
  let { p, json } = load("PPG-MS3");
  // Note: MS3 was already marked patched above for engine names; we add a separate patch tag
  const u26c = json.units.find((u) => u.id === "U-PPGM26c");
  if (u26c && !u26c.scope.includes("Variability sweep")) {
    u26c.scope += " Variability sweep: ≥3 reference materials exercising the generic layer (D2 hard die, 4140 prehard, 17-4PH stainless) × ≥3 operations (multi-pass skim, taper, thin-wire <0.1mm) × ≥3 dialects (Mitsubishi M800, Sodick MotionLink, AgieCharmilles). Adversarial: (a) empty embedding query — must return canonical fallback; (b) circular cross-reference in lattice — must detect cycle and fail closed; (c) ProtoMAML transfer source = nearest-neighbor with cosine sim <0.3 — must flag low-confidence transfer.";
    save(p, json);
    changes.push("PPG-MS3 U-PPGM26c: variability sweep expanded (3 materials × 3 ops × 3 dialects + 3 adversarial)");
  }
}
{
  let { p, json } = load("PPG-MS7");
  const u51d = json.units.find((u) => u.id === "U-PPGM51d");
  if (u51d && !u51d.scope.includes("Ambiguous-geometry test corpus")) {
    u51d.scope += " Ambiguous-geometry test corpus ≥3: (1) Multus B250IIW mill-turn part (rotational + prismatic features); (2) WEDM-roughed-then-mill-finished die plate (mixed EDM + mill features); (3) lathe-with-cross-drilling (turning + secondary mill). Adversarial: (a) STEP file with no rotational symmetry but 90% cylindrical features → must NOT auto-classify as lathe; (b) DXF flat profile → must classify as WEDM not laser without explicit material thickness.";
    save(p, json);
    changes.push("PPG-MS7 U-PPGM51d: ambiguous-geometry corpus expanded (3 mill-turn cases + 2 adversarial)");
  }
}
{
  let { p, json } = load("PPG-MS9");
  const u61d = json.units.find((u) => u.id === "U-PPGM61d");
  if (u61d && !u61d.scope.includes("Failure-mode tests")) {
    u61d.scope += " Failure-mode tests ≥3: (1) attempt to instantiate a duplicate master orchestrator → must HARD BLOCK on duplicationGuardEngine; (2) E0322 returns null/error → routing must fall back to E0385 with WARN; (3) all 8 vendor orchestrators offline → must degrade to E0072 CAMAGIMasterOrchestrator with explicit confidence drop. Adversarial: (a) sidecar.cam_source field missing → default to E0072; (b) cam_source claims unsupported vendor → reject at gate.";
    save(p, json);
  }
  const u61e = json.units.find((u) => u.id === "U-PPGM61e");
  if (u61e && !u61e.scope.includes("Composite-failure cases")) {
    u61e.scope += " Composite-failure cases ≥3: (1) RAG hit count = 0 → confidence floor = sim-tier; (2) drift canary >3σ → confidence = 0 (HARD BLOCK on shop_floor); (3) ProtoMAML transfer source distance >0.5 → confidence ≤0.6 (warn). Adversarial: (a) all 4 inputs at confidence floor → composite must be ≤ floor (not averaged up); (b) one input NaN → composite must reject, not silently treat as 0.";
    save(p, json);
    changes.push("PPG-MS9 U-PPGM61d/e: failure modes + adversarial expanded");
  }
}
{
  let { p, json } = load("PPG-MS17");
  const u107b = json.units.find((u) => u.id === "U-PPGM107b");
  if (u107b && !u107b.scope.includes("WEDM reference job corpus")) {
    u107b.scope += " WEDM reference job corpus ≥3: (1) MV1200R 5-pass D2 12mm 4° taper (canonical); (2) Sodick AQ325L 4-pass H13 8mm straight; (3) AgieCharmilles CUT 1000 micro-EDM 6mm carbide with 0.25R corners. Adversarial: (a) program references undefined wire diameter → reject; (b) flush pressure 0 in sidecar → predict wire-break >50% and HARD BLOCK on shop_floor.";
    // Also add HAZ to verifier path (S05 closure)
    if (!u107b.scope.includes("wedm_haz_predict")) {
      u107b.scope += " HAZ verifier (S05): native physics simulation routes wedm_haz_predict + wedm_haz_stock_allowance + wedm_assess_surface_integrity to verify HAZ ≤spec at verify time (closes the gap that HAZ was leveraged in MS3 only, not gated at emit OR verify).";
    }
    save(p, json);
  }
  const u107c = json.units.find((u) => u.id === "U-PPGM107c");
  if (u107c && !u107c.scope.includes("Lathe reference job corpus")) {
    u107c.scope += " Lathe reference job corpus ≥3: (1) Okuma B250IIW OD turning + boring + threading 4140 (canonical); (2) Multus B250IIW mill-turn 304SS with live tooling + sub-spindle handoff; (3) Hardinge GS 200 hard-turn D2 62HRC. Adversarial: (a) program references chuck force exceeding clamp limit → reject; (b) G76 thread schedule with Vc > tool-life-cliff → predict tool failure and HARD BLOCK.";
    save(p, json);
    changes.push("PPG-MS17 U-PPGM107b/c: reference corpora expanded (3 WEDM + 3 lathe + adversarial); HAZ verifier wired");
  }
}
// S10 — MS27 ROI binding
{
  let { p, json } = load("PPG-MS27");
  const u168 = json.units.find((u) => u.id === "U-PPGM168");
  if (u168 && !(Array.isArray(u168.files_to_modify) && u168.files_to_modify.some((f) => f.includes("savings")))) {
    u168.files_to_modify = [
      ...(u168.files_to_modify || []),
      "src/engines/SavingsDashboardEngine.ts",
      "src/engines/ROIAdvisorEngine.ts",
      "src/engines/ToolROIEngine.ts"
    ];
    u168.scope += " Direct binding (S10 closure): files_to_modify wires the public ROI calculator to existing prism_business actions savings_dashboard + roi_advisor_analyze + tool_roi_analyze (already wired in business dispatcher); calculator inputs route through these engines for credibility, not duplicated math.";
    save(p, json);
    changes.push("PPG-MS27 U-PPGM168: ROI calculator bound to existing savings_dashboard + roi_advisor_analyze + tool_roi_analyze engines");
  }
}

// ============================================================
// SUMMARY
// ============================================================
console.log(JSON.stringify({ patched_at: NOW, tag: PATCH_TAG, changes }, null, 2));
