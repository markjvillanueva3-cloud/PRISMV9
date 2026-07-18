/**
 * PRISM_UNIFIED_CUTTING_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * References: 26
 * Lines: 327
 * Session: R2.3.1 Engine Gap Extraction
 */

const PRISM_UNIFIED_CUTTING_ENGINE = {
  version: '1.0.0',

  // EXPOSE PRISM_ADVANCED_ROUGHING GLOBALLY

  // Reference to the existing iMachining-style module
  get advancedRoughing() {
    return typeof PRISM_ADVANCED_ROUGHING !== 'undefined' ? PRISM_ADVANCED_ROUGHING :
           typeof PRISM_ADVANCED_ROUGHING_V2 !== 'undefined' ? PRISM_ADVANCED_ROUGHING_V2 : null;
  },
  // UNIFIED CUTTING PARAMETER CALCULATION

  /**
   * MASTER FEED OPTIMIZATION - Uses BOTH systems
   * @param {number} baseFeed - Original programmed feed
   * @param {object} options - All cutting parameters
   * @returns {object} - Complete optimization result
   */
  calculateOptimizedCuttingParams(baseFeed, options = {}) {
    const {
      toolDiameter = 12,
      radialEngagement = 0,       // ae
      axialDepth = 0,             // ap
      material = 'steel_mild',
      machineClass = 'standard',
      segmentLength = null,       // From real-time tracking
      cornerAngle = 180,          // From real-time detection
      baseSpeed = 0,
      operation = 'roughing'
    } = options;

    let optimizedFeed = baseFeed;
    let optimizedSpeed = baseSpeed;
    const adjustments = [];
    const advanced = this.advancedRoughing;

    // 1. CHIP THINNING COMPENSATION (from iMachining)
    if (radialEngagement > 0 && toolDiameter > 0 && advanced) {
      const aeRatio = radialEngagement / toolDiameter;
      const ctFeed = advanced.calculateChipThinningFeed
        ? advanced.calculateChipThinningFeed(baseFeed, radialEngagement, toolDiameter)
        : this._interpolateChipThinning(baseFeed, aeRatio, advanced.CHIP_THINNING);

      if (ctFeed !== baseFeed) {
        const factor = ctFeed / baseFeed;
        optimizedFeed = ctFeed;
        adjustments.push({
          type: 'chipThinning',
          factor: factor,
          aeRatio: aeRatio,
          description: 'ae/D=' + aeRatio.toFixed(2) + ' → ' + (factor * 100).toFixed(0) + '% feed'
        });
      }
    }
    // 2. MATERIAL-SPECIFIC ADJUSTMENT (from iMachining Kc database)
    if (advanced && advanced.MATERIAL_PARAMS && advanced.MATERIAL_PARAMS[material]) {
      const matParams = advanced.MATERIAL_PARAMS[material];

      // Speed adjustment
      if (baseSpeed > 0 && matParams.speedFactor !== 1.0) {
        optimizedSpeed = Math.round(baseSpeed * matParams.speedFactor);
        adjustments.push({
          type: 'materialSpeed',
          factor: matParams.speedFactor,
          material: material,
          kc: matParams.kc,
          description: material + ' (Kc=' + matParams.kc + ') → ' + (matParams.speedFactor * 100).toFixed(0) + '% speed'
        });
      }
      // Feed adjustment
      if (matParams.feedFactor !== 1.0) {
        const prevFeed = optimizedFeed;
        optimizedFeed = Math.round(optimizedFeed * matParams.feedFactor);
        adjustments.push({
          type: 'materialFeed',
          factor: matParams.feedFactor,
          material: material,
          description: material + ' → ' + (matParams.feedFactor * 100).toFixed(0) + '% feed'
        });
      }
    }
    // 3. CORNER DECELERATION (from iMachining + G-force limits)
    if (cornerAngle < 180 && advanced) {
      const gLimits = advanced.GFORCE_LIMITS ?
        (advanced.GFORCE_LIMITS[machineClass] || advanced.GFORCE_LIMITS.standard) :
        { cornerG: 0.35 };

      const cornerFeed = advanced.calculateCornerFeed
        ? advanced.calculateCornerFeed(optimizedFeed, cornerAngle, machineClass)
        : this._interpolateCornerFeed(optimizedFeed, cornerAngle, advanced.CORNER_FACTORS, gLimits);

      if (cornerFeed < optimizedFeed) {
        const factor = cornerFeed / optimizedFeed;
        optimizedFeed = cornerFeed;
        adjustments.push({
          type: 'cornerDecel',
          factor: factor,
          angle: cornerAngle,
          machineClass: machineClass,
          description: cornerAngle.toFixed(0) + '° corner → ' + (factor * 100).toFixed(0) + '% feed'
        });
      }
    }
    // 4. SEGMENT LENGTH OPTIMIZATION (from real-time tracking)
    if (segmentLength !== null && segmentLength < 2.0) {
      // Short segments need feed reduction for control accuracy
      // Machine servo loop needs time to react
      const lengthFactor = Math.max(0.4, Math.sqrt(segmentLength / 2));
      const prevFeed = optimizedFeed;
      optimizedFeed = Math.round(optimizedFeed * lengthFactor);
      adjustments.push({
        type: 'segmentLength',
        factor: lengthFactor,
        length: segmentLength,
        description: segmentLength.toFixed(2) + 'mm segment → ' + (lengthFactor * 100).toFixed(0) + '% feed'
      });
    }
    // 5. DEPTH-BASED ADJUSTMENT (heavy cuts need reduction)
    if (axialDepth > toolDiameter * 1.5) {
      const depthRatio = axialDepth / toolDiameter;
      const depthFactor = Math.max(0.6, 1 - (depthRatio - 1.5) / 4);
      const prevFeed = optimizedFeed;
      optimizedFeed = Math.round(optimizedFeed * depthFactor);
      adjustments.push({
        type: 'depthReduction',
        factor: depthFactor,
        depthRatio: depthRatio,
        description: 'ap/D=' + depthRatio.toFixed(1) + ' → ' + (depthFactor * 100).toFixed(0) + '% feed'
      });
    }
    // 6. CALCULATE CUTTING FORCES & MRR
    let mrr = 0;
    let cuttingForce = 0;
    let power = 0;

    if (advanced && advanced.MATERIAL_PARAMS && advanced.MATERIAL_PARAMS[material]) {
      const kc = advanced.MATERIAL_PARAMS[material].kc;

      // MRR = ae × ap × f (mm³/min)
      mrr = radialEngagement * axialDepth * optimizedFeed;

      // Cutting force Fc = kc × chip area
      const fz = optimizedFeed / (optimizedSpeed > 0 ? optimizedSpeed : 1000) * toolDiameter; // Rough estimate
      const chipArea = fz * axialDepth;
      cuttingForce = kc * chipArea;

      // Power P = Fc × Vc / 60000 (kW)
      const vc = Math.PI * toolDiameter * optimizedSpeed / 1000; // m/min
      power = cuttingForce * vc / 60000;
    }
    // 7. GET RAMP & HELIX ANGLES
    let rampAngle = 3;
    let helixAngle = 2;

    if (advanced && advanced.MATERIAL_PARAMS && advanced.MATERIAL_PARAMS[material]) {
      rampAngle = advanced.MATERIAL_PARAMS[material].rampAngle;
      helixAngle = advanced.MATERIAL_PARAMS[material].helixAngle;
    }
    // RETURN COMPLETE RESULT
    return {
      // Primary outputs
      originalFeed: baseFeed,
      optimizedFeed: Math.round(optimizedFeed),
      originalSpeed: baseSpeed,
      optimizedSpeed: Math.round(optimizedSpeed),

      // Adjustment breakdown
      adjustments: adjustments,
      totalFeedFactor: optimizedFeed / baseFeed,
      totalSpeedFactor: baseSpeed > 0 ? optimizedSpeed / baseSpeed : 1,

      // Cutting mechanics
      mrr: Math.round(mrr),
      cuttingForce: Math.round(cuttingForce),
      power: power.toFixed(2),

      // Entry parameters
      rampAngle: rampAngle,
      helixAngle: helixAngle,

      // Machine recommendations
      machineClass: machineClass,
      gforceLimits: advanced?.GFORCE_LIMITS?.[machineClass] || { accel: 0.5, jerk: 35, cornerG: 0.35 },

      // Summary string for post comment
      summary: this._generateSummary(adjustments)
    };
  },
  /**
   * Interpolate chip thinning from table
   */
  _interpolateChipThinning(baseFeed, aeRatio, table) {
    if (!table) return baseFeed;

    const ratios = Object.keys(table).map(Number).sort((a, b) => a - b);

    if (aeRatio <= ratios[0]) return Math.round(baseFeed * table[ratios[0]]);
    if (aeRatio >= ratios[ratios.length - 1]) return Math.round(baseFeed * table[ratios[ratios.length - 1]]);

    for (let i = 0; i < ratios.length - 1; i++) {
      if (aeRatio >= ratios[i] && aeRatio <= ratios[i + 1]) {
        const t = (aeRatio - ratios[i]) / (ratios[i + 1] - ratios[i]);
        const factor = table[ratios[i]] * (1 - t) + table[ratios[i + 1]] * t;
        return Math.round(baseFeed * factor);
      }
    }
    return baseFeed;
  },
  /**
   * Interpolate corner feed from table
   */
  _interpolateCornerFeed(baseFeed, angle, table, gLimits) {
    if (!table) return baseFeed;

    const angles = Object.keys(table).map(Number).sort((a, b) => b - a);
    let factor = 1.0;

    for (const a of angles) {
      if (angle <= a) {
        factor = table[a];
      }
    }
    // Adjust for machine G-force capability
    if (gLimits && gLimits.cornerG) {
      factor *= (gLimits.cornerG / 0.35);
      factor = Math.min(factor, 1.0);
    }
    return Math.round(baseFeed * factor);
  },
  /**
   * Generate summary string
   */
  _generateSummary(adjustments) {
    if (adjustments.length === 0) return '';

    const parts = adjustments.map(a => {
      switch (a.type) {
        case 'chipThinning': return 'CT:' + (a.factor * 100).toFixed(0) + '%';
        case 'cornerDecel': return 'CR:' + (a.factor * 100).toFixed(0) + '%';
        case 'segmentLength': return 'SL:' + (a.factor * 100).toFixed(0) + '%';
        case 'materialFeed': return 'MF:' + (a.factor * 100).toFixed(0) + '%';
        case 'depthReduction': return 'DP:' + (a.factor * 100).toFixed(0) + '%';
        default: return '';
      }
    }).filter(p => p);

    return parts.join(' ');
  },
  // DIRECT ACCESS TO iMachining DATA

  getMaterialParams(material) {
    const adv = this.advancedRoughing;
    if (adv && adv.MATERIAL_PARAMS) {
      return adv.MATERIAL_PARAMS[material] || adv.MATERIAL_PARAMS.steel_mild;
    }
    return { kc: 1800, speedFactor: 1.0, feedFactor: 1.0, rampAngle: 3, helixAngle: 2 };
  },
  getGForceLimits(machineClass) {
    const adv = this.advancedRoughing;
    if (adv && adv.GFORCE_LIMITS) {
      return adv.GFORCE_LIMITS[machineClass] || adv.GFORCE_LIMITS.standard;
    }
    return { accel: 0.5, jerk: 35, cornerG: 0.35 };
  },
  getChipThinningTable() {
    const adv = this.advancedRoughing;
    return adv?.CHIP_THINNING || {};
  },
  getCornerFactors() {
    const adv = this.advancedRoughing;
    return adv?.CORNER_FACTORS || {};
  },
  getAllMaterials() {
    const adv = this.advancedRoughing;
    return adv?.MATERIAL_PARAMS ? Object.keys(adv.MATERIAL_PARAMS) : [];
  },
  // COMPARISON: Which system is better?

  compareOptimizers() {
    return {
      'PRISM_ADVANCED_ROUGHING (iMachining-style)': {
        strengths: [
          'Material Kc (specific cutting force) database - 20+ materials',
          'Ramp and helix entry angles per material',
          'G-force limits by machine class (economy to ultraHighSpeed)',
          'Speed factors and feed factors from machining science',
          'Cutting force and power calculations'
        ],
        weaknesses: [
          'Static calculations - no real-time path awareness',
          'Cannot see actual segment lengths during output',
          'No corner detection during G-code generation'
        ]
      },
      'PRISM_POST_INTEGRATION (Real-time)': {
        strengths: [
          'Real-time segment length tracking',
          'Corner detection from path analysis',
          'Arc length calculation for G2/G3',
          'Dynamic feed adjustment per move',
          'SSV (variable spindle speed) integration'
        ],
        weaknesses: [
          'Simpler material database (just feed factors)',
          'No Kc values for cutting force calculation',
          'No ramp/helix angle recommendations'
        ]
      },
      'PRISM_UNIFIED_CUTTING_ENGINE (MERGED)': {
        strengths: [
          '✓ Material Kc database + speed/feed factors',
          '✓ G-force limits by machine class',
          '✓ Real-time segment length tracking',
          '✓ Real-time corner detection',
          '✓ Arc length optimization',
          '✓ Ramp and helix angle recommendations',
          '✓ Cutting force and power calculations',
          '✓ MRR (material removal rate) tracking',
          '✓ Complete adjustment breakdown'
        ],
        weaknesses: [
          'None - it combines both systems!'
        ]
      }
    };
  }
}