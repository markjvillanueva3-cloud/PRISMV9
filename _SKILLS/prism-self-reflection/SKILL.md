# PRISM SELF-REFLECTION
## Cognitive Skill for Self-Assessment and Continuous Improvement
### Level 1 Cognitive | Part of Cognitive Enhancement v7.0
### Version 1.0.0 | 2026-01-30

---

# OVERVIEW

## Purpose
Assess own performance, identify errors, and drive continuous improvement.
This skill enables Claude to critically evaluate its work, recognize patterns
in mistakes, calibrate confidence levels, and systematically improve over time.

## Level
**L1 Cognitive** - Meta-cognitive skill for quality self-assessment

## Triggers
- Task completed (assess quality)
- Error detected (analyze cause)
- Session ending (compute improvement metrics)
- Confidence expression (calibrate)
- Repeated pattern detected (identify bias)

## Output
**Self-Assessment Report** including:
- Performance score (0.0 to 1.0)
- Error analysis
- Confidence calibration
- Improvement suggestions
- Bias warnings

## Integration
```
Quality Loop Integration:
  REFL hooks feed back into RL hooks (RL-001/002/003)
  Errors become training signals for policy updates
  
Ω(x) Integration:
  Self-reflection contributes to L(x) learning component
  Identifies areas needing improvement
```

---

# HOOKS

## REFL-001: Action Completed - Assess Quality
```
Trigger: action:completed
Action: Assess quality of just-completed action
Fires: After every significant action (file write, calculation, decision)

Process:
1. Capture action details (what was done)
2. Evaluate against quality criteria
3. Compare to similar past actions
4. Compute quality score
5. Identify what went well/poorly
6. Generate improvement notes

Output: {
  action_id: string,
  action_type: string,
  quality_score: number,
  criteria_scores: Map<string, number>,
  strengths: string[],
  weaknesses: string[],
  improvement_notes: string[]
}
```

## REFL-002: Error Detected - Analyze Mistake
```
Trigger: error:detected
Action: Analyze error to understand root cause and prevent recurrence
Fires: When any error or mistake is identified

Process:
1. Classify error type
2. Identify immediate cause
3. Trace to root cause (using CAUSAL-003)
4. Check for pattern (repeated error?)
5. Generate prevention strategy
6. Update error catalog

Output: {
  error_id: string,
  error_type: string,
  severity: "minor" | "moderate" | "major" | "critical",
  immediate_cause: string,
  root_cause: string,
  is_repeated: boolean,
  prevention_strategy: string,
  similar_past_errors: Error[]
}
```

## REFL-003: Session End - Compute Improvement
```
Trigger: session:end
Action: Compute overall session performance and improvement trajectory
Fires: At end of every session

Process:
1. Aggregate all action quality scores
2. Analyze error patterns
3. Compare to previous sessions
4. Compute improvement trajectory
5. Generate session report
6. Feed insights to RL-003

Output: {
  session_id: string,
  overall_quality: number,
  error_count: number,
  error_rate: number,
  improvement_vs_baseline: number,
  key_learnings: string[],
  focus_areas: string[],
  trajectory: "improving" | "stable" | "declining"
}
```

---

# PERFORMANCE TRACKING METRICS

## Core Metrics

```javascript
const PERFORMANCE_METRICS = {
  // Accuracy metrics
  accuracy: {
    factual_correctness: {
      description: "Were facts stated correctly?",
      weight: 0.20,
      measurement: "errors / total_facts"
    },
    calculation_accuracy: {
      description: "Were calculations correct?",
      weight: 0.15,
      measurement: "correct_calcs / total_calcs"
    },
    requirement_fulfillment: {
      description: "Did output meet requirements?",
      weight: 0.20,
      measurement: "requirements_met / total_requirements"
    }
  },
  
  // Efficiency metrics
  efficiency: {
    token_efficiency: {
      description: "Information per token",
      weight: 0.10,
      measurement: "useful_info / total_tokens"
    },
    tool_call_efficiency: {
      description: "Results per tool call",
      weight: 0.10,
      measurement: "successful_calls / total_calls"
    },
    iteration_count: {
      description: "Attempts to complete task",
      weight: 0.05,
      measurement: "1 / attempts (normalized)"
    }
  },
  
  // Quality metrics
  quality: {
    completeness: {
      description: "Was task fully completed?",
      weight: 0.15,
      measurement: "components_complete / total_components"
    },
    consistency: {
      description: "Is output internally consistent?",
      weight: 0.05,
      measurement: "1 - contradictions_found"
    }
  }
};

function computePerformanceScore(metrics) {
  let totalScore = 0;
  let totalWeight = 0;
  
  for (const category of Object.values(PERFORMANCE_METRICS)) {
    for (const metric of Object.values(category)) {
      const value = metrics[metric.name] || 0;
      totalScore += value * metric.weight;
      totalWeight += metric.weight;
    }
  }
  
  return totalWeight > 0 ? totalScore / totalWeight : 0;
}
```

