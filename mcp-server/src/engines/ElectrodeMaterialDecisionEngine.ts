/**
 * ElectrodeMaterialDecisionEngine — ARC-MS6 / muS-C21
 *
 * Sinker-EDM electrode material decision: workpiece material + process
 * context → recommended electrode material (graphite_fine / graphite_std /
 * copper / copper_tungsten / tellurium_copper) with confidence + ranked
 * alternatives + per-rule rationale.
 *
 * This replaces the 3-branch ternary string `matRec` inside
 * ElectrodeDesignEngine with a real scoring model over 5 electrode
 * materials × 7 workpiece classes (tool_steel / stainless / carbide /
 * aluminum / copper_alloy / titanium / inconel), factoring in:
 *
 *   - wear ratio (lower = higher score)
 *   - workpiece-class compatibility (e.g. CuW wins on carbide; graphite
 *     loses on copper-on-copper)
 *   - feature geometry (sharp corners → copper/CuW; deep ribs → CuW)
 *   - surface-finish target (Ra < 0.4 µm → copper/CuW)
 *   - workpiece hardness (HRC > 55 favours graphite_fine + CuW)
 *   - num_cavities amortisation (>5 → low-wear CuW)
 *   - cost priority (low_cost / balanced / performance)
 *
 * Output is a `recommended` choice + ranked `alternatives` + a normalized
 * `workpiece_class` so callers can audit the decision.  Pure, deterministic.
 *
 * References:
 *   - Klocke, EDM (Manufacturing Processes 3), ch. 6 (electrode-material
 *     selection guidance)
 *   - GF Agie Charmilles sinker-EDM material selection guide
 *   - POCO Graphite EDM grade selection notes
 *   - Wear-ratio base values mirror the `WEAR_RATIO` table in
 *     `ElectrodeDesignEngine.ts` (extended with sensible values for the
 *     three additional workpiece classes — copper_alloy / titanium /
 *     inconel — that the original 4-column table did not cover).
 */

import { z } from "zod";
import type { ElectrodeMaterial } from "./ElectrodeDesignEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type WorkpieceClass =
  | "tool_steel"
  | "stainless"
  | "carbide"
  | "aluminum"
  | "copper_alloy"
  | "titanium"
  | "inconel";

export type CostPriority = "low_cost" | "balanced" | "performance";

export interface MaterialRecommendation {
  material: ElectrodeMaterial;
  /** 1 = best, 2 = second best, ... */
  rank: number;
  /** Raw additive score (higher = better). */
  score: number;
  /** Per-rule reasons that contributed to (or hurt) this material's score. */
  rationale: string[];
  /** Wear ratio for this electrode/workpiece pair (%). */
  estimated_wear_ratio_pct: number;
}

export interface ElectrodeMaterialDecisionResult {
  /** Normalized workpiece class detected from the input string. */
  workpiece_class: WorkpieceClass;
  /** Top-ranked recommendation. */
  recommended: MaterialRecommendation;
  /** Ranks 2..N (4 entries). */
  alternatives: MaterialRecommendation[];
  /**
   * Margin-based confidence in [0,1]: (top − second) / (top − bottom).
   * 1.0 = dominant winner, 0.0 = top tied with second.
   */
  confidence: number;
  /** Advisory notes (defaults applied, edge cases flagged). */
  notes: string[];
}

// ============================================================================
// CONSTANTS — scoring tables (economic / tribal, not physics)
// ============================================================================

/**
 * Wear ratio (%) by [electrode_material][workpiece_class]. Lower is better.
 * The first four workpiece columns mirror the table in ElectrodeDesignEngine
 * (steel / stainless / carbide / aluminum); copper_alloy / titanium /
 * inconel are extended from GF Agie + Klocke selection notes.
 */
