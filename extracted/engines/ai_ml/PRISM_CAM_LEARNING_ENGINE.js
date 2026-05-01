/**
 * PRISM_CAM_LEARNING_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * References: 78
 * Lines: 325
 * Session: R2.3.1 Engine Gap Extraction
 */

const PRISM_CAM_LEARNING_ENGINE = {
  version: '1.0.0',

  // Learned patterns storage
  learnedPatterns: {
    featureToOperation: {},      // feature type -> recommended operations
    operationToStrategy: {},     // operation type -> recommended strategies
    strategyParameters: {},      // strategy -> typical parameters
    industryDefaults: {},        // industry -> default toolpath settings
    materialAdjustments: {},     // material -> parameter adjustments
    complexityScaling: {}        // complexity -> time/operation multipliers
  },
  // INITIALIZATION

  init() {
    console.log('[CAM_LEARNING] Initializing CAM Learning Engine...');

    // Load from embedded database
    this.loadFromDatabase();

    // Integrate with existing CAM systems
    this.integrateWithCAMSystems();

    // Make globally available
    window.PRISM_CAM_LEARNING_ENGINE = this;
    window.getRecommendedToolpaths = this.getRecommendedToolpaths.bind(this);
    window.getStrategyForFeature = this.getStrategyForFeature.bind(this);

    console.log('[CAM_LEARNING] Ready with patterns from 800 example parts');

    return this;
  },
  // LEARNING FROM DATABASE

  loadFromDatabase() {
    if (typeof PRISM_MASTER_CAD_CAM_DATABASE === 'undefined') {
      console.warn('[CAM_LEARNING] Database not found, using built-in patterns');
      this.loadBuiltInPatterns();
      return;
    }
    const db = PRISM_MASTER_CAD_CAM_DATABASE;

    // Extract patterns from each industry
    for (const [indKey, indData] of Object.entries(db.industries || {})) {
      // Store industry patterns
      this.learnedPatterns.industryDefaults[indKey] = {
        name: indData.name,
        commonFeatures: indData.patterns?.commonFeatures || {},
        commonOperations: indData.patterns?.commonOperations || {},
        commonStrategies: indData.patterns?.commonStrategies || {}
      };
      // Merge feature-to-operation mappings
      const featOps = indData.patterns?.featureToOperation || {};
      for (const [feature, ops] of Object.entries(featOps)) {
        if (!this.learnedPatterns.featureToOperation[feature]) {
          this.learnedPatterns.featureToOperation[feature] = {};
        }
        for (const [op, count] of Object.entries(ops)) {
          this.learnedPatterns.featureToOperation[feature][op] =
            (this.learnedPatterns.featureToOperation[feature][op] || 0) + count;
        }
      }
      // Learn from detailed parts
      for (const [partId, part] of Object.entries(indData.detailedParts || {})) {
        this.learnFromPart(part, indKey);
      }
    }
    console.log('[CAM_LEARNING] Loaded patterns from database');
  },
  learnFromPart(part, industry) {
    if (!part.camToolpaths?.operations) return;

    const complexity = part.metadata?.complexity || 'medium';
    const material = part.metadata?.material || 'unknown';

    // Learn strategy parameters
    for (const op of part.camToolpaths.operations) {
      const strategy = op.strategy;
      if (!strategy) continue;

      if (!this.learnedPatterns.strategyParameters[strategy]) {
        this.learnedPatterns.strategyParameters[strategy] = {
          samples: 0,
          params: {}
        };
      }
      this.learnedPatterns.strategyParameters[strategy].samples++;

      // Average parameters
      for (const [param, value] of Object.entries(op.params || {})) {
        if (typeof value === 'number') {
          const existing = this.learnedPatterns.strategyParameters[strategy].params[param];
          if (existing) {
            this.learnedPatterns.strategyParameters[strategy].params[param] =
              (existing + value) / 2;
          } else {
            this.learnedPatterns.strategyParameters[strategy].params[param] = value;
          }
        }
      }
    }
    // Track complexity scaling
    if (!this.learnedPatterns.complexityScaling[complexity]) {
      this.learnedPatterns.complexityScaling[complexity] = {
        avgOperations: 0,
        avgTime: 0,
        samples: 0
      };
    }
    const cs = this.learnedPatterns.complexityScaling[complexity];
    cs.samples++;
    cs.avgOperations = (cs.avgOperations * (cs.samples - 1) + part.camToolpaths.operationCount) / cs.samples;
    cs.avgTime = (cs.avgTime * (cs.samples - 1) + (part.metadata?.estimatedTime || 60)) / cs.samples;
  },
  loadBuiltInPatterns() {
    // Fallback built-in patterns
    this.learnedPatterns.featureToOperation = {
      pocket: { roughing_2d: 50, finishing_2d: 50 },
      cavity: { roughing_3d: 60, finishing_3d: 60 },
      bore: { drilling: 40, boring: 40 },
      thread: { drilling: 30, threading: 50 },
      surface: { roughing_3d: 40, finishing_3d: 60 },
      hole_pattern: { drilling: 80 },
      chamfer: { finishing_2d: 60 },
      slot: { roughing_2d: 50, finishing_2d: 40 },
      keyway: { roughing_2d: 45, finishing_2d: 45 }
    };
    this.learnedPatterns.operationToStrategy = {
      roughing_3d: ['adaptive_clearing', '3d_pocket', 'rest_machining'],
      roughing_2d: ['adaptive_2d', 'pocket_clearing', 'trochoidal'],
      finishing_3d: ['parallel', 'scallop', 'pencil', 'steep_shallow'],
      finishing_2d: ['contour', 'profile'],
      drilling: ['spot_drill', 'drill', 'peck_drill'],
      boring: ['bore', 'interpolate_bore'],
      threading: ['tap_rigid', 'thread_mill']
    };
  },
  // RECOMMENDATION ENGINE

  /**
   * Get recommended toolpath sequence for a feature set
   */
  getRecommendedToolpaths(features, options = {}) {
    const { industry, material, complexity } = options;
    const recommendations = [];

    // Start with setup
    recommendations.push({
      step: 1,
      operation: 'setup',
      description: 'Workholding and datum',
      confidence: 1.0
    });

    // Face if milling
    if (options.machineType !== 'lathe') {
      recommendations.push({
        step: 2,
        operation: 'face',
        strategy: 'face_mill',
        description: 'Face stock to height',
        confidence: 0.95
      });
    }
    let step = 3;

    // Process each feature
    for (const feature of features) {
      const featureOps = this.learnedPatterns.featureToOperation[feature];
      if (!featureOps) continue;

      // Sort operations by learned frequency
      const sortedOps = Object.entries(featureOps)
        .sort((a, b) => b[1] - a[1]);

      for (const [opType, count] of sortedOps.slice(0, 2)) {
        const strategies = this.getStrategiesForOperation(opType);
        const params = this.getParametersForStrategy(strategies[0], material);

        recommendations.push({
          step: step++,
          operation: opType,
          feature: feature,
          strategy: strategies[0],
          alternativeStrategies: strategies.slice(1, 3),
          params: params,
          confidence: Math.min(0.95, count / 100),
          description: `${opType.replace(/_/g, ' ')} for ${feature}`
        });
      }
    }
    // Add deburr for complex parts
    if (complexity === 'high' || complexity === 'very_high' || complexity === 'extreme') {
      recommendations.push({
        step: step++,
        operation: 'deburr',
        strategy: 'chamfer_edges',
        description: 'Edge break and deburr',
        confidence: 0.85
      });
    }
    return recommendations;
  },
  /**
   * Get best strategy for a specific feature type
   */
  getStrategyForFeature(featureType, options = {}) {
    const ops = this.learnedPatterns.featureToOperation[featureType];
    if (!ops) {
      return { operation: 'roughing_3d', strategy: 'adaptive_clearing', confidence: 0.5 };
    }
    // Get most common operation
    const [bestOp] = Object.entries(ops).sort((a, b) => b[1] - a[1])[0];
    const strategies = this.getStrategiesForOperation(bestOp);

    return {
      operation: bestOp,
      strategy: strategies[0],
      alternatives: strategies.slice(1),
      confidence: Math.min(0.95, ops[bestOp] / 50)
    };
  },
  /**
   * Get strategies for an operation type
   */
  getStrategiesForOperation(opType) {
    const defaults = {
      roughing_3d: ['adaptive_clearing', '3d_pocket', 'rest_machining', 'plunge_rough'],
      roughing_2d: ['adaptive_2d', 'pocket_clearing', 'trochoidal', 'face_mill'],
      finishing_3d: ['parallel', 'scallop', 'pencil', 'steep_shallow', 'flow'],
      finishing_2d: ['contour', 'profile', 'chamfer'],
      drilling: ['spot_drill', 'drill', 'peck_drill'],
      boring: ['bore', 'interpolate_bore', 'back_bore'],
      threading: ['tap_rigid', 'thread_mill', 'single_point_thread'],
      turning_od: ['rough_turn', 'finish_turn', 'profile_turn'],
      turning_id: ['bore', 'internal_groove']
    };
    return this.learnedPatterns.operationToStrategy?.[opType] || defaults[opType] || ['default'];
  },
  /**
   * Get typical parameters for a strategy
   */
  getParametersForStrategy(strategy, material = 'aluminum_6061') {
    const learned = this.learnedPatterns.strategyParameters[strategy];

    // Material adjustments
    const materialFactors = {
      'aluminum': { speed: 1.0, feed: 1.0 },
      'steel': { speed: 0.5, feed: 0.7 },
      'stainless': { speed: 0.4, feed: 0.5 },
      'titanium': { speed: 0.3, feed: 0.4 },
      'inconel': { speed: 0.2, feed: 0.3 }
    };
    let factor = { speed: 1.0, feed: 1.0 };
    for (const [mat, f] of Object.entries(materialFactors)) {
      if (material?.toLowerCase().includes(mat)) {
        factor = f;
        break;
      }
    }
    // Default parameters
    const defaults = {
      stepover: 0.35,
      stepdown: 1.0,
      tolerance: 0.025,
      feedRate: 100,
      spindleSpeed: 8000
    };
    // Merge with learned
    const params = { ...defaults, ...(learned?.params || {}) };

    // Apply material factors
    params.feedRate *= factor.feed;
    params.spindleSpeed *= factor.speed;

    return params;
  },
  // INTEGRATION

  integrateWithCAMSystems() {
    // Integrate with CAM_TOOLPATH_DATABASE if available
    if (typeof CAM_TOOLPATH_DATABASE !== 'undefined') {
      CAM_TOOLPATH_DATABASE.learningEngine = this;
      console.log('[CAM_LEARNING] Integrated with CAM_TOOLPATH_DATABASE');
    }
    // Integrate with PRISM_UNIFIED_CAD_LEARNING_SYSTEM
    if (typeof PRISM_UNIFIED_CAD_LEARNING_SYSTEM !== 'undefined') {
      PRISM_UNIFIED_CAD_LEARNING_SYSTEM.camLearning = this;
      console.log('[CAM_LEARNING] Integrated with UNIFIED_CAD_LEARNING_SYSTEM');
    }
    // Integrate with EXAMPLE_PARTS_DATABASE
    if (typeof EXAMPLE_PARTS_DATABASE !== 'undefined') {
      // Add CAM recommendations to example parts
      this.enrichExampleParts();
    }
  },
  enrichExampleParts() {
    // Add CAM recommendations to existing example parts
    if (typeof EXAMPLE_PARTS_DATABASE === 'undefined') return;

    const parts = EXAMPLE_PARTS_DATABASE.getAllParts?.() || [];

    for (const part of parts) {
      if (part.features) {
        const featureTypes = part.features.map(f => f.type).filter(Boolean);
        part.recommendedToolpaths = this.getRecommendedToolpaths(featureTypes, {
          material: part.metadata?.material,
          complexity: part.metadata?.complexity
        });
      }
    }
    console.log('[CAM_LEARNING] Enriched', parts.length, 'example parts with CAM recommendations');
  },
  // STATISTICS

  getStats() {
    return {
      featurePatterns: Object.keys(this.learnedPatterns.featureToOperation).length,
      strategyPatterns: Object.keys(this.learnedPatterns.strategyParameters).length,
      industryProfiles: Object.keys(this.learnedPatterns.industryDefaults).length,
      totalSamples: Object.values(this.learnedPatterns.strategyParameters)
        .reduce((sum, s) => sum + (s.samples || 0), 0)
    };
  }
}