## Tracking Over Time

```javascript
class PerformanceTracker {
  constructor() {
    this.history = [];
    this.windowSize = 10; // Sessions for moving average
  }
  
  recordSession(sessionMetrics) {
    this.history.push({
      timestamp: Date.now(),
      metrics: sessionMetrics,
      score: computePerformanceScore(sessionMetrics)
    });
  }
  
  getMovingAverage() {
    const recent = this.history.slice(-this.windowSize);
    if (recent.length === 0) return 0;
    return recent.reduce((sum, s) => sum + s.score, 0) / recent.length;
  }
  
  getTrend() {
    if (this.history.length < 3) return "insufficient_data";
    
    const recent = this.history.slice(-5);
    const older = this.history.slice(-10, -5);
    
    const recentAvg = recent.reduce((s, x) => s + x.score, 0) / recent.length;
    const olderAvg = older.length > 0 
      ? older.reduce((s, x) => s + x.score, 0) / older.length
      : recentAvg;
    
    const diff = recentAvg - olderAvg;
    
    if (diff > 0.05) return "improving";
    if (diff < -0.05) return "declining";
    return "stable";
  }
  
  getWeakestAreas() {
    const recent = this.history.slice(-this.windowSize);
    const metricScores = {};
    
    for (const session of recent) {
      for (const [metric, value] of Object.entries(session.metrics)) {
        if (!metricScores[metric]) metricScores[metric] = [];
        metricScores[metric].push(value);
      }
    }
    
    const avgScores = Object.entries(metricScores).map(([metric, values]) => ({
      metric,
      average: values.reduce((a, b) => a + b, 0) / values.length
    }));
    
    return avgScores
      .sort((a, b) => a.average - b.average)
      .slice(0, 3)
      .map(x => x.metric);
  }
}
```

---

# ERROR CLASSIFICATION TAXONOMY

## Error Types