const WEAR_RATIO: Record<ElectrodeMaterial, Record<WorkpieceClass, number>> = {
  graphite_fine: {
    tool_steel: 15,
    stainless: 18,
    carbide: 25,
    aluminum: 8,
    copper_alloy: 22,
    titanium: 20,
    inconel: 22,
  },
  graphite_std: {
    tool_steel: 25,
    stainless: 30,
    carbide: 40,
    aluminum: 12,
    copper_alloy: 35,
    titanium: 32,
    inconel: 35,
  },
  copper: {
    tool_steel: 35,
    stainless: 40,
    carbide: 50,
    aluminum: 5,
    copper_alloy: 60,
    titanium: 45,
    inconel: 50,
  },
  copper_tungsten: {
    tool_steel: 8,
    stainless: 12,
    carbide: 15,
    aluminum: 10,
    copper_alloy: 18,
    titanium: 15,
    inconel: 15,
  },
  tellurium_copper: {
    tool_steel: 30,
    stainless: 35,
    carbide: 45,
    aluminum: 4,
    copper_alloy: 55,
    titanium: 40,
    inconel: 45,
  },
};

/** Score base before wear deduction (so a 0-wear material scores 50). */
const WEAR_BASE_SCORE = 50;

const ALL_MATERIALS: ElectrodeMaterial[] = [
  "graphite_fine",
  "graphite_std",
  "copper",
  "copper_tungsten",
  "tellurium_copper",
];

/** Workpiece-class affinity bonuses (±). */
const WORKPIECE_BONUS: Record<
  WorkpieceClass,
  Partial<Record<ElectrodeMaterial, number>>
> = {
  tool_steel: { graphite_fine: 15, copper_tungsten: 5 },
  stainless: { graphite_fine: 5, copper_tungsten: 5 },
  carbide: {
    copper_tungsten: 30,
    copper: 10,
    graphite_fine: -5,
    graphite_std: -15,
    tellurium_copper: 5,
  },
  aluminum: { graphite_fine: 5, copper: 10, tellurium_copper: 10 },
  copper_alloy: {
    graphite_fine: 15,
    graphite_std: 10,
    copper: -25,
    tellurium_copper: -15,
  },
  titanium: { graphite_fine: 10, copper_tungsten: 5 },
  inconel: { graphite_fine: 10, copper_tungsten: 10 },
};

// ============================================================================
// SCHEMA
// ============================================================================

const finiteNumber = z
  .number()
  .refine(Number.isFinite, { message: "must be a finite number" });

const electrodeMaterialDecisionInputSchema = z
  .object({
    /** Workpiece material name (free text — normalized internally). */
    workpiece_material: z.string().min(1),
    /** Workpiece hardness (HRC). Default 55. */
    workpiece_hardness_HRC: finiteNumber.min(0).max(80).optional(),
    /** Target surface finish (µm Ra). Default 1.6. */
    surface_finish_target_Ra_um: finiteNumber.positive().max(100).optional(),
    /** Cavity depth (mm) — used with width for aspect ratio. */
    cavity_depth_mm: finiteNumber.positive().max(1000).optional(),
    /** Cavity width (mm). */
    cavity_width_mm: finiteNumber.positive().max(1000).optional(),
    /** Number of cavities in the job. Default 1. */
    num_cavities: z.number().int().min(1).max(1000).optional(),
    /** Tightest tolerance (mm); informational. */
    tolerance_mm: finiteNumber.positive().max(10).optional(),
    /** Feature flag — sharp internal corners favour copper / CuW. */
    has_sharp_corners: z.boolean().optional(),
    /** Feature flag — deep ribs favour CuW (low wear holds shape). */
    has_deep_ribs: z.boolean().optional(),
    /** Cost vs performance dial. Default "balanced". */
    cost_priority: z.enum(["low_cost", "balanced", "performance"]).optional(),
  })
  .strict();

export type ElectrodeMaterialDecisionInput = z.infer<
  typeof electrodeMaterialDecisionInputSchema
>;

// ============================================================================
// ENGINE
// ============================================================================

/** Decide the best electrode material for a sinker-EDM job. */
export class ElectrodeMaterialDecisionEngine {
  /**
   * Score all 5 electrode materials and return ranked recommendations.
   *
   * @param rawInput Workpiece + process context.
   * @returns Ranked recommendations with rationale and confidence.
   * @throws Error (engine-named) on invalid input.
   */
  decide(rawInput: unknown): ElectrodeMaterialDecisionResult {
    const parsed = electrodeMaterialDecisionInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
      throw new Error(
        `ElectrodeMaterialDecisionEngine: invalid input — ${issues}`,
      );
    }
    const input = parsed.data;

