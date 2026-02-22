/**
 * PRISM Response Level Schema
 * 
 * Cross-cutting interface for all 31 dispatchers / 368 actions.
 * Controls how much detail is returned in MCP tool responses
 * to optimize Claude Code's context window usage.
 * 
 * Usage in any action:
 *   params: { ..., response_level?: 'pointer' | 'summary' | 'full' }
 * 
 * Default: 'summary' — key values + verdict (50-100 tokens)
 * 
 * Token budget per level:
 *   pointer:  ~10-20 tokens  ("Done. File: X.md, 247 findings")
 *   summary:  ~50-150 tokens (key metrics + verdict + warnings)
 *   full:     ~500-3000 tokens (everything — raw data, uncertainty, sources)
 * 
 * Implementation pattern for dispatchers:
 * 
 *   function formatResponse(result: any, level: ResponseLevel): any {
 *     switch (level) {
 *       case 'pointer':
 *         return { status: 'ok', ref: result.id, count: result.items?.length };
 *       case 'summary':
 *         return {
 *           status: result.status,
 *           key_values: extractKeyValues(result),
 *           verdict: result.safety_score >= 0.70 ? 'PASS' : 'FAIL',
 *           warnings: result.warnings?.slice(0, 3)
 *         };
 *       case 'full':
 *       default:
 *         return result;
 *     }
 *   }
 * 
 * MIGRATION PLAN:
 * - Phase 1 (R2): Add response_level to calcDispatcher, safetyDispatcher
 * - Phase 2 (R3): Add to dataDispatcher, toolpathDispatcher
 * - Phase 3 (R4): Add to all remaining dispatchers
 * - Each dispatcher's formatResponse extracts domain-specific key values
 */

export type ResponseLevel = 'pointer' | 'summary' | 'full';

export interface ResponseLevelOptions {
  /** Controls response verbosity. Default: 'summary' */
  response_level?: ResponseLevel;
}

/**
 * Standard response envelope with level-appropriate content
 */
export interface LeveledResponse<T = any> {
  status: 'ok' | 'error' | 'warning';
  level: ResponseLevel;
  data: T;
  /** Only included at 'summary' and 'full' levels */
  warnings?: string[];
  /** Only included at 'full' level */
  metadata?: {
    computation_ms?: number;
    source?: string;
    uncertainty?: Record<string, number>;
  };
}

/**
 * Format any result according to the requested response level.
 * Each dispatcher should override extractKeyValues for domain-specific summaries.
 */
export function formatByLevel<T>(
  result: T,
  level: ResponseLevel = 'summary',
  extractKeyValues?: (r: T) => Record<string, any>
): LeveledResponse {
  switch (level) {
    case 'pointer':
      return {
        status: 'ok',
        level: 'pointer',
        data: { done: true, type: typeof result === 'object' ? Object.keys(result as any).length + ' fields' : 'scalar' }
      };
    
    case 'summary':
      return {
        status: 'ok',
        level: 'summary',
        data: extractKeyValues ? extractKeyValues(result) : result,
        warnings: (result as any)?.warnings?.slice(0, 3)
      };
    
    case 'full':
    default:
      return {
        status: 'ok',
        level: 'full',
        data: result,
        warnings: (result as any)?.warnings,
        metadata: {
          computation_ms: (result as any)?._computation_ms,
          source: (result as any)?._source,
          uncertainty: (result as any)?._uncertainty
        }
      };
  }
}

/**
 * Compound action pattern: execute multiple steps server-side,
 * return only the final verdict. Prevents multiple round-trips.
 * 
 * Example: Instead of 5 separate calls:
 *   prism_data→material_get → prism_data→tool_get → prism_calc→speed_feed
 *   → prism_calc→cutting_force → prism_safety→check_spindle_torque
 * 
 * Single compound call:
 *   prism_calc→full_parameter_set { material, tool, operation, response_level: 'summary' }
 *   → returns { Vc, fz, ap, ae, Fc, P, T_life, S_score, verdict: 'SAFE' }
 * 
 * Token savings: ~2500 tokens → ~100 tokens
 */
export interface CompoundActionResult {
  /** Final computed values */
  parameters: Record<string, number>;
  /** Safety verdict */
  safety: { score: number; verdict: 'SAFE' | 'WARNING' | 'BLOCKED' };
  /** Tool life estimate */
  tool_life_min: number;
  /** Any warnings from intermediate steps */
  warnings: string[];
}

/**
 * Write-to-file pattern: for large outputs (reports, analyses),
 * write to disk and return only a pointer.
 * 
 * Example:
 *   prism_analysis→deep_report { material: "Ti-6Al-4V", response_level: 'pointer' }
 *   → writes 50KB report to C:\PRISM\state\reports\analysis-001.md
 *   → returns { status: 'ok', file: 'state/reports/analysis-001.md', size: '50KB', findings: 247 }
 * 
 * Claude reads the file only if it needs specific details.
 */
export interface FilePointerResponse {
  status: 'ok';
  file: string;
  size: string;
  summary: string;
}
