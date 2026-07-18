/**
 * BarPullerCoordinationEngine — lathe bar-feeder advance verification
 *
 * Closes the iter20 P1 "bar-puller coordination" gap. Production-lathe bar
 * feeders (Iemca Boss, LNS Quick Load, FMB Turbo) advance bar stock between
 * parts; mis-coordinated feeds cause:
 *   - Bar slip (puller grip insufficient for axial cut load)
 *   - Z-axis crash (puller stroke exceeds rapid traverse window)
 *   - Short-part bar-end waste (last part attempted on insufficient stock)
 *   - Collet damage (puller engages with chuck closed → 60 kN binding)
 *
 * Engine verifies 5 axes per advance cycle (PreCut + per-part-cycle):
 *   1. Stock remaining ≥ part_length + parting_allowance + bar_end_minimum
 *   2. Puller stroke covers part_length + parting + safety clearance
 *   3. Puller grip ≥ required for axial-cut force (Sandvik §C-6 force tables)
 *   4. Chuck-open / puller-engage sequencing (mutually exclusive states)
 *   5. Z-axis clearance + traverse compatible with puller stroke
 *
 * Reference: Okuma OSP-P300L Bar Feeder Programming Guide §6.4; Mazak Quick
 *   Turn Smart Bar Puller Setup §3; Iemca Boss-338 Application Manual §C-2;
 *   LNS Quick Load Servo III Operator Manual §4; Sandvik Coromant Turning
 *   Application Guide §C-6 (axial-feed force tables).
 *
 * @version 1.0.0
 * @module BarPullerCoordinationEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export interface BarPullerInput {
  /** Bar stock OD (mm) */
  bar_stock_diameter_mm: number;
  /** Bar feeder puller stroke (mm of axial feed per cycle) */
  bar_puller_stroke_mm: number;
  /** Bar remaining in feeder (mm) */
  bar_remaining_length_mm: number;
  /** Per-part length INCLUDING parting allowance (mm) */
  part_length_mm: number;
  /** Minimum bar-end stub (mm) below which feeder ejects bar (typical 100-200mm) */
  bar_end_minimum_mm?: number;
  /** Puller grip force (N) */
  puller_grip_force_n: number;
  /** Axial cut force during bar advance (N) — from cutting-force model */
  axial_cut_force_n: number;
  /** Chuck currently open (true = ready for advance) */
  chuck_open: boolean;
  /** Z-axis max rapid traverse (mm) */
  z_rapid_max_mm: number;
  /** Safety clearance Z (mm) past bar advance end */
  safety_clearance_mm?: number;
  /** Grip safety factor (default 1.5 — recommended Sandvik §C-6) */
  grip_safety_factor?: number;
}

export type BarPullerVerdict = "verified" | "bar_change_required" | "rejected" | "unsafe";

export interface BarPullerResult {
  verdict: BarPullerVerdict;
  parts_remaining_in_bar: AtomicValue<number>;
  bar_change_required: boolean;
  /** Per-check pass/fail */
  checks: {
    stock_sufficient: { pass: boolean; required_mm: number; actual_mm: number };
    puller_stroke: { pass: boolean; required_mm: number; actual_mm: number };
    puller_grip: { pass: boolean; required_n: number; actual_n: number; safety_factor: number };
    chuck_puller_sequencing: { pass: boolean; chuck_open: boolean };
    z_clearance: { pass: boolean; required_mm: number; actual_mm: number };
  };
  warnings: string[];
  failure_reasons: string[];
  source: string;
}

const DEFAULT_BAR_END_MIN = 150;
const DEFAULT_SAFETY_CLEARANCE = 10;
const DEFAULT_GRIP_SAFETY_FACTOR = 1.5;

