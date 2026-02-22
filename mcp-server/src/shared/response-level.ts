/**
 * Response Level Schema — Token-efficient MCP responses
 * 
 * Every dispatcher action should accept response_level to control output verbosity.
 * Default: 'summary' (50-100 tokens). Claude Code should use 'pointer' for
 * intermediate pipeline steps and 'full' only when debugging.
 * 
 * USAGE IN DISPATCHERS:
 *   const level = params.response_level || 'summary';
 *   const result = computeResult(params);
 *   return formatResponse(result, level);
 */

export type ResponseLevel = 'pointer' | 'summary' | 'full';

export interface ResponseLevelOptions {
  /** Controls output verbosity. Default: 'summary' */
  response_level?: ResponseLevel;
}

/**
 * Format any action result according to response_level.
 * 
 * @param result - The full computation result
 * @param level - Desired verbosity
 * @param pointerMsg - Short message for pointer mode (e.g., "Done. 3 results in X.json")
 * @param summaryFn - Function that extracts key metrics from result
 * @returns Formatted response object
 */
export function formatResponse<T>(
  result: T,
  level: ResponseLevel,
  pointerMsg: string,
  summaryFn: (r: T) => Record<string, unknown>
): unknown {
  switch (level) {
    case 'pointer':
      return { status: 'ok', message: pointerMsg };
    
    case 'summary':
      return {
        status: 'ok',
        ...summaryFn(result),
      };
    
    case 'full':
      return result;
    
    default:
      return {
        status: 'ok',
        ...summaryFn(result),
      };
  }
}

/**
 * Write large results to file, return pointer.
 * Use for outputs >500 tokens that Claude doesn't need in context.
 * 
 * @param result - Full result object
 * @param filePath - Where to write (e.g., C:\PRISM\state\reports\calc-001.json)
 * @param level - If 'full', returns result directly instead of writing
 */
export function writeOrReturn<T>(
  result: T,
  filePath: string,
  level: ResponseLevel,
  summaryFn: (r: T) => Record<string, unknown>
): unknown {
  if (level === 'full') return result;
  
  // In real implementation, write to filePath via fs
  // const fs = require('fs');
  // fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
  
  if (level === 'pointer') {
    return { status: 'ok', message: `Written to ${filePath}` };
  }
  
  return {
    status: 'ok',
    file: filePath,
    ...summaryFn(result),
  };
}

/**
 * Example usage in a dispatcher:
 * 
 * ```typescript
 * import { formatResponse, ResponseLevelOptions } from '../shared/response-level';
 * 
 * interface CuttingForceParams extends ResponseLevelOptions {
 *   material: string;
 *   tool: string;
 *   ap: number;
 *   ae: number;
 *   fz: number;
 * }
 * 
 * async function cutting_force(params: CuttingForceParams) {
 *   const level = params.response_level || 'summary';
 *   const result = engine.calculateCuttingForce(params);
 *   
 *   return formatResponse(result, level,
 *     `Force calculated: ${result.Fc.value.toFixed(0)}N`,
 *     (r) => ({
 *       Fc_N: r.Fc.value,
 *       Ft_N: r.Ft.value,
 *       power_kW: r.power.value,
 *       safety: r.safety_score,
 *       verdict: r.safety_score >= 0.70 ? 'SAFE' : 'BLOCKED'
 *     })
 *   );
 * }
 * ```
 */
