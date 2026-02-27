/**
 * PRISM_FEATURE_HISTORY_MANAGER
 * Extracted from PRISM v8.89.002 monolith
 * References: 21
 * Lines: 485
 * Session: R2.3.1 Wave 2 Engine Gap Extraction
 */

const PRISM_FEATURE_HISTORY_MANAGER = {
  version: '1.0.0',

  // HISTORY STATE
  state: {
    features: [],
    currentIndex: -1,
    undoStack: [],
    redoStack: [],
    maxUndoLevels: 50,
    dependencies: new Map(),  // Feature dependency graph
    parameters: new Map(),    // Global parameters
    rollbackPoint: null
  },
  // FEATURE TYPES
  featureTypes: {
    // Sketch-based features
    EXTRUDE: { category: 'sketch', requires: ['sketch'], icon: '⬆' },
    REVOLVE: { category: 'sketch', requires: ['sketch', 'axis'], icon: '↻' },
    SWEEP: { category: 'sketch', requires: ['sketch', 'path'], icon: '〰' },
    LOFT: { category: 'sketch', requires: ['sketches'], icon: '⧫' },

    // Placed features
    HOLE: { category: 'placed', requires: ['face', 'location'], icon: '○' },
    THREAD: { category: 'placed', requires: ['hole'], icon: '螺' },
    FILLET: { category: 'placed', requires: ['edges'], icon: '◠' },
    CHAMFER: { category: 'placed', requires: ['edges'], icon: '◢' },
    SHELL: { category: 'placed', requires: ['faces'], icon: '⊡' },

    // Boolean operations
    CUT: { category: 'boolean', requires: ['body', 'tool'], icon: '−' },
    JOIN: { category: 'boolean', requires: ['bodies'], icon: '+' },
    INTERSECT: { category: 'boolean', requires: ['bodies'], icon: '∩' },

    // Pattern features
    LINEAR_PATTERN: { category: 'pattern', requires: ['feature', 'direction'], icon: '|||' },
    CIRCULAR_PATTERN: { category: 'pattern', requires: ['feature', 'axis'], icon: '⟳' },
    MIRROR: { category: 'pattern', requires: ['feature', 'plane'], icon: '⟷' },

    // Reference features
    SKETCH: { category: 'reference', requires: ['plane'], icon: '▭' },
    PLANE: { category: 'reference', requires: [], icon: '◻' },
    AXIS: { category: 'reference', requires: [], icon: '|' }
  },
  // FEATURE MANAGEMENT

  // Add a feature to history
  addFeature(type, params, dependencies = []) {
    const featureType = this.featureTypes[type];
    if (!featureType) {
      console.error(`Unknown feature type: ${type}`);
      return null;
    }
    const feature = {
      id: `feature_${Date.now()}`,
      type: type,
      category: featureType.category,
      params: { ...params },
      dependencies: dependencies,
      timestamp: Date.now(),
      suppressed: false,
      error: null,
      geometry: null,
      icon: featureType.icon
    };
    // Clear redo stack on new feature
    this.state.redoStack = [];

    // Add to history
    this.state.features.push(feature);
    this.state.currentIndex = this.state.features.length - 1;

    // Update dependencies
    for (const dep of dependencies) {
      if (!this.state.dependencies.has(dep)) {
        this.state.dependencies.set(dep, []);
      }
      this.state.dependencies.get(dep).push(feature.id);
    }
    // Add to undo stack
    this.state.undoStack.push({
      action: 'add',
      feature: feature.id
    });

    // Trim undo stack if needed
    if (this.state.undoStack.length > this.state.maxUndoLevels) {
      this.state.undoStack.shift();
    }
    console.log(`[Feature History] Added: ${type} (${feature.id})`);

    // Emit event
    if (typeof PRISM_EVENT_MANAGER !== 'undefined') {
      PRISM_EVENT_MANAGER.emit('feature:added', feature);
    }
    return feature;
  },
  // Get feature by ID
  getFeature(featureId) {
    return this.state.features.find(f => f.id === featureId);
  },
  // Get all features
  getAllFeatures() {
    return this.state.features;
  },
  // Get active features (non-suppressed)
  getActiveFeatures() {
    return this.state.features.filter(f => !f.suppressed);
  },
  // Update feature parameters
  updateFeature(featureId, newParams) {
    const feature = this.getFeature(featureId);
    if (!feature) return false;

    // Save for undo
    const oldParams = { ...feature.params };
    this.state.undoStack.push({
      action: 'update',
      feature: featureId,
      oldParams: oldParams
    });

    // Update parameters
    feature.params = { ...feature.params, ...newParams };

    // Mark dependent features for rebuild
    this.markDependentsForRebuild(featureId);

    // Emit event
    if (typeof PRISM_EVENT_MANAGER !== 'undefined') {
      PRISM_EVENT_MANAGER.emit('feature:updated', feature);
    }
    return true;
  },
  // Delete feature
  deleteFeature(featureId) {
    const index = this.state.features.findIndex(f => f.id === featureId);
    if (index < 0) return false;

    const feature = this.state.features[index];

    // Check for dependents
    const dependents = this.getDependents(featureId);
    if (dependents.length > 0) {
      console.warn(`[Feature History] Feature has ${dependents.length} dependents`);
    }
    // Save for undo
    this.state.undoStack.push({
      action: 'delete',
      feature: feature,
      index: index
    });

    // Remove from features
    this.state.features.splice(index, 1);

    // Update current index
    if (this.state.currentIndex >= this.state.features.length) {
      this.state.currentIndex = this.state.features.length - 1;
    }
    // Emit event
    if (typeof PRISM_EVENT_MANAGER !== 'undefined') {
      PRISM_EVENT_MANAGER.emit('feature:deleted', featureId);
    }
    return true;
  },
  // Suppress/unsuppress feature
  suppressFeature(featureId, suppress = true) {
    const feature = this.getFeature(featureId);
    if (!feature) return false;

    feature.suppressed = suppress;

    // Emit event
    if (typeof PRISM_EVENT_MANAGER !== 'undefined') {
      PRISM_EVENT_MANAGER.emit('feature:suppressed', {
        id: featureId,
        suppressed: suppress
      });
    }
    return true;
  },
  // Reorder feature in timeline
  reorderFeature(featureId, newIndex) {
    const currentIndex = this.state.features.findIndex(f => f.id === featureId);
    if (currentIndex < 0 || newIndex < 0 || newIndex >= this.state.features.length) {
      return false;
    }
    // Save for undo
    this.state.undoStack.push({
      action: 'reorder',
      feature: featureId,
      oldIndex: currentIndex,
      newIndex: newIndex
    });

    // Move feature
    const [feature] = this.state.features.splice(currentIndex, 1);
    this.state.features.splice(newIndex, 0, feature);

    return true;
  },
  // DEPENDENCY MANAGEMENT

  // Get features that depend on this one
  getDependents(featureId) {
    return this.state.dependencies.get(featureId) || [];
  },
  // Get features this one depends on
  getDependencies(featureId) {
    const feature = this.getFeature(featureId);
    return feature ? feature.dependencies : [];
  },
  // Mark dependent features for rebuild
  markDependentsForRebuild(featureId) {
    const dependents = this.getDependents(featureId);
    for (const depId of dependents) {
      const dep = this.getFeature(depId);
      if (dep) {
        dep.needsRebuild = true;
      }
    }
  },
  // Check if feature can be deleted (no dependents or allow cascade)
  canDelete(featureId, allowCascade = false) {
    const dependents = this.getDependents(featureId);
    return allowCascade || dependents.length === 0;
  },
  // UNDO / REDO

  undo() {
    if (this.state.undoStack.length === 0) return false;

    const action = this.state.undoStack.pop();

    switch (action.action) {
      case 'add':
        // Remove the added feature
        const addIndex = this.state.features.findIndex(f => f.id === action.feature);
        if (addIndex >= 0) {
          const removed = this.state.features.splice(addIndex, 1)[0];
          this.state.redoStack.push({
            action: 'add',
            feature: removed
          });
        }
        break;

      case 'delete':
        // Re-add the deleted feature
        this.state.features.splice(action.index, 0, action.feature);
        this.state.redoStack.push({
          action: 'delete',
          feature: action.feature.id,
          index: action.index
        });
        break;

      case 'update':
        // Restore old parameters
        const feature = this.getFeature(action.feature);
        if (feature) {
          const currentParams = { ...feature.params };
          feature.params = action.oldParams;
          this.state.redoStack.push({
            action: 'update',
            feature: action.feature,
            oldParams: currentParams
          });
        }
        break;

      case 'reorder':
        // Reverse the reorder
        const idx = this.state.features.findIndex(f => f.id === action.feature);
        if (idx >= 0) {
          const [feat] = this.state.features.splice(idx, 1);
          this.state.features.splice(action.oldIndex, 0, feat);
          this.state.redoStack.push({
            action: 'reorder',
            feature: action.feature,
            oldIndex: action.newIndex,
            newIndex: action.oldIndex
          });
        }
        break;
    }
    console.log(`[Feature History] Undo: ${action.action}`);
    return true;
  },
  redo() {
    if (this.state.redoStack.length === 0) return false;

    const action = this.state.redoStack.pop();

    switch (action.action) {
      case 'add':
        // Re-add the feature
        this.state.features.push(action.feature);
        this.state.undoStack.push({
          action: 'add',
          feature: action.feature.id
        });
        break;

      case 'delete':
        // Re-delete
        const delIndex = this.state.features.findIndex(f => f.id === action.feature);
        if (delIndex >= 0) {
          const removed = this.state.features.splice(delIndex, 1)[0];
          this.state.undoStack.push({
            action: 'delete',
            feature: removed,
            index: delIndex
          });
        }
        break;

      case 'update':
        const feature = this.getFeature(action.feature);
        if (feature) {
          const currentParams = { ...feature.params };
          feature.params = action.oldParams;
          this.state.undoStack.push({
            action: 'update',
            feature: action.feature,
            oldParams: currentParams
          });
        }
        break;

      case 'reorder':
        const idx = this.state.features.findIndex(f => f.id === action.feature);
        if (idx >= 0) {
          const [feat] = this.state.features.splice(idx, 1);
          this.state.features.splice(action.newIndex, 0, feat);
          this.state.undoStack.push({
            action: 'reorder',
            feature: action.feature,
            oldIndex: idx,
            newIndex: action.newIndex
          });
        }
        break;
    }
    console.log(`[Feature History] Redo: ${action.action}`);
    return true;
  },
  // ROLLBACK

  // Set rollback point
  setRollbackPoint() {
    this.state.rollbackPoint = {
      features: JSON.parse(JSON.stringify(this.state.features)),
      currentIndex: this.state.currentIndex,
      timestamp: Date.now()
    };
    console.log('[Feature History] Rollback point set');
  },
  // Rollback to saved point
  rollback() {
    if (!this.state.rollbackPoint) {
      console.warn('[Feature History] No rollback point set');
      return false;
    }
    this.state.features = this.state.rollbackPoint.features;
    this.state.currentIndex = this.state.rollbackPoint.currentIndex;

    console.log('[Feature History] Rolled back to saved point');

    // Emit event
    if (typeof PRISM_EVENT_MANAGER !== 'undefined') {
      PRISM_EVENT_MANAGER.emit('history:rollback');
    }
    return true;
  },
  // Roll to specific feature (rebuild to that point)
  rollToFeature(featureId) {
    const index = this.state.features.findIndex(f => f.id === featureId);
    if (index < 0) return false;

    this.state.currentIndex = index;

    // Mark all features after this as needing rebuild
    for (let i = index + 1; i < this.state.features.length; i++) {
      this.state.features[i].needsRebuild = true;
    }
    console.log(`[Feature History] Rolled to feature: ${featureId}`);
    return true;
  },
  // PARAMETER MANAGEMENT

  // Define a global parameter
  defineParameter(name, value, description = '') {
    this.state.parameters.set(name, {
      value: value,
      description: description,
      usedBy: []
    });
  },
  // Get parameter value
  getParameter(name) {
    const param = this.state.parameters.get(name);
    return param ? param.value : undefined;
  },
  // Update parameter (triggers rebuild of dependent features)
  updateParameter(name, newValue) {
    const param = this.state.parameters.get(name);
    if (!param) return false;

    param.value = newValue;

    // Mark features using this parameter for rebuild
    for (const featureId of param.usedBy) {
      const feature = this.getFeature(featureId);
      if (feature) {
        feature.needsRebuild = true;
      }
    }
    // Emit event
    if (typeof PRISM_EVENT_MANAGER !== 'undefined') {
      PRISM_EVENT_MANAGER.emit('parameter:updated', {
        name: name,
        value: newValue
      });
    }
    return true;
  },
  // Link feature to parameter
  linkFeatureToParameter(featureId, paramName) {
    const param = this.state.parameters.get(paramName);
    if (param && !param.usedBy.includes(featureId)) {
      param.usedBy.push(featureId);
    }
  },
  // EXPORT / IMPORT

  // Export history to JSON
  exportHistory() {
    return {
      version: this.version,
      features: this.state.features,
      parameters: Array.from(this.state.parameters.entries()),
      timestamp: Date.now()
    };
  },
  // Import history from JSON
  importHistory(data) {
    if (data.version !== this.version) {
      console.warn('[Feature History] Version mismatch, may have compatibility issues');
    }
    this.state.features = data.features || [];
    this.state.parameters = new Map(data.parameters || []);
    this.state.currentIndex = this.state.features.length - 1;

    // Rebuild dependency graph
    this.rebuildDependencyGraph();

    return true;
  },
  // Rebuild dependency graph from features
  rebuildDependencyGraph() {
    this.state.dependencies.clear();

    for (const feature of this.state.features) {
      for (const dep of feature.dependencies) {
        if (!this.state.dependencies.has(dep)) {
          this.state.dependencies.set(dep, []);
        }
        this.state.dependencies.get(dep).push(feature.id);
      }
    }
  },
  // RESET

  reset() {
    this.state.features = [];
    this.state.currentIndex = -1;
    this.state.undoStack = [];
    this.state.redoStack = [];
    this.state.dependencies.clear();
    this.state.parameters.clear();
    this.state.rollbackPoint = null;
  }
}