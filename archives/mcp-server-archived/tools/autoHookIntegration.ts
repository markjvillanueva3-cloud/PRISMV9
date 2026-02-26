/**
 * PRISM Auto-Hook Integration - Server Proxy
 * ============================================
 * 
 * Creates a proxy around McpServer that automatically wraps calculation
 * tool handlers with safety hooks (Λ(x) validation, before/after hooks).
 * 
 * ZERO changes to existing tool registration files.
 * Single integration point in index.ts.
 * 
 * Usage in index.ts:
 *   const hookedServer = createHookedServer(server);
 *   registerManufacturingCalculationsV2(hookedServer);
 *   registerAdvancedCalculationsV2(hookedServer);
 *   registerToolpathCalculationsV2(hookedServer);
 *   registerCalculationTools(hookedServer);
 * 
 * @version 1.0.0
 * @date 2026-02-06
 */

import { log } from '../utils/Logger.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CALC_TOOL_PREFIXES = ['calc_', 'prism_cutting_force', 'prism_tool_life', 'prism_speed_feed', 'prism_formula_calc'];

const SAFETY_THRESHOLDS = {
  lambda_min: 0.70,       // Minimum safety proof score
  max_cutting_speed: 2000, // m/min
  max_feed: 2.0,          // mm/tooth
  max_depth: 100,         // mm
  max_power_warning: 100, // kW
  min_tool_life: 0.1,     // minutes
};

// Validation ranges for input parameters
const INPUT_RANGES: Record<string, { min: number; max: number }> = {
  cutting_speed: { min: 1, max: 2000 },
  feed_per_tooth: { min: 0.001, max: 2 },
  axial_depth: { min: 0.01, max: 100 },
  radial_depth: { min: 0.01, max: 100 },
  tool_diameter: { min: 0.1, max: 500 },
  number_of_teeth: { min: 1, max: 20 },
  depth: { min: 0.01, max: 100 },
  feed: { min: 0.001, max: 2 },
};

// ============================================================================
// HOOK EXECUTION HISTORY
// ============================================================================

interface HookExecution {
  timestamp: string;
  tool_name: string;
  event: string;
  success: boolean;
  duration_ms: number;
  lambda_score?: number;
  issues?: string[];
}

const hookHistory: HookExecution[] = [];
const MAX_HISTORY = 500;

function logExecution(entry: HookExecution): void {
  hookHistory.push(entry);
  if (hookHistory.length > MAX_HISTORY) hookHistory.shift();
}

// Export for external access
export function getAutoHookHistory(): HookExecution[] {
  return [...hookHistory];
}

export function getAutoHookStats(): {
  total: number;
  safety_violations: number;
  last_24h: number;
  tools_wrapped: string[];
} {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return {
    total: hookHistory.length,
    safety_violations: hookHistory.filter(h => h.lambda_score !== undefined && h.lambda_score < SAFETY_THRESHOLDS.lambda_min).length,
    last_24h: hookHistory.filter(h => (now - new Date(h.timestamp).getTime()) < day).length,
    tools_wrapped: [...wrappedTools],
  };
}

// Track which tools got wrapped
const wrappedTools = new Set<string>();

// ============================================================================
// Λ(x) SAFETY PROOF VALIDATION
// ============================================================================

interface ProofResult {
  is_valid: boolean;
  lambda_score: number;
  issues: string[];
}

function validateSafetyProof(toolName: string, inputs: Record<string, any>, result: any): ProofResult {
  const issues: string[] = [];
  let score = 1.0;
  
  // 1. INPUT RANGE VALIDATION
  for (const [key, range] of Object.entries(INPUT_RANGES)) {
    if (inputs[key] !== undefined) {
      const val = Number(inputs[key]);
      if (val < range.min || val > range.max) {
        issues.push(`${key}=${val} outside valid range [${range.min}, ${range.max}]`);
        score -= 0.3;
      }
    }
  }
  
  // 2. RESULT VALIDATION (extract from nested structures)
  let resultData = result;
  if (result?.content?.[0]?.text) {
    try { resultData = JSON.parse(result.content[0].text); } catch { /* keep original */ }
  }
  if (resultData?.result) resultData = resultData.result;
  
  // Check for negative forces (physically impossible)
  if (resultData?.Fc !== undefined && resultData.Fc < 0) {
    issues.push(`Negative cutting force Fc=${resultData.Fc}N — physically impossible`);
    score -= 0.5;
  }
  if (resultData?.Ff !== undefined && resultData.Ff < 0) {
    issues.push(`Negative feed force Ff=${resultData.Ff}N`);
    score -= 0.3;
  }
  
  // Check for negative/zero power
  if (resultData?.power !== undefined && resultData.power < 0) {
    issues.push(`Negative power=${resultData.power}kW — physically impossible`);
    score -= 0.5;
  }
  if (resultData?.power_at_tool !== undefined && resultData.power_at_tool < 0) {
    issues.push(`Negative power_at_tool=${resultData.power_at_tool}kW`);
    score -= 0.5;
  }
  
  // Check extreme power values
  if (resultData?.power !== undefined && resultData.power > SAFETY_THRESHOLDS.max_power_warning) {
    issues.push(`Power ${resultData.power}kW exceeds ${SAFETY_THRESHOLDS.max_power_warning}kW warning threshold`);
    score -= 0.15;
  }
  if (resultData?.power_at_spindle !== undefined && resultData.power_at_spindle > SAFETY_THRESHOLDS.max_power_warning) {
    issues.push(`Spindle power ${resultData.power_at_spindle}kW exceeds warning threshold`);
    score -= 0.15;
  }
  
  // Check tool life validity
  if (resultData?.tool_life_minutes !== undefined && resultData.tool_life_minutes < SAFETY_THRESHOLDS.min_tool_life) {
    issues.push(`Tool life ${resultData.tool_life_minutes}min below minimum ${SAFETY_THRESHOLDS.min_tool_life}min — tool will fail immediately`);
    score -= 0.4;
  }
  
  // Check for NaN/Infinity in any numeric results
  if (resultData && typeof resultData === 'object') {
    for (const [key, val] of Object.entries(resultData)) {
      if (typeof val === 'number' && (!isFinite(val) || isNaN(val))) {
        issues.push(`${key} is ${val} — calculation error`);
        score -= 0.5;
      }
    }
  }
  
  // Check deflection safety
  if (resultData?.static_deflection !== undefined && resultData.static_deflection > 0.1) {
    issues.push(`Deflection ${resultData.static_deflection}mm may exceed tolerance — check tool overhang`);
    score -= 0.1;
  }
  
  // Check stability
  if (resultData?.is_stable === false) {
    issues.push(`CHATTER PREDICTED — reduce depth of cut or change spindle speed`);
    score -= 0.3;
  }
  
  return {
    is_valid: score >= SAFETY_THRESHOLDS.lambda_min,
    lambda_score: Math.max(0, Math.min(1, score)),
    issues,
  };
}

