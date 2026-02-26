const PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE = {
  version: '3.0.0',
  lastUpdated: '2026-01-06',

  // CONFIGURATION CONSTANTS

  config: {
    // WOC multipliers by operation type (as fraction of tool diameter)
    wocDefaults: {
      // Roughing operations - LOW ae for HSM/Adaptive
      adaptive_roughing: { min: 0.08, optimal: 0.10, max: 0.15 },
      conventional_roughing: { min: 0.30, optimal: 0.50, max: 0.65 },
      hsm_roughing: { min: 0.05, optimal: 0.08, max: 0.12 },
      trochoidal: { min: 0.08, optimal: 0.12, max: 0.18 },
      volumill: { min: 0.07, optimal: 0.10, max: 0.15 },

      // Semi-finish operations
      semi_finish: { min: 0.15, optimal: 0.25, max: 0.35 },
      rest_machining: { min: 0.20, optimal: 0.30, max: 0.40 },

      // Finishing operations
      finish_parallel: { min: 0.05, optimal: 0.10, max: 0.20 },
      finish_scallop: { min: 0.03, optimal: 0.08, max: 0.15 },
      finish_waterline: { min: 0.10, optimal: 0.15, max: 0.25 },
      finish_contour: { min: 0.02, optimal: 0.05, max: 0.10 },
      pencil: { min: 0.05, optimal: 0.10, max: 0.15 },

      // Pocketing
      pocket_spiral: { min: 0.35, optimal: 0.50, max: 0.70 },
      pocket_zigzag: { min: 0.40, optimal: 0.55, max: 0.70 },
      pocket_adaptive: { min: 0.08, optimal: 0.10, max: 0.15 },

      // Slotting (FULL width)
      slot_plunge: { min: 0.90, optimal: 1.00, max: 1.00 },
      slot_ramping: { min: 0.90, optimal: 1.00, max: 1.00 },

      // Facing
      face_milling: { min: 0.50, optimal: 0.70, max: 0.80 },

      // Default
      default: { min: 0.25, optimal: 0.40, max: 0.60 }
    },
    // v2.0: DOC defaults NOW PRIORITIZE FULL LOC FOR ROUGHING
    docDefaults: {
      // ROUGHING - USE FULL LOC (KEY v2.0 CHANGE)
      // For adaptive/HSM: DOC = FULL LOC (100%)
      adaptive_roughing: { base: 'loc', min: 0.8, optimal: 1.0, max: 1.0, prioritizeLoc: true },
      hsm_roughing: { base: 'loc', min: 0.85, optimal: 1.0, max: 1.0, prioritizeLoc: true },
      trochoidal: { base: 'loc', min: 0.8, optimal: 1.0, max: 1.0, prioritizeLoc: true },
      volumill: { base: 'loc', min: 0.85, optimal: 1.0, max: 1.0, prioritizeLoc: true },

      // Conventional roughing: 75-100% of LOC
      conventional_roughing: { base: 'loc', min: 0.5, optimal: 0.85, max: 1.0, prioritizeLoc: true },

      // Semi-finish
      semi_finish: { base: 'diameter', min: 0.3, optimal: 0.5, max: 0.8, prioritizeLoc: false },
      rest_machining: { base: 'diameter', min: 0.5, optimal: 0.8, max: 1.2, prioritizeLoc: false },

      // Finishing - light cuts
      finish_parallel: { base: 'fixed', min: 0.1, optimal: 0.2, max: 0.5, prioritizeLoc: false },
      finish_scallop: { base: 'fixed', min: 0.05, optimal: 0.15, max: 0.3, prioritizeLoc: false },
      finish_waterline: { base: 'fixed', min: 0.1, optimal: 0.25, max: 0.5, prioritizeLoc: false },
      finish_contour: { base: 'fixed', min: 0.05, optimal: 0.1, max: 0.2, prioritizeLoc: false },
      pencil: { base: 'fixed', min: 0.02, optimal: 0.05, max: 0.1, prioritizeLoc: false },

      // Pocketing - use LOC for depth
      pocket_spiral: { base: 'loc', min: 0.5, optimal: 0.8, max: 1.0, prioritizeLoc: true },
      pocket_zigzag: { base: 'loc', min: 0.5, optimal: 0.8, max: 1.0, prioritizeLoc: true },
      pocket_adaptive: { base: 'loc', min: 0.85, optimal: 1.0, max: 1.0, prioritizeLoc: true },

      // Slotting - limited by chip evacuation (FULL WIDTH = LOWER DOC)
      slot_plunge: { base: 'loc', min: 0.3, optimal: 0.5, max: 0.6, prioritizeLoc: false },
      slot_ramping: { base: 'loc', min: 0.5, optimal: 0.7, max: 0.85, prioritizeLoc: false },

      // Facing
      face_milling: { base: 'fixed', min: 0.5, optimal: 1.0, max: 2.0, prioritizeLoc: false },

      // Default
      default: { base: 'loc', min: 0.5, optimal: 0.75, max: 1.0, prioritizeLoc: false }
    },
    // Material hardness factors
    materialFactors: {
      aluminum: { wocFactor: 1.2, docFactor: 1.2, speedFactor: 1.5, maxLocMult: 1.0 },
      aluminum_alloy: { wocFactor: 1.1, docFactor: 1.1, speedFactor: 1.4, maxLocMult: 1.0 },
      mild_steel: { wocFactor: 1.0, docFactor: 1.0, speedFactor: 1.0, maxLocMult: 1.0 },
      carbon_steel: { wocFactor: 0.95, docFactor: 0.95, speedFactor: 0.95, maxLocMult: 1.0 },
      alloy_steel: { wocFactor: 0.85, docFactor: 0.9, speedFactor: 0.85, maxLocMult: 1.0 },
      tool_steel: { wocFactor: 0.7, docFactor: 0.8, speedFactor: 0.7, maxLocMult: 0.95 },
      stainless_304: { wocFactor: 0.7, docFactor: 0.85, speedFactor: 0.65, maxLocMult: 0.9 },
      stainless_316: { wocFactor: 0.65, docFactor: 0.8, speedFactor: 0.6, maxLocMult: 0.9 },
      stainless_17_4: { wocFactor: 0.55, docFactor: 0.75, speedFactor: 0.5, maxLocMult: 0.85 },
      cast_iron: { wocFactor: 0.9, docFactor: 1.0, speedFactor: 0.85, maxLocMult: 1.0 },
      titanium: { wocFactor: 0.5, docFactor: 0.9, speedFactor: 0.4, maxLocMult: 1.0 },
      titanium_6al4v: { wocFactor: 0.45, docFactor: 0.85, speedFactor: 0.35, maxLocMult: 1.0 },
      inconel: { wocFactor: 0.35, docFactor: 0.7, speedFactor: 0.25, maxLocMult: 0.8 },
      inconel_718: { wocFactor: 0.3, docFactor: 0.65, speedFactor: 0.2, maxLocMult: 0.8 },
      hastelloy: { wocFactor: 0.3, docFactor: 0.65, speedFactor: 0.2, maxLocMult: 0.75 },
      hardened_steel: { wocFactor: 0.4, docFactor: 0.5, speedFactor: 0.35, maxLocMult: 0.8 },
      copper: { wocFactor: 1.1, docFactor: 1.1, speedFactor: 1.3, maxLocMult: 1.0 },
      brass: { wocFactor: 1.15, docFactor: 1.15, speedFactor: 1.4, maxLocMult: 1.0 },
      bronze: { wocFactor: 1.0, docFactor: 1.0, speedFactor: 1.2, maxLocMult: 1.0 },
      plastic: { wocFactor: 1.3, docFactor: 1.3, speedFactor: 1.8, maxLocMult: 1.0 },
      default: { wocFactor: 1.0, docFactor: 1.0, speedFactor: 1.0, maxLocMult: 1.0 }
    },
    // Tool type factors
    toolTypeFactors: {
      endmill: { wocMult: 1.0, docMult: 1.0 },
      endmill_roughing: { wocMult: 0.9, docMult: 1.1 },
      endmill_finishing: { wocMult: 1.1, docMult: 0.8 },
      endmill_ball: { wocMult: 0.8, docMult: 0.7 },
      endmill_bullnose: { wocMult: 0.9, docMult: 0.85 },
      endmill_chamfer: { wocMult: 0.7, docMult: 0.5 },
      face_mill: { wocMult: 1.2, docMult: 0.6 },
      drill: { wocMult: 1.0, docMult: 1.0 },
      reamer: { wocMult: 0.5, docMult: 0.3 },
      default: { wocMult: 1.0, docMult: 1.0 }
    },
    // Flute count factors
    fluteFactors: {
      2: { wocMult: 1.1, docMult: 1.0, chipSpace: 'excellent' },
      3: { wocMult: 1.0, docMult: 1.0, chipSpace: 'good' },
      4: { wocMult: 0.95, docMult: 0.95, chipSpace: 'moderate' },
      5: { wocMult: 0.9, docMult: 0.9, chipSpace: 'limited' },
      6: { wocMult: 0.85, docMult: 0.85, chipSpace: 'limited' },
      default: { wocMult: 1.0, docMult: 1.0, chipSpace: 'moderate' }
    },
    // Machine rigidity factors
    machineRigidityFactors: {
      very_rigid: { wocMult: 1.1, docMult: 1.1, note: 'Heavy VMC, HMC, production machine' },
      rigid: { wocMult: 1.0, docMult: 1.0, note: 'Standard VMC, good condition' },
      moderate: { wocMult: 0.85, docMult: 0.85, note: 'Lighter machine, bench-top' },
      light: { wocMult: 0.7, docMult: 0.7, note: 'Router, hobby machine' },
      default: { wocMult: 1.0, docMult: 1.0 }
    },
    // Safety limits
    safetyLimits: {
      minWocMm: 0.05,
      maxWocAsPercentOfDiameter: 1.0,
      minDocMm: 0.02,
      maxDocAsPercentOfLoc: 1.0,  // v2.0: Allow FULL LOC
      maxDocAsPercentOfDiameter: 5.0
    }
  },
  // MANUFACTURER CUTTING DATA (INTEGRATED v2.0)

  manufacturerData: {
    // Reference sources
    sources: {
      sandvik: { name: 'Sandvik Coromant', catalog: 'Main Catalogue 2024' },
      kennametal: { name: 'Kennametal', catalog: 'Master Catalog 2024' },
      harvey: { name: 'Harvey Tool', catalog: 'Online Calculator' },
      helical: { name: 'Helical Solutions', catalog: 'Machining Advisor Pro' },
      osg: { name: 'OSG', catalog: 'Cutting Tool Data' }
    },
    // Vendor recommendations by material (ae/ap as fractions of D or LOC)
    vendorRecommendations: {
      aluminum: {
        sfm: { min: 800, recommended: 1200, max: 2000 },
        ipt: { min: 0.002, recommended: 0.004, max: 0.008 },
        ae_roughing: 0.50,  // 50% of D for conventional, 10% for adaptive
        ae_adaptive: 0.10,  // 10% for HSM/adaptive
        ap_roughing_mult: 1.0,  // 100% of LOC for roughing
        notes: 'Uncoated or ZrN. Can use FULL LOC for roughing.'
      },
      mild_steel: {
        sfm: { min: 300, recommended: 450, max: 600 },
        ipt: { min: 0.001, recommended: 0.003, max: 0.005 },
        ae_roughing: 0.40,
        ae_adaptive: 0.10,
        ap_roughing_mult: 1.0,
        notes: 'TiAlN coating. Full LOC for adaptive roughing.'
      },
      stainless_304: {
        sfm: { min: 150, recommended: 280, max: 400 },
        ipt: { min: 0.001, recommended: 0.002, max: 0.004 },
        ae_roughing: 0.30,
        ae_adaptive: 0.08,
        ap_roughing_mult: 0.9,  // 90% LOC - leave margin for work hardening
        notes: 'Maintain chip load, avoid dwelling. Sharp edges critical.'
      },
      titanium_6al4v: {
        sfm: { min: 80, recommended: 150, max: 250 },
        ipt: { min: 0.001, recommended: 0.002, max: 0.003 },
        ae_roughing: 0.15,
        ae_adaptive: 0.08,
        ap_roughing_mult: 1.0,  // Full LOC OK with proper cooling
        notes: 'High coolant pressure. AlTiN or uncoated. FULL LOC for HSM.'
      },
      inconel_718: {
        sfm: { min: 40, recommended: 80, max: 150 },
        ipt: { min: 0.0005, recommended: 0.001, max: 0.002 },
        ae_roughing: 0.08,
        ae_adaptive: 0.05,
        ap_roughing_mult: 0.8,  // 80% LOC - thermal management
        notes: 'Ceramic for roughing. Aggressive coolant. Heat sensitive.'
      },
      hardened_steel: {
        sfm: { min: 100, recommended: 200, max: 350 },
        ipt: { min: 0.0005, recommended: 0.001, max: 0.002 },
        ae_roughing: 0.10,
        ae_adaptive: 0.05,
        ap_roughing_mult: 0.8,
        notes: 'Ceramic or CBN. Light cuts, high speed.'
      }
    },
    // HSM/Adaptive specific recommendations
    adaptiveHSM: {
      principle: 'LOW radial (ae), HIGH axial (ap = FULL LOC)',
      general: {
        ae_range: { min: 0.05, typical: 0.10, max: 0.15 },
        ap_recommendation: 'FULL_LOC',
        speed_increase: 1.3,
        feed_increase: 1.5
      },
      by_material: {
        aluminum: { ae: 0.10, ap: 'FULL_LOC', speed_mult: 1.5, feed_mult: 2.0 },
        mild_steel: { ae: 0.10, ap: 'FULL_LOC', speed_mult: 1.3, feed_mult: 1.5 },
        stainless: { ae: 0.08, ap: '0.9_LOC', speed_mult: 1.2, feed_mult: 1.3 },
        titanium: { ae: 0.08, ap: 'FULL_LOC', speed_mult: 1.0, feed_mult: 1.2 }
      }
    }
  },
  // MAIN API METHODS

  /**
   * Get all optimal parameters in one call
   */
  getOptimalParams(tool, material, operation = 'default', options = {}) {
    const normalizedTool = this._normalizeTool(tool);
    const materialData = typeof material === 'object' ? material : this._getMaterialData(material);
    const operationType = this._normalizeOperation(operation);

    // v2.0: Check vendor recommendations first
    const vendorData = this._getVendorRecommendation(materialData.name || material);

    const wocResult = this.getOptimalWOC(normalizedTool, materialData, operationType, options, vendorData);
    const docResult = this.getOptimalDOC(normalizedTool, materialData, operationType, options, vendorData);

    return {
      tool: normalizedTool,
      material: materialData,
      operation: operationType,
      woc: wocResult,
      doc: docResult,
      vendorReference: vendorData,
      summary: {
        woc_mm: wocResult.value,
        woc_percent: (wocResult.value / normalizedTool.diameter * 100).toFixed(1) + '%',
        doc_mm: docResult.value,
        doc_percent_loc: (docResult.value / normalizedTool.loc * 100).toFixed(1) + '%',
        usesFullLoc: docResult.usesFullLoc
      },
      recommendations: this._generateRecommendations(normalizedTool, materialData, operationType, wocResult, docResult, vendorData)
    };
  },
  /**
   * Get optimal WOC (Width of Cut / Radial Depth)
   */
  getOptimalWOC(tool, material, operation = 'default', options = {}, vendorData = null) {
    const normalizedTool = this._normalizeTool(tool);
    const materialData = typeof material === 'object' ? material : this._getMaterialData(material);

    // Get base WOC config
    const wocConfig = this.config.wocDefaults[operation] || this.config.wocDefaults.default;

    // Start with optimal multiplier
    let wocMultiplier = wocConfig.optimal;

    // v2.0: Check vendor recommendation for ae
    if (vendorData && this._isAdaptiveOperation(operation)) {
      wocMultiplier = vendorData.ae_adaptive || wocConfig.optimal;
    } else if (vendorData && this._isRoughingOperation(operation)) {
      wocMultiplier = vendorData.ae_roughing || wocConfig.optimal;
    }
    // Apply material factor
    const matFactor = this._getMaterialFactor(materialData, 'wocFactor');
    wocMultiplier *= matFactor;

    // Apply tool type factor
    const toolTypeFactor = this._getToolTypeFactor(normalizedTool, 'wocMult');
    wocMultiplier *= toolTypeFactor;

    // Apply flute count factor
    const fluteFactor = this._getFluteFactor(normalizedTool.flutes, 'wocMult');
    wocMultiplier *= fluteFactor;

    // Apply machine rigidity factor
    const rigidityFactor = this._getMachineRigidityFactor(options.machineRigidity, 'wocMult');
    wocMultiplier *= rigidityFactor;

    // Apply aggressiveness adjustment
    if (options.aggressiveness !== undefined) {
      wocMultiplier = this._applyAggressiveness(wocMultiplier, wocConfig, options.aggressiveness);
    }
    // Calculate actual WOC value
    let wocValue = normalizedTool.diameter * wocMultiplier;

    // Apply safety limits
    wocValue = Math.max(wocValue, this.config.safetyLimits.minWocMm);
    wocValue = Math.min(wocValue, normalizedTool.diameter * this.config.safetyLimits.maxWocAsPercentOfDiameter);

    // Round to sensible precision
    wocValue = this._roundToSensiblePrecision(wocValue, normalizedTool.unit);

    return {
      value: wocValue,
      multiplier: wocMultiplier,
      range: {
        min: this._roundToSensiblePrecision(normalizedTool.diameter * wocConfig.min * matFactor, normalizedTool.unit),
        optimal: wocValue,
        max: this._roundToSensiblePrecision(normalizedTool.diameter * wocConfig.max * matFactor, normalizedTool.unit)
      },
      rationale: this._buildWocRationale(normalizedTool, materialData, operation, wocMultiplier, vendorData)
    };
  },
  /**
   * v2.0 ENHANCED: Get optimal DOC - PRIORITIZES FULL LOC FOR ROUGHING
   */
  getOptimalDOC(tool, material, operation = 'default', options = {}, vendorData = null) {
    const normalizedTool = this._normalizeTool(tool);
    const materialData = typeof material === 'object' ? material : this._getMaterialData(material);
    const loc = normalizedTool.loc;

    // Get base DOC config
    const docConfig = this.config.docDefaults[operation] || this.config.docDefaults.default;

    // v2.0: Check if this is a roughing operation that should prioritize LOC
    const isRoughing = this._isRoughingOperation(operation);
    const isAdaptive = this._isAdaptiveOperation(operation);
    const shouldPrioritizeLoc = docConfig.prioritizeLoc || isRoughing || isAdaptive;

    let docValue;
    let usesFullLoc = false;
    let rationale = '';

    // v2.0 KEY LOGIC: PRIORITIZE FULL LOC FOR ROUGHING

    if (shouldPrioritizeLoc && isAdaptive) {
      // ADAPTIVE/HSM: USE FULL LOC (the key enhancement)
      const maxLocMult = this._getMaterialFactor(materialData, 'maxLocMult');
      const rigidityFactor = this._getMachineRigidityFactor(options.machineRigidity, 'docMult');

      // Get vendor-specific multiplier if available
      let locMultiplier = 1.0;
      if (vendorData && vendorData.ap_roughing_mult) {
        locMultiplier = vendorData.ap_roughing_mult;
      }
      docValue = loc * maxLocMult * locMultiplier * rigidityFactor;
      usesFullLoc = docValue >= loc * 0.9;  // >90% = "full LOC"

      rationale = `HSM/Adaptive: Using ${(docValue/loc*100).toFixed(0)}% of LOC (${loc.toFixed(2)}mm). ` +
                  `Full flute utilization maximizes tool life and MRR.`;

    } else if (shouldPrioritizeLoc && isRoughing) {
      // CONVENTIONAL ROUGHING: Target 85-100% of LOC
      const maxLocMult = this._getMaterialFactor(materialData, 'maxLocMult');
      const rigidityFactor = this._getMachineRigidityFactor(options.machineRigidity, 'docMult');

      let locMultiplier = docConfig.optimal;  // 0.85 for conventional
      if (vendorData && vendorData.ap_roughing_mult) {
        locMultiplier = Math.min(locMultiplier, vendorData.ap_roughing_mult);
      }
      docValue = loc * maxLocMult * locMultiplier * rigidityFactor;
      usesFullLoc = docValue >= loc * 0.8;

      rationale = `Roughing: Using ${(docValue/loc*100).toFixed(0)}% of LOC for optimal tool life.`;

    } else {
      // FINISHING/OTHER: Use traditional calculation
      let baseValue;
      switch (docConfig.base) {
        case 'loc':
          baseValue = loc;
          break;
        case 'fixed':
          baseValue = 1.0;
          break;
        case 'diameter':
        default:
          baseValue = normalizedTool.diameter;
      }
      let docMultiplier = docConfig.optimal;
      docMultiplier *= this._getMaterialFactor(materialData, 'docFactor');
      docMultiplier *= this._getToolTypeFactor(normalizedTool, 'docMult');
      docMultiplier *= this._getFluteFactor(normalizedTool.flutes, 'docMult');
      docMultiplier *= this._getMachineRigidityFactor(options.machineRigidity, 'docMult');

      if (options.aggressiveness !== undefined) {
        docMultiplier = this._applyAggressiveness(docMultiplier, docConfig, options.aggressiveness);
      }
      docValue = baseValue * docMultiplier;
      usesFullLoc = false;
      rationale = `${operation}: DOC based on ${docConfig.base} with material/tool adjustments.`;
    }
    // SPECIAL CASE: Part depth less than LOC
    if (options.partDepth && options.partDepth < loc && isRoughing) {
      // If part is shallower than LOC, use part depth (single pass to final depth)
      docValue = options.partDepth;
      usesFullLoc = false;
      rationale = `Part depth (${options.partDepth.toFixed(2)}mm) < LOC - using single pass to final depth.`;
    }
    // Apply safety limits
    docValue = Math.max(docValue, this.config.safetyLimits.minDocMm);
    docValue = Math.min(docValue, loc);  // Never exceed LOC

    // Round to sensible precision
    docValue = this._roundToSensiblePrecision(docValue, normalizedTool.unit);

    // Calculate range
    const maxLocMult = this._getMaterialFactor(materialData, 'maxLocMult');
    const range = {
      min: this._roundToSensiblePrecision(loc * docConfig.min, normalizedTool.unit),
      optimal: docValue,
      max: this._roundToSensiblePrecision(loc * maxLocMult, normalizedTool.unit)
    };
    return {
      value: docValue,
      usesFullLoc: usesFullLoc,
      loc: loc,
      locUtilization: (docValue / loc * 100).toFixed(1) + '%',
      range: range,
      rationale: rationale,
      vendorNote: vendorData ? vendorData.notes : null
    };
  },
  /**
   * Get optimal DOC prioritizing full LOC (convenience method)
   */
  getOptimalRoughingDOC(tool, material, partDepth = null, options = {}) {
    return this.getOptimalDOC(tool, material, 'adaptive_roughing', {
      ...options,
      partDepth: partDepth
    });
  },
  /**
   * Get stepover for scallop height control
   */
  getStepoverForScallop(tool, targetScallop = 0.01) {
    const normalizedTool = this._normalizeTool(tool);

    let radius;
    if (normalizedTool.type === 'endmill_ball' || normalizedTool.type === 'ball') {
      radius = normalizedTool.diameter / 2;
    } else if (normalizedTool.cornerRadius) {
      radius = normalizedTool.cornerRadius;
    } else {
      radius = normalizedTool.diameter / 2;
    }
    // stepover = 2 * sqrt(2*R*h - h^2) where h = scallop height
    const stepover = 2 * Math.sqrt(2 * radius * targetScallop - targetScallop * targetScallop);

    return {
      stepover: this._roundToSensiblePrecision(stepover, normalizedTool.unit),
      scallop: targetScallop,
      radius: radius,
      formula: 'stepover = 2√(2Rh - h²)'
    };
  },
  /**
   * Get chip thinning compensation factor
   */
  getChipThinningFactor(woc, diameter) {
    const radialEngagement = woc / diameter;

    if (radialEngagement >= 0.5) {
      return { factor: 1.0, feedMultiplier: 1.0, note: 'No compensation needed (ae ≥ 50%)' };
    }
    // CTF = 1 / sqrt(1 - (1 - 2*ae/D)²)
    const factor = 1 - 2 * radialEngagement;
    const chipThinningFactor = 1 / Math.sqrt(1 - factor * factor);

    return {
      factor: chipThinningFactor,
      feedMultiplier: chipThinningFactor,
      radialEngagement: (radialEngagement * 100).toFixed(1) + '%',
      note: `Increase feed by ${((chipThinningFactor - 1) * 100).toFixed(0)}% to maintain chip thickness`
    };
  },
  // HELPER METHODS

  _normalizeTool(tool) {
    if (!tool) {
      return {
        diameter: 10,
        loc: 25,
        flutes: 4,
        type: 'endmill',
        unit: 'mm'
      };
    }
    const diameter = tool.diameter || tool.dia || tool.d || 10;
    const loc = tool.loc || tool.fluteLength || tool.length_of_cut || diameter * 2.5;

    return {
      diameter: diameter,
      loc: loc,
      flutes: tool.flutes || tool.fluteCount || 4,
      type: tool.type || 'endmill',
      cornerRadius: tool.cornerRadius || tool.corner_radius || 0,
      coating: tool.coating || 'TiAlN',
      material: tool.toolMaterial || tool.material || 'carbide',
      unit: tool.unit || 'mm',
      manufacturer: tool.manufacturer || null
    };
  },
  _getMaterialData(material) {
    if (!material) return { name: 'default', category: 'default' };

    const materialStr = (typeof material === 'string') ? material.toLowerCase().replace(/[- ]/g, '_') : 'default';

    // Common material mappings
    const mappings = {
      '6061': 'aluminum', '7075': 'aluminum_alloy', 'aluminum': 'aluminum',
      '1018': 'mild_steel', '1045': 'carbon_steel', '4140': 'alloy_steel',
      'd2': 'tool_steel', 'a2': 'tool_steel', 'm2': 'tool_steel',
      '304': 'stainless_304', '316': 'stainless_316', '17_4': 'stainless_17_4',
      'stainless': 'stainless_304', 'ss304': 'stainless_304', 'ss316': 'stainless_316',
      'ti6al4v': 'titanium_6al4v', 'ti_6al_4v': 'titanium_6al4v', 'titanium': 'titanium',
      'inconel': 'inconel_718', '718': 'inconel_718',
      'cast_iron': 'cast_iron', 'gray_iron': 'cast_iron',
      'brass': 'brass', 'copper': 'copper', 'bronze': 'bronze',
      'plastic': 'plastic', 'delrin': 'plastic', 'nylon': 'plastic'
    };
    const category = mappings[materialStr] || 'default';

    return { name: material, category: category };
  },
  _normalizeOperation(operation) {
    if (!operation) return 'default';

    const opStr = operation.toLowerCase().replace(/[- ]/g, '_');

    // Map common operation names
    const mappings = {
      'adaptive': 'adaptive_roughing', 'dynamic': 'adaptive_roughing',
      'hsm': 'hsm_roughing', 'high_speed': 'hsm_roughing',
      'roughing': 'conventional_roughing', 'rough': 'conventional_roughing',
      'finishing': 'finish_parallel', 'finish': 'finish_parallel',
      'pocket': 'pocket_adaptive', 'pocketing': 'pocket_adaptive',
      'slot': 'slot_ramping', 'slotting': 'slot_ramping',
      'contour': 'finish_contour', 'profile': 'finish_contour',
      'facing': 'face_milling', 'face': 'face_milling'
    };
    return mappings[opStr] || opStr;
  },
  _isRoughingOperation(operation) {
    const roughingOps = [
      'adaptive_roughing', 'conventional_roughing', 'hsm_roughing',
      'trochoidal', 'volumill', 'pocket_adaptive', 'pocket_spiral',
      'pocket_zigzag', 'rest_machining'
    ];
    return roughingOps.includes(operation);
  },
  _isAdaptiveOperation(operation) {
    const adaptiveOps = [
      'adaptive_roughing', 'hsm_roughing', 'trochoidal',
      'volumill', 'pocket_adaptive'
    ];
    return adaptiveOps.includes(operation);
  },
  _getVendorRecommendation(materialName) {
    if (!materialName) return null;

    const matKey = materialName.toLowerCase().replace(/[- ]/g, '_');

    // Check direct match
    if (this.manufacturerData.vendorRecommendations[matKey]) {
      return this.manufacturerData.vendorRecommendations[matKey];
    }
    // Check mappings
    const mappings = {
      'aluminum': 'aluminum', '6061': 'aluminum', '7075': 'aluminum',
      'steel': 'mild_steel', '1018': 'mild_steel', '1045': 'mild_steel',
      'stainless': 'stainless_304', '304': 'stainless_304', '316': 'stainless_304',
      'titanium': 'titanium_6al4v', 'ti64': 'titanium_6al4v',
      'inconel': 'inconel_718', '718': 'inconel_718'
    };
    if (mappings[matKey] && this.manufacturerData.vendorRecommendations[mappings[matKey]]) {
      return this.manufacturerData.vendorRecommendations[mappings[matKey]];
    }
    return null;
  },
  _getMaterialFactor(material, factorType) {
    const category = material.category || 'default';
    const factors = this.config.materialFactors[category] || this.config.materialFactors.default;
    return factors[factorType] || 1.0;
  },
  _getToolTypeFactor(tool, factorType) {
    const toolType = tool.type || 'default';
    const factors = this.config.toolTypeFactors[toolType] || this.config.toolTypeFactors.default;
    return factors[factorType] || 1.0;
  },
  _getFluteFactor(flutes, factorType) {
    const fluteCount = flutes || 4;
    const factors = this.config.fluteFactors[fluteCount] || this.config.fluteFactors.default;
    return factors[factorType] || 1.0;
  },
  _getMachineRigidityFactor(rigidity, factorType) {
    const level = rigidity || 'rigid';
    const factors = this.config.machineRigidityFactors[level] || this.config.machineRigidityFactors.default;
    return factors[factorType] || 1.0;
  },
  _applyAggressiveness(value, config, aggressiveness) {
    // aggressiveness: 0 = min, 50 = optimal, 100 = max
    const normalizedAgg = Math.max(0, Math.min(100, aggressiveness)) / 100;

    if (normalizedAgg < 0.5) {
      const ratio = normalizedAgg * 2;
      return config.min + (config.optimal - config.min) * ratio;
    } else {
      const ratio = (normalizedAgg - 0.5) * 2;
      return config.optimal + (config.max - config.optimal) * ratio;
    }
  },
  _roundToSensiblePrecision(value, unit = 'mm') {
    if (unit === 'in' || unit === 'inch') {
      if (value >= 1) return Math.round(value * 100) / 100;
      if (value >= 0.1) return Math.round(value * 1000) / 1000;
      return Math.round(value * 10000) / 10000;
    } else {
      if (value >= 10) return Math.round(value * 10) / 10;
      if (value >= 1) return Math.round(value * 100) / 100;
      return Math.round(value * 1000) / 1000;
    }
  },
  _buildWocRationale(tool, material, operation, multiplier, vendorData) {
    const parts = [];
    parts.push(`Operation: ${operation}`);
    parts.push(`ae = ${(multiplier * 100).toFixed(1)}% of Ø${tool.diameter}mm`);
    if (vendorData) {
      parts.push(`Vendor recommendation applied`);
    }
    return parts.join('. ');
  },
  _generateRecommendations(tool, material, operation, wocResult, docResult, vendorData) {
    const recs = [];

    // LOC utilization recommendation
    if (docResult.usesFullLoc) {
      recs.push({
        type: 'optimal',
        message: 'Using full LOC for maximum tool life and efficiency',
        icon: '✓'
      });
    }
    // Chip thinning check
    const chipThin = this.getChipThinningFactor(wocResult.value, tool.diameter);
    if (chipThin.factor > 1.1) {
      recs.push({
        type: 'adjustment',
        message: `Chip thinning: Increase feed by ${((chipThin.factor - 1) * 100).toFixed(0)}%`,
        icon: '↑'
      });
    }
    // Vendor notes
    if (vendorData && vendorData.notes) {
      recs.push({
        type: 'vendor',
        message: vendorData.notes,
        icon: 'ℹ'
      });
    }
    return recs;
  },
  // INTEGRATION WITH PRISM SYSTEMS

  /**
   * Integration with PRISM_REAL_TOOLPATH_ENGINE
   */
  integrateWithToolpath() {
    if (typeof PRISM_REAL_TOOLPATH_ENGINE !== 'undefined') {
      const self = this;

      const originalGenerate = PRISM_REAL_TOOLPATH_ENGINE.generateAdaptiveClearing;
      if (originalGenerate) {
        PRISM_REAL_TOOLPATH_ENGINE.generateAdaptiveClearing = function(stock, part, tool, params) {
          // Auto-fill WOC/DOC if not specified
          if (!params.woc || !params.doc) {
            const optimal = self.getOptimalParams(tool, params.material || 'steel', 'adaptive_roughing');
            params.woc = params.woc || optimal.woc.value;
            params.doc = params.doc || optimal.doc.value;
          }
          return originalGenerate.call(this, stock, part, tool, params);
        };
      }
    }
    return this;
  },
  /**
   * Integration with PRISM_CAM_WORKFLOW
   */
  integrateWithWorkflow() {
    if (typeof PRISM_CAM_WORKFLOW !== 'undefined') {
      PRISM_CAM_WORKFLOW.intelligentCuttingParams = this;
    }
    return this;
  }
}