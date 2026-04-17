/**
 * WEDMSelfAwarenessEngine.ts — MS-P1-DIGEST-SELFAWARENESS U-P1-SA-01
 *
 * Provides the AI with comprehensive awareness of the WEDM subsystem:
 * - Engine inventory from WEDM_DIGEST.json
 * - Real-time coordination substrate state
 * - Autonomy level and capabilities
 * - Learning loop status
 * - Health metrics and warnings
 *
 * This engine enables the AI to:
 * 1. Know what WEDM capabilities exist
 * 2. Understand current substrate health
 * 3. Report its own operational state to users
 * 4. Make informed decisions based on self-knowledge
 */

import { promises as fs } from "fs";
import path from "path";
import { wedmMultiAgentDispatchEngine } from "./WEDMMultiAgentDispatchEngine.js";
import { wedmReasoningTraceLedgerEngine } from "./WEDMReasoningTraceLedgerEngine.js";
import { wedmBlackboardEngine } from "./WEDMBlackboardEngine.js";
import { wedmReasoningBridgeEngine } from "./WEDMReasoningBridgeEngine.js";
import { wedmAutonomyEngine, type AutonomyLevel, type AutonomyCapability } from "./WEDMAutonomyEngine.js";
import { wedmAutonomySubstrateGateEngine } from "./WEDMAutonomySubstrateGateEngine.js";
import { wedmFeedbackIngestionEngine } from "./WEDMFeedbackIngestionEngine.js";
import { wedmTribalTipLearnerEngine } from "./WEDMTribalTipLearnerEngine.js";
import { wedmTribalRuntimeEngine } from "./WEDMTribalRuntimeEngine.js";

// ── Types ────────────────────────────────────────────────────────────────

export interface WEDMDigest {
  schemaVersion: number;
  generated: string;
  source: string;
  engines: {
    count: number;
    names: string[];
    byCategory?: Record<string, string[]>;
  };
  skills?: {
    count: number;
    names: string[];
  };
  hooks?: {
    count: number;
    names: string[];
  };
  playbooks?: {
    count: number;
    names: string[];
  };
  stateFiles?: {
    count: number;
    names: string[];
  };
  tribalTips?: {
    count: number;
    sources: string[];
  };
  formulas?: {
    count: number;
    names: string[];
  };
}

export interface SubstrateState {
  ledger: {
    totalTraces: number;
    errorRate: number;
    awarenessAdoption: number;
    silentMinutes: number;
    topActions: Array<{ action: string; count: number }>;
    lastTraceAt: string | null;
  };
  blackboard: {
    totalEntries: number;
    activeEntries: number;
    namespaceCount: number;
  };
  bridge: {
    totalBridges: number;
    avgLatencyMs: number;
    avgTipsIngested: number;
  };
  dispatch: {
    totalCoordinations: number;
    totalOutcomes: number;
    decisionsPosted: number;
  };
}

export interface AutonomyState {
  level: AutonomyLevel;
  levelName: string;
  humanRole: string;
  capabilities: Record<AutonomyCapability, boolean>;
  eligibleForPromotion: boolean;
  degradeWarnings: string[];
}

export interface LearningState {
  feedbackTotal: number;
  successRate: number;
  tipsLearned: number;
  pendingReview: number;
  avgPredictionError: number;
}

export interface TribalState {
  totalTips: number;
  learnedTips: number;
  totalSelections: number;
  topTipsByUse: Array<{ id: string; count: number }>;
}

export interface WEDMSelfAwarenessSnapshot {
  timestamp: string;
  digest: {
    engineCount: number;
    skillCount: number;
    hookCount: number;
    formulaCount: number;
    tipCount: number;
    lastUpdated: string;
  };
  substrate: SubstrateState;
  autonomy: AutonomyState;
  learning: LearningState;
  tribal: TribalState;
  health: {
    overall: "healthy" | "degraded" | "critical";
    issues: string[];
    recommendations: string[];
  };
  capabilities: {
    canSuggestParameters: boolean;
    canAutoAdjust: boolean;
    canExecuteSupervised: boolean;
    canExecuteUnattended: boolean;
    canSelfImprove: boolean;
    learningLoopActive: boolean;
    coordinationActive: boolean;
  };
}

