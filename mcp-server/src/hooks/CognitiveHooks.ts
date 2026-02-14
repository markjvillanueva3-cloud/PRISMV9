/**
 * PRISM MCP Server - Cognitive Hooks
 * Session 6.2E: Bayesian Inference, Learning, Pattern Detection
 * 
 * AI-enhanced hooks that learn and adapt:
 * - Bayesian prior updates
 * - Pattern recognition
 * - Anomaly detection
 * - Outcome learning
 * - Mistake pattern detection
 * - Success reinforcement
 * 
 * Memory application: #6 Cognitive (5 AI/ML patterns always-on)
 * 
 * These hooks implement the cognitive layer that makes PRISM
 * learn from experience and improve over time.
 * 
 * @version 1.0.0
 * @author PRISM Development Team
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookBlock,
  hookWarning
} from "../engines/HookExecutor.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// COGNITIVE STATE STORE
// ============================================================================

/**
 * Bayesian prior for a metric
 */
interface BayesianPrior {
  metric: string;
  mean: number;
  variance: number;
  sampleCount: number;
  lastUpdated: string;
}

/**
 * Detected pattern
 */
interface Pattern {
  id: string;
  type: "success" | "failure" | "anomaly" | "regression";
  description: string;
  frequency: number;
  lastSeen: string;
  context: Record<string, unknown>;
  preventionRules?: string[];
}

/**
 * Learned lesson
 */
interface Lesson {
  id: string;
  category: string;
  description: string;
  trigger: string;
  action: string;
  effectiveness: number;  // 0-1
  applications: number;
  createdAt: string;
  lastApplied: string;
}

// In-memory cognitive state (would be persisted in production)
const cognitiveState = {
  priors: new Map<string, BayesianPrior>(),
  patterns: new Map<string, Pattern>(),
  lessons: new Map<string, Lesson>(),
  decisions: [] as Array<{ timestamp: string; decision: string; outcome?: string }>,
  anomalyThreshold: 2.5  // Standard deviations
};

// ============================================================================
// BAYESIAN HOOKS
// ============================================================================

/**
 * Bayesian prior initialization
 */
const onBayesianPriorInit: HookDefinition = {
  id: "on-bayesian-prior-init",
  name: "Bayesian Prior Initialization",
  description: "Initializes or updates Bayesian priors for metrics (BAYES-001).",
  
  phase: "on-session-start",
  category: "cognitive",
  mode: "logging",
  priority: "high",
  enabled: true,
  
  tags: ["bayesian", "priors", "initialization", "BAYES-001"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onBayesianPriorInit;
    
    // Default priors based on PRISM experience
    const defaultPriors: BayesianPrior[] = [
      { metric: "safety_score", mean: 0.85, variance: 0.02, sampleCount: 100, lastUpdated: new Date().toISOString() },
      { metric: "completeness", mean: 0.90, variance: 0.01, sampleCount: 100, lastUpdated: new Date().toISOString() },
      { metric: "tool_life_ratio", mean: 0.75, variance: 0.05, sampleCount: 50, lastUpdated: new Date().toISOString() },
      { metric: "force_utilization", mean: 0.60, variance: 0.04, sampleCount: 50, lastUpdated: new Date().toISOString() },
      { metric: "regression_rate", mean: 0.02, variance: 0.01, sampleCount: 200, lastUpdated: new Date().toISOString() }
    ];
    
    // Initialize priors that don't exist
    for (const prior of defaultPriors) {
      if (!cognitiveState.priors.has(prior.metric)) {
        cognitiveState.priors.set(prior.metric, prior);
      }
    }
    
    // Load any saved priors from context
    const savedPriors = context.metadata?.savedPriors as BayesianPrior[] | undefined;
    if (savedPriors) {
      for (const prior of savedPriors) {
        cognitiveState.priors.set(prior.metric, prior);
      }
    }
    
    return hookSuccess(hook, `Initialized ${cognitiveState.priors.size} Bayesian priors`, {
      data: { priorCount: cognitiveState.priors.size },
      actions: ["BAYES-001_complete"]
    });
  }
};

/**
 * Bayesian change detection (BAYES-002)
 */
