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

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type HeatTreatRegime =
  | "annealed" | "normalized" | "quenched_tempered" | "through_hardened"
  | "precip_hardened" | "nitrided" | "case_hardened";

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

const REGIME_MODIFIERS: Record<HeatTreatRegime, number> = {
  annealed: 1.00,
  normalized: 0.85,
  quenched_tempered: 0.55,
  through_hardened: 0.35,
  precip_hardened: 0.45,
  nitrided: 0.30,
  case_hardened: 0.40,
};

const REGIME_EXPECTED_HARDNESS: Record<HeatTreatRegime, { min_hrc?: number; max_hrc?: number; min_hrb?: number; max_hrb?: number }> = {
  annealed:         { max_hrb: 90 },
  normalized:       { max_hrb: 100 },
  quenched_tempered:{ min_hrc: 28, max_hrc: 45 },
  through_hardened: { min_hrc: 50, max_hrc: 65 },
  precip_hardened:  { min_hrc: 38, max_hrc: 48 },
  nitrided:         { min_hrc: 55, max_hrc: 70 },
  case_hardened:    { min_hrc: 58, max_hrc: 64 },
};

export class HeatTreatmentAwareSpeedFeedEngine {
  adjust(input: HeatTreatSFInput): HeatTreatSFResult {
    if (!input || !input.material || !input.heat_treat_regime) {
      throw new Error("HeatTreatmentAwareSpeedFeedEngine.adjust: material + heat_treat_regime required");
    }
    if (input.baseline_sfm <= 0 || input.baseline_chip_load_mm_tooth <= 0 || input.baseline_tool_life_min <= 0) {
      throw new Error("HeatTreatmentAwareSpeedFeedEngine.adjust: positive baseline_sfm + chip_load + tool_life required");
    }
    const modifier = REGIME_MODIFIERS[input.heat_treat_regime];
    if (modifier === undefined) {
      throw new Error(`HeatTreatmentAwareSpeedFeedEngine.adjust: unknown regime ${input.heat_treat_regime}`);
    }

    const warnings: string[] = [];
    const taylor_n = input.taylor_n ?? 0.25;

    // ── Hardness sanity check ─────────────────────────────────────────
    let hardnessOK = true;
    if (input.hardness !== undefined && input.hardness_scale) {
      const expected = REGIME_EXPECTED_HARDNESS[input.heat_treat_regime];
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
