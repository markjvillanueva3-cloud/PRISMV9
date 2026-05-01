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
}