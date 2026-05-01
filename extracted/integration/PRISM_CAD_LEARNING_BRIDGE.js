// PRISM_CAD_LEARNING_BRIDGE - Lines 508163-508466 (304 lines) - CAD learning bridge\n\nconst PRISM_CAD_LEARNING_BRIDGE = {
  version: '1.0.0',

  // Learning statistics
    learningStats: {
    machinesLearned: 87,
    partsLearned: 21,
    featuresExtracted: 342,
    kinematicsLearned: 60,
    lastLearned: '2026-01-07T15:00:00Z'
  },
  // Feature extraction results
  extractedFeatures: [],
  kinematicPatterns: [],
  dimensionPatterns: [],

  /**
   * Initialize learning bridge
   */
  init() {
    console.log('[CAD_LEARNING] Initializing CAD Learning Bridge...');

    // Load previous learning stats
    this.loadStats();

    // Connect to learning engines
    this.connectToEngines();

    return this;
  },
  /**
   * Connect to existing learning engines
   */
  connectToEngines() {
    // Connect to CAM Learning Engine
    if (typeof PRISM_CAM_LEARNING_ENGINE !== 'undefined') {
      console.log('[CAD_LEARNING] Connected to CAM Learning Engine');
    }
    // Connect to Machine 3D Learning Engine
    if (typeof PRISM_MACHINE_3D_LEARNING_ENGINE !== 'undefined') {
      console.log('[CAD_LEARNING] Connected to Machine 3D Learning Engine');
    }
    // Connect to unified CAD learning system
    if (typeof PRISM_UNIFIED_CAD_LEARNING_SYSTEM !== 'undefined') {
      console.log('[CAD_LEARNING] Connected to Unified CAD Learning System');
    }
  },
  /**
   * Learn from imported CAD file
   */
  async learnFromImport(importResult) {
    console.log(`[CAD_LEARNING] Learning from import: ${importResult.id}`);

    // Retrieve full stored data
    let fullData = null;
    if (typeof PRISM_CAD_FILE_STORAGE !== 'undefined') {
      fullData = await PRISM_CAD_FILE_STORAGE.getMachineCAD(importResult.id);
    }
    if (!fullData) {
      console.warn('[CAD_LEARNING] No stored data found for learning');
      return;
    }
    // Extract features for learning
    const features = this.extractMachineFeatures(fullData);
    this.extractedFeatures.push(...features);
    this.learningStats.featuresExtracted += features.length;

    // Learn kinematics
    if (fullData.kinematics || fullData.componentTree) {
      const kinPatterns = this.extractKinematicPatterns(fullData);
      this.kinematicPatterns.push(...kinPatterns);
      this.learningStats.kinematicsLearned += kinPatterns.length;
    }
    // Learn dimension patterns
    if (fullData.parsedGeometry?.boundingBox) {
      this.learnDimensionPatterns(fullData);
    }
    // Feed to existing learning engines
    this.feedToExistingEngines(fullData, features);

    // Update stats
    this.learningStats.machinesLearned++;
    this.learningStats.lastLearned = new Date().toISOString();
    this.saveStats();

    console.log(`[CAD_LEARNING] Learned ${features.length} features from ${importResult.id}`);

    return {
      featuresLearned: features.length,
      kinematicsLearned: this.kinematicPatterns.length,
      totalStats: this.learningStats
    };
  },
  /**
   * Extract machine features for learning
   */
  extractMachineFeatures(machineData) {
    const features = [];

    // Component-based features
    const components = machineData.parsedGeometry?.components || machineData.componentTree || [];
    for (const comp of components) {
      const compName = typeof comp === 'string' ? comp : comp.name;

      features.push({
        type: 'component',
        name: compName,
        machineType: machineData.type,
        manufacturer: machineData.manufacturer,
        category: this.categorizeComponent(compName),
        isMovingAxis: this.isAxisComponent(compName)
      });
    }
    // Geometry-based features
    if (machineData.entityCounts) {
      features.push({
        type: 'geometry_complexity',
        totalFaces: machineData.entityCounts.ADVANCED_FACE || 0,
        shells: machineData.entityCounts.CLOSED_SHELL || 0,
        surfaces: {
          planar: machineData.entityCounts.PLANE || 0,
          cylindrical: machineData.entityCounts.CYLINDRICAL_SURFACE || 0,
          conical: machineData.entityCounts.CONICAL_SURFACE || 0,
          spherical: machineData.entityCounts.SPHERICAL_SURFACE || 0,
          toroidal: machineData.entityCounts.TOROIDAL_SURFACE || 0,
          bspline: machineData.entityCounts.B_SPLINE_SURFACE || 0
        },
        machineType: machineData.type,
        manufacturer: machineData.manufacturer
      });
    }
    return features;
  },
  /**
   * Categorize component by name
   */
  categorizeComponent(name) {
    const lower = name.toLowerCase();

    if (lower.includes('base') || lower.includes('static') || lower.includes('bed')) return 'base_structure';
    if (lower.includes('column')) return 'column';
    if (lower.includes('spindle')) return 'spindle';
    if (lower.includes('x_axis') || lower.includes('x-axis')) return 'x_axis';
    if (lower.includes('y_axis') || lower.includes('y-axis')) return 'y_axis';
    if (lower.includes('z_axis') || lower.includes('z-axis')) return 'z_axis';
    if (lower.includes('a_axis') || lower.includes('a-axis') || lower.includes('trunnion')) return 'a_axis';
    if (lower.includes('c_axis') || lower.includes('c-axis') || lower.includes('rotary')) return 'c_axis';
    if (lower.includes('b_axis') || lower.includes('b-axis')) return 'b_axis';
    if (lower.includes('table')) return 'table';
    if (lower.includes('turret')) return 'turret';
    if (lower.includes('chuck')) return 'chuck';
    if (lower.includes('tailstock')) return 'tailstock';
    if (lower.includes('coolant')) return 'coolant_system';
    if (lower.includes('chip')) return 'chip_conveyor';
    if (lower.includes('cover') || lower.includes('enclosure')) return 'enclosure';
    if (lower.includes('tool') || lower.includes('atc') || lower.includes('magazine')) return 'tool_changer';

    return 'other';
  },
  /**
   * Check if component is a moving axis
   */
  isAxisComponent(name) {
    const lower = name.toLowerCase();
    return lower.includes('axis') ||
           lower.includes('table') && !lower.includes('static') ||
           lower.includes('head') && lower.includes('spindle');
  },
  /**
   * Extract kinematic patterns
   */
  extractKinematicPatterns(machineData) {
    const patterns = [];

    const components = machineData.parsedGeometry?.components || [];
    const hasAAxis = components.some(c => (typeof c === 'string' ? c : c.name).toLowerCase().includes('a_axis'));
    const hasCAxis = components.some(c => (typeof c === 'string' ? c : c.name).toLowerCase().includes('c_axis'));
    const hasBAxis = components.some(c => (typeof c === 'string' ? c : c.name).toLowerCase().includes('b_axis'));

    if (hasAAxis && hasCAxis) {
      patterns.push({
        type: 'trunnion_ac',
        machineType: machineData.type,
        manufacturer: machineData.manufacturer,
        configuration: 'A/C table'
      });
    }
    if (hasBAxis && hasCAxis) {
      patterns.push({
        type: 'trunnion_bc',
        machineType: machineData.type,
        manufacturer: machineData.manufacturer,
        configuration: 'B/C head'
      });
    }
    return patterns;
  },
  /**
   * Learn dimension patterns
   */
  learnDimensionPatterns(machineData) {
    const bb = machineData.parsedGeometry?.boundingBox || machineData.meshData?.boundingBox;
    if (!bb) return;

    const size = {
      x: (bb.max?.x || 0) - (bb.min?.x || 0),
      y: (bb.max?.y || 0) - (bb.min?.y || 0),
      z: (bb.max?.z || 0) - (bb.min?.z || 0)
    };
    this.dimensionPatterns.push({
      type: machineData.type,
      manufacturer: machineData.manufacturer,
      dimensions: size,
      aspectRatios: {
        xy: size.y > 0 ? size.x / size.y : 1,
        xz: size.z > 0 ? size.x / size.z : 1,
        yz: size.z > 0 ? size.y / size.z : 1
      }
    });
  },
  /**
   * Feed to existing learning engines
   */
  feedToExistingEngines(machineData, features) {
    // Feed to Machine 3D Learning Engine
    if (typeof PRISM_MACHINE_3D_LEARNING_ENGINE !== 'undefined') {
      PRISM_MACHINE_3D_LEARNING_ENGINE.learnFromCAD({
        id: machineData.id,
        type: machineData.type,
        manufacturer: machineData.manufacturer,
        components: machineData.parsedGeometry?.components || [],
        entityCounts: machineData.entityCounts,
        features: features
      });
    }
    // Feed to CAM Learning Engine
    if (typeof PRISM_CAM_LEARNING_ENGINE !== 'undefined') {
      PRISM_CAM_LEARNING_ENGINE.learnMachineCapabilities({
        machineId: machineData.id,
        type: machineData.type,
        axes: this.detectAxes(machineData),
        workEnvelope: machineData.kinematics?.workEnvelope || null
      });
    }
    // Feed to Unified CAD Learning System
    if (typeof PRISM_UNIFIED_CAD_LEARNING_SYSTEM !== 'undefined') {
      PRISM_UNIFIED_CAD_LEARNING_SYSTEM.recordModel({
        source: 'step_import',
        id: machineData.id,
        entityCounts: machineData.entityCounts,
        features: features.length
      });
    }
  },
  /**
   * Detect axes from machine data
   */
  detectAxes(machineData) {
    const components = machineData.parsedGeometry?.components || [];
    const axes = { linear: ['X', 'Y', 'Z'], rotary: [] };

    for (const comp of components) {
      const name = (typeof comp === 'string' ? comp : comp.name).toLowerCase();
      if (name.includes('a_axis') || name.includes('a-axis')) axes.rotary.push('A');
      if (name.includes('b_axis') || name.includes('b-axis')) axes.rotary.push('B');
      if (name.includes('c_axis') || name.includes('c-axis')) axes.rotary.push('C');
    }
    return axes;
  },
  /**
   * Get learning statistics
   */
  getStats() {
    return {
      ...this.learningStats,
      extractedFeatureCount: this.extractedFeatures.length,
      kinematicPatternCount: this.kinematicPatterns.length,
      dimensionPatternCount: this.dimensionPatterns.length
    };
  },
  /**
   * Save stats to localStorage
   */
  saveStats() {
    try {
      localStorage.setItem('PRISM_CAD_LEARNING_STATS', JSON.stringify(this.learningStats));
    } catch (e) {
      console.warn('[CAD_LEARNING] Failed to save stats');
    }
  },
  /**
   * Load stats from localStorage
   */
  loadStats() {
    try {
      const saved = localStorage.getItem('PRISM_CAD_LEARNING_STATS');
      if (saved) {
        this.learningStats = { ...this.learningStats, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('[CAD_LEARNING] Failed to load stats');
    }
  }
};
