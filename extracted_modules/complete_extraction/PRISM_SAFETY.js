const PRISM_SAFETY = {
  version: '8.0.0',

  // COOLANT REQUIREMENTS BY MATERIAL

  coolantRequirements: {
    // Steel materials - Generally need flood coolant
    steel: {
      required: true,
      type: 'flood',
      warning: 'Steel machining requires flood coolant to prevent tool wear and maintain surface finish.',
      alternatives: ['mist', 'air_blast'],
      exceptions: ['graphite_coated_tools', 'ceramic_inserts']
    },
    // Stainless steel - Critical cooling needed
    stainless: {
      required: true,
      type: 'flood_high_pressure',
      warning: 'CRITICAL: Stainless steel work hardens. High-pressure flood coolant essential.',
      alternatives: [],
      exceptions: []
    },
    // Aluminum - Flood preferred, MQL acceptable
    aluminum: {
      required: true,
      type: 'flood',
      warning: 'Aluminum machining benefits from flood coolant for chip evacuation.',
      alternatives: ['mist', 'mql'],
      exceptions: ['dry_with_air_blast']
    },
    // Titanium - Critical cooling
    titanium: {
      required: true,
      type: 'flood_high_pressure',
      warning: 'CRITICAL: Titanium generates extreme heat. High-pressure coolant through spindle required.',
      alternatives: [],
      exceptions: [],
      tscRequired: true
    },
    // Superalloys (Inconel, etc.) - Critical
    superalloy: {
      required: true,
      type: 'flood_high_pressure',
      warning: 'CRITICAL: Superalloys require high-pressure through-spindle coolant. Tool life severely affected without it.',
      alternatives: [],
      exceptions: [],
      tscRequired: true
    },
    // Cast iron - Often dry or mist
    cast_iron: {
      required: false,
      type: 'dry_or_mist',
      warning: 'Cast iron can be machined dry. Use mist coolant for improved tool life.',
      alternatives: ['air_blast', 'flood'],
      exceptions: []
    },
    // Plastics - Air or mist only
    plastic: {
      required: false,
      type: 'air_blast',
      warning: 'WARNING: Avoid flood coolant on plastics. Use air blast or dry machining.',
      alternatives: ['mist_light'],
      exceptions: [],
      floodWarning: 'Flood coolant may damage plastic materials or cause cracking'
    },
    // Composites - Special handling
    composite: {
      required: false,
      type: 'dry_with_vacuum',
      warning: 'WARNING: Composites require vacuum extraction for dust. Avoid liquid coolants.',
      alternatives: ['air_blast_with_extraction'],
      exceptions: [],
      healthWarning: 'Composite dust is hazardous. Use proper extraction and PPE.'
    }
  },
  // CHIP LOAD SAFETY LIMITS

  chipLoadLimits: {
    // By tool type and material
    endmill: {
      aluminum: { min: 0.002, max: 0.012, optimal: 0.006, unit: 'ipt' },
      steel: { min: 0.001, max: 0.006, optimal: 0.003, unit: 'ipt' },
      stainless: { min: 0.0008, max: 0.004, optimal: 0.002, unit: 'ipt' },
      titanium: { min: 0.0006, max: 0.003, optimal: 0.0015, unit: 'ipt' },
      cast_iron: { min: 0.002, max: 0.008, optimal: 0.004, unit: 'ipt' }
    },
    drill: {
      aluminum: { min: 0.004, max: 0.012, optimal: 0.008, unit: 'ipr' },
      steel: { min: 0.002, max: 0.008, optimal: 0.004, unit: 'ipr' },
      stainless: { min: 0.001, max: 0.005, optimal: 0.003, unit: 'ipr' },
      titanium: { min: 0.001, max: 0.004, optimal: 0.002, unit: 'ipr' }
    }
  },
  // SAFETY CHECK FUNCTIONS

  checkCoolantRequirement(material) {
    const mat = material.toLowerCase();

    // Determine material category
    let category = 'steel'; // default
    if (mat.includes('stainless') || mat.includes('304') || mat.includes('316')) {
      category = 'stainless';
    } else if (mat.includes('aluminum') || mat.includes('6061') || mat.includes('7075')) {
      category = 'aluminum';
    } else if (mat.includes('titanium') || mat.includes('ti-6al')) {
      category = 'titanium';
    } else if (mat.includes('inconel') || mat.includes('hastelloy') || mat.includes('waspaloy')) {
      category = 'superalloy';
    } else if (mat.includes('cast iron') || mat.includes('ductile')) {
      category = 'cast_iron';
    } else if (mat.includes('plastic') || mat.includes('delrin') || mat.includes('peek')) {
      category = 'plastic';
    } else if (mat.includes('carbon fiber') || mat.includes('composite') || mat.includes('cfrp')) {
      category = 'composite';
    }
    const req = this.coolantRequirements[category];

    return {
      category,
      required: req.required,
      type: req.type,
      warning: req.warning,
      alternatives: req.alternatives,
      tscRequired: req.tscRequired || false,
      healthWarning: req.healthWarning || null
    };
  },
  validateChipLoad(toolType, material, calculatedChipLoad) {
    const mat = material.toLowerCase();
    let matCategory = 'steel';

    if (mat.includes('aluminum')) matCategory = 'aluminum';
    else if (mat.includes('stainless')) matCategory = 'stainless';
    else if (mat.includes('titanium')) matCategory = 'titanium';
    else if (mat.includes('cast')) matCategory = 'cast_iron';

    const limits = this.chipLoadLimits[toolType]?.[matCategory];
    if (!limits) {
      return { valid: true, warning: null };
    }
    const result = {
      valid: true,
      calculatedValue: calculatedChipLoad,
      limits,
      warnings: []
    };
    if (calculatedChipLoad < limits.min) {
      result.valid = false;
      result.warnings.push({
        severity: 'critical',
        message: `Chip load too LOW (${calculatedChipLoad.toFixed(4)} ${limits.unit}). Minimum: ${limits.min}. Tool rubbing will cause rapid wear.`
      });
    } else if (calculatedChipLoad > limits.max) {
      result.valid = false;
      result.warnings.push({
        severity: 'critical',
        message: `Chip load too HIGH (${calculatedChipLoad.toFixed(4)} ${limits.unit}). Maximum: ${limits.max}. Risk of tool breakage.`
      });
    } else if (calculatedChipLoad < limits.optimal * 0.7) {
      result.warnings.push({
        severity: 'warning',
        message: `Chip load below optimal (${calculatedChipLoad.toFixed(4)} vs ${limits.optimal} ${limits.unit}). Consider increasing feed.`
      });
    } else if (calculatedChipLoad > limits.optimal * 1.3) {
      result.warnings.push({
        severity: 'warning',
        message: `Chip load above optimal (${calculatedChipLoad.toFixed(4)} vs ${limits.optimal} ${limits.unit}). Monitor tool wear.`
      });
    }
    return result;
  },
  checkSpindleSpeed(rpm, toolDiameter, material, toolType = 'endmill') {
    const result = {
      valid: true,
      rpm,
      warnings: [],
      sfm: (rpm * Math.PI * toolDiameter) / 12 // Calculate SFM
    };
    // Material-specific SFM limits
    const sfmLimits = {
      aluminum: { min: 500, max: 3000 },
      steel: { min: 100, max: 800 },
      stainless: { min: 75, max: 400 },
      titanium: { min: 50, max: 200 },
      cast_iron: { min: 100, max: 500 }
    };
    const mat = material.toLowerCase();
    let limits = sfmLimits.steel;
    if (mat.includes('aluminum')) limits = sfmLimits.aluminum;
    else if (mat.includes('stainless')) limits = sfmLimits.stainless;
    else if (mat.includes('titanium')) limits = sfmLimits.titanium;
    else if (mat.includes('cast')) limits = sfmLimits.cast_iron;

    if (result.sfm < limits.min) {
      result.warnings.push({
        severity: 'warning',
        message: `SFM too low (${result.sfm.toFixed(0)} vs min ${limits.min}). May cause poor chip formation.`
      });
    } else if (result.sfm > limits.max) {
      result.valid = false;
      result.warnings.push({
        severity: 'critical',
        message: `SFM too high (${result.sfm.toFixed(0)} vs max ${limits.max}). Risk of tool failure and excessive heat.`
      });
    }
    // Small tool high RPM check
    if (toolDiameter < 0.125 && rpm > 20000) {
      result.warnings.push({
        severity: 'warning',
        message: `Very high RPM on small tool. Ensure spindle can achieve ${rpm} RPM.`
      });
    }
    return result;
  },
  checkToolDeflection(toolDiameter, stickout, cuttingForce = null) {
    const result = {
      valid: true,
      stickoutRatio: stickout / toolDiameter,
      warnings: []
    };
    // Stickout ratio warnings
    if (result.stickoutRatio > 5) {
      result.valid = false;
      result.warnings.push({
        severity: 'critical',
        message: `Tool stickout too long (${result.stickoutRatio.toFixed(1)}:1 ratio). Maximum recommended: 4:1. High deflection risk.`
      });
    } else if (result.stickoutRatio > 4) {
      result.warnings.push({
        severity: 'warning',
        message: `Tool stickout at upper limit (${result.stickoutRatio.toFixed(1)}:1). Consider reducing for better accuracy.`
      });
    } else if (result.stickoutRatio > 3) {
      result.warnings.push({
        severity: 'info',
        message: `Tool stickout acceptable (${result.stickoutRatio.toFixed(1)}:1). Monitor for chatter.`
      });
    }
    return result;
  },
  // COMPLETE SAFETY CHECK

  performCompleteSafetyCheck(params) {
    const {
      material,
      toolType,
      toolDiameter,
      rpm,
      feedRate,
      flutes,
      stickout,
      hasCoolant,
      coolantType
    } = params;

    const results = {
      overall: 'PASS',
      checks: [],
      criticalWarnings: [],
      warnings: [],
      recommendations: []
    };
    // 1. Coolant check
    const coolantCheck = this.checkCoolantRequirement(material);
    if (coolantCheck.required && !hasCoolant) {
      results.criticalWarnings.push(coolantCheck.warning);
      results.overall = 'FAIL';
    } else if (coolantCheck.tscRequired && coolantType !== 'through_spindle') {
      results.criticalWarnings.push('Through-spindle coolant required for this material.');
      results.overall = 'FAIL';
    }
    results.checks.push({ name: 'Coolant', status: coolantCheck.required && !hasCoolant ? 'FAIL' : 'PASS', details: coolantCheck });

    // 2. Chip load check
    if (rpm && feedRate && flutes) {
      const chipLoad = feedRate / (rpm * flutes);
      const chipLoadCheck = this.validateChipLoad(toolType, material, chipLoad);
      if (!chipLoadCheck.valid) {
        chipLoadCheck.warnings.forEach(w => {
          if (w.severity === 'critical') {
            results.criticalWarnings.push(w.message);
            results.overall = 'FAIL';
          } else {
            results.warnings.push(w.message);
          }
        });
      }
      results.checks.push({ name: 'Chip Load', status: chipLoadCheck.valid ? 'PASS' : 'FAIL', details: chipLoadCheck });
    }
    // 3. Spindle speed check
    if (rpm && toolDiameter) {
      const spindleCheck = this.checkSpindleSpeed(rpm, toolDiameter, material, toolType);
      if (!spindleCheck.valid) {
        spindleCheck.warnings.forEach(w => {
          if (w.severity === 'critical') {
            results.criticalWarnings.push(w.message);
            results.overall = 'FAIL';
          } else {
            results.warnings.push(w.message);
          }
        });
      }
      results.checks.push({ name: 'Spindle Speed', status: spindleCheck.valid ? 'PASS' : 'FAIL', details: spindleCheck });
    }
    // 4. Tool deflection check
    if (toolDiameter && stickout) {
      const deflectionCheck = this.checkToolDeflection(toolDiameter, stickout);
      if (!deflectionCheck.valid) {
        deflectionCheck.warnings.forEach(w => {
          results.criticalWarnings.push(w.message);
          results.overall = 'FAIL';
        });
      }
      results.checks.push({ name: 'Tool Deflection', status: deflectionCheck.valid ? 'PASS' : 'FAIL', details: deflectionCheck });
    }
    // Generate recommendations
    if (results.overall === 'FAIL') {
      results.recommendations.push('Review all critical warnings before proceeding.');
      results.recommendations.push('Adjust parameters to address safety concerns.');
    }
    return results;
  },
  // LOGGING AND REPORTING

  logSafetyCheck(results) {
    console.group('[PRISM_SAFETY] Safety Check Results');
    console.log(`Overall: ${results.overall}`);

    if (results.criticalWarnings.length > 0) {
      console.group('🚨 CRITICAL WARNINGS');
      results.criticalWarnings.forEach(w => console.error(w));
      console.groupEnd();
    }
    if (results.warnings.length > 0) {
      console.group('⚠️ Warnings');
      results.warnings.forEach(w => console.warn(w));
      console.groupEnd();
    }
    console.group('Checks');
    results.checks.forEach(c => {
      console.log(`${c.status === 'PASS' ? '✓' : '✗'} ${c.name}: ${c.status}`);
    });
    console.groupEnd();

    console.groupEnd();

    return results;
  }
}