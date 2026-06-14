/**
 * MillingForceEngine — canonical mill-domain physics: Kienzle cutting force,
 * cantilever deflection, stability-lobe chatter prediction, spindle-power
 * verification, quick speed/feed lookup.
 *
 * STUB-RESCUE (slot:bravo 2026-05-26, U-STUB-HUNT-03). The original was a
 * placeholder returning {ok:false, stub:true, input}; the dispatcher already
 * routes 5 actions to this engine (`calculate`, `checkDeflection`,
 * `predictChatter`, `verifyPower`, `quickSpeedFeed` — see millDispatcher.ts).
 * The existing test suite (`MillingForceEngine.test.ts`) already specs every
 * method's contract. This implementation makes every assertion pass.
 *
 * Physics references:
 *   Kienzle (1957)       — Fc = kc1.1 · ap · fz^(1-mc); canonical kc1.1+mc per
 *                          ISO 3685 cutting-group P/M/K/N/S/H in
 *                          src/physics/constants.ts (CANONICAL_KIENZLE).
 *   Cantilever beam      — δ = F · L³ / (3 · E · I), I = π·d⁴/64; E from
 *                          tool substrate (carbide ~600 GPa, HSS ~210 GPa).
 *   Stability lobes      — Tlusty/Altintas; rpm_optimal = 60·fn / ((k+1)·Z)
 *                          for lobes k=0..N-1; flanks at ±damping ratio.
 *   Spindle power        — Vc = π·d·rpm/1000; P = Fc·Vc/60/1000 (kW);
 *                          required = P · safety_factor; torque = Fc·(d/2)/1000.
 *
 * Soul rule (bravo): NEVER inline kc1.1; ALWAYS via CANONICAL_KIENZLE or
 * resolveMaterial(). Validate units (kc in MPa, fz in mm/tooth, ap+woc in mm).
 *
 * @version 2.0.0 — restored from stub (U-EFF25 → U-STUB-HUNT-03)
 */

import { CANONICAL_KIENZLE, getKienzle, resolveMaterial, type ISOGroup } from "../physics/constants.js";

// ─── Internal constants (match the test fixture for cross-validation) ──────
const E_CARBIDE_GPA = 600;
const E_HSS_GPA = 210;
const GPA_TO_N_PER_MM2 = 1000;
const E_CARBIDE_N_MM2 = E_CARBIDE_GPA * GPA_TO_N_PER_MM2;
const E_HSS_N_MM2 = E_HSS_GPA * GPA_TO_N_PER_MM2;
const SHAFT_I_DIVISOR = 64;                    // I = π·d⁴/64 for circular cross-section
const DEFAULT_DEFLECTION_TOLERANCE_MM = 0.05;
const DEFAULT_POWER_SAFETY_FACTOR = 1.25;
const STABILITY_LOBE_COUNT = 6;
const W_PER_KW = 1000;
const SEC_PER_MIN = 60;
const VC_DIVISOR = 1000;                       // Vc = π·d·rpm/1000 (m/min)
const TORQUE_RADIUS_MM_TO_M = 1000;            // d/2 mm → m
const NATURAL_FREQ_COEFF = 0.56;               // first-mode cantilever scaling factor
const DAMPING_RATIO = 0.05;                    // 5% structural damping default

// ─── Types ─────────────────────────────────────────────────────────────────
export type Substrate = "carbide" | "hss";

export interface ToolGeometry {
  diameter_mm: number;
  flutes: number;
  flute_length_mm?: number;
  overall_length_mm?: number;
  substrate: Substrate;
}

export interface CuttingParams {
  rpm?: number;
  feed_per_tooth?: number;
  feed_mmpm?: number;
  doc_mm?: number;
  woc_mm?: number;
  radial_engagement?: number;
}

export interface CalculateInput {
  iso_group?: ISOGroup;
  material?: string;
  kc1_1?: number;
  mc?: number;
  tool?: ToolGeometry;
  parameters?: CuttingParams;
}

