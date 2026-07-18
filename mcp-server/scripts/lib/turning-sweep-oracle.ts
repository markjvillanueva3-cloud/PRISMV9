/**
 * turning-sweep-oracle.ts (slot:oscar)
 * =====================================================================
 * INDEPENDENT physics cross-check oracle for the LATHE WIZARD combinatorial sweep
 * (lathe-wizard-combinatorial-sweep.ts over LatheSpeedFeedCalculatorFacadeEngine).
 *
 * CLONE-DON'T-FORK of scripts/lib/sfc-sweep-oracle.mjs (oscar's MILLING oracle, validated across
 * 800k+3M combos with 0 silent-wrong). The lathe harness's existing invariants prove a result is not
 * OBVIOUSLY broken (finite/positive/monotone) -- necessary but NOT sufficient for "numerically correct":
 * a result can be finite-and-positive yet SILENTLY WRONG (a unit factor dropped, the efficiency term
 * omitted, power decoupled from force x speed). This module re-derives the load-bearing TURNING
 * identities from the engine's OWN outputs WITHOUT calling the engine, so a formula/unit bug surfaces
 * as a divergence rather than passing silently.
 *
 * TURNING adaptations vs the milling oracle (M5 verdict, formulas verified against
 * LatheSpeedFeedCalculatorFacadeEngine.ts):
 *  - Feed is per-REV (mm/rev), single-point tool -> NO fz*z, NO chip-thinning-direction check (dropped).
 *  - Power carries a SPINDLE-EFFICIENCY term: Pc = Fc*Vc/(60000*eta), eta=0.85 (facade :538). Omitting
 *    eta false-flags ~15% on EVERY cell -- the eta divisor is mandatory here (milling used raw Fc*Vc/60000).
 *  - Force uses the turning Kienzle Fc = kc1_1*ap*f^(1-mc) with kc1_1/mc read from result.material_properties.
 *  - Torque + MRR identities are BLOCKED until the facade emits predicted_torque_Nm / predicted_mrr_cm3_min
 *    (§2 #4, whiskey-owned). Per R12 they are LOGGED as field-absent, never silently skipped.
 *  - Cross-cell HSS<carbide + ISO-speed-ordering: REUSE makeCrossCellOracle from the milling oracle verbatim
 *    via its documented adapter hooks (clone-don't-fork).
 *
 * pi and the 1000/60000/2000 unit factors are pure mathematics, NOT material physics -- not imported from
 * constants.ts by design (nothing material-specific to centralise). eta=0.85 is the facade's own spindle
 * efficiency (a sweep-oracle reference constant, never fed into a production cutting calculation).
 */

// Reuse the milling oracle's cross-cell machinery verbatim (clone-don't-fork).
export { makeCrossCellOracle, ISO_SPEED_RANK, MATERIAL_ISO } from "../../../scripts/lib/sfc-sweep-oracle.mjs";

/** Turning spindle efficiency used by the facade power model (LatheSpeedFeedCalculatorFacadeEngine :538). */
export const TURNING_SPINDLE_EFFICIENCY = 0.85;

// --- Shapes (structural subset of the sweep cell + LatheSpeedFeedResult) ----
export interface TurningCellParams {
  /** Workpiece / cut diameter [mm] -- the rpm<->Vc identity needs it. */
  diameter_mm?: number;
  diameter?: number;
  material?: string;
  tool_material?: string;
  operation?: string;
  /** Machine rpm bounds -- enable clamp-aware forgiveness of the G50/CSS-capped rpm<->Vc identity. */
  machine_max_rpm?: number;
  machine_min_rpm?: number;
}
export interface TurningResultView {
  recommendation?: { cutting_speed_m_min?: number; rpm?: number; feed_mm_rev?: number; depth_of_cut_mm?: number };
  predicted_force_N?: number;
  predicted_power_kw?: number;
  predicted_tool_life_min?: number;
  predicted_torque_Nm?: number;      // absent today -> torque identity blocked
  predicted_mrr_cm3_min?: number;    // absent today -> MRR identity blocked
  material_properties?: { kc1_1?: number; mc?: number; taylor_C?: number; taylor_n?: number };
}
export interface OracleViolation { kind: string; expected?: number; actual?: number; relPct?: number; absDiff?: number; note?: string }

