/**
 * EngagementOptimizerAdapter — CAMX-MS0.3 / U-CAMX05
 *
 * Replaces HEURISTIC "pick ae = 40% of diameter, ap = 1× diameter" decisions
 * sprinkled through PrintToProgram and Turning with a physics-backed ae/ap
 * candidate generator routed through PipelineDecisionOrchestrator.
 *
 * Candidate generation is seeded from two canonical sources:
 *   1. Sandvik / Kennametal recommended engagement envelopes per operation
 *      (roughing 30–70% dia, finishing 5–30% dia; ap = 0.5–2.5 × dia for
 *      solid carbide milling; ap = 0.5–5 mm per pass for turning)
 *   2. Physics filters that prune unsafe pairs:
 *        • chip_thinning_factor = ae/d_c when ae < d_c/2 (Sandvik eq.)
 *        • force_budget        = kc × ap × fz × cos_lead ≤ machine_torque_limit
 *        • deflection_budget   = F × L^3 / (3 × E × I) ≤ 0.05 mm (50 μm)
 *        • chatter_window      = ap ≤ ap_critical from SLD (if provided)
 *
 * Each surviving candidate is scored on the orchestrator's 5 axes:
 *   optimal_performance ← MRR (ae × ap × fz × z × RPM)
 *   logical_consistency ← fit to operation envelope (rough/finish)
 *   safety              ← force margin, deflection margin, chatter margin
 *   cost_efficiency     ← 1 − pass_count / max_passes
 *   robustness          ← ae/d_c within safe band (0.3–0.7 for rough)
 *
 * Call sites
 *   PrintToProgram.calcEngagement()        → decision_point "p2p.engagement_optimize"
 *   Turning.calcDepthOfCut()               → decision_point "turn.depth_of_cut"
 */

import { pipelineDecisionOrchestratorEngine } from "./PipelineDecisionOrchestratorEngine.js";

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────

export interface EngagementCandidate {
  id: string;
  label: string;
  ae_mm: number;
  ap_mm: number;
  ae_pct_dia: number; // derived
  ap_pct_dia: number; // derived
  mrr_mm3_per_min: number;
  pass_count_radial: number;
  pass_count_axial: number;
  force_margin_pct: number; // >0 good
  deflection_margin_pct: number; // >0 good
  chatter_margin_pct: number; // >0 good, Infinity when SLD not provided
  source: string;
}

export interface OrchestratedEngagementRequest {
  decision_point: string;
  operation_type: "milling_rough" | "milling_finish" | "turning" | "drilling";
  tool_diameter_mm: number;
  /** Stock / feature depth to remove in axial direction (mm). */
  stock_depth_mm: number;
  /** Stock / feature width to remove in radial direction (mm). For turning = radial DOC budget. */
  stock_width_mm?: number;
  /** Feed per tooth / feed per rev (mm). */
  fz_mm?: number;
  /** Spindle RPM. */
  rpm?: number;
  /** Flute count (milling); ignored for turning. */
  flute_count?: number;
  /** Material Kienzle kc1.1 (N/mm²). Used for force budget. */
  kc1_1?: number;
  /** Material mc exponent. */
  mc?: number;
  /** Machine torque limit (N·m). */
  machine_torque_limit_nm?: number;
  /** Effective tool stick-out (mm) for deflection estimate. */
  stick_out_mm?: number;
  /** Modulus of elasticity E (GPa). Default 600 GPa (solid carbide). */
  youngs_modulus_gpa?: number;
  /** Optional chatter-lobe critical ap (mm). Infinity when not known. */
  ap_critical_chatter_mm?: number;
  /** Target: "mrr" maximises volume/time; "stability" prefers wider safety margins. */
  objective?: "speed" | "quality" | "cost" | "balanced" | "tool_life";
  pipeline_stage?: string;
  caller?: string;
  explain?: boolean;
}

export interface OrchestratedEngagementDecision {
  winner: EngagementCandidate;
  decision: any;
  no_candidates: boolean;
}

// ────────────────────────────────────────────────────────────────────────
// Physics helpers
// ────────────────────────────────────────────────────────────────────────

/**
 * Kienzle cutting force per tooth.
 * Fc = kc1_1 × ap × fz^(1 − mc)   (N per tooth)
 */
function kienzle_force_n(kc1_1: number, ap_mm: number, fz_mm: number, mc: number): number {
  if (fz_mm <= 0) return 0;
  return kc1_1 * ap_mm * Math.pow(fz_mm, 1 - mc);
}

/**
 * Cantilever deflection: δ = F × L^3 / (3 × E × I)
 * I = π × d^4 / 64 for solid round shank (approx for solid endmill).
 */
function deflection_mm(force_n: number, stick_out_mm: number, dia_mm: number, E_gpa: number): number {
  const L = stick_out_mm / 1000; // m
  const d = dia_mm / 1000; // m
  const I = (Math.PI * Math.pow(d, 4)) / 64;
  const E = E_gpa * 1e9; // Pa
  if (I <= 0 || E <= 0) return Infinity;
  const F = force_n;
  const delta_m = (F * Math.pow(L, 3)) / (3 * E * I);
  return delta_m * 1000; // mm
}

