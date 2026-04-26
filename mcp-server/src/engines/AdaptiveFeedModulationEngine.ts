/**
 * AdaptiveFeedModulationEngine — PRISM Forces Dynamic Feed Control
 *
 * Phase 0.26: Dynamic Adaptive Machining
 *
 * Implements intelligent feed modulation that maintains optimal chip load
 * despite continuously varying engagement using physics-based Kienzle force
 * prediction and real-time engagement analysis. Patent-clean implementation.
 *
 * Key principles:
 * 1. Constant chip load = consistent tool load = predictable tool life
 * 2. As engagement decreases, feed can increase (and vice versa)
 * 3. Look ahead to anticipate engagement changes
 * 4. Consider tool wear state from previous operations
 *
 * @module engines/AdaptiveFeedModulationEngine
 */

import { engagementDynamicsEngine, EngagementProfile, EngagementState } from "./EngagementDynamicsEngine.js";
import { variabilityEnvelopeEngine } from "./VariabilityEnvelopeEngine.js";
import { contextualBoundaryEngine } from "./ContextualBoundaryEngine.js";

export interface ToolState {
  toolId: string;
  currentWearPercent: number; // 0-100
  cuttingTimeMinutes: number;
  materialRemoved: number; // mm³
  lastCutTemperature?: number; // °C
  vibrationLevel?: number; // g
}

export interface AdaptiveFeedConfig {
  targetChipLoad: number; // mm/tooth
  minFeedFactor: number; // e.g., 0.3 = don't go below 30% of base feed
  maxFeedFactor: number; // e.g., 2.5 = can go up to 250% of base feed
  lookaheadPoints: number; // how many points ahead to consider
  smoothingFactor: number; // 0-1, higher = smoother transitions
  wearCompensation: boolean;
  thermalCompensation: boolean;
}

export interface FeedModulationResult {
  originalFeedrate: number;
  modulatedFeedrate: number;
  modulationFactor: number;
  reason: string;
  constraints: string[];
}

export interface SegmentFeedPlan {
  segmentId: string;
  baseFeedrate: number;
  modulatedFeeds: FeedModulationResult[];
  avgModulation: number;
  peakModulation: number;
  minModulation: number;
  estimatedTimeReduction: number; // percentage
}

class AdaptiveFeedModulationEngine {
  private toolStates: Map<string, ToolState> = new Map();
  private defaultConfig: AdaptiveFeedConfig = {
    targetChipLoad: 0.1, // mm/tooth
    minFeedFactor: 0.3,
    maxFeedFactor: 2.0,
    lookaheadPoints: 5,
    smoothingFactor: 0.7,
    wearCompensation: true,
    thermalCompensation: true,
  };

  /**
   * Update tool state after operations
   */
  updateToolState(state: ToolState): void {
    this.toolStates.set(state.toolId, state);
  }

  /**
   * Get tool wear compensation factor
   * As tool wears, we reduce feed to maintain quality
   */
  private getWearCompensation(toolId: string): number {
    const state = this.toolStates.get(toolId);
    if (!state) return 1.0;

    // Linear wear compensation: at 100% wear, reduce to 70% feed
    const wearFactor = 1 - (state.currentWearPercent / 100) * 0.3;
    return Math.max(0.7, wearFactor);
  }

  /**
   * Get thermal compensation factor
   * Hot tool = softer cutting edge = need to reduce aggression
   */
  private getThermalCompensation(toolId: string): number {
    const state = this.toolStates.get(toolId);
    if (!state || !state.lastCutTemperature) return 1.0;

    // Above 400°C, start reducing feed
    if (state.lastCutTemperature < 400) return 1.0;
    if (state.lastCutTemperature > 800) return 0.6;

    // Linear interpolation
    return 1 - ((state.lastCutTemperature - 400) / 400) * 0.4;
  }

  /**
   * Calculate modulated feed for a single engagement state
   */
  modulateFeed(
    engagement: EngagementState,
    baseFeedrate: number,
    toolId: string,
    config: Partial<AdaptiveFeedConfig> = {}
  ): FeedModulationResult {
    const cfg = { ...this.defaultConfig, ...config };
    const constraints: string[] = [];
    let factor = 1.0;
    let reason = "nominal";

    // 1. Chip load compensation
    // Goal: maintain targetChipLoad despite varying engagement
    if (engagement.effectiveChipLoad > 0) {
      const chipLoadRatio = cfg.targetChipLoad / engagement.effectiveChipLoad;
      factor *= chipLoadRatio;
      if (chipLoadRatio !== 1) {
        reason = chipLoadRatio > 1 ? "low engagement - feed increase" : "high engagement - feed decrease";
      }
    }

    // 2. Engagement angle compensation
    // Full slotting (180°) needs much lower feed than peripheral (30°)
    if (engagement.engagementAngle > 120) {
      const slottingFactor = 0.5 + (180 - engagement.engagementAngle) / 120;
      factor *= slottingFactor;
      constraints.push(`slotting compensation: ${(slottingFactor * 100).toFixed(0)}%`);
    }

    // 3. Tool wear compensation
    if (cfg.wearCompensation) {
      const wearFactor = this.getWearCompensation(toolId);
      if (wearFactor < 1) {
        factor *= wearFactor;
        constraints.push(`wear compensation: ${(wearFactor * 100).toFixed(0)}%`);
      }
    }

    // 4. Thermal compensation
    if (cfg.thermalCompensation) {
      const thermalFactor = this.getThermalCompensation(toolId);
      if (thermalFactor < 1) {
        factor *= thermalFactor;
        constraints.push(`thermal compensation: ${(thermalFactor * 100).toFixed(0)}%`);
      }
    }

    // 5. Query contextual boundary limits
    const boundaryContext = {
      tool: { type: "endmill", condition: 100 - (this.toolStates.get(toolId)?.currentWearPercent || 0) },
      operation: { type: "milling", engagement: engagement.radialEngagement * 100 },
    };
    const feedBound = contextualBoundaryEngine.calculateBoundary("feed_rate", boundaryContext);

    // 6. Clamp to config limits
    factor = Math.max(cfg.minFeedFactor, Math.min(cfg.maxFeedFactor, factor));

    // 7. Clamp to machine/context limits
    let modulatedFeedrate = baseFeedrate * factor;
    if (modulatedFeedrate > feedBound.maxRecommended) {
      modulatedFeedrate = feedBound.maxRecommended;
      factor = modulatedFeedrate / baseFeedrate;
      constraints.push(`capped by machine limit: ${feedBound.maxRecommended}`);
    }

    return {
      originalFeedrate: baseFeedrate,
      modulatedFeedrate,
      modulationFactor: factor,
      reason,
      constraints,
    };
  }