function diaOf(p: TurningCellParams): number | null {
  const d = p.diameter_mm ?? p.diameter;
  return typeof d === "number" && d > 0 ? d : null;
}

/**
 * RPM identity (turning): engine rpm must equal 1000*Vc/(pi*D). PROMOTED from the harness's P2-advisory
 * to a hard check with oscar's rounding-floor + clamp-aware forgiveness. Vc in m/min, D in mm -> rev/min.
 * tolPct: relative band for a genuine formula/unit divergence.
 * vcDisplayQuantum: the Vc rounding quantum (m/min); the rpm derives from the UNROUNDED Vc, so a divergence
 *   below the (quantum/2 m/min -> rpm) floor plus +/-0.5 rpm is display rounding, not a math bug.
 */
export function checkTurningRpm(params: TurningCellParams, v: TurningResultView, tolPct = 0.02, vcDisplayQuantum = 1): OracleViolation | null {
  const D = diaOf(params);
  const Vc = v.recommendation?.cutting_speed_m_min;
  const rpm = v.recommendation?.rpm;
  if (D == null || !(typeof Vc === "number" && Vc > 0) || !(typeof rpm === "number" && rpm > 0)) return null;
  const expected = (Vc * 1000) / (Math.PI * D);
  // Clamp-aware forgiveness: at a machine rpm cap (G50/CSS max, or min-rpm floor) the reported rpm
  // legitimately diverges from the Vc/D-ideal -- forgive ONLY when rpm sits at the cap and the ideal
  // is beyond it (never a blanket forgive). Requires the machine bounds threaded through params.
  if (params.machine_max_rpm && Math.abs(rpm - params.machine_max_rpm) <= 1 && expected >= params.machine_max_rpm) return null;
  if (params.machine_min_rpm && Math.abs(rpm - params.machine_min_rpm) <= 1 && expected <= params.machine_min_rpm) return null;
  const absDiff = Math.abs(rpm - expected);
  const rel = absDiff / expected;
  const absFloor = ((vcDisplayQuantum / 2) * 1000) / (Math.PI * D) + 0.5;
  return rel > tolPct && absDiff > absFloor
    ? { kind: "turning_rpm_inconsistent", expected, actual: rpm, relPct: rel, absDiff }
    : null;
}

/**
 * POWER identity (turning): predicted_power_kw must equal Fc*Vc/(60000*eta) with eta=0.85 (spindle
 * efficiency). Uses the engine's OWN predicted_force_N + cutting_speed_m_min, so a dropped 60000 factor,
 * a missing eta divisor, or power computed from a different force surfaces as a divergence.
 */
export function checkTurningPower(_params: TurningCellParams, v: TurningResultView, tolPct = 0.03, eta = TURNING_SPINDLE_EFFICIENCY): OracleViolation | null {
  const Fc = v.predicted_force_N;
  const Vc = v.recommendation?.cutting_speed_m_min;
  const P = v.predicted_power_kw;
  if (!(typeof Fc === "number" && Fc > 0) || !(typeof Vc === "number" && Vc > 0) || !(typeof P === "number" && P > 0)) return null;
  const expected = (Fc * Vc) / (60000 * eta);
  const absDiff = Math.abs(P - expected);
  const rel = absDiff / expected;
  const absFloor = (0.5 * Vc) / (60000 * eta) + 0.005; // Fc reported to +/-0.5 N -> power rounding floor
  return rel > tolPct && absDiff > absFloor
    ? { kind: "turning_power_inconsistent", expected, actual: P, relPct: rel, absDiff, note: `eta=${eta}` }
    : null;
}

/**
 * FORCE identity (turning Kienzle): predicted_force_N must equal kc1_1*ap*f^(1-mc), with kc1_1/mc read
 * from result.material_properties, ap = recommended depth_of_cut_mm, f = recommended feed_mm_rev (IPR).
 * Single-point turning: chip thickness ~ f, no fz*z. A wrong kc, a missing (1-mc) exponent, or force
 * decoupled from the material coefficients surfaces here. Skipped (null) when kc1_1/mc are not exposed.
 */
