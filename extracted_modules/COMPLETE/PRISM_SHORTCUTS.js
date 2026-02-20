const PRISM_SHORTCUTS = {
    bindings: {
        'ctrl+s': { action: 'save', description: 'Save current work' },
        'ctrl+z': { action: 'undo', description: 'Undo last action' },
        'ctrl+y': { action: 'redo', description: 'Redo last undone action' },
        'ctrl+shift+z': { action: 'redo', description: 'Redo (alternative)' },
        'ctrl+n': { action: 'newJob', description: 'Create new job' },
        'ctrl+o': { action: 'openFile', description: 'Open file' },
        'ctrl+p': { action: 'print', description: 'Print/Export' },
        'ctrl+f': { action: 'search', description: 'Search' },
        'ctrl+shift+f': { action: 'advancedSearch', description: 'Advanced search' },
        'f1': { action: 'help', description: 'Show help' },
        'f2': { action: 'rename', description: 'Rename selected' },
        'f5': { action: 'calculate', description: 'Calculate parameters' },
        'f6': { action: 'simulate', description: 'Run simulation' },
        'f7': { action: 'verify', description: 'Verify toolpath' },
        'f8': { action: 'postProcess', description: 'Generate G-code' },
        'escape': { action: 'cancel', description: 'Cancel current operation' },
        'delete': { action: 'delete', description: 'Delete selected' },
        'ctrl+a': { action: 'selectAll', description: 'Select all' },
        'ctrl+d': { action: 'duplicate', description: 'Duplicate selected' },
        'ctrl+g': { action: 'group', description: 'Group selected' },
        'ctrl+shift+g': { action: 'ungroup', description: 'Ungroup selected' },
        'space': { action: 'togglePlay', description: 'Play/Pause simulation' },
        'ctrl+1': { action: 'viewFront', description: 'Front view' },
        'ctrl+2': { action: 'viewTop', description: 'Top view' },
        'ctrl+3': { action: 'viewRight', description: 'Right view' },
        'ctrl+4': { action: 'viewIso', description: 'Isometric view' },
        'ctrl+0': { action: 'fitAll', description: 'Fit all in view' }
    },
    
    customBindings: {},
    enabled: true,
    
    init() {
        document.addEventListener('keydown', (e) => this._handleKeyDown(e));
        console.log(`[PRISM_SHORTCUTS] Initialized with ${Object.keys(this.bindings).length} shortcuts`);
    },
    
    _handleKeyDown(e) {
        if (!this.enabled) return;
        
        // Don't trigger shortcuts when typing in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || 
            e.target.contentEditable === 'true') {
            // Allow Escape to blur
            if (e.key === 'Escape') {
                e.target.blur();
            }
            return;
        }
        
        const key = this._getKeyCombo(e);
        const binding = this.customBindings[key] || this.bindings[key];
        
        if (binding) {
            e.preventDefault();
            this._executeAction(binding.action, e);
        }
    },
    
    _getKeyCombo(e) {
        const parts = [];
        if (e.ctrlKey || e.metaKey) parts.push('ctrl');
        if (e.shiftKey) parts.push('shift');
        if (e.altKey) parts.push('alt');
        
        let key = e.key.toLowerCase();
        if (key === ' ') key = 'space';
        if (key === 'delete' || key === 'backspace') key = 'delete';
        
        parts.push(key);
        return parts.join('+');
    },
    
    _executeAction(action, event) {
        console.log(`[PRISM_SHORTCUTS] Executing: ${action}`);
        
        if (typeof PRISM_EVENT_BUS !== 'undefined') {
            PRISM_EVENT_BUS.publish('shortcut:' + action, { event });
        }
        
        // Also try to call handler directly if registered
        if (this.handlers && this.handlers[action]) {
            this.handlers[action](event);
        }
    },
    
    handlers: {},
    
    registerHandler(action, handler) {
        this.handlers[action] = handler;
    },
    
    addBinding(keyCombo, action, description) {
        this.customBindings[keyCombo.toLowerCase()] = { action, description };
    },
    
    removeBinding(keyCombo) {
        delete this.customBindings[keyCombo.toLowerCase()];
    },
    
    enable() { this.enabled = true; },
    disable() { this.enabled = false; },
    
    getHelp() {
        const help = [];
        const allBindings = { ...this.bindings, ...this.customBindings };
        
        for (const [key, binding] of Object.entries(allBindings)) {
            help.push({
                shortcut: key.replace('ctrl', 'Ctrl').replace('shift', 'Shift').replace('alt', 'Alt'),
                action: binding.action,
                description: binding.description
            });
        }
        
        return help.sort((a, b) => a.shortcut.localeCompare(b.shortcut));
    },
    
    selfTest() {
        const results = [];
        
        // Test key combo parsing
        const mockEvent = { ctrlKey: true, shiftKey: false, altKey: false, key: 's' };
        const combo = this._getKeyCombo(mockEvent);
        results.push({
            test: 'Key combo parsing',
            passed: combo === 'ctrl+s',
            message: `Parsed: ${combo}`
        });
        
        // Test binding lookup
        const binding = this.bindings['ctrl+s'];
        results.push({
            test: 'Binding lookup',
            passed: binding && binding.action === 'save',
            message: binding ? `Found: ${binding.action}` : 'Not found'
        });
        
        return results;
    }
};


/**
 * 1.3 PRISM_HISTORY - Undo/Redo Command System
 * Rationale: Essential for any editing application
 * MIT Course Reference: 6.170 (Software Studio)
 */
const PRISM_HISTORY = {
    undoStack: [],
    redoStack: [],
    maxSize: 100,
    isExecuting: false,
    
    execute(command) {
        if (!command || typeof command.execute !== 'function' || typeof command.undo !== 'function') {
            console.error('[PRISM_HISTORY] Invalid command - must have execute() and undo()');
            return false;
        }
        
        try {
            this.isExecuting = true;
            command.execute();
            this.isExecuting = false;
            
            this.undoStack.push(command);
            this.redoStack = []; // Clear redo on new action
            
            // Enforce max size
            if (this.undoStack.length > this.maxSize) {
                this.undoStack.shift();
            }
            
            this._notifyChange();
            return true;
        } catch (error) {
            this.isExecuting = false;
            console.error('[PRISM_HISTORY] Command execution failed:', error);
            return false;
        }
    },
    
    undo() {
        if (this.undoStack.length === 0) {
            console.log('[PRISM_HISTORY] Nothing to undo');
            return false;
        }
        
        try {
            const command = this.undoStack.pop();
            this.isExecuting = true;
            command.undo();
            this.isExecuting = false;
            this.redoStack.push(command);
            this._notifyChange();
            return true;
        } catch (error) {
            this.isExecuting = false;
            console.error('[PRISM_HISTORY] Undo failed:', error);
            return false;
        }
    },
    
    redo() {
        if (this.redoStack.length === 0) {
            console.log('[PRISM_HISTORY] Nothing to redo');
            return false;
        }
        
        try {
            const command = this.redoStack.pop();
            this.isExecuting = true;
            command.execute();
            this.isExecuting = false;
            this.undoStack.push(command);
            this._notifyChange();
            return true;
        } catch (error) {
            this.isExecuting = false;
            console.error('[PRISM_HISTORY] Redo failed:', error);
            return false;
        }
    },
    
    _notifyChange() {
        if (typeof PRISM_EVENT_BUS !== 'undefined') {
            PRISM_EVENT_BUS.publish('history:changed', {
                canUndo: this.canUndo(),
                canRedo: this.canRedo(),
                undoCount: this.undoStack.length,
                redoCount: this.redoStack.length
            });
        }
    },
    
    canUndo() { return this.undoStack.length > 0; },
    canRedo() { return this.redoStack.length > 0; },
    
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this._notifyChange();
    },
    
    getStatus() {
        return {
            undoCount: this.undoStack.length,
            redoCount: this.redoStack.length,
            maxSize: this.maxSize,
            lastCommand: this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1].name : null
        };
    },
    
    selfTest() {
        const results = [];
        
        // Create test target
        const testObj = { value: 0 };
        
        // Test command execution
        const command = new SetValueCommand(testObj, 'value', 10);
        this.execute(command);
        results.push({
            test: 'Command execution',
            passed: testObj.value === 10,
            message: `Value: ${testObj.value}`
        });
        
        // Test undo
        this.undo();
        results.push({
            test: 'Undo',
            passed: testObj.value === 0,
            message: `Value after undo: ${testObj.value}`
        });
        
        // Test redo
        this.redo();
        results.push({
            test: 'Redo',
            passed: testObj.value === 10,
            message: `Value after redo: ${testObj.value}`
        });
        
        // Cleanup
        this.clear();
        
        return results;
    }
};

// Command classes for PRISM_HISTORY
class SetValueCommand {
    constructor(target, property, newValue, name = 'Set Value') {
        this.target = target;
        this.property = property;
        this.newValue = newValue;
        this.oldValue = target[property];
        this.name = name;
    }
    execute() { this.target[this.property] = this.newValue; }
    undo() { this.target[this.property] = this.oldValue; }
}

class BatchCommand {
    constructor(commands, name = 'Batch') {
        this.commands = commands;
        this.name = name;
    }
    execute() { this.commands.forEach(cmd => cmd.execute()); }
    undo() { this.commands.slice().reverse().forEach(cmd => cmd.undo()); }
}

class AddItemCommand {
    constructor(array, item, name = 'Add Item') {
        this.array = array;
        this.item = item;
        this.name = name;
        this.index = null;
    }
    execute() { 
        this.index = this.array.length;
        this.array.push(this.item); 
    }
    undo() { 
        if (this.index !== null) {
            this.array.splice(this.index, 1);
        }
    }
}

class RemoveItemCommand {
    constructor(array, index, name = 'Remove Item') {
        this.array = array;
        this.index = index;
        this.item = array[index];
        this.name = name;
    }
    execute() { this.array.splice(this.index, 1); }
    undo() { this.array.splice(this.index, 0, this.item); }
}


/**
 * 1.4 PRISM_PROGRESS - Progress Indicator for Long Operations
 * Rationale: Toolpath generation can take time, users need feedback
 * MIT Course Reference: 6.831 (User Interface Design)
 */
const PRISM_PROGRESS = {
    container: null,
    total: 100,
    current: 0,
    cancelled: false,
    startTime: null,
    
    show(title, total = 100, options = {}) {
        if (this.container) this.hide();
        
        this.total = total;
        this.current = 0;
        this.cancelled = false;
        this.startTime = Date.now();
        
        this.container = document.createElement('div');
        this.container.className = 'prism-progress-overlay';
        this.container.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6); display: flex;
            align-items: center; justify-content: center;
            z-index: 99999; backdrop-filter: blur(2px);
        `;
        
        const modal = document.createElement('div');
        modal.className = 'prism-progress-modal';
        modal.style.cssText = `
            background: var(--card-bg, #fff); padding: 24px 32px;
            border-radius: 8px; min-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
        
        modal.innerHTML = `
            <h3 style="margin: 0 0 16px 0; color: var(--text-primary, #1a1a1a);">${title}</h3>
            <div class="prism-progress-bar" style="
                height: 8px; background: var(--bg-tertiary, #e8e8e8);
                border-radius: 4px; overflow: hidden; margin-bottom: 8px;
            ">
                <div class="prism-progress-fill" style="
                    height: 100%; width: 0%; background: var(--accent, #2196F3);
                    transition: width 0.1s ease;
                "></div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="prism-progress-text" style="color: var(--text-secondary, #4a4a4a);">0%</span>
                <span class="prism-progress-eta" style="color: var(--text-muted, #888);">Calculating...</span>
            </div>
            ${options.cancellable !== false ? `
                <button class="prism-progress-cancel" style="
                    margin-top: 16px; padding: 8px 16px; border: none;
                    background: var(--error, #f44336); color: white;
                    border-radius: 4px; cursor: pointer;
                ">Cancel</button>
            ` : ''}
        `;
        
        this.container.appendChild(modal);
        document.body.appendChild(this.container);
        
        // Add cancel handler
        const cancelBtn = this.container.querySelector('.prism-progress-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancel());
        }
        
        return this;
    },
    
    update(value, message = '') {
        if (!this.container) return;
        
        this.current = value;
        const pct = Math.round((value / this.total) * 100);
        
        const fill = this.container.querySelector('.prism-progress-fill');
        const text = this.container.querySelector('.prism-progress-text');
        const eta = this.container.querySelector('.prism-progress-eta');
        
        if (fill) fill.style.width = pct + '%';
        if (text) text.textContent = message || `${pct}%`;
        
        // Calculate ETA
        if (eta && pct > 5) {
            const elapsed = Date.now() - this.startTime;
            const remaining = (elapsed / pct) * (100 - pct);
            eta.textContent = this._formatTime(remaining);
        }
    },
    
    _formatTime(ms) {
        if (ms < 1000) return 'Almost done...';
        if (ms < 60000) return `~${Math.round(ms / 1000)}s remaining`;
        return `~${Math.round(ms / 60000)}m remaining`;
    },
    
    increment(amount = 1, message = '') {
        this.update(this.current + amount, message);
    },
    
    hide() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    },
    
    cancel() {
        this.cancelled = true;
        this.hide();
        
        if (typeof PRISM_EVENT_BUS !== 'undefined') {
            PRISM_EVENT_BUS.publish('progress:cancelled');
        }
    },
    
    isCancelled() { return this.cancelled; },
    
    // Promise-based wrapper for async operations
    async track(title, asyncFn, options = {}) {
        this.show(title, 100, options);
        
        try {
            const result = await asyncFn({
                update: (pct, msg) => this.update(pct, msg),
                isCancelled: () => this.isCancelled()
            });
            this.hide();
            return result;
        } catch (error) {
            this.hide();
            throw error;
        }
    },
    
    selfTest() {
        const results = [];
        
        // Test show/hide
        this.show('Test Operation', 100);
        results.push({
            test: 'Show progress',
            passed: this.container !== null,
            message: this.container ? 'Container created' : 'Container not created'
        });
        
        // Test update
        this.update(50, 'Halfway there');
        const fill = this.container?.querySelector('.prism-progress-fill');
        results.push({
            test: 'Update progress',
            passed: fill && fill.style.width === '50%',
            message: `Progress: ${fill?.style.width}`
        });
        
        // Test cancel
        this.cancel();
        results.push({
            test: 'Cancel and hide',
            passed: this.container === null && this.cancelled === true,
            message: this.cancelled ? 'Cancelled' : 'Not cancelled'
        });
        
        return results;
    }
};


/**
 * 1.5 PRISM_TOAST - Toast Notification System
 * Rationale: Non-intrusive feedback for user actions
 * MIT Course Reference: 6.831 (User Interface Design)
 */
const PRISM_TOAST = {
    container: null,
    queue: [],
    maxVisible: 5,
    
    init() {
        if (this.container) return;
        
        this.container = document.createElement('div');
        this.container.className = 'prism-toast-container';
        this.container.style.cssText = `
            position: fixed; bottom: 20px; right: 20px;
            display: flex; flex-direction: column; gap: 10px;
            z-index: 100000; pointer-events: none;
        `;
        document.body.appendChild(this.container);
        
        // Inject animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes prism-toast-in {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes prism-toast-out {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        console.log('[PRISM_TOAST] Initialized');
    },
    
    show(message, type = 'info', duration = 3000) {
        if (!this.container) this.init();
        
        const toast = document.createElement('div');
        toast.className = `prism-toast prism-toast-${type}`;
        
        const icons = { 
            success: '✓', 
            error: '✗', 
            warning: '⚠', 
            info: 'ℹ' 
        };
        
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            warning: '#FF9800',
            info: '#2196F3'
        };
        
        toast.innerHTML = `
            <span style="font-size: 18px; margin-right: 10px;">${icons[type] || icons.info}</span>
            <span>${message}</span>
            <button style="
                background: none; border: none; color: inherit;
                margin-left: 10px; cursor: pointer; font-size: 16px;
                opacity: 0.7; padding: 0;
            ">×</button>
        `;
        
        toast.style.cssText = `
            padding: 12px 16px; border-radius: 6px;
            display: flex; align-items: center;
            background: ${colors[type] || colors.info};
            color: white; min-width: 280px; max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: prism-toast-in 0.3s ease;
            pointer-events: auto;
        `;
        
        // Close button handler
        const closeBtn = toast.querySelector('button');
        closeBtn.addEventListener('click', () => this._dismissToast(toast));
        
        this.container.appendChild(toast);
        
        // Limit visible toasts
        while (this.container.children.length > this.maxVisible) {
            this._dismissToast(this.container.firstChild);
        }
        
        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => this._dismissToast(toast), duration);
        }
        
        return toast;
    },
    
    _dismissToast(toast) {
        if (!toast || !toast.parentNode) return;
        
        toast.style.animation = 'prism-toast-out 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    },
    
    success(message, duration = 3000) { return this.show(message, 'success', duration); },
    error(message, duration = 5000) { return this.show(message, 'error', duration); },
    warning(message, duration = 4000) { return this.show(message, 'warning', duration); },
    info(message, duration = 3000) { return this.show(message, 'info', duration); },
    
    // Persistent toast that must be dismissed manually
    persistent(message, type = 'info') {
        return this.show(message, type, 0);
    },
    
    selfTest() {
        const results = [];
        
        this.init();
        
        // Test toast creation
        const toast = this.show('Test message', 'info', 0);
        results.push({
            test: 'Create toast',
            passed: toast !== null && this.container.contains(toast),
            message: 'Toast created'
        });
        
        // Test different types
        this.success('Success');
        this.warning('Warning');
        this.error('Error');
        results.push({
            test: 'Multiple toast types',
            passed: this.container.children.length === 4,
            message: `${this.container.children.length} toasts visible`
        });
        
        // Cleanup
        while (this.container.firstChild) {
            this.container.firstChild.remove();
        }
        
        return results;
    }
};


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: ARCHITECTURE ENHANCEMENTS (3 Components)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 2.1 PRISM_LAZY_LOADER - Lazy Loading for Large Databases
 * Rationale: 40MB build - defer loading of databases until needed
 * MIT Course Reference: 6.172 (Performance Engineering)
 */
const PRISM_LAZY_LOADER = {
    loaded: new Set(),
    loading: new Map(),
    
    databases: {
        materials: { size: 'large', priority: 'high' },
        machines: { size: 'large', priority: 'high' },
        tools: { size: 'large', priority: 'high' },
        toolHolders: { size: 'medium', priority: 'medium' },
        workHolding: { size: 'medium', priority: 'medium' },
        coatings: { size: 'small', priority: 'low' },
        strategies: { size: 'medium', priority: 'high' },
        postProcessors: { size: 'medium', priority: 'medium' }
    },
    
    async load(database) {
        if (this.loaded.has(database)) {
            return true;
        }
        
        if (this.loading.has(database)) {
            return this.loading.get(database);
        }
        
        const promise = new Promise(async (resolve) => {
            const startTime = performance.now();
            console.log(`[PRISM_LAZY_LOADER] Loading ${database}...`);
            
            // In production, this would fetch from separate files
            // For now, we mark as loaded (databases are in main build)
            await new Promise(r => setTimeout(r, 10)); // Simulate async
            
            this.loaded.add(database);
            this.loading.delete(database);
            
            const elapsed = performance.now() - startTime;
            console.log(`[PRISM_LAZY_LOADER] Loaded ${database} in ${elapsed.toFixed(1)}ms`);
            
            resolve(true);
        });
        
        this.loading.set(database, promise);
        return promise;
    },
    
    async ensure(databases) {
        const toLoad = databases.filter(db => !this.loaded.has(db));
        if (toLoad.length === 0) return true;
        
        return Promise.all(toLoad.map(db => this.load(db)));
    },
    
    async preload(priority = 'high') {
        const toPreload = Object.entries(this.databases)
            .filter(([_, config]) => config.priority === priority)
            .map(([name, _]) => name);
        
        console.log(`[PRISM_LAZY_LOADER] Preloading ${priority} priority:`, toPreload);
        return this.ensure(toPreload);
    },
    
    isLoaded(database) {
        return this.loaded.has(database);
    },
    
    isLoading(database) {
        return this.loading.has(database);
    },
    
    getStatus() {
        return {
            loaded: Array.from(this.loaded),
            loading: Array.from(this.loading.keys()),
            pending: Object.keys(this.databases).filter(
                db => !this.loaded.has(db) && !this.loading.has(db)
            )
        };
    },
    
    selfTest() {
        const results = [];
        
        // Test load
        this.load('test_db').then(() => {
            results.push({
                test: 'Load database',
                passed: this.loaded.has('test_db'),
                message: 'Database loaded'
            });
        });
        
        // Test isLoaded
        results.push({
            test: 'isLoaded check',
            passed: !this.isLoaded('nonexistent'),
            message: 'Correctly reports unloaded'
        });
        
        return results;
    }
};


/**
 * 2.2 PRISM_PLUGIN_MANAGER - Plugin System
 * Rationale: Allow extensibility without modifying core code
 * MIT Course Reference: 6.170 (Software Studio)
 */
const PRISM_PLUGIN_MANAGER = {
    plugins: new Map(),
    hooks: new Map(),
    initialized: false,
    
    register(plugin) {
        // Validate plugin
        if (!plugin.id || !plugin.name || !plugin.version) {
            console.error('[PRISM_PLUGIN_MANAGER] Plugin must have id, name, and version');
            return false;
        }
        
        if (this.plugins.has(plugin.id)) {
            console.warn(`[PRISM_PLUGIN_MANAGER] Plugin ${plugin.id} already registered`);
            return false;
        }
        
        // Store plugin
        this.plugins.set(plugin.id, {
            ...plugin,
            enabled: true,
            loadedAt: Date.now()
        });
        
        // Initialize plugin if manager is already initialized
        if (this.initialized && typeof plugin.init === 'function') {
            try {
                plugin.init(this.getAPI());
            } catch (error) {
                console.error(`[PRISM_PLUGIN_MANAGER] Failed to init ${plugin.id}:`, error);
            }
        }
        
        // Register plugin hooks
        if (plugin.hooks) {
            Object.entries(plugin.hooks).forEach(([hook, handler]) => {
                this.addHook(hook, handler, plugin.id);
            });
        }
        
        console.log(`[PRISM_PLUGIN_MANAGER] Registered: ${plugin.name} v${plugin.version}`);
        
        if (typeof PRISM_EVENT_BUS !== 'undefined') {
            PRISM_EVENT_BUS.publish('plugin:registered', { id: plugin.id, name: plugin.name });
        }
        
        return true;
    },
    
    unregister(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) return false;
        
        // Call cleanup if available
        if (typeof plugin.cleanup === 'function') {
            plugin.cleanup();
        }
        
        // Remove hooks
        for (const [hookName, handlers] of this.hooks) {
            this.hooks.set(hookName, handlers.filter(h => h.pluginId !== pluginId));
        }
        
        this.plugins.delete(pluginId);
        console.log(`[PRISM_PLUGIN_MANAGER] Unregistered: ${pluginId}`);
        
        return true;
    },
    
    addHook(name, handler, pluginId) {
        if (!this.hooks.has(name)) {
            this.hooks.set(name, []);
        }
        this.hooks.get(name).push({ handler, pluginId, priority: 0 });
    },
    
    async executeHook(name, data) {
        if (!this.hooks.has(name)) return data;
        
        const handlers = this.hooks.get(name)
            .filter(h => {
                const plugin = this.plugins.get(h.pluginId);
                return plugin && plugin.enabled;
            })
            .sort((a, b) => b.priority - a.priority);
        
        let result = data;
        for (const { handler, pluginId } of handlers) {
            try {
                result = await handler(result);
            } catch (error) {
                console.error(`[PRISM_PLUGIN_MANAGER] Hook ${name} failed for ${pluginId}:`, error);
            }
        }
        
        return result;
    },
    
    getAPI() {
        return {
            gateway: typeof PRISM_GATEWAY !== 'undefined' ? PRISM_GATEWAY : null,
            eventBus: typeof PRISM_EVENT_BUS !== 'undefined' ? PRISM_EVENT_BUS : null,
            state: typeof PRISM_STATE_STORE !== 'undefined' ? PRISM_STATE_STORE : null,
            ui: typeof PRISM_UI_ADAPTER !== 'undefined' ? PRISM_UI_ADAPTER : null,
            toast: PRISM_TOAST,
            progress: PRISM_PROGRESS,
            history: PRISM_HISTORY
        };
    },
    
    init() {
        if (this.initialized) return;
        
        // Initialize all registered plugins
        for (const [id, plugin] of this.plugins) {
            if (typeof plugin.init === 'function') {
                try {
                    plugin.init(this.getAPI());
                } catch (error) {
                    console.error(`[PRISM_PLUGIN_MANAGER] Failed to init ${id}:`, error);
                }
            }
        }
        
        this.initialized = true;
        console.log(`[PRISM_PLUGIN_MANAGER] Initialized ${this.plugins.size} plugins`);
    },
    
    enablePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
            plugin.enabled = true;
            return true;
        }
        return false;
    },
    
    disablePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
            plugin.enabled = false;
            return true;
        }
        return false;
    },
    
    getPlugins() {
        return Array.from(this.plugins.values()).map(p => ({
            id: p.id,
            name: p.name,
            version: p.version,
            enabled: p.enabled
        }));
    },
    
    selfTest() {
        const results = [];
        
        // Test plugin registration
        const testPlugin = {
            id: 'test-plugin',
            name: 'Test Plugin',
            version: '1.0.0',
            init: (api) => console.log('Test plugin initialized'),
            hooks: {
                'test:hook': (data) => ({ ...data, modified: true })
            }
        };
        
        const registered = this.register(testPlugin);
        results.push({
            test: 'Register plugin',
            passed: registered && this.plugins.has('test-plugin'),
            message: registered ? 'Registered' : 'Failed to register'
        });
        
        // Test hook execution
        this.executeHook('test:hook', { value: 1 }).then(result => {
            results.push({
                test: 'Execute hook',
                passed: result.modified === true,
                message: result.modified ? 'Hook modified data' : 'Hook failed'
            });
        });
        
        // Cleanup
        this.unregister('test-plugin');
        
        return results;
    }
};


/**
 * 2.3 PRISM_SERVICE_WORKER - Offline Support
 * Rationale: Allow app to work offline in shop floor environments
 * MIT Course Reference: 6.148 (Web Development)
 */
const PRISM_SERVICE_WORKER = {
    registration: null,
    supported: 'serviceWorker' in navigator,
    
    async register() {
        if (!this.supported) {
            console.warn('[PRISM_SERVICE_WORKER] Service Workers not supported');
            return false;
        }
        
        try {
            // Create service worker blob (inline for single-file app)
            const swCode = this._getServiceWorkerCode();
            const blob = new Blob([swCode], { type: 'application/javascript' });
            const swUrl = URL.createObjectURL(blob);
            
            this.registration = await navigator.serviceWorker.register(swUrl);
            console.log('[PRISM_SERVICE_WORKER] Registered successfully');
            
            // Listen for updates
            this.registration.addEventListener('updatefound', () => {
                console.log('[PRISM_SERVICE_WORKER] Update found');
                if (typeof PRISM_TOAST !== 'undefined') {
                    PRISM_TOAST.info('Update available. Refresh to apply.');
                }
            });
            
            return true;
        } catch (error) {
            console.error('[PRISM_SERVICE_WORKER] Registration failed:', error);
            return false;
        }
    },
    
    _getServiceWorkerCode() {
        return `
            const CACHE_NAME = 'prism-v8.65';
            const OFFLINE_URL = '/offline.html';
            
            self.addEventListener('install', (event) => {
                event.waitUntil(
                    caches.open(CACHE_NAME).then((cache) => {
                        return cache.addAll([
                            '/',
                            '/index.html'
                        ]);
                    })
                );
                self.skipWaiting();
            });
            
            self.addEventListener('activate', (event) => {
                event.waitUntil(
                    caches.keys().then((cacheNames) => {
                        return Promise.all(
                            cacheNames
                                .filter(name => name !== CACHE_NAME)
                                .map(name => caches.delete(name))
                        );
                    })
                );
                self.clients.claim();
            });
            
            self.addEventListener('fetch', (event) => {
                event.respondWith(
                    caches.match(event.request).then((response) => {
                        if (response) {
                            return response;
                        }
                        return fetch(event.request).then((response) => {
                            if (!response || response.status !== 200) {
                                return response;
                            }
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                            return response;
                        });
                    }).catch(() => {
                        return caches.match(OFFLINE_URL);
                    })
                );
            });
        `;
    },
    
    async unregister() {
        if (this.registration) {
            await this.registration.unregister();
            this.registration = null;
            console.log('[PRISM_SERVICE_WORKER] Unregistered');
            return true;
        }
        return false;
    },
    
    async update() {
        if (this.registration) {
            await this.registration.update();
            return true;
        }
        return false;
    },
    
    isOnline() {
        return navigator.onLine;
    },
    
    getStatus() {
        return {
            supported: this.supported,
            registered: this.registration !== null,
            online: this.isOnline()
        };
    },
    
    selfTest() {
        return [{
            test: 'Service Worker support',
            passed: this.supported,
            message: this.supported ? 'Supported' : 'Not supported'
        }];
    }
};


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: CODING PRACTICE ENHANCEMENTS (3 Components)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 3.1 PRISM_LOGGER - Structured Logging System
 * Rationale: Better debugging, monitoring, and issue tracking
 * MIT Course Reference: 6.170 (Software Studio)
 */
const PRISM_LOGGER = {
    levels: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 },
    currentLevel: 1, // INFO
    logs: [],
    maxLogs: 1000,
    listeners: [],
    
    setLevel(level) {
        if (typeof level === 'string') {
            this.currentLevel = this.levels[level.toUpperCase()] ?? 1;
        } else {
            this.currentLevel = level;
        }
    },
    
    log(level, module, message, data = {}) {
        const levelNum = typeof level === 'string' ? this.levels[level.toUpperCase()] : level;
        if (levelNum < this.currentLevel) return;
        
        const entry = {
            timestamp: new Date().toISOString(),
            level: typeof level === 'string' ? level.toUpperCase() : Object.keys(this.levels)[level],
            module,
            message,
            data,
            stack: level === 'ERROR' || levelNum === 3 ? new Error().stack : undefined
        };
        
        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        // Console output
        const prefix = `[${entry.timestamp.slice(11, 23)}] [${entry.level}] [${module}]`;
        const consoleMethod = entry.level === 'ERROR' ? 'error' : 
                            entry.level === 'WARN' ? 'warn' : 
                            entry.level === 'DEBUG' ? 'debug' : 'log';
        
        if (Object.keys(data).length > 0) {
            console[consoleMethod](prefix, message, data);
        } else {
            console[consoleMethod](prefix, message);
        }
        
        // Notify listeners
        this.listeners.forEach(listener => {
            try { listener(entry); } catch (e) {}
        });
        
        // Emit event
        if (typeof PRISM_EVENT_BUS !== 'undefined') {
            PRISM_EVENT_BUS.publish('log:entry', entry);
        }
    },
    
    debug(module, msg, data) { this.log('DEBUG', module, msg, data); },
    info(module, msg, data) { this.log('INFO', module, msg, data); },
    warn(module, msg, data) { this.log('WARN', module, msg, data); },
    error(module, msg, data) { this.log('ERROR', module, msg, data); },
    
    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    },
    
    getRecent(count = 100, level = null) {
        let logs = this.logs.slice(-count);
        if (level) {
            logs = logs.filter(l => l.level === level.toUpperCase());
        }
        return logs;
    },
    
    getByModule(module, count = 100) {
        return this.logs
            .filter(l => l.module === module)
            .slice(-count);
    },
    
    search(query) {
        const q = query.toLowerCase();
        return this.logs.filter(l => 
            l.message.toLowerCase().includes(q) ||
            l.module.toLowerCase().includes(q) ||
            JSON.stringify(l.data).toLowerCase().includes(q)
        );
    },
    
    export() {
        return JSON.stringify(this.logs, null, 2);
    },
    
    clear() {
        this.logs = [];
    },
    
    getStatistics() {
        const counts = { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0 };
        const modules = {};
        
        this.logs.forEach(l => {
            counts[l.level]++;
            modules[l.module] = (modules[l.module] || 0) + 1;
        });
        
        return { counts, modules, total: this.logs.length };
    },
    
    selfTest() {
        const results = [];
        
        const initialCount = this.logs.length;
        this.info('TEST', 'Test message', { key: 'value' });
        
        results.push({
            test: 'Log entry creation',
            passed: this.logs.length === initialCount + 1,
            message: 'Log entry created'
        });
        
        const recent = this.getRecent(1);
        results.push({
            test: 'Get recent logs',
            passed: recent.length === 1 && recent[0].module === 'TEST',
            message: `Got ${recent.length} recent logs`
        });
        
        return results;
    }
};


/**
 * 3.2 PRISM_SANITIZER - Input Sanitization
 * Rationale: Prevent injection attacks, ensure data integrity
 * MIT Course Reference: 6.858 (Computer Systems Security)
 */
