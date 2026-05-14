/**
 * VariabilityEnvelopeEngine — Probabilistic Parameter Boundaries
 *
 * Phase 0.25: Adaptive Variability Framework
 *
 * Replaces hard min/max limits with probabilistic envelopes that adapt
 * based on evidence. NO HARD CAPS — all parameters use adaptive boundaries.
 *
 * @module engines/VariabilityEnvelopeEngine
 */

export interface VariabilityEnvelope {
  parameter: string;
  nominal: number;
  unit: string;
  distribution: "normal" | "lognormal" | "empirical" | "beta";
  p50: number;
  p95: number;
  p99: number;
  p999: number;
  outlierCapture: boolean;
  sampleCount: number;
  lastUpdated: string;
  context?: Record<string, unknown>;
}

export interface EnvelopeEvaluation {
  value: number;
  percentile: number;
  isOutlier: boolean;
  confidence: number;
  recommendation: "accept" | "caution" | "extreme" | "outlier";
  envelope: VariabilityEnvelope;
}

export interface EnvelopeExpansionProposal {
  parameter: string;
  currentP999: number;
  proposedP999: number;
  evidence: { value: number; outcome: "success" | "marginal" | "failure" }[];
  confidenceGain: number;
  riskAssessment: "low" | "medium" | "high";
}

export class VariabilityEnvelopeEngine {
  private envelopes: Map<string, VariabilityEnvelope> = new Map();
  private outlierBuffer: Map<string, number[]> = new Map();

  /**
   * Initialize with default manufacturing parameter envelopes
   */
  constructor() {
    this.initializeDefaultEnvelopes();
  }

