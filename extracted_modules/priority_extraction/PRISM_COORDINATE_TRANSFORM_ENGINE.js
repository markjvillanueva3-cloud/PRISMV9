const PRISM_COORDINATE_TRANSFORM_ENGINE = {
  version: '1.0.0',

  // G-CODE COORDINATE ROTATION (G68/G69)

  coordinateRotation: {
    standard: {
      activate: 'G68',
      cancel: 'G69',
      format: 'G68 Xorigin Yorigin Rangle',
      description: 'Rotates coordinate system around specified point'
    },
    // Controller-specific variations
    controllers: {
      fanuc: {
        activate: 'G68',
        cancel: 'G69',
        example: 'G68 X0 Y0 R45.0 (Rotate 45° around X0Y0)'
      },
      haas: {
        activate: 'G68',
        cancel: 'G69',
        note: 'Requires setting 56 = MUST BE ZERO for proper operation'
      },
      siemens: {
        activate: 'ROT RPL=angle or AROT RPL=angle',
        cancel: 'ROT',
        example: 'ROT RPL=45 (Rotate 45°)'
      },
      mazak: {
        activate: 'G68',
        cancel: 'G69',
        example: 'G68 X0. Y0. R45.'
      },
      okuma: {
        activate: 'G68',
        cancel: 'G69',
        note: 'Use VATEFST for variable angle'
      }
    }
  },
  generateRotation(params) {
    const {
      controller = 'fanuc',
      originX = 0,
      originY = 0,
      angle,
      incremental = false
    } = params;

    const ctrl = this.coordinateRotation.controllers[controller] || this.coordinateRotation.controllers.fanuc;

    if (controller === 'siemens') {
      return incremental
        ? `AROT RPL=${angle.toFixed(3)}`
        : `ROT RPL=${angle.toFixed(3)}`;
    }
    return `${ctrl.activate} X${originX.toFixed(4)} Y${originY.toFixed(4)} R${angle.toFixed(3)}`;
  },
  // COORDINATE SCALING (G50/G51)

  coordinateScaling: {
    standard: {
      activate: 'G51',
      cancel: 'G50',
      format: 'G51 Xcenter Ycenter Zcenter Pscale or Ixscale Jyscale Kzscale'
    },
    controllers: {
      fanuc: {
        activate: 'G51',
        cancel: 'G50',
        uniform: 'G51 X0 Y0 Z0 P1.5 (Scale 150% around origin)',
        nonUniform: 'G51 X0 Y0 Z0 I1.5 J1.0 K1.0 (Scale X 150%, Y/Z 100%)'
      },
      haas: {
        activate: 'G51',
        cancel: 'G50',
        note: 'Setting 71 controls scaling behavior'
      },
      siemens: {
        activate: 'SCALE or ASCALE',
        cancel: 'SCALE',
        example: 'SCALE X1.5 Y1.5 Z1.5'
      }
    }
  },
  generateScaling(params) {
    const {
      controller = 'fanuc',
      centerX = 0,
      centerY = 0,
      centerZ = 0,
      scaleX = 1.0,
      scaleY = 1.0,
      scaleZ = 1.0
    } = params;

    if (controller === 'siemens') {
      return `SCALE X${scaleX.toFixed(4)} Y${scaleY.toFixed(4)} Z${scaleZ.toFixed(4)}`;
    }
    if (scaleX === scaleY && scaleY === scaleZ) {
      return `G51 X${centerX.toFixed(4)} Y${centerY.toFixed(4)} Z${centerZ.toFixed(4)} P${scaleX.toFixed(4)}`;
    }
    return `G51 X${centerX.toFixed(4)} Y${centerY.toFixed(4)} Z${centerZ.toFixed(4)} I${scaleX.toFixed(4)} J${scaleY.toFixed(4)} K${scaleZ.toFixed(4)}`;
  },
  // COORDINATE MIRRORING (G50.1/G51.1)

  coordinateMirroring: {
    controllers: {
      fanuc: {
        activateX: 'G51.1 X0 (Mirror around X=0)',
        activateY: 'G51.1 Y0 (Mirror around Y=0)',
        cancel: 'G50.1'
      },
      haas: {
        method: 'Use G101 (Mirror X) or parameter settings',
        example: 'G101 (Mirror X axis)'
      },
      siemens: {
        activate: 'MIRROR',
        example: 'MIRROR X0 (Mirror around X=0)'
      }
    }
  },
  // WORK COORDINATE OFFSET (G54-G59, G54.1)

  workOffsets: {
    standard: ['G54', 'G55', 'G56', 'G57', 'G58', 'G59'],
    extended: {
      fanuc: 'G54.1 P1 through G54.1 P300',
      haas: 'G54.1 P1 through G54.1 P99',
      okuma: 'G15 H1 through G15 H300'
    },
    common: {
      G54: { name: 'Work Offset 1', typical: 'Primary fixture' },
      G55: { name: 'Work Offset 2', typical: 'Secondary fixture' },
      G56: { name: 'Work Offset 3', typical: 'Op 2 setup' },
      G57: { name: 'Work Offset 4', typical: 'Pallet 2' },
      G58: { name: 'Work Offset 5', typical: 'Probing origin' },
      G59: { name: 'Work Offset 6', typical: 'Tool setting' }
    }
  },
  // TRANSFORMATION MATRIX OPERATIONS

  createTransformMatrix(operations) {
    // Initialize identity matrix
    let matrix = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ];

    for (const op of operations) {
      matrix = this._multiplyMatrix(matrix, this._getOperationMatrix(op));
    }
    return matrix;
  },
  _getOperationMatrix(op) {
    switch (op.type) {
      case 'rotate':
        return this._rotationMatrix(op.axis, op.angle * Math.PI / 180);
      case 'scale':
        return this._scaleMatrix(op.x || 1, op.y || 1, op.z || 1);
      case 'translate':
        return this._translateMatrix(op.x || 0, op.y || 0, op.z || 0);
      case 'mirror':
        return this._mirrorMatrix(op.axis);
      default:
        return this._identityMatrix();
    }
  },
  _rotationMatrix(axis, radians) {
    const c = Math.cos(radians);
    const s = Math.sin(radians);

    switch (axis) {
      case 'z':
        return [[c, -s, 0, 0], [s, c, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
      case 'x':
        return [[1, 0, 0, 0], [0, c, -s, 0], [0, s, c, 0], [0, 0, 0, 1]];
      case 'y':
        return [[c, 0, s, 0], [0, 1, 0, 0], [-s, 0, c, 0], [0, 0, 0, 1]];
    }
    return this._identityMatrix();
  },
  _scaleMatrix(sx, sy, sz) {
    return [[sx, 0, 0, 0], [0, sy, 0, 0], [0, 0, sz, 0], [0, 0, 0, 1]];
  },
  _translateMatrix(tx, ty, tz) {
    return [[1, 0, 0, tx], [0, 1, 0, ty], [0, 0, 1, tz], [0, 0, 0, 1]];
  },
  _mirrorMatrix(axis) {
    switch (axis) {
      case 'x': return [[-1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
      case 'y': return [[1, 0, 0, 0], [0, -1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
      case 'z': return [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, -1, 0], [0, 0, 0, 1]];
    }
    return this._identityMatrix();
  },
  _identityMatrix() {
    return [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
  },
  _multiplyMatrix(a, b) {
    const result = [];
    for (let i = 0; i < 4; i++) {
      result[i] = [];
      for (let j = 0; j < 4; j++) {
        result[i][j] = 0;
        for (let k = 0; k < 4; k++) {
          result[i][j] += a[i][k] * b[k][j];
        }
      }
    }
    return result;
  },
  transformPoint(point, matrix) {
    const [x, y, z] = point;
    return [
      matrix[0][0] * x + matrix[0][1] * y + matrix[0][2] * z + matrix[0][3],
      matrix[1][0] * x + matrix[1][1] * y + matrix[1][2] * z + matrix[1][3],
      matrix[2][0] * x + matrix[2][1] * y + matrix[2][2] * z + matrix[2][3]
    ];
  }
}