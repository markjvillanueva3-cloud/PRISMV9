/**
 * SkimCutQCEngine — WEDM trim-pass quality predictor
 *
 * Closes the iter20 P1 "skim-cut QC" gap. After a WEDM roughing pass, the
 * operator chooses N skim/trim passes to achieve drawing Ra + dimensional
 * accuracy. Empirical roll-off per Sodick AP-series + Fanuc Robocut tables:
 *
 *   Ra_n = Ra_rough × ROLLOFF^n   where ROLLOFF ≈ 0.55 per skim (45% reduction)
 *   recast_layer_um = recast_rough × (0.30 + 0.70 × ROLLOFF^n)  (deeper than Ra reduction)
 *   dim_accuracy_um = base_accuracy / sqrt(n + 1)  (compound averaging)
 *
 * The roll-off factor varies by material:
 *   - Tool steel D2/A2 (hardened):  0.50  (best response to skim)
 *   - Aluminum 6061:                0.65  (worst — ductile + softer recast)
 *   - Carbide WC-Co:                0.55
 *   - Inconel 718:                  0.60  (recast slow to clean up)
 *   - Brass C360:                   0.62
 *
 * Reference: Sodick AP-series Surface Finish Tables §A2; Fanuc Robocut Wire
 *   EDM Programming Manual §6 (skim-pass strategy); Charmilles RoboFil 4030
 *   Application Notes §D-2; Mitsubishi MV1200R Surface Reference §3.
 *
 * @version 1.0.0
 * @module SkimCutQCEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type WedmMaterial = "tool_steel_hardened" | "tool_steel_annealed" | "aluminum" | "carbide" | "inconel" | "brass" | "copper" | "graphite";

export interface SkimCutQCInput {
  /** Roughing Ra (μm) achieved by main cut */
  roughing_ra_um: number;
  /** Roughing recast layer thickness (μm) — typical 8-25μm */
  roughing_recast_um: number;
  /** Roughing dimensional accuracy (±μm) — typical 25-50μm */
  roughing_dim_accuracy_um: number;
  /** Number of skim passes planned (0-6 typical) */
  n_skim_passes: number;
  /** Workpiece material */
  material: WedmMaterial;
  /** Drawing target Ra (μm) */
  target_ra_um: number;
  /** Drawing target dimensional accuracy (±μm) */
  target_dim_accuracy_um: number;
  /** Drawing max acceptable recast layer (μm), default 5μm aerospace */
  max_recast_um?: number;
}

export type QCVerdict = "meets_spec" | "marginal" | "additional_skims_required" | "infeasible";

export interface SkimCutQCResult {
  predicted_final_ra_um: AtomicValue;
  predicted_recast_um: AtomicValue;
  predicted_dim_accuracy_um: AtomicValue;
  meets_ra_spec: boolean;
  meets_recast_spec: boolean;
  meets_dim_spec: boolean;
  verdict: QCVerdict;
  /** Additional skim passes needed beyond input to meet drawing */
  additional_skims_recommended: AtomicValue<number>;
  warnings: string[];
  source: string;
}

const ROLLOFF_BY_MATERIAL: Record<WedmMaterial, number> = {
  tool_steel_hardened: 0.50,
  tool_steel_annealed: 0.55,
  carbide: 0.55,
  inconel: 0.60,
  brass: 0.62,
  copper: 0.63,
  aluminum: 0.65,
  graphite: 0.58,
};

const MAX_PRACTICAL_SKIMS = 6;  // beyond 6 skims diminishing returns + cycle time prohibitive