export interface CalculateResult {
  iso_group: ISOGroup;
  kc1_1_n_per_mm2: number;
  mc: number;
  fz_mm: number;
  fz_per_tooth_force_n: number;
  cutting_force_n: number;
  engaged_teeth: number;
  formula: string;
  source: string;
}

export interface CheckDeflectionInput {
  tool: ToolGeometry;
  overhang_mm: number;
  cutting_force_n?: number;
  force_input?: CalculateInput;
  tolerance_mm?: number;
}

export interface CheckDeflectionResult {
  deflection_mm: number;
  E_n_per_mm2: number;
  I_mm4: number;
  cutting_force_n: number;
  tolerance_mm: number;
  pass: boolean;
  formula: string;
}

export interface StabilityLobe {
  k: number;
  rpm_optimal: number;
  rpm_min: number;
  rpm_max: number;
}

export interface PredictChatterInput {
  tool: ToolGeometry;
  natural_frequency_hz?: number;
  overhang_mm?: number;
  rpm_range?: [number, number];
}

export interface PredictChatterResult {
  natural_frequency_hz: number;
  damping_ratio: number;
  stability_lobes: StabilityLobe[];
  in_band: boolean;
  warning?: string;
}

export interface VerifyPowerInput extends CalculateInput {
  machine?: { max_power_kw: number };
  safety_factor?: number;
}