// ============================================================================
// SERVER PROXY
// ============================================================================

function isCalcTool(name: string): boolean {
  return CALC_TOOL_PREFIXES.some(prefix => name.startsWith(prefix));
}

/**
 * Creates a proxy around McpServer that auto-wraps calc tool handlers
 * with Λ(x) safety validation and hook firing.
 * 
 * Non-calc tools pass through unchanged.
 */
export function createHookedServer(server: any): any {
  const originalTool = server.tool.bind(server);
  
  // Count for logging
  let calcToolCount = 0;
  let passThroughCount = 0;
  
  // Create proxy object that looks like a server
  const proxy = Object.create(server);
  
  proxy.tool = function(name: string, description: string, schema: any, handler: Function) {
    if (isCalcTool(name)) {
      calcToolCount++;
      wrappedTools.add(name);
      
      // Wrap the handler with safety hooks
      const wrappedHandler = async (...args: any[]) => {
        const startTime = Date.now();
        const params = args[0] || {};
        
        // ── BEFORE EXECUTION ──
        log.debug(`[AutoHook:BEFORE] ${name} — inputs: ${Object.keys(params).join(', ')}`);
        
        logExecution({
          timestamp: new Date().toISOString(),
          tool_name: name,
          event: 'calculation:before',
          success: true,
          duration_ms: 0,
        });
        
        // ── EXECUTE ──
        let result: any;
        try {
          result = await handler(...args);
        } catch (error: any) {
          const duration = Date.now() - startTime;
          log.error(`[AutoHook:ERROR] ${name} failed: ${error.message}`);
          
          logExecution({
            timestamp: new Date().toISOString(),
            tool_name: name,
            event: 'error:detected',
            success: false,
            duration_ms: duration,
            issues: [error.message],
          });
          
          throw error;
        }
        
        const duration = Date.now() - startTime;
        
        // ── AFTER EXECUTION: Λ(x) SAFETY PROOF ──
        const proof = validateSafetyProof(name, params, result);
        
        logExecution({
          timestamp: new Date().toISOString(),
          tool_name: name,
          event: proof.is_valid ? 'calculation:validated' : 'safety:violation',
          success: proof.is_valid,
          duration_ms: duration,
          lambda_score: proof.lambda_score,
          issues: proof.issues.length > 0 ? proof.issues : undefined,
        });
        
        if (!proof.is_valid) {
          log.warn(`[AutoHook:Λ(x)=${proof.lambda_score.toFixed(2)}] ${name} — ${proof.issues.join('; ')}`);
        } else {
          log.debug(`[AutoHook:Λ(x)=${proof.lambda_score.toFixed(2)}] ${name} — VALIDATED in ${duration}ms`);
        }
        
        // Inject safety metadata into result if it's an object
        if (proof.issues.length > 0 && result && typeof result === 'object') {
          // For MCP responses with content array, append safety info to text
          if (result.content && Array.isArray(result.content) && result.content[0]?.text) {
            try {
              const parsed = JSON.parse(result.content[0].text);
              parsed._safety_validation = {
                lambda_score: proof.lambda_score,
                is_valid: proof.is_valid,
                issues: proof.issues,
                validated_at: new Date().toISOString(),
              };
              result.content[0].text = JSON.stringify(parsed, null, 2);
            } catch {
              // If not JSON, append as text
              result.content[0].text += `\n\n⚠️ SAFETY VALIDATION [Λ(x)=${proof.lambda_score.toFixed(2)}]: ${proof.issues.join('; ')}`;
            }
          }
        }
        
        return result;
      };
      
      // Register with wrapped handler
      return originalTool(name, description, schema, wrappedHandler);
    } else {
      passThroughCount++;
      // Non-calc tools pass through unchanged
      return originalTool(name, description, schema, handler);
    }
  };
  
  // Copy all other server methods (resource, etc.)
  // The Object.create(server) already delegates via prototype chain
  
  // Add stats method
  proxy._getHookStats = () => ({
    calc_tools_wrapped: calcToolCount,
    pass_through: passThroughCount,
    tools: [...wrappedTools],
  });
  
  log.info('[AutoHook] Server proxy created — calc tools will be auto-wrapped with Λ(x) validation');
  
  return proxy;
}

// ============================================================================
// STANDALONE VALIDATION (for manual use)
// ============================================================================

export { validateSafetyProof, SAFETY_THRESHOLDS, INPUT_RANGES };
