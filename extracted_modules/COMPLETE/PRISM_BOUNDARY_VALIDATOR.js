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
};
// PRISM_USER_OVERRIDE_SYSTEM v1.0.0
// Allows users to override any calculated parameter
// Tracks overrides and applies them at the right stage

const PRISM_USER_OVERRIDE_SYSTEM = {
  version: '1.0.0',

  overrides: {},
  history: [],

  /**
   * Set an override for a parameter
   */
  setOverride(category, parameter, value, reason = '') {
    const key = `${category}.${parameter}`;

    this.overrides[key] = {
      category,
      parameter,
      value,
      reason,
      timestamp: new Date().toISOString(),
      originalValue: this._getOriginalValue(category, parameter)
    };
    this.history.push({
      action: 'set',
      key,
      value,
      reason,
      timestamp: new Date().toISOString()
    });

    console.log(`[OVERRIDE] Set ${key} = ${value} (${reason})`);

    // Trigger update event
    this._triggerUpdate(category, parameter, value);

    return this.overrides[key];
  },
  /**
   * Get override value if exists, otherwise return default
   */
  getOverride(category, parameter, defaultValue) {
    const key = `${category}.${parameter}`;
    if (this.overrides[key]) {
      return this.overrides[key].value;
    }
    return defaultValue;
  },
  /**
   * Check if parameter has override
   */
  hasOverride(category, parameter) {
    return !!this.overrides[`${category}.${parameter}`];
  },
  /**
   * Clear an override
   */
  clearOverride(category, parameter) {
    const key = `${category}.${parameter}`;
    if (this.overrides[key]) {
      this.history.push({
        action: 'clear',
        key,
        oldValue: this.overrides[key].value,
        timestamp: new Date().toISOString()
      });
      delete this.overrides[key];
      this._triggerUpdate(category, parameter, null);
    }
  },
  /**
   * Clear all overrides
   */
  clearAll() {
    this.overrides = {};
    this.history.push({
      action: 'clearAll',
      timestamp: new Date().toISOString()
    });
  },
  /**
   * Get all active overrides
   */
  getAll() {
    return { ...this.overrides };
  },
  /**
   * Apply overrides to a workflow result
   */
  applyToWorkflow(workflow) {
    const applied = [];

    // Apply feeds/speeds overrides
    if (this.hasOverride('feeds', 'rpm')) {
      workflow.parameters = workflow.parameters || {};
      workflow.parameters.rpm = this.getOverride('feeds', 'rpm');
      applied.push('rpm');
    }
    if (this.hasOverride('feeds', 'feedrate')) {
      workflow.parameters = workflow.parameters || {};
      workflow.parameters.feedrate = this.getOverride('feeds', 'feedrate');
      applied.push('feedrate');
    }
    // Apply depth overrides
    if (this.hasOverride('depth', 'stepdown')) {
      workflow.parameters = workflow.parameters || {};
      workflow.parameters.stepdown = this.getOverride('depth', 'stepdown');
      applied.push('stepdown');
    }
    if (this.hasOverride('depth', 'stepover')) {
      workflow.parameters = workflow.parameters || {};
      workflow.parameters.stepover = this.getOverride('depth', 'stepover');
      applied.push('stepover');
    }
    // Apply tool overrides
    if (this.hasOverride('tool', 'diameter')) {
      workflow.tool = workflow.tool || {};
      workflow.tool.diameter = this.getOverride('tool', 'diameter');
      applied.push('tool.diameter');
    }
    // Apply strategy overrides
    if (this.hasOverride('strategy', 'type')) {
      workflow.strategy = this.getOverride('strategy', 'type');
      applied.push('strategy');
    }
    workflow.overridesApplied = applied;

    return workflow;
  },
  _getOriginalValue(category, parameter) {
    // Try to get from active workflow
    return null; // Would need context
  },
  _triggerUpdate(category, parameter, value) {
    // Dispatch custom event for UI to listen
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prism-override-change', {
        detail: { category, parameter, value }
      }));
    }
  },
  init() {
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_USER_OVERRIDE_SYSTEM] v1.0 initialized');
    window.PRISM_USER_OVERRIDE_SYSTEM = this;
    window.setOverride = this.setOverride.bind(this);
    window.getOverride = this.getOverride.bind(this);
    window.clearOverride = this.clearOverride.bind(this);

    // Connect to orchestrator
    if (typeof PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR !== 'undefined') {
      PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR.overrideSystem = this;
      PRISM_UNIFIED_INTELLIGENT_ORCHESTRATOR.applyOverrides = this.applyToWorkflow.bind(this);
    }
    return this;
  }
};
// PRISM_REALTIME_PREVIEW_SYSTEM v1.0.0
// Handles real-time updates to toolpath preview as parameters change
// Debounces updates for performance

