const PRISM_PHASE1_GATEWAY_ROUTES = {
    routes: {
        // ═══════════════════════════════════════════════════════════════
        // OPTIMIZATION ALGORITHMS (MIT 15.099, MIT 18.433, CMU 24-785)
        // ═══════════════════════════════════════════════════════════════
        'phase1.pso.speed_feed': 'PRISM_PHASE1_OPTIMIZERS.psoSpeedFeed',
        'phase1.pso.multi_objective': 'PRISM_PHASE1_OPTIMIZERS.psoMultiObjective',
        'phase1.aco.hole_sequence': 'PRISM_PHASE1_OPTIMIZERS.acoHoleSequence',
        'phase1.aco.routing': 'PRISM_PHASE1_OPTIMIZERS.acoRouting',
        'phase1.genetic.toolpath': 'PRISM_PHASE1_OPTIMIZERS.geneticToolpath',
        'phase1.genetic.parameters': 'PRISM_PHASE1_OPTIMIZERS.geneticParameters',
        'phase1.newton.optimize': 'PRISM_PHASE1_OPTIMIZERS.newtonOptimize',
        'phase1.bfgs.optimize': 'PRISM_PHASE1_OPTIMIZERS.bfgsOptimize',
        
        // ═══════════════════════════════════════════════════════════════
        // MACHINE LEARNING (MIT 6.036, Stanford CS229)
        // ═══════════════════════════════════════════════════════════════
        'phase1.ml.linear_predict': 'PRISM_PHASE1_ML.linearPredict',
        'phase1.ml.ridge_predict': 'PRISM_PHASE1_ML.ridgePredict',
        'phase1.ml.forest_predict': 'PRISM_PHASE1_ML.randomForestPredict',
        'phase1.ml.forest_tool_life': 'PRISM_PHASE1_ML.forestToolLifePredict',
        'phase1.ml.kmeans_cluster': 'PRISM_PHASE1_ML.kmeansCluster',
        
        // ═══════════════════════════════════════════════════════════════
        // SIGNAL PROCESSING (MIT 18.086, Berkeley EE123)
        // ═══════════════════════════════════════════════════════════════
        'phase1.signal.fft_analyze': 'PRISM_PHASE1_SIGNAL.fftAnalyze',
        'phase1.signal.fft_chatter': 'PRISM_PHASE1_SIGNAL.fftChatterDetect',
        'phase1.signal.butterworth': 'PRISM_PHASE1_SIGNAL.butterworthFilter',
        'phase1.signal.stability_lobes': 'PRISM_PHASE1_SIGNAL.stabilityLobes',
        'phase1.signal.spectral_density': 'PRISM_PHASE1_SIGNAL.spectralDensity',
        
        // ═══════════════════════════════════════════════════════════════
        // MANUFACTURING PHYSICS (MIT 2.008, MIT 2.830)
        // ═══════════════════════════════════════════════════════════════
        'phase1.mfg.taylor_tool_life': 'PRISM_PHASE1_MANUFACTURING.taylorToolLife',
        'phase1.mfg.extended_taylor': 'PRISM_PHASE1_MANUFACTURING.extendedTaylor',
        'phase1.mfg.merchant_force': 'PRISM_PHASE1_MANUFACTURING.merchantForce',
        'phase1.mfg.kienzle_force': 'PRISM_PHASE1_MANUFACTURING.kienzleForce',
        'phase1.mfg.mrr': 'PRISM_PHASE1_MANUFACTURING.materialRemovalRate',
        'phase1.mfg.surface_finish': 'PRISM_PHASE1_MANUFACTURING.surfaceFinish',
        'phase1.mfg.cutting_temperature': 'PRISM_PHASE1_MANUFACTURING.cuttingTemperature',
        
        // ═══════════════════════════════════════════════════════════════
        // INTEGRATED AI CALCULATOR
        // ═══════════════════════════════════════════════════════════════
        'phase1.calc.speed_feed': 'PRISM_PHASE1_SPEED_FEED_CALCULATOR.calculate',
        'phase1.calc.ai_optimize': 'PRISM_PHASE1_SPEED_FEED_CALCULATOR.aiOptimize',
        'phase1.calc.full_analysis': 'PRISM_PHASE1_SPEED_FEED_CALCULATOR.fullAnalysis'
    },
    
    registerAll: function() {
        let registered = 0;
        let failed = 0;
        
        if (typeof PRISM_GATEWAY === 'undefined') {
            console.error('[Phase 1] PRISM_GATEWAY not found');
            return { registered: 0, failed: Object.keys(this.routes).length };
        }
        
        for (const [route, target] of Object.entries(this.routes)) {
            try {
                PRISM_GATEWAY.register(route, target);
                registered++;
            } catch (e) {
                console.warn(`[Phase 1] Failed to register route: ${route}`);
                failed++;
            }
        }
        
        console.log(`[Phase 1 Routes] Registered: ${registered}, Failed: ${failed}`);
        return { registered, failed };
    }
}