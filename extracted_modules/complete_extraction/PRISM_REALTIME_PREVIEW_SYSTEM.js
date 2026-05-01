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
}