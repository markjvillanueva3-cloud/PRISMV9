// PRISM_COLLISION_ENGINE - Lines 73167-73470 (304 lines) - Core collision detection\n\nconst PRISM_COLLISION_ENGINE = {
  version: '1.0.0',

  // BOUNDING BOX COLLISION

  boundingBox: {
    /**
     * Check if two AABBs (Axis-Aligned Bounding Boxes) collide
     */
    checkAABB(box1, box2) {
      return (
        box1.minX <= box2.maxX && box1.maxX >= box2.minX &&
        box1.minY <= box2.maxY && box1.maxY >= box2.minY &&
        box1.minZ <= box2.maxZ && box1.maxZ >= box2.minZ
      );
    },
    /**
     * Get AABB for a tool at a position
     */
    getToolAABB(tool, position) {
      const r = tool.diameter / 2;
      const h = tool.length || tool.flute_length || 2;

      return {
        minX: position.x - r,
        maxX: position.x + r,
        minY: position.y - r,
        maxY: position.y + r,
        minZ: position.z - h,
        maxZ: position.z
      };
    },
    /**
     * Get AABB for tool holder at a position
     */
    getHolderAABB(holder, position, toolLength) {
      const r = holder.diameter / 2;
      const h = holder.length || 3;
      const z0 = position.z + toolLength - holder.grip_length;

      return {
        minX: position.x - r,
        maxX: position.x + r,
        minY: position.y - r,
        maxY: position.y + r,
        minZ: z0,
        maxZ: z0 + h
      };
    }
  },
  // INTERFERENCE CHECKING

  interference: {
    /**
     * Check toolpath for collisions with workpiece
     */
    checkToolpath(toolpath, tool, stock, features) {
      const collisions = [];
      let toolAABB;

      for (let i = 0; i < toolpath.length; i++) {
        const move = toolpath[i];

        // Skip rapid moves at safe height
        if (move.type === 'rapid' && move.z > stock.height + 0.1) continue;

        // Get tool bounding box at this position
        toolAABB = PRISM_COLLISION_ENGINE.boundingBox.getToolAABB(tool, move);

        // Check collision with stock (only matters for non-cutting moves)
        if (move.type === 'rapid') {
          // For rapids, check if path goes through material
          const stockAABB = {
            minX: 0, maxX: stock.length,
            minY: 0, maxY: stock.width,
            minZ: 0, maxZ: stock.height
          };
          if (PRISM_COLLISION_ENGINE.boundingBox.checkAABB(toolAABB, stockAABB)) {
            collisions.push({
              type: 'rapid_through_material',
              index: i,
              position: { x: move.x, y: move.y, z: move.z },
              severity: 'critical',
              message: 'Rapid move passes through material'
            });
          }
        }
        // Check holder collision (tool not cutting, but holder hitting)
        if (tool.stickout && move.z < stock.height - tool.stickout) {
          collisions.push({
            type: 'holder_collision',
            index: i,
            position: { x: move.x, y: move.y, z: move.z },
            severity: 'critical',
            message: 'Tool holder would collide with workpiece'
          });
        }
        // Check for gouging (cutting where we shouldn't)
        if (features) {
          for (const feature of features) {
            if (this._isGouging(move, tool, feature)) {
              collisions.push({
                type: 'gouge',
                index: i,
                position: { x: move.x, y: move.y, z: move.z },
                feature: feature.id,
                severity: 'warning',
                message: `Potential gouge on feature ${feature.id}`
              });
            }
          }
        }
      }
      return {
        passed: collisions.filter(c => c.severity === 'critical').length === 0,
        collisions,
        criticalCount: collisions.filter(c => c.severity === 'critical').length,
        warningCount: collisions.filter(c => c.severity === 'warning').length
      };
    },
    /**
     * Check if a move would gouge a feature
     */
    _isGouging(move, tool, feature) {
      // Simplified gouge check - compare Z to feature floor with tolerance
      if (feature.type === 'pocket' && feature.floor !== undefined) {
        if (move.z < feature.floor - 0.001) { // 0.001" tolerance
          // Check if we're actually in the pocket area
          if (this._pointInPolygon(move, feature.boundary)) {
            return true;
          }
        }
      }
      return false;
    },
    /**
     * Point-in-polygon test
     */
    _pointInPolygon(point, polygon) {
      let inside = false;
      const n = polygon.length;

      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;

        if (((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
          inside = !inside;
        }
      }
      return inside;
    }
  },
  // MACHINE ENVELOPE CHECKING

  machineEnvelope: {
    /**
     * Check if toolpath stays within machine limits
     */
    checkLimits(toolpath, machine) {
      const violations = [];

      const limits = machine.travel || {
        x: { min: 0, max: 20 },
        y: { min: 0, max: 20 },
        z: { min: -10, max: 0 }
      };
      for (let i = 0; i < toolpath.length; i++) {
        const move = toolpath[i];

        if (move.x < limits.x.min || move.x > limits.x.max) {
          violations.push({
            axis: 'X',
            index: i,
            value: move.x,
            limit: move.x < limits.x.min ? limits.x.min : limits.x.max,
            message: `X position ${move.x.toFixed(4)} exceeds ${move.x < limits.x.min ? 'minimum' : 'maximum'} travel`
          });
        }
        if (move.y < limits.y.min || move.y > limits.y.max) {
          violations.push({
            axis: 'Y',
            index: i,
            value: move.y,
            limit: move.y < limits.y.min ? limits.y.min : limits.y.max,
            message: `Y position ${move.y.toFixed(4)} exceeds ${move.y < limits.y.min ? 'minimum' : 'maximum'} travel`
          });
        }
        if (move.z !== undefined && (move.z < limits.z.min || move.z > limits.z.max)) {
          violations.push({
            axis: 'Z',
            index: i,
            value: move.z,
            limit: move.z < limits.z.min ? limits.z.min : limits.z.max,
            message: `Z position ${move.z.toFixed(4)} exceeds ${move.z < limits.z.min ? 'minimum' : 'maximum'} travel`
          });
        }
      }
      return {
        passed: violations.length === 0,
        violations
      };
    }
  },
  // MASTER COLLISION CHECK

  checkAll(params) {
    const {
      toolpath,
      tool,
      holder,
      stock,
      features,
      machine,
      fixtures = []
    } = params;

    console.log('[COLLISION_ENGINE] Running full collision check...');

    const result = {
      passed: true,
      checks: {},
      summary: {
        criticalErrors: 0,
        warnings: 0
      }
    };
    // 1. Machine envelope check
    result.checks.envelope = this.machineEnvelope.checkLimits(toolpath, machine);
    if (!result.checks.envelope.passed) {
      result.passed = false;
      result.summary.criticalErrors += result.checks.envelope.violations.length;
    }
    // 2. Toolpath interference check
    result.checks.interference = this.interference.checkToolpath(toolpath, tool, stock, features);
    if (!result.checks.interference.passed) {
      result.passed = false;
    }
    result.summary.criticalErrors += result.checks.interference.criticalCount;
    result.summary.warnings += result.checks.interference.warningCount;

    // 3. Fixture collision check
    if (fixtures.length > 0) {
      result.checks.fixtures = this._checkFixtureCollisions(toolpath, tool, holder, fixtures);
      if (!result.checks.fixtures.passed) {
        result.passed = false;
        result.summary.criticalErrors += result.checks.fixtures.collisions.length;
      }
    }
    console.log('[COLLISION_ENGINE] Check complete:', result.passed ? 'PASSED' : 'FAILED');
    console.log('  Critical errors:', result.summary.criticalErrors);
    console.log('  Warnings:', result.summary.warnings);

    return result;
  },
  _checkFixtureCollisions(toolpath, tool, holder, fixtures) {
    const collisions = [];

    for (const move of toolpath) {
      const toolAABB = this.boundingBox.getToolAABB(tool, move);

      for (const fixture of fixtures) {
        const fixtureAABB = {
          minX: fixture.x - fixture.width/2,
          maxX: fixture.x + fixture.width/2,
          minY: fixture.y - fixture.depth/2,
          maxY: fixture.y + fixture.depth/2,
          minZ: fixture.z,
          maxZ: fixture.z + fixture.height
        };
        if (this.boundingBox.checkAABB(toolAABB, fixtureAABB)) {
          collisions.push({
            type: 'fixture_collision',
            fixture: fixture.id || fixture.name,
            position: move,
            message: `Tool collision with fixture ${fixture.name || fixture.id}`
          });
        }
        // Check holder if defined
        if (holder) {
          const holderAABB = this.boundingBox.getHolderAABB(holder, move, tool.length);
          if (this.boundingBox.checkAABB(holderAABB, fixtureAABB)) {
            collisions.push({
              type: 'holder_fixture_collision',
              fixture: fixture.id || fixture.name,
              position: move,
              message: `Holder collision with fixture ${fixture.name || fixture.id}`
            });
          }
        }
      }
    }
    return {
      passed: collisions.length === 0,
      collisions
    };
  },
  init() {
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_COLLISION_ENGINE] v1.0 initialized');
    console.log('  Checks: envelope, interference, gouge, fixture');
    return this;
  }
};