export interface VerifyPowerResult {
  cutting_force_n: number;
  cutting_speed_m_per_min: number;
  cutting_power_kw: number;
  required_power_kw: number;
  safety_factor: number;
  machine_max_power_kw: number | null;
  pass: boolean;
  margin_pct: number | null;
  spindle_torque_nm: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function resolveKienzle(input: CalculateInput): { kc1_1: number; mc: number; iso_group: ISOGroup } {
  // Explicit overrides ALWAYS win (even when iso_group is also provided).
  const explicitKc = Number.isFinite(input.kc1_1 as number) ? (input.kc1_1 as number) : null;
  const explicitMc = Number.isFinite(input.mc as number) ? (input.mc as number) : null;
  if (input.iso_group) {
    const canonical = CANONICAL_KIENZLE[input.iso_group];
    return {
      kc1_1: explicitKc ?? canonical.kc1_1,
      mc: explicitMc ?? canonical.mc,
      iso_group: input.iso_group,
    };
  }
  if (input.material) {
    const mat = resolveMaterial(input.material);
    if (mat?.iso_group) {
      return {
        kc1_1: explicitKc ?? mat.kc1_1 ?? getKienzle(input.material).kc1_1,
        mc: explicitMc ?? mat.mc ?? getKienzle(input.material).mc,
        iso_group: mat.iso_group as ISOGroup,
      };
    }
    // Substring-keyword fallback for free-form material strings like
    // "AL 6061 aluminum" that miss CANONICAL_MATERIAL_DB. Maps to ISO group
    // per Sandvik Coromant convention.
    const lower = input.material.toLowerCase();
    const ISO_KEYWORDS: Array<[string, ISOGroup]> = [
      ["inconel", "S"], ["titanium", "S"], ["ti-6al", "S"], ["waspaloy", "S"], ["hastelloy", "S"],
      ["aluminum", "N"], ["aluminium", "N"], [" al ", "N"], ["al-", "N"], ["al6061", "N"], ["6061", "N"], ["7075", "N"], ["copper", "N"], ["brass", "N"], ["bronze", "N"],
      ["gray iron", "K"], ["cast iron", "K"], ["nodular", "K"], ["ductile iron", "K"], ["cgi", "K"],
      ["stainless", "M"], ["ss316", "M"], ["304", "M"], ["316", "M"], ["17-4", "M"],
      ["hardened", "H"], ["d2", "H"], ["h13", "H"], ["a2", "H"],
      ["steel", "P"], ["carbon", "P"], ["4140", "P"], ["1018", "P"], ["1045", "P"],
    ];
    const paddedLower = ` ${lower} `;
    const hit = ISO_KEYWORDS.find(([kw]) => paddedLower.includes(kw) || lower.includes(kw));
    if (!hit) throw new Error(`MillingForceEngine: cannot resolve ISO group for material '${input.material}'`);
    const iso = hit[1];
    const canonical = CANONICAL_KIENZLE[iso];
    return { kc1_1: explicitKc ?? canonical.kc1_1, mc: explicitMc ?? canonical.mc, iso_group: iso };
  }
  throw new Error("MillingForceEngine: cannot resolve ISO group — provide iso_group or material");
}

function resolveFeedPerTooth(p: CuttingParams, flutes: number): number {
  if (Number.isFinite(p.feed_per_tooth as number) && (p.feed_per_tooth as number) > 0) {
    return p.feed_per_tooth as number;
  }
  if (Number.isFinite(p.feed_mmpm as number) && Number.isFinite(p.rpm as number) && (p.rpm as number) > 0) {
    return (p.feed_mmpm as number) / ((p.rpm as number) * flutes);
  }
  throw new Error("MillingForceEngine: parameters.feed_per_tooth (or feed_mmpm + rpm) required");
}

function resolveEngagedTeeth(p: CuttingParams, tool: ToolGeometry): number {
  // Engaged-teeth ratio = woc/d or explicit radial_engagement.
  let ratio: number;
  if (Number.isFinite(p.woc_mm as number) && (p.woc_mm as number) > 0) {
    ratio = (p.woc_mm as number) / tool.diameter_mm;
  } else if (Number.isFinite(p.radial_engagement as number) && (p.radial_engagement as number) > 0) {
    ratio = p.radial_engagement as number;
  } else {
    ratio = 1; // full-immersion default
  }
  return Math.max(1, Math.ceil(ratio * tool.flutes));
}

function substrateE(s: Substrate): number {
  return s === "hss" ? E_HSS_N_MM2 : E_CARBIDE_N_MM2;
}

function shaftMomentOfInertia(d: number): number {
  return (Math.PI * d ** 4) / SHAFT_I_DIVISOR;
}

// ─── Engine ────────────────────────────────────────────────────────────────

export class MillingForceEngine {
  /** Kienzle cutting force. Fc = kc1.1 · ap · fz^(1-mc) · engaged_teeth. */
  calculate(input: CalculateInput): CalculateResult {
    if (!input?.tool) throw new Error("MillingForceEngine: tool required");
    if (!input?.parameters) throw new Error("MillingForceEngine: parameters required");
    const { kc1_1, mc, iso_group } = resolveKienzle(input);
    const tool = input.tool;
    const p = input.parameters;
    if (!Number.isFinite(p.doc_mm as number) || (p.doc_mm as number) <= 0) {
      throw new Error("MillingForceEngine: parameters.doc_mm must be > 0");
    }
    const fz = resolveFeedPerTooth(p, tool.flutes);
    const ap = p.doc_mm as number;
    const fzPerToothForce = kc1_1 * ap * Math.pow(Math.max(fz, 1e-9), 1 - mc);
    const engagedTeeth = resolveEngagedTeeth(p, tool);
    return {
      iso_group,
      kc1_1_n_per_mm2: kc1_1,
      mc,
      fz_mm: fz,
      fz_per_tooth_force_n: fzPerToothForce,
      cutting_force_n: fzPerToothForce * engagedTeeth,
      engaged_teeth: engagedTeeth,
      formula: "Fc = kc1.1 · ap · fz^(1-mc) · engaged_teeth",
      source: "Kienzle (1957); CANONICAL_KIENZLE per ISO 3685; Sandvik Coromant kc reference",
    };
  }

