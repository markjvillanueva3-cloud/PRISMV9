// PRISM_LEARNING_INTEGRATION_BRIDGE - Lines 318439-318693 (255 lines) - Learning integration bridge\n\nconst PRISM_LEARNING_INTEGRATION_BRIDGE = {
  version: '1.0.0',
  hooked: false,

  init() {
    console.log('[LEARNING_BRIDGE] Initializing integration hooks...');

    // Wait for all systems to load
    setTimeout(() => {
      this.hookGenerateToolpath();
      this.hookSelectStrategy();
      this.hookStrategyDatabase();
      this.hookFeatureRecognition();
      this.hookWorkflowPipeline();

      this.hooked = true;
      console.log('[LEARNING_BRIDGE] All hooks installed - learning engines active');
    }, 2000);

    return this;
  },
  // HOOK 1: Intercept generateToolpath to inject learned recommendations

  hookGenerateToolpath() {
    // Hook UNIFIED_CAD_CAM_SYSTEM.generateToolpath
    if (typeof UNIFIED_CAD_CAM_SYSTEM !== 'undefined' && UNIFIED_CAD_CAM_SYSTEM.generateToolpath) {
      const original = UNIFIED_CAD_CAM_SYSTEM.generateToolpath.bind(UNIFIED_CAD_CAM_SYSTEM);

      UNIFIED_CAD_CAM_SYSTEM.generateToolpath = (features, config = {}) => {
        // Enhance config with learned recommendations
        if (typeof PRISM_CAM_LEARNING_ENGINE !== 'undefined') {
          const featureTypes = features.map(f => f.type || f.featureType).filter(Boolean);
          const learned = PRISM_CAM_LEARNING_ENGINE.getRecommendedToolpaths(featureTypes, {
            material: config.material,
            complexity: config.complexity,
            industry: config.industry
          });

          // Merge learned recommendations into config
          config.learnedRecommendations = learned;
          config.suggestedStrategies = learned.map(r => r.strategy).filter(Boolean);

          console.log('[LEARNING_BRIDGE] Injected', learned.length, 'learned recommendations');
        }
        return original(features, config);
      };
      console.log('[LEARNING_BRIDGE] ✓ Hooked UNIFIED_CAD_CAM_SYSTEM.generateToolpath');
    }
    // Hook PRISM_REAL_TOOLPATH_ENGINE.generate
    if (typeof PRISM_REAL_TOOLPATH_ENGINE !== 'undefined' && PRISM_REAL_TOOLPATH_ENGINE.generate) {
      const original = PRISM_REAL_TOOLPATH_ENGINE.generate.bind(PRISM_REAL_TOOLPATH_ENGINE);

      PRISM_REAL_TOOLPATH_ENGINE.generate = (op, params) => {
        // Get learned parameters for this operation type
        if (typeof PRISM_CAM_LEARNING_ENGINE !== 'undefined' && op?.type) {
          const learnedParams = PRISM_CAM_LEARNING_ENGINE.getParametersForStrategy(
            op.strategy || op.type,
            params?.material
          );

          // Use learned params as defaults, allow override
          params = { ...learnedParams, ...params };
        }
        return original(op, params);
      };
      console.log('[LEARNING_BRIDGE] ✓ Hooked PRISM_REAL_TOOLPATH_ENGINE.generate');
    }
  },
  // HOOK 2: Enhance selectStrategy with learned patterns

  hookSelectStrategy() {
    // Hook FIVE_AXIS_FEATURE_ENGINE.selectStrategy
    if (typeof FIVE_AXIS_FEATURE_ENGINE !== 'undefined' && FIVE_AXIS_FEATURE_ENGINE.selectStrategy) {
      const original = FIVE_AXIS_FEATURE_ENGINE.selectStrategy.bind(FIVE_AXIS_FEATURE_ENGINE);

      FIVE_AXIS_FEATURE_ENGINE.selectStrategy = (feature, machineCapability) => {
        let result = original(feature, machineCapability);

        // Enhance with learned patterns
        if (typeof PRISM_CAM_LEARNING_ENGINE !== 'undefined') {
          const learned = PRISM_CAM_LEARNING_ENGINE.getStrategyForFeature(
            feature.type || feature.featureType,
            { machineType: machineCapability }
          );

          if (learned.confidence > 0.7) {
            // High confidence - use learned strategy
            result = {
              ...result,
              learnedStrategy: learned.strategy,
              learnedConfidence: learned.confidence,
              alternatives: learned.alternatives || []
            };
          }
        }
        return result;
      };
      console.log('[LEARNING_BRIDGE] ✓ Hooked FIVE_AXIS_FEATURE_ENGINE.selectStrategy');
    }
    // Hook getStrategyModifiers
    if (typeof window !== 'undefined' && typeof window.getStrategyModifiers === 'function') {
      const original = window.getStrategyModifiers;

      window.getStrategyModifiers = (isLathe = false) => {
        let modifiers = original(isLathe);

        // Add learned modifiers
        if (typeof PRISM_CAM_LEARNING_ENGINE !== 'undefined') {
          const industry = window.currentIndustry || 'general';
          const defaults = PRISM_CAM_LEARNING_ENGINE.learnedPatterns?.industryDefaults?.[industry];

          if (defaults?.commonStrategies) {
            modifiers.learnedPreferences = defaults.commonStrategies;
          }
        }
        return modifiers;
      };
      console.log('[LEARNING_BRIDGE] ✓ Hooked getStrategyModifiers');
    }
  },
  // HOOK 3: Enhance strategy databases with learned data

  hookStrategyDatabase() {
    // Enhance COMPREHENSIVE_STRATEGY_DATABASE
    if (typeof COMPREHENSIVE_STRATEGY_DATABASE !== 'undefined') {
      // Add learned recommendations method
      COMPREHENSIVE_STRATEGY_DATABASE.getLearnedRecommendation = (featureType, material) => {
        if (typeof PRISM_CAM_LEARNING_ENGINE === 'undefined') return null;

        return PRISM_CAM_LEARNING_ENGINE.getStrategyForFeature(featureType, { material });
      };
      console.log('[LEARNING_BRIDGE] ✓ Enhanced COMPREHENSIVE_STRATEGY_DATABASE');
    }
    // Enhance CUTTING_STRATEGY_DATABASE
    if (typeof CUTTING_STRATEGY_DATABASE !== 'undefined') {
      CUTTING_STRATEGY_DATABASE.getLearnedParameters = (strategy, material) => {
        if (typeof PRISM_CAM_LEARNING_ENGINE === 'undefined') return {};

        return PRISM_CAM_LEARNING_ENGINE.getParametersForStrategy(strategy, material);
      };
      console.log('[LEARNING_BRIDGE] ✓ Enhanced CUTTING_STRATEGY_DATABASE');
    }
    // Enhance CAM_TOOLPATH_DATABASE
    if (typeof CAM_TOOLPATH_DATABASE !== 'undefined') {
      CAM_TOOLPATH_DATABASE.getSmartRecommendation = (features, options = {}) => {
        if (typeof PRISM_CAM_LEARNING_ENGINE === 'undefined') return null;

        const featureTypes = features.map(f => typeof f === 'string' ? f : f.type).filter(Boolean);
        return PRISM_CAM_LEARNING_ENGINE.getRecommendedToolpaths(featureTypes, options);
      };
      console.log('[LEARNING_BRIDGE] ✓ Enhanced CAM_TOOLPATH_DATABASE');
    }
  },
  // HOOK 4: Connect CAD feature recognition to learning

  hookFeatureRecognition() {
    // Hook CAD_LIBRARY.featureRecognition
    if (typeof CAD_LIBRARY !== 'undefined' && CAD_LIBRARY.featureRecognition) {
      const original = CAD_LIBRARY.featureRecognition.getOperations;

      if (typeof original === 'function') {
        CAD_LIBRARY.featureRecognition.getOperations = (featureName) => {
          let ops = original(featureName);

          // Enhance with learned CAM operations
          if (typeof PRISM_CAM_LEARNING_ENGINE !== 'undefined') {
            const learned = PRISM_CAM_LEARNING_ENGINE.getStrategyForFeature(featureName);

            ops = {
              ...ops,
              learnedOperation: learned.operation,
              learnedStrategy: learned.strategy,
              confidence: learned.confidence
            };
          }
          return ops;
        };
        console.log('[LEARNING_BRIDGE] ✓ Hooked CAD_LIBRARY.featureRecognition');
      }
    }
    // Hook PRISM_UNIFIED_CAD_LEARNING_SYSTEM
    if (typeof PRISM_UNIFIED_CAD_LEARNING_SYSTEM !== 'undefined') {
      // Add method to get both CAD and CAM recommendations
      PRISM_UNIFIED_CAD_LEARNING_SYSTEM.getFullRecommendation = (featureType, options = {}) => {
        const cadData = PRISM_UNIFIED_CAD_LEARNING_SYSTEM.getLearnedData?.('parts', featureType, 'from_example');

        let camData = null;
        if (typeof PRISM_CAM_LEARNING_ENGINE !== 'undefined') {
          camData = PRISM_CAM_LEARNING_ENGINE.getStrategyForFeature(featureType, options);
        }
        return {
          cad: cadData,
          cam: camData,
          combined: true
        };
      };
      console.log('[LEARNING_BRIDGE] ✓ Enhanced PRISM_UNIFIED_CAD_LEARNING_SYSTEM');
    }
  },
  // HOOK 5: Connect to workflow pipeline

  hookWorkflowPipeline() {
    // Hook SMART_AUTO_PROGRAM_GENERATOR
    if (typeof SMART_AUTO_PROGRAM_GENERATOR !== 'undefined') {
      const originalGenerate = SMART_AUTO_PROGRAM_GENERATOR._generateToolpaths;

      if (typeof originalGenerate === 'function') {
        SMART_AUTO_PROGRAM_GENERATOR._generateToolpaths = (features, options) => {
          // Pre-process with learning engine
          if (typeof PRISM_CAM_LEARNING_ENGINE !== 'undefined') {
            const featureTypes = features.map(f => f.type || f.featureType).filter(Boolean);
            options = options || {};
            options.learnedSequence = PRISM_CAM_LEARNING_ENGINE.getRecommendedToolpaths(featureTypes, options);
          }
          return originalGenerate(features, options);
        };
        console.log('[LEARNING_BRIDGE] ✓ Hooked SMART_AUTO_PROGRAM_GENERATOR');
      }
    }
    // Hook PRISM_INTELLIGENT_MACHINING_MODE
    if (typeof PRISM_INTELLIGENT_MACHINING_MODE !== 'undefined') {
      const originalGenerate = PRISM_INTELLIGENT_MACHINING_MODE._generateToolpaths;

      if (typeof originalGenerate === 'function') {
        PRISM_INTELLIGENT_MACHINING_MODE._generateToolpaths = (features, strategy, stock) => {
          // Validate strategy against learned patterns
          if (typeof PRISM_CAM_LEARNING_ENGINE !== 'undefined' && features?.[0]) {
            const learned = PRISM_CAM_LEARNING_ENGINE.getStrategyForFeature(
              features[0].type || features[0].featureType
            );

            if (learned.confidence > 0.8 && learned.strategy !== strategy) {
              console.log('[LEARNING_BRIDGE] Suggesting alternative strategy:', learned.strategy,
                          'instead of', strategy, '(confidence:', learned.confidence, ')');
            }
          }
          return originalGenerate(features, strategy, stock);
        };
        console.log('[LEARNING_BRIDGE] ✓ Hooked PRISM_INTELLIGENT_MACHINING_MODE');
      }
    }
  },
  // STATUS & DEBUGGING

  getStatus() {
    return {
      hooked: this.hooked,
      camLearningActive: typeof PRISM_CAM_LEARNING_ENGINE !== 'undefined',
      cadLearningActive: typeof PRISM_UNIFIED_CAD_LEARNING_SYSTEM !== 'undefined',
      databaseLoaded: typeof PRISM_MASTER_CAD_CAM_DATABASE !== 'undefined',
      stats: typeof PRISM_CAM_LEARNING_ENGINE !== 'undefined' ?
             PRISM_CAM_LEARNING_ENGINE.getStats() : null
    };
  }
};
