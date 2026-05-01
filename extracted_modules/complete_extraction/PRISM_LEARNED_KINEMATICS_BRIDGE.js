const PRISM_LEARNED_KINEMATICS_BRIDGE = {
  version: '1.0.0',

  // Cached kinematic configurations from learned data
  learnedConfigs: new Map(),

  // Default kinematic templates
  templates: {
    vmc_3axis: {
      type: 'cartesian',
      axes: ['X', 'Y', 'Z'],
      joints: [
        { name: 'X', type: 'linear', direction: [1, 0, 0], limits: [-500, 500], maxVelocity: 30000, maxAccel: 5000 },
        { name: 'Y', type: 'linear', direction: [0, 1, 0], limits: [-400, 400], maxVelocity: 30000, maxAccel: 5000 },
        { name: 'Z', type: 'linear', direction: [0, 0, 1], limits: [-500, 0], maxVelocity: 20000, maxAccel: 4000 }
      ],
      tcp: { x: 0, y: 0, z: -100 }
    },
    vmc_5axis_ac: {
      type: 'trunnion',
      axes: ['X', 'Y', 'Z', 'A', 'C'],
      joints: [
        { name: 'X', type: 'linear', direction: [1, 0, 0], limits: [-500, 500], maxVelocity: 30000, maxAccel: 5000 },
        { name: 'Y', type: 'linear', direction: [0, 1, 0], limits: [-400, 400], maxVelocity: 30000, maxAccel: 5000 },
        { name: 'Z', type: 'linear', direction: [0, 0, 1], limits: [-500, 0], maxVelocity: 20000, maxAccel: 4000 },
        { name: 'A', type: 'rotary', axis: [1, 0, 0], limits: [-30, 120], maxVelocity: 6000, maxAccel: 2000 },
        { name: 'C', type: 'rotary', axis: [0, 0, 1], limits: [-360, 360], maxVelocity: 9000, maxAccel: 3000 }
      ],
      pivotPoint: { x: 0, y: 0, z: -50 },
      tcp: { x: 0, y: 0, z: -100 }
    },
    vmc_5axis_bc: {
      type: 'head_table',
      axes: ['X', 'Y', 'Z', 'B', 'C'],
      joints: [
        { name: 'X', type: 'linear', direction: [1, 0, 0], limits: [-500, 500], maxVelocity: 30000, maxAccel: 5000 },
        { name: 'Y', type: 'linear', direction: [0, 1, 0], limits: [-400, 400], maxVelocity: 30000, maxAccel: 5000 },
        { name: 'Z', type: 'linear', direction: [0, 0, 1], limits: [-500, 0], maxVelocity: 20000, maxAccel: 4000 },
        { name: 'B', type: 'rotary', axis: [0, 1, 0], limits: [-120, 30], maxVelocity: 6000, maxAccel: 2000 },
        { name: 'C', type: 'rotary', axis: [0, 0, 1], limits: [-360, 360], maxVelocity: 9000, maxAccel: 3000 }
      ],
      headPivot: { x: 0, y: 0, z: 0 },
      tcp: { x: 0, y: 0, z: -150 }
    },
    lathe_xz: {
      type: 'lathe',
      axes: ['X', 'Z'],
      joints: [
        { name: 'X', type: 'linear', direction: [0, 1, 0], limits: [-200, 300], maxVelocity: 20000, maxAccel: 4000 },
        { name: 'Z', type: 'linear', direction: [1, 0, 0], limits: [-50, 1000], maxVelocity: 30000, maxAccel: 5000 }
      ],
      spindleAxis: [1, 0, 0]
    },
    mill_turn: {
      type: 'mill_turn',
      axes: ['X', 'Y', 'Z', 'B', 'C'],
      joints: [
        { name: 'X', type: 'linear', direction: [0, 1, 0], limits: [-200, 300], maxVelocity: 20000, maxAccel: 4000 },
        { name: 'Y', type: 'linear', direction: [0, 0, 1], limits: [-100, 100], maxVelocity: 15000, maxAccel: 3000 },
        { name: 'Z', type: 'linear', direction: [1, 0, 0], limits: [-50, 1000], maxVelocity: 30000, maxAccel: 5000 },
        { name: 'B', type: 'rotary', axis: [0, 0, 1], limits: [-120, 30], maxVelocity: 4000, maxAccel: 1500 },
        { name: 'C', type: 'rotary', axis: [1, 0, 0], limits: [0, 360], maxVelocity: 6000, maxAccel: 2000 }
      ],
      spindleAxis: [1, 0, 0]
    }
  },
  // INITIALIZATION

  init() {
    console.log('[LEARNED_KINEMATICS_BRIDGE] Initializing...');

    // Load cached configs
    this.loadCachedConfigs();

    // Listen for new learned data
    window.addEventListener('machine3DLearned', (e) => {
      this.processLearnedKinematics(e.detail);
    });

    // Integrate with PRISM_KINEMATIC_SOLVER
    this.integrateWithKinematicSolver();

    // Integrate with ULTIMATE_3D_MACHINE_SYSTEM
    this.integrateWithAnimationSystem();

    console.log('[LEARNED_KINEMATICS_BRIDGE] Ready with', this.learnedConfigs.size, 'learned configs');
    return this;
  },
  // PROCESS LEARNED KINEMATICS

  processLearnedKinematics(detail) {
    const { manufacturer, machineType, ratios } = detail;
    const key = `${manufacturer}_${machineType}`;

    console.log('[LEARNED_KINEMATICS_BRIDGE] Processing learned kinematics:', key);

    // Extract kinematic data from learned ratios
    const kinematicConfig = this.buildKinematicConfig(ratios, machineType);

    // Store in cache
    this.learnedConfigs.set(key, {
      config: kinematicConfig,
      source: 'learned',
      confidence: ratios.confidence || 0.9,
      timestamp: Date.now()
    });

    // Save to localStorage
    this.saveCachedConfigs();

    // Update PRISM_KINEMATIC_SOLVER models
    this.updateKinematicSolverModel(key, kinematicConfig);

    // Dispatch event for other systems
    window.dispatchEvent(new CustomEvent('kinematicsUpdated', {
      detail: { key, config: kinematicConfig }
    }));

    return kinematicConfig;
  },
  // BUILD KINEMATIC CONFIG FROM LEARNED DATA

  buildKinematicConfig(ratios, machineType) {
    // Get base template
    const baseTemplate = this.getBaseTemplate(machineType);
    const kinematics = ratios.kinematics || {};
    const dimensions = ratios.dimensions || {};

    // Clone and modify template
    const config = JSON.parse(JSON.stringify(baseTemplate));

    // Update axis limits from learned data
    if (kinematics.aAxisRange) {
      const aJoint = config.joints.find(j => j.name === 'A');
      if (aJoint) {
        aJoint.limits = kinematics.aAxisRange;
      }
    }
    if (kinematics.cAxisRange) {
      const cJoint = config.joints.find(j => j.name === 'C');
      if (cJoint) {
        cJoint.limits = kinematics.cAxisRange;
      }
    }
    if (kinematics.bAxisRange) {
      const bJoint = config.joints.find(j => j.name === 'B');
      if (bJoint) {
        bJoint.limits = kinematics.bAxisRange;
      }
    }
    // Update pivot point if available
    if (dimensions.pivotPointZ !== undefined) {
      config.pivotPoint = config.pivotPoint || {};
      config.pivotPoint.z = dimensions.pivotPointZ;
    }
    // Update rotary table diameter
    if (dimensions.rotaryTableDia) {
      config.rotaryTableDia = dimensions.rotaryTableDia;
    }
    // Update kinematics type
    if (kinematics.type) {
      config.type = kinematics.type;
    }
    // Add spindle orientation
    config.spindleOrientation = kinematics.spindleOrientation || 'vertical';

    return config;
  },
  // GET BASE TEMPLATE

  getBaseTemplate(machineType) {
    const type = (machineType || '').toLowerCase();

    if (type.includes('5') && (type.includes('ac') || type.includes('trunnion'))) {
      return this.templates.vmc_5axis_ac;
    }
    if (type.includes('5') && (type.includes('bc') || type.includes('head'))) {
      return this.templates.vmc_5axis_bc;
    }
    if (type.includes('mill') && type.includes('turn')) {
      return this.templates.mill_turn;
    }
    if (type.includes('lathe') || type.includes('turn')) {
      return this.templates.lathe_xz;
    }
    return this.templates.vmc_3axis;
  },
  // INTEGRATE WITH PRISM_KINEMATIC_SOLVER

  integrateWithKinematicSolver() {
    if (typeof PRISM_KINEMATIC_SOLVER === 'undefined') {
      console.warn('[LEARNED_KINEMATICS_BRIDGE] PRISM_KINEMATIC_SOLVER not found');
      return;
    }
    // Add method to get learned model
    PRISM_KINEMATIC_SOLVER.getLearnedModel = (manufacturer, machineType) => {
      const key = `${manufacturer.toLowerCase()}_${machineType}`;
      const cached = this.learnedConfigs.get(key);

      if (cached && cached.confidence > 0.7) {
        return cached.config;
      }
      return null;
    };
    // Enhance getModel to check learned configs first
    const originalGetModel = PRISM_KINEMATIC_SOLVER.getModel.bind(PRISM_KINEMATIC_SOLVER);

    PRISM_KINEMATIC_SOLVER.getModel = (type, manufacturer) => {
      // Check for learned model first
      if (manufacturer) {
        const learned = PRISM_KINEMATIC_SOLVER.getLearnedModel(manufacturer, type);
        if (learned) {
          console.log('[KINEMATIC_SOLVER] Using learned model for', manufacturer, type);
          return this.convertToSolverModel(learned);
        }
      }
      // Fall back to original
      return originalGetModel(type);
    };
    // Add method to update model at runtime
    PRISM_KINEMATIC_SOLVER.updateModelFromLearned = (key, config) => {
      this.updateKinematicSolverModel(key, config);
    };
    console.log('[LEARNED_KINEMATICS_BRIDGE] Integrated with PRISM_KINEMATIC_SOLVER');
  },
  // CONVERT TO SOLVER MODEL FORMAT

  convertToSolverModel(learnedConfig) {
    const model = {
      type: learnedConfig.type,
      axes: learnedConfig.joints.map(j => j.name),
      joints: learnedConfig.joints.map(j => ({
        name: j.name,
        type: j.type,
        axis: j.direction || j.axis,
        limits: j.limits,
        maxVelocity: j.maxVelocity,
        maxAccel: j.maxAccel
      })),
      tcp: learnedConfig.tcp,
      pivotPoint: learnedConfig.pivotPoint,

      // Forward kinematics function
      forward: (joints) => {
        return this.computeForwardKinematics(learnedConfig, joints);
      },
      // Inverse kinematics function
      inverse: (pose, toolAxis) => {
        return this.computeInverseKinematics(learnedConfig, pose, toolAxis);
      }
    };
    return model;
  },
  // COMPUTE FORWARD KINEMATICS

  computeForwardKinematics(config, joints) {
    let position = { x: 0, y: 0, z: 0 };
    let orientation = { i: 0, j: 0, k: -1 }; // Default: tool points down

    // Apply linear joints
    for (const joint of config.joints) {
      if (joint.type === 'linear') {
        const value = joints[joint.name] || 0;
        const dir = joint.direction || [1, 0, 0];
        position.x += dir[0] * value;
        position.y += dir[1] * value;
        position.z += dir[2] * value;
      }
    }
    // Apply rotary joints
    const aJoint = config.joints.find(j => j.name === 'A');
    const bJoint = config.joints.find(j => j.name === 'B');
    const cJoint = config.joints.find(j => j.name === 'C');

    if (aJoint && joints.A !== undefined) {
      const aRad = joints.A * Math.PI / 180;
      // Rotate around X axis
      const cosA = Math.cos(aRad);
      const sinA = Math.sin(aRad);
      orientation.j = -sinA;
      orientation.k = -cosA;
    }
    if (bJoint && joints.B !== undefined) {
      const bRad = joints.B * Math.PI / 180;
      // Rotate around Y axis
      const cosB = Math.cos(bRad);
      const sinB = Math.sin(bRad);
      orientation.i = sinB;
      orientation.k = -cosB;
    }
    if (cJoint && joints.C !== undefined) {
      const cRad = joints.C * Math.PI / 180;
      // Rotate around Z axis (affects X/Y components of orientation)
      const cosC = Math.cos(cRad);
      const sinC = Math.sin(cRad);
      const oldI = orientation.i;
      const oldJ = orientation.j;
      orientation.i = oldI * cosC - oldJ * sinC;
      orientation.j = oldI * sinC + oldJ * cosC;
    }
    return {
      x: position.x,
      y: position.y,
      z: position.z,
      i: orientation.i,
      j: orientation.j,
      k: orientation.k,
      a: joints.A || 0,
      b: joints.B || 0,
      c: joints.C || 0
    };
  },
  // COMPUTE INVERSE KINEMATICS

  computeInverseKinematics(config, pose, toolAxis) {
    const joints = {};
    const hasA = config.joints.some(j => j.name === 'A');
    const hasB = config.joints.some(j => j.name === 'B');
    const hasC = config.joints.some(j => j.name === 'C');

    // Default tool axis if not provided
    toolAxis = toolAxis || { i: 0, j: 0, k: -1 };

    // Calculate rotary angles from tool axis
    if (hasA && hasC) {
      // AC configuration (trunnion)
      const A = Math.acos(-toolAxis.k) * 180 / Math.PI;
      let C = Math.atan2(toolAxis.j, toolAxis.i) * 180 / Math.PI;
      if (Math.abs(A) < 0.001) C = 0;
      joints.A = A;
      joints.C = C;
    } else if (hasB && hasC) {
      // BC configuration (head/table)
      const B = Math.atan2(toolAxis.i, -toolAxis.k) * 180 / Math.PI;
      let C = Math.atan2(toolAxis.j, toolAxis.i) * 180 / Math.PI;
      if (Math.abs(B) < 0.001) C = 0;
      joints.B = B;
      joints.C = C;
    }
    // Linear joints from position
    joints.X = pose.x;
    joints.Y = pose.y;
    joints.Z = pose.z;

    // Apply pivot point compensation if available
    if (config.pivotPoint) {
      // Compensate for rotary axis pivot
      // This is simplified - full implementation would consider all rotations
    }
    return joints;
  },
  // UPDATE KINEMATIC SOLVER MODEL

  updateKinematicSolverModel(key, config) {
    if (typeof PRISM_KINEMATIC_SOLVER === 'undefined') return;

    const solverModel = this.convertToSolverModel(config);

    // Add to PRISM_KINEMATIC_SOLVER.models
    PRISM_KINEMATIC_SOLVER.models[key] = solverModel;

    console.log('[LEARNED_KINEMATICS_BRIDGE] Updated KINEMATIC_SOLVER with model:', key);
  },
  // INTEGRATE WITH ANIMATION SYSTEM

  integrateWithAnimationSystem() {
    if (typeof ULTIMATE_3D_MACHINE_SYSTEM === 'undefined') {
      console.warn('[LEARNED_KINEMATICS_BRIDGE] ULTIMATE_3D_MACHINE_SYSTEM not found');
      return;
    }
    // Add method to get axis config from learned data
    ULTIMATE_3D_MACHINE_SYSTEM.animation.getLearnedAxisConfig = (machineKey) => {
      const cached = this.learnedConfigs.get(machineKey);
      if (!cached) return null;

      const axisConfig = {};
      for (const joint of cached.config.joints) {
        axisConfig[joint.name] = {
          type: joint.type,
          direction: joint.type === 'linear' ?
            (joint.direction[0] === 1 ? 'x' : joint.direction[1] === 1 ? 'y' : 'z') : null,
          rotationAxis: joint.type === 'rotary' ?
            (joint.axis[0] === 1 ? 'x' : joint.axis[1] === 1 ? 'y' : 'z') : null,
          limits: joint.limits,
          maxVelocity: joint.maxVelocity,
          maxAccel: joint.maxAccel
        };
      }
      return axisConfig;
    };
    // Enhance init to use learned configs
    const originalInit = ULTIMATE_3D_MACHINE_SYSTEM.animation.init.bind(ULTIMATE_3D_MACHINE_SYSTEM.animation);

    ULTIMATE_3D_MACHINE_SYSTEM.animation.init = function(machineModel, config) {
      // Check for learned config
      const machineKey = machineModel.userData?.machineKey;
      if (machineKey) {
        const learnedConfig = this.getLearnedAxisConfig(machineKey);
        if (learnedConfig) {
          config = { ...config, axes: { ...config?.axes, ...learnedConfig } };
          console.log('[Animation] Using learned axis config for:', machineKey);
        }
      }
      return originalInit(machineModel, config);
    };
    console.log('[LEARNED_KINEMATICS_BRIDGE] Integrated with ULTIMATE_3D_MACHINE_SYSTEM.animation');
  },
  // PERSISTENCE

  loadCachedConfigs() {
    try {
      const stored = localStorage.getItem('prism_learned_kinematics');
      if (stored) {
        const parsed = JSON.parse(stored);
        for (const [key, value] of Object.entries(parsed)) {
          this.learnedConfigs.set(key, value);
        }
        console.log('[LEARNED_KINEMATICS_BRIDGE] Loaded', this.learnedConfigs.size, 'cached configs');
      }
    } catch (e) {
      console.warn('[LEARNED_KINEMATICS_BRIDGE] Failed to load cached configs:', e);
    }
  },
  saveCachedConfigs() {
    try {
      const obj = Object.fromEntries(this.learnedConfigs);
      localStorage.setItem('prism_learned_kinematics', JSON.stringify(obj));
    } catch (e) {
      console.warn('[LEARNED_KINEMATICS_BRIDGE] Failed to save configs:', e);
    }
  },
  // API

  getConfig(manufacturer, machineType) {
    const key = `${manufacturer.toLowerCase()}_${machineType}`;
    return this.learnedConfigs.get(key)?.config || null;
  },
  getAllConfigs() {
    return Object.fromEntries(this.learnedConfigs);
  },
  exportConfigs() {
    return JSON.stringify(Object.fromEntries(this.learnedConfigs), null, 2);
  }
}