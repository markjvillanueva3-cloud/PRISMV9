const PRISM_PRODUCT_MODULES = {
    version: '1.0.0',
    
    modules: {
        // Product 1: AI Speed & Feed Calculator
        calculator: {
            PRISM_CALCULATOR_LEARNING_ENGINE: typeof PRISM_CALCULATOR_LEARNING_ENGINE !== 'undefined',
            PRISM_CALCULATOR_OPTIMIZER: typeof PRISM_CALCULATOR_OPTIMIZER !== 'undefined',
            PRISM_CALCULATOR_RECOMMENDATION_ENGINE: typeof PRISM_CALCULATOR_RECOMMENDATION_ENGINE !== 'undefined',
            PRISM_CALCULATOR_CHATTER_ENGINE: typeof PRISM_CALCULATOR_CHATTER_ENGINE !== 'undefined'
        },
        // Product 2: Post Processor Generator
        post: {
            PRISM_POST_OPTIMIZER: typeof PRISM_POST_OPTIMIZER !== 'undefined',
            PRISM_POST_ANALYSIS_AI: typeof PRISM_POST_ANALYSIS_AI !== 'undefined'
        },
        // Product 3: Business/Shop/ERP
        business: {
            PRISM_SHOP_LEARNING_ENGINE: typeof PRISM_SHOP_LEARNING_ENGINE !== 'undefined',
            PRISM_SHOP_OPTIMIZER: typeof PRISM_SHOP_OPTIMIZER !== 'undefined',
            PRISM_QUOTING_LEARNING: typeof PRISM_QUOTING_LEARNING !== 'undefined',
            PRISM_CUSTOMER_MANAGER: typeof PRISM_CUSTOMER_MANAGER !== 'undefined',
            PRISM_ORDER_MANAGER: typeof PRISM_ORDER_MANAGER !== 'undefined',
            PRISM_QUALITY_MANAGER: typeof PRISM_QUALITY_MANAGER !== 'undefined',
            PRISM_REPORTING_ENGINE: typeof PRISM_REPORTING_ENGINE !== 'undefined'
        }
    },
    
    runAllTests: function() {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('PRISM PRODUCT MODULES - COMPREHENSIVE SELF-TEST');
        console.log('═══════════════════════════════════════════════════════════════');
        
        const allResults = { totalPassed: 0, totalFailed: 0, modules: {} };
        
        const testModules = [
            { name: 'CALCULATOR_LEARNING', obj: PRISM_CALCULATOR_LEARNING_ENGINE },
            { name: 'CALCULATOR_OPTIMIZER', obj: PRISM_CALCULATOR_OPTIMIZER },
            { name: 'CALCULATOR_RECOMMENDATION', obj: PRISM_CALCULATOR_RECOMMENDATION_ENGINE },
            { name: 'CALCULATOR_CHATTER', obj: PRISM_CALCULATOR_CHATTER_ENGINE },
            { name: 'POST_OPTIMIZER', obj: PRISM_POST_OPTIMIZER },
            { name: 'POST_ANALYSIS_AI', obj: PRISM_POST_ANALYSIS_AI },
            { name: 'SHOP_LEARNING', obj: PRISM_SHOP_LEARNING_ENGINE },
            { name: 'SHOP_OPTIMIZER', obj: PRISM_SHOP_OPTIMIZER },
            { name: 'QUOTING_LEARNING', obj: PRISM_QUOTING_LEARNING },
            { name: 'CUSTOMER_MANAGER', obj: PRISM_CUSTOMER_MANAGER },
            { name: 'ORDER_MANAGER', obj: PRISM_ORDER_MANAGER },
            { name: 'QUALITY_MANAGER', obj: PRISM_QUALITY_MANAGER },
            { name: 'REPORTING_ENGINE', obj: PRISM_REPORTING_ENGINE }
        ];
        
        for (const { name, obj } of testModules) {
            if (obj && typeof obj.runSelfTests === 'function') {
                try {
                    const results = obj.runSelfTests();
                    allResults.modules[name] = results;
                    allResults.totalPassed += results.passed;
                    allResults.totalFailed += results.failed;
                } catch (e) {
                    console.error(`[${name}] Test error:`, e.message);
                    allResults.modules[name] = { error: e.message };
                    allResults.totalFailed++;
                }
            }
        }
        
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`TOTAL: ${allResults.totalPassed}/${allResults.totalPassed + allResults.totalFailed} tests passed`);
        console.log('═══════════════════════════════════════════════════════════════');
        
        return allResults;
    },
    
    getStatus: function() {
        const status = {
            product1_calculator: { loaded: 0, total: 4 },
            product2_post: { loaded: 0, total: 2 },
            product3_business: { loaded: 0, total: 7 }
        };
        
        for (const [mod, loaded] of Object.entries(this.modules.calculator)) {
            if (loaded) status.product1_calculator.loaded++;
        }
        for (const [mod, loaded] of Object.entries(this.modules.post)) {
            if (loaded) status.product2_post.loaded++;
        }
        for (const [mod, loaded] of Object.entries(this.modules.business)) {
            if (loaded) status.product3_business.loaded++;
        }
        
        return status;
    }
}