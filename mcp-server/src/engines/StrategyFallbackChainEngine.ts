/**
 * StrategyFallbackChainEngine — CAMX-MS2/U03
 * =============================================
 *
 * Automatic strategy fallback when the preferred toolpath is incompatible
 * with the selected controller or machine. Walks an ordered fallback chain
 * (per strategy family) and returns the first compatible option plus an
 * explanation trail for the decision log.
 *
 * Fallback examples:
 *   - morphed_spiral → adaptive_clearing → z_level_roughing
 *   - 5axis_simultaneous → 3+2_positional → 3-axis_rest_machining
 *   - trochoidal_milling → adaptive_clearing → plunge_roughing
 *   - high_speed_finishing → constant_scallop → z_level_finishing
 *
 * Inputs: preferred StrategyType + ControllerFamily + (optional) machine
 * constraints result. Outputs: chosen strategy, chain walked, rationale
 * per step, and a human-readable explanation bundle.
 *
 * Distinct from:
 *   - ControllerStrategyValidatorEngine  (single-option validation)
 *   - MachineStrategyConstraintEngine    (machine-side validation)
 *   - StrategyCostOptimalEngine          (multi-option cost ranking)
 *   - StrategySafetyDecisionEngine       (safety override)
 *   - This engine                        (ordered fallback walker)
 *
 * References:
 *   - Autodesk Fusion 360 HSM "Automatic Fallback Strategies" technical note
 *   - Mastercam 2024 "Strategy Compatibility Matrix" (multi-controller)
 *
 * @module engines/StrategyFallbackChainEngine
 * @milestone CAMX-MS2/U03
 */

import type { StrategyType, ControllerFamily, ValidationResult } from "./ControllerStrategyValidatorEngine.js";
import { controllerStrategyValidatorEngine } from "./ControllerStrategyValidatorEngine.js";

export interface FallbackStep {
  strategy: StrategyType;
  compatible: boolean;
  score: number;
  reason: string;
  /** Issues found (when incompatible) */
  blocking_issues?: string[];
}

export interface StrategyFallbackChainInput {
  /** Preferred (first choice) strategy */
  preferred: StrategyType;
  controller: ControllerFamily;
  /** Optional explicit chain override */
  custom_chain?: StrategyType[];
  /** Optional machine-constraint pre-flag: if any machine issue detected,
   * the chain walker will skip strategies that are known to exceed the
   * machine's axis/RPM/power envelope. */
  machine_flags?: {
    max_axes_available?: number;
    hsm_capable?: boolean;
    nurbs_capable?: boolean;
  };
}

export interface StrategyFallbackChainResult {
  chosen: StrategyType;
  /** True if preferred was kept; false if we fell back. */
  used_preferred: boolean;
  chain_walked: FallbackStep[];
  explanation: string;
  reasoning: string[];
}

/**
 * Default fallback chains keyed by preferred strategy. Each list starts
 * with the preferred option and walks toward safer/more-portable options.
 */
const DEFAULT_CHAINS: Partial<Record<StrategyType, StrategyType[]>> = {
  morphed_spiral: ["morphed_spiral", "adaptive_clearing", "z_level_roughing"],
  adaptive_clearing: ["adaptive_clearing", "z_level_roughing", "face_milling"],
  "5axis_simultaneous": ["5axis_simultaneous", "constant_scallop", "z_level_roughing"],
  thread_milling: ["thread_milling", "helical_bore"],
  high_speed_finishing: ["high_speed_finishing", "constant_scallop", "flowline_finishing"],
  trochoidal_milling: ["trochoidal_milling", "adaptive_clearing", "plunge_roughing"],
  plunge_roughing: ["plunge_roughing", "peck_drilling"],
  barrel_cutter_finishing: ["barrel_cutter_finishing", "flowline_finishing", "constant_scallop"],
  geodesic_finishing: ["geodesic_finishing", "flowline_finishing", "constant_scallop"],
  z_level_roughing: ["z_level_roughing", "face_milling"],
  rest_machining: ["rest_machining", "pencil_tracing", "constant_scallop"],
  face_milling: ["face_milling"],
  peck_drilling: ["peck_drilling"],
  bore_milling: ["bore_milling", "helical_bore"],
  helical_bore: ["helical_bore", "bore_milling"],
  constant_scallop: ["constant_scallop", "flowline_finishing"],
  pencil_tracing: ["pencil_tracing", "rest_machining"],
  flowline_finishing: ["flowline_finishing", "constant_scallop"],
  swarf_cutting: ["swarf_cutting", "5axis_simultaneous", "constant_scallop"],
  custom: ["custom"],
};