export class BarPullerCoordinationEngine {
  verify(input: BarPullerInput): BarPullerResult {
    if (!input || input.bar_stock_diameter_mm == null || input.bar_puller_stroke_mm == null) {
      throw new Error("BarPullerCoordinationEngine.verify: bar_stock_diameter_mm + bar_puller_stroke_mm required");
    }
    if (input.part_length_mm == null || input.puller_grip_force_n == null || input.axial_cut_force_n == null) {
      throw new Error("BarPullerCoordinationEngine.verify: part_length_mm + puller_grip_force_n + axial_cut_force_n required");
    }
    if (input.bar_stock_diameter_mm <= 0 || input.part_length_mm <= 0 || input.bar_puller_stroke_mm <= 0) {
      throw new Error("BarPullerCoordinationEngine.verify: positive bar_diameter + part_length + stroke required");
    }
    if (input.puller_grip_force_n <= 0 || input.axial_cut_force_n < 0) {
      throw new Error("BarPullerCoordinationEngine.verify: positive puller_grip_force + non-negative axial_cut_force required");
    }

    const warnings: string[] = [];
    const failures: string[] = [];
    const barEndMin = input.bar_end_minimum_mm ?? DEFAULT_BAR_END_MIN;
    const safetyClearance = input.safety_clearance_mm ?? DEFAULT_SAFETY_CLEARANCE;
    const gripSafetyFactor = input.grip_safety_factor ?? DEFAULT_GRIP_SAFETY_FACTOR;

    // ── 1. Stock sufficient (need part + bar-end minimum) ─────────────
    const stockRequired = input.part_length_mm + barEndMin;
    const stockPass = input.bar_remaining_length_mm >= stockRequired;
    const partsRemaining = Math.max(0, Math.floor((input.bar_remaining_length_mm - barEndMin) / input.part_length_mm));
    const barChange = !stockPass;
    if (!stockPass) {
      warnings.push(`Bar remaining ${input.bar_remaining_length_mm}mm < ${stockRequired}mm required (part + bar-end minimum ${barEndMin}mm) — load new bar before next cycle`);
    } else if (partsRemaining <= 2) {
      warnings.push(`Only ${partsRemaining} part(s) remaining in bar — schedule bar change soon`);
    }

    // ── 2. Puller stroke (must cover part length + safety clearance) ──
    const strokeRequired = input.part_length_mm + safetyClearance;
    const strokePass = input.bar_puller_stroke_mm >= strokeRequired;
    if (!strokePass) {
      failures.push(`Puller stroke ${input.bar_puller_stroke_mm}mm < ${strokeRequired}mm required — feeder can't advance full part length + ${safetyClearance}mm clearance (Iemca §C-2)`);
    }

    // ── 3. Grip force (required = axial_cut × safety_factor) ──────────
    const gripRequired = input.axial_cut_force_n * gripSafetyFactor;
    const gripPass = input.puller_grip_force_n >= gripRequired;
    if (!gripPass) {
      failures.push(`Puller grip ${input.puller_grip_force_n}N < ${gripRequired.toFixed(0)}N required (axial cut ${input.axial_cut_force_n}N × ${gripSafetyFactor} safety factor) — bar will slip`);
    }

    // ── 4. Chuck-puller sequencing (mutual exclusion — chuck MUST be open) ──
    const sequencingPass = input.chuck_open;
    if (!sequencingPass) {
      failures.push("Chuck CLOSED during puller advance — UNSAFE: 60+ kN collet binding will damage puller jaws + bar stock (LNS §4 — chuck-open prerequisite mandatory)");
    }

    // ── 5. Z-axis clearance ───────────────────────────────────────────
    const zRequired = input.part_length_mm + safetyClearance;
    const zPass = input.z_rapid_max_mm >= zRequired;
    if (!zPass) {
      failures.push(`Z-rapid window ${input.z_rapid_max_mm}mm < ${zRequired}mm required — Z-axis travel insufficient for part + safety`);
    }

    // ── Verdict ────────────────────────────────────────────────────────
    let verdict: BarPullerVerdict;
    if (!sequencingPass) {
      verdict = "unsafe";  // chuck-closed-during-puller-advance is catastrophic
    } else if (failures.length > 0) {
      verdict = "rejected";
    } else if (barChange) {
      verdict = "bar_change_required";
    } else {
      verdict = "verified";
    }

    return {
      verdict,
      parts_remaining_in_bar: {
        value: partsRemaining,
        unit: "parts",
        source: "⌊(remaining - bar_end_minimum) / part_length⌋",
      },
      bar_change_required: barChange,
      checks: {
        stock_sufficient: { pass: stockPass, required_mm: stockRequired, actual_mm: input.bar_remaining_length_mm },
        puller_stroke: { pass: strokePass, required_mm: strokeRequired, actual_mm: input.bar_puller_stroke_mm },
        puller_grip: {
          pass: gripPass,
          required_n: Number(gripRequired.toFixed(0)),
          actual_n: input.puller_grip_force_n,
          safety_factor: gripSafetyFactor,
        },
        chuck_puller_sequencing: { pass: sequencingPass, chuck_open: input.chuck_open },
        z_clearance: { pass: zPass, required_mm: zRequired, actual_mm: input.z_rapid_max_mm },
      },
      warnings,
      failure_reasons: failures,
      source: "BarPullerCoordinationEngine — Okuma OSP-P300L §6.4 + Mazak Quick Turn §3 + Iemca Boss-338 §C-2 + LNS Servo III §4 + Sandvik §C-6",
    };
  }
}

export const barPullerCoordinationEngine = new BarPullerCoordinationEngine();
