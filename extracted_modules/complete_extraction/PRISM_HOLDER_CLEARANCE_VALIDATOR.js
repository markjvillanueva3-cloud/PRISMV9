const PRISM_HOLDER_CLEARANCE_VALIDATOR = {
  version: '1.0.0',

  /**
   * Validate tool holder clearance against part and machine
   */
  validateHolderClearance(params) {
    const {
      holder,         // Holder geometry
      tool,           // Tool geometry
      part,           // Part geometry
      machine,        // Machine configuration
      operation,      // Current operation
      safetyMargin = 2  // mm safety margin
    } = params;

    const results = {
      valid: true,
      warnings: [],
      errors: [],
      recommendations: [],
      clearanceMap: {}
    };
    // 1. Check holder-to-part clearance
    const holderPartClearance = this._checkHolderPartClearance(holder, part, operation, safetyMargin);
    results.clearanceMap.holderToPart = holderPartClearance;

    if (holderPartClearance.collision) {
      results.valid = false;
      results.errors.push({
        type: 'holder_part_collision',
        message: `Holder collides with part at Z=${holderPartClearance.collisionZ.toFixed(2)}mm`,
        severity: 'critical'
      });
      results.recommendations.push('Use longer tool or different holder style');
    } else if (holderPartClearance.minClearance < safetyMargin) {
      results.warnings.push({
        type: 'holder_part_tight',
        message: `Holder clearance is only ${holderPartClearance.minClearance.toFixed(2)}mm (recommend >${safetyMargin}mm)`,
        severity: 'warning'
      });
    }
    // 2. Check holder-to-fixture clearance
    const holderFixtureClearance = this._checkHolderFixtureClearance(holder, operation);
    results.clearanceMap.holderToFixture = holderFixtureClearance;

    if (holderFixtureClearance.collision) {
      results.valid = false;
      results.errors.push({
        type: 'holder_fixture_collision',
        message: 'Holder may collide with fixture/clamps',
        severity: 'critical'
      });
    }
    // 3. Check holder length vs spindle capacity
    const spindleClearance = this._checkSpindleClearance(holder, tool, machine);
    results.clearanceMap.spindleClearance = spindleClearance;

    if (!spindleClearance.fits) {
      results.valid = false;
      results.errors.push({
        type: 'spindle_capacity',
        message: `Tool assembly too long: ${spindleClearance.totalLength.toFixed(1)}mm > ${spindleClearance.maxLength}mm`,
        severity: 'critical'
      });
      results.recommendations.push('Use shorter holder or extended reach configuration');
    }
    // 4. Check for 5-axis specific clearance (if applicable)
    if (machine?.type?.includes('5AXIS')) {
      const fiveAxisClearance = this._check5AxisClearance(holder, tool, part, machine);
      results.clearanceMap.fiveAxis = fiveAxisClearance;

      if (fiveAxisClearance.restrictedAngles?.length > 0) {
        results.warnings.push({
          type: '5axis_restriction',
          message: `Limited tool angles: ${fiveAxisClearance.restrictedAngles.join(', ')}`,
          severity: 'info'
        });
      }
    }
    // 5. Generate recommendations for alternative holders
    if (!results.valid || results.warnings.length > 0) {
      results.alternatives = this._recommendAlternativeHolders(holder, tool, part, machine);
    }
    return results;
  },
  /**
   * Check holder to part clearance
   */
  _checkHolderPartClearance(holder, part, operation, safetyMargin) {
    const result = {
      collision: false,
      minClearance: Infinity,
      collisionZ: null
    };
    if (!holder || !part) return result;

    const holderRadius = (holder.diameter || holder.bodyDiameter || 40) / 2;
    const holderLength = holder.length || holder.gaugeLength || 50;
    const toolStickout = operation?.toolStickout || 50;

    // Simplified check - holder clearance at various Z levels
    const partMaxRadius = (part.boundingBox?.x || 100) / 2;
    const partHeight = part.boundingBox?.z || 50;
    const opDepth = operation?.depth || partHeight;

    // Check clearance at operation depth
    const holderBottomZ = -toolStickout + holderLength;
    const clearanceAtOp = holderBottomZ - (-opDepth);

    if (clearanceAtOp < 0) {
      result.collision = true;
      result.collisionZ = holderBottomZ;
    }
    result.minClearance = clearanceAtOp;

    return result;
  },
  /**
   * Check holder to fixture clearance
   */
  _checkHolderFixtureClearance(holder, operation) {
    const result = {
      collision: false,
      minClearance: Infinity
    };
    // Would integrate with fixture database in full implementation
    // For now, basic check based on operation type

    if (operation?.fixture) {
      const fixtureHeight = operation.fixture.height || 25;
      const holderBottomZ = -(operation.toolStickout || 50) + (holder?.length || 50);

      result.minClearance = holderBottomZ - fixtureHeight;
      result.collision = result.minClearance < 0;
    }
    return result;
  },
  /**
   * Check spindle capacity
   */
  _checkSpindleClearance(holder, tool, machine) {
    const holderLength = holder?.gaugeLength || holder?.length || 50;
    const toolLength = tool?.oal || 100;
    const totalLength = holderLength + toolLength - (tool?.shankLength || toolLength * 0.3);

    // Get max tool length from machine or default
    const maxLength = machine?.spindle?.maxToolLength || 300;

    return {
      fits: totalLength <= maxLength,
      totalLength,
      maxLength,
      margin: maxLength - totalLength
    };
  },
  /**
   * Check 5-axis specific clearance
   */
  _check5AxisClearance(holder, tool, part, machine) {
    const result = {
      restrictedAngles: [],
      maxTiltAngle: 90
    };
    // Calculate max tilt based on holder/tool profile
    const holderRadius = (holder?.diameter || 40) / 2;
    const toolLength = tool?.oal || 100;

    // Simplified: longer holders = more angle restriction
    if (holderRadius > 30) {
      result.maxTiltAngle = 60;
      result.restrictedAngles.push('A > 60°');
    }
    return result;
  },
  /**
   * Recommend alternative holders
   */
  _recommendAlternativeHolders(currentHolder, tool, part, machine) {
    const alternatives = [];

    // Suggest slimmer holders
    alternatives.push({
      type: 'slim_holder',
      reason: 'Reduced diameter for better clearance',
      improvement: '+15mm clearance typical'
    });

    // Suggest extended reach
    alternatives.push({
      type: 'extended_holder',
      reason: 'Longer gauge length for deep features',
      improvement: 'Access deep pockets'
    });

    // Suggest shrink fit
    alternatives.push({
      type: 'shrink_fit',
      reason: 'Minimum profile, maximum rigidity',
      improvement: 'Best clearance + accuracy'
    });

    return alternatives;
  },
  /**
   * Auto-select best holder for operation
   */
  autoSelectHolder(params) {
    const { tool, part, operation, machine, availableHolders } = params;

    const validHolders = [];

    for (const holder of (availableHolders || [])) {
      const validation = this.validateHolderClearance({
        holder, tool, part, machine, operation
      });

      if (validation.valid) {
        validHolders.push({
          holder,
          clearance: validation.clearanceMap,
          score: this._scoreHolder(holder, validation)
        });
      }
    }
    // Sort by score
    validHolders.sort((a, b) => b.score - a.score);

    return {
      recommended: validHolders[0]?.holder || null,
      alternatives: validHolders.slice(1, 4).map(v => v.holder),
      validCount: validHolders.length
    };
  },
  /**
   * Score a holder based on various factors
   */
  _scoreHolder(holder, validation) {
    let score = 50;

    // More clearance = better
    const minClearance = validation.clearanceMap?.holderToPart?.minClearance || 0;
    score += Math.min(minClearance * 2, 20);

    // Slimmer = better for clearance
    const diameter = holder.diameter || 50;
    score -= diameter * 0.5;

    // Shorter = more rigid
    const length = holder.gaugeLength || 50;
    score -= length * 0.2;

    return score;
  }
}