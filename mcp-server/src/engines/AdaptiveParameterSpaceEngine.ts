/**
 * AdaptiveParameterSpaceEngine — Expand Parameter Space from Evidence
 *
 * Phase 0.25: Adaptive Variability Framework
 *
 * Manages the explored parameter space and expands it based on successful
 * operations. Never contracts without explicit evidence of failure.
 *
 * @module engines/AdaptiveParameterSpaceEngine
 */

import { variabilityEnvelopeEngine, type VariabilityEnvelope } from "./VariabilityEnvelopeEngine.js";

export interface ParameterPoint {
  parameters: Record<string, number>;
  timestamp: string;
  outcome: "success" | "marginal" | "failure";
  context: Record<string, unknown>;
}

export interface ExploredRegion {
  id: string;
  dimensions: string[];
  bounds: Record<string, { min: number; max: number }>;
  sampleCount: number;
  successRate: number;
  lastUpdated: string;
}

export interface UnexploredGap {
  dimensions: string[];
  bounds: Record<string, { min: number; max: number }>;
  priority: number;
  reason: string;
}

export interface ExpansionEvent {
  timestamp: string;
  parameter: string;
  previousBound: number;
  newBound: number;
  evidence: ParameterPoint[];
  confidence: number;
}

export interface ExplorationTarget {
  parameters: Record<string, number>;
  priority: number;
  reason: string;
  expectedOutcome: "likely_success" | "uncertain" | "risky";
}

class AdaptiveParameterSpaceEngine {
  private exploredPoints: ParameterPoint[] = [];
  private exploredRegions: Map<string, ExploredRegion> = new Map();
  private expansionHistory: ExpansionEvent[] = [];
  private readonly maxHistorySize = 10000;

  /**
   * Record a successful operation to expand the parameter space
   */
  recordOperation(point: ParameterPoint): void {
    this.exploredPoints.push(point);
    if (this.exploredPoints.length > this.maxHistorySize) {
      this.exploredPoints.shift();
    }

    if (point.outcome === "success") {
      this.proposeExpansions(point);
    }

    this.updateExploredRegions(point);
  }

  /**
   * Propose envelope expansions based on successful operation
   */
  private proposeExpansions(point: ParameterPoint): void {
    for (const [param, value] of Object.entries(point.parameters)) {
      const envelope = variabilityEnvelopeEngine.getEnvelope(param);
      if (!envelope) continue;

      const evaluation = variabilityEnvelopeEngine.evaluate(param, value);
      if (evaluation.percentile > 0.99) {
        const recentSuccesses = this.exploredPoints
          .filter(p => p.outcome === "success" && p.parameters[param] !== undefined)
          .slice(-50)
          .map(p => ({ value: p.parameters[param], outcome: p.outcome as "success" }));

        const proposal = variabilityEnvelopeEngine.expandEnvelope(param, recentSuccesses);
        if (proposal && proposal.riskAssessment !== "high") {
          variabilityEnvelopeEngine.applyExpansion(proposal);
          this.expansionHistory.push({
            timestamp: new Date().toISOString(),
            parameter: param,
            previousBound: proposal.currentP999,
            newBound: proposal.proposedP999,
            evidence: [point],
            confidence: proposal.confidenceGain,
          });
        }
      }
    }
  }

  /**
   * Update explored regions based on new data point
   */
  private updateExploredRegions(point: ParameterPoint): void {
    const dims = Object.keys(point.parameters).sort();
    const regionId = dims.join("_");

    let region = this.exploredRegions.get(regionId);
    if (!region) {
      region = {
        id: regionId,
        dimensions: dims,
        bounds: {},
        sampleCount: 0,
        successRate: 0,
        lastUpdated: new Date().toISOString(),
      };
      for (const dim of dims) {
        region.bounds[dim] = { min: Infinity, max: -Infinity };
      }
      this.exploredRegions.set(regionId, region);
    }

    for (const [dim, value] of Object.entries(point.parameters)) {
      if (region.bounds[dim]) {
        region.bounds[dim].min = Math.min(region.bounds[dim].min, value);
        region.bounds[dim].max = Math.max(region.bounds[dim].max, value);
      }
    }

    const successCount = point.outcome === "success" ? 1 : 0;
    region.successRate = (region.successRate * region.sampleCount + successCount) / (region.sampleCount + 1);
    region.sampleCount++;
    region.lastUpdated = new Date().toISOString();
  }

