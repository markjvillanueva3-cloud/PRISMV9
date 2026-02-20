const PRISM_ENHANCED_MASTER_INITIALIZER = {
    version: '3.0.0',

    // Initialization order (dependencies first)
    initOrder: [
        // Layer 1: Core systems
        ['PRISM_UNIFIED_CAD_LEARNING_SYSTEM', 'Core CAD Learning'],
        ['MATERIAL_DATABASE', 'Material Database'],
        ['TOOL_DATABASE', 'Tool Database'],

        // Layer 2: Knowledge systems
        ['HYPERCAD_S_KNOWLEDGE_DATABASE', 'hyperCAD Knowledge'],
        ['SOLIDWORKS_KNOWLEDGE_DATABASE', 'SOLIDWORKS Knowledge'],
        ['HYPERMILL_WORKFLOW_DATABASE', 'hyperMILL Workflow'],
        ['CAD_KNOWLEDGE_INTEGRATION_MANAGER', 'CAD Knowledge Manager'],

        // Layer 3: Integration hubs
        ['UNIFIED_HYPERMILL_CONNECTOR', 'hyperMILL Connector'],
        ['UNIFIED_MASTERCAM_CONNECTOR', 'Mastercam Connector'],
        ['CONSOLIDATED_CAD_LEARNING_HUB', 'CAD Learning Hub'],

        // Layer 4: Enhanced systems
        ['UNIFIED_STRATEGY_HUB', 'Strategy Hub'],
        ['ENHANCED_FEATURE_RECOGNITION_BRIDGE', 'Feature Recognition Bridge'],
        ['UNIFIED_POST_PROCESSOR_HUB', 'Post Processor Hub'],

        // Layer 5: Master orchestrators
        ['PRISM_MASTER_INITIALIZER', 'Master Initializer']
    ],

    // Results
    results: {},

    // Initialize all systems in order
    initializeAll: function() {
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║  PRISM MANUFACTURING INTELLIGENCE - SYSTEM STARTUP       ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log('');

        let successCount = 0;
        let totalCount = this.initOrder.length;

        for (const [systemName, displayName] of this.initOrder) {
            try {
                const sys = eval(systemName);
                if (typeof sys !== 'undefined') {
                    if (typeof sys.initialize === 'function') {
                        sys.initialize();
                    }
                    this.results[systemName] = true;
                    successCount++;
                    console.log(`  ✓ ${displayName}`);
                } else {
                    this.results[systemName] = false;
                }
            } catch (e) {
                this.results[systemName] = false;
            }
        }
        console.log('');
        (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log(`  Systems initialized: ${successCount}/${totalCount}`);
        console.log('  PRISM v8.87.001 Ready');
        console.log('');

        return this.results;
    },
    // Get initialization status
    getStatus: function() {
        return {
            initialized: Object.values(this.results).filter(v => v).length,
            total: this.initOrder.length,
            details: this.results
        };
    }
}