/**
 * WEDMAutonomySubstrateGateEngine.ts — MS-P1-AUTONOMY U-P1-AUT-01
 *
 * Gates autonomy level transitions based on coordination substrate health:
 * - Monitors ledger error rate, awareness adoption, silent minutes
 * - Monitors blackboard activity, bridge latency
 * - Monitors learning loop health (feedback rate, tip approval rate)
 *
 * Health thresholds per level:
 *   L0→L1 (Assisted): minimal — just needs substrate running
 *   L1→L2 (Semi-auto): error_rate < 10%, awareness > 50%, silent < 10min
 *   L2→L3 (Supervised): error_rate < 5%, awareness > 70%, silent < 5min, learning active
 *   L3→L4 (Full auto): requires counter-sign + error_rate < 2%, awareness > 85%
 *   L4→L5 (Self-improving): requires counter-sign + sustained L4 health > 24h
 *
 * Auto-degrade triggers:
 *   - error_rate > 15% → degrade to max L1
 *   - silent_minutes > 30 → degrade to max L2
 *   - awareness < 30% → degrade to max L1
 */

import { wedmAutonomyEngine, type AutonomyLevel, type AutonomyCapability } from "./WEDMAutonomyEngine.js";
import { wedmMultiAgentDispatchEngine } from "./WEDMMultiAgentDispatchEngine.js";
import { wedmReasoningTraceLedgerEngine } from "./WEDMReasoningTraceLedgerEngine.js";
import { wedmBlackboardEngine } from "./WEDMBlackboardEngine.js";
import { wedmReasoningBridgeEngine } from "./WEDMReasoningBridgeEngine.js";
import { wedmFeedbackIngestionEngine } from "./WEDMFeedbackIngestionEngine.js";
import { wedmTribalTipLearnerEngine } from "./WEDMTribalTipLearnerEngine.js";

// ── Types ────────────────────────────────────────────────────────────────

export interface SubstrateHealthMetrics {
  errorRate: number;
  awarenessAdoption: number;
  silentMinutes: number;
  blackboardActive: number;
  bridgeLatencyMs: number;
  feedbackTotal: number;
  tipsLearned: number;
  coordinations: number;
  lastActivityAt: string | null;
}

export interface LevelRequirements {
  level: AutonomyLevel;
  name: string;
  requirements: {
    maxErrorRate: number;
    minAwarenessAdoption: number;
    maxSilentMinutes: number;
    minCoordinations?: number;
    minFeedbackCount?: number;
    requiresCounterSign?: boolean;
    sustainedHours?: number;
  };
}

export interface HealthGateResult {
  eligible: boolean;
  currentLevel: AutonomyLevel;
  targetLevel: AutonomyLevel;
  metrics: SubstrateHealthMetrics;
  requirements: LevelRequirements["requirements"];
  failedChecks: string[];
  passedChecks: string[];
}

export interface DegradeCheckResult {
  shouldDegrade: boolean;
  currentLevel: AutonomyLevel;
  suggestedFloor: AutonomyLevel;
  triggers: string[];
  metrics: SubstrateHealthMetrics;
}

export interface AutonomyStatusSnapshot {
  currentLevel: AutonomyLevel;
  levelName: string;
  humanRole: string;
  metrics: SubstrateHealthMetrics;
  eligibleForPromotion: boolean;
  promotionBlockers: string[];
  degradeWarnings: string[];
  capabilities: Record<AutonomyCapability, boolean>;
  nextLevelRequirements: LevelRequirements["requirements"] | null;
}

// ── Requirements per level ───────────────────────────────────────────────

const LEVEL_REQUIREMENTS: LevelRequirements[] = [
  {
    level: 0,
    name: "Manual",
    requirements: {
      maxErrorRate: 100,
      minAwarenessAdoption: 0,
      maxSilentMinutes: Infinity,
    },
  },
  {
    level: 1,
    name: "Assisted",
    requirements: {
      maxErrorRate: 50,
      minAwarenessAdoption: 10,
      maxSilentMinutes: 60,
      minCoordinations: 1,
    },
  },
  {
    level: 2,
    name: "Semi-auto",
    requirements: {
      maxErrorRate: 10,
      minAwarenessAdoption: 50,
      maxSilentMinutes: 10,
      minCoordinations: 10,
    },
  },
  {
    level: 3,
    name: "Supervised",
    requirements: {
      maxErrorRate: 5,
      minAwarenessAdoption: 70,
      maxSilentMinutes: 5,
      minCoordinations: 50,
      minFeedbackCount: 5,
    },
  },
  {
    level: 4,
    name: "Full auto",
    requirements: {
      maxErrorRate: 2,
      minAwarenessAdoption: 85,
      maxSilentMinutes: 3,
      minCoordinations: 200,
      minFeedbackCount: 20,
      requiresCounterSign: true,
    },
  },
  {
    level: 5,
    name: "Self-improving",
    requirements: {
      maxErrorRate: 1,
      minAwarenessAdoption: 95,
      maxSilentMinutes: 2,
      minCoordinations: 500,
      minFeedbackCount: 50,
      requiresCounterSign: true,
      sustainedHours: 24,
    },
  },
];