  /**
   * Identify unexplored gaps in the parameter space
   */
  identifyUnexploredGaps(): UnexploredGap[] {
    const gaps: UnexploredGap[] = [];
    const envelopes = variabilityEnvelopeEngine.exportEnvelopes();

    for (const [regionId, region] of this.exploredRegions) {
      for (const dim of region.dimensions) {
        const envelope = envelopes[dim];
        if (!envelope) continue;

        const exploredMin = region.bounds[dim]?.min ?? envelope.p50;
        const exploredMax = region.bounds[dim]?.max ?? envelope.p50;

        if (exploredMin > envelope.p50 * 0.5) {
          gaps.push({
            dimensions: [dim],
            bounds: { [dim]: { min: envelope.p50 * 0.3, max: exploredMin } },
            priority: 0.5,
            reason: `Low ${dim} region unexplored`,
          });
        }

        if (exploredMax < envelope.p95) {
          gaps.push({
            dimensions: [dim],
            bounds: { [dim]: { min: exploredMax, max: envelope.p99 } },
            priority: 0.7,
            reason: `High ${dim} region unexplored (potential for optimization)`,
          });
        }
      }
    }

    return gaps.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Suggest exploration targets for curiosity-driven learning
   */
  suggestExplorationTargets(count: number = 5): ExplorationTarget[] {
    const gaps = this.identifyUnexploredGaps();
    const targets: ExplorationTarget[] = [];

    for (const gap of gaps.slice(0, count)) {
      const parameters: Record<string, number> = {};
      for (const [dim, bounds] of Object.entries(gap.bounds)) {
        parameters[dim] = (bounds.min + bounds.max) / 2;
      }

      targets.push({
        parameters,
        priority: gap.priority,
        reason: gap.reason,
        expectedOutcome: gap.priority > 0.6 ? "likely_success" : "uncertain",
      });
    }

    return targets;
  }

  /**
   * Get exploration statistics
   */
  getStatistics(): {
    totalPoints: number;
    successRate: number;
    regionsExplored: number;
    expansionCount: number;
    gapsIdentified: number;
  } {
    const successCount = this.exploredPoints.filter(p => p.outcome === "success").length;
    return {
      totalPoints: this.exploredPoints.length,
      successRate: this.exploredPoints.length > 0 ? successCount / this.exploredPoints.length : 0,
      regionsExplored: this.exploredRegions.size,
      expansionCount: this.expansionHistory.length,
      gapsIdentified: this.identifyUnexploredGaps().length,
    };
  }

  /**
   * Get expansion history
   */
  getExpansionHistory(): ExpansionEvent[] {
    return [...this.expansionHistory];
  }

  /**
   * Get explored regions
   */
  getExploredRegions(): ExploredRegion[] {
    return Array.from(this.exploredRegions.values());
  }

  /**
   * Export state for persistence
   */
  exportState(): {
    points: ParameterPoint[];
    regions: Record<string, ExploredRegion>;
    expansions: ExpansionEvent[];
  } {
    const regions: Record<string, ExploredRegion> = {};
    for (const [k, v] of this.exploredRegions) {
      regions[k] = v;
    }
    return {
      points: this.exploredPoints,
      regions,
      expansions: this.expansionHistory,
    };
  }

  /**
   * Import state from persistence
   */
  importState(state: ReturnType<typeof this.exportState>): void {
    this.exploredPoints = state.points || [];
    this.expansionHistory = state.expansions || [];
    this.exploredRegions.clear();
    for (const [k, v] of Object.entries(state.regions || {})) {
      this.exploredRegions.set(k, v);
    }
  }
}

export const adaptiveParameterSpaceEngine = new AdaptiveParameterSpaceEngine();
