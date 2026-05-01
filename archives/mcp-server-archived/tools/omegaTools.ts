/**
 * PRISM MCP Server - Omega Integration Tools
 * P6-OMEGA: Master Quality Equation
 * 
 * Tools:
 * - omega_compute: Calculate Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L
 * - omega_breakdown: Detailed contribution analysis
 * - omega_validate: Check against thresholds
 * - omega_optimize: Get improvement suggestions
 * 
 * HARD CONSTRAINT: S(x) ≥ 0.70 or BLOCKED
 * 
 * @version 1.0.0
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_WEIGHTS = {
  R: 0.25,  // Reasoning/Reliability
  C: 0.20,  // Code/Completeness
  P: 0.15,  // Process/Performance
  S: 0.30,  // Safety (highest weight)
  L: 0.10,  // Learning
};

const THRESHOLDS = {
  RELEASE: 0.70,
  ACCEPTABLE: 0.65,
  WARNING: 0.50,
  BLOCKED: 0.40,
  SAFETY_MIN: 0.70,  // Hard constraint
};

// ============================================================================
// SCHEMAS
// ============================================================================

const OmegaComponentsSchema = z.object({
  R: z.number().min(0).max(1).optional().default(0.8).describe("Reasoning score (0-1)"),
  C: z.number().min(0).max(1).optional().default(0.8).describe("Code quality score (0-1)"),
  P: z.number().min(0).max(1).optional().default(0.8).describe("Process score (0-1)"),
  S: z.number().min(0).max(1).optional().default(0.8).describe("Safety score (0-1)"),
  L: z.number().min(0).max(1).optional().default(0.5).describe("Learning score (0-1)"),
});

const OmegaValidateSchema = z.object({
  omega: z.number().optional().describe("Omega score to validate"),
  S: z.number().optional().describe("Safety score"),
});

const OmegaOptimizeSchema = z.object({
  R: z.number().min(0).max(1).optional().default(0.8),
  C: z.number().min(0).max(1).optional().default(0.8),
  P: z.number().min(0).max(1).optional().default(0.8),
  S: z.number().min(0).max(1).optional().default(0.8),
  L: z.number().min(0).max(1).optional().default(0.5),
  target: z.number().optional().default(0.70).describe("Target Omega score"),
});

// ============================================================================
// HISTORY TRACKING
// ============================================================================

interface OmegaHistoryEntry {
  timestamp: string;
  score: number;
  components: { R: number; C: number; P: number; S: number; L: number };
  status: string;
}

let omegaHistory: OmegaHistoryEntry[] = [];

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

function computeOmega(components: { R: number; C: number; P: number; S: number; L: number }) {
  const { R, C, P, S, L } = components;
  
  // Check hard constraint
  const safetyPassed = S >= THRESHOLDS.SAFETY_MIN;
  
  // Calculate weighted sum
  const breakdown = {
    R_contribution: DEFAULT_WEIGHTS.R * R,
    C_contribution: DEFAULT_WEIGHTS.C * C,
    P_contribution: DEFAULT_WEIGHTS.P * P,
    S_contribution: DEFAULT_WEIGHTS.S * S,
    L_contribution: DEFAULT_WEIGHTS.L * L,
  };
  
  const omega = Object.values(breakdown).reduce((a, b) => a + b, 0);
  
  // Determine status
  let status: string;
  if (!safetyPassed) {
    status = "BLOCKED_SAFETY";
  } else if (omega >= THRESHOLDS.RELEASE) {
    status = "RELEASE_READY";
  } else if (omega >= THRESHOLDS.ACCEPTABLE) {
    status = "ACCEPTABLE";
  } else if (omega >= THRESHOLDS.WARNING) {
    status = "WARNING";
  } else {
    status = "BLOCKED";
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  if (!safetyPassed) {
    recommendations.push(`CRITICAL: Safety score ${S.toFixed(2)} < 0.70. Must fix before proceeding.`);
  }
  
  const compArray = Object.entries(components);
  const minComp = compArray.reduce((min, curr) => curr[1] < min[1] ? curr : min);
  if (minComp[1] < 0.7 && safetyPassed) {
    recommendations.push(`Improve ${minComp[0]} score (${minComp[1].toFixed(2)}) - lowest component`);
  }
  
  if (omega < THRESHOLDS.RELEASE) {
    recommendations.push(`Need +${(THRESHOLDS.RELEASE - omega).toFixed(2)} to reach RELEASE_READY (0.70)`);
  }
  
  // Track history
  const entry: OmegaHistoryEntry = {
    timestamp: new Date().toISOString(),
    score: Math.round(omega * 10000) / 10000,
    components,
    status,
  };
  omegaHistory.push(entry);
  if (omegaHistory.length > 100) {
    omegaHistory = omegaHistory.slice(-100);
  }
  
  return {
    omega: Math.round(omega * 10000) / 10000,
    components,
    weights: DEFAULT_WEIGHTS,
    status,
    hard_constraint_passed: safetyPassed,
    breakdown: Object.fromEntries(
      Object.entries(breakdown).map(([k, v]) => [k, Math.round(v * 10000) / 10000])
    ),
    recommendations: recommendations.slice(0, 5),
    timestamp: entry.timestamp,
  };
}

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function registerOmegaTools(server: McpServer): void {
  log.info("Registering Omega Integration tools (P6-OMEGA)...");

  // omega_compute
  server.tool(
    "omega_compute",
    `Compute Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L

Master quality equation. HARD CONSTRAINT: S(x) ≥ 0.70 or BLOCKED.

Thresholds:
- RELEASE_READY: Ω ≥ 0.70
- ACCEPTABLE: Ω ≥ 0.65
- WARNING: Ω ≥ 0.50
- BLOCKED: Ω < 0.40 or S < 0.70`,
    OmegaComponentsSchema.shape,
    async (args) => {
      const { R, C, P, S, L } = OmegaComponentsSchema.parse(args);
      const result = computeOmega({ R, C, P, S, L });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // omega_breakdown
  server.tool(
    "omega_breakdown",
    "Get detailed Omega breakdown with contribution percentages",
    OmegaComponentsSchema.shape,
    async (args) => {
      const { R, C, P, S, L } = OmegaComponentsSchema.parse(args);
      const result = computeOmega({ R, C, P, S, L });
      
      const breakdown = {
        omega_score: result.omega,
        status: result.status,
        components: result.components,
        weights: result.weights,
        contributions: result.breakdown,
        contribution_percentages: result.omega > 0 ? {
          R: Math.round((result.breakdown.R_contribution / result.omega) * 1000) / 10,
          C: Math.round((result.breakdown.C_contribution / result.omega) * 1000) / 10,
          P: Math.round((result.breakdown.P_contribution / result.omega) * 1000) / 10,
          S: Math.round((result.breakdown.S_contribution / result.omega) * 1000) / 10,
          L: Math.round((result.breakdown.L_contribution / result.omega) * 1000) / 10,
        } : {},
        hard_constraint: {
          name: "Safety",
          threshold: THRESHOLDS.SAFETY_MIN,
          actual: S,
          passed: result.hard_constraint_passed,
        },
        thresholds: THRESHOLDS,
        distance_to_release: Math.max(0, Math.round((THRESHOLDS.RELEASE - result.omega) * 10000) / 10000),
      };
      
      return { content: [{ type: "text", text: JSON.stringify(breakdown, null, 2) }] };
    }
  );

  // omega_validate
  server.tool(
    "omega_validate",
    "Validate Omega score against thresholds",
    OmegaValidateSchema.shape,
    async (args) => {
      const { omega, S } = OmegaValidateSchema.parse(args);
      
      const result = {
        omega,
        safety: S,
        thresholds: {
          release: omega !== undefined ? omega >= THRESHOLDS.RELEASE : null,
          acceptable: omega !== undefined ? omega >= THRESHOLDS.ACCEPTABLE : null,
          safety_ok: S !== undefined ? S >= THRESHOLDS.SAFETY_MIN : null,
        },
        can_release: omega !== undefined && S !== undefined 
          ? omega >= THRESHOLDS.RELEASE && S >= THRESHOLDS.SAFETY_MIN 
          : null,
        can_proceed: S !== undefined ? S >= THRESHOLDS.SAFETY_MIN : null,
      };
      
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // omega_optimize
  server.tool(
    "omega_optimize",
    "Get optimization suggestions to reach target Omega",
    OmegaOptimizeSchema.shape,
    async (args) => {
      const { R, C, P, S, L, target } = OmegaOptimizeSchema.parse(args);
      const current = computeOmega({ R, C, P, S, L });
      const gap = target - current.omega;
      
      if (gap <= 0) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "TARGET_MET",
              current: current.omega,
              target,
              suggestions: [],
            }, null, 2)
          }]
        };
      }
      
      // Find most impactful improvements
      const components = { R, C, P, S, L };
      const suggestions = Object.entries(DEFAULT_WEIGHTS)
        .map(([name, weight]) => ({
          component: name,
          current: components[name as keyof typeof components],
          target: Math.min(1.0, components[name as keyof typeof components] + 0.1),
          impact: Math.round(weight * 0.1 * 10000) / 10000,
          weight,
          priority: weight >= 0.2 ? "HIGH" : "MEDIUM",
        }))
        .filter(s => s.current < 0.95)
        .sort((a, b) => b.impact - a.impact)
        .slice(0, 5);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "OPTIMIZATION_NEEDED",
            current: current.omega,
            target,
            gap: Math.round(gap * 10000) / 10000,
            suggestions,
          }, null, 2)
        }]
      };
    }
  );

  // omega_history
  server.tool(
    "omega_history",
    "Get recent Omega calculation history",
    { n: z.number().optional().default(10).describe("Number of entries") },
    async (args) => {
      const n = args.n || 10;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            history: omegaHistory.slice(-n),
            count: omegaHistory.length,
            weights: DEFAULT_WEIGHTS,
          }, null, 2)
        }]
      };
    }
  );

  log.info("✅ Registered 5 Omega Tools (P6-OMEGA)");
}
