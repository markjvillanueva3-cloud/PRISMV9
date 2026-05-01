const PRISM_EVENT_BRIDGE = {
    version: '1.0.0',
    bridgedEvents: 0,

    /**
     * Bridge legacy DOM events to PRISM_EVENT_BUS
     */
    bridgeDOMEvents() {
        const eventMappings = [
            { selector: '[data-prism-material]', event: 'click', busEvent: 'ui:material:selected' },
            { selector: '[data-prism-tool]', event: 'click', busEvent: 'ui:tool:selected' },
            { selector: '[data-prism-strategy]', event: 'click', busEvent: 'ui:strategy:selected' },
            { selector: '.prism-generate-btn', event: 'click', busEvent: 'ui:generate:requested' },
            { selector: '.prism-simulate-btn', event: 'click', busEvent: 'ui:simulate:requested' },
            { selector: '#prism-file-input', event: 'change', busEvent: 'ui:file:selected' }
        ];

        for (const mapping of eventMappings) {
            document.querySelectorAll(mapping.selector).forEach(el => {
                el.addEventListener(mapping.event, (e) => {
                    PRISM_EVENT_BUS.publish(mapping.busEvent, {
                        element: e.target,
                        value: e.target.dataset || e.target.value,
                        originalEvent: e
                    }, { source: 'EVENT_BRIDGE' });
                    this.bridgedEvents++;
                });
            });
        }
        console.log(`[RETROFIT] Event bridge: ${eventMappings.length} DOM event types monitored`);
    },
    /**
     * Bridge legacy custom events to PRISM_EVENT_BUS
     */
    bridgeCustomEvents() {
        const customEvents = [
            'prism:material:changed',
            'prism:tool:changed',
            'prism:toolpath:generated',
            'prism:simulation:complete',
            'prism:gcode:ready'
        ];

        for (const eventName of customEvents) {
            window.addEventListener(eventName, (e) => {
                PRISM_EVENT_BUS.publish(eventName.replace('prism:', ''), e.detail, { source: 'LEGACY_EVENT' });
                this.bridgedEvents++;
            });
        }
        console.log(`[RETROFIT] Event bridge: ${customEvents.length} custom events bridged`);
    },
    /**
     * Create reverse bridge: EVENT_BUS events trigger legacy handlers
     */
    createReverseBridge() {
        // When new architecture emits events, also dispatch legacy custom events for backward compatibility
        const reverseMap = {
            'materials:lookup:complete': 'prism:material:changed',
            'toolpath:generate:complete': 'prism:toolpath:generated',
            'post:gcode:complete': 'prism:gcode:ready'
        };
        for (const [busEvent, legacyEvent] of Object.entries(reverseMap)) {
            PRISM_EVENT_BUS.subscribe(busEvent, (data) => {
                window.dispatchEvent(new CustomEvent(legacyEvent, { detail: data }));
            });
        }
        console.log(`[RETROFIT] Reverse bridge: ${Object.keys(reverseMap).length} events mapped`);
    },
    init() {
        this.bridgeDOMEvents();
        this.bridgeCustomEvents();
        this.createReverseBridge();
    }
}