const PRISM_REALTIME_PREVIEW_SYSTEM = {
  version: '1.0.0',

  updateQueue: [],
  debounceTimer: null,
  debounceDelay: 150, // ms
  listeners: [],
  currentPreview: null,

  /**
   * Queue a preview update (debounced)
   */
  queueUpdate(changeType, changeData) {
    this.updateQueue.push({
      type: changeType,
      data: changeData,
      timestamp: Date.now()
    });

    // Debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this._processQueue();
    }, this.debounceDelay);
  },
  /**
   * Force immediate update (skip debounce)
   */
  forceUpdate(changeType, changeData) {
    this.updateQueue.push({ type: changeType, data: changeData, timestamp: Date.now() });
    this._processQueue();
  },
  /**
   * Register a listener for preview updates
   */
  onUpdate(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },
  /**
   * Process queued updates
   */
  _processQueue() {
    if (this.updateQueue.length === 0) return;

    // Get the latest of each change type
    const latestChanges = {};
    for (const change of this.updateQueue) {
      latestChanges[change.type] = change;
    }
    // Clear queue
    this.updateQueue = [];

    // Regenerate preview based on changes
    this._regeneratePreview(latestChanges);
  },
  /**
   * Regenerate preview based on changes
   */
  async _regeneratePreview(changes) {
    console.log('[PREVIEW] Regenerating preview for:', Object.keys(changes));

    const preview = {
      timestamp: Date.now(),
      changes: Object.keys(changes),
      toolpath: null,
      stats: null
    };
    try {
      // Get current workflow context
      const context = this._getCurrentContext();

      // Apply changes
      for (const [type, change] of Object.entries(changes)) {
        switch (type) {
          case 'tool':
            context.tool = { ...context.tool, ...change.data };
            break;
          case 'feeds':
            context.feeds = { ...context.feeds, ...change.data };
            break;
          case 'strategy':
            context.strategy = change.data;
            break;
          case 'depth':
            context.depth = { ...context.depth, ...change.data };
            break;
        }
      }
      // Regenerate toolpath (quick version)
      if (typeof PRISM_HYBRID_TOOLPATH_SYNTHESIZER !== 'undefined') {
        preview.toolpath = PRISM_HYBRID_TOOLPATH_SYNTHESIZER.synthesizeOptimalToolpath(
          context.feature,
          context.material,
          context.tool,
          { priority: context.priority }
        );
      }
      // Calculate stats
      preview.stats = this._calculateStats(preview.toolpath);

      // Store current preview
      this.currentPreview = preview;

      // Notify listeners
      this._notifyListeners(preview);

    } catch (error) {
      console.error('[PREVIEW] Error regenerating:', error);
      preview.error = error.message;
      this._notifyListeners(preview);
    }
  },
  _getCurrentContext() {
    // Get from active workflow or defaults
    return {
      feature: { type: 'pocket', width: 2, length: 2, depth: 0.5 },
      material: { name: 'aluminum_6061' },
      tool: { diameter: 0.5, flutes: 4 },
      feeds: { rpm: 8000, feedrate: 60 },
      strategy: 'adaptive',
      depth: { stepdown: 0.25, stepover: 0.2 },
      priority: 'balanced'
    };
  },
  _calculateStats(toolpath) {
    if (!toolpath || !toolpath.moves) return null;

    let rapidDistance = 0;
    let cuttingDistance = 0;
    let moveCount = toolpath.moves.length;

    for (let i = 1; i < toolpath.moves.length; i++) {
      const prev = toolpath.moves[i - 1];
      const curr = toolpath.moves[i];

      const dx = (curr.x || 0) - (prev.x || 0);
      const dy = (curr.y || 0) - (prev.y || 0);
      const dz = (curr.z || 0) - (prev.z || 0);
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (curr.type === 'rapid') {
        rapidDistance += dist;
      } else {
        cuttingDistance += dist;
      }
    }
    return {
      moveCount,
      rapidDistance: rapidDistance.toFixed(2),
      cuttingDistance: cuttingDistance.toFixed(2),
      totalDistance: (rapidDistance + cuttingDistance).toFixed(2)
    };
  },
  _notifyListeners(preview) {
    for (const listener of this.listeners) {
      try {
        listener(preview);
      } catch (error) {
        console.error('[PREVIEW] Listener error:', error);
      }
    }
    // Also dispatch event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('prism-preview-update', {
        detail: preview
      }));
    }
  },
  init() {
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_REALTIME_PREVIEW_SYSTEM] v1.0 initialized');
    window.PRISM_REALTIME_PREVIEW_SYSTEM = this;
    window.queuePreviewUpdate = this.queueUpdate.bind(this);
    window.forcePreviewUpdate = this.forceUpdate.bind(this);
    window.onPreviewUpdate = this.onUpdate.bind(this);

    // Listen for override changes
    if (typeof window !== 'undefined') {
      window.addEventListener('prism-override-change', (e) => {
        this.queueUpdate(e.detail.category, { [e.detail.parameter]: e.detail.value });
      });
    }
    return this;
  }
};
// PRISM_RAPIDS_OPTIMIZER v1.0.0
// Optimizes rapid moves to minimize non-cutting time

