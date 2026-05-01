const PRISM_HUMAN_FACTORS = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WORKLOAD ASSESSMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Calculate NASA Task Load Index
   * @param {Object} ratings - 0-100 ratings for each dimension
   * @param {Object} weights - Optional pairwise comparison weights
   * @returns {Object} TLX scores
   */
  nasaTLX: function(ratings, weights = null) {
    const dimensions = ['mental', 'physical', 'temporal', 'performance', 'effort', 'frustration'];
    
    // Validate ratings
    for (const dim of dimensions) {
      if (ratings[dim] === undefined || ratings[dim] < 0 || ratings[dim] > 100) {
        throw new Error(`Invalid rating for ${dim}: must be 0-100`);
      }
    }
    
    // Raw TLX (unweighted average)
    const rawTLX = dimensions.reduce((sum, dim) => sum + ratings[dim], 0) / 6;
    
    // Weighted TLX if weights provided
    let weightedTLX = rawTLX;
    if (weights) {
      const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
      weightedTLX = dimensions.reduce((sum, dim) => 
        sum + ratings[dim] * (weights[dim] || 1), 0
      ) / totalWeight;
    }
    
    // Categorize workload level
    let level, recommendation;
    if (weightedTLX < 30) {
      level = 'LOW';
      recommendation = 'Operator may be underloaded. Consider adding monitoring tasks.';
    } else if (weightedTLX < 50) {
      level = 'MODERATE';
      recommendation = 'Optimal workload range for sustained performance.';
    } else if (weightedTLX < 70) {
      level = 'HIGH';
      recommendation = 'Consider automation assistance or task redistribution.';
    } else {
      level = 'OVERLOAD';
      recommendation = 'Critical: Reduce task demands or provide significant support.';
    }
    
    return {
      rawTLX,
      weightedTLX,
      level,
      recommendation,
      breakdown: { ...ratings },
      dominantFactor: this._findDominantFactor(ratings)
    };
  },
  
  _findDominantFactor: function(ratings) {
    let max = 0, dominant = null;
    for (const [dim, value] of Object.entries(ratings)) {
      if (value > max) {
        max = value;
        dominant = dim;
      }
    }
    return { dimension: dominant, value: max };
  },
  
  /**
   * Assess overall workload from multiple indicators
   */
  assessWorkload: function(indicators) {
    const {
      taskComplexity = 50,     // 0-100
      timeAvailable = 50,      // 0-100 (higher = more time)
      errorRate = 0,           // errors per hour
      responseTime = 500,      // ms average
      baselineResponseTime = 400
    } = indicators;
    
    // Normalize indicators
    const complexityScore = taskComplexity / 100;
    const timePressure = 1 - (timeAvailable / 100);
    const errorScore = Math.min(1, errorRate / 5);  // Normalize to 5 errors/hr max
    const rtDegradation = Math.max(0, (responseTime - baselineResponseTime) / baselineResponseTime);
    
    // Weighted combination
    const workloadIndex = (
      complexityScore * 0.3 +
      timePressure * 0.25 +
      errorScore * 0.25 +
      rtDegradation * 0.2
    ) * 100;
    
    return {
      workloadIndex,
      level: workloadIndex < 30 ? 'LOW' : workloadIndex < 60 ? 'MODERATE' : workloadIndex < 80 ? 'HIGH' : 'CRITICAL',
      factors: {
        complexity: complexityScore * 100,
        timePressure: timePressure * 100,
        errorImpact: errorScore * 100,
        responseTimeDegradation: rtDegradation * 100
      }
    };
  },
  
  /**
   * Predict workload for a task configuration
   */
  predictWorkload: function(taskConfig) {
    const {
      numDisplays,
      numControls,
      updateRate,         // Hz
      decisionFrequency,  // decisions per minute
      physicalDemand      // 0-100
    } = taskConfig;
    
    // Heuristic model based on human factors research
    const visualLoad = Math.min(100, numDisplays * 8 + updateRate * 5);
    const motorLoad = Math.min(100, numControls * 5 + physicalDemand);
    const cognitiveLoad = Math.min(100, decisionFrequency * 10);
    
    const predictedWorkload = (visualLoad + motorLoad + cognitiveLoad) / 3;
    
    return {
      predictedWorkload,
      visualLoad,
      motorLoad,
      cognitiveLoad,
      sustainable: predictedWorkload < 70,
      recommendations: this._generateWorkloadRecommendations(visualLoad, motorLoad, cognitiveLoad)
    };
  },
  
  _generateWorkloadRecommendations: function(visual, motor, cognitive) {
    const recs = [];
    if (visual > 70) recs.push('Reduce display complexity or update rate');
    if (motor > 70) recs.push('Automate frequent physical actions');
    if (cognitive > 70) recs.push('Provide decision support or automation');
    if (recs.length === 0) recs.push('Workload appears manageable');
    return recs;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR PREVENTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Classify error type (Rasmussen taxonomy)
   */
  classifyError: function(errorDescription) {
    const skillBased = ['slip', 'lapse', 'misclick', 'wrong button', 'forgot', 'omit'];
    const ruleBased = ['wrong procedure', 'misapplied', 'incorrect rule', 'wrong sequence'];
    const knowledgeBased = ['didn\'t know', 'unfamiliar', 'novel', 'first time', 'unexpected'];
    
    const desc = errorDescription.toLowerCase();
    
    let type, prevention;
    
    if (skillBased.some(kw => desc.includes(kw))) {
      type = 'SKILL_BASED';
      prevention = [
        'Add forcing functions/interlocks',
        'Improve feedback on actions',
        'Use distinct controls for different functions',
        'Implement checklists for critical sequences'
      ];
    } else if (ruleBased.some(kw => desc.includes(kw))) {
      type = 'RULE_BASED';
      prevention = [
        'Improve procedure clarity',
        'Add decision support systems',
        'Provide better situational indicators',
        'Implement guided workflows'
      ];
    } else {
      type = 'KNOWLEDGE_BASED';
      prevention = [
        'Provide training for novel situations',
        'Implement AI assistance',
        'Add expert system recommendations',
        'Improve documentation access'
      ];
    }
    
    return { type, prevention, description: errorDescription };
  },
  
  /**
   * Generate error prevention strategies
   */
  errorPrevention: function(operation) {
    const strategies = {
      elimination: [],
      substitution: [],
      engineering: [],
      administrative: [],
      recovery: []
    };
    
    // Analyze operation for common error sources
    if (operation.manualEntry) {
      strategies.elimination.push('Replace manual entry with dropdown selection');
      strategies.substitution.push('Use barcode/RFID scanning instead');
    }
    
    if (operation.criticalTiming) {
      strategies.engineering.push('Add interlock to prevent premature action');
      strategies.administrative.push('Add confirmation step');
    }
    
    if (operation.sequenceDependent) {
      strategies.engineering.push('Implement sequence enforcement');
      strategies.administrative.push('Provide step-by-step wizard');
    }
    
    if (operation.irreversible) {
      strategies.engineering.push('Add physical guard or key switch');
      strategies.administrative.push('Require supervisor approval');
      strategies.recovery.push('Implement undo where possible');
    }
    
    // Always include recovery options
    strategies.recovery.push('Auto-save state before critical operations');
    strategies.recovery.push('Clear error messages with corrective actions');
    
    return strategies;
  },
  
  /**
   * Check interlock conditions
   */
  interlockCheck: function(conditions) {
    const results = [];
    let allPassed = true;
    
    for (const [name, { required, actual, message }] of Object.entries(conditions)) {
      const passed = actual === required;
      results.push({
        name,
        required,
        actual,
        passed,
        message: passed ? 'OK' : message
      });
      if (!passed) allPassed = false;
    }
    
    return {
      allPassed,
      canProceed: allPassed,
      results,
      failedConditions: results.filter(r => !r.passed)
    };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DISPLAY DESIGN
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Optimize control/display layout using Fitts' Law
   */
  optimizeLayout: function(elements, constraints = {}) {
    const { screenWidth = 1920, screenHeight = 1080, startPosition = { x: 960, y: 540 } } = constraints;
    
    // Sort by frequency of use (higher frequency = closer to start)
    const sorted = [...elements].sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
    
    // Calculate optimal positions
    const positioned = [];
    let angle = 0;
    const angleStep = (2 * Math.PI) / Math.max(8, elements.length);
    
    for (let i = 0; i < sorted.length; i++) {
      const elem = sorted[i];
      const freq = elem.frequency || 1;
      
      // Distance based on frequency (more frequent = closer)
      const distance = 100 + (1 / freq) * 200;
      
      // Size based on importance and frequency
      const size = Math.max(40, 30 + freq * 10 + (elem.importance || 0) * 10);
      
      const x = startPosition.x + distance * Math.cos(angle);
      const y = startPosition.y + distance * Math.sin(angle);
      
      positioned.push({
        ...elem,
        x: Math.max(size/2, Math.min(screenWidth - size/2, x)),
        y: Math.max(size/2, Math.min(screenHeight - size/2, y)),
        width: size,
        height: size,
        fittsID: this.fittsLaw(distance, size).indexOfDifficulty
      });
      
      angle += angleStep;
    }
    
    return {
      layout: positioned,
      averageFittsID: positioned.reduce((sum, p) => sum + p.fittsID, 0) / positioned.length
    };
  },
  
  /**
   * Apply visual hierarchy to elements
   */
  applyHierarchy: function(elements) {
    // Sort by priority (1 = highest)
    const sorted = [...elements].sort((a, b) => (a.priority || 99) - (b.priority || 99));
    
    return sorted.map((elem, index) => {
      const priority = elem.priority || index + 1;
      
      return {
        ...elem,
        fontSize: Math.max(12, 24 - priority * 2),
        fontWeight: priority <= 2 ? 'bold' : 'normal',
        opacity: Math.max(0.6, 1 - priority * 0.1),
        zIndex: 100 - priority,
        color: this._priorityColor(priority)
      };
    });
  },
  
  _priorityColor: function(priority) {
    const colors = {
      1: '#FF0000',  // Critical - Red
      2: '#FF6600',  // High - Orange
      3: '#FFCC00',  // Medium - Yellow
      4: '#00AA00',  // Normal - Green
      5: '#0066CC'   // Low - Blue
    };
    return colors[Math.min(priority, 5)] || '#666666';
  },
  
  /**
   * Generate accessible color palette
   */
  accessibleColors: function(baseColors, options = {}) {
    const { ensureContrast = true, colorblindSafe = true } = options;
    
    // Colorblind-safe palette
    const safeColors = {
      red: '#D55E00',
      orange: '#E69F00',
      yellow: '#F0E442',
      green: '#009E73',
      blue: '#0072B2',
      purple: '#CC79A7',
      gray: '#999999'
    };
    
    const result = {};
    
    for (const [name, color] of Object.entries(baseColors)) {
      result[name] = {
        original: color,
        accessible: colorblindSafe ? (safeColors[name] || color) : color,
        contrastOnWhite: this._calculateContrast(color, '#FFFFFF'),
        contrastOnBlack: this._calculateContrast(color, '#000000'),
        useOnDark: this._calculateContrast(color, '#000000') > 4.5
      };
    }
    
    return result;
  },
  
  _calculateContrast: function(color1, color2) {
    // Simplified contrast calculation
    const getLuminance = (hex) => {
      const rgb = parseInt(hex.slice(1), 16);
      const r = (rgb >> 16) & 255;
      const g = (rgb >> 8) & 255;
      const b = rgb & 255;
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    };
    
    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DECISION SUPPORT
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Generate decision recommendation with explanation
   */
  generateRecommendation: function(options, criteria, weights = null) {
    // Calculate weighted score for each option
    const scored = options.map(option => {
      let totalScore = 0;
      let totalWeight = 0;
      const breakdown = {};
      
      for (const [criterion, value] of Object.entries(option.scores || {})) {
        const weight = weights?.[criterion] || 1;
        breakdown[criterion] = { score: value, weight, weighted: value * weight };
        totalScore += value * weight;
        totalWeight += weight;
      }
      
      return {
        ...option,
        totalScore,
        normalizedScore: totalScore / totalWeight,
        breakdown
      };
    });
    
    // Sort by score
    scored.sort((a, b) => b.normalizedScore - a.normalizedScore);
    
    const recommended = scored[0];
    const alternative = scored[1];
    
    return {
      recommended: recommended.name || recommended.id,
      confidence: this._calculateConfidence(recommended, alternative),
      scores: scored,
      explanation: this._generateExplanation(recommended, criteria),
      alternatives: scored.slice(1, 3).map(s => s.name || s.id)
    };
  },
  
  _calculateConfidence: function(first, second) {
    if (!second) return 1;
    const gap = first.normalizedScore - second.normalizedScore;
    return Math.min(1, 0.5 + gap);
  },
  
  _generateExplanation: function(option, criteria) {
    const topFactors = Object.entries(option.breakdown)
      .sort((a, b) => b[1].weighted - a[1].weighted)
      .slice(0, 3)
      .map(([name, data]) => `${name}: ${(data.score * 100).toFixed(0)}%`);
    
    return `Recommended based on: ${topFactors.join(', ')}`;
  },
  
  /**
   * Explain a decision/calculation
   */
  explainDecision: function(decision, context) {
    return {
      summary: decision.summary || 'Decision made based on provided criteria',
      inputs: decision.inputs,
      process: decision.steps || ['Evaluated options', 'Applied weights', 'Selected best match'],
      result: decision.result,
      confidence: decision.confidence || 'HIGH',
      alternatives: decision.alternatives || [],
      limitations: decision.limitations || ['Based on provided data only']
    };
  },
  
  /**
   * Assess situation awareness
   */
  situationAwareness: function(data) {
    const { observedData, expectedData, context } = data;
    
    let awareness = {
      level1: 0, // Perception
      level2: 0, // Comprehension
      level3: 0, // Projection
      overall: 0
    };
    
    // Level 1: Perception (are critical elements observed?)
    let perceivedCount = 0;
    let totalCritical = 0;
    
    for (const [key, expected] of Object.entries(expectedData)) {
      if (expected.critical) {
        totalCritical++;
        if (observedData[key] !== undefined) {
          perceivedCount++;
        }
      }
    }
    
    awareness.level1 = totalCritical > 0 ? perceivedCount / totalCritical : 1;
    
    // Level 2: Comprehension (are relationships understood?)
    let comprehensionScore = 0;
    const relationships = context.relationships || [];
    
    for (const rel of relationships) {
      const val1 = observedData[rel.element1];
      const val2 = observedData[rel.element2];
      
      if (val1 !== undefined && val2 !== undefined) {
        // Check if relationship is correctly identified
        const actualRel = this._analyzeRelationship(val1, val2);
        if (actualRel === rel.expectedType) {
          comprehensionScore++;
        }
      }
    }
    
    awareness.level2 = relationships.length > 0 ? comprehensionScore / relationships.length : 1;
    
    // Level 3: Projection (future state prediction)
    const predictions = context.predictions || [];
    let projectionScore = 0;
    
    for (const pred of predictions) {
      if (observedData[pred.predictedElement] !== undefined) {
        const trend = this._calculateTrend(observedData[pred.element], pred.timeWindow);
        if (Math.abs(trend - pred.expectedTrend) < pred.tolerance) {
          projectionScore++;
        }
      }
    }
    
    awareness.level3 = predictions.length > 0 ? projectionScore / predictions.length : 1;
    
    // Overall SA score
    awareness.overall = (awareness.level1 * 0.4 + awareness.level2 * 0.35 + awareness.level3 * 0.25);
    
    return {
      ...awareness,
      assessment: awareness.overall > 0.8 ? 'HIGH' : awareness.overall > 0.6 ? 'MODERATE' : 'LOW',
      gaps: this._identifySAGaps(observedData, expectedData, awareness)
    };
  },
  
  _analyzeRelationship: function(val1, val2) {
    if (val1 > val2 * 1.1) return 'positive';
    if (val1 < val2 * 0.9) return 'negative';
    return 'stable';
  },
  
  _calculateTrend: function(values, timeWindow) {
    if (!Array.isArray(values) || values.length < 2) return 0;
    const recent = values.slice(-timeWindow);
    return (recent[recent.length - 1] - recent[0]) / recent.length;
  },
  
  _identifySAGaps: function(observed, expected, awareness) {
    const gaps = [];
    if (awareness.level1 < 0.7) gaps.push('Missing critical information');
    if (awareness.level2 < 0.7) gaps.push('Poor understanding of relationships');
    if (awareness.level3 < 0.7) gaps.push('Weak future state prediction');
    return gaps;
  }
}