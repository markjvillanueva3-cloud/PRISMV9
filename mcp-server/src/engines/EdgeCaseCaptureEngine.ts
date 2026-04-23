/**
 * EdgeCaseCaptureEngine — Learn from Boundary Operations
 *
 * Phase 0.25: Adaptive Variability Framework
 *
 * Systematically captures and learns from operations at the edge of
 * the known parameter space. Every boundary operation is an opportunity
 * for envelope expansion and knowledge gain.
 *
 * @module engines/EdgeCaseCaptureEngine
 */

import { variabilityEnvelopeEngine } from "./VariabilityEnvelopeEngine.js";

export interface EdgeCaseCapture {
  id: string;
  timestamp: string;
  operation: string;
  parameter: string;
  value: number;
  percentile: number;
  outcome: "success" | "marginal" | "failure";
  context: {
    material?: string;
    machine?: string;
    tool?: string;
    operation_type?: string;
    [key: string]: unknown;
  };
  measurements?: {
    vibration?: number;
    temperature?: number;
    power?: number;
    surface_roughness?: number;
  };
  operatorNotes?: string;
  learnings?: string[];
}

export interface EdgeCaseSummary {
  parameter: string;
  captureCount: number;
  successRate: number;
  averagePercentile: number;
  expansionPotential: boolean;
  recentCaptures: EdgeCaseCapture[];
}

class EdgeCaseCaptureEngine {
  private captures: EdgeCaseCapture[] = [];
  private readonly maxCaptures = 5000;
  private idCounter = 0;

  /**
   * Capture an edge case operation
   */
  capture(data: Omit<EdgeCaseCapture, "id" | "timestamp" | "percentile">): EdgeCaseCapture {
    const evaluation = variabilityEnvelopeEngine.evaluate(data.parameter, data.value);

    const capture: EdgeCaseCapture = {
      id: `EC-${++this.idCounter}`,
      timestamp: new Date().toISOString(),
      percentile: evaluation.percentile,
      ...data,
    };

    this.captures.push(capture);
    if (this.captures.length > this.maxCaptures) {
      this.captures.shift();
    }

    if (capture.outcome === "success" && capture.percentile > 0.99) {
      capture.learnings = this.generateLearnings(capture);
    }

    return capture;
  }

  /**
   * Auto-capture if value is at envelope boundary
   */
  autoCaptureIfEdge(
    parameter: string,
    value: number,
    outcome: "success" | "marginal" | "failure",
    context: EdgeCaseCapture["context"],
    operation: string = "unknown"
  ): EdgeCaseCapture | null {
    const evaluation = variabilityEnvelopeEngine.evaluate(parameter, value);

    if (evaluation.percentile >= 0.95) {
      return this.capture({
        operation,
        parameter,
        value,
        outcome,
        context,
      });
    }

    return null;
  }

  /**
   * Generate learnings from successful edge case
   */
  private generateLearnings(capture: EdgeCaseCapture): string[] {
    const learnings: string[] = [];

    learnings.push(
      `${capture.parameter} at ${capture.value} (p${(capture.percentile * 100).toFixed(1)}) ` +
      `succeeded in ${capture.context.operation_type || "operation"}`
    );

    if (capture.context.material) {
      learnings.push(`Material ${capture.context.material} tolerates high ${capture.parameter}`);
    }

    if (capture.context.machine) {
      learnings.push(`Machine ${capture.context.machine} capable at edge conditions`);
    }

    if (capture.measurements?.vibration && capture.measurements.vibration < 2) {
      learnings.push(`Low vibration (${capture.measurements.vibration}g) indicates stability at edge`);
    }

    return learnings;
  }

  /**
   * Get edge case summary for a parameter
   */
  getSummary(parameter: string): EdgeCaseSummary {
    const relevant = this.captures.filter(c => c.parameter === parameter);
    const successCount = relevant.filter(c => c.outcome === "success").length;

    return {
      parameter,
      captureCount: relevant.length,
      successRate: relevant.length > 0 ? successCount / relevant.length : 0,
      averagePercentile: relevant.length > 0
        ? relevant.reduce((sum, c) => sum + c.percentile, 0) / relevant.length
        : 0,
      expansionPotential: relevant.filter(c => c.outcome === "success" && c.percentile > 0.99).length >= 3,
      recentCaptures: relevant.slice(-10),
    };
  }

  /**
   * Get all summaries
   */
  getAllSummaries(): EdgeCaseSummary[] {
    const parameters = new Set(this.captures.map(c => c.parameter));
    return Array.from(parameters).map(p => this.getSummary(p));
  }

  /**
   * Get captures that could trigger envelope expansion
   */
  getExpansionCandidates(): { parameter: string; captures: EdgeCaseCapture[] }[] {
    const grouped = new Map<string, EdgeCaseCapture[]>();

    for (const capture of this.captures) {
      if (capture.outcome === "success" && capture.percentile > 0.99) {
        if (!grouped.has(capture.parameter)) {
          grouped.set(capture.parameter, []);
        }
        grouped.get(capture.parameter)!.push(capture);
      }
    }

    const candidates: { parameter: string; captures: EdgeCaseCapture[] }[] = [];
    for (const [param, caps] of grouped) {
      if (caps.length >= 3) {
        candidates.push({ parameter: param, captures: caps });
      }
    }

    return candidates;
  }

  /**
   * Search captures by criteria
   */
  search(criteria: {
    parameter?: string;
    outcome?: "success" | "marginal" | "failure";
    minPercentile?: number;
    maxPercentile?: number;
    material?: string;
    machine?: string;
    since?: string;
  }): EdgeCaseCapture[] {
    return this.captures.filter(c => {
      if (criteria.parameter && c.parameter !== criteria.parameter) return false;
      if (criteria.outcome && c.outcome !== criteria.outcome) return false;
      if (criteria.minPercentile && c.percentile < criteria.minPercentile) return false;
      if (criteria.maxPercentile && c.percentile > criteria.maxPercentile) return false;
      if (criteria.material && c.context.material !== criteria.material) return false;
      if (criteria.machine && c.context.machine !== criteria.machine) return false;
      if (criteria.since && c.timestamp < criteria.since) return false;
      return true;
    });
  }

  /**
   * Get all learnings extracted from edge cases
   */
  getAllLearnings(): { capture: EdgeCaseCapture; learnings: string[] }[] {
    return this.captures
      .filter(c => c.learnings && c.learnings.length > 0)
      .map(c => ({ capture: c, learnings: c.learnings! }));
  }

  /**
   * Export for persistence
   */
  export(): EdgeCaseCapture[] {
    return [...this.captures];
  }

  /**
   * Import from persistence
   */
  import(data: EdgeCaseCapture[]): void {
    this.captures = data;
    this.idCounter = Math.max(0, ...data.map(c => parseInt(c.id.replace("EC-", "")) || 0));
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalCaptures: number;
    successRate: number;
    parametersTracked: number;
    expansionCandidates: number;
    learningsGenerated: number;
  } {
    const successes = this.captures.filter(c => c.outcome === "success").length;
    const parameters = new Set(this.captures.map(c => c.parameter));
    const candidates = this.getExpansionCandidates();
    const learnings = this.captures.reduce((sum, c) => sum + (c.learnings?.length || 0), 0);

    return {
      totalCaptures: this.captures.length,
      successRate: this.captures.length > 0 ? successes / this.captures.length : 0,
      parametersTracked: parameters.size,
      expansionCandidates: candidates.length,
      learningsGenerated: learnings,
    };
  }
}

export const edgeCaseCaptureEngine = new EdgeCaseCaptureEngine();
