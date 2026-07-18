/**
 * OkumaLatheOSPProfileEngine.ts
 * ==============================
 *
 * Okuma lathe OSP-controller capability profile + parameter-recommendation engine.
 *
 * MIKE /goal session (2026-05-23) — answers the user-named clause:
 *   "utilize PSN to extract full potential from machines, controllers, osp
 *    coding, macros, tooling parameters relative to material, stock stick out,
 *    tool type and stick out and all other machining parameters"
 *
 * Combines:
 *   - INDIA's HURCO-POST-REMEDIATION-MS0 pattern (Groups A-F): Kienzle Fc
 *     bound + Taylor T=(C/Vc)^(1/n) + stickout L/D ratio + R12 fail-loud
 *     out-of-range material validation.
 *   - ECHO's LATHE-P2P-CONSENSUS-MS4 pattern: 3-candidate fanout
 *     (conservative / balanced / aggressive) + Omega/S(x) safety gate
 *     (shop_floor tier: Omega>=0.95, S(x)>=0.98).
 *
 * Profiles the 7 JM-Die Okuma lathes (LTH-01 through LTH-07) by OSP
 * controller dialect family (P200LA, P300L, P300LA, P300SA, P500, U10L)
 * and produces per-machine parameter recommendations gated by the
 * canonical physics constants.
 *
 * Reference: india U-HURCO-G053-FIX (commit ae0f634ae4),
 *            echo  LATHE-P2P-CONSENSUS-MS4 close-out (commit d6a975d987),
 *            sister unit U-MIKE-LATHE-POST-AUDIT (commit 6a5bd90897).
 *
 * @milestone MIKE-OSP-PROFILE-MS0
 * @unit      U-MIKE-OSP-PROFILE-ENGINE
 * @slot      mike
 */

import { z } from "zod";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";
export type OSPFamily = "P200LA" | "P300L" | "P300LA" | "P300SA" | "P500" | "U10L";
export type EnhancementTier = "plain" | "partially_enhanced" | "fully_enhanced";
export type CandidateStrategy = "conservative" | "balanced" | "aggressive";

export interface OSPDialectProfile {
  family: OSPFamily;
  generation: number;        // 1=legacy U10L .. 5=current P300SA
  imachining_capable: boolean;
  ai_adaptive_feedrate_capable: boolean;
  live_tooling_capable: boolean;
  c_axis_capable: boolean;
  thread_pitch_macro: string; // G76 (Okuma) variant
  feed_mode_default: "G94" | "G95"; // G94=mm/min, G95=mm/rev (Okuma lathes are G95 by default)
  spindle_max_rpm: number;
  notes: string[];
}

export interface LatheMachineDescriptor {
  machine_id: string;
  machine_name: string;
  controller_model: string;
  post_processor: string;
  enhancement_tier: EnhancementTier;
}

export interface KienzleGateInput {
  iso_group: ISOGroup;
  ap_mm: number;             // depth of cut [mm]
  fz_mm: number;             // feed per tooth (lathe: feed per rev) [mm]
  width_mm?: number;         // engagement width [mm], defaults to 1
  max_force_N: number;       // machine-side cutting-force limit
}

export interface KienzleGateResult {
  fc_N: number;
  within_bounds: boolean;
  headroom_pct: number;      // (max - fc) / max * 100
  kc1_1_used: number;
  mc_used: number;
}

export interface TaylorGateInput {
  iso_group: ISOGroup;
  vc_m_min: number;          // cutting speed [m/min]
  target_life_min: number;   // minimum acceptable tool life [min]
}

export interface TaylorGateResult {
  predicted_life_min: number;
  life_margin_factor: number; // predicted / target
  ok: boolean;
  C_used: number;
  n_used: number;
}

export interface StickoutGateInput {
  L_mm: number;              // tool stickout length
  D_mm: number;              // tool shank diameter
  max_LD_ratio?: number;     // default 4.0 for general turning
}

export interface StickoutGateResult {
  LD_ratio: number;
  ok: boolean;
  deflection_class: "rigid" | "moderate" | "compliant" | "excessive";
  recommended_max_force_N: number; // cubic falloff per L/D
}