```javascript
const ERROR_TAXONOMY = {
  // KNOWLEDGE ERRORS - Wrong facts or information
  knowledge: {
    code: "ERR-K",
    types: {
      factual: {
        description: "Stated incorrect fact",
        severity: "moderate",
        prevention: "Verify facts before stating, use uncertainty qualifiers"
      },
      outdated: {
        description: "Used outdated information",
        severity: "minor",
        prevention: "Check recency of information, flag potential staleness"
      },
      incomplete: {
        description: "Missing relevant information",
        severity: "minor",
        prevention: "More thorough information gathering"
      },
      conflated: {
        description: "Mixed up similar but different concepts",
        severity: "moderate",
        prevention: "Explicit differentiation checks"
      }
    }
  },
  
  // REASONING ERRORS - Flawed logic or analysis
  reasoning: {
    code: "ERR-R",
    types: {
      logical_fallacy: {
        description: "Used invalid logical reasoning",
        severity: "major",
        prevention: "Apply formal logic checks, identify assumption chains"
      },
      incorrect_inference: {
        description: "Drew wrong conclusion from correct premises",
        severity: "moderate",
        prevention: "Verify inference steps explicitly"
      },
      missing_consideration: {
        description: "Failed to consider relevant factor",
        severity: "moderate",
        prevention: "Systematic consideration checklist"
      },
      overconfidence: {
        description: "Too confident in uncertain conclusion",
        severity: "minor",
        prevention: "Calibrate confidence, use uncertainty ranges"
      }
    }
  },
  
  // EXECUTION ERRORS - Wrong actions taken
  execution: {
    code: "ERR-E",
    types: {
      wrong_tool: {
        description: "Used incorrect tool for task",
        severity: "minor",
        prevention: "Review tool selection criteria"
      },
      wrong_parameters: {
        description: "Used incorrect parameters",
        severity: "moderate",
        prevention: "Parameter validation before use"
      },
      wrong_sequence: {
        description: "Actions in wrong order",
        severity: "moderate",
        prevention: "Explicit sequencing checks"
      },
      incomplete_action: {
        description: "Action not fully completed",
        severity: "moderate",
        prevention: "Completion verification"
      }
    }
  },
  
  // COMMUNICATION ERRORS - Poor explanation or presentation
  communication: {
    code: "ERR-C",
    types: {
      unclear: {
        description: "Explanation was confusing",
        severity: "minor",
        prevention: "Clarity checks, simpler language"
      },
      verbose: {
        description: "Too much unnecessary detail",
        severity: "minor",
        prevention: "Conciseness review"
      },
      missing_context: {
        description: "Failed to provide needed context",
        severity: "minor",
        prevention: "Context completeness check"
      },
      wrong_tone: {
        description: "Inappropriate tone for situation",
        severity: "minor",
        prevention: "Tone calibration"
      }
    }
  },
  
  // SAFETY ERRORS - Potentially harmful outputs
  safety: {
    code: "ERR-S",
    types: {
      unsafe_value: {
        description: "Output contained unsafe parameter",
        severity: "critical",
        prevention: "Safety validation gate (S(x) ≥ 0.70)"
      },
      missing_warning: {
        description: "Failed to warn about risk",
        severity: "major",
        prevention: "Risk assessment checklist"
      },
      incomplete_validation: {
        description: "Insufficient validation before output",
        severity: "major",
        prevention: "Multi-layer validation"
      }
    }
  }
};

function classifyError(error) {
  // Match error to taxonomy
  for (const [category, data] of Object.entries(ERROR_TAXONOMY)) {
    for (const [type, info] of Object.entries(data.types)) {
      if (matchesErrorPattern(error, category, type)) {
        return {
          category,
          type,
          code: `${data.code}-${type.toUpperCase().slice(0, 3)}`,
          severity: info.severity,
          prevention: info.prevention
        };
      }
    }
  }
  
  return {
    category: "unknown",
    type: "unclassified",
    code: "ERR-UNK",
    severity: "moderate",
    prevention: "Manual analysis required"
  };
}
```

## Error Pattern Detection

```javascript
class ErrorPatternDetector {
  constructor() {
    this.errors = [];
    this.patterns = new Map();
  }
  
  recordError(error) {
    const classified = classifyError(error);
    this.errors.push({
      ...error,
      ...classified,
      timestamp: Date.now()
    });
    
    // Update pattern counts
    const patternKey = `${classified.category}:${classified.type}`;
    const count = (this.patterns.get(patternKey) || 0) + 1;
    this.patterns.set(patternKey, count);
    
    return this.checkForPattern(classified);
  }
  
  checkForPattern(classified) {
    const patternKey = `${classified.category}:${classified.type}`;
    const count = this.patterns.get(patternKey) || 0;
    
    // Check for repeated pattern
    if (count >= 3) {
      return {
        isPattern: true,
        patternKey,
        occurrences: count,
        recommendation: `Repeated error pattern detected (${count}x): ${classified.type}. ` +
                       `Prevention strategy: ${classified.prevention}`
      };
    }
    
    // Check for recent cluster
    const recentErrors = this.errors.filter(e => 
      e.category === classified.category &&
      Date.now() - e.timestamp < 3600000 // Last hour
    );
    
    if (recentErrors.length >= 2) {
      return {
        isPattern: true,
        patternKey: `${classified.category}:recent_cluster`,
        occurrences: recentErrors.length,
        recommendation: `Multiple ${classified.category} errors in short time. ` +
                       `Consider slowing down and double-checking.`
      };
    }
    
    return { isPattern: false };
  }
  
  getTopPatterns(n = 5) {
    return Array.from(this.patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([key, count]) => {
        const [category, type] = key.split(':');
        return { category, type, count };
      });
  }
}
```

---

# SELF-CORRECTION MECHANISMS

## Correction Protocol