const onBayesianChangeDetection: HookDefinition = {
  id: "on-bayesian-change-detection",
  name: "Bayesian Change Detection",
  description: "Detects significant changes in metrics using Bayesian inference (BAYES-002).",
  
  phase: "post-calculation",
  category: "cognitive",
  mode: "warning",
  priority: "normal",
  enabled: true,
  
  tags: ["bayesian", "change-detection", "BAYES-002"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onBayesianChangeDetection;
    
    const observation = context.metadata?.observation as {
      metric: string;
      value: number;
    } | undefined;
    
    if (!observation) {
      return hookSuccess(hook, "No observation to process");
    }
    
    const prior = cognitiveState.priors.get(observation.metric);
    if (!prior) {
      return hookSuccess(hook, `No prior for metric: ${observation.metric}`);
    }
    
    // Calculate z-score
    const zScore = (observation.value - prior.mean) / Math.sqrt(prior.variance);
    const isAnomaly = Math.abs(zScore) > cognitiveState.anomalyThreshold;
    
    // Bayesian update (conjugate normal-normal)
    const n = prior.sampleCount;
    const newMean = (n * prior.mean + observation.value) / (n + 1);
    const newVariance = ((n - 1) * prior.variance + (observation.value - prior.mean) * (observation.value - newMean)) / n;
    
    // Update prior
    cognitiveState.priors.set(observation.metric, {
      ...prior,
      mean: newMean,
      variance: Math.max(newVariance, 0.0001),  // Prevent zero variance
      sampleCount: n + 1,
      lastUpdated: new Date().toISOString()
    });
    
    if (isAnomaly) {
      return hookWarning(hook,
        `⚠️ BAYES-002: Anomaly detected for ${observation.metric}`,
        {
          score: 1 - Math.min(Math.abs(zScore) / 5, 1),
          warnings: [
            `Value: ${observation.value.toFixed(4)}`,
            `Expected: ${prior.mean.toFixed(4)} ± ${(2 * Math.sqrt(prior.variance)).toFixed(4)}`,
            `Z-score: ${zScore.toFixed(2)} (threshold: ${cognitiveState.anomalyThreshold})`
          ],
          data: { metric: observation.metric, value: observation.value, zScore, isAnomaly }
        }
      );
    }
    
    return hookSuccess(hook, `BAYES-002: ${observation.metric} within expected range`, {
      data: { metric: observation.metric, zScore: zScore.toFixed(2) }
    });
  }
};

/**
 * Bayesian hypothesis testing (BAYES-003)
 */
const onBayesianHypothesisTest: HookDefinition = {
  id: "on-bayesian-hypothesis-test",
  name: "Bayesian Hypothesis Testing",
  description: "Tests hypotheses about root causes using Bayesian inference (BAYES-003).",
  
  phase: "on-decision",
  category: "cognitive",
  mode: "logging",
  priority: "normal",
  enabled: true,
  
  tags: ["bayesian", "hypothesis", "debugging", "BAYES-003"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onBayesianHypothesisTest;
    
    const hypotheses = context.metadata?.hypotheses as Array<{
      id: string;
      description: string;
      priorProbability: number;
      evidence: number;  // Likelihood ratio
    }> | undefined;
    
    if (!hypotheses || hypotheses.length === 0) {
      return hookSuccess(hook, "No hypotheses to test");
    }
    
    // Calculate posterior probabilities
    const totalEvidence = hypotheses.reduce((sum, h) => sum + h.priorProbability * h.evidence, 0);
    
    const posteriors = hypotheses.map(h => ({
      ...h,
      posteriorProbability: (h.priorProbability * h.evidence) / totalEvidence
    }));
    
    // Sort by posterior probability
    posteriors.sort((a, b) => b.posteriorProbability - a.posteriorProbability);
    
    const mostLikely = posteriors[0];
    
    return hookSuccess(hook, 
      `BAYES-003: Most likely hypothesis: ${mostLikely.id} (${(mostLikely.posteriorProbability * 100).toFixed(1)}%)`,
      {
        data: {
          hypotheses: posteriors.map(p => ({
            id: p.id,
            posterior: p.posteriorProbability
          })),
          recommendation: mostLikely.id
        },
        actions: [`investigate:${mostLikely.id}`]
      }
    );
  }
};

// ============================================================================
// PATTERN DETECTION HOOKS
// ============================================================================

/**
 * Pattern match detection
 */
