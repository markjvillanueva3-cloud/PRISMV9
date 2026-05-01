const PRISM_LAYER_SCORING = {
    scoreLayer1: function() {
        const total = PRISM_MATERIALS_MASTER.totalMaterials;
        const taylorCount = Object.values(PRISM_TAYLOR_TOOL_LIFE.constants).reduce((s,c) => s + Object.keys(c).length, 0);
        return {
            materials: { max: 40, achieved: Math.min(40, Math.round((total / 810) * 40)) },
            kc_values: { max: 15, achieved: Math.min(15, Math.round((total / 810) * 15)) },
            cutting_speeds: { max: 15, achieved: Math.min(15, Math.round((total / 810) * 15)) },
            thermal: { max: 10, achieved: Math.min(10, Math.round((total / 810) * 10)) },
            taylor: { max: 15, achieved: Math.min(15, Math.round((taylorCount / 150) * 15)) },
            precision: { max: 5, achieved: 5 },
            get total() { return this.materials.achieved + this.kc_values.achieved + this.cutting_speeds.achieved +
                          this.thermal.achieved + this.taylor.achieved + this.precision.achieved; }
        };
    },
    scoreLayer2: function() {
        const featureCount = PRISM_FEATURE_STRATEGY_MAP.getAllFeatureTypes().length;
        const matStratCount = Object.keys(PRISM_MATERIAL_STRATEGY_INTEGRATION.modifiers).length;
        return {
            database_structure: { max: 15, achieved: 15 },
            toolpath_functions: { max: 20, achieved: 20 },
            feature_strategy_map: { max: 30, achieved: Math.min(30, Math.round((featureCount / 120) * 30)) },
            material_strategy: { max: 15, achieved: Math.min(15, Math.round((matStratCount / 6) * 15)) },
            cross_reference: { max: 15, achieved: 12 },
            placeholders: { max: 5, achieved: 4 },
            get total() { return this.database_structure.achieved + this.toolpath_functions.achieved +
                          this.feature_strategy_map.achieved + this.material_strategy.achieved +
                          this.cross_reference.achieved + this.placeholders.achieved; }
        };
    },
    getReport: function() {
        const l1 = this.scoreLayer1(), l2 = this.scoreLayer2();
        return {
            layer1: { breakdown: l1, total: l1.total, max: 100 },
            layer2: { breakdown: l2, total: l2.total, max: 100 },
            combined: Math.round((l1.total + l2.total) / 2),
            summary: {
                materials: PRISM_MATERIALS_MASTER.totalMaterials,
                features: PRISM_FEATURE_STRATEGY_MAP.getAllFeatureTypes().length,
                strategies: PRISM_FEATURE_STRATEGY_MAP.getStrategyCount(),
                taylorCombinations: Object.values(PRISM_TAYLOR_TOOL_LIFE.constants).reduce((s,c) => s + Object.keys(c).length, 0)
            }
        };
    }
}