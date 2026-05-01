// PRISM_LEARNING_FEEDBACK_CONNECTOR - Lines 496632-496882 (251 lines) - Learning feedback connector\n\nconst PRISM_LEARNING_FEEDBACK_CONNECTOR = {
  version: '1.0.0',

  // Feedback storage
  feedbackDatabase: {
    toolpathOutcomes: [],
    toolLifeOutcomes: [],
    cycleTimeOutcomes: [],
    surfaceFinishOutcomes: [],
    parameterOutcomes: []
  },
  /**
   * Record actual machining outcome
   */
  recordOutcome(params) {
    const {
      type,           // 'toolpath', 'tool_life', 'cycle_time', 'surface_finish', 'parameters'
      predicted,      // What was predicted
      actual,         // What actually happened
      context,        // Material, machine, tool, etc.
      timestamp = Date.now()
    } = params;

    const outcome = {
      id: 'OUT_' + timestamp,
      type,
      predicted,
      actual,
      error: this._calculateError(predicted, actual, type),
      context,
      timestamp
    };
    // Store in appropriate database
    const dbKey = type + 'Outcomes';
    if (this.feedbackDatabase[dbKey]) {
      this.feedbackDatabase[dbKey].push(outcome);

      // Limit to 1000 most recent
      if (this.feedbackDatabase[dbKey].length > 1000) {
        this.feedbackDatabase[dbKey] = this.feedbackDatabase[dbKey].slice(-1000);
      }
    }
    // Trigger learning update
    this._updateLearningEngines(outcome);

    // Persist to localStorage
    this._persist();

    console.log(`[FEEDBACK] Recorded ${type} outcome: error=${outcome.error.toFixed(2)}%`);

    return outcome;
  },
  /**
   * Calculate prediction error
   */
  _calculateError(predicted, actual, type) {
    if (typeof predicted === 'number' && typeof actual === 'number') {
      if (actual === 0) return predicted === 0 ? 0 : 100;
      return Math.abs((predicted - actual) / actual) * 100;
    }
    // For categorical (strategy selection)
    if (type === 'toolpath') {
      return predicted === actual ? 0 : 100;
    }
    return 50; // Unknown
  },
  /**
   * Update learning engines with new data
   */
  _updateLearningEngines(outcome) {
    const { type, context, error, predicted, actual } = outcome;

    // Update PRISM_CAM_LEARNING_ENGINE
    if (type === 'toolpath' && typeof PRISM_CAM_LEARNING_ENGINE !== 'undefined') {
      this._updateCAMLearning(outcome);
    }
    // Update CUTTING_TOOL_CAD_LEARNING_ENGINE
    if (type === 'tool_life' && typeof CUTTING_TOOL_CAD_LEARNING_ENGINE !== 'undefined') {
      this._updateToolLearning(outcome);
    }
    // Update PRISM_INTELLIGENT_STRATEGY_SELECTOR
    if (type === 'toolpath' && typeof PRISM_INTELLIGENT_STRATEGY_SELECTOR !== 'undefined') {
      this._updateStrategyScoring(outcome);
    }
    // Update PRISM_TOOL_LIFE_ESTIMATOR
    if (type === 'tool_life' && typeof PRISM_TOOL_LIFE_ESTIMATOR !== 'undefined') {
      this._updateToolLifeConstants(outcome);
    }
    // Update PRISM_ACCURATE_CYCLE_TIME
    if (type === 'cycle_time' && typeof PRISM_ACCURATE_CYCLE_TIME !== 'undefined') {
      this._updateCycleTimeFactors(outcome);
    }
  },
  /**
   * Update CAM learning with outcome
   */
  _updateCAMLearning(outcome) {
    if (!PRISM_CAM_LEARNING_ENGINE.feedbackAdjustments) {
      PRISM_CAM_LEARNING_ENGINE.feedbackAdjustments = {};
    }
    const key = `${outcome.context?.featureType}_${outcome.context?.material}`;
    const adj = PRISM_CAM_LEARNING_ENGINE.feedbackAdjustments[key] || { samples: 0, bias: 0 };

    // Update bias based on actual vs predicted
    const newBias = (adj.bias * adj.samples + (outcome.actual === outcome.predicted ? 0 : 1)) / (adj.samples + 1);

    PRISM_CAM_LEARNING_ENGINE.feedbackAdjustments[key] = {
      samples: adj.samples + 1,
      bias: newBias,
      lastUpdate: outcome.timestamp
    };
  },
  /**
   * Update tool learning
   */
  _updateToolLearning(outcome) {
    // Store correction factor for this tool/material combo
    const key = `${outcome.context?.tool}_${outcome.context?.material}`;

    if (!CUTTING_TOOL_CAD_LEARNING_ENGINE.lifeCorrectionFactors) {
      CUTTING_TOOL_CAD_LEARNING_ENGINE.lifeCorrectionFactors = {};
    }
    const actual = outcome.actual || 1;
    const predicted = outcome.predicted || 1;
    const correctionFactor = actual / predicted;

    const existing = CUTTING_TOOL_CAD_LEARNING_ENGINE.lifeCorrectionFactors[key];
    if (existing) {
      // Moving average
      CUTTING_TOOL_CAD_LEARNING_ENGINE.lifeCorrectionFactors[key] =
        existing * 0.8 + correctionFactor * 0.2;
    } else {
      CUTTING_TOOL_CAD_LEARNING_ENGINE.lifeCorrectionFactors[key] = correctionFactor;
    }
  },
  /**
   * Update strategy scoring based on outcomes
   */
  _updateStrategyScoring(outcome) {
    const strategyId = outcome.context?.strategy;
    if (!strategyId) return;

    if (!PRISM_INTELLIGENT_STRATEGY_SELECTOR.outcomeScores) {
      PRISM_INTELLIGENT_STRATEGY_SELECTOR.outcomeScores = {};
    }
    const scores = PRISM_INTELLIGENT_STRATEGY_SELECTOR.outcomeScores[strategyId] || {
      successes: 0, failures: 0
    };
    if (outcome.error < 20) {
      scores.successes++;
    } else {
      scores.failures++;
    }
    PRISM_INTELLIGENT_STRATEGY_SELECTOR.outcomeScores[strategyId] = scores;
  },
  /**
   * Update tool life constants based on actual outcomes
   */
  _updateToolLifeConstants(outcome) {
    // Adjust Taylor constants based on actual tool life data
    const key = `${outcome.context?.toolMaterial}_${outcome.context?.workMaterial}`;

    if (PRISM_TOOL_LIFE_ESTIMATOR.taylorConstants?.[key]) {
      const actual = outcome.actual;
      const predicted = outcome.predicted;

      if (actual > 0 && predicted > 0) {
        // Adjust C constant
        const adjustmentFactor = Math.pow(actual / predicted, 0.25);
        PRISM_TOOL_LIFE_ESTIMATOR.taylorConstants[key].C *=
          (1 + (adjustmentFactor - 1) * 0.1);  // 10% adjustment
      }
    }
  },
  /**
   * Update cycle time factors
   */
  _updateCycleTimeFactors(outcome) {
    if (!PRISM_ACCURATE_CYCLE_TIME.correctionFactors) {
      PRISM_ACCURATE_CYCLE_TIME.correctionFactors = {};
    }
    const opType = outcome.context?.operationType || 'general';
    const existing = PRISM_ACCURATE_CYCLE_TIME.correctionFactors[opType] || 1.0;

    const actual = outcome.actual || 1;
    const predicted = outcome.predicted || 1;
    const correction = actual / predicted;

    // Exponential moving average
    PRISM_ACCURATE_CYCLE_TIME.correctionFactors[opType] =
      existing * 0.9 + correction * 0.1;
  },
  /**
   * Get prediction accuracy statistics
   */
  getAccuracyStats(type = null) {
    const stats = {};

    for (const [key, outcomes] of Object.entries(this.feedbackDatabase)) {
      if (type && !key.includes(type)) continue;
      if (outcomes.length === 0) continue;

      const errors = outcomes.map(o => o.error);
      const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
      const maxError = Math.max(...errors);
      const minError = Math.min(...errors);

      stats[key] = {
        samples: outcomes.length,
        avgError: avgError.toFixed(2) + '%',
        maxError: maxError.toFixed(2) + '%',
        minError: minError.toFixed(2) + '%',
        accuracy: (100 - avgError).toFixed(2) + '%'
      };
    }
    return stats;
  },
  /**
   * Persist to localStorage
   */
  _persist() {
    try {
      localStorage.setItem('PRISM_FEEDBACK_DATABASE', JSON.stringify(this.feedbackDatabase));
    } catch (e) {
      console.warn('[FEEDBACK] Could not persist feedback database');
    }
  },
  /**
   * Load from localStorage
   */
  _load() {
    try {
      const stored = localStorage.getItem('PRISM_FEEDBACK_DATABASE');
      if (stored) {
        this.feedbackDatabase = JSON.parse(stored);
        console.log('[FEEDBACK] Loaded feedback database with',
          Object.values(this.feedbackDatabase).flat().length, 'outcomes');
      }
    } catch (e) {
      console.warn('[FEEDBACK] Could not load feedback database');
    }
  },
  /**
   * Initialize
   */
  init() {
    this._load();
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[FEEDBACK] Learning Feedback Connector initialized');
    return this;
  }
};
