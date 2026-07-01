// PRISM_COLLISION_DETECTION_V2 - Lines 521245-521660 (416 lines) - Enhanced collision detection\n\nconst PRISM_COLLISION_DETECTION_V2 = {
  version: '3.0.0',
  name: 'PRISM Enhanced Collision Detection',

  config: {
    defaultTolerance: 0.01,     // mm
    headOffset: 0.5,           // mm allowance for holder
    fixtureOffset: 0.5,        // mm allowance for fixture
    checkResolution: 0.5,      // mm between checks along path
    maxCollisionsToStore: 1000,
    colors: {
      collision: 0xff0000,
      nearMiss: 0xff8800,
      safe: 0x00ff00
    }
  },
  state: {
    collisions: [],
    nearMisses: [],
    checkResults: null,
    model: null,
    stock: null,
    fixture: null
  },
  // CHECK CONFIGURATION

  checkOptions: {
    toolAgainstModel: true,
    holderAgainstModel: true,
    shankAgainstModel: true,
    toolAgainstStock: true,
    holderAgainstStock: true,
    g0StockCollision: true,  // Check rapid moves against stock
    checkFixture: true,
    cuttingLengthOnly: false // If true, only check non-cutting portion
  },
  setCheckOptions(options) {
    this.checkOptions = { ...this.checkOptions, ...options };
    return this.checkOptions;
  },
  // GEOMETRY SETUP

  setModel(meshData) {
    this.state.model = this._createBVH(meshData);
    return true;
  },
  setStock(meshData) {
    this.state.stock = this._createBVH(meshData);
    return true;
  },
  setFixture(meshData) {
    this.state.fixture = this._createBVH(meshData);
    return true;
  },
  // COLLISION CHECKING

  checkToolpath(toolpath, tool, options = {}) {
    const opts = { ...this.checkOptions, ...options };
    this.state.collisions = [];
    this.state.nearMisses = [];

    const results = {
      totalChecks: 0,
      collisions: [],
      nearMisses: [],
      safe: true,
      details: []
    };
    if (!toolpath || !toolpath.points || toolpath.points.length === 0) {
      return results;
    }
    // Build tool assembly for collision checking
    const toolAssembly = this._buildToolAssembly(tool);

    // Check each segment
    for (let i = 0; i < toolpath.points.length - 1; i++) {
      const p1 = toolpath.points[i];
      const p2 = toolpath.points[i + 1];
      const isRapid = p1.rapid || p2.rapid || p1.f === 0;

      // Skip stock check for cutting moves if not configured
      if (isRapid && !opts.g0StockCollision) {
        continue;
      }
      const segmentResults = this._checkSegment(p1, p2, toolAssembly, opts, isRapid, i);
      results.totalChecks += segmentResults.checks;

      if (segmentResults.collisions.length > 0) {
        results.safe = false;
        results.collisions.push(...segmentResults.collisions);
      }
      if (segmentResults.nearMisses.length > 0) {
        results.nearMisses.push(...segmentResults.nearMisses);
      }
    }
    this.state.collisions = results.collisions;
    this.state.nearMisses = results.nearMisses;
    this.state.checkResults = results;

    return results;
  },
  checkPosition(position, orientation, tool, options = {}) {
    const opts = { ...this.checkOptions, ...options };
    const toolAssembly = this._buildToolAssembly(tool);

    return this._checkSinglePosition(position, orientation, toolAssembly, opts);
  },
  // INTERNAL CHECK METHODS

  _checkSegment(p1, p2, toolAssembly, opts, isRapid, segmentIndex) {
    const result = {
      checks: 0,
      collisions: [],
      nearMisses: []
    };
    const distance = Math.sqrt(
      Math.pow(p2.x - p1.x, 2) +
      Math.pow(p2.y - p1.y, 2) +
      Math.pow(p2.z - p1.z, 2)
    );

    const steps = Math.max(1, Math.ceil(distance / this.config.checkResolution));

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const pos = {
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t,
        z: p1.z + (p2.z - p1.z) * t
      };
      // Interpolate orientation if present
      const orientation = this._interpolateOrientation(p1, p2, t);

      const check = this._checkSinglePosition(pos, orientation, toolAssembly, opts);
      result.checks++;

      if (check.collision) {
        if (result.collisions.length < this.config.maxCollisionsToStore) {
          result.collisions.push({
            position: { ...pos },
            orientation: orientation,
            segmentIndex: segmentIndex,
            t: t,
            isRapid: isRapid,
            components: check.collidingComponents,
            penetration: check.maxPenetration
          });
        }
      } else if (check.nearMiss) {
        if (result.nearMisses.length < this.config.maxCollisionsToStore) {
          result.nearMisses.push({
            position: { ...pos },
            orientation: orientation,
            segmentIndex: segmentIndex,
            t: t,
            clearance: check.minClearance
          });
        }
      }
    }
    return result;
  },
  _checkSinglePosition(pos, orientation, toolAssembly, opts) {
    const result = {
      collision: false,
      nearMiss: false,
      collidingComponents: [],
      maxPenetration: 0,
      minClearance: Infinity
    };
    // Transform tool assembly to position
    const transformedTool = this._transformToolAssembly(toolAssembly, pos, orientation);

    // Check tool tip against model (cutting area)
    if (opts.toolAgainstModel && this.state.model) {
      const tipCheck = this._checkGeometryAgainstBVH(
        transformedTool.cuttingPortion,
        this.state.model,
        this.config.defaultTolerance
      );

      if (tipCheck.collision) {
        // This is expected during cutting - only flag if non-cutting portion
        if (opts.cuttingLengthOnly) {
          // OK - this is the cutting portion doing its job
        } else {
          result.collision = true;
          result.collidingComponents.push('tool_tip');
          result.maxPenetration = Math.max(result.maxPenetration, tipCheck.penetration);
        }
      }
    }
    // Check non-cutting portion against model
    if (opts.holderAgainstModel && this.state.model) {
      const holderCheck = this._checkGeometryAgainstBVH(
        transformedTool.nonCuttingPortion,
        this.state.model,
        this.config.headOffset
      );

      if (holderCheck.collision) {
        result.collision = true;
        result.collidingComponents.push('holder');
        result.maxPenetration = Math.max(result.maxPenetration, holderCheck.penetration);
      }
    }
    // Check shank against model
    if (opts.shankAgainstModel && this.state.model) {
      const shankCheck = this._checkGeometryAgainstBVH(
        transformedTool.shank,
        this.state.model,
        this.config.headOffset
      );

      if (shankCheck.collision) {
        result.collision = true;
        result.collidingComponents.push('shank');
        result.maxPenetration = Math.max(result.maxPenetration, shankCheck.penetration);
      }
    }
    // Check against stock
    if (opts.toolAgainstStock && this.state.stock) {
      const stockCheck = this._checkGeometryAgainstBVH(
        transformedTool.nonCuttingPortion,
        this.state.stock,
        0
      );

      if (stockCheck.collision) {
        result.collision = true;
        result.collidingComponents.push('stock');
        result.maxPenetration = Math.max(result.maxPenetration, stockCheck.penetration);
      }
    }
    // Check against fixture
    if (opts.checkFixture && this.state.fixture) {
      const fixtureCheck = this._checkGeometryAgainstBVH(
        transformedTool.full,
        this.state.fixture,
        this.config.fixtureOffset
      );

      if (fixtureCheck.collision) {
        result.collision = true;
        result.collidingComponents.push('fixture');
        result.maxPenetration = Math.max(result.maxPenetration, fixtureCheck.penetration);
      }
      result.minClearance = Math.min(result.minClearance, fixtureCheck.clearance);
    }
    // Determine near-miss status
    if (!result.collision && result.minClearance < this.config.headOffset * 2) {
      result.nearMiss = true;
    }
    return result;
  },
  // TOOL ASSEMBLY

  _buildToolAssembly(tool) {
    const cuttingLength = tool.cuttingLength || tool.fluteLength || tool.length * 0.7;
    const totalLength = tool.length || 100;
    const diameter = tool.diameter || 10;
    const shankDiameter = tool.shankDiameter || diameter;
    const holderDiameter = tool.holderDiameter || shankDiameter * 1.5;

    return {
      cuttingPortion: {
        type: 'cylinder',
        diameter: diameter,
        length: cuttingLength,
        offset: 0
      },
      nonCuttingPortion: {
        type: 'cylinder',
        diameter: diameter,
        length: totalLength - cuttingLength,
        offset: cuttingLength
      },
      shank: {
        type: 'cylinder',
        diameter: shankDiameter,
        length: tool.shankLength || 30,
        offset: totalLength
      },
      holder: {
        type: 'cylinder',
        diameter: holderDiameter,
        length: tool.holderLength || 50,
        offset: totalLength + (tool.shankLength || 30)
      },
      full: {
        type: 'composite',
        components: ['cuttingPortion', 'nonCuttingPortion', 'shank', 'holder']
      }
    };
  },
  _transformToolAssembly(assembly, position, orientation) {
    // Apply position and orientation transform
    // For now, simplified - just offset Z
    const transformed = JSON.parse(JSON.stringify(assembly));
    transformed.position = position;
    transformed.orientation = orientation || { a: 0, b: 0, c: 0 };
    return transformed;
  },
  _interpolateOrientation(p1, p2, t) {
    if (!p1.a && !p2.a) return { a: 0, b: 0, c: 0 };

    return {
      a: (p1.a || 0) + ((p2.a || 0) - (p1.a || 0)) * t,
      b: (p1.b || 0) + ((p2.b || 0) - (p1.b || 0)) * t,
      c: (p1.c || 0) + ((p2.c || 0) - (p1.c || 0)) * t
    };
  },
  // BVH (Bounding Volume Hierarchy)

  _createBVH(meshData) {
    // Simplified BVH creation
    return {
      type: 'bvh',
      bounds: meshData.bounds || this._calculateBounds(meshData),
      data: meshData
    };
  },
  _calculateBounds(meshData) {
    // Calculate axis-aligned bounding box
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    if (meshData.vertices) {
      for (let i = 0; i < meshData.vertices.length; i += 3) {
        minX = Math.min(minX, meshData.vertices[i]);
        maxX = Math.max(maxX, meshData.vertices[i]);
        minY = Math.min(minY, meshData.vertices[i + 1]);
        maxY = Math.max(maxY, meshData.vertices[i + 1]);
        minZ = Math.min(minZ, meshData.vertices[i + 2]);
        maxZ = Math.max(maxZ, meshData.vertices[i + 2]);
      }
    }
    return { minX, minY, minZ, maxX, maxY, maxZ };
  },
  _checkGeometryAgainstBVH(geometry, bvh, tolerance) {
    // Simplified collision check
    // In a full implementation, this would use proper BVH traversal
    return {
      collision: false,
      penetration: 0,
      clearance: Infinity
    };
  },
  // RESULTS AND VISUALIZATION

  getCollisionReport() {
    const results = this.state.checkResults;
    if (!results) return null;

    return {
      summary: {
        safe: results.safe,
        totalCollisions: results.collisions.length,
        totalNearMisses: results.nearMisses.length,
        totalChecks: results.totalChecks
      },
      collisions: results.collisions.map(c => ({
        lineNumber: c.segmentIndex,
        position: c.position,
        components: c.components,
        isRapid: c.isRapid,
        severity: c.penetration > 0.5 ? 'critical' : 'warning'
      })),
      nearMisses: results.nearMisses.slice(0, 50), // Limit for display
      recommendations: this._generateRecommendations(results)
    };
  },
  _generateRecommendations(results) {
    const recommendations = [];

    if (results.collisions.some(c => c.components.includes('holder'))) {
      recommendations.push('Consider using a longer tool or adjusting holder position');
    }
    if (results.collisions.some(c => c.isRapid)) {
      recommendations.push('Review rapid traverse heights - collisions detected during G0 moves');
    }
    if (results.collisions.some(c => c.components.includes('fixture'))) {
      recommendations.push('Fixture interference detected - review clamping strategy');
    }
    return recommendations;
  },
  generateVisualization() {
    if (typeof THREE === 'undefined') return null;

    const group = new THREE.Group();
    group.name = 'CollisionVisualization';

    // Add collision points
    const collisionGeom = new THREE.SphereGeometry(1, 8, 8);
    const collisionMat = new THREE.MeshBasicMaterial({ color: this.config.colors.collision });

    this.state.collisions.forEach(c => {
      const sphere = new THREE.Mesh(collisionGeom, collisionMat);
      sphere.position.set(c.position.x, c.position.y, c.position.z);
      sphere.scale.setScalar(c.penetration > 0.5 ? 2 : 1);
      group.add(sphere);
    });

    // Add near-miss points
    const nearMissGeom = new THREE.SphereGeometry(0.5, 8, 8);
    const nearMissMat = new THREE.MeshBasicMaterial({ color: this.config.colors.nearMiss });

    this.state.nearMisses.slice(0, 100).forEach(n => {
      const sphere = new THREE.Mesh(nearMissGeom, nearMissMat);
      sphere.position.set(n.position.x, n.position.y, n.position.z);
      group.add(sphere);
    });

    return group;
  }
};