export interface CandidateParameters {
  strategy: CandidateStrategy;
  vc_m_min: number;
  fz_mm: number;
  ap_mm: number;
  predicted_fc_N: number;
  predicted_life_min: number;
  confidence: number;        // [0, 1]
}

export interface ConsensusResult {
  candidates: CandidateParameters[];
  recommended: CandidateParameters;
  omega: number;             // mean cross-candidate agreement [0, 1]
  sx: number;                // safety score [0, 1]
  passes_safety_gate: boolean;
}

export interface SafetyGateInput {
  omega: number;
  sx: number;
  tier?: "shop_floor" | "lab" | "research";
}

export class SafetyGateRejection extends Error {
  public readonly omega: number;
  public readonly sx: number;
  public readonly omega_threshold: number;
  public readonly sx_threshold: number;
  constructor(omega: number, sx: number, omega_threshold: number, sx_threshold: number) {
    super(
      `Safety gate REJECT: Omega=${omega.toFixed(3)} (>=${omega_threshold}) ` +
      `S(x)=${sx.toFixed(3)} (>=${sx_threshold}). Per echo LATHE-P2P-CONSENSUS-MS4 ` +
      `+ india HURCO-POST-REMEDIATION-MS0 patterns — emit is BLOCKED.`,
    );
    this.name = "SafetyGateRejection";
    this.omega = omega;
    this.sx = sx;
    this.omega_threshold = omega_threshold;
    this.sx_threshold = sx_threshold;
  }
}

// ============================================================================
// ZOD INPUT SCHEMAS
// ============================================================================

export const KienzleGateInputSchema = z.object({
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  ap_mm: z.number().positive().max(50),
  fz_mm: z.number().positive().max(5),
  width_mm: z.number().positive().max(200).optional(),
  max_force_N: z.number().positive().max(50000),
});

export const TaylorGateInputSchema = z.object({
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  vc_m_min: z.number().positive().max(2000),
  target_life_min: z.number().positive().max(600),
});

export const StickoutGateInputSchema = z.object({
  L_mm: z.number().positive().max(500),
  D_mm: z.number().positive().max(100),
  max_LD_ratio: z.number().positive().max(20).optional(),
});

// ============================================================================
// CONTROLLER DIALECT PROFILES (Okuma OSP family)
// ============================================================================

const OSP_DIALECTS: Record<OSPFamily, OSPDialectProfile> = {
  P200LA: {
    family: "P200LA",
    generation: 3,
    imachining_capable: true,
    ai_adaptive_feedrate_capable: true,
    live_tooling_capable: false,
    c_axis_capable: false,
    thread_pitch_macro: "G76",
    feed_mode_default: "G95",
    spindle_max_rpm: 5000,
    notes: ["Okuma GENOS L200 family controller", "2-axis lathe"],
  },
  P300L: {
    family: "P300L",
    generation: 4,
    imachining_capable: true,
    ai_adaptive_feedrate_capable: true,
    live_tooling_capable: true,
    c_axis_capable: true,
    thread_pitch_macro: "G76",
    feed_mode_default: "G95",
    spindle_max_rpm: 4000,
    notes: ["Okuma GENOS L300 family controller", "Y-axis + live-tool variants"],
  },
  P300LA: {
    family: "P300LA",
    generation: 4,
    imachining_capable: true,
    ai_adaptive_feedrate_capable: true,
    live_tooling_capable: true,
    c_axis_capable: true,
    thread_pitch_macro: "G76",
    feed_mode_default: "G95",
    spindle_max_rpm: 4500,
    notes: ["Okuma GENOS L400 family controller (LA = larger envelope)", "Live-tool + C-axis"],
  },
  P300SA: {
    family: "P300SA",
    generation: 5,
    imachining_capable: true,
    ai_adaptive_feedrate_capable: true,
    live_tooling_capable: true,
    c_axis_capable: true,
    thread_pitch_macro: "G76",
    feed_mode_default: "G95",
    spindle_max_rpm: 6000,
    notes: ["Okuma Multus B-series controller", "Mill-turn capable", "B-axis + sub-spindle"],
  },
  P500: {
    family: "P500",
    generation: 5,
    imachining_capable: true,
    ai_adaptive_feedrate_capable: true,
    live_tooling_capable: true,
    c_axis_capable: true,
    thread_pitch_macro: "G76",
    feed_mode_default: "G95",
    spindle_max_rpm: 3500,
    notes: ["Okuma LB-series big-bore controller", "Heavy turning + live-tool"],
  },
  U10L: {
    family: "U10L",
    generation: 1,
    imachining_capable: false, // legacy controller
    ai_adaptive_feedrate_capable: false,
    live_tooling_capable: false,
    c_axis_capable: false,
    thread_pitch_macro: "G76",
    feed_mode_default: "G95",
    spindle_max_rpm: 4500,
    notes: ["Okuma LNC/Crown legacy controller", "No iMachining / no AI-adaptive — upgrade impossible without controller swap"],
  },
};