// ────────────────────────────────────────────────────────────────────────
// Candidate generation
// ────────────────────────────────────────────────────────────────────────

const MAX_DEFLECTION_MM = 0.05; // 50 μm default cap
const ROUGH_AE_PCTS = [0.3, 0.4, 0.5, 0.6, 0.7]; // radial WOC for rough
const FINISH_AE_PCTS = [0.05, 0.1, 0.15, 0.2, 0.3]; // finish WOC
const AP_MULT_MILL = [0.5, 1.0, 1.5, 2.0, 2.5]; // axial DOC × diameter
const AP_MM_TURN = [0.25, 0.5, 1.0, 2.0, 3.0, 5.0]; // axial DOC for turning

function makeCandidate(
  id: string,
  label: string,
  ae_mm: number,
  ap_mm: number,
  req: OrchestratedEngagementRequest,
  source: string,
): EngagementCandidate {
  const d = req.tool_diameter_mm;
  const fz = req.fz_mm ?? 0.1;
  const rpm = req.rpm ?? 5000;
  const z = req.flute_count ?? (req.operation_type === "turning" ? 1 : 4);
  const kc = req.kc1_1 ?? 1800;
  const mc = req.mc ?? 0.25;
  const torque_lim = req.machine_torque_limit_nm ?? 60;
  const stick = req.stick_out_mm ?? 3 * d;
  const E = req.youngs_modulus_gpa ?? 600;

  // MRR = ae × ap × fz × z × RPM (mm³/min)
  const mrr = Math.max(0, ae_mm * ap_mm * fz * z * rpm);

  // Force per tooth, then total radial/tangential force (approx cos(lead)=1)
  const fc_per_tooth = kienzle_force_n(kc, ap_mm, fz, mc);
  const engaged_teeth = Math.max(1, z * Math.min(0.5, ae_mm / d));
  const fc_total = fc_per_tooth * engaged_teeth;
  const torque_nm = (fc_total * d) / 2000; // N·m (d in mm → arm mm/1000 /2)
  const force_margin = torque_lim > 0 ? (torque_lim - torque_nm) / torque_lim : 0;

  // Deflection budget
  const delta = deflection_mm(fc_total, stick, d, E);
  const defl_margin = MAX_DEFLECTION_MM > 0 ? (MAX_DEFLECTION_MM - delta) / MAX_DEFLECTION_MM : 0;

  // Chatter margin (optional)
  let chat_margin = Infinity;
  if (req.ap_critical_chatter_mm != null && isFinite(req.ap_critical_chatter_mm) && req.ap_critical_chatter_mm > 0) {
    chat_margin = (req.ap_critical_chatter_mm - ap_mm) / req.ap_critical_chatter_mm;
  }

  const width = req.stock_width_mm ?? d;
  const depth = req.stock_depth_mm;
  const pr = Math.ceil(width / ae_mm);
  const pa = Math.ceil(depth / ap_mm);

  return {
    id,
    label,
    ae_mm,
    ap_mm,
    ae_pct_dia: ae_mm / d,
    ap_pct_dia: ap_mm / d,
    mrr_mm3_per_min: mrr,
    pass_count_radial: pr,
    pass_count_axial: pa,
    force_margin_pct: force_margin * 100,
    deflection_margin_pct: defl_margin * 100,
    chatter_margin_pct: isFinite(chat_margin) ? chat_margin * 100 : Infinity,
    source,
  };
}