```javascript
const SELF_CORRECTION_PROTOCOL = {
  // When to trigger self-correction
  triggers: {
    error_detected: true,
    low_confidence: true,        // Confidence < 0.5
    inconsistency_found: true,
    user_correction: true,
    validation_failed: true
  },
  
  // Steps for self-correction
  steps: [
    {
      name: "acknowledge",
      action: "Explicitly acknowledge the error",
      importance: "critical",
      example: "I made an error in my previous calculation."
    },
    {
      name: "identify",
      action: "Identify what specifically was wrong",
      importance: "critical",
      example: "The specific error was: I used hardness instead of yield strength."
    },
    {
      name: "understand",
      action: "Explain why the error occurred",
      importance: "important",
      example: "This happened because I conflated two similar material properties."
    },
    {
      name: "correct",
      action: "Provide the correct information/output",
      importance: "critical",
      example: "The correct value should be: yield strength = 450 MPa."
    },
    {
      name: "verify",
      action: "Verify the correction is accurate",
      importance: "critical",
      example: "I've verified this against the material database."
    },
    {
      name: "prevent",
      action: "Note how to prevent this error in future",
      importance: "important",
      example: "In future, I'll explicitly confirm which property is needed."
    }
  ]
};

function executeSelfCorrection(error, context) {
  const correction = {
    error_id: error.id,
    original: error.original_output,
    steps_completed: []
  };
  
  for (const step of SELF_CORRECTION_PROTOCOL.steps) {
    const stepResult = executeStep(step, error, context);
    correction.steps_completed.push({
      step: step.name,
      completed: stepResult.success,
      output: stepResult.output
    });
    
    // Critical steps must succeed
    if (step.importance === "critical" && !stepResult.success) {
      correction.status = "incomplete";
      correction.blocked_at = step.name;
      return correction;
    }
  }
  
  correction.status = "complete";
  correction.corrected_output = generateCorrectedOutput(correction);
  
  return correction;
}
```

## Proactive Error Prevention

```javascript
function proactiveErrorPrevention(action, context) {
  const risks = [];
  
  // Check common error patterns
  const topPatterns = errorPatternDetector.getTopPatterns(3);
  for (const pattern of topPatterns) {
    if (actionMatchesPattern(action, pattern)) {
      risks.push({
        type: "historical_pattern",
        pattern: pattern,
        message: `This action type has caused ${pattern.count} errors before`,
        prevention: ERROR_TAXONOMY[pattern.category]?.types[pattern.type]?.prevention
      });
    }
  }
  
  // Check for high-risk characteristics
  if (action.type === "calculation" && !action.validated) {
    risks.push({
      type: "unvalidated_calculation",
      message: "Calculation not yet validated",
      prevention: "Run validation before output"
    });
  }
  
  if (action.confidence < 0.7) {
    risks.push({
      type: "low_confidence",
      message: `Confidence is only ${(action.confidence * 100).toFixed(0)}%`,
      prevention: "Seek additional verification or express uncertainty"
    });
  }
  
  if (action.involves_safety && !action.safety_checked) {
    risks.push({
      type: "unchecked_safety",
      message: "Safety-relevant action without safety check",
      prevention: "Run S(x) validation before proceeding"
    });
  }
  
  return {
    action_id: action.id,
    risk_count: risks.length,
    risks,
    recommendation: risks.length > 0 
      ? "Address risks before proceeding" 
      : "Low risk, proceed normally"
  };
}
```

---

# CONFIDENCE CALIBRATION

## Calibration Algorithm

