const PRISM_EXAMPLE_PARTS_INTEGRATION = {
  version: '1.0.0',

  /**
   * Initialize - extract geometry from example parts and feed to learning system
   */
  init() {
    console.log('[EXAMPLE_PARTS_INTEGRATION] Initializing...');

    // Wait for dependencies
    setTimeout(() => {
      this.integrateExampleParts();
      this.integrateAdvancedParts();
      this.injectIntoLearningSystem();
    }, 500);

    return this;
  },
  /**
   * Extract learned geometry patterns from EXAMPLE_PARTS_DATABASE
   */
  integrateExampleParts() {
    if (typeof EXAMPLE_PARTS_DATABASE === 'undefined') {
      console.warn('[EXAMPLE_PARTS_INTEGRATION] EXAMPLE_PARTS_DATABASE not found');
      return;
    }
    const parts = EXAMPLE_PARTS_DATABASE.getAllParts ?
                  EXAMPLE_PARTS_DATABASE.getAllParts() :
                  Object.keys(EXAMPLE_PARTS_DATABASE).filter(k =>
                    typeof EXAMPLE_PARTS_DATABASE[k] === 'object' &&
                    EXAMPLE_PARTS_DATABASE[k]?.metadata
                  ).map(k => EXAMPLE_PARTS_DATABASE[k]);

    console.log('[EXAMPLE_PARTS_INTEGRATION] Processing', parts.length, 'example parts');

    parts.forEach(part => {
      if (part?.metadata) {
        this.extractAndStore(part);
      }
    });
  },
  /**
   * Extract learned geometry from ADVANCED_EXAMPLE_PARTS
   */
  integrateAdvancedParts() {
    if (typeof ADVANCED_EXAMPLE_PARTS === 'undefined') {
      console.warn('[EXAMPLE_PARTS_INTEGRATION] ADVANCED_EXAMPLE_PARTS not found');
      return;
    }
    const parts = Object.keys(ADVANCED_EXAMPLE_PARTS).filter(k =>
      typeof ADVANCED_EXAMPLE_PARTS[k] === 'object' &&
      ADVANCED_EXAMPLE_PARTS[k]?.metadata
    ).map(k => ADVANCED_EXAMPLE_PARTS[k]);

    console.log('[EXAMPLE_PARTS_INTEGRATION] Processing', parts.length, 'advanced parts');

    parts.forEach(part => {
      if (part?.metadata) {
        this.extractAndStore(part);
      }
    });
  },
  /**
   * Extract geometry patterns from a part and store in learning system
   */
  extractAndStore(part) {
    const metadata = part.metadata;
    const stock = part.stock || {};
    const features = part.features || [];
    const geometry2D = part.geometry2D || {};

    // Calculate learned ratios and patterns
    const learnedData = {
      source: 'EXAMPLE_PARTS_DATABASE',
      partNumber: metadata.partNumber,
      confidence: 0.95,  // High confidence - curated examples

      // Stock dimensions
      stockDimensions: {
        length: stock.length || 0,
        width: stock.width || 0,
        height: stock.height || 0,
        type: stock.type || 'rectangular'
      },
      // Feature statistics
      featureStats: this.analyzeFeatures(features),

      // Geometry patterns
      geometryPatterns: this.analyzeGeometry(geometry2D, features),

      // Machine requirements
      machineType: metadata.machineType || 'vmc',
      complexity: metadata.complexity || 'medium',
      setupCount: metadata.setupCount || 1,

      // Material
      material: metadata.material || stock.material || 'aluminum'
    };
    // Store in collection
    if (!this.learnedFromExamples) {
      this.learnedFromExamples = {};
    }
    const key = metadata.name?.toLowerCase().replace(/[^a-z0-9]/g, '_') || metadata.partNumber;
    this.learnedFromExamples[key] = learnedData;

    console.log('[EXAMPLE_PARTS_INTEGRATION] Learned from:', metadata.name);
  },
  /**
   * Analyze feature patterns
   */
  analyzeFeatures(features) {
    const stats = {
      totalCount: features.length,
      byType: {},
      toleranceRanges: { tight: 0, standard: 0, loose: 0 },
      commonDimensions: []
    };
    features.forEach(f => {
      // Count by type
      const type = f.type || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Analyze tolerances
      if (f.tolerance) {
        const tol = f.tolerance.dimension || f.tolerance.diameter || 0.01;
        if (tol <= 0.001) stats.toleranceRanges.tight++;
        else if (tol <= 0.005) stats.toleranceRanges.standard++;
        else stats.toleranceRanges.loose++;
      }
      // Collect common dimensions
      if (f.dimensions) {
        Object.entries(f.dimensions).forEach(([dim, val]) => {
          if (typeof val === 'number' && val > 0) {
            stats.commonDimensions.push({ dimension: dim, value: val, feature: type });
          }
        });
      }
    });

    return stats;
  },
  /**
   * Analyze 2D/3D geometry patterns
   */
  analyzeGeometry(geometry2D, features) {
    const patterns = {
      hasOutline: !!geometry2D.outline,
      hasPockets: features.some(f => f.type?.includes('pocket')),
      hasHoles: features.some(f => f.type?.includes('hole') || f.type?.includes('bore')),
      hasChamfers: features.some(f => f.type?.includes('chamfer')),
      hasFillets: features.some(f => f.type?.includes('fillet') || f.type?.includes('radius')),
      hasThreads: features.some(f => f.type?.includes('thread') || f.type?.includes('tap')),
      hasPatterns: features.some(f => f.pattern),

      // Pocket depth ratios
      pocketDepthRatios: [],

      // Hole patterns
      holePatterns: [],

      // Corner radii
      cornerRadii: []
    };
    // Extract pocket depth ratios
    features.filter(f => f.type?.includes('pocket')).forEach(f => {
      if (f.dimensions?.depth && f.dimensions?.length) {
        patterns.pocketDepthRatios.push(f.dimensions.depth / f.dimensions.length);
      }
    });

    // Extract corner radii
    if (geometry2D.outline?.cornerRadius) {
      patterns.cornerRadii.push(geometry2D.outline.cornerRadius);
    }
    features.filter(f => f.dimensions?.cornerRadius).forEach(f => {
      patterns.cornerRadii.push(f.dimensions.cornerRadius);
    });

    // Hole pattern analysis
    features.filter(f => f.pattern).forEach(f => {
      patterns.holePatterns.push({
        type: f.pattern.type,
        count: f.pattern.positions?.length || f.pattern.count || 0
      });
    });

    return patterns;
  },
  /**
   * Inject learned data into PRISM_UNIFIED_CAD_LEARNING_SYSTEM
   */
  injectIntoLearningSystem() {
    if (typeof PRISM_UNIFIED_CAD_LEARNING_SYSTEM === 'undefined') {
      console.warn('[EXAMPLE_PARTS_INTEGRATION] Unified learning system not found');
      return;
    }
    if (!this.learnedFromExamples) {
      console.warn('[EXAMPLE_PARTS_INTEGRATION] No examples processed');
      return;
    }
    // Add to unified system's parts database
    Object.entries(this.learnedFromExamples).forEach(([key, data]) => {
      PRISM_UNIFIED_CAD_LEARNING_SYSTEM.addLearnedData('parts', key, 'from_example', data);
    });

    // Also add to CAD_LIBRARY if available
    if (typeof CAD_LIBRARY !== 'undefined') {
      CAD_LIBRARY.learnedFromExamples = this.learnedFromExamples;
      console.log('[EXAMPLE_PARTS_INTEGRATION] Injected into CAD_LIBRARY');
    }
    // Add reference patterns for the CAD generator
    this.createGeneratorPatterns();

    console.log('[EXAMPLE_PARTS_INTEGRATION] Injected',
                Object.keys(this.learnedFromExamples).length,
                'parts into learning system');
  },
  /**
   * Create aggregated patterns for the CAD generator
   */
  createGeneratorPatterns() {
    // Aggregate patterns from all example parts
    const aggregated = {
      // Feature frequency by machine type
      featuresByMachine: {},

      // Common dimension ratios
      dimensionRatios: {
        pocketDepthToWidth: [],
        holeSpacingToSize: [],
        chamferToEdge: [],
        filletToWall: []
      },
      // Tolerance distributions by complexity
      tolerancesByComplexity: {},

      // Setup count by part type
      setupsByType: {}
    };
    Object.values(this.learnedFromExamples).forEach(part => {
      // Aggregate by machine type
      const machine = part.machineType || 'vmc';
      if (!aggregated.featuresByMachine[machine]) {
        aggregated.featuresByMachine[machine] = {};
      }
      Object.entries(part.featureStats?.byType || {}).forEach(([feat, count]) => {
        aggregated.featuresByMachine[machine][feat] =
          (aggregated.featuresByMachine[machine][feat] || 0) + count;
      });

      // Aggregate pocket depth ratios
      if (part.geometryPatterns?.pocketDepthRatios) {
        aggregated.dimensionRatios.pocketDepthToWidth.push(
          ...part.geometryPatterns.pocketDepthRatios
        );
      }
      // Aggregate tolerance distributions
      const complexity = part.complexity || 'medium';
      if (!aggregated.tolerancesByComplexity[complexity]) {
        aggregated.tolerancesByComplexity[complexity] = { tight: 0, standard: 0, loose: 0 };
      }
      if (part.featureStats?.toleranceRanges) {
        aggregated.tolerancesByComplexity[complexity].tight += part.featureStats.toleranceRanges.tight;
        aggregated.tolerancesByComplexity[complexity].standard += part.featureStats.toleranceRanges.standard;
        aggregated.tolerancesByComplexity[complexity].loose += part.featureStats.toleranceRanges.loose;
      }
    });

    // Store aggregated patterns
    this.aggregatedPatterns = aggregated;

    // Make available globally
    window.CAD_LEARNED_PATTERNS = aggregated;

    // Inject into CAD_LIBRARY
    if (typeof CAD_LIBRARY !== 'undefined') {
      CAD_LIBRARY.learnedPatterns = aggregated;
    }
  },
  /**
   * Get learned patterns for a specific machine type
   */
  getPatternsForMachine(machineType) {
    return this.aggregatedPatterns?.featuresByMachine?.[machineType] || {};
  },
  /**
   * Get average dimension ratios
   */
  getAverageRatios() {
    const ratios = this.aggregatedPatterns?.dimensionRatios || {};
    const averages = {};

    Object.entries(ratios).forEach(([key, values]) => {
      if (values.length > 0) {
        averages[key] = values.reduce((a, b) => a + b, 0) / values.length;
      }
    });

    return averages;
  },
  /**
   * Get recommended tolerances for complexity level
   */
  getTolerancesForComplexity(complexity) {
    return this.aggregatedPatterns?.tolerancesByComplexity?.[complexity] || null;
  }
}