  private initializeDefaultEnvelopes(): void {
    const defaults: Array<Omit<VariabilityEnvelope, "lastUpdated" | "sampleCount">> = [
      { parameter: "spindle_rpm", nominal: 8000, unit: "rpm", distribution: "lognormal", p50: 8000, p95: 12000, p99: 15000, p999: 18000, outlierCapture: true },
      { parameter: "feed_rate", nominal: 500, unit: "mm/min", distribution: "lognormal", p50: 500, p95: 2000, p99: 5000, p999: 10000, outlierCapture: true },
      { parameter: "depth_of_cut", nominal: 2, unit: "mm", distribution: "lognormal", p50: 2, p95: 8, p99: 15, p999: 25, outlierCapture: true },
      { parameter: "cutting_speed", nominal: 200, unit: "m/min", distribution: "normal", p50: 200, p95: 400, p99: 600, p999: 800, outlierCapture: true },
      { parameter: "chip_load", nominal: 0.1, unit: "mm/tooth", distribution: "lognormal", p50: 0.1, p95: 0.3, p99: 0.5, p999: 0.8, outlierCapture: true },
      { parameter: "surface_roughness", nominal: 1.6, unit: "µm Ra", distribution: "lognormal", p50: 1.6, p95: 6.3, p99: 12.5, p999: 25, outlierCapture: true },
      { parameter: "tool_life", nominal: 60, unit: "min", distribution: "lognormal", p50: 60, p95: 180, p99: 300, p999: 600, outlierCapture: true },
      { parameter: "cutting_force", nominal: 500, unit: "N", distribution: "normal", p50: 500, p95: 2000, p99: 4000, p999: 8000, outlierCapture: true },
    ];

    for (const d of defaults) {
      this.envelopes.set(d.parameter, {
        ...d,
        sampleCount: 1000,
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  /**
   * Evaluate a value against its envelope — returns percentile and recommendation
   */
  evaluate(parameter: string, value: number, context?: Record<string, unknown>): EnvelopeEvaluation {
    const envelope = this.envelopes.get(parameter);
    if (!envelope) {
      return {
        value,
        percentile: 0.5,
        isOutlier: false,
        confidence: 0.1,
        recommendation: "caution",
        envelope: this.createDefaultEnvelope(parameter, value),
      };
    }

    const percentile = this.calculatePercentile(value, envelope);
    const isOutlier = percentile > 0.999;

    let recommendation: EnvelopeEvaluation["recommendation"];
    if (percentile <= 0.95) recommendation = "accept";
    else if (percentile <= 0.99) recommendation = "caution";
    else if (percentile <= 0.999) recommendation = "extreme";
    else recommendation = "outlier";

    if (isOutlier && envelope.outlierCapture) {
      this.captureOutlier(parameter, value);
    }

    return {
      value,
      percentile,
      isOutlier,
      confidence: Math.min(0.99, envelope.sampleCount / 1000),
      recommendation,
      envelope,
    };
  }

  /**
   * Calculate percentile using envelope distribution
   */
  private calculatePercentile(value: number, envelope: VariabilityEnvelope): number {
    if (value <= envelope.p50) return 0.5 * (value / envelope.p50);
    if (value <= envelope.p95) return 0.5 + 0.45 * ((value - envelope.p50) / (envelope.p95 - envelope.p50));
    if (value <= envelope.p99) return 0.95 + 0.04 * ((value - envelope.p95) / (envelope.p99 - envelope.p95));
    if (value <= envelope.p999) return 0.99 + 0.009 * ((value - envelope.p99) / (envelope.p999 - envelope.p99));
    return 0.999 + 0.001 * Math.min(1, (value - envelope.p999) / envelope.p999);
  }

  /**
   * Capture outlier for future envelope expansion
   */
  private captureOutlier(parameter: string, value: number): void {
    if (!this.outlierBuffer.has(parameter)) {
      this.outlierBuffer.set(parameter, []);
    }
    const buffer = this.outlierBuffer.get(parameter)!;
    buffer.push(value);
    if (buffer.length > 100) buffer.shift();
  }

  /**
   * Get or create envelope for parameter
   */
  getEnvelope(parameter: string): VariabilityEnvelope | undefined {
    return this.envelopes.get(parameter);
  }

  /**
   * Set/update envelope for parameter
   */
  setEnvelope(parameter: string, envelope: VariabilityEnvelope): void {
    this.envelopes.set(parameter, {
      ...envelope,
      lastUpdated: new Date().toISOString(),
    });
  }

  /**
   * Expand envelope based on successful outlier evidence
   */
  expandEnvelope(parameter: string, evidence: { value: number; outcome: "success" | "marginal" | "failure" }[]): EnvelopeExpansionProposal | null {
    const envelope = this.envelopes.get(parameter);
    if (!envelope) return null;

    const successfulOutliers = evidence.filter(e => e.outcome === "success" && e.value > envelope.p999);
    if (successfulOutliers.length < 3) return null;

    const maxSuccess = Math.max(...successfulOutliers.map(e => e.value));
    const proposedP999 = maxSuccess * 1.1;

    return {
      parameter,
      currentP999: envelope.p999,
      proposedP999,
      evidence,
      confidenceGain: successfulOutliers.length / evidence.length,
      riskAssessment: successfulOutliers.length >= 5 ? "low" : successfulOutliers.length >= 3 ? "medium" : "high",
    };
  }

  /**
   * Apply expansion proposal to envelope
   */
  applyExpansion(proposal: EnvelopeExpansionProposal): void {
    const envelope = this.envelopes.get(proposal.parameter);
    if (!envelope) return;

    this.envelopes.set(proposal.parameter, {
      ...envelope,
      p999: proposal.proposedP999,
      sampleCount: envelope.sampleCount + proposal.evidence.length,
      lastUpdated: new Date().toISOString(),
    });
  }

  /**
   * Create default envelope for unknown parameter
   */
  private createDefaultEnvelope(parameter: string, seedValue: number): VariabilityEnvelope {
    const envelope: VariabilityEnvelope = {
      parameter,
      nominal: seedValue,
      unit: "unknown",
      distribution: "lognormal",
      p50: seedValue,
      p95: seedValue * 2,
      p99: seedValue * 3,
      p999: seedValue * 5,
      outlierCapture: true,
      sampleCount: 1,
      lastUpdated: new Date().toISOString(),
    };
    this.envelopes.set(parameter, envelope);
    return envelope;
  }

  /**
   * Export all envelopes for persistence
   */
  exportEnvelopes(): Record<string, VariabilityEnvelope> {
    const result: Record<string, VariabilityEnvelope> = {};
    for (const [key, value] of this.envelopes) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Import envelopes from persistence
   */
  importEnvelopes(data: Record<string, VariabilityEnvelope>): void {
    for (const [key, value] of Object.entries(data)) {
      this.envelopes.set(key, value);
    }
  }

  /**
   * Get all captured outliers
   */
  getOutlierBuffer(): Map<string, number[]> {
    return new Map(this.outlierBuffer);
  }
}

export const variabilityEnvelopeEngine = new VariabilityEnvelopeEngine();
