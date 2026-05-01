const PRISM_MODEL_ORCHESTRATION_ENGINE = {
  version: '3.0.0',
  buildDate: '2026-01-08',

  // CONNECTED SYSTEMS
  systems: {
    modelDB: 'PRISM_MACHINE_3D_MODEL_DATABASE_V3',
    learningEngine: 'PRISM_MACHINE_3D_LEARNING_ENGINE',
    modelGenerator: 'MACHINE_MODEL_GENERATOR',
    collision: 'COLLISION_SYSTEM',
    visualization: 'ULTIMATE_3D_MACHINE_SYSTEM'
  },
  // MODEL PRIORITY HIERARCHY
  // Priority: 1. User Upload > 2. OEM STEP File > 3. Database Entry > 4. Procedural

  modelPriority: {
    USER_UPLOAD: 1,      // User uploaded their own machine model
    OEM_STEP: 2,         // Built-in STEP file from manufacturer
    DATABASE_ENTRY: 3,   // Database with specs but no CAD
    PROCEDURAL: 4        // Generated parametric model
  },
  // ORCHESTRATION STATE
  state: {
    initialized: false,
    loadedModels: {},
    activeModel: null,
    learningQueue: [],
    modelCache: new Map()
  },
  // INITIALIZATION
  init() {
    console.log('[PRISM_MODEL_ORCHESTRATION_ENGINE v2.0] Initializing...');

    // Verify connected systems
    const systems = this.verifyConnectedSystems();
    console.log(`[ModelOrchestrator] Connected systems: ${systems.length}/5`);

    // Pre-load manufacturer model counts
    this.loadManufacturerStats();

    this.state.initialized = true;
    console.log('[PRISM_MODEL_ORCHESTRATION_ENGINE] ✓ Ready');

    return this;
  },
  // VERIFY CONNECTED SYSTEMS
  verifyConnectedSystems() {
    const connected = [];

    if (typeof PRISM_MACHINE_3D_MODEL_DATABASE_V3 !== 'undefined') {
      connected.push('PRISM_MACHINE_3D_MODEL_DATABASE_V3');
    }
    if (typeof PRISM_MACHINE_3D_LEARNING_ENGINE !== 'undefined') {
      connected.push('PRISM_MACHINE_3D_LEARNING_ENGINE');
    }
    if (typeof MACHINE_MODEL_GENERATOR !== 'undefined') {
      connected.push('MACHINE_MODEL_GENERATOR');
    }
    if (typeof COLLISION_SYSTEM !== 'undefined') {
      connected.push('COLLISION_SYSTEM');
    }
    if (typeof ULTIMATE_3D_MACHINE_SYSTEM !== 'undefined') {
      connected.push('ULTIMATE_3D_MACHINE_SYSTEM');
    }
    return connected;
  },
  // GET BEST MODEL FOR MACHINE
  getBestModel(machineId) {
    const normalizedId = this.normalizeId(machineId);

    // Check cache first
    if (this.state.modelCache.has(normalizedId)) {
      return this.state.modelCache.get(normalizedId);
    }
    let result = null;

    // Priority 1: Check user uploads (IndexedDB)
    if (typeof PRISM_MACHINE_3D_MODELS !== 'undefined') {
      const userModel = PRISM_MACHINE_3D_MODELS.getMachineModel?.(normalizedId);
      if (userModel) {
        result = {
          source: 'USER_UPLOAD',
          priority: this.modelPriority.USER_UPLOAD,
          data: userModel,
          hasGeometry: true
        };
      }
    }
    // Priority 2: Check OEM database (V3)
    if (!result && typeof PRISM_MACHINE_3D_MODEL_DATABASE_V3 !== 'undefined') {
      const oemModel = PRISM_MACHINE_3D_MODEL_DATABASE_V3.getMachine(normalizedId);
      if (oemModel && oemModel.has3DModel) {
        result = {
          source: 'OEM_STEP',
          priority: this.modelPriority.OEM_STEP,
          data: oemModel,
          hasGeometry: true,
          stepFile: oemModel.stepFile
        };
      } else if (oemModel) {
        result = {
          source: 'DATABASE_ENTRY',
          priority: this.modelPriority.DATABASE_ENTRY,
          data: oemModel,
          hasGeometry: false
        };
      }
    }
    // Priority 3: Check learning engine for learned patterns
    if (!result && typeof PRISM_MACHINE_3D_LEARNING_ENGINE !== 'undefined') {
      const learnedData = PRISM_MACHINE_3D_LEARNING_ENGINE.getLearnedDimensions?.(normalizedId);
      if (learnedData) {
        result = {
          source: 'LEARNED',
          priority: this.modelPriority.DATABASE_ENTRY,
          data: learnedData,
          hasGeometry: false
        };
      }
    }
    // Priority 4: Fallback to procedural generation
    if (!result) {
      result = {
        source: 'PROCEDURAL',
        priority: this.modelPriority.PROCEDURAL,
        data: this.getProceduralDefaults(normalizedId),
        hasGeometry: false
      };
    }
    // Cache the result
    this.state.modelCache.set(normalizedId, result);

    return result;
  },
  // NORMALIZE MACHINE ID
  normalizeId(id) {
    if (!id) return '';
    return id.toLowerCase()
      .replace(/[-\s]+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  },
  // GET PROCEDURAL DEFAULTS
  getProceduralDefaults(machineId) {
    // Try to infer from ID
    const id = machineId.toLowerCase();

    // Default VMC specs
    let specs = {
      type: '3AXIS_VMC',
      travels: { x: 762, y: 508, z: 508 },
      spindle: { rpm: 10000, taper: 'CAT40' }
    };
    // Infer from ID patterns
    if (id.includes('5ax') || id.includes('umc') || id.includes('5_ax')) {
      specs.type = '5AXIS_TRUNNION';
    } else if (id.includes('hmc') || id.includes('ec_') || id.includes('ec-')) {
      specs.type = 'HMC';
    } else if (id.includes('lathe') || id.includes('st_') || id.includes('lt_')) {
      specs.type = 'LATHE';
    }
    return specs;
  },
  // LOAD MANUFACTURER STATS
  loadManufacturerStats() {
    if (typeof PRISM_MACHINE_3D_MODEL_DATABASE_V3 === 'undefined') return;

    const manufacturers = PRISM_MACHINE_3D_MODEL_DATABASE_V3.manufacturers || {};
    console.log('[ModelOrchestrator] Loaded manufacturers:');

    Object.entries(manufacturers).forEach(([mfr, data]) => {
      console.log(`  - ${mfr}: ${data.modelCount} models (${data.country})`);
    });
  },
  // FEED MODEL TO LEARNING ENGINE
  async feedToLearningEngine(machineId, modelData) {
    if (typeof PRISM_MACHINE_3D_LEARNING_ENGINE === 'undefined') {
      console.warn('[ModelOrchestrator] Learning engine not available');
      return false;
    }
    try {
      const result = await PRISM_MACHINE_3D_LEARNING_ENGINE.learnFromModel?.(machineId, modelData);
      console.log(`[ModelOrchestrator] Fed ${machineId} to learning engine`);
      return result;
    } catch (e) {
      console.error('[ModelOrchestrator] Learning engine error:', e);
      return false;
    }
  },
  // GET ALL MACHINES BY MANUFACTURER
  getMachinesByManufacturer(manufacturer) {
    if (typeof PRISM_MACHINE_3D_MODEL_DATABASE_V3 === 'undefined') return [];
    return PRISM_MACHINE_3D_MODEL_DATABASE_V3.getByManufacturer(manufacturer);
  },
  // GET ALL MACHINES BY TYPE
  getMachinesByType(type) {
    if (typeof PRISM_MACHINE_3D_MODEL_DATABASE_V3 === 'undefined') return [];
    return PRISM_MACHINE_3D_MODEL_DATABASE_V3.getByType(type);
  },
  // RENDER MACHINE MODEL
  async renderMachine(machineId, container, options = {}) {
    const modelInfo = this.getBestModel(machineId);

    console.log(`[ModelOrchestrator] Rendering ${machineId} from ${modelInfo.source}`);

    // Set active model
    this.state.activeModel = machineId;

    // Delegate to appropriate renderer based on source
    if (modelInfo.source === 'USER_UPLOAD' && typeof PRISM_MACHINE_3D_MODELS !== 'undefined') {
      return PRISM_MACHINE_3D_MODELS.renderModel?.(modelInfo.data, container, options);
    }
    if (modelInfo.hasGeometry && typeof ULTIMATE_3D_MACHINE_SYSTEM !== 'undefined') {
      return ULTIMATE_3D_MACHINE_SYSTEM.loadAndRender?.(machineId, container, options);
    }
    // Fallback to procedural generator
    if (typeof MACHINE_MODEL_GENERATOR !== 'undefined') {
      return MACHINE_MODEL_GENERATOR.generateModel?.(machineId, modelInfo.data, container, options);
    }
    console.warn(`[ModelOrchestrator] No renderer available for ${machineId}`);
    return null;
  },
  // GET COLLISION DATA
  getCollisionData(machineId) {
    const modelInfo = this.getBestModel(machineId);

    if (!modelInfo || !modelInfo.data) {
      return this.getProceduralDefaults(machineId);
    }
    return {
      travels: modelInfo.data.travels || { x: 762, y: 508, z: 508 },
      type: modelInfo.data.type || '3AXIS_VMC',
      spindle: modelInfo.data.spindle || { rpm: 10000, taper: 'CAT40' }
    };
  },
  // STATISTICS
  getStats() {
    let totalModels = 0;
    let manufacturers = 0;

    if (typeof PRISM_MACHINE_3D_MODEL_DATABASE_V3 !== 'undefined') {
      totalModels = PRISM_MACHINE_3D_MODEL_DATABASE_V3.totalModels || 0;
      manufacturers = Object.keys(PRISM_MACHINE_3D_MODEL_DATABASE_V3.manufacturers || {}).length;
    }
    return {
      totalModels,
      manufacturers,
      cachedModels: this.state.modelCache.size,
      initialized: this.state.initialized
    };
  }
}