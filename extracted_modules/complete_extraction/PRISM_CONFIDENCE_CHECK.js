const PRISM_CONFIDENCE_CHECK = {
    getLevel: function(confidence) {
        if (confidence >= PRISM_CONSTANTS.CONFIDENCE.VERY_HIGH) return 'very_high';
        if (confidence >= PRISM_CONSTANTS.CONFIDENCE.HIGH) return 'high';
        if (confidence >= PRISM_CONSTANTS.CONFIDENCE.MEDIUM) return 'medium';
        if (confidence >= PRISM_CONSTANTS.CONFIDENCE.LOW) return 'low';
        return 'very_low';
    },
    
    canAutoProceed: function(confidence) {
        return confidence >= PRISM_CONSTANTS.CONFIDENCE.AUTO_PROCEED_THRESHOLD;
    },
    
    shouldWarn: function(confidence) {
        return confidence < PRISM_CONSTANTS.CONFIDENCE.WARN_THRESHOLD;
    },
    
    shouldBlock: function(confidence) {
        return confidence < PRISM_CONSTANTS.CONFIDENCE.BLOCK_THRESHOLD;
    },
    
    canUpdateModel: function(confidence) {
        return confidence >= PRISM_CONSTANTS.CONFIDENCE.UPDATE_THRESHOLD;
    },
    
    canRecommend: function(confidence) {
        return confidence >= PRISM_CONSTANTS.CONFIDENCE.RECOMMEND_THRESHOLD;
    }
}