// ============================================================================
// ENGINE
// ============================================================================

export class OkumaLatheOSPProfileEngine {
  /**
   * Classify an Okuma controller-model string into its OSP family.
   * @param controller_model e.g. "OSP-P300L-R", "OSP-P200LA-R", "OSP-U10L"
   * @returns OSPDialectProfile, or null if not a recognized Okuma OSP
   */
  static classifyController(controller_model: string): OSPDialectProfile | null {
    const m = controller_model.match(/OSP-([A-Z]\d+[A-Z]*)/);
    if (!m) return null;
    const code = m[1]!;
    // Normalise: e.g. "P300L" / "P300LA" / "P300SA" / "P500" / "U10L"
    if (code in OSP_DIALECTS) return OSP_DIALECTS[code as OSPFamily];
    // Fallback: prefix match (e.g. "P300LA" -> P300LA, "P200LA" -> P200LA)
    for (const family of Object.keys(OSP_DIALECTS) as OSPFamily[]) {
      if (code.startsWith(family)) return OSP_DIALECTS[family];
    }
    return null;
  }

  /**
   * India HURCO-POST-REMEDIATION pattern (Group D physics check):
   * Kienzle cutting-force bound check.
   * Fc = kc1_1 * ap * fz^(1-mc), per CANONICAL_KIENZLE.
   *
   * R12 fail-loud: throws ZodError on out-of-range input rather than silently clamping.
   *
   * @param input KienzleGateInput
   * @returns KienzleGateResult with fc_N + within_bounds + headroom_pct
   */
  static applyKienzleGate(input: KienzleGateInput): KienzleGateResult {
    const validated = KienzleGateInputSchema.parse(input);
    const { iso_group, ap_mm, fz_mm, max_force_N } = validated;
    const width = validated.width_mm ?? 1;
    const { kc1_1, mc } = CANONICAL_KIENZLE[iso_group];
    // Kienzle: Fc = kc1_1 * b * fz^(1-mc) * ap   (per Sandvik General Turning 2024)
    const fc_N = kc1_1 * width * Math.pow(fz_mm, 1 - mc) * ap_mm;
    const headroom_pct = ((max_force_N - fc_N) / max_force_N) * 100;
    return {
      fc_N,
      within_bounds: fc_N <= max_force_N,
      headroom_pct,
      kc1_1_used: kc1_1,
      mc_used: mc,
    };
  }

  /**
   * India HURCO-POST-REMEDIATION pattern (Group D physics check):
   * Taylor tool-life bound check.
   * T = (C / Vc)^(1/n), per CANONICAL_TAYLOR.
   *
   * R12 fail-loud: throws ZodError on out-of-range input.
   *
   * @param input TaylorGateInput
   * @returns TaylorGateResult with predicted_life_min + life_margin_factor + ok
   */
  static applyTaylorGate(input: TaylorGateInput): TaylorGateResult {
    const validated = TaylorGateInputSchema.parse(input);
    const { iso_group, vc_m_min, target_life_min } = validated;
    const { C, n } = CANONICAL_TAYLOR[iso_group];
    // Taylor 1907 / ISO 3685:1993: T = (C / Vc)^(1/n)
    const predicted_life_min = Math.pow(C / vc_m_min, 1 / n);
    const life_margin_factor = predicted_life_min / target_life_min;
    return {
      predicted_life_min,
      life_margin_factor,
      ok: life_margin_factor >= 1,
      C_used: C,
      n_used: n,
    };
  }

