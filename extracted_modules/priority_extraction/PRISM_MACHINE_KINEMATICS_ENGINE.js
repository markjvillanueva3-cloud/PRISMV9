const PRISM_MACHINE_KINEMATICS_ENGINE = {
  version: '1.0.0',
  name: 'PRISM Machine Kinematics Engine',

  config: {
    defaultMachineType: 'head_table', // head_table, table_table, head_head
    defaultWorkEnvelope: {
      x: { min: -500, max: 500 },
      y: { min: -500, max: 500 },
      z: { min: -500, max: 100 }
    }
  },
  // MACHINE CONFIGURATIONS

  machineConfigurations: {
    // Head-Table (BC) - Most common 5-axis configuration
    head_table_BC: {
      name: 'Head-Table BC Configuration',
      type: 'head_table',
      primaryRotary: { axis: 'B', location: 'head', range: [-120, 120] },
      secondaryRotary: { axis: 'C', location: 'table', range: [-360, 360] },
      order: 'XYZBC',
      tcp: true
    },
    // Head-Table (AC)
    head_table_AC: {
      name: 'Head-Table AC Configuration',
      type: 'head_table',
      primaryRotary: { axis: 'A', location: 'head', range: [-120, 120] },
      secondaryRotary: { axis: 'C', location: 'table', range: [-360, 360] },
      order: 'XYZAC',
      tcp: true
    },
    // Table-Table (AC) - Trunnion style
    table_table_AC: {
      name: 'Table-Table AC Trunnion',
      type: 'table_table',
      primaryRotary: { axis: 'A', location: 'table', range: [-120, 30] },
      secondaryRotary: { axis: 'C', location: 'table', range: [-360, 360] },
      order: 'XYZAC',
      tcp: false
    },
    // Table-Table (BC) - Tilting rotary
    table_table_BC: {
      name: 'Table-Table BC Tilting Rotary',
      type: 'table_table',
      primaryRotary: { axis: 'B', location: 'table', range: [-120, 120] },
      secondaryRotary: { axis: 'C', location: 'table', range: [-360, 360] },
      order: 'XYZBC',
      tcp: false
    },
    // Head-Head (AB) - Fork head
    head_head_AB: {
      name: 'Head-Head AB Fork Head',
      type: 'head_head',
      primaryRotary: { axis: 'A', location: 'head', range: [-110, 110] },
      secondaryRotary: { axis: 'B', location: 'head', range: [-360, 360] },
      order: 'XYZAB',
      tcp: true
    }
  },
  state: {
    currentConfig: null,
    currentPosition: { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 },
    workOffset: { x: 0, y: 0, z: 0 },
    pivotPoint: { x: 0, y: 0, z: 0 },
    tcpEnabled: true
  },
  // INITIALIZATION

  setMachineConfiguration(configName) {
    const config = this.machineConfigurations[configName];
    if (!config) {
      console.error(`[PRISM-KINEMATICS] Unknown configuration: ${configName}`);
      return false;
    }
    this.state.currentConfig = config;
    return true;
  },
  setCustomConfiguration(config) {
    this.state.currentConfig = config;
    return true;
  },
  setWorkOffset(x, y, z) {
    this.state.workOffset = { x, y, z };
    return true;
  },
  setPivotPoint(x, y, z) {
    this.state.pivotPoint = { x, y, z };
    return true;
  },
  // FORWARD KINEMATICS

  // Given machine coordinates, compute tool tip position
  forwardKinematics(machinePos) {
    const config = this.state.currentConfig;
    if (!config) {
      return { error: 'No machine configuration set' };
    }
    let { x, y, z, a = 0, b = 0, c = 0 } = machinePos;

    // Convert degrees to radians
    const aRad = a * Math.PI / 180;
    const bRad = b * Math.PI / 180;
    const cRad = c * Math.PI / 180;

    // Get rotation matrices based on configuration
    const rotations = this._getRotationMatrices(config, aRad, bRad, cRad);

    // Apply transformations based on machine type
    let toolTip = { x, y, z };
    let toolVector = { x: 0, y: 0, z: 1 }; // Tool axis pointing up (Z+)

    if (config.type === 'head_table') {
      // Table rotation affects workpiece
      // Head rotation affects tool orientation
      toolTip = this._applyTableRotation(toolTip, rotations.table, this.state.pivotPoint);
      toolVector = this._applyHeadRotation(toolVector, rotations.head);
    } else if (config.type === 'table_table') {
      // Both rotations affect workpiece position
      toolTip = this._applyTableRotation(toolTip, rotations.primary, this.state.pivotPoint);
      toolTip = this._applyTableRotation(toolTip, rotations.secondary, this.state.pivotPoint);
    } else if (config.type === 'head_head') {
      // Both rotations affect tool orientation
      toolVector = this._applyHeadRotation(toolVector, rotations.primary);
      toolVector = this._applyHeadRotation(toolVector, rotations.secondary);
    }
    return {
      position: toolTip,
      toolVector: toolVector,
      machinePosition: { x, y, z, a, b, c }
    };
  },
  // INVERSE KINEMATICS

  // Given desired tool tip position and orientation, compute machine coordinates
  inverseKinematics(desiredPosition, desiredToolVector) {
    const config = this.state.currentConfig;
    if (!config) {
      return { error: 'No machine configuration set' };
    }
    const { x, y, z } = desiredPosition;
    const { i, j, k } = desiredToolVector; // Unit vector

    // Calculate rotary axis values from tool vector
    let a = 0, b = 0, c = 0;

    // The approach depends on machine configuration
    if (config.primaryRotary.axis === 'B' && config.secondaryRotary.axis === 'C') {
      // BC configuration
      // C = atan2(i, j)
      // B = atan2(sqrt(i² + j²), k)
      c = Math.atan2(i, j) * 180 / Math.PI;
      b = Math.atan2(Math.sqrt(i * i + j * j), k) * 180 / Math.PI;
    } else if (config.primaryRotary.axis === 'A' && config.secondaryRotary.axis === 'C') {
      // AC configuration
      // C = atan2(i, j)
      // A = atan2(-sqrt(i² + j²), k) OR based on specific config
      c = Math.atan2(i, j) * 180 / Math.PI;
      a = Math.atan2(-Math.sqrt(i * i + j * j) * Math.sign(j), k) * 180 / Math.PI;
    }
    // Check limits
    const solution = { x, y, z, a, b, c };
    const limited = this._applyLimits(solution);

    // For TCP, we need to compensate the linear axes
    if (config.tcp && this.state.tcpEnabled) {
      const compensated = this._applyTCPCompensation(limited, desiredPosition);
      return {
        solution: compensated,
        withinLimits: limited.withinLimits,
        warnings: limited.warnings
      };
    }
    return {
      solution: limited.position,
      withinLimits: limited.withinLimits,
      warnings: limited.warnings
    };
  },
  // HELPER METHODS

  _getRotationMatrices(config, aRad, bRad, cRad) {
    const matrices = {};

    // Rotation matrix for A axis (rotation around X)
    const rotA = [
      [1, 0, 0],
      [0, Math.cos(aRad), -Math.sin(aRad)],
      [0, Math.sin(aRad), Math.cos(aRad)]
    ];

    // Rotation matrix for B axis (rotation around Y)
    const rotB = [
      [Math.cos(bRad), 0, Math.sin(bRad)],
      [0, 1, 0],
      [-Math.sin(bRad), 0, Math.cos(bRad)]
    ];

    // Rotation matrix for C axis (rotation around Z)
    const rotC = [
      [Math.cos(cRad), -Math.sin(cRad), 0],
      [Math.sin(cRad), Math.cos(cRad), 0],
      [0, 0, 1]
    ];

    // Assign based on configuration
    if (config.primaryRotary.axis === 'A') matrices.primary = rotA;
    if (config.primaryRotary.axis === 'B') matrices.primary = rotB;
    if (config.primaryRotary.axis === 'C') matrices.primary = rotC;

    if (config.secondaryRotary.axis === 'A') matrices.secondary = rotA;
    if (config.secondaryRotary.axis === 'B') matrices.secondary = rotB;
    if (config.secondaryRotary.axis === 'C') matrices.secondary = rotC;

    // Head and table assignments
    if (config.type === 'head_table') {
      matrices.head = config.primaryRotary.location === 'head' ? matrices.primary : matrices.secondary;
      matrices.table = config.primaryRotary.location === 'table' ? matrices.primary : matrices.secondary;
    }
    return matrices;
  },
  _applyTableRotation(point, matrix, pivot) {
    // Translate to pivot, rotate, translate back
    const translated = {
      x: point.x - pivot.x,
      y: point.y - pivot.y,
      z: point.z - pivot.z
    };
    const rotated = this._multiplyMatrixVector(matrix, translated);

    return {
      x: rotated.x + pivot.x,
      y: rotated.y + pivot.y,
      z: rotated.z + pivot.z
    };
  },
  _applyHeadRotation(vector, matrix) {
    return this._multiplyMatrixVector(matrix, vector);
  },
  _multiplyMatrixVector(matrix, vec) {
    return {
      x: matrix[0][0] * vec.x + matrix[0][1] * vec.y + matrix[0][2] * vec.z,
      y: matrix[1][0] * vec.x + matrix[1][1] * vec.y + matrix[1][2] * vec.z,
      z: matrix[2][0] * vec.x + matrix[2][1] * vec.y + matrix[2][2] * vec.z
    };
  },
  _applyLimits(position) {
    const config = this.state.currentConfig;
    const warnings = [];
    let withinLimits = true;

    const result = { ...position };

    // Check A axis
    if (config.primaryRotary.axis === 'A' || config.secondaryRotary.axis === 'A') {
      const limits = config.primaryRotary.axis === 'A' ?
        config.primaryRotary.range : config.secondaryRotary.range;

      if (result.a < limits[0]) {
        warnings.push(`A axis below minimum (${result.a.toFixed(2)} < ${limits[0]})`);
        result.a = limits[0];
        withinLimits = false;
      } else if (result.a > limits[1]) {
        warnings.push(`A axis above maximum (${result.a.toFixed(2)} > ${limits[1]})`);
        result.a = limits[1];
        withinLimits = false;
      }
    }
    // Check B axis
    if (config.primaryRotary.axis === 'B' || config.secondaryRotary.axis === 'B') {
      const limits = config.primaryRotary.axis === 'B' ?
        config.primaryRotary.range : config.secondaryRotary.range;

      if (result.b < limits[0]) {
        warnings.push(`B axis below minimum (${result.b.toFixed(2)} < ${limits[0]})`);
        result.b = limits[0];
        withinLimits = false;
      } else if (result.b > limits[1]) {
        warnings.push(`B axis above maximum (${result.b.toFixed(2)} > ${limits[1]})`);
        result.b = limits[1];
        withinLimits = false;
      }
    }
    // Check C axis
    if (config.primaryRotary.axis === 'C' || config.secondaryRotary.axis === 'C') {
      const limits = config.primaryRotary.axis === 'C' ?
        config.primaryRotary.range : config.secondaryRotary.range;

      // C axis often has infinite rotation capability
      if (limits[0] !== -360 || limits[1] !== 360) {
        if (result.c < limits[0]) {
          warnings.push(`C axis below minimum (${result.c.toFixed(2)} < ${limits[0]})`);
          result.c = limits[0];
          withinLimits = false;
        } else if (result.c > limits[1]) {
          warnings.push(`C axis above maximum (${result.c.toFixed(2)} > ${limits[1]})`);
          result.c = limits[1];
          withinLimits = false;
        }
      }
    }
    return { position: result, withinLimits, warnings };
  },
  _applyTCPCompensation(limitedResult, desiredPosition) {
    // Tool Center Point compensation
    // Adjusts linear axes to maintain tool tip at desired position when rotary axes change
    const config = this.state.currentConfig;

    // Get the rotation that was applied
    const aRad = (limitedResult.position.a || 0) * Math.PI / 180;
    const bRad = (limitedResult.position.b || 0) * Math.PI / 180;
    const cRad = (limitedResult.position.c || 0) * Math.PI / 180;

    // Calculate compensation (simplified)
    const pivot = this.state.pivotPoint;

    // The compensation depends on tool length and rotation center
    // This is a simplified version - real TCP is more complex

    return {
      ...limitedResult.position,
      x: desiredPosition.x,
      y: desiredPosition.y,
      z: desiredPosition.z
    };
  },
  // VISUALIZATION SUPPORT

  getMachineModel() {
    // Returns data structure for 3D visualization
    const config = this.state.currentConfig;
    if (!config) return null;

    return {
      configuration: config,
      components: {
        base: { type: 'box', size: { x: 800, y: 600, z: 100 } },
        column: { type: 'box', size: { x: 200, y: 200, z: 800 } },
        spindle: { type: 'cylinder', radius: 100, height: 400 },
        table: { type: 'cylinder', radius: 250, height: 50 },
        rotaryA: config.primaryRotary.axis === 'A' ? { type: 'rotary', axis: 'X' } : null,
        rotaryB: config.primaryRotary.axis === 'B' || config.secondaryRotary.axis === 'B' ?
          { type: 'rotary', axis: 'Y' } : null,
        rotaryC: config.secondaryRotary.axis === 'C' ? { type: 'rotary', axis: 'Z' } : null
      },
      currentPosition: this.state.currentPosition
    };
  },
  animateTo(targetPosition, duration = 1000) {
    const startPosition = { ...this.state.currentPosition };
    const startTime = Date.now();

    return new Promise((resolve) => {
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);

        // Ease function
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        // Interpolate
        this.state.currentPosition = {
          x: startPosition.x + (targetPosition.x - startPosition.x) * ease,
          y: startPosition.y + (targetPosition.y - startPosition.y) * ease,
          z: startPosition.z + (targetPosition.z - startPosition.z) * ease,
          a: startPosition.a + (targetPosition.a - startPosition.a) * ease,
          b: startPosition.b + (targetPosition.b - startPosition.b) * ease,
          c: startPosition.c + (targetPosition.c - startPosition.c) * ease
        };
        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve(this.state.currentPosition);
        }
      };
      animate();
    });
  }
}