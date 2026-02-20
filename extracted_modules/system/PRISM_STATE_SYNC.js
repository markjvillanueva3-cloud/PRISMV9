const PRISM_STATE_SYNC = {
    version: '1.0.0',

    /**
     * Initialize state with current application values
     */
    initializeState() {
        // Sync material selection state
        if (typeof window.selectedMaterial !== 'undefined') {
            PRISM_STATE_STORE.setState('machining.material', window.selectedMaterial);
        }
        // Sync tool selection state
        if (typeof window.selectedTool !== 'undefined') {
            PRISM_STATE_STORE.setState('machining.tool', window.selectedTool);
        }
        // Sync UI state
        PRISM_STATE_STORE.setState('ui.activeView', 'main');
        PRISM_STATE_STORE.setState('ui.sidebarOpen', true);

        // Create watchers for window properties
        this.watchWindowProperty('selectedMaterial', 'machining.material');
        this.watchWindowProperty('selectedTool', 'machining.tool');
        this.watchWindowProperty('currentOperation', 'machining.operation');

        (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[RETROFIT] State initialized and synchronized');
    },
    /**
     * Watch a window property and sync to state store
     */
    watchWindowProperty(propName, statePath) {
        let currentValue = window[propName];

        Object.defineProperty(window, propName, {
            get: () => currentValue,
            set: (newValue) => {
                currentValue = newValue;
                PRISM_STATE_STORE.setState(statePath, newValue);
            },
            configurable: true
        });
    },
    /**
     * Subscribe to state changes and sync back to legacy patterns
     */
    createStateListeners() {
        PRISM_STATE_STORE.subscribe('machining.material', (material, prev) => {
            // Update any legacy displays
            const displays = document.querySelectorAll('[data-material-display]');
            displays.forEach(el => {
                el.textContent = material?.name || material || 'None selected';
            });
        });

        PRISM_STATE_STORE.subscribe('machining.tool', (tool, prev) => {
            const displays = document.querySelectorAll('[data-tool-display]');
            displays.forEach(el => {
                el.textContent = tool?.name || tool || 'None selected';
            });
        });

        console.log('[RETROFIT] State listeners created');
    },
    init() {
        this.initializeState();
        this.createStateListeners();
    }
}