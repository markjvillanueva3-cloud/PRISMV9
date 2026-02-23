/**
 * PRISM Calculation Hook Middleware
 * =================================
 * 
 * Auto-fires hooks before/after manufacturing calculations.
 * Bridges orchestration/HookEngine (safety hooks) with calc engines.
 * 
 * Hooks fired:
 * - CALC-BEFORE-EXEC-001: Before any calculation
 * - CALC-AFTER-EXEC-001: After any calculation
 * - CALC-RANGE-CHECK-001: If results exceed safe ranges
 * - CALC-SAFETY-VIOLATION-001: HARD BLOCK if S(x) < 0.70
 * - CALC-KIENZLE-001 / TAYLOR-001 / etc.: Specific calc hooks
 * 
 * Usage:
 *   import { withCalcHooks } from "./CalcHookMiddleware.js";
 *   const result = await withCalcHooks("kienzle", params, () => calculateKienzle(params));
 */

import { hookEngine } from "../orchestration/HookEngine.js";
import { log } from "../utils/Logger.js";

// Map calc types to their specific hook IDs
const CALC_HOOK_MAP: Record<string, string> = {
  kienzle: "CALC-KIENZLE-001",
  taylor: "CALC-TAYLOR-001",
  johnson_cook: "CALC-JOHNSON-COOK-001",
  mrr: "CALC-MRR-001",
  power: "CALC-POWER-001",
  surface_finish: "CALC-AFTER-EXEC-001",
  speed_feed: "CALC-AFTER-EXEC-001",
  stability: "CALC-PHYSICS-VALIDATE-001",
  deflection: "CALC-AFTER-EXEC-001",
  thermal: "CALC-AFTER-EXEC-001",
  engagement: "CALC-AFTER-EXEC-001",
  trochoidal: "CALC-AFTER-EXEC-001",
  hsm: "CALC-AFTER-EXEC-001",
  scallop: "CALC-AFTER-EXEC-001",
  stepover: "CALC-AFTER-EXEC-001",
  cycle_time: "CALC-AFTER-EXEC-001",
  cost_optimize: "CALC-AFTER-EXEC-001",
  multi_optimize: "CALC-AFTER-EXEC-001",
  productivity: "CALC-AFTER-EXEC-001",
};

// Safety thresholds for range checking
const SAFETY_RANGES = {
  force_N: { min: 0, max: 50000, warn: 30000 },
  power_kW: { min: 0, max: 100, warn: 75 },
  torque_Nm: { min: 0, max: 2000, warn: 1500 },
  speed_m_min: { min: 0, max: 2000, warn: 1500 },
  temperature_C: { min: 0, max: 1500, warn: 1000 },
  deflection_mm: { min: 0, max: 1, warn: 0.5 },
  tool_life_min: { min: 0.1, max: 10000, warn: 5 },
};

export interface CalcHookResult<T> {
  result: T;
  hooks: {
    beforeFired: boolean;
    afterFired: boolean;
    rangeCheckFired: boolean;
    specificHookFired: boolean;
    blocked: boolean;
    blockReason?: string;
    warnings: string[];
  };
}

/**
 * Wraps a calculation function with automatic hook triggers.
 * 
 * @param calcType - Type of calculation (kienzle, taylor, etc.)
 * @param params - Input parameters (passed to hooks for context)
 * @param calcFn - The actual calculation function to execute
 * @returns CalcHookResult with original result + hook metadata
 */
export async function withCalcHooks<T>(
  calcType: string,
  params: Record<string, unknown>,
  calcFn: () => T
): Promise<CalcHookResult<T>> {
  const hookMeta = {
    beforeFired: false,
    afterFired: false,
    rangeCheckFired: false,
    specificHookFired: false,
    blocked: false,
    blockReason: undefined as string | undefined,
    warnings: [] as string[],
  };

  // BEFORE hook
  try {
    const beforeResult = await hookEngine.executeHook("CALC-BEFORE-EXEC-001", {
      source: `calc_${calcType}`,
      calcType,
      params,
    });
    hookMeta.beforeFired = true;
    if (beforeResult.status === "blocked") {
      hookMeta.blocked = true;
      hookMeta.blockReason = beforeResult.blockReason || beforeResult.message;
      log.warn(`[CalcHooks] BLOCKED before ${calcType}: ${hookMeta.blockReason}`);
      throw new Error(`Calculation blocked by hook: ${hookMeta.blockReason}`);
    }
  } catch (error) {
    if (hookMeta.blocked) throw error;
    log.debug(`[CalcHooks] Before hook for ${calcType}: ${error}`);
  }

  // EXECUTE the calculation
  const result = calcFn();

  // AFTER hook
  try {
    const afterResult = await hookEngine.executeHook("CALC-AFTER-EXEC-001", {
      source: `calc_${calcType}`,
      calcType,
      params,
      result,
    });
    hookMeta.afterFired = true;
  } catch (error) {
    log.debug(`[CalcHooks] After hook for ${calcType}: ${error}`);
  }

  // RANGE CHECK hook - inspect result for out-of-range values
  try {
    const rangeWarnings = checkResultRanges(result);
    if (rangeWarnings.length > 0) {
      hookMeta.warnings.push(...rangeWarnings);
      const rangeResult = await hookEngine.executeHook("CALC-RANGE-CHECK-001", {
        source: `calc_${calcType}`,
        calcType,
        warnings: rangeWarnings,
        result,
      });
      hookMeta.rangeCheckFired = true;
      if (rangeResult.status === "blocked") {
        hookMeta.blocked = true;
        hookMeta.blockReason = rangeResult.blockReason || rangeResult.message;
      }
    }
  } catch (error) {
    log.debug(`[CalcHooks] Range check for ${calcType}: ${error}`);
  }

  // SPECIFIC CALCULATION hook (e.g., CALC-KIENZLE-001)
  const specificHookId = CALC_HOOK_MAP[calcType];
  if (specificHookId && specificHookId !== "CALC-AFTER-EXEC-001") {
    try {
      await hookEngine.executeHook(specificHookId, {
        source: `calc_${calcType}`,
        calcType,
        params,
        result,
      });
      hookMeta.specificHookFired = true;
    } catch (error) {
      log.debug(`[CalcHooks] Specific hook ${specificHookId} for ${calcType}: ${error}`);
    }
  }

  return { result, hooks: hookMeta };
}