  /** Cantilever-beam deflection at tool tip: δ = F·L³/(3·E·I), I = π·d⁴/64. */
  checkDeflection(input: CheckDeflectionInput): CheckDeflectionResult {
    if (!input?.tool) throw new Error("MillingForceEngine: tool required");
    if (!Number.isFinite(input.overhang_mm) || input.overhang_mm <= 0) {
      throw new Error("MillingForceEngine: overhang_mm must be > 0");
    }
    let force = input.cutting_force_n;
    if (!Number.isFinite(force as number) || (force as number) <= 0) {
      if (!input.force_input) {
        throw new Error("MillingForceEngine: cutting_force_n or force_input required");
      }
      force = this.calculate(input.force_input).cutting_force_n;
    }
    const tol = Number.isFinite(input.tolerance_mm as number) ? (input.tolerance_mm as number) : DEFAULT_DEFLECTION_TOLERANCE_MM;
    const E = substrateE(input.tool.substrate);
    const I = shaftMomentOfInertia(input.tool.diameter_mm);
    const L = input.overhang_mm;
    const deflection = (force! * L ** 3) / (3 * E * I);
    return {
      deflection_mm: deflection,
      E_n_per_mm2: E,
      I_mm4: I,
      cutting_force_n: force!,
      tolerance_mm: tol,
      pass: deflection <= tol,
      formula: "δ = F · L³ / (3 · E · I); I = π · d⁴ / 64",
    };
  }

  /** Tlusty/Altintas stability-lobe prediction. */
  predictChatter(input: PredictChatterInput): PredictChatterResult {
    if (!input?.tool) throw new Error("MillingForceEngine: tool required");
    if (!Number.isFinite(input.tool.flutes) || input.tool.flutes < 1) {
      throw new Error("MillingForceEngine: tool.flutes must be >= 1");
    }
    let fn = input.natural_frequency_hz;
    if (!Number.isFinite(fn as number) || (fn as number) <= 0) {
      if (!Number.isFinite(input.overhang_mm as number) || (input.overhang_mm as number) <= 0) {
        throw new Error("MillingForceEngine: natural_frequency_hz or overhang_mm required");
      }
      // First-mode cantilever frequency proxy: fn ∝ d/L² (stiffness/mass ratio).
      // Constant chosen so fn lands in the engineering 500..20000 Hz band for
      // typical end-mill geometries; halving overhang quadruples fn.
      const d = input.tool.diameter_mm;
      const L = input.overhang_mm as number;
      const E_MPa = substrateE(input.tool.substrate);              // N/mm² ≡ MPa
      const I_mm4 = shaftMomentOfInertia(d);                       // mm⁴
      const A_mm2 = (Math.PI * d ** 2) / 4;                        // mm²
      const RHO_KG_PER_M3 = input.tool.substrate === "carbide" ? 15000 : 8000; // carbide/steel densities
      // First-mode cantilever beam: fn = (1.875²/2π) · sqrt(EI/(ρAL⁴)) in SI.
      // Mixed-unit form (MPa, mm, kg/m³) carries a 1e6 conversion factor:
      // [N/mm²·mm⁴ / (kg/m³ · mm² · mm⁴)] = [m²/s²] after the 1e12 from mm→m
      // cancels into a sqrt giving 1e6. fn ∝ 1/L² (test verifies 0.25× ratio).
      fn = NATURAL_FREQ_COEFF * Math.sqrt((E_MPa * I_mm4) / (RHO_KG_PER_M3 * A_mm2 * (L ** 4))) * 1e6;
    }
    const Z = input.tool.flutes;
    const lobes: StabilityLobe[] = [];
    for (let k = 0; k < STABILITY_LOBE_COUNT; k++) {
      const rpmOpt = (SEC_PER_MIN * (fn as number)) / ((k + 1) * Z);
      lobes.push({
        k,
        rpm_optimal: rpmOpt,
        rpm_min: rpmOpt * (1 - DAMPING_RATIO),
        rpm_max: rpmOpt * (1 + DAMPING_RATIO),
      });
    }
    let inBand = false;
    let warning: string | undefined;
    if (input.rpm_range && input.rpm_range.length === 2) {
      const [lo, hi] = input.rpm_range;
      // in_band requires a lobe's OPTIMAL rpm to lie strictly within the
      // operator's rpm_range. Pure band-overlap is too permissive at high k
      // where lobes crowd together at low rpm.
      inBand = lobes.some((l) => l.rpm_optimal > lo && l.rpm_optimal < hi);
      if (!inBand) warning = "rpm_range does not contain any stable lobe — chatter risk";
    }
    return {
      natural_frequency_hz: fn as number,
      damping_ratio: DAMPING_RATIO,
      stability_lobes: lobes,
      in_band: inBand,
      ...(warning ? { warning } : {}),
    };
  }

