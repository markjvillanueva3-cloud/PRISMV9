/**
 * Omega Dispatcher - Quality equation with auto-scoring
 * Actions: compute, breakdown, validate, optimize, history, auto_score
 * Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L
 * HARD CONSTRAINT: S(x) ≥ 0.70 or BLOCKED
 *
 * Integration:
 *   - auto_score pulls R/C/P/L from SP cog.metrics, S from computeSafetyScore
 *   - omegaQuick() exported for SP, ATCS, RoadmapExecutor
 *   - Emits QUALITY_SCORE_UPDATED events on every compute
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError } from "../../utils/dispatcherMiddleware.js";
import type { OmegaHistoryEntry } from "../../types/prism-schema.js";
import { computeSafetyScore } from "../../utils/validators.js";
import { eventBus, EventTypes } from "../../engines/EventBus.js";
import { getCogMetrics } from "./spDispatcher.js";

const DEFAULT_WEIGHTS = { R: 0.25, C: 0.20, P: 0.15, S: 0.30, L: 0.10 };
const THRESHOLDS = { RELEASE: 0.70, ACCEPTABLE: 0.65, WARNING: 0.50, SAFETY_MIN: 0.70 };

/** Clamp a component score to [0, 1] range */
function clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }

/** Exported for cross-dispatcher use (SP, ATCS, RoadmapExecutor) */
export { DEFAULT_WEIGHTS as OMEGA_WEIGHTS, THRESHOLDS as OMEGA_THRESHOLDS };
export function omegaQuick(R: number, C: number, P: number, S: number, L: number): number {
  return Math.round((0.25*clamp01(R) + 0.20*clamp01(C) + 0.15*clamp01(P) + 0.30*clamp01(S) + 0.10*clamp01(L)) * 10000) / 10000;
}

// OmegaHistoryEntry — imported from prism-schema
let omegaHistory: OmegaHistoryEntry[] = [];

function computeOmega(components: { R: number; C: number; P: number; S: number; L: number }) {
  const R = clamp01(components.R), C = clamp01(components.C), P = clamp01(components.P),
        S = clamp01(components.S), L = clamp01(components.L);
  const clamped = { R, C, P, S, L };
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
  const compArray = Object.entries(clamped);
  const minComp = compArray.reduce((min, curr) => curr[1] < min[1] ? curr : min);
  if (minComp[1] < 0.7 && safetyPassed) recommendations.push(`Improve ${minComp[0]} (${minComp[1].toFixed(2)}) - lowest`);
  if (omega < THRESHOLDS.RELEASE) recommendations.push(`Need +${(THRESHOLDS.RELEASE - omega).toFixed(2)} to reach RELEASE_READY`);
  const entry: OmegaHistoryEntry = { timestamp: new Date().toISOString(), score: Math.round(omega * 10000) / 10000, components: clamped, status };
  omegaHistory.push(entry);
  if (omegaHistory.length > 100) omegaHistory = omegaHistory.slice(-100);
  try {
    eventBus.publish(EventTypes.QUALITY_SCORE_UPDATED, {
      omega: entry.score, status, components: clamped, safety_passed: safetyPassed,
    }, { category: "quality", priority: safetyPassed ? "normal" : "high", source: "OmegaDispatcher" });
  } catch { /* event emission is best-effort */ }
  return {
    omega: Math.round(omega * 10000) / 10000, components: clamped, weights: DEFAULT_WEIGHTS, status,
    hard_constraint_passed: safetyPassed,
    breakdown: Object.fromEntries(Object.entries(breakdown).map(([k, v]) => [k, Math.round(v * 10000) / 10000])),
    recommendations: recommendations.slice(0, 5), timestamp: entry.timestamp,
  };
}

const ACTIONS = ["compute", "breakdown", "validate", "optimize", "history", "auto_score"] as const;

export function registerOmegaDispatcher(server: any): void {
  server.tool(
    "prism_omega",
    `Omega quality equation dispatcher. Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L. HARD CONSTRAINT: S(x) ≥ 0.70 or BLOCKED.
Actions: compute, breakdown, validate, optimize, history, auto_score.
auto_score: Auto-derive all 5 components. Pulls R/C/P/L from SP cog.metrics, S from material via computeSafetyScore. Override any with explicit params. All inputs clamped to [0,1].
Thresholds: RELEASE≥0.70, ACCEPTABLE≥0.65, WARNING≥0.50`,
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
          case "auto_score": {
            // Auto-derive all 5 components from available subsystems
            const sources: Record<string, { value: number; source: string }> = {};
            let R_auto = R, C_auto = C, P_auto = P, S_auto = S, L_auto = L;

            // Pull R/C/P/L from SP cog.metrics if no explicit override
            try {
              const cog = getCogMetrics();
              if (params.R === undefined) { R_auto = cog.R; sources.R = { value: cog.R, source: "SP cog.metrics" }; }
              if (params.C === undefined) { C_auto = cog.C; sources.C = { value: cog.C, source: "SP cog.metrics" }; }
              if (params.P === undefined) { P_auto = cog.P; sources.P = { value: cog.P, source: "SP cog.metrics" }; }
              if (params.L === undefined) { L_auto = cog.L; sources.L = { value: cog.L, source: "SP cog.metrics" }; }
              if (params.S === undefined && !params.material) { S_auto = cog.S; sources.S = { value: cog.S, source: "SP cog.metrics" }; }
            } catch { /* SP not available — use defaults */ }

            // S from material data overrides SP (most authoritative source)
            if (params.material && typeof params.material === "object") {
              const safetyResult = computeSafetyScore(params.material as Record<string, unknown>);
              S_auto = safetyResult.score;
              sources.S = { value: S_auto, source: `computeSafetyScore (${safetyResult.status})` };
            }

            // Record explicit overrides
            if (params.R !== undefined && !sources.R) sources.R = { value: R_auto, source: "explicit" };
            if (params.C !== undefined && !sources.C) sources.C = { value: C_auto, source: "explicit" };
            if (params.P !== undefined && !sources.P) sources.P = { value: P_auto, source: "explicit" };
            if (params.S !== undefined && !sources.S) sources.S = { value: S_auto, source: "explicit" };
            if (params.L !== undefined && !sources.L) sources.L = { value: L_auto, source: "explicit" };

            const autoResult = computeOmega({ R: R_auto, C: C_auto, P: P_auto, S: S_auto, L: L_auto });
            result = { ...autoResult, auto_derived: sources };
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
  // Subscribe to quality events for telemetry logging
  eventBus.subscribe(EventTypes.QUALITY_SCORE_UPDATED, (event) => {
    const p = event.payload as { omega: number; status: string; safety_passed: boolean };
    log.info(`[OmegaTelemetry] Ω=${p.omega} status=${p.status} safety=${p.safety_passed}`);
    if (!p.safety_passed) {
      log.warn(`[OmegaTelemetry] SAFETY BLOCKED — S(x) < 0.70`);
    }
  }, { category: "quality" });

  eventBus.subscribe(EventTypes.QUALITY_GATE_FAILED, (event) => {
    const p = event.payload as { gate: string; reason: string };
    log.warn(`[OmegaTelemetry] Gate FAILED: ${p.gate} — ${p.reason}`);
  }, { category: "quality" });

  log.info("✅ Registered: prism_omega dispatcher (6 actions + quality subscribers)");
}