const onPatternMatch: HookDefinition = {
  id: "on-pattern-match",
  name: "Pattern Match Detection",
  description: "Detects known patterns in operations and triggers appropriate responses.",
  
  phase: "on-pattern-match",
  category: "cognitive",
  mode: "warning",
  priority: "high",
  enabled: true,
  
  tags: ["pattern", "detection", "learning"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onPatternMatch;
    
    const operation = context.operation;
    const target = context.target;
    
    // Check for known patterns
    const matchedPatterns: Pattern[] = [];
    
    for (const [, pattern] of cognitiveState.patterns) {
      // Simple pattern matching - would be more sophisticated in production
      if (pattern.context.operation === operation ||
          pattern.context.targetType === target?.type) {
        matchedPatterns.push(pattern);
        
        // Update pattern frequency
        pattern.frequency++;
        pattern.lastSeen = new Date().toISOString();
      }
    }
    
    if (matchedPatterns.length === 0) {
      return hookSuccess(hook, "No known patterns matched");
    }
    
    // Check for failure/regression patterns
    const dangerousPatterns = matchedPatterns.filter(p => 
      p.type === "failure" || p.type === "regression"
    );
    
    if (dangerousPatterns.length > 0) {
      return hookWarning(hook,
        `⚠️ Known ${dangerousPatterns[0].type} pattern detected: ${dangerousPatterns[0].description}`,
        {
          warnings: [
            `Pattern ID: ${dangerousPatterns[0].id}`,
            `Seen ${dangerousPatterns[0].frequency} times`,
            ...(dangerousPatterns[0].preventionRules || [])
          ],
          data: { patterns: dangerousPatterns.map(p => p.id) }
        }
      );
    }
    
    // Success patterns are just logged
    return hookSuccess(hook, `Matched ${matchedPatterns.length} known patterns`, {
      data: { patterns: matchedPatterns.map(p => p.id) }
    });
  }
};

/**
 * Regression pattern detection (v9→v10 type)
 */
const onRegressionPatternDetect: HookDefinition = {
  id: "on-regression-pattern-detect",
  name: "Regression Pattern Detection",
  description: "Detects patterns that led to regressions like the v9→v10 incident.",
  
  phase: "pre-file-write",
  category: "cognitive",
  mode: "blocking",
  priority: "critical",
  enabled: true,
  
  tags: ["regression", "pattern", "prevention", "critical"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onRegressionPatternDetect;
    
    const filePath = context.target?.path || "";
    const operation = context.operation;
    
    // Known regression patterns
    const regressionPatterns = [
      {
        pattern: /MASTER.*DATABASE/i,
        risk: "Database master file replacement",
        check: "Ensure new version has >= items"
      },
      {
        pattern: /v\d+.*v\d+/i,
        risk: "Version upgrade file",
        check: "Verify all data migrated"
      },
      {
        pattern: /_EXPANDED\.json$/i,
        risk: "Expanded database replacement",
        check: "Count items before and after"
      },
      {
        pattern: /consolidat|merg|combin/i,
        risk: "Consolidation operation",
        check: "Sum of parts must equal whole"
      }
    ];
    
    const matchedRisks: string[] = [];
    
    for (const { pattern, risk, check } of regressionPatterns) {
      if (pattern.test(filePath) || pattern.test(operation)) {
        matchedRisks.push(`${risk}: ${check}`);
      }
    }
    
    if (matchedRisks.length > 0) {
      // Don't block, but warn strongly
      return hookWarning(hook,
        `⚠️ REGRESSION RISK PATTERN: Operation matches known regression trigger`,
        {
          warnings: matchedRisks,
          data: { filePath, operation, risksDetected: matchedRisks.length }
        }
      );
    }
    
    return hookSuccess(hook, "No regression patterns detected");
  }
};

// ============================================================================
// ANOMALY DETECTION HOOKS
// ============================================================================

/**
 * General anomaly detection
 */