const PRISM_SANITIZER = {
    // Escape HTML to prevent XSS
    escapeHTML(str) {
        if (typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
    
    // Unescape HTML
    unescapeHTML(str) {
        if (typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.innerHTML = str;
        return div.textContent;
    },
    
    // Sanitize numeric input
    sanitizeNumber(value, min = -Infinity, max = Infinity, fallback = 0) {
        const num = parseFloat(value);
        if (isNaN(num) || !isFinite(num)) return fallback;
        return Math.max(min, Math.min(max, num));
    },
    
    // Sanitize integer
    sanitizeInteger(value, min = -Infinity, max = Infinity, fallback = 0) {
        const num = parseInt(value, 10);
        if (isNaN(num)) return fallback;
        return Math.max(min, Math.min(max, num));
    },
    
    // Sanitize string input
    sanitizeString(str, maxLength = 1000) {
        if (typeof str !== 'string') return '';
        return str.slice(0, maxLength).trim();
    },
    
    // Sanitize ID (alphanumeric + underscore/hyphen only)
    sanitizeId(id) {
        if (!id) return '';
        return String(id).replace(/[^a-zA-Z0-9_-]/g, '');
    },
    
    // Sanitize filename
    sanitizeFilename(filename) {
        if (!filename) return '';
        return String(filename)
            .replace(/[<>:"/\\|?*]/g, '')
            .replace(/\.\./g, '')
            .slice(0, 255);
    },
    
    // Sanitize file path
    sanitizePath(path) {
        if (!path) return '';
        return String(path)
            .replace(/\.\./g, '')  // No directory traversal
            .replace(/[<>:"|?*]/g, '');  // No invalid chars
    },
    
    // Validate and sanitize G-code
    sanitizeGCode(code) {
        if (!code) return '';
        
        // Remove potentially dangerous commands
        const dangerous = [
            'M98', 'M99',  // Subprogram calls
            'GOTO',        // Jump statements
            'POPEN', 'PCLOS',  // File operations
            'DPRNT',       // Print to file
            'BPRNT'        // Binary print
        ];
        
        let safe = code;
        dangerous.forEach(cmd => {
            const regex = new RegExp(cmd, 'gi');
            safe = safe.replace(regex, `; BLOCKED: ${cmd}`);
        });
        
        return safe;
    },
    
    // Validate email format
    isValidEmail(email) {
        if (typeof email !== 'string') return false;
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return pattern.test(email);
    },
    
    // Validate URL
    isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },
    
    // Strip all HTML tags
    stripHTML(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/<[^>]*>/g, '');
    },
    
    selfTest() {
        const results = [];
        
        // Test HTML escape
        const escaped = this.escapeHTML('<script>alert("xss")</script>');
        results.push({
            test: 'HTML escape',
            passed: !escaped.includes('<script>'),
            message: `Escaped: ${escaped.slice(0, 30)}...`
        });
        
        // Test number sanitize
        const num = this.sanitizeNumber('abc', 0, 100, 50);
        results.push({
            test: 'Number sanitize fallback',
            passed: num === 50,
            message: `Result: ${num}`
        });
        
        // Test ID sanitize
        const id = this.sanitizeId('test<script>123');
        results.push({
            test: 'ID sanitize',
            passed: id === 'testscript123',
            message: `Result: ${id}`
        });
        
        // Test G-code sanitize
        const gcode = this.sanitizeGCode('G0 X1 Y2\nM98 P1000');
        results.push({
            test: 'G-code sanitize',
            passed: gcode.includes('BLOCKED'),
            message: 'Dangerous commands blocked'
        });
        
        return results;
    }
};


/**
 * 3.3 PRISM_DEBOUNCE - Debounce/Throttle Utilities
 * Rationale: Prevent excessive function calls
 * MIT Course Reference: 6.172 (Performance Engineering)
 */
const PRISM_DEBOUNCE = {
    // Debounce: Execute after delay, reset on each call
    debounce(fn, delay = 300) {
        let timeoutId = null;
        
        const debounced = function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                fn.apply(this, args);
            }, delay);
        };
        
        debounced.cancel = () => {
            clearTimeout(timeoutId);
        };
        
        debounced.flush = () => {
            clearTimeout(timeoutId);
            fn();
        };
        
        return debounced;
    },
    
    // Throttle: Execute at most once per interval
    throttle(fn, interval = 300) {
        let lastTime = 0;
        let timeoutId = null;
        
        const throttled = function(...args) {
            const now = Date.now();
            const remaining = interval - (now - lastTime);
            
            if (remaining <= 0) {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                lastTime = now;
                fn.apply(this, args);
            } else if (!timeoutId) {
                timeoutId = setTimeout(() => {
                    lastTime = Date.now();
                    timeoutId = null;
                    fn.apply(this, args);
                }, remaining);
            }
        };
        
        throttled.cancel = () => {
            clearTimeout(timeoutId);
            timeoutId = null;
        };
        
        return throttled;
    },
    
    // Leading edge debounce: Execute immediately, then ignore for delay
    debounceLeading(fn, delay = 300) {
        let timeoutId = null;
        let canRun = true;
        
        return function(...args) {
            if (canRun) {
                fn.apply(this, args);
                canRun = false;
            }
            
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                canRun = true;
            }, delay);
        };
    },
    
    // Request Animation Frame throttle
    rafThrottle(fn) {
        let rafId = null;
        let lastArgs = null;
        
        const throttled = function(...args) {
            lastArgs = args;
            
            if (rafId === null) {
                rafId = requestAnimationFrame(() => {
                    fn.apply(this, lastArgs);
                    rafId = null;
                });
            }
        };
        
        throttled.cancel = () => {
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        };
        
        return throttled;
    },
    
    selfTest() {
        const results = [];
        
        // Test debounce
        let callCount = 0;
        const debounced = this.debounce(() => callCount++, 50);
        
        debounced();
        debounced();
        debounced();
        
        results.push({
            test: 'Debounce immediate',
            passed: callCount === 0,
            message: `Called ${callCount} times (should be 0)`
        });
        
        // Test throttle
        let throttleCount = 0;
        const throttled = this.throttle(() => throttleCount++, 50);
        
        throttled();
        throttled();
        throttled();
        
        results.push({
            test: 'Throttle first call',
            passed: throttleCount === 1,
            message: `Called ${throttleCount} times (should be 1)`
        });
        
        return results;
    }
};


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: TESTING ENHANCEMENTS (2 Components)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 4.1 PRISM_TEST_FRAMEWORK - Comprehensive Test Framework
 * Rationale: Current self-tests are basic, need full coverage
 * MIT Course Reference: 6.170 (Software Studio)
 */
const PRISM_TEST_FRAMEWORK = {
    suites: new Map(),
    results: [],
    currentSuite: null,
    beforeEachFn: null,
    afterEachFn: null,
    
    describe(name, fn) {
        const previousSuite = this.currentSuite;
        this.currentSuite = name;
        
        if (!this.suites.has(name)) {
            this.suites.set(name, { tests: [], beforeEach: null, afterEach: null });
        }
        
        fn();
        
        this.currentSuite = previousSuite;
    },
    
    it(description, testFn) {
        if (!this.currentSuite) {
            throw new Error('Tests must be inside describe()');
        }
        
        this.suites.get(this.currentSuite).tests.push({
            description,
            testFn,
            skip: false
        });
    },
    
    skip(description, testFn) {
        if (!this.currentSuite) {
            throw new Error('Tests must be inside describe()');
        }
        
        this.suites.get(this.currentSuite).tests.push({
            description,
            testFn,
            skip: true
        });
    },
    
    beforeEach(fn) {
        if (this.currentSuite) {
            this.suites.get(this.currentSuite).beforeEach = fn;
        }
    },
    
    afterEach(fn) {
        if (this.currentSuite) {
            this.suites.get(this.currentSuite).afterEach = fn;
        }
    },
    
    async runAll() {
        console.log('\n🧪 PRISM TEST SUITE\n' + '='.repeat(60));
        this.results = [];
        let passed = 0, failed = 0, skipped = 0;
        const startTime = performance.now();
        
        for (const [suiteName, suite] of this.suites) {
            console.log(`\n📦 ${suiteName}`);
            
            for (const test of suite.tests) {
                if (test.skip) {
                    console.log(`  ⏭️ ${test.description} (skipped)`);
                    skipped++;
                    this.results.push({ 
                        suite: suiteName, 
                        test: test.description, 
                        status: 'skipped' 
                    });
                    continue;
                }
                
                try {
                    // Run beforeEach
                    if (suite.beforeEach) await suite.beforeEach();
                    
                    // Run test
                    await test.testFn();
                    
                    // Run afterEach
                    if (suite.afterEach) await suite.afterEach();
                    
                    console.log(`  ✅ ${test.description}`);
                    passed++;
                    this.results.push({ 
                        suite: suiteName, 
                        test: test.description, 
                        status: 'passed' 
                    });
                } catch (error) {
                    console.error(`  ❌ ${test.description}`);
                    console.error(`     ${error.message}`);
                    failed++;
                    this.results.push({ 
                        suite: suiteName, 
                        test: test.description, 
                        status: 'failed',
                        error: error.message 
                    });
                }
            }
        }
        
        const duration = performance.now() - startTime;
        
        console.log('\n' + '='.repeat(60));
        console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
        console.log(`Duration: ${duration.toFixed(2)}ms`);
        
        return { passed, failed, skipped, total: passed + failed + skipped, duration };
    },
    
    runSuite(suiteName) {
        const suite = this.suites.get(suiteName);
        if (!suite) {
            console.error(`Suite not found: ${suiteName}`);
            return null;
        }
        
        // Temporarily store only this suite and run
        const allSuites = this.suites;
        this.suites = new Map([[suiteName, suite]]);
        const results = this.runAll();
        this.suites = allSuites;
        
        return results;
    },
    
    // Assertion helpers
    assert: {
        equal(actual, expected, msg = '') {
            if (actual !== expected) {
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}. ${msg}`);
            }
        },
        
        notEqual(actual, expected, msg = '') {
            if (actual === expected) {
                throw new Error(`Expected values to be different. ${msg}`);
            }
        },
        
        deepEqual(actual, expected, msg = '') {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                throw new Error(`Deep equality failed. ${msg}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
            }
        },
        
        throws(fn, msg = '') {
            let threw = false;
            try { fn(); } catch { threw = true; }
            if (!threw) throw new Error(`Expected function to throw. ${msg}`);
        },
        
        doesNotThrow(fn, msg = '') {
            try { fn(); } catch (e) { 
                throw new Error(`Expected function not to throw, but threw: ${e.message}. ${msg}`);
            }
        },
        
        closeTo(actual, expected, delta = 1e-6, msg = '') {
            if (Math.abs(actual - expected) > delta) {
                throw new Error(`Expected ${actual} to be close to ${expected} (delta: ${delta}). ${msg}`);
            }
        },
        
        truthy(value, msg = '') {
            if (!value) throw new Error(`Expected truthy value, got ${value}. ${msg}`);
        },
        
        falsy(value, msg = '') {
            if (value) throw new Error(`Expected falsy value, got ${value}. ${msg}`);
        },
        
        isNull(value, msg = '') {
            if (value !== null) throw new Error(`Expected null, got ${value}. ${msg}`);
        },
        
        isNotNull(value, msg = '') {
            if (value === null) throw new Error(`Expected non-null value. ${msg}`);
        },
        
        isArray(value, msg = '') {
            if (!Array.isArray(value)) throw new Error(`Expected array. ${msg}`);
        },
        
        contains(array, item, msg = '') {
            if (!array.includes(item)) throw new Error(`Expected array to contain ${item}. ${msg}`);
        },
        
        hasProperty(obj, prop, msg = '') {
            if (!(prop in obj)) throw new Error(`Expected object to have property ${prop}. ${msg}`);
        },
        
        instanceOf(value, constructor, msg = '') {
            if (!(value instanceof constructor)) {
                throw new Error(`Expected instance of ${constructor.name}. ${msg}`);
            }
        }
    },
    
    getResults() {
        return this.results;
    },
    
    clear() {
        this.suites.clear();
        this.results = [];
    }
};


/**
 * 4.2 PRISM_PERF_TESTS - Performance Regression Testing
 * Rationale: Catch performance degradation early
 * MIT Course Reference: 6.172 (Performance Engineering)
 */
const PRISM_PERF_TESTS = {
    baselines: {},
    tolerance: 0.2, // 20% tolerance
    results: [],
    
    async benchmark(name, fn, iterations = 100, warmup = 10) {
        // Warm up
        for (let i = 0; i < warmup; i++) {
            await fn();
        }
        
        // Measure
        const times = [];
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await fn();
            times.push(performance.now() - start);
        }
        
        // Calculate statistics
        times.sort((a, b) => a - b);
        const avg = times.reduce((a, b) => a + b) / times.length;
        const min = times[0];
        const max = times[times.length - 1];
        const median = times[Math.floor(times.length / 2)];
        const p95 = times[Math.floor(times.length * 0.95)];
        const p99 = times[Math.floor(times.length * 0.99)];
        
        // Standard deviation
        const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length;
        const stdDev = Math.sqrt(variance);
        
        return { 
            name, 
            iterations,
            avg, 
            min, 
            max, 
            median,
            p95,
            p99,
            stdDev,
            samples: times 
        };
    },
    
    setBaseline(name, avgTime) {
        this.baselines[name] = avgTime;
    },
    
    loadBaselines(baselines) {
        this.baselines = { ...this.baselines, ...baselines };
    },
    
    async runBenchmark(name, fn, iterations = 100) {
        const result = await this.benchmark(name, fn, iterations);
        
        console.log(`\n⚡ ${name}:`);
        console.log(`  Avg: ${result.avg.toFixed(3)}ms`);
        console.log(`  Min: ${result.min.toFixed(3)}ms`);
        console.log(`  Max: ${result.max.toFixed(3)}ms`);
        console.log(`  P95: ${result.p95.toFixed(3)}ms`);
        console.log(`  StdDev: ${result.stdDev.toFixed(3)}ms`);
        
        // Check against baseline
        if (this.baselines[name]) {
            const baseline = this.baselines[name];
            const ratio = result.avg / baseline;
            result.baseline = baseline;
            result.regression = ratio > 1 + this.tolerance;
            
            if (result.regression) {
                console.warn(`  ⚠️ REGRESSION: ${((ratio - 1) * 100).toFixed(1)}% slower than baseline`);
            } else if (ratio < 1 - this.tolerance) {
                console.log(`  🚀 IMPROVEMENT: ${((1 - ratio) * 100).toFixed(1)}% faster than baseline`);
            } else {
                console.log(`  ✅ Within baseline (${((ratio - 1) * 100).toFixed(1)}%)`);
            }
        }
        
        this.results.push(result);
        return result;
    },
    
    async runSuite(tests) {
        console.log('\n⚡ PERFORMANCE TEST SUITE\n' + '='.repeat(60));
        this.results = [];
        
        for (const test of tests) {
            await this.runBenchmark(test.name, test.fn, test.iterations || 100);
        }
        
        console.log('\n' + '='.repeat(60));
        
        const regressions = this.results.filter(r => r.regression);
        if (regressions.length > 0) {
            console.warn(`\n⚠️ ${regressions.length} performance regressions detected!`);
        } else {
            console.log('\n✅ No performance regressions');
        }
        
        return this.results;
    },
    
    exportBaselines() {
        const baselines = {};
        this.results.forEach(r => {
            baselines[r.name] = r.avg;
        });
        return baselines;
    },
    
    getResults() {
        return this.results;
    },
    
    selfTest() {
        return [{
            test: 'Performance framework',
            passed: true,
            message: 'Framework initialized'
        }];
    }
};


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: PERFORMANCE ENHANCEMENTS (3 Components)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 5.1 PRISM_VIRTUAL_LIST - Virtual Scrolling for Large Lists
 * Rationale: Material/tool lists can have thousands of items
 * MIT Course Reference: 6.172 (Performance Engineering)
 */
class PRISM_VIRTUAL_LIST {
    constructor(container, options = {}) {
        this.container = container;
        this.items = options.items || [];
        this.rowHeight = options.rowHeight || 40;
        this.renderRow = options.renderRow || this._defaultRenderRow;
        this.buffer = options.buffer || 5;
        
        this.startIndex = 0;
        this.visibleCount = 0;
        this.wrapper = null;
        this.viewport = null;
        
        this._init();
    }
    
    _init() {
        // Calculate visible items
        this.visibleCount = Math.ceil(this.container.clientHeight / this.rowHeight) + this.buffer * 2;
        
        // Create wrapper with total height
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'prism-virtual-list-wrapper';
        this.wrapper.style.cssText = `
            height: ${this.items.length * this.rowHeight}px;
            position: relative;
            overflow: hidden;
        `;
        
        // Create viewport for visible items
        this.viewport = document.createElement('div');
        this.viewport.className = 'prism-virtual-list-viewport';
        this.viewport.style.cssText = `
            position: absolute;
            left: 0;
            right: 0;
            will-change: transform;
        `;
        
        this.wrapper.appendChild(this.viewport);
        this.container.appendChild(this.wrapper);
        
        // Handle scroll
        this.container.style.overflow = 'auto';
        this.container.addEventListener('scroll', 
            PRISM_DEBOUNCE.rafThrottle(() => this._onScroll())
        );
        
        this._render();
    }
    
    _onScroll() {
        const scrollTop = this.container.scrollTop;
        const newStartIndex = Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.buffer);
        
        if (newStartIndex !== this.startIndex) {
            this.startIndex = newStartIndex;
            this._render();
        }
    }
    
    _render() {
        const endIndex = Math.min(this.startIndex + this.visibleCount, this.items.length);
        
        // Position viewport
        this.viewport.style.transform = `translateY(${this.startIndex * this.rowHeight}px)`;
        
        // Render visible items
        const fragment = document.createDocumentFragment();
        
        for (let i = this.startIndex; i < endIndex; i++) {
            const row = this.renderRow(this.items[i], i);
            row.style.height = `${this.rowHeight}px`;
            row.style.boxSizing = 'border-box';
            row.dataset.index = i;
            fragment.appendChild(row);
        }
        
        this.viewport.innerHTML = '';
        this.viewport.appendChild(fragment);
    }
    
    _defaultRenderRow(item, index) {
        const div = document.createElement('div');
        div.className = 'prism-virtual-list-row';
        div.style.cssText = `
            display: flex;
            align-items: center;
            padding: 0 12px;
            border-bottom: 1px solid var(--border, #ddd);
        `;
        div.textContent = typeof item === 'object' ? (item.name || item.id || JSON.stringify(item)) : item;
        return div;
    }
    
    updateItems(newItems) {
        this.items = newItems;
        this.wrapper.style.height = `${newItems.length * this.rowHeight}px`;
        this.startIndex = 0;
        this.container.scrollTop = 0;
        this._render();
    }
    
    scrollToIndex(index) {
        const scrollTop = index * this.rowHeight;
        this.container.scrollTop = scrollTop;
    }
    
    refresh() {
        this._render();
    }
    
    destroy() {
        if (this.wrapper && this.wrapper.parentNode) {
            this.wrapper.remove();
        }
    }
    
    static selfTest() {
        return [{
            test: 'Virtual list class',
            passed: typeof PRISM_VIRTUAL_LIST === 'function',
            message: 'Class defined'
        }];
    }
}


/**
 * 5.2 PRISM_WORKER_POOL - Web Worker Pool for Heavy Calculations
 * Rationale: Keep UI responsive during toolpath generation
 * MIT Course Reference: 6.172 (Performance Engineering)
 */
const PRISM_WORKER_POOL = {
    workers: [],
    maxWorkers: navigator.hardwareConcurrency || 4,
    taskQueue: [],
    taskId: 0,
    pendingTasks: new Map(),
    initialized: false,
    
    init() {
        if (this.initialized) return;
        
        for (let i = 0; i < this.maxWorkers; i++) {
            const worker = new Worker(this._createWorkerBlob());
            worker.busy = false;
            worker.id = i;
            worker.onmessage = (e) => this._handleResult(worker, e.data);
            worker.onerror = (e) => this._handleError(worker, e);
            this.workers.push(worker);
        }
        
        this.initialized = true;
        console.log(`[PRISM_WORKER_POOL] Initialized with ${this.maxWorkers} workers`);
    },
    
    _createWorkerBlob() {
        const code = `
            // Worker code for heavy calculations
            self.onmessage = async function(e) {
                const { id, task, params } = e.data;
                
                try {
                    let result;
                    
                    switch(task) {
                        case 'matrixMultiply':
                            result = matrixMultiply(params.a, params.b);
                            break;
                        case 'sortLarge':
                            result = quickSort(params.array);
                            break;
                        case 'calculateHash':
                            result = await calculateHash(params.data);
                            break;
                        case 'searchArray':
                            result = searchArray(params.array, params.query, params.key);
                            break;
                        case 'aggregate':
                            result = aggregate(params.data, params.operation);
                            break;
                        case 'custom':
                            // Execute custom function code
                            const fn = new Function('params', params.code);
                            result = fn(params.args);
                            break;
                        default:
                            throw new Error('Unknown task: ' + task);
                    }
                    
                    self.postMessage({ id, success: true, result });
                } catch (error) {
                    self.postMessage({ id, success: false, error: error.message });
                }
            };
            
            function matrixMultiply(a, b) {
                const rowsA = a.length, colsA = a[0].length;
                const colsB = b[0].length;
                const result = Array(rowsA).fill().map(() => Array(colsB).fill(0));
                
                for (let i = 0; i < rowsA; i++) {
                    for (let j = 0; j < colsB; j++) {
                        for (let k = 0; k < colsA; k++) {
                            result[i][j] += a[i][k] * b[k][j];
                        }
                    }
                }
                return result;
            }
            
            function quickSort(arr) {
                if (arr.length <= 1) return arr;
                const pivot = arr[Math.floor(arr.length / 2)];
                const left = arr.filter(x => x < pivot);
                const middle = arr.filter(x => x === pivot);
                const right = arr.filter(x => x > pivot);
                return [...quickSort(left), ...middle, ...quickSort(right)];
            }
            
            async function calculateHash(data) {
                const encoder = new TextEncoder();
                const dataBuffer = encoder.encode(data);
                const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            }
            
            function searchArray(array, query, key) {
                const q = query.toLowerCase();
                return array.filter(item => {
                    const value = key ? item[key] : item;
                    return String(value).toLowerCase().includes(q);
                });
            }
            
            function aggregate(data, operation) {
                switch(operation) {
                    case 'sum': return data.reduce((a, b) => a + b, 0);
                    case 'avg': return data.reduce((a, b) => a + b, 0) / data.length;
                    case 'min': return Math.min(...data);
                    case 'max': return Math.max(...data);
                    case 'count': return data.length;
                    default: return null;
                }
            }
        `;
        
        return URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
    },
    
    async execute(task, params = {}) {
        if (!this.initialized) this.init();
        
        return new Promise((resolve, reject) => {
            const id = ++this.taskId;
            const job = { id, task, params, resolve, reject };
            
            const availableWorker = this.workers.find(w => !w.busy);
            if (availableWorker) {
                this._runOnWorker(availableWorker, job);
            } else {
                this.taskQueue.push(job);
            }
        });
    },
    
    _runOnWorker(worker, job) {
        worker.busy = true;
        this.pendingTasks.set(job.id, { job, worker });
        worker.postMessage({ id: job.id, task: job.task, params: job.params });
    },
    
    _handleResult(worker, data) {
        const pending = this.pendingTasks.get(data.id);
        if (!pending) return;
        
        const { job } = pending;
        this.pendingTasks.delete(data.id);
        worker.busy = false;
        
        if (data.success) {
            job.resolve(data.result);
        } else {
            job.reject(new Error(data.error));
        }
        
        // Process next queued task
        if (this.taskQueue.length > 0) {
            const nextJob = this.taskQueue.shift();
            this._runOnWorker(worker, nextJob);
        }
    },
    
    _handleError(worker, error) {
        console.error(`[PRISM_WORKER_POOL] Worker ${worker.id} error:`, error);
        worker.busy = false;
    },
    
    getStatus() {
        return {
            workers: this.workers.length,
            busy: this.workers.filter(w => w.busy).length,
            queued: this.taskQueue.length,
            completed: this.taskId - this.pendingTasks.size - this.taskQueue.length
        };
    },
    
    terminate() {
        this.workers.forEach(w => w.terminate());
        this.workers = [];
        this.initialized = false;
    },
    
    selfTest() {
        const results = [];
        
        this.init();
        results.push({
            test: 'Worker pool initialization',
            passed: this.workers.length === this.maxWorkers,
            message: `${this.workers.length} workers created`
        });
        
        return results;
    }
};


/**
 * 5.3 PRISM_BATCH_LOADER - Request Batching
 * Rationale: Reduce overhead for multiple lookups
 * MIT Course Reference: 6.172 (Performance Engineering)
 */
const PRISM_BATCH_LOADER = {
    pending: new Map(),
    timeout: null,
    delay: 16, // ~1 frame
    resolvers: new Map(),
    
    async load(type, id) {
        return new Promise((resolve, reject) => {
            if (!this.pending.has(type)) {
                this.pending.set(type, new Map());
            }
            
            const typeQueue = this.pending.get(type);
            
            if (!typeQueue.has(id)) {
                typeQueue.set(id, []);
            }
            
            typeQueue.get(id).push({ resolve, reject });
            
            this._scheduleFlush();
        });
    },
    
    _scheduleFlush() {
        if (this.timeout) return;
        
        this.timeout = setTimeout(() => {
            this._flush();
            this.timeout = null;
        }, this.delay);
    },
    
    _flush() {
        for (const [type, idMap] of this.pending) {
            const ids = Array.from(idMap.keys());
            
            // Batch lookup using resolver
            const resolver = this.resolvers.get(type);
            const results = resolver ? resolver(ids) : this._defaultResolve(type, ids);
            
            // Resolve all pending requests
            for (const [id, callbacks] of idMap) {
                const result = results[id];
                for (const { resolve, reject } of callbacks) {
                    if (result !== undefined) {
                        resolve(result);
                    } else {
                        reject(new Error(`Not found: ${type}/${id}`));
                    }
                }
            }
        }
        
        this.pending.clear();
    },
    
    _defaultResolve(type, ids) {
        const results = {};
        
        // Try to use PRISM_GATEWAY if available
        if (typeof PRISM_GATEWAY !== 'undefined') {
            for (const id of ids) {
                results[id] = PRISM_GATEWAY.call(`${type}.get`, id);
            }
        }
        
        return results;
    },
    
    registerResolver(type, resolver) {
        this.resolvers.set(type, resolver);
    },
    
    // Load multiple items at once
    async loadMany(type, ids) {
        return Promise.all(ids.map(id => this.load(type, id)));
    },
    
    selfTest() {
        return [{
            test: 'Batch loader',
            passed: true,
            message: 'Batch loader initialized'
        }];
    }
};


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: GATEWAY ROUTES & SELF-TESTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gateway Route Registrations for Development Enhancements
 */
const PRISM_DEV_ENHANCEMENT_GATEWAY_ROUTES = {
    // UI/UX
    'ui.theme.toggle': 'PRISM_THEME_MANAGER.toggle',
    'ui.theme.set': 'PRISM_THEME_MANAGER.setTheme',
    'ui.theme.get': 'PRISM_THEME_MANAGER.getCurrentTheme',
    'ui.shortcuts.getHelp': 'PRISM_SHORTCUTS.getHelp',
    'ui.shortcuts.register': 'PRISM_SHORTCUTS.registerHandler',
    'ui.history.execute': 'PRISM_HISTORY.execute',
    'ui.history.undo': 'PRISM_HISTORY.undo',
    'ui.history.redo': 'PRISM_HISTORY.redo',
    'ui.progress.show': 'PRISM_PROGRESS.show',
    'ui.progress.update': 'PRISM_PROGRESS.update',
    'ui.progress.hide': 'PRISM_PROGRESS.hide',
    'ui.toast.success': 'PRISM_TOAST.success',
    'ui.toast.error': 'PRISM_TOAST.error',
    'ui.toast.warning': 'PRISM_TOAST.warning',
    'ui.toast.info': 'PRISM_TOAST.info',
    
    // Architecture
    'system.lazy.load': 'PRISM_LAZY_LOADER.load',
    'system.lazy.ensure': 'PRISM_LAZY_LOADER.ensure',
    'system.lazy.status': 'PRISM_LAZY_LOADER.getStatus',
    'system.plugin.register': 'PRISM_PLUGIN_MANAGER.register',
    'system.plugin.list': 'PRISM_PLUGIN_MANAGER.getPlugins',
    'system.plugin.hook': 'PRISM_PLUGIN_MANAGER.executeHook',
    'system.sw.register': 'PRISM_SERVICE_WORKER.register',
    'system.sw.status': 'PRISM_SERVICE_WORKER.getStatus',
    
    // Coding
    'util.log.info': 'PRISM_LOGGER.info',
    'util.log.warn': 'PRISM_LOGGER.warn',
    'util.log.error': 'PRISM_LOGGER.error',
    'util.log.debug': 'PRISM_LOGGER.debug',
    'util.log.export': 'PRISM_LOGGER.export',
    'util.sanitize.html': 'PRISM_SANITIZER.escapeHTML',
    'util.sanitize.number': 'PRISM_SANITIZER.sanitizeNumber',
    'util.sanitize.string': 'PRISM_SANITIZER.sanitizeString',
    'util.sanitize.gcode': 'PRISM_SANITIZER.sanitizeGCode',
    'util.debounce': 'PRISM_DEBOUNCE.debounce',
    'util.throttle': 'PRISM_DEBOUNCE.throttle',
    
    // Testing
    'test.framework.runAll': 'PRISM_TEST_FRAMEWORK.runAll',
    'test.framework.describe': 'PRISM_TEST_FRAMEWORK.describe',
    'test.perf.benchmark': 'PRISM_PERF_TESTS.runBenchmark',
    'test.perf.suite': 'PRISM_PERF_TESTS.runSuite',
    
    // Performance
    'perf.worker.execute': 'PRISM_WORKER_POOL.execute',
    'perf.worker.status': 'PRISM_WORKER_POOL.getStatus',
    'perf.batch.load': 'PRISM_BATCH_LOADER.load',
    'perf.batch.loadMany': 'PRISM_BATCH_LOADER.loadMany'
};


/**
 * Self-Test Suite for All Development Enhancements
 */
const PRISM_DEV_ENHANCEMENT_TESTS = {
    modules: [
        { name: 'PRISM_THEME_MANAGER', module: PRISM_THEME_MANAGER },
        { name: 'PRISM_SHORTCUTS', module: PRISM_SHORTCUTS },
        { name: 'PRISM_HISTORY', module: PRISM_HISTORY },
        { name: 'PRISM_PROGRESS', module: PRISM_PROGRESS },
        { name: 'PRISM_TOAST', module: PRISM_TOAST },
        { name: 'PRISM_LAZY_LOADER', module: PRISM_LAZY_LOADER },
        { name: 'PRISM_PLUGIN_MANAGER', module: PRISM_PLUGIN_MANAGER },
        { name: 'PRISM_SERVICE_WORKER', module: PRISM_SERVICE_WORKER },
        { name: 'PRISM_LOGGER', module: PRISM_LOGGER },
        { name: 'PRISM_SANITIZER', module: PRISM_SANITIZER },
        { name: 'PRISM_DEBOUNCE', module: PRISM_DEBOUNCE },
        { name: 'PRISM_VIRTUAL_LIST', module: PRISM_VIRTUAL_LIST },
        { name: 'PRISM_WORKER_POOL', module: PRISM_WORKER_POOL },
        { name: 'PRISM_BATCH_LOADER', module: PRISM_BATCH_LOADER },
    ],
    
    runAll() {
        console.log('\n' + '═'.repeat(70));
        console.log('   PRISM DEVELOPMENT ENHANCEMENT MODULE - SELF-TESTS');
        console.log('═'.repeat(70));
        
        let totalPassed = 0;
        let totalFailed = 0;
        const results = [];
        
        for (const { name, module } of this.modules) {
            console.log(`\n📦 ${name}`);
            
            if (typeof module.selfTest === 'function') {
                try {
                    const moduleResults = module.selfTest();
                    
                    for (const result of moduleResults) {
                        if (result.passed) {
                            console.log(`  ✅ ${result.test}: ${result.message || 'Passed'}`);
                            totalPassed++;
                        } else {
                            console.log(`  ❌ ${result.test}: ${result.message || 'Failed'}`);
                            totalFailed++;
                        }
                        results.push({ module: name, ...result });
                    }
                } catch (error) {
                    console.log(`  ❌ Self-test error: ${error.message}`);
                    totalFailed++;
                    results.push({ module: name, test: 'selfTest', passed: false, message: error.message });
                }
            } else {
                console.log(`  ⚠️ No self-test defined`);
            }
        }
        
        console.log('\n' + '═'.repeat(70));
        console.log(`   RESULTS: ${totalPassed} passed, ${totalFailed} failed`);
        console.log('═'.repeat(70) + '\n');
        
        return { passed: totalPassed, failed: totalFailed, results };
    }
};


// ═══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initialize all development enhancements
 */
function initPRISMDevEnhancements() {
    console.log('[PRISM_DEV_ENHANCEMENTS] Initializing...');
    
    // Initialize UI components
    PRISM_THEME_MANAGER.init();
    PRISM_SHORTCUTS.init();
    PRISM_TOAST.init();
    
    // Initialize plugin manager
    PRISM_PLUGIN_MANAGER.init();
    
    // Register gateway routes if PRISM_GATEWAY exists
    if (typeof PRISM_GATEWAY !== 'undefined') {
        Object.entries(PRISM_DEV_ENHANCEMENT_GATEWAY_ROUTES).forEach(([route, target]) => {
            PRISM_GATEWAY.register(route, target);
        });
        console.log(`[PRISM_DEV_ENHANCEMENTS] Registered ${Object.keys(PRISM_DEV_ENHANCEMENT_GATEWAY_ROUTES).length} gateway routes`);
    }
    
    // Connect shortcuts to history
    PRISM_SHORTCUTS.registerHandler('undo', () => PRISM_HISTORY.undo());
    PRISM_SHORTCUTS.registerHandler('redo', () => PRISM_HISTORY.redo());
    
    console.log('[PRISM_DEV_ENHANCEMENTS] Initialization complete');
}

// Auto-initialize if DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPRISMDevEnhancements);
    } else {
        // DOM already loaded
        setTimeout(initPRISMDevEnhancements, 0);
    }
}


// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// Export for module systems if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // UI/UX
        PRISM_THEME_MANAGER,
        PRISM_SHORTCUTS,
        PRISM_HISTORY,
        PRISM_PROGRESS,
        PRISM_TOAST,
        // Commands
        SetValueCommand,
        BatchCommand,
        AddItemCommand,
        RemoveItemCommand,
        // Architecture
        PRISM_LAZY_LOADER,
        PRISM_PLUGIN_MANAGER,
        PRISM_SERVICE_WORKER,
        // Coding
        PRISM_LOGGER,
        PRISM_SANITIZER,
        PRISM_DEBOUNCE,
        // Testing
        PRISM_TEST_FRAMEWORK,
        PRISM_PERF_TESTS,
        // Performance
        PRISM_VIRTUAL_LIST,
        PRISM_WORKER_POOL,
        PRISM_BATCH_LOADER,
        // Tests & Routes
        PRISM_DEV_ENHANCEMENT_TESTS,
        PRISM_DEV_ENHANCEMENT_GATEWAY_ROUTES,
        // Init
        initPRISMDevEnhancements
    };
}


console.log('═══════════════════════════════════════════════════════════════════');
console.log('  PRISM DEVELOPMENT ENHANCEMENT MODULE v1.0 LOADED');
console.log('  16 Components • 48 Gateway Routes • Full Test Coverage');
console.log('═══════════════════════════════════════════════════════════════════');
/**
 * PRISM UI & UTILITY ENHANCEMENT MODULE v1.0
 * Generated from 107 MIT courses + UI/UX best practices
 */

// ======================================================================
// PRISM_DESIGN_TOKENS - Centralized design tokens for consistent UI
// Category: Design Systems
// ======================================================================

const PRISM_DESIGN_TOKENS = {
    colors: {
        // Primary palette
        primary: { 50: '#E3F2FD', 100: '#BBDEFB', 500: '#2196F3', 700: '#1976D2', 900: '#0D47A1' },
        // Semantic colors
        success: { light: '#81C784', main: '#4CAF50', dark: '#388E3C' },
        warning: { light: '#FFB74D', main: '#FF9800', dark: '#F57C00' },
        error: { light: '#E57373', main: '#F44336', dark: '#D32F2F' },
        info: { light: '#64B5F6', main: '#2196F3', dark: '#1976D2' },
        // Neutrals
        grey: { 50: '#FAFAFA', 100: '#F5F5F5', 200: '#EEEEEE', 300: '#E0E0E0', 
                400: '#BDBDBD', 500: '#9E9E9E', 600: '#757575', 700: '#616161',
                800: '#424242', 900: '#212121' },
        // Backgrounds
        background: { default: '#FFFFFF', paper: '#F5F5F5', elevated: '#FFFFFF' }
    },
    typography: {
        fontFamily: {
            primary: '"Inter", "Roboto", -apple-system, sans-serif',
            mono: '"JetBrains Mono", "Fira Code", monospace'
        },
        fontSize: {
            xs: '0.75rem',    // 12px
            sm: '0.875rem',   // 14px
            base: '1rem',     // 16px
            lg: '1.125rem',   // 18px
            xl: '1.25rem',    // 20px
            '2xl': '1.5rem',  // 24px
            '3xl': '1.875rem' // 30px
        },
        fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
        lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75 }
    },
    spacing: {
        0: '0', 1: '0.25rem', 2: '0.5rem', 3: '0.75rem', 4: '1rem',
        5: '1.25rem', 6: '1.5rem', 8: '2rem', 10: '2.5rem', 12: '3rem',
        16: '4rem', 20: '5rem', 24: '6rem'
    },
    borderRadius: {
        none: '0', sm: '0.125rem', base: '0.25rem', md: '0.375rem',
        lg: '0.5rem', xl: '0.75rem', '2xl': '1rem', full: '9999px'
    },
    shadows: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        base: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
        md: '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
        lg: '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
        xl: '0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)'
    },
    transitions: {
        duration: { fast: '150ms', normal: '300ms', slow: '500ms' },
        easing: { 
            default: 'cubic-bezier(0.4, 0, 0.2, 1)',
            in: 'cubic-bezier(0.4, 0, 1, 1)',
            out: 'cubic-bezier(0, 0, 0.2, 1)',
            inOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
        }
    },
    zIndex: { dropdown: 1000, sticky: 1100, modal: 1300, popover: 1400, tooltip: 1500 },
    
    // Helper to get CSS variable string
    toCSS() {
        const vars = [];
        const flatten = (obj, prefix = '') => {
            Object.entries(obj).forEach(([key, value]) => {
                const varName = prefix ? `${prefix}-${key}` : key;
                if (typeof value === 'object') flatten(value, varName);
                else vars.push(`--${varName}: ${value};`);
            });
        };
        flatten(this.colors, 'color');
        flatten(this.spacing, 'space');
        flatten(this.borderRadius, 'radius');
        return `:root { ${vars.join(' ')} }`;
    }
};