```javascript
class ConfidenceCalibrator {
  constructor() {
    this.predictions = [];  // {predicted_confidence, actual_outcome}
  }
  
  record(predictedConfidence, actualOutcome) {
    this.predictions.push({
      predicted: predictedConfidence,
      actual: actualOutcome,  // 1 = correct, 0 = incorrect
      timestamp: Date.now()
    });
  }
  
  computeCalibrationError() {
    // Expected Calibration Error (ECE)
    // Group predictions into bins, compare average confidence vs accuracy
    
    const bins = Array(10).fill(null).map(() => ({ predictions: [], actual: [] }));
    
    for (const p of this.predictions) {
      const binIndex = Math.min(9, Math.floor(p.predicted * 10));
      bins[binIndex].predictions.push(p.predicted);
      bins[binIndex].actual.push(p.actual);
    }
    
    let ece = 0;
    let totalPredictions = this.predictions.length;
    
    for (const bin of bins) {
      if (bin.predictions.length === 0) continue;
      
      const avgConfidence = bin.predictions.reduce((a, b) => a + b, 0) / bin.predictions.length;
      const accuracy = bin.actual.reduce((a, b) => a + b, 0) / bin.actual.length;
      const binWeight = bin.predictions.length / totalPredictions;
      
      ece += binWeight * Math.abs(avgConfidence - accuracy);
    }
    
    return ece;  // Lower is better calibrated
  }
  
  getCalibrationAdvice() {
    const ece = this.computeCalibrationError();
    
    // Check for systematic bias
    const overconfidentCount = this.predictions.filter(p => 
      p.predicted > 0.8 && p.actual === 0
    ).length;
    
    const underconfidentCount = this.predictions.filter(p =>
      p.predicted < 0.5 && p.actual === 1
    ).length;
    
    const advice = [];
    
    if (ece > 0.15) {
      advice.push("Calibration error is high - confidence doesn't match accuracy");
    }
    
    if (overconfidentCount > this.predictions.length * 0.1) {
      advice.push("Tendency to be overconfident - reduce confidence on uncertain items");
    }
    
    if (underconfidentCount > this.predictions.length * 0.1) {
      advice.push("Tendency to be underconfident - can express more confidence when warranted");
    }
    
    return {
      ece,
      overconfident: overconfidentCount,
      underconfident: underconfidentCount,
      advice
    };
  }
  
  calibrate(rawConfidence) {
    // Apply calibration adjustment based on historical data
    const calibration = this.getCalibrationAdvice();
    
    if (calibration.overconfident > calibration.underconfident) {
      // Tend to be overconfident - reduce
      return rawConfidence * 0.85;
    } else if (calibration.underconfident > calibration.overconfident) {
      // Tend to be underconfident - increase (but not above 0.95)
      return Math.min(0.95, rawConfidence * 1.1);
    }
    
    return rawConfidence;
  }
}
```

## Confidence Expression Guidelines

```javascript
const CONFIDENCE_GUIDELINES = {
  ranges: {
    very_high: {
      range: [0.90, 1.00],
      expressions: [
        "I'm confident that...",
        "This is certainly...",
        "Without doubt..."
      ],
      appropriate_when: "Verified facts, mathematical certainties"
    },
    high: {
      range: [0.75, 0.90],
      expressions: [
        "I believe...",
        "This is likely...",
        "With high confidence..."
      ],
      appropriate_when: "Well-supported conclusions, verified data"
    },
    moderate: {
      range: [0.50, 0.75],
      expressions: [
        "I think...",
        "This appears to be...",
        "Probably..."
      ],
      appropriate_when: "Reasonable inferences, partial evidence"
    },
    low: {
      range: [0.25, 0.50],
      expressions: [
        "I'm uncertain, but...",
        "This might be...",
        "Possibly..."
      ],
      appropriate_when: "Speculation, limited evidence"
    },
    very_low: {
      range: [0.00, 0.25],
      expressions: [
        "I'm not sure...",
        "This is speculative...",
        "I don't have enough information..."
      ],
      appropriate_when: "Guessing, no supporting evidence"
    }
  },
  
  rules: [
    "Never express certainty without verification",
    "Use uncertainty ranges for calculations",
    "Flag when confidence is based on limited data",
    "Distinguish between factual confidence and predictive confidence"
  ]
};

function selectConfidenceExpression(calibratedConfidence) {
  for (const [level, data] of Object.entries(CONFIDENCE_GUIDELINES.ranges)) {
    if (calibratedConfidence >= data.range[0] && calibratedConfidence < data.range[1]) {
      return {
        level,
        expressions: data.expressions,
        appropriate_when: data.appropriate_when
      };
    }
  }
  return CONFIDENCE_GUIDELINES.ranges.moderate;
}
```

---

# BIAS DETECTION PATTERNS

## Common Cognitive Biases

