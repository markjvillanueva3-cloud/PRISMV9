const PRISM_UNIVERSAL_VALIDATOR = {
  version: '1.0.0',

  /**
   * Validate ANY output before it goes to machine
   */
  validate(output, context = {}) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };
    // Check for required fields
    this._checkRequired(output, result);

    // Check parameter ranges
    this._checkRanges(output, context, result);

    // Check for dangerous conditions
    this._checkSafety(output, context, result);

    // Check machine compatibility
    this._checkMachineCompat(output, context, result);

    // Check tool compatibility
    this._checkToolCompat(output, context, result);

    result.valid = result.errors.length === 0;

    return result;
  },
  _checkRequired(output, result) {
    const required = ['operations', 'tools', 'parameters'];

    for (const field of required) {
      if (!output[field] && !output.toolpath && !output.gcode) {
        result.errors.push(`Missing required field: ${field}`);
      }
    }
  },
  _checkRanges(output, context, result) {
    const params = output.parameters || output.params || {};

    // RPM range
    if (params.rpm) {
      if (params.rpm < 100) {
        result.warnings.push(`RPM (${params.rpm}) is very low - verify`);
      }
      if (params.rpm > 30000) {
        result.errors.push(`RPM (${params.rpm}) exceeds typical machine limits`);
      }
    }
    // Feed rate
    if (params.feed) {
      if (params.feed < 1) {
        result.warnings.push(`Feed rate (${params.feed}) is very low`);
      }
      if (params.feed > 500) {
        result.warnings.push(`Feed rate (${params.feed}) is very high - verify`);
      }
    }
    // DOC
    if (params.doc) {
      if (params.doc > 1) {
        result.warnings.push(`DOC (${params.doc}") is aggressive - verify rigidity`);
      }
    }
    // SFM
    if (params.sfm) {
      if (params.sfm > 2000) {
        result.warnings.push(`SFM (${params.sfm}) is very high - verify for material`);
      }
    }
  },
  _checkSafety(output, context, result) {
    // Check for rapids into material
    const toolpath = output.toolpath || [];
    let lastZ = 10; // Safe height

    for (const move of toolpath) {
      if (move.type === 'rapid' && move.z < 0 && lastZ > 0) {
        result.errors.push(`Rapid move into material at Z=${move.z}`);
      }
      lastZ = move.z || lastZ;
    }
    // Check spindle direction for tapping
    const ops = output.operations || [];
    for (const op of ops) {
      if (op.type === 'tap' && !op.params?.spindleReverse) {
        result.warnings.push('Tapping operation - ensure spindle reversal is programmed');
      }
    }
  },
  _checkMachineCompat(output, context, result) {
    const machine = context.machine || {};
    const params = output.parameters || output.params || {};

    if (machine.maxRPM && params.rpm > machine.maxRPM) {
      result.errors.push(`RPM ${params.rpm} exceeds machine max ${machine.maxRPM}`);
    }
    if (machine.maxFeed && params.feed > machine.maxFeed) {
      result.errors.push(`Feed ${params.feed} exceeds machine max ${machine.maxFeed}`);
    }
    // Check travel limits
    const toolpath = output.toolpath || [];
    for (const move of toolpath) {
      if (machine.travel) {
        if (move.x < machine.travel.x?.min || move.x > machine.travel.x?.max) {
          result.errors.push(`X position ${move.x} outside machine travel`);
          break;
        }
        if (move.y < machine.travel.y?.min || move.y > machine.travel.y?.max) {
          result.errors.push(`Y position ${move.y} outside machine travel`);
          break;
        }
      }
    }
  },
  _checkToolCompat(output, context, result) {
    const tools = output.tools || [];
    const ops = output.operations || [];

    for (const op of ops) {
      if (op.tool && !tools.some(t => t.id === op.tool || t.name === op.tool)) {
        result.warnings.push(`Operation ${op.type} references tool ${op.tool} not in tool list`);
      }
    }
    // Check tool for operation type
    for (const op of ops) {
      if (op.type === 'drill' && op.tool?.includes('endmill')) {
        result.warnings.push('Using endmill for drilling - consider using drill');
      }
      if (op.type === 'face' && op.tool?.includes('ball')) {
        result.warnings.push('Using ball endmill for facing - consider flat endmill');
      }
    }
  },
  init() {
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_UNIVERSAL_VALIDATOR] v1.0 initialized');
    return this;
  }
}