const PRISM_RAPIDS_OPTIMIZER = {
  version: '1.0.0',

  /**
   * Optimize rapid moves in a toolpath
   */
  optimize(toolpath, options = {}) {
    const result = {
      original: toolpath,
      optimized: JSON.parse(JSON.stringify(toolpath)),
      savings: { distance: 0, estimatedTime: 0 },
      confidence: 100
    };
    const moves = result.optimized.moves || [];
    if (moves.length < 3) return result;

    // Strategy 1: Remove redundant rapids
    result.optimized.moves = this._removeRedundantRapids(moves);

    // Strategy 2: Combine consecutive rapids
    result.optimized.moves = this._combineRapids(result.optimized.moves);

    // Strategy 3: Optimize rapid path (nearest neighbor)
    if (options.reorderOperations !== false) {
      result.optimized.moves = this._optimizeRapidPath(result.optimized.moves, options);
    }
    // Calculate savings
    result.savings = this._calculateSavings(moves, result.optimized.moves);

    return result;
  },
  _removeRedundantRapids(moves) {
    const optimized = [];

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const next = moves[i + 1];

      // Skip rapid if next move is also rapid to same position
      if (move.type === 'rapid' && next?.type === 'rapid') {
        if (move.x === next.x && move.y === next.y && move.z === next.z) {
          continue;
        }
      }
      optimized.push(move);
    }
    return optimized;
  },
  _combineRapids(moves) {
    const optimized = [];

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const next = moves[i + 1];

      // Combine consecutive Z-only rapids
      if (move.type === 'rapid' && next?.type === 'rapid') {
        if (move.x === next.x && move.y === next.y && move.z !== next.z) {
          // Skip intermediate Z move
          optimized.push({ ...move, z: next.z });
          i++; // Skip next
          continue;
        }
      }
      optimized.push(move);
    }
    return optimized;
  },
  _optimizeRapidPath(moves, options) {
    // Group moves by operation (between rapids at safe Z)
    const operations = [];
    let currentOp = [];

    for (const move of moves) {
      currentOp.push(move);

      // End of operation marker (rapid to safe Z)
      if (move.type === 'rapid' && move.z > 0.05) {
        if (currentOp.length > 1) {
          operations.push([...currentOp]);
        }
        currentOp = [];
      }
    }
    if (currentOp.length > 0) {
      operations.push(currentOp);
    }
    // For now, return as-is (nearest neighbor would go here)
    // Full implementation would reorder operations

    return moves;
  },
  _calculateSavings(original, optimized) {
    const calcRapidDist = (moves) => {
      let dist = 0;
      for (let i = 1; i < moves.length; i++) {
        if (moves[i].type === 'rapid') {
          const dx = (moves[i].x || 0) - (moves[i-1].x || 0);
          const dy = (moves[i].y || 0) - (moves[i-1].y || 0);
          const dz = (moves[i].z || 0) - (moves[i-1].z || 0);
          dist += Math.sqrt(dx*dx + dy*dy + dz*dz);
        }
      }
      return dist;
    };
    const origDist = calcRapidDist(original);
    const optDist = calcRapidDist(optimized);
    const savedDist = origDist - optDist;

    // Estimate time savings (assuming 400 IPM rapid)
    const estimatedTime = (savedDist / 400) * 60; // seconds

    return {
      distance: savedDist.toFixed(2),
      percentage: origDist > 0 ? ((savedDist / origDist) * 100).toFixed(1) : 0,
      estimatedTime: estimatedTime.toFixed(1)
    };
  },
  init() {
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_RAPIDS_OPTIMIZER] v1.0 initialized');
    window.PRISM_RAPIDS_OPTIMIZER = this;
    window.optimizeRapids = this.optimize.bind(this);
    return this;
  }
};
// PRISM_WORKFLOW_TEST_HARNESS v1.0.0
// End-to-end testing for complete workflow