// ── Degrade thresholds ───────────────────────────────────────────────────

const DEGRADE_THRESHOLDS = {
  criticalErrorRate: 15, // degrade to L1
  criticalSilentMinutes: 30, // degrade to L2
  criticalAwarenessLow: 30, // degrade to L1
  highErrorRate: 10, // degrade to L2
};

// ── Engine ───────────────────────────────────────────────────────────────

class WEDMAutonomySubstrateGateEngine {
  private l4SustainedSince: string | null = null;

  /**
   * Collect current substrate health metrics from all coordination engines.
   * Resilient to engines returning partial stats shapes.
   */
  getMetrics(): SubstrateHealthMetrics {
    const ledgerStats = (wedmReasoningTraceLedgerEngine.getStats?.() ?? {}) as any;
    const blackboardStats = (wedmBlackboardEngine.getStats?.() ?? {}) as any;
    const bridgeStats = (wedmReasoningBridgeEngine.getStats?.() ?? {}) as any;
    const dispatchStats = (wedmMultiAgentDispatchEngine.getStats?.() ?? {}) as any;

    let feedbackTotal = 0;
    let tipsLearned = 0;
    try {
      const fb = (wedmFeedbackIngestionEngine.getStats?.() ?? {}) as any;
      feedbackTotal = fb.totalFeedback ?? 0;
      const tl = (wedmTribalTipLearnerEngine.getStats?.() ?? {}) as any;
      tipsLearned = tl.learnedCorpusSize ?? tl.tipsGenerated ?? 0;
    } catch {
      // Engines may not be initialized
    }

    // Derive errorRate if not directly provided (mock provides totalTraces/errorTraces)
    const errorRate = ledgerStats.errorRate
      ?? (ledgerStats.totalTraces ? (ledgerStats.errorTraces / ledgerStats.totalTraces) * 100 : 0);

    return {
      errorRate,
      awarenessAdoption: ledgerStats.awarenessAdoption ?? 0,
      silentMinutes: ledgerStats.silentMinutes ?? 0,
      blackboardActive: blackboardStats.activeEntries ?? blackboardStats.totalPosts ?? 0,
      bridgeLatencyMs: bridgeStats.avgLatencyMs ?? 0,
      feedbackTotal,
      tipsLearned,
      coordinations: dispatchStats.totalCoordinations ?? dispatchStats.totalDispatches ?? 0,
      lastActivityAt: ledgerStats.lastTraceAt ?? null,
    };
  }

  /**
   * Get safe current autonomy level — falls back to getState if getLevel missing.
   */
  private getCurrentLevel(): AutonomyLevel {
    const eng = wedmAutonomyEngine as any;
    if (typeof eng.getLevel === "function") return eng.getLevel();
    const state = typeof eng.getState === "function" ? eng.getState() : null;
    return (state?.currentLevel ?? 0) as AutonomyLevel;
  }

