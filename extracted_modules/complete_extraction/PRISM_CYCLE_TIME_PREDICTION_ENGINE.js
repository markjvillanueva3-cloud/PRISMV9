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
}