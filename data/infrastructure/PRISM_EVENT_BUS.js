// ═══════════════════════════════════════════════════════════════════════════════
// PRISM_EVENT_BUS - Extracted from PRISM v8.89 Monolith
// Source: PRISM_v8_89_002_TRUE_100_PERCENT.html
// Lines: 58540-58685 (146 lines)
// Extracted: 2026-01-30
// Purpose: Event pub/sub system
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_EVENT_BUS = {
    version: '1.0.0',

    // Subscriber registry: { eventName: [{ id, callback, options }] }
    subscribers: {},

    // Event history for debugging (configurable limit)
    history: [],
    historyLimit: 100,

    // Generate unique subscriber IDs
    _nextId: 1,
    _generateId() { return `sub_${this._nextId++}`; },

    /**
     * Subscribe to an event
     * @param {string} event - Event name (supports wildcards: 'layer3:*')
     * @param {function} callback - Handler function(data, meta)
     * @param {object} options - { once: false, priority: 0 }
     * @returns {string} Subscription ID for unsubscribing
     */
    subscribe(event, callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new Error(`PRISM_EVENT_BUS: Callback must be a function`);
        }
        const id = this._generateId();
        const subscription = {
            id,
            callback,
            once: options.once || false,
            priority: options.priority || 0
        };
        if (!this.subscribers[event]) {
            this.subscribers[event] = [];
        }
        this.subscribers[event].push(subscription);
        this.subscribers[event].sort((a, b) => b.priority - a.priority);

        return id;
    },
    /**
     * Subscribe to an event once (auto-unsubscribes after first call)
     */
    once(event, callback, options = {}) {
        return this.subscribe(event, callback, { ...options, once: true });
    },
    /**
     * Unsubscribe from an event
     * @param {string} subscriptionId - ID returned from subscribe()
     */
    unsubscribe(subscriptionId) {
        for (const event in this.subscribers) {
            const idx = this.subscribers[event].findIndex(s => s.id === subscriptionId);
            if (idx !== -1) {
                this.subscribers[event].splice(idx, 1);
                return true;
            }
        }
        return false;
    },
    /**
     * Publish an event to all subscribers
     * @param {string} event - Event name
     * @param {any} data - Event payload
     * @param {object} meta - Optional metadata { source: 'moduleName' }
     * @returns {number} Number of handlers called
     */
    publish(event, data, meta = {}) {
        const eventRecord = {
            event,
            data,
            meta: {
                ...meta,
                timestamp: Date.now(),
                source: meta.source || 'unknown'
            }
        };
        // Add to history
        this.history.push(eventRecord);
        if (this.history.length > this.historyLimit) {
            this.history.shift();
        }
        // Collect matching subscribers (exact match + wildcards)
        const handlers = [];

        // Exact match
        if (this.subscribers[event]) {
            handlers.push(...this.subscribers[event]);
        }
        // Wildcard matches (e.g., 'layer3:*' matches 'layer3:voronoi:complete')
        for (const pattern in this.subscribers) {
            if (pattern.includes('*')) {
                const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                if (regex.test(event) && pattern !== event) {
                    handlers.push(...this.subscribers[pattern]);
                }
            }
        }
        // Sort combined handlers by priority
        handlers.sort((a, b) => b.priority - a.priority);

        // Execute handlers
        const toRemove = [];
        for (const handler of handlers) {
            try {
                handler.callback(data, eventRecord.meta);
            } catch (error) {
                console.error(`[PRISM_EVENT_BUS] Error in handler for '${event}':`, error);
            }
            if (handler.once) {
                toRemove.push(handler.id);
            }
        }
        // Remove one-time handlers
        toRemove.forEach(id => this.unsubscribe(id));

        return handlers.length;
    },
    /**
     * Get event history for debugging
     */
    getHistory(filter = null) {
        if (!filter) return [...this.history];
        return this.history.filter(e => e.event.includes(filter));
    },
    /**
     * Get subscription statistics
     */
    getStats() {
        const stats = { total: 0, byEvent: {} };
        for (const event in this.subscribers) {
            const count = this.subscribers[event].length;
            stats.byEvent[event] = count;
            stats.total += count;
        }
        return stats;
    },
    /**
     * Clear all subscriptions (for testing/reset)
     */
    clear() {
        this.subscribers = {};
        this.history = [];
        this._nextId = 1;
    }
};
