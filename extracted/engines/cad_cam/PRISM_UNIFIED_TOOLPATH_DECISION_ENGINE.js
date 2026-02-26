/**
 * PRISM_UNIFIED_TOOLPATH_DECISION_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * References: 36
 * Lines: 340
 * Session: R2.3.1 Engine Gap Extraction
 */

const PRISM_UNIFIED_TOOLPATH_DECISION_ENGINE = {
  version: '1.0.0',

  // Decision factors and weights
  decisionFactors: {
    feature: {
      weight: 0.25,
      factors: ['type', 'geometry', 'tolerance', 'surface_finish']
    },
    material: {
      weight: 0.20,
      factors: ['machinability', 'hardness', 'chip_formation', 'heat_sensitivity']
    },
    machine: {
      weight: 0.20,
      factors: ['type', 'rigidity', 'accuracy', 'spindle_power']
    },
    tool: {
      weight: 0.15,
      factors: ['type', 'material', 'coating', 'geometry']
    },
    productivity: {
      weight: 0.10,
      factors: ['cycle_time', 'tool_life', 'setup_time']
    },
    quality: {
      weight: 0.10,
      factors: ['surface_finish', 'dimensional_accuracy', 'repeatability']
    }
  },
  // Strategy database per machine type
  strategyDatabase: {
    '3AXIS': {
      roughing: ['adaptive_clearing', 'volumill', 'trochoidal', 'conventional_roughing'],
      semi_finishing: ['waterline', 'parallel', 'rest_machining'],
      finishing: ['parallel_finish', 'scallop', 'pencil', 'waterline_finish'],
      holes: ['drilling', 'peck_drilling', 'helical_boring', 'circle_milling']
    },
    '4AXIS': {
      wrapped: ['wrapped_roughing', 'wrapped_finishing', 'helical_milling'],
      indexed: ['indexed_3plus1', 'rotary_facing'],
      continuous: ['continuous_4axis', 'barrel_milling']
    },
    '5AXIS': {
      simultaneous: ['swarf', 'flowline', 'multi_axis_contour', 'geodesic'],
      positional: ['3plus2_roughing', '3plus2_finishing'],
      specialized: ['blisk', 'impeller', 'turbine_blade', 'port_finishing']
    },
    'LATHE': {
      roughing: ['rough_turn_od', 'rough_turn_id', 'rough_facing'],
      finishing: ['finish_turn_od', 'finish_turn_id', 'finish_facing'],
      specialty: ['grooving', 'threading', 'parting', 'drilling']
    },
    'LATHE_LIVE': {
      milling: ['c_axis_milling', 'y_axis_milling', 'cross_milling'],
      drilling: ['axial_drilling', 'cross_drilling', 'cross_tapping'],
      specialty: ['polygon_turning', 'keyway', 'hex_milling']
    },
    'MILL_TURN': {
      turning: ['rough_turn', 'finish_turn', 'grooving', 'threading'],
      milling: ['b_axis_milling', 'c_axis_milling', 'y_axis_milling'],
      transfer: ['main_spindle', 'sub_spindle', 'transfer_operations'],
      combined: ['turn_mill_roughing', 'simultaneous_operations']
    }
  },
  // UNIFIED DECISION ENGINE

  selectOptimalStrategy(params) {
    const {
      feature = {},
      material = {},
      machine = {},
      tool = {},
      requirements = {}
    } = params;

    const decision = {
      strategies: [],
      primaryStrategy: null,
      reasoning: [],
      confidence: 0,
      parameters: {}
    };
    // Determine machine type
    const machineType = this._getMachineType(machine);

    // Get applicable strategies
    const applicableStrategies = this._getApplicableStrategies(machineType, feature);

    // Score each strategy
    const scoredStrategies = [];
    for (const strategy of applicableStrategies) {
      const score = this._scoreStrategy(strategy, {
        feature, material, machine, tool, requirements
      });
      scoredStrategies.push({ strategy, ...score });
    }
    // Sort by score
    scoredStrategies.sort((a, b) => b.score - a.score);

    // Take top strategies
    decision.strategies = scoredStrategies.slice(0, 5);
    decision.primaryStrategy = scoredStrategies[0]?.strategy || null;

    // Build reasoning
    if (scoredStrategies[0]) {
      decision.reasoning = scoredStrategies[0].reasoning;
      decision.confidence = scoredStrategies[0].score;
      decision.parameters = this._getOptimalParameters(
        decision.primaryStrategy,
        { feature, material, machine, tool }
      );
    }
    return decision;
  },
  _getMachineType(machine) {
    const type = (machine.type || '').toUpperCase();

    if (type.includes('MILL_TURN') || type.includes('MILLTURN')) {
      return 'MILL_TURN';
    } else if (type.includes('LIVE') || (type.includes('LATHE') && machine.hasLiveTooling)) {
      return 'LATHE_LIVE';
    } else if (type.includes('LATHE') || type.includes('TURN')) {
      return 'LATHE';
    } else if (type.includes('5AXIS') || type.includes('5-AXIS')) {
      return '5AXIS';
    } else if (type.includes('4AXIS') || type.includes('4-AXIS')) {
      return '4AXIS';
    }
    return '3AXIS';
  },
  _getApplicableStrategies(machineType, feature) {
    const strategies = [];
    const typeStrategies = this.strategyDatabase[machineType] || this.strategyDatabase['3AXIS'];

    const featureType = (feature.type || '').toLowerCase();
    const operationType = feature.operationType || 'roughing';

    // Get strategies for operation type
    if (typeStrategies[operationType]) {
      strategies.push(...typeStrategies[operationType]);
    }
    // Add feature-specific strategies
    if (featureType.includes('hole')) {
      strategies.push(...(typeStrategies.holes || typeStrategies.drilling || []));
    } else if (featureType.includes('thread')) {
      strategies.push('threading');
    } else if (featureType.includes('groove')) {
      strategies.push('grooving');
    }
    // Remove duplicates
    return [...new Set(strategies)];
  },
  _scoreStrategy(strategy, context) {
    let score = 0;
    const reasoning = [];

    const { feature, material, machine, tool, requirements } = context;

    // Feature suitability (25%)
    const featureScore = this._evaluateFeatureSuitability(strategy, feature);
    score += featureScore * this.decisionFactors.feature.weight;
    if (featureScore > 0.7) {
      reasoning.push(`Strategy well-suited for ${feature.type || 'this feature'} geometry`);
    }
    // Material compatibility (20%)
    const materialScore = this._evaluateMaterialCompatibility(strategy, material);
    score += materialScore * this.decisionFactors.material.weight;
    if (materialScore > 0.7) {
      reasoning.push(`Good material compatibility for ${material.name || 'selected material'}`);
    }
    // Machine capability (20%)
    const machineScore = this._evaluateMachineCapability(strategy, machine);
    score += machineScore * this.decisionFactors.machine.weight;
    if (machineScore > 0.7) {
      reasoning.push(`Machine well-suited for ${strategy}`);
    }
    // Tool suitability (15%)
    const toolScore = this._evaluateToolSuitability(strategy, tool);
    score += toolScore * this.decisionFactors.tool.weight;

    // Productivity (10%)
    const productivityScore = this._evaluateProductivity(strategy, requirements);
    score += productivityScore * this.decisionFactors.productivity.weight;
    if (productivityScore > 0.8) {
      reasoning.push('High productivity expected');
    }
    // Quality (10%)
    const qualityScore = this._evaluateQuality(strategy, requirements);
    score += qualityScore * this.decisionFactors.quality.weight;
    if (qualityScore > 0.8 && requirements.surfaceFinish) {
      reasoning.push(`Expected surface finish: Ra ${requirements.surfaceFinish}µm`);
    }
    return { score, reasoning };
  },
  _evaluateFeatureSuitability(strategy, feature) {
    const suitabilityMap = {
      pocket: { adaptive_clearing: 0.95, trochoidal: 0.85, conventional_roughing: 0.70 },
      hole: { drilling: 0.95, peck_drilling: 0.90, helical_boring: 0.80 },
      slot: { trochoidal: 0.90, adaptive_clearing: 0.85, conventional_roughing: 0.70 },
      contour: { parallel_finish: 0.90, waterline: 0.85, scallop: 0.80 },
      surface: { scallop: 0.90, parallel_finish: 0.85, waterline: 0.80 },
      thread: { threading: 0.95, thread_milling: 0.85 },
      groove: { grooving: 0.95 },
      turn_od: { rough_turn_od: 0.95, finish_turn_od: 0.90 },
      turn_id: { rough_turn_id: 0.95, finish_turn_id: 0.90 }
    };
    const featureType = (feature.type || '').toLowerCase();
    const map = suitabilityMap[featureType] || {};

    return map[strategy] || 0.5;
  },
  _evaluateMaterialCompatibility(strategy, material) {
    const machinability = material.machinability || 50;
    const hardness = material.hardness || 200;

    // High speed strategies better for high machinability
    const hsmStrategies = ['adaptive_clearing', 'trochoidal', 'volumill'];
    if (hsmStrategies.includes(strategy)) {
      return machinability > 60 ? 0.9 : machinability > 40 ? 0.7 : 0.5;
    }
    // Conventional better for hard materials
    if (strategy.includes('conventional')) {
      return hardness > 400 ? 0.8 : 0.6;
    }
    return 0.7;
  },
  _evaluateMachineCapability(strategy, machine) {
    const rigidity = machine.rigidity || 0.7;
    const spindleRPM = machine.spindleMax || 8000;
    const accuracy = machine.accuracy || 0.01;

    // HSM needs high rigidity and speed
    const hsmStrategies = ['adaptive_clearing', 'trochoidal'];
    if (hsmStrategies.includes(strategy)) {
      if (rigidity > 0.8 && spindleRPM > 10000) return 0.95;
      if (rigidity > 0.6 && spindleRPM > 6000) return 0.75;
      return 0.55;
    }
    // Finishing needs accuracy
    if (strategy.includes('finish')) {
      return accuracy < 0.005 ? 0.95 : accuracy < 0.01 ? 0.80 : 0.60;
    }
    return 0.75;
  },
  _evaluateToolSuitability(strategy, tool) {
    const toolType = (tool.type || '').toLowerCase();

    // Match strategy to tool type
    const matches = {
      drilling: toolType.includes('drill'),
      threading: toolType.includes('tap') || toolType.includes('thread'),
      grooving: toolType.includes('groove'),
      adaptive_clearing: toolType.includes('endmill'),
      scallop: toolType.includes('ball'),
      waterline: toolType.includes('ball') || toolType.includes('bull')
    };
    if (matches[strategy]) return 0.95;
    if (toolType.includes('endmill')) return 0.75;

    return 0.6;
  },
  _evaluateProductivity(strategy, requirements) {
    const prioritizeCycleTime = requirements.prioritizeCycleTime || false;

    const productivityScores = {
      adaptive_clearing: 0.95,
      volumill: 0.92,
      trochoidal: 0.88,
      conventional_roughing: 0.70,
      drilling: 0.90,
      peck_drilling: 0.75
    };
    let score = productivityScores[strategy] || 0.75;

    if (prioritizeCycleTime) {
      score *= 1.1;
    }
    return Math.min(score, 1.0);
  },
  _evaluateQuality(strategy, requirements) {
    const surfaceFinish = requirements.surfaceFinish || 3.2;  // Ra µm
    const tolerance = requirements.tolerance || 0.05;  // mm

    // Fine finish strategies
    if (surfaceFinish < 1.6) {
      const fineStrategies = ['parallel_finish', 'scallop', 'finish_turn_od', 'finish_turn_id'];
      if (fineStrategies.includes(strategy)) return 0.95;
    }
    // Tight tolerance
    if (tolerance < 0.02) {
      const precisionStrategies = ['helical_boring', 'finish_turn_od', 'finish_turn_id'];
      if (precisionStrategies.includes(strategy)) return 0.95;
    }
    return 0.75;
  },
  _getOptimalParameters(strategy, context) {
    const { material, tool } = context;

    // Base parameters
    const params = {
      stepover: 0.4,      // As fraction of tool diameter
      stepdown: 1.0,      // mm
      feedFactor: 1.0,    // Multiplier
      speedFactor: 1.0    // Multiplier
    };
    // Adjust for strategy
    if (strategy === 'adaptive_clearing' || strategy === 'trochoidal') {
      params.stepover = 0.1;  // Lower stepover for HSM
      params.stepdown = 2.0;  // Deeper cuts
      params.feedFactor = 1.5;
    } else if (strategy.includes('finish')) {
      params.stepover = 0.15;
      params.stepdown = 0.3;
      params.feedFactor = 0.8;
      params.speedFactor = 1.1;
    }
    // Adjust for material
    const machinability = material.machinability || 50;
    if (machinability < 30) {
      params.feedFactor *= 0.7;
      params.speedFactor *= 0.6;
    } else if (machinability > 80) {
      params.feedFactor *= 1.2;
      params.speedFactor *= 1.3;
    }
    return params;
  },
  // Get confidence levels by machine type
  getConfidenceByMachineType() {
    return {
      '3AXIS': 0.88,
      '4AXIS': 0.80,
      '5AXIS': 0.82,
      'LATHE': 0.87,
      'LATHE_LIVE': 0.78,
      'MILL_TURN': 0.75
    };
  }
}