export interface WEDMCapabilityQuery {
  query: string;
  matchedEngines: Array<{
    name: string;
    category?: string;
    confidence: number;
  }>;
  matchedSkills: string[];
  relevantTips: Array<{
    id: string;
    title: string;
    confidence: number;
  }>;
  recommendations: string[];
}

// ── Constants ────────────────────────────────────────────────────────────

const DIGEST_PATH = path.join(
  process.cwd(),
  "data/state/WEDM_DIGEST.json"
);

const HEALTH_THRESHOLDS = {
  criticalErrorRate: 15,
  degradedErrorRate: 5,
  criticalSilentMinutes: 30,
  degradedSilentMinutes: 10,
  minAwarenessHealthy: 70,
  minAwarenessDegraded: 40,
};

// ── Engine ───────────────────────────────────────────────────────────────

class WEDMSelfAwarenessEngine {
  private digest: WEDMDigest | null = null;
  private digestLoadedAt: string | null = null;

  /**
   * Load WEDM_DIGEST.json from disk.
   */
  async loadDigest(): Promise<WEDMDigest | null> {
    try {
      const content = await fs.readFile(DIGEST_PATH, "utf-8");
      this.digest = JSON.parse(content) as WEDMDigest;
      this.digestLoadedAt = new Date().toISOString();
      return this.digest;
    } catch {
      return null;
    }
  }

  /**
   * Get the cached digest, loading if needed.
   */
  async getDigest(): Promise<WEDMDigest | null> {
    if (!this.digest) {
      await this.loadDigest();
    }
    return this.digest;
  }

  /**
   * Get real-time substrate state from coordination engines.
   */
  getSubstrateState(): SubstrateState {
    const ledgerStats = wedmReasoningTraceLedgerEngine.getStats();
    const blackboardStats = wedmBlackboardEngine.getStats();
    const bridgeStats = wedmReasoningBridgeEngine.getStats();
    const dispatchStats = wedmMultiAgentDispatchEngine.getStats();

    return {
      ledger: {
        totalTraces: ledgerStats.totalTraces,
        errorRate: ledgerStats.errorRate,
        awarenessAdoption: ledgerStats.awarenessAdoption,
        silentMinutes: ledgerStats.silentMinutes,
        topActions: ledgerStats.topActions,
        lastTraceAt: ledgerStats.lastTraceAt,
      },
      blackboard: {
        totalEntries: blackboardStats.totalEntries,
        activeEntries: blackboardStats.activeEntries,
        namespaceCount: blackboardStats.namespaceCount,
      },
      bridge: {
        totalBridges: bridgeStats.totalBridges,
        avgLatencyMs: bridgeStats.avgLatencyMs,
        avgTipsIngested: bridgeStats.avgTipsIngested,
      },
      dispatch: {
        totalCoordinations: dispatchStats.totalCoordinations,
        totalOutcomes: dispatchStats.totalOutcomes,
        decisionsPosted: dispatchStats.decisionsPosted,
      },
    };
  }

  /**
   * Get current autonomy state.
   */
  getAutonomyState(): AutonomyState {
    const status = wedmAutonomySubstrateGateEngine.getStatus();
    return {
      level: status.currentLevel,
      levelName: status.levelName,
      humanRole: status.humanRole,
      capabilities: status.capabilities,
      eligibleForPromotion: status.eligibleForPromotion,
      degradeWarnings: status.degradeWarnings,
    };
  }

  /**
   * Get current learning loop state.
   */
  getLearningState(): LearningState {
    const feedbackStats = wedmFeedbackIngestionEngine.getStats();
    const learnerStats = wedmTribalTipLearnerEngine.getStats();

    const successRate = feedbackStats.totalFeedback > 0
      ? (feedbackStats.successfulJobs / feedbackStats.totalFeedback) * 100
      : 0;

    return {
      feedbackTotal: feedbackStats.totalFeedback,
      successRate,
      tipsLearned: learnerStats.learnedCorpusSize,
      pendingReview: learnerStats.pendingReviewCount,
      avgPredictionError: feedbackStats.avgPredictionError,
    };
  }

  /**
   * Get tribal knowledge state.
   */
  getTribalState(): TribalState {
    const stats = wedmTribalRuntimeEngine.getStats();
    return {
      totalTips: stats.totalTipsLoaded,
      learnedTips: wedmTribalRuntimeEngine.getLearnedTipCount(),
      totalSelections: stats.totalSelections,
      topTipsByUse: stats.topTipsByUse,
    };
  }

