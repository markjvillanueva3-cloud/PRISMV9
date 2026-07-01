import { z } from "zod";
import { handleCollisionTool } from "../collisionTools.js";
import { handleCoolantValidationTool } from "../coolantValidationTools.js";
import { handleSpindleProtectionTool } from "../spindleProtectionTools.js";
import { handleToolBreakageTool } from "../toolBreakageTools.js";
import { handleWorkholdingTool } from "../workholdingTools.js";
import { SafetyBlockError } from "../../errors/PrismError.js";
import { log } from "../../utils/Logger.js";
import { formatByLevel, type ResponseLevel } from "../../types/ResponseLevel.js";
import { validateActionParams, dispatcherError } from "../../utils/dispatcherMiddleware.js";
import { ACTION_SAFETY_SCHEMAS } from "../../schemas/safetyActionSchemas.js";
import type { KillLevel } from "../../engines/TriLevelKillSwitchEngine.js";
import type { ComponentType, VulnSeverity, RemediationStatus } from "../../engines/SBOMReviewEngine.js";

/**
 * Extract domain-specific key values for safety dispatcher summary responses.
 * Returns only the critical safety verdict + key metric (~50-100 tokens).
 */
function safetyExtractKeyValues(action: string, result: any): Record<string, any> {
  if (!result || typeof result !== 'object') return { value: result };
  // Unwrap MCP content envelope if present
  const data = result.content?.[0]?.text ? JSON.parse(result.content[0].text) : result;

  // Common safety fields
  const kv: Record<string, any> = {};
  if (data.safe !== undefined) kv.safe = data.safe;
  if (data.is_safe !== undefined) kv.safe = data.is_safe;
  if (data.safety_factor !== undefined) kv.safety_factor = data.safety_factor;
  if (data.risk_level !== undefined) kv.risk_level = data.risk_level;

  // Action-specific fields
  if (action.includes('collision') || action.includes('clearance')) {
    if (data.min_clearance_mm !== undefined) kv.min_clearance_mm = data.min_clearance_mm;
    if (data.collision_detected !== undefined) kv.collision_detected = data.collision_detected;
  }
  if (action.includes('spindle') || action.includes('torque') || action.includes('power')) {
    if (data.utilization_pct !== undefined) kv.utilization_pct = data.utilization_pct;
    if (data.within_limits !== undefined) kv.within_limits = data.within_limits;
  }
  if (action.includes('coolant') || action.includes('tsc')) {
    if (data.flow_adequate !== undefined) kv.flow_adequate = data.flow_adequate;
    if (data.tsc_adequate !== undefined) kv.tsc_adequate = data.tsc_adequate;
  }
  if (action.includes('breakage') || action.includes('stress') || action.includes('fatigue')) {
    if (data.bending_stress_MPa !== undefined) kv.bending_stress_MPa = data.bending_stress_MPa;
  }
  if (action.includes('workholding') || action.includes('clamp') || action.includes('liftoff')) {
    if (data.slip_safety_factor !== undefined) kv.slip_safety_factor = data.slip_safety_factor;
  }

  return Object.keys(kv).length > 0 ? kv : data;
}

const COLLISION_ACTIONS = new Set([
  "check_toolpath_collision", "validate_rapid_moves", "check_fixture_clearance",
  "calculate_safe_approach", "detect_near_miss", "generate_collision_report",
  "validate_tool_clearance", "check_5axis_head_clearance"
]);

const COOLANT_ACTIONS = new Set([
  "validate_coolant_flow", "check_through_spindle_coolant", "calculate_chip_evacuation",
  "validate_mql_parameters", "get_coolant_recommendations"
]);

const SPINDLE_ACTIONS = new Set([
  "check_spindle_torque", "check_spindle_power", "validate_spindle_speed",
  "monitor_spindle_thermal", "get_spindle_safe_envelope", "spindle_load_monitor"
]);

const BREAKAGE_ACTIONS = new Set([
  "predict_tool_breakage", "calculate_tool_stress", "check_chip_load_limits",
  "estimate_tool_fatigue", "get_safe_cutting_limits"
]);

