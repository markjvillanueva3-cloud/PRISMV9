/**
 * PRISM_INTERNAL_POST_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * References: 46
 * Lines: 923
 * Session: R2.3.1 Engine Gap Extraction
 */

const PRISM_INTERNAL_POST_ENGINE = {
  version: '1.0.0',

  // 1. USER SELECTION COLLECTOR - Gathers all UI inputs

  collectUserSelections() {
    const selections = {
      // Machine & Controller
      machine: {
        id: document.getElementById('machineSelect')?.value || null,
        name: document.getElementById('machineSelect')?.options[document.getElementById('machineSelect')?.selectedIndex]?.text || null,
        controller: document.getElementById('controllerSelect')?.value || this._inferController(),
        axes: parseInt(document.getElementById('machineAxes')?.value) || 3
      },
      // Spindle & Power
      spindle: {
        id: document.getElementById('spindleSelect')?.value || null,
        maxRPM: parseInt(document.getElementById('specMaxRpm')?.textContent) || parseInt(document.getElementById('maxRpm')?.value) || 15000,
        peakHP: parseFloat(document.getElementById('specPeakHp')?.textContent) || parseFloat(document.getElementById('peakHp')?.value) || 30,
        taper: document.getElementById('spindleTaper')?.value || 'CAT40'
      },
      // Material
      material: {
        id: document.getElementById('materialSelect')?.value || null,
        group: document.getElementById('materialGroup')?.value || null,
        hardness: parseFloat(document.getElementById('hardness')?.value) || 200,
        hardnessUnit: document.getElementById('hardnessUnit')?.value || 'HB',
        heatTreatment: document.getElementById('heatTreatCondition')?.value || 'annealed'
      },
      // Stock Dimensions
      stock: {
        width: parseFloat(document.getElementById('stockWidth')?.value) || 100,
        length: parseFloat(document.getElementById('stockLength')?.value) || 100,
        height: parseFloat(document.getElementById('stockHeight')?.value) || 25,
        diameter: parseFloat(document.getElementById('stockDiameter')?.value) || null,
        shape: document.getElementById('stockShape')?.value || 'rectangular'
      },
      // Tool Holder
      toolHolder: {
        id: document.getElementById('holderSelect')?.value || null,
        type: document.getElementById('holderType')?.value || 'ER32',
        taper: document.getElementById('holderTaper')?.value || 'CAT40',
        gaugeLength: parseFloat(document.getElementById('holderGaugeLength')?.value) || 75
      },
      // Cutting Tool
      tool: {
        id: document.getElementById('toolSelect')?.value || null,
        diameter: parseFloat(document.getElementById('toolDiameter')?.value) || 12,
        flutes: parseInt(document.getElementById('toolFlutes')?.value) || 4,
        material: document.getElementById('toolMaterial')?.value || 'carbide',
        coating: document.getElementById('toolCoating')?.value || 'TiAlN',
        stickout: parseFloat(document.getElementById('toolStickout')?.value) || 50
      },
      // Workholding & Fixture
      workholding: {
        type: document.getElementById('workholdingType')?.value || 'vise',
        rigidity: document.getElementById('rigidityLevel')?.value || 'standard',
        fixtureId: document.getElementById('fixtureSelect')?.value || null,
        jawWidth: parseFloat(document.getElementById('jawWidth')?.value) || 150
      },
      // Cutting Parameters (if user-specified)
      cuttingParams: {
        sfm: parseFloat(document.getElementById('baseSfm')?.value) || null,
        feedPerTooth: parseFloat(document.getElementById('feedPerTooth')?.value) || null,
        depthOfCut: parseFloat(document.getElementById('depthOfCut')?.value) || null,
        stepover: parseFloat(document.getElementById('stepover')?.value) || null
      },
      // Coolant
      coolant: {
        type: document.getElementById('coolantType')?.value || 'flood',
        pressure: document.getElementById('coolantPressure')?.value || 'standard'
      },
      // Operation Type
      operation: {
        type: document.getElementById('operationType')?.value || 'roughing',
        strategy: document.getElementById('machiningStrategy')?.value || 'adaptive'
      }
    };
    return selections;
  },
  /**
   * Infer controller from machine name if not explicitly selected
   */
  _inferController() {
    const machineName = document.getElementById('machineSelect')?.options[document.getElementById('machineSelect')?.selectedIndex]?.text?.toLowerCase() || '';

    if (machineName.includes('haas')) return 'HAAS';
    if (machineName.includes('mazak')) return 'MAZAK';
    if (machineName.includes('okuma')) return 'OKUMA';
    if (machineName.includes('dmg') || machineName.includes('mori')) return 'DMG';
    if (machineName.includes('hurco')) return 'HURCO';
    if (machineName.includes('brother')) return 'BROTHER';
    if (machineName.includes('makino')) return 'MAKINO';
    if (machineName.includes('heidenhain')) return 'HEIDENHAIN';
    if (machineName.includes('siemens')) return 'SIEMENS';

    return 'FANUC'; // Default
  },
  // 2. DATABASE AGGREGATOR - Pulls data from all relevant databases

  aggregateDatabaseData(selections) {
    const data = {
      machineData: null,
      materialData: null,
      toolData: null,
      holderData: null,
      postData: null,
      coolantData: null,
      strategyData: null
    };
    // Get Machine Data
    if (typeof COMPLETE_MACHINE_DATABASE !== 'undefined') {
      data.machineData = this._findInDatabase(COMPLETE_MACHINE_DATABASE, selections.machine.id);
    }
    if (!data.machineData && typeof MACHINE_DATABASE !== 'undefined') {
      data.machineData = this._findInDatabase(MACHINE_DATABASE, selections.machine.id);
    }
    // Get Material Data (using MATERIAL_DATABASE_SYNC)
    if (typeof MATERIAL_DATABASE_SYNC !== 'undefined') {
      data.materialData = MATERIAL_DATABASE_SYNC.getSFMFromDatabase(selections.material.id);
    } else if (typeof MATERIAL_DATABASE !== 'undefined') {
      data.materialData = this._findMaterialInDatabase(selections.material.id);
    }
    // Get Tool Data
    if (typeof PRISM_TOOL_DATABASE !== 'undefined') {
      data.toolData = this._findToolData(selections.tool.id, selections.tool.diameter);
    }
    if (typeof ENDMILL_DATABASE !== 'undefined' && !data.toolData) {
      data.toolData = this._findInDatabase(ENDMILL_DATABASE, selections.tool.id);
    }
    // Get Holder Data
    if (typeof TOOLHOLDING_DATABASE !== 'undefined') {
      data.holderData = this._findInDatabase(TOOLHOLDING_DATABASE, selections.toolHolder.id);
    }
    // Get Post Processor Data
    if (typeof POST_PROCESSOR_UNIVERSAL_UPDATE !== 'undefined') {
      data.postData = POST_PROCESSOR_UNIVERSAL_UPDATE.universalPostGenerator.controllers[selections.machine.controller];
    }
    if (typeof PRISM_POST_PROCESSOR_DATABASE !== 'undefined') {
      data.postData = { ...data.postData, ...this._findInDatabase(PRISM_POST_PROCESSOR_DATABASE, selections.machine.controller) };
    }
    // Get Coolant Data
    if (typeof COOLANT_DATABASE !== 'undefined') {
      data.coolantData = COOLANT_DATABASE[selections.coolant.type];
    }
    if (typeof MQL_DATABASE !== 'undefined' && selections.coolant.type === 'mql') {
      data.coolantData = { ...data.coolantData, ...MQL_DATABASE };
    }
    // Get Strategy Data
    if (typeof COMPREHENSIVE_STRATEGY_DATABASE !== 'undefined') {
      data.strategyData = COMPREHENSIVE_STRATEGY_DATABASE[selections.operation.strategy];
    }
    if (typeof CUTTING_STRATEGY_DATABASE !== 'undefined') {
      data.strategyData = { ...data.strategyData, ...CUTTING_STRATEGY_DATABASE[selections.operation.strategy] };
    }
    return data;
  },
  _findInDatabase(db, id) {
    if (!db || !id) return null;

    // Direct lookup
    if (db[id]) return db[id];

    // Search nested
    for (const [key, value] of Object.entries(db)) {
      if (typeof value === 'object' && value !== null) {
        if (value[id]) return value[id];
        if (value.machines?.[id]) return value.machines[id];
        if (value.tools?.[id]) return value.tools[id];
        if (value.holders?.[id]) return value.holders[id];
      }
    }
    return null;
  },
  _findMaterialInDatabase(materialId) {
    if (typeof MATERIAL_DATABASE === 'undefined') return null;

    for (const [groupKey, group] of Object.entries(MATERIAL_DATABASE)) {
      if (group.materials?.[materialId]) {
        return {
          ...group.materials[materialId],
          isoCode: group.isoCode,
          groupName: group.name
        };
      }
    }
    return null;
  },
  _findToolData(toolId, diameter) {
    if (typeof PRISM_TOOL_DATABASE !== 'undefined') {
      // Search by ID
      if (PRISM_TOOL_DATABASE[toolId]) return PRISM_TOOL_DATABASE[toolId];

      // Search by diameter
      for (const [key, tool] of Object.entries(PRISM_TOOL_DATABASE)) {
        if (tool.diameter === diameter) return tool;
      }
    }
    return null;
  },
  // 3. CALCULATION ENGINE INTEGRATOR - Runs all optimization calculations

  runCalculations(selections, databaseData) {
    const calculations = {
      sfm: null,
      rpm: null,
      feedRate: null,
      depthOfCut: null,
      stepover: null,
      chipThinning: null,
      power: null,
      torque: null,
      deflection: null,
      stability: null,
      toolLife: null,
      surfaceFinish: null,
      thermalAnalysis: null,
      entryStrategy: null,
      rigidityFactor: null
    };
    // START CALCULATION SESSION (prevent duplicate adjustments)
    if (typeof POST_PROCESSOR_UNIVERSAL_UPDATE !== 'undefined') {
      POST_PROCESSOR_UNIVERSAL_UPDATE.duplicateSafeguards.startSession('internal_post_' + Date.now());
    }
    // 1. SFM Calculation (use MATERIAL_DATABASE_SYNC)
    if (typeof MATERIAL_DATABASE_SYNC !== 'undefined') {
      const sfmResult = MATERIAL_DATABASE_SYNC.calculateSFMEnhanced(selections.material.id, {
        operation: selections.operation.type,
        toolMaterial: selections.tool.material + (selections.tool.coating ? '_coated' : ''),
        coating: selections.tool.coating,
        coolant: selections.coolant.type,
        heatTreatCondition: selections.material.heatTreatment
      });
      calculations.sfm = sfmResult.adjustedSFM;
    } else if (selections.cuttingParams.sfm) {
      calculations.sfm = selections.cuttingParams.sfm;
    }
    // 2. RPM Calculation
    calculations.rpm = Math.round((calculations.sfm * 1000) / (Math.PI * selections.tool.diameter));
    calculations.rpm = Math.min(calculations.rpm, selections.spindle.maxRPM); // Limit to machine max

    // 3. Feed Rate (use PRISM engines if available)
    if (typeof PRISM_UNIFIED_CUTTING_ENGINE !== 'undefined') {
      const cuttingResult = PRISM_UNIFIED_CUTTING_ENGINE.calculateOptimizedCuttingParams(
        selections.cuttingParams.feedPerTooth || 0.1,
        {
          material: selections.material.id,
          toolDiameter: selections.tool.diameter,
          radialEngagement: selections.cuttingParams.stepover || selections.tool.diameter * 0.4,
          machineClass: this._getMachineClass(selections.spindle.maxRPM),
          baseSpeed: calculations.rpm
        }
      );
      calculations.feedRate = cuttingResult.optimizedFeed;
      calculations.chipThinning = cuttingResult.chipThinFactor;
    } else {
      const fz = selections.cuttingParams.feedPerTooth || 0.08;
      calculations.feedRate = Math.round(calculations.rpm * fz * selections.tool.flutes);
    }
    // 4. Depth of Cut
    calculations.depthOfCut = selections.cuttingParams.depthOfCut ||
      (selections.operation.type === 'roughing' ? selections.tool.diameter * 1.0 : selections.tool.diameter * 0.1);

    // 5. Stepover
    calculations.stepover = selections.cuttingParams.stepover ||
      (selections.operation.type === 'roughing' ? selections.tool.diameter * 0.4 : selections.tool.diameter * 0.1);

    // 6. Power Calculation
    if (typeof PRISM_ADVANCED_OPTIMIZATION_ENGINE !== 'undefined' && databaseData.materialData?.kc) {
      const mrr = (calculations.depthOfCut * calculations.stepover * calculations.feedRate) / 1000;
      calculations.power = Math.round((mrr * databaseData.materialData.kc) / 60000 * 10) / 10;

      // Check against machine power
      if (calculations.power > selections.spindle.peakHP * 0.8) {
        calculations.powerWarning = 'Power requirement (' + calculations.power + ' HP) exceeds 80% of machine capacity';
        calculations.feedRate = Math.round(calculations.feedRate * (selections.spindle.peakHP * 0.8 / calculations.power));
      }
    }
    // 7. Stability Lobe (chatter check)
    if (typeof PRISM_ADVANCED_OPTIMIZATION_ENGINE !== 'undefined') {
      try {
        const stabilityResult = PRISM_ADVANCED_OPTIMIZATION_ENGINE.stabilityLobes.calculateCriticalDepth({
          naturalFrequency: 800,
          dampingRatio: 0.03,
          stiffness: 2e7,
          kc: databaseData.materialData?.kc || 2000,
          radialEngagement: calculations.stepover,
          toolDiameter: selections.tool.diameter,
          fluteCount: selections.tool.flutes
        });
        calculations.stability = stabilityResult;

        if (calculations.depthOfCut > stabilityResult.criticalDepth) {
          calculations.stabilityWarning = 'Depth of cut may cause chatter. Recommended: ' + stabilityResult.criticalDepth.toFixed(2) + 'mm';
        }
      } catch (e) { /* Stability calculation optional */ }
    }
    // 8. Tool Deflection
    if (typeof calculateDeflection !== 'undefined') {
      const force = (calculations.feedRate / 1000) * selections.tool.flutes * (databaseData.materialData?.kc || 2000);
      calculations.deflection = calculateDeflection(force, selections.tool.stickout, selections.tool.diameter);
    }
    // 9. Tool Life Prediction
    if (typeof PRISM_ADVANCED_OPTIMIZATION_ENGINE !== 'undefined') {
      try {
        calculations.toolLife = PRISM_ADVANCED_OPTIMIZATION_ENGINE.toolLife.calculateToolLife({
          material: selections.material.id,
          cuttingSpeed: calculations.sfm,
          coating: selections.tool.coating,
          feed: calculations.feedRate / calculations.rpm / selections.tool.flutes,
          depth: calculations.depthOfCut
        });
      } catch (e) { /* Tool life optional */ }
    }
    // 10. Surface Finish Prediction
    if (typeof PRISM_ADVANCED_OPTIMIZATION_ENGINE !== 'undefined' && selections.operation.type === 'finishing') {
      try {
        calculations.surfaceFinish = PRISM_ADVANCED_OPTIMIZATION_ENGINE.surfaceFinish.calculateTurningFinish(
          calculations.feedRate / calculations.rpm / selections.tool.flutes,
          selections.tool.diameter / 2
        );
      } catch (e) { /* Surface finish optional */ }
    }
    // 11. Thermal Analysis
    if (typeof PRISM_ADVANCED_OPTIMIZATION_ENGINE !== 'undefined') {
      try {
        calculations.thermalAnalysis = PRISM_ADVANCED_OPTIMIZATION_ENGINE.thermal.estimateCuttingTemperature({
          material: selections.material.id,
          cuttingSpeed: calculations.sfm,
          coating: selections.tool.coating,
          coolant: selections.coolant.type
        });
      } catch (e) { /* Thermal optional */ }
    }
    // 12. Entry Strategy
    if (typeof PRISM_ADVANCED_OPTIMIZATION_ENGINE !== 'undefined') {
      try {
        calculations.entryStrategy = PRISM_ADVANCED_OPTIMIZATION_ENGINE.entryExit.calculateHelixEntry({
          toolDiameter: selections.tool.diameter,
          material: selections.material.id,
          depth: calculations.depthOfCut
        });
      } catch (e) { /* Entry strategy optional */ }
    }
    // 13. Rigidity Factor
    const rigidityFactors = { light: 0.7, standard: 1.0, heavy: 1.2 };
    calculations.rigidityFactor = rigidityFactors[selections.workholding.rigidity] || 1.0;

    // Apply rigidity to feed rate
    calculations.feedRate = Math.round(calculations.feedRate * calculations.rigidityFactor);

    return calculations;
  },
  _getMachineClass(maxRPM) {
    if (maxRPM < 8000) return 'economy';
    if (maxRPM < 12000) return 'standard';
    if (maxRPM < 20000) return 'performance';
    if (maxRPM < 40000) return 'highSpeed';
    return 'ultraHighSpeed';
  },

  // 4. TOOLPATH SELECTOR - Uses full CAM_TOOLPATH_DATABASE (229+ strategies)

  selectOptimalToolpath(selections, calculations) {
    // Get strategies from the full CAM_TOOLPATH_DATABASE if available
    let allStrategies = [];

    // Check for full database
    if (typeof CAM_TOOLPATH_DATABASE !== 'undefined') {
      allStrategies = this._extractStrategiesFromDatabase(CAM_TOOLPATH_DATABASE, selections);
    } else if (typeof LATHE_TOOLPATH_DATABASE !== 'undefined' && selections.operation?.type?.includes('turn')) {
      allStrategies = this._extractStrategiesFromDatabase(LATHE_TOOLPATH_DATABASE, selections);
    }
    // If no database strategies found, use comprehensive fallback
    if (allStrategies.length === 0) {
      allStrategies = this._getComprehensiveStrategies(selections);
    }
    // Score each strategy based on current situation
    const scored = allStrategies.map(s => {
      let score = this._scoreStrategy(s, selections, calculations);
      return { ...s, score };
    });

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    return {
      recommended: scored[0],
      alternatives: scored.slice(1, 5),
      allStrategies: scored,
      totalAvailable: scored.length,
      source: typeof CAM_TOOLPATH_DATABASE !== 'undefined' ? 'CAM_TOOLPATH_DATABASE' : 'COMPREHENSIVE_FALLBACK'
    };
  },
  /**
   * Extract strategies from CAM_TOOLPATH_DATABASE
   */
  _extractStrategiesFromDatabase(database, selections) {
    const strategies = [];
    const opType = selections.operation?.type || 'roughing';

    // Map operation types to database categories
    const categoryMap = {
      'roughing': ['roughing', '2d', '3d'],
      'finishing': ['finishing', '3d'],
      'semi_finishing': ['finishing', '3d'],
      'drilling': ['drilling'],
      'threading': ['drilling'],
      'turning': ['turning'],
      'facing': ['turning', 'roughing'],
      'grooving': ['turning'],
      'boring': ['drilling', 'turning'],
      '4axis': ['4axis', 'roughing', 'finishing'],
      '5axis': ['5axis', '3d']
    };
    const categories = categoryMap[opType] || ['roughing', 'finishing', '3d'];

    // Extract from each CAM software in the database
    for (const [camId, camData] of Object.entries(database)) {
      if (!camData || typeof camData !== 'object') continue;

      for (const category of categories) {
        const categoryStrategies = camData[category];
        if (!Array.isArray(categoryStrategies)) continue;

        for (const strat of categoryStrategies) {
          strategies.push({
            id: strat.id,
            name: strat.name,
            desc: strat.desc || strat.description,
            category: category,
            software: camData.name || camId,
            recommended: strat.recommended || false,
            efficiency: this._estimateEfficiency(strat, category),
            quality: this._estimateQuality(strat, category)
          });
        }
      }
    }
    // Remove duplicates based on name
    const seen = new Set();
    return strategies.filter(s => {
      const key = s.name + '_' + s.category;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },
  /**
   * Estimate efficiency rating for a strategy
   */
  _estimateEfficiency(strategy, category) {
    const baseEfficiency = {
      'roughing': 85,
      '2d': 88,
      '3d': 82,
      '4axis': 80,
      '5axis': 78,
      'finishing': 75,
      'drilling': 90,
      'turning': 85
    };
    let efficiency = baseEfficiency[category] || 80;

    // Adjust based on strategy name hints
    const name = (strategy.name || '').toLowerCase();
    if (name.includes('adaptive') || name.includes('dynamic') || name.includes('hsm')) efficiency += 8;
    if (name.includes('imachining') || name.includes('volumill')) efficiency += 10;
    if (name.includes('high speed') || name.includes('high-speed')) efficiency += 7;
    if (name.includes('trochoidal') || name.includes('peel')) efficiency += 6;
    if (name.includes('rest') || name.includes('leftover')) efficiency -= 5;
    if (strategy.recommended) efficiency += 5;

    return Math.min(98, Math.max(60, efficiency));
  },
  /**
   * Estimate quality rating for a strategy
   */
  _estimateQuality(strategy, category) {
    const baseQuality = {
      'roughing': 70,
      '2d': 75,
      '3d': 85,
      '4axis': 88,
      '5axis': 92,
      'finishing': 95,
      'drilling': 80,
      'turning': 82
    };
    let quality = baseQuality[category] || 80;

    // Adjust based on strategy name hints
    const name = (strategy.name || '').toLowerCase();
    if (name.includes('finish')) quality += 8;
    if (name.includes('scallop') || name.includes('pencil')) quality += 5;
    if (name.includes('morphed') || name.includes('spiral')) quality += 6;
    if (name.includes('geodesic') || name.includes('flow')) quality += 7;
    if (name.includes('rough')) quality -= 5;
    if (strategy.recommended) quality += 3;

    return Math.min(99, Math.max(65, quality));
  },
  /**
   * Score a strategy based on current machining situation
   */
  _scoreStrategy(strategy, selections, calculations) {
    let score = 0;
    const name = (strategy.name || '').toLowerCase();
    const opType = selections.operation?.type || 'roughing';

    // Base score from efficiency and quality
    if (opType === 'finishing' || opType === 'semi_finishing') {
      score = (strategy.efficiency || 80) * 0.3 + (strategy.quality || 85) * 0.7;
    } else {
      score = (strategy.efficiency || 80) * 0.7 + (strategy.quality || 75) * 0.3;
    }
    // Bonus for high-speed machining capable strategies
    if (calculations.rpm > 12000) {
      if (name.includes('adaptive') || name.includes('hsm') || name.includes('dynamic') ||
          name.includes('imachining') || name.includes('volumill')) {
        score += 8;
      }
    }
    // Bonus for hard materials
    if (selections.material?.hardness > 45) {
      if (name.includes('adaptive') || name.includes('trochoidal') || name.includes('peel')) {
        score += 5;
      }
    }
    // Bonus for deep pockets
    if (calculations.depthOfCut > (selections.tool?.diameter || 10)) {
      if (name.includes('volumill') || name.includes('adaptive') || name.includes('wave') || name.includes('hem')) {
        score += 6;
      }
    }
    // Bonus for thin walls
    if (selections.part?.thinWalls) {
      if (name.includes('adaptive') || name.includes('light')) {
        score += 4;
      }
    }
    // Bonus for 5-axis when machine supports it
    if (selections.machine?.axes >= 5 && strategy.category === '5axis') {
      score += 7;
    }
    // Bonus for recommended strategies
    if (strategy.recommended) {
      score += 5;
    }
    // Penalty for mismatched operation type
    if (opType === 'finishing' && strategy.category === 'roughing') score -= 10;
    if (opType === 'roughing' && strategy.category === 'finishing') score -= 10;

    return Math.round(score * 10) / 10;
  },
  /**
   * Comprehensive fallback strategies (expanded from original 30 to 150+)
   */
  _getComprehensiveStrategies(selections) {
    const opType = selections.operation?.type || 'roughing';

    const allStrategies = {
      roughing: [
        { name: 'Adaptive Clearing', efficiency: 95, quality: 75, software: 'Fusion 360, Mastercam, HSMWorks', category: 'roughing' },
        { name: 'High-Efficiency Milling (HEM)', efficiency: 92, quality: 72, software: 'Mastercam, SolidCAM, Edgecam', category: 'roughing' },
        { name: 'Optimized Roughing', efficiency: 90, quality: 73, software: 'GibbsCAM, ESPRIT', category: 'roughing' },
        { name: 'Variable Feed Optimization', efficiency: 88, quality: 74, software: 'VERICUT, Mastercam', category: 'roughing' },
        { name: 'Intelligent Adaptive Roughing', efficiency: 94, quality: 76, software: 'SolidCAM', category: 'roughing' },
        { name: 'Dynamic Milling', efficiency: 91, quality: 74, software: 'Mastercam', category: 'roughing' },
        { name: 'Wave-Pattern Roughing', efficiency: 89, quality: 73, software: 'PowerMill, FeatureCAM', category: 'roughing' },
        { name: '3D Adaptive', efficiency: 93, quality: 75, software: 'Fusion 360', category: 'roughing' },
        { name: 'Trochoidal Milling', efficiency: 87, quality: 72, software: 'All CAM', category: 'roughing' },
        { name: 'Peel Milling', efficiency: 86, quality: 71, software: 'Mastercam', category: 'roughing' },
        { name: 'Area Clearing', efficiency: 84, quality: 70, software: 'All CAM', category: 'roughing' },
        { name: 'Plunge Roughing', efficiency: 82, quality: 68, software: 'PowerMill, hyperMILL', category: 'roughing' },
        { name: 'Pocket Roughing', efficiency: 85, quality: 72, software: 'All CAM', category: 'roughing' },
        { name: 'Face Milling', efficiency: 88, quality: 75, software: 'All CAM', category: 'roughing' },
        { name: 'Slot Milling', efficiency: 83, quality: 73, software: 'All CAM', category: 'roughing' },
        { name: 'Core Roughing', efficiency: 80, quality: 70, software: 'Mastercam, NX', category: 'roughing' },
        { name: 'Z-Level Roughing', efficiency: 81, quality: 74, software: 'All CAM', category: 'roughing' },
        { name: 'Offset Area Clearing', efficiency: 79, quality: 71, software: 'PowerMill', category: 'roughing' },
        { name: 'Radial Roughing', efficiency: 77, quality: 69, software: 'hyperMILL', category: 'roughing' },
        { name: 'Helical Ramping', efficiency: 85, quality: 76, software: 'All CAM', category: 'roughing' }
      ],
      semi_finishing: [
        { name: 'Rest Machining', efficiency: 85, quality: 85, software: 'All CAM', category: 'semi_finishing' },
        { name: 'Z-Level Semi-Finish', efficiency: 82, quality: 88, software: 'All CAM', category: 'semi_finishing' },
        { name: 'Constant Z Semi', efficiency: 80, quality: 87, software: 'Mastercam, PowerMill', category: 'semi_finishing' },
        { name: 'Parallel Semi-Finish', efficiency: 78, quality: 86, software: 'All CAM', category: 'semi_finishing' },
        { name: 'Leftover Machining', efficiency: 83, quality: 84, software: 'Mastercam', category: 'semi_finishing' },
        { name: 'Reference Tool Machining', efficiency: 79, quality: 86, software: 'PowerMill, hyperMILL', category: 'semi_finishing' },
        { name: 'Step-Down Semi', efficiency: 81, quality: 85, software: 'All CAM', category: 'semi_finishing' },
        { name: 'Contour Semi-Finish', efficiency: 80, quality: 87, software: 'All CAM', category: 'semi_finishing' }
      ],
      finishing: [
        { name: 'Parallel Finishing', efficiency: 75, quality: 95, software: 'All CAM', category: 'finishing' },
        { name: 'Scallop Finishing', efficiency: 78, quality: 97, software: 'Mastercam, PowerMill, hyperMILL', category: 'finishing' },
        { name: 'Pencil Finishing', efficiency: 72, quality: 96, software: 'Mastercam, Fusion 360', category: 'finishing' },
        { name: 'Morph Spiral', efficiency: 80, quality: 98, software: 'PowerMill, hyperMILL', category: 'finishing' },
        { name: 'Flow Line Finishing', efficiency: 77, quality: 96, software: 'NX, CATIA', category: 'finishing' },
        { name: 'Geodesic Finishing', efficiency: 76, quality: 97, software: 'hyperMILL, WorkNC', category: 'finishing' },
        { name: 'Steep & Shallow', efficiency: 81, quality: 94, software: 'Mastercam, GibbsCAM', category: 'finishing' },
        { name: 'Contour Finishing', efficiency: 74, quality: 95, software: 'All CAM', category: 'finishing' },
        { name: 'Radial Finishing', efficiency: 73, quality: 94, software: 'All CAM', category: 'finishing' },
        { name: 'Spiral Finishing', efficiency: 79, quality: 95, software: 'All CAM', category: 'finishing' },
        { name: 'Waterline Finishing', efficiency: 75, quality: 93, software: 'All CAM', category: 'finishing' },
        { name: 'Horizontal Area', efficiency: 70, quality: 92, software: 'All CAM', category: 'finishing' },
        { name: 'Bitangent Finishing', efficiency: 71, quality: 95, software: 'NX, Mastercam', category: 'finishing' },
        { name: 'Corner Cleanup', efficiency: 68, quality: 96, software: 'All CAM', category: 'finishing' },
        { name: 'Blend Finishing', efficiency: 74, quality: 96, software: 'Mastercam', category: 'finishing' },
        { name: 'Drive Curve Finishing', efficiency: 72, quality: 94, software: 'NX, CATIA', category: 'finishing' },
        { name: 'Surface Finish Lace', efficiency: 69, quality: 93, software: 'PowerMill', category: 'finishing' },
        { name: 'Cross Hatch Finish', efficiency: 67, quality: 92, software: 'PowerMill', category: 'finishing' },
        { name: 'Raster Finishing', efficiency: 73, quality: 94, software: 'All CAM', category: 'finishing' },
        { name: 'Profile Finishing', efficiency: 76, quality: 95, software: 'All CAM', category: 'finishing' }
      ],
      drilling: [
        { name: 'Standard Drilling', efficiency: 95, quality: 85, software: 'All CAM', category: 'drilling' },
        { name: 'Peck Drilling', efficiency: 90, quality: 88, software: 'All CAM', category: 'drilling' },
        { name: 'Chip Break Drilling', efficiency: 88, quality: 87, software: 'All CAM', category: 'drilling' },
        { name: 'High Speed Peck', efficiency: 92, quality: 86, software: 'Mastercam, Fusion 360', category: 'drilling' },
        { name: 'Spot Drilling', efficiency: 96, quality: 90, software: 'All CAM', category: 'drilling' },
        { name: 'Center Drilling', efficiency: 95, quality: 89, software: 'All CAM', category: 'drilling' },
        { name: 'Tapping Rigid', efficiency: 94, quality: 92, software: 'All CAM', category: 'drilling' },
        { name: 'Tapping Float', efficiency: 93, quality: 91, software: 'All CAM', category: 'drilling' },
        { name: 'Reaming', efficiency: 91, quality: 95, software: 'All CAM', category: 'drilling' },
        { name: 'Boring', efficiency: 89, quality: 96, software: 'All CAM', category: 'drilling' },
        { name: 'Back Boring', efficiency: 85, quality: 94, software: 'Mastercam, NX', category: 'drilling' },
        { name: 'Helical Boring', efficiency: 87, quality: 93, software: 'All CAM', category: 'drilling' },
        { name: 'Thread Milling', efficiency: 86, quality: 94, software: 'All CAM', category: 'drilling' },
        { name: 'Circular Pocket', efficiency: 88, quality: 90, software: 'All CAM', category: 'drilling' },
        { name: 'Counter Bore', efficiency: 90, quality: 91, software: 'All CAM', category: 'drilling' },
        { name: 'Counter Sink', efficiency: 92, quality: 92, software: 'All CAM', category: 'drilling' }
      ],
      '4axis': [
        { name: '4-Axis Rotary Roughing', efficiency: 85, quality: 80, software: 'All CAM', category: '4axis' },
        { name: '4-Axis Rotary Finishing', efficiency: 80, quality: 90, software: 'All CAM', category: '4axis' },
        { name: '4-Axis Wrap Toolpath', efficiency: 82, quality: 85, software: 'Mastercam, Fusion 360', category: '4axis' },
        { name: '4-Axis Contour', efficiency: 78, quality: 88, software: 'All CAM', category: '4axis' },
        { name: '4-Axis Indexed (3+1)', efficiency: 88, quality: 87, software: 'All CAM', category: '4axis' },
        { name: '4-Axis Cylinder Milling', efficiency: 83, quality: 86, software: 'All CAM', category: '4axis' },
        { name: '4-Axis Swarf', efficiency: 79, quality: 89, software: 'Mastercam, hyperMILL', category: '4axis' },
        { name: '4-Axis Port Machining', efficiency: 76, quality: 88, software: 'hyperMILL, NX', category: '4axis' },
        { name: '4-Axis Radial', efficiency: 81, quality: 84, software: 'All CAM', category: '4axis' },
        { name: '4-Axis Variable Axis', efficiency: 77, quality: 87, software: 'NX, CATIA', category: '4axis' }
      ],
      '5axis': [
        { name: '5-Axis Swarf Milling', efficiency: 82, quality: 94, software: 'All 5-Axis CAM', category: '5axis' },
        { name: '5-Axis Multi-Axis Contour', efficiency: 80, quality: 95, software: 'All 5-Axis CAM', category: '5axis' },
        { name: '5-Axis Flow Line', efficiency: 78, quality: 96, software: 'NX, CATIA', category: '5axis' },
        { name: '5-Axis Parallel', efficiency: 79, quality: 93, software: 'All 5-Axis CAM', category: '5axis' },
        { name: '5-Axis Steep & Shallow', efficiency: 81, quality: 94, software: 'Mastercam, hyperMILL', category: '5axis' },
        { name: '5-Axis Morphed Spiral', efficiency: 77, quality: 97, software: 'PowerMill, hyperMILL', category: '5axis' },
        { name: '5-Axis Scallop', efficiency: 76, quality: 96, software: 'All 5-Axis CAM', category: '5axis' },
        { name: '5-Axis Trimming', efficiency: 83, quality: 91, software: 'All 5-Axis CAM', category: '5axis' },
        { name: '5-Axis Drilling', efficiency: 88, quality: 89, software: 'All 5-Axis CAM', category: '5axis' },
        { name: '5-Axis Indexed (3+2)', efficiency: 90, quality: 90, software: 'All 5-Axis CAM', category: '5axis' },
        { name: '5-Axis Blade Machining', efficiency: 75, quality: 98, software: 'hyperMILL, NX', category: '5axis' },
        { name: '5-Axis Impeller', efficiency: 74, quality: 98, software: 'hyperMILL, NX, PowerMill', category: '5axis' },
        { name: '5-Axis Port Machining', efficiency: 73, quality: 95, software: 'hyperMILL, NX', category: '5axis' },
        { name: '5-Axis Deburring', efficiency: 85, quality: 88, software: 'All 5-Axis CAM', category: '5axis' },
        { name: '5-Axis Auto Tilt', efficiency: 80, quality: 92, software: 'Mastercam, hyperMILL', category: '5axis' },
        { name: '5-Axis Geodesic', efficiency: 72, quality: 97, software: 'hyperMILL, WorkNC', category: '5axis' },
        { name: '5-Axis ISO Parametric', efficiency: 71, quality: 94, software: 'NX, CATIA', category: '5axis' },
        { name: '5-Axis Freeform', efficiency: 70, quality: 93, software: 'NX', category: '5axis' },
        { name: '5-Axis Sequential', efficiency: 78, quality: 91, software: 'NX', category: '5axis' },
        { name: '5-Axis Point-to-Point', efficiency: 86, quality: 87, software: 'All 5-Axis CAM', category: '5axis' },
        { name: '5-Axis Guide Surface', efficiency: 75, quality: 95, software: 'CATIA, NX', category: '5axis' },
        { name: '5-Axis Rib Machining', efficiency: 74, quality: 93, software: 'hyperMILL', category: '5axis' },
        { name: '5-Axis Collision Avoidance', efficiency: 79, quality: 92, software: 'All 5-Axis CAM', category: '5axis' },
        { name: '5-Axis Arbitrary Axis', efficiency: 76, quality: 91, software: 'NX, CATIA', category: '5axis' },
        { name: '5-Axis Composite', efficiency: 77, quality: 94, software: 'hyperMILL, CATIA', category: '5axis' }
      ],
      turning: [
        { name: 'OD Roughing', efficiency: 92, quality: 78, software: 'All Lathe CAM', category: 'turning' },
        { name: 'OD Finishing', efficiency: 85, quality: 95, software: 'All Lathe CAM', category: 'turning' },
        { name: 'ID Roughing', efficiency: 88, quality: 76, software: 'All Lathe CAM', category: 'turning' },
        { name: 'ID Finishing', efficiency: 82, quality: 94, software: 'All Lathe CAM', category: 'turning' },
        { name: 'Face Turning', efficiency: 94, quality: 85, software: 'All Lathe CAM', category: 'turning' },
        { name: 'Grooving', efficiency: 90, quality: 88, software: 'All Lathe CAM', category: 'turning' },
        { name: 'Threading', efficiency: 87, quality: 96, software: 'All Lathe CAM', category: 'turning' },
        { name: 'Parting/Cutoff', efficiency: 93, quality: 82, software: 'All Lathe CAM', category: 'turning' },
        { name: 'Boring', efficiency: 86, quality: 93, software: 'All Lathe CAM', category: 'turning' },
        { name: 'Center Drilling', efficiency: 95, quality: 88, software: 'All Lathe CAM', category: 'turning' },
        { name: 'Profile Roughing', efficiency: 89, quality: 77, software: 'All Lathe CAM', category: 'turning' },
        { name: 'Profile Finishing', efficiency: 83, quality: 94, software: 'All Lathe CAM', category: 'turning' },
        { name: 'Contour Turning', efficiency: 84, quality: 92, software: 'All Lathe CAM', category: 'turning' },
        { name: 'Thread Chasing', efficiency: 80, quality: 95, software: 'Mastercam, GibbsCAM', category: 'turning' },
        { name: 'Multi-Pass Threading', efficiency: 82, quality: 97, software: 'All Lathe CAM', category: 'turning' },
        { name: 'Taper Turning', efficiency: 88, quality: 90, software: 'All Lathe CAM', category: 'turning' },
        { name: 'Radius Turning', efficiency: 85, quality: 91, software: 'All Lathe CAM', category: 'turning' },
        { name: 'Back Turning', efficiency: 79, quality: 89, software: 'Mastercam, NX', category: 'turning' }
      ]
    };
    // Return strategies for the requested operation type
    return allStrategies[opType] || allStrategies.roughing;
  },
  // 5. POST PROCESSOR GENERATOR - Creates final G-code

  generateGCode(selections, calculations, toolpath, databaseData) {
    const controller = selections.machine.controller;
    const postConfig = databaseData.postData || POST_PROCESSOR_UNIVERSAL_UPDATE?.universalPostGenerator?.controllers[controller];

    if (!postConfig) {
      console.error('[PRISM_INTERNAL_POST_ENGINE] No post configuration for controller: ' + controller);
      return null;
    }
    const gcode = [];

    // ========== PROGRAM HEADER ==========
    gcode.push('%');
    gcode.push('O0001 (PRISM GENERATED PROGRAM)');
    gcode.push('(Machine: ' + (selections.machine.name || 'Unknown') + ')');
    gcode.push('(Material: ' + (selections.material.id || 'Unknown') + ')');
    gcode.push('(Tool: D' + selections.tool.diameter + ' ' + selections.tool.flutes + 'FL ' + selections.tool.coating + ')');
    gcode.push('(Strategy: ' + toolpath.recommended.name + ')');
    gcode.push('(Generated: ' + new Date().toISOString() + ')');
    gcode.push('');

    // ========== SAFE START BLOCK ==========
    gcode.push('(=== SAFE START ===)');
    gcode.push(postConfig.safeStart || 'G21 G17 G40 G49 G80 G90');

    // Home return based on controller
    if (postConfig.homeReturn) {
      postConfig.homeReturn.split('\\n').forEach(line => gcode.push(line));
    } else {
      gcode.push('G91 G28 Z0');
      gcode.push('G28 X0 Y0');
      gcode.push('G90');
    }
    gcode.push('');

    // ========== TOOL CHANGE ==========
    gcode.push('(=== TOOL CHANGE ===)');
    const toolChangeCode = (postConfig.toolChange || 'T{tool} M06').replace('{tool}', '1');
    gcode.push(toolChangeCode);

    // Tool length comp
    const lengthCompCode = (postConfig.lengthComp?.on || 'G43 H{tool}').replace('{tool}', '1');
    gcode.push(lengthCompCode);
    gcode.push('');

    // ========== WORK OFFSET ==========
    gcode.push('(=== WORK OFFSET ===)');
    gcode.push('G54 (Work offset)');
    gcode.push('');

    // ========== SPINDLE & COOLANT ==========
    gcode.push('(=== SPINDLE START ===)');
    gcode.push('S' + calculations.rpm + ' ' + (postConfig.spindleOn?.cw || 'M03') + ' (RPM: ' + calculations.rpm + ')');

    // Coolant based on selection
    const coolantCode = postConfig.coolant?.[selections.coolant.type] || postConfig.coolant?.flood || 'M08';
    gcode.push(coolantCode + ' (' + selections.coolant.type + ' coolant)');
    gcode.push('');

    // ========== HIGH-SPEED MACHINING (if applicable) ==========
    if (calculations.rpm > 10000 && postConfig.smoothing) {
      gcode.push('(=== HIGH-SPEED MODE ===)');
      gcode.push(postConfig.smoothing.on + ' (Enable smoothing)');
      gcode.push('');
    }
    // ========== APPROACH ==========
    gcode.push('(=== APPROACH ===)');
    gcode.push('G00 X0 Y0 (Rapid to start)');
    gcode.push('G00 Z10. (Rapid to clearance)');
    gcode.push('');

    // ========== ENTRY STRATEGY ==========
    if (calculations.entryStrategy && toolpath.recommended.name.includes('Adaptive')) {
      gcode.push('(=== HELIX ENTRY ===)');
      gcode.push('(Helix angle: ' + (calculations.entryStrategy.maxRampAngle || 3) + ' deg)');
      gcode.push('G01 Z' + (-calculations.depthOfCut).toFixed(3) + ' F' + Math.round(calculations.feedRate * 0.5));
      // Helix entry would be generated by CAM
    } else {
      gcode.push('(=== PLUNGE ===)');
      gcode.push('G01 Z' + (-calculations.depthOfCut).toFixed(3) + ' F' + Math.round(calculations.feedRate * 0.3));
    }
    gcode.push('');

    // ========== MAIN TOOLPATH (Placeholder - would be from CAM) ==========
    gcode.push('(=== MAIN TOOLPATH: ' + toolpath.recommended.name.toUpperCase() + ' ===)');
    gcode.push('(Feed: F' + calculations.feedRate + ' mm/min)');
    gcode.push('(Stepover: ' + calculations.stepover.toFixed(2) + ' mm)');
    gcode.push('(DOC: ' + calculations.depthOfCut.toFixed(2) + ' mm)');
    gcode.push('');
    gcode.push('(Toolpath data would be inserted here by CAM processor)');
    gcode.push('G01 X100. Y0 F' + calculations.feedRate);
    gcode.push('G01 X100. Y100.');
    gcode.push('G01 X0 Y100.');
    gcode.push('G01 X0 Y0');
    gcode.push('');

    // ========== RETRACT ==========
    gcode.push('(=== RETRACT ===)');
    gcode.push('G00 Z50. (Retract)');
    gcode.push('');

    // ========== DISABLE HSM ==========
    if (calculations.rpm > 10000 && postConfig.smoothing) {
      gcode.push(postConfig.smoothing.off + ' (Disable smoothing)');
    }
    // ========== PROGRAM END ==========
    gcode.push('(=== PROGRAM END ===)');
    gcode.push(postConfig.coolant?.off || 'M09' + ' (Coolant off)');
    gcode.push(postConfig.spindleOff || 'M05' + ' (Spindle off)');

    // Home return
    if (postConfig.homeReturn) {
      postConfig.homeReturn.split('\\n').forEach(line => gcode.push(line));
    } else {
      gcode.push('G91 G28 Z0');
      gcode.push('G28 X0 Y0');
      gcode.push('G90');
    }
    gcode.push(postConfig.programEnd || 'M30');
    gcode.push('%');

    return {
      gcode: gcode.join('\n'),
      lineCount: gcode.length,
      parameters: {
        rpm: calculations.rpm,
        feedRate: calculations.feedRate,
        depthOfCut: calculations.depthOfCut,
        stepover: calculations.stepover,
        sfm: calculations.sfm
      },
      strategy: toolpath.recommended.name,
      warnings: [
        calculations.powerWarning,
        calculations.stabilityWarning
      ].filter(Boolean)
    };
  },
  // 6. MASTER FUNCTION - Runs the complete pipeline

  /**
   * MASTER FUNCTION: Execute complete Print/CAD to G-Code pipeline
   * This is the ONE function that ties everything together
   */
  execute(options = {}) {
    console.log('[PRISM_INTERNAL_POST_ENGINE] Starting unified post generation...');

    // Step 1: Collect all user selections
    const selections = options.selections || this.collectUserSelections();
    console.log('  ✓ User selections collected');

    // Step 2: Aggregate all database data
    const databaseData = this.aggregateDatabaseData(selections);
    console.log('  ✓ Database data aggregated');

    // Step 3: Run all calculations
    const calculations = this.runCalculations(selections, databaseData);
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('  ✓ Calculations complete (SFM: ' + calculations.sfm + ', RPM: ' + calculations.rpm + ', Feed: ' + calculations.feedRate + ')');

    // Step 4: Select optimal toolpath
    const toolpath = this.selectOptimalToolpath(selections, calculations);
    console.log('  ✓ Toolpath selected: ' + toolpath.recommended.name);

    // Step 5: Generate G-code
    const result = this.generateGCode(selections, calculations, toolpath, databaseData);
    console.log('  ✓ G-code generated (' + result.lineCount + ' lines)');

    // Step 6: Compile final result
    const finalResult = {
      success: true,
      gcode: result.gcode,
      summary: {
        machine: selections.machine.name,
        controller: selections.machine.controller,
        material: selections.material.id,
        tool: 'D' + selections.tool.diameter + ' ' + selections.tool.flutes + 'FL',
        strategy: toolpath.recommended.name,
        rpm: calculations.rpm,
        feedRate: calculations.feedRate,
        sfm: calculations.sfm,
        depthOfCut: calculations.depthOfCut,
        stepover: calculations.stepover
      },
      toolpath: toolpath,
      calculations: calculations,
      selections: selections,
      databaseData: databaseData,
      warnings: result.warnings,
      appliedOptimizations: this._getAppliedOptimizations()
    };
    // Emit event for other systems
    if (typeof emitEvent !== 'undefined') {
      emitEvent('gcode_generated', finalResult);
    }
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_INTERNAL_POST_ENGINE] ✅ Post generation complete!');

    return finalResult;
  },
  _getAppliedOptimizations() {
    const optimizations = [];

    if (typeof POST_PROCESSOR_UNIVERSAL_UPDATE !== 'undefined') {
      const applied = POST_PROCESSOR_UNIVERSAL_UPDATE.duplicateSafeguards.getAppliedAdjustments();
      applied.forEach(a => optimizations.push(a.type + ' (factor: ' + a.factor + ')'));
    }
    return optimizations;
  },
  /**
   * Quick generation for Novice Mode (simplified)
   */
  executeNoviceMode(materialType, operationType, toolDiameter) {
    // Pre-set sensible defaults for novice users
    const noviceDefaults = {
      machine: { controller: 'HAAS', axes: 3, maxRPM: 12000 },
      spindle: { maxRPM: 12000, peakHP: 30, taper: 'CAT40' },
      material: { id: materialType || 'aluminum_6061' },
      tool: { diameter: toolDiameter || 12, flutes: 3, material: 'carbide', coating: 'TiAlN', stickout: 40 },
      toolHolder: { type: 'ER32' },
      workholding: { rigidity: 'standard' },
      coolant: { type: 'flood' },
      operation: { type: operationType || 'roughing', strategy: 'adaptive' }
    };
    return this.execute({ selections: noviceDefaults });
  }
}