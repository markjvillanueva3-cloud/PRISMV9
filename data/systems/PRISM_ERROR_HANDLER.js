// PRISM_ERROR_HANDLER - Lines 50808-50870 (63 lines) - Error handling\n\nconst PRISM_ERROR_HANDLER = {
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
};