  /**
   * Calculate feed plan for entire segment with lookahead smoothing
   */
  calculateSegmentFeedPlan(
    profile: EngagementProfile,
    baseFeedrate: number,
    toolId: string,
    config: Partial<AdaptiveFeedConfig> = {}
  ): SegmentFeedPlan {
    const cfg = { ...this.defaultConfig, ...config };
    const modulatedFeeds: FeedModulationResult[] = [];

    // First pass: calculate raw modulation
    const rawFactors: number[] = profile.states.map(state =>
      this.modulateFeed(state, baseFeedrate, toolId, config).modulationFactor
    );

    // Second pass: apply lookahead smoothing
    for (let i = 0; i < profile.states.length; i++) {
      // Look ahead to see what's coming
      let lookaheadMin = rawFactors[i];
      for (let j = i + 1; j < Math.min(i + cfg.lookaheadPoints, profile.states.length); j++) {
        lookaheadMin = Math.min(lookaheadMin, rawFactors[j]);
      }

      // Smooth the transition
      const smoothedFactor = rawFactors[i] * (1 - cfg.smoothingFactor) +
                             lookaheadMin * cfg.smoothingFactor;

      // Recalculate with smoothed factor
      const result = this.modulateFeed(profile.states[i], baseFeedrate, toolId, config);
      result.modulationFactor = smoothedFactor;
      result.modulatedFeedrate = baseFeedrate * smoothedFactor;

      if (smoothedFactor < rawFactors[i]) {
        result.reason += " (pre-emptive reduction)";
      }

      modulatedFeeds.push(result);
    }

    // Calculate statistics
    const factors = modulatedFeeds.map(f => f.modulationFactor);
    const avgModulation = factors.reduce((a, b) => a + b, 0) / factors.length;
    const peakModulation = Math.max(...factors);
    const minModulation = Math.min(...factors);

    // Estimate time savings compared to constant feed at min safe level
    const constantTimeFactor = minModulation; // If we used min safe feed everywhere
    const adaptiveTimeFactor = avgModulation;
    const estimatedTimeReduction = ((constantTimeFactor / adaptiveTimeFactor) - 1) * 100;

    return {
      segmentId: profile.segmentId,
      baseFeedrate,
      modulatedFeeds,
      avgModulation,
      peakModulation,
      minModulation,
      estimatedTimeReduction: Math.max(0, estimatedTimeReduction),
    };
  }

  /**
   * Generate G-code feed commands with modulation
   */
  generateModulatedGCode(plan: SegmentFeedPlan): string[] {
    const gcode: string[] = [];
    let lastFeed = -1;

    for (const result of plan.modulatedFeeds) {
      const feed = Math.round(result.modulatedFeedrate);
      if (feed !== lastFeed) {
        gcode.push(`F${feed}`);
        lastFeed = feed;
      }
    }

    return gcode;
  }

  /**
   * Get cumulative tool state across operations
   */
  getCumulativeToolState(toolId: string): ToolState | undefined {
    return this.toolStates.get(toolId);
  }

  /**
   * Reset tool state (new tool)
   */
  resetToolState(toolId: string): void {
    this.toolStates.set(toolId, {
      toolId,
      currentWearPercent: 0,
      cuttingTimeMinutes: 0,
      materialRemoved: 0,
    });
  }

  /**
   * Accumulate cutting from a segment
   */
  accumulateCutting(
    toolId: string,
    profile: EngagementProfile,
    feedPlan: SegmentFeedPlan
  ): void {
    const state = this.toolStates.get(toolId) || {
      toolId,
      currentWearPercent: 0,
      cuttingTimeMinutes: 0,
      materialRemoved: 0,
    };

    // Sum up material removal
    const totalMRR = profile.states.reduce((sum, s) => sum + s.materialRemovalRate, 0);
    const avgMRR = totalMRR / profile.states.length;

    // Estimate cutting time from feed plan
    // Simplified: assume constant segment length
    const segmentTime = feedPlan.modulatedFeeds.length / feedPlan.avgModulation / 60;

    state.cuttingTimeMinutes += segmentTime;
    state.materialRemoved += avgMRR * segmentTime;

    // Estimate wear progression (Taylor-based)
    // Simplified: 1% wear per minute at reference speed
    state.currentWearPercent += segmentTime * 1.0;
    state.currentWearPercent = Math.min(100, state.currentWearPercent);

    this.toolStates.set(toolId, state);
  }
}

export const adaptiveFeedModulationEngine = new AdaptiveFeedModulationEngine();