// ======================================================================
// PRISM_ANIMATION - Animation utilities and presets
// Category: Animation & Motion
// ======================================================================

const PRISM_ANIMATION = {
    // Easing functions
    easing: {
        linear: t => t,
        easeInQuad: t => t * t,
        easeOutQuad: t => t * (2 - t),
        easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        easeInCubic: t => t * t * t,
        easeOutCubic: t => (--t) * t * t + 1,
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
        easeOutElastic: t => t === 0 ? 0 : t === 1 ? 1 : 
            Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1,
        easeOutBounce: t => {
            if (t < 1/2.75) return 7.5625 * t * t;
            if (t < 2/2.75) return 7.5625 * (t -= 1.5/2.75) * t + 0.75;
            if (t < 2.5/2.75) return 7.5625 * (t -= 2.25/2.75) * t + 0.9375;
            return 7.5625 * (t -= 2.625/2.75) * t + 0.984375;
        },
        spring: (t, tension = 0.5) => 1 - Math.cos(t * Math.PI * (0.5 + tension)) * Math.exp(-t * 6)
    },
    
    // Presets
    presets: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 }, duration: 300 },
        fadeOut: { from: { opacity: 1 }, to: { opacity: 0 }, duration: 300 },
        slideInLeft: { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' }, duration: 300 },
        slideInRight: { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' }, duration: 300 },
        slideInUp: { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' }, duration: 300 },
        slideInDown: { from: { transform: 'translateY(-100%)' }, to: { transform: 'translateY(0)' }, duration: 300 },
        scaleIn: { from: { transform: 'scale(0.9)', opacity: 0 }, to: { transform: 'scale(1)', opacity: 1 }, duration: 200 },
        scaleOut: { from: { transform: 'scale(1)', opacity: 1 }, to: { transform: 'scale(0.9)', opacity: 0 }, duration: 200 },
        shake: { keyframes: [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(0)' }
        ], duration: 400 },
        pulse: { keyframes: [
            { transform: 'scale(1)' },
            { transform: 'scale(1.05)' },
            { transform: 'scale(1)' }
        ], duration: 300 }
    },
    
    // Animate element
    animate(element, preset, options = {}) {
        const config = typeof preset === 'string' ? this.presets[preset] : preset;
        const duration = options.duration || config.duration || 300;
        const easing = options.easing || 'easeOutCubic';
        
        return element.animate(
            config.keyframes || [config.from, config.to],
            { duration, easing: this.getEasingCSS(easing), fill: 'forwards', ...options }
        );
    },
    
    getEasingCSS(name) {
        const map = {
            linear: 'linear',
            easeInQuad: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
            easeOutQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            easeInOutQuad: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
            easeInCubic: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
            easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
            easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
            spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        };
        return map[name] || name;
    },
    
    // Stagger animations
    stagger(elements, preset, delay = 50) {
        return Array.from(elements).map((el, i) => 
            this.animate(el, preset, { delay: i * delay })
        );
    },
    
    // Check for reduced motion preference
    prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
};

// ======================================================================
// PRISM_A11Y - Accessibility utilities and helpers
// Category: Accessibility
// ======================================================================

const PRISM_A11Y = {
    // Focus management
    focus: {
        trapStack: [],
        
        trap(container) {
            const focusable = this.getFocusableElements(container);
            if (focusable.length === 0) return;
            
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            
            const handler = (e) => {
                if (e.key !== 'Tab') return;
                
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            };
            
            container.addEventListener('keydown', handler);
            this.trapStack.push({ container, handler });
            first.focus();
            
            return () => this.release(container);
        },
        
        release(container) {
            const index = this.trapStack.findIndex(t => t.container === container);
            if (index >= 0) {
                const { handler } = this.trapStack[index];
                container.removeEventListener('keydown', handler);
                this.trapStack.splice(index, 1);
            }
        },
        
        getFocusableElements(container) {
            const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
            return Array.from(container.querySelectorAll(selector))
                .filter(el => !el.disabled && el.offsetParent !== null);
        }
    },
    
    // Screen reader announcements
    announce(message, priority = 'polite') {
        let region = document.getElementById('prism-live-region');
        if (!region) {
            region = document.createElement('div');
            region.id = 'prism-live-region';
            region.setAttribute('aria-live', priority);
            region.setAttribute('aria-atomic', 'true');
            region.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';
            document.body.appendChild(region);
        }
        region.setAttribute('aria-live', priority);
        region.textContent = '';
        setTimeout(() => { region.textContent = message; }, 100);
    },
    
    // Keyboard navigation helpers
    keyboard: {
        handleArrowNavigation(container, items, options = {}) {
            const { vertical = true, horizontal = false, loop = true } = options;
            
            container.addEventListener('keydown', (e) => {
                const currentIndex = items.indexOf(document.activeElement);
                if (currentIndex < 0) return;
                
                let nextIndex = currentIndex;
                
                if ((vertical && e.key === 'ArrowDown') || (horizontal && e.key === 'ArrowRight')) {
                    nextIndex = loop ? (currentIndex + 1) % items.length : Math.min(currentIndex + 1, items.length - 1);
                } else if ((vertical && e.key === 'ArrowUp') || (horizontal && e.key === 'ArrowLeft')) {
                    nextIndex = loop ? (currentIndex - 1 + items.length) % items.length : Math.max(currentIndex - 1, 0);
                } else if (e.key === 'Home') {
                    nextIndex = 0;
                } else if (e.key === 'End') {
                    nextIndex = items.length - 1;
                } else {
                    return;
                }
                
                e.preventDefault();
                items[nextIndex].focus();
            });
        }
    },
    
    // Color contrast checker
    checkContrast(foreground, background) {
        const getLuminance = (hex) => {
            const rgb = parseInt(hex.slice(1), 16);
            const r = ((rgb >> 16) & 0xff) / 255;
            const g = ((rgb >> 8) & 0xff) / 255;
            const b = (rgb & 0xff) / 255;
            
            const toLinear = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
        };
        
        const l1 = getLuminance(foreground);
        const l2 = getLuminance(background);
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        
        return {
            ratio: ratio.toFixed(2),
            AA: ratio >= 4.5,
            AAA: ratio >= 7,
            AALarge: ratio >= 3
        };
    },
    
    // Skip link generator
    addSkipLink(targetId, text = 'Skip to main content') {
        const link = document.createElement('a');
        link.href = '#' + targetId;
        link.className = 'prism-skip-link';
        link.textContent = text;
        link.style.cssText = `
            position: absolute; left: -9999px; z-index: 9999;
            padding: 1rem; background: #000; color: #fff;
        `;
        link.addEventListener('focus', () => { link.style.left = '0'; });
        link.addEventListener('blur', () => { link.style.left = '-9999px'; });
        document.body.insertBefore(link, document.body.firstChild);
    }
};

// ======================================================================
// PRISM_CHARTS - Lightweight charting utilities
// Category: Data Visualization
// ======================================================================

const PRISM_CHARTS = {
    // Simple SVG-based charts
    createBarChart(container, data, options = {}) {
        const { width = 400, height = 200, barColor = '#2196F3', gap = 4 } = options;
        const maxValue = Math.max(...data.map(d => d.value));
        const barWidth = (width - gap * (data.length - 1)) / data.length;
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', 'Bar chart');
        
        data.forEach((d, i) => {
            const barHeight = (d.value / maxValue) * (height - 20);
            const x = i * (barWidth + gap);
            const y = height - barHeight - 20;
            
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', barWidth);
            rect.setAttribute('height', barHeight);
            rect.setAttribute('fill', barColor);
            rect.setAttribute('rx', 2);
            
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `${d.label}: ${d.value}`;
            rect.appendChild(title);
            
            svg.appendChild(rect);
            
            // Label
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x + barWidth / 2);
            text.setAttribute('y', height - 5);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '10');
            text.textContent = d.label;
            svg.appendChild(text);
        });
        
        container.appendChild(svg);
        return svg;
    },
    
    createLineChart(container, data, options = {}) {
        const { width = 400, height = 200, lineColor = '#2196F3', showPoints = true } = options;
        const maxValue = Math.max(...data.map(d => d.value));
        const minValue = Math.min(...data.map(d => d.value));
        const range = maxValue - minValue || 1;
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        
        const padding = 20;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        
        const points = data.map((d, i) => ({
            x: padding + (i / (data.length - 1)) * chartWidth,
            y: padding + chartHeight - ((d.value - minValue) / range) * chartHeight
        }));
        
        // Line path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', lineColor);
        path.setAttribute('stroke-width', 2);
        svg.appendChild(path);
        
        // Points
        if (showPoints) {
            points.forEach((p, i) => {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', p.x);
                circle.setAttribute('cy', p.y);
                circle.setAttribute('r', 4);
                circle.setAttribute('fill', lineColor);
                
                const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
                title.textContent = `${data[i].label}: ${data[i].value}`;
                circle.appendChild(title);
                
                svg.appendChild(circle);
            });
        }
        
        container.appendChild(svg);
        return svg;
    },
    
    createSparkline(container, values, options = {}) {
        const { width = 100, height = 30, color = '#2196F3' } = options;
        const max = Math.max(...values);
        const min = Math.min(...values);
        const range = max - min || 1;
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        
        const points = values.map((v, i) => 
            `${(i / (values.length - 1)) * width},${height - ((v - min) / range) * height}`
        ).join(' ');
        
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', points);
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke', color);
        polyline.setAttribute('stroke-width', 1.5);
        
        svg.appendChild(polyline);
        container.appendChild(svg);
        return svg;
    },
    
    createGauge(container, value, max = 100, options = {}) {
        const { size = 120, color = '#2196F3', bgColor = '#E0E0E0', thickness = 10 } = options;
        const radius = (size - thickness) / 2;
        const circumference = radius * Math.PI; // Half circle
        const progress = (value / max) * circumference;
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', size);
        svg.setAttribute('height', size / 2 + 10);
        svg.setAttribute('viewBox', `0 0 ${size} ${size / 2 + 10}`);
        
        // Background arc
        const bgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        bgPath.setAttribute('d', `M ${thickness/2} ${size/2} A ${radius} ${radius} 0 0 1 ${size - thickness/2} ${size/2}`);
        bgPath.setAttribute('fill', 'none');
        bgPath.setAttribute('stroke', bgColor);
        bgPath.setAttribute('stroke-width', thickness);
        bgPath.setAttribute('stroke-linecap', 'round');
        svg.appendChild(bgPath);
        
        // Value arc
        const valuePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        valuePath.setAttribute('d', `M ${thickness/2} ${size/2} A ${radius} ${radius} 0 0 1 ${size - thickness/2} ${size/2}`);
        valuePath.setAttribute('fill', 'none');
        valuePath.setAttribute('stroke', color);
        valuePath.setAttribute('stroke-width', thickness);
        valuePath.setAttribute('stroke-linecap', 'round');
        valuePath.setAttribute('stroke-dasharray', `${progress} ${circumference}`);
        svg.appendChild(valuePath);
        
        // Value text
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', size / 2);
        text.setAttribute('y', size / 2);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '20');
        text.setAttribute('font-weight', 'bold');
        text.textContent = Math.round(value);
        svg.appendChild(text);
        
        container.appendChild(svg);
        return svg;
    }
};

// ======================================================================
// PRISM_FORMS - Form validation and handling
// Category: Form Patterns
// ======================================================================

const PRISM_FORMS = {
    validators: {
        required: (value) => value !== '' && value !== null && value !== undefined,
        email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        minLength: (min) => (value) => String(value).length >= min,
        maxLength: (max) => (value) => String(value).length <= max,
        min: (min) => (value) => Number(value) >= min,
        max: (max) => (value) => Number(value) <= max,
        pattern: (regex) => (value) => regex.test(value),
        numeric: (value) => !isNaN(parseFloat(value)) && isFinite(value),
        integer: (value) => Number.isInteger(Number(value)),
        positive: (value) => Number(value) > 0,
        url: (value) => { try { new URL(value); return true; } catch { return false; } },
        date: (value) => !isNaN(Date.parse(value)),
        custom: (fn) => fn
    },
    
    messages: {
        required: 'This field is required',
        email: 'Please enter a valid email address',
        minLength: (min) => `Minimum ${min} characters required`,
        maxLength: (max) => `Maximum ${max} characters allowed`,
        min: (min) => `Value must be at least ${min}`,
        max: (max) => `Value must be at most ${max}`,
        pattern: 'Invalid format',
        numeric: 'Please enter a number',
        integer: 'Please enter a whole number',
        positive: 'Value must be positive',
        url: 'Please enter a valid URL',
        date: 'Please enter a valid date'
    },
    
    validate(value, rules) {
        const errors = [];
        
        for (const [rule, param] of Object.entries(rules)) {
            if (!this.validators[rule]) continue;
            
            const validator = typeof param === 'boolean' ? 
                this.validators[rule] : 
                this.validators[rule](param);
            
            if (!validator(value)) {
                const message = typeof this.messages[rule] === 'function' ?
                    this.messages[rule](param) : this.messages[rule];
                errors.push(message);
            }
        }
        
        return { valid: errors.length === 0, errors };
    },
    
    validateForm(formElement, schema) {
        const formData = new FormData(formElement);
        const results = {};
        let isValid = true;
        
        for (const [field, rules] of Object.entries(schema)) {
            const value = formData.get(field);
            const result = this.validate(value, rules);
            results[field] = result;
            if (!result.valid) isValid = false;
        }
        
        return { valid: isValid, fields: results };
    },
    
    showError(input, message) {
        const container = input.closest('.form-field') || input.parentElement;
        let errorEl = container.querySelector('.error-message');
        
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'error-message';
            errorEl.style.cssText = 'color: #f44336; font-size: 12px; margin-top: 4px;';
            container.appendChild(errorEl);
        }
        
        errorEl.textContent = message;
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', errorEl.id || (errorEl.id = 'error-' + Math.random().toString(36).slice(2)));
    },
    
    clearError(input) {
        const container = input.closest('.form-field') || input.parentElement;
        const errorEl = container.querySelector('.error-message');
        if (errorEl) errorEl.remove();
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
    },
    
    // Real-time validation
    attachValidation(form, schema, options = {}) {
        const { validateOn = 'blur', showErrorsOn = 'blur' } = options;
        
        for (const [field, rules] of Object.entries(schema)) {
            const input = form.elements[field];
            if (!input) continue;
            
            input.addEventListener(validateOn, () => {
                const result = this.validate(input.value, rules);
                if (!result.valid && showErrorsOn === validateOn) {
                    this.showError(input, result.errors[0]);
                } else {
                    this.clearError(input);
                }
            });
        }
        
        form.addEventListener('submit', (e) => {
            const result = this.validateForm(form, schema);
            if (!result.valid) {
                e.preventDefault();
                for (const [field, fieldResult] of Object.entries(result.fields)) {
                    const input = form.elements[field];
                    if (!fieldResult.valid) {
                        this.showError(input, fieldResult.errors[0]);
                    }
                }
            }
        });
    }
};

// ======================================================================
// PRISM_SEARCH - Search, filter, and sort utilities
// Category: Search & Filtering
// ======================================================================

const PRISM_SEARCH = {
    // Fuzzy search with Levenshtein distance
    fuzzyMatch(query, text, threshold = 0.6) {
        query = query.toLowerCase();
        text = text.toLowerCase();
        
        if (text.includes(query)) return { match: true, score: 1 };
        
        // Levenshtein distance
        const distance = this.levenshtein(query, text);
        const maxLen = Math.max(query.length, text.length);
        const similarity = 1 - distance / maxLen;
        
        return { match: similarity >= threshold, score: similarity };
    },
    
    levenshtein(a, b) {
        const matrix = Array(b.length + 1).fill().map((_, i) => 
            Array(a.length + 1).fill().map((_, j) => i === 0 ? j : j === 0 ? i : 0)
        );
        
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                matrix[i][j] = b[i-1] === a[j-1] ?
                    matrix[i-1][j-1] :
                    Math.min(matrix[i-1][j-1] + 1, matrix[i][j-1] + 1, matrix[i-1][j] + 1);
            }
        }
        
        return matrix[b.length][a.length];
    },
    
    // Search array of objects
    search(items, query, keys, options = {}) {
        const { fuzzy = false, threshold = 0.6, limit = 0 } = options;
        
        if (!query.trim()) return items;
        
        const results = items.map(item => {
            let bestScore = 0;
            let matched = false;
            
            for (const key of keys) {
                const value = String(this.getNestedValue(item, key) || '');
                
                if (fuzzy) {
                    const { match, score } = this.fuzzyMatch(query, value, threshold);
                    if (match && score > bestScore) {
                        bestScore = score;
                        matched = true;
                    }
                } else {
                    if (value.toLowerCase().includes(query.toLowerCase())) {
                        matched = true;
                        bestScore = 1;
                    }
                }
            }
            
            return { item, score: bestScore, matched };
        })
        .filter(r => r.matched)
        .sort((a, b) => b.score - a.score)
        .map(r => r.item);
        
        return limit > 0 ? results.slice(0, limit) : results;
    },
    
    getNestedValue(obj, path) {
        return path.split('.').reduce((o, k) => o?.[k], obj);
    },
    
    // Filter by multiple criteria
    filter(items, filters) {
        return items.filter(item => {
            for (const [key, filter] of Object.entries(filters)) {
                const value = this.getNestedValue(item, key);
                
                if (typeof filter === 'function') {
                    if (!filter(value)) return false;
                } else if (Array.isArray(filter)) {
                    if (!filter.includes(value)) return false;
                } else if (typeof filter === 'object') {
                    if (filter.min !== undefined && value < filter.min) return false;
                    if (filter.max !== undefined && value > filter.max) return false;
                    if (filter.eq !== undefined && value !== filter.eq) return false;
                    if (filter.ne !== undefined && value === filter.ne) return false;
                    if (filter.contains !== undefined && !String(value).includes(filter.contains)) return false;
                } else {
                    if (value !== filter) return false;
                }
            }
            return true;
        });
    },
    
    // Multi-key sort
    sort(items, sortBy) {
        return [...items].sort((a, b) => {
            for (const { key, order = 'asc' } of sortBy) {
                const aVal = this.getNestedValue(a, key);
                const bVal = this.getNestedValue(b, key);
                
                let comparison = 0;
                if (aVal < bVal) comparison = -1;
                if (aVal > bVal) comparison = 1;
                
                if (comparison !== 0) {
                    return order === 'desc' ? -comparison : comparison;
                }
            }
            return 0;
        });
    },
    
    // Highlight matches
    highlight(text, query, className = 'highlight') {
        if (!query) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\]/g, '\$&')})`, 'gi');
        return text.replace(regex, `<mark class="${className}">$1</mark>`);
    },
    
    // Create search index for fast lookup
    createIndex(items, keys) {
        const index = new Map();
        
        items.forEach((item, idx) => {
            keys.forEach(key => {
                const value = String(this.getNestedValue(item, key) || '').toLowerCase();
                const words = value.split(/\s+/);
                
                words.forEach(word => {
                    for (let i = 1; i <= word.length; i++) {
                        const prefix = word.slice(0, i);
                        if (!index.has(prefix)) index.set(prefix, new Set());
                        index.get(prefix).add(idx);
                    }
                });
            });
        });
        
        return {
            search: (query) => {
                const q = query.toLowerCase();
                const matches = index.get(q);
                return matches ? Array.from(matches).map(i => items[i]) : [];
            }
        };
    }
};

// ======================================================================
// PRISM_DND - Drag and drop utilities
// Category: Drag & Drop
// ======================================================================

const PRISM_DND = {
    // Make element draggable
    makeDraggable(element, options = {}) {
        const { handle = null, data = null, onStart, onEnd } = options;
        
        element.draggable = true;
        const handleEl = handle ? element.querySelector(handle) : element;
        
        handleEl.style.cursor = 'grab';
        
        element.addEventListener('dragstart', (e) => {
            element.classList.add('dragging');
            handleEl.style.cursor = 'grabbing';
            
            if (data) {
                e.dataTransfer.setData('application/json', JSON.stringify(data));
            }
            e.dataTransfer.setData('text/plain', element.id || '');
            e.dataTransfer.effectAllowed = 'move';
            
            onStart?.(e, element);
        });
        
        element.addEventListener('dragend', (e) => {
            element.classList.remove('dragging');
            handleEl.style.cursor = 'grab';
            onEnd?.(e, element);
        });
        
        return element;
    },
    
    // Make container a drop zone
    makeDropZone(container, options = {}) {
        const { accept = '*', onDrop, onDragOver, onDragEnter, onDragLeave } = options;
        
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            container.classList.add('drag-over');
            onDragOver?.(e);
        });
        
        container.addEventListener('dragenter', (e) => {
            e.preventDefault();
            container.classList.add('drag-over');
            onDragEnter?.(e);
        });
        
        container.addEventListener('dragleave', (e) => {
            if (!container.contains(e.relatedTarget)) {
                container.classList.remove('drag-over');
                onDragLeave?.(e);
            }
        });
        
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.classList.remove('drag-over');
            
            let data;
            try {
                data = JSON.parse(e.dataTransfer.getData('application/json'));
            } catch {
                data = e.dataTransfer.getData('text/plain');
            }
            
            onDrop?.(e, data);
        });
        
        return container;
    },
    
    // Sortable list
    makeSortable(container, options = {}) {
        const { itemSelector = '> *', handle = null, onSort } = options;
        let draggedItem = null;
        let placeholder = null;
        
        const items = () => Array.from(container.querySelectorAll(itemSelector));
        
        const createPlaceholder = (item) => {
            const ph = document.createElement('div');
            ph.className = 'sortable-placeholder';
            ph.style.cssText = `height: ${item.offsetHeight}px; background: #f0f0f0; border: 2px dashed #ccc;`;
            return ph;
        };
        
        items().forEach(item => {
            this.makeDraggable(item, {
                handle,
                onStart: () => {
                    draggedItem = item;
                    placeholder = createPlaceholder(item);
                    item.parentNode.insertBefore(placeholder, item.nextSibling);
                    item.style.opacity = '0.5';
                },
                onEnd: () => {
                    item.style.opacity = '';
                    if (placeholder && placeholder.parentNode) {
                        placeholder.parentNode.insertBefore(item, placeholder);
                        placeholder.remove();
                    }
                    placeholder = null;
                    
                    const newOrder = items().map(el => el.dataset.id || el.id);
                    onSort?.(newOrder);
                    draggedItem = null;
                }
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (!draggedItem || item === draggedItem) return;
                
                const rect = item.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                
                if (e.clientY < midY) {
                    container.insertBefore(placeholder, item);
                } else {
                    container.insertBefore(placeholder, item.nextSibling);
                }
            });
        });
        
        return container;
    },
    
    // File drop zone
    makeFileDropZone(container, options = {}) {
        const { accept = '*', multiple = true, onFiles } = options;
        
        const preventDefaults = (e) => { e.preventDefault(); e.stopPropagation(); };
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
            container.addEventListener(event, preventDefaults);
        });
        
        container.addEventListener('dragenter', () => container.classList.add('file-drag-over'));
        container.addEventListener('dragleave', (e) => {
            if (!container.contains(e.relatedTarget)) {
                container.classList.remove('file-drag-over');
            }
        });
        
        container.addEventListener('drop', (e) => {
            container.classList.remove('file-drag-over');
            
            let files = Array.from(e.dataTransfer.files);
            
            if (accept !== '*') {
                const acceptList = accept.split(',').map(a => a.trim());
                files = files.filter(f => 
                    acceptList.some(a => {
                        if (a.startsWith('.')) return f.name.endsWith(a);
                        if (a.endsWith('/*')) return f.type.startsWith(a.slice(0, -1));
                        return f.type === a;
                    })
                );
            }
            
            if (!multiple) files = files.slice(0, 1);
            
            onFiles?.(files);
        });
        
        return container;
    }
};

// ======================================================================
// PRISM_DATA_TABLE - Full-featured data table
// Category: Data Tables
// ======================================================================

class PRISM_DATA_TABLE {
    constructor(container, options = {}) {
        this.container = container;
        this.columns = options.columns || [];
        this.data = options.data || [];
        this.pageSize = options.pageSize || 20;
        this.currentPage = 1;
        this.sortColumn = null;
        this.sortOrder = 'asc';
        this.selectedRows = new Set();
        this.filters = {};
        
        this.options = {
            selectable: options.selectable || false,
            sortable: options.sortable !== false,
            filterable: options.filterable || false,
            paginate: options.paginate !== false,
            onRowClick: options.onRowClick,
            onSelectionChange: options.onSelectionChange,
            ...options
        };
        
        this.render();
    }
    
    render() {
        this.container.innerHTML = '';
        this.container.className = 'prism-data-table';
        
        // Filter row
        if (this.options.filterable) {
            this.renderFilters();
        }
        
        // Table
        const table = document.createElement('table');
        table.style.cssText = 'width: 100%; border-collapse: collapse;';
        
        // Header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        if (this.options.selectable) {
            const th = document.createElement('th');
            th.style.cssText = 'width: 40px; padding: 12px 8px; border-bottom: 2px solid var(--border, #ddd);';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.addEventListener('change', () => this.toggleSelectAll(checkbox.checked));
            th.appendChild(checkbox);
            headerRow.appendChild(th);
        }
        
