// PRISM_ERROR_BOUNDARY - Lines 59367-59520 (154 lines) - Error boundary\n\nconst PRISM_ERROR_BOUNDARY = {
    version: '1.0.0',

    errors: [],
    maxErrors: 100,
    handlers: {},

    /**
     * Wrap a function with error handling
     */
    wrap(moduleId, fn, options = {}) {
        const { critical = false, retries = 0, fallback = null } = options;
        const self = this;

        return async function(...args) {
            let lastError = null;

            for (let attempt = 0; attempt <= retries; attempt++) {
                try {
                    return await fn.apply(this, args);
                } catch (error) {
                    lastError = error;

                    const errorInfo = self._createErrorInfo(moduleId, error, args, attempt);
                    self._recordError(errorInfo);

                    if (attempt < retries) {
                        await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
                        continue;
                    }
                    PRISM_EVENT_BUS.publish('error:occurred', errorInfo, { source: 'ERROR_BOUNDARY' });

                    PRISM_UI_ADAPTER.showError(error, {
                        context: `In module: ${moduleId}`,
                        recoverable: !critical
                    });

                    self._callHandlers(errorInfo);

                    if (fallback !== null) {
                        console.warn(`[PRISM] Using fallback for ${moduleId}`);
                        return typeof fallback === 'function' ? fallback.apply(this, args) : fallback;
                    }
                    if (critical) {
                        throw error;
                    }
                    return null;
                }
            }
        };
    },
    /**
     * Wrap all methods in an object with error handling
     */
    wrapModule(moduleId, obj, options = {}) {
        const wrapped = {};

        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'function') {
                wrapped[key] = this.wrap(`${moduleId}.${key}`, value.bind(obj), options);
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                wrapped[key] = this.wrapModule(`${moduleId}.${key}`, value, options);
            } else {
                wrapped[key] = value;
            }
        }
        return wrapped;
    },
    /**
     * Register a custom error handler
     */
    registerHandler(type, handler) {
        if (!this.handlers[type]) {
            this.handlers[type] = [];
        }
        this.handlers[type].push(handler);
    },
    /**
     * Get recent errors
     */
    getErrors(count = 10) {
        return this.errors.slice(-count);
    },
    /**
     * Get errors by module
     */
    getErrorsByModule(moduleId) {
        return this.errors.filter(e => e.module === moduleId || e.module.startsWith(moduleId + '.'));
    },
    /**
     * Export error report (for bug reports)
     */
    exportReport() {
        return {
            timestamp: Date.now(),
            version: window.PRISM_BUILD_VERSION || 'unknown',
            errors: this.errors.slice(-20),
            state: PRISM_STATE_STORE.getState(),
            userAgent: navigator.userAgent
        };
    },
    _createErrorInfo(moduleId, error, args, attempt) {
        return {
            id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            module: moduleId,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            args: this._safeSerialize(args),
            attempt,
            timestamp: Date.now(),
            state: {
                activeView: PRISM_STATE_STORE.getState('ui.activeView'),
                selectedMaterial: PRISM_STATE_STORE.getState('ui.selectedMaterial')
            }
        };
    },
    _recordError(errorInfo) {
        this.errors.push(errorInfo);
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }
    },
    _callHandlers(errorInfo) {
        const errorType = errorInfo.error.name;

        if (this.handlers[errorType]) {
            for (const handler of this.handlers[errorType]) {
                try { handler(errorInfo); } catch (e) { /* ignore */ }
            }
        }
        if (this.handlers['*']) {
            for (const handler of this.handlers['*']) {
                try { handler(errorInfo); } catch (e) { /* ignore */ }
            }
        }
    },
    _safeSerialize(obj, depth = 0) {
        if (depth > 3) return '[max depth]';
        if (obj === null || obj === undefined) return obj;
        if (typeof obj !== 'object') return obj;

        if (Array.isArray(obj)) {
            return obj.slice(0, 10).map(item => this._safeSerialize(item, depth + 1));
        }
        const result = {};
        for (const [key, value] of Object.entries(obj).slice(0, 20)) {
            result[key] = this._safeSerialize(value, depth + 1);
        }
        return result;
    }
};