  /**
   * Calculate overall health assessment.
   */
  assessHealth(substrate: SubstrateState): {
    overall: "healthy" | "degraded" | "critical";
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let overall: "healthy" | "degraded" | "critical" = "healthy";

    // Check error rate
    if (substrate.ledger.errorRate >= HEALTH_THRESHOLDS.criticalErrorRate) {
      overall = "critical";
      issues.push(`Critical error rate: ${substrate.ledger.errorRate.toFixed(1)}%`);
      recommendations.push("Investigate recent errors in trace ledger");
    } else if (substrate.ledger.errorRate >= HEALTH_THRESHOLDS.degradedErrorRate) {
      if (overall === "healthy") overall = "degraded";
      issues.push(`Elevated error rate: ${substrate.ledger.errorRate.toFixed(1)}%`);
    }

    // Check silent minutes
    if (substrate.ledger.silentMinutes >= HEALTH_THRESHOLDS.criticalSilentMinutes) {
      overall = "critical";
      issues.push(`No activity for ${substrate.ledger.silentMinutes.toFixed(0)} minutes`);
      recommendations.push("Check if coordination substrate is running");
    } else if (substrate.ledger.silentMinutes >= HEALTH_THRESHOLDS.degradedSilentMinutes) {
      if (overall === "healthy") overall = "degraded";
      issues.push(`Low activity: ${substrate.ledger.silentMinutes.toFixed(0)} minutes since last trace`);
    }

    // Check awareness adoption
    if (substrate.ledger.awarenessAdoption < HEALTH_THRESHOLDS.minAwarenessDegraded) {
      if (overall === "healthy") overall = "degraded";
      issues.push(`Low awareness adoption: ${substrate.ledger.awarenessAdoption.toFixed(1)}%`);
      recommendations.push("Review dispatcher wiring for awareness middleware");
    } else if (substrate.ledger.awarenessAdoption < HEALTH_THRESHOLDS.minAwarenessHealthy) {
      issues.push(`Awareness adoption below target: ${substrate.ledger.awarenessAdoption.toFixed(1)}%`);
    }

    // Check blackboard activity
    if (substrate.blackboard.activeEntries === 0 && substrate.dispatch.totalCoordinations > 10) {
      issues.push("Blackboard has no active entries despite coordination activity");
      recommendations.push("Check blackboard posting in coordination flow");
    }

    return { overall, issues, recommendations };
  }

  /**
   * Get complete self-awareness snapshot.
   */
  async getSnapshot(): Promise<WEDMSelfAwarenessSnapshot> {
    const digest = await this.getDigest();
    const substrate = this.getSubstrateState();
    const autonomy = this.getAutonomyState();
    const learning = this.getLearningState();
    const tribal = this.getTribalState();
    const health = this.assessHealth(substrate);

    return {
      timestamp: new Date().toISOString(),
      digest: {
        engineCount: digest?.engines.count ?? 0,
        skillCount: digest?.skills?.count ?? 0,
        hookCount: digest?.hooks?.count ?? 0,
        formulaCount: digest?.formulas?.count ?? 0,
        tipCount: digest?.tribalTips?.count ?? 0,
        lastUpdated: digest?.generated ?? "unknown",
      },
      substrate,
      autonomy,
      learning,
      tribal,
      health,
      capabilities: {
        canSuggestParameters: autonomy.capabilities.suggest_parameters,
        canAutoAdjust: autonomy.capabilities.auto_adjust_parameters,
        canExecuteSupervised: autonomy.capabilities.execute_job_supervised,
        canExecuteUnattended: autonomy.capabilities.execute_job_unattended,
        canSelfImprove: autonomy.capabilities.self_modify_policy,
        learningLoopActive: learning.feedbackTotal > 0 || learning.tipsLearned > 0,
        coordinationActive: substrate.dispatch.totalCoordinations > 0,
      },
    };
  }

