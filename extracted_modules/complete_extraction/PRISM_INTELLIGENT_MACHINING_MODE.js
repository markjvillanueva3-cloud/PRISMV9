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
            f.