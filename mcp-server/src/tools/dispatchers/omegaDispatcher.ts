/**
 * Omega Dispatcher - Consolidates 5 omega tools → 1
 * Actions: compute, breakdown, validate, optimize, history
 * Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L
 * HARD CONSTRAINT: S(x) ≥ 0.70 or BLOCKED
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError } from "../../utils/dispatcherMiddleware.js";
import type { OmegaHistoryEntry } from "../../types/prism-schema.js";

const DEFAULT_WEIGHTS = { R: 0.25, C: 0.20, P: 0.15, S: 0.30, L: 0.10 };
const THRESHOLDS = { RELEASE: 0.70, ACCEPTABLE: 0.65, WARNING: 0.50, BLOCKED: 0.40, SAFETY_MIN: 0.70 };

// OmegaHistoryEntry — imported from prism-schema
let omegaHistory: OmegaHistoryEntry[] = [];

function computeOmega(components: { R: number; C: number; P: number; S: number; L: number }) {
  const { R, C, P, S, L } = components;
  const safetyPassed = S >= THRESHOLDS.SAFETY_MIN;
  const breakdown = {
    R_contribution: DEFAULT_WEIGHTS.R * R, C_contribution: DEFAULT_WEIGHTS.C * C,
    P_contribution: DEFAULT_WEIGHTS.P * P, S_contribution: DEFAULT_WEIGHTS.S * S,
    L_contribution: DEFAULT_WEIGHTS.L * L,
  };
  const omega = Object.values(breakdown).reduce((a, b) => a + b, 0);
  let status = !safetyPassed ? "BLOCKED_SAFETY" : omega >= THRESHOLDS.RELEASE ? "RELEASE_READY" :
    omega >= THRESHOLDS.ACCEPTABLE ? "ACCEPTABLE" : omega >= THRESHOLDS.WARNING ? "WARNING" : "BLOCKED";
  const recommendations: string[] = [];
  if (!safetyPassed) recommendations.push(`CRITICAL: Safety score ${S.toFixed(2)} < 0.70. Must fix.`);
  const compArray = Object.entries(components);
  const minComp = compArray.reduce((min, curr) => curr[1] < min[1] ? curr : min);
  if (minComp[1] < 0.7 && safetyPassed) recommendations.push(`Improve ${minComp[0]} (${minComp[1].toFixed(2)}) - lowest`);
  if (omega < THRESHOLDS.RELEASE) recommendations.push(`Need +${(THRESHOLDS.RELEASE - omega).toFixed(2)} to reach RELEASE_READY`);
  const entry: OmegaHistoryEntry = { timestamp: new Date().toISOString(), score: Math.round(omega * 10000) / 10000, components, status };
  omegaHistory.push(entry);
  if (omegaHistory.length > 100) omegaHistory = omegaHistory.slice(-100);
  return {
    omega: Math.round(omega * 10000) / 10000, components, weights: DEFAULT_WEIGHTS, status,
    hard_constraint_passed: safetyPassed,
    breakdown: Object.fromEntries(Object.entries(breakdown).map(([k, v]) => [k, Math.round(v * 10000) / 10000])),
    recommendations: recommendations.slice(0, 5), timestamp: entry.timestamp,
  };
}

const ACTIONS = ["compute", "breakdown", "validate", "optimize", "history"] as const;

export function registerOmegaDispatcher(server: any): void {
  server.tool(
    "prism_omega",
    `Omega quality equation dispatcher. Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L. HARD CONSTRAINT: S(x) ≥ 0.70 or BLOCKED.
Actions: compute, breakdown, validate, optimize, history.
Thresholds: RELEASE≥0.70, ACCEPTABLE≥0.65, WARNING≥0.50, BLOCKED<0.40`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_omega] Action: ${action}`);
      let result: any;
      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }
        const R = params.R ?? 1.0, C = params.C ?? 1.0, P = params.P ?? 1.0, S = params.S ?? 1.0, L = params.L ?? 1.0;
        switch (action) {
          case "compute": { result = computeOmega({ R, C, P, S, L }); break; }
          case "breakdown": {
            const r = computeOmega({ R, C, P, S, L });
            result = {
              omega_score: r.omega, status: r.status, components: r.components, weights: r.weights,
              contributions: r.breakdown,
              contribution_percentages: r.omega > 0 ? {
                R: Math.round((r.breakdown.R_contribution / r.omega) * 1000) / 10,
                C: Math.round((r.breakdown.C_contribution / r.omega) * 1000) / 10,
                P: Math.round((r.breakdown.P_contribution / r.omega) * 1000) / 10,
                S: Math.round((r.breakdown.S_contribution / r.omega) * 1000) / 10,
                L: Math.round((r.breakdown.L_contribution / r.omega) * 1000) / 10,
              } : {},
              hard_constraint: { name: "Safety", threshold: THRESHOLDS.SAFETY_MIN, actual: S, passed: r.hard_constraint_passed },
              thresholds: THRESHOLDS,
              distance_to_release: Math.max(0, Math.round((THRESHOLDS.RELEASE - r.omega) * 10000) / 10000),
            };
            break;
          }
          case "validate": {
            const omega = params.omega, safety = params.S;
            result = {
              omega, safety, thresholds: {
                release: omega !== undefined ? omega >= THRESHOLDS.RELEASE : null,
                acceptable: omega !== undefined ? omega >= THRESHOLDS.ACCEPTABLE : null,
                safety_ok: safety !== undefined ? safety >= THRESHOLDS.SAFETY_MIN : null,
              },
              can_release: omega !== undefined && safety !== undefined ? omega >= THRESHOLDS.RELEASE && safety >= THRESHOLDS.SAFETY_MIN : null,
              can_proceed: safety !== undefined ? safety >= THRESHOLDS.SAFETY_MIN : null,
            };
            break;
          }
          case "optimize": {
            const target = params.target ?? 0.70;
            const current = computeOmega({ R, C, P, S, L });
            const gap = target - current.omega;
            if (gap <= 0) { result = { status: "TARGET_MET", current: current.omega, target, suggestions: [] }; break; }
            const comps = { R, C, P, S, L };
            const suggestions = Object.entries(DEFAULT_WEIGHTS)
              .map(([name, weight]) => ({
                component: name, current: comps[name as keyof typeof comps],
                target: Math.min(1.0, comps[name as keyof typeof comps] + 0.1),
                impact: Math.round(weight * 0.1 * 10000) / 10000, weight, priority: weight >= 0.2 ? "HIGH" : "MEDIUM",
              }))
              .filter(s => s.current < 0.95).sort((a, b) => b.impact - a.impact).slice(0, 5);
            result = { status: "OPTIMIZATION_NEEDED", current: current.omega, target, gap: Math.round(gap * 10000) / 10000, suggestions };
            break;
          }
          case "history": {
            const n = params.n ?? 10;
            result = { history: omegaHistory.slice(-n), count: omegaHistory.length, weights: DEFAULT_WEIGHTS };
            break;
          }
          default: result = { error: `Unknown action: ${action}`, available: ACTIONS };
        }
        return { content: [{ type: "text", text: JSON.stringify(slimResponse(result)) }] };
      } catch (error: any) {
        log.error(`[prism_omega] Error: ${error.message}`);
        return dispatcherError(error, action, "prism_omega");
      }
    }
  );
  log.info("✅ Registered: prism_omega dispatcher (5 actions)");
}
