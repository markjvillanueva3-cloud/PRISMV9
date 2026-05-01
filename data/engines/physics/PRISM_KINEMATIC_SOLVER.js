/**
 * PRISM_KINEMATIC_SOLVER
 * Extracted from PRISM v8.89.002 monolith
 * References: 54
 * Lines: 542
 * Session: R2.3.1 Engine Gap Extraction
 */

const PRISM_KINEMATIC_SOLVER = {
  version: '1.0.0',

  // MACHINE KINEMATIC MODELS

  models: {
    // 3-axis VMC (standard)
    vmc_3axis: {
      type: 'vmc_3axis',
      axes: ['X', 'Y', 'Z'],
      joints: [
        { name: 'X', type: 'linear', axis: [1, 0, 0], limits: [-500, 500] },
        { name: 'Y', type: 'linear', axis: [0, 1, 0], limits: [-300, 300] },
        { name: 'Z', type: 'linear', axis: [0, 0, 1], limits: [-400, 0] }
      ],
      tcp: { x: 0, y: 0, z: -100 },  // Tool center point offset
      forward: function(joints) {
        return {
          x: joints.X || 0,
          y: joints.Y || 0,
          z: joints.Z || 0,
          a: 0, b: 0, c: 0
        };
      },
      inverse: function(pose) {
        return {
          X: pose.x,
          Y: pose.y,
          Z: pose.z
        };
      }
    },
    // 5-axis VMC with trunnion table (A/C configuration)
    vmc_5axis_ac: {
      type: 'vmc_5axis_ac',
      axes: ['X', 'Y', 'Z', 'A', 'C'],
      joints: [
        { name: 'X', type: 'linear', axis: [1, 0, 0], limits: [-500, 500] },
        { name: 'Y', type: 'linear', axis: [0, 1, 0], limits: [-300, 300] },
        { name: 'Z', type: 'linear', axis: [0, 0, 1], limits: [-400, 0] },
        { name: 'A', type: 'rotary', axis: [1, 0, 0], limits: [-30, 120] },
        { name: 'C', type: 'rotary', axis: [0, 0, 1], limits: [-360, 360] }
      ],
      pivotPoint: { x: 0, y: 0, z: -50 },  // Table rotation center
      tcp: { x: 0, y: 0, z: -100 },

      forward: function(joints) {
        const X = joints.X || 0;
        const Y = joints.Y || 0;
        const Z = joints.Z || 0;
        const A = (joints.A || 0) * Math.PI / 180;
        const C = (joints.C || 0) * Math.PI / 180;

        // Tool position in machine coordinates
        // For table-table config, the tool stays fixed, workpiece rotates
        const cosA = Math.cos(A);
        const sinA = Math.sin(A);
        const cosC = Math.cos(C);
        const sinC = Math.sin(C);

        // Rotation matrix for A (around X) then C (around Z)
        const toolVec = { x: 0, y: 0, z: -1 };  // Tool points down

        // Rotate tool vector
        const tx = toolVec.x;
        const ty = toolVec.y * cosA - toolVec.z * sinA;
        const tz = toolVec.y * sinA + toolVec.z * cosA;

        const rx = tx * cosC - ty * sinC;
        const ry = tx * sinC + ty * cosC;
        const rz = tz;

        return {
          x: X,
          y: Y,
          z: Z,
          i: rx,  // Tool axis direction
          j: ry,
          k: rz,
          a: joints.A || 0,
          c: joints.C || 0
        };
      },
      inverse: function(pose, toolAxis) {
        // Given desired position (x,y,z) and tool axis (i,j,k),
        // calculate required joint positions
        const i = toolAxis?.i || 0;
        const j = toolAxis?.j || 0;
        const k = toolAxis?.k || -1;

        // Calculate A angle (tilt from vertical)
        const A_rad = Math.acos(-k);  // k = -cos(A)
        const A = A_rad * 180 / Math.PI;

        // Calculate C angle (rotation around Z)
        let C = Math.atan2(j, i) * 180 / Math.PI;
        if (Math.abs(A) < 0.001) {
          C = 0;  // Avoid singularity at A=0
        }
        // Apply pivot point compensation
        const pivot = this.pivotPoint;
        const cosA = Math.cos(A_rad);
        const sinA = Math.sin(A_rad);
        const cosC = Math.cos(C * Math.PI / 180);
        const sinC = Math.sin(C * Math.PI / 180);

        // Inverse rotation to get machine XYZ
        const px = pose.x - pivot.x;
        const py = pose.y - pivot.y;
        const pz = pose.z - pivot.z;

        // Reverse C rotation
        const x1 = px * cosC + py * sinC;
        const y1 = -px * sinC + py * cosC;
        const z1 = pz;

        // Reverse A rotation
        const X = x1 + pivot.x;
        const Y = y1 * cosA + z1 * sinA + pivot.y;
        const Z = -y1 * sinA + z1 * cosA + pivot.z;

        return { X, Y, Z, A, C };
      }
    },
    // 5-axis VMC with head-head (B/C configuration)
    vmc_5axis_bc: {
      type: 'vmc_5axis_bc',
      axes: ['X', 'Y', 'Z', 'B', 'C'],
      joints: [
        { name: 'X', type: 'linear', axis: [1, 0, 0], limits: [-500, 500] },
        { name: 'Y', type: 'linear', axis: [0, 1, 0], limits: [-300, 300] },
        { name: 'Z', type: 'linear', axis: [0, 0, 1], limits: [-400, 0] },
        { name: 'B', type: 'rotary', axis: [0, 1, 0], limits: [-120, 30] },
        { name: 'C', type: 'rotary', axis: [0, 0, 1], limits: [-360, 360] }
      ],
      headPivot: { x: 0, y: 0, z: 0 },
      tcp: { x: 0, y: 0, z: -150 },

      forward: function(joints) {
        const X = joints.X || 0;
        const Y = joints.Y || 0;
        const Z = joints.Z || 0;
        const B = (joints.B || 0) * Math.PI / 180;
        const C = (joints.C || 0) * Math.PI / 180;

        const cosB = Math.cos(B);
        const sinB = Math.sin(B);
        const cosC = Math.cos(C);
        const sinC = Math.sin(C);

        // Tool axis after B then C rotation
        // Start with tool pointing -Z
        const toolVec = { x: 0, y: 0, z: -1 };

        // Rotate around Y (B axis)
        const bx = toolVec.x * cosB + toolVec.z * sinB;
        const by = toolVec.y;
        const bz = -toolVec.x * sinB + toolVec.z * cosB;

        // Rotate around Z (C axis)
        const cx = bx * cosC - by * sinC;
        const cy = bx * sinC + by * cosC;
        const cz = bz;

        // TCP offset compensation
        const tcpLen = this.tcp.z;
        const tcpX = X + tcpLen * cx;
        const tcpY = Y + tcpLen * cy;
        const tcpZ = Z + tcpLen * cz;

        return {
          x: tcpX,
          y: tcpY,
          z: tcpZ,
          i: cx,
          j: cy,
          k: cz,
          b: joints.B || 0,
          c: joints.C || 0
        };
      },
      inverse: function(pose, toolAxis) {
        const i = toolAxis?.i || 0;
        const j = toolAxis?.j || 0;
        const k = toolAxis?.k || -1;

        // Calculate B angle
        const B_rad = Math.asin(-i);  // B rotates around Y
        const B = B_rad * 180 / Math.PI;

        // Calculate C angle
        let C = Math.atan2(j, -k / Math.cos(B_rad)) * 180 / Math.PI;

        // Compensate for TCP
        const tcpLen = Math.abs(this.tcp.z);
        const X = pose.x - tcpLen * i;
        const Y = pose.y - tcpLen * j;
        const Z = pose.z - tcpLen * k;

        return { X, Y, Z, B, C };
      }
    },
    // Turn-Mill with B-axis
    turnmill_bc: {
      type: 'turnmill_bc',
      axes: ['X', 'Y', 'Z', 'C', 'B'],
      joints: [
        { name: 'X', type: 'linear', axis: [0, 1, 0], limits: [-200, 300] },  // Cross-slide
        { name: 'Y', type: 'linear', axis: [0, 0, 1], limits: [-100, 100] },  // Y-axis (if equipped)
        { name: 'Z', type: 'linear', axis: [1, 0, 0], limits: [-50, 1000] },  // Longitudinal
        { name: 'C', type: 'rotary', axis: [1, 0, 0], limits: [0, 360] },    // Main spindle
        { name: 'B', type: 'rotary', axis: [0, 0, 1], limits: [-120, 30] }   // B-axis mill head
      ],
      spindleCenter: { x: 0, y: 0, z: 0 },

      forward: function(joints) {
        const X = joints.X || 0;
        const Y = joints.Y || 0;
        const Z = joints.Z || 0;
        const C = (joints.C || 0) * Math.PI / 180;
        const B = (joints.B || 0) * Math.PI / 180;

        return {
          x: Z,  // Z is along spindle axis
          y: X * Math.cos(C) - Y * Math.sin(C),
          z: X * Math.sin(C) + Y * Math.cos(C),
          c: joints.C || 0,
          b: joints.B || 0
        };
      },
      inverse: function(pose, options = {}) {
        const C = options.cAngle || 0;
        const B = options.bAngle || 0;

        const C_rad = C * Math.PI / 180;

        const Z = pose.x;
        const X = pose.y * Math.cos(-C_rad) - pose.z * Math.sin(-C_rad);
        const Y = pose.y * Math.sin(-C_rad) + pose.z * Math.cos(-C_rad);

        return { X, Y, Z, C, B };
      }
    }
  },
  // KINEMATIC OPERATIONS

  /**
   * Get kinematic model by type
   */
  getModel(type) {
    return this.models[type] || this.models.vmc_3axis;
  },
  /**
   * Forward kinematics - joint positions to TCP pose
   */
  forward(modelType, joints) {
    const model = this.getModel(modelType);
    return model.forward(joints);
  },
  /**
   * Inverse kinematics - TCP pose to joint positions
   */
  inverse(modelType, pose, toolAxis, options = {}) {
    const model = this.getModel(modelType);
    const joints = model.inverse(pose, toolAxis, options);

    // Check joint limits
    if (!options.ignoreLimit) {
      const limited = this.checkLimits(model, joints);
      if (limited.violations.length > 0) {
        joints._limitViolations = limited.violations;
      }
    }
    return joints;
  },
  /**
   * Check if joint positions are within limits
   */
  checkLimits(model, joints) {
    const violations = [];

    for (const joint of model.joints) {
      const value = joints[joint.name];
      if (value !== undefined) {
        if (value < joint.limits[0]) {
          violations.push({
            joint: joint.name,
            value,
            min: joint.limits[0],
            type: 'below_min'
          });
        }
        if (value > joint.limits[1]) {
          violations.push({
            joint: joint.name,
            value,
            max: joint.limits[1],
            type: 'above_max'
          });
        }
      }
    }
    return {
      valid: violations.length === 0,
      violations
    };
  },
  /**
   * Calculate tool axis vector from rotary angles
   */
  getToolAxis(modelType, rotaryAngles) {
    const model = this.getModel(modelType);

    // Default: tool points down (-Z)
    let i = 0, j = 0, k = -1;

    if (modelType === 'vmc_5axis_ac') {
      const A = (rotaryAngles.A || 0) * Math.PI / 180;
      const C = (rotaryAngles.C || 0) * Math.PI / 180;

      const cosA = Math.cos(A);
      const sinA = Math.sin(A);
      const cosC = Math.cos(C);
      const sinC = Math.sin(C);

      // Rotate -Z through A then C
      i = sinA * sinC;
      j = -sinA * cosC;
      k = -cosA;
    } else if (modelType === 'vmc_5axis_bc') {
      const B = (rotaryAngles.B || 0) * Math.PI / 180;
      const C = (rotaryAngles.C || 0) * Math.PI / 180;

      const cosB = Math.cos(B);
      const sinB = Math.sin(B);
      const cosC = Math.cos(C);
      const sinC = Math.sin(C);

      i = sinB * cosC;
      j = sinB * sinC;
      k = -cosB;
    }
    return { i, j, k };
  },
  /**
   * Calculate rotary angles from tool axis vector
   */
  getRotaryAngles(modelType, toolAxis) {
    const i = toolAxis.i || 0;
    const j = toolAxis.j || 0;
    const k = toolAxis.k || -1;

    if (modelType === 'vmc_5axis_ac') {
      const A = Math.acos(-k) * 180 / Math.PI;
      let C = Math.atan2(-j, i) * 180 / Math.PI;
      if (Math.abs(A) < 0.01) C = 0;
      return { A, C };
    } else if (modelType === 'vmc_5axis_bc') {
      const xyLen = Math.sqrt(i * i + j * j);
      const B = Math.atan2(xyLen, -k) * 180 / Math.PI;
      let C = Math.atan2(j, i) * 180 / Math.PI;
      if (xyLen < 0.001) C = 0;
      return { B, C };
    }
    return {};
  },
  // TOOLPATH TRANSFORMATION

  /**
   * Transform a 3-axis toolpath to 5-axis with specified tool orientation
   */
  transform3to5(toolpath, modelType, toolAxis) {
    const result = [];

    for (const move of toolpath) {
      const pose = { x: move.x, y: move.y, z: move.z };
      const joints = this.inverse(modelType, pose, toolAxis);

      result.push({
        ...move,
        X: joints.X,
        Y: joints.Y,
        Z: joints.Z,
        A: joints.A,
        B: joints.B,
        C: joints.C,
        _original: { x: move.x, y: move.y, z: move.z }
      });
    }
    return result;
  },
  /**
   * Linearize rotary motion for smooth 5-axis moves
   */
  linearize5Axis(move, modelType, divisions = 10) {
    const result = [];

    const startJoints = move.startJoints;
    const endJoints = move.endJoints;

    for (let i = 0; i <= divisions; i++) {
      const t = i / divisions;

      // Interpolate joints
      const joints = {};
      for (const axis of ['X', 'Y', 'Z', 'A', 'B', 'C']) {
        if (startJoints[axis] !== undefined && endJoints[axis] !== undefined) {
          joints[axis] = startJoints[axis] + (endJoints[axis] - startJoints[axis]) * t;
        }
      }
      // Forward kinematics to get TCP position
      const pose = this.forward(modelType, joints);

      result.push({
        x: pose.x,
        y: pose.y,
        z: pose.z,
        joints: { ...joints },
        t
      });
    }
    return result;
  },
  // SINGULARITY DETECTION

  /**
   * Check for kinematic singularities
   */
  checkSingularity(modelType, joints) {
    const warnings = [];

    if (modelType === 'vmc_5axis_ac') {
      // Singularity at A = 0 (gimbal lock)
      if (Math.abs(joints.A) < 0.1) {
        warnings.push({
          type: 'gimbal_lock',
          axis: 'A',
          message: 'Near singularity at A=0°, C-axis behavior undefined'
        });
      }
    }
    if (modelType === 'vmc_5axis_bc') {
      // Singularity at B = 0
      if (Math.abs(joints.B) < 0.1) {
        warnings.push({
          type: 'gimbal_lock',
          axis: 'B',
          message: 'Near singularity at B=0°, C-axis behavior undefined'
        });
      }
    }
    return {
      hasSingularity: warnings.length > 0,
      warnings
    };
  },
  // RTCP (Rotary Tool Center Point) COMPENSATION

  /**
   * Apply RTCP compensation for 5-axis machining
   */
  applyRTCP(modelType, move, toolLength) {
    const model = this.getModel(modelType);

    // Get tool axis at current rotary position
    const rotary = {};
    if (move.A !== undefined) rotary.A = move.A;
    if (move.B !== undefined) rotary.B = move.B;
    if (move.C !== undefined) rotary.C = move.C;

    const toolAxis = this.getToolAxis(modelType, rotary);

    // Offset TCP by tool length along tool axis
    return {
      X: move.X - toolAxis.i * toolLength,
      Y: move.Y - toolAxis.j * toolLength,
      Z: move.Z - toolAxis.k * toolLength,
      A: move.A,
      B: move.B,
      C: move.C
    };
  },
  /**
   * Remove RTCP compensation (for verification)
   */
  removeRTCP(modelType, move, toolLength) {
    const rotary = {};
    if (move.A !== undefined) rotary.A = move.A;
    if (move.B !== undefined) rotary.B = move.B;
    if (move.C !== undefined) rotary.C = move.C;

    const toolAxis = this.getToolAxis(modelType, rotary);

    return {
      X: move.X + toolAxis.i * toolLength,
      Y: move.Y + toolAxis.j * toolLength,
      Z: move.Z + toolAxis.k * toolLength,
      A: move.A,
      B: move.B,
      C: move.C
    };
  },
  // INITIALIZATION

  init() {
    console.log('[KINEMATIC_SOLVER] Initializing...');

    // Connect to collision system
    if (typeof ADVANCED_COLLISION_KINEMATICS_ENGINE !== 'undefined') {
      ADVANCED_COLLISION_KINEMATICS_ENGINE.solver = this;
      console.log('[KINEMATIC_SOLVER] ✓ Connected to ADVANCED_COLLISION_KINEMATICS_ENGINE');
    }
    // Connect to 5-axis engine
    if (typeof FIVE_AXIS_FEATURE_ENGINE !== 'undefined') {
      FIVE_AXIS_FEATURE_ENGINE.kinematics = this;
      console.log('[KINEMATIC_SOLVER] ✓ Connected to FIVE_AXIS_FEATURE_ENGINE');
    }
    // Connect to machine database
    if (typeof MACHINE_DATABASE !== 'undefined') {
      MACHINE_DATABASE.getKinematics = (machineId) => {
        const machine = MACHINE_DATABASE[machineId];
        if (!machine) return null;

        const type = machine.axes?.rotary?.length === 2
          ? (machine.axes.rotary.includes('A') ? 'vmc_5axis_ac' : 'vmc_5axis_bc')
          : (machine.type === 'turn_mill' ? 'turnmill_bc' : 'vmc_3axis');

        return this.getModel(type);
      };
      console.log('[KINEMATIC_SOLVER] ✓ Connected to MACHINE_DATABASE');
    }
    // Global access
    window.PRISM_KINEMATIC_SOLVER = this;
    window.solveKinematics = (model, pose, axis) => this.inverse(model, pose, axis);

    console.log('[KINEMATIC_SOLVER] ✓ Initialized');
    console.log('[KINEMATIC_SOLVER]   - Models: vmc_3axis, vmc_5axis_ac, vmc_5axis_bc, turnmill_bc');
    console.log('[KINEMATIC_SOLVER]   - Features: forward/inverse, RTCP, singularity detection');

    return this;
  }
}