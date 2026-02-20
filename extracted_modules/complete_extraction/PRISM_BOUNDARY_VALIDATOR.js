const PRISM_BOUNDARY_VALIDATOR = {
  version: '1.0.0',

  /**
   * Validate toolpath stays within stock boundaries
   */
  validateContainment(toolpath, stock, options = {}) {
    const result = {
      valid: true,
      violations: [],
      warnings: [],
      confidence: 100,
      adjustedPath: null
    };
    const clearance = options.clearance || 0.1; // Default 0.1" clearance
    const toolRadius = (toolpath.tool?.diameter || 0.5) / 2;

    // Stock bounds
    const stockBounds = this._getStockBounds(stock);

    // Check each move
    for (let i = 0; i < (toolpath.moves || []).length; i++) {
      const move = toolpath.moves[i];

      // Skip rapids at safe Z
      if (move.type === 'rapid' && move.z > stockBounds.maxZ + clearance) {
        continue;
      }
      // Check X boundary
      if (move.x !== undefined) {
        if (move.x - toolRadius < stockBounds.minX - clearance) {
          result.violations.push({
            moveIndex: i,
            axis: 'X',
            value: move.x,
            limit: stockBounds.minX,
            message: `X position ${move.x} exceeds stock boundary (min: ${stockBounds.minX})`
          });
          result.valid = false;
        }
        if (move.x + toolRadius > stockBounds.maxX + clearance) {
          result.violations.push({
            moveIndex: i,
            axis: 'X',
            value: move.x,
            limit: stockBounds.maxX,
            message: `X position ${move.x} exceeds stock boundary (max: ${stockBounds.maxX})`
          });
          result.valid = false;
        }
      }
      // Check Y boundary
      if (move.y !== undefined) {
        if (move.y - toolRadius < stockBounds.minY - clearance) {
          result.violations.push({
            moveIndex: i,
            axis: 'Y',
            value: move.y,
            limit: stockBounds.minY,
            message: `Y position ${move.y} exceeds stock boundary`
          });
          result.valid = false;
        }
        if (move.y + toolRadius > stockBounds.maxY + clearance) {
          result.violations.push({
            moveIndex: i,
            axis: 'Y',
            value: move.y,
            limit: stockBounds.maxY,
            message: `Y position ${move.y} exceeds stock boundary`
          });
          result.valid = false;
        }
      }
      // Check Z boundary (depth)
      if (move.z !== undefined) {
        if (move.z < stockBounds.minZ - clearance) {
          result.violations.push({
            moveIndex: i,
            axis: 'Z',
            value: move.z,
            limit: stockBounds.minZ,
            message: `Z position ${move.z} exceeds stock depth (min: ${stockBounds.minZ})`
          });
          result.valid = false;
        }
      }
    }
    // If violations found, try to adjust
    if (!result.valid && options.autoAdjust) {
      result.adjustedPath = this._adjustPath(toolpath, stockBounds, toolRadius, clearance);
      result.warnings.push('Toolpath was automatically adjusted to fit within stock');
    }
    result.confidence = result.valid ? 100 : (result.adjustedPath ? 85 : 50);

    return result;
  },
  _getStockBounds(stock) {
    if (!stock) {
      return { minX: -10, maxX: 10, minY: -10, maxY: 10, minZ: -2, maxZ: 0 };
    }
    return {
      minX: stock.x || 0,
      maxX: (stock.x || 0) + (stock.width || 10),
      minY: stock.y || 0,
      maxY: (stock.y || 0) + (stock.length || 10),
      minZ: -(stock.height || stock.depth || 2),
      maxZ: 0
    };
  },
  _adjustPath(toolpath, bounds, toolRadius, clearance) {
    const adjusted = JSON.parse(JSON.stringify(toolpath));

    for (const move of adjusted.moves || []) {
      if (move.x !== undefined) {
        move.x = Math.max(bounds.minX + toolRadius, Math.min(bounds.maxX - toolRadius, move.x));
      }
      if (move.y !== undefined) {
        move.y = Math.max(bounds.minY + toolRadius, Math.min(bounds.maxY - toolRadius, move.y));
      }
      if (move.z !== undefined) {
        move.z = Math.max(bounds.minZ, move.z);
      }
    }
    return adjusted;
  },
  /**
   * Check if part fits within machine envelope
   */
  validateMachineEnvelope(toolpath, machine) {
    const result = { valid: true, violations: [], warnings: [] };

    const envelope = machine?.envelope || { x: 20, y: 20, z: 20 };

    for (const move of (toolpath.moves || [])) {
      if (move.x !== undefined && Math.abs(move.x) > envelope.x / 2) {
        result.valid = false;
        result.violations.push(`X travel ${move.x} exceeds machine envelope (${envelope.x})`);
      }
      if (move.y !== undefined && Math.abs(move.y) > envelope.y / 2) {
        result.valid = false;
        result.violations.push(`Y travel ${move.y} exceeds machine envelope (${envelope.y})`);
      }
      if (move.z !== undefined && Math.abs(move.z) > envelope.z) {
        result.valid = false;
        result.violations.push(`Z travel ${move.z} exceeds machine envelope (${envelope.z})`);
      }
    }
    return result;
  },
  init() {
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_BOUNDARY_VALIDATOR] v1.0 initialized');
    window.PRISM_BOUNDARY_VALIDATOR = this;
    window.validateBoundary = this.validateContainment.bind(this);
    window.validateEnvelope = this.validateMachineEnvelope.bind(this);

    // Connect to validator
    if (typeof PRISM_UNIVERSAL_VALIDATOR !== 'undefined') {
      PRISM_UNIVERSAL_VALIDATOR.boundaryValidator = this;
    }
    return this;
  }
}