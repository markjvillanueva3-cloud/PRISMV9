const PRISM_STATE = {
  version: '1.0.0',

  // Application state
  _state: {
    // Core selections
    currentMachine: null,
    currentMaterial: null,
    currentTool: null,
    currentOperation: null,

    // UI state
    activePanel: 'setup',
    activeTab: null,
    sidebarOpen: true,

    // User preferences
    units: 'inch',
    theme: 'dark',

    // Session data
    sessionStart: Date.now(),
    lastActivity: Date.now()
  },
  // State change subscribers
  _subscribers: new Map(),
  _nextSubscriberId: 1,

  // Get current state (read-only copy)
  get(key) {
    if (key) {
      return this._state[key];
    }
    return { ...this._state };
  },
  // Update state
  set(key, value) {
    const oldValue = this._state[key];

    if (oldValue !== value) {
      this._state[key] = value;
      this._state.lastActivity = Date.now();

      // Notify subscribers
      this._notify(key, value, oldValue);

      console.log(`[State] ${key}: ${JSON.stringify(oldValue)} → ${JSON.stringify(value)}`);
    }
    return value;
  },
  // Batch update
  update(updates) {
    const changes = [];

    for (const [key, value] of Object.entries(updates)) {
      const oldValue = this._state[key];
      if (oldValue !== value) {
        this._state[key] = value;
        changes.push({ key, value, oldValue });
      }
    }
    if (changes.length > 0) {
      this._state.lastActivity = Date.now();

      // Notify for each change
      for (const change of changes) {
        this._notify(change.key, change.value, change.oldValue);
      }
    }
    return changes;
  },
  // Subscribe to state changes
  subscribe(keyOrKeys, callback) {
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    const id = this._nextSubscriberId++;

    for (const key of keys) {
      if (!this._subscribers.has(key)) {
        this._subscribers.set(key, new Map());
      }
      this._subscribers.get(key).set(id, callback);
    }
    // Return unsubscribe function
    return () => {
      for (const key of keys) {
        this._subscribers.get(key)?.delete(id);
      }
    };
  },
  // Notify subscribers
  _notify(key, newValue, oldValue) {
    const keySubscribers = this._subscribers.get(key);
    if (keySubscribers) {
      for (const callback of keySubscribers.values()) {
        try {
          callback(newValue, oldValue, key);
        } catch (e) {
          console.error('[State] Subscriber error:', e);
        }
      }
    }
    // Also notify wildcard subscribers
    const wildcardSubscribers = this._subscribers.get('*');
    if (wildcardSubscribers) {
      for (const callback of wildcardSubscribers.values()) {
        try {
          callback(newValue, oldValue, key);
        } catch (e) {
          console.error('[State] Wildcard subscriber error:', e);
        }
      }
    }
  },
  // Get state snapshot for debugging
  getSnapshot() {
    return {
      state: { ...this._state },
      subscriberCount: Array.from(this._subscribers.values())
        .reduce((sum, map) => sum + map.size, 0)
    };
  },
  // Reset to initial state
  reset() {
    const initialState = {
      currentMachine: null,
      currentMaterial: null,
      currentTool: null,
      currentOperation: null,
      activePanel: 'setup',
      activeTab: null,
      sidebarOpen: true,
      units: 'inch',
      theme: 'dark',
      sessionStart: Date.now(),
      lastActivity: Date.now()
    };
    this.update(initialState);
  }
}