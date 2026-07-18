/**
 * PRISM_MACHINE_3D_SYSTEM
 * Extracted from PRISM v8.89.002 monolith
 * References: 12
 * Lines: 538
 * Session: R2.3.1 Wave 2 Engine Gap Extraction
 */

const PRISM_MACHINE_3D_SYSTEM = {
  version: '1.0.0',
  loadedMachines: {},

  /**
   * Initialize the machine 3D system
   */
  init() {
    console.log('[MACHINE_3D] Initializing Machine 3D System...');
    console.log('[MACHINE_3D] Available machines:', Object.keys(PRISM_MACHINE_3D_DATABASE).length);

    // Register machines
    Object.keys(PRISM_MACHINE_3D_DATABASE).forEach(id => {
      const m = PRISM_MACHINE_3D_DATABASE[id];
      console.log(`[MACHINE_3D]   - ${m.manufacturer} ${m.model} (${m.type})`);
    });

    // Connect to existing systems
    this.connectToLearningEngine();
    this.connectToCollisionSystem();
    this.connectToMachineSelector();
    this.connectToVisualization();

    window.PRISM_MACHINE_3D_SYSTEM = this;
    window.getMachine3D = this.getMachine.bind(this);
    window.generateMachineModel = this.generateMachineModel.bind(this);

    return this;
  },
  // MACHINE ACCESS

  getMachine(machineId) {
    // Direct lookup
    if (PRISM_MACHINE_3D_DATABASE[machineId]) {
      return PRISM_MACHINE_3D_DATABASE[machineId];
    }
    // Fuzzy match by model name
    const searchTerm = machineId.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [id, machine] of Object.entries(PRISM_MACHINE_3D_DATABASE)) {
      const modelName = (machine.manufacturer + machine.model).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (modelName.includes(searchTerm) || searchTerm.includes(modelName)) {
        return machine;
      }
    }
    return null;
  },
  getMachineByType(type) {
    return Object.values(PRISM_MACHINE_3D_DATABASE).filter(m => m.type === type);
  },
  getAllMachines() {
    return Object.values(PRISM_MACHINE_3D_DATABASE);
  },
  // 3D MODEL GENERATION

  /**
   * Generate simplified 3D geometry for a machine
   * This creates parametric geometry based on machine specs
   */
  generateMachineModel(machineId, options = {}) {
    const machine = this.getMachine(machineId);
    if (!machine) {
      console.warn('[MACHINE_3D] Machine not found:', machineId);
      return null;
    }
    const detail = options.detail || 'medium'; // low, medium, high

    switch (machine.type) {
      case 'vmc':
        return this.generateVMCModel(machine, detail);
      case 'vmc_5axis':
        return this.generate5AxisVMCModel(machine, detail);
      case 'turn_mill':
        return this.generateTurnMillModel(machine, detail);
      default:
        return this.generateGenericModel(machine, detail);
    }
  },
  /**
   * Generate 3-axis VMC model (Haas VF-2, Hurco VM30i style)
   */
  generateVMCModel(machine, detail) {
    const envelope = machine.workEnvelope;
    const specs = machine.specs;

    // Base dimensions from work envelope
    const xRange = envelope.x[1] - envelope.x[0];
    const yRange = envelope.y[1] - envelope.y[0];
    const zRange = envelope.z[1] - envelope.z[0];

    // Scale factor for visualization
    const scale = 1;

    return {
      type: 'vmc',
      machine: machine,
      components: {
        // Base/Column
        base: {
          type: 'box',
          dimensions: [xRange * 1.3, 400, yRange * 1.2],
          position: [xRange / 2, -200, yRange / 2],
          color: 0x444444
        },
        column: {
          type: 'box',
          dimensions: [300, zRange + 400, 400],
          position: [xRange + 100, zRange / 2, yRange / 2],
          color: 0x555555
        },
        // Table (Y-axis)
        table: {
          type: 'box',
          dimensions: [specs.tableSize ? specs.tableSize[0] : xRange, 50, specs.tableSize ? specs.tableSize[1] : yRange],
          position: [xRange / 2, 0, yRange / 2],
          color: 0x666677,
          movable: true,
          axis: 'Y'
        },
        // Saddle (X-axis carrier)
        saddle: {
          type: 'box',
          dimensions: [xRange * 0.4, 80, yRange + 100],
          position: [xRange / 2, 60, yRange / 2],
          color: 0x555566,
          movable: true,
          axis: 'X'
        },
        // Spindle head (Z-axis)
        spindleHead: {
          type: 'box',
          dimensions: [250, 350, 300],
          position: [xRange / 2, zRange + 200, yRange / 2],
          color: 0x666666,
          movable: true,
          axis: 'Z'
        },
        // Spindle
        spindle: {
          type: 'cylinder',
          dimensions: [80, 150],
          position: [xRange / 2, zRange + 50, yRange / 2],
          color: 0x888888,
          rotation: [Math.PI / 2, 0, 0]
        },
        // Tool holder
        toolHolder: {
          type: 'cylinder',
          dimensions: [30, 80],
          position: [xRange / 2, zRange, yRange / 2],
          color: 0x999999
        }
      },
      workEnvelope: {
        type: 'wireframe_box',
        dimensions: [xRange, zRange, yRange],
        position: [xRange / 2, zRange / 2, yRange / 2],
        color: 0x00ff00
      },
      axisLabels: {
        X: { direction: [1, 0, 0], range: envelope.x },
        Y: { direction: [0, 0, 1], range: envelope.y },
        Z: { direction: [0, 1, 0], range: envelope.z }
      }
    };
  },
  /**
   * Generate 5-axis VMC model (Okuma GENOS M460V-5AX style)
   */
  generate5AxisVMCModel(machine, detail) {
    const base = this.generateVMCModel(machine, detail);
    const specs = machine.specs;
    const envelope = machine.workEnvelope;
    const xRange = envelope.x[1] - envelope.x[0];
    const yRange = envelope.y[1] - envelope.y[0];
    const zRange = envelope.z[1] - envelope.z[0];

    // Add trunnion table components
    base.components.trunnionBase = {
      type: 'box',
      dimensions: [350, 150, 400],
      position: [xRange / 2, 80, yRange / 2],
      color: 0x555577,
      movable: true,
      axis: 'A'
    };
    base.components.aAxisCradle = {
      type: 'cylinder',
      dimensions: [180, 100],
      position: [xRange / 2, 150, yRange / 2],
      color: 0x666688,
      rotation: [0, 0, Math.PI / 2],
      movable: true,
      axis: 'A',
      range: specs.aAxisRange || [-30, 120]
    };
    base.components.cAxisTable = {
      type: 'cylinder',
      dimensions: [specs.tableDia / 2 || 200, 40],
      position: [xRange / 2, 180, yRange / 2],
      color: 0x777799,
      movable: true,
      axis: 'C',
      range: [0, 360]
    };
    // Update type
    base.type = 'vmc_5axis';
    base.axisLabels.A = {
      direction: [0, 0, 1],
      range: specs.aAxisRange || [-30, 120],
      type: 'rotary'
    };
    base.axisLabels.C = {
      direction: [0, 1, 0],
      range: [0, 360],
      type: 'rotary'
    };
    return base;
  },
  /**
   * Generate turn-mill model (Okuma MULTUS B250II style)
   */
  generateTurnMillModel(machine, detail) {
    const specs = machine.specs;
    const envelope = machine.workEnvelope;

    const maxLength = specs.maxTurningLength || 1000;
    const maxDia = specs.maxSwing || 600;

    return {
      type: 'turn_mill',
      machine: machine,
      components: {
        // Main bed
        bed: {
          type: 'box',
          dimensions: [maxLength * 1.4, 400, maxDia * 0.8],
          position: [maxLength / 2, -200, 0],
          color: 0x444455
        },
        // Headstock (main spindle)
        headstock: {
          type: 'box',
          dimensions: [400, 500, 500],
          position: [-50, 150, 0],
          color: 0x555566
        },
        // Main spindle
        mainSpindle: {
          type: 'cylinder',
          dimensions: [specs.barCapacity * 2 || 100, 200],
          position: [100, 150, 0],
          color: 0x777788,
          rotation: [0, 0, Math.PI / 2],
          movable: true,
          axis: 'C'
        },
        // Chuck
        chuck: {
          type: 'cylinder',
          dimensions: [specs.maxTurningDia / 2 || 200, 80],
          position: [180, 150, 0],
          color: 0x888899,
          rotation: [0, 0, Math.PI / 2]
        },
        // B-axis milling head
        bAxisHead: {
          type: 'box',
          dimensions: [200, 300, 250],
          position: [maxLength / 2, 400, 0],
          color: 0x666677,
          movable: true,
          axes: ['X', 'Y', 'Z', 'B']
        },
        // Milling spindle
        millingSpindle: {
          type: 'cylinder',
          dimensions: [60, 150],
          position: [maxLength / 2, 300, 0],
          color: 0x999999,
          movable: true,
          axis: 'B',
          range: specs.bAxisRange || [-120, 30]
        },
        // Turret (lower)
        turret: {
          type: 'cylinder',
          dimensions: [150, 100],
          position: [maxLength / 3, -50, -200],
          color: 0x556677,
          movable: true,
          stations: specs.turretPositions || 12
        },
        // Tailstock
        tailstock: {
          type: 'box',
          dimensions: [250, 350, 300],
          position: [maxLength - 100, 100, 0],
          color: 0x555566,
          movable: true,
          axis: 'Z'
        },
        // Sub-spindle (if equipped)
        subSpindle: {
          type: 'cylinder',
          dimensions: [80, 150],
          position: [maxLength - 50, 150, 0],
          color: 0x778899,
          rotation: [0, 0, Math.PI / 2],
          optional: true
        }
      },
      workEnvelope: {
        type: 'cylinder',
        dimensions: [specs.maxSwing / 2, maxLength],
        position: [maxLength / 2, 150, 0],
        color: 0x00ff00,
        rotation: [0, 0, Math.PI / 2],
        wireframe: true
      },
      axisLabels: {
        X: { direction: [0, 1, 0], range: envelope.x },
        Y: { direction: [0, 0, 1], range: envelope.y },
        Z: { direction: [1, 0, 0], range: envelope.z },
        C: { direction: [1, 0, 0], range: [0, 360], type: 'rotary' },
        B: { direction: [0, 0, 1], range: specs.bAxisRange, type: 'rotary' }
      }
    };
  },
  generateGenericModel(machine, detail) {
    return {
      type: 'generic',
      machine: machine,
      components: {
        base: {
          type: 'box',
          dimensions: [1000, 300, 800],
          position: [0, -150, 0],
          color: 0x555555
        }
      }
    };
  },
  // LEARNING ENGINE INTEGRATION

  connectToLearningEngine() {
    // Connect to CAM learning engine
    if (typeof PRISM_CAM_LEARNING_ENGINE !== 'undefined') {
      PRISM_CAM_LEARNING_ENGINE.machineDatabase = PRISM_MACHINE_3D_DATABASE;

      // Add machine-specific learning patterns
      PRISM_CAM_LEARNING_ENGINE.getMachinePatterns = (machineId) => {
        const machine = this.getMachine(machineId);
        if (!machine) return null;

        return {
          machineType: machine.type,
          axes: machine.axes,
          capabilities: this.getMachineCapabilities(machine),
          recommendedStrategies: this.getRecommendedStrategies(machine),
          limitations: this.getMachineLimitations(machine)
        };
      };
      console.log('[MACHINE_3D] ✓ Connected to PRISM_CAM_LEARNING_ENGINE');
    }
    // Connect to unified learning system
    if (typeof PRISM_UNIFIED_CAD_LEARNING_SYSTEM !== 'undefined') {
      PRISM_UNIFIED_CAD_LEARNING_SYSTEM.machineModels = PRISM_MACHINE_3D_DATABASE;
      console.log('[MACHINE_3D] ✓ Connected to PRISM_UNIFIED_CAD_LEARNING_SYSTEM');
    }
    // Connect to master database
    if (typeof PRISM_MASTER_CAD_CAM_DATABASE !== 'undefined') {
      PRISM_MASTER_CAD_CAM_DATABASE.machineLibrary = PRISM_MACHINE_3D_DATABASE;
      console.log('[MACHINE_3D] ✓ Connected to PRISM_MASTER_CAD_CAM_DATABASE');
    }
  },
  getMachineCapabilities(machine) {
    const caps = [];

    if (machine.type === 'vmc') {
      caps.push('3axis_milling', 'drilling', 'tapping', 'boring');
    }
    if (machine.type === 'vmc_5axis') {
      caps.push('3axis_milling', '5axis_simultaneous', '3+2_positioning',
                'undercut_milling', 'impeller_machining', 'drilling', 'tapping');
    }
    if (machine.type === 'turn_mill') {
      caps.push('turning', 'boring', 'threading', 'grooving', 'milling_on_lathe',
                'b_axis_milling', 'polygon_turning', 'live_tooling');
    }
    return caps;
  },
  getRecommendedStrategies(machine) {
    const strategies = {};

    if (machine.type === 'vmc' || machine.type === 'vmc_5axis') {
      strategies.roughing = ['adaptive_clearing', 'trochoidal', 'plunge_rough'];
      strategies.finishing = ['parallel', 'scallop', 'steep_shallow'];
    }
    if (machine.type === 'vmc_5axis') {
      strategies.fiveAxis = ['swarf', 'multiaxis_contour', 'flow', 'morph'];
    }
    if (machine.type === 'turn_mill') {
      strategies.turning = ['rough_turn', 'finish_turn', 'profile_turn'];
      strategies.milling = ['b_axis_pocket', 'polar_milling', 'helical_milling'];
    }
    return strategies;
  },
  getMachineLimitations(machine) {
    const limits = [];
    const specs = machine.specs;

    if (machine.type === 'vmc' && !machine.axes.rotary.length) {
      limits.push('no_undercuts', 'limited_to_3_sides');
    }
    if (specs.spindleSpeed < 12000) {
      limits.push('limited_high_speed_machining');
    }
    if (machine.axes.rotary.includes('A') || machine.axes.rotary.includes('B')) {
      const range = specs.aAxisRange || specs.bAxisRange;
      if (range && (range[1] - range[0]) < 180) {
        limits.push('limited_rotary_range');
      }
    }
    return limits;
  },
  // COLLISION SYSTEM INTEGRATION

  connectToCollisionSystem() {
    if (typeof COLLISION_AVOIDANCE_SYSTEM !== 'undefined') {
      COLLISION_AVOIDANCE_SYSTEM.machineModels = PRISM_MACHINE_3D_DATABASE;

      COLLISION_AVOIDANCE_SYSTEM.getMachineEnvelope = (machineId) => {
        const machine = this.getMachine(machineId);
        if (!machine) return null;
        return machine.workEnvelope;
      };
      COLLISION_AVOIDANCE_SYSTEM.checkMachineCollision = (machineId, toolpath) => {
        const model = this.generateMachineModel(machineId);
        if (!model) return { valid: true };

        // Check toolpath against work envelope
        const envelope = model.workEnvelope;
        const violations = [];

        // Simplified collision check
        if (toolpath && toolpath.points) {
          toolpath.points.forEach((pt, i) => {
            if (pt.x < envelope.dimensions[0] * -0.5 || pt.x > envelope.dimensions[0] * 0.5 ||
                pt.y < envelope.dimensions[1] * -0.5 || pt.y > envelope.dimensions[1] * 0.5 ||
                pt.z < 0 || pt.z > envelope.dimensions[2]) {
              violations.push({ point: i, position: pt, type: 'out_of_envelope' });
            }
          });
        }
        return {
          valid: violations.length === 0,
          violations: violations
        };
      };
      console.log('[MACHINE_3D] ✓ Connected to COLLISION_AVOIDANCE_SYSTEM');
    }
    if (typeof PRISM_COLLISION_DETECTION !== 'undefined') {
      PRISM_COLLISION_DETECTION.machineGeometry = this;
      console.log('[MACHINE_3D] ✓ Connected to PRISM_COLLISION_DETECTION');
    }
  },
  // MACHINE SELECTOR INTEGRATION

  connectToMachineSelector() {
    // Add to existing machine database if present
    if (typeof MACHINE_DATABASE !== 'undefined') {
      Object.entries(PRISM_MACHINE_3D_DATABASE).forEach(([id, machine]) => {
        MACHINE_DATABASE[id] = {
          ...machine,
          has3DModel: true,
          generate3D: () => this.generateMachineModel(id)
        };
      });
      console.log('[MACHINE_3D] ✓ Enhanced MACHINE_DATABASE with 3D models');
    }
    // Connect to smart machine selection
    if (typeof PRISM_SMART_MACHINE_SELECTION !== 'undefined') {
      PRISM_SMART_MACHINE_SELECTION.machine3DModels = PRISM_MACHINE_3D_DATABASE;
      console.log('[MACHINE_3D] ✓ Connected to PRISM_SMART_MACHINE_SELECTION');
    }
  },
  // VISUALIZATION INTEGRATION

  connectToVisualization() {
    if (typeof MACHINE_VISUALIZATION !== 'undefined') {
      MACHINE_VISUALIZATION.machineModels = PRISM_MACHINE_3D_DATABASE;
      MACHINE_VISUALIZATION.generateModel = this.generateMachineModel.bind(this);
      console.log('[MACHINE_3D] ✓ Connected to MACHINE_VISUALIZATION');
    }
    if (typeof PRISM_SETUP_VISUALIZER !== 'undefined') {
      PRISM_SETUP_VISUALIZER.machineModels = PRISM_MACHINE_3D_DATABASE;
      console.log('[MACHINE_3D] ✓ Connected to PRISM_SETUP_VISUALIZER');
    }
    // Connect to 3D simulator
    if (typeof PRISM_3D_SIMULATOR !== 'undefined') {
      PRISM_3D_SIMULATOR.loadMachine = (machineId) => {
        return this.generateMachineModel(machineId, { detail: 'high' });
      };
      console.log('[MACHINE_3D] ✓ Connected to PRISM_3D_SIMULATOR');
    }
  },
  // STEP FILE REFERENCE

  getStepFileReference(machineId) {
    const machine = this.getMachine(machineId);
    if (!machine) return null;

    return {
      filename: machine.stepFile,
      complexity: machine.complexity,
      components: machine.components
    };
  },
  // STATISTICS

  getStats() {
    const machines = Object.values(PRISM_MACHINE_3D_DATABASE);
    return {
      totalMachines: machines.length,
      byType: {
        vmc: machines.filter(m => m.type === 'vmc').length,
        vmc_5axis: machines.filter(m => m.type === 'vmc_5axis').length,
        turn_mill: machines.filter(m => m.type === 'turn_mill').length
      },
      byManufacturer: {
        Okuma: machines.filter(m => m.manufacturer === 'Okuma').length,
        Haas: machines.filter(m => m.manufacturer === 'Haas').length,
        Hurco: machines.filter(m => m.manufacturer === 'Hurco').length
      },
      totalFaces: machines.reduce((sum, m) => sum + m.complexity.faces, 0)
    };
  }
}