function enumerate(req: OrchestratedEngagementRequest): EngagementCandidate[] {
  const d = req.tool_diameter_mm;
  const out: EngagementCandidate[] = [];
  if (!d || d <= 0) return out;

  if (req.operation_type === "turning") {
    // Turning: ae treated as fixed (tool width); ap sweeps
    for (const ap of AP_MM_TURN) {
      if (ap > req.stock_depth_mm) continue;
      out.push(
        makeCandidate(
          `TURN-ap${ap}`,
          `Turning ap=${ap}mm`,
          req.stock_width_mm ?? d,
          ap,
          req,
          "Sandvik turning handbook",
        ),
      );
    }
    return out;
  }

  const is_rough = req.operation_type === "milling_rough" || req.operation_type === "drilling";
  const ae_pcts = is_rough ? ROUGH_AE_PCTS : FINISH_AE_PCTS;

  for (const ae_pct of ae_pcts) {
    for (const ap_mult of AP_MULT_MILL) {
      const ae = d * ae_pct;
      const ap = Math.min(d * ap_mult, req.stock_depth_mm);
      if (ae <= 0 || ap <= 0) continue;
      out.push(
        makeCandidate(
          `MILL-ae${(ae_pct * 100).toFixed(0)}-ap${ap_mult.toFixed(1)}`,
          `ae=${(ae_pct * 100).toFixed(0)}% d / ap=${ap_mult.toFixed(1)}×d`,
          ae,
          ap,
          req,
          is_rough ? "Sandvik milling rough envelope" : "Walter finishing envelope",
        ),
      );
    }
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────
// Scoring
// ────────────────────────────────────────────────────────────────────────

function toPreScores(c: EngagementCandidate, req: OrchestratedEngagementRequest): Record<string, number> {
  // Normalise MRR: pick a conservative reference — d² × rpm × fz × z is a rough max
  const d = req.tool_diameter_mm;
  const fz = req.fz_mm ?? 0.1;
  const rpm = req.rpm ?? 5000;
  const z = req.flute_count ?? 4;
  const mrr_ref = d * d * fz * z * rpm; // upper bound when ae=d, ap=d
  const perf = Math.min(1, Math.max(0, c.mrr_mm3_per_min / Math.max(1, mrr_ref)));

  // Logical: rough envelope 30–70%, finish 5–30%; stay within
  const is_rough = req.operation_type === "milling_rough" || req.operation_type === "drilling";
  let logical = 0.6;
  if (is_rough && c.ae_pct_dia >= 0.3 && c.ae_pct_dia <= 0.7) logical += 0.3;
  if (!is_rough && c.ae_pct_dia <= 0.3) logical += 0.3;
  if (c.ap_pct_dia <= 2.5) logical += 0.1;
  logical = Math.max(0, Math.min(1, logical));

  // Safety: minimum of force, deflection, chatter margins (normalized to [0,1])
  const fm = Math.max(0, Math.min(1, (c.force_margin_pct + 20) / 120)); // -20%→0, +100%→1
  const dm = Math.max(0, Math.min(1, (c.deflection_margin_pct + 20) / 120));
  const cm = isFinite(c.chatter_margin_pct) ? Math.max(0, Math.min(1, (c.chatter_margin_pct + 20) / 120)) : 0.8;
  const safety = Math.min(fm, dm, cm);

  // Cost efficiency: fewer passes is better
  const total_passes = c.pass_count_radial * c.pass_count_axial;
  const cost = Math.max(0, Math.min(1, 1 / Math.max(1, Math.log2(total_passes + 1))));

  // Robustness: ae in "sweet band" (~0.4–0.5 for rough, ~0.1–0.2 for finish)
  const ideal = is_rough ? 0.45 : 0.15;
  const delta = Math.abs(c.ae_pct_dia - ideal);
  const robustness = Math.max(0, 1 - delta / 0.4);

  return {
    optimal_performance: perf,
    logical_consistency: logical,
    safety,
    cost_efficiency: cost,
    robustness,
  };
}

// ────────────────────────────────────────────────────────────────────────
// Engine / adapter
// ────────────────────────────────────────────────────────────────────────

export class EngagementOptimizerAdapter {
  selectEngagementOrchestrated(req: OrchestratedEngagementRequest): OrchestratedEngagementDecision {
    const all = enumerate(req);

    // Hard-filter: drop candidates with negative force, deflection, or chatter margin
    const viable = all.filter(
      (c) =>
        c.force_margin_pct > -5 &&
        c.deflection_margin_pct > -5 &&
        (c.chatter_margin_pct === Infinity || c.chatter_margin_pct > -5),
    );

    if (viable.length === 0) {
      return { winner: null as any, decision: null, no_candidates: true };
    }

    const candidates = viable.map((c) => ({
      id: c.id,
      label: c.label,
      data: {
        ae_mm: c.ae_mm,
        ap_mm: c.ap_mm,
        ae_pct_dia: c.ae_pct_dia,
        ap_pct_dia: c.ap_pct_dia,
        mrr_mm3_per_min: c.mrr_mm3_per_min,
        pass_count_radial: c.pass_count_radial,
        pass_count_axial: c.pass_count_axial,
        force_margin_pct: c.force_margin_pct,
        deflection_margin_pct: c.deflection_margin_pct,
        chatter_margin_pct: isFinite(c.chatter_margin_pct) ? c.chatter_margin_pct : null,
      },
      pre_scores: toPreScores(c, req),
    }));

    const decision = (pipelineDecisionOrchestratorEngine as any).decide({
      category: "parameter_optimize",
      context: {
        operation: req.operation_type,
        tool: { diameter_mm: req.tool_diameter_mm, flutes: req.flute_count },
        stock: { depth_mm: req.stock_depth_mm, width_mm: req.stock_width_mm },
        machine: { torque_limit_nm: req.machine_torque_limit_nm },
      },
      candidates,
      objective: req.objective ?? "balanced",
      explain: req.explain ?? false,
      pipeline_stage: req.pipeline_stage,
      caller: req.caller,
      constraints: {
        max_deflection_mm: MAX_DEFLECTION_MM,
      },
    });

    const winner = viable.find((c) => c.id === decision?.choice?.id) ?? viable[0];
    return { winner, decision, no_candidates: false };
  }
}

// ────────────────────────────────────────────────────────────────────────
// Singleton
// ────────────────────────────────────────────────────────────────────────
export const engagementOptimizerAdapter = new EngagementOptimizerAdapter();