export class SkimCutQCEngine {
  predict(input: SkimCutQCInput): SkimCutQCResult {
    if (!input || input.roughing_ra_um == null || input.n_skim_passes == null || !input.material) {
      throw new Error("SkimCutQCEngine.predict: roughing_ra_um + n_skim_passes + material required");
    }
    if (input.target_ra_um == null || input.target_dim_accuracy_um == null) {
      throw new Error("SkimCutQCEngine.predict: target_ra_um + target_dim_accuracy_um required");
    }
    if (input.roughing_ra_um <= 0 || input.roughing_recast_um < 0 || input.roughing_dim_accuracy_um <= 0) {
      throw new Error("SkimCutQCEngine.predict: positive roughing inputs required");
    }
    if (input.n_skim_passes < 0 || input.n_skim_passes > 10 || !Number.isInteger(input.n_skim_passes)) {
      throw new Error("SkimCutQCEngine.predict: n_skim_passes must be integer in [0, 10]");
    }

    const warnings: string[] = [];
    const rolloff = ROLLOFF_BY_MATERIAL[input.material];
    const n = input.n_skim_passes;
    const maxRecast = input.max_recast_um ?? 5;

    // ── Predict final Ra (exponential roll-off) ───────────────────────
    const finalRa = input.roughing_ra_um * Math.pow(rolloff, n);

    // ── Predict recast (asymptotic floor — 30% of roughing recast remains) ──
    // recast = roughing_recast × (0.30 + 0.70 × rolloff^n)
    const recastFactor = 0.30 + 0.70 * Math.pow(rolloff, n);
    const finalRecast = input.roughing_recast_um * recastFactor;

    // ── Predict dim accuracy (compound averaging — 1/sqrt(n+1)) ───────
    const finalDimAccuracy = input.roughing_dim_accuracy_um / Math.sqrt(n + 1);

    // ── Spec checks ───────────────────────────────────────────────────
    const meetsRa = finalRa <= input.target_ra_um;
    const meetsRecast = finalRecast <= maxRecast;
    const meetsDim = finalDimAccuracy <= input.target_dim_accuracy_um;
    const allMeet = meetsRa && meetsRecast && meetsDim;

    // ── Compute additional skims needed (linear search up to practical limit) ──
    let additionalSkims = 0;
    let searchFoundSolution = false;
    if (!allMeet) {
      const remainingBudget = Math.max(0, MAX_PRACTICAL_SKIMS - n);
      for (let extra = 1; extra <= remainingBudget; extra++) {
        const newN = n + extra;
        const newRa = input.roughing_ra_um * Math.pow(rolloff, newN);
        const newRecast = input.roughing_recast_um * (0.30 + 0.70 * Math.pow(rolloff, newN));
        const newDim = input.roughing_dim_accuracy_um / Math.sqrt(newN + 1);
        if (newRa <= input.target_ra_um && newRecast <= maxRecast && newDim <= input.target_dim_accuracy_um) {
          additionalSkims = extra;
          searchFoundSolution = true;
          break;
        }
      }
      if (!searchFoundSolution) {
        additionalSkims = remainingBudget;  // exhausted budget — infeasible
      }
    }

    // ── Verdict ────────────────────────────────────────────────────────
    let verdict: QCVerdict;
    if (allMeet) {
      // Check marginal — within 10% of any spec
      const raMargin = (input.target_ra_um - finalRa) / input.target_ra_um;
      const dimMargin = (input.target_dim_accuracy_um - finalDimAccuracy) / input.target_dim_accuracy_um;
      if (raMargin < 0.10 || dimMargin < 0.10) {
        verdict = "marginal";
        warnings.push("Within 10% of spec — add 1 skim pass for safety margin or accept process drift risk");
      } else {
        verdict = "meets_spec";
      }
    } else if (!searchFoundSolution) {
      // Even max practical skims would NOT meet spec → INFEASIBLE
      verdict = "infeasible";
      const failing: string[] = [];
      // Predict what max skims would give
      const maxN = MAX_PRACTICAL_SKIMS;
      const maxRa = input.roughing_ra_um * Math.pow(rolloff, maxN);
      const maxRecastVal = input.roughing_recast_um * (0.30 + 0.70 * Math.pow(rolloff, maxN));
      if (maxRa > input.target_ra_um) failing.push(`Ra ${maxRa.toFixed(2)}μm > target ${input.target_ra_um}μm`);
      if (maxRecastVal > maxRecast) failing.push(`recast ${maxRecastVal.toFixed(2)}μm > ${maxRecast}μm`);
      warnings.push(`Drawing INFEASIBLE on WEDM — even ${MAX_PRACTICAL_SKIMS} skim passes can't reach spec (${failing.join(", ")}); consider grinding/lapping secondary op`);
    } else {
      verdict = "additional_skims_required";
      warnings.push(`Add ${additionalSkims} more skim pass(es) to meet drawing spec`);
    }

    // ── Material-specific warnings ────────────────────────────────────
    if (input.material === "aluminum" && finalRa < 0.8) {
      warnings.push("Aluminum WEDM <0.8μm Ra is unstable — recast smearing causes Ra growth on storage; prefer 1.6μm + diamond-polish secondary");
    }
    if (input.material === "carbide" && n < 2) {
      warnings.push("Carbide WEDM requires ≥2 skim passes — recast layer brittle, will spall if not cleaned up");
    }

    return {
      predicted_final_ra_um: {
        value: Number(finalRa.toFixed(3)),
        unit: "μm",
        source: `Ra_rough × ${rolloff}^${n} (material ${input.material} roll-off)`,
      },
      predicted_recast_um: {
        value: Number(finalRecast.toFixed(2)),
        unit: "μm",
        source: `recast_rough × (0.30 + 0.70 × ${rolloff}^${n})`,
      },
      predicted_dim_accuracy_um: {
        value: Number(finalDimAccuracy.toFixed(2)),
        unit: "±μm",
        source: `accuracy_rough / sqrt(${n} + 1)`,
      },
      meets_ra_spec: meetsRa,
      meets_recast_spec: meetsRecast,
      meets_dim_spec: meetsDim,
      verdict,
      additional_skims_recommended: {
        value: additionalSkims,
        unit: "passes",
        source: "skims to satisfy Ra + recast + dim simultaneously",
      },
      warnings,
      source: "SkimCutQCEngine — Sodick AP §A2 + Fanuc Robocut §6 + Charmilles RoboFil §D-2 + Mitsubishi MV1200R §3",
    };
  }
}

export const skimCutQCEngine = new SkimCutQCEngine();