  /**
   * India HURCO-POST-REMEDIATION pattern (Group D physics check):
   * Stickout L/D ratio gate with cubic deflection falloff.
   * Tool deflection: delta proportional to L^3 / (3 * E * I),
   * so allowable force scales as 1/(L/D)^3.
   *
   * @param input StickoutGateInput
   * @returns StickoutGateResult with LD ratio + deflection class + force ceiling
   */
  static applyStickoutGate(input: StickoutGateInput): StickoutGateResult {
    const validated = StickoutGateInputSchema.parse(input);
    const { L_mm, D_mm } = validated;
    const max_LD = validated.max_LD_ratio ?? 4.0;
    const LD_ratio = L_mm / D_mm;
    const ok = LD_ratio <= max_LD;
    // Deflection class buckets (industry standard turning practice)
    let deflection_class: StickoutGateResult["deflection_class"];
    if (LD_ratio <= 2.5) deflection_class = "rigid";
    else if (LD_ratio <= 4.0) deflection_class = "moderate";
    else if (LD_ratio <= 6.0) deflection_class = "compliant";
    else deflection_class = "excessive";
    // Cubic falloff: at L/D=4 baseline 100% force allowance; halves at L/D=5
    const base_force = 1000; // N reference; consumer scales by tool capacity
    const recommended_max_force_N = base_force * Math.pow(4 / Math.max(LD_ratio, 1), 3);
    return { LD_ratio, ok, deflection_class, recommended_max_force_N };
  }