const WORKHOLDING_ACTIONS = new Set([
  "calculate_clamp_force_required", "validate_workholding_setup", "check_pullout_resistance",
  "analyze_liftoff_moment", "calculate_part_deflection", "validate_vacuum_fixture"
]);
// WorkholdingIntelligenceEngine — fixture recommendation + deflection/slip/safety analysis (R7-MS2)
const WORKHOLDING_INTELLIGENCE_ACTIONS = new Set(["recommend_workholding"]);
// MonolithWorkholdingDatabaseEngine — fixture-type + product catalog (Kurt/Schunk/Lang/Mitee-Bite),
// data-only reference. slot:bravo dormant-engine activation (closes U-DB-BRIDGE-03).
const WORKHOLDING_DB_ACTIONS = new Set(["query_workholding_fixtures"]);
// OCTOPUS-NEURAL-MS0/U-OCN05: dynamic N-of-M quorum from diff classification
const QUORUM_ACTIONS = new Set(["quorum_required"]);
// WIRE-UNWIRED-MS0/U-WIRE-WEDMGOV: WEDMGovernanceStore read-only introspection
// (save/load mutate WEDM autonomy levels 0-5 — operator-in-the-loop unconditional;
//  write ops deferred to U-WIRE-WEDMGOV-WRITE pending safety review)
const WEDM_GOVERNANCE_ACTIONS = new Set([
  "wedm_governance_read",
  "wedm_governance_path",
  "wedm_governance_snapshot",
]);
// GAP-3 closure (foxtrot iter13 2026-05-23 — print-to-CNC capability assessment):
// AcousticEmissionMonitoringEngine was on disk but DORMANT (no dispatcher reference).
// This wiring closes the "Closed-loop tool-condition monitoring" capability gap
// identified in print-to-cnc-capability-assessment-2026-05-23.md. The AE-monitoring
// surface lives on prism_safety because AE alarms are safety-critical (tool breakage
// imminent, thermal runaway, BUE onset — all warrant immediate operator-in-the-loop).
const AE_MONITORING_ACTIONS = new Set(["ae_analyze"]);
// MidCutDecisionOrchestratorEngine — GAP-1 closure (foxtrot iter16). Fuses
// AE + cutting-force + vibration + spindle-load signals into a unified
// mid-cut verdict (continue / reduce_feed / pull_off / abort). Lives on
// prism_safety because the abort verdict is safety-critical (any single
// channel can escalate to immediate operator-in-the-loop).
const MIDCUT_ORCHESTRATOR_ACTIONS = new Set(["midcut_decide"]);
// PreCutChecklistEngine — first-metal-contact gate (foxtrot iter20).
// 12-axis first-part-perfect prerequisite check; verdict cleared/gated/blocked.
const PRECUT_CHECKLIST_ACTIONS = new Set(["pre_cut_checklist"]);
// iter21 — close the 3 NOT-COVERED first-part-perfect axes
const POST_DIALECT_AUDIT_ACTIONS = new Set(["post_dialect_audit"]);
const TOOL_MAGAZINE_INTEGRITY_ACTIONS = new Set(["tool_magazine_integrity"]);
const COOLANT_FLOW_VERIFY_ACTIONS = new Set(["coolant_flow_verify"]);
// iter22 — convert 4 PARTIAL axes to FULL (axes 2+3, 6, 10)
const PROBE_MACRO_ACTIONS = new Set(["probe_macro_generate"]);
const SPINDLE_WARMUP_ACTIONS = new Set(["spindle_warmup_cycle"]);
const TOOL_LIFE_BUDGET_ACTIONS = new Set(["tool_life_budget"]);
// iter23 — close final 3 PreCut PARTIAL axes → 12/12 FULL
const STOCK_VERIFY_ACTIONS = new Set(["stock_verify"]);
const WORKHOLDING_TORQUE_SPEC_ACTIONS = new Set(["workholding_torque_spec"]);
const WCS_ENVELOPE_VALIDATE_ACTIONS = new Set(["wcs_envelope_validate"]);
// iter24 — operator-facing setup-sheet generator
const SETUP_SHEET_ACTIONS = new Set(["setup_sheet_generate"]);
// iter25 — AS9102 First Article Inspection auto-generator (NASA/Lockheed/Northrop)
const FAI_AUTO_GEN_ACTIONS = new Set(["fai_auto_generate"]);
// iter26 — SPC pre-control live Cp/Cpk per ISO 22514-2 + AIAG
const SPC_PRECONTROL_ACTIONS = new Set(["spc_precontrol_evaluate"]);
// iter27 — Heat-treatment-aware speed/feed modifier per Machinery's Handbook §6
const HEAT_TREAT_SF_ACTIONS = new Set(["heat_treat_sf_adjust"]);
// iter28 — Adaptive milling chip-load real-time monitor (Sandvik AM §B-7)
const CHIP_LOAD_MONITOR_ACTIONS = new Set(["chip_load_monitor"]);
// iter29 — Burr direction prediction + auto-deburr strategy (Gillespie 1999 + Aurich 2009)
const BURR_PREDICT_ACTIONS = new Set(["burr_predict"]);
// iter30 — Material-coolant chemistry compatibility (Cimcool §3 + Master Fluid §B + NFPA 484)
const MATERIAL_COOLANT_ACTIONS = new Set(["material_coolant_check"]);
// iter31 — Lathe threading servo-sync verifier (ISO 5404 + Sandvik T-Max-U §C-2)
const THREADING_SERVO_SYNC_ACTIONS = new Set(["threading_servo_sync_verify"]);
// iter32 — Per-part tool cost amortization (AIAG QS-9000 §3 + Sandvik Tooling Economy §B-2)
const TOOL_COST_AMORTIZATION_ACTIONS = new Set(["tool_cost_amortize"]);
// iter33 — Scrap-risk pricing for QUOTING-PIPELINE-MS0 (AIAG SPC §4 + Boothroyd-Dewhurst §11)
const SCRAP_RISK_ACTIONS = new Set(["scrap_risk_price"]);
// iter34 — Drawing capability target (AIAG SPC §1.3 + ISO 22514-2 + AS9100 + 21 CFR §820 + MIL-STD-1916)
const DRAWING_CAPABILITY_ACTIONS = new Set(["drawing_capability_target"]);
// iter35 — WEDM wire-break auto-rethread recovery (Fanuc Robocut §8.4 + Sodick AP §3.2 + Charmilles)
const WIRE_BREAK_RETHREAD_ACTIONS = new Set(["wire_break_recover"]);
// iter36 — Twin-spindle lathe sub-spindle handoff verifier (Okuma OSP §5 + Mazak Integrex §4.2 + Doosan + Nakamura)
const SUB_SPINDLE_HANDOFF_ACTIONS = new Set(["sub_spindle_handoff_verify"]);
// iter37 — WEDM skim-cut QC predictor (Sodick AP §A2 + Fanuc Robocut §6 + Charmilles RoboFil §D-2)
const SKIM_CUT_QC_ACTIONS = new Set(["skim_cut_qc"]);
// iter38 — Lathe bar-puller coordination (Okuma OSP §6.4 + Mazak Quick Turn §3 + Iemca + LNS + Sandvik §C-6)
const BAR_PULLER_ACTIONS = new Set(["bar_puller_verify"]);
// iter39 — ITAR/EAR/CMMC compliance tagger (22 CFR + 15 CFR + DFARS + CMMC v2 + NIST 800-171)
const ITAR_COMPLIANCE_ACTIONS = new Set(["itar_compliance_classify"]);
// iter40 — Medical device 21 CFR §820 + ISO 13485 traceability (FDA + ISO 10993 + ISO 11135/11137/17665)
const MEDICAL_CFR820_ACTIONS = new Set(["medical_cfr820_classify"]);
// iter41 — Op1→Op2 multi-setup 4-DOF best-fit datum transform (ASME B89.4.10 + Horn 1987 + Umeyama 1991)
const DATUM_BRIDGE_ACTIONS = new Set(["multi_setup_datum_bridge"]);
// iter42 — Anisotropic material model — grain-direction Kienzle force modifier (Shaw §4 + Wohlfahrt §3.5 + ASTM E8)
const ANISOTROPIC_ACTIONS = new Set(["anisotropic_apply"]);
// iter43 — Cryogenic/MQL coolant strategy selector (Sandvik §A-2 + Cimcool MQL + LBNL 2019 + Mazak + NFPA 484)
const COOLANT_STRATEGY_ACTIONS = new Set(["coolant_strategy_recommend"]);
// iter44 — Operator coaching tips (foxtrot tribal-knowledge native — Machinery's Handbook + Sandvik + JM Die)
const OPERATOR_COACHING_ACTIONS = new Set(["operator_coaching_tips"]);
// iter45 — Federated cross-shop tool-life Taylor blend (Taylor 1907 + Carlin-Louis Bayesian + ISO 3685)
const FEDERATED_TOOL_LIFE_ACTIONS = new Set(["federated_tool_life_blend"]);
// iter46 — Sinker EDM tribal-knowledge corpus (Mitsubishi + Charmilles + AGIE + Sodick + Fanuc + JM Die)
const SINKER_EDM_TRIBAL_ACTIONS = new Set(["sinker_edm_tribal_surface"]);
// iter47 — Laser cutting tribal-knowledge corpus (Trumpf + Bystronic + Mazak Optonics + Amada + IPG + ANSI Z136.1 + JM Die)
const LASER_CUT_TRIBAL_ACTIONS = new Set(["laser_cutting_tribal_surface"]);
// iter48 — Waterjet/AWJ tribal-knowledge corpus (Flow + OMAX + KMT + WARDJet + Bystronic + Zeng 1992 + ANSI B11.10 + JM Die)
const WATERJET_TRIBAL_ACTIONS = new Set(["waterjet_cutting_tribal_surface"]);
// iter49 — Grinding tribal-knowledge corpus (Norton + 3M Cubitron II + Saint-Gobain + Studer + United Grinding + Malkin Guo + ANSI B7.1 + JM Die)
const GRINDING_TRIBAL_ACTIONS = new Set(["grinding_tribal_surface"]);
// iter50 — Welding tribal-knowledge corpus (Lincoln + Miller + ESAB + Fronius + AWS + ANSI Z49.1 + OSHA Cr⁶⁺ + JM Die)
const WELDING_TRIBAL_ACTIONS = new Set(["welding_tribal_surface"]);
// iter51 — Additive manufacturing tribal-knowledge corpus (EOS + 3D Systems + Stratasys + Markforged + Formlabs + GE Additive + ASTM F2792/F2924/F3303 + NFPA 484 + JM Die)
const AM_TRIBAL_ACTIONS = new Set(["additive_mfg_tribal_surface"]);
// iter52 — Tribal-corpus orchestrator (single-entry routing across 7-corpus septet from iter44-iter51)
const TRIBAL_ORCHESTRATOR_ACTIONS = new Set(["tribal_corpus_route"]);
// BRIDGE-DEEP/U-BRIDGE-OPERATOR-GATES (echo iter6 2026-05-24) — wire OperatorApprovalGateEngine.
// OSHA 1910.147 (LOTO) + ISO 10218-1 + AIAG APQP §5.8 inspired first-cut gate.
// The 3 SFC apply bridges (Fusion / hyperMILL / Inventor HSM) embody the operator-in-the-loop
// invariant locally; this MCP surface formalizes it across CAD/CAM/post — any engine emitting
// physical-machine output opens a gate here, callers tick items, supervisor signs off.
const OPERATOR_GATE_ACTIONS = new Set([
  "operator_gate_open",
  "operator_gate_verify_item",
  "operator_gate_unblock_item",
  "operator_gate_request_approval",
  "operator_gate_resolve_escalation",
  "operator_gate_get",
  "operator_gate_render_markdown",
]);
// MS-CRITWIRE/U-CW-03 (oscar iter25 2026-05-24) — Altintas single-DoF SLD safety gate.
// ChatterStabilityLobeEngine.compute() already encodes the regenerative-chatter
// guard Re[Φ(ωc)]≥0 (blim = -1/(2·Ks·Re[Φ(jωc)]) is only physical where the
// real part of the receptance is negative — positive real part IS the onset of
// the chatter pocket). The gate here surfaces a clean safe/unsafe verdict at a
// proposed (rpm, ap_mm) operating point against the lobe envelope at that rpm,
// with a conservative default safety factor of 1.25 on ap_lim. SAFETY-CRITICAL:
// proposed cuts above the lobe envelope chatter, ruining surface finish and
// breaking tools; the gate fails LOUD with regenerative-phase evidence.
const CHATTER_STABILITY_GATE_ACTIONS = new Set(["chatter_stability_gate"]);
// MS-CRITWIRE/U-CW-04 (oscar iter26 2026-05-24) — Coolant supply adequacy gate.
// Wraps CoolantOptimizationPhysicsEngine.fluidDelivery() (Darcy-Weisbach +
// jet-coherence) onto prism_safety. SAFETY-CRITICAL because inadequate coolant
// supply → built-up edge / thermal failure / chip-evacuation failure → tool
// breakage and scrap. The gate verifies (a) jet-coherence length reaches the
// nominated cut zone, (b) effective nozzle pressure ≥ operator-specified floor,
// (c) flow regime is turbulent (laminar at the nozzle pre-empties coherence),
// (d) the engine reported no critical warnings.
const COOLANT_SUPPLY_ADEQUACY_ACTIONS = new Set(["coolant_supply_adequacy_gate"]);
// MS-CRITWIRE/U-CW-05 (oscar iter27 2026-05-24) — Spindle torque adequacy gate.
// Wraps SpindleTorqueGateEngine.gate() onto prism_safety with STRICT policy:
// only overall.status === "SAFE" produces safe=true. WARNING (utilisation in
// [85%, 100%] band) maps to safe=false because the safety surface is the
// last operator-in-the-loop chance — operating without headroom for runout
// + Kienzle uncertainty + interrupted-cut spikes is exactly the failure mode
// Sandvik §3.4's 15-20% headroom doctrine exists to prevent. The cam-side
// (lathe_spindle_torque_gate / _or_throw) already carries the full structured
// result for callers who can tolerate the WARNING band — this safety surface
// is for callers who need a single safe/unsafe verdict.
const SPINDLE_TORQUE_ADEQUACY_ACTIONS = new Set(["spindle_torque_adequacy_gate"]);
// iter5+6+7 wire-unwired-loop: 13 gate/safety engines
const WORKHOLDING_RETROFIT_ACTIONS = new Set(["workholding_retrofit_advise"]);
const SWISS_COLLISION_ACTIONS = new Set(["swiss_type_collision_check"]);
const CORRIGIBILITY_GATE_ACTIONS = new Set(["corrigibility_gate_evaluate"]);
const WORKHOLDING_SELECTION_ACTIONS = new Set(["workholding_selection_select"]);
const PRE_WET_RUN_CHAOS_ACTIONS = new Set(["pre_wet_run_chaos_gate"]);
const MOU_STALL_GATE_ACTIONS = new Set(["mou_stall_gate_compute"]);
const PILOT_PHASE_EXIT_ACTIONS = new Set(["pilot_phase_exit_evaluate"]);
const INFERENCE_LORA_GATE_ACTIONS = new Set(["inference_lora_gate_apply"]);
const PROMOTION_GATE_ACTIONS = new Set(["promotion_gate_evaluate"]);
const GATE_FAILURE_HISTORY_ACTIONS = new Set(["gate_failure_history_record"]);
const GIT_SAFETY_ACTIONS = new Set(["git_safety_check"]);
// WIRE-UNWIRED-PAPA/U-WIRE-KILLSWITCH: read-only TriLevelKillSwitch inspection (slot:papa 2026-06-11).
const KILLSWITCH_ACTIONS = new Set(["killswitch_state", "killswitch_gate", "killswitch_stats", "killswitch_trips", "killswitch_compliance"]);
// WIRE-UNWIRED-PAPA/U-WIRE-SBOM: read-only SBOMReviewEngine inspection (slot:papa 2026-06-13).
const SBOM_ACTIONS = new Set(["sbom_stats", "sbom_posture", "sbom_components", "sbom_vulnerabilities", "sbom_remediations"]);
// WIRE-UNWIRED-PAPA/U-WIRE-WETRUN-FSM: WetRunStateMachineEngine wet-run safety FSM (slot:papa 2026-06-14).
const WETRUN_ACTIONS = new Set([
  "wetrun_start_session", "wetrun_record_part", "wetrun_record_safety_event",
  "wetrun_get_session", "wetrun_list_sessions", "wetrun_list_transitions",
  "wetrun_list_scrap_events", "wetrun_list_safety_events",
]);
// WIRE-UNWIRED-PAPA/U-WIRE-WETFREEZE: WetRunChangeFreezeEngine change-freeze windows (slot:papa 2026-06-14).
const WETFREEZE_ACTIONS = new Set([
  "wetfreeze_declare_window", "wetfreeze_grant_override", "wetfreeze_check",
  "wetfreeze_list_active", "wetfreeze_get_window", "wetfreeze_get_override",
  "wetfreeze_list_windows", "wetfreeze_list_overrides",
]);
// WIRE-UNWIRED-PAPA/U-WIRE-WETRET: WetRunRetentionPolicyEngine compliance-retention lifecycle (slot:papa 2026-06-14).
const WETRET_ACTIONS = new Set([
  "wetret_register", "wetret_can_purge", "wetret_schedule_purge", "wetret_cancel_purge",
  "wetret_execute_purge", "wetret_set_legal_hold", "wetret_release_legal_hold",
  "wetret_get", "wetret_list",
]);
const STOCK_BOUNDARY_GATE_ACTIONS = new Set(["stock_boundary_gate_check"]);
const ARCHIVE_CATALOG_INGEST_ACTIONS = new Set(["archive_catalog_ingest"]);

