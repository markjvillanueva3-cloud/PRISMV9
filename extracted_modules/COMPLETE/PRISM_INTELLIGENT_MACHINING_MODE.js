const PRISM_INTELLIGENT_MACHINING_MODE = {
  version: '1.0.0',
  name: 'PRISM Intelligent Machining Mode',

  // CONFIGURATION

  config: {
    defaultMaterial: 'aluminum_6061',
    defaultMachine: '3-axis_vmc',
    defaultController: 'fanuc',
    defaultCAMSoftware: 'fusion360',
    stockAllowance: 0.125,  // inches
    finishAllowance: 0.010,
    safetyMargin: 0.100,
    minWallThickness: 0.030,
    maxDepthToWidth: 4,  // For pockets
    collisionCheckEnabled: true,
    autoOptimize: true
  },
  // SUPPORTED CAM SOFTWARE WITH NATIVE FORMAT GENERATION

  camSoftware: {
    fusion360: {
      name: 'Autodesk Fusion 360',
      cadFormat: 'step',
      camFormat: 'f3d',
      postFormat: 'cps',
      toolpathExport: true,
      cloudEnabled: true,
      strengths: ['adaptive_clearing', 'steep_shallow', '3d_contour']
    },
    mastercam: {
      name: 'Mastercam',
      cadFormat: 'step',
      camFormat: 'mcam',
      postFormat: 'pst',
      toolpathExport: true,
      strengths: ['dynamic_motion', 'flowline', 'multiaxis']
    },
    solidworks_cam: {
      name: 'SolidWorks CAM',
      cadFormat: 'step',
      camFormat: 'sldprt',
      postFormat: 'post',
      toolpathExport: true,
      strengths: ['feature_based', 'automatic_recognition']
    },
    catia: {
      name: 'CATIA',
      cadFormat: 'step',
      camFormat: 'catpart',
      postFormat: 'cat',
      strengths: ['surface_machining', 'multiaxis', 'aerospace']
    },
    nx_cam: {
      name: 'Siemens NX CAM',
      cadFormat: 'step',
      camFormat: 'prt',
      postFormat: 'tcl',
      strengths: ['adaptive', 'wave_connect', 'sync_motion']
    },
    hypermill: {
      name: 'hyperMILL',
      cadFormat: 'step',
      camFormat: 'hmc',
      strengths: ['5axis_optimization', 'electrode', 'mold']
    },
    powermill: {
      name: 'PowerMill',
      cadFormat: 'step',
      camFormat: 'pmproj',
      strengths: ['high_speed', 'electrode', 'moldmaking']
    },
    esprit: {
      name: 'ESPRIT',
      cadFormat: 'step',
      camFormat: 'esp',
      strengths: ['swiss_turning', 'multitasking', 'wire_edm']
    },
    bobcad: {
      name: 'BobCAD-CAM',
      cadFormat: 'step',
      camFormat: 'bbcd',
      strengths: ['ease_of_use', 'mill_turn', 'artistic']
    },
    gibbscam: {
      name: 'GibbsCAM',
      cadFormat: 'step',
      camFormat: 'vnc',
      strengths: ['production_turning', 'mtm', 'automation']
    }
  },
  // MASTER PROCESS PIPELINE

  /**
   * Complete intelligent machining pipeline
   * Takes a print/CAD and produces everything needed for production
   */
  async process(input, options = {}) {
    const startTime = Date.now();

    const {
      targetSoftware = 'fusion360',
      controller = 'fanuc',
      machine = '3-axis_vmc',
      material = 'aluminum_6061',
      quantity = 1,
      toleranceClass = 'standard',  // standard, precision, ultra
      includeInspection = true,
      generateSetupSheet = true,
      optimizeForProduction = true
    } = options;

    const result = {
      success: false,
      stages: {},
      warnings: [],
      errors: [],
      files: {},
      summary: null
    };
    try {
      // STAGE 1: Input Analysis
      console.log('[PRISM-IMM] Stage 1: Analyzing input...');
      result.stages.analysis = await this._analyzeInput(input);
      if (!result.stages.analysis.success) {
        throw new Error('Input analysis failed: ' + result.stages.analysis.error);
      }
      // STAGE 2: Feature Recognition
      console.log('[PRISM-IMM] Stage 2: Recognizing features...');
      result.stages.features = this._recognizeFeatures(result.stages.analysis);

      // STAGE 3: Manufacturability Analysis
      console.log('[PRISM-IMM] Stage 3: Checking manufacturability...');
      result.stages.manufacturability = this._checkManufacturability(
        result.stages.features,
        material,
        machine
      );
      if (result.stages.manufacturability.issues.length > 0) {
        result.warnings.push(...result.stages.manufacturability.issues);
      }
      // STAGE 4: Generate CAD Model
      console.log('[PRISM-IMM] Stage 4: Generating CAD model...');
      result.stages.cad = this._generateCADModel(
        result.stages.features,
        result.stages.analysis.dimensions
      );
      result.files.step = result.stages.cad.step;
      result.files.dxf = result.stages.cad.dxf;

      // STAGE 5: Determine Optimal Machining Strategy
      console.log('[PRISM-IMM] Stage 5: Optimizing machining strategy...');
      result.stages.strategy = this._determineOptimalStrategy(
        result.stages.features,
        material,
        machine,
        targetSoftware,
        toleranceClass
      );

      // STAGE 6: Generate Toolpaths with Collision Avoidance
      console.log('[PRISM-IMM] Stage 6: Generating toolpaths...');
      result.stages.toolpaths = this._generateToolpaths(
        result.stages.features,
        result.stages.strategy,
        result.stages.cad.stock
      );

      // STAGE 7: Collision Detection & Validation
      console.log('[PRISM-IMM] Stage 7: Validating toolpaths...');
      result.stages.validation = this._validateToolpaths(
        result.stages.toolpaths,
        result.stages.cad.stock,
        machine
      );
      if (!result.stages.validation.passed) {
        // Auto-fix collisions if possible
        result.stages.toolpaths = this._resolveCollisions(
          result.stages.toolpaths,
          result.stages.validation.collisions
        );
        result.stages.validation = this._validateToolpaths(
          result.stages.toolpaths,
          result.stages.cad.stock,
          machine
        );
      }
      // STAGE 8: Generate CAM Output for Target Software
      console.log('[PRISM-IMM] Stage 8: Generating CAM output...');
      result.stages.cam = this._generateCAMOutput(
        result.stages.toolpaths,
        targetSoftware,
        result.stages.strategy
      );
      result.files.cam = result.stages.cam.output;

      // STAGE 9: Generate CNC Program
      console.log('[PRISM-IMM] Stage 9: Generating CNC program...');
      result.stages.cnc = this._generateCNCProgram(
        result.stages.toolpaths,
        controller,
        result.stages.strategy.tools
      );
      result.files.gcode = result.stages.cnc.gcode;

      // STAGE 10: Generate Inspection Program
      if (includeInspection) {
        console.log('[PRISM-IMM] Stage 10: Generating inspection program...');
        result.stages.inspection = this._generateInspectionProgram(
          result.stages.features,
          toleranceClass
        );
        result.files.cmm = result.stages.inspection.program;
      }
      // STAGE 11: Generate Setup Sheet
      if (generateSetupSheet) {
        console.log('[PRISM-IMM] Stage 11: Generating setup sheet...');
        result.stages.setupSheet = this._generateSetupSheet(
          result.stages,
          options
        );
        result.files.setupSheet = result.stages.setupSheet.html;
      }
      // STAGE 12: Production Optimization
      if (optimizeForProduction && quantity > 1) {
        console.log('[PRISM-IMM] Stage 12: Optimizing for production...');
        result.stages.production = this._optimizeForProduction(
          result.stages,
          quantity
        );
      }
      // Generate Summary
      result.summary = this._generateSummary(result, startTime, options);
      result.success = true;

    } catch (error) {
      result.errors.push(error.message);
      result.success = false;
    }
    return result;
  },
  // STAGE IMPLEMENTATIONS

  async _analyzeInput(input) {
    const result = {
      success: false,
      type: null,
      dimensions: null,
      features: [],
      tolerances: {},
      notes: []
    };
    // Determine input type
    if (typeof input === 'string') {
      if (input.includes('STEP') || input.includes('ISO-10303')) {
        result.type = 'step';
      } else if (input.includes('DXF') || input.includes('ENTITIES')) {
        result.type = 'dxf';
      } else if (input.includes('%') && input.includes('G')) {
        result.type = 'gcode';
      } else {
        result.type = 'text_description';
      }
    } else if (input instanceof File || input?.name) {
      const ext = (input.name || '').split('.').pop().toLowerCase();
      result.type = ext;
    } else if (input?.type === 'print_analysis') {
      result.type = 'print_analysis';
      result.dimensions = input.dimensions;
      result.features = input.features || [];
      result.tolerances = input.tolerances || {};
      result.success = true;
      return result;
    } else if (typeof input === 'object') {
      result.type = 'geometry_object';
      result.dimensions = input.dimensions || input.boundingBox;
      result.features = input.features || [];
      result.success = true;
      return result;
    }
    // Route to appropriate parser
    if (typeof CADAnalyzer !== 'undefined') {
      const analysis = await CADAnalyzer.analyzePrint(input);
      if (analysis) {
        result.dimensions = analysis.dimensions;
        result.features = analysis.features || [];
        result.tolerances = analysis.tolerances || {};
        result.notes = analysis.notes || [];
        result.success = true;
      }
    } else {
      // Fallback analysis
      result.dimensions = { length: 6, width: 4, height: 1 };
      result.success = true;
    }
    return result;
  },
  _recognizeFeatures(analysis) {
    const features = [];
    let featureId = 1;

    // Use UNIFIED_FEATURE_SYSTEM if available
    if (typeof UNIFIED_FEATURE_SYSTEM !== 'undefined' && analysis.features) {
      analysis.features.forEach(f => {
        const recognized = UNIFIED_FEATURE_SYSTEM.detectFeature(f);
        features.push({
          id: `F${featureId++}`,
          ...f,
          recognizedType: recognized.type || f.type,
          operations: recognized.operations || [],
          tools: recognized.tools || []
        });
      });
    } else if (analysis.features) {
      // Direct feature mapping
      analysis.features.forEach(f => {
        features.push({
          id: `F${featureId++}`,
          ...f,
          recognizedType: f.type
        });
      });
    }
    // Ensure we have at least a face operation
    if (features.length === 0) {
      features.push({
        id: 'F1',
        type: 'face',
        recognizedType: 'face',
        depth: 0.1,
        operations: ['face_mill']
      });
    }
    // Sort by machining order
    return this._sortFeaturesByMachiningOrder(features);
  },
  _sortFeaturesByMachiningOrder(features) {
    const order = {
      'face': 0,
      'rough': 1,
      'pocket': 2,
      'rectangular_pocket': 2,
      'circular_pocket': 2,
      'slot': 3,
      'contour': 4,
      'profile': 4,
      'through_hole': 5,
      'blind_hole': 5,
      'reamed_hole': 6,
      'bored_hole': 6,
      'tapped_hole': 7,
      'counterbore': 8,
      'countersink': 8,
      'chamfer': 9,
      'deburr': 10
    };
    return [...features].sort((a, b) => {
      const orderA = order[a.recognizedType] ?? order[a.type] ?? 50;
      const orderB = order[b.recognizedType] ?? order[b.type] ?? 50;
      return orderA - orderB;
    });
  },
  _checkManufacturability(features, material, machine) {
    const result = {
      feasible: true,
      issues: [],
      recommendations: [],
      machineCapability: this._getMachineCapability(machine)
    };
    features.forEach(feature => {
      // Check depth-to-width ratio for pockets
      if (feature.type?.includes('pocket')) {
        const minDim = Math.min(feature.length || 999, feature.width || 999);
        const depth = feature.depth || 0;
        if (depth / minDim > this.config.maxDepthToWidth) {
          result.issues.push({
            feature: feature.id,
            type: 'warning',
            message: `Deep pocket (${depth}/${minDim} = ${(depth/minDim).toFixed(1)}) may require extended tooling`
          });
        }
      }
      // Check thin walls
      if (feature.wallThickness && feature.wallThickness < this.config.minWallThickness) {
        result.issues.push({
          feature: feature.id,
          type: 'error',
          message: `Wall thickness ${feature.wallThickness}" below minimum ${this.config.minWallThickness}"`
        });
        result.feasible = false;
      }
      // Check hole depth-to-diameter
      if (feature.type?.includes('hole')) {
        const ratio = (feature.depth || 0) / (feature.diameter || 1);
        if (ratio > 10) {
          result.issues.push({
            feature: feature.id,
            type: 'warning',
            message: `Deep hole (L/D = ${ratio.toFixed(1)}) may require gun drilling or pecking`
          });
        }
      }
      // Check if machine can reach feature
      if (feature.depth > result.machineCapability.maxZ) {
        result.issues.push({
          feature: feature.id,
          type: 'error',
          message: `Feature depth ${feature.depth}" exceeds machine Z travel`
        });
        result.feasible = false;
      }
    });

    return result;
  },
  _getMachineCapability(machine) {
    const capabilities = {
      '3-axis_vmc': { axes: 3, maxX: 40, maxY: 20, maxZ: 20, maxRpm: 10000, maxHp: 15 },
      '4-axis_hmc': { axes: 4, maxX: 30, maxY: 25, maxZ: 25, maxRpm: 12000, maxHp: 20, rotary: 'B' },
      '5-axis': { axes: 5, maxX: 24, maxY: 20, maxZ: 18, maxRpm: 15000, maxHp: 25, rotary: 'BC' },
      'cnc_lathe': { axes: 2, maxDia: 12, maxLength: 24, maxRpm: 4000 },
      'swiss_lathe': { axes: 7, maxDia: 1.25, maxLength: 12, maxRpm: 10000 }
    };
    return capabilities[machine] || capabilities['3-axis_vmc'];
  },
  _generateCADModel(features, dimensions) {
    const result = {
      geometry: [],
      step: null,
      dxf: null,
      stock: null
    };
    // Calculate stock size
    const stockAllowance = this.config.stockAllowance;
    result.stock = {
      type: 'rectangular',
      length: (dimensions?.length || 6) + stockAllowance * 2,
      width: (dimensions?.width || 4) + stockAllowance * 2,
      height: (dimensions?.height || 1) + stockAllowance
    };
    // Generate geometry using UNIFIED_CAD_CAM_SYSTEM if available
    if (typeof UNIFIED_CAD_CAM_SYSTEM !== 'undefined') {
      // Create stock block
      result.geometry.push(UNIFIED_CAD_CAM_SYSTEM.geometry.box(
        0, 0, 0,
        result.stock.length,
        result.stock.width,
        result.stock.height
      ));

      // Add features
      features.forEach(f => {
        if (f.type?.includes('hole')) {
          result.geometry.push(UNIFIED_CAD_CAM_SYSTEM.geometry.hole(
            f.x || f.position?.x || 0,
            f.y || f.position?.y || 0,
            f.diameter || 0.5,
            f.depth || 'thru'
          ));
        } else if (f.type?.includes('pocket')) {
          result.geometry.push(UNIFIED_CAD_CAM_SYSTEM.geometry.pocket(
            f.x || f.position?.x || 0,
            f.y || f.position?.y || 0,
            f.length || 2,
            f.width || 1,
            f.depth || 0.5,
            f.cornerRadius || 0.125
          ));
        }
      });

      // Generate STEP
      result.step = UNIFIED_CAD_CAM_SYSTEM.exportSTEP(result.geometry, {
        fileName: 'PRISM_PART',
        units: 'inch'
      });

      // Generate DXF
      result.dxf = UNIFIED_CAD_CAM_SYSTEM.exportDXF(result.geometry);
    }
    return result;
  },
  _determineOptimalStrategy(features, material, machine, targetSoftware, toleranceClass) {
    const strategy = {
      roughing: [],
      semifinish: [],
      finishing: [],
      drilling: [],
      tools: [],
      parameters: {}
    };
    const camStrengths = this.camSoftware[targetSoftware]?.strengths || [];
    const isHardMaterial = ['titanium', 'inconel', 'hardened'].some(m =>
      material.toLowerCase().includes(m)
    );
    const isPrecision = toleranceClass === 'precision' || toleranceClass === 'ultra';

    // Determine roughing strategy
    if (camStrengths.includes('adaptive_clearing') || camStrengths.includes('dynamic_motion')) {
      strategy.roughing.push({
        type: 'adaptive',
        stepover: isHardMaterial ? 0.10 : 0.25,
        stepdown: isHardMaterial ? 0.05 : 0.15,
        stockToLeave: isPrecision ? 0.015 : 0.010
      });
    } else {
      strategy.roughing.push({
        type: 'pocket',
        stepover: 0.40,
        stepdown: 0.10,
        stockToLeave: 0.010
      });
    }
    // Semifinish for precision parts
    if (isPrecision) {
      strategy.semifinish.push({
        type: 'contour',
        stepover: 0.10,
        stockToLeave: 0.003
      });
    }
    // Finishing strategy
    strategy.finishing.push({
      type: 'contour',
      stepover: isPrecision ? 0.005 : 0.010,
      stockToLeave: 0
    });

    // Drilling strategy
    features.filter(f => f.type?.includes('hole')).forEach(f => {
      strategy.drilling.push({
        featureId: f.id,
        sequence: this._getDrillingSequence(f, material, isPrecision)
      });
    });

    // Tool selection
    strategy.tools = this._selectOptimalTools(features, material, isPrecision);

    // Cutting parameters
    strategy.parameters = this._calculateCuttingParameters(material, strategy.tools);

    return strategy;
  },
  _getDrillingSequence(hole, material, isPrecision) {
    const sequence = [];
    const dia = hole.diameter || 0.25;

    // Always spot drill
    sequence.push({
      type: 'spot_drill',
      tool: { type: 'spot_drill', diameter: 0.5, angle: 90 }
    });

    // Determine if peck drilling needed
    const depth = hole.depth === 'thru' ? 1.0 : (hole.depth || 0.5);
    const needsPeck = depth / dia > 3;

    if (hole.type === 'tapped_hole' || hole.thread) {
      // Tap drill
      const tapDrill = dia * 0.85;
      sequence.push({
        type: needsPeck ? 'peck_drill' : 'drill',
        tool: { type: 'drill', diameter: tapDrill }
      });
      // Chamfer
      sequence.push({
        type: 'chamfer',
        tool: { type: 'chamfer_mill', diameter: 0.5, angle: 90 }
      });
      // Tap
      sequence.push({
        type: 'tap',
        tool: { type: 'tap', size: hole.thread || `${dia}-20 UNC` }
      });
    } else if (hole.type === 'reamed_hole' || isPrecision) {
      // Drill undersized
      sequence.push({
        type: needsPeck ? 'peck_drill' : 'drill',
        tool: { type: 'drill', diameter: dia - 0.015 }
      });
      // Ream
      sequence.push({
        type: 'ream',
        tool: { type: 'reamer', diameter: dia }
      });
    } else if (hole.type === 'bored_hole') {
      // Drill undersized
      sequence.push({
        type: needsPeck ? 'peck_drill' : 'drill',
        tool: { type: 'drill', diameter: dia - 0.030 }
      });
      // Bore
      sequence.push({
        type: 'bore',
        tool: { type: 'boring_bar', diameter: dia }
      });
    } else {
      // Standard drill
      sequence.push({
        type: needsPeck ? 'peck_drill' : 'drill',
        tool: { type: 'drill', diameter: dia }
      });
    }
    return sequence;
  },
  _selectOptimalTools(features, material, isPrecision) {
    const tools = new Map();
    let toolNum = 1;

    const addTool = (tool) => {
      const key = `${tool.type}_${tool.diameter || tool.size}`;
      if (!tools.has(key)) {
        tools.set(key, { ...tool, tNum: toolNum++ });
      }
      return tools.get(key);
    };
    // Face mill
    addTool({ type: 'face_mill', diameter: 2.0, flutes: 4, material: 'carbide' });

    // Analyze features for endmills
    const pockets = features.filter(f => f.type?.includes('pocket'));
    if (pockets.length > 0) {
      // Roughing endmill
      addTool({ type: 'endmill', diameter: 0.5, flutes: 3, material: 'carbide', coating: 'TiAlN' });
      // Finishing endmill
      if (isPrecision) {
        addTool({ type: 'endmill', diameter: 0.375, flutes: 4, material: 'carbide', coating: 'TiAlN' });
      }
    }
    // Drills
    const holes = features.filter(f => f.type?.includes('hole'));
    holes.forEach(h => {
      addTool({ type: 'drill', diameter: h.diameter || 0.25, material: 'carbide' });
    });

    // Spot drill
    if (holes.length > 0) {
      addTool({ type: 'spot_drill', diameter: 0.5, angle: 90 });
    }
    // Chamfer mill
    addTool({ type: 'chamfer_mill', diameter: 0.5, angle: 90, flutes: 4 });

    return Array.from(tools.values());
  },
  _calculateCuttingParameters(material, tools) {
    const params = {};

    const materialData = {
      'aluminum_6061': { sfm: 800, ipt: 0.004, hb: 95 },
      'aluminum_7075': { sfm: 600, ipt: 0.003, hb: 150 },
      'steel_1018': { sfm: 300, ipt: 0.003, hb: 126 },
      'steel_4140': { sfm: 250, ipt: 0.003, hb: 197 },
      'stainless_304': { sfm: 150, ipt: 0.002, hb: 201 },
      'stainless_316': { sfm: 120, ipt: 0.002, hb: 217 },
      'titanium_6al4v': { sfm: 80, ipt: 0.002, hb: 334 }
    };
    const mat = materialData[material] || materialData['aluminum_6061'];

    tools.forEach(tool => {
      const dia = tool.diameter || 0.5;
      const rpm = Math.round((mat.sfm * 12) / (Math.PI * dia));
      const flutes = tool.flutes || 2;
      const feed = Math.round(rpm * mat.ipt * flutes);

      params[tool.tNum] = {
        rpm: Math.min(rpm, 15000),
        feedRate: feed,
        plungeRate: Math.round(feed * 0.5),
        doc: tool.type.includes('face') ? 0.1 : (tool.type.includes('drill') ? dia * 3 : 0.15),
        woc: dia * 0.25
      };
    });

    return params;
  },
  _generateToolpaths(features, strategy, stock) {
    const toolpaths = [];
    let opNum = 10;

    // Face operation
    toolpaths.push({
      opNum: opNum,
      type: 'face',
      strategy: 'zigzag',
      tool: strategy.tools.find(t => t.type === 'face_mill'),
      parameters: {
        startX: -1,
        startY: 0,
        endX: stock.length + 1,
        endY: stock.width,
        depth: 0.1,
        stepover: 0.75
      },
      moves: this._generateFaceMoves(stock)
    });
    opNum += 10;

    // Roughing operations
    features.filter(f => f.type?.includes('pocket') || f.type?.includes('contour')).forEach(feature => {
      const roughStrat = strategy.roughing[0];
      toolpaths.push({
        opNum: opNum,
        type: 'rough_' + (feature.type?.includes('pocket') ? 'pocket' : 'contour'),
        strategy: roughStrat.type,
        feature: feature.id,
        tool: strategy.tools.find(t => t.type === 'endmill' && t.diameter === 0.5),
        parameters: {
          ...roughStrat,
          targetDepth: feature.depth || 0.5
        },
        moves: this._generateAdaptiveMoves(feature, roughStrat)
      });
      opNum += 10;
    });

    // Finishing operations
    features.filter(f => f.type?.includes('pocket') || f.type?.includes('contour')).forEach(feature => {
      const finishStrat = strategy.finishing[0];
      toolpaths.push({
        opNum: opNum,
        type: 'finish_' + (feature.type?.includes('pocket') ? 'pocket' : 'contour'),
        strategy: 'contour',
        feature: feature.id,
        tool: strategy.tools.find(t => t.type === 'endmill'),
        parameters: {
          ...finishStrat,
          targetDepth: feature.depth || 0.5
        },
        moves: this._generateContourMoves(feature)
      });
      opNum += 10;
    });

    // Drilling operations
    strategy.drilling.forEach(drill => {
      drill.sequence.forEach(step => {
        const feature = features.find(f => f.id === drill.featureId);
        toolpaths.push({
          opNum: opNum,
          type: step.type,
          feature: drill.featureId,
          tool: step.tool,
          parameters: {
            x: feature?.x || feature?.position?.x || 0,
            y: feature?.y || feature?.position?.y || 0,
            depth: feature?.depth === 'thru' ? stock.height + 0.1 : (feature?.depth || 0.5)
          },
          cycle: this._getDrillCycle(step.type)
        });
        opNum += 10;
      });
    });

    return toolpaths;
  },
  _generateFaceMoves(stock) {
    const moves = [];
    const stepover = stock.width * 0.75;
    let y = 0;
    let direction = 1;

    while (y <= stock.width) {
      moves.push({
        type: 'rapid',
        x: direction > 0 ? -1 : stock.length + 1,
        y,
        z: 0.1
      });
      moves.push({
        type: 'feed',
        x: direction > 0 ? -1 : stock.length + 1,
        y,
        z: -0.1
      });
      moves.push({
        type: 'feed',
        x: direction > 0 ? stock.length + 1 : -1,
        y,
        z: -0.1
      });
      y += stepover;
      direction *= -1;
    }
    return moves;
  },
  _generateAdaptiveMoves(feature, strategy) {
    // Simplified adaptive/trochoidal moves
    const moves = [];
    const cx = feature.x || feature.position?.x || 0;
    const cy = feature.y || feature.position?.y || 0;
    const width = feature.width || 2;
    const length = feature.length || 2;
    const depth = feature.depth || 0.5;
    const stepdown = strategy.stepdown || 0.1;

    let z = 0;
    while (z > -depth) {
      z = Math.max(z - stepdown, -depth);

      // Helix entry
      moves.push({ type: 'rapid', x: cx, y: cy, z: 0.1 });
      moves.push({ type: 'helix', x: cx, y: cy, z: z, radius: 0.25 });

      // Adaptive clearing passes
      moves.push({ type: 'adaptive', x: cx - width/2, y: cy - length/2, z });
      moves.push({ type: 'adaptive', x: cx + width/2, y: cy - length/2, z });
      moves.push({ type: 'adaptive', x: cx + width/2, y: cy + length/2, z });
      moves.push({ type: 'adaptive', x: cx - width/2, y: cy + length/2, z });
    }
    return moves;
  },
  _generateContourMoves(feature) {
    const moves = [];
    const cx = feature.x || feature.position?.x || 0;
    const cy = feature.y || feature.position?.y || 0;
    const width = feature.width || 2;
    const length = feature.length || 2;
    const depth = feature.depth || 0.5;
    const cr = feature.cornerRadius || 0.125;

    // Single contour pass at full depth
    moves.push({ type: 'rapid', x: cx - width/2 - 0.5, y: cy - length/2, z: 0.1 });
    moves.push({ type: 'feed', x: cx - width/2 - 0.5, y: cy - length/2, z: -depth });
    moves.push({ type: 'lead_in', x: cx - width/2, y: cy - length/2, z: -depth });

    // Contour with corner arcs
    moves.push({ type: 'feed', x: cx + width/2 - cr, y: cy - length/2, z: -depth });
    if (cr > 0) moves.push({ type: 'arc_cw', x: cx + width/2, y: cy - length/2 + cr, z: -depth, r: cr });
    moves.push({ type: 'feed', x: cx + width/2, y: cy + length/2 - cr, z: -depth });
    if (cr > 0) moves.push({ type: 'arc_cw', x: cx + width/2 - cr, y: cy + length/2, z: -depth, r: cr });
    moves.push({ type: 'feed', x: cx - width/2 + cr, y: cy + length/2, z: -depth });
    if (cr > 0) moves.push({ type: 'arc_cw', x: cx - width/2, y: cy + length/2 - cr, z: -depth, r: cr });
    moves.push({ type: 'feed', x: cx - width/2, y: cy - length/2 + cr, z: -depth });
    if (cr > 0) moves.push({ type: 'arc_cw', x: cx - width/2 + cr, y: cy - length/2, z: -depth, r: cr });

    moves.push({ type: 'lead_out', x: cx - width/2 - 0.5, y: cy - length/2, z: -depth });

    return moves;
  },
  _getDrillCycle(type) {
    const cycles = {
      'spot_drill': 'G81',
      'drill': 'G81',
      'peck_drill': 'G83',
      'ream': 'G85',
      'bore': 'G76',
      'tap': 'G84',
      'chamfer': 'G81'
    };
    return cycles[type] || 'G81';
  },
  _validateToolpaths(toolpaths, stock, machine) {
    const result = {
      passed: true,
      collisions: [],
      warnings: []
    };
    const machineEnvelope = this._getMachineCapability(machine);
    const safeZ = 0.1;

    toolpaths.forEach(tp => {
      if (!tp.moves) return;

      tp.moves.forEach((move, idx) => {
        // Check rapid into stock
        if (move.type === 'rapid' && move.z < safeZ) {
          if (move.x >= 0 && move.x <= stock.length &&
              move.y >= 0 && move.y <= stock.width) {
            result.collisions.push({
              toolpath: tp.opNum,
              moveIndex: idx,
              type: 'rapid_into_stock',
              position: { x: move.x, y: move.y, z: move.z }
            });
            result.passed = false;
          }
        }
        // Check machine envelope
        if (Math.abs(move.x) > machineEnvelope.maxX ||
            Math.abs(move.y) > machineEnvelope.maxY ||
            Math.abs(move.z) > machineEnvelope.maxZ) {
          result.collisions.push({
            toolpath: tp.opNum,
            moveIndex: idx,
            type: 'out_of_envelope',
            position: { x: move.x, y: move.y, z: move.z }
          });
          result.passed = false;
        }
      });
    });

    return result;
  },
  _resolveCollisions(toolpaths, collisions) {
    // Auto-fix common collision types
    collisions.forEach(col => {
      const tp = toolpaths.find(t => t.opNum === col.toolpath);
      if (!tp || !tp.moves) return;

      if (col.type === 'rapid_into_stock') {
        // Add safe Z retract before rapid
        tp.moves.splice(col.moveIndex, 0, {
          type: 'rapid',
          x: tp.moves[col.moveIndex - 1]?.x || 0,
          y: tp.moves[col.moveIndex - 1]?.y || 0,
          z: 1.0
        });
      }
    });

    return toolpaths;
  },
  _generateCAMOutput(toolpaths, targetSoftware, strategy) {
    const software = this.camSoftware[targetSoftware];

    const result = {
      software: software.name,
      format: software.camFormat,
      output: null,
      instructions: []
    };
    // Generate software-specific import instructions
    result.instructions = [
      `1. Open ${software.name}`,
      `2. Import the STEP file (File > Open/Import)`,
      `3. Create a new CAM setup with the imported body`,
      `4. Import the following operations:`
    ];

    // Generate operation definitions
    let opDefs = `// PRISM Generated Operations for ${software.name}\n`;
    opDefs += `// Generated: ${new Date().toISOString()}\n\n`;

    toolpaths.forEach(tp => {
      opDefs += `// Operation ${tp.opNum}: ${tp.type}\n`;
      opDefs += `// Strategy: ${tp.strategy || 'default'}\n`;
      if (tp.tool) {
        opDefs += `// Tool: T${tp.tool.tNum} - ${tp.tool.diameter}" ${tp.tool.type}\n`;
      }
      opDefs += `\n`;
    });

    result.output = opDefs;

    return result;
  },
  _generateCNCProgram(toolpaths, controller, tools) {
    // Use UNIFIED_CAD_CAM_SYSTEM if available
    if (typeof UNIFIED_CAD_CAM_SYSTEM !== 'undefined') {
      const plan = {
        operations: toolpaths.map(tp => ({
          ...tp,
          tool: tools.find(t => t.tNum === tp.tool?.tNum) || tp.tool
        })),
        toolList: tools
      };
      return UNIFIED_CAD_CAM_SYSTEM.generateGCode(plan, {
        controller,
        programNumber: 1,
        programName: 'PRISM_INTELLIGENT'
      });
    }
    // Fallback G-code generation
    let gcode = `%\nO0001 (PRISM INTELLIGENT MACHINING)\n`;
    gcode += `(GENERATED: ${new Date().toISOString()})\n`;
    gcode += `G90 G80 G40 G49 G17\nG20\n\n`;

    let currentTool = null;

    toolpaths.forEach(tp => {
      gcode += `(OP ${tp.opNum}: ${tp.type.toUpperCase()})\n`;

      if (tp.tool && tp.tool.tNum !== currentTool) {
        currentTool = tp.tool.tNum;
        gcode += `T${currentTool} M6\n`;
        gcode += `G43 H${currentTool} Z1.0\n`;
        gcode += `S3000 M3\n`;
        gcode += `G54\nM8\n`;
      }
      if (tp.cycle) {
        gcode += `${tp.cycle} G99 X${tp.parameters?.x || 0} Y${tp.parameters?.y || 0} Z${-tp.parameters?.depth || -0.5} R0.1 F10.\n`;
        gcode += `G80\n`;
      }
      gcode += `\n`;
    });

    gcode += `M9\nG91 G28 Z0.\nG28 X0. Y0.\nM30\n%\n`;

    return {
      gcode,
      controller,
      lineCount: gcode.split('\n').length
    };
  },
  _generateInspectionProgram(features, toleranceClass) {
    if (typeof CMM_PROGRAM_GENERATOR !== 'undefined') {
      return CMM_PROGRAM_GENERATOR.generate({
        partInfo: { partNumber: 'PRISM_PART' },
        features,
        controller: 'hexagon'
      });
    }
    return {
      program: '// CMM Program placeholder',
      format: 'pcdmis'
    };
  },
  _generateSetupSheet(stages, options) {
    if (typeof SETUP_SHEET_GENERATOR !== 'undefined') {
      return {
        html: SETUP_SHEET_GENERATOR.exportHTML(SETUP_SHEET_GENERATOR.generate({
          partInfo: { partNumber: 'PRISM_PART', material: options.material },
          operations: stages.toolpaths || [],
          tools: stages.strategy?.tools || []
        }))
      };
    }
    return { html: '<html><body>
    <!-- Toast Notification Container -->
    <div id="toast-container" style="position: fixed; top: 20px; right: 20px; z-index: 99999; display: flex; flex-direction: column; gap: 10px;"></div>
Setup Sheet

<!-- ================================================================= -->
<!-- PRISM v8.0.0 - PHASE 1 & 2 ADVANCED SYSTEMS                        -->
<!-- ================================================================= -->
<!-- Phase 1: Advanced Geometry & Recognition                          -->
<!-- Phase 2: Advanced Collision & Verification                        -->
<!-- Extends: UNIFIED_FEATURE_SYSTEM, COLLISION_AVOIDANCE_SYSTEM       -->
<!-- Added: 2026-01-01T17:04:01.645654                               -->
<!-- ================================================================= -->

<script>
/**
 * =============================================================================
 * PRISM v8.0.0 - PHASE 1 & 2: ADVANCED SYSTEMS
 * =============================================================================
 *
 * PHASE 1: Advanced Geometry & Recognition
 * - ADVANCED_PRINT_RECOGNITION - OCR, GD&T, thread parsing
 * - COMPLEX_GEOMETRY_ENGINE - NURBS, boolean, draft, fillet
 * - FIVE_AXIS_FEATURE_ENGINE - Undercut, impeller, port detection
 *
 * PHASE 2: Advanced Collision & Verification
 * - FULL_MACHINE_SIMULATION - Complete kinematic chain
 * - MATERIAL_REMOVAL_SIMULATION - Voxel-based stock removal
 * - ADVANCED_VERIFICATION_ENGINE - Gouge, deflection, chip load
 *
 * EXTENDS: UNIFIED_FEATURE_SYSTEM, COLLISION_AVOIDANCE_SYSTEM
 * =============================================================================
 */

// PHASE 1.1: ADVANCED PRINT RECOGNITION

const ADVANCED_PRINT_RECOGNITION = {
  version: '1.0.0',

  // GD&T SYMBOL DATABASE

  gdtSymbols: {
    // Form tolerances
    flatness: { symbol: '⏥', unicode: '\u23E5', category: 'form', datum: false },
    straightness: { symbol: '⏤', unicode: '\u23E4', category: 'form', datum: false },
    circularity: { symbol: '○', unicode: '\u25CB', category: 'form', datum: false },
    cylindricity: { symbol: '⌭', unicode: '\u232D', category: 'form', datum: false },

    // Profile tolerances
    profile_line: { symbol: '⌒', unicode: '\u2312', category: 'profile', datum: 'optional' },
    profile_surface: { symbol: '⌓', unicode: '\u2313', category: 'profile', datum: 'optional' },

    // Orientation tolerances
    perpendicularity: { symbol: '⟂', unicode: '\u27C2', category: 'orientation', datum: true },
    angularity: { symbol: '∠', unicode: '\u2220', category: 'orientation', datum: true },
    parallelism: { symbol: '∥', unicode: '\u2225', category: 'orientation', datum: true },

    // Location tolerances
    position: { symbol: '⌖', unicode: '\u2316', category: 'location', datum: true },
    concentricity: { symbol: '◎', unicode: '\u25CE', category: 'location', datum: true },
    symmetry: { symbol: '⌯', unicode: '\u232F', category: 'location', datum: true },

    // Runout tolerances
    circular_runout: { symbol: '↗', unicode: '\u2197', category: 'runout', datum: true },
    total_runout: { symbol: '↗↗', unicode: '\u2197\u2197', category: 'runout', datum: true }
  },
  // THREAD STANDARDS DATABASE

  threadStandards: {
    // Unified Inch
    UNC: {
      name: 'Unified National Coarse',
      series: {
        '#0': { major: 0.060, tpi: 80 },
        '#1': { major: 0.073, tpi: 64 },
        '#2': { major: 0.086, tpi: 56 },
        '#3': { major: 0.099, tpi: 48 },
        '#4': { major: 0.112, tpi: 40 },
        '#5': { major: 0.125, tpi: 40 },
        '#6': { major: 0.138, tpi: 32 },
        '#8': { major: 0.164, tpi: 32 },
        '#10': { major: 0.190, tpi: 24 },
        '#12': { major: 0.216, tpi: 24 },
        '1/4': { major: 0.250, tpi: 20 },
        '5/16': { major: 0.3125, tpi: 18 },
        '3/8': { major: 0.375, tpi: 16 },
        '7/16': { major: 0.4375, tpi: 14 },
        '1/2': { major: 0.500, tpi: 13 },
        '9/16': { major: 0.5625, tpi: 12 },
        '5/8': { major: 0.625, tpi: 11 },
        '3/4': { major: 0.750, tpi: 10 },
        '7/8': { major: 0.875, tpi: 9 },
        '1': { major: 1.000, tpi: 8 }
      }
    },
    UNF: {
      name: 'Unified National Fine',
      series: {
        '#0': { major: 0.060, tpi: 80 },
        '#1': { major: 0.073, tpi: 72 },
        '#2': { major: 0.086, tpi: 64 },
        '#3': { major: 0.099, tpi: 56 },
        '#4': { major: 0.112, tpi: 48 },
        '#5': { major: 0.125, tpi: 44 },
        '#6': { major: 0.138, tpi: 40 },
        '#8': { major: 0.164, tpi: 36 },
        '#10': { major: 0.190, tpi: 32 },
        '#12': { major: 0.216, tpi: 28 },
        '1/4': { major: 0.250, tpi: 28 },
        '5/16': { major: 0.3125, tpi: 24 },
        '3/8': { major: 0.375, tpi: 24 },
        '7/16': { major: 0.4375, tpi: 20 },
        '1/2': { major: 0.500, tpi: 20 },
        '9/16': { major: 0.5625, tpi: 18 },
        '5/8': { major: 0.625, tpi: 18 },
        '3/4': { major: 0.750, tpi: 16 },
        '7/8': { major: 0.875, tpi: 14 },
        '1': { major: 1.000, tpi: 12 }
      }
    },
    metric: {
      name: 'ISO Metric Coarse',
      series: {
        'M1.6': { major: 1.6, pitch: 0.35 },
        'M2': { major: 2.0, pitch: 0.40 },
        'M2.5': { major: 2.5, pitch: 0.45 },
        'M3': { major: 3.0, pitch: 0.50 },
        'M4': { major: 4.0, pitch: 0.70 },
        'M5': { major: 5.0, pitch: 0.80 },
        'M6': { major: 6.0, pitch: 1.00 },
        'M8': { major: 8.0, pitch: 1.25 },
        'M10': { major: 10.0, pitch: 1.50 },
        'M12': { major: 12.0, pitch: 1.75 },
        'M14': { major: 14.0, pitch: 2.00 },
        'M16': { major: 16.0, pitch: 2.00 },
        'M18': { major: 18.0, pitch: 2.50 },
        'M20': { major: 20.0, pitch: 2.50 },
        'M24': { major: 24.0, pitch: 3.00 },
        'M30': { major: 30.0, pitch: 3.50 }
      }
    },
    NPT: {
      name: 'National Pipe Tapered',
      series: {
        '1/8': { major: 0.405, tpi: 27 },
        '1/4': { major: 0.540, tpi: 18 },
        '3/8': { major: 0.675, tpi: 18 },
        '1/2': { major: 0.840, tpi: 14 },
        '3/4': { major: 1.050, tpi: 14 },
        '1': { major: 1.315, tpi: 11.5 }
      },
      taperAngle: 1.7899  // degrees
    }
  },
  // SURFACE FINISH SYMBOLS

  surfaceFinishSymbols: {
    'Ra': { name: 'Average Roughness', unit: 'μin' },
    'Rz': { name: 'Average Peak-to-Valley', unit: 'μin' },
    'Rmax': { name: 'Maximum Roughness', unit: 'μin' },
    'RMS': { name: 'Root Mean Square', unit: 'μin' }
  },
  surfaceFinishValues: {
    // Ra values in microinches
    2: { description: 'Mirror finish', process: ['superfinish', 'lapping'] },
    4: { description: 'Very fine', process: ['honing', 'lapping'] },
    8: { description: 'Fine', process: ['grinding', 'honing'] },
    16: { description: 'Semi-fine', process: ['grinding', 'precision_turn'] },
    32: { description: 'Standard machined', process: ['turn', 'mill'] },
    63: { description: 'Normal machined', process: ['turn', 'mill', 'drill'] },
    125: { description: 'Rough machined', process: ['rough_mill', 'saw'] },
    250: { description: 'Rough', process: ['rough_cut', 'flame_cut'] },
    500: { description: 'Very rough', process: ['casting', 'forging'] }
  },
  // DIMENSION PARSING

  /**
   * Parse dimension string from print
   */
  parseDimension(dimString) {
    if (!dimString) return null;

    const result = {
      nominal: null,
      upper: null,
      lower: null,
      tolerance: null,
      type: 'basic',
      unit: 'inch'
    };
    // Clean input
    const str = dimString.toString().trim();

    // Check for metric
    if (str.toLowerCase().includes('mm') || str.includes('∅')) {
      result.unit = 'mm';
    }
    // Pattern: 1.000 +.002/-.001 (bilateral unequal)
    let match = str.match(/([\d.]+)\s*\+\s*([\d.]+)\s*\/\s*-\s*([\d.]+)/);
    if (match) {
      result.nominal = parseFloat(match[1]);
      result.upper = parseFloat(match[2]);
      result.lower = -parseFloat(match[3]);
      result.type = 'bilateral_unequal';
      result.tolerance = result.upper - result.lower;
      return result;
    }
    // Pattern: 1.000 ±.005 (bilateral equal)
    match = str.match(/([\d.]+)\s*[±+\-]\s*([\d.]+)/);
    if (match) {
      result.nominal = parseFloat(match[1]);
      result.upper = parseFloat(match[2]);
      result.lower = -parseFloat(match[2]);
      result.type = 'bilateral';
      result.tolerance = result.upper * 2;
      return result;
    }
    // Pattern: 1.000 +.005 (unilateral plus)
    match = str.match(/([\d.]+)\s*\+\s*([\d.]+)(?!\s*\/)/);
    if (match) {
      result.nominal = parseFloat(match[1]);
      result.upper = parseFloat(match[2]);
      result.lower = 0;
      result.type = 'unilateral_plus';
      result.tolerance = result.upper;
      return result;
    }
    // Pattern: 1.000 -.005 (unilateral minus)
    match = str.match(/([\d.]+)\s*-\s*([\d.]+)/);
    if (match) {
      result.nominal = parseFloat(match[1]);
      result.upper = 0;
      result.lower = -parseFloat(match[2]);
      result.type = 'unilateral_minus';
      result.tolerance = Math.abs(result.lower);
      return result;
    }
    // Basic dimension
    match = str.match(/([\d.]+)/);
    if (match) {
      result.nominal = parseFloat(match[1]);
      result.type = 'basic';
      return result;
    }
    return null;
  },
  /**
   * Parse thread callout
   */
  parseThreadCallout(callout) {
    if (!callout) return null;

    const str = callout.toString().toUpperCase().trim();
    const result = {
      original: callout,
      size: null,
      pitch: null,
      tpi: null,
      standard: null,
      class: '2B',
      depth: null,
      type: 'internal'
    };
    // Metric pattern: M6x1.0 or M6-1.0
    let match = str.match(/M([\d.]+)\s*[xX×-]\s*([\d.]+)/i);
    if (match) {
      result.size = `M${match[1]}`;
      result.pitch = parseFloat(match[2]);
      result.standard = 'metric';
      result.tpi = 25.4 / result.pitch;
      return result;
    }
    // Metric coarse: M6 (no pitch specified)
    match = str.match(/^M([\d.]+)$/i);
    if (match) {
      result.size = `M${match[1]}`;
      result.standard = 'metric';
      const data = this.threadStandards.metric.series[result.size];
      if (data) {
        result.pitch = data.pitch;
        result.tpi = 25.4 / data.pitch;
      }
      return result;
    }
    // UNC/UNF pattern: 1/4-20 UNC or #10-24 UNC
    match = str.match(/([#\d\/]+)-(\d+)\s*(UNC|UNF|UNEF|UN)/i);
    if (match) {
      result.size = match[1];
      result.tpi = parseInt(match[2]);
      result.standard = match[3].toUpperCase();
      result.pitch = 25.4 / result.tpi;
      return result;
    }
    // Pipe thread: 1/4 NPT or 1/4-18 NPT
    match = str.match(/([#\d\/]+)(?:-(\d+))?\s*(NPT|NPTF|NPS|BSPT)/i);
    if (match) {
      result.size = match[1];
      result.standard = match[3].toUpperCase();
      if (match[2]) {
        result.tpi = parseInt(match[2]);
      } else {
        const data = this.threadStandards.NPT?.series[result.size];
        if (data) result.tpi = data.tpi;
      }
      result.type = result.standard.includes('T') ? 'taper' : 'straight';
      return result;
    }
    // Thread class: 2B, 3B, etc.
    match = str.match(/(\d)[AB]/);
    if (match) {
      result.class = match[0];
    }
    return result;
  },
  /**
   * Parse GD&T feature control frame
   */
  parseGDTFrame(frameStr) {
    if (!frameStr) return null;

    const result = {
      symbol: null,
      symbolType: null,
      tolerance: null,
      modifier: null,
      datums: [],
      materialCondition: null
    };
    // Find symbol
    for (const [name, data] of Object.entries(this.gdtSymbols)) {
      if (frameStr.includes(data.symbol) || frameStr.includes(data.unicode)) {
        result.symbol = data.symbol;
        result.symbolType = name;
        result.category = data.category;
        break;
      }
    }
    // Extract tolerance value
    const tolMatch = frameStr.match(/[⌀∅ø]?\s*([\d.]+)/);
    if (tolMatch) {
      result.tolerance = parseFloat(tolMatch[1]);
      result.isDiametric = frameStr.includes('⌀') || frameStr.includes('∅') || frameStr.includes('ø');
    }
    // Extract material condition modifier
    if (frameStr.includes('Ⓜ') || frameStr.includes('(M)') || frameStr.toLowerCase().includes('mmc')) {
      result.materialCondition = 'MMC';
    } else if (frameStr.includes('Ⓛ') || frameStr.includes('(L)') || frameStr.toLowerCase().includes('lmc')) {
      result.materialCondition = 'LMC';
    } else if (frameStr.includes('Ⓢ') || frameStr.includes('(S)') || frameStr.toLowerCase().includes('rfs')) {
      result.materialCondition = 'RFS';
    }
    // Extract datum references
    const datumMatch = frameStr.match(/[|-]\s*([A-Z])(?:\s*[|-]\s*([A-Z]))?(?:\s*[|-]\s*([A-Z]))?/);
    if (datumMatch) {
      if (datumMatch[1]) result.datums.push(datumMatch[1]);
      if (datumMatch[2]) result.datums.push(datumMatch[2]);
      if (datumMatch[3]) result.datums.push(datumMatch[3]);
    }
    return result;
  },
  /**
   * Analyze engineering print (main entry point)
   */
  analyzePrint(printData) {
    const result = {
      dimensions: [],
      tolerances: [],
      threads: [],
      gdtCallouts: [],
      surfaceFinishes: [],
      datums: [],
      material: null,
      notes: [],
      warnings: []
    };
    // If it's an image, would use OCR (placeholder)
    if (printData instanceof Blob || printData instanceof File) {
      result.notes.push('Image OCR would be applied here');
      return result;
    }
    // If it's text, parse it
    if (typeof printData === 'string') {
      const lines = printData.split('\n');

      lines.forEach(line => {
        // Try to parse as dimension
        const dim = this.parseDimension(line);
        if (dim && dim.nominal) {
          result.dimensions.push(dim);
        }
        // Try to parse as thread
        const thread = this.parseThreadCallout(line);
        if (thread && thread.size) {
          result.threads.push(thread);
        }
        // Try to parse as GD&T
        const gdt = this.parseGDTFrame(line);
        if (gdt && gdt.symbolType) {
          result.gdtCallouts.push(gdt);
        }
        // Check for surface finish
        const raMatch = line.match(/(\d+)\s*Ra/i);
        if (raMatch) {
          result.surfaceFinishes.push({
            value: parseInt(raMatch[1]),
            type: 'Ra',
            location: 'general'
          });
        }
        // Check for datum references
        const datumMatch = line.match(/DATUM\s+([A-Z])/gi);
        if (datumMatch) {
          datumMatch.forEach(d => {
            const letter = d.match(/[A-Z]$/)[0];
            if (!result.datums.includes(letter)) {
              result.datums.push(letter);
            }
          });
        }
      });
    }
    // If it's an object, extract structured data
    if (typeof printData === 'object' && printData !== null) {
      if (printData.dimensions) {
        printData.dimensions.forEach(d => {
          const parsed = this.parseDimension(d);
          if (parsed) result.dimensions.push(parsed);
        });
      }
      if (printData.threads) {
        printData.threads.forEach(t => {
          const parsed = this.parseThreadCallout(t);
          if (parsed) result.threads.push(parsed);
        });
      }
    }
    return result;
  },
  /**
   * Calculate tap drill size
   */
  calculateTapDrill(threadData, percentThread = 75) {
    if (!threadData) return null;

    let tapDrill;

    if (threadData.pitch) {
      // Metric: Major - Pitch
      const major = typeof threadData.size === 'string' ?
        parseFloat(threadData.size.replace('M', '')) : threadData.size;
      tapDrill = major - threadData.pitch;
    } else if (threadData.tpi) {
      // Inch: Major - (1/TPI)
      const data = this.threadStandards.UNC?.series[threadData.size] ||
                   this.threadStandards.UNF?.series[threadData.size];
      if (data) {
        tapDrill = data.major - (1 / threadData.tpi);
      }
    }
    // Adjust for thread percentage
    if (percentThread !== 75) {
      // Simplified adjustment
      const adjustment = (75 - percentThread) / 75 * 0.05;
      tapDrill += adjustment;
    }
    return tapDrill ? {
      diameter: tapDrill,
      percentThread,
      unit: threadData.standard === 'metric' ? 'mm' : 'inch'
    } : null;
  }
};
// PHASE 1.2: COMPLEX GEOMETRY ENGINE

const COMPLEX_GEOMETRY_ENGINE = {
  version: '1.0.0',

  // NURBS SURFACE GENERATION

  nurbs: {
    /**
     * Create NURBS curve
     */
    createCurve(controlPoints, degree = 3, weights = null) {
      const n = controlPoints.length - 1;
      const p = Math.min(degree, n);

      // Generate uniform knot vector
      const knotVector = this._generateKnots(n, p);

      // Default weights (rational)
      const w = weights || new Array(controlPoints.length).fill(1.0);

      return {
        type: 'nurbs_curve',
        degree: p,
        controlPoints,
        weights: w,
        knots: knotVector,

        // Evaluate point at parameter t
        evaluate: (t) => this._evaluateCurve(controlPoints, w, knotVector, p, t)
      };
    },
    /**
     * Create NURBS surface
     */
    createSurface(controlGrid, degreeU = 3, degreeV = 3) {
      const nu = controlGrid.length - 1;
      const nv = controlGrid[0].length - 1;
      const pu = Math.min(degreeU, nu);
      const pv = Math.min(degreeV, nv);

      const knotsU = this._generateKnots(nu, pu);
      const knotsV = this._generateKnots(nv, pv);

      return {
        type: 'nurbs_surface',
        degreeU: pu,
        degreeV: pv,
        controlGrid,
        knotsU,
        knotsV,

        // Evaluate point at parameters (u, v)
        evaluate: (u, v) => this._evaluateSurface(controlGrid, knotsU, knotsV, pu, pv, u, v)
      };
    },
    _generateKnots(n, p) {
      const m = n + p + 1;
      const knots = [];

      for (let i = 0; i <= p; i++) knots.push(0);
      for (let i = 1; i <= n - p; i++) knots.push(i / (n - p + 1));
      for (let i = 0; i <= p; i++) knots.push(1);

      return knots;
    },
    _evaluateCurve(points, weights, knots, degree, t) {
      const n = points.length - 1;
      let x = 0, y = 0, z = 0, w = 0;

      for (let i = 0; i <= n; i++) {
        const basis = this._basisFunction(i, degree, knots, t);
        const weight = weights[i];
        x += basis * weight * points[i].x;
        y += basis * weight * points[i].y;
        z += basis * weight * (points[i].z || 0);
        w += basis * weight;
      }
      return { x: x/w, y: y/w, z: z/w };
    },
    _evaluateSurface(grid, knotsU, knotsV, pu, pv, u, v) {
      // Simplified surface evaluation
      const nu = grid.length - 1;
      const nv = grid[0].length - 1;
      let x = 0, y = 0, z = 0, w = 0;

      for (let i = 0; i <= nu; i++) {
        const basisU = this._basisFunction(i, pu, knotsU, u);
        for (let j = 0; j <= nv; j++) {
          const basisV = this._basisFunction(j, pv, knotsV, v);
          const basis = basisU * basisV;
          x += basis * grid[i][j].x;
          y += basis * grid[i][j].y;
          z += basis * (grid[i][j].z || 0);
          w += basis;
        }
      }
      return { x: x/w, y: y/w, z: z/w };
    },
    _basisFunction(i, p, knots, t) {
      if (p === 0) {
        return (t >= knots[i] && t < knots[i + 1]) ? 1 : 0;
      }
      let left = 0, right = 0;
      const leftDenom = knots[i + p] - knots[i];
      const rightDenom = knots[i + p + 1] - knots[i + 1];

      if (leftDenom !== 0) {
        left = ((t - knots[i]) / leftDenom) * this._basisFunction(i, p - 1, knots, t);
      }
      if (rightDenom !== 0) {
        right = ((knots[i + p + 1] - t) / rightDenom) * this._basisFunction(i + 1, p - 1, knots, t);
      }
      return left + right;
    }
  },
  // BOOLEAN OPERATIONS

  boolean: {
    /**
     * Union of two solids
     */
    union(solidA, solidB) {
      return {
        type: 'boolean_union',
        operation: 'union',
        operands: [solidA, solidB],
        bounds: this._combineBounds(solidA.bounds, solidB.bounds, 'union')
      };
    },
    /**
     * Subtract solidB from solidA
     */
    subtract(solidA, solidB) {
      return {
        type: 'boolean_subtract',
        operation: 'subtract',
        operands: [solidA, solidB],
        bounds: solidA.bounds  // Result bounded by A
      };
    },
    /**
     * Intersection of two solids
     */
    intersect(solidA, solidB) {
      return {
        type: 'boolean_intersect',
        operation: 'intersect',
        operands: [solidA, solidB],
        bounds: this._combineBounds(solidA.bounds, solidB.bounds, 'intersect')
      };
    },
    _combineBounds(boundsA, boundsB, operation) {
      if (!boundsA || !boundsB) return boundsA || boundsB;

      if (operation === 'union') {
        return {
          min: {
            x: Math.min(boundsA.min.x, boundsB.min.x),
            y: Math.min(boundsA.min.y, boundsB.min.y),
            z: Math.min(boundsA.min.z, boundsB.min.z)
          },
          max: {
            x: Math.max(boundsA.max.x, boundsB.max.x),
            y: Math.max(boundsA.max.y, boundsB.max.y),
            z: Math.max(boundsA.max.z, boundsB.max.z)
          }
        };
      } else {
        return {
          min: {
            x: Math.max(boundsA.min.x, boundsB.min.x),
            y: Math.max(boundsA.min.y, boundsB.min.y),
            z: Math.max(boundsA.min.z, boundsB.min.z)
          },
          max: {
            x: Math.min(boundsA.max.x, boundsB.max.x),
            y: Math.min(boundsA.max.y, boundsB.max.y),
            z: Math.min(boundsA.max.z, boundsB.max.z)
          }
        };
      }
    }
  },
  // FILLET & CHAMFER

  fillet: {
    /**
     * Create fillet on edge
     */
    createEdgeFillet(edge, radius) {
      return {
        type: 'fillet',
        edge,
        radius,
        segments: Math.max(8, Math.ceil(radius * 16)),
        points: this._generateFilletPoints(edge, radius)
      };
    },
    /**
     * Create variable radius fillet
     */
    createVariableFillet(edge, radiusStart, radiusEnd) {
      return {
        type: 'variable_fillet',
        edge,
        radiusStart,
        radiusEnd,
        points: this._generateVariableFilletPoints(edge, radiusStart, radiusEnd)
      };
    },
    _generateFilletPoints(edge, radius) {
      const points = [];
      const segments = Math.max(8, Math.ceil(radius * 16));

      for (let i = 0; i <= segments; i++) {
        const angle = (Math.PI / 2) * (i / segments);
        points.push({
          offset1: radius * (1 - Math.cos(angle)),
          offset2: radius * (1 - Math.sin(angle))
        });
      }
      return points;
    },
    _generateVariableFilletPoints(edge, r1, r2) {
      const points = [];
      const segments = 16;

      for (let t = 0; t <= 1; t += 1/segments) {
        const r = r1 + (r2 - r1) * t;
        for (let i = 0; i <= 8; i++) {
          const angle = (Math.PI / 2) * (i / 8);
          points.push({
            t,
            offset1: r * (1 - Math.cos(angle)),
            offset2: r * (1 - Math.sin(angle))
          });
        }
      }
      return points;
    }
  },
  chamfer: {
    /**
     * Create chamfer on edge
     */
    createEdgeChamfer(edge, distance1, distance2 = null) {
      return {
        type: 'chamfer',
        edge,
        distance1,
        distance2: distance2 || distance1,
        angle: Math.atan2(distance2 || distance1, distance1) * 180 / Math.PI
      };
    },
    /**
     * Create angle-based chamfer
     */
    createAngleChamfer(edge, distance, angle) {
      return {
        type: 'angle_chamfer',
        edge,
        distance1: distance,
        distance2: distance * Math.tan(angle * Math.PI / 180),
        angle
      };
    }
  },
  // DRAFT ANGLE

  draft: {
    /**
     * Apply draft angle to faces
     */
    applyDraft(faces, angle, pullDirection) {
      return {
        type: 'draft',
        faces,
        angle,  // degrees
        pullDirection,  // {x, y, z} normalized
        tanAngle: Math.tan(angle * Math.PI / 180)
      };
    },
    /**
     * Analyze draft on face
     */
    analyzeDraft(face, pullDirection) {
      // Calculate face normal
      const normal = face.normal || { x: 0, y: 0, z: 1 };

      // Calculate angle between normal and pull direction
      const dot = normal.x * pullDirection.x +
                  normal.y * pullDirection.y +
                  normal.z * pullDirection.z;
      const angle = Math.acos(Math.abs(dot)) * 180 / Math.PI;

      return {
        face,
        draftAngle: 90 - angle,
        hasDraft: angle < 90,
        needsDraft: angle === 90  // Perpendicular to pull
      };
    }
  },
  // SHELL OPERATION

  shell: {
    /**
     * Create shell from solid
     */
    createShell(solid, thickness, facesToRemove = []) {
      return {
        type: 'shell',
        original: solid,
        thickness,
        facesToRemove,
        direction: 'inside'  // or 'outside', 'both'
      };
    }
  },
  // OFFSET OPERATIONS

  offset: {
    /**
     * Offset curve
     */
    offsetCurve(curve, distance) {
      if (!curve.points) return null;

      const offsetPoints = [];

      for (let i = 0; i < curve.points.length; i++) {
        const prev = curve.points[i > 0 ? i - 1 : curve.points.length - 1];
        const curr = curve.points[i];
        const next = curve.points[(i + 1) % curve.points.length];

        // Calculate normal
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        const len = Math.sqrt(dx*dx + dy*dy);
        const nx = -dy / len;
        const ny = dx / len;

        offsetPoints.push({
          x: curr.x + nx * distance,
          y: curr.y + ny * distance,
          z: curr.z || 0
        });
      }
      return {
        type: 'offset_curve',
        original: curve,
        distance,
        points: offsetPoints
      };
    },
    /**
     * Offset surface
     */
    offsetSurface(surface, distance) {
      return {
        type: 'offset_surface',
        original: surface,
        distance,
        direction: distance > 0 ? 'outward' : 'inward'
      };
    }
  }
};
// PHASE 1.3: 5-AXIS FEATURE ENGINE

const FIVE_AXIS_FEATURE_ENGINE = {
  version: '1.0.0',

  // UNDERCUT DETECTION

  /**
   * Detect undercuts requiring 5-axis
   */
  detectUndercuts(geometry, toolAxis = { x: 0, y: 0, z: 1 }) {
    const undercuts = [];

    // Analyze each face for visibility from tool axis
    if (geometry.faces) {
      geometry.faces.forEach((face, idx) => {
        const normal = face.normal || this._calculateFaceNormal(face);
        const dot = normal.x * toolAxis.x + normal.y * toolAxis.y + normal.z * toolAxis.z;

        // Face is undercut if normal points away from tool
        if (dot < -0.1) {  // Small threshold for near-parallel
          undercuts.push({
            faceIndex: idx,
            face,
            normal,
            angle: Math.acos(Math.abs(dot)) * 180 / Math.PI,
            severity: dot < -0.5 ? 'severe' : 'moderate',
            requiredTilt: Math.acos(-dot) * 180 / Math.PI
          });
        }
      });
    }
    return {
      hasUndercuts: undercuts.length > 0,
      undercuts,
      requires5Axis: undercuts.some(u => u.severity === 'severe'),
      maxTiltRequired: Math.max(0, ...undercuts.map(u => u.requiredTilt))
    };
  },
  _calculateFaceNormal(face) {
    if (face.vertices && face.vertices.length >= 3) {
      const v0 = face.vertices[0];
      const v1 = face.vertices[1];
      const v2 = face.vertices[2];

      const ax = v1.x - v0.x, ay = v1.y - v0.y, az = v1.z - v0.z;
      const bx = v2.x - v0.x, by = v2.y - v0.y, bz = v2.z - v0.z;

      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;
      const len = Math.sqrt(nx*nx + ny*ny + nz*nz);

      return { x: nx/len, y: ny/len, z: nz/len };
    }
    return { x: 0, y: 0, z: 1 };
  },
  // IMPELLER/BLADE ANALYSIS

  /**
   * Analyze impeller geometry
   */
  analyzeImpeller(geometry) {
    const result = {
      type: 'impeller',
      bladeCount: 0,
      hubDiameter: 0,
      outerDiameter: 0,
      bladeHeight: 0,
      bladeAngle: 0,
      leadEdgeRadius: 0,
      trailEdgeRadius: 0,
      flowPath: 'radial',  // or 'axial', 'mixed'
      machiningStrategy: null,
      toolRecommendations: []
    };
    // Detect blade count from geometry
    if (geometry.blades) {
      result.bladeCount = geometry.blades.length;
    } else if (geometry.features) {
      result.bladeCount = geometry.features.filter(f =>
        f.type === 'blade' || f.type === 'vane'
      ).length;
    }
    // Determine machining strategy
    if (result.bladeCount > 0) {
      result.machiningStrategy = this._determineImpellerStrategy(result);
      result.toolRecommendations = this._recommendImpellerTools(result);
    }
    return result;
  },
  _determineImpellerStrategy(impeller) {
    const strategies = [];

    // Hub roughing
    strategies.push({
      operation: 'hub_rough',
      type: '3+2',
      description: 'Index to blade center, rough hub between blades'
    });

    // Blade roughing
    strategies.push({
      operation: 'blade_rough',
      type: '5-axis_swarf',
      description: 'Rough blade surfaces with swarf cutting'
    });

    // Blade finishing
    strategies.push({
      operation: 'blade_finish',
      type: '5-axis_flowline',
      description: 'Finish blades with flowline or scallop control'
    });

    // Fillet machining
    strategies.push({
      operation: 'fillet',
      type: '5-axis_contour',
      description: 'Machine blade-hub fillets'
    });

    return strategies;
  },
  _recommendImpellerTools(impeller) {
    return [
      { type: 'bull_nose', diameter: 0.5, cornerRadius: 0.125, use: 'roughing' },
      { type: 'ball_endmill', diameter: 0.25, use: 'blade_finishing' },
      { type: 'tapered_ball', diameter: 0.125, taper: 1, use: 'fillet' },
      { type: 'lollipop', diameter: 0.25, neckDia: 0.125, use: 'undercut' }
    ];
  },
  // PORT/MANIFOLD ANALYSIS

  /**
   * Analyze port/manifold features
   */
  analyzePort(geometry) {
    const result = {
      type: 'port',
      entryDiameter: 0,
      exitDiameter: 0,
      length: 0,
      curvature: [],
      crossSection: 'circular',  // or 'oval', 'rectangular'
      branches: 0,
      accessibility: [],
      machiningApproach: null
    };
    // Analyze port path
    if (geometry.path) {
      result.length = this._calculatePathLength(geometry.path);
      result.curvature = this._analyzeCurvature(geometry.path);
    }
    // Determine accessibility
    result.accessibility = this._analyzeAccessibility(geometry);

    // Determine machining approach
    result.machiningApproach = this._determinePortStrategy(result);

    return result;
  },
  _calculatePathLength(path) {
    let length = 0;
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i-1].x;
      const dy = path[i].y - path[i-1].y;
      const dz = path[i].z - path[i-1].z;
      length += Math.sqrt(dx*dx + dy*dy + dz*dz);
    }
    return length;
  },
  _analyzeCurvature(path) {
    const curvature = [];
    for (let i = 1; i < path.length - 1; i++) {
      const v1 = {
        x: path[i].x - path[i-1].x,
        y: path[i].y - path[i-1].y,
        z: path[i].z - path[i-1].z
      };
      const v2 = {
        x: path[i+1].x - path[i].x,
        y: path[i+1].y - path[i].y,
        z: path[i+1].z - path[i].z
      };
      const dot = v1.x*v2.x + v1.y*v2.y + v1.z*v2.z;
      const len1 = Math.sqrt(v1.x*v1.x + v1.y*v1.y + v1.z*v1.z);
      const len2 = Math.sqrt(v2.x*v2.x + v2.y*v2.y + v2.z*v2.z);
      const angle = Math.acos(dot / (len1 * len2)) * 180 / Math.PI;

      curvature.push({ index: i, angle });
    }
    return curvature;
  },
  _analyzeAccessibility(geometry) {
    const approaches = [
      { direction: '+Z', vector: { x: 0, y: 0, z: 1 } },
      { direction: '-Z', vector: { x: 0, y: 0, z: -1 } },
      { direction: '+X', vector: { x: 1, y: 0, z: 0 } },
      { direction: '-X', vector: { x: -1, y: 0, z: 0 } },
      { direction: '+Y', vector: { x: 0, y: 1, z: 0 } },
      { direction: '-Y', vector: { x: 0, y: -1, z: 0 } }
    ];

    return approaches.map(approach => ({
      direction: approach.direction,
      accessible: true,  // Would need full analysis
      clearance: 'unknown'
    }));
  },
  _determinePortStrategy(portAnalysis) {
    const strategies = [];

    // Entry drilling/boring
    strategies.push({
      operation: 'entry_bore',
      type: '3-axis',
      description: 'Drill and bore port entry'
    });

    // Internal roughing
    strategies.push({
      operation: 'port_rough',
      type: '5-axis_port',
      description: 'Multi-axis port roughing with barrel cutter'
    });

    // Blending
    strategies.push({
      operation: 'blend',
      type: '5-axis_flowline',
      description: 'Blend port intersections'
    });

    // Finishing
    strategies.push({
      operation: 'port_finish',
      type: '5-axis_contour',
      description: 'Finish port walls for flow'
    });

    return strategies;
  },
  // OPTIMAL TOOL AXIS CALCULATION

  /**
   * Calculate optimal tool axis for face
   */
  calculateOptimalAxis(face, constraints = {}) {
    const normal = face.normal || this._calculateFaceNormal(face);
    const {
      maxTilt = 90,
      preferVertical = true,
      avoidCollision = true
    } = constraints;

    // Start with face normal
    let axis = { ...normal };

    // Apply tilt limit
    const currentTilt = Math.acos(Math.abs(axis.z)) * 180 / Math.PI;
    if (currentTilt > maxTilt) {
      // Limit tilt
      const scale = Math.cos(maxTilt * Math.PI / 180) / Math.abs(axis.z);
      axis.x *= scale;
      axis.y *= scale;
      axis.z = Math.sign(axis.z) * Math.cos(maxTilt * Math.PI / 180);

      // Normalize
      const len = Math.sqrt(axis.x*axis.x + axis.y*axis.y + axis.z*axis.z);
      axis.x /= len;
      axis.y /= len;
      axis.z /= len;
    }
    return {
      axis,
      tilt: Math.acos(Math.abs(axis.z)) * 180 / Math.PI,
      azimuth: Math.atan2(axis.y, axis.x) * 180 / Math.PI
    };
  },
  // 5-AXIS TOOLPATH STRATEGIES

  toolpathStrategies: {
    swarf: {
      name: 'Swarf Cutting',
      description: 'Side cutting with tool tilted to surface',
      suitable: ['ruled_surfaces', 'blade_sides', 'turbine_vanes'],
      parameters: ['tiltAngle', 'leadAngle', 'stepover']
    },
    flowline: {
      name: 'Flowline Machining',
      description: 'Toolpath follows natural surface flow',
      suitable: ['freeform_surfaces', 'ports', 'blends'],
      parameters: ['stepover', 'direction', 'scallop']
    },
    multiaxis_contour: {
      name: '5-Axis Contour',
      description: 'Continuous 5-axis with tool normal to surface',
      suitable: ['complex_surfaces', 'cavities', 'molds'],
      parameters: ['stepover', 'tiltControl', 'leadAngle']
    },
    port: {
      name: 'Port Machining',
      description: 'Specialized for manifold/port features',
      suitable: ['ports', 'runners', 'inlet_exhaust'],
      parameters: ['entryAngle', 'toolReach', 'overlap']
    }
  },
  /**
   * Select best 5-axis strategy
   */
  selectStrategy(feature, machineCapability) {
    const analysis = {
      feature: feature.type,
      recommendations: [],
      warnings: []
    };
    // Check machine capability
    if (!machineCapability.has5Axis) {
      analysis.warnings.push('Machine does not have 5-axis capability');
      return analysis;
    }
    // Match feature to strategy
    for (const [stratName, strat] of Object.entries(this.toolpathStrategies)) {
      if (strat.suitable.some(s => feature.type?.includes(s))) {
        analysis.recommendations.push({
          strategy: stratName,
          name: strat.name,
          confidence: 0.9
        });
      }
    }
    return analysis;
  }
};
// PHASE 2.1: FULL MACHINE SIMULATION

const FULL_MACHINE_SIMULATION = {
  version: '1.0.0',

  // MACHINE KINEMATIC CONFIGURATIONS

  machineKinematics: {
    'table_table': {
      name: 'Table-Table (Trunnion)',
      type: 'TT',
      rotaryAxes: ['A', 'C'],
      structure: ['X', 'Y', 'Z', 'A', 'C'],
      pivotPoint: { x: 0, y: 0, z: 0 },
      limits: {
        A: { min: -120, max: 120 },
        C: { min: -360, max: 360 }
      }
    },
    'head_head': {
      name: 'Head-Head (Nutating)',
      type: 'HH',
      rotaryAxes: ['A', 'C'],
      structure: ['X', 'Y', 'Z', 'A', 'C'],
      pivotPoint: { x: 0, y: 0, z: -6 },
      limits: {
        A: { min: -30, max: 120 },
        C: { min: -360, max: 360 }
      }
    },
    'table_head': {
      name: 'Table-Head (Mixed)',
      type: 'TH',
      rotaryAxes: ['B', 'C'],
      structure: ['X', 'Y', 'Z', 'B', 'C'],
      pivotPoint: { x: 0, y: 0, z: 0 },
      limits: {
        B: { min: -110, max: 110 },
        C: { min: -360, max: 360 }
      }
    },
    'head_table': {
      name: 'Head-Table',
      type: 'HT',
      rotaryAxes: ['A', 'C'],
      structure: ['X', 'Y', 'Z', 'A', 'C'],
      limits: {
        A: { min: -120, max: 30 },
        C: { min: -360, max: 360 }
      }
    }
  },
  // MACHINE COMPONENT MODELS

  machineComponents: {
    spindle: {
      type: 'cylinder',
      diameter: 3,  // inches
      length: 8,
      noseToGage: 4  // inches from nose to gage line
    },
    holder: {
      bt40: { diameter: 2.5, length: 4, flange: 2.48 },
      cat40: { diameter: 2.5, length: 4, flange: 2.5 },
      hsk63a: { diameter: 2.48, length: 2, flange: 2.5 }
    },
    table: {
      diameter: 12,  // inches
      height: 2,
      tSlots: 4
    }
  },
  // KINEMATIC CHAIN CALCULATION

  /**
   * Calculate tool tip position from axis positions
   */
  calculateToolPosition(machineConfig, axisPositions, toolLength) {
    const config = this.machineKinematics[machineConfig] || this.machineKinematics.table_table;

    let position = { x: 0, y: 0, z: 0 };
    let toolAxis = { x: 0, y: 0, z: 1 };  // Default pointing down

    // Apply linear axes
    position.x = axisPositions.X || 0;
    position.y = axisPositions.Y || 0;
    position.z = axisPositions.Z || 0;

    // Apply rotary transformations based on machine type
    if (config.type === 'TT') {
      // Table-Table: Part rotates, tool stays vertical
      const A = (axisPositions.A || 0) * Math.PI / 180;
      const C = (axisPositions.C || 0) * Math.PI / 180;

      // Rotate position around A then C
      const cosA = Math.cos(A), sinA = Math.sin(A);
      const cosC = Math.cos(C), sinC = Math.sin(C);

      // Apply C rotation to position
      const px = position.x * cosC - position.y * sinC;
      const py = position.x * sinC + position.y * cosC;
      position.x = px;
      position.y = py;

      // Apply A rotation to position
      const py2 = position.y * cosA - position.z * sinA;
      const pz = position.y * sinA + position.z * cosA;
      position.y = py2;
      position.z = pz;

    } else if (config.type === 'HH') {
      // Head-Head: Tool tilts, part stays fixed
      const A = (axisPositions.A || 0) * Math.PI / 180;
      const C = (axisPositions.C || 0) * Math.PI / 180;

      // Tool axis changes
      toolAxis = {
        x: Math.sin(A) * Math.sin(C),
        y: Math.sin(A) * Math.cos(C),
        z: Math.cos(A)
      };
      // Adjust position for pivot
      position.x += config.pivotPoint.x;
      position.y += config.pivotPoint.y;
      position.z += config.pivotPoint.z;
    }
    // Apply tool length
    position.x -= toolAxis.x * toolLength;
    position.y -= toolAxis.y * toolLength;
    position.z -= toolAxis.z * toolLength;

    return {
      position,
      toolAxis,
      axisValues: axisPositions
    };
  },
  // COLLISION ZONE GENERATION

  /**
   * Generate collision zones for machine components
   */
  generateCollisionZones(machineConfig, toolAssembly) {
    const zones = [];

    // Spindle zone
    const spindle = this.machineComponents.spindle;
    zones.push({
      id: 'spindle',
      type: 'cylinder',
      center: { x: 0, y: 0, z: spindle.noseToGage / 2 },
      radius: spindle.diameter / 2,
      height: spindle.length,
      static: false  // Moves with spindle
    });

    // Tool holder zone
    const holder = this.machineComponents.holder[toolAssembly.holderType] ||
                   this.machineComponents.holder.cat40;
    zones.push({
      id: 'holder',
      type: 'cylinder',
      center: { x: 0, y: 0, z: -holder.length / 2 },
      radius: holder.diameter / 2,
      height: holder.length,
      static: false
    });

    // Tool shank zone
    if (toolAssembly.shankDiameter && toolAssembly.shankLength) {
      zones.push({
        id: 'tool_shank',
        type: 'cylinder',
        center: { x: 0, y: 0, z: -(holder.length + toolAssembly.shankLength / 2) },
        radius: toolAssembly.shankDiameter / 2,
        height: toolAssembly.shankLength,
        static: false
      });
    }
    // Tool cutting portion
    zones.push({
      id: 'tool_cutting',
      type: 'cylinder',
      center: { x: 0, y: 0, z: -(holder.length + (toolAssembly.shankLength || 0) + toolAssembly.cuttingLength / 2) },
      radius: toolAssembly.diameter / 2,
      height: toolAssembly.cuttingLength,
      static: false
    });

    // Table zone
    const table = this.machineComponents.table;
    zones.push({
      id: 'table',
      type: 'cylinder',
      center: { x: 0, y: 0, z: -table.height / 2 },
      radius: table.diameter / 2,
      height: table.height,
      static: true
    });

    return zones;
  },
  // FULL COLLISION CHECK

  /**
   * Check for collision at given configuration
   */
  checkCollision(machineConfig, axisPositions, toolAssembly, workpiece, fixtures = []) {
    const result = {
      collision: false,
      collisions: [],
      warnings: [],
      clearances: {}
    };
    // Get tool position and orientation
    const toolPose = this.calculateToolPosition(
      machineConfig,
      axisPositions,
      toolAssembly.totalLength
    );

    // Generate collision zones
    const zones = this.generateCollisionZones(machineConfig, toolAssembly);

    // Transform zones to current position
    const transformedZones = zones.filter(z => !z.static).map(zone =>
      this._transformZone(zone, toolPose)
    );

    // Check tool assembly vs workpiece
    if (workpiece) {
      const wpCollision = this._checkZoneVsWorkpiece(transformedZones, workpiece);
      if (wpCollision.collision) {
        result.collision = true;
        result.collisions.push({
          type: 'tool_workpiece',
          zone: wpCollision.zone,
          penetration: wpCollision.penetration
        });
      }
      result.clearances.workpiece = wpCollision.clearance;
    }
    // Check tool assembly vs fixtures
    fixtures.forEach((fixture, idx) => {
      const fxCollision = this._checkZoneVsFixture(transformedZones, fixture);
      if (fxCollision.collision) {
        result.collision = true;
        result.collisions.push({
          type: 'tool_fixture',
          fixtureIndex: idx,
          zone: fxCollision.zone
        });
      }
    });

    // Check axis limits
    const config = this.machineKinematics[machineConfig];
    if (config?.limits) {
      for (const [axis, limits] of Object.entries(config.limits)) {
        const value = axisPositions[axis] || 0;
        if (value < limits.min || value > limits.max) {
          result.collision = true;
          result.collisions.push({
            type: 'axis_limit',
            axis,
            value,
            limits
          });
        }
      }
    }
    return result;
  },
  _transformZone(zone, toolPose) {
    return {
      ...zone,
      center: {
        x: zone.center.x + toolPose.position.x,
        y: zone.center.y + toolPose.position.y,
        z: zone.center.z + toolPose.position.z
      }
    };
  },
  _checkZoneVsWorkpiece(zones, workpiece) {
    let minClearance = Infinity;
    let collision = false;
    let collidingZone = null;
    let penetration = 0;

    // Simplified AABB check
    zones.forEach(zone => {
      if (zone.type === 'cylinder') {
        const zMin = zone.center.z - zone.height / 2;
        const zMax = zone.center.z + zone.height / 2;

        // Check if zone overlaps with workpiece bounds
        if (workpiece.bounds) {
          const wpZMin = workpiece.bounds.min?.z || 0;
          const wpZMax = workpiece.bounds.max?.z || 0;

          if (zMin < wpZMax && zMax > wpZMin) {
            // Z overlap - check XY
            const xDist = Math.abs(zone.center.x - (workpiece.bounds.min.x + workpiece.bounds.max.x) / 2);
            const yDist = Math.abs(zone.center.y - (workpiece.bounds.min.y + workpiece.bounds.max.y) / 2);
            const wpHalfX = (workpiece.bounds.max.x - workpiece.bounds.min.x) / 2;
            const wpHalfY = (workpiece.bounds.max.y - workpiece.bounds.min.y) / 2;

            if (xDist < wpHalfX + zone.radius && yDist < wpHalfY + zone.radius) {
              if (zone.id !== 'tool_cutting') {  // Cutting tool is supposed to touch
                collision = true;
                collidingZone = zone.id;
                penetration = Math.min(wpHalfX + zone.radius - xDist, wpHalfY + zone.radius - yDist);
              }
            }
            const clearance = Math.min(xDist - wpHalfX - zone.radius, yDist - wpHalfY - zone.radius);
            minClearance = Math.min(minClearance, clearance);
          }
        }
      }
    });

    return {
      collision,
      zone: collidingZone,
      penetration,
      clearance: minClearance
    };
  },
  _checkZoneVsFixture(zones, fixture) {
    // Similar to workpiece check
    return { collision: false, zone: null };
  },
  // VALIDATE FULL TOOLPATH

  /**
   * Validate entire toolpath for collisions
   */
  validateToolpath(toolpath, machineConfig, toolAssembly, workpiece, fixtures) {
    const result = {
      valid: true,
      collisions: [],
      warnings: [],
      checkedMoves: 0
    };
    let prevPosition = null;

    toolpath.forEach((move, idx) => {
      const axisPositions = {
        X: move.x || 0,
        Y: move.y || 0,
        Z: move.z || 0,
        A: move.a || 0,
        B: move.b || 0,
        C: move.c || 0
      };
      // Check collision at this position
      const check = this.checkCollision(
        machineConfig,
        axisPositions,
        toolAssembly,
        workpiece,
        fixtures
      );

      if (check.collision) {
        result.valid = false;
        result.collisions.push({
          moveIndex: idx,
          position: axisPositions,
          details: check.collisions
        });
      }
      // Check rapid through material
      if (move.type === 'rapid' && prevPosition) {
        const rapidCheck = this._checkRapidCollision(
          prevPosition,
          axisPositions,
          workpiece
        );
        if (rapidCheck.collision) {
          result.warnings.push({
            type: 'rapid_through_material',
            moveIndex: idx,
            from: prevPosition,
            to: axisPositions
          });
        }
      }
      prevPosition = axisPositions;
      result.checkedMoves++;
    });

    return result;
  },
  _checkRapidCollision(from, to, workpiece) {
    // Check if rapid move passes through workpiece
    if (!workpiece?.bounds) return { collision: false };

    // Simplified: check if Z drops below safe height while in XY bounds
    if (to.Z < 0.1 && from.Z > 0.1) {
      const inXBounds = to.X >= workpiece.bounds.min.x && to.X <= workpiece.bounds.max.x;
      const inYBounds = to.Y >= workpiece.bounds.min.y && to.Y <= workpiece.bounds.max.y;

      if (inXBounds && inYBounds) {
        return { collision: true };
      }
    }
    return { collision: false };
  }
};
// PHASE 2.2: MATERIAL REMOVAL SIMULATION

const MATERIAL_REMOVAL_SIMULATION = {
  version: '1.0.0',

  // VOXEL GRID MANAGEMENT

  /**
   * Create voxel grid from stock
   */
  createVoxelGrid(stock, resolution = 0.025) {
    const sizeX = Math.ceil((stock.length || stock.x) / resolution);
    const sizeY = Math.ceil((stock.width || stock.y) / resolution);
    const sizeZ = Math.ceil((stock.height || stock.z) / resolution);

    // Limit size for performance
    const maxVoxels = 500000;
    const totalVoxels = sizeX * sizeY * sizeZ;

    let adjustedResolution = resolution;
    if (totalVoxels > maxVoxels) {
      const scale = Math.cbrt(totalVoxels / maxVoxels);
      adjustedResolution = resolution * scale;
    }
    const grid = {
      resolution: adjustedResolution,
      sizeX: Math.ceil((stock.length || stock.x) / adjustedResolution),
      sizeY: Math.ceil((stock.width || stock.y) / adjustedResolution),
      sizeZ: Math.ceil((stock.height || stock.z) / adjustedResolution),
      origin: { x: 0, y: 0, z: 0 },
      data: null  // Will use sparse representation
    };
    // Use sparse storage (only track removed voxels)
    grid.removed = new Set();
    grid.isSolid = (x, y, z) => {
      if (x < 0 || x >= grid.sizeX || y < 0 || y >= grid.sizeY || z < 0 || z >= grid.sizeZ) {
        return false;
      }
      return !grid.removed.has(`${x},${y},${z}`);
    };
    grid.setRemoved = (x, y, z) => {
      if (x >= 0 && x < grid.sizeX && y >= 0 && y < grid.sizeY && z >= 0 && z < grid.sizeZ) {
        grid.removed.add(`${x},${y},${z}`);
      }
    };
    return grid;
  },
  /**
   * Simulate material removal along toolpath
   */
  simulateRemoval(grid, toolpath, tool) {
    const stats = {
      voxelsRemoved: 0,
      volumeRemoved: 0,
      maxEngagement: 0,
      collisions: []
    };
    const toolRadius = (tool.diameter || 0.5) / 2;
    const toolRadiusVoxels = Math.ceil(toolRadius / grid.resolution);

    toolpath.forEach((move, idx) => {
      if (move.type === 'rapid') return;  // Rapids don't cut

      // Convert position to voxel coordinates
      const vx = Math.floor((move.x - grid.origin.x) / grid.resolution);
      const vy = Math.floor((move.y - grid.origin.y) / grid.resolution);
      const vz = Math.floor((move.z - grid.origin.z) / grid.resolution);

      // Remove voxels within tool radius
      let engagement = 0;

      for (let dx = -toolRadiusVoxels; dx <= toolRadiusVoxels; dx++) {
        for (let dy = -toolRadiusVoxels; dy <= toolRadiusVoxels; dy++) {
          const dist = Math.sqrt(dx*dx + dy*dy) * grid.resolution;
          if (dist <= toolRadius) {
            // Tool reaches this XY position - remove all Z above tool bottom
            for (let dz = 0; dz <= grid.sizeZ - vz; dz++) {
              if (grid.isSolid(vx + dx, vy + dy, vz + dz)) {
                grid.setRemoved(vx + dx, vy + dy, vz + dz);
                stats.voxelsRemoved++;
                engagement++;
              }
            }
          }
        }
      }
      stats.maxEngagement = Math.max(stats.maxEngagement, engagement);
    });

    stats.volumeRemoved = stats.voxelsRemoved * Math.pow(grid.resolution, 3);

    return stats;
  },
  /**
   * Get remaining material visualization
   */
  getRemainingMaterial(grid) {
    const surfaces = [];

    // Find surface voxels (voxels adjacent to removed or empty space)
    for (let x = 0; x < grid.sizeX; x++) {
      for (let y = 0; y < grid.sizeY; y++) {
        for (let z = 0; z < grid.sizeZ; z++) {
          if (grid.isSolid(x, y, z)) {
            // Check if any neighbor is empty
            const hasEmptyNeighbor =
              !grid.isSolid(x-1, y, z) || !grid.isSolid(x+1, y, z) ||
              !grid.isSolid(x, y-1, z) || !grid.isSolid(x, y+1, z) ||
              !grid.isSolid(x, y, z-1) || !grid.isSolid(x, y, z+1);

            if (hasEmptyNeighbor) {
              surfaces.push({
                x: grid.origin.x + x * grid.resolution,
                y: grid.origin.y + y * grid.resolution,
                z: grid.origin.z + z * grid.resolution
              });
            }
          }
        }
      }
    }
    return surfaces;
  },
  // GOUGE DETECTION

  /**
   * Detect gouges (material removed that shouldn't be)
   */
  detectGouges(grid, targetGeometry) {
    const gouges = [];

    // Compare current state to target
    // A gouge is where material is removed but target says it should be solid

    grid.removed.forEach(key => {
      const [x, y, z] = key.split(',').map(Number);
      const worldPos = {
        x: grid.origin.x + x * grid.resolution,
        y: grid.origin.y + y * grid.resolution,
        z: grid.origin.z + z * grid.resolution
      };
      // Check if this position should be solid in target
      if (this._isInsideTarget(worldPos, targetGeometry)) {
        gouges.push({
          position: worldPos,
          voxel: { x, y, z },
          depth: this._calculateGougeDepth(worldPos, targetGeometry)
        });
      }
    });

    return {
      hasGouges: gouges.length > 0,
      count: gouges.length,
      gouges,
      maxDepth: Math.max(0, ...gouges.map(g => g.depth))
    };
  },
  _isInsideTarget(pos, target) {
    if (!target?.bounds) return false;

    // Simple bounds check - would need more complex for actual geometry
    return pos.x >= target.bounds.min.x && pos.x <= target.bounds.max.x &&
           pos.y >= target.bounds.min.y && pos.y <= target.bounds.max.y &&
           pos.z >= target.bounds.min.z && pos.z <= target.bounds.max.z;
  },
  _calculateGougeDepth(pos, target) {
    // Calculate signed distance from position to nearest target surface
    if (!target || !target.bounds) return 0;

    // Distance to AABB (Axis-Aligned Bounding Box)
    const dx = Math.max(target.bounds.min.x - pos.x, 0, pos.x - target.bounds.max.x);
    const dy = Math.max(target.bounds.min.y - pos.y, 0, pos.y - target.bounds.max.y);
    const dz = Math.max(target.bounds.min.z - pos.z, 0, pos.z - target.bounds.max.z);

    // If inside bounds, calculate depth below surface (negative = gouging)
    if (dx === 0 && dy === 0 && dz === 0) {
      // Inside the box - find minimum distance to any face
      const distToMinX = pos.x - target.bounds.min.x;
      const distToMaxX = target.bounds.max.x - pos.x;
      const distToMinY = pos.y - target.bounds.min.y;
      const distToMaxY = target.bounds.max.y - pos.y;
      const distToMinZ = pos.z - target.bounds.min.z;
      const distToMaxZ = target.bounds.max.z - pos.z;
      return -Math.min(distToMinX, distToMaxX, distToMinY, distToMaxY, distToMinZ, distToMaxZ);
    }
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
  },
  // EXCESS MATERIAL DETECTION

  /**
   * Detect excess material (material that should be removed but isn't)
   */
  detectExcessMaterial(grid, targetGeometry) {
    const excess = [];

    // Check all solid voxels to see if they should be removed
    for (let x = 0; x < grid.sizeX; x++) {
      for (let y = 0; y < grid.sizeY; y++) {
        for (let z = 0; z < grid.sizeZ; z++) {
          if (grid.isSolid(x, y, z)) {
            const worldPos = {
              x: grid.origin.x + x * grid.resolution,
              y: grid.origin.y + y * grid.resolution,
              z: grid.origin.z + z * grid.resolution
            };
            // Check if this should have been removed
            if (!this._isInsideTarget(worldPos, targetGeometry)) {
              // This is in stock but outside target - it's excess
              excess.push({
                position: worldPos,
                voxel: { x, y, z }
              });
            }
          }
        }
      }