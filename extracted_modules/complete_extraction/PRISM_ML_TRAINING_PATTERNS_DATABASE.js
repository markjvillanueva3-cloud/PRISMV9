const PRISM_ML_TRAINING_PATTERNS_DATABASE = {
  version: '1.0.0',
  name: 'PRISM Machine Learning Training Patterns',

  // FEATURE VECTORS FOR ML MODELS
  featureDefinitions: {
    geometry: {
      surfaceArea: { type: 'continuous', unit: 'mm²', normalize: [0, 1000000] },
      volume: { type: 'continuous', unit: 'mm³', normalize: [0, 10000000] },
      boundingBoxRatio: { type: 'continuous', description: 'Length/Width/Height ratios' },
      featureCount: { type: 'integer', description: 'Number of recognized features' },
      pocketCount: { type: 'integer' },
      holeCount: { type: 'integer' },
      slotCount: { type: 'integer' },
      surfaceComplexity: { type: 'continuous', range: [0, 1] },
      undercuts: { type: 'boolean' },
      thinWalls: { type: 'boolean', threshold: '< 2mm' },
      deepPockets: { type: 'boolean', threshold: 'depth > 3x width' }
    },
    material: {
      type: { type: 'categorical', values: ['steel', 'aluminum', 'titanium', 'superalloy', 'copper', 'plastic'] },
      hardness: { type: 'continuous', unit: 'HRC', range: [0, 70] },
      machinability: { type: 'continuous', range: [0, 100] },
      thermalConductivity: { type: 'continuous' },
      abrasiveness: { type: 'categorical', values: ['low', 'medium', 'high'] }
    },
    tolerance: {
      surfaceFinish: { type: 'continuous', unit: 'Ra μm', range: [0.1, 25] },
      dimensionalTolerance: { type: 'continuous', unit: 'mm', range: [0.001, 1] },
      geometricTolerance: { type: 'continuous' },
      criticalFeatures: { type: 'integer' }
    },
    machine: {
      type: { type: 'categorical', values: ['3-axis', '4-axis', '5-axis', 'mill-turn'] },
      spindlePower: { type: 'continuous', unit: 'kW' },
      maxRPM: { type: 'continuous' },
      workEnvelope: { type: 'vector', dimensions: 3 },
      rigidity: { type: 'categorical', values: ['light', 'medium', 'heavy'] }
    }
  },
  // TRAINING PATTERNS - ROUGHING
  roughingPatterns: [
    {
      id: 'ROUGH_001',
      name: 'Deep Pocket Roughing - Steel',
      input: {
        geometry: { pocketDepth: 50, pocketWidth: 30, cornerRadius: 5 },
        material: { type: 'steel', hardness: 28, machinability: 70 },
        tolerance: { surfaceFinish: 3.2, dimensional: 0.1 }
      },
      recommendedStrategy: 'optimized_roughing',
      recommendedParams: {
        stepover: '40%',
        stepdown: '1.5 × diameter',
        feedMultiplier: 1.0,
        entryMethod: 'helix',
        toolDiaRatio: 0.6 // Tool diameter vs pocket width
      },
      outcomes: {
        cycleTime: 'baseline',
        toolLife: 'excellent',
        quality: 'good'
      }
    },
    {
      id: 'ROUGH_002',
      name: 'Adaptive Roughing - Aluminum',
      input: {
        geometry: { stockVolume: 500000, pocketCount: 3 },
        material: { type: 'aluminum', hardness: 0, machinability: 100 },
        tolerance: { surfaceFinish: 6.3 }
      },
      recommendedStrategy: 'adaptive_clearing',
      recommendedParams: {
        stepover: '10%',
        stepdown: '2.0 × diameter',
        feedMultiplier: 2.0,
        chipLoad: 0.15,
        entryMethod: 'ramp'
      },
      outcomes: {
        cycleTime: 'reduced_40%',
        toolLife: 'excellent',
        quality: 'good'
      }
    },
    {
      id: 'ROUGH_003',
      name: 'Heavy Roughing - Cast Iron',
      input: {
        geometry: { stockRemoval: 'heavy', surfaceArea: 50000 },
        material: { type: 'cast_iron', hardness: 35, machinability: 50 },
        tolerance: { surfaceFinish: 6.3 }
      },
      recommendedStrategy: 'z_level_roughing',
      recommendedParams: {
        stepover: '65%',
        stepdown: '0.8 × diameter',
        feedMultiplier: 0.8,
        coolant: 'flood',
        tool: 'indexable_insert'
      },
      outcomes: {
        cycleTime: 'moderate',
        toolLife: 'good',
        quality: 'acceptable'
      }
    },
    {
      id: 'ROUGH_004',
      name: 'Superalloy Roughing',
      input: {
        geometry: { complexity: 'medium' },
        material: { type: 'inconel', hardness: 45, machinability: 15 },
        tolerance: { surfaceFinish: 3.2 }
      },
      recommendedStrategy: 'pecking_roughing',
      recommendedParams: {
        stepover: '20%',
        stepdown: '0.3 × diameter',
        feedMultiplier: 0.3,
        coolant: 'high_pressure',
        spindleRPM: 'reduced',
        chipBreaking: true
      },
      outcomes: {
        cycleTime: 'long',
        toolLife: 'challenging',
        quality: 'good'
      }
    }
  ],

  // TRAINING PATTERNS - FINISHING
  finishingPatterns: [
    {
      id: 'FINISH_001',
      name: 'Surface Finishing - Ra 0.8',
      input: {
        geometry: { surfaceType: '3D_freeform', curvature: 'varying' },
        material: { type: 'steel', hardness: 50 },
        tolerance: { surfaceFinish: 0.8 }
      },
      recommendedStrategy: 'parallel_finishing',
      recommendedParams: {
        stepover: '0.1mm',
        toolType: 'ballnose',
        direction: 'climb',
        feedMultiplier: 0.7,
        spindleRPM: 'maximum'
      },
      outcomes: {
        surfaceFinish: 'achieved',
        cycleTime: 'long'
      }
    },
    {
      id: 'FINISH_002',
      name: 'Wall Finishing - Thin Features',
      input: {
        geometry: { wallThickness: 1.5, wallHeight: 30 },
        material: { type: 'aluminum' },
        tolerance: { dimensional: 0.02 }
      },
      recommendedStrategy: 'z_level_finishing',
      recommendedParams: {
        stepdown: '0.5mm',
        toolType: 'endmill',
        passes: ['climb_then_conventional'],
        springPasses: 2,
        reducedFeed: true
      },
      outcomes: {
        deflection: 'minimized',
        accuracy: 'achieved'
      }
    },
    {
      id: 'FINISH_003',
      name: 'Pocket Floor Finishing',
      input: {
        geometry: { surfaceType: 'planar', pocketFloor: true },
        material: { type: 'steel', hardness: 30 },
        tolerance: { flatness: 0.01, surfaceFinish: 1.6 }
      },
      recommendedStrategy: 'face_finishing',
      recommendedParams: {
        stepover: '60%',
        toolType: 'facemill',
        wiper: true,
        feedMultiplier: 1.2
      },
      outcomes: {
        flatness: 'achieved',
        finish: 'good'
      }
    }
  ],

  // TRAINING PATTERNS - 5-AXIS
  fiveAxisPatterns: [
    {
      id: '5X_001',
      name: 'Impeller Blade Machining',
      input: {
        geometry: { bladeCount: 7, bladeHeight: 40, hubDiameter: 100 },
        material: { type: 'titanium' },
        tolerance: { profile: 0.05 }
      },
      recommendedStrategy: 'swarf_cutting',
      recommendedParams: {
        toolType: 'tapered_ballnose',
        leadAngle: 3,
        tiltAngle: 'variable',
        linkingMethod: 'smooth_5axis',
        collisionAvoidance: 'automatic'
      },
      outcomes: {
        blendQuality: 'excellent',
        cycleTime: 'optimized'
      }
    },
    {
      id: '5X_002',
      name: 'Turbine Blade Polishing',
      input: {
        geometry: { bladeType: 'turbine', surfaceArea: 2000 },
        material: { type: 'inconel' },
        tolerance: { surfaceFinish: 0.4 }
      },
      recommendedStrategy: '5axis_flow_finishing',
      recommendedParams: {
        toolType: 'ballnose',
        stepover: '0.05mm',
        toolAxisControl: 'surface_normal',
        leadLag: { lead: 5, lag: 0 }
      },
      outcomes: {
        finish: 'mirror',
        time: 'extended'
      }
    }
  ],

  // TRAINING PATTERNS - DRILLING
  drillingPatterns: [
    {
      id: 'DRILL_001',
      name: 'Deep Hole Drilling',
      input: {
        geometry: { holeDiameter: 10, holeDepth: 100 },
        material: { type: 'steel', hardness: 28 },
        tolerance: { straightness: 0.1 }
      },
      recommendedStrategy: 'peck_drilling',
      recommendedParams: {
        peckDepth: '3 × diameter',
        retract: '1mm',
        coolant: 'through_tool',
        dwellTime: 0.5
      },
      outcomes: {
        chipEvacuation: 'good',
        accuracy: 'achieved'
      }
    },
    {
      id: 'DRILL_002',
      name: 'High Precision Boring',
      input: {
        geometry: { holeDiameter: 25, holeDepth: 40 },
        material: { type: 'steel', hardness: 40 },
        tolerance: { diameter: 0.01, roundness: 0.005 }
      },
      recommendedStrategy: 'boring_cycle',
      recommendedParams: {
        toolType: 'boring_bar',
        passes: ['semi-finish', 'finish'],
        stock: [0.2, 0.05],
        feed: 'reduced',
        dwell: 1.0
      },
      outcomes: {
        accuracy: 'excellent',
        finish: 'good'
      }
    }
  ],

  // TRAINING PATTERNS - TURNING
  turningPatterns: [
    {
      id: 'TURN_001',
      name: 'OD Roughing',
      input: {
        geometry: { outerDiameter: 100, length: 150 },
        material: { type: 'steel', hardness: 25 },
        tolerance: { dimensional: 0.1 }
      },
      recommendedStrategy: 'facing_and_turning',
      recommendedParams: {
        depthOfCut: 3,
        feed: 0.3,
        approach: 'step_turning',
        coolant: 'flood'
      },
      outcomes: {
        time: 'fast',
        toolLife: 'good'
      }
    },
    {
      id: 'TURN_002',
      name: 'ID Threading',
      input: {
        geometry: { threadType: 'M20x2.5', depth: 20, internal: true },
        material: { type: 'steel', hardness: 30 },
        tolerance: { thread_class: '6H' }
      },
      recommendedStrategy: 'thread_milling',
      recommendedParams: {
        passes: 6,
        infeedMethod: 'modified_flank',
        springPass: true,
        threadChecker: true
      },
      outcomes: {
        accuracy: 'excellent',
        finish: 'good'
      }
    }
  ],

  // ML MODEL INTERFACE

  getFeatureVector(partData, materialData, toleranceData, machineData) {
    const vector = [];

    // Geometry features
    vector.push(partData.surfaceArea || 0);
    vector.push(partData.volume || 0);
    vector.push(partData.featureCount || 0);
    vector.push(partData.pocketCount || 0);
    vector.push(partData.holeCount || 0);
    vector.push(partData.surfaceComplexity || 0);
    vector.push(partData.thinWalls ? 1 : 0);
    vector.push(partData.deepPockets ? 1 : 0);

    // Material features
    const materialIndex = ['steel', 'aluminum', 'titanium', 'superalloy', 'copper', 'plastic']
      .indexOf(materialData.type);
    vector.push(materialIndex >= 0 ? materialIndex : 0);
    vector.push(materialData.hardness || 0);
    vector.push(materialData.machinability || 50);

    // Tolerance features
    vector.push(toleranceData.surfaceFinish || 3.2);
    vector.push(toleranceData.dimensional || 0.1);
    vector.push(toleranceData.criticalFeatures || 0);

    // Machine features
    const machineIndex = ['3-axis', '4-axis', '5-axis', 'mill-turn']
      .indexOf(machineData.type);
    vector.push(machineIndex >= 0 ? machineIndex : 0);

    return vector;
  },
  findSimilarPatterns(featureVector, topN = 5) {
    // Simple similarity search based on Euclidean distance
    const allPatterns = [
      ...this.roughingPatterns,
      ...this.finishingPatterns,
      ...this.fiveAxisPatterns,
      ...this.drillingPatterns,
      ...this.turningPatterns
    ];

    const scored = allPatterns.map(pattern => {
      const patternVector = this._patternToVector(pattern);
      const distance = this._euclideanDistance(featureVector, patternVector);
      return { pattern, distance };
    });

    scored.sort((a, b) => a.distance - b.distance);

    return scored.slice(0, topN).map(s => s.pattern);
  },
  _patternToVector(pattern) {
    // Simplified - would need full implementation
    return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  },
  _euclideanDistance(v1, v2) {
    let sum = 0;
    const len = Math.min(v1.length, v2.length);
    for (let i = 0; i < len; i++) {
      sum += Math.pow(v1[i] - v2[i], 2);
    }
    return Math.sqrt(sum);
  }
}