const PRISM_WORKFLOW_TEST_HARNESS = {
  version: '1.0.0',

  testCases: [
    {
      name: 'Simple Pocket - Aluminum',
      input: { type: 'pocket', width: 2, length: 3, depth: 0.5 },
      material: 'aluminum_6061',
      expectedResults: { hasFeatures: true, hasTools: true, hasToolpath: true, hasGcode: true }
    },
    {
      name: 'Hole Pattern - Steel',
      input: { type: 'hole', diameter: 0.5, depth: 1, pattern: 'bolt_circle', count: 6 },
      material: 'steel_4140',
      expectedResults: { hasFeatures: true, hasTools: true, hasToolpath: true, hasGcode: true }
    },
    {
      name: 'Contour - Titanium',
      input: { type: 'contour', profile: 'rectangle', width: 4, length: 4 },
      material: 'titanium_6al4v',
      expectedResults: { hasFeatures: true, hasTools: true, hasToolpath: true, hasGcode: true }
    }
  ],

  /**
   * Run all tests
   */
  async runAll() {
    console.log('[TEST HARNESS] Running all tests...');
    const results = [];

    for (const testCase of this.testCases) {
      const result = await this.runTest(testCase);
      results.push(result);
    }
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(`[TEST HARNESS] Complete: ${passed} passed, ${failed} failed`);

    return {
      total: results.length,
      passed,
      failed,
      results
    };
  },
  /**
   * Run a single test
   */
  async runTest(testCase) {
    const result = {
      name: testCase.name,
      passed: true,
      steps: [],
      errors: [],
      duration: 0
    };
    const startTime = Date.now();

    try {
      // Step 1: Feature Recognition
      let features = null;
      if (typeof recognizeFeatures === 'function') {
        features = recognizeFeatures(testCase.input);
        result.steps.push({ name: 'Feature Recognition', passed: features?.features?.length > 0 });
      } else {
        result.steps.push({ name: 'Feature Recognition', passed: false, error: 'Function not found' });
      }
      // Step 2: Material Identification
      let material = null;
      if (typeof identifyMaterial === 'function') {
        material = identifyMaterial(testCase.material);
        result.steps.push({ name: 'Material Identification', passed: !!material?.material });
      } else {
        result.steps.push({ name: 'Material Identification', passed: false, error: 'Function not found' });
      }
      // Step 3: Toolpath Generation
      let toolpath = null;
      if (typeof synthesizeToolpath === 'function') {
        toolpath = synthesizeToolpath(testCase.input, material, { diameter: 0.5 });
        result.steps.push({ name: 'Toolpath Generation', passed: toolpath?.moves?.length > 0 });
      } else {
        result.steps.push({ name: 'Toolpath Generation', passed: false, error: 'Function not found' });
      }
      // Step 4: G-code Generation
      let gcode = null;
      if (typeof generateGCode === 'function') {
        gcode = generateGCode([toolpath], 'fanuc_0i');
        result.steps.push({ name: 'G-code Generation', passed: gcode?.gcode?.length > 0 });
      } else {
        result.steps.push({ name: 'G-code Generation', passed: false, error: 'Function not found' });
      }
      // Check all steps passed
      result.passed = result.steps.every(s => s.passed);

    } catch (error) {
      result.passed = false;
      result.errors.push(error.message);
    }
    result.duration = Date.now() - startTime;

    return result;
  },
  init() {
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_WORKFLOW_TEST_HARNESS] v1.0 initialized');
    window.PRISM_WORKFLOW_TEST_HARNESS = this;
    window.runWorkflowTests = this.runAll.bind(this);
    window.runWorkflowTest = this.runTest.bind(this);
    return this;
  }
};
// Initialize all new systems
setTimeout(() => PRISM_BOUNDARY_VALIDATOR.init(), 5400);
setTimeout(() => PRISM_USER_OVERRIDE_SYSTEM.init(), 5500);
setTimeout(() => PRISM_REALTIME_PREVIEW_SYSTEM.init(), 5600);
setTimeout(() => PRISM_RAPIDS_OPTIMIZER.init(), 5700);
setTimeout(() => PRISM_WORKFLOW_TEST_HARNESS.init(), 5800);

