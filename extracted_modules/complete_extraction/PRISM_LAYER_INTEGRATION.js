const PRISM_LAYER_INTEGRATION = {
    integrate: function(PM) {
        if (!PM) { console.log('[LAYER] Standalone mode'); return; }
        if (!PM.databases) PM.databases = {};
        PM.databases.completeMaterials = PRISM_MATERIALS_MASTER;
        PM.databases.featureStrategyMap = PRISM_FEATURE_STRATEGY_MAP;
        PM.databases.taylorToolLife = PRISM_TAYLOR_TOOL_LIFE;
        PM.databases.materialStrategyIntegration = PRISM_MATERIAL_STRATEGY_INTEGRATION;
        console.log('[LAYER] Integrated with PRISM_MASTER');
    }
}