/**
 * PRISM_INTELLIGENT_COLLISION_SYSTEM
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 147
 * Session: R2.3.1 Engine Gap Extraction Round 3
 */

const PRISM_INTELLIGENT_COLLISION_SYSTEM = {
  version: '3.0.0',

  // Loaded machine models with collision data
  loadedMachines: {},

  // Active collision checks
  activeChecks: [],

  /**
   * Initialize collision system for a machine
   */
  async initForMachine(machineId, stepFilePath) {
    console.log('[INTELLIGENT_COLLISION] Initializing for:', machineId);

    let machineData = null;

    // Check Okuma database first
    if (typeof PRISM_OKUMA_MACHINE_CAD_DATABASE !== 'undefined') {
      machineData = PRISM_OKUMA_MACHINE_CAD_DATABASE.getMachine(machineId);
    }
    // Check main learning engine
    if (!machineData && typeof PRISM_MACHINE_3D_LEARNING_ENGINE !== 'undefined') {
      machineData = PRISM_MACHINE_3D_LEARNING_ENGINE.learnedDimensions[machineId];
    }
    // Check model database
    if (!machineData && typeof PRISM_MACHINE_3D_MODEL_DATABASE_V2 !== 'undefined') {
      machineData = PRISM_MACHINE_3D_MODEL_DATABASE_V2.machines?.[machineId];
    }
    if (machineData) {
      this.loadedMachines[machineId] = {
        data: machineData,
        collisionZones: machineData.collisionZones || [],
        assemblies: machineData.assemblies || [],
        priority: machineData.priority || 'generated',
        initialized: true
      };
      (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[INTELLIGENT_COLLISION] Machine loaded:', machineId,
        'Priority:', machineData.priority,
        'Assemblies:', machineData.assemblies?.length || 0);

      return this.loadedMachines[machineId];
    }
    console.warn('[INTELLIGENT_COLLISION] Machine not found:', machineId);
    return null;
  },
  /**
   * Check collision between tool and machine components
   */
  checkToolCollision(toolPosition, toolGeometry, machineId) {
    const machine = this.loadedMachines[machineId];
    if (!machine) return { collision: false, warning: 'Machine not loaded' };

    const results = {
      collision: false,
      warnings: [],
      nearMisses: [],
      checkedZones: []
    };
    // Use PRISM_COLLISION_ENGINE for actual checks
    if (typeof PRISM_COLLISION_ENGINE !== 'undefined') {
      const toolAABB = PRISM_COLLISION_ENGINE.boundingBox.getToolAABB(toolGeometry, toolPosition);

      for (const zone of machine.collisionZones || []) {
        if (zone.boundingBox) {
          const collision = PRISM_COLLISION_ENGINE.boundingBox.checkAABB(toolAABB, zone.boundingBox);
          results.checkedZones.push(zone.name);

          if (collision) {
            results.collision = true;
            results.warnings.push({
              type: 'collision',
              zone: zone.name,
              priority: zone.priority,
              message: `Tool collision with ${zone.name}`
            });
          }
        }
      }
    }
    return results;
  },
  /**
   * Check collision along toolpath
   */
  checkToolpathCollision(toolpath, toolGeometry, machineId, options = {}) {
    const results = {
      safe: true,
      collisions: [],
      warnings: [],
      criticalPoints: []
    };
    const points = toolpath.points || toolpath.moves || toolpath;
    if (!Array.isArray(points)) return results;

    const checkInterval = options.checkInterval || 10; // Check every N points

    for (let i = 0; i < points.length; i += checkInterval) {
      const point = points[i];
      const position = { x: point.x, y: point.y, z: point.z };

      const check = this.checkToolCollision(position, toolGeometry, machineId);

      if (check.collision) {
        results.safe = false;
        results.collisions.push({
          pointIndex: i,
          position: position,
          details: check.warnings
        });
      }
      if (check.warnings.length > 0) {
        results.warnings.push(...check.warnings);
      }
    }
    // Check critical points (rapids, tool changes)
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      if (point.rapid || point.isRapid || point.toolChange) {
        results.criticalPoints.push({
          index: i,
          type: point.toolChange ? 'toolChange' : 'rapid',
          position: { x: point.x, y: point.y, z: point.z }
        });
      }
    }
    return results;
  },
  /**
   * Get collision-safe approach vector
   */
  getSafeApproach(targetPosition, machineId) {
    const machine = this.loadedMachines[machineId];
    if (!machine) return { x: 0, y: 0, z: 1 }; // Default: approach from +Z

    // Analyze machine type for safe approach
    const machineType = machine.data?.specs?.type || '';

    if (machineType.includes('HMC')) {
      return { x: 0, y: 1, z: 0 }; // Horizontal approach
    } else if (machineType.includes('VTL') || machineType.includes('LATHE')) {
      return { x: 1, y: 0, z: 0 }; // Radial approach
    } else {
      return { x: 0, y: 0, z: 1 }; // Vertical approach (VMC default)
    }
  }
}