(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Workflow completion systems loaded (Boundary, Override, Preview, Rapids, Tests)');

// PRISM_100_PERCENT_COMPLETENESS v1.0.0
// Comprehensive module ensuring 100% completeness across all systems
// - Error handling with user-friendly messages
// - Edge case detection and handling
// - Full system integration verification
// - Fallback mechanisms for every operation

const PRISM_100_PERCENT_COMPLETENESS = {
  version: '1.0.0',

  // USER-FRIENDLY ERROR MESSAGES

  errorMessages: {
    // Input errors
    NO_INPUT: {
      code: 'ERR_001',
      message: 'No input provided',
      userMessage: 'Please provide a part description, upload a CAD file, or enter feature dimensions to get started.',
      suggestion: 'Try describing your part like "2x3 inch pocket, 0.5 deep in aluminum"'
    },
    INVALID_DIMENSIONS: {
      code: 'ERR_002',
      message: 'Invalid dimensions',
      userMessage: 'The dimensions you entered are not valid. Please check that all values are positive numbers.',
      suggestion: 'Dimensions should be positive numbers, e.g., width: 2.5, depth: 0.75'
    },
    NEGATIVE_VALUE: {
      code: 'ERR_003',
      message: 'Negative value detected',
      userMessage: 'Negative dimensions are not allowed. All measurements must be positive.',
      suggestion: 'Enter positive values for all dimensions'
    },
    // Material errors
    UNKNOWN_MATERIAL: {
      code: 'ERR_010',
      message: 'Unknown material',
      userMessage: 'We could not identify the material. Using aluminum 6061 as default.',
      suggestion: 'Specify materials like "aluminum 6061", "steel 4140", or "titanium 6Al-4V"'
    },
    EXOTIC_MATERIAL_WARNING: {
      code: 'WARN_011',
      message: 'Exotic material detected',
      userMessage: 'This is an advanced material that requires special tooling and parameters. Results should be verified by a machinist.',
      suggestion: 'Consider consulting with a materials specialist for optimal results'
    },
    // Geometry errors
    DEEP_POCKET_WARNING: {
      code: 'WARN_020',
      message: 'Deep pocket detected',
      userMessage: 'This pocket has a high depth-to-width ratio. Special tooling and multiple passes may be required.',
      suggestion: 'Consider using extended reach tools or roughing in multiple depth passes'
    },
    THIN_WALL_WARNING: {
      code: 'WARN_021',
      message: 'Thin wall detected',
      userMessage: 'Thin walls detected that may deflect during machining. Reduced feeds and speeds recommended.',
      suggestion: 'Use climb milling and reduced depth of cut for thin walls'
    },
    SMALL_RADIUS_WARNING: {
      code: 'WARN_022',
      message: 'Small internal radius',
      userMessage: 'Small internal corners require small tools which may limit feed rates.',
      suggestion: 'Consider increasing corner radii if design allows'
    },
    // Tool errors
    NO_SUITABLE_TOOL: {
      code: 'ERR_030',
      message: 'No suitable tool found',
      userMessage: 'We could not find a suitable tool for this operation. Using a general-purpose tool.',
      suggestion: 'Check if the feature dimensions are within standard tool ranges'
    },
    TOOL_TOO_LARGE: {
      code: 'ERR_031',
      message: 'Tool too large for feature',
      userMessage: 'The selected tool is too large for this feature. Selecting a smaller alternative.',
      suggestion: 'Feature width must be at least 1.5x the tool diameter'
    },
    // Machine errors
    EXCEEDS_TRAVEL: {
      code: 'ERR_040',
      message: 'Exceeds machine travel',
      userMessage: 'The part size exceeds the machine's working envelope. Please select a larger machine.',
      suggestion: 'Check machine specifications or split the operation'
    },
    EXCEEDS_RPM: {
      code: 'WARN_041',
      message: 'Exceeds maximum RPM',
      userMessage: 'Optimal RPM exceeds machine capability. Speed has been limited to machine maximum.',
      suggestion: 'Consider a machine with higher spindle speed for small tools'
    },
    // Toolpath errors
    COLLISION_DETECTED: {
      code: 'ERR_050',
      message: 'Collision detected',
      userMessage: 'A potential collision was detected in the toolpath. The path has been adjusted.',
      suggestion: 'Review the toolpath preview and check fixture clearance'
    },
    BOUNDARY_VIOLATION: {
      code: 'ERR_051',
      message: 'Boundary violation',
      userMessage: 'The toolpath extends beyond the stock material. Boundaries have been adjusted.',
      suggestion: 'Verify stock dimensions match your actual material'
    },
    // G-code errors
    UNSUPPORTED_CONTROLLER: {
      code: 'ERR_060',
      message: 'Unsupported controller',
      userMessage: 'The specified controller is not in our database. Using generic Fanuc-compatible output.',
      suggestion: 'Check our supported controller list or request your controller be added'
    },
    // General
    UNKNOWN_ERROR: {
      code: 'ERR_999',
      message: 'Unknown error',
      userMessage: 'An unexpected error occurred. Please try again or contact support.',
      suggestion: 'If the problem persists, please report it with your input details'
    }
  },
  /**
   * Get user-friendly error message
   */
  getErrorMessage(errorCode) {
    return this.errorMessages[errorCode] || this.errorMessages.UNKNOWN_ERROR;
  },
  /**
   * Format error for display
   */
  formatError(errorCode, details = {}) {
    const err = this.getErrorMessage(errorCode);
    return {
      code: err.code,
      message: err.message,
      userMessage: err.userMessage,
      suggestion: err.suggestion,
      details,
      timestamp: new Date().toISOString()
    };
  },
  // EDGE CASE DETECTION

  edgeCaseDetectors: {
    /**
     * Detect deep pockets (high aspect ratio)
     */
    detectDeepPocket(feature) {
      if (feature.type !== 'pocket') return null;

      const width = Math.min(feature.width || feature.params?.width || 999,
                            feature.length || feature.params?.length || 999);
      const depth = feature.depth || feature.params?.depth || 0;

      if (width === 0) return null;

      const aspectRatio = depth / width;

      if (aspectRatio > 4) {
        return {
          type: 'DEEP_POCKET_EXTREME',
          aspectRatio,
          recommendation: 'Use pecking cycle with extended reach tool',
          maxDoc: width * 0.25,
          requiresSpecialTool: true
        };
      } else if (aspectRatio > 2) {
        return {
          type: 'DEEP_POCKET',
          aspectRatio,
          recommendation: 'Use multiple depth passes with chip clearing',
          maxDoc: width * 0.5,
          requiresSpecialTool: false
        };
      }
      return null;
    },
    /**
     * Detect thin walls
     */
    detectThinWall(feature) {
      const wallThickness = feature.wallThickness || feature.params?.wallThickness;

      if (wallThickness && wallThickness < 0.1) {
        return {
          type: 'THIN_WALL_EXTREME',
          thickness: wallThickness,
          recommendation: 'Use very light cuts, consider support',
          maxDoc: wallThickness * 0.1,
          feedReduction: 0.5
        };
      } else if (wallThickness && wallThickness < 0.25) {
        return {
          type: 'THIN_WALL',
          thickness: wallThickness,
          recommendation: 'Reduce cutting forces, use climb milling',
          maxDoc: wallThickness * 0.2,
          feedReduction: 0.7
        };
      }
      return null;
    },
    /**
     * Detect small internal radii
     */
    detectSmallRadius(feature) {
      const cornerRadius = feature.cornerRadius || feature.params?.cornerRadius;

      if (cornerRadius && cornerRadius < 0.0625) { // < 1/16"
        return {
          type: 'SMALL_RADIUS',
          radius: cornerRadius,
          maxToolDiameter: cornerRadius * 2,
          recommendation: 'Use tool diameter <= ' + (cornerRadius * 2).toFixed(4) + '"'
        };
      }
      return null;
    }