export function checkTurningForce(_params: TurningCellParams, v: TurningResultView, tolPct = 0.05): OracleViolation | null {
  const kc = v.material_properties?.kc1_1;
  const mc = v.material_properties?.mc;
  const ap = v.recommendation?.depth_of_cut_mm;
  const f = v.recommendation?.feed_mm_rev;
  const Fc = v.predicted_force_N;
  if (!(typeof kc === "number" && kc > 0) || typeof mc !== "number") return null; // coefficients not exposed
  if (!(typeof ap === "number" && ap > 0) || !(typeof f === "number" && f > 0) || !(typeof Fc === "number" && Fc > 0)) return null;
  const expected = kc * ap * Math.pow(f, 1 - mc);
  const absDiff = Math.abs(Fc - expected);
  const rel = absDiff / expected;
  return rel > tolPct && absDiff > 1 // 1 N absolute floor
    ? { kind: "turning_force_inconsistent", expected, actual: Fc, relPct: rel, absDiff }
    : null;
}

/**
 * TOOL-LIFE identity (turning Taylor): predicted_tool_life_min must equal (C/Vc)^(1/n) with C/n =
 * taylor_C/taylor_n from result.material_properties. The facade uses PURE Taylor (verified :496) and
 * exposes C/n (:753), so a wrong-C/n / wrong-exponent life surfaces here. Rounding forgiveness matches
 * the facade's own display rule (:502): life>=1 rounds to whole minutes (+/-0.5 floor), life<1 keeps 3
 * significant figures (~0.5% floor) -- the sub-1-min fix that stopped high-Vc lives collapsing to 0.
 * Skipped (null) when C/n are not exposed.
 */
export function checkTurningToolLife(_params: TurningCellParams, v: TurningResultView, tolPct = 0.03): OracleViolation | null {
  const C = v.material_properties?.taylor_C;
  const n = v.material_properties?.taylor_n;
  const Vc = v.recommendation?.cutting_speed_m_min;
  const T = v.predicted_tool_life_min;
  if (!(typeof C === "number" && C > 0) || !(typeof n === "number" && n > 0)) return null;
  if (!(typeof Vc === "number" && Vc > 0) || !(typeof T === "number" && T > 0)) return null;
  const expected = Math.pow(C / Vc, 1 / n);
  const absDiff = Math.abs(T - expected);
  const rel = absDiff / expected;
  const absFloor = expected >= 1 ? 0.5 : Math.max(expected * 0.005, 1e-6);
  return rel > tolPct && absDiff > absFloor
    ? { kind: "turning_tool_life_inconsistent", expected, actual: T, relPct: rel, absDiff }
    : null;
}

/**
 * TORQUE + MRR identities are field-blocked until the facade emits predicted_torque_Nm /
 * predicted_mrr_cm3_min (§2 #4). Per R12 (fail loud, never silently skip a planned check), this returns
 * an ADVISORY marker naming the missing field -- the driver logs it so coverage gaps are visible, not hidden.
 */
export function blockedTurningIdentities(v: TurningResultView): OracleViolation[] {
  const out: OracleViolation[] = [];
  if (v.predicted_torque_Nm == null) out.push({ kind: "turning_torque_field_absent", note: "predicted_torque_Nm not emitted (facade §2 #4) -- torque identity Fc*D/2000 NOT VERIFIED" });
  if (v.predicted_mrr_cm3_min == null) out.push({ kind: "turning_mrr_field_absent", note: "predicted_mrr_cm3_min not emitted (facade §2 #4) -- MRR identity ap*f*Vc NOT VERIFIED" });
  return out;
}

/**
 * Run all TURNING per-cell identity checks; returns violations (empty = clean). Field-absent advisories
 * for torque/MRR are returned SEPARATELY via blockedTurningIdentities so a driver can count coverage gaps
 * without treating them as failures.
 */
export function turningPerCellOracle(params: TurningCellParams, v: TurningResultView): OracleViolation[] {
  const out: OracleViolation[] = [];
  const r = checkTurningRpm(params, v); if (r) out.push(r);
  const p = checkTurningPower(params, v); if (p) out.push(p);
  const f = checkTurningForce(params, v); if (f) out.push(f);
  const l = checkTurningToolLife(params, v); if (l) out.push(l);
  return out;
}
