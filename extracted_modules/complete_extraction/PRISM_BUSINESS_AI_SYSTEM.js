const PRISM_BUSINESS_AI_SYSTEM = {

    version: '1.0.0',
    name: 'PRISM Business Intelligence System',
    initialized: false,

    // Component references
    costing: PRISM_JOB_COSTING_ENGINE,
    quoting: PRISM_QUOTING_ENGINE,
    jobs: PRISM_JOB_TRACKING_ENGINE,
    analytics: PRISM_SHOP_ANALYTICS_ENGINE,
    financial: PRISM_FINANCIAL_ENGINE,
    scheduling: PRISM_SCHEDULING_ENGINE,
    inventory: PRISM_INVENTORY_ENGINE,
    models: PRISM_BUSINESS_AI_MODELS,

    /**
     * Initialize business AI system
     */
    initialize: function() {
        console.log('[PRISM Business AI] Initializing...');

        // Initialize AI models if neural network engine available
        if (typeof PRISM_NN_LAYERS !== 'undefined') {
            PRISM_BUSINESS_AI_MODELS.createJobDelayModel();
            PRISM_BUSINESS_AI_MODELS.createCostVarianceModel();
        }
        this.initialized = true;
        console.log('[PRISM Business AI] Ready');

        return { success: true, components: Object.keys(this).filter(k => typeof this[k] === 'object') };
    },
    /**
     * Quick cost estimate
     */
    quickCost: function(params) {
        return PRISM_JOB_COSTING_ENGINE.calculateJobCost(params);
    },
    /**
     * Generate quote
     */
    quote: function(jobSpec, options) {
        return PRISM_QUOTING_ENGINE.generateQuote(jobSpec, options);
    },
    /**
     * Calculate KPIs
     */
    kpis: function(shopData) {
        return PRISM_SHOP_ANALYTICS_ENGINE.generateDashboard(shopData);
    },
    /**
     * Analyze investment
     */
    analyzeInvestment: function(params) {
        return PRISM_FINANCIAL_ENGINE.analyzeMachineInvestment(params);
    },
    /**
     * Optimize schedule
     */
    schedule: function(jobs, method = 'EDD') {
        return PRISM_SCHEDULING_ENGINE.priorityDispatch(jobs, method);
    },
    /**
     * Calculate inventory parameters
     */
    inventoryParams: function(params) {
        return {
            eoq: PRISM_INVENTORY_ENGINE.calculateEOQ(params),
            safetyStock: PRISM_INVENTORY_ENGINE.calculateSafetyStock(params)
        };
    },
    /**
     * Predict job delay
     */
    predictDelay: function(jobParams) {
        return PRISM_BUSINESS_AI_MODELS.predictDelay(jobParams);
    },
    /**
     * Run self-tests
     */
    runTests: function() {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('PRISM BUSINESS AI SYSTEM v1.0 - SELF-TESTS');
        console.log('═══════════════════════════════════════════════════════════════');

        let passed = 0, failed = 0;

        // Test 1: Job Costing
        try {
            const cost = PRISM_JOB_COSTING_ENGINE.calculateJobCost({
                quantity: 10,
                material: { type: 'aluminum_6061', length: 100, width: 50, height: 25 },
                operations: [{ type: 'roughing' }, { type: 'finishing' }],
                machineType: 'cnc_mill_3axis'
            });
            if (cost.total > 0 && cost.perPart > 0) {
                console.log('  ✅ Job Costing Engine: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Job Costing Engine: FAIL');
            failed++;
        }
        // Test 2: Quoting
        try {
            const quote = PRISM_QUOTING_ENGINE.generateQuote({
                quantity: 25,
                complexity: 'medium',
                material: { type: 'steel_4140' },
                operations: [{ type: 'roughing' }]
            });
            if (quote.quoteNumber && quote.pricing.totalPrice > 0) {
                console.log('  ✅ Quoting Engine: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Quoting Engine: FAIL');
            failed++;
        }
        // Test 3: OEE Calculation
        try {
            const oee = PRISM_SHOP_ANALYTICS_ENGINE.calculateOEE({
                plannedTime: 480,
                downtime: 60,
                idealCycleTime: 2,
                totalParts: 180,
                goodParts: 175
            });
            if (oee.oee && parseFloat(oee.oee) > 0) {
                console.log('  ✅ OEE Calculation: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ OEE Calculation: FAIL');
            failed++;
        }
        // Test 4: NPV Calculation
        try {
            const npv = PRISM_FINANCIAL_ENGINE.calculateNPV([-100000, 30000, 35000, 40000, 45000], 0.10);
            if (npv.npv && !isNaN(npv.npv)) {
                console.log('  ✅ NPV Calculation: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ NPV Calculation: FAIL');
            failed++;
        }
        // Test 5: Johnson's Algorithm
        try {
            const schedule = PRISM_SCHEDULING_ENGINE.johnsonsAlgorithm([
                { id: 'J1', machineA: 3, machineB: 4 },
                { id: 'J2', machineA: 2, machineB: 5 },
                { id: 'J3', machineA: 4, machineB: 2 }
            ]);
            if (schedule.sequence && schedule.makespan.total > 0) {
                console.log('  ✅ Scheduling Engine: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Scheduling Engine: FAIL');
            failed++;
        }
        // Test 6: EOQ Calculation
        try {
            const eoq = PRISM_INVENTORY_ENGINE.calculateEOQ({
                annualDemand: 1000,
                orderCost: 50,
                holdingCostPerUnit: 5
            });
            if (eoq.eoq && eoq.eoq > 0) {
                console.log('  ✅ Inventory Engine: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Inventory Engine: FAIL');
            failed++;
        }
        // Test 7: Job Tracking
        try {
            const quote = PRISM_QUOTING_ENGINE.generateQuote({ quantity: 5, operations: [] });
            const job = PRISM_JOB_TRACKING_ENGINE.createJob(quote, {});
            if (job.id && job.status === PRISM_JOB_TRACKING_ENGINE.STATUS.ORDERED) {
                console.log('  ✅ Job Tracking Engine: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ Job Tracking Engine: FAIL');
            failed++;
        }
        // Test 8: ABC Classification
        try {
            const abc = PRISM_INVENTORY_ENGINE.classifyABC([
                { id: 'T1', annualUsage: 100, unitCost: 50 },
                { id: 'T2', annualUsage: 500, unitCost: 10 },
                { id: 'T3', annualUsage: 50, unitCost: 200 }
            ]);
            if (abc.items && abc.summary.A) {
                console.log('  ✅ ABC Classification: PASS');
                passed++;
            } else throw new Error();
        } catch (e) {
            console.log('  ❌ ABC Classification: FAIL');
            failed++;
        }
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`RESULTS: ${passed} passed, ${failed} failed`);
        console.log('═══════════════════════════════════════════════════════════════\n');

        return { passed, failed, total: passed + failed };
    }
}