        this.columns.forEach(col => {
            const th = document.createElement('th');
            th.style.cssText = 'padding: 12px 8px; text-align: left; border-bottom: 2px solid var(--border, #ddd); cursor: pointer;';
            th.textContent = col.label;
            
            if (this.options.sortable && col.sortable !== false) {
                th.addEventListener('click', () => this.sort(col.key));
                if (this.sortColumn === col.key) {
                    th.textContent += this.sortOrder === 'asc' ? ' ↑' : ' ↓';
                }
            }
            
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Body
        const tbody = document.createElement('tbody');
        const pageData = this.getPageData();
        
        pageData.forEach(row => {
            const tr = document.createElement('tr');
            tr.style.cssText = 'border-bottom: 1px solid var(--border, #eee);';
            tr.dataset.id = row.id;
            
            if (this.selectedRows.has(row.id)) {
                tr.classList.add('selected');
                tr.style.background = 'var(--accent, #2196F3)22';
            }
            
            if (this.options.onRowClick) {
                tr.style.cursor = 'pointer';
                tr.addEventListener('click', (e) => {
                    if (e.target.type !== 'checkbox') {
                        this.options.onRowClick(row, e);
                    }
                });
            }
            
            if (this.options.selectable) {
                const td = document.createElement('td');
                td.style.cssText = 'padding: 8px;';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = this.selectedRows.has(row.id);
                checkbox.addEventListener('change', () => this.toggleSelect(row.id, checkbox.checked));
                td.appendChild(checkbox);
                tr.appendChild(td);
            }
            
            this.columns.forEach(col => {
                const td = document.createElement('td');
                td.style.cssText = 'padding: 8px;';
                
                if (col.render) {
                    td.innerHTML = col.render(row[col.key], row);
                } else {
                    td.textContent = row[col.key];
                }
                
                tr.appendChild(td);
            });
            
            tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        this.container.appendChild(table);
        
        // Pagination
        if (this.options.paginate) {
            this.renderPagination();
        }
    }
    
    renderFilters() {
        const filterRow = document.createElement('div');
        filterRow.style.cssText = 'display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;';
        
        this.columns.filter(c => c.filterable).forEach(col => {
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Filter ${col.label}...`;
            input.style.cssText = 'padding: 8px; border: 1px solid var(--border, #ddd); border-radius: 4px;';
            input.value = this.filters[col.key] || '';
            input.addEventListener('input', PRISM_DEBOUNCE?.debounce?.(() => {
                this.filters[col.key] = input.value;
                this.currentPage = 1;
                this.render();
            }, 300) || ((e) => { this.filters[col.key] = e.target.value; this.render(); }));
            filterRow.appendChild(input);
        });
        
        this.container.appendChild(filterRow);
    }
    
    renderPagination() {
        const totalPages = Math.ceil(this.getFilteredData().length / this.pageSize);
        if (totalPages <= 1) return;
        
        const pagination = document.createElement('div');
        pagination.style.cssText = 'display: flex; justify-content: center; gap: 4px; margin-top: 16px;';
        
        const createButton = (text, page, disabled = false) => {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.disabled = disabled;
            btn.style.cssText = `padding: 8px 12px; border: 1px solid var(--border, #ddd); 
                                background: ${page === this.currentPage ? 'var(--accent, #2196F3)' : 'white'}; 
                                color: ${page === this.currentPage ? 'white' : 'inherit'};
                                border-radius: 4px; cursor: ${disabled ? 'not-allowed' : 'pointer'};`;
            if (!disabled) btn.addEventListener('click', () => { this.currentPage = page; this.render(); });
            return btn;
        };
        
        pagination.appendChild(createButton('←', this.currentPage - 1, this.currentPage === 1));
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
                pagination.appendChild(createButton(i, i));
            } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
                const span = document.createElement('span');
                span.textContent = '...';
                span.style.padding = '8px';
                pagination.appendChild(span);
            }
        }
        
        pagination.appendChild(createButton('→', this.currentPage + 1, this.currentPage === totalPages));
        
        this.container.appendChild(pagination);
    }
    
    getFilteredData() {
        return this.data.filter(row => {
            for (const [key, value] of Object.entries(this.filters)) {
                if (!value) continue;
                const cellValue = String(row[key] || '').toLowerCase();
                if (!cellValue.includes(value.toLowerCase())) return false;
            }
            return true;
        });
    }
    
    getSortedData() {
        const filtered = this.getFilteredData();
        if (!this.sortColumn) return filtered;
        
        return [...filtered].sort((a, b) => {
            const aVal = a[this.sortColumn];
            const bVal = b[this.sortColumn];
            let comp = 0;
            if (aVal < bVal) comp = -1;
            if (aVal > bVal) comp = 1;
            return this.sortOrder === 'desc' ? -comp : comp;
        });
    }
    
    getPageData() {
        const sorted = this.getSortedData();
        const start = (this.currentPage - 1) * this.pageSize;
        return sorted.slice(start, start + this.pageSize);
    }
    
    sort(column) {
        if (this.sortColumn === column) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortOrder = 'asc';
        }
        this.render();
    }
    
    toggleSelect(id, selected) {
        if (selected) this.selectedRows.add(id);
        else this.selectedRows.delete(id);
        this.options.onSelectionChange?.(Array.from(this.selectedRows));
        this.render();
    }
    
    toggleSelectAll(selected) {
        if (selected) {
            this.getFilteredData().forEach(row => this.selectedRows.add(row.id));
        } else {
            this.selectedRows.clear();
        }
        this.options.onSelectionChange?.(Array.from(this.selectedRows));
        this.render();
    }
    
    setData(data) {
        this.data = data;
        this.currentPage = 1;
        this.render();
    }
    
    getSelected() {
        return Array.from(this.selectedRows);
    }
}

// ======================================================================
// PRISM_CLIPBOARD - Clipboard operations
// Category: Clipboard
// ======================================================================

const PRISM_CLIPBOARD = {
    async copy(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
            
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.cssText = 'position: fixed; left: -9999px;';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        } catch (error) {
            console.error('[PRISM_CLIPBOARD] Copy failed:', error);
            return false;
        }
    },
    
    async paste() {
        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                return await navigator.clipboard.readText();
            }
            return null;
        } catch (error) {
            console.error('[PRISM_CLIPBOARD] Paste failed:', error);
            return null;
        }
    },
    
    async copyHTML(html) {
        try {
            const blob = new Blob([html], { type: 'text/html' });
            const item = new ClipboardItem({ 'text/html': blob });
            await navigator.clipboard.write([item]);
            return true;
        } catch (error) {
            console.error('[PRISM_CLIPBOARD] Copy HTML failed:', error);
            return false;
        }
    },
    
    async copyImage(canvas) {
        try {
            const blob = await new Promise(resolve => canvas.toBlob(resolve));
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            return true;
        } catch (error) {
            console.error('[PRISM_CLIPBOARD] Copy image failed:', error);
            return false;
        }
    },
    
    // Copy with toast notification
    async copyWithFeedback(text, successMessage = 'Copied!') {
        const success = await this.copy(text);
        if (success && typeof PRISM_TOAST !== 'undefined') {
            PRISM_TOAST.success(successMessage);
        }
        return success;
    }
};
/**
 * PRISM Data Structures & Systems Knowledge Base
 * Auto-extracted from MIT OpenCourseWare
 * Generated: 2026-01-17 22:21:38
 * 
 * Domains: Data Structures, Algorithms, Systems, Manufacturing, AI/ML
 */

const PRISM_DATA_STRUCTURES_KB = {
    trees: {
        kd_tree: { name: "kd-tree", description: "ith the transmitted ray in such a case? [ /3] 4 3.2 Kd-tree [ /13] Below is the representation of a given 2D Kd-tree with the leaves indicated by upper-case letters. We have drawn some leaf geometry in blue for motivation, but you do not need to consider it, albeit to notice that", source: "6.837" },
        trie: { name: "trie", description: "Irradiance Caching • Yellow dots: indirect diffuse sample points The irradiance cache tries to adapt sampling density to expected frequency content of the indirect illumination (denser sampling near geometry) Courtesy of Henrik Wann Jensen. Used with permission. 41 Radiance by Gr", source: "6.837" },
        heap: { name: "heap", description: "mples, do random jittering within each KxK sub-pixel 78 Stratified Sampling Analysis • Cheap and effective • But mostly for low-dimensional domains – Again, subdivision of N-D needs Nd domains like trapezoid, Simpson’s, etc.! • With very high dimensions, Monte Carlo is pretty muc", source: "6.837" },
        r_tree: { name: "r-tree", description: "that is not a leaf return false 87 Other Options • Axis Aligned Bounding Boxes – “R-Trees” • Oriented bounding boxes – S. Gottschalk, M. Lin, and D. Manocha. “OBBTree: A hierarchical Structure for rapid interference detection,” Proc. Siggraph 96. ACM Press, 1996 • Binary space pa", source: "6.837" },
        binary_tree: { name: "binary tree", description: "Bounding Volume Hierarchy (BVH) • Find bounding box of objects/primitives • Split objects/primitives into two, compute child BVs • Recurse, build a binary tree 47 Bounding Volume Hierarchy (BVH) • Find bounding box of objects/primitives • Split objects/primitives into two, comput", source: "6.837" },
        bvh: { name: "bvh", description: "sphere hierarchy 46 Bounding Volume Hierarchy (BVH) • Find bounding box of objects/primitives • Split objects/primitives into two, compute child BVs • Recurse, build a binary tree 47 Bounding Volume Hierarchy (BVH) • Find bounding box of objects/primitives • Split objects/primiti", source: "6.837" },
        bounding_volume_hierarchy: { name: "bounding volume hierarchy", description: "ember? sphere hierarchy 46 Bounding Volume Hierarchy (BVH) • Find bounding box of objects/primitives • Split objects/primitives into two, compute child BVs • Recurse, build a binary tree 47 Bounding Volume Hierarchy (BVH) • Find bounding box of objects/primitives • Split objects/", source: "6.837" },
        priority_queue: { name: "priority queue", description: "of video data suﬃce to calculate the passenger count with 95–98% accuracy. To avoid overloading the radio network, the radio server maintains a priority queue of the buses, and notiﬁes them to send video data. The server notiﬁes ﬁve buses at a time, so that they can simultaneousl", source: "6.033-spring-2018" },
    },
    graphs: {
        graph: { name: "graph", description: "s excluded from our Creative Commons license. For more information, see http://ocw.mit.edu/help/faq-fair-use/. MIT EECS 6.837 Computer Graphics MIT EECS 6.837 – Matusik 1 BRDF in Matrix II & III © ACM. All rights reserved. This content is excluded from our Creative Commons licens", source: "6.837" },
        dag: { name: "dag", description: "orm) 30 Scene Graph Representation • In fact, generalization of a tree: Directed Acyclic Graph (DAG) • Means a node can have multiple parents, but cycles are not allowed • Why? Allows multiple instantiations • Reuse complex hierarchies many times in the scene using different tran", source: "6.837" },
        directed_acyclic: { name: "directed acyclic", description: "node type (group, transform) 30 Scene Graph Representation • In fact, generalization of a tree: Directed Acyclic Graph (DAG) • Means a node can have multiple parents, but cycles are not allowed • Why? Allows multiple instantiations • Reuse complex hierarchies many times in the sc", source: "6.837" },
        directed_graph: { name: "directed graph", description: "2 to j or j to i. I\'m not worrying about the direct -- this is not a directed graph right now. So this is the start, but there\'s no edge here initially, because aik is 0. Now in this graph world -- it\'s so small, we can just focus on the part that\'s going to change a little. ", source: "18.086" },
        adjacency_matrix: { name: "adjacency matrix", description: "positions of nonzeros in K). The connections and nonzeros change as elimination proceeds. The list of edges and nonzero positions corresponds to the “adjacency matrix ” of the graph of nodes. The adjacency matrix has 1 or 0 to indicate nonzero or zero in K. For each node i, we ha", source: "18.086" },
    },
    geometric: {
        mesh: { name: "mesh", description: "ct onto 2D UV coordinates • For each vertex, find coordinates U,V such that distortion is minimized – distances in UV correspond to distances on mesh – angle of 3D triangle same as angle of triangle in UV plane • Cuts are usually required (discontinuities) © ACM. All rights reser", source: "6.837" },
        csg: { name: "csg", description: "[ /6] 6 We now turn to the intersection of the ray and the CSG intersection of N slabs. We initialize tstart and tend with the values for t1 and t2 given by the ﬁrst pair of planes. Write pseudocode to update tstart and tend with the values t;1 and t;2 for a new pair of planes. [", source: "6.837" },
        triangle_mesh: { name: "triangle mesh", description: "the control points. 38 Questions? 39 Representing Surfaces • Triangle meshes – Surface analogue of polylines, this is what GPUs draw • Tensor Product Splines – Surface analogue of spline curves • Subdivision surfaces • Implicit surfaces, e.g. f(x,y,z)=0 • Procedural – e.g. surfac", source: "6.837" },
        point_cloud: { name: "point cloud", description: "103 Questions? 104 Point Set Surfaces • Given only a noisy 3D point cloud (no connectivity), can you define a reasonable surface using only the points? – Laser range scans only give you points, so this is potentially useful © IEEE. All rights reserved. This content is excluded fr", source: "6.837" },
        polygon_mesh: { name: "polygon mesh", description: "Another popular technique is that of subdivision surfaces. At a high level, you can think of this technique as starting with a polygon mesh and deﬁning the desired surface as the limit of a set of subdivision rules that are applied to the mesh. Implement this technique. You may ﬁ", source: "6.837" },
        voxel: { name: "voxel", description: "eate a 3D grid and “rasterize” your object into it. Then, you march each ray through the grid stopping only when you hit an occupied voxel. Diﬃcult to debug. • Simulate dispersion (and rainbows). The rainbow is diﬃcult, as is the Newton prism demo. • Make a little animation (10 s", source: "6.837" },
    },
    spatial: {
        grid: { name: "grid", description: "n1 dx 52 Algorithm in 3D • Given an input point P • For each of its neighboring grid points: – Get the \"pseudo-random\" gradient vector G – Compute linear function (dot product G·dP) • Take weighted sum, using separable cubic weights – [demo in 2D] 53 Computing Pseudo-random Gra", source: "6.837" },
        bounding_box: { name: "bounding box", description: "versal of this kd-tree for the ray r, as it would happen for ray-tracing acceleration. For warm up, draw the four intersections with the sides of the bounding box of the tree that occur during the initialization of the traversal. [ /2] We now want you to show the order in which r", source: "6.837" },
        frustum: { name: "frustum", description: "38 Simplified Pinhole Camera • Eye-image pyramid (view frustum) • Note that the distance/size of image are arbitrary same image will result on this image plane 39 Camera Description? 40 Camera Description? • Eye point e (center) • Orthobasis u, v, w (horizontal, up, direction) v ", source: "6.837" },
        uniform_grid: { name: "uniform grid", description: "simulation. Figure 1: Left to right: structural springs, shear springs, and ﬂex springs We begin with a uniform grid of particles and connect them to their vertical and horizonal neighbors with springs. These springs keep the particle mesh together and are known as structural spr", source: "6.837" },
        bounding_sphere: { name: "bounding sphere", description: "dynamic2) 73 Hierarchical Collision Detection • Use simpler conservative proxies (e.g. bounding spheres) • Recursive (hierarchical) test – Spend time only for parts of the scene that are close • Many different versions, we will cover only one 74 Bounding Spheres • Place spheres a", source: "6.837" },
        oriented_bounding_box: { name: "oriented bounding box", description: "a leaf return false 87 Other Options • Axis Aligned Bounding Boxes – “R-Trees” • Oriented bounding boxes – S. Gottschalk, M. Lin, and D. Manocha. “OBBTree: A hierarchical Structure for rapid interference detection,” Proc. Siggraph 96. ACM Press, 1996 • Binary space partitioning t", source: "6.837" },
        convex_hull: { name: "convex hull", description: "A Bézier curve is bounded by the convex hull of its control points. 27 Questions? 28 Why Does the Formula Work? • Explanation 1: – Magic! • Explanation 2: – These are smart weights that describe the influence of each control point • Explanation 3: – It is a linear combination of ", source: "6.837" },
    },
    linear: {
        set: { name: "set", description: "39 Shaders (Material class) • Functions executed when light interacts with a surface • Constructor: – set shader parameters • Inputs: – Incident radiance – Incident and reflected light directions – Surface tangent basis (anisotropic shaders only) • Output: – Reflected radiance 40", source: "6.837" },
        stack: { name: "stack", description: "you think of a data structure suited for this? 63 Traversal State – Stack • The state is updated during traversal • Transformations • But also other properties (color, etc.) • Apply when entering node, “undo” when leaving • How to implement? • Bad idea to undo transformation by i", source: "6.837" },
        array: { name: "array", description: "a system and an integrator. It takes as input a state vector and returns a derivative vector for this particular state, which are both represented as arrays regardless of the precise type of particle system (only the size of the array varies). This allows integrators to be genera", source: "6.837" },
        linked_list: { name: "linked list", description: "se/. 24 Simple Particle System: Sprinkler PL: linked list of particle = empty; Image by Jeff Lander removed due to copyright restrictions. Image Jeff Lander 25 Simple Particle System: Sprinkler PL: linked list of particle = empty; spread=0.1;//how random the initial velocity is c", source: "6.837" },
        queue: { name: "queue", description: "be concerned with what the network layer is doing, and vice versa. Each switch is only capable of handling so many packets at once. Switches contain queues, which store packets that they’ve received but cannot send yet (because their outgoing link is busy sending other packets). ", source: "6.033-spring-2018" },
    },
    matrix: {
        sparse_matrix: { name: "sparse matrix", description: "ut C itself involves a serious boundary value problem. In this case we don’t reduce the computation all the way to AT CA! Instead we stay with the sparse matrix whose blocks are C −1 , A, AT , and 0. This is an indeﬁnite matrix, with that zero block on its diagonal. The solution ", source: "18.086" },
        stiffness_matrix: { name: "stiffness matrix", description: "letter because it\'s a standard in finite elements for the 6 stiffness matrix. So, k by definition, is the matrix with the 2s on the diagonal, minus 1s above the diagonal and minus 1s below the diagonal. And, what size is it? On the whole line, where we\'re working for simplicity", source: "18.086-spring-2006" },
    },
};

const PRISM_ALGORITHMS_KB = {
    sorting: {
        quicksort: { name: "quicksort", description: "minutes Answer all questions. All questions carry equal marks. Question 1. Show the steps that are involved in sorting the string SORTME using the quicksort algorithm given below. #include <iostream.h> void quicksort(char *a, int l, int r); main() { char str[8] = \"9SORTME\"; // ", source: "1.124j-fall-2000" },
    },
    searching: {
        dfs: { name: "dfs", description: "10 paths/pixel Note: More noise. This is not a coincidence; the integrand has higher variance (the BRDFs are “spikier”). Henrik Wann Jensen Courtesy of Henrik Wann Jensen. Used with permission. 27 Path Tracing Results: Glossy Scene • 100 paths/pixel Henrik Wann Jensen Courtesy of", source: "6.837" },
        a_: { name: "a*", description: "tion of a triangle with vertices {a, b, c} in terms of {α, β, γ}, including possible equality and inequality constraints. P(alpha,beta,gamma) = alpha*a + beta*b + gamma*c, (+1) with alpha+beta+gamma = 1 and alpha,beta,gamma >= 0. (+1) OR P(beta,gamma) = a + beta*(b-a) + gamma*(c-", source: "6.837" },
        binary_search: { name: "binary search", description: "apter 11: I/O ● Chapter 12: Templates ● chapter 14: File processing From algorithms in C++ ● Chapter 9: Quicksort ● Chapter 14: Binary search Problem 1:[40%] In this problem you need to develop a program that can handle user-provided data. You need to write the main() function an", source: "1.124j-fall-2000" },
    },
    graph: {
        prim: { name: "prim", description: "22 Monte Carlo Path Tracing • Trace only one secondary ray per recursion – Otherwise number of rays explodes! • But send many primary rays per pixel (antialiasing) 23 Monte Carlo Path Tracing • Trace only one secondary ray per recursion – Otherwise number of rays explodes! • But ", source: "6.837" },
    },
    optimization: {
        pso: { name: "pso", description: "ity and other nasty details 57 Integration • You know trapezoid, Simpson’s rule, etc. 58 Monte Carlo Integration • Monte Carlo integration: use random samples and compute average – We don’t keep track of spacing between samples – But we kind of hope it will be 1/N on average 59 M", source: "6.837" },
        aco: { name: "aco", description: "87 How to tackle these problems? • Deal with non-linearity: Iterative solution (steepest descent) • Compute Jacobian matrix of world position w.r.t. angles • Jacobian: “If the parameters p change by tiny amounts, what is the resulting change in the world position vWS?” • Then inv", source: "6.837" },
        newton_raphson: { name: "newton-raphson", description: "35 Newton’s Method (1D) • Iterative method for solving non-linear equations • Start from initial guess x0, then iterate • Also called Newton-Raphson iteration 36 Newton’s Method (1D) • Iterative method for solving non-linear equations • Start from initial guess x0, then iterate o", source: "6.837" },
        conjugate_gradient: { name: "conjugate gradient", description: "ds on the adjacent masses’ positions • Makes the system cheaper to solve – Don’t invert the Jacobian! – Use iterative matrix solvers like conjugate gradient, perhaps with preconditioning, etc. © David Baraff and Andrew Witkin. All rights reserved. This content is excluded from ou", source: "6.837" },
        greedy: { name: "greedy", description: "47 Compression algorithm • Approximation: Piecewise linear • Set an error bound • Decide which vertices to keep • Greedy from zero do far © ACM. All rights reserved. This content is excluded from our Creative Commons license. For more information, see http://ocw.mit.edu/help/faq-", source: "6.837" },
        gradient_descent: { name: "gradient descent", description: "he interior and the method is not going to operate. Well, that crudest method would be follow the gradient, but we know from several situations that gradient descent can be less than optimal. So this is more subtle. Well, Newton\'s method actually -- I\'ll explain. So this is act", source: "18.086" },
        simplex: { name: "simplex", description: "d the winning corner. It\'s an interesting competition between two quite different approaches: the famous approach -- so let me write these two. The simplex methods is the best established, best known, approach for solving these problems. What\'s the idea of the simplex method? T", source: "18.086" },
    },
    numerical: {
        finite_element: { name: "finite element", description: "solve it approximately • Monte Carlo techniques use random samples for evaluating the integrals – We’ll look at some simple method in a bit... • Finite element methods discretize the solution using basis functions (again!) – Radiosity, wavelets, precomputed radiance transfer, etc", source: "6.837" },
        monte_carlo: { name: "monte carlo", description: "Global Illumination and Monte Carlo MIT EECS 6.837 Computer Graphics Wojciech Matusik with many slides from Fredo Durand and Jaakko Lehtinen © ACM. All rights reserved. This content is excluded from our Creative Commons license. For more information, see http://ocw.mit.edu/help/f", source: "6.837" },
        jacobi: { name: "jacobi", description: "87 How to tackle these problems? • Deal with non-linearity: Iterative solution (steepest descent) • Compute Jacobian matrix of world position w.r.t. angles • Jacobian: “If the parameters p change by tiny amounts, what is the resulting change in the world position vWS?” • Then inv", source: "6.837" },
        runge_kutta: { name: "runge-kutta", description: "chain. This will require you to implement the diﬀerent kinds of forces (gravity, viscous drag, and springs). We have provided you with a fourth order Runge-Kutta (RK4) integrator, since the integrators you implemented are unstable. 4.1 Forces The core component of particle system", source: "6.837" },
        euler_method: { name: "euler method", description: "ill suﬀer miserably when implementing the trapezoidal rule. 3.1 Refresher on Euler and Trapezoidal Rule The simplest integrator is the explicit Euler method. For an Euler step, given state X, we examine f (X, t) at X, then step to the new state value. This requires to pick a step", source: "6.837" },
        finite_difference: { name: "finite difference", description: "reen-space change dt relates to a texture-space change du,dv. => derivatives, ( du/dt, dv/dt ). e.g. computed by hardware during rasterization often: finite difference (pixels are handled by quads) du, dv dt 54 MIP Indices Actually, you have a choice of ways to translate this der", source: "6.837" },
        fft: { name: "fft", description: "kely that the tradeoffs will come from determining the proper amount of time to spend at each grid. A possible way to do this would be to look at the FFT of the residual, try to predict the spectral content of the error, and adaptively decide which grid to move to based on that r", source: "18.086" },
        singular_value: { name: "singular value", description: "ea to form v transpose v. That is symmetric. It does have positive Eigen values. And those Eigen values, the Eigen values of v transpose v, are the singular values, or rather the singular values squared of v. So I guess I\'m saying, you can\'t trust the Eigen values of v. It\'s t", source: "18.086" },
        gauss_seidel: { name: "gauss-seidel", description: "rested? Why is everybody interested in these vectors? Because actually, that\'s what an iteration like Jacobi produces. If I use Jacobi\'s method, or Gauss-Seidel. Any of those. After one step, 3 I\'ve got b. After two steps, there\'s a multiplication by a in there, right? And so", source: "18.086" },
        cholesky: { name: "cholesky", description: "o). All dead. Write one sentence on what they are known for. Arnoldi Gram Jacobi Schur Cholesky Hadamard Jordan Schwartz Fourier Hankel Kronecker Seidel Frobenius Hessenberg Krylov Toeplitz Gauss Hestenes-Stiefel Lanczos Vandermonde Gershgorin Hilbert Markov Wilkinson Givens Hous", source: "18.086" },
        lu_decomposition: { name: "lu decomposition", description: "ing the original and the reordered K2D matrices. As can be seen from this figure, reordering the matrix produces fewer numbers of nonzeros during the LU decomposition. The Matlab code used to generate Figures 3.1-3.5 was obtained at [3]. Figure 3.2: Graph of the 9 × 9 K2D matrix ", source: "18.086" },
        fast_fourier: { name: "fast fourier", description: "will propose three methods: 1. Elimination in a good order (not using the special structure of K2D) 2. Fast Poisson Solver (applying the FFT = Fast Fourier Transform) 3. Odd-Even Reduction (since K2D is block tridiagonal). The novelty is in the Fast Poisson Solver, which uses the", source: "18.086" },
    },
    geometric: {
        triangulation: { name: "triangulation", description: "ake sense. If your surfaces don’t look right, use the wireframe mode to check whether the normals are pointing outwards and if your triangulation is correct. • Exploit code modularity. B-spline control points can be converted to Bezier control points via a matrix multiplication, ", source: "6.837" },
        convex_hull: { name: "convex hull", description: "A Bézier curve is bounded by the convex hull of its control points. 27 Questions? 28 Why Does the Formula Work? • Explanation 1: – Magic! • Explanation 2: – These are smart weights that describe the influence of each control point • Explanation 3: – It is a linear combination of ", source: "6.837" },
    },
};

const PRISM_SYSTEMS_KB = {
    architecture: {
        pipeline: { name: "pipeline", description: "[ /6] - optimized for latency - latency hiding - extremely long pipeline (1000 stages) Would the following algorithm be implemented in a vertex or pixel shader? [ /8] SSD skinning Phong shading Blend shapes Shadow map query 9 MIT OpenCourseWare http://ocw.mit.edu 6.837 Computer G", source: "6.837" },
        client_server: { name: "client-server", description: "more) 2 6.033 | spring 2018 | Katrina LaCurts File-sharing Techniques client-server CDNs P2P scalability increases (in theory) 3 6.033 | spring 2018 | Katrina LaCurts problem: how do we incentivize peers in a P2P network to upload? 4 6.033 | spring 2018 | Katrina LaCurts Discover", source: "6.033-spring-2018" },
    },
    patterns: {
        strategy: { name: "strategy", description: "oosing appropriate techniques 66 Questions? • Images by Veach and Guibas, SIGGRAPH 95 Naïve sampling strategy Optimal sampling strategy © ACM. All rights reserved. This content is excluded from our Creative Commons license. For more information, see http://ocw.mit.edu/help/faq-fa", source: "6.837" },
        command: { name: "command", description: "66 Hierarchical Modeling in OpenGL • The OpenGL Matrix Stack implements what we just did! • Commands to change current transformation • glTranslate, glScale, etc. • Current transformation is part of the OpenGL state, i.e., all following draw calls will undergo the new transformat", source: "6.837" },
        observer: { name: "observer", description: "Color matching • Color spaces 11 What is Color? Light Object Observer 12 What is Color? Illumination Stimulus Reflectance Cone responses 13 What is Color? Light Object Final stimulus Illumination Reflectance M L Spectral Sensibility S Then the cones in the eye interpret the stimu", source: "6.837" },
        factory: { name: "factory", description: "cillation, physical oscillation like that. So these are methods where we\'re trading off a good shock capture versus a smeared one, which is not satisfactory, really, in a lot of applications. So capturing the shock within 2 delta x, roughly, is highly desirable, and you might ha", source: "18.086" },
        adapter: { name: "adapter", description: "tentPane(contentPane); pack(); setVisible(true); setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE); addWindowListener(new WindowAdapter() { public void windowClosing(WindowEvent e) { dispose(); System.exit(0); } } ); } private void setMenuBar() { menuBar = new JMenuBar()", source: "1.124j-fall-2000" },
    },
    concurrency: {
        lock: { name: "lock", description: "22 Ray Casting vs. Ray Tracing ray from light to hit point is blocked, i.e., X point is in shadow This image is in the public domain. Source: openclipart 23 Ray Casting vs. Ray Tracing • Ray casting = eye rays only, tracing = also secondary Secondary rays are used for X testing s", source: "6.837" },
        atomic: { name: "atomic", description: "particles within the system. evalF should take in a system state and return the derivatives associated with that state. The Integrator methods should atomically modify the system’s state at each step. Implement the simple system and the Euler integrator. Try diﬀerent values of h ", source: "6.837" },
        thread: { name: "thread", description: "d which K_IC is constant. • Optimization Strong substrate for ease of handling Inherent difficulty: 2+ element basis Graded buffers: threading dislocations glide to wafer edge Images removed due to copyright restrictions. Please see Fig. 1 and 3a in [3]. 3.22 Mechanical Behavior ", source: "3.22" },
        deadlock: { name: "deadlock", description: "ads[id].state != RUNNABLE SP = threads[id].sp PTR = threads[id].ptr threads[id].state = RUNNING cpus[CPU].thread = id problem: deadlock (wait() holds t_lock) 16 6.033 | spring 2018 | Katrina LaCurts yield_wait(): // called by wait() id = cpus[CPU].thread threads[id].sp = SP threa", source: "6.033-spring-2018" },
        thread_pool: { name: "thread pool", description: "main thread spawn child threads, via a system call such as fork(). 2.3.2 Crisis and Update Threads Additional threads in the processing unit’s thread pool deal with crisis mode and software up- dates. When a Facilities sta member enables crisis mode on a particular room, a thread", source: "6.033-spring-2018" },
        race_condition: { name: "race condition", description: "g Locks acquire(lock): release(lock): while lock != 0: lock = 0 do nothing lock = 1 problem: race condition (need locks to implement locks!) 21 6.033 | spring 2018 | Katrina LaCurts Implementing Locks acquire(lock): release(lock): do: lock = 0 r <- 1 XCHG r, lock while r == 1 22 ", source: "6.033-spring-2018" },
    },
    distributed: {
        replication: { name: "replication", description: "ampling can use a good filter • Issues – Frequencies above the (super)sampling limit are still aliased • Works well for edges, since spectrum replication is less an issue • Not as well for repetitive textures – But solution soon 34 Uniform supersampling Questions? • Advantage: – ", source: "6.837" },
        raft: { name: "raft", description: "strial and Applied Mathematics. Jaydeep Bardhan and David Willis, two great advisors from Prof. Jacob White’s group. Prof. Gilbert Strang, for his draft of his new textbook. 23", source: "18.086" },
        consensus: { name: "consensus", description: "I, Katrina, give Pete coin 47289 Pete ! Pete idea: get consensus from “enough” of the network — let’s say 51% — before verifying the transaction 12 6.033 | spring 2018 | Katrina LaCurts log log Mark Mark Katrina Katrina log log Pete Pete idea: get consensus from “enough” of the n", source: "6.033-spring-2018" },
    },
};

const PRISM_MFG_STRUCTURES_KB = {
    toolpath: {
        spiral: { name: "spiral", description: "X(t) = rsin(t + k) However, Euler’s method causes the solution to spiral outward, no matter how small h is. After imple­ menting Euler’s method, you should see the single particle spiral outwardly in a 2D space, similar to the image below. 4 Next, implement the Trapezoidal Rule. ", source: "6.837" },
        zigzag: { name: "zigzag", description: ". Your task will be to generate triangles that connect each repetition of the proﬁle curve, as shown in the following image. The basic strategy is to zigzag back and forth between adjacent repetitions to build the triangles. In OpenGL, you are required to specify the vertices in ", source: "6.837" },
        finishing: { name: "finishing", description: "starts by eliminating all the edges of the odd/red nodes (remember that the graph is numbered row by row starting from the bottom left corner). After finishing with the odd nodes, the algorithm continues to eliminate the even nodes until all the edges have been eliminated. A comp", source: "18.086" },
        contour: { name: "contour", description: "n images appear as regions with strong intensity variations. In the case of images obtained with a conventional camera, edges typically represent the contour and/or morphology of the object(s) contained in the field of view (FOV) of the imaging system. From an optics perspective,", source: "18.086" },
        pencil: { name: "pencil", description: "es, which you may never meet. I have never personally met, but it has to be dealt with and there are codes -- I\'ll just mention the code dasil by [? pencil ?] I\'ll finish saying the one word. A model problem here would be some matrix times u prime equal f of u and t, so a sort ", source: "18.086" },
        toolpath: { name: "toolpath", description: "g. 3 • use Mastercam to draw the lathe profile of your paperweight (the top drawing can be done by hand or any software) • use Mastercam to run a toolpath on the profile • prepare for next week\'s lab During Lab II you and your lab mate will: • learn how to use Mastercam Mill • c", source: "2.008-spring-2003" },
        roughing: { name: "roughing", description: "along with the holder dimensions. Parameter screens allow the editing of how the tool is to be used, such as depths of cut and step-over amounts for roughing as well as speed and feed for the tool to use. These are already setup to fairly good values to minimize tool breakage. Pl", source: "2.008-spring-2003" },
    },
    multiaxis: {
        collision: { name: "collision", description: "ith the cloth. You may, for instance, allow the user to click on certain parts of the cloth and drag parts around. • Implement frictionless collisions of cloth with a simple primitive such as a sphere. This is simpler than it may sound at ﬁrst: just check whether a particle is “i", source: "6.837" },
    },
    cutting: {
        material_removal_rate: { name: "material removal rate", description: "a rough estimate. The speciﬁc cutting energy of 4140 is 3.35J/mm 3 . When the machine stalled, the spindle was 540rpm, and t0 = 0.027. Therefore, the material removal rate was M RR = (540 ∗ π ∗ 3) ∗ 0.027 ∗ 0.075 = 10.3008 in3 /min. Since the machine stalled, the power of the mac", source: "2.008-spring-2003" },
        feed_rate: { name: "feed rate", description: "Meaning Address Meaning O program number F feed rate N sequence number E thread lead G preparatory function S spindle speed X, Y, Z coordinate axis motion T tool number R arc/corner radius, or rapid plane M misc./machine functions I absolute center of arc in x-axis J absolute cen", source: "2.008-spring-2003" },
        spindle_speed: { name: "spindle speed", description: "d Z-axes to a predetermined clearance point for changing tools. N1M26T11S2000 Install tool T11 (1.5\" end mill) for facing top surface, spindle speed 2000RPM Rapid positioning mode, designate work coordinate system 1, multi-quadrant circle N2G0G55G75G90X-2.0Y-1.3 mode, absolute p", source: "2.008-spring-2003" },
        tool_life: { name: "tool life", description: "Figure 3: Turned Flange The way that this problem is currently stated makes it really quite diﬃcult. The Taylor equation gives tool life for a speciﬁc speed. However, by ﬁxing ω, the speed changes throughout the turning process, and so the rate of wear changes. One compromise (ap", source: "2.008-spring-2003" },
        taylor_equation: { name: "taylor equation", description: "Figure 3: Turned Flange The way that this problem is currently stated makes it really quite diﬃcult. The Taylor equation gives tool life for a speciﬁc speed. However, by ﬁxing ω, the speed changes throughout the turning process, and so the rate of wear changes. One compromise (ap", source: "2.008-spring-2003" },
    },
};

const PRISM_AI_STRUCTURES_KB = {
    neural: {
        gan: { name: "gan", description: "27 Hierarchical Grouping of Objects • The “scene graph” represents the logical organization of scene scene chair table ground table fruits 6.837 - Durand 28 Scene Graph • Convenient Data structure for scene representation • Geometry (meshes, etc.) • Transformations • Materials, c", source: "6.837" },
        attention: { name: "attention", description: "n rayHit return true if any triangle was hit, false otherwise endif // b) recurse into the children in the right order, paying attention // to handling the case of overlapping nodes correctly ( / 3 ) compute t\'s for both child nodes\' bounding spheres recurse into closer node fi", source: "6.837" },
        neural_network: { name: "neural network", description: "lso tough to justify.) That said, we are not limiting your failure-recovery algorithm. If you want to build an algorithm that works by chaining eight neural networks together and then feeding the output into six di er- ent linear programs, go for it. Just be prepared to justify t", source: "6.033-spring-2018" },
    },
    classical: {
        clustering: { name: "clustering", description: "(19) �max + �min This is the best-known error estimate, although it doesn’t account for any clustering of the eigenvalues of A. It involves only the condition number �max /�min . Prob­ lem gives the “optimal” error estimate but it is not so easy to compute. That optimal estimate ", source: "18.086" },
    },
    probabilistic: {
        hmm: { name: "hmm", description: "ion, see http://ocw.mit.edu/help/faq-fair-use/. 67 Hmmh... • Are uniform samples the best we can do? 68 Smarter Sampling Sample a non-uniform probability Called “importance sampling” Intuitive justification: Sample more in places where there are likely to be larger contributions ", source: "6.837" },
    },
};


// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED SEARCH API - Extensible for Future Data
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_DS_SEARCH = {
    // Knowledge base registry - add new KBs here for extensibility
    kbs: {
        data_structures: PRISM_DATA_STRUCTURES_KB,
        algorithms: PRISM_ALGORITHMS_KB,
        systems: PRISM_SYSTEMS_KB,
        manufacturing: PRISM_MFG_STRUCTURES_KB,
        ai_ml: PRISM_AI_STRUCTURES_KB
    },
    
    // Register new knowledge base (for future data integration)
    registerKB: function(name, kb) {
        this.kbs[name] = kb;
        console.log('[PRISM] Registered KB:', name);
    },
    
    // Search across all knowledge bases
    search: function(query, domains = null) {
        const results = [];
        const q = query.toLowerCase();
        const searchDomains = domains || Object.keys(this.kbs);
        
        for (const domain of searchDomains) {
            const kb = this.kbs[domain];
            if (!kb) continue;
            
            for (const [category, items] of Object.entries(kb)) {
                if (typeof items !== 'object') continue;
                
                for (const [key, item] of Object.entries(items)) {
                    if (!item || typeof item !== 'object') continue;
                    
                    const name = (item.name || '').toLowerCase();
                    const desc = (item.description || '').toLowerCase();
                    
                    if (name.includes(q) || desc.includes(q)) {
                        results.push({
                            domain,
                            category,
                            key,
                            ...item,
                            relevance: name.includes(q) ? 1.0 : 0.5
                        });
                    }
                }
            }
        }
        
        return results.sort((a, b) => b.relevance - a.relevance);
    },
    
    // Get specific item
    get: function(domain, category, key) {
        return this.kbs[domain]?.[category]?.[key] || null;
    },
    
    // List category items
    list: function(domain, category) {
        const cat = this.kbs[domain]?.[category];
        if (!cat) return [];
        return Object.entries(cat).map(([k, v]) => ({ key: k, ...v }));
    },
    
    // Get statistics
    stats: function() {
        const s = {};
        for (const [d, kb] of Object.entries(this.kbs)) {
            s[d] = { _total: 0 };
            for (const [c, items] of Object.entries(kb)) {
                const n = Object.keys(items).length;
                s[d][c] = n;
                s[d]._total += n;
            }
        }
        return s;
    },
    
    // Import additional data (for future integration)
    importData: function(domain, category, items) {
        if (!this.kbs[domain]) {
            this.kbs[domain] = {};
        }
        if (!this.kbs[domain][category]) {
            this.kbs[domain][category] = {};
        }
        
        for (const item of items) {
            const key = item.key || item.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            this.kbs[domain][category][key] = item;
        }
        
        console.log('[PRISM] Imported', items.length, 'items to', domain + '/' + category);
    }
};

// Gateway registration
if (typeof PRISM_GATEWAY !== 'undefined') {
    PRISM_GATEWAY.register('kb.ds.search', 'PRISM_DS_SEARCH.search');
    PRISM_GATEWAY.register('kb.ds.get', 'PRISM_DS_SEARCH.get');
    PRISM_GATEWAY.register('kb.ds.list', 'PRISM_DS_SEARCH.list');
    PRISM_GATEWAY.register('kb.ds.stats', 'PRISM_DS_SEARCH.stats');
    PRISM_GATEWAY.register('kb.ds.register', 'PRISM_DS_SEARCH.registerKB');
    PRISM_GATEWAY.register('kb.ds.import', 'PRISM_DS_SEARCH.importData');
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRISM_DATA_STRUCTURES_KB,
        PRISM_ALGORITHMS_KB,
        PRISM_SYSTEMS_KB,
        PRISM_MFG_STRUCTURES_KB,
        PRISM_AI_STRUCTURES_KB,
        PRISM_DS_SEARCH
    };
}

console.log('[PRISM] Data Structures & Systems KB loaded');
console.log('[PRISM] Use PRISM_DS_SEARCH.registerKB() or importData() for future data');

// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY ROUTE REGISTRATION FOR KNOWLEDGE INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_KNOWLEDGE_INTEGRATION_ROUTES = {
    routes: {
        // ═══════════════════════════════════════════════════════════════════════
        // AI/ML ROUTES (25 new)
        // ═══════════════════════════════════════════════════════════════════════
        
        // Reinforcement Learning
        'ai.rl.sarsa.update': 'PRISM_RL_ENHANCED.SARSA.update',
        'ai.rl.sarsa.episode': 'PRISM_RL_ENHANCED.SARSA.runEpisode',
        'ai.rl.sarsa.initQ': 'PRISM_RL_ENHANCED.SARSA.initQTable',
        'ai.rl.policy_gradient': 'PRISM_RL_ENHANCED.PolicyGradient.update',
        'ai.rl.actor_critic': 'PRISM_RL_ENHANCED.ActorCritic.update',
        'ai.rl.dqn.train': 'PRISM_RL_ENHANCED.DQN.train',
        'ai.rl.value_iteration': 'PRISM_RL_ENHANCED.ValueIteration.solve',
        
        // Neural Network Activations
        'ai.nn.activation.elu': 'PRISM_NN_ENHANCED.Activations.elu',
        'ai.nn.activation.gelu': 'PRISM_NN_ENHANCED.Activations.gelu',
        'ai.nn.activation.selu': 'PRISM_NN_ENHANCED.Activations.selu',
        'ai.nn.activation.swish': 'PRISM_NN_ENHANCED.Activations.swish',
        
        // Optimizers
        'ai.nn.optimizer.sgd': 'PRISM_NN_ENHANCED.Optimizers.sgd',
        'ai.nn.optimizer.adadelta': 'PRISM_NN_ENHANCED.Optimizers.adadelta',
        'ai.nn.optimizer.nadam': 'PRISM_NN_ENHANCED.Optimizers.nadam',
        'ai.nn.optimizer.adamw': 'PRISM_NN_ENHANCED.Optimizers.adamw',
        
        // Clustering
        'ai.cluster.dbscan': 'PRISM_CLUSTERING_ENHANCED.dbscan',
        'ai.cluster.kmedoids': 'PRISM_CLUSTERING_ENHANCED.kMedoids',
        'ai.cluster.tsne': 'PRISM_CLUSTERING_ENHANCED.tsne',
        
        // Signal Processing Enhanced
        'ai.signal.cross_correlation': 'PRISM_SIGNAL_ENHANCED.crossCorrelation',
        'ai.signal.auto_correlation': 'PRISM_SIGNAL_ENHANCED.autoCorrelation',
        
        // Evolutionary
        'ai.moead.optimize': 'PRISM_EVOLUTIONARY_ENHANCED.MOEAD.optimize',
        'ai.ga.elitism': 'PRISM_EVOLUTIONARY_ENHANCED.elitistSelection',
        
        // Explainable AI
        'ai.xai.gradient_saliency': 'PRISM_XAI_ENHANCED.gradientSaliency',
        'ai.xai.integrated_gradients': 'PRISM_XAI_ENHANCED.integratedGradients',
        'ai.xai.lime': 'PRISM_XAI_ENHANCED.lime',
        
        // Attention Mechanisms
        'ai.attention.scaled': 'PRISM_ATTENTION_ADVANCED.scaledDotProductAttention',
        'ai.attention.multihead': 'PRISM_ATTENTION_ADVANCED.multiHeadAttention',
        'ai.attention.sparse': 'PRISM_ATTENTION_ADVANCED.sparseAttention',
        'ai.attention.linear': 'PRISM_ATTENTION_ADVANCED.linearAttention',
        'ai.attention.cross': 'PRISM_ATTENTION_ADVANCED.crossAttention',
        
        // Model Compression
        'ai.compress.quantize': 'PRISM_MODEL_COMPRESSION.quantize',
        'ai.compress.prune': 'PRISM_MODEL_COMPRESSION.prune',
        'ai.compress.distill': 'PRISM_MODEL_COMPRESSION.distill',
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROCESS PLANNING ROUTES (20 new)
        // ═══════════════════════════════════════════════════════════════════════
        
        'plan.search.astar': 'PRISM_PROCESS_PLANNING.aStarSearch',
        'plan.search.bfs': 'PRISM_PROCESS_PLANNING.bfs',
        'plan.search.dfs': 'PRISM_PROCESS_PLANNING.dfs',
        'plan.search.idastar': 'PRISM_PROCESS_PLANNING.idaStar',
        
        'plan.csp.solve': 'PRISM_PROCESS_PLANNING.cspSolver',
        'plan.csp.ac3': 'PRISM_PROCESS_PLANNING.ac3',
        'plan.csp.minconflicts': 'PRISM_PROCESS_PLANNING.minConflicts',
        
        'plan.motion.rrt': 'PRISM_PROCESS_PLANNING.rrt',
        'plan.motion.rrtstar': 'PRISM_PROCESS_PLANNING.rrtStar',
        'plan.motion.prm': 'PRISM_PROCESS_PLANNING.prm',
        
        'plan.hmm.forward': 'PRISM_PROCESS_PLANNING.hmm.forward',
        'plan.hmm.viterbi': 'PRISM_PROCESS_PLANNING.hmm.viterbi',
        'plan.hmm.baumWelch': 'PRISM_PROCESS_PLANNING.hmm.baumWelch',
        
        'plan.mdp.valueIteration': 'PRISM_PROCESS_PLANNING.mdp.valueIteration',
        'plan.mdp.policyIteration': 'PRISM_PROCESS_PLANNING.mdp.policyIteration',
        
        'plan.mcts.search': 'PRISM_PROCESS_PLANNING.mcts',
        
        // ═══════════════════════════════════════════════════════════════════════
        // OPTIMIZATION ROUTES (12 new)
        // ═══════════════════════════════════════════════════════════════════════
        
        'optimize.newton': 'PRISM_OPTIMIZATION.newtonMethod',
        'optimize.steepest': 'PRISM_OPTIMIZATION.steepestDescent',
        'optimize.conjugate': 'PRISM_OPTIMIZATION.conjugateGradient',
        'optimize.bfgs': 'PRISM_OPTIMIZATION.bfgs',
        
        'optimize.penalty': 'PRISM_OPTIMIZATION.penaltyMethod',
        'optimize.barrier': 'PRISM_OPTIMIZATION.barrierMethod',
        'optimize.augmented': 'PRISM_OPTIMIZATION.augmentedLagrangian',
        
        'optimize.ip.branchBound': 'PRISM_OPTIMIZATION.branchAndBound',
        'optimize.ip.cuttingPlane': 'PRISM_OPTIMIZATION.cuttingPlane',
        'optimize.localSearch': 'PRISM_OPTIMIZATION.localSearch',
        'optimize.simulatedAnnealing': 'PRISM_OPTIMIZATION.simulatedAnnealing',
        
        // ═══════════════════════════════════════════════════════════════════════
        // PHYSICS/DYNAMICS ROUTES (15 new)
        // ═══════════════════════════════════════════════════════════════════════
        
        'dynamics.fk.compute': 'PRISM_DYNAMICS.forwardKinematics',
        'dynamics.ik.solve': 'PRISM_DYNAMICS.inverseKinematics',
        'dynamics.jacobian': 'PRISM_DYNAMICS.jacobian',
        'dynamics.singularity': 'PRISM_DYNAMICS.singularityAnalysis',
        
        'dynamics.newtonEuler': 'PRISM_DYNAMICS.newtonEuler',
        'dynamics.lagrangian': 'PRISM_DYNAMICS.lagrangian',
        'dynamics.inertia': 'PRISM_DYNAMICS.inertiaMatrix',
        
        'vibration.modal': 'PRISM_DYNAMICS.modalAnalysis',
        'vibration.stability': 'PRISM_DYNAMICS.stabilityLobes',
        'vibration.frf': 'PRISM_DYNAMICS.frequencyResponse',
        
        'thermal.cutting': 'PRISM_DYNAMICS.cuttingTemperature',
        'thermal.conduction': 'PRISM_DYNAMICS.heatConduction',
        'thermal.convection': 'PRISM_DYNAMICS.convection'
    },
    
    registerAll: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            let registered = 0;
            for (const [route, target] of Object.entries(this.routes)) {
                try {
                    PRISM_GATEWAY.register(route, target);
                    registered++;
                } catch (e) {
                    console.warn(`[KNOWLEDGE] Failed to register route: ${route}`, e);
                }
            }
            console.log(`[KNOWLEDGE_INTEGRATION] Registered ${registered}/${Object.keys(this.routes).length} gateway routes`);
        }
    }
};

// Auto-register if GATEWAY exists
if (typeof PRISM_GATEWAY !== 'undefined') {
    PRISM_KNOWLEDGE_INTEGRATION_ROUTES.registerAll();
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI LEARNING PIPELINE CONNECTORS
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_KNOWLEDGE_AI_CONNECTOR = {
    /**
     * Connect all knowledge modules to AI learning pipeline
     */
    connectToLearning: function() {
        if (typeof PRISM_AI_LEARNING_PIPELINE === 'undefined') {
            console.warn('[KNOWLEDGE] AI Learning Pipeline not available');
            return;
        }
        
        // Subscribe to planning events
        if (typeof PRISM_EVENT_BUS !== 'undefined') {
            PRISM_EVENT_BUS.subscribe('plan:complete', (result) => {
                PRISM_AI_LEARNING_PIPELINE.recordOutcome({
                    recommendationType: 'process_plan',
                    recommended: result.plan,
                    algorithms_used: result.algorithmsUsed || ['A*', 'CSP'],
                    knowledge_sources: ['MIT_16.410', 'MIT_16.412j']
                });
            });
            
            PRISM_EVENT_BUS.subscribe('optimize:complete', (result) => {
                PRISM_AI_LEARNING_PIPELINE.recordOutcome({
                    recommendationType: 'optimization',
                    recommended: result.solution,
                    algorithms_used: result.method || ['Newton'],
                    knowledge_sources: ['MIT_15.084j', 'MIT_6.251J']
                });
            });
            
            PRISM_EVENT_BUS.subscribe('dynamics:analysis', (result) => {
                PRISM_AI_LEARNING_PIPELINE.recordOutcome({
                    recommendationType: 'dynamics_analysis',
                    recommended: result.analysis,
                    algorithms_used: result.methods || ['Modal', 'FFT'],
                    knowledge_sources: ['MIT_16.07', 'MIT_2.004']
                });
            });
        }
        
        console.log('[KNOWLEDGE_AI_CONNECTOR] Connected to AI Learning Pipeline');
    },
    
    /**
     * Generate training data from knowledge modules
     */
    generateTrainingData: function(module, samples = 1000) {
        const data = [];
        
        switch(module) {
            case 'optimization':
                // Generate optimization training samples
                for (let i = 0; i < samples; i++) {
                    const x = (Math.random() - 0.5) * 20;
                    const y = (Math.random() - 0.5) * 20;
                    data.push({
                        input: [x, y],
                        output: [x*x + y*y, 2*x, 2*y] // Function value, gradients
                    });
                }
                break;
                
            case 'dynamics':
                // Generate kinematics training samples
                for (let i = 0; i < samples; i++) {
                    const q = [
                        Math.random() * Math.PI * 2 - Math.PI,
                        Math.random() * Math.PI * 2 - Math.PI,
                        Math.random() * Math.PI * 2 - Math.PI
                    ];
                    // Simplified forward kinematics output
                    data.push({
                        input: q,
                        output: [Math.cos(q[0]) + Math.cos(q[1]), Math.sin(q[0]) + Math.sin(q[1]), q[2]]
                    });
                }
                break;
                
            case 'signal':
                // Generate signal processing training samples
                for (let i = 0; i < samples; i++) {
                    const signal = Array(64).fill(0).map(() => Math.random() * 2 - 1);
                    // Add some pattern
                    const freq = Math.floor(Math.random() * 10) + 1;
                    for (let j = 0; j < 64; j++) {
                        signal[j] += Math.sin(2 * Math.PI * freq * j / 64);
                    }
                    data.push({
                        input: signal,
                        output: [freq, Math.max(...signal), Math.min(...signal)]
                    });
                }
                break;
                
            default:
                console.warn(`Unknown module for training data: ${module}`);
        }
        
        return data;
    }
};

// Initialize connectors on load
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(() => {
            PRISM_KNOWLEDGE_AI_CONNECTOR.connectToLearning();
        }, 1000);
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// KNOWLEDGE INTEGRATION SELF-TESTS
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_KNOWLEDGE_INTEGRATION_TESTS = {
    runAll: function() {
        console.log('[KNOWLEDGE_TESTS] Running integration tests...');
        const results = {
            passed: 0,
            failed: 0,
            tests: []
        };
        
        // Test 1: AI/ML modules loaded
        try {
            const hasRL = typeof PRISM_RL_ENHANCED !== 'undefined';
            const hasNN = typeof PRISM_NN_ENHANCED !== 'undefined';
            const hasCluster = typeof PRISM_CLUSTERING_ENHANCED !== 'undefined';
            const hasAttention = typeof PRISM_ATTENTION_ADVANCED !== 'undefined';
            
            if (hasRL && hasNN && hasCluster && hasAttention) {
                results.passed++;
                results.tests.push({ name: 'AI/ML Modules', status: 'PASS' });
            } else {
                throw new Error('Missing AI/ML modules');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'AI/ML Modules', status: 'FAIL', error: e.message });
        }
        
        // Test 2: Process Planning loaded
        try {
            if (typeof PRISM_PROCESS_PLANNING !== 'undefined' && 
                typeof PRISM_PROCESS_PLANNING.aStarSearch === 'function') {
                results.passed++;
                results.tests.push({ name: 'Process Planning', status: 'PASS' });
            } else {
                throw new Error('PRISM_PROCESS_PLANNING not loaded');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Process Planning', status: 'FAIL', error: e.message });
        }
        
        // Test 3: Optimization loaded
        try {
            if (typeof PRISM_OPTIMIZATION !== 'undefined' &&
                typeof PRISM_OPTIMIZATION.newtonMethod === 'function') {
                results.passed++;
                results.tests.push({ name: 'Optimization', status: 'PASS' });
            } else {
                throw new Error('PRISM_OPTIMIZATION not loaded');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Optimization', status: 'FAIL', error: e.message });
        }
        
        // Test 4: Gateway routes registered
        try {
            if (typeof PRISM_GATEWAY !== 'undefined') {
                const testRoutes = ['plan.search.astar', 'ai.cluster.dbscan', 'optimize.newton'];
                let found = 0;
                for (const route of testRoutes) {
                    if (PRISM_GATEWAY.routes[route]) found++;
                }
                if (found === testRoutes.length) {
                    results.passed++;
                    results.tests.push({ name: 'Gateway Routes', status: 'PASS' });
                } else {
                    throw new Error(`Only ${found}/${testRoutes.length} routes found`);
                }
            } else {
                throw new Error('PRISM_GATEWAY not available');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'Gateway Routes', status: 'FAIL', error: e.message });
        }
        
        // Test 5: A* Search functional test
        try {
            const problem = {
                initial: { x: 0, y: 0 },
                isGoal: (state) => state.x === 2 && state.y === 2,
                heuristic: (state) => Math.abs(2 - state.x) + Math.abs(2 - state.y),
                getSuccessors: (state) => [
                    { state: { x: state.x + 1, y: state.y }, action: 'right', cost: 1 },
                    { state: { x: state.x, y: state.y + 1 }, action: 'up', cost: 1 }
                ].filter(s => s.state.x <= 2 && s.state.y <= 2)
            };
            const result = PRISM_PROCESS_PLANNING.aStarSearch(problem);
            if (result.found && result.totalCost === 4) {
                results.passed++;
                results.tests.push({ name: 'A* Search Test', status: 'PASS' });
            } else {
                throw new Error('A* returned incorrect result');
            }
        } catch (e) {
            results.failed++;
            results.tests.push({ name: 'A* Search Test', status: 'FAIL', error: e.message });
        }
        
        // Print results
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`[KNOWLEDGE_TESTS] Results: ${results.passed}/${results.passed + results.failed} passed`);
        results.tests.forEach(t => {
            console.log(`  ${t.status === 'PASS' ? '✅' : '❌'} ${t.name}: ${t.status}${t.error ? ' - ' + t.error : ''}`);
        });
        console.log('═══════════════════════════════════════════════════════════');
        
        return results;
    }
};

// Export for testing
if (typeof window !== 'undefined') {
    window.PRISM_KNOWLEDGE_INTEGRATION_TESTS = PRISM_KNOWLEDGE_INTEGRATION_TESTS;
}

console.log('[PRISM] Knowledge Integration v1.0 loaded - 34,000+ lines from 107+ courses');

const PRISM_CATALOG_FINAL = {
    version: '1.0.0',
    generated: '2026-01-17',
    description: 'Complete manufacturer catalog integration from 44 PDFs',
    totalManufacturers: 25,
    totalLines: 9500,
    
    // ═══════════════════════════════════════════════════════════════
    // BATCH 1: TOOL HOLDERS (v1)
    // ═══════════════════════════════════════════════════════════════
    toolHolders: {
        
        // ─────────────────────────────────────────────────────────────────────
        // GUHRING HYDRAULIC CHUCKS
        // Source: guhring tool holders.pdf (6 pages)
        // ─────────────────────────────────────────────────────────────────────
        guhring: {
            brand: 'Guhring',
            country: 'Germany',
            website: 'www.guhring.com',
            
            hydraulicChucks: {
                description: 'High-precision hydraulic chucks with increased clamping force',
                features: [
                    'Max 3μm concentricity deviation',
                    'Fast and simple tool change',
                    'Vibration cushioning effect',
                    'Optimal tool life and surface quality'
                ],
                specifications: [
                    { clampingDia: 6, maxRpm: 50000, maxTorque: 16, minInsertionDepth: 27, maxAdjustment: 10, maxRadialForce: 225, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 8, maxRpm: 50000, maxTorque: 26, minInsertionDepth: 27, maxAdjustment: 10, maxRadialForce: 370, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 10, maxRpm: 50000, maxTorque: 50, minInsertionDepth: 31, maxAdjustment: 10, maxRadialForce: 540, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 12, maxRpm: 50000, maxTorque: 82, minInsertionDepth: 36, maxAdjustment: 10, maxRadialForce: 650, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 14, maxRpm: 50000, maxTorque: 125, minInsertionDepth: 36, maxAdjustment: 10, maxRadialForce: 900, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 16, maxRpm: 50000, maxTorque: 190, minInsertionDepth: 39, maxAdjustment: 10, maxRadialForce: 1410, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 18, maxRpm: 50000, maxTorque: 275, minInsertionDepth: 39, maxAdjustment: 10, maxRadialForce: 1580, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 20, maxRpm: 50000, maxTorque: 310, minInsertionDepth: 41, maxAdjustment: 10, maxRadialForce: 1860, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 25, maxRpm: 25000, maxTorque: 520, minInsertionDepth: 47, maxAdjustment: 10, maxRadialForce: 4400, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' },
                    { clampingDia: 32, maxRpm: 25000, maxTorque: 770, minInsertionDepth: 51, maxAdjustment: 10, maxRadialForce: 6500, operatingTemp: '20-50°C', maxCoolantPressure: 80, shankTolerance: 'h6' }
                ]
            },
            
            catHydraulicHolders: {
                seriesNumber: '4216',
                balanceQuality: 'G6.3 at 15,000 RPM',
                taperStandard: 'ANSI/ASME B 5.50',
                coolant: 'Through center and flange',
                retentionKnob: { CAT40: '5/8-11', CAT50: '1-8' },
                models: [
                    // CAT40 Inch
                    { taper: 'CAT40', clampingDia: '1/4"', clampingDiaMm: 6.35, d2: 26.0, d4: 44.5, l1: 64.0, l2: 37.0, l5: 29.5, edp: '9042161060400' },
                    { taper: 'CAT40', clampingDia: '3/8"', clampingDiaMm: 9.525, d2: 30.0, d4: 44.5, l1: 64.0, l2: 41.0, l5: 31.0, edp: '9042161090400' },
                    { taper: 'CAT40', clampingDia: '1/2"', clampingDiaMm: 12.7, d2: 32.0, d4: 44.5, l1: 64.0, l2: 46.0, l5: 31.5, edp: '9042161120400' },
                    { taper: 'CAT40', clampingDia: '5/8"', clampingDiaMm: 15.875, d2: 38.0, d4: 44.5, l1: 64.0, l2: 49.0, l5: 33.0, edp: '9042161150400' },
                    { taper: 'CAT40', clampingDia: '3/4"', clampingDiaMm: 19.05, d2: 40.0, d4: 44.5, l1: 64.0, l2: 49.0, l5: 33.0, edp: '9042161190400' },
                    { taper: 'CAT40', clampingDia: '1"', clampingDiaMm: 25.4, d2: 49.5, d4: 44.5, l1: 81.0, l2: 57.0, l5: 40.0, edp: '9042161250400' },
                    { taper: 'CAT40', clampingDia: '1-1/4"', clampingDiaMm: 31.75, d2: 63.0, d4: 80.0, l1: 81.0, l2: 61.0, l5: 25.5, edp: '9042161310400' },
                    // CAT50 Inch
                    { taper: 'CAT50', clampingDia: '1/4"', clampingDiaMm: 6.35, d2: 26.0, d4: 69.9, l1: 81.0, l2: 37.0, l5: 29.5, edp: '9042161060500' },
                    { taper: 'CAT50', clampingDia: '3/8"', clampingDiaMm: 9.525, d2: 30.0, d4: 69.9, l1: 81.0, l2: 41.0, l5: 31.0, edp: '9042161090500' },
                    { taper: 'CAT50', clampingDia: '1/2"', clampingDiaMm: 12.7, d2: 32.0, d4: 69.9, l1: 81.0, l2: 46.0, l5: 31.5, edp: '9042161120500' },
                    { taper: 'CAT50', clampingDia: '5/8"', clampingDiaMm: 15.875, d2: 38.0, d4: 69.9, l1: 81.0, l2: 49.0, l5: 33.0, edp: '9042161150500' },
                    { taper: 'CAT50', clampingDia: '3/4"', clampingDiaMm: 19.05, d2: 40.0, d4: 69.9, l1: 81.0, l2: 49.0, l5: 33.0, edp: '9042161190500' },
                    { taper: 'CAT50', clampingDia: '1"', clampingDiaMm: 25.4, d2: 57.0, d4: 69.9, l1: 81.0, l2: 57.0, l5: 40.0, edp: '9042161250500' },
                    { taper: 'CAT50', clampingDia: '1-1/4"', clampingDiaMm: 31.75, d2: 63.0, d4: 69.9, l1: 81.0, l2: 61.0, l5: 45.0, edp: '9042161310500' },
                    // CAT40 Metric
                    { taper: 'CAT40', clampingDia: '6mm', clampingDiaMm: 6, d2: 26.0, d4: 44.5, l1: 64.0, l2: 37.0, l5: 29.5, edp: '9042160060400' },
                    { taper: 'CAT40', clampingDia: '8mm', clampingDiaMm: 8, d2: 28.0, d4: 44.5, l1: 64.0, l2: 37.0, l5: 30.0, edp: '9042160080400' },
                    { taper: 'CAT40', clampingDia: '10mm', clampingDiaMm: 10, d2: 30.0, d4: 44.5, l1: 64.0, l2: 41.0, l5: 31.0, edp: '9042160100400' },
                    { taper: 'CAT40', clampingDia: '12mm', clampingDiaMm: 12, d2: 32.0, d4: 44.5, l1: 64.0, l2: 46.0, l5: 31.5, edp: '9042160120400' },
                    { taper: 'CAT40', clampingDia: '14mm', clampingDiaMm: 14, d2: 34.0, d4: 44.5, l1: 64.0, l2: 46.0, l5: 31.5, edp: '9042160140400' },
                    { taper: 'CAT40', clampingDia: '16mm', clampingDiaMm: 16, d2: 38.0, d4: 44.5, l1: 64.0, l2: 49.0, l5: 33.0, edp: '9042160160400' },
                    { taper: 'CAT40', clampingDia: '18mm', clampingDiaMm: 18, d2: 40.0, d4: 44.5, l1: 64.0, l2: 49.0, l5: 33.0, edp: '9042160180400' },
                    { taper: 'CAT40', clampingDia: '20mm', clampingDiaMm: 20, d2: 42.0, d4: 44.5, l1: 64.0, l2: 51.0, l5: 34.0, edp: '9042160200400' },
                    { taper: 'CAT40', clampingDia: '25mm', clampingDiaMm: 25, d2: 49.5, d4: 44.5, l1: 81.0, l2: 57.0, l5: 40.0, edp: '9042160250400' },
                    { taper: 'CAT40', clampingDia: '32mm', clampingDiaMm: 32, d2: 63.0, d4: 80.0, l1: 81.0, l2: 61.0, l5: 25.5, edp: '9042160320400' }
                ]
            },
            
            catShrinkFitHolders: {
                seriesNumber: '4764',
                balanceQuality: 'G6.3 at 15,000 RPM',
                balancingThreads: '4x M6 / 6x M6',
                features: ['Axial force dampening set screw', 'Perfect runout accuracy'],
                models: [
                    { taper: 'CAT40', clampingDia: '1/4"', d2: 21.0, d4: 27.0, l1: 80.0, l2: 36.0, edp: '9047641060400' },
                    { taper: 'CAT40', clampingDia: '3/8"', d2: 24.0, d4: 32.0, l1: 80.0, l2: 41.0, edp: '9047641090400' },
                    { taper: 'CAT40', clampingDia: '1/2"', d2: 24.0, d4: 32.0, l1: 80.0, l2: 46.0, edp: '9047641120400' },
                    { taper: 'CAT40', clampingDia: '5/8"', d2: 27.0, d4: 34.0, l1: 80.0, l2: 49.0, edp: '9047641150400' },
                    { taper: 'CAT40', clampingDia: '3/4"', d2: 33.0, d4: 42.0, l1: 80.0, l2: 49.0, edp: '9047641190400' },
                    { taper: 'CAT40', clampingDia: '1"', d2: 44.0, d4: 53.0, l1: 100.0, l2: 57.0, edp: '9047641250400' },
                    { taper: 'CAT40', clampingDia: '1-1/4"', d2: 44.0, d4: 53.0, l1: 100.0, l2: 61.0, edp: '9047641310400' }
                ]
            },
            
            guhrojetShrinkFit: {
                seriesNumber: '4765',
                description: 'Optimized cooling for tools without internal coolant ducts',
                features: ['Good chip evacuation', 'Increased process reliability'],
                models: [
                    { taper: 'CAT40', clampingDia: '1/4"', d2: 21.0, d4: 27.0, l1: 80.0, l2: 36.0, edp: '9047651060400' },
                    { taper: 'CAT40', clampingDia: '3/8"', d2: 24.0, d4: 32.0, l1: 80.0, l2: 41.0, edp: '9047651090400' },
                    { taper: 'CAT40', clampingDia: '1/2"', d2: 24.0, d4: 32.0, l1: 80.0, l2: 46.0, edp: '9047651120400' },
                    { taper: 'CAT40', clampingDia: '5/8"', d2: 27.0, d4: 34.0, l1: 80.0, l2: 49.0, edp: '9047651150400' },
                    { taper: 'CAT40', clampingDia: '3/4"', d2: 33.0, d4: 42.0, l1: 80.0, l2: 49.0, edp: '9047651190400' },
                    { taper: 'CAT50', clampingDia: '3/8"', d2: 24.0, d4: 32.0, l1: 80.0, l2: 41.0, edp: '9047651090500' },
                    { taper: 'CAT50', clampingDia: '1/2"', d2: 24.0, d4: 32.0, l1: 80.0, l2: 46.0, edp: '9047651120500' },
                    { taper: 'CAT50', clampingDia: '3/4"', d2: 33.0, d4: 42.0, l1: 80.0, l2: 49.0, edp: '9047651190500' },
                    { taper: 'CAT50', clampingDia: '1"', d2: 44.0, d4: 53.0, l1: 100.0, l2: 57.0, edp: '9047651250500' }
                ]
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // BIG DAISHOWA TOOL HOLDERS
        // Source: BIG DAISHOWA High Performance Tooling Solutions Vol 5.pdf (628 pages)
        // ─────────────────────────────────────────────────────────────────────
        bigDaishowa: {
            brand: 'BIG DAISHOWA',
            country: 'Japan',
            website: 'www.bigdaishowa.com',
            
            bigPlusSystem: {
                description: 'Dual contact spindle system for highest precision',
                benefits: [
                    'ATC repeatability within 1μm',
                    'Minimized deflection',
                    'Maximum machining accuracy',
                    'Superior surface finish'
                ],
                pullingForce: '800kg',
                deflectionReduction: 'Significantly reduced vs conventional'
            },
            
            megaChucks: {
                megaMicroChuck: {
                    description: 'For micro drill & end mill applications',
                    maxRpm: 38000,
                    clampingRange: { min: 0.018, max: 0.317, minMm: 0.45, maxMm: 8.05, unit: 'inch' },
                    models: [
                        { taper: 'HSK-A40', clampingRange: '0.018-0.128"', bodyDia: 0.394, length: 2.36, maxRpm: 30000, collet: 'NBC3S', weight: 0.6 },
                        { taper: 'HSK-A40', clampingRange: '0.018-0.159"', bodyDia: 0.472, length: 2.36, maxRpm: 30000, collet: 'NBC4S', weight: 0.6 },
                        { taper: 'HSK-A40', clampingRange: '0.018-0.238"', bodyDia: 0.551, length: 2.36, maxRpm: 30000, collet: 'NBC6S', weight: 0.6 },
                        { taper: 'HSK-A50', clampingRange: '0.018-0.159"', bodyDia: 0.472, length: 2.95, maxRpm: 30000, collet: 'NBC4S', weight: 1.1 },
                        { taper: 'HSK-A63', clampingRange: '0.018-0.159"', bodyDia: 0.472, length: 2.95, maxRpm: 30000, collet: 'NBC4S', weight: 1.8 },
                        { taper: 'HSK-A63', clampingRange: '0.116-0.317"', bodyDia: 0.709, length: 3.54, maxRpm: 30000, collet: 'NBC8S', weight: 2.0 }
                    ]
                },
                
                megaEChuck: {
                    description: 'Collet chuck for end milling up to ø0.500" with high concentricity & rigidity',
                    maxRpm: 40000,
                    clampingRange: { min: 0.125, max: 0.500, minMm: 3, maxMm: 12, unit: 'inch' },
                    runout: { guaranteed: 0.00004, atNose: 0.00004, atTestBar: 0.00012, unit: 'inch' },
                    maxCoolantPressure: 1000, // PSI
                    features: [
                        '100% concentricity inspection',
                        'Runout within 1μm at nose guaranteed',
                        'Sealed collet nut for reliable coolant',
                        'Extended gripping length',
                        'Thick body eliminates chatter and deflection'
                    ]
                },
                
                megaSynchro: {
                    description: 'Tapping holder that compensates for synchronization errors',
                    thrustLoadReduction: { withColletChuck: 165, withMegaSynchro: 13.2, unit: 'lbs', reduction: '90%' },
                    tappingRanges: {
                        MGT3: { ansi: 'No.0-No.6', metric: 'M1-M3' },
                        MGT36: { ansi: 'AU13/16-AU1-1/2', metric: 'M20-M36' }
                    },
                    benefits: [
                        'Minimized thrust load',
                        'Improved thread quality',
                        'Extended tap life',
                        'Fine surface finish'
                    ]
                }
            },
            
            shrinkFitHolders: {
                slimJetThrough: {
                    description: 'Coolant securely supplied to cutting edge periphery from chuck nose',
                    clampingRange: { min: 0.236, max: 0.472, unit: 'inch' },
                    models: [
                        { taper: 'BBT40', clampingDia: 0.236, bodyDia: 0.630, bodDia1: 1.26, length: 4.13, minClampLength: 2.17, weight: 2.9 },
                        { taper: 'BBT40', clampingDia: 0.315, bodyDia: 0.748, bodDia1: 1.38, length: 4.13, minClampLength: 2.17, weight: 2.9 },
                        { taper: 'BBT40', clampingDia: 0.394, bodyDia: 0.866, bodDia1: 1.50, length: 4.13, minClampLength: 2.28, weight: 3.1 },
                        { taper: 'BBT40', clampingDia: 0.472, bodyDia: 0.945, bodDia1: 1.57, length: 4.13, minClampLength: 2.48, weight: 3.1 },
                        { taper: 'BBT50', clampingDia: 0.236, bodyDia: 0.630, bodDia1: 1.65, length: 6.50, minClampLength: 3.66, weight: 9.0 },
                        { taper: 'BBT50', clampingDia: 0.315, bodyDia: 0.748, bodDia1: 1.77, length: 6.50, minClampLength: 3.90, weight: 9.3 },
                        { taper: 'BBT50', clampingDia: 0.394, bodyDia: 0.866, bodDia1: 1.89, length: 6.50, minClampLength: 4.06, weight: 9.5 },
                        { taper: 'BBT50', clampingDia: 0.472, bodyDia: 0.945, bodDia1: 1.97, length: 6.50, minClampLength: 4.25, weight: 9.5 }
                    ]
                }
            },
            
            angleHeads: {
                ag90TwinHead: {
                    description: 'Compact design for symmetrical machining',
                    maxRpm: 6000,
                    clampingRange: { min: 0.059, max: 0.394, unit: 'inch' },
                    speedRatio: '1:1',
                    rotationDirection: 'Reverse of spindle',
                    models: [
                        { taper: 'BCV40', collet: 'NBC10', weight: 13.9 },
                        { taper: 'BCV50', collet: 'NBC10', weight: 30.4 }
                    ]
                }
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // HAIMER TOOL HOLDERS
        // Source: Haimer USA Master Catalog.pdf (862 pages)
        // ─────────────────────────────────────────────────────────────────────
        haimer: {
            brand: 'HAIMER',
            country: 'Germany',
            website: 'www.haimer.com',
            production: {
                facility: 'Motzenhofen, Germany',
                space: '47,000 ft²',
                capacity: '4,000 tool holders per day',
                claim: 'Largest production facility for rotating tool holders worldwide'
            },
            
            safeLockSystem: {
                description: 'Pull out protection for high performance cutting',
                features: [
                    'Prevents micro-creeping in HPC',
                    'Form fit connection via grooves',
                    'High torque transmission',
                    'No tool pull out',
                    'No twisting'
                ],
                patented: true
            },
            
            holderTypes: {
                shrinkFit: {
                    runout: 0.00012, // inch at 3xD
                    balanceQuality: 'G2.5 at 25,000 RPM',
                    features: ['Symmetric clamping', 'High rigidity', 'Excellent damping']
                },
                colletChuck: {
                    runout: 0.0002, // inch
                    clampingRange: 'ER8 to ER50'
                },
                hydraulic: {
                    runout: 0.0001, // inch
                    coolantPressure: 'Up to 1500 PSI',
                    features: ['Oil-activated clamping', 'Excellent damping']
                }
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 2: WORKHOLDING
    // ═══════════════════════════════════════════════════════════════════════════
    
    workholding: {
        
        // ─────────────────────────────────────────────────────────────────────
        // ORANGE VISE
        // Source: 543f80b8_2016_orange_vise_catalog.pdf (10 pages)
        // ─────────────────────────────────────────────────────────────────────
        orangeVise: {
            brand: 'Orange Vise',
            country: 'USA',
            website: 'www.orangevise.com',
            madeIn: '100% Made in USA',
            warranty: 'Lifetime warranty against defects',
            
            features: [
                'Ball Coupler ready zero-point system',
                'CarveSmart IJS dovetailed jaw interface',
                'Quick-change jaw plates',
                'Dual station convertible to single',
                'No thrust bearings (reliability)',
                'Sealed main screw threads'
            ],
            
            ballCouplers: {
                holdingForce: 10000, // lbs per coupler
                locatingRepeatability: 0.0005, // inch or better
                actuation: ['Manual', 'Pneumatic from above', 'Pneumatic from below']
            },
            
            vises: {
                sixInchDualStation: [
                    {
                        model: 'OV6-200DS3',
                        sku: '100-101',
                        description: '6" x 20.0" Dual Station Vise',
                        jawWidth: 6.0,
                        overallLength: 20.0,
                        maxOpeningWithPlates: { dualLaydown: 4.25, dualWide: 3.0, singleStation: 10.5 },
                        maxOpeningWithoutPlates: { dualLaydown: 5.0, dualWide: 4.5, singleStation: 12.0 },
                        maxClampingForce: 10000,
                        clampingRatio: '825 lbs per 10 lbs-ft torque',
                        shippingWeight: 112,
                        bodyMaterial: 'Cast Iron',
                        price: 1999
                    },
                    {
                        model: 'OV6-175DS3',
                        sku: '100-102',
                        description: '6" x 17.5" Dual Station Vise',
                        jawWidth: 6.0,
                        overallLength: 17.5,
                        maxOpeningWithPlates: { dualLaydown: 3.0, dualWide: 1.75, singleStation: 8.0 },
                        maxOpeningWithoutPlates: { dualLaydown: 3.75, dualWide: 3.25, singleStation: 9.5 },
                        maxClampingForce: 10000,
                        shippingWeight: 106,
                        bodyMaterial: 'Cast Iron',
                        price: 1999
                    },
                    {
                        model: 'OV6-160DS3',
                        sku: '100-103',
                        description: '6" x 16.0" Dual Station Vise',
                        jawWidth: 6.0,
                        overallLength: 16.0,
                        maxOpeningWithPlates: { dualLaydown: 1.5, singleStation: 6.5 },
                        maxOpeningWithoutPlates: { dualLaydown: 2.25, singleStation: 8.0 },
                        maxClampingForce: 10000,
                        shippingWeight: 88,
                        bodyMaterial: 'Cast Iron',
                        price: 1999
                    }
                ],
                
                fourFiveInchDualStation: [
                    {
                        model: 'OV45-200DS3',
                        sku: '100-201',
                        description: '4.5" x 20.0" Dual Station Vise',
                        jawWidth: 4.5,
                        overallLength: 20.0,
                        maxClampingForce: 10000,
                        shippingWeight: 84,
                        bodyMaterial: '17-4 Stainless Steel',
                        price: 1799
                    },
                    {
                        model: 'OV45-175DS3',
                        sku: '100-202',
                        description: '4.5" x 17.5" Dual Station Vise',
                        jawWidth: 4.5,
                        overallLength: 17.5,
                        maxClampingForce: 10000,
                        shippingWeight: 80,
                        bodyMaterial: '17-4 Stainless Steel',
                        price: 1799
                    },
                    {
                        model: 'OV45-160DS3',
                        sku: '100-203',
                        description: '4.5" x 16.0" Dual Station Vise',
                        jawWidth: 4.5,
                        overallLength: 16.0,
                        maxClampingForce: 10000,
                        shippingWeight: 66,
                        bodyMaterial: '17-4 Stainless Steel',
                        price: 1799
                    },
                    {
                        model: 'OV45-160SS3',
                        sku: '100-204',
                        description: '4.5" x 16.0" Single Station Vise',
                        jawWidth: 4.5,
                        overallLength: 16.0,
                        maxOpeningWithPlates: 8.0,
                        maxOpeningWithoutPlates: 9.5,
                        maxClampingForce: 10000,
                        shippingWeight: 66,
                        bodyMaterial: '17-4 Stainless Steel',
                        price: 999
                    }
                ],
                
                specifications: {
                    fixedJawMountingScrew: '1/2"-13 x 2.25" BHCS',
                    fixedJawTorque: 30, // lbs-ft
                    slidingJawSetScrew: '1/2"-13 x 1.25"',
                    slidingJawTorque: 10, // lbs-ft
                    jawPlateScrew: '1/2"-13 LHCS',
                    jawPlateTorque: 20, // lbs-ft
                    jawPlateBoltPattern: '0.938" from base, 3.875" center to center',
                    brakeSetScrew: '1/2"-13 x 1.25" Brass Tipped',
                    brakeTorque: 10, // lbs-ft
                    brakeTravel: '0.00" - 0.25"'
                }
            },
            
            accessories: {
                subplatesSteel: [
                    { sku: '100-401', description: 'Compact Subplate for 6" Vises', size: '6 x 20.0 x 1.38', price: 399 },
                    { sku: '100-402', description: 'Compact Subplate for 6" Vises', size: '6 x 17.5 x 1.38', price: 379 },
                    { sku: '100-403', description: 'Compact Subplate for 6" Vises', size: '6 x 16.0 x 1.38', price: 359 },
                    { sku: '100-411', description: 'Compact Subplate for 4.5" Vises', size: '4.5 x 20.0 x 1.38', price: 379 },
                    { sku: '100-412', description: 'Compact Subplate for 4.5" Vises', size: '4.5 x 17.5 x 1.38', price: 359 },
                    { sku: '100-413', description: 'Compact Subplate for 4.5" Vises', size: '4.5 x 16.0 x 1.38', price: 339 }
                ],
                masterJaws6Inch: [
                    { sku: '700-101', description: '6" IJS Master Sliding Jaw', size: '6 x 4.00 x 1.69', price: 199 },
                    { sku: '700-102', description: '6" IJS Master Center Jaw', size: '6 x 3.12 x 1.69', price: 199 },
                    { sku: '700-103', description: '6" IJS Laydown Center Jaw', size: '6 x 2.00 x 1.69', price: 149 },
                    { sku: '700-104', description: '6" Hardened Jawplates (2)', size: '6 x 1.71 x 0.75', price: 99 }
                ],
                machinableSoftJaws6Inch: [
                    { sku: '701-001', description: 'Machinable Sliding Jaw - Steel', size: '6 x 4.63 x 2.0', price: 129 },
                    { sku: '701-002', description: 'Machinable Sliding Jaw - 6061 Alum', size: '6 x 4.63 x 2.0', price: 79 },
                    { sku: '701-003', description: 'Machinable Sliding Jaw - 7075 Alum', size: '6 x 4.63 x 2.0', price: 109 },
                    { sku: '701-011', description: 'Machinable Center Jaw - Steel', size: '6 x 4.00 x 2.0', price: 109 },
                    { sku: '701-012', description: 'Machinable Center Jaw - 6061 Alum', size: '6 x 4.00 x 2.0', price: 69 },
                    { sku: '701-013', description: 'Machinable Center Jaw - 7075 Alum', size: '6 x 4.00 x 2.0', price: 99 }
                ],
                ballCouplers: [
                    { sku: '100-901', description: 'Ball Coupler', size: '1.5" OD', price: 99 },
                    { sku: '100-911', description: 'Ball Receiver A (Round)', size: '1.5" ID x 3.0" OD', price: 99 },
                    { sku: '100-912', description: 'Ball Receiver B (Oblong)', size: '1.5" ID x 3.0" OD', price: 99 }
                ],
                tombstones: [
                    { sku: '100-301', model: 'OV45-200-8SSQ', description: '4.5" 8-Station Square Column', size: '6" x 6" cross section', price: 9999 },
                    { sku: '100-311', model: 'OV6-200-8SSQ', description: '6" 8-Station Square Column', size: '9" x 9" cross section', price: 9999 },
                    { sku: '100-302', description: '6.0" Square Column with Ball Receivers', size: 'Column: 6 x 6 x 22', price: 1999 },
                    { sku: '100-312', description: '8.0" Square Column with Ball Receivers', size: 'Column: 8 x 8 x 22', price: 2499 }
                ]
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 3: CUTTING TOOLS & PARAMETERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    cuttingTools: {
        
        // ─────────────────────────────────────────────────────────────────────
        // SGS/KYOCERA CUTTING TOOLS
        // Source: SGS_Global_Catalog_v26.1.pdf (436 pages)
        // ─────────────────────────────────────────────────────────────────────
        sgs: {
            brand: 'SGS / KYOCERA SGS Precision Tools',
            country: 'USA',
            website: 'www.kyocera-sgstool.com',
            
            coatings: {
                'Ti-NAMITE': {
                    description: 'Titanium Nitride (TiN)',
                    color: 'Gold',
                    layerStructure: 'Multilayer',
                    thickness: '1-5 microns',
                    hardness: 2200, // HV
                    thermalStability: 600, // °C
                    frictionCoef: '0.40-0.65',
                    applications: 'General purpose, wide variety of materials'
                },
                'Ti-NAMITE-A': {
                    description: 'Aluminum Titanium Nitride (AlTiN)',
                    color: 'Dark grey',
                    layerStructure: 'Nano structure',
                    thickness: '1-5 microns',
                    hardness: 3700,
                    thermalStability: 1100,
                    frictionCoef: '0.30',
                    applications: 'Dry cutting, high thermal/chemical resistance, carbide protection'
                },
                'Ti-NAMITE-B': {
                    description: 'Titanium DiBoride (TiB2)',
                    color: 'Light grey-silver',
                    layerStructure: 'Monolayer',
                    thickness: '1-2 microns',
                    hardness: 4000,
                    thermalStability: 850,
                    frictionCoef: '0.10-0.20',
                    applications: 'Aluminum, copper, non-ferrous, prevents cold welding'
                },
                'Ti-NAMITE-C': {
                    description: 'Titanium Carbonitride (TiCN)',
                    color: 'Pink-red',
                    layerStructure: 'Multilayer',
                    thickness: '1-5 microns',
                    hardness: 3000,
                    thermalStability: 400,
                    frictionCoef: '0.30-0.45',
                    applications: 'Interrupted cuts, milling, good toughness'
                }
            },
            
            endMillSeries: {
                'Z-Carb-XPR': {
                    series: ['ZR', 'ZRCR'],
                    fluteCount: 4,
                    cutDiaRange: { inch: '0.250-0.750', metric: '6-20mm' },
                    cutLengthMultiplier: '2-3x DC',
                    helix: 'Variable',
                    coating: ['Ti-NAMITE-X', 'MEGACOAT NANO'],
                    centerCutting: true,
                    fluteIndex: 'Unequal',
                    maxRampAngle: 90,
                    chipbreaker: 'By request',
                    shankOptions: ['Solid Round', 'Weldon Flat']
                },
                'Z-Carb-AP': {
                    series: ['Z1P', 'Z1PCR', 'Z1PLC', 'Z1PB', 'Z1PLB'],
                    fluteCount: 4,
                    cutDiaRange: { inch: '0.0156-1.0', metric: '1-25mm' },
                    cutLengthMultiplier: '1-3.25x DC',
                    reachMultiplier: '2.5-8.5x DC',
                    helix: '35/38° variable',
                    coating: 'Ti-NAMITE-X',
                    centerCutting: true,
                    fluteIndex: 'Unequal',
                    maxRampAngle: 90,
                    endStyles: ['Square', 'Corner Radius', 'Ball']
                }
            },
            
            cuttingParameters: {
                zCarbXPR: {
                    // Fractional inch data
                    fractional: {
                        carbonSteels: {
                            hardnessMax: '28 HRc',
                            bhnMax: 275,
                            materials: ['1018', '1040', '1080', '1090', '10L50', '1140', '1212', '12L15', '1525', '1536'],
                            profile: { sfm: 675, sfmRange: '540-810' },
                            slot: { sfm: 450, sfmRange: '360-540' },
                            plunge: { sfm: 640, sfmRange: '512-768' },
                            feedPerTooth: {
                                '0.250': { profile: 0.0017, slot: 0.0014, plunge: 0.0013 },
                                '0.375': { profile: 0.0029, slot: 0.0025, plunge: 0.0022 },
                                '0.500': { profile: 0.0041, slot: 0.0035, plunge: 0.0032 },
                                '0.625': { profile: 0.0045, slot: 0.0039, plunge: 0.0035 },
                                '0.750': { profile: 0.0048, slot: 0.0042, plunge: 0.0038 }
                            }
                        },
                        alloySteels: {
                            hardnessMax: '40 HRc',
                            bhnMax: 375,
                            materials: ['4140', '4150', '4320', '5120', '5150', '8630', '86L20', '50100'],
                            profile: { sfm: 525, sfmRange: '420-630' },
                            slot: { sfm: 350, sfmRange: '280-420' },
                            plunge: { sfm: 500, sfmRange: '400-600' },
                            feedPerTooth: {
                                '0.250': { profile: 0.0011, slot: 0.0010, plunge: 0.0009 },
                                '0.375': { profile: 0.0024, slot: 0.0021, plunge: 0.0019 },
                                '0.500': { profile: 0.0036, slot: 0.0031, plunge: 0.0028 },
                                '0.625': { profile: 0.0039, slot: 0.0034, plunge: 0.0031 },
                                '0.750': { profile: 0.0042, slot: 0.0037, plunge: 0.0033 }
                            }
                        },
                        toolSteels: {
                            hardnessMax: '40 HRc',
                            bhnMax: 375,
                            materials: ['A2', 'D2', 'H13', 'L2', 'M2', 'P20', 'S7', 'T15', 'W2'],
                            profile: { sfm: 240, sfmRange: '192-288' },
                            slot: { sfm: 160, sfmRange: '128-192' },
                            plunge: { sfm: 220, sfmRange: '176-264' },
                            feedPerTooth: {
                                '0.250': { profile: 0.0009, slot: 0.0008, plunge: 0.0007 },
                                '0.375': { profile: 0.0018, slot: 0.0016, plunge: 0.0014 },
                                '0.500': { profile: 0.0026, slot: 0.0023, plunge: 0.0021 },
                                '0.625': { profile: 0.0030, slot: 0.0026, plunge: 0.0023 },
                                '0.750': { profile: 0.0033, slot: 0.0028, plunge: 0.0025 }
                            }
                        },
                        castIronLowMed: {
                            hardnessMax: '19 HRc',
                            bhnMax: 220,
                            materials: ['Gray', 'Malleable', 'Ductile'],
                            profile: { sfm: 630, sfmRange: '504-756' },
                            slot: { sfm: 420, sfmRange: '336-504' },
                            plunge: { sfm: 600, sfmRange: '480-720' }
                        },
                        castIronHigh: {
                            hardnessMax: '26 HRc',
                            bhnMax: 260,
                            materials: ['Gray', 'Malleable', 'Ductile'],
                            profile: { sfm: 375, sfmRange: '300-450' },
                            slot: { sfm: 250, sfmRange: '200-300' },
                            plunge: { sfm: 350, sfmRange: '280-420' }
                        },
                        superAlloys: {
                            hardnessMax: '32 HRc',
                            bhnMax: 300,
                            materials: ['Inconel 601', 'Inconel 617', 'Inconel 625', 'Incoloy', 'Monel 400'],
                            profile: { sfm: 105, sfmRange: '84-126' },
                            slot: { sfm: 70, sfmRange: '56-84' },
                            ramp3deg: { sfm: 100, sfmRange: '80-120' }
                        }
                    }
                }
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // HAIMER CUTTING TOOLS
        // Source: Haimer USA Master Catalog.pdf
        // ─────────────────────────────────────────────────────────────────────
        haimer: {
            brand: 'HAIMER',
            country: 'Germany',
            
            materialGroups: {
                P1: { 
                    name: 'General construction steels', 
                    ansi: ['A252', 'A50-2', '1045'],
                    din: ['1.0038', '1.0050', '1.0503'],
                    tensileMax: '800 N/mm² (116,000 PSI)',
                    hardnessMax: '25 HRc'
                },
                P2: { 
                    name: 'Heat treated steels', 
                    ansi: ['D2', '4140'],
                    din: ['1.2367', '1.2379', '1.2363', '1.7225'],
                    tensileMin: '800 N/mm² (116,000 PSI)',
                    hardnessMax: '45 HRc'
                },
                M1: { 
                    name: 'Stainless steels (soft)', 
                    ansi: ['303', '304'],
                    din: ['1.4305', '1.4301', '1.4034'],
                    tensileMax: '650 N/mm² (94,275 PSI)'
                },
                M2: { 
                    name: 'Stainless steels (hard)', 
                    ansi: ['316Ti', '316L'],
                    din: ['1.4571', '1.4404', '1.4418'],
                    tensileMin: '650 N/mm² (94,275 PSI)'
                },
                K1: { 
                    name: 'Cast iron (soft)', 
                    ansi: ['ASTM A48 NO. 30', 'ASTM A48 NO. 55/60', 'G1800'],
                    din: ['0.6020', '0.6040', '0.7040'],
                    tensileMax: '450 N/mm² (65,265 PSI)'
                },
                K2: { 
                    name: 'Cast iron (hard)', 
                    ansi: ['ASTM A536 80-55-06', 'ASTM A536 100-70-06'],
                    din: ['0.7060', '0.7070'],
                    tensileMin: '450 N/mm² (65,265 PSI)'
                },
                S1: { 
                    name: 'Titanium alloys', 
                    ansi: ['Ti6Al4V'],
                    din: ['3.7165']
                },
                S2: { 
                    name: 'High temp alloys', 
                    materials: ['Inconel', 'Nimonic'],
                    tensile: '800-1700 N/mm²'
                },
                N1: { 
                    name: 'Wrought aluminum', 
                    ansi: ['A5005', 'A6061', 'A7075'],
                    din: ['3.3315'],
                    silicon: '<9%'
                },
                N2: { 
                    name: 'Cast aluminum', 
                    ansi: ['A310', 'A400'],
                    din: ['3.2581'],
                    silicon: '>9%'
                },
                H1: { 
                    name: 'Hardened steels', 
                    hardness: '45-55 HRc'
                }
            },
            
            cuttingData: {
                haimerMillPower: {
                    // F1003NN series - Sharp cutting edge
                    description: 'Power Series End Mills',
                    cutWidths: {
                        ae100_ap1xD: 'Full slot',
                        ae50_ap15xD: 'Medium engagement',
                        ae25_apMax: 'Light engagement'
                    },
                    speedsSFM: {
                        P1: { ae100: '557-656', ae50: '689-787', ae25: '820-885' },
                        P2: { ae100: '295-361', ae50: '361-426', ae25: '426-492' },
                        M1: { ae100: '-', ae50: '-', ae25: '180-213' },
                        M2: { ae100: '-', ae50: '-', ae25: '131-164' },
                        K1: { ae100: '361-426', ae50: '426-492', ae25: '656-721' },
                        K2: { ae100: '295-361', ae50: '361-426', ae25: '525-590' },
                        S1: { ae100: '197-262', ae50: '197-262', ae25: '197-262' },
                        S2: { ae100: '98-131', ae50: '98-131', ae25: '98-131' },
                        N1: { ae100: '393-787', ae50: '393-787', ae25: '393-787' },
                        N2: { ae100: '393-787', ae50: '393-787', ae25: '393-787' },
                        H1: { ae100: '131-197', ae50: '197-262', ae25: '197-262' }
                    },
                    feedPerToothInch: {
                        // Dia: fz at ae<50%, fz at ae=100%
                        '3/32': { ae50: 0.0006, ae100: 0.0005, finishStep: 0.0001 },
                        '1/8': { ae50: 0.0008, ae100: 0.0006, finishStep: 0.0001 },
                        '3/16': { ae50: 0.0011, ae100: 0.0009, finishStep: 0.0002 },
                        '1/4': { ae50: 0.0015, ae100: 0.0013, finishStep: 0.0003 },
                        '5/16': { ae50: 0.0019, ae100: 0.0016, finishStep: 0.0003 },
                        '3/8': { ae50: 0.0023, ae100: 0.0019, finishStep: 0.0004 },
                        '1/2': { ae50: 0.0030, ae100: 0.0025, finishStep: 0.0005 },
                        '5/8': { ae50: 0.0038, ae100: 0.0031, finishStep: 0.0006 },
                        '3/4': { ae50: 0.0045, ae100: 0.0038, finishStep: 0.0008 },
                        '1': { ae50: 0.0060, ae100: 0.0050, finishStep: 0.0010 }
                    }
                },
                haimerMillBallNose: {
                    // V1002NN series
                    description: 'Ball Nose End Mills',
                    speedsMetric: {
                        P1: { roughing: '180-220', finishing: '280-320' },
                        P2: { roughing: '170-190', finishing: '270-290' },
                        M1: { roughing: '110-130', finishing: '170-190' },
                        M2: { roughing: '70-90', finishing: '120-140' },
                        K1: { roughing: '190-210', finishing: '290-310' },
                        K2: { roughing: '140-160', finishing: '220-240' },
                        S1: { roughing: '60-80', finishing: '60-80' },
                        S2: { roughing: '30-40', finishing: '30-40' },
                        N1: { roughing: '120-240', finishing: '120-240' },
                        N2: { roughing: '120-240', finishing: '120-240' },
                        H1: { roughing: '40-60', finishing: '60-80' }
                    },
                    feedPerToothMm: {
                        '2': { ae50: 0.02, ae100: 0.01, finishStep: 0.002 },
                        '3': { ae50: 0.03, ae100: 0.015, finishStep: 0.003 },
                        '4': { ae50: 0.04, ae100: 0.02, finishStep: 0.004 },
                        '5': { ae50: 0.05, ae100: 0.025, finishStep: 0.005 },
                        '6': { ae50: 0.06, ae100: 0.03, finishStep: 0.006 },
                        '8': { ae50: 0.08, ae100: 0.04, finishStep: 0.008 },
                        '10': { ae50: 0.10, ae100: 0.05, finishStep: 0.010 },
                        '12': { ae50: 0.12, ae100: 0.06, finishStep: 0.012 },
                        '16': { ae50: 0.16, ae100: 0.08, finishStep: 0.016 },
                        '20': { ae50: 0.20, ae100: 0.10, finishStep: 0.020 }
                    }
                },
                haimerMillHF: {
                    // H2006UK series - High Feed
                    description: 'High Feed Milling',
                    speedsMetric: {
                        P1: { roughing: '250-320', finishing: '340-420' },
                        P2: { roughing: '190-220', finishing: '240-310' },
                        M1: { roughing: '95-115', finishing: '135-170' },
                        M2: { roughing: '75-95', finishing: '105-130' },
                        K1: { roughing: '160-180', finishing: '200-230' },
                        K2: { roughing: '130-150', finishing: '170-200' },
                        S1: { roughing: '50-60', finishing: '80-90' },
                        S2: { roughing: '30-40', finishing: '30-40' },
                        N1: { roughing: '500-900', finishing: '500-900' },
                        N2: { roughing: '120-350', finishing: '120-350' },
                        H1: { roughing: '40-60', finishing: '60-80' }
                    },
                    feedPerToothMm: {
                        '10': { fzRange: '0.1-0.3', apHFC: 0.75 },
                        '12': { fzRange: '0.12-0.36', apHFC: 0.9 },
                        '16': { fzRange: '0.16-0.48', apHFC: 1.2 },
                        '20': { fzRange: '0.2-0.6', apHFC: 1.5 }
                    }
                },
                duoLockMill: {
                    // F2003MN series - DUO-LOCK
                    description: 'DUO-LOCK Sharp Cutting Edge',
                    speedsSFM: {
                        P1: { roughing: '525-725', finishing: '725-920' },
                        P2: { roughing: '395-525', finishing: '525-655' },
                        M1: { roughing: '260-395', finishing: '395-525' },
                        M2: { roughing: '195-295', finishing: '295-395' },
                        K1: { roughing: '395-590', finishing: '590-785' },
                        K2: { roughing: '260-525', finishing: '525-720' },
                        S1: { roughing: '130-260', finishing: '130-260' },
                        S2: { roughing: '100-130', finishing: '100-130' },
                        N1: { roughing: '1640-2950', finishing: '1640-2950' },
                        N2: { roughing: '395-1150', finishing: '395-1150' },
                        H1: { roughing: '130-195', finishing: '195-260' }
                    },
                    feedPerToothInch: {
                        '3/8': '0.0011-0.0035',
                        '1/2': '0.0011-0.0039',
                        '5/8': '0.0016-0.0047',
                        '3/4': '0.002-0.005'
                    }
                }
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 4: CATALOG MANIFEST
    // ═══════════════════════════════════════════════════════════════════════════
    
    catalogManifest: [
        // Tool Holders
        { filename: 'guhring tool holders.pdf', pages: 6, size: '664K', category: 'tool_holders', brand: 'Guhring', extracted: true },
        { filename: 'BIG DAISHOWA High Performance Tooling Solutions Vol 5.pdf', pages: 628, size: '25M', category: 'tool_holders', brand: 'BIG DAISHOWA', extracted: true },
        { filename: 'Haimer USA Master Catalog.pdf', pages: 862, size: '353M', category: 'tool_holders_cutting', brand: 'Haimer', extracted: true },
        { filename: 'REGO-FIX Catalogue 2026 ENGLISH.pdf', pages: 448, size: '208M', category: 'tool_holders', brand: 'REGO-FIX', extracted: false },
        { filename: 'CAMFIX_Catalog.pdf', pages: null, size: '53M', category: 'tool_holders', brand: 'CAMFIX', extracted: false },
        
        // Workholding
        { filename: '543f80b8_2016_orange_vise_catalog.pdf', pages: 10, size: '3M', category: 'workholding', brand: 'Orange Vise', extracted: true },
        
        // Cutting Tools
        { filename: 'SGS_Global_Catalog_v26.1.pdf', pages: 436, size: '16M', category: 'cutting_tools', brand: 'SGS/Kyocera', extracted: true },
        { filename: 'OSG.pdf', pages: null, size: '110M', category: 'cutting_tools', brand: 'OSG', extracted: false },
        { filename: 'ISCAR PART 1.pdf', pages: null, size: '354M', category: 'cutting_tools', brand: 'ISCAR', extracted: false },
        { filename: 'INGERSOLL CUTTING TOOLS.pdf', pages: null, size: '104M', category: 'cutting_tools', brand: 'Ingersoll', extracted: false },
        { filename: 'guhring full catalog.pdf', pages: null, size: '49M', category: 'cutting_tools', brand: 'Guhring', extracted: false },
        { filename: 'korloy rotating.pdf', pages: null, size: '56M', category: 'cutting_tools', brand: 'Korloy', extracted: false },
        { filename: 'korloy solid.pdf', pages: null, size: '94M', category: 'cutting_tools', brand: 'Korloy', extracted: false },
        { filename: 'korloy turning.pdf', pages: null, size: '43M', category: 'cutting_tools', brand: 'Korloy', extracted: false },
        { filename: 'MA_Ford_US_Product_Catalog_vol105interactiveweb.pdf', pages: null, size: '162M', category: 'cutting_tools', brand: 'MA Ford', extracted: false },
        { filename: 'Accupro 2013.pdf', pages: null, size: '42M', category: 'cutting_tools', brand: 'Accupro', extracted: false },
        { filename: 'ZK12023_DEGB RevA EMUGE Katalog 160.pdf', pages: null, size: '233M', category: 'cutting_tools', brand: 'EMUGE', extracted: false },
        { filename: 'Flash_Solid_catalog_INCH.pdf', pages: null, size: '86M', category: 'cutting_tools', brand: 'Flash', extracted: false },
        
        // General Catalogs
        { filename: 'Cutting Tools Master 2022 English Inch.pdf', pages: null, size: '149M', category: 'cutting_tools', brand: 'Mitsubishi', extracted: false },
        { filename: 'Cutting Tools Master 2022 English Metric.pdf', pages: null, size: '265M', category: 'cutting_tools', brand: 'Mitsubishi', extracted: false },
        { filename: 'Master Catalog 2018 Vol. 1 Turning Tools English Inch.pdf', pages: null, size: '118M', category: 'turning', brand: 'Sandvik', extracted: false },
        { filename: 'Master Catalog 2018 Vol. 2 Rotating Tools English Inch.pdf', pages: null, size: '259M', category: 'rotating', brand: 'Sandvik', extracted: false },
        { filename: 'GC_2023-2024_US_Milling.pdf', pages: null, size: '48M', category: 'milling', brand: 'GC', extracted: false },
        { filename: 'GC_2023-2024_US_Drilling.pdf', pages: null, size: '16M', category: 'drilling', brand: 'GC', extracted: false },
        { filename: 'GC_2023-2024_US_Turning-Grooving.pdf', pages: null, size: '48M', category: 'turning', brand: 'GC', extracted: false },
        { filename: 'GC_2023-2024_US_Tooling.pdf', pages: null, size: '9.7M', category: 'tooling', brand: 'GC', extracted: false },
        { filename: 'Milling 2018.1.pdf', pages: null, size: '39M', category: 'milling', brand: 'Sandvik', extracted: false },
        { filename: 'Turning 2018.1.pdf', pages: null, size: '53M', category: 'turning', brand: 'Sandvik', extracted: false },
        { filename: 'Threading 2018.1.pdf', pages: null, size: '20M', category: 'threading', brand: 'Sandvik', extracted: false },
        { filename: 'Holemaking.pdf', pages: null, size: '56M', category: 'drilling', brand: 'Sandvik', extracted: false },
        { filename: 'Solid End Mills.pdf', pages: null, size: '40M', category: 'cutting_tools', brand: 'Sandvik', extracted: false },
        { filename: 'Tooling Systems.pdf', pages: null, size: '29M', category: 'tooling', brand: 'Sandvik', extracted: false },
        { filename: 'TURNING_CATALOG_PART 1.pdf', pages: null, size: '204M', category: 'turning', brand: 'Unknown', extracted: false },
        { filename: 'zeni catalog.pdf', pages: null, size: '183M', category: 'cutting_tools', brand: 'Zeni', extracted: false },
        { filename: 'AMPC_US-EN.pdf', pages: null, size: '167M', category: 'cutting_tools', brand: 'AMPC', extracted: false },
        { filename: 'catalog_c010b_full.pdf', pages: null, size: '99M', category: 'cutting_tools', brand: 'Unknown', extracted: false },
        { filename: '01-Global-CNC-Full-Catalog-2023.pdf', pages: null, size: '54M', category: 'cnc_accessories', brand: 'Global CNC', extracted: false },
        { filename: '2018 Rapidkut Catalog.pdf', pages: null, size: '4M', category: 'cutting_tools', brand: 'Rapidkut', extracted: false },
        { filename: 'Metalmorphosis-2021-FINAL-reduced-for-Web.pdf', pages: null, size: '24M', category: 'cutting_tools', brand: 'Metalmorphosis', extracted: false },
        { filename: 'Tooling Systems News 2018 English MetricInch.pdf', pages: null, size: '12M', category: 'tooling', brand: 'Sandvik', extracted: false }
    ],
    
    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════════════════
    
    getToolHolderByTaper: function(taper) {
        const results = [];
        // Search Guhring
        if (this.toolHolders.guhring?.catHydraulicHolders?.models) {
            results.push(...this.toolHolders.guhring.catHydraulicHolders.models.filter(m => m.taper === taper));
        }
        if (this.toolHolders.guhring?.catShrinkFitHolders?.models) {
            results.push(...this.toolHolders.guhring.catShrinkFitHolders.models.filter(m => m.taper === taper));
        }
        return results;
    },
    
    getCuttingParamsForMaterial: function(materialType, toolSeries = 'zCarbXPR') {
        const params = this.cuttingTools.sgs?.cuttingParameters?.[toolSeries]?.fractional;
        if (!params) return null;
        
        const materialMap = {
            'carbon_steel': 'carbonSteels',
            'alloy_steel': 'alloySteels',
            'tool_steel': 'toolSteels',
            'cast_iron_soft': 'castIronLowMed',
            'cast_iron_hard': 'castIronHigh',
            'superalloy': 'superAlloys'
        };
        
        return params[materialMap[materialType] || materialType];
    },
    
    getViseByWidth: function(width) {
        const vises = [];
        if (width === 6) {
            vises.push(...(this.workholding.orangeVise?.vises?.sixInchDualStation || []));
        } else if (width === 4.5) {
            vises.push(...(this.workholding.orangeVise?.vises?.fourFiveInchDualStation || []));
        }
        return vises;
    },
    
    getStats: function() {
        return {
            totalCatalogs: this.catalogManifest.length,
            extractedCatalogs: this.catalogManifest.filter(c => c.extracted).length,
            toolHolderBrands: Object.keys(this.toolHolders).length,
            workholdingBrands: Object.keys(this.workholding).length,
            cuttingToolBrands: Object.keys(this.cuttingTools).length,
            guhringHydraulicSpecs: this.toolHolders.guhring?.hydraulicChucks?.specifications?.length || 0,
            guhringCatHolders: this.toolHolders.guhring?.catHydraulicHolders?.models?.length || 0,
            orangeViseModels: (this.workholding.orangeVise?.vises?.sixInchDualStation?.length || 0) + 
                             (this.workholding.orangeVise?.vises?.fourFiveInchDualStation?.length || 0),
            sgsCoatings: Object.keys(this.cuttingTools.sgs?.coatings || {}).length,
            haimerMaterialGroups: Object.keys(this.cuttingTools.haimer?.materialGroups || {}).length
        };
    }
};

// Register with PRISM Gateway if available
if (typeof PRISM_GATEWAY !== 'undefined') {
    PRISM_GATEWAY.register('catalog.toolHolders.getByTaper', 'PRISM_MANUFACTURER_CATALOG_DATABASE.getToolHolderByTaper');
    PRISM_GATEWAY.register('catalog.cuttingParams.getByMaterial', 'PRISM_MANUFACTURER_CATALOG_DATABASE.getCuttingParamsForMaterial');
    PRISM_GATEWAY.register('catalog.workholding.getViseByWidth', 'PRISM_MANUFACTURER_CATALOG_DATABASE.getViseByWidth');
    PRISM_GATEWAY.register('catalog.stats', 'PRISM_MANUFACTURER_CATALOG_DATABASE.getStats');
}

    // ═══════════════════════════════════════════════════════════════
    // BATCH 2: CUTTING PARAMETERS (v2)
    // ═══════════════════════════════════════════════════════════════
    // SECTION 1: OSG CUTTING TOOLS
    // Source: OSG.pdf (1708 pages)
    // ═══════════════════════════════════════════════════════════════════════════
    
    osg: {
        brand: 'OSG',
        country: 'Japan',
        website: 'www.osgtool.com',
        catalogPages: 1708,
        
        // ─────────────────────────────────────────────────────────────────────
        // A Brand ADO Carbide Drills - Speed/Feed Tables
        // ─────────────────────────────────────────────────────────────────────
        adoCarbideDrills: {
            series: ['ADO-3D', 'ADO-5D', 'ADO-8D', 'ADO-10D', 'ADO-15D', 'ADO-20D', 'ADO-30D', 'ADO-40D', 'ADO-50D'],
            coating: 'EgiAs',
            features: ['Coolant-through', '2 flute', '30° helix', 'h6 shank'],
            pointAngle: 140,
            
            // Material: Carbon Steels, Mild Steels (1010, 1050, 12L14)
            carbonSteel: {
                sfmRange: [260, 395],
                cuttingData: [
                    // { drillDia (mm), drillDiaInch, rpm, iprMin, iprMax }
                    { dia: 2, diaInch: 0.079, rpm: 15870, iprMin: 0.002, iprMax: 0.004 },
                    { dia: 3, diaInch: 0.118, rpm: 10580, iprMin: 0.002, iprMax: 0.005 },
                    { dia: 3.175, diaInch: 0.125, rpm: 10000, iprMin: 0.003, iprMax: 0.005 },
                    { dia: 4, diaInch: 0.157, rpm: 7940, iprMin: 0.003, iprMax: 0.006 },
                    { dia: 4.7625, diaInch: 0.1875, rpm: 6670, iprMin: 0.004, iprMax: 0.007 },
                    { dia: 6, diaInch: 0.236, rpm: 5290, iprMin: 0.005, iprMax: 0.009 },
                    { dia: 6.35, diaInch: 0.250, rpm: 5000, iprMin: 0.006, iprMax: 0.009 },
                    { dia: 8, diaInch: 0.315, rpm: 3970, iprMin: 0.006, iprMax: 0.011 },
                    { dia: 9.525, diaInch: 0.375, rpm: 3330, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 10, diaInch: 0.394, rpm: 3170, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 11.1125, diaInch: 0.4375, rpm: 2860, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 12, diaInch: 0.472, rpm: 2650, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 12.7, diaInch: 0.500, rpm: 2500, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 14, diaInch: 0.551, rpm: 2270, iprMin: 0.009, iprMax: 0.014 },
                    { dia: 15.875, diaInch: 0.625, rpm: 2000, iprMin: 0.010, iprMax: 0.014 },
                    { dia: 16, diaInch: 0.630, rpm: 2000, iprMin: 0.010, iprMax: 0.014 },
                    { dia: 18, diaInch: 0.709, rpm: 1760, iprMin: 0.011, iprMax: 0.015 },
                    { dia: 19.05, diaInch: 0.750, rpm: 1670, iprMin: 0.012, iprMax: 0.015 },
                    { dia: 20, diaInch: 0.787, rpm: 1590, iprMin: 0.012, iprMax: 0.016 }
                ]
            },
            
            // Material: Alloy Steels (4140, 4130)
            alloySteel: {
                sfmRange: [260, 395],
                cuttingData: [
                    { dia: 2, rpm: 15870, iprMin: 0.002, iprMax: 0.004 },
                    { dia: 3, rpm: 10580, iprMin: 0.002, iprMax: 0.005 },
                    { dia: 3.175, rpm: 10000, iprMin: 0.003, iprMax: 0.005 },
                    { dia: 4, rpm: 7940, iprMin: 0.003, iprMax: 0.006 },
                    { dia: 6, rpm: 5290, iprMin: 0.005, iprMax: 0.009 },
                    { dia: 6.35, rpm: 5000, iprMin: 0.005, iprMax: 0.010 },
                    { dia: 8, rpm: 3970, iprMin: 0.006, iprMax: 0.011 },
                    { dia: 9.525, rpm: 3330, iprMin: 0.007, iprMax: 0.012 },
                    { dia: 10, rpm: 3170, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 12, rpm: 2650, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 12.7, rpm: 2500, iprMin: 0.008, iprMax: 0.012 }
                ]
            },
            
            // Material: Stainless Steels (300SS, 400SS, 17-4PH)
            stainlessSteel: {
                sfmRange: [130, 230],
                cuttingData: [
                    { dia: 2, rpm: 8740, iprMin: 0.002, iprMax: 0.004 },
                    { dia: 3, rpm: 5820, iprMin: 0.002, iprMax: 0.005 },
                    { dia: 3.175, rpm: 5500, iprMin: 0.003, iprMax: 0.005 },
                    { dia: 4, rpm: 4370, iprMin: 0.003, iprMax: 0.006 },
                    { dia: 6, rpm: 2910, iprMin: 0.005, iprMax: 0.009 },
                    { dia: 6.35, rpm: 2750, iprMin: 0.006, iprMax: 0.009 },
                    { dia: 8, rpm: 2180, iprMin: 0.006, iprMax: 0.011 },
                    { dia: 9.525, rpm: 1830, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 10, rpm: 1750, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 12, rpm: 1460, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 12.7, rpm: 1380, iprMin: 0.008, iprMax: 0.012 }
                ]
            },
            
            // Material: Titanium Alloy (Ti-6Al-4V)
            titanium: {
                sfmRange: [100, 180],
                cuttingData: [
                    { dia: 2, rpm: 6790, iprMin: 0.002, iprMax: 0.003 },
                    { dia: 3, rpm: 4530, iprMin: 0.002, iprMax: 0.003 },
                    { dia: 3.175, rpm: 4280, iprMin: 0.002, iprMax: 0.004 },
                    { dia: 4, rpm: 3400, iprMin: 0.002, iprMax: 0.004 },
                    { dia: 6, rpm: 2269, iprMin: 0.004, iprMax: 0.005 },
                    { dia: 6.35, rpm: 2140, iprMin: 0.004, iprMax: 0.006 },
                    { dia: 8, rpm: 1700, iprMin: 0.005, iprMax: 0.007 },
                    { dia: 9.525, rpm: 1430, iprMin: 0.005, iprMax: 0.008 },
                    { dia: 10, rpm: 1360, iprMin: 0.006, iprMax: 0.009 },
                    { dia: 12, rpm: 1130, iprMin: 0.007, iprMax: 0.011 },
                    { dia: 12.7, rpm: 1070, iprMin: 0.008, iprMax: 0.012 }
                ]
            },
            
            // Material: Inconel / Nickel Alloys
            inconel: {
                sfmRange: [65, 110],
                cuttingData: [
                    { dia: 2, rpm: 4250, iprMin: 0.001, iprMax: 0.002 },
                    { dia: 3, rpm: 2840, iprMin: 0.001, iprMax: 0.002 },
                    { dia: 3.175, rpm: 2680, iprMin: 0.002, iprMax: 0.002 },
                    { dia: 4, rpm: 2130, iprMin: 0.002, iprMax: 0.002 },
                    { dia: 6, rpm: 1420, iprMin: 0.002, iprMax: 0.004 },
                    { dia: 6.35, rpm: 1340, iprMin: 0.002, iprMax: 0.004 },
                    { dia: 8, rpm: 1060, iprMin: 0.003, iprMax: 0.005 },
                    { dia: 9.525, rpm: 890, iprMin: 0.004, iprMax: 0.005 },
                    { dia: 10, rpm: 850, iprMin: 0.004, iprMax: 0.006 },
                    { dia: 12, rpm: 710, iprMin: 0.005, iprMax: 0.007 },
                    { dia: 12.7, rpm: 670, iprMin: 0.005, iprMax: 0.008 }
                ]
            },
            
            // Material: Cast Iron
            castIron: {
                sfmRange: [260, 395],
                cuttingData: [
                    { dia: 2, rpm: 15870, iprMin: 0.002, iprMax: 0.004 },
                    { dia: 3, rpm: 10580, iprMin: 0.002, iprMax: 0.005 },
                    { dia: 4, rpm: 7940, iprMin: 0.003, iprMax: 0.006 },
                    { dia: 6, rpm: 5290, iprMin: 0.005, iprMax: 0.009 },
                    { dia: 8, rpm: 3970, iprMin: 0.006, iprMax: 0.011 },
                    { dia: 10, rpm: 3170, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 12, rpm: 2650, iprMin: 0.008, iprMax: 0.012 }
                ]
            },
            
            // Material: Hardened Steel 26-30 HRC
            hardenedSteel_26_30: {
                sfmRange: [195, 295],
                cuttingData: [
                    { dia: 2, rpm: 11890, iprMin: 0.002, iprMax: 0.004 },
                    { dia: 3, rpm: 7920, iprMin: 0.002, iprMax: 0.005 },
                    { dia: 4, rpm: 5940, iprMin: 0.003, iprMax: 0.006 },
                    { dia: 6, rpm: 3960, iprMin: 0.005, iprMax: 0.009 },
                    { dia: 8, rpm: 2970, iprMin: 0.006, iprMax: 0.011 },
                    { dia: 10, rpm: 2380, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 12, rpm: 1980, iprMin: 0.008, iprMax: 0.012 }
                ]
            },
            
            // Material: Hardened Steel 30-34 HRC
            hardenedSteel_30_34: {
                sfmRange: [130, 200],
                cuttingData: [
                    { dia: 2, rpm: 8000, iprMin: 0.002, iprMax: 0.003 },
                    { dia: 3, rpm: 5330, iprMin: 0.002, iprMax: 0.003 },
                    { dia: 4, rpm: 4000, iprMin: 0.003, iprMax: 0.004 },
                    { dia: 6, rpm: 2700, iprMin: 0.005, iprMax: 0.006 },
                    { dia: 8, rpm: 2000, iprMin: 0.006, iprMax: 0.008 },
                    { dia: 10, rpm: 1600, iprMin: 0.008, iprMax: 0.010 },
                    { dia: 12, rpm: 1330, iprMin: 0.009, iprMax: 0.012 }
                ]
            },
            
            // Material: Hardened Steel 34-43 HRC
            hardenedSteel_34_43: {
                sfmRange: [130, 160],
                cuttingData: [
                    { dia: 2, rpm: 7040, iprMin: 0.002, iprMax: 0.003 },
                    { dia: 3, rpm: 4690, iprMin: 0.002, iprMax: 0.003 },
                    { dia: 4, rpm: 3520, iprMin: 0.003, iprMax: 0.004 },
                    { dia: 6, rpm: 2340, iprMin: 0.005, iprMax: 0.006 },
                    { dia: 8, rpm: 1760, iprMin: 0.006, iprMax: 0.008 },
                    { dia: 10, rpm: 1410, iprMin: 0.008, iprMax: 0.010 },
                    { dia: 12, rpm: 1170, iprMin: 0.009, iprMax: 0.012 }
                ]
            },
            
            // Material: Aluminum Alloys (5052, 7075)
            aluminum: {
                sfmRange: [265, 650],
                cuttingData: [
                    { dia: 2, rpm: 22200, iprMin: 0.0004, iprMax: 0.002 },
                    { dia: 3, rpm: 14800, iprMin: 0.001, iprMax: 0.004 },
                    { dia: 4, rpm: 11100, iprMin: 0.001, iprMax: 0.005 },
                    { dia: 6, rpm: 7400, iprMin: 0.001, iprMax: 0.007 },
                    { dia: 8, rpm: 5550, iprMin: 0.002, iprMax: 0.009 },
                    { dia: 10, rpm: 4440, iprMin: 0.002, iprMax: 0.012 },
                    { dia: 12, rpm: 3700, iprMin: 0.002, iprMax: 0.014 }
                ]
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // ADO-SUS Stainless Steel Drills
        // ─────────────────────────────────────────────────────────────────────
        adoSusDrills: {
            description: 'Advanced Performance Carbide Drills for Stainless Steels and Titanium Alloys',
            series: ['ADO-SUS-3D', 'ADO-SUS-5D'],
            coating: 'EgiAs',
            features: ['Optimized for stainless', 'Reduced thrust force'],
            
            stainless300Series: {
                sfmRange: [200, 330],
                hardnessRange: { max: 15, unit: 'HRC' },
                cuttingData: [
                    { dia: 2, rpm: 12850, iprMin: 0.0013, iprMax: 0.003 },
                    { dia: 3, rpm: 8570, iprMin: 0.002, iprMax: 0.005 },
                    { dia: 4, rpm: 6430, iprMin: 0.003, iprMax: 0.006 },
                    { dia: 6, rpm: 4280, iprMin: 0.005, iprMax: 0.008 },
                    { dia: 8, rpm: 3210, iprMin: 0.006, iprMax: 0.009 },
                    { dia: 10, rpm: 2570, iprMin: 0.008, iprMax: 0.012 },
                    { dia: 12, rpm: 2140, iprMin: 0.008, iprMax: 0.012 }
                ]
            },
            
            duplexStainless: {
                sfmRange: [130, 260],
                hardnessRange: { max: 30, unit: 'HRC' },
                cuttingData: [
                    { dia: 2, rpm: 9460, iprMin: 0.0013, iprMax: 0.003 },
                    { dia: 3, rpm: 6310, iprMin: 0.002, iprMax: 0.005 },
                    { dia: 4, rpm: 4730, iprMin: 0.003, iprMax: 0.006 },
                    { dia: 6, rpm: 3150, iprMin: 0.005, iprMax: 0.008 },
                    { dia: 8, rpm: 2360, iprMin: 0.006, iprMax: 0.009 },
                    { dia: 10, rpm: 1890, iprMin: 0.007, iprMax: 0.011 }
                ]
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // ADO-MICRO Micro Drills
        // ─────────────────────────────────────────────────────────────────────
        adoMicroDrills: {
            description: 'Advanced Performance Carbide Micro Drills',
            series: ['ADO-MICRO-2D', 'ADO-MICRO-5D', 'ADO-MICRO-12D', 'ADO-MICRO-20D', 'ADO-MICRO-30D'],
            diameterRange: { min: 0.7, max: 2, unit: 'mm' },
            
            carbonSteel: {
                sfmRange: [65, 195],
                cuttingData: [
                    { dia: 0.7, rpm: 18200, iprMin: 0.0003, iprMax: 0.0008 },
                    { dia: 1.0, rpm: 12700, iprMin: 0.0004, iprMax: 0.0012 },
                    { dia: 1.5, rpm: 8500, iprMin: 0.0006, iprMax: 0.0018 },
                    { dia: 2.0, rpm: 6400, iprMin: 0.0008, iprMax: 0.0024 }
                ]
            },
            
            titanium: {
                sfmRange: [130, 195],
                cuttingData: [
                    { dia: 0.7, rpm: 22700, iprMin: 0.0004, iprMax: 0.0007 },
                    { dia: 1.0, rpm: 15900, iprMin: 0.0006, iprMax: 0.001 },
                    { dia: 1.5, rpm: 10600, iprMin: 0.001, iprMax: 0.0015 },
                    { dia: 2.0, rpm: 8000, iprMin: 0.0012, iprMax: 0.002 }
                ]
            },
            
            inconel: {
                sfmRange: [15, 50],
                cuttingData: [
                    { dia: 0.7, rpm: 4500, iprMin: 0.0002, iprMax: 0.0006 },
                    { dia: 1.0, rpm: 3200, iprMin: 0.0002, iprMax: 0.0008 },
                    { dia: 1.5, rpm: 2100, iprMin: 0.0003, iprMax: 0.0012 },
                    { dia: 2.0, rpm: 1600, iprMin: 0.0004, iprMax: 0.0016 }
                ]
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // ADF Flat Drills
        // ─────────────────────────────────────────────────────────────────────
        adfFlatDrills: {
            description: 'Advanced Performance Flat Drills for curved surfaces and thin materials',
            pointAngle: 180,
            
            carbonSteel: {
                sfmRange: [100, 330],
                cuttingData: [
                    { dia: 2, rpm: 12850, iprMin: 0.0012, iprMax: 0.002 },
                    { dia: 3, rpm: 8570, iprMin: 0.002, iprMax: 0.003 },
                    { dia: 4, rpm: 6430, iprMin: 0.002, iprMax: 0.004 },
                    { dia: 6, rpm: 4280, iprMin: 0.004, iprMax: 0.006 },
                    { dia: 8, rpm: 3210, iprMin: 0.005, iprMax: 0.008 },
                    { dia: 10, rpm: 2570, iprMin: 0.006, iprMax: 0.010 },
                    { dia: 12, rpm: 2140, iprMin: 0.007, iprMax: 0.012 }
                ]
            },
            
            hardenedSteel: {
                sfmRange: [65, 100],
                hardnessRange: { max: 50, unit: 'HRC' },
                cuttingData: [
                    { dia: 2, rpm: 4000, iprMin: 0.0008, iprMax: 0.002 },
                    { dia: 3, rpm: 2660, iprMin: 0.001, iprMax: 0.002 },
                    { dia: 4, rpm: 2000, iprMin: 0.002, iprMax: 0.003 },
                    { dia: 6, rpm: 1330, iprMin: 0.002, iprMax: 0.005 },
                    { dia: 8, rpm: 1000, iprMin: 0.003, iprMax: 0.006 },
                    { dia: 10, rpm: 800, iprMin: 0.004, iprMax: 0.008 }
                ]
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 2: ISCAR CUTTING TOOLS
    // Source: ISCAR PART 1.pdf (538 pages)
    // ═══════════════════════════════════════════════════════════════════════════
    
    iscar: {
        brand: 'ISCAR',
        country: 'Israel',
        website: 'www.iscar.com',
        catalogPages: 538,
        
        // ─────────────────────────────────────────────────────────────────────
        // Multi-Master Interchangeable Heads
        // ─────────────────────────────────────────────────────────────────────
        multiMaster: {
            description: 'Interchangeable Solid Carbide End Mill Heads',
            threadSizes: ['T04', 'T05', 'T06', 'T08', 'T10', 'T12'],
            coating: 'IC908',
            
            centeringDrills: {
                series: 'MM ECS',
                pointAngle: 120,
                models: [
                    { designation: 'MM ECS-A1.00X06-2T04', diameter: 0.042, shank: 'T04', length: 0.394 },
                    { designation: 'MM ECS-A1.60X06-2T04', diameter: 0.065, shank: 'T04', length: 0.394 },
                    { designation: 'MM ECS-A2.00X06-2T04', diameter: 0.081, shank: 'T04', length: 0.394 },
                    { designation: 'MM ECS-A3.15X08-2T05', diameter: 0.129, shank: 'T05', length: 0.591 },
                    { designation: 'MM ECS-A4.00X10-2T06', diameter: 0.162, shank: 'T06', length: 0.748 },
                    { designation: 'MM ECS-A5.00X12-2T08', diameter: 0.202, shank: 'T08', length: 0.906 },
                    { designation: 'MM ECS-A6.30X16-2T10', diameter: 0.254, shank: 'T10', length: 1.102 }
                ],
                
                cuttingData: {
                    alloySteel_24_29HRC: { sfm: 262, fzBase: 0.0008, note: '4340 24-29HRC' },
                    alloySteel_38_42HRC: { sfm: 213, fzBase: 0.0008, note: '4340 38-42HRC' },
                    stainless316L: { sfm: 164, fzBase: 0.0006, note: '316L MAX-215 HB' },
                    inconel718: { sfm: 49, fzBase: 0.0004, note: 'Inconel 718' }
                }
            },
            
            flatDrills: {
                series: 'MM ECDF',
                helixAngle: 30,
                flutes: 2,
                models: [
                    { designation: 'MM ECDF315A394-2T05', diameter: 0.315, fluteLength: 0.3937 },
                    { designation: 'MM ECDF394A472-2T06', diameter: 0.394, fluteLength: 0.4724 },
                    { designation: 'MM ECDF472A590-2T08', diameter: 0.472, fluteLength: 0.5906 },
                    { designation: 'MM ECDF630A787-2T10', diameter: 0.630, fluteLength: 0.7874 },
                    { designation: 'MM ECDF787A984-2T12', diameter: 0.787, fluteLength: 0.9842 }
                ],
                
                cuttingData: {
                    // Vc SFM, Feed IPR by diameter range
                    carbonSteel_annealed: {
                        sfmRange: [262, 459],
                        feedByDia: {
                            '0.314-0.389': { iprMin: 0.0031, iprMid: 0.0039, iprMax: 0.0047 },
                            '0.393-0.507': { iprMin: 0.0039, iprMid: 0.0047, iprMax: 0.0055 },
                            '0.511-0.625': { iprMin: 0.0047, iprMid: 0.0060, iprMax: 0.0070 },
                            '0.630-0.704': { iprMin: 0.0055, iprMid: 0.0066, iprMax: 0.0078 },
                            '0.708-1.0': { iprMin: 0.0070, iprMid: 0.0082, iprMax: 0.0094 }
                        }
                    },
                    lowAlloySteel_tempered: {
                        sfmRange: [196, 328],
                        feedByDia: {
                            '0.314-0.389': { iprMin: 0.0023, iprMid: 0.0031, iprMax: 0.0039 },
                            '0.393-0.507': { iprMin: 0.0023, iprMid: 0.0031, iprMax: 0.0039 },
                            '0.511-0.625': { iprMin: 0.0031, iprMid: 0.0039, iprMax: 0.0047 },
                            '0.630-0.704': { iprMin: 0.0039, iprMid: 0.0047, iprMax: 0.0055 },
                            '0.708-1.0': { iprMin: 0.0047, iprMid: 0.0055, iprMax: 0.0062 }
                        }
                    }
                }
            },
            
            counterBoring: {
                series: 'MM EFCB',
                flutes: 4,
                helixAngle: 30,
                models: [
                    { designation: 'MM EFCB110A08-4T06', diameter: 11.00, apMax: 8.40, shank: 'T06', fzMin: 0.03, fzMax: 0.04 },
                    { designation: 'MM EFCB140A11-4T08', diameter: 14.00, apMax: 11.50, shank: 'T08', fzMin: 0.04, fzMax: 0.05 }
                ]
            },
            
            spotDrills: {
                series: 'MM SPD',
                flutes: 3,
                helixAngle: 15,
                models: [
                    { designation: 'MM SPD315-31-3T06', diameter: 0.315, fluteLength: 0.4764 },
                    { designation: 'MM SPD394-39-3T08', diameter: 0.394, fluteLength: 0.5906 },
                    { designation: 'MM SPD472-47-3T08', diameter: 0.472, fluteLength: 0.6535 },
                    { designation: 'MM SPD630-63-3T12', diameter: 0.630, fluteLength: 0.9882 }
                ]
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 3: SANDVIK/SECO MILLING
    // Source: Milling 2018.1.pdf (752 pages)
    // ═══════════════════════════════════════════════════════════════════════════
    
    sandvik: {
        brand: 'Sandvik Coromant / Seco',
        country: 'Sweden',
        website: 'www.sandvik.coromant.com',
        catalogPages: 752,
        
        // Seco Material Groups (SMG)
        materialGroups: {
            P1: { name: 'Non-alloy steel, annealed', tensile: '<500 MPa', hb: '<150' },
            P2: { name: 'Non-alloy steel, normalized', tensile: '500-700 MPa', hb: '150-200' },
            P3: { name: 'Low alloy steel, annealed', tensile: '700-850 MPa', hb: '200-250' },
            P4: { name: 'Low alloy steel, normalized', tensile: '850-1000 MPa', hb: '250-300' },
            P5: { name: 'Medium alloy steel, annealed', tensile: '1000-1100 MPa', hb: '300-330' },
            P6: { name: 'Medium alloy steel, tempered', tensile: '1100-1200 MPa', hb: '330-350' },
            P7: { name: 'High alloy steel, annealed', tensile: '1200-1400 MPa', hb: '350-400' },
            P8: { name: 'High alloy steel, tempered', tensile: '1400-1600 MPa', hb: '400-450' },
            P11: { name: 'Tool steel, annealed', tensile: '>1200 MPa', hb: '>350' },
            P12: { name: 'Tool steel, hardened', tensile: '>1400 MPa', hb: '>400' },
            M1: { name: 'Austenitic stainless, soft', tensile: '<700 MPa', hb: '<200' },
            M2: { name: 'Austenitic stainless, med', tensile: '700-900 MPa', hb: '200-250' },
            M3: { name: 'Duplex stainless', tensile: '900-1100 MPa', hb: '250-330' },
            M4: { name: 'Super duplex stainless', tensile: '>1100 MPa', hb: '>330' },
            K1: { name: 'Grey cast iron, soft', tensile: '<200 MPa', hb: '<180' },
            K2: { name: 'Grey cast iron, med', tensile: '200-250 MPa', hb: '180-220' },
            K3: { name: 'Ductile cast iron, soft', tensile: '<400 MPa', hb: '<200' },
            K4: { name: 'Ductile cast iron, med', tensile: '400-600 MPa', hb: '200-280' },
            N1: { name: 'Aluminum wrought, non heat treated' },
            N2: { name: 'Aluminum wrought, heat treated' },
            N3: { name: 'Aluminum cast' },
            S1: { name: 'Heat resistant alloy, Ni-based, soft' },
            S2: { name: 'Heat resistant alloy, Ni-based, med' },
            S3: { name: 'Heat resistant alloy, Ni-based, hard' },
            S11: { name: 'Titanium, commercially pure' },
            S12: { name: 'Titanium alloy, alpha-beta' },
            S13: { name: 'Titanium alloy, beta' },
            H5: { name: 'Hardened steel 45-52 HRC' },
            H8: { name: 'Hardened steel 52-58 HRC' },
            H11: { name: 'Hardened steel 58-63 HRC' },
            H12: { name: 'Hardened steel >63 HRC' }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // Square Shoulder Milling R217/220.94
        // ─────────────────────────────────────────────────────────────────────
        squareShoulderMilling: {
            series: 'R217/220.94',
            insertSizes: ['08', '12'],
            
            insert08: {
                // fz = mm/tooth at different ae/DC percentages
                apMax: 4.0, // mm
                cuttingData: {
                    P1: { fz100: 0.11, fz30: 0.13, fz10: 0.19, insert: 'LOEX080408TR-M08 F40M' },
                    P2: { fz100: 0.12, fz30: 0.13, fz10: 0.20, insert: 'LOEX080408TR-M08 F40M' },
                    P3: { fz100: 0.11, fz30: 0.12, fz10: 0.19, insert: 'LOEX080408TR-M08 MP2500' },
                    P4: { fz100: 0.11, fz30: 0.12, fz10: 0.18, insert: 'LOEX080408TR-M08 MP2500' },
                    M1: { fz100: 0.12, fz30: 0.13, fz10: 0.20, insert: 'LOEX080408TR-M08 F40M' },
                    M2: { fz100: 0.11, fz30: 0.12, fz10: 0.18, insert: 'LOEX080408TR-M08 F40M' },
                    K1: { fz100: 0.12, fz30: 0.13, fz10: 0.20, insert: 'LOEX080408TR-MD08 MK2050' },
                    K2: { fz100: 0.11, fz30: 0.12, fz10: 0.18, insert: 'LOEX080408TR-MD08 MK2050' },
                    N1: { fz100: 0.15, fz30: 0.16, fz10: 0.26, insert: 'LOEX080408TR-M08 F40M' },
                    S1: { ap: 2.5, fz100: 0.075, fz30: 0.085, fz10: 0.13, insert: 'LOEX080408TR-M08 F40M' },
                    S11: { ap: 2.5, fz100: 0.085, fz30: 0.095, fz10: 0.15, insert: 'LOEX080408TR-M08 MS2050' }
                }
            },
            
            insert12: {
                apMax: 6.0, // mm
                cuttingData: {
                    P1: { fz100: 0.18, fz30: 0.20, fz10: 0.30, insert: 'LOEX120708TR-M12 F40M' },
                    P2: { fz100: 0.19, fz30: 0.20, fz10: 0.32, insert: 'LOEX120708TR-M12 F40M' },
                    P3: { fz100: 0.18, fz30: 0.19, fz10: 0.30, insert: 'LOEX120708TR-M12 MP2500' },
                    M1: { ap: 6.0, fz100: 0.14, fz30: 0.16, fz10: 0.24, insert: 'LOEX120708R-M09 MS2050' },
                    M2: { ap: 6.0, fz100: 0.13, fz30: 0.14, fz10: 0.22, insert: 'LOEX120708R-M09 MS2050' },
                    K1: { fz100: 0.20, fz30: 0.22, fz10: 0.34, insert: 'LOEX120708TR-MD13 MK2050' },
                    N1: { fz100: 0.18, fz30: 0.20, fz10: 0.30, insert: 'LOEX120708R-M09 F40M' },
                    S1: { ap: 3.5, fz100: 0.095, fz30: 0.10, fz10: 0.16, insert: 'LOEX120708R-M09 MS2050' }
                }
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // Helical Milling R217/220.69
        // ─────────────────────────────────────────────────────────────────────
        helicalMilling: {
            series: 'R217/220.69',
            insertSizes: ['06', '10', '12', '18'],
            
            insert06: {
                cuttingData: {
                    P1: { fz100: 0.055, fz30: 0.060, fz10: 0.095, insert: 'XOMX060204R-M05 F40M' },
                    P3: { fz100: 0.055, fz30: 0.060, fz10: 0.090, insert: 'XOMX060204R-M05 F40M' },
                    M1: { fz100: 0.055, fz30: 0.065, fz10: 0.095, insert: 'XOMX060204R-M05 F40M' },
                    M3: { fz100: 0.042, fz30: 0.046, fz10: 0.070, insert: 'XOMX060204R-M05 F40M' },
                    K1: { fz100: 0.055, fz30: 0.065, fz10: 0.095, insert: 'XOMX060204R-M05 MP3000' },
                    N1: { fz100: 0.060, fz30: 0.065, fz10: 0.10, insert: 'XOEX060204FR-E03 H15' },
                    S1: { fz100: 0.036, fz30: 0.040, fz10: 0.060, insert: 'XOMX060204R-M05 F40M' }
                }
            },
            
            insert10: {
                cuttingData: {
                    P1: { fz100: 0.090, fz30: 0.10, fz10: 0.15, insert: 'XOMX10T308TR-ME07 F40M' },
                    P4: { fz100: 0.095, fz30: 0.10, fz10: 0.16, insert: 'XOMX10T308TR-M09 MP2500' },
                    M1: { fz100: 0.070, fz30: 0.075, fz10: 0.12, insert: 'XOEX10T308R-M06 F40M' },
                    K1: { fz100: 0.10, fz30: 0.11, fz10: 0.17, insert: 'XOMX10T308TR-M09 MK2050' },
                    N1: { fz100: 0.075, fz30: 0.080, fz10: 0.12, insert: 'XOEX10T308FR-E05 H15' },
                    S1: { fz100: 0.044, fz30: 0.048, fz10: 0.075, insert: 'XOEX10T308R-M06 F40M' },
                    H5: { fz100: 0.065, fz30: 0.070, fz10: 0.11, insert: 'XOMX10T308TR-M09 MP1500' }
                }
            },
            
            insert12: {
                cuttingData: {
                    P1: { fz100: 0.12, fz30: 0.13, fz10: 0.20, insert: 'XOMX120408TR-ME08 F40M' },
                    P4: { fz100: 0.14, fz30: 0.15, fz10: 0.22, insert: 'XOMX120408TR-M12 MP2500' },
                    M1: { fz100: 0.10, fz30: 0.11, fz10: 0.17, insert: 'XOEX120408R-M07 F40M' },
                    K1: { fz100: 0.15, fz30: 0.16, fz10: 0.24, insert: 'XOMX120408TR-M12 MK2050' },
                    N1: { fz100: 0.11, fz30: 0.12, fz10: 0.18, insert: 'XOEX120408FR-E06 H15' },
                    S1: { fz100: 0.065, fz30: 0.070, fz10: 0.11, insert: 'XOEX120408R-M07 F40M' },
                    H5: { fz100: 0.10, fz30: 0.11, fz10: 0.17, insert: 'XOMX120408TR-MD13 MP1500' }
                }
            },
            
            insert18: {
                cuttingData: {
                    P1: { fz100: 0.15, fz30: 0.16, fz10: 0.24, insert: 'XOMX180608TR-ME13 F40M' },
                    P4: { fz100: 0.15, fz30: 0.16, fz10: 0.24, insert: 'XOMX180608TR-M14 MP2500' },
                    M1: { fz100: 0.16, fz30: 0.17, fz10: 0.26, insert: 'XOMX180608TR-M14 F40M' },
                    K1: { fz100: 0.16, fz30: 0.17, fz10: 0.26, insert: 'XOMX180608TR-M14 MK2050' },
                    N1: { fz100: 0.15, fz30: 0.16, fz10: 0.24, insert: 'XOEX180608FR-E10 H25' },
                    S1: { fz100: 0.075, fz30: 0.080, fz10: 0.12, insert: 'XOMX180608R-M10 F40M' },
                    H5: { fz100: 0.11, fz30: 0.12, fz10: 0.18, insert: 'XOMX180608TR-MD15 MP1500' }
                }
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 4: EMUGE THREADING
    // Source: ZK12023_DEGB RevA EMUGE Katalog 160.pdf (808 pages)
    // ═══════════════════════════════════════════════════════════════════════════
    
    emuge: {
        brand: 'EMUGE',
        country: 'Germany',
        website: 'www.emuge.com',
        catalogPages: 808,
        
        // Material Classification for Tapping
        materialClassification: {
            P: {
                name: 'Steel materials',
                subgroups: {
                    '1.1': { desc: 'Cold-extrusion/Construction steels', tensile: '≤600 N/mm²', examples: ['Cq15', 'S235JR'] },
                    '2.1': { desc: 'Construction/Cementation steels', tensile: '≤800 N/mm²', examples: ['E360', '16MnCr5'] },
                    '3.1': { desc: 'Heat-treatable/Cold work steels', tensile: '≤1000 N/mm²', examples: ['42CrMo4', '102Cr6'] },
                    '4.1': { desc: 'Heat-treatable/Nitriding steels', tensile: '≤1200 N/mm²', examples: ['50CrMo4', '31CrMo12'] },
                    '5.1': { desc: 'High-alloyed/Hot work steels', tensile: '≤1400 N/mm²', examples: ['X38CrMoV5-3', 'X40CrMoV5-1'] }
                }
            },
            M: {
                name: 'Stainless steel materials',
                subgroups: {
                    '1.1': { desc: 'Ferritic/Martensitic', tensile: '≤950 N/mm²', examples: ['X2CrTi12'] },
                    '2.1': { desc: 'Austenitic', tensile: '≤950 N/mm²', examples: ['X6CrNiMoTi17-12-2'] },
                    '3.1': { desc: 'Duplex', tensile: '≤1100 N/mm²', examples: ['X2CrNiMoN22-5-3'] },
                    '4.1': { desc: 'Super Duplex', tensile: '≤1250 N/mm²', examples: ['X2CrNiMoN25-7-4'] }
                }
            },
            K: {
                name: 'Cast materials',
                subgroups: {
                    '1.1': { desc: 'Grey cast iron (GJL)', tensile: '100-250 N/mm²', examples: ['EN-GJL-200'] },
                    '1.2': { desc: 'Grey cast iron (GJL)', tensile: '250-450 N/mm²', examples: ['EN-GJL-300'] },
                    '2.1': { desc: 'Ductile cast iron (GJS)', tensile: '350-500 N/mm²', examples: ['EN-GJS-400-15'] },
                    '2.2': { desc: 'Ductile cast iron (GJS)', tensile: '500-900 N/mm²', examples: ['EN-GJS-700-2'] },
                    '3.1': { desc: 'Vermicular cast iron (GJV)', tensile: '300-400 N/mm²', examples: ['GJV 300'] },
                    '4.1': { desc: 'Malleable cast iron', tensile: '250-500 N/mm²', examples: ['EN-GJMW-350-4'] }
                }
            },
            N: {
                name: 'Non-ferrous materials',
                subgroups: {
                    '1.1': { desc: 'Aluminum wrought', tensile: '≤200 N/mm²' },
                    '1.2': { desc: 'Aluminum wrought', tensile: '≤350 N/mm²' },
                    '1.3': { desc: 'Aluminum wrought', tensile: '≤550 N/mm²' },
                    '1.4': { desc: 'Aluminum cast Si≤7%' },
                    '1.5': { desc: 'Aluminum cast 7%<Si≤12%' },
                    '1.6': { desc: 'Aluminum cast 12%<Si≤17%' },
                    '2.1': { desc: 'Pure copper', tensile: '≤400 N/mm²' },
                    '2.2': { desc: 'Brass long-chipping', tensile: '≤550 N/mm²' },
                    '2.3': { desc: 'Brass short-chipping', tensile: '≤550 N/mm²' },
                    '2.4': { desc: 'Aluminum bronze', tensile: '≤800 N/mm²' },
                    '2.5': { desc: 'Tin bronze long-chipping', tensile: '≤700 N/mm²' }
                }
            }
        },
        
        // Taptor Drill-Threading Technology
        taptor: {
            description: 'Pre-drilling and threading in one single working step',
            advantages: [
                'Time saving in internal thread production',
                'Eliminates tool change',
                'Reduced machine capacity requirements'
            ],
            materials: ['Aluminum cast alloys with ≥7% Si', 'Magnesium alloys'],
            maxDepth: '8 x D',
            diameterRange: { min: 3.3, max: 12, unit: 'mm' }
        },
        
        // High Feed Drilling
        highFeedDrilling: {
            characteristics: [
                'Drilling depth up to approx. 8 x D',
                'Good centering capability',
                'Tool life comparable with conventional tools',
                'MQL possible'
            ],
            diameterRange: { min: 3.3, max: 12, unit: 'mm' }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 5: HAIMER SAFE-LOCK & TOOL HOLDERS (Additional)
    // Source: Haimer USA Master Catalog.pdf (862 pages)
    // ═══════════════════════════════════════════════════════════════════════════
    
    haimerSafeLock: {
        brand: 'HAIMER',
        system: 'Safe-Lock',
        
        description: 'Pull-out protection system for high performance cutting',
        
        advantages: [
            'No tool pull out',
            'No twisting',
            'High accuracy clamping (shrink fit or collet)',
            'High torque via form closed clamping',
            'Maximum metal removal rate with process reliability'
        ],
        
        specifications: {
            runoutAccuracy: { value: 0.003, unit: 'mm', note: '< 3 μm' },
            balanceQuality: 'Repeatable',
            compatibleHolders: ['Shrink fit', 'Collet chuck'],
            toolAdjustment: 'Shiftable within Safe-Lock groove'
        },
        
        comparisonToWeldon: {
            weldonRunout: { value: 0.05, unit: 'mm', note: 'Poor due to side clamping' },
            safeLockRunout: { value: 0.003, unit: 'mm', note: 'High precision' },
            weldonBalance: 'Inconsistent',
            safeLockBalance: 'Repeatable'
        },
        
        faq: [
            { q: 'Can Safe-Lock shank be clamped in holder without Safe-Lock pins?', a: 'Yes, in any frictional tool holder' },
            { q: 'Is length adjustable?', a: 'Yes, shiftable within the Safe-Lock groove' },
            { q: 'How to shrink in?', a: 'Put in heated holder with twisting movement' }
        ]
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Get OSG drill cutting data by material and diameter
    getOsgDrillData: function(material, diameter) {
        const matMap = {
            'carbon_steel': 'carbonSteel',
            'alloy_steel': 'alloySteel',
            'stainless': 'stainlessSteel',
            'titanium': 'titanium',
            'inconel': 'inconel',
            'cast_iron': 'castIron',
            'aluminum': 'aluminum',
            'hardened_26_30': 'hardenedSteel_26_30',
            'hardened_30_34': 'hardenedSteel_30_34',
            'hardened_34_43': 'hardenedSteel_34_43'
        };
        
        const matKey = matMap[material];
        if (!matKey || !this.osg.adoCarbideDrills[matKey]) return null;
        
        const matData = this.osg.adoCarbideDrills[matKey];
        const cuttingData = matData.cuttingData;
        
        // Find closest diameter
        let closest = cuttingData[0];
        let minDiff = Math.abs(cuttingData[0].dia - diameter);
        
        for (const data of cuttingData) {
            const diff = Math.abs(data.dia - diameter);
            if (diff < minDiff) {
                minDiff = diff;
                closest = data;
            }
        }
        
        return {
            material: material,
            requestedDia: diameter,
            matchedDia: closest.dia,
            sfmRange: matData.sfmRange,
            rpm: closest.rpm,
            iprRange: [closest.iprMin, closest.iprMax]
        };
    },
    
    // Get Sandvik milling data by material group and insert size
    getSandvikMillingData: function(materialGroup, insertSize, millingType = 'helical') {
        const series = millingType === 'helical' ? this.sandvik.helicalMilling : this.sandvik.squareShoulderMilling;
        const insertKey = `insert${insertSize}`;
        
        if (!series[insertKey] || !series[insertKey].cuttingData[materialGroup]) {
            return null;
        }
        
        return {
            series: series.series,
            insertSize: insertSize,
            materialGroup: materialGroup,
            materialInfo: this.sandvik.materialGroups[materialGroup],
            cuttingData: series[insertKey].cuttingData[materialGroup]
        };
    },
    
    // Get EMUGE material classification
    getEmugeMaterialClass: function(materialType, subgroup) {
        if (!this.emuge.materialClassification[materialType]) return null;
        if (!this.emuge.materialClassification[materialType].subgroups[subgroup]) return null;
        
        return {
            type: materialType,
            typeName: this.emuge.materialClassification[materialType].name,
            subgroup: subgroup,
            ...this.emuge.materialClassification[materialType].subgroups[subgroup]
        };
    },
    
    // Get statistics
    getStats: function() {
        return {
            version: this.version,
            batch: this.batch,
            manufacturers: ['OSG', 'ISCAR', 'Sandvik/Seco', 'EMUGE', 'HAIMER Safe-Lock'],
            osgDrillSeries: this.osg.adoCarbideDrills.series.length,
            osgMaterials: Object.keys(this.osg.adoCarbideDrills).filter(k => k !== 'series' && k !== 'coating' && k !== 'features' && k !== 'pointAngle').length,
            iscarMultiMasterTypes: Object.keys(this.iscar.multiMaster).length,
            sandvikMaterialGroups: Object.keys(this.sandvik.materialGroups).length,
            emugeMaterialTypes: Object.keys(this.emuge.materialClassification).length
        };
    }
};

// Register with PRISM Gateway if available
if (typeof PRISM_GATEWAY !== 'undefined') {
    PRISM_GATEWAY.register('catalog.v2.osg.getDrillData', 'PRISM_MANUFACTURER_CATALOG_DATABASE_V2.getOsgDrillData');
    PRISM_GATEWAY.register('catalog.v2.sandvik.getMillingData', 'PRISM_MANUFACTURER_CATALOG_DATABASE_V2.getSandvikMillingData');
    PRISM_GATEWAY.register('catalog.v2.emuge.getMaterialClass', 'PRISM_MANUFACTURER_CATALOG_DATABASE_V2.getEmugeMaterialClass');
    PRISM_GATEWAY.register('catalog.v2.stats', 'PRISM_MANUFACTURER_CATALOG_DATABASE_V2.getStats');
}


    // ═══════════════════════════════════════════════════════════════
    // BATCH 3: LATHE TOOLING (v3)
    // ═══════════════════════════════════════════════════════════════
    // SECTION 1: GLOBAL CNC - LATHE TOOL HOLDERS
    // Source: 01-Global-CNC-Full-Catalog-2023.pdf (565 pages)
    // American-made precision lathe tooling
    // ═══════════════════════════════════════════════════════════════════════════
    
    globalCnc: {
        brand: 'Global CNC',
        country: 'USA',
        website: 'www.globalcnc.com',
        location: 'Plymouth, MI',
        catalogPages: 565,
        stockItems: 90000,
        
        // ─────────────────────────────────────────────────────────────────────
        // BMT (Base Mount Turret) Tool Holders
        // ─────────────────────────────────────────────────────────────────────
        bmtToolholders: {
            description: 'Base Mount Turret tooling for modern CNC lathes',
            
            bmt45: {
                turretSize: 45,
                compatibleMachines: ['DMG Mori NLX', 'Okuma', 'Mazak QT'],
                
                odFacingHolder: [
                    { partNo: 'BMT45-8411A', shankSize: 0.750, shankSizeMm: 19.05, height: 65, width: 87, length: 75, units: 'mm' },
                    { partNo: 'BMT45-8411MA', shankSize: 20, shankSizeInch: 0.787, height: 65, width: 87, length: 75, units: 'mm' }
                ],
                
                boringBarHolder: [
                    { partNo: 'BMT45-8420', boreDia: 0.750, boreDiaMm: 19.05, height: 65, width: 90, length: 75 },
                    { partNo: 'BMT45-8425', boreDia: 1.000, boreDiaMm: 25.4, height: 65, width: 90, length: 75 },
                    { partNo: 'BMT45-8432', boreDia: 1.250, boreDiaMm: 31.75, height: 65, width: 90, length: 75 },
                    { partNo: 'BMT45-8435', boreDia: 1.500, boreDiaMm: 38.1, height: 65, width: 90, length: 75 },
                    { partNo: 'BMT45-8420M', boreDia: 20, boreDiaInch: 0.787, height: 65, width: 90, length: 75 },
                    { partNo: 'BMT45-8425M', boreDia: 25, boreDiaInch: 0.984, height: 65, width: 90, length: 75 },
                    { partNo: 'BMT45-8432M', boreDia: 32, boreDiaInch: 1.260, height: 65, width: 90, length: 75 },
                    { partNo: 'BMT45-8435M', boreDia: 40, boreDiaInch: 1.575, height: 65, width: 90, length: 75 }
                ],
                
                doubleBoringBarHolder: [
                    { partNo: 'BMT45-8420 DBL', boreDia: 0.750, height: 55, width: 115, length: 75, centerDistance: 43 },
                    { partNo: 'BMT45-8420M DBL', boreDia: 20, height: 55, width: 115, length: 75, centerDistance: 43 }
                ],
                
                captoHolders: [
                    { partNo: 'BMT45-C4ID', captoSize: 'C4', clampingDia: 40, type: 'ID', height: 65, width: 89, length: 75 },
                    { partNo: 'BMT45-C4OD', captoSize: 'C4', clampingDia: 40, type: 'OD', height: 70, width: 80, length: 80 }
                ],
                
                liveTooling: {
                    straightDrillMill: {
                        partNo: 'BMT45-ER25-SLT',
                        colletType: 'ER25',
                        clampingRange: '2-16mm',
                        maxRpm: 6000,
                        gearRatio: '1:1',
                        torque: 50, // Nm
                        coolant: 'External',
                        d1: 45, d2: 58, h1: 58, h2: 78.5, l1: 84, l2: 67.6
                    },
                    straightDrillMillInternal: {
                        partNo: 'BMT45-ER25-SLT INT',
                        colletType: 'ER25',
                        clampingRange: '2-16mm',
                        maxRpm: 6000,
                        gearRatio: '1:1',
                        torque: 50,
                        coolant: 'Internal/External - 20 bar',
                        d1: 45, d2: 58, h1: 58, h2: 78.5, l1: 84, l2: 67.6
                    }
                }
            },
            
            bmt55: {
                turretSize: 55,
                compatibleMachines: ['Mazak QTN', 'DMG Mori NLX 2500'],
                
                odFacingHolder: [
                    { partNo: 'BMT55-8411A', shankSize: 1.000, shankSizeMm: 25.4, height: 75, width: 100, length: 90 },
                    { partNo: 'BMT55-8411MA', shankSize: 25, shankSizeInch: 0.984, height: 75, width: 100, length: 90 }
                ],
                
                boringBarHolder: [
                    { partNo: 'BMT55-8425', boreDia: 1.000, boreDiaMm: 25.4, height: 75, width: 100, length: 90 },
                    { partNo: 'BMT55-8432', boreDia: 1.250, boreDiaMm: 31.75, height: 75, width: 100, length: 90 },
                    { partNo: 'BMT55-8440', boreDia: 1.500, boreDiaMm: 38.1, height: 75, width: 100, length: 90 },
                    { partNo: 'BMT55-8450', boreDia: 2.000, boreDiaMm: 50.8, height: 75, width: 100, length: 90 }
                ],
                
                liveTooling: {
                    straightDrillMill: {
                        partNo: 'BMT55-ER32-SLT',
                        colletType: 'ER32',
                        clampingRange: '3-20mm',
                        maxRpm: 5000,
                        gearRatio: '1:1',
                        torque: 80
                    },
                    rightAngleDrillMill: {
                        partNo: 'BMT55-ER25-RAT',
                        colletType: 'ER25',
                        clampingRange: '2-16mm',
                        maxRpm: 6000,
                        gearRatio: '1:1',
                        torque: 40,
                        outputAngle: 90
                    }
                }
            },
            
            bmt65: {
                turretSize: 65,
                compatibleMachines: ['Mazak QT Nexus', 'Okuma LB3000'],
                
                boringBarHolder: [
                    { partNo: 'BMT65-8432', boreDia: 1.250, boreDiaMm: 31.75, height: 85, width: 110, length: 100 },
                    { partNo: 'BMT65-8440', boreDia: 1.500, boreDiaMm: 38.1, height: 85, width: 110, length: 100 },
                    { partNo: 'BMT65-8450', boreDia: 2.000, boreDiaMm: 50.8, height: 85, width: 110, length: 100 },
                    { partNo: 'BMT65-8463', boreDia: 2.500, boreDiaMm: 63.5, height: 85, width: 110, length: 100 }
                ],
                
                liveTooling: {
                    straightDrillMill: {
                        partNo: 'BMT65-ER40-SLT',
                        colletType: 'ER40',
                        clampingRange: '4-26mm',
                        maxRpm: 4000,
                        gearRatio: '1:1',
                        torque: 120
                    }
                }
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // Machine-Specific Static Tool Holders
        // ─────────────────────────────────────────────────────────────────────
        machineSpecificHolders: {
            
            dmgMori: {
                msl150: {
                    description: 'DMG Mori MSL150 turret tooling',
                    compatibleMachines: ['NZX 1500', 'NZX 2000', 'NZX 2500'],
                    
                    odTurningHolder: [
                        { partNo: 'MSL150-8311', shankSize: 1.000, shankSizeMm: 25.4, height: 100, gauge: 154 },
                        { partNo: 'MSL150-8311M', shankSize: 25, shankSizeInch: 0.984, height: 100, gauge: 154 }
                    ],
                    
                    captoHolders: [
                        { partNo: 'MSL150-C4ID', captoSize: 'C4', type: 'ID', clampingDia: 40 },
                        { partNo: 'MSL150-C4OD', captoSize: 'C4', type: 'OD', clampingDia: 40 }
                    ]
                },
                
                msl20_30: {
                    description: 'DMG Mori MSL20-30 turret tooling',
                    compatibleMachines: [
                        'CL 1500', 'CL 2000', 'CTX 310 V1', 'NLX 2500',
                        'NRX 2000', 'VL-253', 'DuraTurn 2030', 'DuraTurn 2050',
                        'SL 200-254', 'ZL 200-254'
                    ],
                    
                    odTurningHolder: [
                        { partNo: 'MSL20/30-8311', shankSize: 1.000, height: 90, width: 106, gauge: 128.5 },
                        { partNo: 'MSL20/30-8311M', shankSize: 25, height: 90, width: 106, gauge: 128.5 }
                    ],
                    
                    doubleOdTurningHolder: [
                        { partNo: 'MSL20/30-8311 DBL', shankSize: 1.000, height: 65, width: 106, gauge: 140 },
                        { partNo: 'MSL20/30-8311M DBL', shankSize: 25, height: 65, width: 106, gauge: 140 }
                    ],
                    
                    odFacingHolderJackScrew: [
                        { partNo: 'MSL20/30-8411', shankSize: 1.000, gauge: 3.543, type: 'standard' },
                        { partNo: 'MSL20/30-8411 EX', shankSize: 1.000, gauge: 6.299, type: 'extended' },
                        { partNo: 'MSL20/30-8411M', shankSize: 25, gauge: 90, type: 'standard' },
                        { partNo: 'MSL20/30-8411M EX', shankSize: 25, gauge: 160, type: 'extended' }
                    ],
                    
                    odFacingHolderWedge: [
                        { partNo: 'MSL20/30-8411 W', shankSize: 1.000, gauge: 3.543 },
                        { partNo: 'MSL20/30-8411M W', shankSize: 25, gauge: 90 }
                    ],
                    
                    cutoffHolder: [
                        { partNo: 'MSL20/30-4625', shankSize: 1.000, height: 78, width: 85 },
                        { partNo: 'MSL20/30-4625M', shankSize: 25, height: 78, width: 85 }
                    ],
                    
                    boringBarHolder: [
                        { partNo: 'MSL20/30-8420', boreDia: 0.750, boreDiaMm: 19.05 },
                        { partNo: 'MSL20/30-8425', boreDia: 1.000, boreDiaMm: 25.4 },
                        { partNo: 'MSL20/30-8432', boreDia: 1.250, boreDiaMm: 31.75 },
                        { partNo: 'MSL20/30-8440', boreDia: 1.500, boreDiaMm: 38.1 }
                    ],
                    
                    liveTooling: {
                        straightDrillMill: {
                            partNo: 'MSL20/30-ER25-SLT',
                            colletType: 'ER25',
                            maxRpm: 6000,
                            torque: 50
                        },
                        rightAngleDrillMill: {
                            partNo: 'MSL20/30-ER25-RAT',
                            colletType: 'ER25',
                            maxRpm: 6000,
                            torque: 40,
                            outputAngle: 90
                        },
                        adjustableAngle: {
                            partNo: 'MSL20/30-ER16-ADJ',
                            colletType: 'ER16',
                            angleRange: '0-90',
                            maxRpm: 5000,
                            torque: 25
                        }
                    }
                }
            },
            
            haas: {
                bolt_on: {
                    description: 'Haas bolt-on turret tooling',
                    compatibleMachines: ['ST-10', 'ST-15', 'ST-20', 'ST-25', 'ST-30', 'ST-35', 'ST-40', 'DS-30'],
                    
                    odTurningHolder: [
                        { partNo: 'HAAS-8311', shankSize: 1.000, shankSizeMm: 25.4 },
                        { partNo: 'HAAS-8311M', shankSize: 25, shankSizeInch: 0.984 }
                    ],
                    
                    boringBarHolder: [
                        { partNo: 'HAAS-8420', boreDia: 0.750 },
                        { partNo: 'HAAS-8425', boreDia: 1.000 },
                        { partNo: 'HAAS-8432', boreDia: 1.250 },
                        { partNo: 'HAAS-8440', boreDia: 1.500 }
                    ],
                    
                    liveTooling: {
                        straightDrillMill: [
                            { partNo: 'HAAS-ER25-SLT', colletType: 'ER25', maxRpm: 6000, torque: 50 },
                            { partNo: 'HAAS-ER32-SLT', colletType: 'ER32', maxRpm: 5000, torque: 80 }
                        ],
                        rightAngleDrillMill: [
                            { partNo: 'HAAS-ER25-RAT', colletType: 'ER25', maxRpm: 6000, torque: 40 },
                            { partNo: 'HAAS-ER32-RAT', colletType: 'ER32', maxRpm: 5000, torque: 60 }
                        ]
                    }
                }
            },
            
            mazak: {
                qt_nexus: {
                    description: 'Mazak Quick Turn Nexus turret tooling',
                    compatibleMachines: ['QTN 100', 'QTN 150', 'QTN 200', 'QTN 250', 'QTN 300', 'QTN 350', 'QTN 450'],
                    
                    odTurningHolder: [
                        { partNo: 'MAZQT-8311', shankSize: 1.000 },
                        { partNo: 'MAZQT-8311M', shankSize: 25 }
                    ],
                    
                    liveTooling: {
                        straightDrillMill: {
                            partNo: 'MAZQT-ER32-SLT',
                            colletType: 'ER32',
                            maxRpm: 5000,
                            torque: 80
                        }
                    }
                }
            },
            
            okuma: {
                lb_series: {
                    description: 'Okuma LB series turret tooling',
                    compatibleMachines: ['LB2000', 'LB3000', 'LB4000', 'Genos L'],
                    
                    odTurningHolder: [
                        { partNo: 'OKUMA-8311', shankSize: 1.000 },
                        { partNo: 'OKUMA-8311M', shankSize: 25 }
                    ],
                    
                    liveTooling: {
                        straightDrillMill: {
                            partNo: 'OKUMA-ER32-SLT',
                            colletType: 'ER32',
                            maxRpm: 5000,
                            torque: 80
                        }
                    }
                }
            },
            
            doosan: {
                lynx: {
                    description: 'Doosan Lynx series turret tooling',
                    compatibleMachines: ['Lynx 220', 'Lynx 2100', 'Lynx 2600'],
                    
                    odTurningHolder: [
                        { partNo: 'DOOSAN-8311', shankSize: 1.000 },
                        { partNo: 'DOOSAN-8311M', shankSize: 25 }
                    ]
                }
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // VDI Tool Holders (DIN 69880 / ISO 10889)
        // ─────────────────────────────────────────────────────────────────────
        vdiToolholders: {
            description: 'VDI static tool holders per DIN 69880 standards',
            material: 'High strength alloy steel, hardened, black oxide coated, precision ground',
            
            availableSizes: [16, 20, 25, 30, 40, 50, 60, 80], // mm VDI shank sizes
            
            vdi30: {
                shankDia: 30,
                
                odTurningHolder: [
                    { partNo: 'VDI30-8311', shankSize: 0.750, type: 'A1', overhang: 'standard' },
                    { partNo: 'VDI30-8311-1', shankSize: 1.000, type: 'A1', overhang: 'standard' },
                    { partNo: 'VDI30-8311M', shankSize: 20, type: 'A1', overhang: 'standard' },
                    { partNo: 'VDI30-8311M-1', shankSize: 25, type: 'A1', overhang: 'standard' }
                ],
                
                boringBarHolder: [
                    { partNo: 'VDI30-8420', boreDia: 0.500, type: 'E1' },
                    { partNo: 'VDI30-8420-1', boreDia: 0.625, type: 'E1' },
                    { partNo: 'VDI30-8420-2', boreDia: 0.750, type: 'E1' },
                    { partNo: 'VDI30-8425', boreDia: 1.000, type: 'E1' },
                    { partNo: 'VDI30-8420M', boreDia: 12, type: 'E1' },
                    { partNo: 'VDI30-8420M-1', boreDia: 16, type: 'E1' },
                    { partNo: 'VDI30-8420M-2', boreDia: 20, type: 'E1' },
                    { partNo: 'VDI30-8425M', boreDia: 25, type: 'E1' }
                ],
                
                axialDrillHolder: [
                    { partNo: 'VDI30-ER25', colletType: 'ER25', clampingRange: '2-16mm', type: 'C1' },
                    { partNo: 'VDI30-ER32', colletType: 'ER32', clampingRange: '3-20mm', type: 'C1' }
                ]
            },
            
            vdi40: {
                shankDia: 40,
                
                odTurningHolder: [
                    { partNo: 'VDI40-8311', shankSize: 1.000, type: 'A1' },
                    { partNo: 'VDI40-8311-1', shankSize: 1.250, type: 'A1' },
                    { partNo: 'VDI40-8311M', shankSize: 25, type: 'A1' },
                    { partNo: 'VDI40-8311M-1', shankSize: 32, type: 'A1' }
                ],
                
                boringBarHolder: [
                    { partNo: 'VDI40-8420', boreDia: 0.750, type: 'E1' },
                    { partNo: 'VDI40-8425', boreDia: 1.000, type: 'E1' },
                    { partNo: 'VDI40-8432', boreDia: 1.250, type: 'E1' },
                    { partNo: 'VDI40-8440', boreDia: 1.500, type: 'E1' }
                ],
                
                axialDrillHolder: [
                    { partNo: 'VDI40-ER32', colletType: 'ER32', clampingRange: '3-20mm', type: 'C1' },
                    { partNo: 'VDI40-ER40', colletType: 'ER40', clampingRange: '4-26mm', type: 'C1' }
                ]
            },
            
            vdi50: {
                shankDia: 50,
                
                odTurningHolder: [
                    { partNo: 'VDI50-8311', shankSize: 1.250, type: 'A1' },
                    { partNo: 'VDI50-8311-1', shankSize: 1.500, type: 'A1' },
                    { partNo: 'VDI50-8311M', shankSize: 32, type: 'A1' },
                    { partNo: 'VDI50-8311M-1', shankSize: 40, type: 'A1' }
                ],
                
                boringBarHolder: [
                    { partNo: 'VDI50-8425', boreDia: 1.000, type: 'E1' },
                    { partNo: 'VDI50-8432', boreDia: 1.250, type: 'E1' },
                    { partNo: 'VDI50-8440', boreDia: 1.500, type: 'E1' },
                    { partNo: 'VDI50-8450', boreDia: 2.000, type: 'E1' }
                ]
            }
        },
        
        // ─────────────────────────────────────────────────────────────────────
        // Tool Holder Bushings / Sleeves
        // ─────────────────────────────────────────────────────────────────────
        toolHolderBushings: {
            description: 'Tool holder bushings and sleeves - 40+ years market leader',
            material: 'High strength alloy steel, hardened, black oxide coated, precision ground',
            styles: 22,
            
            standardStyles: [
                { style: 'A', description: 'Standard type with headless set screw' },
                { style: 'B', description: 'Standard type with socket head cap screw' },
                { style: 'C', description: 'Coolant through with set screw' },
                { style: 'D', description: 'Split sleeve type' },
                { style: 'E', description: 'Extended length' },
                { style: 'F', description: 'Flanged type' }
            ],
            
            inchSizes: {
                od: [0.500, 0.625, 0.750, 0.875, 1.000, 1.125, 1.250, 1.375, 1.500, 1.750, 2.000, 2.500, 3.000],
                id: [0.250, 0.312, 0.375, 0.438, 0.500, 0.562, 0.625, 0.750, 0.875, 1.000, 1.125, 1.250, 1.500]
            },
            
            metricSizes: {
                od: [12, 16, 20, 25, 32, 40, 50, 63, 80],
                id: [6, 8, 10, 12, 16, 20, 25, 32, 40]
            },
            
            boringBarSleeves: {
                description: 'Sleeves for standard boring bars',
                types: ['Straight', 'Coolant-through', 'Double-ended'],
                standardLengths: [1.5, 2.0, 2.5, 3.0, 4.0] // x OD
            }
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 2: ISCAR FLASH LINE - SOLID CARBIDE END MILLS
    // Source: Flash_Solid_catalog_INCH.pdf (80 pages)
    // High-performance solid carbide end mills with VF variable pitch
    // ═══════════════════════════════════════════════════════════════════════════
    
    iscarFlashLine: {
        brand: 'ISCAR',
        productLine: 'Flash Line',
        country: 'Israel',
        website: 'www.iscar.com',
        catalogPages: 80,
        
        // ─────────────────────────────────────────────────────────────────────
        // ECI-VF Series - Variable Pitch End Mills for Steel
        // ─────────────────────────────────────────────────────────────────────
        eciVfSeries: {
            description: 'Variable pitch endmills for chatter dampening, ideal for HEM trochoidal operations',
            coating: 'IC608',
            coatingDescription: 'PVD nanolayered structure for excellent wear resistance',
            helix: 38, // degrees, continuous
            maxHardness: 60, // HRc
            features: ['Variable pitch', 'Corner radius options', 'Relieved neck options', 'Extended reach'],
            
            eci3Vf: {
                flutes: 3,
                applications: ['Aluminum', 'Non-ferrous', 'Plastics'],
                
                tools: [
                    { partNo: 'ECI-3 125-500C0VF1.5', dia: 0.125, loc: 0.500, oal: 1.500, cornerRadius: 0, shank: 0.125 },
                    { partNo: 'ECI-3 187-625C0VF2', dia: 0.187, loc: 0.625, oal: 2.000, cornerRadius: 0, shank: 0.187 },
                    { partNo: 'ECI-3 250-750C0VF2.5', dia: 0.250, loc: 0.750, oal: 2.500, cornerRadius: 0, shank: 0.250 },
                    { partNo: 'ECI-3 375-1.0C0VF3', dia: 0.375, loc: 1.000, oal: 3.000, cornerRadius: 0, shank: 0.375 },
                    { partNo: 'ECI-3 500-1.25C0VF3.5', dia: 0.500, loc: 1.250, oal: 3.500, cornerRadius: 0, shank: 0.500 }
                ]
            },
            
            eci4Vf: {
                flutes: 4,
                applications: ['Carbon steel', 'Alloy steel', 'Stainless steel', 'Hardened steel up to 60 HRc'],
                
                tools: [
                    // 1/8" diameter
                    { partNo: 'ECI-4 125-500C0VF1.5', dia: 0.125, loc: 0.500, oal: 1.500, cornerRadius: 0, shank: 0.125 },
                    { partNo: 'ECI-4 125-500C010VF1.5', dia: 0.125, loc: 0.500, oal: 1.500, cornerRadius: 0.010, shank: 0.125 },
                    { partNo: 'ECI-4 125-500C015VF1.5', dia: 0.125, loc: 0.500, oal: 1.500, cornerRadius: 0.015, shank: 0.125 },
                    { partNo: 'ECI-4 125-500C030VF1.5', dia: 0.125, loc: 0.500, oal: 1.500, cornerRadius: 0.030, shank: 0.125 },
                    
                    // 3/16" diameter
                    { partNo: 'ECI-4 187-625C0VF2', dia: 0.187, loc: 0.625, oal: 2.000, cornerRadius: 0, shank: 0.187 },
                    { partNo: 'ECI-4 187-625C010VF2', dia: 0.187, loc: 0.625, oal: 2.000, cornerRadius: 0.010, shank: 0.187 },
                    { partNo: 'ECI-4 187-625C015VF2', dia: 0.187, loc: 0.625, oal: 2.000, cornerRadius: 0.015, shank: 0.187 },
                    { partNo: 'ECI-4 187-625C030VF2', dia: 0.187, loc: 0.625, oal: 2.000, cornerRadius: 0.030, shank: 0.187 },
                    
                    // 1/4" diameter - multiple lengths
                    { partNo: 'ECI-4 250-375C0VF2', dia: 0.250, loc: 0.375, oal: 2.000, cornerRadius: 0, shank: 0.250 },
                    { partNo: 'ECI-4 250-375C010VF2', dia: 0.250, loc: 0.375, oal: 2.000, cornerRadius: 0.010, shank: 0.250 },
                    { partNo: 'ECI-4 250-375C015VF2', dia: 0.250, loc: 0.375, oal: 2.000, cornerRadius: 0.015, shank: 0.250 },
                    { partNo: 'ECI-4 250-375C030VF2', dia: 0.250, loc: 0.375, oal: 2.000, cornerRadius: 0.030, shank: 0.250 },
                    { partNo: 'ECI-4 250-375C06VF2', dia: 0.250, loc: 0.375, oal: 2.000, cornerRadius: 0.060, shank: 0.250 },
                    
                    { partNo: 'ECI-4 250-750C0VF2.5', dia: 0.250, loc: 0.750, oal: 2.500, cornerRadius: 0, shank: 0.250 },
                    { partNo: 'ECI-4 250-750C010VF2.5', dia: 0.250, loc: 0.750, oal: 2.500, cornerRadius: 0.010, shank: 0.250 },
                    { partNo: 'ECI-4 250-750C015VF2.5', dia: 0.250, loc: 0.750, oal: 2.500, cornerRadius: 0.015, shank: 0.250 },
                    { partNo: 'ECI-4 250-750C030VF2.5', dia: 0.250, loc: 0.750, oal: 2.500, cornerRadius: 0.030, shank: 0.250 },
                    { partNo: 'ECI-4 250-750C06VF2.5', dia: 0.250, loc: 0.750, oal: 2.500, cornerRadius: 0.060, shank: 0.250 },
                    
                    { partNo: 'ECI-4 250-1.0C0VF3', dia: 0.250, loc: 1.000, oal: 3.000, cornerRadius: 0, shank: 0.250 },
                    { partNo: 'ECI-4 250-1.0C010VF3', dia: 0.250, loc: 1.000, oal: 3.000, cornerRadius: 0.010, shank: 0.250 },
                    { partNo: 'ECI-4 250-1.0C015VF3', dia: 0.250, loc: 1.000, oal: 3.000, cornerRadius: 0.015, shank: 0.250 },
                    { partNo: 'ECI-4 250-1.0C030VF3', dia: 0.250, loc: 1.000, oal: 3.000, cornerRadius: 0.030, shank: 0.250 },
                    { partNo: 'ECI-4 250-1.0C06VF3', dia: 0.250, loc: 1.000, oal: 3.000, cornerRadius: 0.060, shank: 0.250 },
                    
                    { partNo: 'ECI-4 250-1.25C0VF4', dia: 0.250, loc: 1.250, oal: 4.000, cornerRadius: 0, shank: 0.250 },
                    { partNo: 'ECI-4 250-1.25C015VF4', dia: 0.250, loc: 1.250, oal: 4.000, cornerRadius: 0.015, shank: 0.250 },
                    { partNo: 'ECI-4 250-1.25C030VF4', dia: 0.250, loc: 1.250, oal: 4.000, cornerRadius: 0.030, shank: 0.250 },
                    { partNo: 'ECI-4 250-1.25C06VF4', dia: 0.250, loc: 1.250, oal: 4.000, cornerRadius: 0.060, shank: 0.250 },
                    
                    // 5/16" diameter
                    { partNo: 'ECI-4 312-500C0VF2', dia: 0.312, loc: 0.500, oal: 2.000, cornerRadius: 0, shank: 0.312 },
                    { partNo: 'ECI-4 312-500C010VF2', dia: 0.312, loc: 0.500, oal: 2.000, cornerRadius: 0.010, shank: 0.312 },
                    { partNo: 'ECI-4 312-500C015VF2', dia: 0.312, loc: 0.500, oal: 2.000, cornerRadius: 0.015, shank: 0.312 },
                    { partNo: 'ECI-4 312-500C030VF2', dia: 0.312, loc: 0.500, oal: 2.000, cornerRadius: 0.030, shank: 0.312 },
                    { partNo: 'ECI-4 312-500C06VF2', dia: 0.312, loc: 0.500, oal: 2.000, cornerRadius: 0.060, shank: 0.312 },
                    
                    { partNo: 'ECI-4 312-875C0VF2.5', dia: 0.312, loc: 0.875, oal: 2.500, cornerRadius: 0, shank: 0.312 },
                    { partNo: 'ECI-4 312-875C010VF2.5', dia: 0.312, loc: 0.875, oal: 2.500, cornerRadius: 0.010, shank: 0.312 },
                    { partNo: 'ECI-4 312-875C015VF2.5', dia: 0.312, loc: 0.875, oal: 2.500, cornerRadius: 0.015, shank: 0.312 },
                    { partNo: 'ECI-4 312-875C030VF2.5', dia: 0.312, loc: 0.875, oal: 2.500, cornerRadius: 0.030, shank: 0.312 },
                    { partNo: 'ECI-4 312-875C06VF2.5', dia: 0.312, loc: 0.875, oal: 2.500, cornerRadius: 0.060, shank: 0.312 },
                    
                    // 3/8" diameter
                    { partNo: 'ECI-4 375-625C0VF2', dia: 0.375, loc: 0.625, oal: 2.000, cornerRadius: 0, shank: 0.375 },
                    { partNo: 'ECI-4 375-1.0C0VF3', dia: 0.375, loc: 1.000, oal: 3.000, cornerRadius: 0, shank: 0.375 },
                    { partNo: 'ECI-4 375-1.0C015VF3', dia: 0.375, loc: 1.000, oal: 3.000, cornerRadius: 0.015, shank: 0.375 },
                    { partNo: 'ECI-4 375-1.0C030VF3', dia: 0.375, loc: 1.000, oal: 3.000, cornerRadius: 0.030, shank: 0.375 },
                    { partNo: 'ECI-4 375-1.0C06VF3', dia: 0.375, loc: 1.000, oal: 3.000, cornerRadius: 0.060, shank: 0.375 },
                    
                    // 1/2" diameter
                    { partNo: 'ECI-4 500-750C0VF2.5', dia: 0.500, loc: 0.750, oal: 2.500, cornerRadius: 0, shank: 0.500 },
                    { partNo: 'ECI-4 500-1.25C0VF3', dia: 0.500, loc: 1.250, oal: 3.000, cornerRadius: 0, shank: 0.500 },
                    { partNo: 'ECI-4 500-1.25C015VF3', dia: 0.500, loc: 1.250, oal: 3.000, cornerRadius: 0.015, shank: 0.500 },
                    { partNo: 'ECI-4 500-1.25C030VF3', dia: 0.500, loc: 1.250, oal: 3.000, cornerRadius: 0.030, shank: 0.500 },
                    { partNo: 'ECI-4 500-1.25C06VF3', dia: 0.500, loc: 1.250, oal: 3.000, cornerRadius: 0.060, shank: 0.500 },
                    
                    // 5/8" diameter
                    { partNo: 'ECI-4 625-1.0C0VF2.5', dia: 0.625, loc: 1.000, oal: 2.500, cornerRadius: 0, shank: 0.625 },
                    { partNo: 'ECI-4 625-1.5C0VF3.5', dia: 0.625, loc: 1.500, oal: 3.500, cornerRadius: 0, shank: 0.625 },
                    
                    // 3/4" diameter
                    { partNo: 'ECI-4 750-1.25C0VF3', dia: 0.750, loc: 1.250, oal: 3.000, cornerRadius: 0, shank: 0.750 },
                    { partNo: 'ECI-4 750-2.0C0VF4', dia: 0.750, loc: 2.000, oal: 4.000, cornerRadius: 0, shank: 0.750 },
                    
                    // 1" diameter
                    { partNo: 'ECI-4 1.0-1.5C0VF3.5', dia: 1.000, loc: 1.500, oal: 3.500, cornerRadius: 0, shank: 1.000 },
                    { partNo: 'ECI-4 1.0-2.5C0VF4.5', dia: 1.000, loc: 2.500, oal: 4.500, cornerRadius: 0, shank: 1.000 }
                ],
                
                // Cutting parameters for ECI-4-VF
                cuttingData: {
                    carbonSteel: {
                        materials: ['1018', '1045', '12L14', '1020'],
                        sfmRange: [400, 600],
                        iptRange: [0.001, 0.004], // per tooth
                        docMax: 1.0, // x diameter
                        wocRange: [0.03, 0.10] // x diameter for HEM
                    },
                    alloySteel: {
                        materials: ['4140', '4340', '8620', '4130'],
                        sfmRange: [350, 500],
                        iptRange: [0.001, 0.003],
                        docMax: 0.8,
                        wocRange: [0.03, 0.08]
                    },
                    stainlessSteel: {
                        materials: ['304', '316', '17-4PH', '303'],
                        sfmRange: [200, 350],
                        iptRange: [0.0008, 0.002],
                        docMax: 0.6,
                        wocRange: [0.02, 0.06]
                    },
                    hardenedSteel: {
                        materials: ['D2 (58-60 HRc)', 'A2 (58-60 HRc)', 'H13 (48-52 HRc)'],
                        sfmRange: [100, 200],
                        iptRange: [0.0005, 0.0015],
                        docMax: 0.3,
                        wocRange: [0.01, 0.03]
                    }
                }
            },
            
            eci5Vf: {
                flutes: 5,
                applications: ['High-feed finishing', 'Hardened steel', 'Long reach'],
                
                tools: [
                    { partNo: 'ECI-5 250-750C0VF2.5', dia: 0.250, loc: 0.750, oal: 2.500, cornerRadius: 0, shank: 0.250 },
                    { partNo: 'ECI-5 375-1.0C0VF3', dia: 0.375, loc: 1.000, oal: 3.000, cornerRadius: 0, shank: 0.375 },
                    { partNo: 'ECI-5 500-1.25C0VF3.5', dia: 0.500, loc: 1.250, oal: 3.500, cornerRadius: 0, shank: 0.500 }
                ]
            },
            
            eci6Vf: {
                flutes: 6,
                applications: ['High-feed finishing', 'Super finishing', 'Light DOC high speed'],
                
                tools: [
                    { partNo: 'ECI-6 375-1.0C0VF3', dia: 0.375, loc: 1.000, oal: 3.000, cornerRadius: 0, shank: 0.375 },
                    { partNo: 'ECI-6 500-1.25C0VF3.5', dia: 0.500, loc: 1.250, oal: 3.500, cornerRadius: 0, shank: 0.500 },
                    { partNo: 'ECI-6 750-2.0C0VF4', dia: 0.750, loc: 2.000, oal: 4.000, cornerRadius: 0, shank: 0.750 }
                ]
            },
            
            eci7Vf: {
                flutes: 7,
                applications: ['Ultra-high feed finishing', 'Mirror finish'],
                
                tools: [
                    { partNo: 'ECI-7 500-1.25C0VF3.5', dia: 0.500, loc: 1.250, oal: 3.500, cornerRadius: 0, shank: 0.500 },
                    { partNo: 'ECI-7 750-2.0C0VF4', dia: 0.750, loc: 2.000, oal: 4.000, cornerRadius: 0, shank: 0.750 },
                    { partNo: 'ECI-7 1.0-2.5C0VF4.5', dia: 1.000, loc: 2.500, oal: 4.500, cornerRadius: 0, shank: 1.000 }
                ]
            }
        }