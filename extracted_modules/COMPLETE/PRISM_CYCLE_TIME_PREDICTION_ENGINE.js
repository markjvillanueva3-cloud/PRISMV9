const PRISM_CYCLE_TIME_PREDICTION_ENGINE = {
  version: '1.0.0',
  name: 'PRISM Cycle Time Prediction Engine',

  // TIME COMPONENTS

  calculateCycleTime(operations, machine, options = {}) {
    const breakdown = {
      cutting: 0,
      rapid: 0,
      toolChange: 0,
      dwelling: 0,
      other: 0
    };
    operations.forEach(op => {
      // Cutting time
      if (op.toolpath && op.toolpath.points) {
        const cuttingResult = this._calculateCuttingTime(op.toolpath.points, op.feed);
        breakdown.cutting += cuttingResult.cutting;
        breakdown.rapid += cuttingResult.rapid;
      }
      // Tool change time
      if (op.toolChange) {
        breakdown.toolChange += this._getToolChangeTime(machine);
      }
      // Dwell time
      if (op.dwell) {
        breakdown.dwelling += op.dwell;
      }
    });

    // Apply machine-specific factors
    const machineFactors = this._getMachineFactors(machine);
    breakdown.cutting *= machineFactors.feedFactor;
    breakdown.rapid *= machineFactors.rapidFactor;

    const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

    return {
      total: total,
      breakdown: breakdown,
      formatted: this._formatTime(total),
      confidence: this._calculateConfidence(operations)
    };
  },
  _calculateCuttingTime(points, defaultFeed) {
    let cuttingTime = 0;
    let rapidTime = 0;

    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];

      const distance = Math.sqrt(
        Math.pow(p2.x - p1.x, 2) +
        Math.pow(p2.y - p1.y, 2) +
        Math.pow(p2.z - p1.z, 2)
      );

      if (p2.rapid) {
        // Rapid move - assume typical rapid rate
        const rapidRate = 15000; // mm/min typical
        rapidTime += distance / rapidRate;
      } else {
        // Cutting move
        const feed = p2.f || defaultFeed || 500;
        cuttingTime += distance / feed;
      }
    }
    return {
      cutting: cuttingTime,
      rapid: rapidTime
    };
  },
  _getToolChangeTime(machine) {
    // Typical tool change times by machine type
    const toolChangeTimes = {
      'vertical_machining_center': 5,    // seconds
      'horizontal_machining_center': 4,
      'lathe': 3,
      'mill_turn': 6,
      '5_axis': 7,
      'default': 5
    };
    return (toolChangeTimes[machine.type] || toolChangeTimes.default) / 60; // Convert to minutes
  },
  _getMachineFactors(machine) {
    // Factors that affect actual vs programmed time
    return {
      feedFactor: machine.feedOverride || 1.0,
      rapidFactor: 1.2, // Rapids typically don't reach programmed speed
      accelerationFactor: 1.1 // Acceleration/deceleration overhead
    };
  },
  _formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.round((minutes * 60) % 60);

    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  },
  _calculateConfidence(operations) {
    // Higher confidence with more detailed data
    let score = 50; // Base confidence

    if (operations.every(op => op.toolpath?.points?.length > 0)) {
      score += 20;
    }
    if (operations.every(op => op.feed > 0)) {
      score += 15;
    }
    if (operations.every(op => op.tool?.diameter > 0)) {
      score += 10;
    }
    return Math.min(score, 95) + '%';
  },
  // ESTIMATION BY FEATURE

  estimateByFeature(features, material) {
    let totalTime = 0;
    const featureTimes = [];

    features.forEach(feature => {
      const time = this._estimateFeatureTime(feature, material);
      totalTime += time;
      featureTimes.push({ feature: feature.type, time: time });
    });

    return {
      total: totalTime,
      features: featureTimes,
      formatted: this._formatTime(totalTime)
    };
  },
  _estimateFeatureTime(feature, material) {
    // Rough estimation based on feature type and material
    const materialFactor = this._getMaterialTimeFactor(material);

    switch (feature.type) {
      case 'pocket':
        return (feature.volume || 1000) * 0.0001 * materialFactor;
      case 'hole':
        return (feature.depth || 10) * 0.05 * materialFactor;
      case 'slot':
        return (feature.length || 50) * 0.01 * materialFactor;
      case 'face':
        return (feature.area || 1000) * 0.00002 * materialFactor;
      default:
        return 1; // 1 minute default
    }
  },
  _getMaterialTimeFactor(material) {
    const factors = {
      'aluminum': 0.5,
      'steel': 1.0,
      'stainless': 1.5,
      'titanium': 3.0,
      'inconel': 5.0,
      'hardened_steel': 2.5
    };
    return factors[material] || 1.0;
  }
};
// WINDOW REGISTRATION

if (typeof window !== 'undefined') {
  window.WIRE_EDM_STRATEGY_DATABASE = WIRE_EDM_STRATEGY_DATABASE;
  window.PRISM_ML_TRAINING_PATTERNS_DATABASE = PRISM_ML_TRAINING_PATTERNS_DATABASE;
  window.PRISM_WORKFLOW_ORCHESTRATOR_V2 = PRISM_WORKFLOW_ORCHESTRATOR_V2;
  window.PRISM_UI_INTEGRATION_ENGINE = PRISM_UI_INTEGRATION_ENGINE;
  window.PRISM_CYCLE_TIME_PREDICTION_ENGINE = PRISM_CYCLE_TIME_PREDICTION_ENGINE;
}
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] IMPROVEMENTS BATCH 2 - v8.9.290 LOADED');
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] New Components:');
console.log('  - WIRE_EDM_STRATEGY_DATABASE v1.0.0');
console.log('  - PRISM_ML_TRAINING_PATTERNS_DATABASE v1.0.0');
console.log('  - PRISM_WORKFLOW_ORCHESTRATOR_V2 v2.0.0');
console.log('  - PRISM_UI_INTEGRATION_ENGINE v1.0.0');
console.log('  - PRISM_CYCLE_TIME_PREDICTION_ENGINE v1.0.0');

// BATCH 3 IMPROVEMENTS - v8.9.290 INTEGRATED
// Integrated: Advanced 5-Axis, Macros, Turbomachinery, Linking, Barrel Cutter

// PRISM IMPROVEMENTS BATCH 3 - v8.9.290
// Building on v8.9.290
// BATCH 3 CONTENTS:
// 1. ADVANCED_5AXIS_STRATEGY_DATABASE - Comprehensive 5-axis strategies
// 2. APPROACH_RETRACT_MACRO_DATABASE - Approach/retract macro definitions
// 3. TURBOMACHINERY_FEATURE_ENGINE - Blade/impeller feature recognition
// 4. LINKING_JOB_ORCHESTRATOR - Job linking with collision-free movements
// 5. BARREL_CUTTER_OPTIMIZATION_ENGINE - Barrel cutter path optimization

// 1. ADVANCED_5AXIS_STRATEGY_DATABASE
// Based on HyperMill 5-axis strategies and Siemens SINUMERIK documentation

const ADVANCED_5AXIS_STRATEGY_DATABASE = {
  version: '1.0.0',
  name: 'PRISM Advanced 5-Axis Strategy Database',

  // 5-AXIS STRATEGY CATEGORIES
  categories: {
    simultaneous: {
      description: 'All 5 axes move simultaneously during machining',
      applications: ['Complex surfaces', 'Turbine blades', 'Impellers', 'Aerospace']
    },
    indexed: {
      description: 'Rotary axes position then lock, 3-axis machining follows',
      applications: ['Multi-face machining', 'Prismatic parts', 'Drilling patterns']
    },
    positional: {
      description: '3+2 axis positioning for optimal tool access',
      applications: ['Angled features', 'Undercuts', 'Complex pockets']
    }
  },
  // SWARF CUTTING STRATEGIES
  swarfCutting: {
    description: 'Side wall machining using the side of the cutter (flank milling)',

    oneCurve: {
      name: '5X SWARF Cutting 1 Curve',
      description: 'Tool orientation defined by single guide curve',
      applications: ['Ruled surfaces', 'Conical surfaces', 'Blade edges'],
      parameters: {
        guideCurve: { type: 'curve', required: true },
        toolPosition: { options: ['onContour', 'left', 'right', 'auto'] },
        allowanceXY: { type: 'number', default: 0, unit: 'mm' },
        allowance: { type: 'number', default: 0, unit: 'mm' },
        verticalStepdown: { type: 'number', default: 1.0, unit: 'mm' },
        machiningMode: { options: ['swarf', 'plunge'] },
        direction: { options: ['oneway', 'zigzag'] },
        zSmoothing: { type: 'boolean', default: false },
        zConstant: { type: 'boolean', default: false }
      },
      toolTypes: ['endmill', 'bullnose', 'ballnose', 'tapered']
    },
    twoCurves: {
      name: '5X SWARF Cutting 2 Curves',
      description: 'Tool orientation defined by two guide curves',
      applications: ['Variable wall angles', 'Twisted surfaces', 'Complex flanks'],
      parameters: {
        topCurve: { type: 'curve', required: true },
        bottomCurve: { type: 'curve', required: true },
        syncMode: { options: ['byLength', 'byPoints', 'byParameter'] },
        toolPosition: { options: ['onContour', 'left', 'right', 'auto'] },
        allowance: { type: 'number', default: 0, unit: 'mm' },
        verticalStepdown: { type: 'number', default: 1.0, unit: 'mm' }
      }
    },
    surface: {
      name: '5X SWARF Cutting Surface',
      description: 'SWARF cutting on ruled/developable surfaces',
      applications: ['Aircraft wing surfaces', 'Blade roots', 'Complex flanks'],
      parameters: {
        millingArea: { type: 'surface', required: true },
        direction: { options: ['alongU', 'alongV', 'angle'] },
        angle: { type: 'number', default: 0, range: [0, 360], unit: 'deg' },
        stepover: { type: 'number', default: 5.0, unit: 'mm' },
        allowance: { type: 'number', default: 0, unit: 'mm' }
      }
    }
  },
  // Z-LEVEL 5-AXIS STRATEGIES
  zLevel: {
    finishing: {
      name: '5X Z Level Finishing',
      description: 'Z-constant finishing with 5-axis tool orientation',
      applications: ['Steep walls', 'Pockets', 'Core/cavity'],
      parameters: {
        millingArea: { type: 'surface', required: true },
        stepdown: { type: 'number', default: 0.5, unit: 'mm' },
        scallop: { type: 'number', default: 0.01, unit: 'mm' },
        topLimit: { type: 'number', unit: 'mm' },
        bottomLimit: { type: 'number', unit: 'mm' },
        slopeDependentMachining: { type: 'boolean', default: false },
        minSlopeAngle: { type: 'number', default: 30, unit: 'deg' },
        maxSlopeAngle: { type: 'number', default: 90, unit: 'deg' }
      },
      machiningSequence: {
        plane: 'Level by level machining',
        pocket: 'Contour pockets/islands machined in sequence',
        preferSpiral: 'Continuous spiral toolpath'
      },
      toolTypes: ['ballnose', 'bullnose', 'endmill', 'lollipop', 'barrel']
    },
    shapeFinishing: {
      name: '5X Z Level Shape Finishing',
      description: 'Z-level finishing with shape offset capability',
      applications: ['Complex pockets', 'Multi-level features'],
      parameters: {
        edgeOnly: { type: 'boolean', default: false },
        sideWalls: { type: 'boolean', default: true },
        axialSorting: { type: 'boolean', default: true },
        preferSpiral: { type: 'boolean', default: false },
        allowZigzag: { type: 'boolean', default: false },
        smoothOverlap: { type: 'boolean', default: true }
      }
    }
  },
  // SHAPE OFFSET STRATEGIES
  shapeOffset: {
    finishing: {
      name: '5X Shape Offset Finishing',
      description: 'Multi-axis finishing with offset from reference shape',
      applications: ['Freeform surfaces', 'Blends', 'Complex contours'],
      parameters: {
        referenceShape: { type: 'surface', required: true },
        offsetValue: { type: 'number', default: 0, unit: 'mm' },
        stepover: { type: 'number', default: 1.0, unit: 'mm' },
        direction: { options: ['alongU', 'alongV', 'spiral', 'adaptive'] },
        leadAngle: { type: 'number', default: 0, range: [-45, 45], unit: 'deg' },
        tiltAngle: { type: 'number', default: 0, range: [-45, 45], unit: 'deg' },
        macroSimultaneous: { type: 'boolean', default: true }
      }
    }
  },
  // REST MACHINING STRATEGIES
  restMachining: {
    fiveAxis: {
      name: '5X Rest Machining',
      description: 'Remove material left by larger tools with 5-axis motion',
      applications: ['Corner cleanup', 'Fillet areas', 'Complex pockets'],
      parameters: {
        referenceTool: { type: 'tool', required: true },
        referenceJob: { type: 'job', required: false },
        minRestMaterial: { type: 'number', default: 0.1, unit: 'mm' },
        maxRestMaterial: { type: 'number', default: 5.0, unit: 'mm' },
        stepover: { type: 'number', default: 0.5, unit: 'mm' },
        stepdown: { type: 'number', default: 0.5, unit: 'mm' },
        autoDetect: { type: 'boolean', default: true }
      }
    }
  },
  // PROFILE MACHINING STRATEGIES
  profileMachining: {
    fiveAxis: {
      name: '5X Profile Finishing',
      description: 'Profile machining with continuous 5-axis motion',
      applications: ['Perimeter finishing', 'Complex edges', 'Chamfers'],
      parameters: {
        profile: { type: 'curve', required: true },
        toolAxis: { options: ['normal', 'lead', 'tilt', 'leadAndTilt'] },
        leadAngle: { type: 'number', default: 0, unit: 'deg' },
        tiltAngle: { type: 'number', default: 0, unit: 'deg' },
        depthPasses: { type: 'number', default: 1 },
        radialPasses: { type: 'number', default: 1 }
      }
    }
  },
  // TOOL ORIENTATION CONTROL
  toolOrientation: {
    automatic: {
      description: 'System calculates optimal tool orientation',
      methods: {
        surfaceNormal: 'Tool axis perpendicular to surface',
        leadAngle: 'Tool tilted in feed direction',
        tiltAngle: 'Tool tilted perpendicular to feed direction',
        combined: 'Both lead and tilt angles applied'
      }
    },
    constraints: {
      maxInclination: { type: 'number', default: 45, unit: 'deg' },
      minInclination: { type: 'number', default: 0, unit: 'deg' },
      smoothing: { type: 'boolean', default: true },
      smoothingFactor: { type: 'number', default: 0.5, range: [0, 1] },
      avoidPole: { type: 'boolean', default: true },
      poleAngleIncrement: { type: 'number', default: 90, unit: 'deg' }
    },
    linking: {
      optimizedG0: {
        description: 'Optimized rapid movements avoiding pole passes',
        conicalInterpolation: true,
        smoothFactor: { type: 'number', default: 0.5 }
      },
      splitG1: {
        description: 'Split G1 movements for limited axis machines',
        blendingDistanceFactor: { type: 'number', default: 1.0 },
        blendingLengthFactor: { type: 'number', default: 1.0 }
      }
    }
  },
  // SIMULTANEOUS TURNING STRATEGIES
  simultaneousTurning: {
    roughing: {
      name: '3X Simultaneous Roughing',
      description: 'Roughing with simultaneous swivel axis',
      applications: ['Complex contours', 'Varying wall angles'],
      parameters: {
        contour: { type: 'curve', required: true },
        cuttingSide: { options: ['outside', 'inside', 'plane'] },
        infeedDirection: { options: ['toLeft', 'toRight', 'outsideIn', 'insideOut'] },
        stockAllowance: { type: 'number', default: 0.5, unit: 'mm' },
        depthOfCut: { type: 'number', default: 2.0, unit: 'mm' }
      }
    },
    finishing: {
      name: '3X Simultaneous Finishing',
      description: 'Finishing with simultaneous swivel axis',
      applications: ['Turbine blades', 'Piston heads', 'Complex profiles'],
      tiltStrategy: {
        tiltPoint: 'Single tilt point defines orientation',
        syncLines: 'Synchronization lines control tilt progression'
      },
      benefits: ['High surface quality', 'Reduced tool wear', 'Single tool capability'],
      parameters: {
        contour: { type: 'curve', required: true },
        cuttingSide: { options: ['outside', 'inside', 'plane'] },
        tiltMethod: { options: ['tiltPoint', 'syncLines'] },
        allowance: { type: 'number', default: 0, unit: 'mm' }
      }
    }
  },
  // HIGH SPEED MACHINING (HSM) SETTINGS
  highSpeedSettings: {
    CYCLE832: {
      description: 'Siemens CYCLE832 for HSC/HSM applications',
      parameters: {
        tolerance: { type: 'number', default: 0.01, unit: 'mm' },
        jerkLimit: { type: 'boolean', default: true },
        feedforward: { type: 'boolean', default: true },
        compressor: { type: 'boolean', default: true }
      },
      modes: {
        finishing: { tolerance: 0.005, smoothing: 'high' },
        semifinishing: { tolerance: 0.01, smoothing: 'medium' },
        roughing: { tolerance: 0.05, smoothing: 'low' }
      }
    },
    TRAORI: {
      description: 'Siemens 5-axis transformation',
      kinematicsIndependent: true,
      features: ['TCP compensation', 'Tool length compensation', 'Orientation interpolation']
    }
  },
  // METHODS

  getStrategyForGeometry: function(geometry) {
    const results = [];

    if (geometry.hasRuledSurfaces) {
      results.push({
        strategy: 'swarfCutting.oneCurve',
        confidence: 0.9,
        reason: 'Ruled surfaces ideal for SWARF cutting'
      });
    }
    if (geometry.hasSteepWalls) {
      results.push({
        strategy: 'zLevel.finishing',
        confidence: 0.85,
        reason: 'Steep walls benefit from Z-level finishing'
      });
    }
    if (geometry.hasComplexFreeform) {
      results.push({
        strategy: 'shapeOffset.finishing',
        confidence: 0.8,
        reason: 'Complex freeform surfaces need shape offset finishing'
      });
    }
    if (geometry.hasRestMaterial) {
      results.push({
        strategy: 'restMachining.fiveAxis',
        confidence: 0.95,
        reason: 'Rest material detected requiring cleanup'
      });
    }
    return results.sort((a, b) => b.confidence - a.confidence);
  },
  calculateToolOrientation: function(point, surface, constraints) {
    const normal = surface.getNormalAt(point);
    let toolAxis = { x: normal.x, y: normal.y, z: normal.z };

    // Apply lead angle
    if (constraints.leadAngle && constraints.leadAngle !== 0) {
      const feedDir = constraints.feedDirection || { x: 1, y: 0, z: 0 };
      const leadRad = constraints.leadAngle * Math.PI / 180;
      toolAxis = this._rotateVector(toolAxis, feedDir, leadRad);
    }
    // Apply tilt angle
    if (constraints.tiltAngle && constraints.tiltAngle !== 0) {
      const sideDir = constraints.sideDirection || { x: 0, y: 1, z: 0 };
      const tiltRad = constraints.tiltAngle * Math.PI / 180;
      toolAxis = this._rotateVector(toolAxis, sideDir, tiltRad);
    }
    // Check inclination limits
    const inclination = Math.acos(toolAxis.z) * 180 / Math.PI;
    if (inclination > constraints.maxInclination) {
      toolAxis = this._limitInclination(toolAxis, constraints.maxInclination);
    }
    return toolAxis;
  },
  _rotateVector: function(v, axis, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dot = v.x * axis.x + v.y * axis.y + v.z * axis.z;

    return {
      x: v.x * cos + (axis.y * v.z - axis.z * v.y) * sin + axis.x * dot * (1 - cos),
      y: v.y * cos + (axis.z * v.x - axis.x * v.z) * sin + axis.y * dot * (1 - cos),
      z: v.z * cos + (axis.x * v.y - axis.y * v.x) * sin + axis.z * dot * (1 - cos)
    };
  },
  _limitInclination: function(v, maxAngle) {
    const maxRad = maxAngle * Math.PI / 180;
    const currentAngle = Math.acos(v.z);

    if (currentAngle <= maxRad) return v;

    const scale = Math.sin(maxRad) / Math.sin(currentAngle);
    const newZ = Math.cos(maxRad);

    return {
      x: v.x * scale,
      y: v.y * scale,
      z: newZ
    };
  }
};
// 2. APPROACH_RETRACT_MACRO_DATABASE
// Based on HyperMill approach/retract macro definitions

const APPROACH_RETRACT_MACRO_DATABASE = {
  version: '1.0.0',
  name: 'PRISM Approach/Retract Macro Database',

  // APPROACH MACROS
  approachMacros: {
    axial: {
      name: 'Axial',
      description: 'Linear movement along tool axis towards part',
      parameters: {
        length: { type: 'number', default: 5.0, unit: 'mm' },
        feedrate: { type: 'number', unit: 'mm/min', useDefault: 'feedrateXY' }
      },
      applications: ['Closed contours', 'Concave inner contours'],
      gcodePattern: 'G1 Z{depth} F{feedrate}'
    },
    perpendicular: {
      name: 'Perpendicular',
      description: 'Linear movement perpendicular to surface',
      parameters: {
        length: { type: 'number', default: 5.0, unit: 'mm' },
        feedrate: { type: 'number', unit: 'mm/min', useDefault: 'feedrateXY' }
      },
      applications: ['Surface approach', 'Normal entry']
    },
    circular: {
      name: 'Circular',
      description: 'Quarter circle approach movement',
      parameters: {
        radius: { type: 'number', default: 5.0, unit: 'mm' },
        feedrate: { type: 'number', unit: 'mm/min', useDefault: 'feedrateXY' }
      },
      applications: ['Smooth entry', 'Reduced tool marks'],
      note: 'All circular movements split into G1 straights for 5-axis'
    },
    tangential: {
      name: 'Tangential',
      description: 'Entry along surface tangent',
      parameters: {
        length: { type: 'number', default: 10.0, unit: 'mm' },
        feedrate: { type: 'number', unit: 'mm/min', useDefault: 'feedrateXY' }
      },
      applications: ['Profile machining', 'Contour entry']
    },
    ramp: {
      name: 'Ramp',
      description: 'Soft cutting entry along toolpath',
      parameters: {
        angle: { type: 'number', default: 5.0, unit: 'deg' },
        maxLength: { type: 'number', default: 50.0, unit: 'mm' },
        feedrate: { type: 'number', unit: 'mm/min', useDefault: 'feedratePlunge' }
      },
      applications: ['Level-by-level machining', 'Tight areas', 'Prevents contour violations'],
      note: 'Exclusive for level-by-level machining'
    },
    helix: {
      name: 'Helix',
      description: 'Helical entry into material',
      parameters: {
        radius: { type: 'number', default: 5.0, unit: 'mm' },
        pitch: { type: 'number', default: 2.0, unit: 'mm/rev' },
        direction: { options: ['cw', 'ccw'], default: 'cw' },
        feedrate: { type: 'number', unit: 'mm/min', useDefault: 'feedratePlunge' }
      },
      applications: ['Pocket entry', 'Plunging into solid']
    },
    profileOriented: {
      name: 'Profile Oriented',
      description: 'Linear movement along surface tangent at contact point',
      parameters: {
        length: { type: 'number', default: 5.0, unit: 'mm' },
        feedrate: { type: 'number', unit: 'mm/min', useDefault: 'feedrateXY' }
      },
      applications: ['Closed contours', 'Concave inner contours'],
      note: 'For level-by-level machining along contour tangent'
    }
  },
  // RETRACT MACROS
  retractMacros: {
    axial: {
      name: 'Axial',
      description: 'Linear movement along tool axis away from part',
      parameters: {
        length: { type: 'number', default: 5.0, unit: 'mm' },
        feedrate: { type: 'number', unit: 'mm/min', useDefault: 'rapid' }
      }
    },
    perpendicular: {
      name: 'Perpendicular',
      description: 'Linear movement perpendicular away from surface',
      parameters: {
        length: { type: 'number', default: 5.0, unit: 'mm' },
        feedrate: { type: 'number', unit: 'mm/min', useDefault: 'rapid' }
      }
    },
    circular: {
      name: 'Circular',
      description: 'Quarter circle retract movement',
      parameters: {
        radius: { type: 'number', default: 5.0, unit: 'mm' },
        feedrate: { type: 'number', unit: 'mm/min', useDefault: 'rapid' }
      }
    },
    tangential: {
      name: 'Tangential',
      description: 'Exit along surface tangent',
      parameters: {
        length: { type: 'number', default: 10.0, unit: 'mm' },
        feedrate: { type: 'number', unit: 'mm/min', useDefault: 'rapid' }
      }
    },
    clearancePlane: {
      name: 'Clearance Plane',
      description: 'Retract to defined clearance plane',
      parameters: {
        planeZ: { type: 'number', unit: 'mm' },
        feedrate: { type: 'number', unit: 'mm/min', useDefault: 'rapid' }
      }
    },
    clearanceDistance: {
      name: 'Clearance Distance',
      description: 'Retract by specified distance above surface',
      parameters: {
        distance: { type: 'number', default: 5.0, unit: 'mm' },
        feedrate: { type: 'number', unit: 'mm/min', useDefault: 'rapid' }
      }
    }
  },
  // RETURN MACROS (FOR ZIGZAG)
  returnMacros: {
    off: {
      description: 'No return macro between passes'
    },
    full: {
      description: 'Full approach/retract between alternating passes',
      note: 'Available for 5X Shape Offset Finishing in automatic mode'
    }
  },
  // MACRO SIMULTANEOUS MODE
  macroSimultaneous: {
    description: 'Smooth transition to macro movement without direction change',
    applications: ['5X Z Level Finishing', '5X Swarf Cutting 1 Curve', '5X Shape Offset Finishing'],
    benefits: ['No abrupt direction changes', 'Maintains machining speed', 'Avoids visible marks'],
    parameters: {
      enabled: { type: 'boolean', default: true },
      blendFactor: { type: 'number', default: 0.5, range: [0, 1] }
    }
  },
  // LINKING MOVEMENT CONTROL
  linkingMovements: {
    rapidSmoothing: {
      description: 'Smooth rapid movements in 5X mode',
      parameters: {
        highSpeed: { type: 'boolean', default: true },
        smoothFactor: {
          description: 'Ratio of connection line length to movement height',
          type: 'number',
          default: 0.5,
          range: [0.1, 2.0]
        }
      },
      note: 'Must be used with Clearance distance retract mode'
    },
    planarVsRadial: {
      planar: 'Linking in XY plane then Z movement',
      radial: 'Direct 3D linking between points'
    },
    collisionAvoidance: {
      enabled: { type: 'boolean', default: true },
      stockCheck: { type: 'boolean', default: true },
      fixtureCheck: { type: 'boolean', default: true }
    }
  },
  // FEEDRATE CONTROL
  feedrateControl: {
    approachFeedrate: { description: 'Feedrate for approach moves', useDefault: 'feedrateXY' },
    retractFeedrate: { description: 'Feedrate for retract moves', useDefault: 'rapid' },
    macroLeadIn: { description: 'Lead-in feedrate', type: 'number' },
    macroLeadOut: { description: 'Lead-out feedrate', type: 'number' }
  },
  // METHODS

  getRecommendedMacro: function(context) {
    const { geometry, operation, toolType } = context;

    // Pocket entry
    if (geometry.type === 'pocket' && operation === 'roughing') {
      return {
        approach: 'helix',
        retract: 'clearanceDistance',
        reason: 'Helical entry safe for pocket roughing'
      };
    }
    // Profile finishing
    if (geometry.type === 'profile' && operation === 'finishing') {
      return {
        approach: 'tangential',
        retract: 'tangential',
        reason: 'Tangential moves prevent witness marks on profile'
      };
    }
    // 5-axis surface finishing
    if (geometry.type === 'freeform' && operation === 'finishing') {
      return {
        approach: 'circular',
        retract: 'circular',
        macroSimultaneous: true,
        reason: 'Smooth circular moves for surface quality'
      };
    }
    // Default
    return {
      approach: 'axial',
      retract: 'clearanceDistance',
      reason: 'Safe default for general machining'
    };
  },
  generateMacroGCode: function(macro, params, postProcessor) {
    const type = macro.type;
    const macroData = this.approachMacros[type] || this.retractMacros[type];

    if (!macroData) return '';

    let gcode = [];

    switch (type) {
      case 'axial':
        gcode.push(`G1 Z${params.targetZ} F${params.feedrate}`);
        break;
      case 'circular':
        // Split into linear segments for 5-axis
        const segments = this._generateCircularSegments(params);
        segments.forEach(seg => {
          gcode.push(`G1 X${seg.x.toFixed(4)} Y${seg.y.toFixed(4)} Z${seg.z.toFixed(4)} F${params.feedrate}`);
        });
        break;
      case 'helix':
        const helixSegs = this._generateHelixSegments(params);
        helixSegs.forEach(seg => {
          gcode.push(`G1 X${seg.x.toFixed(4)} Y${seg.y.toFixed(4)} Z${seg.z.toFixed(4)} F${params.feedrate}`);
        });
        break;
      case 'ramp':
        gcode.push(`(RAMP ENTRY)`);
        // Ramp is typically generated as part of toolpath
        break;
    }
    return gcode.join('\n');
  },
  _generateCircularSegments: function(params) {
    const segments = [];
    const numSegments = 8; // 8 segments for quarter circle
    const angleStep = (Math.PI / 2) / numSegments;

    for (let i = 0; i <= numSegments; i++) {
      const angle = i * angleStep;
      segments.push({
        x: params.centerX + params.radius * Math.cos(angle),
        y: params.centerY + params.radius * Math.sin(angle),
        z: params.startZ + (params.endZ - params.startZ) * (i / numSegments)
      });
    }
    return segments;
  },
  _generateHelixSegments: function(params) {
    const segments = [];
    const totalRevs = Math.abs(params.endZ - params.startZ) / params.pitch;
    const numSegments = Math.ceil(totalRevs * 36); // 36 segments per rev
    const angleStep = (totalRevs * 2 * Math.PI) / numSegments;
    const zStep = (params.endZ - params.startZ) / numSegments;

    for (let i = 0; i <= numSegments; i++) {
      const angle = i * angleStep * (params.direction === 'cw' ? 1 : -1);
      segments.push({
        x: params.centerX + params.radius * Math.cos(angle),
        y: params.centerY + params.radius * Math.sin(angle),
        z: params.startZ + i * zStep
      });
    }
    return segments;
  }
};
// 3. TURBOMACHINERY_FEATURE_ENGINE
// Based on HyperMill Turbomachinery Features

const TURBOMACHINERY_FEATURE_ENGINE = {
  version: '1.0.0',
  name: 'PRISM Turbomachinery Feature Engine',

  // BLADE FEATURES
  bladeFeature: {
    description: 'Feature recognition for turbine/compressor blades',

    geometryElements: {
      bladeSurfaces: {
        description: 'Main blade surfaces (pressure/suction sides)',
        required: true
      },
      bottomPlane: {
        description: 'Bottom/root plane of blade',
        required: true
      },
      hubCurve: {
        description: 'Hub attachment curve',
        required: true
      },
      shroudSurface: {
        description: 'Outer shroud surface (if present)',
        required: false
      },
      shroudCurve: {
        description: 'Outer shroud curve',
        required: false
      },
      leadingEdgeCurve: {
        description: 'Curve defining leading edge',
        required: true
      },
      trailingEdgeCurve: {
        description: 'Curve defining trailing edge',
        required: true
      },
      driveSurfaces: {
        description: 'Additional surfaces for tool axis control',
        required: false
      }
    },
    machiningStrategies: {
      roughing: ['adaptive', 'planeRoughing', 'z-levelRoughing'],
      semifinishing: ['surfaceOffset', 'restMachining'],
      finishing: ['5axisSwarf', 'faceFinishing', 'helicalFinishing']
    }
  },
  // MULTI-BLADE (IMPELLER/BLISK) FEATURES
  multiBladeFeature: {
    description: 'Feature recognition for impellers, blisks, and multi-blade assemblies',

    parameters: {
      bladeCount: { type: 'integer', required: true },
      rotationAxis: { type: 'vector', default: { x: 0, y: 0, z: 1 } },
      bladeSpacing: { type: 'number', unit: 'deg' },
      hubDiameter: { type: 'number', unit: 'mm' },
      shroudDiameter: { type: 'number', unit: 'mm' }
    },
    geometryElements: {
      blades: { description: 'Array of blade features', type: 'array' },
      hub: { description: 'Hub surface', required: true },
      shroud: { description: 'Shroud surface', required: false },
      splitterBlades: { description: 'Splitter blade features', required: false }
    },
    filterDefinition: {
      description: 'Automatic definition of elements via filters',
      filters: {
        byAngle: 'Filter surfaces by normal angle',
        byCurvature: 'Filter by surface curvature',
        byPosition: 'Filter by radial/axial position'
      }
    }
  },
  // MACHINING OPERATIONS
  machiningOperations: {
    bladeRoughing: {
      name: 'Blade Roughing',
      description: 'Remove bulk material between blades',
      strategies: ['planeRoughing', 'adaptiveRoughing', 'slotMilling'],
      parameters: {
        stockAllowance: { type: 'number', default: 0.5, unit: 'mm' },
        depthOfCut: { type: 'number', default: 3.0, unit: 'mm' },
        stepover: { type: 'number', default: 50, unit: '%' }
      }
    },
    hubFinishing: {
      name: 'Hub Finishing',
      description: 'Finish the hub surface between blades',
      strategies: ['5axisContour', 'flowlineMachining'],
      parameters: {
        allowance: { type: 'number', default: 0, unit: 'mm' },
        stepover: { type: 'number', default: 0.5, unit: 'mm' },
        scallop: { type: 'number', default: 0.005, unit: 'mm' }
      }
    },
    bladeFinishing: {
      name: 'Blade Finishing',
      description: 'Finish blade surfaces',
      strategies: ['5axisSwarf', 'faceFinishing', 'pointMilling'],
      parameters: {
        allowance: { type: 'number', default: 0, unit: 'mm' },
        stepdown: { type: 'number', default: 0.3, unit: 'mm' },
        leadAngle: { type: 'number', default: 5, unit: 'deg' }
      }
    },
    edgeFinishing: {
      name: 'Edge Finishing',
      description: 'Finish leading and trailing edges',
      strategies: ['5axisContour', 'ballnoseFinishing'],
      parameters: {
        blendRadius: { type: 'number', default: 0.2, unit: 'mm' }
      }
    }
  },
  // METHODS

  recognizeBladeFeature: function(model) {
    const feature = {
      type: 'blade',
      elements: {},
      confidence: 0,
      issues: []
    };
    // Find blade surfaces (typically the largest connected surfaces)
    const surfaces = model.getSurfaces();
    const bladeSurfaces = surfaces.filter(s => {
      return s.area > model.totalArea * 0.1 && s.isFreeform;
    });

    if (bladeSurfaces.length >= 2) {
      feature.elements.bladeSurfaces = bladeSurfaces;
      feature.confidence += 0.3;
    } else {
      feature.issues.push('Could not identify blade surfaces');
    }
    // Find edge curves
    const edges = model.getEdges();
    const leadingEdge = this._findLeadingEdge(edges, bladeSurfaces);
    const trailingEdge = this._findTrailingEdge(edges, bladeSurfaces);

    if (leadingEdge) {
      feature.elements.leadingEdgeCurve = leadingEdge;
      feature.confidence += 0.2;
    }
    if (trailingEdge) {
      feature.elements.trailingEdgeCurve = trailingEdge;
      feature.confidence += 0.2;
    }
    // Find hub/root
    const bottomPlane = this._findBottomPlane(surfaces);
    if (bottomPlane) {
      feature.elements.bottomPlane = bottomPlane;
      feature.confidence += 0.15;
    }
    // Find hub curve
    const hubCurve = this._findHubCurve(edges, bottomPlane);
    if (hubCurve) {
      feature.elements.hubCurve = hubCurve;
      feature.confidence += 0.15;
    }
    return feature;
  },
  recognizeImpellerFeature: function(model) {
    const feature = {
      type: 'impeller',
      bladeCount: 0,
      blades: [],
      hub: null,
      shroud: null,
      confidence: 0
    };
    // Detect rotational symmetry
    const symmetry = this._detectRotationalSymmetry(model);
    if (symmetry.found) {
      feature.bladeCount = symmetry.count;
      feature.rotationAxis = symmetry.axis;
      feature.confidence += 0.4;
    }
    // Find hub surface (typically the surface of revolution at center)
    const hub = this._findHubSurface(model);
    if (hub) {
      feature.hub = hub;
      feature.confidence += 0.2;
    }
    // Find individual blades
    for (let i = 0; i < feature.bladeCount; i++) {
      const blade = this.recognizeBladeFeature(model.getBladeRegion(i));
      feature.blades.push(blade);
    }
    if (feature.blades.length > 0 && feature.blades[0].confidence > 0.5) {
      feature.confidence += 0.4;
    }
    return feature;
  },
  generateMachiningSequence: function(feature, options = {}) {
    const sequence = [];

    if (feature.type === 'impeller' || feature.type === 'blade') {
      // Roughing
      sequence.push({
        operation: 'roughing',
        strategy: options.roughingStrategy || 'adaptiveRoughing',
        parameters: {
          stockAllowance: options.roughingAllowance || 0.5,
          depthOfCut: options.depthOfCut || 3.0,
          stepover: options.stepover || 50
        },
        toolType: 'endmill',
        estimatedTime: 0
      });

      // Rest machining
      sequence.push({
        operation: 'restMachining',
        strategy: '5axisRestMachining',
        parameters: {
          referenceTool: 'previousOperation',
          stockAllowance: options.semifinishAllowance || 0.2
        },
        toolType: 'ballnose',
        estimatedTime: 0
      });

      // Hub finishing
      if (feature.hub) {
        sequence.push({
          operation: 'hubFinishing',
          strategy: '5axisContour',
          parameters: {
            allowance: 0,
            stepover: options.finishStepover || 0.5
          },
          toolType: 'ballnose',
          estimatedTime: 0
        });
      }
      // Blade finishing
      sequence.push({
        operation: 'bladeFinishing',
        strategy: '5axisSwarf',
        parameters: {
          allowance: 0,
          stepdown: options.finishStepdown || 0.3
        },
        toolType: 'tapered_ballnose',
        estimatedTime: 0
      });

      // Edge finishing
      sequence.push({
        operation: 'edgeFinishing',
        strategy: '5axisContour',
        parameters: {
          blendRadius: options.edgeRadius || 0.2
        },
        toolType: 'ballnose_small',
        estimatedTime: 0
      });
    }
    return sequence;
  },
  _findLeadingEdge: function(edges, bladeSurfaces) {
    // Leading edge typically has smallest radius curvature
    return edges.find(e => e.minRadius < 1.0 && e.isSharp);
  },
  _findTrailingEdge: function(edges, bladeSurfaces) {
    // Trailing edge typically opposite to leading edge
    return edges.find(e => e.minRadius < 2.0 && !e.isLeadingEdge);
  },
  _findBottomPlane: function(surfaces) {
    return surfaces.find(s => s.isFlat && s.normalZ < -0.9);
  },
  _findHubCurve: function(edges, bottomPlane) {
    if (!bottomPlane) return null;
    return edges.find(e => e.adjacentTo(bottomPlane) && e.isCurved);
  },
  _detectRotationalSymmetry: function(model) {
    // Simplified symmetry detection
    const boundingBox = model.getBoundingBox();
    const center = { x: (boundingBox.min.x + boundingBox.max.x) / 2,
                     y: (boundingBox.min.y + boundingBox.max.y) / 2,
                     z: 0 };

    // Try different blade counts
    for (let count of [5, 6, 7, 8, 9, 10, 11, 12]) {
      const angle = 360 / count;
      if (this._checkSymmetry(model, center, angle)) {
        return { found: true, count: count, axis: { x: 0, y: 0, z: 1 } };
      }
    }
    return { found: false };
  },
  _checkSymmetry: function(model, center, angle) {
    // Simplified check - would need actual geometry comparison in production
    return true;
  },
  _findHubSurface: function(model) {
    const surfaces = model.getSurfaces();
    return surfaces.find(s => s.isRevolution && s.axisZ);
  }
};
// 4. LINKING_JOB_ORCHESTRATOR
// Based on HyperMill Linking Job functionality

const LINKING_JOB_ORCHESTRATOR = {
  version: '1.0.0',
  name: 'PRISM Linking Job Orchestrator',

  // LINKING JOB CONFIGURATION
  config: {
    description: 'Combine multiple jobs with optimized collision-free linking',

    advantages: [
      'Shortened machining times',
      'Complex machining tasks in single setup',
      'Improved product flexibility',
      'Collision-free rapid movements'
    ],

    supportedOperations: [
      '3D operations',
      '5X operations',
      'Drilling operations',
      'Profile operations'
    ]
  },
  // CLEARANCE SETTINGS
  clearanceSettings: {
    milling: {
      clearanceRadiusX: { description: 'Radius for X rapid movements', unit: 'mm' },
      clearancePlaneZ: { description: 'Plane for Z rapid movements', unit: 'mm' },
      clearanceDistance: { description: 'Distance from workpiece during linking', unit: 'mm' }
    },
    turning: {
      clearanceRadiusX: { description: 'Radius for X rapid movements', unit: 'mm' },
      clearancePlaneZ: { description: 'Plane for Z rapid movements', unit: 'mm' },
      clearanceDistance: { description: 'Distance in X during linking', unit: 'mm' }
    }
  },
  // RETRACT MODES
  retractModes: {
    clearanceDistance: {
      description: 'Retract/infeed via clearance distance',
      note: 'Start/end positions displaced in Z for collision-free linear infeed'
    },
    clearancePlane: {
      description: 'Retract/infeed via clearance plane'
    }
  },
  // LINKING MODES
  linkingModes: {
    direct: {
      description: 'Direct linear link between jobs',
      collisionCheck: true
    },
    g1Link: {
      description: 'G1 movements between jobs close to surface',
      parameters: {
        minG0Distance: {
          description: 'Distance that can be traversed without tool contact',
          type: 'number',
          unit: 'mm'
        }
      }
    },
    fiveAxisOptimized: {
      description: 'Optimized 5-axis linking with smooth orientation changes',
      features: {
        rapidSmoothing: true,
        poleAvoidance: true,
        smoothFactor: { type: 'number', default: 0.5 }
      }
    }
  },
  // STOCK COLLISION CHECKING
  stockCollision: {
    enableStock: {
      description: 'Use stock model for collision checking',
      note: 'Ensures rapid links cannot collide with stock'
    },
    checkOptions: {
      toolAgainstStock: true,
      holderAgainstStock: true,
      g0StockCollision: true
    }
  },
  // TRANSFORMATION SUPPORT
  transformation: {
    description: 'Execute transformation with collision-checked linking',
    outputType: '5-axis compatible NC file',
    features: {
      calculateLinkingJob: true,
      collisionFreeRapids: true,
      allCopiesLinked: true
    }
  },
  // METHODS

  createLinkingJob: function(jobs, options = {}) {
    const linkingJob = {
      id: this._generateId(),
      name: options.name || 'Linking Job',
      jobs: [],
      linkingMovements: [],
      collisionResults: [],
      totalTime: 0
    };
    // Validate jobs can be linked
    for (const job of jobs) {
      if (!this._canBeLinked(job)) {
        throw new Error(`Job ${job.name} cannot be included in linking job`);
      }
      linkingJob.jobs.push(job);
    }
    // Calculate linking movements
    for (let i = 0; i < jobs.length - 1; i++) {
      const link = this._calculateLink(jobs[i], jobs[i + 1], options);
      linkingJob.linkingMovements.push(link);
    }
    // Check collisions
    linkingJob.collisionResults = this._checkAllCollisions(linkingJob, options);

    // Calculate total time
    linkingJob.totalTime = this._calculateTotalTime(linkingJob);

    return linkingJob;
  },
  optimizeLinkingJob: function(linkingJob, options = {}) {
    const optimized = { ...linkingJob };

    // Reorder jobs for minimal travel
    if (options.reorderJobs !== false) {
      optimized.jobs = this._optimizeJobOrder(linkingJob.jobs);
    }
    // Recalculate links
    optimized.linkingMovements = [];
    for (let i = 0; i < optimized.jobs.length - 1; i++) {
      const link = this._calculateLink(
        optimized.jobs[i],
        optimized.jobs[i + 1],
        { ...options, optimized: true }
      );
      optimized.linkingMovements.push(link);
    }
    // Apply rapid smoothing for 5-axis
    if (options.rapidSmoothing !== false) {
      optimized.linkingMovements = optimized.linkingMovements.map(link =>
        this._smoothRapidMovement(link, options.smoothFactor || 0.5)
      );
    }
    // Recalculate collision check
    optimized.collisionResults = this._checkAllCollisions(optimized, options);

    // Update total time
    optimized.totalTime = this._calculateTotalTime(optimized);

    return optimized;
  },
  generateLinkingGCode: function(linkingJob, postProcessor) {
    const gcode = [];

    gcode.push('(LINKING JOB START)');
    gcode.push(`(Jobs: ${linkingJob.jobs.length})`);
    gcode.push(`(Estimated time: ${this._formatTime(linkingJob.totalTime)})`);
    gcode.push('');

    for (let i = 0; i < linkingJob.jobs.length; i++) {
      const job = linkingJob.jobs[i];

      gcode.push(`(===== JOB ${i + 1}: ${job.name} =====)`);

      // Add job toolpath
      if (job.gcode) {
        gcode.push(job.gcode);
      }
      // Add linking movement to next job
      if (i < linkingJob.linkingMovements.length) {
        const link = linkingJob.linkingMovements[i];
        gcode.push('');
        gcode.push('(LINKING MOVEMENT)');
        gcode.push(...this._generateLinkGCode(link, postProcessor));
        gcode.push('');
      }
    }
    gcode.push('(LINKING JOB END)');

    return gcode.join('\n');
  },
  _generateId: function() {
    return 'LJ_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },
  _canBeLinked: function(job) {
    const supportedTypes = ['3d', '5x', 'drilling', 'profile', 'roughing', 'finishing'];
    return supportedTypes.includes(job.type?.toLowerCase());
  },
  _calculateLink: function(fromJob, toJob, options) {
    const startPoint = fromJob.endPoint || fromJob.lastPoint;
    const endPoint = toJob.startPoint || toJob.firstPoint;

    const link = {
      from: startPoint,
      to: endPoint,
      type: 'rapid',
      path: [],
      distance: 0,
      time: 0
    };
    // Calculate clearance path
    const clearanceZ = options.clearancePlaneZ || Math.max(startPoint.z, endPoint.z) + 20;

    if (options.linkingMode === 'direct') {
      link.path = [startPoint, endPoint];
    } else {
      // Standard clearance plane approach
      link.path = [
        startPoint,
        { ...startPoint, z: clearanceZ },
        { ...endPoint, z: clearanceZ },
        endPoint
      ];
    }
    // Calculate distance
    for (let i = 1; i < link.path.length; i++) {
      link.distance += this._distance3D(link.path[i-1], link.path[i]);
    }
    // Estimate time (assuming 10000 mm/min rapid)
    link.time = link.distance / 10000 * 60; // in seconds

    return link;
  },
  _distance3D: function(p1, p2) {
    return Math.sqrt(
      Math.pow(p2.x - p1.x, 2) +
      Math.pow(p2.y - p1.y, 2) +
      Math.pow(p2.z - p1.z, 2)
    );
  },
  _optimizeJobOrder: function(jobs) {
    if (jobs.length <= 2) return jobs;

    // Simple nearest-neighbor optimization
    const optimized = [jobs[0]];
    const remaining = jobs.slice(1);

    while (remaining.length > 0) {
      const lastJob = optimized[optimized.length - 1];
      const lastPoint = lastJob.endPoint || lastJob.lastPoint || { x: 0, y: 0, z: 0 };

      let nearestIdx = 0;
      let nearestDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const startPoint = remaining[i].startPoint || remaining[i].firstPoint || { x: 0, y: 0, z: 0 };
        const dist = this._distance3D(lastPoint, startPoint);

        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }
      optimized.push(remaining.splice(nearestIdx, 1)[0]);
    }
    return optimized;
  },
  _smoothRapidMovement: function(link, smoothFactor) {
    if (link.path.length < 4) return link;

    const smoothed = { ...link, path: [] };

    // Add smooth transitions at corners
    for (let i = 0; i < link.path.length; i++) {
      if (i === 0 || i === link.path.length - 1) {
        smoothed.path.push(link.path[i]);
      } else {
        // Add blend points
        const prev = link.path[i - 1];
        const curr = link.path[i];
        const next = link.path[i + 1];

        const blendDist = smoothFactor * 5; // mm

        const dir1 = this._normalize(this._subtract(curr, prev));
        const dir2 = this._normalize(this._subtract(next, curr));

        smoothed.path.push({
          x: curr.x - dir1.x * blendDist,
          y: curr.y - dir1.y * blendDist,
          z: curr.z - dir1.z * blendDist
        });

        smoothed.path.push(curr);

        smoothed.path.push({
          x: curr.x + dir2.x * blendDist,
          y: curr.y + dir2.y * blendDist,
          z: curr.z + dir2.z * blendDist
        });
      }
    }
    return smoothed;
  },
  _normalize: function(v) {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  },
  _subtract: function(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  },
  _checkAllCollisions: function(linkingJob, options) {
    const results = [];

    for (const link of linkingJob.linkingMovements) {
      const collisionCheck = {
        link: link,
        hasCollision: false,
        collisionPoints: [],
        nearMisses: []
      };
      // Check each segment of the link
      for (let i = 1; i < link.path.length; i++) {
        const segment = { start: link.path[i-1], end: link.path[i] };

        // Would integrate with PRISM_COLLISION_DETECTION_V2 here
        // For now, simple bounding box check
        if (options.stockModel) {
          const collision = this._checkSegmentCollision(segment, options.stockModel);
          if (collision.hasCollision) {
            collisionCheck.hasCollision = true;
            collisionCheck.collisionPoints.push(...collision.points);
          }
        }
      }
      results.push(collisionCheck);
    }
    return results;
  },
  _checkSegmentCollision: function(segment, stockModel) {
    // Simplified collision check - would use actual geometry in production
    return { hasCollision: false, points: [] };
  },
  _calculateTotalTime: function(linkingJob) {
    let total = 0;

    // Job machining times
    for (const job of linkingJob.jobs) {
      total += job.estimatedTime || 0;
    }
    // Linking movement times
    for (const link of linkingJob.linkingMovements) {
      total += link.time || 0;
    }
    return total;
  },
  _formatTime: function(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);

    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  },
  _generateLinkGCode: function(link, postProcessor) {
    const gcode = [];

    for (let i = 0; i < link.path.length; i++) {
      const pt = link.path[i];

      if (i === 0) {
        gcode.push(`G0 X${pt.x.toFixed(4)} Y${pt.y.toFixed(4)} Z${pt.z.toFixed(4)}`);
      } else {
        gcode.push(`G0 X${pt.x.toFixed(4)} Y${pt.y.toFixed(4)} Z${pt.z.toFixed(4)}`);
      }
    }
    return gcode;
  }
};
// 5. BARREL_CUTTER_OPTIMIZATION_ENGINE
// Based on HyperCAD-S barrel cutter analysis

const BARREL_CUTTER_OPTIMIZATION_ENGINE = {
  version: '1.0.0',
  name: 'PRISM Barrel Cutter Optimization Engine',

  // BARREL CUTTER TYPES
  cutterTypes: {
    general: {
      name: 'General Barrel Tool',
      description: 'Standard barrel geometry',
      parameters: {
        barrelRadius: { type: 'number', unit: 'mm', required: true },
        tipRadius: { type: 'number', unit: 'mm', default: 0 },
        taperAngle: { type: 'number', unit: 'deg', default: 0 },
        cutterLength: { type: 'number', unit: 'mm', required: true }
      }
    },
    tangent: {
      name: 'Tangent Barrel Tool',
      description: 'Barrel tangent to shaft',
      parameters: {
        barrelRadius: { type: 'number', unit: 'mm', required: true },
        shaftDiameter: { type: 'number', unit: 'mm', required: true },
        cutterLength: { type: 'number', unit: 'mm', required: true }
      },
      applications: ['Wall finishing', 'Deep pockets', 'Aircraft ribs']
    },
    conical: {
      name: 'Conical Barrel Tool',
      description: 'Barrel with conical transition',
      parameters: {
        barrelRadius: { type: 'number', unit: 'mm', required: true },
        coneAngle: { type: 'number', unit: 'deg', required: true },
        tipRadius: { type: 'number', unit: 'mm', default: 0 }
      }
    }
  },
  // SWARF CUTTING ANALYSIS
  swarfAnalysis: {
    description: 'Analysis for barrel cutter swarf cutting capability',

    checkParameters: {
      barrelRadius: 'Must match or be smaller than surface curvature',
      machiningDirection: 'Along U, V, or custom angle',
      leadAngle: 'Inclination of tool against surface'
    },
    curvatureAnalysis: {
      principal1: 'First principal curvature radius',
      principal2: 'Second principal curvature radius',
      minRadius: 'Minimum radius on surface',
      angle: 'Direction for analysis (0° = U, 90° = V)'
    }
  },
  // METHODS

  analyzeSurfaceForBarrel: function(surface, barrelCutter) {
    const analysis = {
      surface: surface.id,
      cutter: barrelCutter,
      feasible: false,
      recommendations: [],
      optimalParameters: {}
    };
    // Get surface curvature at sample points
    const samplePoints = this._sampleSurfacePoints(surface, 10, 10);
    const curvatures = samplePoints.map(pt => this._getCurvatureAt(surface, pt));

    // Find minimum curvature radius
    const minCurvature = Math.min(...curvatures.map(c => Math.min(c.r1, c.r2)));

    // Check if barrel radius is suitable
    if (barrelCutter.barrelRadius <= minCurvature) {
      analysis.feasible = true;
      analysis.recommendations.push('Barrel radius is suitable for surface curvature');
    } else {
      analysis.feasible = false;
      analysis.recommendations.push(
        `Barrel radius ${barrelCutter.barrelRadius}mm exceeds minimum surface radius ${minCurvature.toFixed(2)}mm`
      );
      analysis.recommendations.push(
        `Consider using a barrel with radius <= ${(minCurvature * 0.9).toFixed(2)}mm`
      );
    }
    // Find optimal machining direction
    const optimalDirection = this._findOptimalMachiningDirection(surface, curvatures);
    analysis.optimalParameters.direction = optimalDirection;

    // Calculate optimal lead angle
    const optimalLead = this._calculateOptimalLeadAngle(surface, barrelCutter);
    analysis.optimalParameters.leadAngle = optimalLead;

    // Calculate achievable stepover
    const stepover = this._calculateBarrelStepover(barrelCutter, optimalLead);
    analysis.optimalParameters.stepover = stepover;
    analysis.recommendations.push(
      `Achievable stepover: ${stepover.toFixed(2)}mm (${(stepover / barrelCutter.barrelRadius * 100).toFixed(1)}% of barrel radius)`
    );

    return analysis;
  },
  selectOptimalBarrelCutter: function(surface, availableCutters) {
    const results = availableCutters.map(cutter => {
      const analysis = this.analyzeSurfaceForBarrel(surface, cutter);
      return {
        cutter: cutter,
        analysis: analysis,
        score: this._calculateCutterScore(analysis)
      };
    });

    // Sort by score (higher is better)
    results.sort((a, b) => b.score - a.score);

    return {
      recommended: results[0],
      alternatives: results.slice(1, 3),
      all: results
    };
  },
  calculateToolpath: function(surface, barrelCutter, options = {}) {
    const analysis = this.analyzeSurfaceForBarrel(surface, barrelCutter);

    if (!analysis.feasible) {
      return { error: 'Surface not suitable for selected barrel cutter', analysis };
    }
    const toolpath = {
      cutter: barrelCutter,
      points: [],
      totalLength: 0,
      estimatedTime: 0
    };
    const direction = options.direction || analysis.optimalParameters.direction;
    const leadAngle = options.leadAngle || analysis.optimalParameters.leadAngle;
    const stepover = options.stepover || analysis.optimalParameters.stepover;

    // Generate toolpath points
    const passes = this._generateBarrelPasses(surface, direction, stepover);

    for (const pass of passes) {
      for (const point of pass.points) {
        const toolPosition = this._calculateToolPosition(
          point,
          surface,
          barrelCutter,
          leadAngle
        );
        toolpath.points.push(toolPosition);
      }
      toolpath.totalLength += pass.length;
    }
    // Estimate time
    const feedrate = options.feedrate || 1000; // mm/min
    toolpath.estimatedTime = toolpath.totalLength / feedrate * 60; // seconds

    return toolpath;
  },
  _sampleSurfacePoints: function(surface, uSamples, vSamples) {
    const points = [];

    for (let i = 0; i <= uSamples; i++) {
      for (let j = 0; j <= vSamples; j++) {
        const u = i / uSamples;
        const v = j / vSamples;
        points.push({ u, v });
      }
    }
    return points;
  },
  _getCurvatureAt: function(surface, uvPoint) {
    // Simplified curvature calculation
    // In production, would use actual surface derivatives
    return {
      r1: 50 + Math.random() * 100, // First principal radius
      r2: 100 + Math.random() * 200, // Second principal radius
      angle: Math.random() * 180 // Principal direction
    };
  },
  _findOptimalMachiningDirection: function(surface, curvatures) {
    // Find direction that provides most consistent curvature
    let minVariance = Infinity;
    let optimalAngle = 0;

    for (let angle = 0; angle < 180; angle += 15) {
      const curvesAtAngle = curvatures.map(c => {
        const rad = angle * Math.PI / 180;
        return c.r1 * Math.cos(rad) + c.r2 * Math.sin(rad);
      });

      const mean = curvesAtAngle.reduce((a, b) => a + b) / curvesAtAngle.length;
      const variance = curvesAtAngle.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / curvesAtAngle.length;

      if (variance < minVariance) {
        minVariance = variance;
        optimalAngle = angle;
      }
    }
    return optimalAngle;
  },
  _calculateOptimalLeadAngle: function(surface, barrelCutter) {
    // Lead angle typically 5-15 degrees for barrel cutters
    // Larger barrel = smaller lead angle needed
    const baseAngle = 10;
    const radiusFactor = Math.min(barrelCutter.barrelRadius / 50, 1);

    return baseAngle * (1 - radiusFactor * 0.3);
  },
  _calculateBarrelStepover: function(barrelCutter, leadAngle) {
    // Stepover depends on barrel radius and lead angle
    const effectiveRadius = barrelCutter.barrelRadius * Math.cos(leadAngle * Math.PI / 180);
    const scallop = 0.005; // Target scallop height

    // Scallop height formula: h = r - sqrt(r^2 - (ae/2)^2)
    // Solving for ae: ae = 2 * sqrt(2*r*h - h^2)
    const stepover = 2 * Math.sqrt(2 * effectiveRadius * scallop - scallop * scallop);

    return stepover;
  },
  _calculateCutterScore: function(analysis) {
    let score = 0;

    if (analysis.feasible) {
      score += 50;
    }
    // Higher stepover = better efficiency
    if (analysis.optimalParameters.stepover) {
      score += analysis.optimalParameters.stepover * 5;
    }
    // Smaller lead angle = better surface quality
    if (analysis.optimalParameters.leadAngle) {
      score += (15 - analysis.optimalParameters.leadAngle) * 2;
    }
    return score;
  },
  _generateBarrelPasses: function(surface, direction, stepover) {
    const passes = [];
    const numPasses = Math.ceil(100 / stepover); // Simplified

    for (let i = 0; i < numPasses; i++) {
      const pass = {
        index: i,
        offset: i * stepover,
        points: [],
        length: 0
      };
      // Generate points along pass
      const numPoints = 50;
      for (let j = 0; j < numPoints; j++) {
        pass.points.push({
          x: j * 2,
          y: i * stepover,
          z: 0 // Would be calculated from surface
        });
      }
      pass.length = (numPoints - 1) * 2;
      passes.push(pass);
    }
    return passes;
  },
  _calculateToolPosition: function(point, surface, cutter, leadAngle) {
    // Calculate tool center position for contact point
    const normal = { x: 0, y: 0, z: 1 }; // Simplified - would get from surface
    const leadRad = leadAngle * Math.PI / 180;

    return {
      x: point.x,
      y: point.y,
      z: point.z + cutter.barrelRadius * Math.cos(leadRad),
      i: Math.sin(leadRad),
      j: 0,
      k: Math.cos(leadRad)
    };
  }
};
// WINDOW REGISTRATION

if (typeof window !== 'undefined') {
  window.ADVANCED_5AXIS_STRATEGY_DATABASE = ADVANCED_5AXIS_STRATEGY_DATABASE;
  window.APPROACH_RETRACT_MACRO_DATABASE = APPROACH_RETRACT_MACRO_DATABASE;
  window.TURBOMACHINERY_FEATURE_ENGINE = TURBOMACHINERY_FEATURE_ENGINE;
  window.LINKING_JOB_ORCHESTRATOR = LINKING_JOB_ORCHESTRATOR;
  window.BARREL_CUTTER_OPTIMIZATION_ENGINE = BARREL_CUTTER_OPTIMIZATION_ENGINE;

// BATCH 4 INTEGRATION - v8.9.290
// Integrated: 2026-01-09 15:53:39

// PRISM IMPROVEMENTS BATCH 4 - v8.9.290
// Building on v8.9.290
// BATCH 4 CONTENTS:
// 1. PROBING_CYCLE_DATABASE - Comprehensive probing cycles
// 2. TOOL_LIFE_MANAGEMENT_ENGINE - Tool life tracking and prediction
// 3. COORDINATE_SYSTEM_ENGINE - Work coordinate system management
// 4. COMPENSATION_ENGINE_V2 - Enhanced wear and radius compensation
// 5. SPINDLE_LOAD_MONITOR_ENGINE - Spindle load monitoring

// 1. PROBING_CYCLE_DATABASE
// Based on Haas, Siemens, Hurco, and Renishaw probing cycles

const PROBING_CYCLE_DATABASE = {
  version: '1.0.0',
  name: 'PRISM Probing Cycle Database',

  // PROBE TYPES
  probeTypes: {
    workProbe: {
      description: 'Spindle-mounted touch probe for workpiece measurement',
      activation: {
        haas: ['M69 P2', 'M59 P3'],
        fanuc: ['M19', 'M26'],
        siemens: ['SETPIECE'],
        hurco: ['G31']
      },
      deactivation: {
        haas: ['M69 P3'],
        fanuc: ['M27'],
        siemens: [''],
        hurco: ['']
      },
      calibration: {
        required: true,
        parameters: ['stylus_diameter', 'stylus_length', 'pre_travel']
      }
    },
    toolProbe: {
      description: 'Table-mounted probe for tool measurement',
      activation: {
        haas: ['M59 P2', 'M59 P3'],
        fanuc: ['M19', 'M26'],
        siemens: [''],
        hurco: ['G31']
      },
      calibration: {
        required: true,
        parameters: ['probe_height', 'probe_position_x', 'probe_position_y']
      }
    },
    laserProbe: {
      description: 'Non-contact laser tool measurement',
      activation: {
        haas: ['M47', 'M49'],
        siemens: [''],
        hurco: ['M47', 'M49']
      },
      capabilities: ['high_speed_measurement', 'rotating_tool_measurement', 'breakage_detection']
    }
  },
  // WORKPIECE PROBING CYCLES
  workpieceCycles: {
    // Edge/Surface Measurement
    measureEdge: {
      name: 'Measure Edge',
      description: 'Find single edge position',
      siemens: 'CYCLE978',
      haas: 'G65 P9811',
      hurco: 'G31',
      parameters: {
        axis: { options: ['X+', 'X-', 'Y+', 'Y-', 'Z-'], required: true },
        feedrate: { type: 'number', default: 100, unit: 'mm/min' },
        clearance: { type: 'number', default: 5.0, unit: 'mm' },
        expectedPosition: { type: 'number', unit: 'mm' },
        tolerance: { type: 'number', default: 0.1, unit: 'mm' }
      },
      outputs: ['measured_position', 'deviation', 'status']
    },
    measureCorner: {
      name: 'Measure Corner',
      description: 'Find corner position in XY plane',
      siemens: 'CYCLE961',
      haas: 'G65 P9812',
      parameters: {
        cornerType: { options: ['UR', 'UL', 'LR', 'LL'], required: true },
        approachDistance: { type: 'number', default: 10.0, unit: 'mm' },
        feedrate: { type: 'number', default: 100, unit: 'mm/min' },
        zDepth: { type: 'number', required: true, unit: 'mm' }
      },
      outputs: ['corner_x', 'corner_y', 'status']
    },
    measurePocket: {
      name: 'Measure Pocket/Hole',
      description: 'Find center and diameter of pocket or hole',
      siemens: 'CYCLE977',
      haas: 'G65 P9814',
      parameters: {
        expectedDiameter: { type: 'number', required: true, unit: 'mm' },
        zDepth: { type: 'number', required: true, unit: 'mm' },
        feedrate: { type: 'number', default: 100, unit: 'mm/min' },
        measureMethod: { options: ['4point', '3point'], default: '4point' }
      },
      outputs: ['center_x', 'center_y', 'measured_diameter', 'roundness', 'status']
    },
    measureBoss: {
      name: 'Measure Boss/Spigot',
      description: 'Find center and diameter of boss',
      siemens: 'CYCLE977',
      haas: 'G65 P9815',
      parameters: {
        expectedDiameter: { type: 'number', required: true, unit: 'mm' },
        zHeight: { type: 'number', required: true, unit: 'mm' },
        feedrate: { type: 'number', default: 100, unit: 'mm/min' },
        measureMethod: { options: ['4point', '3point'], default: '4point' }
      },
      outputs: ['center_x', 'center_y', 'measured_diameter', 'roundness', 'status']
    },
    measureWebSlot: {
      name: 'Measure Web/Slot',
      description: 'Find center and width of web or slot',
      siemens: 'CYCLE977',
      haas: 'G65 P9816',
      parameters: {
        axis: { options: ['X', 'Y'], required: true },
        expectedWidth: { type: 'number', required: true, unit: 'mm' },
        zDepth: { type: 'number', required: true, unit: 'mm' },
        feedrate: { type: 'number', default: 100, unit: 'mm/min' }
      },
      outputs: ['center_position', 'measured_width', 'status']
    },
    // Plane/Surface Alignment
    alignPlane: {
      name: 'Align Plane',
      description: 'Measure and align to tilted plane using 3 points',
      siemens: 'CYCLE998',
      haas: 'G65 P9843',
      parameters: {
        point1: { type: 'position', required: true },
        point2: { type: 'position', required: true },
        point3: { type: 'position', required: true },
        feedrate: { type: 'number', default: 100, unit: 'mm/min' },
        workOffset: { type: 'string', default: 'G54' }
      },
      outputs: ['angle_a', 'angle_b', 'plane_normal', 'status'],
      capabilities: ['automatic_axis_rotation', 'coordinate_rotation']
    },
    measureAngle: {
      name: 'Measure Angle',
      description: 'Measure angle of surface relative to axis',
      siemens: 'CYCLE998',
      haas: 'G65 P9843',
      parameters: {
        startPoint: { type: 'position', required: true },
        measureDistance: { type: 'number', default: 50, unit: 'mm' },
        axis: { options: ['X', 'Y'], required: true },
        feedrate: { type: 'number', default: 100, unit: 'mm/min' }
      },
      outputs: ['measured_angle', 'skew_angle', 'status']
    },
    // Height/Depth Measurement
    measureZSurface: {
      name: 'Measure Z Surface',
      description: 'Measure Z height at specified XY position',
      siemens: 'CYCLE978',
      haas: 'G65 P9810',
      parameters: {
        xPosition: { type: 'number', required: true, unit: 'mm' },
        yPosition: { type: 'number', required: true, unit: 'mm' },
        expectedZ: { type: 'number', unit: 'mm' },
        feedrate: { type: 'number', default: 100, unit: 'mm/min' }
      },
      outputs: ['measured_z', 'deviation', 'status']
    },
    // Feature Verification
    verifyFeature: {
      name: 'Verify Feature',
      description: 'Check feature against tolerances',
      parameters: {
        featureType: { options: ['hole', 'boss', 'pocket', 'slot', 'surface'], required: true },
        nominal: { type: 'number', required: true, unit: 'mm' },
        upperTolerance: { type: 'number', required: true, unit: 'mm' },
        lowerTolerance: { type: 'number', required: true, unit: 'mm' },
        updateOffset: { type: 'boolean', default: false }
      },
      outputs: ['measured_value', 'in_tolerance', 'deviation', 'offset_update']
    }
  },
  // TOOL PROBING CYCLES
  toolCycles: {
    measureLength: {
      name: 'Measure Tool Length',
      description: 'Measure tool length using table probe',
      siemens: 'CYCLE982',
      haas: 'G65 P9851',
      parameters: {
        toolNumber: { type: 'integer', required: true },
        spindle: { options: ['rotating', 'non_rotating'], default: 'rotating' },
        updateOffset: { type: 'boolean', default: true },
        feedrate: { type: 'number', default: 500, unit: 'mm/min' }
      },
      outputs: ['measured_length', 'offset_updated', 'status']
    },
    measureDiameter: {
      name: 'Measure Tool Diameter',
      description: 'Measure tool diameter using table probe',
      siemens: 'CYCLE982',
      haas: 'G65 P9852',
      parameters: {
        toolNumber: { type: 'integer', required: true },
        spindle: { options: ['rotating', 'non_rotating'], default: 'rotating' },
        edgeMeasureHeight: { type: 'number', default: 0, unit: 'mm' },
        updateOffset: { type: 'boolean', default: true }
      },
      outputs: ['measured_diameter', 'offset_updated', 'status']
    },
    measureLengthAndDiameter: {
      name: 'Measure Tool Length and Diameter',
      description: 'Combined length and diameter measurement',
      siemens: 'CYCLE982',
      haas: 'G65 P9853',
      parameters: {
        toolNumber: { type: 'integer', required: true },
        spindle: { options: ['rotating', 'non_rotating'], default: 'rotating' },
        updateOffsets: { type: 'boolean', default: true }
      },
      outputs: ['measured_length', 'measured_diameter', 'offsets_updated', 'status']
    },
    checkBreakage: {
      name: 'Check Tool Breakage',
      description: 'Quick check for broken tool',
      siemens: 'CYCLE982',
      haas: 'G65 P9854',
      parameters: {
        toolNumber: { type: 'integer', required: true },
        tolerance: { type: 'number', default: 1.0, unit: 'mm' },
        alarmOnBreak: { type: 'boolean', default: true }
      },
      outputs: ['tool_ok', 'length_difference', 'status']
    },
    monitorWear: {
      name: 'Monitor Tool Wear',
      description: 'Track tool wear over time',
      parameters: {
        toolNumber: { type: 'integer', required: true },
        wearLimit: { type: 'number', unit: 'mm' },
        autoCompensate: { type: 'boolean', default: true },
        alarmAtLimit: { type: 'boolean', default: true }
      },
      outputs: ['current_wear', 'remaining_life', 'compensation_applied', 'status']
    }
  },
  // TWO-TOUCH PROBING
  twoTouchProbing: {
    description: 'Automatic two-touch probing for higher accuracy',
    activation: {
      haas: 'M42',
      hurco: 'M42'
    },
    deactivation: {
      haas: 'M41',
      hurco: 'M41'
    },
    behavior: 'First touch at normal feedrate, backup, second touch at reduced feedrate',
    benefit: 'Higher accuracy measurement by eliminating pre-travel error'
  },
  // METHODS

  generateProbingGCode: function(cycle, params, controller) {
    const cycleData = this.workpieceCycles[cycle] || this.toolCycles[cycle];
    if (!cycleData) {
      throw new Error(`Unknown probing cycle: ${cycle}`);
    }
    const gcode = [];
    const controllerCode = cycleData[controller.toLowerCase()] || cycleData.haas;

    // Add probe activation
    const probeType = cycle.startsWith('measure') && cycle !== 'measureLength' && cycle !== 'measureDiameter'
      ? 'workProbe' : 'toolProbe';
    const activation = this.probeTypes[probeType].activation[controller.toLowerCase()];
    if (activation) {
      gcode.push(...activation);
    }
    // Generate cycle-specific code
    switch (cycle) {
      case 'measureEdge':
        gcode.push(`${controllerCode} ${params.axis} F${params.feedrate}`);
        break;
      case 'measureCorner':
        gcode.push(`${controllerCode} D${params.approachDistance} Z${params.zDepth} F${params.feedrate}`);
        break;
      case 'measurePocket':
        gcode.push(`${controllerCode} D${params.expectedDiameter} Z${params.zDepth} F${params.feedrate}`);
        break;
      case 'measureLength':
        gcode.push(`${controllerCode} T${params.toolNumber} F${params.feedrate}`);
        break;
      case 'measureDiameter':
        gcode.push(`${controllerCode} T${params.toolNumber} H${params.edgeMeasureHeight} F${params.feedrate || 100}`);
        break;
    }
    // Add probe deactivation
    const deactivation = this.probeTypes[probeType].deactivation[controller.toLowerCase()];
    if (deactivation && deactivation[0]) {
      gcode.push(...deactivation);
    }
    return gcode.join('\n');
  },
  createProbingRoutine: function(operations, controller) {
    const routine = {
      gcode: [],
      estimatedTime: 0,
      operations: []
    };
    routine.gcode.push('(PROBING ROUTINE START)');
    routine.gcode.push('G90 G00'); // Absolute, rapid

    for (const op of operations) {
      const cycleCode = this.generateProbingGCode(op.cycle, op.params, controller);
      routine.gcode.push('');
      routine.gcode.push(`(${op.cycle.toUpperCase()})`);
      routine.gcode.push(cycleCode);
      routine.operations.push(op);
      routine.estimatedTime += this._estimateCycleTime(op.cycle);
    }
    routine.gcode.push('');
    routine.gcode.push('(PROBING ROUTINE END)');

    return routine;
  },
  _estimateCycleTime: function(cycle) {
    const times = {
      measureEdge: 5,
      measureCorner: 15,
      measurePocket: 20,
      measureBoss: 20,
      alignPlane: 30,
      measureLength: 10,
      measureDiameter: 15,
      checkBreakage: 5
    };
    return times[cycle] || 10;
  }
};
// 2. TOOL_LIFE_MANAGEMENT_ENGINE
// Based on Mazak, Brother SPEEDIO, and industry tool life standards

const TOOL_LIFE_MANAGEMENT_ENGINE = {
  version: '1.0.0',
  name: 'PRISM Tool Life Management Engine',

  // MANAGEMENT MODES
  managementModes: {
    byCount: {
      code: 1,
      description: 'Tool life managed by number of uses',
      unit: 'pieces',
      decrement: 'Per tool change or per cycle'
    },
    byTime: {
      code: 2,
      description: 'Tool life managed by cutting time',
      unit: 'minutes',
      decrement: 'Actual cutting time accumulated'
    },
    byDistance: {
      code: 3,
      description: 'Tool life managed by cutting distance',
      unit: 'mm',
      decrement: 'Actual cutting distance accumulated'
    },
    byVolume: {
      code: 4,
      description: 'Tool life managed by material volume removed',
      unit: 'mm³',
      decrement: 'Calculated from toolpath and DOC'
    }
  },
  // TOOL GROUP MANAGEMENT
  toolGroups: {
    description: 'Group identical tools for automatic replacement',
    maxGroupSize: 10,
    selectionMethod: {
      sequential: 'Use tools in order',
      leastUsed: 'Select tool with most remaining life',
      roundRobin: 'Rotate through tools evenly'
    }
  },
  // LIFE PREDICTION
  lifePrediction: {
    description: 'Predict remaining tool life based on usage patterns',
    methods: {
      linear: 'Simple linear projection',
      wearCurve: 'Based on Taylor tool life equation',
      mlBased: 'Machine learning prediction from historical data'
    },
    taylorEquation: {
      formula: 'VT^n = C',
      description: 'V = cutting speed, T = tool life, n = exponent, C = constant',
      typicalExponents: {
        hss: 0.125,
        carbide: 0.25,
        ceramic: 0.5,
        cbn: 0.6,
        pcd: 0.7
      }
    }
  },
  // WARNING SYSTEM
  warnings: {
    prediction: {
      alarmCode: '4286',
      description: 'Tool life previous notice - approaching end of life',
      threshold: 'Configurable percentage of total life'
    },
    noSpare: {
      alarmCode: '3277',
      description: 'Tool life management no spare tool',
      action: 'All tools in group are NG, change required'
    },
    toolNG: {
      alarmCode: '2436',
      description: 'Active tool NG',
      action: 'Cannot continue with current tool'
    }
  },
  // TOOL DATA STRUCTURE
  toolDataStructure: {
    toolNumber: { type: 'integer', required: true },
    groupNumber: { type: 'integer', default: 0 },
    managementMode: { type: 'integer', default: 1 },
    specifiedLife: { type: 'number', required: true },
    remainingLife: { type: 'number' },
    warningThreshold: { type: 'number', default: 10 },
    status: { options: ['OK', 'NG', 'WARNING'] },
    usageHistory: { type: 'array', items: 'usageRecord' },
    wearData: {
      lengthWear: { type: 'number', unit: 'mm' },
      radiusWear: { type: 'number', unit: 'mm' },
      lastMeasured: { type: 'datetime' }
    }
  },
  // ACTIVE TOOL DATA
  activeTools: new Map(),
  toolGroups: new Map(),

  // METHODS

  registerTool: function(toolData) {
    const tool = {
      ...toolData,
      remainingLife: toolData.specifiedLife,
      status: 'OK',
      usageHistory: [],
      wearData: { lengthWear: 0, radiusWear: 0, lastMeasured: null }
    };
    this.activeTools.set(tool.toolNumber, tool);

    // Add to group if specified
    if (tool.groupNumber > 0) {
      if (!this.toolGroups.has(tool.groupNumber)) {
        this.toolGroups.set(tool.groupNumber, []);
      }
      this.toolGroups.get(tool.groupNumber).push(tool.toolNumber);
    }
    return tool;
  },
  recordUsage: function(toolNumber, usage) {
    const tool = this.activeTools.get(toolNumber);
    if (!tool) {
      throw new Error(`Tool ${toolNumber} not registered`);
    }
    // Calculate decrement based on management mode
    let decrement = 0;
    switch (tool.managementMode) {
      case 1: // Count
        decrement = usage.count || 1;
        break;
      case 2: // Time
        decrement = usage.cuttingTime || 0;
        break;
      case 3: // Distance
        decrement = usage.cuttingDistance || 0;
        break;
      case 4: // Volume
        decrement = usage.materialVolume || 0;
        break;
    }
    tool.remainingLife -= decrement;

    // Record in history
    tool.usageHistory.push({
      timestamp: new Date(),
      decrement: decrement,
      remaining: tool.remainingLife,
      usage: usage
    });

    // Update status
    this._updateToolStatus(tool);

    return tool;
  },
  _updateToolStatus: function(tool) {
    const percentRemaining = (tool.remainingLife / tool.specifiedLife) * 100;

    if (tool.remainingLife <= 0) {
      tool.status = 'NG';
      this._raiseWarning('toolNG', tool);
    } else if (percentRemaining <= tool.warningThreshold) {
      tool.status = 'WARNING';
      this._raiseWarning('prediction', tool);
    } else {
      tool.status = 'OK';
    }
    // Check group status
    if (tool.groupNumber > 0) {
      this._checkGroupStatus(tool.groupNumber);
    }
  },
  _checkGroupStatus: function(groupNumber) {
    const group = this.toolGroups.get(groupNumber);
    if (!group) return;

    const okTools = group.filter(tn => {
      const t = this.activeTools.get(tn);
      return t && t.status === 'OK';
    });

    if (okTools.length === 0) {
      this._raiseWarning('noSpare', { groupNumber });
    }
  },
  _raiseWarning: function(type, data) {
    const warning = this.warnings[type];
    console.warn(`[TOOL LIFE] Alarm ${warning.alarmCode}: ${warning.description}`, data);
    // Would trigger actual alarm in production
  },
  getNextTool: function(groupNumber, method = 'leastUsed') {
    const group = this.toolGroups.get(groupNumber);
    if (!group || group.length === 0) return null;

    const okTools = group
      .map(tn => this.activeTools.get(tn))
      .filter(t => t && t.status !== 'NG');

    if (okTools.length === 0) return null;

    switch (method) {
      case 'sequential':
        return okTools[0].toolNumber;
      case 'leastUsed':
        return okTools.sort((a, b) => b.remainingLife - a.remainingLife)[0].toolNumber;
      case 'roundRobin':
        // Would track last used and rotate
        return okTools[0].toolNumber;
      default:
        return okTools[0].toolNumber;
    }
  },
  predictLife: function(toolNumber, method = 'linear') {
    const tool = this.activeTools.get(toolNumber);
    if (!tool) return null;

    if (tool.usageHistory.length < 2) {
      return {
        method: 'insufficient_data',
        estimatedRemaining: tool.remainingLife,
        confidence: 0.5
      };
    }
    switch (method) {
      case 'linear':
        return this._linearPrediction(tool);
      case 'wearCurve':
        return this._wearCurvePrediction(tool);
      default:
        return this._linearPrediction(tool);
    }
  },
  _linearPrediction: function(tool) {
    const history = tool.usageHistory;
    const avgDecrement = history.reduce((sum, h) => sum + h.decrement, 0) / history.length;

    const estimatedUsesRemaining = tool.remainingLife / avgDecrement;

    return {
      method: 'linear',
      estimatedUsesRemaining: Math.floor(estimatedUsesRemaining),
      avgUsagePerCycle: avgDecrement,
      confidence: Math.min(0.9, history.length / 10)
    };
  },
  _wearCurvePrediction: function(tool) {
    // Simplified Taylor equation prediction
    const n = 0.25; // Typical carbide exponent
    const currentUsage = tool.specifiedLife - tool.remainingLife;
    const usageRatio = currentUsage / tool.specifiedLife;

    // Wear accelerates as tool ages
    const wearFactor = Math.pow(1 - usageRatio, n);
    const adjustedRemaining = tool.remainingLife * wearFactor;

    return {
      method: 'wearCurve',
      estimatedRemaining: adjustedRemaining,
      wearFactor: wearFactor,
      confidence: 0.75
    };
  },
  resetTool: function(toolNumber, newLife = null) {
    const tool = this.activeTools.get(toolNumber);
    if (!tool) return null;

    tool.remainingLife = newLife || tool.specifiedLife;
    tool.status = 'OK';
    tool.wearData = { lengthWear: 0, radiusWear: 0, lastMeasured: new Date() };
    // Keep history for analysis

    return tool;
  },
  getToolReport: function(toolNumber) {
    const tool = this.activeTools.get(toolNumber);
    if (!tool) return null;

    const prediction = this.predictLife(toolNumber);

    return {
      toolNumber: tool.toolNumber,
      groupNumber: tool.groupNumber,
      status: tool.status,
      specifiedLife: tool.specifiedLife,
      remainingLife: tool.remainingLife,
      percentRemaining: (tool.remainingLife / tool.specifiedLife * 100).toFixed(1) + '%',
      totalUsages: tool.usageHistory.length,
      wearData: tool.wearData,
      prediction: prediction
    };
  }
};
// 3. COORDINATE_SYSTEM_ENGINE
// Based on G54-G59, extended offsets, and coordinate rotation

const COORDINATE_SYSTEM_ENGINE = {
  version: '1.0.0',
  name: 'PRISM Coordinate System Engine',

  // WORK OFFSET TYPES
  workOffsets: {
    standard: {
      G54: { index: 1, description: 'Standard work offset 1' },
      G55: { index: 2, description: 'Standard work offset 2' },
      G56: { index: 3, description: 'Standard work offset 3' },
      G57: { index: 4, description: 'Standard work offset 4' },
      G58: { index: 5, description: 'Standard work offset 5' },
      G59: { index: 6, description: 'Standard work offset 6' }
    },
    extended: {
      description: 'Extended work offsets G54.1 P1-P99',
      format: 'G54.1 P{n}',
      maxOffsets: 99,
      fanucFormat: 'G54.1 P{n}',
      haasFormat: 'G154 P{n}',
      siemensFormat: '$P_UIFR[{n}]'
    }
  },
  // COORDINATE SYSTEM COMPONENTS
  components: {
    machineCoordinate: {
      description: 'Absolute machine position (MCS)',
      command: 'G53',
      usage: 'Tool change positions, fixture reference'
    },
    workCoordinate: {
      description: 'Part program coordinate system (WCS)',
      commands: ['G54', 'G55', 'G56', 'G57', 'G58', 'G59'],
      usage: 'Part programming reference'
    },
    localCoordinate: {
      description: 'Temporary offset within WCS',
      command: 'G52',
      usage: 'Pattern repetition, feature location'
    },
    coordinateRotation: {
      description: 'Rotate XY plane',
      command: 'G68',
      cancel: 'G69',
      parameters: ['center_x', 'center_y', 'angle']
    }
  },
  // OFFSET DATA STRUCTURE
  offsetStructure: {
    position: {
      X: { type: 'number', unit: 'mm' },
      Y: { type: 'number', unit: 'mm' },
      Z: { type: 'number', unit: 'mm' },
      A: { type: 'number', unit: 'deg' },
      B: { type: 'number', unit: 'deg' },
      C: { type: 'number', unit: 'deg' }
    },
    rotation: {
      skewAngle: { type: 'number', unit: 'deg', description: 'XY plane rotation' }
    },
    probeData: {
      probeZ: { type: 'number', unit: 'mm', description: 'Z position from probing' },
      lastProbed: { type: 'datetime' }
    }
  },
  // ACTIVE OFFSETS
  activeOffsets: new Map(),
  currentOffset: 'G54',

  // METHODS

  initializeOffsets: function() {
    // Initialize standard offsets
    for (const [code, data] of Object.entries(this.workOffsets.standard)) {
      this.activeOffsets.set(code, {
        code: code,
        index: data.index,
        X: 0, Y: 0, Z: 0, A: 0, B: 0, C: 0,
        skewAngle: 0,
        probeZ: null,
        lastModified: null
      });
    }
    // Initialize extended offsets
    for (let i = 1; i <= 48; i++) {
      const code = `G54.1P${i}`;
      this.activeOffsets.set(code, {
        code: code,
        index: 6 + i,
        X: 0, Y: 0, Z: 0, A: 0, B: 0, C: 0,
        skewAngle: 0,
        probeZ: null,
        lastModified: null
      });
    }
  },
  setOffset: function(offsetCode, values) {
    let offset = this.activeOffsets.get(offsetCode);

    if (!offset) {
      // Create new extended offset
      offset = {
        code: offsetCode,
        X: 0, Y: 0, Z: 0, A: 0, B: 0, C: 0,
        skewAngle: 0,
        probeZ: null,
        lastModified: null
      };
      this.activeOffsets.set(offsetCode, offset);
    }
    // Update values
    for (const [key, value] of Object.entries(values)) {
      if (offset.hasOwnProperty(key)) {
        offset[key] = value;
      }
    }
    offset.lastModified = new Date();
    return offset;
  },
  getOffset: function(offsetCode) {
    return this.activeOffsets.get(offsetCode);
  },
  selectOffset: function(offsetCode) {
    if (!this.activeOffsets.has(offsetCode)) {
      throw new Error(`Work offset ${offsetCode} not found`);
    }
    this.currentOffset = offsetCode;
    return this.activeOffsets.get(offsetCode);
  },
  transformPoint: function(point, fromOffset, toOffset) {
    const from = this.activeOffsets.get(fromOffset);
    const to = this.activeOffsets.get(toOffset);

    if (!from || !to) {
      throw new Error('Invalid offset codes');
    }
    // Transform from 'from' offset to machine, then to 'to' offset
    const machinePoint = {
      X: point.X + from.X,
      Y: point.Y + from.Y,
      Z: point.Z + from.Z
    };
    // Apply rotation if present
    if (from.skewAngle !== 0) {
      const rotated = this._rotateXY(machinePoint, from.X, from.Y, from.skewAngle);
      machinePoint.X = rotated.X;
      machinePoint.Y = rotated.Y;
    }
    // Transform to target offset
    const transformedPoint = {
      X: machinePoint.X - to.X,
      Y: machinePoint.Y - to.Y,
      Z: machinePoint.Z - to.Z
    };
    // Apply inverse rotation if target has rotation
    if (to.skewAngle !== 0) {
      const rotated = this._rotateXY(transformedPoint, 0, 0, -to.skewAngle);
      transformedPoint.X = rotated.X;
      transformedPoint.Y = rotated.Y;
    }
    return transformedPoint;
  },
  _rotateXY: function(point, centerX, centerY, angleDeg) {
    const angleRad = angleDeg * Math.PI / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    const dx = point.X - centerX;
    const dy = point.Y - centerY;

    return {
      X: centerX + dx * cos - dy * sin,
      Y: centerY + dx * sin + dy * cos,
      Z: point.Z
    };
  },
  setFromProbing: function(offsetCode, probedValues) {
    const offset = this.activeOffsets.get(offsetCode);
    if (!offset) {
      throw new Error(`Offset ${offsetCode} not found`);
    }
    // Update from probed values
    if (probedValues.cornerX !== undefined) offset.X = probedValues.cornerX;
    if (probedValues.cornerY !== undefined) offset.Y = probedValues.cornerY;
    if (probedValues.surfaceZ !== undefined) {
      offset.Z = probedValues.surfaceZ;
      offset.probeZ = probedValues.surfaceZ;
    }
    if (probedValues.skewAngle !== undefined) offset.skewAngle = probedValues.skewAngle;

    offset.lastModified = new Date();
    return offset;
  },
  generateOffsetGCode: function(offsetCode, controller = 'fanuc') {
    const offset = this.activeOffsets.get(offsetCode);
    if (!offset) return '';

    const gcode = [];

    // Select work offset
    if (offsetCode.startsWith('G54.1')) {
      const pNum = offsetCode.replace('G54.1P', '');
      if (controller === 'haas') {
        gcode.push(`G154 P${pNum}`);
      } else {
        gcode.push(`G54.1 P${pNum}`);
      }
    } else {
      gcode.push(offsetCode);
    }
    // Apply rotation if needed
    if (offset.skewAngle !== 0) {
      gcode.push(`G68 X${offset.X} Y${offset.Y} R${offset.skewAngle}`);
    }
    return gcode.join('\n');
  },
  getOffsetReport: function() {
    const report = {
      currentOffset: this.currentOffset,
      offsets: []
    };
    for (const [code, offset] of this.activeOffsets) {
      if (offset.X !== 0 || offset.Y !== 0 || offset.Z !== 0) {
        report.offsets.push({
          code: code,
          X: offset.X.toFixed(4),
          Y: offset.Y.toFixed(4),
          Z: offset.Z.toFixed(4),
          skew: offset.skewAngle.toFixed(3),
          lastModified: offset.lastModified
        });
      }
    }
    return report;
  }
};
// 4. COMPENSATION_ENGINE_V2
// Enhanced cutter compensation and wear management

const COMPENSATION_ENGINE_V2 = {
  version: '3.0.0',
  name: 'PRISM Compensation Engine V2',

  // COMPENSATION TYPES
  compensationTypes: {
    toolLength: {
      command: 'G43',
      cancel: 'G49',
      register: 'H',
      description: 'Tool length compensation',
      components: {
        geometry: 'Base tool length',
        wear: 'Accumulated wear offset'
      }
    },
    cutterRadius: {
      commands: {
        left: 'G41',
        right: 'G42'
      },
      cancel: 'G40',
      register: 'D',
      description: 'Cutter radius/diameter compensation',
      components: {
        geometry: 'Nominal tool radius',
        wear: 'Accumulated wear offset'
      }
    },
    toolNoseRadius: {
      description: 'Turning tool nose radius compensation',
      commands: {
        left: 'G41',
        right: 'G42'
      },
      parameters: ['nose_radius', 'tip_direction']
    }
  },
  // WEAR TRACKING
  wearTracking: {
    lengthWear: {
      description: 'Axial wear on tool tip',
      measurement: 'Difference from original length',
      update: 'Manual or automatic via probing'
    },
    radiusWear: {
      description: 'Radial wear on cutting edge',
      measurement: 'Deviation from feature size',
      calculation: '(Target - Actual) / 2 for diameter features'
    },
    autoCompensation: {
      enabled: true,
      maxAdjustment: 0.1, // mm per adjustment
      method: 'incremental'
    }
  },
  // OFFSET STORAGE
  toolOffsets: new Map(),

  // METHODS

  initializeToolOffset: function(toolNumber, data) {
    const offset = {
      toolNumber: toolNumber,
      lengthGeometry: data.lengthGeometry || 0,
      lengthWear: data.lengthWear || 0,
      radiusGeometry: data.radiusGeometry || 0,
      radiusWear: data.radiusWear || 0,
      noseRadius: data.noseRadius || 0,
      tipDirection: data.tipDirection || 0,
      lastUpdated: new Date()
    };
    this.toolOffsets.set(toolNumber, offset);
    return offset;
  },
  getEffectiveLength: function(toolNumber) {
    const offset = this.toolOffsets.get(toolNumber);
    if (!offset) return null;

    return offset.lengthGeometry + offset.lengthWear;
  },
  getEffectiveRadius: function(toolNumber) {
    const offset = this.toolOffsets.get(toolNumber);
    if (!offset) return null;

    return offset.radiusGeometry + offset.radiusWear;
  },
  updateWearFromMeasurement: function(toolNumber, measurement) {
    const offset = this.toolOffsets.get(toolNumber);
    if (!offset) {
      throw new Error(`Tool ${toolNumber} not found`);
    }
    const update = {};

    // Length wear update
    if (measurement.measuredLength !== undefined) {
      const targetLength = offset.lengthGeometry;
      const lengthError = measurement.measuredLength - targetLength;
      offset.lengthWear = -lengthError; // Negative to compensate
      update.lengthWear = offset.lengthWear;
    }
    // Radius wear from feature measurement
    if (measurement.featureMeasurement !== undefined) {
      const target = measurement.targetSize;
      const actual = measurement.featureMeasurement;
      const error = actual - target;

      // For diameter features, radius adjustment is half the error
      const radiusAdjustment = measurement.isDiameter ? error / 2 : error;

      // Check max adjustment limit
      const maxAdj = this.wearTracking.autoCompensation.maxAdjustment;
      const limitedAdjustment = Math.max(-maxAdj, Math.min(maxAdj, radiusAdjustment));

      offset.radiusWear += limitedAdjustment;
      update.radiusWear = offset.radiusWear;
      update.adjustment = limitedAdjustment;
      update.limited = Math.abs(radiusAdjustment) > maxAdj;
    }
    offset.lastUpdated = new Date();
    return update;
  },
  calculateCDCAdjustment: function(targetSize, actualSize) {
    // Calculate wear compensation for contour machining
    const deviation = actualSize - targetSize;

    return {
      wearValue: -deviation / 2, // Half because CDC affects both sides
      deviation: deviation,
      recommendation: deviation > 0 ? 'Tool undersize, increase compensation' :
                       deviation < 0 ? 'Tool oversize, decrease compensation' : 'On target'
    };
  },
  generateCompensationGCode: function(toolNumber, compensationType, side = null) {
    const offset = this.toolOffsets.get(toolNumber);
    if (!offset) return '';

    const gcode = [];

    switch (compensationType) {
      case 'length':
        gcode.push(`G43 H${toolNumber}`);
        break;
      case 'radius':
        const cmd = side === 'left' ? 'G41' : 'G42';
        gcode.push(`${cmd} D${toolNumber}`);
        break;
      case 'both':
        gcode.push(`G43 H${toolNumber}`);
        const sideCmd = side === 'left' ? 'G41' : 'G42';
        gcode.push(`${sideCmd} D${toolNumber}`);
        break;
    }
    return gcode.join('\n');
  },
  getCompensationReport: function(toolNumber) {
    const offset = this.toolOffsets.get(toolNumber);
    if (!offset) return null;

    return {
      toolNumber: toolNumber,
      length: {
        geometry: offset.lengthGeometry.toFixed(4),
        wear: offset.lengthWear.toFixed(4),
        effective: this.getEffectiveLength(toolNumber).toFixed(4)
      },
      radius: {
        geometry: offset.radiusGeometry.toFixed(4),
        wear: offset.radiusWear.toFixed(4),
        effective: this.getEffectiveRadius(toolNumber).toFixed(4)
      },
      lastUpdated: offset.lastUpdated
    };
  }
};
// 5. SPINDLE_LOAD_MONITOR_ENGINE
// Based on Mazak/Okuma spindle load monitoring systems

const SPINDLE_LOAD_MONITOR_ENGINE = {
  version: '1.0.0',
  name: 'PRISM Spindle Load Monitor Engine',

  // MONITORING PARAMETERS
  parameters: {
    samplingRate: { type: 'number', default: 100, unit: 'ms' },
    displayMode: { options: ['percent', 'kilowatt', 'torque'] },
    maxLoadPercent: 150,
    warningThreshold: 80,
    alarmThreshold: 100,
    overloadProtection: true
  },
  // ADAPTIVE CONTROL
  adaptiveControl: {
    description: 'Automatically adjust feed based on spindle load',
    modes: {
      constant: {
        description: 'Maintain constant spindle load',
        targetLoad: { type: 'number', default: 60, unit: '%' },
        tolerance: { type: 'number', default: 10, unit: '%' }
      },
      maximum: {
        description: 'Limit to maximum load',
        maxLoad: { type: 'number', default: 85, unit: '%' }
      },
      optimized: {
        description: 'Balance load with cycle time',
        targetLoad: { type: 'number', default: 70, unit: '%' },
        accelerationFactor: { type: 'number', default: 1.2 }
      }
    },
    feedAdjustment: {
      minFeedPercent: 25,
      maxFeedPercent: 150,
      adjustmentStep: 5,
      responseTime: 200 // ms
    }
  },
  // LOAD PATTERNS
  loadPatterns: {
    description: 'Recognized load patterns for diagnostics',
    patterns: {
      steady: 'Normal cutting condition',
      increasing: 'Tool wear or harder material',
      erratic: 'Chatter or intermittent cutting',
      spike: 'Entry shock or collision',
      declining: 'Exiting cut or material breakthrough'
    }
  },
  // MONITORING DATA
  currentLoad: 0,
  loadHistory: [],
  isMonitoring: false,
  adaptiveFeedActive: false,
  currentFeedOverride: 100,

  // METHODS

  startMonitoring: function(options = {}) {
    this.isMonitoring = true;
    this.loadHistory = [];
    this.parameters = { ...this.parameters, ...options };

    console.log('[SPINDLE MONITOR] Started');

    // In production, would start actual monitoring loop
    return { status: 'monitoring', samplingRate: this.parameters.samplingRate };
  },
  stopMonitoring: function() {
    this.isMonitoring = false;
    this.adaptiveFeedActive = false;
    console.log('[SPINDLE MONITOR] Stopped');

    return this.getLoadReport();
  },
  recordLoad: function(loadPercent, timestamp = new Date()) {
    if (!this.isMonitoring) return;

    this.currentLoad = loadPercent;
    this.loadHistory.push({ load: loadPercent, timestamp: timestamp });

    // Keep last 1000 readings
    if (this.loadHistory.length > 1000) {
      this.loadHistory.shift();
    }
    // Check thresholds
    this._checkThresholds(loadPercent);

    // Update adaptive feed if active
    if (this.adaptiveFeedActive) {
      this._updateAdaptiveFeed(loadPercent);
    }
    return { load: loadPercent, feedOverride: this.currentFeedOverride };
  },
  _checkThresholds: function(load) {
    if (load >= this.parameters.alarmThreshold) {
      this._triggerAlarm('overload', load);
    } else if (load >= this.parameters.warningThreshold) {
      this._triggerWarning('high_load', load);
    }
  },
  _triggerAlarm: function(type, load) {
    console.error(`[SPINDLE MONITOR] ALARM: ${type} at ${load}%`);

    if (this.parameters.overloadProtection) {
      // Would trigger feed hold in production
      console.log('[SPINDLE MONITOR] Overload protection triggered');
    }
  },
  _triggerWarning: function(type, load) {
    console.warn(`[SPINDLE MONITOR] Warning: ${type} at ${load}%`);
  },
  enableAdaptiveFeed: function(mode = 'constant', options = {}) {
    this.adaptiveFeedActive = true;
    this.adaptiveMode = mode;
    this.adaptiveOptions = { ...this.adaptiveControl.modes[mode], ...options };

    console.log(`[SPINDLE MONITOR] Adaptive feed enabled: ${mode}`);
    return { mode: mode, options: this.adaptiveOptions };
  },
  disableAdaptiveFeed: function() {
    this.adaptiveFeedActive = false;
    this.currentFeedOverride = 100;

    console.log('[SPINDLE MONITOR] Adaptive feed disabled');
    return { feedOverride: 100 };
  },
  _updateAdaptiveFeed: function(currentLoad) {
    const opts = this.adaptiveOptions;
    const adjustment = this.adaptiveControl.feedAdjustment;

    let targetFeed = this.currentFeedOverride;

    switch (this.adaptiveMode) {
      case 'constant':
        if (currentLoad > opts.targetLoad + opts.tolerance) {
          targetFeed -= adjustment.adjustmentStep;
        } else if (currentLoad < opts.targetLoad - opts.tolerance) {
          targetFeed += adjustment.adjustmentStep;
        }
        break;

      case 'maximum':
        if (currentLoad > opts.maxLoad) {
          targetFeed -= adjustment.adjustmentStep * 2;
        } else if (currentLoad < opts.maxLoad - 20) {
          targetFeed += adjustment.adjustmentStep;
        }
        break;

      case 'optimized':
        const loadFactor = opts.targetLoad / currentLoad;
        targetFeed = Math.round(this.currentFeedOverride * Math.pow(loadFactor, 0.5));
        break;
    }
    // Clamp to limits
    targetFeed = Math.max(adjustment.minFeedPercent,
                          Math.min(adjustment.maxFeedPercent, targetFeed));

    this.currentFeedOverride = targetFeed;
  },
  analyzePattern: function() {
    if (this.loadHistory.length < 10) {
      return { pattern: 'insufficient_data', confidence: 0 };
    }
    const recent = this.loadHistory.slice(-20);
    const loads = recent.map(r => r.load);

    // Calculate trend
    const firstHalf = loads.slice(0, 10).reduce((a, b) => a + b) / 10;
    const secondHalf = loads.slice(10).reduce((a, b) => a + b) / Math.min(10, loads.length - 10);
    const trend = secondHalf - firstHalf;

    // Calculate variance
    const mean = loads.reduce((a, b) => a + b) / loads.length;
    const variance = loads.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / loads.length;
    const stdDev = Math.sqrt(variance);

    // Determine pattern
    let pattern, confidence;

    if (stdDev < 5 && Math.abs(trend) < 5) {
      pattern = 'steady';
      confidence = 0.9;
    } else if (trend > 10) {
      pattern = 'increasing';
      confidence = 0.8;
    } else if (trend < -10) {
      pattern = 'declining';
      confidence = 0.8;
    } else if (stdDev > 20) {
      pattern = 'erratic';
      confidence = 0.7;
    } else {
      pattern = 'variable';
      confidence = 0.6;
    }
    return {
      pattern: pattern,
      confidence: confidence,
      description: this.loadPatterns.patterns[pattern] || 'Unknown pattern',
      statistics: {
        mean: mean.toFixed(1),
        stdDev: stdDev.toFixed(1),
        trend: trend.toFixed(1),
        current: this.currentLoad
      }
    };
  },
  getLoadReport: function() {
    const analysis = this.analyzePattern();

    let maxLoad = 0, minLoad = 100, avgLoad = 0;
    if (this.loadHistory.length > 0) {
      const loads = this.loadHistory.map(h => h.load);
      maxLoad = Math.max(...loads);
      minLoad = Math.min(...loads);
      avgLoad = loads.reduce((a, b) => a + b) / loads.length;
    }
    return {
      currentLoad: this.currentLoad,
      maxLoad: maxLoad.toFixed(1),
      minLoad: minLoad.toFixed(1),
      avgLoad: avgLoad.toFixed(1),
      samples: this.loadHistory.length,
      pattern: analysis,
      adaptiveFeed: {
        active: this.adaptiveFeedActive,
        mode: this.adaptiveMode,
        currentOverride: this.currentFeedOverride
      }
    };
  }
};
// WINDOW REGISTRATION

if (typeof window !== 'undefined') {
  window.PROBING_CYCLE_DATABASE = PROBING_CYCLE_DATABASE;
  window.TOOL_LIFE_MANAGEMENT_ENGINE = TOOL_LIFE_MANAGEMENT_ENGINE;
  window.COORDINATE_SYSTEM_ENGINE = COORDINATE_SYSTEM_ENGINE;
  window.COMPENSATION_ENGINE_V2 = COMPENSATION_ENGINE_V2;
  window.SPINDLE_LOAD_MONITOR_ENGINE = SPINDLE_LOAD_MONITOR_ENGINE;

  // Initialize engines
  COORDINATE_SYSTEM_ENGINE.initializeOffsets();
}
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] IMPROVEMENTS BATCH 4 - v8.9.290 LOADED');
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] New Components:');
console.log('  - PROBING_CYCLE_DATABASE v1.0.0');
console.log('  - TOOL_LIFE_MANAGEMENT_ENGINE v1.0.0');
console.log('  - COORDINATE_SYSTEM_ENGINE v1.0.0');
console.log('  - COMPENSATION_ENGINE_V2 v2.0.0');
console.log('  - SPINDLE_LOAD_MONITOR_ENGINE v1.0.0');

// END BATCH 4 INTEGRATION

}
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] IMPROVEMENTS BATCH 3 - v8.9.290 LOADED');
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] New Components:');
console.log('  - ADVANCED_5AXIS_STRATEGY_DATABASE v1.0.0');
console.log('  - APPROACH_RETRACT_MACRO_DATABASE v1.0.0');
console.log('  - TURBOMACHINERY_FEATURE_ENGINE v1.0.0');
console.log('  - LINKING_JOB_ORCHESTRATOR v1.0.0');
console.log('  - BARREL_CUTTER_OPTIMIZATION_ENGINE v1.0.0');

// PRISM_3D_VISUAL_ENHANCEMENT_ENGINE v1.0 - Enhanced Machine Visualization
// Adds detailed visual elements for machine simulation

const PRISM_3D_VISUAL_ENHANCEMENT_ENGINE = {
  version: '1.0.0',

  // WAY COVER / BELLOWS GENERATOR

  generateWayCovers(params) {
    const {
      axis = 'X',
      length = 500,
      width = 100,
      height = 30,
      folds = 15,
      color = 0x333333,
      position = { x: 0, y: 0, z: 0 }
    } = params;

    const group = new THREE.Group();
    group.name = `wayCover_${axis}`;

    // Create accordion-style bellows
    const foldDepth = length / folds;
    const foldHeight = height * 0.3;

    for (let i = 0; i < folds; i++) {
      // Create each fold as a box with slight taper
      const foldGeo = new THREE.BoxGeometry(foldDepth * 0.9, width, foldHeight);
      const foldMat = new THREE.MeshPhongMaterial({
        color: color,
        side: THREE.DoubleSide
      });
      const fold = new THREE.Mesh(foldGeo, foldMat);

      // Position alternating up/down
      const xPos = -length / 2 + (i + 0.5) * foldDepth;
      const zPos = (i % 2 === 0) ? foldHeight / 2 : -foldHeight / 2;

      if (axis === 'X') {
        fold.position.set(xPos, 0, zPos);
      } else if (axis === 'Y') {
        fold.rotation.z = Math.PI / 2;
        fold.position.set(0, xPos, zPos);
      }
      group.add(fold);
    }
    // Add top/bottom cover plates
    const coverGeo = new THREE.BoxGeometry(length, width, 2);
    const topCover = new THREE.Mesh(coverGeo, new THREE.MeshPhongMaterial({ color: 0x444444 }));
    topCover.position.z = height / 2;
    group.add(topCover);

    const bottomCover = topCover.clone();
    bottomCover.position.z = -height / 2;
    group.add(bottomCover);

    group.position.set(position.x, position.y, position.z);

    return group;
  },
  // TOOL CHANGER GENERATOR

  generateToolChanger(params) {
    const {
      type = 'carousel',  // 'carousel', 'arm', 'chain'
      pockets = 20,
      pocketDiameter = 60,
      color = 0x666666,
      position = { x: 0, y: 0, z: 0 }
    } = params;

    const group = new THREE.Group();
    group.name = 'toolChanger';

    if (type === 'carousel') {
      // Circular carousel
      const carouselRadius = (pockets * pocketDiameter) / (2 * Math.PI) + 50;

      // Main disc
      const discGeo = new THREE.CylinderGeometry(carouselRadius, carouselRadius, 30, 64);
      const discMat = new THREE.MeshPhongMaterial({ color: color });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.rotation.x = Math.PI / 2;
      group.add(disc);

      // Tool pockets
      const pocketGeo = new THREE.CylinderGeometry(pocketDiameter / 2, pocketDiameter / 2, 40, 16);
      const pocketMat = new THREE.MeshPhongMaterial({ color: 0x222222 });

      for (let i = 0; i < pockets; i++) {
        const angle = (i / pockets) * Math.PI * 2;
        const pocket = new THREE.Mesh(pocketGeo, pocketMat);
        pocket.position.x = Math.cos(angle) * (carouselRadius - pocketDiameter / 2 - 10);
        pocket.position.y = Math.sin(angle) * (carouselRadius - pocketDiameter / 2 - 10);
        pocket.rotation.x = Math.PI / 2;
        pocket.name = `pocket_${i + 1}`;
        group.add(pocket);
      }
      // Center hub
      const hubGeo = new THREE.CylinderGeometry(50, 50, 50, 32);
      const hub = new THREE.Mesh(hubGeo, new THREE.MeshPhongMaterial({ color: 0x888888 }));
      hub.rotation.x = Math.PI / 2;
      group.add(hub);
    }
    if (type === 'arm') {
      // Side-mount arm type ATC
      const armLength = 300;
      const armWidth = 80;

      // Main arm
      const armGeo = new THREE.BoxGeometry(armLength, armWidth, 40);
      const arm = new THREE.Mesh(armGeo, new THREE.MeshPhongMaterial({ color: color }));
      group.add(arm);

      // Gripper ends
      const gripperGeo = new THREE.CylinderGeometry(30, 30, 60, 16);
      const gripperMat = new THREE.MeshPhongMaterial({ color: 0x888888 });

      const gripper1 = new THREE.Mesh(gripperGeo, gripperMat);
      gripper1.position.x = -armLength / 2 + 30;
      gripper1.rotation.x = Math.PI / 2;
      group.add(gripper1);

      const gripper2 = gripper1.clone();
      gripper2.position.x = armLength / 2 - 30;
      group.add(gripper2);

      // Pivot point
      const pivotGeo = new THREE.CylinderGeometry(40, 40, 80, 32);
      const pivot = new THREE.Mesh(pivotGeo, new THREE.MeshPhongMaterial({ color: 0x444444 }));
      pivot.rotation.x = Math.PI / 2;
      pivot.position.y = -100;
      group.add(pivot);
    }
    group.position.set(position.x, position.y, position.z);

    return group;
  },
  // COOLANT SYSTEM GENERATOR

  generateCoolantSystem(params) {
    const {
      type = 'flood',  // 'flood', 'mist', 'through_spindle'
      nozzleCount = 4,
      color = 0x3377aa,
      position = { x: 0, y: 0, z: 0 }
    } = params;

    const group = new THREE.Group();
    group.name = 'coolantSystem';

    // Coolant nozzle geometry
    const nozzleBaseGeo = new THREE.CylinderGeometry(8, 10, 20, 8);
    const nozzleTubeGeo = new THREE.CylinderGeometry(4, 4, 40, 8);
    const nozzleMat = new THREE.MeshPhongMaterial({ color: 0x777777 });

    // Create nozzles
    for (let i = 0; i < nozzleCount; i++) {
      const angle = (i / nozzleCount) * Math.PI * 2;
      const nozzleGroup = new THREE.Group();

      // Base
      const base = new THREE.Mesh(nozzleBaseGeo, nozzleMat);
      nozzleGroup.add(base);

      // Flexible tube
      const tube = new THREE.Mesh(nozzleTubeGeo, new THREE.MeshPhongMaterial({ color: color }));
      tube.position.y = 30;
      tube.rotation.x = 0.3; // Slight angle
      nozzleGroup.add(tube);

      // Position around spindle area
      const radius = 80;
      nozzleGroup.position.x = Math.cos(angle) * radius;
      nozzleGroup.position.z = Math.sin(angle) * radius;
      nozzleGroup.lookAt(0, -50, 0);

      group.add(nozzleGroup);
    }
    // Through-spindle indicator
    if (type === 'through_spindle') {
      const tscIndicator = new THREE.Mesh(
        new THREE.CylinderGeometry(5, 5, 100, 8),
        new THREE.MeshPhongMaterial({ color: 0x00aaff, transparent: true, opacity: 0.5 })
      );
      tscIndicator.name = 'throughSpindleCoolant';
      group.add(tscIndicator);
    }
    group.position.set(position.x, position.y, position.z);

    return group;
  },
  // MACHINE ENCLOSURE GENERATOR

  generateEnclosure(params) {
    const {
      width = 2000,
      depth = 1500,
      height = 2200,
      doorWidth = 800,
      windowHeight = 600,
      color = 0xeeeeee,
      position = { x: 0, y: 0, z: 0 }
    } = params;

    const group = new THREE.Group();
    group.name = 'enclosure';

    const wallThickness = 20;
    const frameMat = new THREE.MeshPhongMaterial({ color: color });
    const glassMat = new THREE.MeshPhongMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.3
    });

    // Back wall
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, wallThickness),
      frameMat
    );
    backWall.position.set(0, height / 2, -depth / 2);
    group.add(backWall);

    // Left wall
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, height, depth),
      frameMat
    );
    leftWall.position.set(-width / 2, height / 2, 0);
    group.add(leftWall);

    // Right wall
    const rightWall = leftWall.clone();
    rightWall.position.x = width / 2;
    group.add(rightWall);

    // Top
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(width, wallThickness, depth),
      frameMat
    );
    top.position.set(0, height, 0);
    group.add(top);

    // Front door frame
    const doorFrameLeft = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, height, wallThickness),
      frameMat
    );
    doorFrameLeft.position.set(-doorWidth / 2 - wallThickness / 2, height / 2, depth / 2);
    group.add(doorFrameLeft);

    const doorFrameRight = doorFrameLeft.clone();
    doorFrameRight.position.x = doorWidth / 2 + wallThickness / 2;
    group.add(doorFrameRight);

    // Window
    const window = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth, windowHeight, 5),
      glassMat
    );
    window.position.set(0, height / 2 + 200, depth / 2);
    window.name = 'viewingWindow';
    group.add(window);

    // Door (separate group for animation)
    const door = new THREE.Group();
    door.name = 'door';
    const doorPanel = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth / 2, height - 100, wallThickness),
      frameMat
    );
    doorPanel.position.y = height / 2 - 50;
    door.add(doorPanel);
    door.position.set(-doorWidth / 4, 0, depth / 2);
    group.add(door);

    group.position.set(position.x, position.y, position.z);

    return group;
  },
  // WORK ENVELOPE VISUALIZATION

  generateWorkEnvelope(params) {
    const {
      xTravel = 500,
      yTravel = 400,
      zTravel = 400,
      color = 0x00ff00,
      opacity = 0.1,
      showEdges = true,
      position = { x: 0, y: 0, z: 0 }
    } = params;

    const group = new THREE.Group();
    group.name = 'workEnvelope';

    // Semi-transparent box showing work envelope
    const envelopeGeo = new THREE.BoxGeometry(xTravel, yTravel, zTravel);
    const envelopeMat = new THREE.MeshPhongMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide
    });
    const envelope = new THREE.Mesh(envelopeGeo, envelopeMat);
    group.add(envelope);

    // Edge lines
    if (showEdges) {
      const edgesGeo = new THREE.EdgesGeometry(envelopeGeo);
      const edgesMat = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
      const edges = new THREE.LineSegments(edgesGeo, edgesMat);
      group.add(edges);
    }
    // Axis labels
    const labelPositions = [
      { text: `X: ${xTravel}mm`, pos: [xTravel / 2 + 20, 0, 0] },
      { text: `Y: ${yTravel}mm`, pos: [0, yTravel / 2 + 20, 0] },
      { text: `Z: ${zTravel}mm`, pos: [0, 0, zTravel / 2 + 20] }
    ];

    // Note: Text labels would use CSS2DRenderer or sprite-based text
    // Storing label data for external rendering
    group.userData.labels = labelPositions;

    group.position.set(position.x, position.y, position.z);

    return group;
  },
  // AXIS LIMIT INDICATORS

  generateAxisLimitIndicators(params) {
    const {
      axis = 'X',
      minLimit = -250,
      maxLimit = 250,
      currentPosition = 0,
      warningZone = 20,  // Distance from limit to show warning
      color = 0x00ff00,
      warningColor = 0xffff00,
      errorColor = 0xff0000
    } = params;

    const group = new THREE.Group();
    group.name = `limitIndicator_${axis}`;

    const totalTravel = maxLimit - minLimit;
    const indicatorWidth = 10;
    const indicatorHeight = 5;

    // Background track
    const trackGeo = new THREE.BoxGeometry(totalTravel, indicatorHeight, indicatorWidth);
    const trackMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const track = new THREE.Mesh(trackGeo, trackMat);
    group.add(track);

    // Warning zones at limits
    const warningGeo = new THREE.BoxGeometry(warningZone, indicatorHeight + 2, indicatorWidth + 2);
    const warningMat = new THREE.MeshPhongMaterial({ color: warningColor, transparent: true, opacity: 0.5 });

    const warningMin = new THREE.Mesh(warningGeo, warningMat);
    warningMin.position.x = minLimit + warningZone / 2 - totalTravel / 2;
    group.add(warningMin);

    const warningMax = new THREE.Mesh(warningGeo, warningMat);
    warningMax.position.x = maxLimit - warningZone / 2 - totalTravel / 2;
    group.add(warningMax);

    // Current position indicator
    const posGeo = new THREE.BoxGeometry(5, indicatorHeight + 4, indicatorWidth + 4);
    const posMat = new THREE.MeshPhongMaterial({ color: color });
    const posIndicator = new THREE.Mesh(posGeo, posMat);
    posIndicator.position.x = currentPosition - (minLimit + maxLimit) / 2;
    posIndicator.name = 'positionIndicator';
    group.add(posIndicator);

    // Store limits for animation updates
    group.userData = {
      minLimit,
      maxLimit,
      warningZone,
      updatePosition: function(newPos) {
        posIndicator.position.x = newPos - (minLimit + maxLimit) / 2;

        // Update color based on proximity to limits
        if (newPos <= minLimit + warningZone || newPos >= maxLimit - warningZone) {
          posMat.color.setHex(warningColor);
        } else {
          posMat.color.setHex(color);
        }
        if (newPos <= minLimit || newPos >= maxLimit) {
          posMat.color.setHex(errorColor);
        }
      }
    };
    return group;
  },
  // CHIP CONVEYOR GENERATOR

  generateChipConveyor(params) {
    const {
      length = 1000,
      width = 300,
      height = 150,
      color = 0x555555,
      position = { x: 0, y: 0, z: 0 }
    } = params;

    const group = new THREE.Group();
    group.name = 'chipConveyor';

    // Main trough
    const troughGeo = new THREE.BoxGeometry(length, width, height);
    const troughMat = new THREE.MeshPhongMaterial({ color: color });
    const trough = new THREE.Mesh(troughGeo, troughMat);
    group.add(trough);

    // Belt surface
    const beltGeo = new THREE.BoxGeometry(length - 40, width - 40, 5);
    const beltMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.z = height / 2 - 10;
    belt.name = 'conveyorBelt';
    group.add(belt);

    // End drums
    const drumGeo = new THREE.CylinderGeometry(30, 30, width - 20, 16);
    const drumMat = new THREE.MeshPhongMaterial({ color: 0x444444 });

    const drumFront = new THREE.Mesh(drumGeo, drumMat);
    drumFront.rotation.x = Math.PI / 2;
    drumFront.position.x = -length / 2 + 30;
    drumFront.position.z = height / 2 - 30;
    group.add(drumFront);

    const drumBack = drumFront.clone();
    drumBack.position.x = length / 2 - 30;
    group.add(drumBack);

    // Collection bin
    const binGeo = new THREE.BoxGeometry(200, width + 50, 200);
    const bin = new THREE.Mesh(binGeo, new THREE.MeshPhongMaterial({ color: 0x666666 }));
    bin.position.x = length / 2 + 120;
    bin.position.z = -50;
    bin.name = 'chipBin';
    group.add(bin);

    group.position.set(position.x, position.y, position.z);

    return group;
  }
};
// Register globally
window.PRISM_3D_VISUAL_ENHANCEMENT_ENGINE = PRISM_3D_VISUAL_ENHANCEMENT_ENGINE;

// PRISM_EVENT_INTEGRATION_BRIDGE v1.0 - Enhanced Event Connectivity
// Improves event system connectivity between all components

const PRISM_EVENT_INTEGRATION_BRIDGE = {
  version: '1.0.0',
  subscriptions: [],

  // EVENT DEFINITIONS

  events: {
    // CAD Events
    'cad:loaded': { description: 'CAD model loaded', emitters: ['ADVANCED_CAD_RECOGNITION_ENGINE'] },
    'cad:generated': { description: 'CAD model generated', emitters: ['ADVANCED_CAD_GENERATION_ENGINE'] },
    'cad:features_detected': { description: 'Features detected in CAD', emitters: ['ADVANCED_FEATURE_RECOGNITION_ENGINE'] },

    // CAM Events
    'cam:toolpath_generated': { description: 'Toolpath generated', emitters: ['TOOLPATH_GENERATION_ENGINE'] },
    'cam:program_complete': { description: 'CAM program complete', emitters: ['COMPLETE_CAM_PROGRAM_GENERATION_ENGINE'] },
    'cam:strategy_selected': { description: 'Machining strategy selected', emitters: ['UNIFIED_CAM_STRATEGY_ENGINE'] },

    // Simulation Events
    'sim:collision_detected': { description: 'Collision detected', emitters: ['COLLISION_AVOIDANCE_SYSTEM'] },
    'sim:position_updated': { description: 'Machine position updated', emitters: ['MACHINE_SYSTEM_PHYSICS'] },
    'sim:envelope_exceeded': { description: 'Work envelope exceeded', emitters: ['COLLISION_AVOIDANCE_SYSTEM'] },

    // Post Events
    'post:gcode_generated': { description: 'G-code generated', emitters: ['UNIVERSAL_POST_PROCESSOR_ENGINE'] },
    'post:verification_complete': { description: 'Post verification complete', emitters: ['POST_GENERATOR'] },

    // OCR Events
    'ocr:started': { description: 'OCR processing started', emitters: ['PRISM_OCR_ENGINE'] },
    'ocr:progress': { description: 'OCR progress update', emitters: ['PRISM_OCR_ENGINE'] },
    'ocr:complete': { description: 'OCR processing complete', emitters: ['PRISM_OCR_ENGINE'] },

    // UI Events
    'ui:view_changed': { description: 'View changed', emitters: ['UI_CONTROLLER'] },
    'ui:selection_changed': { description: 'Selection changed', emitters: ['UI_CONTROLLER'] },

    // Tool Events
    'tool:selected': { description: 'Tool selected', emitters: ['PRISM_TOOL_SELECTION_ENGINE'] },
    'tool:parameters_calculated': { description: 'Tool parameters calculated', emitters: ['PRISM_PHYSICS_ENGINE'] }
  },
  // INITIALIZATION - Connect All Components

  init() {
    console.log('[Event Bridge] Initializing event connectivity...');

    // Get reference to communication hub
    const hub = this._getHub();
    if (!hub) {
      console.warn('[Event Bridge] Communication hub not found');
      return false;
    }
    // Set up cross-component subscriptions
    this._setupCADSubscriptions(hub);
    this._setupCAMSubscriptions(hub);
    this._setupSimulationSubscriptions(hub);
    this._setupUISubscriptions(hub);

    console.log(`[Event Bridge] Connected ${this.subscriptions.length} event subscriptions`);
    return true;
  },
  _getHub() {
    if (typeof PRISM_MASTER_ORCHESTRATOR !== 'undefined' && PRISM_MASTER_ORCHESTRATOR.communicationHub) {
      return PRISM_MASTER_ORCHESTRATOR.communicationHub;
    }
    if (typeof eventBus !== 'undefined') {
      return eventBus;
    }
    return null;
  },
  _setupCADSubscriptions(hub) {
    // When CAD is loaded, trigger feature recognition
    hub.on('cad:loaded', (data) => {
      if (typeof ADVANCED_FEATURE_RECOGNITION_ENGINE !== 'undefined') {
        ADVANCED_FEATURE_RECOGNITION_ENGINE.analyzeModel(data.model);
      }
    });
    this.subscriptions.push('cad:loaded -> feature_recognition');

    // When features detected, update UI and enable CAM
    hub.on('cad:features_detected', (data) => {
      if (typeof PRISM_CAD_CONFIDENCE_ENGINE !== 'undefined') {
        const confidence = PRISM_CAD_CONFIDENCE_ENGINE.calculateOverallConfidence(data);
        hub.emit('cad:confidence_calculated', confidence, 'event_bridge');
      }
    });
    this.subscriptions.push('cad:features_detected -> confidence_calculation');
  },
  _setupCAMSubscriptions(hub) {
    // When strategy selected, generate toolpath
    hub.on('cam:strategy_selected', (data) => {
      if (typeof TOOLPATH_GENERATION_ENGINE !== 'undefined') {
        TOOLPATH_GENERATION_ENGINE.generateForStrategy(data);
      }
    });
    this.subscriptions.push('cam:strategy_selected -> toolpath_generation');

    // When toolpath generated, run simulation check
    hub.on('cam:toolpath_generated', (data) => {
      if (typeof COLLISION_AVOIDANCE_SYSTEM !== 'undefined') {
        COLLISION_AVOIDANCE_SYSTEM.verifyToolpath(data.toolpath);
      }
    });
    this.subscriptions.push('cam:toolpath_generated -> collision_check');

    // When program complete, generate post
    hub.on('cam:program_complete', (data) => {
      if (typeof UNIVERSAL_POST_PROCESSOR_ENGINE !== 'undefined' && data.autoPost) {
        UNIVERSAL_POST_PROCESSOR_ENGINE.generatePost(data);
      }
    });
    this.subscriptions.push('cam:program_complete -> post_generation');
  },
  _setupSimulationSubscriptions(hub) {
    // When collision detected, alert and pause
    hub.on('sim:collision_detected', (data) => {
      console.warn('[Collision]', data.message);
      hub.emit('ui:alert', { type: 'error', message: data.message }, 'event_bridge');
    });
    this.subscriptions.push('sim:collision_detected -> ui_alert');

    // When envelope exceeded, show warning
    hub.on('sim:envelope_exceeded', (data) => {
      hub.emit('ui:alert', { type: 'warning', message: `Axis ${data.axis} limit: ${data.position}` }, 'event_bridge');
    });
    this.subscriptions.push('sim:envelope_exceeded -> ui_alert');
  },
  _setupUISubscriptions(hub) {
    // When selection changes, update property panel
    hub.on('ui:selection_changed', (data) => {
      hub.emit('ui:update_properties', data, 'event_bridge');
    });
    this.subscriptions.push('ui:selection_changed -> property_update');
  },
  // MANUAL EVENT TRIGGERS

  emit(eventName, data) {
    const hub = this._getHub();
    if (hub) {
      hub.emit(eventName, data, 'event_bridge');
    }
  },
  on(eventName, callback) {
    const hub = this._getHub();
    if (hub) {
      hub.on(eventName, callback);
      this.subscriptions.push(`${eventName} -> custom_callback`);
    }
  },
  // DIAGNOSTICS

  getStatus() {
    return {
      initialized: this.subscriptions.length > 0,
      subscriptionCount: this.subscriptions.length,
      subscriptions: this.subscriptions,
      availableEvents: Object.keys(this.events)
    };
  }
};
// Register globally
window.PRISM_EVENT_INTEGRATION_BRIDGE = PRISM_EVENT_INTEGRATION_BRIDGE;

// Auto-initialize when document ready
if (document.readyState === 'complete') {
  PRISM_EVENT_INTEGRATION_BRIDGE.init();
} else {
  window.addEventListener('load', () => PRISM_EVENT_INTEGRATION_BRIDGE.init());
}
// PRISM v8.87.001 INTEGRATION & CONSOLIDATION MODULE

(function() {
  console.log('[PRISM v8.87.001] Integrating new engines and consolidating...');

  // Connect OCR Engine to Print Reading
  if (typeof ADVANCED_PRINT_READING_ENGINE !== 'undefined' && typeof PRISM_OCR_ENGINE !== 'undefined') {
    ADVANCED_PRINT_READING_ENGINE.ocrEngine = PRISM_OCR_ENGINE;
    console.log('  ✓ OCR Engine connected to Print Reading');
  }
  // Connect Surface Finish Engine to CAM Strategy
  if (typeof UNIFIED_CAM_STRATEGY_ENGINE !== 'undefined' && typeof PRISM_SURFACE_FINISH_ENGINE !== 'undefined') {
    UNIFIED_CAM_STRATEGY_ENGINE.surfaceFinishEngine = PRISM_SURFACE_FINISH_ENGINE;
    console.log('  ✓ Surface Finish Engine connected to CAM Strategy');
  }
  // Connect Surface Finish to Feature Recognition
  if (typeof ADVANCED_FEATURE_RECOGNITION_ENGINE !== 'undefined' && typeof PRISM_SURFACE_FINISH_ENGINE !== 'undefined') {
    ADVANCED_FEATURE_RECOGNITION_ENGINE.surfaceFinishEngine = PRISM_SURFACE_FINISH_ENGINE;
    console.log('  ✓ Surface Finish Engine connected to Feature Recognition');
  }
  // Connect 3D Visual Engine to Machine Generator
  if (typeof MACHINE_MODEL_GENERATOR !== 'undefined' && typeof PRISM_3D_VISUAL_ENHANCEMENT_ENGINE !== 'undefined') {
    MACHINE_MODEL_GENERATOR.visualEnhancer = PRISM_3D_VISUAL_ENHANCEMENT_ENGINE;
    console.log('  ✓ 3D Visual Engine connected to Machine Generator');
  }
  // Connect 3D Visual Engine to Simulation
  if (typeof FULL_MACHINE_SIMULATION !== 'undefined' && typeof PRISM_3D_VISUAL_ENHANCEMENT_ENGINE !== 'undefined') {
    FULL_MACHINE_SIMULATION.visualEngine = PRISM_3D_VISUAL_ENHANCEMENT_ENGINE;
    console.log('  ✓ 3D Visual Engine connected to Simulation');
  }
  // Register with Master Orchestrator
  if (typeof PRISM_MASTER_ORCHESTRATOR !== 'undefined') {
    const engines = [
      'PRISM_OCR_ENGINE',
      'PRISM_SURFACE_FINISH_ENGINE',
      'PRISM_3D_VISUAL_ENHANCEMENT_ENGINE',
      'PRISM_EVENT_INTEGRATION_BRIDGE'
    ];

    PRISM_MASTER_ORCHESTRATOR.communicationHub.emit('engines:registered', {
      engines: engines,
      version: '8.9.400'
    }, 'integration');

    console.log('  ✓ Engines registered with Master Orchestrator');
  }
  // Update Learning Controller with new knowledge
  if (typeof PRISM_LEARNING_CONTROLLER !== 'undefined') {
    PRISM_LEARNING_CONTROLLER.addKnowledgeSource({
      name: 'Surface_Finish_Standards',
      type: 'standards',
      engine: 'PRISM_SURFACE_FINISH_ENGINE'
    });

    PRISM_LEARNING_CONTROLLER.addKnowledgeSource({
      name: 'OCR_Extraction',
      type: 'processing',
      engine: 'PRISM_OCR_ENGINE'
    });
  }
  // Initialize Event Bridge
  if (typeof PRISM_EVENT_INTEGRATION_BRIDGE !== 'undefined') {
    setTimeout(() => {
      const status = PRISM_EVENT_INTEGRATION_BRIDGE.getStatus();
      console.log(`  ✓ Event Bridge: ${status.subscriptionCount} subscriptions active`);
    }, 100);
  }
  (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM v8.87.001] Integration complete - 4 new engines, enhanced connectivity');
})();

// PRISM v8.87.001 - ENHANCED ORCHESTRATION & INTEGRATION MODULE
// Added: Enhanced Master Orchestrator v2.0, File Upload Integration v1.0,
//        3D Visualization Pipeline v1.0
// Date: January 2026

// PRISM_ENHANCED_MASTER_ORCHESTRATOR v2.0
// Complete workflow integration with OCR, Surface Finish, 3D visualization
const PRISM_ENHANCED_MASTER_ORCHESTRATOR = {
  version: '3.0.0',
  integrationStatus: { ocr: false, surfaceFinish: false, visualization3D: false, printReading: false, featureRecognition: false },
  workflowLog: [],

  init() {
    console.log('[ENHANCED_MASTER_ORCHESTRATOR] v2.0 Initializing...');
    this.integrationStatus.ocr = this._connectOCR();
    this.integrationStatus.surfaceFinish = this._connectSurfaceFinish();
    this.integrationStatus.visualization3D = this._connect3DVisualization();
    this.integrationStatus.printReading = this._connectPrintReading();
    this.integrationStatus.featureRecognition = this._connectFeatureRecognition();
    console.log('[ENHANCED_MASTER_ORCHESTRATOR] Integration Status:', this.integrationStatus);

    if (typeof PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR !== 'undefined') {
      PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR.enhanced = this;
      PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR.processFile = this.processFile.bind(this);
      PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR.processWithOCR = this.processWithOCR.bind(this);
      console.log('[ENHANCED_MASTER_ORCHESTRATOR] ✓ Connected to PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR');
    }
    window.PRISM_MASTER_ORCHESTRATOR = this;
    window.processManufacturingFile = this.processFile.bind(this);
    window.extractPrintDimensions = this.processWithOCR.bind(this);
    console.log('[ENHANCED_MASTER_ORCHESTRATOR] v2.0 Ready');
    return this;
  },
  _connectOCR() {
    if (typeof Tesseract !== 'undefined') { console.log('[ENHANCED_MASTER_ORCHESTRATOR] ✓ Tesseract.js available'); return true; }
    if (typeof ADVANCED_PRINT_READING_ENGINE !== 'undefined' && ADVANCED_PRINT_READING_ENGINE.textRecognition) {
      console.log('[ENHANCED_MASTER_ORCHESTRATOR] ✓ ADVANCED_PRINT_READING_ENGINE OCR available'); return true;
    }
    // Load Tesseract from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js';
    PRISM_CONSTANTS.DEBUG && script.onload = () => { console.log('[ENHANCED_MASTER_ORCHESTRATOR] ✓ Tesseract.js loaded'); this.integrationStatus.ocr = true; };
    document.head.appendChild(script);
    return false;
  },
  _connectSurfaceFinish() {
    if (typeof SURFACE_FINISH_PARSER === 'undefined') return false;
    if (!SURFACE_FINISH_PARSER.enhanced) {
      SURFACE_FINISH_PARSER.enhanced = true;
      SURFACE_FINISH_PARSER.parseEnhanced = (text) => {
        const results = { ra: null, rz: null, n_number: null, triangle_symbols: [], vdi: null, raw_text: text, confidence: 0 };
        const raMatch = text.match(/Ra\s*[=:]?\s*(\d+\.?\d*)\s*(?:μin|uin|µin|μm|um|µm)/i);
        if (raMatch) { results.ra = parseFloat(raMatch[1]); results.confidence = 90; }
        const nMatch = text.match(/N\s*([1-9]|1[0-2])\b/i);
        if (nMatch) { results.n_number = parseInt(nMatch[1]); results.confidence = Math.max(results.confidence, 85); }
        const vdiMatch = text.match(/VDI\s*(\d+)/i);
        if (vdiMatch) { results.vdi = parseInt(vdiMatch[1]); results.confidence = Math.max(results.confidence, 88); }
        return results;
      };
      SURFACE_FINISH_PARSER.getToolpathRecommendation = (surfaceFinish) => {
        const ra = surfaceFinish.ra || 125;
        if (ra <= 16) return { strategy: 'fine_finishing', stepover: 0.02, stepdown: 0.01, tool: 'ball_endmill', speed_factor: 1.2, feed_factor: 0.6 };
        if (ra <= 32) return { strategy: 'finishing', stepover: 0.05, stepdown: 0.015, tool: 'ball_or_bullnose', speed_factor: 1.1, feed_factor: 0.7 };
        if (ra <= 63) return { strategy: 'semi_finishing', stepover: 0.10, stepdown: 0.03, tool: 'endmill', speed_factor: 1.0, feed_factor: 0.85 };
        if (ra <= 125) return { strategy: 'roughing_with_finish_pass', stepover: 0.25, stepdown: 0.10, tool: 'endmill', speed_factor: 1.0, feed_factor: 1.0 };
        return { strategy: 'roughing', stepover: 0.50, stepdown: 0.25, tool: 'roughing_endmill', speed_factor: 0.9, feed_factor: 1.1 };
      };
      SURFACE_FINISH_PARSER.convertRaToN = (ra_microinches) => {
        const table = [{n:1,ra:1},{n:2,ra:2},{n:3,ra:4},{n:4,ra:8},{n:5,ra:16},{n:6,ra:32},{n:7,ra:63},{n:8,ra:125},{n:9,ra:250},{n:10,ra:500},{n:11,ra:1000},{n:12,ra:2000}];
        let closest = table[0], minDiff = Math.abs(ra_microinches - table[0].ra);
        for (const entry of table) { const diff = Math.abs(ra_microinches - entry.ra); if (diff < minDiff) { minDiff = diff; closest = entry; } }
        return closest.n;
      };
    }
    console.log('[ENHANCED_MASTER_ORCHESTRATOR] ✓ SURFACE_FINISH_PARSER enhanced');
    return true;
  },
  _connect3DVisualization() {
    let c = 0;
    if (typeof ULTIMATE_3D_MACHINE_SYSTEM !== 'undefined') c++;
    if (typeof PRISM_TOOL_3D_GENERATOR !== 'undefined') c++;
    if (typeof PRISM_TOOL_HOLDER_3D_GENERATOR !== 'undefined') c++;
    if (typeof PRISM_MACHINE_3D_LEARNING_ENGINE !== 'undefined') c++;
    if (typeof THREE !== 'undefined') c++;
    console.log('[ENHANCED_MASTER_ORCHESTRATOR] 3D systems connected:', c);
    return c >= 3;
  },
  _connectPrintReading() {
    const connected = typeof ADVANCED_PRINT_READING_ENGINE !== 'undefined' || typeof INTELLIGENT_PRINT_INTERPRETER !== 'undefined';
    if (connected) console.log('[ENHANCED_MASTER_ORCHESTRATOR] ✓ Print reading engine available');
    return connected;
  },
  _connectFeatureRecognition() {
    let c = 0;
    if (typeof PRISM_COMPLETE_FEATURE_ENGINE !== 'undefined') c++;
    if (typeof ADVANCED_FEATURE_RECOGNITION_ENGINE !== 'undefined') c++;
    if (typeof UNIFIED_FEATURE_SYSTEM !== 'undefined') c++;
    console.log('[ENHANCED_MASTER_ORCHESTRATOR] Feature engines connected:', c);
    return c >= 2;
  },
  async processFile(file, options = {}) {
    console.log('[ENHANCED_MASTER_ORCHESTRATOR] Processing file:', file.name);
    const workflow = { id: 'EMO_' + Date.now(), fileName: file.name, fileType: file.type, fileSize: file.size, startTime: Date.now(), stages: [], results: {}, confidence: 0, warnings: [], success: false };

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      workflow.stages.push({ name: 'File Type Detection', status: 'complete', data: { extension: ext, type: file.type } });

      if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'].includes(ext)) {
        workflow.results.extraction = await this.processWithOCR(file, options);
        workflow.stages.push({ name: 'OCR Extraction', status: 'complete', data: workflow.results.extraction });
      } else if (ext === 'pdf') {
        workflow.results.extraction = await this.processPDF(file, options);
        workflow.stages.push({ name: 'PDF Processing', status: 'complete', data: workflow.results.extraction });
      } else if (['step', 'stp', 'iges', 'igs'].includes(ext)) {
        workflow.results.extraction = await this.processCAD(file, options);
        workflow.stages.push({ name: 'CAD Processing', status: 'complete', data: workflow.results.extraction });
      } else if (['stl', 'obj'].includes(ext)) {
        workflow.results.extraction = await this.processMesh(file, options);
        workflow.stages.push({ name: 'Mesh Processing', status: 'complete', data: workflow.results.extraction });
      }
      // Feature Recognition
      if (workflow.results.extraction) {
        workflow.results.features = await this.recognizeFeatures(workflow.results.extraction, options);
        workflow.stages.push({ name: 'Feature Recognition', status: 'complete', data: { featureCount: workflow.results.features?.length || 0 } });
      }
      // Surface Finish Analysis
      if (workflow.results.extraction?.text) {
        workflow.results.surfaceFinish = this.analyzeSurfaceFinish(workflow.results.extraction.text, workflow.results.extraction.annotations || []);
        workflow.stages.push({ name: 'Surface Finish Analysis', status: 'complete', data: workflow.results.surfaceFinish });
      }
      // GD&T Analysis
      if (workflow.results.extraction?.text) {
        workflow.results.gdt = this.analyzeGDT(workflow.results.extraction.text);
        workflow.stages.push({ name: 'GD&T Analysis', status: 'complete', data: workflow.results.gdt });
      }
      workflow.confidence = this._calculateWorkflowConfidence(workflow);
      workflow.success = true;
      workflow.endTime = Date.now();
      workflow.duration = workflow.endTime - workflow.startTime;
      this.workflowLog.push(workflow);
      (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[ENHANCED_MASTER_ORCHESTRATOR] Processing complete. Confidence:', workflow.confidence + '%');
    } catch (error) {
      console.error('[ENHANCED_MASTER_ORCHESTRATOR] Processing error:', error);
      workflow.error = error.message;
      workflow.success = false;
    }
    return workflow;
  },
  async processWithOCR(file, options = {}) {
    console.log('[ENHANCED_MASTER_ORCHESTRATOR] Starting OCR processing...');
    const result = { text: '', dimensions: [], annotations: [], confidence: 0, source: 'unknown' };
    try {
      const imageData = await this._fileToImageData(file);
      if (typeof Tesseract !== 'undefined') {
        console.log('[ENHANCED_MASTER_ORCHESTRATOR] Using Tesseract.js...');
        const { data } = await Tesseract.recognize(imageData, options.lang || 'eng', { logger: m => console.log('[TESSERACT]', m.status, Math.round(m.progress * 100) + '%') });
        result.text = data.text; result.confidence = data.confidence; result.source = 'tesseract'; result.words = data.words; result.lines = data.lines;
      } else if (typeof ADVANCED_PRINT_READING_ENGINE !== 'undefined' && ADVANCED_PRINT_READING_ENGINE.robustOCR) {
        console.log('[ENHANCED_MASTER_ORCHESTRATOR] Using ADVANCED_PRINT_READING_ENGINE.robustOCR...');
        const ocrResult = await ADVANCED_PRINT_READING_ENGINE.robustOCR.process(imageData, options);
        result.text = ocrResult.text; result.confidence = ocrResult.confidence; result.source = 'advanced_print_engine';
      }
      if (result.text && typeof ADVANCED_PRINT_READING_ENGINE !== 'undefined' && ADVANCED_PRINT_READING_ENGINE.textParser) {
        const parsed = ADVANCED_PRINT_READING_ENGINE.textParser.parseAll(result.text);
        result.dimensions = parsed.dimensions || []; result.annotations = parsed.annotations || [];
        result.tolerances = parsed.tolerances || []; result.threads = parsed.threads || []; result.surfaceFinishes = parsed.surfaceFinishes || [];
      }
    } catch (error) { console.error('[ENHANCED_MASTER_ORCHESTRATOR] OCR error:', error); result.error = error.message; }
    return result;
  },
  async processPDF(file, options = {}) {
    const result = { text: '', pages: [], dimensions: [], annotations: [], confidence: 0, source: 'unknown' };
    try {
      if (typeof pdfjsLib !== 'undefined') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise;
        result.pageCount = pdf.numPages; result.source = 'pdfjs';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          result.text += pageText + '\n';
          result.pages.push({ pageNum: i, text: pageText });
        }
        if (result.text && typeof ADVANCED_PRINT_READING_ENGINE !== 'undefined' && ADVANCED_PRINT_READING_ENGINE.textParser) {
          const parsed = ADVANCED_PRINT_READING_ENGINE.textParser.parseAll(result.text);
          result.dimensions = parsed.dimensions || []; result.annotations = parsed.annotations || [];
        }
        result.confidence = 85;
      } else if (typeof ADVANCED_PRINT_READING_ENGINE !== 'undefined') {
        const engineResult = await ADVANCED_PRINT_READING_ENGINE.analyze(file, options);
        Object.assign(result, engineResult); result.source = 'advanced_print_engine';
      }
    } catch (error) { result.error = error.message; }
    return result;
  },
  async processCAD(file, options = {}) {
    const result = { geometry: null, features: [], dimensions: [], boundingBox: null, confidence: 0, source: 'unknown' };
    try {
      if (typeof ADVANCED_CAD_RECOGNITION_ENGINE !== 'undefined') {
        const engineResult = await ADVANCED_CAD_RECOGNITION_ENGINE.processFile(file, options);
        Object.assign(result, engineResult); result.source = 'cad_recognition_engine'; result.confidence = 90;
      } else if (typeof PRISM_STEP_TO_MESH_KERNEL !== 'undefined') {
        const arrayBuffer = await file.arrayBuffer();
        const text = new TextDecoder().decode(arrayBuffer);
        const mesh = PRISM_STEP_TO_MESH_KERNEL.tessellate(text, options);
        result.geometry = mesh; result.source = 'step_kernel'; result.confidence = 85;
      }
    } catch (error) { result.error = error.message; }
    return result;
  },
  async processMesh(file, options = {}) {
    const result = { geometry: null, triangleCount: 0, boundingBox: null, confidence: 0 };
    try {
      const arrayBuffer = await file.arrayBuffer();
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'stl') {
        const header = new TextDecoder().decode(arrayBuffer.slice(0, 5));
        if (header === 'solid') { result.geometry = this._parseASCIISTL(new TextDecoder().decode(arrayBuffer)); }
        else { result.geometry = this._parseBinarySTL(arrayBuffer); }
        result.confidence = 95;
      }
      if (result.geometry) {
        result.triangleCount = result.geometry.triangles?.length || 0;
        result.boundingBox = this._calculateBoundingBox(result.geometry);
      }
    } catch (error) { result.error = error.message; }
    return result;
  },
  async recognizeFeatures(extractionResult, options = {}) {
    let features = [];
    try {
      if (typeof PRISM_COMPLETE_FEATURE_ENGINE !== 'undefined') {
        if (extractionResult.text) { const f = PRISM_COMPLETE_FEATURE_ENGINE.analyzeText(extractionResult.text); features = features.concat(f.features || []); }
        if (extractionResult.geometry) { const f = PRISM_COMPLETE_FEATURE_ENGINE.analyzeGeometry(extractionResult.geometry); features = features.concat(f.features || []); }
      }
      if (typeof ADVANCED_FEATURE_RECOGNITION_ENGINE !== 'undefined' && extractionResult.geometry) {
        const f = ADVANCED_FEATURE_RECOGNITION_ENGINE.recognize(extractionResult.geometry);
        features = features.concat(f.features || []);
      }
      if (typeof UNIFIED_FEATURE_SYSTEM !== 'undefined' && extractionResult.text) {
        const f = UNIFIED_FEATURE_SYSTEM.analyzePrint(extractionResult);
        features = features.concat(f.features || []);
      }
      // Deduplicate
      const seen = new Set();
      features = features.filter(f => { const key = JSON.stringify({ type: f.type, ...f.params }); if (seen.has(key)) return false; seen.add(key); return true; });
    } catch (error) { console.error('[ENHANCED_MASTER_ORCHESTRATOR] Feature recognition error:', error); }
    return features;
  },
  analyzeSurfaceFinish(text, annotations = []) {
    const results = { finishes: [], defaultFinish: null, recommendations: [] };
    try {
      if (typeof SURFACE_FINISH_PARSER !== 'undefined') {
        if (SURFACE_FINISH_PARSER.parseEnhanced) {
          const parsed = SURFACE_FINISH_PARSER.parseEnhanced(text);
          if (parsed.ra || parsed.n_number) {
            results.finishes.push(parsed);
            if (SURFACE_FINISH_PARSER.getToolpathRecommendation) results.recommendations.push(SURFACE_FINISH_PARSER.getToolpathRecommendation(parsed));
          }
        } else if (SURFACE_FINISH_PARSER.parse) {
          const parsed = SURFACE_FINISH_PARSER.parse(text);
          if (parsed) results.finishes.push(parsed);
        }
        for (const annotation of annotations) {
          if (typeof annotation === 'string') {
            const parsed = SURFACE_FINISH_PARSER.parseEnhanced?.(annotation) || SURFACE_FINISH_PARSER.parse?.(annotation);
            if (parsed && (parsed.ra || parsed.n_number)) results.finishes.push(parsed);
          }
        }
      }
      if (results.finishes.length > 0) {
        const raValues = results.finishes.filter(f => f.ra).map(f => f.ra);
        if (raValues.length > 0) results.defaultFinish = { ra: Math.min(...raValues), type: 'strictest' };
      }
    } catch (error) { console.error('[ENHANCED_MASTER_ORCHESTRATOR] Surface finish analysis error:', error); }
    return results;
  },
  analyzeGDT(text) {
    const results = { tolerances: [], datums: [], featureControlFrames: [], confidence: 0 };
    try {
      const gdtPatterns = {
        flatness: /⏥|flatness\s*([\d.]+)/gi, straightness: /⏤|straightness\s*([\d.]+)/gi,
        circularity: /○|circularity\s*([\d.]+)/gi, cylindricity: /⌭|cylindricity\s*([\d.]+)/gi,
        perpendicularity: /⏊|perpendicularity\s*([\d.]+)/gi, parallelism: /∥|parallelism\s*([\d.]+)/gi,
        angularity: /∠|angularity\s*([\d.]+)/gi, position: /⌖|true\s*position\s*([\d.]+)/gi,
        concentricity: /◎|concentricity\s*([\d.]+)/gi, symmetry: /⌯|symmetry\s*([\d.]+)/gi,
        runout: /↗|runout\s*([\d.]+)/gi, totalRunout: /⌰|total\s*runout\s*([\d.]+)/gi,
        profileLine: /⌒|profile\s*of\s*line\s*([\d.]+)/gi, profileSurface: /⌓|profile\s*of\s*surface\s*([\d.]+)/gi
      };
      for (const [type, pattern] of Object.entries(gdtPatterns)) {
        const matches = text.matchAll(pattern);
        for (const match of matches) results.tolerances.push({ type, value: parseFloat(match[1]) || 0, raw: match[0] });
      }
      const datumPattern = /datum\s*([A-Z])|\[([A-Z])\]|-([A-Z])-/gi;
      const datumMatches = text.matchAll(datumPattern);
      for (const match of datumMatches) {
        const datum = match[1] || match[2] || match[3];
        if (datum && !results.datums.includes(datum)) results.datums.push(datum);
      }
      results.confidence = results.tolerances.length > 0 ? 85 : 0;
      if (typeof GDT_ENGINE !== 'undefined' && GDT_ENGINE.parse) {
        const engineResult = GDT_ENGINE.parse(text);
        if (engineResult) {
          results.tolerances = results.tolerances.concat(engineResult.tolerances || []);
          results.datums = [...new Set([...results.datums, ...(engineResult.datums || [])])];
          results.confidence = Math.max(results.confidence, engineResult.confidence || 0);
        }
      }
    } catch (error) { console.error('[ENHANCED_MASTER_ORCHESTRATOR] GD&T analysis error:', error); }
    return results;
  },
  _fileToImageData(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = (e) => resolve(e.target.result); reader.onerror = reject; reader.readAsDataURL(file); }); },

  _parseASCIISTL(text) {
    const triangles = []; const lines = text.split('\n'); let currentTriangle = null;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('facet normal')) {
        const parts = trimmed.split(/\s+/);
        currentTriangle = { normal: { x: parseFloat(parts[2]), y: parseFloat(parts[3]), z: parseFloat(parts[4]) }, vertices: [] };
      } else if (trimmed.startsWith('vertex')) {
        const parts = trimmed.split(/\s+/);
        currentTriangle.vertices.push({ x: parseFloat(parts[1]), y: parseFloat(parts[2]), z: parseFloat(parts[3]) });
      } else if (trimmed === 'endfacet' && currentTriangle) { triangles.push(currentTriangle); currentTriangle = null; }
    }
    return { triangles };
  },
  _parseBinarySTL(buffer) {
    const dataView = new DataView(buffer);
    const triangleCount = dataView.getUint32(80, true);
    const triangles = [];
    let offset = 84;
    for (let i = 0; i < triangleCount; i++) {
      const triangle = { normal: { x: dataView.getFloat32(offset, true), y: dataView.getFloat32(offset + 4, true), z: dataView.getFloat32(offset + 8, true) }, vertices: [] };
      offset += 12;
      for (let j = 0; j < 3; j++) {
        triangle.vertices.push({ x: dataView.getFloat32(offset, true), y: dataView.getFloat32(offset + 4, true), z: dataView.getFloat32(offset + 8, true) });
        offset += 12;
      }
      offset += 2; triangles.push(triangle);
    }
    return { triangles };
  },
  _calculateBoundingBox(geometry) {
    if (!geometry?.triangles?.length) return null;
    const box = { min: { x: Infinity, y: Infinity, z: Infinity }, max: { x: -Infinity, y: -Infinity, z: -Infinity } };
    for (const triangle of geometry.triangles) {
      for (const vertex of triangle.vertices) {
        box.min.x = Math.min(box.min.x, vertex.x); box.min.y = Math.min(box.min.y, vertex.y); box.min.z = Math.min(box.min.z, vertex.z);
        box.max.x = Math.max(box.max.x, vertex.x); box.max.y = Math.max(box.max.y, vertex.y); box.max.z = Math.max(box.max.z, vertex.z);
      }
    }
    box.size = { x: box.max.x - box.min.x, y: box.max.y - box.min.y, z: box.max.z - box.min.z };
    return box;
  },
  _calculateWorkflowConfidence(workflow) {
    const confs = workflow.stages.map(s => s.data?.confidence || 80);
    return confs.length > 0 ? Math.round(confs.reduce((a, b) => a + b, 0) / confs.length) : 0;
  }
};
// PRISM_FILE_UPLOAD_INTEGRATION v1.0
// Connects UI file upload handlers to PRISM processing engines
const PRISM_FILE_UPLOAD_INTEGRATION = {
  version: '1.0.0',

  init() {
    console.log('[FILE_UPLOAD_INTEGRATION] v1.0 Initializing...');

    if (typeof extractFromImage === 'function') window._originalExtractFromImage = extractFromImage;
    window.extractFromImage = async function() {
      console.log('[FILE_UPLOAD_INTEGRATION] Processing image...');
      const fileInput = document.querySelector('input[type="file"]');
      const file = fileInput?.files?.[0];
      if (!file) { alert('Please select an image file first.'); return; }

      const statusEl = document.getElementById('processingStatus') || document.createElement('div');
      statusEl.id = 'processingStatus';
      statusEl.innerHTML = '<div style="padding:10px;background:#3b82f6;color:white;border-radius:4px;position:fixed;top:10px;right:10px;z-index:9999;">PRISM AI is analyzing the image...</div>';
      document.body.appendChild(statusEl);

      try {
        let result;
        if (typeof PRISM_ENHANCED_MASTER_ORCHESTRATOR !== 'undefined') result = await PRISM_ENHANCED_MASTER_ORCHESTRATOR.processFile(file, { enableOCR: true, generate3D: true });
        else if (typeof ADVANCED_PRINT_READING_ENGINE !== 'undefined') result = await ADVANCED_PRINT_READING_ENGINE.analyze(file);
        if (result) {
          PRISM_FILE_UPLOAD_INTEGRATION.applyExtractionResults(result);
          statusEl.innerHTML = '<div style="padding:10px;background:#10b981;color:white;border-radius:4px;position:fixed;top:10px;right:10px;z-index:9999;">✓ Analysis complete! Dimensions extracted.</div>';
        }
        setTimeout(() => statusEl.remove(), 3000);
      } catch (error) {
        statusEl.innerHTML = '<div style="padding:10px;background:#ef4444;color:white;border-radius:4px;position:fixed;top:10px;right:10px;z-index:9999;">Error: ' + error.message + '</div>';
        setTimeout(() => statusEl.remove(), 5000);
      }
    };
    if (typeof extractFromPdf === 'function') window._originalExtractFromPdf = extractFromPdf;
    window.extractFromPdf = async function() {
      console.log('[FILE_UPLOAD_INTEGRATION] Processing PDF...');
      const fileInput = document.querySelector('input[type="file"]');
      const file = fileInput?.files?.[0];
      if (!file) { alert('Please select a PDF file first.'); return; }

      const statusEl = document.getElementById('processingStatus') || document.createElement('div');
      statusEl.id = 'processingStatus';
      statusEl.innerHTML = '<div style="padding:10px;background:#3b82f6;color:white;border-radius:4px;position:fixed;top:10px;right:10px;z-index:9999;">PRISM AI is analyzing the PDF...</div>';
      document.body.appendChild(statusEl);

      try {
        let result;
        if (typeof PRISM_ENHANCED_MASTER_ORCHESTRATOR !== 'undefined') result = await PRISM_ENHANCED_MASTER_ORCHESTRATOR.processFile(file, { enableOCR: true, generate3D: true });
        else if (typeof ADVANCED_PRINT_READING_ENGINE !== 'undefined') result = await ADVANCED_PRINT_READING_ENGINE.analyze(file);
        if (result) {
          PRISM_FILE_UPLOAD_INTEGRATION.applyExtractionResults(result);
          statusEl.innerHTML = '<div style="padding:10px;background:#10b981;color:white;border-radius:4px;position:fixed;top:10px;right:10px;z-index:9999;">✓ PDF analysis complete!</div>';
        }
        setTimeout(() => statusEl.remove(), 3000);
      } catch (error) {
        statusEl.innerHTML = '<div style="padding:10px;background:#ef4444;color:white;border-radius:4px;position:fixed;top:10px;right:10px;z-index:9999;">Error: ' + error.message + '</div>';
        setTimeout(() => statusEl.remove(), 5000);
      }
    };
    console.log('[FILE_UPLOAD_INTEGRATION] v1.0 Ready');
  },
  applyExtractionResults(result) {
    console.log('[FILE_UPLOAD_INTEGRATION] Applying extraction results...');
    let dimensions = null;
    if (result.results?.extraction?.boundingBox) dimensions = result.results.extraction.boundingBox;
    else if (result.results?.extraction?.dimensions?.length >= 3) {
      dimensions = { x: result.results.extraction.dimensions[0]?.value, y: result.results.extraction.dimensions[1]?.value, z: result.results.extraction.dimensions[2]?.value };
    } else if (result.boundingBox) dimensions = result.boundingBox;

    if (dimensions) {
      const dimX = document.getElementById('modelDimX'), dimY = document.getElementById('modelDimY'), dimZ = document.getElementById('modelDimZ');
      if (dimX) dimX.textContent = (dimensions.x || 0).toFixed(3) + '"';
      if (dimY) dimY.textContent = (dimensions.y || 0).toFixed(3) + '"';
      if (dimZ) dimZ.textContent = (dimensions.z || 0).toFixed(3) + '"';
      if (typeof modelBounds !== 'undefined') { modelBounds.x = dimensions.x || modelBounds.x; modelBounds.y = dimensions.y || modelBounds.y; modelBounds.z = dimensions.z || modelBounds.z; }
      if (typeof updateViewerStock === 'function') updateViewerStock();
      if (typeof createModelMesh === 'function') createModelMesh(dimensions.x, dimensions.y, dimensions.z);
      console.log('[FILE_UPLOAD_INTEGRATION] Applied dimensions:', dimensions);
    }
    if (result.results?.surfaceFinish?.finishes?.length > 0) {
      const surfaceFinish = result.results.surfaceFinish.finishes[0];
      const finishInput = document.getElementById('surfaceFinish') || document.getElementById('finishRa');
      if (finishInput && surfaceFinish.ra) { finishInput.value = surfaceFinish.ra; console.log('[FILE_UPLOAD_INTEGRATION] Applied surface finish:', surfaceFinish.ra); }
    }
    if (typeof PRISM_EVENT_MANAGER !== 'undefined') PRISM_EVENT_MANAGER.emit('file:processed', result);
  }
};
// PRISM_3D_VISUALIZATION_PIPELINE v1.0
// Enhanced 3D visualization with feature highlighting and toolpath display
const PRISM_3D_VISUALIZATION_PIPELINE = {
  version: '1.0.0',
  settings: { showFeatures: true, showDimensions: true, showToolpaths: true, highlightColor: 0x00ff00, selectionColor: 0xff6600, featureColors: { hole: 0xff0000, pocket: 0x00ff00, slot: 0x0000ff, boss: 0xffff00, thread: 0xff00ff }, quality: 'high' },
  components: { scene: null, camera: null, renderer: null, controls: null, lights: [], meshes: {}, helpers: [] },

  init() {
    console.log('[3D_VISUALIZATION_PIPELINE] v1.0 Initializing...');
    if (typeof scene !== 'undefined') this.components.scene = scene;
    if (typeof camera !== 'undefined') this.components.camera = camera;
    if (typeof renderer !== 'undefined') this.components.renderer = renderer;
    this._enhanceExistingSystems();
    window.PRISM_3D = this;
    window.show3DFeatures = (features) => this.visualizeFeatures(features);
    window.highlight3DFeature = (feature) => this.highlightFeature(feature);
    window.show3DToolpath = (toolpath) => this.visualizeToolpath(toolpath);
    console.log('[3D_VISUALIZATION_PIPELINE] v1.0 Ready');
    return this;
  },
  _enhanceExistingSystems() {
    if (typeof ULTIMATE_3D_MACHINE_SYSTEM !== 'undefined') { ULTIMATE_3D_MACHINE_SYSTEM.pipeline = this; console.log('[3D_VISUALIZATION_PIPELINE] ✓ Connected ULTIMATE_3D_MACHINE_SYSTEM'); }
    if (typeof PRISM_TOOL_3D_GENERATOR !== 'undefined') {
      PRISM_TOOL_3D_GENERATOR.materials = { carbide: { color: 0x606060, metalness: 0.8, roughness: 0.2 }, hss: { color: 0x808080, metalness: 0.7, roughness: 0.3 }, coating_tin: { color: 0xd4af37, metalness: 0.9, roughness: 0.1 }, coating_tialn: { color: 0x4a148c, metalness: 0.9, roughness: 0.15 }, coating_altin: { color: 0x1a237e, metalness: 0.85, roughness: 0.2 } };
      console.log('[3D_VISUALIZATION_PIPELINE] ✓ Enhanced PRISM_TOOL_3D_GENERATOR');
    }
  },
  visualizeFeatures(features) {
    if (!this.components.scene || typeof THREE === 'undefined') return;
    this.clearFeatureVisualizations();
    const featureGroup = new THREE.Group(); featureGroup.name = 'featureVisualization';
    for (const feature of features) { const mesh = this.createFeatureMesh(feature); if (mesh) { mesh.userData.feature = feature; featureGroup.add(mesh); } }
    this.components.scene.add(featureGroup); this.components.meshes.features = featureGroup;
    return featureGroup;
  },
  createFeatureMesh(feature) {
    if (typeof THREE === 'undefined') return null;
    const color = this.settings.featureColors[feature.type] || 0x999999;
    const material = new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    let geometry;
    switch (feature.type) {
      case 'hole': geometry = new THREE.CylinderGeometry(feature.params?.diameter/2 || 0.25, feature.params?.diameter/2 || 0.25, feature.params?.depth || 1, 32); break;
      case 'pocket': geometry = new THREE.BoxGeometry(feature.params?.width || 1, feature.params?.depth || 0.5, feature.params?.length || 1); break;
      case 'slot': geometry = new THREE.BoxGeometry(feature.params?.length || 2, feature.params?.depth || 0.25, feature.params?.width || 0.5); break;
      case 'boss': geometry = new THREE.CylinderGeometry(feature.params?.diameter/2 || 0.5, feature.params?.diameter/2 || 0.5, feature.params?.height || 0.5, 32); break;
      default: geometry = new THREE.SphereGeometry(0.25, 16, 16);
    }
    const mesh = new THREE.Mesh(geometry, material);
    if (feature.position) mesh.position.set(feature.position.x || 0, feature.position.y || 0, feature.position.z || 0);
    return mesh;
  },
  highlightFeature(feature) {
    const featureGroup = this.components.meshes.features; if (!featureGroup) return;
    featureGroup.traverse(child => { if (child.isMesh && child.material) child.material.emissive = new THREE.Color(0x000000); });
    featureGroup.traverse(child => { if (child.isMesh && child.userData.feature === feature) child.material.emissive = new THREE.Color(this.settings.highlightColor); });
  },
  clearFeatureVisualizations() { if (this.components.meshes.features && this.components.scene) { this.components.scene.remove(this.components.meshes.features); this.components.meshes.features = null; } },

  visualizeToolpath(toolpath, options = {}) {
    if (!this.components.scene || typeof THREE === 'undefined') return;
    this.clearToolpathVisualization();
    const toolpathGroup = new THREE.Group(); toolpathGroup.name = 'toolpathVisualization';
    const rapidMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 1, transparent: true, opacity: 0.5 });
    const cuttingMaterial = new THREE.LineBasicMaterial({ color: options.color || 0x00ff00, linewidth: 2 });
    const rapidPoints = [], cuttingPoints = [];
    const moves = toolpath.moves || toolpath.points || toolpath;
    if (Array.isArray(moves)) {
      for (let i = 0; i < moves.length - 1; i++) {
        const p1 = moves[i], p2 = moves[i + 1];
        const v1 = new THREE.Vector3(p1.x, p1.z, p1.y), v2 = new THREE.Vector3(p2.x, p2.z, p2.y);
        if (p2.rapid || p2.isRapid) rapidPoints.push(v1, v2); else cuttingPoints.push(v1, v2);
      }
    }
    if (rapidPoints.length > 0) { const g = new THREE.BufferGeometry().setFromPoints(rapidPoints); toolpathGroup.add(new THREE.LineSegments(g, rapidMaterial)); }
    if (cuttingPoints.length > 0) { const g = new THREE.BufferGeometry().setFromPoints(cuttingPoints); toolpathGroup.add(new THREE.LineSegments(g, cuttingMaterial)); }
    this.components.scene.add(toolpathGroup); this.components.meshes.toolpath = toolpathGroup;
    return toolpathGroup;
  },
  clearToolpathVisualization() { if (this.components.meshes.toolpath && this.components.scene) { this.components.scene.remove(this.components.meshes.toolpath); this.components.meshes.toolpath = null; } },

  addEnhancedLighting() {
    if (!this.components.scene || typeof THREE === 'undefined') return;
    for (const light of this.components.lights) this.components.scene.remove(light); this.components.lights = [];
    const ambient = new THREE.AmbientLight(0x404040, 0.5); this.components.scene.add(ambient); this.components.lights.push(ambient);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8); keyLight.position.set(5, 10, 5); this.components.scene.add(keyLight); this.components.lights.push(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3); fillLight.position.set(-5, 5, -5); this.components.scene.add(fillLight); this.components.lights.push(fillLight);
  }
};
// INITIALIZATION
(function initPRISMEnhancements() {
  function doInit() {
    setTimeout(() => PRISM_ENHANCED_MASTER_ORCHESTRATOR.init(), 3500);
    setTimeout(() => PRISM_FILE_UPLOAD_INTEGRATION.init(), 3600);
    setTimeout(() => PRISM_3D_VISUALIZATION_PIPELINE.init(), 3700);
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM v8.87.001] Enhanced Orchestration & Integration modules loaded');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', doInit);
  else doInit();
})();

// PRISM v8.87.001 - ENHANCED 3D MACHINE CAD & INTELLIGENT COLLISION SYSTEM
// Added: 35 Okuma machine CAD models, STEP Assembly Parser, Intelligent Collision
//        Zone Detection, Kinematic Chain Extractor, Real CAD Priority System
// Date: January 2026

// PRISM_OKUMA_MACHINE_CAD_DATABASE v1.0
// 35 Okuma machine models from uploaded STEP files
const PRISM_OKUMA_MACHINE_CAD_DATABASE = {
  version: '1.0.0',
  manufacturer: 'OKUMA',
  modelCount: 35,
  source: 'Uploaded CAD Files',
  priority: 'uploaded_cad',

  machines: {
    'okuma_genos_m460_ve_e': {
      manufacturer: 'OKUMA', source: 'OKUMA GENOS M460-VE-e.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 3953600, facesEstimate: 8 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "z axis head:1", "y axis table:1", "x axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_genos_m560_v_e': {
      manufacturer: 'OKUMA', source: 'OKUMA GENOS M560-V-e.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 3490664, facesEstimate: 4 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "z axis head (1):1", "y axis table:1", "x axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_genos_m560_va_hc': {
      manufacturer: 'OKUMA', source: 'OKUMA GENOS M560-VA-HC.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 6736475, facesEstimate: 3 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["Base:1", "Enclosure:1", "X-Axis:1", "Y-Axis:1", "Z-Axis:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_genos_m660_va': {
      manufacturer: 'OKUMA', source: 'OKUMA GENOS M660-VA.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 4352805, facesEstimate: 0 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "y_axis_table:1", "x_axis_head:1", "z_axis_head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_genos_m660_vb': {
      manufacturer: 'OKUMA', source: 'OKUMA GENOS M660-VB.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 4321652, facesEstimate: 0 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "y_axis_table:1", "x_axis_head:1", "z_axis_head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_ma_500hii': {
      manufacturer: 'OKUMA', source: 'OKUMA MA-500HII.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1202994, facesEstimate: 0 },
      specs: { type: '4AXIS_HMC' },
      assemblies: ["static:1", "b axis table:1", "x axis head:1", "y axis head:1", "z axis table:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_ma_550vb': {
      manufacturer: 'OKUMA', source: 'OKUMA MA-550VB.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1474783, facesEstimate: 0 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "x axis table:1", "y axis head:1", "z axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_ma_600h': {
      manufacturer: 'OKUMA', source: 'OKUMA MA-600H.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1440815, facesEstimate: 0 },
      specs: { type: '4AXIS_HMC' },
      assemblies: ["static:1", "z axis table:1", "b axis table:1", "x axis head:1", "y axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_ma_600hii': {
      manufacturer: 'OKUMA', source: 'OKUMA MA-600HII.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1991944, facesEstimate: 0 },
      specs: { type: '4AXIS_HMC' },
      assemblies: ["static:1", "z axis table:1", "b axis table:1", "x axis head:1", "y axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_ma_650vb': {
      manufacturer: 'OKUMA', source: 'OKUMA MA-650VB.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1544962, facesEstimate: 0 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "x axis table:1", "z axis head:1", "y axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mb_4000h': {
      manufacturer: 'OKUMA', source: 'OKUMA MB-4000H.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1615051, facesEstimate: 14 },
      specs: { type: '4AXIS_HMC' },
      assemblies: ["static:1", "x axis head:1", "y axis head:1", "z axis table:1", "b axis table:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mb_46vae': {
      manufacturer: 'OKUMA', source: 'OKUMA MB-46VAE.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 2421514, facesEstimate: 6 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "y axis table:1", "z axis head:1", "x axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mb_5000h': {
      manufacturer: 'OKUMA', source: 'OKUMA MB-5000H.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1645688, facesEstimate: 14 },
      specs: { type: '4AXIS_HMC' },
      assemblies: ["static:1", "y axis head:1", "x axis head:1", "z axis table:1", "b axis table:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mb_56va': {
      manufacturer: 'OKUMA', source: 'OKUMA MB-56VA.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 865762, facesEstimate: 6 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["y axis table:1", "static:1", "z axis head:1", "x axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mb_66va': {
      manufacturer: 'OKUMA', source: 'OKUMA MB-66VA.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1311818, facesEstimate: 6 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "y axis table:1", "x axis table:1", "z axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mb_8000h': {
      manufacturer: 'OKUMA', source: 'OKUMA MB-8000H.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 2222609, facesEstimate: 2 },
      specs: { type: '4AXIS_HMC' },
      assemblies: ["static:1", "z axis table:1", "b axis table:1", "x axis head:1", "y axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mcr_a5cii_25x40': {
      manufacturer: 'OKUMA', source: 'OKUMA MCR-A5CII 25x40.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 709658, facesEstimate: 33 },
      specs: { type: 'DOUBLE_COLUMN' },
      assemblies: ["static:1", "x_axis_table:1", "y_axis_head:1", "z_axis_head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mcr_biii_25e_25x40': {
      manufacturer: 'OKUMA', source: 'OKUMA MCR-BIII 25E 25x40.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1278590, facesEstimate: 33 },
      specs: { type: 'DOUBLE_COLUMN' },
      assemblies: ["static:1", "x_axis_table:1", "y_axis_head:1", "z_axis_head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mcr_biii_25e_25x50': {
      manufacturer: 'OKUMA', source: 'OKUMA MCR-BIII 25E 25x50.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1353469, facesEstimate: 33 },
      specs: { type: 'DOUBLE_COLUMN' },
      assemblies: ["static:1", "x_axis_head:1", "y_axis_head:1", "z_axis_head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mcr_biii_35e_35x65': {
      manufacturer: 'OKUMA', source: 'OKUMA MCR-BIII 35E 35x65.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1495191, facesEstimate: 32 },
      specs: { type: 'DOUBLE_COLUMN' },
      assemblies: ["static:1", "x_axis_table:1", "y_axis_head:1", "z_axis_head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_millac_1052vii': {
      manufacturer: 'OKUMA', source: 'OKUMA MILLAC 1052VII.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1128685, facesEstimate: 0 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "z axis head:1", "x axis table:1", "y axis table:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_millac_33t': {
      manufacturer: 'OKUMA', source: 'OKUMA MILLAC 33T.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 963103, facesEstimate: 0 },
      specs: { type: '5AXIS_TRUNNION' },
      assemblies: ["static:1", "y axis head:1", "x axis head:1", "z axis head:1", "c axis table:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_millac_761vii': {
      manufacturer: 'OKUMA', source: 'OKUMA MILLAC 761VII.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1734668, facesEstimate: 8 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "z axis head:1", "x axis table:1", "y axis table:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_millac_800vh': {
      manufacturer: 'OKUMA', source: 'OKUMA MILLAC 800VH.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1813208, facesEstimate: 0 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "c_axis_table:1", "y_axis_table:1", "x_axis_head:1", "z_axis_head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_millac_852vii': {
      manufacturer: 'OKUMA', source: 'OKUMA MILLAC 852VII.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1247917, facesEstimate: 0 },
      specs: { type: '3AXIS_VMC' },
      assemblies: ["static:1", "y axis table:1", "x axis table:1", "z axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mu_4000v': {
      manufacturer: 'OKUMA', source: 'OKUMA MU-4000V.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 4831784, facesEstimate: 12 },
      specs: { type: '5AXIS_TRUNNION' },
      assemblies: ["static:1", "b_axis_table:1", "c_axis_table:1", "x_axis_head:1", "y_axis_head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mu_400va': {
      manufacturer: 'OKUMA', source: 'OKUMA MU-400VA.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 3472840, facesEstimate: 8 },
      specs: { type: '5AXIS_TRUNNION' },
      assemblies: ["static:1", "a axis table:1", "c axis table:1", "y axis table:1", "x axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mu_5000v': {
      manufacturer: 'OKUMA', source: 'OKUMA MU-5000V.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 8056755, facesEstimate: 5 },
      specs: { type: '5AXIS_TRUNNION' },
      assemblies: ["static:1", "x_axis_table:1", "a_axis_table:1", "c_axis_table:1", "y_axis_head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mu_500va': {
      manufacturer: 'OKUMA', source: 'OKUMA MU-500VA.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 4547921, facesEstimate: 0 },
      specs: { type: '5AXIS_TRUNNION' },
      assemblies: ["static:1", "y axis table:1", "c axis table:1", "a axis table:1", "x axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mu_500val': {
      manufacturer: 'OKUMA', source: 'OKUMA MU-500VAL.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1926397, facesEstimate: 0 },
      specs: { type: '5AXIS_TRUNNION' },
      assemblies: ["static:1", "y axis table:1", "a axis table:1", "c axis table:1", "x axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mu_6300v': {
      manufacturer: 'OKUMA', source: 'OKUMA MU-6300V.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 7035407, facesEstimate: 8 },
      specs: { type: '5AXIS_TRUNNION' },
      assemblies: ["static:1", "x_axis_table:1", "a_axis_table:1", "c_axis_table:1", "z_axis_head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_mu_8000v': {
      manufacturer: 'OKUMA', source: 'OKUMA MU-8000V.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 5904083, facesEstimate: 2 },
      specs: { type: '5AXIS_TRUNNION' },
      assemblies: ["static:1", "x axis table:1", "a axis table:1", "c axis table:1", "y axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_vtm_1200yb': {
      manufacturer: 'OKUMA', source: 'OKUMA VTM-1200YB.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1778198, facesEstimate: 0 },
      specs: { type: 'VTL_MILL_TURN' },
      assemblies: ["table1250 v1:1", "static:1", "c axis table:1", "x axis head:1", "z axis head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_vtm_2000yb': {
      manufacturer: 'OKUMA', source: 'OKUMA VTM-2000YB.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 8808466, facesEstimate: 0 },
      specs: { type: 'VTL_MILL_TURN' },
      assemblies: ["static:1", "c_axis_table:1", "x_axis_head:1", "z_axis_head:1", "y_axis_head:1"],
      collisionZones: 'auto_detected'
    },
    'okuma_vtm_80yb': {
      manufacturer: 'OKUMA', source: 'OKUMA VTM-80YB.step', confidence: 0.98, priority: 'uploaded_cad',
      geometry: { fileSize: 1223120, facesEstimate: 0 },
      specs: { type: 'VTL_MILL_TURN' },
      assemblies: ["static:1", "x axis head:1", "z axis head:1", "y axis head:1", "b axis head:1"],
      collisionZones: 'auto_detected'
    }
  },
  getMachine(modelId) {
    const key = modelId.toLowerCase().replace(/-/g, '_').replace(/ /g, '_');
    return this.machines[key] || this.machines['okuma_' + key] || null;
  },
  listMachines() {
    return Object.keys(this.machines).map(k => ({ id: k, ...this.machines[k] }));
  },
  getByType(machineType) {
    return Object.entries(this.machines)
      .filter(([k, v]) => v.specs.type === machineType)
      .map(([k, v]) => ({ id: k, ...v }));
  }
};
// PRISM_STEP_ASSEMBLY_PARSER v1.0
// Parses STEP files to extract assembly structure for collision detection
const PRISM_STEP_ASSEMBLY_PARSER = {
  version: '1.0.0',

  // Component name patterns for collision zone identification
  collisionZonePatterns: {
    static: /static|base|frame|enclosure|guard|door|cover|sheet.*metal/i,
    spindle: /spindle|head|z.*axis.*head|quill/i,
    xAxis: /x.*axis|column|saddle|carriage/i,
    yAxis: /y.*axis|cross.*slide|knee/i,
    zAxis: /z.*axis|ram|slide/i,
    aAxis: /a.*axis|tilt|trunnion/i,
    bAxis: /b.*axis|rotary|index|pallet/i,
    cAxis: /c.*axis|table.*rotate/i,
    table: /table|work.*table|pallet|fixture/i,
    tool: /tool|holder|collet|chuck|arbor/i,
    toolchanger: /atc|tool.*change|magazine|carousel|turret/i,
    coolant: /coolant|nozzle|chip|conveyor/i
  },
  // Collision priority (lower = check first, higher priority for avoidance)
  collisionPriority: {
    spindle: 1,      // Highest priority - never collide
    tool: 2,
    table: 3,
    workpiece: 4,
    fixture: 5,
    xAxis: 6,
    yAxis: 7,
    zAxis: 8,
    aAxis: 9,
    bAxis: 10,
    cAxis: 11,
    toolchanger: 12,
    static: 20,      // Enclosure - low priority but still check
    coolant: 50      // Lowest - usually ignored
  },
  /**
   * Parse STEP file content to extract assembly structure
   */
  parseAssemblyStructure(stepContent) {
    const result = {
      assemblies: [],
      products: [],
      shapes: [],
      kinematicChain: [],
      collisionZones: [],
      boundingBoxes: {}
    };
    // Extract NEXT_ASSEMBLY_USAGE_OCCURRENCE entries
    const assemblyRegex = /NEXT_ASSEMBLY_USAGE_OCCURRENCE\s*\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*#(\d+)\s*,\s*#(\d+)/g;
    let match;
    while ((match = assemblyRegex.exec(stepContent)) !== null) {
      const assembly = {
        id: match[1],
        name: match[2],
        description: match[3],
        parentRef: parseInt(match[4]),
        childRef: parseInt(match[5]),
        collisionZone: this._identifyCollisionZone(match[2]),
        priority: this._getCollisionPriority(match[2])
      };
      result.assemblies.push(assembly);
    }
    // Extract PRODUCT definitions
    const productRegex = /PRODUCT\s*\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'/g;
    while ((match = productRegex.exec(stepContent)) !== null) {
      result.products.push({
        id: match[1],
        name: match[2],
        description: match[3]
      });
    }
    // Extract SHAPE_REPRESENTATION entries
    const shapeRegex = /ADVANCED_BREP_SHAPE_REPRESENTATION\s*\(\s*'([^']*)'\s*,\s*\(([^)]+)\)/g;
    while ((match = shapeRegex.exec(stepContent)) !== null) {
      const refs = match[2].split(',').map(r => parseInt(r.replace('#', '').trim())).filter(n => !isNaN(n));
      result.shapes.push({
        name: match[1],
        entityCount: refs.length,
        refs: refs.slice(0, 20) // First 20 refs
      });
    }
    // Build kinematic chain from assemblies
    result.kinematicChain = this._buildKinematicChain(result.assemblies);

    // Generate collision zones
    result.collisionZones = this._generateCollisionZones(result.assemblies);

    return result;
  },
  /**
   * Identify collision zone from component name
   */
  _identifyCollisionZone(name) {
    for (const [zone, pattern] of Object.entries(this.collisionZonePatterns)) {
      if (pattern.test(name)) {
        return zone;
      }
    }
    return 'unknown';
  },
  /**
   * Get collision priority for a component
   */
  _getCollisionPriority(name) {
    const zone = this._identifyCollisionZone(name);
    return this.collisionPriority[zone] || 100;
  },
  /**
   * Build kinematic chain from assembly structure
   */
  _buildKinematicChain(assemblies) {
    const chain = [];
    const axisOrder = ['static', 'xAxis', 'yAxis', 'zAxis', 'aAxis', 'bAxis', 'cAxis', 'spindle', 'tool'];

    for (const axis of axisOrder) {
      const component = assemblies.find(a => a.collisionZone === axis);
      if (component) {
        chain.push({
          name: component.name,
          type: axis,
          ref: component.childRef,
          parent: component.parentRef
        });
      }
    }
    return chain;
  },
  /**
   * Generate collision zones with constraints
   */
  _generateCollisionZones(assemblies) {
    return assemblies
      .filter(a => a.collisionZone !== 'unknown' && a.collisionZone !== 'coolant')
      .map(a => ({
        name: a.name,
        zone: a.collisionZone,
        priority: a.priority,
        constraints: this._getZoneConstraints(a.collisionZone),
        checkAgainst: this._getCollisionCheckList(a.collisionZone)
      }))
      .sort((a, b) => a.priority - b.priority);
  },
  /**
   * Get constraints for a collision zone
   */
  _getZoneConstraints(zone) {
    const constraints = {
      spindle: { alwaysCheck: true, criticalZone: true, minClearance: 0.5 },
      tool: { alwaysCheck: true, criticalZone: true, minClearance: 0.1 },
      table: { alwaysCheck: true, criticalZone: true, minClearance: 0.25 },
      xAxis: { checkDuringRapid: true, minClearance: 1.0 },
      yAxis: { checkDuringRapid: true, minClearance: 1.0 },
      zAxis: { checkDuringRapid: true, minClearance: 1.0 },
      aAxis: { checkDuringRotation: true, minClearance: 0.5, checkSwingRadius: true },
      bAxis: { checkDuringRotation: true, minClearance: 0.5, checkSwingRadius: true },
      cAxis: { checkDuringRotation: true, minClearance: 0.5, checkSwingRadius: true },
      static: { checkAtSetup: true, minClearance: 2.0 },
      toolchanger: { checkDuringToolChange: true, minClearance: 1.0 }
    };
    return constraints[zone] || { minClearance: 1.0 };
  },
  /**
   * Get list of zones to check collision against
   */
  _getCollisionCheckList(zone) {
    const checkLists = {
      tool: ['table', 'workpiece', 'fixture', 'static', 'aAxis', 'bAxis'],
      spindle: ['table', 'workpiece', 'fixture', 'static', 'toolchanger'],
      table: ['tool', 'spindle', 'static'],
      aAxis: ['tool', 'spindle', 'static'],
      bAxis: ['tool', 'spindle', 'static', 'aAxis'],
      xAxis: ['static'],
      yAxis: ['static'],
      zAxis: ['table', 'static']
    };
    return checkLists[zone] || ['static'];
  }
};
// PRISM_INTELLIGENT_COLLISION_SYSTEM v2.0
// Enhanced collision detection using real CAD geometry
const PRISM_INTELLIGENT_COLLISION_SYSTEM = {
  version: '3.0.0',

  // Loaded machine models with collision data
  loadedMachines: {},

  // Active collision checks
  activeChecks: [],

  /**
   * Initialize collision system for a machine
   */
  async initForMachine(machineId, stepFilePath) {
    console.log('[INTELLIGENT_COLLISION] Initializing for:', machineId);

    let machineData = null;

    // Check Okuma database first
    if (typeof PRISM_OKUMA_MACHINE_CAD_DATABASE !== 'undefined') {
      machineData = PRISM_OKUMA_MACHINE_CAD_DATABASE.getMachine(machineId);
    }
    // Check main learning engine
    if (!machineData && typeof PRISM_MACHINE_3D_LEARNING_ENGINE !== 'undefined') {
      machineData = PRISM_MACHINE_3D_LEARNING_ENGINE.learnedDimensions[machineId];
    }
    // Check model database
    if (!machineData && typeof PRISM_MACHINE_3D_MODEL_DATABASE_V2 !== 'undefined') {
      machineData = PRISM_MACHINE_3D_MODEL_DATABASE_V2.machines?.[machineId];
    }
    if (machineData) {
      this.loadedMachines[machineId] = {
        data: machineData,
        collisionZones: machineData.collisionZones || [],
        assemblies: machineData.assemblies || [],
        priority: machineData.priority || 'generated',
        initialized: true
      };
      (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[INTELLIGENT_COLLISION] Machine loaded:', machineId,
        'Priority:', machineData.priority,
        'Assemblies:', machineData.assemblies?.length || 0);

      return this.loadedMachines[machineId];
    }
    console.warn('[INTELLIGENT_COLLISION] Machine not found:', machineId);
    return null;
  },
  /**
   * Check collision between tool and machine components
   */
  checkToolCollision(toolPosition, toolGeometry, machineId) {
    const machine = this.loadedMachines[machineId];
    if (!machine) return { collision: false, warning: 'Machine not loaded' };

    const results = {
      collision: false,
      warnings: [],
      nearMisses: [],
      checkedZones: []
    };
    // Use PRISM_COLLISION_ENGINE for actual checks
    if (typeof PRISM_COLLISION_ENGINE !== 'undefined') {
      const toolAABB = PRISM_COLLISION_ENGINE.boundingBox.getToolAABB(toolGeometry, toolPosition);

      for (const zone of machine.collisionZones || []) {
        if (zone.boundingBox) {
          const collision = PRISM_COLLISION_ENGINE.boundingBox.checkAABB(toolAABB, zone.boundingBox);
          results.checkedZones.push(zone.name);

          if (collision) {
            results.collision = true;
            results.warnings.push({
              type: 'collision',
              zone: zone.name,
              priority: zone.priority,
              message: `Tool collision with ${zone.name}`
            });
          }
        }
      }
    }
    return results;
  },
  /**
   * Check collision along toolpath
   */
  checkToolpathCollision(toolpath, toolGeometry, machineId, options = {}) {
    const results = {
      safe: true,
      collisions: [],
      warnings: [],
      criticalPoints: []
    };
    const points = toolpath.points || toolpath.moves || toolpath;
    if (!Array.isArray(points)) return results;

    const checkInterval = options.checkInterval || 10; // Check every N points

    for (let i = 0; i < points.length; i += checkInterval) {
      const point = points[i];
      const position = { x: point.x, y: point.y, z: point.z };

      const check = this.checkToolCollision(position, toolGeometry, machineId);

      if (check.collision) {
        results.safe = false;
        results.collisions.push({
          pointIndex: i,
          position: position,
          details: check.warnings
        });
      }
      if (check.warnings.length > 0) {
        results.warnings.push(...check.warnings);
      }
    }
    // Check critical points (rapids, tool changes)
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      if (point.rapid || point.isRapid || point.toolChange) {
        results.criticalPoints.push({
          index: i,
          type: point.toolChange ? 'toolChange' : 'rapid',
          position: { x: point.x, y: point.y, z: point.z }
        });
      }
    }
    return results;
  },
  /**
   * Get collision-safe approach vector
   */
  getSafeApproach(targetPosition, machineId) {
    const machine = this.loadedMachines[machineId];
    if (!machine) return { x: 0, y: 0, z: 1 }; // Default: approach from +Z

    // Analyze machine type for safe approach
    const machineType = machine.data?.specs?.type || '';

    if (machineType.includes('HMC')) {
      return { x: 0, y: 1, z: 0 }; // Horizontal approach
    } else if (machineType.includes('VTL') || machineType.includes('LATHE')) {
      return { x: 1, y: 0, z: 0 }; // Radial approach
    } else {
      return { x: 0, y: 0, z: 1 }; // Vertical approach (VMC default)
    }
  }
};
// PRISM_REAL_CAD_PRIORITY_SYSTEM v1.0
// Ensures uploaded CAD supersedes generated models
const PRISM_REAL_CAD_PRIORITY_SYSTEM = {
  version: '1.0.0',

  priorities: {
    'uploaded_cad': 100,      // Highest - real manufacturer CAD
    'scanned_model': 90,      // 3D scanned models
    'verified_model': 80,     // User verified models
    'learned_model': 70,      // Machine learning derived
    'generated_model': 50,    // PRISM generated
    'placeholder': 10         // Basic placeholder
  },
  /**
   * Get best available model for a machine
   */
  getBestModel(machineId) {
    const candidates = [];

    // Check Okuma database
    if (typeof PRISM_OKUMA_MACHINE_CAD_DATABASE !== 'undefined') {
      const okuma = PRISM_OKUMA_MACHINE_CAD_DATABASE.getMachine(machineId);
      if (okuma) candidates.push({ source: 'OKUMA_CAD', data: okuma, priority: this.priorities.uploaded_cad });
    }
    // Check learning engine
    if (typeof PRISM_MACHINE_3D_LEARNING_ENGINE !== 'undefined') {
      const learned = PRISM_MACHINE_3D_LEARNING_ENGINE.learnedDimensions[machineId];
      if (learned) {
        const prio = learned.priority === 'uploaded_cad' ? this.priorities.uploaded_cad : this.priorities.learned_model;
        candidates.push({ source: 'LEARNING_ENGINE', data: learned, priority: prio });
      }
    }
    // Check model database
    if (typeof PRISM_MACHINE_3D_MODEL_DATABASE_V2 !== 'undefined') {
      const model = PRISM_MACHINE_3D_MODEL_DATABASE_V2.machines?.[machineId];
      if (model) candidates.push({ source: 'MODEL_DB', data: model, priority: this.priorities.generated_model });
    }
    // Sort by priority (highest first)
    candidates.sort((a, b) => b.priority - a.priority);

    if (candidates.length > 0) {
      console.log('[CAD_PRIORITY] Best model for', machineId, ':', candidates[0].source, 'Priority:', candidates[0].priority);
      return candidates[0];
    }
    return null;
  },
  /**
   * Check if real CAD is available for a machine
   */
  hasRealCAD(machineId) {
    const best = this.getBestModel(machineId);
    return best && best.priority >= this.priorities.uploaded_cad;
  },
  /**
   * Get all machines with real CAD available
   */
  getMachinesWithRealCAD() {
    const machines = [];

    // Okuma machines
    if (typeof PRISM_OKUMA_MACHINE_CAD_DATABASE !== 'undefined') {
      const okumaMachines = PRISM_OKUMA_MACHINE_CAD_DATABASE.listMachines();
      machines.push(...okumaMachines.map(m => ({ ...m, cadSource: 'OKUMA' })));
    }
    // Other uploaded machines from learning engine
    if (typeof PRISM_MACHINE_3D_LEARNING_ENGINE !== 'undefined') {
      for (const [id, data] of Object.entries(PRISM_MACHINE_3D_LEARNING_ENGINE.learnedDimensions || {})) {
        if (data.priority === 'uploaded_cad' && !machines.find(m => m.id === id)) {
          machines.push({ id, ...data, cadSource: data.manufacturer || 'UPLOADED' });
        }
      }
    }
    return machines;
  }
};
// INTEGRATION: Connect new systems to existing PRISM infrastructure
(function integrateOkumaAndCollision() {
  function doIntegration() {
    console.log('[PRISM v8.87.001] Integrating Okuma CAD & Collision Systems...');

    // 1. Register Okuma machines with learning engine
    if (typeof PRISM_MACHINE_3D_LEARNING_ENGINE !== 'undefined' &&
        typeof PRISM_OKUMA_MACHINE_CAD_DATABASE !== 'undefined') {
      const okumaMachines = PRISM_OKUMA_MACHINE_CAD_DATABASE.machines;
      for (const [id, data] of Object.entries(okumaMachines)) {
        PRISM_MACHINE_3D_LEARNING_ENGINE.learnedDimensions[id] = data;
      }
      console.log('[PRISM v8.87.001] ✓ Registered', Object.keys(okumaMachines).length, 'Okuma machines');
    }
    // 2. Connect collision system to kinematics engine
    if (typeof ADVANCED_COLLISION_KINEMATICS_ENGINE !== 'undefined') {
      ADVANCED_COLLISION_KINEMATICS_ENGINE.intelligentCollision = PRISM_INTELLIGENT_COLLISION_SYSTEM;
      ADVANCED_COLLISION_KINEMATICS_ENGINE.stepParser = PRISM_STEP_ASSEMBLY_PARSER;
      console.log('[PRISM v8.87.001] ✓ Connected to ADVANCED_COLLISION_KINEMATICS_ENGINE');
    }
    // 3. Connect to collision avoidance system
    if (typeof COLLISION_AVOIDANCE_SYSTEM !== 'undefined') {
      COLLISION_AVOIDANCE_SYSTEM.intelligentSystem = PRISM_INTELLIGENT_COLLISION_SYSTEM;
      COLLISION_AVOIDANCE_SYSTEM.cadPriority = PRISM_REAL_CAD_PRIORITY_SYSTEM;
      console.log('[PRISM v8.87.001] ✓ Connected to COLLISION_AVOIDANCE_SYSTEM');
    }
    // 4. Connect to master database
    if (typeof PRISM_MASTER_DB !== 'undefined') {
      PRISM_MASTER_DB.okumaMachines = PRISM_OKUMA_MACHINE_CAD_DATABASE;
      PRISM_MASTER_DB.stepParser = PRISM_STEP_ASSEMBLY_PARSER;
      PRISM_MASTER_DB.intelligentCollision = PRISM_INTELLIGENT_COLLISION_SYSTEM;
      PRISM_MASTER_DB.cadPriority = PRISM_REAL_CAD_PRIORITY_SYSTEM;
      console.log('[PRISM v8.87.001] ✓ Registered with PRISM_MASTER_DB');
    }
    // 5. Update machine select dropdown
    setTimeout(() => {
      const machineSelect = document.getElementById('machineSelect');
      if (machineSelect && typeof PRISM_OKUMA_MACHINE_CAD_DATABASE !== 'undefined') {
        const optgroup = document.createElement('optgroup');
        optgroup.label = '🔧 OKUMA (Real CAD)';

        const machines = PRISM_OKUMA_MACHINE_CAD_DATABASE.listMachines();
        for (const machine of machines.slice(0, 20)) { // First 20
          const option = document.createElement('option');
          option.value = machine.id;
          option.textContent = machine.display_name || machine.id.replace(/_/g, ' ').toUpperCase();
          option.setAttribute('data-cad', 'real');
          optgroup.appendChild(option);
        }
        machineSelect.appendChild(optgroup);
        console.log('[PRISM v8.87.001] ✓ Added Okuma machines to selector');
      }
    }, 2000);

    // 6. Global functions
    window.PRISM_OKUMA = PRISM_OKUMA_MACHINE_CAD_DATABASE;
    window.PRISM_STEP_PARSER = PRISM_STEP_ASSEMBLY_PARSER;
    window.PRISM_INTELLIGENT_COLLISION = PRISM_INTELLIGENT_COLLISION_SYSTEM;
    window.PRISM_CAD_PRIORITY = PRISM_REAL_CAD_PRIORITY_SYSTEM;

    window.getOkumaMachine = (id) => PRISM_OKUMA_MACHINE_CAD_DATABASE.getMachine(id);
    window.checkCollisionSmart = (toolpath, tool, machine) => PRISM_INTELLIGENT_COLLISION_SYSTEM.checkToolpathCollision(toolpath, tool, machine);
    window.getBestMachineModel = (id) => PRISM_REAL_CAD_PRIORITY_SYSTEM.getBestModel(id);
    window.getMachinesWithRealCAD = () => PRISM_REAL_CAD_PRIORITY_SYSTEM.getMachinesWithRealCAD();

    console.log('[PRISM v8.87.001] ✓ Enhanced 3D Machine CAD & Collision systems ready');
    console.log('[PRISM v8.87.001] ✓ 35 Okuma machines available');
    console.log('[PRISM v8.87.001] ✓ Real CAD priority system active');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(doIntegration, 3800));
  } else {
    setTimeout(doIntegration, 3800);
  }
})();

// PRISM v8.87.001 - Auto-feed new HAAS machines to learning engine
(function() {
  const NEW_MACHINES_V238 = [
    // HAAS machines from v8.9.227-228
    'HAAS_UMC_1500SS_DUO', 'HAAS_UMC_1500_DUO', 'HAAS_UMC_1000', 'HAAS_UMC_1000SS',
    'HAAS_UMC_1000_P', 'HAAS_UMC_400', 'HAAS_UMC_350HD_EDU', 'HAAS_DM_1', 'HAAS_DM_2',
    'HAAS_GM_2', 'HAAS_Desktop_Mill', 'HAAS_Super_Mini_Mill', 'HAAS_VF_2YT',
    'HAAS_VF_2SSYT', 'HAAS_VF_3YT_50', 'HAAS_VF_10', 'HAAS_VF_11_40', 'HAAS_VF_12_50',
    'HAAS_EC_400', 'HAAS_UMC_500SS', 'HAAS_UMC_1250', 'HAAS_GM_2_5AX', 'HAAS_VF_4SS_TRT210',
    // Hurco machines from v8.9.253
    'Hurco_HM1700Ri', 'Hurco_VMX42SWi', 'Hurco_VMX6030i', 'Hurco_VMX60Ui',
    // Hurco machines from v8.9.253
    'Hurco_VC500i', 'Hurco_VMX30Ui', 'Hurco_BX_40_Ui', 'Hurco_VMX_30_UDi',
    // Hurco machines from v8.9.253
    'Hurco_VCX600i_XP', 'Hurco_VMX60SRTi', 'Hurco_VM10Ui',
    // Hurco machines from v8.9.253
    'Hurco_VMX_84_i', 'Hurco_VMX42Di', 'Hurco_VMX30i', 'Hurco_VM_60_i', 'Hurco_DCX_22_i',
    // Mazak machines from v8.9.253
    'Mazak_FJV_35_60', 'Mazak_FJV_35_120', 'Mazak_FJV_60_160', 'Mazak_VARIAXIS_i_800_NEO',
    'Mazak_CV5_500', 'Mazak_VTC_300C', 'Mazak_HCN_1080', 'Mazak_HCN_4000',
    // Mazak machines from v8.9.253 (32 new!)
    'Mazak_HCN_5000S', 'Mazak_HCN_6800', 'Mazak_HCN_6800_NEO', 'Mazak_HCN_8800', 'Mazak_HCN_12800',
    'Mazak_INTEGREX_e_1060V_6_II', 'Mazak_INTEGREX_e_1600V_10S',
    'Mazak_VARIAXIS_i_500', 'Mazak_VARIAXIS_i_600', 'Mazak_VARIAXIS_i_700', 'Mazak_VARIAXIS_i_800',
    'Mazak_VARIAXIS_i_1050', 'Mazak_VARIAXIS_630_5X_II_T', 'Mazak_Variaxis_J_500', 'Mazak_VARIAXIS_j_600',
    'Mazak_Variaxis_C_600', 'Mazak_Variaxis_i_300_AWC', 'Mazak_Variaxis_i_700T',
    'Mazak_VC_Ez_16', 'Mazak_VC_Ez_20', 'Mazak_VC_Ez_20_15000_RPM_SPINDLE', 'Mazak_VC_Ez_26',
    'Mazak_VC_Ez_26_with_MR250_Rotary', 'Mazak_VCN_510C_II', 'Mazak_VCN_530C', 'Mazak_VCN_570', 'Mazak_VCN_570C',
    'Mazak_VTC_530C', 'Mazak_VTC_800_30SR', 'Mazak_VTC_800_30SDR', 'Mazak_VC_500_AM', 'Mazak_VCU_500A_5X',
    // Okuma machines from v8.9.253 (35 new!)
    'OKUMA_GENOS_M460_VE_e', 'OKUMA_GENOS_M560_V_e', 'OKUMA_GENOS_M560_VA_HC', 'OKUMA_GENOS_M660_VA', 'OKUMA_GENOS_M660_VB',
    'OKUMA_MA_500HII', 'OKUMA_MA_550VB', 'OKUMA_MA_600H', 'OKUMA_MA_600HII', 'OKUMA_MA_650VB',
    'OKUMA_MB_4000H', 'OKUMA_MB_46VAE', 'OKUMA_MB_5000H', 'OKUMA_MB_56VA', 'OKUMA_MB_66VA', 'OKUMA_MB_8000H',
    'OKUMA_MCR_A5CII_25x40', 'OKUMA_MCR_BIII_25E_25x40', 'OKUMA_MCR_BIII_25E_25x50', 'OKUMA_MCR_BIII_35E_35x65',
    'OKUMA_MILLAC_33T', 'OKUMA_MILLAC_761VII', 'OKUMA_MILLAC_800VH', 'OKUMA_MILLAC_852VII', 'OKUMA_MILLAC_1052VII',
    'OKUMA_MU_400VA', 'OKUMA_MU_500VA', 'OKUMA_MU_500VAL', 'OKUMA_MU_4000V', 'OKUMA_MU_5000V', 'OKUMA_MU_6300V', 'OKUMA_MU_8000V',
    'OKUMA_VTM_80YB', 'OKUMA_VTM_1200YB', 'OKUMA_VTM_2000YB',
    // DMG MORI machines from v8.9.253
    'DMG_DMU_70_eVolution', 'DMG_DMU_65_FD',
    // Mitsubishi machines from v8.9.253
    'Mitsubishi_MD_PRO_II',
    // DMG MORI machines from v8.9.253
    'DMG_DMU_75_monoBLOCK'
  ];

  function feedNewMachinesToLearningEngine() {
    if (typeof PRISM_MACHINE_3D_LEARNING_ENGINE === 'undefined' ||
        typeof PRISM_MACHINE_3D_MODEL_DATABASE_V3 === 'undefined') {
      console.log('[v8.9.253] Learning systems not ready, retrying...');
      setTimeout(feedNewMachinesToLearningEngine, 1000);
      return;
    }
    let fed = 0;
    NEW_MACHINES_V238.forEach(id => {
      const machine = PRISM_MACHINE_3D_MODEL_DATABASE_V3.getMachine(id);
      if (machine) {
        if (PRISM_MACHINE_3D_LEARNING_ENGINE.learnFromMachineSpec) {
          PRISM_MACHINE_3D_LEARNING_ENGINE.learnFromMachineSpec(id, machine);
          fed++;
        }
        if (typeof PRISM_MODEL_ORCHESTRATION_ENGINE !== 'undefined') {
          PRISM_MODEL_ORCHESTRATION_ENGINE.state.modelCache.set(id, {
            source: 'OEM_STEP', priority: 2, data: machine, hasGeometry: true
          });
        }
      }
    });
    console.log('[PRISM v8.87.001] Fed ' + fed + ' new HAAS machines to learning engine');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(feedNewMachinesToLearningEngine, 2000));
  } else {
    setTimeout(feedNewMachinesToLearningEngine, 2000);
  }
})();

// HYPERMILL_CAD_IMPORT_OPTIONS_DATABASE v1.0.0
// Comprehensive format-specific import configurations for 18 CAD formats
const HYPERMILL_CAD_IMPORT_OPTIONS_DATABASE = {
  version: '1.0.0',
  totalFormats: 18,

  // STEP Format Import Options
  STEP: {
    formatId: 'stp',
    extensions: ['.stp', '.step', '.p21'],
    entityFilter: {
      points: { enabled: true, description: 'Import point entities' },
      curves: { enabled: true, description: 'Import curve entities' },
      surfaces: { enabled: true, description: 'Import surface entities' },
      solids: { enabled: true, description: 'Import solid bodies' },
      tessellations: { enabled: true, description: 'Import tessellated meshes' },
      texts: { enabled: false, description: 'Import text annotations' },
      pmi: { enabled: true, description: 'Import Product Manufacturing Information' },
      axisSystems: { enabled: true, description: 'Import coordinate systems' },
      datumPlanes: { enabled: true, description: 'Import datum planes' }
    },
    importOptions: {
      validateGeometry: true,
      healGeometry: true,
      simplifyTopology: false,
      convertAnalytic: true,
      stitchFaces: true,
      stitchTolerance: 0.01
    }
  },
  // SolidWorks Format Import Options
  SOLIDWORKS: {
    formatId: 'slw',
    extensions: ['.sldprt', '.sldasm'],
    entityFilter: {
      points: { enabled: true, description: 'Import sketch points' },
      curves: { enabled: true, description: 'Import sketch curves' },
      surfaces: { enabled: true, description: 'Import surface bodies' },
      solids: { enabled: true, description: 'Import solid bodies' },
      axisSystems: { enabled: true, description: 'Import coordinate systems' },
      tessellations: { enabled: true, description: 'Import tessellated data' },
      texts: { enabled: false, description: 'Import annotations' },
      configurations: { enabled: true, description: 'Import part configurations' }
    },
    importOptions: {
      importFeatureTree: false,
      resolveExternalRefs: true,
      useActiveConfig: true
    }
  },
  // CATIA V5 Format Import Options
  CATIA_V5: {
    formatId: 'cv5',
    extensions: ['.catpart', '.catproduct', '.cgr'],
    entityFilter: {
      points: { enabled: true },
      curves: { enabled: true },
      surfaces: { enabled: true },
      solids: { enabled: true },
      axisSystems: { enabled: true },
      tessellations: { enabled: true },
      publications: { enabled: true, description: 'Import published elements' }
    },
    importOptions: {
      importParameters: false,
      importConstraints: false,
      convertToNurbs: true
    }
  },
  // CATIA V6/3DEXPERIENCE Format
  CATIA_V6: {
    formatId: 'cv6',
    extensions: ['.3dxml'],
    entityFilter: {
      points: { enabled: true },
      curves: { enabled: true },
      surfaces: { enabled: true },
      solids: { enabled: true },
      tessellations: { enabled: true }
    }
  },
  // CATIA V4 Format Import Options
  CATIA_V4: {
    formatId: 'cv4',
    extensions: ['.model', '.exp', '.dlv'],
    entityFilter: {
      points: { enabled: true },
      curves: { enabled: true },
      surfaces: { enabled: true },
      solids: { enabled: true }
    }
  },
  // IGES Format Import Options
  IGES: {
    formatId: 'igs',
    extensions: ['.igs', '.iges'],
    entityFilter: {
      points: { enabled: true },
      curves: { enabled: true },
      surfaces: { enabled: true },
      solids: { enabled: true },
      annotations: { enabled: false }
    },
    importOptions: {
      stitchSurfaces: true,
      stitchTolerance: 0.001,
      convertRationalBSplines: true,
      trimSurfaces: true
    }
  },
  // Inventor Format Import Options
  INVENTOR: {
    formatId: 'inv',
    extensions: ['.ipt', '.iam'],
    entityFilter: {
      points: { enabled: true },
      curves: { enabled: true },
      surfaces: { enabled: true },
      solids: { enabled: true },
      tessellations: { enabled: true }
    }
  },
  // Creo/Pro-E Format Import Options
  CREO: {
    formatId: 'pro',
    extensions: ['.prt', '.asm', '.xpr', '.xas'],
    entityFilter: {
      points: { enabled: true },
      curves: { enabled: true },
      surfaces: { enabled: true },
      solids: { enabled: true },
      datums: { enabled: true }
    }
  },
  // Siemens NX Format Import Options
  NX: {
    formatId: 'ugx',
    extensions: ['.prt'],
    entityFilter: {
      points: { enabled: true },
      curves: { enabled: true },
      surfaces: { enabled: true },
      solids: { enabled: true }
    }
  },
  // Solid Edge Format Import Options
  SOLID_EDGE: {
    formatId: 'sle',
    extensions: ['.par', '.asm', '.pwd', '.psm'],
    entityFilter: {
      points: { enabled: true },
      curves: { enabled: true },
      surfaces: { enabled: true },
      solids: { enabled: true }
    }
  },
  // Parasolid Format Import Options
  PARASOLID: {
    formatId: 'par',
    extensions: ['.x_t', '.x_b', '.xmt_txt', '.xmt_bin'],
    entityFilter: {
      curves: { enabled: true },
      surfaces: { enabled: true },
      solids: { enabled: true }
    }
  },
  // ACIS/SAT Format Import Options
  ACIS: {
    formatId: 'sat',
    extensions: ['.sat', '.sab'],
    entityFilter: {
      curves: { enabled: true },
      surfaces: { enabled: true },
      solids: { enabled: true }
    }
  },
  // Rhino 3DM Format Import Options
  RHINO: {
    formatId: '3dm',
    extensions: ['.3dm'],
    entityFilter: {
      points: { enabled: true },
      curves: { enabled: true },
      surfaces: { enabled: true },
      solids: { enabled: true },
      meshes: { enabled: true }
    }
  },
  // JT Format Import Options
  JT: {
    formatId: 'jto',
    extensions: ['.jt'],
    entityFilter: {
      tessellations: { enabled: true },
      brep: { enabled: true, description: 'Import B-Rep geometry' }
    }
  },
  // OBJ/Wavefront Format Import Options
  OBJ: {
    formatId: 'obj',
    extensions: ['.obj'],
    entityFilter: {
      meshes: { enabled: true },
      materials: { enabled: true }
    }
  },
  // 3MF Format Import Options
  THREE_MF: {
    formatId: '3mf',
    extensions: ['.3mf'],
    entityFilter: {
      meshes: { enabled: true },
      colors: { enabled: true },
      materials: { enabled: true }
    }
  },
  // PRC Format Import Options
  PRC: {
    formatId: 'prc',
    extensions: ['.prc'],
    entityFilter: {
      tessellations: { enabled: true },
      brep: { enabled: true }
    }
  },
  // JSON/JSN Format Import Options
  JSON: {
    formatId: 'jsn',
    extensions: ['.json', '.jsn'],
    entityFilter: {
      geometry: { enabled: true },
      metadata: { enabled: true }
    }
  },
  // Get format by extension
  getFormatByExtension: function(ext) {
    const extLower = ext.toLowerCase();
    for (const [name, config] of Object.entries(this)) {
      if (typeof config === 'object' && config.extensions) {
        if (config.extensions.includes(extLower)) {
          return { name, config };
        }
      }
    }
    return null;
  },
  // Get all supported extensions
  getAllExtensions: function() {
    const extensions = [];
    for (const config of Object.values(this)) {
      if (typeof config === 'object' && config.extensions) {
        extensions.push(...config.extensions);
      }
    }
    return extensions;
  }
};
// ISO_THREAD_CATALOG_DATABASE v1.0.0
// Comprehensive metric thread specifications for drilling operations
const ISO_THREAD_CATALOG_DATABASE = {
  version: '1.0.0',
  source: 'HyperMill omThreadCatalog',

  // Metric Coarse Pitch Threads (ISO 261)
  METRIC_COARSE: {
    typeId: 'M',
    unit: 'Metric',
    description: 'Metric Coarse Pitch Threads per ISO 261',
    threads: [
      { designation: 'M1', pitch: 0.25, nominalDia: 1.0, coreDia: 0.73, drillDia: 0.75 },
      { designation: 'M1.2', pitch: 0.25, nominalDia: 1.2, coreDia: 0.93, drillDia: 0.95 },
      { designation: 'M1.4', pitch: 0.3, nominalDia: 1.4, coreDia: 1.08, drillDia: 1.1 },
      { designation: 'M1.6', pitch: 0.35, nominalDia: 1.6, coreDia: 1.22, drillDia: 1.25 },
      { designation: 'M1.8', pitch: 0.35, nominalDia: 1.8, coreDia: 1.42, drillDia: 1.45 },
      { designation: 'M2', pitch: 0.4, nominalDia: 2.0, coreDia: 1.57, drillDia: 1.6 },
      { designation: 'M2.2', pitch: 0.45, nominalDia: 2.2, coreDia: 1.71, drillDia: 1.75 },
      { designation: 'M2.5', pitch: 0.45, nominalDia: 2.5, coreDia: 2.01, drillDia: 2.05 },
      { designation: 'M3', pitch: 0.5, nominalDia: 3.0, coreDia: 2.46, drillDia: 2.5 },
      { designation: 'M3.5', pitch: 0.6, nominalDia: 3.5, coreDia: 2.85, drillDia: 2.9 },
      { designation: 'M4', pitch: 0.7, nominalDia: 4.0, coreDia: 3.24, drillDia: 3.3 },
      { designation: 'M4.5', pitch: 0.75, nominalDia: 4.5, coreDia: 3.67, drillDia: 3.75 },
      { designation: 'M5', pitch: 0.8, nominalDia: 5.0, coreDia: 4.13, drillDia: 4.2 },
      { designation: 'M6', pitch: 1.0, nominalDia: 6.0, coreDia: 4.92, drillDia: 5.0 },
      { designation: 'M7', pitch: 1.0, nominalDia: 7.0, coreDia: 5.92, drillDia: 6.0 },
      { designation: 'M8', pitch: 1.25, nominalDia: 8.0, coreDia: 6.65, drillDia: 6.8 },
      { designation: 'M10', pitch: 1.5, nominalDia: 10.0, coreDia: 8.38, drillDia: 8.5 },
      { designation: 'M12', pitch: 1.75, nominalDia: 12.0, coreDia: 10.11, drillDia: 10.2 },
      { designation: 'M14', pitch: 2.0, nominalDia: 14.0, coreDia: 11.84, drillDia: 12.0 },
      { designation: 'M16', pitch: 2.0, nominalDia: 16.0, coreDia: 13.84, drillDia: 14.0 },
      { designation: 'M18', pitch: 2.5, nominalDia: 18.0, coreDia: 15.29, drillDia: 15.5 },
      { designation: 'M20', pitch: 2.5, nominalDia: 20.0, coreDia: 17.29, drillDia: 17.5 },
      { designation: 'M22', pitch: 2.5, nominalDia: 22.0, coreDia: 19.29, drillDia: 19.5 },
      { designation: 'M24', pitch: 3.0, nominalDia: 24.0, coreDia: 21.0, drillDia: 21.0 },
      { designation: 'M27', pitch: 3.0, nominalDia: 27.0, coreDia: 23.75, drillDia: 24.0 },
      { designation: 'M30', pitch: 3.5, nominalDia: 30.0, coreDia: 26.21, drillDia: 26.5 },
      { designation: 'M33', pitch: 3.5, nominalDia: 33.0, coreDia: 29.21, drillDia: 29.5 },
      { designation: 'M36', pitch: 4.0, nominalDia: 36.0, coreDia: 31.67, drillDia: 32.0 },
      { designation: 'M39', pitch: 4.0, nominalDia: 39.0, coreDia: 34.67, drillDia: 35.0 },
      { designation: 'M42', pitch: 4.5, nominalDia: 42.0, coreDia: 37.13, drillDia: 37.5 },
      { designation: 'M45', pitch: 4.5, nominalDia: 45.0, coreDia: 40.13, drillDia: 40.5 },
      { designation: 'M48', pitch: 5.0, nominalDia: 48.0, coreDia: 42.59, drillDia: 43.0 },
      { designation: 'M52', pitch: 5.0, nominalDia: 52.0, coreDia: 46.59, drillDia: 47.0 },
      { designation: 'M56', pitch: 5.5, nominalDia: 56.0, coreDia: 50.05, drillDia: 50.5 },
      { designation: 'M60', pitch: 5.5, nominalDia: 60.0, coreDia: 54.05, drillDia: 54.5 },
      { designation: 'M64', pitch: 6.0, nominalDia: 64.0, coreDia: 57.51, drillDia: 58.0 },
      { designation: 'M68', pitch: 6.0, nominalDia: 68.0, coreDia: 61.51, drillDia: 62.0 }
    ]
  },
  // Metric Fine Pitch Threads
  METRIC_FINE: {
    typeId: 'Mx',
    unit: 'Metric',
    description: 'Metric Fine Pitch Threads',
    threads: [
      { designation: 'M2x0.25', pitch: 0.25, nominalDia: 2.0, coreDia: 1.73, drillDia: 1.75 },
      { designation: 'M2.5x0.35', pitch: 0.35, nominalDia: 2.5, coreDia: 2.12, drillDia: 2.15 },
      { designation: 'M3x0.25', pitch: 0.25, nominalDia: 3.0, coreDia: 2.74, drillDia: 2.75 },
      { designation: 'M3x0.35', pitch: 0.35, nominalDia: 3.0, coreDia: 2.62, drillDia: 2.65 },
      { designation: 'M4x0.2', pitch: 0.2, nominalDia: 4.0, coreDia: 3.78, drillDia: 3.8 },
      { designation: 'M4x0.35', pitch: 0.35, nominalDia: 4.0, coreDia: 3.62, drillDia: 3.65 },
      { designation: 'M4x0.5', pitch: 0.5, nominalDia: 4.0, coreDia: 3.46, drillDia: 3.5 },
      { designation: 'M5x0.25', pitch: 0.25, nominalDia: 5.0, coreDia: 4.73, drillDia: 4.75 },
      { designation: 'M5x0.5', pitch: 0.5, nominalDia: 5.0, coreDia: 4.46, drillDia: 4.5 },
      { designation: 'M6x0.25', pitch: 0.25, nominalDia: 6.0, coreDia: 5.73, drillDia: 5.75 },
      { designation: 'M6x0.5', pitch: 0.5, nominalDia: 6.0, coreDia: 5.46, drillDia: 5.5 },
      { designation: 'M6x0.75', pitch: 0.75, nominalDia: 6.0, coreDia: 5.19, drillDia: 5.25 },
      { designation: 'M8x0.5', pitch: 0.5, nominalDia: 8.0, coreDia: 7.46, drillDia: 7.5 },
      { designation: 'M8x0.75', pitch: 0.75, nominalDia: 8.0, coreDia: 7.19, drillDia: 7.25 },
      { designation: 'M8x1', pitch: 1.0, nominalDia: 8.0, coreDia: 6.92, drillDia: 7.0 },
      { designation: 'M10x0.5', pitch: 0.5, nominalDia: 10.0, coreDia: 9.46, drillDia: 9.5 },
      { designation: 'M10x0.75', pitch: 0.75, nominalDia: 10.0, coreDia: 9.19, drillDia: 9.25 },
      { designation: 'M10x1', pitch: 1.0, nominalDia: 10.0, coreDia: 8.92, drillDia: 9.0 },
      { designation: 'M10x1.25', pitch: 1.25, nominalDia: 10.0, coreDia: 8.65, drillDia: 8.7 },
      { designation: 'M12x1', pitch: 1.0, nominalDia: 12.0, coreDia: 10.92, drillDia: 11.0 },
      { designation: 'M12x1.25', pitch: 1.25, nominalDia: 12.0, coreDia: 10.65, drillDia: 10.7 },
      { designation: 'M12x1.5', pitch: 1.5, nominalDia: 12.0, coreDia: 10.38, drillDia: 10.5 },
      { designation: 'M14x1.5', pitch: 1.5, nominalDia: 14.0, coreDia: 12.38, drillDia: 12.5 },
      { designation: 'M16x1', pitch: 1.0, nominalDia: 16.0, coreDia: 14.92, drillDia: 15.0 },
      { designation: 'M16x1.5', pitch: 1.5, nominalDia: 16.0, coreDia: 14.38, drillDia: 14.5 },
      { designation: 'M18x1.5', pitch: 1.5, nominalDia: 18.0, coreDia: 16.38, drillDia: 16.5 },
      { designation: 'M18x2', pitch: 2.0, nominalDia: 18.0, coreDia: 15.84, drillDia: 16.0 },
      { designation: 'M20x1.5', pitch: 1.5, nominalDia: 20.0, coreDia: 18.38, drillDia: 18.5 },
      { designation: 'M20x2', pitch: 2.0, nominalDia: 20.0, coreDia: 17.84, drillDia: 18.0 },
      { designation: 'M22x1.5', pitch: 1.5, nominalDia: 22.0, coreDia: 20.38, drillDia: 20.5 },
      { designation: 'M24x2', pitch: 2.0, nominalDia: 24.0, coreDia: 21.84, drillDia: 22.0 }
    ]
  },
  // Lookup functions
  getThreadByDesignation: function(designation) {
    for (const category of [this.METRIC_COARSE, this.METRIC_FINE]) {
      const thread = category.threads.find(t => t.designation === designation);
      if (thread) return { ...thread, type: category.typeId };
    }
    return null;
  },
  getDrillSize: function(designation) {
    const thread = this.getThreadByDesignation(designation);
    return thread ? thread.drillDia : null;
  },
  getThreadsForDiameter: function(nominalDia, tolerance = 0.1) {
    const results = [];
    for (const category of [this.METRIC_COARSE, this.METRIC_FINE]) {
      for (const thread of category.threads) {
        if (Math.abs(thread.nominalDia - nominalDia) <= tolerance) {
          results.push({ ...thread, type: category.typeId });
        }
      }
    }
    return results;
  }
};
// ISO_FIT_TOLERANCE_DATABASE v1.0.0
// ISO 286-1 Hole and Shaft fit tolerances for precision machining
const ISO_FIT_TOLERANCE_DATABASE = {
  version: '1.0.0',
  source: 'HyperMill omISOFitCatalog',
  standard: 'ISO 286-1',

  // Hole tolerances (Capital letters)
  HOLE_FITS: {
    // A9 - Large clearance fit
    A9: {
      type: 'Hole',
      description: 'Large clearance fit',
      grade: 9,
      ranges: [
        { minDia: 1, maxDia: 3, tolMin: 270, tolMax: 295 },
        { minDia: 3, maxDia: 6, tolMin: 270, tolMax: 300 },
        { minDia: 6, maxDia: 10, tolMin: 280, tolMax: 316 },
        { minDia: 10, maxDia: 18, tolMin: 290, tolMax: 333 },
        { minDia: 18, maxDia: 30, tolMin: 300, tolMax: 352 },
        { minDia: 30, maxDia: 50, tolMin: 310, tolMax: 382 },
        { minDia: 50, maxDia: 80, tolMin: 340, tolMax: 434 },
        { minDia: 80, maxDia: 120, tolMin: 380, tolMax: 497 },
        { minDia: 120, maxDia: 180, tolMin: 460, tolMax: 680 },
        { minDia: 180, maxDia: 250, tolMin: 660, tolMax: 935 },
        { minDia: 250, maxDia: 315, tolMin: 920, tolMax: 1180 },
        { minDia: 315, maxDia: 400, tolMin: 1200, tolMax: 1490 },
        { minDia: 400, maxDia: 500, tolMin: 1500, tolMax: 1805 }
      ]
    },
    // H7 - Standard precision hole (most common)
    H7: {
      type: 'Hole',
      description: 'Standard precision hole - basis for clearance fits',
      grade: 7,
      ranges: [
        { minDia: 1, maxDia: 3, tolMin: 0, tolMax: 10 },
        { minDia: 3, maxDia: 6, tolMin: 0, tolMax: 12 },
        { minDia: 6, maxDia: 10, tolMin: 0, tolMax: 15 },
        { minDia: 10, maxDia: 18, tolMin: 0, tolMax: 18 },
        { minDia: 18, maxDia: 30, tolMin: 0, tolMax: 21 },
        { minDia: 30, maxDia: 50, tolMin: 0, tolMax: 25 },
        { minDia: 50, maxDia: 80, tolMin: 0, tolMax: 30 },
        { minDia: 80, maxDia: 120, tolMin: 0, tolMax: 35 },
        { minDia: 120, maxDia: 180, tolMin: 0, tolMax: 40 },
        { minDia: 180, maxDia: 250, tolMin: 0, tolMax: 46 },
        { minDia: 250, maxDia: 315, tolMin: 0, tolMax: 52 },
        { minDia: 315, maxDia: 400, tolMin: 0, tolMax: 57 },
        { minDia: 400, maxDia: 500, tolMin: 0, tolMax: 63 }
      ]
    },
    // H6 - Precision hole for transition fits
    H6: {
      type: 'Hole',
      description: 'Precision hole for transition fits',
      grade: 6,
      ranges: [
        { minDia: 1, maxDia: 3, tolMin: 0, tolMax: 6 },
        { minDia: 3, maxDia: 6, tolMin: 0, tolMax: 8 },
        { minDia: 6, maxDia: 10, tolMin: 0, tolMax: 9 },
        { minDia: 10, maxDia: 18, tolMin: 0, tolMax: 11 },
        { minDia: 18, maxDia: 30, tolMin: 0, tolMax: 13 },
        { minDia: 30, maxDia: 50, tolMin: 0, tolMax: 16 },
        { minDia: 50, maxDia: 80, tolMin: 0, tolMax: 19 },
        { minDia: 80, maxDia: 120, tolMin: 0, tolMax: 22 },
        { minDia: 120, maxDia: 180, tolMin: 0, tolMax: 25 },
        { minDia: 180, maxDia: 250, tolMin: 0, tolMax: 29 },
        { minDia: 250, maxDia: 315, tolMin: 0, tolMax: 32 },
        { minDia: 315, maxDia: 400, tolMin: 0, tolMax: 36 },
        { minDia: 400, maxDia: 500, tolMin: 0, tolMax: 40 }
      ]
    }
  },
  // Common fit combinations
  COMMON_FITS: {
    // Clearance fits
    H7_f6: { hole: 'H7', shaft: 'f6', type: 'clearance', application: 'Running fit - precision' },
    H7_g6: { hole: 'H7', shaft: 'g6', type: 'clearance', application: 'Sliding fit - close' },
    H8_f7: { hole: 'H8', shaft: 'f7', type: 'clearance', application: 'Running fit - general' },
    H9_d9: { hole: 'H9', shaft: 'd9', type: 'clearance', application: 'Free running fit' },
    H11_c11: { hole: 'H11', shaft: 'c11', type: 'clearance', application: 'Loose fit' },

    // Transition fits
    H7_h6: { hole: 'H7', shaft: 'h6', type: 'transition', application: 'Locational fit - close' },
    H7_k6: { hole: 'H7', shaft: 'k6', type: 'transition', application: 'Locational fit - light' },
    H7_n6: { hole: 'H7', shaft: 'n6', type: 'transition', application: 'Locational fit - medium' },

    // Interference fits
    H7_p6: { hole: 'H7', shaft: 'p6', type: 'interference', application: 'Light press fit' },
    H7_r6: { hole: 'H7', shaft: 'r6', type: 'interference', application: 'Medium press fit' },
    H7_s6: { hole: 'H7', shaft: 's6', type: 'interference', application: 'Heavy press fit' }
  },
  // Lookup functions
  getToleranceForDiameter: function(fitCode, diameter) {
    const fit = this.HOLE_FITS[fitCode];
    if (!fit) return null;

    for (const range of fit.ranges) {
      if (diameter > range.minDia && diameter <= range.maxDia) {
        return {
          fitCode: fitCode,
          grade: fit.grade,
          upperDeviation: range.tolMax / 1000, // Convert to mm
          lowerDeviation: range.tolMin / 1000,
          diameterRange: { min: range.minDia, max: range.maxDia }
        };
      }
    }
    return null;
  },
  recommendFit: function(application) {
    const appLower = application.toLowerCase();
    for (const [fitName, fit] of Object.entries(this.COMMON_FITS)) {
      if (fit.application.toLowerCase().includes(appLower)) {
        return { name: fitName, ...fit };
      }
    }
    return null;
  }
};
// HYPERMILL_FEATURE_RECOGNITION_CATALOG v1.0.0
// Feature definitions for automatic recognition and CAM operation mapping
const HYPERMILL_FEATURE_RECOGNITION_CATALOG = {
  version: '1.0.0',
  source: 'HyperMill omfeaturecatalog.xml',

  // Base feature definitions
  BASE_FEATURES: {
    // Dimension Tolerance
    DIMENSION_TOLERANCE: {
      name: 'Dimension_Tolerance',
      attributes: {
        designation: { type: 'String', main: true },
        upper: { type: 'Real', associate: 'Length', main: true },
        lower: { type: 'Real', associate: 'Length', main: true }
      }
    },
    // Thread feature
    THREAD: {
      name: 'Thread',
      attributes: {
        designation: { type: 'String' },
        diameter: { type: 'Real', associate: 'Length', main: true, variableName: 'F:TD' },
        length: { type: 'Real', associate: 'Length', main: true, checkType: 'Warning_GT', variableName: 'F:TH' },
        pitch: { type: 'Real', associate: 'Length', main: true, variableName: 'F:Pitch' }
      }
    },
    // ISO-Fit feature
    ISO_FIT: {
      name: 'ISO-Fit',
      attributes: {
        fitValue: { type: 'String' },
        upper: { type: 'Real', associate: 'Length', main: true },
        lower: { type: 'Real', associate: 'Length', main: true },
        fitLength: { type: 'Real', associate: 'Length', main: true, checkType: 'Warning_GT', variableName: 'F:FL' }
      }
    },
    // Chamfer feature
    CHAMFER: {
      name: 'Chamfer',
      attributes: {
        depth: { type: 'Real', associate: 'Length', main: true, variableName: 'F:HCH' }
      }
    },
    // Fillet feature
    FILLET: {
      name: 'Fillet',
      attributes: {
        radius: { type: 'Real', associate: 'Length', main: true }
      }
    }
  },
  // Hole feature types
  HOLE_FEATURES: {
    // Sink (Counterbore/Countersink/Drill)
    SINK: {
      name: 'Sink',
      types: ['Counterbore', 'Countersink', 'Drill'],
      attributes: {
        type: { type: 'Enum', items: ['Counterbore', 'Countersink', 'Drill'] },
        hasChamfer: { type: 'Enum', items: ['No', 'Yes'], optional: 'Type=Drill|Type=Counterbore' },
        diameter: { type: 'Real', associate: 'Length', main: true },
        depth: { type: 'Real', associate: 'Length', optional: 'Type=Drill|Type=Counterbore', main: true },
        hasISOFit: { type: 'Enum', items: ['No', 'Yes'] },
        hasThread: { type: 'Enum', items: ['No', 'Yes'] },
        tipAngle: { type: 'Real', associate: 'Angle', optional: 'Type=Drill' },
        angle: { type: 'Real', associate: 'Angle', optional: 'Type=Countersink', main: true }
      }
    },
    // Hole Step (for stepped holes)
    HOLE_STEP: {
      name: 'Hole_Step',
      types: ['Cylinder', 'Cone', 'Fillet', 'Cutout'],
      attributes: {
        stepType: { type: 'Enum', items: ['Cylinder', 'Cone', 'Fillet', 'Cutout'] },
        diameter: { type: 'Real', associate: 'Length', main: true },
        topDiameter: { type: 'Real', associate: 'Length', optional: 'Step_Type=Fillet' },
        bottomDiameter: { type: 'Real', associate: 'Length', optional: 'Step_Type=Fillet' },
        depth: { type: 'Real', associate: 'Length', main: true },
        angle: { type: 'Real', associate: 'Angle', optional: 'Step_Type=Cone' },
        radius: { type: 'Real', associate: 'Length', optional: 'Step_Type=Fillet' },
        material: { type: 'Enum', items: ['Outside', 'Inside'], optional: 'Step_Type=Fillet' }
      }
    },
    // Hole Segment (for complex holes)
    HOLE_SEGMENT: {
      name: 'Hole_Segment',
      attributes: {
        frontEdge: { type: 'Enum', items: ['Sharp', 'Chamfer', 'Fillet'] },
        frontMachiningProperty: { type: 'Enum', items: ['None', 'Thread', 'ISO-Fit'] },
        diameter: { type: 'Real', associate: 'Length', main: true, variableName: 'F:D', default: 8.5 },
        depth: { type: 'Real', associate: 'Length', main: true, variableName: 'F:H', default: 50 },
        hasDepthTolerance: { type: 'Enum', items: ['No', 'Yes'] },
        backEdge: { type: 'Enum', items: ['Sharp', 'Chamfer', 'Fillet'] },
        backMachiningProperty: { type: 'Enum', items: ['None', 'Thread', 'ISO-Fit'] }
      }
    },
    // Sink Segment
    SINK_SEGMENT: {
      name: 'Sink_Segment',
      types: ['Counterbore', 'Countersink', 'Drill', 'Form', 'Tapered', 'Torus', 'Undercut'],
      attributes: {
        type: { type: 'Enum', items: ['Counterbore', 'Countersink', 'Drill', 'Form', 'Tapered', 'Torus', 'Undercut'] }
      }
    }
  },
  // Feature-to-operation mappings
  FEATURE_TO_OPERATION: {
    HOLE_BLIND: { operations: ['drilling', 'reaming', 'boring'], priority: 1 },
    HOLE_THROUGH: { operations: ['drilling', 'reaming', 'boring'], priority: 1 },
    THREAD_INTERNAL: { operations: ['tapping', 'thread_milling'], priority: 2 },
    COUNTERBORE: { operations: ['drilling', 'counterbore_milling'], priority: 2 },
    COUNTERSINK: { operations: ['drilling', 'countersink_milling'], priority: 2 },
    POCKET_2D: { operations: ['pocketing', 'adaptive_clearing'], priority: 3 },
    SLOT: { operations: ['slot_milling', 'pocketing'], priority: 3 },
    FACE: { operations: ['face_milling'], priority: 1 },
    CONTOUR: { operations: ['contour_milling', 'profile_milling'], priority: 4 }
  },
  // Get operations for feature
  getOperationsForFeature: function(featureType) {
    return this.FEATURE_TO_OPERATION[featureType] || null;
  },
  // Validate feature attributes
  validateFeature: function(featureType, attributes) {
    const featureDef = this.BASE_FEATURES[featureType] || this.HOLE_FEATURES[featureType];
    if (!featureDef) return { valid: false, error: 'Unknown feature type' };

    const errors = [];
    for (const [attrName, attrDef] of Object.entries(featureDef.attributes)) {
      if (attrDef.main && !(attrName in attributes)) {
        errors.push(\`Missing required attribute: \${attrName}\`);
      }
    }
    return errors.length === 0
      ? { valid: true }
      : { valid: false, errors };
  }
};
// PRISM_UNIFIED_ORCHESTRATION_ENGINE v2.0.0
// Enhanced orchestration with HyperMill configuration integration
const PRISM_UNIFIED_ORCHESTRATION_ENGINE = {
  version: '3.0.0',
  buildDate: '2026-01-08',

  // Engine state
  state: {
    isActive: true,
    currentWorkflow: null,
    pendingTasks: [],
    completedTasks: [],
    activeModules: new Set()
  },
  // Registered modules
  modules: {
    // Core databases
    MACHINE_DATABASE: { priority: 1, type: 'database', count: 226 },
    MATERIAL_DATABASE: { priority: 1, type: 'database' },
    CUTTING_DATA_DATABASE: { priority: 1, type: 'database' },

    // Thread & Tolerance databases (NEW)
    THREAD_CATALOG: { priority: 1, type: 'database', ref: 'ISO_THREAD_CATALOG_DATABASE' },
    ISO_FIT_DATABASE: { priority: 1, type: 'database', ref: 'ISO_FIT_TOLERANCE_DATABASE' },

    // CAD/CAM engines
    CAD_IMPORT_ENGINE: { priority: 2, type: 'engine', formats: 18 },
    CAM_STRATEGY_ENGINE: { priority: 2, type: 'engine' },
    SIMULATION_ENGINE: { priority: 2, type: 'engine' },

    // Feature recognition (NEW)
    FEATURE_RECOGNITION: { priority: 2, type: 'engine', ref: 'HYPERMILL_FEATURE_RECOGNITION_CATALOG' },

    // HyperMill integrations
    HYPERMILL_BATCH_CONVERTER: { priority: 3, type: 'integration' },
    HYPERMILL_CAM_PLAN_TECH: { priority: 3, type: 'integration' },
    HYPERMILL_TOOL_BUILDER: { priority: 3, type: 'integration' },
    HYPERMILL_VM_CREATOR: { priority: 3, type: 'integration' },

    // Learning engines
    TOOL_LIFE_LEARNING: { priority: 4, type: 'learning' },
    CUTTING_PARAM_LEARNING: { priority: 4, type: 'learning' },
    COLLISION_LEARNING: { priority: 4, type: 'learning' }
  },
  // Workflow definitions
  workflows: {
    // Complete part programming workflow
    PART_PROGRAMMING: {
      name: 'Complete Part Programming',
      stages: [
        { id: 'import', module: 'CAD_IMPORT_ENGINE', action: 'importModel' },
        { id: 'analyze', module: 'FEATURE_RECOGNITION', action: 'recognizeFeatures' },
        { id: 'setup', module: 'MACHINE_DATABASE', action: 'selectMachine' },
        { id: 'tooling', module: 'TOOL_DATABASE', action: 'selectTools' },
        { id: 'strategy', module: 'CAM_STRATEGY_ENGINE', action: 'generateStrategies' },
        { id: 'optimize', module: 'CUTTING_PARAM_LEARNING', action: 'optimizeParams' },
        { id: 'simulate', module: 'SIMULATION_ENGINE', action: 'verifyToolpaths' },
        { id: 'output', module: 'POST_PROCESSOR', action: 'generateGCode' }
      ]
    },
    // Hole feature workflow
    HOLE_MACHINING: {
      name: 'Hole Feature Machining',
      stages: [
        { id: 'recognize', module: 'FEATURE_RECOGNITION', action: 'identifyHoles' },
        { id: 'thread_lookup', module: 'THREAD_CATALOG', action: 'matchThreadSpecs' },
        { id: 'fit_lookup', module: 'ISO_FIT_DATABASE', action: 'determineTolerances' },
        { id: 'drill_select', module: 'TOOL_DATABASE', action: 'selectDrills' },
        { id: 'operations', module: 'CAM_STRATEGY_ENGINE', action: 'generateHoleOps' }
      ]
    },
    // Tool assembly workflow
    TOOL_ASSEMBLY: {
      name: 'Tool Assembly Creation',
      stages: [
        { id: 'select_holder', module: 'TOOL_HOLDER_DATABASE', action: 'selectHolder' },
        { id: 'select_tool', module: 'CUTTING_TOOL_DATABASE', action: 'selectCutter' },
        { id: 'build', module: 'HYPERMILL_TOOL_BUILDER', action: 'createAssembly' },
        { id: 'verify', module: 'SIMULATION_ENGINE', action: 'checkClearance' }
      ]
    }
  },
  // Initialize orchestrator
  initialize: function() {
    console.log('PRISM_UNIFIED_ORCHESTRATION_ENGINE v2.0.0 initializing...');

    // Register all modules
    for (const [name, config] of Object.entries(this.modules)) {
      this.state.activeModules.add(name);
    }
    // Connect to databases
    this.connectDatabases();

    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log(\`Orchestrator initialized with \${this.state.activeModules.size} modules\`);
    return true;
  },
  // Connect to all databases
  connectDatabases: function() {
    const connections = [];

    // Connect thread catalog
    if (typeof ISO_THREAD_CATALOG_DATABASE !== 'undefined') {
      connections.push({ name: 'THREAD_CATALOG', status: 'connected', threads:
        ISO_THREAD_CATALOG_DATABASE.METRIC_COARSE.threads.length +
        ISO_THREAD_CATALOG_DATABASE.METRIC_FINE.threads.length
      });
    }
    // Connect ISO fit database
    if (typeof ISO_FIT_TOLERANCE_DATABASE !== 'undefined') {
      connections.push({ name: 'ISO_FIT', status: 'connected', fits:
        Object.keys(ISO_FIT_TOLERANCE_DATABASE.HOLE_FITS).length
      });
    }
    // Connect feature catalog
    if (typeof HYPERMILL_FEATURE_RECOGNITION_CATALOG !== 'undefined') {
      connections.push({ name: 'FEATURE_CATALOG', status: 'connected', features:
        Object.keys(HYPERMILL_FEATURE_RECOGNITION_CATALOG.HOLE_FEATURES).length
      });
    }
    // Connect CAD import options
    if (typeof HYPERMILL_CAD_IMPORT_OPTIONS_DATABASE !== 'undefined') {
      connections.push({ name: 'CAD_IMPORT', status: 'connected', formats:
        HYPERMILL_CAD_IMPORT_OPTIONS_DATABASE.totalFormats
      });
    }
    return connections;
  },
  // Start a workflow
  startWorkflow: function(workflowId) {
    const workflow = this.workflows[workflowId];
    if (!workflow) {
      console.error(\`Unknown workflow: \${workflowId}\`);
      return false;
    }
    this.state.currentWorkflow = {
      id: workflowId,
      name: workflow.name,
      stages: workflow.stages,
      currentStage: 0,
      status: 'running',
      startTime: Date.now()
    };
    console.log(\`Started workflow: \${workflow.name}\`);
    return this.executeNextStage();
  },
  // Execute next workflow stage
  executeNextStage: function() {
    if (!this.state.currentWorkflow) return false;

    const { stages, currentStage } = this.state.currentWorkflow;
    if (currentStage >= stages.length) {
      this.state.currentWorkflow.status = 'completed';
      this.state.currentWorkflow.endTime = Date.now();
      (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('Workflow completed');
      return true;
    }
    const stage = stages[currentStage];
    console.log(\`Executing stage: \${stage.id} (\${stage.module}.\${stage.action})\`);

    // Execute stage (simulated)
    this.state.currentWorkflow.currentStage++;
    return true;
  },
  // Process natural language command
  processCommand: function(command) {
    const cmdLower = command.toLowerCase();

    // Detect command type
    if (cmdLower.includes('thread') || cmdLower.includes('tap')) {
      return this.handleThreadQuery(command);
    }
    if (cmdLower.includes('fit') || cmdLower.includes('tolerance')) {
      return this.handleFitQuery(command);
    }
    if (cmdLower.includes('import') || cmdLower.includes('open')) {
      return this.handleImportQuery(command);
    }
    if (cmdLower.includes('drill') || cmdLower.includes('hole')) {
      return this.handleHoleQuery(command);
    }
    return { type: 'unknown', message: 'Command not recognized' };
  },
  // Handle thread-related queries
  handleThreadQuery: function(command) {
    // Extract thread designation from command
    const threadMatch = command.match(/M\d+(?:x[\d.]+)?/i);
    if (threadMatch && typeof ISO_THREAD_CATALOG_DATABASE !== 'undefined') {
      const thread = ISO_THREAD_CATALOG_DATABASE.getThreadByDesignation(threadMatch[0].toUpperCase());
      if (thread) {
        return {
          type: 'thread_info',
          data: thread,
          drillSize: thread.drillDia,
          recommendation: \`Use \${thread.drillDia}mm drill for \${thread.designation} thread\`
        };
      }
    }
    return { type: 'thread_query', message: 'Specify thread designation (e.g., M8, M10x1.25)' };
  },
  // Handle fit/tolerance queries
  handleFitQuery: function(command) {
    // Extract fit code and diameter
    const fitMatch = command.match(/[HhGgFfPpNnKk]\d+/);
    const diaMatch = command.match(/(\d+(?:\.\d+)?)\s*mm/);

    if (fitMatch && diaMatch && typeof ISO_FIT_TOLERANCE_DATABASE !== 'undefined') {
      const fit = ISO_FIT_TOLERANCE_DATABASE.getToleranceForDiameter(
        fitMatch[0].toUpperCase(),
        parseFloat(diaMatch[1])
      );
      if (fit) {
        return {
          type: 'fit_info',
          data: fit,
          recommendation: \`\${fit.fitCode} tolerance for Ø\${diaMatch[1]}mm: +\${fit.upperDeviation}/-\${fit.lowerDeviation}\`
        };
      }
    }
    return { type: 'fit_query', message: 'Specify fit code and diameter (e.g., H7 for 25mm)' };
  },
  // Handle import queries
  handleImportQuery: function(command) {
    if (typeof HYPERMILL_CAD_IMPORT_OPTIONS_DATABASE !== 'undefined') {
      // Extract file extension
      const extMatch = command.match(/\.(\w+)/);
      if (extMatch) {
        const format = HYPERMILL_CAD_IMPORT_OPTIONS_DATABASE.getFormatByExtension('.' + extMatch[1]);
        if (format) {
          return {
            type: 'import_format',
            data: format,
            recommendation: \`Detected \${format.name} format. Recommended import settings available.\`
          };
        }
      }
      return {
        type: 'import_help',
        supportedFormats: HYPERMILL_CAD_IMPORT_OPTIONS_DATABASE.getAllExtensions()
      };
    }
    return { type: 'import_query', message: 'Specify file to import' };
  },
  // Handle hole/drilling queries
  handleHoleQuery: function(command) {
    const diaMatch = command.match(/(\d+(?:\.\d+)?)\s*mm/);

    if (diaMatch && typeof ISO_THREAD_CATALOG_DATABASE !== 'undefined') {
      const diameter = parseFloat(diaMatch[1]);
      const possibleThreads = ISO_THREAD_CATALOG_DATABASE.getThreadsForDiameter(diameter, 1.0);

      if (possibleThreads.length > 0) {
        return {
          type: 'hole_analysis',
          diameter: diameter,
          possibleThreads: possibleThreads,
          recommendation: \`Ø\${diameter}mm could be for: \${possibleThreads.map(t => t.designation).join(', ')}\`
        };
      }
    }
    return { type: 'hole_query', message: 'Specify hole diameter for analysis' };
  },
  // Get system status
  getStatus: function() {
    return {
      version: this.version,
      activeModules: this.state.activeModules.size,
      currentWorkflow: this.state.currentWorkflow,
      databases: {
        threads: typeof ISO_THREAD_CATALOG_DATABASE !== 'undefined' ?
          ISO_THREAD_CATALOG_DATABASE.METRIC_COARSE.threads.length +
          ISO_THREAD_CATALOG_DATABASE.METRIC_FINE.threads.length : 0,
        isoFits: typeof ISO_FIT_TOLERANCE_DATABASE !== 'undefined' ?
          Object.keys(ISO_FIT_TOLERANCE_DATABASE.HOLE_FITS).length : 0,
        cadFormats: typeof HYPERMILL_CAD_IMPORT_OPTIONS_DATABASE !== 'undefined' ?
          HYPERMILL_CAD_IMPORT_OPTIONS_DATABASE.totalFormats : 0,
        features: typeof HYPERMILL_FEATURE_RECOGNITION_CATALOG !== 'undefined' ?
          Object.keys(HYPERMILL_FEATURE_RECOGNITION_CATALOG.HOLE_FEATURES).length : 0
      }
    };
  }
};
// Auto-initialize
if (typeof window !== 'undefined') {
  window.addEventListener('load', function() {
    PRISM_UNIFIED_ORCHESTRATION_ENGINE.initialize();
  });
}
// PDF-DERIVED KNOWLEDGE DATABASES v1.0 - Extracted from CNC Reference Materials

// DEEP_HOLE_DRILLING_KNOWLEDGE_DATABASE - From Deep Hole Drilling PDF + CNC Fundamentals
const DEEP_HOLE_DRILLING_KNOWLEDGE_DATABASE = {
    version: "1.0.0",
    source: "CNCCookbook Deep Hole Drilling Guide + CNC Fundamentals",

    // Depth-to-diameter thresholds for technique selection
    depthThresholds: {
        standard: { maxRatio: 5, technique: "STANDARD_DRILL", pecking: false },
        peckDrill: { minRatio: 5, maxRatio: 7, technique: "PECK_DRILL", cycle: "G83" },
        parabolicPeck: { minRatio: 7, maxRatio: 10, technique: "PARABOLIC_PECK", flute: "PARABOLIC" },
        customDeepHole: { minRatio: 10, maxRatio: 20, technique: "CUSTOM_DEEP_HOLE", custom: true },
        gunDrill: { minRatio: 20, technique: "GUN_DRILL", specialized: true }
    },
    // Peck drilling cycles by controller
    peckCycles: {
        fanuc: {
            standard: { code: "G83", name: "Deep Hole Peck", params: ["X", "Y", "Z", "R", "Q", "P", "F"] },
            highSpeed: { code: "G73", name: "High Speed Peck", params: ["X", "Y", "Z", "R", "Q", "P", "F"] }
        },
        haas: {
            standard: { code: "G83", name: "Deep Hole Peck", params: ["X", "Y", "Z", "R", "Q", "P", "F"] },
            highSpeed: { code: "G73", name: "Chip Break Peck", params: ["X", "Y", "Z", "R", "Q", "P", "F"] }
        },
        siemens: {
            cycle83: { code: "CYCLE83", name: "Deep Hole Drilling", params: ["RTP", "RFP", "SDIS", "DP", "DPR", "FDEP", "FDPR", "DAM", "DTB", "DTS", "FRF", "VARI", "AXN", "MDEP", "VRT", "DTD", "DIS1"] }
        },
        mazak: {
            fixed: { code: "G281", name: "Fixed Deep Drilling 2", params: ["X", "Y", "Z", "R", "Q", "QC", "QD", "F", "FA", "FB", "FC", "S", "SC", "I", "J", "KA", "KB", "P"] },
            synchronizedTap: { code: "G283", name: "High-Speed Deep Hole Tap", params: ["X", "Y", "Z", "R", "E", "Q", "P", "F", "S", "K", "M"] }
        },
        okuma: {
            peck: { code: "G83", name: "Deep Hole Peck", params: ["X", "Y", "Z", "R", "Q", "P", "F", "E"] },
            chipBreak: { code: "G73", name: "Chip Break Cycle", params: ["X", "Y", "Z", "R", "Q", "K", "F"] }
        }
    },
    // Peck strategy recommendations
    peckStrategies: {
        initial: {
            description: "Start without pecking to 2D depth",
            peckDepth: "2.0D",  // 2x diameter
            retractAmount: 0,
            note: "No pecking needed in shallow region"
        },
        standard: {
            description: "Standard peck at 3-5D depth",
            peckDepth: "0.5-1.0D",
            retractAmount: "0.010-0.050",
            chipBreak: true
        },
        deep: {
            description: "Deep hole peck beyond 5D",
            peckDepth: "0.25-0.5D",
            retractAmount: "FULL_RETRACT",
            chipEvacuation: "CRITICAL",
            coolant: "THROUGH_SPINDLE_PREFERRED"
        },
        progressive: {
            description: "Reduce peck as depth increases",
            initialPeck: "1.0D",
            peckReduction: "0.1D per cycle",
            minimumPeck: "0.1D"
        }
    },
    // G83 parameter definitions
    g83Parameters: {
        X: { description: "X-axis absolute rapid location", type: "absolute" },
        Y: { description: "Y-axis absolute rapid location", type: "absolute" },
        Z: { description: "Z-depth absolute from R-plane", type: "absolute" },
        W: { description: "Z-depth incremental from R-plane", type: "incremental" },
        R: { description: "Rapid to R-plane (feed start)", type: "absolute" },
        Q: { description: "Pecking depth amount (always incremental positive)", type: "incremental" },
        I: { description: "Size of first peck depth (if Q not used)", type: "optional" },
        J: { description: "Amount reducing each peck after first", type: "optional" },
        K: { description: "Minimum peck depth (if Q not used)", type: "optional" },
        P: { description: "Dwell time at Z-depth in seconds", type: "dwell" },
        F: { description: "Feed rate", type: "feedrate" }
    },
    // Retract behavior
    retractModes: {
        G98: { description: "Return to initial Z level between holes", bestFor: "OBSTABLES_BETWEEN_HOLES" },
        G99: { description: "Return to R-plane between holes", bestFor: "CLEAR_PATH_BETWEEN_HOLES" }
    },
    // Chip control strategies
    chipControl: {
        avoid: [
            "Never fully retract from hole - chips wash back down",
            "Avoid stringy chips - increase peck frequency",
            "Don't skip dwell at R-plane - chips need time to clear"
        ],
        recommended: [
            "Pause 0.001 inch above peck depth to let chips clear",
            "Use through-spindle coolant when available",
            "Increase peck frequency as hole gets deeper",
            "Parabolic flutes help chip evacuation beyond 7D"
        ]
    },
    // Feed/speed adjustments for depth
    depthAdjustments: {
        "5D_to_7D": { feedReduction: 0.90, rpmReduction: 0.95 },
        "7D_to_10D": { feedReduction: 0.80, rpmReduction: 0.90 },
        "10D_to_15D": { feedReduction: 0.70, rpmReduction: 0.85 },
        "15D_to_20D": { feedReduction: 0.60, rpmReduction: 0.80 }
    }
};
// HELICAL_INTERPOLATION_DATABASE - From Helical Interpolation PDF
const HELICAL_INTERPOLATION_DATABASE = {
    version: "1.0.0",
    source: "CNCCookbook Helical Interpolation Guide",

    // Core concept
    definition: "Helical interpolation moves the cutter along a helix by combining circular arc motion (G02/G03) with simultaneous Z-axis motion",

    // Primary applications
    applications: {
        holeMaking: {
            description: "Creating holes larger than the tool diameter",
            advantages: ["One tool for multiple hole sizes", "Better surface finish than boring", "Less tool inventory"],
            limitations: ["Slower than drilling", "Requires 3-axis simultaneous motion"]
        },
        circularRamping: {
            description: "Gentle entry into pockets and profiles",
            advantages: ["Reduced tool stress vs plunge", "Better chip evacuation", "Longer tool life"],
            rampAngle: "1-3 degrees typical"
        },
        threadMilling: {
            description: "Milling threads using helical motion",
            advantages: ["One tool for multiple thread sizes", "Better for interrupted cuts", "Works in hardened materials"],
            process: "Tool follows helical path at thread pitch"
        }
    },
    // G-code programming
    programming: {
        basic: {
            description: "90-degree arc segments with Z change",
            example: [
                "G00 X0.2375 Y0.0",
                "G01 Z0.001",
                "G03 R0.2375 X0.1679 Y0.1679 Z-0.067",
                "G03 R0.2375 X0.0 Y0.2375 Z-0.134",
                "G03 R0.2375 X-0.1679 Y0.1679 Z-0.201",
                "G03 R0.2375 X-0.2375 Y0.0 Z-0.268"
            ],
            note: "Each arc specifies Z change for helical descent"
        },
        arcFormats: {
            R_format: { description: "Radius format - simpler but limited to <180 degrees", example: "G03 R0.25 X0.1 Y0.1 Z-0.05" },
            IJ_format: { description: "Center offset format - supports full 360 degrees", example: "G03 I0.25 J0.0 X0.0 Y0.25 Z-0.1" }
        },
        maxArcAngle: {
            conservative: 90,
            typical: 180,
            aggressive: 360,
            note: "Many controls limit arc angle - use 90 degrees for maximum compatibility"
        }
    },
    // Helix parameters
    helixParameters: {
        pitch: { description: "Z drop per revolution", calculation: "PITCH = TOTAL_DEPTH / NUM_REVOLUTIONS" },
        rampAngle: { description: "Angle of helix relative to XY plane", calculation: "ANGLE = ATAN(PITCH / (PI * DIAMETER))" },
        helixDiameter: { description: "Diameter of helical path", calculation: "HELIX_DIA = HOLE_DIA - TOOL_DIA" },
        revolutions: { description: "Number of full helical revolutions", calculation: "REVS = DEPTH / PITCH" }
    },
    // Controller-specific codes
    controllerSupport: {
        fanuc: { helixSupport: true, maxArcAngle: 360, requires3Axis: true },
        haas: { helixSupport: true, maxArcAngle: 360, requires3Axis: true },
        siemens: { helixSupport: true, maxArcAngle: 360, requires3Axis: true },
        mazak: { helixSupport: true, maxArcAngle: 360, requires3Axis: true },
        brother: { helixSupport: true, maxArcAngle: 180, requires3Axis: true }
    },
    // Feeds and speeds adjustments
    feedsAndSpeeds: {
        radialEngagement: "Typically 5-15% of tool diameter",
        feedReduction: "Reduce feed 30-50% vs standard slot",
        rpmAdjustment: "Standard surface speed applies",
        chipLoadNote: "Account for radial chip thinning at light engagements"
    },
    // Thread milling specifics
    threadMilling: {
        climb_vs_conventional: {
            climb: { direction: "Bottom to top (Z+)", rotation: "G03 for RH thread", preferred: true },
            conventional: { direction: "Top to bottom (Z-)", rotation: "G02 for RH thread", preferred: false }
        },
        threadTypes: {
            internal: { toolPath: "Inside hole", toolSmaller: true },
            external: { toolPath: "Around OD", toolSmaller: true }
        },
        singleVsMultiForm: {
            single: { description: "One flute cuts one thread at a time", passes: "Multiple for full depth" },
            multi: { description: "Full thread form in one pass", faster: true, lessFlexible: true }
        }
    }
};
// GDT_TOLERANCE_KNOWLEDGE_DATABASE - From GD&T PDF
const GDT_TOLERANCE_KNOWLEDGE_DATABASE = {
    version: "1.0.0",
    source: "CNCCookbook Beginner's Guide to GD&T",

    // Plus/minus tolerancing
    plusMinusTolerancing: {
        definition: "Two-dimensional tolerancing system specifying allowable deviation from basic size",
        terminology: {
            basicSize: "The perfect dimension on the drawing",
            actualSize: "The measured dimension of the part",
            limits: "Maximum and minimum allowable sizes",
            allowance: "Minimum clearance or maximum interference between parts"
        },
        formats: {
            bilateral: { example: "2.000 ±0.005", meaning: "1.995 to 2.005 acceptable" },
            unilateral: { example: "2.000 +0.005/-0.000", meaning: "2.000 to 2.005 acceptable" },
            ISO_style: { example: "8mm -0.027/-0.034", meaning: "7.966 to 7.973 acceptable" }
        }
    },
    // Why tolerancing matters
    tolerancePurpose: {
        interchangeability: "Allow parts from different batches to fit together",
        costVsQuality: "Tighter tolerances = exponentially higher cost",
        costCurve: {
            "±0.1": { relativeCost: 1, process: "Standard machining" },
            "±0.01": { relativeCost: 2, process: "Careful machining" },
            "±0.001": { relativeCost: 5, process: "Precision machining" },
            "±0.0001": { relativeCost: 20, process: "Grinding/lapping" }
        }
    },
    // Fit standards
    fitStandards: {
        ISO_256: { description: "International fit standard", regions: "Worldwide" },
        ANSI_B4_2: { description: "American fit standard", regions: "USA" },
        DIN_7172: { description: "German fit standard", regions: "Europe" }
    },
    // Common fit types
    fitTypes: {
        clearance: { description: "Shaft always smaller than hole", examples: ["Running fit", "Sliding fit"] },
        transition: { description: "Could be clearance or interference", examples: ["Location fit"] },
        interference: { description: "Shaft always larger than hole", examples: ["Press fit", "Force fit"] }
    },
    // GD&T symbols (for future expansion)
    gdtSymbols: {
        form: ["Straightness", "Flatness", "Circularity", "Cylindricity"],
        orientation: ["Perpendicularity", "Angularity", "Parallelism"],
        location: ["Position", "Concentricity", "Symmetry"],
        runout: ["Circular Runout", "Total Runout"],
        profile: ["Profile of Line", "Profile of Surface"]
    },
    // Machining tolerance capabilities
    machiningCapabilities: {
        milling: {
            standard: "±0.005",
            precision: "±0.001",
            factors: ["Machine condition", "Tool quality", "Workholding rigidity"]
        },
        turning: {
            standard: "±0.002",
            precision: "±0.0005",
            factors: ["Chuck runout", "Tool wear", "Material consistency"]
        },
        grinding: {
            standard: "±0.0005",
            precision: "±0.0001",
            factors: ["Wheel condition", "Coolant", "Thermal stability"]
        }
    }
};
// FACE_MILLING_COMPREHENSIVE_DATABASE - From Face Milling PDF
const FACE_MILLING_COMPREHENSIVE_DATABASE = {
    version: "1.0.0",
    source: "CNCCookbook Face Mill Speeds and Feeds Guide",

    // Basics
    definition: "Milling strictly with the bottom of the cutter, typically using specialized face mills or shell mills",
    alternateNames: ["Surfacing", "Spoilboard surfacing", "Shell milling"],

    // Cutter types
    cutterTypes: {
        "45_degree": {
            leadAngle: 45,
            advantages: ["Lower cutting forces", "Good chip thinning", "Smoother entry/exit"],
            disadvantages: ["Leaves shoulder", "Less depth per pass"],
            bestFor: ["Roughing", "Interrupted cuts", "Thin-wall parts"]
        },
        "90_degree": {
            leadAngle: 90,
            advantages: ["True shoulder capability", "Maximum depth per pass"],
            disadvantages: ["Higher cutting forces", "More deflection"],
            bestFor: ["Finishing", "Shoulder cuts", "Square corners"]
        },
        high_feed: {
            leadAngle: "10-17",
            advantages: ["Very high feed rates", "Excellent for roughing"],
            disadvantages: ["Limited depth of cut", "Axial forces"],
            bestFor: ["High MRR roughing", "Large faces"]
        },
        round_insert: {
            leadAngle: "Variable",
            advantages: ["Strongest insert", "Good surface finish"],
            disadvantages: ["Complex chip thinning calculations"],
            bestFor: ["Hard materials", "Heavy roughing"]
        }
    },
    // Key parameters
    keyParameters: {
        cutterDiameter: {
            rule: "Cutter should be 20-50% wider than workpiece for best finish",
            minimum: "At least 25% wider than cut width for face milling",
            positioning: "Offset cutter so it doesn't cut full width on entry"
        },
        numberOfInserts: {
            effect: "More inserts = faster feed rate possible",
            formula: "Feed = RPM × Chip_Load × Number_of_Inserts"
        },
        cuttingWidth: {
            fullWidth: "100% engagement - highest forces, use reduced feed",
            partialWidth: "60-80% engagement optimal for most operations",
            finishing: "10-20% engagement for best surface finish"
        }
    },
    // Entry/exit strategies
    entryExitStrategies: {
        arcEntry: {
            description: "Roll into cut with arc motion",
            benefit: "Gradual engagement reduces shock loading",
            feedIncrease: "Can increase feed 20-40% with arc entry"
        },
        arcExit: {
            description: "Roll out of cut with arc motion",
            benefit: "Prevents corner chip-out and tool marks"
        },
        hsmToolpath: {
            description: "High-speed machining toolpath",
            requirements: "CAM software support",
            benefits: ["Constant chip load", "No sharp direction changes"]
        }
    },
    // Surface finish factors
    surfaceFinish: {
        insertsPerRevolution: "More inserts = better finish at same feed",
        wiper_insert: {
            description: "Flat edge on one insert for finishing",
            effect: "Dramatically improves surface finish",
            requirement: "Only one wiper insert, others standard"
        },
        feedRate: "Lower feed = better finish (diminishing returns below 0.002 IPT)",
        cuttingSpeed: "Higher speed generally improves finish"
    },
    // Chip thinning for face mills
    chipThinning: {
        "45_degree": { factor: 1.41, note: "Multiply chip load by 1.41 at 45 degrees" },
        "60_degree": { factor: 1.15, note: "Multiply chip load by 1.15 at 60 degrees" },
        "90_degree": { factor: 1.0, note: "No adjustment needed at 90 degrees" },
        formula: "Effective_Chip_Load = Target_Chip_Load / SIN(Lead_Angle)"
    }
};
// COORDINATE_TRANSFORM_DATABASE - From G-Code Coordinate Rotation PDF
const COORDINATE_TRANSFORM_DATABASE = {
    version: "1.0.0",
    source: "CNCCookbook G-Code Coordinate Rotation, Offsets, and Scaling Guide",

    // Coordinate pipeline
    coordinatePipeline: {
        step1_units: {
            description: "Convert program units to machine units",
            codes: { G20: "Inch", G21: "Metric" }
        },
        step2_coordinate_type: {
            description: "Convert relative/polar to absolute",
            codes: { G90: "Absolute", G91: "Incremental", G15: "Polar Off", G16: "Polar On" }
        },
        step3_offsets: {
            description: "Apply work, local, and workpiece offsets",
            codes: {
                work: ["G54", "G55", "G56", "G57", "G58", "G59"],
                local: "G52",
                workpiece: "G92"
            }
        },
        step4_scaling: {
            description: "Scale and mirror coordinates",
            codes: { G50: "Scaling Off", G51: "Scaling On" }
        },
        step5_rotation: {
            description: "Rotate coordinate system",
            codes: { G68: "Rotation On", G69: "Rotation Off" }
        }
    },
    // G68 Coordinate Rotation
    g68Rotation: {
        syntax: "G68 Xn.n Yn.n Rn.n",
        parameters: {
            X: "X coordinate of rotation center",
            Y: "Y coordinate of rotation center",
            R: "Rotation angle in degrees (positive = CCW)"
        },
        applications: [
            "Machining features in a circular pattern",
            "Compensating for vise/fixture misalignment",
            "Programming parts at angles without recalculating coordinates"
        ],
        example: {
            viseAlignment: [
                "(Probe finds vise jaw at 0.5 degrees)",
                "G68 X0 Y0 R-0.5 (Rotate coordinates to compensate)",
                "(Now program as if vise is perfectly aligned)"
            ]
        },
        cancel: "G69"
    },
    // G51 Scaling
    g51Scaling: {
        syntax: "G51 Xn.n Yn.n Zn.n Pn.nnnn",
        parameters: {
            X: "X coordinate of scale center",
            Y: "Y coordinate of scale center",
            Z: "Z coordinate of scale center",
            P: "Scale factor (1.0 = no change, 2.0 = double size)"
        },
        applications: [
            "Compensating for material thermal expansion",
            "RAMTIC manufacturing for ultra-precision",
            "Creating scaled versions of programs"
        ],
        ramticExample: {
            description: "Use probe to measure feature, calculate correction, apply via G51",
            process: [
                "1. Probe reference bore (known to be 2.0000)",
                "2. Probe reports 1.9993",
                "3. Correction = 0.0007 / 2.0000 = 0.00035",
                "4. G51 P1.00035 (Scale finish pass by correction factor)"
            ]
        },
        mirroring: {
            description: "Negative scale factor creates mirror",
            example: "G51 X0 Y0 P-1.0 (Mirror about X axis)"
        },
        cancel: "G50"
    },
    // Work offsets
    workOffsets: {
        standard: {
            G54: "Work offset 1 (most common)",
            G55: "Work offset 2",
            G56: "Work offset 3",
            G57: "Work offset 4",
            G58: "Work offset 5",
            G59: "Work offset 6"
        },
        extended: {
            fanuc: "G54.1 P1-P48 (48 additional offsets)",
            haas: "G154 P1-P99 (99 additional offsets)"
        },
        bestPractice: "One offset per part or fixture position"
    },
    // Local offset
    localOffset: {
        code: "G52",
        syntax: "G52 Xn.n Yn.n Zn.n",
        description: "Temporary shift added to current work offset",
        application: "Shift to bolt circle center, program bolt holes at radius, return",
        cancel: "G52 X0 Y0 Z0"
    },
    // Haas-specific
    haasSpecific: {
        DWO: {
            code: "G254/G255",
            description: "Dynamic Work Offset - enables G68 to work with cutter comp"
        },
        rotation: "G68 requires Settings 33 and 56 enabled on Haas"
    }
};
// FIVE_AXIS_PROGRAMMING_DATABASE - From 5-Axis Manual PDF
const FIVE_AXIS_PROGRAMMING_DATABASE = {
    version: "1.0.0",
    source: "Siemens SINUMERIK 5-Axis Machining Manual",

    // Kinematics types
    kinematicsTypes: {
        headHead: {
            description: "Two rotary axes in the spindle head",
            variants: ["Fork head", "Nutated fork"],
            characteristics: "Tool orientation changes, part stationary"
        },
        tableTable: {
            description: "Two rotary axes in the table",
            variants: ["Rotary/tilt table", "Trunnion"],
            characteristics: "Part orientation changes, tool vertical"
        },
        headTable: {
            description: "One rotary axis in head, one in table",
            variants: ["BC configuration", "AC configuration"],
            characteristics: "Combined tool and part orientation"
        }
    },
    // Tool orientation programming
    toolOrientation: {
        directionVector: {
            syntax: "A3=n B3=n C3=n",
            description: "Specify tool direction as unit vector",
            advantage: "Machine-independent programming",
            example: "N100 G1 X0 Y0 Z0 A3=1 B3=1 C3=1 (Tool at 45° diagonal)"
        },
        rotaryAxis: {
            syntax: "B=n C=n",
            description: "Direct rotary axis positions",
            advantage: "Direct control when needed",
            example: "N100 G1 X0 Y0 Z0 B=54.73561 C=45"
        },
        eulerAngles: {
            description: "Alternative angle conventions",
            types: ["RPY (Roll-Pitch-Yaw)", "ZYZ", "XYZ"]
        }
    },
    // TCP/RTCP
    tcpRtcp: {
        definition: "Tool Center Point Control / Rotary Tool Center Point",
        purpose: "Maintain tool tip position while orientation changes",
        gcodes: {
            fanuc: { on: "G43.4", off: "G49", alt: "G43.5" },
            haas: { on: "G234", off: "G49" },
            siemens: { on: "TRAORI", off: "TRAFOOF" },
            mazak: { on: "G43.4", off: "G49" }
        },
        behavior: "Control automatically compensates linear axes when rotary axes move",
        critical: "Must have accurate tool length for TCP to work correctly"
    },
    // Tool measurement for 5-axis
    toolMeasurement: {
        tcpReference: {
            description: "Tool Center Point reference location",
            variants: {
                tip: "For most end mills",
                center: "For ball end mills (at ball center)",
                custom: "For form tools"
            }
        },
        criticalNote: "CAM system and machine must use same TCP reference point"
    },
    // 5-axis programming modes
    programmingModes: {
        indexed: {
            description: "3+2 machining - rotate then machine",
            advantages: ["Simpler programming", "Full 3-axis rigidity"],
            sequence: "Position rotary axes, lock, machine as 3-axis"
        },
        simultaneous: {
            description: "All 5 axes move continuously",
            advantages: ["Complex geometry", "Smooth surfaces"],
            requirements: ["TCP active", "Proper kinematics", "CAM support"]
        }
    },
    // Surface quality considerations
    surfaceQuality: {
        cadCamChain: {
            step1: "CAD free-form surfaces",
            step2: "CAM converts to polyhedron approximation",
            step3: "Post processor generates G1 segments",
            step4: "CNC interpolates segments",
            issue: "Each step introduces deviation from true surface"
        },
        solutions: {
            CYCLE832: {
                controller: "Siemens",
                syntax: "CYCLE832(TOL, MODE)",
                effect: "High-speed settings + tolerance control"
            },
            G187: {
                controller: "Haas",
                syntax: "G187 Pn En",
                effect: "Smoothness control"
            },
            G05_1: {
                controller: "Fanuc",
                syntax: "G05.1 Q1",
                effect: "AI contour control"
            }
        }
    },
    // Common 5-axis problems
    commonProblems: {
        singularity: {
            description: "Rotary axes aligned = infinite solutions",
            detection: "Rapid axis motion without tool motion",
            solution: "Avoid singularity zones in toolpath"
        },
        axisLimits: {
            description: "Rotary axis hits travel limit",
            solution: "Rewind/unwind strategies, toolpath planning"
        },
        collisions: {
            description: "Tool, holder, or head hits part/fixture",
            solution: "Full simulation before running"
        }
    }
};
// ENHANCED_FEEDS_SPEEDS_DATABASE - From Feeds and Speeds Ultimate Guide PDF
const ENHANCED_FEEDS_SPEEDS_DATABASE = {
    version: "1.0.0",
    source: "CNCCookbook Feeds and Speeds Ultimate Guide 2024",

    // Core formulas
    coreFormulas: {
        rpm: {
            formula: "RPM = (SFM × 3.82) / Diameter",
            variables: {
                SFM: "Surface feet per minute (from material/tool charts)",
                Diameter: "Tool diameter in inches",
                "3.82": "Constant derived from 12/π"
            }
        },
        feedRate: {
            formula: "Feed (IPM) = RPM × Chip_Load × Number_of_Flutes",
            variables: {
                RPM: "Spindle speed from RPM formula",
                Chip_Load: "Inches per tooth (from tool manufacturer)",
                Number_of_Flutes: "Cutting edges on tool"
            }
        },
        surfaceSpeed: {
            formula: "SFM = (RPM × Diameter × π) / 12",
            description: "Speed at which material moves past cutting edge"
        }
    },
    // Chip thinning
    radialChipThinning: {
        description: "When radial engagement < 50%, actual chip is thinner than programmed",
        effect: "Must increase feed to maintain proper chip load and avoid rubbing",
        formula: "Adjusted_Chip_Load = Chip_Load / SQRT(1 - (1 - 2×(WOC/Diameter))^2)",
        simplified: {
            "50%_WOC": { factor: 1.0, note: "No adjustment" },
            "25%_WOC": { factor: 1.15, note: "Increase chip load 15%" },
            "10%_WOC": { factor: 1.66, note: "Increase chip load 66%" },
            "5%_WOC": { factor: 2.29, note: "Increase chip load 129%" }
        },
        criticalNote: "Ignoring chip thinning causes rubbing, heat, premature tool wear"
    },
    // HSM considerations
    hsmConsiderations: {
        constantChipLoad: "Maintain consistent chip load throughout toolpath",
        toolpathRules: [
            "Arc into cuts - no direct plunge",
            "Arc out of cuts - no direct exit",
            "No sharp corners - maintain smooth motion",
            "Control engagement - avoid full slotting"
        ],
        feedBenefits: "HSM toolpaths allow 2-4× feed rate increase"
    },
    // Material-specific guidance
    materialGuidance: {
        aluminum: {
            sfmRange: "500-1000+ SFM",
            chipLoad: "Aggressive - aluminum is forgiving",
            coolant: "Flood or mist, prevents built-up edge",
            notes: "Can push very hard with carbide"
        },
        steel_mild: {
            sfmRange: "80-300 SFM",
            chipLoad: "Moderate - depends on hardness",
            coolant: "Flood recommended",
            notes: "Higher carbon = lower speeds"
        },
        stainless: {
            sfmRange: "50-150 SFM",
            chipLoad: "Maintain chip load to avoid work hardening",
            coolant: "High pressure flood critical",
            notes: "Never let chip load drop - causes rubbing and work hardening"
        },
        titanium: {
            sfmRange: "50-150 SFM",
            chipLoad: "Moderate, consistent",
            coolant: "High pressure flood or through-tool",
            notes: "Heat is enemy - must evacuate chips with heat"
        }
    },
    // Tool engagement
    toolEngagement: {
        slotting: {
            engagement: "100%",
            feedAdjustment: "Reduce feed 50%",
            alternative: "Use trochoidal/adaptive to avoid"
        },
        fullWidth: {
            engagement: "100%",
            feedAdjustment: "Standard feeds",
            note: "Maximum force condition"
        },
        partial: {
            engagement: "25-75%",
            feedAdjustment: "Can often increase feed",
            note: "Account for chip thinning"
        },
        lightEngagement: {
            engagement: "<25%",
            feedAdjustment: "Significant chip thinning compensation needed",
            note: "HSM territory - very high feeds possible"
        }
    }
};
window.DEEP_HOLE_DRILLING_KNOWLEDGE_DATABASE = DEEP_HOLE_DRILLING_KNOWLEDGE_DATABASE;
window.HELICAL_INTERPOLATION_DATABASE = HELICAL_INTERPOLATION_DATABASE;
window.GDT_TOLERANCE_KNOWLEDGE_DATABASE = GDT_TOLERANCE_KNOWLEDGE_DATABASE;
window.FACE_MILLING_COMPREHENSIVE_DATABASE = FACE_MILLING_COMPREHENSIVE_DATABASE;
window.COORDINATE_TRANSFORM_DATABASE = COORDINATE_TRANSFORM_DATABASE;
window.FIVE_AXIS_PROGRAMMING_DATABASE = FIVE_AXIS_PROGRAMMING_DATABASE;
window.ENHANCED_FEEDS_SPEEDS_DATABASE = ENHANCED_FEEDS_SPEEDS_DATABASE;

// PDF KNOWLEDGE ENGINE INTEGRATIONS v1.0
// Connects PDF databases to existing engines and algorithms

// Integrate deep hole drilling knowledge with drilling engine
if (typeof PRISM_DRILLING_ENGINE !== 'undefined') {
    PRISM_DRILLING_ENGINE.deepHoleKnowledge = DEEP_HOLE_DRILLING_KNOWLEDGE_DATABASE;

    PRISM_DRILLING_ENGINE.selectDrillingStrategy = function(holeDepth, holeDiameter) {
        const ratio = holeDepth / holeDiameter;
        const thresholds = DEEP_HOLE_DRILLING_KNOWLEDGE_DATABASE.depthThresholds;

        if (ratio <= thresholds.standard.maxRatio) {
            return { strategy: 'STANDARD_DRILL', pecking: false, cycle: 'G81' };
        } else if (ratio <= thresholds.peckDrill.maxRatio) {
            return { strategy: 'PECK_DRILL', pecking: true, cycle: 'G83', peckDepth: holeDiameter * 0.5 };
        } else if (ratio <= thresholds.parabolicPeck.maxRatio) {
            return { strategy: 'PARABOLIC_PECK', pecking: true, cycle: 'G83', flute: 'PARABOLIC', peckDepth: holeDiameter * 0.3 };
        } else if (ratio <= thresholds.customDeepHole.maxRatio) {
            return { strategy: 'CUSTOM_DEEP_HOLE', pecking: true, custom: true, progressivePeck: true };
        } else {
            return { strategy: 'GUN_DRILL', specialized: true, throughSpindleCoolant: true };
        }
    };
    PRISM_DRILLING_ENGINE.getDepthAdjustments = function(depthRatio) {
        const adjustments = DEEP_HOLE_DRILLING_KNOWLEDGE_DATABASE.depthAdjustments;
        if (depthRatio <= 5) return { feedReduction: 1.0, rpmReduction: 1.0 };
        if (depthRatio <= 7) return adjustments["5D_to_7D"];
        if (depthRatio <= 10) return adjustments["7D_to_10D"];
        if (depthRatio <= 15) return adjustments["10D_to_15D"];
        return adjustments["15D_to_20D"];
    };
}
// Integrate helical interpolation with toolpath engine
if (typeof PRISM_REAL_TOOLPATH_ENGINE !== 'undefined') {
    PRISM_REAL_TOOLPATH_ENGINE.helicalKnowledge = HELICAL_INTERPOLATION_DATABASE;

    PRISM_REAL_TOOLPATH_ENGINE.generateHelicalBore = function(holeX, holeY, holeDiameter, toolDiameter, depth, pitch) {
        const helixDiameter = holeDiameter - toolDiameter;
        const revolutions = Math.ceil(depth / pitch);
        const zPerRev = depth / revolutions;
        const gcode = [];

        // Position
        gcode.push(`G00 X${(holeX + helixDiameter/2).toFixed(4)} Y${holeY.toFixed(4)}`);
        gcode.push(`G00 Z0.1`);
        gcode.push(`G01 Z0.001 F10.0`);

        // Generate helix using 90-degree arcs
        let currentZ = 0;
        const zPerArc = zPerRev / 4;
        const r = helixDiameter / 2;

        for (let rev = 0; rev < revolutions; rev++) {
            // Four 90-degree arcs per revolution
            for (let arc = 0; arc < 4; arc++) {
                currentZ -= zPerArc;
                const angle = (arc + 1) * 90 * Math.PI / 180;
                const x = holeX + r * Math.cos(angle);
                const y = holeY + r * Math.sin(angle);
                gcode.push(`G03 X${x.toFixed(4)} Y${y.toFixed(4)} Z${currentZ.toFixed(4)} R${r.toFixed(4)}`);
            }
        }
        // Exit helix
        gcode.push(`G00 Z5.0`);

        return gcode;
    };
}
// Integrate coordinate transforms with post processor
if (typeof UNIVERSAL_POST_PROCESSOR_ENGINE !== 'undefined') {
    UNIVERSAL_POST_PROCESSOR_ENGINE.coordTransformKnowledge = COORDINATE_TRANSFORM_DATABASE;

    UNIVERSAL_POST_PROCESSOR_ENGINE.generateRotation = function(controller, centerX, centerY, angle) {
        const pipeline = COORDINATE_TRANSFORM_DATABASE.coordinatePipeline;

        switch(controller.toLowerCase()) {
            case 'fanuc':
            case 'haas':
            case 'mazak':
                return `G68 X${centerX} Y${centerY} R${angle}`;
            case 'siemens':
                return `ROT RPL=${angle}`;
            case 'heidenhain':
                return `CYCL DEF 10.0 ROTATION\nCYCL DEF 10.1 ROT${angle >= 0 ? '+' : ''}${angle}`;
            default:
                return `G68 X${centerX} Y${centerY} R${angle}`;
        }
    };
    UNIVERSAL_POST_PROCESSOR_ENGINE.generateScaling = function(controller, centerX, centerY, scaleFactor) {
        switch(controller.toLowerCase()) {
            case 'fanuc':
            case 'haas':
            case 'mazak':
                return `G51 X${centerX} Y${centerY} P${scaleFactor.toFixed(5)}`;
            case 'siemens':
                return `SCALE X${scaleFactor} Y${scaleFactor} Z${scaleFactor}`;
            default:
                return `G51 X${centerX} Y${centerY} P${scaleFactor.toFixed(5)}`;
        }
    };
}
// Integrate 5-axis knowledge with kinematic solver
if (typeof PRISM_KINEMATIC_SOLVER !== 'undefined') {
    PRISM_KINEMATIC_SOLVER.fiveAxisKnowledge = FIVE_AXIS_PROGRAMMING_DATABASE;

    PRISM_KINEMATIC_SOLVER.getTCPCode = function(controller, enable = true) {
        const tcpCodes = FIVE_AXIS_PROGRAMMING_DATABASE.tcpRtcp.gcodes;
        const ctrl = controller.toLowerCase();

        if (tcpCodes[ctrl]) {
            return enable ? tcpCodes[ctrl].on : tcpCodes[ctrl].off;
        }
        return enable ? 'G43.4' : 'G49'; // Default to Fanuc style
    };
    PRISM_KINEMATIC_SOLVER.getKinematicsType = function(machineConfig) {
        const types = FIVE_AXIS_PROGRAMMING_DATABASE.kinematicsTypes;

        if (machineConfig.rotaryAxes.head === 2) return types.headHead;
        if (machineConfig.rotaryAxes.table === 2) return types.tableTable;
        return types.headTable;
    };
}
// Integrate feeds/speeds knowledge with cutting parameter engine
if (typeof PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE !== 'undefined') {
    PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE.feedsSpeedsKnowledge = ENHANCED_FEEDS_SPEEDS_DATABASE;

    PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE.calculateChipThinningFactor = function(radialDepth, toolDiameter) {
        const engagement = radialDepth / toolDiameter;

        if (engagement >= 0.5) return 1.0;

        // Formula: factor = 1 / SQRT(1 - (1 - 2*engagement)^2)
        const inner = 1 - Math.pow(1 - 2 * engagement, 2);
        return 1 / Math.sqrt(inner);
    };
    PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE.adjustForChipThinning = function(baseChipLoad, radialDepth, toolDiameter) {
        const factor = this.calculateChipThinningFactor(radialDepth, toolDiameter);
        return baseChipLoad * factor;
    };
}
// Integrate face milling knowledge
if (typeof PRISM_FACE_MILLING_ENGINE === 'undefined') {
    window.PRISM_FACE_MILLING_ENGINE = {};
}
PRISM_FACE_MILLING_ENGINE.faceMillingKnowledge = FACE_MILLING_COMPREHENSIVE_DATABASE;

PRISM_FACE_MILLING_ENGINE.selectCutterType = function(operation, material) {
    const cutters = FACE_MILLING_COMPREHENSIVE_DATABASE.cutterTypes;

    if (operation === 'roughing') {
        if (material === 'ALUMINUM' || material === 'MILD_STEEL') {
            return { type: 'high_feed', leadAngle: 15, reason: 'High MRR roughing' };
        }
        return { type: '45_degree', leadAngle: 45, reason: 'Lower forces for roughing' };
    }
    if (operation === 'finishing') {
        return { type: '90_degree', leadAngle: 90, reason: 'True shoulder, best finish' };
    }
    if (operation === 'interrupted') {
        return { type: 'round_insert', leadAngle: 'variable', reason: 'Strongest insert for interrupted cuts' };
    }
    return { type: '45_degree', leadAngle: 45, reason: 'General purpose' };
};
PRISM_FACE_MILLING_ENGINE.calculateChipThinningFactor = function(leadAngle) {
    const thinning = FACE_MILLING_COMPREHENSIVE_DATABASE.chipThinning;

    if (leadAngle === 90) return thinning["90_degree"].factor;
    if (leadAngle <= 50 && leadAngle >= 40) return thinning["45_degree"].factor;
    if (leadAngle <= 65 && leadAngle >= 55) return thinning["60_degree"].factor;

    // General formula for other angles
    return 1 / Math.sin(leadAngle * Math.PI / 180);
};
// Integrate GD&T knowledge with tolerance engine
if (typeof PRISM_TOLERANCE_ENGINE === 'undefined') {
    window.PRISM_TOLERANCE_ENGINE = {};
}
PRISM_TOLERANCE_ENGINE.gdtKnowledge = GDT_TOLERANCE_KNOWLEDGE_DATABASE;

PRISM_TOLERANCE_ENGINE.estimateMachiningCost = function(tolerance) {
    const costCurve = GDT_TOLERANCE_KNOWLEDGE_DATABASE.tolerancePurpose.costCurve;

    if (tolerance >= 0.1) return costCurve["±0.1"];
    if (tolerance >= 0.01) return costCurve["±0.01"];
    if (tolerance >= 0.001) return costCurve["±0.001"];
    return costCurve["±0.0001"];
};
PRISM_TOLERANCE_ENGINE.suggestProcess = function(tolerance) {
    const capabilities = GDT_TOLERANCE_KNOWLEDGE_DATABASE.machiningCapabilities;

    if (tolerance >= 0.005) return { process: 'milling', quality: 'standard' };
    if (tolerance >= 0.001) return { process: 'milling', quality: 'precision' };
    if (tolerance >= 0.0005) return { process: 'grinding', quality: 'standard' };
    return { process: 'grinding', quality: 'precision' };
};
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM v8.87.001] PDF Knowledge Databases and Engine Integrations loaded');

// PRISM v8.87.001 - HYPERMILL AUTOMATION CENTER INTEGRATION
// Extracted from OMGEAPP.ZIP - 36 Function Library Modules

const HYPERMILL_AUTOMATION_CENTER_DATABASE = {
    version: "1.0.0",
    source: "OMGEAPP.ZIP",
    moduleCount: 36,

    // CORE PROGRAMMING MODULES

    includeGEBasicProgramming: {
        description: "Core feature/macro settings, hole/pocket recognition, job separation",
        functions: {
            frameLimits: {
                d3Range: { bAxisMin: -180, bAxisMax: 180, cAxisMin: -360, cAxisMax: 360 },
                planeBased: { faceLayerSelection: true, faceColorSelection: true }
            },
            featureMacroFilter: {
                materialGroup: true,
                machiningGroup: true,
                macroGroup: true,
                featureUUID: true,
                featureName: true,
                multipleAccessControl: true
            },
            holeFeatureRecognition: {
                associativePointCreation: true,
                groupingFeatures: true,
                frameModes: ["MIXED", "2D", "5X"],
                toleranceSettings: { min: 0.001, max: 0.1 },
                diameterLimits: { min: 0.5, max: 500 },
                segmentAngles: { default: 15, range: [1, 45] },
                spotDepthDetection: true,
                bottomChecking: true,
                sinkChecking: true,
                ncsReference: true,
                faceTagging: true
            },
            pocketRecognition: {
                types: ["WITH_BOTTOM", "CLOSE_THROUGH", "OPEN_THROUGH", "T_NUT"],
                frameReference: true,
                colorTableFiltering: true
            },
            jobSeparation: {
                moveJobsBetweenContainers: true,
                sourceTargetJoblistSelection: true
            }
        }
    },
    includeGETool: {
        description: "Tool management, VT optimization, database search",
        functions: {
            toolManagement: {
                updateAllTools: true,
                unlinkAllTools: true,
                vtXmlPreparation: true,
                toolOptimization: true
            },
            searchTools: {
                sqlStringQueries: true,
                propertyFilters: { maxProperties: 12 },
                toolProperties: {
                    ncTool: [
                        "NCNumber", "ID", "Name", "Comment", "ObjGuid", "Folder",
                        "Extension", "Holder", "Head", "MeasurementSystem",
                        "CompensationLength", "UsableLength", "PresetDiameter",
                        "ClearanceLength", "GageLength", "SettingLengthZ", "SettingLengthX",
                        "ReferencePoint", "DepotPath", "Adaptor", "AdaptorIsoCode",
                        "CouplingRotation", "BreakageCheck"
                    ],
                    tool: [
                        "Type", "Name", "Comment", "Folder", "CuttingMaterial",
                        "MeasurementSystem", "SpindleDirection", "Length"
                    ],
                    millingTool: [
                        "FreeTipGeometry", "FreeShaftGeometry", "CuttingEdges",
                        "CuttingLength", "ShaftType", "ShaftDiameter", "Diameter",
                        "TipLength", "BreakThroughLength", "CoreDiameter", "Tapered",
                        "TaperAngle", "Chamfered", "ChamferHeight", "CornerRadius",
                        "TipDiameter", "TipAngle", "BarrelRadius", "NominalDiameter",
                        "Pitch", "AllowPlunge", "CuttingEdgeOrientation"
                    ]
                }
            },
            toolFromDatabase: true,
            calculateMinimalToolLength: true,
            adjustTools: true,
            newLocalToolNumbers: true
        }
    },
    includeGEStock: {
        description: "Stock box/dimension/file/surface/cylinder management",
        functions: {
            boxOffset: {
                stockOffsetXYZ: true,
                boundingBoxLayer: true,
                faceMillingContourLayer: true,
                tolerance: 0.01,
                layerVisibilityControl: true
            },
            boxDimension: {
                stockWidthXY: true,
                stockHeight: true,
                stockPositions: ["TOP_CENTER", "BOTTOM_CENTER", "FRONT_LEFT", "FRONT_RIGHT"]
            },
            stockFile: {
                stlImport: true,
                writeToJobList: true
            },
            stockSurface: {
                layerColorSelection: true,
                closeStockDirectly: true
            },
            cylinderOffset: {
                cylindricalStockCreation: true
            },
            visualization: {
                boundingBoxLines: true,
                colorCoding: { rgbRange: [50, 255] }
            }
        }
    },
    includeGEFeatureMacro: {
        description: "Feature/macro filters, hole recognition settings",
        functions: {
            featureFilters: {
                byMaterialGroup: true,
                byMachiningGroup: true,
                byMacroGroup: true,
                byFeatureUUID: true,
                byFeatureName: true,
                multipleAccess: true
            },
            holeRecognitionSettings: {
                frameModes: ["MIXED", "2D", "5X"],
                toleranceRange: [0.001, 0.1],
                diameterRange: [0.5, 500],
                segmentAngle: { default: 15, min: 1, max: 45 }
            }
        }
    },
    includeGEProgramming: {
        description: "Compound jobs, linking jobs, job optimization, stock chains",
        functions: {
            jobManagement: {
                newCompoundJob: true,
                newLinkingJob: { types: ["2D", "5X"] },
                newMainSpindleJob: true,
                newSubSpindleJob: true,
                moveJobs: true,
                separateJobs: true,
                deleteJobs: true,
                deleteEmptyJobs: true,
                deleteJobList: true,
                copyJob: true,
                defineJobRange: true
            },
            jobOptimization: {
                methods: [
                    "MACRO_REFERENCE",
                    "MACRO_REFERENCE_WITH_GROUPING",
                    "JOBLIST_REFERENCE_TOOL_FRAME",
                    "JOBLIST_REFERENCE_FRAME_TOOL"
                ],
                renumberOption: true
            },
            stockChainManagement: {
                createStockChain: { modes: ["LAST", "ALL", "CHOSEN", "COMPOUND"] },
                smartStockChain: true,
                deleteStockChain: true,
                markResultStock: true,
                healStockChain: true
            },
            jobCalculation: {
                calculateJobs: true,
                onlyExpiredJobs: true,
                ignoreJobsWithError: true,
                serverMode: ["SYNCHRONOUS", "ASYNCHRONOUS"],
                jobNeedsRecalculation: true,
                updateFilter: true,
                updateModelDimension: true,
                globalClearancePlane: true
            }
        }
    },
    // ADDITIONAL MODULES

    includeGEBookmarks: {
        description: "Bookmark management for navigation",
        functions: { createBookmark: true, navigateBookmark: true, deleteBookmark: true }
    },
    includeGECADInfo: {
        description: "CAD file information extraction",
        functions: {
            getModelInfo: true,
            getLayerInfo: true,
            getMaterialInfo: true,
            getAssemblyStructure: true
        }
    },
    includeGEClientServer: {
        description: "Client/server communication for distributed processing",
        functions: {
            serverConnection: true,
            batchProcessing: true,
            jobDistribution: true
        }
    },
    includeGEColor: {
        description: "Color management and filtering",
        functions: {
            colorFilters: true,
            colorTables: true,
            applyColorSchemes: true
        }
    },
    includeGECoordinates: {
        description: "Coordinate system management",
        functions: {
            createWorkplaneFromGeometry: true,
            transformCoordinates: true,
            alignToFeature: true
        }
    },
    includeGECurves: {
        description: "Curve manipulation and analysis",
        functions: {
            extractCurves: true,
            projectCurves: true,
            offsetCurves: true,
            analyzeCurvature: true
        }
    },
    includeGEDeformation: {
        description: "Part deformation analysis",
        functions: {
            springbackCompensation: true,
            thermalDeformation: true
        }
    },
    includeGEElectrodes: {
        description: "EDM electrode management",
        functions: {
            electrodeDesign: true,
            sparkGapCalculation: true,
            orbitCalculation: true,
            electrodePositioning: true
        }
    },
    includeGEExcel: {
        description: "Excel integration for data exchange",
        functions: {
            exportToExcel: true,
            importFromExcel: true,
            toolListExport: true,
            setupSheetGeneration: true
        }
    },
    includeGEFiles: {
        description: "File handling operations",
        functions: {
            fileImport: true,
            fileExport: true,
            batchFileProcessing: true
        }
    },
    includeGEFinish: {
        description: "Surface finish specifications",
        functions: {
            finishRequirements: true,
            stepoverCalculation: true,
            scallopsHeightCalculation: true
        }
    },
    includeGEFrames: {
        description: "Reference frame management",
        functions: {
            createFrame: true,
            alignFrame: true,
            transformFrame: true,
            frameFromFeature: true
        }
    },
    includeGEGrave: {
        description: "Engraving operations",
        functions: {
            textEngraving: true,
            logoEngraving: true,
            depthControl: true
        }
    },
    includeGEGroups: {
        description: "Object grouping management",
        functions: {
            createGroup: true,
            dissolveGroup: true,
            selectByGroup: true
        }
    },
    includeGEHelpers: {
        description: "Utility helper functions",
        functions: {
            unitConversion: true,
            mathOperations: true,
            stringManipulation: true
        }
    },
    includeGELayers: {
        description: "Layer management",
        functions: {
            createLayer: true,
            setLayerVisibility: true,
            moveToLayer: true,
            layerFiltering: true
        }
    },
    includeGEMachiningTime: {
        description: "Machining time calculation",
        functions: {
            cycleTimeEstimation: true,
            rapidTimeCalculation: true,
            cuttingTimeCalculation: true,
            toolChangeTime: true
        }
    },
    includeGEMeshes: {
        description: "Mesh manipulation",
        functions: {
            meshGeneration: true,
            meshSimplification: true,
            meshRepair: true,
            meshBoolean: true
        }
    },
    includeGEModelProcessing: {
        description: "Model processing and healing",
        functions: {
            modelHealing: true,
            surfaceAnalysis: true,
            gapDetection: true,
            modelSimplification: true
        }
    },
    includeGENcs: {
        description: "NC program management",
        functions: {
            ncsOutput: true,
            postProcessorSelection: true,
            ncVerification: true
        }
    },
    includeGEProperties: {
        description: "Property management",
        functions: {
            getProperty: true,
            setProperty: true,
            propertyFiltering: true
        }
    },
    includeGEShapes: {
        description: "Basic shape creation",
        functions: {
            createPrimitives: true,
            shapeBoolean: true,
            shapeTransform: true
        }
    },
    includeGESolids: {
        description: "Solid modeling operations",
        functions: {
            solidBoolean: true,
            solidOffset: true,
            solidAnalysis: true,
            solidHealing: true
        }
    },
    includeGESpreadsheet: {
        description: "Spreadsheet integration",
        functions: {
            dataExport: true,
            dataImport: true,
            parameterTable: true
        }
    },
    includeGETags: {
        description: "Object tagging system",
        functions: {
            createTag: true,
            findByTag: true,
            tagFiltering: true
        }
    },
    includeGETransformations: {
        description: "Geometric transformations",
        functions: {
            translate: true,
            rotate: true,
            scale: true,
            mirror: true,
            patternTransform: true
        }
    },
    includeGEUI: {
        description: "User interface helpers",
        functions: {
            dialogCreation: true,
            progressBar: true,
            messageBox: true,
            inputPrompt: true
        }
    },
    includeGEVariables: {
        description: "Variable management",
        functions: {
            globalVariables: true,
            localVariables: true,
            variablePersistence: true
        }
    },
    includeGEViceClamping: {
        description: "Workholding and vice setup",
        functions: {
            viceSelection: { types: ["CENTRIC", "3_JAW", "4_JAW", "CLAMP"] },
            vicePositioning: true,
            clampForceCalculation: true,
            fixtureMapping: {
                centric6_200: { minY: 0, maxY: 200, minX: 0, maxX: 200 },
                centric6_300: { minY: 200, maxY: 300, minX: 0, maxX: 300 },
                centric6_500: { minY: 300, maxY: 500, minX: 0, maxX: 500 }
            }
        }
    },
    includeGEWorkplanes: {
        description: "Workplane creation and management",
        functions: {
            createWorkplane: true,
            alignWorkplane: true,
            workplaneFromGeometry: true,
            workplaneTransform: true
        }
    },
    includeGEXml: {
        description: "XML file handling",
        functions: {
            parseXML: true,
            createXML: true,
            xmlTransform: true
        }
    }
};
// HYPERMILL FIXTURE MODELS DATABASE (from HMC files)

const HYPERMILL_FIXTURE_MODELS_DATABASE = {
    version: "1.0.0",
    source: "OMGEAPP.ZIP HMC files",

    fixtures: {
        threeJawChuck: {
            models: ["20-150", "20-400", "20-600"],
            clampRange: { min: 20, max: 600 },
            layerName: "CLAMP_DYN_0DEG"
        },
        fourJawChuck: {
            models: ["10-130"],
            clampRange: { min: 10, max: 130 },
            layerName: "CLAMP_DYN_0DEG"
        },
        centricVice: {
            models: ["6-200", "6-300", "6-500"],
            clampRange: { min: 0, max: 500 },
            layerName: "CLAMP_DYN_0DEG"
        },
        clamp: {
            models: ["120-025", "120-050", "120-080", "120-120"],
            variants: { "06-147": true, "120-267": true },
            layerName: "CLAMP_DYN_0DEG"
        },
        simpleClamp: {
            models: ["080-020", "080-040", "080-080", "120-025", "120-050", "120-080", "120-120"],
            variants: { "06-48": true, "70-112": true, "06-147": true, "120-267": true },
            layerName: "CLAMP_DYN_0DEG"
        }
    },
    modelProperties: {
        material: 61,
        measurementUnits: { mm: { decimals: 3, format: "%.3f" }, inch: { decimals: 4, format: "%.4f" } },
        tolerances: {
            geomTolerance: 0.001,
            boundaryTolerance: 0.188,
            curveTessellationTolerance: 0.02,
            surfaceTolerance: 0.15
        },
        geomExtensionFactor: 1.2
    },
    selectionByDimension: function(partWidth, partLength, partHeight) {
        // Auto-select fixture based on part dimensions
        if (partWidth <= 200 && partLength <= 200) return "Centric_6-200";
        if (partWidth <= 300 && partLength <= 300) return "Centric_6-300";
        if (partWidth <= 500 && partLength <= 500) return "Centric_6-500";
        // Fallback to chuck for round parts
        if (partWidth === partLength) {
            if (Math.max(partWidth, partLength) <= 150) return "3_Jaw_Chuck_20-150";
            if (Math.max(partWidth, partLength) <= 400) return "3_Jaw_Chuck_20-400";
            return "3_Jaw_Chuck_20-600";
        }
        return "Simple_Clamp_120-120";
    }
};
// HYPERMILL AUTOMATION ENGINE - Orchestrates OMGEAPP functions

const HYPERMILL_AUTOMATION_ENGINE = {
    version: "1.0.0",

    // Auto-setup workflow
    autoSetupPart: function(partGeometry, machineConfig) {
        const workflow = {
            steps: [],
            status: "initialized"
        };
        // Step 1: Analyze part using includeGECADInfo
        workflow.steps.push({
            module: "includeGECADInfo",
            action: "getModelInfo",
            result: null
        });

        // Step 2: Create stock using includeGEStock
        workflow.steps.push({
            module: "includeGEStock",
            action: "boxOffset",
            parameters: { offsetX: 2, offsetY: 2, offsetZ: 2 }
        });

        // Step 3: Recognize features using includeGEBasicProgramming
        workflow.steps.push({
            module: "includeGEBasicProgramming",
            action: "holeFeatureRecognition",
            parameters: { frameMode: "MIXED", groupFeatures: true }
        });

        workflow.steps.push({
            module: "includeGEBasicProgramming",
            action: "pocketRecognition",
            parameters: { types: ["WITH_BOTTOM", "CLOSE_THROUGH"] }
        });

        // Step 4: Select fixture using includeGEViceClamping
        workflow.steps.push({
            module: "includeGEViceClamping",
            action: "viceSelection",
            parameters: { autoSelect: true }
        });

        // Step 5: Assign macros using includeGEFeatureMacro
        workflow.steps.push({
            module: "includeGEFeatureMacro",
            action: "assignMacros",
            parameters: { useDefaults: true }
        });

        // Step 6: Create compound job using includeGEProgramming
        workflow.steps.push({
            module: "includeGEProgramming",
            action: "newCompoundJob"
        });

        // Step 7: Optimize jobs
        workflow.steps.push({
            module: "includeGEProgramming",
            action: "jobOptimization",
            parameters: { method: "JOBLIST_REFERENCE_TOOL_FRAME" }
        });

        // Step 8: Create stock chain
        workflow.steps.push({
            module: "includeGEProgramming",
            action: "createStockChain",
            parameters: { mode: "ALL", smart: true }
        });

        // Step 9: Calculate and verify
        workflow.steps.push({
            module: "includeGEProgramming",
            action: "calculateJobs",
            parameters: { onlyExpired: true }
        });

        return workflow;
    },
    // Tool management workflow
    toolSetup: function(requiredTools) {
        return {
            module: "includeGETool",
            actions: [
                { action: "searchTools", parameters: { sqlQuery: "SELECT * FROM tools" } },
                { action: "toolFromDatabase", parameters: { tools: requiredTools } },
                { action: "calculateMinimalToolLength", parameters: { safetyFactor: 1.1 } },
                { action: "toolOptimization" }
            ]
        };
    },
    // Machining time estimation
    estimateCycleTime: function(jobList) {
        return {
            module: "includeGEMachiningTime",
            calculations: {
                rapidTime: 0,
                cuttingTime: 0,
                toolChangeTime: 0,
                totalTime: 0
            }
        };
    }
};
// Register with PRISM systems
if (typeof PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR !== 'undefined') {
    PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR.registerDatabase('HYPERMILL_AUTOMATION_CENTER_DATABASE', HYPERMILL_AUTOMATION_CENTER_DATABASE);
    PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR.registerDatabase('HYPERMILL_FIXTURE_MODELS_DATABASE', HYPERMILL_FIXTURE_MODELS_DATABASE);
    PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR.registerEngine('HYPERMILL_AUTOMATION_ENGINE', HYPERMILL_AUTOMATION_ENGINE);
}
console.log("PRISM: HyperMill Automation Center (OMGEAPP) Integration Loaded - 36 modules, 7 fixtures");

// PRISM v8.87.001 - CNC COOKBOOK KNOWLEDGE DATABASE
// Extracted from project folder PDF archives - 6 comprehensive guides

const CNCCOOKBOOK_KNOWLEDGE_DATABASE = {
    version: "1.0.0",
    source: "CNCCookbook.com Guides (Extracted)",
    totalDocuments: 6,
    totalPages: 199,
    totalWords: 30880,

    // FEEDS AND SPEEDS MASTER KNOWLEDGE
    // Source: Feeds_and_Speeds_The_Ultimate_Guide_Updated_for_2024

    feedsAndSpeeds: {
        fundamentals: {
            description: "Speeds and Feeds are the key to Tool Life, Fastest Machining Time (MRR), and Surface Finish",
            keyPrinciples: [
                "Speeds refers to cutting speed (spindle RPM)",
                "Feeds refers to the feed rate at which the cutting tool moves through the workpiece",
                "60 variables affect optimal feeds and speeds - not just surface speed and chip load",
                "Radial chip thinning occurs when cutting less than half the cutter diameter",
                "Simple formulas don't account for chip thinning - they become wrong for thin cuts"
            ]
        },
        formulas: {
            rpm: {
                formula: "RPM = (SFM × 12) / (π × D)",
                variables: { SFM: "Surface Feet per Minute", D: "Cutter Diameter in inches" },
                notes: "This is the basic formula - advanced calculations consider many more variables"
            },
            feedRate: {
                formula: "Feed Rate = RPM × Flutes × Chip Load",
                variables: { RPM: "Spindle speed", Flutes: "Number of cutting edges", ChipLoad: "Chip per tooth" },
                notes: "Chip thinning factor must be applied when stepover < 50% of diameter"
            },
            chipThinning: {
                description: "When radial DOC < tool radius, chips become thinner than programmed chip load",
                effect: "Must increase feed rate to maintain proper chip thickness",
                formula: "Adjusted Feed = Programmed Feed × Chip Thinning Factor",
                factor: "CTF = 1 / sqrt(1 - (1 - 2×ae/D)²)"
            },
            mrr: {
                formula: "MRR = WOC × DOC × Feed Rate",
                variables: { WOC: "Width of Cut", DOC: "Depth of Cut", FeedRate: "in IPM" },
                units: "cubic inches per minute"
            }
        },
        sweetSpot: {
            concept: "Every tool/material combination has a Sweet Spot for optimal performance",
            factors: [
                "Too slow = rubbing instead of cutting = heat buildup = poor tool life",
                "Too fast = excessive heat generation = rapid tool wear",
                "Sweet Spot balances chip load, surface speed, and material removal"
            ]
        },
        commonMistakes: [
            "Relying only on sound or feel - requires extreme experience, can't distinguish good from great",
            "Using only tooling catalog data - catalogs are 2D tables covering only 2 variables",
            "Copying feeds/speeds from internet forums - no quality control or testing standards",
            "Using CAM software defaults - most CAM does poor job with feeds and speeds",
            "Not accounting for chip thinning in light radial cuts"
        ],

        bestPractices: [
            "Use a dedicated feeds and speeds calculator",
            "Consider all variables: material, tool geometry, machine rigidity, coolant",
            "Adjust for deflection - the 'silent tool killer'",
            "Account for chip thinning when stepover < 50% diameter",
            "Test and verify with actual cuts"
        ]
    },
    // DEEP HOLE DRILLING KNOWLEDGE
    // Source: Deep_Hole_Drilling__Easy_Guide_Tips_CNC_Programming__Video

    deepHoleDrilling: {
        definition: "Any hole depth > 3-4× drill diameter is considered a deep hole",

        techniques: {
            peckDrilling: {
                description: "Periodically retract drill to break and clear chips",
                when: "Standard technique for most deep holes",
                depthLimit: "Up to 7× diameter with standard drills",
                bestPractices: [
                    "More frequent pecks for deeper holes",
                    "Pause briefly after slight retract (0.001") to pull chips",
                    "Never retract completely clear of hole",
                    "Avoid trapping chips at bottom - dulls drill and ruins finish"
                ],
                peckDepthGuide: {
                    "3-5×D": "Peck every 1× diameter",
                    "5-7×D": "Peck every 0.5× diameter",
                    ">7×D": "Use parabolic flutes or specialized tooling"
                }
            },
            parabolicFlute: {
                description: "Special flute geometry optimized for chip extraction",
                depthCapability: "Up to 20× diameter",
                when: "Depths > 7× diameter",
                advantages: [
                    "Better chip evacuation",
                    "Reduced heat buildup",
                    "Less prone to chip packing"
                ]
            },
            gunDrilling: {
                description: "Single-flute drill with internal coolant passages",
                depthCapability: "50× diameter and beyond",
                when: "Very deep holes, precision requirements",
                features: [
                    "High-pressure coolant through drill",
                    "Self-guiding design",
                    "Excellent straightness"
                ]
            },
            btaDrilling: {
                description: "Boring and Trepanning Association drilling",
                depthCapability: "100× diameter and beyond",
                when: "Large diameter deep holes",
                features: [
                    "Chips evacuated through tool body",
                    "Higher MRR than gun drilling",
                    "Better for larger diameters"
                ]
            }
        },
        chipControl: {
            importance: "Biggest obstacle in deep holes is chip evacuation",
            strategies: [
                "Use high-pressure coolant at tool tip",
                "Through-spindle coolant is ideal",
                "Peck drilling breaks chips into manageable pieces",
                "Avoid stringy chips - compact chips evacuate better"
            ],
            coolantDelivery: {
                flood: "Basic, least effective for deep holes",
                throughSpindle: "Best option - blasts chips from bottom up",
                highPressure: "Higher pressure = better chip evacuation"
            }
        },
        depthToTechniqueMap: {
            "0-3×D": "Standard drilling, no peck required",
            "3-7×D": "Peck drilling with standard twist drill",
            "7-20×D": "Parabolic flute drill with peck",
            "20-50×D": "Gun drilling recommended",
            ">50×D": "BTA drilling for best results"
        }
    },
    // HELICAL INTERPOLATION KNOWLEDGE
    // Source: Helical_Interpolation_for_Thread_Milling_Holes_and_Spiral_Ramps

    helicalInterpolation: {
        definition: "Cutting by moving the cutter along a helix path",
        programming: "Series of G02/G03 arc commands with Z-axis change",

        applications: {
            holeMaking: {
                description: "Create holes larger than tool diameter",
                advantages: [
                    "One tool can make many hole sizes",
                    "Lower horsepower than large drill",
                    "Better tolerances than big twist drills",
                    "Cost savings vs. large drill inventory"
                ],
                when: "Large holes, tolerance requirements, tool reduction"
            },
            circularRamping: {
                description: "Getting cutter to depth before machining features",
                advantages: [
                    "Gentler than plunging",
                    "Better chip room than linear ramping",
                    "Reduces tool stress"
                ],
                comparison: {
                    plunge: "Worst - maximum tool stress",
                    linearRamp: "Better - distributes load",
                    helicalRamp: "Best - most breathing room for chips"
                }
            },
            threadMilling: {
                description: "Creating threads via helical interpolation",
                advantages: [
                    "One tool for multiple thread sizes",
                    "Both ID and OD threads",
                    "Better thread quality",
                    "Easier chip control"
                ]
            }
        },
        gCodeExample: {
            description: "Helix programmed as series of arcs with Z change",
            code: [
                "G00 X0.2375 Y0.0",
                "G01 Z0.001",
                "G03 R0.2375 X0.1679 Y0.1679 Z-0.067",
                "G03 R0.2375 X0.0 Y0.2375 Z-0.134",
                "G03 R0.2375 X-0.1679 Y0.1679 Z-0.201",
                "( Continue arcs with decreasing Z... )"
            ],
            notes: [
                "Most controls prefer 90° arcs or less",
                "Check control for helix support",
                "3-axis simultaneous motion required"
            ]
        },
        calcConsiderations: {
            holeSize: "Hole = Tool Diameter + 2 × Stepover",
            rampAngle: "Typically 2-5 degrees for entry",
            arcSegments: "90° arcs most compatible with controls"
        }
    },
    // WORKHOLDING AND FIXTURING KNOWLEDGE
    // Source: Total_Guide_to_CNC_Jigs_Fixtures_and_Workholding_Solutions_for_Mills

    workholding: {
        terminology: {
            workholding: "Any apparatus to securely grip workpiece during machining",
            fixture: "Custom-made workholding for a particular part",
            jig: "Holds workpiece AND guides cutter (mostly manual machining)"
        },
        economics: {
            principle: "Fixtures are where you make your money",
            considerations: [
                "Compare fixture cost vs. setup time savings",
                "Factor in repeat runs - fixture pays off over time",
                "Consider modular fixturing for quick changeover",
                "Pallet changers maximize productivity"
            ],
            roi: {
                formula: "ROI = (Setup Time Saved × Hourly Rate × Runs) - Fixture Cost",
                breakeven: "Fixture justified when savings exceed build cost"
            }
        },
        positioningMethods: {
            tSlots: {
                description: "Most common method for holding fixtures",
                advantages: ["Simple", "Robust", "Universal"],
                disadvantages: [
                    "Collect chips and debris",
                    "Hard to repeat exact position",
                    "Setup time for each job"
                ],
                improvements: [
                    "True the slots parallel to axis motion",
                    "Add keys to vises/fixtures",
                    "Install alignment keys in slots"
                ]
            },
            modularFixturing: {
                description: "Grid plate system with precision holes",
                advantages: [
                    "Repeatable positioning",
                    "Quick changeover",
                    "Fixtures drop on locating pins"
                ],
                systems: ["Grid plates", "Tooling balls", "Zero-point clamping"]
            },
            subplates: {
                description: "Sacrificial plates mounted to table",
                uses: [
                    "Machine through parts without table damage",
                    "Create custom hole patterns",
                    "Provide consistent reference surface"
                ]
            }
        },
        devices: {
            vises: {
                types: ["Standard milling vise", "Double station", "5-axis", "Self-centering"],
                selection: "Match vise to part size and operation type"
            },
            clamps: {
                types: ["Toe clamps", "Strap clamps", "Step blocks", "Hold-down bolts"],
                principles: [
                    "Clamp close to cutting forces",
                    "Use proper torque",
                    "Avoid part distortion"
                ]
            },
            chucks: {
                types: ["3-jaw", "4-jaw", "Collet chucks", "Expanding mandrels"],
                applications: "Round parts, turning, 4th axis work"
            },
            vacuum: {
                description: "Uses vacuum to hold flat parts",
                advantages: ["Full part access", "No clamps in way"],
                limitations: ["Requires flat bottom", "Limited holding force"]
            },
            magnetic: {
                description: "Electromagnetic or permanent magnet chucks",
                advantages: ["Quick setup", "Full access"],
                limitations: ["Only ferromagnetic materials", "Demagnetization needed"]
            }
        },
        bestPractices: [
            "Minimize setup time with repeatable fixturing",
            "Consider part access for all operations",
            "Calculate fixturing ROI before building custom fixtures",
            "Use modular systems for job shop work",
            "Document fixture positions for repeat runs"
        ]
    },
    // G-CODE FUNDAMENTALS
    // Source: GCode_Basics__Program_Format_and_Structure

    gcodeBasics: {
        structure: {
            programFormat: {
                start: "Program number (O####), safety line, tool call",
                body: "Motion commands, drilling cycles, etc.",
                end: "Return to home, spindle off, program end (M30)"
            },
            blockFormat: {
                description: "Each line is a 'block' containing words",
                words: "Letter + Number (G00, X1.0, F10.0)",
                sequence: "N-number (optional), G-code, coordinates, F/S values"
            }
        },
        modalVsNonModal: {
            modal: "Stay active until changed (G00, G01, G90, G91)",
            nonModal: "Active only for current block (G04, G28)"
        },
        coordinateSystems: {
            absolute: "G90 - All positions relative to origin",
            incremental: "G91 - Positions relative to current location",
            workOffsets: "G54-G59 - Define work coordinate origins"
        },
        essentialCodes: {
            motion: {
                G00: "Rapid positioning",
                G01: "Linear interpolation (cutting)",
                G02: "Circular interpolation CW",
                G03: "Circular interpolation CCW"
            },
            plane: {
                G17: "XY plane (default for milling)",
                G18: "XZ plane",
                G19: "YZ plane"
            },
            units: {
                G20: "Inch mode",
                G21: "Metric mode"
            },
            compensation: {
                G40: "Cancel cutter compensation",
                G41: "Cutter compensation left",
                G42: "Cutter compensation right",
                G43: "Tool length compensation"
            },
            cycles: {
                G81: "Drilling cycle",
                G82: "Drilling with dwell",
                G83: "Peck drilling",
                G84: "Tapping",
                G85: "Boring"
            }
        }
    },
    // CNC MACHINING ENGINEERING GUIDE
    // Source: CNC_Machining_The_Complete_Engineering_Guide

    engineeringGuide: {
        materialConsiderations: {
            aluminum: {
                characteristics: "Soft, gummy, tends to build up on tools",
                speeds: "High speeds (800-2000 SFM carbide)",
                tips: [
                    "Sharp tools essential",
                    "Use 2-3 flute endmills",
                    "Coolant helps with chip evacuation"
                ]
            },
            steel: {
                characteristics: "Harder, generates more heat",
                speeds: "Moderate speeds (300-600 SFM carbide)",
                tips: [
                    "Coated carbide recommended",
                    "4+ flutes for rigidity",
                    "Adequate coolant critical"
                ]
            },
            stainless: {
                characteristics: "Work hardens, poor thermal conductivity",
                speeds: "Lower speeds (150-400 SFM carbide)",
                tips: [
                    "Maintain feed - never let tool rub",
                    "Sharp positive geometry tools",
                    "High pressure coolant"
                ]
            },
            titanium: {
                characteristics: "Very poor thermal conductivity, reactive",
                speeds: "Low speeds (100-300 SFM carbide)",
                tips: [
                    "HSM strategies recommended",
                    "Flood coolant essential",
                    "Control heat in cutting zone"
                ]
            }
        },
        tolerancing: {
            standard: "±0.005" typical for milling",
            precision: "±0.001" requires careful setup",
            tight: "±0.0005" requires grinding/lapping",
            considerations: [
                "Machine capability",
                "Thermal effects",
                "Tool wear",
                "Fixturing accuracy"
            ]
        }
    }
};
// PRISM KNOWLEDGE INTEGRATION ENGINE

const PRISM_CNCCOOKBOOK_INTEGRATION = {
    version: "1.0.0",

    // Query the knowledge database
    query: function(topic, subtopic) {
        const db = CNCCOOKBOOK_KNOWLEDGE_DATABASE;
        if (topic && db[topic]) {
            if (subtopic && db[topic][subtopic]) {
                return db[topic][subtopic];
            }
            return db[topic];
        }
        return null;
    },
    // Get deep hole drilling recommendation
    getDeepHoleStrategy: function(diameter, depth) {
        const ratio = depth / diameter;
        const drilling = CNCCOOKBOOK_KNOWLEDGE_DATABASE.deepHoleDrilling;

        if (ratio <= 3) return { technique: "standard", description: "Standard drilling, no peck required" };
        if (ratio <= 7) return { technique: "peck", description: "Peck drilling with standard twist drill" };
        if (ratio <= 20) return { technique: "parabolic", description: "Parabolic flute drill with peck" };
        if (ratio <= 50) return { technique: "gun", description: "Gun drilling recommended" };
        return { technique: "bta", description: "BTA drilling for best results" };
    },
    // Get helical interpolation parameters
    getHelicalParams: function(holeDiameter, toolDiameter) {
        const stepover = (holeDiameter - toolDiameter) / 2;
        return {
            radius: holeDiameter / 2 - toolDiameter / 2,
            stepover: stepover,
            rampAngle: 3, // degrees, conservative
            arcSegment: 90 // degrees per arc
        };
    },
    // Get workholding recommendation
    getWorkholdingAdvice: function(partShape, quantity, tolerance) {
        const wh = CNCCOOKBOOK_KNOWLEDGE_DATABASE.workholding;

        let recommendation = {
            device: "Standard milling vise",
            positioning: "T-Slots",
            considerations: []
        };
        if (quantity > 50) {
            recommendation.positioning = "Modular fixturing";
            recommendation.considerations.push("Consider custom fixture for ROI");
        }
        if (tolerance < 0.001) {
            recommendation.considerations.push("Precision fixturing required");
            recommendation.considerations.push("Consider dedicated fixture");
        }
        if (partShape === "round") {
            recommendation.device = "Chuck or collet";
        }
        return recommendation;
    }
};
// Register with PRISM orchestrator
if (typeof PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR !== 'undefined') {
    PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR.registerDatabase('CNCCOOKBOOK_KNOWLEDGE_DATABASE', CNCCOOKBOOK_KNOWLEDGE_DATABASE);
    PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR.registerEngine('PRISM_CNCCOOKBOOK_INTEGRATION', PRISM_CNCCOOKBOOK_INTEGRATION);
}
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log("PRISM: CNCCookbook Knowledge Database loaded - 6 guides, 199 pages, 30,880 words");

// HYPERMILL AUTOMATION CENTER COMPREHENSIVE DATABASE v2.0
// Extracted from OPEN MIND HyperMill AUTOMATION Center Manual (302 pages)
// For PRISM Manufacturing Intelligence System v8.9.290

// [CONSOLIDATED] Duplicate HYPERMILL_AUTOMATION_CENTER_DATABASE removed - using earlier declaration
// HYPERMILL SQL MACRO DATABASE KNOWLEDGE
// From SQL Macro Database Manual (14 pages)

const HYPERMILL_SQL_MACRO_DATABASE = {
    metadata: {
        version: "1.0",
        source: "OPEN MIND SQL Macro Database Manual",
        pages: 14
    },
    multiUserMode: {
        description: "Multi-user macro database support via SQL Server",
        capabilities: {
            createEditMacros: "NOT simultaneous - single user only",
            applyMacros: "Simultaneous application supported"
        },
        accessMethods: ["Context menu → Apply macros", "Feature context menu"]
    },
    databaseSetup: {
        steps: [
            "Install SQL Server Management Studio",
            "Connect to SQL Server (Database Engine)",
            "Create new database",
            "Execute MacroDB_sqlserver.sql script",
            "Configure permissions"
        ],
        scriptLocation: "C:\\Program Files\\OPEN MIND\\hyperMILL\\[version]\\macrotech",
        scriptFile: "MacroDB_sqlserver.sql"
    },
    connectionSetup: {
        description: "Create DSN file for ODBC connection",
        steps: [
            "Open ODBC Data Sources (64-bit)",
            "Create File DSN",
            "Select SQL Server Native Client",
            "Configure server and authentication",
            "Test connection"
        ],
        dsnFileContents: {
            DRIVER: "SQL Server Native Client 11.0",
            UID: "[login name]",
            PWD: "[password]",
            DATABASE: "[database name]",
            WSID: "[client computer name]",
            APP: "Microsoft Windows Operating System",
            SERVER: "[server computer name]"
        }
    },
    macroExportImport: {
        exportFormat: "*.omx (Macro Exchange File)",
        exportMethod: "View macro database → Export all",
        importMethod: "View macro database → Import → Select *.omx file"
    },
    hyperMillIntegration: {
        settingsPath: "hyperMILL → Setup → Settings → Database",
        wizard: "Database Settings Wizard / manage database projects",
        databaseType: "SQL-Server database (*.dsn)"
    }
};
// PRISM HYPERMILL AUTOMATION ENGINE v2.0
// Integrates AUTOMATION Center capabilities into PRISM workflow

// [CONSOLIDATED] Duplicate PRISM_HYPERMILL_AUTOMATION_ENGINE removed - using earlier declaration
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log("HyperMill AUTOMATION Center Database v2.0 loaded");
console.log("Functions: " + Object.keys(HYPERMILL_AUTOMATION_CENTER_DATABASE).length + " categories");
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log("SQL Macro Database knowledge loaded");
console.log("PRISM HyperMill Automation Engine v2.0 ready");

// BATCH 1, 2, 5 INTEGRATION - PRISM v8.87.001

// PRISM v8.87.001 - BATCH INTEGRATION PACKAGE
// Batch 1: System Consolidation & Connection Audit
// Batch 2: Post Processor Expansion
// Batch 5: Cutting Data Expansion

// BATCH 1: UNIFIED ALARM SYSTEM
// Consolidates: COMPLETE_ALARM_DATABASE, COMPREHENSIVE_ALARM_DATABASE,
//              DETAILED_ALARM_DATABASE, EDM_ALARM_DATABASE, etc.

const PRISM_UNIFIED_ALARM_SYSTEM = {
    version: "1.0",
    description: "Consolidated alarm database for all CNC controllers",

    // Fanuc Alarms (Complete)
    fanuc: {
        systemAlarms: {
            "000": { message: "PLEASE TURN OFF POWER", type: "system", severity: "critical" },
            "001": { message: "TH ALARM (ROM)", type: "system", severity: "critical" },
            "002": { message: "TV PARITY ALARM", type: "system", severity: "critical" },
            "003": { message: "WAIT FOR INPUT", type: "system", severity: "warning" },
            "004": { message: "OVER HEAT (CPU)", type: "system", severity: "critical" },
            "010": { message: "PARAMETER ENABLED", type: "system", severity: "info" },
            "011": { message: "TH ALARM (DRAM)", type: "system", severity: "critical" },
            "012": { message: "TH ALARM (SRAM)", type: "system", severity: "critical" },
            "015": { message: "FSSB ALARM (INIT)", type: "system", severity: "critical" },
            "020": { message: "SERVO ALARM (1-4)", type: "servo", severity: "critical" },
            "021": { message: "SERVO ALARM (5-8)", type: "servo", severity: "critical" },
            "030": { message: "CPU INTERRUPT", type: "system", severity: "critical" },
            "031": { message: "PMS RAM ERROR", type: "system", severity: "critical" },
            "035": { message: "ROM PARITY", type: "system", severity: "critical" }
        },
        programAlarms: {
            "PS0000": { message: "PLEASE TURN OFF POWER", type: "program", severity: "critical" },
            "PS0001": { message: "TH PARITY ALARM", type: "program", severity: "critical" },
            "PS0002": { message: "TV PARITY ALARM", type: "program", severity: "critical" },
            "PS0003": { message: "TOO MANY DIGITS", type: "program", severity: "warning" },
            "PS0004": { message: "ADDRESS NOT FOUND", type: "program", severity: "warning" },
            "PS0005": { message: "NO DATA AFTER ADDRESS", type: "program", severity: "warning" },
            "PS0006": { message: "SIGN ERROR", type: "program", severity: "warning" },
            "PS0007": { message: "IMPROPER G CODE", type: "program", severity: "warning" },
            "PS0010": { message: "IMPROPER G-CODE", type: "program", severity: "warning" },
            "PS0011": { message: "G-CODE NOT ALLOWED", type: "program", severity: "warning" },
            "PS0014": { message: "RETURN TO REF POINT", type: "program", severity: "warning" },
            "PS0020": { message: "TOO MANY DIGITS", type: "program", severity: "warning" },
            "PS0029": { message: "NEGATIVE R COMMAND IN G74/84", type: "program", severity: "warning" },
            "PS0030": { message: "ILLEGAL INCREMENT", type: "program", severity: "warning" },
            "PS0031": { message: "ILLEGAL DECREMENT", type: "program", severity: "warning" },
            "PS0033": { message: "NO SEQNO FOR SKIP", type: "program", severity: "warning" },
            "PS0034": { message: "SEQUENCE NOT FOUND", type: "program", severity: "warning" },
            "PS0035": { message: "SEQUENCE NUMBER ERROR", type: "program", severity: "warning" },
            "PS0037": { message: "CAN NOT CALCULATE", type: "program", severity: "warning" },
            "PS0038": { message: "G43/G44 NOT G17/G18/G19", type: "program", severity: "warning" },
            "PS0041": { message: "CRC ERROR", type: "program", severity: "warning" },
            "PS0047": { message: "TOO SMALL ARC RADIUS", type: "program", severity: "warning" },
            "PS0050": { message: "CHF/CNR ERROR", type: "program", severity: "warning" },
            "PS0073": { message: "G10 INVALID AXIS", type: "program", severity: "warning" },
            "PS0074": { message: "G10 INVALID P CODE", type: "program", severity: "warning" },
            "PS0076": { message: "G-CODE NOT IN GROUP 01", type: "program", severity: "warning" },
            "PS0077": { message: "DEC POINT NOT ALLOWED", type: "program", severity: "warning" },
            "PS0078": { message: "NO SUBPROG", type: "program", severity: "warning" },
            "PS0079": { message: "REPEAT SUBPROG ERROR", type: "program", severity: "warning" },
            "PS0082": { message: "RETURN ERROR IN SUB", type: "program", severity: "warning" },
            "PS0085": { message: "MACRO NUMBER ERROR", type: "program", severity: "warning" },
            "PS0086": { message: "MACRO ILLEGAL ADDRESS", type: "program", severity: "warning" },
            "PS0100": { message: "ILLEGAL WORK OFFSET", type: "program", severity: "warning" },
            "PS0101": { message: "ILLEGAL P COMMAND", type: "program", severity: "warning" },
            "PS0111": { message: "G72.1/G72.2 ERROR", type: "program", severity: "warning" },
            "PS0115": { message: "TOO MANY NESTS", type: "program", severity: "warning" },
            "PS0118": { message: "PROGRAM PROTECT ALARM", type: "program", severity: "critical" },
            "PS0175": { message: "ILLEGAL PLANE COMMAND", type: "program", severity: "warning" },
            "PS5001": { message: "OVER TRAVEL +X", type: "position", severity: "critical" },
            "PS5002": { message: "OVER TRAVEL -X", type: "position", severity: "critical" },
            "PS5003": { message: "OVER TRAVEL +Y", type: "position", severity: "critical" },
            "PS5004": { message: "OVER TRAVEL -Y", type: "position", severity: "critical" },
            "PS5005": { message: "OVER TRAVEL +Z", type: "position", severity: "critical" },
            "PS5006": { message: "OVER TRAVEL -Z", type: "position", severity: "critical" }
        },
        servoAlarms: {
            "SV0401": { message: "VRDY OFF ALARM (AMP1)", type: "servo", severity: "critical" },
            "SV0402": { message: "VRDY OFF ALARM (AMP2)", type: "servo", severity: "critical" },
            "SV0403": { message: "VRDY OFF ALARM (AMP3)", type: "servo", severity: "critical" },
            "SV0404": { message: "VRDY OFF ALARM (AMP4)", type: "servo", severity: "critical" },
            "SV0410": { message: "EXCESSIVE ERROR", type: "servo", severity: "critical" },
            "SV0411": { message: "EXCESSIVE ERROR 2", type: "servo", severity: "critical" },
            "SV0413": { message: "LSI OVERFLOW", type: "servo", severity: "critical" },
            "SV0414": { message: "DIGITAL SERVO ALARM", type: "servo", severity: "critical" },
            "SV0415": { message: "UNMATCHED SERVO ALARM", type: "servo", severity: "critical" },
            "SV0417": { message: "DIGITAL SERVO PARAMETER", type: "servo", severity: "warning" },
            "SV0420": { message: "SYNC ERROR ALARM", type: "servo", severity: "critical" },
            "SV0421": { message: "SYNC ERROR EXCESS", type: "servo", severity: "critical" },
            "SV0430": { message: "SV MOTOR OVERHEAT", type: "servo", severity: "critical" },
            "SV0432": { message: "SOFTWARE DISCONNECT", type: "servo", severity: "critical" },
            "SV0433": { message: "FEEDBACK DISCONNECT", type: "servo", severity: "critical" },
            "SV0434": { message: "AMP OVERHEAT", type: "servo", severity: "critical" },
            "SV0436": { message: "POWER SUPPLY FAIL", type: "servo", severity: "critical" },
            "SV0438": { message: "A/D CONVERTER ERROR", type: "servo", severity: "critical" }
        }
    },
    // Mazak Alarms
    mazak: {
        systemAlarms: {
            "300": { message: "X-AXIS SERVO ALARM", type: "servo", severity: "critical" },
            "301": { message: "Y-AXIS SERVO ALARM", type: "servo", severity: "critical" },
            "302": { message: "Z-AXIS SERVO ALARM", type: "servo", severity: "critical" },
            "303": { message: "4TH AXIS SERVO ALARM", type: "servo", severity: "critical" },
            "304": { message: "5TH AXIS SERVO ALARM", type: "servo", severity: "critical" },
            "310": { message: "SPINDLE ALARM", type: "spindle", severity: "critical" },
            "311": { message: "SPINDLE OVERHEAT", type: "spindle", severity: "critical" },
            "312": { message: "SPINDLE SPEED ERROR", type: "spindle", severity: "warning" },
            "400": { message: "SYSTEM ROM ERROR", type: "system", severity: "critical" },
            "401": { message: "SYSTEM RAM ERROR", type: "system", severity: "critical" },
            "500": { message: "PROGRAM ERROR", type: "program", severity: "warning" },
            "501": { message: "PROGRAM NUMBER ERROR", type: "program", severity: "warning" }
        },
        mazatrolAlarms: {
            "MC0100": { message: "IMPROPER UNIT NO.", type: "mazatrol", severity: "warning" },
            "MC0101": { message: "INCORRECT SEQUENCE", type: "mazatrol", severity: "warning" },
            "MC0102": { message: "UNIT DATA ERROR", type: "mazatrol", severity: "warning" },
            "MC0200": { message: "TOOL NOT IN MAGAZINE", type: "tool", severity: "warning" },
            "MC0201": { message: "TOOL IN USE", type: "tool", severity: "warning" },
            "MC0202": { message: "TOOL LIFE EXPIRED", type: "tool", severity: "warning" }
        }
    },
    // Haas Alarms
    haas: {
        alarms: {
            "100": { message: "SERVO OVERLOAD", type: "servo", severity: "critical" },
            "101": { message: "SPINDLE OVERLOAD", type: "spindle", severity: "critical" },
            "102": { message: "OVER TRAVEL X+", type: "position", severity: "critical" },
            "103": { message: "OVER TRAVEL X-", type: "position", severity: "critical" },
            "104": { message: "OVER TRAVEL Y+", type: "position", severity: "critical" },
            "105": { message: "OVER TRAVEL Y-", type: "position", severity: "critical" },
            "106": { message: "OVER TRAVEL Z+", type: "position", severity: "critical" },
            "107": { message: "OVER TRAVEL Z-", type: "position", severity: "critical" },
            "108": { message: "OVER TRAVEL A+", type: "position", severity: "critical" },
            "109": { message: "OVER TRAVEL A-", type: "position", severity: "critical" },
            "152": { message: "SPINDLE FAULT", type: "spindle", severity: "critical" },
            "157": { message: "COOLANT LOW", type: "coolant", severity: "warning" },
            "200": { message: "PROGRAM ERROR", type: "program", severity: "warning" },
            "201": { message: "INVALID G-CODE", type: "program", severity: "warning" },
            "202": { message: "INVALID M-CODE", type: "program", severity: "warning" },
            "203": { message: "TOO MANY M-CODES", type: "program", severity: "warning" },
            "204": { message: "MISSING DATA", type: "program", severity: "warning" },
            "205": { message: "TOO MUCH DATA", type: "program", severity: "warning" },
            "302": { message: "TOOL CHANGER FAULT", type: "tool", severity: "critical" },
            "303": { message: "TOOL NOT FOUND", type: "tool", severity: "warning" }
        }
    },
    // Okuma Alarms
    okuma: {
        alarms: {
            "1001": { message: "X-AXIS SERVO ERROR", type: "servo", severity: "critical" },
            "1002": { message: "Y-AXIS SERVO ERROR", type: "servo", severity: "critical" },
            "1003": { message: "Z-AXIS SERVO ERROR", type: "servo", severity: "critical" },
            "1004": { message: "A-AXIS SERVO ERROR", type: "servo", severity: "critical" },
            "1005": { message: "C-AXIS SERVO ERROR", type: "servo", severity: "critical" },
            "2001": { message: "SPINDLE ALARM", type: "spindle", severity: "critical" },
            "2002": { message: "SPINDLE OVERHEAT", type: "spindle", severity: "critical" },
            "3001": { message: "NC DATA ERROR", type: "program", severity: "warning" },
            "3002": { message: "G-CODE ERROR", type: "program", severity: "warning" },
            "3003": { message: "M-CODE ERROR", type: "program", severity: "warning" },
            "4001": { message: "ATC ERROR", type: "tool", severity: "critical" },
            "4002": { message: "TOOL NOT FOUND", type: "tool", severity: "warning" }
        }
    },
    // Siemens Alarms
    siemens: {
        alarms: {
            "10000": { message: "PROGRAM ERROR", type: "program", severity: "warning" },
            "10001": { message: "SYNTAX ERROR", type: "program", severity: "warning" },
            "10002": { message: "INVALID ADDRESS", type: "program", severity: "warning" },
            "21000": { message: "SERVO FAULT X", type: "servo", severity: "critical" },
            "21001": { message: "SERVO FAULT Y", type: "servo", severity: "critical" },
            "21002": { message: "SERVO FAULT Z", type: "servo", severity: "critical" },
            "22000": { message: "SPINDLE FAULT", type: "spindle", severity: "critical" }
        }
    },
    // Query function
    getAlarm: function(controller, code) {
        const ctrlLower = controller.toLowerCase();
        if (this[ctrlLower]) {
            for (const category of Object.values(this[ctrlLower])) {
                if (category[code]) return category[code];
            }
        }
        return { message: "Unknown alarm", type: "unknown", severity: "warning" };
    },
    // Search function
    searchAlarms: function(keyword) {
        const results = [];
        const keyLower = keyword.toLowerCase();

        for (const [controller, categories] of Object.entries(this)) {
            if (typeof categories !== 'object') continue;
            for (const [category, alarms] of Object.entries(categories)) {
                if (typeof alarms !== 'object') continue;
                for (const [code, alarm] of Object.entries(alarms)) {
                    if (alarm.message && alarm.message.toLowerCase().includes(keyLower)) {
                        results.push({ controller, category, code, ...alarm });
                    }
                }
            }
        }
        return results;
    }
};
// BATCH 1: UNIFIED MANUFACTURER DATABASE
// Consolidates: GLOBAL_MANUFACTURERS_DATABASE, EXTENDED_MANUFACTURERS_DATABASE,
//              ADDITIONAL_MANUFACTURERS_DATABASE, MANUFACTURER_CATALOG_DATABASE

const PRISM_UNIFIED_MANUFACTURER_DATABASE = {
    version: "1.0",

    // Machine Tool Manufacturers
    machineTools: {
        dmgMori: {
            name: "DMG MORI",
            country: "Germany/Japan",
            products: ["Vertical Mills", "Horizontal Mills", "Lathes", "5-Axis", "Mill-Turn"],
            controllers: ["CELOS", "MAPPS IV", "Fanuc", "Siemens"],
            website: "https://www.dmgmori.com"
        },
        mazak: {
            name: "Yamazaki Mazak",
            country: "Japan",
            products: ["Vertical Mills", "Horizontal Mills", "Lathes", "5-Axis", "Mill-Turn", "Laser"],
            controllers: ["Mazatrol", "Mazatrol SmoothX", "Mazatrol SmoothAi"],
            website: "https://www.mazak.com"
        },
        haas: {
            name: "Haas Automation",
            country: "USA",
            products: ["Vertical Mills", "Horizontal Mills", "Lathes", "5-Axis", "Rotaries"],
            controllers: ["Haas NGC"],
            website: "https://www.haascnc.com"
        },
        okuma: {
            name: "Okuma",
            country: "Japan",
            products: ["Vertical Mills", "Horizontal Mills", "Lathes", "5-Axis", "Grinders"],
            controllers: ["OSP-P500", "OSP-P300", "OSP Suite"],
            website: "https://www.okuma.com"
        },
        makino: {
            name: "Makino",
            country: "Japan",
            products: ["Vertical Mills", "Horizontal Mills", "5-Axis", "EDM", "Graphite"],
            controllers: ["Pro5", "Pro6", "Hyper i"],
            website: "https://www.makino.com"
        },
        brother: {
            name: "Brother Industries",
            country: "Japan",
            products: ["Compact Machining Centers", "Tapping Centers"],
            controllers: ["CNC-C00"],
            website: "https://www.brother.com"
        },
        hurco: {
            name: "Hurco",
            country: "USA",
            products: ["Vertical Mills", "5-Axis", "Lathes"],
            controllers: ["WinMax", "MAX5"],
            website: "https://www.hurco.com"
        },
        hermle: {
            name: "Hermle",
            country: "Germany",
            products: ["5-Axis Mills", "High-Speed Mills"],
            controllers: ["Heidenhain TNC640", "Siemens 840D"],
            website: "https://www.hermle.de"
        },
        matsuura: {
            name: "Matsuura",
            country: "Japan",
            products: ["5-Axis Mills", "Multi-Pallet Systems"],
            controllers: ["Fanuc", "G-Tech"],
            website: "https://www.matsuura.co.jp"
        },
        hardinge: {
            name: "Hardinge",
            country: "USA",
            products: ["Lathes", "Grinding", "Workholding"],
            controllers: ["Fanuc", "Siemens"],
            website: "https://www.hardinge.com"
        }
    },
    // Cutting Tool Manufacturers (Extended from MANUFACTURER_CUTTING_DATA)
    cuttingTools: {
        sandvik: {
            name: "Sandvik Coromant",
            country: "Sweden",
            products: ["Milling", "Turning", "Drilling", "Boring", "Threading"],
            specialties: ["Carbide Inserts", "Solid Carbide", "PCD", "CBN"],
            website: "https://www.sandvik.coromant.com"
        },
        kennametal: {
            name: "Kennametal",
            country: "USA",
            products: ["Milling", "Turning", "Drilling", "Tooling Systems"],
            specialties: ["Carbide", "Ceramics", "PCD"],
            website: "https://www.kennametal.com"
        },
        iscar: {
            name: "ISCAR",
            country: "Israel",
            products: ["Milling", "Turning", "Drilling", "Grooving"],
            specialties: ["Carbide Inserts", "Solid Carbide"],
            website: "https://www.iscar.com"
        },
        walter: {
            name: "Walter Tools",
            country: "Germany",
            products: ["Milling", "Turning", "Drilling", "Threading"],
            specialties: ["Solid Carbide", "Indexable"],
            website: "https://www.walter-tools.com"
        },
        seco: {
            name: "Seco Tools",
            country: "Sweden",
            products: ["Milling", "Turning", "Drilling", "Threading"],
            specialties: ["Carbide", "Ceramics"],
            website: "https://www.secotools.com"
        },
        mitsubishi: {
            name: "Mitsubishi Materials",
            country: "Japan",
            products: ["Milling", "Turning", "Drilling"],
            specialties: ["Carbide", "CBN", "PCD"],
            website: "https://www.mitsubishicarbide.com"
        },
        kyocera: {
            name: "Kyocera",
            country: "Japan",
            products: ["Turning Inserts", "Milling", "Drilling"],
            specialties: ["Ceramics", "Cermet", "Carbide"],
            website: "https://www.kyocera.com"
        },
        tungaloy: {
            name: "Tungaloy",
            country: "Japan",
            products: ["Turning", "Milling", "Drilling", "Grooving"],
            specialties: ["Carbide", "CBN", "PCD"],
            website: "https://www.tungaloy.com"
        },
        osg: {
            name: "OSG Corporation",
            country: "Japan",
            products: ["Taps", "End Mills", "Drills", "Dies"],
            specialties: ["HSS", "Solid Carbide", "Thread Milling"],
            website: "https://www.osgcorp.com"
        },
        guhring: {
            name: "Gühring",
            country: "Germany",
            products: ["Drills", "Reamers", "Thread Milling", "Milling"],
            specialties: ["Solid Carbide Drills", "Deep Hole"],
            website: "https://www.guehring.com"
        },
        harvey: {
            name: "Harvey Tool",
            country: "USA",
            products: ["Specialty End Mills", "Miniature Tools"],
            specialties: ["Micro Tools", "Specialty Profiles"],
            website: "https://www.harveytool.com"
        },
        helical: {
            name: "Helical Solutions",
            country: "USA",
            products: ["End Mills", "High Performance"],
            specialties: ["Solid Carbide", "Variable Helix"],
            website: "https://www.helicalsolutions.com"
        },
        yg1: {
            name: "YG-1",
            country: "South Korea",
            products: ["End Mills", "Drills", "Taps"],
            specialties: ["Solid Carbide", "HSS-E"],
            website: "https://www.yg1.kr"
        },
        emuge: {
            name: "Emuge-Franken",
            country: "Germany",
            products: ["Taps", "Thread Mills", "Clamping"],
            specialties: ["Threading", "HSS", "Carbide"],
            website: "https://www.emuge.com"
        },
        dormer: {
            name: "Dormer Pramet",
            country: "UK/Czech Republic",
            products: ["Drills", "Taps", "End Mills", "Inserts"],
            specialties: ["Round Tools", "Indexable"],
            website: "https://www.dormerpramet.com"
        }
    },
    // CAD/CAM Software
    software: {
        hypermill: {
            name: "hyperMILL",
            company: "OPEN MIND Technologies",
            country: "Germany",
            type: "CAM",
            specialties: ["5-Axis", "Mill-Turn", "Electrode"],
            website: "https://www.openmind-tech.com"
        },
        mastercam: {
            name: "Mastercam",
            company: "CNC Software, Inc.",
            country: "USA",
            type: "CAD/CAM",
            specialties: ["Mill", "Lathe", "Wire EDM", "Router"],
            website: "https://www.mastercam.com"
        },
        fusion360: {
            name: "Fusion 360",
            company: "Autodesk",
            country: "USA",
            type: "CAD/CAM/CAE",
            specialties: ["Integrated CAD/CAM", "Cloud-based"],
            website: "https://www.autodesk.com/products/fusion-360"
        },
        solidworks: {
            name: "SOLIDWORKS CAM",
            company: "Dassault Systèmes",
            country: "France",
            type: "CAD/CAM",
            specialties: ["Knowledge-based Machining"],
            website: "https://www.solidworks.com"
        },
        nx: {
            name: "NX CAM",
            company: "Siemens",
            country: "Germany",
            type: "CAD/CAM/CAE",
            specialties: ["Advanced Manufacturing", "Aerospace"],
            website: "https://www.plm.automation.siemens.com"
        },
        catia: {
            name: "CATIA",
            company: "Dassault Systèmes",
            country: "France",
            type: "CAD/CAM/CAE",
            specialties: ["Aerospace", "Automotive", "Complex Surfaces"],
            website: "https://www.3ds.com/products-services/catia"
        },
        esprit: {
            name: "ESPRIT",
            company: "Hexagon",
            country: "USA/Sweden",
            type: "CAM",
            specialties: ["Multi-Axis", "Mill-Turn", "Wire EDM"],
            website: "https://www.espritcam.com"
        },
        gibbscam: {
            name: "GibbsCAM",
            company: "3D Systems",
            country: "USA",
            type: "CAM",
            specialties: ["Production Machining", "Mill-Turn"],
            website: "https://www.gibbscam.com"
        }
    },
    // Workholding
    workholding: {
        schunk: {
            name: "SCHUNK",
            country: "Germany",
            products: ["Chucks", "Vises", "Clamping", "Grippers"],
            website: "https://www.schunk.com"
        },
        lang: {
            name: "Lang Technik",
            country: "Germany",
            products: ["Workholding", "5-Axis Vises", "Quick-Point"],
            website: "https://www.lang-technik.de"
        },
        erowa: {
            name: "EROWA",
            country: "Switzerland",
            products: ["Palletization", "Automation", "EDM Tooling"],
            website: "https://www.erowa.com"
        },
        system3r: {
            name: "System 3R",
            country: "Switzerland",
            products: ["Palletization", "Reference Systems"],
            website: "https://www.system3r.com"
        },
        jergens: {
            name: "Jergens",
            country: "USA",
            products: ["Workholding", "Ball Lock", "Quick Change"],
            website: "https://www.jergensinc.com"
        },
        kurt: {
            name: "Kurt Manufacturing",
            country: "USA",
            products: ["Vises", "Workholding"],
            website: "https://www.kurtworkholding.com"
        }
    },
    // Query function
    getManufacturer: function(name) {
        const nameLower = name.toLowerCase();
        for (const category of Object.values(this)) {
            if (typeof category !== 'object') continue;
            for (const [key, mfr] of Object.entries(category)) {
                if (key === nameLower || (mfr.name && mfr.name.toLowerCase().includes(nameLower))) {
                    return mfr;
                }
            }
        }
        return null;
    }
};
// BATCH 2: POST PROCESSOR EXPANSION
// New controller support: Hurco, Okuma OSP, Brother, Hermle

const PRISM_EXPANDED_POST_PROCESSORS = {
    version: "2.0",

    // Hurco WinMax / MAX5 Post Processor
    hurco: {
        name: "Hurco WinMax/MAX5",
        variants: ["VMX24i", "VMX30i", "VMX42i", "VMX60Ui", "BX40i"],
        features: {
            conversational: true,
            isoMode: true,
            dualMode: true,
            highSpeedMachining: true,
            adaptiveFeed: "AFC",
            toolMeasurement: true
        },
        syntax: {
            programStart: "G90 G94 G17\nG0 G53 Z0",
            programEnd: "M30",
            toolChange: "T{tool} M6\nG43 H{tool}",
            spindleOn: "S{rpm} M3",
            spindleOff: "M5",
            coolantOn: "M8",
            coolantOff: "M9",
            rapidMove: "G0 X{x} Y{y} Z{z}",
            linearMove: "G1 X{x} Y{y} Z{z} F{feed}",
            arcCW: "G2 X{x} Y{y} I{i} J{j} F{feed}",
            arcCCW: "G3 X{x} Y{y} I{i} J{j} F{feed}",
            workOffset: "G54-G59, G110-G129",
            absoluteMode: "G90",
            incrementalMode: "G91"
        },
        cannedCycles: {
            G81: "Drill cycle",
            G82: "Spot drill / counterbore",
            G83: "Peck drill",
            G84: "Right-hand tap",
            G85: "Bore in, bore out",
            G86: "Bore in, rapid out",
            G87: "Back bore",
            G88: "Bore in, dwell, manual out",
            G89: "Bore in, dwell, bore out"
        },
        specialFeatures: {
            ultipocket: "Advanced pocket milling",
            ultithreading: "Thread milling cycle",
            surfaceFinish: "Surface finish optimization"
        }
    },
    // Okuma OSP-P300/P500 Post Processor
    okuma: {
        name: "Okuma OSP-P300/P500",
        variants: ["GENOS M460V-5AX", "MU-4000V", "MU-5000V", "MA-600H"],
        features: {
            tcpc: true,  // Tool Center Point Control
            machiningNaviMi: true,
            collisionAvoidance: true,
            thermoFriendly: true,
            syncTapping: true
        },
        syntax: {
            programStart: "G15 H1\nG90 G00 G17 G40 G49 G80",
            programEnd: "M30",
            toolChange: "T{tool}\nM06\nG43 H{tool}",
            spindleOn: "S{rpm} M03",
            spindleOff: "M05",
            coolantOn: "M08",
            coolantOff: "M09",
            rapidMove: "G00 X{x} Y{y} Z{z}",
            linearMove: "G01 X{x} Y{y} Z{z} F{feed}",
            arcCW: "G02 X{x} Y{y} R{radius} F{feed}",
            arcCCW: "G03 X{x} Y{y} R{radius} F{feed}",
            workOffset: "G15 H1-H48",
            polarCoord: "G16",
            absoluteMode: "G90",
            incrementalMode: "G91"
        },
        fiveAxisCodes: {
            tcpOn: "G43.4 H{tool}",
            tcpOff: "G49",
            rotaryInterpolation: "G43.5",
            pivotPoint: "VTLA, VTLB, VTLC variables"
        },
        variables: {
            VCAX: "Current A-axis position",
            VCBX: "Current B-axis position",
            VCCX: "Current C-axis position",
            VTLA: "Tool length A offset",
            VTLB: "Tool length B offset",
            VTLC: "Tool length C offset"
        }
    },
    // Brother CNC-C00 Post Processor
    brother: {
        name: "Brother CNC-C00",
        variants: ["SPEEDIO S300X1", "SPEEDIO S500X1", "SPEEDIO S700X1", "SPEEDIO R450X1", "SPEEDIO U500Xd1"],
        features: {
            highSpeedTapping: true,
            rapidTraverse: "50m/min",
            toolChangeTime: "0.9s chip-to-chip",
            aiContour: true
        },
        syntax: {
            programStart: "G90 G94 G17 G40 G49 G80\nG28 G91 Z0",
            programEnd: "G28 G91 Z0\nM30",
            toolChange: "T{tool} M06\nG43 H{tool}",
            spindleOn: "S{rpm} M03",
            spindleOff: "M05",
            coolantOn: "M08",
            coolantOff: "M09",
            rapidMove: "G00 X{x} Y{y} Z{z}",
            linearMove: "G01 X{x} Y{y} Z{z} F{feed}",
            highSpeedMode: "G05.1 Q1",
            normalMode: "G05.1 Q0"
        },
        highSpeedFeatures: {
            aiContour: "G05.1 Q1 R{radius}",
            nanoSmoothing: "G05 P10000",
            lookAhead: "200 blocks"
        }
    },
    // Hermle TNC640 (Heidenhain) Post Processor
    hermle: {
        name: "Heidenhain TNC640",
        variants: ["C42U", "C52U", "C62U", "C250U", "C400U"],
        features: {
            fiveAxisSimultaneous: true,
            afc: true,  // Adaptive Feed Control
            dcm: true,  // Dynamic Collision Monitoring
            kinematics: ["swivel head", "rotary table"]
        },
        syntax: {
            programStart: "BEGIN PGM {name} MM\nBLK FORM 0.1 Z X{minX} Y{minY} Z{minZ}\nBLK FORM 0.2 X{maxX} Y{maxY} Z{maxZ}",
            programEnd: "END PGM {name} MM",
            toolCall: "TOOL CALL {tool} Z S{rpm}",
            spindleOn: "M3",
            spindleOff: "M5",
            coolantOn: "M8",
            coolantOff: "M9",
            rapidMove: "L X{x} Y{y} Z{z} FMAX",
            linearMove: "L X{x} Y{y} Z{z} F{feed}",
            arcCW: "CC X{cx} Y{cy}\nC X{x} Y{y} DR-",
            arcCCW: "CC X{cx} Y{cy}\nC X{x} Y{y} DR+",
            plane: "PLANE SPATIAL SPA{a} SPB{b} SPC{c}",
            tcpMode: "FUNCTION TCPM F{feed} AXIS SPAT",
            workOffset: "CYCL DEF 247 DATUM SETTING~Q339={offset}"
        },
        cycles: {
            "200": "DRILLING",
            "201": "REAMING",
            "202": "BORING",
            "203": "UNIVERSAL DRILLING",
            "204": "BACK BORING",
            "205": "UNIVERSAL PECK DRILLING",
            "206": "TAPPING NEW",
            "207": "RIGID TAPPING",
            "208": "BORE MILLING",
            "220": "PATTERN CIRCLE",
            "221": "PATTERN LINES",
            "230": "MILLING CIRCULAR STUDS",
            "251": "RECTANGULAR POCKET",
            "252": "CIRCULAR POCKET",
            "253": "SLOT MILLING",
            "254": "CIRCULAR SLOT"
        }
    },
    // Generate post-processed code
    generateCode: function(controller, operations) {
        const post = this[controller.toLowerCase()];
        if (!post) return { error: "Unknown controller: " + controller };

        let code = [];
        code.push(post.syntax.programStart);

        for (const op of operations) {
            switch(op.type) {
                case 'toolChange':
                    code.push(post.syntax.toolChange.replace('{tool}', op.tool));
                    break;
                case 'spindleOn':
                    code.push(post.syntax.spindleOn.replace('{rpm}', op.rpm));
                    break;
                case 'rapid':
                    let rapid = post.syntax.rapidMove;
                    rapid = rapid.replace('{x}', op.x || '');
                    rapid = rapid.replace('{y}', op.y || '');
                    rapid = rapid.replace('{z}', op.z || '');
                    code.push(rapid.replace(/\s+[XYZ](?=\s|$)/g, '').trim());
                    break;
                case 'linear':
                    let linear = post.syntax.linearMove;
                    linear = linear.replace('{x}', op.x || '');
                    linear = linear.replace('{y}', op.y || '');
                    linear = linear.replace('{z}', op.z || '');
                    linear = linear.replace('{feed}', op.feed);
                    code.push(linear.replace(/\s+[XYZ](?=\s|$)/g, '').trim());
                    break;
            }
        }
        code.push(post.syntax.programEnd);
        return code.join('\n');
    }
};
// BATCH 5: CUTTING DATA EXPANSION
// New vendors: Iscar, Mitsubishi, Walter, Seco, Kyocera, Tungaloy, YG-1, Guhring

const EXPANDED_MANUFACTURER_CUTTING_DATA = {
    version: "2.0",
    lastUpdated: "2025-01-09",

    // ISCAR Cutting Data
    iscar: {
        name: "ISCAR",
        materials: {
            aluminum: {
                "6061-T6": {
                    endmill: { sfmRange: [800, 1500], chiploadRange: [0.004, 0.008], notes: "Use Chatterfree geometry" },
                    facemill: { sfmRange: [1000, 2000], chiploadRange: [0.006, 0.012] },
                    drill: { sfmRange: [300, 600], iprRange: [0.004, 0.012] }
                },
                "7075-T6": {
                    endmill: { sfmRange: [600, 1200], chiploadRange: [0.003, 0.007] },
                    drill: { sfmRange: [250, 500], iprRange: [0.003, 0.010] }
                }
            },
            steel: {
                "1018": {
                    endmill: { sfmRange: [300, 500], chiploadRange: [0.003, 0.006] },
                    facemill: { sfmRange: [400, 600], chiploadRange: [0.006, 0.010] },
                    drill: { sfmRange: [80, 150], iprRange: [0.004, 0.010] }
                },
                "4140": {
                    endmill: { sfmRange: [200, 400], chiploadRange: [0.002, 0.005] },
                    drill: { sfmRange: [60, 120], iprRange: [0.003, 0.008] }
                },
                "4340": {
                    endmill: { sfmRange: [150, 300], chiploadRange: [0.002, 0.004] },
                    drill: { sfmRange: [50, 100], iprRange: [0.002, 0.006] }
                }
            },
            stainless: {
                "304": {
                    endmill: { sfmRange: [150, 300], chiploadRange: [0.002, 0.004], notes: "Maintain constant chip load" },
                    drill: { sfmRange: [40, 90], iprRange: [0.002, 0.006] }
                },
                "316": {
                    endmill: { sfmRange: [120, 250], chiploadRange: [0.002, 0.003] },
                    drill: { sfmRange: [30, 70], iprRange: [0.002, 0.005] }
                },
                "17-4PH": {
                    endmill: { sfmRange: [100, 200], chiploadRange: [0.001, 0.003] },
                    drill: { sfmRange: [25, 60], iprRange: [0.001, 0.004] }
                }
            },
            titanium: {
                "Ti-6Al-4V": {
                    endmill: { sfmRange: [100, 200], chiploadRange: [0.002, 0.004], notes: "High pressure coolant recommended" },
                    drill: { sfmRange: [30, 70], iprRange: [0.002, 0.005] }
                }
            },
            inconel: {
                "718": {
                    endmill: { sfmRange: [50, 120], chiploadRange: [0.001, 0.003], notes: "Ceramic inserts at high speed" },
                    drill: { sfmRange: [15, 40], iprRange: [0.001, 0.003] }
                }
            }
        },
        specialtyTools: {
            chatterfree: { description: "Variable pitch for vibration reduction", materials: ["aluminum", "steel"] },
            helido: { description: "Helical inserts for heavy roughing", materials: ["steel", "cast iron"] },
            tangGrip: { description: "Tangential parting/grooving", materials: ["all"] }
        }
    },
    // Mitsubishi Materials Cutting Data
    mitsubishi: {
        name: "Mitsubishi Materials",
        materials: {
            aluminum: {
                "6061-T6": {
                    endmill: { sfmRange: [900, 1600], chiploadRange: [0.004, 0.009] },
                    drill: { sfmRange: [350, 650], iprRange: [0.005, 0.014] }
                }
            },
            steel: {
                "1018": {
                    endmill: { sfmRange: [350, 550], chiploadRange: [0.003, 0.007] },
                    drill: { sfmRange: [90, 170], iprRange: [0.005, 0.012] }
                },
                "4140": {
                    endmill: { sfmRange: [220, 420], chiploadRange: [0.002, 0.005] },
                    drill: { sfmRange: [70, 130], iprRange: [0.003, 0.009] }
                }
            },
            stainless: {
                "304": {
                    endmill: { sfmRange: [160, 320], chiploadRange: [0.002, 0.004] },
                    drill: { sfmRange: [45, 100], iprRange: [0.003, 0.007] }
                }
            },
            titanium: {
                "Ti-6Al-4V": {
                    endmill: { sfmRange: [110, 220], chiploadRange: [0.002, 0.004] },
                    drill: { sfmRange: [35, 80], iprRange: [0.002, 0.006] }
                }
            }
        },
        grades: {
            VP15TF: { description: "Universal carbide for steel", coating: "PVD" },
            MP9015: { description: "Stainless steel specialist", coating: "PVD" },
            MC5020: { description: "Cast iron grade", coating: "CVD" }
        }
    },
    // Walter Tools Cutting Data
    walter: {
        name: "Walter Tools",
        materials: {
            aluminum: {
                "6061-T6": {
                    endmill: { sfmRange: [850, 1450], chiploadRange: [0.004, 0.008] },
                    drill: { sfmRange: [320, 600], iprRange: [0.004, 0.012] }
                }
            },
            steel: {
                "1018": {
                    endmill: { sfmRange: [320, 520], chiploadRange: [0.003, 0.006] },
                    drill: { sfmRange: [85, 160], iprRange: [0.004, 0.011] }
                },
                "4140": {
                    endmill: { sfmRange: [200, 380], chiploadRange: [0.002, 0.005] },
                    drill: { sfmRange: [65, 125], iprRange: [0.003, 0.008] }
                }
            },
            stainless: {
                "304": {
                    endmill: { sfmRange: [150, 300], chiploadRange: [0.002, 0.004] },
                    drill: { sfmRange: [40, 95], iprRange: [0.002, 0.006] }
                }
            },
            titanium: {
                "Ti-6Al-4V": {
                    endmill: { sfmRange: [100, 200], chiploadRange: [0.002, 0.004] },
                    drill: { sfmRange: [30, 75], iprRange: [0.002, 0.005] }
                }
            }
        },
        drillSeries: {
            DC170: { description: "Universal solid carbide drill", depthCapability: "12xD" },
            B3214: { description: "Indexable insert drill", depthCapability: "5xD" },
            Xpress: { description: "High performance drill", depthCapability: "8xD" }
        }
    },
    // Seco Tools Cutting Data
    seco: {
        name: "Seco Tools",
        materials: {
            aluminum: {
                "6061-T6": {
                    endmill: { sfmRange: [800, 1400], chiploadRange: [0.004, 0.008] },
                    facemill: { sfmRange: [1100, 2200], chiploadRange: [0.007, 0.014] }
                }
            },
            steel: {
                "1018": {
                    endmill: { sfmRange: [300, 480], chiploadRange: [0.003, 0.006] },
                    facemill: { sfmRange: [420, 650], chiploadRange: [0.006, 0.011] }
                },
                "4140": {
                    endmill: { sfmRange: [190, 360], chiploadRange: [0.002, 0.005] }
                }
            },
            stainless: {
                "304": {
                    endmill: { sfmRange: [140, 280], chiploadRange: [0.002, 0.004] }
                },
                "316": {
                    endmill: { sfmRange: [110, 230], chiploadRange: [0.002, 0.003] }
                }
            },
            titanium: {
                "Ti-6Al-4V": {
                    endmill: { sfmRange: [95, 190], chiploadRange: [0.002, 0.004] }
                }
            },
            inconel: {
                "718": {
                    endmill: { sfmRange: [45, 110], chiploadRange: [0.001, 0.003] }
                }
            }
        },
        toolSystems: {
            jabro: { description: "Solid carbide end mills", specialty: "High performance milling" },
            square6: { description: "Indexable shoulder mills", specialty: "90° shoulders" },
            turbo: { description: "High feed face mills", specialty: "High MRR" }
        }
    },
    // Kyocera Cutting Data (primarily turning)
    kyocera: {
        name: "Kyocera",
        materials: {
            steel: {
                "1018": {
                    turning: { sfmRange: [500, 900], iprRange: [0.006, 0.016] },
                    grooving: { sfmRange: [300, 600], iprRange: [0.002, 0.006] }
                },
                "4140": {
                    turning: { sfmRange: [350, 650], iprRange: [0.005, 0.014] }
                }
            },
            stainless: {
                "304": {
                    turning: { sfmRange: [300, 550], iprRange: [0.004, 0.012] }
                }
            },
            castIron: {
                "gray": {
                    turning: { sfmRange: [400, 800], iprRange: [0.008, 0.020] }
                }
            }
        },
        grades: {
            CA6515: { description: "Steel finishing", coating: "CVD" },
            PR1535: { description: "Stainless steel", coating: "PVD" },
            KW10: { description: "Cast iron", coating: "Uncoated carbide" }
        }
    },
    // Tungaloy Cutting Data
    tungaloy: {
        name: "Tungaloy",
        materials: {
            aluminum: {
                "6061-T6": {
                    endmill: { sfmRange: [750, 1350], chiploadRange: [0.004, 0.007] }
                }
            },
            steel: {
                "1018": {
                    endmill: { sfmRange: [280, 460], chiploadRange: [0.003, 0.006] },
                    turning: { sfmRange: [480, 850], iprRange: [0.006, 0.015] }
                },
                "4140": {
                    endmill: { sfmRange: [180, 340], chiploadRange: [0.002, 0.005] },
                    turning: { sfmRange: [330, 600], iprRange: [0.005, 0.012] }
                }
            },
            stainless: {
                "304": {
                    endmill: { sfmRange: [130, 260], chiploadRange: [0.002, 0.004] },
                    turning: { sfmRange: [280, 500], iprRange: [0.004, 0.010] }
                }
            }
        },
        insertGrades: {
            AH725: { description: "Steel general purpose", coating: "PVD" },
            AH120: { description: "Aluminum high speed", coating: "PVD" },
            GT9530: { description: "Stainless steel", coating: "PVD" }
        }
    },
    // YG-1 Cutting Data
    yg1: {
        name: "YG-1",
        materials: {
            aluminum: {
                "6061-T6": {
                    endmill: { sfmRange: [700, 1300], chiploadRange: [0.003, 0.007] },
                    drill: { sfmRange: [280, 550], iprRange: [0.004, 0.011] }
                }
            },
            steel: {
                "1018": {
                    endmill: { sfmRange: [260, 440], chiploadRange: [0.002, 0.005] },
                    drill: { sfmRange: [75, 145], iprRange: [0.004, 0.010] }
                },
                "4140": {
                    endmill: { sfmRange: [170, 320], chiploadRange: [0.002, 0.004] },
                    drill: { sfmRange: [55, 110], iprRange: [0.003, 0.007] }
                }
            },
            stainless: {
                "304": {
                    endmill: { sfmRange: [120, 240], chiploadRange: [0.002, 0.003] },
                    drill: { sfmRange: [35, 85], iprRange: [0.002, 0.005] }
                }
            }
        },
        series: {
            xPower: { description: "High performance end mills", coating: "X-Coat" },
            dreamDrill: { description: "General purpose drills", coating: "TiAlN" },
            primeEndmill: { description: "Economy end mills", coating: "TiN" }
        }
    },
    // Guhring Cutting Data
    guhring: {
        name: "Gühring",
        materials: {
            aluminum: {
                "6061-T6": {
                    drill: { sfmRange: [350, 680], iprRange: [0.005, 0.015] },
                    reamer: { sfmRange: [100, 200], iprRange: [0.006, 0.012] }
                }
            },
            steel: {
                "1018": {
                    drill: { sfmRange: [95, 180], iprRange: [0.005, 0.013] },
                    reamer: { sfmRange: [30, 60], iprRange: [0.004, 0.010] }
                },
                "4140": {
                    drill: { sfmRange: [70, 140], iprRange: [0.004, 0.010] },
                    reamer: { sfmRange: [25, 50], iprRange: [0.003, 0.008] }
                }
            },
            stainless: {
                "304": {
                    drill: { sfmRange: [50, 110], iprRange: [0.003, 0.008] },
                    reamer: { sfmRange: [20, 40], iprRange: [0.002, 0.006] }
                }
            },
            titanium: {
                "Ti-6Al-4V": {
                    drill: { sfmRange: [35, 85], iprRange: [0.002, 0.006] }
                }
            }
        },
        drillSeries: {
            rt100: { description: "Universal carbide drill", depthCapability: "3-12xD" },
            rt150: { description: "High performance drill", depthCapability: "5xD" },
            hr500: { description: "Deep hole drill", depthCapability: "30xD" }
        }
    },
    // Query function for expanded data
    getCuttingData: function(vendor, material, alloy, operation) {
        const vendorData = this[vendor.toLowerCase()];
        if (!vendorData) return null;

        const materialData = vendorData.materials[material.toLowerCase()];
        if (!materialData) return null;

        const alloyData = materialData[alloy];
        if (!alloyData) return null;

        return alloyData[operation.toLowerCase()] || null;
    },
    // Get all vendors for a material
    getVendorsForMaterial: function(material) {
        const result = [];
        for (const [vendor, data] of Object.entries(this)) {
            if (typeof data !== 'object' || !data.materials) continue;
            if (data.materials[material.toLowerCase()]) {
                result.push({ vendor, name: data.name });
            }
        }
        return result;
    }
};
// BATCH 1 CONTINUED: ENGINE CONNECTIVITY ENHANCEMENT
// Explicit connections between orchestrators and all critical engines

const PRISM_ENGINE_CONNECTOR = {
    version: "1.0",

    // Define all engine connections
    connections: {
        PRISM_MASTER_ORCHESTRATOR: [
            "PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE",
            "UNIFIED_CAM_STRATEGY_ENGINE",
            "PRISM_COLLISION_ENGINE",
            "UNIVERSAL_POST_PROCESSOR_ENGINE",
            "ADVANCED_FEATURE_RECOGNITION_ENGINE",
            "COMPLETE_CAD_CAM_ENGINE",
            "PRISM_CAM_LEARNING_ENGINE",
            "PRISM_LEARNING_PERSISTENCE_ENGINE"
        ],
        PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR: [
            "PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE",
            "UNIFIED_CAM_STRATEGY_ENGINE",
            "FEATURE_RECOGNITION_LEARNING_ENGINE",
            "PRISM_CAD_CONFIDENCE_ENGINE",
            "POST_LEARNING_ENGINE"
        ],
        PRISM_INIT_ORCHESTRATOR: [
            "PRISM_UNIFIED_ALARM_SYSTEM",
            "PRISM_UNIFIED_MANUFACTURER_DATABASE",
            "PRISM_EXPANDED_POST_PROCESSORS",
            "EXPANDED_MANUFACTURER_CUTTING_DATA"
        ]
    },
    // Verify all connections are active
    verifyConnections: function() {
        const results = { connected: [], missing: [] };

        for (const [orchestrator, engines] of Object.entries(this.connections)) {
            for (const engine of engines) {
                if (typeof window !== 'undefined' && window[engine]) {
                    results.connected.push({ orchestrator, engine });
                } else if (typeof global !== 'undefined' && global[engine]) {
                    results.connected.push({ orchestrator, engine });
                } else {
                    results.missing.push({ orchestrator, engine });
                }
            }
        }
        return results;
    },
    // Initialize all connections
    initializeConnections: function() {
        console.log("PRISM Engine Connector v1.0 - Initializing connections...");
        const verification = this.verifyConnections();
        console.log(`Connected: ${verification.connected.length} | Missing: ${verification.missing.length}`);
        return verification;
    }
};
// Log batch integration completion
console.log("="*60);
console.log("PRISM v8.87.001 - BATCH INTEGRATION PACKAGE LOADED");
console.log("="*60);
console.log("BATCH 1: System Consolidation");
console.log("  • PRISM_UNIFIED_ALARM_SYSTEM: Loaded");
console.log("  • PRISM_UNIFIED_MANUFACTURER_DATABASE: Loaded");
console.log("  • PRISM_ENGINE_CONNECTOR: Loaded");
console.log("BATCH 2: Post Processor Expansion");
console.log("  • PRISM_EXPANDED_POST_PROCESSORS: Loaded");
console.log("  • Hurco WinMax/MAX5: Added");
console.log("  • Okuma OSP-P300/P500: Added");
console.log("  • Brother CNC-C00: Added");
console.log("  • Heidenhain TNC640: Added");
console.log("BATCH 5: Cutting Data Expansion");
console.log("  • EXPANDED_MANUFACTURER_CUTTING_DATA: Loaded");
console.log("  • New vendors: ISCAR, Mitsubishi, Walter, Seco, Kyocera, Tungaloy, YG-1, Gühring");
console.log("="*60);

// BATCH 3: MACHINE DATABASE ENHANCEMENT - PRISM v8.87.001

// PRISM v8.87.001 - BATCH 3: MACHINE DATABASE ENHANCEMENT
// Comprehensive machine specifications, kinematic configurations, work envelopes

// 3.1 BROTHER SPEEDIO COMPREHENSIVE DATABASE
// Complete specifications for all SPEEDIO models

const BROTHER_SPEEDIO_COMPREHENSIVE_DATABASE = {
    version: "2.0",
    manufacturer: "Brother Industries, Ltd.",
    country: "Japan",
    controller: "CNC-C00",

    // S Series - Standard Vertical Machining Centers
    sSeries: {
        S300X1: {
            model: "SPEEDIO S300X1",
            type: "Vertical Machining Center",
            axes: 3,
            travel: { x: 300, y: 300, z: 300, units: "mm" },
            table: { width: 450, length: 300, tSlots: 3, loadCapacity: 100 },
            spindle: {
                maxRPM: 16000,
                spindleHP: 7.5,
                spindleKW: 5.5,
                taper: "BT30",
                bearingType: "Ceramic"
            },
            toolChanger: {
                type: "Drum",
                capacity: 14,
                changeTime: 1.3,
                chipToChip: 1.6
            },
            rapidTraverse: { x: 50, y: 50, z: 50, units: "m/min" },
            feedRate: { max: 30000, units: "mm/min" },
            accuracy: { positioning: 0.005, repeatability: 0.002 },
            weight: 1800,
            footprint: { width: 1200, depth: 1700, height: 2100 }
        },
        S500X1: {
            model: "SPEEDIO S500X1",
            type: "Vertical Machining Center",
            axes: 3,
            travel: { x: 500, y: 400, z: 300, units: "mm" },
            table: { width: 600, length: 400, tSlots: 5, loadCapacity: 200 },
            spindle: {
                maxRPM: 16000,
                spindleHP: 11,
                spindleKW: 8,
                taper: "BT30",
                bearingType: "Ceramic"
            },
            toolChanger: {
                type: "Drum",
                capacity: 21,
                changeTime: 1.2,
                chipToChip: 1.5
            },
            rapidTraverse: { x: 50, y: 50, z: 50, units: "m/min" },
            feedRate: { max: 30000, units: "mm/min" },
            accuracy: { positioning: 0.005, repeatability: 0.002 },
            weight: 2600,
            footprint: { width: 1400, depth: 2000, height: 2200 }
        },
        S700X1: {
            model: "SPEEDIO S700X1",
            type: "Vertical Machining Center",
            axes: 3,
            travel: { x: 700, y: 400, z: 300, units: "mm" },
            table: { width: 900, length: 400, tSlots: 5, loadCapacity: 300 },
            spindle: {
                maxRPM: 16000,
                spindleHP: 15,
                spindleKW: 11,
                taper: "BT30",
                bearingType: "Ceramic"
            },
            toolChanger: {
                type: "Drum",
                capacity: 21,
                changeTime: 1.2,
                chipToChip: 1.5
            },
            rapidTraverse: { x: 50, y: 50, z: 50, units: "m/min" },
            feedRate: { max: 30000, units: "mm/min" },
            accuracy: { positioning: 0.006, repeatability: 0.003 },
            weight: 3200,
            footprint: { width: 1600, depth: 2200, height: 2300 }
        }
    },
    // R Series - 5-Axis Vertical Machining Centers (Rotary Table)
    rSeries: {
        R450X1: {
            model: "SPEEDIO R450X1",
            type: "5-Axis Vertical Machining Center",
            axes: 5,
            configuration: "Table-Table (A/C)",
            travel: { x: 450, y: 305, z: 305, a: 120, c: 360, units: "mm/deg" },
            table: { diameter: 250, tSlots: 4, loadCapacity: 60 },
            spindle: {
                maxRPM: 16000,
                spindleHP: 11,
                spindleKW: 8,
                taper: "BT30",
                bearingType: "Ceramic"
            },
            kinematics: {
                type: "trunnion",
                aAxisRange: [-30, 90],
                cAxisRange: [-360, 360],
                rotarySpeed: { a: 100, c: 150, units: "deg/sec" },
                pivotPoint: { x: 0, y: 0, z: 150 }
            },
            toolChanger: {
                type: "Drum",
                capacity: 21,
                changeTime: 1.2,
                chipToChip: 1.5
            },
            rapidTraverse: { x: 50, y: 50, z: 50, units: "m/min" },
            feedRate: { max: 30000, units: "mm/min" },
            accuracy: { positioning: 0.005, repeatability: 0.002 },
            weight: 3800,
            footprint: { width: 1600, depth: 2400, height: 2400 }
        },
        R650X1: {
            model: "SPEEDIO R650X1",
            type: "5-Axis Vertical Machining Center",
            axes: 5,
            configuration: "Table-Table (A/C)",
            travel: { x: 650, y: 450, z: 350, a: 150, c: 360, units: "mm/deg" },
            table: { diameter: 400, tSlots: 6, loadCapacity: 120 },
            spindle: {
                maxRPM: 16000,
                spindleHP: 15,
                spindleKW: 11,
                taper: "BT30",
                bearingType: "Ceramic"
            },
            kinematics: {
                type: "trunnion",
                aAxisRange: [-30, 120],
                cAxisRange: [-360, 360],
                rotarySpeed: { a: 80, c: 120, units: "deg/sec" },
                pivotPoint: { x: 0, y: 0, z: 180 }
            },
            toolChanger: {
                type: "Magazine",
                capacity: 30,
                changeTime: 1.8,
                chipToChip: 2.2
            },
            rapidTraverse: { x: 50, y: 50, z: 50, units: "m/min" },
            feedRate: { max: 30000, units: "mm/min" },
            accuracy: { positioning: 0.006, repeatability: 0.003 },
            weight: 5200,
            footprint: { width: 1900, depth: 2800, height: 2600 }
        }
    },
    // U Series - 5-Axis with Direct-Drive Rotary Table
    uSeries: {
        U500Xd1: {
            model: "SPEEDIO U500Xd1",
            type: "5-Axis Direct-Drive",
            axes: 5,
            configuration: "Table-Table (A/C) Direct Drive",
            travel: { x: 500, y: 400, z: 305, a: 180, c: 360, units: "mm/deg" },
            table: { diameter: 340, tSlots: 0, loadCapacity: 80 },
            spindle: {
                maxRPM: 16000,
                spindleHP: 11,
                spindleKW: 8,
                taper: "BT30",
                bearingType: "Ceramic"
            },
            kinematics: {
                type: "trunnion-direct",
                aAxisRange: [-90, 90],
                cAxisRange: [-360, 360],
                rotarySpeed: { a: 150, c: 200, units: "deg/sec" },
                pivotPoint: { x: 0, y: 0, z: 140 },
                directDrive: true
            },
            toolChanger: {
                type: "Drum",
                capacity: 21,
                changeTime: 0.9,
                chipToChip: 1.4
            },
            rapidTraverse: { x: 56, y: 56, z: 56, units: "m/min" },
            feedRate: { max: 50000, units: "mm/min" },
            accuracy: { positioning: 0.004, repeatability: 0.002 },
            weight: 4200,
            footprint: { width: 1700, depth: 2600, height: 2500 }
        }
    },
    // M Series - Compact Tapping Centers
    mSeries: {
        M140X1: {
            model: "SPEEDIO M140X1",
            type: "Compact Tapping Center",
            axes: 3,
            travel: { x: 200, y: 200, z: 200, units: "mm" },
            table: { width: 350, length: 250, tSlots: 3, loadCapacity: 50 },
            spindle: {
                maxRPM: 10000,
                spindleHP: 3,
                spindleKW: 2.2,
                taper: "BT30"
            },
            toolChanger: {
                type: "Drum",
                capacity: 10,
                changeTime: 0.9,
                chipToChip: 1.2
            },
            rapidTraverse: { x: 40, y: 40, z: 40, units: "m/min" },
            accuracy: { positioning: 0.005, repeatability: 0.002 },
            weight: 1200
        },
        M200Xd1: {
            model: "SPEEDIO M200Xd1",
            type: "Compact Tapping Center",
            axes: 3,
            travel: { x: 200, y: 200, z: 200, units: "mm" },
            table: { width: 350, length: 250, tSlots: 3, loadCapacity: 50 },
            spindle: {
                maxRPM: 16000,
                spindleHP: 5.5,
                spindleKW: 4,
                taper: "BT30"
            },
            toolChanger: {
                type: "Drum",
                capacity: 14,
                changeTime: 0.9,
                chipToChip: 1.2
            },
            rapidTraverse: { x: 50, y: 50, z: 50, units: "m/min" },
            accuracy: { positioning: 0.004, repeatability: 0.002 },
            weight: 1400
        }
    },
    // F Series - High-Speed with Large Capacity
    fSeries: {
        F600X1: {
            model: "SPEEDIO F600X1",
            type: "High-Speed Machining Center",
            axes: 3,
            travel: { x: 600, y: 450, z: 350, units: "mm" },
            table: { width: 750, length: 450, tSlots: 5, loadCapacity: 400 },
            spindle: {
                maxRPM: 16000,
                spindleHP: 18.5,
                spindleKW: 14,
                taper: "BT40",
                bearingType: "Ceramic"
            },
            toolChanger: {
                type: "Magazine",
                capacity: 40,
                changeTime: 2.0,
                chipToChip: 2.8
            },
            rapidTraverse: { x: 50, y: 50, z: 50, units: "m/min" },
            feedRate: { max: 40000, units: "mm/min" },
            accuracy: { positioning: 0.005, repeatability: 0.002 },
            weight: 4800,
            footprint: { width: 1800, depth: 2600, height: 2600 }
        }
    },
    // Lookup function
    getMachine: function(model) {
        const modelLower = model.toLowerCase();
        for (const series of Object.values(this)) {
            if (typeof series !== 'object' || !series) continue;
            for (const [key, machine] of Object.entries(series)) {
                if (machine.model && machine.model.toLowerCase().includes(modelLower)) {
                    return machine;
                }
            }
        }
        return null;
    },
    // Get all 5-axis machines
    get5AxisMachines: function() {
        const result = [];
        for (const series of Object.values(this)) {
            if (typeof series !== 'object' || !series) continue;
            for (const machine of Object.values(series)) {
                if (machine.axes === 5) {
                    result.push(machine);
                }
            }
        }
        return result;
    }
};
// 3.2 COMPREHENSIVE 5-AXIS KINEMATIC CONFIGURATIONS DATABASE
// Detailed pivot points, rotation centers, and kinematic chains

const FIVE_AXIS_KINEMATIC_CONFIGURATIONS = {
    version: "1.0",

    // Table-Table (Trunnion) Configuration - Most common for VMCs
    tableTable: {
        description: "Two rotary axes in the table (A/C or B/C trunnion)",
        advantages: [
            "Excellent rigidity - workpiece moves, not spindle",
            "Better chip evacuation",
            "Simpler machine structure",
            "Lower cost than swivel head"
        ],
        disadvantages: [
            "Part size limited by rotary table capacity",
            "Potential interference with tall parts"
        ],
        machines: {
            haasUMC750: {
                name: "Haas UMC-750",
                aAxisRange: [-35, 120],
                cAxisRange: [-360, 360],
                pivotPoint: { x: 0, y: 0, z: 203.2, units: "mm" },
                tableDiameter: 630,
                maxPartHeight: 406,
                postVariable: "G43.4 H#"
            },
            haasUMC500: {
                name: "Haas UMC-500",
                aAxisRange: [-35, 120],
                cAxisRange: [-360, 360],
                pivotPoint: { x: 0, y: 0, z: 177.8, units: "mm" },
                tableDiameter: 500,
                maxPartHeight: 330,
                postVariable: "G43.4 H#"
            },
            dmgDMU50: {
                name: "DMG MORI DMU 50",
                bAxisRange: [-5, 110],
                cAxisRange: [-360, 360],
                pivotPoint: { x: 0, y: 0, z: 200, units: "mm" },
                tableDiameter: 630,
                maxPartHeight: 450
            },
            mazakVariaxis: {
                name: "Mazak VARIAXIS i-500",
                aAxisRange: [-30, 120],
                cAxisRange: [-360, 360],
                pivotPoint: { x: 0, y: -125, z: 170, units: "mm" },
                tableDiameter: 500,
                maxPartHeight: 350
            },
            brotherR450X1: {
                name: "Brother SPEEDIO R450X1",
                aAxisRange: [-30, 90],
                cAxisRange: [-360, 360],
                pivotPoint: { x: 0, y: 0, z: 150, units: "mm" },
                tableDiameter: 250,
                maxPartHeight: 200
            },
            okumaGenos: {
                name: "Okuma GENOS M460V-5AX",
                aAxisRange: [-30, 120],
                cAxisRange: [-360, 360],
                pivotPoint: { x: 0, y: 0, z: 190, units: "mm" },
                tableDiameter: 500,
                maxPartHeight: 380
            }
        },
        calculateTCP: function(machine, toolLength) {
            // Calculate Tool Center Point for table-table config
            const pivot = this.machines[machine]?.pivotPoint;
            if (!pivot) return null;
            return {
                x: pivot.x,
                y: pivot.y,
                z: pivot.z + toolLength
            };
        }
    },
    // Head-Head (Swivel Head) Configuration - Fork or nutating head
    headHead: {
        description: "Two rotary axes in the spindle head (A/B or A/C)",
        advantages: [
            "Large workpiece capacity",
            "Part remains stationary",
            "Better for heavy parts"
        ],
        disadvantages: [
            "More complex head design",
            "Higher cost",
            "Head can limit reach"
        ],
        machines: {
            makinoD500: {
                name: "Makino D500",
                aAxisRange: [-30, 120],
                bAxisRange: [-360, 360],
                pivotPoint: { x: 0, y: 0, z: 650, units: "mm" },
                headType: "Fork",
                maxTableLoad: 1000
            },
            dmgDMU80P: {
                name: "DMG MORI DMU 80 P duoBLOCK",
                bAxisRange: [-120, 120],
                cAxisRange: [-360, 360],
                pivotPoint: { x: 0, y: 0, z: 750, units: "mm" },
                headType: "duoBLOCK",
                maxTableLoad: 2000
            },
            hermleC42U: {
                name: "Hermle C 42 U",
                aAxisRange: [-100, 45],
                cAxisRange: [-360, 360],
                pivotPoint: { x: 0, y: 0, z: 380, units: "mm" },
                headType: "Swivel",
                maxTableLoad: 800
            }
        }
    },
    // Table-Head (Mixed) Configuration
    tableHead: {
        description: "One rotary axis in table, one in head (B + C typical)",
        advantages: [
            "Balance of rigidity and reach",
            "Good for medium-sized parts",
            "Flexible configuration"
        ],
        machines: {
            matsuuraMAM72: {
                name: "Matsuura MAM72-35V",
                bAxisRange: [-30, 120],
                cAxisRange: [-360, 360],
                pivotPointTable: { x: 0, y: 0, z: 180 },
                pivotPointHead: { x: 0, y: 0, z: 550 },
                tableDiameter: 350,
                headType: "Nutating"
            },
            grob: {
                name: "GROB G350",
                aAxisRange: [-45, 195],
                bAxisRange: [-360, 360],
                pivotPoint: { x: 0, y: 0, z: 320 },
                configuration: "Horizontal spindle with A/B"
            }
        }
    },
    // Utility functions
    calculateKinematicChain: function(config, aAngle, cAngle, toolLength) {
        // Calculate the transformation matrix for 5-axis positioning
        const radA = aAngle * Math.PI / 180;
        const radC = cAngle * Math.PI / 180;

        // Simplified rotation matrix calculation
        return {
            rotationA: {
                cosA: Math.cos(radA),
                sinA: Math.sin(radA)
            },
            rotationC: {
                cosC: Math.cos(radC),
                sinC: Math.sin(radC)
            },
            toolTip: {
                x: toolLength * Math.sin(radA) * Math.sin(radC),
                y: toolLength * Math.sin(radA) * Math.cos(radC),
                z: toolLength * Math.cos(radA)
            }
        };
    },
    // Get machine by name
    getMachine: function(name) {
        const nameLower = name.toLowerCase();
        for (const configType of [this.tableTable, this.headHead, this.tableHead]) {
            if (configType.machines) {
                for (const [key, machine] of Object.entries(configType.machines)) {
                    if (machine.name && machine.name.toLowerCase().includes(nameLower)) {
                        return { type: configType.description, ...machine };
                    }
                }
            }
        }
        return null;
    }
};
// 3.3 WORK ENVELOPE & COLLISION BOUNDARY DATABASE
// Precise work envelope definitions for collision detection

const MACHINE_WORK_ENVELOPE_DATABASE = {
    version: "1.0",

    // Work envelope definitions by machine
    envelopes: {
        // Haas Machines
        haasVF2: {
            name: "Haas VF-2",
            type: "3-axis VMC",
            workEnvelope: {
                x: { min: 0, max: 762, home: 0 },
                y: { min: 0, max: 406, home: 0 },
                z: { min: 0, max: 508, home: 508 },
                units: "mm"
            },
            table: {
                width: 914,
                length: 356,
                height: 0,
                tSlotSpacing: 63.5
            },
            spindle: {
                centerX: 381,
                centerY: 203,
                noseZ: 508,
                diameter: 100
            },
            collisionZones: {
                spindleHead: { xMin: 280, xMax: 482, yMin: 103, yMax: 303, zMin: 400, zMax: 600 },
                column: { xMin: -100, xMax: 100, yMin: 350, yMax: 600, zMin: 0, zMax: 800 },
                enclosure: { xMin: -50, xMax: 812, yMin: -50, yMax: 456, zMin: -50, zMax: 650 }
            }
        },
        haasUMC750: {
            name: "Haas UMC-750",
            type: "5-axis VMC",
            workEnvelope: {
                x: { min: 0, max: 762, home: 0 },
                y: { min: 0, max: 508, home: 0 },
                z: { min: 0, max: 508, home: 508 },
                a: { min: -35, max: 120, home: 0 },
                c: { min: -360, max: 360, home: 0 },
                units: "mm/deg"
            },
            rotaryTable: {
                diameter: 630,
                centerX: 381,
                centerY: 254,
                topZ: 203.2,
                pivotZ: 203.2
            },
            collisionZones: {
                trunnion: { radius: 350, zMin: 50, zMax: 350 },
                spindleHead: { xMin: 280, xMax: 482, yMin: 153, yMax: 353, zMin: 400, zMax: 600 }
            }
        },
        // Mazak Machines
        mazakVariaxisI500: {
            name: "Mazak VARIAXIS i-500",
            type: "5-axis VMC",
            workEnvelope: {
                x: { min: 0, max: 500, home: 250 },
                y: { min: 0, max: 500, home: 250 },
                z: { min: 0, max: 510, home: 510 },
                a: { min: -30, max: 120, home: 0 },
                c: { min: -360, max: 360, home: 0 },
                units: "mm/deg"
            },
            rotaryTable: {
                diameter: 500,
                centerX: 250,
                centerY: 125,
                topZ: 170,
                pivotZ: 170,
                pivotY: -125
            },
            collisionZones: {
                trunnion: { radius: 280, zMin: 20, zMax: 280 },
                tailstock: null
            }
        },
        // DMG MORI Machines
        dmgDMU50: {
            name: "DMG MORI DMU 50",
            type: "5-axis VMC",
            workEnvelope: {
                x: { min: 0, max: 500, home: 250 },
                y: { min: 0, max: 450, home: 225 },
                z: { min: 0, max: 400, home: 400 },
                b: { min: -5, max: 110, home: 0 },
                c: { min: -360, max: 360, home: 0 },
                units: "mm/deg"
            },
            rotaryTable: {
                diameter: 630,
                centerX: 250,
                centerY: 225,
                topZ: 200,
                pivotZ: 200
            }
        },
        // Brother SPEEDIO
        brotherR450X1: {
            name: "Brother SPEEDIO R450X1",
            type: "5-axis compact VMC",
            workEnvelope: {
                x: { min: 0, max: 450, home: 225 },
                y: { min: 0, max: 305, home: 152.5 },
                z: { min: 0, max: 305, home: 305 },
                a: { min: -30, max: 90, home: 0 },
                c: { min: -360, max: 360, home: 0 },
                units: "mm/deg"
            },
            rotaryTable: {
                diameter: 250,
                centerX: 225,
                centerY: 152.5,
                topZ: 150,
                pivotZ: 150
            },
            rapidTraverse: { x: 50, y: 50, z: 50, a: 100, c: 150 }
        },
        // Okuma Machines
        okumaGenosM460V5AX: {
            name: "Okuma GENOS M460V-5AX",
            type: "5-axis VMC",
            workEnvelope: {
                x: { min: 0, max: 762, home: 381 },
                y: { min: 0, max: 460, home: 230 },
                z: { min: 0, max: 460, home: 460 },
                a: { min: -30, max: 120, home: 0 },
                c: { min: -360, max: 360, home: 0 },
                units: "mm/deg"
            },
            rotaryTable: {
                diameter: 500,
                centerX: 381,
                centerY: 230,
                topZ: 190,
                pivotZ: 190
            }
        }
    },
    // Check if point is within envelope
    isPointInEnvelope: function(machineName, x, y, z) {
        const machine = this.envelopes[machineName];
        if (!machine) return null;

        const env = machine.workEnvelope;
        return (
            x >= env.x.min && x <= env.x.max &&
            y >= env.y.min && y <= env.y.max &&
            z >= env.z.min && z <= env.z.max
        );
    },
    // Check collision with zones
    checkCollision: function(machineName, x, y, z, toolRadius, toolLength) {
        const machine = this.envelopes[machineName];
        if (!machine || !machine.collisionZones) return { collision: false };

        const zones = machine.collisionZones;
        const collisions = [];

        for (const [zoneName, zone] of Object.entries(zones)) {
            if (!zone) continue;

            // Simple box collision check
            if (zone.xMin !== undefined) {
                if (x + toolRadius >= zone.xMin && x - toolRadius <= zone.xMax &&
                    y + toolRadius >= zone.yMin && y - toolRadius <= zone.yMax &&
                    z - toolLength >= zone.zMin && z <= zone.zMax) {
                    collisions.push(zoneName);
                }
            }
            // Cylindrical collision check for trunnion
            if (zone.radius !== undefined) {
                const tableCenter = machine.rotaryTable;
                if (tableCenter) {
                    const distFromCenter = Math.sqrt(
                        Math.pow(x - tableCenter.centerX, 2) +
                        Math.pow(y - tableCenter.centerY, 2)
                    );
                    if (distFromCenter + toolRadius > zone.radius &&
                        z - toolLength >= zone.zMin && z <= zone.zMax) {
                        collisions.push(zoneName);
                    }
                }
            }
        }
        return {
            collision: collisions.length > 0,
            zones: collisions
        };
    },
    // Get machine envelope
    getEnvelope: function(machineName) {
        const nameKey = Object.keys(this.envelopes).find(
            key => this.envelopes[key].name.toLowerCase().includes(machineName.toLowerCase())
        );
        return nameKey ? this.envelopes[nameKey] : null;
    }
};
// 3.4 ENHANCED MACHINE SPECIFICATION FIELDS
// Standardized specification structure with all required fields

const PRISM_MACHINE_SPEC_STANDARD = {
    version: "1.0",

    // Standard specification template
    specTemplate: {
        identification: {
            manufacturer: "",
            model: "",
            type: "",  // VMC, HMC, Lathe, Mill-Turn, etc.
            series: "",
            controller: ""
        },
        axes: {
            count: 0,
            configuration: "",  // 3-axis, 4-axis, 5-axis table-table, etc.
            travel: {
                x: { min: 0, max: 0, units: "mm" },
                y: { min: 0, max: 0, units: "mm" },
                z: { min: 0, max: 0, units: "mm" },
                a: { min: 0, max: 0, units: "deg" },
                b: { min: 0, max: 0, units: "deg" },
                c: { min: 0, max: 0, units: "deg" }
            }
        },
        spindle: {
            maxRPM: 0,
            spindleHP: 0,
            spindleKW: 0,
            taper: "",  // BT30, BT40, CAT40, HSK-A63, etc.
            bearingType: "",
            orientation: "vertical"  // vertical, horizontal
        },
        table: {
            width: 0,
            length: 0,
            diameter: 0,  // for rotary tables
            tSlots: 0,
            loadCapacity: 0,
            units: "mm/kg"
        },
        toolChanger: {
            type: "",  // Drum, Carousel, Chain, Matrix
            capacity: 0,
            maxToolDiameter: 0,
            maxToolLength: 0,
            maxToolWeight: 0,
            changeTime: 0,
            chipToChip: 0
        },
        performance: {
            rapidTraverse: { x: 0, y: 0, z: 0, units: "m/min" },
            feedRate: { max: 0, units: "mm/min" },
            accuracy: { positioning: 0, repeatability: 0, units: "mm" }
        },
        physical: {
            weight: 0,
            footprint: { width: 0, depth: 0, height: 0 },
            powerRequirement: 0,
            airRequirement: 0
        },
        kinematics: {
            type: "",  // For 5-axis: table-table, head-head, table-head
            pivotPoint: { x: 0, y: 0, z: 0 },
            rotarySpeed: { a: 0, b: 0, c: 0, units: "deg/sec" }
        }
    },
    // Convert legacy machine data to standard format
    standardize: function(machineData) {
        const standard = JSON.parse(JSON.stringify(this.specTemplate));

        // Map common fields
        if (machineData.model) standard.identification.model = machineData.model;
        if (machineData.manufacturer) standard.identification.manufacturer = machineData.manufacturer;
        if (machineData.type) standard.identification.type = machineData.type;
        if (machineData.controller) standard.identification.controller = machineData.controller;

        // Map travel
        if (machineData.travel) {
            if (machineData.travel.x) standard.axes.travel.x.max = machineData.travel.x;
            if (machineData.travel.y) standard.axes.travel.y.max = machineData.travel.y;
            if (machineData.travel.z) standard.axes.travel.z.max = machineData.travel.z;
        }
        // Map spindle
        if (machineData.spindle) {
            standard.spindle.maxRPM = machineData.spindle.maxRPM || machineData.maxRPM || 0;
            standard.spindle.spindleHP = machineData.spindle.spindleHP || machineData.spindleHP || 0;
            standard.spindle.spindleKW = machineData.spindle.spindleKW || machineData.spindleKW || 0;
            standard.spindle.taper = machineData.spindle.taper || machineData.taper || "";
        }
        // Map tool changer
        if (machineData.toolChanger) {
            standard.toolChanger.capacity = machineData.toolChanger.capacity || machineData.toolCapacity || 0;
            standard.toolChanger.changeTime = machineData.toolChanger.changeTime || 0;
            standard.toolChanger.chipToChip = machineData.toolChanger.chipToChip || 0;
        }
        // Map performance
        if (machineData.rapidTraverse) {
            standard.performance.rapidTraverse = machineData.rapidTraverse;
        }
        if (machineData.accuracy) {
            standard.performance.accuracy = machineData.accuracy;
        }
        return standard;
    },
    // Validate machine spec completeness
    validateSpec: function(spec) {
        const required = ['identification.model', 'axes.count', 'spindle.maxRPM'];
        const missing = [];

        for (const field of required) {
            const parts = field.split('.');
            let value = spec;
            for (const part of parts) {
                value = value?.[part];
            }
            if (!value) missing.push(field);
        }
        return {
            valid: missing.length === 0,
            missing: missing,
            completeness: (required.length - missing.length) / required.length * 100
        };
    }
};
// 3.5 MACHINE STEP FILE METADATA DATABASE
// Catalog of available STEP files and their specifications

const MACHINE_STEP_FILE_DATABASE = {
    version: "1.0",

    // Brother SPEEDIO STEP files
    brother: {
        manufacturer: "Brother Industries",
        models: {
            S300X1: { available: true, fileSize: "4.8MB", format: "STEP AP214", lastUpdated: "2024-06" },
            S500X1: { available: true, fileSize: "5.2MB", format: "STEP AP214", lastUpdated: "2024-06" },
            S700X1: { available: true, fileSize: "5.8MB", format: "STEP AP214", lastUpdated: "2024-06" },
            R450X1: { available: true, fileSize: "6.2MB", format: "STEP AP214", lastUpdated: "2024-06" },
            R650X1: { available: true, fileSize: "7.1MB", format: "STEP AP214", lastUpdated: "2024-06" },
            U500Xd1: { available: true, fileSize: "5.5MB", format: "STEP AP214", lastUpdated: "2024-06" },
            M140X1: { available: true, fileSize: "3.8MB", format: "STEP AP214", lastUpdated: "2024-06" },
            M200Xd1: { available: true, fileSize: "4.2MB", format: "STEP AP214", lastUpdated: "2024-06" },
            F600X1: { available: true, fileSize: "6.1MB", format: "STEP AP214", lastUpdated: "2024-06" }
        }
    },
    // Haas STEP files
    haas: {
        manufacturer: "Haas Automation",
        models: {
            "VF-2": { available: true, fileSize: "8.5MB", format: "STEP AP214", lastUpdated: "2024-08" },
            "VF-3": { available: true, fileSize: "9.2MB", format: "STEP AP214", lastUpdated: "2024-08" },
            "VF-4": { available: true, fileSize: "10.1MB", format: "STEP AP214", lastUpdated: "2024-08" },
            "UMC-500": { available: true, fileSize: "12.3MB", format: "STEP AP214", lastUpdated: "2024-08" },
            "UMC-750": { available: true, fileSize: "14.5MB", format: "STEP AP214", lastUpdated: "2024-08" },
            "UMC-1000": { available: true, fileSize: "16.2MB", format: "STEP AP214", lastUpdated: "2024-08" },
            "VF-2 + TRT100": { available: true, fileSize: "15.8MB", format: "STEP AP214", lastUpdated: "2024-08" },
            "VF-2 + TR160": { available: true, fileSize: "17.2MB", format: "STEP AP214", lastUpdated: "2024-08" }
        }
    },
    // Hurco STEP files
    hurco: {
        manufacturer: "Hurco",
        models: {
            VMX24i: { available: true, fileSize: "7.8MB", format: "STEP AP214", lastUpdated: "2024-07" },
            VMX30i: { available: true, fileSize: "8.5MB", format: "STEP AP214", lastUpdated: "2024-07" },
            VMX42i: { available: true, fileSize: "9.8MB", format: "STEP AP214", lastUpdated: "2024-07" },
            VMX60Ui: { available: true, fileSize: "15.2MB", format: "STEP AP214", lastUpdated: "2024-07" },
            BX40i: { available: true, fileSize: "11.5MB", format: "STEP AP214", lastUpdated: "2024-07" }
        }
    },
    // DMG MORI STEP files
    dmgMori: {
        manufacturer: "DMG MORI",
        models: {
            DMU50: { available: true, fileSize: "18.5MB", format: "STEP AP214", lastUpdated: "2024-09" },
            "DMU 50 3rd Gen": { available: true, fileSize: "19.2MB", format: "STEP AP214", lastUpdated: "2024-09" },
            "DMU 65 monoBLOCK": { available: true, fileSize: "22.5MB", format: "STEP AP214", lastUpdated: "2024-09" },
            "DMU 80 P duoBLOCK": { available: true, fileSize: "28.3MB", format: "STEP AP214", lastUpdated: "2024-09" },
            CMX50U: { available: true, fileSize: "16.8MB", format: "STEP AP214", lastUpdated: "2024-09" },
            CMX70U: { available: true, fileSize: "18.9MB", format: "STEP AP214", lastUpdated: "2024-09" }
        }
    },
    // Okuma STEP files
    okuma: {
        manufacturer: "Okuma",
        models: {
            "GENOS M460V-5AX": { available: true, fileSize: "20.5MB", format: "STEP AP214", lastUpdated: "2024-08" },
            "MU-4000V": { available: true, fileSize: "24.8MB", format: "STEP AP214", lastUpdated: "2024-08" },
            "MU-5000V": { available: true, fileSize: "28.2MB", format: "STEP AP214", lastUpdated: "2024-08" },
            "MU-6300V": { available: true, fileSize: "32.5MB", format: "STEP AP214", lastUpdated: "2024-08" },
            "MB-46VAE": { available: true, fileSize: "15.2MB", format: "STEP AP214", lastUpdated: "2024-08" }
        }
    },
    // Hermle STEP files
    hermle: {
        manufacturer: "Hermle",
        models: {
            C22U: { available: true, fileSize: "16.5MB", format: "STEP AP214", lastUpdated: "2024-06" },
            C32U: { available: true, fileSize: "19.2MB", format: "STEP AP214", lastUpdated: "2024-06" },
            C42U: { available: true, fileSize: "22.8MB", format: "STEP AP214", lastUpdated: "2024-06" },
            C52U: { available: true, fileSize: "28.5MB", format: "STEP AP214", lastUpdated: "2024-06" },
            C62U: { available: true, fileSize: "35.2MB", format: "STEP AP214", lastUpdated: "2024-06" },
            C250U: { available: true, fileSize: "18.5MB", format: "STEP AP214", lastUpdated: "2024-06" },
            C400U: { available: true, fileSize: "26.8MB", format: "STEP AP214", lastUpdated: "2024-06" }
        }
    },
    // Query functions
    getAvailableModels: function(manufacturer) {
        const mfr = this[manufacturer.toLowerCase()];
        if (!mfr) return [];
        return Object.entries(mfr.models)
            .filter(([_, data]) => data.available)
            .map(([model, data]) => ({ model, ...data }));
    },
    getTotalFileCount: function() {
        let count = 0;
        for (const mfr of Object.values(this)) {
            if (mfr.models) {
                count += Object.values(mfr.models).filter(m => m.available).length;
            }
        }
        return count;
    },
    searchByModel: function(modelName) {
        const results = [];
        const searchLower = modelName.toLowerCase();
        for (const [mfrKey, mfr] of Object.entries(this)) {
            if (!mfr.models) continue;
            for (const [model, data] of Object.entries(mfr.models)) {
                if (model.toLowerCase().includes(searchLower)) {
                    results.push({
                        manufacturer: mfr.manufacturer || mfrKey,
                        model,
                        ...data
                    });
                }
            }
        }
        return results;
    }
};
// Log batch 3 integration
console.log("="*60);
console.log("PRISM v8.87.001 - BATCH 3 MACHINE DATABASE ENHANCEMENT LOADED");
console.log("="*60);
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log("Components loaded:");
console.log("  • BROTHER_SPEEDIO_COMPREHENSIVE_DATABASE: 12 models");
console.log("  • FIVE_AXIS_KINEMATIC_CONFIGURATIONS: 3 config types, 12+ machines");
console.log("  • MACHINE_WORK_ENVELOPE_DATABASE: 6 machines with collision zones");
console.log("  • PRISM_MACHINE_SPEC_STANDARD: Standardized spec template");
console.log("  • MACHINE_STEP_FILE_DATABASE: 40+ STEP file references");
console.log("="*60);

// BATCH 4: PRINT READING ENHANCEMENT - PRISM v8.87.001

// PRISM v8.87.001 - BATCH 4: PRINT READING ENHANCEMENT
// Multi-view correlation, dimension extraction, GD&T parsing, thread standards

// 4.1 MULTI-VIEW CORRELATION ENGINE
// Correlates information across multiple orthographic views

const PRISM_MULTI_VIEW_CORRELATION_ENGINE = {
    version: "1.0",

    // View types and their characteristics
    viewTypes: {
        frontView: {
            name: "Front View",
            aliases: ["front elevation", "elevation", "principal view"],
            visibleAxes: ["X", "Y"],
            hiddenAxis: "Z",
            projection: { x: "horizontal", y: "vertical" },
            priority: 1
        },
        topView: {
            name: "Top View",
            aliases: ["plan view", "top elevation", "bird's eye"],
            visibleAxes: ["X", "Z"],
            hiddenAxis: "Y",
            projection: { x: "horizontal", z: "vertical" },
            priority: 2
        },
        rightSideView: {
            name: "Right Side View",
            aliases: ["right elevation", "right profile", "side elevation"],
            visibleAxes: ["Z", "Y"],
            hiddenAxis: "X",
            projection: { z: "horizontal", y: "vertical" },
            priority: 3
        },
        leftSideView: {
            name: "Left Side View",
            aliases: ["left elevation", "left profile"],
            visibleAxes: ["Z", "Y"],
            hiddenAxis: "X",
            projection: { z: "horizontal", y: "vertical" },
            priority: 4
        },
        bottomView: {
            name: "Bottom View",
            aliases: ["bottom elevation", "underside view"],
            visibleAxes: ["X", "Z"],
            hiddenAxis: "Y",
            projection: { x: "horizontal", z: "vertical" },
            priority: 5
        },
        rearView: {
            name: "Rear View",
            aliases: ["back view", "rear elevation"],
            visibleAxes: ["X", "Y"],
            hiddenAxis: "Z",
            projection: { x: "horizontal", y: "vertical" },
            priority: 6
        },
        isometricView: {
            name: "Isometric View",
            aliases: ["3D view", "pictorial view", "iso"],
            visibleAxes: ["X", "Y", "Z"],
            hiddenAxis: null,
            angles: { x: 30, y: 30 },
            priority: 7
        },
        sectionView: {
            name: "Section View",
            aliases: ["cross-section", "sectional view", "cut view"],
            requiresCuttingPlane: true,
            hatchingRequired: true,
            priority: 8
        },
        detailView: {
            name: "Detail View",
            aliases: ["enlarged view", "detail", "zoom view"],
            hasScaleFactor: true,
            requiresBoundary: true,
            priority: 9
        },
        auxiliaryView: {
            name: "Auxiliary View",
            aliases: ["secondary view", "inclined view"],
            requiresFoldingLine: true,
            showsTrueShape: true,
            priority: 10
        }
    },
    // Projection systems
    projectionSystems: {
        thirdAngle: {
            name: "Third Angle Projection",
            standard: "ANSI/ASME Y14.3",
            regions: ["USA", "Canada", "UK (modern)"],
            layout: {
                front: { row: 1, col: 1 },
                top: { row: 0, col: 1 },
                right: { row: 1, col: 2 },
                left: { row: 1, col: 0 },
                bottom: { row: 2, col: 1 },
                rear: { row: 1, col: 3 }
            },
            symbol: "Truncated cone with circle (small end toward viewer)"
        },
        firstAngle: {
            name: "First Angle Projection",
            standard: "ISO 128",
            regions: ["Europe", "Asia", "Australia"],
            layout: {
                front: { row: 1, col: 1 },
                top: { row: 2, col: 1 },
                right: { row: 1, col: 0 },
                left: { row: 1, col: 2 },
                bottom: { row: 0, col: 1 },
                rear: { row: 1, col: 3 }
            },
            symbol: "Truncated cone with circle (large end toward viewer)"
        }
    },
    // Correlate dimensions across views
    correlateDimensions: function(views) {
        const correlations = [];

        // Find matching dimensions between views
        for (let i = 0; i < views.length; i++) {
            for (let j = i + 1; j < views.length; j++) {
                const view1 = views[i];
                const view2 = views[j];

                // Find common axis dimensions
                const common = this.findCommonAxisDimensions(view1, view2);
                if (common.length > 0) {
                    correlations.push({
                        view1: view1.type,
                        view2: view2.type,
                        sharedDimensions: common,
                        confidence: this.calculateCorrelationConfidence(common)
                    });
                }
            }
        }
        return correlations;
    },
    // Find common axis dimensions between two views
    findCommonAxisDimensions: function(view1, view2) {
        const common = [];
        const type1 = this.viewTypes[view1.type];
        const type2 = this.viewTypes[view2.type];

        if (!type1 || !type2) return common;

        // Find shared axes
        const sharedAxes = type1.visibleAxes.filter(
            axis => type2.visibleAxes.includes(axis)
        );

        // Match dimensions on shared axes
        for (const axis of sharedAxes) {
            const dims1 = view1.dimensions.filter(d => d.axis === axis);
            const dims2 = view2.dimensions.filter(d => d.axis === axis);

            for (const d1 of dims1) {
                for (const d2 of dims2) {
                    if (Math.abs(d1.value - d2.value) < 0.001) {
                        common.push({
                            axis,
                            value: d1.value,
                            view1Position: d1.position,
                            view2Position: d2.position
                        });
                    }
                }
            }
        }
        return common;
    },
    // Calculate confidence score for correlations
    calculateCorrelationConfidence: function(correlations) {
        if (correlations.length === 0) return 0;

        // More correlations = higher confidence
        const countScore = Math.min(correlations.length / 5, 1) * 50;

        // Dimension consistency
        const consistencyScore = 50; // Placeholder for more sophisticated analysis

        return countScore + consistencyScore;
    },
    // Detect projection system from view layout
    detectProjectionSystem: function(viewPositions) {
        // Check if top view is above or below front view
        const front = viewPositions.find(v => v.type === 'frontView');
        const top = viewPositions.find(v => v.type === 'topView');

        if (!front || !top) return "unknown";

        if (top.y < front.y) {
            return "thirdAngle"; // Top view above front (USA standard)
        } else {
            return "firstAngle"; // Top view below front (ISO standard)
        }
    },
    // Build 3D model from correlated views
    build3DFromViews: function(correlatedViews) {
        const model = {
            vertices: [],
            edges: [],
            faces: [],
            features: []
        };
        // Extract unique coordinates from each axis
        const xCoords = new Set();
        const yCoords = new Set();
        const zCoords = new Set();

        for (const view of correlatedViews) {
            for (const dim of view.dimensions) {
                if (dim.axis === 'X') {
                    xCoords.add(dim.startValue);
                    xCoords.add(dim.endValue);
                }
                if (dim.axis === 'Y') {
                    yCoords.add(dim.startValue);
                    yCoords.add(dim.endValue);
                }
                if (dim.axis === 'Z') {
                    zCoords.add(dim.startValue);
                    zCoords.add(dim.endValue);
                }
            }
        }
        model.boundingBox = {
            x: { min: Math.min(...xCoords), max: Math.max(...xCoords) },
            y: { min: Math.min(...yCoords), max: Math.max(...yCoords) },
            z: { min: Math.min(...zCoords), max: Math.max(...zCoords) }
        };
        return model;
    }
};
// 4.2 ENHANCED DIMENSION EXTRACTION ENGINE
// Chain dimensions, baseline dimensions, ordinate dimensions

const PRISM_ENHANCED_DIMENSION_EXTRACTION = {
    version: "1.0",

    // Dimension types
    dimensionTypes: {
        linear: {
            name: "Linear Dimension",
            patterns: [
                /([0-9]+\.?[0-9]*)\s*(mm|in|"|\')/i,
                /([0-9]+)\s*-\s*([0-9]+)\/([0-9]+)/  // Fractional inches
            ],
            extractors: {
                mm: (val) => parseFloat(val),
                in: (val) => parseFloat(val) * 25.4,
                '"': (val) => parseFloat(val) * 25.4
            }
        },
        angular: {
            name: "Angular Dimension",
            patterns: [
                /([0-9]+\.?[0-9]*)\s*°/,
                /([0-9]+)°\s*([0-9]+)'\s*([0-9]+)"/  // Degrees, minutes, seconds
            ],
            extractors: {
                dms: (d, m, s) => parseFloat(d) + parseFloat(m)/60 + parseFloat(s)/3600
            }
        },
        radius: {
            name: "Radius Dimension",
            patterns: [
                /R\s*([0-9]+\.?[0-9]*)/i,
                /RAD\s*([0-9]+\.?[0-9]*)/i
            ],
            prefix: "R"
        },
        diameter: {
            name: "Diameter Dimension",
            patterns: [
                /[ØⱷΦ]\s*([0-9]+\.?[0-9]*)/,
                /DIA\s*([0-9]+\.?[0-9]*)/i,
                /\bD\s*([0-9]+\.?[0-9]*)/
            ],
            prefix: "Ø"
        },
        sphericalRadius: {
            name: "Spherical Radius",
            patterns: [/SR\s*([0-9]+\.?[0-9]*)/i],
            prefix: "SR"
        },
        sphericalDiameter: {
            name: "Spherical Diameter",
            patterns: [/S[ØⱷΦ]\s*([0-9]+\.?[0-9]*)/],
            prefix: "SØ"
        }
    },
    // Chain dimension parsing
    chainDimensions: {
        description: "Consecutive dimensions measured from one feature to the next",
        pattern: /([0-9]+\.?[0-9]*)\s*[-—]\s*([0-9]+\.?[0-9]*)\s*[-—]\s*([0-9]+\.?[0-9]*)/,

        parse: function(dimString) {
            const values = dimString.match(/[0-9]+\.?[0-9]*/g);
            if (!values) return null;

            const chain = {
                type: "chain",
                segments: values.map((v, i) => ({
                    index: i,
                    value: parseFloat(v),
                    cumulative: 0
                })),
                totalLength: 0
            };
            // Calculate cumulative positions
            let cumulative = 0;
            for (const segment of chain.segments) {
                cumulative += segment.value;
                segment.cumulative = cumulative;
            }
            chain.totalLength = cumulative;

            return chain;
        },
        // Convert chain to baseline
        toBaseline: function(chain) {
            return chain.segments.map(s => ({
                fromOrigin: s.cumulative - s.value,
                toPosition: s.cumulative,
                segmentValue: s.value
            }));
        }
    },
    // Baseline dimension parsing
    baselineDimensions: {
        description: "All dimensions measured from a common baseline/datum",

        parse: function(dimensions, baselinePosition = 0) {
            return dimensions.map(dim => ({
                type: "baseline",
                fromBaseline: baselinePosition,
                toPosition: dim.value,
                absoluteValue: dim.value - baselinePosition
            }));
        },
        // Convert baseline to chain
        toChain: function(baselineDims) {
            const sorted = [...baselineDims].sort((a, b) => a.toPosition - b.toPosition);
            const chain = [];

            for (let i = 0; i < sorted.length; i++) {
                const prev = i === 0 ? sorted[i].fromBaseline : sorted[i-1].toPosition;
                chain.push({
                    index: i,
                    value: sorted[i].toPosition - prev,
                    cumulative: sorted[i].toPosition
                });
            }
            return { type: "chain", segments: chain };
        }
    },
    // Ordinate dimension parsing
    ordinateDimensions: {
        description: "Dimensions shown as coordinates from a datum origin",

        parse: function(ordinateValues, axis) {
            return {
                type: "ordinate",
                axis: axis,
                origin: 0,
                positions: ordinateValues.map((val, i) => ({
                    index: i,
                    coordinate: parseFloat(val),
                    label: `${axis}${i + 1}`
                }))
            };
        }
    },
    // Tolerance parsing
    toleranceParsing: {
        // Bilateral tolerance: 25.4 ±0.1
        bilateral: {
            pattern: /([0-9]+\.?[0-9]*)\s*[±]\s*([0-9]+\.?[0-9]*)/,
            parse: function(match) {
                return {
                    type: "bilateral",
                    nominal: parseFloat(match[1]),
                    plusTolerance: parseFloat(match[2]),
                    minusTolerance: parseFloat(match[2]),
                    max: parseFloat(match[1]) + parseFloat(match[2]),
                    min: parseFloat(match[1]) - parseFloat(match[2])
                };
            }
        },
        // Unilateral tolerance: 25.4 +0.1/-0.0
        unilateral: {
            pattern: /([0-9]+\.?[0-9]*)\s*\+([0-9]+\.?[0-9]*)\s*\/\s*-([0-9]+\.?[0-9]*)/,
            parse: function(match) {
                return {
                    type: "unilateral",
                    nominal: parseFloat(match[1]),
                    plusTolerance: parseFloat(match[2]),
                    minusTolerance: parseFloat(match[3]),
                    max: parseFloat(match[1]) + parseFloat(match[2]),
                    min: parseFloat(match[1]) - parseFloat(match[3])
                };
            }
        },
        // Limit dimensions: 25.5/25.3
        limits: {
            pattern: /([0-9]+\.?[0-9]*)\s*\/\s*([0-9]+\.?[0-9]*)/,
            parse: function(match) {
                const val1 = parseFloat(match[1]);
                const val2 = parseFloat(match[2]);
                return {
                    type: "limits",
                    max: Math.max(val1, val2),
                    min: Math.min(val1, val2),
                    nominal: (val1 + val2) / 2,
                    tolerance: Math.abs(val1 - val2) / 2
                };
            }
        }
    },
    // Extract all dimensions from text
    extractAllDimensions: function(text) {
        const results = [];

        // Linear dimensions
        const linearPattern = /([0-9]+\.?[0-9]*)\s*(mm|in)?/gi;
        let match;
        while ((match = linearPattern.exec(text)) !== null) {
            results.push({
                type: "linear",
                raw: match[0],
                value: parseFloat(match[1]),
                unit: match[2] || "mm",
                position: match.index
            });
        }
        // Diameter dimensions
        const diaPattern = /[ØⱷΦ]\s*([0-9]+\.?[0-9]*)/g;
        while ((match = diaPattern.exec(text)) !== null) {
            results.push({
                type: "diameter",
                raw: match[0],
                value: parseFloat(match[1]),
                position: match.index
            });
        }
        // Radius dimensions
        const radPattern = /R\s*([0-9]+\.?[0-9]*)/gi;
        while ((match = radPattern.exec(text)) !== null) {
            results.push({
                type: "radius",
                raw: match[0],
                value: parseFloat(match[1]),
                position: match.index
            });
        }
        // Angular dimensions
        const angPattern = /([0-9]+\.?[0-9]*)\s*°/g;
        while ((match = angPattern.exec(text)) !== null) {
            results.push({
                type: "angular",
                raw: match[0],
                value: parseFloat(match[1]),
                unit: "degrees",
                position: match.index
            });
        }
        return results;
    }
};
// 4.3 ENHANCED GD&T FEATURE CONTROL FRAME PARSER
// Complete FCF parsing with composite tolerances

const PRISM_GDT_FCF_PARSER = {
    version: "2.0",

    // GD&T Symbol definitions (Unicode)
    symbols: {
        // Form tolerances
        flatness: { symbol: "⏥", unicode: "\u23E5", category: "form", requiresDatum: false },
        straightness: { symbol: "⏤", unicode: "\u23E4", category: "form", requiresDatum: false },
        circularity: { symbol: "○", unicode: "\u25CB", category: "form", requiresDatum: false },
        cylindricity: { symbol: "⌭", unicode: "\u232D", category: "form", requiresDatum: false },

        // Profile tolerances
        profileLine: { symbol: "⌒", unicode: "\u2312", category: "profile", requiresDatum: "optional" },
        profileSurface: { symbol: "⌓", unicode: "\u2313", category: "profile", requiresDatum: "optional" },

        // Orientation tolerances
        perpendicularity: { symbol: "⟂", unicode: "\u27C2", category: "orientation", requiresDatum: true },
        parallelism: { symbol: "∥", unicode: "\u2225", category: "orientation", requiresDatum: true },
        angularity: { symbol: "∠", unicode: "\u2220", category: "orientation", requiresDatum: true },

        // Location tolerances
        position: { symbol: "⌖", unicode: "\u2316", category: "location", requiresDatum: true },
        concentricity: { symbol: "◎", unicode: "\u25CE", category: "location", requiresDatum: true },
        symmetry: { symbol: "⌯", unicode: "\u232F", category: "location", requiresDatum: true },

        // Runout tolerances
        circularRunout: { symbol: "↗", unicode: "\u2197", category: "runout", requiresDatum: true },
        totalRunout: { symbol: "↗↗", unicode: "\u2197\u2197", category: "runout", requiresDatum: true }
    },
    // Material condition modifiers
    modifiers: {
        MMC: { symbol: "Ⓜ", unicode: "\u24C2", name: "Maximum Material Condition", effect: "bonus tolerance" },
        LMC: { symbol: "Ⓛ", unicode: "\u24C1", name: "Least Material Condition", effect: "bonus tolerance" },
        RFS: { symbol: "Ⓢ", unicode: "\u24C8", name: "Regardless of Feature Size", effect: "no bonus" },
        projected: { symbol: "Ⓟ", unicode: "\u24C5", name: "Projected Tolerance Zone" },
        free: { symbol: "Ⓕ", unicode: "\u24BB", name: "Free State" },
        tangent: { symbol: "Ⓣ", unicode: "\u24C9", name: "Tangent Plane" },
        unequal: { symbol: "Ⓤ", unicode: "\u24CA", name: "Unequal Bilateral" },
        statistical: { symbol: "ST", name: "Statistical Tolerance" },
        continuous: { symbol: "CF", name: "Continuous Feature" }
    },
    // Parse Feature Control Frame
    parseFCF: function(fcfString) {
        const result = {
            raw: fcfString,
            geometricCharacteristic: null,
            toleranceZone: null,
            primaryDatum: null,
            secondaryDatum: null,
            tertiaryDatum: null,
            modifiers: [],
            isComposite: false
        };
        // Detect composite tolerance (two-line FCF)
        if (fcfString.includes('\n') || fcfString.includes('|')) {
            result.isComposite = true;
            const lines = fcfString.split(/[\n|]/);
            result.patternLocating = this.parseSingleFCF(lines[0]);
            result.featureRelating = this.parseSingleFCF(lines[1]);
            return result;
        }
        return this.parseSingleFCF(fcfString);
    },
    // Parse single FCF line
    parseSingleFCF: function(line) {
        const result = {
            raw: line,
            geometricCharacteristic: null,
            diameterSymbol: false,
            toleranceValue: null,
            modifiers: [],
            datums: []
        };
        // Detect geometric characteristic symbol
        for (const [name, info] of Object.entries(this.symbols)) {
            if (line.includes(info.symbol) || line.includes(info.unicode)) {
                result.geometricCharacteristic = name;
                result.category = info.category;
                result.requiresDatum = info.requiresDatum;
                break;
            }
        }
        // Detect diameter symbol (cylindrical tolerance zone)
        if (line.includes('Ø') || line.includes('⌀')) {
            result.diameterSymbol = true;
        }
        // Extract tolerance value
        const tolMatch = line.match(/([0-9]+\.?[0-9]*)/);
        if (tolMatch) {
            result.toleranceValue = parseFloat(tolMatch[1]);
        }
        // Detect modifiers
        for (const [name, info] of Object.entries(this.modifiers)) {
            if (line.includes(info.symbol) || (info.unicode && line.includes(info.unicode))) {
                result.modifiers.push(name);
            }
        }
        // Extract datum references
        const datumPattern = /[A-Z](?:[Ⓜ Ⓛ Ⓢ])?/g;
        const datumMatches = line.match(datumPattern);
        if (datumMatches) {
            result.datums = datumMatches.filter(d => d.length <= 2);
        }
        return result;
    },
    // Calculate bonus tolerance for MMC/LMC
    calculateBonusTolerance: function(fcf, actualSize, mmc, lmc) {
        if (!fcf.modifiers.includes('MMC') && !fcf.modifiers.includes('LMC')) {
            return 0; // RFS - no bonus
        }
        if (fcf.modifiers.includes('MMC')) {
            // Bonus = |Actual Size - MMC|
            return Math.abs(actualSize - mmc);
        }
        if (fcf.modifiers.includes('LMC')) {
            // Bonus = |LMC - Actual Size|
            return Math.abs(lmc - actualSize);
        }
        return 0;
    },
    // Generate FCF string from parsed data
    generateFCF: function(data) {
        let fcf = '';

        // Add geometric characteristic
        if (data.geometricCharacteristic && this.symbols[data.geometricCharacteristic]) {
            fcf += this.symbols[data.geometricCharacteristic].symbol;
        }
        // Add diameter symbol if cylindrical zone
        if (data.diameterSymbol) {
            fcf += 'Ø';
        }
        // Add tolerance value
        if (data.toleranceValue !== null) {
            fcf += data.toleranceValue.toFixed(3);
        }
        // Add modifiers
        for (const mod of data.modifiers || []) {
            if (this.modifiers[mod]) {
                fcf += this.modifiers[mod].symbol;
            }
        }
        // Add datum references
        for (const datum of data.datums || []) {
            fcf += '|' + datum;
        }
        return fcf;
    }
};
// 4.4 COMPREHENSIVE THREAD STANDARD DATABASE
// ISO, Unified, Pipe threads with complete specifications

const PRISM_THREAD_STANDARD_DATABASE = {
    version: "2.0",

    // ISO Metric Threads (Coarse and Fine)
    metricCoarse: {
        standard: "ISO 261/262",
        designation: "M",
        threads: {
            M1:   { diameter: 1.0, pitch: 0.25, minorDia: 0.729, pitchDia: 0.838 },
            M1_2: { diameter: 1.2, pitch: 0.25, minorDia: 0.929, pitchDia: 1.038 },
            M1_6: { diameter: 1.6, pitch: 0.35, minorDia: 1.221, pitchDia: 1.373 },
            M2:   { diameter: 2.0, pitch: 0.40, minorDia: 1.567, pitchDia: 1.740 },
            M2_5: { diameter: 2.5, pitch: 0.45, minorDia: 2.013, pitchDia: 2.208 },
            M3:   { diameter: 3.0, pitch: 0.50, minorDia: 2.459, pitchDia: 2.675 },
            M4:   { diameter: 4.0, pitch: 0.70, minorDia: 3.242, pitchDia: 3.545 },
            M5:   { diameter: 5.0, pitch: 0.80, minorDia: 4.134, pitchDia: 4.480 },
            M6:   { diameter: 6.0, pitch: 1.00, minorDia: 4.917, pitchDia: 5.350 },
            M8:   { diameter: 8.0, pitch: 1.25, minorDia: 6.647, pitchDia: 7.188 },
            M10:  { diameter: 10.0, pitch: 1.50, minorDia: 8.376, pitchDia: 9.026 },
            M12:  { diameter: 12.0, pitch: 1.75, minorDia: 10.106, pitchDia: 10.863 },
            M14:  { diameter: 14.0, pitch: 2.00, minorDia: 11.835, pitchDia: 12.701 },
            M16:  { diameter: 16.0, pitch: 2.00, minorDia: 13.835, pitchDia: 14.701 },
            M18:  { diameter: 18.0, pitch: 2.50, minorDia: 15.294, pitchDia: 16.376 },
            M20:  { diameter: 20.0, pitch: 2.50, minorDia: 17.294, pitchDia: 18.376 },
            M22:  { diameter: 22.0, pitch: 2.50, minorDia: 19.294, pitchDia: 20.376 },
            M24:  { diameter: 24.0, pitch: 3.00, minorDia: 20.752, pitchDia: 22.051 },
            M27:  { diameter: 27.0, pitch: 3.00, minorDia: 23.752, pitchDia: 25.051 },
            M30:  { diameter: 30.0, pitch: 3.50, minorDia: 26.211, pitchDia: 27.727 }
        }
    },
    metricFine: {
        standard: "ISO 261/262",
        designation: "M x pitch",
        threads: {
            "M6x0.5":  { diameter: 6.0, pitch: 0.50, minorDia: 5.459, pitchDia: 5.675 },
            "M6x0.75": { diameter: 6.0, pitch: 0.75, minorDia: 5.188, pitchDia: 5.513 },
            "M8x0.5":  { diameter: 8.0, pitch: 0.50, minorDia: 7.459, pitchDia: 7.675 },
            "M8x0.75": { diameter: 8.0, pitch: 0.75, minorDia: 7.188, pitchDia: 7.513 },
            "M8x1":    { diameter: 8.0, pitch: 1.00, minorDia: 6.917, pitchDia: 7.350 },
            "M10x0.5": { diameter: 10.0, pitch: 0.50, minorDia: 9.459, pitchDia: 9.675 },
            "M10x0.75":{ diameter: 10.0, pitch: 0.75, minorDia: 9.188, pitchDia: 9.513 },
            "M10x1":   { diameter: 10.0, pitch: 1.00, minorDia: 8.917, pitchDia: 9.350 },
            "M10x1.25":{ diameter: 10.0, pitch: 1.25, minorDia: 8.647, pitchDia: 9.188 },
            "M12x1":   { diameter: 12.0, pitch: 1.00, minorDia: 10.917, pitchDia: 11.350 },
            "M12x1.25":{ diameter: 12.0, pitch: 1.25, minorDia: 10.647, pitchDia: 11.188 },
            "M12x1.5": { diameter: 12.0, pitch: 1.50, minorDia: 10.376, pitchDia: 11.026 },
            "M14x1.5": { diameter: 14.0, pitch: 1.50, minorDia: 12.376, pitchDia: 13.026 },
            "M16x1":   { diameter: 16.0, pitch: 1.00, minorDia: 14.917, pitchDia: 15.350 },
            "M16x1.5": { diameter: 16.0, pitch: 1.50, minorDia: 14.376, pitchDia: 15.026 },
            "M20x1.5": { diameter: 20.0, pitch: 1.50, minorDia: 18.376, pitchDia: 19.026 },
            "M20x2":   { diameter: 20.0, pitch: 2.00, minorDia: 17.835, pitchDia: 18.701 },
            "M24x2":   { diameter: 24.0, pitch: 2.00, minorDia: 21.835, pitchDia: 22.701 }
        }
    },
    // Unified National Threads (UNC, UNF, UNEF)
    unifiedCoarse: {
        standard: "ANSI/ASME B1.1",
        designation: "UNC",
        threads: {
            "#0-80":   { diameter: 0.060, tpi: 80, minorDia: 0.0447, pitchDia: 0.0519 },
            "#1-64":   { diameter: 0.073, tpi: 64, minorDia: 0.0538, pitchDia: 0.0629 },
            "#2-56":   { diameter: 0.086, tpi: 56, minorDia: 0.0641, pitchDia: 0.0744 },
            "#3-48":   { diameter: 0.099, tpi: 48, minorDia: 0.0734, pitchDia: 0.0855 },
            "#4-40":   { diameter: 0.112, tpi: 40, minorDia: 0.0813, pitchDia: 0.0958 },
            "#5-40":   { diameter: 0.125, tpi: 40, minorDia: 0.0943, pitchDia: 1.0088 },
            "#6-32":   { diameter: 0.138, tpi: 32, minorDia: 0.0997, pitchDia: 0.1177 },
            "#8-32":   { diameter: 0.164, tpi: 32, minorDia: 0.1257, pitchDia: 0.1437 },
            "#10-24":  { diameter: 0.190, tpi: 24, minorDia: 0.1389, pitchDia: 0.1629 },
            "#12-24":  { diameter: 0.216, tpi: 24, minorDia: 0.1649, pitchDia: 0.1889 },
            "1/4-20":  { diameter: 0.250, tpi: 20, minorDia: 0.1887, pitchDia: 0.2175 },
            "5/16-18": { diameter: 0.3125, tpi: 18, minorDia: 0.2443, pitchDia: 0.2764 },
            "3/8-16":  { diameter: 0.375, tpi: 16, minorDia: 0.2983, pitchDia: 0.3344 },
            "7/16-14": { diameter: 0.4375, tpi: 14, minorDia: 0.3499, pitchDia: 0.3911 },
            "1/2-13":  { diameter: 0.500, tpi: 13, minorDia: 0.4056, pitchDia: 0.4500 },
            "9/16-12": { diameter: 0.5625, tpi: 12, minorDia: 0.4603, pitchDia: 0.5084 },
            "5/8-11":  { diameter: 0.625, tpi: 11, minorDia: 0.5135, pitchDia: 0.5660 },
            "3/4-10":  { diameter: 0.750, tpi: 10, minorDia: 0.6273, pitchDia: 0.6850 },
            "7/8-9":   { diameter: 0.875, tpi: 9, minorDia: 0.7387, pitchDia: 0.8028 },
            "1-8":     { diameter: 1.000, tpi: 8, minorDia: 0.8466, pitchDia: 0.9188 }
        },
        inchToMM: 25.4
    },
    unifiedFine: {
        standard: "ANSI/ASME B1.1",
        designation: "UNF",
        threads: {
            "#0-80":   { diameter: 0.060, tpi: 80, minorDia: 0.0447, pitchDia: 0.0519 },
            "#1-72":   { diameter: 0.073, tpi: 72, minorDia: 0.0560, pitchDia: 0.0640 },
            "#2-64":   { diameter: 0.086, tpi: 64, minorDia: 0.0668, pitchDia: 0.0759 },
            "#3-56":   { diameter: 0.099, tpi: 56, minorDia: 0.0771, pitchDia: 0.0874 },
            "#4-48":   { diameter: 0.112, tpi: 48, minorDia: 0.0864, pitchDia: 0.0985 },
            "#5-44":   { diameter: 0.125, tpi: 44, minorDia: 0.0971, pitchDia: 0.1102 },
            "#6-40":   { diameter: 0.138, tpi: 40, minorDia: 0.1073, pitchDia: 0.1218 },
            "#8-36":   { diameter: 0.164, tpi: 36, minorDia: 0.1299, pitchDia: 0.1460 },
            "#10-32":  { diameter: 0.190, tpi: 32, minorDia: 0.1517, pitchDia: 0.1697 },
            "#12-28":  { diameter: 0.216, tpi: 28, minorDia: 0.1722, pitchDia: 0.1928 },
            "1/4-28":  { diameter: 0.250, tpi: 28, minorDia: 0.2062, pitchDia: 0.2268 },
            "5/16-24": { diameter: 0.3125, tpi: 24, minorDia: 0.2614, pitchDia: 0.2854 },
            "3/8-24":  { diameter: 0.375, tpi: 24, minorDia: 0.3239, pitchDia: 0.3479 },
            "7/16-20": { diameter: 0.4375, tpi: 20, minorDia: 0.3762, pitchDia: 0.4050 },
            "1/2-20":  { diameter: 0.500, tpi: 20, minorDia: 0.4387, pitchDia: 0.4675 },
            "9/16-18": { diameter: 0.5625, tpi: 18, minorDia: 0.4943, pitchDia: 0.5264 },
            "5/8-18":  { diameter: 0.625, tpi: 18, minorDia: 0.5568, pitchDia: 0.5889 },
            "3/4-16":  { diameter: 0.750, tpi: 16, minorDia: 0.6733, pitchDia: 0.7094 },
            "7/8-14":  { diameter: 0.875, tpi: 14, minorDia: 0.7874, pitchDia: 0.8286 },
            "1-12":    { diameter: 1.000, tpi: 12, minorDia: 0.8978, pitchDia: 0.9459 }
        },
        inchToMM: 25.4
    },
    // Pipe Threads
    npt: {
        standard: "ANSI/ASME B1.20.1",
        designation: "NPT",
        description: "National Pipe Thread Tapered",
        taperPerFoot: 0.75,  // inches per foot (1:16)
        threads: {
            "1/16-27":  { nominalSize: 0.0625, tpi: 27, majorDia: 0.3125 },
            "1/8-27":   { nominalSize: 0.125, tpi: 27, majorDia: 0.405 },
            "1/4-18":   { nominalSize: 0.25, tpi: 18, majorDia: 0.540 },
            "3/8-18":   { nominalSize: 0.375, tpi: 18, majorDia: 0.675 },
            "1/2-14":   { nominalSize: 0.5, tpi: 14, majorDia: 0.840 },
            "3/4-14":   { nominalSize: 0.75, tpi: 14, majorDia: 1.050 },
            "1-11.5":   { nominalSize: 1.0, tpi: 11.5, majorDia: 1.315 },
            "1-1/4-11.5": { nominalSize: 1.25, tpi: 11.5, majorDia: 1.660 },
            "1-1/2-11.5": { nominalSize: 1.5, tpi: 11.5, majorDia: 1.900 },
            "2-11.5":   { nominalSize: 2.0, tpi: 11.5, majorDia: 2.375 }
        }
    },
    nps: {
        standard: "ANSI/ASME B1.20.1",
        designation: "NPS",
        description: "National Pipe Straight (parallel)",
        threads: {
            "1/8-27":  { nominalSize: 0.125, tpi: 27, majorDia: 0.405 },
            "1/4-18":  { nominalSize: 0.25, tpi: 18, majorDia: 0.540 },
            "3/8-18":  { nominalSize: 0.375, tpi: 18, majorDia: 0.675 },
            "1/2-14":  { nominalSize: 0.5, tpi: 14, majorDia: 0.840 },
            "3/4-14":  { nominalSize: 0.75, tpi: 14, majorDia: 1.050 },
            "1-11.5":  { nominalSize: 1.0, tpi: 11.5, majorDia: 1.315 }
        }
    },
    bspt: {
        standard: "BS 21 / ISO 7",
        designation: "BSPT / Rp / Rc",
        description: "British Standard Pipe Tapered",
        taperPerFoot: 0.75,
        threads: {
            "1/8":  { nominalSize: 0.125, tpi: 28, majorDia: 9.728 },
            "1/4":  { nominalSize: 0.25, tpi: 19, majorDia: 13.157 },
            "3/8":  { nominalSize: 0.375, tpi: 19, majorDia: 16.662 },
            "1/2":  { nominalSize: 0.5, tpi: 14, majorDia: 20.955 },
            "3/4":  { nominalSize: 0.75, tpi: 14, majorDia: 26.441 },
            "1":    { nominalSize: 1.0, tpi: 11, majorDia: 33.249 }
        }
    },
    // Thread class/fit tolerances
    threadClasses: {
        metric: {
            "6H": { type: "internal", tolerance: "medium", description: "Standard nut thread" },
            "6g": { type: "external", tolerance: "medium", description: "Standard bolt thread" },
            "5H": { type: "internal", tolerance: "close", description: "Close fit nut" },
            "4h": { type: "external", tolerance: "close", description: "Close fit bolt" },
            "7H": { type: "internal", tolerance: "free", description: "Free fit nut" },
            "8g": { type: "external", tolerance: "free", description: "Free fit bolt" }
        },
        unified: {
            "1A": { type: "external", tolerance: "loose", description: "Allowance for plating" },
            "1B": { type: "internal", tolerance: "loose", description: "Allowance for plating" },
            "2A": { type: "external", tolerance: "standard", description: "General purpose" },
            "2B": { type: "internal", tolerance: "standard", description: "General purpose" },
            "3A": { type: "external", tolerance: "close", description: "Close fit" },
            "3B": { type: "internal", tolerance: "close", description: "Close fit" }
        }
    },
    // Parse thread callout
    parseThreadCallout: function(callout) {
        const result = {
            raw: callout,
            type: null,
            diameter: null,
            pitch: null,
            tpi: null,
            class: null,
            direction: "RH",  // Default right-hand
            depth: null
        };
        // Check for left-hand thread
        if (callout.includes("LH") || callout.includes("LEFT")) {
            result.direction = "LH";
        }
        // Metric thread: M6x1
        const metricMatch = callout.match(/M([0-9]+\.?[0-9]*)(?:x([0-9]+\.?[0-9]*))?/i);
        if (metricMatch) {
            result.type = "metric";
            result.diameter = parseFloat(metricMatch[1]);
            result.pitch = metricMatch[2] ? parseFloat(metricMatch[2]) : this.getDefaultPitch(result.diameter, "metric");
            return result;
        }
        // Unified thread: 1/4-20 UNC
        const unifiedMatch = callout.match(/([0-9\/]+)-([0-9]+)\s*(UNC|UNF|UNEF|UN)?\s*-?\s*([123][AB])?/i);
        if (unifiedMatch) {
            result.type = "unified";
            result.diameter = this.parseFraction(unifiedMatch[1]);
            result.tpi = parseInt(unifiedMatch[2]);
            result.series = unifiedMatch[3] || "UN";
            result.class = unifiedMatch[4] || "2A";
            return result;
        }
        // NPT: 1/2-14 NPT
        const nptMatch = callout.match(/([0-9\/]+)-([0-9]+\.?[0-9]*)\s*NPT/i);
        if (nptMatch) {
            result.type = "NPT";
            result.diameter = this.parseFraction(nptMatch[1]);
            result.tpi = parseFloat(nptMatch[2]);
            result.tapered = true;
            return result;
        }
        return result;
    },
    // Parse fraction to decimal
    parseFraction: function(str) {
        if (str.includes('/')) {
            const parts = str.split('/');
            return parseFloat(parts[0]) / parseFloat(parts[1]);
        }
        return parseFloat(str);
    },
    // Get default pitch for metric threads
    getDefaultPitch: function(diameter, type) {
        if (type === "metric") {
            const key = `M${diameter}`;
            if (this.metricCoarse.threads[key]) {
                return this.metricCoarse.threads[key].pitch;
            }
        }
        return null;
    },
    // Get thread data
    getThreadData: function(designation) {
        // Check all thread databases
        for (const [dbName, db] of Object.entries(this)) {
            if (typeof db === 'object' && db.threads) {
                if (db.threads[designation]) {
                    return { source: dbName, ...db.threads[designation] };
                }
            }
        }
        return null;
    }
};
// 4.5 SURFACE FINISH RECOGNITION & CONVERSION
// Ra, Rz, N-grades, and symbol recognition

const PRISM_SURFACE_FINISH_DATABASE = {
    version: "2.0",

    // Surface finish symbols and their meanings
    symbols: {
        basicSymbol: { symbol: "√", meaning: "Machining required" },
        prohibitedSymbol: { symbol: "√○", meaning: "Machining prohibited (as-cast, as-forged)" },
        anyProcess: { symbol: "√~", meaning: "Any manufacturing process permitted" },
        materialRemoval: { symbol: "√M", meaning: "Material removal required" },
        noRemoval: { symbol: "√N", meaning: "No material removal" }
    },
    // Ra (Roughness Average) values in micrometers and micro-inches
    raValues: {
        // N-grade to Ra conversion (ISO 1302)
        N1:  { ra_um: 0.025, ra_uin: 1,   process: "Superfinishing, lapping" },
        N2:  { ra_um: 0.05,  ra_uin: 2,   process: "Superfinishing, honing" },
        N3:  { ra_um: 0.1,   ra_uin: 4,   process: "Honing, polishing" },
        N4:  { ra_um: 0.2,   ra_uin: 8,   process: "Grinding, honing" },
        N5:  { ra_um: 0.4,   ra_uin: 16,  process: "Grinding" },
        N6:  { ra_um: 0.8,   ra_uin: 32,  process: "Finish turning, finish milling" },
        N7:  { ra_um: 1.6,   ra_uin: 63,  process: "Turning, milling" },
        N8:  { ra_um: 3.2,   ra_uin: 125, process: "Milling, turning" },
        N9:  { ra_um: 6.3,   ra_uin: 250, process: "Rough milling, shaping" },
        N10: { ra_um: 12.5,  ra_uin: 500, process: "Rough machining, sawing" },
        N11: { ra_um: 25.0,  ra_uin: 1000, process: "Rough machining" },
        N12: { ra_um: 50.0,  ra_uin: 2000, process: "Sand casting, forging" }
    },
    // Common Ra values by application
    applicationGuide: {
        bearing: { ra_um: 0.2, ra_uin: 8, grade: "N4" },
        seal: { ra_um: 0.4, ra_uin: 16, grade: "N5" },
        slideways: { ra_um: 0.8, ra_uin: 32, grade: "N6" },
        generalMachined: { ra_um: 1.6, ra_uin: 63, grade: "N7" },
        roughMachined: { ra_um: 3.2, ra_uin: 125, grade: "N8" },
        castSurface: { ra_um: 12.5, ra_uin: 500, grade: "N10" }
    },
    // Rz to Ra approximate conversion
    rzToRa: {
        factor: 4,  // Rz ≈ 4 × Ra (approximate)
        formula: "Ra ≈ Rz / 4",
        convert: function(rz) { return rz / 4; }
    },
    // Parse surface finish callout
    parseCallout: function(callout) {
        const result = {
            raw: callout,
            parameter: null,
            value: null,
            unit: null,
            grade: null,
            process: null,
            direction: null
        };
        // Ra value: Ra 1.6 or Ra1.6
        const raMatch = callout.match(/Ra\s*([0-9]+\.?[0-9]*)\s*(μm|um|µin|uin)?/i);
        if (raMatch) {
            result.parameter = "Ra";
            result.value = parseFloat(raMatch[1]);
            result.unit = raMatch[2] || "μm";
            result.grade = this.findGrade(result.value, result.unit);
            return result;
        }
        // Rz value
        const rzMatch = callout.match(/Rz\s*([0-9]+\.?[0-9]*)\s*(μm|um)?/i);
        if (rzMatch) {
            result.parameter = "Rz";
            result.value = parseFloat(rzMatch[1]);
            result.unit = rzMatch[2] || "μm";
            result.raEquivalent = this.rzToRa.convert(result.value);
            return result;
        }
        // N-grade: N6, N7, etc.
        const nMatch = callout.match(/N([0-9]+)/);
        if (nMatch) {
            const grade = `N${nMatch[1]}`;
            if (this.raValues[grade]) {
                result.parameter = "Ra";
                result.grade = grade;
                result.value = this.raValues[grade].ra_um;
                result.unit = "μm";
                result.process = this.raValues[grade].process;
            }
            return result;
        }
        // Micro-inch value: 32 µin or 32 uin
        const uinMatch = callout.match(/([0-9]+)\s*(µin|uin|μin)/i);
        if (uinMatch) {
            result.parameter = "Ra";
            result.value = parseInt(uinMatch[1]);
            result.unit = "μin";
            result.value_um = result.value * 0.0254;
            result.grade = this.findGrade(result.value, "μin");
            return result;
        }
        return result;
    },
    // Find N-grade from Ra value
    findGrade: function(value, unit) {
        const targetUm = unit === "μin" || unit === "uin" ? value * 0.0254 : value;

        let closest = null;
        let minDiff = Infinity;

        for (const [grade, data] of Object.entries(this.raValues)) {
            const diff = Math.abs(data.ra_um - targetUm);
            if (diff < minDiff) {
                minDiff = diff;
                closest = grade;
            }
        }
        return closest;
    },
    // Convert between units
    convert: function(value, fromUnit, toUnit) {
        const conversions = {
            "μm_to_μin": (v) => v / 0.0254,
            "μin_to_μm": (v) => v * 0.0254,
            "Ra_to_Rz": (v) => v * 4,
            "Rz_to_Ra": (v) => v / 4
        };
        const key = `${fromUnit}_to_${toUnit}`;
        if (conversions[key]) {
            return conversions[key](value);
        }
        return value;
    },
    // Get recommended process for target finish
    getRecommendedProcess: function(targetRa_um) {
        for (const [grade, data] of Object.entries(this.raValues)) {
            if (data.ra_um >= targetRa_um) {
                return {
                    grade,
                    achievableRa: data.ra_um,
                    process: data.process
                };
            }
        }
        return null;
    }
};
// 4.6 TOLERANCE STACK-UP CALCULATOR
// Worst-case and statistical tolerance analysis

const PRISM_TOLERANCE_STACKUP_ENGINE = {
    version: "1.0",

    // Worst-case analysis (arithmetic)
    worstCase: {
        description: "Sum of all individual tolerances - 100% parts will be within limits",

        calculate: function(dimensions) {
            let nominalTotal = 0;
            let toleranceTotal = 0;

            for (const dim of dimensions) {
                nominalTotal += dim.nominal * (dim.direction === 'subtract' ? -1 : 1);
                toleranceTotal += Math.abs(dim.plusTol) + Math.abs(dim.minusTol);
            }
            return {
                method: "Worst Case",
                nominal: nominalTotal,
                totalTolerance: toleranceTotal / 2,
                max: nominalTotal + toleranceTotal / 2,
                min: nominalTotal - toleranceTotal / 2,
                cpk: null,
                probability: 1.0
            };
        }
    },
    // RSS (Root Sum Square) analysis
    rss: {
        description: "Statistical combination - approximately 99.73% within limits (3σ)",

        calculate: function(dimensions) {
            let nominalTotal = 0;
            let sumOfSquares = 0;

            for (const dim of dimensions) {
                nominalTotal += dim.nominal * (dim.direction === 'subtract' ? -1 : 1);
                const tolerance = (Math.abs(dim.plusTol) + Math.abs(dim.minusTol)) / 2;
                sumOfSquares += tolerance * tolerance;
            }
            const rssTolerance = Math.sqrt(sumOfSquares);

            return {
                method: "RSS (Root Sum Square)",
                nominal: nominalTotal,
                totalTolerance: rssTolerance,
                max: nominalTotal + rssTolerance,
                min: nominalTotal - rssTolerance,
                sigma: 3,
                probability: 0.9973
            };
        }
    },
    // Monte Carlo simulation
    monteCarlo: {
        description: "Statistical simulation with specified number of iterations",

        simulate: function(dimensions, iterations = 10000) {
            const results = [];

            for (let i = 0; i < iterations; i++) {
                let total = 0;

                for (const dim of dimensions) {
                    // Generate random value within tolerance (normal distribution)
                    const tolerance = (Math.abs(dim.plusTol) + Math.abs(dim.minusTol)) / 2;
                    const randomValue = this.normalRandom(dim.nominal, tolerance / 3);
                    total += randomValue * (dim.direction === 'subtract' ? -1 : 1);
                }
                results.push(total);
            }
            // Calculate statistics
            const mean = results.reduce((a, b) => a + b, 0) / results.length;
            const variance = results.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / results.length;
            const stdDev = Math.sqrt(variance);

            results.sort((a, b) => a - b);

            return {
                method: "Monte Carlo",
                iterations,
                mean,
                stdDev,
                min: results[0],
                max: results[results.length - 1],
                percentile_0_135: results[Math.floor(iterations * 0.00135)],
                percentile_99_865: results[Math.floor(iterations * 0.99865)],
                median: results[Math.floor(iterations / 2)]
            };
        },
        // Box-Muller transform for normal distribution
        normalRandom: function(mean, stdDev) {
            const u1 = Math.random();
            const u2 = Math.random();
            const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            return z0 * stdDev + mean;
        }
    },
    // Create tolerance loop
    createToleranceLoop: function(dimensions) {
        return {
            dimensions: dimensions,

            analyze: function(method = 'all') {
                const results = {};

                if (method === 'all' || method === 'worstCase') {
                    results.worstCase = PRISM_TOLERANCE_STACKUP_ENGINE.worstCase.calculate(this.dimensions);
                }
                if (method === 'all' || method === 'rss') {
                    results.rss = PRISM_TOLERANCE_STACKUP_ENGINE.rss.calculate(this.dimensions);
                }
                if (method === 'all' || method === 'monteCarlo') {
                    results.monteCarlo = PRISM_TOLERANCE_STACKUP_ENGINE.monteCarlo.simulate(this.dimensions);
                }
                return results;
            },
            addDimension: function(dim) {
                this.dimensions.push(dim);
                return this;
            }
        };
    },
    // Quick stack-up example
    example: function() {
        const dims = [
            { name: "Part A", nominal: 25.0, plusTol: 0.1, minusTol: -0.1, direction: 'add' },
            { name: "Part B", nominal: 10.0, plusTol: 0.05, minusTol: -0.05, direction: 'add' },
            { name: "Part C", nominal: 5.0, plusTol: 0.02, minusTol: -0.02, direction: 'subtract' }
        ];

        const loop = this.createToleranceLoop(dims);
        return loop.analyze('all');
    }
};
// Log batch 4 integration
console.log("="*60);
console.log("PRISM v8.87.001 - BATCH 4 PRINT READING ENHANCEMENT LOADED");
console.log("="*60);
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log("Components loaded:");
console.log("  • PRISM_MULTI_VIEW_CORRELATION_ENGINE: View correlation & 3D building");
console.log("  • PRISM_ENHANCED_DIMENSION_EXTRACTION: Chain/baseline/ordinate dims");
console.log("  • PRISM_GDT_FCF_PARSER: Feature Control Frame parsing v2.0");
console.log("  • PRISM_THREAD_STANDARD_DATABASE: ISO, Unified, NPT, BSPT threads");
console.log("  • PRISM_SURFACE_FINISH_DATABASE: Ra, Rz, N-grade conversion");
console.log("  • PRISM_TOLERANCE_STACKUP_ENGINE: WC, RSS, Monte Carlo analysis");
console.log("="*60);

// BATCH 6: CAM STRATEGY REFINEMENT - PRISM v8.87.001

// PRISM v8.87.001 - BATCH 6: CAM STRATEGY REFINEMENT
// Enhanced machining strategies, toolpath optimization, linking moves

// 6.1 INTELLIGENT REST MACHINING ENGINE
// Detects rest material and plans efficient cleanup operations

const PRISM_INTELLIGENT_REST_MACHINING = {
    version: "1.0",

    // Rest material detection methods
    detectionMethods: {
        stockModel: {
            name: "Stock Model Comparison",
            description: "Compare current stock to target geometry",
            accuracy: "high",
            computeTime: "medium",
            method: function(stockGeometry, targetGeometry, tolerance) {
                return {
                    restVolume: this.calculateRestVolume(stockGeometry, targetGeometry),
                    restRegions: this.identifyRestRegions(stockGeometry, targetGeometry, tolerance),
                    corners: this.findInternalCorners(targetGeometry),
                    fillets: this.findFilletAreas(targetGeometry)
                };
            }
        },
        previousToolpath: {
            name: "Previous Toolpath Analysis",
            description: "Analyze unmachined areas from previous operations",
            accuracy: "medium",
            computeTime: "fast",
            method: function(previousToolpaths, toolDiameter) {
                const unmachinedAreas = [];
                // Find areas where tool couldn't reach
                for (const tp of previousToolpaths) {
                    const reachLimit = tp.toolDiameter / 2;
                    unmachinedAreas.push({
                        cornerRadius: reachLimit,
                        depth: tp.depth,
                        location: tp.unreachableAreas
                    });
                }
                return unmachinedAreas;
            }
        },
        ipw: {
            name: "In-Process Workpiece",
            description: "Track actual material removal through operations",
            accuracy: "highest",
            computeTime: "slow",
            requiresSimulation: true
        }
    }