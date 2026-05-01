const PRISM_SHOP_LEARNING_ENGINE = {
    version: '1.0.0',
    authority: 'PRISM_SHOP_LEARNING_ENGINE',
    
    jobOutcomes: [],
    estimateAccuracy: { setup: [], cycle: [], total: [] },
    operatorPerformance: {},
    machinePerformance: {},
    
    estimationFactors: {
        setup_time: { mean: 1.0, variance: 0.15, observations: 0 },
        cycle_time: { mean: 1.0, variance: 0.1, observations: 0 },
        scrap_rate: { mean: 0.02, variance: 0.01, observations: 0 },
        cost_factor: { mean: 1.0, variance: 0.12, observations: 0 }
    },
    
    recordJobOutcome: function(params) {
        const { jobId, partNumber, quantity, material, estimatedTime, actualTime, estimatedCost, actualCost, quality, machine, operator, notes } = params;
        const timestamp = Date.now();
        
        const metrics = this._calcMetrics(estimatedTime, actualTime, estimatedCost, actualCost, quality);
        const outcome = { id: 'job_' + timestamp + '_' + Math.random().toString(36).substr(2, 9), timestamp, jobId, partNumber, quantity, material,
            estimated: { time: estimatedTime, cost: estimatedCost }, actual: { time: actualTime, cost: actualCost },
            quality, machine, operator, notes, metrics };
        
        this.jobOutcomes.push(outcome);
        this._updateFactors(outcome);
        if (operator) this._updateOperator(operator, outcome);
        if (machine) this._updateMachine(machine, outcome);
        
        if (typeof PRISM_EVENT_BUS !== 'undefined') PRISM_EVENT_BUS.publish('shop:learning:outcome', outcome);
        return outcome;
    },
    
    adjustTimeEstimate: function(baseEst, context = {}) {
        const { operator, machine, complexity } = context;
        let setupFactor = this.estimationFactors.setup_time.mean, cycleFactor = this.estimationFactors.cycle_time.mean;
        
        if (operator && this.operatorPerformance[operator]) {
            setupFactor *= this.operatorPerformance[operator].setupFactor || 1.0;
            cycleFactor *= this.operatorPerformance[operator].cycleFactor || 1.0;
        }
        if (machine && this.machinePerformance[machine]) cycleFactor *= this.machinePerformance[machine].efficiencyFactor || 1.0;
        if (complexity === 'high') { setupFactor *= 1.2; cycleFactor *= 1.1; }
        else if (complexity === 'low') { setupFactor *= 0.9; cycleFactor *= 0.95; }
        
        const adjusted = { setup: Math.round(baseEst.setup * setupFactor * 10) / 10, cycle: Math.round(baseEst.cycle * cycleFactor * 10) / 10 };
        adjusted.total = adjusted.setup + adjusted.cycle;
        
        return { base: baseEst, adjusted, factors: { setupFactor, cycleFactor },
            confidence: { setup: { low: Math.round(adjusted.setup * 0.85 * 10) / 10, high: Math.round(adjusted.setup * 1.15 * 10) / 10 } },
            learningApplied: true };
    },
    
    predictScrapRate: function(context = {}) {
        const { operator, complexity } = context;
        let rate = this.estimationFactors.scrap_rate.mean;
        if (operator && this.operatorPerformance[operator]) rate *= this.operatorPerformance[operator].qualityFactor || 1.0;
        if (complexity === 'high') rate *= 1.5;
        if (complexity === 'low') rate *= 0.7;
        return { predicted: rate, confidence: 1 - Math.sqrt(this.estimationFactors.scrap_rate.variance) };
    },
    
    getOperatorStats: function(opId) {
        return this.operatorPerformance[opId] || { setupFactor: 1.0, cycleFactor: 1.0, qualityFactor: 1.0, jobsCompleted: 0 };
    },
    
    getMachineStats: function(machId) {
        return this.machinePerformance[machId] || { efficiencyFactor: 1.0, jobsCompleted: 0 };
    },
    
    getStatistics: function() {
        const outcomes = this.jobOutcomes;
        return { totalJobs: outcomes.length,
            avgSetupAccuracy: this._calcAvg(this.estimateAccuracy.setup),
            avgCycleAccuracy: this._calcAvg(this.estimateAccuracy.cycle),
            operatorsTracked: Object.keys(this.operatorPerformance).length,
            machinesTracked: Object.keys(this.machinePerformance).length,
            estimationConfidence: { setup: ((1 - Math.sqrt(this.estimationFactors.setup_time.variance)) * 100).toFixed(1) + '%' }
        };
    },
    
    _calcMetrics: function(estTime, actTime, estCost, actCost, quality) {
        const m = {};
        if (estTime && actTime) { m.setupAccuracy = estTime.setup ? actTime.setup / estTime.setup : null; m.cycleAccuracy = estTime.cycle ? actTime.cycle / estTime.cycle : null; }
        if (estCost && actCost) m.costAccuracy = estCost.total ? actCost.total / estCost.total : null;
        if (quality) { m.passRate = quality.passed / (quality.passed + quality.failed + (quality.scrap || 0)); m.scrapRate = (quality.scrap || 0) / (quality.passed + quality.failed + (quality.scrap || 0)); }
        return m;
    },
    
    _updateFactors: function(outcome) {
        const m = outcome.metrics;
        if (m.setupAccuracy) { this._updateFactor('setup_time', m.setupAccuracy); this.estimateAccuracy.setup.push(m.setupAccuracy); }
        if (m.cycleAccuracy) { this._updateFactor('cycle_time', m.cycleAccuracy); this.estimateAccuracy.cycle.push(m.cycleAccuracy); }
        if (m.costAccuracy) this._updateFactor('cost_factor', m.costAccuracy);
        if (m.scrapRate !== undefined) this._updateFactor('scrap_rate', m.scrapRate);
    },
    
    _updateFactor: function(factor, obs) {
        const f = this.estimationFactors[factor];
        if (!f) return;
        const n = (f.observations || 0) + 1;
        f.mean = (f.mean * (n - 1) + obs) / n;
        f.variance = f.variance * 0.99;
        f.observations = n;
    },
    
    _updateOperator: function(opId, outcome) {
        if (!this.operatorPerformance[opId]) this.operatorPerformance[opId] = { setupFactor: 1.0, cycleFactor: 1.0, qualityFactor: 1.0, jobsCompleted: 0 };
        const p = this.operatorPerformance[opId], n = p.jobsCompleted + 1, m = outcome.metrics;
        if (m.setupAccuracy) p.setupFactor = (p.setupFactor * p.jobsCompleted + m.setupAccuracy) / n;
        if (m.cycleAccuracy) p.cycleFactor = (p.cycleFactor * p.jobsCompleted + m.cycleAccuracy) / n;
        if (m.passRate !== undefined) p.qualityFactor = (p.qualityFactor * p.jobsCompleted + m.passRate / 0.98) / n;
        p.jobsCompleted = n;
    },
    
    _updateMachine: function(machId, outcome) {
        if (!this.machinePerformance[machId]) this.machinePerformance[machId] = { efficiencyFactor: 1.0, jobsCompleted: 0 };
        const p = this.machinePerformance[machId], n = p.jobsCompleted + 1, m = outcome.metrics;
        if (m.cycleAccuracy) p.efficiencyFactor = (p.efficiencyFactor * p.jobsCompleted + m.cycleAccuracy) / n;
        p.jobsCompleted = n;
    },
    
    _calcAvg: function(arr) {
        if (arr.length === 0) return 'N/A';
        return (arr.reduce((a, b) => a + b, 0) / arr.length * 100).toFixed(1) + '%';
    },
    
    runSelfTests: function() {
        console.log('[SHOP_LEARNING] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };
        
        try {
            const r = this.recordJobOutcome({ jobId: 'TEST-001', partNumber: 'PART-123', quantity: 100,
                estimatedTime: { setup: 30, cycle: 120, total: 150 }, actualTime: { setup: 28, cycle: 125, total: 153 },
                estimatedCost: { total: 900 }, actualCost: { total: 900 }, quality: { passed: 98, failed: 2, scrap: 0 }, operator: 'OP-001', machine: 'MACH-001' });
            if (r.id && r.metrics) { results.passed++; results.tests.push({ name: 'Record Job Outcome', status: 'PASS' }); }
            else throw new Error('Invalid');
        } catch (e) { results.failed++; results.tests.push({ name: 'Record Job Outcome', status: 'FAIL', error: e.message }); }
        
        try {
            const r = this.adjustTimeEstimate({ setup: 30, cycle: 120, total: 150 }, { operator: 'OP-001' });
            if (r.adjusted && r.confidence) { results.passed++; results.tests.push({ name: 'Adjust Time', status: 'PASS' }); }
            else throw new Error('Invalid');
        } catch (e) { results.failed++; results.tests.push({ name: 'Adjust Time', status: 'FAIL', error: e.message }); }
        
        console.log('[SHOP_LEARNING] Tests: ' + results.passed + '/' + (results.passed + results.failed) + ' passed');
        return results;
    }
}