class StrategyFallbackChainEngineImpl {
  choose(i: StrategyFallbackChainInput): StrategyFallbackChainResult {
    const chain = (i.custom_chain ?? DEFAULT_CHAINS[i.preferred] ?? [i.preferred]).slice();
    const walked: FallbackStep[] = [];
    const reasoning: string[] = [];
    let chosen: StrategyType = i.preferred;
    let foundCompatible = false;

    for (const strategy of chain) {
      // Machine-flag early reject
      if (i.machine_flags) {
        if (!i.machine_flags.hsm_capable && (strategy === "high_speed_finishing")) {
          walked.push({
            strategy,
            compatible: false,
            score: 0,
            reason: "Machine flag: no HSM capability",
            blocking_issues: ["no_hsm"],
          });
          continue;
        }
        if (!i.machine_flags.nurbs_capable && strategy === "morphed_spiral") {
          walked.push({
            strategy,
            compatible: false,
            score: 0,
            reason: "Machine flag: no NURBS capability",
            blocking_issues: ["no_nurbs"],
          });
          continue;
        }
        if ((i.machine_flags.max_axes_available ?? 99) < 5 && strategy === "5axis_simultaneous") {
          walked.push({
            strategy,
            compatible: false,
            score: 0,
            reason: `Machine flag: axes ${i.machine_flags.max_axes_available} < 5`,
            blocking_issues: ["insufficient_axes"],
          });
          continue;
        }
      }

      const v: ValidationResult = controllerStrategyValidatorEngine.validate(strategy, i.controller);
      if (v.compatible) {
        walked.push({
          strategy,
          compatible: true,
          score: v.score,
          reason: `Compatible with ${i.controller} (score ${v.score})`,
        });
        chosen = strategy;
        foundCompatible = true;
        break;
      } else {
        walked.push({
          strategy,
          compatible: false,
          score: v.score,
          reason: `Incompatible (score ${v.score}) — ${v.issues.length} issue(s)`,
          blocking_issues: v.issues.slice(0, 3).map((x) => x.code),
        });
      }
    }

    if (!foundCompatible) {
      // Last resort: chosen stays at the preferred; flag the failure
      reasoning.push(`No compatible strategy found in chain — preferred (${i.preferred}) returned as-is with failure flag`);
    } else {
      reasoning.push(`Walked ${walked.length} step(s); chose ${chosen}`);
    }

    const usedPreferred = chosen === i.preferred && walked[0]?.compatible === true;
    const explanation = buildExplanation(i.preferred, chosen, walked, foundCompatible);

    return {
      chosen,
      used_preferred: usedPreferred,
      chain_walked: walked,
      explanation,
      reasoning,
    };
  }

  getDefaultChain(strategy: StrategyType): StrategyType[] {
    return (DEFAULT_CHAINS[strategy] ?? [strategy]).slice();
  }

  getStats(): { chains: number; reference: string } {
    return {
      chains: Object.keys(DEFAULT_CHAINS).length,
      reference: "Autodesk Fusion HSM fallback tech note; Mastercam 2024 strategy matrix",
    };
  }
}

function buildExplanation(
  preferred: StrategyType,
  chosen: StrategyType,
  walked: FallbackStep[],
  success: boolean,
): string {
  if (!success) {
    return `No compatible strategy found starting from "${preferred}". Walked ${walked.length} step(s). Recommend manual review.`;
  }
  if (chosen === preferred) {
    return `Preferred strategy "${preferred}" is compatible. No fallback required.`;
  }
  const rejected = walked.filter((s) => !s.compatible).map((s) => s.strategy).join(" → ");
  return `Preferred "${preferred}" incompatible; fell back through [${rejected}] to "${chosen}". Review chain log for rationale.`;
}

export const strategyFallbackChainEngine = new StrategyFallbackChainEngineImpl();
export type { StrategyFallbackChainEngineImpl };
