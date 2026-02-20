const PRISM_ADVANCED_OPTIMIZATION_ENGINE = {
  version: '1.0.0',

  // 1. STABILITY LOBE DIAGRAM CALCULATOR (Chatter Avoidance)

  stabilityLobe: {
    /**
     * Calculate critical depth of cut for chatter-free machining
     * Based on regenerative chatter theory
     */
    calculateCriticalDepth(params) {
      const {
        naturalFrequency = 800,    // Hz - tool natural frequency
        dampingRatio = 0.03,       // ζ - damping ratio (typical 0.02-0.05)
        stiffness = 5e6,           // N/m - tool stiffness
        kc = 2000,                 // N/mm² - specific cutting force
        radialEngagement = 0.5,    // ae/D ratio
        fluteCount = 4,
        rpm = 10000
      } = params;

      // Tooth passing frequency
      const toothFreq = (rpm * fluteCount) / 60;

      // Phase angle calculation
      const r = toothFreq / naturalFrequency;
      const phase = Math.atan2(2 * dampingRatio * r, 1 - r * r);

      // Average directional factor for milling
      const alpha = this._directionalFactor(radialEngagement);

      // Critical depth of cut
      // blim = -1 / (2 * Ks * Re[G(jω)])
      const realG = (1 - r * r) / ((1 - r * r)**2 + (2 * dampingRatio * r)**2);
      const criticalDepth = -stiffness / (2 * kc * fluteCount * alpha * realG);

      // Find stable pockets (lobes)
      const lobes = this._calculateLobes(naturalFrequency, dampingRatio, stiffness, kc, fluteCount, radialEngagement);

      return {
        criticalDepth: Math.abs(criticalDepth),
        lobes,
        safeRPM: this._findSafeRPM(naturalFrequency, fluteCount, lobes),
        recommendation: Math.abs(criticalDepth) > 3 ?
          'Good stability margin - aggressive cutting possible' :
          'Limited stability - reduce depth or adjust RPM'
      };
    },
    /**
     * Calculate directional factor based on radial engagement
     */
    _directionalFactor(aeRatio) {
      // Approximation for face milling
      const phi = Math.acos(1 - 2 * aeRatio);
      return (1 / Math.PI) * (phi - 0.5 * Math.sin(2 * phi));
    },
    /**
     * Calculate stability lobes
     */
    _calculateLobes(fn, zeta, k, kc, z, ae) {
      const lobes = [];
      const alpha = this._directionalFactor(ae);

      // Calculate first 5 lobes
      for (let n = 0; n < 5; n++) {
        const epsilon = Math.PI - 2 * Math.atan(2 * zeta);
        const omega_c = fn * 2 * Math.PI;

        // Spindle speeds at lobe peaks
        const N_peak = (60 * omega_c) / (z * (2 * n * Math.PI + epsilon));

        // Critical depth at this lobe
        const blim = -k / (2 * kc * z * alpha);

        lobes.push({
          lobeNumber: n,
          rpmPeak: Math.round(N_peak),
          criticalDepth: Math.abs(blim),
          stableRange: {
            min: Math.round(N_peak * 0.85),
            max: Math.round(N_peak * 1.15)
          }
        });
      }
      return lobes;
    },
    /**
     * Find safe RPM values in stable pockets
     */
    _findSafeRPM(fn, z, lobes) {
      const safeZones = [];

      for (const lobe of lobes) {
        if (lobe.rpmPeak > 1000 && lobe.rpmPeak < 30000) {
          safeZones.push({
            rpm: lobe.rpmPeak,
            allowableDepth: lobe.criticalDepth,
            range: lobe.stableRange
          });
        }
      }
      return safeZones.sort((a, b) => b.allowableDepth - a.allowableDepth).slice(0, 3);
    }
  },
  // 2. SURFACE FINISH OPTIMIZATION

  surfaceFinish: {
    /**
     * Calculate optimal stepover for target surface finish (ball endmill)
     */
    calculateOptimalStepover(params) {
      const {
        ballRadius,           // mm - ball endmill radius
        targetRa = 1.6,       // μm - target Ra
        targetScallop = 0.01, // mm - target scallop height
        surfaceAngle = 0,     // degrees - surface inclination
        material = 'steel'
      } = params;

      // Material finish factors
      const materialFactors = {
        aluminum: 0.85,
        steel: 1.0,
        stainless: 1.15,
        titanium: 1.25,
        hardened: 0.9  // Better finish in hardened
      };
      const matFactor = materialFactors[material] || 1.0;

      // Theoretical scallop height: h = stepover² / (8 * R)
      // Solving for stepover: stepover = sqrt(8 * R * h)
      const theoreticalStepover = Math.sqrt(8 * ballRadius * targetScallop);

      // Adjust for surface angle
      const effectiveRadius = ballRadius * Math.cos(surfaceAngle * Math.PI / 180);
      const angleAdjustedStepover = Math.sqrt(8 * effectiveRadius * targetScallop);

      // Convert scallop to Ra (approximate)
      // Ra ≈ scallop height / 4
      const predictedRa = targetScallop * 250; // μm

      // Calculate feed for target finish (turning formula adapted)
      // Ra = f² / (32 * r) → f = sqrt(32 * r * Ra)
      const maxFeedForRa = Math.sqrt(32 * (ballRadius / 1000) * (targetRa / 1000000)) * 1000;

      return {
        optimalStepover: Math.round(angleAdjustedStepover * 1000) / 1000,
        effectiveRadius: Math.round(effectiveRadius * 100) / 100,
        predictedRa: Math.round(predictedRa * 100) / 100,
        predictedScallop: targetScallop,
        maxFeedForFinish: Math.round(maxFeedForRa * 100) / 100,
        materialFactor: matFactor,
        recommendation: predictedRa <= targetRa ?
          'Settings will achieve target finish' :
          'Reduce stepover for better finish'
      };
    },
    /**
     * Calculate scallop height from stepover (inverse)
     */
    calculateScallopHeight(stepover, toolRadius) {
      // h = stepover² / (8 * R)
      return (stepover * stepover) / (8 * toolRadius);
    },
    /**
     * Turning surface finish (Ra) from feed and nose radius
     */
    calculateTurningFinish(feed, noseRadius, options = {}) {
      const { material = 'steel', toolWear = 0, coolant = true } = options;

      // Theoretical: Ra = f² / (32 * r) * 1000 (for μm)
      const theoreticalRa = (feed * feed * 1000) / (32 * noseRadius);

      // Corrections
      const wearFactor = 1 + (toolWear / 100) * 0.5;
      const coolantFactor = coolant ? 0.9 : 1.1;
      const materialFactors = {
        aluminum: 0.8,
        steel: 1.0,
        stainless: 1.2,
        titanium: 1.3
      };
      const matFactor = materialFactors[material] || 1.0;

      const predictedRa = theoreticalRa * wearFactor * coolantFactor * matFactor;

      return {
        theoreticalRa: Math.round(theoreticalRa * 100) / 100,
        predictedRa: Math.round(predictedRa * 100) / 100,
        corrections: { wearFactor, coolantFactor, matFactor }
      };
    },
    /**
     * Get optimal feed for target surface finish (turning)
     */
    getOptimalFeedForFinish(targetRa, noseRadius) {
      // f = sqrt(32 * r * Ra / 1000)
      return Math.sqrt(32 * noseRadius * targetRa / 1000);
    }
  },
  // 3. INTELLIGENT CLIMB VS CONVENTIONAL SELECTION

  climbVsConventional: {
    /**
     * Determine optimal cutting direction
     */
    selectDirection(params) {
      const {
        material = 'steel',
        operation = 'roughing',
        machineType = 'vmcBallscrew',  // vmcBallscrew, vmcLinear, manual
        toolCondition = 'new',          // new, moderate, worn
        wallThickness = null,           // mm - if thin wall
        setupRigidity = 'good',         // poor, fair, good, excellent
        surfaceHardness = 'normal'      // soft, normal, hard, hardened
      } = params;

      let climbScore = 50;
      let conventionalScore = 50;
      const reasons = [];

      // Machine type (backlash consideration)
      if (machineType === 'vmcLinear') {
        climbScore += 15;
        reasons.push('Linear rails: Climb preferred (no backlash)');
      } else if (machineType === 'manual') {
        conventionalScore += 30;
        reasons.push('Manual machine: Conventional required (backlash safety)');
      } else {
        climbScore += 5;
        reasons.push('Ball screw: Climb slightly preferred');
      }
      // Operation type
      if (operation === 'finishing') {
        climbScore += 10;
        reasons.push('Finishing: Climb gives better surface finish');
      } else if (operation === 'slotting') {
        // Equal for slotting
        reasons.push('Slotting: Both directions used');
      }
      // Tool condition
      if (toolCondition === 'worn') {
        conventionalScore += 10;
        reasons.push('Worn tool: Conventional reduces grabbing');
      } else if (toolCondition === 'new') {
        climbScore += 5;
        reasons.push('New tool: Climb maximizes tool life');
      }
      // Thin wall
      if (wallThickness && wallThickness < 3) {
        climbScore += 15;
        reasons.push('Thin wall: Climb reduces deflection');
      }
      // Setup rigidity
      if (setupRigidity === 'poor') {
        conventionalScore += 15;
        reasons.push('Poor rigidity: Conventional more stable');
      } else if (setupRigidity === 'excellent') {
        climbScore += 10;
        reasons.push('Excellent rigidity: Climb fully viable');
      }
      // Surface hardness
      if (surfaceHardness === 'hardened') {
        climbScore += 20;
        reasons.push('Hardened surface: Climb avoids rubbing on entry');
      }
      // Material
      if (material === 'aluminum') {
        climbScore += 10;
        reasons.push('Aluminum: Climb preferred for finish');
      } else if (material === 'stainless' || material === 'titanium') {
        climbScore += 15;
        reasons.push('Work hardening material: Climb essential');
      }
      const recommendation = climbScore > conventionalScore ? 'CLIMB' : 'CONVENTIONAL';
      const confidence = Math.abs(climbScore - conventionalScore);

      return {
        recommendation,
        climbScore,
        conventionalScore,
        confidence: confidence > 30 ? 'High' : (confidence > 15 ? 'Medium' : 'Low'),
        reasons,
        benefits: recommendation === 'CLIMB' ?
          ['Better surface finish', 'Longer tool life', 'Chips behind cutter', 'Lower cutting forces'] :
          ['More stable in poor setups', 'Safer on manual machines', 'Better for worn tools']
      };
    }
  },
  // 4. ENGAGEMENT ANGLE OPTIMIZATION

  engagementAngle: {
    /**
     * Calculate tool engagement angle based on cutting conditions
     */
    calculateEngagement(params) {
      const {
        toolDiameter,
        radialEngagement,    // ae - radial depth
        cuttingMode = 'peripheral'  // peripheral, slot, plunge
      } = params;

      if (cuttingMode === 'slot') {
        return {
          engagementAngle: 180,
          arcOfCut: Math.PI * toolDiameter / 2,
          maxChipThickness: 'at entry and exit',
          strategy: 'Use trochoidal or peel milling for better control'
        };
      }
      // Calculate engagement angle
      // For peripheral milling: θ = arccos(1 - 2*ae/D)
      const aeRatio = radialEngagement / toolDiameter;
      const engagementRad = Math.acos(1 - 2 * aeRatio);
      const engagementDeg = engagementRad * 180 / Math.PI;

      // Arc of cut
      const arcOfCut = (toolDiameter / 2) * engagementRad;

      // Maximum chip thickness location
      const maxChipAngle = engagementDeg / 2;

      // Recommendations
      let strategy = '';
      if (engagementDeg > 90) {
        strategy = 'High engagement - consider reducing ae or using HEM strategy';
      } else if (engagementDeg > 60) {
        strategy = 'Moderate engagement - standard cutting OK';
      } else {
        strategy = 'Low engagement - can increase feed (chip thinning applies)';
      }
      return {
        engagementAngle: Math.round(engagementDeg * 10) / 10,
        engagementRadians: Math.round(engagementRad * 1000) / 1000,
        arcOfCut: Math.round(arcOfCut * 100) / 100,
        aeRatio: Math.round(aeRatio * 1000) / 1000,
        maxChipThicknessAngle: Math.round(maxChipAngle * 10) / 10,
        strategy
      };
    },
    /**
     * Calculate optimal engagement for constant chip load
     */
    getOptimalEngagement(targetChipLoad, toolDiameter, baseFeed, fluteCount) {
      // For constant chip load, engagement affects instantaneous chip thickness
      // hmax = fz * sin(θ/2) where θ is engagement angle
      // Target: Keep hmax constant

      // Start with 40% engagement as baseline
      const baseEngagement = 0.4 * toolDiameter;
      const baseAngle = Math.acos(1 - 2 * 0.4);
      const baseChip = (baseFeed / fluteCount) * Math.sin(baseAngle / 2);

      // Scale to maintain chip load
      const scaleFactor = targetChipLoad / baseChip;

      return {
        optimalAe: Math.round(baseEngagement * scaleFactor * 100) / 100,
        optimalEngagementRatio: Math.round(0.4 * scaleFactor * 100) / 100,
        predictedMaxChip: Math.round(targetChipLoad * 1000) / 1000
      };
    }
  },
  // 5. ENTRY/EXIT ARC OPTIMIZATION

  entryExit: {
    /**
     * Calculate optimal entry arc parameters
     */
    calculateEntryArc(params) {
      const {
        toolDiameter,
        material = 'steel',
        operation = 'profile',
        feedRate,
        radialEngagement
      } = params;

      // Entry arc radius: typically 50-100% of tool diameter
      let arcRadiusRatio = 0.5;
      const materialAdjust = {
        aluminum: 0.5,
        steel: 0.6,
        stainless: 0.75,
        titanium: 0.8,
        hardened: 0.9
      };
      arcRadiusRatio = materialAdjust[material] || 0.6;

      const entryRadius = toolDiameter * arcRadiusRatio;

      // Entry angle (tangent entry preferred)
      const entryAngle = 90; // degrees - tangent entry

      // Feed ramping
      const entryFeed = feedRate * 0.5; // Start at 50%
      const rampDistance = toolDiameter * 2;

      // Calculate arc length
      const arcLength = (Math.PI / 2) * entryRadius; // 90° arc

      return {
        entryRadius: Math.round(entryRadius * 100) / 100,
        entryAngle,
        arcLength: Math.round(arcLength * 100) / 100,
        entryFeed: Math.round(entryFeed),
        rampToFullFeedDistance: Math.round(rampDistance * 100) / 100,
        benefits: [
          'Gradual tool loading',
          'Reduced shock on entry',
          'Better surface finish at entry',
          'Longer tool life'
        ],
        gcode: this._generateEntryGCode(entryRadius, feedRate, entryFeed)
      };
    },
    /**
     * Generate entry arc G-code snippet
     */
    _generateEntryGCode(radius, fullFeed, entryFeed) {
      return [
        '(TANGENT ENTRY ARC)',
        'G01 F' + Math.round(entryFeed) + ' (REDUCED ENTRY FEED)',
        'G02 R' + radius.toFixed(3) + ' (90° ENTRY ARC)',
        'G01 F' + Math.round(fullFeed) + ' (FULL FEED)'
      ].join('\n');
    },
    /**
     * Calculate helix entry parameters
     */
    calculateHelixEntry(params) {
      const {
        toolDiameter,
        pocketDepth,
        material = 'steel',
        maxRampAngle = null
      } = params;

      // Material-specific max ramp angles
      const maxAngles = {
        aluminum: 5,
        steel: 3,
        stainless: 2,
        titanium: 1.5,
        hardened: 1,
        inconel: 0.75
      };
      const angle = maxRampAngle || maxAngles[material] || 3;

      // Helix radius (typically 60-90% of pocket radius, min 50% tool dia)
      const minHelixRadius = toolDiameter * 0.75;

      // Calculate helix parameters
      const helixPitch = 2 * Math.PI * minHelixRadius * Math.tan(angle * Math.PI / 180);
      const revolutionsNeeded = pocketDepth / helixPitch;
      const totalHelixLength = 2 * Math.PI * minHelixRadius * revolutionsNeeded;

      return {
        helixRadius: Math.round(minHelixRadius * 100) / 100,
        helixAngle: angle,
        helixPitch: Math.round(helixPitch * 1000) / 1000,
        revolutionsNeeded: Math.ceil(revolutionsNeeded),
        totalHelixLength: Math.round(totalHelixLength * 10) / 10,
        plungeEquivalent: pocketDepth,
        benefits: [
          'Eliminates plunge stress',
          'Better chip evacuation',
          'Reduced tool wear',
          'No center cutting required'
        ]
      };
    }
  },
  // 6. THERMAL MANAGEMENT

  thermal: {
    /**
     * Estimate cutting temperature
     */
    estimateTemperature(params) {
      const {
        cuttingSpeed,      // m/min
        feedRate,          // mm/min
        material = 'steel',
        coolant = 'flood'
      } = params;

      // Simplified Johnson-Cook temperature model
      // Based on empirical data for common materials
      const baseTemps = {
        aluminum: 150,
        steel: 350,
        stainless: 450,
        titanium: 550,
        inconel: 650,
        hardened: 500
      };
      const baseTemp = baseTemps[material] || 400;

      // Speed effect (temperature rises with speed)
      const speedFactor = Math.pow(cuttingSpeed / 100, 0.5);

      // Coolant effect
      const coolantFactors = {
        dry: 1.4,
        mist: 1.1,
        flood: 0.8,
        through_spindle: 0.6,
        cryogenic: 0.3
      };
      const coolantFactor = coolantFactors[coolant] || 1.0;

      const estimatedTemp = baseTemp * speedFactor * coolantFactor;

      // Tool coating limits
      const coatingLimits = {
        uncoated: 400,
        TiN: 550,
        TiCN: 500,
        TiAlN: 800,
        AlTiN: 900,
        AlCrN: 1100,
        diamond: 600,  // Graphitizes above this
        CBN: 1200
      };
      let recommendation = 'Temperature within acceptable range';
      let suggestedCoolant = coolant;

      if (estimatedTemp > 600) {
        recommendation = 'High temperature - consider through-spindle coolant or reduce speed';
        if (coolant !== 'through_spindle') suggestedCoolant = 'through_spindle';
      } else if (estimatedTemp > 450) {
        recommendation = 'Moderate temperature - ensure adequate coolant flow';
      }
      return {
        estimatedTemperature: Math.round(estimatedTemp),
        unit: '°C',
        coatingLimits,
        recommendation,
        suggestedCoolant,
        factors: { speedFactor: speedFactor.toFixed(2), coolantFactor }
      };
    },
    /**
     * Calculate optimal coolant strategy
     */
    selectCoolantStrategy(params) {
      const {
        material,
        operation,
        toolDiameter,
        depth,
        holeDepth = null
      } = params;

      let strategy = 'flood';
      const reasons = [];

      // Deep holes need through-spindle
      if (holeDepth && holeDepth / toolDiameter > 4) {
        strategy = 'through_spindle';
        reasons.push('Deep hole: L/D > 4 requires through-spindle coolant');
      }
      // Titanium and superalloys
      if (['titanium', 'inconel', 'hastelloy'].includes(material)) {
        strategy = 'through_spindle';
        reasons.push('Superalloy: High pressure coolant recommended');
      }
      // Aluminum (prevent BUE)
      if (material === 'aluminum' && operation === 'finishing') {
        strategy = 'mist';
        reasons.push('Aluminum finishing: Mist prevents built-up edge');
      }
      // Cast iron (usually dry)
      if (material === 'cast_iron') {
        strategy = 'dry';
        reasons.push('Cast iron: Typically machined dry');
      }
      return {
        recommendedStrategy: strategy,
        pressure: strategy === 'through_spindle' ? '70-100 bar' : 'standard',
        reasons,
        alternatives: this._getCoolantAlternatives(strategy)
      };
    },
    _getCoolantAlternatives(primary) {
      const alternatives = {
        'through_spindle': ['flood with directed nozzles', 'cryogenic'],
        'flood': ['mist', 'through_spindle'],
        'mist': ['MQL', 'dry with air blast'],
        'dry': ['air blast', 'mist']
      };
      return alternatives[primary] || [];
    }
  },
  // 7. CONSTANT CHIP LOAD OPTIMIZATION

  constantChipLoad: {
    /**
     * Calculate feed adjustments for constant chip load during variable engagement
     */
    calculateFeedForConstantChip(params) {
      const {
        targetChipLoad,      // mm - target fz
        toolDiameter,
        fluteCount,
        engagementProfile    // Array of {position, engagement} along path
      } = params;

      const feedProfile = [];

      for (const point of engagementProfile) {
        const engagement = point.engagement;
        const aeRatio = engagement / toolDiameter;

        // Engagement angle
        const theta = Math.acos(1 - 2 * aeRatio);

        // Chip thickness varies with engagement
        // hmax = fz * sin(θ/2)
        // For constant hmax: fz_adjusted = fz_target / sin(θ/2)
        const sinHalfTheta = Math.sin(theta / 2);
        const adjustedFz = targetChipLoad / sinHalfTheta;

        // Convert to feed rate
        const baseFeedRate = adjustedFz * fluteCount;

        // Apply chip thinning compensation
        const chipThinFactor = this._getChipThinFactor(aeRatio);
        const finalFeed = baseFeedRate * chipThinFactor;

        feedProfile.push({
          position: point.position,
          engagement,
          engagementAngle: theta * 180 / Math.PI,
          adjustedFz: Math.round(adjustedFz * 1000) / 1000,
          feedRate: Math.round(finalFeed * 1000) / 1000,
          chipThinFactor: Math.round(chipThinFactor * 100) / 100
        });
      }
      return {
        targetChipLoad,
        feedProfile,
        minFeed: Math.min(...feedProfile.map(p => p.feedRate)),
        maxFeed: Math.max(...feedProfile.map(p => p.feedRate)),
        feedVariation: 'Feed varies with engagement to maintain constant chip load'
      };
    },
    /**
     * Chip thinning factor lookup
     */
    _getChipThinFactor(aeRatio) {
      // Simplified lookup
      if (aeRatio <= 0.1) return 1.8;
      if (aeRatio <= 0.2) return 1.4;
      if (aeRatio <= 0.3) return 1.2;
      if (aeRatio <= 0.4) return 1.1;
      if (aeRatio <= 0.5) return 1.05;
      return 1.0;
    }
  },
  // 8. THIN WALL MACHINING STRATEGY

  thinWall: {
    /**
     * Calculate thin wall machining parameters
     */
    calculateThinWallStrategy(params) {
      const {
        wallThickness,        // mm
        wallHeight,           // mm
        material = 'aluminum',
        toolDiameter,
        targetDeflection = 0.05  // mm - max acceptable deflection
      } = params;

      // Material properties
      const E = {
        aluminum: 70000,      // MPa
        steel: 210000,
        titanium: 114000,
        plastic: 3000
      }[material] || 70000;

      // Calculate wall stiffness
      const I = (wallThickness ** 3 * 1) / 12;  // Moment of inertia per mm width
      const k = 3 * E * I / (wallHeight ** 3);  // Cantilever stiffness N/mm

      // Max allowable force
      const maxForce = targetDeflection * k;

      // Recommended parameters
      const recommendations = [];

      // Depth of cut
      const maxDoc = Math.min(wallHeight / 10, 2);
      recommendations.push({
        param: 'Axial Depth (ap)',
        value: maxDoc.toFixed(2) + ' mm',
        reason: 'Multiple light passes reduce deflection'
      });

      // Radial engagement
      const maxAe = Math.min(wallThickness * 0.3, toolDiameter * 0.2);
      recommendations.push({
        param: 'Radial Depth (ae)',
        value: maxAe.toFixed(2) + ' mm',
        reason: 'Light radial engagement reduces cutting force'
      });

      // Strategy
      let strategy = '';
      if (wallThickness < 1) {
        strategy = 'Use support (wax, low-melt alloy) or climb mill only';
        recommendations.push({
          param: 'Support Material',
          value: 'Required',
          reason: 'Very thin wall needs physical support'
        });
      } else if (wallThickness < 2) {
        strategy = 'Alternating sides, climb milling, light cuts';
      } else if (wallThickness < 5) {
        strategy = 'Standard approach with reduced parameters';
      } else {
        strategy = 'Normal machining possible';
      }
      // Climb vs conventional
      recommendations.push({
        param: 'Cut Direction',
        value: 'CLIMB ONLY',
        reason: 'Climb milling pushes wall against solid material'
      });

      // Coolant
      recommendations.push({
        param: 'Coolant',
        value: 'Mist or Air Blast',
        reason: 'Flood coolant can deflect thin walls'
      });

      return {
        wallStiffness: k.toFixed(1) + ' N/mm',
        maxAllowableForce: maxForce.toFixed(1) + ' N',
        strategy,
        recommendations,
        machiningOrder: [
          '1. Machine alternating sides (front-back-front-back)',
          '2. Leave 0.1-0.2mm finishing stock',
          '3. Final spring pass at full depth, light ae',
          '4. Consider support material for < 1mm walls'
        ]
      };
    }
  },
  // 9. TOOL LIFE OPTIMIZATION (Enhanced Taylor)

  toolLife: {
    /**
     * Calculate tool life using enhanced Taylor equation
     */
    calculateToolLife(params) {
      const {
        cuttingSpeed,        // m/min
        material = 'steel',
        toolMaterial = 'carbide',
        coating = 'TiAlN',
        feedRate,
        depthOfCut
      } = params;

      // Taylor equation: VT^n = C
      // T = (C/V)^(1/n)

      // Material constants (C and n values)
      const taylorConstants = {
        aluminum: { C: 900, n: 0.35 },
        steel_mild: { C: 400, n: 0.25 },
        steel_medium: { C: 300, n: 0.22 },
        steel_hard: { C: 200, n: 0.20 },
        stainless: { C: 180, n: 0.20 },
        titanium: { C: 80, n: 0.15 },
        inconel: { C: 50, n: 0.12 },
        cast_iron: { C: 500, n: 0.28 }
      };
      const constants = taylorConstants[material] || taylorConstants.steel_mild;

      // Coating factor
      const coatingFactors = {
        uncoated: 0.6,
        TiN: 1.0,
        TiCN: 1.2,
        TiAlN: 1.5,
        AlTiN: 1.7,
        AlCrN: 2.0,
        diamond: 3.0,
        CBN: 2.5
      };
      const coatingFactor = coatingFactors[coating] || 1.0;

      // Calculate base tool life (minutes)
      const adjustedC = constants.C * coatingFactor;
      const toolLife = Math.pow(adjustedC / cuttingSpeed, 1 / constants.n);

      // Feed and depth corrections
      const feedFactor = Math.pow(0.25 / feedRate, 0.15);  // Normalized to 0.25 mm/rev
      const depthFactor = Math.pow(2 / depthOfCut, 0.1);   // Normalized to 2mm

      const adjustedLife = toolLife * feedFactor * depthFactor;

      // Convert to practical units
      const lifeInMinutes = Math.round(adjustedLife);
      const partsEstimate = Math.round(adjustedLife / 5);  // Assume 5 min/part

      return {
        estimatedLifeMinutes: lifeInMinutes,
        estimatedParts: partsEstimate,
        taylorConstants: constants,
        coatingFactor,
        recommendations: this._getToolLifeRecommendations(lifeInMinutes, cuttingSpeed, material)
      };
    },
    /**
     * Get recommendations for tool life improvement
     */
    _getToolLifeRecommendations(currentLife, speed, material) {
      const recommendations = [];

      if (currentLife < 15) {
        recommendations.push('Very short tool life - reduce cutting speed by 15-20%');
        recommendations.push('Consider upgrading tool coating');
      } else if (currentLife < 30) {
        recommendations.push('Moderate tool life - reduce speed by 10% for longer life');
      } else if (currentLife > 90) {
        recommendations.push('Excellent tool life - could increase speed for productivity');
      }
      // Material-specific
      if (material === 'titanium' || material === 'inconel') {
        recommendations.push('Use high-pressure through-spindle coolant');
        recommendations.push('Consider ceramic or CBN tooling');
      }
      return recommendations;
    },
    /**
     * Calculate optimal speed for target tool life
     */
    getSpeedForTargetLife(targetLife, material, coating = 'TiAlN') {
      const taylorConstants = {
        aluminum: { C: 900, n: 0.35 },
        steel_mild: { C: 400, n: 0.25 },
        steel_medium: { C: 300, n: 0.22 },
        stainless: { C: 180, n: 0.20 },
        titanium: { C: 80, n: 0.15 }
      };
      const coatingFactors = {
        uncoated: 0.6, TiN: 1.0, TiCN: 1.2, TiAlN: 1.5, AlTiN: 1.7
      };
      const constants = taylorConstants[material] || taylorConstants.steel_mild;
      const coatingFactor = coatingFactors[coating] || 1.0;

      // V = C * T^(-n)
      const adjustedC = constants.C * coatingFactor;
      const optimalSpeed = adjustedC * Math.pow(targetLife, -constants.n);

      return Math.round(optimalSpeed);
    }
  },
  // 10. RAPID/LINKING OPTIMIZATION

  rapidOptimization: {
    /**
     * Optimize retract heights
     */
    optimizeRetract(params) {
      const {
        partHeight,
        fixtureHeight = 0,
        obstacleHeights = [],
        toolLength,
        operation
      } = params;

      const maxObstacle = Math.max(...obstacleHeights, 0);
      const clearanceNeeded = Math.max(partHeight, fixtureHeight, maxObstacle) + 5;

      // Different strategies
      const strategies = {
        minimum: {
          height: Math.round(clearanceNeeded),
          description: 'Minimum safe clearance',
          timeSaving: 'Maximum',
          risk: 'Requires accurate fixture model'
        },
        safe: {
          height: Math.round(clearanceNeeded + 10),
          description: 'Standard safe height',
          timeSaving: 'Good',
          risk: 'Low'
        },
        conservative: {
          height: Math.round(clearanceNeeded + 25),
          description: 'Conservative clearance',
          timeSaving: 'Moderate',
          risk: 'Very Low'
        }
      };
      // Estimate time savings
      const rapidRate = 15000;  // mm/min typical
      const heightDiff = strategies.conservative.height - strategies.minimum.height;
      const movesPerPart = 20;  // Estimate
      const timeSavedPerPart = (heightDiff * 2 * movesPerPart) / rapidRate;

      return {
        strategies,
        recommendedStrategy: operation === 'finishing' ? 'minimum' : 'safe',
        estimatedTimeSavingPerPart: timeSavedPerPart.toFixed(2) + ' min',
        tips: [
          'Use stock clearance option if CAM supports it',
          'Consider safe Z per operation vs global',
          'Group operations by area to reduce rapids'
        ]
      };
    }
  },
  // MASTER OPTIMIZATION FUNCTION

  /**
   * Get comprehensive optimization recommendations
   */
  getOptimizationReport(params) {
    const {
      toolDiameter,
      material,
      operation,
      radialEngagement,
      axialDepth,
      feedRate,
      cuttingSpeed,
      rpm,
      fluteCount = 4,
      toolCondition = 'new',
      machineType = 'vmcBallscrew',
      wallThickness = null,
      coolant = 'flood',
      targetFinish = null
    } = params;

    const report = {
      timestamp: new Date().toISOString(),
      inputParams: params,
      optimizations: []
    };
    // 1. Engagement analysis
    const engagement = this.engagementAngle.calculateEngagement({
      toolDiameter, radialEngagement
    });
    report.engagement = engagement;

    // 2. Climb vs conventional
    const direction = this.climbVsConventional.selectDirection({
      material, operation, machineType, toolCondition, wallThickness
    });
    report.cutDirection = direction;

    // 3. Stability check
    if (rpm && fluteCount) {
      const stability = this.stabilityLobe.calculateCriticalDepth({
        rpm, fluteCount, radialEngagement: radialEngagement / toolDiameter
      });
      report.stability = stability;

      if (axialDepth > stability.criticalDepth) {
        report.optimizations.push({
          type: 'WARNING',
          message: 'Depth exceeds stability limit - chatter likely',
          suggestion: 'Reduce depth to ' + stability.criticalDepth.toFixed(2) + 'mm or adjust RPM'
        });
      }
    }
    // 4. Thermal check
    if (cuttingSpeed) {
      const thermal = this.thermal.estimateTemperature({
        cuttingSpeed, feedRate, material, coolant
      });
      report.thermal = thermal;
    }
    // 5. Tool life
    if (cuttingSpeed) {
      const life = this.toolLife.calculateToolLife({
        cuttingSpeed, material, feedRate, depthOfCut: axialDepth
      });
      report.toolLife = life;
    }
    // 6. Surface finish (if target specified)
    if (targetFinish && operation === 'finishing') {
      const finish = this.surfaceFinish.calculateOptimalStepover({
        ballRadius: toolDiameter / 2,
        targetRa: targetFinish,
        material
      });
      report.surfaceFinish = finish;
    }
    // 7. Thin wall (if applicable)
    if (wallThickness && wallThickness < 5) {
      const thinWall = this.thinWall.calculateThinWallStrategy({
        wallThickness, wallHeight: axialDepth * 3, material, toolDiameter
      });
      report.thinWall = thinWall;
    }
    return report;
  }
}