```javascript
const COGNITIVE_BIASES = {
  // CONFIRMATION BIAS
  confirmation: {
    description: "Favoring information that confirms existing beliefs",
    detection_signals: [
      "Ignoring contradicting evidence",
      "Selective citation",
      "Interpretation always supports initial hypothesis"
    ],
    prevention: "Actively seek disconfirming evidence, steel-man opposing views"
  },
  
  // ANCHORING BIAS
  anchoring: {
    description: "Over-relying on first piece of information",
    detection_signals: [
      "Final answer too close to initial estimate",
      "Insufficient adjustment from starting point",
      "Ignoring new information that should shift estimate"
    ],
    prevention: "Consider multiple starting points, reason from first principles"
  },
  
  // AVAILABILITY BIAS
  availability: {
    description: "Overweighting easily recalled information",
    detection_signals: [
      "Recent examples dominate reasoning",
      "Vivid cases overrepresented",
      "Base rates ignored"
    ],
    prevention: "Consult statistical base rates, consider full range of evidence"
  },
  
  // OVERCONFIDENCE BIAS
  overconfidence: {
    description: "Excessive confidence in own knowledge/predictions",
    detection_signals: [
      "Narrow confidence intervals",
      "Certainty without verification",
      "Underestimating task difficulty"
    ],
    prevention: "Use calibrated confidence, seek verification, consider what could go wrong"
  },
  
  // SUNK COST FALLACY
  sunk_cost: {
    description: "Continuing due to past investment rather than future value",
    detection_signals: [
      "Persisting with failing approach",
      "Reluctance to abandon previous work",
      "Justifying current path by past effort"
    ],
    prevention: "Evaluate current options ignoring past investment"
  },
  
  // RECENCY BIAS
  recency: {
    description: "Overweighting recent events/information",
    detection_signals: [
      "Latest information dominates",
      "Historical patterns ignored",
      "Short-term trends extrapolated"
    ],
    prevention: "Consider longer time horizons, weight historical evidence appropriately"
  },
  
  // AUTOMATION BIAS
  automation: {
    description: "Over-trusting automated systems or calculations",
    detection_signals: [
      "Accepting computed results without sanity check",
      "Not questioning tool outputs",
      "Treating model output as ground truth"
    ],
    prevention: "Always sanity-check automated outputs, maintain healthy skepticism"
  }
};

function detectBiases(reasoning_trace) {
  const detected = [];
  
  for (const [bias, info] of Object.entries(COGNITIVE_BIASES)) {
    const signals = checkForSignals(reasoning_trace, info.detection_signals);
    
    if (signals.length > 0) {
      detected.push({
        bias,
        description: info.description,
        signals_found: signals,
        prevention: info.prevention,
        confidence: signals.length / info.detection_signals.length
      });
    }
  }
  
  return detected.sort((a, b) => b.confidence - a.confidence);
}

function checkForSignals(trace, signals) {
  const found = [];
  
  for (const signal of signals) {
    if (traceContainsSignal(trace, signal)) {
      found.push(signal);
    }
  }
  
  return found;
}
```

---

# IMPROVEMENT SUGGESTION GENERATION

## Suggestion Generator

```javascript
function generateImprovementSuggestions(sessionAnalysis) {
  const suggestions = [];
  
  // Based on error patterns
  const topPatterns = sessionAnalysis.errorPatterns.slice(0, 3);
  for (const pattern of topPatterns) {
    suggestions.push({
      area: "error_prevention",
      priority: pattern.count >= 3 ? "high" : "medium",
      suggestion: `Address repeated ${pattern.type} errors: ${pattern.prevention}`,
      expected_impact: `Could prevent ${pattern.count} future errors`
    });
  }
  
  // Based on performance metrics
  const weakAreas = sessionAnalysis.weakestMetrics;
  for (const metric of weakAreas) {
    suggestions.push({
      area: "performance",
      priority: metric.score < 0.5 ? "high" : "medium",
      suggestion: `Improve ${metric.name}: currently at ${(metric.score * 100).toFixed(0)}%`,
      expected_impact: `Could improve overall quality by ${((0.8 - metric.score) * metric.weight * 100).toFixed(0)}%`
    });
  }
  
  // Based on confidence calibration
  const calibration = sessionAnalysis.calibration;
  if (calibration.ece > 0.15) {
    suggestions.push({
      area: "calibration",
      priority: "medium",
      suggestion: calibration.advice[0] || "Improve confidence calibration",
      expected_impact: "More reliable uncertainty communication"
    });
  }
  
  // Based on detected biases
  for (const bias of sessionAnalysis.detectedBiases) {
    if (bias.confidence > 0.5) {
      suggestions.push({
        area: "bias",
        priority: bias.confidence > 0.7 ? "high" : "medium",
        suggestion: `Watch for ${bias.bias}: ${bias.prevention}`,
        expected_impact: "More objective reasoning"
      });
    }
  }
  
  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return suggestions.slice(0, 5);  // Top 5 suggestions
}
```

