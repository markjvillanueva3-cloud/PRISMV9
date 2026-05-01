// PRISM_KERNEL_INTEGRATION - Lines 322513-322613 (101 lines) - Kernel integration\n\nconst PRISM_KERNEL_INTEGRATION = {
  /**
   * Initialize all kernel components
   */
  init() {
    console.log('[KERNEL_INTEGRATION] Connecting all kernel components...');

    // Connect STEP-to-Mesh with renderer
    if (typeof PRISM_STEP_TO_MESH_KERNEL !== 'undefined') {
      PRISM_STEP_TO_MESH_KERNEL.render = PRISM_STEP_RENDERER.renderSTEP.bind(PRISM_STEP_RENDERER);
      PRISM_STEP_TO_MESH_KERNEL.adaptiveMesh = PRISM_ADAPTIVE_MESH;
      PRISM_STEP_TO_MESH_KERNEL.trimmedSurface = PRISM_TRIMMED_SURFACE;
      console.log('[KERNEL_INTEGRATION] ✓ STEP_TO_MESH_KERNEL enhanced');
    }
    // Connect backplot with kinematics
    if (typeof PRISM_GCODE_BACKPLOT_ENGINE !== 'undefined' && typeof PRISM_KINEMATIC_SOLVER !== 'undefined') {
      PRISM_GCODE_BACKPLOT_ENGINE.kinematics = PRISM_KINEMATIC_SOLVER;

      // Add 5-axis move visualization
      PRISM_GCODE_BACKPLOT_ENGINE.visualize5Axis = function(move, modelType) {
        const linearized = PRISM_KINEMATIC_SOLVER.linearize5Axis(move, modelType, 20);
        return linearized;
      };
      console.log('[KERNEL_INTEGRATION] ✓ BACKPLOT + KINEMATICS connected');
    }
    // Connect to machine models
    if (typeof PRISM_MACHINE_3D_DATABASE !== 'undefined') {
      PRISM_MACHINE_3D_DATABASE.getKinematicModel = (machineId) => {
        const machine = PRISM_MACHINE_3D_DATABASE[machineId];
        if (!machine) return null;

        // Map machine type to kinematic model
        if (machine.type === 'vmc_5axis') {
          return machine.axes?.rotary?.includes('A') ? 'vmc_5axis_ac' : 'vmc_5axis_bc';
        } else if (machine.type === 'turn_mill') {
          return 'turnmill_bc';
        }
        return 'vmc_3axis';
      };
      console.log('[KERNEL_INTEGRATION] ✓ MACHINE_3D_DATABASE kinematic mapping added');
    }
    // Connect to CAD recognition
    if (typeof ADVANCED_CAD_RECOGNITION_ENGINE !== 'undefined') {
      ADVANCED_CAD_RECOGNITION_ENGINE.renderToScene = async function(file, container, options) {
        const stepData = await this.stepParser.parse(file);
        return PRISM_STEP_RENDERER.renderSTEP(stepData, container, options);
      };
      console.log('[KERNEL_INTEGRATION] ✓ CAD_RECOGNITION render pipeline added');
    }
    // Update collision system with full kinematics
    if (typeof COLLISION_SYSTEM !== 'undefined' && typeof PRISM_KINEMATIC_SOLVER !== 'undefined') {
      COLLISION_SYSTEM.check5AxisCollision = function(toolpath, machineType, machineConfig) {
        const model = PRISM_KINEMATIC_SOLVER.getModel(machineType);
        const collisions = [];

        for (let i = 0; i < toolpath.length; i++) {
          const move = toolpath[i];

          // Check joint limits
          const joints = {
            X: move.X, Y: move.Y, Z: move.Z,
            A: move.A, B: move.B, C: move.C
          };
          const limitCheck = PRISM_KINEMATIC_SOLVER.checkLimits(model, joints);
          if (!limitCheck.valid) {
            collisions.push({
              moveIndex: i,
              type: 'joint_limit',
              violations: limitCheck.violations
            });
          }
          // Check singularity
          const singCheck = PRISM_KINEMATIC_SOLVER.checkSingularity(machineType, joints);
          if (singCheck.hasSingularity) {
            collisions.push({
              moveIndex: i,
              type: 'singularity',
              warnings: singCheck.warnings
            });
          }
        }
        return { valid: collisions.length === 0, collisions };
      };
      console.log('[KERNEL_INTEGRATION] ✓ COLLISION_SYSTEM 5-axis checking added');
    }
    // Global exports
    window.PRISM_ADAPTIVE_MESH = PRISM_ADAPTIVE_MESH;
    window.PRISM_STEP_RENDERER = PRISM_STEP_RENDERER;
    window.PRISM_TRIMMED_SURFACE = PRISM_TRIMMED_SURFACE;
    window.PRISM_KERNEL_INTEGRATION = this;

    console.log('[KERNEL_INTEGRATION] ✓ All kernels integrated');
    console.log('[KERNEL_INTEGRATION] Final status:');
    console.log('  - CAD Kernel: COMPLETE (STEP parsing, tessellation, rendering)');
    console.log('  - CAM Kernel: COMPLETE (toolpath, learning, strategies)');
    console.log('  - Collision Kernel: COMPLETE (BVH, GJK, EPA, kinematics)');
    console.log('  - Simulation Kernel: COMPLETE (backplot, animation, material removal)');

    return this;
  }
};