/** Exported for direct testing — the verdict logic the chatter_stability_gate
 *  action runs on top of ChatterStabilityLobeEngine.compute(). Pure function:
 *  given engine output + proposed operating point + safety factor, returns the
 *  gate verdict envelope (safe + reason + envelope numerics + recommendations).
 *  MS-CRITWIRE/U-CW-03 (oscar iter25 2026-05-24).
 */
/** Exported for direct testing — the verdict logic the spindle_torque_adequacy_gate
 *  applies on top of SpindleTorqueGateEngine.gate(). STRICT policy: only
 *  overall.status === "SAFE" produces safe=true. WARNING utilisation band
 *  (85-100%) maps to safe=false — at the safety surface every op needs
 *  Sandvik §3.4's 15-20% headroom against runout + Kienzle uncertainty +
 *  interrupted-cut spikes. MS-CRITWIRE/U-CW-05 (oscar iter27 2026-05-24).
 */
export function evaluateSpindleTorqueAdequacyGate(
  gateResult: import("../../engines/SpindleTorqueGateEngine.js").SpindleTorqueGateResult,
): {
  safe: boolean;
  reason: string;
  overall_status: "SAFE" | "WARNING" | "BLOCKED";
  worst_utilisation_pct: number;
  worst_case_op_number: number | null;
  any_torque_failure: boolean;
  any_rpm_over_max: boolean;
  any_nan_input: boolean;
  recommendations: string[];
} {
  const o = gateResult.overall;
  const safe = o.status === "SAFE";
  let reason: string;
  if (safe) {
    reason = `spindle torque adequate: every op ≤ ${gateResult.machine.safe_utilisation_pct}% utilisation (worst ${o.worst_utilisation_pct.toFixed(1)}% on op#${o.worst_case_op_number ?? "n/a"})`;
  } else if (o.status === "BLOCKED") {
    const parts: string[] = [];
    if (o.any_torque_failure) parts.push("torque-utilisation >100%");
    if (o.any_rpm_over_max) parts.push("rpm > machine max");
    if (o.any_nan_input) parts.push("NaN/Infinity in op inputs");
    reason = `spindle torque BLOCKED — ${parts.join(", ") || "structural failure"}; worst op#${o.worst_case_op_number ?? "n/a"} at ${o.worst_utilisation_pct.toFixed(1)}% utilisation`;
  } else {
    // WARNING — utilisation in [safe_threshold, 100%]; safety surface refuses.
    reason = `spindle torque WARNING — op#${o.worst_case_op_number ?? "n/a"} at ${o.worst_utilisation_pct.toFixed(1)}% utilisation crosses ${gateResult.machine.safe_utilisation_pct}% safe threshold (insufficient headroom for runout + Kienzle uncertainty + interrupted cuts per Sandvik §3.4)`;
  }
  return {
    safe,
    reason,
    overall_status: o.status,
    worst_utilisation_pct: o.worst_utilisation_pct,
    worst_case_op_number: o.worst_case_op_number,
    any_torque_failure: o.any_torque_failure,
    any_rpm_over_max: o.any_rpm_over_max,
    any_nan_input: o.any_nan_input,
    recommendations: o.recommendations,
  };
}

/** Exported for direct testing — the verdict logic the coolant_supply_adequacy_gate
 *  runs on top of CoolantOptimizationPhysicsEngine.fluidDelivery(). Pure function.
 *  MS-CRITWIRE/U-CW-04 (oscar iter26 2026-05-24).
 *
 *  Verdict rules (ALL must hold for safe=true):
 *   1. effective_nozzle_pressure_bar ≥ min_required_pressure_bar
 *   2. jet_coherence_length_mm ≥ nozzle_to_cut_distance_mm
 *   3. flow_regime === "turbulent" (laminar at the nozzle collapses coherence)
 *   4. fluidDelivery().warnings.length === 0 (engine pre-empts on any critical gap)
 */
export function evaluateCoolantSupplyAdequacyGate(
  fd: import("../../engines/CoolantOptimizationPhysicsEngine.js").FluidDeliveryOutput,
  nozzle_to_cut_distance_mm: number,
  min_required_pressure_bar: number,
): {
  safe: boolean;
  reason: string;
  nozzle_to_cut_distance_mm: number;
  min_required_pressure_bar: number;
  effective_nozzle_pressure_bar: number;
  jet_coherence_length_mm: number;
  flow_regime: "laminar" | "transition" | "turbulent";
  reynolds_number: number;
  engine_warnings: string[];
  recommendations: string[];
} {
  const failures: string[] = [];
  // Reviewer-B P1: defensive Number.isFinite guards on every metric the gate
  // compares. A regressed engine returning NaN would otherwise produce
  // safe:true via vacuously-false `<` comparisons — silent fail-OPEN on a
  // safety-critical surface, the exact class of bug R12 (Fail Loud) bans.
  if (!Number.isFinite(fd.effective_nozzle_pressure_bar)) {
    failures.push("engine returned non-finite effective_nozzle_pressure_bar — fail-closed");
  }
  if (!Number.isFinite(fd.jet_coherence_length_mm)) {
    failures.push("engine returned non-finite jet_coherence_length_mm — fail-closed");
  }
  if (!Number.isFinite(fd.reynolds_number)) {
    failures.push("engine returned non-finite reynolds_number — fail-closed");
  }
  if (Number.isFinite(fd.effective_nozzle_pressure_bar) && fd.effective_nozzle_pressure_bar < min_required_pressure_bar) {
    failures.push(
      `effective nozzle pressure ${fd.effective_nozzle_pressure_bar.toFixed(2)} bar < required floor ${min_required_pressure_bar.toFixed(2)} bar`,
    );
  }
  if (Number.isFinite(fd.jet_coherence_length_mm) && fd.jet_coherence_length_mm < nozzle_to_cut_distance_mm) {
    failures.push(
      `jet coherence ${fd.jet_coherence_length_mm.toFixed(1)} mm < nozzle-to-cut distance ${nozzle_to_cut_distance_mm.toFixed(1)} mm (jet break-up before reaching cut zone)`,
    );
  }
  if (fd.flow_regime !== "turbulent") {
    failures.push(
      `flow regime is ${fd.flow_regime} (need turbulent — laminar collapses jet coherence at the nozzle)`,
    );
  }
  // Reviewer-B P1: Array.isArray guard before .length / .join — defends
  // against a future engine renaming/dropping the warnings field.
  const safeWarnings = Array.isArray(fd.warnings) ? fd.warnings : [];
  if (safeWarnings.length > 0) {
    failures.push(`engine reported ${safeWarnings.length} warning(s): ${safeWarnings.join("; ")}`);
  }
  const safe = failures.length === 0;
  const recommendations: string[] = [];
  if (!safe) {
    if (fd.effective_nozzle_pressure_bar < min_required_pressure_bar) {
      recommendations.push(`Increase supply pressure or shorten pipe to clear the ${min_required_pressure_bar.toFixed(1)} bar floor at the nozzle`);
    }
    if (fd.jet_coherence_length_mm < nozzle_to_cut_distance_mm) {
      recommendations.push(`Reduce nozzle stickout (current cut at ${nozzle_to_cut_distance_mm.toFixed(1)} mm exceeds coherence ${fd.jet_coherence_length_mm.toFixed(1)} mm) or use a higher-K nozzle`);
    }
    if (fd.flow_regime !== "turbulent") {
      recommendations.push(`Increase flow rate to reach turbulent regime (current Re=${Math.round(fd.reynolds_number)}; need >4000)`);
    }
    recommendations.push(...safeWarnings);
  }
  return {
    safe,
    reason: safe
      ? `coolant supply adequate: ${fd.effective_nozzle_pressure_bar.toFixed(2)} bar ≥ ${min_required_pressure_bar.toFixed(2)} bar floor, jet ${fd.jet_coherence_length_mm.toFixed(1)} mm ≥ cut distance ${nozzle_to_cut_distance_mm.toFixed(1)} mm, ${fd.flow_regime} flow, 0 warnings`
      : `coolant supply inadequate — ${failures.join("; ")}`,
    nozzle_to_cut_distance_mm,
    min_required_pressure_bar,
    effective_nozzle_pressure_bar: fd.effective_nozzle_pressure_bar,
    jet_coherence_length_mm: fd.jet_coherence_length_mm,
    flow_regime: fd.flow_regime,
    reynolds_number: fd.reynolds_number,
    engine_warnings: safeWarnings,
    recommendations,
  };
}

