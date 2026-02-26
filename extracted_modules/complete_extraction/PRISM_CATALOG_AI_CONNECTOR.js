const PRISM_CATALOG_AI_CONNECTOR = {
    /**
     * Generate training data from catalog cutting parameters
     */
    generateCuttingTrainingData: function() {
        const trainingData = [];
        const params = PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.cuttingParameters;
        
        for (const [mfr, mfrData] of Object.entries(params)) {
            for (const [toolType, toolData] of Object.entries(mfrData)) {
                if (toolData.materials) {
                    for (const [material, matData] of Object.entries(toolData.materials)) {
                        if (matData.data) {
                            for (const point of matData.data) {
                                trainingData.push({
                                    manufacturer: mfr,
                                    toolType,
                                    material,
                                    diameter: point.dia,
                                    rpm: point.rpm,
                                    iprMin: point.iprMin,
                                    iprMax: point.iprMax,
                                    sfmRange: matData.sfmRange
                                });
                            }
                        }
                    }
                }
            }
        }
        
        return trainingData;
    },
    
    /**
     * Generate tool holder dimensional data for AI
     */
    generateHolderTrainingData: function() {
        const trainingData = [];
        const holders = PRISM_MANUFACTURER_CATALOG_CONSOLIDATED.toolHolders;
        
        for (const [mfr, mfrData] of Object.entries(holders)) {
            for (const [holderType, typeData] of Object.entries(mfrData)) {
                if (typeData.models) {
                    for (const model of typeData.models) {
                        trainingData.push({
                            manufacturer: mfr,
                            holderType,
                            taper: model.taper,
                            clampingDia: model.clampingDiaMm || model.bore,
                            bodyDia: model.d2 || model.bodyDia,
                            gageLength: model.l1 || model.oal,
                            partNo: model.partNo || model.edp
                        });
                    }
                }
            }
        }
        
        return trainingData;
    },
    
    /**
     * Connect to AI learning pipeline
     */
    connectToAI: function() {
        if (typeof PRISM_AI_TRAINING_DATA !== 'undefined') {
            // Register cutting data source
            PRISM_AI_TRAINING_DATA.registerSource('manufacturerCatalog', {
                cutting: this.generateCuttingTrainingData,
                holders: this.generateHolderTrainingData
            });
            
            console.log('[CATALOG_AI] Connected to AI training pipeline');
        }
        
        if (typeof PRISM_AI_100_KB_CONNECTOR !== 'undefined') {
            PRISM_AI_100_KB_CONNECTOR.registerKnowledgeBase('PRISM_MANUFACTURER_CATALOG_CONSOLIDATED', {
                type: 'catalog',
                categories: ['toolHolders', 'cuttingParameters', 'insertGrades', 'spindleInterfaces', 'isoMaterials']
            });
            
            console.log('[CATALOG_AI] Registered with AI-100 Knowledge Connector');
        }
    }
}