/**
 * HeatTreatmentAwareSpeedFeedEngine — material regime modifier
 *
 * Given a baseline speed/feed envelope (from SpeedFeedOrchestrator) and the
 * stock's heat-treatment state (annealed / normalized / quenched-tempered /
 * through-hardened / precipitation-hardened / nitrided / case-hardened),
 * applies the Machinery's Handbook + Sandvik §C heat-treat modifiers:
 *
 *   SFM × modifier_per_treat
 *   chip_load × modifier_per_treat
 *   tool_life × modifier^(-1/n_taylor)   (extension of Taylor equation)
 *
 * Modifier table (vs. annealed baseline of 1.0):
 *   annealed         → 1.00   (baseline)
 *   normalized       → 0.85   (slightly harder, mild reduction)
 *   quenched_tempered → 0.55  (typical Rc 30-40)
 *   through_hardened  → 0.35  (Rc 55+ — slow + chip-thin)
 *   precip_hardened   → 0.45  (17-4 H900, Inco 718 aged)
 *   nitrided          → 0.30  (case Hv 700+, very abrasive)
 *   case_hardened     → 0.40  (carburized + quenched)
 *
 * Reference: Machinery's Handbook 31st ed §6 (heat-treat machining factors);
 *   Sandvik Coromant Application Guide §C-2 (hardened-material turning);
 *   ASM Handbook Vol 16 §6 (hardened machining); Kennametal Hard-Turn app guide.
 *
 * @version 1.0.0
 * @module HeatTreatmentAwareSpeedFeedEngine
 */

import { CANONICAL_HEAT_TREAT_REGIME, type HeatTreatRegime } from "../physics/constants.js";

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

// HeatTreatRegime + the regime modifier / expected-hardness tables are canonical in
// physics/constants.ts (CANONICAL_HEAT_TREAT_REGIME, U-SFC-HEATTREAT-REGIME). Re-exported
// here for back-compat with existing importers; the values are NEVER re-inlined.
export type { HeatTreatRegime };

export interface HeatTreatSFInput {
  /** Material designation (informational — modifier picks from regime) */
  material: string;
  heat_treat_regime: HeatTreatRegime;
  /** Hardness (HRC or HRB) — used for warning when off-table */
  hardness?: number;
  hardness_scale?: "HRB" | "HRC";
  /** Baseline SFM (from SpeedFeedOrchestrator) */
  baseline_sfm: number;
  /** Baseline chip-load mm/tooth */
  baseline_chip_load_mm_tooth: number;
  /** Baseline tool life (min) — Taylor predicted */
  baseline_tool_life_min: number;
  /** Taylor exponent n (default 0.25 for carbide-on-steel) */
  taylor_n?: number;
}

export interface HeatTreatSFResult {
  material: string;
  heat_treat_regime: HeatTreatRegime;
  modifier: number;
  adjusted_sfm: AtomicValue;
  adjusted_chip_load_mm_tooth: AtomicValue;
  adjusted_tool_life_min: AtomicValue;
  hardness_check_passed: boolean;
  warnings: string[];
  source: string;
}

// Regime modifier + expected-hardness tables read directly from the canonical
// CANONICAL_HEAT_TREAT_REGIME (physics/constants.ts) -- never re-inlined here.

export class HeatTreatmentAwareSpeedFeedEngine {
  adjust(input: HeatTreatSFInput): HeatTreatSFResult {
    if (!input || !input.material || !input.heat_treat_regime) {
      throw new Error("HeatTreatmentAwareSpeedFeedEngine.adjust: material + heat_treat_regime required");
    }
    // Reject NaN / Infinity / 0 / negative -- `x <= 0` alone lets NaN through
    // (NaN <= 0 is false) and silently produces NaN speed/feed output (R12 fail-loud).
    const isPosFinite = (x: number): boolean => Number.isFinite(x) && x > 0;
    if (
      !isPosFinite(input.baseline_sfm) ||
      !isPosFinite(input.baseline_chip_load_mm_tooth) ||
      !isPosFinite(input.baseline_tool_life_min)
    ) {
      throw new Error("HeatTreatmentAwareSpeedFeedEngine.adjust: positive baseline_sfm + chip_load + tool_life required");
    }
    const spec = CANONICAL_HEAT_TREAT_REGIME[input.heat_treat_regime];
    if (!spec) {
      throw new Error(`HeatTreatmentAwareSpeedFeedEngine.adjust: unknown regime ${input.heat_treat_regime}`);
    }
    const modifier = spec.modifier;

    const warnings: string[] = [];
    const taylor_n = input.taylor_n ?? 0.25;

    // ── Hardness sanity check ─────────────────────────────────────────
    let hardnessOK = true;
    if (input.hardness !== undefined && input.hardness_scale) {
      const expected = spec.expected;
      if (input.hardness_scale === "HRC") {
        if (expected.min_hrc !== undefined && input.hardness < expected.min_hrc) {
          hardnessOK = false;
          warnings.push(`Hardness ${input.hardness} HRC below regime ${input.heat_treat_regime} min ${expected.min_hrc} — verify heat-treat state`);
        }
        if (expected.max_hrc !== undefined && input.hardness > expected.max_hrc) {
          hardnessOK = false;
          warnings.push(`Hardness ${input.hardness} HRC above regime ${input.heat_treat_regime} max ${expected.max_hrc} — verify heat-treat state`);
        }
      } else {
        if (expected.max_hrb !== undefined && input.hardness > expected.max_hrb) {
          hardnessOK = false;
          warnings.push(`Hardness ${input.hardness} HRB above regime ${input.heat_treat_regime} max ${expected.max_hrb} — verify heat-treat state`);
        }
      }
    } else {
      warnings.push("No hardness reading provided — modifier applied blind; recommend XRF + Rockwell verification");
    }

    // ── Apply modifier ────────────────────────────────────────────────
    const adjustedSfm = input.baseline_sfm * modifier;
    const adjustedChip = input.baseline_chip_load_mm_tooth * modifier;
    // Tool life: Taylor extension — V × T^n = C → T scales as (Vbase/V)^(1/n)
    // If V scales by `modifier`, T scales by `modifier^(-1/n)`
    const lifeMultiplier = Math.pow(modifier, -1 / Math.max(taylor_n, 1e-6));
    const adjustedLife = input.baseline_tool_life_min * lifeMultiplier;

    if (modifier <= 0.40) {
      warnings.push(`Heavy modifier ${modifier.toFixed(2)} — verify rigidity + coolant + carbide grade rated for hardened machining`);
    }

    return {
      material: input.material,
      heat_treat_regime: input.heat_treat_regime,
      modifier,
      adjusted_sfm: {
        value: Number(adjustedSfm.toFixed(1)),
        unit: "SFM",
        source: `baseline × ${modifier} (Machinery's Handbook §6)`,
      },
      adjusted_chip_load_mm_tooth: {
        value: Number(adjustedChip.toFixed(4)),
        unit: "mm/tooth",
        source: `baseline × ${modifier} (Sandvik §C-2)`,
      },
      adjusted_tool_life_min: {
        value: Number(adjustedLife.toFixed(1)),
        unit: "min",
        source: `baseline × modifier^(-1/n) (Taylor extension, n=${taylor_n})`,
      },
      hardness_check_passed: hardnessOK,
      warnings,
      source: "HeatTreatmentAwareSpeedFeedEngine — Machinery's Handbook §6 + Sandvik §C-2 + ASM Vol 16 §6 + Kennametal Hard-Turn",
    };
  }
}

export const heatTreatmentAwareSpeedFeedEngine = new HeatTreatmentAwareSpeedFeedEngine();