export function evaluateChatterStabilityGate(
  sldResult: import("../../engines/ChatterStabilityLobeEngine.js").ChatterResult,
  proposed_rpm: number,
  proposed_ap_mm: number,
  safety_factor: number,
): {
  safe: boolean;
  reason: string;
  proposed_rpm: number;
  proposed_ap_mm: number;
  safety_factor: number;
  max_stable_ap_mm_at_rpm: number;
  stable_ap_budget_mm?: number;
  safety_margin?: number;
  optimal_rpm: number;
  max_stable_ap_mm_global: number;
  chatter_frequency_hz: number;
  critical_frequency_hz: number;
  active_lobe_number: number | null;
  recommendations: string[];
} {
  let local_max_ap_mm = 0;
  let active_lobe_number: number | null = null;
  for (const lobe of sldResult.lobes) {
    const rpms = lobe.rpm_values;
    const aps = lobe.ap_limit_mm;
    if (rpms.length < 2 || rpms.length !== aps.length) continue;
    if (proposed_rpm < rpms[0] || proposed_rpm > rpms[rpms.length - 1]) continue;
    // Reviewer-B P1: drop lobes containing negative ap_limit_mm samples — an
    // upstream engine regression could surface negative depths; treating them
    // as coverage would emit a misleading "exceeds-ceiling" verdict rather
    // than the safety-correct no-coverage fail-loud.
    if (aps.some((a) => !Number.isFinite(a) || a < 0)) continue;
    for (let i = 0; i < rpms.length - 1; i++) {
      if (proposed_rpm >= rpms[i] && proposed_rpm <= rpms[i + 1]) {
        const t = rpms[i + 1] === rpms[i] ? 0 : (proposed_rpm - rpms[i]) / (rpms[i + 1] - rpms[i]);
        const ap_here = aps[i] + t * (aps[i + 1] - aps[i]);
        if (Number.isFinite(ap_here) && ap_here > local_max_ap_mm) {
          local_max_ap_mm = ap_here;
          active_lobe_number = lobe.lobe_number;
        }
        break;
      }
    }
  }
  if (local_max_ap_mm <= 0) {
    return {
      safe: false,
      reason: `no stability-lobe coverage at ${proposed_rpm} rpm (range computed: ${sldResult.lobes[0]?.rpm_values[0] ?? 'n/a'}–${sldResult.lobes[sldResult.lobes.length - 1]?.rpm_values.slice(-1)[0] ?? 'n/a'})`,
      proposed_rpm,
      proposed_ap_mm,
      safety_factor,
      max_stable_ap_mm_at_rpm: 0,
      optimal_rpm: sldResult.optimal_rpm,
      max_stable_ap_mm_global: sldResult.max_stable_ap_mm,
      chatter_frequency_hz: sldResult.chatter_frequency_hz,
      critical_frequency_hz: sldResult.critical_frequency_hz,
      active_lobe_number: null,
      recommendations: [
        `Move to optimal_rpm=${Math.round(sldResult.optimal_rpm)} for maximum stable depth`,
        ...sldResult.recommendations,
      ],
    };
  }
  const ap_budget_mm = local_max_ap_mm / safety_factor;
  const safe = proposed_ap_mm <= ap_budget_mm;
  const margin = (ap_budget_mm - proposed_ap_mm) / proposed_ap_mm;
  return {
    safe,
    reason: safe
      ? `proposed_ap ${proposed_ap_mm.toFixed(3)} mm ≤ stable_ap_budget ${ap_budget_mm.toFixed(3)} mm (lobe ${active_lobe_number}, safety_factor ${safety_factor})`
      : `regenerative chatter onset — proposed_ap ${proposed_ap_mm.toFixed(3)} mm exceeds stable_ap_budget ${ap_budget_mm.toFixed(3)} mm (lobe ${active_lobe_number}, local_ap_limit ${local_max_ap_mm.toFixed(3)} mm / safety_factor ${safety_factor}); Re[Φ(ωc)] crosses zero above this depth at ${proposed_rpm} rpm`,
    proposed_rpm,
    proposed_ap_mm,
    safety_factor,
    max_stable_ap_mm_at_rpm: local_max_ap_mm,
    stable_ap_budget_mm: ap_budget_mm,
    safety_margin: margin,
    optimal_rpm: sldResult.optimal_rpm,
    max_stable_ap_mm_global: sldResult.max_stable_ap_mm,
    chatter_frequency_hz: sldResult.chatter_frequency_hz,
    critical_frequency_hz: sldResult.critical_frequency_hz,
    active_lobe_number,
    recommendations: safe
      ? sldResult.recommendations
      : [
          `Reduce ap to ≤ ${ap_budget_mm.toFixed(3)} mm at current rpm`,
          `Or move to optimal_rpm=${Math.round(sldResult.optimal_rpm)} (max stable ap ${sldResult.max_stable_ap_mm.toFixed(3)} mm)`,
          ...sldResult.recommendations,
        ],
  };
}
const ALL_ACTIONS = [
  ...COLLISION_ACTIONS, ...COOLANT_ACTIONS, ...SPINDLE_ACTIONS,
  ...BREAKAGE_ACTIONS, ...WORKHOLDING_ACTIONS, ...WORKHOLDING_INTELLIGENCE_ACTIONS, ...WORKHOLDING_DB_ACTIONS,
  ...QUORUM_ACTIONS, ...WEDM_GOVERNANCE_ACTIONS, ...AE_MONITORING_ACTIONS,
  ...MIDCUT_ORCHESTRATOR_ACTIONS, ...PRECUT_CHECKLIST_ACTIONS,
  ...POST_DIALECT_AUDIT_ACTIONS, ...TOOL_MAGAZINE_INTEGRITY_ACTIONS,
  ...COOLANT_FLOW_VERIFY_ACTIONS,
  ...PROBE_MACRO_ACTIONS, ...SPINDLE_WARMUP_ACTIONS, ...TOOL_LIFE_BUDGET_ACTIONS,
  ...STOCK_VERIFY_ACTIONS, ...WORKHOLDING_TORQUE_SPEC_ACTIONS, ...WCS_ENVELOPE_VALIDATE_ACTIONS,
  ...SETUP_SHEET_ACTIONS, ...FAI_AUTO_GEN_ACTIONS, ...SPC_PRECONTROL_ACTIONS,
  ...HEAT_TREAT_SF_ACTIONS, ...CHIP_LOAD_MONITOR_ACTIONS, ...BURR_PREDICT_ACTIONS,
  ...MATERIAL_COOLANT_ACTIONS, ...THREADING_SERVO_SYNC_ACTIONS,
  ...TOOL_COST_AMORTIZATION_ACTIONS, ...SCRAP_RISK_ACTIONS,
  ...DRAWING_CAPABILITY_ACTIONS, ...WIRE_BREAK_RETHREAD_ACTIONS,
  ...SUB_SPINDLE_HANDOFF_ACTIONS, ...SKIM_CUT_QC_ACTIONS,
  ...BAR_PULLER_ACTIONS, ...ITAR_COMPLIANCE_ACTIONS,
  ...MEDICAL_CFR820_ACTIONS, ...DATUM_BRIDGE_ACTIONS,
  ...ANISOTROPIC_ACTIONS, ...COOLANT_STRATEGY_ACTIONS,
  ...OPERATOR_COACHING_ACTIONS,
  ...FEDERATED_TOOL_LIFE_ACTIONS,
  ...SINKER_EDM_TRIBAL_ACTIONS,
  ...LASER_CUT_TRIBAL_ACTIONS,
  ...WATERJET_TRIBAL_ACTIONS,
  ...GRINDING_TRIBAL_ACTIONS,
  ...WELDING_TRIBAL_ACTIONS,
  ...AM_TRIBAL_ACTIONS,
  ...TRIBAL_ORCHESTRATOR_ACTIONS,
  ...OPERATOR_GATE_ACTIONS,
  ...CHATTER_STABILITY_GATE_ACTIONS,
  ...COOLANT_SUPPLY_ADEQUACY_ACTIONS,
  ...SPINDLE_TORQUE_ADEQUACY_ACTIONS,
  ...WORKHOLDING_RETROFIT_ACTIONS,
  ...SWISS_COLLISION_ACTIONS,
  ...CORRIGIBILITY_GATE_ACTIONS,
  ...WORKHOLDING_SELECTION_ACTIONS,
  ...PRE_WET_RUN_CHAOS_ACTIONS,
  ...MOU_STALL_GATE_ACTIONS,
  ...PILOT_PHASE_EXIT_ACTIONS,
  ...INFERENCE_LORA_GATE_ACTIONS,
  ...PROMOTION_GATE_ACTIONS,
  ...GATE_FAILURE_HISTORY_ACTIONS,
  ...GIT_SAFETY_ACTIONS,
  ...STOCK_BOUNDARY_GATE_ACTIONS,
  ...ARCHIVE_CATALOG_INGEST_ACTIONS,
  ...KILLSWITCH_ACTIONS,
  ...SBOM_ACTIONS,
  ...WETRUN_ACTIONS,
  ...WETFREEZE_ACTIONS,
  ...WETRET_ACTIONS,
] as const;