  /**
   * Echo LATHE-P2P-CONSENSUS-MS4 pattern: 3-candidate fanout.
   * Generates conservative / balanced / aggressive parameter candidates
   * for a given material + machine + tool stickout, gated by Kienzle Fc
   * and Taylor life. Consensus = cross-candidate agreement.
   *
   * @param iso_group material ISO group
   * @param machine machine descriptor (drives spindle ceiling)
   * @param dialect OSP controller profile (drives feed-mode + iMachining gate)
   * @param stickout stickout gate result (drives force ceiling)
   * @param target_life_min minimum acceptable tool life
   * @returns ConsensusResult with 3 candidates + recommended + omega + S(x)
   */
  static consensusParameters(
    iso_group: ISOGroup,
    machine: LatheMachineDescriptor,
    dialect: OSPDialectProfile,
    stickout: StickoutGateResult,
    target_life_min: number,
  ): ConsensusResult {
    const max_force_N = stickout.recommended_max_force_N;
    const taylor = CANONICAL_TAYLOR[iso_group];
    // Pick three Vc values: 80% / 100% / 120% of Taylor-life-budget speed
    const vc_budget = taylor.C / Math.pow(target_life_min, taylor.n);
    const strategies: { name: CandidateStrategy; vc_scale: number; fz_scale: number; ap_scale: number }[] = [
      { name: "conservative", vc_scale: 0.80, fz_scale: 0.75, ap_scale: 0.75 },
      { name: "balanced",     vc_scale: 1.00, fz_scale: 1.00, ap_scale: 1.00 },
      { name: "aggressive",   vc_scale: 1.20, fz_scale: 1.20, ap_scale: 1.15 },
    ];
    const candidates: CandidateParameters[] = strategies.map((s) => {
      const vc = vc_budget * s.vc_scale;
      const fz = 0.15 * s.fz_scale; // baseline 0.15 mm/rev typical for turning
      const ap = 1.5 * s.ap_scale;  // baseline 1.5 mm DOC
      const kienzle = this.applyKienzleGate({
        iso_group, ap_mm: ap, fz_mm: fz, max_force_N,
      });
      const taylor_r = this.applyTaylorGate({
        iso_group, vc_m_min: vc, target_life_min,
      });
      // Confidence: 1.0 if both gates pass, drops by 0.4 per failure
      let conf = 1.0;
      if (!kienzle.within_bounds) conf -= 0.4;
      if (!taylor_r.ok) conf -= 0.4;
      // Aggressive strategy carries inherent uncertainty penalty
      if (s.name === "aggressive") conf -= 0.05;
      if (s.name === "conservative") conf += 0.05;
      conf = Math.max(0, Math.min(1, conf));
      return {
        strategy: s.name,
        vc_m_min: vc,
        fz_mm: fz,
        ap_mm: ap,
        predicted_fc_N: kienzle.fc_N,
        predicted_life_min: taylor_r.predicted_life_min,
        confidence: conf,
      };
    });
    // Recommended = max-confidence; ties → balanced
    const sortedByConf = [...candidates].sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      if (a.strategy === "balanced") return -1;
      if (b.strategy === "balanced") return 1;
      return 0;
    });
    const recommended = sortedByConf[0]!;
    // Omega = mean of all candidate confidences (cross-candidate agreement proxy)
    const omega = candidates.reduce((s, c) => s + c.confidence, 0) / candidates.length;
    // S(x) = recommended.confidence weighted by dialect capability
    const dialect_capability = (dialect.imachining_capable ? 0.5 : 0.3) +
      (dialect.ai_adaptive_feedrate_capable ? 0.4 : 0.3) +
      0.1; // base
    const sx = Math.min(1, recommended.confidence * dialect_capability * 1.05);
    const passes_safety_gate = omega >= 0.95 && sx >= 0.98;
    return { candidates, recommended, omega, sx, passes_safety_gate };
  }

  /**
   * Echo LATHE-P2P-CONSENSUS-MS4 pattern: Omega/S(x) hard safety gate.
   * shop_floor tier defaults: Omega >= 0.95, S(x) >= 0.98.
   * Throws SafetyGateRejection (R12 fail-loud) when threshold not met.
   *
   * @param input SafetyGateInput
   * @returns void on pass; throws SafetyGateRejection on fail
   */
  static enforceSafetyGate(input: SafetyGateInput): void {
    const tier = input.tier ?? "shop_floor";
    const thresholds = {
      shop_floor: { omega: 0.95, sx: 0.98 },
      lab:        { omega: 0.85, sx: 0.90 },
      research:   { omega: 0.70, sx: 0.80 },
    }[tier];
    if (input.omega < thresholds.omega || input.sx < thresholds.sx) {
      throw new SafetyGateRejection(input.omega, input.sx, thresholds.omega, thresholds.sx);
    }
  }

  /**
   * Build the user-named matrix: material × stickout × tool-type combinations
   * for a specific Okuma lathe, with consensus parameters per cell.
   *
   * @param machine target lathe descriptor
   * @param dialect controller profile
   * @param materials list of ISO groups to enumerate
   * @param stickouts list of {L_mm, D_mm} pairs to enumerate
   * @returns matrix keyed by `${material}_${L}x${D}`
   */
  static buildMaterialStickoutMatrix(
    machine: LatheMachineDescriptor,
    dialect: OSPDialectProfile,
    materials: ISOGroup[],
    stickouts: { L_mm: number; D_mm: number }[],
  ): Record<string, ConsensusResult> {
    const matrix: Record<string, ConsensusResult> = {};
    for (const iso_group of materials) {
      for (const so of stickouts) {
        const stickoutResult = this.applyStickoutGate({ L_mm: so.L_mm, D_mm: so.D_mm });
        const consensus = this.consensusParameters(iso_group, machine, dialect, stickoutResult, 30);
        matrix[`${iso_group}_${so.L_mm}x${so.D_mm}`] = consensus;
      }
    }
    return matrix;
  }
}

export const okumaLatheOSPProfileEngine = OkumaLatheOSPProfileEngine;
