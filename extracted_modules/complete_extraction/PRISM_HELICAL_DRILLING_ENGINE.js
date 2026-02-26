const PRISM_HELICAL_DRILLING_ENGINE = {
  version: '1.0.0',

  // HELICAL INTERPOLATION PARAMETERS

  helicalParams: {
    // Maximum helix angle recommendations by material
    maxHelixAngle: {
      aluminum: 5.0,      // degrees
      steel_mild: 3.0,
      steel_alloy: 2.5,
      stainless: 2.0,
      titanium: 1.5,
      inconel: 1.0,
      cast_iron: 3.0,
      brass: 4.0,
      copper: 4.0,
      plastic: 6.0
    },
    // Axial depth per revolution (% of diameter)
    axialDepthPercent: {
      roughing: { min: 1.0, max: 3.0 },
      finishing: { min: 0.5, max: 1.5 },
      threadMill: { pitch: 'thread_pitch' }
    }
  },
  calculateHelixAngle(diameter, axialDepthPerRev) {
    // Helix angle = arctan(axial_depth / (π × diameter))
    return Math.atan(axialDepthPerRev / (Math.PI * diameter)) * (180 / Math.PI);
  },
  calculateAxialDepth(diameter, helixAngleDeg) {
    // Axial depth = tan(helix_angle) × π × diameter
    return Math.tan(helixAngleDeg * Math.PI / 180) * Math.PI * diameter;
  },
  // HELICAL RAMPING FOR POCKETING

  generateHelicalRamp(params) {
    const {
      startX, startY, startZ,
      targetZ,
      rampDiameter,
      toolDiameter,
      material = 'steel_mild',
      isClimb = true
    } = params;

    const maxAngle = this.helicalParams.maxHelixAngle[material] || 2.5;
    const axialPerRev = this.calculateAxialDepth(rampDiameter, maxAngle);
    const totalDepth = startZ - targetZ;
    const numRevolutions = Math.ceil(totalDepth / axialPerRev);

    const helixRadius = (rampDiameter - toolDiameter) / 2;
    const direction = isClimb ? 'G3' : 'G2';

    let gcode = [];
    gcode.push(`(Helical Ramp Entry)`);
    gcode.push(`(Ramp Diameter: ${rampDiameter}, Helix Angle: ${maxAngle.toFixed(1)}°)`);
    gcode.push(`G0 X${startX} Y${startY}`);
    gcode.push(`G0 Z${(startZ + 0.1).toFixed(4)}`);
    gcode.push(`G1 X${(startX + helixRadius).toFixed(4)} Y${startY} Z${startZ.toFixed(4)} F20.0`);

    let currentZ = startZ;
    for (let rev = 0; rev < numRevolutions && currentZ > targetZ; rev++) {
      currentZ = Math.max(targetZ, currentZ - axialPerRev);
      gcode.push(`${direction} X${(startX + helixRadius).toFixed(4)} Y${startY} Z${currentZ.toFixed(4)} I${(-helixRadius).toFixed(4)} J0`);
    }
    // Final cleanup circle at depth
    gcode.push(`${direction} X${(startX + helixRadius).toFixed(4)} Y${startY} I${(-helixRadius).toFixed(4)} J0 (Cleanup)`);
    gcode.push(`G1 X${startX} Y${startY}`);

    return {
      gcode: gcode.join('\n'),
      revolutions: numRevolutions,
      helixAngle: maxAngle,
      axialPerRev: axialPerRev
    };
  },
  // DEEP HOLE DRILLING STRATEGIES

  deepHoleDrilling: {
    // Standard peck drilling (G83)
    standardPeck: {
      name: 'Standard Peck Drilling',
      gcode: 'G83',
      description: 'Full retract between pecks',
      applications: ['Deep holes', 'Difficult materials', 'Poor chip evacuation'],
      parameters: {
        peckDepth: 'Q - Peck depth per pass',
        retractPlane: 'R - Rapid retract plane',
        feedRate: 'F - Cutting feed rate',
        finalDepth: 'Z - Final hole depth'
      },
      recommendations: {
        aluminum: { peckRatio: 3.0, description: '3x diameter per peck' },
        steel_mild: { peckRatio: 1.5, description: '1.5x diameter per peck' },
        steel_alloy: { peckRatio: 1.0, description: '1x diameter per peck' },
        stainless: { peckRatio: 0.75, description: '0.75x diameter per peck' },
        titanium: { peckRatio: 0.5, description: '0.5x diameter per peck' },
        cast_iron: { peckRatio: 2.0, description: '2x diameter per peck' }
      }
    },
    // High-speed peck drilling (G73)
    chipBreak: {
      name: 'Chip Break Drilling',
      gcode: 'G73',
      description: 'Partial retract for chip breaking',
      applications: ['Stringy materials', 'Moderate depth', 'Faster cycle time'],
      parameters: {
        peckDepth: 'Q - Peck depth per pass',
        retractAmount: 'Typically 0.010-0.030 inch',
        feedRate: 'F - Cutting feed rate'
      },
      recommendations: {
        aluminum: { peckRatio: 5.0, retract: 0.030 },
        steel_mild: { peckRatio: 3.0, retract: 0.020 },
        steel_alloy: { peckRatio: 2.0, retract: 0.015 },
        stainless: { peckRatio: 1.5, retract: 0.010 }
      }
    },
    // Gun drilling
    gunDrilling: {
      name: 'Gun Drilling',
      description: 'Single-flute drill with through-coolant',
      applications: ['Very deep holes (20:1+)', 'Precision holes', 'Straight holes'],
      parameters: {
        coolantPressure: '500-1500 PSI recommended',
        feedRate: 'Lower than standard drilling',
        rpm: 'Higher than standard drilling'
      },
      depthCapability: '100:1 depth to diameter ratio'
    },
    // BTA drilling
    btaDrilling: {
      name: 'BTA (Boring and Trepanning Association) Drilling',
      description: 'External coolant supply, internal chip evacuation',
      applications: ['Large diameter deep holes', 'Production environments'],
      minDiameter: 0.75 // inches
    }
  },
  generatePeckDrillCycle(params) {
    const {
      x, y,
      startZ,
      finalZ,
      retractZ,
      drillDiameter,
      material = 'steel_mild',
      cycleType = 'G83',
      coolant = true
    } = params;

    const strategy = cycleType === 'G73' ? this.deepHoleDrilling.chipBreak : this.deepHoleDrilling.standardPeck;
    const rec = strategy.recommendations[material] || strategy.recommendations.steel_mild;
    const peckDepth = drillDiameter * rec.peckRatio;

    let gcode = [];
    gcode.push(`(Deep Hole: ${drillDiameter}" dia, ${Math.abs(finalZ - startZ).toFixed(3)}" deep)`);
    gcode.push(`(Strategy: ${strategy.name}, Peck: ${peckDepth.toFixed(4)})`);

    if (coolant) gcode.push('M8 (Coolant ON)');

    gcode.push(`${cycleType} X${x.toFixed(4)} Y${y.toFixed(4)} Z${finalZ.toFixed(4)} R${retractZ.toFixed(4)} Q${peckDepth.toFixed(4)} F${this._calculateDrillFeed(drillDiameter, material).toFixed(1)}`);
    gcode.push('G80 (Cancel canned cycle)');

    if (coolant) gcode.push('M9 (Coolant OFF)');

    return gcode.join('\n');
  },
  _calculateDrillFeed(diameter, material) {
    const feedPerRev = {
      aluminum: 0.006,
      steel_mild: 0.004,
      steel_alloy: 0.003,
      stainless: 0.002,
      titanium: 0.0015,
      cast_iron: 0.005
    };
    const fpr = feedPerRev[material] || 0.003;
    // Assume standard surface speed and calculate RPM, then feed
    const sfm = material === 'aluminum' ? 500 : material === 'titanium' ? 50 : 100;
    const rpm = (sfm * 12) / (Math.PI * diameter);
    return rpm * fpr;
  }
}