/**
 * Check result object for values exceeding safety ranges.
 */
function checkResultRanges(result: unknown): string[] {
  const warnings: string[] = [];
  if (typeof result !== "object" || result === null) return warnings;

  const obj = result as Record<string, unknown>;

  // Check force
  const force = extractNumeric(obj, ["Fc", "cutting_force", "force", "Fc_N", "main_cutting_force"]);
  if (force !== null && force > SAFETY_RANGES.force_N.warn) {
    warnings.push(`High cutting force: ${force.toFixed(0)}N (warn: ${SAFETY_RANGES.force_N.warn}N)`);
  }

  // Check power
  const power = extractNumeric(obj, ["power", "cutting_power", "power_kW", "spindle_power", "Pc"]);
  if (power !== null && power > SAFETY_RANGES.power_kW.warn) {
    warnings.push(`High power: ${power.toFixed(1)}kW (warn: ${SAFETY_RANGES.power_kW.warn}kW)`);
  }

  // Check temperature
  const temp = extractNumeric(obj, ["temperature", "cutting_temperature", "temp_C", "T_max"]);
  if (temp !== null && temp > SAFETY_RANGES.temperature_C.warn) {
    warnings.push(`High temperature: ${temp.toFixed(0)}°C (warn: ${SAFETY_RANGES.temperature_C.warn}°C)`);
  }

  // Check deflection
  const defl = extractNumeric(obj, ["deflection", "max_deflection", "deflection_mm", "total_deflection"]);
  if (defl !== null && defl > SAFETY_RANGES.deflection_mm.warn) {
    warnings.push(`High deflection: ${defl.toFixed(3)}mm (warn: ${SAFETY_RANGES.deflection_mm.warn}mm)`);
  }

  // Check tool life (warn if very low)
  const tl = extractNumeric(obj, ["tool_life", "tool_life_min", "T", "estimated_life"]);
  if (tl !== null && tl < SAFETY_RANGES.tool_life_min.warn) {
    warnings.push(`Low tool life: ${tl.toFixed(1)}min (warn: <${SAFETY_RANGES.tool_life_min.warn}min)`);
  }

  return warnings;
}

/**
 * Extract a numeric value from an object by trying multiple key names.
 */
function extractNumeric(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "number" && !isNaN(val)) return val;
    // Check nested (e.g., result.forces.Fc)
    if (typeof val === "object" && val !== null) {
      const nested = val as Record<string, unknown>;
      for (const nKey of Object.keys(nested)) {
        if (typeof nested[nKey] === "number") return nested[nKey] as number;
      }
    }
  }
  return null;
}

/**
 * Fire safety violation hook manually.
 * Call this when a safety score is computed that might be below threshold.
 */
export async function checkSafetyScore(
  safetyScore: number,
  context: Record<string, unknown> = {}
): Promise<{ blocked: boolean; message?: string }> {
  const result = await hookEngine.executeHook("CALC-SAFETY-VIOLATION-001", {
    source: "safety_check",
    safety_score: safetyScore,
    S: safetyScore,
    ...context,
  });

  return {
    blocked: result.status === "blocked",
    message: result.message,
  };
}

/**
 * Fire anti-regression hook.
 * Call this before replacing any data file.
 */
export async function checkAntiRegression(
  oldCount: number,
  newCount: number,
  context: Record<string, unknown> = {}
): Promise<{ blocked: boolean; message?: string }> {
  const result = await hookEngine.executeHook("STATE-ANTI-REGRESSION-001", {
    source: "anti_regression",
    old_count: oldCount,
    new_count: newCount,
    ...context,
  });

  return {
    blocked: result.status === "blocked",
    message: result.message,
  };
}