const PRISM_EVENT_SYSTEM = {
    // Create an event bus
    createEventBus(options = {}) {
        return {
            listeners: new Map(),
            onceListeners: new Map(),
            wildcardListeners: [],
            eventHistory: [],
            maxHistory: options.maxHistory || 1000,
            async: options.async || false,
            
            // Subscribe to an event
            on(event, callback, options = {}) {
                const listener = {
                    callback,
                    priority: options.priority || 0,
                    filter: options.filter || null,
                    context: options.context || null,
                    id: Symbol()
                };
                
                if (event === '*') {
                    this.wildcardListeners.push(listener);
                    this._sortByPriority(this.wildcardListeners);
                } else {
                    if (!this.listeners.has(event)) {
                        this.listeners.set(event, []);
                    }
                    this.listeners.get(event).push(listener);
                    this._sortByPriority(this.listeners.get(event));
                }
                
                // Return unsubscribe function
                return () => this.off(event, listener.id);
            },
            
            // Subscribe once
            once(event, callback, options = {}) {
                const wrapper = (data) => {
                    this.off(event, listenerId);
                    callback(data);
                };
                
                const listener = {
                    callback: wrapper,
                    priority: options.priority || 0,
                    filter: options.filter || null,
                    id: Symbol()
                };
                
                const listenerId = listener.id;
                
                if (!this.onceListeners.has(event)) {
                    this.onceListeners.set(event, []);
                }
                this.onceListeners.get(event).push(listener);
                
                return () => this.off(event, listenerId);
            },
            
            // Unsubscribe
            off(event, idOrCallback) {
                const removeFromList = (list) => {
                    const idx = list.findIndex(l => 
                        l.id === idOrCallback || l.callback === idOrCallback
                    );
                    if (idx >= 0) {
                        list.splice(idx, 1);
                        return true;
                    }
                    return false;
                };
                
                if (event === '*') {
                    removeFromList(this.wildcardListeners);
                } else {
                    const listeners = this.listeners.get(event);
                    if (listeners) removeFromList(listeners);
                    
                    const onceListeners = this.onceListeners.get(event);
                    if (onceListeners) removeFromList(onceListeners);
                }
            },
            
            // Emit an event
            emit(event, data = {}, options = {}) {
                const eventData = {
                    type: event,
                    data,
                    timestamp: Date.now(),
                    propagationStopped: false,
                    defaultPrevented: false,
                    
                    stopPropagation() {
                        this.propagationStopped = true;
                    },
                    
                    preventDefault() {
                        this.defaultPrevented = true;
                    }
                };
                
                // Record in history
                this.eventHistory.push({
                    event,
                    data,
                    timestamp: eventData.timestamp
                });
                
                if (this.eventHistory.length > this.maxHistory) {
                    this.eventHistory.shift();
                }
                
                // Collect all relevant listeners
                const listeners = [
                    ...(this.listeners.get(event) || []),
                    ...(this.onceListeners.get(event) || []),
                    ...this.wildcardListeners
                ];
                
                // Sort by priority
                this._sortByPriority(listeners);
                
                // Execute listeners
                if (this.async) {
                    return this._emitAsync(listeners, eventData);
                } else {
                    return this._emitSync(listeners, eventData);
                }
            },
            
            _emitSync(listeners, eventData) {
                for (const listener of listeners) {
                    if (eventData.propagationStopped) break;
                    
                    // Apply filter
                    if (listener.filter && !listener.filter(eventData.data)) {
                        continue;
                    }
                    
                    try {
                        listener.callback.call(listener.context, eventData.data, eventData);
                    } catch (error) {
                        console.error('[EventBus] Listener error:', error);
                    }
                }
                
                // Clear once listeners
                this.onceListeners.delete(eventData.type);
                
                return eventData;
            },
            
            async _emitAsync(listeners, eventData) {
                for (const listener of listeners) {
                    if (eventData.propagationStopped) break;
                    
                    if (listener.filter && !listener.filter(eventData.data)) {
                        continue;
                    }
                    
                    try {
                        await listener.callback.call(listener.context, eventData.data, eventData);
                    } catch (error) {
                        console.error('[EventBus] Async listener error:', error);
                    }
                }
                
                this.onceListeners.delete(eventData.type);
                return eventData;
            },
            
            // Emit after delay
            emitDelayed(event, data, delay) {
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve(this.emit(event, data));
                    }, delay);
                });
            },
            
            // Wait for an event
            waitFor(event, timeout = 0) {
                return new Promise((resolve, reject) => {
                    let timeoutId = null;
                    
                    const unsubscribe = this.once(event, (data) => {
                        if (timeoutId) clearTimeout(timeoutId);
                        resolve(data);
                    });
                    
                    if (timeout > 0) {
                        timeoutId = setTimeout(() => {
                            unsubscribe();
                            reject(new Error(`Timeout waiting for event: ${event}`));
                        }, timeout);
                    }
                });
            },
            
            // Get event history
            getHistory(event = null, limit = 100) {
                let history = this.eventHistory;
                
                if (event) {
                    history = history.filter(h => h.event === event);
                }
                
                return history.slice(-limit);
            },
            
            // Clear all listeners
            clear() {
                this.listeners.clear();
                this.onceListeners.clear();
                this.wildcardListeners = [];
            },
            
            _sortByPriority(list) {
                list.sort((a, b) => b.priority - a.priority);
            }
        };
    },
    
    // Create a message queue
    createMessageQueue(options = {}) {
        return {
            queue: [],
            processing: false,
            maxSize: options.maxSize || 10000,
            processInterval: options.processInterval || 0,
            batchSize: options.batchSize || 1,
            handlers: new Map(),
            deadLetterQueue: [],
            
            // Register a handler for message type
            register(type, handler) {
                this.handlers.set(type, handler);
            },
            
            // Enqueue a message
            enqueue(type, payload, options = {}) {
                if (this.queue.length >= this.maxSize) {
                    console.warn('[MessageQueue] Queue full, dropping message');
                    return false;
                }
                
                this.queue.push({
                    id: Symbol(),
                    type,
                    payload,
                    priority: options.priority || 0,
                    timestamp: Date.now(),
                    retries: 0,
                    maxRetries: options.maxRetries || 3
                });
                
                // Sort by priority
                this.queue.sort((a, b) => b.priority - a.priority);
                
                // Start processing if not already
                if (!this.processing && this.processInterval === 0) {
                    this.processNext();
                }
                
                return true;
            },
            
            // Process next message(s)
            async processNext() {
                if (this.queue.length === 0) {
                    this.processing = false;
                    return;
                }
                
                this.processing = true;
                
                const batch = this.queue.splice(0, this.batchSize);
                
                for (const message of batch) {
                    const handler = this.handlers.get(message.type);
                    
                    if (!handler) {
                        console.warn(`[MessageQueue] No handler for type: ${message.type}`);
                        this.deadLetterQueue.push(message);
                        continue;
                    }
                    
                    try {
                        await handler(message.payload);
                    } catch (error) {
                        console.error('[MessageQueue] Handler error:', error);
                        
                        message.retries++;
                        if (message.retries < message.maxRetries) {
                            // Requeue with lower priority
                            message.priority--;
                            this.queue.push(message);
                        } else {
                            this.deadLetterQueue.push(message);
                        }
                    }
                }
                
                // Continue processing
                if (this.processInterval > 0) {
                    setTimeout(() => this.processNext(), this.processInterval);
                } else if (this.queue.length > 0) {
                    setImmediate(() => this.processNext());
                } else {
                    this.processing = false;
                }
            },
            
            // Start automatic processing
            start() {
                if (this.processInterval > 0) {
                    this.processNext();
                }
            },
            
            // Stop processing
            stop() {
                this.processing = false;
            },
            
            // Get queue stats
            getStats() {
                return {
                    queueLength: this.queue.length,
                    processing: this.processing,
                    deadLetterCount: this.deadLetterQueue.length
                };
            }
        };
    }
}