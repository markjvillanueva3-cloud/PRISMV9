const PRISM_INIT_SEQUENCER = {
  version: '1.0.0',
  phases: {
    CORE: 1,      // Core utilities, error handling
    DATABASE: 2,  // Data access layers
    ENGINE: 3,    // Calculation engines
    UI: 4,        // UI components
    INTEGRATION: 5 // Cross-module integration
  },
  _modules: [],
  _initialized: new Set(),
  _running: false,

  // Register a module for initialization
  register(moduleName, initFn, phase = 3, dependencies = []) {
    this._modules.push({
      name: moduleName,
      init: initFn,
      phase: phase,
      dependencies: dependencies,
      registered: Date.now()
    })