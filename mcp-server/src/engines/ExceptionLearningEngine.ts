/**
 * ExceptionLearningEngine — Turn Exceptions into Knowledge
 *
 * Phase 0.25: Adaptive Variability Framework
 *
 * When something unexpected happens, don't fail — capture, analyze,
 * and turn it into knowledge. Successful exceptions become tribal tips.
 *
 * @module engines/ExceptionLearningEngine
 */

export interface UnexpectedEvent {
  id: string;
  timestamp: string;
  type: "parameter_outlier" | "outcome_anomaly" | "process_deviation" | "measurement_spike";
  description: string;
  context: Record<string, unknown>;
  data: Record<string, number | string>;
  severity: "info" | "warning" | "critical";
}

export interface ExceptionAnalysis {
  event: UnexpectedEvent;
  diagnosis: string;
  possibleCauses: string[];
  recommendations: string[];
  learnedPatterns: string[];
}

export interface LearnedException {
  id: string;
  event: UnexpectedEvent;
  analysis: ExceptionAnalysis;
  outcome: "success" | "failure" | "neutral";
  tribalTip?: {
    title: string;
    content: string;
    category: string;
    confidence: number;
  };
  envelopeProposal?: {
    parameter: string;
    newBound: number;
    evidence: string;
  };
}

export interface ExceptionResponse {
  shouldFail: boolean;
  message: string;
  analysis: ExceptionAnalysis;
  suggestedActions: string[];
}

class ExceptionLearningEngine {
  private events: UnexpectedEvent[] = [];
  private learnedExceptions: LearnedException[] = [];
  private idCounter = 0;
  private readonly maxEvents = 2000;

  /**
   * Handle an unexpected event — analyze and learn instead of failing
   */
  handleUnexpected(data: Omit<UnexpectedEvent, "id" | "timestamp">): ExceptionResponse {
    const event: UnexpectedEvent = {
      id: `EX-${++this.idCounter}`,
      timestamp: new Date().toISOString(),
      ...data,
    };

    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    const analysis = this.analyzeException(event);
    const shouldFail = event.severity === "critical" && !this.hasSimilarSuccess(event);

    return {
      shouldFail,
      message: shouldFail
        ? `Critical exception: ${event.description}`
        : `Exception captured for learning: ${event.description}`,
      analysis,
      suggestedActions: this.generateSuggestedActions(event, analysis),
    };
  }

  /**
   * Analyze exception to understand causes and patterns
   */
  private analyzeException(event: UnexpectedEvent): ExceptionAnalysis {
    const possibleCauses: string[] = [];
    const recommendations: string[] = [];
    const learnedPatterns: string[] = [];

    switch (event.type) {
      case "parameter_outlier":
        possibleCauses.push("Parameter outside expected envelope");
        possibleCauses.push("New operating condition not yet learned");
        possibleCauses.push("Measurement error or sensor drift");
        recommendations.push("Verify measurement accuracy");
        recommendations.push("If successful, consider envelope expansion");
        learnedPatterns.push("Extreme parameters can succeed under specific conditions");
        break;

      case "outcome_anomaly":
        possibleCauses.push("Unexpected interaction between parameters");
        possibleCauses.push("Material batch variation");
        possibleCauses.push("Tool wear exceeding prediction");
        recommendations.push("Document conditions for future reference");
        recommendations.push("Check for systematic pattern");
        learnedPatterns.push("Outcomes can deviate from predictions in novel contexts");
        break;

      case "process_deviation":
        possibleCauses.push("Operator override or adjustment");
        possibleCauses.push("Machine behavior outside calibration");
        possibleCauses.push("Environmental factor (temperature, humidity)");
        recommendations.push("Verify machine calibration");
        recommendations.push("Document operator knowledge");
        learnedPatterns.push("Process deviations often contain valuable tribal knowledge");
        break;

      case "measurement_spike":
        possibleCauses.push("Transient condition (chip evacuation, coolant flow)");
        possibleCauses.push("Sensor noise or interference");
        possibleCauses.push("Actual physical event (chatter onset)");
        recommendations.push("Check for repeatability");
        recommendations.push("Correlate with other measurements");
        learnedPatterns.push("Measurement spikes may indicate edge of stability");
        break;
    }

    return {
      event,
      diagnosis: `${event.type}: ${event.description}`,
      possibleCauses,
      recommendations,
      learnedPatterns,
    };
  }