## Quality Trend Analysis

```javascript
function analyzeQualityTrend(performanceHistory) {
  if (performanceHistory.length < 3) {
    return { trend: "insufficient_data", analysis: "Need more data points" };
  }
  
  // Compute moving averages
  const shortWindow = 3;
  const longWindow = Math.min(10, performanceHistory.length);
  
  const shortAvg = computeAverage(performanceHistory.slice(-shortWindow));
  const longAvg = computeAverage(performanceHistory.slice(-longWindow));
  
  // Compute linear regression for trend
  const regression = linearRegression(
    performanceHistory.map((_, i) => i),
    performanceHistory.map(p => p.score)
  );
  
  // Analyze
  const analysis = {
    shortTermAverage: shortAvg,
    longTermAverage: longAvg,
    trend: regression.slope > 0.01 ? "improving" :
           regression.slope < -0.01 ? "declining" : "stable",
    momentum: shortAvg - longAvg,
    volatility: computeStdDev(performanceHistory.map(p => p.score)),
    prediction: {
      nextSession: shortAvg + regression.slope,
      confidence: Math.max(0.5, 1 - Math.abs(regression.slope) * 10)
    }
  };
  
  // Generate narrative
  if (analysis.trend === "improving") {
    analysis.narrative = `Quality is improving (${(regression.slope * 100).toFixed(1)}%/session). ` +
                        `Current performance: ${(shortAvg * 100).toFixed(0)}%.`;
  } else if (analysis.trend === "declining") {
    analysis.narrative = `Warning: Quality declining (${(regression.slope * 100).toFixed(1)}%/session). ` +
                        `Review recent changes and error patterns.`;
  } else {
    analysis.narrative = `Quality is stable at ${(shortAvg * 100).toFixed(0)}%. ` +
                        `Consider targeted improvements.`;
  }
  
  return analysis;
}
```

---

# INTEGRATION WITH RL HOOKS

## Learning Loop Integration

```javascript
const LEARNING_INTEGRATION = {
  // REFL → RL Connection
  connection: {
    REFL_001_to_RL_001: {
      trigger: "Action completed with quality assessment",
      data_passed: {
        action_quality: "Quality score becomes part of state",
        strengths: "Positive reinforcement signals",
        weaknesses: "Areas for policy update"
      }
    },
    REFL_002_to_RL_002: {
      trigger: "Error analyzed",
      data_passed: {
        error_type: "Negative reward signal",
        root_cause: "Feature for policy learning",
        prevention: "Action to reinforce"
      }
    },
    REFL_003_to_RL_003: {
      trigger: "Session improvement computed",
      data_passed: {
        improvement_trajectory: "Long-term reward signal",
        focus_areas: "Priority updates for policy",
        key_learnings: "New knowledge to encode"
      }
    }
  },
  
  // Reward shaping from reflection
  rewardShaping: {
    positive_signals: [
      { condition: "error_count = 0", reward: 0.2 },
      { condition: "quality_score > 0.9", reward: 0.3 },
      { condition: "improvement_vs_baseline > 0", reward: 0.1 },
      { condition: "no_safety_errors", reward: 0.2 }
    ],
    negative_signals: [
      { condition: "safety_error", reward: -0.5 },
      { condition: "repeated_error", reward: -0.2 },
      { condition: "quality_score < 0.5", reward: -0.1 },
      { condition: "declining_trajectory", reward: -0.1 }
    ]
  }
};

function computeReflectionReward(reflectionResults) {
  let reward = 0;
  
  // Apply positive signals
  for (const signal of LEARNING_INTEGRATION.rewardShaping.positive_signals) {
    if (evaluateCondition(signal.condition, reflectionResults)) {
      reward += signal.reward;
    }
  }
  
  // Apply negative signals
  for (const signal of LEARNING_INTEGRATION.rewardShaping.negative_signals) {
    if (evaluateCondition(signal.condition, reflectionResults)) {
      reward += signal.reward;
    }
  }
  
  return reward;
}
```

---

# EXAMPLE SCENARIOS

## Scenario 1: Calculation Error Self-Correction