  /**
   * Query WEDM capabilities by keyword.
   */
  async queryCapabilities(query: string): Promise<WEDMCapabilityQuery> {
    const digest = await this.getDigest();
    const keywords = query.toLowerCase().split(/\s+/);

    const matchedEngines: WEDMCapabilityQuery["matchedEngines"] = [];
    const matchedSkills: string[] = [];
    const recommendations: string[] = [];

    // Search engines
    if (digest?.engines.names) {
      for (const engine of digest.engines.names) {
        const nameLower = engine.toLowerCase();
        const matchCount = keywords.filter(k => nameLower.includes(k)).length;
        if (matchCount > 0) {
          matchedEngines.push({
            name: engine,
            confidence: matchCount / keywords.length,
          });
        }
      }
    }

    // Search skills
    if (digest?.skills?.names) {
      for (const skill of digest.skills.names) {
        const skillLower = skill.toLowerCase();
        if (keywords.some(k => skillLower.includes(k))) {
          matchedSkills.push(skill);
        }
      }
    }

    // Sort by confidence
    matchedEngines.sort((a, b) => b.confidence - a.confidence);

    // Generate recommendations
    if (matchedEngines.length === 0) {
      recommendations.push(`No engines found matching "${query}". Try broader terms.`);
    } else {
      recommendations.push(`Found ${matchedEngines.length} engines. Top match: ${matchedEngines[0].name}`);
    }

    // Get relevant tribal tips
    const tribalResult = wedmTribalRuntimeEngine.select({
      dispatcher: "edm",
      action: "query",
      keywords,
      maxResults: 5,
    });

    return {
      query,
      matchedEngines: matchedEngines.slice(0, 10),
      matchedSkills: matchedSkills.slice(0, 5),
      relevantTips: tribalResult.tips.map(t => ({
        id: t.tip.id,
        title: t.tip.title,
        confidence: t.score / 10, // normalize
      })),
      recommendations,
    };
  }

  /**
   * Generate a human-readable status report.
   */
  async generateStatusReport(): Promise<string> {
    const snapshot = await this.getSnapshot();
    const lines: string[] = [];

    lines.push("## WEDM Subsystem Status Report");
    lines.push(`Generated: ${snapshot.timestamp}`);
    lines.push("");

    // Health
    lines.push(`### Health: ${snapshot.health.overall.toUpperCase()}`);
    if (snapshot.health.issues.length > 0) {
      lines.push("Issues:");
      for (const issue of snapshot.health.issues) {
        lines.push(`  - ${issue}`);
      }
    }
    if (snapshot.health.recommendations.length > 0) {
      lines.push("Recommendations:");
      for (const rec of snapshot.health.recommendations) {
        lines.push(`  - ${rec}`);
      }
    }
    lines.push("");

    // Autonomy
    lines.push(`### Autonomy: L${snapshot.autonomy.level} (${snapshot.autonomy.levelName})`);
    lines.push(`Human role: ${snapshot.autonomy.humanRole}`);
    if (snapshot.autonomy.degradeWarnings.length > 0) {
      lines.push("Warnings:");
      for (const w of snapshot.autonomy.degradeWarnings) {
        lines.push(`  - ${w}`);
      }
    }
    lines.push("");

    // Substrate
    lines.push("### Coordination Substrate");
    lines.push(`  Coordinations: ${snapshot.substrate.dispatch.totalCoordinations}`);
    lines.push(`  Error rate: ${snapshot.substrate.ledger.errorRate.toFixed(1)}%`);
    lines.push(`  Awareness: ${snapshot.substrate.ledger.awarenessAdoption.toFixed(1)}%`);
    lines.push(`  Active blackboard entries: ${snapshot.substrate.blackboard.activeEntries}`);
    lines.push("");

    // Learning
    lines.push("### Learning Loop");
    lines.push(`  Feedback received: ${snapshot.learning.feedbackTotal}`);
    lines.push(`  Tips learned: ${snapshot.learning.tipsLearned}`);
    lines.push(`  Pending review: ${snapshot.learning.pendingReview}`);
    lines.push(`  Avg prediction error: ${snapshot.learning.avgPredictionError.toFixed(1)}%`);
    lines.push("");

    // Digest
    lines.push("### WEDM Inventory");
    lines.push(`  Engines: ${snapshot.digest.engineCount}`);
    lines.push(`  Skills: ${snapshot.digest.skillCount}`);
    lines.push(`  Hooks: ${snapshot.digest.hookCount}`);
    lines.push(`  Tribal tips: ${snapshot.tribal.totalTips} (${snapshot.tribal.learnedTips} learned)`);

    return lines.join("\n");
  }

  /**
   * Reset for testing.
   */
  resetForTests(): void {
    this.digest = null;
    this.digestLoadedAt = null;
  }
}

export const wedmSelfAwarenessEngine = new WEDMSelfAwarenessEngine();
