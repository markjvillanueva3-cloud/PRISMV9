const PRISM_CAM_CUTTING_PARAM_BRIDGE = {
  version: '1.0.0',
  lastUpdated: '2026-01-06',

  /**
   * Get optimized parameters for a specific toolpath operation
   * Combines PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE with MANUFACTURER_CUTTING_DATA
   */
  getToolpathParameters(operation, tool, material, machine, options = {}) {
    // Get base parameters from intelligent engine
    const baseParams = PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE.getOptimalParams(
      tool, material, operation.type, options
    );

    // Check manufacturer data for specific recommendations
    const mfrData = this._getManufacturerData(tool, material);

    // Apply machine-specific adjustments
    const machineAdjusted = this._applyMachineFactors(baseParams, machine);

    // Apply operation-specific modifiers
    const finalParams = this._applyOperationModifiers(machineAdjusted, operation);

    return {
      // Core cutting parameters
      rpm: this._calculateRPM(tool, finalParams, material),
      feedRate: this._calculateFeedRate(tool, finalParams, material),

      // Depth settings (v8.9.181: prioritizes full LOC for roughing)
      depthOfCut: finalParams.doc.value,
      widthOfCut: finalParams.woc.value,

      // Full LOC flag for adaptive/HSM
      usesFullLoc: finalParams.doc.usesFullLoc,

      // Machine-specific adjustments
      machineAdjustments: machineAdjusted.adjustments,

      // Manufacturer recommendations
      manufacturerData: mfrData,

      // Detailed rationale
      rationale: this._buildRationale(tool, material, operation, finalParams, mfrData),

      // Warnings and suggestions
      warnings: this._checkWarnings(tool, material, operation, finalParams, machine)
    };
  },
  /**
   * Apply parameters to toolpath object
   */
  applyToToolpath(toolpath, parameters) {
    return {
      ...toolpath,

      // Speed/feed settings
      spindleSpeed: parameters.rpm,
      feedRate: parameters.feedRate,
      plungeRate: parameters.feedRate * 0.5,
      rampRate: parameters.feedRate * 0.7,

      // Depth settings
      stepdown: parameters.depthOfCut,
      stepover: parameters.widthOfCut,

      // Metadata
      cuttingParams: {
        source: 'PRISM_CAM_CUTTING_PARAM_BRIDGE',
        usesFullLoc: parameters.usesFullLoc,
        manufacturerRef: parameters.manufacturerData?.source,
        rationale: parameters.rationale
      },
      // Apply any warnings
      warnings: parameters.warnings
    };
  },
  /**
   * Batch apply parameters to multiple operations
   */
  applyToOperationList(operations, tool, material, machine) {
    return operations.map(op => {
      const params = this.getToolpathParameters(op, tool, material, machine);
      return this.applyToToolpath(op, params);
    });
  },
  /**
   * Generate G-code with embedded cutting parameter comments
   */
  generateParameterComments(parameters) {
    const lines = [
      `(PRISM CUTTING PARAMETERS v8.9.181)`,
      `(RPM: ${parameters.rpm})`,
      `(FEED: ${parameters.feedRate.toFixed(1)} MM/MIN)`,
      `(DOC: ${parameters.depthOfCut.toFixed(3)} MM ${parameters.usesFullLoc ? '- FULL LOC' : ''})`,
      `(WOC: ${parameters.widthOfCut.toFixed(3)} MM)`,
    ];

    if (parameters.manufacturerData) {
      lines.push(`(SOURCE: ${parameters.manufacturerData.source})`);
    }
    if (parameters.warnings && parameters.warnings.length > 0) {
      lines.push(`(WARNINGS: ${parameters.warnings.length})`);
    }
    return lines.join('\n');
  },
  // PRIVATE HELPER METHODS

  _getManufacturerData(tool, material) {
    // Check MANUFACTURER_CUTTING_DATA if available
    if (typeof MANUFACTURER_CUTTING_DATA !== 'undefined') {
      const toolMfr = tool.manufacturer?.toLowerCase();
      const matCategory = this._getMaterialCategory(material);

      if (toolMfr && MANUFACTURER_CUTTING_DATA[toolMfr]) {
        const mfrData = MANUFACTURER_CUTTING_DATA[toolMfr];
        if (mfrData.materials && mfrData.materials[matCategory]) {
          return {
            source: toolMfr.toUpperCase(),
            data: mfrData.materials[matCategory]
          };
        }
      }
    }
    return null;
  },
  _getMaterialCategory(material) {
    const name = typeof material === 'string' ? material.toLowerCase() :
                 (material.name || material.category || '').toLowerCase();

    if (name.includes('aluminum') || name.includes('6061') || name.includes('7075')) return 'aluminum';
    if (name.includes('steel') && !name.includes('stainless')) return 'steel';
    if (name.includes('stainless') || name.includes('304') || name.includes('316')) return 'stainless';
    if (name.includes('titanium') || name.includes('ti-6al')) return 'titanium';
    if (name.includes('inconel') || name.includes('718')) return 'inconel';
    if (name.includes('cast') && name.includes('iron')) return 'cast_iron';

    return 'default';
  },
  _applyMachineFactors(params, machine) {
    if (!machine) return { ...params, adjustments: [] };

    const adjustments = [];
    let adjustedParams = { ...params };

    // Check machine rigidity
    const rigidity = machine.rigidity || 'rigid';
    if (rigidity === 'light' || rigidity === 'moderate') {
      adjustments.push('Reduced parameters for machine rigidity');
      // Params already adjusted by PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE
    }
    // Check spindle power
    if (machine.spindlePower && machine.spindlePower < 15) {
      adjustments.push('Limited by spindle power');
    }
    // Check max RPM
    if (machine.maxRPM) {
      adjustments.push(`Max RPM limited to ${machine.maxRPM}`);
    }
    return {
      ...adjustedParams,
      adjustments: adjustments,
      machine: {
        maxRPM: machine.maxRPM || 20000,
        maxFeed: machine.maxFeed || 15000,
        rigidity: rigidity
      }
    };
  },
  _applyOperationModifiers(params, operation) {
    const opType = operation.type || operation.strategy || 'default';

    // Operation-specific overrides
    const modifiers = {
      'adaptive_roughing': { speedMult: 1.0, feedMult: 1.0 },
      'hsm_roughing': { speedMult: 1.3, feedMult: 1.5 },
      'trochoidal': { speedMult: 1.2, feedMult: 1.4 },
      'conventional_roughing': { speedMult: 0.9, feedMult: 0.9 },
      'finish_parallel': { speedMult: 1.1, feedMult: 0.8 },
      'finish_contour': { speedMult: 1.0, feedMult: 0.7 },
      'drilling': { speedMult: 0.8, feedMult: 1.0 }
    };
    const mod = modifiers[opType] || { speedMult: 1.0, feedMult: 1.0 };

    return {
      ...params,
      operationModifiers: mod
    };
  },
  _calculateRPM(tool, params, material) {
    // Get SFM from material data or params
    const sfm = this._getSFM(material, tool);

    // Calculate RPM: (SFM × 12) / (π × D)
    const diameter = tool.diameter || tool.dia || 10; // mm
    const diameterInch = diameter / 25.4;

    let rpm = (sfm * 12) / (Math.PI * diameterInch);

    // Apply operation modifiers
    if (params.operationModifiers) {
      rpm *= params.operationModifiers.speedMult;
    }
    // Limit to machine max
    if (params.machine && params.machine.maxRPM) {
      rpm = Math.min(rpm, params.machine.maxRPM);
    }
    return Math.round(rpm);
  },
  _calculateFeedRate(tool, params, material) {
    const rpm = this._calculateRPM(tool, params, material);
    const flutes = tool.flutes || 4;
    const chipload = this._getChipload(material, tool);

    // IPM = RPM × chipload × flutes
    let feedIPM = rpm * chipload * flutes;

    // Convert to mm/min
    let feedMMM = feedIPM * 25.4;

    // Apply operation modifiers
    if (params.operationModifiers) {
      feedMMM *= params.operationModifiers.feedMult;
    }
    // Apply chip thinning compensation for low radial engagement
    if (params.woc && tool.diameter) {
      const radialEngagement = params.woc.value / tool.diameter;
      if (radialEngagement < 0.5) {
        const ctf = PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE._calculateChipThinningFactor(radialEngagement);
        feedMMM *= ctf;
      }
    }
    // Limit to machine max
    if (params.machine && params.machine.maxFeed) {
      feedMMM = Math.min(feedMMM, params.machine.maxFeed);
    }
    return Math.round(feedMMM);
  },
  _getSFM(material, tool) {
    // Default SFM values by material category
    const sfmDefaults = {
      aluminum: 1000,
      steel: 400,
      stainless: 250,
      titanium: 150,
      inconel: 80,
      cast_iron: 350,
      default: 400
    };
    const category = this._getMaterialCategory(material);
    return sfmDefaults[category] || sfmDefaults.default;
  },
  _getChipload(material, tool) {
    const diameter = tool.diameter || 10;

    // Base chipload by diameter (rough approximation)
    let baseChipload = diameter * 0.0004; // ~0.002" for 1/2" endmill

    // Adjust by material
    const materialFactors = {
      aluminum: 1.5,
      steel: 1.0,
      stainless: 0.8,
      titanium: 0.6,
      inconel: 0.4,
      cast_iron: 0.9,
      default: 1.0
    };
    const category = this._getMaterialCategory(material);
    const factor = materialFactors[category] || materialFactors.default;

    return baseChipload * factor;
  },
  _buildRationale(tool, material, operation, params, mfrData) {
    const lines = [];

    lines.push(`Operation: ${operation.type || 'default'}`);
    lines.push(`DOC: ${params.doc.value.toFixed(3)}mm (${params.doc.usesFullLoc ? 'FULL LOC' : 'partial'})`);
    lines.push(`WOC: ${params.woc.value.toFixed(3)}mm (${(params.woc.value / tool.diameter * 100).toFixed(0)}% of D)`);

    if (mfrData) {
      lines.push(`Manufacturer data from: ${mfrData.source}`);
    }
    return lines.join('; ');
  },
  _checkWarnings(tool, material, operation, params, machine) {
    const warnings = [];

    // Check for high RPM
    const rpm = this._calculateRPM(tool, params, material);
    if (rpm > 15000) {
      warnings.push('High RPM - ensure tool balance and holder rated for speed');
    }
    // Check for aggressive engagement in hard materials
    const category = this._getMaterialCategory(material);
    if (['titanium', 'inconel', 'stainless'].includes(category)) {
      if (params.woc && params.woc.multiplier > 0.3) {
        warnings.push('High radial engagement in difficult material - consider HSM/adaptive approach');
      }
    }
    // Check tool deflection risk
    const stickout = tool.stickout || tool.loc * 1.5;
    const ldRatio = stickout / tool.diameter;
    if (ldRatio > 5) {
      warnings.push(`High L/D ratio (${ldRatio.toFixed(1)}) - increased deflection risk`);
    }
    return warnings;
  }
}