    const hrc = input.workpiece_hardness_HRC ?? 55;
    const ra = input.surface_finish_target_Ra_um ?? 1.6;
    const cavities = input.num_cavities ?? 1;
    const costPriority: CostPriority = input.cost_priority ?? "balanced";
    const sharpCorners = input.has_sharp_corners ?? false;
    const deepRibs = input.has_deep_ribs ?? false;

    const notes: string[] = [];
    if (input.workpiece_hardness_HRC === undefined)
      notes.push("HRC defaulted to 55 (typical tool-steel hardness).");
    if (input.surface_finish_target_Ra_um === undefined)
      notes.push("Ra target defaulted to 1.6 µm (standard semi-finish).");
    if (input.cost_priority === undefined)
      notes.push("cost_priority defaulted to balanced.");

    const workpiece_class = this._classifyWorkpiece(input.workpiece_material);
    if (workpiece_class === "tool_steel" && !/steel/i.test(input.workpiece_material))
      notes.push(
        `workpiece_material "${input.workpiece_material}" did not match any known class — defaulted to tool_steel.`,
      );

    // Aspect ratio for deep-feature scoring (only if both dims supplied).
    const aspect =
      input.cavity_depth_mm !== undefined && input.cavity_width_mm !== undefined
        ? input.cavity_depth_mm / input.cavity_width_mm
        : null;

    const scored: MaterialRecommendation[] = ALL_MATERIALS.map((mat) => {
      const rationale: string[] = [];
      const wear = WEAR_RATIO[mat][workpiece_class];
      let score = WEAR_BASE_SCORE - wear;
      rationale.push(
        `wear ratio ${wear}% on ${workpiece_class} → base ${score} (lower wear = higher score)`,
      );

      const wpBonus = WORKPIECE_BONUS[workpiece_class][mat] ?? 0;
      if (wpBonus !== 0) {
        score += wpBonus;
        rationale.push(
          `${workpiece_class} affinity ${wpBonus >= 0 ? "+" : ""}${wpBonus}`,
        );
      }

      if (hrc > 55 && (mat === "graphite_fine" || mat === "copper_tungsten")) {
        score += 5;
        rationale.push(`HRC ${hrc} > 55 → +5 (hard workpiece favours ${mat})`);
      }

      if (ra < 0.4) {
        if (mat === "copper") {
          score += 15;
          rationale.push(
            `Ra target ${ra} µm < 0.4 → +15 (copper gives the finest surface)`,
          );
        } else if (mat === "copper_tungsten") {
          score += 10;
          rationale.push(`Ra target ${ra} µm < 0.4 → +10 (CuW fine finish)`);
        } else if (mat === "graphite_fine") {
          score -= 5;
          rationale.push(
            `Ra target ${ra} µm < 0.4 → -5 (graphite has coarser micro-pitting at very fine finishes)`,
          );
        }
      } else if (ra > 6.3) {
        if (mat === "graphite_std") {
          score += 5;
          rationale.push(
            `Ra target ${ra} µm > 6.3 → +5 (cheap roughing-only material is fine)`,
          );
        }
      }

      if (sharpCorners) {
        if (mat === "copper") {
          score += 10;
          rationale.push("Sharp corners → +10 (copper holds edge geometry)");
        } else if (mat === "copper_tungsten") {
          score += 15;
          rationale.push("Sharp corners → +15 (CuW holds edge geometry best)");
        }
      }

      if (deepRibs && mat === "copper_tungsten") {
        score += 20;
        rationale.push(
          "Deep ribs → +20 (CuW lowest wear keeps rib width constant)",
        );
      }

      if (aspect !== null && aspect > 3) {
        if (mat === "copper_tungsten") {
          score += 10;
          rationale.push(
            `Cavity aspect ${aspect.toFixed(1)} > 3 → +10 (CuW for deep narrow)`,
          );
        } else if (mat === "graphite_fine") {
          score += 5;
          rationale.push(
            `Cavity aspect ${aspect.toFixed(1)} > 3 → +5 (graphite_fine flushes well)`,
          );
        }
      }

      if (cavities > 5) {
        if (mat === "copper_tungsten") {
          score += 10;
          rationale.push(
            `${cavities} cavities > 5 → +10 (low CuW wear amortises across the run)`,
          );
        } else if (mat === "graphite_std") {
          score -= 5;
          rationale.push(
            `${cavities} cavities > 5 → -5 (graphite_std wears faster across many cavities)`,
          );
        }
      }

      if (costPriority === "low_cost") {
        if (mat === "graphite_std") {
          score += 20;
          rationale.push("cost_priority=low_cost → +20 (graphite_std cheapest)");
        } else if (mat === "copper") {
          score += 10;
          rationale.push("cost_priority=low_cost → +10 (copper inexpensive)");
        } else if (mat === "copper_tungsten") {
          score -= 30;
          rationale.push(
            "cost_priority=low_cost → -30 (CuW is the most expensive material)",
          );
        }
      } else if (costPriority === "performance") {
        if (mat === "copper_tungsten") {
          score += 15;
          rationale.push(
            "cost_priority=performance → +15 (CuW lowest wear / best dimensional integrity)",
          );
        } else if (mat === "graphite_fine") {
          score += 10;
          rationale.push(
            "cost_priority=performance → +10 (graphite_fine highest MRR among general-purpose)",
          );
        }
      }

      return {
        material: mat,
        rank: 0, // assigned after sort
        score: round2(score),
        rationale,
        estimated_wear_ratio_pct: wear,
      };
    });

