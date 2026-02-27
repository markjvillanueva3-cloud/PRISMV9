---
name: prism-self-reflection
description: |
  Continuous improvement via REFL hooks. Error taxonomy and self-correction protocols.
---

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

# VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-30 | Initial creation as part of Cognitive Enhancement v7.0 |

---

**KNOW THYSELF. IMPROVE CONTINUOUSLY.**
**prism-self-reflection v1.0.0 | Cognitive Level 1 | Meta-Cognitive Assessment**
