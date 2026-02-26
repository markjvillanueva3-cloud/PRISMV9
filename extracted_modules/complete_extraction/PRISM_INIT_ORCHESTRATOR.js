const PRISM_INIT_ORCHESTRATOR = {
  version: '1.0.0',
  initialized: false,
  moduleStatus: {},
  initQueue: [],

  // Track which modules have been initialized
  markInitialized(moduleName) {
    this.moduleStatus[moduleName] = {
      initialized: true,
      timestamp: Date.now()
    };
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log(`[InitOrchestrator] ✓ ${moduleName} initialized`);
  },
  // Check if a module is initialized
  isInitialized(moduleName) {
    return this.moduleStatus[moduleName]?.initialized || false;
  },
  // Wait for dependencies before initializing
  async waitForDependencies(moduleName, dependencies = []) {
    for (const dep of dependencies) {
      let attempts = 0;
      while (!this.isInitialized(dep) && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (!this.isInitialized(dep)) {
        console.warn(`[InitOrchestrator] Timeout waiting for ${dep}`);
      }
    }
  },
  // Safe DOM element getter with null check
  getElement(id, context = document) {
    const el = context.getElementById ? context.getElementById(id) : document.getElementById(id);
    if (!el) {
      // Don't spam console for elements that might load later
      return null;
    }
    return el;
  },
  // Safe querySelector with null check
  query(selector, context = document) {
    try {
      return context.querySelector(selector);
    } catch (e) {
      console.warn(`[InitOrchestrator] Invalid selector: ${selector}`);
      return null;
    }
  },
  // Safe event listener with automatic tracking
  _listeners: [],

  addListener(element, event, handler, options) {
    if (!element) return null;
    element.addEventListener(event, handler, options);
    const listener = { element, event, handler, options };
    this._listeners.push(listener);
    return listener;
  },
  removeListener(listener) {
    if (!listener) return;
    listener.element.removeEventListener(listener.event, listener.handler, listener.options);
    const idx = this._listeners.indexOf(listener);
    if (idx > -1) this._listeners.splice(idx, 1);
  },
  removeAllListeners() {
    this._listeners.forEach(l => {
      l.element.removeEventListener(l.event, l.handler, l.options);
    });
    this._listeners = [];
  },
  // Safe async wrapper
  async safeAsync(fn, errorMsg = 'Async operation failed') {
    try {
      return await fn();
    } catch (e) {
      console.error(`[InitOrchestrator] ${errorMsg}:`, e);
      return null;
    }
  },
  // Get initialization status report
  getStatus() {
    return {
      totalModules: Object.keys(this.moduleStatus).length,
      initialized: Object.values(this.moduleStatus).filter(m => m.initialized).length,
      modules: { ...this.moduleStatus }
    };
  }
};
// Global shortcuts
window.PRISM_INIT = PRISM_INIT_ORCHESTRATOR;
window.$id = (id) => PRISM_INIT_ORCHESTRATOR.getElement(id);
window.$q = (sel) => PRISM_INIT_ORCHESTRATOR.query(sel);
window.$on = (el, evt, fn, opts) => PRISM_INIT_ORCHESTRATOR.addListener(el, evt, fn, opts);

console.log('[PRISM_INIT_ORCHESTRATOR] v1.0 - Initialization manager ready');

// PRISM_ERROR_HANDLER - Global error and promise rejection handler

const PRISM_ERROR_HANDLER = {
  version: '1.0.0',
  errors: [],
  maxErrors: 100,

  init() {
    // Global error handler
    window.onerror = (msg, url, line, col, error) => {
      this.logError({
        type: 'error',
        message: msg,
        url: url,
        line: line,
        column: col,
        stack: error?.stack
      });
      return false; // Don't prevent default handling
    };
    // Unhandled promise rejection handler
    window.onunhandledrejection = (event) => {
      this.logError({
        type: 'unhandledrejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack
      });
    };
    console.log('[PRISM_ERROR_HANDLER] Global error handling initialized');
  },
  logError(error) {
    error.timestamp = Date.now();
    this.errors.push(error);

    // Keep only last N errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
    // Log to console in development
    console.error('[PRISM Error]', error.type, error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  },
  getErrors() {
    return [...this.errors];
  },
  clearErrors() {
    this.errors = [];
  },
  // Safe wrapper for async functions
  async safe(asyncFn, fallbackValue = null, errorContext = '') {
    try {
      return await asyncFn();
    } catch (e) {
      this.logError({
        type: 'caught',
        message: e.message,
        context: errorContext,
        stack: e.stack
      });
      return fallbackValue;
    }
  }
}