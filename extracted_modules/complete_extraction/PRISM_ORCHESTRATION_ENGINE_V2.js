const PRISM_ORCHESTRATION_ENGINE_V2 = {
  version: '3.0.0',

  // STATE MANAGEMENT HUB - Centralized workflow state tracking
  stateHub: {
    currentWorkflow: null,
    activeStage: null,
    machineModel: null,
    collisionResults: null,
    simulationData: null,
    learningData: [],
    subscribers: new Map(),
    history: [],

    // Subscribe to state changes
    subscribe(event, callback) {
      if (!this.subscribers.has(event)) {
        this.subscribers.set(event, []);
      }
      this.subscribers.get(event).push(callback);
      return () => this.unsubscribe(event, callback);
    },
    unsubscribe(event, callback) {
      const subs = this.subscribers.get(event) || [];
      const idx = subs.indexOf(callback);
      if (idx >= 0) subs.splice(idx, 1);
    },
    emit(event, data) {
      const subs = this.subscribers.get(event) || [];
      subs.forEach(cb => {
        try { cb(data); }
        catch (e) { console.warn('[StateHub] Subscriber error:', e); }
      });
      // Also emit to PRISM_EVENT_MANAGER if available
      if (typeof PRISM_EVENT_MANAGER !== 'undefined') {
        PRISM_EVENT_MANAGER.emit('orchestrator:' + event, data);
      }
    },
    setState(key, value) {
      const prev = this[key];
      this[key] = value;
      this.history.push({ key, prev, value, timestamp: Date.now() });
      this.emit('stateChange', { key, prev, value });
    },
    getState(key) {
      return this[key];
    },
    reset() {
      this.currentWorkflow = null;
      this.activeStage = null;
      this.machineModel = null;
      this.collisionResults = null;
      this.simulationData = null;
      this.emit('reset', { timestamp: Date.now() });
    }
  },
  // DECISION LOG & AUDIT TRAIL
  decisionLog: [],
  auditTrail: [],

  logDecision(stage, decision, reasoning, confidence) {
    const entry = {
      stage,
      decision,
      reasoning,
      confidence,
      timestamp: Date.now()
    };
    this.decisionLog.push(entry);
    this.auditTrail.push({
      type: 'decision',
      ...entry
    });
    this.stateHub.emit('decision', entry);
  },
  // 12-STAGE ENHANCED WORKFLOW

  async executeEnhancedWorkflow(input, options = {}) {
    console.log('[ORCHESTRATOR_V2] Starting enhanced 12-stage workflow...');
    this.stateHub.reset();

    const workflow = {
      id: 'WF2_' + Date.now(),
      version: '3.0.0',
      startTime: Date.now(),
      input,
      options,
      stages: [],
      reasoning: [],
      confidence: { overall: 0, byStage: {} },
      machineModel: null,
      collisionResults: null,
      simulationData: null,
      learningFeedback: null,
      result: null,
      warnings: [],
      success: false
    };
    this.stateHub.setState('currentWorkflow', workflow);

    try {
      // STAGE 1: Input Analysis & Feature Recognition
      workflow.stages.push(await this._stage1_analyzeInput(input, workflow));
      this.stateHub.setState('activeStage', 1);

      // STAGE 2: Material Processing & Lookup
      workflow.stages.push(await this._stage2_processMaterial(input, workflow));
      this.stateHub.setState('activeStage', 2);

      // STAGE 3: Machine Selection & 3D Model Loading (NEW)
      workflow.stages.push(await this._stage3_loadMachineModel(workflow));
      this.stateHub.setState('activeStage', 3);

      // STAGE 4: Tool Selection (using OPTIMIZED_TOOL_SELECTOR)
      workflow.stages.push(await this._stage4_selectTools(workflow));
      this.stateHub.setState('activeStage', 4);

      // STAGE 5: Feeds/Speeds Calculation (Manufacturer data priority)
      workflow.stages.push(await this._stage5_calculateParameters(workflow));
      this.stateHub.setState('activeStage', 5);

      // STAGE 6: Toolpath Strategy Selection
      workflow.stages.push(await this._stage6_selectToolpaths(workflow));
      this.stateHub.setState('activeStage', 6);

      // STAGE 7: Toolpath Generation
      workflow.stages.push(await this._stage7_generateToolpaths(workflow));
      this.stateHub.setState('activeStage', 7);

      // STAGE 8: Collision Detection & Pre-validation (NEW)
      workflow.stages.push(await this._stage8_detectCollisions(workflow));
      this.stateHub.setState('activeStage', 8);

      // STAGE 9: Validation & Safety Check
      workflow.stages.push(await this._stage9_validate(workflow));
      this.stateHub.setState('activeStage', 9);

      // STAGE 10: G-code Generation (Controller-specific)
      workflow.stages.push(await this._stage10_generateGcode(workflow));
      this.stateHub.setState('activeStage', 10);

      // STAGE 11: Full Simulation with Material Removal (NEW)
      workflow.stages.push(await this._stage11_simulate(workflow));
      this.stateHub.setState('activeStage', 11);

      // STAGE 12: Learning Engine Feedback (NEW)
      workflow.stages.push(await this._stage12_learningFeedback(workflow));
      this.stateHub.setState('activeStage', 12);

      // Calculate overall confidence
      workflow.confidence.overall = this._calculateOverallConfidence(workflow);

      // Compile final result
      workflow.result = this._compileEnhancedResult(workflow);
      workflow.success = true;
      workflow.endTime = Date.now();
      workflow.duration = workflow.endTime - workflow.startTime;

      // Store in decision log
      this.decisionLog.push(workflow);

      (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[ORCHESTRATOR_V2] Enhanced workflow complete. Confidence:',
        workflow.confidence.overall + '% | Duration:', workflow.duration + 'ms');

      this.stateHub.emit('workflowComplete', workflow);

    } catch (error) {
      console.error('[ORCHESTRATOR_V2] Workflow error:', error);
      workflow.error = error.message;
      workflow.success = false;
      workflow.endTime = Date.now();

      // Use failsafe if available
      if (typeof PRISM_FAILSAFE_GENERATOR !== 'undefined') {
        workflow.result = PRISM_FAILSAFE_GENERATOR.generateSafeStrategy(input);
        workflow.warnings.push('Used failsafe due to error: ' + error.message);
      }
      this.stateHub.emit('workflowError', { workflow, error });
    }
    return workflow;
  },
  // STAGE 1: Input Analysis & Feature Recognition

  async _stage1_analyzeInput(input, workflow) {
    const stage = {
      name: 'Input Analysis',
      stageNumber: 1,
      startTime: Date.now(),
      reasoning: [],
      decisions: [],
      result: null,
      confidence: 100
    };
    // Delegate to base orchestrator or COMPLETE_FEATURE_ENGINE
    if (typeof PRISM_COMPLETE_FEATURE_ENGINE !== 'undefined' && input.text) {
      const features = PRISM_COMPLETE_FEATURE_ENGINE.analyzeText(input.text);
      stage.result = { features: features.features, rawAnalysis: features };
      stage.confidence = features.confidence || 100;
    } else if (input.features) {
      stage.result = { features: input.features };
      stage.confidence = 100;
    } else {
      stage.result = { features: [{ type: 'generic', params: input }] };
      stage.confidence = 75;
    }
    stage.reasoning.push({
      step: 'Feature analysis complete',
      action: 'Identified ' + (stage.result.features?.length || 0) + ' features',
      confidence: stage.confidence
    });

    workflow.features = stage.result.features;
    stage.endTime = Date.now();
    workflow.confidence.byStage.stage1 = stage.confidence;

    this.logDecision(1, 'feature_recognition', stage.reasoning, stage.confidence);
    return stage;
  },
  // STAGE 2: Material Processing

  async _stage2_processMaterial(input, workflow) {
    const stage = {
      name: 'Material Processing',
      stageNumber: 2,
      startTime: Date.now(),
      reasoning: [],
      decisions: [],
      result: null,
      confidence: 100
    };
    let material = null;
    const materialName = input.material || input.materialName || '6061-T6';

    // Try DATABASE_HUB first
    if (typeof PRISM_DATABASE_HUB !== 'undefined' && PRISM_DATABASE_HUB.materials) {
      material = PRISM_DATABASE_HUB.materials[materialName] ||
                 PRISM_DATABASE_HUB.getMaterial?.(materialName);
    }
    // Try UNIFIED_MATERIALS
    if (!material && typeof window.UNIFIED_MATERIALS !== 'undefined') {
      material = UNIFIED_MATERIALS.getByName?.(materialName) ||
                 UNIFIED_MATERIALS[materialName];
    }
    // Fallback
    if (!material) {
      material = { name: materialName, sfm: 500, chipLoad: 0.003, hardness: 95 };
      stage.confidence = 75;
    }
    stage.result = { material };
    stage.reasoning.push({
      step: 'Material identified',
      action: 'Using ' + (material.name || materialName),
      data: { sfm: material.sfm, hardness: material.hardness }
    });

    workflow.material = material;
    stage.endTime = Date.now();
    workflow.confidence.byStage.stage2 = stage.confidence;

    this.logDecision(2, 'material_selection', stage.reasoning, stage.confidence);
    return stage;
  },
  // STAGE 3: Machine Selection & 3D Model Loading (NEW)

  async _stage3_loadMachineModel(workflow) {
    const stage = {
      name: 'Machine 3D Model Loading',
      stageNumber: 3,
      startTime: Date.now(),
      reasoning: [],
      decisions: [],
      result: null,
      confidence: 100
    };
    const machineId = workflow.input.machine || workflow.input.machineId || 'haas_vf2';
    let machineModel = null;
    let modelSource = 'none';

    stage.reasoning.push({
      step: 'Begin machine model resolution',
      action: 'Searching for machine: ' + machineId,
      priority: 'OEM Upload > Database > Procedural Generation'
    });

    // PRIORITY 1: Check user-uploaded OEM models (highest priority)
    if (typeof PRISM_MACHINE_3D_MODELS !== 'undefined') {
      const oemModel = PRISM_MACHINE_3D_MODELS.getMachineModel?.(machineId);
      if (oemModel && oemModel.cadData) {
        machineModel = oemModel;
        modelSource = 'oem_upload';
        stage.confidence = 100;

        stage.reasoning.push({
          step: 'OEM model found',
          action: 'Using uploaded CAD model from PRISM_MACHINE_3D_MODELS',
          data: {
            manufacturer: oemModel.manufacturer,
            complexity: oemModel.complexity,
            hasCollisionZones: !!oemModel.collisionZones
          }
        });
      }
    }
    // PRIORITY 2: Check PRISM_MACHINE_3D_DATABASE (68 integrated models)
    if (!machineModel && typeof PRISM_MACHINE_3D_DATABASE !== 'undefined') {
      const dbModel = PRISM_MACHINE_3D_DATABASE[machineId];
      if (dbModel) {
        machineModel = {
          ...dbModel,
          source: 'database',
          modelData: dbModel
        };
        modelSource = 'database';
        stage.confidence = 95;

        stage.reasoning.push({
          step: 'Database model found',
          action: 'Using model from PRISM_MACHINE_3D_DATABASE',
          data: {
            manufacturer: dbModel.manufacturer,
            model: dbModel.model,
            axes: dbModel.axes?.config,
            components: dbModel.components?.length || 0
          }
        });
      }
    }
    // PRIORITY 3: Check COMPLETE_MACHINE_DATABASE for specs
    if (!machineModel && typeof COMPLETE_MACHINE_DATABASE !== 'undefined') {
      // Search across all machine types
      const types = ['machines_3axis', 'machines_5axis', 'machines_lathe', 'machines_multitask'];
      for (const type of types) {
        if (COMPLETE_MACHINE_DATABASE[type]?.[machineId]) {
          const specs = COMPLETE_MACHINE_DATABASE[type][machineId];
          machineModel = {
            id: machineId,
            specs: specs,
            source: 'specs_only',
            needsGeneration: true
          };
          modelSource = 'specs_database';
          stage.confidence = 80;

          stage.reasoning.push({
            step: 'Machine specs found',
            action: 'Using specs from COMPLETE_MACHINE_DATABASE',
            data: { type, hasEnvelope: !!specs.work_envelope }
          });
          break;
        }
      }
    }
    // PRIORITY 4: Procedural generation fallback
    if (!machineModel && typeof MACHINE_MODEL_GENERATOR !== 'undefined') {
      machineModel = MACHINE_MODEL_GENERATOR.generateMachineModel?.(machineId) || {
        id: machineId,
        source: 'generated',
        generatedAt: Date.now()
      };
      modelSource = 'procedural';
      stage.confidence = 70;

      stage.reasoning.push({
        step: 'Generated procedural model',
        action: 'Created model using MACHINE_MODEL_GENERATOR',
        why: 'No OEM or database model available'
      });
    }
    // Extract collision zones if available
    if (machineModel) {
      machineModel.collisionZones = this._extractCollisionZones(machineModel);
      machineModel.workEnvelope = this._extractWorkEnvelope(machineModel);
      machineModel.kinematicChain = this._extractKinematicChain(machineModel);
    }
    stage.result = {
      machineModel,
      modelSource,
      hasCollisionData: !!(machineModel?.collisionZones?.length),
      hasKinematics: !!(machineModel?.kinematicChain)
    };
    workflow.machineModel = machineModel;
    this.stateHub.setState('machineModel', machineModel);

    stage.endTime = Date.now();
    workflow.confidence.byStage.stage3 = stage.confidence;

    this.logDecision(3, 'machine_model_load', stage.reasoning, stage.confidence);
    return stage;
  },
  // Helper: Extract collision zones from machine model
  _extractCollisionZones(machineModel) {
    if (machineModel.collisionZones) return machineModel.collisionZones;

    const zones = [];
    const specs = machineModel.specs || machineModel;

    // Create zones from work envelope
    if (specs.workEnvelope || specs.work_envelope) {
      const env = specs.workEnvelope || specs.work_envelope;
      zones.push({
        type: 'work_envelope',
        bounds: {
          x: env.x || [0, 500],
          y: env.y || [0, 400],
          z: env.z || [0, 400]
        },
        priority: 'critical'
      });
    }
    // Add spindle clearance zone
    zones.push({
      type: 'spindle_clearance',
      geometry: 'cylinder',
      radius: 100, // mm
      height: 200, // mm
      priority: 'high'
    });

    // Add table zone
    zones.push({
      type: 'table',
      geometry: 'box',
      dimensions: specs.tableSize || [600, 400, 50],
      priority: 'critical'
    });

    return zones;
  },
  // Helper: Extract work envelope
  _extractWorkEnvelope(machineModel) {
    const specs = machineModel.specs || machineModel.modelData || machineModel;
    return specs.workEnvelope || specs.work_envelope || {
      x: [0, 500],
      y: [0, 400],
      z: [0, 400]
    };
  },
  // Helper: Extract kinematic chain for simulation
  _extractKinematicChain(machineModel) {
    const specs = machineModel.specs || machineModel.modelData || machineModel;
    const axes = specs.axes || {};

    return {
      type: axes.config || '3-axis',
      linear: axes.linear || ['X', 'Y', 'Z'],
      rotary: axes.rotary || [],
      joints: (axes.linear || ['X', 'Y', 'Z']).map((ax, i) => ({
        name: ax,
        type: 'prismatic',
        axis: i,
        limits: specs.workEnvelope?.[ax.toLowerCase()] || [0, 500]
      })).concat(
        (axes.rotary || []).map((ax, i) => ({
          name: ax,
          type: 'revolute',
          limits: specs[ax.toLowerCase() + 'AxisRange'] || [-180, 180]
        }))
      )
    };
  },
  // STAGE 4: Tool Selection

  async _stage4_selectTools(workflow) {
    const stage = {
      name: 'Tool Selection',
      stageNumber: 4,
      startTime: Date.now(),
      reasoning: [],
      decisions: [],
      result: null,
      confidence: 100
    };
    const tools = [];

    for (const feature of (workflow.features || [])) {
      let tool = null;

      // Try PRISM_OPTIMIZED_TOOL_SELECTOR
      if (typeof PRISM_OPTIMIZED_TOOL_SELECTOR !== 'undefined') {
        tool = PRISM_OPTIMIZED_TOOL_SELECTOR.selectOptimalTool?.(feature, workflow.material);
      }
      // Fallback to PRISM_TOOL_DATABASE_V7
      if (!tool && typeof window.PRISM_TOOL_DATABASE_V7 !== 'undefined') {
        const toolType = this._getToolTypeForFeature(feature);
        const toolCategory = PRISM_TOOL_DATABASE_V7[toolType + 's'] || PRISM_TOOL_DATABASE_V7.endmills;
        tool = Object.values(toolCategory || {})[0];
      }
      // Create default tool if needed
      if (!tool) {
        tool = {
          id: 'T' + (tools.length + 1),
          type: 'endmill',
          diameter: 0.5,
          flutes: 4,
          material: 'carbide'
        };
        stage.confidence = Math.min(stage.confidence, 80);
      }
      tools.push({ feature, tool });

      stage.reasoning.push({
        step: 'Tool selected for ' + feature.type,
        action: 'Using ' + (tool.name || tool.id),
        data: { diameter: tool.diameter, flutes: tool.flutes }
      });
    }
    stage.result = { tools };
    workflow.tools = tools;
    stage.endTime = Date.now();
    workflow.confidence.byStage.stage4 = stage.confidence;

    this.logDecision(4, 'tool_selection', stage.reasoning, stage.confidence);
    return stage;
  },
  _getToolTypeForFeature(feature) {
    const map = {
      'pocket': 'endmill',
      'hole': 'drill',
      'thread': 'tap',
      'slot': 'endmill',
      'contour': 'endmill',
      'face': 'facemill',
      'chamfer': 'chamfer_mill',
      'boss': 'endmill'
    };
    return map[feature.type] || 'endmill';
  },
  // STAGE 5: Feeds/Speeds Calculation

  async _stage5_calculateParameters(workflow) {
    const stage = {
      name: 'Parameter Calculation',
      stageNumber: 5,
      startTime: Date.now(),
      reasoning: [],
      decisions: [],
      result: null,
      confidence: 100
    };
    const parameters = [];

    for (const { feature, tool } of (workflow.tools || [])) {
      let params = null;

      // Try MANUFACTURER_CUTTING_DATA first
      if (typeof MANUFACTURER_CUTTING_DATA !== 'undefined') {
        params = MANUFACTURER_CUTTING_DATA.getRecommendation?.(
          tool.manufacturer || 'generic',
          workflow.material?.name,
          tool
        );
      }
      // Try PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE
      if (!params && typeof PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE !== 'undefined') {
        params = PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE.calculate?.(tool, workflow.material);
      }
      // Fallback calculation
      if (!params) {
        const sfm = workflow.material?.sfm || 500;
        const dia = tool.diameter || 0.5;
        const flutes = tool.flutes || 4;
        const chipLoad = workflow.material?.chipLoad || 0.003;

        params = {
          sfm,
          rpm: Math.round((sfm * 3.82) / dia),
          feed: Math.round((sfm * 3.82 / dia) * chipLoad * flutes),
          doc: tool.loc ? tool.loc * 0.85 : dia * 1.5,
          woc: dia * 0.4,
          chipLoad
        };
        stage.confidence = Math.min(stage.confidence, 85);
      }
      parameters.push({ feature, tool, params });

      stage.reasoning.push({
        step: 'Parameters calculated for ' + feature.type,
        action: 'RPM: ' + params.rpm + ', Feed: ' + params.feed,
        data: params
      });
    }
    stage.result = { parameters };
    workflow.parameters = parameters;
    stage.endTime = Date.now();
    workflow.confidence.byStage.stage5 = stage.confidence;

    this.logDecision(5, 'parameter_calculation', stage.reasoning, stage.confidence);
    return stage;
  },
  // STAGE 6: Toolpath Strategy Selection

  async _stage6_selectToolpaths(workflow) {
    const stage = {
      name: 'Strategy Selection',
      stageNumber: 6,
      startTime: Date.now(),
      reasoning: [],
      decisions: [],
      result: null,
      confidence: 100
    };
    const strategies = [];

    for (const { feature, tool, params } of (workflow.parameters || [])) {
      let strategy = null;

      // Try PRISM_MASTER_TOOLPATH_REGISTRY
      if (typeof PRISM_MASTER_TOOLPATH_REGISTRY !== 'undefined') {
        strategy = PRISM_MASTER_TOOLPATH_REGISTRY.getBestStrategy?.(feature.type, workflow.material);
      }
      // Try MEGA_STRATEGY_LIBRARY
      if (!strategy && typeof MEGA_STRATEGY_LIBRARY !== 'undefined') {
        strategy = MEGA_STRATEGY_LIBRARY.selectStrategy?.(feature, workflow.material);
      }
      // Default strategies by feature type
      if (!strategy) {
        const defaults = {
          'pocket': { name: 'Adaptive Clearing', type: 'adaptive' },
          'hole': { name: 'Peck Drill', type: 'peck' },
          'slot': { name: 'Trochoidal', type: 'trochoidal' },
          'contour': { name: 'Profile', type: 'profile' },
          'face': { name: 'Face Mill', type: 'face' }
        };
        strategy = defaults[feature.type] || { name: 'Standard', type: 'standard' };
        stage.confidence = Math.min(stage.confidence, 85);
      }
      strategies.push({ feature, tool, params, strategy });

      stage.reasoning.push({
        step: 'Strategy selected for ' + feature.type,
        action: 'Using ' + strategy.name,
        data: { type: strategy.type }
      });
    }
    stage.result = { strategies };
    workflow.strategies = strategies;
    stage.endTime = Date.now();
    workflow.confidence.byStage.stage6 = stage.confidence;

    this.logDecision(6, 'strategy_selection', stage.reasoning, stage.confidence);
    return stage;
  },
  // STAGE 7: Toolpath Generation

  async _stage7_generateToolpaths(workflow) {
    const stage = {
      name: 'Toolpath Generation',
      stageNumber: 7,
      startTime: Date.now(),
      reasoning: [],
      decisions: [],
      result: null,
      confidence: 100
    };
    const toolpaths = [];

    for (const { feature, tool, params, strategy } of (workflow.strategies || [])) {
      let toolpath = null;

      // Try PRISM_REAL_TOOLPATH_ENGINE
      if (typeof PRISM_REAL_TOOLPATH_ENGINE !== 'undefined') {
        toolpath = PRISM_REAL_TOOLPATH_ENGINE.generateToolpath?.(feature, tool, strategy, params);
      }
      // Try PRISM_HYBRID_TOOLPATH_SYNTHESIZER
      if (!toolpath && typeof PRISM_HYBRID_TOOLPATH_SYNTHESIZER !== 'undefined') {
        toolpath = PRISM_HYBRID_TOOLPATH_SYNTHESIZER.synthesize?.(feature, tool, params);
      }
      // Generate basic toolpath if needed
      if (!toolpath) {
        toolpath = this._generateBasicToolpath(feature, tool, params, strategy);
        stage.confidence = Math.min(stage.confidence, 80);
      }
      toolpaths.push({
        feature,
        tool,
        params,
        strategy: strategy.name,
        toolpath,
        bounds: this._calculateToolpathBounds(toolpath)
      });

      stage.reasoning.push({
        step: 'Toolpath generated for ' + feature.type,
        action: 'Created ' + (toolpath.moves?.length || 0) + ' moves',
        data: { strategy: strategy.name }
      });
    }
    stage.result = { toolpaths };
    workflow.toolpaths = toolpaths;
    stage.endTime = Date.now();
    workflow.confidence.byStage.stage7 = stage.confidence;

    this.logDecision(7, 'toolpath_generation', stage.reasoning, stage.confidence);
    return stage;
  },
  _generateBasicToolpath(feature, tool, params, strategy) {
    const moves = [];
    const fp = feature.params || {};
    const x = fp.x || 0;
    const y = fp.y || 0;
    const z = fp.z || 0;
    const width = fp.width || fp.diameter || 1;
    const depth = fp.depth || 0.25;

    // Basic pocket/profile toolpath
    moves.push({ type: 'rapid', x, y, z: z + 0.1 });
    moves.push({ type: 'feed', x, y, z: z - depth, f: params.feed });

    // Simple profile
    moves.push({ type: 'feed', x: x + width, y, z: z - depth, f: params.feed });
    moves.push({ type: 'feed', x: x + width, y: y + width, z: z - depth, f: params.feed });
    moves.push({ type: 'feed', x, y: y + width, z: z - depth, f: params.feed });
    moves.push({ type: 'feed', x, y, z: z - depth, f: params.feed });

    // Retract
    moves.push({ type: 'rapid', x, y, z: z + 0.1 });

    return { moves, cycleTime: moves.length * 0.5 };
  },
  _calculateToolpathBounds(toolpath) {
    if (!toolpath?.moves?.length) return null;

    const bounds = {
      xMin: Infinity, xMax: -Infinity,
      yMin: Infinity, yMax: -Infinity,
      zMin: Infinity, zMax: -Infinity
    };
    for (const move of toolpath.moves) {
      if (move.x !== undefined) {
        bounds.xMin = Math.min(bounds.xMin, move.x);
        bounds.xMax = Math.max(bounds.xMax, move.x);
      }
      if (move.y !== undefined) {
        bounds.yMin = Math.min(bounds.yMin, move.y);
        bounds.yMax = Math.max(bounds.yMax, move.y);
      }
      if (move.z !== undefined) {
        bounds.zMin = Math.min(bounds.zMin, move.z);
        bounds.zMax = Math.max(bounds.zMax, move.z);
      }
    }
    return bounds;
  },
  // STAGE 8: Collision Detection & Pre-validation (NEW)

  async _stage8_detectCollisions(workflow) {
    const stage = {
      name: 'Collision Detection',
      stageNumber: 8,
      startTime: Date.now(),
      reasoning: [],
      decisions: [],
      result: null,
      confidence: 100
    };
    const collisionResults = {
      checked: 0,
      collisions: [],
      warnings: [],
      passed: true
    };
    const machineModel = workflow.machineModel;
    const workEnvelope = machineModel?.workEnvelope;

    stage.reasoning.push({
      step: 'Begin collision analysis',
      action: 'Checking toolpaths against machine envelope and collision zones',
      data: {
        hasEnvelope: !!workEnvelope,
        hasCollisionZones: !!(machineModel?.collisionZones?.length)
      }
    });

    // Check each toolpath against work envelope
    for (const tp of (workflow.toolpaths || [])) {
      collisionResults.checked++;
      const bounds = tp.bounds;

      if (bounds && workEnvelope) {
        // Check X bounds
        if (bounds.xMin < workEnvelope.x[0] || bounds.xMax > workEnvelope.x[1]) {
          collisionResults.collisions.push({
            type: 'envelope_violation',
            axis: 'X',
            toolpath: tp.strategy,
            bounds: { min: bounds.xMin, max: bounds.xMax },
            limits: workEnvelope.x
          });
          collisionResults.passed = false;
        }
        // Check Y bounds
        if (bounds.yMin < workEnvelope.y[0] || bounds.yMax > workEnvelope.y[1]) {
          collisionResults.collisions.push({
            type: 'envelope_violation',
            axis: 'Y',
            toolpath: tp.strategy,
            bounds: { min: bounds.yMin, max: bounds.yMax },
            limits: workEnvelope.y
          });
          collisionResults.passed = false;
        }
        // Check Z bounds
        if (bounds.zMin < workEnvelope.z[0] || bounds.zMax > workEnvelope.z[1]) {
          collisionResults.collisions.push({
            type: 'envelope_violation',
            axis: 'Z',
            toolpath: tp.strategy,
            bounds: { min: bounds.zMin, max: bounds.zMax },
            limits: workEnvelope.z
          });
          collisionResults.passed = false;
        }
      }
    }
    // Use PRISM_COLLISION_ENGINE if available
    if (typeof PRISM_COLLISION_ENGINE !== 'undefined') {
      for (const tp of (workflow.toolpaths || [])) {
        const collisionCheck = PRISM_COLLISION_ENGINE.checkToolCollision?.(
          tp.tool,
          null, // holder
          workflow.input.stock,
          workflow.input.part
        );

        if (collisionCheck?.hasCollision) {
          collisionResults.collisions.push({
            type: 'tool_collision',
            toolpath: tp.strategy,
            details: collisionCheck.details
          });
          collisionResults.passed = false;
        }
      }
    }
    // Use ADVANCED_COLLISION_KINEMATICS_ENGINE for 5-axis
    if (typeof ADVANCED_COLLISION_KINEMATICS_ENGINE !== 'undefined' &&
        machineModel?.kinematicChain?.rotary?.length > 0) {
      // Check for singularities
      for (const tp of (workflow.toolpaths || [])) {
        if (tp.toolpath?.rotaryMoves) {
          const singularityCheck = ADVANCED_COLLISION_KINEMATICS_ENGINE.detectSingularity?.(
            tp.toolpath.rotaryMoves,
            machineModel.kinematicChain
          );

          if (singularityCheck?.hasSingularity) {
            collisionResults.warnings.push({
              type: 'singularity_warning',
              toolpath: tp.strategy,
              position: singularityCheck.position
            });
          }
        }
      }
    }
    if (collisionResults.collisions.length > 0) {
      stage.confidence = 60;
      stage.reasoning.push({
        step: 'Collisions detected!',
        action: 'Found ' + collisionResults.collisions.length + ' collision(s)',
        data: collisionResults.collisions.map(c => c.type + ' on ' + c.axis)
      });
    } else {
      stage.reasoning.push({
        step: 'Collision check passed',
        action: 'All toolpaths within machine envelope',
        data: { checked: collisionResults.checked }
      });
    }
    stage.result = collisionResults;
    workflow.collisionResults = collisionResults;
    this.stateHub.setState('collisionResults', collisionResults);

    stage.endTime = Date.now();
    workflow.confidence.byStage.stage8 = stage.confidence;

    this.logDecision(8, 'collision_detection', stage.reasoning, stage.confidence);
    return stage;
  },
  // STAGE 9: Validation & Safety Check

  async _stage9_validate(workflow) {
    const stage = {
      name: 'Validation',
      stageNumber: 9,
      startTime: Date.now(),
      reasoning: [],
      decisions: [],
      result: null,
      confidence: 100
    };
    const validationResults = {
      passed: true,
      checks: [],
      warnings: []
    };
    // Use PRISM_UNIVERSAL_VALIDATOR if available
    if (typeof PRISM_UNIVERSAL_VALIDATOR !== 'undefined') {
      const validation = PRISM_UNIVERSAL_VALIDATOR.validateWorkflow?.(workflow);
      if (validation) {
        validationResults.checks.push(...(validation.checks || []));
        validationResults.warnings.push(...(validation.warnings || []));
        validationResults.passed = validation.passed !== false;
      }
    }
    // Check for required data
    const requiredChecks = [
      { name: 'features', present: !!workflow.features?.length },
      { name: 'material', present: !!workflow.material },
      { name: 'tools', present: !!workflow.tools?.length },
      { name: 'toolpaths', present: !!workflow.toolpaths?.length }
    ];

    for (const check of requiredChecks) {
      validationResults.checks.push(check);
      if (!check.present) {
        validationResults.passed = false;
        stage.confidence = Math.min(stage.confidence, 70);
      }
    }
    // Validate feeds/speeds are reasonable
    for (const tp of (workflow.toolpaths || [])) {
      if (tp.params) {
        if (tp.params.rpm > 50000) {
          validationResults.warnings.push({
            type: 'rpm_warning',
            message: 'RPM exceeds 50,000 - verify machine capability',
            value: tp.params.rpm
          });
        }
        if (tp.params.feed > 1000) {
          validationResults.warnings.push({
            type: 'feed_warning',
            message: 'Feed rate exceeds 1000 IPM - verify machine capability',
            value: tp.params.feed
          });
        }
      }
    }
    stage.reasoning.push({
      step: 'Validation complete',
      action: validationResults.passed ? 'All checks passed' : 'Some checks failed',
      data: {
        totalChecks: validationResults.checks.length,
        passed: validationResults.checks.filter(c => c.present).length,
        warnings: validationResults.warnings.length
      }
    });

    stage.result = validationResults;
    stage.endTime = Date.now();
    workflow.confidence.byStage.stage9 = stage.confidence;

    this.logDecision(9, 'validation', stage.reasoning, stage.confidence);
    return stage;
  },
  // STAGE 10: G-code Generation

  async _stage10_generateGcode(workflow) {
    const stage = {
      name: 'G-code Generation',
      stageNumber: 10,
      startTime: Date.now(),
      reasoning: [],
      decisions: [],
      result: null,
      confidence: 100
    };
    const controller = workflow.machineModel?.specs?.control ||
                       workflow.input.controller || 'fanuc_0i';

    let gcode = null;

    stage.reasoning.push({
      step: 'Begin G-code generation',
      action: 'Target controller: ' + controller,
      data: { toolpathCount: workflow.toolpaths?.length || 0 }
    });

    // Try PRISM_GUARANTEED_POST_PROCESSOR
    if (typeof PRISM_GUARANTEED_POST_PROCESSOR !== 'undefined') {
      const result = PRISM_GUARANTEED_POST_PROCESSOR.generateGCode?.(
        workflow.toolpaths || [],
        controller,
        { programNumber: workflow.id?.replace('WF2_', '') || '0001' }
      );
      if (result?.gcode) {
        gcode = result.gcode;
        stage.confidence = result.confidence || 100;
      }
    }
    // Try PRISM_INTERNAL_POST_ENGINE
    if (!gcode && typeof PRISM_INTERNAL_POST_ENGINE !== 'undefined') {
      gcode = PRISM_INTERNAL_POST_ENGINE.process?.(workflow.toolpaths, { controller });
    }
    // Fallback to basic generation
    if (!gcode) {
      gcode = this._generateBasicGcode(workflow, controller);
      stage.confidence = Math.min(stage.confidence, 75);
    }
    // Optimize rapids if PRISM_RAPIDS_OPTIMIZER available
    if (typeof PRISM_RAPIDS_OPTIMIZER !== 'undefined' && Array.isArray(gcode)) {
      const optimized = PRISM_RAPIDS_OPTIMIZER.optimizeGcode?.(gcode);
      if (optimized?.savings) {
        gcode = optimized.gcode;
        workflow.rapidsSaved = optimized.savings;
      }
    }
    stage.reasoning.push({
      step: 'G-code generated',
      action: 'Created ' + (Array.isArray(gcode) ? gcode.length : 1) + ' lines',
      data: { controller }
    });

    stage.result = { gcode, controller };
    workflow.gcode = gcode;
    stage.endTime = Date.now();
    workflow.confidence.byStage.stage10 = stage.confidence;

    this.logDecision(10, 'gcode_generation', stage.reasoning, stage.confidence);
    return stage;
  },
  _generateBasicGcode(workflow, controller) {
    const lines = [
      '%',
      'O' + (workflow.id?.replace('WF2_', '').slice(-4) || '0001'),
      '(Generated by PRISM Orchestration Engine v2.0)',
      '(Controller: ' + controller + ')',
      '(Confidence: ' + (workflow.confidence.overall || 0) + '%)',
      'G90 G17 G40 G49 G80',
      'G21 (Metric)'
    ];

    let toolNum = 1;
    for (const tp of (workflow.toolpaths || [])) {
      lines.push('');
      lines.push('(Operation: ' + (tp.strategy || 'Unknown') + ')');
      lines.push('T' + toolNum + ' M6');
      lines.push('S' + (tp.params?.rpm || 3000) + ' M3');
      lines.push('G43 H' + toolNum + ' Z0.5');

      if (tp.toolpath?.moves) {
        for (const move of tp.toolpath.moves) {
          const g = move.type === 'rapid' ? 'G0' : 'G1';
          let line = g;
          if (move.x !== undefined) line += ' X' + move.x.toFixed(3);
          if (move.y !== undefined) line += ' Y' + move.y.toFixed(3);
          if (move.z !== undefined) line += ' Z' + move.z.toFixed(3);
          if (move.type !== 'rapid' && move.f) line += ' F' + Math.round(move.f);
          lines.push(line);
        }
      }
      lines.push('G0 Z1.0');
      lines.push('M5');
      toolNum++;
    }
    lines.push('');
    lines.push('G28 G91 Z0');
    lines.push('G28 X0 Y0');
    lines.push('M30');
    lines.push('%');

    return lines;
  },
  // STAGE 11: Full Simulation with Material Removal (NEW)

  async _stage11_simulate(workflow) {
    const stage = {
      name: 'Simulation',
      stageNumber: 11,
      startTime: Date.now(),
      reasoning: [],
      decisions: [],
      result: null,
      confidence: 100
    };
    const simulationData = {
      completed: false,
      cycleTime: 0,
      materialRemoved: 0,
      toolWear: [],
      frames: [],
      statistics: {}
    };
    stage.reasoning.push({
      step: 'Begin simulation',
      action: 'Simulating toolpath execution',
      data: {
        hasMachineModel: !!workflow.machineModel,
        toolpathCount: workflow.toolpaths?.length || 0
      }
    });

    // Calculate estimated cycle time
    let totalCycleTime = 0;
    for (const tp of (workflow.toolpaths || [])) {
      const moves = tp.toolpath?.moves?.length || 0;
      const feed = tp.params?.feed || 30;

      // Estimate time based on moves and feed rate
      let distance = 0;
      const tpMoves = tp.toolpath?.moves || [];
      for (let i = 1; i < tpMoves.length; i++) {
        const prev = tpMoves[i - 1];
        const curr = tpMoves[i];
        const dx = (curr.x || 0) - (prev.x || 0);
        const dy = (curr.y || 0) - (prev.y || 0);
        const dz = (curr.z || 0) - (prev.z || 0);
        distance += Math.sqrt(dx*dx + dy*dy + dz*dz);
      }
      // Time = distance / feed rate (convert to minutes)
      const opTime = distance > 0 ? (distance / feed) : (moves * 0.1);
      totalCycleTime += opTime;

      // Estimate material removed (simplified)
      const toolDia = tp.tool?.diameter || 0.5;
      const doc = tp.params?.doc || 0.1;
      const woc = tp.params?.woc || toolDia * 0.4;
      simulationData.materialRemoved += distance * doc * woc;
    }
    simulationData.cycleTime = Math.round(totalCycleTime * 60); // Convert to seconds

    // Use MATERIAL_REMOVAL_SIMULATION if available
    if (typeof MATERIAL_REMOVAL_SIMULATION !== 'undefined') {
      const simResult = MATERIAL_REMOVAL_SIMULATION.simulate?.(
        workflow.toolpaths,
        workflow.input.stock
      );
      if (simResult) {
        simulationData.materialRemoved = simResult.volumeRemoved || simulationData.materialRemoved;
        simulationData.frames = simResult.frames || [];
        simulationData.statistics = simResult.statistics || {};
      }
    }
    // Use FULL_MACHINE_SIMULATION if available and we have a machine model
    if (typeof FULL_MACHINE_SIMULATION !== 'undefined' && workflow.machineModel) {
      const machineSimResult = FULL_MACHINE_SIMULATION.simulateWithMachine?.(
        workflow.toolpaths,
        workflow.machineModel,
        workflow.input.stock
      );
      if (machineSimResult) {
        simulationData.machineSimulation = machineSimResult;
        simulationData.collisionsDuringSimulation = machineSimResult.collisions || [];
      }
    }
    simulationData.completed = true;

    stage.reasoning.push({
      step: 'Simulation complete',
      action: 'Estimated cycle time: ' + simulationData.cycleTime + 's',
      data: {
        materialRemoved: simulationData.materialRemoved.toFixed(2) + ' cu.in',
        frames: simulationData.frames.length
      }
    });

    stage.result = simulationData;
    workflow.simulationData = simulationData;
    this.stateHub.setState('simulationData', simulationData);

    stage.endTime = Date.now();
    workflow.confidence.byStage.stage11 = stage.confidence;

    this.logDecision(11, 'simulation', stage.reasoning, stage.confidence);
    return stage;
  },
  // STAGE 12: Learning Engine Feedback (NEW)

  async _stage12_learningFeedback(workflow) {
    const stage = {
      name: 'Learning Feedback',
      stageNumber: 12,
      startTime: Date.now(),
      reasoning: [],
      decisions: [],
      result: null,
      confidence: 100
    };
    const learningData = {
      workflowId: workflow.id,
      timestamp: Date.now(),
      captured: false,
      engines: []
    };
    stage.reasoning.push({
      step: 'Capture learning data',
      action: 'Recording workflow data for learning engines',
      data: { workflowSuccess: workflow.success }
    });

    // Feed data to PRISM_CAM_LEARNING_ENGINE
    if (typeof PRISM_CAM_LEARNING_ENGINE !== 'undefined') {
      try {
        PRISM_CAM_LEARNING_ENGINE.learnFromWorkflow?.({
          features: workflow.features,
          material: workflow.material,
          tools: workflow.tools?.map(t => t.tool),
          strategies: workflow.strategies?.map(s => s.strategy),
          parameters: workflow.parameters?.map(p => p.params),
          cycleTime: workflow.simulationData?.cycleTime,
          success: workflow.success,
          confidence: workflow.confidence.overall
        });
        learningData.engines.push('PRISM_CAM_LEARNING_ENGINE');
      } catch (e) {
        console.warn('[ORCHESTRATOR_V2] CAM learning failed:', e.message);
      }
    }
    // Feed data to PRISM_MACHINE_3D_LEARNING_ENGINE
    if (typeof PRISM_MACHINE_3D_LEARNING_ENGINE !== 'undefined' && workflow.machineModel) {
      try {
        PRISM_MACHINE_3D_LEARNING_ENGINE.learnFromSimulation?.({
          machineId: workflow.machineModel.id,
          toolpaths: workflow.toolpaths,
          collisionResults: workflow.collisionResults,
          simulationData: workflow.simulationData
        });
        learningData.engines.push('PRISM_MACHINE_3D_LEARNING_ENGINE');
      } catch (e) {
        console.warn('[ORCHESTRATOR_V2] Machine 3D learning failed:', e.message);
      }
    }
    // Feed data to PRISM_UNIFIED_CAD_LEARNING_SYSTEM
    if (typeof PRISM_UNIFIED_CAD_LEARNING_SYSTEM !== 'undefined') {
      try {
        PRISM_UNIFIED_CAD_LEARNING_SYSTEM.recordWorkflow?.({
          workflowId: workflow.id,
          features: workflow.features,
          success: workflow.success,
          confidence: workflow.confidence
        });
        learningData.engines.push('PRISM_UNIFIED_CAD_LEARNING_SYSTEM');
      } catch (e) {
        console.warn('[ORCHESTRATOR_V2] CAD learning failed:', e.message);
      }
    }
    // Store in local learning data
    this.stateHub.learningData.push({
      workflowId: workflow.id,
      summary: {
        features: workflow.features?.length || 0,
        tools: workflow.tools?.length || 0,
        cycleTime: workflow.simulationData?.cycleTime || 0,
        confidence: workflow.confidence.overall,
        success: workflow.success
      },
      timestamp: Date.now()
    });

    // Keep only last 100 entries
    if (this.stateHub.learningData.length > 100) {
      this.stateHub.learningData = this.stateHub.learningData.slice(-100);
    }
    learningData.captured = learningData.engines.length > 0;

    stage.reasoning.push({
      step: 'Learning data captured',
      action: 'Fed data to ' + learningData.engines.length + ' learning engines',
      data: { engines: learningData.engines }
    });

    stage.result = learningData;
    workflow.learningFeedback = learningData;
    stage.endTime = Date.now();
    workflow.confidence.byStage.stage12 = stage.confidence;

    this.logDecision(12, 'learning_feedback', stage.reasoning, stage.confidence);
    return stage;
  },
  // HELPER: Calculate Overall Confidence

  _calculateOverallConfidence(workflow) {
    const stageConfidences = Object.values(workflow.confidence.byStage);
    if (stageConfidences.length === 0) return 50;

    // Weighted average - critical stages weighted higher
    const weights = {
      stage1: 0.08,  // Input Analysis
      stage2: 0.06,  // Material
      stage3: 0.10,  // Machine Model (important)
      stage4: 0.10,  // Tool Selection
      stage5: 0.10,  // Parameters
      stage6: 0.08,  // Strategy
      stage7: 0.12,  // Toolpath Generation (critical)
      stage8: 0.12,  // Collision Detection (critical)
      stage9: 0.08,  // Validation
      stage10: 0.08, // G-code
      stage11: 0.04, // Simulation
      stage12: 0.04  // Learning
    };
    let weighted = 0;
    let totalWeight = 0;

    for (const [stage, conf] of Object.entries(workflow.confidence.byStage)) {
      const weight = weights[stage] || 0.05;
      weighted += conf * weight;
      totalWeight += weight;
    }
    return Math.round(weighted / totalWeight);
  },
  // HELPER: Compile Enhanced Result

  _compileEnhancedResult(workflow) {
    return {
      version: '3.0.0',
      success: workflow.success,
      confidence: workflow.confidence.overall,
      duration: workflow.duration,

      // Core outputs
      features: workflow.features,
      material: workflow.material,
      machineModel: {
        id: workflow.machineModel?.id,
        source: workflow.machineModel?.source,
        hasCollisionData: !!workflow.machineModel?.collisionZones?.length
      },
      tools: workflow.tools?.map(t => ({
        toolId: t.tool?.id,
        diameter: t.tool?.diameter,
        forFeature: t.feature?.type
      })),

      // Toolpaths
      toolpaths: workflow.toolpaths,
      gcode: workflow.gcode,

      // New in v2.0
      collisionResults: {
        passed: workflow.collisionResults?.passed,
        collisionCount: workflow.collisionResults?.collisions?.length || 0,
        warnings: workflow.collisionResults?.warnings?.length || 0
      },
      simulationData: {
        cycleTime: workflow.simulationData?.cycleTime,
        materialRemoved: workflow.simulationData?.materialRemoved
      },
      learningFeedback: {
        captured: workflow.learningFeedback?.captured,
        engines: workflow.learningFeedback?.engines?.length || 0
      },
      // Reasoning chain
      reasoning: workflow.stages?.flatMap(s => s.reasoning) || [],
      stageConfidence: workflow.confidence.byStage,

      // Warnings
      warnings: workflow.warnings
    };
  },
  // PUBLIC API

  // Quick process - delegates to enhanced workflow
  async process(input, options = {}) {
    return this.executeEnhancedWorkflow(input, options);
  },
  // Get last workflow reasoning
  getLastReasoning() {
    const last = this.decisionLog[this.decisionLog.length - 1];
    return last?.stages?.flatMap(s => s.reasoning) || [];
  },
  // Get workflow audit trail
  getAuditTrail() {
    return this.auditTrail.slice();
  },
  // Get learning statistics
  getLearningStats() {
    const data = this.stateHub.learningData;
    if (data.length === 0) return null;

    return {
      totalWorkflows: data.length,
      averageConfidence: Math.round(
        data.reduce((sum, d) => sum + d.summary.confidence, 0) / data.length
      ),
      averageCycleTime: Math.round(
        data.reduce((sum, d) => sum + d.summary.cycleTime, 0) / data.length
      ),
      successRate: Math.round(
        (data.filter(d => d.summary.success).length / data.length) * 100
      )
    };
  },
  // Subscribe to workflow events
  subscribe(event, callback) {
    return this.stateHub.subscribe(event, callback);
  },
  // CROSS-SYSTEM INTEGRATION

  // Bridge to base orchestrator
  bridgeToBaseOrchestrator() {
    if (typeof PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR !== 'undefined') {
      // Replace executeWorkflow with enhanced version
      PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR.executeEnhancedWorkflow =
        this.executeEnhancedWorkflow.bind(this);

      // Add state hub access
      PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR.stateHub = this.stateHub;

      console.log('[ORCHESTRATOR_V2] Bridged to base PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR');
    }
  },
  // INITIALIZATION

  init() {
    console.log('[PRISM_ORCHESTRATION_ENGINE_V2] v2.0.0 initializing...');

    // Register globally
    window.PRISM_ORCHESTRATION_ENGINE_V2 = this;

    // Bridge to base orchestrator
    this.bridgeToBaseOrchestrator();

    // Register with DATABASE_HUB
    if (typeof PRISM_DATABASE_HUB !== 'undefined') {
      PRISM_DATABASE_HUB.orchestratorV2 = this;
      PRISM_DATABASE_HUB.executeEnhancedWorkflow = this.executeEnhancedWorkflow.bind(this);
    }
    // Global shortcuts
    window.executeEnhancedWorkflow = this.executeEnhancedWorkflow.bind(this);
    window.getOrchestrationState = () => this.stateHub;
    window.getWorkflowAuditTrail = this.getAuditTrail.bind(this);
    window.getLearningStats = this.getLearningStats.bind(this);

    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_ORCHESTRATION_ENGINE_V2] v2.0.0 initialized');
    console.log('  12-stage enhanced workflow with:');
    console.log('  - Machine 3D Model Loading (OEM priority)');
    console.log('  - Collision Detection & Pre-validation');
    console.log('  - Full Simulation with Material Removal');
    console.log('  - Learning Engine Feedback Loop');
    console.log('  - Centralized State Management Hub');

    return this;
  }
}