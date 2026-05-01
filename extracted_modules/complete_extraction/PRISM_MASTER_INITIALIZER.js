const PRISM_MASTER_INITIALIZER = {
    version: '1.0.0',

    // Initialize all systems
    initializeAll: function() {
        console.log('[PRISM_MASTER_INITIALIZER] Starting system initialization...');

        const results = {
            hyperMILL: false,
            mastercam: false,
            cadLearning: false,
            timestamp: new Date().toISOString()
        };
        // Initialize hyperMILL connector
        if (typeof UNIFIED_HYPERMILL_CONNECTOR !== 'undefined') {
            UNIFIED_HYPERMILL_CONNECTOR.initialize();
            results.hyperMILL = true;
        }
        // Initialize Mastercam connector
        if (typeof UNIFIED_MASTERCAM_CONNECTOR !== 'undefined') {
            UNIFIED_MASTERCAM_CONNECTOR.initialize();
            results.mastercam = true;
        }
        // Initialize CAD learning hub
        if (typeof CONSOLIDATED_CAD_LEARNING_HUB !== 'undefined') {
            CONSOLIDATED_CAD_LEARNING_HUB.initialize();
            results.cadLearning = true;
        }
        // Initialize CAD knowledge manager
        if (typeof CAD_KNOWLEDGE_INTEGRATION_MANAGER !== 'undefined') {
            CAD_KNOWLEDGE_INTEGRATION_MANAGER.initialize();
        }
        (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_MASTER_INITIALIZER] Initialization complete:', results);
        return results;
    }
}