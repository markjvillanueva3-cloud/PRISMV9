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
}