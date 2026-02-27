/**
 * PRISM_EVENT_MANAGER
 * Extracted from PRISM v8.89.002 monolith
 * References: 69
 * Lines: 99
 * Session: R2.3.1 Engine Gap Extraction
 */

const PRISM_EVENT_MANAGER = {
  version: '1.0.0',
  _listeners: new Map(),
  _delegatedHandlers: new Map(),

  // Add event listener with automatic tracking
  on(element, eventType, handler, options = {}) {
    if (!element) {
      console.warn('[EventManager] Cannot add listener to null element');
      return null;
    }
    const id = this._generateId();
    element.addEventListener(eventType, handler, options);

    this._listeners.set(id, {
      element,
      eventType,
      handler,
      options,
      timestamp: Date.now()
    });

    return id;
  },
  // Remove specific listener by ID
  off(id) {
    const listener = this._listeners.get(id);
    if (listener) {
      listener.element.removeEventListener(
        listener.eventType,
        listener.handler,
        listener.options
      );
      this._listeners.delete(id);
      return true;
    }
    return false;
  },
  // Remove all listeners for an element
  offElement(element) {
    let removed = 0;
    for (const [id, listener] of this._listeners) {
      if (listener.element === element) {
        listener.element.removeEventListener(
          listener.eventType,
          listener.handler,
          listener.options
        );
        this._listeners.delete(id);
        removed++;
      }
    }
    return removed;
  },
  // Event delegation - single handler for dynamic content
  delegate(parentSelector, childSelector, eventType, handler) {
    const parent = typeof parentSelector === 'string'
      ? document.querySelector(parentSelector)
      : parentSelector;

    if (!parent) {
      console.warn('[EventManager] Parent element not found:', parentSelector);
      return null;
    }
    const delegatedHandler = (e) => {
      const target = e.target.closest(childSelector);
      if (target && parent.contains(target)) {
        handler.call(target, e, target);
      }
    };
    const id = this.on(parent, eventType, delegatedHandler);
    this._delegatedHandlers.set(id, { parentSelector, childSelector, eventType });

    return id;
  },
  // Clean up all listeners (useful for SPA navigation)
  cleanup() {
    for (const [id, listener] of this._listeners) {
      listener.element.removeEventListener(
        listener.eventType,
        listener.handler,
        listener.options
      );
    }
    this._listeners.clear();
    this._delegatedHandlers.clear();
    console.log('[EventManager] All listeners cleaned up');
  },
  // Get listener stats
  getStats() {
    return {
      totalListeners: this._listeners.size,
      delegatedHandlers: this._delegatedHandlers.size
    };
  },
  _generateId() {
    return 'evt_' + Math.random().toString(36).substr(2, 9);
  }
}