const PRISM_CROSS_REFERENCE_ENGINE = {
    version: '3.0.0',

    // Get complete machining recommendation
    getRecommendation: function(material, featureType, operation) {
        // Get feature strategies
        const strategies = PRISM_FEATURE_STRATEGY_COMPLETE.getStrategies(featureType, operation);
        if (!strategies || (Array.isArray(strategies) && strategies.length === 0)) {
            return { error: 'Feature type not found' };
        }
        // Get compatible tools with Taylor data
        const compatibleTools = PRISM_TAYLOR_COMPLETE.getCompatibleTools(material);
        if (compatibleTools.length === 0) {
            return { error: 'Material not found in Taylor database' };
        }
        // Get recommended tools for feature
        const recommendedTools = PRISM_FEATURE_STRATEGY_COMPLETE.getRecommendedTools(featureType);

        // Get material properties
        const materialProps = PRISM_MATERIAL_GROUPS_COMPLETE.groups[material];

        return {
            material: material,
            materialProperties: materialProps,
            feature: featureType,
            operation: operation,
            strategies: strategies,
            recommendedTools: recommendedTools,
            compatibleToolCoatings: compatibleTools.slice(0, 10),  // Top 10
            suggestion: this._generateSuggestion(material, featureType, operation, compatibleTools)
        };
    },
    _generateSuggestion: function(material, feature, operation, tools) {
        // Find best tool based on Taylor C value (higher = longer life)
        const bestTool = tools.reduce((best, current) =>
            current.C > best.C ? current : best, tools[0]);

        return {
            bestToolCoating: bestTool.toolCoating,
            taylorConstant: bestTool.C,
            taylorExponent: bestTool.n,
            expectedLifeAdvantage: `${Math.round((bestTool.C / tools[tools.length-1].C) * 100)}% vs worst option`
        };
    },
    // Validate material-tool compatibility
    validateCompatibility: function(material, toolType, coating) {
        const key = `${toolType}_${coating}`;
        const taylorData = PRISM_TAYLOR_COMPLETE.constants[material]?.[key];

        if (!taylorData) {
            return {
                compatible: false,
                reason: 'No Taylor data available for this combination'
            };
        }
        return {
            compatible: true,
            taylorData: taylorData,
            recommendation: taylorData.C > 100 ? 'Good choice' : 'Consider harder coating'
        };
    }
}