const PRISM_LAYER5_EVENTS = {
    initialize: function() {
        if (typeof PRISM_EVENT_BUS === 'undefined') {
            console.warn('[PRISM-L5] EVENT_BUS not found, skipping event setup');
            return;
        }
        // Subscribe to machine configuration changes
        PRISM_EVENT_BUS.subscribe('machine:config:changed', (data) => {
            console.log('[PRISM-L5] Machine config changed:', data.configName);

            // Validate new configuration
            const config = PRISM_DH_KINEMATICS.machineConfigs[data.configName];
            if (config) {
                PRISM_EVENT_BUS.publish('kinematics:config:validated', {
                    configName: data.configName,
                    config: config,
                    singularities: config.singularities
                });
            }
        });

        // Subscribe to position updates for singularity monitoring
        PRISM_EVENT_BUS.subscribe('position:updated', (data) => {
            if (data.config && (data.a !== undefined || data.b !== undefined)) {
                const singCheck = PRISM_JACOBIAN_ENGINE.checkConfigSingularities(
                    data.config,
                    { a: data.a, b: data.b, c: data.c }
                );

                if (singCheck.hasSingularity) {
                    PRISM_EVENT_BUS.publish('kinematics:singularity:warning', singCheck);
                }
            }
        });

        (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM-L5] Event bus integration complete');
    }
}