    // Rank — score desc, then material name asc for deterministic tie-break.
    scored.sort((a, b) =>
      b.score !== a.score ? b.score - a.score : a.material.localeCompare(b.material),
    );
    scored.forEach((r, i) => {
      r.rank = i + 1;
    });

    const top = scored[0];
    const second = scored[1];
    const bottom = scored[scored.length - 1];
    const span = top.score - bottom.score;
    const confidence = round2(
      span > 0 ? Math.max(0, Math.min(1, (top.score - second.score) / span)) : 0,
    );

    return {
      workpiece_class,
      recommended: top,
      alternatives: scored.slice(1),
      confidence,
      notes,
    };
  }

  /**
   * Normalize a free-text workpiece material into a known class.  Falls
   * through to `tool_steel` (with a note from the caller) for unknown
   * material strings — that is the most common shop default and produces
   * a defensible recommendation rather than a hard failure.
   */
  private _classifyWorkpiece(material: string): WorkpieceClass {
    const m = material.toLowerCase();
    // Order matters — most-specific / least-promiscuous first. The aluminum
    // and copper_alloy checks come AFTER titanium/inconel/stainless because
    // strings like "Ti-6Al-4V titanium" or "Inconel 718" contain partial
    // tokens that a loose aluminum regex would otherwise grab first.
    if (/(carbide|wc[-_ ]|cemented|tungsten\s*carbide)/i.test(m)) return "carbide";
    if (/(inconel|hastelloy|nimonic|\bmonel\b|\b625\b|\b718\b)/i.test(m))
      return "inconel";
    if (
      /(titanium|ti[-_ ]?6al[-_ ]?4v|grade\s*5|\bcp[-_ ]?ti\b|ti[-_ ]?6)/i.test(m)
    )
      return "titanium";
    if (/(stainless|17-4|15-5|\b304\b|\b316\b|s17400|\bss\b)/i.test(m))
      return "stainless";
    // `\bal\b` requires "al" as a standalone word — it does NOT match the
    // trailing "al" of "material" or the "Al" in "Ti-6Al-4V" (preceded by
    // a digit, no word-boundary).
    if (/(aluminum|aluminium|\b6061\b|\b7075\b|\bal\b|\bal[-_ ][0-9])/i.test(m))
      return "aluminum";
    if (/(copper|brass|bronze|beryllium|\bc360\b|\bc110\b|\bc172\b|\bc932\b)/i.test(m))
      return "copper_alloy";
    if (
      /(d2|s7|a2|h13|m2|p20|tool\s*steel|cold\s*work|hot\s*work|hardened\s*steel|4140|4340|\bo1\b)/i.test(
        m,
      )
    )
      return "tool_steel";
    return "tool_steel"; // safe default
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function round2(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100) / 100;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const electrodeMaterialDecisionEngine = new ElectrodeMaterialDecisionEngine();