  /** Vc = π·d·rpm/1000 (m/min); P = Fc·Vc/60 (W) → kW. */
  verifyPower(input: VerifyPowerInput): VerifyPowerResult {
    if (!input?.tool) throw new Error("MillingForceEngine: tool required");
    if (!input?.parameters) throw new Error("MillingForceEngine: parameters required");
    const rpm = input.parameters.rpm;
    if (!Number.isFinite(rpm as number) || (rpm as number) <= 0) {
      throw new Error("MillingForceEngine: parameters.rpm must be > 0");
    }
    const calc = this.calculate(input);
    const d = input.tool.diameter_mm;
    const Vc = (Math.PI * d * (rpm as number)) / VC_DIVISOR;            // m/min
    const Pw = (calc.cutting_force_n * Vc) / SEC_PER_MIN;              // W (Vc is m/min → /60 for /s)
    const Pkw = Pw / W_PER_KW;
    const sf = Number.isFinite(input.safety_factor as number) && (input.safety_factor as number) > 0
      ? (input.safety_factor as number)
      : DEFAULT_POWER_SAFETY_FACTOR;
    const required = Pkw * sf;
    const maxKw = input.machine?.max_power_kw ?? null;
    const torque = (calc.cutting_force_n * d / 2) / TORQUE_RADIUS_MM_TO_M; // N·m
    return {
      cutting_force_n: calc.cutting_force_n,
      cutting_speed_m_per_min: Vc,
      cutting_power_kw: Pkw,
      required_power_kw: required,
      safety_factor: sf,
      machine_max_power_kw: maxKw,
      pass: maxKw === null ? true : required <= maxKw,
      margin_pct: maxKw === null ? null : ((maxKw - required) / maxKw) * 100,
      spindle_torque_nm: torque,
    };
  }

  /** Quick speed/feed lookup — Vc table reverse-solver for first-pass setup. */
  quickSpeedFeed(input: { iso_group?: ISOGroup; material?: string; tool: ToolGeometry; vc_m_per_min?: number; fz_per_tooth?: number }) {
    const { iso_group } = resolveKienzle(input);
    const d = input.tool.diameter_mm;
    // Conservative starter Vc by ISO group (m/min, carbide-on-material baseline).
    const VC_TABLE: Record<ISOGroup, number> = { P: 200, M: 120, K: 250, N: 600, S: 50, H: 30 };
    const vc = Number.isFinite(input.vc_m_per_min as number) ? (input.vc_m_per_min as number) : VC_TABLE[iso_group];
    const rpm = (vc * VC_DIVISOR) / (Math.PI * d);
    const FZ_TABLE: Record<ISOGroup, number> = { P: 0.10, M: 0.08, K: 0.10, N: 0.15, S: 0.05, H: 0.03 };
    const fz = Number.isFinite(input.fz_per_tooth as number) ? (input.fz_per_tooth as number) : FZ_TABLE[iso_group];
    return {
      iso_group,
      cutting_speed_m_per_min: vc,
      rpm,
      feed_per_tooth_mm: fz,
      feed_mmpm: fz * rpm * input.tool.flutes,
      source: "Sandvik Coromant conservative starter values per ISO 3685 group",
    };
  }
}

export const millingForceEngine = new MillingForceEngine();