  /**
   * Check if promotion to target level is allowed based on substrate health.
   * Accepts either a target level number or a counterSign string.
   */
  checkPromotionEligibility(arg?: AutonomyLevel | number | string): HealthGateResult {
    const currentLevel = this.getCurrentLevel();
    let counterSign: string | undefined;
    let targetLevel: AutonomyLevel;
    if (typeof arg === "number") {
      targetLevel = Math.max(0, Math.min(arg, 5)) as AutonomyLevel;
    } else if (typeof arg === "string") {
      counterSign = arg;
      targetLevel = Math.min(currentLevel + 1, 5) as AutonomyLevel;
    } else {
      targetLevel = Math.min(currentLevel + 1, 5) as AutonomyLevel;
    }
    const metrics = this.getMetrics();
    const requirements = LEVEL_REQUIREMENTS[targetLevel]?.requirements;

    if (!requirements) {
      return {
        eligible: false,
        currentLevel,
        targetLevel,
        metrics,
        requirements: LEVEL_REQUIREMENTS[currentLevel].requirements,
        failedChecks: ["Already at maximum level"],
        passedChecks: [],
      };
    }

    const failedChecks: string[] = [];
    const passedChecks: string[] = [];

    // Error rate check
    if (metrics.errorRate <= requirements.maxErrorRate) {
      passedChecks.push(`Error rate ${metrics.errorRate.toFixed(1)}% ≤ ${requirements.maxErrorRate}%`);
    } else {
      failedChecks.push(`Error rate ${metrics.errorRate.toFixed(1)}% > ${requirements.maxErrorRate}%`);
    }

    // Awareness adoption check
    if (metrics.awarenessAdoption >= requirements.minAwarenessAdoption) {
      passedChecks.push(`Awareness ${metrics.awarenessAdoption.toFixed(1)}% ≥ ${requirements.minAwarenessAdoption}%`);
    } else {
      failedChecks.push(`Awareness ${metrics.awarenessAdoption.toFixed(1)}% < ${requirements.minAwarenessAdoption}%`);
    }

    // Silent minutes check
    if (metrics.silentMinutes <= requirements.maxSilentMinutes) {
      passedChecks.push(`Silent ${metrics.silentMinutes.toFixed(1)}min ≤ ${requirements.maxSilentMinutes}min`);
    } else {
      failedChecks.push(`Silent ${metrics.silentMinutes.toFixed(1)}min > ${requirements.maxSilentMinutes}min`);
    }

    // Coordination count check
    if (requirements.minCoordinations !== undefined) {
      if (metrics.coordinations >= requirements.minCoordinations) {
        passedChecks.push(`Coordinations ${metrics.coordinations} ≥ ${requirements.minCoordinations}`);
      } else {
        failedChecks.push(`Coordinations ${metrics.coordinations} < ${requirements.minCoordinations}`);
      }
    }

    // Feedback count check
    if (requirements.minFeedbackCount !== undefined) {
      if (metrics.feedbackTotal >= requirements.minFeedbackCount) {
        passedChecks.push(`Feedback ${metrics.feedbackTotal} ≥ ${requirements.minFeedbackCount}`);
      } else {
        failedChecks.push(`Feedback ${metrics.feedbackTotal} < ${requirements.minFeedbackCount}`);
      }
    }

    // Counter-sign check
    if (requirements.requiresCounterSign && !counterSign) {
      failedChecks.push("Counter-sign required from second operator");
    } else if (requirements.requiresCounterSign && counterSign) {
      passedChecks.push("Counter-sign provided");
    }

    // Sustained hours check (L4→L5)
    if (requirements.sustainedHours !== undefined) {
      const sustainedOk = this.checkSustainedHealth(requirements.sustainedHours);
      if (sustainedOk) {
        passedChecks.push(`Sustained L4 health for ${requirements.sustainedHours}h`);
      } else {
        failedChecks.push(`Need sustained L4 health for ${requirements.sustainedHours}h`);
      }
    }

    return {
      eligible: failedChecks.length === 0,
      currentLevel,
      targetLevel,
      metrics,
      requirements,
      failedChecks,
      passedChecks,
    };
  }

  /**
   * Check if current health metrics warrant a forced degrade.
   */
  checkDegradeTriggers(): DegradeCheckResult {
    const currentLevel = this.getCurrentLevel();
    const metrics = this.getMetrics();
    const triggers: string[] = [];
    let suggestedFloor: AutonomyLevel = currentLevel;

    // Critical error rate → degrade to L1
    if (metrics.errorRate > DEGRADE_THRESHOLDS.criticalErrorRate) {
      triggers.push(`Critical error rate: ${metrics.errorRate.toFixed(1)}% > ${DEGRADE_THRESHOLDS.criticalErrorRate}%`);
      suggestedFloor = Math.min(suggestedFloor, 1) as AutonomyLevel;
    }

    // Critical silent minutes → degrade to L2
    if (metrics.silentMinutes > DEGRADE_THRESHOLDS.criticalSilentMinutes) {
      triggers.push(`Critical silence: ${metrics.silentMinutes.toFixed(1)}min > ${DEGRADE_THRESHOLDS.criticalSilentMinutes}min`);
      suggestedFloor = Math.min(suggestedFloor, 2) as AutonomyLevel;
    }

    // Critical low awareness → degrade to L1
    if (metrics.awarenessAdoption < DEGRADE_THRESHOLDS.criticalAwarenessLow) {
      triggers.push(`Critical low awareness: ${metrics.awarenessAdoption.toFixed(1)}% < ${DEGRADE_THRESHOLDS.criticalAwarenessLow}%`);
      suggestedFloor = Math.min(suggestedFloor, 1) as AutonomyLevel;
    }

    // High error rate → degrade to L2
    if (metrics.errorRate > DEGRADE_THRESHOLDS.highErrorRate && currentLevel > 2) {
      triggers.push(`High error rate: ${metrics.errorRate.toFixed(1)}% > ${DEGRADE_THRESHOLDS.highErrorRate}%`);
      suggestedFloor = Math.min(suggestedFloor, 2) as AutonomyLevel;
    }

    return {
      shouldDegrade: suggestedFloor < currentLevel,
      currentLevel,
      suggestedFloor,
      triggers,
      metrics,
    };
  }