const onAnomaly: HookDefinition = {
  id: "on-anomaly",
  name: "Anomaly Detection",
  description: "Detects anomalous values or behaviors across operations.",
  
  phase: "on-anomaly",
  category: "cognitive",
  mode: "warning",
  priority: "high",
  enabled: true,
  
  tags: ["anomaly", "detection", "monitoring"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onAnomaly;
    
    const anomalyData = context.metadata?.anomalyData as {
      type: string;
      value: unknown;
      expected: unknown;
      deviation: number;
    } | undefined;
    
    if (!anomalyData) {
      return hookSuccess(hook, "No anomaly data provided");
    }
    
    // Record the anomaly as a pattern if significant
    if (anomalyData.deviation > cognitiveState.anomalyThreshold) {
      const patternId = `ANOMALY-${Date.now()}`;
      cognitiveState.patterns.set(patternId, {
        id: patternId,
        type: "anomaly",
        description: `${anomalyData.type}: ${anomalyData.value} (expected ${anomalyData.expected})`,
        frequency: 1,
        lastSeen: new Date().toISOString(),
        context: { ...anomalyData }
      });
    }
    
    return hookWarning(hook,
      `Anomaly detected: ${anomalyData.type}`,
      {
        score: 1 - Math.min(anomalyData.deviation / 5, 1),
        warnings: [
          `Value: ${anomalyData.value}`,
          `Expected: ${anomalyData.expected}`,
          `Deviation: ${anomalyData.deviation.toFixed(2)}σ`
        ]
      }
    );
  }
};

// ============================================================================
// LEARNING HOOKS
// ============================================================================

/**
 * Outcome learning hook
 */
const onOutcome: HookDefinition = {
  id: "on-outcome",
  name: "Outcome Learning",
  description: "Records operation outcomes to improve future predictions.",
  
  phase: "on-outcome",
  category: "cognitive",
  mode: "logging",
  priority: "normal",
  enabled: true,
  
  tags: ["learning", "outcome", "feedback"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onOutcome;
    
    const outcome = context.metadata?.outcome as {
      operationType: string;
      success: boolean;
      quality?: number;
      issues?: string[];
    } | undefined;
    
    if (!outcome) {
      return hookSuccess(hook, "No outcome data to learn from");
    }
    
    // Record the outcome
    cognitiveState.decisions.push({
      timestamp: new Date().toISOString(),
      decision: context.operation,
      outcome: outcome.success ? "success" : "failure"
    });
    
    // Trim old decisions
    if (cognitiveState.decisions.length > 1000) {
      cognitiveState.decisions = cognitiveState.decisions.slice(-1000);
    }
    
    // If failure, create a lesson
    if (!outcome.success && outcome.issues) {
      const lessonId = `LESSON-${Date.now()}`;
      cognitiveState.lessons.set(lessonId, {
        id: lessonId,
        category: outcome.operationType,
        description: `Failure in ${outcome.operationType}`,
        trigger: outcome.issues[0] || "Unknown trigger",
        action: "Review and prevent recurrence",
        effectiveness: 0.5,  // Initial estimate
        applications: 0,
        createdAt: new Date().toISOString(),
        lastApplied: new Date().toISOString()
      });
    }
    
    return hookSuccess(hook, 
      `Outcome recorded: ${outcome.success ? "success" : "failure"}`,
      {
        data: { operationType: outcome.operationType, success: outcome.success },
        actions: outcome.success ? [] : ["lesson_created"]
      }
    );
  }
};

/**
 * Learning update hook
 */
const onLearningUpdate: HookDefinition = {
  id: "on-learning-update",
  name: "Learning System Update",
  description: "Updates the learning system with new experiences.",
  
  phase: "on-learning-update",
  category: "cognitive",
  mode: "logging",
  priority: "low",
  enabled: true,
  
  tags: ["learning", "update", "experience"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onLearningUpdate;
    
    const experience = context.metadata?.experience as {
      lessonId?: string;
      wasEffective: boolean;
    } | undefined;
    
    if (!experience?.lessonId) {
      return hookSuccess(hook, "No learning update required");
    }
    
    const lesson = cognitiveState.lessons.get(experience.lessonId);
    if (!lesson) {
      return hookSuccess(hook, `Lesson ${experience.lessonId} not found`);
    }
    
    // Update lesson effectiveness using exponential moving average
    const alpha = 0.3;  // Learning rate
    lesson.effectiveness = alpha * (experience.wasEffective ? 1 : 0) + (1 - alpha) * lesson.effectiveness;
    lesson.applications++;
    lesson.lastApplied = new Date().toISOString();
    
    return hookSuccess(hook, 
      `Lesson ${experience.lessonId} effectiveness updated: ${(lesson.effectiveness * 100).toFixed(1)}%`,
      {
        data: { lessonId: experience.lessonId, effectiveness: lesson.effectiveness }
      }
    );
  }
};

/**
 * Lesson recall hook
 */