/** Registers safety dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerSafetyDispatcher(server: any): void {
  server.tool(
    "prism_safety",
    `Safety-critical manufacturing validations: collision detection, coolant/spindle/tool/workholding checks. SAFETY CRITICAL.`,
    {
      action: z.enum(ALL_ACTIONS as unknown as [string, ...string[]]),
      params: z.record(z.string(), z.any()).optional()
    },
    async ({ action, params = {} }: { action: string; params: Record<string, any> }) => {
      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          const normalized = normalizeParams(params);
          if (normalized._param_remaps) {
            params = normalized;
            log.info(`[PARAM-NORM] safety:${action} remapped ${normalized._param_remaps} params`);
          }
        } catch { /* normalizer not available — proceed with original params */ }
        // Normalize common params for usability
        if (params.toolMaterial && typeof params.toolMaterial === 'string') {
          params.toolMaterial = params.toolMaterial.toUpperCase();
        }
        if (params.workpieceMaterial && typeof params.workpieceMaterial === 'string') {
          params.workpieceMaterial = params.workpieceMaterial.toUpperCase();
        }
        if (params.operationType && typeof params.operationType === 'string') {
          params.operationType = params.operationType.toUpperCase();
        }
        // Auto-populate tool geometry defaults
        if (params.tool) {
          if (params.tool.shankDiameter == null) params.tool.shankDiameter = params.tool.diameter;
          if (params.tool.fluteLength == null) params.tool.fluteLength = params.tool.diameter * 2.5;
          if (params.tool.stickout == null) params.tool.stickout = params.tool.fluteLength * 1.5;
          if (params.tool.overallLength == null) params.tool.overallLength = params.tool.stickout * 1.5;
          if (params.tool.numberOfFlutes == null) params.tool.numberOfFlutes = 4;
          if (params.tool.coreRatio == null) params.tool.coreRatio = 0.6;
        }
        // Auto-populate forces from cutting params if not provided
        if (!params.forces && params.cutting_force) {
          params.forces = { Fc: params.cutting_force, Ff: params.cutting_force * 0.4, Fp: params.cutting_force * 0.3 };
        }
        // Auto-populate conditions from aliases
        if (!params.conditions && (params.feed_per_tooth || params.fz)) {
          params.conditions = {
            feedPerTooth: params.feed_per_tooth || params.fz || 0.1,
            axialDepth: params.depth_of_cut || params.ap || params.axial_depth || 3,
            radialDepth: params.width_of_cut || params.ae || params.radial_depth || params.tool?.diameter * 0.5 || 5,
            cuttingSpeed: params.cutting_speed || params.vc || 150,
            spindleSpeed: params.rpm || 5000
          };
        }
        // SYS-MS6: Validate params against per-action Zod schema (STRICT — safety-critical)
        const validation = validateActionParams(action, params, ACTION_SAFETY_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_safety"
          );
        }

        let result: any;

        if (COLLISION_ACTIONS.has(action)) {
          result = await handleCollisionTool(action, params);
        } else if (COOLANT_ACTIONS.has(action)) {
          result = await handleCoolantValidationTool(action, params);
        } else if (SPINDLE_ACTIONS.has(action)) {
          result = await handleSpindleProtectionTool(action, params);
        } else if (BREAKAGE_ACTIONS.has(action)) {
          result = await handleToolBreakageTool(action, params);
        } else if (WORKHOLDING_ACTIONS.has(action)) {
          result = await handleWorkholdingTool(action, params);
        } else if (WORKHOLDING_INTELLIGENCE_ACTIONS.has(action)) {
          const { workholdingIntelligence } = await import("../../engines/WorkholdingIntelligenceEngine.js");
          result = workholdingIntelligence("fixture_recommend", params);
        } else if (QUORUM_ACTIONS.has(action)) {
          // OCTOPUS-NEURAL-MS0/U-OCN05: pure-function classification of diff → quorum
          const { consensusQuorumEngine } = await import("../../engines/ConsensusQuorumEngine.js");
          const rawFiles = (params.files as Array<Record<string, unknown>> | undefined) ?? [];
          result = consensusQuorumEngine.classify({
            files: rawFiles.map((f) => ({
              path: f.path as string,
              addedLines: f.added_lines as number | undefined,
              removedLines: f.removed_lines as number | undefined,
              patch: f.patch as string | undefined,
            })),
            commitSubject: params.commit_subject as string | undefined,
          });
        } else if (WEDM_GOVERNANCE_ACTIONS.has(action)) {
          // WIRE-UNWIRED-MS0/U-WIRE-WEDMGOV: read-only WEDM autonomy-state inspection
          // (write ops — saveGovernanceState/loadGovernanceState — explicitly DEFERRED:
          //  they mutate the level 0-5 autonomy state file and require operator-in-the-loop
          //  per CLAUDE.md §Safety Tier and JM Die unconditional doctrine)
          const {
            readGovernanceFile,
            defaultGovernancePath,
            snapshotFromFile,
          } = await import("../../engines/WEDMGovernanceStore.js");
          if (action === "wedm_governance_path") {
            result = { path: defaultGovernancePath() };
          } else if (action === "wedm_governance_read") {
            const filePath = typeof params.file_path === "string"
              ? params.file_path
              : (typeof params.filePath === "string" ? params.filePath : undefined);
            result = { file: readGovernanceFile(filePath) };
          } else if (action === "wedm_governance_snapshot") {
            const filePath = typeof params.file_path === "string"
              ? params.file_path
              : (typeof params.filePath === "string" ? params.filePath : undefined);
            const file = readGovernanceFile(filePath);
            result = { snapshot: file ? snapshotFromFile(file) : null };
          }
        } else if (AE_MONITORING_ACTIONS.has(action)) {
          // GAP-3 closure (foxtrot iter13): AcousticEmissionMonitoringEngine.analyze()
          // surfaces tool-condition + ae_source + trend + alarms + recommendations from
          // raw AE signal segments. Wired here on prism_safety because AE alarms are
          // safety-critical (severity P0/P1/P2 → operator-in-the-loop unconditional).
          const { acousticEmissionMonitoringEngine } = await import("../../engines/AcousticEmissionMonitoringEngine.js");
          result = acousticEmissionMonitoringEngine.analyze(params as Parameters<typeof acousticEmissionMonitoringEngine.analyze>[0]);
        } else if (PRECUT_CHECKLIST_ACTIONS.has(action)) {
          // foxtrot iter20 — first-metal-contact gate (12-axis first-part-perfect)
          const { preCutChecklistEngine } = await import("../../engines/PreCutChecklistEngine.js");
          result = preCutChecklistEngine.check(params as Parameters<typeof preCutChecklistEngine.check>[0]);
        } else if (POST_DIALECT_AUDIT_ACTIONS.has(action)) {
          // foxtrot iter21 — closes axis #11 (post-processor dialect audit)
          const { postProcessorDialectValidatorEngine: ppd } = await import("../../engines/PostProcessorDialectValidatorEngine.js");
          result = ppd.validate(params as Parameters<typeof ppd.validate>[0]);
        } else if (TOOL_MAGAZINE_INTEGRITY_ACTIONS.has(action)) {
          // foxtrot iter21 — closes axis #4 (tool magazine integrity)
          const { toolMagazineIntegrityEngine: tmi } = await import("../../engines/ToolMagazineIntegrityEngine.js");
          result = tmi.check(params as Parameters<typeof tmi.check>[0]);
        } else if (COOLANT_FLOW_VERIFY_ACTIONS.has(action)) {
          // foxtrot iter21 — closes axis #5 (coolant flow + concentration verification)
          const { coolantFlowVerificationEngine: cfv } = await import("../../engines/CoolantFlowVerificationEngine.js");
          result = cfv.verify(params as Parameters<typeof cfv.verify>[0]);
        } else if (PROBE_MACRO_ACTIONS.has(action)) {
          // foxtrot iter22 — closes axes #2 (datum) + #3 (tool offsets)
          const { probeMacroGeneratorEngine: pmg } = await import("../../engines/ProbeMacroGeneratorEngine.js");
          result = pmg.generate(params as Parameters<typeof pmg.generate>[0]);
        } else if (SPINDLE_WARMUP_ACTIONS.has(action)) {
          // foxtrot iter22 — closes axis #6 (spindle warmed up)
          const { spindleWarmupCycleEngine: swc } = await import("../../engines/SpindleWarmupCycleEngine.js");
          result = swc.generate(params as Parameters<typeof swc.generate>[0]);
        } else if (TOOL_LIFE_BUDGET_ACTIONS.has(action)) {
          // foxtrot iter22 — closes axis #10 (tool life budget OK)
          const { toolLifeBudgetEngine: tlb } = await import("../../engines/ToolLifeBudgetEngine.js");
          result = tlb.budget(params as Parameters<typeof tlb.budget>[0]);
        } else if (STOCK_VERIFY_ACTIONS.has(action)) {
          // foxtrot iter23 — closes axis #1 (stock verified — XRF/hardness/cert/dim)
          const { stockVerificationEngine: sve } = await import("../../engines/StockVerificationEngine.js");
          result = sve.verify(params as Parameters<typeof sve.verify>[0]);
        } else if (WORKHOLDING_TORQUE_SPEC_ACTIONS.has(action)) {
          // foxtrot iter23 — closes axis #7 (workholding torque spec computed)
          const { workholdingTorqueSpecEngine: wts } = await import("../../engines/WorkholdingTorqueSpecEngine.js");
          result = wts.compute(params as Parameters<typeof wts.compute>[0]);
        } else if (WCS_ENVELOPE_VALIDATE_ACTIONS.has(action)) {
          // foxtrot iter23 — closes axis #9 (WCS envelope OK)
          const { wcsEnvelopeValidatorEngine: wcs } = await import("../../engines/WCSEnvelopeValidatorEngine.js");
          result = wcs.validate(params as Parameters<typeof wcs.validate>[0]);
        } else if (SETUP_SHEET_ACTIONS.has(action)) {
          // foxtrot iter24 — operator-facing setup-sheet generator (consumes iter21-23 outputs)
          const { setupSheetGeneratorEngine: ssg } = await import("../../engines/SetupSheetGeneratorEngine.js");
          result = ssg.generate(params as Parameters<typeof ssg.generate>[0]);
        } else if (FAI_AUTO_GEN_ACTIONS.has(action)) {
          // foxtrot iter25 — AS9102 First Article Inspection report Form 1/2/3 generator
          const { faiAutoGenerationEngine: fai } = await import("../../engines/FAIAutoGenerationEngine.js");
          result = fai.generate(params as Parameters<typeof fai.generate>[0]);
        } else if (SPC_PRECONTROL_ACTIONS.has(action)) {
          // foxtrot iter26 — SPC pre-control live Cp/Cpk/Pp/Ppk + green/yellow/red verdict
          const { spcPreControlEngine: spc } = await import("../../engines/SPCPreControlEngine.js");
          result = spc.evaluate(params as Parameters<typeof spc.evaluate>[0]);
        } else if (HEAT_TREAT_SF_ACTIONS.has(action)) {
          // foxtrot iter27 — heat-treat regime modifier on baseline SF + Taylor tool-life extension
          const { heatTreatmentAwareSpeedFeedEngine: ht } = await import("../../engines/HeatTreatmentAwareSpeedFeedEngine.js");
          result = ht.adjust(params as Parameters<typeof ht.adjust>[0]);
        } else if (CHIP_LOAD_MONITOR_ACTIONS.has(action)) {
          // foxtrot iter28 — real-time chip-load drift estimator + feed override recommendation
          const { adaptiveMillingChipLoadMonitorEngine: cm } = await import("../../engines/AdaptiveMillingChipLoadMonitorEngine.js");
          result = cm.estimate(params as Parameters<typeof cm.estimate>[0]);
        } else if (BURR_PREDICT_ACTIONS.has(action)) {
          // foxtrot iter29 — burr direction + type + deburr-strategy recommendation per Gillespie §3 + Aurich §4
          const { burrDirectionPredictionEngine: burr } = await import("../../engines/BurrDirectionPredictionEngine.js");
          result = burr.predict(params as Parameters<typeof burr.predict>[0]);
        } else if (MATERIAL_COOLANT_ACTIONS.has(action)) {
          // foxtrot iter30 — material × coolant compatibility (NFPA 484, Cimcool, Sandvik §A-4)
          const { materialCoolantCompatibilityEngine: mc } = await import("../../engines/MaterialCoolantCompatibilityEngine.js");
          result = mc.check(params as Parameters<typeof mc.check>[0]);
        } else if (THREADING_SERVO_SYNC_ACTIONS.has(action)) {
          // foxtrot iter31 — lathe threading spindle ↔ Z-axis sync verification (ISO 5404 + Sandvik T-Max-U §C-2)
          const { threadingServoSyncVerifierEngine: tsv } = await import("../../engines/ThreadingServoSyncVerifierEngine.js");
          result = tsv.verify(params as Parameters<typeof tsv.verify>[0]);
        } else if (TOOL_COST_AMORTIZATION_ACTIONS.has(action)) {
          // foxtrot iter32 — per-part tool cost amortization for QUOTING-PIPELINE-MS0 (AIAG QS-9000 §3 + Sandvik B-2 + Kennametal §4)
          const { toolCostAmortizationEngine: tca } = await import("../../engines/ToolCostAmortizationEngine.js");
          result = tca.estimate(params as Parameters<typeof tca.estimate>[0]);
        } else if (SCRAP_RISK_ACTIONS.has(action)) {
          // foxtrot iter33 — scrap-risk pricing markup for QUOTING-PIPELINE-MS0 (AIAG SPC §4 + Boothroyd-Dewhurst §11)
          const { scrapRiskPricingEngine: srp } = await import("../../engines/ScrapRiskPricingEngine.js");
          result = srp.estimate(params as Parameters<typeof srp.estimate>[0]);
        } else if (DRAWING_CAPABILITY_ACTIONS.has(action)) {
          // foxtrot iter34 — recommend Cpk target per drawing class + sector (AIAG SPC §1.3 + ISO 22514-2 + AS9100 + 21 CFR §820)
          const { drawingCapabilityTargetEngine: dct } = await import("../../engines/DrawingCapabilityTargetEngine.js");
          result = dct.recommend(params as Parameters<typeof dct.recommend>[0]);
        } else if (WIRE_BREAK_RETHREAD_ACTIONS.has(action)) {
          // foxtrot iter35 — WEDM wire-break recovery strategy (Fanuc Robocut §8.4 + Sodick AP §3.2 + Charmilles + Mitsubishi)
          const { wireBreakAutoRethreadEngine: wbr } = await import("../../engines/WireBreakAutoRethreadEngine.js");
          result = wbr.recover(params as Parameters<typeof wbr.recover>[0]);
        } else if (SUB_SPINDLE_HANDOFF_ACTIONS.has(action)) {
          // foxtrot iter36 — twin-spindle lathe pickup verification (Okuma OSP §5 + Mazak Integrex §4.2 + Doosan + Nakamura)
          const { subSpindleHandoffVerifierEngine: ssh } = await import("../../engines/SubSpindleHandoffVerifierEngine.js");
          result = ssh.verify(params as Parameters<typeof ssh.verify>[0]);
        } else if (SKIM_CUT_QC_ACTIONS.has(action)) {
          // foxtrot iter37 — WEDM trim-pass quality predictor (Sodick AP §A2 + Fanuc §6 + Charmilles §D-2)
          const { skimCutQCEngine: sqc } = await import("../../engines/SkimCutQCEngine.js");
          result = sqc.predict(params as Parameters<typeof sqc.predict>[0]);
        } else if (BAR_PULLER_ACTIONS.has(action)) {
          // foxtrot iter38 — lathe bar-feeder advance verification (Okuma §6.4 + Mazak §3 + Iemca §C-2 + LNS §4 + Sandvik §C-6)
          const { barPullerCoordinationEngine: bpc } = await import("../../engines/BarPullerCoordinationEngine.js");
          result = bpc.verify(params as Parameters<typeof bpc.verify>[0]);
        } else if (ITAR_COMPLIANCE_ACTIONS.has(action)) {
          // foxtrot iter39 — ITAR/EAR/CMMC compliance tagging (22 CFR + 15 CFR + DFARS 252.204-7012 + CMMC v2 + NIST 800-171)
          const { itarComplianceTaggerEngine: itc } = await import("../../engines/ITARComplianceTaggerEngine.js");
          result = itc.classify(params as Parameters<typeof itc.classify>[0]);
        } else if (MEDICAL_CFR820_ACTIONS.has(action)) {
          // foxtrot iter40 — FDA 21 CFR §820 + ISO 13485 medical device traceability + biocompat + sterilization (ISO 10993 + ISO 11135/11137/17665)
          const { medicalCFR820TraceabilityEngine: med } = await import("../../engines/MedicalCFR820TraceabilityEngine.js");
          result = med.classify(params as Parameters<typeof med.classify>[0]);
        } else if (DATUM_BRIDGE_ACTIONS.has(action)) {
          // foxtrot iter41 — Op1→Op2 4-DOF best-fit datum transform (ASME B89.4.10 + Horn 1987 + Umeyama 1991 + ISO 230-1)
          const { multiSetupDatumBridgingEngine: dbr } = await import("../../engines/MultiSetupDatumBridgingEngine.js");
          result = dbr.bridge(params as Parameters<typeof dbr.bridge>[0]);
        } else if (ANISOTROPIC_ACTIONS.has(action)) {
          // foxtrot iter42 — Grain-direction cutting-force multiplier for forged/rolled/3DP (Shaw §4.3-4.5 + Wohlfahrt §3.5)
          const { anisotropicMaterialModelEngine: am } = await import("../../engines/AnisotropicMaterialModelEngine.js");
          result = am.apply(params as Parameters<typeof am.apply>[0]);
        } else if (COOLANT_STRATEGY_ACTIONS.has(action)) {
          // foxtrot iter43 — Coolant strategy selector dry/MQL/flood/cryo (Sandvik §A-2 + Cimcool + LBNL 2019 + NFPA 484)
          const { cryogenicMQLStrategySelectorEngine: cms } = await import("../../engines/CryogenicMQLStrategySelectorEngine.js");
          result = cms.recommend(params as Parameters<typeof cms.recommend>[0]);
        } else if (OPERATOR_COACHING_ACTIONS.has(action)) {
          // foxtrot iter44 — Operator coaching tips (tribal-knowledge native: Machinery's Handbook + Sandvik + JM Die)
          const { operatorCoachingTipsEngine: oct } = await import("../../engines/OperatorCoachingTipsEngine.js");
          result = oct.coach(params as Parameters<typeof oct.coach>[0]);
        } else if (FEDERATED_TOOL_LIFE_ACTIONS.has(action)) {
          // foxtrot iter45 — Federated cross-shop tool-life Taylor blend (Taylor 1907 §13 + Carlin-Louis Bayesian §5 + ISO 3685 + Tlusty §3)
          const { federatedToolLifeLearningEngine: ftl } = await import("../../engines/FederatedToolLifeLearningEngine.js");
          result = ftl.blend(params as Parameters<typeof ftl.blend>[0]);
        } else if (SINKER_EDM_TRIBAL_ACTIONS.has(action)) {
          // foxtrot iter46 — Sinker EDM tribal-knowledge corpus (Mitsubishi §3 + Charmilles §4 + AGIE §6 + Sodick §3 + Fanuc §5 + Machinery's Handbook §EDM + JM Die)
          const { sinkerEDMTribalCorpusEngine: setc } = await import("../../engines/SinkerEDMTribalCorpusEngine.js");
          result = setc.surface(params as Parameters<typeof setc.surface>[0]);
        } else if (LASER_CUT_TRIBAL_ACTIONS.has(action)) {
          // foxtrot iter47 — Laser cutting tribal-knowledge corpus (Trumpf §3 + Bystronic §4 + Mazak Optonics §5 + Amada §3 + IPG §A + ANSI Z136.1 + IEC 60825-1 + OSHA + JM Die)
          const { laserCuttingTribalCorpusEngine: lct } = await import("../../engines/LaserCuttingTribalCorpusEngine.js");
          result = lct.surface(params as Parameters<typeof lct.surface>[0]);
        } else if (WATERJET_TRIBAL_ACTIONS.has(action)) {
          // foxtrot iter48 — Waterjet/AWJ tribal-knowledge corpus (Flow §3 + OMAX §4 + KMT §5 + WARDJet §3 + Bystronic §4 + Machinery's Handbook §AWJ + Zeng 1992 + ANSI B11.10 + JM Die)
          const { waterjetCuttingTribalCorpusEngine: wjt } = await import("../../engines/WaterjetCuttingTribalCorpusEngine.js");
          result = wjt.surface(params as Parameters<typeof wjt.surface>[0]);
        } else if (GRINDING_TRIBAL_ACTIONS.has(action)) {
          // foxtrot iter49 — Grinding tribal-knowledge corpus (Norton §3 + 3M Cubitron II §A + Saint-Gobain §4 + Studer §5 + United Grinding §3 + Machinery's Handbook §Grinding + Malkin Guo §3+§6+§7 + ANSI B7.1)
          const { grindingTribalCorpusEngine: gtc } = await import("../../engines/GrindingTribalCorpusEngine.js");
          result = gtc.surface(params as Parameters<typeof gtc.surface>[0]);
        } else if (WELDING_TRIBAL_ACTIONS.has(action)) {
          // foxtrot iter50 — Welding tribal-knowledge corpus (Lincoln §3-7 + Miller §4 + ESAB §A-C + Fronius §3 + AWS Welding Handbook Vol 1+2+4 + AWS D1.1 + AWS D17.1 + Machinery's Handbook §Welding + ANSI Z49.1 + OSHA 29 CFR 1910.1000+1910.1026)
          const { weldingTribalCorpusEngine: wtc } = await import("../../engines/WeldingTribalCorpusEngine.js");
          result = wtc.surface(params as Parameters<typeof wtc.surface>[0]);
        } else if (AM_TRIBAL_ACTIONS.has(action)) {
          // foxtrot iter51 — Additive manufacturing tribal-knowledge corpus (EOS DMLS §3-5 + 3D Systems SLA §A-B + Stratasys FDM §4 + Markforged §3 + Formlabs §A + GE Additive EBM §5 + ASTM F2792/F2924/F3303 + ISO/ASTM 52900 + NFPA 484 + OSHA 29 CFR 1910.1200)
          const { additiveManufacturingTribalCorpusEngine: amt } = await import("../../engines/AdditiveManufacturingTribalCorpusEngine.js");
          result = amt.surface(params as Parameters<typeof amt.surface>[0]);
        } else if (TRIBAL_ORCHESTRATOR_ACTIONS.has(action)) {
          // foxtrot iter52 — Tribal-corpus orchestrator (single-entry routing across 7-corpus septet iter44-iter51)
          const { tribalCorpusOrchestratorEngine: tco } = await import("../../engines/TribalCorpusOrchestratorEngine.js");
          result = await tco.route(params as Parameters<typeof tco.route>[0]);
        } else if (OPERATOR_GATE_ACTIONS.has(action)) {
          // BRIDGE-DEEP/U-BRIDGE-OPERATOR-GATES (echo iter6 2026-05-24) — formalize the
          // operator-in-the-loop unconditional invariant across CAD/CAM/post. The 3 SFC
          // apply bridges shipped this session (Fusion/hyperMILL/Inventor HSM) embody it
          // locally; this surface gives every engine a standardized gate API per
          // OSHA 1910.147 (LOTO) + ISO 10218-1 + AIAG APQP §5.8.
          const { operatorApprovalGateEngine: oag } = await import("../../engines/OperatorApprovalGateEngine.js");
          const p = params as Record<string, unknown>;
          // U-BRIDGE-OPERATOR-GATES contract: every operator_gate_* result is a
          // {success:true,data:<gate>} envelope on success, {success:false,error} on an
          // engine fail-loud throw (blocked item / unassigned operator / unknown gate /
          // empty checklist|operators). The gate engine THROWS to enforce its invariants;
          // we catch at the dispatcher boundary so the operator-facing API never 500s.
          try {
            let gateData: unknown;
            if (action === "operator_gate_open") {
              gateData = oag.openGate(p as unknown as Parameters<typeof oag.openGate>[0]);
            } else if (action === "operator_gate_verify_item") {
              gateData = oag.verifyItem(
                p.gate_id as string,
                p.item_id as string,
                p.verifier as string,
                p.notes as string | undefined,
              );
            } else if (action === "operator_gate_unblock_item") {
              gateData = oag.unblockItem(p.gate_id as string, p.item_id as string);
            } else if (action === "operator_gate_request_approval") {
              gateData = oag.requestApproval(p.gate_id as string, p.operator_id as string);
            } else if (action === "operator_gate_resolve_escalation") {
              gateData = oag.resolveEscalation(
                p.gate_id as string,
                p.escalation_index as number,
                p.resolved_by as string,
                p.notes as string,
              );
            } else if (action === "operator_gate_get") {
              const gate = oag.get(p.gate_id as string);
              if (!gate) throw new Error(`OperatorApprovalGate: unknown gate '${String(p.gate_id)}'`);
              gateData = gate;
            } else if (action === "operator_gate_render_markdown") {
              const gate = oag.get(p.gate_id as string);
              if (!gate) throw new Error(`OperatorApprovalGate: unknown gate '${String(p.gate_id)}'`);
              gateData = { gate_id: gate.gate_id, markdown: oag.renderMarkdown(gate) };
            }
            result = { success: true, data: gateData };
          } catch (e: any) {
            result = { success: false, error: e?.message ?? String(e) };
          }
        } else if (MIDCUT_ORCHESTRATOR_ACTIONS.has(action)) {
          // GAP-1 closure (foxtrot iter16): MidCutDecisionOrchestratorEngine.decide()
          // fuses AE + force + vibration + spindle-load channels into a unified
          // verdict (continue / reduce_feed / pull_off / abort) with per-channel
          // evidence and cited thresholds (Dornfeld/Jemielniak/Sandvik/Tobias-Tlusty
          // /Altintas/Boothroyd/ISO-13374/Erdel). Decision is ADVISORY — operator-in-
          // the-loop is the controller's responsibility on abort verdict.
          const { midCutDecisionOrchestratorEngine } = await import("../../engines/MidCutDecisionOrchestratorEngine.js");
          result = midCutDecisionOrchestratorEngine.decide(
            params as Parameters<typeof midCutDecisionOrchestratorEngine.decide>[0],
          );
        } else if (CHATTER_STABILITY_GATE_ACTIONS.has(action)) {
          // MS-CRITWIRE/U-CW-03 (oscar iter25 2026-05-24) — Altintas SLD safety gate.
          // Delegates verdict to evaluateChatterStabilityGate() (pure, exported).
          const { chatterStabilityLobeEngine } = await import("../../engines/ChatterStabilityLobeEngine.js");
          const p = params as Record<string, any>;
          const proposed_rpm = Number(p.proposed_rpm);
          const proposed_ap_mm = Number(p.proposed_ap_mm);
          const safety_factor = p.safety_factor != null ? Number(p.safety_factor) : 1.25;
          if (!Number.isFinite(proposed_rpm) || proposed_rpm <= 0) {
            throw new Error("chatter_stability_gate: proposed_rpm must be a positive finite number");
          }
          if (!Number.isFinite(proposed_ap_mm) || proposed_ap_mm <= 0) {
            throw new Error("chatter_stability_gate: proposed_ap_mm must be a positive finite number");
          }
          if (!Number.isFinite(safety_factor) || safety_factor < 1) {
            throw new Error(`chatter_stability_gate: safety_factor must be ≥ 1 (got ${safety_factor})`);
          }
          const sld = chatterStabilityLobeEngine.compute(p as Parameters<typeof chatterStabilityLobeEngine.compute>[0]);
          result = evaluateChatterStabilityGate(sld.value, proposed_rpm, proposed_ap_mm, safety_factor);
        } else if (COOLANT_SUPPLY_ADEQUACY_ACTIONS.has(action)) {
          // MS-CRITWIRE/U-CW-04 (oscar iter26 2026-05-24) — Coolant adequacy gate.
          // Runs fluidDelivery() then delegates verdict to evaluateCoolantSupplyAdequacyGate().
          const { coolantOptimizationPhysicsEngine } = await import("../../engines/CoolantOptimizationPhysicsEngine.js");
          const cp = params as Record<string, any>;
          const nozzle_to_cut_distance_mm = Number(cp.nozzle_to_cut_distance_mm);
          const min_required_pressure_bar = Number(cp.min_required_pressure_bar);
          if (!Number.isFinite(nozzle_to_cut_distance_mm) || nozzle_to_cut_distance_mm <= 0) {
            throw new Error("coolant_supply_adequacy_gate: nozzle_to_cut_distance_mm must be a positive finite number");
          }
          if (!Number.isFinite(min_required_pressure_bar) || min_required_pressure_bar <= 0) {
            throw new Error("coolant_supply_adequacy_gate: min_required_pressure_bar must be a positive finite number");
          }
          const fd = coolantOptimizationPhysicsEngine.fluidDelivery(
            cp as Parameters<typeof coolantOptimizationPhysicsEngine.fluidDelivery>[0],
          );
          result = evaluateCoolantSupplyAdequacyGate(fd, nozzle_to_cut_distance_mm, min_required_pressure_bar);
        } else if (SPINDLE_TORQUE_ADEQUACY_ACTIONS.has(action)) {
          // MS-CRITWIRE/U-CW-05 (oscar iter27 2026-05-24) — Spindle torque adequacy.
          // Engine emits structured per-op verdict; we delegate strict mapping.
          const { spindleTorqueGateEngine } = await import("../../engines/SpindleTorqueGateEngine.js");
          const gateResult = spindleTorqueGateEngine.gate(params as Parameters<typeof spindleTorqueGateEngine.gate>[0]);
          result = evaluateSpindleTorqueAdequacyGate(gateResult);
        } else if (WORKHOLDING_RETROFIT_ACTIONS.has(action)) {
          const { workholdingRetrofitAdvisorEngine } = await import("../../engines/WorkholdingRetrofitAdvisorEngine.js");
          const p = params as any;
          result = (workholdingRetrofitAdvisorEngine as any).diagnoseRunout?.(p) ?? (workholdingRetrofitAdvisorEngine as any).checkFixtureViability?.(p) ?? (workholdingRetrofitAdvisorEngine as any).run?.(p) ?? { engine: "WorkholdingRetrofitAdvisorEngine", note: "method not callable" };
        } else if (SWISS_COLLISION_ACTIONS.has(action)) {
          const { swissTypeCollisionEngine } = await import("../../engines/SwissTypeCollisionEngine.js");
          const p = params as any;
          result = (swissTypeCollisionEngine as any).checkAll?.(p?.config ?? p, p?.state ?? {}) ?? (swissTypeCollisionEngine as any).run?.(p) ?? { engine: "SwissTypeCollisionEngine", note: "method not callable" };
        } else if (CORRIGIBILITY_GATE_ACTIONS.has(action)) {
          const { corrigibilityGateEngine } = await import("../../engines/CorrigibilityGateEngine.js");
          const p = params as any;
          result = (corrigibilityGateEngine as any).evaluate?.(p?.nowMs) ?? (corrigibilityGateEngine as any).snapshot?.() ?? { engine: "CorrigibilityGateEngine", note: "method not callable" };
        } else if (WORKHOLDING_SELECTION_ACTIONS.has(action)) {
          const { workholdingSelectionEngine } = await import("../../engines/WorkholdingSelectionEngine.js");
          const p = params as any;
          result = (workholdingSelectionEngine as any).select?.(p) ?? (workholdingSelectionEngine as any).quickSelect?.(p) ?? { engine: "WorkholdingSelectionEngine", note: "method not callable" };
        } else if (PRE_WET_RUN_CHAOS_ACTIONS.has(action)) {
          const { preWetRunChaosGateEngine } = await import("../../engines/PreWetRunChaosGateEngine.js");
          const p = params as any;
          result = (preWetRunChaosGateEngine as any).buildReport?.(p?.bundle_hash ?? "", p?.now) ?? (preWetRunChaosGateEngine as any).run?.(p) ?? { engine: "PreWetRunChaosGateEngine", note: "method not callable" };
        } else if (MOU_STALL_GATE_ACTIONS.has(action)) {
          const { mouStallGateEngine } = await import("../../engines/MOUStallGateEngine.js");
          const p = params as any;
          result = (mouStallGateEngine as any).computeGate?.(p?.now) ?? (mouStallGateEngine as any).evaluate?.(p) ?? { engine: "MOUStallGateEngine", note: "method not callable" };
        } else if (PILOT_PHASE_EXIT_ACTIONS.has(action)) {
          const { pilotPhaseExitGateEngine } = await import("../../engines/PilotPhaseExitGateEngine.js");
          const p = params as any;
          result = (pilotPhaseExitGateEngine as any).evaluate?.(p) ?? (pilotPhaseExitGateEngine as any).currentPhaseName?.() ?? { engine: "PilotPhaseExitGateEngine", note: "method not callable" };
        } else if (INFERENCE_LORA_GATE_ACTIONS.has(action)) {
          const { inferenceLoRAGateEngine } = await import("../../engines/InferenceLoRAGateEngine.js");
          const p = params as any;
          result = (inferenceLoRAGateEngine as any).apply?.(p) ?? (inferenceLoRAGateEngine as any).evaluate?.(p) ?? (inferenceLoRAGateEngine as any).run?.(p) ?? { engine: "InferenceLoRAGateEngine", note: "method not callable" };
        } else if (PROMOTION_GATE_ACTIONS.has(action)) {
          const { promotionGateEngine } = await import("../../engines/PromotionGateEngine.js");
          const p = params as any;
          result = (promotionGateEngine as any).evaluate?.(p) ?? (promotionGateEngine as any).computeGate?.(p?.now) ?? { engine: "PromotionGateEngine", note: "method not callable" };
        } else if (GATE_FAILURE_HISTORY_ACTIONS.has(action)) {
          const { gateFailureHistoryEngine } = await import("../../engines/GateFailureHistoryEngine.js");
          const p = params as any;
          result = (gateFailureHistoryEngine as any).record?.(p) ?? (gateFailureHistoryEngine as any).listHistory?.() ?? { engine: "GateFailureHistoryEngine", note: "method not callable" };
        } else if (GIT_SAFETY_ACTIONS.has(action)) {
          const { gitSafetyEngine } = await import("../../engines/GitSafetyEngine.js");
          const p = params as any;
          result = (gitSafetyEngine as any).assertNoTemporalLeakage?.(p?.training_max_ts ?? "", p?.test_min_ts ?? "") ?? (gitSafetyEngine as any).run?.(p) ?? { engine: "GitSafetyEngine", note: "method not callable" };
        } else if (STOCK_BOUNDARY_GATE_ACTIONS.has(action)) {
          const { stockBoundaryGateEngine } = await import("../../engines/StockBoundaryGateEngine.js");
          const p = params as any;
          result = (stockBoundaryGateEngine as any).run?.(p) ?? (stockBoundaryGateEngine as any).evaluate?.(p) ?? (stockBoundaryGateEngine as any).check?.(p) ?? { engine: "StockBoundaryGateEngine", note: "method not callable" };
        } else if (ARCHIVE_CATALOG_INGEST_ACTIONS.has(action)) {
          const { archiveToPartsCatalogIngesterEngine } = await import("../../engines/ArchiveToPartsCatalogIngesterEngine.js");
          const p = params as any;
          result = (archiveToPartsCatalogIngesterEngine as any).ingest?.(p) ?? (archiveToPartsCatalogIngesterEngine as any).run?.(p) ?? { engine: "ArchiveToPartsCatalogIngesterEngine", note: "method not callable" };
        } else if (WORKHOLDING_DB_ACTIONS.has(action)) {
          // Workholding fixture-type + product catalog query (data-only monolith port).
          // Discriminated by which key is present; no key → full catalog listing.
          const { monolithWorkholdingDatabaseEngine: wdb } = await import("../../engines/MonolithWorkholdingDatabaseEngine.js");
          const p = params as Record<string, any>;
          if (typeof p.fixtureTypeId === "string") {
            const ft = wdb.getFixtureType(p.fixtureTypeId);
            result = ft ? { fixtureType: ft } : { fixtureType: null, error: `unknown fixtureTypeId: ${p.fixtureTypeId}` };
          } else if (typeof p.productId === "string") {
            const pr = wdb.getProduct(p.productId);
            result = pr ? { product: pr } : { product: null, error: `unknown productId: ${p.productId}` };
          } else if (typeof p.category === "string") {
            result = { fixtureTypes: wdb.listByCategory(p.category as Parameters<typeof wdb.listByCategory>[0]) };
          } else if (typeof p.manufacturer === "string") {
            result = { products: wdb.listByManufacturer(p.manufacturer) };
          } else {
            result = { fixtureTypes: wdb.listFixtureTypes(), products: wdb.listProducts() };
          }
        } else if (KILLSWITCH_ACTIONS.has(action)) {
          // WIRE-UNWIRED-PAPA/U-WIRE-KILLSWITCH: read-only TriLevelKillSwitch inspection.
          // Mutations (trip/reset/setSla/clearAll) are DEFERRED -- they change the fleet kill
          // state and require operator-in-the-loop per CLAUDE.md Safety Tier (mirrors the WEDM
          // governance read-only block above).
          const { triLevelKillSwitchEngine } = await import("../../engines/TriLevelKillSwitchEngine.js");
          if (action === "killswitch_state") {
            result = triLevelKillSwitchEngine.getActiveState();
          } else if (action === "killswitch_gate") {
            result = { gate_open: triLevelKillSwitchEngine.dispatcherGateOpen() };
          } else if (action === "killswitch_stats") {
            result = triLevelKillSwitchEngine.getStats();
          } else if (action === "killswitch_trips") {
            const level = typeof params.level === "string" ? (params.level as Exclude<KillLevel, "OK">) : undefined;
            const since = typeof params.since === "number" ? params.since : undefined;
            const limit = typeof params.limit === "number" ? params.limit : undefined;
            result = { trips: triLevelKillSwitchEngine.listTrips({ level, since, limit }) };
          } else if (action === "killswitch_compliance") {
            const since = typeof params.since === "number" ? params.since : undefined;
            result = triLevelKillSwitchEngine.complianceReport(since);
          } else {
            result = { error: `unknown killswitch action: ${action}` };
          }
        } else if (SBOM_ACTIONS.has(action)) {
          // WIRE-UNWIRED-PAPA/U-WIRE-SBOM: read-only SBOMReviewEngine inspection.
          // Mutations (registerComponent/registerVulnerability/captureSnapshot/openRemediation/
          // startReview/completeReview/clearAll) are DEFERRED -- they change the security-posture
          // record of record and require operator-in-the-loop per CLAUDE.md Safety Tier (mirrors the
          // kill-switch read-only block above).
          const { sbomReviewEngine } = await import("../../engines/SBOMReviewEngine.js");
          if (action === "sbom_stats") {
            result = sbomReviewEngine.getStats();
          } else if (action === "sbom_posture") {
            result = sbomReviewEngine.getPosture();
          } else if (action === "sbom_components") {
            const type = typeof params.type === "string" ? (params.type as ComponentType) : undefined;
            const direct_only = typeof params.direct_only === "boolean" ? params.direct_only : undefined;
            result = { components: sbomReviewEngine.listComponents({ type, direct_only }) };
          } else if (action === "sbom_vulnerabilities") {
            const severity = typeof params.severity === "string" ? (params.severity as VulnSeverity) : undefined;
            const component_id = typeof params.component_id === "string" ? params.component_id : undefined;
            result = { vulnerabilities: sbomReviewEngine.listVulnerabilities({ severity, component_id }) };
          } else if (action === "sbom_remediations") {
            const status = typeof params.status === "string" ? (params.status as RemediationStatus) : undefined;
            const overdue_only = typeof params.overdue_only === "boolean" ? params.overdue_only : undefined;
            result = { remediations: sbomReviewEngine.listRemediations({ status, overdue_only }) };
          } else {
            result = { error: `unknown sbom action: ${action}` };
          }
        } else if (WETRUN_ACTIONS.has(action)) {
          // WIRE-UNWIRED-PAPA/U-WIRE-WETRUN-FSM: WetRunStateMachineEngine wet-run safety FSM.
          // Shared singleton so sessions persist across dispatcher calls (in-memory store).
          // Lifecycle mutations (start/record) change only in-process FSM state (not an external
          // record of record), so they are wired alongside the reads. slot:papa 2026-06-14.
          // NOTE (scrutiny arm B P2): if WetRunStateMachineEngine ever gains persistence
          // (PostMortemRecord/QuarantineClearance imply a future audit trail), re-evaluate the
          // start/record mutations under the operator-gate doctrine used for killswitch/SBOM.
          const { wetRunStateMachineEngine } = await import("../../engines/WetRunStateMachineEngine.js");
          if (action === "wetrun_start_session") {
            result = wetRunStateMachineEngine.startSession(params as unknown as Parameters<typeof wetRunStateMachineEngine.startSession>[0]);
          } else if (action === "wetrun_record_part") {
            result = wetRunStateMachineEngine.recordPartOutcome(params as unknown as Parameters<typeof wetRunStateMachineEngine.recordPartOutcome>[0]);
          } else if (action === "wetrun_record_safety_event") {
            result = wetRunStateMachineEngine.recordSafetyEvent(params as unknown as Parameters<typeof wetRunStateMachineEngine.recordSafetyEvent>[0]);
          } else if (action === "wetrun_get_session") {
            result = wetRunStateMachineEngine.getSession(params.session_id as string);
          } else if (action === "wetrun_list_sessions") {
            result = { sessions: wetRunStateMachineEngine.listSessions(params as unknown as Parameters<typeof wetRunStateMachineEngine.listSessions>[0]) };
          } else if (action === "wetrun_list_transitions") {
            result = { transitions: wetRunStateMachineEngine.listTransitions(params as unknown as Parameters<typeof wetRunStateMachineEngine.listTransitions>[0]) };
          } else if (action === "wetrun_list_scrap_events") {
            const session_id = typeof params.session_id === "string" ? params.session_id : undefined;
            result = { scrapEvents: wetRunStateMachineEngine.listScrapEvents(session_id) };
          } else if (action === "wetrun_list_safety_events") {
            const session_id = typeof params.session_id === "string" ? params.session_id : undefined;
            result = { safetyEvents: wetRunStateMachineEngine.listSafetyEvents(session_id) };
          } else {
            result = { error: `unknown wetrun action: ${action}` };
          }
        } else if (WETFREEZE_ACTIONS.has(action)) {
          // WIRE-UNWIRED-PAPA/U-WIRE-WETFREEZE: WetRunChangeFreezeEngine change-freeze windows.
          // Shared singleton (in-memory window/override store persists across calls). Mutations
          // (declare/grant) are in-process only, wired alongside reads (mirrors WETRUN precedent;
          // re-evaluate operator-gate if persistence is added). slot:papa 2026-06-14.
          const { wetRunChangeFreezeEngine } = await import("../../engines/WetRunChangeFreezeEngine.js");
          if (action === "wetfreeze_declare_window") {
            result = wetRunChangeFreezeEngine.declareWindow(params as unknown as Parameters<typeof wetRunChangeFreezeEngine.declareWindow>[0]);
          } else if (action === "wetfreeze_grant_override") {
            result = wetRunChangeFreezeEngine.grantOverride(params as unknown as Parameters<typeof wetRunChangeFreezeEngine.grantOverride>[0]);
          } else if (action === "wetfreeze_check") {
            result = wetRunChangeFreezeEngine.checkAt(params.now_ts as number, params.change_kind as Parameters<typeof wetRunChangeFreezeEngine.checkAt>[1]);
          } else if (action === "wetfreeze_list_active") {
            result = { windows: wetRunChangeFreezeEngine.listActive(params.now_ts as number) };
          } else if (action === "wetfreeze_get_window") {
            const w = wetRunChangeFreezeEngine.getWindow(params.id as string);
            result = { found: w !== undefined, window: w ?? null };
          } else if (action === "wetfreeze_get_override") {
            const o = wetRunChangeFreezeEngine.getOverride(params.override_id as string);
            result = { found: o !== undefined, override: o ?? null };
          } else if (action === "wetfreeze_list_windows") {
            result = { windows: wetRunChangeFreezeEngine.listWindows() };
          } else if (action === "wetfreeze_list_overrides") {
            result = { overrides: wetRunChangeFreezeEngine.listOverrides() };
          } else {
            result = { error: `unknown wetfreeze action: ${action}` };
          }
        } else if (WETRET_ACTIONS.has(action)) {
          // WIRE-UNWIRED-PAPA/U-WIRE-WETRET: WetRunRetentionPolicyEngine compliance-retention
          // lifecycle (register/schedule/execute purge + legal hold). Shared singleton (in-memory
          // artifact store persists). Mutations wired alongside reads (in-process only; re-evaluate
          // operator-gate if persistence is added). slot:papa 2026-06-14.
          const { wetRunRetentionPolicyEngine } = await import("../../engines/WetRunRetentionPolicyEngine.js");
          if (action === "wetret_register") {
            result = wetRunRetentionPolicyEngine.register(params as unknown as Parameters<typeof wetRunRetentionPolicyEngine.register>[0]);
          } else if (action === "wetret_can_purge") {
            result = wetRunRetentionPolicyEngine.canPurge(params.artifact_id as string, params.now_ts as number);
          } else if (action === "wetret_schedule_purge") {
            result = wetRunRetentionPolicyEngine.schedulePurge(params as unknown as Parameters<typeof wetRunRetentionPolicyEngine.schedulePurge>[0]);
          } else if (action === "wetret_cancel_purge") {
            result = wetRunRetentionPolicyEngine.cancelScheduledPurge(params as unknown as Parameters<typeof wetRunRetentionPolicyEngine.cancelScheduledPurge>[0]);
          } else if (action === "wetret_execute_purge") {
            result = wetRunRetentionPolicyEngine.executePurge(params as unknown as Parameters<typeof wetRunRetentionPolicyEngine.executePurge>[0]);
          } else if (action === "wetret_set_legal_hold") {
            result = wetRunRetentionPolicyEngine.setLegalHold(params as unknown as Parameters<typeof wetRunRetentionPolicyEngine.setLegalHold>[0]);
          } else if (action === "wetret_release_legal_hold") {
            result = wetRunRetentionPolicyEngine.releaseLegalHold(params as unknown as Parameters<typeof wetRunRetentionPolicyEngine.releaseLegalHold>[0]);
          } else if (action === "wetret_get") {
            const a = wetRunRetentionPolicyEngine.get(params.artifact_id as string);
            result = { found: a !== undefined, artifact: a ?? null };
          } else if (action === "wetret_list") {
            const pilot_id = typeof params.pilot_id === "string" ? params.pilot_id : undefined;
            result = { artifacts: wetRunRetentionPolicyEngine.listArtifacts(pilot_id) };
          } else {
            result = { error: `unknown wetret action: ${action}` };
          }
        } else {
          return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: `Unknown safety action: ${action}` }) }] };
        }

        // R2-MS1 T5: Apply response_level formatting if requested
        const responseLevel = (params.response_level as ResponseLevel) || undefined;
        if (responseLevel) {
          // Unwrap MCP envelope if present
          const raw = (result && result.content?.[0]?.text) ? JSON.parse(result.content[0].text) : result;
          const leveled = formatByLevel(raw, responseLevel, (r: any) => safetyExtractKeyValues(action, r));
          return { content: [{ type: "text" as const, text: JSON.stringify(leveled) }] };
        }

        // Wrap raw result in MCP format if needed
        if (result && !result.content) {
          return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
        }
        return result;
      } catch (error: any) {
        // QA-MS1 FIX: Re-throw SafetyBlockError — hard blocks must propagate, not be swallowed
        if (error instanceof SafetyBlockError || error?.name === 'SafetyBlockError') throw error;
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: `Safety tool error: ${error.message}`, action }) }], isError: true };
      }
    }
  );
}