```
CONTEXT:
- Claude calculated cutting speed as 500 m/min for titanium
- User pointed out this is dangerously high

REFL-002 FIRES (error:detected):
Classification:
- Category: knowledge
- Type: factual
- Severity: major (safety-relevant)
- Code: ERR-K-FAC

Analysis:
- Immediate cause: Used wrong material properties lookup
- Root cause: Confused Ti-6Al-4V with aluminum alloy
- Is repeated: No (first occurrence)

SELF-CORRECTION EXECUTED:
1. ACKNOWLEDGE: "I made a significant error in my speed calculation."
2. IDENTIFY: "I incorrectly used aluminum's machinability data for titanium."
3. UNDERSTAND: "This confusion arose because both alloys were recently discussed."
4. CORRECT: "The correct cutting speed for Ti-6Al-4V is 50-80 m/min, not 500 m/min."
5. VERIFY: "Verified against material database - Ti-6Al-4V max speed is 80 m/min."
6. PREVENT: "I'll implement explicit material verification for future calculations."

LEARNING INTEGRATION:
- Error recorded for pattern detection
- Negative reward (-0.3) sent to RL-002
- Prevention strategy added to working memory
```

## Scenario 2: Confidence Calibration

```
CONTEXT:
- Over last 10 sessions, Claude expressed high confidence (>0.8) 15 times
- Of those 15, 4 were incorrect (27% error rate vs expected <20%)

CALIBRATION ANALYSIS:
- ECE: 0.18 (above target of 0.15)
- Overconfident predictions: 4
- Underconfident predictions: 1

DIAGNOSIS:
- Systematic overconfidence in high-confidence range
- Particularly on inference tasks (not direct facts)

CALIBRATION ADJUSTMENT:
- Raw confidence 0.85 → Calibrated confidence 0.72
- Now using "I believe" instead of "I'm confident"

IMPROVEMENT SUGGESTIONS:
1. [HIGH] Reduce confidence on inference tasks by 10-15%
2. [MEDIUM] Add explicit verification for confidence > 0.8
3. [MEDIUM] Track confidence by task type separately
```

## Scenario 3: Session End Analysis

```
SESSION SUMMARY:
- Duration: 45 minutes
- Tasks completed: 3
- Tool calls: 12
- Errors detected: 2

REFL-003 FIRES (session:end):

QUALITY METRICS:
- Factual correctness: 0.92
- Calculation accuracy: 0.88
- Requirement fulfillment: 1.00
- Token efficiency: 0.85
- Tool call efficiency: 0.92
- Overall score: 0.91

ERROR ANALYSIS:
1. ERR-C-UNC: Unclear explanation (minor) - corrected
2. ERR-R-INC: Incorrect inference (moderate) - caught by user

TREND ANALYSIS:
- Previous 5 sessions: [0.85, 0.88, 0.87, 0.90, 0.91]
- Trend: Improving (+0.012/session)
- Current vs baseline: +6%

IMPROVEMENT SUGGESTIONS:
1. [MEDIUM] Inference accuracy needs work (2nd error this type)
2. [LOW] Clarity of explanations could improve

KEY LEARNINGS:
- Material property lookups need verification step
- User prefers concise explanations

SESSION REWARD: +0.25 (good performance, minor errors, improvement)
```

---

# ANTI-REGRESSION VERIFICATION

## MS-5 Checklist: All 16 Items Complete

- [x] 1. Create skill directory structure
- [x] 2. Write skill header (purpose, level, triggers)
- [x] 3. Define REFL-001 hook (action:completed → assess quality)
- [x] 4. Define REFL-002 hook (error:detected → analyze mistake)
- [x] 5. Define REFL-003 hook (session:end → compute improvement)
- [x] 6. Performance tracking metrics
- [x] 7. Error classification taxonomy
- [x] 8. Self-correction mechanisms
- [x] 9. Confidence calibration algorithm
- [x] 10. Bias detection patterns
- [x] 11. Learning integration with RL hooks
- [x] 12. Improvement suggestion generation
- [x] 13. Quality trend analysis
- [x] 14. Integration with master equation
- [x] 15. Example self-reflection scenarios (3 scenarios)
- [x] 16. Anti-regression verification

---

# VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-30 | Initial creation as part of Cognitive Enhancement v7.0 |

---

**KNOW THYSELF. IMPROVE CONTINUOUSLY.**
**prism-self-reflection v1.0.0 | Cognitive Level 1 | Meta-Cognitive Assessment**
