const PRISM_STATE_STORE = {
    version: '1.0.0',

    // The actual state (frozen for immutability)
    _state: Object.freeze({
        ui: {
            activeView: 'cad',
            selectedTool: null,
            selectedMaterial: null,
            selectedStrategy: null,
            sidebarOpen: true,
            theme: 'dark'
        },
        cad: {
            loadedParts: [],
            selectedFeatures: [],
            viewMatrix: null,
            displayMode: 'shaded'
        },
        cam: {
            activeOperation: null,
            toolpaths: [],
            stock: null,
            fixtures: []
        },
        computation: {
            inProgress: [],
            results: {},
            errors: []
        },
        session: {
            user: null,
            lastSave: null,
            unsavedChanges: false
        }
    }),

    // Change subscribers: { path: [callbacks] }
    _subscribers: {},

    // History for undo/redo
    _history: [],
    _historyIndex: -1,
    _maxHistory: 50,

    /**
     * Get current state (or subset by path)
     * @param {string} path - Optional dot-notation path (e.g., 'ui.activeView')
     */
    getState(path = null) {
        if (!path) return this._state;

        const parts = path.split('.');
        let value = this._state;
        for (const part of parts) {
            if (value === undefined) return undefined;
            value = value[part];
        }
        return value;
    },
    /**
     * Update state immutably
     * @param {string} path - Dot-notation path to update
     * @param {any} value - New value
     * @param {object} options - { silent: false, addToHistory: true }
     */
    setState(path, value, options = {}) {
        const { silent = false, addToHistory = true } = options;

        // Deep clone current state
        const newState = JSON.parse(JSON.stringify(this._state));

        // Navigate to target and update
        const parts = path.split('.');
        let target = newState;
        for (let i = 0; i < parts.length - 1; i++) {
            if (target[parts[i]] === undefined) {
                target[parts[i]] = {};
            }
            target = target[parts[i]];
        }
        const oldValue = target[parts[parts.length - 1]];
        target[parts[parts.length - 1]] = value;

        // Store in history if changed
        if (addToHistory && JSON.stringify(oldValue) !== JSON.stringify(value)) {
            if (this._historyIndex < this._history.length - 1) {
                this._history = this._history.slice(0, this._historyIndex + 1);
            }
            this._history.push({
                timestamp: Date.now(),
                path,
                oldValue,
                newValue: value
            });

            if (this._history.length > this._maxHistory) {
                this._history.shift();
            }
            this._historyIndex = this._history.length - 1;
        }
        // Freeze and store
        this._state = Object.freeze(newState);

        // Notify subscribers
        if (!silent) {
            this._notifySubscribers(path, value, oldValue);
        }
        // Publish event
        PRISM_EVENT_BUS.publish('state:changed', {
            path,
            oldValue,
            newValue: value
        }, { source: 'PRISM_STATE_STORE' });

        return this._state;
    },
    /**
     * Subscribe to state changes at a path
     * @param {string} path - Path to watch (supports wildcards)
     * @param {function} callback - Called with (newValue, oldValue, path)
     * @returns {function} Unsubscribe function
     */
    subscribe(path, callback) {
        if (!this._subscribers[path]) {
            this._subscribers[path] = [];
        }
        this._subscribers[path].push(callback);

        return () => {
            const idx = this._subscribers[path].indexOf(callback);
            if (idx !== -1) this._subscribers[path].splice(idx, 1);
        };
    },
    _notifySubscribers(changedPath, newValue, oldValue) {
        for (const subscribedPath in this._subscribers) {
            const isMatch = changedPath.startsWith(subscribedPath) ||
                           subscribedPath.startsWith(changedPath) ||
                           subscribedPath === '*';

            if (isMatch) {
                for (const callback of this._subscribers[subscribedPath]) {
                    try {
                        callback(newValue, oldValue, changedPath);
                    } catch (error) {
                        console.error(`[PRISM_STATE_STORE] Subscriber error:`, error);
                    }
                }
            }
        }
    },
    /**
     * Undo last state change
     */
    undo() {
        if (this._historyIndex < 0) return false;

        const change = this._history[this._historyIndex];
        this.setState(change.path, change.oldValue, { addToHistory: false });
        this._historyIndex--;

        PRISM_EVENT_BUS.publish('state:undo', change, { source: 'PRISM_STATE_STORE' });
        return true;
    },
    /**
     * Redo last undone change
     */
    redo() {
        if (this._historyIndex >= this._history.length - 1) return false;

        this._historyIndex++;
        const change = this._history[this._historyIndex];
        this.setState(change.path, change.newValue, { addToHistory: false });

        PRISM_EVENT_BUS.publish('state:redo', change, { source: 'PRISM_STATE_STORE' });
        return true;
    },
    /**
     * Batch multiple state updates (single notification)
     */
    batch(updates) {
        for (const update of updates) {
            this.setState(update.path, update.value, { silent: true, addToHistory: false });
        }
        PRISM_EVENT_BUS.publish('state:batch', { updates }, { source: 'PRISM_STATE_STORE' });
        this._notifySubscribers('*', this._state, null);
    },
    /**
     * Get history for debugging
     */
    getHistory() {
        return {
            entries: [...this._history],
            currentIndex: this._historyIndex,
            canUndo: this._historyIndex >= 0,
            canRedo: this._historyIndex < this._history.length - 1
        };
    },
    /**
     * Reset state (for testing)
     */
    reset(initialState = null) {
        this._state = Object.freeze(initialState || {
            ui: { activeView: 'cad', selectedTool: null, selectedMaterial: null },
            cad: { loadedParts: [], selectedFeatures: [] },
            cam: { activeOperation: null, toolpaths: [] },
            computation: { inProgress: [], results: {}, errors: [] },
            session: { lastSave: null, unsavedChanges: false }
        });
        this._history = [];
        this._historyIndex = -1;
    }
}