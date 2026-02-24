/**
 * PRISM MCP Server - Hook Bridge
 * P0-001: Bridge TypeScript and Python Hook Systems
 * 
 * Routes hook calls to the appropriate server:
 * - Cognitive hooks (BAYES-*, OPT-*, CTX-*, RL-*, GRAD-*, RES-*) → Python server
 * - Phase 0 hooks (CALC-*, FILE-*, STATE-*, AGENT-*, BATCH-*, FORMULA-*) → TypeScript
 * 
 * @version 1.0.0
 * @created 2026-02-04
 */

import { log } from "../utils/Logger.js";
import { hookEngine, type HookDefinition } from "../engines/HookEngine.js";

// NOTE: PHASE0_HOOKS imported dynamically to avoid circular dependency
let PHASE0_HOOKS: HookDefinition[] = [];

// Function to set PHASE0_HOOKS from hookToolsV3.ts after module loads
export function setPhase0Hooks(hooks: HookDefinition[]): void {
  PHASE0_HOOKS = hooks;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const PYTHON_SERVER_URL = "http://localhost:8765";
const PYTHON_HOOK_ENDPOINT = "/hook/fire";
const PYTHON_HOOK_TIMEOUT_MS = 5000;

// Cognitive hook prefixes that route to Python
const COGNITIVE_PREFIXES = [
  "BAYES-",   // Bayesian reasoning hooks
  "OPT-",     // Optimization hooks
  "CTX-",     // Context management hooks
  "RL-",      // Reinforcement learning hooks
  "GRAD-",    // Gradient descent hooks
  "RES-",     // Resource management hooks
  "MULTI-",   // Multi-objective hooks
  "ENSEMBLE-" // Ensemble hooks
];

// ============================================================================
// TYPES
// ============================================================================

export interface HookFireResult {
  success: boolean;
  hookId: string;
  server: "typescript" | "python";
  duration_ms: number;
  result?: unknown;
  error?: string;
  fallback?: boolean;
}

export interface CognitiveHook {
  id: string;
  name: string;
  category: string;
  description: string;
  pattern: string;
  enabled: boolean;
}

// ============================================================================
// COGNITIVE HOOKS REGISTRY (Python-side hooks)
// ============================================================================

export const COGNITIVE_HOOKS: CognitiveHook[] = [
  // Bayesian Hooks
  {
    id: "BAYES-001",
    name: "Bayesian Prior Update",
    category: "bayesian",
    description: "Updates prior probabilities based on new evidence",
    pattern: "BAYES",
    enabled: true
  },
  {
    id: "BAYES-002", 
    name: "Bayesian Change Detection",
    category: "bayesian",
    description: "Detects significant changes in distributions",
    pattern: "BAYES",
    enabled: true
  },
  {
    id: "BAYES-003",
    name: "Bayesian Hypothesis Testing",
    category: "bayesian",
    description: "Tests hypotheses using Bayesian inference",
    pattern: "BAYES",
    enabled: true
  },
  // Optimization Hooks
  {
    id: "OPT-001",
    name: "Optimization Objective Setup",
    category: "optimization",
    description: "Initializes optimization objectives and constraints",
    pattern: "OPT",
    enabled: true
  },
  {
    id: "OPT-002",
    name: "Optimization Iteration",
    category: "optimization", 
    description: "Executes optimization iteration with gradient update",
    pattern: "OPT",
    enabled: true
  },
  {
    id: "OPT-003",
    name: "Optimization Convergence Check",
    category: "optimization",
    description: "Checks convergence criteria for optimization",
    pattern: "OPT",
    enabled: true
  },
  // Context Hooks
  {
    id: "CTX-001",
    name: "Context Compression",
    category: "context",
    description: "Compresses context when approaching limits",
    pattern: "CTX",
    enabled: true
  },
  {
    id: "CTX-002",
    name: "Context Priority Scoring",
    category: "context",
    description: "Scores context elements by relevance",
    pattern: "CTX",
    enabled: true
  },
  {
    id: "CTX-003",
    name: "Context Restoration",
    category: "context",
    description: "Restores externalized context on demand",
    pattern: "CTX",
    enabled: true
  },
  // RL Hooks
  {
    id: "RL-001",
    name: "RL State Capture",
    category: "reinforcement_learning",
    description: "Captures state for RL policy updates",
    pattern: "RL",
    enabled: true
  },
  {
    id: "RL-002",
    name: "RL Reward Assignment",
    category: "reinforcement_learning",
    description: "Assigns rewards based on outcomes",
    pattern: "RL",
    enabled: true
  },
  {
    id: "RL-003",
    name: "RL Policy Update",
    category: "reinforcement_learning",
    description: "Updates policy based on experience",
    pattern: "RL",
    enabled: true
  },
  // Gradient Hooks
  {
    id: "GRAD-001",
    name: "Gradient Computation",
    category: "gradient",
    description: "Computes gradients for optimization",
    pattern: "GRAD",
    enabled: true
  },
  {
    id: "GRAD-002",
    name: "Gradient Descent Step",
    category: "gradient",
    description: "Executes gradient descent update",
    pattern: "GRAD",
    enabled: true
  },
  {
    id: "GRAD-003",
    name: "Gradient Clipping",
    category: "gradient",
    description: "Clips gradients to prevent explosion",
    pattern: "GRAD",
    enabled: true
  },
  // Resource Hooks
  {
    id: "RES-001",
    name: "Resource Allocation",
    category: "resource",
    description: "Allocates resources for task execution",
    pattern: "RES",
    enabled: true
  },
  {
    id: "RES-002",
    name: "Resource Monitoring",
    category: "resource",
    description: "Monitors resource utilization",
    pattern: "RES",
    enabled: true
  },
  {
    id: "RES-003",
    name: "Resource Release",
    category: "resource",
    description: "Releases resources after task completion",
    pattern: "RES",
    enabled: true
  }
];

// ============================================================================
// ROUTING LOGIC
// ============================================================================

/**
 * Determines if a hook should be routed to Python
 */
export function isCognitiveHook(hookId: string): boolean {
  return COGNITIVE_PREFIXES.some(prefix => hookId.startsWith(prefix));
}

/**
 * Gets the server type for a hook
 */
export function getHookServer(hookId: string): "typescript" | "python" {
  return isCognitiveHook(hookId) ? "python" : "typescript";
}

// ============================================================================
// PYTHON SERVER COMMUNICATION
// ============================================================================

let pythonServerAvailable: boolean | null = null;
let lastPythonCheck: number = 0;
const PYTHON_CHECK_INTERVAL_MS = 30000; // Check every 30 seconds

/**
 * Checks if Python server is available
 */
async function checkPythonServer(): Promise<boolean> {
  const now = Date.now();
  
  // Use cached result if recent
  if (pythonServerAvailable !== null && now - lastPythonCheck < PYTHON_CHECK_INTERVAL_MS) {
    return pythonServerAvailable;
  }
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    
    const response = await fetch(`${PYTHON_SERVER_URL}/health`, {
      method: "GET",
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    pythonServerAvailable = response.ok;
    lastPythonCheck = now;
    
    if (pythonServerAvailable) {
      log.info("Python MCP server is available");
    }
    
    return pythonServerAvailable;
  } catch (error) {
    pythonServerAvailable = false;
    lastPythonCheck = now;
    log.warn("Python MCP server not available, will use TypeScript fallback");
    return false;
  }
}

/**
 * Fires a hook on the Python server
 */
async function firePythonHook(hookId: string, data: Record<string, unknown>): Promise<HookFireResult> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PYTHON_HOOK_TIMEOUT_MS);
    
    const response = await fetch(`${PYTHON_SERVER_URL}${PYTHON_HOOK_ENDPOINT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hook_id: hookId, data }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`Python server returned ${response.status}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      hookId,
      server: "python",
      duration_ms: Date.now() - startTime,
      result
    };
  } catch (error) {
    return {
      success: false,
      hookId,
      server: "python",
      duration_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Fires a hook on the TypeScript server
 */
async function fireTypescriptHook(hookId: string, data: Record<string, unknown>): Promise<HookFireResult> {
  const startTime = Date.now();
  
  try {
    // Find the hook
    const hook = hookEngine.getHook(hookId) || PHASE0_HOOKS.find(h => h.id === hookId);
    
    if (!hook) {
      return {
        success: false,
        hookId,
        server: "typescript",
        duration_ms: Date.now() - startTime,
        error: `Hook not found: ${hookId}`
      };
    }
    
    if (!hook.enabled) {
      return {
        success: false,
        hookId,
        server: "typescript",
        duration_ms: Date.now() - startTime,
        error: `Hook is disabled: ${hookId}`
      };
    }
    
    // Execute the hook handler
    const result = hook.handler ? await hook.handler(data as any) : { executed: true };
    
    return {
      success: true,
      hookId,
      server: "typescript",
      duration_ms: Date.now() - startTime,
      result
    };
  } catch (error) {
    return {
      success: false,
      hookId,
      server: "typescript",
      duration_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// ============================================================================
// MAIN BRIDGE FUNCTION
// ============================================================================

/**
 * Universal hook fire function that routes to appropriate server
 * Falls back to TypeScript emulation if Python unavailable
 */
export async function fireHook(
  hookId: string, 
  data: Record<string, unknown> = {},
  options: { validateSafety?: boolean; allowFallback?: boolean } = {}
): Promise<HookFireResult> {
  const { validateSafety = true, allowFallback = true } = options;
  
  // Safety validation if required
  if (validateSafety && data.safetyScore !== undefined) {
    const safetyScore = data.safetyScore as number;
    if (safetyScore < 0.70) {
      return {
        success: false,
        hookId,
        server: isCognitiveHook(hookId) ? "python" : "typescript",
        duration_ms: 0,
        error: `SAFETY BLOCK: S(x)=${safetyScore} < 0.70 threshold`
      };
    }
  }
  
  // Route based on hook type
  if (isCognitiveHook(hookId)) {
    // Check if Python server is available
    const pythonAvailable = await checkPythonServer();
    
    if (pythonAvailable) {
      const result = await firePythonHook(hookId, data);
      if (result.success) {
        return result;
      }
      
      // Python failed, try fallback if allowed
      if (allowFallback) {
        log.warn(`Python hook ${hookId} failed, using TypeScript fallback`);
        const fallbackResult = await emulateInTypescript(hookId, data);
        fallbackResult.fallback = true;
        return fallbackResult;
      }
      
      return result;
    }
    
    // Python not available, use fallback
    if (allowFallback) {
      const fallbackResult = await emulateInTypescript(hookId, data);
      fallbackResult.fallback = true;
      return fallbackResult;
    }
    
    return {
      success: false,
      hookId,
      server: "python",
      duration_ms: 0,
      error: "Python server not available and fallback disabled"
    };
  }
  
  // TypeScript hook
  return fireTypescriptHook(hookId, data);
}

/**
 * Emulates cognitive hooks in TypeScript when Python unavailable
 */
async function emulateInTypescript(hookId: string, data: Record<string, unknown>): Promise<HookFireResult> {
  const startTime = Date.now();
  
  // Find cognitive hook definition
  const cognitiveHook = COGNITIVE_HOOKS.find(h => h.id === hookId);
  
  if (!cognitiveHook) {
    return {
      success: false,
      hookId,
      server: "typescript",
      duration_ms: Date.now() - startTime,
      error: `Unknown cognitive hook: ${hookId}`
    };
  }
  
  if (!cognitiveHook.enabled) {
    return {
      success: false,
      hookId,
      server: "typescript",
      duration_ms: Date.now() - startTime,
      error: `Cognitive hook is disabled: ${hookId}`
    };
  }
  
  // Emulated responses by pattern
  let result: Record<string, unknown>;
  
  switch (cognitiveHook.pattern) {
    case "BAYES":
      result = {
        emulated: true,
        pattern: "BAYES",
        priorUpdated: true,
        posteriorConfidence: 0.85,
        evidenceProcessed: Object.keys(data).length
      };
      break;
      
    case "OPT":
      result = {
        emulated: true,
        pattern: "OPT",
        iteration: 1,
        objectiveValue: data.objective || 0,
        converged: false,
        improvementRate: 0.1
      };
      break;
      
    case "CTX":
      result = {
        emulated: true,
        pattern: "CTX",
        contextSize: data.contextSize || "unknown",
        compressionRatio: 0.7,
        priorityScored: true
      };
      break;
      
    case "RL":
      result = {
        emulated: true,
        pattern: "RL",
        stateRecorded: true,
        reward: data.reward || 0,
        policyUpdated: false
      };
      break;
      
    case "GRAD":
      result = {
        emulated: true,
        pattern: "GRAD",
        gradientNorm: 0.01,
        learningRate: data.learningRate || 0.001,
        stepTaken: true
      };
      break;
      
    case "RES":
      result = {
        emulated: true,
        pattern: "RES",
        resourcesAllocated: true,
        utilizationPercent: 50,
        available: true
      };
      break;
      
    default:
      result = {
        emulated: true,
        pattern: "UNKNOWN",
        processed: true
      };
  }
  
  log.info(`Emulated cognitive hook ${hookId} in TypeScript`);
  
  return {
    success: true,
    hookId,
    server: "typescript",
    duration_ms: Date.now() - startTime,
    result
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gets all available hooks from both systems
 */
export function getAllHooks(): { typescript: HookDefinition[]; cognitive: CognitiveHook[] } {
  return {
    typescript: [...(hookEngine.listHooks?.() || []), ...PHASE0_HOOKS],
    cognitive: COGNITIVE_HOOKS
  };
}

/**
 * Gets hook by ID from either system
 */
export function getHook(hookId: string): HookDefinition | CognitiveHook | null {
  if (isCognitiveHook(hookId)) {
    return COGNITIVE_HOOKS.find(h => h.id === hookId) || null;
  }
  return hookEngine.getHook(hookId) || PHASE0_HOOKS.find(h => h.id === hookId) || null;
}

/**
 * Gets hook counts by server
 */
export function getHookCounts(): { typescript: number; python: number; total: number } {
  const tsHooks = (hookEngine.listHooks?.()?.length || 0) + PHASE0_HOOKS.length;
  const pyHooks = COGNITIVE_HOOKS.length;
  return {
    typescript: tsHooks,
    python: pyHooks,
    total: tsHooks + pyHooks
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  checkPythonServer,
  firePythonHook,
  fireTypescriptHook,
  emulateInTypescript
};