  /**
   * Generate suggested actions for exception
   */
  private generateSuggestedActions(event: UnexpectedEvent, analysis: ExceptionAnalysis): string[] {
    const actions: string[] = [];

    if (event.severity !== "critical") {
      actions.push("Continue operation with monitoring");
    }

    actions.push("Log exception with full context");
    actions.push(...analysis.recommendations.slice(0, 2));

    if (event.type === "parameter_outlier") {
      actions.push("Mark for potential envelope expansion if successful");
    }

    return actions;
  }

  /**
   * Check if similar exception previously succeeded
   */
  private hasSimilarSuccess(event: UnexpectedEvent): boolean {
    return this.learnedExceptions.some(
      le => le.event.type === event.type && le.outcome === "success"
    );
  }

  /**
   * Record outcome of exception to enable learning
   */
  recordOutcome(eventId: string, outcome: "success" | "failure" | "neutral"): LearnedException | null {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return null;

    const analysis = this.analyzeException(event);
    const learned: LearnedException = {
      id: `LE-${this.learnedExceptions.length + 1}`,
      event,
      analysis,
      outcome,
    };

    if (outcome === "success") {
      learned.tribalTip = this.generateTribalTip(event, analysis);
      if (event.type === "parameter_outlier" && event.data.parameter && event.data.value) {
        learned.envelopeProposal = {
          parameter: String(event.data.parameter),
          newBound: Number(event.data.value) * 1.1,
          evidence: `Successful operation at ${event.data.value} (${event.id})`,
        };
      }
    }

    this.learnedExceptions.push(learned);
    return learned;
  }

  /**
   * Generate tribal tip from successful exception
   */
  private generateTribalTip(event: UnexpectedEvent, analysis: ExceptionAnalysis): LearnedException["tribalTip"] {
    const categoryMap: Record<UnexpectedEvent["type"], string> = {
      parameter_outlier: "parameters",
      outcome_anomaly: "process",
      process_deviation: "operator_wisdom",
      measurement_spike: "monitoring",
    };

    return {
      title: `Exception Learning: ${event.type.replace(/_/g, " ")}`,
      content: `${event.description}. ${analysis.learnedPatterns[0] || "Captured for future reference."}`,
      category: categoryMap[event.type],
      confidence: 0.7,
    };
  }

  /**
   * Get exceptions pending outcome recording
   */
  getPendingExceptions(): UnexpectedEvent[] {
    const recordedIds = new Set(this.learnedExceptions.map(le => le.event.id));
    return this.events.filter(e => !recordedIds.has(e.id));
  }

  /**
   * Get all learned exceptions
   */
  getLearnedExceptions(): LearnedException[] {
    return [...this.learnedExceptions];
  }

  /**
   * Get generated tribal tips
   */
  getGeneratedTips(): NonNullable<LearnedException["tribalTip"]>[] {
    return this.learnedExceptions
      .filter(le => le.tribalTip)
      .map(le => le.tribalTip!);
  }

  /**
   * Get envelope proposals from successful exceptions
   */
  getEnvelopeProposals(): NonNullable<LearnedException["envelopeProposal"]>[] {
    return this.learnedExceptions
      .filter(le => le.envelopeProposal)
      .map(le => le.envelopeProposal!);
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalEvents: number;
    learnedCount: number;
    successRate: number;
    tipsGenerated: number;
    proposalsGenerated: number;
  } {
    const successes = this.learnedExceptions.filter(le => le.outcome === "success").length;
    return {
      totalEvents: this.events.length,
      learnedCount: this.learnedExceptions.length,
      successRate: this.learnedExceptions.length > 0
        ? successes / this.learnedExceptions.length
        : 0,
      tipsGenerated: this.getGeneratedTips().length,
      proposalsGenerated: this.getEnvelopeProposals().length,
    };
  }

  /**
   * Export for persistence
   */
  export(): { events: UnexpectedEvent[]; learned: LearnedException[] } {
    return {
      events: this.events,
      learned: this.learnedExceptions,
    };
  }

  /**
   * Import from persistence
   */
  import(data: ReturnType<typeof this.export>): void {
    this.events = data.events || [];
    this.learnedExceptions = data.learned || [];
    this.idCounter = Math.max(
      0,
      ...this.events.map(e => parseInt(e.id.replace("EX-", "")) || 0)
    );
  }
}

export const exceptionLearningEngine = new ExceptionLearningEngine();