const onLessonRecall: HookDefinition = {
  id: "on-lesson-recall",
  name: "Lesson Recall",
  description: "Recalls relevant lessons for the current operation.",
  
  phase: "pre-calculation",
  category: "cognitive",
  mode: "logging",
  priority: "normal",
  enabled: true,
  
  tags: ["learning", "recall", "lessons"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onLessonRecall;
    
    const operation = context.operation;
    
    // Find relevant lessons
    const relevantLessons: Lesson[] = [];
    
    for (const [, lesson] of cognitiveState.lessons) {
      if (lesson.category === operation || 
          lesson.trigger.toLowerCase().includes(operation.toLowerCase())) {
        // Only recall effective lessons
        if (lesson.effectiveness > 0.5) {
          relevantLessons.push(lesson);
        }
      }
    }
    
    if (relevantLessons.length === 0) {
      return hookSuccess(hook, "No relevant lessons recalled");
    }
    
    // Sort by effectiveness
    relevantLessons.sort((a, b) => b.effectiveness - a.effectiveness);
    
    return hookSuccess(hook, 
      `Recalled ${relevantLessons.length} relevant lessons`,
      {
        data: {
          lessons: relevantLessons.slice(0, 5).map(l => ({
            id: l.id,
            description: l.description,
            action: l.action,
            effectiveness: l.effectiveness
          }))
        },
        actions: relevantLessons.map(l => `apply_lesson:${l.id}`)
      }
    );
  }
};

// ============================================================================
// DECISION TRACKING HOOKS
// ============================================================================

/**
 * Decision tracking hook
 */
const onDecision: HookDefinition = {
  id: "on-decision",
  name: "Decision Tracking",
  description: "Records significant decisions for later analysis.",
  
  phase: "on-decision",
  category: "cognitive",
  mode: "logging",
  priority: "normal",
  enabled: true,
  
  tags: ["decision", "tracking", "audit"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onDecision;
    
    const decision = context.metadata?.decision as {
      type: string;
      choice: string;
      alternatives?: string[];
      rationale?: string;
    } | undefined;
    
    if (!decision) {
      return hookSuccess(hook, "No decision to track");
    }
    
    // Record the decision
    cognitiveState.decisions.push({
      timestamp: new Date().toISOString(),
      decision: `${decision.type}:${decision.choice}`
    });
    
    log.info(`Decision tracked: ${decision.type} → ${decision.choice}`);
    
    return hookSuccess(hook, `Decision recorded: ${decision.type}`, {
      data: decision,
      actions: ["decision_tracked"]
    });
  }
};

// ============================================================================
// COGNITIVE STATE ACCESS
// ============================================================================

/**
 * Get current cognitive state (for MCP tools)
 */
export function getCognitiveState(): {
  priors: Array<BayesianPrior>;
  patterns: Array<Pattern>;
  lessons: Array<Lesson>;
  recentDecisions: number;
  anomalyThreshold: number;
} {
  return {
    priors: Array.from(cognitiveState.priors.values()),
    patterns: Array.from(cognitiveState.patterns.values()),
    lessons: Array.from(cognitiveState.lessons.values()),
    recentDecisions: cognitiveState.decisions.length,
    anomalyThreshold: cognitiveState.anomalyThreshold
  };
}

/**
 * Add a known pattern
 */
export function addPattern(pattern: Pattern): void {
  cognitiveState.patterns.set(pattern.id, pattern);
}

/**
 * Add a lesson
 */
export function addLesson(lesson: Lesson): void {
  cognitiveState.lessons.set(lesson.id, lesson);
}

// ============================================================================
// EXPORT ALL COGNITIVE HOOKS
// ============================================================================

export const cognitiveHooks: HookDefinition[] = [
  // Bayesian
  onBayesianPriorInit,
  onBayesianChangeDetection,
  onBayesianHypothesisTest,
  
  // Pattern detection
  onPatternMatch,
  onRegressionPatternDetect,
  
  // Anomaly
  onAnomaly,
  
  // Learning
  onOutcome,
  onLearningUpdate,
  onLessonRecall,
  
  // Decision
  onDecision
];

export {
  onBayesianPriorInit,
  onBayesianChangeDetection,
  onBayesianHypothesisTest,
  onPatternMatch,
  onRegressionPatternDetect,
  onAnomaly,
  onOutcome,
  onLearningUpdate,
  onLessonRecall,
  onDecision
};
