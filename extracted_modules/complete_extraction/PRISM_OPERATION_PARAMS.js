const PRISM_OPERATION_PARAMS = {
    get: function(operation) {
        const op = (operation || 'roughing').toLowerCase();
        switch(op) {
            case 'roughing':
            case 'rough':
                return {
                    docPercent: PRISM_CONSTANTS.OPERATIONS.ROUGHING_DOC_PERCENT,
                    wocPercent: PRISM_CONSTANTS.OPERATIONS.ROUGHING_WOC_PERCENT,
                    speedFactor: PRISM_CONSTANTS.OPERATIONS.ROUGHING_SPEED_FACTOR,
                    feedFactor: PRISM_CONSTANTS.OPERATIONS.ROUGHING_FEED_FACTOR
                };
            case 'semifinish':
            case 'semi_finish':
            case 'semi-finish':
                return {
                    docPercent: PRISM_CONSTANTS.OPERATIONS.SEMIFINISH_DOC_PERCENT,
                    wocPercent: PRISM_CONSTANTS.OPERATIONS.SEMIFINISH_WOC_PERCENT,
                    speedFactor: PRISM_CONSTANTS.OPERATIONS.SEMIFINISH_SPEED_FACTOR,
                    feedFactor: 0.9
                };
            case 'finishing':
            case 'finish':
                return {
                    docMax: PRISM_CONSTANTS.OPERATIONS.FINISHING_DOC_MAX,
                    wocMax: PRISM_CONSTANTS.OPERATIONS.FINISHING_WOC_MAX,
                    speedFactor: PRISM_CONSTANTS.OPERATIONS.FINISHING_SPEED_FACTOR,
                    feedFactor: PRISM_CONSTANTS.OPERATIONS.FINISHING_FEED_FACTOR
                };
            case 'hsm':
            case 'high_speed':
            case 'adaptive':
                return {
                    radialEngagementMax: PRISM_CONSTANTS.OPERATIONS.HSM_RADIAL_ENGAGEMENT_MAX,
                    chiploadFactor: PRISM_CONSTANTS.OPERATIONS.HSM_CHIPLOAD_FACTOR,
                    minRpm: PRISM_CONSTANTS.OPERATIONS.HSM_MIN_RPM
                };
            case 'trochoidal':
                return {
                    stepoverPercent: PRISM_CONSTANTS.OPERATIONS.TROCHOIDAL_STEPOVER_PERCENT,
                    speedFactor: PRISM_CONSTANTS.OPERATIONS.TROCHOIDAL_SPEED_FACTOR,
                    docFactor: PRISM_CONSTANTS.OPERATIONS.TROCHOIDAL_DOC_FACTOR
                };
            case 'plunge':
                return {
                    feedPercent: PRISM_CONSTANTS.OPERATIONS.PLUNGE_FEED_PERCENT,
                    retractHeight: PRISM_CONSTANTS.OPERATIONS.PLUNGE_RETRACT_HEIGHT
                };
            default:
                return {
                    docPercent: 50,
                    wocPercent: 50,
                    speedFactor: 1.0,
                    feedFactor: 1.0
                };
        }
    }
}