  /**
   * Attempt to promote autonomy level if health gates pass.
   */
  gatedPromote(opts: { actor?: string; reason?: string; counterSign?: string } = {}): {
    success: boolean;
    newLevel?: AutonomyLevel;
    gate: HealthGateResult;
    error?: string;
  } {
    const gate = this.checkPromotionEligibility(opts.counterSign);

    if (!gate.eligible) {
      return {
        success: false,
        gate,
        error: `Promotion blocked: ${gate.failedChecks.join("; ")}`,
      };
    }

    try {
      wedmAutonomyEngine.promote({
        actor: opts.actor ?? "substrate_gate",
        reason: opts.reason ?? `Health-gated promotion: ${gate.passedChecks.join(", ")}`,
        counterSign: opts.counterSign,
      });

      // Track L4 sustained time
      const newLevel = this.getCurrentLevel();
      if (newLevel === 4 && !this.l4SustainedSince) {
        this.l4SustainedSince = new Date().toISOString();
      }

      return {
        success: true,
        newLevel,
        gate,
      };
    } catch (err) {
      return {
        success: false,
        gate,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Check and apply automatic degrade if triggers are met.
   */
  autoDegrade(): {
    degraded: boolean;
    from?: AutonomyLevel;
    to?: AutonomyLevel;
    triggers: string[];
  } {
    const check = this.checkDegradeTriggers();

    if (!check.shouldDegrade) {
      return { degraded: false, triggers: [] };
    }

    const from = check.currentLevel;
    const result = wedmAutonomyEngine.degrade({
      floorToLevel: check.suggestedFloor,
      actor: "substrate_gate",
      reason: `Auto-degrade: ${check.triggers.join("; ")}`,
    });

    // Clear L4 sustained tracking on degrade
    if (check.suggestedFloor < 4) {
      this.l4SustainedSince = null;
    }

    return {
      degraded: result !== null,
      from,
      to: result?.to,
      triggers: check.triggers,
    };
  }

  /**
   * Get full autonomy status with health metrics and eligibility.
   */
  getStatus(): AutonomyStatusSnapshot {
    const currentLevel = this.getCurrentLevel();
    const metrics = this.getMetrics();
    const promotion = this.checkPromotionEligibility();
    const degrade = this.checkDegradeTriggers();

    const eng = wedmAutonomyEngine as unknown as {
      can?: (cap: AutonomyCapability) => boolean;
      getName?: () => string;
      getHumanRole?: () => string;
      getCapabilities?: () => Record<AutonomyCapability, boolean>;
    };
    const canFn = eng.can ?? (() => false);
    const capsFromMock = eng.getCapabilities?.();
    const capabilities: Record<AutonomyCapability, boolean> = capsFromMock ?? {
      suggest_parameters: canFn("suggest_parameters"),
      auto_adjust_parameters: canFn("auto_adjust_parameters"),
      execute_job_supervised: canFn("execute_job_supervised"),
      execute_job_unattended: canFn("execute_job_unattended"),
      self_modify_policy: canFn("self_modify_policy"),
    };
    const levelName = eng.getName?.() ?? LEVEL_REQUIREMENTS[currentLevel]?.name ?? "Unknown";
    const humanRole = eng.getHumanRole?.() ?? "operator";

    return {
      currentLevel,
      levelName,
      humanRole,
      metrics,
      eligibleForPromotion: promotion.eligible,
      promotionBlockers: promotion.failedChecks,
      degradeWarnings: degrade.triggers,
      capabilities,
      nextLevelRequirements: currentLevel < 5
        ? LEVEL_REQUIREMENTS[currentLevel + 1].requirements
        : null,
    };
  }

  /**
   * Alias for checkDegradeTriggers used by external callers and tests.
   */
  checkDegradeConditions(): DegradeCheckResult {
    return this.checkDegradeTriggers();
  }

  /**
   * Return the health requirements entry for a given autonomy level.
   */
  getLevelRequirements(level: AutonomyLevel): LevelRequirements | null {
    return LEVEL_REQUIREMENTS[level] ?? null;
  }

  /**
   * Check if L4 has been sustained for required hours.
   */
  private checkSustainedHealth(requiredHours: number): boolean {
    if (!this.l4SustainedSince) return false;
    const start = new Date(this.l4SustainedSince).getTime();
    const now = Date.now();
    const hours = (now - start) / (1000 * 60 * 60);
    return hours >= requiredHours;
  }

  /**
   * Reset for testing.
   */
  resetForTests(): void {
    this.l4SustainedSince = null;
    const eng = wedmAutonomyEngine as unknown as { reset?: (lvl: number) => void };
    eng.reset?.(0);
  }
}

export const wedmAutonomySubstrateGateEngine = new WEDMAutonomySubstrateGateEngine();
